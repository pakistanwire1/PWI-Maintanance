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
function snap(label) {
  return app.evaluate(() => {
    const ids = ['dashboardPage', 'settingsPage', 'auditPage', 'machinesPage'];
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out[id] = {
        active: el.classList.contains('active'),
        op: cs.opacity,
        anim: cs.animationName,
        parent: el.parentElement ? (el.parentElement.id || el.parentElement.className || 'BODY') : '?',
        rectW: Math.round(r.width), rectH: Math.round(r.height)
      };
    }
    return out;
  });
}
await sleep(1500);
console.log('DASHBOARD (default, NO fix) t+1.5s: ' + JSON.stringify(await snap()));
await page.screenshot({ path: 'verify_shots/novfx_dashboard.png' });
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="settings"]'); i.click(); });
await sleep(1500);
console.log('SETTINGS (direct child) NO fix: ' + JSON.stringify(await snap()));
await page.screenshot({ path: 'verify_shots/novfx_settings.png' });
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); i.click(); });
await sleep(1500);
console.log('AUDIT (in modal) NO fix: ' + JSON.stringify(await snap()));
await page.screenshot({ path: 'verify_shots/novfx_audit.png' });
await browser.close();
