import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8790;
const ROOT = 'D:/CLASP/CMMS/PWI-Maintanance/cloudflare';

const mimeTypes = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif',
  '.json': 'application/json', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = ROOT + req.url.split('?')[0];
  if (filePath === ROOT + '/') filePath = ROOT + '/index.html';

  if (req.url.startsWith('/api/exec')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let action = 'unknown';
      try { const parsed = JSON.parse(body); action = parsed.action || 'unknown'; } catch(e) {}

      let responseData = { success: true, data: {} };

      if (action === 'getDashboardData') {
        responseData = { success: true, data: {
          totalMachines: 12, runningMachines: 8, breakdownMachines: 1,
          openJobs: 5, runningJobs: 3, closedJobs: 12, approvedJobs: 8,
          pendingJobs: 2, waitingJobs: 1,
          totalWaitingTimeMinutes: 340, totalWorkingTimeMinutes: 4520,
          totalRepairTimeMinutes: 1280, totalDowntimeMinutes: 960,
          mttr: 4.2, mtbf: 168.5, totalMachineRuntimeHours: 4560,
          availability: 97.5, breakdownMaintenanceCount: 3,
          preventiveMaintenanceCount: 8, pmDue: 2, pmOverdue: 1,
          lowStockParts: 4, outOfStockParts: 1, pmCompliance: 92,
          qrGenerated: 45, totalStockValue: 285000,
          charts: { months: ['Jan','Feb','Mar','Apr','May','Jun'],
            openJobs: [3,5,2,4,6,3], runningJobs: [2,3,4,2,3,5],
            closedJobs: [4,6,8,5,7,9], pendingJobs: [1,2,1,3,2,1],
            approvedJobs: [3,4,5,3,4,6], breakdowns: [1,2,0,1,2,1],
            mttr: [4.5,4.2,3.8,4.1,3.9,4.2], mtbf: [160,165,170,168,172,168],
            waitingTime: [45,32,28,50,38,42], downtime: [12,8,15,10,9,14],
            monthlyMaintenance: [5,7,6,8,6,9] }
        }};
      } else if (action === 'logout' || action === 'login') {
        responseData = action === 'login'
          ? { success: true, token: 'mock-token', user: { id: 1, email: 'admin@test.com', name: 'Admin User', role: 'Administrator', department: 'IT', isSystemAdmin: true } }
          : { success: true, data: {} };
      } else {
        responseData = { success: true, data: [] };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseData));
    });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  console.log(`Server at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  const errors = [];
  const traces = [];

  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('[TRACE]')) traces.push(t);
    if (msg.type() === 'error') errors.push({ type: 'console_error', text: t });
  });
  page.on('pageerror', err => errors.push({ type: 'page_error', text: err.message, stack: err.stack }));

  // Initial load
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 15000 });

  // Set up logged-in state and reload
  await page.evaluate(() => {
    localStorage.setItem('cmms_welcomed', 'true');
    localStorage.setItem('cmms_token', 'mock-token');
    localStorage.setItem('cmms_user', JSON.stringify({
      id: 1, email: 'admin@test.com', name: 'Admin User',
      role: 'Administrator', department: 'IT', isSystemAdmin: true
    }));
  });

  await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Verify initial state
  const initState = await page.evaluate(() => {
    const content = document.getElementById('pageContent');
    return {
      length: content ? content.innerHTML.length : 0,
      html: content ? content.innerHTML.substring(0, 150) : 'no content',
      appDisplay: document.getElementById('appContainer') ? document.getElementById('appContainer').style.display : 'unknown'
    };
  });
  console.log(`\nInitial state: ${initState.length} bytes, app=${initState.appDisplay}`);
  if (initState.length > 100) {
    console.log('PASS: Dashboard initial render');
  } else {
    console.log('FAIL: Dashboard not rendered');
    // Show last traces
    const last = traces.slice(-15);
    for (const t of last) console.log(`  ${t}`);
    await browser.close(); server.close(); process.exit(1);
  }

  // Now test each page via hash navigation + click navigate button
  const pagesToTest = [
    { name: 'sections', page: 'sections' },
    { name: 'departments', page: 'departments' },
    { name: 'machines', page: 'machines' },
    { name: 'assets', page: 'assets' },
    { name: 'technicians', page: 'technicians' },
    { name: 'users', page: 'users' },
    { name: 'openjobcard', page: 'openjobcard' },
    { name: 'startjobcard', page: 'startjobcard' },
    { name: 'closejobcard', page: 'closejobcard' },
    { name: 'pendingjobcard', page: 'pendingjobcard' },
    { name: 'approvejobcard', page: 'approvejobcard' },
    { name: 'jobcards', page: 'jobcards' },
    { name: 'pm', page: 'pm' },
    { name: 'checklists', page: 'checklists' },
    { name: 'spareparts', page: 'spareparts' },
    { name: 'inventory', page: 'inventory' },
    { name: 'breakdown', page: 'breakdown' },
    { name: 'pmhistory', page: 'pmhistory' },
    { name: 'audit', page: 'audit' },
    { name: 'reports', page: 'reports' },
    { name: 'notifications', page: 'notifications' },
    { name: 'email', page: 'email' },
    { name: 'whatsapp', page: 'whatsapp' },
    { name: 'qr', page: 'qr' },
    { name: 'settings', page: 'settings' },
    { name: 'backuprestore', page: 'backuprestore' }
  ];

  let allPass = true;
  for (const { name, page: pageName } of pagesToTest) {
    traces.length = 0;
    errors.length = 0;

    // Navigate via the sidebar - click the sidebar item
    const clicked = await page.evaluate((pn) => {
      const item = document.querySelector(`.sidebar-item[data-page="${pn}"]`);
      if (item) { item.click(); return true; }
      // Fallback: try navigateTo
      if (typeof navigateTo === 'function') { navigateTo(pn); return true; }
      return false;
    }, pageName);

    await new Promise(r => setTimeout(r, 1500));

    const state = await page.evaluate(() => {
      const content = document.getElementById('pageContent');
      const app = document.getElementById('appContainer');
      return {
        appDisplay: app ? app.style.display : 'unknown',
        contentHTML: content ? content.innerHTML.substring(0, 120) : 'no content',
        contentLength: content ? content.innerHTML.length : 0,
        spinnerInContent: content ? content.innerHTML.includes('empty-state') : false,
        loadingInContent: content ? content.innerHTML.includes('Loading...') : false
      };
    });

    const hasError = errors.length > 0;
    const spinnerVisible = state.spinnerInContent;
    const hasLoadingText = state.loadingInContent;
    const rendered = state.contentLength > 200 && !spinnerVisible;
    // Allow loading text (for async data), reject spinner
    const pass = rendered;

    if (!pass) {
      allPass = false;
      console.log(`\n=== FAIL: ${name} ===`);
      console.log(`  clicked=${clicked} length=${state.contentLength} spinner=${spinnerVisible} loading=${hasLoadingText} error=${hasError}`);
      if (hasError) for (const e of errors) console.log(`  ERROR: ${e.text}`);
      const last = traces.slice(-10);
      for (const t of last) console.log(`  TRACE: ${t}`);
      console.log(`  Content: ${state.contentHTML}`);
    } else {
      console.log(`PASS: ${name} (${state.contentLength} bytes)`);
    }
  }

  console.log(`\n${allPass ? 'ALL PAGES PASS' : 'SOME PAGES FAILED'}`);
  await browser.close();
  server.close();
  process.exit(allPass ? 0 : 1);
});
