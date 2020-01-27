---
tags: post
layout: post
title: "Utilizing the Content Management Framwork"
---

# Customize everything: Using ProcessWire as a Content Management Framework

ProcessWire is a hybrid CMS in that you output it's contents in whatever way you want to. Want to write traditional PHP templates that generate HTML? No problem. Need a headless CMS for a JavaScript SPA? Simply change the `Content-Type` header to `application/json` and output JSON, easy. ProcessWire truly is API-first – though the API is a PHP-based instead of HTTP-based, unlike pure headless CMS like [Contentful](https://www.contentful.com). That allows you to build anything you want as long as you can develop it with PHP.

This post is about adopting this mindset of flexibility in regards to how you want to structure your site and make things easier for you. The key is to understand ProcessWire as a Content Management **Framework** (CMF) which allows you to customize, basically, anything.

## Pages as containers for content

For ProcessWire, basically everything is a page. The includes the normal pages in the frontend that visitors will be able to see, but also other content such as taxonomies and users. Even settings can be structured as pages. This has the advantage that the API is super simple to use. It also allows you to use ProcessWire's built-in access control for pages to contol which user roles have access to what.

Pages don't need to be visible to visitors by themselves. To make all pages of a template unviewable, simply don't include a corresponding PHP template in your templates folder. This way, those pages will act as data containers without their own pages in the frontend. You can then query those pages for data on other pages.

For example, let's consider a registry of companies (template `company`) that contains a list of all branch offices. Each company has it's own page in the frontend that lists all the branch offices. This data structure can be handled with a [repeater field](https://processwire.com/docs/fields/repeaters/) `offices` containing names and addresses. The page tree will look like this (with URLs in parenthesis):

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

<small class="sidenote sidenote--info">

Confused by the Twig template syntax? Checkout the [tutorial on integrating Twig](/twig-processwire-setup/)!

</small>

## Global site options

## Taxonomy pages

## Options as pages

## Customize everything



- Mindset: Customizing the CMF
    - Use ProcessWire as a CMF, not a CMS
- "Pages" are containers for content
    - Global site settings page
        - logo, site name, translations
        - config->settingsPageId
    - Categories, Tags et c. as pages WITHOUT template
    - Options as pages
- Customize everything
    - E.g. putting JS & CSS in sites/ directory
    - Template language: Integrate Twig if you want to
