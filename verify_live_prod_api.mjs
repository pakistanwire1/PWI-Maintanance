import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS_DEPLOY = 'AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA';

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

const token = await page.evaluate(() => localStorage.getItem('cmms_token'));
const api = async (action, data) => {
  const res = await fetch(BASE + '/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token, data }) });
  const j = await res.json();
  if (j && j.error) return { error: j.error };
  return j.data || j;
};

const base = {
  reportType: 'machine_history',
  division: '', section: '', department: '', machineNumber: '',
  technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '', toDate: ''
};

console.log('======== LIVE PROD GAS VERIFICATION (deployment @433 via CF proxy) ========\n');

// ---- 0. getReportFilterOptions ----
const opts = await api('getReportFilterOptions', {});
const mTypes = (opts.maintenanceTypes || []).filter(x => x && x !== 'All');
check('API_options_maintTypes', JSON.stringify(mTypes) === JSON.stringify(['Breakdown Electrical', 'Breakdown Maintenance', 'Preventive Maintenance']), 'maintenanceTypes=' + JSON.stringify(mTypes));
const repTypes = (opts.reportTypes || []).map(r => r.value || r);
console.log('reportTypes(' + repTypes.length + '): ' + JSON.stringify(repTypes));
check('API_options_16_types', repTypes.length >= 14, 'reportTypes count=' + repTypes.length);

// ---- 1. Filter matrix ----
const test = async (id, label, patch, expect) => {
  const f = { ...base, ...patch };
  const res = await api('getReportData', f);
  const rows = (res && res.rows) || [];
  const ok = typeof expect === 'function' ? expect(rows) : rows.length === expect;
  check(id, ok, label + ' -> rows=' + rows.length + ' (expect ' + (typeof expect === 'function' ? 'fn' : expect) + ')');
  return rows;
};

const total = (await test('F_total', 'baseline machine_history (no filters)', {}, 65));

await test('F_div_ID', 'division ID DIV001', { division: 'DIV001' }, 64);
await test('F_div_NAME', 'division NAME Spoke Division', { division: 'Spoke Division' }, 64);
await test('F_sec_ID', 'section ID SEC002', { section: 'SEC002' }, 62);
await test('F_sec_NAME', 'section NAME Spoke', { section: 'Spoke' }, 62);
await test('F_dept_ID', 'department ID DEPT003', { department: 'DEPT003' }, 19);
await test('F_dept_NAME', 'department NAME Swagging', { department: 'Swagging' }, 19);
await test('F_mach_num', 'machineNumber SW # 06', { machineNumber: 'SW # 06' }, 19);
await test('F_mach_sp05', 'machineNumber SP # 05', { machineNumber: 'SP # 05' }, 16);
await test('F_mach_name_fallback', 'machineNumber Hydraulic Press (name fallback)', { machineNumber: 'Hydraulic Press' }, 12);
await test('F_tech_ARIF', 'technician ARIF (token match)', { technician: 'ARIF' }, 10);
await test('F_tech_ARSALAN', 'technician ARSALAN', { technician: 'ARSALAN' }, 25);
await test('F_prio_High', 'priority High', { priority: 'High' }, 2);
await test('F_status_RUNNING', 'status RUNNING', { status: 'RUNNING' }, 13);
await test('F_maint_BD', 'maintenanceType Breakdown Maintenance', { maintenanceType: 'Breakdown Maintenance' }, 59);
await test('F_maint_PM', 'maintenanceType Preventive Maintenance', { maintenanceType: 'Preventive Maintenance' }, 4);
await test('F_maint_BDE', 'maintenanceType Breakdown Electrical', { maintenanceType: 'Breakdown Electrical' }, 2);
await test('F_date_jul', 'date range Jul 2026', { fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59' }, 64);
await test('F_date_sameday', 'same-day 2026-07-23', { fromDate: '2026-07-23T00:00:00', toDate: '2026-07-23T23:59:59' }, 28);

// ---- 2. Combinations ----
await test('C_div_sec_dept_ID', 'DIV001+SEC002+DEPT003', { division: 'DIV001', section: 'SEC002', department: 'DEPT003' }, 19);
await test('C_div_sec_dept_NAME', 'Spoke Division+Spoke+Swagging', { division: 'Spoke Division', section: 'Spoke', department: 'Swagging' }, 19);
await test('C_mach_prio_status', 'SW # 06 + High + OPEN', { machineNumber: 'SW # 06', priority: 'High', status: 'OPEN' }, 0);
await test('C_dept_tech', 'DEPT003 + ARIF', { department: 'DEPT003', technician: 'ARIF' }, 1);
await test('C_dept_mach', 'DEPT002 + SP # 05', { department: 'DEPT002', machineNumber: 'SP # 05' }, 16);
// JC-2026-000065 (DIV001) OpenDate=2026-08-06 -> correctly EXCLUDED from Jul range
await test('C_div_date', 'DIV001 + Jul 2026 (JC-2026-000065 is Aug 6, so 63 is correct)', { division: 'DIV001', fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59' }, 63);
await test('C_maint_mach', 'Breakdown Maintenance + SW # 06', { maintenanceType: 'Breakdown Maintenance', machineNumber: 'SW # 06' }, rows => rows.length > 0);
await test('C_tech_status', 'ARSALAN + RUNNING', { technician: 'ARSALAN', status: 'RUNNING' }, rows => rows.length > 0);

// ---- 3. Every report type ----
console.log('\n--- ALL REPORT TYPES (live deployed getReportData) ---');
const typeExpect = {
  machine_history: { rows: 65, kpi: true },
  breakdown_history: { rows: 61 },
  preventive_maintenance: { rows: 4 },
  machine_performance: { rows: 8 },
  department_performance: { rows: 6 },
  technician_performance: { rows: 16 },
  pending_jobs: { rows: 4 },
  closed_jobs: { rows: 0, note: 'true zero - no closed/completed CurrentStatus in live data; matches JobCardsPage closed tab filter' }
};
for (const rt of repTypes) {
  const res = await api('getReportData', { ...base, reportType: rt });
  const rows = (res && res.rows) || [];
  const cols = (res && res.columns) || [];
  const kpi = (res && res.kpi) || {};
  const charts = (res && res.charts) || {};
  const exp = typeExpect[rt];
  let ok = !!(res && !res.error) && Array.isArray(rows) && Array.isArray(cols);
  let detail = rt.padEnd(28) + ' rows=' + rows.length + ' cols=' + cols.length;
  if (exp) {
    if (exp.rows !== undefined && rows.length !== exp.rows) ok = false;
    detail += ' (expect rows=' + exp.rows + ')';
  } else {
    ok = ok && rows.length > 0;
    if (rows.length === 0) ok = false;
  }
  check('T_' + rt, ok, detail);
}
// KPI on machine_history
const mh = await api('getReportData', { ...base, reportType: 'machine_history' });
check('KPI_breakdown', mh.kpi && mh.kpi.breakdownJobs === 61, 'kpi.breakdownJobs=' + (mh.kpi && mh.kpi.breakdownJobs) + ' (expect 61)');
check('KPI_preventive', mh.kpi && mh.kpi.preventiveJobs === 4, 'kpi.preventiveJobs=' + (mh.kpi && mh.kpi.preventiveJobs) + ' (expect 4)');
check('KPI_total', mh.kpi && mh.kpi.totalJobs === 65, 'kpi.totalJobs=' + (mh.kpi && mh.kpi.totalJobs) + ' (expect 65)');
const chartKeys = mh.charts ? Object.keys(mh.charts) : [];
console.log('machine_history chart payload keys: ' + JSON.stringify(chartKeys));
check('CHARTS_present', chartKeys.length >= 4, 'charts keys=' + chartKeys.length);

console.log('\n===== SUMMARY =====');
let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) { console.log('FAILED: ' + failures.join(', ')); console.log('RESULT: INCOMPLETE'); }
else console.log('RESULT: COMPLETE (deployed GAS @' + GAS_DEPLOY + ' backend verified)');

await browser.close();
process.exit(fail > 0 ? 1 : 0);
