---
tags: post
layout: post
title: "Performance by doing less"
---

# How to get a fast and accessible site by doing less work

There is a misconception that getting your site to be load ultra fast and be completely accessible takes a lot of expertise and hard work. This is not true — in fact, it's the other way around: **Every website is fast and accessible by default**. This is famously illustrated by the [m\*\*\*erf\*\*\*ing website](http://motherfuckingwebsite.com/). By simply using semantic HTML for the content, the site is accessible - with no need for ARIA attributes, fancy JavaScript or CSS. And since the site is simply a static HTML file, the loading times is essentially equivalent to the network overhead.

Of course, for "real" sites, we want some fancy styling and some interactivity, so it's likely that your site can't be as pure. But the point is, if a site is inaccessible, it's because of stuff (mostly JavaScript and CSS) we put on it.

**What does your CMS have to do with this?** The problem with many Content Management Systems like WordPress or Drupal is that they come with a bunch of stuff you don't need _by default_. That is not technically true. You can totally write a clean, fast WordPress theme with no dependencies. However, most WordPress and Drupal sites aren't built that way - instead, you start out with a theme or site profile that comes loaded with all the features the developer thought the users could possibly need. At this point, you have a slow site that needs "optimization", so you install a caching plugin, start overwriting the theme to get rid of things you don't need and so on. But if you want to do that properly, it will be much more work than starting out from a smaller baseline. And the result won't be anywhere as good.
