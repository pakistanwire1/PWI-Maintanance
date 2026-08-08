import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}
const url = 'https://pwi-maintanance.pages.dev';
const outDir = process.argv[2] || 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_verify';
fs.mkdirSync(outDir, { recursive: true });
const userDataDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/chrome_verify_profile';

const report = { url, startedAt: new Date().toISOString(), sw: {}, cache: {}, servedJs: {}, pages: {}, staleCheck: {} };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') console.log(`[console:${t}]`, m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));

// HARD REFRESH WITH CACHE BYPASS: intercept all requests and bypass HTTP cache
await page.setCacheEnabled(false);
await page.setRequestInterception(true);
const seenNav = {};
page.on('request', req => {
  const u = req.url();
  const name = u.split('/').pop();
  if (name.endsWith('.js') && !u.includes('gstatic')) {
    seenNav[name] = (seenNav[name] || 0) + 1;
    console.log('[fetch]', name, '=>', (seenNav[name] === 1 ? 'FIRST (fresh)' : 'cached/repeat'));
  }
  req.continue();
});

console.log('== STEP 1: navigate + hard refresh (cache bypass) ==');
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto1 err', e.message));
await sleep(2000);
await page.reload({ waitUntil: 'load', timeout: 120000 }).catch(e => console.log('reload err', e.message));
await sleep(2000);

console.log('== STEP 2: service worker + cache verification ==');
const swInfo = await page.evaluate(async () => {
  const out = { registrations: [], caches: [] };
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const info = { scope: reg.scope, active: null, waiting: null, installing: null };
      if (reg.active) info.active = { scriptURL: reg.active.scriptURL, state: reg.active.state };
      if (reg.waiting) info.waiting = { scriptURL: reg.waiting.scriptURL, state: reg.waiting.state };
      if (reg.installing) info.installing = { scriptURL: reg.installing.scriptURL, state: reg.installing.state };
      out.registrations.push(info);
    }
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    out.caches = keys;
  }
  return out;
}).catch(e => ({ err: String(e) }));
console.log('SW/CACHE:', JSON.stringify(swInfo, null, 1));
report.sw = swInfo.registrations || [];
report.cache = swInfo.caches || [];

console.log('== STEP 3: verify which nav.js served ==');
const navVer = await page.evaluate(async () => {
  try {
    const r = await fetch('/js/core/nav.js', { cache: 'no-store' });
    const text = await r.text();
    return {
      hasNumberedLoop: text.includes('for (var p = 1; p <= totalPages; p++)'),
      hasPageXofY: text.includes("Page ' + Nav._notifPage + ' of'"),
      hasPrevNext: text.includes(">Prev</button>")
    };
  } catch (e) { return { err: String(e) }; }
}).catch(e => ({ err: String(e) }));
console.log('SERVED nav.js:', JSON.stringify(navVer));
report.servedJs.nav = navVer;

// check caches directly
const cacheContent = await page.evaluate(async () => {
  const out = {};
  try {
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      const reqs = await c.keys();
      out[k] = reqs.map(r => r.url).slice(0, 30);
    }
  } catch (e) { out.err = String(e); }
  return out;
}).catch(e => ({ err: String(e) }));
console.log('CACHE CONTENT:', JSON.stringify(cacheContent, null, 1));
report.cacheContent = cacheContent;

await browser.close();
fs.writeFileSync(path.join(outDir, 'sw_report.json'), JSON.stringify(report, null, 1));
console.log('DONE SW phase');
