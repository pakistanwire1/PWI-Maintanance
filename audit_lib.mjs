import puppeteer from 'puppeteer-core';
import crypto from 'crypto';

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
export const CF_URL = 'https://pwi-maintanance.pages.dev';
export const EMAIL = 'supervisor@cmms.com';
export const PASSWORD = 'super123';
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launchBrowser() {
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,1000'] });
}

const norm = s => (s === null || s === undefined ? '' : String(s)).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();

function hookErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ at: Date.now(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', e => pageErrors.push({ at: Date.now(), text: e.message.slice(0, 300) }));
  return { consoleErrors, pageErrors };
}

export async function openGas(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport || { width: 1500, height: 1000 });
  const errs = hookErrors(page);
  const t0 = Date.now();
  await page.goto(GAS_URL, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  async function pick() {
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
      if (has) return f;
    }
    return null;
  }
  let frame = await pick();
  while (!frame && Date.now() - t0 < 120000) { await sleep(2000); frame = await pick(); }
  if (!frame) throw new Error('GAS: no app frame found');
  while (!(await frame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
  await frame.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    email.value = em; pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, EMAIL, PASSWORD);
  while (!(await frame.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
  await sleep(1500);
  await frame.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="reports"]'); if (i) i.click(); }).catch(() => {});
  await frame.waitForFunction(() => {
    const el = document.getElementById('rptType');
    return el && Array.from(el.options).some(o => o.value !== '');
  }, { timeout: 240000 });
  await sleep(1500);
  return { page, frame, errs, ctl: makeCtl(frame) };
}

export async function openCf(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport || { width: 1500, height: 1000 });
  const errs = hookErrors(page);
  const network = {};
  page.on('response', async resp => {
    try {
      const url = resp.url();
      if (!/api\/exec/.test(url) || resp.request().method() !== 'POST') return;
      const req = resp.request();
      let action = '';
      try { action = JSON.parse(req.postData() || '{}').action || ''; } catch (e) {}
      const body = await resp.text();
      let json = null;
      try { json = JSON.parse(body); } catch (e) { json = body; }
      if (action) network[action] = { status: resp.status(), at: Date.now(), body: json };
    } catch (e) {}
  });
  await page.goto(CF_URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#loginForm', { timeout: 60000 });
  await page.type('#loginEmail', EMAIL);
  await page.type('#loginPassword', PASSWORD);
  await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
  await page.waitForFunction(() => { try { return typeof window.navigateTo === 'function' && typeof window.Reports === 'object'; } catch (e) { return false; } }, { timeout: 60000 });
  await page.evaluate(() => navigateTo('reports'));
  await page.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 120000 });
  await sleep(1500);
  return { page, errs, network, ctl: makeCtl(page) };
}

function makeCtl(target) {
  const setVal = (id, value) => target.evaluate(({ id, value }) => { const el = document.getElementById(id); if (el) el.value = value; }, { id, value });
  const setSel = (id, value) => target.evaluate(({ id, value }) => { const el = document.getElementById(id); if (!el) return; el.value = value; el.dispatchEvent(new Event('change')); }, { id, value });
  async function waitNoLoading(id, timeoutMs = 120000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const st = await target.evaluate(i => {
        const el = document.getElementById(i);
        if (!el) return 'missing';
        const opts = Array.from(el.options);
        if (opts.length === 0) return 'empty';
        if (/loading/.test(opts.map(o => (o.textContent || '').toLowerCase()).join(' '))) return 'loading';
        return 'ready';
      }, id);
      if (st === 'ready') return true;
      if (st === 'missing') return false;
      await sleep(400);
    }
    return false;
  }
  async function waitOption(id, value, timeoutMs = 120000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const has = await target.evaluate(({ id, value }) => {
        const el = document.getElementById(id);
        return el ? Array.from(el.options).some(o => o.value === value) : false;
      }, { id, value });
      if (has) return true;
      await sleep(300);
    }
    return false;
  }
  const waitCascadeAfterDiv = async () => { await waitNoLoading('rptSection'); await waitNoLoading('rptDepartment'); await waitNoLoading('rptMachineNumber'); };
  const waitCascadeAfterSec = async () => { await waitNoLoading('rptDepartment'); await waitNoLoading('rptMachineNumber'); };
  const waitCascadeAfterDept = async () => { await waitNoLoading('rptMachineNumber'); };

  async function overlayShown() {
    return target.evaluate(() => { const o = document.getElementById('loadingOverlay'); return !!(o && o.classList.contains('show')); });
  }

  async function ensureIdle(timeoutMs = 240000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      while (await overlayShown()) await sleep(400);
      await sleep(1500);
      if (!(await overlayShown())) return true;
    }
    return false;
  }

  async function clickGenerate() {
    await target.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Generate Report/i.test(b.textContent || ''));
      if (btn) btn.click();
      else throw new Error('Generate button not found');
    });
  }

  async function waitOverlayCycle() {
    let loadingShown = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const vis = await target.evaluate(() => { const o = document.getElementById('loadingOverlay'); return !!(o && o.classList.contains('show')); });
      if (vis) { loadingShown = true; break; }
      await sleep(200);
    }
    const t1 = Date.now();
    while (Date.now() - t1 < 180000) {
      const vis = await target.evaluate(() => { const o = document.getElementById('loadingOverlay'); return !!(o && o.classList.contains('show')); });
      if (!vis) break;
      await sleep(400);
    }
    await sleep(1200);
    return { loadingShown };
  }

  async function readState() {
    return target.evaluate(() => {
      const norm2 = s => (s === null || s === undefined ? '' : String(s)).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
      const typeEl = document.getElementById('rptType');
      const sel = el => document.getElementById(el);
      const kpi = Array.from(document.querySelectorAll('#rptKpiCards .stat-card')).map(c => ({
        label: norm2((c.querySelector('.stat-info p') || {}).textContent),
        value: norm2((c.querySelector('.stat-info h3') || {}).textContent)
      }));
      const chartCards = document.querySelectorAll('#rptChartsGrid .rpt-chart-card');
      const tableRows = Array.from(document.querySelectorAll('#rptTableBody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => norm2(td.textContent))
      );
      return {
        type: typeEl ? typeEl.value : '',
        typeLabel: typeEl && typeEl.selectedIndex >= 0 ? norm2(typeEl.options[typeEl.selectedIndex].text) : '',
        rows: tableRows.length,
        recordCount: norm2((sel('rptRecordCount') || {}).textContent),
        title: norm2((sel('rptTableTitle') || {}).textContent),
        kpi,
        kpiVisible: (sel('rptKpiCards') || {}).style.display,
        tableVisible: (sel('rptTableCard') || {}).style.display,
        chartsVisible: (sel('rptChartsCard') || {}).style.display,
        chartCards: chartCards.length,
        chartTitles: Array.from(chartCards).map(c => norm2((c.querySelector('.rpt-chart-title') || {}).textContent)),
        chartFilled: Array.from(chartCards).filter(c => !!c.querySelector('svg, canvas, .rpt-no-data, google-visualization')).length,
        paginationPresent: !!document.querySelector('#rptTableCard nav, #rptTableCard .pagination, #rptTableCard [class*=pagination], #rptPrevBtn, #rptNextBtn'),
        toast: norm2((document.querySelector('#toast-container, .toast, [id*=toast]') || {}).textContent),
        tableRows
      };
    });
  }

  const readRptData = () => target.evaluate(() => {
    try { return window.rptData ? JSON.parse(JSON.stringify(window.rptData)) : null; } catch (e) { return null; }
  });

  const readOptions = id => target.evaluate(i => Array.from(document.getElementById(i).options).map(o => ({ value: o.value, label: o.label, text: o.text })), id);

  return { setVal, setSel, waitNoLoading, waitOption, waitCascadeAfterDiv, waitCascadeAfterSec, waitCascadeAfterDept, clickGenerate, waitOverlayCycle, ensureIdle, overlayShown, readState, readRptData, readOptions, target };
}

export function sha256(obj) {
  return crypto.createHash('sha256').update(typeof obj === 'string' ? obj : JSON.stringify(obj)).digest('hex');
}

export function deepDiff(a, b, path = '', out = [], depth = 0) {
  if (depth > 20) { out.push({ path, a: '...', b: '...' }); return out; }
  if (typeof a !== typeof b) { out.push({ path, a: typeof a, b: typeof b }); return out; }
  if (a === null || b === null || typeof a !== 'object') {
    if (a !== b) out.push({ path, a, b });
    return out;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) out.push({ path: path + '.<keys>', a: 'keys[' + ka.length + ']', b: 'keys[' + kb.length + ']' });
  const keys = new Set([...ka, ...kb]);
  for (const k of keys) {
    if (!(k in a)) { out.push({ path: path + '.' + k, a: '<missing>', b: b[k] }); continue; }
    if (!(k in b)) { out.push({ path: path + '.' + k, a: a[k], b: '<missing>' }); continue; }
    deepDiff(a[k], b[k], path + '.' + k, out, depth + 1);
  }
  return out;
}
