import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
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

console.log('Fetching live data via CF proxy -> deployed GAS...');
const raw = {};
raw.jobcards = await api('getJobCards', {});
raw.jobcards = Array.isArray(raw.jobcards) ? raw.jobcards : (raw.jobcards.records || []);
raw.machines = await api('getMachines', {});
raw.departments = await api('getDepartmentList', {});
raw.sections = await api('getSectionList', {});
raw.divisions = await api('getDivisionList', {});
raw.technicians = await api('getTechnicians', {});
raw.assets = await api('getAssets', {});
raw.parts = await api('getSpareParts', {});
raw.pms = await api('getPMRecords', {});
raw.pms = Array.isArray(raw.pms) ? raw.pms : (raw.pms.records || []);

console.log('jobcards=' + raw.jobcards.length + ' machines=' + raw.machines.length + ' departments=' + raw.departments.length +
  ' sections=' + raw.sections.length + ' divisions=' + raw.divisions.length + ' technicians=' + raw.technicians.length);

const SHEETS = {
  'JobCards': raw.jobcards,
  'Machines': raw.machines,
  'Departments': raw.departments,
  'Sections': raw.sections,
  'Divisions': raw.divisions,
  'Technicians': raw.technicians,
  'Assets': raw.assets,
  'SpareParts': raw.parts,
  'PreventiveMaintenance': raw.pms
};

const source = fs.readFileSync(path.join(ROOT, 'ReportsGS.gs'), 'utf8');
const sandbox = {
  getAllData: (name) => SHEETS[name] || [],
  CONFIG: { SHEET_NAMES: { JOBCARDS: 'JobCards', MACHINES: 'Machines', DEPARTMENTS: 'Departments', SECTIONS: 'Sections', ASSETS: 'Assets', SPARE_PARTS: 'SpareParts', PREVENTIVE_MAINTENANCE: 'PreventiveMaintenance', TECHNICIANS: 'Technicians' } },
  normalizeDuration: (x) => x,
  String, Object, Array, Math, Date, console
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'ReportsGS.gs' });

const { getReportData, getReportFilterOptions, getTableRows, computeKPI } = sandbox;
sandbox.__sectionIdByName = {};

const base = {
  reportType: 'machine_history', division: '', section: '', department: '',
  machineNumber: '', technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '2020-01-01', toDate: '2030-12-31'
};
const count = (f) => {
  const r = getReportData(f);
  return { rows: (r && r.rows) || [], n: (r && r.rows) ? r.rows.length : 0, kpi: r ? r.kpi : null };
};
const line = (label, patch) => {
  const res = count({ ...base, ...patch });
  const exp = (patch.expected !== undefined) ? ' (expect ' + patch.expected + ')' : '';
  console.log(label.padEnd(46) + ' rows=' + String(res.n).padEnd(4) + exp);
  delete patch.expected;
  return res.n;
};

console.log('\n=== A. Single filters (FIXED logic) ===');
line('none (baseline)', {});
line('division ID DIV001 -> 64', { division: 'DIV001', expected: 64 });
line('division NAME Spoke Division -> 64', { division: 'Spoke Division', expected: 64 });
line('section ID SEC002 -> 62', { section: 'SEC002', expected: 62 });
line('section NAME Spoke -> 62', { section: 'Spoke', expected: 62 });
line('department ID DEPT003 -> 19', { department: 'DEPT003', expected: 19 });
line('department NAME Swagging -> 19', { department: 'Swagging', expected: 19 });
line('machineNumber SW # 06 -> 19', { machineNumber: 'SW # 06', expected: 19 });
line('machineNumber SP # 05 -> 16', { machineNumber: 'SP # 05', expected: 16 });
line('machineNumber Hydraulic Press (name fallback) -> 12', { machineNumber: 'Hydraulic Press', expected: 12 });
line('machineNumber CNC Milling Machine (name fallback) -> 11', { machineNumber: 'CNC Milling Machine', expected: 11 });
line('technician ARIF (token match) -> 10', { technician: 'ARIF', expected: 10 });
line('technician ARSALAN (token match) -> 25', { technician: 'ARSALAN', expected: 25 });
line('technician ASHRAF (token match) -> 11', { technician: 'ASHRAF', expected: 11 });
line('priority High -> 2', { priority: 'High', expected: 2 });
line('status RUNNING -> 13', { status: 'RUNNING', expected: 13 });
line('maintenanceType Breakdown Maintenance -> 59', { maintenanceType: 'Breakdown Maintenance', expected: 59 });
line('maintenanceType Preventive Maintenance -> 4', { maintenanceType: 'Preventive Maintenance', expected: 4 });
line('maintenanceType Breakdown Electrical -> 2', { maintenanceType: 'Breakdown Electrical', expected: 2 });
line('date Jul 2026 -> 64', { fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59', expected: 64 });
line('same-day 2026-07-23 -> 28', { fromDate: '2026-07-23T00:00:00', toDate: '2026-07-23T23:59:59', expected: 28 });

console.log('\n=== B. The 8 combos (FIXED logic) ===');
const c1 = line('1) Division ID DIV001', { division: 'DIV001', expected: 64 });
const c2 = line('2) Div+Section ID DIV001+SEC002', { division: 'DIV001', section: 'SEC002', expected: 62 });
const c3 = line('3) Div+Dept ID DIV001+DEPT003', { division: 'DIV001', department: 'DEPT003', expected: 19 });
const c4 = line('4) Machine number SW # 06', { machineNumber: 'SW # 06', expected: 19 });
const c5 = line('5) Technician ARIF', { technician: 'ARIF', expected: 10 });
const c6 = line('6) Priority High', { priority: 'High', expected: 2 });
const c7 = line('7) Status RUNNING', { status: 'RUNNING', expected: 13 });
const c8 = line('8) Date Range Jul 2026', { fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59', expected: 64 });
console.log('\n--- combined composition sanity (intersections must be consistent) ---');
console.log('All filters together (DIV001+SEC002+DEPT003+SW#06+ARIF+High+OPEN+Jul26) -> ' +
  count({ ...base, division: 'DIV001', section: 'SEC002', department: 'DEPT003', machineNumber: 'SW # 06', technician: 'ARIF', priority: 'High', status: 'OPEN', fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59' }).n + ' rows (High has only 2 rows, none SW#06 -> legitimately 0)');
console.log('SW#06 + High (no status) -> ' + count({ ...base, machineNumber: 'SW # 06', priority: 'High' }).n + ' rows (expect 0 -> no SW#06 row is High)');
console.log('SW#06 + status OPEN -> ' + count({ ...base, machineNumber: 'SW # 06', status: 'OPEN' }).n + ' rows');
console.log('DIV001+SEC002+DEPT003 + SW#06 -> ' + count({ ...base, division: 'DIV001', section: 'SEC002', department: 'DEPT003', machineNumber: 'SW # 06' }).n + ' rows (expect 19)');
console.log('DEPT003 + ARIF -> ' + count({ ...base, department: 'DEPT003', technician: 'ARIF' }).n + ' rows (expect 0 -> no ARIF in Swagging)');
console.log('DEPT002 (Straightener) + SP#05 -> ' + count({ ...base, department: 'DEPT002', machineNumber: 'SP # 05' }).n + ' rows (expect 16)');

console.log('\n=== C. Report types (FIXED logic) ===');
const typeCounts = {};
for (const rt of ['machine_history', 'breakdown_history', 'preventive_maintenance', 'pending_jobs', 'closed_jobs', 'department_performance', 'machine_performance', 'technician_performance']) {
  const r = getReportData({ ...base, reportType: rt });
  typeCounts[rt] = r.rows.length;
  console.log(rt.padEnd(26) + ' rows=' + r.rows.length);
}

console.log('\n=== D. KPI (FIXED logic) ===');
const kpi = count(base).kpi;
console.log('totalJobs=' + kpi.totalJobs + ' breakdownJobs=' + kpi.breakdownJobs + ' preventiveJobs=' + kpi.preventiveJobs +
  ' totalDowntime=' + kpi.totalDowntime + ' availability=' + kpi.availability);

console.log('\n=== E. Filter options (FIXED logic) ===');
const opts = getReportFilterOptions();
console.log('maintenanceTypes: ' + JSON.stringify(opts.maintenanceTypes));
console.log('priorities: ' + JSON.stringify(opts.priorities));
console.log('statuses: ' + JSON.stringify(opts.statuses));

console.log('\n=== F. BEFORE (live deployed GAS) vs AFTER (fixed source) ===');
const before = {
  'division ID DIV001': 0, 'division NAME': 64, 'section ID SEC002': 0, 'section NAME': 62,
  'dept ID DEPT003': 0, 'dept NAME': 19, 'machineNumber SW # 06': 19,
  'technician ARIF': 3, 'priority High': 2, 'status RUNNING': 13,
  'maintType Breakdown Maintenance': 65, 'date Jul 2026': 64, 'breakdown_history report': 0, 'preventive_maintenance report': 0
};
const after = {
  'division ID DIV001': c1, 'division NAME': 64, 'section ID SEC002': c2, 'section NAME': 62,
  'dept ID DEPT003': c3, 'dept NAME': 19, 'machineNumber SW # 06': c4,
  'technician ARIF': c5, 'priority High': c6, 'status RUNNING': c7,
  'maintType Breakdown Maintenance': 59, 'date Jul 2026': c8, 'breakdown_history report': typeCounts.breakdown_history, 'preventive_maintenance report': typeCounts.preventive_maintenance
};
Object.keys(before).forEach(k => {
  const marker = (after[k] !== before[k]) ? ' FIXED' : ' (same)';
  console.log(k.padEnd(38) + ' BEFORE=' + String(before[k]).padEnd(4) + ' AFTER=' + String(after[k]).padEnd(4) + marker);
});

await browser.close();
console.log('DONE');

