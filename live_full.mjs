import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';

const PAGES = [
  'dashboard', 'assets', 'machines', 'technicians', 'departments', 'sections',
  'users', 'jobcards', 'openjobcard', 'startjobcard', 'pendingjobcard',
  'approvejobcard', 'closejobcard', 'pm', 'checklists', 'spareparts',
  'inventory', 'notifications', 'audit', 'qr'
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const errors = [];
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push({ t: Date.now(), kind: 'console:' + m.type(), msg: m.text().slice(0, 600) });
});
page.on('pageerror', e => errors.push({ t: Date.now(), kind: 'pageerror', msg: (e.stack || e.message).slice(0, 900) }));

await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));

async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}

let app = await pickAppFrame();
const t0 = Date.now();
while (!app && Date.now() - t0 < 90000) {
  await new Promise(r => setTimeout(r, 2000));
  app = await pickAppFrame();
}
if (!app) { console.log('NO APP FRAME'); await browser.close(); process.exit(0); }
console.log('T+' + Math.round((Date.now() - t0) / 1000) + 's app frame found');

// Wait for login form (getAppHtml slow)
const t1 = Date.now();
let hasForm = false;
while (Date.now() - t1 < 120000) {
  hasForm = await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
  if (hasForm) break;
  await new Promise(r => setTimeout(r, 2000));
}
console.log('login form ready after T+' + Math.round((Date.now() - t0) / 1000) + 's');

const login = await app.evaluate(() => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  const form = document.getElementById('loginForm');
  if (!email || !pass) return { ok: false, reason: 'no login fields' };
  email.value = 'supervisor@cmms.com';
  pass.value = 'super123';
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  return { ok: true };
}).catch(e => ({ ok: false, reason: e.message }));
console.log('login submit:', JSON.stringify(login));

const t2 = Date.now();
let hasApp = false;
while (Date.now() - t2 < 60000) {
  await new Promise(r => setTimeout(r, 1500));
  hasApp = await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false);
  if (hasApp) break;
}
console.log('hasApp after login:', hasApp);
if (!hasApp) {
  console.log('login error:', await app.evaluate(() => (document.getElementById('loginError') || {}).textContent || '(none)').catch(() => 'ERR'));
}

if (hasApp) {
  await new Promise(r => setTimeout(r, 3000));
  for (const p of PAGES) {
    const before = errors.length;
    const navErr = await app.evaluate(pg => {
      try { window.navigateTo(pg); return null; } catch (e) { return (e.stack || e.message).slice(0, 600); }
    }, p).catch(e => 'EVALERR ' + e.message);
    await new Promise(r => setTimeout(r, 6000));
    const st = await app.evaluate(pg => {
      const el = document.getElementById(pg + 'Page');
      const toasts = [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ');
      return {
        active: el ? el.classList.contains('active') : false,
        bodyLen: el ? el.innerHTML.length : -1,
        text: el ? el.innerText.replace(/\s+/g, ' ').slice(0, 120) : '',
        toast: toasts.slice(0, 200),
        loadingShown: !!(document.getElementById('loadingOverlay') && document.getElementById('loadingOverlay').style.display !== 'none')
      };
    }, p).catch(e => ({ err: e.message }));
    const newErrors = errors.slice(before);
    const blank = st.active && st.bodyLen < 80;
    console.log('--- ' + p + ' --- active=' + st.active + ' bodyLen=' + st.bodyLen + (blank ? ' *** BLANK ***' : ''));
    console.log('  text: ' + (st.text || '(empty)').slice(0, 100));
    if (st.toast) console.log('  TOAST: ' + st.toast);
    if (navErr) console.log('  NAVERR: ' + navErr);
    if (newErrors.length) {
      console.log('  ERRORS(' + newErrors.length + '):');
      for (const e of newErrors.slice(0, 6)) console.log('    [' + e.kind + '] ' + e.msg.slice(0, 300));
    }
  }
}

await browser.close();
console.log('\nDONE');
