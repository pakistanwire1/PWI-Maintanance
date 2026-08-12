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

// navigate to inventory
await page.evaluate(() => { try { navigateTo('inventory'); } catch (e) {} }).catch(() => {});
let invLoaded = false;
for (let i = 0; i < 30 && !invLoaded; i++) {
  invLoaded = await page.evaluate(() => !!document.getElementById('invTableContainer') && !!document.getElementById('invCardActions')).catch(() => false);
  await sleep(1500);
}
console.log('inventory page rendered:', invLoaded);

const summary = await page.evaluate(() => ({
  stockValue: document.getElementById('invTotalStockValue').textContent,
  lowStock: document.getElementById('invLowStockCount').textContent,
  outOfStock: document.getElementById('invOutOfStockCount').textContent,
  totalTxns: document.getElementById('invTotalTransactions').textContent,
  rows: document.querySelectorAll('#invTableContainer tbody tr').length
})).catch(e => ({ err: String(e.message) }));
console.log('inventory summary:', JSON.stringify(summary));

// Switch to GRN tab and click New GRN
await page.evaluate(() => { Inventory.switchInvTab('grn', document.querySelector('#inventoryPage .workflow-tab[data-tab="grn"]')); }).catch(e => console.log('switchInvTab err', String(e.message)));
await sleep(4000);
const grnTab = await page.evaluate(() => ({
  title: document.getElementById('invCardTitle').textContent,
  actionsHtml: document.getElementById('invCardActions').innerHTML.slice(0, 300),
  rows: document.querySelectorAll('#invTableContainer tbody tr').length
})).catch(e => ({ err: String(e.message) }));
console.log('GRN tab:', JSON.stringify(grnTab));

const grnErr = await page.evaluate(() => {
  try { Inventory.openGRNForm(); return 'ok'; } catch (e) { return String(e.message); }
}).catch(e => 'eval failed: ' + String(e.message));
await sleep(2500);
const grnModal = await page.evaluate(() => {
  const m = document.getElementById('grnModal');
  const partSel = document.getElementById('grnPartCode');
  return { visible: !!m && getComputedStyle(m).display !== 'none', partOpts: partSel ? partSel.options.length : -1, grnNo: document.getElementById('grnNo').value, receivedDate: document.getElementById('grnReceivedDate').value };
}).catch(e => ({ err: String(e.message) }));
console.log('openGRNForm result:', grnErr, JSON.stringify(grnModal));

// check other tabs' open functions
for (const t of [['issue', 'openIssueForm', 'issueModal', 'issuePartCode'], ['return', 'openReturnForm', 'returnModal', 'returnPartCode'], ['transfer', 'openTransferForm', 'transferModal', 'transferPartCode'], ['adjustment', 'openAdjustmentForm', 'adjustmentModal', 'adjustmentPartCode']]) {
  const [tab, fn, modalId, partSelId] = t;
  await page.evaluate(() => { Inventory.switchInvTab('' + tab, document.querySelector('#inventoryPage .workflow-tab[data-tab="' + tab + '"]')); }).catch(() => {});
  await sleep(2500);
  const r = await page.evaluate((fn, modalId, partSelId) => {
    try { window['Inventory'][fn](); } catch (e) { return { openErr: String(e.message) }; }
    return { opened: true };
  }, fn, modalId, partSelId).catch(e => ({ evalErr: String(e.message) }));
  await sleep(2000);
  const st = await page.evaluate((modalId, partSelId) => {
    const m = document.getElementById(modalId);
    const s = document.getElementById(partSelId);
    return { visible: !!m && getComputedStyle(m).display !== 'none', partOpts: s ? s.options.length : -1 };
  }, modalId, partSelId).catch(e => ({ err: String(e.message) }));
  console.log(tab + ': open=' + JSON.stringify(r) + ' modal=' + JSON.stringify(st));
}

console.log('errors:', logs.slice(0, 8));
await browser.close();
