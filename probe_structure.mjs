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
const dump = await app.evaluate(() => {
  const pc = document.querySelector('.page-content');
  const pageIds = ['dashboardPage','assetsPage','machinesPage','techniciansPage','usersPage','departmentsPage','sectionsPage','jobcardsPage','openjobcardPage','auditPage','settingsPage','notificationsPage','emailPage'];
  const res = { modal: null, pages: {} };
  const modal = document.getElementById('assetFormModal');
  if (modal) {
    res.modal = {
      display: getComputedStyle(modal).display,
      rectW: Math.round(modal.getBoundingClientRect().width),
      childCount: modal.children.length
    };
    res.modal.childIds = Array.from(modal.children).slice(0, 20).map(c => c.id || c.tagName);
  }
  for (const id of pageIds) {
    const el = document.getElementById(id);
    if (!el) { res.pages[id] = 'MISSING'; continue; }
    res.pages[id] = el.parentElement ? (el.parentElement.id || el.parentElement.className || el.parentElement.tagName) : 'NO PARENT';
  }
  res.pageContentChildIds = pc ? Array.from(pc.children).map(c => c.id || c.tagName) : null;
  return res;
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(dump, null, 1));
await browser.close();
