import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CF_DIR = path.join(__dirname, '.verify_it_cf_downloads');
const GAS_DIR = path.join(__dirname, '.verify_it_gas_downloads');
const EXPORT_DIR = path.join(__dirname, '.verify_it_exports');
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'inventorytransactions.js');
const PAGE_SIZE = 10;

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
    return Array.from(document.querySelectorAll('#itTableContainer tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).map(td => {
        const badge = td.querySelector('.badge');
        if (badge) return 'B[' + badge.className.replace(/^badge\s*/, '').trim() + ']' + badge.textContent.trim();
        return td.textContent.trim();
      })
    );
  });
}

async function extractHeaders(pg) {
  return pg.evaluate(() =>
    Array.from(document.querySelectorAll('#itTableContainer thead th')).map(th => th.textContent.trim())
  );
}

async function rowCount(pg) {
  return pg.evaluate(() => document.querySelectorAll('#itTableContainer tbody tr').length);
}

async function paginationInfo(pg) {
  return pg.evaluate(() => {
    const el = document.querySelector('#itTableContainer .pagination-info');
    return el ? el.textContent.trim() : null;
  });
}

async function summaryCards(pg) {
  const ids = ['itTotalTxns', 'itGoodsReceipt', 'itIssues', 'itReturns', 'itTransfers', 'itAdjustments'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    return out;
  }, ids);
}

async function emptyState(pg) {
  return pg.evaluate(() => {
    const h = document.querySelector('#itTableContainer .empty-state h3');
    const p = document.querySelector('#itTableContainer .empty-state p');
    return { h: h ? h.textContent.trim() : null, p: p ? p.textContent.trim() : null };
  });
}

async function clickButtonBy(pg, substr) {
  await pg.evaluate((s) => {
    const b = Array.from(document.querySelectorAll('#itFilterBar button, .card-actions button')).find(x => (x.getAttribute('onclick') || '').includes(s));
    if (b) b.click();
  }, substr);
}

async function viewModalState(pg) {
  const ids = ['itViewTxnId', 'itViewType', 'itViewPartCode', 'itViewPartName', 'itViewQty', 'itViewUnitCost', 'itViewTotalCost', 'itViewRefNo', 'itViewRefType', 'itViewFromLoc', 'itViewToLoc', 'itViewProcessedBy', 'itViewProcessedAt', 'itViewCreatedAt', 'itViewRemarks'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    out['__title'] = (document.getElementById('itViewTitle') || document.getElementById('itViewModalTitle') || {}).textContent || null;
    return out;
  }, ids);
}

async function openFirstView(pg) {
  await pg.evaluate(() => {
    const b = document.querySelector('#itTableContainer tbody tr button');
    if (b) b.click();
  });
  await sleep(400);
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
  '.stat-card.stat-primary', '.stat-card.stat-success', '.stat-card.stat-warning',
  '.stat-card.stat-info', '.stat-card.stat-purple', '.stat-card.stat-danger',
  '.btn-primary', '.btn-secondary', '.btn.btn-sm',
  '.filter-bar', '.card', '.card-header', '.card-title',
  '.table-container th', '.search-box input', '#itFilterType', '#itFilterFromDate',
  '.pagination', '.pagination-info', '.pagination-btns button',
  '.icon-btn', '.actions-cell', '.empty-state', '.empty-state h3', '.empty-state p'
];
const MODAL_SELS = ['.modal', '.modal-header', '.modal-close', '.view-row span', '.view-section h4', '#itViewRemarks'];
const ALL_STYLE_SELS = PAGE_SELS.concat(MODAL_SELS);

// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});

// ===== CHECK 01: deployed JS == repo =====
{
  const remote = await (await fetch(BASE + '/js/pages/inventorytransactions.js?v=' + Date.now())).text();
  const local = fs.readFileSync(LOCAL_JS, 'utf8');
  const same = normJs(remote) === normJs(local);
  check('01_deployed_js_matches_repo', same, 'bytes equal after BOM/CRLF normalization (remote=' + remote.length + ' local=' + local.length + ')');
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

await cfPage.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await installToastObserver(cfPage);

await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });
await cfPage.evaluate(() => navigateTo('inventorytransactions'));

await cfPage.waitForFunction(() => {
  const t = document.querySelector('#itTableContainer');
  return t && t.querySelector('tbody tr') && document.getElementById('itFilterPart') && document.getElementById('itFilterPart').options.length > 1;
}, { timeout: 120000 });
await sleep(1500);
console.log('CF inventorytransactions page loaded');

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
      return !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('inventorytransactionsPage'));
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
await gasFrame.evaluate(() => navigateTo('inventorytransactions'));
await gasFrame.waitForFunction(() => {
  const t = document.querySelector('#itTableContainer');
  return t && t.querySelector('tbody tr') && document.getElementById('itFilterPart') && document.getElementById('itFilterPart').options.length > 1;
}, { timeout: 120000 });
await sleep(1500);
console.log('GAS inventorytransactions page loaded');

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

let gasTxns = null;
let gasParts = null;
try {
  const t = await gasCall('getInventoryTransactions', {});
  const p = await gasCall('getSpareParts', {});
  if (t.body.success === false || p.body.success === false) {
    throw new Error('GAS call failed: ' + JSON.stringify({ t: t.body.error, p: p.body.error }));
  }
  gasTxns = t.body.data || [];
  gasParts = p.body.data || [];
  check('19a_direct_gas_ok', true, 'getInventoryTransactions rows=' + gasTxns.length + ' getSpareParts rows=' + gasParts.length);
} catch (e) {
  check('19a_direct_gas_ok', false, 'exception: ' + e.message);
}

// ===== 02. no load-error toasts (CF) =====
{
  const ts = await toasts(cfPage);
  const bad = ts.filter(t => /failed to load inventory|failed to load filter parts|error/i.test(t));
  check('02_no_load_error_toast', bad.length === 0, 'toasts seen: ' + (ts.length ? ts.join(' | ') : '(none)'));
}

// ===== 03. summary cards == data counts, and CF == GAS =====
{
  const cfS = await summaryCards(cfPage);
  const gasS = await summaryCards(gasFrame);
  const cnt = (fn) => gasTxns.filter(r => fn(r.TransactionType || '')).length;
  const expected = {
    itTotalTxns: String(gasTxns.length),
    itGoodsReceipt: String(cnt(x => x.toLowerCase() === 'goods receipt')),
    itIssues: String(cnt(x => x.toLowerCase() === 'issue')),
    itReturns: String(cnt(x => x.toLowerCase() === 'return')),
    itTransfers: String(cnt(x => x.toLowerCase() === 'transfer')),
    itAdjustments: String(cnt(x => x.toLowerCase() === 'adjustment'))
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
  const exp = ['Txn ID', 'Date', 'Type', 'Part Code', 'Part Name', 'Qty', 'Unit Cost', 'Total Cost', 'Reference', 'Actions'];
  const same = JSON.stringify(cfH) === JSON.stringify(gasH) && JSON.stringify(cfH) === JSON.stringify(exp);
  check('04_table_headers', same, 'headers=' + JSON.stringify(cfH) + (same ? '' : ' vs GAS=' + JSON.stringify(gasH)));
}

// ===== 05. page-1 rows CF == GAS (live render) =====
{
  const cfRows = await extractRows(cfPage);
  const gasRows = await extractRows(gasFrame);
  const same = JSON.stringify(cfRows) === JSON.stringify(gasRows);
  check('05_page1_rows_identical', same, 'CF rows=' + cfRows.length + ' GAS rows=' + gasRows.length + (same ? '' : ' CF=' + JSON.stringify(cfRows.slice(0, 2)) + ' GAS=' + JSON.stringify(gasRows.slice(0, 2))));
}

// ===== 06. badges correct on CF (GAS-style: text = badge-map value, class = badge-<text>) =====
{
  const ok = await cfPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#itTableContainer tbody tr'));
    if (!rows.length) return true;
    const valid = ['success', 'warning', 'info', 'primary', 'danger'];
    return rows.every(tr => {
      const badge = tr.querySelector('td:nth-child(3) .badge');
      if (!badge) return false;
      const text = badge.textContent.trim().toLowerCase();
      const cls = badge.className;
      return valid.includes(text) && cls.includes('badge-' + text);
    });
  });
  const sample = await cfPage.evaluate(() => {
    const b = document.querySelector('#itTableContainer tbody tr td:nth-child(3) .badge');
    return b ? b.className + ' / ' + b.textContent.trim() : '(none)';
  });
  check('06_badges_correct', ok, 'sample badge: ' + sample);
}

// ===== 07. pagination info parity =====
{
  const cfInfo = await paginationInfo(cfPage);
  const gasInfo = await paginationInfo(gasFrame);
  const totalPages = Math.ceil(gasTxns.length / 10);
  let ok, detail;
  if (totalPages > 1) {
    const expInfo = 'Showing 1 to 10 of ' + gasTxns.length + ' entries';
    ok = cfInfo === expInfo && cfInfo === gasInfo;
    detail = 'totalPages=' + totalPages + ' info="' + cfInfo + '"' + (ok ? '' : ' GAS="' + gasInfo + '"');
  } else {
    ok = cfInfo === null && gasInfo === null;
    detail = 'totalPages=1 (' + gasTxns.length + ' rows) pagination hidden on both' + (ok ? '' : ' CF="' + cfInfo + '" GAS="' + gasInfo + '"');
  }
  check('07_pagination_info', ok, detail);
}

// ===== 08. pagination prev/next (if applicable) =====
{
  const totalPages = Math.ceil(gasTxns.length / 10);
  if (totalPages > 1) {
    let ok = true; const details = [];
    const clickPag = (pg, idx) => pg.evaluate((i) => {
      const btns = Array.from(document.querySelectorAll('#itTableContainer .pagination-btns button'));
      const b = btns[i];
      if (b && !b.disabled) b.click();
      return b ? !b.disabled : false;
    }, idx);
    await clickPag(cfPage, 1); await clickPag(gasFrame, 1); await sleep(800);
    const cfInfo2 = await paginationInfo(cfPage);
    const gasInfo2 = await paginationInfo(gasFrame);
    const cfRows2 = await extractRows(cfPage);
    const gasRows2 = await extractRows(gasFrame);
    if (cfInfo2 !== gasInfo2 || cfInfo2 !== 'Showing 11 to 20 of ' + gasTxns.length + ' entries') { ok = false; details.push('page2 info CF="' + cfInfo2 + '" GAS="' + gasInfo2 + '"'); }
    if (JSON.stringify(cfRows2) !== JSON.stringify(gasRows2)) { ok = false; details.push('page2 rows differ'); }
    if (ok) details.push('page2: ' + cfInfo2 + ', rows equal (' + cfRows2.length + ')');
    await clickPag(cfPage, 0); await clickPag(gasFrame, 0); await sleep(800);
    const cfInfo1 = await paginationInfo(cfPage);
    const gasInfo1 = await paginationInfo(gasFrame);
    if (cfInfo1 !== gasInfo1 || cfInfo1 !== 'Showing 1 to 10 of ' + gasTxns.length + ' entries') { ok = false; details.push('back-to-page1 info CF="' + cfInfo1 + '" GAS="' + gasInfo1 + '"'); }
    else details.push('back to page1 ok');
    check('08_pagination_nav', ok, details.join(' | '));
  } else {
    check('08_pagination_nav', true, 'n/a (only ' + gasTxns.length + ' rows, pagination hidden)');
  }
}

// ===== 09. search filter parity =====
{
  let ok = false; let detail = '';
  try {
    const rows0 = await extractRows(cfPage);
    const q = rows0[0][3].slice(0, 3).trim();
    await cfPage.evaluate((v) => { document.getElementById('itSearch').value = v; document.getElementById('itSearch').dispatchEvent(new Event('keyup')); }, q);
    await gasFrame.evaluate((v) => { document.getElementById('itSearch').value = v; document.getElementById('itSearch').dispatchEvent(new Event('keyup')); }, q);
    await sleep(800);
    const cfN = await rowCount(cfPage);
    const gasN = await rowCount(gasFrame);
    const expected = gasTxns.filter(r => {
      const ql = q.toLowerCase();
      return (r.TransactionID && r.TransactionID.toLowerCase().includes(ql)) ||
             (r.PartCode && r.PartCode.toLowerCase().includes(ql)) ||
             (r.PartName && r.PartName.toLowerCase().includes(ql)) ||
             (r.ReferenceNo && r.ReferenceNo.toLowerCase().includes(ql));
    }).length;
    const expectedPage = Math.min(expected, PAGE_SIZE);
    ok = cfN === gasN && cfN === expectedPage && cfN > 0;
    detail = 'query="' + q + '" CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + expectedPage;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('09_search_filter', ok, detail);
}

// ===== 10. search empty state =====
{
  await cfPage.evaluate(() => { document.getElementById('itSearch').value = 'zzzzzz_nomatch_qqqq'; document.getElementById('itSearch').dispatchEvent(new Event('keyup')); });
  await gasFrame.evaluate(() => { document.getElementById('itSearch').value = 'zzzzzz_nomatch_qqqq'; document.getElementById('itSearch').dispatchEvent(new Event('keyup')); });
  await sleep(800);
  const cfE = await emptyState(cfPage);
  const gasE = await emptyState(gasFrame);
  const ok = cfE.h === 'No Data Found' && cfE.p === 'No records available in this module.' && JSON.stringify(cfE) === JSON.stringify(gasE);
  check('10_search_empty_state', ok, 'CF=' + JSON.stringify(cfE) + ' GAS=' + JSON.stringify(gasE));
}

// ===== 11. type filter parity =====
{
  await cfPage.evaluate(() => { document.getElementById('itSearch').value = ''; document.getElementById('itSearch').dispatchEvent(new Event('keyup')); });
  await gasFrame.evaluate(() => { document.getElementById('itSearch').value = ''; document.getElementById('itSearch').dispatchEvent(new Event('keyup')); });
  await sleep(700);
  await cfPage.select('#itFilterType', 'Issue');
  await gasFrame.select('#itFilterType', 'Issue');
  await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyITFilter');
  await sleep(800);
  const cfN = await rowCount(cfPage);
  const gasN = await rowCount(gasFrame);
  const expected = gasTxns.filter(r => (r.TransactionType || '').toLowerCase() === 'issue').length;
  const ok = cfN === gasN && cfN === expected;
  check('11_type_filter', ok, 'type=Issue CF=' + cfN + ' GAS=' + gasN + ' expected=' + expected);
}

// ===== 12. part filter parity =====
{
  let ok = false; let detail = '';
  try {
    const parts = await cfPage.evaluate(() => Array.from(document.getElementById('itFilterPart').options).map(o => ({ value: o.value, text: o.textContent })).filter(o => o.value !== ''));
    const gasParts = await gasFrame.evaluate(() => Array.from(document.getElementById('itFilterPart').options).map(o => ({ value: o.value, text: o.textContent })).filter(o => o.value !== ''));
    const partsParity = JSON.stringify(parts) === JSON.stringify(gasParts);
    const pick = parts[0] && parts[0].value;
    if (!pick) { detail = 'no part options to pick'; }
    else {
      await cfPage.select('#itFilterType', '');
      await gasFrame.select('#itFilterType', '');
      await cfPage.select('#itFilterPart', pick);
      await gasFrame.select('#itFilterPart', pick);
      await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyITFilter');
      await sleep(800);
      const cfN = await rowCount(cfPage);
      const gasN = await rowCount(gasFrame);
      const expected = gasTxns.filter(r => r.PartCode === pick).length;
      ok = partsParity && cfN === gasN && cfN === Math.min(expected, PAGE_SIZE) && cfN > 0;
      detail = 'part="' + pick + '" optionsParity=' + partsParity + ' optionsCF=' + parts.length + ' optionsGAS=' + gasParts.length + ' CF=' + cfN + ' GAS=' + gasN + ' expected(filtered)=' + expected + ' expected(page1)=' + Math.min(expected, PAGE_SIZE);
    }
  } catch (e) { detail = 'exception: ' + e.message; }
  check('12_part_filter', ok, detail);
}

// ===== 13. date filter parity =====
{
  let ok = false; let detail = '';
  try {
    const days = gasTxns.map(r => {
      const d = new Date(r.CreatedAt);
      return isNaN(d.getTime()) ? null : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }).filter(Boolean);
    const uniq = [...new Set(days)].sort();
    const lo = uniq[0], hi = uniq[uniq.length - 1];
    await cfPage.select('#itFilterPart', '');
    await gasFrame.select('#itFilterPart', '');
    await cfPage.evaluate((f, t) => { document.getElementById('itFilterFromDate').value = f; document.getElementById('itFilterToDate').value = t; }, lo, hi);
    await gasFrame.evaluate((f, t) => { document.getElementById('itFilterFromDate').value = f; document.getElementById('itFilterToDate').value = t; }, lo, hi);
    await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyITFilter');
    await sleep(800);
    const cfFull = await rowCount(cfPage);
    const gasFull = await rowCount(gasFrame);
    const expFull = gasTxns.filter(r => {
      const d = new Date(r.CreatedAt);
      return !isNaN(d.getTime()) && d >= new Date(lo) && d <= new Date(hi + 'T23:59:59.999');
    }).length;
    const fullOk = cfFull === gasFull && cfFull === Math.min(expFull, PAGE_SIZE);
    if (!fullOk) { detail = 'full-range CF=' + cfFull + ' GAS=' + gasFull + ' expected=' + expFull; }
    else {
      const mid = uniq[Math.floor(uniq.length / 2)];
      await cfPage.evaluate((d) => { document.getElementById('itFilterFromDate').value = d; document.getElementById('itFilterToDate').value = d; }, mid);
      await gasFrame.evaluate((d) => { document.getElementById('itFilterFromDate').value = d; document.getElementById('itFilterToDate').value = d; }, mid);
      await clickButtonBy(cfPage, 'applyFilter'); await clickButtonBy(gasFrame, 'applyITFilter');
      await sleep(800);
      const cfN = await rowCount(cfPage);
      const gasN = await rowCount(gasFrame);
      const expN = gasTxns.filter(r => {
        const d = new Date(r.CreatedAt);
        return !isNaN(d.getTime()) && d >= new Date(mid) && d <= new Date(mid + 'T23:59:59.999');
      }).length;
      ok = cfN === gasN && cfN === Math.min(expN, PAGE_SIZE) && fullOk;
      detail = 'full-range (' + lo + '..' + hi + ') CF=' + cfFull + ' GAS=' + gasFull + ' expected=' + expFull + '; day ' + mid + ' CF=' + cfN + ' GAS=' + gasN + ' expected=' + expN;
    }
  } catch (e) { detail = 'exception: ' + e.message; }
  check('13_date_filter', ok, detail);
}

// ===== 14. clear filter =====
{
  await clickButtonBy(cfPage, 'clearFilter'); await clickButtonBy(gasFrame, 'clearITFilter');
  await sleep(800);
  const cfN = await rowCount(cfPage);
  const gasN = await rowCount(gasFrame);
  const cfReset = await cfPage.evaluate(() => {
    const s = document.getElementById('itSearch');
    const t = document.getElementById('itFilterType');
    const p = document.getElementById('itFilterPart');
    const f = document.getElementById('itFilterFromDate');
    const to = document.getElementById('itFilterToDate');
    return s.value === '' && t.value === '' && p.value === '' && f.value === '' && to.value === '';
  });
  const ok = cfN === gasN && cfN === Math.min(10, gasTxns.length) && cfReset;
  check('14_clear_filter', ok, 'CF=' + cfN + ' GAS=' + gasN + ' controlsReset=' + cfReset);
}

// ===== 15. view modal CF == GAS == data =====
{
  let ok = false; let detail = '';
  try {
    await openFirstView(cfPage);
    await openFirstView(gasFrame);
    const cfM = await viewModalState(cfPage);
    const gasM = await viewModalState(gasFrame);
    const id = cfM.itViewTxnId;
    const idMatches = gasTxns.filter(r => String(r.TransactionID) === id);
    const item = idMatches.length === 1 ? idMatches[0] : (idMatches.find(r => String(r.PartCode) === cfM.itViewPartCode) || idMatches[0]);
    const expTitle = 'Transaction - ' + id;
    const fieldMatch = Object.keys(cfM).every(k => k === '__title' || cfM[k] === gasM[k]);
    const titleOk = cfM.__title === expTitle && gasM.__title === expTitle;
    const fmt = (v, d) => v ? parseFloat(v).toFixed(2) : d;
    const str = v => (v === null || v === undefined ? '' : String(v));
    const exp = {
      itViewType: str(item.TransactionType || '-'),
      itViewPartCode: str(item.PartCode || '-'),
      itViewPartName: str(item.PartName || '-'),
      itViewQty: str(item.Quantity || '0'),
      itViewUnitCost: fmt(item.UnitCost, '0.00'),
      itViewTotalCost: fmt(item.TotalCost, '0.00'),
      itViewRefNo: str(item.ReferenceNo || '-'),
      itViewRefType: str(item.ReferenceType || '-'),
      itViewFromLoc: str(item.FromLocation || '-'),
      itViewToLoc: str(item.ToLocation || '-'),
      itViewProcessedBy: str(item.ProcessedBy || '-'),
      itViewProcessedAt: str(item.ProcessedAt || '-'),
      itViewCreatedAt: str(item.CreatedAt || '-'),
      itViewRemarks: str(item.Remarks || '-')
    };
    const dataMatch = Object.keys(exp).every(k => cfM[k] === exp[k]);
    ok = !!item && fieldMatch && titleOk && dataMatch;
    detail = 'id=' + id + ' title="' + cfM.__title + '" fieldParity(CFvsGAS)=' + fieldMatch + ' dataMatch=' + dataMatch + (dataMatch ? '' : ' diff=' + JSON.stringify(Object.keys(exp).filter(k => cfM[k] !== exp[k]).map(k => k + ' CF=' + JSON.stringify(cfM[k]) + ' exp=' + JSON.stringify(exp[k]))));
  } catch (e) { detail = 'exception: ' + e.message; }
  check('15_view_modal', ok, detail);
  await cfPage.evaluate(() => { const b = document.querySelector('#itViewModal .modal-close'); if (b) b.click(); });
  await gasFrame.evaluate(() => { const b = document.querySelector('#itViewModal .modal-close'); if (b) b.click(); });
}

// ===== 16/17. exports: CSV + PDF byte parity CF vs GAS =====
// NOTE: Page.setDownloadBehavior is browser-global in this Chrome/Puppeteer setup; a second
// session overriding the download path redirects earlier pages' downloads to it. Use ONE
// session and ONE shared dir for both sides, and download+consume sequentially.
const exportCdp = await cfPage.createCDPSession();
await exportCdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: EXPORT_DIR });

const csvName = 'InventoryTransactions_' + new Date().toISOString().slice(0, 10) + '.csv';

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

{
  let ok = false; let detail = '';
  try {
    const cfRes = await downloadWithRetry(cfPage, 'exportCSV', EXPORT_DIR, csvName, 3, 12000);
    const gasRes = await downloadWithRetry(gasFrame, 'exportITCSV', EXPORT_DIR, csvName, 3, 12000);
    const cfContent = cfRes.content;
    const gasContent = gasRes.content;
    if (!cfContent || !gasContent) { detail = 'missing downloads CF=' + !!cfContent + ' GAS=' + !!gasContent + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')'; }
    else {
      const same = cfContent === gasContent;
      const lines = cfContent.split('\n').filter(l => l.length);
      const headerOk = lines.length >= 1 && lines[0].includes('TransactionID') && lines[0].split(',').length === 15;
      const rowCountOk = lines.length - 1 === gasTxns.length;
      ok = same && headerOk && rowCountOk;
      detail = 'bytes CF=' + cfContent.length + ' GAS=' + gasContent.length + ' identical=' + same + ' headerCols=' + (lines[0] || '').split(',').length + ' dataRows=' + (lines.length - 1) + ' expected=' + gasTxns.length + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')';
    }
    const ts = await toasts(cfPage);
    if (!ts.some(t => t === 'Export completed')) { ok = false; detail += ' | toast "Export completed" missing'; }
    else detail += ' | toast ok';
  } catch (e) { detail = 'exception: ' + e.message; }
  check('16_csv_export', ok, detail);
}

const pdfName = 'InventoryTransactions_' + new Date().toISOString().slice(0, 10) + '.html';

{
  let ok = false; let detail = '';
  try {
    const cfRes = await downloadWithRetry(cfPage, 'exportPDF', EXPORT_DIR, pdfName, 3, 12000);
    const gasRes = await downloadWithRetry(gasFrame, 'exportITPDF', EXPORT_DIR, pdfName, 3, 12000);
    const cfContent = cfRes.content;
    const gasContent = gasRes.content;
    if (!cfContent || !gasContent) { detail = 'missing downloads CF=' + !!cfContent + ' GAS=' + !!gasContent + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')'; }
    else {
      const strip = s => s.replace(/Generated:[^\n<]*/g, 'Generated:').replace(/<h2[^>]*>[^<]*<\/h2>/g, '<h2>Inventory Transactions Report</h2>');
      const same = strip(cfContent) === strip(gasContent);
      const titleOk = cfContent.includes('Inventory Transactions Report');
      const thOk = ['Txn ID', 'Type', 'Part Code', 'Part Name', 'Qty', 'Unit Cost', 'Total Cost', 'Reference'].every(h => cfContent.includes('<th>' + h + '</th>'));
      const rowCountOk = (cfContent.match(/<tr>/g) || []).length - 1 === gasTxns.length;
      ok = same && titleOk && thOk && rowCountOk;
      detail = 'bytes CF=' + cfContent.length + ' GAS=' + gasContent.length + ' identical(gen-stripped)=' + same + ' title=' + titleOk + ' th=' + thOk + ' dataRows=' + ((cfContent.match(/<tr>/g) || []).length - 1) + ' expected=' + gasTxns.length + ' (cfAttempts=' + cfRes.attempts + ' gasAttempts=' + gasRes.attempts + ')';
    }
    const ts = await toasts(cfPage);
    if (!ts.some(t => t === 'PDF export completed')) { ok = false; detail += ' | toast "PDF export completed" missing'; }
    else detail += ' | toast ok';
  } catch (e) { detail = 'exception: ' + e.message; }
  check('17_pdf_export', ok, detail);
}

// ===== 18. print parity =====
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
    await clickButtonBy(cfPage, 'print'); await clickButtonBy(gasFrame, 'printIT');
    await sleep(1200);
    const cfCalls = await cfPage.evaluate(() => window.__printCalls || 0);
    const gasCalls = await gasFrame.evaluate(() => window.__printCalls || 0);
    ok = cfCalls === 1 && gasCalls === 1;
    detail = 'CF print calls=' + cfCalls + ' GAS print calls=' + gasCalls;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('18_print', ok, detail);
}

// ===== 19b. data matches GAS (raw byte-identical) =====
{
  let ok = false; let detail = '';
  const firstDiff = (a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i;
    return a.length === b.length ? -1 : len;
  };
  const ctx = (s, i) => i < 0 ? '' : JSON.stringify(s.slice(Math.max(0, i - 30), i + 30));
  try {
    const cfT = net['getInventoryTransactions'];
    const cfP = net['getSpareParts'];
    const gasT = await gasCall('getInventoryTransactions', {});
    const gasP = await gasCall('getSpareParts', {});
    const stripTs = s => s.replace(/"ts":"[^"]*"/g, '"ts":""');
    const stripTsDeep = b => { const c = Object.assign({}, b); delete c.ts; return c; };
    const txnsOk = cfT && stripTs(cfT.raw) === stripTs(gasT.raw);
    const partsOk = cfP && stripTs(cfP.raw) === stripTs(gasP.raw);
    const txnsDeep = cfT && cfT.body && JSON.stringify(stripTsDeep(cfT.body)) === JSON.stringify(stripTsDeep(gasT.body));
    const partsDeep = cfP && cfP.body && JSON.stringify(stripTsDeep(cfP.body)) === JSON.stringify(stripTsDeep(gasP.body));
    ok = txnsOk && partsOk;
    detail = 'getInventoryTransactions rawIdentical(ts-stripped)=' + txnsOk + ' (len ' + (cfT ? cfT.raw.length : 0) + ' vs ' + gasT.raw.length + ', firstDiff@' + (cfT ? firstDiff(stripTs(cfT.raw), stripTs(gasT.raw)) : '?') + ') | getSpareParts rawIdentical(ts-stripped)=' + partsOk + ' (len ' + (cfP ? cfP.raw.length : 0) + ' vs ' + gasP.raw.length + ', firstDiff@' + (cfP ? firstDiff(stripTs(cfP.raw), stripTs(gasP.raw)) : '?') + ') | parsedDeepEqual txns=' + txnsDeep + ' parts=' + partsDeep;
  } catch (e) { detail = 'exception: ' + e.message; }
  check('19b_data_matches_gas', ok, detail);
}

// ===== 20. visual parity: computed styles CF vs GAS (scoped to IT page) =====
{
  const cfS = await collectStyles(cfPage, PAGE_SELS, '#itPage');
  const gasS = await collectStyles(gasFrame, PAGE_SELS, '#inventorytransactionsPage');
  const cfM = await collectStyles(cfPage, MODAL_SELS, '#itViewModal');
  const gasM = await collectStyles(gasFrame, MODAL_SELS, '#itViewModal');
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
  check('20_visual_parity', mismatches.length === 0, mismatches.length ? mismatches.slice(0, 8).join(' | ') : 'computed styles match for ' + ALL_STYLE_SELS.length + ' selectors');
}

// ===== 21. mobile responsive parity =====
{
  await cfPage.setViewport({ width: 390, height: 844 });
  await gasPage.setViewport({ width: 390, height: 844 });
  await sleep(600);
  const measure = (pg) => pg.evaluate(() => {
    const grid = document.getElementById('itSummaryCards');
    const filter = document.getElementById('itFilterBar');
    const tc = document.querySelector('#itTableContainer .table-container');
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
  check('21_mobile_responsive', ok, 'CF=' + JSON.stringify(cfM) + ' GAS=' + JSON.stringify(gasM));
  await cfPage.setViewport({ width: 1440, height: 900 });
  await gasPage.setViewport({ width: 1440, height: 900 });
}

// ===== 22/23. console/page errors =====
{
  const apiErrors = cfConsoleErrors.filter(t => t.includes('[API]'));
  check('22_no_api_errors', apiErrors.length === 0, 'api console errors: ' + (apiErrors.length ? JSON.stringify(apiErrors.slice(0, 5)) : '(none)'));
  const cfErr = cfPageErrors.filter(e => !e.includes('gstatic'));
  const gasErr = gasPageErrors.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource'));
  const ok = cfErr.length === 0 && gasErr.length === 0;
  check('23_no_page_errors', ok, 'CF page errors: ' + (cfErr.length ? JSON.stringify(cfErr.slice(0, 5)) : '(none)') + ' | GAS page errors: ' + (gasErr.length ? JSON.stringify(gasErr.slice(0, 5)) : '(none)'));
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
