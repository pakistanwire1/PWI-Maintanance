import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- backend API map ----
const loginRes = await fetch(BASE + '/api/exec', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'login', data: { email: EMAIL, password: PASSWORD } })
});
const loginJson = await loginRes.json();
const token = loginJson.data && loginJson.data.token;
const jcRes = await fetch(BASE + '/api/exec', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'getJobCards', token, data: {} })
});
const jcJson = await jcRes.json();
const payload = jcJson.data || jcJson.body || jcJson;
const records = (payload && (payload.records || payload.data)) || (Array.isArray(payload) ? payload : []);
const apiMap = {};
let apiMissing = 0;
records.forEach(r => {
  if (!r.MachineNumber || !r.JobCardNo) apiMissing++;
  apiMap[r.JobCardNo] = { machine: (r.Machine || '').trim(), num: (r.MachineNumber || '').trim() };
});
check('api_integrity', records.length === 69 && apiMissing === 0,
  'API getJobCards total=' + records.length + ' missing MachineNumber=' + apiMissing);
console.log('api sample: ' + JSON.stringify(apiMap['JC-2026-000001']));

// ---- helpers ----
async function extractRows(tableSel) {
  return page.evaluate((sel) => {
    const t = document.querySelector(sel);
    if (!t) return { ths: [], rows: [] };
    const ths = Array.from(t.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const jci = ths.indexOf('Job Card No'), mi = ths.indexOf('Machine'), mni = ths.indexOf('Machine No');
    const rows = [];
    Array.from(t.querySelectorAll('tbody tr')).forEach(tr => {
      const tds = Array.from(tr.querySelectorAll('td'));
      rows.push({
        jcNo: jci >= 0 && tds[jci] ? tds[jci].textContent.trim() : '',
        machine: mi >= 0 && tds[mi] ? tds[mi].textContent.trim() : '',
        num: mni >= 0 && tds[mni] ? tds[mni].textContent.trim() : ''
      });
    });
    return { ths, rows };
  }, tableSel);
}

// ---- CF browser ----
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1500);
await page.evaluate(() => { try { Router.navigate('jobcards'); } catch (e) {} });
for (let i = 0; i < 30; i++) {
  await sleep(2000);
  const r = await page.evaluate(() => !!document.querySelector('#jcTableContainer table')).catch(() => false);
  if (r) break;
}
await page.evaluate(() => { const b = document.querySelector('#allJcTabs .workflow-tab[data-tab="all"]'); if (b) b.click(); });
for (let i = 0; i < 15; i++) {
  await sleep(1500);
  const n = await page.evaluate(() => document.querySelectorAll('#jcTableContainer table tbody tr').length);
  if (n > 0) break;
}
const cf = await extractRows('#jcTableContainer table');
let cfMismatch = 0, cfChecked = 0;
cf.rows.forEach(r => {
  if (!r.jcNo) return;
  cfChecked++;
  const api = apiMap[r.jcNo];
  if (!api || api.machine !== r.machine || api.num !== r.num) cfMismatch++;
});
check('parity_cf_headers', cf.ths.includes('Machine') && cf.ths.includes('Machine No'), 'CF All-tab headers OK: ' + JSON.stringify(cf.ths));
check('parity_cf_vs_api', cfChecked > 0 && cfMismatch === 0, 'CF rows vs API: checked=' + cfChecked + ' mismatches=' + cfMismatch);

// ---- GAS legacy ----
const page2 = await browser.newPage();
await page2.setViewport({ width: 1440, height: 900 });
const g0 = Date.now();
await page2.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickFrame(p) {
  for (const f of p.frames()) {
    if (f === p.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickFrame(page2);
while (!app && Date.now() - g0 < 120000) { await sleep(2000); app = await pickFrame(page2); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - g0 < 240000) await sleep(2000);
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, EMAIL, PASSWORD);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - g0 < 180000) await sleep(1500);
await sleep(1500);
await app.evaluate(() => { try { navigateTo('jobcards'); } catch (e) {} });
for (let i = 0; i < 40; i++) {
  await sleep(1500);
  const r = await app.evaluate(() => !!document.querySelector('#jcTableContainer table')).catch(() => false);
  if (r) break;
}
await app.evaluate(() => { try { switchJcTab('all'); } catch (e) {} });
for (let i = 0; i < 15; i++) {
  await sleep(1500);
  const n = await app.evaluate(() => document.querySelectorAll('#jcTableContainer tbody tr').length).catch(() => 0);
  if (n > 0) break;
}
const gas = await app.evaluate(() => {
  const t = document.querySelector('#jcTableContainer table');
  if (!t) return { ths: [], rows: [] };
  const ths = Array.from(t.querySelectorAll('thead th')).map(th => th.textContent.trim());
  const jci = ths.indexOf('Job Card No'), mi = ths.indexOf('Machine'), mni = ths.indexOf('Machine No');
  const rows = [];
  Array.from(t.querySelectorAll('tbody tr')).forEach(tr => {
    const tds = Array.from(tr.querySelectorAll('td'));
    rows.push({
      jcNo: jci >= 0 && tds[jci] ? tds[jci].textContent.trim() : '',
      machine: mi >= 0 && tds[mi] ? tds[mi].textContent.trim() : '',
      num: mni >= 0 && tds[mni] ? tds[mni].textContent.trim() : ''
    });
  });
  return { ths, rows };
});
let gasMismatch = 0, gasChecked = 0;
gas.rows.forEach(r => {
  if (!r.jcNo) return;
  gasChecked++;
  const api = apiMap[r.jcNo];
  if (!api || api.machine !== r.machine || api.num !== r.num) gasMismatch++;
});
check('parity_gas_headers', gas.ths.includes('Machine') && gas.ths.includes('Machine No'), 'GAS All-tab headers OK: ' + JSON.stringify(gas.ths));
check('parity_gas_vs_api', gasChecked > 0 && gasMismatch === 0, 'GAS rows vs API: checked=' + gasChecked + ' mismatches=' + gasMismatch);

// ---- CF vs GAS cross ----
const cfMap = {}, gasMap = {};
cf.rows.forEach(r => { if (r.jcNo) cfMap[r.jcNo] = r.num; });
gas.rows.forEach(r => { if (r.jcNo) gasMap[r.jcNo] = r.num; });
let crossMismatch = 0, crossChecked = 0;
Object.keys(cfMap).forEach(k => {
  if (k in gasMap) {
    crossChecked++;
    if (cfMap[k] !== gasMap[k]) crossMismatch++;
  }
});
check('parity_cf_vs_gas', crossChecked > 0 && crossMismatch === 0, 'CF vs GAS same JobCardNo->MachineNumber: compared=' + crossChecked + ' mismatches=' + crossMismatch);

await browser.close();
console.log('\n==== SUMMARY ====');
console.log('PASS=' + results.filter(r => r.ok).length + ' FAIL=' + results.filter(r => !r.ok).length);
if (failures.length) console.log('FAILED: ' + failures.join(', '));
process.exit(failures.length ? 1 : 0);
