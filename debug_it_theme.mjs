import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CF_DIR = path.join(__dirname, '.verify_it_cf_downloads');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function clearDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
async function waitForFile(dir, filename, timeoutMs) {
  const target = path.join(dir, filename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(target)) return fs.readFileSync(target, 'utf8');
    await sleep(300);
  }
  return null;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
});

// ---------- CF ----------
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1440, height: 900 });
await cfPage.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });
await cfPage.evaluate(() => navigateTo('inventorytransactions'));
await cfPage.waitForFunction(() => {
  const t = document.querySelector('#itTableContainer');
  return t && t.querySelector('tbody tr') && document.getElementById('itFilterPart') && document.getElementById('itFilterPart').options.length > 1;
}, { timeout: 120000 });
await sleep(1000);

// ---------- GAS ----------
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1440, height: 900 });
await gasPage.goto(GAS, { waitUntil: 'networkidle2', timeout: 120000 });
async function findGasFrame() {
  for (const f of gasPage.frames()) {
    if (f === gasPage.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('inventorytransactionsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null;
{
  const gStart = Date.now();
  while (Date.now() - gStart < 180000) {
    gasFrame = await findGasFrame();
    if (gasFrame) {
      const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
      if (hasForm) break;
    }
    await sleep(3000);
  }
  if (!gasFrame) throw new Error('GAS app frame never appeared');
}
await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 120000 });
await gasFrame.evaluate(() => navigateTo('inventorytransactions'));
await gasFrame.waitForFunction(() => {
  const t = document.querySelector('#itTableContainer');
  return t && t.querySelector('tbody tr') && document.getElementById('itFilterPart') && document.getElementById('itFilterPart').options.length > 1;
}, { timeout: 120000 });
await sleep(1000);

async function themeDump(pg) {
  return pg.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    const vars = {};
    ['--bg-primary','--bg-secondary','--bg-card','--bg-input','--primary','--text','--text-secondary','--border','--border-light'].forEach(v => {
      vars[v] = cs.getPropertyValue(v).trim();
    });
    const rules = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { el: null };
      const out = [];
      Array.from(document.styleSheets).forEach(sheet => {
        let rulesArr = [];
        try { rulesArr = Array.from(sheet.cssRules); } catch (e) { return; }
        rulesArr.forEach(r => {
          if (r.selectorText && r.style && el.matches(r.selectorText)) {
            out.push({ sel: r.selectorText, css: r.style.cssText });
          }
        });
      });
      const ecs = getComputedStyle(el);
      return { el: el.outerHTML.slice(0, 160), rules: out, color: ecs.color, bg: ecs.backgroundColor, fontSize: ecs.fontSize };
    };
    return {
      dataTheme: html.getAttribute('data-theme'),
      colorScheme: cs.colorScheme,
      vars,
      btnPrimary: rules('.btn-primary'),
      btnSm: rules('.btn.btn-sm'),
      iconBtn: rules('.icon-btn'),
      cardTitle: rules('.card-title'),
      badge: (() => {
        const b = document.querySelector('#itTableContainer tbody tr td:nth-child(3) .badge');
        return b ? b.outerHTML : null;
      })()
    };
  });
}

const cfT = await themeDump(cfPage);
const gasT = await themeDump(gasFrame);

console.log('================ CF ================');
console.log(JSON.stringify(cfT, null, 1));
console.log('================ GAS ================');
console.log(JSON.stringify(gasT, null, 1));

// ---------- view modal per-field ----------
async function openFirstView(pg) {
  await pg.evaluate(() => { const b = document.querySelector('#itTableContainer tbody tr button'); if (b) b.click(); });
  await sleep(400);
}
await openFirstView(cfPage);
await openFirstView(gasFrame);
async function viewFields(pg) {
  const ids = ['itViewTxnId', 'itViewType', 'itViewPartCode', 'itViewPartName', 'itViewQty', 'itViewUnitCost', 'itViewTotalCost', 'itViewRefNo', 'itViewRefType', 'itViewFromLoc', 'itViewToLoc', 'itViewProcessedBy', 'itViewProcessedAt', 'itViewCreatedAt', 'itViewRemarks'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    return out;
  }, ids);
}
const cfV = await viewFields(cfPage);
const gasV = await viewFields(gasFrame);
console.log('\n================ VIEW MODAL ================');
for (const k of Object.keys(cfV)) {
  const mark = cfV[k] === gasV[k] ? '==' : '<>';
  console.log(k.padEnd(22) + ' CF=' + JSON.stringify(cfV[k]).padEnd(28) + ' GAS=' + JSON.stringify(gasV[k]) + ' ' + mark);
}

// ---------- part dropdown + getSpareParts raw ----------
console.log('\n================ PART DROPDOWN ================');
const token = await cfPage.evaluate(() => localStorage.getItem('cmms_token') || '');
async function gasCall(action, data) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36' },
    body: JSON.stringify({ action, token, data: data || {} })
  });
  return { raw: await res.text() };
}
const cfOpts = await cfPage.evaluate(() => Array.from(document.getElementById('itFilterPart').options).map(o => o.value + '|' + o.textContent));
const gasOpts = await gasFrame.evaluate(() => Array.from(document.getElementById('itFilterPart').options).map(o => o.value + '|' + o.textContent));
const gasRaw = await gasCall('getSpareParts', {});
console.log('CF options (' + cfOpts.length + '): ' + JSON.stringify(cfOpts.slice(0, 4)) + ' ...');
console.log('GAS options (' + gasOpts.length + '): ' + JSON.stringify(gasOpts.slice(0, 4)) + ' ...');
console.log('direct GAS getSpareParts raw: ' + gasRaw.raw.slice(0, 300));
console.log('placeholder CF first: ' + JSON.stringify(cfOpts[0]) + ' | GAS first: ' + JSON.stringify(gasOpts[0]));

// ---------- CF export download test ----------
console.log('\n================ CF EXPORT TEST ================');
const cdp = await cfPage.createCDPSession();
await clearDir(CF_DIR);
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: CF_DIR });
const csvName = 'InventoryTransactions_' + new Date().toISOString().slice(0, 10) + '.csv';
for (let attempt = 1; attempt <= 3; attempt++) {
  await clearDir(CF_DIR);
  await cfPage.evaluate(() => { const b = Array.from(document.querySelectorAll('.card-actions button')).find(x => (x.getAttribute('onclick') || '').includes('exportCSV')); if (b) b.click(); });
  await sleep(400);
  await cfPage.evaluate(() => {
    if (!window.__toastCheck) {
      window.__toastCheck = [];
      const obs = new MutationObserver(muts => {
        for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) window.__toastCheck.push(n.textContent.trim());
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  });
  await sleep(400);
  const content = await waitForFile(CF_DIR, csvName, 10000);
  const toasts = await cfPage.evaluate(() => window.__toastCheck || []);
  const dl = path.join(process.env.USERPROFILE || 'C:/Users/afsar', 'Downloads');
  const stray = fs.existsSync(path.join(dl, csvName));
  console.log('attempt ' + attempt + ': file=' + (content ? content.length + ' bytes' : 'MISSING') + ' toasts=' + JSON.stringify(toasts) + ' strayInDownloads=' + stray);
  if (content) break;
  await sleep(1500);
}

await browser.close();
console.log('\nDONE');
