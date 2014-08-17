---
layout: post
title: The trials and tribulations of finding a Linux media player
date: 2013-06-01 17:06:19 -0700
---

I've been using Linux as my primary desktop OS for roughly five years now and things have come a long way since my first experiences with Fedora 10 to my current Kubuntu 13.04 setup. One of the long term things about Linux that bugged me was the lack of a decent music player. Everything I used was either half-baked and full of bugs, had a confusing interface (I'm looking at you Amarok), or lacked the functionality any media player should have.

* 2008: iTunes running via Wine (lasted about a week)
* 2008: Songbird (until support for Linux was dropped)
* 2009-2010: Switching between Banshee and Rhythmbox when I got tired of dealing with the other's little quirks
* 2011-2012: <a href="http://www.clementine-player.org/">Clementine</a>
* 2013: <a href="http://www.musicpd.org/">MPD</a> with Cantata as the primary front-end

When I first switched from the Windows world, I tried to keep using iTunes with Wine since it was convenient to sync my then iPod video with, but most importantly because only iTunes could play the encrypted, DRM-protected music I had bought from the iTunes store. Thankfully the dark days of encrypted music are gone, but that was after I took on the task of stripping the DRM from all my music so I could use it with a native Linux client.

At the time, the closest software to iTunes for Linux was the Songbird project. Songbird had a very similar UI and had support for addons which made it, in my opinion, better than iTunes. However, this was around the time that the Songbird people decided to drop support for Linux in order to focus on Windows and OS X. Time for me to find a new music player.

For two years I switched back and forth between Banshee and Rhytmbox every few months or so hoping that one would have dramatically improved in that time so I could finally settle on a music player. This never happened. Rather, in 2011, I found Clementine, a fork of Amarok, but with a UI that made sense! Clementine had a few things that didn't make sense to me, like having to explicitly save a playlist after adding a song to it (it can't at least have the option to autosave?), but I did like the developer's sense of humor by adding a Nyan cat music visualizer and a hypnotoad sound.

<!--more-->

I happily used Clementine until a few months ago when I ran across a thread on reddit about media players on Linux. In the thread, it was clear that the most popular option was MPD, a program I had never heard of. The name, MPD, or music player daemon, is pretty descriptive of the program. A music player daemon, or basically a music server? Brilliant! There are plenty of front-ends for MPD, including command line programs, graphical programs, web interfaces, and mobile applications on Android and iOS. I could play a song from my desktop, walk into the other room and change the music from my phone? Sweet. Sure, this has been possible with other music players for a while, but the real different with MPD is just how many different clients there are. MPD itself works wonderfully so if you don't like a certain client, just switch to another one and all your music and playlists are right there. I think I finally found a media player on Linux, it's just a shame that I didn't find out about it earlier.

The only downside to MPD is that is requires a bit of configuration, but it wouldn't be a true Linux daemon if it didn't make you crack open a config file before you could use it. Fortunately, it's very well documented and a pretty painless process if you follow a guide, like<a href="https://help.ubuntu.com/community/MPD"> this one on the Ubuntu wiki</a> (protip: you'll probably want to follow the instructions to configure it as a user service).

After playing around with some MPD clients, I've settled on three for just about everything I need.

* <a href="https://code.google.com/p/cantata/">Cantata</a>: A desktop client. One of the best music player UIs I've used. Seriously, I love this program.
* <a href="http://ncmpcpp.rybczak.net/">NCMPCPP</a>: A command line client. It's a really confusing name, but if you like command line programs, like I occasionally do, this guy is awesome.
* <a href="https://play.google.com/store/apps/details?id=com.namelessdev.mpdroid&amp;hl=en">MPDroid</a>: Android client. Recently added a tablet UI making this the go-to Android app for MPD.

A small note about Cantata is enabling global media keys. I've found that getting media keys to work in just about any Linux media player is always an adventure. Media keys are described in <a href="https://code.google.com/p/cantata/issues/detail?id=188">this issue</a>, but what isn't made obvious is that in the shortcut options, there are three columns. For media keys to work globally (when Cantata doesn't have focus), you must set the shortcut in the "global" column. My usual lack of paying attention caused me to waste a good chunk of time trying to figure that out.

In conclusion, MPD is awesome. If you use Linux, but not MPD, give it a try.
