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
  fromDate: '2020-01-01', toDate: '2030-12-31'
};

const r = await api('getReportData', base);
const rows = (r.data && r.data.rows) || [];
console.log('total rows:', rows.length);
console.log('kpi:', JSON.stringify(r.data.kpi));

const distinct = (key) => {
  const m = {};
  rows.forEach(row => { const v = row[key]; if (v !== undefined && v !== null && v !== '') m[v] = (m[v] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

console.log('\n--- distinct Division ---'); console.log(JSON.stringify(distinct('Division'), null, 0));
console.log('--- distinct Section ---'); console.log(JSON.stringify(distinct('Section'), null, 0));
console.log('--- distinct Department ---'); console.log(JSON.stringify(distinct('Department'), null, 0));
console.log('--- distinct Machine ---'); console.log(JSON.stringify(distinct('Machine'), null, 0));
console.log('--- distinct MachineNumber ---'); console.log(JSON.stringify(distinct('MachineNumber'), null, 0));
console.log('--- distinct MaintenanceType ---'); console.log(JSON.stringify(distinct('MaintenanceType'), null, 0));
console.log('--- distinct Technician ---'); console.log(JSON.stringify(distinct('Technician'), null, 0));
console.log('--- distinct OpenDate ---'); console.log(JSON.stringify(distinct('OpenDate'), null, 0));
console.log('--- distinct Priority ---'); console.log(JSON.stringify(distinct('Priority'), null, 0));
console.log('--- distinct CurrentStatus ---'); console.log(JSON.stringify(distinct('CurrentStatus'), null, 0));

const first = rows[0];
console.log('\n--- first 3 rows (full) ---');
rows.slice(0, 3).forEach((row, i) => console.log('ROW ' + i + ': ' + JSON.stringify(row)));

await browser.close();
console.log('DONE');
