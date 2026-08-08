import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/badge7_chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito'] });
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
const loggedIn = await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false);
console.log('loggedIn=', loggedIn);
const snap = async (tag) => {
  const r = await page.evaluate(() => {
    const ids = ['emailBadge', 'waBadge', 'notificationBadge'];
    const o = {};
    ids.forEach(id => { const el = document.getElementById(id); if (el) o[id] = { t: el.textContent, d: getComputedStyle(el).display }; });
    return o;
  });
  console.log('[' + tag + ']', JSON.stringify(r));
};
for (const secs of [5, 15, 30, 45]) {
  await sleep(secs === 5 ? 5000 : 10000);
  await snap('t+' + secs + 's');
}
await page.screenshot({ path: 'C:/Users/afsar/AppData/Local/Temp/opencode/badge_live_natural.png' });
await browser.close();
