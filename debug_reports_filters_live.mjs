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
  const res = await fetch(BASE + '/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, data })
  });
  return res.json();
};

const J = (o) => JSON.stringify(o, null, 1);

// --- baseline master data ---
const opts = await api('getReportFilterOptions', {});
const casc = await api('getMachineCascade', { divisionId: '', sectionId: '', deptId: '' });
console.log('=== MASTER ===');
console.log('technicians:', J(opts.data.technicians));
console.log('maintenanceTypes:', J(opts.data.maintenanceTypes));
console.log('priorities:', J(opts.data.priorities));
console.log('statuses:', J(opts.data.statuses));
console.log('divisions:', J(casc.data.divisions.map(d => ({ id: d.id, name: d.name }))));
console.log('sections:', J(casc.data.sections.map(s => ({ id: s.id, name: s.name })).slice(0, 10)));
console.log('departments:', J(casc.data.departments.map(d => ({ id: d.ID || d.id, name: d.Name || d.name })).slice(0, 10)));
console.log('machines:', J(casc.data.machines.map(m => ({ num: m.number, name: m.name })).slice(0, 6)));

const base = {
  reportType: 'machine_history',
  division: '', section: '', department: '', machineNumber: '',
  technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '2020-01-01', toDate: '2030-12-31'
};

const run = async (label, data) => {
  const r = await api('getReportData', Object.assign({}, base, data));
  if (r.success === false) { console.log(label + ' => ERROR: ' + r.error); return; }
  const d = r.data || {};
  const rows = d.rows || [];
  console.log(label + ' => rows=' + rows.length + ' totalJobs=' + (d.kpi ? d.kpi.totalJobs : '?'));
};

console.log('\n=== FILTER PROBES (expect: filter reduces rows; wrong value => 0) ===');
await run('baseline (no filters)', {});

const firstDiv = casc.data.divisions[0];
const firstSec = casc.data.sections.find(s => true) || {};
const firstDept = casc.data.departments[0] || {};
const firstMach = casc.data.machines[0] || {};

await run('division ID ' + firstDiv.id, { division: firstDiv.id });
await run('division NAME ' + firstDiv.name, { division: firstDiv.name });

const secNameOf = casc.data.sections.find(s => s.id === firstSec.id);
await run('section ID ' + firstSec.id, { section: firstSec.id });
await run('section NAME ' + (secNameOf ? secNameOf.name : '?'), { section: secNameOf ? secNameOf.name : '' });

const deptNameOf = casc.data.departments.find(d => (d.ID || d.id) === (firstDept.ID || firstDept.id));
await run('department ID ' + (firstDept.ID || firstDept.id), { department: firstDept.ID || firstDept.id });
await run('department NAME ' + (deptNameOf ? deptNameOf.Name || deptNameOf.name : '?'), { department: deptNameOf ? deptNameOf.Name || deptNameOf.name : '' });

await run('machineNumber ' + firstMach.number, { machineNumber: firstMach.number });
await run('machine NAME ' + firstMach.name, { machine: firstMach.name });

const tech = (opts.data.technicians || [])[0];
await run('technician ' + tech, { technician: tech });

const mt = (opts.data.maintenanceTypes || [])[1];
await run('maintenanceType ' + mt, { maintenanceType: mt });

const pri = (opts.data.priorities || [])[0];
await run('priority ' + pri, { priority: pri });

const st = (opts.data.statuses || [])[0];
await run('status ' + st, { status: st });

// combined: division ID + section NAME + department NAME + machineNumber (the plausible working combo)
const secForMach = casc.data.sections.find(s => s.id === (firstMach.id ? null : s.id));
const divName = firstDiv.name;
const secName = secNameOf ? secNameOf.name : '';
await run('combo IDs (div=' + firstDiv.id + ' sec=' + firstSec.id + ' dept=' + (firstDept.ID || firstDept.id) + ')', { division: firstDiv.id, section: firstSec.id, department: firstDept.ID || firstDept.id });
await run('combo NAMES (div=' + divName + ' sec=' + secName + ' dept=' + (deptNameOf ? deptNameOf.Name || deptNameOf.name : '') + ')', { division: divName, section: secName, department: deptNameOf ? deptNameOf.Name || deptNameOf.name : '' });

// date narrowing
await run('date 2025 only', { fromDate: '2025-01-01', toDate: '2025-12-31' });
await run('date 2020 only', { fromDate: '2020-01-01', toDate: '2020-12-31' });

await browser.close();
console.log('DONE');
