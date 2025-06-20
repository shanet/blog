---
layout: post
title: Writing a Self-Mutating x86_64 C Program
date: 2013-12-29
---

"Why would you ever want to write a program that changes its code while it's running? That's a horrible idea!"

Yes, yes it is. It's a good learning experience though. This is not something you would ever do outside of exploring a curiosity.

Self-mutating/self-modifying programs aren't useful for a whole lot. They make for difficult debugging, the program becomes hardware dependent, and the code is extremely tedious and confusing to read unless you are an expert assembly programmer. The only good use for self-mutating programs in the wild I know of is as a cloaking mechanism for malware. My goal is purely academic so I venture into nothing of the sort here.

<strong>Warning: This post is heavy on x86_64 assembly of which I am no expert. A fair amount of research went into writing this and it's possible (almost expected) that mistakes were made. If you find one, send an email so that it may be corrected.</strong>

The first step of writing a self-mutating program is being able to change the code at runtime. Programmers figured out long ago that this was a bad idea and since then protections have been added to prevent a program's code from being changed at runtime. We first need to understand where the program's instructions live when the program is being executed. When a program is to be executed, the loader will load the entire program into memory. The program then executes inside of a virtual address space that is managed by the kernel. This address space is broken up into different segments as illustrated below.

![]({{ site.baseurl }}/assets/images/2013/12/address_space.png)

In this case, we're only concerned with the text segment. This is where the instructions of the process are stored. Behind the address space are pages which are handled by the kernel. These pages map to the physical memory of the computer. The kernel controls permissions to each of these pages. By default, the text segment pages are set to read and execute. You may not write to them. In order to change the instructions at runtime, we'll need to change the permissions of the text segment pages so that we write to them.

Changing the permissions of a page can be done with the <code>mprotect()</code> function. The only tricky part of <code>mprotect()</code> is that the pointer you give it must be aligned to a page boundary. Here is a function that given a pointer, moves the pointer to the page boundary and then changes that page to read, write, and execute permissions.

{% highlight c linenos %}
int change_page_permissions_of_address(void *addr) {
    int page_size = getpagesize();
    addr -= (unsigned long)addr % page_size;

    if(mprotect(addr, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        return -1;
    }

    return 0;
}
{% endhighlight %}

<!--more-->

If we give this function a pointer that points to an address in the text segment, that page in the text segment will now be writeable. It is important to note that the OS may refuse to allow the text segment to be writeable. I'm working on Linux, which does allow for writing to the text segment. If you are using another OS, make sure you're checking the return value to see if the call to <code>mprotect()</code> failed. In the examples below, we assume that the function we'll be changing is contained entirely on a single page. For long functions, this may not be the case.

<hr />

Now that we can write to the text segment, the next question is: what do we write?

Let's start with something simple. Say I have the following function:

{% highlight c linenos %}
void foo(void) {
    int i=0;
    i++;
    printf("i: %d\n", i);
}
{% endhighlight %}

<code>foo()</code> creates and initializes a local variable, <code>i</code>, to 0, then increments it by 1 and prints it to stdout. Let's see if we can change the value that <code>i</code> is incremented by.

To accomplish this goal we'll need to see not just the instructions that <code>foo()</code> compiles to, but the actual machine code that <code>foo()</code> is assembled to. Let's put <code>foo()</code> in a full program so it's easier to do this.

{% highlight c linenos %}
#include <stdio.h>

void foo(void);

int main(void) {
    return 0;
}

void foo(void) {
    int i=0;
    i++;
    printf("i: %d\n", i);
}
{% endhighlight %}

Now that we have <code>foo()</code> in a full C program, we can compile it with:

{% highlight bash linenos %}$ gcc -o foo foo.c{% endhighlight %}

This is where things start to get interesting. We need to disassemble the binary gcc created for us to see the instructions that comprise <code>foo()</code>. We can do this with the objdump utility like so:

{% highlight bash linenos %}$ objdump -d foo > foo.dis{% endhighlight %}

If you open the <code>foo.dis</code> file in a text editor, around line 128 (<code>foo</code> may have slightly different instructions depending on the version of gcc used) you should see the disassembled <code>foo()</code> function. It looks like the following:

{% highlight text linenos %}
0000000000400538 <foo>
  400538:	55                   	push   %rbp
  400539:	48 89 e5             	mov    %rsp,%rbp
  40053c:	48 83 ec 10          	sub    $0x10,%rsp
  400540:	c7 45 fc 00 00 00 00 	movl   $0x0,-0x4(%rbp)
  400547:	83 45 fc 01          	addl   $0x1,-0x4(%rbp)
  40054b:	8b 45 fc             	mov    -0x4(%rbp),%eax
  40054e:	89 c6                	mov    %eax,%esi
  400550:	bf 14 06 40 00       	mov    $0x400614,%edi
  400555:	b8 00 00 00 00       	mov    $0x0,%eax
  40055a:	e8 b1 fe ff ff       	callq  400410
<printf@plt>
  40055f:	c9                   	leaveq
  400560:	c3                   	retq
  400561:	66 2e 0f 1f 84 00 00 	nopw   %cs:0x0(%rax,%rax,1)
  400568:	00 00 00
  40056b:	0f 1f 44 00 00       	nopl   0x0(%rax,%rax,1)
{% endhighlight %}

This might look a little foreign if you have never worked with x86_64 code before. Basically what's going on here is that we are pushing the stack down 4 bytes (the size of an integer on my system) to use as the storage location for the variable <code>i</code>. We then initialize these 4 bytes to 0 and then add 1 to this value. Everything after this (40054b) is moving values around to prepare for calling the printf() function.

That said, if we want to change the value that i is incremented by, we need to change the following instruction:

{% highlight text linenos %}400547:	83 45 fc 01          	addl   $0x1,-0x4(%rbp){% endhighlight %}

Before going any further though, let's break this instruction down.

<div class="table-overflow">
  <table class="post-table">
    <thead>
      <tr>
        <th><code>400547</code></th>
        <th><code>83 45 fc 01</code></th>
        <th><code>addl $0x1,-0x4(%rbp)</code></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>The first column is the memory location of this instruction.</td>
        <td>The second column is the machine code of the instruction. These are the bytes that the CPU will read and react to.</td>  
        <td>The third column is the human readable (well, readable to humans with some prior knowledge), disassembled machine code from the second column.</td>  
      </tr>
    </tbody>
  </table>
</div>

Going further, we can break down the instruction to understand its operands:

<div class="table-overflow">
  <table class="post-table">
    <thead>
      <tr>
        <th><code>addl</code></th>
        <th><code>$0x1</code></th>
        <th><code>-0x4(%rbp)</code></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>addl</code> is the instruction. There are multiple add commands in the x86_64 instruction set. This one means add an 8bit value to a register or memory location.</td>
        <td><code>$0x1</code> is an immediate value. Dollar signs denote immediate values and the <code>0x</code> prefix denotes a hexadecimal number follows. In this case, the number is just 1 since <code>0x1 = 1</code> in base 10.</td>  
        <td><code>-0x4(%rbp)</code> is the memory address to add the value to. Here it is saying to add it to the current location of the base stack pointer offset by 4 bytes. This is where our <code>i</code> variable was put on the stack.</td>  
      </tr>
    </tbody>
  </table>
</div>

Now that we understand the human readable form of the instruction, let's dive into the machine instruction. All x86_64 instructions have the following format:

![]({{ site.baseurl }}/assets/images/2013/12/Instruction-Format.png)

This is where x86_64 gets really complicated. x86_64 instructions have a variable length so to the unfamiliar, decoding instructions by hand can be a confusing and time consuming process. To make it easier, there are various documentation sources. x86ref.net has great documentation once you learn how to read it <a href="http://ref.x86asm.net/coder64.html#x83">such as the reference for the <code>addl</code> instruction</a>. For the brave, there is also the <a href="http://www.intel.com/content/www/us/en/architecture-and-technology/64-ia-32-architectures-software-developer-manual-325462.html">Intel 64 and IA-32 Architectures Developer's Manual: Combined Vols. 1, 2, and 3</a> (warning: 3,000 page PDF).

In our case, these bytes mean the following:

<div class="table-overflow">
  <table class="post-table">
    <thead>
      <tr>
        <th><code>83</code></th>
        <th><code>45</code></th>
        <th><code>fc</code></th>
        <th><code>01</code></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>83</code> is the opcode of the <code>addl</code> instruction. All instructions have an opcode that tells the CPU what instruction to perform.</td>
        <td><code>45</code> is the ModR/M byte. Per Intel's documentation, <code>0x45 = [RBP/EBP]+disp8</code>. This means that <code>0x45</code> denotes the <code>%rbp</code> register is the destination and the byte that follows (in this case, <code>0xfc</code>) is the displacement byte.</td>  
        <td><code>fc</code> is the displacement byte. <code>0xfc = 0b11111100</code>. In this case it is in two's complement so the decimal value is -4.</td>  
        <td><code>01</code> is the immediate value that will be added to the given memory address. <strong>This is the byte we need to change in order to change the value that <code>i</code> is incremented by.</strong></td>  
      </tr>
    </tbody>
  </table>
</div>

How did I determine what the ModR/M byte meant? There is a <a href="http://ref.x86asm.net/coder64.html#modrm_byte_32_64">handy table in the documentation that explains what each ModR/M byte means</a>. This table is also available in the Intel manual linked to above as Table 2-2 in section 2-5 of volume 2A (or page 445 of the PDF).

<hr />

Moving right along, we now are able to change the instruction and know what to change; we just need to know how to change it.

To recap, we want to change the 01 byte in the <code>addl $0x1,-0x4(%rbp)</code> instruction.

To do this, we need to get the address of that byte. It's trivial to get the address of <code>foo()</code> at runtime so all we need to do is find the offset of this byte from start of <code>foo()</code>. There's two ways we can do this:

1. Use the objdump disassembly from earlier to count the number of bytes between the start of the function and the byte we want.
1. Write a function to print the instructions of <code>foo()</code> and their offset from the start of the function.

Why not do both?

Let's look at the objdump method first. The disassembly of <code>foo()</code> up to the <code>addl</code> instruction we're interested in is:

{% highlight text linenos %}
0000000000400538 <foo>:
  400538:	55                   	push   %rbp
  400539:	48 89 e5             	mov    %rsp,%rbp
  40053c:	48 83 ec 10          	sub    $0x10,%rsp
  400540:	c7 45 fc 00 00 00 00 	movl   $0x0,-0x4(%rbp)
  400547:	83 45 fc 01          	addl   $0x1,-0x4(%rbp)
{% endhighlight %}

The function starts at <code>400538</code> and the byte we're interested in is at <code>40055a (400547 + 3)</code> (remember, these are hex values!) so that means the offset is <code>40055a - 400538 = 12</code>. Because this is a hex value, when we're calculating offsets we need to either use hex values or convert it to base 10. The latter is easier so let's say that an offset of <code>0x12 = 18</code> is what we're looking for.

We can confirm this by writing a short function to print the instructions of a given function. Here's the modified program from above:

{% highlight c linenos %}
#include <stdio.h>

void foo(void);
void bar(void);
void print_function_instructions(void *func_ptr, size_t func_len);

int main(void) {
    void *foo_addr = (void*)foo;
    void *bar_addr = (void*)bar;

    print_function_instructions(foo_addr, bar_addr - foo_addr);

    return 0;
}

void foo(void) {
    int i=0;
    i++;
    printf("i: %d\n", i);
}

void bar(void) {}

void print_function_instructions(void *func_ptr, size_t func_len) {
    for(unsigned char i=0; i<func_len; i++) {
        unsigned char *instruction = (unsigned char*)func_ptr+i;
        printf("%p (%2u): %x\n", func_ptr+i, i, *instruction);
    }
}
{% endhighlight %}

Note that to determine the length of <code>foo()</code>, we added an empty function, <code>bar()</code>, that immediately follows <code>foo()</code>. By subtracting the address of <code>bar()</code> from <code>foo()</code> we can determine the length in bytes of <code>foo()</code>. This, of course, assumes that <code>bar()</code> immediately follows <code>foo()</code>.

The output of running this:

{% highlight text linenos %}
$  ./foo
0x40056c ( 0): 55
0x40056d ( 1): 48
0x40056e ( 2): 89
0x40056f ( 3): e5
0x400570 ( 4): 48
0x400571 ( 5): 83
0x400572 ( 6): ec
0x400573 ( 7): 10
0x400574 ( 8): c7
0x400575 ( 9): 45
0x400576 (10): fc
0x400577 (11): 0
0x400578 (12): 0
0x400579 (13): 0
0x40057a (14): 0
0x40057b (15): 83
0x40057c (16): 45
0x40057d (17): fc
0x40057e (18): 1           <-- Here's the byte we want!
0x40057f (19): 8b
0x400580 (20): 45
0x400581 (21): fc
0x400582 (22): 89
0x400583 (23): c6
0x400584 (24): bf
0x400585 (25): b4
0x400586 (26): 6
0x400587 (27): 40
0x400588 (28): 0
0x400589 (29): b8
0x40058a (30): 0
0x40058b (31): 0
0x40058c (32): 0
0x40058d (33): 0
0x40058e (34): e8
0x40058f (35): 7d
0x400590 (36): fe
0x400591 (37): ff
0x400592 (38): ff
0x400593 (39): c9
0x400594 (40): c3
{% endhighlight %}

At address <code>0x40057e</code> is our <code>0x1</code> byte. As you can see, the offset is indeed 18.

We're finally read to change some code! Given a pointer to <code>foo()</code>, we can create an unsigned char pointer to the exact byte we want to change as such:

{% highlight c linenos %}
unsigned char *instruction = (unsigned char*)foo_addr + 18;

*instruction = 0x2A;
{% endhighlight %}

Assuming we did everything right, this will change the immediate value in the <code>addl</code> instruction to <code>0x2A</code> or 42. Now when we call <code>foo()</code>, it will print 42 instead of 1.

And putting it all together:

{% highlight c linenos %}
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <sys/mman.h>

void foo(void);
int change_page_permissions_of_address(void *addr);

int main(void) {
    void *foo_addr = (void*)foo;

    // Change the permissions of the page that contains foo() to read, write, and execute
    // This assumes that foo() is fully contained by a single page
    if(change_page_permissions_of_address(foo_addr) == -1) {
        fprintf(stderr, "Error while changing page permissions of foo(): %s\n", strerror(errno));
        return 1;
    }

    // Call the unmodified foo()
    puts("Calling foo...");
    foo();

    // Change the immediate value in the addl instruction in foo() to 42
    unsigned char *instruction = (unsigned char*)foo_addr + 18;
    *instruction = 0x2A;

    // Call the modified foo()
    puts("Calling foo...");
    foo();

    return 0;
}

void foo(void) {
    int i=0;
    i++;
    printf("i: %d\n", i);
}

int change_page_permissions_of_address(void *addr) {
    // Move the pointer to the page boundary
    int page_size = getpagesize();
    addr -= (unsigned long)addr % page_size;

    if(mprotect(addr, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        return -1;
    }

    return 0;
}
{% endhighlight %}

Compile it with:

{% highlight bash linenos %}$ gcc -std=c99 -D_BSD_SOURCE -o foo foo.c{% endhighlight %}

Running it gives the output:

{% highlight bash linenos %}
$ ./foo
Calling foo...
i: 1
Calling foo...
i: 42
{% endhighlight %}

Success! The first time we call <code>foo()</code> it prints 1 just as its source code says it should. Then after we modify it it prints 42.

<hr />

However, this is pretty boring: all it does is change a number. Wouldn't it be more far more interesting if we could change <code>foo()</code> to do something else entirely? Maybe <code>exec()</code> a shell?

How would we go about starting a shell when we call <code>foo()</code> though? The natural choice is to use the <code>execve</code> syscall, but that's a lot more involved than just changing a single byte.

If we're going to change <code>foo()</code> to exec a shell, we're going to need the instructions for doing as such. Fortunately for us, the security community loves using machine code for exec'ing shells so this is easy to get our hands on. A quick search for "x86_64 shellcode" and we have the instructions for exec'ing a shell. These are as follows:

{% highlight c linenos %}
char shellcode[] =
    "\x48\x31\xd2"                              // xor    %rdx, %rdx
    "\x48\x31\xc0"                              // xor    %rax, %rax
    "\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00"  // mov    $0x68732f6e69622f, %rbx
    "\x53"                                      // push   %rbx
    "\x48\x89\xe7"                              // mov    %rsp, %rdi
    "\x50"                                      // push   %rax
    "\x57"                                      // push   %rdi
    "\x48\x89\xe6"                              // mov    %rsp, %rsi
    "\xb0\x3b"                                  // mov    $0x3b, %al
    "\x0f\x05";                                 // syscall
{% endhighlight %}

This code was taken from <a href="http://www.exploit-db.com/exploits/13691/">http://www.exploit-db.com/exploits/13691/</a> with two modifications by me as outlined below.

* I added <code>xor %rax, %rax</code> so that the <code>%rax</code> register is zero'd. Otherwise, it may not be and this would cause a segfault.
* I changed the immediate value <code>$0x68732f6e69622f2f</code> to <code>$0x68732f6e69622f00</code>. This allowed me to remove a shift instruction which kept the total length at 30 bytes. Normally, shellcode like this is injected via buffer overflows or other kinds of malicious attacks that exploit flaws in a program's string handling. C-strings are terminated with the NUL character which has a value of 0. Thus, most of the string.h functions will return when they read a NUL byte. Security people like to avoid NUL's for this reason. In this case, NUL characters are perfectly fine so we can just replace the extra <code>0x2f</code> with an <code>0x00</code> and drop the shift command. See the original code in the link above for how my modifications differ.

Before going further, let's explain what the shellcode above is doing. First we need to understand how a syscall works. A syscall, or system call, is a function call to the kernel asking that the kernel do something for us. This may be something that only the kernel has the permissions to do so we have to ask it to do it for us. In this case, the execve syscall tells the kernel that we would like it to start another process and replace our process address space with this new process's address space. This means that, assuming execve succeeds, our process is essentially done executing.

In order to make a syscall on x86_64, we have to prepare for the syscall by moving the correct values to the correct registers and then issuing with <code>syscall</code> instruction. These correct values and registers are unique to each OS. I'm focusing on Linux here so let's look at the documentation for the <code>execve</code> syscall:

<div class="table-overflow">
  <table class="post-table">
    <thead>
      <tr>
        <th><code>%rax</code></th>
        <th>Syscall</th>
        <th><code>%rdi</code></th>
        <th><code>%rsi</code></th>
        <th><code>%rdx</code></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>59</code></td>
        <td><code>sys_execve</code></td>  
        <td><code>const char *filename</code></td>  
        <td><code>const char *const argv[]</code></td>  
        <td><code>const char *const envp[]</code></td>  
      </tr>
    </tbody>
  </table>
</div>

It's important to note that <strong>the values of these registers should be pointers to the memory location of their respective values</strong>. This means that we'll have to push all the values to the stack and then copy the correct stack locations to the registers above. And you thought you would never say "wow, I miss the simplicity of pointers in C."

A full list of syscalls can be found at <a href="https://blog.rchapman.org/posts/Linux_System_Call_Table_for_x86_64/">https://blog.rchapman.org/posts/Linux_System_Call_Table_for_x86_64</a>.

If you're familiar with the C prototype for the <code>execve()</code> function (below for reference), you'll see that how similar the syscall setup is to calling the function from a C program.

{% highlight c linenos %}int execve(const char *filename, char *const argv[], char *const envp[]);{% endhighlight %}

For those familiar with x86, it's important to note that the syscall procedure is quite different between x86 and x86_64. The syscall instruction does not exist in the x86 instruction set. In x86 syscalls are made by triggering an interrupt. Furthermore, in Linux, the syscall number for <code>execve</code> is different between x86 and x86_64. (<code>11</code> on x86; <code>59</code> on x86_64).

Now that we know how to set up a syscall, let's explain each step of the shellcode.

<div class="table-overflow">
  <table class="post-table">
    <thead>
      <tr>
        <th>Machine code</th>
        <th>Instruction</th>
        <th>Explanation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>\x48\x31\xd2</code></td>
        <td><code>xor %rdx, %rdx</code></td>
        <td>Zero the <code>%rdx</code> register</td>
      </tr>
      <tr>
        <td><code>\x48\x31\xc0</code></td>
        <td><code>xor %rax, %rax</code></td>
        <td>Zero the <code>%rax</code> register. We use this for <code>NULL</code> values later so it must zero'd.</td>
      </tr>
      <tr>
        <td><code>\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00</code></td>
        <td><code>mov $0x68732f6e69622f, %rbx</code></td>
        <td>Set the value of the <code>%rbx</code> register to <code>hs/nib/</code>. Intel processors are little endian so the string must be backwards. A quick way to do this with Python is <code>'/bin/sh'[::-1].encode('hex')</code>. It is convenient that "/bin/sh" is 64bits so it fits within a single register. Anything longer would require some trickery to concatenate longer strings together.</td>
      </tr>
      <tr>
        <td><code>\x53</code></td>
        <td><code>push %rbx</code></td>
        <td>Push the /bin/sh string (currently in register <code>%rbx</code>) to the stack. The push instruction will adjust the stack pointer for us.</td>
      </tr>
      <tr>
        <td><code>\x48\x89\xe7</code></td>
        <td><code>mov %rsp, %rdi</code></td>
        <td>As per the syscall documentation, the <code>%rdi</code> register should point to the memory location of the program to execute. The stack pointer (register <code>%rsp</code>) is currently pointing at this string so copy the stack pointer to <code>%rdi</code>.</td>
      </tr>
      <tr>
        <td><code>\x50</code></td>
        <td><code>push %rax</code></td>
        <td>The second argument to the <code>execve()</code> function is the argv array. This array should be NULL terminated. Intel processors are little endian so we have to push a NULL value to denote the end of the array onto the stack first. Remember that we zero'd <code>%rax</code> earlier so we only have to push this register to the stack to get our <code>NULL</code> value.</td>
      </tr>
      <tr>
        <td><code>\x57</code></td>
        <td><code>push %rdi</code></td>
        <td>By convention, the first argument in the argv array is the name of the program. Remember that the argv array is really a pointer to an array of pointers to strings. In this case, the only value in the array is the name of the program. Also remember that the <code>%rdi</code> register now contains the memory location of the /bin/sh string on the stack. If we push this address to the stack, we now have an array of pointers to the strings that make up the argv array.</td>
      </tr>
      <tr>
        <td><code>\x48\x89\xe6</code></td>
        <td><code>mov %rsp, %rsi</code></td>
        <td>As per the syscall documentation, the <code>%rsi</code> register should point to the memory location of the argv array. Since we just pushed the argv array to the stack, the stack pointer is pointing to the first element of argv. All we have to do is copy the stack pointer to the <code>%rsi</code> register.</td>
      </tr>
      <tr>
        <td><code>\xb0\x3b</code></td>
        <td><code>mov $0x3b, %al</code></td>
        <td>The last step is to put the syscall number (<code>59 = 0x3b</code>) into register <code>%rax</code>. Here, <code>%al</code> refers to the first byte of the <code>%rax</code> register. This puts 59 in the first byte of the <code>%rax</code> register. All other bits in <code>%rax</code> are still zero'd from before.</td>
      </tr>
      <tr>
        <td><code>\x0f\x05</code></td>
        <td><code>syscall</code></td>
        <td>Once we're ready to go, issue the syscall instruction and the kernel will take it from here. Cross your fingers!</td>
      </tr>
    </tbody>
  </table>
</div>

<hr />

Now we're ready to change <code>foo()</code> to execute this shellcode. Instead of changing a single byte in <code>foo()</code> like before, we now want to replace <code>foo()</code> entirely. This looks like a job for <code>memcpy()</code>. Given a pointer to the start of <code>foo()</code> and a pointer to our shellcode, we can copy the shellcode to the location of <code>foo()</code> as such:

{% highlight c linenos %}
    void *foo_addr = (void*)foo;

    // http://www.exploit-db.com/exploits/13691/
    char shellcode[] =
        "\x48\x31\xd2"                              // xor    %rdx, %rdx
        "\x48\x31\xc0"                              // xor    %rax, %rax
        "\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00"  // mov    $0x68732f6e69622f2f, %rbx
        "\x53"                                      // push   %rbx
        "\x48\x89\xe7"                              // mov    %rsp, %rdi
        "\x50"                                      // push   %rax
        "\x57"                                      // push   %rdi
        "\x48\x89\xe6"                              // mov    %rsp, %rsi
        "\xb0\x3b"                                  // mov    $0x3b, %al
        "\x0f\x05";                                 // syscall

    // Careful with the length of the shellcode here depending on what is after foo
    memcpy(foo_addr, shellcode, sizeof(shellcode)-1);
{% endhighlight %}

The only thing we have to be careful of writing past the end of <code>foo()</code>. In this case, we're safe because <code>foo()</code> is 41 bytes long and the shellcode is 29 bytes. Note that because the shellcode is a C string, it has a NUL character at the end. We only want to copy the actual shellcode bytes so we subtract 1 from the <code>sizeof</code> shellcode in the length argument of <code>memcpy</code>.

Awesome! Let's put it all together into a final program now.


{% highlight c linenos %}
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <sys/mman.h>

void foo(void);
int change_page_permissions_of_address(void *addr);

int main(void) {
    void *foo_addr = (void*)foo;

    // Change the permissions of the page that contains foo() to read, write, and execute
    // This assumes that foo() is fully contained by a single page
    if(change_page_permissions_of_address(foo_addr) == -1) {
        fprintf(stderr, "Error while changing page permissions of foo(): %s\n", strerror(errno));
        return 1;
    }

    puts("Calling foo");
    foo();

    // http://www.exploit-db.com/exploits/13691/
    char shellcode[] =
        "\x48\x31\xd2"                              // xor    %rdx, %rdx
        "\x48\x31\xc0"                              // xor    %rax, %rax
        "\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00"  // mov    $0x68732f6e69622f2f, %rbx
        "\x53"                                      // push   %rbx
        "\x48\x89\xe7"                              // mov    %rsp, %rdi
        "\x50"                                      // push   %rax
        "\x57"                                      // push   %rdi
        "\x48\x89\xe6"                              // mov    %rsp, %rsi
        "\xb0\x3b"                                  // mov    $0x3b, %al
        "\x0f\x05";                                 // syscall

    // Careful with the length of the shellcode here depending on what is after foo
    memcpy(foo_addr, shellcode, sizeof(shellcode)-1);

    puts("Calling foo");
    foo();

    return 0;
}

void foo(void) {
    int i=0;
    i++;
    printf("i: %d\n", i);
}

int change_page_permissions_of_address(void *addr) {
    // Move the pointer to the page boundary
    int page_size = getpagesize();
    addr -= (unsigned long)addr % page_size;

    if(mprotect(addr, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        return -1;
    }

    return 0;
}
{% endhighlight %}

Compile it with:

{% highlight bash linenos %}$ gcc -o mutate mutate.c{% endhighlight %}

Time to rub your lucky rabbit foot and execute this thing:

{% highlight bash linenos %}
$ ./mutate
Calling foo
i: 1
Calling foo
$ echo "it works! we exec'd a shell!"
it works! we exec'd a shell!
{% endhighlight %}

And there you have it, a self-mutating C program.
