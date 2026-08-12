import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('cloudflare');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8896;
const URL = 'http://localhost:' + PORT + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let p = path.resolve(ROOT, (urlPath === '/' ? 'index.html' : urlPath).replace(/^\/+/, ''));
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));
console.log('static server on ' + URL);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
});

function mockFor(action) {
  switch (action) {
    case 'getDashboardData': return { totalMachines: 1, runningMachines: 0, breakdownMachines: 0, idleMachines: 0 };
    case 'getQRStatistics': return { machineCount: 1, assetCount: 0, jobCardCount: 0, sparePartCount: 0 };
    case 'getQRModuleRecords': return [];
    case 'getMachineCascade': return { divisions: [], sections: [], departments: [], machines: [] };
    case 'getQRScanHistory': return { records: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
    case 'getQRScanStats': return { scansToday: 0, scansTotal: 0, recent: [] };
    case 'getNotifications': case 'getUserNotifications': return { notifications: [] };
    case 'getActiveWorkOrders': return { count: 0 };
    case 'logQRScan': return { success: true };
    case 'scanQRCode': case 'scanBarcode': case 'getQRDetail':
      return { module: 'Machine', id: 'MC001', MachineID: 'MC001', name: 'CNC Machine 1', MachineName: 'CNC Machine 1', code: 'MC-001', MachineCode: 'MC-001', status: 'Active', Status: 'Active', department: 'Production', location: 'Plant A', criticality: 'High' };
    default: return {};
  }
}

async function setupPage(context, viewport) {
  const page = await context.newPage();
  if (viewport) await page.setViewport(viewport);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push((e && (e.message || String(e)) || '').slice(0, 300)));
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().includes('/api/exec')) {
      let payload = {};
      try { payload = JSON.parse(req.postData() || '{}'); } catch (e) {}
      req.respond({ status: 200, contentType: 'application/json', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, data: mockFor(payload.action || '') }) });
    } else { req.continue(); }
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    try {
      localStorage.setItem('cmms_welcomed', '1');
      localStorage.setItem('cmms_token', 'local-test-token');
      localStorage.setItem('cmms_user', JSON.stringify({ name: 'Test Supervisor', email: 'supervisor@cmms.com', role: 'supervisor', isSystemAdmin: true }));
    } catch (e) {}
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => typeof QRCodes !== 'undefined' && typeof QRCodes.openCameraScanner === 'function', { timeout: 60000 });
  return { page, errors };
}

async function waitCameraActive(page, label, timeoutMs) {
  await page.evaluate(() => QRCodes.openCameraScanner());
  await page.waitForFunction(() => {
    const ov = document.getElementById('qrScannerOverlay');
    if (!ov) return false;
    const v = ov.querySelector('video');
    return v && v.srcObject && v.srcObject.active;
  }, { timeout: timeoutMs || 30000 });
  console.log(label + ': camera stream active');
  await sleep(800);
}

const results = {};

// ---------- Context A: GRANTED ----------
{
  const ctxA = await browser.createBrowserContext();
  await ctxA.overridePermissions(URL, ['camera']);
  const { page, errors } = await setupPage(ctxA);
  const r = { cycles: [] };
  r.permStateAfterGrant = await page.evaluate(() => new Promise(res => {
    try { navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown')); } catch (e) { res('unknown'); }
  }));

  try { await waitCameraActive(page, 'A granted', 30000); r.grantedOpen = true; }
  catch (e) { r.grantedOpen = false; r.grantedOpenErr = String(e); }

  // D + E: open/close 3x, no leaked tracks
  let leak = 0;
  for (let i = 1; i <= 3; i++) {
    try {
      await waitCameraActive(page, 'E cycle ' + i, 30000);
      await page.evaluate(() => QRCodes.closeCameraScanner());
      await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
      await sleep(400);
      const live = await page.evaluate(() => {
        let n = 0; document.querySelectorAll('video').forEach(v => { if (v.srcObject && v.srcObject.active) n++; }); return n;
      });
      leak += live;
      r.cycles.push({ i, ok: live === 0 });
    } catch (e) { r.cycles.push({ i, ok: false, err: String(e) }); }
  }
  r.trackLeakTotal = leak;

  // F: navigate away while open stops camera
  try {
    await waitCameraActive(page, 'F open', 30000);
    await page.evaluate(() => navigateTo('qr'));
    await sleep(1200);
    r.f_afterNav = await page.evaluate(() => ({
      overlay: !!document.getElementById('qrScannerOverlay'),
      live: (function(){ let n = 0; document.querySelectorAll('video').forEach(v => { if (v.srcObject && v.srcObject.active) n++; }); return n; })()
    }));
  } catch (e) { r.f_afterNav = { error: String(e) }; }

  // G: reopen after navigation
  try { await waitCameraActive(page, 'G reopen', 30000); r.g_reopen = true; }
  catch (e) { r.g_reopen = false; r.g_reopenErr = String(e); }
  await page.evaluate(() => QRCodes.closeCameraScanner());
  await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  await sleep(300);

  // H: simulated scan -> detail modal (patch html5-qrcode callbacks)
  await page.evaluate(() => {
    window.__origStart = Html5Qrcode.prototype.start;
    window.__origStop = Html5Qrcode.prototype.stop;
    Html5Qrcode.prototype.start = function() {
      var onSuccess = arguments[2];
      setTimeout(function() { try { onSuccess('QR-MC-001'); } catch (e) {} }, 300);
      return Promise.resolve();
    };
    Html5Qrcode.prototype.stop = function() { return Promise.resolve(); };
  });
  await page.evaluate(() => QRCodes.openCameraScanner());
  try {
    await page.waitForFunction(() => !!document.getElementById('qrDetailOverlay'), { timeout: 20000 });
    r.h_modal = true;
    await sleep(800);
    r.h_buttons = await page.evaluate(() => Array.from(document.querySelectorAll('#qrDetailOverlay button')).map(b => (b.textContent || '').trim()));
    r.h_scannerClosed = await page.evaluate(() => !document.getElementById('qrScannerOverlay'));
  } catch (e) { r.h_modal = false; r.h_modalErr = String(e); }
  await page.evaluate(() => {
    Html5Qrcode.prototype.start = window.__origStart;
    Html5Qrcode.prototype.stop = window.__origStop;
  });
  await sleep(400);

  // I: mobile viewport, no overflow
  await page.setViewport({ width: 390, height: 844 });
  await sleep(400);
  try { await waitCameraActive(page, 'I mobile', 30000); r.i_mobileOpen = true; }
  catch (e) { r.i_mobileOpen = false; }
  await sleep(500);
  r.i_overflow = await page.evaluate(() => {
    const sw = document.scrollingElement ? document.scrollingElement.scrollWidth : 0;
    return { scrollWidth: sw, viewport: 390, ok: sw <= 391 };
  });
  await page.evaluate(() => QRCodes.closeCameraScanner());
  await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  await sleep(500);

  r.errors = errors;
  r.pass = r.grantedOpen === true && r.f_afterNav && r.f_afterNav.overlay === false && r.f_afterNav.live === 0 &&
    r.g_reopen === true && r.h_modal === true && r.i_overflow.ok === true && leak === 0 &&
    r.cycles.every(c => c.ok) && errors.length === 0;
  results.granted = r;
  await ctxA.close();
}

// ---------- Context B: PROMPT (no override; fake-ui auto-approves) ----------
{
  const ctxB = await browser.createBrowserContext();
  const { page, errors } = await setupPage(ctxB);
  const r = {};
  try { await waitCameraActive(page, 'B prompt', 30000); r.cameraStarted = true; }
  catch (e) { r.cameraStarted = false; r.err = String(e); }
  r.permStateAfter = await page.evaluate(() => new Promise(res => {
    try { navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown')); } catch (e) { res('unknown'); }
  }));
  await page.evaluate(() => QRCodes.closeCameraScanner());
  await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  r.errors = errors;
  r.pass = r.cameraStarted === true && errors.length === 0;
  results.prompt = r;
  await ctxB.close();
}

// ---------- Context C: DENIED ----------
{
  const ctxC = await browser.createBrowserContext();
  await ctxC.overridePermissions(URL, []);
  const { page, errors } = await setupPage(ctxC);
  const r = {};
  r.permState = await page.evaluate(() => new Promise(res => {
    try { navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown')); } catch (e) { res('unknown'); }
  }));
  // Simulate a truly denied camera: reject getUserMedia (fake-ui otherwise auto-grants)
  await page.evaluate(() => {
    window.__gumCount = 0;
    const md = navigator.mediaDevices;
    md.getUserMedia = function() {
      window.__gumCount++;
      return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    };
  });
  await page.evaluate(() => QRCodes.openCameraScanner());
  try {
    await page.waitForFunction(() => {
      const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
      return st && /Camera permission is blocked/.test(st.textContent || '');
    }, { timeout: 20000 });
    r.deniedUIVisible = true;
  } catch (e) { r.deniedUIVisible = false; }
  await sleep(800);
  r.gumOnOpen = await page.evaluate(() => window.__gumCount);
  await sleep(2500);
  r.gumAfterWait = await page.evaluate(() => window.__gumCount);
  r.overlayStillPresent = await page.evaluate(() => !!document.getElementById('qrScannerOverlay'));
  // Try Again -> exactly one probe, denied UI returns
  await page.evaluate(() => {
    window.__capturedErr = null;
    const origStart = Html5Qrcode.prototype.start;
    Html5Qrcode.prototype.start = function() {
      const p = origStart.apply(this, arguments);
      if (p && p.catch) p.catch(e => { window.__capturedErr = { name: e && e.name, message: e && e.message, string: String(e) }; });
      return p;
    };
  });
  await page.evaluate(() => QRCodes.retryCameraScanner());
  await sleep(800);
  r.gumAfterTryAgain = await page.evaluate(() => window.__gumCount);
  r.capturedErr = await page.evaluate(() => window.__capturedErr);
  r.deniedAfterRetry = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st && /Camera permission is blocked/.test(st.textContent || '');
  });
  r.retryStatusText = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st ? (st.textContent || '').trim().slice(0, 200) : null;
  });
  await sleep(1500);
  r.gumAfterWait2 = await page.evaluate(() => window.__gumCount);
  r.deniedAfterWait2 = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st && /Camera permission is blocked/.test(st.textContent || '');
  });
  await page.evaluate(() => QRCodes.closeCameraScanner());
  await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  r.errors = errors;
  r.pass = r.deniedUIVisible === true && r.gumOnOpen === 0 && r.gumAfterWait === 0 &&
    r.overlayStillPresent === true && r.gumAfterTryAgain === 1 && r.gumAfterWait2 === 1 &&
    r.deniedAfterRetry === true && r.deniedAfterWait2 === true;
  results.denied = r;
  await ctxC.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
const overall = results.granted && results.granted.pass && results.prompt && results.prompt.pass && results.denied && results.denied.pass;
console.log('OVERALL: ' + (overall ? 'PASS' : 'FAIL'));
process.exit(overall ? 0 : 1);
