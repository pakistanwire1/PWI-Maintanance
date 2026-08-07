const path = require('path');
const s = require('fs').readFileSync(path.join(process.env.TEMP, 'opencode', 'live414.html'), 'utf8');
const i = s.indexOf('id="assetFormModal"');
console.log('assetFormModal at', i, 'total len', s.length);
// count occurrences of assetFormModal
console.log('occurrences:', (s.match(/assetFormModal/g) || []).length);
// Verify the modal is unclosed in LIVE html: count <div vs </div> in the AssetsPage portion
const assetsStart = s.indexOf('<div id="assetsPage"');
const nextPage = s.indexOf('id="machinesPage"');
console.log('assetsStart', assetsStart, 'machinesPage', nextPage);
const chunk = s.slice(assetsStart, nextPage);
const opens = (chunk.match(/<div[^>]*>/g) || []).length;
const closes = (chunk.match(/<\/div>/g) || []).length;
console.log('AssetsPage chunk: <div>', opens, '</div>', closes, 'balance', opens - closes);
// Show the segment around the modal close to see if live closes it
const j = s.indexOf('assetFormModal');
console.log('--- live modal region ---');
console.log(s.slice(j, j + 900));
