---
tags: post
layout: post
title: Composer setup
---

# How to setup and integrate Composer with ProcessWire

Composer is the de-facto standard for package management in the PHP world. However, a ProcessWire site will happily work without every touching Composer, and the ProcessWire core isn't really build with Composer support in mind. That said, you get some major benefits by integrating Composer into your project:

- You can easily use pretty much any external library you want.
- You can structure your own code into reusable classes and functions, and have Composer autoload them on demand with very little overhead and configuration.
- By following a sensible folder structure (see below), you have increased security out of the box.
- You can even utilize Composer scripts to automate your project setup and build your own ProcessWire project boilerplate.

In this tutorial, I will walk through all the steps required to install Composer, add it's autoloader to ProcessWire, and use it to install external libraries and wire up your custom classes. This setup is pretty basic and includes some general information on using Composer, so you can follow along even if you haven't worked with ProcessWire before.

## Recommended directory structure

ProcessWire has some built-in Composer support, which is outlined [in this blogpost](https://processwire.com/blog/posts/composer-google-calendars-and-processwire/). Hoever, this setup recommends (and requires!) that the `vendor` folder lives _inside the webroot_ (the directory that is used as the entry point by the server, e.g. the `DocumentRoot` in Apache). This is bad from a security standpoint, because all included libraries are directly accessible over the web. So if only one file in any library you're using contains a vulnerability, your entire site is vulnerable. In general, you want to have only the stuff that needs to be accessible over the web in the webroot, and anything else outside it.

This is the directory structure we will create:

```text
.
├── composer.json
├── composer.lock
├── node_modules
├── packacke-lock.json
├── package.json
├── public
│   ├── index.php
│   ├── site
│   ├── wire
│   └── ...
├── src
│   ├── sass
│   ├── php
│   ├── js
│   └── ...
└── vendor
```

I'll refer to the main directory above as the _project root_. The `public` directory acts as the webroot, while all other files and directories in the project root aren't accessible over the web. This includes Composer's vendor folder, your node_modules (if you are using NPM), as well JavaScript source files if you are compiling your JavaScript with webpack or something similar, and your CSS preprocessor files if you are using SASS or LESS (See the next to tutorials for my recommend).

One caveat of this setup is that it's not possible to install ProcessWire modules through Composer using the PW Module Installer (see the blogpost above), but that's just a minor inconvenience in my experience.

## Initializing a Composer project

You'll need to have Composer installed on your system for this. Installation guides can be found on [getcomposer.org](https://getcomposer.org/doc/00-intro.md).

If you are starting a new project, you can just run the following commands in a new directory. If you want to add Composer to an existing ProcessWire site, make sure to initilize the Composer project **one directory above the webroot**. This directory will become your project root. I'll assume a new project for the following instructions.

```bash
mkdir ~/path/to/project/
cd ~/path/to/project/
```

First, we'll initialize a new Composer project:

```bash
composer init
```

The CLI will ask some questions about your projects. Some tips in case you are unsure how to answer the prompts:

- Package names are in the format `<vendor>/<project>`, where `<vendor>` can be your developer handle. I use my Github account as the handle, so I can enter something like `moritzlost/mysite` (all lowercase).
- Project type is probably `project` if you are creating a website.
- Author should be in the format `Name <email>`.
- Minimum Stability: I prefer `stable`, this way you only get stable versions of dependencies.
- License will be `proprietary` unless you plan on sharing your code under a FOSS license.
- Answer no to the interactive dependencies prompts for now.

This creates the `composer.json` file, which will be used to keep track of your dependencies. For now, you only need to run the Composer install command to initialize the vendor directory and the autoloader:

```bash
composer install
```

## Installing ProcessWire in the webroot

<!-- @TODO: Expand explanation & caveat: still core in public directory -->
Now it's time to download and install ProcessWire into the public directory.

```bash
mkdir public
git clone https://github.com/processwire/processwire public
```

If you don't use git, you can also download ProcessWire manually. I like to clean up the directory after that:

```bash
cd public
rm -r .git .gitattributes .gitignore CONTRIBUTING.md LICENSE.TXT README.md
```

Now, setup your development server to point to the `/path/to/project/public/` directory (mind the `public/` at the end!) and install ProcessWire normally.

## Including & using the autoloader

With ProcessWire installed, we need to include the Composer autoloader. If you check [ProcessWire's index.php file](https://github.com/processwire/processwire/blob/341342dc5b1c58012ae7cb26cffe2c57cd915552/index.php#L30), you'll see that it tries to include the autoloader if present. However, this assumes the vendor folder is inside the webroot, so it won't work in our case.

One good place to include the autoloader is a [site hook file](https://processwire.com/blog/posts/processwire-2.6.7-core-updates-and-more/#new-core-files-for-site-hooks). We need the autoloader as early as possible, so we'll use `init.php`:

```php
// public/site/init.php
<?php
namespace Processwire;

require '../../vendor/autoload.php';
```

This has one caveat: Since this file is executed by ProcessWire **after** all modules had their `init` methods called, the autoloader will not be available in those. I haven't come across a case where I needed it this early so far; however, if you really need to include the autoloader earlier than that, you could just edit the lines in the `index.php` file linked above to include the correct autoloader path. In this case, make sure not to overwrite this when you update the core!

Now we can finally include external libraries and use them in our code without hassle! I'll give you an example. For one project, I needed to parse URLs and check some properties of the path, host et c. I could use [parse_url](https://secure.php.net/manual/en/function.parse-url.php), however that has a couple of downsides (specifically, it doesn't throw exceptions, but just fails silently). Since I didn't want to write a huge error-prone regex myself, I looked for a package that would help me out. I decided to use [this URI parser](http://uri.thephpleague.com/parser/1.0/), since it's included in the [PHP League directory](http://thephpleague.com/), which generally stands for high quality.

First, install the dependency (from the project root, the folder your `composer.json` file lives in):

```bash
composer require league/uri-parser
```

This will download the package into your vendor directory and refresh the autoloader.

Now you can just use the package in your own code, and Composer will autoload the required class files:

```php
// public/site/templates/basic-page.php
<?php
namespace Processwire;

use \League\Uri\Parser;

// ...
if ($url = $page->get('url')) {
    $parser = new Parser();
    $parsed_url = $parser->parse($url);
    // do stuff with $parsed_url ...
}
```

## Wiring up custom classes and code

Another topic that I find really useful but often gets overlooked in Composer tutorials is the ability to wire up your own namespace to a folder. So if you want to write some object-oriented code outside of your template files, this gives you an easy way to autoload those using Composer as well. If you look at the tree above, you'll see there's a `src/` directory inside the project root, and a `ContentBag.php` file inside. I want to connect classes in this directory with a custom namespace to be able to have them autoloaded when I use them in my templates.

To do this, you need to edit your `composer.json` file:

```json
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
            "MoritzLost\\MySite\\": "src/"
        }
    }
}
```

Most of this stuff was added during initialization, for now take note of the `autoload` information. The syntax is a bit tricky, since you have to escape the namespace seperator (backslash) with another backslash (see the [documentation](https://getcomposer.org/doc/04-schema.md#autoload) for more information). Also note the [PSR-4](https://www.php-fig.org/psr/psr-4/) key, since that's the standard I use to namespace my classes.

The line `"MoritzLost\\MySite\\": "src/"` tells Composer to look for classes under the namespace `\MoritzLost\MySite\` in the `src/` directory in my project root. After adding the autoload information, you have to tell Composer to refresh the autoloader information:

```bash
composer dump-autoload
```

Now I'm ready to use my classes in my templates. So, if I have this file: 

```php
// src/ContentBag.php
<?php
namespace MoritzLost\MySite;

class ContentBag {
    // class stuff
}
```

I can now use the `ContentBag` class freely in my templates without having to include those files manually:

```php
// public/site/templates/home.php
<?php
namespace Processwire;

use MoritzLost\MySite\ContentBag;

$contentbag = new ContentBag();
// do stuff with contentbag ...
```

Awesome!

By the way, in PSR-4, sub-namespaces correspond to folders, so I can put the class `MoritzLost\MySite\Stuff\SomeStuff` in `src/Stuff/SomeStuff.php` and it will get autoloaded as well. If you have a lot of classes, you can group them this way.

## Conclusion

With this setup, you are following secure practices and have much flexibility over what you want to include in your project. For example, you can just as well initialize a JavaScript project by typing `npm init` in the project root. You can also start tracking the source code of your project inside your `src/` directory independently of the ProcessWire installation. All in all, you have good seperation of concerns between ProcessWire, external dependencies, your templates and your OOP-code, as well as another level of security should your Server or CGI-handler ever go AWOL. You can also build upon this approach. For example, it's good practice to keep credentials for your database outside the webroot. So you could modify the `public/site/config.php` file to include a config or `.env` file in your project root and read the database credentials from there.

Anyway, that's the setup I came up with. I'm sure it's not perfect yet; also this tutorial is probably missing some information or isn't detailed enough in some areas depending on your level of experience. Feel free to ask for clarification, and to point out the things I got wrong. I like to learn as well :)

Thanks for making it all the way to the bottom. Cheers!
