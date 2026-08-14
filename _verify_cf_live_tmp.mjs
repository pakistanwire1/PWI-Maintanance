import puppeteer from 'puppeteer-core';

const CF = 'https://pwi-maintanance.pages.dev/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ADMIN = { email: 'pakistanwire1@gmail.com', password: 'admin123' };
const RESTRICTED = { email: 'supervisor@cmms.com', password: 'super123' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
async function waitUntil(page, fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (await page.evaluate(fn)) return true; } catch (e) {}
    await sleep(600);
  }
  check('wait_' + label, false, 'timed out waiting for ' + label);
  return false;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(String(e.message || e)));

// Fresh build probe (cachebust URL to bypass any HTTP/SW cache).
const build = await page.evaluate(async () => {
  const r = await fetch('https://pwi-maintanance.pages.dev/js/pages/settings.js?cb=' + Date.now(), { cache: 'no-store' });
  const t = await r.text();
  return { len: t.length, hasConsole: t.includes('settings-console'), hasJobCards: t.includes('renderJobCardsSection'), hasEmailFix: t.includes('EmailSettings.show') };
});
check('CF_build_fresh', build.hasConsole && build.hasJobCards && build.hasEmailFix && build.len > 60000, 'served settings.js len=' + build.len + ' newConsole=' + build.hasConsole + ' emailFix=' + build.hasEmailFix + ' jobcards=' + build.hasJobCards);

await page.evaluateOnNewDocument(() => { try { localStorage.setItem('cmms_welcomed', 'true'); } catch (e) {} });
await page.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await page.waitForSelector('#loginForm', { timeout: 60000 }).catch(() => {});
check('CF_login_form', await page.evaluate(() => !!document.getElementById('loginForm')), 'login form rendered');

async function login(u, p) {
  p = p || page;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const email = await p.$('#loginEmail');
      if (email) {
        await p.evaluate(() => { const f = document.getElementById('loginEmail'); if (f) f.value = ''; });
        await p.type('#loginEmail', u.email);
        await p.type('#loginPassword', u.password);
        await p.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      } else {
        await p.evaluate(() => { const f = document.getElementById('loginForm'); if (f) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
      }
    } catch (e) {}
    await sleep(8000);
    const ok = await p.evaluate(() => { try { return !!localStorage.getItem('cmms_token') && !!JSON.parse(localStorage.getItem('cmms_user')).email; } catch (e) { return false; } }).catch(() => false);
    if (ok) break;
  }
  await p.waitForFunction(() => { const ac = document.getElementById('appContainer'); return ac && getComputedStyle(ac).display !== 'none'; }, { timeout: 60000 }).catch(() => {});
  await sleep(2500);
}
await login(ADMIN);
check('CF_admin_login', await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('cmms_user') || '{}'); return !!localStorage.getItem('cmms_token') && !!u.email; }), 'admin session established');

await page.evaluate(() => Router.navigate('settings'));
await sleep(2000);
const consoleState = await page.evaluate(() => ({
  hasConsole: !!document.querySelector('.settings-console'),
  navCount: document.querySelectorAll('.settings-nav-item').length,
  navLabels: Array.from(document.querySelectorAll('.settings-nav-item .settings-nav-label')).map(e => e.textContent.trim()),
  title: (document.getElementById('settingsSectionTitle') || {}).textContent || ''
}));
check('CF_console_renders', consoleState.hasConsole, 'settings console rendered');
check('CF_nav_11_sections', consoleState.navCount === 11, 'admin sees ' + consoleState.navCount + ' sections: ' + JSON.stringify(consoleState.navLabels));
const EXP_NAV = ['General', 'Appearance', 'Notifications', 'Permissions & Security', 'Inventory', 'Job Cards / Maintenance', 'QR Scanner', 'Email / WhatsApp', 'Backup & Restore', 'System Configuration', 'Audit / Logs'];
check('CF_nav_labels', JSON.stringify(consoleState.navLabels) === JSON.stringify(EXP_NAV), 'section labels match expected');
check('CF_default_general', consoleState.title === 'General', 'default section = ' + consoleState.title);

async function section(id) {
  await page.evaluate(s => Settings.gotoSection(s), id);
  await sleep(1200);
  return page.evaluate(() => ({
    title: (document.getElementById('settingsSectionTitle') || {}).textContent || '',
    len: (document.getElementById('settingsSectionContent') || { innerHTML: '' }).innerHTML.length
  }));
}

let s = await section('general');
check('CF_sec_general', s.title === 'General' && s.len > 100, 'General renders (len=' + s.len + ')');
await waitUntil(page, () => document.querySelectorAll('#deptList .list-item').length >= 1, 30000, 'dept_list');
const gen = await page.evaluate(() => ({
  dept: document.querySelectorAll('#deptList .list-item').length,
  areas: document.querySelectorAll('#areasList .list-item').length,
  hasNewDept: !!document.getElementById('newDept'),
  deptNames: Array.from(document.querySelectorAll('#deptList .list-item')).map(e => e.textContent.trim()).slice(0, 6)
}));
check('CF_sec_general_lists', gen.dept >= 1 && gen.hasNewDept, 'departments=' + gen.dept + ' sample=' + JSON.stringify(gen.deptNames));

s = await section('appearance');
const appr = await page.evaluate(() => ({ palettes: document.querySelectorAll('#paletteOptions .palette-card').length, swatches: document.querySelectorAll('#accentColorOptions .color-swatch').length }));
check('CF_sec_appearance', s.title === 'Appearance' && appr.palettes === 8 && appr.swatches === 8, 'palettes=' + appr.palettes + ' swatches=' + appr.swatches);
await page.evaluate(() => { Settings.themeSetMode('mode', 'light'); Settings.themeApply(); });
await sleep(400);
const themed = await page.evaluate(() => ({ mode: Theme.getPrefs().mode, stored: localStorage.getItem('cmms_theme_settings') || '' }));
check('CF_theme_apply', themed.mode === 'light' && themed.stored.includes('"mode":"light"'), 'theme apply persists (mode=' + themed.mode + ')');
await page.evaluate(() => Settings.themeReset());
await sleep(300);
await page.evaluate(() => { const b = document.querySelector('#confirmModal .btn-danger'); if (b) b.click(); });
await sleep(500);
const resetMode = await page.evaluate(() => Theme.getPrefs().mode);
check('CF_theme_reset', resetMode === 'dark', 'theme reset restores default (mode=' + resetMode + ')');

s = await section('notifications');
check('CF_sec_notifications', s.title === 'Notifications' && s.len > 100, 'Notifications renders (len=' + s.len + ')');

s = await section('permissions');
await waitUntil(page, () => document.querySelectorAll('#usersTableContainer tbody tr').length >= 1, 30000, 'users_table');
const perms = await page.evaluate(() => ({ rows: document.querySelectorAll('#usersTableContainer tbody tr').length }));
check('CF_sec_permissions', s.title === 'Permissions & Security' && perms.rows >= 1, 'Permissions renders, users rows=' + perms.rows);
await page.evaluate(() => Settings.openAddUser());
await sleep(500);
const modal = await page.evaluate(() => {
  const ov = document.getElementById('settingsUserFormModal');
  return { visible: !!ov && ov.classList.contains('show') && getComputedStyle(ov).display !== 'none', perms: document.querySelectorAll('#settingsUserFormModal input[type="checkbox"]').length, roles: document.querySelectorAll('#settingsUserFormModal select[name="Role"] option').length };
});
check('CF_user_modal', modal.visible, 'Add User modal opens');
check('CF_user_modal_28perms', modal.perms === 28, '28 permission checkboxes (count=' + modal.perms + ')');
check('CF_user_modal_7roles', modal.roles === 7, '7 roles (count=' + modal.roles + ')');
await page.evaluate(() => Settings.closeUserModal());
await sleep(300);

s = await section('inventory');
await waitUntil(page, () => { const v = document.getElementById('invTotalStockValue'); return !!v && v.textContent.trim() !== ''; }, 30000, 'inventory_value');
const inv = await page.evaluate(() => ({ hasInv: !!document.querySelector('#settingsSectionContent #inventoryPage'), rows: document.querySelectorAll('#invTableContainer tbody tr').length, val: (document.getElementById('invTotalStockValue') || {}).textContent || '' }));
check('CF_sec_inventory', s.title === 'Inventory' && inv.hasInv && inv.val !== '', 'Inventory embeds (rows=' + inv.rows + ' stockValue=' + inv.val + ')');

s = await section('jobcards');
const ql = await page.evaluate(() => Array.from(document.querySelectorAll('.settings-quicklink')).map(b => b.textContent.trim()));
check('CF_sec_jobcards', s.title === 'Job Cards / Maintenance' && ql.length === 10, 'Job Cards section renders ' + ql.length + ' quicklinks');
const quicklinks = [
  { label: 'Open', expected: 'openjobcard' }, { label: 'Started', expected: 'startjobcard' }, { label: 'Pending', expected: 'pendingjobcard' },
  { label: 'Approval', expected: 'approvejobcard' }, { label: 'Closed', expected: 'closejobcard' }, { label: 'All', expected: 'jobcards' },
  { label: 'PM Schedule', expected: 'pm' }, { label: 'PM History', expected: 'pmhistory' },
  { label: 'Breakdown History', expected: 'breakdown' }, { label: 'Checklists', expected: 'checklists' }
];
for (const q of quicklinks) {
  await page.evaluate(btnText => {
    const btns = document.querySelectorAll('.settings-quicklink');
    for (const b of btns) if (b.textContent.trim() === btnText) { b.click(); break; }
  }, q.label);
  await sleep(1800);
  const cur = await page.evaluate(() => Router.current);
  check('CF_quicklink_' + q.label, cur === q.expected, q.label + ' -> ' + cur + ' (expect ' + q.expected + ')');
  await page.evaluate(() => Router.navigate('settings'));
  await sleep(1200);
  await page.evaluate(() => Settings.gotoSection('jobcards'));
  await sleep(400);
}

s = await section('qr');
const qr = await page.evaluate(() => ({ hasBody: !!document.querySelector('#settingsSectionContent #qrOvBody') }));
check('CF_sec_qr', s.title === 'QR Scanner' && qr.hasBody, 'QR Scanner embeds (qrOvBody=' + qr.hasBody + ')');

s = await section('emailwhatsapp');
await waitUntil(page, () => (document.getElementById('ewContent') || { innerHTML: '' }).innerHTML.length > 200, 30000, 'email_tab');
const ew = await page.evaluate(() => ({ len: (document.getElementById('ewContent') || { innerHTML: '' }).innerHTML.length, emailActive: (document.getElementById('tab-email') || {}).classList.contains('active') }));
check('CF_sec_ew_email', s.title === 'Email / WhatsApp' && ew.len > 200 && ew.emailActive, 'Email tab renders (len=' + ew.len + ')');
await page.evaluate(() => Settings.showEWTab('whatsapp'));
await sleep(1200);
const wa = await page.evaluate(() => ({ len: (document.getElementById('ewContent') || { innerHTML: '' }).innerHTML.length, waActive: (document.getElementById('tab-whatsapp') || {}).classList.contains('active') }));
check('CF_sec_ew_whatsapp', wa.len > 100 && wa.waActive, 'WhatsApp tab renders (len=' + wa.len + ')');

s = await section('backup');
check('CF_sec_backup', s.title === 'Backup & Restore' && s.len > 100, 'Backup & Restore renders (len=' + s.len + ')');

s = await section('system');
const sys = await page.evaluate(() => ({ rows: document.querySelectorAll('#settingsSectionContent .settings-info-row').length, html: document.getElementById('settingsSectionContent').innerHTML.toLowerCase() }));
check('CF_sec_system', s.title === 'System Configuration' && sys.rows >= 3, 'System renders ' + sys.rows + ' info rows');
check('CF_system_no_leak', !sys.html.includes('token') && !sys.html.includes('password') && !sys.html.includes('secret'), 'no sensitive data in System section');

s = await section('audit');
check('CF_sec_audit', s.title === 'Audit / Logs' && s.len > 100, 'Audit/Logs renders (len=' + s.len + ')');

// ---- Restricted user: router + API permission parity ----
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await page.waitForSelector('#loginForm', { timeout: 60000 }).catch(() => {});
await login(RESTRICTED);
check('CF_restricted_login', await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('cmms_user') || '{}'); return !!localStorage.getItem('cmms_token') && !!u.email; }), 'restricted session established');

const restricted = await page.evaluate(() => {
  const u = JSON.parse(localStorage.getItem('cmms_user') || '{}');
  const btn = document.getElementById('topbarSettingsBtn');
  return {
    role: u.role || u.Role,
    canSettings: Session.canAccessPage('settings'),
    hasManageSettings: Session.isAdmin() || Session.getPermission('manageSettings'),
    hasManageUsers: Session.isAdmin() || Session.getPermission('manageUsers'),
    topbarBtn: btn ? getComputedStyle(btn).display !== 'none' : false
  };
});
check('CF_restricted_perm_semantics', restricted.hasManageSettings === false && restricted.hasManageUsers === false, 'restricted lacks manageSettings+manageUsers (role=' + restricted.role + ')');
check('CF_restricted_canAccessPage', restricted.canSettings === false, 'Session.canAccessPage(settings)=false');
check('CF_restricted_topbar_hidden', restricted.topbarBtn === false, 'topbar Settings button hidden for restricted');

await page.evaluate(() => Router.navigate('settings'));
await sleep(1200);
const blocked = await page.evaluate(() => ({ route: Router.current, consoleEl: !!document.querySelector('.settings-console') }));
check('CF_restricted_router_block', blocked.route === 'dashboard' && blocked.consoleEl === false, 'navigate(settings) redirected to dashboard (route=' + blocked.route + ')');

const apiParity = await page.evaluate(async () => {
  const res = {};
  for (const action of ['getSettingsData', 'getUsers']) {
    try {
      await API.post(action, {});
      res[action] = 'ALLOWED';
    } catch (e) {
      res[action] = String(e && e.message ? e.message : e).slice(0, 60);
    }
  }
  return res;
});
check('CF_api_getSettingsData_blocked', /denied|permission|forbidden|403/i.test(apiParity.getSettingsData), 'API getSettingsData blocked for restricted: ' + apiParity.getSettingsData);
check('CF_api_getUsers_blocked', /denied|permission|forbidden|403/i.test(apiParity.getUsers), 'API getUsers blocked for restricted: ' + apiParity.getUsers);

// ---- Mobile layout (admin): fresh incognito context (clean cookies/SW/bot state) ----
const mctx = await browser.createBrowserContext();
const mpage = await mctx.newPage();
const mconsole = [];
const mpageErrors = [];
mpage.on('console', m => { if (m.type() === 'error') mconsole.push(m.text()); });
mpage.on('pageerror', e => mpageErrors.push(String(e.message || e)));
await mpage.evaluateOnNewDocument(() => { try { localStorage.setItem('cmms_welcomed', 'true'); } catch (e) {} });
await mpage.setViewport({ width: 390, height: 844 });
await mpage.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await mpage.waitForSelector('#loginForm', { timeout: 60000 }).catch(() => {});
await login(ADMIN, mpage);
await sleep(1500);
const mRelogin = await mpage.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('cmms_user')).email; } catch (e) { return false; } });
check('CF_mobile_relogin', mRelogin, 'admin login in fresh mobile context');
await mpage.evaluate(() => Router.navigate('settings'));
await waitUntil(mpage, () => !!document.querySelector('.settings-console'), 30000, 'mobile_console');
const mobile = await mpage.evaluate(() => {
  const consoleEl = document.querySelector('.settings-console');
  const navEl = document.querySelector('.settings-console-nav');
  return { route: Router.current, cols: consoleEl ? getComputedStyle(consoleEl).gridTemplateColumns : '', dir: navEl ? getComputedStyle(navEl).flexDirection : '', overflow: document.documentElement.scrollWidth - window.innerWidth };
});
check('CF_mobile_console', mobile.cols !== '', 'console rendered on mobile (route=' + mobile.route + ')');
check('CF_mobile_single_col', (mobile.cols || '').split(' ').length === 1, 'single column grid (cols=' + mobile.cols + ')');
check('CF_mobile_horiz_nav', mobile.dir === 'row', 'nav horizontal (dir=' + mobile.dir + ')');
check('CF_mobile_no_overflow', mobile.overflow <= 2, 'no horizontal overflow (overflow=' + mobile.overflow + ')');
await mctx.close();

await sleep(500);
const relConsole = consoleErrors.filter(e => !/favicon|Failed to load resource|gstatic|Forbidden|permission/i.test(e));
const relPage = pageErrors.filter(e => !/gstatic|chrome-extension/.test(e));
check('CF_zero_console_errors', relConsole.length === 0, 'console errors=' + JSON.stringify(relConsole.slice(0, 6)));
check('CF_zero_page_errors', relPage.length === 0, 'page errors=' + JSON.stringify(relPage.slice(0, 6)));

await browser.close();
let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('\n===== CLOUDFLARE LIVE VERIFICATION SUMMARY =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) console.log('FAILED: ' + failures.join(', '));
console.log('CLOUDFLARE: ' + (fail === 0 ? 'PASS' : 'FAIL'));
process.exit(fail === 0 ? 0 : 1);
