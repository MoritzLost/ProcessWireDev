const path = require('path');
const { generatePreviewImages } = require('../generate-preview-images/main');

generatePreviewImages(
    path.resolve(__dirname, '../dist/'),
    {
        globPattern: 'preview-images/**/*.{html,htm}',
        removeOriginalFiles: true,
        screenshotElementSelector: '#preview-image',
    }
)
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
