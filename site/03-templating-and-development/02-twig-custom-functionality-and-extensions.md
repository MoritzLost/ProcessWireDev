---
tags: post
layout: post
title: Extend Twig with custom functionality
---

# How to extend Twig with custom functionality and connect with the ProcessWire API

<small class="sidenote sidenote--warning">

Sidenote: This tutorial builds on the basic Twig integration for ProcessWire [detailed in the previous post](/twig-processwire-setup).

</small>

When you start writing all your templates in Twig, you may miss certain functions or language features that you can utilize in native PHP. What's awesome about Twig is that you can add functions, filters and tags with very little effort. This tutorial will demonstrate how to add functionality to Twig and build your own helper functions utilizing the ProcessWire API (or just plain old PHP). The following will mostly consist of some simplified examples meant to show how easy it is to extend Twig and inspire you to write your own extensions and reusable blocks.

## Utility functions for string manipulation

We all need some string manipulation from time to time. While Twig already has some built-in methods like [trim](https://twig.symfony.com/doc/3.x/filters/trim.html), writing your own helper functions gives you the opportunity to bundle related functionality into easy-to-use methods with defaults that make sense for you. For example, when generating a meta description based on an HTML text field, you usually want to strip tags, truncate it to a certain length, replace newlines and consecutive spaces and possibly include an ellipsis marker (...) at the end. Here are two functions that will do exactly that:

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

```php
// public/site/templates/_init.php

$twigEnvironment->addFilter(
    new \Twig\TwigFilter('truncate', 'truncate')
);
$twigEnvironment->addFilter(
    new \Twig\TwigFilter('newlinesToSpace', 'newlinesToSpace')
);
```

Now those are available in Twig and can be used like this:

{% raw %}
```twig
{% set description = page.body|newlinesToSpace|truncate(150, ' …', true) %}
<meta name="description" content="{{ description }}">
<meta property="og:description" content="{{ description }}">
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
    $classString = implode(" ", $highlightElementClasses);
    $startTag = "<{$highlightElement} class=\"{$classString}\">";
    $endTag = "</{$highlightElement}>";
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

```php
$twigEnvironment->addFilter(
    new \Twig\TwigFilter('highlightTermInText', 'highlightTermInText')
);
```

Then you can use it to enhance your search results page (assuming `search_results` is a list of results and `search_term` the term from the search form):

{% raw %}
```twig
// pages/page--search.twig

<ul class="search-results">
    {% for result in search_results %}
        <li class="search-results__item">
            <a href="{{ result.url }}" class="search-results__link">
                {{- result.title|highlightTermInText(
                    search_term,
                    'mark',
                    ['search-results__highlight']
                ) -}}
            </a>
        </li>
    {% endfor %}
</ul>
```
{% endraw %}


## Checking instanceof in Twig

By default, Twig doesn't have an equivalent of [PHP's instanceof](https://www.php.net/manual/en/internals2.opcodes.instanceof.php). Not to worry though, because it can be added to Twig very easily. Since instanceof is usually used for conditional statements, it makes more sense to add this functionality as a [test](https://twig.symfony.com/doc/3.x/tests/index.html) instead of a filter or function.

```php
// instanceof test for twig
// class must be passed as a FQCN with escaped backslashed
$twigEnvironment->addTest(
    new \Twig\TwigTest(
        'instanceof',
        function ($variable, string $className) {
            return $variable instanceof $className;
        }
    )
);
```

Note that you have to escape the backslashes in the fully qualified class name:

{% raw %}
```twig
{% if page.some_image_field is instanceof('\\ProcessWire\\Pageimages') %}
    {# page.some_image_field contains an array of images #}
{% elseif page.some_image_field is instanceof('\\ProcessWire\\Pageimage') %}
    {# page.some_image_field contains a single image #}
{% endif %}
```
{% endraw %}

## Encapsulate custom functionality in a portable Twig extension

The examples above are very general, so you'll want to have them available in every project you start. The logical next step is to put your utility function into a separate library that you can simply pull into your projects with git or Composer. It's really easy to wrap functions like those demonstrated above in a custom Twig extension. I like to group related functionality into wrapper classes with static public methods, because classes are easier to autoload than functions. For example, the string utility function above can be grouped in a `StringUtilities` class:

```php
// src/php/StringUtilities.php

<?php
namespace MoritzLost;

class StringUtilities
{
    public static function truncate(
        string $text,
        int $limit,
        ?string $ellipsis = ' …',
        bool $strip_tags = false
    ): string {
        // see above for full function code
    }

    public static function highlightTermInText(
        string $text,
        string $term,
        string $highlightElement = 'mark',
        array $highlightElementClasses = [],
        bool $caseSensitive = false
    ): string {
        // see above for full function code
    }
}
```

The next step is to define a Twig extension that will add those functions to Twig. The following example adds the two string utilities above, as well as the `instanceof` check.

```php
// src/php/Twig/TwigUtilities.php

<?php
namespace MoritzLost\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigTest;

class TwigUtilities extends AbstractExtension
{
    public function getFilters()
    {
        return [
            new TwigFilter(
                'truncate',
                'MoritzLost\StringUtilities::truncate'
            ),
            new TwigFilter(
                'highlightTermInText',
                'MoritzLost\StringUtilities::highlightTermInText'
            ),
        ];
    }

    public function getTests()
    {
        return [
            new TwigTest(
                'instanceof',
                function ($variable, string $className) {
                    return $variable instanceof $className;
                }
            ),
        ];
    }
}
```

This custom Twig extension extends the `AbstractExtension` class from Twig. This way, all you need are public methods that return an array of all functions, filters, tests et c. that you want to add with this extension. By having this class only act as an adapter between the PHP utility classes and Twig, the utility functions can still be used outside of Twig, and you have better separation of concerns. Now all that's left is to add an instance of the extension to our Twig environment, then you can access the methods through Twig as demonstrated above.

```php
$twigEnvironment->addExtension(
    new \MoritzLost\Twig\TwigUtilities()
);
```

Now you have a separate folder with all our Twig utility functions and Twig extensions that can be easily put under version control and released as a micro-package that can then be installed and extended in other projects.

---

One caveat of the method above is that all the utility functions are added to the global scope in Twig (because you're no longer refering to the namespace of the PHP class, but only the individual method names in the Twig templates). If you plan on having lots of extensions and utility functions, one way to keep your Twig scope clean is to instantiate your utility classes and adding the instances as globals instead of adding individual methods:

```php
// ...
class TwigUtilities extends AbstractExtension
{
    public function getGlobals()
    {
        return [
            'StringUtilites' => new \MoritzLost\StringUtilities(),
        ];
    }
}
```

Now you can access the individual methods of `StringUtilities` through the global instance available to Twig. Note that you can't use the filter syntax as shown above, because the `newlinesToSpace` method is no longer known to Twig as a filter.

{% raw %}
```twig
{% set description = StringUtilities.newslinesToSpace(page.body) %}
```
{% endraw %}

## Type casting for twig

A super quick but useful example for a simple extension. This one adds filters to typecast variables to a different type.

```php
// src/php/Twig/TypeCastingExtension.php

<?php
namespace MoritzLost\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

class TypeCastingExtension extends AbstractExtension
{
    public function getFilters()
    {
        return [
            new TwigFilter('float', function ($value) {
                return (float) $value;
            }),
            new TwigFilter('int', function ($value) {
                return (int) $value;
            }),
            new TwigFilter('bool', function ($value) {
                return (bool) $value;
            }),
            new TwigFilter('string', function ($value) {
                return (string) $value;
            }),
        ];
    }
}
```

## Translations

If you are building a multi-language site, you will need to handle internationalization in your code. ProcessWire can't handle translations in Twig files natively, so you need to come up with your own internationalization scheme. Here are three possible approaches:

1. Build a module to add Twig support to ProcessWire's multi-language system.
2. Use an existing module to do that.
3. Build a custom solution that bypasses ProcessWire's translation system.

I'm going to focus on the third approach here and demonstrate one simple solution, since the ProcessWire translation interface is not very user-friendly to begin with. This certainly depends on the scope of your project, but the beauty of ProcessWire is that you can build your sites in whichever way you want.

For this method, all the translations will be stored in a single [Table field](https://processwire.com/store/pro-fields/table/) (part of the ProFields module) with two columns: `msgid` (a regular text field which contains the message id) and `translation` (a multi-language text field that holds the translations in each language). You can add this field to the central settings page and use a simple function to access individual translations by their `msgid`:

```php
/**
 * Main function for the translation API. Gets a translation for the msgid in
 * the current language. If the msgid doesn't exist, it will create the
 * corresponding entry in the settings field (site settings -> translations).
 * In this case, the optional second parameter will be used as the default
 * translation for this msgid in the default language.
 *
 * @param string $msgid     The ID to get a translation for.
 * @param ?string $default  The default to set if the translation doesn't exist.
 * @return string
 */
public static function translate(string $msgid, ?string $default = null): string
{
    $settings = wire('pages')->get(wire('config')->settingsPageId);
    $translations = $settings->translations;
    $row = $translations->findOne("msgid={$msgid}");
    // return the found translation, or the msgid if it is empty
    if ($row) {
        return $row->translation ?: $msgid;
    }
    // create missing translations
    $of = $settings->of();
    $settings->of(false);
    $new = $translations->makeBlankItem();
    $new->msgid = $msgid;
    if ($default) {
        $default_lang = wire('languages')->get('default');
        $new->translation->setLanguageValue($default_lang, $default);
    }
    $settings->translations->add($new);
    $settings->save('translations');
    $settings->of($of);
    return $default ?: $msgid;
}
}
```

This function checks if a translation with the passed `msgid` exists in the table and if so, returns the translation in the current language. If not, it automatically creates the corresponding row. This way, if you want to add a translatable phrase inside a template, you simply add the function call with a new `msgid`, reload the page once, and the new entry will be available in the backend. For this purpose, you can also add a second parameter, and the function will automatically set the translation in the default language to this text. Sweet.

The `translate` function can be added to Twig as either as a function or a filter -- I prefer the latter. Since this will be used quite frequently, I prefer to name the filter something short, like `t`.

```php
$twigEnvironment->addFunction(
    new \Twig\TwigFunction('t', 'translate')
);
```

Example usage with a `msgid` and a default translation:

{% raw %}
```twig
<a href="{{ page.parent.url }}">
    {{ 'back_to_overview_label'|t('Back to the search results') }}
</a>
```
{% endraw %}

While this works, it will certainly break (in terms of performance and user-friendliness) if you have a site that requires more than a couple dozen or hundred translations at best. So consider the three approaches and decide what will work best for your project.
