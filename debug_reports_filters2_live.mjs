import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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
  return res.json();
};

const base = {
  reportType: 'machine_history',
  division: '', section: '', department: '', machineNumber: '',
  technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '2026-01-01', toDate: '2026-12-31'
};

const run = async (label, data) => {
  const r = await api('getReportData', Object.assign({}, base, data));
  if (r.success === false) { console.log(label + ' => ERROR: ' + r.error); return; }
  const rows = (r.data && r.data.rows) || [];
  console.log(label + ' => rows=' + rows.length);
};

console.log('=== CORRECT-VALUE PROBES ===');
await run('baseline (2026)', {});
await run('division "Spoke Division"', { division: 'Spoke Division' });
await run('division "Control Cable Division"', { division: 'Control Cable Division' });
await run('section "Spoke"', { section: 'Spoke' });
await run('section "Auto Plating"', { section: 'Auto Plating' });
await run('department "Swagging"', { department: 'Swagging' });
await run('department "Spoke"', { department: 'Spoke' });
await run('machine "Swagging" (name)', { machine: 'Swagging' });
await run('machineNumber "SW # 06"', { machineNumber: 'SW # 06' });
await run('machineNumber "SP # 05"', { machineNumber: 'SP # 05' });
await run('maintenanceType "Breakdown Maintenance"', { maintenanceType: 'Breakdown Maintenance' });
await run('maintenanceType "Preventive Maintenance"', { maintenanceType: 'Preventive Maintenance' });
await run('maintenanceType "Breakdown Electrical"', { maintenanceType: 'Breakdown Electrical' });
await run('priority "High"', { priority: 'High' });
await run('status "RUNNING"', { status: 'RUNNING' });
await run('date Jul 2026', { fromDate: '2026-07-01', toDate: '2026-07-31' });
await run('date Jul 23 2026', { fromDate: '2026-07-23', toDate: '2026-07-23' });
await run('combo div=Spoke Division sec=Spoke dept=Spoke', { division: 'Spoke Division', section: 'Spoke', department: 'Spoke' });
await run('combo + machine=Swagging', { division: 'Spoke Division', section: 'Spoke', department: 'Swagging', machine: 'Swagging' });
await run('combo + tech=ARIF', { division: 'Spoke Division', technician: 'ARIF' });
await run('impossible combo (must be 0)', { division: 'Spoke Division', section: 'Auto Plating' });

await browser.close();
console.log('DONE');
