import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = process.argv[2] || 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}
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
await sleep(3000);
const hasLogin = await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
if (hasLogin) {
  await app.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    email.value = em; pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
}
await sleep(3000);
const d = await app.evaluate(() => {
  const panel = document.getElementById('notificationPanel');
  const footer = document.getElementById('notifPaginationFooter');
  const overlay = document.getElementById('notificationOverlay');
  const cs = getComputedStyle(panel);
  const btn = footer ? footer.querySelector('button') : null;
  const btnCs = btn ? getComputedStyle(btn) : null;
  return {
    panelClass: panel.className,
    panelRect: (() => { const r = panel.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
    panelPosition: cs.position, panelRight: cs.right, panelTop: cs.top, panelWidth: cs.width,
    overlayClass: overlay ? overlay.className : 'none',
    overlayDisplay: overlay ? getComputedStyle(overlay).display : 'none',
    footerBtns: footer ? footer.querySelectorAll('button').length : -1,
    firstBtns: footer ? Array.from(footer.querySelectorAll('button')).slice(0, 6).map(b => b.textContent.trim() + (b.disabled ? '(d)' : '')) : [],
    btnStyle: btnCs ? { display: btnCs.display, position: btnCs.position, bg: btnCs.backgroundColor } : null,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth
  };
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(d, null, 2));
await page.screenshot({ path: 'verify_shots/test_deploy/primary_live_state.png' }).catch(() => {});
await browser.close();
