---
layout: post
title: Clean Solutions with Maps in JavaScript
date: 2011-10-10
---

Tonight I was faced with writing a function for the chemistry applets I work on that returned the proper cutoff value (the size of an atomic orbital) for a given orbital at a given probability percentage of something with  the electrons in an atomic orbital. Let's be honest here, I don't understand much of the chemistry behind what I'm doing. I just know enough to code everything, but I'm quickly learning and understanding it all more and more!

So basically, I had 45 numbers to match to a given input. At first, I threw all the cutoff values in an array and started writing a complex series of nested if and switch statements to return the correct value. But quickly I realized that there was a much better way to do this. Why not use a map?  I never get to use maps and I want to use one! The code is pretty straightforward so let's jump right in and then explain it.

<!--more-->

{% highlight javascript linenos %}
function getGhostCutoff(percent) {
    // In the map below, the first number is the N value, the second is L and the third is the percent with 5
    // corresponding to 50%, 0 90%, and 9 95%.
    var cutoffs = {/*1s*/"105": 0.23, "100": 0.07, "109": 0.035,

                   /*2s*/"205": 0.038, "200": 0.014, "209": 0.0101,   /*2p*/"215": 0.085, "210": 0.026, "219": 0.018,

                   /*3s*/"305": 0.0119, "300": 0.0048, "309": 0.0034, /*3p*/"315": 0.021, "310": 0.009, "319": 0.005,
                   /*3d*/"325": 0.032, "320": 0.0015, "329": 0.0081,

                   /*4s*/"405": 0.0052, "400": 0.00235, "409": 0.0017, /*4p*/"415": 0.00945, "410": 0.0042, "419": 0.0029,
                   /*4d*/"425": 0.0119, "420": 0.005, "429": 0.0034, /*4f*/"435": 0.016, "430": 0.0063, "439": 0.0021,

                   /*5s*/"505": 0.0034, "500": 0.0034, "509": 0.0034, /*5p*/"515": 0.0034, "510": 0.0034, "519": 0.0034,
                   /*5d*/"525": 0.0034, "520": 0.0034, "529": 0.0034, /*5f*/"535": 0.0034, "530": 0.0034, "539":0.0034,
                   /*5g*/"545":0.0034, "540": 0.0034, "549": 0.0034};

    var key = jmolGetN() + jmolGetL();

    // 7 = 50%, 8 = 90%, 9 = 95%
    switch(percent) {
        case 7:
            key = key + "5";
            break;
        case 8:
            key = key + "0";
            break;
        case 9:
            key = key + "9";
            break;
        default:
            return -1;
    }

    return cutoffs[key];
}

{% endhighlight %}

It's easy to see right off the bat that this is a much cleaner solution that using an array, or even a linked list for that matter. First off, let's understand a little about atomic orbitals. Each comprises of 3 numbers: N, L, and M. In this case, the cutoff only depends on the N and L value and the percent. The percent is selected by the user on the UI and the numbers 7, 8, and 9 correspond to 50%, 90%, and 95% respectively. Why 7-9, I'm not entirely sure. The function that these come from was written by someone else on my team so I'm above that level of abstraction on that one.

Regardless, we use these three numbers to generate a unique key for the map. The key is very simple (going along with the <a title="Keep it simple, stupid!" href="http://en.wikipedia.org/wiki/KISS_principle">KISS principle</a>). The first number is the N value, the second, the L value, and the third is the percentage with 5 corresponding to 50%, 0 to 90%, and 9, 95%.

With the key generated and the map ready to go, all we have to do is take advantage of the data structure choice here and return the value the map maps the key to and that's all! Another perfect example of how choosing smart data structures and dumb code is far superior than choosing dumb data structures and smart (read: complex and and error prone) code.
