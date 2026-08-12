import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CF_PROD = 'https://pwi-maintanance.pages.dev/';
const GAS_PROD = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CREDS = { email: 'pakistanwire1@gmail.com', password: 'admin123' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};

async function gasCall(gas, action, token, data) {
  const res = await fetch(gas, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: token || '', data: data || {} })
  });
  return await res.json();
}

let machineCode = null;
{
  const login = await gasCall(GAS_PROD, 'login', '', { email: CREDS.email, password: CREDS.password });
  const token = (login.data && login.data.token) || login.token;
  if (!token) { console.log('FATAL: live GAS login failed: ' + JSON.stringify(login).slice(0, 200)); process.exit(1); }
  const mm = await gasCall(GAS_PROD, 'getMachines', token, { filter: 'all' });
  const recs = (mm.data && mm.data.machines) || (Array.isArray(mm.data) ? mm.data : []);
  machineCode = (recs[0] && (recs[0].MachineCode || recs[0].code)) || null;
  console.log('live machine code for scan test:', machineCode);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
});

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
const denyGumHook = () => {
  window.__gumCount = 0;
  const md = navigator.mediaDevices;
  md.getUserMedia = function() {
    window.__gumCount++;
    return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  };
};
const liveTracks = frame => frame.evaluate(() => {
  let n = 0;
  (window.__streams || []).forEach(s => (s.getTracks() || []).forEach(t => { if (t.readyState === 'live') n++; }));
  return n;
});
const gumCount = frame => frame.evaluate(() => window.__gumCount || 0);
const statusText = frame => frame.evaluate(() => {
  const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
  return st ? st.textContent.trim().slice(0, 120) : null;
});
async function waitSettled(frame, settleMs = 3500, maxMs = 30000) {
  await frame.evaluate(() => {
    if (window.__navSettleHook) return;
    window.__lastNavTime = Date.now();
    const record = () => { window.__lastNavTime = Date.now(); };
    const origShow = window.showApp;
    const origNav = window.navigateTo;
    window.showApp = function() { record(); return origShow.apply(this, arguments); };
    window.navigateTo = function() { record(); return origNav.apply(this, arguments); };
    window.__navSettleHook = true;
  });
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const last = await frame.evaluate(() => window.__lastNavTime || 0);
    if (Date.now() - last >= settleMs) return;
    await sleep(800);
  }
}
async function installStopWatch(frame) {
  await frame.evaluate(() => {
    if (window.__stopWatch) return;
    window.__stops = [];
    const orig = window.stopQRScanner;
    window.stopQRScanner = function() {
      window.__stops.push({ at: Date.now() });
      return orig.apply(this, arguments);
    };
    window.__stopWatch = true;
  });
}

async function openAndWait(frame, api, label) {
  await frame.evaluate(api.open);
  await frame.waitForFunction(() => {
    const ov = document.getElementById('qrScannerOverlay');
    if (!ov) return false;
    const v = ov.querySelector('video');
    return v && v.srcObject && v.srcObject.active;
  }, { timeout: 30000 });
  console.log(label + ': camera stream active');
  await sleep(600);
}
async function closeAndWait(frame, api, label) {
  await frame.evaluate(api.close);
  await frame.waitForFunction(() => !document.getElementById('qrScannerOverlay'), { timeout: 10000 });
  await sleep(500);
  const live = await liveTracks(frame);
  console.log(label + ': closed, live tracks=' + live);
  return live;
}
function makeApi(flavor) {
  if (flavor === 'cf') return { open: () => QRCodes.openCameraScanner(), close: () => QRCodes.closeCameraScanner(), retry: () => QRCodes.retryCameraScanner() };
  return { open: () => openQRScanner(), close: () => closeQRScanner(), retry: () => retryQRScanner() };
}
async function runGrantedLifecycle(flavor, name, frame) {
  const api = makeApi(flavor);
  const r = {};
  try {
    await frame.evaluate(grantHook);
    await openAndWait(frame, api, name + ' open');
    r.openActive = true;
    r.liveAfterFirstClose = await closeAndWait(frame, api, name + ' first close');
    r.reopenOk = true;
    for (let i = 0; i < 3; i++) {
      await openAndWait(frame, api, name + ' reopen ' + (i + 1));
      const live = await closeAndWait(frame, api, name + ' close ' + (i + 1));
      if (live !== 0) r.reopenOk = false;
    }
    await openAndWait(frame, api, name + ' nav open');
    await frame.evaluate(() => { try { if (typeof Router !== 'undefined' && Router.navigate) Router.navigate('assets'); else navigateTo('assets'); } catch (e) {} });
    await sleep(1200);
    r.navStop = { overlayGone: await frame.evaluate(() => !document.getElementById('qrScannerOverlay')), live: await liveTracks(frame) };
    r.passBase = r.openActive === true && r.liveAfterFirstClose === 0 && r.reopenOk === true && r.navStop.overlayGone === true && r.navStop.live === 0;
  } catch (e) { r.err = String(e); r.passBase = false; }
  return r;
}
async function runScanDetail(flavor, name, frame) {
  const r = {};
  const api = makeApi(flavor);
  try {
    if (flavor === 'gas') {
      const loaded = await frame.evaluate(() => {
        if (typeof Html5Qrcode !== 'undefined') return true;
        return new Promise(res => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
          s.onload = () => res(true);
          s.onerror = () => res(false);
          document.head.appendChild(s);
        });
      });
      r.libLoaded = loaded;
    } else {
      await openAndWait(frame, api, name + ' lib load');
      await closeAndWait(frame, api, name + ' lib close');
    }
    await frame.evaluate((code) => {
      Html5Qrcode.prototype.start = function() { const onSuccess = arguments[2]; setTimeout(() => { try { onSuccess(code); } catch (e) {} }, 300); return Promise.resolve(); };
      Html5Qrcode.prototype.stop = function() { return Promise.resolve(); };
    }, machineCode);
    await frame.evaluate(api.open);
    if (flavor === 'gas') {
      await sleep(1500);
      const passportOk = await frame.waitForFunction(() => {
        const p = document.getElementById('machinepassportPage');
        if (!p || !p.classList.contains('active')) return false;
        if (!window.passportData) return false;
        return true;
      }, { timeout: 30000 }).then(() => true).catch(() => false);
      r.passportLoaded = passportOk;
      r.passportMachineId = await frame.evaluate(() => sessionStorage.getItem('passportMachineId'));
      r.modal = false;
      r.modalClosed = true;
      r.scannerClosed = await frame.evaluate(() => !document.getElementById('qrScannerOverlay'));
      r.pass = r.passportLoaded === true && r.passportMachineId !== null && r.scannerClosed === true;
    } else {
      await sleep(1500);
      const modal = await frame.waitForFunction(() => !!document.getElementById('qrDetailOverlay'), { timeout: 20000 }).then(() => true).catch(() => false);
      r.modal = modal;
      if (modal) {
        await sleep(600);
        r.buttons = await frame.evaluate(() => Array.from(document.querySelectorAll('#qrDetailOverlay button')).map(b => (b.textContent || '').trim()));
        await frame.evaluate(() => { const b = document.getElementById('qrDetailCloseBtn') || document.querySelector('#qrDetailOverlay button'); if (b) b.click(); });
        await sleep(700);
        r.modalClosed = await frame.evaluate(() => !document.getElementById('qrDetailOverlay'));
      }
      r.scannerClosed = await frame.evaluate(() => !document.getElementById('qrScannerOverlay'));
      r.pass = r.modal === true && r.modalClosed === true && r.scannerClosed === true;
    }
  } catch (e) { r.err = String(e); r.pass = false; }
  return r;
}

// ============================================================
// GAS PRODUCTION
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions('https://script.googleusercontent.com', ['camera']);
  await ctx.overridePermissions('https://script.google.com', ['camera']);
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('c:' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('p:' + (e && (e.message || String(e)) || '').slice(0, 200)));
  const r = {};
  await page.goto(GAS_PROD, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  async function findAppFrame() {
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
      if (has) return f;
    }
    return null;
  }
  let app = await findAppFrame();
  while (!app) { await sleep(2000); app = await findAppFrame(); }
  await sleep(1500);
  if (await app.evaluate(() => !!document.getElementById('loginForm'))) {
    await app.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, CREDS.email, CREDS.password);
    while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false))) await sleep(1200);
  }
  await waitSettled(app);
  await sleep(600);
  r.dashboardLoaded = await app.evaluate(() => { const a = document.getElementById('appContainer'); return !!(a && a.innerHTML && a.innerHTML.trim().length > 50); });
  r.scannerApis = await app.evaluate(() => ({
    openQRScanner: typeof openQRScanner, closeQRScanner: typeof closeQRScanner,
    retryQRScanner: typeof retryQRScanner, stopQRScanner: typeof stopQRScanner, gen: typeof qrScannerGen
  }));
  r.iframe = await page.evaluate(() => { const f = document.getElementById('sandboxFrame'); return { allow: f ? f.getAttribute('allow') : null }; });

  // real camera attempt inside Google sandbox (platform-limited)
  const api = makeApi('gas');
  await app.evaluate(grantHook);
  await installStopWatch(app);
  await app.evaluate(api.open);
  await app.evaluate(() => { window.__stops = []; });
  await sleep(6000);
  r.cameraAttempt = {
    permState: await app.evaluate(() => new Promise(res => navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown')))),
    gum: await gumCount(app),
    status: await statusText(app),
    overlay: await app.evaluate(() => !!document.getElementById('qrScannerOverlay')),
    stopsInWindow: await app.evaluate(() => (window.__stops || []).length)
  };
  await app.evaluate(api.close).catch(() => {});
  await sleep(600);

  r.scan = await runScanDetail('gas', 'GAS-PROD', app);
  r.errors = errors;
  r.pass = r.dashboardLoaded === true &&
    r.scannerApis.openQRScanner === 'function' && r.scannerApis.retryQRScanner === 'function' && r.scannerApis.stopQRScanner === 'function' && r.scannerApis.gen === 'number' &&
    r.cameraAttempt.overlay === true && r.cameraAttempt.stopsInWindow === 0 && (r.cameraAttempt.status !== null || r.cameraAttempt.gum > 0) &&
    r.scan.pass === true;
  results['GAS-PROD'] = r;
  await ctx.close();
}

// ============================================================
// CLOUDFLARE PRODUCTION (full lifecycle)
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(CF_PROD, ['camera']);
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('c:' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('p:' + (e && (e.message || String(e)) || '').slice(0, 200)));
  const r = {};
  await page.goto(CF_PROD, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
  const loggedIn = await page.evaluate(() => { const a = document.getElementById('appContainer'); return !!(a && a.style.display !== 'none' && a.innerHTML.trim()); }).catch(() => false);
  if (!loggedIn) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, CREDS.email, CREDS.password);
    await page.waitForFunction(() => { const a = document.getElementById('appContainer'); return !!(a && a.style.display !== 'none' && a.innerHTML.trim()); }, { timeout: 60000 });
  }
  await sleep(1500);
  r.dashboardLoaded = await page.evaluate(() => { const a = document.getElementById('appContainer'); return !!(a && a.innerHTML && a.innerHTML.trim().length > 50); });
  r.scannerApis = await page.evaluate(() => ({
    openCameraScanner: typeof QRCodes.openCameraScanner, closeCameraScanner: typeof QRCodes.closeCameraScanner,
    retryCameraScanner: typeof QRCodes.retryCameraScanner, stopCameraScanner: typeof QRCodes.stopCameraScanner
  }));
  r.granted = await runGrantedLifecycle('cf', 'CF-PROD', page);
  r.scan = await runScanDetail('cf', 'CF-PROD', page);
  r.errors = errors;
  r.pass = r.dashboardLoaded === true &&
    r.scannerApis.openCameraScanner === 'function' && r.scannerApis.retryCameraScanner === 'function' && r.scannerApis.stopCameraScanner === 'function' &&
    r.granted.passBase === true && r.scan.pass === true;
  results['CF-PROD'] = r;
  await ctx.close();
}

// ============================================================
// DENIED scenarios
// ============================================================
async function deniedScenario(flavor, name, origin) {
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(origin, []);
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('c:' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('p:' + (e && (e.message || String(e)) || '').slice(0, 200)));
  const r = {};
  let frame = page;
  if (flavor === 'gas') {
    await page.goto(GAS_PROD, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    async function findAppFrame() {
      for (const f of page.frames()) {
        if (f === page.mainFrame()) continue;
        const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
        if (has) return f;
      }
      return null;
    }
    frame = await findAppFrame();
    while (!frame) { await sleep(2000); frame = await findAppFrame(); }
    await sleep(1500);
    if (await frame.evaluate(() => !!document.getElementById('loginForm'))) {
      await frame.evaluate((em, pw) => {
        document.getElementById('loginEmail').value = em;
        document.getElementById('loginPassword').value = pw;
        document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, CREDS.email, CREDS.password);
      while (!(await frame.evaluate(() => !!document.getElementById('appContainer')).catch(() => false))) await sleep(1200);
    }
    await waitSettled(frame);
    await sleep(600);
  } else {
    await page.goto(CF_PROD, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
    const loggedIn = await page.evaluate(() => { const a = document.getElementById('appContainer'); return !!(a && a.style.display !== 'none' && a.innerHTML.trim()); }).catch(() => false);
    if (!loggedIn) {
      await page.evaluate((em, pw) => {
        document.getElementById('loginEmail').value = em;
        document.getElementById('loginPassword').value = pw;
        document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, CREDS.email, CREDS.password);
      await page.waitForFunction(() => { const a = document.getElementById('appContainer'); return !!(a && a.style.display !== 'none' && a.innerHTML.trim()); }, { timeout: 60000 });
    }
    await sleep(1500);
  }
  const api = makeApi(flavor);
  r.permState = await frame.evaluate(() => new Promise(res => navigator.permissions.query({ name: 'camera' }).then(s => res(s.state)).catch(() => res('unknown'))));
  await frame.evaluate(denyGumHook);
  await frame.evaluate(api.open);
  try {
    await frame.waitForFunction(() => {
      const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
      return st && /Camera permission is blocked/.test(st.textContent || '');
    }, { timeout: 20000 });
    r.deniedUI = true;
  } catch (e) { r.deniedUI = false; r.err = String(e); }
  await sleep(800);
  r.gumOnOpen = await gumCount(frame);
  await frame.evaluate(api.retry);
  await sleep(1500);
  r.gumAfterRetry = await gumCount(frame);
  r.deniedAfterRetry = await frame.evaluate(() => {
    const st = document.querySelector('#qrScannerOverlay .qr-scanner-status');
    return !!(st && /Camera permission is blocked/.test(st.textContent || ''));
  });
  r.errors = errors;
  r.pass = r.permState === 'denied' && r.deniedUI === true && r.gumOnOpen === 0 && r.gumAfterRetry === 1 && r.deniedAfterRetry === true;
  results[name] = r;
  await ctx.close();
}

await deniedScenario('gas', 'GAS-PROD-DENIED', 'https://script.googleusercontent.com');
await deniedScenario('cf', 'CF-PROD-DENIED', CF_PROD);

// ============================================================
// BUSY (CF, granted)
// ============================================================
{
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(CF_PROD, ['camera']);
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('c:' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('p:' + (e && (e.message || String(e)) || '').slice(0, 200)));
  const r = {};
  await page.goto(CF_PROD, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
  const loggedIn = await page.evaluate(() => { const a = document.getElementById('appContainer'); return !!(a && a.style.display !== 'none' && a.innerHTML.trim()); }).catch(() => false);
  if (!loggedIn) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, CREDS.email, CREDS.password);
    await page.waitForFunction(() => { const a = document.getElementById('appContainer'); return !!(a && a.style.display !== 'none' && a.innerHTML.trim()); }, { timeout: 60000 });
  }
  await sleep(1500);
  await page.evaluate(() => {
    window.__gumCount = 0; window.__streams = [];
    const md = navigator.mediaDevices; const orig = md.getUserMedia.bind(md);
    md.getUserMedia = function(c) {
      window.__gumCount++;
      if (window.__gumCount === 1) return Promise.reject(new DOMException('Could not start video source', 'NotReadableError'));
      return orig(c).then(s => { window.__streams.push(s); return s; });
    };
  });
  await page.evaluate(() => QRCodes.openCameraScanner());
  try {
    await page.waitForFunction(() => {
      const ov = document.getElementById('qrScannerOverlay');
      if (!ov) return false;
      const v = ov.querySelector('video');
      return v && v.srcObject && v.srcObject.active;
    }, { timeout: 30000 });
    r.eventuallyOpen = true;
    await sleep(800);
  } catch (e) { r.eventuallyOpen = false; r.err = String(e); }
  r.gumCount = await gumCount(page);
  r.liveAfterClose = await closeAndWait(page, makeApi('cf'), 'CF-PROD busy close');
  r.errors = errors;
  r.pass = r.eventuallyOpen === true && r.gumCount === 2 && r.liveAfterClose === 0;
  results['CF-PROD-BUSY'] = r;
  await ctx.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
const pass = Object.values(results).every(r => r.pass === true);
console.log('OVERALL: ' + (pass ? 'PASS' : 'FAIL'));
process.exit(pass ? 0 : 1);
