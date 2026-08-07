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
while (!app && Date.now() - t0 < 90000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(0); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(2000);
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('app ready');
await sleep(1500);
await app.evaluate(() => {
  const s = document.createElement('style'); s.id = 'fixNoFade';
  s.textContent = '.page { animation: none !important; }';
  document.head.appendChild(s);
});
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); i.click(); });
await sleep(4000);
const dump = await app.evaluate(() => {
  function info(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      id: el.id, cls: el.className, tag: el.tagName,
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      pos: cs.position, w: Math.round(r.width), h: Math.round(r.height),
      minH: cs.minHeight, overflow: cs.overflow, height: cs.height,
      transform: cs.transform, filter: cs.filter, contain: cs.contain,
      zIndex: cs.zIndex, animName: cs.animationName
    };
  }
  const audit = document.getElementById('auditPage');
  const chain = [];
  let cur = audit;
  while (cur && chain.length < 8) { chain.push(info(cur)); cur = cur.parentElement; }
  const content = document.querySelector('.page-content');
  const pageContentInfo = content ? info(content) : null;
  const grid = document.getElementById('auditSummaryCards');
  const tbl = document.getElementById('auditTable');
  return {
    chain,
    pageContentInfo,
    grid: grid ? info(grid) : null,
    tbl: tbl ? info(tbl) : null,
    auditHasActive: audit.classList.contains('active'),
    rows: document.querySelectorAll('#auditTable tbody tr').length,
    nPages: document.querySelectorAll('.page').length,
    activePages: document.querySelectorAll('.page.active').length
  };
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(dump, null, 1));
await browser.close();
