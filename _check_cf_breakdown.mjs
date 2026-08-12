import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = 'https://pwi-maintanance.pages.dev/?v=' + Date.now();
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push('[' + m.type() + '] ' + m.text().slice(0, 300)); });
page.on('pageerror', e => logs.push('[pe] ' + String(e.message).slice(0, 300)));

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(4000);
const onWelcome = await page.evaluate(() => { const w = document.getElementById('welcomePage'); return !!w && getComputedStyle(w).display !== 'none'; }).catch(() => false);
if (onWelcome) {
  await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await sleep(4000);
}
let loggedIn = false;
for (let i = 0; i < 40 && !loggedIn; i++) {
  const st = await page.evaluate(() => {
    const lp = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    return { lv: !!lp && getComputedStyle(lp).display !== 'none', av: !!app && getComputedStyle(app).display !== 'none' };
  }).catch(() => ({}));
  if (st.av) { loggedIn = true; break; }
  if (st.lv) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
    await sleep(5000);
  }
  await sleep(1500);
}
console.log('loggedIn:', loggedIn);
if (!loggedIn) { console.log('LOGIN FAILED. logs:', logs.slice(0, 10)); await browser.close(); process.exit(1); }
await sleep(3000);

const snap = () => page.evaluate(() => {
  const ov = document.getElementById('loadingOverlay');
  const bp = document.getElementById('breakdownPage');
  const hasBd = !!bp;
  const bdActive = hasBd && bp.classList.contains('active');
  const rows = (document.querySelectorAll('#breakdownTableContainer tbody tr, #breakdownTableContainer .table-row') || []).length;
  const current = typeof currentPage !== 'undefined' ? currentPage : '?';
  const bdDiv = document.getElementById('bdDivision');
  const bdSec = document.getElementById('bdSection');
  const bdDept = document.getElementById('bdDepartment');
  return { ovShow: ov ? ov.classList.contains('show') : null, hasBd, bdActive, rows, current, divOpts: bdDiv ? bdDiv.options.length : -1, secOpts: bdSec ? bdSec.options.length : -1, deptOpts: bdDept ? bdDept.options.length : -1 };
}).catch(e => ({ evalErr: String(e.message) }));

await page.evaluate(() => { try { navigateTo('breakdown'); } catch (e) { console.log('nav err', e.message); } }).catch(() => {});
console.log('time, ovShow, bdActive, rows, current, divOpts, secOpts, deptOpts');
for (let i = 0; i < 20; i++) {
  const s = await snap();
  console.log('T+' + (i * 3) + 's', JSON.stringify(s));
  if (s.ovShow === false && s.rows > 0) break;
  if (s.current === 'dashboard' && i > 2) { console.log('>>> NAVIGATED BACK TO DASHBOARD <<<'); break; }
  await sleep(3000);
}
console.log('\nlogs:');
logs.forEach(l => console.log(l));
await browser.close();
