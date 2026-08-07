const s = require('fs').readFileSync('AuditPage.html', 'utf8');
const i = s.indexOf('id="auditPage"');
console.log('INDEX AT ' + i);
console.log(s.slice(Math.max(0, i - 200), i + 1600));
