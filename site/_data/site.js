const package = require('../../package.json');

module.exports = () => {
    return {
        name: "processwire.dev",
        url: package.homepage,
        version: package.version,
        lang: "en",
        dir: "ltr"
    }
}
