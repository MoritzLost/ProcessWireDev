---
tags: post
layout: post
title: Performance optimizations for ProcessWire sites
menu_title: Performance optimization
description: Learn how to optimize the performance of your ProcessWire site using these simple techniques!
---

# Optimize the performance of ProcessWire sites

ProcessWire is already pretty fast by default because of its small overhead. However, with a growing expectation for sites to load pretty much instantaneously, there's always something to optimize. This tutorial documents a number of opportunities for page speed gains which you can apply to your own sites to achieve noticeably faster loading times.

Of course, performance optimization has many layers and there are many techniques to cover — too many for one tutorial. Also, some of the most important techniques are not specific to ProcessWire, but apply to all CMS-based web projects. This tutorial focuses mainly on 'low-hanging fruit' — techniques that are easy to use and can be applied to most normal ProcessWire sites while having a huge impact on performance.

Before you get started, make sure to test the performance of your site with some tools such as [PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights/) to get a feeling for where you're standing. If your site is still in development and is not publicly available, you can use the *Lighthouse* tool included in the Chrome browser. It will let you know which are the most important issues to fix, so you know where to get started.

## Responsive images and lazy loading

For every website that contains images, using responsive images is **the most important performance aspect**, period. If you are including desktop-resolution images on mobile devices, you can optimize loading times all you want, your performance will still be abysmal. For a near-instantaneous page load you will need to get the initial request size down to a few hundred kilobytes or fewer — that budget will already be exceeded by one huge hero image. So before you apply any other optimization technique, you need to make sure your images are only served in the size they are actually needed, depending on the device width and resolution.

Responsive images involve creating multiple variations of the same source image in different resolutions and including a list of alternatives for the browser to choose from. This is covered in detail in [generating responsive images](/processwire-responsive-images/). That tutorial includes a general introduction on how responsive images work, as well as some pointers on implementing responsive images in ProcessWire sites and a complete production-ready component to include in your projects.

Once your site is using responsive images, you can take it one step further and implement [lazy loading](https://web.dev/browser-level-image-lazy-loading/). Since lazy loading is already supported natively by Chrome and Firefox, you can massively improve the perceived loading speed of your site for many visitors simply by including this additional attribute in your image tags.

```html
<img lazy srcset="..." sizes="..." src="..." alt="...">
```

Another technique that will become more important in the future is to supplement PNG and JPG images with modern file formats such as WebP and AVIF. While you will need a fallback for older browsers, this can be easily achieved using a `<picture>` element and offering the same image both in modern and legacy formats. WebP is already supported by ProcessWire, so you can implement it today.

## Server-side caching: Template cache and ProCache

One factor for loading times is the amount of time it takes ProcessWire to parse the request, render the appropriate template and send the result back to the browser. The server response time can be improved by using a server-side caching mechanism. This way, the server can send a cached response after the first request to a particular page, so all subsequent requests for that page will be faster. You can achieve this using the following methods:

- **The template cache.** This functionality is included in ProcessWire and can be enabled on a per template basis. Using the template cache, ProcessWire will cache the HTML output of individual pages and return them for subsequent requests. This way, serving cached responses will still include the overhead of starting up ProcessWire and parsing the request, but will *not* include any API access or processing done in your template files.
- **The commercial ProCache module.** The [ProCache](https://processwire.com/store/pro-cache/) module will generate static HTML files for cacheable responses and serve those if available. This is done using some clever `RewriteRule` directives to ProcessWire's `.htaccess` file that instruct Apache to serve the cached static HTML files instead of routing requests to ProcessWire. This way, serving a cached responses has practically no overhead and can be as fast as a static site.

The downside of both approaches is that you can't use it for pages that include some kind of dynamic content which needs to change in between requests. For example, if you want to display some information that is stored in a session or some content that depends on the current time, caching those responses would mean that some users will get the wrong result.

If you need to have that sort of dynamic output, here are some possible solutions:

- You can implement that functionality client-side using JavaScript. For example, displaying some information stored in a session can also be done in the browser (though you'd have to use a cookie or [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) / [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) instead of a session). Of course, that's not possible in every scenario, in particular if you can't expose the data or credentials you need for your application to run to the browser. But it will work with both the template cache and the ProCache.
- My ProcessWire module [Cacheable Placeholders](https://modules.processwire.com/modules/cache-placeholders/) aims to solve that exact problem. It does so by using placeholders which are dynamically replaced with whatever dynamic data you need, even when the response is served from the cache. However, this will only work with the template cache, not with ProCache!

## Granular caching using the $cache API

Both the template cache and the ProCache module represent an all-or-nothing approach to caching which won't work for highly dynamic sites with many moving parts. In this case, you need a more granular approach which allows you to cache only selected parts of the output. ProcessWire provides a general-purpose database cache through the [$cache API](https://processwire.com/api/ref/wire-cache/). It can be used as a key-value store to cache strings (like partial output from your templates) or serializable data objects which are CPU-intensive to compute or require a lot of database queries. By caching those values, the template can essentially skip some sections and use cached values for those instead.

For example, let's say you're building a listing of stores locations, each store being represented by a page. This can result in a lot of database queries: First you have to get all stores through the $pages API. Then you iterate through them in the template and output each store's title, address, opening hours and so on. Each field access requires an additional database query, unless all your fields are auto-joined (which presents problems in other areas). By caching the generated HTML output for the store listing, you can reduce that overhead for subsequent requests:

```php
$cacheKey = 'store-listing';
$storeListing = $cache->get($cacheKey);
if (!$storeListing) {
    $storeListing = wireRenderFile('partials/store-listing.php');
    $cache->set($cacheKey, $storeListing, WireCache::expireDaily);
}
echo $storeListing;
```

The two main problems you have to solve is (1) making sure to vary your cache keys depending on all moving parts and (2) when and how to invalidate
 the cached data.

### Varying cache keys

When using the $cache API, you have to make sure not to access the wrong piece of data from the cache. For example, let's say the `store-listing.php` displays a list of all locations belonging to the current store page, so the list of locations on the pages `/stores/brand-a/` and `/stores/brand-b/` are completely different. The snippet above would produce incorrect results in this case, because the cache key `store-listing` is identical in both cases, so the cached results from `/stores/brand-a/` might be displayed on `/stores/brand-a/` or vice versa. The solution to this is to vary your cache keys by all factors that the cached content depends on. For example:

```php
$cacheKey = 'store-listing-' . $page->id;
$storeListing = $cache->get($cacheKey);
// ...
```

Now the cache key differs depending on the current page ID, so there's no chance of mixing up cached data from different stores.

Here's a list of things you will often need to vary your cache keys by:

- The current page.
- The current language (for multi-language sites).
- The user roles of the current user, or the current user altogether.
- URL segments or query parameters.
- Cookies, session data or request headers.

You should only make the cache keys as granular as you need them to be, as very specific cache keys will result in fewer cache hits. For example, if the store listing above does *not* depend on the current page, the cache could be reused across different pages, so varying the cache key by page ID would only store unnecessary duplicate entries in the cache table.

You can also define your own function or class acting as an adapter that automatically adds a namespace to the cache key based on the most common factors. Using namespaces allows you to very easily make cache keys vary by multiple factors. This way, you don't have to worry too much about collisions, unless your output also depends on URL parameters, cookies, session data and so on.

```php
// build a namespace string that varies by page, language and user role(s)
$user = wire('user');
$language = $user->language;
$cacheNamespace = sprintf(
    'page:%1$s--language:%2$s--roles:%3$s',
    wire('page')->id,
    $language ? $language->name : 'none',
    $user->roles->implode('|', 'name')
);

// a static key is safe to use now because the cache entry is namespaced
$cacheKey = 'store-listing';
$storeListing = $cache->getFor($cacheNamespace, $cacheKey);
// ...
```

{% alert 'warning' %}

Be careful when saving JSON-encoded strings through the $cache API, because ProcessWire will attempt to decode them upon retrieval. You can use [this hook](https://processwire.com/talk/topic/13342-wirecache-and-json-data-quirks/?tab=comments#comment-180789) as a workaround.

{% endalert %}

### Invalidating cached data

The example above uses `WireCache::expireDaily`, one of the [available constants](https://processwire.com/api/ref/wire-cache/#pwapi-methods-constants), to specify that the cached data is valid for up to one day. This is a simple approach that you can use if you know the data isn't going to change very frequently. The downside is that the cached output may be outdated if the content is updated. Another approach is using `WireCache::expireSave`, which expires the cache as soon as any page or template is saved. But using this on a page with very frequent updates might actually reduce performance if caches are created and expired in quick succession.

The best solution depends on a decision between precision and performance. Do you want to guarantee that you will never display outdated content, or do you want to ensure fast response times by making sure caches get used for a while before expiring? You can make that decision for each individual piece of cacheable content.

## Utilizing the browser cache

Most of the assets the browser needs to load to display your site (like scripts, stylesheets and images) are static, so they can be cached by the browser. This way, the browser only needs to load those assets once and can reuse them on subsequent requests. However, a browser needs a way to tell if it may cache a given asset. Since the browser has no way of telling if a resource is static or generated dynamically — for example, if your site comes with a dark theme and a light theme, you might use a server-side script to serve a different stylesheet depending on a cookie storing the user's preference. So caching this resource might result in incorrect results, which is why browsers are generally conservative with caching unless we tell them it's ok.

The server can inform the browser about cacheable assets using [HTTP response headers](https://developer.mozilla.org/en-US/docs/Glossary/Response_header). The [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) header tells a browser if it's ok to cache a given resource as well as how long the cached resource is valid. Sending the following response header for a stylesheet or script would allow the browser to cache that particular resource for one year:

```text
Cache-Control: public, max-age=31536000
```

You can send headers using either PHP or the Apache server. In a typical ProcessWire installation, static assets will be served directly by Apache, so for those PHP is not an option. Luckily, Apache can be configured to add different HTTP response headers depending on the type of resource it serves for a request. There are multiple methods available in Apache to add those headers. The easiest way to do so is the `ExpiresByType` directive (provided by [mod_expires](https://httpd.apache.org/docs/2.4/mod/mod_expires.html)), which adds headers based on the [MIME-type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the served document.

{% alert 'success' %}

Despite the name, `ExpiresByType` sets the `max-age` directive of the `Cache-Control` header as well as the older `Expires` header. The `Expires` header isn't strictly needed since `Cache-Control` takes precedence over it, but it doesn't do any harm either.

{% endalert %}

```apacheconf
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresDefault                          "access plus 1 day"

    # HTML
    ExpiresByType text/html                 "access plus 1 week"

    # CSS & JS
    ExpiresByType text/css                  "access plus 1 year"
    ExpiresByType text/javascript           "access plus 1 year"
    ExpiresByType application/javascript    "access plus 1 year"
    ExpiresByType application/x-javascript  "access plus 1 year"

    # Images, Videos, Media
    ExpiresByType audio/ogg                 "access plus 6 month"
    ExpiresByType image/apng                "access plus 6 month"
    ExpiresByType image/bmp                 "access plus 6 month"
    ExpiresByType image/gif                 "access plus 6 month"
    ExpiresByType image/jpeg                "access plus 6 month"
    ExpiresByType image/png                 "access plus 6 month"
    ExpiresByType image/svg+xml             "access plus 6 month"
    ExpiresByType image/webp                "access plus 6 month"
    ExpiresByType video/mp4                 "access plus 6 month"
    ExpiresByType video/ogg                 "access plus 6 month"
    ExpiresByType video/webm                "access plus 6 month"
</IfModule>
```

This snippet adds a default cache lifetime of one day to all resources, as well as some custom limits for the specified file types.

If you're including version parameters in your asset URLs (like `/css/main.css?v=[hash-or-timestamp]`), you can go one step further. Since you know that the asset won't change as long as the version parameter stays the same, you can use the `immutable` directive in your Cache-Control header. This tells the browser that this asset will never change, so it doesn't need to revalidate it at all (as long as the query string stays the same).

```apacheconf
<IfModule mod_headers.c>
    # Mark files that we can reliably use version strings for as immutable
    <FilesMatch "\.(css|js|woff2?|ttf|otf|eot)$">
        Header append Cache-Control immutable
    </FilesMatch>
</IfModule>
```

If you are *not* using query strings, you may want to use lower cache lifetimes — with the `ExpiresByType` directives above, it may take up to a year until a returning visitor receives updates to your assets!

## Serving compressed assets to reduce bandwidth usage

Client-side caching is great for returning visitors, but it doesn't do anything for the first visit. This is where *compression* can shine. By [compressing HTML, JS and CSS using GZIP or brotli](https://web.dev/reduce-network-payloads-using-text-compression/) you can reduce the amount of bytes the browser needs to download from the server, which is especially important for users with slow internet connections. There are two main approaches to serving compressed assets:

- Have Apache encode assets on-the-fly before they're sent to the client. This is easy to set up and even works with dynamically generated content (such as the HTML output of your pages). However, it only works well with GZIP, since brotli encoding takes too long to be feasible.
- Generate compressed assets in your development pipeline during the build step. This is of course more efficient, but it requires you to use a build pipeline (like Webpack, Parcel, Gulp or Grunt), which not everyone does.

Both options require some additional Apache configuration which can be done in the `.htaccess` file. On-the-fly encoding usually makes use of [mod_deflate, the Apache documentation has some useful examples](https://httpd.apache.org/docs/2.4/mod/mod_deflate.html). You can also configure Apache to serve pre-compressed assets depending on the client's `Accept-Encoding` header, this only requires [a few simple RewriteRules](https://httpd.apache.org/docs/2.4/mod/mod_deflate.html#precompressed). Make sure to understand both options. If you don't use a build pipeline, adding the DEFLATE filter is very simple and can already have a huge impact. If you are using a build pipeline, you can probably find a plugin that adds pre-compressed files to your output — like [parcel-plugin-compress](https://www.npmjs.com/package/parcel-plugin-compress) for [Parcel](https://parceljs.org/) or [compression-webpack-plugin](https://github.com/webpack-contrib/compression-webpack-plugin) for [Webpack](https://webpack.js.org/).

## Conclusion

Website optimization has many different facets, most of which are more or less important depending on what type of project you're working on. Those techniques are merely a baseline that will provide a solid performance boost to most ProcessWire sites.

With all those layers of caching, it can become cumbersome to roll out updates to your site's CSS or JavaScript. If you forget to clear even one of the caching layers, visitors might not see the updates for some time, or even see broken pages if, for example, their browser loads new HTML content but still uses an older stylesheet from the cache. To solve this problem I created the free [ProcessWire module *Cache Control*](https://modules.processwire.com/modules/process-cache-control/), which allows you to clear *all* caches with one click. This includes the template cache, the ProCache module, the `$cache` API and custom locations like the Twig template cache if you're using Twig. You can even use it to add version parameters to your assets and update the current version when you clear the cache, thereby forcing browsers to download updated assets.
