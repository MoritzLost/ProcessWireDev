---
tags: post
layout: post
title: Composer setup
---

# How to setup and integrate Composer with ProcessWire

Composer is the de-facto standard for package management in the PHP world. However, a ProcessWire site will happily work without ever touching Composer, and the ProcessWire core isn't really build with Composer support in mind. That said, you get some major benefits by integrating Composer into your project:

- You can easily use pretty much any external library you want.
- You can structure your own code into reusable classes and functions, and have Composer autoload them on demand with very little overhead and configuration.
- By following a sensible folder structure (see below), you get increased security out of the box.
- You can even utilize Composer scripts to automate your project setup and build your own ProcessWire project boilerplate.

In this tutorial, I will walk through all the steps required to install Composer, add it's autoloader to ProcessWire, and use it to install external libraries and wire up custom classes. This setup is pretty basic and includes some general information on using Composer, so you can follow along even if you haven't worked with it before.

## Recommended directory structure for ProcessWire projects with Composer

ProcessWire has some built-in Composer support, which is outlined [in this blogpost](https://processwire.com/blog/posts/composer-google-calendars-and-processwire/). Hoever, this setup requires that the `vendor` folder lives _inside the webroot_ (the directory that is used as the entry point by the server, e.g. the `DocumentRoot` in Apache). This is problematic from a security standpoint, because all included libraries will be directly accessible over the web. So if only one file in any library you're using contains a vulnerability, your entire server is vulnerable. In general, you want to have only the stuff that needs to be accessible over the web in the webroot, and anything else outside it.

This is the directory structure we will create:

```text
.
├── composer.json
├── composer.lock
├── public
│   ├── index.php
│   ├── site
│   ├── wire
│   └── ...
├── src
│   ├── php
│   └── ...
└── vendor
```

I'll refer to the main directory above as the _project root_. The `public` directory acts as the webroot, while all other files and directories in the project root aren't accessible over the web. This includes Composer's `vendor` folder, your `node_modules` (if you are using NPM), as well JavaScript source files if you are compiling your JavaScript with webpack or something similar, and your CSS preprocessor files if you are using SASS or LESS.

One caveat of this setup is that it's not possible to install ProcessWire modules through Composer using the _ProcessWire Module Installer_ (see the blogpost above), but that's just a minor inconvenience in my experience.

## Initializing a Composer project

You'll need to have Composer installed on your system for this. Installation guides can be found on [getcomposer.org/download](https://getcomposer.org/download/).

If you are starting a new project, you can just run the following commands in an empty directory. If you want to add Composer to an existing ProcessWire site, make sure to initilize the Composer project **one directory above the webroot**. This directory will become your project root. I'll assume a new project for the following instructions.

First, create the new project directory and enter it. Then, initialize a new Composer project:

```bash
mkdir ~/path/to/project/
cd ~/path/to/project/
composer init
```

The CLI will ask some questions about your project. Some tips in case you are unsure how to answer the prompts:

- Package names are in the format `<vendor>/<project>`, where `<vendor>` can be your developer handle. I use my Github account as the handle, so I could enter something like `moritzlost/mysite` (all lowercase).
- Project type is probably `project` if you are creating a website.
- Author should be in the format `Name <email>`.
- Minimum Stability: I prefer `stable`, this way you only get stable versions of dependencies.
- License will be `proprietary` unless you plan on sharing your code under a FOSS license.
- Answer no to the interactive dependencies prompts for now.

This creates the `composer.json` file, which will keep track of your dependencies. For now, you only need to run the `install` command to initialize the vendor directory and the autoloader:

```bash
composer install
```

## Installing ProcessWire in the webroot

Now it's time to download and install ProcessWire into the public directory. You can do that manually or use git since you're already on the command line. Make sure to install ProcessWire into the `public` directory, i.e. the webroot.

```bash
mkdir public
git clone https://github.com/processwire/processwire public
```

<small class="sidenote sidenote--info">

_Sidenote:_ Of course it would be best if the ProcessWire core lived outside the webroot alongside our other dependecies. However, ProcessWire doesn't really support that, and it does include some configuration in it's `.htaccess` file to safeguard sensitive directories and files inside the CMS, so it's not a big problem.

</small>

I like to clean up the directory, since we don't need most of the scaffolding files:

```bash
cd public
rm -r .git .gitattributes .gitignore CONTRIBUTING.md LICENSE.TXT README.md
```

Now setup your development server to point to the `/path/to/project/public/` directory and install ProcessWire normally.

## Including and using the Composer autoloader

Having installed ProcessWire, we still need to include the Composer autoloader. If you check [ProcessWire's index.php file](https://github.com/processwire/processwire/blob/master/index.php#L30), you'll see that it tries to include the autoloader automatically. However, this assumes the vendor folder is inside the webroot, so it won't work in our case.

One way to fix this is to just edit the `index.php` and adjust the path to the autoloader, but any change in there may be overwritten whenever ProcessWire is updated. Instead, one good place to include the autoloader is in a [site hook file](https://processwire.com/blog/posts/processwire-2.6.7-core-updates-and-more/#new-core-files-for-site-hooks). We need the autoloader as early as possible, so we'll use `init.php`:

```php
// public/site/init.php
<?php
namespace Processwire;

require __DIR__ . '/../../vendor/autoload.php';
```

This has one caveat: Since this file is executed by ProcessWire **after** all ProcessWire modules had their `init` methods called, the autoloader will not be available in those. I haven't yet come across a case where I needed it this early. If you really need to include the autoloader earlier than that, you could also include the autoloader in your site's `config.php` file, this way it gets loaded before any module. I try to avoid this method, because I don't want my configuration file to have side effects.

Now we can finally include external libraries and use them in our code without hassle! For example, let's say you want to parse URLs and extract individual parts from it. You could use [parse_url](https://secure.php.net/manual/en/function.parse-url.php), however that has a couple of downsides (specifically, it doesn't throw exceptions on invalid input, but just fails silently). A good alternative is the [this URI parser](https://uri.thephpleague.com/uri/6.0/) by the PHP League, which is available as a Composer library.

First, install the dependency (all Composer commands should be run from the project root, the folder your `composer.json` file lives in):

```bash
composer require league/uri:^6.0
```

This will download the package into your vendor directory and refresh the autoloader.

Now you can just use the package in your own code, and Composer will autoload the required class files:

```php
// public/site/templates/basic-page.php
<?php
namespace Processwire;

use League\Uri\UriString;

if ($url = $page->get('some_url_field')) {
    $parsed_url = UriString::parse($url);
    // do stuff with $parsed_url ...
}
```

## How to autoload your own code and classes with Composer

Another topic that I find really useful but often gets overlooked in Composer tutorials is the ability to wire up your own namespace to a directory. If you want to write some object-oriented code outside of your template files, this gives you an easy way to autoload those using Composer as well.

As an example, suppose I have a custom `ContentBag` class that I use to collect content snippets from different places (it doesn't really matter what the class does at the moment). I want this to live inside my custom project namespace so it can never interfere with the ProcessWire core or other dependencies. Here's the file:

```php
// src/php/ContentBag.php
<?php
namespace MoritzLost;

class ContentBag {
    // class functionality
}
```

Note the namespace, which gives the Full Qualified Class Name `MoritzLost\ContentBag`. The file is located at `src/php/ContentBag.php`. What we need to do is map the namespace `MoritzLost` to the directory `src/php` (of course, you could choose another location, as long as it's outside the webroot!). To do this, edit your `composer.json` file:

```json/12-16
{
    "name": "moritzlost/mysite",
    "type": "project",
    "license": "proprietary",
    "authors": [
        {
            "name": "Moritz L'Hoest",
            "email": "info@herebedragons.world"
        }
    ],
    "minimum-stability": "stable",
    "require": {},
    "autoload": {
        "psr-4": {
            "MoritzLost\\": "src/php/"
        }
    }
}
```

The `autoload` section tells Composer that our namespace / directory mapping follows [PSR-4](https://www.php-fig.org/psr/psr-4/). And most importantly, the line `"MoritzLost\\": "src/php/"` tells Composer that all classes under the namespace `MoritzLost` will be located inside the directory `src/php/` (relative to the project root). Note that you have to escape the namespace seperator (backslash) with another backslash (see the [documentation](https://getcomposer.org/doc/04-schema.md#autoload) for more information).

After adding the autoload information, you have to tell Composer to refresh the generated autoloader:

```bash
composer dump-autoload
```

Now I'm ready to use my `ContentBag` class in my templates, without having to include those files manually:

```php
// public/site/templates/home.php
<?php
namespace Processwire;

use MoritzLost\ContentBag;

$contentbag = new ContentBag();
// do stuff with $contentbag ...
```

Awesome!

By the way, in PSR-4, sub-namespaces correspond to folders, so I can put the class `MoritzLost\Foo\Bar` in `src/php/Foo/Bar.php` and it will get autoloaded as well. If you have a lot of classes, you can group them this way.

## Conclusion

With this setup, you are following secure practices and have much flexibility over what you want to include in your project. For example, you can just as easily include some npm libraries in your project root and set up JavaScript and CSS compilation. You can also start tracking the source code of your project inside your `src/php/` directory independently of the ProcessWire installation. All in all, you have good seperation of concerns between ProcessWire, external dependencies, your ProcessWire templates and your custom classes, as well as another level of security by not exposing source files over the web. You can also build upon this approach. For example, it's good practice to keep credentials for your database outside the webroot. So you could modify the `public/site/config.php` file to include a config or `.env` file in your project root and read the database credentials from there.
