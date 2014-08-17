---
layout: post
title: Why did no one tell me about \x08?
date: 2013-06-20 23:33:38 -0700
---

For years I would occasionally run across a program that would display a little ASCII art rotating bar to show it was working and each time I wondered how it was writing to what I assumed was standard out, but replacing previously written characters. Not sure what I'm talking about? It's best to just show a video since I'm not sure there's a name for it.

<iframe src="https://www.youtube-nocookie.com/embed/3riWUqM9Cr0?rel=0" height="250" width="400" allowfullscreen="" frameborder="0"></iframe>

Part of the problem is that I didn't know what it was called so it made searching for it quite difficult. Of course, this type of effect can be achieved with Curses, but there's no need to bring in a big library for something that's so simple. Well, it all comes down to <code>\x08</code>. That's the C escape code for the backspace ASCII character (like hitting the backspace key on your keyboard); or if you prefer, <code>\b</code> will work just fine too. It does as its name implies, writes a backspace which removes the previous character from the stream it's written to. In this case, we can use it to print out a character, wait a little bit, backspace that character, and then print another in it's place and so on to achieve the effect above.

Here's a little C program to do just that put into the form of a nice function that would be useful in a real program. It would probably be better to put it in its own thread while the main thread does the work (or vice versa), but you get the point from the example below.

<!--more-->

{% highlight c linenos=table %}
#include <stdio.h>
#include <unistd.h>

void step(void);

int main(void) {
   printf("Doing something really hard...  ");
   while(1) {
      step();
      usleep(200 * 1000);
   }

   return 0;
}

void step(void) {
   static int step;

   if(step < 3) {
      step++;
   } else {
      step = 0;
   }

   printf("\b");
   switch(step) {
      case 0:
         printf("-");
         break;
      case 1:
         printf("/");
         break;
      case 2:
         printf("|");
         break;
      case 3:
         printf("\\");
         break;
   }
   fflush(stdout);
}

{% endhighlight %}

We can also display a progress bar.

![]({{ site.baseurl }}/assets/images/2013/06/progress.png)


Compile the following with <code>-std=c99</code>.

{% highlight c linenos=table %}
#include <stdio.h>
#include <unistd.h>

void step(void);

int main(void) {
    for(int i=0; i<=100; i++) {
        step();
        usleep(200 * 1000);
    }

    return 0;
}

void step(void) {
    static int pos = 0;

    for(int i=0; i<106; i++) {
        printf("\b");
    }

    printf("[");
    for(int i=0; i<100; i++) {
        if(i < pos) {
            printf("#");
        } else {
            printf(" ");
        }
    }
    printf("] %d%%", pos);
    fflush(stdout);
    pos++;
}

{% endhighlight %}

Simple. I just wish someone would have told me about it before!
