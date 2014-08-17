---
layout: post
title: Android 3.x and 4.x NumberPicker Example
date: 2011-12-26 21:45:11 -0800
---

I was working on a new, yet to be released, Android app that necessitated the need for the new <a title="NumberPicker" href="http://developer.android.com/reference/android/widget/NumberPicker.html">NumberPicker</a> widget introduced in Android 3.0. Unfortunately, there are almost no examples of its use floating around and the documentation in the Android API is extremely lacking. Thus, I spent a few hours of trial and error figuring out how it worked.

My goal: Use a NumberPicker to allow a user to select a multiple of 5 in the range 0-100.

First up: The XML.

{% highlight xml linenos=table %}
<NumberPicker android:id="@+id/np"
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"
   android:width="100dip"/>

{% endhighlight %}


The XML for our NumberPicker looks very similar to any other Android widget. By default the NumberPicker is set up for displaying two digit numbers, but our last number in this case, 100, is three digits. Hence, the leading 1 in 100 will be cutoff and only 00 is displayed in the NumberPicker. To remedy this, the width is set to 100dip which is wide enough to allow for three digit numbers.

Because of the lack of XML properties for the NumberPicker, we must do all of the configuration for it in code. Speaking of which...

<!--more-->

{% highlight java linenos=table %}
NumberPicker np = (NumberPicker) findViewById(R.id.np);
np.setMaxValue(100);
np.setMinValue(0);

{% endhighlight %}

This will set up our NumberPicker to display all the numbers between 0-100, but I want the multiples of 5 between 0-100. We need to make use of the <code>setDisplayedValues()</code> function. Unfortunately, the documentation for this function is virtually non-existent, but here's what I figured out: Think of the max and min values we just set in the NumberPicker as indices in an array. By default, the NumberPicker displays the index number, but <code>setDisplayedValues()</code> displays the value in the index of the corresponding array passed in <code>setDisplayedValues()</code> rather than the actual index number.

But first, we need a an array containing the multiples of 5 from 0-100. Sure, hard coding these numbers would be fine, but that's no fun. Let's use a quick loop.

{% highlight java linenos=table %}
String[] nums = new String[21];

for(int i=0; i<nums.length; i++)
   nums[i] = Integer.toString(i*5);

{% endhighlight %}

This quickly gives us the multiples of 5 between 0-100 without wasting loop iterations with an if and mod statement.

Onto the NumberPicker. We need to make a few changes.

{% highlight java linenos=table %}
NumberPicker np = (NumberPicker) findViewById(R.id.np);
np.setMaxValue(nums.length-1);
np.setMinValue(0);
np.setWrapSelectorWheel(false);
np.setDisplayedValues(nums);

{% endhighlight %}

First and foremost, <strong>the max value is not 100 anymore</strong>. It is now the length of the numbers array minus 1. This is because we have to treat the max value as the number of elements in an internal array. It should be the length of our numbers array minus 1. Naturally, we also call <code>setDisplayedValues()</code> and pass the numbers array as the argument.

As a side note, <code>setWrapSelectorWheel</code> allows/disallows consecutive scrolling through the NumberPicker; something not desirable in the app I'm working on so I disabled it.

<strong><a href="{{ site.baseurl }}/assets/demos/NumberPickerDemo.zip">Here's a simple example app.</a></strong>
