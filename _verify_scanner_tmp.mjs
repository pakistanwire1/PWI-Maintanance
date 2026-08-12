import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = process.cwd();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CF_PORT = 8896;
const GAS_PORT = 8897;
const CF_URL = 'http://localhost:' + CF_PORT + '/';
const GAS_ORIGIN = 'http://localhost:' + GAS_PORT + '/';
const GAS_URL = GAS_ORIGIN + 'gas_shell_built.html';

function serve(port, root) {
  const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let p = path.resolve(root, (urlPath === '/' ? 'index.html' : urlPath).replace(/^\/+/, ''));
    if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(p, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

const cfServer = await serve(CF_PORT, path.join(ROOT, 'cloudflare'));
const gasServer = await serve(GAS_PORT, ROOT);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
});

const results = {};

// ---------- shared helpers ----------
const liveTracks = page => page.evaluate(() => {
  let n = 0;
  (window.__streams || []).forEach(s => {
    (s.getTracks() || []).forEach(t => { if (t.readyState === 'live') n++; });
  });
  return n;
});

const gumCount = page => page.evaluate(() => window.__gumCount);

async function waitCameraActiveCF(page, label, timeoutMs) {
  await page.evaluate(() => QRCodes.openCameraScanner());
  await page.waitForFunction(() => {
    const ov = document.getElementById('qrScannerOverlay');
    if (!ov) return false;
    const v = ov.querySelector('video');
    return v && v.srcObject && v.srcObject.active;
  }, { timeout: timeoutMs || 30000 });
  console.log(label + ': camera stream active');
  await sleep(600);
}

async function waitCameraClosedCF(page) {
  await page.evaluate(() => QRCodes.closeCameraScanner());
  await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  await sleep(500);
}

// ---------- Cloudflare mock ----------
function cfMockFor(action) {
  switch (action) {
    case 'getDashboardData': return { totalMachines: 1, runningMachines: 0, breakdownMachines: 0, idleMachines: 0 };
    case 'getQRStatistics': return { machineCount: 1, assetCount: 0, jobCardCount: 0, sparePartCount: 0 };
    case 'getQRModuleRecords': return [];
    case 'getMachineCascade': return { divisions: [], sections: [], departments: [], machines: [] };
    case 'getQRScanHistory': return { records: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
    case 'getQRScanStats': return { scansToday: 0, scansTotal: 0, recent: [] };
    case 'getNotifications': case 'getUserNotifications': case 'getDashboardNotifications': return { notifications: [] };
    case 'getActiveWorkOrders': return { count: 0 };
    case 'logQRScan': return { success: true };
    case 'getDepartmentList': case 'getSectionList': return [];
    case 'getMachines': return { machines: [], total: 0 };
    case 'getAssets': return { assets: [], total: 0 };
    case 'getBreakdownTypes': return [];
    case 'getMachinePassport': return { machineId: 'MC001', name: 'CNC Machine 1', status: 'Active' };
    case 'getTechnicians': return [];
    case 'getJobCards': return { jobCards: [], total: 0 };
    case 'scanQRCode': case 'scanBarcode': case 'getQRDetail':
      return { module: 'Machine', id: 'MC001', MachineID: 'MC001', name: 'CNC Machine 1', MachineName: 'CNC Machine 1', code: 'MC-001', MachineCode: 'MC-001', status: 'Active', Status: 'Active', department: 'Production', location: 'Plant A', criticality: 'High' };
    default: return {};
  }
}

async function cfSetup(context) {
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push((e && (e.message || String(e)) || '').slice(0, 300)));
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().includes('/api/exec')) {
      let payload = {};
      try { payload = JSON.parse(req.postData() || '{}'); } catch (e) {}
      req.respond({ status: 200, contentType: 'application/json', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, data: cfMockFor(payload.action || '') }) });
    } else { req.continue(); }
  });
  await page.goto(CF_URL, { waitUntil: 'networkidle2', timeout: 60000 });
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

const grantHook = () => {
  window.__gumCount = 0;
  window.__streams = [];
  const md = navigator.mediaDevices;
  const orig = md.getUserMedia.bind(md);
  md.getUserMedia = function(c) {
    window.__gumCount++;
    return orig(c).then(s => { window.__streams.push(s); return s; });
  };
};

// ============================================================
// CLOUDFLARE - A: GRANTED lifecycle (mobile viewport)
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(CF_URL, ['camera']);
  const { page, errors } = await cfSetup(ctx);
  const r = { cycles: [] };
  r.permState = await page.evaluate(() => new Promise(res => {
    navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown'));
  }));
  await page.evaluate(grantHook);

  await waitCameraActiveCF(page, 'CF-A open');
  r.openActive = true;
  await waitCameraClosedCF(page);
  r.tracksAfterFirstClose = await liveTracks(page);

  for (let i = 1; i <= 3; i++) {
    const before = await gumCount(page);
    try {
      await waitCameraActiveCF(page, 'CF-A cycle ' + i);
      const liveAfterOpen = await liveTracks(page);
      const gumAfterOpen = await gumCount(page);
      await waitCameraClosedCF(page);
      const liveAfterClose = await liveTracks(page);
      r.cycles.push({ i, ok: liveAfterClose === 0, gumDelta: gumAfterOpen - before, liveAfterOpen, liveAfterClose });
    } catch (e) {
      r.cycles.push({ i, ok: false, err: String(e) });
    }
  }

  // reopen while already open must be a no-op (no duplicate stream)
  await waitCameraActiveCF(page, 'CF-A dup-open');
  const streamCount1 = await page.evaluate(() => window.__streams.length);
  await page.evaluate(() => QRCodes.openCameraScanner());
  await sleep(600);
  const streamCount2 = await page.evaluate(() => window.__streams.length);
  r.dupOpenGuard = { streamCount1, streamCount2, ok: streamCount2 === streamCount1 };

  // navigation must stop the scanner + release camera
  await page.evaluate(() => Router.navigate('assets'));
  await sleep(1000);
  r.navStop = { overlayGone: await page.evaluate(() => !document.getElementById('qrScannerOverlay')), live: await liveTracks(page) };

  r.errors = errors;
  r.pass = r.permState === 'granted' && r.openActive === true && r.tracksAfterFirstClose === 0 &&
    r.cycles.every(c => c.ok) && r.dupOpenGuard.ok === true &&
    r.navStop.overlayGone === true && r.navStop.live === 0 && errors.length === 0;
  results['CF-A-GRANTED'] = r;
  await ctx.close();
}

// ============================================================
// CLOUDFLARE - B: DENIED
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(CF_URL, []);
  const { page, errors } = await cfSetup(ctx);
  const r = {};
  r.permState = await page.evaluate(() => new Promise(res => {
    navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown'));
  }));
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
  } catch (e) { r.deniedUIVisible = false; r.err = String(e); }
  await sleep(800);
  r.gumOnOpen = await gumCount(page);
  r.statusText = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st ? st.textContent.trim().slice(0, 120) : null;
  });
  r.tryAgainButton = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('#qrScannerOverlay button')).find(x => /Try Again/.test(x.textContent || ''));
    return !!b;
  });
  // Try Again -> exactly one probe
  await page.evaluate(() => QRCodes.retryCameraScanner());
  await sleep(1000);
  r.gumAfterTryAgain = await gumCount(page);
  r.deniedAfterRetry = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st && /Camera permission is blocked/.test(st.textContent || '');
  });
  await sleep(1500);
  r.gumAfterWait = await gumCount(page);
  r.deniedAfterWait = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st && /Camera permission is blocked/.test(st.textContent || '');
  });
  await waitCameraClosedCF(page);
  r.errors = errors;
  r.pass = r.permState === 'denied' && r.deniedUIVisible === true && r.tryAgainButton === true &&
    r.gumOnOpen === 0 && r.gumAfterTryAgain === 1 && r.gumAfterWait === 1 &&
    r.deniedAfterRetry === true && r.deniedAfterWait === true && errors.length === 0;
  results['CF-B-DENIED'] = r;
  await ctx.close();
}

// ============================================================
// CLOUDFLARE - C: BUSY (NotReadableError) -> single retry
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(CF_URL, ['camera']);
  const { page, errors } = await cfSetup(ctx);
  const r = {};
  await page.evaluate(() => {
    window.__gumCount = 0;
    window.__streams = [];
    const md = navigator.mediaDevices;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = function(c) {
      window.__gumCount++;
      if (window.__gumCount === 1) {
        return Promise.reject(new DOMException('Could not start video source', 'NotReadableError'));
      }
      return orig(c).then(s => { window.__streams.push(s); return s; });
    };
  });
  await page.evaluate(() => QRCodes.openCameraScanner());
  try {
    await page.waitForFunction(() => {
      const v = document.querySelector('#qrScannerOverlay video');
      return v && v.srcObject && v.srcObject.active;
    }, { timeout: 20000 });
    r.eventuallyOpen = true;
  } catch (e) { r.eventuallyOpen = false; r.err = String(e); }
  await sleep(1500);
  r.gumCount = await gumCount(page);
  r.gumAfterWait = await gumCount(page);
  r.liveWhileOpen = await liveTracks(page);
  await waitCameraClosedCF(page);
  r.liveAfterClose = await liveTracks(page);
  r.errors = errors;
  r.pass = r.eventuallyOpen === true && r.gumCount === 2 && r.gumAfterWait === 2 &&
    r.liveWhileOpen === 1 && r.liveAfterClose === 0 && errors.length === 0;
  results['CF-C-BUSY'] = r;
  await ctx.close();
}

// ============================================================
// CLOUDFLARE - D: SCAN -> detail modal -> actions
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(CF_URL, ['camera']);
  const { page, errors } = await cfSetup(ctx);
  const r = {};
  await waitCameraActiveCF(page, 'CF-D lib load');
  await waitCameraClosedCF(page);
  await page.evaluate(() => {
    Html5Qrcode.prototype.start = function() {
      const onSuccess = arguments[2];
      setTimeout(() => { try { onSuccess('QR-MC-001'); } catch (e) {} }, 300);
      return Promise.resolve();
    };
    Html5Qrcode.prototype.stop = function() { return Promise.resolve(); };
  });
  await page.evaluate(() => QRCodes.openCameraScanner());
  await sleep(1000);
  try {
    await page.waitForFunction(() => !!document.getElementById('qrDetailOverlay'), { timeout: 20000 });
    r.modal = true;
    await sleep(800);
    r.buttons = await page.evaluate(() => Array.from(document.querySelectorAll('#qrDetailOverlay button')).map(b => (b.textContent || '').trim()));
    // click "View Machine"
    const clicked = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('#qrDetailOverlay button')).find(x => /^View /.test((x.textContent || '').trim()));
      if (b) { b.click(); return true; }
      return false;
    });
    r.viewClicked = clicked;
    await sleep(1200);
    r.modalClosedAfterView = await page.evaluate(() => !document.getElementById('qrDetailOverlay'));
  } catch (e) { r.modal = false; r.err = String(e); }
  r.scannerClosedAfterScan = await page.evaluate(() => !document.getElementById('qrScannerOverlay'));
  r.errors = errors;
  r.pass = r.modal === true && r.viewClicked === true && r.modalClosedAfterView === true &&
    r.scannerClosedAfterScan === true && errors.length === 0;
  results['CF-D-SCAN'] = r;
  await ctx.close();
}

// ============================================================
// GAS - same scenarios (E: Cloudflare vs GAS parity)
// ============================================================
function gasRunMock() {
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  const handlers = {
    getQRDetail: function(qrContent) {
      if (String(qrContent).indexOf('JC') > -1) {
        return { module: 'Job Card', id: 'JC001', name: 'Repair Pump', code: 'JC-001', status: 'Open', priority: 'High', complaint: 'Pump leaking' };
      }
      return { module: 'Machine', id: 'MC001', name: 'CNC Machine 1', code: 'MC-001', status: 'Active', department: 'Production', location: 'Plant A', criticality: 'High' };
    },
    getDashboardData: function() { return { totalMachines: 1, runningMachines: 0, breakdownMachines: 0, idleMachines: 0 }; },
    getSidebarCounts: function() { return { machines: 1, assets: 0, jobcards: 0 }; },
    getNotifications: function() { return { notifications: [] }; },
    getMachineCascade: function() { return { divisions: [], sections: [], departments: [], machines: [] }; },
    getMachines: function() { return { machines: [], total: 0 }; },
    getAssets: function() { return []; },
    getDepartmentList: function() { return []; },
    getSectionList: function() { return []; },
    getBreakdownTypes: function() { return []; },
    getJobCards: function() { return []; },
    getTechnicians: function() { return []; },
    getMachinePassport: function() { return { machineId: 'MC001', name: 'CNC Machine 1', status: 'Active' }; },
    logUserLogout: function() {},
    validateAppSession: function() { return { valid: true }; }
  };
  window.__gasHandlers = handlers;
  window.__gasCall = function(name, args) {
    const h = (window.__gasHandlers || {})[name];
    let result = h ? h.apply(null, args) : { success: true };
    if (window.__gasOk) { const ok = window.__gasOk; window.__gasOk = null; ok(result); }
    return result;
  };
  const makeRun = () => {
    const run = {};
    const proxy = new Proxy(run, {
      get: function(t, prop) {
        if (prop === 'withSuccessHandler') return function(ok) { window.__gasOk = ok; return proxy; };
        if (prop === 'withFailureHandler') return function(er) { window.__gasErr = er; return proxy; };
        if (prop === 'then') return undefined;
        return function() { return window.__gasCall(prop, Array.from(arguments)); };
      }
    });
    return proxy;
  };
  window.google.script.run = makeRun();
}

async function gasSetup(context) {
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push((e && (e.message || String(e)) || '').slice(0, 300)));
  await page.evaluateOnNewDocument(gasRunMock);
  await page.goto(GAS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    currentUser = { name: 'Test Supervisor', email: 'supervisor@cmms.com', role: 'supervisor', isSystemAdmin: true };
    const lp = document.getElementById('loginPage'); if (lp) lp.style.display = 'none';
    const ac = document.getElementById('appContainer'); if (ac) ac.style.display = 'block';
  });
  await page.waitForFunction(() => typeof openQRScanner === 'function', { timeout: 30000 });
  errors.length = 0;
  return { page, errors };
}

async function waitCameraActiveGAS(page, label, timeoutMs) {
  await page.evaluate(() => openQRScanner());
  await page.waitForFunction(() => {
    const ov = document.getElementById('qrScannerOverlay');
    if (!ov) return false;
    const v = ov.querySelector('video');
    return v && v.srcObject && v.srcObject.active;
  }, { timeout: timeoutMs || 30000 });
  console.log(label + ': camera stream active');
  await sleep(600);
}

async function waitCameraClosedGAS(page) {
  await page.evaluate(() => closeQRScanner());
  await page.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  await sleep(500);
}

// GAS granted (A + nav-stop)
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(GAS_ORIGIN, ['camera']);
  const { page, errors } = await gasSetup(ctx);
    const r = { cycles: [] };
  await page.evaluate(grantHook);

  await waitCameraActiveGAS(page, 'GAS-A open');
  r.openActive = true;
  await waitCameraClosedGAS(page);
  r.tracksAfterFirstClose = await liveTracks(page);

  for (let i = 1; i <= 3; i++) {
    const before = await gumCount(page);
    try {
      await waitCameraActiveGAS(page, 'GAS-A cycle ' + i);
      const liveAfterOpen = await liveTracks(page);
      const gumAfterOpen = await gumCount(page);
      await waitCameraClosedGAS(page);
      const liveAfterClose = await liveTracks(page);
      r.cycles.push({ i, ok: liveAfterClose === 0, gumDelta: gumAfterOpen - before, liveAfterOpen, liveAfterClose });
    } catch (e) {
      r.cycles.push({ i, ok: false, err: String(e) });
    }
  }

  // navigation stops scanner (GAS navigateTo)
  await waitCameraActiveGAS(page, 'GAS-A nav open');
  await page.evaluate(() => navigateTo('assets'));
  await sleep(1000);
  r.navStop = { overlayGone: await page.evaluate(() => !document.getElementById('qrScannerOverlay')), live: await liveTracks(page) };

  r.errors = errors;
  r.pass = r.openActive === true && r.tracksAfterFirstClose === 0 &&
    r.cycles.every(c => c.ok) && r.navStop.overlayGone === true && r.navStop.live === 0 && errors.length === 0;
  results['GAS-A-GRANTED'] = r;
  await ctx.close();
}

// GAS denied (B)
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(GAS_ORIGIN, []);
  const { page, errors } = await gasSetup(ctx);
    const r = {};
  r.permState = await page.evaluate(() => new Promise(res => {
    navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown'));
  }));
  await page.evaluate(() => {
    window.__gumCount = 0;
    const md = navigator.mediaDevices;
    md.getUserMedia = function() {
      window.__gumCount++;
      return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    };
  });
  await page.evaluate(() => openQRScanner());
  try {
    await page.waitForFunction(() => {
      const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
      return st && /Camera permission is blocked/.test(st.textContent || '');
    }, { timeout: 20000 });
    r.deniedUIVisible = true;
  } catch (e) { r.deniedUIVisible = false; r.err = String(e); }
  await sleep(800);
  r.gumOnOpen = await gumCount(page);
  r.statusText = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st ? st.textContent.trim().slice(0, 120) : null;
  });
  await page.evaluate(() => retryQRScanner());
  await sleep(1000);
  r.gumAfterTryAgain = await gumCount(page);
  r.deniedAfterRetry = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st && /Camera permission is blocked/.test(st.textContent || '');
  });
  await sleep(1500);
  r.gumAfterWait = await gumCount(page);
  r.deniedAfterWait = await page.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return st && /Camera permission is blocked/.test(st.textContent || '');
  });
  await waitCameraClosedGAS(page);
  r.errors = errors;
  r.pass = r.permState === 'denied' && r.deniedUIVisible === true &&
    r.gumOnOpen === 0 && r.gumAfterTryAgain === 1 && r.gumAfterWait === 1 &&
    r.deniedAfterRetry === true && r.deniedAfterWait === true && errors.length === 0;
  results['GAS-B-DENIED'] = r;
  await ctx.close();
}

// GAS scan -> detail modal (D)
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(GAS_ORIGIN, ['camera']);
  const { page, errors } = await gasSetup(ctx);
  const r = {};
  await waitCameraActiveGAS(page, 'GAS-D lib load');
  await waitCameraClosedGAS(page);
  await page.evaluate(() => {
    Html5Qrcode.prototype.start = function() {
      const onSuccess = arguments[2];
      setTimeout(() => { try { onSuccess('QR-JC-001'); } catch (e) {} }, 300);
      return Promise.resolve();
    };
    Html5Qrcode.prototype.stop = function() { return Promise.resolve(); };
  });
  await page.evaluate(() => openQRScanner());
  await sleep(1000);
  try {
    await page.waitForFunction(() => !!document.getElementById('qrDetailOverlay'), { timeout: 20000 });
    r.modal = true;
    await sleep(800);
    r.buttons = await page.evaluate(() => Array.from(document.querySelectorAll('#qrDetailOverlay button')).map(b => (b.textContent || '').trim()));
    const clicked = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('#qrDetailOverlay button')).find(x => /View Job Cards/.test((x.textContent || '').trim()));
      if (b) { b.click(); return true; }
      return false;
    });
    r.viewClicked = clicked;
    await sleep(1200);
    r.modalClosedAfterView = await page.evaluate(() => !document.getElementById('qrDetailOverlay'));
    r.navigatedTo = await page.evaluate(() => currentPage);
  } catch (e) { r.modal = false; r.err = String(e); }
  r.scannerClosedAfterScan = await page.evaluate(() => !document.getElementById('qrScannerOverlay'));
  r.errors = errors;
  r.pass = r.modal === true && r.viewClicked === true && r.modalClosedAfterView === true &&
    r.navigatedTo === 'jobcards' && r.scannerClosedAfterScan === true && errors.length === 0;
  results['GAS-D-SCAN'] = r;
  await ctx.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
cfServer.close();
gasServer.close();
const pass = Object.values(results).every(r => r.pass === true);
console.log('OVERALL: ' + (pass ? 'PASS' : 'FAIL'));
process.exit(pass ? 0 : 1);
