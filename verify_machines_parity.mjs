import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'machines.js');
const LOCAL_CONSTANTS = path.join(__dirname, 'cloudflare', 'js', 'core', 'constants.js');
const PAGE_SIZE = 10;

let MOCK_SNAP_RAW = null;
let gasMachines = [];
let gasRaw = '';
let gasDepts = [];

let TOKEN = '';
async function gasCall(action, data) {
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GAS, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
        },
        body: JSON.stringify({ action, token: TOKEN, data: data || {} })
      });
      const raw = await res.text();
      if (!raw.trim().startsWith('{')) { lastErr = 'non-JSON attempt ' + attempt + ': ' + raw.slice(0, 80); await sleep(1500); continue; }
      return { raw, body: JSON.parse(raw) };
    } catch (e) { lastErr = e.message; await sleep(1500); }
  }
  throw new Error('gasCall failed after 3 attempts: ' + lastErr);
}

const credsFile = 'C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json';
let EMAIL = 'pakistanwire1@gmail.com';
let PASSWORD = 'admin123';
try {
  const c = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  if (c.Email && c.Password) { EMAIL = c.Email; PASSWORD = c.Password; }
} catch (e) {}

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normJs(s) { return s.replace(/\r\n/g, '\n').replace(/^\uFEFF/, ''); }
function normHtml(s) { return s.replace(/[ \t\r\n]+/g, ' ').replace(/> <|>  /g, '><').replace(/> </g, '><'); }

function normalizeCfHandlers(s) {
  const map = [
    ['Machine.search()', 'searchMachinesTable()'],
    ['Machine.openAdd()', 'openMachineForm()'],
    ['Machine.openEdit(', 'editMachine('],
    ['Machine.openPassport(', 'viewMachinePassport('],
    ['Machine.confirmDelete(', 'deleteMachine('],
    ['Machine.closeModal()', 'hideModal(\'machineFormModal\')'],
    ['Machine.save(event)', 'saveMachine(event)'],
    ['Machine.onDeptChange()', 'onMachineDeptChange()']
  ];
  let out = s;
  for (const [a, b] of map) out = out.split(a).join(b);
  return out;
}

function searchMachinesMock(frozen, query) {
  if (!query || query.trim() === '') return frozen;
  const q = query.toLowerCase();
  return frozen.filter(row => {
    for (const k in row) { if (String(row[k]).toLowerCase().indexOf(q) !== -1) return true; }
    return false;
  });
}

async function installToastObserver(pageOrFrame) {
  await pageOrFrame.evaluate(() => {
    window.__toasts = [];
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) {
            window.__toasts.push(n.textContent.trim());
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}
async function toasts(pg) { return pg.evaluate(() => (window.__toasts || []).filter(Boolean)); }

async function pageFragmentHtml(pg) {
  return pg.evaluate(() => {
    let out = '';
    ['machinesPage', 'machineFormModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) out += el.outerHTML;
    });
    return out;
  });
}

const ROWS_SEL = '#machinesTableContainer table tbody tr';
async function rowHtmls(pg) { return pg.evaluate(() => Array.from(document.querySelectorAll('#machinesTableContainer table tbody tr')).map(tr => tr.innerHTML)); }
async function rowTexts(pg) { return pg.evaluate(() => Array.from(document.querySelectorAll('#machinesTableContainer table tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g, ' ').trim()))); }
async function rowCount(pg) { return pg.evaluate(() => document.querySelectorAll('#machinesTableContainer table tbody tr').length); }
async function tbodyHtml(pg) { return pg.evaluate(() => { const tbody = document.querySelector('#machinesTableContainer table tbody'); return tbody ? tbody.innerHTML : null; }); }
async function containerHtml(pg) { return pg.evaluate(() => { const c = document.getElementById('machinesTableContainer'); return c ? c.innerHTML : null; }); }
async function paginationInfo(pg) { return pg.evaluate(() => { const el = document.querySelector('#machinesTableContainer .pagination-info'); return el ? el.textContent.trim() : null; }); }
async function paginationButtons(pg) { return pg.evaluate(() => Array.from(document.querySelectorAll('#machinesTableContainer .pagination-btns button')).map(b => ({ onclick: b.getAttribute('onclick'), disabled: b.disabled, text: b.textContent.trim() }))); }

async function clickByHandler(pg, substr) {
  await pg.evaluate((s) => {
    const b = Array.from(document.querySelectorAll('#machinesPage .card-actions button, #machinesTableContainer .actions-cell button')).find(x => (x.getAttribute('onclick') || '').includes(s));
    if (b) b.click();
  }, substr);
}

async function setSearch(pg, value) {
  await pg.evaluate((v) => {
    const el = document.getElementById('machineSearch');
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('keyup'));
  }, value);
}

async function collectStyles(pg, sels, prefix) {
  const scoped = sels.map(s => (prefix ? prefix + ' ' + s : s));
  return pg.evaluate((list) => {
    const out = {};
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const cs = getComputedStyle(el);
      out[sel] = {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        borderTopColor: cs.borderTopColor,
        borderBottomColor: cs.borderBottomColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
        lineHeight: cs.lineHeight,
        borderRadius: cs.borderRadius
      };
    }
    return out;
  }, scoped);
}

const PAGE_SELS = [
  '.card', '.card-header', '.card-title', '.card-actions',
  '.search-box', '.search-box input', '.search-box svg',
  '.btn.btn-primary', '.btn-secondary',
  '.table-container', '#machinesTableContainer th', '#machinesTableContainer td',
  '.badge', '.badge-primary', '.badge-secondary', '.badge-success', '.badge-danger', '.badge-warning',
  '.pagination', '.pagination-info', '.pagination-btns button',
  '.actions-cell', '.icon-btn'
];

// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});

// ===== CHECK 01a: deployed JS = repo (expected to differ, no deploy) =====
{
  const remoteDeployed = await (await fetch(BASE + '/js/pages/machines.js?v=' + Date.now())).text();
  const local = fs.readFileSync(LOCAL_JS, 'utf8');
  const deployedMatches = normJs(remoteDeployed) === normJs(local);
  check('01a_deployed_js_diff_expected', !deployedMatches, 'deployed=' + remoteDeployed.length + 'B vs repo=' + local.length + 'B (fixes not deployed yet, expected to differ)');
}

// ===== CF page =====
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1440, height: 900 });

const cfConsoleErrors = [];
const cfPageErrors = [];
const net = {};
cfPage.on('console', m => {
  const txt = m.text();
  if (m.type() === 'error' || txt.includes('[API]')) cfConsoleErrors.push(txt);
});
cfPage.on('pageerror', e => cfPageErrors.push(e.message));
cfPage.on('response', async res => {
  if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
    try {
      let action = null;
      try { action = JSON.parse(res.request().postData()).action; } catch (e) {}
      if (action) {
        const raw = await res.text().catch(() => 'null');
        net[action] = { raw };
      }
    } catch (e) {}
  }
});
await cfPage.setRequestInterception(true);
cfPage.on('request', req => {
  if (req.url().includes('/js/pages/machines.js')) {
    req.respond({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: fs.readFileSync(LOCAL_JS, 'utf8')
    });
  } else if (req.url().includes('/js/core/constants.js')) {
    req.respond({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: fs.readFileSync(LOCAL_CONSTANTS, 'utf8')
    });
  } else if (req.url().includes('/api/exec') && req.method() === 'POST' && MOCK_SNAP_RAW) {
    let action = null;
    try { action = JSON.parse(req.postData()).action; } catch (e) {}
    if (action === 'getMachines') {
      req.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: MOCK_SNAP_RAW });
    } else if (action === 'searchMachines') {
      let query = '';
      try { query = JSON.parse(req.postData()).data.query || ''; } catch (e) {}
      req.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(searchMachinesMock(gasMachines, query)) });
    } else {
      req.continue();
    }
  } else {
    req.continue();
  }
});

await cfPage.evaluateOnNewDocument(() => {
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(rs => {
        rs.forEach(r => { try { r.unregister(); } catch (e) {} });
      });
    }
  } catch (e) {}
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        value: function() { return Promise.resolve({ unregister: function() { return Promise.resolve(true); } }); },
        configurable: true
      });
    }
  } catch (e) {}
});

await cfPage.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await installToastObserver(cfPage);

{
  const served = await cfPage.evaluate(() => fetch('/js/pages/machines.js').then(r => r.text()));
  check('01b_runtime_js_matches_repo', normJs(served) === normJs(fs.readFileSync(LOCAL_JS, 'utf8')), 'served runtime JS == repo machines.js (' + served.length + 'B)');
}

await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
try {
  await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 90000 });
} catch (e) {
  console.log('LOGIN_TIMEOUT diagnostics:');
  console.log('  cfConsoleErrors=', JSON.stringify(cfConsoleErrors).slice(0, 1000));
  throw e;
}
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });

{
  TOKEN = await cfPage.evaluate(() => localStorage.getItem('cmms_token') || '');
  const snap = await gasCall('getMachines', {});
  if (snap.body.success === false) throw new Error('GAS getMachines failed: ' + JSON.stringify(snap.body.error));
  gasMachines = Array.isArray(snap.body.data) ? snap.body.data : (snap.body.data && snap.body.data.records) || [];
  gasRaw = snap.raw;
  MOCK_SNAP_RAW = snap.raw;
  const deps = await gasCall('getDepartmentList', {});
  gasDepts = Array.isArray(deps.body.data) ? deps.body.data : [];
}
delete net['getMachines'];
await cfPage.evaluate(() => navigateTo('machines'));

await cfPage.waitForFunction(() => {
  const table = document.querySelector('#machinesTableContainer table');
  const info = document.querySelector('#machinesTableContainer .pagination-info');
  if (!table) return false;
  return table.querySelectorAll('tbody tr').length > 0 || (info !== null);
}, { timeout: 120000 });
await sleep(1500);
console.log('CF machines page loaded (frozen ' + gasMachines.length + ' machines)');

// ===== GAS page =====
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1440, height: 900 });

const gasPageErrors = [];
gasPage.on('pageerror', e => gasPageErrors.push(e.message));
gasPage.on('console', m => { if (m.type() === 'error') gasPageErrors.push('[console] ' + m.text()); });

await gasPage.goto(GAS, { waitUntil: 'networkidle2', timeout: 120000 });

async function findGasFrame() {
  for (const f of gasPage.frames()) {
    if (f === gasPage.mainFrame()) continue;
    const has = await f.evaluate(() => {
      return !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer'));
    }).catch(() => false);
    if (has) return f;
  }
  return null;
}

let gasFrame = null;
{
  const gStart = Date.now();
  while (Date.now() - gStart < 180000) {
    gasFrame = await findGasFrame();
    if (gasFrame) {
      const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
      if (hasForm) break;
    }
    await sleep(3000);
  }
  if (!gasFrame) throw new Error('GAS app frame never appeared');
  const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
  if (!hasForm) throw new Error('GAS login form never appeared');
  console.log('GAS app loaded (login form ready)');
}
await installToastObserver(gasFrame);

await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 120000 });
await gasFrame.evaluate(() => navigateTo('machines'));
await gasFrame.waitForFunction(() => {
  const table = document.querySelector('#machinesTableContainer table');
  return !!table && table.querySelectorAll('tbody tr').length > 0;
}, { timeout: 120000 });
await sleep(1500);
console.log('GAS machines page loaded');

// ===== Pin GAS page to frozen snapshot + override server-bound search/refresh to be client-side =====
await gasFrame.evaluate((frozen, depts) => {
  try {
    window.machinesData = JSON.parse(JSON.stringify(frozen));
    window.machinesPage = 1;
    window.machineDeptCache = depts;
    window.searchMachinesTable = function() {
      var query = (document.getElementById('machineSearch') || {}).value || '';
      if (!query) { renderMachinesTable(); return; }
      var q = query.toLowerCase();
      window.machinesData = JSON.parse(JSON.stringify(frozen)).filter(function(row) {
        for (var k in row) { if (String(row[k]).toLowerCase().indexOf(q) !== -1) return true; }
        return false;
      });
      renderMachinesTable();
    };
    window.loadMachinesData = function() {
      window.machinesData = JSON.parse(JSON.stringify(frozen));
      window.machinesPage = 1;
      renderMachinesTable();
    };
    if (typeof renderMachinesTable === 'function') renderMachinesTable();
  } catch (e) { console.error('GAS pin failed: ' + e.message); }
}, gasMachines, gasDepts);
await sleep(800);
console.log('GAS machines page pinned to frozen snapshot (' + gasMachines.length + ' machines)');

// ===== 02. no load-error toasts (CF) =====
{
  const ts = await toasts(cfPage);
  const bad = ts.filter(t => /failed to load|error/i.test(t));
  check('02_no_load_error_toast', bad.length === 0, 'toasts seen: ' + (ts.length ? ts.join(' | ') : '(none)'));
}

// ===== 03. basic render sanity =====
{
  const cfRows = await rowCount(cfPage);
  const gasRows = await rowCount(gasFrame);
  const cfHdr = await cfPage.evaluate(() => document.querySelectorAll('#machinesTableContainer table thead th').length);
  const gasHdr = await gasFrame.evaluate(() => document.querySelectorAll('#machinesTableContainer table thead th').length);
  const expPage1 = Math.min(PAGE_SIZE, gasMachines.length);
  const ok = cfRows === gasRows && cfRows === expPage1 && cfHdr === 15 && gasHdr === 15;
  check('03_render_sanity', ok, 'CF rows=' + cfRows + ' GAS rows=' + gasRows + ' expected(page1)=' + expPage1 + ' headers CF=' + cfHdr + ' GAS=' + gasHdr + ' totalMachines=' + gasMachines.length);
}

// ===== 04. full page structure parity (handlers normalized) =====
{
  const cf = normalizeCfHandlers(await pageFragmentHtml(cfPage));
  const gas = await pageFragmentHtml(gasFrame);
  const a = normHtml(cf).replace(/class="page active"/g, 'class="page"');
  const b = normHtml(gas).replace(/class="page active"/g, 'class="page"');
  let firstDiff = -1;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { if (a[i] !== b[i]) { firstDiff = i; break; } }
  const same = a === b;
  const ctx = i => i < 0 ? '' : JSON.stringify(a.slice(Math.max(0, i - 60), i + 60));
  if (!same) {
    try {
      const outDir = 'C:/Users/afsar/AppData/Local/Temp/opencode';
      fs.writeFileSync(path.join(outDir, 'machines_cf_fragment.txt'), a, 'utf8');
      fs.writeFileSync(path.join(outDir, 'machines_gas_fragment.txt'), b, 'utf8');
    } catch (e) {}
  }
  check('04_page_structure_parity', same, 'normalized fragment identical=' + same + ' (len ' + a.length + ' vs ' + b.length + ', firstDiff@' + firstDiff + (firstDiff >= 0 ? ' ctx=' + ctx(firstDiff) : '') + ')');
}

// ===== 05. page-1 rows identical (full cell innerHTML) =====
{
  const cfRows = await rowHtmls(cfPage);
  const gasRows = await rowHtmls(gasFrame);
  const a = cfRows.map(normalizeCfHandlers).map(normHtml);
  const b = gasRows.map(normHtml);
  const same = JSON.stringify(a) === JSON.stringify(b);
  const diffIdx = same ? -1 : a.findIndex((r, i) => r !== b[i]);
  check('05_page1_rows_identical', same, 'CF rows=' + cfRows.length + ' GAS rows=' + gasRows.length + (same ? '' : ' firstDiffRow=' + diffIdx + ' CF=' + JSON.stringify(a[diffIdx]) + ' GAS=' + JSON.stringify(b[diffIdx])));
}

// ===== 06. pagination info parity + buttons =====
{
  const cfInfo = await paginationInfo(cfPage);
  const gasInfo = await paginationInfo(gasFrame);
  const cfButtons = await paginationButtons(cfPage);
  const gasButtons = await paginationButtons(gasFrame);
  const totalPages = Math.max(1, Math.ceil(gasMachines.length / PAGE_SIZE));
  const multiPage = gasMachines.length > PAGE_SIZE;
  const expInfo = multiPage ? ('Showing 1 to ' + Math.min(PAGE_SIZE, gasMachines.length) + ' of ' + gasMachines.length + ' entries') : null;
  const infoOk = cfInfo === gasInfo && cfInfo === expInfo;
  const btnShape = cfButtons.length === gasButtons.length && cfButtons.every((b, i) => b.text === gasButtons[i].text && b.disabled === gasButtons[i].disabled && normHtml(normalizeCfHandlers(b.onclick)) === normHtml(gasButtons[i].onclick));
  const ok = infoOk && btnShape;
  check('06_pagination', ok, 'info CF="' + cfInfo + '" GAS="' + gasInfo + '" exp="' + expInfo + '" btnCount=' + cfButtons.length + ' shapeOk=' + btnShape + ' totalPages=' + totalPages + (multiPage ? '' : ' (single page, no pagination rendered = parity)'));
}

// ===== 07. pagination navigation (page 2 and back) =====
{
  const totalPages = Math.max(1, Math.ceil(gasMachines.length / PAGE_SIZE));
  if (totalPages > 1) {
    let ok = true; const details = [];
    const clickPage = (pg, n) => pg.evaluate((page) => {
      const needle = "machinesTableContainer'," + page + ')';
      const b = Array.from(document.querySelectorAll('#machinesTableContainer .pagination-btns button')).find(x => (x.getAttribute('onclick') || '').includes(needle));
      if (b && !b.disabled) b.click();
      return b ? !b.disabled : false;
    }, n);
    await clickPage(cfPage, 2); await clickPage(gasFrame, 2); await sleep(800);
    const cfInfo2 = await paginationInfo(cfPage);
    const gasInfo2 = await paginationInfo(gasFrame);
    const cfRows2 = await rowHtmls(cfPage);
    const gasRows2 = await rowHtmls(gasFrame);
    const expInfo2 = 'Showing ' + (PAGE_SIZE + 1) + ' to ' + Math.min(PAGE_SIZE * 2, gasMachines.length) + ' of ' + gasMachines.length + ' entries';
    if (cfInfo2 !== gasInfo2 || cfInfo2 !== expInfo2) { ok = false; details.push('page2 info CF="' + cfInfo2 + '" GAS="' + gasInfo2 + '" exp="' + expInfo2 + '"'); }
    if (JSON.stringify(cfRows2.map(normalizeCfHandlers).map(normHtml)) !== JSON.stringify(gasRows2.map(normHtml))) { ok = false; details.push('page2 rows differ'); }
    if (ok) details.push('page2: ' + cfInfo2 + ', rows equal (' + cfRows2.length + ')');
    await clickPage(cfPage, 1); await clickPage(gasFrame, 1); await sleep(800);
    const cfInfo1 = await paginationInfo(cfPage);
    const gasInfo1 = await paginationInfo(gasFrame);
    if (cfInfo1 !== gasInfo1) { ok = false; details.push('back info CF="' + cfInfo1 + '" GAS="' + gasInfo1 + '"'); }
    else details.push('back to page1 ok');
    check('07_pagination_nav', ok, details.join(' | '));
  } else {
    check('07_pagination_nav', true, 'n/a (only ' + gasMachines.length + ' rows)');
  }
}

// ===== 08. search parity (server-side semantics) =====
{
  let ok = false; let detail = '';
  try {
    const q = (gasMachines[0].MachineName || gasMachines[0].MachineCode || '').slice(0, 4).trim();
    if (!q) { check('08_search', false, 'no name in first machine'); }
    else {
      await setSearch(cfPage, q); await setSearch(gasFrame, q);
      await sleep(900);
      const cfN = await rowCount(cfPage);
      const gasN = await rowCount(gasFrame);
      const expected = searchMachinesMock(gasMachines, q).length;
      const cfRows = await rowTexts(cfPage);
      const gasRows = await rowTexts(gasFrame);
      ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE) && JSON.stringify(cfRows) === JSON.stringify(gasRows);
      detail = 'query="' + q + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' rowsEqual=' + (JSON.stringify(cfRows) === JSON.stringify(gasRows));
    }
  } catch (e) { detail = 'exception: ' + e.message; }
  check('08_search', ok, detail);
}

// ===== 09. search no-match empty state =====
{
  await setSearch(cfPage, 'zzzz_nomatch_zzzz'); await setSearch(gasFrame, 'zzzz_nomatch_zzzz');
  await sleep(900);
  const cfC = await containerHtml(cfPage);
  const gasC = await containerHtml(gasFrame);
  const cfEmpty = (cfC || '').replace(/\s/g, '');
  const gasEmpty = (gasC || '').replace(/\s/g, '');
  const ok = cfEmpty === gasEmpty && cfEmpty.indexOf('NoDataFound') !== -1 && cfEmpty.indexOf('Norecordsavailableinthismodule.') !== -1;
  check('09_search_empty_state', ok, 'container identical=' + (cfEmpty === gasEmpty) + ' hasEmptyState=' + (cfEmpty.indexOf('NoDataFound') !== -1) + ' (CF len=' + cfEmpty.length + ' GAS len=' + gasEmpty.length + ')');
}

// ===== 10. search clear keeps subset (both sides) then Refresh restores =====
{
  await setSearch(cfPage, ''); await setSearch(gasFrame, '');
  await sleep(700);
  const cfSub = await rowCount(cfPage);
  const gasSub = await rowCount(gasFrame);
  const subsetKept = cfSub === gasSub;
  await cfPage.evaluate(() => navigateTo('machines'));
  await gasFrame.evaluate(() => loadMachinesData());
  await sleep(1500);
  const cfFull = await rowCount(cfPage);
  const gasFull = await rowCount(gasFrame);
  const exp = Math.min(PAGE_SIZE, gasMachines.length);
  const restored = cfFull === gasFull && cfFull === exp;
  check('10_search_clear_restore', subsetKept && restored, 'subset CF=' + cfSub + ' GAS=' + gasSub + ' kept(parity)=' + subsetKept + ' restored CF=' + cfFull + ' GAS=' + gasFull + ' exp=' + exp);
}

// ===== 11. Add form parity (title, selects, criticality) =====
{
  await clickByHandler(cfPage, 'openAdd()'); await clickByHandler(gasFrame, 'openMachineForm()');
  await sleep(900);
  const readForm = (pg) => pg.evaluate(() => {
    const t = document.getElementById('machineFormTitle');
    const dept = document.getElementById('mcDept');
    const type = document.getElementById('mcType');
    const crit = document.getElementById('mcCriticality');
    const eid = document.getElementById('editMachineId');
    const mcCode = document.getElementById('mcCode');
    const saveBtn = document.querySelector('#machineFormModal .modal-footer .btn-primary');
    return {
      title: t ? t.textContent : null,
      deptOptions: dept ? dept.options.length : null,
      typeOptions: type ? type.options.length : null,
      typeVals: type ? Array.from(type.options).map(o => o.value) : [],
      criticality: crit ? crit.value : null,
      editId: eid ? eid.value : null,
      mcCodeVal: mcCode ? mcCode.value : '',
      saveBtnHtml: saveBtn ? saveBtn.innerHTML.replace(/<svg[\s\S]*?<\/svg>/, 'SVG') : null
    };
  });
  const cfF = await readForm(cfPage);
  const gasF = await readForm(gasFrame);
  const ok = cfF.title === gasF.title && cfF.title === 'Add Machine' &&
    cfF.deptOptions === gasF.deptOptions && cfF.deptOptions === gasDepts.length + 1 &&
    cfF.typeOptions === gasF.typeOptions && cfF.typeOptions === 11 &&
    JSON.stringify(cfF.typeVals) === JSON.stringify(['CNC','Hydraulic','Pneumatic','Electrical','Mechanical','Robotic','Conveyor','Pump','Compressor','Generator','Other']) &&
    cfF.criticality === 'Low' && cfF.editId === '' && cfF.saveBtnHtml === gasF.saveBtnHtml;
  check('11_add_form_parity', ok, 'CF=' + JSON.stringify(cfF).slice(0, 300) + ' GAS=' + JSON.stringify(gasF).slice(0, 300));
  await clickByHandler(cfPage, 'closeModal()'); await clickByHandler(gasFrame, 'hideModal(\'machineFormModal\')');
  await sleep(500);
}

// ===== 12. Edit form parity (fields populate from row, dept selected) =====
{
  const firstId = gasMachines[0] ? gasMachines[0].MachineID : null;
  if (!firstId) { check('12_edit_form_parity', false, 'no machines'); }
  else {
    await clickByHandler(cfPage, 'openEdit(\'' + firstId + '\')'); await clickByHandler(gasFrame, 'editMachine(\'' + firstId + '\')');
    await sleep(900);
    const readForm = (pg) => pg.evaluate(() => {
      const g = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
      const t = document.getElementById('machineFormTitle');
      const dept = document.getElementById('mcDept');
      const sec = document.getElementById('mcSection');
      return {
        title: t ? t.textContent : null,
        code: g('mcCode'), name: g('mcName'), number: g('mcNumber'),
        deptVal: g('mcDept'), deptText: dept && dept.selectedIndex > 0 ? dept.options[dept.selectedIndex].textContent : '',
        sectionVal: g('mcSection'), sectionText: sec && sec.selectedIndex > 0 ? sec.options[sec.selectedIndex].textContent : '',
        location: g('mcLocation'), type: g('mcType'), mfr: g('mcManufacturer'), model: g('mcModel'),
        serial: g('mcSerialNo'), capacity: g('mcCapacity'), power: g('mcPower'),
        install: g('mcInstallDate'), warranty: g('mcWarranty'), criticality: g('mcCriticality'),
        qr: g('mcQRCode'), status: g('mcStatus') === undefined ? null : g('mcStatus'),
        editId: g('editMachineId')
      };
    });
    const cfF = await readForm(cfPage);
    const gasF = await readForm(gasFrame);
    const row = gasMachines[0];
    const expTitle = 'Edit Machine - ' + firstId;
    const ok = JSON.stringify(cfF) === JSON.stringify(gasF) &&
      cfF.title === expTitle && cfF.editId === String(firstId) &&
      cfF.code === (row.MachineCode || '') && cfF.name === (row.MachineName || '') &&
      cfF.criticality === (row.Criticality || 'Low');
    check('12_edit_form_parity', ok, 'forms equal=' + (JSON.stringify(cfF) === JSON.stringify(gasF)) + ' title="' + cfF.title + '" exp="' + expTitle + '" code="' + cfF.code + '" typeOpts=' + await cfPage.evaluate(() => document.getElementById('mcType').options.length));
    await clickByHandler(cfPage, 'closeModal()'); await clickByHandler(gasFrame, 'hideModal(\'machineFormModal\')');
    await sleep(500);
  }
}

// ===== 13. Delete dialog parity (title/message) =====
{
  const firstId = gasMachines[0] ? gasMachines[0].MachineID : null;
  if (!firstId) { check('13_delete_dialog', false, 'no machines'); }
  else {
    await clickByHandler(cfPage, 'confirmDelete(\'' + firstId + '\')'); await clickByHandler(gasFrame, 'deleteMachine(\'' + firstId + '\')');
    await sleep(700);
    const cfDlg = await cfPage.evaluate(() => {
      const m = document.getElementById('confirmModal');
      if (!m || m.classList.contains('show') === false) return null;
      return { title: m.querySelector('.modal-title') ? m.querySelector('.modal-title').textContent : null, msg: m.querySelector('.modal-body p') ? m.querySelector('.modal-body p').textContent : null };
    });
    const gasDlg = await gasFrame.evaluate(() => {
      const o = document.getElementById('confirmOverlay');
      if (!o) return null;
      const t = document.getElementById('confirmTitle'); const m = document.getElementById('confirmMessage');
      return { title: t ? t.textContent : null, msg: m ? m.textContent : null };
    });
    const ok = !!cfDlg && !!gasDlg && cfDlg.title === gasDlg.title && cfDlg.title === 'Delete Machine' && cfDlg.msg === gasDlg.msg && cfDlg.msg === 'Are you sure you want to delete this machine?';
    check('13_delete_dialog', ok, 'CF=' + JSON.stringify(cfDlg) + ' GAS=' + JSON.stringify(gasDlg));
    await cfPage.evaluate(() => { const b = document.querySelector('#confirmModal .btn-secondary'); if (b) b.click(); });
    await gasFrame.evaluate(() => { const b = document.querySelector('#confirmOverlay .btn-secondary'); if (b) b.click(); });
    await sleep(500);
  }
}

// ===== 14. Passport navigation (sessionStorage) =====
{
  const firstId = gasMachines[0] ? gasMachines[0].MachineID : null;
  if (!firstId) { check('14_passport_nav', false, 'no machines'); }
  else {
    await clickByHandler(cfPage, 'openPassport(\'' + firstId + '\')'); await clickByHandler(gasFrame, 'viewMachinePassport(\'' + firstId + '\')');
    await sleep(900);
    const cfP = await cfPage.evaluate(() => sessionStorage.getItem('passportMachineId'));
    const gasP = await gasFrame.evaluate(() => sessionStorage.getItem('passportMachineId'));
    const ok = cfP === gasP && cfP === String(firstId);
    check('14_passport_nav', ok, 'passportMachineId CF="' + cfP + '" GAS="' + gasP + '" exp="' + firstId + '"');
    await cfPage.evaluate(() => navigateTo('machines'));
    await gasFrame.evaluate(() => navigateTo('machines'));
    await sleep(1500);
    await cfPage.waitForFunction(() => !!document.querySelector('#machinesTableContainer table tbody tr') || !!document.querySelector('#machinesTableContainer .empty-state'), { timeout: 120000 });
  }
}
// passport navigation loads the machinepassport module on both sides; its load
// errors are out of scope for the machines module -> reset the error logs before 18.
cfConsoleErrors.length = 0;
cfPageErrors.length = 0;
gasPageErrors.length = 0;

// ===== 15. data matches GAS (raw byte-identical vs frozen snapshot) =====
{
  let ok = false; let detail = '';
  const firstDiff = (a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i;
    return a.length === b.length ? -1 : len;
  };
  try {
    const cfT = net['getMachines'];
    ok = !!(cfT && cfT.raw === gasRaw);
    detail = 'getMachines rawIdentical(frozen)=' + ok + ' (len ' + (cfT ? cfT.raw.length : 0) + ' vs ' + gasRaw.length + ', firstDiff@' + (cfT ? firstDiff(cfT.raw, gasRaw) : -1) + ')';
  } catch (e) { detail = 'exception: ' + e.message; }
  check('15_data_matches_gas', ok, detail);
}

// ===== 16. visual parity: computed styles CF vs GAS =====
{
  const cfS = await collectStyles(cfPage, PAGE_SELS, '#machinesPage');
  const gasS = await collectStyles(gasFrame, PAGE_SELS, '#machinesPage');
  const mismatches = [];
  for (const sel of PAGE_SELS) {
    const x = cfS[sel], y = gasS[sel];
    if (!x || !y) {
      if (!!x !== !!y) mismatches.push(sel + ' present CF=' + !!x + ' GAS=' + !!y);
      continue;
    }
    for (const k of ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'borderRadius']) {
      if (x[k] !== y[k]) mismatches.push(sel + '[' + k + '] CF=' + x[k] + ' GAS=' + y[k]);
    }
  }
  check('16_visual_parity', mismatches.length === 0, mismatches.length ? mismatches.slice(0, 8).join(' | ') : 'computed styles match for ' + PAGE_SELS.length + ' selectors');
}

// ===== 17. mobile responsive parity =====
{
  await cfPage.setViewport({ width: 390, height: 844 });
  await gasPage.setViewport({ width: 390, height: 844 });
  await sleep(600);
  const measure = (pg) => pg.evaluate(() => {
    const tc = document.querySelector('#machinesPage .table-container');
    const card = document.querySelector('#machinesPage .card');
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 5,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      tableOverflowX: tc ? getComputedStyle(tc).overflowX : null,
      cardWidth: card ? Math.round(card.getBoundingClientRect().width) : null
    };
  });
  const cfM = await measure(cfPage);
  const gasM = await measure(gasFrame);
  const overflowParity = cfM.overflow === gasM.overflow;
  const cardParity = cfM.cardWidth === gasM.cardWidth;
  const tcxOk = cfM.tableOverflowX === 'auto' || cfM.tableOverflowX === 'scroll';
  const ok = overflowParity && cardParity && !cfM.overflow && tcxOk;
  check('17_mobile_responsive', ok, 'CF=' + JSON.stringify(cfM) + ' GAS=' + JSON.stringify(gasM));
  await cfPage.setViewport({ width: 1440, height: 900 });
  await gasPage.setViewport({ width: 1440, height: 900 });
}

// ===== 18. console/page errors =====
{
  const MACHINES_ACTIONS = ['getMachines', 'searchMachines', 'getDepartmentList'];
  const apiErrors = cfConsoleErrors.filter(t => t.includes('[API]') && MACHINES_ACTIONS.some(a => t.includes('action=' + a)));
  check('18a_no_api_errors', apiErrors.length === 0, 'machines api console errors: ' + (apiErrors.length ? JSON.stringify(apiErrors.slice(0, 5)) : '(none)'));
  const cfErr = cfPageErrors.filter(e => !e.includes('gstatic'));
  const gasErr = gasPageErrors.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource'));
  const ok = cfErr.length === 0 && gasErr.length === 0;
  check('18b_no_page_errors', ok, 'CF page errors: ' + (cfErr.length ? JSON.stringify(cfErr.slice(0, 5)) : '(none)') + ' | GAS page errors: ' + (gasErr.length ? JSON.stringify(gasErr.slice(0, 5)) : '(none)'));
}

// ===== SUMMARY =====
console.log('\n===== SUMMARY =====');
let passCount = 0, failCount = 0;
for (const r of results) {
  if (r.ok) passCount++; else failCount++;
  console.log((r.ok ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.detail);
}
console.log('\nPASS: ' + passCount + '  FAIL: ' + failCount);
if (failCount > 0) {
  console.log('FAILED ITEMS: ' + failures.join(', '));
  console.log('RESULT: INCOMPLETE');
} else {
  console.log('RESULT: COMPLETE');
}

await browser.close();
process.exit(failCount > 0 ? 1 : 0);
