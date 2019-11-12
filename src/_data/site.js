const package = require('../../package.json');

module.exports = () => {
    return {
        url: 'https://processwire.dev',
        version: package.version,
    }
}
