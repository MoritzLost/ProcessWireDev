const sass = require('node-sass');

module.exports = eleventyConfig => {
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
