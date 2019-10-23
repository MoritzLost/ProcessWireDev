const sass = require('node-sass');

module.exports = eleventyConfig => {
    eleventyConfig.addFilter('stripNumbering', slug => slug.replace(
        new RegExp(/^\d{1,3}-/),
        ''
    ));

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
