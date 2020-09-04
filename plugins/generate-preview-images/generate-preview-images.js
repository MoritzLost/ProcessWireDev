const path = require('path');
const fg = require('fast-glob');
const puppeteer = require('puppeteer');
const express = require('express');

const generatePreviewImages = async (dir, options = {}) => {
    const pages = await fg('**/*.{html,htm}', {
        cwd: dir
    });
    const browser = await puppeteer.launch({
        headless: true,
    });
    
    // https://github.com/puppeteer/puppeteer/issues/1643#issuecomment-353387148
    const app = express();
    app.use(express.static(dir));
    const server = app.listen(3000);

    for (const file of pages) {
        const page = await browser.newPage();
        await page.setViewport({ width: 480, height: 360 });
        // await page.goto(`file:${path.join(__dirname, 'test.html')}`);
        await page.goto(`http://localhost:3000/${file}`);
        const buffer = await page.screenshot({path: `images/${file.replace('/', '___')}.png`});
    }
    server.close();
}


module.exports = generatePreviewImages;
