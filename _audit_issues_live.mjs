import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text().slice(0, 300)); });

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto', String(e).slice(0,100)));
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
console.log('loggedIn=', loggedIn);
if (!loggedIn) { console.log('PAGEERRORS', JSON.stringify(pageErrors)); await browser.close(); process.exit(1); }
await sleep(3000);

const result = await page.evaluate(async () => {
  const out = {};
  const user = Session.getUser ? Session.getUser() : null;
  out.user = user ? { email: user.email, role: user.role, name: user.name } : null;
  const email = user && user.email ? user.email : '';

  try {
    const dash = await API.post('getDashboardData', { filter: 'all', department: '' });
    out.dashboard = {
      totalMachines: dash.totalMachines,
      runningMachines: dash.runningMachines,
      breakdownMachines: dash.breakdownMachines,
      idleMachines: dash.idleMachines,
      openJobs: dash.openJobs,
      runningJobs: dash.runningJobs,
      closedJobs: dash.closedJobs,
      pendingJobs: dash.pendingJobs,
      approvedJobs: dash.approvedJobs,
      waitingJobs: dash.waitingJobs,
      totalJobCardsInSheet: dash._debug && dash._debug.totalJobCardsInSheet
    };
  } catch (e) { out.dashboardErr = String(e); }

  try {
    const machines = await API.post('getMachines', {});
    const list = Array.isArray(machines) ? machines : (machines.records || []);
    const statusDist = {};
    list.forEach(m => { const k = String(m.Status || '(empty)'); statusDist[k] = (statusDist[k] || 0) + 1; });
    out.machines = { total: list.length, statusDist: statusDist, sample: list.slice(0, 5).map(m => ({ id: m.MachineID, code: m.MachineCode, name: m.MachineName, status: m.Status })) };
  } catch (e) { out.machinesErr = String(e); }

  try {
    const jc = await API.post('getJobCards', {});
    const list = jc.records || [];
    const statusDist = {};
    list.forEach(j => { const k = String(j.CurrentStatus || '(empty)'); statusDist[k] = (statusDist[k] || 0) + 1; });
    out.jobcards = { total: jc.total, statusDist: statusDist };
    out.jobcardsByMachineStatus = list.map(j => ({ no: j.JobCardNo, machine: j.Machine, machineId: j.MachineID, status: j.CurrentStatus, approval: j.ApprovalStatus }));
  } catch (e) { out.jobcardsErr = String(e); }

  try {
    const bc = await API.post('getSidebarCounts', { _userEmail: email });
    out.sidebarCounts = bc;
  } catch (e) { out.sidebarErr = String(e); }

  try {
    const n = await API.post('getNotifications', {});
    const items = n.records || [];
    const dist = {};
    items.forEach(x => { const k = String(x.ReadStatus || '(empty)'); dist[k] = (dist[k] || 0) + 1; });
    out.notifications = { total: n.total, unreadCount: n.unreadCount, readStatusDist: dist };
  } catch (e) { out.notifErr = String(e); }

  try {
    const l = await API.post('emailGetLogs', { filters: {} });
    const items = Array.isArray(l) ? l : (l.records || []);
    const dist = {};
    items.forEach(x => { const k = String(x.Status || '(empty)'); dist[k] = (dist[k] || 0) + 1; });
    out.emails = { total: items.length, statusDist: dist };
  } catch (e) { out.emailErr = String(e); }

  try {
    const ep = await API.post('emailGetPanelData', {});
    out.emailPanel = ep;
  } catch (e) { out.emailPanelErr = String(e); }

  try {
    const ub = await API.post('getUnreadCount', { _userEmail: email });
    out.getUnreadCount = ub;
  } catch (e) { out.unreadErr = String(e); }

  return out;
});
console.log(JSON.stringify(result, null, 1));
console.log('PAGEERRORS', JSON.stringify(pageErrors));
await browser.close();
