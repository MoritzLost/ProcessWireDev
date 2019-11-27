---
tags: post
layout: post
title: Extend Twig with custom functionality
---

# How to extend Twig with custom functionality and connect with the ProcessWire API

<small class="sidenote sidenote--warning">

Sidenote: This tutorial builds on the basic Twig integration for ProcessWire [detailled in the previous post](/twig-processwire-setup).

</small>

When you start writing all your templates in Twig, you may miss certain functions or language features that you can utilize in native PHP. What's awesome about Twig is that you can add functions, filters and tags with very little effort. This tutorial will demonstrate how to add functionality to Twig and build your own helper functions utilizing the ProcessWire API (or just plain old PHP).

This article will mostly be a collection of examples meant to show how easy it is to extend Twig and inspire you to write your own extensions and reusable blocks.

#### Utility functions for string manipulation

We all need some string manipulation from time to time. While Twig already has some built-in methods like [trim](https://twig.symfony.com/doc/3.x/filters/trim.html), writing your own helper functions gives you the opportunity to bundle related functionality into easy-to-use snippets with defaults that make sense for you. For example, when generating a meta description based on an HTML text field, you usually want to strip tags, truncate it to a certain length, replace newlines and consecutive spaces and possibly include an ellipsis marker (...) at the end. Here are two functions that will do exactly that:

```php
/**
 * Truncate a string if it is longer than the specified limit. Will append the
 * $ellipsis string if the input is longer than the limit. Pass true as $strip_tags
 * to strip all markup before measuring the length.
 *
 * @param string $text The text to truncate.
 * @param integer $limit The maximum length.
 * @param string|null $ellipsis A string to append if the text is truncated. Pass null to disable.
 * @param boolean $strip_tags Strip markup from the text?
 * @return string
 */
function truncate(
    string $text,
    int $limit,
    ?string $ellipsis = ' …',
    bool $strip_tags = false
): string {
    if ($strip_tags) {
        $text = strip_tags($text);
    }
    if (strlen($text) > $limit) {
        $ell_length = $ellipsis ? strlen($ellipsis) : 0;
        $append = $ellipsis ?? '';
        $text = substr($text, 0, $limit - ($ell_length + 1)) . $append;
    }
    return $text;
}

/**
 * Convert all consecutive newlines into a single space character.
 *
 * @param string $text
 * @return string
 */
function newlinesToSpace(string $text): string
{
    return preg_replace(
        '/[\r\n]+/',
        ' ',
        $text
    );
}

```

With the functions defined like this, you can add them to the Twig environment (note that if your functions are namespaced, you will have to use their fully qualified name).

```twig
// public/site/templates/_init.php

$twigEnvironment->addFilter(new \Twig\TwigFilter('truncate', 'truncate'));
$twigEnvironment->addFilter(new \Twig\TwigFilter('newlinesToSpace', 'newlinesToSpace'));
```

Now those are available in Twig and can be used like this:

{% raw %}
```twig
{% if page.body %}
    {% set description = seo.description|newlinesToSpace|truncate(150, ' …', true) %}
    <meta name="description" content="{{ description }}">
    <meta property="og:description" content="{{ description }}">
{% endif %}
```
{% endraw %}

While this is something you probably *could* have done in Twig with a lot of if statements and nested rules, this is definitely easier and, most importantly, completely reusable.

How about something you definitely can't do in Twig? The following function will highlight all occurrences of a search term inside a string (by wrapping it in `<mark>` tags). Super useful for search result pages. Again, the function takes multiple parameters with sensible defaults so you can reuse it in different contexts.


```php
function highlightTermInText(
    string $text,
    string $term,
    string $highlightElement = 'mark',
    array $highlightElementClasses = [],
    bool $caseSensitive = false
): string {
    // start and end tag to wrap around the highlighted terms
    $classString = implode(" ", $highlightElementClasses);
    $startTag = "<{$highlightElement} class=\"{$classes}\">";
    $endTag = "</{$highlightElement}>;
    return preg_replace_callback(
        '/' . preg_quote($term, '/') . '/' . ($caseSensitive ? '' : 'i'),
        function ($matches) use ($startTag, $endTag) {
            return "{$startTag}{$matches[0]}{$endTag}";
        },
        $text
    );
}
```

Again, add the function to the Twig environment as a filter:

```twig
$twigEnvironment->addFilter(new \Twig\TwigFilter('highlightTermInText', 'highlightTermInText'));
```

Then you can use it to enhance your search results page (assuming `search_results` is a list of results and `search_term` the term from the search form):

```
// pages/page--search.twig

<ul class="search-results">
    {% for result in search_results %}
    	<li class="search-results__item">
            {{- result.title|highlightTermInText(
                search_term,
                'mark',
                ['search-results__highlight']
            ) -}}
        </li>
    {% endfor %}
</ul>
```

#### instanceof for Twig

By default, Twig doesn't have an equivalent of [PHP's instanceof keyword](https://www.php.net/manual/en/internals2.opcodes.instanceof.php). The function is super simple, but vital to me:

```php
// instanceof test for twig
// class must be passed as a FQCN with escaped backslashed
$twig_env->addTest(new \Twig\TwigTest('instanceof', function ($var, $class) {
    return $var instanceof $class;
}));
```

In this case, I'm adding a TwigTest instead of a function. Read up on the different type of extensions you can add in the documentation for [Extending Twig](https://twig.symfony.com/doc/2.x/advanced.html).

Note that you have to use double backslashes to use this in a Twig template:

{% raw %}
```twig
{% if og_img is instanceof('\\Processwire\\Pageimages') %}
```
{% endraw %}

### Going further: custom functionality as a portable Twig extension

Most of the examples above are very general, so you'll want to have them available in every project you start. It makes sense then to put them into a single library that you can simply pull into your projects with git or Composer. It's really easy to wrap functions like those demonstrated above in a custom Twig extension. In the following example, I have wired the namespace "moritzlost\\" to the "src" folder (see my [Composer + ProcessWire tutorial](https://processwire.com/talk/topic/20490-how-to-setup-composer-and-use-external-libraries-in-processwire/) if you need help with that):

```php
// src/MoritzFuncsTwigExtension.php

<?php
namespace moritzlost;

use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;
use Twig\TwigFilter;
use Twig\TwigTest;

class MoritzFuncsTwigExtension extends AbstractExtension
{
    // import responsive image functions
    use LinkHelpers;

    public function getFunctions()
    {
        return [
            new TwigFunction('url_is_external', [$this, 'urlIsExternal']),
        ];
    }

    public function getFilters()
    {
        return [
            new TwigFilter('text_to_id', [$this, 'textToId']),
        ];
    }

    public function getTests()
    {
        return [
            new TwigTest('instanceof', function ($variable, string $namespace) {
                return $variable instanceof $namespace;
            }),
        ];
    }
}

// src/LinkHelpers.php

<?php
namespace moritzlost;

trait LinkHelpers
{
    // this trait contains the textToId and urlIsExternal methods
    // see the section above for the full code
}
```

Here I'm building my own class that extends the AbstractExtension class from Twig. This way, I can keep boilerplate code to a minimum. All I need are public methods that return an array of all functions, filters, tests et c. that I want to add with this extension. As is my custom, I've further split the larger functions into their own wrapper file. In this case, I'm using a trait to group the link-related functions (it's easier this way, since classes can only extend one other class, but use as many traits as they want to).

Now all that's left is to add an instance of the extension to our Twig environment:

```php
// custom extension to add functionality
$twig_env->addExtension(new MoritzFuncsTwigExtension());
```

Just like that we have a separate folder that can be easily put under version control and released as a micro-package that can then be installed and extended in other projects.

### Translations

If you are building a multi-language site, you will need to handle internationalization of your code. ProcessWire can't natively handle translations in Twig files, so I wanted to briefly touch on how to handle this. For a recent project I considered three approaches:

- Build a module to add twig support to ProcessWire's multi-language system.
- Use an existing module to do that.
- Build a custom solution that bypasses ProcessWire's translation system.

For this project, I went with the latter approach; I only needed a handful of phrases to be translated, as I tend to make labels and headlines into editable page fields or use the field labels themselves, so there are only few translatable phrases inside my ProcessWire templates. But the beauty of ProcessWire is that you can build your site whatever way you want. As an example, here's the system I came up with.

I used a single [Table field](https://processwire.com/store/pro-fields/table/) (part of the ProFields module) with two columns: `msgid` (a regular text field which functions as a key for the translations) and `trans` (a multi-language text field that holds the translations in each language). I added this field to my central settings page and wrote a simple function to access individual translations by their `msgid`:

```php
/**
    * Main function for the translation API. Gets a translation for the msgid in
    * the current language. If the msgid doesn't exist, it will create the
    * corresponding entry in the settings field (site settings -> translations).
    * In this case, the optional second parameter will be used as the default
    * translation for this msgid in the default language.
    *
    * @param string $msgid
    * @param ?string $default
    * @return string
    */
function trans_api(
    string $msgid,
    ?string $default = null
): string {
    // this is a reference to my settings page with the translations field
    $settings = \Processwire\wire('config')->settings;
    $translations = $settings->translations;
    $row = $settings->translations->findOne("msgid={$msgid}");
    if ($row) {
        if ($row->trans) {
            return $row->trans;
        } else {
            return $msgid;
        }
    } else {
        $of = $settings->of();
        $settings->of(false);
        $new = $translations->makeBlankItem();
        $new->msgid = $msgid;
        if ($default) {
            $default_lang = \Processwire\wire('languages')->get('default');
            $new->trans->setLanguageValue($default_lang, $default);
        }
        $settings->translations->add($new);
        $settings->save('translations');
        $settings->of($of);
        return $default ?? $msgid;
    }
}


// _init.php

// add the function with the key "trans" to the twig environment
$twig_env->addFunction(new \Twig\TwigFunction('trans', 'trans_api'));	
```

{% raw %}
```twig
// some_template.twig

// example usage with a msgid and a default translation
{{ trans('detail_link_label', 'Read More') }}
```
{% endraw %}

This function checks if a translation with the passed `msgid` exists in the table and if so, returns the translation in the current language. If not, it automatically creates the corresponding row. This way, if you want to add a translatable phrase inside a template, you simply add the function call with a new `msgid`, reload the page once, and the new entry will be available in the backend. For this purpose, you can also add a second parameter, which will be automatically set as the translation in the default language. Sweet.

While this works, it will certainly break (in terms of performance and user-friendliness) if you have a site that required more than a couple dozen translations. So consider all three approaches and decide what will work best for you!

### Bonus: responsive image template & functions

I converted my [responsive image function](https://processwire.com/talk/topic/19964-building-a-reusable-function-to-generate-responsive-images/) to a Twig template, I'm including the full code here as a bonus and thanks for making it all the way through! I created a gist with the extension & and template that you can drop into your projects to create responsive images quickly (minor warning: I had to adjust the code a bit to make it universal, so this exact version isn't properly tested, let me know if you get any errors and I'll try to fix it!). [Here's the gist](https://gist.github.com/MoritzLost/a2af68289d8c4cd382baca544c23f30a). There's a usage example as well. If you don't understand what's going on there, make sure to read [my tutorial on responsive images with ProcessWire](https://processwire.com/talk/topic/19964-building-a-reusable-function-to-generate-responsive-images/).

### Conclusion

Including the first part, this has been the longest tutorial I have written so far. Again, most of this is opinionated and influenced by my own limited experience (especially the part about translations), so I'd like to hear how you all are using Twig in your projects, how you would improve the examples above and what other tips and tricks you have!
