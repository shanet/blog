---
layout: post
title: Hey Google, what happened to all the fun?
description: How Google killed a 14 year old Android app.
date: 2024-07-11
---

This is the story of how Google killed a 14 year old Android app overnight.

2008 was a time when the web had mostly become ubiquitous but still before most people carried it all with them in their pocket on a smartphone. For me, a high school student at the time without a smartphone, my programming classes were the only times during the school day where I could access the internet in a school computer lab. These short periods during the day were often filled writing programs of various computer science fundamentals for my classwork but, of course, there was also a healthy amount of screwing around on the heavily filtered internet we were allowed access to.

It was in one of these computer labs that a fellow student directed me to a website with quite literal domain, [isittuesday.com](https://web.archive.org/web/20090628222845/http://isittuesday.com/). It was exactly what it sounded like, a large "Yes!" or "No." displayed on the page if it was Tuesday and, well, that's it. It was the sort of random website that you'd snicker at, send to your friends on AOL Instant Messenger for the next person to snicker at, and move on to the next thing that caught your brief interest.

For those of us that grew up during this time, the web was still a fairly decentralized place. Terms like "Web 2.0" and "the blogosphere" abounded. The social media giants we know today were becoming established, but the web did not revolve around them just yet. But I am hardly the first person to express nostalgia for this era. So what?

<!--more-->

![](https://imgs.xkcd.com/comics/interblag.png)
<sub>Credit: [xkcd](https://xkcd.com/181/)</sub>

Well, silly websites like *Is It Tuesday?* exemplified people having fun with the web. There was no monetization, no data collection, no purpose to it other than to put smiles on faces. Instead of the infinitely scrolling, ad-infested feeds of proprietary smartphone apps like we have today, browser extensions like [StumbleUpon](https://en.wikipedia.org/wiki/StumbleUpon) and websites like [The Useless Web](https://theuselessweb.com/) were excellent ways to entertain one's self or waste time.

Fast forward two years to 2010. Smartphones were becoming the norm. I myself received my first Android phone that year, a Motorola Droid, and became fascinated at what could now be done on my phone. The Google Play Store, or Android Market as it was known at the time, was starting to fill up with all sorts of apps. From the useful like SSH clients to the useless like [Staples Easy Button](https://www.youtube.com/watch?v=kMPF-XMyN7g) simulators.

![](/assets/images/2024/07/droid.png)
<sub>The only screenshot I have from my first Android phone and all the weird apps I had installed.</sub>

Naturally I wanted to put my own app up on the Android Market. It helped that most of my limited programming background as a then high school student was in Java so it made it relatively easy to start writing Android apps. After some brainstorming about a simple first app to write, that *Is It Tuesday?* website from years ago came to mind. I went about implementing it, which took about an hour since, as you can guess, is pretty darn simple. In fact, spoiler alert, here's basically the entire app:

{% highlight java linenos %}
public class main extends Activity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.main);
    setLabel();
  }

  @Override
  protected void onStart() {
    super.onStart();
    setLabel();
  }

  @Override
  protected void onResume() {
    super.onResume();
    setLabel();
  }

  private void setLabel() {
    Calendar cal = Calendar.getInstance();
    TextView textView = (TextView) findViewById(R.id.label);

    if(cal.get(Calendar.DAY_OF_WEEK) == Calendar.TUESDAY) {
      textView.setText(R.string.yes);
    } else {
      textView.setText(R.string.no);
    }
  }
}
{% endhighlight %}

<sub>Fun fact: This app did have a bug initially. At first I did not implement `onResume()`. So if the app was opened on a Monday, sent to the background, but not fully closed, and then opened again the next day, it would still display "No" rather than "Yes" on a Tuesday. How awful!</sub>

This was also the time that publishing an app to the Android Market was quite easy. Google was eager to differentiate themselves from how Apple was handling their App Store. It was free to publish an app and there was no explicit approval process gatekeeping the way. You made a developer account, filled out a basic form, uploaded an APK, and you were live. Or at least that's how I remember it&mdash;it was simple enough for a high school student with a rudimentary programming background to figure out.

And thus, on February 9th 2010 my first app went live. For someone still in high school this was actually an exciting moment in my life. It was the first time that software I wrote was being distributed to users, to people other than me and my teachers at school, to run on hardware that was not mine. And wouldn't you know it: [14 years later, it's still there!](https://play.google.com/store/apps/details?id=com.S201.tuesday&hl=en_US) You can even still install it for the time being if you're so inclined.

![](/assets/images/2024/07/is_it_tuesday_listing.png)

I told some friends about it, but otherwise there was no marketing or advertising. Still, I could see from the downloads metrics that people were installing it for some reason. Then the reviews started coming in.

![](/assets/images/2024/07/is_it_tuesday_reviews_1.png)

Of course, these were people having just as much fun with the reviews as they did with the app similar to the reviews for the [Three Wolf Moon](https://en.wikipedia.org/wiki/Three_Wolf_Moon) shirt on Amazon around the same time.

So yes, the whole app was entirely pointless, it was silly, it was useless. But it made people smile and the reviews some of those people left made other people smile. In short, it was fun.

For years I would occasionally check in on it to read the reviews myself and get a chuckle out of the things that people would write. But beyond that, it was just a silly app I published years prior that obviously did not require much upkeep. At one point I went about seven years without updating it:

![](/assets/images/2024/07/is_it_tuesday_reviews_2.png)

As everything in the world does though, time moved on and the Android ecosystem evolved. The Android Market became the Play Store and the requirements for publishing apps increased as Google sought to wrangle back control of the Android platform from the open nature it was founded on. I had noticed that the app was so old that it was not showing up in the search results for newer Android devices due to being built with such an early API version.

In recent years I would occasionally update it just to bump the target SDK version. Google started requiring developers to fill out disclosure forms for things like health data collection, user age verifications, etc. I even had to create a [privacy policy website](https://sites.google.com/view/isittuesday/home) just to state that the app did not collect any information. The hoops to jump through became numerous enough that I thought of no longer updating it and letting it fade into the ether. But each time I ended up rolling my eyes at whatever new requirement Google added and complying with it to keep the app alive. After all, it was fun and at this point I was motivated to keep the streak alive since it had been on the Play Store since nearly it's inception.

Then on July 8th 2024 I received an email stating that I needed to update the target SDK version before the end of August to keep the app published. While the code of the app hadn't changed since 2010, I had been updating it to work with the current Android build tools so bumping the the target SDK version and compiling a new APK binary was no big deal, I thought.

![](/assets/images/2024/07/is_it_tuesday_sdk_alert.png)

Unfortunately, now, unlike in 2010, all Android app updates now have to go through an approval process. In the past this hadn't been an issue. Google would do whatever they did for this approval process and *Is It Tuesday?* would be updated within a day. However, this time I woke up the next day to an email stating that my app update had been rejected because it was in violation of the "Minimum Functionality policy."

![](/assets/images/2024/07/is_it_tuesday_rejection.png)

In other words, despite being on the Android store for 14 years and going through this approval process multiple times in recent years, Google suddenly decided that the app doesn't have enough functionality to be allowed on their store anymore. I submitted an appeal explaining that the seeming lack of functionality was the whole point, that it was a "just for fun" app, and that adding whatever extra functionality to make Google's reviewers happy would defeat the purpose of the app. I wasn't expecting anything from this since these "appeal" processes are essentially just lip service. Unexpectedly, later that day I received an email saying that my appeal was denied.

![](/assets/images/2024/07/is_it_tuesday_appeal_rejection.png)

I should mention here that I find it ironic Google decided my app lacked any useful functionality and blocked it from being updated while simultaneously leaving up the existing version of the app with that same supposed lack of functionality. Huh?!

So&hellip; I guess that's it. The almightly Google has decided that after 14 years this app no longer deserves to be on their platform. Since I cannot update the target SDK version, as of the August 31st deadline it will disappear from the Play Store. There's nothing I can do having exhausted the "appeal" process and being unable to comply with whatever the "minimum functionality policy" entails as it would ruin the absurd humor of the app.

Maybe you agree with Google here. After all, why would you want an app store to be full of junk/spam apps that don't do anything? Putting aside that the app stores are already full of junk apps, I do have sympathy for that argument since no one likes sifting through an ocean of spam. But it's here that we get to the point of this blog post: This wasn't an app that did nothing and had no value. Yes, it was simple and it was stupid, I'll be the first person to admit that. But it made people laugh and that alone creates value, lack of complex functionality be damned. This is the concept that Google is missing. That these "useless" apps aren't useless. They can be fun and at least some people enjoy them. The reviews alone clearly prove that.

However, this gets to the even larger issue here. It's easy to understand why so many are attracted to the siren call of these platforms from the large tech companies: they're built out, they scale, and they have a huge audience you want/need access to. But when you build your business or your livelihood on top of one of these platforms you are ceding your control and your freedom to them. You are essentially signing up to be an employee of sorts with no protections. Whether it be an Uber/Lyft driver, a YouTube/TikTok creator, an app developer, etc.; the company decides to remove you from the platform for any trivial reason, or no reason at all, and you're done with no recourse, with no one to even make your case to other than maybe some textarea in an "appeal" form submitting to some anonymous person that you know won't change anything. This isn't unlike a traditional job, of course, where you can be terminated or laid off for no reason out of the blue, but unlike a traditional job there's little to no transferability of your work/skills to another platform/employer, if there even is one, and no legal protections since you were never a true employee or even an independent contractor in the first place. You were just another cog that the machine chewed up, spat out, and happily kept chugging along without.

Now this is just a little trivial app so perhaps I'm being melodramatic here. After all, I'm not exactly losing sleep over any of this beyond writing what is essentially a post-mortem for an app that I probably feel a little too connected to given it's death represents an era of the internet that I have a lot of nostalgia for. This experience does, however, serve to strengthen my long standing resolve that the free web (independent web servers outside the control of these large tech companies) remains the most open, free (as in freedom), and versatile distribution channel for software and information. Call me overly principled, naive, or idealistic but software freedom is the hill that I will die on.

What's left for *Is It Tuesday?* then? I may try to get it published on [Fdroid](https://f-droid.org/en/). Otherwise, while the original isittuesday.com website I remember appears to have gone down in 2009, it looks like someone has taken up the mantle with [http://isittuesday.co.uk](http://isittuesday.co.uk). The joke will live on even without Google's approval.

The real kicker here is that a similar app is present on the [Apple App Store](https://apps.apple.com/us/app/is-it-tuesday/id525278448). I guess that means Apple is the more fun one now, Google.
