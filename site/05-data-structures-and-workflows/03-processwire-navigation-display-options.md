---
tags: post
layout: post
title: Handling special cases in ProcessWire
menu_title: "Handling special cases: Navigation display options"
description: Combine flexibility with ease of use with these techniques to manage complexity with the ProcessWire Content Management Framework.
discuss_url: https://processwire.com/talk/topic/22220-handling-special-cases-the-elusive-navigation-menu-override/
---

# Handling special cases gracefully: The elusive navigation override

When last-minute change requests come rolling in or the developer is just feeling particularly lazy today, they will often be tempted to introduce *special cases* to the code. Special cases are little conditional deviations from normal procedures, like an additional `if`-statement in a function that checks for a very specific type of input and changes the return value of the function in ways that deviate from it's normal operating procedures. Sometimes, special cases are a necessary evil. But in most cases, you want to avoid them, as they make your code unpredictable and can lead to unintended results.

This tutorial will be about how to handle special cases gracefully without introducing code bloat or degrading code quality and maintainability. The different approaches will be demonstrated using the example of a site's navigation menu, as it's relatable and pretty much every site has one. The following sections will give some examples of feature requests and describe possible approaches to handling them.

## The problem: Special cases everywhere

Since ProcessWire has a hierarchical page tree by default, the navigation menu will usually be created by looping over all top-level pages and outputting a list of page titles with links. If the site is a bit more complex, maybe there's an additional loop that creates a sub-menu for all children of top-level pages, or even a recursive function to iterate over an arbitrary amount of nested child pages. Something like this:

```php
function buildRecursiveMenu(Page $root): string
{
    $markup = ['<ol class="navigation">'];
    foreach ($root->children() as $child) {
        $link = '<a class="navigation__link" href="' . $child->url() . '">' . $child->title . '</a>';
        $children = $child->hasChildren() ? buildRecursiveMenu($child) : '';
        $markup[] = '<li class="navigation__item">' . $link . $children . '</li>';
    }
    $markup[] = '</ol>';
    return implode(PHP_EOL, $markup);
}
```

This is a super simple solution that can build hierarchical menu structures of arbitrary depth. However, in 'real world' projects you often are faced with some special requirements:

- The homepage has the company's name as it's title, but the title of the menu link in the navigation should be just *Home*.
- The first item in a drop-down menu should link to the top-level page it belongs to. This is sometimes required for touch devices, because the first touch (click) opens the drop-down menu instead of navigating to that page (iPads even do this by default by emulating a hover state), so some visitors might not realize it's an actual page that can be visited.
- One specific top-level page should be displayed in a drop-down menu of another top-level page, but it's position in the page tree can't be changed because of [the template's family settings / the desired URL structure / some other reason].
- The menu needs to contain some special links to external URLs.
- For one especially long drop-down menu, the items should be sorted into categories with subheadings based on a taxonomy field.

To fulfil those requirements, you can chose between a couple of different approaches:

- Checking for the special case or condition in the code and changing the output accordingly (usually with hard-coded values).
- Separating the navigation menu from the page tree completely and building a custom solution.
- Utilizing the Content Management Framework by adding fields, templates and pages that represent special states or settings.

The following sections will demonstrate each of those using examples, and discuss their respective upsides and downsides.

## Handling special cases in the code

This is the simplest solution, and often the first thing that comes to mind. For example, the first request (displaying *Home* for the homepage instead of it's actual title) can be solved by simply checking the template or ID of the page inside the menu builder function, and changing the output accordingly:

```php
// ...
$title = $child->template->name === 'home' ? 'Home' : $child->title;
$link = '<a class="navigation__link" href="' . $child->url() . '">' . $title . '</a>';
// ...
```

This is definitely the fastest solution to implement, requiring only one tiny code change. However, there are multiple downsides. Most notably, it's harder to maintain, as each of those special cases increases the complexity of the menu builder function, and makes it harder to change. As you add more special conditions, it becomes exponentially harder to keep track of all the special conditions and add more in the correct position. This is a breeding ground for bugs. It's also much harder to read, so it takes longer for another developer to pick up where you left (or, as is often cited, for yourself in six months).

Besides that, now we have a hard-coded value inside the template, that only someone with access to and knowledge of the template files can change (you can use the translation API, but that comes with it's own complexities). If the client want's the link to say *Homepage* instead of *Home* at some point, they won't be able to change it without the developer. Also, each special case that is hidden in the code makes it harder for everyone to understand what's going on in terms of template logic.

That said, this approach can be useful in some situations, mostly thanks to the minimal amount of time it takes to implement. Specifically:

- For smaller projects that you know won't need to scale or be maintained long-term.
- If you are the only one who will edit the site, with no 'non-technical' folk involved.
- For rapid prototyping ('We'll change it later').

## Building a custom interface for creating a navigation menu

The initial assumption as to what constitutes the difference between normal and special cases was that the main navigation is generated based on the site's page tree, using page titles as manu item labels. The hierachical page tree is one of the major selling points for ProcessWire, so this is a very common scenario. But of course this isn't set in stone. You can just as easily forgo using the page tree hierarchy at all and instead build a custom menu system.

For example, you could create a nested repeater structure with fields representing menu items, expose those through a general settings page or a custom module and generate the navigation menu based on that. There are also existing modules for this approach ([Menu Builder](https://modules.processwire.com/modules/process-menu-builder/), for example). This approach takes some time to implement, but gives the most power to the editors of your site. They have full control over which pages to show and where. It's also super versatile, allowing you to expose additional options to each menu and menu item for every conceivable type of menu or navigation structure. However, with great power comes great responsibility, as now each change to the menu must be performed manually. For example, when a new page is added in the page tree, it won't be visible in the menu automatically. This is very likely to create a disconnect between the page tree and the menu (which may be what you want, after all). You may get ghost pages that are not accessible from the homepage at all, or the client may forgot to unpublish pages they don't want to have any more after they've removed them from the menu, leaving supposedly hidden information accessible to the public.

I would only go with this approach if there are so many special cases that there hardly is a 'normal case'. It's a trade-off, as it is so often, between flexibility and workload. Weigh those pros and cons carefully before you choose this solution!

## Build display options to handle special cases gracefully

This is the middle ground between the two options above. Instead of building a completely custom solution, you stick with the basic idea of generating a hierarchical menu based on the page tree, but add fields and templates that allow the editor to adjust how and where individual pages are displayed, or to add custom content to the menu. of course, you will still write some additional code, but instead of having hard-coded values or conditions in the template, you expose those to the client, thereby making the special case one of the normal cases. The resulting code is often more resilient to changing requirements, as it can not one handle that specific case that the client requested, but also every future change request of the same type. The key is to add fields that enable the client to overwrite the default behaviour, while still having sensible defaults that don't require special attention from the editor in most cases. The following sections contain some more examples for this option, which is the best solution in many situations.

### Example 1: Menu display options

This is probably the first thing you thought of for the very first change request mentioned above (displaying the homepage with a different title). Instead of hard-coding the title *Home* in the template, you add a field `menu_title` that will overwrite the normal title, if set. This is definitely cleaner than a hard-coded value, since it allows the client to overwrite the title of *any* page in the menu.

In terms of downsides, consider carefully how to name and use your fields in order to reduce mental overload. Maybe the `menu_title` field isn't the best solution for this problem. If this solution was suggested by a client, find out what the actual problem is first. Perhaps they feel limited because the title is also displayed as the headline (`<h1>`) on the page itself. In this case, the sensible solution might be an additional `headline` field that will overwrite the title as `<h1>`, allowing you to use the existing title field for the menu title as well as the page's meta `<title>`.

This may seem like a minor details, but consider which fields you actually need is important – you don't want to end up with too many. If each page has individual fields for the title, a headline, a menu title and an SEO-title (for the `<title>`), you will have a hard time explaining to the client what each field is used for.

Another example in this category would be an additional checkbox field representing an option to hide a page in the menu. This could also be accomplished by using the built-in *hidden* status, skipping hidden pages in the menu. But if a page is hidden it won't show up in other listings by default as well, so separating the menu display from the hidden status might be a good idea if your site has lots of page listings.

### Example 2: A template for anchor links

Another requirement from the list above was to be able to include links to external URLs in the menu. This can be achieved creating a *Menu Link* template that can be placed anywhere in the page tree. This template needs only one additional field to hold the target URL (the global title field can be used for the link text in the menu). This way, you can link to an external URL anywhere inside your navigation menu by placing a *Menu Link* page at the appropriate position. If you want to offer even more flexibility, you can even add more options to choose between linking to an external URL, an internal page or a file download. Using [conditional field visibility](https://processwire.com/docs/fields/dependencies/) you can show the appropriate field for each option: A URL field for external links, a page reference field for internal page links, or a file field for downloads. This is also a clean solution, because the navigation menu will still reflect the page tree, making the custom links visible and easily editable by the editors.

A minor downside is that those templates are non-semantical in the sense that they aren't pages with content of their own. You'll need to make sure not to display them in other listings on the site, as they aren't viewable and don't have any content of their own. It may also require loosening up strict family rules - for example, allowing *Menu Link* as children of a *News index* page, which normally can only have *News* pages as children.

## Finding the right solution

So how do you choose the right approach in a given situation? It depends on the client, the requirements and on the special cases you expect and want to handle. Sometimes, not implementing a special case at all can be an option as well, especially if it would overcomplicate the workflows for the editors. Also, make sure you understand the actual reason behind a change request, instead of just blindly implementing the suggestion by the client. Often, clients will suggest solutions without telling you what the actual problem is they're trying to solve.

One example was mentioned above: If the client requests an additional *Menu title* field, the best solution might really be a *Headline* field. To gracefully handle those conversation, I recommend reading [Articulating Design Decisions](https://www.oreilly.com/library/view/articulating-design-decisions/9781491921555/) by Tom Greever. It includes some chapters on listening to the client, finding out the real reason behind a change request, and responding appropriately. It's written from a design perspective, but is applicable to development as well. Since UX becomes more important by the day, the lines between the disciplines are blurred anyway. Being able to conceptualize good solutions to problems is as important as knowing how to implement them, and will save you a lot of energy and nerves in the long run.

ProcessWire is at is greatest if you utilize it as a Content Management Framework, creating options and interfaces that allow for customizability while retaining usability for the editors. I usually try to hit a sweet spot where the editors have maximum control over the relevant aspects of their site, while requiring minimal work on their part by providing sensible defaults.
