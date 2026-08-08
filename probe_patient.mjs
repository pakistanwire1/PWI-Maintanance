import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}

const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 400)));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
let app = null;
async function scan() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const info = await f.evaluate(() => ({
      hasLogin: !!document.getElementById('loginForm'),
      hasApp: !!document.getElementById('appContainer')
    })).catch(() => null);
    if (info && (info.hasLogin || info.hasApp)) return f;
  }
  return null;
}
app = await scan();
while (!app && Date.now() - t0 < 150000) { await sleep(3000); app = await scan(); }
if (!app) { console.log('NO APP after 150s'); await browser.close(); process.exit(1); }
console.log(`[t+${Math.round((Date.now()-t0)/1000)}s] app frame found`);
const hasLogin = await app.evaluate(() => !!document.getElementById('loginForm'));
if (hasLogin) {
  await app.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    if (email) email.value = em;
    if (pass) pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 150000) await sleep(3000);
}
await sleep(2000);
const pageNames = ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications', 'settings'];
const results = {};
for (const p of pageNames) {
  try { await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p); } catch (e) {}
  await sleep(2500);
  const d = await app.evaluate(() => {
    const footer = document.getElementById('notifPaginationFooter');
    let f = null;
    if (footer) {
      const btns = Array.from(footer.querySelectorAll('button'));
      const r = footer.getBoundingClientRect();
      f = { btns: btns.length, numbered: btns.some(b => /^\d+$/.test((b.textContent||'').trim())), html: footer.innerHTML.slice(0,140), rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)] };
    }
    const panel = document.getElementById('notificationPanel');
    let pl = null;
    if (panel) { const r = panel.getBoundingClientRect(); pl = { rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)] }; }
    let anyVisibleNum = false;
    function walk(root, depth) {
      if (depth > 20) return;
      for (const el of Array.from(root.children||[])) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
        const btns = Array.from(el.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent||'').trim()));
        if (btns.length >= 2) {
          const r = el.getBoundingClientRect();
          if (r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth) anyVisibleNum = true;
        }
        walk(el, depth+1);
      }
    }
    walk(document.body, 0);
    return { footer: f, panel: pl, anyVisibleNum, numLoopInBody: document.body.innerHTML.includes('for (var p = 1; p <= totalPages; p++)') };
  }).catch(e => ({ err: String(e) }));
  results[p] = d;
  console.log(`  ${p}: footer=${JSON.stringify(d.footer)} visibleNumBtns=${d.anyVisibleNum} loopInBody=${d.numLoopInBody}`);
}
fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/verify_patient.json', JSON.stringify({ url, results }, null, 1));
await browser.close();
