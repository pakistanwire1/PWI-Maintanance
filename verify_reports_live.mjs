import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://pwi-maintanance.pages.dev';
const EXEC = BASE + '/api/exec';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DOWNLOAD_DIR = path.join(__dirname, '.verify_downloads');

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clearDownloads() {
  if (fs.existsSync(DOWNLOAD_DIR)) fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

async function waitForFile(dir, filename, timeoutMs) {
  const target = path.join(dir, filename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(target)) return fs.readFileSync(target, 'utf8');
    await sleep(300);
  }
  return null;
}

function toastMessages(list) {
  return list.map(t => t.textContent.trim()).filter(Boolean);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await clearDownloads();

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => {
  const txt = m.text();
  if (m.type() === 'error' || txt.includes('[API]')) consoleErrors.push(txt);
});
page.on('pageerror', e => pageErrors.push(e.message));

await page.exposeFunction('__captureToasts', () => toastMessages(page.evaluate(() => window.__toasts || [])));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch(e) {} });

await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });

await page.evaluate(() => {
  window.__toasts = [];
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) {
          window.__toasts.push({ text: n.textContent.trim(), cls: n.className });
        }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
});

await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
console.log('LOGIN submitted');

await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch(e) { return false; } }, { timeout: 120000 });
console.log('LOGIN token stored');

await page.waitForSelector('#pageContent', { timeout: 60000 });
await page.evaluate(() => navigateTo('reports'));
console.log('Navigated to reports');

await page.waitForSelector('#rptType', { timeout: 60000 });

const net = {};
page.on('request', req => {
  if (req.url().includes('/api/exec') && req.method() === 'POST') {
    try { const a = JSON.parse(req.postData()).action; req.__action = a; } catch(e) {}
  }
});
page.on('response', async res => {
  if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
    try {
      const a = res.request().__action || JSON.parse(res.request().postData()).action;
      const raw = await res.text().catch(() => 'null');
      const body = raw && raw.trim().startsWith('{') ? JSON.parse(raw) : { raw: raw.slice(0, 200) };
      net[a] = body;
    } catch(e) { console.log('  [net-capture] parse error: ' + e.message); }
  }
});

// Wait for all 9 dropdowns to populate (beyond placeholder).
const dropdownIds = ['rptType', 'rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptMaintType', 'rptPriority', 'rptStatus'];
try {
  await page.waitForFunction((ids) => {
    return ids.every(id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const vals = Array.from(el.options).map(o => o.value);
      const nonEmpty = vals.filter(v => v !== '');
      return nonEmpty.length > 0;
    });
  }, { timeout: 120000 }, dropdownIds);
  console.log('All 9 dropdowns populated');
} catch (e) {
  console.log('Dropdown population wait TIMED OUT');
}

await sleep(3000);

const dropdownState = await page.evaluate((ids) => {
  const out = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    const opts = el ? Array.from(el.options).map(o => ({ value: o.value, text: o.textContent })) : [];
    out[id] = { count: opts.length, nonEmpty: opts.filter(o => o.value !== '').length, sample: opts.slice(0, 5) };
  });
  return out;
}, dropdownIds);

const toastsNow = await page.evaluate(() => (window.__toasts || []).map(t => t.text).filter(Boolean));
const toastText = toastsNow.join(' | ');

check('01_no_filter_options_toast', !toastText.includes('Failed to load filter options'), 'toasts seen: ' + (toastText || '(none)'));
check('02_no_machine_filters_toast', !toastText.includes('Failed to load machine filters'), 'toasts seen: ' + (toastText || '(none)'));

const dropdownNames = {
  rptType: 'Report Type', rptDivision: 'Division', rptSection: 'Section', rptDepartment: 'Department',
  rptMachineNumber: 'Machine', rptTechnician: 'Technician', rptMaintType: 'Maintenance Type',
  rptPriority: 'Priority', rptStatus: 'Status'
};
let allPopulated = true;
for (const id of dropdownIds) {
  const st = dropdownState[id];
  const ok = st && st.nonEmpty > 0;
  if (!ok) allPopulated = false;
  console.log(`  dropdown ${dropdownNames[id]} (${id}): options=${st ? st.count : 'MISSING'} populated=${st ? st.nonEmpty : 0}`);
}
check('03_report_type_dropdown', dropdownState.rptType && dropdownState.rptType.nonEmpty > 0, 'Report Type options=' + (dropdownState.rptType ? dropdownState.rptType.nonEmpty : 0));
check('04_division_dropdown', dropdownState.rptDivision && dropdownState.rptDivision.nonEmpty > 0, 'Division options=' + (dropdownState.rptDivision ? dropdownState.rptDivision.nonEmpty : 0));
check('05_section_dropdown', dropdownState.rptSection && dropdownState.rptSection.nonEmpty > 0, 'Section options=' + (dropdownState.rptSection ? dropdownState.rptSection.nonEmpty : 0));
check('06_department_dropdown', dropdownState.rptDepartment && dropdownState.rptDepartment.nonEmpty > 0, 'Department options=' + (dropdownState.rptDepartment ? dropdownState.rptDepartment.nonEmpty : 0));
check('07_machine_dropdown', dropdownState.rptMachineNumber && dropdownState.rptMachineNumber.nonEmpty > 0, 'Machine options=' + (dropdownState.rptMachineNumber ? dropdownState.rptMachineNumber.nonEmpty : 0));
check('08_technician_dropdown', dropdownState.rptTechnician && dropdownState.rptTechnician.nonEmpty > 0, 'Technician options=' + (dropdownState.rptTechnician ? dropdownState.rptTechnician.nonEmpty : 0));
check('09_maintenance_type_dropdown', dropdownState.rptMaintType && dropdownState.rptMaintType.nonEmpty > 0, 'Maintenance Type options=' + (dropdownState.rptMaintType ? dropdownState.rptMaintType.nonEmpty : 0));
check('10_priority_dropdown', dropdownState.rptPriority && dropdownState.rptPriority.nonEmpty > 0, 'Priority options=' + (dropdownState.rptPriority ? dropdownState.rptPriority.nonEmpty : 0));
check('11_status_dropdown', dropdownState.rptStatus && dropdownState.rptStatus.nonEmpty > 0, 'Status options=' + (dropdownState.rptStatus ? dropdownState.rptStatus.nonEmpty : 0));

// Snapshot the empty-filter cascade response before the cascade test overwrites it.
const cascadeAll = net['getMachineCascade'];

// ---- 12. Machine cascade ----
let cascadeOk = true;
const cascadeDetails = [];
try {
  const initial = await page.evaluate(() => {
    const sel = document.getElementById('rptDivision');
    const opts = Array.from(sel.options).map(o => o.value).filter(v => v !== '');
    return { first: opts[0], all: opts };
  });
  if (!initial.first) {
    cascadeOk = false; cascadeDetails.push('no division to select');
  } else {
    await page.evaluate((dv) => {
      const sel = document.getElementById('rptDivision');
      sel.value = dv;
      sel.dispatchEvent(new Event('change'));
    }, initial.first);
    await page.waitForFunction(() => {
      const s = document.getElementById('rptSection');
      return s && s.options.length > 1 && s.options[0] && s.options[0].text !== 'Loading...';
    }, { timeout: 60000 });
    await sleep(2000);
    const rendered = await page.evaluate(() => {
      return Array.from(document.getElementById('rptSection').options).map(o => o.value).filter(v => v !== '');
    });
    const resp = net['getMachineCascade'];
    const expected = (resp && resp.success !== false && resp.data && resp.data.sections || []).map(s => String(s.id));
    const renderedSet = new Set(rendered);
    const expectedSet = new Set(expected);
    const mismatch = rendered.length !== expected.length || rendered.some(v => !expectedSet.has(v)) || expected.some(v => !renderedSet.has(v));
    if (mismatch) {
      cascadeOk = false;
      cascadeDetails.push(`section options mismatch: rendered=${rendered.length} expected=${expected.length} rendered=${JSON.stringify(rendered.slice(0,10))} expected=${JSON.stringify(expected.slice(0,10))}`);
    } else {
      cascadeDetails.push(`division -> sections OK (${rendered.length} sections)`);
    }
  }
} catch (e) {
  cascadeOk = false; cascadeDetails.push('exception: ' + e.message);
}
check('12_machine_cascade', cascadeOk, cascadeDetails.join(' | '));

// ---- 13. Generate Report ----
let generateOk = false;
let generateDetail = '';
let usedFilters = null;
try {
  await page.evaluate(() => {
    const sel = document.getElementById('rptType');
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change'));
  });
  for (let attempt = 0; attempt < 3 && !generateOk; attempt++) {
    usedFilters = await page.evaluate(() => {
      const g = id => document.getElementById(id).value;
      return {
        reportType: g('rptType'), division: g('rptDivision'), section: g('rptSection'),
        department: g('rptDepartment'), machineNumber: g('rptMachineNumber'), technician: g('rptTechnician'),
        maintenanceType: g('rptMaintType'), priority: g('rptPriority'), status: g('rptStatus'),
        fromDate: g('rptFromDate'), toDate: g('rptToDate')
      };
    });
    await page.evaluate(() => document.querySelector('button[onclick*="generateReport"]').click());
    await page.waitForFunction(() => {
      const k = document.getElementById('rptKpiCards');
      return k && k.style.display !== 'none';
    }, { timeout: 120000 }).then(() => { generateOk = true; })
      .catch(async () => {
        const toasts = await page.evaluate(() => (window.__toasts || []).map(t => t.text).filter(Boolean));
        const noData = toasts.some(t => t.includes('No data found'));
        if (noData && attempt < 2) {
          await page.evaluate(() => { document.getElementById('rptFromDate').value = '2020-01-01'; });
        } else {
          generateOk = false;
          generateDetail = 'KPI cards never shown; toasts: ' + toasts.join(' | ');
        }
      });
  }
  if (generateOk) {
    await sleep(4000);
    const state = await page.evaluate(() => {
      const rows = document.querySelectorAll('#rptTableBody tr');
      const ths = document.querySelectorAll('#rptTableHead th');
      const kpi = document.querySelectorAll('#rptKpiCards .stat-card');
      const charts = document.querySelectorAll('#rptChartsCard .rpt-chart-card');
      const chartErrors = Array.from(document.querySelectorAll('.rpt-chart-canvas')).map(c => c.textContent.trim()).filter(t => t.includes('Chart error') || t.includes('No data'));
      const count = (document.getElementById('rptRecordCount') || {}).textContent || '';
      const title = (document.getElementById('rptTableTitle') || {}).textContent || '';
      const kpiVisible = document.getElementById('rptKpiCards').style.display !== 'none';
      const chartVisible = document.getElementById('rptChartsCard').style.display !== 'none';
      return { rows: rows.length, cols: ths.length, kpi: kpi.length, charts: charts.length, chartErrors, count, title, kpiVisible, chartVisible };
    });
    const resp = net['getReportData'];
    const expectedRows = (resp && resp.success !== false && resp.data && resp.data.rows || []);
    const expectedCols = (resp && resp.success !== false && resp.data && resp.data.columns || []);
    generateDetail = `rows=${state.rows}/${expectedRows.length} cols=${state.cols}/${expectedCols.length} kpiCards=${state.kpi} charts=${state.charts} title="${state.title}" recordCount="${state.count}" chartErrors=${JSON.stringify(state.chartErrors)}`;
    if (state.rows === 0 || state.cols === 0 || state.kpi !== 9 || state.charts !== 8 || state.chartErrors.length > 0 || state.rows !== expectedRows.length) {
      generateOk = false;
    }
  }
} catch (e) {
  generateOk = false; generateDetail = 'exception: ' + e.message;
}
check('13_generate_report', generateOk, generateDetail || '(not shown)');

// ---- 14/15/16/17 exports ----
const cdp = await page.createCDPSession();
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOAD_DIR });

let csvOk = false, csvDetail = '';
try {
  await clearDownloads();
  await page.evaluate(() => document.querySelector('button[onclick*="exportCSV"]').click());
  const content = await waitForFile(DOWNLOAD_DIR, 'report.csv', 20000);
  const resp = net['getReportData'];
  const data = (resp && resp.success !== false && resp.data) ? resp.data : null;
  if (!content) { csvDetail = 'no file downloaded'; }
  else if (!data) { csvDetail = 'no captured report data'; }
  else {
    const expected = await page.evaluate((d) => {
      const cols = d.columns;
      let csv = '\uFEFF';
      csv += cols.map(c => '"' + String(c.label).replace(/"/g, '""') + '"').join(',') + '\n';
      d.rows.forEach(row => {
        csv += cols.map(col => {
          let val = row[col.key];
          if (val === null || val === undefined) val = '';
          if (col.type === 'duration' && typeof val === 'number') val = Duration.format(val);
          val = String(val).replace(/"/g, '""');
          return '"' + val + '"';
        }).join(',') + '\n';
      });
      return csv;
    }, data);
    csvOk = content === expected;
    csvDetail = `byteEqual=${csvOk} downloadedBytes=${content.length} expectedBytes=${expected.length} rows=${data.rows.length}`;
  }
} catch (e) { csvDetail = 'exception: ' + e.message; }
check('14_export_csv', csvOk, csvDetail);

let xlsOk = false, xlsDetail = '';
try {
  await clearDownloads();
  await page.evaluate(() => document.querySelector('button[onclick*="exportExcel"]').click());
  const content = await waitForFile(DOWNLOAD_DIR, 'report.xls', 20000);
  const resp = net['getReportData'];
  const cols = (resp && resp.success !== false && resp.data && resp.data.columns || []);
  if (!content) { xlsDetail = 'no file downloaded'; }
  else {
    const hasTable = content.includes('<table>');
    const labelsOk = cols.length > 0 && cols.every(c => content.includes(c.label));
    xlsOk = hasTable && labelsOk;
    xlsDetail = `bytes=${content.length} hasTable=${hasTable} labelsPresent=${labelsOk ? cols.length : 0}/${cols.length}`;
  }
} catch (e) { xlsDetail = 'exception: ' + e.message; }
check('15_export_excel', xlsOk, xlsDetail);

let pdfOk = false, pdfDetail = '';
try {
  await page.evaluate(() => { window.__printCalls = 0; const o = window.print; window.print = function() { window.__printCalls++; }; });
  await page.evaluate(() => document.querySelector('button[onclick*="exportPDF"]').click());
  await sleep(1500);
  const calls = await page.evaluate(() => window.__printCalls || 0);
  pdfOk = calls >= 1;
  pdfDetail = 'window.print calls=' + calls;
} catch (e) { pdfDetail = 'exception: ' + e.message; }
check('16_export_pdf', pdfOk, pdfDetail);

let printOk = false, printDetail = '';
try {
  await page.evaluate(() => { window.__printCalls = 0; const o = window.print; window.print = function() { window.__printCalls++; }; });
  await page.evaluate(() => document.querySelector('button[onclick*="window.print"]').click());
  await sleep(1500);
  const calls = await page.evaluate(() => window.__printCalls || 0);
  printOk = calls >= 1;
  printDetail = 'window.print calls=' + calls;
} catch (e) { printDetail = 'exception: ' + e.message; }
check('17_print', printOk, printDetail);

// ---- 18. Results match GAS ----
let gasOk = true;
const gasDetails = [];
try {
  const token = await page.evaluate(() => localStorage.getItem('cmms_token') || '');
  async function gasCall(action, data) {
    const res = await fetch(GAS, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
      },
      body: JSON.stringify({ action, token, data: data || {} })
    });
    const raw = await res.text();
    if (!raw.trim().startsWith('{')) throw new Error('non-JSON GAS response: ' + raw.slice(0, 120));
    return JSON.parse(raw);
  }
  // 18a. filter options identical
  const gasOpts = await gasCall('getReportFilterOptions', {});
  const cfOpts = net['getReportFilterOptions'];
  if (!cfOpts || !gasOpts || cfOpts.success === false || gasOpts.success === false) {
    gasOk = false; gasDetails.push('filter options call failed: cf=' + JSON.stringify(cfOpts && cfOpts.error) + ' gas=' + JSON.stringify(gasOpts && gasOpts.error));
  } else {
    const cfD = cfOpts.data, gasD = gasOpts.data;
    if (JSON.stringify(cfD) !== JSON.stringify(gasD)) {
      gasOk = false; gasDetails.push('getReportFilterOptions payload differs CF vs GAS');
    } else {
      gasDetails.push('filterOptions identical (' + gasD.reportTypes.length + ' report types)');
    }
    // rendered report type options vs GAS list
    const rendered = await page.evaluate(() => Array.from(document.getElementById('rptType').options).map(o => ({ value: o.value, label: o.textContent })).filter(o => o.value !== ''));
    const gasRT = (gasD.reportTypes || []).map(r => ({ value: r.value, label: r.label }));
    if (JSON.stringify(rendered) !== JSON.stringify(gasRT)) {
      gasOk = false; gasDetails.push('rendered Report Type options mismatch GAS list');
    } else {
      gasDetails.push('Report Type dropdown matches GAS (' + gasRT.length + ')');
    }
  }
  // 18b. machine cascade identical (empty filters)
  const gasCasc = await gasCall('getMachineCascade', { divisionId: '', sectionId: '', deptId: '' });
  const cfCasc = cascadeAll;
  if (!cfCasc || !gasCasc || cfCasc.success === false || gasCasc.success === false) {
    gasOk = false; gasDetails.push('cascade call failed');
  } else if (JSON.stringify(cfCasc.data) !== JSON.stringify(gasCasc.data)) {
    gasOk = false; gasDetails.push('getMachineCascade payload differs CF vs GAS');
  } else {
    gasDetails.push('cascade payload identical (divisions=' + gasCasc.data.divisions.length + ' machines=' + gasCasc.data.machines.length + ')');
  }
  // 18c. report data identical with same filters
  const gasData = await gasCall('getReportData', usedFilters || {});
  const cfData = net['getReportData'];
  if (!cfData || !gasData || cfData.success === false || gasData.success === false) {
    gasOk = false; gasDetails.push('report data call failed: ' + JSON.stringify((cfData||{}).error) + ' / ' + JSON.stringify((gasData||{}).error));
  } else if (JSON.stringify(cfData.data) !== JSON.stringify(gasData.data)) {
    gasOk = false; gasDetails.push('getReportData payload differs CF vs GAS');
  } else {
    gasDetails.push('reportData identical (rows=' + gasData.data.rows.length + ' cols=' + gasData.data.columns.length + ' kpi=' + JSON.stringify(gasData.data.kpi && gasData.data.kpi.totalJobs) + ')');
  }
} catch (e) {
  gasOk = false; gasDetails.push('exception: ' + e.message);
}
check('18_results_match_gas', gasOk, gasDetails.join(' | '));

// ---- console / page errors ----
const apiErrors = consoleErrors.filter(t => t.includes('[API]'));
check('19_no_api_errors', apiErrors.length === 0, 'api console errors: ' + (apiErrors.length ? JSON.stringify(apiErrors.slice(0, 5)) : '(none)'));
const pageErrFiltered = pageErrors.filter(e => !e.includes('gstatic'));
check('20_no_page_errors', pageErrFiltered.length === 0, 'page errors: ' + (pageErrFiltered.length ? JSON.stringify(pageErrFiltered.slice(0, 5)) : '(none)'));

console.log('\n===== SUMMARY =====');
let passCount = 0, failCount = 0;
for (const r of results) {
  if (r.ok) passCount++; else failCount++;
  console.log((r.ok ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.detail);
}
console.log('\nPASS: ' + passCount + '  FAIL: ' + failCount);
if (failCount > 0) {
  console.log('FAILED ITEMS: ' + failures.join(', '));
  console.log('RESULT: INCOMPLETE');
} else {
  console.log('RESULT: COMPLETE');
}

await browser.close();
process.exit(failCount > 0 ? 1 : 0);
