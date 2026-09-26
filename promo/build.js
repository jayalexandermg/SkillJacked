// Inlines the fonts as base64 so rendering never depends on the network.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const font = (f) => fs.readFileSync(path.join(dir, 'fonts', f)).toString('base64');
const html = fs.readFileSync(path.join(dir, 'src', 'promo.html'), 'utf8')
  .replace('%%SYNE%%', font('syne-latin.woff2'))
  .replace('%%DMSANS%%', font('dm-sans-latin.woff2'))
  .replace('%%JBMONO%%', font('jetbrains-mono-latin.woff2'));

fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist', 'skilljacked-promo.html'), html);
console.log('wrote dist/skilljacked-promo.html', (html.length / 1024).toFixed(0) + ' KB');
