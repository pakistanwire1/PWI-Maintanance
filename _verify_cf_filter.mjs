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
page.on('console', m => { if (m.type() === 'error') logs.push('[c] ' + m.text().slice(0, 250)); });
page.on('pageerror', e => logs.push('[pe] ' + String(e.message).slice(0, 250)));

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
if (!loggedIn) { console.log('LOGIN FAILED'); await browser.close(); process.exit(1); }
await sleep(3000);

// navigate to breakdown and wait for load
await page.evaluate(() => { try { navigateTo('breakdown'); } catch (e) {} }).catch(() => {});
let loaded = false;
for (let i = 0; i < 30 && !loaded; i++) {
  loaded = await page.evaluate(() => {
    const el = document.getElementById('bdDivision');
    return !!el && el.options.length >= 3;
  }).catch(() => false);
  await sleep(1500);
}
console.log('breakdown loaded with division options:', loaded);

const base = await page.evaluate(() => ({
  total: document.getElementById('bdTotalCount').textContent,
  downtime: document.getElementById('bdTotalDowntime').textContent,
  firstRow: (document.querySelector('#breakdownTableContainer tbody tr td') || {}).textContent
}));
console.log('unfiltered:', JSON.stringify(base));

// filter: Division = Spoke Division (DIV001)
await page.evaluate(() => {
  const sel = document.getElementById('bdDivision');
  sel.value = 'DIV001';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(2000);
const divFilter = await page.evaluate(() => ({
  total: document.getElementById('bdTotalCount').textContent,
  rows: document.querySelectorAll('#breakdownTableContainer tbody tr').length,
  divCols: Array.from(document.querySelectorAll('#breakdownTableContainer tbody tr td:nth-child(3)')).map(td => td.textContent)
}));
console.log('Spoke Division filter:', JSON.stringify(divFilter));

// filter: Section = Spoke (after division) then department
await page.evaluate(() => {
  const sel = document.getElementById('bdSection');
  sel.value = 'SEC002';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(2000);
const secFilter = await page.evaluate(() => ({
  total: document.getElementById('bdTotalCount').textContent,
  rows: document.querySelectorAll('#breakdownTableContainer tbody tr').length,
  secCols: Array.from(document.querySelectorAll('#breakdownTableContainer tbody tr td:nth-child(4)')).slice(0, 5)
}));
console.log('Division+Section filter:', JSON.stringify(secFilter));

console.log('errors:', logs.slice(0, 5));
await browser.close();
