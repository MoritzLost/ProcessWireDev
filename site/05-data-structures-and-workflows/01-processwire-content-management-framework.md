---
tags: post
layout: post
title: Content strategies for the ProcessWire framework
menu_title: "Content strategies: Utilizing the framework"
description: Learn how to utilize the ProcessWire framework with diverse strategies for content structure.
---

# Customize everything: Using ProcessWire as a Content Management Framework

With ProcessWire, you can output your content in whatever way you want to. Want to write traditional PHP templates that generate HTML? No problem. Need a headless CMS for a JavaScript Single-Page-Application? Simply change the `Content-Type` header to `application/json` [through the template settings](https://processwire.com/docs/start/structure/templates/#other-page-settings-managed-by-templates) and output JSON, easy. ProcessWire truly is API-first – though the API is PHP-based instead of HTTP-based, unlike a pure headless CMS like [Contentful](https://www.contentful.com). That allows you to build anything you want as long as you can develop it with PHP.

This post is about adopting a mindset of flexibility in regards to how you want to structure your site and make things easier for you. The key is to understand ProcessWire as a Content Management **Framework** (CMF) which allows you to customize, basically, anything.

## Pages as containers for content

For ProcessWire, everything can be a page. That includes the normal pages in the frontend that visitors will be able to see, but also other content such as taxonomies and users. Even settings can be structured as pages. This may feel counterintuitive at first, but it makes sense if you think of pages as *content containers* instead. Having everything be a page has the advantage that the API is super simple to use. It also allows you to use ProcessWire's built-in access control for pages to allow different user roles editorial access to different contents.

Pages don't need to be visible to visitors by themselves. To make all pages of a template unviewable, simply don't include a corresponding PHP template in your templates folder. This way, those pages will act as data containers only. You can then query those pages for data on other (visible) pages.

For example, let's consider a registry of companies (template `company`) that contains a list of all branch offices. Each company has it's own page in the frontend that lists all the branch offices. This data structure could be handled with a [repeater field](https://processwire.com/docs/fields/repeaters/) `offices` containing names and addresses. The page tree will look like this (with URLs in parenthesis):

```text
- Companies (/companies/)
    - Company X (/companies/company-x/)
    - Company Y (/companies/company-y/)
    - Company Z (/companies/company-z/)
    - ...
```

In this case, all information on each company (including it's branch offices) is collected on the company page. However, requirements change. If you instead add another template `branch-office` and represent individual branch offices as individual pages, this will allow you to later add frontend pages for each branch office as well, by just adding a PHP template for the `branch-office` template – without having to migrate any data. In this case, the page tree will have one more level of hierarchy:

```text
- Companies (/companies/)
    - Company X (/companies/company-x/)
        - Branch Office #1 (/companies/company-x/branch-office-1/)
        - Branch Office #2 (/companies/company-x/branch-office-2/)
        - ...
    - Company Y (/companies/company-y/)
        - ...
    - Company Z (/companies/company-z/)
        - ...
    - ...
```

Keep in mind that while each branch office will have a unique path within the system this way, those aren't necessarily publicy accessible. If you don't include the corresponding template (`branch-office.php`), ProcessWire will have nothing to render for those pages, so going to `example.com/companies/company-x/branch-office-1/` will simply show a 404 page. But you can still query that data, for example to show a list of branch offices in the company template:

{% raw %}
```twig
{# src/twig/pages/page--company.twig #}

<ul class="branch-offices">
    {% for office in page.children('template=branch-office') %}
        <li class="branch-offices__item">
            <h3 class="branch-offices__headline">
                {{- office.title -}}
            </h3>
            <p class="branch-offices__address">
                {{- office.address -}}
            </p>
        </li>
    {% endfor %}
</ul>
```
{% endraw %}

<small class="sidenote sidenote--info">

Confused by the Twig template syntax? Check out the [tutorial on integrating Twig](/twig-processwire-setup/)!

</small>

## Global site options

Another useful technique is to collect site-wide options (such as the site name and logo) into a singular template with only one instance page and make that available globally. This way, you can expose site settings you want your editors to be able to change through the ProcessWire API (as opposed to defining those statically in your `config.php`, for example).

To get started, create a `settings` template and set it to allow only one page in the family options. Then, create the new settings page and take note of it's ID. In order to be able to find that page, you can specify the page ID in your config file:

```php
$config->settingsPageId = 1234;
```

Now you can access the settings page using this ID from anywhere:

```php
$settings = wire('pages')->get(wire('config')->settingsPageId);
```

Every time you need to define a site option, you can add it as a new field to the settings page. For example, if you have added a field for the site name (`site_name`):

{% raw %}
```twig
{# src/twig/html.twig #}
<title>
    {{- '%1$s | %2$s'|format(page.title, settings.site_name) -}}
    {#-
     # This assumes the settings page is added as a
     # global "settings" variable to the Twig environment.
     -#}
</title>
```
{% endraw %}

## Taxonomy pages

When starting out with ProcessWire, it's easy to fall into the trap of using [Select Options](https://processwire.com/docs/fields/select-options-fieldtype/) fields for page options with a limited, pre-defined set of possible values. Taxonomies such as categories or tags are a perfect example of this. The downside of having all possible values defined in the field options is that editors can't change them independently (alongside with a couple of other issues, including limited API access). A better representation for taxonomies are page templates. Usually you'll want to create two templates for a new taxonomy. Using post categories for a blog as an example:

- One `category` template that only needs a title. Each category page will represent one post category, so there will be multiple category pages such as *News*, *Events*, et c.
- One template that is the root page of the `category` pages in the page tree. I like to name those `category-index`, predictably.

You'll want to set the `category-index` template to allow only one page, and only allow `category` pages as children. Likewise, category pages will allow only the `category-index` template as the parent page. If you want to create a hierarchical taxonomy, you could also allow category pages as children of other category pages.

After you have created some categories, the page tree will look like this:

```text
- Categories (/categories/)
    - News (/categories/news/)
    - Events (/categories/events/)
    - ...
```

Now it's easy to add a category option to other templates (for example, a `post` template for blog posts). Simply create a page reference field allowing only `category` pages as values. This field can be called `categories` (this name makes sense if you want to allow multiple categories on a post). API usage then becomes straightforward:

```php
// get all selected categories of the current post
$categories = $page->categories;

// get all available options, e.g. to build a category filter
$categoryIndex = $pages->get('template=category-index');
$allCategories = $categoryIndex->children('template=category');
```

This is a bit more work than simply using a select field with predefined options, but it's more flexible in the long term. Notable, it allows you to add category feeds showing only posts that have a particular category by simply adding the `category.php` template.

## Conclusion: Content approaches

For many common problems, there's usually a preferred way of solving them within the CMS you're using. Using taxonomies (categories, tags) as an example, WordPress comes with both `categories` and `tags`, so you don't have to add them on your own. Trouble arises when the concept that the CMS has of the problem doesn't quite fit your use-case, or you simply want something different. Then you're stuck either building your own parallel system, which likely won't integrate into the existing interface quite as nicely, or to adjust the behaviour of the built-in system through hooks or plugins. There's a trade-off here between flexibility and out-of-the-box behaviour.

ProcessWire mostly sidesteps this problem by only defining basic building blocks of content containers (i.e. the concepts of *pages* and *fields*) and allowing you to define your own content categories and relationships (i.e. *templates* with their corresponding *fieldgroups*). It definitely is a bit more work to create something like a taxonomy system, but it's usually worth it if you're building anything larger than a small blog.

One measure of a good CMS is how much – as I like to call it – *ideology* you have to swallow to get started. For Drupal development, you first have to understand the it's concept of *Entities*, *Nodes*, *Schemas* and much more before you can work with it productively. With ProcessWire, that overhead is much smaller. The *ProcessWire way* to structure content is pretty much always to have specific templates as content containers, and then either output them directly in their corresponding template, or use the API to retreive and display their data in various places. So go ahead and structure your content in a way that makes sense to you, the developer than comes after you, and – of course – the people that have to work with the site.
