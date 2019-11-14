const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const findSections = (html, headlineLevel = 2) => {
    const dom = new JSDOM(html);
    return Array.from(dom.window.document.querySelectorAll(`h${headlineLevel}`)).map(heading => {
        const textOnly = Array.from(heading.childNodes).filter(node => node.nodeName === '#text').map(node => node.textContent).join(' ');
        return {
            textContent: heading.textContent,
            textOnly,
            innerHTML: heading.innerHTML,
            id: heading.id,
        }
    });
}

module.exports = {
    findSections
}
