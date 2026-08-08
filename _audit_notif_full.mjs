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
await sleep(2000);

const all = await page.evaluate(async () => {
  const out = [];
  for (let pageNum = 1; pageNum <= 5; pageNum++) {
    const n = await API.post('getNotifications', { page: pageNum, pageSize: 100 });
    const items = (n.records || []).map(x => ({
      id: x.NotificationID,
      rs: x.ReadStatus,
      mod: x.Module,
      type: x.NotificationType,
      pri: x.Priority,
      created: x.CreatedDateTime,
      title: (x.Title || '').slice(0, 70),
      assigned: x.AssignedTo
    }));
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
});
fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/notifs_full.json', JSON.stringify(all, null, 1));

const unread = all.filter(x => String(x.rs).toLowerCase() !== 'read');
const now = new Date();
function daysAgo(d) { return (now - new Date(d)) / 86400000; }
console.log('total fetched:', all.length, ' unread:', unread.length);
const candidates = {
  unread_all: unread.length,
  unread_last7d: unread.filter(x => daysAgo(x.created) <= 7).length,
  unread_last14d: unread.filter(x => daysAgo(x.created) <= 14).length,
  unread_last30d: unread.filter(x => daysAgo(x.created) <= 30).length,
  unread_top50: unread.filter(x => all.indexOf(x) < 50).length,
  unread_action_required: unread.filter(x => x.type === 'Warning' || x.type === 'Approval' || x.type === 'Critical' || x.type === 'Reminder').length,
  unread_warning_approval_critical: unread.filter(x => x.type === 'Warning' || x.type === 'Approval' || x.type === 'Critical').length
};
console.log(JSON.stringify(candidates, null, 1));
console.log('--- unread date spread (min..max) ---');
const dates = unread.map(x => new Date(x.created).getTime()).sort((a,b)=>a-b);
console.log('oldest:', new Date(dates[0]).toISOString(), ' newest:', new Date(dates[dates.length-1]).toISOString());
console.log('--- oldest 10 unread ---');
unread.slice(-10).forEach(x => console.log(x.created, x.type, x.title));
console.log('--- unread by type ---');
const byT = {};
unread.forEach(x => { byT[x.type] = (byT[x.type] || 0) + 1; });
console.log(JSON.stringify(byT, null, 1));
await browser.close();
