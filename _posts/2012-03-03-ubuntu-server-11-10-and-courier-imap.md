---
layout: post
title: Ubuntu server 11.10 and Courier-IMAP
date: 2012-03-03
---

My weekend project was to set up an SMTP and IMAP server on my home server so I could finally have my own mail server and be free from the prying eyes of the large email hosts.

Most of this process was relatively simple thanks to <a href="https://help.ubuntu.com/community/PostfixBasicSetupHowto">this wonderful guide</a> from the Ubuntu help site. However, I ran into one problem: the <code>courier-IMAP</code> server would not accept any connections with the default configuration. A quick look in the mail log revealed:

{% highlight text linenos=table %}
dovecot: master: Fatal: execv(/usr/lib/dovecot/imap-login) failed: No such file or directory
dovecot: master: Error: service(imap-login): child 7466 returned error 84 (exec() failed)
dovecot: master: Error: service(imap-login): command startup failed, throttling

{% endhighlight %}


Lo and behold, <code>/usr/lib/dovecot/imap-login</code> did not exist. Furthermore, <code>locate imap-login</code> returned nothing so I concluded that this binary was no where to be found on my system. However, <code>apt-file search imap-login</code> showed that the package <code>dovecot-imapd</code> provided <code>imap-login</code>. I went ahead to install it to find that <code>courier-imap</code> and <code>dovecot-imapd</code> conflict with one another and apt won't allow them both to be installed. So, my hack-ish workaround, copy the binaries I needed out of the directory, uninstall <code>dovecot-imap</code> and reinstall <code>courier-imap</code>. For those who just want the "solution":


{% highlight bash linenos=table %}
sudo apt-get install dovecot-imapd
cp /usr/lib/dovecot/{imap,imap-login} ~/
sudo apt-get remove dovecot-imapd
sudo apt-get install courier-imap
sudo cp ~/{imap,imap-login} /usr/lib/dovecot/

{% endhighlight %}


Obviously, this is not an ideal solution. Most likely, courier will break with a future update since <code>imap-login</code> won't be updated, but hopefully this dependency problem will be sorted by then.
