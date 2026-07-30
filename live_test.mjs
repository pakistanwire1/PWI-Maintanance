import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8788;
const ROOT = 'D:/CLASP/CMMS/PWI-Maintanance/cloudflare';

// Start a simple HTTP server for the static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  let filePath = ROOT + req.url.split('?')[0];
  if (filePath === ROOT + '/') filePath = ROOT + '/index.html';
  
  // Handle /api/exec - return a mock response
  if (req.url.startsWith('/api/exec')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let action = 'unknown';
      try {
        const parsed = JSON.parse(body);
        action = parsed.action || 'unknown';
      } catch(e) {}
      
      // Return appropriate mock data based on action
      let responseData = { success: true, data: {} };
      
      if (action === 'getDashboardData') {
        responseData = {
          success: true,
          data: {
            totalMachines: 12, runningMachines: 8, breakdownMachines: 1,
            openJobs: 5, runningJobs: 3, closedJobs: 12, approvedJobs: 8,
            pendingJobs: 2, waitingJobs: 1,
            totalWaitingTimeMinutes: 340, totalWorkingTimeMinutes: 4520,
            totalRepairTimeMinutes: 1280, totalDowntimeMinutes: 960,
            mttr: 4.2, mtbf: 168.5,
            totalMachineRuntimeHours: 4560,
            availability: 97.5,
            breakdownMaintenanceCount: 3, preventiveMaintenanceCount: 8,
            pmDue: 2, pmOverdue: 1,
            lowStockParts: 4, outOfStockParts: 1,
            pmCompliance: 92,
            qrGenerated: 45,
            totalStockValue: 285000,
            charts: {
              months: ['Jan','Feb','Mar','Apr','May','Jun'],
              openJobs: [3,5,2,4,6,3],
              runningJobs: [2,3,4,2,3,5],
              closedJobs: [4,6,8,5,7,9],
              pendingJobs: [1,2,1,3,2,1],
              approvedJobs: [3,4,5,3,4,6],
              breakdowns: [1,2,0,1,2,1],
              mttr: [4.5,4.2,3.8,4.1,3.9,4.2],
              mtbf: [160,165,170,168,172,168],
              waitingTime: [45,32,28,50,38,42],
              downtime: [12,8,15,10,9,14],
              monthlyMaintenance: [5,7,6,8,6,9]
            }
          }
        };
      } else if (action === 'getSectionList' || action === 'getMachineList' || action === 'getDepartmentList') {
        responseData = { success: true, data: [] };
      } else if (action === 'login') {
        responseData = {
          success: true,
          token: 'mock-token-12345',
          user: {
            id: 1, email: 'admin@test.com', name: 'Admin User',
            role: 'Administrator', department: 'IT',
            isSystemAdmin: true
          }
        };
      } else if (action === 'getNotifications') {
        responseData = { success: true, data: [] };
      } else if (action === 'getAuditLogs') {
        responseData = { success: true, data: [] };
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseData));
    });
    return;
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + req.url);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture all console output
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text, time: Date.now() });
    if (msg.type() === 'error') {
      console.log('[BROWSER ERROR]', text);
    } else {
      console.log('[BROWSER ' + msg.type().toUpperCase() + ']', text);
    }
  });
  
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
    console.log(err.stack);
  });
  
  // Navigate to the app
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  console.log('\n=== Page loaded ===');
  
  // Check the page title
  const title = await page.title();
  console.log('Title:', title);
  
  // Check what's visible
  const visibleState = await page.evaluate(() => {
    const welcome = document.getElementById('welcomePage');
    const login = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    const overlay = document.getElementById('loadingOverlay');
    return {
      welcomeDisplay: welcome ? welcome.style.display : 'not found',
      loginDisplay: login ? login.style.display : 'not found',
      appDisplay: app ? app.style.display : 'not found',
      overlayShow: overlay ? overlay.classList.contains('show') : 'not found',
      overlayDisplay: overlay ? overlay.style.display : 'not found',
      pageContent: document.getElementById('pageContent') ? document.getElementById('pageContent').innerHTML.substring(0, 200) : 'not found',
      hash: window.location.hash,
      readyState: document.readyState,
      welcomeVisible: welcome ? welcome.style.display !== 'none' : false,
      loginVisible: login ? login.style.display !== 'none' : false,
      appVisible: app ? app.style.display !== 'none' : false
    };
  });
  
  console.log('\n=== Initial State ===');
  console.log(JSON.stringify(visibleState, null, 2));
  
  // Set up login state and simulate login
  await page.evaluate(() => {
    localStorage.setItem('cmms_welcomed', 'true');
    localStorage.setItem('cmms_token', 'mock-token-12345');
    localStorage.setItem('cmms_user', JSON.stringify({
      id: 1, email: 'admin@test.com', name: 'Admin User',
      role: 'Administrator', department: 'IT', isSystemAdmin: true
    }));
  });
  
  // Reload the page to trigger the logged-in flow
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  
  console.log('\n=== After reload (logged in) ===');
  
  const postLoginState = await page.evaluate(() => {
    const welcome = document.getElementById('welcomePage');
    const login = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    const overlay = document.getElementById('loadingOverlay');
    const content = document.getElementById('pageContent');
    return {
      welcomeDisplay: welcome ? welcome.style.display : 'not found',
      loginDisplay: login ? login.style.display : 'not found',
      appDisplay: app ? app.style.display : 'not found',
      overlayShow: overlay ? overlay.classList.contains('show') : 'not found',
      contentHTML: content ? content.innerHTML.substring(0, 300) : 'not found',
      hash: window.location.hash,
      contentLength: content ? content.innerHTML.length : 0,
      appVisible: app ? app.style.display !== 'none' : false
    };
  });
  
  console.log(JSON.stringify(postLoginState, null, 2));
  
  // Wait a bit for async operations
  await new Promise(r => setTimeout(r, 2000));
  
  const finalState = await page.evaluate(() => {
    const content = document.getElementById('pageContent');
    const overlay = document.getElementById('loadingOverlay');
    return {
      overlayShow: overlay ? overlay.classList.contains('show') : 'not found',
      contentLength: content ? content.innerHTML.length : 0,
      contentStart: content ? content.innerHTML.substring(0, 500) : 'not found',
      cards: document.querySelectorAll('.stat-card').length,
      chartDivs: document.querySelectorAll('[id^="chart"]').length
    };
  });
  
  console.log('\n=== Final State (after 2s) ===');
  console.log(JSON.stringify(finalState, null, 2));
  
  console.log('\n=== All Console Output ===');
  for (const l of logs) {
    const prefix = l.type === 'error' ? 'ERR' : l.type === 'warn' ? 'WRN' : 'LOG';
    if (l.text.includes('[TRACE]') || l.text.includes('Error') || l.text.includes('error') || l.text.includes('undefined') || l.text.includes('TypeError') || l.text.includes('ReferenceError')) {
      console.log(`[${prefix}] ${l.text}`);
    }
  }
  
  // Check for errors
  const errors = logs.filter(l => l.type === 'error' || l.text.includes('Error') || l.text.includes('TypeError') || l.text.includes('ReferenceError'));
  if (errors.length > 0) {
    console.log('\n=== ERRORS DETECTED ===');
    for (const e of errors) {
      console.log(`[${e.type}] ${e.text}`);
    }
  }
  
  const htmlContent = await page.content();
  const spinnerInContent = htmlContent.includes('empty-state') || htmlContent.includes('Loading...');
  console.log('\n=== Spinner present in page:', spinnerInContent, '===');
  
  await browser.close();
  server.close();
  process.exit(0);
});
