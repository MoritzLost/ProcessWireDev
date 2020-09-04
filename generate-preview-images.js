const generatePreviewImages = require('./plugins/generate-preview-images/generate-preview-images');
const path = require('path');

generatePreviewImages(path.join(__dirname, 'dist'))
    .then(process.exit, process.exit);
