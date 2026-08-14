import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'cloudflare');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8814;
const MOCK_DELAY = 120;
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};

const reqCounts = {};
function bump(action) { reqCounts[action] = (reqCounts[action] || 0) + 1; return reqCounts[action]; }
function count(action) { return reqCounts[action] || 0; }
function deltaBefore(action) { var before = count(action); return function() { return count(action) - before; }; }

function mockRows(n) {
  var rows = [];
  for (var i = 1; i <= n; i++) {
    rows.push({
      id: i, UserID: 'U' + i, Name: 'User ' + i,
      Email: 'user' + i + '@test.com', Role: 'User', EmployeeID: 'EMP' + i,
      Department: 'Dept ' + i, Designation: 'Engineer', Status: 'Active',
      SectionID: 'S' + i, Section: 'Section ' + i, SectionCode: 'SC' + i,
      Description: 'Desc ' + i, SundayOff: 'No', HoursPerDay: '8', DepartmentCount: 0,
      DepartmentID: 'D' + i, DepartmentCode: 'DC' + i, DepartmentHead: 'Head ' + i,
      MachineID: 'M' + i, MachineName: 'Machine ' + i,
      MachineCode: 'MC' + i, MachineNumber: 'MN' + i, Location: 'Loc ' + i,
      AssetID: 'A' + i, AssetName: 'Asset ' + i, AssetCode: 'AC' + i,
      TechnicianName: 'Tech ' + i, Mobile: '0300123456' + i, Skill: 'Mechanical', Shift: 'Morning',
      PartCode: 'PC' + i, PartName: 'Part ' + i, Category: 'Cat',
      Unit: 'Pcs', CurrentStock: 10, MinimumStock: 5, UnitCost: 100 + i,
      ItemCode: 'IC' + i, ItemName: 'Item ' + i, Quantity: 50,
      JobCardNo: 'JC' + i, Date: new Date().toISOString(),
      Complaint: 'Issue ' + i, Priority: 'High', Technician: 'Tech ' + i,
      AssignedTechnician: 'Tech ' + i, Machine: 'Machine ' + i,
      Title: 'Notif ' + i, Message: 'Message ' + i, Module: 'Module ' + i,
      ReadStatus: 'Unread', NotificationType: 'Alert', CreatedAt: new Date().toISOString(),
      LogID: 'L' + i, Action: 'Login', PerformedBy: 'User ' + i,
      Timestamp: new Date().toISOString(), Details: 'Detail ' + i,
      PMNumber: 'PM' + i, Frequency: 'Monthly', NextDueDate: new Date().toISOString(),
      LastDone: new Date().toISOString(), Compliant: 'Yes',
      StockID: 'ST' + i, TransactionType: 'IN', Quantity: i * 10,
      Reference: 'REF' + i, Notes: 'Note ' + i,
      GRN: 'GRN' + i, Vendor: 'Vendor ' + i, ReceivedDate: new Date().toISOString()
    });
  }
  return rows;
}

const ROWS = mockRows(8);
const ROWS_SECTIONS = mockRows(25);

function mockResponse(action, body) {
  bump(action);
  switch (action) {
    case 'getSectionList': return ROWS_SECTIONS;
    case 'getDepartmentList': return ROWS;
    case 'getMachines': return ROWS;
    case 'getTechnicians': return ROWS;
    case 'getAssets': return ROWS;
    case 'getUsers': return ROWS;
    case 'getSpareParts': return ROWS;
    case 'getJobCards': return ROWS;
    case 'getBreakdownHistory': return ROWS;
    case 'getPMRecords': return ROWS;
    case 'getReportData': return ROWS;
    case 'getNotifications': return ROWS;
    case 'getDashboardNotifications': return ROWS.slice(0, 3);
    case 'getSidebarCounts': return {};
    case 'getDashboardData':
      return { departments: [], month: [], status: [], totalJobs: 8, openJobs: 3, closedJobs: 5 };
    case 'getSettingsData': return { departments: [], settings: [] };
    case 'addSparePart': return { success: true };
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
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponse(action, parsed)));
      }, MOCK_DELAY);
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

const INIT_SCRIPT = function(fastSlideshow) {
  var o = window;
  o.__overlayShown = false;
  document.addEventListener('DOMContentLoaded', function() {
    if (fastSlideshow) {
      var style = document.createElement('style');
      style.textContent = '#welcomePage .ws-slide{animation-duration:0.01s !important;animation-iteration-count:1 !important}';
      document.head.appendChild(style);
    }
    var ov = document.getElementById('loadingOverlay');
    if (ov) {
      if (ov.classList.contains('show')) o.__overlayShown = true;
      var mo = new MutationObserver(function() {
        if (ov.classList.contains('show')) o.__overlayShown = true;
      });
      mo.observe(ov, { attributes: true, attributeFilter: ['class'] });
    }
  });
};

const ADMIN = { name: 'Test User', email: 'test@example.com', role: 'Administrator', isSystemAdmin: true };

async function setupPage(browser, opts) {
  var ctx = await browser.createBrowserContext();
  var page = await ctx.newPage();
  opts = opts || {};
  await page.evaluateOnNewDocument(INIT_SCRIPT, !!opts.fastSlideshow);
  if (opts.prelogin) {
    await page.evaluateOnNewDocument(function(u) {
      localStorage.setItem('cmms_welcomed', '1');
      localStorage.setItem('cmms_token', 'test_token_12345');
      localStorage.setItem('cmms_user', JSON.stringify(u));
    }, opts.prelogin);
  }
  await page.setViewport({ width: opts.width || 1440, height: opts.height || 900 });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + (err && err.message)));
  return { ctx, page, errors };
}

function navTiming(page, route, containerId) {
  return page.evaluate((r, cid) => new Promise(function(resolve) {
    var t0 = performance.now();
    var RouterObj = window.Router;
    RouterObj.navigate(r);
    var start = Date.now();
    var firstLen = -1;
    var minLen = -1;
    var sawBar = false;
    var overlayShownDuring = false;
    (function poll() {
      var el = document.getElementById(cid);
      var len = el ? el.innerHTML.length : 0;
      if (firstLen < 0) firstLen = len;
      if (minLen < 0 || len < minLen) minLen = len;
      var bar = document.getElementById('pageProgressBar');
      if (bar) sawBar = true;
      var ov = document.getElementById('loadingOverlay');
      if (ov && ov.classList.contains('show')) overlayShownDuring = true;
      if (el && len >= 30) {
        resolve({ ms: performance.now() - t0, len: len, firstLen: firstLen, minLen: minLen, sawBar: sawBar, overlayShownDuring: overlayShownDuring });
        return;
      }
      if (Date.now() - start > 8000) {
        resolve({ ms: performance.now() - t0, len: len, firstLen: firstLen, minLen: minLen, sawBar: sawBar, overlayShownDuring: overlayShownDuring });
        return;
      }
      setTimeout(poll, 10);
    })();
  }), route, containerId);
}

async function run() {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

  // ================= PHASE A: COLD BOOT (welcome is the splash) =================
  // No fast-slideshow override here: the welcome page must stay visible (a
  // completed slideshow auto-enters the app, which would hide it).
  var a = await setupPage(browser, { fastSlideshow: false });
  await a.page.goto('http://localhost:' + PORT + '/', { waitUntil: 'load', timeout: 30000 });
  await sleep(400);

  var rA = await a.page.evaluate(function() {
    var wp = document.getElementById('welcomePage');
    var ov = document.getElementById('loadingOverlay');
    var title = document.querySelector('#welcomePage .ws-co-primary');
    var bracket = document.querySelector('#welcomePage .ws-co-bracket');
    var subtitle = document.querySelector('#welcomePage .ws-subtitle');
    var wl = document.getElementById('wsLoadingText');
    return {
      welcomeVisible: !!wp && getComputedStyle(wp).display !== 'none',
      overlayShown: window.__overlayShown || false,
      overlayHasShow: !!ov && ov.classList.contains('show'),
      titleText: title ? title.textContent.trim() : '',
      bracketText: bracket ? bracket.textContent.trim() : '',
      subtitleText: subtitle ? subtitle.textContent.trim() : '',
      titleSize: title ? getComputedStyle(title).fontSize : '',
      bracketSize: bracket ? getComputedStyle(bracket).fontSize : '',
      stageText: wl ? wl.textContent.trim() : '',
      hasProgress: !!document.getElementById('wsProgressBar'),
      appVisible: getComputedStyle(document.getElementById('appContainer')).display !== 'none'
    };
  });
  check('A1. Cold boot: welcome page is the splash (no full-screen overlay)', rA.welcomeVisible && !rA.overlayShown && !rA.overlayHasShow, 'overlayShown=' + rA.overlayShown);
  check('A2. Splash identity text (company + tagline)', rA.titleText === 'Pakistan Wires Industries' && rA.bracketText === '(Private) Limited' && rA.subtitleText.toLowerCase().indexOf('cmms maintenance') >= 0, JSON.stringify({ t: rA.titleText, b: rA.bracketText }));
  check('A3. Welcome company title enlarged (+25% -> 38px)', rA.titleSize === '38px', 'size=' + rA.titleSize);
  check('A4. Bracket enlarged (14px -> 17px)', rA.bracketSize === '17px', 'size=' + rA.bracketSize);
  check('A5. Honest static stage text (no fake rotating messages)', rA.stageText === 'Preparing your workspace', 'text=' + rA.stageText);
  check('A6. Welcome progress bar present', rA.hasProgress && rA.welcomeVisible, '');

  // Mobile sizes on the welcome page (same clean context, reload)
  await a.page.setViewport({ width: 390, height: 844 });
  await a.page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(400);
  var rAm = await a.page.evaluate(function() {
    var t = document.querySelector('#welcomePage .ws-co-primary');
    var b = document.querySelector('#welcomePage .ws-co-bracket');
    return { titleSize: t ? getComputedStyle(t).fontSize : '', bracketSize: b ? getComputedStyle(b).fontSize : '' };
  });
  check('A7. Mobile welcome title 28px / bracket 15px', rAm.titleSize === '28px' && rAm.bracketSize === '15px', 'title=' + rAm.titleSize + ' bracket=' + rAm.bracketSize);
  await a.ctx.close();

  // ================= PHASE B: WARM BOOT (splash overlay during bootstrap) =================
  var b = await setupPage(browser, { prelogin: ADMIN });
  await b.page.goto('http://localhost:' + PORT + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  var rB = await b.page.evaluate(function() {
    var st = document.getElementById('loadingStage');
    var pr = document.getElementById('loadingProgress');
    var tt = document.querySelector('.splash-title');
    return {
      overlayShown: window.__overlayShown || false,
      stageText: st ? st.textContent : '',
      hasProgress: !!pr,
      splashTitle: tt ? tt.textContent.trim() : ''
    };
  });
  check('B1. Warm boot shows professional splash overlay', rB.overlayShown && rB.hasProgress && rB.splashTitle === 'Pakistan Wires Industries', JSON.stringify(rB));
  await b.page.waitForFunction(function() {
    var o = document.getElementById('loadingOverlay');
    return !o || !o.classList.contains('show');
  }, { timeout: 10000 }).catch(function() {});
  await sleep(600);
  var rB2 = await b.page.evaluate(function() {
    var o = document.getElementById('loadingOverlay');
    return {
      hasShow: !!o && o.classList.contains('show'),
      stage: (document.getElementById('loadingStage') || {}).textContent,
      appVisible: getComputedStyle(document.getElementById('appContainer')).display !== 'none',
      cur: Router.current
    };
  });
  check('B2. Overlay hides after boot; app rendered', !rB2.hasShow && rB2.appVisible, JSON.stringify(rB2));

  // ================= PHASE C: NAVIGATION SEMANTICS =================
  const routes = [
    { route: 'sections',     container: 'sectionsTableContainer',     dataAction: 'getSectionList' },
    { route: 'users',        container: 'usersTableContainer',        dataAction: 'getUsers' },
    { route: 'spareparts',   container: 'spTableContainer',           dataAction: 'getSpareParts' },
    { route: 'jobcards',     container: 'jcTableContainer',           dataAction: 'getJobCards' },
    { route: 'machines',     container: 'machinesTableContainer',     dataAction: 'getMachines' }
  ];

  var coldTimings = {};
  for (const r of routes) {
    const d = deltaBefore(r.dataAction);
    const t = await navTiming(b.page, r.route, r.container);
    await sleep(120);
    const net = d();
    coldTimings[r.route] = { ms: t.ms, net: net, sawBar: t.sawBar };
    check('C1. [' + r.route + '] first load fetches via network (local bar)', net === 1 && t.sawBar && !t.overlayShownDuring, 'net=' + net + ' ms=' + t.ms.toFixed(1) + ' bar=' + t.sawBar);
  }

  // Repeated navigation: must reuse cache, render instantly, no loader
  var warmTimings = {};
  for (const r of routes) {
    const d = deltaBefore(r.dataAction);
    const t = await navTiming(b.page, r.route, r.container);
    await sleep(80);
    const net = d();
    warmTimings[r.route] = { ms: t.ms, net: net, sawBar: t.sawBar };
    check('C2. [' + r.route + '] repeated nav reuses cache (0 network, no bar)', net === 0 && !t.sawBar && !t.overlayShownDuring, 'net=' + net + ' ms=' + t.ms.toFixed(1) + ' bar=' + t.sawBar);
    check('C3. [' + r.route + '] cached render is fast (< mock network delay)', t.ms < MOCK_DELAY, 'ms=' + t.ms.toFixed(1) + ' (network mock=' + MOCK_DELAY + 'ms)');
  }
  console.log('      [perf] cold: ' + JSON.stringify(coldTimings));
  console.log('      [perf] warm: ' + JSON.stringify(warmTimings));

  // ================= PHASE C5: PAGINATION STILL WORKS FROM CACHED DATA =================
  await b.page.evaluate(function() { window.API.clearAllCaches(); });
  await navTiming(b.page, 'sections', 'sectionsTableContainer');
  await sleep(150);
  var pag1 = await b.page.evaluate(function() {
    var el = document.getElementById('sectionsTableContainer');
    var html = el ? el.innerHTML : '';
    var nxt = el ? el.querySelector('button[onclick*="nextPage"], button[onclick*="Next"]') : null;
    var btnHtml = el ? el.querySelectorAll('button').length : 0;
    return { hasPagInfo: html.indexOf('pagination-info') >= 0, showing: (html.match(/Showing\s+[\d\-]+\s+of\s+\d+/) || [''])[0], hasNext: html.indexOf('nextPage') >= 0, btnCount: btnHtml };
  });
  check('C4. Multi-page table paginates from fetched data', pag1.hasPagInfo && pag1.showing === 'Showing 1-10 of 25' && pag1.hasNext, JSON.stringify(pag1));

  await b.page.evaluate(function() { Section.nextPage(); });
  await sleep(150);
  var pag2 = await b.page.evaluate(function() {
    var html = document.getElementById('sectionsTableContainer').innerHTML;
    return { showing: (html.match(/Showing\s+[\d\-]+\s+of\s+\d+/) || [''])[0], prevDisabled: html.indexOf('disabled onclick="Section.prevPage') >= 0, nextDisabled: html.indexOf('disabled onclick="Section.nextPage') >= 0 };
  });
  check('C5. Next page renders from cache (11-20 of 25)', pag2.showing === 'Showing 11-20 of 25' && !pag2.prevDisabled && !pag2.nextDisabled, JSON.stringify(pag2));

  const dSect = deltaBefore('getSectionList');
  await navTiming(b.page, 'users', 'usersTableContainer');
  await sleep(60);
  await navTiming(b.page, 'sections', 'sectionsTableContainer');
  await sleep(120);
  check('C6. Returning to paginated page uses cache (no refetch)', dSect() === 0, 'sections net=' + dSect());

  // ================= PHASE D: MUTATION -> SURGICAL INVALIDATION =================
  // Repopulate caches after the Phase C5 full clear so the invalidation scope
  // can actually be observed.
  await navTiming(b.page, 'spareparts', 'spTableContainer');
  await sleep(100);
  await navTiming(b.page, 'users', 'usersTableContainer');
  await sleep(100);
  await navTiming(b.page, 'sections', 'sectionsTableContainer');
  await sleep(100);

  var pre = await b.page.evaluate(function() {
    function freshAll(ds) {
      var keys = window.CMMS.cache.datasetKeys(ds);
      return keys.every(function(k) { return window.CMMS.cache.isFresh(k); });
    }
    return {
      masterVer: window.API.masterCacheVersion(),
      usersFresh: freshAll('users'),
      spareFresh: freshAll('spareparts'),
      masterFresh: freshAll('master'),
      cacheGen: window.CMMS.cache.generation()
    };
  });
  check('D1. Pre-mutation caches fresh', pre.usersFresh && pre.spareFresh && pre.masterFresh, JSON.stringify(pre));

  const dUsers = deltaBefore('getUsers');
  const dSpare = deltaBefore('getSpareParts');
  const dMaster = deltaBefore('getSectionList');
  await b.page.evaluate(function() {
    return window.API.post('addSparePart', { data: { PartCode: 'SPX', PartName: 'Test Part', Category: 'C', Unit: 'Pcs', CurrentStock: 5, MinimumStock: 2 } });
  });
  await sleep(300);

  var post = await b.page.evaluate(function() {
    function freshAll(ds) {
      var keys = window.CMMS.cache.datasetKeys(ds);
      return keys.length === 0 ? 'no-keys' : keys.every(function(k) { return window.CMMS.cache.isFresh(k); });
    }
    return {
      masterVer: window.API.masterCacheVersion(),
      usersFresh: freshAll('users'),
      spareFresh: freshAll('spareparts'),
      masterFresh: freshAll('master')
    };
  });
  check('D2. addSparePart invalidated only spareparts (users+master untouched)', post.spareFresh === false && post.usersFresh === true && post.masterFresh === true, JSON.stringify(post));
  check('D3. masterCacheVersion not bumped by surgical mutation', post.masterVer === pre.masterVer, 'v=' + pre.masterVer + '->' + post.masterVer);

  const tSpareAfter = await navTiming(b.page, 'spareparts', 'spTableContainer');
  await sleep(80);
  check('D4. Invalidated dataset re-fetched on next nav', dSpare() === 1 && !tSpareAfter.overlayShownDuring, 'spareparts net=' + dSpare());

  const tUsersAfter = await navTiming(b.page, 'users', 'usersTableContainer');
  await sleep(80);
  check('D5. Unrelated dataset stays cached (no refetch)', dUsers() === 0 && !tUsersAfter.overlayShownDuring, 'users net=' + dUsers());
  check('D6. Master dataset stays cached after sparepart mutation', dMaster() === 0, 'sections net=' + dMaster());

  // ================= PHASE E: STRESS (repeated rapid navigation) =================
  var stressOk = true;
  var stressDetail = [];
  for (var pass = 0; pass < 2; pass++) {
    for (const r of routes) {
      const t = await navTiming(b.page, r.route, r.container);
      await sleep(20);
      if (t.overlayShownDuring) stressOk = false;
      if (t.len < 30) stressOk = false;
    }
  }
  check('E1. Stress: 10 rapid navigations render with no full-screen loader', stressOk, stressDetail.join(', '));

  // ================= PHASE F: MOBILE =================
  await b.page.setViewport({ width: 390, height: 844 });
  var m1 = await navTiming(b.page, 'sections', 'sectionsTableContainer');
  await sleep(50);
  var m2 = await navTiming(b.page, 'users', 'usersTableContainer');
  await sleep(80);
  var m3 = await navTiming(b.page, 'sections', 'sectionsTableContainer');
  await sleep(80);
  var rF = await b.page.evaluate(function() {
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      appVisible: getComputedStyle(document.getElementById('appContainer')).display !== 'none'
    };
  });
  check('F1. Mobile: navigation works without full-screen loader', !m1.overlayShownDuring && !m2.overlayShownDuring && !m3.overlayShownDuring, JSON.stringify({ m1: m1.ms.toFixed(1), m2: m2.ms.toFixed(1) }));
  check('F2. Mobile: no horizontal overflow', rF.overflow <= 2, 'overflow=' + rF.overflow);
  check('F3. Mobile: repeated nav still reuses cache', m3.ms < MOCK_DELAY, 'ms=' + m3.ms.toFixed(1));

  // ================= ERRORS =================
  await sleep(300);
  const realErrors = b.errors.filter(function(e) {
    return e.indexOf('favicon') < 0 && e.indexOf('Failed to load resource') < 0 && e.indexOf('net::ERR_') < 0;
  });
  check('G1. No console/page errors during run', realErrors.length === 0, 'errors=' + JSON.stringify(realErrors.slice(0, 8)));

  await browser.close();
  server.close();

  const failed = results.filter(function(r) { return !r.pass; });
  console.log('\n===== NAVIGATION / PERFORMANCE VERIFICATION SUMMARY =====');
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
