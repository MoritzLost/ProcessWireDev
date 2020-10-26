---
tags: post
layout: post
title: Integrating Twig with ProcessWire
menu_title: "Twig integration: Setup"
description: Tutorial on using Twig as a flexible view layer for ProcessWire projects.
---

# How to set up Twig as a flexible view layer for ProcessWire

ProcessWire sites can run on only PHP without any additional templating language (after all, PHP started out as a template language itself) — and it's totally fine to leave it that way. However, as a project grows in complexity, it may benefit from separating the logic (input processing, data preparation et c.) from the view (HTML output through templates). Using a dedicated template language helps you adhere to this separation of concerns, because it doesn't allow you to do all the heavy processing you can do in pure PHP. You also get some neat features for template structuring out of the box, especially template inheritance which will help you keep your code [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself).

This tutorial will show you how to create your own flexible, extendable template system with Twig and integrate it seamlessly into a ProcessWire site. Note that there is a [Twig module](https://modules.processwire.com/modules/template-engine-twig/) that includes Twig automatically, but integrating it manually requires only a couple lines of code and allows you to set up your environment and template structure exactly how you want it.

However, I will not include a general introduction to the Twig language. If you are unfamiliar with Twig, read the [Twig guide for Template Designers](https://twig.symfony.com/doc/2.x/templates.html) and [Twig for Developers](https://twig.symfony.com/doc/2.x/api.html) and then come back to this tutorial.

## Installation, file and request structure

First, install Twig with Composer (see [How to set up and integrate Composer with ProcessWire](/integrate-composer-with-processwire)):

```bash
composer require "twig/twig:^2.0"
```

Generating pages with Twig requires three steps: setting up the environment, passing all relevant variables to it and finally rendering the correct twig template for the current page. We will split those three steps across three files in the ProcessWire pipeline:

1. The environment will be mostly identical for all pages, so we can use a [prependTemplateFile](https://processwire.com/blog/posts/processwire-3.0.49-introduces-a-new-template-file-strategy/) to set it up.
2. Pages of different content types will differ the most regarding the variables that get passed to them, so we'll do most of that in the regular PHP template file for the current page (e.g. `public/site/templates/project.php` for a `project` template).
3. Rendering the correct template is always the last step, so we'll use the [appendTemplateFile](https://processwire.com/blog/posts/processwire-3.0.49-introduces-a-new-template-file-strategy/).

Make sure to set your prepend and append file in your `config.php`:

```php
$config->prependTemplateFile = '_init.php';
$config->appendTemplateFile = '_main.php';
```

## Step 1: Set up the Twig environment

Twig needs two things to run: A `FileSystemLoader` with the path to your templates and an `Environment` to render them. Since the Twig templates shouldn't be publicly accessible, we can put them outside the webroot. I already have a `src` directory for PHP code, so I'll add my Twig template folder right next to it. The directory structure will look like this:

```text
.
├── composer.json
├── composer.lock
├── public
│   └── ...
├── src
│   ├── php
│   ├── twig
│   └── ...
└── vendor
```

Now, initialize the `FileSystemLoader` in the prepend template file `_init.php`.

```php
// public/site/templates/_init.php
$config->twigDirectory = $config->paths->root . '../src/twig';
$twigLoader = new \Twig\Loader\FilesystemLoader($config->twigDirectory);
```

Then set up the environment.

```php
// public/site/templates/_init.php
$twigEnvironment = new \Twig\Environment(
    $twigLoader,
    [
        'cache' => $config->paths->cache . 'twig',
        'debug' => $config->debug,
        'auto_reload' => $config->debug,
        'strict_variables' => false,
        'autoescape' => true,
    ]
);
if ($config->debug) {
    $twigEnvironment->addExtension(new \Twig\Extension\DebugExtension());
}
```

There are a couple of options to consider here.

- Make sure to include a cache directory, or Twig can't cache the compiled templates.
- You can tie the development settings (`debug`, `auto_reload`) to the ProcessWire debug mode, so we can toggle "development mode" with a single config variable. The code above also adds the Debug Extension when `$config->debug` is active (which includes the super convenient [dump function](https://twig.symfony.com/doc/2.x/functions/dump.html)).
- For ProcessWire projects specifically, I recommend working with [strict_variables](https://twig.symfony.com/doc/2.x/api.html#environment-options) off, since this makes it much easier to check for non-existing and non-empty fields with some parts of the ProcessWire API.
- You need to decide on an escaping strategy. You can either use the autoescape function of twig, or use textformatters to filter out HTML tags. Just don't use both, as it will double escape entities, which will result in a broken frontend. I prefer Twig's inbuilt autoescaping, as it's more secure and I don't have to add the HTML entities filter to every single field. This means pretty much no field should use any entity encoding textformatter.

---

While you can add variables to be passed to the twig templates inside your PHP templates, pretty much all pages will need access to some of ProcessWire's API variables like `$page`, `$config` and `$user`, so we'll add those as globals in the `_init.php`. We'll also initialize an empty array to hold additional variables added by the individual PHP templates.

```php
// public/site/templates/_init.php

// add all important API variables as globals to the environment
foreach (['page', 'pages', 'config', 'user', 'languages', 'sanitizer'] as $variable) {
    $twigEnvironment->addGlobal($variable, wire($variable));
};

// some more handy shortcuts
$twigEnvironment->addGlobal('homepage', $pages->get($config->rootPageID));
$twigEnvironment->addGlobal('settings', $pages->get('/site-settings/'));

// this will hold template data
$variables = [];
```

This includes the most common API variables from ProcessWire, but not all of them. You could also just iterate over all fuel variables and add them all, but I prefer to include only those I will actually need in my templates. The "settings" variable I'm including is simply one page that holds a couple of common settings specific to the site, such as the site logo and site name.

## Step 2: Perform logic and pass data in PHP templates

After the `_init.php` with the environment setup is finished, ProcessWire will load the appropriate PHP template for the current page. Since we're using Twig to output the actual markup, the PHP template will only include logic and preprocessing that is required for the current page. For example, if you have a template `projects-index` where you want to show a list of all your projects, you can query the ProcessWire API for all pages to show inside the PHP template. This is also the place to perform logic, like handling user input. For instance, parsing filter parameters in the URL so the visitor can filter projects by category.

The code below handles a numeric "category" filter that gets passed as a URL parameter in form of the page ID of the selected category. Then it finds all projects under the current page in the page tree, optionally filtered by the selected category.

```php
// public/site/templates/projects-index.php

// by default, find all project pages
$projectsSelector = 'template=project';

// parse and sanitize the URL parameter as a category page id
$category = $input->get('category');
$sanitizedCategory = $category ? (int) $sanitizer->digits($category) : null;

// try to find the category page, only apply the filter if it exists
$categoryPage = $sanitizedCategory ? $pages->get($sanitizedCategory) : null;
if ($category && $categoryPage->id){
    // add the category filter to the selector
    $projectsSelector .= ", category={$categoryPage}";
    // pass the selected category to the twig template
    $variables['selectedCategory'] = $categoryPage;
}

// find all projects to display
$variables['projects'] = $page->children($projectsSelector);
```

## Step 3: Render the appropriate Twig template

Now that we have set up the environment and have added the relevant data to the `$variables` array, all that's left it to actually render the Twig template inside the `_main.php`, which will be included by ProcessWire after the PHP template (`projects-index`). Consider the following code:

```php
$templateFile = 'pages/page--' . $page->template->name . '.twig';
$twigTemplate = file_exists($config->twigDirectory . '/' . $templateFile)
    ? $templateFile
    : 'pages/page.twig';
echo $config->twigEnvironment->render($twigTemplate, $variables);
```

This function checks if a specific template for the current content type exists (e.g. `pages/page--projects-index.twig`) and falls back to the default page template if it doesn't (e.g. `pages/page.twig`). This way, each content type on your site can have its own entry point (the Twig template) where you have total freedom over how to structure your markup.

## Create an HTML skeleton in the default page template

If a template doesn't have a specific Twig template, the default page template will be rendered (`pages/page.twig`). This is a good place to define the HTML skeleton that will be the basic structure for most of our pages. Other page templates can then extend this base template and override only the parts they want to change. This will make heavy use of [template inheritance](https://twig.symfony.com/doc/2.x/tags/extends.html), so make sure you understand how that works in Twig.

{% raw %}
```twig
{# pages/page.twig #}

<!doctype html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}{{ '%s | %s'|format(page.get('title'), homepage.title) }}{% endblock %}</title>

    {% block styles %}
        <link rel="stylesheet" type="text/css" href="{{ config.urls.site }}css/main.css?v={{ config.themeVersion }}">
    {% endblock %}

    {% block scripts%}
        <script src="{{ config.urls.site }}js/main.js?v={{ config.themeVersion }}" defer></script>	
    {% endblock %}

    {% block seo %}{{ include("components/seo.twig") }}{% endblock %}
</head>

<body class="{{ page.template }} page-{{ page.id }}">
    {% block navigation %}{{ include("components/navigation.twig") }}{% endblock %}

    {% block header %}{{ include("components/header.twig") }}{% endblock %}

    {% block before_content %}{% endblock %}

    {% block content %}
        {# Most page content will go here #}
    {% endblock %}

    {% block after_content %}{% endblock %}

    {% block footer %}{{ include("components/footer.twig") }}{% endblock %}
</body>
</html>
```
{% endraw %}

All layout regions (`header`, `footer`, `content` et c.) are defined as twig blocks, so each page template can override them individually, without having to touch those it doesn't need. Most templates will only need to override the `content` block. Note that I don't do most of the actual html markup in the base page template, but in individual components (e.g. `components/header.twig`) that can be reused across content types. This will be a recurring pattern. At this point, you can start building those default components and they will be included on every page.

On the `projects-index` page, we want to output the list of projects that was passed to Twig in the PHP template.

{% raw %}
```twig
{# pages/page--projects-index.twig #}

{% extends "pages/page.twig" %}

{% block content %}
    <ul class="project-list">
        {% for project in projects %]
            <li class="project-list__item">
                {{- project.title -}}
            </li>
        {% endfor %}
    </ul>
{% endblock %}
```
{% endraw %}

This template demonstrates the real benefit of this long setup: We only have to include the actual, real content that is unique to the current page, without writing boilerplate code with repeating HTML structures or a long list of included components. That said, if you want a blank slate for a specific content type, you can just write a Twig template that *doesn't* extend `pages/page.twig`, and you will get a blank page ready to be filled with whatever you want.

## Create a base template for content sections

Now that we have a solid foundation, we can add layout components very easily. We can go one step further and define a basic "section" template that will be the basis for the content sections we assemble pages from. Those sections can then be reused across content types. For example, a "Recent news" section might appear on the homepage as well as all news pages.

The approach will be the same as with the page template itself. We create a base template that includes some boilerplate HTML for recurring markup (such as a container element to wrap the section content in) and defines blocks that can be overwritted by section-specific templates. How that base template is structured and what blocks you define in it depends on the site you're building. I'll give an example of a section template with a main content, an optional headline and a background colour.

{% raw %}
```twig
{# sections/section.twig #}

{#-
 # This is the base section template. Individual section templates can extend
 # this to avoid repeating section boilerplate code (section markup,
 # headline, CSS container, background color, et c.).
 # 
 # @var string Headline     An optional headline for this section.
 # @var string background   The background theme color as a string (see SCSS for corresponding color codes). Default = white.
 # @var string id           An optional ID for this section
 # @var array classes       Classes to add to the section wrapper.
 -#}

{% set section_headline = headline|default(null) %}
{% set section_background = background|default('white') %}
{% set section_id = id|default(null) %}
{% set section_classes = classes|default([])|merge([
    'section',
    'section--' ~ section_background
]) %}

<section class="{{ section_classes|implode(' ') }}"
    {%- if section_id %} id="{{ section_id }}"{% endif %}>
    {% block section_container %}
        <div class="container">
            {% block section_headline %}
                {% if section_headline %}
                    <h2 class="section__headline">
                        {{- section_headline -}}
                    </h2>
                {% endif %}
            {% endblock %}
            {% block section_content %}{% endblock %}
        </div>
    {% endblock %}
</section>
```
{% endraw %}

{% alert 'info' %}

Note that if you are creating sections based on a Repeater Matrix field with different section types, the available options and defaults will be slightly different. I will cover this technique in a later tutorial.

{% endalert %}

As you can see, this section template doesn't output any content on its own. Instead, it defines a `section_content` block that the extending template can then fill with content, as well as some parameters for common aspects of content sections (headline, background color, et c.). Here's what the corresponding SCSS can look like (note that I left out the `container` class, which is [borrowed from Bootstrap](https://getbootstrap.com/docs/4.3/layout/overview/#containers)):

```scss
// _variables.scss
$section-backgrounds: (
    "white": #fff,
    "gray": #f8f9fa,
    // ...
);
$section-padding: 5vw;
$section-headline-margin: 1.5rem;

// _sections.scss
.section {
    padding-top: $section-padding;
    padding-bottom: $section-padding;

    @each $color, $value in $section-backgrounds {
        &--#{$color} {
            background: $value;
        }
    }

    &__headline {
        margin-bottom: $section-headline-margin;
    }
}
```

With the base template defined like this, we can create all sorts of content sections that only have to worry about their own content. For example, here's a section template for a "downloads" section that takes a single `Pagefiles` field as a parameter and displays the files as a list of download links.

{% raw %}
```twig
{# sections/section--download.twig #}

{#-
 # @var Pagefiles files     The Pagefiles field with the downloads for this section.
-#}

{% extends "sections/section.twig" %}

{% block section_content %}
    <ul class="downloads">
        {% for download in files %}
            <li class="downloads__row">
                <a href="{{ download.file.url }}" download class="downloads__link">
                    {{- download.description ?: download.basename -}}
                </a>
            </li>
        {% endfor %}
    </ul>
{% endblock %}
```
{% endraw %}

To tie it all together, here is part of a `project` template that has a `downloads` field that is displayed using the template above.

{% raw %}
```twig
{# pages/page--project.twig #}

{% extends "pages/page.twig" %}

{% block content %}
    {# ... #}
    {{ include('sections/section--downloads.twig', {
        files: page.downloads,
        headline: "Downloads for this project",
        background: "light",
        classes: ['section-project-downloads'],
    }) }}
    {# ... #}
{% endblock %}
```
{% endraw %}

## Conclusion

This first part of the Twig integration tutorial was mostly about a clean environment setup and template structure. By creating sensible base templates on multiple levels (pages, sections) and reusing them across pages, you pretty much never need to worry about boilerplate HTML, container classes et c. This will be especially useful if your pages are created with a Repeater Matrix field, where each Repeater Matrix element corresponds to a section, this technique will be covered in a later tutorial.
