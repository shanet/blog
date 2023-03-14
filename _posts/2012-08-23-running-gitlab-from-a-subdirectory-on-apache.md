---
layout: post
title: Running GitLab from a subdirectory on Apache
date: 2012-08-23
---
<h4><strong>Note: As of February 2013, these instructions have been tested with GitLab 4.1. GitLab evolves very rapidly and I do not use it anymore so these instructions will quickly become outdated.</strong></h4>

I've been looking for a good git manager website that I could install on my own server. A few days ago I found <a href="https://github.com/gitlabhq">GitLab</a>, which does everything I need it to do and more. The only problem is that the setup guides use Nginx as a webserver. I'm cheap and only have one server, which runs Apache. I also have this Wordpress (this blog) already running on my server so I would like have to install GitLab to a subdirectory too.

<hr />

<h3>Part 1: Running GitLab on Apache</h3>

First, let's talk about running GitLab from Apache. Everything to get Gitlab running on Apache is exactly the same if you're following the <a href="https://github.com/gitlabhq/gitlabhq/blob/master/doc/install/installation.md">install guides for GitLab</a>, up until the point of installing Nginx. So, if you haven't started install GitLab yet, go do that and stop when you get to installing Nginx.

I assume you already have Apache installed and up and running, if not, there are more than enough guides floating around on how to do this. I won't add another to the fray.

GitLab is a Ruby on Rails application and to run it on Apache we need to install the Passenger module.

{% highlight bash linenos %}
$ sudo gem install passenger
$ sudo passenger-install-apache2-module

{% endhighlight %}


<!--more-->
After installing the Passenger Apache module, it will output a few lines that need put in your Apache config. They should look something like the following, <strong>but do not copy and paste these! Use the ones that are output by the installation script!</strong>


{% highlight text linenos %}
LoadModule passenger_module /usr/local/lib/ruby/gems/1.9.1/gems/passenger-3.0.19/ext/apache2/mod_passenger.so
PassengerRoot /usr/local/lib/ruby/gems/1.9.1/gems/passenger-3.0.19
PassengerRuby /usr/local/bin/ruby

{% endhighlight %}


Go ahead and open <code>/etc/apache2/httpd.conf</code>, or whatever Apache config you're using and drop them in there.
Last step is to tell Apache where to look for GitLab. Open the Apache site config file you're using, usually <code>/etc/apache2/sites-available/default</code> and add the following inside the <code>VirtualHost</code> tags:

{% highlight text linenos %}
DocumentRoot /home/gitlab/gitlab
<Directory /home/gitlab/gitlab>
    Options -MultiViews
</Directory>

{% endhighlight %}

As per the GitLab install guide, it should be sitting at "/home/gitlab/gitlab", or similar. Change this if this is not your case.
<p class="brush:plain">Now <strong>restart Apache</strong> and GitLab should fire up! Note that when first starting GitLab, the page might take a minute or so to load while the server starts GitLab. Keep reading if you want to install GitLab to a subdirectory.

<hr />

<h3>Part 2: Running GitLab from a subdirectory</h3>

Like I mentioned above, maybe you have another site on your server and want GitLab in a subdirectory. Easy enough.

<a href="http://www.modrails.com/documentation/Users%20guide%20Apache.html#deploying_rails_to_sub_uri">The Passenger documentation has info</a> on how to deploy a Rails application to a subdirectory, but it's a little confusing. First thing we need to do is make a symlink from the current root of the web server to the public directory in our Rails application. I'm using the standard <code>/var/www</code> for my server; change it if you're using something different.

{% highlight text linenos %}
$ cd /var/www
$ ln -s /home/gitlab/gitlab/public gitlab
$ chown www-data.www-data gitlab

{% endhighlight %}

Now we need to tell GitLab about the subdirectory. Open <code>/home/gitlab/gitlab/config/gitlab.yml</code> and uncomment:

{% highlight text linenos %}
relative_url_root: /gitlab

{% endhighlight %}

One more thing to change, we need to change the directory in the Apache site config we added above. Open <code>/etc/apache2/sites-available/default</code> and make the following changes:


{% highlight text linenos %}
# Change:
DocumentRoot /home/gitlab/gitlab
<Directory /home/gitlab/gitlab>
    Options -MultiViews
</Directory>

# To:
DocumentRoot /var/www
RailsBaseURI /gitlab
<Directory /var/www/gitlab>
    Options -MultiViews
</Directory>

{% endhighlight %}

The magic line here is the <code>RailsBaseURI</code> directive. This instructs Passenger to expect a subdirectory, instead of the root of the server. Restart Apache and you should be up and running!
<p class="brush:plain">One small snag I ran into was that since I was running Wordpress at the server root and Wordpress makes use of mod_rewrite to change the URL's around, it was interfering with GitLab. Fortunately, this is a very simple fix. In the public directory of GitLab, create an .htaccess file with the contents:

{% highlight text linenos %}
RewriteEngine off

{% endhighlight %}

Now, <strong>restart Apache</strong> and that's all.
