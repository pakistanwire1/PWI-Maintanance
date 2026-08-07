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
const t0 = Date.now();
const errors = [];
page.on('pageerror', e => errors.push({ t: Math.round((Date.now() - t0) / 1000), msg: (e.stack || e.message).slice(0, 500) }));
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
await app.evaluate(() => {
  const item = document.querySelector('.sidebar-item[data-page="audit"]');
  if (item) item.click();
});
await sleep(12000);
const dump = await app.evaluate(() => {
  const info = sel => {
    const el = document.querySelector(sel);
    if (!el) return sel + ': MISSING';
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return `${sel} {display:${st.display} pos:${st.position} op:${st.opacity} vis:${st.visibility} rect:${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} scrollH:${el.scrollHeight} clientH:${el.clientHeight} overflow:${st.overflow}${st.transform && st.transform !== 'none' ? ' transform:' + st.transform : ''}${st.contain ? ' contain:' + st.contain : ''}`;
  };
  const ac = document.querySelector('.app-container');
  const mc = document.querySelector('.main-content');
  const pc = document.querySelector('.page-content');
  return {
    viewport: innerWidth + 'x' + innerHeight,
    bodyScrollH: document.body.scrollHeight,
    theme: document.documentElement.getAttribute('data-theme'),
    chain: [
      info('.app-container'), info('.main-content'), info('.page-content'),
      info('#auditPage'), info('#auditSummaryCards'), info('.stat-card'),
      info('.stat-card .stat-inner'), info('#auditFilterBar'), info('#auditTable'),
      info('#auditTableBody'), info('#auditTableBody tr'), info('.card'),
      info('.table-container'), info('#auditPagination'), info('#auditPaginationControls'),
      info('#auditPage .table-footer'), info('.card-header')
    ],
    scrolls: {
      mc: mc ? { scrollTop: mc.scrollTop, scrollHeight: mc.scrollHeight, clientHeight: mc.clientHeight, overflowY: getComputedStyle(mc).overflowY } : null,
      pc: pc ? { scrollTop: pc.scrollTop, scrollHeight: pc.scrollHeight, clientHeight: pc.clientHeight, overflowY: getComputedStyle(pc).overflowY } : null
    },
    rows: document.querySelectorAll('#auditTableBody tr').length,
    bodyChildren: document.body.children.length
  };
}).catch(() => null);
console.log(JSON.stringify(dump, null, 1));
try {
  const el = await app.$('#auditPage');
  if (el) {
    await el.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_el_diag.png' });
    console.log('auditPage element screenshot saved');
  }
} catch (e) { console.log('element screenshot failed: ' + e.message); }
const clip = await page.evaluate(() => {
  for (const f of document.querySelectorAll('iframe')) {
    if (f.src.indexOf('userCodeAppPanel') >= 0) {
      const r = f.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    }
  }
  return null;
}).catch(() => null);
if (clip) await page.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_diag_full.png', clip }).catch(() => {});
console.log('full screenshot saved');
console.log('=== PAGE ERRORS ===');
for (const e of errors) console.log('  t+' + e.t + 's ' + e.msg.slice(0, 500));
await browser.close();
