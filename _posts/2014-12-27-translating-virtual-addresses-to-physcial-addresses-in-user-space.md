---
layout: post
title: Translating Virtual Addresses to Physical Addresses in User Space
date: 2014-12-27
---

As I was working my way through the chapter on memory management in *Understanding the Linux Kernel* I thought it would be fun to try to write a program that translates a virtual memory address to a physical address. Moreover, I wanted to do it user space. And to go one step further, why not try to get the physical address of a buffer, go to that location in memory, modify it, and then see the changes by using the virtual address.

**WARNING: I am far from a kernel expert. Everything here is me just documenting my experimentation with the kernel. It is very likely that mistakes and incorrect information are present. Please email me with any corrections.**

There are a few problems with trying to accomplish this task in user space:

* The idea behind virtual memory is to provide an address space of contiguous memory. The memory for a process is most likely stored in non-contiguous blocks.
* There's no guarentee that a page is even in the physical memory of the system. It could be in the swap or in a cache somewhere. There could be no physical address to get!
* For obvious security reasons, a process does not have access to the raw memory of the system, even if the process's UID is 0.

There's two approaches we can take to get the physical address:

1. Add a syscall to the kernel that, given a virtual address, will return the physical address. However, modifying the kernel breaks the rule of doing everything from user space so we have to rule this out.
1. Use the pagemap file for a process (added in kernel 2.6.25) to get the frame a page is mapped to and then use that to seek into <code>/dev/mem</code> and modify the buffer there.

Using this approach, it's entirely possible to translate a virtual address to a physical address in user space. However, verfying our translation is correct requires reading <code>/dev/mem</code>. This does require one small modifcation to the kernel (changing a config option), but more on that later.

<!--more-->

Full code listing is at the bottom.

### Creating our buffer
<hr />

Creating a buffer to find the address of takes one additional step beyond the usual <code>malloc()</code> call. The kernel does not gaurentee that an address in the virtual address space actually maps to a physical address in memory. It may be stored in the swap space, in a cache somewhere, or somewhere else entirely. To get around this possibility, we can use <code>mlock()</code> to force a page to be kept in the physcial memory of the system. Fortunately, this is very straightward; just pass <code>mlock()</code> the pointer to the buffer and the size of the buffer and it will handle the rest. Here's what that looks like:

{% highlight c linenos=table %}
void* create_buffer(void) {
   size_t buf_size = strlen(ORIG_BUFFER) + 1;

   // Allocate some memory to manipulate
   void *buffer = malloc(buf_size);
   if(buffer == NULL) {
      fprintf(stderr, "Failed to allocate memory for buffer\n");
      exit(1);
   }

   // Lock the page in memory
   // Do this before writing data to the buffer so that any copy-on-write
   // mechanisms while give us our own page locked in memory
   if(mlock(buffer, buf_size) == -1) {
      fprintf(stderr, "Failed to lock page in memory: %s\n", strerror(errno));
      exit(1);
   }

   // Add some data to the memory
   strncpy(buffer, ORIG_BUFFER, strlen(ORIG_BUFFER));

   return buffer;
}
{% endhighlight %}

Notice that I'm copying data into the buffer after locking it. This is because that if the page that the buffer is on is shared with the parent process, the OS may employ a copy-on-write paging mechanism. To force the OS to give us our own page, we write data to the buffer after it has been locked.

### <code>/proc/[pid]/pagemap</code>
<hr />

The pagemap provides user space access to how the kernel is managing the pages for a process. It is a binary file so extracting information from it is a little bit tricky.

[As you can see from the documentation](https://www.kernel.org/doc/Documentation/vm/pagemap.txt)<sup>1</sup>, there are 64 bits worth of information for every page. We are interested in bits 0-54, the page frame number.

How do we get the page frame number for a given page from the pagemap? First we need to determine the offset into the pagemap to seek to. This can be done as such:

{% highlight c linenos=table %}
#define PAGEMAP_LENGTH 8
offset = (unsigned long)addr / getpagesize() * PAGEMAP_LENGTH
{% endhighlight %}

Given an address, we divide it by the page size and then multiply by 8. Why 8? There are 64 bits, or 8 bytes, of info for each page.

Then we seek to that position in the file and read the first 7 bytes. Why 7? We're interested in bites 0-54. That's a total of 55 bits. So we read the first 7 bytes (56 bits) and clear bit 55. Bit 55 is the soft-dirty flag which we don't care about.

{% highlight c linenos=table %}
unsigned long get_page_frame_number_of_address(void *addr) {
   // Open the pagemap file for the current process
   FILE *pagemap = fopen("/proc/self/pagemap", "rb");

   // Seek to the page that the buffer is on
   unsigned long offset = (unsigned long)addr / getpagesize() * PAGEMAP_LENGTH;
   if(fseek(pagemap, (unsigned long)offset, SEEK_SET) != 0) {
      fprintf(stderr, "Failed to seek pagemap to proper location\n");
      exit(1);
   }

   // The page frame number is in bits 0-54 so read the first 7 bytes and clear the 55th bit
   unsigned long page_frame_number = 0;
   fread(&page_frame_number, 1, PAGEMAP_LENGTH-1, pagemap);

   page_frame_number &= 0x7FFFFFFFFFFFFF;

   fclose(pagemap);

   return page_frame_number;
}
{% endhighlight %}

Now that we have the page frame number, we can easily calculate the physical address of our buffer as such<sup>2</sup>:

{% highlight text %}
physcial_addr = (page_frame_number << PAGE_SHIFT) + distance_from_page_boundary_of_buffer
{% endhighlight %}

where <code>PAGE_SHIFT</code> is a kernel #define. For my x86_64 system, it was defined as 12, but this may vary for you. You should confirm this value by looking in the kernel source yourself.

### Writing to <code>/dev/mem</code>
<hr />

Now that we've determined the physical address, we can continue with finding that location in memory and modifying it.

Linux provides direct access to the memory of a system through the <code>/dev/mem</code> block device. However, due to obvious security implications, no one can read from, let alone write to, this file, even as root. This is due to the <code>CONFIG_STRICT_DEVMEM</code> kernel config option. Being a config option, it must be set at compile-time so to change it, you'll have to recompile your kernel.

Kernel compiling and installation will vary based on distro so I won't go into the topic here. If you're already familiar with the process, all you need to do is set <code>CONFIG_STRICT_DEVMEM=n</code> in your config, recompile, install, and reboot. Hopefully all in a VM since this obviously opens up a huge security hole.

Assuming your kernel has <code>CONFIG_STRICT_DEVMEM</code> disabled, we can proceed. First up is knowing where to look in <code>/dev/mem</code> for the string we put in our buffer. It's pretty simple actually. The offset we need to seek to is equal to the physical address we calculated above.

{% highlight c linenos=table %}
// Find the difference from the buffer to the page boundary
unsigned int distance_from_page_boundary = (unsigned long)buffer % getpagesize();

// Determine how far to seek into memory to find the buffer
uint64_t offset = (page_frame_number << PAGE_SHIFT) + distance_from_page_boundary;
{% endhighlight %}

Now let's open <code>/dev/mem</code> and seek to the offset we calculated:

{% highlight c linenos=table %}
int open_memory(void) {
   // Open the memory (must be root for this)
   int fd = open("/dev/mem", O_RDWR);

   if(fd == -1) {
      fprintf(stderr, "Error opening /dev/mem: %s\n", strerror(errno));
      exit(1);
   }

   return fd;
}

void seek_memory(int fd, unsigned long offset) {
   unsigned pos = lseek(fd, offset, SEEK_SET);

   if(pos == -1) {
      fprintf(stderr, "Failed to seek /dev/mem: %s\n", strerror(errno));
      exit(1);
   }
}

int mem_fd = open_memory();
seek_memory(mem_fd, offset);
{% endhighlight %}

Almost done! We have a file descriptor seeked to the right position inside <code>/dev/mem</code> so now we just need to write to it<sup>3</sup>.

{% highlight c linenos=table %}
if(write(mem_fd, NEW_BUFFER, strlen(NEW_BUFFER)) == -1) {
   printf("Write failed: %s\n", strerror(errno));
}
{% endhighlight %}

Note that <code>NEW_BUFFER</code> must be the same length or shorter than <code>ORIG_BUFFER</code>. In my case, I have them defined as the same length so I don't bother to copy the NUL-terminator.

Finally, we can read from the original buffer and if everything worked, we'll see that we have changed the contents of the buffer by writing to <code>/dev/mem</code>.

{% highlight c linenos=table %}
printf("Buffer: %s\n", buffer);
{% endhighlight %}

### Conclusion & Full Code Listing
<hr />

It's worth noting that this was just an experiment. It's is not intended to be behavior that should be relied upon. In fact, in my testing, I experiened the kernel shuffling around physical addresses between the time at which I calculated the offset to seek to and writing data to that offset. The bottom line is: stick to virtual memory; it works really well. And if you need to modify physical memory from user space, find another way.

Full code listing:

{% highlight c linenos=table %}
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <errno.h>
#include <fcntl.h>
#include <stdint.h>

// ORIG_BUFFER will be placed in memory and will then be changed to NEW_BUFFER
// They must be the same length
#define ORIG_BUFFER "Hello, World!"
#define NEW_BUFFER "Hello, Linux!"

// The page frame shifted left by PAGE_SHIFT will give us the physcial address of the frame
// Note that this number is architecture dependent. For me on x86_64 with 4096 page sizes,
// it is defined as 12. If you're running something different, check the kernel source
// for what it is defined as.
#define PAGE_SHIFT 12
#define PAGEMAP_LENGTH 8

void* create_buffer(void);
unsigned long get_page_frame_number_of_address(void *addr);
int open_memory(void);
void seek_memory(int fd, unsigned long offset);

int main(void) {
   // Create a buffer with some data in it
   void *buffer = create_buffer();

   // Get the page frame the buffer is on
   unsigned int page_frame_number = get_page_frame_number_of_address(buffer);
   printf("Page frame: 0x%x\n", page_frame_number);

   // Find the difference from the buffer to the page boundary
   unsigned int distance_from_page_boundary = (unsigned long)buffer % getpagesize();

   // Determine how far to seek into memory to find the buffer
   uint64_t offset = (page_frame_number << PAGE_SHIFT) + distance_from_page_boundary;

   // Open /dev/mem, seek the calculated offset, and
   // map it into memory so we can manipulate it
   // CONFIG_STRICT_DEVMEM must be disabled for this
   int mem_fd = open_memory();
   seek_memory(mem_fd, offset);
    
   printf("Buffer: %s\n", buffer);
   puts("Changing buffer through /dev/mem...");

   // Change the contents of the buffer by writing into /dev/mem
   // Note that since the strings are the same length, there's no purpose in
   // copying the NUL terminator again
   if(write(mem_fd, NEW_BUFFER, strlen(NEW_BUFFER)) == -1) {
      printf("Write failed: %s\n", strerror(errno));
   }

   printf("Buffer: %s\n", buffer);

   // Clean up
   free(buffer);
   close(mem_fd);

   return 0;
}

void* create_buffer(void) {
   size_t buf_size = strlen(ORIG_BUFFER) + 1;

   // Allocate some memory to manipulate
   void *buffer = malloc(buf_size);
   if(buffer == NULL) {
      fprintf(stderr, "Failed to allocate memory for buffer\n");
      exit(1);
   }

   // Lock the page in memory
   // Do this before writing data to the buffer so that any copy-on-write
   // mechanisms while give us our own page locked in memory
   if(mlock(buffer, buf_size) == -1) {
      fprintf(stderr, "Failed to lock page in memory: %s\n", strerror(errno));
      exit(1);
   }

   // Add some data to the memory
   strncpy(buffer, ORIG_BUFFER, strlen(ORIG_BUFFER));

   return buffer;
}

unsigned long get_page_frame_number_of_address(void *addr) {
   // Open the pagemap file for the current process
   FILE *pagemap = fopen("/proc/self/pagemap", "rb");

   // Seek to the page that the buffer is on
   unsigned long offset = (unsigned long)addr / getpagesize() * PAGEMAP_LENGTH;
   if(fseek(pagemap, (unsigned long)offset, SEEK_SET) != 0) {
      fprintf(stderr, "Failed to seek pagemap to proper location\n");
      exit(1);
   }

   // The page frame number is in bits 0-54 so read the first 7 bytes and clear the 55th bit
   unsigned long page_frame_number = 0;
   fread(&page_frame_number, 1, PAGEMAP_LENGTH-1, pagemap);

   page_frame_number &= 0x7FFFFFFFFFFFFF;

   fclose(pagemap);

   return page_frame_number;
}

int open_memory(void) {
   // Open the memory (must be root for this)
   int fd = open("/dev/mem", O_RDWR);

   if(fd == -1) {
      fprintf(stderr, "Error opening /dev/mem: %s\n", strerror(errno));
      exit(1);
   }

   return fd;
}

void seek_memory(int fd, unsigned long offset) {
   unsigned pos = lseek(fd, offset, SEEK_SET);

   if(pos == -1) {
      fprintf(stderr, "Failed to seek /dev/mem: %s\n", strerror(errno));
      exit(1);
   }
}
{% endhighlight %}

### References
<hr />

[1] [https://www.kernel.org/doc/Documentation/vm/pagemap.txt](https://www.kernel.org/doc/Documentation/vm/pagemap.txt)<br />
[2] [https://www.kernel.org/doc/gorman/html/understand/understand005.html](https://www.kernel.org/doc/gorman/html/understand/understand005.html)<br />
[3] [https://www.blackhat.com/presentations/bh-europe-09/Lineberry/BlackHat-Europe-2009-Lineberry-code-injection-via-dev-mem.pdf](https://www.blackhat.com/presentations/bh-europe-09/Lineberry/BlackHat-Europe-2009-Lineberry-code-injection-via-dev-mem.pdf)
