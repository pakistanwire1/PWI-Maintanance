import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'cloudflare');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CREDS = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const OUT = 'C:/Users/afsar/AppData/Local/Temp/opencode/qr_parity';
const DATA_FILE = path.join(OUT, 'qr_data.json');
const PORT = 8899;

const ROUTES = [
  { key: 'qr', label: 'Overview', gasRoot: '#qrPage' },
  { key: 'qrmachines', label: 'Machine', gasRoot: '#qrmachinesPage' },
  { key: 'qrassets', label: 'Asset', gasRoot: '#qrassetsPage' },
  { key: 'qrspareparts', label: 'Spare Part', gasRoot: '#qrsparepartsPage' },
  { key: 'qrjobcards', label: 'Job Card', gasRoot: '#qrjobcardsPage' },
  { key: 'qrprint', label: 'Print', gasRoot: '#qrprintPage' },
  { key: 'qrhistory', label: 'History', gasRoot: '#qrhistoryPage' }
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function mkdir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

// ---------------- static + mock server ----------------
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.map': 'application/json', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf'
};

function startServer(data) {
  return http.createServer((req, res) => {
    const url = (req.url || '').split('?')[0];
    if (url === '/api/exec' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const d = JSON.parse(body);
          const action = d.action || '';
          const params = d.data || d;
          let out = null;
          if (action === 'getQRStatistics') out = data.stats;
          else if (action === 'getQRModuleRecords') out = data.byModule[params.module] || [];
          else if (action === 'getQRScanHistory') out = data.history;
          else if (action === 'getQRScanStats') out = data.scanStats;
          else if (action === 'getMachineCascade') out = data.cascade;
          else if (action === 'getModuleRecordDetail') out = (data.byModule[params.module] || [])[0] || null;
          else if (action === 'getQRDetail') out = { module: 'Machine', id: '1', name: 'MOCK', code: 'MOCK' };
          else if (action === 'getPrintLabelData') out = data.printSample || null;
          else out = { ok: true };
          const json = JSON.stringify(out);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(json);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }
    let p = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!p.startsWith(ROOT)) p = path.join(ROOT, 'index.html');
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
}

// ---------------- GAS helpers ----------------
function gasCall(frame, name, args) {
  return frame.evaluate((name, args) => new Promise((resolve) => {
    try {
      const run = google.script.run.withSuccessHandler(resolve).withFailureHandler(e => resolve({ __err: String(e) }));
      run[name].apply(run, args || []);
    } catch (e) { resolve({ __err: String(e) }); }
  }), name, args || []);
}

async function findGasFrame(page) {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('qrTableBody'))).catch(() => false);
    if (has) return f;
  }
  return null;
}

async function loginGAS(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(GAS_URL, { waitUntil: 'networkidle2', timeout: 240000 });
  let gasFrame = null;
  {
    const t0 = Date.now();
    while (Date.now() - t0 < 180000) {
      gasFrame = await findGasFrame(page);
      if (gasFrame) {
        const state = await gasFrame.evaluate(() => {
          const ac = document.getElementById('appContainer');
          const lf = document.getElementById('loginForm');
          return { hasApp: !!(ac && getComputedStyle(ac).display !== 'none'), hasLogin: !!lf };
        }).catch(() => ({ hasApp: false, hasLogin: false }));
        if (state.hasApp || state.hasLogin) break;
      }
      await sleep(3000);
    }
  }
  if (!gasFrame) throw new Error('GAS app frame not found');

  const state = await gasFrame.evaluate(() => {
    const ac = document.getElementById('appContainer');
    return { hasApp: !!(ac && getComputedStyle(ac).display !== 'none'), hasLogin: !!document.getElementById('loginForm') };
  }).catch(() => ({ hasApp: false, hasLogin: false }));

  if (!state.hasApp && state.hasLogin) {
    await gasFrame.waitForSelector('#loginEmail', { timeout: 30000 });
    await gasFrame.type('#loginEmail', CREDS.Email);
    await gasFrame.type('#loginPassword', CREDS.Password);
    await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  }
  await gasFrame.waitForFunction(() => {
    const c = document.getElementById('appContainer');
    return c && getComputedStyle(c).display !== 'none';
  }, { timeout: 240000 });
  await sleep(2000);
  return { page, gasFrame };
}

async function captureGASData(gasFrame) {
  const stats = await gasCall(gasFrame, 'getQRStatistics', []);
  const byModule = {};
  for (const m of ['Machine', 'Asset', 'Spare Part', 'Job Card']) {
    byModule[m] = (await gasCall(gasFrame, 'getQRModuleRecords', [m])) || [];
  }
  const history = await gasCall(gasFrame, 'getQRScanHistory', [{ module: '', search: '', page: 1, pageSize: 25 }]);
  const scanStats = await gasCall(gasFrame, 'getQRScanStats', []);
  const cascade = await gasCall(gasFrame, 'getMachineCascade', ['', '', '']);
  let printSample = null;
  const firstMachine = (byModule.Machine || [])[0];
  if (firstMachine) {
    const id = firstMachine.MachineID || firstMachine.id || '';
    if (id) printSample = await gasCall(gasFrame, 'getPrintLabelData', ['Machine', String(id), '75x50mm']);
  }
  return { stats, byModule, history, scanStats, cascade, printSample };
}

// ---------------- structural extractors ----------------
function structureOf(rootSel) {
  const root = document.querySelector(rootSel);
  if (!root) return { missing: rootSel };
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const out = {};
  const h2 = root.querySelector('h2');
  out.h2 = h2 ? norm(h2.textContent) : null;
  const sum = root.querySelector('.qr-summary');
  out.stats = [];
  if (sum) Array.from(sum.children).forEach(c => {
    const v = c.querySelector('h3, .stat-value');
    const l = c.querySelector('p, .stat-label');
    out.stats.push({ v: v ? norm(v.textContent) : null, l: l ? norm(l.textContent) : null });
  });
  out.tabs = Array.from(root.querySelectorAll('.qr-tabs .qr-tab')).map(b => ({ t: norm(b.textContent), a: b.classList.contains('active') }));
  out.buttons = Array.from(root.querySelectorAll('.qr-actions .btn')).map(b => norm(b.textContent));
  const sb = root.querySelector('.qr-search-bar');
  out.search = sb ? Array.from(sb.querySelectorAll('input')).map(i => ({ id: i.id, ph: i.getAttribute('placeholder') })) : [];
  out.selects = sb ? Array.from(sb.querySelectorAll('select')).map(s => ({ id: s.id, opts: Array.from(s.options).map(o => norm(o.text)) })) : [];
  const tbl = root.querySelector('.qr-table-wrap table');
  out.thead = tbl ? Array.from(tbl.querySelectorAll('thead th')).map(th => norm(th.textContent)) : null;
  out.rows = tbl ? Array.from(tbl.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => norm(td.textContent))) : null;
  const pg = root.querySelector('.page-footer-actions, .qr-page-footer');
  out.footer = pg ? norm(pg.textContent) : null;
  out.pagination = !!(pg && pg.querySelector('.qr-pagination, .pagination, a[data-page]'));
  return out;
}

function geometryOf(rootSel) {
  const root = document.querySelector(rootSel);
  if (!root) return null;
  const r = root.getBoundingClientRect();
  const g = sel => { const e = root.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x - r.x), y: Math.round(b.y - r.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    region: { w: Math.round(r.width), h: Math.round(r.height) },
    header: g('.page-header'),
    summary: g('.qr-summary'),
    controls: g('.qr-controls'),
    search: g('.qr-search-bar'),
    table: g('.qr-table-wrap'),
    footer: g('.page-footer-actions, .qr-page-footer')
  };
}

async function captureAt(frame, rootSel) {
  const struct = await frame.evaluate(structureOf, rootSel).catch(e => ({ err: String(e) }));
  const geom = await frame.evaluate(geometryOf, rootSel).catch(() => null);
  return { struct, geom };
}

async function waitForGASReady(gasFrame, routeKey) {
  const route = ROUTES.find(r => r.key === routeKey);
  const root = route.gasRoot;
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const ok = await gasFrame.evaluate(root => {
      const page = document.querySelector(root);
      if (!page) return false;
      const tb = page.querySelector('tbody');
      if (!tb) return false;
      const trs = tb.querySelectorAll('tr');
      if (!trs.length) return false;
      const txt = (trs[0].textContent || '');
      if (/Loading|Retrying/.test(txt)) return false;
      if (root.indexOf('qrmachines') !== -1) {
        const d = document.getElementById('qrMachineDivision');
        if (d && d.options.length < 2) return false;
      }
      if (root.indexOf('qrassets') !== -1) {
        const d = document.getElementById('qrAssetDivision');
        if (d && d.options.length < 2) return false;
      }
      return true;
    }, root).catch(() => false);
    if (ok) return true;
    await sleep(500);
  }
  return false;
}

async function shotRegion(page, frame, rootSel) {
  const rect = await frame.evaluate(rootSel => {
    const el = document.querySelector(rootSel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, rootSel);
  if (!rect) return null;
  let clip = { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.round(rect.w), height: Math.round(rect.h) };
  if (frame !== page.mainFrame()) {
    const fEl = await frame.frameElement().catch(() => null);
    const fb = fEl ? await fEl.boundingBox().catch(() => null) : null;
    if (fb) clip = { x: Math.round(fb.x + Math.max(0, rect.x)), y: Math.round(fb.y + Math.max(0, rect.y)), width: Math.round(rect.w), height: Math.round(rect.h) };
  }
  return page.screenshot({ clip });
}

// ---------------- pixel diff (in-browser, no deps) ----------------
async function pixelDiff(browser, aDataUrl, bDataUrl, targetW) {
  const p = await browser.newPage();
  await p.setViewport({ width: 900, height: 600 });
  const res = await p.evaluate(async ({ a, b, targetW }) => {
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const ia = await load(a);
    const ib = await load(b);
    const w = targetW || Math.max(ia.width, ib.width);
    const ah = Math.round(ia.height * w / ia.width);
    const bh = Math.round(ib.height * w / ib.width);
    const h = Math.max(ah, bh);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(ia, 0, 0, w, ah);
    ctx.drawImage(ib, 0, 0, w, bh);
    const data = ctx.getImageData(0, 0, w, h).data;
    let diff = 0;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = w; diffCanvas.height = h;
    const dctx = diffCanvas.getContext('2d');
    dctx.fillStyle = '#fff';
    dctx.fillRect(0, 0, w, h);
    dctx.drawImage(ia, 0, 0, w, ah);
    dctx.globalCompositeOperation = 'difference';
    dctx.drawImage(ib, 0, 0, w, bh);
    dctx.globalCompositeOperation = 'source-over';
    const ddata = dctx.getImageData(0, 0, w, h).data;
    const total = w * h;
    for (let i = 0; i < total; i++) {
      const o = i * 4;
      const dr = Math.abs(ddata[o] - 0);
      const dg = Math.abs(ddata[o + 1] - 0);
      const db = Math.abs(ddata[o + 2] - 0);
      if ((dr + dg + db) > 90) diff++;
    }
    return { diffPercent: +(100 * diff / total).toFixed(2), diffImage: diffCanvas.toDataURL('image/png') };
  }, { a: aDataUrl, b: bDataUrl, targetW });
  await p.close();
  return res;
}

function toDataUrl(pngBuf) {
  return 'data:image/png;base64,' + Buffer.from(pngBuf).toString('base64');
}

// ---------------- report helpers ----------------
function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function cmpArrays(a, b) {
  const diffs = [];
  const n = Math.max(a ? a.length : 0, b ? b.length : 0);
  for (let i = 0; i < n; i++) {
    const x = a && a[i];
    const y = b && b[i];
    if (x === undefined && y !== undefined) diffs.push(`  [$i] MISSING on GAS: ${JSON.stringify(y)}`);
    else if (y === undefined && x !== undefined) diffs.push(`  [$i] MISSING on CF: ${JSON.stringify(x)}`);
    else if (!deepEq(x, y)) diffs.push(`  [$i] GAS: ${JSON.stringify(x)}  |  CF: ${JSON.stringify(y)}`);
  }
  return diffs;
}
// GAS renders module records in async arrival order (index cells are positional),
// so compare table rows as sorted sets with the display index stripped.
function normRows(rows) {
  return (rows || []).map(r => (Array.isArray(r) ? r.slice(1) : [])).sort((a, b) => {
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
}
function normSelects(sel) {
  return (sel || []).map(s => ({ id: s.id, opts: (s.opts || []).slice().sort() }));
}

// ---------------- main ----------------
mkdir(OUT);
mkdir(path.join(OUT, 'gas'));
mkdir(path.join(OUT, 'cf'));

let browser;
let server = null;
try {
  browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  // ---- Phase A: GAS login + data capture ----
  console.log('[A] Logging into GAS prod...');
  const { page: gasPage, gasFrame } = await loginGAS(browser);
  const gasTheme = await gasFrame.evaluate(() => document.documentElement.getAttribute('data-theme') || '').catch(() => '');
  console.log('[A] GAS theme =', gasTheme || '(default)');

  const qrData = await captureGASData(gasFrame);
  fs.writeFileSync(DATA_FILE, JSON.stringify(qrData, null, 2));
  console.log('[A] Captured live data ->', DATA_FILE,
    '| stats:', JSON.stringify(qrData.stats),
    '| rows:', Object.keys(qrData.byModule).map(k => k + '=' + qrData.byModule[k].length).join(', '),
    '| history total:', qrData.history.total);

  await gasFrame.evaluate(() => navigateTo('qr'));
  await sleep(6000);
  const gasProbe = await gasFrame.evaluate(() => ({
    generated: (document.getElementById('qrStatGenerated') || {}).textContent,
    pending: (document.getElementById('qrStatPending') || {}).textContent,
    scanned: (document.getElementById('qrStatScanned') || {}).textContent,
    hasLoadQRBarcodeData: typeof loadQRBarcodeData,
    tableRows: document.querySelectorAll('#qrTableBody tr').length
  })).catch(e => ({ err: String(e) }));
  console.log('[A] GAS stat probe:', JSON.stringify(gasProbe));

  // ---- Phase A2: GAS structure/geom/shots ----
  const gasResults = {};
  for (const route of ROUTES) {
    await gasFrame.evaluate(r => navigateTo(r), route.key);
    await waitForGASReady(gasFrame, route.key);
    await sleep(1000);
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      await gasPage.setViewport(vp);
      await sleep(1200);
      const cap = await captureAt(gasFrame, route.gasRoot);
      const shot = await shotRegion(gasPage, gasFrame, route.gasRoot);
      fs.writeFileSync(path.join(OUT, 'gas', `${route.key}_${vpName}.png`), shot);
      gasResults[`${route.key}_${vpName}`] = cap;
      console.log(`[A] gas ${route.key} ${vpName} -> struct.ok=${!cap.struct.missing} rows=${cap.struct.rows ? cap.struct.rows.length : 'n/a'}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'gas_results.json'), JSON.stringify(gasResults, null, 2));
  await gasPage.close();
  console.log('[A] GAS capture complete.');

  // ---- Phase B: CF local SPA ----
  server = startServer(qrData);
  await new Promise(r => server.listen(PORT, r));
  console.log('[B] CF mock server on :' + PORT);

  const cfPage = await browser.newPage();
  const cfErrors = [];
  cfPage.on('console', m => { if (m.type() === 'error') cfErrors.push(m.text().slice(0, 300)); });
  cfPage.on('pageerror', e => cfErrors.push('PAGEERROR: ' + String(e).slice(0, 300)));
  await cfPage.evaluateOnNewDocument(creds => {
    localStorage.setItem('cmms_token', 'mock-token');
    localStorage.setItem('cmms_user', JSON.stringify({ name: creds.Name, email: creds.Email, role: creds.Role, isSystemAdmin: true }));
    localStorage.setItem('cmms_theme', 'dark');
  }, CREDS);
  await cfPage.goto('http://localhost:' + PORT, { waitUntil: 'networkidle2', timeout: 60000 });
  await cfPage.waitForFunction(() => {
    const pc = document.getElementById('pageContent');
    return pc && getComputedStyle(pc).display !== 'none' && pc.offsetWidth > 0;
  }, { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  const bootInfo = await cfPage.evaluate(() => {
    const ac = document.getElementById('appContainer');
    const pc = document.getElementById('pageContent');
    const g = el => el ? getComputedStyle(el) : null;
    return {
      appContainer: ac ? { display: g(ac).display, w: ac.offsetWidth, h: ac.offsetHeight } : null,
      pageContent: pc ? { display: g(pc).display, w: pc.offsetWidth, h: pc.offsetHeight, html: (pc.innerHTML || '').replace(/\s+/g, ' ').slice(0, 200) } : null,
      hash: location.hash,
      routerCurrent: typeof Router !== 'undefined' ? Router.current : 'no-router',
      loggedIn: typeof Session !== 'undefined' ? Session.isLoggedIn() : 'no-session'
    };
  });
  console.log('[B] boot:', JSON.stringify(bootInfo));

  const cfResults = {};
  for (const route of ROUTES) {
    await cfPage.evaluate(r => navigateTo(r), route.key);
    await sleep(3000);
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      await cfPage.setViewport(vp);
      await sleep(1200);
      const cap = await captureAt(cfPage.mainFrame(), '#pageContent');
      let shot = null;
      try {
        shot = await shotRegion(cfPage, cfPage.mainFrame(), '#pageContent');
      } catch (e) { console.log('[B] shotRegion skip', route.key, vpName, String(e).slice(0, 120)); }
      if (shot) fs.writeFileSync(path.join(OUT, 'cf', `${route.key}_${vpName}.png`), shot);
      cfResults[`${route.key}_${vpName}`] = cap;
      console.log(`[B] cf ${route.key} ${vpName} -> struct.ok=${!cap.struct.missing} rows=${cap.struct.rows ? cap.struct.rows.length : 'n/a'}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'cf_results.json'), JSON.stringify(cfResults, null, 2));
  fs.writeFileSync(path.join(OUT, 'cf_console_errors.json'), JSON.stringify(cfErrors, null, 2));
  console.log('[B] CF console errors:', cfErrors.length);
  cfErrors.slice(0, 20).forEach(e => console.log('  CF-ERR: ' + e));
  await cfPage.close();

  // ---- Phase C: diff ----
  console.log('\n========== STRUCTURAL DIFF REPORT ==========');
  const report = {};
  for (const route of ROUTES) {
    for (const [vpName] of Object.entries(VIEWPORTS)) {
      const id = `${route.key}_${vpName}`;
      const gas = gasResults[id];
      const cf = cfResults[id];
      const g = gas && gas.struct;
      const c = cf && cf.struct;
      const diffs = [];
      if (!g) diffs.push('GAS structure missing: ' + (g && g.missing));
      if (!c) diffs.push('CF structure missing: ' + (c && c.missing));
      if (g && c) {
        if (!deepEq(g.h2, c.h2)) diffs.push(`h2: GAS=${JSON.stringify(g.h2)} | CF=${JSON.stringify(c.h2)}`);
        if (!deepEq(g.tabs, c.tabs)) diffs.push('tabs: ' + JSON.stringify(cmpArrays(g.tabs, c.tabs)));
        if (!deepEq(g.stats, c.stats)) diffs.push('stats: ' + JSON.stringify(cmpArrays(g.stats, c.stats)));
        if (!deepEq(g.buttons, c.buttons)) diffs.push('buttons: ' + JSON.stringify(cmpArrays(g.buttons, c.buttons)));
        if (!deepEq(g.search, c.search)) diffs.push('search inputs: ' + JSON.stringify(cmpArrays(g.search, c.search)));
        if (!deepEq(normSelects(g.selects), normSelects(c.selects))) diffs.push('selects: ' + JSON.stringify(cmpArrays(normSelects(g.selects), normSelects(c.selects))));
        if (!deepEq(g.thead, c.thead)) diffs.push('thead: ' + JSON.stringify(cmpArrays(g.thead, c.thead)));
        {
          const gr = normRows(g.rows), cr = normRows(c.rows);
          if (!deepEq(gr, cr)) diffs.push('rows: ' + JSON.stringify(cmpArrays(gr, cr)));
        }
        if (!deepEq(g.footer, c.footer)) diffs.push('footer: GAS=' + JSON.stringify(g.footer) + ' | CF=' + JSON.stringify(c.footer));
        if (g.pagination !== c.pagination) diffs.push(`pagination: GAS=${g.pagination} | CF=${c.pagination}`);
        if (!deepEq(g.geom, c.geom) && gas.geom && cf.geom) {
          const gd = gas.geom;
          const cd = cf.geom;
          if (gd.region && cd.region && (Math.abs(gd.region.w - cd.region.w) > 2 || Math.abs(gd.region.h - cd.region.h) > 2)) diffs.push(`region size: GAS=${gd.region.w}x${gd.region.h} | CF=${cd.region.w}x${cd.region.h}`);
        }
      }
      const shotG = fs.readFileSync(path.join(OUT, 'gas', id + '.png'));
      const shotC = fs.readFileSync(path.join(OUT, 'cf', id + '.png'));
      let px = null;
      try {
        px = await pixelDiff(browser, toDataUrl(shotG), toDataUrl(shotC), vpName === 'mobile' ? 360 : 1100);
        fs.writeFileSync(path.join(OUT, `diff_${id}.png`), Buffer.from(px.diffImage.split(',')[1], 'base64'));
      } catch (e) { px = { diffPercent: -1, err: String(e) }; }
      report[id] = { diffs, pixelDiff: px.diffPercent };
      console.log(`\n--- ${route.label} [${vpName}]  pixel-diff: ${px.diffPercent}% ---`);
      if (!diffs.length) console.log('  (no structural diffs)');
      else diffs.forEach(d => console.log('  ' + d));
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nReport ->', path.join(OUT, 'report.json'));

} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  if (server) server.close();
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
