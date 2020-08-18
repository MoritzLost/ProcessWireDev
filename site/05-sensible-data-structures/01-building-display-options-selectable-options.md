---
tags: post
layout: post
title: Building flexible display options
---

# Building flexible display options for ProcessWire

In comparison to visual page builders like the [Gutenberg editor in WordPress](https://wordpress.org/gutenberg/), ProcessWire lends itself to a more semantical approach to content editing. Instead of placing design components and styling them with colors, fonts, spacing and so on your clients edit the content itself as structured data. The presentation is then determined by templates and stylesheets. However, as an editor you may still want to have some amount of flexibility in terms of design decisions, like chosing a background color for a section, or the order in which some elements are displayed. This tutorial demonstrates a technique for creating such *display options* by walking through multiple examples, while striking a balance between flexibility and ease-of-use.

Different fields may be used depending on the type of option you want to provide. For example, a simple *yes/no* option (like a toggle for a specific element) may be represented by a simple checkbox field. A field type I have found useful for display options is the [Selectable Options field](https://processwire.com/docs/fields/select-options-fieldtype/). The examples in this tutorial will all use this field type, so make sure you understand how it works. Note that this field is part of the ProcessWire core, but not installed by default.

## #1: Headline levels and semantics

**Problem:** For a project that needs many pages with long text content, you use a [Repeater field](https://processwire.com/docs/fields/repeaters/) to represent sections of text alongside a headline (which is a separate text field). Each section has a headline. Those sections may have a hierarchical order, and the editor needs to be able to differentiate between main sections and sub-sections.


**Solution**  
The requirement of main sections and sub-sections maps nicely to the headline level of it's heading tag – `h2` or `h3`. In this sense, the options is not merely a design consideration, but also impacts the sementical structure of the page. The definition of the options can look like this:

```text
h2|Section headline
h3|Sub-section headline
```

The PHP code that generates the corresponding HTML can directly use the option value. The following example assumes a repeater matrix field `sections` containing `headline` and `body` fields as well as the `headline_level` option defined above.

```php
// "sections" is the repeater field
foreach ($page->sections as $section) {
    // create an h2 / h3 tag depending on the selected option
    $h = $section->headline_level->value;
    echo "<{$h}>{$section->headline}</{$h}>";
    echo $section->body;
}
```

This is a pretty simplistic example, but consider the following takeaways:

- The editor may only choose between two headline levels (even though it would be trivial to add more if needed). Just because there are six levels of headlines in HTML, doesn't mean those are all relevant to the editor. The fewer options there are, the easier it is to understand them, especially for non-technical editors. In this case, only two levels of hierarchy are needed, so only two are provided. Note also that the the options start at `h2` since the page title is used for the `h1` and there should only be one of those on a page.
- The two options are labelled semantically, not technically. Even though the underlying implementation of the option is done in terms of the heading level, the option's semantical meaning is expressed in terms of section hierarchy. This way, the option is immediately intuitive.



---OLD


## #2: Image width and SASS



In the same project, there was also an image section; in our layout, some images spanned the entire width of the text body, others only half of it. So again, I created an options field:



    50|Half width

    100|Full width



In this case, I expected the client to request different sizes at some point, so I wanted it to be extensible. Of course, the values could be used to generate inline styles, but that's not a very clean solution (since inline styled break the cascade, and it's not semantic as HTML should be). Instead, I used it to create a class (admittedly, this isn't strictly semantic as well):



```php

<img src="..." class="w-<?= $section->image_width->value ?>"> 

```



With pure CSS, the amount of code needed to write out those class definitions will increase linearly with the number of options. In SASS however, you only need a couple of lines:



```sass

@each $width in (50, 100) {

    .w-#{$width}{

        max-width: percentage($width/100);

    }

}

```



This way, if you ever need to add other options like 25% or 75%, you only need to add those numbers to the list in parenthesis and you're done. You can even put the definition of the list in a variable that's defined in a central `variables.scss` file. Something like this [also exists in Bootstrap 4 as a utility](https://getbootstrap.com/docs/4.2/utilities/sizing/), by the way.



It also becomes easier to modifiy those all at once. For example, if you decide all images should be full-width on mobile, you only need to add that once, no need to throw around `!important`'s or modify multiple CSS definitions (this is also where the inline styles approach would break down):



```sass

# _variables.scss

$image-widths: (25, 50, 75, 100);

$breakpoint-mobile: 576px;



# _images.scss

@import "variables";

@each $width in $image-widths {

    .w-#{$width}{

        max-width: percentage($width/100);

        @media (max-width: $breakpoint-mobile) {

            max-width: 100%;

        }

    }

}

```



One important gotcha: It might be tempting to just use an integer field with allowed values between 10 - 100. In fact, the amount of SASS code would be identical with a [@for-directive](http://sass-lang.com/documentation/file.SASS_REFERENCE.html#for) to loop throuh the numbers. But that's exactly what makes point-and-click page builders so terrible for clients: too many options. No client wants to manually set numerical values for size, position and margins for each and every element (looking at you, Visual Composer). In fact, having too many options makes it much harder to create a consistent layout. So in those cases, less is more.



## #3: Multiple options in one field



Another example for repeatable page sections, this time for a two-column layout. The design included multiple variants regarding column-span and alignment. Using a 12-column grid, we needed a 6-6 split, a centered 5-5 split, a left-aligned 6-4 split and a right-aligned 4-6 split. I didn't want to litter the repeater items with options, so I decided to put both settings in one field (called something like *Column layout*):



    center_6_6|6 / 6 (Centered)

    center_5_5|5 / 5 (Centered)

	left_6_4|6 / 4 (Left-aligned)

    right_4_6|4 / 6 (Right-aligned)



As long as the value format is consistent, the individual options can be quickly extracted and applied in PHP:



```php

[$alignment, $width['left'], $width['right']] = explode('_', $section->column_layout->value);

echo '<section class="row justify-content-' . $alignment . '">';

foreach (['left', 'right'] as $side) {

    echo '<div class="col-lg-' . $width[$side] . '">';

    echo $section->get("body_{$side}");

    echo '</div>';

}

echo '</section>';

```



If you don't recognize the syntax in the first line, it's [symmetric array destructuring, introduced in PHP 7.1](https://secure.php.net/manual/en/migration71.new-features.php#migration71.new-features.symmetric-array-destructuring). For older versions you can use [list()](https://secure.php.net/manual/en/function.list.php) instead. This example uses [Bootstrap 4 grid classes](https://getbootstrap.com/docs/4.2/layout/grid/) and [flexbox utility classes](https://getbootstrap.com/docs/4.2/utilities/flex/#justify-content) for alignment. The corresponding CSS can be quickly generated in SASS as well, check the [Bootstrap source code](https://github.com/twbs/bootstrap/blob/v4-dev/scss/utilities/_flex.scss) for a pointer.



Again, I'm limiting the options to what is actually needed, while keeping it extensible. With this format, I can easily add other column layouts without having to touch the code at all.



## #4: Sorting page elements



A final example. In this case I was working on a template for reference projects that had three main content sections in the frontend: A project description, an image gallery and embedded videos (each using their own set of fields). The client requested an option to change the order in which those sections appeared on the page. Had I known this earlier, I maybe would have gone for a Repeater Matrix approach once again, but that would have required restructuring all the fields (and the corresponding code), so instead I used a Selectable Option field (labelled "Display order"). My approach is similar to the one from the last example:



    body_gallery_embeds|Description - Gallery - Videos

    body_embeds_gallery|Description - Videos - Gallery

    gallery_body_embeds|Gallery - Description - Videos

    gallery_embeds_body|Gallery - Videos - Description

    embeds_body_gallery|Videos - Description - Gallery

    embeds_gallery_body|Videos - Gallery - Description



Since there are six possibilities to sort three items, this is the expected number of options. So I decided to include them all, even though some are probably never going to be used. I also tried to use a predictable order for the options (i.e. the options come in pairs, depending on what element is first). And here is the code used on the frontend:



```php

// render the template files for each section and store the result in an associative array

$contents = [

    'body' => wireRenderFile('partials/_section-body.php', $page),

    'gallery' => wireRenderFile('partials/_section-gallery.php', $page),

    'embeds' => wireRenderFile('partials/_section-embeds.php', $page),

];



// e.g. 'gallery_body_embeds' => ['gallery', 'body', 'embeds'];

$order = explode('_', $page->display_order->value);



// echo the contents in the order defined by the option value

foreach ($order as $item) {

   echo $contents[$item];

}

```



You can see how it will be easy to add an additional section and integrate it into the existing solution. Though a fourth item would result in `4! = 24` possibilities to sort them, so at that point I'd talk to my client about which layouts they actually need :)



## Conclusion



I always try to keep my code and the interfaces I create with ProcessWire extensible and intuitive. Those are a couple of solutions I came up with for projects at work. They are certainly not the only approach, and there is nothing super special about those examples, but I found that putting a little more effort into defining options with meaningful labels and using option values that I can use directly in my templates makes the result less verbose and more maintainable. Some or most of this tutorial may be immediately obvious to you, but if you made it this far, hopefully you got something out of it :)



Feel free to share your own methods to create display options, or how you would've approached those problems differently. Thanks for reading!
