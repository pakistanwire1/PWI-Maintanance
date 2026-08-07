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
console.log('login form ready at ' + Math.round((Date.now() - t0) / 1000) + 's');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
console.log('app ready at ' + Math.round((Date.now() - t0) / 1000) + 's');
await sleep(1500);
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="reports"]'); if (i) i.click(); }).catch(() => {});
await sleep(5000);
const info = await app.evaluate(() => {
  const texts = document.body.innerText;
  const html = document.body.innerHTML;
  const pagiSel = [
    '.pagination', '#pagination', '.page-buttons', '#pageButtons', '.page-numbers',
    '#paginationControls', '.rptPagination', '#rptPagination'
  ];
  const found = pagiSel.map(s => ({ s, n: document.querySelectorAll(s).length }));
  const hasPrevious = /Previous\s*1\s*2\s*3/.test(html);
  const prevCount = (html.match(/Previous/g) || []).length;
  const btnTexts = Array.from(document.querySelectorAll('button, a')).map(b => (b.textContent || '').trim()).filter(t => /^[0-9]+$/.test(t));
  return {
    reportsPage: !!document.getElementById('reportsPage'),
    innerTextHead: texts.slice(0, 600),
    pagiFound: found.filter(f => f.n > 0),
    hasPrevious, prevCount, numberedBtnTexts: btnTexts.slice(0, 20)
  };
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'verify_shots/test_deploy/reports_secondary.png' }).catch(() => {});
await browser.close();
