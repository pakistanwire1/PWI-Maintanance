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
  const j = await res.json();
  if (j && j.error) return { error: j.error };
  return j.data || j;
};

const base = {
  reportType: 'machine_history',
  division: '', section: '', department: '', machineNumber: '',
  technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '2020-01-01', toDate: '2030-12-31'
};

const R = {};
R.total = (await api('getReportData', base)).rows ? (await api('getReportData', base)).rows.length : 0;

const test = async (label, patch) => {
  const f = { ...base, ...patch };
  const res = await api('getReportData', f);
  const rows = (res && res.rows) || [];
  R[label] = { payload: patch, rows: rows.length };
  console.log(label.padEnd(28) + ' rows=' + rows.length + '  payload=' + JSON.stringify(patch));
  return rows.length;
};

console.log('TOTAL rows (no filter): ' + R.total + '\n');

// division: try both NAME and ID
await test('division NAME Spoke Division', { division: 'Spoke Division' });
await test('division ID DIV001', { division: 'DIV001' });
// section: NAME and ID
await test('section NAME Spoke', { section: 'Spoke' });
await test('section ID SEC001', { section: 'SEC001' });
// department NAME and ID
await test('dept NAME Swagging', { department: 'Swagging' });
await test('dept ID DEPT003', { department: 'DEPT003' });
// machine number
await test('machineNumber SW # 06', { machineNumber: 'SW # 06' });
// technician
await test('technician ARIF', { technician: 'ARIF' });
// priority
await test('priority High', { priority: 'High' });
// status
await test('status RUNNING', { status: 'RUNNING' });
// maintenance type
await test('maintType Breakdown Maintenance', { maintenanceType: 'Breakdown Maintenance' });
// date range July 2026
await test('date Jul 2026', { fromDate: '2026-07-01T00:00:00', toDate: '2026-07-31T23:59:59' });
// same day
await test('same-day 2026-07-23', { fromDate: '2026-07-23T00:00:00', toDate: '2026-07-23T23:59:59' });
// combos
await test('div+sec+dept NAME', { division: 'Spoke Division', section: 'Spoke', department: 'Swagging' });
await test('div+sec+dept ID', { division: 'DIV001', section: 'SEC001', department: 'DEPT003' });
await test('machine+prio+status', { machineNumber: 'SW # 06', priority: 'High', status: 'OPEN' });

console.log('\n--- machineNumber vs Machine column check ---');
const all = (await api('getReportData', base)).rows || [];
const machMap = {};
all.forEach(r => { const k = r.Machine; (machMap[k] = machMap[k] || []).push(r.MachineNumber || ''); });
console.log('Machine -> MachineNumbers: ' + JSON.stringify(machMap));

await browser.close();
console.log('DONE');
