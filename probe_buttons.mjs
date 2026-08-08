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
for (const p of pageNames) {
  try { await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p); } catch (e) {}
  await sleep(2500);
  const d = await app.evaluate(() => {
    const out = [];
    document.querySelectorAll('button').forEach(b => {
      const txt = (b.textContent || '').trim();
      if (/^\d+$/.test(txt)) {
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        const visible = r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
        out.push({ txt, visible, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], cls: (b.className||'').slice(0,60), chain: (function(){const c=[];let n=b;while(n&&c.length<5){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() });
      }
    });
    return out;
  }).catch(e => ({ err: String(e) }));
  const visible = (d.filter ? d.filter(x => x.visible) : []);
  console.log(`\n== ${p}: total numeric buttons=${d.filter ? d.filter(x=>!x.err).length : 'err'} visible=${visible.length}`);
  visible.forEach(v => console.log(`   VISIBLE: "${v.txt}" rect=${JSON.stringify(v.rect)} cls="${v.cls}" chain=${v.chain}`));
  if (d.filter) d.filter(x => !x.visible && !x.err).forEach(v => console.log(`   hidden:  "${v.txt}" rect=${JSON.stringify(v.rect)} cls="${v.cls}"`));
}
await browser.close();
