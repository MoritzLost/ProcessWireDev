---
tags: post
layout: post
title: "Case study: Responsive image component"
---

## Component case study: Generating responsive images with ProcessWire and Twig

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

The component will accept the following arguments, with some defaults:

- The `PageImage` to use – that is, a single value of a ProcessWire image field containing the image to render responsively.
- Either fixed image sizes or factors to create differently-sized variants of the base image. I prefer factors, because it's easier to provide a sensible default.
- The arguments for the sizes query.
- The base width and base height (or only one of those to retain the original aspect ratio).
- Additional HTML attributes (`title`, `alt`, `loading` etc).

The component will consist of two parts: A PHP function that generates the image variants and a Twig template that calls this function with the appropriate arguments and renders the `<img>` tag. This way, any Twig template can `include` the component with arbitrary arguments.


--- OLD


## Building a reusable responsive image function

Let's start with a function that takes two parameters: a `Pageimage` object and a standard width. Every time you access an image field through the API in a template (e.g. `$page->my_image_field`), you get a `Pageimage` object. Let's start with a skeleton for our function:

    function buildResponsiveImage(
        Pageimage $img,
        int $standard_width
    ): string {
        $default_img = $img->maxWidth($standard_width);
        return '<img src="' . $default_img->url() . '" alt="' . $img->description() . '">';
    }

    // usage example
    echo buildResponsiveImage($page->my_image_field, 1200);

This is already enough for a normal `img` tag (and it will serve as a fallback for older browsers). Now let's start adding to this, trying to keep the function as flexible and reusable as possible.

### Generating alternate resolutions

We want to add a parameter that will allow the caller to specify in what sizes the alternatives should be generated. We could just accept an array parameter that contains the desired sizes as integers. But that is not very extendible, as we'll need to specify those sizes in each function call and change them all if the normal size of the image in the layout changes. Instead, we can use an array of *factors*; that will allow us to set a reasonable default, and still enable us to manually overwrite it. In the following, the function gets an optional parameter `$variant_factor`.

    // get the original image in full size
    $original_img = $img->getOriginal() ?? $img;
    
    // the default image for the src attribute, it wont be upscaled
    $default_image = $original_img->width($standard_width, ['upscaling' => false]);

    // the maximum size for our generated images
    $full_image_width = $original_img->width();

    // fill the variant factors with defaults if not set
    if (empty($variant_factors)) {
        $variant_factors = [0.25, 0.5, 0.75, 1, 1.5, 2];
    }

    // build the srcset attribute string, and generate the corresponding widths
    $srcset = [];
    foreach ($variant_factors as $factor) {
        // round up, srcset doesn't allow fractions
        $width = ceil($standard_width * $factor);
        // we won't upscale images
        if ($width <= $full_image_width) {
            $srcset[] = $original_img->width($width)->url() . " {$width}w";
        }
    }
    $srcset = implode(', ', $srcset);

    // example usage
    echo buildResponsiveImage($page->my_image_field, 1200, [0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5, 2]);

Note that for resizing purposes, we want to get the original image through the API first, as we will generate some larger alternatives of the images for retina displays. We also don't want to generate upscaled versions of the image if the original image isn't wide enough, so I added a constraint for that.

The great thing about the `foreach`-loop is that it generates the markup and the images on the server at the same time. When we call `$original_img->width($width)`, ProcessWire automatically generates a variant of the image in that size if it doesn't exist already. So we need to do little work in terms of image manipulation.

## Generating the sizes attribute markup

For this, we could build elaborate abstractions of the normal media queries, but for now, I've kept it very simple. The sizes attribute is defined through another array parameter that contains the media queries as strings in order of appearance.

    $sizes_attribute = implode(', ', $sizes_queries);

The media queries are always separated by commas followed by a space character, so that part can be handled by the function. We'll still need to manually write the media queries when calling the function though, so that is something that can be improved upon.

## Finetuning & improvements

This is what the function looks like now:

    function buildResponsiveImage(
        Pageimage $img,
        int $standard_width,
        array $sizes_queries,
        ?array $variant_factors = []
    ): string {

        // get the original image in full size
        $original_img = $img->getOriginal() ?? $img;
        
        // the default image for the src attribute, it wont be upscaled
        $default_image = $original_img->width($standard_width, ['upscaling' => false]);
    
        // the maximum size for our generated images
        $full_image_width = $original_img->width();
    
        // fill the variant factors with defaults if not set
        if (empty($variant_factors)) {
            $variant_factors = [0.25, 0.5, 0.75, 1, 1.5, 2];
        }
    
        // build the srcset attribute string, and generate the corresponding widths
        $srcset = [];
        foreach ($variant_factors as $factor) {
            // round up, srcset doesn't allow fractions
            $width = ceil($standard_width * $factor);
            // we won't upscale images
            if ($width <= $full_image_width) {
                $srcset[] = $original_img->width($width)->url() . " {$width}w";
            }
        }
        $srcset = implode(', ', $srcset);

        return '<img src="' . $default_img->url() . '" alt="' . $img->description() . '" sizes="' . $sizes_attribute . '" srcset="' . $srcset . '">';
    }

It contains all the part we need, but there are some optimizations to make.

First, we can make the `$sizes_queries` parameters optional. The sizes attribute default to `100vw` (so the browser will always download an image large enough to fill the entire viewport width). This isn't optimal as it wastes bandwidth if the image doesn't fill the viewport, but it's good enough as a fallback.

We can also make the width optional. When I have used this function in a project, the image I passed in was oftentimes already resized to the correct size. So we can make `$standard_width` an optional parameter that defaults to the width of the passed image.

    if (empty($standard_width)) {
        $standard_width = $img->width();
    }

Finally, we want to be able to pass in arbitrary attributes that will be added to the element. For now, we can just add a parameter `$attributes` that will be an associative array of attribute => value pairs. Then we need to collapse those into html markup.

    $attr_string = implode(
        ' ',
        array_map(
            function($attr, $value) {
                return $attr . '="' . $value . '"';
            },
            array_keys($attributes),
            $attributes
        )
    );

This will also allow for some cleanup in the way the other attributes are generated, as we can simply add those to the `$attributes` array along the way.

Here's the final version of this function with typehints & phpdoc:

    /**
    * Builds a responsive image element including different resolutions
    * of the passed image and optionally a sizes attribute build from
    * the passed queries.
    *
    * @param \Processwire\Pageimage $img The base image.
    * @param int|null $standard_width The standard width for this image. Use 0 or NULL to use the inherent size of the passed image.
    * @param array|null $attributes Optional array of html attributes.
    * @param array|null $sizes_queries The full queries and sizes for the sizes attribute.
    * @param array|null $variant_factors The multiplication factors for the alternate resolutions.
    * @return string
    */
    function buildResponsiveImage(
        \Processwire\Pageimage $img,
        ?int $standard_width = 0,
        ?array $attributes = [],
        ?array $sizes_queries = [],
        ?array $variant_factors = []
    ): string {

        // if $attributes is null, default to an empty array
        $attributes = $attributes ?? [];

        // if the standard width is empty, use the inherent width of the image
        if (empty($standard_width)) {
            $standard_width = $img->width();
        }

        // get the original image in full size
        $original_img = $img->getOriginal() ?? $img;

        // the default image for the src attribute, it wont be
        // upscaled if the desired width is larger than the original
        $default_image = $original_img->width($standard_width, ['upscaling' => false]);

        // we won't create images larger than the original
        $full_image_width = $original_img->width();

        // fill the variant factors with defaults
        if (empty($variant_factors)) {
            $variant_factors = [0.25, 0.5, 0.75, 1, 1.5, 2];
        }

        // build the srcset attribute string, and generate the corresponding widths
        $srcset = [];
        foreach ($variant_factors as $factor) {
            // round up, srcset doesn't allow fractions
            $width = ceil($standard_width * $factor);
            // we won't upscale images
            if ($width <= $full_image_width) {
                $srcset[] = $original_img->width($width)->url() . " {$width}w";
            }
        }
        $attributes['srcset'] = implode(', ', $srcset);

        // build the sizes attribute string
        if ($sizes_queries) {
            $attributes['sizes'] = implode(', ', $sizes_queries);
        }

        // add src fallback and alt attribute
        $attributes['src'] = $default_image->url();
        if ($img->description()) {
            $attriutes['alt'] = $img->description();
        }
    
        // implode the attributes array to html markup
        $attr_string = implode(' ', array_map(function($attr, $value) {
            return $attr . '="' . $value . '"';
        }, array_keys($attributes), $attributes));

        return "<img ${attr_string}>";

    }

Example usage with all arguments:

    echo buildResponsiveImage(
        $page->testimage,
        1200,
        ['class' => 'img-fluid', 'id' => 'photo'],
        [
            '(min-width: 1140px) 350px',
            '(min-width: 992px) 480px',
            '(min-width: 576px) 540px',
            '100vw'
        ],
        [0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5, 2]
    );

Result:

    <img class="img-fluid" id="photo" srcset="/site/assets/files/1/sean-pierce-1053024-unsplash.480x0.jpg 480w, /site/assets/files/1/sean-pierce-1053024-unsplash.600x0.jpg 600w, /site/assets/files/1/sean-pierce-1053024-unsplash.720x0.jpg 720w, /site/assets/files/1/sean-pierce-1053024-unsplash.960x0.jpg 960w, /site/assets/files/1/sean-pierce-1053024-unsplash.1200x0.jpg 1200w, /site/assets/files/1/sean-pierce-1053024-unsplash.1500x0.jpg 1500w, /site/assets/files/1/sean-pierce-1053024-unsplash.1800x0.jpg 1800w, /site/assets/files/1/sean-pierce-1053024-unsplash.2400x0.jpg 2400w" sizes="(min-width: 1140px) 350px, (min-width: 992px) 480px, (min-width: 576px) 540px, 100vw" src="/site/assets/files/1/sean-pierce-1053024-unsplash.1200x0.jpg" alt="by Sean Pierce">

Now this is actually too much functionality for one function; also, some of the code will be exactly the same for other, similar helper functions. If some of you are interested, I'll write a second part on how to split this into multiple smaller helper functions with some ideas on how to build upon it. But this has gotten long enough, so yeah, I hope this will be helpful or interesting to some of you :)

Also, if you recognized any problems with this approach, or can point out some possible improvements, let me know. Thanks for reading!
