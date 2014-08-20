---
layout: post
title: ! 'Android 3.0 ActionBar Class: Maintaining Compatibility with Pre-Android
  3.0 Apps'
date: 2011-10-05
---

My goal for version 2 of the <a title="Shamless plug" href="https://market.android.com/details?id=com.S201.Fng&amp;feature=search_result">Fake Name Generator app</a> was to have a single APK that ran on Android 3.0 and Android 1.6-2.3 while being optimized for tablets. While the <a title="Incredibly useful!" href="http://developer.android.com/sdk/compatibility-library.html">Android Compatibility Package</a> allowed me to use the <a href="http://android-developers.blogspot.com/2011/02/android-30-fragments-api.html">Fragments API</a> on pre-3.0 versions of Android, it does not provide support for the ActionBar class. The ActionBar is paramount to having an app properly optimized for tablets! Thus, I had to get creative.

The problem: How to instantiate an object in Android 3.* that doesn't exist on pre-Android 3.0 in an APK that will run on both pre-3.0 and 3.*?

The answer, as it turns out, is not very straightforward.

But wait, won't a catch-able exception just be thrown if an class isn't found? Nope. An exception is thrown, but it is not able to be caught. Why? Because of the <a title="Ohh, yeah, of course!" href="http://en.wikipedia.org/wiki/Java_Virtual_Machine#Bytecode_verifier">Bytecode Verifier</a> of course! Basically, the bytecode verifier is going to check if all the necessary classes exist before it tries to instantiate and object from a class. Normally, code that references a non-existent class wouldn't even compile. However, the build target here is Android 3.0, where the <code>ActionBar</code> class does exist. But when it's run on Android 2.3 and lower, well, uh oh, or more formally, a <code>VerifyError</code> is thrown, which we can't catch.

So, how to solve it? Well, we need to make a wrapper class that checks if the <code>ActionBar</code> class is available in a static initializer and throws an exception that we can catch if it is not.

Let's take a look at aptly-named <code>ActionBarWrapper</code> class to start.

<!--more-->

Remember, we can't instantiate anything, so we need to use a static initializer to check if the <code>ActionBar</code> class is available. Thus, we need a static method to force the static initializer to be called. If you're unfamiliar with static initializers, <a title="Hooray for documentation!" href="http://download.oracle.com/javase/tutorial/java/javaOO/initial.html">read up</a>. Essentially, all this needs to be is an empty static method. As long as it is called, the static initializer will be called and that's the target. So:

{% highlight java linenos=table %}
public static void isAvailable() {}

{% endhighlight %}

And that's all!

Now, for the meat of the class, the static initializer.

{% highlight java linenos=table %}
static {
   try {
      Class.forName("android.app.ActionBar");
   } catch (Exception e) {
      throw new RuntimeException(e);
   }
}

{% endhighlight %}

It is relatively simple. Use the <code>Class.forName()</code> function to check if the <code>ActionBar</code> class, <code>android.app.ActionBar</code>, exists. If it does, don't do anything. If it doesn't, throw a <code>RuntimeException</code> which lets the calling class know that the <code>ActionBar</code> class is not available.

Speaking of the calling class, let's jump over there. The calling class in best practice should be your main class or the launching activity of your app so that a boolean denoting if the <code>ActionBar</code> class is available right from the get go. We're going to take advantage of another static initializer here.

{% highlight java linenos=table %}
static {
   try {
      ActionBarWrapper.isAvailable();
      isActionBarAvailable = true;
   } catch (Throwable t) {
      isActionBarAvailable = false;
   }
}

{% endhighlight %}

This part is relatively straightforward since all the hard work is in the <code>ActionBarWrapper</code> class. All that needs to be done here is to stick the call to <code>isAvailable()</code> in a try and catch and handle any possible exception by setting the <code>isActionBarAvailable</code> boolean to false. As already discussed, calling <code>isAvailable()</code> calls the static initializer of the <code>ActionBarWrapper</code> class which checks if the <code>ActionBar</code> class is available. But how is the static initializer of the main class called? The system will call it on application startup so you don't have to worry about it.

The hard part is done! From here, we know whether or not the <code>ActionBar</code> class is available. BUT! We still can't just try to initialize an <code>ActionBar</code> object directly. That will still result in a <code>VerifyError</code> being thrown. We can, however, initialize an instance of the <code>ActionBarWrapper</code> class though. The constructor for the <code>ActionBarWrapper</code> class is simple enough:

{% highlight java linenos=table %}
public ActionBarWrapper(Context context) {
   actionBar = ((Activity)context).getActionBar();
}

{% endhighlight %}

Here's where we create an instance of the <code>ActionBar</code> class. Why can we do it here though? Patience!

With an <code>ActionBarWrapper</code> object created, a reference to an <code>ActionBar</code> object is now a member variable of our <code>ActionBarWrapper</code> object. So, all calls to the <code>ActionBar</code> object must go through the <code>ActionBarWrapper</code> object. Thus, any <code>ActionBar</code> method we wish to call, must be implemented in the <code>ActionBarWrapper</code> class. For my purposes, I only needed three methods, but you could add all of them if you wish.

{% highlight java linenos=table %}
public void setBackgroundDrawable(Drawable background) {
   actionBar.setBackgroundDrawable(background);
}
public void setDisplayShowTitleEnabled(boolean showTitle) {
   actionBar.setDisplayShowTitleEnabled(showTitle);
}

public void setDisplayUseLogoEnabled(boolean useLogo) {
   actionBar.setDisplayUseLogoEnabled(useLogo);
}

{% endhighlight %}

Let's look at how this is implemented in the calling class.

{% highlight java linenos=table %}
if(isActionBarAvailable) {
   ActionBarWrapper actionBarWrapper = new ActionBarWrapper(this);
   actionBarWrapper.setBackgroundDrawable(getResources().getDrawable(R.drawable.logo_bg_repeat));
   actionBarWrapper.setDisplayShowTitleEnabled(false);
   actionBarWrapper.setDisplayUseLogoEnabled(true);
}

{% endhighlight %}

You can see how the <code>ActionBar</code> object is interacted with. Any <a href="http://developer.android.com/reference/android/app/ActionBar.html">methods from the <code>ActionBar</code> class</a> must be called through <code>ActionBarWrapper</code>.

And that's all! You now have an application that can use an Android 3.0 API on Android 2.* and Android 3.0 without crashing. You can easily change this for any Android API by modifying the <code>Class.forname</code> call in <code>ActionBarWrapper</code> although you'll probably want to rename the wrapper class as well and add some wrapper functions.

Lastly, let's take a quick look at why this solution works. The <code>ActionBarWrapper</code> never initializes an <code>ActionBar</code> object until after it has checked whether or not it exists. By doing this check in static initializers, we avoid ever referencing the <code>ActionBar</code> class until we are sure it exists. But why can't we just directly initialize an <code>ActionBar</code> object in the main class after we determined it exists? Because the bytecode verifier will throw a fit if it is running on a version of Android without the <code>ActionBar</code> class. You see, as soon as an object is initialized, the bytecode verifier is going to check all the code to make sure that calls to classes referenced in the object are valid. On Android 2.*, this will fail and result in a <code>VerifyError</code>. This is also the same reason that we cannot catch a <code>VerifyError</code>. The key here is the static initializers. These perform the check before the object is instantiated and prevent the bytecode verifier from throwing that dreaded <code>VerifyError</code>.

The complete listing of <code>ActionBarWrapper</code> is below.

{% highlight java linenos=table %}
public class ActionBarWrapper {
	private ActionBar actionBar;

	// Check if android.app.ActionBar exists and throw an error if not
	static {
		try {
			Class.forName("android.app.ActionBar");
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	// A static function that can be called to force the static
	// initialization of this class
	public static void isAvailable() {}

	public ActionBarWrapper(Context context) {
		actionBar = ((Activity)context).getActionBar();
	}

	// Wrapper functions
	public void setBackgroundDrawable(Drawable background) {
		actionBar.setBackgroundDrawable(background);
	}

	public void setDisplayShowTitleEnabled(boolean showTitle) {
		actionBar.setDisplayShowTitleEnabled(showTitle);
	}

	public void setDisplayUseLogoEnabled(boolean useLogo) {
		actionBar.setDisplayUseLogoEnabled(useLogo);
	}
}

{% endhighlight %}

