---
layout: post
title: ! 'Asimov: Building an interactive robot with an iRobot Create and a Kinect'
date: 2013-05-25 02:22:47
---

The CS program at my university requires all students to complete a group project of their choosing during the required software engineering course known as the senior design project to the wider college of engineering. My group consisted of 5 people with the goal of using an iRobot Create (like a Roomba, but without the vacuum) and a Microsoft Kinect to create a robot that would take gesture and voice commands and follow or avoid a person. The finished product looked as such:

![]({{ site.baseurl }}/assets/images/2013/05/IMG_20130425_135732.jpg)

From a hardware point of view, the robot consisted of three major components. On the bottom is the iRobot Create and sitting on top of it was a Windows 8 tablet used and a Kinect. The Kinect talked to the tablet which ran our software to interpret the data from the Kinect and then send the appropriate commands to the Create. Therefore, the resulting software stack was as follows:

<!--more-->

![]({{ site.baseurl }}/assets/images/2013/05/Untitled-1.png)

Deciding to go with a client/server model gave us a few advantages.

1. It provided the possibility to easily extend the project to forms of control such as remotes running on a phone or tablet not attached to the robot.
1. We could also have easily implemented the ability for multiple robots to interact with one another.
1. We were able to implement the API in C, while using C# to interact with the Kinect SDK.
1. It provided a natural separation between components that allowed us to divide the work within the group more easily.

On my end, I worked on creating the Create API called <a title="libBiscuit: A simple iRobot Create C API" href="https://github.com/shanet/libbiscuit">libBiscuit</a> and the server (including defining a protocol for communication between the client and server). I discussed libBiscuit extensively in <a title="libBiscuit: A simple iRobot Create C API" href="{% post_url 2013-04-15-libbiscuit-a-simple-irobot-create-c-api %}">my blog post about it</a> so I won't write about it here. Three other group members took on the task of interacting with the Kinect and writing the client. They got creative and added several modes in addition to the voice and gesture commands. They are:

* Follow mode: Asimov follows a person around
* Avoid mode: Asimov avoids a person
* Center mode: Asimov turns to look at person as he or she moves around
* Drinking mode: Users sit in a circle and Asimov drives around inside the circle carrying a shot glass. When Asimov stops, the person closest to it must take the shot. Okay, so we didn't have time to implement this, but it would have been a lot of fun to test!

Below is a video of Asimov in testing (and being held together with rubber bands!)

<iframe src="https://www.youtube-nocookie.com/embed/IBxRhdY6FUQ?rel=0" height="315" width="560" allowfullscreen="" frameborder="0"></iframe>

<a href="https://github.com/shanet/asimov">All the code is open source and on GitHub.</a>
