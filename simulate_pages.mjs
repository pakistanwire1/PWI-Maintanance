import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHELL = 'file:///D:/CLASP/CMMS/PWI-Maintanance/gas_shell_built.html';

const MOCK = {
  getSectionList: [{ SectionID: 'SEC-1', Section: 'Production', Description: 'Production section', sectionID: 'SEC-1', Name: 'Production' }],
  getDepartmentList: [{ DepartmentID: 'DEP-1', Department: 'Engineering', departmentID: 'DEP-1', Name: 'Engineering' }],
  getMachines: [{ MachineID: 'MC-1', Machine: 'Lathe 1', machineCode: 'MC-001', SerialNumber: 'SN-1', Section: 'Production', Department: 'Engineering', Status: 'Active' }],
  getMachineList: [{ MachineID: 'MC-1', Machine: 'Lathe 1', machineCode: 'MC-001' }],
  getMachineCascade: [{ MachineID: 'MC-1', Machine: 'Lathe 1', machineCode: 'MC-001' }],
  getTechnicians: [{ TechnicianID: 'TC-1', Technician: 'Ali', Name: 'Ali', Section: 'Production', Department: 'Engineering', Specialization: 'Mechanical' }],
  getUsers: [{ UserID: 'U-1', Name: 'Test User', Email: 't@c.com', Role: 'Admin', role: 'Admin', Status: 'Active' }],
  getUserSections: ['Production'],
  getUserDepartments: ['Engineering'],
  getJobCards: [{ JobCardID: 'JC-1', JobNumber: 'JC-2024-001', MachineID: 'MC-1', Title: 'Repair', Priority: 'High', Status: 'Open', Date: '2024-01-01' }],
  getJobCardsByStatus: [{ JobCardID: 'JC-1', JobNumber: 'JC-2024-001', Status: 'Open' }],
  getOpenJobCards: [{ JobCardID: 'JC-1', JobNumber: 'JC-2024-001', Status: 'Open' }],
  getAssets: [{ AssetID: 'A-1', Asset: 'Pump 1', assetCode: 'A-001', Status: 'Active' }],
  getActiveBreakdownTypes: ['Electrical', 'Mechanical'],
  getPMRecords: [{ PMID: 'PM-1', MachineID: 'MC-1', Title: 'Oil change', Frequency: 'Monthly', Status: 'Scheduled' }],
  getPMByDateRange: [{ PMID: 'PM-1', MachineID: 'MC-1', Title: 'Oil change' }],
  getPMCalendarData: { events: [] },
  getPMCompliance: { completed: 5, scheduled: 8, overdue: 1, compliance: 80 },
  getPMHistory: [{ PMID: 'PM-1', MachineID: 'MC-1', Title: 'Oil change', CompletionDate: '2024-01-05' }],
  getChecklists: [{ ChecklistID: 'CH-1', Title: 'Daily check', checklistID: 'CH-1', Name: 'Daily check', MachineID: 'MC-1' }],
  getChecklistTemplates: [{ ChecklistID: 'CH-1', Title: 'Daily template', checklistID: 'CH-1', Name: 'Daily template' }],
  getSpareParts: [{ PartID: 'SP-1', Part: 'Bearing', partCode: 'SP-001', Stock: 10, ReorderLevel: 5, Price: 25 }],
  getLowStockParts: [{ PartID: 'SP-1', Part: 'Bearing', Stock: 2 }],
  getStockHistory: [{ TransactionID: 'TX-1', PartID: 'SP-1', Type: 'Issue', Quantity: 3 }],
  getInventoryDashboardData: { totalParts: 10, lowStock: 2, transactions: 5, outOfStock: 1 },
  getAllTransactions: [{ TransactionID: 'TX-1', PartID: 'SP-1', Type: 'Issue', Quantity: 3, Date: '2024-01-01' }],
  getTransactionsByDateRange: [],
  getTransactionsByPart: [],
  getTransactionsByType: [],
  getUserNotifications: [{ NotificationID: 'N-1', Title: 'Notice', Message: 'Hi', IsRead: false, isRead: false, Date: '2024-01-01' }],
  getNotifications: [{ NotificationID: 'N-1', Title: 'Notice', Message: 'Hi', IsRead: false, Date: '2024-01-01' }],
  getDashboardNotifications: [],
  getUnreadCount: 0,
  getAuditLogs: [{ LogID: 'L-1', User: 't@c.com', Action: 'LOGIN', Details: 'login', Timestamp: '2024-01-01' }],
  getUserAuditLogs: [{ LogID: 'L-1', User: 't@c.com', Action: 'LOGIN' }],
  getRecentAuditLogs: [{ LogID: 'L-1', User: 't@c.com', Action: 'LOGIN' }],
  getQRStatistics: { generated: 5, pending: 3, scanned: 2, total: 10 },
  getQRModuleRecords: [{ id: '1', code: 'QR-1', name: 'Lathe', status: 'Active' }],
  getModuleRecordDetail: { id: '1', code: 'QR-1', name: 'Lathe', status: 'Active' },
  getQRDetail: { id: '1', code: 'QR-1', name: 'Lathe' },
  getQRScanHistory: [{ id: '1', code: 'QR-1', scannedAt: '2024-01-01' }],
  getPrintLabelData: { generated: 0 },
  getDashboardData: { cards: {}, charts: {}, recent: [] },
  getSettingsData: { Settings: {} },
  getEmailSettings: { settings: {} },
  emailGetSettings: { settings: {} },
  emailGetPanelData: { logs: [], stats: {} },
  emailGetDashboardStats: {},
  emailGetLogs: [],
  whatsappGetSettingsData: { settings: {} },
  getBackupStatus: { last: null, enabled: true },
  getBackupHistory: [],
  getBackupSheetsList: [],
  getReportFilterOptions: { machines: [], departments: [] },
  getReportData: { rows: [], columns: [] },
  getGoodsReceipt: [],
  getInventoryTransactions: [],
  getMachineDetails: { MachineID: 'MC-1', Machine: 'Lathe 1' },
  getMachinePassport: { MachineID: 'MC-1' },
  getTracks: [],
  validateAppSession: { valid: true, user: { Name: 'Test', name: 'Test', Email: 't@c.com', Role: 'Admin', role: 'Admin' } },
  loginUser: { success: true, user: { Name: 'Test User', name: 'Test User', Email: 't@c.com', Role: 'Admin', role: 'Admin', isSystemAdmin: true } },
  logUserLogout: { success: true },
  testPing: { ok: true },
  getDataVersion: { version: 1 },
  flushSpreadsheet: { ok: true },
  getSidebarCounts: { total: 0, open: 0, pending: 0, assets: 0, machines: 0, users: 0, notifications: 0 },
  getBreakdownHistory: [{ BreakdownID: 'B-1', MachineID: 'MC-1', Title: 'Breakdown' }],
  getUserById: {},
  searchMachines: [],
  searchTechnicians: [],
  searchUsers: [],
  searchSpareParts: [],
  searchPMRecords: [],
  searchTransactions: [],
  searchAssets: []
};

const PAGES = [
  'dashboard', 'assets', 'machines', 'technicians', 'departments', 'sections',
  'users', 'jobcards', 'openjobcard', 'startjobcard', 'pendingjobcard',
  'approvejobcard', 'closejobcard', 'pm', 'pmhistory', 'checklists',
  'spareparts', 'inventory', 'inventorytransactions', 'stockhistory',
  'goodsreceipt', 'notifications', 'breakdown', 'audit', 'qr', 'qrmachines',
  'qrassets', 'qrspareparts', 'qrjobcards', 'qrprint', 'qrhistory',
  'email', 'reports', 'machinepassport', 'backuprestore', 'settings', 'whatsapp'
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files']
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const errors = [];
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') {
    errors.push({ t: Date.now(), kind: 'console:' + m.type(), msg: m.text().slice(0, 500) });
  }
});
page.on('pageerror', e => {
  errors.push({ t: Date.now(), kind: 'pageerror', msg: (e.stack || e.message).slice(0, 800) });
});
page.on('request', r => {
  const url = r.url();
  if (url.startsWith('file://')) r.continue();
  else r.abort();
});

await page.setRequestInterception(true);

await page.evaluateOnNewDocument(() => {
  window.__gas = { handlers: {}, calls: [], missing: [] };
  const root = {};
  const run = new Proxy(root, {
    get(t, prop) {
      if (prop === 'withSuccessHandler') return function (cb) { t._s = cb; return this; };
      if (prop === 'withFailureHandler') return function (cb) { t._f = cb; return this; };
      return function (...args) {
        const name = String(prop);
        window.__gas.calls.push({ fn: name, args: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a)).slice(0, 100)) });
        const h = window.__gas.handlers[name];
        let result;
        if (h === undefined) {
          window.__gas.missing.push(name);
          result = { __gasMissing: name };
        } else if (typeof h === 'function') {
          try { result = h(...args); } catch (e) { window.__gas.missing.push(name + ' THREW: ' + e.message); if (t._f) t._f(e); t._s = null; t._f = null; return; }
        } else {
          result = h;
        }
        if (result && typeof result.then === 'function') {
          result.then(v => { if (t._s) t._s(v); t._s = null; t._f = null; }).catch(e => { if (t._f) t._f(e); t._s = null; t._f = null; });
        } else {
          if (t._s) t._s(result);
          t._s = null; t._f = null;
        }
      };
    },
    apply() { return undefined; }
  });
  Object.defineProperty(window.google = window.google || {}, 'script', { value: { run } });
});

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

try {
  await page.goto(SHELL, { waitUntil: 'load', timeout: 60000 });
} catch (e) {
  console.log('GOTO ERR:', e.message);
}

await page.evaluate(mock => {
  for (const k of Object.keys(mock)) {
    window.__gas.handlers[k] = mock[k];
  }
}, MOCK);

const boot = await page.evaluate(() => {
  return {
    hasAppContainer: !!document.getElementById('appContainer'),
    hasLogin: !!document.getElementById('loginPage'),
    pageDivs: document.querySelectorAll('.page').length,
    hasLoadSectionsData: typeof window.loadSectionsData === 'function',
    hasNavigateTo: typeof window.navigateTo === 'function',
    hasShowApp: typeof window.showApp === 'function',
    initialErrors: window.__gas.missing.slice(0, 20)
  };
});
console.log('BOOT:', JSON.stringify(boot));

await page.evaluate(() => {
  window.currentUser = { Name: 'Test', name: 'Test User', Email: 't@c.com', Role: 'Admin', role: 'Admin', isSystemAdmin: true };
  if (typeof window.showApp === 'function') window.showApp();
});

await new Promise(r => setTimeout(r, 800));

const results = [];
for (const p of PAGES) {
  const before = errors.length;
  const navErr = await page.evaluate(pg => {
    try {
      if (typeof window.navigateTo === 'function') window.navigateTo(pg);
      return null;
    } catch (e) {
      return (e.stack || e.message).slice(0, 800);
    }
  }, p).catch(e => 'EVALERR ' + e.message);
  await new Promise(r => setTimeout(r, 300));
  const st = await page.evaluate(pg => {
    const pageEl = document.getElementById(pg + 'Page');
    const fnMap = window.__loadFnMap || {};
    const fnName = fnMap[pg] || 'load' + (pg.charAt(0).toUpperCase() + pg.slice(1)) + 'Data';
    const containers = pageEl ? pageEl.querySelectorAll('.table-container, table, .empty-state, .card-body, .stat-card, .grid, [id$="Container"], [id$="Table"]') : [];
    return {
      active: pageEl ? pageEl.classList.contains('active') : false,
      hasPageDiv: !!pageEl,
      fnName,
      fnExists: typeof window[fnName] === 'function',
      bodyLen: pageEl ? pageEl.innerHTML.length : -1,
      containerCount: containers.length,
      containerSample: pageEl ? pageEl.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 120) : ''
    };
  }, p).catch(e => ({ err: 'EVALERR ' + e.message }));
  const newErrors = errors.slice(before);
  const missing = await page.evaluate(() => window.__gas.missing.slice(-10)).catch(() => []);
  results.push({ page: p, navErr, st, newErrors, missing });
}

for (const r of results) {
  const blank = r.st.hasPageDiv && r.st.active && r.st.bodyLen < 50;
  const noFn = r.st.fnExists === false;
  console.log('--- ' + r.page + ' ---');
  console.log('  active=' + r.st.active + ' hasPageDiv=' + r.st.hasPageDiv + ' fn=' + r.st.fnName + ' fnExists=' + r.st.fnExists + ' bodyLen=' + r.st.bodyLen);
  if (r.navErr) console.log('  NAVERR: ' + r.navErr);
  if (blank) console.log('  *** BLANK ***');
  if (noFn) console.log('  *** LOAD FN MISSING ***');
  if (r.newErrors.length) {
    console.log('  ERRORS(' + r.newErrors.length + '):');
    for (const e of r.newErrors) console.log('    [' + e.kind + '] ' + e.msg.slice(0, 300));
  }
  if (r.missing.length) {
    console.log('  MISSING GAS CALLS: ' + r.missing.join('; '));
  }
}

await browser.close();
console.log('\nDONE');
