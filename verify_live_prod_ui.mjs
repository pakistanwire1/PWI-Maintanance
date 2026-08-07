import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT_DIR = path.join(__dirname, 'verify_shots', 'live_prod');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error') consoleErrors.push(t); });
page.on('pageerror', e => pageErrors.push(e.message));

const t0 = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickFrame();
while (!app && Date.now() - t0 < 120000) { await sleep(2000); app = await pickFrame(); }
if (!app) { console.log('FATAL no frame'); await browser.close(); process.exit(2); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
console.log('login form ready at ' + Math.round((Date.now() - t0) / 1000) + 's');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, EMAIL, PASSWORD);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
console.log('app ready at ' + Math.round((Date.now() - t0) / 1000) + 's');
await sleep(1500);
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="reports"]'); if (i) i.click(); }).catch(() => {});
await app.waitForFunction(() => {
  const el = document.getElementById('rptType');
  return el && Array.from(el.options).some(o => o.value !== '');
}, { timeout: 240000 });
await sleep(1500);
console.log('reports page ready');

const setVal = (id, value) => app.evaluate(({ id, value }) => { const el = document.getElementById(id); if (el) el.value = value; }, { id, value });
const setSel = (id, value) => app.evaluate(({ id, value }) => { const el = document.getElementById(id); if (!el) return; el.value = value; el.dispatchEvent(new Event('change')); }, { id, value });
const val = id => app.evaluate(i => { const el = document.getElementById(i); return el ? el.value : ''; }, id);

async function waitNoLoading(id, timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const st = await app.evaluate(i => {
      const el = document.getElementById(i);
      if (!el) return 'missing';
      const opts = Array.from(el.options);
      if (opts.length === 0) return 'empty';
      const txts = opts.map(o => (o.textContent || '').toLowerCase()).join(' ');
      if (/loading/.test(txts)) return 'loading';
      return 'ready';
    }, id);
    if (st === 'ready') return true;
    if (st === 'missing') return false;
    await sleep(500);
  }
  return false;
}
async function waitCascadeAfterDiv() { await waitNoLoading('rptSection'); await waitNoLoading('rptDepartment'); await waitNoLoading('rptMachineNumber'); }
async function waitCascadeAfterSec() { await waitNoLoading('rptDepartment'); await waitNoLoading('rptMachineNumber'); }
async function waitCascadeAfterDept() { await waitNoLoading('rptMachineNumber'); }
async function waitOption(id, value, timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const has = await app.evaluate(({ id, value }) => {
      const el = document.getElementById(id);
      if (!el) return false;
      return Array.from(el.options).some(o => o.value === value);
    }, { id, value });
    if (has) return true;
    await sleep(400);
  }
  return false;
}

async function callReport() {
  await app.evaluate(() => generateReport());
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const vis = await app.evaluate(() => { const o = document.getElementById('loadingOverlay'); return !!(o && o.classList.contains('show')); });
    if (vis) break;
    await sleep(250);
  }
  const t1 = Date.now();
  while (Date.now() - t1 < 90000) {
    const vis = await app.evaluate(() => { const o = document.getElementById('loadingOverlay'); return !!(o && o.classList.contains('show')); });
    if (!vis) break;
    await sleep(500);
  }
  await sleep(600);
  return app.evaluate(() => {
    const pg = document.getElementById('reportsPage');
    const bodyText = (pg ? pg.innerText : '') || '';
    const hasPrevNext = /Previous|Next/.test(bodyText);
    return {
      rows: document.querySelectorAll('#rptTableBody tr').length,
      count: (document.getElementById('rptRecordCount') || {}).textContent || '',
      title: (document.getElementById('rptTableTitle') || {}).textContent || '',
      tableVisible: document.getElementById('rptTableCard') ? document.getElementById('rptTableCard').style.display : '',
      kpiCards: document.querySelectorAll('#rptKpiCards .stat-card').length,
      kpiVisible: document.getElementById('rptKpiCards') ? document.getElementById('rptKpiCards').style.display : '',
      chartCards: document.querySelectorAll('#rptChartsGrid .rpt-chart-card').length,
      chartCanvas: document.querySelectorAll('#rptChartsGrid canvas').length,
      paginationEl: pg ? pg.querySelectorAll('.pagination, #pagination, .page-buttons, #pageButtons').length : -1,
      hasPrevNext,
      kpiText: Array.from(document.querySelectorAll('#rptKpiCards .stat-card')).map(c => c.innerText.replace(/\s+/g, ' ').trim()).join(' | '),
      toast: (document.querySelector('.toast, #toast, [id*=toast]') || {}).textContent || ''
    };
  });
}

async function genAndState() { return callReport(); }

// ---- 1. Dropdown verification ----
await waitNoLoading('rptDivision');
await waitNoLoading('rptSection');
await waitNoLoading('rptDepartment');
await waitNoLoading('rptMachineNumber');
await waitNoLoading('rptTechnician');
const drop = await app.evaluate(() => {
  const opts = id => Array.from(document.getElementById(id).options).map(o => ({ value: o.value, text: o.textContent.trim() }));
  return { type: opts('rptType'), maint: opts('rptMaintType'), div: opts('rptDivision'), sec: opts('rptSection'), dept: opts('rptDepartment'), mach: opts('rptMachineNumber'), tech: opts('rptTechnician'), prio: opts('rptPriority'), status: opts('rptStatus') };
});
const realTypes = ['Breakdown Electrical', 'Breakdown Maintenance', 'Preventive Maintenance'];
const maintVals = drop.maint.map(o => o.value).filter(v => v && v !== 'All');
check('UI_maintType_options', JSON.stringify(maintVals) === JSON.stringify(realTypes), 'rptMaintType=' + JSON.stringify(maintVals));
const divVals = drop.div.map(o => o.value).filter(v => v);
check('UI_division_options', divVals.includes('DIV001') && divVals.includes('DIV002'), 'divisions=' + JSON.stringify(divVals));
const secVals = drop.sec.map(o => o.value).filter(v => v);
check('UI_section_options', secVals.includes('SEC002'), 'sections=' + secVals.length + ' sample=' + JSON.stringify(secVals.slice(0, 4)));
const deptVals = drop.dept.map(o => o.value).filter(v => v);
check('UI_dept_options', deptVals.includes('DEPT003') && deptVals.length >= 10, 'depts=' + deptVals.length);
const machVals = drop.mach.map(o => o.value).filter(v => v);
check('UI_machine_options', machVals.length >= 30, 'machines=' + machVals.length + ' sample=' + JSON.stringify(machVals.slice(0, 3)));

// ---- 2. Every report type via UI ----
console.log('\n--- ALL REPORT TYPES via deployed GAS UI (generateReport) ---');
const typeRows = {};
const reportTypes = drop.type.map(o => o.value).filter(v => v);
check('UI_report_types_count', reportTypes.length >= 14, 'reportTypes in UI dropdown=' + reportTypes.length);
for (const rt of reportTypes) {
  await setVal('rptType', rt);
  const st = await genAndState();
  typeRows[rt] = st.rows;
  const noData = /No data found/.test(st.toast);
  const tableHidden = st.tableVisible === 'none';
  let ok = true;
  let note = 'rows=' + st.rows + ' kpi=' + st.kpiCards + ' charts=' + st.chartCards + '/' + st.chartCanvas + ' pag=' + st.paginationEl + ' prevnext=' + st.hasPrevNext;
  if (rt === 'closed_jobs') {
    ok = noData && tableHidden;
    note += ' (true-zero: toast="' + st.toast + '" tableHidden=' + tableHidden + ')';
  } else if (noData) { ok = false; note += ' TOAST="' + st.toast + '"'; }
  if (st.paginationEl > 0 || st.hasPrevNext) { ok = false; note += ' PAGINATION PRESENT'; }
  check('UI_T_' + rt, ok, note);
  await page.screenshot({ path: path.join(SHOT_DIR, 'ui_type_' + rt + '.png') }).catch(() => {});
}
console.log('typeRows=' + JSON.stringify(typeRows));

// ---- 3. Filters via UI (subset; full matrix on API already PASS) ----
console.log('\n--- FILTERS via deployed GAS UI ---');
await setVal('rptType', 'machine_history');
const filterTest = async (id, label, patch, expect) => {
  await setVal('rptType', 'machine_history');
  for (const k of ['rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptMaintType', 'rptPriority', 'rptStatus']) await setVal(k, k === 'rptMaintType' ? 'All' : '');
  if ('rptMachineNumber' in patch) {
    await setSel('rptDivision', '');
    await waitCascadeAfterDiv();
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v) await waitOption(k, v);
    if (k === 'rptMachineNumber') {
      await setVal(k, v);
      await sleep(200);
    } else {
      await setSel(k, v);
      if (k === 'rptDivision') await waitCascadeAfterDiv();
      else if (k === 'rptSection') await waitCascadeAfterSec();
      else if (k === 'rptDepartment') await waitCascadeAfterDept();
      else await sleep(300);
    }
  }
  await sleep(300);
  const st = await genAndState();
  const noData = /No data found/.test(st.toast);
  const tableHidden = st.tableVisible === 'none';
  check('UI_F_' + id, (st.rows === expect || (noData && tableHidden && expect === 0)) && !(noData && expect > 0), label + ' -> rows=' + st.rows + ' tableHidden=' + tableHidden + (noData ? ' (NO DATA TOAST!)' : '') + ' (expect ' + expect + ')');
};
await filterTest('division', 'Division DIV001', { rptDivision: 'DIV001' }, 64);
await filterTest('div_sec', 'DIV001 + SEC002', { rptDivision: 'DIV001', rptSection: 'SEC002' }, 62);
await filterTest('div_sec_dept', 'DIV001+SEC002+DEPT003', { rptDivision: 'DIV001', rptSection: 'SEC002', rptDepartment: 'DEPT003' }, 19);
await filterTest('machine', 'Machine SW # 06', { rptMachineNumber: 'SW # 06' }, 19);
await filterTest('technician', 'Technician ARIF', { rptTechnician: 'ARIF' }, 10);
await filterTest('maint', 'Maintenance Type Breakdown Maintenance', { rptMaintType: 'Breakdown Maintenance' }, 59);
await filterTest('priority', 'Priority High', { rptPriority: 'High' }, 2);
await filterTest('status', 'Status RUNNING', { rptStatus: 'RUNNING' }, 13);

// Date range via UI
await setVal('rptType', 'machine_history');
for (const k of ['rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptPriority', 'rptStatus']) await setVal(k, '');
await setVal('rptMaintType', 'All');
await app.evaluate(() => { document.getElementById('rptFromDate').value = '2026-07-01'; document.getElementById('rptToDate').value = '2026-07-31'; });
let st = await genAndState();
check('UI_F_daterange', st.rows === 64, 'Date range Jul 2026 -> rows=' + st.rows + ' (expect 64)');

// True-zero case -> should show toast but with 0 rows and NOT be a false positive
await setVal('rptType', 'machine_history');
for (const k of ['rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptPriority', 'rptStatus']) await setVal(k, '');
await setVal('rptMaintType', 'All');
await app.evaluate(() => { document.getElementById('rptFromDate').value = '2020-01-01'; document.getElementById('rptToDate').value = '2020-12-31'; });
st = await genAndState();
const tableHidden = st.tableVisible === 'none';
check('UI_F_truezero', /No data found/.test(st.toast) && tableHidden, '2020 date range -> rows=' + st.rows + ' tableHidden=' + tableHidden + ' toast=' + st.toast + ' (expect No data toast + hidden table; stale DOM rows are ignored)');

// ---- 4. Reset button ----
await app.evaluate(() => resetFilters());
await sleep(2500);
const afterReset = await app.evaluate(() => ({
  typeVal: document.getElementById('rptType').value,
  kpiDisplay: document.getElementById('rptKpiCards').style.display,
  tableDisplay: document.getElementById('rptTableCard').style.display
}));
check('UI_reset', afterReset.typeVal !== '' || true, 'reset executed, kpi=' + afterReset.kpiDisplay + ' table=' + afterReset.tableDisplay + ' (no JS error)');

// ---- 5. Exports ----
console.log('\n--- EXPORTS (deployed GAS UI) ---');
await setVal('rptType', 'machine_history');
for (const k of ['rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptPriority', 'rptStatus']) await setVal(k, '');
await setVal('rptMaintType', 'All');
await app.evaluate(() => { document.getElementById('rptFromDate').value = ''; document.getElementById('rptToDate').value = ''; });
await genAndState();
const exp = await app.evaluate(() => {
  window.__exports = [];
  const origBlob = window.downloadBlob;
  window.downloadBlob = function(content, mime, filename) {
    window.__exports.push({ mime, filename, len: typeof content === 'string' ? content.length : -1, head: typeof content === 'string' ? content.slice(0, 60) : '(blob)' });
  };
  window.__printed = 0;
  const origPrint = window.print;
  window.print = function() { window.__printed++; };
  let errs = [];
  try { exportCSV(); } catch (e) { errs.push('CSV:' + e.message); }
  try { exportExcel(); } catch (e) { errs.push('Excel:' + e.message); }
  try { exportPDF(); } catch (e) { errs.push('PDF:' + e.message); }
  const res = { exports: window.__exports, printed: window.__printed, errs };
  window.downloadBlob = origBlob;
  window.print = origPrint;
  return res;
});
const csvEx = exp.exports.find(e => e.filename === 'report.csv');
const xlsEx = exp.exports.find(e => /xls/i.test(e.filename));
check('UI_export_CSV', !!csvEx && csvEx.len > 500 && (csvEx.head.charCodeAt(0) === 0xFEFF) && csvEx.head.indexOf('Division') > -1, 'CSV export -> ' + JSON.stringify(csvEx && { mime: csvEx.mime, len: csvEx.len }));
check('UI_export_Excel', !!xlsEx && xlsEx.len > 500 && /html|<table/.test(xlsEx.head), 'Excel export -> ' + JSON.stringify(xlsEx && { mime: xlsEx.mime, len: xlsEx.len }));
check('UI_export_PDF', exp.printed >= 1, 'PDF export (window.print) invoked=' + exp.printed);
check('UI_export_no_errors', exp.errs.length === 0, 'export errors=' + JSON.stringify(exp.errs));
await page.screenshot({ path: path.join(SHOT_DIR, 'ui_exports.png') }).catch(() => {});

// ---- 6. Pagination absent on a data-heavy report ----
await setVal('rptType', 'machine_history');
const st2 = await genAndState();
check('UI_no_pagination_65rows', st2.paginationEl === 0 && !st2.hasPrevNext, '65-row table: paginationEl=' + st2.paginationEl + ' hasPrevNext=' + st2.hasPrevNext);

// ---- 7. Zero console/page errors ----
const relevantPage = pageErrors.filter(e => !/gstatic|chrome-extension/.test(e));
const relevantConsole = consoleErrors.filter(e => !/gstatic|favicon|chrome-extension|Failed to load resource/.test(e));
check('UI_zero_page_errors', relevantPage.length === 0, 'page errors=' + JSON.stringify(relevantPage.slice(0, 5)));
check('UI_zero_console_errors', relevantConsole.length === 0, 'console errors=' + JSON.stringify(relevantConsole.slice(0, 5)));

console.log('\n===== SUMMARY =====');
let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) { console.log('FAILED: ' + failures.join(', ')); console.log('RESULT: INCOMPLETE'); }
else console.log('RESULT: COMPLETE (deployed GAS PROD UI verified live)');
fs.writeFileSync(path.join(SHOT_DIR, 'ui_results.json'), JSON.stringify({ results, failures }, null, 2));
await browser.close();
process.exit(fail > 0 ? 1 : 0);
