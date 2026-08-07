import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CF_DIR = path.join(__dirname, '.verify_notif_cf_downloads');
const GAS_DIR = path.join(__dirname, '.verify_notif_gas_downloads');
const EXPORT_DIR = path.join(__dirname, '.verify_notif_exports');
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'notifications.js');
const PAGE_SIZE = 10;

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

async function extractRows(pg) {
  return pg.evaluate(() => {
    return Array.from(document.querySelectorAll('#notifTableContainer tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).map(td => {
        const badge = td.querySelector('.badge');
        if (badge) return 'B[' + badge.className.replace(/^badge\s*/, '').trim() + ']' + badge.textContent.trim();
        const ac = td.querySelector('.actions-cell');
        if (ac) {
          return 'A[' + Array.from(ac.querySelectorAll('button')).map(b => {
            const oc = b.getAttribute('onclick') || '';
            const m = oc.match(/\(['"](.*?)['"]\)/);
            return b.className.trim() + '|' + (b.getAttribute('title') || '') + '|' + (m ? m[1] : '');
          }).join(',') + ']';
        }
        return td.textContent.trim();
      })
    );
  });
}

async function extractHeaders(pg) {
  return pg.evaluate(() =>
    Array.from(document.querySelectorAll('#notifTableContainer thead th')).map(th => th.textContent.trim())
  );
}

async function rowCount(pg) {
  return pg.evaluate(() => document.querySelectorAll('#notifTableContainer tbody tr').length);
}

async function paginationInfo(pg) {
  return pg.evaluate(() => {
    const el = document.querySelector('#notifTableContainer .pagination-info');
    return el ? el.textContent.trim() : null;
  });
}

async function summaryCards(pg) {
  const ids = ['notifTotal', 'notifUnread', 'notifRead', 'notifTypes'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    return out;
  }, ids);
}

async function emptyState(pg) {
  return pg.evaluate(() => {
    const h = document.querySelector('#notifTableContainer .empty-state h3');
    const p = document.querySelector('#notifTableContainer .empty-state p');
    return { h: h ? h.textContent.trim() : null, p: p ? p.textContent.trim() : null };
  });
}

async function clickButtonBy(pg, substr) {
  await pg.evaluate((s) => {
    const b = Array.from(document.querySelectorAll('#notifFilterBar button, .card-actions button')).find(x => (x.getAttribute('onclick') || '').includes(s));
    if (b) b.click();
  }, substr);
}

async function viewModalState(pg) {
  const ids = ['notifViewId', 'notifViewType', 'notifViewNotifType', 'notifViewTitleText', 'notifViewPriority', 'notifViewCreatedBy', 'notifViewAssignedTo', 'notifViewReadStatus', 'notifViewCreatedAt', 'notifViewActionUrl', 'notifViewMessage'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    out['__title'] = (document.getElementById('notifViewTitle') || {}).textContent || null;
    return out;
  }, ids);
}

async function openFirstView(pg) {
  await pg.evaluate(() => {
    const b = document.querySelector('#notifTableContainer tbody tr button');
    if (b) b.click();
  });
  await sleep(400);
}

async function closeView(pg) {
  await pg.evaluate(() => { const b = document.querySelector('#notifViewModal .modal-close'); if (b) b.click(); });
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
        borderRightColor: cs.borderRightColor,
        borderBottomColor: cs.borderBottomColor,
        borderLeftColor: cs.borderLeftColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
        lineHeight: cs.lineHeight,
        borderRadius: cs.borderRadius,
        minHeight: cs.minHeight
      };
    }
    return out;
  }, scoped);
}

const PAGE_SELS = [
  '.stat-card.stat-primary', '.stat-card.stat-success', '.stat-card.stat-info', '.stat-card.stat-danger',
  '.btn-primary', '.btn-secondary', '.btn.btn-sm', '.btn-success', '.btn-danger',
  '.filter-bar', '.card', '.card-header', '.card-title',
  '.table-container th', '.search-box input', '#notifFilterType', '#notifFilterNotifType',
  '#notifFilterStatus', '#notifFilterPriority',
  '.pagination', '.pagination-info', '.pagination-btns button',
  '.icon-btn', '.actions-cell', '.empty-state', '.empty-state h3', '.empty-state p',
  '.badge', '.badge-primary', '.badge-info', '.badge-success', '.badge-danger', '.badge-warning',
  '.badge-purple', '.badge-orange', '.badge-secondary'
];
const MODAL_SELS = ['.modal', '.modal-header', '.modal-close', '.view-row span', '.view-section h4', '#notifViewMessage'];
const ALL_STYLE_SELS = PAGE_SELS.concat(MODAL_SELS);

// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});

// ===== CHECK 01: runtime JS served = local repo (interception active, deployed may lag) =====
{
  const remoteDeployed = await (await fetch(BASE + '/js/pages/notifications.js?v=' + Date.now())).text();
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
  if (req.url().includes('/js/pages/notifications.js')) {
    req.respond({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: fs.readFileSync(LOCAL_JS, 'utf8')
    });
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
  const served = await cfPage.evaluate(() => fetch('/js/pages/notifications.js').then(r => r.text()));
  check('01b_runtime_js_matches_repo', normJs(served) === normJs(fs.readFileSync(LOCAL_JS, 'utf8')), 'served runtime JS == repo notifications.js (' + served.length + 'B)');
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
  console.log('  token=', await cfPage.evaluate(() => localStorage.getItem('cmms_token')));
  console.log('  errorToast=', await cfPage.evaluate(() => { const t = document.querySelector('[class*=toast]'); return t ? t.textContent : 'NONE'; }).catch(() => 'N/A'));
  throw e;
}
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });
await cfPage.evaluate(() => navigateTo('notifications'));

await cfPage.waitForFunction(() => {
  const t = document.querySelector('#notifTableContainer');
  return t && (t.querySelector('tbody tr') || t.querySelector('.empty-state'));
}, { timeout: 120000 });
await sleep(1500);
console.log('CF notifications page loaded');

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
      return !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('notificationsPage'));
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
  if (!hasForm) throw new Error('GAS login form never appeared (getAppHtml not complete)');
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
await gasFrame.evaluate(() => navigateTo('notifications'));
await gasFrame.waitForFunction(() => {
  const t = document.querySelector('#notifTableContainer');
  return t && (t.querySelector('tbody tr') || t.querySelector('.empty-state'));
}, { timeout: 120000 });
await sleep(1500);
console.log('GAS notifications page loaded');

// ===== Authoritative data from GAS (direct) =====
const token = await cfPage.evaluate(() => localStorage.getItem('cmms_token') || '');
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
        body: JSON.stringify({ action, token, data: data || {} })
      });
      const raw = await res.text();
      if (!raw.trim().startsWith('{')) { lastErr = 'non-JSON attempt ' + attempt + ': ' + raw.slice(0, 80); await sleep(1500); continue; }
      return { raw, body: JSON.parse(raw) };
    } catch (e) { lastErr = e.message; await sleep(1500); }
  }
  throw new Error('gasCall failed after 3 attempts: ' + lastErr);
}

let gasNotifs = [];
try {
  const t = await gasCall('getNotifications', { pageSize: 100000, _userEmail: EMAIL });
  if (t.body.success === false) {
    throw new Error('GAS call failed: ' + JSON.stringify(t.body.error));
  }
  const d = t.body.data;
  gasNotifs = (d && d.records) || (Array.isArray(d) ? d : []) || [];
  check('19a_direct_gas_ok', true, 'getNotifications records=' + gasNotifs.length);
} catch (e) {
  check('19a_direct_gas_ok', false, 'exception: ' + e.message);
}

const EXPECTED_HEADERS = ['ID', 'Date', 'Module', 'Type', 'Title', 'Priority', 'Read', 'Actions'];

// ===== 02. no load-error toasts (CF) =====
{
  const ts = await toasts(cfPage);
  const bad = ts.filter(t => /failed to load notification|error/i.test(t));
  check('02_no_load_error_toast', bad.length === 0, 'toasts seen: ' + (ts.length ? ts.join(' | ') : '(none)'));
}

// ===== 03. summary cards == data counts, and CF == GAS =====
{
  const cfS = await summaryCards(cfPage);
  const gasS = await summaryCards(gasFrame);
  const unread = gasNotifs.filter(r => (r.ReadStatus || '').toLowerCase() !== 'read').length;
  const modules = {};
  gasNotifs.forEach(r => { if (r.Module) modules[r.Module] = true; });
  const expected = {
    notifTotal: String(gasNotifs.length),
    notifUnread: String(unread),
    notifRead: String(gasNotifs.length - unread),
    notifTypes: String(Object.keys(modules).length)
  };
  const keys = Object.keys(expected);
  const matchData = keys.every(k => cfS[k] === expected[k]);
  const matchGas = keys.every(k => cfS[k] === gasS[k]);
  check('03_summary_cards', matchData && matchGas, 'CF=' + JSON.stringify(cfS) + ' GAS=' + JSON.stringify(gasS) + ' data=' + JSON.stringify(expected));
}

// ===== 04. table headers CF == GAS == expected =====
{
  const cfH = await extractHeaders(cfPage);
  const gasH = await extractHeaders(gasFrame);
  const same = JSON.stringify(cfH) === JSON.stringify(gasH) && JSON.stringify(cfH) === JSON.stringify(EXPECTED_HEADERS);
  check('04_table_headers', same, 'headers=' + JSON.stringify(cfH) + (same ? '' : ' vs GAS=' + JSON.stringify(gasH)));
}

// ===== 05. page-1 rows CF == GAS (live render, full cell + action structure) =====
{
  const cfRows = await extractRows(cfPage);
  const gasRows = await extractRows(gasFrame);
  const same = JSON.stringify(cfRows) === JSON.stringify(gasRows);
  check('05_page1_rows_identical', same, 'CF rows=' + cfRows.length + ' GAS rows=' + gasRows.length + (same ? '' : ' CF=' + JSON.stringify(cfRows.slice(0, 2)) + ' GAS=' + JSON.stringify(gasRows.slice(0, 2))));
}

// ===== 06. badges correct on CF (GAS-style bug-for-bug: text = badge-map color name) =====
{
  const ok = await cfPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#notifTableContainer tbody tr'));
    if (!rows.length) return true;
    const valid = ['primary', 'success', 'warning', 'info', 'danger', 'purple', 'orange', 'secondary'];
    return rows.every(tr => {
      const badges = Array.from(tr.querySelectorAll('.badge'));
      if (!badges.length) return false;
      return badges.every(b => {
        const text = b.textContent.trim().toLowerCase();
        const cls = b.className;
        return valid.includes(text) && cls.includes('badge-' + text);
      });
    });
  });
  const sample = await cfPage.evaluate(() => {
    const b = document.querySelector('#notifTableContainer tbody tr .badge');
    return b ? b.className + ' / ' + b.textContent.trim() : '(none)';
  });
  const gasSample = await gasFrame.evaluate(() => {
    const b = document.querySelector('#notifTableContainer tbody tr .badge');
    return b ? b.className + ' / ' + b.textContent.trim() : '(none)';
  });
  check('06_badges_correct', ok && sample === gasSample, 'sample CF: ' + sample + ' GAS: ' + gasSample);
}

// ===== 07. pagination info parity =====
{
  const cfInfo = await paginationInfo(cfPage);
  const gasInfo = await paginationInfo(gasFrame);
  const totalPages = Math.ceil(gasNotifs.length / PAGE_SIZE);
  let ok, detail;
  if (totalPages > 1) {
    const expInfo = 'Showing 1 to ' + PAGE_SIZE + ' of ' + gasNotifs.length + ' entries';
    ok = cfInfo === expInfo && cfInfo === gasInfo;
    detail = 'totalPages=' + totalPages + ' info="' + cfInfo + '"' + (ok ? '' : ' GAS="' + gasInfo + '"');
  } else {
    ok = cfInfo === null && gasInfo === null;
    detail = 'totalPages=1 (' + gasNotifs.length + ' rows) pagination hidden on both' + (ok ? '' : ' CF="' + cfInfo + '" GAS="' + gasInfo + '"');
  }
  check('07_pagination_info', ok, detail);
}

// ===== 08. pagination prev/next (if applicable) =====
{
  const totalPages = Math.ceil(gasNotifs.length / PAGE_SIZE);
  if (totalPages > 1) {
    let ok = true; const details = [];
    const clickPag = (pg, idx) => pg.evaluate((i) => {
      const btns = Array.from(document.querySelectorAll('#notifTableContainer .pagination-btns button'));
      const b = btns[i];
      if (b && !b.disabled) b.click();
      return b ? !b.disabled : false;
    }, idx);
    await clickPag(cfPage, 1); await clickPag(gasFrame, 1); await sleep(800);
    const cfInfo2 = await paginationInfo(cfPage);
    const gasInfo2 = await paginationInfo(gasFrame);
    const cfRows2 = await extractRows(cfPage);
    const gasRows2 = await extractRows(gasFrame);
    if (cfInfo2 !== gasInfo2 || cfInfo2 !== 'Showing 11 to ' + Math.min(PAGE_SIZE * 2, gasNotifs.length) + ' of ' + gasNotifs.length + ' entries') { ok = false; details.push('page2 info CF="' + cfInfo2 + '" GAS="' + gasInfo2 + '"'); }
    if (JSON.stringify(cfRows2) !== JSON.stringify(gasRows2)) { ok = false; details.push('page2 rows differ'); }
    if (ok) details.push('page2: ' + cfInfo2 + ', rows equal (' + cfRows2.length + ')');
    await clickPag(cfPage, 0); await clickPag(gasFrame, 0); await sleep(800);
    const cfInfo1 = await paginationInfo(cfPage);
    const gasInfo1 = await paginationInfo(gasFrame);
    if (cfInfo1 !== gasInfo1 || cfInfo1 !== 'Showing 1 to ' + PAGE_SIZE + ' of ' + gasNotifs.length + ' entries') { ok = false; details.push('back-to-page1 info CF="' + cfInfo1 + '" GAS="' + gasInfo1 + '"'); }
    else details.push('back to page1 ok');
    check('08_pagination_nav', ok, details.join(' | '));
  } else {
    check('08_pagination_nav', true, 'n/a (only ' + gasNotifs.length + ' rows, pagination hidden)');
  }
}

// ===== 09. search filter parity =====
{
  let ok = false; let detail = '';
  try {
    const rows0 = await extractRows(cfPage);
    const q = rows0[0][4].slice(0, 4).trim();
    await cfPage.evaluate((v) => { document.getElementById('notifSearch').value = v; document.getElementById('notifSearch').dispatchEvent(new Event('keyup')); }, q);
    await gasFrame.evaluate((v) => { document.getElementById('notifSearch').value = v; document.getElementById('notifSearch').dispatchEvent(new Event('keyup')); }, q);
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasNotifs.filter(r => {
      const ql = q.toLowerCase();
      return (r.NotificationID && r.NotificationID.toLowerCase().includes(ql)) ||
             (r.Title && r.Title.toLowerCase().includes(ql)) ||
             (r.Message && r.Message.toLowerCase().includes(ql)) ||
             (r.Module && r.Module.toLowerCase().includes(ql));
    }).length;
    const expectedPage = Math.min(expected, PAGE_SIZE);
    ok = cfN === gasN && cfN === expectedPage && cfN > 0;
    detail = 'query="' + q + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + expectedPage;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('09_search_filter', ok, detail);
}

// ===== 10. search empty state =====
{
  await cfPage.evaluate(() => { document.getElementById('notifSearch').value = 'zzzzzz_nomatch_qqqq'; document.getElementById('notifSearch').dispatchEvent(new Event('keyup')); });
  await gasFrame.evaluate(() => { document.getElementById('notifSearch').value = 'zzzzzz_nomatch_qqqq'; document.getElementById('notifSearch').dispatchEvent(new Event('keyup')); });
  await sleep(800);
  const cfE = await emptyState(cfPage);
  const gasE = await emptyState(gasFrame);
  const ok = cfE.h === 'No Data Found' && cfE.p === 'No records available in this module.' && JSON.stringify(cfE) === JSON.stringify(gasE);
  check('10_search_empty_state', ok, 'CF=' + JSON.stringify(cfE) + ' GAS=' + JSON.stringify(gasE));
}

// ===== 11. module filter parity =====
{
  await cfPage.evaluate(() => { document.getElementById('notifSearch').value = ''; document.getElementById('notifSearch').dispatchEvent(new Event('keyup')); });
  await gasFrame.evaluate(() => { document.getElementById('notifSearch').value = ''; document.getElementById('notifSearch').dispatchEvent(new Event('keyup')); });
  await sleep(700);
  let ok = false; let detail = '';
  try {
    const mod = 'Job Card';
    await cfPage.select('#notifFilterType', mod);
    await gasFrame.select('#notifFilterType', mod);
    await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyNotifFilter');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasNotifs.filter(r => r.Module === mod).length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'module="' + mod + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('11_module_filter', ok, detail);
}

// ===== 12. notification type filter parity =====
{
  let ok = false; let detail = '';
  try {
    const nt = 'Approval';
    await cfPage.select('#notifFilterType', '');
    await gasFrame.select('#notifFilterType', '');
    await cfPage.select('#notifFilterNotifType', nt);
    await gasFrame.select('#notifFilterNotifType', nt);
    await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyNotifFilter');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasNotifs.filter(r => (r.NotificationType || 'Information') === nt).length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'type="' + nt + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('12_notiftype_filter', ok, detail);
}

// ===== 13. status filter parity =====
{
  let ok = false; let detail = '';
  try {
    await cfPage.select('#notifFilterNotifType', '');
    await gasFrame.select('#notifFilterNotifType', '');
    await cfPage.select('#notifFilterStatus', 'Unread');
    await gasFrame.select('#notifFilterStatus', 'Unread');
    await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyNotifFilter');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasNotifs.filter(r => (r.ReadStatus || '').toLowerCase() === 'unread').length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'status=Unread CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('13_status_filter', ok, detail);
}

// ===== 14. priority filter parity =====
{
  let ok = false; let detail = '';
  try {
    await cfPage.select('#notifFilterStatus', '');
    await gasFrame.select('#notifFilterStatus', '');
    await cfPage.select('#notifFilterPriority', 'Critical');
    await gasFrame.select('#notifFilterPriority', 'Critical');
    await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyNotifFilter');
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasNotifs.filter(r => r.Priority === 'Critical').length;
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE);
    detail = 'priority=Critical CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('14_priority_filter', ok, detail);
}

// ===== 15. summary card click parity (Total / Unread / Read) =====
{
  let ok = false; let detail = '';
  try {
    await cfPage.select('#notifFilterPriority', ''); await cfPage.evaluate(() => { const b = Array.from(document.querySelectorAll('#notifFilterBar button')).find(x => (x.getAttribute('onclick') || '').includes('applyFilter')); if (b) b.click(); });
    await gasFrame.select('#notifFilterPriority', ''); await gasFrame.evaluate(() => { const b = Array.from(document.querySelectorAll('#notifFilterBar button')).find(x => (x.getAttribute('onclick') || '').includes('applyNotifFilter')); if (b) b.click(); });
    await sleep(700);
    await cfPage.evaluate(() => { const c = document.querySelector('#notifSummaryCards .stat-card.stat-danger'); if (c) c.click(); });
    await gasFrame.evaluate(() => { const c = document.querySelector('#notifSummaryCards .stat-card.stat-danger'); if (c) c.click(); });
    await sleep(700);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasNotifs.filter(r => (r.ReadStatus || '').toLowerCase() === 'unread').length;
    const statusSelCF = await cfPage.evaluate(() => document.getElementById('notifFilterStatus').value);
    const statusSelGAS = await gasFrame.evaluate(() => document.getElementById('notifFilterStatus').value);
    ok = cfN === gasN && cfN === Math.min(expected, PAGE_SIZE) && statusSelCF === 'Unread' && statusSelGAS === 'Unread';
    detail = 'after Unread card CF=' + cfN + ' GAS=' + gasN + ' expected(page1)=' + Math.min(expected, PAGE_SIZE) + ' statusSel CF="' + statusSelCF + '" GAS="' + statusSelGAS + '"';
  } catch (e) { detail = 'exception: ' + e.message; }
  check('15_summary_card_click', ok, detail);
  await cfPage.evaluate(() => { const c = document.querySelector('#notifSummaryCards .stat-card.stat-primary'); if (c) c.click(); });
  await gasFrame.evaluate(() => { const c = document.querySelector('#notifSummaryCards .stat-card.stat-primary'); if (c) c.click(); });
  await sleep(600);
}

// ===== 16. clear filter =====
{
  await clickButtonBy(cfPage, 'clearFilter'); await clickButtonBy(gasFrame, 'clearNotifFilter');
  await sleep(800);
  const cfN = await rowCount(cfPage);
  const gasN = await rowCount(gasFrame);
  const cfReset = await cfPage.evaluate(() => {
    const s = document.getElementById('notifSearch');
    const t = document.getElementById('notifFilterType');
    const nt = document.getElementById('notifFilterNotifType');
    const st = document.getElementById('notifFilterStatus');
    const pr = document.getElementById('notifFilterPriority');
    return s.value === '' && t.value === '' && nt.value === '' && st.value === '' && pr.value === '';
  });
  const ok = cfN === gasN && cfN === Math.min(PAGE_SIZE, gasNotifs.length) && cfReset;
  check('16_clear_filter', ok, 'CF=' + cfN + ' GAS=' + gasN + ' controlsReset=' + cfReset);
}

// ===== 17. view modal CF == GAS == data =====
{
  let ok = false; let detail = '';
  try {
    await openFirstView(cfPage);
    await openFirstView(gasFrame);
    const cfM = await viewModalState(cfPage);
    const gasM = await viewModalState(gasFrame);
    const id = cfM.notifViewId;
    const item = gasNotifs.find(r => String(r.NotificationID) === id);
    const expTitle = 'Notification - ' + id;
    const fieldMatch = Object.keys(cfM).every(k => k === '__title' || cfM[k] === gasM[k]);
    const titleOk = cfM.__title === expTitle && gasM.__title === expTitle;
    const str = v => (v === null || v === undefined ? '' : String(v));
    const exp = {
      notifViewType: str(item ? item.Module || '-' : '-'),
      notifViewNotifType: str(item ? item.NotificationType || '-' : '-'),
      notifViewTitleText: str(item ? item.Title || '-' : '-'),
      notifViewPriority: str(item ? item.Priority || '-' : '-'),
      notifViewCreatedBy: str(item ? item.CreatedBy || '-' : '-'),
      notifViewAssignedTo: str(item ? item.AssignedTo || '-' : '-'),
      notifViewReadStatus: str(item ? item.ReadStatus || '-' : '-'),
      notifViewCreatedAt: str(item ? item.CreatedDateTime || '-' : '-'),
      notifViewActionUrl: str(item ? item.ActionURL || '-' : '-'),
      notifViewMessage: str(item ? item.Message || '-' : '-'),
      notifViewId: str(item ? item.NotificationID || '-' : '-')
    };
    const dataMatch = !!item && Object.keys(exp).every(k => cfM[k] === exp[k]);
    ok = !!item && fieldMatch && titleOk && dataMatch;
    detail = 'id=' + id + ' title="' + cfM.__title + '" fieldParity(CFvsGAS)=' + fieldMatch + ' titleOk=' + titleOk + ' dataMatch=' + dataMatch + (dataMatch ? '' : ' diff=' + JSON.stringify(Object.keys(exp).filter(k => cfM[k] !== exp[k]).map(k => k + ' CF=' + JSON.stringify(cfM[k]) + ' exp=' + JSON.stringify(exp[k]))));
  } catch (e) { detail = 'exception: ' + e.message; }
  check('17_view_modal', ok, detail);
  await closeView(cfPage);
  await closeView(gasFrame);
}

// ===== 18/19. exports: CSV + PDF byte parity CF vs GAS =====
const exportCdp = await cfPage.createCDPSession();
await exportCdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: EXPORT_DIR });

const csvName = 'Notifications_' + new Date().toISOString().slice(0, 10) + '.csv';

async function downloadOnce(pg, substr, dir, filename, perWait) {
  await clearDir(dir);
  await clickButtonBy(pg, substr);
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
    const cfRes = await downloadWithRetry(cfPage, 'exportCSV', EXPORT_DIR, csvName, 3, 12000);
    const gasRes = await downloadWithRetry(gasFrame, 'exportNotifCSV', EXPORT_DIR, csvName, 3, 12000);
    const cfContent = cfRes.content;
    const gasContent = gasRes.content;
    if (!cfContent || !gasContent) { detail = 'missing downloads CF=' + !!cfContent + ' GAS=' + !!gasContent + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')'; }
    else {
      const same = cfContent === gasContent;
      const headerLine = cfContent.split('\n')[0];
      const headerCols = headerLine.split(',').length;
      const headerOk = headerLine.includes('NotificationID') && headerCols === 11;
      const dataRows = countCsvRecords(cfContent) - 1;
      const rowCountOk = dataRows === gasNotifs.length;
      ok = same && headerOk && rowCountOk;
      detail = 'bytes CF=' + cfContent.length + ' GAS=' + gasContent.length + ' identical=' + same + ' headerCols=' + headerCols + ' dataRows=' + dataRows + ' expected=' + gasNotifs.length + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')';
    }
    const ts = await toasts(cfPage);
    if (!ts.some(t => t === 'Export completed')) { ok = false; detail += ' | toast "Export completed" missing'; }
    else detail += ' | toast ok';
  } catch (e) { detail = 'exception: ' + e.message; }
  check('18_csv_export', ok, detail);
}

const pdfName = 'Notifications_' + new Date().toISOString().slice(0, 10) + '.html';

{
  let ok = false; let detail = '';
  try {
    const cfRes = await downloadWithRetry(cfPage, 'exportPDF', EXPORT_DIR, pdfName, 3, 12000);
    const gasRes = await downloadWithRetry(gasFrame, 'exportNotifPDF', EXPORT_DIR, pdfName, 3, 12000);
    const cfContent = cfRes.content;
    const gasContent = gasRes.content;
    if (!cfContent || !gasContent) { detail = 'missing downloads CF=' + !!cfContent + ' GAS=' + !!gasContent + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')'; }
    else {
      const strip = s => s.replace(/Generated:[^\n<]*/g, 'Generated:').replace(/<h2[^>]*>[^<]*<\/h2>/g, '<h2>Notifications Report</h2>');
      const same = strip(cfContent) === strip(gasContent);
      const titleOk = cfContent.includes('Notifications Report');
      const thOk = ['ID', 'Module', 'Title', 'Priority', 'Read Status', 'Date'].every(h => cfContent.includes('<th>' + h + '</th>'));
      const rowCountOk = (cfContent.match(/<tr>/g) || []).length - 1 === gasNotifs.length;
      ok = same && titleOk && thOk && rowCountOk;
      detail = 'bytes CF=' + cfContent.length + ' GAS=' + gasContent.length + ' identical(gen-stripped)=' + same + ' title=' + titleOk + ' th=' + thOk + ' dataRows=' + ((cfContent.match(/<tr>/g) || []).length - 1) + ' expected=' + gasNotifs.length + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')';
    }
    const ts = await toasts(cfPage);
    if (!ts.some(t => t === 'PDF export completed')) { ok = false; detail += ' | toast "PDF export completed" missing'; }
    else detail += ' | toast ok';
  } catch (e) { detail = 'exception: ' + e.message; }
  check('19_pdf_export', ok, detail);
}

// ===== 20. print parity =====
{
  let ok = false; let detail = '';
  try {
    await cfPage.evaluate(() => {
      window.__printCalls = 0;
      window.print = function() { window.__printCalls++; };
      window.open = function() { return { document: { write: function() {}, close: function() {} }, print: function() { window.__printCalls++; } }; };
    });
    await gasFrame.evaluate(() => {
      window.__printCalls = 0;
      window.print = function() { window.__printCalls++; };
      window.open = function() { return { document: { write: function() {}, close: function() {} }, print: function() { window.__printCalls++; } }; };
    });
    await clickButtonBy(cfPage, 'printPage'); await clickButtonBy(gasFrame, 'printNotif');
    await sleep(1200);
    const cfCalls = await cfPage.evaluate(() => window.__printCalls || 0);
    const gasCalls = await gasFrame.evaluate(() => window.__printCalls || 0);
    ok = cfCalls === 1 && gasCalls === 1;
    detail = 'CF print calls=' + cfCalls + ' GAS print calls=' + gasCalls;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('20_print', ok, detail);
}

// ===== 21b. data matches GAS (raw byte-identical) =====
{
  let ok = false; let detail = '';
  const firstDiff = (a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i;
    return a.length === b.length ? -1 : len;
  };
  const ctx = (s, i) => i < 0 ? '' : JSON.stringify(s.slice(Math.max(0, i - 30), i + 30));
  try {
    const cfT = net['getNotifications'];
    const gasT = await gasCall('getNotifications', { pageSize: 100000, _userEmail: EMAIL });
    const stripTs = s => s.replace(/"ts":"[^"]*"/g, '"ts":""');
    const txnsOk = cfT && stripTs(cfT.raw) === stripTs(gasT.raw);
    const first = cfT ? firstDiff(stripTs(cfT.raw), stripTs(gasT.raw)) : -1;
    ok = txnsOk;
    detail = 'getNotifications rawIdentical(ts-stripped)=' + txnsOk + ' (len ' + (cfT ? cfT.raw.length : 0) + ' vs ' + gasT.raw.length + ', firstDiff@' + first + ')';
    if (!txnsOk) detail += ' CFctx=' + ctx(stripTs(cfT ? cfT.raw : ''), first) + ' GASctx=' + ctx(stripTs(gasT.raw), first);
  } catch (e) { detail = 'exception: ' + e.message; }
  check('21b_data_matches_gas', ok, detail);
}

// ===== 22. visual parity: computed styles CF vs GAS (scoped to Notifications page) =====
{
  const cfS = await collectStyles(cfPage, PAGE_SELS, '#notificationsPage');
  const gasS = await collectStyles(gasFrame, PAGE_SELS, '#notificationsPage');
  const cfM = await collectStyles(cfPage, MODAL_SELS, '#notifViewModal');
  const gasM = await collectStyles(gasFrame, MODAL_SELS, '#notifViewModal');
  const a = Object.assign({}, cfS, cfM);
  const b = Object.assign({}, gasS, gasM);
  const mismatches = [];
  for (const sel of ALL_STYLE_SELS) {
    const x = a[sel], y = b[sel];
    if (!x || !y) {
      if (!!x !== !!y) mismatches.push(sel + ' present CF=' + !!x + ' GAS=' + !!y);
      continue;
    }
    for (const k of ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight']) {
      if (x[k] !== y[k]) mismatches.push(sel + '[' + k + '] CF=' + x[k] + ' GAS=' + y[k]);
    }
  }
  check('22_visual_parity', mismatches.length === 0, mismatches.length ? mismatches.slice(0, 8).join(' | ') : 'computed styles match for ' + ALL_STYLE_SELS.length + ' selectors');
}

// ===== 23. mobile responsive parity =====
{
  await cfPage.setViewport({ width: 390, height: 844 });
  await gasPage.setViewport({ width: 390, height: 844 });
  await sleep(600);
  const measure = (pg) => pg.evaluate(() => {
    const grid = document.getElementById('notifSummaryCards');
    const filter = document.getElementById('notifFilterBar');
    const tc = document.querySelector('#notifTableContainer .table-container');
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 5,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      statCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : null,
      filterCols: filter ? getComputedStyle(filter).gridTemplateColumns.split(' ').filter(Boolean).length : null,
      tableOverflowX: tc ? getComputedStyle(tc).overflowX : null
    };
  });
  const cfM = await measure(cfPage);
  const gasM = await measure(gasFrame);
  const overflowParity = cfM.overflow === gasM.overflow;
  const statParity = cfM.statCols === gasM.statCols;
  const filterParity = cfM.filterCols === gasM.filterCols;
  const tcxOk = cfM.tableOverflowX === 'auto' || cfM.tableOverflowX === 'scroll';
  const ok = overflowParity && statParity && filterParity && !cfM.overflow && tcxOk;
  check('23_mobile_responsive', ok, 'CF=' + JSON.stringify(cfM) + ' GAS=' + JSON.stringify(gasM));
  await cfPage.setViewport({ width: 1440, height: 900 });
  await gasPage.setViewport({ width: 1440, height: 900 });
}

// ===== 24/25. console/page errors =====
{
  const apiErrors = cfConsoleErrors.filter(t => t.includes('[API]'));
  check('24_no_api_errors', apiErrors.length === 0, 'api console errors: ' + (apiErrors.length ? JSON.stringify(apiErrors.slice(0, 5)) : '(none)'));
  const cfErr = cfPageErrors.filter(e => !e.includes('gstatic'));
  const gasErr = gasPageErrors.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource'));
  const ok = cfErr.length === 0 && gasErr.length === 0;
  check('25_no_page_errors', ok, 'CF page errors: ' + (cfErr.length ? JSON.stringify(cfErr.slice(0, 5)) : '(none)') + ' | GAS page errors: ' + (gasErr.length ? JSON.stringify(gasErr.slice(0, 5)) : '(none)'));
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
