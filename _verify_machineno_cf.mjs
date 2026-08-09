import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
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

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1500);
check('login', true, 'logged in, token stored');

async function visit(pageName, { expectHeaders = ['Machine', 'Machine No'], open = false } = {}) {
  const beforeErr = consoleErrors.length;
  await page.evaluate((p) => { try { Router.navigate(p); } catch (e) { window.location.hash = p; } }, pageName);
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    ready = await page.evaluate(() => {
      const c = document.getElementById('pageContent');
      if (!c) return false;
      return !!c.querySelector('table') || !!c.querySelector('.empty-state') || !!c.querySelector('#createJobCardForm');
    }).catch(() => false);
    if (ready) break;
  }
  const info = await page.evaluate(() => {
    const table = document.querySelector('#pageContent table');
    const ths = table ? Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim()) : [];
    const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
    const hasInput = !!document.querySelector('#createJobCardForm input[name="MachineNumber"], #createJobCardForm input[id*="MachineNumber" i]');
    return { ths, rowCount: rows.length, hasInput };
  });
  const newErrs = consoleErrors.slice(beforeErr);
  return { info, newErrs, ready };
}

const tablePages = [
  ['jobcards', 'All Job Cards'],
  ['startjobcard', 'Started Job Cards'],
  ['closejobcard', 'Closed Job Cards'],
  ['approvejobcard', 'Approved Job Cards'],
  ['pendingjobcard', 'Pending Job Cards']
];

for (const [route, name] of tablePages) {
  const { info, newErrs } = await visit(route);
  check('table_' + route, info.ths.includes('Machine') && info.ths.includes('Machine No'),
    name + ' headers: ' + JSON.stringify(info.ths));
  check('rows_' + route, info.rowCount > 0, name + ' rows=' + info.rowCount);
  check('errors_' + route, newErrs.length === 0, name + ' new console errors: ' + JSON.stringify(newErrs.slice(0, 5)));
}

// Verify actual Machine + Machine No values in a data row (All Job Cards, switch to All tab)
await visit('jobcards');
await page.evaluate(() => { const b = document.querySelector('#allJcTabs .workflow-tab[data-tab="all"]'); if (b) b.click(); });
for (let i = 0; i < 15; i++) { await sleep(1500); const n = await page.evaluate(() => document.querySelectorAll('#jcTableContainer table tbody tr').length); if (n > 0) break; }
const cellCheck = await page.evaluate(() => {
  const table = document.querySelector('#jcTableContainer table');
  if (!table) return null;
  const ths = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
  const mi = ths.indexOf('Machine');
  const mni = ths.indexOf('Machine No');
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const samples = [];
  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll('td'));
    const machine = mi >= 0 && tds[mi] ? tds[mi].textContent.trim() : '';
    const num = mni >= 0 && tds[mni] ? tds[mni].textContent.trim() : '';
    if (machine && num && num !== '-') { samples.push({ machine, num }); }
  }
  return { mi, mni, samples: samples.slice(0, 3), countWithBoth: samples.length };
});
check('data_machine_no', cellCheck && cellCheck.countWithBoth > 0,
  'All JobCards rows with both Machine + Machine No: ' + (cellCheck ? cellCheck.countWithBoth : 'n/a') + ' sample=' + JSON.stringify(cellCheck && cellCheck.samples));

// Open Job Card form: derived only, no manual MachineNumber input
const { info: openInfo, newErrs: openErrs } = await visit('openjobcard');
check('open_no_input', openInfo.hasInput === false, 'Open form has no manual MachineNumber input (hasInput=' + openInfo.hasInput + ')');
check('open_errors', openErrs.length === 0, 'Open form console errors: ' + JSON.stringify(openErrs.slice(0, 5)));
const openHasMachineSelect = await page.evaluate(() => !!document.getElementById('jcMachine'));
check('open_machine_select', openHasMachineSelect, 'Open form has Machine select');

// Mobile 390px
await page.setViewport({ width: 390, height: 844 });
await page.evaluate(() => { try { Router.navigate('jobcards'); } catch (e) {} });
for (let i = 0; i < 25; i++) { await sleep(2000); const r = await page.evaluate(() => !!document.querySelector('#jcTableContainer table') || !!document.querySelector('#jcTableContainer .empty-state')).catch(() => false); if (r) break; }
await page.evaluate(() => { const b = document.querySelector('#allJcTabs .workflow-tab[data-tab="all"]'); if (b) b.click(); });
for (let i = 0; i < 10; i++) { await sleep(1000); const n = await page.evaluate(() => document.querySelectorAll('#jcTableContainer table tbody tr').length); if (n > 0) break; }
const mob = await page.evaluate(() => {
  const table = document.querySelector('#jcTableContainer table');
  const ths = table ? Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim()) : [];
  return { hasTable: !!table, ths, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
});
check('mobile_390_table', mob.hasTable && mob.ths.includes('Machine') && mob.ths.includes('Machine No'),
  'mobile 390px All JobCards table + headers present: ' + JSON.stringify(mob.ths));
check('mobile_390_overflow', mob.scrollW <= mob.innerW + 5, 'mobile 390px no page overflow (scrollW=' + mob.scrollW + ' innerW=' + mob.innerW + ')');

const uniqueConsole = Array.from(new Set(consoleErrors));
check('no_console_errors', uniqueConsole.length === 0, 'Total unique console errors: ' + JSON.stringify(uniqueConsole.slice(0, 10)));
check('no_page_errors', pageErrors.length === 0, 'Total page errors: ' + JSON.stringify(pageErrors.slice(0, 10)));

await browser.close();
console.log('\n==== SUMMARY ====');
console.log('PASS=' + results.filter(r => r.ok).length + ' FAIL=' + results.filter(r => !r.ok).length);
if (failures.length) console.log('FAILED: ' + failures.join(', '));
process.exit(failures.length ? 1 : 0);
