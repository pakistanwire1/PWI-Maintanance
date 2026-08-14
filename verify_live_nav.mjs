import puppeteer from 'puppeteer-core';

const CF = 'https://pwi-maintanance.pages.dev/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ADMIN = { email: 'pakistanwire1@gmail.com', password: 'admin123' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}

const BOOT_OBS = function() {
  window.__boot = { shown: false, bar: false, width: '', stage: '', title: '' };
  document.addEventListener('DOMContentLoaded', function() {
    var ov = document.getElementById('loadingOverlay');
    var tt = document.querySelector('.splash-title');
    if (tt) window.__boot.title = tt.textContent.trim();
    function sample() {
      var bar = document.getElementById('loadingProgress');
      var st = document.getElementById('loadingStage');
      if (bar) { window.__boot.bar = true; window.__boot.width = bar.style.width; window.__boot.cls = bar.className; }
      if (st) window.__boot.stage = st.textContent;
      if (ov && ov.classList.contains('show')) window.__boot.shown = true;
    }
    sample();
    if (ov) {
      var mo = new MutationObserver(sample);
      mo.observe(ov, { attributes: true, attributeFilter: ['class'] });
      mo.observe(ov, { childList: true, subtree: true });
    }
  });
};

function attachCounters(page, errors, filterDenied) {
  const counts = {};
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/api\/exec|macros\/s/.test(req.url())) {
      try {
        const j = JSON.parse(req.postData() || '{}');
        const a = j.action || '';
        if (a) counts[a] = (counts[a] || 0) + 1;
      } catch (e) {}
    }
  });
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!/favicon|Failed to load resource|gstatic|net::ERR_/.test(t)) {
        if (!(filterDenied && /denied|permission|forbidden|403/i.test(t))) errors.push('console: ' + t);
      }
    }
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String((e && e.message) || e)));
  return counts;
}

async function newPage(browser, opts) {
  opts = opts || {};
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  await page.setViewport({ width: opts.width || 1440, height: opts.height || 900 });
  if (opts.observer) await page.evaluateOnNewDocument(BOOT_OBS);
  const counts = attachCounters(page, errors, opts.filterDenied);
  return { ctx, page, counts, errors };
}

async function gotoLoad(page) {
  await page.goto(CF, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await sleep(2500);
}

async function waitUntil(page, fn, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (await page.evaluate(fn)) return true; } catch (e) {}
    await sleep(700);
  }
  return false;
}

async function login(page, u) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const email = await page.$('#loginEmail');
      if (email) {
        await page.evaluate(() => { const f = document.getElementById('loginEmail'); if (f) f.value = ''; });
        await page.type('#loginEmail', u.email);
        await page.type('#loginPassword', u.password);
        await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      } else {
        await page.evaluate(() => { const f = document.getElementById('loginForm'); if (f) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
      }
    } catch (e) {}
    await sleep(8000);
    const ok = await page.evaluate(() => { try { return !!localStorage.getItem('cmms_token') && !!JSON.parse(localStorage.getItem('cmms_user')).email; } catch (e) { return false; } }).catch(() => false);
    if (ok) break;
  }
  await waitUntil(page, () => { const ac = document.getElementById('appContainer'); return ac && getComputedStyle(ac).display !== 'none'; }, 90000);
  await sleep(2500);
}

function snapshot(counts) { return Object.assign({}, counts); }
function delta(before, after, action) { return (after[action] || 0) - (before[action] || 0); }
function deltaAll(before, after) {
  const keys = new Set(Object.keys(before).concat(Object.keys(after)));
  const out = {};
  for (const k of keys) { const d = (after[k] || 0) - (before[k] || 0); if (d !== 0) out[k] = d; }
  return out;
}

/* Navigate and wait until the page's data signal is ready (or the local loader
 * cycle completed). Measures the local progress bar + full-screen overlay. */
function navTiming(page, route, readyExpr) {
  return page.evaluate((r, ready) => new Promise(function(resolve) {
    const t0 = performance.now();
    let barSeen = false, barNow = false, overlayDuring = false;
    try {
      window.__barCycleDone = false;
      const mo = new MutationObserver(function() {
        if (document.getElementById('pageProgressBar')) { barSeen = true; barNow = true; }
        else { barNow = false; if (barSeen && !barNow) window.__barCycleDone = true; }
        const ov = document.getElementById('loadingOverlay');
        if (ov && ov.classList.contains('show')) overlayDuring = true;
      });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      window.Router.navigate(r);
    } catch (e) {}
    const start = Date.now();
    (function poll() {
      let done = false;
      try { done = eval(ready); } catch (e) {}
      if (done || window.__barCycleDone) {
        resolve({ ms: performance.now() - t0, barSeen, barCycleDone: !!window.__barCycleDone, overlayDuring, ok: done || !!window.__barCycleDone });
        return;
      }
      if (Date.now() - start > 30000) { resolve({ ms: performance.now() - t0, barSeen, barCycleDone: !!window.__barCycleDone, overlayDuring, ok: false }); return; }
      setTimeout(poll, 60);
    })();
  }), route, readyExpr);
}

const READY_DASHBOARD = "(function(){var e=document.getElementById('pageContent');return !!e&&e.textContent.length>100;})()";
const READY_TABLE = (id) => "(function(){var e=document.getElementById('" + id + "');return !!e&&e.textContent.length>=5;})()";
const READY_SETTINGS = "(document.querySelectorAll('#deptList .list-item').length>0)||(window.__barCycleDone===true)";

async function measurePair(ctx, label, route, readySel, actions) {
  const page = ctx.page;
  const coldBefore = snapshot(ctx.counts);
  await page.evaluate(() => { try { window.CMMS.cache.clear(); } catch (e) {} });
  const cold = await navTiming(page, route, readySel);
  await sleep(700);
  const coldAfter = snapshot(ctx.counts);
  const coldDeltas = deltaAll(coldBefore, coldAfter);

  const warmBefore = snapshot(ctx.counts);
  const warm = await navTiming(page, route, readySel);
  await sleep(700);
  const warmAfter = snapshot(ctx.counts);
  const warmDeltas = deltaAll(warmBefore, warmAfter);

  const key = route + '[' + label + ']';
  const coldFetched = actions.some((a) => delta(coldBefore, coldAfter, a) >= 1);
  check('L10_fetch_' + key, coldFetched && !cold.overlayDuring, label + ' cold -> fetched (' + JSON.stringify(coldDeltas) + ') overlay=' + cold.overlayDuring);
  const slowEnough = cold.ms >= 500;
  check('L14_bar_' + key, !slowEnough || cold.barSeen, label + ' cold ' + cold.ms.toFixed(0) + 'ms -> bar=' + cold.barSeen + (slowEnough ? ' (slow load, bar required)' : ' (fast load, no bar needed)'));
  const warmPrimaryZero = actions.every((a) => delta(warmBefore, warmAfter, a) === 0);
  check('L12_zero_api_' + key, warmPrimaryZero, label + ' warm cached -> primary net=0, deltas=' + JSON.stringify(warmDeltas));
  check('L13_no_overlay_' + key, !warm.overlayDuring, label + ' warm -> no full-screen overlay');
  check('L14_no_bar_' + key, !warm.barSeen, label + ' warm -> no loader flash (bar=' + warm.barSeen + ')');
  if (cold.ms >= 500) {
    check('L3fast_' + key, warm.ms < cold.ms, label + ' warm ' + warm.ms.toFixed(0) + 'ms < cold ' + cold.ms.toFixed(0) + 'ms');
  } else {
    check('L3fast_' + key, warm.ms <= cold.ms + 50, label + ' warm ' + warm.ms.toFixed(0) + 'ms ~= cold ' + cold.ms.toFixed(0) + 'ms (both fast)');
  }
  return { cold, coldDeltas, warm, warmDeltas };
}

/* Dashboard is loaded cold at login (module keeps state), so measure warm-only. */
async function measureWarmOnly(ctx, label, route, readyExpr, actions) {
  const page = ctx.page;
  const before = snapshot(ctx.counts);
  const warm = await navTiming(page, route, readyExpr);
  await sleep(700);
  const after = snapshot(ctx.counts);
  const deltas = deltaAll(before, after);
  const key = route + '[' + label + ']';
  const primaryZero = actions.every((a) => delta(before, after, a) === 0);
  check('L12_zero_api_' + key, primaryZero, label + ' warm cached -> primary net=0, deltas=' + JSON.stringify(deltas));
  check('L13_no_overlay_' + key, !warm.overlayDuring, label + ' warm -> no full-screen overlay');
  check('L14_no_bar_' + key, !warm.barSeen, label + ' warm -> no loader flash (bar=' + warm.barSeen + ')');
  return { warm, deltas };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// ================= 1. HEALTH / API / SW =================
const c = await newPage(browser, { observer: true });
await gotoLoad(c.page);
const health = await c.page.evaluate(async () => {
  const out = { diag: null, swVersion: '' };
  try { out.diag = await API.diag(); } catch (e) { out.diag = 'diag-error: ' + e.message; }
  try { out.swVersion = (await caches.keys()).filter((k) => k.indexOf('cmms-v') === 0).join(','); } catch (e) {}
  return out;
});
check('L1_health_diag', !!health.diag && String(health.diag).indexOf('diag-error') === -1, 'API.diag()=' + JSON.stringify(health.diag));
check('L21_sw_cache_version', health.swVersion === 'cmms-v54', 'active cache versions=' + health.swVersion);

const swText = await c.page.evaluate(async () => {
  try {
    const r = await fetch('/sw.js?cb=' + Date.now(), { cache: 'no-store' });
    const t = await r.text();
    return { hasV54: t.indexOf('cmms-v54') >= 0, hasCacheJs: t.indexOf('/js/core/cache.js') >= 0 };
  } catch (e) { return { err: e.message }; }
});
check('L21_sw_served', swText.hasV54 && swText.hasCacheJs, 'sw.js served ' + JSON.stringify(swText));

// ================= 2. COLD BOOT =================
const cold = await c.page.evaluate(() => {
  const wp = document.getElementById('welcomePage');
  const ov = document.getElementById('loadingOverlay');
  const t = document.querySelector('#welcomePage .ws-co-primary');
  const b = document.querySelector('#welcomePage .ws-co-bracket');
  return {
    welcomeVisible: !!wp && getComputedStyle(wp).display !== 'none',
    overlayShow: !!ov && ov.classList.contains('show'),
    titleSize: t ? getComputedStyle(t).fontSize : '',
    bracketSize: b ? getComputedStyle(b).fontSize : '',
    stage: (document.getElementById('wsLoadingText') || {}).textContent || '',
    hasProgress: !!document.getElementById('wsProgressBar'),
    welcomeLabel: (document.querySelector('#welcomePage .ws-welcome-label') || {}).textContent || ''
  };
});
check('L2_cold_welcome_splash', cold.welcomeVisible && !cold.overlayShow, 'welcome visible=' + cold.welcomeVisible + ' overlay=' + cold.overlayShow);
check('L19_title_25pct_larger', cold.titleSize === '38px', 'ws-co-primary=' + cold.titleSize);
check('L19_bracket_17', cold.bracketSize === '17px', 'ws-co-bracket=' + cold.bracketSize);
check('L5_no_fake_stage', cold.stage === 'Preparing your workspace', 'stage=' + JSON.stringify(cold.stage));
check('L20_welcome_progress', cold.hasProgress && cold.welcomeLabel === 'WELCOME TO', 'progress bar + label present');

// ================= 3. WARM BOOT =================
await c.page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await c.page.reload({ waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(500);
const bootMid = await c.page.evaluate(() => ({ shown: window.__boot.shown, bar: window.__boot.bar, title: window.__boot.title }));
check('L3_warm_boot_splash', bootMid.shown && bootMid.bar && bootMid.title === 'Pakistan Wires Industries', 'overlay shown=' + bootMid.shown + ' bar=' + bootMid.bar + ' title=' + bootMid.title);
await waitUntil(c.page, () => { const o = document.getElementById('loadingOverlay'); return !o || !o.classList.contains('show'); }, 20000);
await sleep(700);
const bootEnd = await c.page.evaluate(() => {
  const o = document.getElementById('loadingOverlay');
  const bar = document.getElementById('loadingProgress');
  return { hasShow: !!o && o.classList.contains('show'), barWidth: bar ? bar.style.width : '', barCls: bar ? bar.className : '', loginVisible: getComputedStyle(document.getElementById('loginPage')).display !== 'none' };
});
check('L3_overlay_hides_after_boot', !bootEnd.hasShow, 'overlay hidden after boot');
check('L20_progress_line_done', bootEnd.barWidth === '100%' || bootEnd.barCls.indexOf('determinate') >= 0, 'bar ' + bootEnd.barWidth + ' class=' + bootEnd.barCls);
check('L3_login_after_warm_boot', bootEnd.loginVisible, 'login page shown after warm boot (no session)');

// ================= 4. LOGIN + NAV COLD/WARM PAIRS =================
await login(c.page, ADMIN);
let loggedIn = false;
for (let i = 0; i < 10 && !loggedIn; i++) {
  try { loggedIn = await c.page.evaluate(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }); } catch (e) {}
  if (!loggedIn) await sleep(1000);
}
check('L_login_admin', loggedIn, 'admin session established');
await sleep(1000);

// Dashboard was loaded cold during login -> measure warm-only (must reuse cache).
await measureWarmOnly(c, 'Dashboard', 'dashboard', READY_DASHBOARD, ['getDashboardData']);

const pairs = [
  { label: 'Inventory', route: 'inventory', sel: READY_TABLE('invTableContainer'), actions: ['getAllTransactions', 'getSpareParts', 'getInventoryDashboardData'] },
  { label: 'Job Cards', route: 'jobcards', sel: READY_TABLE('jcTableContainer'), actions: ['getJobCards'] },
  { label: 'Breakdown', route: 'breakdown', sel: READY_TABLE('breakdownTableContainer'), actions: ['getBreakdownHistory'] },
  { label: 'Users', route: 'users', sel: READY_TABLE('usersTableContainer'), actions: ['getUsers'] },
  { label: 'Settings', route: 'settings', sel: READY_SETTINGS, actions: ['getSettingsData'] }
];

const timing = {};
for (const p of pairs) {
  timing[p.route] = await measurePair(c, p.label, p.route, p.sel, p.actions);
}
console.log('[live timings]');
for (const r of Object.keys(timing)) {
  const t = timing[r];
  console.log('  ' + r + ': cold=' + t.cold.ms.toFixed(0) + 'ms bar=' + t.cold.barSeen + '  warm=' + t.warm.ms.toFixed(0) + 'ms bar=' + t.warm.barSeen + '  coldDeltas=' + JSON.stringify(t.coldDeltas) + ' warmDeltas=' + JSON.stringify(t.warmDeltas));
}

// ================= 5. REPORTS (cold master + generate) =================
{
  const before = snapshot(c.counts);
  await c.page.evaluate(() => { try { window.CMMS.cache.clear(); } catch (e) {} });
  const READY_RPT_TYPE = "(function(){var e=document.getElementById('rptType');return !!e&&e.options.length>1;})()";
  const nav = await navTiming(c.page, 'reports', READY_RPT_TYPE);
  await waitUntil(c.page, () => (document.getElementById('rptType') || { options: [] }).options.length > 1, 60000);
  await sleep(1000);
  const gen = await c.page.evaluate(() => new Promise((resolve) => {
    let barSeen = false, overlay = false;
    const mo = new MutationObserver(function() {
      if (document.getElementById('pageProgressBar')) barSeen = true;
      const ov = document.getElementById('loadingOverlay');
      if (ov && ov.classList.contains('show')) overlay = true;
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    const sel = document.getElementById('rptType');
    if (sel && sel.options.length > 1) { sel.value = sel.options[sel.options.length - 1].value; sel.dispatchEvent(new Event('change')); }
    const btn = document.querySelector('button[onclick*="Reports.generateReport"]');
    if (btn) btn.click();
    const start = Date.now();
    const t0 = performance.now();
    (function poll() {
      const body = document.getElementById('rptTableBody');
      const barNow = !!document.getElementById('pageProgressBar');
      const genDone = barSeen && !barNow;
      const done = (body && body.textContent.length >= 5) || genDone;
      if (done) { mo.disconnect(); resolve({ barSeen, overlay, ms: performance.now() - t0, ok: true }); return; }
      if (Date.now() - start > 150000) { mo.disconnect(); resolve({ barSeen, overlay, ms: performance.now() - t0, ok: false }); return; }
      setTimeout(poll, 200);
    })();
  }));
  await sleep(1500);
  const after = snapshot(c.counts);
  const deltas = deltaAll(before, after);
  const masterFetched = delta(before, after, 'getReportFilterOptions') >= 1;
  const reportFetched = delta(before, after, 'getReportData') >= 1;
  check('L10_fetch_reports', masterFetched && reportFetched && !nav.overlayDuring, 'Reports cold -> master+data fetched (' + JSON.stringify(deltas) + ') overlay=' + nav.overlayDuring);
  check('L14_bar_reports', gen.barSeen && gen.ok, 'Reports generate -> local bar during generation (' + gen.ms.toFixed(0) + 'ms, no-overlay=' + !gen.overlay + ')');
}

// ================= 6. STATIC: no page module uses the global splash =================
const globalSplashUse = await c.page.evaluate(async () => {
  const mods = ['settings', 'inventory', 'users', 'spare-parts', 'all-jobcards', 'breakdown-history', 'reports', 'notifications', 'machines', 'assets'];
  const out = {};
  for (const m of mods) {
    try {
      const r = await fetch('/js/pages/' + m + '.js?cb=' + Date.now(), { cache: 'no-store' });
      const t = await r.text();
      out[m] = { global: t.indexOf('Loader.global') >= 0, local: t.indexOf('Loader.show') >= 0 || t.indexOf('Loader.hide') >= 0 };
    } catch (e) { out[m] = { err: e.message }; }
  }
  return out;
});
const gsBad = Object.keys(globalSplashUse).filter((m) => globalSplashUse[m].global === true);
check('L15_no_global_splash_in_pages', gsBad.length === 0, 'pages using Loader.global=' + JSON.stringify(gsBad));

// ================= 7. MUTATION INVALIDATION (live, benign) =================
{
  await c.page.evaluate(() => window.API.post('getNotifications', {}).catch(() => []));
  await sleep(2000);
  await c.page.evaluate(() => window.Router.navigate('notifications'));
  await waitUntil(c.page, () => (document.getElementById('notifTableContainer') || { innerHTML: '' }).innerHTML.length >= 5, 60000);
  await sleep(1500);
  const mutPre = await c.page.evaluate(() => {
    function freshAll(ds) {
      const keys = window.CMMS.cache.datasetKeys(ds);
      return keys.length === 0 ? 'no-keys' : keys.every((k) => window.CMMS.cache.isFresh(k));
    }
    return { notif: freshAll('notifications'), users: freshAll('users'), master: freshAll('master'), ver: window.API.masterCacheVersion() };
  });
  const mutResult = await c.page.evaluate(async () => {
    try {
      const list = await window.API.post('getNotifications', {});
      const row = (Array.isArray(list) ? list[0] : null) || {};
      const id = row.NotificationID || row.id || row.LogID;
      if (!id) return { skipped: 'no-notification-id' };
      await window.API.post('markNotificationRead', { id });
      return { id };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  });
  await sleep(1500);
  if (mutResult.error) {
    check('L16_mutation_invalidation', false, 'markNotificationRead failed: ' + mutResult.error);
  } else if (mutResult.skipped) {
    const unit = await c.page.evaluate(() => {
      const action = 'markNotificationRead';
      const rule = window.API._MUTATION_RULES.find((r) => r.re.test(action));
      return { shouldInvalidate: window.API._shouldInvalidate(action), ds: rule ? rule.ds.join(',') : null };
    });
    check('L16_mutation_invalidation', unit.shouldInvalidate === true && unit.ds === 'notifications,dashboard', 'no live notifications -> unit-level: shouldInvalidate=' + unit.shouldInvalidate + ' ds=' + unit.ds);
  } else {
    const mutPost = await c.page.evaluate(() => {
      function freshAll(ds) {
        const keys = window.CMMS.cache.datasetKeys(ds);
        return keys.length === 0 ? 'no-keys' : keys.every((k) => window.CMMS.cache.isFresh(k));
      }
      return { notif: freshAll('notifications'), users: freshAll('users'), master: freshAll('master'), ver: window.API.masterCacheVersion() };
    });
    check('L16_invalidate_only_affected', mutPre.notif === true && mutPost.notif === false && mutPost.users === true && mutPost.master === true, 'pre=' + JSON.stringify(mutPre) + ' post=' + JSON.stringify(mutPost));
    check('L16_masterVer_untouched', mutPost.ver === mutPre.ver, 'masterCacheVersion ' + mutPre.ver + ' -> ' + mutPost.ver);
  }
  await c.ctx.close();
}

// ================= 8. PERMISSIONS (client-side restricted session) =================
{
  const r = await newPage(browser, { filterDenied: true });
  await gotoLoad(r.page);
  await waitUntil(r.page, () => !!document.getElementById('loginForm'), 60000);
  await sleep(1000);
  await r.page.evaluate(() => {
    try {
      localStorage.setItem('cmms_token', 'test-token');
      localStorage.setItem('cmms_user', JSON.stringify({ email: 'supervisor@cmms.com', name: 'Supervisor Test', role: 'Supervisor', canManageUsers: false, canManageSettings: false, canManageMachines: true }));
    } catch (e) {}
  });
  await waitUntil(r.page, () => { try { return window.Session.isLoggedIn(); } catch (e) { return false; } }, 10000);
  const perm = await r.page.evaluate(() => ({
    role: Session.getUserRole(),
    canSettings: Session.canAccessPage('settings'),
    canUsers: Session.canAccessPage('users'),
    canMachines: Session.canAccessPage('machines'),
    manageUsers: Session.getPermission('manageUsers'),
    manageSettings: Session.getPermission('manageSettings')
  }));
  check('L17_perm_denied', perm.canSettings === false && perm.canUsers === false && perm.manageUsers === false && perm.manageSettings === false && perm.canMachines === true, 'role=' + perm.role + ' ' + JSON.stringify({ canSettings: perm.canSettings, canUsers: perm.canUsers, canMachines: perm.canMachines }));
  await r.page.evaluate(() => window.Router.navigate('settings'));
  await sleep(2000);
  const blocked = await r.page.evaluate(() => ({ route: window.Router.current, console: !!document.querySelector('.settings-console') }));
  check('L17_router_block', blocked.route === 'dashboard' && blocked.console === false, 'navigate(settings) -> route=' + blocked.route);
  const apiBlock = await r.page.evaluate(async () => {
    try { await window.API.post('getUsers', {}); return 'ALLOWED'; } catch (e) { return String((e && e.message) || e).slice(0, 60); }
  });
  console.log('[info] restricted API getUsers -> ' + apiBlock + ' (server-side gate, requires real non-admin token)');
  await r.ctx.close();
}

// ================= 9. MOBILE =================
{
  const m = await newPage(browser, { width: 390, height: 844 });
  await m.page.evaluateOnNewDocument(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
  await gotoLoad(m.page);
  await waitUntil(m.page, () => !!document.getElementById('loginForm'), 60000);
  await login(m.page, ADMIN);
  await m.page.evaluate(() => window.Router.navigate('sections'));
  await waitUntil(m.page, () => (document.getElementById('sectionsTableContainer') || { innerHTML: '' }).innerHTML.length >= 5, 60000);
  await sleep(800);
  const mState = await m.page.evaluate(() => ({
    route: window.Router.current,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    overlay: !!document.getElementById('loadingOverlay') && document.getElementById('loadingOverlay').classList.contains('show')
  }));
  check('L18_mobile_nav', mState.route === 'sections' && !mState.overlay, 'mobile nav renders (route=' + mState.route + ')');
  check('L18_mobile_no_overflow', mState.overflow <= 2, 'overflow=' + mState.overflow);
  await m.ctx.close();
}

// ================= 10. ZERO ERRORS (admin phase) =================
const rel = c.errors.filter((e) => !/favicon|Failed to load resource|gstatic|net::ERR_/.test(e));
check('L22_zero_errors', rel.length === 0, 'console/page errors=' + JSON.stringify(rel.slice(0, 8)));

await browser.close();

let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('\n===== LIVE NAV/LOADING VERIFICATION SUMMARY (deployment 4c20bb3f) =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) console.log('FAILED: ' + failures.join(', '));
console.log('LIVE: ' + (fail === 0 ? 'PASS' : 'FAIL'));
process.exit(fail === 0 ? 0 : 1);
