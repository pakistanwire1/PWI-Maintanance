import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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

console.log('=== 1. getJobCards: BreakdownType / MaintenanceType / Machine / Department / Section / Priority / CurrentStatus / AssignedTechnician vocab ===');
const jcs = await api('getJobCards', { limit: 100000 });
const arr = Array.isArray(jcs) ? jcs : (jcs.data || jcs.list || jcs.records || []);
const distinct = (key) => {
  const m = {};
  arr.forEach(j => { const v = j[key] || '(blank)'; m[v] = (m[v] || 0) + 1; });
  return m;
};
const show = (label, key) => { console.log(label + ': ' + JSON.stringify(distinct(key), null, 1)); };
show('BreakdownType', 'BreakdownType');
show('MaintenanceType', 'MaintenanceType');
show('Machine', 'Machine');
show('Department', 'Department');
show('Section', 'Section');
show('Priority', 'Priority');
show('CurrentStatus', 'CurrentStatus');
show('AssignedTechnician', 'AssignedTechnician');
console.log('total jobcards: ' + arr.length);

console.log('\n=== 2. getReportFilterOptions ===');
const opts = await api('getReportFilterOptions');
console.log('maintenanceTypes: ' + JSON.stringify(opts.maintenanceTypes));
console.log('priorities: ' + JSON.stringify(opts.priorities));
console.log('statuses: ' + JSON.stringify(opts.statuses));
console.log('technicians count: ' + (opts.technicians || []).length);

console.log('\n=== 3. getBreakdownTypes (canonical sheet) ===');
console.log(JSON.stringify(await api('getBreakdownTypes')));

console.log('\n=== 4. getMachineCascade ===');
const cascade = await api('getMachineCascade', { divisionId: '', sectionId: '', deptId: '' });
console.log('divisions: ' + JSON.stringify(cascade.divisions));
console.log('sections: ' + JSON.stringify((cascade.sections || []).slice(0, 12)));
console.log('departments: ' + JSON.stringify((cascade.departments || []).slice(0, 20)));

console.log('\n=== 5. getReportData per report type (no filters) ===');
const base = { reportType: 'machine_history', division: '', section: '', department: '', machineNumber: '', technician: '', maintenanceType: '', priority: '', status: '', fromDate: '2020-01-01', toDate: '2030-12-31' };
for (const rt of ['machine_history', 'breakdown_history', 'preventive_maintenance']) {
  const f = { ...base, reportType: rt };
  const res = await api('getReportData', f);
  const rows = (res && res.rows) || [];
  console.log(rt.padEnd(26) + ' rows=' + rows.length);
  if (rows.length) {
    const mt = {};
    rows.forEach(r => { const v = r.MaintenanceType || '(blank)'; mt[v] = (mt[v] || 0) + 1; });
    console.log('  MaintenanceType in rows: ' + JSON.stringify(mt));
  }
}

console.log('\n=== 6. getReportData maintenanceType filter (machine_history) ===');
for (const mt of ['Breakdown Maintenance', 'Preventive Maintenance', 'Breakdown Electrical', 'Breakdown', 'Preventive', 'Electrical', 'Mechanical', 'Corrective', 'Emergency', 'Routine', 'All']) {
  const f = { ...base, maintenanceType: mt };
  const res = await api('getReportData', f);
  const rows = (res && res.rows) || [];
  console.log('maintenanceType=' + mt.padEnd(24) + ' rows=' + rows.length);
}

console.log('\n=== 7. department_performance / machine_performance / technician_performance aggregation ===');
for (const rt of ['department_performance', 'machine_performance', 'technician_performance']) {
  const f = { ...base, reportType: rt };
  const res = await api('getReportData', f);
  const rows = (res && res.rows) || [];
  console.log(rt.padEnd(26) + ' rows=' + rows.length + ' sample=' + JSON.stringify(rows[0] || null));
}

await browser.close();
console.log('DONE');
