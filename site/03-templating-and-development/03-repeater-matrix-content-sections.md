---
tags: post
layout: post
title: Content sections with Repeater Matrix
---

# Content sections with Repeater Matrix and Twig

Most modern sites don't have fixed layouts with fixed fields, but instead need to allow for dynamic content – multi-column layouts with text and images, accordions, image galleries, downloads, and more. To do this with ProcessWire we need a field structure that allows for repeatable sets of fields and a solid template structure in Twig that makes it easy to add new sections. For the field structure, the commercial [Repeater Matrix](https://processwire.com/store/pro-fields/repeater-matrix/) module is the go-to approach to create dynamic content sections. For the output, this guide will demonstrate a scalable Twig template structure that will work as a baseline to add your own custom sections to.

## Creating the Repeater Matrix field

The Repeater Matrix module allows you to create a single repeateable field that will hold all the content sections. In the field, you define *types* of sections and the fields you need for them. For example, a *gallery* section usually consists of either a multi-value image field or a repeater which in turn contains an image and a subline field. A *Call-to-Action Button* section may need URL field for the target URL and a text field for the button label.

All types of sections are defined inside this single Repeater Matrix field. Then the Repeater Matrix field can be added to any template that you need to include dynamic content sections. This way, when you add a new section it is immediately available on all templates that use your sections field.




--- Old tutorial below

(this is not the focus of this tutorial, [here's a detailed explanation](https://digitalardor.com/articles/basic-setup-for-content-blocks-in-processwire/)). The module does have it's own built-in template file structure to render it's blocks, but since it won't work with my Twig setup, I'll create some custom twig templates for this. The approach will be the same as with the page template itself: create a "base" section template that includes some boilerplate HTML for recurring markup (such as a container element to wrap the section content in) and defines sections that can be overwritted by section-specific templates. First, let's create a template that will iterate over our the Repeater Matrix field (here it's called `sections`) and include the relevant template for each repeater matrix type:

{% raw %}
```twig
{# components/sections.twig #}

{% for section in sections %}
    {% set type = section.type %}
    {% set template = 'sections/section--' ~ type|replace({'_': '-'}) ~ '.twig' %}
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

Note that the array syntax in the include function tells Twig to render the first template that exists. So for a section called `downloads`, it will look look for the template `sections/section--downloads.twig` and fallback to the generic `sections/section.twig`. The generic section template will only include the fields that are common to all sections. In my case, each section will have a headline (`section_headline`) and a select field to choose a background colour (`section_background`):

{% raw %}
```twig
{# sections/section.twig #}

{% set section_classes = [
    'section',
    section.type ? 'section--' ~ section.type,
    section.section_background.first.value ? 'section--' ~ section.section_background.first.value
] %}

<div class="{{ section_classes|join(' ')|trim }}">
    <section class="container">
        {% block section_headline %}
            {% if section.section_headline %}
                <h2 class="section__headline">{{ section.section_headline }}</h2>
            {% endif %}
        {% endblock %}
        {% block section_content %}
            {{ section.type }}
        {% endblock %}
    </section>
</div>
```
{% endraw %}

This section template generates classes based on the section type and background colour (for example: `section section--downloads section--green`) so that I can add corresponding styling with CSS / SASS. The specific templates for each section will extend this base template and fill the block `section_content` with their custom markup. For example, for our `downloads` section (assuming it contains a multivalue files field `download_files`):

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

It took some setup, but now every section needs only care about their own unique fields and markup without having to include repetitive boilerplate markup. And it's still completely extensible: If you need, for example, a full-width block, you can just **not** extend the base section template and get a clean slate. Also, you can always go back to the base template and add more blocks as needed, without having to touch all the other sections. By the way, you can also extend the base section template from everywhere you want, not only from repeater matrix types.

Now we only need to include the sections component inside the page template:

{% raw %}
```twig
{# pages/page.twig #}

{% block content %}
    {% if page.hasField('sections') and page.sections.count %}
        {{ include('components/sections.twig' }}
    {% endif %}
{% endblock %}
```
{% endraw %}

### Conclusion

This first part was mostly about a clean environment setup and template structure. By now you've probably a good grasp on how I organize my twig templates into folders, depending on their role and importance:

- `blocks`: This contains reusable blocks that will be included many times, such as a responsive image block or a link block.
- `components`: This contains special regions such as the header and footer that will probably be only used once per page.
- `sections`: This will contain reusable, self-contained sections mostly based on the Repeater Matrix types. They may be used multiple times on one page.
- `pages`: High-level templates corresponding to ProcessWire templates. Those contain very little markup, but mostly include the appropriate components and sections.

Depending on the size of the project, you could increase or decrease the granularity of this as needed, for example by grouping the sections into different subfolders. But it's a solid start for most medium-sized projects I tackle.

Anyway, thanks for reading! I'll post the next part in a couple of days, where I will go over how to add more functionality into your environment in a scalable and reusable way. Let me know how you would improve this setup!
