import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const ROOT = 'D:/CLASP/CMMS/PWI-Maintanance/cloudflare';
const mimeTypes = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif',
  '.json': 'application/json', '.ico': 'image/x-icon'
};

function makeServer() {
  return http.createServer((req, res) => {
    let filePath = ROOT + req.url.split('?')[0];
    if (filePath === ROOT + '/') filePath = ROOT + '/index.html';
    if (req.url.startsWith('/api/exec')) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        let action = 'unknown';
        try { const parsed = JSON.parse(body); action = parsed.action || 'unknown'; } catch (e) { /* ignore */ }
        let responseData = { success: true, data: [] };
        if (action === 'getDashboardData') {
          responseData = { success: true, data: {
            totalMachines: 12, runningMachines: 8, breakdownMachines: 1, openJobs: 5, runningJobs: 3, closedJobs: 12, approvedJobs: 8, pendingJobs: 2, waitingJobs: 1, totalWaitingTimeMinutes: 340, totalWorkingTimeMinutes: 4520, totalRepairTimeMinutes: 1280, totalDowntimeMinutes: 960, mttr: 4.2, mtbf: 168.5, totalMachineRuntimeHours: 4560, availability: 97.5, breakdownMaintenanceCount: 3, preventiveMaintenanceCount: 8, pmDue: 2, pmOverdue: 1, lowStockParts: 4, outOfStockParts: 1, pmCompliance: 92, qrGenerated: 45, totalStockValue: 285000, charts: { months: ['Jan','Feb','Mar','Apr','May','Jun'], openJobs: [3,5,2,4,6,3], runningJobs: [2,3,4,2,3,5], closedJobs: [4,6,8,5,7,9], pendingJobs: [1,2,1,3,2,1], approvedJobs: [3,4,5,3,4,6], breakdowns: [1,2,0,1,2,1], mttr: [4.5,4.2,3.8,4.1,3.9,4.2], mtbf: [160,165,170,168,172,168], waitingTime: [45,32,28,50,38,42], downtime: [12,8,15,10,9,14], monthlyMaintenance: [5,7,6,8,6,9] } }
          };
        } else if (action === 'login') {
          responseData = { success: true, token: 'mock-token', user: { id: 1, email: 'admin@test.com', name: 'Admin User', role: 'Administrator', department: 'IT', isSystemAdmin: true } };
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
}

const server = makeServer();
server.listen(8794, async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();

  await page.goto('http://localhost:8794', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('cmms_welcomed', 'true');
    localStorage.setItem('cmms_token', 'mock-token');
    localStorage.setItem('cmms_user', JSON.stringify({ id: 1, email: 'admin@test.com', name: 'Admin User', role: 'Administrator', department: 'IT', isSystemAdmin: true }));
  });
  await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const item = document.querySelector('.sidebar-item[data-page="sections"]');
    if (item) item.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    const el = document.getElementById('pageContent');
    const html = el ? el.innerHTML : 'no content';
    return {
      html: html,
      hasEmptyState: html.includes('empty-state'),
      hasSpinnerClass: html.includes('spinner'),
      hasLoading: html.includes('Loading')
    };
  });

  console.log('Has empty-state:', data.hasEmptyState);
  console.log('Has spinner:', data.hasSpinnerClass);
  console.log('Has Loading:', data.hasLoading);
  console.log('HTML[0:800]:', data.html.substring(0, 800));

  await browser.close();
  server.close();
});
