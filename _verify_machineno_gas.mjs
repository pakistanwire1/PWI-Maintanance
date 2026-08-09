import puppeteer from 'puppeteer-core';

const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && t.indexOf('net::ERR') === -1) consoleErrors.push(t); });
page.on('pageerror', e => pageErrors.push(e.message));

const t0 = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickFrame();
while (!app && Date.now() - t0 < 120000) { await sleep(2000); app = await pickFrame(); }
if (!app) { console.log('FATAL no frame'); await browser.close(); process.exit(2); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
check('login_frame', true, 'GAS iframe login form ready at ' + Math.round((Date.now() - t0) / 1000) + 's');

await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, EMAIL, PASSWORD);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
check('login_ok', true, 'GAS legacy app logged in at ' + Math.round((Date.now() - t0) / 1000) + 's');
await sleep(1500);

async function openPage(trigger) {
  await app.evaluate((t) => {
    try { if (typeof t === 'function') t(); else navigateTo(t); } catch (e) { console.log('nav err ' + e.message); }
  }, trigger);
}
async function waitTable(containerId) {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(1500);
    ready = await app.evaluate((cid) => {
      const c = document.getElementById(cid);
      if (!c) return false;
      return !!c.querySelector('table') || !!c.querySelector('.empty-state');
    }, containerId).catch(() => false);
    if (ready) break;
  }
  return ready;
}
async function tableInfo(containerId) {
  return app.evaluate((cid) => {
    const c = document.getElementById(cid);
    if (!c) return { hasTable: false, ths: [], rowCount: 0, empty: false };
    const t = c.querySelector('table');
    return {
      hasTable: !!t,
      ths: t ? Array.from(t.querySelectorAll('thead th')).map(th => th.textContent.trim()) : [],
      rowCount: t ? Array.from(t.querySelectorAll('tbody tr')).length : 0,
      empty: !!c.querySelector('.empty-state')
    };
  }, containerId);
}

const pages = [
  ['jobcards', 'All Job Cards', 'jcTableContainer', 'jobcards'],
  ['startjobcard', 'Started Job Cards', 'startJcTableContainer', 'startjobcard'],
  ['closejobcard', 'Closed Job Cards', 'closeJcTableContainer', 'closejobcard'],
  ['pendingjobcard', 'Pending Review', 'pendingJcTableContainer', 'pendingjobcard'],
  ['approvejobcard', 'Approve Job Cards', 'jcaTableContainer', 'approvejobcard']
];

for (const [id, name, container, trigger] of pages) {
  await openPage(trigger);
  const ready = await waitTable(container);
  const info = await tableInfo(container);
  const h = JSON.stringify(info.ths);
  if (ready && info.hasTable) {
    check('gas_table_' + id, info.ths.includes('Machine') && info.ths.includes('Machine No'), name + ' headers include Machine + Machine No: ' + h);
    check('gas_rows_' + id, info.rowCount > 0, name + ' rows=' + info.rowCount);
  } else if (info.empty) {
    check('gas_table_' + id, true, name + ' empty state (0 records) — headers n/a');
    check('gas_rows_' + id, true, name + ' rows=0 (empty state)');
  } else {
    check('gas_table_' + id, false, name + ' no table rendered after wait (ready=' + ready + ')');
    check('gas_rows_' + id, false, name + ' rows=0');
  }
}

// JobCards: All tab data + detail modal Machine No
await openPage('jobcards');
await waitTable('jcTableContainer');
await app.evaluate(() => { try { switchJcTab('all'); } catch (e) {} });
for (let i = 0; i < 15; i++) { await sleep(1500); const n = await app.evaluate(() => document.querySelectorAll('#jcTableContainer tbody tr').length).catch(() => 0); if (n > 0) break; }
const allInfo = await app.evaluate(() => {
  const t = document.querySelector('#jcTableContainer table');
  if (!t) return null;
  const ths = Array.from(t.querySelectorAll('thead th')).map(th => th.textContent.trim());
  const mi = ths.indexOf('Machine'), mni = ths.indexOf('Machine No');
  const samples = [];
  Array.from(t.querySelectorAll('tbody tr')).forEach(tr => {
    const tds = Array.from(tr.querySelectorAll('td'));
    const machine = mi >= 0 && tds[mi] ? tds[mi].textContent.trim() : '';
    const num = mni >= 0 && tds[mni] ? tds[mni].textContent.trim() : '';
    if (machine && num && num !== '-') samples.push({ machine, num });
  });
  return { ths, countWithBoth: samples.length, samples: samples.slice(0, 3) };
});
check('gas_data_all', !!allInfo && allInfo.ths.includes('Machine') && allInfo.ths.includes('Machine No') && allInfo.countWithBoth > 0,
  'GAS All tab Machine + Machine No in rows: ' + (allInfo ? allInfo.countWithBoth : 'n/a') + ' sample=' + JSON.stringify(allInfo && allInfo.samples));

// Detail modal
await app.evaluate(() => { const b = document.querySelector('#jcTableContainer .icon-btn[title="View"]'); if (b) b.click(); });
let modalOk = false, modalDetail = 'no modal';
for (let i = 0; i < 10; i++) {
  await sleep(1000);
  const m = await app.evaluate(() => {
    const modal = document.getElementById('jcViewModal');
    if (!modal || modal.style.display === 'none' || !modal.classList.contains('show')) return null;
    const body = document.getElementById('jcViewBody');
    if (!body) return { opened: true, machineNo: '' };
    const rows = Array.from(body.querySelectorAll('.view-row'));
    const row = rows.find(r => (r.querySelector('span') || {}).textContent === 'Machine No');
    const val = row ? (row.querySelector('strong') || {}).textContent || '' : '';
    return { opened: true, machineNo: val.trim() };
  }).catch(() => null);
  if (m && m.opened) { modalOk = !!m.machineNo && m.machineNo !== '-'; modalDetail = 'Machine No detail=' + m.machineNo; break; }
}
check('gas_detail_machine_no', modalOk, 'GAS jobcard detail modal Machine No: ' + modalDetail);

// Dashboard Under Maintenance
await openPage('dashboard');
let statVal = '';
for (let i = 0; i < 20; i++) {
  await sleep(1500);
  const v = await app.evaluate(() => { const el = document.getElementById('statUnderMaintenance'); return el ? el.textContent.trim() : ''; }).catch(() => '');
  if (v && v !== '0' && v !== '') { statVal = v; break; }
  if (v === '0') { statVal = '0'; break; }
}
const dash = await app.evaluate(() => new Promise(resolve => {
  let done = false;
  const fin = r => { if (!done) { done = true; resolve(r); } };
  try {
    google.script.run
      .withSuccessHandler(d => fin({ ok: true, breakdownMachines: d.breakdownMachines, underMaintenanceUnmatched: (d.underMaintenanceUnmatched || []).length, umIds: (d.underMaintenanceIds || []).length }))
      .withFailureHandler(e => fin({ ok: false, err: String(e) }))
      .getDashboardData({}, '');
    setTimeout(() => fin({ ok: false, err: 'timeout' }), 90000);
  } catch (e) { fin({ ok: false, err: String(e) }); }
}));
check('gas_dash_stat', statVal !== '' && parseInt(statVal, 10) > 0, 'GAS dashboard Under Maintenance stat: ' + (statVal || 'n/a'));
check('gas_dash_getDashboardData', dash.ok === true && dash.breakdownMachines > 0, 'getDashboardData breakdownMachines=' + (dash.ok ? dash.breakdownMachines : 'n/a') + ' unmatched=' + (dash.ok ? dash.underMaintenanceUnmatched : 'n/a'));
check('gas_dash_no_unmatched', dash.ok === true && dash.underMaintenanceUnmatched === 0, 'Under Maintenance unmatched job cards: ' + (dash.ok ? dash.underMaintenanceUnmatched : 'n/a'));

const uniqueConsole = Array.from(new Set(consoleErrors));
check('gas_no_console_errors', uniqueConsole.length === 0, 'Total console errors: ' + JSON.stringify(uniqueConsole.slice(0, 10)));
check('gas_no_page_errors', pageErrors.length === 0, 'Total page errors: ' + JSON.stringify(pageErrors.slice(0, 10)));

await browser.close();
console.log('\n==== SUMMARY ====');
console.log('PASS=' + results.filter(r => r.ok).length + ' FAIL=' + results.filter(r => !r.ok).length);
if (failures.length) console.log('FAILED: ' + failures.join(', '));
process.exit(failures.length ? 1 : 0);
