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
await sleep(2000);

async function dump(label) {
  const d = await app.evaluate(() => {
    const results = [];
    const footer = document.getElementById('notifPaginationFooter');
    if (footer) {
      const r = footer.getBoundingClientRect();
      results.push({ what: 'notifPaginationFooter', rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], html: footer.innerHTML.substring(0, 300), btns: footer.querySelectorAll('button').length, chain: footer.parentElement.id + '/' + footer.parentElement.className });
    }
    const panel = document.getElementById('notificationPanel');
    if (panel) {
      const r = panel.getBoundingClientRect();
      results.push({ what: 'notificationPanel', cls: panel.className, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
    }
    document.querySelectorAll('*').forEach(function(el) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.bottom > window.innerHeight) return;
      const buttons = Array.from(el.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim()));
      if (buttons.length >= 2) {
        results.push({ what: 'FIXED_STRIP', id: el.id, cls: el.className, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], nums: buttons.slice(0, 15).map(b => b.textContent.trim()).join(','), chain: el.parentElement ? (el.parentElement.id || el.parentElement.className || el.parentElement.tagName) : '' });
      }
    });
    return results;
  }).catch(e => ({ err: String(e) }));
  console.log('==== ' + label + ' ====');
  console.log(JSON.stringify(d, null, 1));
}

await dump('dashboard-initial');
for (const p of ['reports', 'machines', 'departments', 'inventory', 'users', 'notifications']) {
  await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p).catch(() => {});
  await sleep(3000);
  await dump(p);
}
await browser.close();
