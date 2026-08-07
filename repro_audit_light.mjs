import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const EMAIL = creds.Email, PASSWORD = creds.Password;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const t0 = Date.now();
const errors = [];
page.on('pageerror', e => errors.push({ t: Math.round((Date.now() - t0) / 1000), msg: (e.stack || e.message).slice(0, 800) }));
page.on('console', m => { if (m.type() === 'error') errors.push({ t: Math.round((Date.now() - t0) / 1000), msg: 'console.error: ' + m.text().slice(0, 500) }); });
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickAppFrame();
while (!app && Date.now() - t0 < 90000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(0); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(2000);
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's login form ready');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  const form = document.getElementById('loginForm');
  email.value = em; pass.value = pw;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, EMAIL, PASSWORD);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's app ready');

const snap = async label => {
  const s = await app.evaluate(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    const activePages = [...document.querySelectorAll('.page.active')].map(p => p.id);
    const pg = document.getElementById('auditPage');
    const tb = document.getElementById('auditTableBody');
    const main = document.getElementById('mainContent') || document.querySelector('.main-content');
    return {
      theme, activePages,
      auditActive: pg ? pg.classList.contains('active') : false,
      auditDisplay: pg ? getComputedStyle(pg).display : '?',
      auditOffset: pg ? pg.getBoundingClientRect().top : -1,
      auditHeight: pg ? pg.getBoundingClientRect().height : -1,
      mainChildren: main ? main.children.length : -1,
      tbodyRows: tb ? tb.querySelectorAll('tr').length : -1,
      statTotal: (document.getElementById('auditTotalCount') || {}).textContent || '',
      pagInfo: (document.getElementById('auditPaginationInfo') || {}).textContent || ''
    };
  }).catch(() => null);
  console.log('[' + label + '] ' + JSON.stringify(s));
};

// FLOW 1: click audit immediately after app ready
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); if (i) i.click(); });
await snap('audit-clicked-immediately');
await sleep(8000);
await snap('audit-after-8s');
let clip = await page.evaluate(() => {
  for (const f of document.querySelectorAll('iframe')) {
    if (f.src.indexOf('userCodeAppPanel') >= 0) { const r = f.getBoundingClientRect(); return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height }; }
  }
  return null;
}).catch(() => null);
if (clip) await page.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_admin_light1.png', clip });

// FLOW 2: go dashboard, then audit
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="dashboard"]'); if (i) i.click(); });
await sleep(6000);
await snap('dashboard-active');
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); if (i) i.click(); });
await sleep(8000);
await snap('audit-after-dashboard');
if (clip) await page.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_admin_light2.png', clip });

console.log('=== PAGE ERRORS ===');
for (const e of errors) console.log('  t+' + e.t + 's ' + e.msg.slice(0, 500));
await browser.close();
