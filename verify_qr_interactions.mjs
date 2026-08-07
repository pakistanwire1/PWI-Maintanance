import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'cloudflare');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CREDS = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const DATA = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/qr_parity/qr_data.json', 'utf8'));
const PORT = 8898;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
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
        if (action === 'getQRStatistics') out = DATA.stats;
        else if (action === 'getQRModuleRecords') out = DATA.byModule[params.module] || [];
        else if (action === 'getQRScanHistory') out = DATA.history;
        else if (action === 'getQRScanStats') out = DATA.scanStats;
        else if (action === 'getMachineCascade') out = DATA.cascade;
        else if (action === 'getModuleRecordDetail') out = (DATA.byModule[params.module] || [])[0] || null;
        else if (action === 'getQRDetail') out = { module: 'Machine', id: '1', name: 'MOCK', code: 'MOCK' };
        else if (action === 'getPrintLabelData') out = DATA.printSample || null;
        else out = { ok: true };
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(out));
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

const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser;
try {
  await new Promise(r => server.listen(PORT, r));
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  await page.evaluateOnNewDocument(creds => {
    localStorage.setItem('cmms_token', 'mock-token');
    localStorage.setItem('cmms_user', JSON.stringify({ name: creds.Name, email: creds.Email, role: creds.Role, isSystemAdmin: true }));
    localStorage.setItem('cmms_theme', 'dark');
  }, CREDS);
  await page.goto('http://localhost:' + PORT, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => {
    const pc = document.getElementById('pageContent');
    return pc && getComputedStyle(pc).display !== 'none' && pc.offsetWidth > 0;
  }, { timeout: 30000 }).catch(() => {});
  await sleep(1200);

  const results = {};

  // ---- Overview search ----
  await page.evaluate(() => navigateTo('qr'));
  await sleep(2500);
  const allRows = await page.evaluate(() => document.querySelectorAll('#qrOvBody tr').length);
  await page.type('#qrSearchInput', 'Hydraulic');
  await sleep(800);
  const filteredRows = await page.evaluate(() => document.querySelectorAll('#qrOvBody tr').length);
  results.overview_search = { allRows, filteredRows, ok: allRows > filteredRows && filteredRows > 0 };

  // overview status filter
  await page.evaluate(() => { document.getElementById('qrSearchInput').value = ''; QRCodes.ovSearch(''); });
  await page.select('#qrStatusFilter', 'Active');
  await sleep(800);
  const activeRows = await page.evaluate(() => document.querySelectorAll('#qrOvBody tr').length);
  results.overview_status_filter = { activeRows, ok: activeRows > 0 && activeRows < allRows };

  // ---- Machine page ----
  await page.evaluate(() => navigateTo('qrmachines'));
  await sleep(2500);
  const mRows = await page.evaluate(() => document.querySelectorAll('#qrMcBody tr').length);
  await page.type('#qrMachineSearch', 'Straightener');
  await sleep(800);
  const mFiltered = await page.evaluate(() => document.querySelectorAll('#qrMcBody tr').length);
  results.machine_search = { allRows: mRows, filteredRows: mFiltered, ok: mRows > mFiltered && mFiltered > 0 };
  await page.evaluate(() => { document.getElementById('qrMachineSearch').value = ''; QRCodes.mcSearch(''); });
  // division cascade options present
  const divOpts = await page.evaluate(() => document.getElementById('qrMachineDivision').options.length);
  const secOpts = await page.evaluate(() => document.getElementById('qrMachineSectionFilter').options.length);
  results.machine_cascade = { division: divOpts, sections: secOpts, ok: divOpts >= 2 && secOpts >= 2 };
  // machine dept filter (GAS parity: 14 empty + All Departments)
  const deptOpts = await page.evaluate(() => Array.from(document.getElementById('qrMachineDeptFilter').options).map(o => o.text).sort());
  results.machine_dept = { opts: deptOpts.length, empties: deptOpts.filter(t => t === '').length, ok: deptOpts.length === 15 && deptOpts.filter(t => t === '').length === 14 };

  // ---- Print page module filter ----
  await page.evaluate(() => navigateTo('qrprint'));
  await sleep(2500);
  const pAll = await page.evaluate(() => document.querySelectorAll('#qrPlBody tr').length);
  await page.select('#qrPrintModule', 'Job Card');
  await sleep(800);
  const pJC = await page.evaluate(() => document.querySelectorAll('#qrPlBody tr').length);
  results.print_module_filter = { all: pAll, jobCards: pJC, ok: pJC === 64 && pAll === 197 };

  // ---- History page (empty state + pager) ----
  await page.evaluate(() => navigateTo('qrhistory'));
  await sleep(2500);
  const hist = await page.evaluate(() => ({
    rows: document.querySelectorAll('#qrHsBody tr').length,
    empty: (document.querySelector('#qrHsBody tr') || {}).textContent || '',
    footer: (document.getElementById('qrHsCount') || {}).textContent || '',
    prevDisabled: document.getElementById('qrHistPrevBtn') ? document.getElementById('qrHistPrevBtn').disabled : null,
    nextDisabled: document.getElementById('qrHistNextBtn') ? document.getElementById('qrHistNextBtn').disabled : null
  }));
  results.history = { ...hist, ok: hist.rows === 1 && /No scan history found/.test(hist.empty) && /Page 1 of 1/.test(hist.footer) && hist.prevDisabled === true && hist.nextDisabled === true };

  // ---- Tabs ----
  await page.evaluate(() => navigateTo('qrspareparts'));
  await sleep(2000);
  const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('#pageContent .qr-tabs .qr-tab')).map(b => ({ t: b.textContent, a: b.classList.contains('active') })));
  results.tabs = { ok: tabs.length === 7 && tabs.filter(t => t.a).length === 1 && tabs.find(t => t.a).t === 'Spare Parts' };

  results.consoleErrors = errs.length;

  console.log('========== QR INTERACTION REPORT ==========');
  for (const [k, v] of Object.entries(results)) {
    if (k === 'consoleErrors') continue;
    console.log((v.ok ? 'PASS' : 'FAIL') + '  ' + k + '  ' + JSON.stringify(Object.fromEntries(Object.entries(v).filter(([kk]) => kk !== 'ok'))));
  }
  console.log('CF console errors:', errs.length);
  const pass = Object.values(results).filter(v => v && v.ok !== undefined ? v.ok : (typeof v === 'number')).length;
  fs.writeFileSync(path.join(__dirname, 'interactions_report.json'), JSON.stringify(results, null, 2));
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  server.close();
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
