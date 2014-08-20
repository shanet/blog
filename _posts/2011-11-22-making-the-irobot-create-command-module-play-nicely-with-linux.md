---
layout: post
title: Making the iRobot Create Command Module Play Nicely with Linux
date: 2011-11-22
---

As a club project, the ACM recently bought an <a href="http://store.irobot.com/shop/index.jsp?categoryId=3311368">iRobot Create</a>. It comes with some software for programming in Windows, but, honestly, the GUI application that it comes with is junk. It barely works at all. Add that with the fact that it's a Windows application meant that I was on the hunt for making this guy work under Linux.

Well, a quick Google session later and I come across <a href="http://www.instructables.com/id/Using-the-iRobot-Create-s-Command-Module-with-Linu/">this wonderful Instructable</a>. However, I did have to jump through one more hoop to get it working than was in the guide. Thus, here's my whole version of getting the iRobot Create's command module to work in Linux.

<!--more-->

1.) I am writing this for Ubuntu and Fedora. If you are using another distro, you'll need to find the packages yourself or compile them yourself.

Install the following packages:

{% highlight text linenos=table %}
Ubuntu: sudo apt-get install avrdude avr-libc gcc-avr
Fedora: sudo yum install avrdude avr-gcc avr-gcc-c++

{% endhighlight %}

Remove this package or if it isn't installed, happily move on:

{% highlight text linenos=table %}
Ubuntu: sudo apt-get remove brltty
Fedora: sudo yum remove brltty

{% endhighlight %}

2.) Copy the input example from the CD that came with the iRobot Create or <a href="http://www.irobot.com/filelibrary/pdfs/hrd/create/CMexamples.zip">download all the examples from here</a>. Put it somewhere on your filesystem. <code>~/input</code> works fine.

3.) Inside the input directory, open the makefile and edit the following lines:

Line 86:

{% highlight text linenos=table %}
DEBUG = dwarf-2
DEBUG = stabs

{% endhighlight %}

Line 201: This is the change the Instrucable above does not contain. I was getting timeout errors without it.

{% highlight text linenos=table %}
AVRDUDE_PROGRAMMER = stk500
AVRDUDE_PROGRAMMER = stk500v1

{% endhighlight %}

Line 204:

{% highlight text linenos=table %}
AVRDUDE_PORT = com9
AVRDUDE_PORT = /dev/ttyUSB0

{% endhighlight %}

4.) Assuming you have make installed (you really should if you're reading this), simply run

{% highlight text linenos=table %}
make all

{% endhighlight %}

to build the project and

{% highlight text linenos=table %}
Ubuntu: make program
Fedora: sudo make program

{% endhighlight %}

to send it to the iRobot.

That's it! I'm sure I'll write more once I figure out how to actually write programs for this thing, but until then.
