import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CF = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'verify_shots', 'live_cf');
const DL = path.join(process.env.TEMP || 'C:/Windows/Temp', 'opencode', 'cf_dl');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DL, { recursive: true });
for (const f of fs.readdirSync(DL)) fs.unlinkSync(path.join(DL, f));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (id, ok, note) => { results.push({ id, ok, note }); console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + note); };
let errCount = 0;
const errSample = [];
const section = (label) => console.log('=== ' + label + ' (cumulative console errors: ' + errCount + ') ===');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,1000'] });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 1000 });
const cdp = await page.createCDPSession().catch(() => null);
if (cdp) await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(() => {});
const pageErrs = [];
const consoleErrs = [];
page.on('pageerror', e => pageErrs.push(e.message.slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') { consoleErrs.push(m.text().slice(0, 300)); errCount++; if (errSample.length < 5) errSample.push(m.text().slice(0, 120)); } });

const st = async () => page.evaluate(() => ({
  rows: document.querySelectorAll('#rptTableBody tr').length,
  tableVisible: document.getElementById('rptTableCard') ? document.getElementById('rptTableCard').style.display : '',
  toast: (document.querySelector('#toast-container, .toast, [id*=toast]') || {}).textContent || '',
  kpiCards: document.querySelectorAll('#rptKpiCards .stat-card').length,
  firstRow: document.querySelector('#rptTableBody tr') ? document.querySelector('#rptTableBody tr').textContent.replace(/\s+/g, ' ').slice(0, 220) : ''
}));

const genAndState = async (settleMs) => {
  await page.evaluate(() => window.Reports.generateReport());
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    const shown = await page.evaluate(() => { const el = document.getElementById('loadingOverlay'); return !!(el && el.classList.contains('show')); });
    if (shown) break;
    await sleep(250);
  }
  const t1 = Date.now();
  while (Date.now() - t1 < 240000) {
    const shown = await page.evaluate(() => { const el = document.getElementById('loadingOverlay'); return !!(el && el.classList.contains('show')); });
    if (!shown) { await sleep(settleMs || 500); return await st(); }
    await sleep(250);
  }
  return await st();
};

const setVal = (id, value) => page.evaluate(({ id, value }) => { const el = document.getElementById(id); if (el) el.value = value; }, { id, value });
const setSel = (id, value) => page.evaluate(({ id, value }) => { const el = document.getElementById(id); if (!el) return; el.value = value; el.dispatchEvent(new Event('change')); }, { id, value });
async function waitNoLoading(id, timeoutMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const st2 = await page.evaluate(i => {
      const el = document.getElementById(i);
      if (!el) return 'missing';
      const opts = Array.from(el.options);
      if (opts.length === 0) return 'empty';
      if (/loading/.test(opts.map(o => (o.textContent || '').toLowerCase()).join(' '))) return 'loading';
      return 'ready';
    }, id);
    if (st2 === 'ready') return true;
    await sleep(400);
  }
  return false;
}
async function waitOption(id, value, timeoutMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const has = await page.evaluate(({ id, value }) => {
      const el = document.getElementById(id);
      return el ? Array.from(el.options).some(o => o.value === value) : false;
    }, { id, value });
    if (has) return true;
    await sleep(300);
  }
  return false;
}

try {
  await page.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#loginForm', { timeout: 60000 });
  await page.type('#loginEmail', EMAIL);
  await page.type('#loginPassword', PASSWORD);
  await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
  await page.waitForFunction(() => { try { return typeof window.navigateTo === 'function' && typeof window.Reports === 'object'; } catch (e) { return false; } }, { timeout: 60000 });
  await page.evaluate(() => navigateTo('reports'));
  await page.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 120000 });
  await waitNoLoading('rptDivision');
  await waitNoLoading('rptSection');
  await waitNoLoading('rptDepartment');
  await waitNoLoading('rptMachineNumber');
  await waitNoLoading('rptTechnician');
  console.log('CF reports page ready');

  section('dropdowns');

  const maintTypes = await page.evaluate(() => Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v));
  const expectedMT = ['All', 'Breakdown Electrical', 'Breakdown Maintenance', 'Preventive Maintenance'];
  check('CF_maintType_options', JSON.stringify(maintTypes) === JSON.stringify(expectedMT), 'rptMaintType=' + JSON.stringify(maintTypes) + ' (placeholder "All" + 3 real types is correct CF design)');

  section('report types');
  await setVal('rptType', 'machine_history');
  let s = await genAndState();
  check('CF_T_machine_history', s.rows === 65 && !/No data/.test(s.toast), 'rows=' + s.rows + ' (expect 65)');
  await page.screenshot({ path: path.join(OUT, 'cf_machine_history.png') }).catch(() => {});

  await setVal('rptType', 'breakdown_history');
  s = await genAndState();
  check('CF_T_breakdown_history', s.rows === 61 && !/No data/.test(s.toast), 'rows=' + s.rows + ' (expect 61, was 0 before fix)');
  await page.screenshot({ path: path.join(OUT, 'cf_breakdown_history.png') }).catch(() => {});

  await setVal('rptType', 'preventive_maintenance');
  s = await genAndState();
  check('CF_T_preventive_maintenance', s.rows === 4, 'rows=' + s.rows + ' (expect 4)');

  section('filters');
  await setVal('rptType', 'machine_history');
  await setSel('rptDivision', '');
  await waitNoLoading('rptMachineNumber');
  await waitOption('rptMachineNumber', 'SW # 06');
  await setVal('rptMachineNumber', 'SW # 06');
  s = await genAndState();
  check('CF_F_machine', s.rows === 19, 'machine SW # 06 -> rows=' + s.rows + ' (expect 19)');
  await page.screenshot({ path: path.join(OUT, 'cf_machine_filter.png') }).catch(() => {});

  section('filters (cont.) / name fallback / truezero');
  await setVal('rptMachineNumber', '');
  await setVal('rptType', 'machine_history');
  s = await genAndState();
  const hasHydraulicName = await page.evaluate(() => {
    const tbody = document.getElementById('rptTableBody');
    if (!tbody) return false;
    const texts = Array.from(tbody.querySelectorAll('tr')).slice(0, 20).map(tr => tr.textContent);
    return texts.some(t => /Hydraulic Press/.test(t));
  });
  check('CF_machine_name_rendering', s.rows === 65 && hasHydraulicName, 'machine_history table renders name fallback "Hydraulic Press" rows=' + s.rows + ' nameRendered=' + hasHydraulicName);
  await page.screenshot({ path: path.join(OUT, 'cf_machine_name_fallback.png') }).catch(() => {});

  await setVal('rptMachineNumber', '');
  await setSel('rptDivision', '');
  await waitNoLoading('rptMachineNumber');
  await waitOption('rptMachineNumber', 'SW # 06');
  await waitOption('rptMaintType', 'Breakdown Maintenance');
  await setVal('rptMaintType', 'Breakdown Maintenance');
  s = await genAndState();
  check('CF_F_maint', s.rows === 59, 'maintType Breakdown Maintenance -> rows=' + s.rows + ' (expect 59)');

  section('truezero + pagination');

  await setVal('rptMaintType', 'All');
  await setVal('rptFromDate', '2020-01-01');
  await setVal('rptToDate', '2020-12-31');
  s = await genAndState();
  check('CF_F_truezero', /No data found/.test(s.toast) && s.tableVisible === 'none', '2020 range -> toast + hidden table (rows=' + s.rows + ')');
  await page.screenshot({ path: path.join(OUT, 'cf_truezero.png') }).catch(() => {});
  await setVal('rptFromDate', '');
  await setVal('rptToDate', '');

  await setVal('rptType', 'machine_history');
  s = await genAndState();
  const pagInTable = await page.evaluate(() => !!document.querySelector('#rptTableCard .pagination, #rptTableCard .pagination-footer, #rptTableCard [class*=pagination], #rptPrevBtn, #rptNextBtn, #rptTableCard a[onclick*="Page"]'));
  check('CF_no_pagination_65rows', s.rows === 65 && !pagInTable, '65-row table: no pagination elements inside report table');
  await page.screenshot({ path: path.join(OUT, 'cf_exports.png') }).catch(() => {});

  section('exports + downloads');
  await page.evaluate(() => { window.__printInvoked = 0; const orig = window.print; window.print = function () { window.__printInvoked++; }; }).catch(() => {});
  await page.evaluate(() => window.Reports.exportPDF());
  const pdfInvoked = await page.evaluate(() => window.__printInvoked || 0);
  check('CF_export_PDF', pdfInvoked === 1, 'PDF (window.print) invoked=' + pdfInvoked);

  await page.evaluate(() => window.Reports.exportCSV());
  await sleep(3000);
  const csvFiles = fs.readdirSync(DL).filter(f => f === 'report.csv');
  let csvOk = csvFiles.length > 0;
  if (csvOk) {
    const c = fs.readFileSync(path.join(DL, 'report.csv'), 'utf8');
    csvOk = c.charCodeAt(0) === 0xFEFF && c.length > 1000;
  }
  check('CF_export_CSV', csvOk, 'CSV download -> ' + (csvFiles.length ? fs.readFileSync(path.join(DL, 'report.csv'), 'utf8').length + ' bytes (BOM+header ok)' : 'MISSING'));

  await page.evaluate(() => window.Reports.exportExcel());
  await sleep(3000);
  const xlsFiles = fs.readdirSync(DL).filter(f => f === 'report.xls');
  check('CF_export_Excel', xlsFiles.length > 0 && fs.statSync(path.join(DL, 'report.xls')).size > 1000, 'Excel download -> ' + (xlsFiles.length ? fs.statSync(path.join(DL, 'report.xls')).size + ' bytes' : 'MISSING'));

  check('CF_zero_page_errors', pageErrs.length === 0, 'page errors=' + JSON.stringify(pageErrs));
  check('CF_zero_console_errors', consoleErrs.length === 0, 'console errors=' + consoleErrs.length + ' sample=' + JSON.stringify(errSample));

  fs.writeFileSync(path.join(OUT, 'cf_results.json'), JSON.stringify({ results, pageErrors: pageErrs, consoleErrors: consoleErrs }, null, 2));
} catch (err) {
  console.log('HARNESS ERROR: ' + err.message);
  results.push({ id: 'harness', ok: false, note: err.message });
  fs.writeFileSync(path.join(OUT, 'cf_results.json'), JSON.stringify({ results, pageErrors: pageErrs, consoleErrors: consoleErrs, fatal: err.message }, null, 2));
} finally {
  await browser.close();
}

const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok);
console.log('\n===== SUMMARY =====');
console.log('PASS: ' + passed + '  FAIL: ' + failed.length);
if (failed.length) console.log('FAILED: ' + failed.map(f => f.id).join(', '));
console.log(failed.length === 0 ? 'RESULT: COMPLETE (deployed CF PROD UI verified live)' : 'RESULT: INCOMPLETE');
