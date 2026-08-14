import puppeteer from 'puppeteer-core';
const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 }).catch(() => {});
await page.waitForSelector('#pageContent', { timeout: 60000 });
const token = await page.evaluate(() => localStorage.getItem('cmms_token'));
const api = async (action, data) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(BASE + '/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token, data }) });
    const j = await res.json();
    if (j && j.error) { await sleep(1200); continue; }
    return j.data || j;
  }
  return { error: 'persistent' };
};

const base = { reportType: 'machine_history', division: '', section: '', department: '', machineNumber: '', technician: '', maintenanceType: '', priority: '', status: '', fromDate: '', toDate: '' };
const count = async (id, patch) => {
  const r = await api('getReportData', { ...base, ...patch });
  console.log(id + ': rows=' + (r.rows || []).length + ' err=' + ((r.error) || 'none'));
  return (r.rows || []).length;
};

await count('F_total', {});
await count('F_div_ID', { division: 'DIV001' });
await count('F_div_NAME', { division: 'Spoke Division' });
await count('F_sec_ID', { section: 'SEC002' });
await count('F_sec_NAME', { section: 'Spoke' });
await count('F_dept_ID', { department: 'DEPT003' });
await count('F_dept_NAME', { department: 'Swagging' });
await count('F_mach_sw06', { machineNumber: 'SW # 06' });
await count('F_mach_sp07', { machineNumber: 'SP # 07' });
await count('F_mach_st05', { machineNumber: 'ST # 05' });
await count('F_mach_name_spoke', { machineNumber: 'Spoke' });
await count('F_tech_ARIF', { technician: 'ARIF' });
await count('F_tech_ARSALAN', { technician: 'ARSALAN' });
await count('F_prio_High', { priority: 'High' });
await count('F_status_RUNNING', { status: 'RUNNING' });
await count('F_maint_BD', { maintenanceType: 'Breakdown Maintenance' });
await count('F_maint_PM', { maintenanceType: 'Preventive Maintenance' });
await count('F_maint_BDE', { maintenanceType: 'Breakdown Electrical' });
await count('F_date_jul', { fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59' });
await count('F_date_sameday', { fromDate: '2026-07-23T00:00:00', toDate: '2026-07-23T23:59:59' });
await count('C_div_sec_dept_ID', { division: 'DIV001', section: 'SEC002', department: 'DEPT003' });
await count('C_div_sec_dept_NAME', { division: 'Spoke Division', section: 'Spoke', department: 'Swagging' });
await count('C_mach_prio_status', { machineNumber: 'SW # 06', priority: 'High', status: 'OPEN' });
await count('C_dept_tech', { department: 'DEPT003', technician: 'ARIF' });
await count('C_dept_mach', { department: 'DEPT002', machineNumber: 'SP # 07' });
await count('C_div_date', { division: 'DIV001', fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59' });
await count('C_maint_mach', { maintenanceType: 'Breakdown Maintenance', machineNumber: 'SW # 06' });
await count('C_tech_status', { technician: 'ARSALAN', status: 'RUNNING' });

for (const rt of ['machine_history', 'breakdown_history', 'preventive_maintenance', 'technician_performance', 'department_performance', 'machine_performance', 'machine_utilization', 'pending_jobs', 'closed_jobs', 'approval_history']) {
  const r = await api('getReportData', { ...base, reportType: rt });
  console.log('T_' + rt + ': rows=' + (r.rows || []).length + ' cols=' + ((r.columns || []).length));
  await sleep(1200);
}
const mh = await api('getReportData', { ...base });
console.log('KPI: breakdown=' + mh.kpi.breakdownJobs + ' preventive=' + mh.kpi.preventiveJobs + ' total=' + mh.kpi.totalJobs);

await browser.close();
