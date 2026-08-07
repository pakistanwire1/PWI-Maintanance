const fs = require('fs');
const s = fs.readFileSync('AssetsPage.html', 'utf8');
const i = s.indexOf('<script');
const html = s.slice(0, i);
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
    const label = (idm ? '#' + idm[1] : cm ? '.' + cm[1].split(/\s+/)[0] : 'div') + '@L' + (ln + 1);
    stack.push(label);
  }
  const closeRe = /<\/div>/g;
  let c;
  while ((c = closeRe.exec(line)) !== null) {
    if (!stack.length) { console.log('EXTRA </div> at L' + (ln + 1)); process.exit(1); }
    stack.pop();
  }
  if (ln >= 155) {
    console.log('L' + (ln + 1) + ' depth=' + stack.length + ' | ' + line.trim().slice(0, 55) + '  => [' + stack.slice(-3).join(' ') + ']');
  }
}
console.log('FINAL open divs:', stack.length);
