import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'audit-trail.js');
const EXPORT_DIR = path.join(__dirname, 'tmp_audit_export');
const PAGE_SIZE = 20;

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

function clearDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
}

// Snapshot-pinning: first real getAuditLogs response is frozen; every later call is mocked
// with the same bytes so the dataset is deterministic for the whole session.
let snapRaw = null;
let snapRecords = null;
let pinned = false;
let getAuditLogsCalls = 0;
const seenActions = {};

const STATIC_MODULE_OPTS = ['Login', 'Logout', 'Job Card', 'Machine', 'Asset', 'Department', 'Section', 'Technician', 'User', 'Spare Part', 'Inventory', 'Goods Receipt', 'Preventive Maintenance', 'Settings', 'Permission'];
const STATIC_ACTION_OPTS = ['Login', 'Logout', 'Create', 'Update', 'Delete', 'Approve', 'Reject', 'Open', 'Start', 'Close', 'Complete', 'Cancel', 'Stock In', 'Stock Out', 'Goods Receipt', 'Permission Changed', 'Settings Changed'];
const STATIC_STATUS_OPTS = ['Success', 'Failure', 'Warning'];
const STATIC_ROLE_OPTS = ['Admin', 'Department Manager', 'Maintenance Manager', 'Supervisor', 'Technician', 'Operator', 'Store', 'Viewer'];

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

async function waitForFile(dir, filename, timeout) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    await sleep(300);
  }
  return null;
}

async function rowCount(pg) {
  return pg.evaluate(() => document.querySelectorAll('#auditTableBody tr').length);
}

async function paginationInfo(pg) {
  return pg.evaluate(() => { const el = document.getElementById('auditPaginationInfo'); return el ? el.textContent.trim() : null; });
}

async function summaryCards(pg) {
  const ids = ['auditTotalCount', 'auditTodayCount', 'auditModuleCount', 'auditUserCount'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    return out;
  }, ids);
}

async function setFilter(pg, id, value, evt) {
  return pg.evaluate((args) => {
    const el = document.getElementById(args.id);
    if (!el) return false;
    el.value = args.value;
    el.dispatchEvent(new Event(args.evt || 'change', { bubbles: true }));
    return true;
  }, { id, value, evt });
}

async function selectOptions(pg, id) {
  return pg.evaluate((id) => Array.from(document.querySelectorAll('#' + id + ' option')).map(o => o.textContent.trim()), id);
}

async function toasts(pg) {
  return pg.evaluate(() => (window.__toasts || []).filter(Boolean));
}

async function clickByHandler(pg, substr) {
  return pg.evaluate((substr) => {
    const all = Array.from(document.querySelectorAll('#auditPage button, #auditPage a, #auditPage input[type=button]'));
    const b = all.find(x => (x.getAttribute('onclick') || '').includes(substr));
    if (!b) return false;
    b.click();
    return true;
  }, substr);
}

async function installToastObserver(pg) {
  await pg.evaluate(() => {
    window.__toasts = [];
    const root = document.body || document.documentElement;
    if (!root) return;
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) {
            window.__toasts.push(n.textContent.trim());
          }
        }
      }
    });
    obs.observe(root, { childList: true, subtree: true });
  });
}

let browser;
try {
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
  const cfPage = await browser.newPage();
  await cfPage.setViewport({ width: 1440, height: 900 });

  const cfConsoleErrors = [];
  const cfPageErrors = [];
  const cfLogs = [];
  cfPage.on('console', m => {
    if (m.type() === 'log' && m.text().includes('[AUDIT DIAGNOSTIC]')) cfLogs.push(m.text().slice(0, 200));
    if (m.type() === 'error' || m.text().includes('[API]')) cfConsoleErrors.push(m.text().slice(0, 300));
  });
  cfPage.on('pageerror', e => cfPageErrors.push(String(e).slice(0, 300)));

  await cfPage.setRequestInterception(true);
  cfPage.on('request', req => {
    const url = req.url();
    if (url.includes('/js/pages/audit-trail.js')) {
      req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(LOCAL_JS, 'utf8') });
      return;
    }
    if (req.method() === 'POST' && url.includes('/api/exec')) {
      let d = null;
      try { d = JSON.parse(req.postData() || '{}'); } catch (e) {}
      const action = d ? d.action : null;
      if (!action) { req.continue(); return; }
      seenActions[action] = (seenActions[action] || 0) + 1;
      if (action === 'getAuditLogs' && pinned && snapRaw) {
        req.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: snapRaw });
        return;
      }
      req.continue();
      return;
    }
    req.continue();
  });

  cfPage.on('response', async res => {
    if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
      try {
        let action = null;
        try { action = JSON.parse(res.request().postData() || '{}').action; } catch (e) {}
        if (action === 'getAuditLogs' && !pinned) {
          getAuditLogsCalls++;
          const raw = await res.text().catch(() => 'null');
          const j = JSON.parse(raw);
          const recs = (j.data && j.data.records) || j.data;
          if (Array.isArray(recs) && recs.length >= 100) {
            snapRaw = raw;
            snapRecords = recs;
            pinned = true;
          }
        }
      } catch (e) {}
    }
  });

  await cfPage.evaluateOnNewDocument(() => {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(rs => { rs.forEach(r => { try { r.unregister(); } catch (e) {} }); });
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
  await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
  await cfPage.type('#loginEmail', EMAIL);
  await cfPage.type('#loginPassword', PASSWORD);
  await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 90000 });
  await cfPage.waitForSelector('#pageContent', { timeout: 60000 });

  await cfPage.evaluate(() => navigateTo('audit'));
  const snapStart = Date.now();
  while (!(pinned && snapRecords)) {
    if (Date.now() - snapStart > 30000) {
      console.log('SNAPSHOT_TIMEOUT diagnostics: seenActions=' + JSON.stringify(seenActions));
      throw new Error('snapshot capture timeout');
    }
    await sleep(300);
  }
  await cfPage.waitForFunction(() => {
    const t = document.getElementById('auditTableBody');
    const info = document.getElementById('auditPaginationInfo');
    if (!t || !info) return false;
    return !t.innerHTML.includes('Loading audit logs') && info.textContent.indexOf('Showing') === 0;
  }, { timeout: 120000 });
  await sleep(1500);
  await installToastObserver(cfPage);

  const total = snapRecords.length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let todayCount = 0; const moduleSet = {}; const userSet = {};
  snapRecords.forEach(r => {
    const dt = new Date(r.DateTime);
    if (!isNaN(dt.getTime()) && dt >= today) todayCount++;
    if (r.Module) moduleSet[r.Module] = true;
    if (r.UserEmail) userSet[r.UserEmail] = true;
  });

  const expSummary = { auditTotalCount: String(total), auditTodayCount: String(todayCount), auditModuleCount: String(Object.keys(moduleSet).length), auditUserCount: String(Object.keys(userSet).length) };

  // ===== a. initial state =====
  {
    const s = await summaryCards(cfPage);
    const info = await paginationInfo(cfPage);
    const rows = await rowCount(cfPage);
    const ok = Object.keys(expSummary).every(k => s[k] === expSummary[k]) &&
               info === 'Showing 1-' + Math.min(PAGE_SIZE, total) + ' of ' + total && rows === Math.min(PAGE_SIZE, total);
    check('a_initial_state', ok, 'cards=' + JSON.stringify(s) + ' exp=' + JSON.stringify(expSummary) + ' info="' + info + '" rows=' + rows);
  }

  // ===== b. dropdown options (static + dynamic population) =====
  {
    let ok = false; let detail = '';
    try {
      const userNameSet = {}; const deptNameSet = {};
      snapRecords.forEach(r => { if (r.UserName) userNameSet[r.UserName] = true; if (r.Department) deptNameSet[r.Department] = true; });
      const mod = await selectOptions(cfPage, 'auditFilterModule');
      const act = await selectOptions(cfPage, 'auditFilterAction');
      const st = await selectOptions(cfPage, 'auditFilterStatus');
      const role = await selectOptions(cfPage, 'auditFilterRole');
      const userOpts = await selectOptions(cfPage, 'auditFilterUser');
      const deptOpts = await selectOptions(cfPage, 'auditFilterDept');
      const modOk = STATIC_MODULE_OPTS.every(o => mod.includes(o));
      const actOk = STATIC_ACTION_OPTS.every(o => act.includes(o));
      const stOk = STATIC_STATUS_OPTS.every(o => st.includes(o));
      const roleOk = STATIC_ROLE_OPTS.every(o => role.includes(o));
      const userDyn = userOpts.length === 1 + Object.keys(userNameSet).length && userOpts[0] === 'All Users';
      const deptDyn = deptOpts.length === 1 + Object.keys(deptNameSet).length && deptOpts[0] === 'All Departments';
      ok = modOk && actOk && stOk && roleOk && userDyn && deptDyn;
      detail = 'module=' + mod.length + ' action=' + act.length + ' status=' + st.length + ' role=' + role.length +
               ' user opts=' + userOpts.length + ' (exp ' + (1 + Object.keys(userNameSet).length) + ') dept opts=' + deptOpts.length +
               ' (exp ' + (1 + Object.keys(deptNameSet).length) + ') staticOk=' + (modOk && actOk && stOk && roleOk);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('b_dropdown_options', ok, detail);
  }

  // ===== c. combined filter (search + module + status) =====
  {
    let ok = false; let detail = '';
    try {
      const module = 'Job Card';
      const status = 'Success';
      const q = snapRecords.find(r => r.Module === module && r.Status === status && r.Remarks && r.Remarks.length > 2).Remarks.slice(0, 2);
      const expected = snapRecords.filter(r => {
        const ql = q.toLowerCase();
        let found = false;
        for (const k in r) { if (String(r[k]).toLowerCase().indexOf(ql) > -1) { found = true; break; } }
        return found && r.Module === module && r.Status === status;
      }).length;
      await setFilter(cfPage, 'auditSearch', q, 'keyup');
      await setFilter(cfPage, 'auditFilterModule', module, 'change');
      await setFilter(cfPage, 'auditFilterStatus', status, 'change');
      await sleep(900);
      const rows = await rowCount(cfPage);
      const info = await paginationInfo(cfPage);
      const expPage1 = Math.min(PAGE_SIZE, expected);
      ok = rows === expPage1 && info === 'Showing 1-' + expPage1 + ' of ' + expected;
      detail = 'q="' + q + '" + module=' + module + ' + status=' + status + ' rows=' + rows + ' expected(filtered)=' + expected + ' info="' + info + '"';
    } catch (e) { detail = 'exception: ' + e.message; }
    check('c_combined_filter', ok, detail);
  }

  // ===== d. filtered pagination (page 2 within filtered set) =====
  {
    let ok = false; let detail = '';
    try {
      const module = 'Job Card';
      const expected = snapRecords.filter(r => r.Module === module).length;
      if (expected <= PAGE_SIZE) { check('d_filtered_pagination', true, 'n/a (filtered=' + expected + ' <= ' + PAGE_SIZE + ')'); }
      else {
        await setFilter(cfPage, 'auditSearch', '', 'keyup');
        await setFilter(cfPage, 'auditFilterModule', module, 'change');
        await setFilter(cfPage, 'auditFilterStatus', '', 'change');
        await sleep(900);
        const clicked = await cfPage.evaluate(() => {
          const b = Array.from(document.querySelectorAll('#auditPaginationControls button')).find(x => (x.getAttribute('onclick') || '').toLowerCase().includes('gopage(2)'));
          if (b && !b.disabled) b.click();
          return b ? !b.disabled : false;
        });
        await sleep(800);
        const info = await paginationInfo(cfPage);
        const rows = await rowCount(cfPage);
        const expInfo = 'Showing ' + (PAGE_SIZE + 1) + '-' + Math.min(PAGE_SIZE * 2, expected) + ' of ' + expected;
        const expRows = Math.min(PAGE_SIZE, expected - PAGE_SIZE);
        ok = clicked && info === expInfo && rows === expRows;
        detail = 'module=' + module + ' filtered=' + expected + ' page2Info="' + info + '" (exp "' + expInfo + '") rows=' + rows + ' (exp ' + expRows + ')';
      }
    } catch (e) { detail = 'exception: ' + e.message; }
    check('d_filtered_pagination', ok, detail);
  }

  // ===== e. jump to last page and back to first =====
  {
    let ok = false; let detail = '';
    try {
      await setFilter(cfPage, 'auditSearch', '', 'keyup');
      await setFilter(cfPage, 'auditFilterModule', '', 'change');
      await setFilter(cfPage, 'auditFilterStatus', '', 'change');
      await sleep(900);
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      await cfPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#auditPaginationControls button'));
        const last = btns[btns.length - 1];
        if (last && !last.disabled) last.click();
      });
      await sleep(800);
      const infoLast = await paginationInfo(cfPage);
      const expLast = 'Showing ' + ((totalPages - 1) * PAGE_SIZE + 1) + '-' + total + ' of ' + total;
      await cfPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#auditPaginationControls button'));
        const first = btns[0];
        if (first && !first.disabled) first.click();
      });
      await sleep(800);
      const infoFirst = await paginationInfo(cfPage);
      ok = infoLast === expLast && infoFirst === 'Showing 1-' + PAGE_SIZE + ' of ' + total;
      detail = 'totalPages=' + totalPages + ' lastInfo="' + infoLast + '" (exp "' + expLast + '") backToFirst="' + infoFirst + '"';
    } catch (e) { detail = 'exception: ' + e.message; }
    check('e_last_first_jump', ok, detail);
  }

  // ===== f. clear-filters button resets everything =====
  {
    let ok = false; let detail = '';
    try {
      await setFilter(cfPage, 'auditSearch', 'zzz', 'keyup');
      await setFilter(cfPage, 'auditFilterModule', 'Machine', 'change');
      await setFilter(cfPage, 'auditFilterStatus', 'Failure', 'change');
      await sleep(900);
      await clickByHandler(cfPage, 'clearFilters');
      await sleep(800);
      const state = await cfPage.evaluate(() => {
        const ids = ['auditSearch', 'auditDateFrom', 'auditDateTo', 'auditFilterUser', 'auditFilterDept', 'auditFilterModule', 'auditFilterAction', 'auditFilterStatus', 'auditFilterRole'];
        const vals = {};
        ids.forEach(id => { const el = document.getElementById(id); vals[id] = el ? el.value : 'MISSING'; });
        return vals;
      });
      const info = await paginationInfo(cfPage);
      const rows = await rowCount(cfPage);
      const allEmpty = Object.values(state).every(v => v === '' || v === 'MISSING');
      ok = allEmpty && info === 'Showing 1-' + PAGE_SIZE + ' of ' + total && rows === PAGE_SIZE;
      detail = 'controls=' + JSON.stringify(state) + ' info="' + info + '" rows=' + rows;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('f_clear_filters_button', ok, detail);
  }

  // ===== g. refresh re-fetches (mocked) and resets page 1 =====
  {
    let ok = false; let detail = '';
    try {
      const callsBefore = seenActions['getAuditLogs'] || 0;
      await cfPage.evaluate(() => { const b = Array.from(document.querySelectorAll('#auditPaginationControls button')); const last = b[b.length - 1]; if (last && !last.disabled) last.click(); });
      await sleep(600);
      const infoBefore = await paginationInfo(cfPage);
      await clickByHandler(cfPage, 'refresh');
      await sleep(1800);
      const callsAfter = seenActions['getAuditLogs'] || 0;
      const info = await paginationInfo(cfPage);
      const rows = await rowCount(cfPage);
      const cards = await summaryCards(cfPage);
      const errToasts = (await toasts(cfPage)).filter(t => t.includes('Failed') || t.includes('error'));
      ok = callsAfter === callsBefore + 1 && infoBefore !== info && info === 'Showing 1-' + PAGE_SIZE + ' of ' + total &&
           rows === PAGE_SIZE && cards.auditTotalCount === String(total) && errToasts.length === 0;
      detail = 'getAuditLogs calls ' + callsBefore + ' -> ' + callsAfter + ' infoBefore="' + infoBefore + '" info="' + info + '" rows=' + rows + ' errToasts=' + JSON.stringify(errToasts);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('g_refresh_requery', ok, detail);
  }

  // ===== h. diagnostic logs + success toast =====
  {
    let ok = false; let detail = '';
    try {
      await installToastObserver(cfPage);
      const diagLogStart = cfLogs.length;
      await clickByHandler(cfPage, 'runDiagnostic');
      await sleep(700);
      const newToasts = await toasts(cfPage);
      const diagLogged = cfLogs.length > diagLogStart;
      const runDiagnosticCallable = await cfPage.evaluate(() => { try { return typeof AuditTrail.runDiagnostic === 'function'; } catch (e) { return false; } });
      ok = newToasts.some(t => t.includes('Diagnostic completed')) && diagLogged && runDiagnosticCallable;
      detail = 'toasts=' + JSON.stringify(newToasts) + ' diagLogged=' + diagLogged + ' diagLog="' + (cfLogs[diagLogStart] || '') + '" runDiagnosticCallable=' + runDiagnosticCallable;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('h_diagnostic', ok, detail);
  }

  // ===== i. CSV download fires with full dataset =====
  {
    let ok = false; let detail = '';
    try {
      clearDir(EXPORT_DIR);
      const exportCdp = await cfPage.createCDPSession();
      await exportCdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: EXPORT_DIR });
      const clicked = await clickByHandler(cfPage, 'exportCSV');
      const content = await waitForFile(EXPORT_DIR, 'audit_trail_export.csv', 20000);
      const headerLine = content ? content.split('\n')[0] : '';
      const dataRows = content ? countCsvRecords(content) - 1 : 0;
      ok = !!clicked && !!content && headerLine === 'AuditID,DateTime,UserEmail,UserName,Role,Department,Module,Action,RecordID,RecordName,OldValue,NewValue,Status,Remarks' &&
           dataRows === total;
      detail = 'clicked=' + clicked + ' csv=' + (content ? content.length + 'B' : 'MISSING') + ' dataRows=' + dataRows + ' (exp ' + total + ')';
    } catch (e) { detail = 'exception: ' + e.message; }
    check('i_csv_download', ok, detail);
  }

  // ===== j. empty-state export warns =====
  {
    let ok = false; let detail = '';
    try {
      await installToastObserver(cfPage);
      await setFilter(cfPage, 'auditSearch', 'zzzzzz_nomatch_qqqq', 'keyup');
      await sleep(800);
      const rows = await rowCount(cfPage);
      const info = await paginationInfo(cfPage);
      await clickByHandler(cfPage, 'exportCSV');
      await sleep(700);
      const newToasts = await toasts(cfPage);
      ok = rows === 1 && info === 'Showing 0-0 of 0' && newToasts.some(t => t.includes('No data to export'));
      detail = 'rows=' + rows + ' info="' + info + '" toasts=' + JSON.stringify(newToasts);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('j_empty_export_warns', ok, detail);
  }

  // ===== k. no errors =====
  {
    const apiErrs = cfConsoleErrors.filter(t => t.includes('[API]') || t.includes('Failed to load'));
    const otherErrs = cfConsoleErrors.filter(t => !t.includes('[API]') && !t.includes('Failed to load') && !t.includes('[AUDIT DIAGNOSTIC]'));
    check('k_no_api_errors', apiErrs.length === 0, 'api console errors: ' + (apiErrs.length ? JSON.stringify(apiErrs) : '(none)'));
    check('l_no_page_errors', cfPageErrors.length === 0 && otherErrs.length === 0,
      'page errors: ' + (cfPageErrors.length ? JSON.stringify(cfPageErrors) : '(none)') + ' | other console: ' + (otherErrs.length ? JSON.stringify(otherErrs) : '(none)'));
  }

  console.log('===== SUMMARY =====');
  for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.detail);
  console.log('PASS: ' + results.filter(r => r.ok).length + '  FAIL: ' + failures.length);
  console.log('FAILED ITEMS: ' + (failures.length ? failures.join(', ') : '(none)'));
  console.log('RESULT: ' + (failures.length === 0 ? 'COMPLETE' : 'INCOMPLETE'));
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  clearDir(EXPORT_DIR);
  process.exit(process.exitCode || 0);
}
