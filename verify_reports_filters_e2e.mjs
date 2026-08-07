import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.RPT_E2E_BASE || 'http://127.0.0.1:8788';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT_DIR = path.join(__dirname, 'verify_shots');

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// capture getReportData payloads + response row counts
const payloads = [];
const respRows = [];
page.on('request', req => {
  if (req.url().includes('/api/exec') && req.method() === 'POST') {
    try {
      const p = JSON.parse(req.postData());
      if (p.action === 'getReportData') payloads.push(p.data || {});
    } catch (e) {}
  }
});
page.on('response', async res => {
  if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
    try {
      const p = JSON.parse(res.request().postData());
      if (p.action === 'getReportData') {
        const j = JSON.parse(await res.text());
        respRows.push({ rows: (j.data && j.data.rows) ? j.data.rows.length : 0 });
      }
    } catch (e) {}
  }
});

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });

// toast capture
await page.evaluate(() => {
  window.__toasts = [];
  const obs = new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent.trim());
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
});

await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1200);

await page.evaluate(() => navigateTo('reports'));
await page.waitForFunction(() => {
  const el = document.getElementById('rptType');
  return el && Array.from(el.options).some(o => o.value !== '');
}, { timeout: 60000 });
await sleep(800);

// ---- helpers ----
const setValNoEvent = (id, value) => page.evaluate(({ id, value }) => { const el = document.getElementById(id); if (el) el.value = value; }, { id, value });
const setSelect = (id, value) => page.evaluate(({ id, value }) => { const el = document.getElementById(id); if (!el) return; el.value = value; el.dispatchEvent(new Event('change')); }, { id, value });
const val = id => page.evaluate(i => { const el = document.getElementById(i); return el ? el.value : ''; }, id);
const rowCount = () => page.evaluate(() => document.querySelectorAll('#rptTableBody tr').length);
const kpiVisible = () => page.evaluate(() => { const k = document.getElementById('rptKpiCards'); return !!k && k.style.display !== 'none'; });
const recordCount = () => page.evaluate(() => { const r = document.getElementById('rptRecordCount'); return r ? r.textContent : ''; });

const toastCount = () => page.evaluate(() => (window.__toasts || []).length);

const waitReport = async (label) => {
  const startPayloads = payloads.length;
  const startToasts = await toastCount();
  const t0 = Date.now();
  let settled = false;
  while (Date.now() - t0 < 90000 && !settled) {
    const newResp = respRows.length > startPayloads;
    const newToast = (await toastCount()) > startToasts;
    if (newResp) {
      const last = respRows[respRows.length - 1];
      const rc = await recordCount();
      const rcNum = parseInt((rc || '').replace(/[^\d]/g, ''), 10) || -1;
      if (last.rows === 0) settled = newToast;
      else settled = rcNum === last.rows;
    }
    if (!settled) await sleep(500);
  }
  await sleep(300);
  const rc = await recordCount();
  console.log('  [' + label + '] recordCount=' + rc + ' rows=' + (await rowCount()));
  return { rows: await rowCount(), count: rc };
};

const clearFilters = async () => {
  for (const id of ['rptDivision', 'rptSection', 'rptDepartment', 'rptMachineNumber', 'rptTechnician', 'rptPriority', 'rptStatus']) {
    await setValNoEvent(id, '');
  }
  await setValNoEvent('rptMaintType', 'All');
  await setValNoEvent('rptFromDate', '2026-01-01');
  await setValNoEvent('rptToDate', '2026-12-31');
};

// ---- L1. no Loading residue ----
const loading = await page.evaluate(() => Array.from(document.querySelectorAll('#reportsPage select option')).filter(o => /loading/i.test(o.textContent)).map(o => o.textContent.trim()));
check('E1_no_loading_options', loading.length === 0, 'loading options: ' + (loading.length ? JSON.stringify(loading) : '(none)'));

// ---- L2. select report type ----
const firstType = await page.evaluate(() => { const el = document.getElementById('rptType'); for (const o of el.options) if (o.value) return o.value; return ''; });
await setSelect('rptType', firstType);
await sleep(500);
check('E2_type_selected', (await val('rptType')) === firstType, 'type=' + firstType);

// ---- baseline report (2026) ----
await clearFilters();
await setSelect('rptDivision', '');
const base = await waitReport('baseline');
check('E3_baseline_2026', base.rows === 64, 'baseline rows=' + base.rows + ' (expect 64)');

const lastPayload = () => payloads[payloads.length - 1] || {};

// ---- division: select DIV001 -> payload sends 'Spoke Division', 63 rows ----
await clearFilters();
await setSelect('rptDivision', 'DIV001');
const r1 = await waitReport('division DIV001');
const p1 = lastPayload();
check('E4_division_payload', p1.division === 'Spoke Division', 'payload.division=' + JSON.stringify(p1.division) + ' (expect "Spoke Division")');
check('E5_division_rows', r1.rows === 63, 'division rows=' + r1.rows + ' (expect 63)');

// ---- section: DIV001+SEC002 -> payload section 'Spoke', expect 61 ----
await setSelect('rptSection', 'SEC002');
const r2 = await waitReport('section SEC002');
const p2 = lastPayload();
check('E6_section_payload', p2.division === 'Spoke Division' && p2.section === 'Spoke', 'payload.section=' + JSON.stringify(p2.section));
check('E7_section_rows', r2.rows === 61, 'section rows=' + r2.rows + ' (expect 61)');

// ---- department: + DEPT003 (Swagging) ----
await setSelect('rptDepartment', 'DEPT003');
const r3 = await waitReport('department DEPT003');
const p3 = lastPayload();
check('E8_department_payload', p3.department === 'Swagging', 'payload.department=' + JSON.stringify(p3.department));
check('E9_department_rows', r3.rows === 19, 'department rows=' + r3.rows + ' (expect 19)');

// ---- machine number: SW # 06 ----
await setSelect('rptMachineNumber', 'SW # 06');
const r4 = await waitReport('machine SW # 06');
check('E10_machine_rows', r4.rows === 19, 'machine rows=' + r4.rows + ' (expect 19)');

// ---- technician ARIF ----
await clearFilters();
await setSelect('rptTechnician', 'ARIF');
const r5 = await waitReport('technician ARIF');
check('E11_technician_rows', r5.rows === 3, 'technician rows=' + r5.rows + ' (expect 3)');

// ---- priority High ----
await clearFilters();
await setSelect('rptPriority', 'High');
const r6 = await waitReport('priority High');
check('E12_priority_rows', r6.rows === 2, 'priority rows=' + r6.rows + ' (expect 2)');

// ---- status RUNNING ----
await clearFilters();
await setSelect('rptStatus', 'RUNNING');
const r7 = await waitReport('status RUNNING');
check('E13_status_rows', r7.rows === 13, 'status rows=' + r7.rows + ' (expect 13)');

// ---- date range: Jul 2026 (payload end-of-day normalization) ----
await clearFilters();
await setValNoEvent('rptFromDate', '2026-07-01');
await setValNoEvent('rptToDate', '2026-07-31');
await setSelect('rptFromDate', '2026-07-01');
const r8 = await waitReport('date July');
const p8 = lastPayload();
check('E14_date_payload', p8.fromDate === '2026-07-01T00:00:00' && p8.toDate === '2026-07-31T23:59:59', 'payload dates=' + JSON.stringify([p8.fromDate, p8.toDate]));
check('E15_date_rows', r8.rows === 64, 'date rows=' + r8.rows + ' (expect 64)');

// ---- same-day date range must include the whole day ----
await clearFilters();
await setValNoEvent('rptFromDate', '2026-07-23');
await setValNoEvent('rptToDate', '2026-07-23');
await setSelect('rptFromDate', '2026-07-23');
const r9 = await waitReport('same-day');
check('E16_same_day_rows', r9.rows > 0, 'same-day rows=' + r9.rows + ' (expect > 0)');

// ---- empty state: pick a section under DIV001 with no jobcards -> backend zero rows ----
await clearFilters();
await setSelect('rptDivision', 'DIV001');
await sleep(1000);
const emptySection = await page.evaluate(() => {
  const withData = ['Spoke', 'Auto Plating', 'Spiral'];
  const el = document.getElementById('rptSection');
  for (const o of el.options) {
    if (o.value && withData.indexOf(o.textContent.trim()) === -1) return o.value;
  }
  return '';
});
check('E16b_empty_section_found', !!emptySection, 'empty section value=' + JSON.stringify(emptySection));
await setSelect('rptSection', emptySection);
const r10 = await waitReport('empty combo');
await sleep(800);
const emptyState = await page.evaluate(() => {
  const k = document.getElementById('rptKpiCards');
  const t = document.getElementById('rptTableCard');
  return { kpi: k ? k.style.display : 'n/a', table: t ? t.style.display : 'n/a', toasts: (window.__toasts || []).slice(-3) };
});
check('E17_empty_state_cards_hidden', emptyState.kpi === 'none' && emptyState.table === 'none', 'kpi=' + emptyState.kpi + ' table=' + emptyState.table);
check('E18_empty_state_toast', emptyState.toasts.some(t => /No data found/.test(t)), 'toasts=' + JSON.stringify(emptyState.toasts));

// ---- maintenance type dropdown reflects backend values ----
const mtOpts = await page.evaluate(() => Array.from(document.getElementById('rptMaintType').options).map(o => o.value + '|' + o.textContent));
console.log('  maintenance type options: ' + JSON.stringify(mtOpts));

// ---- console/page errors ----
check('E19_no_api_errors', consoleErrors.filter(t => t.includes('[API]')).length === 0, 'api console errors: ' + JSON.stringify(consoleErrors.filter(t => t.includes('[API]')).slice(0, 2)));
check('E20_no_page_errors', pageErrors.filter(e => !e.includes('gstatic')).length === 0, 'page errors: ' + JSON.stringify(pageErrors.filter(e => !e.includes('gstatic')).slice(0, 2)));

await page.screenshot({ path: path.join(SHOT_DIR, 'reports_filters_e2e.png') });

console.log('\n===== SUMMARY =====');
let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) { console.log('FAILED: ' + failures.join(', ')); console.log('RESULT: INCOMPLETE'); }
else console.log('RESULT: COMPLETE');

await browser.close();
process.exit(fail > 0 ? 1 : 0);
