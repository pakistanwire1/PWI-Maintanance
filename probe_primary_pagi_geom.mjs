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
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="reports"]'); if (i) i.click(); }).catch(() => {});
await sleep(5000);
const d = await app.evaluate(() => {
  const f = document.getElementById('notifPaginationFooter');
  const chain = [];
  let el = f;
  for (let i = 0; i < 8 && el; i++) { chain.push({ id: el.id, cls: (el.className || '').toString().slice(0, 60), tag: el.tagName, disp: getComputedStyle(el).display }); el = el.parentElement; }
  const rect = f.getBoundingClientRect();
  const firstBtns = Array.from(f.querySelectorAll('button')).slice(0, 6).map(b => (b.textContent || '').trim() + (b.disabled ? '(d)' : ''));
  const lastBtns = Array.from(f.querySelectorAll('button')).slice(-3).map(b => (b.textContent || '').trim() + (b.disabled ? '(d)' : ''));
  return { rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }, chain, firstBtns, lastBtns, totalBtns: f.querySelectorAll('button').length };
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(d, null, 2));
await page.screenshot({ path: 'verify_shots/test_deploy/primary_gas_reports_pagi_geometry.png' }).catch(() => {});
await browser.close();
