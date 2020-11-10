---
tags: post
layout: homepage
title: ProcessWire web development tutorials — processwire.dev
menu_title: Introduction
description: ProcessWire development made easy with free tutorials for web developers.
---

# Tutorials for adept web development with ProcessWire

[processwire.dev](https://processwire.dev) is a collection of (opinionated) tutorials on web development with the [ProcessWire Content Management Framework](https://processwire.com/). The guides aim to illustrate best practices for ProcessWire development in terms of performance, accessibility, security, extensibility, developer and user experience in the context of ProcessWire.

All tutorials are written and maintained by me, Moritz L'Hoest (*MoritzLost* on [Github](https://github.com/MoritzLost) and in the [ProcessWire Forum](https://processwire.com/talk/profile/7016-moritzlost/)).

## How to get started

I do not want to write the millionth `hello world` tutorial that will teach you how to install the CMS and set up your first template. If you're looking for a ProcessWire starter tutorial, take a look at [ProcessWire CMS — A Beginner's Guide by Smashing Magazine](https://www.smashingmagazine.com/2016/07/the-aesthetic-of-non-opinionated-content-management-a-beginners-guide-to-processwire/). Instead, this guide assumes some level of familiarity with ProcessWire and PHP, as well as a solid grasp on current web technologies (HTML5, CSS, JavaScript / ES6 and above).

All tutorials are mostly self-contained, so you can read them in any order you like, or just pick the topics that interest you. That said, most tutorials assume you know how to use Composer and to install external libraries and configure the autoloader for your custom PHP code — see the articles on the [Composer integration](/integrate-composer-with-processwire/) and on [namespaces and autoloading in general](/integrate-composer-with-processwire/). I also use the [Twig template language](https://twig.symfony.com/) on most of my sites and many examples feature Twig syntax, you can learn more in the following articles: [Twig + ProcessWire Setup](/twig-processwire-setup/) and [Custom Functionality](/twig-processwire-custom-functionality/).

If you need some general pointers on ProcessWire, I consider the following topics from the ProcessWire documentation to be essential reading:

- [Using template files in ProcessWire](https://processwire.com/docs/start/templates/) and [How to structure your template files](https://processwire.com/docs/tutorials/how-to-structure-your-template-files/), especially the section on _Delayed Output_.
- [About the ProcessWire API](https://processwire.com/docs/start/api/) and [Introduction to ProcessWire API variables](https://processwire.com/docs/start/variables/)
- [Using selectors](https://processwire.com/docs/selectors/)
- [Multiple language support with ProcessWire](https://processwire.com/docs/multi-language-support/)
- **[ProcessWire API Reference](https://processwire.com/api/ref/)**

## Quality standards

Since this site is about following best practices, it's important to define the quality standards against which those practices are measured. The following is a (roughly ordered) list of my own quality standards and goals for the websites I build. Having such a list helps make decisions about trade-offs and incompatible goals.

I invite you to read through the list and think about which aspects are more or less important to you, and what other things would go on your list. If there is a large disconnect between your values and mine, some chapters might feel unnecessary or counterproductive — which is totally fine. You should carefully consider what's important to you and disregard any advice I give if it clashes with your goals for your development work or individual projects.

1. **User experience and accessibility.** Browsing and using the site is effortless. The site is inclusive by following established accessibility standards. Design flourishes and delightful interactions never trump ease of use or accessibility.
2. **Security.** Follow best practices for security hardening. Security should be considered from the beginning, not as an afterthought. Improve your code's resilience against unknown bugs and exploits by reducing the attack surface.
3. **Performance.** Vital for user experience, user retention and search engine ratings. The best performance optimization is cutting out things you don't need.
4. **Future-proof work.** Data and content are stored in sensible formats and structures, independent of the current presentation format or design. Source code is clear, concise and separates concerns.
5. **Standards-compliance and technical SEO.** Follow web standards to make your content accessible to all channels and devices that understand those standards. This includes responsive design based on available space, not on device detection, and structured (meta-)data to make the content machine-readable.
6. **Intuitive editing workflows.** Editors of your site's content don't need a tutorial to work with your interfaces, all fields are either self-explanatory or include usage instructions. Editors can't accidentally break anything with unexpected inputs.
7. **Developer experience.** The code and site structure follows accepted standards for web development like [DRY code](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) and separation of concerns to ensure maintainability.


## Definitions and roles

This site includes chapters on how to make life a little easier for everyone involved in the lifecycle of building and maintaining a site. For clarity, here are my broad distinctions between the different roles of the people that may be involved in a project. Depending on project size, one person may take on multiple of those roles.

- **Developers** — That's probably you, as well as everyone else who has access to the site's source code and/or superadmin access to the CMS. You may take some shortcuts when you are the only developer for a project. But even then, you should always work under the assumption that a different person has to read and understand your code — just in case you have to go back to change something after six months.
- **Clients** and **Editors** — Your client is the person you're building the site for. There is always a client; if you are working on an internal project for your company, the client is your boss. If you're working on a project of your own, you are your own client! Everyone who uses the CMS to edit pages and content is an editor.
- **Users** or **Visitors** — The people who will actually visit your site once it's finished. There's no clear distinction between users and visitors, it mostly depends on whether the site is more of a brochure site conveying information, or an application that the users interact with. User experience (UX) is important for both, so for all intents and purposes, we don't need to differentiate between the two.

## About me

I currently work for [schwarzdesign](https://www.schwarzdesign.de/) as a developer with over three years of experience building sites on different stacks. In this time I have built over 15 websites with ProcessWire. I have also written several [ProcessWire tutorials for the support forum](https://processwire.com/talk/profile/7016-moritzlost/content/?type=forums_topic&change_section=1), most of which have been revised and updated for this site.

I also created and maintain the following ProcessWire modules:

- [Automatically link page titles](https://processwire.com/modules/textformatter-page-title-links/)
- [Cache Control](https://processwire.com/modules/process-cache-control/)
- [Trello Wire](https://processwire.com/modules/trello-wire/)
- [Cacheable Placeholders](https://processwire.com/modules/cache-placeholders/)
- [Inputfield hCaptcha](https://processwire.com/modules/inputfield-hcaptcha/)

## Suggestions and error reports

If you find an error, have a suggestion for improvements or any other comment, you can let me know through the following channels. Don't be hesitant to message me because of a spelling mistake — I despise those as well ;-)

- Discussion thread in the ProcessWire forums (TBA).
- Email me at [info@processwire.dev](mailto:info@processwire.dev)
- The source code for this site is in a [public Github repository](https://github.com/MoritzLost/ProcessWireDev), so you can [open an issue](https://github.com/MoritzLost/ProcessWireDev/issues) or a [pull request](https://github.com/MoritzLost/ProcessWireDev/pulls).

## Support options

You can support this site in the following ways:

- The site is set up to receive micropayments through [Coil](https://coil.com).
- If you're using the Brave browser, you can [tip me some BAT](https://creators.brave.com/).
- You can also support me directly: [paypal.me/MoritzLost](https://paypal.me/MoritzLost)
