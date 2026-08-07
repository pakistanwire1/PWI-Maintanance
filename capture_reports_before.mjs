import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CF = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'verify_shots', 'reports_before');
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,1000'] });

const shot = async (page, frame, name) => {
  const f = frame || page;
  await f.evaluate(() => { const el = document.getElementById('reportsPage') || document.body; el.scrollIntoView({ block: 'start' }); }).catch(() => {});
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log('screenshot: ' + name);
};

// ---------- GAS BEFORE ----------
console.log('\n===== GAS BEFORE (live, unmodified) =====');
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1500, height: 1000 });
const gasErr = [];
gasPage.on('pageerror', e => gasErr.push(e.message.slice(0, 200)));
await gasPage.goto(GAS, { waitUntil: 'networkidle2', timeout: 240000 });
async function findGasFrame() {
  for (const f of gasPage.frames()) {
    if (f === gasPage.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null; let t0 = Date.now();
while (Date.now() - t0 < 180000) {
  gasFrame = await findGasFrame();
  if (gasFrame) {
    const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
    if (hasForm) break;
  }
  await sleep(3000);
}
await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => { const ac = document.getElementById('appContainer'); return ac && ac.style.display !== 'none'; }, { timeout: 240000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('reports'));
await gasFrame.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 240000 });
await sleep(1500);

const gasDd = () => gasFrame.evaluate(() => ({
  maintTypes: Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v),
  divisions: Array.from(document.getElementById('rptDivision').options).map(o => o.value).filter(v => v)
}));
console.log('GAS deployed maintType dropdown: ' + JSON.stringify((await gasDd()).maintTypes));

const gasGen = async (setFn, arg, waitMs) => {
  await gasFrame.evaluate(setFn, arg); await sleep(150);
  await gasFrame.evaluate(() => generateReport());
  await sleep(waitMs || 3500);
  const r = await gasFrame.evaluate(() => ({
    rows: document.querySelectorAll('#rptTableBody tr').length,
    recordCount: (document.getElementById('rptRecordCount') || {}).textContent || '',
    toast: (document.querySelector('#toast-container, .toast, [id*=toast]') || {}).textContent || ''
  }));
  console.log('GAS ' + (waitMs === 0 ? 'state' : 'report') + ': ' + JSON.stringify(r));
  return r;
};

await gasFrame.evaluate(() => { document.getElementById('rptType').value = 'machine_history'; });
await gasGen(() => {}, null, 5000);
await shot(gasPage, gasFrame, 'gas_before_baseline.png');

await gasGen(() => { document.getElementById('rptDivision').value = 'DIV001'; }, null, 5000);
await shot(gasPage, gasFrame, 'gas_before_division_id.png');

await gasGen(() => {
  document.getElementById('rptDivision').value = '';
  document.getElementById('rptType').value = 'breakdown_history';
}, null, 5000);
await shot(gasPage, gasFrame, 'gas_before_breakdown_history.png');

const gasDrop = await gasFrame.evaluate(() => Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v));
await gasGen((v) => { document.getElementById('rptMaintType').value = v; }, gasDrop[1] || 'Breakdown', 5000);
console.log('GAS deployed maintType 2nd option tried: ' + (gasDrop[1] || '') + ' (expect filter ignored -> 65)');
await shot(gasPage, gasFrame, 'gas_before_mainttype.png');

// ---------- CF BEFORE ----------
console.log('\n===== CF BEFORE (live, unmodified) =====');
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1500, height: 1000 });
const cfErr = [];
cfPage.on('pageerror', e => cfErr.push(e.message.slice(0, 200)));
await cfPage.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cfPage.waitForFunction(() => { try { return typeof window.navigateTo === 'function'; } catch (e) { return false; } }, { timeout: 60000 });
await cfPage.evaluate(() => navigateTo('reports'));
await cfPage.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 60000 });
await sleep(1500);

const cfDd = () => cfPage.evaluate(() => ({
  maintTypes: Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v)
}));
console.log('CF deployed maintType dropdown: ' + JSON.stringify((await cfDd()).maintTypes));

const cfGen = async (setFn, arg, waitMs) => {
  await cfPage.evaluate(setFn, arg); await sleep(150);
  await cfPage.evaluate(() => { if (window.Reports) Reports.generateReport(); });
  await sleep(waitMs || 3500);
  const r = await cfPage.evaluate(() => ({
    rows: document.querySelectorAll('#rptTableBody tr').length,
    recordCount: (document.getElementById('rptRecordCount') || {}).textContent || '',
    toast: (document.querySelector('#toast-container, .toast, [id*=toast]') || {}).textContent || ''
  }));
  console.log('CF report: ' + JSON.stringify(r));
  return r;
};

await cfPage.evaluate(() => { document.getElementById('rptType').value = 'machine_history'; });
await cfGen(() => {}, null, 5000);
await shot(cfPage, null, 'cf_before_baseline.png');

const cfDrop = await cfPage.evaluate(() => Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v));
await cfGen((v) => { document.getElementById('rptMaintType').value = v; }, cfDrop[1] || 'Breakdown', 5000);
await shot(cfPage, null, 'cf_before_mainttype.png');

await cfGen(() => {
  document.getElementById('rptMaintType').value = '';
  document.getElementById('rptType').value = 'breakdown_history';
}, null, 5000);
await shot(cfPage, null, 'cf_before_breakdown_history.png');

fs.writeFileSync(path.join(OUT, 'before_evidence.json'), JSON.stringify({ gasErrors: gasErr, cfErrors: cfErr }, null, 2));
await browser.close();
console.log('DONE');
