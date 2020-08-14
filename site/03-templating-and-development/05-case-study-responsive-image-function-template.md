---
tags: post
layout: post
title: "Case study: Responsive image component"
---

# Component case study: Generating responsive images with ProcessWire and Twig

Modern web design & development is rarely done in terms of finished pages. Instead, most tools are tailored towards a module- or component-based approach. This can be seen in the tooling available for web design (Figma, Sketch) and in the popular frameworks for web development (React, Vue, etc). The tutorial on [Content Sections](/repeater-matrix-content-sections) demonstrates one such approach. Beyond that, working in terms of reusable components can be a major productivity boost, especially when you're building base components that can be used in multiple sites.

This tutorial is a case study that demonstrates how to build a flexible, developer-friendly component for a *responsive image* component (the first section contains an introduction to responsive images in HTML). The component should be generic enough to use in most sites.

## Introduction to responsive images and requirements

If you want an in-depth explanation, there's a really good [article about responsive images on MDN](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images). The short version is that a responsive image tag is simply an `<img>`-tag that includes a couple of alternative image sources with different resolutions for the browser to choose from. This way, smaller screens can download the small image variant and save data, whereas high-resolution displays can download the extra-large variants for a crisp display experience. The standard defines two HTML attributes which inform the browser about the available image sizes and help them pick the one:

- `srcset` - This attribute contains a list of source URLs for the image. For each source, the width of the image in pixels is specified.
- `sizes` - This attribute tells the browser how wide a space is available for the image, based on media queries (usually the width of the viewport).

This is what a complete responsive image tag may look like:

```html
<img srcset="/images/responsive-image.300x0.jpg 300w,
            /images/responsive-image.600x0.jpg 600w,
            /images/responsive-image.900x0.jpg 900w,
            /images/responsive-image.1200x0.jpg 1200w,
            /images/responsive-image.1800x0.jpg 1800w,
            /images/responsive-image.2400x0.jpg 2400w"
    sizes="(min-width: 1140px) 350px,
            (min-width: 992px) 480px,
            (min-width: 576px) 540px,
            100vw"
    src="/images/responsive-image.1200x0.jpg" alt="A responsive image">
```

This tells the browser that there are six different sources for this image available, ranging from 300px to 2400px wide variants. It also tells the browser how wide the space for the image will be:

- 350px for viewports >= 1140px
- 480px for viewports >= 992px
- 540px for viewports >= 576px
- 100vw (full viewport width) for smaller viewports

The sizes queries are checked in order of appearance and the browser uses the first one that matches. This way, the browser can calculate how large the image needs to be and then select the best fit from the `srcset` list to download. Because it's up to the browser to decide which image to pick, it can factor in variables like window size, device pixel ratio and network conditions. For browsers that don't support responsive images, a medium-sized variant is included as the normal `src`-Attribute.

A helpful responsive image component will do the following:

- Automatically generate the image variants through the ProcessWire API, unless they exist already.
- Generate the markup for the image tag containing the `sizes` and `srcset` attributes.
- Provide sensible defaults for some arguments.

The component will consist of two parts: A PHP function that generates the image variants and a Twig template that calls this function with the appropriate arguments and renders the `<img>` tag. This way, any Twig template can `include` the component with arbitrary arguments.

## Writing a PHP function to generate image variations

At the core of the component is a function that physically generates all the image variants listed in the `srcset` on the server. It will accept the following arguments:

- A `PageImage`, which is a single value of a ProcessWire image field containing the image to render responsively.
- The base target size in width and height.
- A list of size factors to scale the base image by to create smaller and larger variants.

<small class="sidenote sidenote--success">

The combination of base size and scaling factors are only one possible approach. Another (maybe slightly more intuitive) solution would be to have the function accept an array of sizes to generate. I prefer scaling factors, because it's easier to provide sensible defaults for those, as I will demonstrate below.

</small>

Here's a function that accepts the arguments above, generates the images and returns a `srcset` attribute string listing all the available variants. See below for more explanations.

```php
/**
 * Returns a srcset string containing a list of sources for the passed image,
 * based on the provided width, height, and variant factors. All required images
 * will be created automatically.
 *
 * @param Pageimage $img The base image. Must be passed in the largest size available.
 * @param int|null $standard_width The standard width for the generated image. Use NULL to use the inherent width of the passed image.
 * @param int|null $standard_height The standard height for the generated image. Use NULL to use the inherent height of the passed image.
 * @param array|null $variant_factors The multiplication factors for the alternate resolutions.
 * @return string
 */
public function getSrcset(
    Pageimage $img,
    ?int $standard_width = null,
    ?int $standard_height = null,
    array $variant_factors = [0.25, 0.5, 0.75, 1, 1.5, 2]
): string {
    // use inherit dimensions of the passed image if standard width/height is empty
    if (empty($standard_width)) {
        $standard_width = $img->width();
    }
    if (empty($standard_height)) {
        $standard_height = $img->height();
    }

    // get original image for resizing
    $original_image = $img->getOriginal() ?? $img;

    // build the srcset attribute string, and generate the corresponding widths
    $srcset = [];
    foreach ($variant_factors as $factor) {
        // round up, srcset doesn't allow fractions
        $width = (int) ceil($standard_width * $factor);
        $height = (int) ceil($standard_height * $factor);
        // we won't upscale images
        if ($width <= $original_image->width() && $height <= $original_image->height()) {
            $current_image = $original_image->maxSize($width, $height);
            $srcset[] = $current_image->url() . " {$width}w";
        }
    }
    $srcset = implode(', ', $srcset);

    return $srcset;
}

// usage example
$image = $page->my_image_field;
// build the srcset string and generate the missing images
// this will generate the following sizes: 200x200, 400x400, 800x800
$srcset = getSrcset($image, 400, 400, [0.5, 1, 2]);
```

Things to note:

- The only required argument is the `PageImage` itself. For width and height, we default to using the base images inherit size. For the variant factors, we provide a default list of factors that will generate a total of six image variants of differing sizes.
- The method uses `PageImage::getOriginal` to create variations based on the original image, just in case the argument is a Pageimage that has already been resized.
- The method avoids upscaling images by only creating a variant (and adding it to the `srcset`) if the target size is not larger than the original image. If the image in `$page->my_image_field` has a size of 300x300, only the 200x200 variant will be created.
- ProcessWire will create any requested size if it's missing. This means that the first time the example code above is executed, the 200x200 and 800x800 variants will be generated, resulting in a longer page load. During subsequent runs, no new images need to be created, unless you change the base image, the target width and height or the variant factors.

There's one problem remaining. Oftentimes your templates will need to support different aspect ratios of images, especially for CMS-driven content. For a classic multi-column layout, you will only know the width of the column the image will go into (which can of course vary between different sizes), but the height depends on the aspect ratio of the uploaded image. The problem is that if you only specifiy a width in the example above, the image will be cropped based on the inherit height of the image. This can be solved by adding to additional function that take only a width *or* a height argument, respectively, and determine the other one based on the aspect ratio of the passed image (the example code shows only the width function, check below for a full code example).

```php
/**
* Shortcut for getSrcset that only takes a width parameter.
* Height is automatically generated based on the aspect ratio of the passed image.
*
* @param Pageimage $img The base image. Must be passed in the largest size available.
* @param int|null $standard_width The standard width for this image. Use NULL to use the inherent size of the passed image.
* @param array $variant_factors The multiplication factors for the alternate resolutions.
* @return string
*/
public function getSrcsetByWidth(
    Pageimage $img,
    ?int $standard_width = null,
    array $variant_factors = [0.25, 0.5, 0.75, 1, 1.5, 2]
): string {
    if (empty($standard_width)) {
        $standard_width = $img->width();
    }
    // automatically fill the height parameter based
    // on the aspect ratio of the passed image
    $factor = $img->height() / $img->width();
    $standard_height = ceil($factor * $standard_width);

    return getSrcset(
        $img,
        $standard_width,
        (int) $standard_height,
        $variant_factors
    );
}
```

With this set of base functions that generate all required image variants and return the `srcset`, the rest of the component can be written in Twig. Don't forget to add the PHP functions to the Twig environment:

```php

$twigEnvironment->addFunction(
    new \Twig\TwigFunction('getSrcset', 'getSrcset')
);
$twigEnvironment->addFunction(
    new \Twig\TwigFunction('getSrcsetByWidth', 'getSrcsetByWidth')
);
$twigEnvironment->addFunction(
    new \Twig\TwigFunction('getSrcsetByHeight', 'getSrcsetByHeight')
);
```

## Writing a responsive image component in Twig

While the functional core is done in PHP, the template can be written in Twig. In addition to passing the required parameters to the PHP method, the Twig component will accept some additional optional parameters that make it as reusable as possible:

- The `sizes` attribute that allows the browser to chose a size.
- Additional HTML attributes like `title`, `alt`, `loading` and `class`.

The component can look something like this:

{% raw %}
```twig
{# block/responsive-image.twig #}

{#-
 # Renders a responsive image tag.
 #
 # @var \ProcessWire\Pageimage image    The image to display.
 # @var string alt                      Optional alt text to use for this image.
 # @var string title                    Optional title text.
 # @var array classes                   Optional classes for the image.
 # @var int width                       The standard / fallback width for the image.
 # @var int height                      The standard height for the image.
 # @var array sizes                     The sizes queries for the responsive image.
 # @var array variant_factors           The variant factors for the responsive image.
 # @var bool lazy                       Lazy load this image?
 -#}

{%- set alt = alt|default(image.description) -%}
{%- set title = title|default(null) -%}
{%- set classes = classes|default([]) -%}
{%- set sizes = sizes is defined and sizes is not empty ? sizes|join(', ') : '100vw' -%}
{%- set variant_factors = variant_factors|default([0.25, 0.5, 0.75, 1, 1.5, 2]) -%}
{%- set lazy = lazy|default(false) -%}

{%- if width and height -%}
    {%- set base_image = image.maxSize(width, height) -%}
    {%- set srcset = getSrcset(image, width, height, variant_factors) -%}
{%- elseif width -%}
    {%- set base_image = image.maxWidth(width) -%}
    {%- set srcset = getSrcsetByWidth(image, width, variant_factors) -%}
{%- elseif height -%}
    {%- set base_image = image.maxHeight(height) -%}
    {%- set srcset = getSrcsetByHeight(image, height, variant_factors) -%}
{%- else -%}
    {%- set base_image = image -%}
    {%- set srcset = getSrcset(image, null, null, variant_factors) -%}
{%- endif -%}

<img srcset="{{ srcset }}" sizes="{{ sizes }}" src="{{ base_image.url }}"
    {%- if alt %} alt="{{ alt }}"{% endif -%}
    {%- if title %} title="{{ title }}"{% endif %}
    {%- if lazy %} loading="lazy"{% endif -%}
    {%- if classes is not empty %} class="{{ classes|map(c => c is not empty)|join(' ') }}"{% endif %}>
```
{% endraw %}

Some points to note:

- The only required parameter, once again, is the image to use. All other parameters use the [default filter](https://twig.symfony.com/doc/3.x/filters/default.html) to provide sensible defaults or leave that parameter out.
- The component figures out which PHP function to call to generate the srcset based on which or the `width` and `height` parameters are passed to it.
- The parameters for both the `class` and `sizes` attributes are passed as arrays of strings that are then concatenated with [join](https://twig.symfony.com/doc/3.x/filters/join.html). But that's just a matter of personal preference.

Now that the component is finished, we can actually start to use it in our templates.

## How to use the component and determine the sizes queries

Twig templates can be included using the unsurprisingly named [include function](https://twig.symfony.com/doc/3.x/functions/include.html). It takes the name of the template to include, as well as a number of arguments to pass to the included template. Arguments are provided as associative arrays (see [Hash literals](https://twig.symfony.com/doc/3.x/templates.html#literals)), which is nice because it allows use to only specifiy the arguments we need. Here's a barebones call that only passes an image:

{% raw %}
```twig
{{ include('blocks/responsive-image.twig', {
    image: page.my_image_field,
}) }}
```
{% endraw %}

But we can override the default by passing all the parameters we want:

{% raw %}
```twig
{{ include('blocks/responsive-image.twig', {
    image: page.my_image_field,
    width: 500,
    sizes: ['(min-width: 1200px) 33vw', '(min-width: 768px) 50vw', 'calc(100vw - 30px)'],
    variant_factors: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2],
    lazy: true,
    classes: ['my-image-field', 'img-fluid']
}) }}
```
{% endraw %}

The last thing I want to mention here is how to determine the correct arguments for the `sizes` attribute. It's important to realize that this is completely independent of the actual size of the image in most cases. Instead, it depends on the slot in your template where the image is going to be placed, and the size of that slot.

For example, let's consider a full-width multi-column layout with the following column count per breakpoint:

- Three equal columns for viewports >=1200px
- Two equal columns for viewports >= 768px
- Only one column for everything below that, with a fixed padding of 15px to either side of the viewport.

In a full-page layout, the column widths can be described with [viewport width units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#Viewport-percentage_lengths). Remember that `100vw` is the full width of the viewport, so in a three-column layout each column will have a width of `33vw` (rounded down). So the correct `sizes` attribute for this layout looks like this: `(min-width: 1200px) 33vw', '(min-width: 768px) 50vw', 'calc(100vw - 30px)`. For the smallest breakpoint, the image needs to fill the full width of the viewport minus the fixed padding (`15px` to either side, so `30px` total). This is accounted for with the [calc](https://developer.mozilla.org/en-US/docs/Web/CSS/calc) function.

If you instead have a fixed-width container with a predefined width per breakpoint (like a normal [container in Bootstrap](https://getbootstrap.com/docs/4.5/layout/overview/)), the slot for the image will have a fixed width (per breakpoint) as well, depending on the amount of columns it spans. In this case, the individual `sizes` should be specified in `px` instead of `vw` units.

## Conclusion

This finishes the case study on the responsive image. Now you might be thinking that all this was way to much work just for a simple responsive image component. But it's gonna by worth it once you start using responsive images *everywhere*. No more boilerplate code, difficult calculations of aspect ratios or repetitive loops. Just a single declarative `include` statement in your Twig template and you're done.

The point is this: If you invest the time to build your components in the most generic way that's possible and practical for your use case, it will pay off once you utilize it a couple of times. The general consideration for those components should be:

- What **parameters** does the component need to accept? The more general the component, the more parameters it will require.
- How many of those parameters are **required**? The fewer the better, because it reduces friction when using the component. The responsive image component has only one required parameter, which is the image itself.
- What are sensible **defaults** for the optional parameters? A default may either be an empty value or the appropriate value for the most common use case. For example, the argument corresponding to the `title` atttribute is empty by default. The default value for the `alt` attribute is the images `description`, which is automatically available on ProcessWire's image fields and is often used for `alt` texts.
