const package = require('../../package.json');

module.exports = () => {
    return {
        name: "ProcessWire.Dev",
        url: package.homepage,
        version: package.version,
        lang: "en",
        dir: "ltr"
    }
}
