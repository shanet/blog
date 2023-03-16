---
layout: post
title: Coexisting Rails Import Maps with Yarn
date: 2023-03-15
---

I dislike Webpack. I even more strongly dislike Webpack when integrated with Rails. My prior experience with it has always been one of those tools that when it works silently in the background doing what you expect it's fine, but when it doesn't do what you expect, well, there goes the rest of your day debugging it and endlessly tinkering with obscure configuration files. Then again, JavaScript in general has never been my forte, but all the more reason for a desire to not have JavaScript tooling continually get in the way of focusing on my actual application.

Regardless, when I started work on my recent project, [Pirep](https://pirep.io), circa two years ago I read about a new gem installed by default with Rails 7 applications: [importmap-rails](https://github.com/rails/importmap-rails). It described itself as such in it's README:

> You can build modern JavaScript applications using JavaScript libraries made for ES modules (ESM) without the need for transpiling or bundling. This frees you from needing Webpack, Yarn, npm, or any other part of the JavaScript toolchain. All you need is the asset pipeline that's already included in Rails.

All of this was absolute music to my ears. I instantly adopted it into my application and forwent any type of JavaScript build system. And it worked wonderfully. There was one rough edge, however: third party dependency management.

<!--more-->

## Third Party Dependencies with importmap-rails

By default, the documented method for adding a third-party JavaScript dependency to your Rails application with `importmap-rails` is to use one of two options:

1. Serving the JavaScript modules from a third-party CDN
1. Downloading a local copy of the JavaScript modules to be included in your repository and served through your application

In my opinion, serving anything necessary for the functioning of your website through a third-party CDN that you have no control over is simply asking for trouble so I don't bother to consider that here.

For option two there's a significant drawback: The packages are downloaded from [JSPM](https://jspm.org/) and for pure JavaScript libraries this works great. But for any packages that also have associated CSS or images with them, well, you're on your own to get those resources into your application.

Maybe I'm missing something, but this trait alone significantly reduces the usability of this entire gem if I have to source the non-JS assets of a package myself through other means. The core concept of using import maps is solid, but the method of dependency management completely misses the mark here. Looking backwards though, there's already a decent tool that does handle this: Yarn. I'm not in love with Yarn by any means, but at least it downloads all of the assets needed for the functioning of a particular JavaScript package.

This got me thinking, what if I could use Yarn to download my dependencies and then use the import maps gem to get those assets into the asset pipeline for Rails to use. Well, good news because doing that is the whole point of this post.

## Using Yarn with importmap-rails

The downloading functionality of `importmap-rails` simply downloads the files for a specified JS package to your `vendor/assets` directory. From there, your `importmap.rb` and `manifest.js` files will read the files in that directory for inclusion into your Rails application.

So here's the trick: it doesn't matter what places the files in that directory. It could be the `importmap-rails` download functionality or it could be another dependency management tool like Yarn.

Yarn, of course, will put files into `node_modules` so if we want to download our dependencies with Yarn and then have import maps read them without manually copying anything or making a mess of our config files we can just create symlinks from `vendor/assets` to `node_modules`. Yup, that's basically the whole point to this post: a fairly dumb, albeit effective, solution to an annoying problem.

## Example Package

Let's walk through then how this would work with a JavaScript package we want to include in our Rails app. For Pirep, I heavily used [Mapbox-gl](https://www.npmjs.com/package/mapbox-gl) so I'll use that as an example here.

To start, we add it to our `package.json` file as you would with any other JS package when using Yarn:

{% highlight javascript linenos %}
{
  "dependencies": {
    "mapbox-gl": "^2.10.0"
  }
}
{% endhighlight %}

Then running `yarn install` will fetch the files and put them under `node_modules`.

Since Mapbox-gl has a compiled JS file we only need to symlink it into `vendor/assets`. But this approach can also work with multiple JS files using `import` statements. My `vendor/assets/javascripts` directory looks as such:

{% highlight bash linenos %}
$ ls -la vendor/assets/javascripts
drwxr-xr-x shane shane 4.0 KB Sun Feb 26 23:25:57 2023 .
drwxr-xr-x shane shane 4.0 KB Sun Feb 26 23:25:57 2023 ..
lrwxrwxrwx shane shane  49 B  Sun Feb 26 23:25:57 2023 mapbox-gl.js > ../../../node_modules/mapbox-gl/dist/mapbox-gl.js
{% endhighlight %}

And similarly for Mapbox's CSS:

{% highlight bash linenos %}
$ ls -la vendor/assets/stylesheets
drwxr-xr-x shane shane 4.0 KB Sun Feb 26 23:25:57 2023 .
drwxr-xr-x shane shane 4.0 KB Sun Feb 26 23:25:57 2023 ..
lrwxrwxrwx shane shane  50 B  Sun Feb 26 23:25:57 2023 mapbox-gl.css > ../../../node_modules/mapbox-gl/dist/mapbox-gl.css
{% endhighlight %}

Then we can add the package to our `config/importmap.rb` file to tell it that references to `mapbox-gl` should be resolved to `mapbox-gl.js`:

{% highlight ruby linenos %}
pin 'application', preload: true
pin 'mapbox-gl', to: 'mapbox-gl.js'
{% endhighlight %}

This works because `vendor/assets/javascripts` is a default search path for Rails' asset pipeline.

Finally, in the `app/assets/config/manifest.js` file we tell it to include all JS files under `vendor/assets/javascripts` in the import map that is sent to the browser:

{% highlight javascript linenos %}
//= link_tree ../javascripts .js
//= link_tree ../../../vendor/assets/javascripts .js
{% endhighlight %}

*This assumes you are using `app/assets` for your JavaScript files. This is a relative path so adjust it as needed if you have a different location such as `app/javascript`.*

For the CSS, the good 'ole Sprockets pipeline continues to work well here. In my `app/assets/stylesheets/application.scss` file I have the following import:

{% highlight scss linenos %}
@import 'mapbox-gl';
{% endhighlight %}

This pulls in Mapbox's CSS file from the `vendor/assets/stylesheets` directory that we symlinked before. `vendor/assets/stylesheets` is a default search path for the asset pipeline so there's no additional configuration needed.

And that's it! From here we can use Mapbox-gl in our own JS files with a simple `import 'mapbox-gl';` statement. When the browser loads the page it will have an import map defined:

{% highlight html linenos %}
<script type="importmap" data-turbo-track="reload" nonce="P6km21BKVZz6fWe52Z0eae9iEd1Du2jBG+UW5UVKdQ4=">{
  "imports": {
    "application": "https://cdn.pirep.io/assets/application-c6ab36beca07f0adacc25acb300bd176b60316e3c3b436d3ef30f07818b9a4e6.js",
    "mapbox-gl": "https://cdn.pirep.io/assets/mapbox-gl-945cb90660c81cfd8dc80d59a1ae0b69e43748888e5e63bcf16643a05a24315f.js",
  }
}</script>
{% endhighlight %}

This will tell the browser which JS modules to load which allows us to natively use `import` statements without the need for fumbling around with any build systems like Webpack.

For anyone worried about browser compatibility, [import maps are currently widely supported](https://caniuse.com/import-maps) in recent browsers. At the time of this writing the only major browser to not have support is Safari (althought support exists in the technology preview version so it's coming shortly there too). The `importmap-rails` gem has a built-in polyfill for unsupported browsers though so there's little need to worry about lack of support here.

## Where it won't work

It's not all rainbows and sunshine, unfortunately. There are some JavaScript packages that don't play nicely with import maps just yet.

For example, in Pirep I use [Sentry](https://sentry.io) for error reporting. They have a JavaScript library for collecting frontend errors. Unlike Mapbox-gl, however, [its NPM package](https://www.npmjs.com/package/@sentry/browser) does not have a single built JS file to symlink into the vendor directory. That's not necessarily a problem though since the whole point of an import map is that it can pull in multiple JavaScript modules directly from the browser. The issue I found with the Sentry library in particular is that some of those import paths are not compatible with loading from a browser. I outlined all of my different attempts at making it work in [an issue I opened asking for import map support](https://github.com/getsentry/sentry-javascript/issues/6141).

In the end, I ended up pulling the built Sentry file from their CDN and copied it directly into my `vendor/assets/javascripts` directory then included a separate, standlone `<script>` tag for it in the `<head>` of my templates. This was disappointing, but this was also the sole library that I had to do this with so it was only a mild annoyance than a common occurance.

Overall, in my experience so far using `importmap-rails` has all been a huge simplification of my asset management. Having a Rails application with a clean and understandable asset pipeline takes me back to the pure Sprockets days which I've honestly sorely missed. That's not to say this is ready for everyone to use or for complex legacy applications, but there's finally a light leading us out of the Webpack darkness that we've all been stuck in for the past decade.
