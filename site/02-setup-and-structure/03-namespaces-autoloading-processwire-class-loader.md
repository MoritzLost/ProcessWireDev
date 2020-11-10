---
tags: post
layout: post
title: Namespaces, autoloading and PSR-4
menu_title: Namespaces and autoloading
description: Namespaces and autoloading in PHP explained for ProcessWire developers.
---

# Namespaces, Autoloading and PSR-4: How to use ProcessWire's class loader

Namespaces, autoloading and Composer generate a lot of confusion even though those topics are all straightforward on their own. In general, it's easy to get overwhelmed when you try to wrap your head around all there concepts at once. It is much easier to explain and understand them separately. This is a general guide to the following topics:

1. How namespaces work in PHP.
2. How autoloading works in PHP.
3. Conventions for mapping namespaces to directory structures: PSR-4.
4. How autoloading works in Composer and ProcessWire's class loader.
5. How to use the class loader in a ProcessWire module.

You can skip the sections you're already familiar with.

## Namespaces in PHP

The purpose of namespaces in PHP is to avoid naming conflicts between classes, functions and constants, especially when you're using external libraries and frameworks. Nothing more. It's important to understand that this has nothing at all to do with autoloading, directory structures or file names. You can put namespaced stuff everywhere you want. You can even have multiple namespaces inside a single file (don't try this at home). Namespaces only exist to be able to use a generic name – for example, ProcessWire's `Config` class – multiple times in different contexts without getting a naming conflict. Without namespaces, you couldn't use any library that includes a `Config` class of its own in a ProcessWire project, because that name is already taken. With namespaces, you can have a distinction between the classes `ProcessWire\Config` and `MoritzLost\Config`. You can also use sub-namespaces to further segregate your code into logical groups. For example, there can be two classes `MoritzLost\Frontend\Config` and `MoritzLost\Backend\Config` without any problems – a class name only needs to be unique within its namespace.

You can declare the namespace for a PHP file using the namespace statement at the top:

```php
// file-one.php
<?php
namespace ProcessWire;

// file-two.php
<?php
namespace MoritzLost\Frontend;
```

This way, all classes, methods and constants defined inside this file are placed in that namespace. All ProcessWire classes live in the `ProcessWire` namespace.

Now to use one of those classes – for example, to instantiate it – you have a couple of options. You can either use its fully qualified class name or import it into the current namespace. Also, if you are inside a namespaced file, any reference to a class is relative to that namespace. Unless it starts with a backward slash, in this case it's relative to the global namespace. So all of those examples are equivalent:

```php
// example-one.php
<?php
namespace ProcessWire;
$page = new Page();

// example-two.php
<?php
use ProcessWire\Page;
$page = new Page();

// example-three.php
<?php
$page = new ProcessWire\Page();

// example-four.php
<?php
namespace MoritzLost\Somewhere\Over\The\Rainbow;
$page = new \ProcessWire\Page();
```

The `use` statement in the second example can be read like this: *“Inside this file, all references to `Page` refer to the class `\ProcessWire\Page`.”*

## How autoloading works in PHP

Every PHP program starts with one entry file – for ProcessWire, that's usually its `index.php`. But you don't want to keep all your code in one file, that would get out of hand quickly. Once you start to split your code into several individual files however, you have to take care of manually including them with `require` or `include` calls. That becomes very tedious as well. The purpose of autoloading is to be able to add new code in new files without having to import them manually. This, again, has nothing to do with namespaces, not even something with file locations. Autoloading is a pretty simple concept: If you try to use a class (or function or constant, I'll just refer to classes from now on) that hasn't been loaded yet, PHP calls upon its registered autoloaders as a last-ditch attempt to load them before throwing an exception.

Let's look at a simple example:

```php
// classes.php
<?php
class A { /** class stuff */ }
class B { /** class stuff */ }

// index.php
<?php
spl_autoload_register(function ($class) {
    include_once 'classes.php';
});
new A();
new B();
```

This is a complete and functional autoloader. If you don't believe me, go ahead and save those two files (`classes.php` and `index.php`) and run the `index.php` with `php -f index.php`. Then comment out the `include_once` call and run it again, then you'll get an error that class `A` was not found.

Now here's what happens when `index.php` is executed (with the autoloader active):

1. Our anonymous function is added to the autoload queue through `spl_autoload_register`.
2. PHP tries to instantiate class `A`, but can't because it's not loaded yet.
3. If there was no autoloader registered, the program would die with a fatal error at this point. But since there is an autoloader ...
4. The autoloader is called. Our autoloader includes `classes.php` with the class definition.
5. That was a close one! Since the class has been loaded, execution goes back to the `index.php` which can now proceed to instantiate A and B. If the class was still not loaded at this point, PHP would go back to the original plan and die.

One thing to note is that the autoloader will only be called once in this example. That's because both `A` and `B` are in the same file and that file is included during the first call to the autoloader. Autoloading works on files, not on classes!

The important takeaway is that PHP doesn't know if the autoloader knows where to find the class it asks for or, if there are multiple autoloader, which one can load it. PHP just calls each registered autoloader in turn and checks if the class has been loaded after each one. If the class still isn't loaded after the last autoloader is done, it's error time.

What the autoloader actually does is pretty much wild wild west as well. It takes the name of the class PHP is trying to load as an argument, but it doesn't have to do anything with it. Our autoloader ignores it entirely. Instead, it just includes `classes.php` and says to itself *“My job here is done”*. If class `A` was in another file, it wouldn't have worked.

This process has two main advantages:

1. Since autoloaders are only called on-demand to load classes just in time, we only include the files we actually need. If in the example above class `A` and `B` are not used in some scenarios, the `classes.php` will not be included, which will result in better performance for larger projects (though this isn't as cut and dry, since autoloading has its own overhead, so if you load most classes anyway during a single request, it will actually be less efficient).
2. If the autoloader is smart enough to *somehow* map class names to the files they're located in, we can just let the autoloader handle including the classes we need, without having to worry about jamming `include` statements everywhere. That brings us to …

## PSR-4, namespaces and directory structures

As you see, namespaces and autoloading are both pretty limited concepts. And they aren't inherently linked to each other. You can namespace your classes without ever adding an autoloader, and you can autoload classes that are all in the same namespace. But they become useful when you put them together. At the core of all that autoloading talk is a simple idea: By putting classes in files named after their class names, and putting those files in directory hierarchies based on the namespace hierarchy, the autoloader can efficiently find and load those files based on the namespace. All it needs is a list of root namespaces with their corresponding directories.

The exact way class names and namespaces are mapped to directory structures and file names is purely conventional. The accepted convention for this is [PSR-4](https://www.php-fig.org/psr/psr-4/). This is a super simple standard which basically just sums up the ideas above:

1. A base namespace is mapped to a specific directory in the file system. When the autoloader is asked to load a class in that namespace (or a sub-namespace of it), it starts looking in that folder. This "base" namespace may include multiple parts – for example, I could use `MoritzLost\MyAwesomeLibrary` as a base and map that to my source directory. PSR-4 calls this a "namespace prefix".
2. Each sub-namespace corresponds to a sub-directory. So by looking at the namespace, you can follow subdirectories to the location where you expect to find the class file.
3. Finally, the class name is mapped directly to the file name. So `MyCoolClass` needs to be put inside `MyCoolClass.php`.

This all sounds simple and straightforward — and it absolutely is! It's only once you mash everything together, mix up language features, accepted conventions and proprietary implementations like Composer on top that it becomes hard to grasp in one go.

## Composer and ProcessWire's class loader

Now all that's left is to talk about how Composer and ProcessWire provide autoloading.

Composer, of course, is primarily a tool for dependency management. But because most libraries use namespaces and most developers want to have the libraries they're using autoloaded, those topics become a prerequisite to understanding what Composer does in this regard. Composer can use different autoloading mechanisms; for example, you can just give it a [static list of files](https://getcomposer.org/doc/04-schema.md#files) to include for every request, or use the older [PSR-0 standard](https://getcomposer.org/doc/04-schema.md#psr-0). But most modern libraries use PSR-4 to autoload classes. So all Composer needs to function is a mapping of namespace prefixes to directories. Each library maintains this mapping for its PSR-4-structured classes through the [autoload information in their composer.json](https://getcomposer.org/doc/04-schema.md#psr-4). You can do this for your own site to: Just include the autoload information as shown in the documentation and point it to the directory of your class files.

Composer collects all that information and uses it to generate a custom file at `vendor/autoload.php` — that's the one you need to include somewhere whenever you set up Composer in one of your projects. Bells and whistles aside, this file just registers an autoloader function that will use all the information collected from your own and your included libraries' `composer.json` to locate and include class files on demand.

You can read more about how to [optimize Composer's autoloader for production usage here](https://getcomposer.org/doc/articles/autoloader-optimization.md). If you want to read up on how to set up Composer for your own sites, read [my ProcessWire + Composer integration guide](https://processwire.com/talk/topic/20490-how-to-setup-composer-and-use-external-libraries-in-processwire/) instead.

And finally, what does ProcessWire do to handle all this? Turns out, [ProcessWire has its own autoloader implementation](https://processwire.com/api/ref/wire-class-loader/) that is more or less PSR-4 compliant. You can access it as an API variable (`$classLoader` or `wire('classLoader')`, depending on context). Instead of using a static configuration file like Composer, the namespace -> directory mapping is added during the runtime by calling [$classLoader->addNamespace](https://processwire.com/api/ref/wire-class-loader/add-namespace/). As you would expect, this function accepts a namespace and a directory path. You can use this to register your own custom namespaces. Alternatively, if you have site-specific classes within the `ProcessWire` namespace, you can just add their location to the class loader using the same method: `$classLoader->addNamespace('ProcessWire', '/path/to/your/classes/')`.

## Utilizing custom namespaces and autoloading in modules

Now as a final remark, I wanted to give an example of how to use custom namespaces and the class loader in your own modules. I'll use my [TrelloWire](https://github.com/MoritzLost/TrelloWire) module as an example:

1. Decide what namespace you're going to use. The main module file should live in the `ProcessWire` namespace, but if you have other classes in your module, they can and should use a custom namespace to avoid collisions with other modules. TrelloWire uses `ProcessWire\TrelloWire`, but you can also use something outside the `ProcessWire` namespace.
2. You need to make sure to add the namespace to the class loader as early as possible. If either you or a user of your module tries to instantiate one of your custom classes before that, it will fail. Good places to start are the constructor of your main module file, or their `init` or `ready` methods.

Here's a complete example. The module uses only one custom namespaced class: [ProcessWire\TrelloWire\TrelloWireApi](https://github.com/MoritzLost/TrelloWire/blob/master/src/TrelloWireApi.php), located in the `src/` directory of the module. But with this setup, I can add more classes whenever I need without having to modify anything else.

```php
/**
 * The constructor registers the TrelloWire namespace used by this module.
 */
public function __construct()
{
    $namespace = 'ProcessWire\\TrelloWire';
    $classLoader = $this->wire('classLoader');
    if (!$classLoader->hasNamespace($namespace)) {
        $srcPath = $this->wire('config')->paths->get($this) . 'src/';
        $classLoader->addNamespace($namespace, $srcPath);
    }
}
```

[Source](https://github.com/MoritzLost/TrelloWire/blob/d25d8c4e663629b5bdfd4c6fd74f8171ca0e604e/TrelloWire.module#L53-L64)
