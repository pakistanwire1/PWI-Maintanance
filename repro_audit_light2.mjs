import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const EMAIL = creds.Email, PASSWORD = creds.Password;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1914, height: 917 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const t0 = Date.now();
const errors = [];
page.on('pageerror', e => errors.push({ t: Math.round((Date.now() - t0) / 1000), msg: (e.stack || e.message).slice(0, 600) }));
page.on('console', m => { if (m.type() === 'error') errors.push({ t: Math.round((Date.now() - t0) / 1000), msg: 'console.error: ' + m.text().slice(0, 400) }); });
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
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's login form ready');
await app.evaluate(() => {
  localStorage.setItem('cmms_themePrefs', JSON.stringify({ mode: 'light', accentColor: '#6366f1', cardStyle: 'glass', sidebarStyle: 'default', fontSize: 'medium' }));
});
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  const form = document.getElementById('loginForm');
  email.value = em; pass.value = pw;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, EMAIL, PASSWORD);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's app ready');
await sleep(2000);
const theme = await app.evaluate(() => document.documentElement.getAttribute('data-theme'));
console.log('data-theme =', theme);
await app.evaluate(() => {
  const item = document.querySelector('.sidebar-item[data-page="audit"]');
  if (item) item.click();
});
for (let i = 0; i < 25; i++) {
  await sleep(2000);
  const s = await app.evaluate(() => {
    const pg = document.getElementById('auditPage');
    const tb = document.getElementById('auditTableBody');
    const q = sel => { const el = document.querySelector(sel); if (!el) return null; const st = getComputedStyle(el); return { display: st.display, vis: st.visibility, h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width), bg: st.backgroundColor }; };
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      active: pg ? pg.classList.contains('active') : false,
      pageDisp: pg ? getComputedStyle(pg).display : null,
      pageH: pg ? Math.round(pg.getBoundingClientRect().height) : -1,
      filterBar: q('.audit-filter-bar'),
      statCards: q('.audit-stat-grid'),
      card1: q('.stat-card'),
      table: q('#auditTable'),
      tableWrap: q('.table-responsive'),
      tbodyRows: tb ? tb.querySelectorAll('tr').length : -1,
      tbodyText: tb ? tb.innerText.replace(/\s+/g, ' ').slice(0, 120) : '',
      pag: (document.getElementById('auditPaginationControls') || {}).innerHTML || '',
      contentH: Math.round(document.querySelector('.page-content').getBoundingClientRect().height)
    };
  }).catch(() => null);
  if (s) console.log(JSON.stringify(s));
  if (s && s.tbodyRows >= 15) break;
}
console.log('=== PAGE ERRORS ===');
for (const e of errors) console.log('  t+' + e.t + 's ' + e.msg.slice(0, 500));
const clip = await page.evaluate(() => {
  for (const f of document.querySelectorAll('iframe')) {
    if (f.src.indexOf('userCodeAppPanel') >= 0) {
      const r = f.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    }
  }
  return null;
}).catch(() => null);
if (clip) await page.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_light_forced.png', clip }).catch(() => {});
console.log('screenshot saved');
await browser.close();
