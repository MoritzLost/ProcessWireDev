---
tags: post
layout: post
title: CSS and JS compilation for ProcessWire
---

# Set up your own CSS and JavaScript build pipeline

The JavaScript ecosystem of transpilers, bundlers, minifiers and so on can be daunting to grasp, especially for beginners. If you have not setup your own CSS or JS build pipelines before, it can be easy to see all that as unnecessary complexitiy that you don't really need for small sites. And while this is true, you will benefit greatly from using a CSS pre-processor in particular and, to a lesser degree, a JavaScript bundler.

This post details a simple approach to writing reusable SASS and JavaScript components and bundle them to minified CSS and JS output files. Note that there are alternatives for every tool in this setup; the tools I present here are merely my preference. Here's a list of tools used in this tutorial (in bold) along with some popular alternatives:

- **NPM**, Yarn
- **SCSS**, LESS, PostCSS
- **node-sass**, Dart Sass, Ruby Sass, or the corresponding tool for your chosen pre-processor
- **Bootstrap 4**, Bulma, Tailwind, UI kit, Foundation, ...
- **Parcel**, WebPack, Gulp, Grunt

<small class="sidenote sidenote--info">

This tutorial is only tangentially related to ProcessWire. However, SCSS in particular is a prerequisite for some of the later tutorials, so it's included as a sort of common ground.

</small>

## How to set up NPM and initialize a project

Compilation and bundler tools for CSS and JavaScript usually come in the form of NPM modules, so the first thing you need is NodeJS and NPM. I recommend installing those with the [Node Version Manager](https://github.com/nvm-sh/nvm) (for Windows, you need [WSL](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux)), as this allows you to change and update Node- and NPM-versions very conveniently. To get started, follow the installation instructions in the repository above. Once nvm is installed, install the current node version and verify that you can use node and npm:

```bash
nvm install node
node -v
# v13.9.0
npm -v
# 6.13.7
```

Similar to Composer, NPM uses a text file (`package.json`) inside the project directory to keep track of the dependencies of your project. This file will also be used to define build scripts so that you don't have to remember individual shell commands. You can initialize the repository through `npm init`. If you're unsure about the individual fields, [check the documentation](https://docs.npmjs.com/creating-a-package-json-file).

## SCSS compilation and structure

- basic compilation setup (node-sass)
- structure and naming conventions
- example: BEM

## Integrate Bootstrap 4 as a library

- use bootstrap for theme system (variables), utility methods and grid system
- dislike javascript and most components, so don't include them
- integrate seamlessly into your build system, and reuse theme variables in your own code to maximize themability

## JavaScript compilation with Parcel

- install parcel
- simple compilation & watch script
- ES6 ...
