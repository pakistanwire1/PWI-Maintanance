import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.CF_BASE || 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT_DIR = path.join(__dirname, 'verify_shots');

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const MASTER_ACTIONS = ['getReportFilterOptions', 'getMachineCascade', 'getSectionList', 'getDepartmentList', 'getMachines', 'getDivisions', 'getSections', 'getDepartments', 'getMachineOptions', 'getTechnicians'];
const masterCounts = {};
let masterCallsSinceReset = 0;
const allRequests = [];
page.on('request', req => {
  if (req.url().includes('/api/exec') && req.method() === 'POST') {
    let a = '';
    try { a = JSON.parse(req.postData()).action; } catch (e) {}
    if (a) {
      allRequests.push(a);
      masterCounts[a] = (masterCounts[a] || 0) + 1;
      if (MASTER_ACTIONS.includes(a)) masterCallsSinceReset++;
    }
  }
});

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' || t.includes('[API]')) consoleErrors.push(t); });
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });

await page.evaluate(() => {
  window.__toasts = [];
  const obs = new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent.trim());
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
});

await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });

// ---- navigate helper ----
async function nav(route, waitId) {
  await page.evaluate(r => navigateTo(r), route);
  if (waitId) await page.waitForSelector(waitId, { timeout: 60000 });
  await sleep(1200);
}
async function navReports() {
  await page.evaluate(() => navigateTo('reports'));
  await page.waitForSelector('#rptType', { timeout: 60000 });
}

const dropdownIds = ['rptType', 'rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptMaintType', 'rptPriority', 'rptStatus'];

// ---- First reports load ----
await navReports();
await page.waitForFunction(ids => {
  return ids.every(id => {
    const el = document.getElementById(id);
    if (!el) return false;
    return Array.from(el.options).some(o => o.value !== '');
  });
}, { timeout: 120000 }, dropdownIds);
await sleep(1500);

console.log('--- initial reports load master action counts ---');
for (const a of MASTER_ACTIONS) if (masterCounts[a]) console.log('  ' + a + ': ' + masterCounts[a]);
const loadCounts = Object.assign({}, masterCounts);

// ---- L1. No 'Loading...' residue ----
const loadingTexts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#reportsPage select option')).filter(o => /loading/i.test(o.textContent)).map(o => o.textContent.trim());
});
check('L1_no_loading_options', loadingTexts.length === 0, 'loading options found: ' + (loadingTexts.length ? JSON.stringify(loadingTexts) : '(none)'));

const toasts = await page.evaluate(() => (window.__toasts || []).filter(t => /failed/i.test(t)));
check('L2_no_failed_toasts', toasts.length === 0, 'failure toasts: ' + (toasts.length ? JSON.stringify(toasts) : '(none)'));

// ---- L3. Layout: same-row filter groups ----
const layout = await page.evaluate(() => {
  const ids = ['rptType', 'rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber'];
  const ids2 = ['rptTechnician', 'rptMaintType', 'rptPriority', 'rptStatus', 'rptFromDate', 'rptToDate'];
  const rect = id => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  return { row1: ids.map(rect), row2: ids2.map(rect), panel: (() => { const p = document.querySelector('.rpt-filter-panel'); if (!p) return null; const r = p.getBoundingClientRect(); return { w: r.width }; })() };
});

let layoutOk = true;
const layoutDetails = [];
if (!layout.row1.every(Boolean) || !layout.row2.every(Boolean)) {
  layoutOk = false; layoutDetails.push('some select missing');
} else {
  const y1 = layout.row1[0].y, h1 = layout.row1[0].h;
  const sameRow = (r, y, h) => Math.abs(r.y - y) < 1.5 && Math.abs(r.h - h) < 3;
  const row1SameRow = layout.row1.every(r => sameRow(r, y1, h1));
  const row1Ordered = layout.row1.every((r, i) => i === 0 || r.x > layout.row1[i - 1].x);
  const y2 = layout.row2[0].y, h2 = layout.row2[0].h;
  const row2SameRow = layout.row2.every(r => sameRow(r, y2, h2));
  const row2Ordered = layout.row2.every((r, i) => i === 0 || r.x > layout.row2[i - 1].x);
  const row2BelowRow1 = y2 >= y1 + h1;
  const allGroupsFullWidth = layout.row1.every(r => r.w > 120) && layout.row2.every(r => r.w > 120);
  if (!row1SameRow) layoutDetails.push('row1 NOT same row (y differ)');
  if (!row1Ordered) layoutDetails.push('row1 not left-to-right ordered');
  if (!row2SameRow) layoutDetails.push('row2 NOT same row (y differ)');
  if (!row2Ordered) layoutDetails.push('row2 not left-to-right ordered');
  if (!row2BelowRow1) layoutDetails.push('row2 overlaps row1');
  if (!allGroupsFullWidth) layoutDetails.push('some group too narrow');
  layoutOk = row1SameRow && row1Ordered && row2SameRow && row2Ordered && row2BelowRow1 && allGroupsFullWidth;
  layoutDetails.push(`row1 y=${y1.toFixed(1)} h=${h1.toFixed(1)} x=[${layout.row1.map(r => r.x.toFixed(0)).join(',')}]`);
  layoutDetails.push(`row2 y=${y2.toFixed(1)} h=${h2.toFixed(1)} x=[${layout.row2.map(r => r.x.toFixed(0)).join(',')}]`);
  layoutDetails.push(`row2-below-row1 gap=${(y2 - (y1 + h1)).toFixed(1)}px panelW=${layout.panel.w.toFixed(0)}`);
}
check('L3_same_row_layout', layoutOk, layoutDetails.join(' | '));

await page.screenshot({ path: path.join(SHOT_DIR, 'reports_after.png') });

// ---- L4/L5. Dropdown populations ----
const pop = await page.evaluate(ids => {
  const out = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    out[id] = Array.from(el.options).map(o => ({ value: o.value, text: o.textContent }));
  });
  return out;
}, dropdownIds);

const nonEmpty = id => pop[id].filter(o => o.value !== '');
const deptNames = nonEmpty('rptDepartment').slice(0, 4).map(o => o.text);
const machineSample = nonEmpty('rptMachineNumber').slice(0, 2).map(o => o.text);

check('L4_division_options', nonEmpty('rptDivision').length === 2, 'divisions=' + nonEmpty('rptDivision').length);
check('L5_section_options', nonEmpty('rptSection').length === 9, 'sections=' + nonEmpty('rptSection').length);
check('L6_department_options_named', nonEmpty('rptDepartment').length === 14 && /^\s*(undefined|\d+)\s*$/.test(deptNames[0]) === false, 'departments=' + nonEmpty('rptDepartment').length + ' sample=' + JSON.stringify(deptNames));
check('L7_machine_options', nonEmpty('rptMachineNumber').length === 57, 'machines=' + nonEmpty('rptMachineNumber').length + ' sample=' + JSON.stringify(machineSample));

// machine label format check (em-dash present)
const machineLabelHasDash = machineSample.some(t => t.indexOf('\u2014') > -1);
check('L8_machine_label_dash', machineLabelHasDash, 'machine labels use em-dash: ' + JSON.stringify(machineSample));

// department name correctness (DEPT001 = Admin)
const deptAdmin = nonEmpty('rptDepartment').find(o => o.value === 'DEPT001');
check('L9_department_DEPT001_name', !!deptAdmin && deptAdmin.text.trim() === 'Admin', 'DEPT001 label="' + (deptAdmin && deptAdmin.text.trim()) + '"');

// ---- L10. Cascade: instant, filtered, preserved ----
const resetMaster = () => { masterCallsSinceReset = 0; };
resetMaster();
let cascadeOk = true;
const cascadeDetails = [];

async function select(id, value) {
  await page.evaluate(({ id, value }) => {
    const sel = document.getElementById(id);
    sel.value = value;
    sel.dispatchEvent(new Event('change'));
  }, { id, value });
  await sleep(300);
}
const val = id => page.evaluate(i => document.getElementById(i).value, id);
const opts = id => page.evaluate(i => Array.from(document.getElementById(i).options).map(o => o.value).filter(v => v !== ''), id);

try {
  // DIV001
  await select('rptDivision', 'DIV001');
  const divAfter = await val('rptDivision');
  const secAfterDiv = await opts('rptSection');
  const deptAfterDiv = await opts('rptDepartment');
  const machAfterDiv = await opts('rptMachineNumber');
  if (divAfter !== 'DIV001') { cascadeOk = false; cascadeDetails.push('division RESET after change -> ' + divAfter); }
  if (secAfterDiv.length !== 6) { cascadeOk = false; cascadeDetails.push('DIV001 sections=' + secAfterDiv.length + ' (expect 6)'); }
  if (deptAfterDiv.length !== 10) { cascadeOk = false; cascadeDetails.push('DIV001 departments=' + deptAfterDiv.length + ' (expect 10)'); }
  if (machAfterDiv.length !== 34) { cascadeOk = false; cascadeDetails.push('DIV001 machines=' + machAfterDiv.length + ' (expect 34)'); }
  cascadeDetails.push(`DIV001 -> sections=${secAfterDiv.length} depts=${deptAfterDiv.length} machines=${machAfterDiv.length} (division preserved=${divAfter === 'DIV001'})`);

  // SEC002 (within DIV001)
  await select('rptSection', 'SEC002');
  const secVal = await val('rptSection');
  const deptAfterSec = await opts('rptDepartment');
  const machAfterSec = await opts('rptMachineNumber');
  if (secVal !== 'SEC002') { cascadeOk = false; cascadeDetails.push('section RESET -> ' + secVal); }
  if (deptAfterSec.length !== 3) { cascadeOk = false; cascadeDetails.push('DIV001+SEC002 departments=' + deptAfterSec.length + ' (expect 3: DEPT002,003,004)'); }
  if (machAfterSec.length !== 11) { cascadeOk = false; cascadeDetails.push('DIV001+SEC002 machines=' + machAfterSec.length + ' (expect 11)'); }
  cascadeDetails.push(`DIV001+SEC002 -> depts=${deptAfterSec.length} machines=${machAfterSec.length} (section preserved=${secVal === 'SEC002'})`);

  // DEPT002
  await select('rptDepartment', 'DEPT002');
  const deptVal = await val('rptDepartment');
  const machAfterDept = await opts('rptMachineNumber');
  if (deptVal !== 'DEPT002') { cascadeOk = false; cascadeDetails.push('department RESET -> ' + deptVal); }
  if (machAfterDept.length !== 5) { cascadeOk = false; cascadeDetails.push('DIV001+SEC002+DEPT002 machines=' + machAfterDept.length + ' (expect 5)'); }
  cascadeDetails.push(`DIV001+SEC002+DEPT002 -> machines=${machAfterDept.length} (dept preserved=${deptVal === 'DEPT002'})`);

  // Switch division to DIV002 -> children invalid -> reset to All
  await select('rptDivision', 'DIV002');
  const secAfter2 = await val('rptSection');
  const deptAfter2 = await val('rptDepartment');
  const machAfter2 = await val('rptMachineNumber');
  const secOpts2 = await opts('rptSection');
  const deptOpts2 = await opts('rptDepartment');
  const machOpts2 = await opts('rptMachineNumber');
  if (secOpts2.length !== 3) { cascadeOk = false; cascadeDetails.push('DIV002 sections=' + secOpts2.length + ' (expect 3)'); }
  if (deptOpts2.length !== 4) { cascadeOk = false; cascadeDetails.push('DIV002 departments=' + deptOpts2.length + ' (expect 4)'); }
  if (machOpts2.length !== 23) { cascadeOk = false; cascadeDetails.push('DIV002 machines=' + machOpts2.length + ' (expect 23)'); }
  cascadeDetails.push(`DIV002 -> sections=${secOpts2.length} depts=${deptOpts2.length} machines=${machOpts2.length} (invalid children reset: sec='${secAfter2}' dept='${deptAfter2}' mach='${machAfter2}')`);

  if (masterCallsSinceReset !== 0) { cascadeOk = false; cascadeDetails.push('NETWORK CALLS during cascade: ' + masterCallsSinceReset); }
  else cascadeDetails.push('no master-list network calls during cascade (client-side)');

  // Reset back to All
  await select('rptDivision', '');
  await select('rptSection', '');
  await select('rptDepartment', '');
  await page.evaluate(() => { const sel = document.getElementById('rptMachineNumber'); sel.value = ''; sel.dispatchEvent(new Event('change')); });
} catch (e) { cascadeOk = false; cascadeDetails.push('exception: ' + e.message); }
check('L10_cascade', cascadeOk, cascadeDetails.join(' | '));

// ---- L11. Caching across pages (no master reloads) ----
let cacheOk = true;
const cacheDetails = [];
try {
  resetMaster();
  await nav('dashboard', '#pageContent');
  await nav('inventory', '#pageContent');
  await nav('assets', '#pageContent');
  await navReports();
  await page.waitForFunction(() => {
    const el = document.getElementById('rptType');
    return el && Array.from(el.options).some(o => o.value !== '');
  }, { timeout: 60000 });
  await sleep(800);
  cacheDetails.push('master network calls after nav cycle: ' + masterCallsSinceReset);
  if (masterCallsSinceReset !== 0) {
    cacheOk = false;
    const names = Object.keys(masterCounts).filter(a => MASTER_ACTIONS.includes(a));
    cacheDetails.push('counts: ' + names.map(a => a + '=' + masterCounts[a]).join(', '));
  }
} catch (e) { cacheOk = false; cacheDetails.push('exception: ' + e.message); }
check('L11_no_master_reload_on_nav', cacheOk, cacheDetails.join(' | '));

// ---- L12. Report still generates (regression) ----
let genOk = false; let genDetail = '';
try {
  await page.evaluate(() => {
    const sel = document.getElementById('rptType');
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change'));
    document.getElementById('rptFromDate').value = '2020-01-01';
  });
  await page.evaluate(() => document.querySelector('button[onclick*="generateReport"]').click());
  await page.waitForFunction(() => {
    const k = document.getElementById('rptKpiCards');
    return k && k.style.display !== 'none';
  }, { timeout: 120000 });
  await sleep(3000);
  const st = await page.evaluate(() => {
    const rows = document.querySelectorAll('#rptTableBody tr');
    const kpi = document.querySelectorAll('#rptKpiCards .stat-card');
    return { rows: rows.length, kpi: kpi.length };
  });
  genOk = st.rows > 0 && st.kpi === 9;
  genDetail = 'rows=' + st.rows + ' kpiCards=' + st.kpi;
} catch (e) { genDetail = 'exception: ' + e.message; }
check('L12_generate_report_after_fix', genOk, genDetail);

await page.screenshot({ path: path.join(SHOT_DIR, 'reports_after_report.png') });

// ---- console/page errors ----
const apiErrors = consoleErrors.filter(t => t.includes('[API]'));
check('L13_no_api_errors', apiErrors.length === 0, 'api console errors: ' + (apiErrors.length ? JSON.stringify(apiErrors.slice(0, 3)) : '(none)'));
const pageErr = pageErrors.filter(e => !e.includes('gstatic'));
check('L14_no_page_errors', pageErr.length === 0, 'page errors: ' + (pageErr.length ? JSON.stringify(pageErr.slice(0, 3)) : '(none)'));

console.log('\n===== SUMMARY =====');
let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) { console.log('FAILED: ' + failures.join(', ')); console.log('RESULT: INCOMPLETE'); }
else console.log('RESULT: COMPLETE');

await browser.close();
process.exit(fail > 0 ? 1 : 0);
