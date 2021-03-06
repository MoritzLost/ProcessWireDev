const path = require('path');
const { generatePreviewImages } = require('generate-preview-images');

generatePreviewImages(
    path.resolve(__dirname, '../dist/'),
    {
        globPattern: 'preview-images/**/*.{html,htm}',
        removeOriginalFiles: true,
        screenshotElementSelector: '#preview-image > .content',
    }
)
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
