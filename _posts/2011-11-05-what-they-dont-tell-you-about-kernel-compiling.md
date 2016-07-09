---
layout: post
title: What They Don't Tell You About Kernel Compiling
date: 2011-11-05
---

Compiling Linux yourself is one thing. Actually using the kernel you just compiled is another. Here's my latest debacle with the hell I put upon myself by compiling my own kernels.

The problem: Compiling any kernel modules against a custom compiled kernel would begin to fail after an unknown amount of time had past after compiling the kernel.

I also compile my own video driver kernel modules. At first when I compiled and installed a new kernel the module installer would work fine. But then if I went to do it again for whatever reason say, a week later, it would fail. Programs like VMware and Virtualbox would complain about not being able to find the kernel headers as would dkms.

But I thought that if I installed the kernel image and kernel headers packages that everything would work? That's how it seemed to work anyway.

Well, was I wrong. I always assumed that the kernel headers should be in <code>/usr/src/</code> and any program that needed them would look in there. That is, I assumed it was the standard directory for kernel headers. Maybe it is, but there's more to the story.

As it turns out, there are two symlinks, <code>build</code> and <code>source</code>, in <code>/lib/modules/$(uname -r)</code> that points to the directory the kernel was built in as can be seen in the directory listing below.

{% highlight text linenos %}
lrwxrwxrwx  1 root root      24 2011-11-05 00:06 build -> /usr/src/linux/linux-3.1
drwxr-xr-x 10 root root    4096 2011-11-05 00:06 kernel
drwxr-xr-x  2 root root    4096 2011-11-05 00:08 misc
-rw-r--r--  1 root root  692781 2011-11-05 00:12 modules.alias
-rw-r--r--  1 root root  666131 2011-11-05 00:12 modules.alias.bin
-rw-r--r--  1 root root    5344 2011-11-04 23:37 modules.builtin
-rw-r--r--  1 root root    6664 2011-11-05 00:12 modules.builtin.bin
-rw-r--r--  1 root root      69 2011-11-05 00:12 modules.ccwmap
-rw-r--r--  1 root root  292026 2011-11-05 00:12 modules.dep
-rw-r--r--  1 root root  429325 2011-11-05 00:12 modules.dep.bin
-rw-r--r--  1 root root     186 2011-11-05 00:12 modules.devname
-rw-r--r--  1 root root     665 2011-11-05 00:12 modules.ieee1394map
-rw-r--r--  1 root root     218 2011-11-05 00:12 modules.inputmap
-rw-r--r--  1 root root    4162 2011-11-05 00:12 modules.isapnpmap
-rw-r--r--  1 root root     237 2011-11-05 00:12 modules.ofmap
-rw-r--r--  1 root root  117255 2011-11-04 23:37 modules.order
-rw-r--r--  1 root root  474664 2011-11-05 00:12 modules.pcimap
-rw-r--r--  1 root root    1471 2011-11-05 00:12 modules.seriomap
-rw-r--r--  1 root root     131 2011-11-05 00:12 modules.softdep
-rw-r--r--  1 root root  252644 2011-11-05 00:12 modules.symbols
-rw-r--r--  1 root root  320040 2011-11-05 00:12 modules.symbols.bin
-rw-r--r--  1 root root 1004015 2011-11-05 00:12 modules.usbmap
lrwxrwxrwx  1 root root      25 2011-11-05 00:41 source -> /usr/src/linux/linux-3.1/
drwxr-xr-x  3 root root    4096 2011-11-05 00:12 updates

{% endhighlight %}

In my case, I would build the kernel in my home directory and then tar up the source and move it to long term storage once the system was playing nicely with the new kernel. That is, after I had all my kernel modules built. The undetermined amount of time it would take to stop building modules successfully was the time until I archived the kernel source and deleted the build directory.

So here's the bottom line/solution to the problem: <strong>You must keep the kernel source in the same location as you built it</strong> or you need to update the build symlink in <code>/lib/modules/$(uname -r)</code>. In my case, that meant creating a directory in <code>/usr/src/</code> where I'll be keeping all the sources from now on (or at least the current and previous one).

Now, what I'm curious about is how the kernel packages from the software repos work. They don't distribute the full kernel source, only the headers. Checking in an old module kernel directory, say, <code>/lib/modules/2.6.38-11-generic</code> shows the build symlink pointing to the kernel headers and the source symlink is not even present. Does this mean I don't even need to install the headers if I have the full source available? In theory, no, since the source includes the headers. But then why couldn't I change the build symlink to point to my custom headers and delete the source? If you know, email me with some clarification. Until then, I'll continue to experiment.
