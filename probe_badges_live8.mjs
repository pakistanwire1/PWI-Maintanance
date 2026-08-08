import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/badge8_chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

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
console.log('loggedIn=', await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false));
await sleep(4000);
const r = await page.evaluate(async () => {
  const out = {};
  try {
    const notifs = await API.post('getNotifications', { pageSize: 100000 });
    const items = (notifs && (notifs.records || notifs.data)) || (Array.isArray(notifs) ? notifs : []);
    out.notifTotalReturned = items.length;
    out.notifAPIUnread = (notifs && notifs.unreadCount) || 0;
    const dist = {};
    let unreadStrict = 0, unreadLoose = 0, assignedToMe = 0, unreadAssignedToMe = 0;
    items.forEach(n => {
      const k = String(n.ReadStatus || '(empty)');
      dist[k] = (dist[k] || 0) + 1;
      if ((n.ReadStatus || '').toLowerCase() === 'unread') unreadStrict++;
      if ((n.ReadStatus || '').toLowerCase() !== 'read') unreadLoose++;
      const as = String(n.AssignedTo || '').toLowerCase();
      if (as === '' || as === 'pakistanwire1@gmail.com') { assignedToMe++; if ((n.ReadStatus || '').toLowerCase() !== 'read') unreadAssignedToMe++; }
    });
    out.notifStatusDist = dist;
    out.unreadStrict = unreadStrict;
    out.unreadLoose = unreadLoose;
    out.assignedToMe = assignedToMe;
    out.unreadAssignedToMe = unreadAssignedToMe;
  } catch (e) { out.notifErr = String(e); }
  try {
    const logs = await API.post('emailGetLogs', { filters: {} });
    const items = Array.isArray(logs) ? logs : [];
    const dist = {};
    items.forEach(l => { const k = String(l.Status || ''); dist[k] = (dist[k] || 0) + 1; });
    out.emailDist = dist;
    out.emailTotal = items.length;
  } catch (e) { out.emailErr = String(e); }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
