---
tags: post
layout: post
title: "Utilizing the Content Management Framwork"
---

# Customize everything: Using ProcessWire as a Content Management Framework

ProcessWire is a hybrid CMS in that you can output your content in whatever way you want to. Want to write traditional PHP templates that generate HTML? No problem. Need a headless CMS for a JavaScript SPA? Simply change the `Content-Type` header to `application/json` and output JSON, easy. ProcessWire truly is API-first – though the API is a PHP-based instead of HTTP-based, unlike pure headless CMS like [Contentful](https://www.contentful.com). That allows you to build anything you want as long as you can develop it with PHP.

This post is about adopting this mindset of flexibility in regards to how you want to structure your site and make things easier for you. The key is to understand ProcessWire as a Content Management **Framework** (CMF) which allows you to customize, basically, anything.

## Pages as containers for content

For ProcessWire, everything can be a page. That includes the normal pages in the frontend that visitors will be able to see, but also other content such as taxonomies and users. Even settings can be structured as pages. This may feel counterintuitive at first, but it makes sense if you think of pages as *content containers* instead. Having everything be a page has the advantage that the API is super simple to use. It also allows you to use ProcessWire's built-in access control for pages to contol which user roles can edit which contents.

Pages don't need to be visible to visitors by themselves. To make all pages of a template unviewable, simply don't include a corresponding PHP template in your templates folder. This way, those pages will act as data containers without their own pages in the frontend. You can then query those pages for data on other pages.

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

To get started, create a `settings` template and set it to allow only one page in the family options. Then, create the new settings page and note the ID. In order to be able to find that page, you can specify the page ID in the config:

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
    {{ '%1$s | %2$s'|format(page.title, settings.site_name) }}
    {#
     # This assumes the settings page is added as a
     # global "settings" variable to the Twig environment.
     #}
</title>
```
{% endraw %}

## Taxonomy pages

When starting out with ProcessWire, it's easy to fall into the trap of using [Select Options](https://processwire.com/docs/fields/select-options-fieldtype/) fields for page options with a limited, pre-defined set of possible values. Taxonomies such as categories or tags are a perfect example of this. The downside of having all possible values defined in the field options is that editors can't change them independently (alongside with a couple of other issues, including limited API access). Instead, those taxonomies can be created as page templates. Usually, you'll want to create two templates for a new taxonomy. Using post categories for a blog as an example:

- One `category` template that only needs a title. Each category page will represent one post category, so there will be multiple category pages such as *News*, *Events*, et c.
- One template that is the root of the `category` pages in the page tree. I like to name those `category-index`, predictably.

You'll want to set the `category-index` template to allow only one page, and only allow `category` pages as children. Likewise, category pages will allow only the `category-index` template as the parent page. If you want to create a hierarchical taxonomy, you could also allow category pages as children of other category pages.

After you have created some categories, the page tree will look like this:

```text
- Categories (/categories/)
    - News (/categories/news/)
    - Events (/categories/events/)
    - ...
```

Now it's easy to add a category option to other template (for example, a `post` template for blog posts). Simply create a page reference field allowing only `category` pages as values. This field can be called `categories` if you want to allow multiple categories on a post.

This is a bit more work than simply using a select field with predefined options, but it's more flexible in the long term. Notable, it allows you to add category feeds listing only posts having a particular category by simply adding the `category.php` template.

## Customize everything

- Customize everything
    - E.g. putting JS & CSS in sites/ directory
    - Template language: Integrate Twig if you want to
