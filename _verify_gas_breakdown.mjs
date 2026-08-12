import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push('[c] ' + m.text().slice(0, 250)); });
page.on('pageerror', e => logs.push('[pe] ' + String(e.message).slice(0, 250)));

await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));
await sleep(6000);

async function findFrame(pred, maxMs = 320000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    for (const f of page.frames()) {
      const ok = await pred(f).catch(() => false);
      if (ok) return f;
    }
    await sleep(1500);
  }
  return null;
}

const app = await findFrame(f => f.evaluate(() => !!document.getElementById('loginForm') || !!document.getElementById('appContainer')));
if (!app) { console.log('COULD NOT REACH LOGIN'); await browser.close(); process.exit(1); }

let loggedIn = false;
for (let i = 0; i < 40 && !loggedIn; i++) {
  const st = await app.evaluate(() => ({
    form: !!document.getElementById('loginForm'),
    appV: !!document.getElementById('appContainer') && getComputedStyle(document.getElementById('appContainer')).display !== 'none'
  })).catch(() => ({}));
  if (st.appV) { loggedIn = true; break; }
  if (st.form) {
    await app.evaluate((em, pw) => {
      const e = document.getElementById('loginEmail'); if (e) e.value = em;
      const p = document.getElementById('loginPassword'); if (p) p.value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
  }
  await sleep(3000);
}
if (!loggedIn) { console.log('LOGIN FAILED'); await browser.close(); process.exit(1); }
await sleep(3000);

await app.evaluate(() => { try { navigateTo('breakdown'); } catch (e) {} }).catch(() => {});
let loaded = false;
for (let i = 0; i < 40 && !loaded; i++) {
  loaded = await app.evaluate(() => {
    const el = document.getElementById('bdDivision');
    return !!el && el.options.length >= 3 && document.getElementById('bdTotalCount').textContent !== '0';
  }).catch(() => false);
  await sleep(2000);
}
console.log('breakdown loaded (div options + non-zero count):', loaded);

const base = await app.evaluate(() => ({
  total: document.getElementById('bdTotalCount').textContent,
  downtime: document.getElementById('bdTotalDowntime').textContent,
  divOpts: document.getElementById('bdDivision').options.length,
  secOpts: document.getElementById('bdSection').options.length,
  deptOpts: document.getElementById('bdDepartment').options.length,
  firstRow: (document.querySelector('#breakdownTableContainer tbody tr td, #breakdownTableContainer .table-row td') || {}).textContent
})).catch(e => ({ err: String(e.message) }));
console.log('unfiltered:', JSON.stringify(base));

await app.evaluate(() => {
  const sel = document.getElementById('bdDivision');
  sel.value = 'DIV001';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(6000);
await app.evaluate(() => { try { filterBreakdowns(); } catch (e) {} }).catch(() => {});
await sleep(1500);
const divFilter = await app.evaluate(() => ({
  total: document.getElementById('bdTotalCount').textContent,
  rows: document.querySelectorAll('#breakdownTableContainer tbody tr').length,
  secOpts: document.getElementById('bdSection').options.length
})).catch(e => ({ err: String(e.message) }));
console.log('Spoke Division filter:', JSON.stringify(divFilter));

await app.evaluate(() => {
  const sec = document.getElementById('bdSection');
  const opts = Array.from(sec.options).map(o => ({ v: o.value, t: o.textContent }));
  window.__bdSecOpts = opts;
  const spoke = opts.find(o => o.v && (o.t.includes('Spoke') || /spoke/i.test(o.v)));
  if (spoke) { sec.value = spoke.v; sec.dispatchEvent(new Event('change', { bubbles: true })); }
  window.__bdChosenSec = spoke ? spoke.v : '';
});
await sleep(6000);
await app.evaluate(() => { try { filterBreakdowns(); } catch (e) {} }).catch(() => {});
await sleep(1500);
const divSecFilter = await app.evaluate(() => ({
  chosenSec: window.__bdChosenSec,
  secOpts: window.__bdSecOpts.length,
  total: document.getElementById('bdTotalCount').textContent,
  rows: document.querySelectorAll('#breakdownTableContainer tbody tr').length
})).catch(e => ({ err: String(e.message) }));
console.log('Spoke Division + Section filter:', JSON.stringify(divSecFilter));

console.log('errors:', logs.slice(0, 5));
await browser.close();


