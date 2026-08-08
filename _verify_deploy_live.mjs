import puppeteer from 'puppeteer-core';
import fs from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev/?v=' + Date.now();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });

async function login(page) {
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
  const loggedIn = await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false);
  if (!loggedIn) throw new Error('NOT LOGGED IN');
}

async function readBadges(page) {
  return page.evaluate(() => {
    const out = {};
    ['openjobcard', 'startjobcard', 'closejobcard', 'pendingjobcard', 'approvejobcard', 'pm', 'inventory', 'goodsreceipt'].forEach(k => {
      const el = document.getElementById('badge-' + k);
      out[k] = el ? { text: el.textContent, display: getComputedStyle(el).display } : null;
    });
    ['notificationBadge', 'emailBadge', 'waBadge'].forEach(k => {
      const el = document.getElementById(k);
      out[k] = el ? { text: el.textContent, display: getComputedStyle(el).display } : null;
    });
    const allItem = document.querySelector('#mainSidebar .sidebar-item[data-page="jobcards"]');
    out.allJobCards = allItem ? { display: getComputedStyle(allItem).display, visible: allItem.offsetParent !== null } : null;
    return out;
  });
}

async function apiChecks(page) {
  return page.evaluate(async () => {
    const out = {};
    const sc = await API.post('getSidebarCounts', { _userEmail: Session.getUser().email });
    out.sidebarCounts = (sc && sc.data) ? sc.data : sc;
    const n = await API.post('getNotifications', { pageSize: 100000 });
    const items = (n && n.records) || [];
    const uniq = {};
    items.forEach(x => { if (String(x.ReadStatus).toLowerCase() !== 'read') uniq[String(x.NotificationID)] = true; });
    out.notifTotal = n && n.total;
    out.notifUnreadCount = n && n.unreadCount;
    out.notifUniqueUnread = Object.keys(uniq).length;
    out.notifRowsFetched = items.length;
    return out;
  });
}

async function collectErrors(page) {
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('pageerror: ' + String(e && e.message).slice(0, 300)));
  return errs;
}

const result = {};

// ---------- DESKTOP ----------
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setCacheEnabled(false);
  const errs = await collectErrors(page);
  await login(page);
  await sleep(3000);
  let api = {};
  for (let i = 0; i < 20; i++) {
    api = await apiChecks(page).catch(() => ({}));
    if (api.sidebarCounts && api.sidebarCounts.unreadNotifications !== undefined) break;
    await sleep(1500);
  }
  const badges = await readBadges(page);

  // navigate to All Job Cards
  let navOk = false;
  try {
    await page.evaluate(() => navigateTo('jobcards'));
    await sleep(2500);
    navOk = await page.evaluate(() => {
      const el = document.getElementById('jcTableContainer');
      return !!el && getComputedStyle(el).display !== 'none';
    }).catch(() => false);
  } catch (e) { navOk = false; }
  await page.evaluate(() => navigateTo('dashboard')).catch(() => {});
  await sleep(2000);

  // regression: open Notifications page, badge must stay 27
  let notifPageBadge = null;
  try {
    await page.evaluate(() => navigateTo('notifications'));
    await sleep(4000);
    notifPageBadge = await page.evaluate(() => {
      const el = document.getElementById('notificationBadge');
      return el ? { text: el.textContent, display: getComputedStyle(el).display } : null;
    }).catch(() => null);
  } catch (e) { notifPageBadge = null; }
  await page.evaluate(() => navigateTo('dashboard')).catch(() => {});
  await sleep(1500);

  result.desktop = { badges, api, allJobCardsNavigates: navOk, notifPageBadge, errors: errs.slice() };
  await page.close();
}

// ---------- MOBILE 390 ----------
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setCacheEnabled(false);
  const errs = await collectErrors(page);
  await login(page);
  await sleep(3000);
  let api = {};
  for (let i = 0; i < 20; i++) {
    api = await apiChecks(page).catch(() => ({}));
    if (api.sidebarCounts && api.sidebarCounts.unreadNotifications !== undefined) break;
    await sleep(1500);
  }
  const badges = await readBadges(page);
  result.mobile390 = { badges, api, errors: errs.slice() };
  await page.close();
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
