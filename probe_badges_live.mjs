import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/badge_chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));

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
if (!loggedIn) { await browser.close(); process.exit(1); }
await sleep(4000);

const result = await page.evaluate(async () => {
  const user = Session.getUser ? Session.getUser() : null;
  const email = user && user.email ? user.email : '';
  const out = { email: email, badgeIds: {}, sidebar: {}, notifStatusDist: {}, emailStatusDist: {}, emailSample: [], notifSample: [] };
  ['emailBadge', 'waBadge', 'notificationBadge', 'badge-openjobcard', 'badge-startjobcard', 'badge-closejobcard', 'badge-pendingjobcard', 'badge-approvejobcard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) out.badgeIds[id] = { text: el.textContent, display: getComputedStyle(el).display };
  });
  try { out.sidebar = await API.post('getSidebarCounts', { _userEmail: email }); } catch (e) { out.sidebar = { err: String(e) }; }
  try {
    const notifs = await API.post('getNotifications', {});
    const items = Array.isArray(notifs) ? notifs : (notifs && (notifs.records || notifs.data)) || [];
    const dist = {};
    items.forEach(n => { const k = String(n.ReadStatus || ''); dist[k] = (dist[k] || 0) + 1; });
    out.notifStatusDist = dist;
    out.notifSample = items.slice(0, 5).map(n => ({ id: n.NotificationID, rs: n.ReadStatus, assigned: n.AssignedTo, mod: n.Module }));
  } catch (e) { out.notifErr = String(e); }
  try {
    const logs = await API.post('emailGetLogs', { filters: {} });
    const items = Array.isArray(logs) ? logs : [];
    const dist = {};
    items.forEach(l => { const k = String(l.Status || ''); dist[k] = (dist[k] || 0) + 1; });
    out.emailStatusDist = dist;
    out.emailSample = items.slice(0, 5).map(l => ({ id: l.EmailID, status: l.Status, recipient: l.Recipient, dt: (l.DateTime || '').substring(0, 10) }));
  } catch (e) { out.emailErr = String(e); }
  return out;
});
console.log(JSON.stringify(result, null, 1));
await page.screenshot({ path: 'C:/Users/afsar/AppData/Local/Temp/opencode/badge_live_topbar.png' });
await browser.close();
