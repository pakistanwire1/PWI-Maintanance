import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = 'https://pwi-maintanance.pages.dev/?v=' + Date.now();
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push('[' + m.type() + '] ' + m.text().slice(0, 300)); });
page.on('pageerror', e => logs.push('[pe] ' + String(e.message).slice(0, 300)));

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(4000);
const onWelcome = await page.evaluate(() => { const w = document.getElementById('welcomePage'); return !!w && getComputedStyle(w).display !== 'none'; }).catch(() => false);
if (onWelcome) {
  await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await sleep(4000);
}
let loggedIn = false;
for (let i = 0; i < 40 && !loggedIn; i++) {
  const st = await page.evaluate(() => {
    const lp = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    return { lv: !!lp && getComputedStyle(lp).display !== 'none', av: !!app && getComputedStyle(app).display !== 'none' };
  }).catch(() => ({}));
  if (st.av) { loggedIn = true; break; }
  if (st.lv) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
    await sleep(5000);
  }
  await sleep(1500);
}
if (!loggedIn) { console.log('LOGIN FAILED'); await browser.close(); process.exit(1); }
await sleep(3000);

await page.evaluate(() => { try { navigateTo('inventory'); } catch (e) {} }).catch(() => {});
let invLoaded = false;
for (let i = 0; i < 30 && !invLoaded; i++) {
  invLoaded = await page.evaluate(() => !!document.getElementById('invCardActions')).catch(() => false);
  await sleep(1500);
}
console.log('inventory rendered:', invLoaded);

// Poll for the dashboard call to finish
let dash = null;
for (let i = 0; i < 20 && !dash; i++) {
  dash = await page.evaluate(() => {
    const v = document.getElementById('invTotalStockValue').textContent;
    return v && v !== 'Rs. 0' ? v : null;
  }).catch(() => null);
  if (!dash) await sleep(2000);
}
console.log('stock value after wait:', dash || 'STILL Rs. 0');

// Direct in-page API calls to see real responses
const apiResults = await page.evaluate(async () => {
  const out = {};
  try {
    const d = await API.post('getInventoryDashboardData', {});
    out.dashboard = { ok: true, keys: d ? Object.keys(d) : [], totalStockValue: d && d.totalStockValue, err: d && d.error, msg: d && d.message };
  } catch (e) { out.dashboard = { ok: false, err: String(e.message) }; }
  try {
    const a = await API.post('getAllTransactions', {});
    out.all = { ok: true, len: Array.isArray(a) ? a.length : (a && a.error ? 'ERR:' + a.error : 'n/a'), first: Array.isArray(a) && a[0] ? a[0].TransactionID : null };
  } catch (e) { out.all = { ok: false, err: String(e.message) }; }
  try {
    const s = await API.post('searchTransactions', { query: '' });
    out.search = { len: Array.isArray(s) ? s.length : (s && s.error ? 'ERR:' + s.error : 'n/a') };
  } catch (e) { out.search = { ok: false, err: String(e.message) }; }
  return out;
}).catch(e => ({ fatal: String(e.message) }));
console.log('in-page API results:', JSON.stringify(apiResults));

// also check renderInventoryTable path: call Inventory.switchInvTab('all') manually
await page.evaluate(() => { Inventory.switchInvTab('all'); }).catch(e => console.log('switch all err', String(e.message)));
await sleep(4000);
const allTab = await page.evaluate(() => ({
  rows: document.querySelectorAll('#invTableContainer tbody tr').length,
  title: document.getElementById('invCardTitle').textContent
})).catch(e => ({ err: String(e.message) }));
console.log('all tab after manual switch:', JSON.stringify(allTab));

console.log('errors:', logs.slice(0, 10));
await browser.close();
