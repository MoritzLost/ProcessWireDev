---
tags: post
layout: post
title: Resubable content sections with Repeater Matrix
menu_title: Content sections using Repeater Matrix
description: How to create flexible content sections using the Repeater Matrix module for ProcessWire.
---

# Create flexible content sections using Repeater Matrix fields and Twig

Most modern sites don't have fixed layouts with fixed fields, but instead need to support modular content creation – multi-column layouts with text and images, accordions, image galleries, downloads, and more. To do this with ProcessWire we need a field structure for repeatable sets of fields and a solid template structure in Twig that makes it easy to add new sections. For the field setup, the commercial [Repeater Matrix](https://processwire.com/store/pro-fields/repeater-matrix/) module is the go-to approach to create dynamic content sections. For the output, this guide will demonstrate a scalable Twig template structure that will work as a baseline to add your own custom sections to.

## Creating the Repeater Matrix field

The Repeater Matrix module allows you to create a single repeatable field that will hold all the content sections. In the field, you define *types* of sections and the fields you need for them. For example, a *Gallery* section usually consists of either a multi-value image field or a repeater which in turn contains an image and a subline field. A *Call-to-Action Button* section may need a URL field for the target URL and a text field for the button label. Besides that, you may want to include some fields that are shared between all section types. For this example, each of my sections will have a `headline` and a `background`. Headline is an optional text field, background will be a [Select Options](https://processwire.com/docs/fields/select-options-fieldtype/) field with a couple of preset values.

All types of sections are defined inside this single Repeater Matrix field. Then the Repeater Matrix field can be added to any template that you want to have dynamic content sections. This way, when you add a new section it is immediately available on all templates that use your sections field.

If you want to work alongside this tutorial, go ahead and create your Repeater Matrix field now. I'll call my field `sections`. Make sure to create at least one or two section types as well.

## Creating a base template for a section

Most sections have some markup in common. In my case, most of my sections will be wrapped in a `<section>` tag with a class corresponding to the selected `background`. Inside that I want to have an `<h2>` with the section's `headline` (if any) and a container element, so each section's content starts out aligned to the grid. However, each of those aspects might need to change for individual sections (for example, some sections could be full-width, so they wouldn't need a container). This is where the power of [template inheritance](https://twig.symfony.com/doc/3.x/tags/extends.html) in Twig comes in handy. The base template can define several blocks which any extending template can optionally override. This way, we get sensible defaults without having to copy-and-paste a bunch of `include` statements in all our templates, but while retaining complete flexibility.

Here's an example of a section base template with those requirements:

{% raw %}
```twig
{# sections/section.twig #}

{% set section_classes = classes|default([])|[
    'section',
    section.type ? 'section--' ~ section.type,
    section.background.first.value ? 'section--' ~ section.background.first.value
] %}

<section class="{{ section_classes|filter(c => c is not empty)|join(' ') }}">
    {% block section_before_container %}{% endblock %}
    {% block section_container %}
        <div class="container">
            {% block section_headline %}
                {% if section.hasField('headline') and section.headline %}
                    <h2 class="section__headline">
                        {{- section.headline -}}
                    </h2>
                {% endif %}
            {% endblock %}
            {% block section_content %}
                {{ section.type }}
            {% endblock %}
        </div>
    {% endblock %}
    {% block section_after_container %}{% endblock %}
</section>
```
{% endraw %}

As you can see, the base template defines multiple blocks (some of them empty by default!) that can be overriden in extending templates. Note that the background field is just rendered as a class based on the selected value. The actual styling can be done in CSS.

## Individual section templates

Now let's look at one of those extending templates. For example, consider a `downloads` section with a multi-value file upload field (`download_files`) as well as the common `headline` and `background` fields.

{% raw %}
```twig
{# sections/section--download.twig #}

{% extends "sections/section.twig" %}

{% block section_content %}
    <ul class="downloads">
        {% for download in section.download_files %}
            <li class="downloads__row">
                <a href="{{ download.file.url }}" download class="downloads__link">
                    {{ download.description ?: download.basename }}
                </a>
            </li>
        {% endfor %}
    </ul>
{% endblock %}
```
{% endraw %}

As you can see, this template only needs to concern itself with its own markup. There is zero boilerplate code that will have to be copy-and-pasted. This way, you can change the structure of your sections in one place (the section base template) and it will be immediately reflected in all your sections.

But what if you want to change override some aspect of the base template. For example, let's say you wanted the download section's headline to be an `<h3>` instead of an `<h2>`. With the block system, this is trivial:

{% raw %}
```twig
{# sections/section--download.twig #}

{% extends "sections/section.twig" %}

{% block section_headline %}
    {% if section.headline %}
        <h3 class="section__headline">
            {{- section.headline -}}
        </h3>
    {% endif %}
{% endblock %}
```
{% endraw %}

By the way, if you have some sections that require a completely different HTML structure, you don't *have* to extend the base template. This way, you can still get a clean slate for some sections if you want to.

## A template to render all sections at once

Now we have simple, readable templates for each section type. But in order to use them in a page template, you still have to iterate over each Repeater Matrix item on the page and include the appropriate section template. That step can be abstracted away in a template as well. Here's a template that just takes the section field from a page as a parameter, iterates through the sections and includes the appropriate template for each.

{% raw %}
```twig
{# components/sections.twig #}

{% for section in sections %}
    {% set type = section.type %}
    {% set template = 'sections/section--' ~ type ~ '.twig' %}
    {{
        include(
            [template, 'sections/section.twig'],
            {
                section: section,
                section_type: type,
                section_position: loop.index
            },
            with_context = false
        )
    }}
{% endfor %}
```
{% endraw %}

This approach requires that your section templates use a predictable naming scheme based on the type. In this case, the `downloads` section type corresponds to the template name `section--downloads.twig`. Note that the array syntax in the include function tells Twig to render the first template that exists. So if a specific template for a section type does not exists, it will fallback to the generic `sections/section.twig`. This way, when you add a new section type, you will not get a fatal error because of a missing template. Instead, the new section type will just render with the base section template, which displays the section type inside the `section_content` block.

## Rendering sections in a page context

Now all that's left is to include that template in a page context. Since most page types will use content sections, it makes sense to put this in the base page template (see [Create an HTML skeleton in the default page template](/twig-processwire-setup/#create-an-html-skeleton-in-the-default-page-template)).

{% raw %}
```twig
{% block content %}
    {% if page.hasField('sections') and page.sections.count %}
        {{ include('components/sections.twig' }}
    {% endif %}
{% endblock %}
```
{% endraw %}

Note the check for `page.hasField('sections')`, this makes sure that the `sections` template will only be included if the current page has the `sections` field. Of course, the content block can still be overridden inside any page template, so you can still add stuff before or after your sections or include them in a different place.

### Conclusion

This setup enables a flexible, module-based approach to content editing, where content is created in terms of different section types. Because the Repeater Matrix field is only concerned with content, the markup and styling can be adjusted for all sections of a particular type at any time. The killer feature provided by Twig is template inheritance: Being able to define a base template (`section.twig`) that contains common markup while still having full flexibility in individual section templates. This makes it super easy to add new sections, even ones that don't adhere to the pre-defined section structure provided by the base template.
