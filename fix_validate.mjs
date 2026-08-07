import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickAppFrame();
while (!app && Date.now() - t0 < 90000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(0); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(2000);
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('app ready');
await sleep(2000);
// BEFORE: navigate to audit, show it's blank (opacity 0)
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); i.click(); });
await sleep(2500);
const before = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const r = el.getBoundingClientRect();
  return { op: getComputedStyle(el).opacity, rect: r.width + 'x' + r.height, rows: document.querySelectorAll('#auditTable tbody tr').length };
});
console.log('AUDIT BEFORE fix: ' + JSON.stringify(before));
await page.screenshot({ path: 'verify_shots/fix_before_audit.png' });
// APPLY FIX: inject style removing fadeIn from .page
await app.evaluate(() => {
  const s = document.createElement('style');
  s.id = 'fixNoFade';
  s.textContent = '.page { animation: none !important; }';
  document.head.appendChild(s);
});
await sleep(500);
const after = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const r = el.getBoundingClientRect();
  return { op: getComputedStyle(el).opacity, rect: r.width + 'x' + r.height, rows: document.querySelectorAll('#auditTable tbody tr').length, anim: getComputedStyle(el).animationName };
});
console.log('AUDIT AFTER fix: ' + JSON.stringify(after));
await page.screenshot({ path: 'verify_shots/fix_after_audit.png' });
// re-trigger audit data load after fix for clean proof
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); i.click(); });
await sleep(4000);
const audit2 = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const r = el.getBoundingClientRect();
  return { op: getComputedStyle(el).opacity, rect: Math.round(r.width) + 'x' + Math.round(r.height), rows: document.querySelectorAll('#auditTable tbody tr').length, anim: getComputedStyle(el).animationName };
});
console.log('AUDIT re-loaded after fix: ' + JSON.stringify(audit2));
await page.screenshot({ path: 'verify_shots/fix_after_audit2.png' });
// navigate to dashboard and confirm it paints too
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="dashboard"]'); i.click(); });
await sleep(1500);
const dash = await app.evaluate(() => {
  const el = document.getElementById('dashboardPage');
  const r = el.getBoundingClientRect();
  return { op: getComputedStyle(el).opacity, rect: r.width + 'x' + r.height, anim: getComputedStyle(el).animationName };
});
console.log('DASHBOARD after fix: ' + JSON.stringify(dash));
await page.screenshot({ path: 'verify_shots/fix_after_dashboard.png' });
const ver = await app.evaluate(() => navigator.userAgent);
console.log('UA: ' + ver);
await browser.close();
