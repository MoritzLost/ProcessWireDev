---
tags: post
layout: post
title: Display options for ProcessWire pages
menu_title: Building flexible display options
description: Learn how to create intuitive and powerful display options for ProcessWire pages and content.
discuss_url: https://processwire.com/talk/topic/20662-building-extensible-display-options-with-selectable-option-fields/
---

# Building flexible display options for ProcessWire content

In comparison to visual page builders like the [Gutenberg editor in WordPress](https://wordpress.org/gutenberg/), ProcessWire lends itself to a more semantic approach to content editing. Instead of placing content components and having to make low-level design decisions (like colors, fonts, spacing) you can create interfaces that only concern themselves with the actual content in terms of structured data. The presentation is then determined by templates and stylesheets. However, editors may still want to have some amount of flexibility in terms of design decisions, like choosing a background color for a section, or determining the order in which some elements are displayed. This tutorial demonstrates a technique for creating such *display options* by walking through multiple examples, while striking a balance between flexibility and ease of use.

Different fields may be used depending on the type of option you want to provide. For example, a simple *yes/no* option (like a toggle for a specific element) may be represented by a simple checkbox field. A field type I have found useful for display options is the [Selectable Options Fieldtype](https://processwire.com/docs/fields/select-options-fieldtype/). The examples in this tutorial will all use this field type, so make sure you understand how it works. Note that this field is part of the ProcessWire core, but not installed by default.

## Example 1 — Headline levels and semantics

**Problem:** For a project that needs many pages with long text content, you use a [Repeater field](https://processwire.com/docs/fields/repeaters/) to represent sections of text alongside a headline (which is a separate text field). Each section has a headline. Those sections may have a hierarchical order, and the editor needs to be able to differentiate between main sections and sub-sections.

**Solution**  
The requirement of main sections and sub-sections maps nicely to the headline level of the section's heading tags — `h2` or `h3`. In this sense, the options is not merely a design consideration, but also impacts the semantic structure of the page. The definition of the options can look like this:

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

- The editor may only choose between two headline levels (even though it would be trivial to add more if needed). Just because there are six levels of headlines in HTML, doesn't mean those are all relevant to the editor. The fewer options there are, the easier it is to understand them, especially for non-technical editors. In this case, only two levels of hierarchy are needed, so only two are provided. Note also that the options start at `h2` since the page title is used for the `h1` and there should only be one of those on a page.
- The two options are labelled semantically, not technically. Even though the underlying implementation of the option is done in terms of the heading level, the option's semantic meaning is expressed in terms of section hierarchy. This way, the option is immediately intuitive.

## Example 2 — Image width selector

**Problem:** You want to add an optional image field to each section. However, some images need to span the entire width of the column, some only half of the width.

**Solution**  
Again, this can be solved with a simple select field with two options:

```text
50|Half width
100|Full width
```

In this case, we use numerical values, which of course represent the image width in percent. One way to use those values would be to generate inline styles based on them, but that's a lot of unnecessary, repetitive code. Instead, we will use the value to generate a CSS class:


```php
<img class="<?= sprintf('w-%s', $section->image_width->value) ?>" src="<?= $section->image->url() ?>">
```

This generates the classes `w-50` and `w-100` depending on the selected option. With pure CSS, the amount of code needed to write out the corresponding rules will increase linearly with the number of options. This is why I recommend using a preprocessor such as [SASS](https://sass-lang.com/). With SASS, you only need a couple of lines:

```scss
@each $width in (50, 100) {
    .w-#{$width}{
        max-width: percentage($width/100);
    }
}
```

This way, if you ever need to add other options like 25% or 75%, you only need to add those numbers to the list in parentheses and you're done. You can even put the definition of the list in a variable that's defined in a central `variables.scss` file. By the way, this utility [already exists in Bootstrap 4](https://getbootstrap.com/docs/4.5/utilities/sizing/).

Using classes instead of inline styles also makes it easier to modify the styling of all images at once. For example, if you decide all images should be full-width on mobile, you only need to add that rule once, no need to throw around `!important`'s or modify multiple CSS definitions (this is also where the inline styles approach would break down):

```scss
$image-widths: (25, 50, 75, 100);
$breakpoint-mobile: 576px;

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

One important takeaway: It might be tempting to use an integer field for the width option with allowed values between 0 and 100. In fact, the amount of SASS code required to generate the corresponding declarations would be identical with a [@for-directive](http://sass-lang.com/documentation/file.SASS_REFERENCE.html#for) to loop through the numbers. But that's exactly what makes point-and-click page builders so terrible for editors: too many options. Most people don't want to think about size, positioning, margins and so on for each and every element. In fact, having too many options makes it much harder to create a consistent layout. So in this case, less is more.

## Example 3 — Multiple options in one field

**Problem:** You want to build content sections that are split across two columns. To create some visual variety, you want to allow for multiple variants of column-span and alignment. Using a 12-column grid, we want to offer options for a simple 6-6 split, a centered 5-5 split, a left-aligned 6-4 split and a right-aligned 4-6 split.

**Solution**  
Instead of using multiple options for width and alignment of each column, you can pack those four display variants in one option field:

```text
center_6_6|6 / 6 (Centered)
center_5_5|5 / 5 (Centered)
left_6_4|6 / 4 (Left-aligned)
right_4_6|4 / 6 (Right-aligned)
```

By using a consistent format, in this case `[alignment]_[left column span]_[right column span]`, we can extract the three arguments and use the values directly in the template. This makes it possible to add different display variants without modifying the code at all.

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

If you don't recognize the syntax in the first line, it's [symmetric array destructuring, introduced in PHP 7.1](https://secure.php.net/manual/en/migration71.new-features.php#migration71.new-features.symmetric-array-destructuring). This example uses [Bootstrap 4 grid classes](https://getbootstrap.com/docs/4.5/layout/grid/) and [flexbox utility classes](https://getbootstrap.com/docs/4.5/utilities/flex/#justify-content) for alignment. The corresponding CSS can be quickly generated in SASS as well, check the [Bootstrap source code](https://github.com/twbs/bootstrap/blob/v4-dev/scss/utilities/_flex.scss) if you need some pointers.

## Example 4 — Changing the display order

**Problem:** You're working on a page template that consists of three main sections: Some text content, an image gallery and some embedded videos (each using their own set of fields). The editor needs to be able to change the order in which those sections appear on the page.

**Solution**  
Depending on how flexible you want the template to be, you might use a Repeater Matrix field to represent page sections. But the display order of the three sections can also be made configurable through an options field:

```text
body_gallery_embeds|Description — Gallery — Videos
body_embeds_gallery|Description — Videos — Gallery
gallery_body_embeds|Gallery — Description — Videos
gallery_embeds_body|Gallery — Videos — Description
embeds_body_gallery|Videos — Description — Gallery
embeds_gallery_body|Videos — Gallery — Description
```

Since there are six possibilities to sort three items, this is the expected number of options. That's just few enough to include them all, even though some might be used more than others. As in the previous example, you can destructure this to an array, and use the order of the section keys to output the corresponding templates in that order.

```php
// render the template files for each section and store the result in an associative array
$contents = [
    'body' => wireRenderFile('partials/_section-body.php', $page),
    'gallery' => wireRenderFile('partials/_section-gallery.php', $page),
    'embeds' => wireRenderFile('partials/_section-embeds.php', $page),
];

// this yields something like ['gallery', 'body', 'embeds']
$order = explode('_', $page->display_order->value);

// output the contents in the order defined by the option value
foreach ($order as $item) {
   echo $contents[$item];
}
```

You can see how it will be easy to add a new section and integrate it into the existing solution. Though a fourth item would result in `4! = 24` possibilities to sort them. At that point, there should be a discussion about which arrangements are actually needed, and only those should be included as options.

## Conclusion

Using simple, limited display options gives the editors some control over how their content is displayed. Limiting the amount of options available reduces the cognitive load for editors, and ensures that the result adheres to the intended design. Options labels should correspond to their semantic meaning, not be based on their underlying implementation. Using *Selectable Options* fields with useful values provides synergy with PHP templates and SCSS stylesheets, allowing you to handle a lot of options at once and allowing you to add more options with no or only minor adjustments to the code.
