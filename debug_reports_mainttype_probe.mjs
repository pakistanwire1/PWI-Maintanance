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
  return j.data || j;
};

const base = {
  reportType: 'machine_history', division: '', section: '', department: '', machineNumber: '',
  technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '2020-01-01', toDate: '2030-12-31'
};

console.log('--- getReportFilterOptions ---');
const opts = await api('getReportFilterOptions', {});
console.log('maintenanceTypes:', JSON.stringify(opts.maintenanceTypes));
console.log('priorities:', JSON.stringify(opts.priorities));
console.log('statuses:', JSON.stringify(opts.statuses));

console.log('\n--- maintenanceType filter tests ---');
for (const mt of ['', 'Breakdown Maintenance', 'Preventive Maintenance', 'Breakdown Electrical', 'All']) {
  const r = await api('getReportData', { ...base, maintenanceType: mt });
  console.log('mt=' + JSON.stringify(mt) + ' -> rows=' + (r.rows ? r.rows.length : 0));
}

console.log('\n--- breakdown by MaintenanceType from full dataset ---');
const all = (await api('getReportData', base)).rows || [];
const dist = {};
all.forEach(r => { const k = r.MaintenanceType || '(blank)'; dist[k] = (dist[k] || 0) + 1; });
console.log(JSON.stringify(dist, null, 0));

await browser.close();
console.log('DONE');
