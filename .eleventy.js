const sass = require('node-sass');
const pluginTOC = require('eleventy-plugin-toc');
const markdownIt = require('markdown-it');

const extractVersionPrefix = slug => {
    const prefixMatch = slug.match(new RegExp(/^\d{1,3}(?=-)/));
    return prefixMatch ? Number(prefixMatch[0]) : null;
};

const stripVersionPrefix = slug => slug.replace(new RegExp(/^\d{1,3}-/), '')

module.exports = eleventyConfig => {
    // custom markdown library with automatic anchors for h2 headings
    const markdownItAnchor = require('markdown-it-anchor', {
        level: [2],
    });
    const markdownLib = markdownIt({
        html: true,
    }).use(markdownItAnchor);
    eleventyConfig.setLibrary('md', markdownLib);

    // table of contents filter
    eleventyConfig.addPlugin(pluginTOC);

    eleventyConfig.addFilter('stripVersionPrefix', stripVersionPrefix);


    // build a tree of post sections (folders) and posts inside them
    // this assumes that each section number exists only once, same for post
    // numbers within sections
    eleventyConfig.addCollection('postTree', collections => {
        return collections.getFilteredByTag('post').reduce((coll, post) => {
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

    return {
        templateFormats: ['html', 'md', 'njk'],
        pathPrefix: '/',
        dir: {
            input: "src",
            output: "dist",
            includes: "_includes",
            layouts: "_includes/_layouts",
            data: "_data",
        }
    }
}
