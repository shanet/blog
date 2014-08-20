---
layout: post
title: Why it's a bad idea to have duplicate MAC addresses on a LAN
date: 2012-12-30
---

I've been using some of my time during winter break to wrap up my <a href="https://github.com/shanet/RelayRemote">RelayRemote</a> project. Without going into much detail, RelayRemote is a small project I started which allows control of an electrical relay though an Arduino server from an Android or C client over a network. I originally started the project with one Arduino and one relay, but after having a rough proof of concept working I decided to add support for multiple servers so I bought another Arduino and another relay. When I was working with only one Arduino, communicating with it over the network from my Android app was nearly instantaneous (less than a second). However, when I added a second Arduino to the mix, things became very slow; less than a second to &gt; 15 seconds. The Arduino's had different IP addresses and did work, just very slowly so what was slowing things down?

The answer is in the title of this post, but let's pretend otherwise for a moment. I started trying to track down what was causing the slow down. First up, I used bash to time how long it took my C client on my computer to send a message to one of the Arduinos. In this case, I was asking the state of the pins on the Arduino.

<!--more-->

{% highlight text linenos=table %}
$ time ./c_client --check 10.10.10.30; time ./c_client --check 10.10.10.30
Pin 9: ON

real    0m0.003s
user    0m0.000s
sys     0m0.000s

Pin 9: ON

real    0m0.003s
user    0m0.000s
sys     0m0.000s

{% endhighlight %}

.003 seconds. That's the same speed I was experiencing with only one Arduino. So let's try the second Arduino.

{% highlight text linenos=table %}
$ time ./c_client --check 10.10.10.31; time ./c_client --check 10.10.10.31
Pin 9: OFF

real    0m15.037s
user    0m0.000s
sys     0m0.000s

Pin 9: OFF

real    0m0.003s
user    0m0.000s
sys     0m0.000s

{% endhighlight %}

There it is. 15 seconds and then back down to .003 seconds. If I checked this Arduino again, it was consistently near .003 seconds each time. But if I checked the first Arduino again...

{% highlight text linenos=table %}
$ time ./c_client --check 10.10.10.30; time ./c_client --check 10.10.10.31
Pin 9: ON

real    0m15.033s
user    0m0.000s
sys     0m0.000s

Pin 9: OFF

real    0m15.024s
user    0m0.000s
sys     0m0.004s

{% endhighlight %}

15 seconds again. Everytime I switched servers, there was a huge latency spike.

Upon firing up Wireshark and watching exactly what data was being sent down the wire I saw that when switching servers, the data I wanted sent to the server was being sent 5 times before the server would respond, whereas with consecutive connections to the same server, it responded immediately to the request from my computer. But then I saw the Ethernet frame info of the packets in Wireshark and the MAC address source and destination fields and it dawned on me that the MAC addresses were the same for the Arduinos so the switch was confused which Arduino to send the data to. The problem was that when I got the second Arduino, I didn't pay enough attention and only changed the IP address in the sketch uploaded to it and not the MAC. So now both Arduinos were reporting the same MAC address, which is a big problem. The offending code:

{% highlight c++ linenos=table %}
// IMPORTANT: The IP AND MAC MUST BE CHANGED to something unique for each Arduino.
// The gateway will probably need changed as well.
byte ip[]      = {10, 10, 10, 31};
byte mac[]     = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE};
byte gateway[] = {10, 10, 10, 1};
byte subnet[]  = {255, 255, 255, 0};

{% endhighlight %}

Since this is an open source project, I didn't want anyone else to fall into the same pitfall so a nice big comment now accompanies the IP and MAC definitions.

Now I was left with the question of why did this happen? Why was there such a huge latency spike and then everything was seemingly okay again? I'm not a network expert by any means so I had to read a little more into how Ethernet works and the role of MAC addresses.  In short, it turns out that switches keep track of what MAC addresses are connected to what ports in a MAC address table. When I sent a request to one of the servers the switch happily looked at the table and routed the data properly. Each consecutive connection to the same server was routed properly as well. But then, when I wanted to talk to the other server, the switch had to rebuild the MAC table so that the data would get sent to the right place. This happened each time I switched servers and was the source of the huge latency spike.

Lesson learned the hard way: Make sure your MACs are unique.
