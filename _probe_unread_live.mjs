import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev/?v=' + Date.now();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(4000);
const onWelcome = await page.evaluate(() => { const w = document.getElementById('welcomePage'); return !!w && getComputedStyle(w).display !== 'none'; }).catch(() => false);
if (onWelcome) {
  await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await sleep(4000);
}
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => {
    const lp = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    return { lv: !!lp && getComputedStyle(lp).display !== 'none', av: !!app && getComputedStyle(app).display !== 'none' };
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
await sleep(3000);
const result = await page.evaluate(async () => {
  const out = {};
  const n = await API.post('getNotifications', { pageSize: 100000 });
  const items = (n && n.records) || [];
  const unread = items.filter(x => String(x.ReadStatus).toLowerCase() !== 'read');
  const ids = {};
  unread.forEach(x => {
    const id = String(x.NotificationID === undefined || x.NotificationID === null ? '(empty)' : x.NotificationID);
    ids[id] = (ids[id] || 0) + 1;
  });
  const counts = Object.entries(ids).sort((a, b) => b[1] - a[1]);
  out.rows = items.length;
  out.total = n && n.total;
  out.apiUnreadCount = n && n.unreadCount;
  out.unreadRows = unread.length;
  out.uniqueUnreadIds = Object.keys(ids).length;
  out.emptyIdRows = ids['(empty)'] || 0;
  out.multiRowIds = counts.filter(c => c[1] > 1);
  out.sampleUnread = unread.slice(0, 5).map(x => ({ id: x.NotificationID, rs: x.ReadStatus, mod: x.Module, t: x.NotificationType }));
  out.idSetSample = counts.slice(0, 15);
  return out;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
