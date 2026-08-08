import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}
const url = 'https://pwi-maintanance.pages.dev';
const outDir = process.argv[2] || 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_verify2';
fs.mkdirSync(outDir, { recursive: true });
const userDataDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/chrome_verify_profile4';

const report = { url, sw: null, cacheKeys: null, pages: {} };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});
let page = await browser.newPage();
page.on('error', e => console.log('[page-crash]', String(e).slice(0, 200)));
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));
const recover = async () => {
  try { await page.close(); } catch (e) {}
  page = await browser.newPage();
  page.on('error', e => console.log('[page-crash]', String(e).slice(0, 200)));
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));
  await page.setViewport({ width: 1440, height: 900 });
  await page.setCacheEnabled(false);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await sleep(4000);
};

console.log('== HARD REFRESH + login ==');
await page.setCacheEnabled(false);
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(2500);
await page.reload({ waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(2500);

const swInfo = await page.evaluate(async () => {
  const out = { regs: [], caches: [] };
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) out.regs.push({ scope: r.scope, active: r.active ? r.active.scriptURL : null, state: r.active ? r.active.state : null });
  } catch (e) { out.regsErr = String(e); }
  try { out.caches = await caches.keys(); } catch (e) { out.cachesErr = String(e); }
  return out;
}).catch(e => ({ err: String(e) }));
console.log('SW/CACHE:', JSON.stringify(swInfo));
report.sw = swInfo;

const t0 = Date.now();
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
console.log('logged in');

const pageNames = ['dashboard','reports','machines','departments','sections','inventory','spareparts','technicians','users','notifications','settings'];
const navMap = {
  dashboard: '.sidebar-item[data-page="dashboard"]', reports: '.sidebar-item[data-page="reports"]',
  machines: '.sidebar-item[data-page="machines"]', departments: '.sidebar-item[data-page="departments"]',
  sections: '.sidebar-item[data-page="sections"]', inventory: '.sidebar-item[data-page="inventory"]',
  spareparts: '.sidebar-item[data-page="spareparts"]', technicians: '.sidebar-item[data-page="technicians"]',
  users: '.sidebar-item[data-page="users"]', notifications: '.sidebar-item[data-page="notifications"]',
  settings: '.sidebar-item[data-page="settings"]'
};

let anyStrip = false;
for (const name of pageNames) {
  const sel = navMap[name];
  try {
    const clicked = await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; }, sel);
    if (!clicked) { await page.evaluate((p) => { if (window.Router && Router.navigate) Router.navigate(p); }, name); }
  } catch (e) { console.log('[nav error]', String(e).slice(0, 150)); }

  // wait for loading overlay to disappear AND appContainer to have content
  const waitStart = Date.now();
  let busy = true;
  while (Date.now() - waitStart < 15000) {
    try {
      busy = await page.evaluate(() => {
        const ov = document.getElementById('loadingOverlay');
        const loading = ov ? ov.classList.contains('show') : false;
        const app = document.getElementById('appContainer');
        const appEmpty = app ? app.children.length === 0 : true;
        return loading || appEmpty;
      });
    } catch (e) { busy = true; }
    if (!busy) break;
    await sleep(700);
  }
  await sleep(1500);

  const d = await page.evaluate(() => {
    const results = { err: null, cornerSweep: [], notifFooter: null, activePage: null, bodyText: '' };
    try {
    results.bodyText = (document.body.innerText || '').slice(0, 200);

    // 1. bottom-right corner sweep: sample a 440x180 grid in the corner
    for (let gy = 0; gy < 3; gy++) {
      for (let gx = 0; gx < 6; gx++) {
        const x = innerWidth - 40 - gx * 80;
        const y = innerHeight - 30 - gy * 60;
        const el = document.elementFromPoint(x, y);
        if (!el) continue;
        const chain = [];
        let n = el;
        while (n && chain.length < 8) {
          chain.push((n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/).join('.') : '') + (n.tagName || ''));
          n = n.parentElement;
        }
        results.cornerSweep.push({ x, y, tag: el.tagName, id: el.id, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60), text: (el.textContent || '').trim().slice(0, 40), chain });
      }
    }

    // 2. #notifPaginationFooter
    const footer = document.getElementById('notifPaginationFooter');
    if (footer) {
      const r = footer.getBoundingClientRect();
      const btns = Array.from(footer.querySelectorAll('button'));
      results.notifFooter = { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: (footer.textContent || '').trim().slice(0, 80), btnCount: btns.length, numberedBtns: btns.filter(b => /^\d+$/.test((b.textContent || '').trim())).map(b => b.textContent.trim()), parentChain: (function(){const c=[];let n=footer.parentElement;while(n&&c.length<5){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() };
    }

    // 3. .pagination elements: rect + text + parent chain (prove they're IN-TABLE, not floating)
    results.paginationEls = Array.from(document.querySelectorAll('.pagination, .notif-pagination-footer')).map(p => {
      const r = p.getBoundingClientRect();
      return { cls: p.className, id: p.id, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: (p.textContent || '').trim().slice(0, 90), numbered: (p.textContent || '').match(/\d{1,4}/g) || [], parentChain: (function(){const c=[];let n=p.parentElement;while(n&&c.length<6){c.unshift(n.id||n.className||n.tagName);n=n.parentElement;}return c.join('>');})() };
    });

    // 4. active page
    const active = document.querySelector('.page:not([style*="display: none"]), .page.active, [id$="Page"]:not([style*="display: none"])');
    results.activePage = active ? active.id || active.className : null;

    return results;
    } catch (e) { results.err = String(e && e.stack || e); return results; }
  }).catch(e => ({ err: String(e) }));

  const VW = 1440, VH = 900;
  const realStrip = (d.paginationEls || []).some(p => {
    const r = p.rect;
    const floating = r[1] > VH * 0.7 && r[0] + r[2] > VW * 0.6;
    const numbered = (p.numbered || []).filter(n => /^\d{1,4}$/.test(n));
    return floating && numbered.length >= 2;
  }) || (d.notifFooter && d.notifFooter.btnCount >= 2 && d.notifFooter.numberedBtns.length >= 2);
  if (realStrip) anyStrip = true;
  report.pages[name] = d;
  console.log(`\n== ${name} ==`);
  console.log(`  activePage: ${d.activePage} | bodyText: ${(d.bodyText || '').replace(/\s+/g, ' ').slice(0, 90)}`);
  console.log(`  notifFooter: ${JSON.stringify(d.notifFooter)}`);
  console.log(`  paginationEls: ${JSON.stringify(d.paginationEls)}`);
  console.log(`  corner sweep top els:`, [...new Set((d.cornerSweep || []).map(c => (c.id || c.cls || c.tag).split(' ')[0]))].slice(0, 8));
  console.log(`  REAL FLOATING STRIP: ${realStrip}`);
  try {
    await page.screenshot({ path: path.join(outDir, name + '.png') });
  } catch (e) {
    console.log('[screenshot failed, recovering]', String(e).slice(0, 120));
    await recover();
  }
  await sleep(400);
}

console.log('\n\n==== ANY REAL NUMBERED STRIP (2+ numbered btns in row, >0): ' + anyStrip + ' ====');
fs.writeFileSync(path.join(outDir, 'full_report.json'), JSON.stringify(report, null, 1));
await browser.close();
