---
layout: post
title: ! 'Cryptully: Simple Encrypted Chat'
date: 2013-08-13
---

Back in May I started a project with the goal of allowing simple chat (instant messaging if you will) between two people, except that everything was encrypted. The original goal was not to reinvent the chat program, but rather make a chat program with a very specific purpose: quick, encrypted chat between two people. Why? There are more chat clients that anyone can count out there and a similar number of them are encrypted. The problem is that few people use encryption and setting it up is a pain. The user has to install software and configure software. This does nothing but deter the user from using any type of secure communication. I set out to create a simple chat client with the following goals:

* All messages are encrypted.
* Easily accessible to everyone.As in, no knowledge of crypto required.
* Cross platform; it should run on Linux, Windows, and OS X.
* No software to install and no user accounts to create.
* Just bare bones chat with a minimal interface. Nothing fancy here.
* Simple enough that the code could be inspected by anyone who is curious to verify nothing suspicious is going on.
* Ability for users to host their own servers if desired.
* Open source (of course).

After a few months and iterations of designs and chat clients, I'm very happy to say that I've accomplished all those goals. Here's what the finished product looks like:

![]({{ site.baseurl }}/assets/images/2013/08/c8.png)

It's called <a href="https://github.com/shanet/Cryptully">Cryptully</a> and it's a basic encrypted chat program. The only cryptography the user needs to know is how to check a public key fingerprint and that is explained as simple as possible (read these numbers, if they match, everything is fine). Further, binaries are available for download where all the user need to do is download and run. There's no dependencies to install or accounts to create.

<!--more-->
<h3>How does it work?</h3>

A high level overview is that a user selects a nickname to identify by (similar to IRC). Their client registers this nickname with a central server who maps their IP address and port to the given nickname. When another client requests to connect to a nickname, the server operates as a TURN server by relaying messages between the two clients. This avoids the potential pitfalls of NAT traversal / hole punching and also allows for the convenient use of nicknames to identify with rather than IP addresses.

What about the encryption? When two clients first connect they exchange public keys via Diffie-Hellman. An AES key is derived from the DH secret which is then used to encrypted all messages for that session.

What about data integrity? All messages also include an HMAC calculated by taking the SHA-256 of the AES key concatenated with the encrypted message. The receiver of the message verifies the HMAC (with a secure string comparison) before attempting to decrypt the message. Message numbers are utilized to prevent replay attacks or message deletion. Finally, the <a title="MITM Protection via the Socialist Millionaire Protocol (OTR-style)" href="{% post_url 2013-08-22-mitm-protection-via-the-socialist-millionaire-protocol-otr-style %}">Socialist Millionaire Protocol is used to detect MITM attacks</a>.

<h3>Why would I want to use this?</h3>

If you want to have a secure communication with someone, but don't want to configure software or learn about cryptography. This project was first conceived in April 2013. With the disclosures of government surveillance two months later in June 2013, the project took on more importance as a tool for people to communicate with one another quickly and easily.

<strong>Is it really secure?</strong>

As well all cryptography, you should never trust your life with it, but it's certainly a hell of a lot more secure than sending messages in the clear and hoping that no one reads them.

If you are security conscious all the code is available for inspected and, if desired, you can run your own relay server so that you control as much information as possible.

<strong>The usual disclaimer that I am not a security expert applies. While best efforts have been made to ensure Cryptully is secure as possible, this has not been verified by an independent third party. If you find any issues please report them either on <a href="https://github.com/shanet/Cryptully">GitHub</a> or by emailing me directly at the address in the top right of this page.</strong>
<h3>Sounds cool! Where can I get it?</h3>

The easiest way is to download the pre-built binaries from the <a href="https://github.com/shanet/Cryptully/releases">GitHub releases page.</a>

More of a "give me the source code!" kind of person? Everything is available on <a href="https://github.com/shanet/Cryptully/">GitHub</a> licensed under the LGPL. If you would like to contribute, there are some open issues for feature enhancements on GitHub as well.

Documentation on usage info, building info and more of the nitty-gritty of the protocol is available at <a href="https://cryptully.readthedocs.io/en/latest/index.html">https://cryptully.readthedocs.io/en/latest/index.html</a>.
