import puppeteer from 'puppeteer-core';

const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(GAS, { waitUntil: 'networkidle2', timeout: 240000 });

async function findGasFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null;
const t0 = Date.now();
while (Date.now() - t0 < 180000) {
  gasFrame = await findGasFrame();
  if (gasFrame) {
    const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
    if (hasForm) break;
  }
  await sleep(3000);
}
if (!gasFrame) { console.log('FATAL: no GAS frame'); process.exit(2); }

await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 240000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('reports'));
await gasFrame.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 240000 });
await sleep(1500);

const setVal = (id, value) => gasFrame.evaluate(({ id, value }) => { const el = document.getElementById(id); if (el) el.value = value; }, { id, value });
const setSel = (id, value) => gasFrame.evaluate(({ id, value }) => { const el = document.getElementById(id); if (!el) return; el.value = value; el.dispatchEvent(new Event('change')); }, { id, value });
const val = id => gasFrame.evaluate(i => { const el = document.getElementById(i); return el ? el.value : ''; }, id);

const genAndRead = async () => {
  await gasFrame.evaluate(() => generateReport());
  await sleep(4000);
  return gasFrame.evaluate(() => ({
    rows: document.querySelectorAll('#rptTableBody tr').length,
    count: (document.getElementById('rptRecordCount') || {}).textContent || ''
  }));
};

const resetAll = async () => {
  for (const id of ['rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptPriority', 'rptStatus']) await setVal(id, '');
  await setVal('rptMaintType', 'All');
  await setVal('rptType', 'machine_history');
};

console.log('=== GAS FILTER MATRIX (with Generate press) ===');
await resetAll();
let r = await genAndRead();
console.log('baseline machine_history'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// division
await setSel('rptDivision', 'DIV001'); await sleep(1500);
r = await genAndRead();
console.log('division DIV001'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// division + section
await setSel('rptSection', 'SEC002'); await sleep(1500);
r = await genAndRead();
console.log('DIV001 + SEC002'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// + department DEPT003
await setSel('rptDepartment', 'DEPT003'); await sleep(1500);
r = await genAndRead();
console.log('DIV001+SEC002+DEPT003'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// machine number SW # 06
await setSel('rptMachineNumber', 'SW # 06'); await sleep(1500);
r = await genAndRead();
console.log('machine SW # 06'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// technician ARIF
await resetAll(); await sleep(500);
await setSel('rptTechnician', 'ARIF');
r = await genAndRead();
console.log('technician ARIF'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// priority High
await resetAll(); await sleep(500);
await setSel('rptPriority', 'High');
r = await genAndRead();
console.log('priority High'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// status RUNNING
await resetAll(); await sleep(500);
await setSel('rptStatus', 'RUNNING');
r = await genAndRead();
console.log('status RUNNING'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// maintenanceType Breakdown
await resetAll(); await sleep(500);
await setSel('rptMaintType', 'Breakdown');
r = await genAndRead();
console.log('maintType Breakdown'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// date range July
await resetAll(); await sleep(500);
await setVal('rptFromDate', '2026-07-01'); await setVal('rptToDate', '2026-07-31');
r = await genAndRead();
console.log('date Jul 2026'.padEnd(32) + ' rows=' + r.rows + ' ' + r.count);

// combo: division NAME sent manually (simulating CF-style)
await resetAll(); await sleep(500);
await setVal('rptDivision', 'DIV001');
r = await genAndRead();
console.log('(raw) division value=' + JSON.stringify(await val('rptDivision')).padEnd(2) + ' rows=' + r.rows);

console.log('\n=== PAGINATION SCAN ACROSS REPORT TYPES ===');
const types = ['machine_history','breakdown_history','preventive_maintenance','technician_performance','department_performance','machine_performance','machine_utilization','pending_jobs','closed_jobs','approval_history','downtime_analysis','complaint_analysis','root_cause_analysis','spare_parts_consumption','maintenance_cost','asset_history'];
for (const t of types) {
  await resetAll(); await sleep(300);
  await setVal('rptType', t);
  await gasFrame.evaluate(() => generateReport());
  await sleep(3500);
  const info = await gasFrame.evaluate(() => {
    const pg = document.getElementById('reportsPage');
    return {
      pag: !!pg.querySelector('.pagination'),
      pagText: pg.querySelector('.pagination') ? pg.querySelector('.pagination').textContent.trim().slice(0, 120) : '',
      rows: document.querySelectorAll('#rptTableBody tr').length,
      count: (document.getElementById('rptRecordCount') || {}).textContent || ''
    };
  });
  console.log(t.padEnd(28) + ' rows=' + info.rows + ' pagination=' + info.pag + (info.pag ? ' TEXT=' + JSON.stringify(info.pagText) : ''));
}

await browser.close();
console.log('DONE');
