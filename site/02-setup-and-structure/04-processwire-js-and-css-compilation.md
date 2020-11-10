---
tags: post
layout: post
title: CSS and JS compilation for ProcessWire
menu_title: CSS and JS compilation
description: How to get started with CSS and JavaScript compilation for ProcessWire sites.
---

# Set up your own CSS and JavaScript build pipeline

The JavaScript ecosystem of transpilers, bundlers, minifiers and so on can be daunting to grasp, especially for beginners. If you have not setup your own CSS or JS build pipelines before, it can be easy to see all that as unnecessary complexitiy that you don't really need for small sites. And while this is true, you will benefit greatly from using a CSS pre-processor in particular and, to a lesser degree, a JavaScript bundler.

This article demonstrates easy-to-use tools that allow you to write SASS and modern JavaScript and compile them to optimized and compatible CSS and JS output. Note that there are alternatives for every tool in this setup; the tools I present here are merely my preference. Here's a list of tools used in this tutorial (in bold) along with some popular alternatives:

- **NPM**, Yarn
- **SCSS**, LESS, PostCSS
- **node-sass**, Dart Sass, Ruby Sass, or the corresponding tool for your chosen pre-processor
- **Parcel**, WebPack, Gulp, Grunt

{% alert 'info' %}

This tutorial is only tangentially related to ProcessWire. However, SCSS in particular is a prerequisite for some of the later tutorials, so it's included as a sort of common ground.

{% endalert %}

## How to set up NPM and initialize a project

Compilation and bundler tools for CSS and JavaScript usually come in the form of NPM modules, so the first thing you need is NodeJS and NPM. I recommend installing those with the [Node Version Manager](https://github.com/nvm-sh/nvm) (for Windows, you need [WSL](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) for this), as it allows you to change and update Node- and NPM-versions very conveniently. To get started, follow the installation instructions in the repository above. Once nvm is installed, install the current node version and verify that you can use node and npm:

```bash
nvm install node
node -v
# v13.9.0
npm -v
# 6.13.7
```

Similar to Composer, NPM uses a text file (`package.json`) inside the project directory to keep track of the dependencies of your project. This file will also be used to define build scripts so that you don't have to remember individual shell commands. You can initialize the repository through `npm init`. If you're unsure about the individual fields, [check the documentation](https://docs.npmjs.com/creating-a-package-json-file).

## SCSS compilation and structure

There are multiple SASS compilers that you can choose from. I prefer [node-sass](https://github.com/sass/node-sass) because it's fast and you can install it quickly with NPM. Make sure to install it with `-S` / `--save` so it gets added to the dependencies in your `package.json`:

```bash
npm i -S node-sass
```

Now you need to decide where you want to keep your SASS source files, and where the compiled CSS files should go. The former should be outside the webroot, the latter need to be inside it so they're accessible over the web. I use `src/sass/` and `public/site/css/` respectively. The compilation command can look something like this:

```bash
node-sass src/sass --output=public/site/css
```

This will compile any SASS files inside the source directory and put them inside the CSS directory. Note that I specified a source directory instead of a single file, so you can compile multiple files. This is useful if you want to split up your CSS into multiple smaller files, for example to have separate display and print stylesheets, or to generate multiple color themes for your site.

{% alert 'info' %}

Usability tip: Generate a separate stylesheet including only your typography styles and fonts to use with CK Editor fields, this way the text in WYSQIG editors will look exactly the same as on the site itself.

{% endalert %}

While you can run the above script directly from your command line, it's better to define it inside your `package.json` in the `scripts` section. This way, you don't have to remember paths and command line arguments. Here's an example that defines two scripts, a build command that generates minified CSS for production, and a watch command that will recompile the CSS whenever the source files are changed:

```json
// package.json
{
    // ...
    "scripts": {
        "watch:sass": "node-sass --watch --output-style=expanded --source-maps=true src/sass --output=public/site/css",
        "build:sass": "node-sass --output-style=compressed --omit-source-map-url src/sass --output=public/site/css",
    },
    // ...
}
```

Now you can run those scripts with NPM from the command line:

```bash
npm run watch:sass
npm run build:sass
```

Since this is not an SCSS tutorial, I'll end this section with only a couple of tips:

- The compilation script above will compile all SCSS files within the source directory, except those starting with an underscore. If you split your SCSS into multiple files and import them in your main entry file, make sure all included files start with an underscore.
- If you are working on a larger sites, you want to consider how to organize all your SCSS files. One approach is the [7-1 pattern](https://sass-guidelin.es/#the-7-1-pattern).
- For readability and coherence you'll want to pick a naming methodology for classes and components. I like the [BEM (Block Element Modifier) approach](http://getbem.com/).

## JavaScript compilation with Parcel

I see many developers shy away from the topic of compiling JavaScript, because it [seems like a daunting task](https://hackernoon.com/how-it-feels-to-learn-javascript-in-2016-d3a717dd577f) – and, to be fair, it can be. But for a simple project, you don't need most of the complexity. If you only have a couple of simple scripts you want to bundle up, possibly include a couple of external libraries and serve those as one minified file, you can get going very quickly with [Parcel](https://parceljs.org/). Parcel is a bundler that does many things such as JavaScript transpilation and minification under the hood. The process is similar to the SASS compilation setup. Simply install the library, define a compilation script in your `package.json` and then run it with NPM.

```bash
npm install -S parcel
```

```json
// package.json
{
    // ...
    "scripts": {
        "watch:parcel": "parcel watch src/js/* --target browser --public-url /site/js/ --out-dir public/site/js/",
        "build:parcel": "parcel build src/js/* --no-source-maps --target browser --public-url /site/js/ --out-dir public/site/js/"
    },
    // ...
}
```

With the wildcard syntax, this will compile all JavaScript files inside `src/js/`. This excludes subfolders, so you can split up your JavaScript into multiple smaller files in subfolders and [import](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Statements/import) everything you need inside one main entry file. The directory structure can look like this:

```text
.
├── Components
│   ├── Gallery.js
│   ├── Lightbox.js
│   └── Navigation.js
└── main.js
```

The individual files inside the subdirectory can either include procedural code, or export classes, constants or functions to be used inside the main file. As long as you import them in your entry file, Parcel will resolve the imports and bundle everything into one compiled JavaScript file.

```javascript
// src/js/Components/Navigation.js
const hamburger = document.querySelector('.hamburger');
hamburger.addEventListener('click', e => {
    // open the navigation menu
})


// src/js/Components/Lightbox.js
import Tobi from "@rqrauhvmra/tobi";
const lightbox = new Tobi();
// tobi is a neat little lightbox library, make sure to install it first:
// npm i -S @rqrauhvmra/tobi


// src/js/main.js
import "./Components/Navigation";
import "./Components/Lightbox";
```

With this setup, you have a couple of advantages over 'traditional', uncompiled JavaScript:

- You can use up-to-date JavaScript language constructs and methods, Parcel automatically compiles and transpiles it so it works in older browsers. You can also specify [which browsers you want to target](https://parceljs.org/javascript.html#default-babel-transforms).
- You can split up your code into smaller chunks and classes, without having to worry about browsers that don't support ES6 imports.
- You can install and import libraries through NPM, without having to download them manually or adding arbitrary CDN links to your HTML.

## Conclusion

Setting up SASS and JS compilation is super easy and improves workflows considerably. With this setup, you can still build very traditional, server-side rendered sites without going all the way down the rabbit-hole to Single Page Applications, but with the advantage of writing easily separated components. Parcel is a good alternative to Webpack if you want something simple that doesn't require a lot of configuration. The final advantage is that you can now simple install NPM modules and import them into your project, without having to worry about manually including and managing dependencies.
