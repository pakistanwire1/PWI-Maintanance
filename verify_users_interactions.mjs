import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'users.js');

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

async function rowCount(pg) { return pg.evaluate(() => document.querySelectorAll('#usersTable tbody tr').length); }

// ---- mocked API state (pin first real getUsers, then serve deterministic mutations) ----
let mockUsers = [];
let mockPinned = false;
let overrideUsers = null;
const seenActions = {};
const MOCK_DEPTS = [{ name: 'Engineering', id: 'D1' }, { name: 'Operations', id: 'D2' }, { name: 'Maintenance', id: 'D3' }];
const MOCK_SECTIONS = [{ name: 'Electrical', id: 'S1' }, { name: 'Mechanical', id: 'S2' }];

function currentUsers() { return overrideUsers ? overrideUsers : mockUsers; }
function respond(data) { return { status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data }) }; }

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
    if (url.includes('/js/pages/users.js')) {
      req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(LOCAL_JS, 'utf8') });
      return;
    }
    if (req.method() === 'POST' && url.includes('/api/exec')) {
      let d = null;
      try { d = JSON.parse(req.postData() || '{}'); } catch (e) {}
      const action = d ? d.action : null;
      if (!action) { req.continue(); return; }
      seenActions[action] = (seenActions[action] || 0) + 1;
      if (action === 'getUsers' && mockPinned) { req.respond(respond(currentUsers())); return; }
      if (action === 'searchUsers') {
        let q = '';
        try { q = JSON.parse(req.postData() || '{}').data.query || ''; } catch (e) {}
        const ql = q.toLowerCase();
        req.respond(respond(currentUsers().filter(u => { for (const k in u) { if (String(u[k]).toLowerCase().indexOf(ql) !== -1) return true; } return false; })));
        return;
      }
      if (action === 'getUserDepartments') { req.respond(respond(MOCK_DEPTS)); return; }
      if (action === 'getUserSections') { req.respond(respond(MOCK_SECTIONS)); return; }
      if (action === 'addUser') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        const nextId = 'USR' + String(1000 + mockUsers.length).padStart(4, '0');
        mockUsers.push(Object.assign({ UserID: nextId }, data, { UserID: nextId }));
        req.respond(respond(mockUsers));
        return;
      }
      if (action === 'updateUser') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        const id = data.id;
        const idx = mockUsers.findIndex(u => String(u.UserID) === String(id));
        if (idx >= 0) mockUsers[idx] = Object.assign({}, mockUsers[idx], data, { UserID: id });
        req.respond(respond(mockUsers));
        return;
      }
      if (action === 'deleteUser') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        const id = data.id;
        const idx = mockUsers.findIndex(u => String(u.UserID) === String(id));
        if (idx >= 0) mockUsers[idx] = Object.assign({}, mockUsers[idx], { Status: 'Inactive' });
        req.respond(respond(mockUsers));
        return;
      }
      if (action === 'permanentlyDeleteUser') {
        let data = {};
        try { data = JSON.parse(req.postData() || '{}').data || {}; } catch (e) {}
        mockUsers = mockUsers.filter(u => String(u.UserID) !== String(data.id));
        req.respond(respond(mockUsers));
        return;
      }
      if (action === 'resetUserPassword') { req.respond(respond(mockUsers)); return; }
      if (action === 'exportUsersToExcel') { req.respond(respond('https://mock.example/users_export.xlsx')); return; }
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
        if (action === 'getUsers' && !mockPinned) {
          const raw = await res.text().catch(() => 'null');
          const j = JSON.parse(raw);
          const arr = Array.isArray(j.data) ? j.data : (j.data && j.data.records) || [];
          if (Array.isArray(arr) && arr.length > 0) {
            mockUsers = JSON.parse(JSON.stringify(arr));
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

  await page.evaluate(() => navigateTo('users'));
  const t0 = Date.now();
  while (!mockPinned) {
    if (Date.now() - t0 > 30000) throw new Error('snapshot capture timeout; seenActions=' + JSON.stringify(seenActions));
    await sleep(300);
  }
  await page.waitForFunction(() => {
    const t = document.getElementById('usersTable');
    return !!t && t.querySelectorAll('tbody tr').length > 0;
  }, { timeout: 120000 });
  await sleep(1200);
  await installToastObserver(page);
  console.log('CF users page loaded (mocked ' + mockUsers.length + ' users)');

  const firstUser = mockUsers[0];

  // ===== a. initial state =====
  {
    const rows = await rowCount(page);
    const headers = await page.evaluate(() => document.querySelectorAll('#usersTable thead th').length);
    const btns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#usersPage .card-header button, #usersPage .card-header .btn')).map(b => (b.getAttribute('onclick') || b.textContent.trim()).slice(0, 30))
    );
    const ok = rows === mockUsers.length && headers === 10 && btns.some(x => x.includes('openAdd')) && btns.some(x => x.includes('editSelected'));
    check('a_initial_state', ok, 'rows=' + rows + ' headers=' + headers + ' toolbarBtns=' + JSON.stringify(btns));
  }

  // ===== b. add modal opens, form reset, depts/sections populated =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => User.openAdd());
      await sleep(500);
      const state = await page.evaluate(() => {
        const f = document.getElementById('userForm');
        return {
          title: document.getElementById('userFormTitle').textContent.trim(),
          visible: !!document.getElementById('userFormModal').classList.contains('show'),
          empId: document.getElementById('uEmpId').value,
          name: document.getElementById('uName').value,
          pwdRequired: document.getElementById('uPassword').required,
          deptOpts: Array.from(document.querySelectorAll('#uDept option')).map(o => o.textContent.trim()),
          secOpts: Array.from(document.querySelectorAll('#uSection option')).map(o => o.textContent.trim())
        };
      });
      const conds = {
        visible: state.visible === true,
        title: state.title === 'Add User',
        empId: state.empId === '',
        name: state.name === '',
        pwdRequired: state.pwdRequired === true,
        dept: state.deptOpts.length === 1 + MOCK_DEPTS.length,
        sec: state.secOpts.length === 1 + MOCK_SECTIONS.length
      };
      ok = conds.visible && conds.title && conds.empId && conds.name && conds.pwdRequired && conds.dept && conds.sec;
      detail = JSON.stringify({ state, conds, MOCK_DEPTS: MOCK_DEPTS.length, MOCK_SECTIONS: MOCK_SECTIONS.length });
    } catch (e) { detail = 'exception: ' + e.message; }
    check('b_add_modal_open', ok, detail);
  }

  // ===== c. add validation (required + password mismatch) =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => User.openAdd());
      await sleep(400);
      await page.evaluate(() => User.save({ preventDefault: function() {} }));
      await sleep(400);
      const t1 = await toasts(page);
      const step1 = t1.some(x => x.includes('Employee ID is required'));
      await page.evaluate(() => {
        document.getElementById('uEmpId').value = 'EMP-T';
        document.getElementById('uName').value = 'Test User';
        document.getElementById('uEmail').value = 'test@example.com';
        document.getElementById('uDept').value = 'Engineering';
        document.getElementById('uPassword').value = 'secret1';
        document.getElementById('uConfirmPassword').value = 'secret2';
      });
      await page.evaluate(() => User.save({ preventDefault: function() {} }));
      await sleep(400);
      const t2 = await toasts(page);
      const step2 = t2.some(x => x.includes('Passwords do not match'));
      ok = step1 && step2;
      detail = 'emptySubmitWarn=' + step1 + ' mismatchWarn=' + step2 + ' toasts=' + JSON.stringify(t2);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('c_add_validation', ok, detail);
  }

  // ===== d. add user success (mocked addUser) =====
  {
    let ok = false; let detail = '';
    try {
      const before = mockUsers.length;
      await page.evaluate(() => {
        document.getElementById('uEmpId').value = 'EMP-NEW';
        document.getElementById('uName').value = 'New Person';
        document.getElementById('uEmail').value = 'new@example.com';
        document.getElementById('uDept').value = 'Engineering';
        document.getElementById('uSection').value = 'Electrical';
        document.getElementById('uDesignation').value = 'Tester';
        document.getElementById('uRole').value = 'Technician';
        document.getElementById('uPassword').value = 'secret1';
        document.getElementById('uConfirmPassword').value = 'secret1';
      });
      await page.evaluate(() => User.save({ preventDefault: function() {} }));
      await sleep(1200);
      const t = await toasts(page);
      const rows = await rowCount(page);
      const modalGone = await page.evaluate(() => !document.getElementById('userFormModal').classList.contains('show'));
      ok = (seenActions['addUser'] || 0) >= 1 && t.some(x => x.includes('User added successfully')) && rows === before + 1 && modalGone;
      detail = 'addUserCalls=' + (seenActions['addUser'] || 0) + ' rows=' + rows + ' (exp ' + (before + 1) + ') toast=' + JSON.stringify(t) + ' modalClosed=' + modalGone;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('d_add_user_success', ok, detail);
  }

  // ===== e. edit populates form from selected user =====
  {
    let ok = false; let detail = '';
    try {
      const target = mockUsers.find(u => u.UserID === firstUser.UserID) || mockUsers[0];
      await page.evaluate((id) => User.openEdit(id), target.UserID);
      await sleep(600);
      const state = await page.evaluate(() => ({
        title: document.getElementById('userFormTitle').textContent.trim(),
        empId: document.getElementById('uEmpId').value,
        name: document.getElementById('uName').value,
        email: document.getElementById('uEmail').value,
        dept: document.getElementById('uDept').value,
        role: document.getElementById('uRole').value,
        pwdRequired: document.getElementById('uPassword').required,
        editId: document.getElementById('editUserId').value
      }));
      ok = state.title.indexOf('Edit User -') === 0 && state.empId === (target.EmployeeID || '') &&
           state.name === (target.Name || '') && state.editId === target.UserID && state.pwdRequired === false;
      detail = 'target=' + target.UserID + ' state=' + JSON.stringify(state);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('e_edit_populate', ok, detail);
  }

  // ===== f. permission toggles: IsAdmin checks all boxes =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate(() => User.openAdd());
      await sleep(400);
      const nBefore = await page.evaluate(() => document.querySelectorAll('#userForm input[type=checkbox]:checked').length);
      await page.evaluate(() => { const el = document.getElementById('uIsAdmin'); el.checked = true; User.onAdminCheckChange(); });
      const allChecked = await page.evaluate(() => {
        const boxes = document.querySelectorAll('#userForm input[type=checkbox]');
        return Array.from(boxes).every(b => b.checked);
      });
      ok = nBefore === 0 && allChecked;
      detail = 'before=' + nBefore + ' afterAllChecked=' + allChecked;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('f_permission_toggle', ok, detail);
  }

  // ===== g. reset password modal + validation + mocked confirm =====
  {
    let ok = false; let detail = '';
    try {
      await page.evaluate((id) => User.openResetPassword(id), firstUser.UserID);
      await sleep(500);
      const initState = await page.evaluate(() => ({
        visible: document.getElementById('passwordResetModal').classList.contains('show'),
        userId: document.getElementById('resetPwUserId').value,
        force: document.getElementById('resetForceChange').checked
      }));
      await page.evaluate(() => User.generateTempPassword());
      const gen = await page.evaluate(() => document.getElementById('resetTempPassword').value);
      const shortWarn = await (async () => {
        await page.evaluate(() => {
          document.getElementById('resetTempPassword').value = 'abc';
          User.confirmResetPassword();
        });
        await sleep(300);
        const t = await toasts(page);
        return t.some(x => x.includes('Password must be at least 6 characters'));
      })();
      const resetCallsBefore = seenActions['resetUserPassword'] || 0;
      await page.evaluate(() => {
        document.getElementById('resetTempPassword').value = 'TempPass123';
        User.confirmResetPassword();
      });
      await sleep(400);
      await page.evaluate(() => {
        const yesBtn = document.querySelector('#confirmModal .btn-danger');
        if (yesBtn) yesBtn.click();
      });
      await sleep(1000);
      const t = await toasts(page);
      const resetCallsAfter = seenActions['resetUserPassword'] || 0;
      ok = initState.visible && initState.userId === firstUser.UserID && initState.force === true &&
           gen.length === 10 && shortWarn && resetCallsAfter === resetCallsBefore + 1 &&
           t.some(x => x.includes('Password reset successfully'));
      detail = 'init=' + JSON.stringify(initState) + ' genLen=' + gen.length + ' shortWarn=' + shortWarn +
               ' resetCalls=' + resetCallsBefore + '->' + resetCallsAfter + ' toasts=' + JSON.stringify(t);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('g_reset_password', ok, detail);
  }

  // ===== h. delete flow (mocked deleteUser) =====
  {
    let ok = false; let detail = '';
    try {
      const target = mockUsers.find(u => u.UserID !== firstUser.UserID) || mockUsers[0];
      const callsBefore = seenActions['deleteUser'] || 0;
      await page.evaluate((id) => User.confirmDelete(id), target.UserID);
      await sleep(500);
      const dialogShown = await page.evaluate(() => {
        const ov = document.getElementById('deleteConfirmOverlay');
        return !!ov && ov.style.display !== 'none' && ov.classList.contains('show');
      });
      if (dialogShown) {
        await page.evaluate(() => { const b = document.getElementById('usrmgmtConfirmDeleteBtn'); if (b) b.click(); });
        await sleep(1200);
      }
      const t = await toasts(page);
      const callsAfter = seenActions['deleteUser'] || 0;
      ok = dialogShown && callsAfter === callsBefore + 1 && t.some(x => x.includes('User deactivated successfully'));
      detail = 'dialog=' + dialogShown + ' deleteCalls=' + callsBefore + '->' + callsAfter + ' toasts=' + JSON.stringify(t);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('h_delete_flow', ok, detail);
  }

  // ===== i. own-account delete guard =====
  {
    let ok = false; let detail = '';
    try {
      const sessionEmail = await page.evaluate(() => (JSON.parse(localStorage.getItem('cmms_user') || '{}').email) || '');
      let target = mockUsers.find(u => u.Email && u.Email === sessionEmail);
      if (!target) {
        target = mockUsers[0];
        await page.evaluate((email) => {
          const u = JSON.parse(localStorage.getItem('cmms_user') || '{}');
          u.email = email;
          localStorage.setItem('cmms_user', JSON.stringify(u));
        }, target.Email);
      }
      const before = (seenActions['deleteUser'] || 0);
      await page.evaluate((id) => User.confirmDelete(id), target.UserID);
      await sleep(500);
      const t = await toasts(page);
      const dialogShown = await page.evaluate(() => {
        const ov = document.getElementById('deleteConfirmOverlay');
        return !!ov && ov.style.display !== 'none';
      });
      const after = (seenActions['deleteUser'] || 0);
      ok = t.some(x => x.includes('You cannot delete your own account')) && !dialogShown && after === before;
      detail = 'target=' + target.UserID + ' sessionEmail=' + sessionEmail + ' toast=' + JSON.stringify(t) + ' dialogShown=' + dialogShown;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('i_own_account_guard', ok, detail);
  }

  // ===== j. last-active-admin delete guard =====
  {
    let ok = false; let detail = '';
    try {
      const realUsers = mockUsers;
      const single = Object.assign({}, realUsers[0], {
        UserID: 'USR-LAST', Role: 'Administrator', IsAdmin: 'TRUE', Status: 'Active',
        Name: 'Only Admin', Email: 'onlyadmin@example.com'
      });
      overrideUsers = [single, Object.assign({}, realUsers[1], { UserID: 'USR-OTHER', Role: 'Viewer', Status: 'Active', IsAdmin: 'FALSE', Email: 'viewer@example.com' })];
      await page.evaluate(() => User.refreshTable());
      await sleep(1200);
      const before = (seenActions['deleteUser'] || 0);
      await page.evaluate(() => User.confirmDelete('USR-LAST'));
      await sleep(500);
      const t = await toasts(page);
      const dialogShown = await page.evaluate(() => {
        const ov = document.getElementById('deleteConfirmOverlay');
        return !!ov && ov.style.display !== 'none';
      });
      const after = (seenActions['deleteUser'] || 0);
      ok = t.some(x => x.includes('Cannot delete the last active Administrator account')) && !dialogShown && after === before;
      detail = 'toast=' + JSON.stringify(t) + ' dialogShown=' + dialogShown;
      overrideUsers = null;
      await page.evaluate(() => User.refreshTable());
      await sleep(1200);
    } catch (e) { detail = 'exception: ' + e.message; }
    check('j_last_admin_guard', ok, detail);
  }

  // ===== k. view user modal =====
  {
    let ok = false; let detail = '';
    try {
      const target = mockUsers.find(u => u.UserID === firstUser.UserID) || mockUsers[0];
      await page.evaluate((id) => User.viewUser(id), target.UserID);
      await sleep(500);
      const state = await page.evaluate(() => ({
        visible: document.getElementById('viewUserModal').classList.contains('show'),
        content: (document.getElementById('viewUserContent') || {}).textContent || ''
      }));
      ok = state.visible && state.content.indexOf(target.Name || '') !== -1;
      detail = 'visible=' + state.visible + ' contentLen=' + state.content.length + ' nameFound=' + state.content.indexOf(target.Name || '') !== -1;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('k_view_user', ok, detail);
  }

  // ===== l. no api / page errors =====
  {
    const apiErrs = cfConsoleErrors.filter(t => t.includes('[API]') || t.includes('Failed to load'));
    const otherErrs = cfConsoleErrors.filter(t => !t.includes('[API]') && !t.includes('Failed to load'));
    check('l_no_api_errors', apiErrs.length === 0, 'api console errors: ' + (apiErrs.length ? JSON.stringify(apiErrs) : '(none)'));
    check('m_no_page_errors', cfPageErrors.length === 0 && otherErrs.length === 0,
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
