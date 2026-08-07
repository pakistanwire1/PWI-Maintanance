import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:8788';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
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

const base = { reportType: 'machine_history', division: '', section: '', department: '', machineNumber: '', technician: '', maintenanceType: '', priority: '', status: '', fromDate: '2026-01-01T00:00:00', toDate: '2026-12-31T23:59:59' };
const r = await api('getReportData', base);
const rows = (r.data && r.data.rows) || [];
console.log('total rows:', rows.length);

// simulate NEW getReportFilterOptions derivation
const seen = {};
rows.forEach(row => { const mt = row.MaintenanceType || ''; if (mt) seen[mt] = (seen[mt] || 0) + 1; });
const mtList = Object.keys(seen).sort();
console.log('derived maintenanceTypes:', JSON.stringify(['All'].concat(mtList)));

// simulate NEW exact-match filter
console.log('\n--- simulated NEW filter results ---');
console.log('All ->', rows.length);
for (const mt of mtList) {
  const ft = mt.toLowerCase();
  const n = rows.filter(row => (row.MaintenanceType || '').toLowerCase() === ft).length;
  console.log(JSON.stringify(mt), '->', n);
}
// sanity: sum of exact-match buckets equals total
const sum = mtList.reduce((acc, mt) => acc + (rows.filter(row => (row.MaintenanceType || '').toLowerCase() === mt.toLowerCase()).length), 0);
console.log('\nbucket sum =', sum, '(equals total:', sum === rows.length, ')');

await browser.close();
