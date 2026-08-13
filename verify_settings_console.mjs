import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'cloudflare');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8813;
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};

const depts = [
  { ID: 'D1', Name: 'Facility Maintenance', Status: 'Active' },
  { ID: 'D2', Name: 'Spoke Production', Status: 'Active' }
];
const settings = [
  { Setting: 'areas', Value: 'Production,Quality,Stores' },
  { Setting: 'lines', Value: 'Line 1,Line 2' },
  { Setting: 'jobTypes', Value: 'Breakdown,PM,Preventive' },
  { Setting: 'priorities', Value: 'High,Medium,Low' },
  { Setting: 'machineTypes', Value: 'CNC,Lathe' }
];
const users = [
  { UserID: 'U1', EmployeeID: 'EMP-001', Name: 'Alice Admin', Email: 'admin@cmms.com', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Manager', Role: 'Administrator', Status: 'Active', CanManageUsers: 'TRUE', CanManageInventory: 'TRUE', IsAdmin: 'TRUE' },
  { UserID: 'U2', EmployeeID: 'EMP-002', Name: 'Bob Tech', Email: 'tech@cmms.com', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Technician', Role: 'Technician', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', IsAdmin: 'FALSE' }
];

function txn(i) {
  const base = new Date(Date.UTC(2026, 0, i, 10, 30, 0));
  return {
    TransactionID: 'TXN-' + i, CreatedAt: base.toISOString(),
    TransactionType: ['Goods Receipt', 'Issue', 'Return', 'Transfer', 'Adjustment'][(i - 1) % 5],
    PartCode: 'PC-' + i, PartName: 'Part ' + i, Quantity: i, UnitCost: 10 + i,
    TotalCost: (10 + i) * i, ReferenceNo: 'REF-' + i, ReferenceType: 'PO',
    FromLocation: 'Store A', ToLocation: 'Store B', Remarks: 'Remark ' + i,
    ProcessedBy: 'User', ProcessedAt: base.toISOString()
  };
}

function mockResponse(action, body) {
  const t = (i) => txn(i);
  switch (action) {
    case 'getSettingsData':
      return { departments: depts, settings: settings };
    case 'getUsers':
      return users;
    case 'getSectionList':
      return [{ Section: 'Maintenance' }, { Section: 'Quality' }];
    case 'getDepartmentList':
      return depts.map(function(d) { return { Department: d.Name, DepartmentID: d.ID }; });
    case 'addDepartment':
      depts.push({ ID: 'D' + (depts.length + 1), Name: (body.data && body.data.name) || 'Dept', Status: 'Active' });
      return { departments: depts };
    case 'saveSettingValue':
      {
        const key = body.data && body.data.key;
        const value = body.data && body.data.value;
        if (key) {
          const found = settings.find((s) => s.Setting === key);
          if (found) found.Value = value || '';
          else settings.push({ Setting: key, Value: value || '' });
        }
        return { settings: settings };
      }
    case 'updateUser':
      return { success: true };
    case 'getNotifications':
      return [1, 2, 3].map(function(i) {
        return { NotificationID: 'N' + i, Title: 'Notif ' + i, Message: 'Message ' + i, Module: 'Module ' + i, ReadStatus: 'Unread', NotificationType: 'Alert', Priority: 'High', CreatedAt: new Date().toISOString() };
      });
    case 'emailGetSettings':
      return { enabled: true, fromAddress: 'cmms@example.com', smtpHost: 'smtp.example.com', smtpPort: 587, fromName: 'CMMS' };
    case 'emailGetPanelData':
      return { total: 3, sent: 2, failed: 1, pending: 0 };
    case 'emailGetLogs':
      return [1, 2, 3].map(function(i) {
        return { LogID: 'EL' + i, Recipient: 'a@b.c', Subject: 'Sub ' + i, Status: 'Sent', Module: 'Job Card', Error: '', Timestamp: new Date().toISOString() };
      });
    case 'whatsappGetSettings':
      return { enabled: true, accountSid: 'ACxxxx', authToken: '', defaultNumber: '+923000000000' };
    case 'whatsappGetLogs':
      return [1, 2].map(function(i) {
        return { LogID: 'WL' + i, Recipient: '+92300000000' + i, Message: 'Hi ' + i, Status: 'Sent', Timestamp: new Date().toISOString() };
      });
    case 'getAuditLogs':
      return [1, 2, 3].map(function(i) {
        return { LogID: 'A' + i, Action: 'Login', PerformedBy: 'admin@cmms.com', Module: 'Auth', Timestamp: new Date().toISOString(), Details: 'User logged in' };
      });
    case 'getBackupHistory':
      return [1, 2].map(function(i) {
        return { BackupID: 'B' + i, Label: 'Backup ' + i, CreatedAt: new Date().toISOString(), CreatedBy: 'admin@cmms.com', Size: '1.2 MB', Status: 'Completed' };
      });
    case 'getBackupStatus':
      return { lastBackup: new Date().toISOString(), totalBackups: 2, healthy: true };
    case 'getInventoryDashboardData':
      return { recentTransactions: [t(1), t(2), t(3)], totalStockValue: 123456, lowStockCount: 2, outOfStockCount: 1 };
    case 'getSpareParts':
      return [1, 2, 3].map(function(i) { return { PartCode: 'PC-' + i, PartName: 'Part ' + i }; });
    case 'getAllTransactions':
      return [t(1), t(2)];
    case 'getQRStatistics':
      return { generated: 3, pending: 2, scanned: 1 };
    case 'getQRModuleRecords':
      return [1, 2].map(function(i) {
        return { id: String(i), code: 'MC-' + i, name: 'Record ' + i, qrCode: i === 1 ? 'QR-' + i : '', barcode: i === 1 ? 'BC-' + i : '', status: 'Active' };
      });
    case 'getJobCards':
      return [1, 2].map(function(i) {
        return { JobCardNo: 'JC' + i, Date: new Date().toISOString(), Complaint: 'Issue ' + i, Priority: 'High', Status: 'Open', Machine: 'M' + i };
      });
    case 'getPMRecords':
      return [1, 2].map(function(i) { return { PMNumber: 'PM' + i, Frequency: 'Monthly', NextDueDate: new Date().toISOString(), Machine: 'M' + i }; });
    case 'getPMHistory':
      return [1, 2].map(function(i) { return { PMNumber: 'PM' + i, LastDone: new Date().toISOString(), Status: 'Completed' }; });
    case 'getBreakdownHistory':
      return [1, 2].map(function(i) { return { BreakdownID: 'BD' + i, Machine: 'M' + i, Date: new Date().toISOString(), RootCause: 'Cause ' + i }; });
    case 'getChecklistTemplates':
      return [1, 2].map(function(i) { return { TemplateID: 'CT' + i, Name: 'Template ' + i, Status: 'Active' }; });
    case 'getChecklists':
      return [1, 2].map(function(i) { return { ChecklistID: 'C' + i, Name: 'Checklist ' + i, Status: 'Active' }; });
    case 'getMachines':
      return [1, 2].map(function(i) { return { MachineID: 'M' + i, MachineName: 'Machine ' + i, MachineCode: 'MC' + i, Status: 'Active' }; });
    case 'getTechnicians':
      return [1, 2].map(function(i) { return { EmployeeID: 'T' + i, TechnicianName: 'Tech ' + i, Status: 'Active' }; });
    case 'getAssets':
      return [1, 2].map(function(i) { return { AssetID: 'A' + i, AssetName: 'Asset ' + i, AssetCode: 'AC' + i, Status: 'Active' }; });
    case 'getBreakdownTypes':
      return [1, 2].map(function(i) { return { BreakdownType: 'Type ' + i }; });
    case 'getMachineCascade':
      return { divisions: [], sections: [], departments: [] };
    case 'getReportFilterOptions':
      return {};
    case 'getReportData':
      return [];
    case 'getReportDashboardData':
      return {};
    case 'getGoodsReceipt':
      return [];
    case 'getInventoryTransactions':
      return [];
    case 'getStockHistory':
      return [];
    case 'getLowStockParts':
      return [];
    case 'getDashboardData':
      return { departments: [], month: [], status: [], totalJobs: 0, openJobs: 0, closedJobs: 0 };
    case 'getDashboardNotifications':
      return [];
    default:
      return Array.isArray(body) ? [] : {};
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.indexOf('/api/exec') >= 0) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let action = '';
      let parsed = {};
      try { parsed = JSON.parse(body || '{}'); action = parsed.action || ''; } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponse(action, parsed)));
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log((pass ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
}

async function run() {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(function() {
    document.addEventListener('DOMContentLoaded', function() {
      var style = document.createElement('style');
      style.textContent = '#welcomePage .ws-slide{animation-duration:0.01s !important;animation-iteration-count:1 !important}';
      document.head.appendChild(style);
    });
  });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('pageerror: ' + (err && err.message)));

  await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.indexOf('fonts.googleapis.com') >= 0 || url.indexOf('fonts.gstatic.com') >= 0) { req.abort(); return; }
    req.continue();
  });
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'load', timeout: 30000 });

  async function setUser(userObj) {
    await page.evaluate(function(u) {
      localStorage.setItem('cmms_welcomed', 'true');
      localStorage.setItem('cmms_token', 'test_token_12345');
      localStorage.setItem('cmms_user', JSON.stringify(u));
    }, userObj);
  }

  async function goto(el, s) { await page.evaluate(function(id) { Router.navigate(id); }, el); await sleep(s || 900); }
  async function inPage(fn, arg) { return page.evaluate(fn, arg); }

  const ADMIN = { name: 'Alice Admin', email: 'admin@cmms.com', role: 'Administrator', isSystemAdmin: true };

  // ---------- Admin: full console ----------
  await setUser(ADMIN);
  await inPage(function() { window.startApp(); });
  await sleep(2500);
  await goto('settings', 1200);

  let res = await inPage(function() {
    return {
      console: !!document.querySelector('.settings-console'),
      navCount: document.querySelectorAll('.settings-nav-item').length,
      title: (document.getElementById('settingsSectionTitle') || {}).textContent
    };
  });
  check('1a. Settings console renders', res.console, '');
  check('1b. All 11 nav sections visible for admin', res.navCount === 11, 'count=' + res.navCount);
  check('1c. Default section is General', res.title === 'General', 'title=' + res.title);

  // ---------- General CRUD ----------
  await inPage(function() { Settings.gotoSection('general'); });
  await sleep(400);
  res = await inPage(function() {
    return {
      deptItems: document.querySelectorAll('#deptList .list-item').length,
      areaItems: document.querySelectorAll('#areasList .list-item').length,
      areasHtml: document.getElementById('areasList').innerHTML
    };
  });
  check('2a. Departments list renders', res.deptItems >= 1, 'items=' + res.deptItems);
  check('2b. Simple lists render (areas)', res.areaItems >= 1, 'items=' + res.areaItems);

  await inPage(function() {
    var inp = document.getElementById('newDept');
    inp.value = 'Test Dept Alpha';
    Settings.addDept();
  });
  await sleep(600);
  res = await inPage(function() {
    return { html: document.getElementById('deptList').innerHTML, count: document.querySelectorAll('#deptList .list-item').length };
  });
  check('2c. addDept adds row', res.count === 3 && res.html.indexOf('Test Dept Alpha') >= 0, 'count=' + res.count);

  await inPage(function() { Settings.removeSimpleValue('areas', 'Stores'); });
  await sleep(600);
  res = await inPage(function() { return document.getElementById('areasList').innerHTML; });
  check('2d. removeSimpleValue removes row', res.indexOf('Stores') < 0 && res.indexOf('Production') >= 0, '');

  // ---------- Appearance / theme ----------
  await inPage(function() { Settings.gotoSection('appearance'); });
  await sleep(400);
  res = await inPage(function() { return { palettes: document.querySelectorAll('#paletteOptions .palette-card').length, swatches: document.querySelectorAll('#accentColorOptions .color-swatch').length }; });
  check('3a. Appearance renders palettes + swatches', res.palettes === 8 && res.swatches === 8, 'palettes=' + res.palettes + ', swatches=' + res.swatches);

  await inPage(function() { Settings.themeSetMode('mode', 'light'); Settings.themeApply(); });
  await sleep(300);
  res = await inPage(function() { return { mode: Theme.getPrefs().mode, stored: localStorage.getItem('cmms_theme_settings') }; });
  check('3b. themeSetMode + themeApply persists', res.mode === 'light' && res.stored.indexOf('"mode":"light"') >= 0, 'mode=' + res.mode);

  await inPage(function() { Settings.themeReset(); });
  await sleep(300);
  await inPage(function() {
    var btn = document.querySelector('#confirmModal .btn-danger');
    if (btn) btn.click();
  });
  await sleep(400);
  res = await inPage(function() { return Theme.getPrefs().mode; });
  check('3c. themeReset restores defaults', res === 'dark', 'mode=' + res);

  // ---------- Permissions ----------
  await inPage(function() { Settings.gotoSection('permissions'); });
  await sleep(500);
  res = await inPage(function() {
    return {
      rows: document.querySelectorAll('#usersTableContainer tbody tr').length,
      groups: document.querySelectorAll('#settingsSectionContent .perm-group').length
    };
  });
  check('4a. Users table renders', res.rows >= 2, 'rows=' + res.rows);
  check('4b. Role summary groups render', res.groups === 3, 'groups=' + res.groups);

  await inPage(function() { Settings.openAddUser(); });
  await sleep(300);
  res = await inPage(function() {
    var ov = document.getElementById('settingsUserFormModal');
    return {
      modalVisible: !!ov && ov.classList.contains('show') && getComputedStyle(ov).display !== 'none',
      permCheckboxes: document.querySelectorAll('#settingsUserFormModal input[type="checkbox"]').length,
      roles: document.querySelectorAll('#settingsUserFormModal select[name="Role"] option').length
    };
  });
  check('4c. Add User modal opens', res.modalVisible, '');
  check('4d. Modal shows all 28 permission checkboxes', res.permCheckboxes === 28, 'checkboxes=' + res.permCheckboxes);
  check('4e. Role dropdown has 7 roles', res.roles === 7, 'roles=' + res.roles);
  await inPage(function() { Settings.closeUserModal(); });

  // ---------- Embedded modules ----------
  await inPage(function() { Settings.gotoSection('notifications'); });
  await sleep(1000);
  res = await inPage(function() {
    return {
      consoleStill: !!document.querySelector('#pageContent .settings-console'),
      contentLen: document.getElementById('settingsSectionContent').innerHTML.length
    };
  });
  check('5. Notifications embed renders in-section', res.consoleStill && res.contentLen > 100, '');

  await inPage(function() { Settings.gotoSection('inventory'); });
  await sleep(1500);
  res = await inPage(function() {
    var el = document.getElementById('settingsSectionContent');
    return {
      consoleStill: !!document.querySelector('#pageContent .settings-console'),
      hasInv: !!document.querySelector('#settingsSectionContent #inventoryPage'),
      rows: document.querySelectorAll('#invTableContainer tbody tr').length,
      stockVal: (document.getElementById('invTotalStockValue') || {}).textContent
    };
  });
  check('6a. Inventory embeds into section (no page wipe)', res.consoleStill && res.hasInv, '');
  check('6b. Inventory table + dashboard populate', res.rows >= 1 && res.stockVal !== 'Rs. 0', 'rows=' + res.rows + ', value=' + res.stockVal);

  await inPage(function() { Settings.gotoSection('qr'); });
  await sleep(1500);
  res = await inPage(function() {
    return {
      consoleStill: !!document.querySelector('#pageContent .settings-console'),
      hasQR: !!document.querySelector('#settingsSectionContent #qrOvBody')
    };
  });
  check('7a. QR module embeds into section', res.consoleStill && res.hasQR, '');
  await inPage(function() { QRCodes._refresh(); });
  await sleep(400);
  res = await inPage(function() {
    return {
      consoleStill: !!document.querySelector('#pageContent .settings-console'),
      hasQR: !!document.querySelector('#settingsSectionContent #qrOvBody')
    };
  });
  check('7b. QR _refresh stays in-section (no page wipe)', res.consoleStill && res.hasQR, '');

  await inPage(function() { Settings.gotoSection('emailwhatsapp'); });
  await sleep(1000);
  res = await inPage(function() {
    return { ewLen: document.getElementById('ewContent').innerHTML.length, emailActive: document.getElementById('tab-email').classList.contains('active') };
  });
  check('8a. Email tab renders', res.ewLen > 100 && res.emailActive, '');
  await inPage(function() { Settings.showEWTab('whatsapp'); });
  await sleep(1000);
  res = await inPage(function() {
    return { ewLen: document.getElementById('ewContent').innerHTML.length, waActive: document.getElementById('tab-whatsapp').classList.contains('active') };
  });
  check('8b. WhatsApp tab renders', res.ewLen > 100 && res.waActive, '');

  await inPage(function() { Settings.gotoSection('backup'); });
  await sleep(1000);
  res = await inPage(function() { return document.getElementById('settingsSectionContent').innerHTML.length; });
  check('9. Backup & Restore embed renders', res > 100, 'len=' + res);

  await inPage(function() { Settings.gotoSection('audit'); });
  await sleep(1000);
  res = await inPage(function() { return document.getElementById('settingsSectionContent').innerHTML.length; });
  check('10. Audit/Logs embed renders', res > 100, 'len=' + res);

  // ---------- System config data safety ----------
  await inPage(function() { Settings.gotoSection('system'); });
  await sleep(300);
  res = await inPage(function() {
    return {
      rows: document.querySelectorAll('#settingsSectionContent .settings-info-row').length,
      html: document.getElementById('settingsSectionContent').innerHTML.toLowerCase()
    };
  });
  check('11a. System section renders info rows', res.rows >= 3, 'rows=' + res.rows);
  check('11b. No sensitive data leaked', res.html.indexOf('token') < 0 && res.html.indexOf('password') < 0 && res.html.indexOf('secret') < 0, '');

  // ---------- Quicklinks (Job Cards / Maintenance) ----------
  const quicklinks = [
    { label: 'Open', expected: 'openjobcard' },
    { label: 'Started', expected: 'startjobcard' },
    { label: 'Pending', expected: 'pendingjobcard' },
    { label: 'Approval', expected: 'approvejobcard' },
    { label: 'Closed', expected: 'closejobcard' },
    { label: 'All', expected: 'jobcards' },
    { label: 'PM Schedule', expected: 'pm' },
    { label: 'PM History', expected: 'pmhistory' },
    { label: 'Breakdown History', expected: 'breakdown' },
    { label: 'Checklists', expected: 'checklists' }
  ];
  await inPage(function() { Settings.gotoSection('jobcards'); });
  await sleep(300);
  for (const ql of quicklinks) {
    await inPage(function(btnText) {
      var btns = document.querySelectorAll('.settings-quicklink');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.trim() === btnText) { btns[i].click(); break; }
      }
    }, ql.label);
    await sleep(1200);
    const current = await inPage(function() { return Router.current; });
    check('12. Quicklink [' + ql.label + '] -> ' + ql.expected, current === ql.expected, 'current=' + current);
    await inPage(function() { Router.navigate('settings'); });
    await sleep(900);
    await inPage(function() { Settings.gotoSection('jobcards'); });
    await sleep(250);
  }

  // ---------- Exported handlers sanity ----------
  res = await inPage(function() {
    var names = ['gotoSection', 'showEWTab', 'themeSetMode', 'themeSetStyle', 'themeSelectPalette', 'themeSetAccent',
      'themeSetColor', 'themeSetColorHex', 'themeResetColor', 'themeApply', 'themeSave', 'themeReset',
      'addDept', 'deleteDept', 'addSimpleValue', 'removeSimpleValue', 'openAddUser', 'openEditUser',
      'closeUserModal', 'saveUser', 'toggleStatus', 'deleteUser', 'usersPrevPage', 'usersNextPage', 'onDeptChange'];
    var missing = names.filter(function(n) { return typeof Settings[n] !== 'function'; });
    return missing;
  });
  check('13. All 25 Settings.* handlers exported', Array.isArray(res) && res.length === 0, 'missing=' + JSON.stringify(res));

  // ---------- Restricted (non-admin) access ----------
  const RESTRICTED = { name: 'Bob Tech', email: 'tech@cmms.com', role: 'Technician', canManageUsers: true };
  await setUser(RESTRICTED);
  await inPage(function() { Router.navigate('settings'); });
  await sleep(1200);
  res = await inPage(function() {
    return {
      navCount: document.querySelectorAll('.settings-nav-item').length,
      labels: Array.prototype.map.call(document.querySelectorAll('.settings-nav-item .settings-nav-label'), function(e) { return e.textContent; })
    };
  });
  check('14a. Restricted user sees only permitted sections', res.navCount === 6, 'count=' + res.navCount + ' labels=' + JSON.stringify(res.labels));
  await inPage(function() { Settings.gotoSection('inventory'); });
  await sleep(300);
  res = await inPage(function() { return (document.getElementById('settingsSectionTitle') || {}).textContent; });
  check('14b. Restricted user section fallback to General', res === 'General', 'title=' + res);

  // ---------- Mobile layout ----------
  await setUser(ADMIN);
  await page.setViewport({ width: 390, height: 844 });
  await inPage(function() { Router.navigate('settings'); });
  await sleep(1200);
  res = await inPage(function() {
    var consoleEl = document.querySelector('.settings-console');
    var navEl = document.querySelector('.settings-console-nav');
    return {
      gridCols: getComputedStyle(consoleEl).gridTemplateColumns,
      navDir: getComputedStyle(navEl).flexDirection,
      bodyOverflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  check('15a. Mobile: console becomes single column', (res.gridCols || '').split(' ').length === 1, 'cols=' + res.gridCols);
  check('15b. Mobile: nav is horizontal', res.navDir === 'row', 'dir=' + res.navDir);
  check('15c. Mobile: no horizontal overflow', res.bodyOverflow <= 2, 'overflow=' + res.bodyOverflow);

  await sleep(500);
  const realErrors = errors.filter(function(e) {
    return e.indexOf('favicon') < 0 && e.indexOf('Failed to load resource') < 0;
  });
  check('16. No console/page errors during run', realErrors.length === 0, 'errors=' + JSON.stringify(realErrors.slice(0, 8)));

  await browser.close();
  server.close();

  const failed = results.filter(function(r) { return !r.pass; });
  console.log('\n===== SETTINGS CONSOLE VERIFICATION SUMMARY =====');
  console.log('Total checks: ' + results.length + ' | PASS: ' + (results.length - failed.length) + ' | FAIL: ' + failed.length);
  if (failed.length === 0) {
    console.log('RESULT: PASS');
  } else {
    console.log('RESULT: FAIL');
    failed.forEach(function(f) { console.log('  FAILED: ' + f.name + ' | ' + (f.detail || '')); });
  }
  process.exit(failed.length === 0 ? 0 : 1);
}

run().catch(function(err) {
  console.error('HARNESS ERROR: ' + (err && err.stack || err));
  process.exit(2);
});
