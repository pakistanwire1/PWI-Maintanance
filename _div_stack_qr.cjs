const fs = require('fs');
const s = fs.readFileSync('QRBarcodePage.html', 'utf8');
const i = s.indexOf('<script');
const html = s.slice(0, i === -1 ? s.length : i);
const lines = html.split('\n');
const stack = [];
for (let ln = 0; ln < lines.length; ln++) {
  const line = lines[ln];
  const tagRe = /<div\b([^>]*)(?:\/>|>)/g;
  let m;
  while ((m = tagRe.exec(line)) !== null) {
    const attrs = m[1] || '';
    const idm = attrs.match(/id="([^"]+)"/);
    const cm = attrs.match(/class="([^"]+)"/);
    stack.push({ ln: ln + 1, label: (idm ? '#' + idm[1] : cm ? '.' + cm[1].split(/\s+/)[0] : 'div') });
  }
  const closeRe = /<\/div>/g;
  let c;
  while ((c = closeRe.exec(line)) !== null) {
    const top = stack.pop();
    if (!top) console.log('EXTRA </div> L' + (ln + 1));
  }
}
console.log('Open divs at EOF:');
for (const d of stack) console.log('  L' + d.ln + ' ' + d.label);
