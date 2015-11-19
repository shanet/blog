---
layout: post
title: Adding a Syscall to Linux 3.14
date: 2014-04-09
---

I've long had an interest in Linux, and by Linux I mean the actual Linux project, ie. the kernel, not GNU/Linux, but getting into kernel development is an incredibly difficult task to accomplish. Linux has millions of lines and is one of the largest software projects in the world. Not to mention that the Linux kernel mailing list can be an intimating place. In all, it's not something that you just jump into on a whim.

I've been using GNU/Linux for over six years now. I've become very comfortable with it and C. I've read kernel code in the past, but never written any. My goal was to dip my toe in and test the waters of writing some kernel code. I figured that a good way to do this was to try to add my own custom syscall to Linux. And to have some fun with it, I decided that this syscall would work like the <code>setuid</code> syscall except that it would change the <code>uid</code> of the calling process to 0 without any authentication checks. That's right, this sucker is completely subverts all security in the kernel and is essentially a rootkit. As usual, my goal here is purely academic, not malicious. Considering employing this would mean completely changing the kernel of a system, I'd hardly consider it a vulnerability. If you're able to change the kernel of a system, all security has already gone out the window.

Note that at the end of this process, if you want to try it out, you'll need to compile your own kernel. This isn't a guide on how to compile the kernel so you'll need to look up that process for yourself. However, if you're on Ubuntu, the Ubuntu wiki has a <a href="https://wiki.ubuntu.com/KernelTeam/GitKernelBuild">pretty good guide</a>.

That said, let's dive in and see what files need modified. If you haven't already, you'll want to get a copy of the source with:

{% highlight bash linenos=table %}
$ git clone git://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git
{% endhighlight %}


Specifically, I'm working off of commit <code>a64f0f8c23740dc78c5f9aaee3904d0d3df4bfb5</code> so it may be helpful to run:

{% highlight bash linenos=table %}
$ git checkout a64f0f8c23740dc78c5f9aaee3904d0d3df4bfb5
{% endhighlight %}


Linux is massive and I'm no magician so I needed a little help on where to start looking. A quick search revealed this guide: <a href="http://www.tldp.org/HOWTO/html_single/Implement-Sys-Call-Linux-2.6-i386/">http://www.tldp.org/HOWTO/html_single/Implement-Sys-Call-Linux-2.6-i386/</a> which turned out to be a very good resource. The only problem is that is slightly out of date being written for Linux 2.6 and for x86 architecture. Let's see if we if make this work on the current version of Linux 3.14 (at the time of this writing) and for x86_64.

<!--more-->

<hr />

First up is the syscall table. This is located at <code>arch/x86/syscalls/syscall_64.tbl</code>. Per the comment at the top of the file, the format of this file is as follows:
{% highlight bash linenos=table %}
<number> <abi> <name> <entry point>
{% endhighlight %}

Let's explain what each of these fields mean.

<table class="post-table">
  <thead>
    <tr>
      <th>number</th>
      <th>abi</th>
      <th>name</th>
      <th>entry point</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>All syscalls are identified by a unique number. In order to call a syscall, we tell the kernel to call the syscall by its number rather than by its name.</td>
      <td>The ABI, or application binary interface, to use. Either 64, x32, or common for both.</td>
      <td>This is simply the name of the syscall.</td>
      <td>The entry point is the name of the function to call in order to handle the syscall. The naming convention for this function is the name of the syscall prefixed with <code>sys_</code>. For example, the read syscall's entry point is <code>sys_read</code>.</td>
    </tr>
  </tbody>
</table>

The version I have has 315 syscalls. To add our new one, I'm going to make a syscall 316 that looks as such:

{% highlight bash linenos=table %}
316	common	set_root		sys_set_root
{% endhighlight %}

<ul>
<li><code>316</code>: The table already had 315 syscalls so the next number to use is 316.</li>
<li><code>common</code>: Use <code>common</code> as the ABI.</li>
<li><code>set_root</code>: The name I arbitrarily chose for my syscall.</li>
<li><code>sys_set_root</code>: The entry point of my syscall following the naming scheme of prefixing the name of the syscall with <code>sys_</code>.</li>
</ul>

<hr />

Moving on, now that we have our syscall in the syscall table, we have to provide a function prototype for our syscall's entry function. This is done in the <code>include/linux/syscalls.h</code> file.

The function prototype for our entry function will look like the following:


{% highlight c linenos=table %}
asmlinkage long sys_set_root(void);
{% endhighlight %}


It takes no arguments so the argument list is <code>void</code>. Remember, the proper way to tell the compiler that a function takes no arguments in C is to use <code>void</code> in the parameter list.

The curious part of this line is the <code>asmlinkage</code>. This is a macro that tells GCC that the function should expect all of its arguments to be on the stack rather than in registers. Since our function takes no arguments, this doesn't really matter, but all other syscall entry points use <code>asmlinkage</code> so we'll stick with it here.

<hr />

At this point, we're ready to actually write our syscall. To do this, I created a new file, <code>kernel/set_root.c</code>. The contents of that file are:

{% highlight c linenos=table %}
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/sched.h>
#include <linux/syscalls.h>

asmlinkage long sys_set_root(void) {
   struct user_namespace *ns = current_user_ns();
   struct cred *new;

   kuid_t kuid = make_kuid(ns, 0);
   kgid_t kgid = make_kgid(ns, 0);

   if(!uid_valid(kuid)) {
      return -EINVAL;
   }

   new = prepare_creds();

   if(new != NULL) {
      new->uid = kuid;
      new->gid = kgid;
      new->euid = kuid;
      new->egid = kgid;
      new->suid = kuid;
      new->sgid = kgid;
      new->fsuid = kuid;
      new->fsgid = kgid;

      return commit_creds(new);
   } else {
      abort_creds(new);
      return -ENOMEM;
   }
}
{% endhighlight %}

What does this function do? In short, it changes the calling processes' uid, gid, euid, guid, suid, sgid, fsuid, and fsgid all to 0 which means the process is now running as the root user and can do anything it likes. Neat, huh?

Breaking this down a little further, we first get the processes' current namespace with <code>current_user_ns()</code>. Then we use this to create a new <code>kuid</code> and <code>kgid</code>. What's a <code>kuid</code> and <code>kgid</code>? Basically, they are a typedef for storing <code>uid</code>'s and <code>gid</code>'s in the kernel. The <code>kuid</code> and <code>kgid</code> are both created with a value of 0 denoting the root user and group.

Then we create a new <code>cred</code> struct with <code>prepare_creds()</code> and assign all the *<code>uid</code> and *<code>gid</code> properties to our <code>kuid</code> and <code>kgid</code> variables we created earlier. If you aren't familiar with the differences between the real, effective, sticky, and file system <code>uid</code> and <code>gid</code>'s, it's probably a good idea to look those up.

Finally, we commit the changes to the creds with <code>commit_creds()</code>.

How did I figure this out? I knew that the <code>setuid</code> syscall did something very similar. <a href="http://lxr.free-electrons.com/source/kernel/sys.c#L655">By reading its code</a>, I could determine how to change the <code>uid</code> and <code>gid</code>, but without doing any authentication checks.

<hr />

Now that we've written all the code, the last task is to add our new file into a Makefile so that it is linked with the rest of the object files. Since I created my <code>set_root.c</code> file in the <code>kernel</code> directory, I'm going to modify the <code>kernel/Makefile</code> file.

This is very simple; at the top of the file, just add <code>sys_root.o</code> to the end of the <code>obj-y</code> line.

In my case, it looks like this:


{% highlight makefile linenos=table %}
obj-y     = fork.o exec_domain.o panic.o \
	    cpu.o exit.o itimer.o time.o softirq.o resource.o \
	    sysctl.o sysctl_binary.o capability.o ptrace.o timer.o user.o \
	    signal.o sys.o kmod.o workqueue.o pid.o task_work.o \
	    extable.o params.o posix-timers.o \
	    kthread.o sys_ni.o posix-cpu-timers.o \
	    hrtimer.o nsproxy.o \
	    notifier.o ksysfs.o cred.o reboot.o \
	    async.o range.o groups.o smpboot.o set_root.o

{% endhighlight %}


That's all the changes we need to make! Go ahead and compile the kernel, install it, and reboot. It's probably a good idea to install it on a VM. Needless to say, it's a pretty bad idea to have a kernel with a syscall that grants root access to anyone that asks.

<hr />

So how to do we use this thing? More precisely, our syscall doesn't have a nice function to call in <code>libc</code> so how do we call it? Fortunately, we can use the <a href="http://man7.org/linux/man-pages/man2/syscall.2.html"><code>syscall()</code> function</a> to call a syscall by its number.

Here's a short test program:


{% highlight c linenos=table %}
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <pwd.h>
#include <string.h>
#include <errno.h>

#define SYS_SET_ROOT 316

void whoami(void);

int main(void) {
    whoami();

    if(syscall(SYS_SET_ROOT) == -1) {
        fprintf(stderr, "Error calling syscall: %s\n", strerror(errno));
        return 1;
    }

    whoami();

    return 0;
}

void whoami(void) {
    // Code modified from GNU whoami source
    // http://git.savannah.gnu.org/gitweb/?p=coreutils.git;a=blob;f=src/whoami.c;
    // h=7301abb146418e36785801ff57a3946068b69fc5;hb=HEAD
    uid_t uid = geteuid();
    struct passwd *pw = getpwuid(uid);

    if(pw != NULL) {
        puts(pw->pw_name);
    }
}

{% endhighlight %}


As you can see, I grabbed the source from the GNU whoami program to get the username of the process owner. If you run this program on a system with our modified kernel, the output will be the original process owner's username followed by "root."

<hr />

That was my first adventure into writing kernel code. And you know what, it wasn't as painful as I thought it would be. While reading through the <code>setuid</code> function and venturing down the rabbit hole of all the functions it relies on, I found the code to be well organized, easy to read, and with a little bit of effort, easy to understand. In the future, I'll definitely be doing more kernel hacking.

Finally, to wrap everything up, here's a patch of all my changes to the kernel.


{% highlight diff linenos=table %}
From a64f0f8c23740dc78c5f9aaee3904d0d3df4bfb5 Mon Sep 17 00:00:00 2001
From: shane tully <shane@shanetully.com>
Date: Sun, 30 Mar 2014 00:26:22 -0400
Subject: [PATCH] added syscall to set caller process's uid and gid to 0

---
 arch/x86/syscalls/syscall_64.tbl |  1 +
 include/linux/syscalls.h         |  1 +
 kernel/Makefile                  |  2 +-
 kernel/set_root.c                | 37 +++++++++++++++++++++++++++++++++++++
 4 files changed, 40 insertions(+), 1 deletion(-)
 create mode 100644 kernel/set_root.c

diff --git a/arch/x86/syscalls/syscall_64.tbl b/arch/x86/syscalls/syscall_64.tbl
index a12bddc..3fd3ef9 100644
--- a/arch/x86/syscalls/syscall_64.tbl
+++ b/arch/x86/syscalls/syscall_64.tbl
@@ -322,6 +322,7 @@
 313	common	finit_module		sys_finit_module
 314	common	sched_setattr		sys_sched_setattr
 315	common	sched_getattr		sys_sched_getattr
+316	common	set_root		sys_set_root

 #
 # x32-specific system call numbers start at 512 to avoid cache impact
diff --git a/include/linux/syscalls.h b/include/linux/syscalls.h
index a747a77..598869b 100644
--- a/include/linux/syscalls.h
+++ b/include/linux/syscalls.h
@@ -290,6 +290,7 @@ asmlinkage long sys_sched_getattr(pid_t pid,
 					struct sched_attr __user *attr,
 					unsigned int size,
 					unsigned int flags);
+asmlinkage long sys_set_root(void);
 asmlinkage long sys_sched_setaffinity(pid_t pid, unsigned int len,
 					unsigned long __user *user_mask_ptr);
 asmlinkage long sys_sched_getaffinity(pid_t pid, unsigned int len,
diff --git a/kernel/Makefile b/kernel/Makefile
index bc010ee..def272b 100644
--- a/kernel/Makefile
+++ b/kernel/Makefile
@@ -10,7 +10,7 @@ obj-y     = fork.o exec_domain.o panic.o \
 	    kthread.o sys_ni.o posix-cpu-timers.o \
 	    hrtimer.o nsproxy.o \
 	    notifier.o ksysfs.o cred.o reboot.o \
-	    async.o range.o groups.o smpboot.o
+	    async.o range.o groups.o smpboot.o set_root.o

 ifdef CONFIG_FUNCTION_TRACER
 # Do not trace debug files and internal ftrace files
diff --git a/kernel/set_root.c b/kernel/set_root.c
new file mode 100644
index 0000000..79e3d5d
--- /dev/null
+++ b/kernel/set_root.c
@@ -0,0 +1,37 @@
+#include <linux/kernel.h>
+#include <linux/init.h>
+#include <linux/sched.h>
+#include <linux/syscalls.h>
+
+asmlinkage long sys_set_root(void) {
+   struct user_namespace *ns = current_user_ns();
+   struct cred *new;
+
+   kuid_t kuid = make_kuid(ns, 0);
+   kgid_t kgid = make_kgid(ns, 0);
+
+   if(!uid_valid(kuid)) {
+      return -EINVAL;
+   }
+
+   new = prepare_creds();
+
+   if(new != NULL) {
+      new->uid = kuid;
+      new->gid = kgid;
+
+      new->euid = kuid;
+      new->egid = kgid;
+
+      new->suid = kuid;
+      new->sgid = kgid;
+
+      new->fsuid = kuid;
+      new->fsgid = kgid;
+
+      return commit_creds(new);
+   } else {
+      abort_creds(new);
+      return -ENOMEM;
+   }
+}
--
1.8.3.2

{% endhighlight %}

