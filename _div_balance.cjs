const fs = require('fs');
const s = fs.readFileSync(process.env.TEMP + '/opencode/assets_6e2ff35.txt', 'utf8');
const htmlEnd = s.indexOf('<script');
const html = s.slice(0, htmlEnd);
// tokenize div open/close with line numbers
const lines = html.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div[^>]*>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  depth += opens - closes;
  if (opens) console.log(`L${i + 1} depth=${depth} opens=${opens} closes=${closes} | ${line.trim().slice(0, 110)}`);
}
console.log('FINAL depth:', depth);
