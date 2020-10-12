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

Both the template cache and the ProCache module represent an all-or-nothing approach to caching which won't work for highly dynamic sites with many moving parts. In this case, you need a more granular approach which allows you to cache only selected parts of the output to a cache. ProcessWire provides a general-purpose database cache through the [$cache API](https://processwire.com/api/ref/wire-cache/) for this purpose. The cache API can be used as a key-value store to store strings like partial output from your templates or serializable data objects which are CPU-intensive to compute or require a lot of database queries. By caching those values, the template can essentially skip some sections and use cached values for those instead.

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

When using the $cache API, you have to make sure not to access the wrong piece of data from the cache. For example, let's say the `store-listing.php` displays a list of all locations beloging to the current store page, so the list of location on the pages `/stores/brand-a/` and `/stores/brand-b/` would be completely different. The snippet above would produce incorrect results in this case, because the cache key `'store-listing'` is identical in both cases, so the cached results from `/stores/brand-a/` might be displayed on `/stores/brand-a/` or vice versa. The solution to this is to vary your cache keys by all factors that the cached content depends on. For example:

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

You should only make the cache keys as granular as you need them to be, as it will increase the amount of cache hits. For example, if the store listing above does *not* depend on the current page, the cache could be reused across different pages, so varying the cache key by page ID would only store unnecessary duplicate entries in the cache table.

You can also define your own function or class acting as an adapter that automatically adds a namespace to the cache key based on the most common factors. Using namespaces allows you to very easily make cache keys vary by multiple factors. This way, you don't have to worry too much about collisions, unless your output also depends on URL parameters, cookies, session data and so on.

```php
// build a namespace string that varies by page, language and user role(s)
$user = wire('user');
$language = $user->language;
$cacheNamespace = sprintf(
    'page:%1$s--language:%2$s--roles:%3$s',
    wire('page')->id,
    $language ? $language->name : 'unknown',
    $user->roles->implode('|', 'name')
);

// a static key is safe to use now because the cache entry is namespaced
$cacheKey = 'store-listing';
$storeListing = $cache->getFor($cacheNamespace, $cacheKey);
// ...
```

<small class="sidenote sidenote--warning">

Be careful when saving JSON-encoded strings through $cache API, because ProcessWire will attempt to decode them upon retrieval. You can use [this hook](https://processwire.com/talk/topic/13342-wirecache-and-json-data-quirks/?tab=comments#comment-180789) as a workaround.

</small>

### Invalidating cached data

The example above uses `WireCache::expireDaily`, one of the [available constants](https://processwire.com/api/ref/wire-cache/#pwapi-methods-constants), to specify that the cached data is valid for up to one day. This is a simple approach that you can use if you know the data isn't going to change very frequently. The downside is that the cached data may be outdated if the content is displayed is updated. Another approach is using `WireCache::expireSave`, which expires the cache as soon as any page or template is saved. But using this on a page with very frequent updates might actually reduce performance if caches are created and expired in quick succession.

The best solution depends on a decision between precision and performance. Do you want to guarantee that you will never display outdated content, or do you want to ensure fast response times by making sure caches get used for a while before expiring? You can make that decision for each indidividual piece of cacheable content.

## Utilizing the browser cache

- htacces rules for caching & compression (or: precompressed assets?)

## Conclusion

- clear all caches (link to ProcessCacheControl)
