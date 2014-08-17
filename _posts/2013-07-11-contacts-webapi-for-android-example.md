---
layout: post
title: Contacts WebAPI for Android Example
date: 2013-07-11
---

The first project I was given at my internship at Mozilla this summer was to implement the <a href="https://wiki.mozilla.org/WebAPI/ContactsAPI">Contacts WebAPI</a> for Android. This means it's possible to create, update, view, and delete the contacts on an Android device through the web on Firefox for Android.  Of course, a user has to explicitly allow a webpage access to his/her contacts before Firefox goes anywhere near the contacts.

The <a href="https://wiki.mozilla.org/WebAPI/ContactsAPI#Out_of_scope">Mozilla wiki has some simple examples</a> of how to use the WebAPI, but I quickly threw together a more complete example. The tarball linked below is a collection of basic HTML files that demonstrate the functions of the contacts API in a hopefully straightforward way. Not all of the possible contact fields are present for the sake of page size (and my time), but the others, as documented on the Mozilla wiki, are trivial to implement.

<!--more-->
A quick example of how to create a contact:

{% highlight javascript linenos=table %}
var contact = new mozContact();
contact.init({name: "John Doe", givenName: "John", familyName: "Doe"});

var request = navigator.mozContacts.save(contact);

request.onsuccess = function() {
   alert("Success saving contact. New contact ID: " + contact.id);
};

request.onerror = function() {
   alert("Error saving contact.");
};

{% endhighlight %}

All of the API functions have the basic structure of passing a contact (or find options for the find function) as an argument, getting a DOM request object back, and then defining success and failure callback functions.

As promised, the example webpage: <a href="{{ site.baseurl }}/assets/demos/contacts_api_example.tar.gz">contacts_api_example.tar.gz</a>

![]({{ site.baseurl }}/assets/images/2013/07/Screenshot_2013-07-08-17-44-15.png)

