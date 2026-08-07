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
while (!app && Date.now() - t0 < 120000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(1); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
console.log('login form ready');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
console.log('app ready');
await sleep(1500);
async function navReports() {
  await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="reports"]'); if (i) i.click(); }).catch(() => {});
  await sleep(5000);
}
async function navNotif() {
  await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="notifications"]'); if (i) i.click(); }).catch(() => {});
  await sleep(4000);
}
async function pageState(label) {
  const s = await app.evaluate(() => {
    const vis = el => { if (!el) return 'absent'; return getComputedStyle(el).display + '/' + (el.offsetParent !== null); };
    return {
      reportsPage: vis(document.getElementById('reportsPage')),
      notificationsPage: vis(document.getElementById('notificationsPage')),
      notifFooter: vis(document.getElementById('notifPaginationFooter')),
      notifFooterVisibleBtns: document.getElementById('notifPaginationFooter') ? Array.from(document.querySelectorAll('#notifPaginationFooter button')).filter(b => b.offsetParent !== null).length : -1,
      reportsPrevBtns: Array.from(document.querySelectorAll('#reportsPage button')).filter(b => /Previous|Next/.test((b.textContent || '').trim()) && b.offsetParent !== null).length
    };
  }).catch(e => ({ err: String(e) }));
  console.log(label + ': ' + JSON.stringify(s));
  return s;
}
await pageState('initial');
await navReports();
await pageState('onReports');
await page.screenshot({ path: 'verify_shots/test_deploy/primary_gas_reports_pagi.png' }).catch(() => {});
await navNotif();
await pageState('onNotifications');
await browser.close();
