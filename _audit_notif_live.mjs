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

const result = await page.evaluate(async () => {
  const out = {};
  const n = await API.post('getNotifications', {});
  const items = n.records || [];
  out.total = n.total;
  out.unreadCount = n.unreadCount;
  out.records = items.map(x => ({
    id: x.NotificationID,
    rs: x.ReadStatus,
    mod: x.Module,
    type: x.NotificationType,
    pri: x.Priority,
    created: x.CreatedDateTime,
    title: (x.Title || '').slice(0, 60),
    assigned: x.AssignedTo
  }));
  return out;
});
const items = result.records || [];
const unread = items.filter(x => String(x.rs).toLowerCase() !== 'read');
console.log('TOTAL(sentinel):', result.total, ' unreadCount(sentinel):', result.unreadCount, ' fetched:', items.length);
console.log('--- ALL (sorted by created desc already) ---');
items.forEach(x => console.log(JSON.stringify(x)));
console.log('=== UNREAD SUMMARY (first 50 fetched) ===');
console.log('unread in first 50:', unread.length);
console.log('=== UNREAD BY MODULE ===');
const byMod = {};
unread.forEach(x => { byMod[x.mod] = (byMod[x.mod] || 0) + 1; });
console.log(JSON.stringify(byMod, null, 1));
console.log('=== UNREAD BY TYPE ===');
const byType = {};
unread.forEach(x => { byType[x.type] = (byType[x.type] || 0) + 1; });
console.log(JSON.stringify(byType, null, 1));
await browser.close();
