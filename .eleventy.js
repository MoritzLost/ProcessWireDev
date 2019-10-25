const sass = require('node-sass');

const extractVersionPrefix = slug => {
    const prefixMatch = slug.match(new RegExp(/^\d{1,3}(?=-)/));
    return prefixMatch ? Number(prefixMatch[0]) : null;
};

const stripVersionPrefix = slug => slug.replace(new RegExp(/^\d{1,3}-/), '')

module.exports = eleventyConfig => {
    eleventyConfig.addFilter('stripVersionPrefix', stripVersionPrefix);

    // build a tree of post sections (folders) and posts inside them
    eleventyConfig.addCollection('postTree', collections => {
        const sectionTree = collections.getFilteredByTag('post').reduce((coll, post) => {
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
            coll[sectionIndex].posts.push(post);
            return coll;
        }, []);
        // sort the posts based on the post number
        sectionTree.forEach(curr => curr.posts.sort((a, b) => extractVersionPrefix(a.fileSlug) - extractVersionPrefix(b.fileSlug)));
        return sectionTree;
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
