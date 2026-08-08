import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}
const url = 'https://pwi-maintanance.pages.dev';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => { if (m.type() === 'error') console.log('[console:error]', m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await sleep(3000);
const hasLogin = await page.evaluate(() => !!document.getElementById('loginForm'));
if (hasLogin) {
  await page.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    if (email) email.value = em;
    if (pass) pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  const t0 = Date.now();
  while (!(await page.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 60000) await sleep(2000);
  console.log('logged in');
}
await sleep(2000);
const navItems = await page.evaluate(() => Array.from(document.querySelectorAll('.sidebar-item, nav a, .nav-item')).map(a => ({ text: (a.textContent||'').trim().slice(0,40), page: a.getAttribute('data-page') || a.getAttribute('href') || '' })).slice(0, 40));
console.log('NAV:', JSON.stringify(navItems));
const out = {};
for (const n of navItems) {
  const sel = n.page;
  if (!sel) continue;
  try { await page.evaluate((sel) => { const el = document.querySelector('.sidebar-item[data-page="' + sel + '"]') || document.querySelector('a[href="' + sel + '"]'); if (el) el.click(); }, sel); } catch (e) {}
  await sleep(2500);
  const d = await page.evaluate(() => {
    const footer = document.getElementById('notifPaginationFooter');
    let f = null;
    if (footer) {
      const btns = Array.from(footer.querySelectorAll('button'));
      const numbered = btns.filter(b => /^\d+$/.test((b.textContent||'').trim())).map(b => b.textContent.trim());
      const r = footer.getBoundingClientRect();
      f = { btns: btns.length, numbered, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
    }
    const visibleNumbered = [];
    document.querySelectorAll('button').forEach(b => {
      const txt = (b.textContent || '').trim();
      if (/^\d+$/.test(txt)) {
        const r = b.getBoundingClientRect();
        if (r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth) {
          visibleNumbered.push({ txt, cls: (b.className||'').slice(0,50), chain: (function(){const c=[];let n=b;while(n&&c.length<5){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() });
        }
      }
    });
    return { footer: f, visibleNumbered };
  }).catch(e => ({ err: String(e) }));
  out[sel || n.text] = d;
  console.log(`  ${sel || n.text}: footer=${JSON.stringify(d.footer)} visibleNumBtns=${JSON.stringify(d.visibleNumbered)}`);
}
fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/verify_cf.json', JSON.stringify(out, null, 1));
await browser.close();
