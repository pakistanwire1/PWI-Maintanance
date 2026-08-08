const fs = require('fs');
const s = fs.readFileSync('ScriptsPage.html', 'utf8');
function extract(name) {
  const start = s.indexOf('function ' + name + '(');
  if (start < 0) return name + ': MISSING';
  const brace = s.indexOf('{', start);
  let depth = 0, i = brace;
  for (; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) break; }
  }
  return s.slice(start, i + 1);
}
for (const fn of ['updateEmailBadgeColor', 'updateWaBadge', 'updateNotificationBadgeColor', 'toggleEmailPanel', 'loadEmailPanelData', 'refreshAllBadges', 'startNotificationRefresh']) {
  console.log('===== ' + fn + ' =====');
  console.log(extract(fn));
}
