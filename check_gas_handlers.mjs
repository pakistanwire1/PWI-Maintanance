import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const htmlFiles = fs.readdirSync(__dirname).filter(f => /Page\.html$/.test(f));
const calls = new Map();

for (const f of htmlFiles) {
  const content = fs.readFileSync(path.join(__dirname, f), 'utf-8');
  const methodRe = /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let m;
  while ((m = methodRe.exec(content)) !== null) {
    const name = m[1];
    if (!calls.has(name)) calls.set(name, []);
    calls.get(name).push(f);
  }
}

const gsFiles = fs.readdirSync(__dirname).filter(f => /\.gs$/.test(f));
const allDefs = new Set();
const defSources = new Map();
for (const f of gsFiles) {
  const content = fs.readFileSync(path.join(__dirname, f), 'utf-8');
  const fnRe = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let m;
  while ((m = fnRe.exec(content)) !== null) {
    allDefs.add(m[1]);
    defSources.set(m[1], f);
  }
  const propRe = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function/g;
  while ((m = propRe.exec(content)) !== null) {
    allDefs.add(m[1]);
    defSources.set(m[1], f + ' (prop)');
  }
}

const knownGlobals = ['getElementById','getElementsByClassName','getElementsByTagName','querySelector','querySelectorAll','getAttribute','setAttribute','removeAttribute','classList','style','document','window','localStorage','sessionStorage','Date','Math','JSON','String','Number','Array','Object','Promise','parseInt','parseFloat','isNaN','isFinite','RegExp','Error','console','alert','confirm','prompt','setTimeout','setInterval','clearTimeout','clearInterval','encodeURIComponent','decodeURIComponent','navigator','location','history','Logger','UrlFetchApp','ScriptApp','HtmlService','SpreadsheetApp','DriveApp','CacheService','LockService','Utilities','MailApp','GmailApp','PropertiesService','ContentService','getDate','getDay','getFullYear','getHours','getMinutes','getMonth','getSeconds','getTime','toISOString','getUTC','setItem','getItem','removeItem','matchMedia','getContext','createElement','createTextNode','appendChild','insertBefore','removeChild','addEventListener','removeEventListener','getBoundingClientRect','setAttribute','getComputedStyle','toDataURL','drawImage'];

console.log('=== POSSIBLE GAS SERVER CALLS (method invocations) WITH DEFINITION CHECK ===');
const interesting = [];
for (const [fn, files] of [...calls.entries()].sort()) {
  if (knownGlobals.includes(fn)) continue;
  const src = defSources.get(fn);
  interesting.push(fn + (src ? '  [' + src + ']' : '  <-- MISSING'));
  console.log(fn + (src ? '  [' + src + ']' : '  <-- MISSING'));
}
console.log('\nTotal interesting:', interesting.length);
