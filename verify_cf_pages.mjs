import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}
const url = 'https://pwi-maintanance.pages.dev';
const outDir = process.argv[2] || 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_verify';
fs.mkdirSync(outDir, { recursive: true });
const userDataDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/chrome_verify_profile2';

const report = { url, sw: null, cacheKeys: null, pages: {} };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') console.log('[console:error]', m.text().slice(0, 250)); });

console.log('== 1. HARD REFRESH (cache bypass) ==');
await page.setCacheEnabled(false);
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(2500);
await page.reload({ waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(2500);

console.log('== 2. SW + CACHE ==');
const swInfo = await page.evaluate(async () => {
  const out = { regs: [], caches: [] };
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      out.regs.push({ scope: r.scope, active: r.active ? r.active.scriptURL : null, state: r.active ? r.active.state : null });
    }
  } catch (e) { out.regsErr = String(e); }
  try { out.caches = await caches.keys(); } catch (e) { out.cachesErr = String(e); }
  return out;
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(swInfo, null, 1));
report.sw = swInfo;

console.log('== 3. LOGIN ==');
const t0 = Date.now();
await page.waitForSelector('#loginForm', { timeout: 60000 }).catch(() => console.log('no loginForm immediately'));
if (await page.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) {
  await page.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    if (email) email.value = em;
    if (pass) pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
}
while (!(await page.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 90000) await sleep(2000);
console.log('logged in, appContainer present');

await sleep(2500);
await page.screenshot({ path: path.join(outDir, '00_dashboard.png') });

const pageNames = ['dashboard','reports','machines','departments','sections','inventory','spareparts','technicians','users','notifications','settings'];
const navMap = {
  dashboard: '.sidebar-item[data-page="dashboard"]',
  reports: '.sidebar-item[data-page="reports"]',
  machines: '.sidebar-item[data-page="machines"]',
  departments: '.sidebar-item[data-page="departments"]',
  sections: '.sidebar-item[data-page="sections"]',
  inventory: '.sidebar-item[data-page="inventory"]',
  spareparts: '.sidebar-item[data-page="spareparts"]',
  technicians: '.sidebar-item[data-page="technicians"]',
  users: '.sidebar-item[data-page="users"]',
  notifications: '.sidebar-item[data-page="notifications"]',
  settings: '.sidebar-item[data-page="settings"]'
};

let anyStripFound = false;
for (const name of pageNames) {
  const sel = navMap[name];
  let clicked = false;
  try {
    clicked = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) { el.click(); return true; }
      return false;
    }, sel);
  } catch (e) {}
  await sleep(3000);

  const d = await page.evaluate(() => {
    // BOTTOM-RIGHT corner inspection: sample the element at bottom-right region and any numbered buttons
    const corner = (() => {
      const x = innerWidth - 200, y = innerHeight - 100;
      const el = document.elementFromPoint(x, y);
      const chain = [];
      let n = el;
      while (n && chain.length < 8) { chain.push((n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').join('.') : '') + (n.tagName || '')); n = n.parentElement; }
      return { x, y, tag: el ? el.tagName : null, id: el ? el.id : null, cls: el && typeof el.className === 'string' ? el.className : '', text: el ? (el.textContent || '').trim().slice(0, 60) : '', chain };
    })();
    // all numbered buttons visible
    const numBtns = [];
    document.querySelectorAll('button, a, span').forEach(b => {
      const txt = (b.textContent || '').trim();
      if (/^\d{1,3}$/.test(txt)) {
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && cs.visibility !== 'hidden' && cs.display !== 'none') {
          numBtns.push({ txt, tag: b.tagName, cls: (b.className || '').slice(0, 40), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], chain: (function(){const c=[];let n=b;while(n&&c.length<6){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() });
        }
      }
    });
    // pagination elements present
    const pagEls = Array.from(document.querySelectorAll('.pagination, .notif-pagination-footer, #notifPaginationFooter')).map(p => {
      const r = p.getBoundingClientRect();
      return { cls: p.className, id: p.id, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: (p.textContent || '').trim().slice(0, 80), parentChain: (function(){const c=[];let n=p.parentElement;while(n&&c.length<5){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() };
    });
    return { corner, numBtns, pagEls };
  }).catch(e => ({ err: String(e) }));

  const hasStrip = d.numBtns && d.numBtns.length >= 2;
  if (hasStrip) anyStripFound = true;
  report.pages[name] = d;
  console.log(`\n== ${name} ==`);
  console.log(`  corner: ${JSON.stringify(d.corner)}`);
  console.log(`  numbered buttons visible: ${d.numBtns ? d.numBtns.length : 'n/a'}`);
  (d.numBtns || []).forEach(b => console.log(`    NUM: "${b.txt}" ${b.tag} ${b.cls} rect=${JSON.stringify(b.rect)} chain=${b.chain}`));
  console.log(`  pagination el: ${d.pagEls ? JSON.stringify(d.pagEls) : 'n/a'}`);
  await page.screenshot({ path: path.join(outDir, name + '.png') });
  await sleep(500);
}

console.log('\n\n==== ANY NUMBERED STRIP FOUND: ' + anyStripFound + ' ====');
fs.writeFileSync(path.join(outDir, 'full_report.json'), JSON.stringify(report, null, 1));
await browser.close();
