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
  try {
    const pm = await API.post('getPMRecords', {});
    const rows = Array.isArray(pm) ? pm : (pm.records || pm.data || []);
    out.pmRawKeys = rows.length ? Object.keys(rows[0]) : [];
    out.pmTotal = rows.length;
    const today = new Date();
    const later = new Date(today.getTime() + 7 * 86400000);
    let overdue = 0, upcoming = 0, completed = 0, other = 0;
    const dist = {};
    rows.forEach(x => {
      const st = String(x.Status || x.PMStatus || '(none)');
      dist[st] = (dist[st] || 0) + 1;
      const dueStr = x.NextDueDate || x.DueDate || '';
      const due = new Date(dueStr);
      if (st.toLowerCase() === 'completed' || st.toLowerCase() === 'done') { completed++; return; }
      if (isNaN(due)) { other++; return; }
      if (due < today) overdue++;
      else if (due <= later) upcoming++;
      else other++;
    });
    out.pmStatusDist = dist;
    out.pmComputed = { overdue, upcoming, completed, other };
    out.sample = rows.slice(0, 3).map(x => ({ no: x.PMNumber, title: x.Title, status: x.Status, due: x.NextDueDate || x.DueDate }));
  } catch (e) { out.pmErr = String(e); }
  const sc = await API.post('getSidebarCounts', { _userEmail: Session.getUser().email });
  out.sidebarCounts = sc && sc.data ? sc.data : sc;
  return out;
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
