import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec';
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
while (!app && Date.now() - t0 < 120000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(1); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
console.log('login form ready');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
console.log('app ready');
await sleep(1500);
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="reports"]'); if (i) i.click(); }).catch(() => {});
await sleep(5000);
const detail = await app.evaluate(() => {
  const html = document.body.innerHTML;
  const out = { prevContexts: [], numbered: [], reportsPageHasPagi: false };
  let idx = -1;
  while ((idx = html.indexOf('Previous', idx + 1)) !== -1) {
    out.prevContexts.push(html.slice(Math.max(0, idx - 120), idx + 40).replace(/\s+/g, ' '));
  }
  const numberedBtns = Array.from(document.querySelectorAll('button, a')).filter(b => /^[0-9]+$/.test((b.textContent || '').trim()));
  out.numbered = numberedBtns.slice(0, 25).map(b => {
    const p = b.closest('[class*="pag"], [id*="pag"], [class*="page"], [id*="page"]');
    return { t: (b.textContent || '').trim(), visible: b.offsetParent !== null, cls: b.className, id: b.id, pagParent: p ? (p.id || p.className) : 'none' };
  });
  const rp = document.getElementById('reportsPage');
  out.reportsPageHasPagi = !!(rp && rp.querySelector('.pagination, #pagination, .page-buttons, #pageButtons, #paginationControls'));
  const visible = Array.from(document.querySelectorAll('#reportsPage button, #reportsPage a')).filter(b => b.offsetParent !== null).map(b => (b.textContent || '').trim()).filter(t => t);
  out.reportsPageVisibleButtons = visible.slice(0, 60);
  out.reportsPageVisibleCount = visible.length;
  return out;
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(detail, null, 2));
await browser.close();
