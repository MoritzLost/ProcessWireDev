const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');

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

const readableSlug = title => encodeURIComponent(title.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^\w-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, ''));

const fontawesome = (icon, style = 'regular', classes = ['fontawesome'], alt = '') => {
    const attributes = `class="${classes.join(' ')}" alt="${alt}"`;
    const svg = fs.readFileSync(
        path.join(__dirname, '../node_modules/@fortawesome/fontawesome-free/svgs', style, `${icon}.svg`),
        'utf8'
    );
    return svg.replace(/^\<svg/, `<svg ${attributes}`);
}

module.exports = {
    findSections,
    readableSlug,
    fontawesome,
}
