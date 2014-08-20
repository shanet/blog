---
layout: post
title: Drupal and the Holy Grail of Workflows
date: 2014-04-02
---

I've recently given myself the task of creating a mature workflow for a Drupal website. For the past few months, I have been working with a startup and creating their website from the ground up. We are using a traditional LAMP stack with Drupal running on top. Sure, the LAMP stack isn't the "in thing" anymore, but it's working very well for our purpose right now. That is, get up and running quickly and focus on developing the product.

At first, development was easy. Throw Drupal on an EC2 instance and jump in to writing code. But, of course, sooner than later real data starts being entered into the database. The website starts being used for demo purposes and, well, if a poorly written function blows away a database table, that's a serious problem. So, we need a more mature workflow. Something that will allow for those poorly written functions to light the whole database on fire and not have it matter because it's just a copy of the real database or if the unthinkable does happen, it's easily recoverable. Unfortunately, the nature of Drupal doesn't make this as easy as it should be.

<!--more-->

<hr />

<strong>Version Control</strong>

First and foremost, version control is the core of our workflow. Specifically Git with a heavy reliance on GitHub. In our case, all of Drupal core, as well as third party modules and our own custom modules are kept under version control. Not only do we have a history of our own code, but also all changes to Drupal itself and the third party modules we make use of.

Having the site kept in a Git repo is great and all, but how do we separate production from development environments and how to ensure code quality? Our workflow is broken up into three tiers: Production, staging, and development. The production and staging servers are EC2 instances, but the development environments are isolated environments controlled by each developer on his/her own local system. A developer can completely blow away everything and the production and staging servers would not care in the least bit.

The diagram below shows a rough overview of how changes move from development to production.

![]({{ site.baseurl }}/assets/images/2014/04/workflow.png)

The basic idea is that there are three Git branches:

1. Production
1. Master
1. Individual developer branches (okay, so potentially many more than just three branches)

When a developer is ready to push some commits, he/she merges the relevant branch with the master branch. This is where any merge conflicts with other developer's work is resolved. From there, the master branch with the new commits is pushed to GitHub. From there, the changes are pulled to the staging server. When ready, the staging server merges the master branch with the production branch which is then pushed back to GitHub. Finally, the make the changes live, the production server simply pulls the production branch from GitHub.

<hr />

<strong>Drupal Configuration</strong>

By far the most difficult part of the workflow to get working was finding a way to synchronize the Drupal configuration between the development, staging, and production sites. The problem is that Drupal makes no distinction between content and configuration in the database. Thankfully, fixing this is one of the major initiatives for Drupal 8, but given that we're on Drupal 7 for the foreseeable future, that doesn't help right now. It's not just a matter of syncing the database either because we only want to sync the configuration, not the content.

What we need to do is get the configuration out of the database and into code somehow. This will allow it to be placed under version control and can easily be moved between sites. Until Drupal 8 arrives, there are two popular methods for doing this. Both involve the use of third party modules. These modules being:

* [Features](https://drupal.org/project/features)
* [Configuration Management](https://drupal.org/project/configuration)

Technically speaking, the Features module's intended purpose is <strong>not</strong> to sync site configuration so it does a rather poor job of this. The Configuration Management module, on the other hand, is tries to replicate the method being taken in Drupal 8 for separating config from content. It's not perfect and is still under development, but I've found it be usable enough to do what I need it to do.

Once configured, whenever a change to the site requires a configuration change, the change is made as normal through the web UI. Then "drush config-export --all" is executed. This will export the selected config to text files that are then committed like changes to the code. Once pulled on the other servers, "drush config-sync" takes the config from the text files and puts them into the database making the changes live on the site.

<hr />

<strong>Continuous Integration</strong>

To ensure code quality, we employ Jenkins to automatically run tests on the codebase whenever a new commit is pushed on the master branch. We have a dedicated EC2 instance, called the support server, which hosts Jenkins. When GitHub receives a push, it sends an HTTP POST request to a special URL managed by Jenkins. Jenkins, assisted by a slave running on the staging server, pulls the master branch to the staging server and uses Drush to run the tests. Upon a successful test run, Jenkins merges the production branch with the master branch and pushes it to GitHub. This way, we ensure that we always have a stable branch that is ready to be deployed.

<hr />

<strong>Backups</strong>

Hope for the best, but plan for the worst. We have nightly backups ready to go in case a database needs restored for whatever reason. Thanks to the [Backup and Migrate](https://drupal.org/project/backup_migrate) module, this is actually very straightforward and simple to set up. The Backup and Migrate module allows for nightly backups of the Drupal database to be scheduled and copied directly to an S3 bucket. In our case, both the staging and production server's databases are backed up both nightly and on demand. If the shit hits the fan, restoration is a single Drush command away to restore a backup and a single Git command to pull a copy of the codebase.

<hr />

<strong>IRC, Hubot, and the Wiki</strong>

In my opinion, IRC is a highly underutilized method of collaboration. Its been around for close to 25 years now and has clients available for virtually every platform imaginable. That said, it provides a nice intermediate for communicating with team members between having a full blown meeting and starting an email chain that inevitably gets lost in someone's inbox.

One of the killer features of using IRC is GitHub's [Hubot project](https://hubot.github.com/) Hubot is a scriptable robot that hangs out in IRC and responds to commands. This makes it possible to write scripts for Hubot so that can manage the servers for us. Whether it's running Drush commands, Git commands, checking the status of the Jenkins build, or deploying code to the servers, Hubot makes it possible with a single command.

Finally, the last service hosted on our support server is the wiki. It's a basic MediaWiki installation, but it provides a place for documentation and other more permanent documents for the whole team to view & edit.

<hr />

<strong>Putting it all Together: One Click to Deploy</strong>

With all of the above infrastructure in place, the holy grail of workflows is now attainable: one click to deploy. Well, it's not so much "one click" as it is "one command."

As explained in the continuous integration section above, we always keep the production branch in a stable state so that it is ready to be deployed at any time. This means that deploying code to the live environment is just one Git pull away. But that means SSH'ing into a server, sudo'ing to the correct user, and running Git commands. The time doing that can really add up. However, it's easy to automate everything.

Hubot makes this very simple. Our custom deploy script allows Hubot to respond to the command "hubot deploy ship-it." This command tells Hubot to SSH into the production server and pull the production branch. It also takes an argument to sync the configuration if necessary.

And that's how we were able to create a Drupal workflow that separates production and development environments with automated tests, nightly backups, and one click to deploy.
