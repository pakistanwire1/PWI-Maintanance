const fs = require('fs');
const pages = fs.readdirSync('.').filter(f => /Page\.html$/.test(f));
const ids = [];
for (const f of pages) {
  const c = fs.readFileSync(f, 'utf8');
  const re = /<div id="([\w]+)" class="page"/g;
  let m;
  while (m = re.exec(c)) ids.push(m[1]);
}
console.log('PAGE DIV IDS:', JSON.stringify(ids.sort()));
const sp = fs.readFileSync('ScriptsPage.html', 'utf8');
const i0 = sp.indexOf('window.__loadFnMap');
const i1 = sp.indexOf('};', i0);
const fnMap = sp.slice(i0, i1 + 2);
const mapKeys = [...fnMap.matchAll(/([a-z]+):\s*'/g)].map(x => x[1]);
console.log('LOADFNMAP keys:', mapKeys.sort().join(','));
const i2 = sp.indexOf('validPages');
const i3 = sp.indexOf('];', i2);
const vp = sp.slice(i2, i3 + 2);
console.log('VALIDPAGES:', vp.replace(/\s+/g, ' '));
