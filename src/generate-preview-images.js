const path = require('path');
const { generatePreviewImages } = require('../generate-preview-images/main');

generatePreviewImages(
    path.resolve(__dirname, '../dist/preview-images/'),
    {
        removeOriginalFiles: true,
    }
)
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
