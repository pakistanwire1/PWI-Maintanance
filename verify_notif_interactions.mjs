import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'notifications.js');

const credsFile = 'C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json';
let EMAIL = 'pakistanwire1@gmail.com';
let PASSWORD = 'admin123';
try {
  const c = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  if (c.Email && c.Password) { EMAIL = c.Email; PASSWORD = c.Password; }
} catch (e) {}

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// In-memory snapshot + mutation mocking (NO production mutations happen).
let snapshot = null;          // { records: [...] } full 207-row dataset
let mutationDirty = false;
let lastMutation = null;      // { action, data } of the most recent mutation POST
const seenActions = {};

const MUT_ACTIONS = ['markNotificationRead', 'markAllNotificationsRead', 'deleteNotification', 'clearAllNotifications'];

async function clickRowAction(pg, actionName) {
  return pg.evaluate((actionName) => {
    const rows = Array.from(document.querySelectorAll('#notifTableContainer tbody tr'));
    for (const tr of rows) {
      const btn = Array.from(tr.querySelectorAll('.actions-cell .icon-btn'))
        .find(b => (b.getAttribute('onclick') || '').includes(actionName));
      if (btn) {
        const idCell = tr.querySelector('td:first-child');
        const id = idCell ? idCell.textContent.trim() : null;
        btn.click();
        return id;
      }
    }
    return null;
  }, actionName);
}

async function rowBadgeForId(pg, id) {
  return pg.evaluate((id) => {
    const rows = Array.from(document.querySelectorAll('#notifTableContainer tbody tr'));
    for (const tr of rows) {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 7 && tds[0].textContent.trim() === String(id)) {
        const badge = tds[6].querySelector('.badge');
        return { found: true, badgeClass: badge ? badge.className : null, badgeText: badge ? badge.textContent.trim() : tds[6].textContent.trim() };
      }
    }
    return { found: false };
  }, id);
}

async function rowCount(pg) {
  return pg.evaluate(() => document.querySelectorAll('#notifTableContainer tbody tr').length);
}

async function summaryCards(pg) {
  const ids = ['notifTotal', 'notifUnread', 'notifRead', 'notifTypes'];
  return pg.evaluate((list) => {
    const out = {};
    list.forEach(id => { const el = document.getElementById(id); out[id] = el ? el.textContent.trim() : null; });
    return out;
  }, ids);
}

async function topbarBadge(pg) {
  return pg.evaluate(() => {
    const b = document.getElementById('notificationBadge');
    return b ? { text: b.textContent.trim(), display: getComputedStyle(b).display } : null;
  });
}

async function confirmDialog(pg) {
  await pg.evaluate(() => {
    const btn = document.querySelector('#confirmModal .btn-danger');
    if (btn) btn.click();
  });
  await sleep(400);
}

async function emptyState(pg) {
  return pg.evaluate(() => {
    const h = document.querySelector('#notifTableContainer .empty-state h3');
    const p = document.querySelector('#notifTableContainer .empty-state p');
    return { h: h ? h.textContent.trim() : null, p: p ? p.textContent.trim() : null };
  });
}

let browser;
try {
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const cfPage = await browser.newPage();
  await cfPage.setViewport({ width: 1440, height: 900 });

  const cfConsoleErrors = [];
  const cfPageErrors = [];
  cfPage.on('console', m => { if (m.type() === 'error') cfConsoleErrors.push(m.text().slice(0, 300)); });
  cfPage.on('pageerror', e => cfPageErrors.push(String(e).slice(0, 300)));

  await cfPage.setRequestInterception(true);
  cfPage.on('request', req => {
    const url = req.url();
    if (url.includes('/js/pages/notifications.js')) {
      req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(LOCAL_JS, 'utf8') });
      return;
    }
    if (req.method() === 'POST' && url.includes('/api/exec')) {
      let d = null;
      try { d = JSON.parse(req.postData() || '{}'); } catch (e) {}
      const action = d ? d.action : null;
      const data = (d && d.data) || {};
      if (!action) { req.continue(); return; }
      seenActions[action] = (seenActions[action] || 0) + 1;
      if (action === 'getNotifications') {
        if (snapshot && mutationDirty) {
          const recs = snapshot.records;
          const unread = recs.filter(r => (r.ReadStatus || '').toLowerCase() !== 'read').length;
          req.respond({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ success: true, data: { records: recs, total: recs.length, unreadCount: unread } })
          });
          return;
        }
        req.continue();
        return;
      }
      if (MUT_ACTIONS.indexOf(action) > -1) {
        lastMutation = { action, data };
        if (action === 'markNotificationRead' && snapshot) {
          const id = data.id;
          snapshot.records.forEach(r => { if (String(r.NotificationID) === String(id)) r.ReadStatus = 'Read'; });
        } else if (action === 'markAllNotificationsRead' && snapshot) {
          snapshot.records.forEach(r => { r.ReadStatus = 'Read'; });
        } else if (action === 'deleteNotification' && snapshot) {
          const id = data.id;
          snapshot.records = snapshot.records.filter(r => String(r.NotificationID) !== String(id));
        } else if (action === 'clearAllNotifications') {
          snapshot = { records: [] };
        }
        mutationDirty = true;
        req.respond({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ success: true, data: snapshot ? snapshot.records : [] }) });
        return;
      }
      req.continue();
      return;
    }
    req.continue();
  });

  cfPage.on('response', async res => {
    if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
      try {
        let action = null;
        try { action = JSON.parse(res.request().postData() || '{}').action; } catch (e) {}
        if (action === 'getNotifications' && !mutationDirty) {
          const raw = await res.text().catch(() => 'null');
          const j = JSON.parse(raw);
          const recs = (j.data && j.data.records) || j.records;
          if (Array.isArray(recs) && recs.length >= 100) snapshot = { records: recs.map(r => ({ ...r })) };
        }
      } catch (e) {}
    }
  });

  await cfPage.evaluateOnNewDocument(() => {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(rs => { rs.forEach(r => { try { r.unregister(); } catch (e) {} }); });
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.register) {
        Object.defineProperty(navigator.serviceWorker, 'register', {
          value: function() { return Promise.resolve({ unregister: function() { return Promise.resolve(true); } }); },
          configurable: true
        });
      }
    } catch (e) {}
  });

  await cfPage.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
  await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
  await cfPage.type('#loginEmail', EMAIL);
  await cfPage.type('#loginPassword', PASSWORD);
  await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 90000 });
  await cfPage.waitForSelector('#pageContent', { timeout: 60000 });
  await cfPage.evaluate(() => navigateTo('notifications'));

  await cfPage.waitForFunction(() => {
    const t = document.querySelector('#notifTableContainer');
    return t && (t.querySelector('tbody tr') || t.querySelector('.empty-state'));
  }, { timeout: 120000 });
  const snapStart = Date.now();
  while (!(snapshot && snapshot.records.length >= 100)) {
    if (Date.now() - snapStart > 30000) {
      const diag = await cfPage.evaluate(() => ({
        rows: document.querySelectorAll('#notifTableContainer tbody tr').length,
        total: (document.getElementById('notifTotal') || {}).textContent
      })).catch(() => ({}));
      console.log('SNAPSHOT_TIMEOUT diagnostics: snapshot=' + JSON.stringify(snapshot ? snapshot.records.length : null) +
        ' seenActions=' + JSON.stringify(seenActions) + ' page=' + JSON.stringify(diag));
      throw new Error('snapshot capture timeout');
    }
    await sleep(300);
  }
  await sleep(1500);

  const total = snapshot.records.length;
  const unread = snapshot.records.filter(r => (r.ReadStatus || '').toLowerCase() !== 'read').length;
  const read = total - unread;

  // ===== A. initial state =====
  {
    const s = await summaryCards(cfPage);
    const b = await topbarBadge(cfPage);
    const expBadge = unread > 99 ? '99+' : String(unread);
    const ok = String(s.notifTotal) === String(total) && String(s.notifUnread) === String(unread) &&
               String(s.notifRead) === String(read) && b && b.text === expBadge;
    check('a_initial_state', ok, 'total=' + s.notifTotal + ' unread=' + s.notifUnread + ' read=' + s.notifRead +
          ' | snapshot total=' + total + ' unread=' + unread + ' read=' + read + ' | badge=' + JSON.stringify(b) + ' (exp ' + expBadge + ')');
  }

  // ===== B. re-entry resets filters (GAS fresh-load parity) =====
  {
    let ok = false; let detail = '';
    try {
      await cfPage.evaluate(() => {
        const el = document.getElementById('notifSearch');
        el.value = 'Job';
        el.dispatchEvent(new Event('keyup'));
      });
      await sleep(700);
      const filtered = await rowCount(cfPage);
      const filteredOk = filtered === Math.min(10, total) && filtered > 0;
      await cfPage.evaluate(() => navigateTo('dashboard'));
      await sleep(1200);
      await cfPage.evaluate(() => navigateTo('notifications'));
      await cfPage.waitForFunction(() => {
        const t = document.querySelector('#notifTableContainer');
        return t && (t.querySelector('tbody tr') || t.querySelector('.empty-state'));
      }, { timeout: 60000 });
      await sleep(1000);
      const s = await summaryCards(cfPage);
      const searchVal = await cfPage.evaluate(() => document.getElementById('notifSearch').value);
      const rows = await rowCount(cfPage);
      ok = filteredOk && searchVal === '' && rows === Math.min(10, total) && String(s.notifTotal) === String(total);
      detail = 'after filter rows=' + filtered + ' | after re-entry search="' + searchVal + '" rows=' + rows + ' total=' + s.notifTotal;
    } catch (e) { detail = 'exception: ' + e.message; }
    check('b_reentry_resets_filters', ok, detail);
  }

  // ===== C. mark one read =====
  {
    let ok = false; let detail = '';
    try {
      const id = await clickRowAction(cfPage, 'markRead');
      await sleep(1200);
      const rowState = id ? await rowBadgeForId(cfPage, id) : null;
      const s = await summaryCards(cfPage);
      const b = await topbarBadge(cfPage);
      const expUnread = unread - 1;
      const expBadge = expUnread > 99 ? '99+' : String(expUnread);
      const readOk = rowState && rowState.found && /badge-success/.test(rowState.badgeClass || '');
      const countersOk = String(s.notifTotal) === String(total) && String(s.notifUnread) === String(expUnread);
      const badgeOk = b && b.text === expBadge && b.display !== 'none';
      ok = id !== null && lastMutation && lastMutation.action === 'markNotificationRead' && String(lastMutation.data.id) === String(id) &&
           readOk && countersOk && badgeOk;
      detail = 'id=' + id + ' readBadge=' + (rowState ? rowState.badgeClass + '/' + rowState.badgeText : 'n/a') +
               ' unread=' + s.notifUnread + ' (exp ' + expUnread + ') total=' + s.notifTotal +
               ' badge=' + JSON.stringify(b) + ' mutation=' + (lastMutation ? lastMutation.action + ':' + lastMutation.data.id : 'none');
    } catch (e) { detail = 'exception: ' + e.message; }
    check('c_mark_read', ok, detail);
  }

  // ===== D. delete one =====
  {
    let ok = false; let detail = '';
    try {
      const id = await clickRowAction(cfPage, 'deleteItem');
      await sleep(400);
      await confirmDialog(cfPage);
      await sleep(1200);
      const s = await summaryCards(cfPage);
      const b = await topbarBadge(cfPage);
      const rowState = id ? await rowBadgeForId(cfPage, id) : null;
      const expTotal = total - 1;
      ok = id !== null && lastMutation && lastMutation.action === 'deleteNotification' && String(lastMutation.data.id) === String(id) &&
           rowState && !rowState.found && String(s.notifTotal) === String(expTotal);
      detail = 'id=' + id + ' rowGone=' + (rowState ? !rowState.found : 'n/a') + ' total=' + s.notifTotal + ' (exp ' + expTotal + ')' +
               ' badge=' + JSON.stringify(b) + ' mutation=' + (lastMutation ? lastMutation.action + ':' + lastMutation.data.id : 'none');
    } catch (e) { detail = 'exception: ' + e.message; }
    check('d_delete_row', ok, detail);
  }

  // ===== E. mark all read =====
  {
    let ok = false; let detail = '';
    try {
      await cfPage.evaluate(() => document.querySelector('.card-actions .btn-success').click());
      await sleep(400);
      await confirmDialog(cfPage);
      await sleep(1500);
      const s = await summaryCards(cfPage);
      const b = await topbarBadge(cfPage);
      const allRead = await cfPage.evaluate(() => {
        return Array.from(document.querySelectorAll('#notifTableContainer tbody tr')).every(tr => {
          const badge = tr.querySelectorAll('td')[6] && tr.querySelectorAll('td')[6].querySelector('.badge');
          return badge && /badge-success/.test(badge.className);
        });
      });
      ok = lastMutation && lastMutation.action === 'markAllNotificationsRead' && String(s.notifUnread) === '0' &&
           allRead && b && b.display === 'none';
      detail = 'unread=' + s.notifUnread + ' total=' + s.notifTotal + ' allRowsRead=' + allRead +
               ' badge=' + JSON.stringify(b) + ' mutation=' + (lastMutation ? lastMutation.action : 'none');
    } catch (e) { detail = 'exception: ' + e.message; }
    check('e_mark_all_read', ok, detail);
  }

  // ===== F. clear all =====
  {
    let ok = false; let detail = '';
    try {
      await cfPage.evaluate(() => document.querySelector('.card-actions .btn-danger').click());
      await sleep(400);
      await confirmDialog(cfPage);
      await sleep(1500);
      const s = await summaryCards(cfPage);
      const b = await topbarBadge(cfPage);
      const es = await emptyState(cfPage);
      const rows = await rowCount(cfPage);
      ok = lastMutation && lastMutation.action === 'clearAllNotifications' && String(s.notifTotal) === '0' &&
           String(s.notifUnread) === '0' && rows === 0 && es.h === 'No Data Found' && b && b.display === 'none';
      detail = 'total=' + s.notifTotal + ' unread=' + s.notifUnread + ' rows=' + rows +
               ' empty=' + JSON.stringify(es) + ' badge=' + JSON.stringify(b) + ' mutation=' + (lastMutation ? lastMutation.action : 'none');
    } catch (e) { detail = 'exception: ' + e.message; }
    check('f_clear_all', ok, detail);
  }

  // ===== G. no console/page errors =====
  {
    const apiErrs = cfConsoleErrors.filter(t => t.includes('[API]') || t.includes('Failed to'));
    const otherErrs = cfConsoleErrors.filter(t => !t.includes('[API]') && !t.includes('Failed to'));
    check('g_no_api_errors', apiErrs.length === 0, 'api console errors: ' + (apiErrs.length ? JSON.stringify(apiErrs) : '(none)'));
    check('h_no_page_errors', cfPageErrors.length === 0 && otherErrs.length === 0,
      'page errors: ' + (cfPageErrors.length ? JSON.stringify(cfPageErrors) : '(none)') + ' | other console: ' + (otherErrs.length ? JSON.stringify(otherErrs) : '(none)'));
  }

  console.log('===== SUMMARY =====');
  for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.detail);
  console.log('PASS: ' + results.filter(r => r.ok).length + '  FAIL: ' + failures.length);
  console.log('FAILED ITEMS: ' + (failures.length ? failures.join(', ') : '(none)'));
  console.log('RESULT: ' + (failures.length === 0 ? 'COMPLETE' : 'INCOMPLETE'));
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
