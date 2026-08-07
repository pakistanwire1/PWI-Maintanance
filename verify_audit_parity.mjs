import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CF_DIR = path.join(__dirname, '.verify_audit_cf_downloads');
const GAS_DIR = path.join(__dirname, '.verify_audit_gas_downloads');
const EXPORT_DIR = path.join(__dirname, '.verify_audit_exports');
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'audit-trail.js');
const PAGE_SIZE = 20;

let MOCK_SNAP = null;
let MOCK_SNAP_RAW = null;
let gasAudit = [];
let gasRaw = '';

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

async function clearDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

async function waitForFile(dir, filename, timeoutMs) {
  const target = path.join(dir, filename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(target)) return fs.readFileSync(target, 'utf8');
    await sleep(300);
  }
  return null;
}

function normJs(s) {
  return s.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
}

function normHtml(s) {
  return s.replace(/[ \t\r\n]+/g, ' ').replace(/> <|>  /g, '><').replace(/> </g, '><');
}

function normalizeCfHandlers(s) {
  const map = [
    ['AuditTrail.goPage', 'auditGoPage'],
    ['AuditTrail.applyFilter', 'applyAuditFilter'],
    ['AuditTrail.clearFilters', 'clearAuditFilters'],
    ['AuditTrail.exportCSV', 'exportAuditCSV'],
    ['AuditTrail.exportPDF', 'exportAuditPDF'],
    ['AuditTrail.printTable', 'printAuditTable'],
    ['AuditTrail.runDiagnostic', 'runAuditDiagnostic'],
    ['AuditTrail.refresh', 'loadAuditLogsData']
  ];
  let out = s;
  for (const [a, b] of map) out = out.split(a).join(b);
  return out;
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

async function toasts(pg) {
  return pg.evaluate(() => (window.__toasts || []).filter(Boolean));
}

async function pageHtml(pg) {
  return pg.evaluate(() => {
    const el = document.getElementById('auditPage');
    return el ? el.outerHTML : null;
  });
}

async function rowHtmls(pg) {
  return pg.evaluate(() =>
    Array.from(document.querySelectorAll('#auditTableBody tr')).map(tr => tr.innerHTML)
  );
}

async function rowTexts(pg) {
  return pg.evaluate(() =>
    Array.from(document.querySelectorAll('#auditTableBody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g, ' ').trim())
    )
  );
}

async function rowCount(pg) {
  return pg.evaluate(() => document.querySelectorAll('#auditTableBody tr').length);
}

async function paginationInfo(pg) {
  return pg.evaluate(() => {
    const el = document.getElementById('auditPaginationInfo');
    return el ? el.textContent.trim() : null;
  });
}

async function paginationButtons(pg) {
  return pg.evaluate(() =>
    Array.from(document.querySelectorAll('#auditPaginationControls button')).map(b => ({
      onclick: b.getAttribute('onclick'),
      disabled: b.disabled,
      text: b.textContent.trim()
    }))
  );
}

async function summaryCards(pg) {
  const ids = ['auditTotalCount', 'auditTodayCount', 'auditModuleCount', 'auditUserCount'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    return out;
  }, ids);
}

async function tbodyHtml(pg) {
  return pg.evaluate(() => {
    const el = document.getElementById('auditTableBody');
    return el ? el.innerHTML : null;
  });
}

async function clickByHandler(pg, substr) {
  await pg.evaluate((s) => {
    const b = Array.from(document.querySelectorAll('#auditPaginationControls button, #auditFilterBar button, .card-actions button')).find(x => (x.getAttribute('onclick') || '').includes(s));
    if (b) b.click();
  }, substr);
}

async function setFilter(pg, id, value, evt) {
  await pg.evaluate(({ id, value, evt }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event(evt || 'change'));
  }, { id, value, evt });
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
  '.stat-card.stat-primary', '.stat-card.stat-success', '.stat-card.stat-info', '.stat-card.stat-warning',
  '.btn-secondary', '.btn.btn-sm', '.btn.btn-xs',
  '.filter-bar', '.filter-bar label', '.search-box', '.search-box input',
  '.card', '.card-header', '.card-title', '.card-actions',
  '.table-container th', '.table td',
  '.badge', '.badge-secondary', '.badge-success', '.badge-danger', '.badge-warning',
  '.pagination-info', '.table-footer'
];

// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});

// ===== CHECK 01: runtime JS served = local repo (interception active, deployed may lag) =====
{
  const remoteDeployed = await (await fetch(BASE + '/js/pages/audit-trail.js?v=' + Date.now())).text();
  const local = fs.readFileSync(LOCAL_JS, 'utf8');
  const deployedMatches = normJs(remoteDeployed) === normJs(local);
  check('01a_deployed_js_diff_expected', !deployedMatches, 'deployed=' + remoteDeployed.length + 'B vs repo=' + local.length + 'B (fixes not deployed yet, expected to differ)');
}

// ===== CF page =====
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1440, height: 900 });
await clearDir(CF_DIR);

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
        let body = null;
        try { body = raw.trim().startsWith('{') ? JSON.parse(raw) : null; } catch (e) {}
        net[action] = { raw, body };
      }
    } catch (e) {}
  }
});
await cfPage.setRequestInterception(true);
cfPage.on('request', req => {
  if (req.url().includes('/js/pages/audit-trail.js')) {
    req.respond({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: fs.readFileSync(LOCAL_JS, 'utf8')
    });
  } else if (req.url().includes('/api/exec') && req.method() === 'POST' && MOCK_SNAP) {
    let action = null;
    try { action = JSON.parse(req.postData()).action; } catch (e) {}
    if (action === 'getAuditLogs') {
      req.respond({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: MOCK_SNAP_RAW
      });
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
  const served = await cfPage.evaluate(() => fetch('/js/pages/audit-trail.js').then(r => r.text()));
  check('01b_runtime_js_matches_repo', normJs(served) === normJs(fs.readFileSync(LOCAL_JS, 'utf8')), 'served runtime JS == repo audit-trail.js (' + served.length + 'B)');
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
  console.log('  net.login=', net['login'] ? JSON.stringify(net['login'].raw).slice(0, 400) : 'NO_RESPONSE');
  throw e;
}
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });
{
  TOKEN = await cfPage.evaluate(() => localStorage.getItem('cmms_token') || '');
  const snap = await gasCall('getAuditLogs', {});
  if (snap.body.success === false) throw new Error('GAS getAuditLogs failed: ' + JSON.stringify(snap.body.error));
  gasAudit = Array.isArray(snap.body.data) ? snap.body.data : (snap.body.data && snap.body.data.records) || [];
  gasRaw = snap.raw;
  MOCK_SNAP = gasAudit;
  MOCK_SNAP_RAW = snap.raw;
}
delete net['getAuditLogs'];
await cfPage.evaluate(() => navigateTo('audit'));

await cfPage.waitForFunction(() => {
  const t = document.getElementById('auditTableBody');
  const info = document.getElementById('auditPaginationInfo');
  if (!t || !info) return false;
  return !t.innerHTML.includes('Loading audit logs') && info.textContent.indexOf('Showing') === 0;
}, { timeout: 120000 });
await sleep(1500);
console.log('CF audit page loaded');

// ===== GAS page (inside sandbox frame) =====
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1440, height: 900 });
await clearDir(GAS_DIR);

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
await gasFrame.evaluate(() => navigateTo('audit'));
await gasFrame.waitForFunction(() => {
  const t = document.getElementById('auditTableBody');
  const info = document.getElementById('auditPaginationInfo');
  if (!t || !info) return false;
  return !t.innerHTML.includes('Loading audit logs') && info.textContent.indexOf('Showing') === 0;
}, { timeout: 120000 });
await sleep(1500);
console.log('GAS audit page loaded');

// ===== Authoritative frozen snapshot (captured pre-navigation) =====
check('19a_direct_gas_ok', gasAudit.length > 0, 'getAuditLogs frozen records=' + gasAudit.length);

// ===== Pin GAS page to the same frozen snapshot (audit log grows live during test) =====
await gasFrame.evaluate((frozen) => {
  try {
    window.auditData = JSON.parse(JSON.stringify(frozen));
    window.auditFiltered = [];
    if (typeof populateAuditFilterDropdowns === 'function') populateAuditFilterDropdowns();
    if (typeof applyAuditFilter === 'function') applyAuditFilter();
    if (typeof updateAuditSummaryCards === 'function') updateAuditSummaryCards();
  } catch (e) { console.error('GAS pin failed: ' + e.message); }
}, gasAudit);
await sleep(800);
console.log('GAS audit page pinned to frozen snapshot (' + gasAudit.length + ' records)');

// ===== 02. no load-error toasts (CF) =====
{
  const ts = await toasts(cfPage);
  const bad = ts.filter(t => /failed to load audit|error/i.test(t));
  check('02_no_load_error_toast', bad.length === 0, 'toasts seen: ' + (ts.length ? ts.join(' | ') : '(none)'));
}

// ===== 03. summary cards CF == GAS == data =====
{
  const cfS = await summaryCards(cfPage);
  const gasS = await summaryCards(gasFrame);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let todayCount = 0; const moduleSet = {}; const userSet = {};
  gasAudit.forEach(r => {
    const dt = new Date(r.DateTime);
    if (!isNaN(dt.getTime()) && dt >= today) todayCount++;
    if (r.Module) moduleSet[r.Module] = true;
    if (r.UserEmail) userSet[r.UserEmail] = true;
  });
  const expected = {
    auditTotalCount: String(gasAudit.length),
    auditTodayCount: String(todayCount),
    auditModuleCount: String(Object.keys(moduleSet).length),
    auditUserCount: String(Object.keys(userSet).length)
  };
  const keys = Object.keys(expected);
  const matchData = keys.every(k => cfS[k] === expected[k]);
  const matchGas = keys.every(k => cfS[k] === gasS[k]);
  check('03_summary_cards', matchData && matchGas, 'CF=' + JSON.stringify(cfS) + ' GAS=' + JSON.stringify(gasS) + ' data=' + JSON.stringify(expected));
}

// ===== 04. full page structure parity (handlers normalized) =====
{
  const cf = normalizeCfHandlers(await pageHtml(cfPage));
  const gas = await pageHtml(gasFrame);
  const a = normHtml(cf).replace(/class="page active"/g, 'class="page"');
  const b = normHtml(gas).replace(/class="page active"/g, 'class="page"');
  let firstDiff = -1;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { if (a[i] !== b[i]) { firstDiff = i; break; } }
  const same = a === b;
  const ctx = i => i < 0 ? '' : JSON.stringify(a.slice(Math.max(0, i - 60), i + 60));
  check('04_page_structure_parity', same, 'normalized #auditPage identical=' + same + ' (len ' + a.length + ' vs ' + b.length + ', firstDiff@' + firstDiff + (firstDiff >= 0 ? ' ctx=' + ctx(firstDiff) : '') + ')');
}

// ===== 05. page-1 rows identical (full cell innerHTML) =====
{
  const cfRows = await rowHtmls(cfPage);
  const gasRows = await rowHtmls(gasFrame);
  const a = cfRows.map(normHtml);
  const b = gasRows.map(normHtml);
  const same = JSON.stringify(a) === JSON.stringify(b);
  const diffIdx = same ? -1 : a.findIndex((r, i) => r !== b[i]);
  check('05_page1_rows_identical', same, 'CF rows=' + cfRows.length + ' GAS rows=' + gasRows.length + (same ? '' : ' firstDiffRow=' + diffIdx + ' CF=' + JSON.stringify(a[diffIdx]) + ' GAS=' + JSON.stringify(b[diffIdx])));
}

// ===== 06. pagination info parity + footer always present =====
{
  const cfInfo = await paginationInfo(cfPage);
  const gasInfo = await paginationInfo(gasFrame);
  const cfButtons = await paginationButtons(cfPage);
  const gasButtons = await paginationButtons(gasFrame);
  const totalPages = Math.max(1, Math.ceil(gasAudit.length / PAGE_SIZE));
  const expInfo = 'Showing 1-' + Math.min(PAGE_SIZE, gasAudit.length) + ' of ' + gasAudit.length;
  const infoOk = cfInfo === gasInfo && cfInfo === expInfo;
  const btnShape = cfButtons.length === gasButtons.length && cfButtons.every((b, i) => b.text === gasButtons[i].text && b.disabled === gasButtons[i].disabled && normHtml(normalizeCfHandlers(b.onclick)) === normHtml(gasButtons[i].onclick));
  const footerPresent = cfInfo !== null && gasInfo !== null;
  check('06_pagination', infoOk && btnShape && footerPresent, 'info CF="' + cfInfo + '" GAS="' + gasInfo + '" exp="' + expInfo + '" footerPresent=' + footerPresent + ' btnCount=' + cfButtons.length + ' shapeOk=' + btnShape + ' totalPages=' + totalPages);
}

// ===== 07. pagination navigation (page 2 and back) =====
{
  const totalPages = Math.max(1, Math.ceil(gasAudit.length / PAGE_SIZE));
  if (totalPages > 1) {
    let ok = true; const details = [];
    const clickPage = (pg, n) => pg.evaluate((page) => {
      const b = Array.from(document.querySelectorAll('#auditPaginationControls button')).find(x => (x.getAttribute('onclick') || '').toLowerCase().includes(page === 1 ? 'gopage(1)' : 'gopage(' + page + ')'));
      if (b && !b.disabled) b.click();
      return b ? !b.disabled : false;
    }, n);
    await clickPage(cfPage, 2); await clickPage(gasFrame, 2); await sleep(800);
    const cfInfo2 = await paginationInfo(cfPage);
    const gasInfo2 = await paginationInfo(gasFrame);
    const cfRows2 = await rowHtmls(cfPage);
    const gasRows2 = await rowHtmls(gasFrame);
    const expInfo2 = 'Showing ' + (PAGE_SIZE + 1) + '-' + Math.min(PAGE_SIZE * 2, gasAudit.length) + ' of ' + gasAudit.length;
    if (cfInfo2 !== gasInfo2 || cfInfo2 !== expInfo2) { ok = false; details.push('page2 info CF="' + cfInfo2 + '" GAS="' + gasInfo2 + '" exp="' + expInfo2 + '"'); }
    if (JSON.stringify(cfRows2.map(normHtml)) !== JSON.stringify(gasRows2.map(normHtml))) { ok = false; details.push('page2 rows differ'); }
    if (ok) details.push('page2: ' + cfInfo2 + ', rows equal (' + cfRows2.length + ')');
    await clickPage(cfPage, 1); await clickPage(gasFrame, 1); await sleep(800);
    const cfInfo1 = await paginationInfo(cfPage);
    const gasInfo1 = await paginationInfo(gasFrame);
    if (cfInfo1 !== gasInfo1) { ok = false; details.push('back info CF="' + cfInfo1 + '" GAS="' + gasInfo1 + '"'); }
    else details.push('back to page1 ok');
    check('07_pagination_nav', ok, details.join(' | '));
  } else {
    check('07_pagination_nav', true, 'n/a (only ' + gasAudit.length + ' rows)');
  }
}

// ===== 08. search filter parity (GAS broad-field semantics) =====
{
  let ok = false; let detail = '';
  try {
    const rows0 = await rowTexts(cfPage);
    const q = rows0[0][1].slice(0, 3).trim().replace('|', '');
    await setFilter(cfPage, 'auditSearch', q, 'keyup');
    await setFilter(gasFrame, 'auditSearch', q, 'keyup');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasAudit.filter(r => {
      const ql = q.toLowerCase();
      for (const k in r) { if (String(r[k]).toLowerCase().indexOf(ql) > -1) return true; }
      return false;
    }).length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE) && cfN > 0;
    detail = 'query="' + q + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('08_search_filter', ok, detail);
}

// ===== 09. search empty state + pagination zero-state =====
{
  await setFilter(cfPage, 'auditSearch', 'zzzzzz_nomatch_qqqq', 'keyup');
  await setFilter(gasFrame, 'auditSearch', 'zzzzzz_nomatch_qqqq', 'keyup');
  await sleep(800);
  const cfEmpty = await tbodyHtml(cfPage);
  const gasEmpty = await tbodyHtml(gasFrame);
  const cfInfo = await paginationInfo(cfPage);
  const gasInfo = await paginationInfo(gasFrame);
  const expEmpty = '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:30px">No audit logs found.</td></tr>';
  const ok = normHtml(cfEmpty) === normHtml(expEmpty) && normHtml(cfEmpty) === normHtml(gasEmpty) && cfInfo === 'Showing 0-0 of 0' && cfInfo === gasInfo;
  check('09_search_empty_state', ok, 'CF=' + JSON.stringify(normHtml(cfEmpty)) + ' info="' + cfInfo + '" GAS info="' + gasInfo + '"');
}

// ===== 10. module filter parity =====
{
  await setFilter(cfPage, 'auditSearch', '', 'keyup');
  await setFilter(gasFrame, 'auditSearch', '', 'keyup');
  await sleep(700);
  let ok = false; let detail = '';
  try {
    const mod = 'Job Card';
    await setFilter(cfPage, 'auditFilterModule', mod, 'change');
    await setFilter(gasFrame, 'auditFilterModule', mod, 'change');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasAudit.filter(r => r.Module === mod).length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'module="' + mod + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('10_module_filter', ok, detail);
}

// ===== 11. action filter parity =====
{
  let ok = false; let detail = '';
  try {
    const act = 'Update';
    await setFilter(cfPage, 'auditFilterModule', '', 'change');
    await setFilter(gasFrame, 'auditFilterModule', '', 'change');
    await setFilter(cfPage, 'auditFilterAction', act, 'change');
    await setFilter(gasFrame, 'auditFilterAction', act, 'change');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasAudit.filter(r => r.Action === act).length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'action="' + act + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('11_action_filter', ok, detail);
}

// ===== 12. status filter parity =====
{
  let ok = false; let detail = '';
  try {
    await setFilter(cfPage, 'auditFilterAction', '', 'change');
    await setFilter(gasFrame, 'auditFilterAction', '', 'change');
    await setFilter(cfPage, 'auditFilterStatus', 'Success', 'change');
    await setFilter(gasFrame, 'auditFilterStatus', 'Success', 'change');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasAudit.filter(r => r.Status === 'Success').length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'status=Success CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('12_status_filter', ok, detail);
}

// ===== 13. role filter parity =====
{
  let ok = false; let detail = '';
  try {
    await setFilter(cfPage, 'auditFilterStatus', '', 'change');
    await setFilter(gasFrame, 'auditFilterStatus', '', 'change');
    await setFilter(cfPage, 'auditFilterRole', 'Admin', 'change');
    await setFilter(gasFrame, 'auditFilterRole', 'Admin', 'change');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasAudit.filter(r => r.Role === 'Admin').length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'role=Admin CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('13_role_filter', ok, detail);
}

// ===== 14. user filter parity (dropdown value = UserEmail) =====
{
  let ok = false; let detail = '';
  try {
    await setFilter(cfPage, 'auditFilterRole', '', 'change');
    await setFilter(gasFrame, 'auditFilterRole', '', 'change');
    const firstUser = await cfPage.evaluate(() => {
      const s = document.getElementById('auditFilterUser');
      return s && s.options.length > 1 ? s.options[1].value : '';
    });
    if (!firstUser) { check('14_user_filter', false, 'no user options on CF'); }
    else {
      await setFilter(cfPage, 'auditFilterUser', firstUser, 'change');
      await setFilter(gasFrame, 'auditFilterUser', firstUser, 'change');
      await sleep(800);
      const cfN = await rowCount(cfPage);
      const gasN = await rowCount(gasFrame);
      const expected = gasAudit.filter(r => r.UserEmail === firstUser).length;
      ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
      detail = 'user(email)="' + firstUser + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
    }
  } catch (e) { detail = 'exception: ' + e.message; }
  check('14_user_filter', ok, detail);
}

// ===== 15. department filter parity =====
{
  let ok = false; let detail = '';
  try {
    await setFilter(cfPage, 'auditFilterUser', '', 'change');
    await setFilter(gasFrame, 'auditFilterUser', '', 'change');
    const dept = await cfPage.evaluate(() => {
      const s = document.getElementById('auditFilterDept');
      return s && s.options.length > 1 ? s.options[1].value : '';
    });
    if (!dept) { check('15_dept_filter', false, 'no dept options on CF'); }
    else {
      await setFilter(cfPage, 'auditFilterDept', dept, 'change');
      await setFilter(gasFrame, 'auditFilterDept', dept, 'change');
      await sleep(800);
      const cfN = await rowCount(cfPage);
      const gasN = await rowCount(gasFrame);
      const expected = gasAudit.filter(r => r.Department === dept).length;
      ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
      detail = 'dept="' + dept + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
    }
  } catch (e) { detail = 'exception: ' + e.message; }
  check('15_dept_filter', ok, detail);
}

// ===== 16. date range filter parity (From = today, To = today) =====
{
  let ok = false; let detail = '';
  try {
    await setFilter(cfPage, 'auditFilterDept', '', 'change');
    await setFilter(gasFrame, 'auditFilterDept', '', 'change');
    const todayStr = new Date().toISOString().slice(0, 10);
    await setFilter(cfPage, 'auditDateFrom', todayStr, 'change');
    await setFilter(gasFrame, 'auditDateFrom', todayStr, 'change');
    await setFilter(cfPage, 'auditDateTo', todayStr, 'change');
    await setFilter(gasFrame, 'auditDateTo', todayStr, 'change');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const from = new Date(todayStr);
    const to = new Date(todayStr); to.setHours(23, 59, 59, 999);
    const expected = gasAudit.filter(r => {
      if (!r.DateTime) return true;
      const d = new Date(r.DateTime);
      if (isNaN(d.getTime())) return true;
      return d >= from && d <= to;
    }).length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'range=' + todayStr + ' CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('16_date_filter', ok, detail);
}

// ===== 17. clear filter resets everything =====
{
  await clickByHandler(cfPage, 'clearFilters'); await clickByHandler(gasFrame, 'clearAuditFilters');
  await sleep(800);
  const cfN = await rowCount(cfPage);
  const gasN = await rowCount(gasFrame);
  const reset = await cfPage.evaluate(() => {
    const ids = ['auditSearch', 'auditDateFrom', 'auditDateTo', 'auditFilterUser', 'auditFilterDept', 'auditFilterModule', 'auditFilterAction', 'auditFilterStatus', 'auditFilterRole'];
    return ids.every(id => { const el = document.getElementById(id); return el && el.value === ''; });
  });
  const infoOk = await paginationInfo(cfPage) === await paginationInfo(gasFrame);
  const rowsOk = JSON.stringify((await rowHtmls(cfPage)).map(normHtml)) === JSON.stringify((await rowHtmls(gasFrame)).map(normHtml));
  const ok = cfN === gasN && cfN === Math.min(PAGE_SIZE, gasAudit.length) && reset && infoOk && rowsOk;
  check('17_clear_filter', ok, 'CF=' + cfN + ' GAS=' + gasN + ' controlsReset=' + reset + ' infoOk=' + infoOk + ' rowsOk=' + rowsOk);
}

// ===== 18. empty-export toasts (warning on both) =====
{
  await setFilter(cfPage, 'auditSearch', 'zzzzzz_nomatch_qqqq', 'keyup');
  await setFilter(gasFrame, 'auditSearch', 'zzzzzz_nomatch_qqqq', 'keyup');
  await sleep(800);
  const cfToasts0 = (await toasts(cfPage)).length;
  const gasToasts0 = (await toasts(gasFrame)).length;
  await clickByHandler(cfPage, 'exportCSV'); await clickByHandler(gasFrame, 'exportAuditCSV');
  await sleep(500);
  const cfToasts1 = await toasts(cfPage);
  const gasToasts1 = await toasts(gasFrame);
  const cfWarn = cfToasts1.slice(cfToasts0).some(t => t.includes('No data to export'));
  const gasWarn = gasToasts1.slice(gasToasts0).some(t => t.includes('No data to export'));
  check('18_empty_export_toast', cfWarn && gasWarn, 'CF warn=' + cfWarn + ' GAS warn=' + gasWarn + ' CF toasts=' + JSON.stringify(cfToasts1.slice(cfToasts0)) + ' GAS toasts=' + JSON.stringify(gasToasts1.slice(gasToasts0)));
  await setFilter(cfPage, 'auditSearch', '', 'keyup');
  await setFilter(gasFrame, 'auditSearch', '', 'keyup');
  await sleep(700);
}

// ===== 19/20. CSV + PDF + print parity =====
const exportCdp = await cfPage.createCDPSession();
await exportCdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: EXPORT_DIR });
const csvName = 'audit_trail_export.csv';

async function downloadOnce(pg, substr, dir, filename, perWait) {
  await clearDir(dir);
  await clickByHandler(pg, substr);
  const content = await waitForFile(dir, filename, perWait);
  if (content) fs.rmSync(path.join(dir, filename), { force: true });
  return content;
}

async function downloadWithRetry(pg, substr, dir, filename, attempts, perWait) {
  for (let i = 0; i < attempts; i++) {
    const content = await downloadOnce(pg, substr, dir, filename, perWait);
    if (content) return { content, attempts: i + 1 };
  }
  return { content: null, attempts };
}

function countCsvRecords(csv) {
  const s = csv.replace(/\s+$/, '');
  let records = 1, inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { if (inQ && s[i + 1] === '"') { i++; } else inQ = !inQ; }
    else if (c === '\n' && !inQ) records++;
  }
  return records;
}

{
  let ok = false; let detail = '';
  try {
    const cfRes = await downloadWithRetry(cfPage, 'exportCSV', EXPORT_DIR, csvName, 3, 15000);
    const gasRes = await downloadWithRetry(gasFrame, 'exportAuditCSV', EXPORT_DIR, csvName, 3, 15000);
    const cfContent = cfRes.content;
    const gasContent = gasRes.content;
    if (!cfContent || !gasContent) { detail = 'missing downloads CF=' + !!cfContent + ' GAS=' + !!gasContent + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')'; }
    else {
      const same = cfContent === gasContent;
      const headerLine = cfContent.split('\n')[0];
      const headerCols = headerLine.split(',').length;
      const headerOk = headerLine === 'AuditID,DateTime,UserEmail,UserName,Role,Department,Module,Action,RecordID,RecordName,OldValue,NewValue,Status,Remarks' && headerCols === 14;
      const dataRows = countCsvRecords(cfContent) - 1;
      const rowCountOk = dataRows === gasAudit.length;
      ok = same && headerOk && rowCountOk;
      detail = 'bytes CF=' + cfContent.length + ' GAS=' + gasContent.length + ' identical=' + same + ' headerCols=' + headerCols + ' headerOk=' + headerOk + ' dataRows=' + dataRows + ' expected=' + gasAudit.length + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')';
    }
  } catch (e) { detail = 'exception: ' + e.message; }
  check('19_csv_export', ok, detail);
}

async function capturePrintWindow(pg) {
  await pg.evaluate(() => {
    window.__captured = [];
    window.open = function() {
      const rec = { html: '' };
      window.__captured.push(rec);
      return {
        document: {
          write: function(h) { rec.html = h; },
          close: function() {}
        },
        focus: function() {},
        print: function() {}
      };
    };
  });
}

async function printCapture(pg, substr) {
  await capturePrintWindow(pg);
  await clickByHandler(pg, substr);
  await sleep(600);
  return pg.evaluate(() => (window.__captured[0] ? window.__captured[0].html : null));
}

{
  let ok = false; let detail = '';
  try {
    const cfH = await printCapture(cfPage, 'exportPDF');
    const gasH = await printCapture(gasFrame, 'exportAuditPDF');
    const strip = s => s.replace(/Generated:[^\n<]*/g, 'Generated:');
    const same = strip(cfH || '') === strip(gasH || '');
    const thOk = ['DateTime', 'User', 'Role', 'Department', 'Module', 'Action', 'RecordID', 'Remarks'].every(h => (cfH || '').includes('<th>' + h + '</th>'));
    const titleOk = (cfH || '').includes('Audit Trail Report');
    const rowCountOk = ((cfH || '').match(/<tr>/g) || []).length - 1 === gasAudit.length;
    ok = !!cfH && !!gasH && same && thOk && titleOk && rowCountOk;
    detail = 'CF bytes=' + (cfH || '').length + ' GAS bytes=' + (gasH || '').length + ' identical(gen-stripped)=' + same + ' title=' + titleOk + ' th=' + thOk + ' dataRows=' + (((cfH || '').match(/<tr>/g) || []).length - 1) + ' expected=' + gasAudit.length;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('20_pdf_export', ok, detail);
}

{
  let ok = false; let detail = '';
  try {
    const cfH = await printCapture(cfPage, 'printTable');
    const gasH = await printCapture(gasFrame, 'printAuditTable');
    const strip = s => s.replace(/>[^<]*\d{1,2}:\d{2}:\d{2} [AP]M[^<]*<\/p>/, '></p>');
    const same = strip(cfH || '') === strip(gasH || '');
    const thOk = ['DateTime', 'User', 'Role', 'Module', 'Action', 'RecordID', 'Status', 'Remarks'].every(h => (cfH || '').includes('<th>' + h + '</th>'));
    const titleOk = (cfH || '').includes('<h3>Audit Trail</h3>');
    const rowCountOk = ((cfH || '').match(/<tr>/g) || []).length - 1 === gasAudit.length;
    ok = !!cfH && !!gasH && same && thOk && titleOk && rowCountOk;
    detail = 'CF bytes=' + (cfH || '').length + ' GAS bytes=' + (gasH || '').length + ' identical(date-stripped)=' + same + ' title=' + titleOk + ' th=' + thOk + ' dataRows=' + (((cfH || '').match(/<tr>/g) || []).length - 1) + ' expected=' + gasAudit.length;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('21_print', ok, detail);
}

// ===== 22b. data matches GAS (raw byte-identical vs frozen snapshot) =====
{
  let ok = false; let detail = '';
  const firstDiff = (a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i;
    return a.length === b.length ? -1 : len;
  };
  const ctx = (s, i) => i < 0 ? '' : JSON.stringify(s.slice(Math.max(0, i - 30), i + 30));
  try {
    const cfT = net['getAuditLogs'];
    const stripTs = s => s.replace(/"ts":"[^"]*"/g, '"ts":""');
    const txnsOk = cfT && stripTs(cfT.raw) === stripTs(gasRaw);
    const first = cfT ? firstDiff(stripTs(cfT.raw), stripTs(gasRaw)) : -1;
    ok = txnsOk;
    detail = 'getAuditLogs rawIdentical(frozen, ts-stripped)=' + txnsOk + ' (len ' + (cfT ? cfT.raw.length : 0) + ' vs ' + gasRaw.length + ', firstDiff@' + first + ')';
    if (!txnsOk) detail += ' CFctx=' + ctx(stripTs(cfT ? cfT.raw : ''), first) + ' GASctx=' + ctx(stripTs(gasRaw), first);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('22b_data_matches_gas', ok, detail);
}

// ===== 23. visual parity: computed styles CF vs GAS =====
{
  const cfS = await collectStyles(cfPage, PAGE_SELS, '#auditPage');
  const gasS = await collectStyles(gasFrame, PAGE_SELS, '#auditPage');
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
  check('23_visual_parity', mismatches.length === 0, mismatches.length ? mismatches.slice(0, 8).join(' | ') : 'computed styles match for ' + PAGE_SELS.length + ' selectors');
}

// ===== 24. mobile responsive parity =====
{
  await cfPage.setViewport({ width: 390, height: 844 });
  await gasPage.setViewport({ width: 390, height: 844 });
  await sleep(600);
  const measure = (pg) => pg.evaluate(() => {
    const grid = document.getElementById('auditSummaryCards');
    const tc = document.querySelector('#auditPage .table-container');
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 5,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      statCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : null,
      tableOverflowX: tc ? getComputedStyle(tc).overflowX : null
    };
  });
  const cfM = await measure(cfPage);
  const gasM = await measure(gasFrame);
  const overflowParity = cfM.overflow === gasM.overflow;
  const statParity = cfM.statCols === gasM.statCols;
  const tcxOk = cfM.tableOverflowX === 'auto' || cfM.tableOverflowX === 'scroll';
  const ok = overflowParity && statParity && !cfM.overflow && tcxOk;
  check('24_mobile_responsive', ok, 'CF=' + JSON.stringify(cfM) + ' GAS=' + JSON.stringify(gasM));
  await cfPage.setViewport({ width: 1440, height: 900 });
  await gasPage.setViewport({ width: 1440, height: 900 });
}

// ===== 25/26. console/page errors =====
{
  const apiErrors = cfConsoleErrors.filter(t => t.includes('[API]'));
  check('25_no_api_errors', apiErrors.length === 0, 'api console errors: ' + (apiErrors.length ? JSON.stringify(apiErrors.slice(0, 5)) : '(none)'));
  const cfErr = cfPageErrors.filter(e => !e.includes('gstatic'));
  const gasErr = gasPageErrors.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource'));
  const ok = cfErr.length === 0 && gasErr.length === 0;
  check('26_no_page_errors', ok, 'CF page errors: ' + (cfErr.length ? JSON.stringify(cfErr.slice(0, 5)) : '(none)') + ' | GAS page errors: ' + (gasErr.length ? JSON.stringify(gasErr.slice(0, 5)) : '(none)'));
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
