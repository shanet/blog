---
layout: post
title: Simulating Mediakey Presses in C & X11
date: 2012-07-12 00:42:19
---

As you're not aware, a few months ago I wrote a simple server/client for changing Alsa volumes from another computer, or an Android phone. I've been extremely slowly working on adding encryption to it, but unfortunately, jobs and school come before hacking away at projects. Regardless, one downfall of the project has always been that I could change the volume, but I couldn't play/pause music. All the programs I've seen to do this have been media player plugins that are, obviously, specific to that media player only. As someone that changes media players somewhat frequently I didn't want to go down the road of writing a plugin for one player. Then it hit me, why not have my server simulate media key presses from the keyboard in X11? This would work for any media player that supported media keys and since I already have the server written, it's only a matter of modifying the protocol to accept more commands and add a function to simulate  key presses. However, first I needed to figure out how to simulate key presses. It turns out it's very easy. Let's jump right into the code.

<!--more-->

{% highlight c linenos=table %}
unsigned int key;
unsigned int keycode;

// Connect to X
Display *display;
display = XOpenDisplay(NULL);

// Get the keycode
keycode = XKeysymToKeycode(display, key);
printf("Simulating keycode %d press\n", keycode);

// Simulate the keypress
XTestFakeKeyEvent(display, keycode, 1, 0);
// Release the key
XTestFakeKeyEvent(display, keycode, 0, 0);

// Clear the X buffer which actually sends the key press
XFlush(display);

// Disconnect from X
XCloseDisplay(display);

{% endhighlight %}

Short and to the point; I love it. I'll leave it to you to look up the documentation for the X functions if necessary, but they should be pretty straightforward. First, we connect to X via <code>XOpenDisplay()</code>. Now, since there are tons of keyboards out there, we have no idea which keycode the play/pause key is connected to it so we use <code>XKeysymToKeycode()</code> to look it up. Its second parameter is the key we want to get the key code for. For more "normal" keys you would do <code>#include &lt;X11/keysym.h&gt;</code>, but that file doesn't have the media keys defined in it! So we need to determine them experimentally.

The easiest way to determine a key symbol is the <code>xev</code> program (on Ubuntu: <code>sudo apt-get install x11-utils</code>).  Upon running xev and pressing the media key we want we get output such as:


{% highlight text linenos=table %}
KeyPress event, serial 35, synthetic NO, window 0x3a00001,
    root 0xed, subw 0x0, time 2453567526, (1306,520), root:(4908,543),
    state 0x0, keycode 172 (keysym 0x1008ff14, XF86AudioPlay), same_screen YES,
    XLookupString gives 0 bytes:
    XmbLookupString gives 0 bytes:
    XFilterEvent returns: False

{% endhighlight %}

Look at that, there's the key symbol we need: "0x1008ff14". This also gives us the keycode, 172, and the key name, <code>XF86AudioPlay</code>, but remember, the whole purpose of this was to determine the key symbol because the key code may vary.

Using the same method, I also determined the previous, next, and stop key symbols. Now we can just <code>#define</code> in our code as such:


{% highlight c linenos=table %}
#define XF86AudioPlay 0x1008ff14
#define XF86AudioNext 0x1008ff17
#define XF86AudioPrev 0x1008ff16
#define XF86AudioStop 0x1008ff15

{% endhighlight %}

So we have everything we need to simulate a key press. Let's write a quick and dirty program to test it out for us. Putting everything together and adding some simple command line parsing:


{% highlight c linenos=table %}
#include <stdio.h>
#include <string.h>

#include <X11/Xlib.h>
#include <X11/extensions/XTest.h>

#define XF86AudioPlay 0x1008ff14
#define XF86AudioNext 0x1008ff17
#define XF86AudioPrev 0x1008ff16
#define XF86AudioStop 0x1008ff15

int main(int argc, char **argv) {
    unsigned int key;
    unsigned int keycode;

    // Ensure we have an argument
    if(argc != 2) return 1;

    // Determine what key to simulate
    if(strcmp(argv[1], "play") == 0 || strcmp(argv[1], "pause") == 0) {
        key = XF86AudioPlay;
    } else if(strcmp(argv[1], "stop") == 0) {
        key = XF86AudioStop;
    } else if(strcmp(argv[1], "next") == 0) {
        key = XF86AudioNext;
    } else if(strcmp(argv[1], "prev") == 0) {
        key = XF86AudioPrev;
    } else {
        return 1;
    }

    // Connect to X
    Display *display;
    display = XOpenDisplay(NULL);

    // Get the keycode
    keycode = XKeysymToKeycode(display, key);
    printf("Simulating keycode %d press\n", keycode);

    // Simulate the keypress
    XTestFakeKeyEvent(display, keycode, 1, 0);
    // Release the key
    XTestFakeKeyEvent(display, keycode, 0, 0);

    // Clear the X buffer which actually sends the key press
    XFlush(display);

    // Disconnect from X
    XCloseDisplay(display);

    return 0;
}

{% endhighlight %}

And to compile it (note the two X libraries being linked):

{% highlight text linenos=table %}
gcc -Wall -Wextra -o mm mm.c -lX11 -lXtst

{% endhighlight %}

That's all there is to it. Depending on your setup, you should be able to skip over the process of figuring out the key symbols and just copy and paste the ones I'm using. Next goal with this code: implement it in my Alsa control server. Maybe a change of name is in order too; it's more than just a Alsa control server now.
