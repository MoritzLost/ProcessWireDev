const markdownIt = require('markdown-it');
const utils = require('./src/utils');

const extractVersionPrefix = slug => {
    const prefixMatch = slug.match(new RegExp(/^\d{1,3}(?=-)/));
    return prefixMatch ? Number(prefixMatch[0]) : null;
};

const stripVersionPrefix = slug => slug.replace(new RegExp(/^\d{1,3}-/), '')

module.exports = eleventyConfig => {
    // custom markdown library with automatic anchors for h2 headings
    const markdownLib = markdownIt({
        html: true,
        typographer: true,
    }).use(require('markdown-it-anchor'), {
        level: [2],
        slugify: utils.readableSlug,
        permalink: true,
        permalinkClass: 'section-anchor',
        // permalinkSymbol: '→',
        // permalinkSymbol: '👈',
        permalinkSymbol: '#',
    });
    eleventyConfig.setLibrary('md', markdownLib);

    // additional filters & shortcodes
    eleventyConfig.addFilter('stripVersionPrefix', stripVersionPrefix);
    eleventyConfig.addFilter('findSections', utils.findSections);
    eleventyConfig.addShortcode('fontawesome', utils.fontawesome);
    eleventyConfig.addPairedShortcode('alert', (content, level = 'info') => {
        return `<small class="sidenote sidenote--${level}">${"\n\n"}${content}${"\n\n"}</small>`;
    });

    // syntax highlighting
    const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
    eleventyConfig.addPlugin(syntaxHighlight, {
        templateFormats: ["md"],
        init: ({Prism}) => {},
    });

    // copy js uncompiled
    eleventyConfig.addPassthroughCopy({'site/_js': 'js'});

    // headers (for caching)
    eleventyConfig.addPassthroughCopy('site/_headers');

    // uncompiled assets
    eleventyConfig.addPassthroughCopy('site/assets/');

    // favicons
    eleventyConfig.addPassthroughCopy({'site/favicons/': '/'})

    // build a tree of post sections (folders) and posts inside them
    // this assumes that each section number exists only once, same for post
    // numbers within sections
    eleventyConfig.addCollection('posts', collections => collections.getFilteredByTag('post').filter(post => Boolean(post.data.permalink)));
    eleventyConfig.addCollection('postTree', collections => {
        return collections.getFilteredByTag('post').reduce((coll, post) => {
            // don't include drafts or unpublished pages
            if (!post.data.permalink) return coll;
            // information on the directory which acts as a content section
            const sectionDir = post.filePathStem.split('/')[1];
            const sectionName = stripVersionPrefix(sectionDir);
            const sectionNumber = extractVersionPrefix(sectionDir);
            // we'll build an array of sections, using the section number as the
            // index, so the sections are properly ordered
            // this assumes there are no two sections sharing one section number
            const sectionIndex = sectionNumber - 1;
            // initialize the section object if it doesn't exists yet
            if (typeof coll[sectionIndex] === 'undefined') {
                coll[sectionIndex] = {
                    number: sectionNumber,
                    name: sectionName,
                    dir: sectionDir,
                    title: post.data.section.title,
                    posts: [],
                }
            }
            // add the current post to the correct section
            const postIndex = extractVersionPrefix(post.fileSlug) - 1;
            coll[sectionIndex].posts[postIndex] = post;
            return coll;
        }, []);
    });

    // get previous / next post from the above post tree
    eleventyConfig.addFilter('postTreePrevious', (page, collection) => {
        const posts = collection.map(c => c.posts).flat(1);
        const pageIndex = posts.findIndex(p => p.url === page.url);
        if (pageIndex === -1) return null;
        const nextIndex = pageIndex - 1;
        return nextIndex < 0 ? null : posts[nextIndex];
    });
    eleventyConfig.addFilter('postTreeNext', (page, collection) => {
        const posts = collection.map(c => c.posts).flat(1);
        const pageIndex = posts.findIndex(p => p.url === page.url);
        if (pageIndex === -1) return null;
        const nextIndex = pageIndex + 1;
        return nextIndex >= posts.length ? null : posts[nextIndex];
    });
    eleventyConfig.addFilter('postTreePreviousInSection', (page, collection) => {
        const currentSection = collection.find(section => section.posts.some(current => current.url === page.url));
        const pageIndex = currentSection.posts.findIndex(current => current.url === page.url);
        return pageIndex === 0 ? null : currentSection.posts[pageIndex - 1];
    });
    eleventyConfig.addFilter('postTreeNextInSection', (page, collection) => {
        const currentSection = collection.find(section => section.posts.some(current => current.url === page.url));
        const pageIndex = currentSection.posts.findIndex(current => current.url === page.url);
        return pageIndex + 1 >= currentSection.length ? null : currentSection.posts[pageIndex + 1];
    });

    return {
        templateFormats: ['html', 'md', 'njk', '11ty.js'],
        markdownTemplateEngine: 'njk',
        pathPrefix: '/',
        dir: {
            input: "site",
            output: "dist",
            includes: "_includes",
            layouts: "_includes/_layouts",
            data: "_data",
        }
    }
}
