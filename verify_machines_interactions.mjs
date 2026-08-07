import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'machines.js');
const LOCAL_CONSTANTS = path.join(__dirname, 'cloudflare', 'js', 'core', 'constants.js');

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
async function toasts(pg) { return pg.evaluate(() => (window.__toasts || []).filter(Boolean)); }
async function rowCount(pg) { return pg.evaluate(() => document.querySelectorAll('#machinesTableContainer table tbody tr').length); }

// ---- mocked API state ----
let mockMachines = [];
let mockPinned = false;
const seenActions = {};
const MOCK_DEPTS = [
  { DeptID: 'DPT1', Department: 'Mechanical', SectionID: 'SEC1', Section: 'Mechanical Section' },
  { DeptID: 'DPT2', Department: 'Electrical', SectionID: 'SEC2', Section: 'Electrical Section' }
];

function respond(data) { return { status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data }) }; }
function cloneArr(a) { return JSON.parse(JSON.stringify(a)); }
function searchMock(query) {
  const q = (query || '').toLowerCase();
  if (!q) return cloneArr(mockMachines);
  return mockMachines.filter(m => { for (const k in m) { if (String(m[k]).toLowerCase().indexOf(q) !== -1) return true; } return false; });
}

let browser;
try {
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const cfConsoleErrors = [];
  const cfPageErrors = [];
  page.on('console', m => {
    if (m.type() === 'error' || m.text().includes('[API]')) cfConsoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', e => cfPageErrors.push(String(e).slice(0, 300)));

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/js/pages/machines.js')) {
      req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(LOCAL_JS, 'utf8') });
      return;
    }
    if (url.includes('/js/core/constants.js')) {
      req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(LOCAL_CONSTANTS, 'utf8') });
      return;
    }
    if (req.method() === 'POST' && url.includes('/api/exec')) {
      let d = null;
      try { d = JSON.parse(req.postData() || '{}'); } catch (e) {}
      const action = d ? d.action : null;
      if (!action) { req.continue(); return; }
      seenActions[action] = (seenActions[action] || 0) + 1;
      if (action === 'getMachines' && mockPinned) { req.respond(respond(cloneArr(mockMachines))); return; }
      if (action === 'getDepartmentList') { req.respond(respond(cloneArr(MOCK_DEPTS))); return; }
      if (action === 'searchMachines') {
        let q = '';
        try { q = JSON.parse(req.postData() || '{}').data.query || ''; } catch (e) {}
        req.respond(respond(searchMock(q)));
        return;
      }
      if (action === 'addMachine') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        const nextId = 'MCH' + String(1000 + mockMachines.length).padStart(4, '0');
        mockMachines.push(Object.assign({ MachineID: nextId }, data, { MachineID: nextId }));
        req.respond(respond(cloneArr(mockMachines)));
        return;
      }
      if (action === 'updateMachine') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        const id = data.id;
        const idx = mockMachines.findIndex(m => String(m.MachineID) === String(id));
        if (idx >= 0) mockMachines[idx] = Object.assign({}, mockMachines[idx], data, { MachineID: id });
        req.respond(respond(cloneArr(mockMachines)));
        return;
      }
      if (action === 'deleteMachine') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        mockMachines = mockMachines.filter(m => String(m.MachineID) !== String(data.id));
        req.respond(respond(cloneArr(mockMachines)));
        return;
      }
      req.continue();
      return;
    }
    req.continue();
  });

  page.on('response', async res => {
    if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
      try {
        let action = null;
        try { action = JSON.parse(res.request().postData() || '{}').action; } catch (e) {}
        if (action === 'getMachines' && !mockPinned) {
          const raw = await res.text().catch(() => 'null');
          const j = JSON.parse(raw);
          const arr = Array.isArray(j.data) ? j.data : (j.data && j.data.records) || [];
          if (Array.isArray(arr) && arr.length > 0) {
            mockMachines = JSON.parse(JSON.stringify(arr));
            mockPinned = true;
          }
        }
      } catch (e) {}
    }
  });

  await page.evaluateOnNewDocument(() => {
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

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#loginForm', { timeout: 60000 });
  await page.type('#loginEmail', EMAIL);
  await page.type('#loginPassword', PASSWORD);
  await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 90000 });
  await page.waitForSelector('#pageContent', { timeout: 60000 });

  await page.evaluate(() => navigateTo('machines'));
  const t0 = Date.now();
  while (!mockPinned) {
    if (Date.now() - t0 > 30000) throw new Error('snapshot capture timeout; seenActions=' + JSON.stringify(seenActions));
    await sleep(300);
  }
  await page.waitForFunction(() => {
    const t = document.querySelector('#machinesTableContainer table');
    return !!t && t.querySelectorAll('tbody tr').length > 0;
  }, { timeout: 120000 });
  await sleep(1200);
  await installToastObserver(page);
  console.log('CF machines page loaded (mocked ' + mockMachines.length + ' machines)');

  const firstReal = mockMachines[0];

  // ===== a. initial state =====
  {
    const rows = await rowCount(page);
    const headers = await page.evaluate(() => document.querySelectorAll('#machinesTableContainer table thead th').length);
    const addBtn = await page.evaluate(() => {
      const b = document.querySelector('#machinesPage .card-actions .btn-primary');
      return b ? (b.getAttribute('onclick') || '') : '';
    });
    const placeholder = await page.evaluate(() => (document.getElementById('machineSearch') || {}).placeholder || '');
    const ok = rows === Math.min(10, mockMachines.length) && headers === 15 && addBtn.includes('openAdd') && placeholder === 'Search machines...';
    check('a_initial_state', ok, 'rows=' + rows + ' headers=' + headers + ' addBtn="' + addBtn + '" placeholder="' + placeholder + '"');
  }

  // ===== b. add modal opens, form reset, depts/type populated =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => Machine.openAdd());
      await sleep(500);
      const state = await page.evaluate(() => {
        const g = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
        return {
          title: document.getElementById('machineFormTitle').textContent.trim(),
          visible: !!document.getElementById('machineFormModal').classList.contains('show'),
          code: g('mcCode'), name: g('mcName'), editId: g('editMachineId'),
          criticality: g('mcCriticality'),
          deptOpts: Array.from(document.querySelectorAll('#mcDept option')).map(o => o.textContent.trim()),
          typeOpts: Array.from(document.querySelectorAll('#mcType option')).map(o => o.textContent.trim())
        };
      });
      const conds = {
        visible: state.visible === true,
        title: state.title === 'Add Machine',
        code: state.code === '', name: state.name === '', editId: state.editId === '',
        criticality: state.criticality === 'Low',
        dept: state.deptOpts.length === 1 + MOCK_DEPTS.length,
        types: state.typeOpts.length === 11 && JSON.stringify(state.typeOpts) === JSON.stringify(['CNC','Hydraulic','Pneumatic','Electrical','Mechanical','Robotic','Conveyor','Pump','Compressor','Generator','Other'])
      };
      ok = conds.visible && conds.title && conds.code && conds.name && conds.editId && conds.criticality && conds.dept && conds.types;
      detail = JSON.stringify({ state, conds });
    } catch (e) { detail = 'exception: ' + e.message; }
    check('b_add_modal_open', ok, detail);
  }

  // ===== c. add validation (required code + name) =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => Machine.openAdd());
      await sleep(400);
      await page.evaluate(() => Machine.save({ preventDefault: function() {} }));
      await sleep(400);
      const t1 = await toasts(page);
      const step1 = t1.some(x => x.includes('Machine Code is required'));
      await page.evaluate(() => { document.getElementById('mcCode').value = 'MC-TEST'; });
      await page.evaluate(() => Machine.save({ preventDefault: function() {} }));
      await sleep(400);
      const t2 = await toasts(page);
      const step2 = t2.some(x => x.includes('Machine Name is required'));
      ok = step1 && step2;
      detail = 'emptyWarn=' + step1 + ' codeOnlyWarn=' + step2 + ' toasts=' + JSON.stringify(t2);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('c_add_validation', ok, detail);
  }

  // ===== d. mcCode -> mcNumber auto sync =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => Machine.openAdd());
      await sleep(400);
      await page.evaluate(() => {
        const el = document.getElementById('mcCode');
        el.value = 'SYNC-99';
        el.dispatchEvent(new Event('input'));
      });
      await sleep(300);
      const number = await page.evaluate(() => document.getElementById('mcNumber').value);
      ok = number === 'SYNC-99';
      detail = 'mcNumber="' + number + '" (expected "SYNC-99")';
    } catch (e) { detail = 'exception: ' + e.message; }
    check('d_code_number_sync', ok, detail);
  }

  // ===== e. dept change auto-selects section =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => {
        document.getElementById('mcDept').value = 'DPT1';
        Machine.onDeptChange();
      });
      await sleep(300);
      const state = await page.evaluate(() => {
        const sec = document.getElementById('mcSection');
        return { opts: Array.from(sec.options).map(o => o.textContent.trim()), selected: sec.value };
      });
      ok = state.selected === 'SEC1' && state.opts.indexOf('Mechanical Section') !== -1;
      detail = 'section selected="' + state.selected + '" options=' + JSON.stringify(state.opts);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('e_dept_autosection', ok, detail);
  }

  // ===== f. add machine success (mocked addMachine) =====
  {
    let ok = false; let detail = '';
    try {
      const before = mockMachines.length;
      await page.evaluate(() => {
        document.getElementById('mcCode').value = 'MC-100';
        document.getElementById('mcName').value = 'New Grinder';
        document.getElementById('mcDept').value = 'DPT1';
        Machine.onDeptChange();
        document.getElementById('mcType').value = 'Pump';
        document.getElementById('mcLocation').value = 'Plant B';
        document.getElementById('mcManufacturer').value = 'Acme';
        document.getElementById('mcCriticality').value = 'High';
        document.getElementById('mcQRCode').value = 'QR-MC100';
      });
      await page.evaluate(() => Machine.save({ preventDefault: function() {} }));
      await sleep(1200);
      const t = await toasts(page);
      const rows = await rowCount(page);
      const modalGone = await page.evaluate(() => !document.getElementById('machineFormModal').classList.contains('show'));
      const newId = 'MCH' + String(1000 + before).padStart(4, '0');
      const added = mockMachines.find(m => m.MachineID === newId);
      ok = (seenActions['addMachine'] || 0) >= 1 && t.some(x => x.includes('Machine added successfully')) &&
           rows === Math.min(10, before + 1) && modalGone && !!added && added.MachineName === 'New Grinder' &&
           added.Department === 'Mechanical' && added.Section === 'Mechanical Section';
      detail = 'addMachineCalls=' + (seenActions['addMachine'] || 0) + ' rows=' + rows + ' (exp ' + Math.min(10, before + 1) + ') toast=' + JSON.stringify(t) + ' modalClosed=' + modalGone + ' added=' + JSON.stringify(added);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('f_add_success', ok, detail);
  }

  // ===== g. edit populates form from machine =====
  {
    let ok = false; let detail = '';
    try {
      const target = mockMachines.find(m => m.MachineCode === 'MC-100') || mockMachines[0];
      await page.evaluate((id) => Machine.openEdit(id), target.MachineID);
      await sleep(600);
      const state = await page.evaluate(() => {
        const g = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
        const dept = document.getElementById('mcDept');
        const sec = document.getElementById('mcSection');
        return {
          title: document.getElementById('machineFormTitle').textContent.trim(),
          code: g('mcCode'), name: g('mcName'), number: g('mcNumber'),
          editId: g('editMachineId'), type: g('mcType'), criticality: g('mcCriticality'),
          deptSelected: dept && dept.selectedIndex > 0 ? dept.options[dept.selectedIndex].textContent : '',
          sectionSelected: sec && sec.selectedIndex > 0 ? sec.options[sec.selectedIndex].textContent : '',
          sectionVal: g('mcSection')
        };
      });
      ok = state.title.indexOf('Edit Machine -') === 0 && state.code === (target.MachineCode || '') &&
           state.name === (target.MachineName || '') && state.editId === target.MachineID &&
           state.criticality === (target.Criticality || 'Low') && state.sectionVal === 'SEC1';
      detail = 'target=' + target.MachineID + ' state=' + JSON.stringify(state);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('g_edit_populate', ok, detail);
  }

  // ===== h. edit save success (mocked updateMachine) =====
  {
    let ok = false; let detail = '';
    try {
      const target = mockMachines.find(m => m.MachineCode === 'MC-100') || mockMachines[0];
      const before = (seenActions['updateMachine'] || 0);
      await page.evaluate(() => { document.getElementById('mcName').value = 'Renamed Grinder'; });
      await page.evaluate(() => Machine.save({ preventDefault: function() {} }));
      await sleep(1200);
      const t = await toasts(page);
      const modalGone = await page.evaluate(() => !document.getElementById('machineFormModal').classList.contains('show'));
      const updated = mockMachines.find(m => m.MachineID === target.MachineID);
      ok = (seenActions['updateMachine'] || 0) === before + 1 && t.some(x => x.includes('Machine updated successfully')) &&
           modalGone && !!updated && updated.MachineName === 'Renamed Grinder' &&
           updated.Location === 'Plant B';
      detail = 'updateCalls=' + before + '->' + (seenActions['updateMachine'] || 0) + ' toast=' + JSON.stringify(t) + ' modalClosed=' + modalGone + ' updated=' + JSON.stringify(updated);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('h_edit_save', ok, detail);
  }

  // ===== i. delete flow (mocked deleteMachine) =====
  {
    let ok = false; let detail = '';
    try {
      const target = mockMachines.find(m => m.MachineCode === 'MC-100') || mockMachines[0];
      const before = (seenActions['deleteMachine'] || 0);
      const countBefore = mockMachines.length;
      await page.evaluate((id) => Machine.confirmDelete(id), target.MachineID);
      await sleep(600);
      const dlg = await page.evaluate(() => {
        const m = document.getElementById('confirmModal');
        if (!m || !m.classList.contains('show')) return null;
        return { title: m.querySelector('.modal-title') ? m.querySelector('.modal-title').textContent : null, msg: m.querySelector('.modal-body p') ? m.querySelector('.modal-body p').textContent : null };
      });
      const dlgOk = !!dlg && dlg.title === 'Delete Machine' && dlg.msg === 'Are you sure you want to delete this machine?';
      if (dlgOk) {
        await page.evaluate(() => { const b = document.querySelector('#confirmModal .btn-danger'); if (b) b.click(); });
        await sleep(1200);
      }
      const t = await toasts(page);
      const callsAfter = (seenActions['deleteMachine'] || 0);
      const rows = await rowCount(page);
      const confirmClosed = await page.evaluate(() => !document.getElementById('confirmModal').classList.contains('show'));
      ok = dlgOk && callsAfter === before + 1 && t.some(x => x.includes('Machine deleted successfully')) &&
           mockMachines.length === countBefore - 1 && rows === Math.min(10, countBefore - 1) && confirmClosed;
      detail = 'dialog=' + JSON.stringify(dlg) + ' deleteCalls=' + before + '->' + callsAfter + ' rows=' + rows + ' (exp ' + Math.min(10, countBefore - 1) + ') confirmClosed=' + confirmClosed + ' toasts=' + JSON.stringify(t);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('i_delete_flow', ok, detail);
  }

  // ===== j. search filters + empty state + clear keeps subset =====
  {
    let ok = false; let detail = '';
    try {
      const q = (firstReal.MachineName || firstReal.MachineCode || '').slice(0, 4);
      await page.evaluate((v) => {
        const el = document.getElementById('machineSearch');
        el.value = v;
        el.dispatchEvent(new Event('keyup'));
      }, q);
      await sleep(900);
      const filtered = searchMock(q);
      const rowsF = await rowCount(page);
      const rowOk = rowsF === Math.min(10, filtered.length);
      await page.evaluate((v) => {
        const el = document.getElementById('machineSearch');
        el.value = v;
        el.dispatchEvent(new Event('keyup'));
      }, 'zzzz_nomatch_zzzz');
      await sleep(900);
      const empty = await page.evaluate(() => {
        const c = document.getElementById('machinesTableContainer');
        return c && c.innerHTML.indexOf('No Data Found') !== -1 && c.innerHTML.indexOf('No records available in this module.') !== -1;
      });
      await page.evaluate(() => {
        const el = document.getElementById('machineSearch');
        el.value = '';
        el.dispatchEvent(new Event('keyup'));
      });
      await sleep(700);
      const afterClear = await rowCount(page);
      const clearKeepsSubset = afterClear === 0;
      ok = rowOk && empty && clearKeepsSubset;
      detail = 'query="' + q + '" rowsF=' + rowsF + ' (exp ' + Math.min(10, filtered.length) + '), emptyState=' + empty + ', clearKeepsEmpty=' + clearKeepsSubset;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('j_search_flow', ok, detail);
  }

  // ===== k. no api / page errors =====
  {
    const apiErrs = cfConsoleErrors.filter(t => t.includes('[API]') || t.includes('Failed to load'));
    const otherErrs = cfConsoleErrors.filter(t => !t.includes('[API]') && !t.includes('Failed to load'));
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
  process.exit(process.exitCode || 0);
}
