const package = require('../../package.json');

module.exports = () => {
    return {
        name: "processwire.dev",
        url: process.env.SITE_URL || package.homepage,
        version: package.version,
        lang: "en",
        dir: "ltr"
    }
}
