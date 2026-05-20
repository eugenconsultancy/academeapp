const sharp = require('sharp');
const fs = require('fs');

const svgBuffer = fs.readFileSync('public/icons/icon.svg');

sharp(svgBuffer)
  .resize(256, 256)
  .png()
  .toFile('public/icons/icon.png')
  .then(() => console.log('PNG created at public/icons/icon.png'))
  .catch(err => console.error('Error:', err));
