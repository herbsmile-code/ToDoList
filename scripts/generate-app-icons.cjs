// Regenerate all installed-app assets from the editable favicon.svg.
// Run with Node and sharp installed, or set ICON_SHARP_PATH to its module path.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.ICON_SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');
// The launcher supplies its own corner mask. Keep the entire PNG background opaque.
const squareSvg = svg.replaceAll('rx="112"', 'rx="0"');
const icons = [
  ['app-192.png',192,svg], ['app-512.png',512,svg],
  ['app-maskable-512.png',512,squareSvg],
  ['apple-touch-icon.png',180,squareSvg], ['favicon-32.png',32,svg]
];
(async()=>{
  fs.mkdirSync(path.join(root,'icons'),{recursive:true});
  for(const [name,size,source] of icons) {
    await sharp(Buffer.from(source)).resize(size,size).png().toFile(path.join(root,'icons',name));
  }
  console.log('Generated 5 app icons from favicon.svg');
})().catch(error=>{console.error(error);process.exitCode=1;});
