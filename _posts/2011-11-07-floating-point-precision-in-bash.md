---
layout: post
title: Floating Point Precision in Bash
date: 2011-11-07
---

I wanted to add a timer to my <a href="https://github.com/shanet/Linux-Compile-Script">Linux compile script </a>so I could see how it took to compile the kernel. However, Bash does not support floating point precision. Now seeing as kernel compiles take some time this shouldn't matter. I could use the <code>date</code> command to get the hour, minute, and second before and after the compile and subtract them, adjust for difference in hours, days, etc. This way I wouldn't need any type of precision. But that's a lot of work, and I want to know <em>exactly</em> how long it took; not rounded to the nearest minute.

Rather, why not just get the seconds from 1970 before and after the compile, subtract the two, and divide by 60? Much easier! Except, I need floating point precision. The solution: the <code>bc</code> program. It’s like a command line calculator that supports all the precision I could ever need. Let’s take a look:

<!--more-->

{% highlight bash linenos %}
START=$(date +%s)

# Do something
sleep 75

echo -n "Command took "
echo -n "scale=3;  ($(date +%s) - $START) / 60" | bc
echo " minutes."

{% endhighlight %}

Where <code>scale=3</code> is the number of decimal points to use. And that's much cleaner than worrying about the day and hour differences.

The only difference in my kernel compile script is that instead of a sleep command, there's a make command to build the kernel.

<a href="https://github.com/shanet/Linux-Compile-Script">Full source is available on GitHub.</a>
