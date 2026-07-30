import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8789;
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
      } else if (action === 'logout') {
        responseData = { success: true, data: {} };
      } else if (action === 'login') {
        responseData = { success: true, token: 'mock-token', user: {
          id: 1, email: 'admin@test.com', name: 'Admin User',
          role: 'Administrator', department: 'IT', isSystemAdmin: true
        }};
      } else if (action === 'getNotifications' || action === 'getAuditLogs') {
        responseData = { success: true, data: [] };
      } else {
        // For all other API calls return empty array
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

  // Set up logged-in session
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('cmms_welcomed', 'true');
    localStorage.setItem('cmms_token', 'mock-token');
    localStorage.setItem('cmms_user', JSON.stringify({
      id: 1, email: 'admin@test.com', name: 'Admin User',
      role: 'Administrator', department: 'IT', isSystemAdmin: true
    }));
  });

  // Test pages
  const pagesToTest = [
    'dashboard', 'sections', 'departments', 'machines', 'assets',
    'technicians', 'users', 'openjobcard', 'startjobcard', 'closejobcard',
    'pendingjobcard', 'approvejobcard', 'jobcards', 'pm', 'checklists',
    'spareparts', 'inventory', 'breakdown', 'pmhistory', 'audit',
    'reports', 'notifications', 'email', 'whatsapp', 'qr',
    'settings', 'backuprestore'
  ];

  let allPass = true;
  for (const pageName of pagesToTest) {
    traces.length = 0;
    errors.length = 0;

    await page.evaluate((p) => {
      window.location.hash = p;
    }, pageName);
    await new Promise(r => setTimeout(r, 1000));

    // Check what happened
    const state = await page.evaluate(() => {
      const content = document.getElementById('pageContent');
      const app = document.getElementById('appContainer');
      return {
        appDisplay: app ? app.style.display : 'unknown',
        contentHTML: content ? content.innerHTML.substring(0, 100) : 'no content',
        contentLength: content ? content.innerHTML.length : 0,
        spinnerVisible: content ? content.innerHTML.includes('empty-state') : false,
        loadingText: content ? content.innerHTML.includes('Loading...') : false
      };
    });

    const hasError = errors.length > 0;
    const hasSpinner = state.spinnerVisible;
    const pass = !hasError && !hasSpinner && state.contentLength > 100;

    if (!pass) {
      allPass = false;
      console.log(`\n=== FAIL: ${pageName} ===`);
      console.log(`  spinner=${hasSpinner} error=${hasError} length=${state.contentLength}`);
      if (hasError) {
        for (const e of errors) console.log(`  ERROR: ${e.text}`);
      }
      // Show traces leading up to the failure
      if (traces.length > 0) {
        const lastTraces = traces.slice(-10);
        for (const t of lastTraces) console.log(`  TRACE: ${t}`);
      }
      console.log(`  Content: ${state.contentHTML}`);
    } else {
      console.log(`PASS: ${pageName} (${state.contentLength} bytes)`);
    }
  }

  console.log(`\n${allPass ? 'ALL PAGES PASS' : 'SOME PAGES FAILED'}`);
  await browser.close();
  server.close();
  process.exit(allPass ? 0 : 1);
});
