import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = process.env.CMMS_EMAIL || 'supervisor@cmms.com';
const PASSWORD = process.env.CMMS_PASSWORD || 'super123';
const SHOTS = 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots';

const PAGES = [
  'audit', 'sections', 'departments', 'machines', 'technicians', 'users',
  'openjobcard', 'startjobcard', 'closejobcard', 'pendingjobcard',
  'approvejobcard', 'jobcards', 'pm', 'checklists', 'spareparts',
  'inventory', 'notifications', 'qr'
];

if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errors = [];
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push({ t: Date.now(), kind: 'console:' + m.type(), msg: m.text().slice(0, 700) });
});
page.on('pageerror', e => errors.push({ t: Date.now(), kind: 'pageerror', msg: (e.stack || e.message).slice(0, 900) }));

async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}

const tStart = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));

let app = await pickAppFrame();
while (!app && Date.now() - tStart < 90000) {
  await sleep(2000);
  app = await pickAppFrame();
}
if (!app) { console.log('NO APP FRAME'); await browser.close(); process.exit(0); }
console.log('BOOT: frame found at T+' + Math.round((Date.now() - tStart) / 1000) + 's');

// wait for login form (getAppHtml)
let hasForm = false;
while (Date.now() - tStart < 180000) {
  hasForm = await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
  if (hasForm) break;
  await sleep(2000);
}
console.log('LOGIN FORM ready at T+' + Math.round((Date.now() - tStart) / 1000) + 's (getAppHtml latency ~' + Math.round((Date.now() - tStart - 4000) / 1000) + 's)');

await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  const form = document.getElementById('loginForm');
  email.value = em;
  pass.value = pw;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, EMAIL, PASSWORD);

let hasApp = false;
const tLogin = Date.now();
while (Date.now() - tLogin < 60000) {
  await sleep(1500);
  hasApp = await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false);
  if (hasApp) break;
}
console.log('APP after login:', hasApp, 'at T+' + Math.round((Date.now() - tStart) / 1000) + 's');
if (!hasApp) {
  console.log('LOGIN ERROR:', await app.evaluate(() => (document.getElementById('loginError') || {}).textContent || '(none)').catch(() => 'ERR'));
  await browser.close();
  process.exit(0);
}

await sleep(4000);

const report = [];
for (const p of PAGES) {
  const before = errors.length;
  const clickResult = await app.evaluate(pg => {
    const item = document.querySelector('.sidebar-item[data-page="' + pg + '"]');
    if (!item) return { clicked: false, reason: 'no menu item' };
    item.click();
    return { clicked: true };
  }, p).catch(e => ({ clicked: false, reason: e.message }));

  // wait for the page's content to settle: poll innerHTML length until stable (max 45s)
  const tNav = Date.now();
  let lastLen = -1, stableCount = 0, contentReady = false;
  let rowsAtEnd = 0;
  while (Date.now() - tNav < 45000) {
    await sleep(900);
    const s = await app.evaluate(pg => {
      const el = document.getElementById(pg + 'Page');
      if (!el) return null;
      return { len: el.innerHTML.length, rows: el.querySelectorAll('table tbody tr').length, empty: !!el.querySelector('.empty-state') };
    }, p).catch(() => null);
    if (!s) break;
    rowsAtEnd = s.rows;
    if (s.rows > 0 || s.empty) { contentReady = true; break; }
    if (s.len === lastLen) { stableCount++; } else { stableCount = 0; lastLen = s.len; }
    if (stableCount >= 3 && lastLen > 500) { contentReady = true; break; }
  }
  const settledMs = Date.now() - tNav;

  const st = await app.evaluate(pg => {
    const el = document.getElementById(pg + 'Page');
    const active = el ? el.classList.contains('active') : false;
    const rows = el ? el.querySelectorAll('table tbody tr').length : -1;
    const emptyState = el ? el.querySelector('.empty-state') : null;
    const statCards = el ? el.querySelectorAll('.stat-card h3').length : 0;
    const statVals = el ? [...el.querySelectorAll('.stat-card h3')].map(h => h.textContent.trim()) : [];
    const bodyLen = el ? el.innerHTML.length : -1;
    const toasts = [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ');
    const loadingShown = (() => { const ov = document.getElementById('loadingOverlay'); return !!ov && getComputedStyle(ov).display !== 'none'; })();
    return {
      hasPageDiv: !!el, active, rows, emptyState: !!emptyState, emptyText: emptyState ? emptyState.innerText.replace(/\s+/g, ' ').slice(0, 60) : '',
      statCards, statVals: statVals.slice(0, 4), bodyLen, toast: toasts.slice(0, 250), loadingShown,
      pageTitle: (document.getElementById('pageTitle') || {}).textContent || ''
    };
  }, p).catch(e => ({ err: e.message }));
  st.settledMs = settledMs;
  st.contentReady = contentReady;

  await app.evaluate(() => {
    const ov = document.getElementById('loadingOverlay');
    if (ov) ov.style.display = 'none';
  }).catch(() => {});
  await sleep(400);
  const shot = SHOTS + '/ui_' + p + '.png';
  const clip = await page.evaluate(furl => {
    for (const f of document.querySelectorAll('iframe')) {
      if (f.src.indexOf('userCodeAppPanel') >= 0 || f.src === furl) {
        const r = f.getBoundingClientRect();
        return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
      }
    }
    return null;
  }, app.url()).catch(() => null);
  if (clip) { await page.screenshot({ path: shot, clip }).catch(() => {}); }
  else { await page.screenshot({ path: shot }).catch(() => {}); }

  const newErrors = errors.slice(before);
  const blank = st.hasPageDiv && st.active && st.rows === 0 && !st.emptyState && !(st.statCards && st.statVals.some(v => v && v !== '0'));
  report.push({
    page: p, clicked: clickResult.clicked, reason: clickResult.reason,
    active: st.active, rows: st.rows, emptyState: st.emptyState, emptyText: st.emptyText,
    statVals: st.statVals, bodyLen: st.bodyLen, toast: st.toast, loadingShown: st.loadingShown,
    pageTitle: st.pageTitle, shot, blank, navMs: settledMs, contentReady: st.contentReady, errors: newErrors.slice(0, 5)
  });
}

console.log('\n===== UI VERIFICATION REPORT (' + EMAIL + ') =====');
for (const r of report) {
  console.log('--- ' + r.page + ' ---');
  console.log('  clicked=' + r.clicked + (r.reason ? ' (' + r.reason + ')' : '') + ' active=' + r.active + ' rows=' + r.rows + ' emptyState=' + r.emptyState + (r.emptyText ? ' "' + r.emptyText + '"' : '') + ' statVals=[' + r.statVals.join(',') + '] settled=' + r.navMs + 'ms contentReady=' + r.contentReady);
  console.log('  blank=' + r.blank + ' bodyLen=' + r.bodyLen + ' title="' + r.pageTitle + '" shot=' + r.shot.replace(/.*verify_shots\//, ''));
  if (r.toast) console.log('  TOAST: ' + r.toast);
  if (r.loadingShown) console.log('  LOADING STILL SHOWN');
  if (r.errors.length) { console.log('  ERRORS:'); for (const e of r.errors) console.log('    [' + e.kind + '] ' + e.msg.slice(0, 300)); }
}
await browser.close();
console.log('\nDONE');
