import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const OUT = path.join(__dirname, 'verify_shots', 'after_fix');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
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
console.log('login form present:', hasLogin);
if (hasLogin) {
  await app.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    email.value = em; pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
}
await sleep(2500);

const pages = ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications'];
for (const p of pages) {
  try {
    await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p);
    await sleep(3000);
    await page.screenshot({ path: path.join(OUT, 'gas_' + p + '.png') });
    console.log('saved gas_' + p + '.png');
  } catch (e) {
    console.log(p + ' failed: ' + e.message);
  }
}

await app.evaluate(() => {
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.add('open');
  const overlay = document.getElementById('notificationOverlay');
  if (overlay) overlay.classList.add('show');
  return true;
});
await sleep(2000);
await page.screenshot({ path: path.join(OUT, 'gas_panel_open.png') });
console.log('saved gas_panel_open.png');

await browser.close();
