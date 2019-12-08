const package = require('../../package.json');

module.exports = () => {
    return {
        url: package.homepage,
        version: package.version,
    }
}
