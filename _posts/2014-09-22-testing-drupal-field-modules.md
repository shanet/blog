---
layout: post
title: Testing Drupal Field Modules
date: 2014-09-22
published: false
---

Part of the challenge of writing tests for Drupal is simply setting up the tests rather than writing the tests themselves. This stems from the fact that unit tests are not terribly useful when testing a Drupal module. Modules rely are part of a bigger system; they access the database often, gather data from user's browsers, and interact with Drupal core in ways that make unit tests very limited in what they can achive. Instead, the focus is placed on integration tests. However, this means configuring a module and providing it with data to test with. Given that this data and configuration is normally done by a user through the browser, it takes some hoop jumping to automate this process. This is where the challenge of setting up tests comes in.

As I wrote tests for some of my custom Drupal modules that make use of the Fields API I found myself using the same functions to set up each test. What follows is a test suite for a simple module that defines a field via the Field API.


