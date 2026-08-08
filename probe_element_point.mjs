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
await sleep(2000);

async function scan(label) {
  const d = await app.evaluate(() => {
    const results = [];
    const W = window.innerWidth, H = window.innerHeight;
    for (const fy of [0.55, 0.7, 0.85, 0.95, 1.0]) {
      const y = Math.round(H * fy);
      for (let fx = 0.5; fx <= 1.0; fx += 0.05) {
        const x = Math.round(W * fx);
        const el = document.elementFromPoint(x, y);
        if (!el) continue;
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 60);
        if (/^\d+$/.test((el.textContent || '').trim())) {
          results.push({ at: '(' + x + ',' + y + ')', tag: el.tagName, cls: el.className, num: el.textContent.trim(), chain: [el.id, el.className, el.parentElement && el.parentElement.className, el.parentElement && el.parentElement.parentElement && el.parentElement.parentElement.className].filter(Boolean).join(' > ') });
        }
      }
    }
    return results;
  }).catch(e => ({ err: String(e) }));
  console.log('==== ' + label + ' ====');
  console.log(JSON.stringify(d, null, 1));
}

async function scrollBottom(label) {
  await app.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await sleep(800);
  await scan(label + '-bottom');
}

for (const p of ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications']) {
  await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p).catch(() => {});
  await sleep(3000);
  await scan(p);
  await scrollBottom(p);
}
await browser.close();
