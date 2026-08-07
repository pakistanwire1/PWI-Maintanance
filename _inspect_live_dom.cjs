const fs = require('fs');
const s = fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/live414_dom.html', 'utf8');
console.log('len', s.length);
for (const kw of ['assetsPage', 'assetFormModal', 'auditPage', 'machinesPage']) {
  console.log(kw, 'count:', (s.match(new RegExp(kw, 'g')) || []).length);
}
// Extract the raw HTML snippet from #assetsPage through the asset modal end as serialized
const a = s.indexOf('assetsPage');
const b = s.indexOf('machinesPage');
console.log('assetsPage idx', a, 'machinesPage idx', b);
const chunk = s.slice(Math.max(0, a - 200), b + 200);
console.log(chunk.slice(0, 2000));
