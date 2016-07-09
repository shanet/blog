---
layout: post
title: Listserv Auto-Subscribe Form
date: 2011-11-18
---

In my never ending quest to make the <a href="http://acm.psu.edu">Penn State ACM's website</a> as automated and as useful as possible, I wanted a page that allowed a user to enter his name and email and automatically be added to our listserv. With a little HTML, PHP, and a touch of the Drupal API (our website runs on Drupal), it was up and running in a little under an hour. Code incoming.

{% highlight php linenos %}
<?php

if (isset($_POST["name"])) {
   $name = $_POST["name"];
   $email = $_POST["email"];

   if(mail("listserv@lists.psu.edu", "Listserv Subscription",
            "SUBSCRIBE L-PSU-ACM " . $name, "From: " . $email)) {
      drupal_set_message("Subscribe confirmation sent to " . $email . ". Thanks for signing up!", "status");
   } else {
      drupal_set_message("Error sending subscribe request to " . $email .
                         ". Email webmaster@acm.psu.edu if problem persists.", "error");
   }
}

echo '
<form method="POST" action="">
   <b>Name:</b>
   <input type="text" class="form-text" name="name" size="60" value="" />
   <b>Email:</b>
   <input type="text" class="form-text" name="email" size="60" value="" />

   <input class="form-submit" type="submit" value="Submit"/>
</form>

';
?>

{% endhighlight %}

As you can see all it is an HTML form that calls the PHP mail function which sends an email to Penn State's listserv server on behalf of the user requesting that he be added to our listserv. From there, the ListServ server sends a confirmation email to the user and all that need be done is to click a confirmation link. That's it! Simple, no?

One note however. I would have preferred to have put the PHP in a separate file in order to keep the HTML and PHP away from one another, but I needed to use the <code>drupal_set_message</code> function meaning it had to be called from within a Drupal node. I'm sure there are ways to call it from outside a Drupal node, but given the scope of this project, this solution works just fine.
