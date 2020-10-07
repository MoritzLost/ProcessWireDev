---
tags: post
layout: post
title: Performance optimizations for ProcessWire sites
menu_title: Performance optimization
description: Learn how to optimize the performance of your ProcessWire site using these simple techniques!
---

# Optimize the performance of ProcessWire sites

ProcessWire is already pretty fast by default because of it's small overhead. However, with a growing expactation for sites to load pretty much instantaneously, there's always something to optimize. This tutorial documents a number of opportunities for page speed gains which you can apply to your own sites to achieve noticably faster loading times.

Of course, performance optimization has many layers and there are many techniques to cover – too many for one tutorial. Also, some of the most important techniques are not specific to ProcessWire, but apply to all CMS-based web projects. This tutorial focuses mainly on 'low-hanging fruit' - techniques that are easy to use and can be applied to most normal ProcessWire sites while having a huge impact on performance.

Before you get started, make sure to test the performance of your site with some tools such as [PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights/) to get a feeling for where you're standing. If your site is still in development and is not publicly available, you can use the *Lighthouse* tool included in the Chrome browser. It will let you know which are the most important issues to fix, so you know where to get started.

## Responsive images

For every website that contains image, using responsive images is **the most important aspect of performance**, period. If you are including desktop-resolution images on mobile devices, you can optimize loading times all you want, your performance will still be abysmall. For a near-instantaneous page load you will need to get the initial request size down to a couple hundred kilobytes or less – that budget will already be exceeded by one huge hero image. So before you apply any other optimization technique, you need to make sure your images are only served in the size they are actually needed, depending on the device width.

Responsive images involves creating multiple variations of the same source image in different resolutions, and including a list of alternatives for the browser to choose from. This is covered in detail in [Generating responsive images](/processwire-responsive-images/). That tutorial includes a general introduction on how responsive images work, as some pointers on implementing responsive images in ProcessWire sites and a complete production-ready component to include in your projects.

Once your site is using responsive images, you can take it one step further and implement [lazy loading](https://web.dev/browser-level-image-lazy-loading/). Since lazy loading is already supported natively by Chrome and Firefox, you can massively improve the perceived loading speed of your site for a large number of visitors by only including one additional attribute in your image tags.

Another technique that will become more important in the future is to supplement PNG and JPG images with modern file formats such as WEBP and AVIF. While you will need a fallback for older browsers, this can be easily achieved using a `<picture>` element and offering the same image both in modern and legacy formats. WebP is already supported by ProcessWire, so you can implement it today.

## Server-side caching: Template cache and ProCache

One factor for loading times is the amount of time it takes ProcessWire to parse the request, render the appropriate template and send the result back to the browser. The server response-time can be improved by using a server-side caching mechanism. This way, the server can send a cached response after the first request to a particular page, so each subsequent request to that request will be faster. You can achieve this using the following methods:

- **The template cache.** This functionality is included in ProcessWire and can be enabled on a template-basis. Using the template cache, ProcessWire will cache the HTML output of individual pages and return them for subsequent requests. This way, serving cached responses will still include the overhead of starting up ProcessWire and parsing the request, but will *not* include any API access or processing done in your template files.
- **The commercial ProCache module.** The [ProCache](https://processwire.com/store/pro-cache/) module will generate static HTML files for cacheable responses and serve those if available. This is done using some clever `RewriteRule` directives to ProcessWire's `.htaccess` file, to instruct Apache to serve the static HTML file instead of routing a request to ProcessWire. This way, a serving cached responses has practically no overhead and can be as fast as a static site.

The downside of both approaches is that you can't use it for pages that include some kind of dynamic content that changes in between requests. For example, if you want to display the some information that is stored in a session or some content that depends on the current time, caching those responses would mean that some users will get the wrong result.

If you need to have that sort of dynamic output, here are some possible solutions:

- You can implement that functionality client-side using JavaScript. For example, displaying some information stored in a session can also be done in the browser (though you'd have to use a cookie or [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) instead of a session). Of course, that's not possible in every scenario, in particular if you can't expose the data or credentials you need for your application to run to the browser. But it will work with both the template cache and the ProCache.
- My ProcessWire module [Cache Control](https://modules.processwire.com/modules/process-cache-control/) aims to solve that exact problem. It does so by using placeholders which are dynamically replaced with whatever dynamic data you need, even when the response is served from the cache. However, this will only work with the template cache, not with ProCache!

## Granular caching using the $cache API

- used when template cache / procache is not an options
- api-based caching of specific sections / variables
- procache

## Utilizing the browser cache

- htacces rules for caching & compression (or: precompressed assets?)

## Conclusion

- clear all caches (link to ProcessCacheControl)
