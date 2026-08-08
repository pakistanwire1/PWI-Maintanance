import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}

const url = process.argv[2];
const outDir = process.argv[3] || 'C:/Users/afsar/AppData/Local/Temp/opencode/shots';
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
let app = null;
async function scan() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const info = await f.evaluate(() => ({ hasLogin: !!document.getElementById('loginForm'), hasApp: !!document.getElementById('appContainer') })).catch(() => null);
    if (info && (info.hasLogin || info.hasApp)) return f;
  }
  return null;
}
app = await scan();
while (!app && Date.now() - t0 < 240000) { await sleep(3000); app = await scan(); }
if (!app) { console.log('NO APP'); await browser.close(); process.exit(1); }
const hasLogin = await app.evaluate(() => !!document.getElementById('loginForm'));
if (hasLogin) {
  await app.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    if (email) email.value = em;
    if (pass) pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(3000);
}
await sleep(2000);
const pageNames = ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications', 'settings'];
const summary = {};
for (const p of pageNames) {
  try { await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p); } catch (e) {}
  await sleep(2500);
  const d = await app.evaluate(() => {
    const footer = document.getElementById('notifPaginationFooter');
    let f = null;
    if (footer) {
      const btns = Array.from(footer.querySelectorAll('button'));
      const numbered = btns.filter(b => /^\d+$/.test((b.textContent||'').trim())).map(b => b.textContent.trim());
      const r = footer.getBoundingClientRect();
      f = { btns: btns.length, numbered, html: footer.innerHTML.slice(0, 160), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
    }
    const visibleNumbered = [];
    document.querySelectorAll('button').forEach(b => {
      const txt = (b.textContent || '').trim();
      if (/^\d+$/.test(txt)) {
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        if (r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && cs.display !== 'none' && cs.visibility !== 'hidden') {
          visibleNumbered.push({ txt, cls: (b.className||'').slice(0,50), chain: (function(){const c=[];let n=b;while(n&&c.length<5){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() });
        }
      }
    });
    return { footer: f, visibleNumbered };
  }).catch(e => ({ err: String(e) }));
  summary[p] = d;
  const fname = (url.includes('pwi-maintanance') ? 'cf_' : 'gas_') + p + '.png';
  await page.screenshot({ path: outDir + '/' + fname });
  console.log(`  ${p}: footer=${JSON.stringify(d.footer)} visibleNumBtns=${JSON.stringify(d.visibleNumbered)}`);
}
fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/verify_shots.json', JSON.stringify({ url, summary }, null, 1));
await browser.close();
