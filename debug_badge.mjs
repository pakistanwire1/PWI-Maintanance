import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(m);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 300)));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', 'supervisor@cmms.com');
await page.type('#loginPassword', 'super123');
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(20000);

const token = await page.evaluate(() => localStorage.getItem('cmms_token'));
log('token: ' + String(token).slice(0, 30) + '...');

const counts = await page.evaluate(() => {
  const ids = ['notificationBadge', 'emailBadge', 'waBadge', 'badge-openjobcard', 'badge-startjobcard', 'badge-closejobcard', 'badge-pendingjobcard', 'badge-approvejobcard', 'badge-pm', 'badge-inventory', 'badge-goodsreceipt'];
  const out = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) out[id] = { text: el.textContent, display: getComputedStyle(el).display };
  });
  return out;
});
log('BADGES: ' + JSON.stringify(counts));

const apiResp = await page.evaluate(async () => {
  const email = (Session.getUser && Session.getUser().email) || (window.__currentUser && window.__currentUser.email) || '';
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getSidebarCounts', token: localStorage.getItem('cmms_token'), data: { _userEmail: email } })
  });
  return resp.json();
});
log('API getSidebarCounts: ' + JSON.stringify(apiResp).slice(0, 800));

const notif = await page.evaluate(async () => {
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getNotifications', token: localStorage.getItem('cmms_token'), data: { pageSize: 100000 } })
  });
  return resp.json();
});
log('API getNotifications: total=' + notif.data && notif.data.total ? notif.data.total : JSON.stringify(notif).slice(0, 300) + ' unreadCount=' + (notif.data && notif.data.unreadCount));

const unread = await page.evaluate(async () => {
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getUnreadCount', token: localStorage.getItem('cmms_token'), data: {} })
  });
  return resp.json();
});
log('API getUnreadCount: ' + JSON.stringify(unread).slice(0, 300));

const notifDetail = await page.evaluate(async () => {
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getNotifications', token: localStorage.getItem('cmms_token'), data: { pageSize: 100000 } })
  });
  const j = await resp.json();
  const recs = (j.data && j.data.records) || [];
  let unreadRole = 0, emptyAssigned = 0, unreadEmpty = 0;
  const byModule = {};
  recs.forEach(function(r) {
    const rs = (r.ReadStatus || '').toLowerCase();
    if (rs !== 'read') unreadRole++;
    if (!r.AssignedTo) emptyAssigned++;
    if (rs !== 'read' && !r.AssignedTo) unreadEmpty++;
    byModule[r.Module] = (byModule[r.Module] || 0) + 1;
  });
  return { total: recs.length, unreadRole: unreadRole, emptyAssigned: emptyAssigned, unreadEmptyAssigned: unreadEmpty, byModule: byModule, sample: recs.slice(0, 2).map(function(r) { return { title: r.Title, module: r.Module, assigned: r.AssignedTo, read: r.ReadStatus }; }) };
});
log('API getNotifications detail: ' + JSON.stringify(notifDetail).slice(0, 1200));

const emailStats = await page.evaluate(async () => {
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'emailGetDashboardStats', token: localStorage.getItem('cmms_token'), data: {} })
  });
  return resp.json();
});
log('API emailGetDashboardStats: ' + JSON.stringify(emailStats).slice(0, 500));

log('CONSOLE ERRORS: ' + JSON.stringify(consoleErrors));
await browser.close();
