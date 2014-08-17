---
layout: post
title: Adding New Drive to a RAID1 Array
date: 2012-05-08 15:41:36
---

Last week I finally bought a second HDD for my home directory so I could have some redundancy in case a drive fails. Lucky for me, I had the foresight to put the single drive I had been using on a RAID1 array all by its lonesome self way back when. After installing my new HDD, I found myself tasked with adding to the array. Simple, right? Yes, but with one caveat.

After installing and partitioning the drive properly, add it to the array with:

{% highlight text linenos=table %}
mdadm --add /dev/mdX /dev/sdXX

{% endhighlight %}

Since the array was only set up to have one drive, the new drive will get added as a spare. Check <code>/proc/mdstat</code> to confirm this...

{% highlight text linenos=table %}
md4: active raid1 sdb1[1](S) sda1[0]
   1953512312 blocks super 1.2[1/1][U]

{% endhighlight %}

This isn't what I want! Well, here's the catch: there's one more (very simple) step; grow the array to the new number of drives.

{% highlight text linenos=table %}
mdadm --grow /dev/mdX --raid-devices=Y

{% endhighlight %}

...where Y is the new number of drives. And now, to check <code>/proc/mdstat</code>:


{% highlight text linenos=table %}
md4 : active raid1 sdb1[1] sda1[0]
      1953512312 blocks super 1.2 [2/1] [U_]
      [>....................]  recovery =  2.1% (41879104/1953512312) finish=516.9min speed=61630K/sec

{% endhighlight %}

Perfect! The new drive is on equal playing field with the existing drive and is being brought up to speed with the data on the existing drive.

Ahh, data redundancy. :)
