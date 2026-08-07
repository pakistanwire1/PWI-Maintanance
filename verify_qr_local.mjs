import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'cloudflare');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8899;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- static file server ----------
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let p = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---------- mock API data ----------
const MOCK = {
  divisions: [
    { id: 'DV001', code: 'DIV001', name: 'Plant Division' },
    { id: 'DV002', code: 'DIV002', name: 'Utility Division' }
  ],
  machines: [
    { id: 'MC001', MachineID: 'MC001', MachineCode: 'MC-001', MachineName: 'CNC Machine 1', name: 'CNC Machine 1', code: 'MC-001', Department: 'Production', department: 'Production', Section: 'Machining', section: 'Machining', Status: 'Active', status: 'Active', Division: 'Plant Division', qrCode: 'QR-MC-001', barcode: 'BC-MC-001', qrGeneratedDate: '2026-07-01' },
    { id: 'MC002', MachineID: 'MC002', MachineCode: 'MC-002', MachineName: 'Lathe Machine 2', name: 'Lathe Machine 2', code: 'MC-002', Department: 'Production', department: 'Production', Section: 'Machining', section: 'Machining', Status: 'Under Maintenance', status: 'Under Maintenance', Division: 'Plant Division', qrCode: '', barcode: '' },
    { id: 'MC003', MachineID: 'MC003', MachineCode: 'MC-003', MachineName: 'Pump 3', name: 'Pump 3', code: 'MC-003', Department: 'Utility', department: 'Utility', Section: 'Pumping', section: 'Pumping', Status: 'Inactive', status: 'Inactive', Division: 'Utility Division', qrCode: 'QR-MC-003', barcode: 'BC-MC-003', qrGeneratedDate: '2026-07-10' }
  ],
  assets: [
    { id: 'AS001', AssetID: 'AS001', AssetCode: 'AS-001', AssetName: 'Welder', name: 'Welder', code: 'AS-001', Department: 'Production', department: 'Production', Section: 'Fabrication', section: 'Fabrication', Status: 'Active', status: 'Active', qrCode: 'QR-AS-001', barcode: 'BC-AS-001' },
    { id: 'AS002', AssetID: 'AS002', AssetCode: 'AS-002', AssetName: 'Compressor', name: 'Compressor', code: 'AS-002', Department: 'Utility', department: 'Utility', Section: 'Air', section: 'Air', Status: 'Retired', status: 'Retired', qrCode: '', barcode: '' }
  ],
  spareParts: [
    { id: 'SP001', PartID: 'SP001', PartCode: 'SP-001', PartName: 'Bearing 6205', name: 'Bearing 6205', code: 'SP-001', Category: 'Mechanical', category: 'Mechanical', Status: 'Active', status: 'Active', CurrentStock: 12, currentStock: 12, MinimumStock: 5, minimumStock: 5, Location: 'Store A', location: 'Store A', qrCode: 'QR-SP-001', barcode: 'BC-SP-001' },
    { id: 'SP002', PartID: 'SP002', PartCode: 'SP-002', PartName: 'Bolt M8', name: 'Bolt M8', code: 'SP-002', Category: 'Fasteners', category: 'Fasteners', Status: 'Inactive', status: 'Inactive', CurrentStock: 3, currentStock: 3, MinimumStock: 10, minimumStock: 10, Location: 'Store B', location: 'Store B', qrCode: '', barcode: '' }
  ],
  jobCards: [
    { id: 'JC001', JobCardID: 'JC001', JobCardNo: 'JC-001', code: 'JC-001', MachineName: 'CNC Machine 1', machineName: 'CNC Machine 1', CurrentStatus: 'Open', currentStatus: 'Open', Status: 'Open', status: 'Open', OpenDate: '2026-08-01', openDate: '2026-08-01', Priority: 'Critical', priority: 'Critical', qrCode: 'QR-JC-001', barcode: 'BC-JC-001' },
    { id: 'JC002', JobCardID: 'JC002', JobCardNo: 'JC-002', code: 'JC-002', MachineName: 'Pump 3', machineName: 'Pump 3', CurrentStatus: 'Completed', currentStatus: 'Completed', Status: 'Completed', status: 'Completed', OpenDate: '2026-07-15', openDate: '2026-07-15', Priority: 'High', priority: 'High', qrCode: '', barcode: '' },
    { id: 'JC003', JobCardID: 'JC003', JobCardNo: 'JC-003', code: 'JC-003', MachineName: 'Welder', machineName: 'Welder', CurrentStatus: 'In Progress', currentStatus: 'In Progress', Status: 'In Progress', status: 'In Progress', OpenDate: '2026-08-05', openDate: '2026-08-05', Priority: 'Medium', priority: 'Medium', qrCode: 'QR-JC-003', barcode: 'BC-JC-003' }
  ],
  history: Array.from({ length: 60 }, (_, i) => ({
    id: 'H' + (i + 1), date: '2026-08-06', time: '10:' + String(i % 60).padStart(2, '0'),
    user: 'supervisor@cmms.com', module: ['Machine', 'Asset', 'Spare Part', 'Job Card'][i % 4],
    record: 'MC-00' + (i % 3 + 1), action: 'Scan', device: 'Mobile', timestamp: '2026-08-06T10:' + String(i % 60).padStart(2, '0') + ':00'
  }))
};

const stats = { totalScans: 60, todayScans: 12, uniqueUsers: 3, generated: 4, pending: 4, timesScanned: 60 };
const ovStats = { generated: 4, pending: 4, timesScanned: 60, scannedToday: 12 };

function buildPassportMock(machineId) {
  const m = MOCK.machines.find(x => x.MachineID === machineId || x.id === machineId) || MOCK.machines[0];
  const jc = (no, open, close, complaint, cat, type, pri, tech, wait, work, down, root, action, appr, status) => ({
    JobCardNo: no, OpenDate: open, CloseDate: close, Complaint: complaint, ComplaintCategory: cat,
    BreakdownType: type, Priority: pri, Technician: tech, WaitingTime: wait, WorkingTime: work,
    Downtime: down, RootCause: root, CorrectiveAction: action, ApprovalStatus: appr, CurrentStatus: status
  });
  const jobCards = [
    jc('JC-MC-101', '2026-01-05', '2026-01-06', 'Motor overheating', 'Motor', 'Breakdown', 'Critical', 'Ali Raza', 30, 240, 270, 'Winding short circuit', 'Rewound motor', 'Approved', 'Closed'),
    jc('JC-MC-102', '2026-02-10', '2026-02-10', 'Gearbox noise', 'Mechanical', 'Mechanical', 'High', 'Bilal Khan', 15, 120, 135, 'Worn bearing', 'Replaced bearing', 'Approved', 'Closed'),
    jc('JC-MC-103', '2026-03-02', null, 'Electrical trip', 'Electrical', 'Electrical', 'Medium', 'Sana Tariq', 45, 0, 45, null, null, 'Pending', 'Open'),
    jc('JC-MC-104', '2026-04-14', '2026-04-15', 'Coolant leak', 'Mechanical', 'Corrective', 'Low', 'Usman Ali', 10, 90, 100, 'Seal failure', 'Replaced seal', 'Rejected', 'Closed'),
    jc('JC-MC-105', '2026-05-20', '2026-05-20', 'Emergency stop not working', 'Safety', 'Emergency', 'Critical', 'Ali Raza', 20, 60, 80, 'Faulty switch', 'Replaced switch', 'Approved', 'Closed'),
    jc('JC-MC-106', '2026-06-01', '2026-06-01', 'PM lubrication', 'Preventive', 'Preventive', 'Medium', 'Bilal Khan', 0, 30, 0, '', '', 'Approved', 'Closed')
  ];
  const pmHistory = [
    { pmID: 'PM-100', title: 'Weekly Lubrication', frequency: 'Weekly', status: 'Completed', assignedTo: 'Ali Raza', lastDone: '2026-08-01', nextDue: '2026-08-08', machineName: m.MachineName },
    { pmID: 'PM-101', title: 'Monthly Inspection', frequency: 'Monthly', status: 'Open', assignedTo: 'Bilal Khan', lastDone: '2026-07-20', nextDue: '2026-08-20', machineName: m.MachineName }
  ];
  const spareParts = [
    { date: '2026-01-06', jobCardNo: 'JC-MC-101', partName: 'Bearing 6205', quantity: 2, cost: 350, technician: 'Ali Raza' },
    { date: '2026-05-20', jobCardNo: 'JC-MC-105', partName: 'Emergency Switch', quantity: 1, cost: 120, technician: 'Ali Raza' }
  ];
  return {
    machine: {
      MachineID: m.MachineID, MachineName: m.MachineName, MachineCode: m.MachineCode, MachineNumber: m.MachineCode,
      Department: m.Department, Section: m.Section, Division: m.Division || 'Plant Division', Location: 'Shop Floor - Zone A',
      MachineType: 'CNC', Manufacturer: 'Siemens', Model: '828D', SerialNo: 'SN-8801', Capacity: '500 kg',
      PowerRating: '50 kW', InstallDate: '2019-03-15', WarrantyExpiry: '2024-03-15', Criticality: 'Critical',
      Status: 'Active', MachinePhoto: '', MachineManual: '', ElectricalDrawing: '', MechanicalDrawing: '', SOP: '',
      SafetyInstructions: '', WarrantyDocuments: '', OperatingHoursPerDay: '8', OperatingDaysPerWeek: '6'
    },
    kpi: {
      totalJobs: 6, openJobs: 1, closedJobs: 5, pendingApproval: 1, breakdownJobs: 5, preventiveJobs: 1,
      electricalJobs: 1, mechanicalJobs: 2, totalWaiting: 120, totalWorking: 540, totalDowntime: 630,
      mttr: 2.5, mtbf: 120, availability: 96.2, machineRuntimeHours: 800, lastBreakdownDate: '2026-05-20', lastPMDate: '2026-06-01'
    },
    jobCards,
    spareParts,
    totalPartsCost: 470,
    pmHistory,
    charts: {
      breakdownTrend: [{ label: '2026-01', value: 1 }, { label: '2026-02', value: 1 }, { label: '2026-03', value: 1 }, { label: '2026-04', value: 1 }, { label: '2026-05', value: 1 }],
      downtimeTrend: [{ label: '2026-01', value: 4.5 }, { label: '2026-02', value: 2.25 }, { label: '2026-03', value: 0.75 }, { label: '2026-04', value: 1.67 }, { label: '2026-05', value: 1.33 }],
      failureCategory: [{ label: 'Motor', value: 1 }, { label: 'Mechanical', value: 1 }, { label: 'Electrical', value: 1 }, { label: 'Safety', value: 1 }],
      mttrTrend: [{ label: '2026-01', value: 2.5 }, { label: '2026-02', value: 2.2 }, { label: '2026-03', value: 3.0 }, { label: '2026-04', value: 1.8 }, { label: '2026-05', value: 1.5 }],
      mtbfTrend: [{ label: '2026-01', value: 120 }, { label: '2026-02', value: 110 }, { label: '2026-03', value: 95 }, { label: '2026-04', value: 100 }, { label: '2026-05', value: 90 }],
      sparesCostTrend: [{ label: '2026-01', value: 350 }, { label: '2026-05', value: 120 }],
      pmCompliance: [{ label: 'Completed', value: 4 }, { label: 'Open / Overdue', value: 2 }]
    },
    nextPMDue: '2026-08-08',
    totalOperatingHours: 800,
    runningHours: 9,
    totalDowntimeHours: 10.5,
    closedBreakdownCount: 4,
    pmTotalScheduled: 6,
    timeline: [
      { date: '2019-03-15', type: 'Installation', title: 'Machine Installed - ' + m.MachineName, status: '', jobCardNo: '', subType: '' },
      { date: '2026-01-05', type: 'Breakdown', title: 'Motor overheating - JC-MC-101', status: 'Closed', jobCardNo: 'JC-MC-101', subType: 'Breakdown' },
      { date: '2026-01-05', type: 'Repair Started', title: 'Repair started for JC-MC-101', status: '', jobCardNo: 'JC-MC-101', subType: '' },
      { date: '2026-01-06', type: 'Repair Completed', title: 'Repair completed - JC-MC-101', status: 'completed', jobCardNo: 'JC-MC-101', subType: '' },
      { date: '2026-01-06', type: 'Spare Parts Changed', title: 'Spare parts: Bearing 6205 - JC-MC-101', status: '', jobCardNo: 'JC-MC-101', subType: '' },
      { date: '2026-06-01', type: 'Preventive Maintenance', title: 'Preventive Maintenance - JC-MC-106', status: 'Closed', jobCardNo: 'JC-MC-106', subType: 'Preventive' }
    ],
    searchOptions: []
  };
}

function mockFor(action, data) {
  switch (action) {
    case 'getQRStatistics': return ovStats;
    case 'getQRModuleRecords': {
      const m = (data && data.module) || '';
      if (m === 'Machine') return MOCK.machines;
      if (m === 'Asset') return MOCK.assets;
      if (m === 'Spare Part') return MOCK.spareParts;
      if (m === 'Job Card') return MOCK.jobCards;
      return [];
    }
    case 'getMachineCascade': {
      const d = (data && data.divisionId) || '';
      const s = (data && data.sectionId) || '';
      const divisions = MOCK.divisions;
      const allSecs = [{ id: 'SC001', name: 'Machining' }, { id: 'SC002', name: 'Pumping' }, { id: 'SC003', name: 'Fabrication' }, { id: 'SC004', name: 'Air' }];
      const allDepts = [{ id: 'DP001', name: 'Production' }, { id: 'DP002', name: 'Utility' }];
      const sections = d === 'DV002' ? allSecs.filter(x => x.name === 'Pumping' || x.name === 'Air') : allSecs;
      const departments = d === 'DV002' ? allDepts.filter(x => x.name === 'Utility') : allDepts;
      const machines = MOCK.machines.filter(x => !d || x.id === d || x.Division === (d === 'DV002' ? 'Utility Division' : 'Plant Division'));
      return { divisions, sections, departments, machines };
    }
    case 'getDivisions': return MOCK.divisions;
    case 'getSections': return [{ id: 'SC001', name: 'Machining' }, { id: 'SC002', name: 'Pumping' }, { id: 'SC003', name: 'Fabrication' }, { id: 'SC004', name: 'Air' }];
    case 'getQRScanStats': return stats;
    case 'getQRScanHistory': {
      const page = (data && data.page) || 1;
      const pageSize = (data && data.pageSize) || 25;
      const all = MOCK.history;
      const start = (page - 1) * pageSize;
      return { records: all.slice(start, start + pageSize), total: all.length, page, pageSize, totalPages: Math.ceil(all.length / pageSize) };
    }
    case 'getPrintLabelData': return { companyName: 'PWI Maintenance', recordName: 'Test', recordCode: 'T-001' };
    case 'getModuleRecordDetail': return { name: 'Test', code: 'T-001', status: 'Active' };
    case 'getMachinePassport': return buildPassportMock(data && data.machineId);
    case 'getUserMachines': return [];
    case 'getUserNotifications': return { notifications: [] };
    case 'getDashboardData': return {};
    case 'getNotifications': return { notifications: [] };
    case 'getActiveWorkOrders': return { count: 0 };
    default: return {};
  }
}

async function respondExec(req, res) {
  let body = '';
  for await (const c of req) body += c;
  try {
    const payload = JSON.parse(body);
    const action = payload.action || '';
    const data = payload.data || {};
    const result = mockFor(action, data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (e) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: {} }));
  }
}

await new Promise(resolve => server.listen(PORT, resolve));
console.log('static server on http://localhost:' + PORT);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const apiCalls = [];
const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));
await page.setRequestInterception(true);
page.on('request', req => {
  if (req.url().includes('/api/exec')) {
    const body = req.postData() || '';
    try { const p = JSON.parse(body); apiCalls.push(p.action + '|' + JSON.stringify(p.data || {})); } catch (e) {}
    req.respond({ status: 200, contentType: 'application/json', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, data: mockFor(JSON.parse(body).action, JSON.parse(body).data) }) });
  } else {
    req.continue();
  }
});

await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate(() => {
  try {
    localStorage.setItem('cmms_welcomed', '1');
    localStorage.setItem('cmms_token', 'local-test-token');
    localStorage.setItem('cmms_user', JSON.stringify({ name: 'Test Supervisor', email: 'supervisor@cmms.com', role: 'supervisor', isSystemAdmin: true }));
  } catch (e) {}
});
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => !!document.getElementById('appContainer') && getComputedStyle(document.getElementById('appContainer')).display !== 'none', { timeout: 60000 });
await sleep(1500);

const results = {};

// ---------- check confirmModal exists ----------
results.confirmModal = await page.evaluate(() => ({
  exists: !!document.getElementById('confirmModal'),
  title: (document.getElementById('confirmModal') && document.getElementById('confirmModal').querySelector('.modal-title') || {}).textContent,
  confirmBtn: !!(document.getElementById('confirmModal') && document.getElementById('confirmModal').querySelector('.btn-danger')),
  hasOverlayClass: !!(document.getElementById('confirmModal') && document.getElementById('confirmModal').className.includes('modal-overlay'))
}));

// ---------- helper to navigate & measure a QR page ----------
async function qrPage(route, waitSel, settleMs) {
  await page.evaluate(r => navigateTo(r), route);
  await sleep(settleMs || 2500);
  return page.evaluate(sel => {
    const get = id => document.getElementById(id);
    const h2 = document.querySelector('#pageContent .page-header h2');
    const tabs = Array.from(document.querySelectorAll('#pageContent .qr-tabs .qr-tab')).map(b => b.textContent.trim());
    const selects = Array.from(document.querySelectorAll('#pageContent .qr-search-bar select')).map(s => ({
      id: s.id,
      options: Array.from(s.options).map(o => o.text)
    }));
    const rows = get(sel) ? get(sel).querySelectorAll('tr').length : 0;
    const count = get('qrMcCount') || get('qrAsCount') || get('qrSpCount') || get('qrJcCount') || get('qrOvCount') || get('qrPlCount') || get('qrHsCount') || null;
    const pag = Array.from(document.querySelectorAll('#pageContent .qr-pagination')).length;
    const badges = Array.from(document.querySelectorAll('#pageContent td .badge')).map(b => b.className);
    return { h2: h2 ? h2.textContent.trim() : null, tabs, selects, rows, count: count ? count.textContent : null, pag, badges };
  }, waitSel);
}

results.overview = await qrPage('qr', 'qrOvBody', 2500);
results.machines = await qrPage('qrmachines', 'qrMcBody', 3000);
results.assets = await qrPage('qrassets', 'qrAsBody', 3000);
results.spareparts = await qrPage('qrspareparts', 'qrSpBody', 2500);
results.jobcards = await qrPage('qrjobcards', 'qrJcBody', 2500);
results.jobCardBadges = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#qrJcBody tr')).map(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 6) return null;
    const pb = tds[5].querySelector('.badge');
    return { name: tds[1].textContent.trim(), priorityBadge: pb ? pb.className : null };
  });
});
results.printlabels = await qrPage('qrprint', 'qrPlBody', 2500);
results.history = await qrPage('qrhistory', 'qrHsBody', 2500);

// ---------- cascade test on machines ----------
results.machineCascade = await (async () => {
  await page.evaluate(() => navigateTo('qrmachines'));
  await sleep(3000);
  const before = await page.evaluate(() => ({
    divisions: Array.from(document.getElementById('qrMcDivision').options).map(o => o.text),
    sections: Array.from(document.getElementById('qrMcSection').options).map(o => o.text),
    depts: Array.from(document.getElementById('qrMcDept').options).map(o => o.text),
    status: Array.from(document.getElementById('qrMcStatus').options).map(o => o.text)
  }));
  // pick first division
  const firstDiv = before.divisions[1];
  await page.evaluate(v => {
    const s = document.getElementById('qrMcDivision');
    s.value = v; s.dispatchEvent(new Event('change'));
  }, firstDiv);
  await sleep(2500);
  const after = await page.evaluate(() => ({
    sections: Array.from(document.getElementById('qrMcSection').options).map(o => o.text),
    depts: Array.from(document.getElementById('qrMcDept').options).map(o => o.text)
  }));
  return { firstDiv, before, after };
})();

// ---------- machine passport test (D60) ----------
results.passport = await (async () => {
  await page.evaluate(() => {
    sessionStorage.setItem('passportMachineId', 'MC001');
    sessionStorage.setItem('passportPrevPage', 'qr');
    navigateTo('machinepassport');
  });
  await page.waitForFunction(() => {
    const ct = document.getElementById('passportContainer');
    return ct && getComputedStyle(ct).display !== 'none';
  }, { timeout: 60000 });
  await sleep(2500);

  const collect = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.passport-tab')).map(b => b.textContent.trim());
    const kpiCards = document.querySelectorAll('#passportSummaryCards .stat-card').length;
    const kpiValues = Array.from(document.querySelectorAll('#passportSummaryCards .stat-card .stat-info h3')).map(h => h.textContent);
    const overviewItems = document.querySelectorAll('#passportOverviewGrid .passport-ov-item').length;
    const headerName = (document.querySelector('.passport-name') || {}).textContent;
    const headerTags = Array.from(document.querySelectorAll('.passport-meta .passport-tag, .passport-meta .passport-badge')).map(t => t.textContent.trim());
    const infoItems = document.querySelectorAll('#passportInfoGrid .passport-info-item').length;
    const bdRows = document.querySelectorAll('#passportBDBody tr').length;
    const bdCount = (document.getElementById('passportBDCount') || {}).textContent;
    const pmRows = document.querySelectorAll('#passportPMBody tr').length;
    const pmCount = (document.getElementById('passportPMCount') || {}).textContent;
    const jobHead = (document.getElementById('passportJobHead') || {}).innerHTML;
    const jobCols = document.querySelectorAll('#passportJobHead th').length;
    const jobRows = document.querySelectorAll('#passportJobBody tr').length;
    const jobCount = (document.getElementById('passportJobCount') || {}).textContent;
    const sparesRows = document.querySelectorAll('#passportSparesBody tr').length;
    const sparesCount = (document.getElementById('passportSparesCount') || {}).textContent;
    const docCards = document.querySelectorAll('.passport-doc-card').length;
    const timelineItems = document.querySelectorAll('.timeline-item').length;
    const photoWrap = document.getElementById('passportPhotoWrap');
    const photoHasImg = !!(photoWrap && photoWrap.querySelector('.passport-photo-img'));
    return { tabs, kpiCards, kpiValues, overviewItems, headerName, headerTags, infoItems, bdRows, bdCount, pmRows, pmCount, jobCols, jobRows, jobCount, sparesRows, sparesCount, docCards, timelineItems, photoHasImg };
  });

  // switch to each tab and confirm no page errors
  const tabResults = {};
  for (const [t, label] of [['jobcards', 'job cards'], ['breakdown', 'breakdown'], ['pm', 'pm history'], ['spares', 'spare parts'], ['documents', 'documents'], ['analytics', 'analytics'], ['timeline', 'timeline'], ['machineinfo', 'machine info'], ['overview', 'overview']]) {
    const prevErr = pageErrors.length;
    await page.evaluate(label => {
      const btns = Array.from(document.querySelectorAll('.passport-tab'));
      const btn = btns.find(b => b.textContent.trim().toLowerCase() === label);
      if (btn) btn.click();
    }, label);
    await sleep(900);
    tabResults[t] = { visible: await page.evaluate(id => {
      const el = document.getElementById(id);
      return !!(el && getComputedStyle(el).display !== 'none');
    }, 'passportTab' + t.charAt(0).toUpperCase() + t.slice(1)), newErrors: pageErrors.length - prevErr };
  }
  await page.evaluate(() => { MachinePassport.switchTab('overview', document.querySelector('.passport-tab')); });

  return Object.assign(collect, { tabResults });
})();
results.passportScreenshot = true;


// ---------- API call capture / errors / screenshots ----------
results.apiCalls = apiCalls;
results.consoleErrors = consoleErrors.slice(0, 15);
results.pageErrors = pageErrors.filter(e => !e.includes('gstatic')).slice(0, 15);

// ---------- geometry measurement (machines page) ----------
async function measureModuleLayout(ctx, scopeSel) {
  return ctx.evaluate(scope => {
    const scopeEl = document.querySelector(scope);
    if (!scopeEl) return { scope: null };
    const geom = sel => {
      const el = scopeEl.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), display: s.display, font: s.fontSize + '/' + s.fontFamily.split(',')[0].replace(/["']/g, ''), color: s.color, bg: s.backgroundColor, pad: s.padding, gap: s.gap };
    };
    const selectGeom = id => {
      const el = scopeEl.querySelector('#' + id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), font: s.fontSize + '/' + s.fontFamily.split(',')[0].replace(/["']/g, ''), bg: s.backgroundColor, color: s.color, border: s.border };
    };
    const header = scopeEl.querySelector('.page-header');
    const h2 = header ? header.querySelector('h2') : null;
    const h2r = h2 ? h2.getBoundingClientRect() : null;
    const tabBar = scopeEl.querySelector('.qr-controls');
    const searchBar = scopeEl.querySelector('.qr-search-bar');
    const tableWrap = scopeEl.querySelector('.qr-table-wrap');
    const footer = scopeEl.querySelector('.qr-page-footer, .page-footer-actions');
    const headerStyle = header ? getComputedStyle(header) : null;
    const h2Style = h2 ? getComputedStyle(h2) : null;
    return {
      scope,
      pageHeader: header ? { y: Math.round(header.getBoundingClientRect().top), h: Math.round(header.getBoundingClientRect().height), w: Math.round(header.getBoundingClientRect().width) } : null,
      h2: h2 ? { y: Math.round(h2r.top), h: Math.round(h2r.height), font: h2Style.fontSize, weight: h2Style.fontWeight, margin: h2Style.margin, pad: h2Style.padding, color: h2Style.color } : null,
      headerPad: headerStyle ? headerStyle.padding : null,
      tabBar: tabBar ? geom('.qr-controls') : null,
      searchBar: searchBar ? geom('.qr-search-bar') : null,
      tableWrap: tableWrap ? geom('.qr-table-wrap') : null,
      footer: footer ? geom('.qr-page-footer, .page-footer-actions') : null,
      selects: {
        division: selectGeom('qrMcDivision') || selectGeom('qrMachineDivision'),
        section: selectGeom('qrMcSection') || selectGeom('qrMachineSectionFilter'),
        dept: selectGeom('qrMcDept') || selectGeom('qrMachineDeptFilter'),
        status: selectGeom('qrMcStatus') || selectGeom('qrMachineStatusFilter')
      },
      searchInput: (() => {
        const el = scopeEl.querySelector('#qrMcSearch') || scopeEl.querySelector('#qrMachineSearch');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: Math.round(r.width), h: Math.round(r.height), font: s.fontSize, pad: s.padding, border: s.border, bg: s.backgroundColor, ph: el.getAttribute('placeholder') };
      })()
    };
  }, scopeSel);
}

// ---------- side-by-side vs GAS ----------
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1440, height: 900 });
await gasPage.goto(GAS, { waitUntil: 'networkidle2', timeout: 240000 });
async function findGasFrame() {
  for (const f of gasPage.frames()) {
    if (f === gasPage.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('qrMachineTableBody'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null;
{
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    gasFrame = await findGasFrame();
    if (gasFrame) {
      const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
      if (hasForm) break;
    }
    await sleep(3000);
  }
}
if (!gasFrame) { console.log('FATAL: GAS app frame not found'); process.exit(2); }
await gasFrame.type('#loginEmail', 'supervisor@cmms.com');
await gasFrame.type('#loginPassword', 'super123');
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 240000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('qrmachines'));
await gasFrame.waitForFunction(() => document.getElementById('qrMachineTableBody') && document.getElementById('qrMachineDivision').options.length > 1, { timeout: 240000 });
await sleep(2500);
results.gasMachines = await measureModuleLayout(gasFrame, '#qrmachinesPage');

// CF machines geometry (already navigated to qrmachines earlier; re-navigate to be sure)
await page.evaluate(() => navigateTo('qrmachines'));
await sleep(3000);
results.cfMachines = await measureModuleLayout(page, '#pageContent');

// ---------- screenshots ----------
const SHOT = path.join(__dirname, 'verify_shots');
fs.mkdirSync(SHOT, { recursive: true });
for (const [name, route] of [['qr_overview', 'qr'], ['qr_machines', 'qrmachines'], ['qr_assets', 'qrassets'], ['qr_jobcards', 'qrjobcards'], ['qr_history', 'qrhistory']]) {
  await page.evaluate(r => navigateTo(r), route);
  await sleep(3000);
  await page.screenshot({ path: path.join(SHOT, 'qr_' + name + '.png') });
}

// passport screenshot
await page.evaluate(() => {
  sessionStorage.setItem('passportMachineId', 'MC001');
  sessionStorage.setItem('passportPrevPage', 'qr');
  navigateTo('machinepassport');
});
await page.waitForFunction(() => {
  const ct = document.getElementById('passportContainer');
  return ct && getComputedStyle(ct).display !== 'none';
}, { timeout: 60000 });
await sleep(3000);
await page.screenshot({ path: path.join(SHOT, 'qr_passport_overview.png') });
await page.evaluate(() => { MachinePassport.switchTab('jobcards', document.querySelectorAll('.passport-tab')[4]); });
await sleep(2500);
await page.screenshot({ path: path.join(SHOT, 'qr_passport_jobcards.png') });
await page.evaluate(() => { MachinePassport.switchTab('timeline', document.querySelectorAll('.passport-tab')[8]); });
await sleep(1500);
await page.screenshot({ path: path.join(SHOT, 'qr_passport_timeline.png') });

fs.writeFileSync(path.join(SHOT, 'qr_local_results.json'), JSON.stringify(results, null, 2));
console.log('\n================ QR LOCAL VERIFICATION ================');
console.log('\n[confirmModal] exists=' + results.confirmModal.exists + ' title="' + results.confirmModal.title + '" dangerBtn=' + results.confirmModal.confirmBtn + ' overlayClass=' + results.confirmModal.hasOverlayClass);

for (const [k, v] of [['overview', 'Overview'], ['machines', 'Machines'], ['assets', 'Assets'], ['spareparts', 'Spare Parts'], ['jobcards', 'Job Cards'], ['printlabels', 'Print Labels'], ['history', 'History']]) {
  const r = results[k];
  console.log('\n[' + v + ']');
  console.log('  h2: ' + r.h2);
  console.log('  tabs: ' + JSON.stringify(r.tabs));
  console.log('  rows: ' + r.rows + '  count: "' + r.count + '"  paginationDivs: ' + r.pag);
  console.log('  filter selects:');
  r.selects.forEach(s => console.log('    ' + s.id + ' -> ' + JSON.stringify(s.options.slice(0, 12))));
}

console.log('\n[machine cascade]');
console.log('  divisions: ' + JSON.stringify(results.machineCascade.before.divisions));
console.log('  sections(before): ' + JSON.stringify(results.machineCascade.before.sections));
console.log('  depts(before): ' + JSON.stringify(results.machineCascade.before.depts));
console.log('  status(opts): ' + JSON.stringify(results.machineCascade.before.status));
console.log('  after select "' + results.machineCascade.firstDiv + '": sections=' + JSON.stringify(results.machineCascade.after.sections) + ' depts=' + JSON.stringify(results.machineCascade.after.depts));

console.log('\n[job card priority badges]');
results.jobCardBadges.forEach(b => { if (b) console.log('  ' + b.name + ' -> ' + b.priorityBadge); });

console.log('\n[machine passport D60]');
const pp = results.passport;
console.log('  header: ' + pp.headerName + ' tags=' + JSON.stringify(pp.headerTags) + ' photoImg=' + pp.photoHasImg);
console.log('  tabs: ' + JSON.stringify(pp.tabs));
console.log('  KPI cards: ' + pp.kpiCards + ' values=' + JSON.stringify(pp.kpiValues));
console.log('  overview items: ' + pp.overviewItems + '  info items: ' + pp.infoItems);
console.log('  breakdown rows: ' + pp.bdRows + ' ("' + pp.bdCount + '")');
console.log('  PM rows: ' + pp.pmRows + ' ("' + pp.pmCount + '")');
console.log('  job table cols: ' + pp.jobCols + ' rows: ' + pp.jobRows + ' ("' + pp.jobCount + '")');
console.log('  spares rows: ' + pp.sparesRows + ' ("' + pp.sparesCount + '")');
console.log('  doc cards: ' + pp.docCards + '  timeline items: ' + pp.timelineItems);
console.log('  tab visibility / new page errors:');
for (const t of Object.keys(pp.tabResults)) {
  console.log('    ' + t.padEnd(12) + ' visible=' + pp.tabResults[t].visible + ' newErrors=' + pp.tabResults[t].newErrors);
}

console.log('\n[module page geometry CF vs GAS]');
if (results.cfMachines && results.gasMachines) {
  const cf = results.cfMachines, g = results.gasMachines;
  const row = (label, a, b) => {
    const f = o => o ? (o.y + ' y, ' + o.h + ' h' + (o.w ? ', ' + o.w + ' w' : '')) : '-';
    console.log('  ' + label.padEnd(14) + ' CF: ' + f(a) + '   GAS: ' + f(b));
  };
  row('page-header', cf.pageHeader, g.pageHeader);
  row('h2', cf.h2, g.h2);
  console.log('  headerPad       CF: ' + cf.headerPad + '   GAS: ' + g.headerPad);
  row('tabBar', cf.tabBar, g.tabBar);
  row('searchBar', cf.searchBar, g.searchBar);
  row('tableWrap', cf.tableWrap, g.tableWrap);
  row('footer', cf.footer, g.footer);
  console.log('  selects:');
  for (const k of ['division', 'section', 'dept', 'status']) {
    const a = cf.selects[k], b = g.selects[k];
    const f = o => o ? ('w=' + o.w + ' h=' + o.h + ' font=' + o.font + ' bg=' + o.bg + ' color=' + o.color) : '-';
    console.log('    ' + k.padEnd(9) + ' CF: ' + f(a));
    console.log('    ' + ''.padEnd(9) + ' GAS: ' + f(b));
  }
  console.log('  searchInput     CF: ' + JSON.stringify(cf.searchInput));
  console.log('  searchInput     GAS: ' + JSON.stringify(g.searchInput));
}

console.log('\n[API calls captured]');
results.apiCalls.forEach(c => console.log('  ' + c));

console.log('\n[errors] console=' + results.consoleErrors.length + ' page=' + results.pageErrors.length);
results.consoleErrors.forEach(e => console.log('  console: ' + e));
results.pageErrors.forEach(e => console.log('  page: ' + e));

await browser.close();
server.close();
console.log('\nDONE');
