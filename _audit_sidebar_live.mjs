import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => {});
await sleep(4000);
const onWelcome = await page.evaluate(() => { const w = document.getElementById('welcomePage'); return w && getComputedStyle(w).display !== 'none'; }).catch(() => false);
if (onWelcome) {
  await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => {});
  await sleep(4000);
}
for (let i = 0; i < 30; i++) {
  const st = await page.evaluate(() => {
    const lp = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    return { lv: lp && getComputedStyle(lp).display !== 'none', av: app && getComputedStyle(app).display !== 'none' };
  }).catch(() => ({}));
  if (st.av) break;
  if (st.lv) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
    await sleep(5000);
  }
  await sleep(1500);
}
const loggedIn = await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false);
if (!loggedIn) { console.log('NOT LOGGED IN'); await browser.close(); process.exit(1); }
await sleep(3000);

const result = await page.evaluate(async () => {
  const out = {};
  const jc = await API.post('getJobCards', { page: 1, pageSize: 5000 });
  const rows = jc.records || [];
  out.jcTotal = jc.total;
  out.fetched = rows.length;
  const cs = {}; const as = {};
  rows.forEach(x => {
    const s = String(x.CurrentStatus || x.Status || '(empty)');
    cs[s] = (cs[s] || 0) + 1;
    const a = String(x.ApprovalStatus || '(none)');
    as[a] = (as[a] || 0) + 1;
  });
  out.currentStatusDist = cs;
  out.approvalStatusDist = as;
  let openCount = 0, runningCount = 0, closedCount = 0, pendingCount = 0, approvedCount = 0;
  rows.forEach(jc2 => {
    const s = (jc2.CurrentStatus || jc2.Status || '').toLowerCase();
    const isClosed = (s === 'closed' || s === 'approved');
    const isOpen = (s === 'open');
    const isRunning = (s === 'running' || s === 'in progress');
    const isPending = (s === 'pending');
    const a2 = (jc2.ApprovalStatus || '').toLowerCase();
    const isApproved = (a2 === 'approved');
    if (isApproved) approvedCount++;
    else if (isPending || (isClosed && !isApproved)) pendingCount++;
    else if (isOpen) openCount++;
    else if (isRunning) runningCount++;
    else if (isClosed) closedCount++;
  });
  out.computedWithBadgeLogic = { openCount, runningCount, closedCount, pendingCount, approvedCount };
  const sc = await API.post('getSidebarCounts', { _userEmail: Session.getUser().email });
  out.sidebarCounts = sc && sc.data ? sc.data : sc;
  const sidebar = {};
  document.querySelectorAll('#mainSidebar a[data-route]').forEach(a => {
    const r = a.getAttribute('data-route');
    const b = a.querySelector('.sidebar-badge');
    sidebar[r] = b ? { text: b.textContent, display: getComputedStyle(b).display } : null;
  });
  out.sidebarRendered = sidebar;
  return out;
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
