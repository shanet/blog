---
layout: post
title: Debugging Ruby, The Hard Way
description: TODO
date: 2023-11-13
---

Normally when you encounter a bug with Ruby, or any other interpreted language for that matter, using the language's provided debugging tools is all you need to diagnose the problem and find a solution. Indeed that works 99% of the time. But what about when it doesn't? What about when your program is so hosed that the typical debugging tooling doesn't work?

This was the situation I found myself in recently while debugging a low-level bug with Ruby. I didn't know it when I started, but the problem lie down in glibc and all the Ruby-land debugging tools would not help me. So what's one to do? Well, if you're running the C implementation of Ruby, MRI, then it's GDB to the rescue. However, figuring out how to access the Ruby data needed through GDB presents a host of new challenges. Armed with the proper knowledge though, it becomes entirely feasible to debug a Ruby program through GDB which is what this post aims to explore.

<!--more-->

## But why would you want to do this?

That's a good question. In all honesty and as far as I know, there's very few true use cases for doing this outside of development on Ruby itself, academic curiosity, and the poor souls facing a low level bug that's seemingly impossible to debug otherwise.

In my situation I was working with a Ruby process that would become deadlocked in a glibc function in rare cases. I did not have the ability to debug the Ruby process directly as it was completely unresponsive due to control being outside of Ruby when it deadlocked. The only option I had was to attach GDB to the running process in order to get visibility into the process. As I'll get into later, this provided enough information to put the pieces of the puzzle together and solve my issue at hand. Hopefully this is not what brought you here, but if so, knowing how to debug Ruby via GDB can be a powerful tool in your toolbelt for cracking difficult low-level bugs.

## GDB Basics

As someone that primarily works with Ruby and other high level languages, prior to my aforementioned boggle it had been more than a handful of years since I needed to debug anything with GDB. You may be in a similar boat so let's start with covering enough of the basics to follow along with the rest of this post. If you're adapt with GDB though you can likely skip to the next section.

GDB is, of course, a debugger, and an extremely powerful one at that. We only need to know the absolute basics here though. Let's say we have the following C program:

{% highlight c linenos %}
#include <stdio.h>

const char* GREETING = "Hello, world!";
void print_greeting(const char* greeting);

int main(void) {
  print_greeting(GREETING);
}

void print_greeting(const char* greeting) {
  puts(greeting);
}
{% endhighlight %}

When compiling, ensuring that `-ggdb` is enabled to create debugging symbols. It's still possible to debug a binary without these, but it is more difficult and requires referencing the source code more. Make your life easy and add them.

{% highlight shell linenos %}
$ gcc -ggdb hello_gdb.c
{% endhighlight %}

We can then debug the `print_greeting` function with GDB by setting a breakpoint and executing the program as follows:

{% highlight linenos %}
$ gdb a.out
Reading symbols from a.out...

(gdb) break print_greeting
Breakpoint 1 at 0x115f: file hello_gdb.c, line 11.

(gdb) run
Starting program: /home/shane/a.out 

Breakpoint 1, print_greeting (greeting=0x555555556004 "Hello, world!") at hello_gdb.c:11
11        puts(greeting);
{% endhighlight %}
Printing a backtrace is accomplished with:

{% highlight linenos %}
(gdb) where
#0  print_greeting (greeting=0x555555556004 "Hello, world!") at hello_gdb.c:11
#1  0x000055555555514c in main () at hello_gdb.c:7
{% endhighlight %}

The other notable action is assigning variables and executing functions. For example, let's say we wanted to print out the value of a global variable or call another function with it:

{% highlight linenos %}
$ gdb a.out
Reading symbols from a.out...

(gdb) break main
Breakpoint 1 at 0x113d: file hello_gdb.c, line 7.

(gdb) run
Starting program: /home/shane/a.out 

Breakpoint 1, main () at hello_gdb.c:7
7         print_greeting(GREETING);

(gdb) call GREETING
$1 = 0x2004 "Hello, world!"

(gdb) call print_greeting(GREETING)
Hello, world!

(gdb) call print_greeting("Hello, GDB!")
Hello, GDB!
{% endhighlight %}

The output above demonstrates how `call` can be used to print the value of variables (or more accurately, memory locations such as the global variable `GREETING`). It can also, well, call functions directly and we can pass whatever arguments we want to them such as a new string rather than the `GREETING` string as defined in the source code of the program. Later on we'll use this functionality extensively to peer inside of a running Ruby program.

That should about do it for the basics of GDB. Let's get into the meat of exploring Ruby through GDB now.

## Getting a Ruby Backtrace

## Into the VM
