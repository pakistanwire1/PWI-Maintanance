import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = process.env.CMMS_EMAIL || 'supervisor@cmms.com';
const PASSWORD = process.env.CMMS_PASSWORD || 'super123';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push({ t: Date.now() - t0, kind: 'console:' + m.type(), msg: m.text().slice(0, 500) }); });
page.on('pageerror', e => errors.push({ t: Date.now() - t0, kind: 'pageerror', msg: (e.stack || e.message).slice(0, 700) }));

const t0 = Date.now();
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

// wait for login form
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
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's app ready. Clicking AUDIT FIRST (cold server)...');

await app.evaluate(() => {
  const item = document.querySelector('.sidebar-item[data-page="audit"]');
  if (item) item.click();
});
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's audit clicked');

const tNav = Date.now();
let last = '';
for (let i = 0; i < 60; i++) {
  await sleep(1000);
  const s = await app.evaluate(() => {
    const el = document.getElementById('auditPage');
    return {
      len: el ? el.innerHTML.length : -1,
      rows: el ? el.querySelectorAll('table tbody tr').length : -1,
      total: (document.getElementById('auditTotalCount') || {}).textContent || '',
      today: (document.getElementById('auditTodayCount') || {}).textContent || '',
      mod: (document.getElementById('auditModuleCount') || {}).textContent || '',
      users: (document.getElementById('auditUserCount') || {}).textContent || '',
      toast: [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ').slice(0, 120),
      loading: (() => { const ov = document.getElementById('loadingOverlay'); return !!ov && getComputedStyle(ov).display !== 'none'; })()
    };
  }).catch(() => null);
  if (!s) break;
  const line = 't+' + Math.round((Date.now() - t0) / 1000) + 's len=' + s.len + ' rows=' + s.rows + ' stats=[' + s.total + ',' + s.today + ',' + s.mod + ',' + s.users + '] loading=' + s.loading + (s.toast ? ' TOAST="' + s.toast + '"' : '');
  if (line !== last) { console.log(line); last = line; }
  if (s.rows >= 15 && s.total !== '' && s.total !== '0') break;
}
console.log('AUDIT LOAD TOOK ' + Math.round((Date.now() - tNav) / 1000) + 's');
console.log('CONSOLE ERRORS:');
for (const e of errors) console.log('  [' + e.kind + '] t+' + Math.round(e.t / 1000) + 's ' + e.msg.slice(0, 400));

await sleep(1500);
const clip = await page.evaluate(furl => {
  for (const f of document.querySelectorAll('iframe')) {
    if (f.src.indexOf('userCodeAppPanel') >= 0 || f.src === furl) {
      const r = f.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    }
  }
  return null;
}, app.url()).catch(() => null);
if (clip) await page.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_cold.png', clip }).catch(() => {});
console.log('screenshot saved: verify_shots/audit_cold.png');
await browser.close();
