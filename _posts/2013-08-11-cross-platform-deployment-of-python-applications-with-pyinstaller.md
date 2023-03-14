---
layout: post
title: Cross-platform deployment of Python applications with PyInstaller
date: 2013-08-11
---

A primary goal for <a href="https://github.com/shanet/Cryptully">my Cryptully project</a> (an encrypted chat program) was to make a desktop application accessible to as many users as possible. Nothing annoys me more than wanting to use a service or program and having to install a program that I'll just uninstall later or having to create an account. I'm a big proponent of making the barrier to entry to using a new service as low as possible. Since the nature of my program (cryptography) did not warrant a web application, I was pushed to the desktop. The desktop isn't exactly known for getting something up and running quickly verses just going to a website. This led me to want to accomplish the following for my project:

* Build and run on Linux, Windows, and OS X
* No need to install any software
* No user registrations

With that in mind, I selected the language and libraries that would facilitate that goal. This led to:

* Python
* QT
* M2Crypto
* PyInstaller

Python for cross platform development was a natural choice as was QT. I've found that QT has some nuances with presentation of my application on OS X, but the fact that it worked exactly as intended on Linux, Windows, and OS X was extremely impressive. This allowed me to get my program running on all three OSs, but it wasn't user friendly, even for a developer. Windows, for example, required the installation of Python, PyWin, PyQt, M2Crypto, and the Visual C++ Redistributable Package. Hell, it took me a few hours to get all those installed and working correctly and I wrote the program. How could I package everything into a single binary file?

In comes PyInstaller.

<!--more-->

There's a few different Python packaging solutions out there. Py2Exe, Py2App, cx_freeze, etc. After some research and experimentation I determined it was entirely possible to use PyInstaller to package my app for Linux, Windows, and OS X. This avoided having to use different packagers for different platforms which was wonderful.

How does it work?

PyInstaller will package all the dependencies of my program into a single binary, including Python itself. This means that all a user need to do is download the binary, click it, and there's my program. No installation required.

PyInstaller relies on a spec file to tell it how to package your program. By default, you just give it the directory of your source files and it will look at your imports to determine what the dependencies are and generate a spec file for you. This does a surprisingly good job too, but things get a little tricky when adding extra files like images and, in the case of Windows, the C++ runtime libraries. Basic usage of PyInstaller is:

{% highlight bash linenos %}
$ ./pyinstaller.py [path to project]/[path to spec file]

{% endhighlight %}

Let's take a look at the spec file I'm using for Cryptully.

{% highlight python linenos %}
# -*- mode: python -*-
import sys

a = Analysis(['cryptully/cryptully.py'],
             hiddenimports=[],
             hookspath=None)
pyz = PYZ(a.pure)
exe = EXE(pyz,
          a.scripts,
          # Static link the Visual C++ Redistributable DLLs if on Windows
          a.binaries + [('msvcp100.dll', 'C:\\Windows\\System32\\msvcp100.dll', 'BINARY'),
                        ('msvcr100.dll', 'C:\\Windows\\System32\\msvcr100.dll', 'BINARY')]
          if sys.platform == 'win32' else a.binaries,
          a.zipfiles,
          a.datas + [('images/light/delete.png',      'cryptully/images/light/delete.png', 'DATA'),
                     ('images/light/exit.png',        'cryptully/images/light/exit.png', 'DATA'),
                     ('images/light/fingerprint.png', 'cryptully/images/light/fingerprint.png', 'DATA'),
                     ('images/light/help.png',        'cryptully/images/light/help.png', 'DATA'),
                     ('images/light/icon.png',        'cryptully/images/light/icon.png', 'DATA'),
                     ('images/light/menu.png',        'cryptully/images/light/menu.png', 'DATA'),
                     ('images/light/new_chat.png',    'cryptully/images/light/new_chat.png', 'DATA'),
                     ('images/light/save.png',        'cryptully/images/light/save.png', 'DATA'),
                     ('images/light/splash_icon.png', 'cryptully/images/light/splash_icon.png', 'DATA'),
                     ('images/light/waiting.gif',     'cryptully/images/light/waiting.gif', 'DATA'),

                     ('images/dark/delete.png',       'cryptully/images/dark/delete.png', 'DATA'),
                     ('images/dark/exit.png',         'cryptully/images/dark/exit.png', 'DATA'),
                     ('images/dark/fingerprint.png',  'cryptully/images/dark/fingerprint.png', 'DATA'),
                     ('images/dark/help.png',         'cryptully/images/dark/help.png', 'DATA'),
                     ('images/dark/icon.png',         'cryptully/images/dark/icon.png', 'DATA'),
                     ('images/dark/menu.png',         'cryptully/images/dark/menu.png', 'DATA'),
                     ('images/dark/new_chat.png',     'cryptully/images/dark/new_chat.png', 'DATA'),
                     ('images/dark/save.png',         'cryptully/images/dark/save.png', 'DATA'),
                     ('images/dark/splash_icon.png',  'cryptully/images/dark/splash_icon.png', 'DATA'),
                     ('images/dark/waiting.gif',      'cryptully/images/dark/waiting.gif', 'DATA')],
          name=os.path.join('dist', 'cryptully' + ('.exe' if sys.platform == 'win32' else '')),
          debug=False,
          strip=None,
          upx=True,
          console=False,
          icon='cryptully/images/icon.ico')

# Build a .app if on OS X
if sys.platform == 'darwin':
   app = BUNDLE(exe,
                name='cryptully.app',
                icon=None)

{% endhighlight %}


<hr />
<h3>Resources</h3>

There's a few interesting parts to this spec file that aren't present in the default generated spec file. One of those being the images. PyInstaller will only put Python code in your binary by default so you need to tell it what other files to include. In my case, this meant adding all the images used in the program like so:

{% highlight python linenos %}
a.datas + [('images/light/delete.png', 'cryptully/images/light/delete.png', 'DATA'),

{% endhighlight %}

The first argument is the location the resource will be available at in the packaged application and the second is the location of the resource in the source directory. This is not limited to just images either. Any file can be packaged along with the source code.

Loading the resource when running from the binary is not exactly straightforward. In my case, I also wanted Cryptully to run as a Python script and as an egg. This meant a lot of different paths for loading resources, but a relatively short function translates a relative resource path, to an absolute one.

{% highlight python linenos %}
def getAbsoluteResourcePath(relativePath):
    try:
        # PyInstaller stores data files in a tmp folder refered to as _MEIPASS
        basePath = sys._MEIPASS
    except Exception:
        # If not running as a PyInstaller created binary, try to find the data file as
        # an installed Python egg
        try:
            basePath = os.path.dirname(sys.modules['cryptully'].__file__)
        except Exception:
            basePath = ''

        # If the egg path does not exist, assume we're running as non-packaged
        if not os.path.exists(os.path.join(basePath, relativePath)):
            basePath = 'cryptully'

    path = os.path.join(basePath, relativePath)

    # If the path still doesn't exist, this function won't help you
    if not os.path.exists(path):
        return None

    return path

{% endhighlight %}


<hr />
<h3>Windows</h3>

A special consideration must be made for Windows where is it necessary to static link the C++ runtimes from the Visual C++ Redistributable package, otherwise a user will need to install that. This boils down to:

{% highlight python linenos %}
a.binaries + [('msvcp100.dll', 'C:\\Windows\\System32\\msvcp100.dll', 'BINARY'),
              ('msvcr100.dll', 'C:\\Windows\\System32\\msvcr100.dll', 'BINARY')]
if sys.platform == 'win32' else a.binaries,

{% endhighlight %}

It is completely beyond me why Microsoft feels it is necessary to make developers do this, but that's the way it is.

<hr />
<h3>OS X</h3>

Finally, PyInstaller will, by default, create a UNIX-style binary on OS X rather than the .app that OS X users are familiar with. A few lines in the spec file tells PyInstaller to create a .app as well:

{% highlight python linenos %}
if sys.platform == 'darwin':
   app = BUNDLE(exe,
                name='cryptully.app',
                icon=None)

{% endhighlight %}


<hr />

What does it look like put all together on each platform?

![]({{ site.baseurl }}/assets/images/2013/08/chatting.png)


![]({{ site.baseurl }}/assets/images/2013/08/mode_dialog11.png)


![]({{ site.baseurl }}/assets/images/2013/08/osx.png)


&nbsp;

There's obviously a few visual discrepancies, but they are acceptable for me. Users just need to download and run on Linux, Windows, or OS X. No installations necessary. For those that like to see a full, working example, the instructions for building Cryptully are at <a href="https://cryptully.readthedocs.io/en/latest/building.html">https://cryptully.readthedocs.io/en/latest/building.html</a>.
