const path = require('path');
const fg = require('fast-glob');
const puppeteer = require('puppeteer');
const express = require('express');

module.exports = eleventyConfig => {
    // eleventyConfig.addTransform('generate-preview-images', async (content, outputPath) => {
    //     if (!outputPath) return content;
    //     console.log(`Transform triggered for ${outputPath} with content type: ${content}`);
    //     return content;
    // });
    eleventyConfig.on('afterBuild', async (...stuff) => {
        console.log(process.cwd());
        // console.log(eleventyConfig);
        // console.log(stuff);
        return;
        const pages = await fg('**/*.{html,htm}', {
            cwd: constants.PUBLISH_DIR
        });
        const browser = await puppeteer.launch({
            headless: true,
        });

        // https://github.com/puppeteer/puppeteer/issues/1643#issuecomment-353387148
        const app = express();
        app.use(express.static(constants.PUBLISH_DIR));
        const server = app.listen(3000);

        let count = 0;
        for (const file of pages) {
            const page = await browser.newPage();
            await page.setViewport({ width: 480, height: 360 });
            // await page.goto(`file:${path.join(__dirname, 'test.html')}`);
            await page.goto(`http://localhost:3000/${file}`);
            const buffer = await page.screenshot({path: `screen-${count++}.png`});
        }
        server.close();
    });
}


// const puppeteer = require('puppeteer');
// const express = require('express');
// const app = express();
// app.use(express.static('/home/cristina/Documents'))
// const server = server.listen(3000);

// (async () => {
//   const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
//   const page = await browser.newPage();
//   const test_html = `<html><h3>Hello world!</h3><img src="http://localhost:3000/logo.jpg"></html>`;
//   await page.goto(`data:text/html,${test_html}`, { waitUntil: 'networkidle0' });
//   await page.pdf({ path: `${this.outputPath}/test-puppeteer.pdf`,
//     format: 'A4', landscape: !data.isPortrait,
//     margin: { top: '0.5cm', right: '1cm', bottom: '0.8cm', left: '1cm' }, printBackground: true });
//   await browser.close();
//   await server.close();
// })();
