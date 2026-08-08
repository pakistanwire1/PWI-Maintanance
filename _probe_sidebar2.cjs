const fs = require('fs');
const s = fs.readFileSync('cloudflare/index.html', 'utf8');
const i = s.indexOf('data-page="openjobcard"');
if (i < 0) { console.log('no data-page=openjobcard'); process.exit(0); }
console.log(s.slice(i - 1200, i + 2400));
