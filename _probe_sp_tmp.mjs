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
  const res = await fetch(BASE + '/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token, data }) });
  const j = await res.json();
  if (j && j.error) return { error: j.error };
  return j.data || j;
};

const base = { reportType: 'machine_history', division: '', section: '', department: '', machineNumber: '', technician: '', maintenanceType: '', priority: '', status: '', fromDate: '', toDate: '' };

const total = await api('getReportData', { ...base });
const rows = total.rows || [];
console.log('machine_history total rows:', rows.length);

const machines = {};
for (const r of rows) {
  const mn = r.MachineNumber || r.machineNumber || r.Machine_Number || '';
  const key = mn || '(empty)';
  machines[key] = (machines[key] || 0) + 1;
}
const entries = Object.entries(machines).sort((a, b) => b[1] - a[1]);
console.log('MachineNumber value distribution:');
for (const [k, v] of entries) console.log('  ' + JSON.stringify(k) + ' x' + v);

const sp = await api('getReportData', { ...base, machineNumber: 'SP # 05' });
console.log('machineNumber="SP # 05" ->', (sp.rows || []).length, 'rows');

const nm = rows.slice(0, 12).map(r => ({ name: r.MachineName || r.machine_name || r.Machine || '', num: r.MachineNumber || '', mType: r.MaintenanceType || r.maintenanceType || '' }));
console.log('sample row machine-name + maint-type fields:', JSON.stringify(nm));

const sw = await api('getReportData', { ...base, machineNumber: 'SW # 06' });
console.log('machineNumber="SW # 06" ->', (sw.rows || []).length, 'rows');

const spRows = rows.filter(r => String(r.MachineNumber || r.machineNumber || '').includes('SP'));
console.log('rows whose MachineNumber contains "SP":', spRows.length);
console.log('sample SP-like rows MachineNumbers:', JSON.stringify([...new Set(spRows.map(r => r.MachineNumber || r.machineNumber || ''))].slice(0, 10)));

for (const rt of ['technician_performance', 'machine_performance']) {
  const r = await api('getReportData', { ...base, reportType: rt });
  console.log('---', rt, '---');
  console.log('keys:', Object.keys(r || {}));
  console.log('rows:', (r && r.rows || []).length);
  console.log('columns:', JSON.stringify((r && r.columns || []).slice(0, 8)));
  console.log('kpi:', JSON.stringify((r && r.kpi) || {}));
  console.log('sample row:', JSON.stringify((r && r.rows || [])[0]));
}
const techRows = rows.filter(r => (r.Technician || r.technician || '') !== '');
console.log('rows with a technician value in machine_history:', techRows.length);
console.log('unique technicians:', JSON.stringify([...new Set(techRows.map(r => r.Technician || r.technician))].slice(0, 20)));

for (let i = 1; i <= 5; i++) {
  const r = await api('getReportData', { ...base, reportType: 'technician_performance' });
  console.log('technician_performance attempt', i, '-> rows:', (r && r.rows || []).length, 'err:', (r && r.error) || 'none');
  await sleep(1500);
}
for (let i = 1; i <= 5; i++) {
  const r = await api('getReportData', { ...base });
  console.log('machine_history attempt', i, '-> rows:', (r && r.rows || []).length, 'err:', (r && r.error) || 'none');
  await sleep(1500);
}

await browser.close();
