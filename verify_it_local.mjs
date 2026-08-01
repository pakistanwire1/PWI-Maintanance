import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'cloudflare');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8810;
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};

function mockTransactions(n) {
  const types = ['Goods Receipt', 'Issue', 'Return', 'Transfer', 'Adjustment'];
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const base = new Date(Date.UTC(2026, 0, i, 10, 30, 0));
    rows.push({
      TransactionID: 'TXN-' + i,
      CreatedAt: base.toISOString(),
      TransactionType: types[(i - 1) % 5],
      PartCode: 'PC-' + i,
      PartName: 'Part ' + i,
      Quantity: i,
      UnitCost: 10 + i,
      TotalCost: (10 + i) * i,
      ReferenceNo: 'REF-' + i,
      ReferenceType: 'PO',
      FromLocation: 'Store A',
      ToLocation: 'Store B',
      Remarks: 'Remark ' + i,
      ProcessedBy: 'User',
      ProcessedAt: base.toISOString()
    });
  }
  return rows;
}

function mockParts() {
  const rows = [];
  for (let i = 1; i <= 3; i++) rows.push({ PartCode: 'PC-' + i, PartName: 'Part ' + i });
  return rows;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.indexOf('/api/exec') >= 0) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let action = '';
      try { action = (JSON.parse(body || '{}').action) || ''; } catch (e) {}
      let payload = [];
      if (action === 'getInventoryTransactions') payload = mockTransactions(25);
      else if (action === 'getSpareParts') payload = mockParts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
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

async function run() {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.indexOf('fonts.googleapis.com') >= 0 || url.indexOf('fonts.gstatic.com') >= 0) { req.abort(); return; }
    req.continue();
  });
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('cmms_welcomed', 'true');
    localStorage.setItem('cmms_token', 'test_token_12345');
    localStorage.setItem('cmms_user', JSON.stringify({ name: 'Test User', email: 'test@example.com', role: 'Admin', isSystemAdmin: true }));
    window.startApp();
  });
  await sleep(2000);

  await page.evaluate(() => { Router.navigate('inventorytransactions'); });
  await page.waitForFunction(() => {
    const el = document.getElementById('itTableContainer');
    return el && el.innerHTML.indexOf('<tbody>') >= 0;
  }, { timeout: 15000 });
  await sleep(800);

  const page1 = await page.evaluate(() => {
    const container = document.getElementById('itTableContainer');
    const html = container.innerHTML;
    const firstDateCell = container.querySelector('tbody tr td:nth-child(2)');
    return {
      html,
      rowCount: container.querySelectorAll('tbody tr').length,
      hasShowing: /Showing\s+\d+\s+to\s+\d+\s+of\s+\d+\s+entries/.test(html),
      hasPrev: html.indexOf('>Prev</button>') >= 0,
      hasNext: html.indexOf('>Next</button>') >= 0,
      hasPageOfSpan: /Page\s+\d+\s+of\s+\d+/.test(html),
      iconBtnCount: container.querySelectorAll('button.icon-btn.icon-btn-primary').length,
      textBtnCount: container.querySelectorAll('button.btn.btn-sm').length,
      hasBadge: container.querySelector('tbody tr td:nth-child(3) .badge') !== null,
      dateCell: firstDateCell ? firstDateCell.textContent : '',
      totalTxns: document.getElementById('itTotalTxns').textContent,
      gr: document.getElementById('itGoodsReceipt').textContent,
      issues: document.getElementById('itIssues').textContent,
      returns: document.getElementById('itReturns').textContent,
      transfers: document.getElementById('itTransfers').textContent,
      adjustments: document.getElementById('itAdjustments').textContent,
      viewBtnTitle: container.querySelector('button.icon-btn') ? container.querySelector('button.icon-btn').getAttribute('title') : ''
    };
  });

  check('Table renders 10 rows (page 1 of 25)', page1.rowCount === 10, 'rows=' + page1.rowCount);
  check('Pagination info "Showing 1 to 10 of 25 entries"', page1.hasShowing);
  check('Prev + Next buttons present', page1.hasPrev && page1.hasNext);
  check('NO "Page X of Y" span (matches GAS)', !page1.hasPageOfSpan);
  check('View action is icon-btn (not text btn)', page1.iconBtnCount === 10 && page1.textBtnCount === 0, 'icon=' + page1.iconBtnCount + ' text=' + page1.textBtnCount);
  check('View button title="View"', page1.viewBtnTitle === 'View');
  check('Type badges render', page1.hasBadge);
  check('Date column shows time " | " like GAS', (page1.dateCell.indexOf(' | ') > -1), 'value=' + page1.dateCell);
  check('Summary: Total Transactions = 25', page1.totalTxns === '25', 'value=' + page1.totalTxns);
  check('Summary: Goods Receipt = 5', page1.gr === '5', 'value=' + page1.gr);
  check('Summary: Issues = 5', page1.issues === '5', 'value=' + page1.issues);
  check('Summary: Returns = 5', page1.returns === '5', 'value=' + page1.returns);
  check('Summary: Transfers = 5', page1.transfers === '5', 'value=' + page1.transfers);
  check('Summary: Adjustments = 5', page1.adjustments === '5', 'value=' + page1.adjustments);

  const modalCheck = await page.evaluate(() => {
    const btn = document.querySelector('#itTableContainer button.icon-btn');
    if (!btn) return { clicked: false };
    btn.click();
    const overlay = document.getElementById('itViewModal');
    const shown = overlay && overlay.style.display === 'flex';
    const title = document.getElementById('itViewModalTitle') ? document.getElementById('itViewModalTitle').textContent : '';
    const txnId = document.getElementById('itViewTxnId') ? document.getElementById('itViewTxnId').textContent : '';
    const overlayEl = document.getElementById('itViewModal');
    if (overlayEl) { overlayEl.style.display = 'none'; }
    return { clicked: true, shown, title, txnId };
  });
  check('View modal opens on icon click', modalCheck.clicked && modalCheck.shown, 'title=' + modalCheck.title);
  check('View modal title "Transaction - TXN-1"', modalCheck.title === 'Transaction - TXN-1', 'title=' + modalCheck.title);
  check('View modal shows Transaction ID', modalCheck.txnId === 'TXN-1', 'id=' + modalCheck.txnId);

  const searchCheck = await page.evaluate(() => {
    const input = document.getElementById('itSearch');
    input.value = 'PC-11';
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    return true;
  });
  await sleep(700);
  const searchRes = await page.evaluate(() => {
    const container = document.getElementById('itTableContainer');
    const rows = container.querySelectorAll('tbody tr');
    return { rowCount: rows.length, firstPart: rows[0] ? rows[0].querySelector('td:nth-child(4)').textContent : '' };
  });
  check('Search filters to 1 row (PC-11)', searchRes.rowCount === 1 && searchRes.firstPart === 'PC-11', 'rows=' + searchRes.rowCount);

  await page.evaluate(() => {
    document.getElementById('itSearch').value = '';
    document.getElementById('itSearch').dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  });
  await sleep(500);
  const nextCheck = await page.evaluate(() => {
    const btns = document.querySelectorAll('#itTableContainer .pagination-btns button');
    for (let i = 0; i < btns.length; i++) {
      if (btns[i].textContent === 'Next') { btns[i].click(); }
    }
    return true;
  });
  await sleep(400);
  const page2 = await page.evaluate(() => {
    const container = document.getElementById('itTableContainer');
    return {
      showing: (container.querySelector('.pagination-info') || {}).textContent || '',
      firstRow: container.querySelector('tbody tr td') ? container.querySelector('tbody tr td').textContent : '',
      rowCount: container.querySelectorAll('tbody tr').length
    };
  });
  check('Next → page 2 "Showing 11 to 20"', /Showing 11 to 20 of 25/.test(page2.showing), 'value=' + page2.showing);

  const typeCheck = await page.evaluate(() => {
    document.getElementById('itSearch').value = '';
    document.getElementById('itSearch').dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    document.getElementById('itFilterType').value = 'Return';
    document.getElementById('itFilterPart').value = '';
    document.getElementById('itFilterFromDate').value = '';
    document.getElementById('itFilterToDate').value = '';
    const apply = document.querySelector('#itFilterBar .btn-primary');
    apply.click();
    return true;
  });
  await sleep(500);
  const typeRes = await page.evaluate(() => {
    const container = document.getElementById('itTableContainer');
    const rows = container.querySelectorAll('tbody tr');
    const badges = Array.prototype.slice.call(container.querySelectorAll('.badge')).map(function(b) { return b.textContent; });
    return { rowCount: rows.length, uniqueTypes: Array.from(new Set(badges)) };
  });
  check('Type filter "Return" → 5 rows all "Return"', typeRes.rowCount === 5 && typeRes.uniqueTypes.length === 1 && typeRes.uniqueTypes[0] === 'Return', 'rows=' + typeRes.rowCount);

  const failures = results.filter((r) => !r.pass).length;
  console.log('\nRESULT: ' + (failures === 0 ? 'ALL PASS' : failures + ' FAILED'));
  await browser.close();
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => { console.error('FATAL: ' + err.message); process.exit(1); });
