---
layout: post
title: ! 'libBiscuit: A simple iRobot Create C API'
date: 2013-04-15
---

For my senior design project at my university, my group and I decided to attempt to make a robot out of an iRobot Create, Windows tablet, and Kinect that would find a person and follow him or her around a room and allow the person to control the Create with gestures and speech recognition. We called all this <a href="https://github.com/shanet/asimov">Project Asimov</a>, and at the time of this writing, it's still under development. However, one of the first pieces of code that needed written was an API to more easily interface with the Create. Thus, after some experimentation and a thorough reading of the <a href="https://www.google.com/url?sa=t&amp;rct=j&amp;q=&amp;esrc=s&amp;source=web&amp;cd=3&amp;cad=rja&amp;ved=0CEQQFjAC&amp;url=http%3A%2F%2Fwww.irobot.com%2Ffilelibrary%2Fpdfs%2Fhrd%2Fcreate%2FCreate%2520Open%2520Interface_v2.pdf&amp;ei=xWReUb3SCrGl4AOn7YH4BQ&amp;usg=AFQjCNHKJUHtUTtpU5s1N9CGJtZo-oWy-g&amp;sig2=jvx-Pt8xSSLUX5Hk-oMQSQ&amp;bvm=bv.44770516,d.dmg">Create Open Interface</a>, I had a working API written in C called libBiscuit. Why? Because the Create sort of looks like a biscuit and I like biscuits.

Anyway, first up, all the code is <a href="https://github.com/shanet/libbiscuit#readme">open source and on GitHub</a> under the LGPL. Moreover, a quick overview of the functions, compiling instructions, and basic usage are in the <a href="https://github.com/shanet/libbiscuit/blob/master/README.md">README in the GitHub repo</a> so I won't repeat all that here.  However, here's a short example program that uses libbiscuit to control the Create.

<!--more-->

{% highlight c linenos=table %}
#include <stdio.h>
#include <stdlib.h>

#include "bisc.h"

int main(void) {
   // Connect to the Create
   // This should always be the first API function called
   if(biscInit("/dev/ttyUSB0") !=  BISC_SUCCESS) {
      fprintf(stderr, "Could not connect to the Create.\n");
      return 1;
   }

   // Change to full mode
   biscChangeMode(BISC_MODE_FULL);

   // Drive forward 2.5 meters at half the max speed
   biscDriveDistanceStraight(BISC_DRIVE_FORWARD_HALF_SPEED, 2.5 * 1000);

   // Turn right 90 degrees CW at half the max speed
   // Actually turn a little less than 90 degrees since the Create tends
   // to overshoot angles slightly when already moving
   biscSpinAngle(BISC_DRIVE_FORWARD_HALF_SPEED, -78);

   // Drive forward 3.75 meters at half the max speed
   biscDriveDistanceStraight(BISC_DRIVE_FORWARD_HALF_SPEED, 3.75 * 1000);

   // Spin 360 degrees CCW at half the max speed
   biscSpinAngle(BISC_DRIVE_FORWARD_HALF_SPEED, -355);

   // Drive backward 2.5 meters at the max speed
   biscDriveDistanceStraight(BISC_DRIVE_BACKWARD_FULL_SPEED, -2.5 * 1000);

   // Flash the advance LED 5 times for 500ms each time
   biscFlashLed(BISC_ADVANCE_LED, 5, 500);

   // Play a song!
   // Such a long song is a lot of commands that seem to confused the Create.
   // Sleep until the above commands are finished before sending the commands to
   // play the song.
   sleep(35);
   biscPlayFireflies();

   // Disconnect from the Create
   biscDisconnect();

   return 0;
}

{% endhighlight %}

And here it is in action:

<iframe src="https://www.youtube-nocookie.com/embed/74a_waN9Oi8" height="315" width="500" allowfullscreen="" frameborder="0"></iframe>
