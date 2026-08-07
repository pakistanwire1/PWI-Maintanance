import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT = path.join(__dirname, 'verify_shots');
fs.mkdirSync(SHOT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(GAS, { waitUntil: 'networkidle2', timeout: 240000 });

async function findGasFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null;
const t0 = Date.now();
while (Date.now() - t0 < 180000) {
  gasFrame = await findGasFrame();
  if (gasFrame) {
    const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
    if (hasForm) break;
  }
  await sleep(3000);
}
if (!gasFrame) { console.log('FATAL: no GAS frame'); process.exit(2); }

await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 240000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('reports'));
await gasFrame.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 240000 });
await sleep(2000);

console.log('=== GAS REPORTS PAGE STATE ===');
const state = await gasFrame.evaluate(() => {
  const dd = id => { const el = document.getElementById(id); return el ? Array.from(el.options).map(o => o.value + '|' + o.textContent) : null; };
  return {
    rptType: dd('rptType'),
    rptDivision: dd('rptDivision'),
    rptSection: dd('rptSection'),
    rptDepartment: dd('rptDepartment'),
    rptMachineNumber: dd('rptMachineNumber'),
    rptMaintType: dd('rptMaintType'),
    rptPriority: dd('rptPriority'),
    rptStatus: dd('rptStatus'),
    rptTechnician: dd('rptTechnician'),
    fromDate: document.getElementById('rptFromDate') ? document.getElementById('rptFromDate').value : null,
    toDate: document.getElementById('rptToDate') ? document.getElementById('rptToDate').value : null
  };
});
console.log('type options:', JSON.stringify(state.rptType));
console.log('division options:', JSON.stringify(state.rptDivision));
console.log('section options:', JSON.stringify(state.rptSection));
console.log('department options:', JSON.stringify(state.rptDepartment));
console.log('machine options (first 8):', JSON.stringify((state.rptMachineNumber || []).slice(0, 8)));
console.log('maintType options:', JSON.stringify(state.rptMaintType));
console.log('priority options:', JSON.stringify(state.rptPriority));
console.log('status options:', JSON.stringify(state.rptStatus));
console.log('dates:', state.fromDate, '->', state.toDate);

// ---- generate baseline report ----
const gen = async (label) => {
  await gasFrame.evaluate(() => generateReport());
  await sleep(5000);
  const r = await gasFrame.evaluate(() => ({
    rows: document.querySelectorAll('#rptTableBody tr').length,
    recordCount: (document.getElementById('rptRecordCount') || {}).textContent || '',
    tableCard: document.getElementById('rptTableCard').style.display,
    kpiCard: document.getElementById('rptKpiCards').style.display
  }));
  console.log('report(' + label + '):', JSON.stringify(r));
  return r;
};
await gasFrame.evaluate(() => { document.getElementById('rptType').value = 'machine_history'; });
const base = await gen('machine_history baseline');
console.log('\nbaseline report:', JSON.stringify(base));

// ---- pagination check (Issue #1) ----
const pagination = await gasFrame.evaluate(() => {
  const page = document.getElementById('reportsPage');
  const html = page.innerHTML;
  const tbl = document.getElementById('rptTableCard');
  return {
    hasPagination: !!page.querySelector('.pagination'),
    paginationText: page.querySelector('.pagination') ? page.querySelector('.pagination').textContent.trim().slice(0, 200) : '',
    hasPrevText: /Previous/.test(html),
    changePageCalls: (html.match(/changePage\(/g) || []).length,
    matches: (html.match(/<button[^>]*>[^<]*\d[^<]*<\/button>/g) || []).slice(0, 15),
    tableCardHtmlLen: tbl ? tbl.innerHTML.length : 0,
    tableCardHtmlTail: tbl ? tbl.innerHTML.slice(-600) : ''
  };
});
console.log('\n=== PAGINATION CHECK ===');
console.log(JSON.stringify(pagination, null, 1));

await gasFrame.evaluate(() => {
  const el = document.getElementById('reportsPage');
  el.scrollIntoView();
});
await sleep(500);
const baseShot = path.join(SHOT, 'gas_reports_before.png');
await gasFrame.$eval('#reportsPage', el => el.scrollIntoView());
await page.screenshot({ path: baseShot, fullPage: false });

console.log('\n=== FILTER TESTS ON GAS UI ===');
const setSel = (id, value) => gasFrame.evaluate(({ id, value }) => {
  const el = document.getElementById(id);
  el.value = value;
  el.dispatchEvent(new Event('change'));
}, { id, value });

const runFilter = async (label, fn) => {
  await fn();
  await sleep(3500);
  const r = await gasFrame.evaluate(() => ({
    rows: document.querySelectorAll('#rptTableBody tr').length,
    count: (document.getElementById('rptRecordCount') || {}).textContent || ''
  }));
  const vals = await gasFrame.evaluate(() => ({
    div: document.getElementById('rptDivision').value,
    sec: document.getElementById('rptSection').value,
    dep: document.getElementById('rptDepartment').value
  }));
  console.log(label.padEnd(30) + ' rows=' + r.rows + ' count=' + r.count + ' | selected div/sec/dept=' + JSON.stringify(vals));
};

// division
await runFilter('division DIV001', async () => { await setSel('rptDivision', 'DIV001'); await sleep(1500); });
// section (whatever loaded under DIV001, pick 2nd)
await runFilter('+ section (2nd opt)', async () => {
  const v = await gasFrame.evaluate(() => { const el = document.getElementById('rptSection'); const a = Array.from(el.options).map(o => o.value).filter(v => v); return a.length >= 2 ? a[1] : (a[0] || ''); });
  if (v) await setSel('rptSection', v);
});
// department (2nd opt)
await runFilter('+ department (2nd opt)', async () => {
  const v = await gasFrame.evaluate(() => { const el = document.getElementById('rptDepartment'); const a = Array.from(el.options).map(o => o.value).filter(v => v); return a.length >= 2 ? a[1] : (a[0] || ''); });
  if (v) await setSel('rptDepartment', v);
});
// machine number (2nd opt)
await runFilter('+ machine (2nd opt)', async () => {
  const v = await gasFrame.evaluate(() => { const el = document.getElementById('rptMachineNumber'); const a = Array.from(el.options).map(o => o.value).filter(v => v); return a.length >= 2 ? a[1] : (a[0] || ''); });
  if (v) await setSel('rptMachineNumber', v);
});

// technician ARIF
await runFilter('technician ARIF', async () => { await setSel('rptTechnician', 'ARIF'); });
// priority High
await runFilter('priority High', async () => { await setSel('rptPriority', 'High'); });
// status RUNNING
await runFilter('status RUNNING', async () => { await setSel('rptStatus', 'RUNNING'); });
// maintenanceType 2nd option
await runFilter('maintType 2nd opt', async () => {
  const v = await gasFrame.evaluate(() => { const el = document.getElementById('rptMaintType'); const a = Array.from(el.options).map(o => o.value).filter(v => v && v !== 'All'); return a[1] || (a[0] || ''); });
  if (v) await setSel('rptMaintType', v);
});

console.log('\nconsole errors:', JSON.stringify(consoleErrors.slice(0, 8)));
console.log('page errors:', JSON.stringify(pageErrors.filter(e => !e.includes('gstatic')).slice(0, 8)));

fs.writeFileSync(path.join(SHOT, 'gas_reports_state.json'), JSON.stringify({ state, base, pagination }, null, 2));
await browser.close();
console.log('DONE');
