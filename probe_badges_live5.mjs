import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/badge5_chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') console.log(`[console:${t}]`, m.text().slice(0, 400)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 400)));

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
await sleep(3000);

// Hook console.error to capture Badge.refresh failure
await page.evaluate(() => {
  window.__badgeErrors = [];
  const orig = console.error;
  console.error = function(...args) { window.__badgeErrors.push(args.map(a => String(a).slice(0,200)).join(' ')); try { orig.apply(console, args); } catch(e){} };
});
const res = await page.evaluate(async () => {
  const out = { timer: !!Badge._timer };
  try {
    const p = Badge.refresh();
    out.promiseType = typeof p;
    if (p && p.then) {
      await p;
      out.resolved = true;
    } else {
      out.resolved = false;
    }
  } catch (e) {
    out.threw = String(e);
    out.stack = e.stack ? String(e.stack).slice(0, 500) : '';
  }
  await new Promise(r => setTimeout(r, 1500));
  out.badges = {};
  ['emailBadge', 'waBadge', 'notificationBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) out.badges[id] = { t: el.textContent, d: getComputedStyle(el).display };
  });
  out.badgeErrors = window.__badgeErrors || [];
  return out;
});
console.log('RESULT:', JSON.stringify(res, null, 1));
await browser.close();
