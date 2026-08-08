import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const outDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_repro3';
fs.mkdirSync(outDir, { recursive: true });
const OLD_NAV = fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/nav_old_utf8.js', 'utf8');
const report = {};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/repro_profile3',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});
let page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

async function loginIfNeeded() {
  for (let i = 0; i < 25; i++) {
    try {
      const state = await page.evaluate(() => {
        const loginForm = document.getElementById('loginForm');
        const loginPage = document.getElementById('loginPage');
        const app = document.getElementById('appContainer');
        const loginVisible = loginForm && loginPage && getComputedStyle(loginPage).display !== 'none';
        const appVisible = app && getComputedStyle(app).display !== 'none';
        return { loginVisible, appVisible };
      });
      if (state.appVisible) return true;
      if (state.loginVisible) {
        await page.evaluate((em, pw) => {
          const email = document.getElementById('loginEmail') || document.getElementById('email');
          const pass = document.getElementById('loginPassword') || document.getElementById('password');
          if (email) email.value = em;
          if (pass) pass.value = pw;
          document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }, creds.Email, creds.Password);
      }
    } catch (e) {}
    await sleep(2000);
  }
  return false;
}

async function openPanelAndInspect() {
  try { await page.evaluate(() => { if (window.Nav && Nav.toggleNotificationPanel) Nav.toggleNotificationPanel(); }); } catch (e) {}
  await sleep(4000);
  return await page.evaluate(() => {
    const panel = document.getElementById('notificationPanel');
    const list = document.getElementById('notificationList');
    const footer = document.getElementById('notifPaginationFooter');
    if (!footer) return { noFooter: true };
    const r = footer.getBoundingClientRect();
    return {
      panelOpen: panel ? panel.classList.contains('open') : null,
      listItemCount: list ? list.querySelectorAll('.notification-item').length : -1,
      footerRect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      footerText: (footer.textContent || '').trim(),
      buttons: Array.from(footer.querySelectorAll('button')).map(b => b.textContent.trim()),
      numbered: Array.from(footer.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim())).map(b => b.textContent.trim()),
      footerHtml: footer.innerHTML.slice(0, 500)
    };
  }).catch(e => ({ err: String(e) }));
}

// ===== STEP A: normal visit, login, open panel — confirm footer populates with CURRENT fixed code =====
console.log('== STEP A: normal visit (SW enabled, current code) ==');
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto', String(e).slice(0,100)));
await sleep(6000);
const loginA = await loginIfNeeded();
console.log('A logged in:', loginA);
await sleep(3000);
const panelA = await openPanelAndInspect();
console.log('A panel (CURRENT code):', JSON.stringify(panelA, null, 1));
await page.screenshot({ path: path.join(outDir, 'A_current_code.png') });
report.current = panelA;

// what nav.js does the browser actually execute now?
const navNow = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  return { scripts };
}).catch(e => ({ err: String(e) }));
console.log('A scripts:', JSON.stringify(navNow));
report.scripts = navNow;

// close panel
try { await page.evaluate(() => { if (window.Nav && Nav.toggleNotificationPanel) Nav.toggleNotificationPanel(); }); } catch (e) {}
await sleep(1500);

// ===== STEP B: inject OLD nav.js into SW cache, reload, open panel =====
console.log('\n== STEP B: inject OLD nav.js into cmms-v47 cache, then reload ==');
const inject = await page.evaluate((oldNav) => {
  return caches.open('cmms-v47').then(c => c.put('/js/core/nav.js', new Response(oldNav, { headers: { 'Content-Type': 'text/javascript' } })))
    .then(() => 'OK').catch(e => 'ERR: ' + e.message);
}, OLD_NAV);
console.log('inject:', inject);
report.inject = inject;

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto2', String(e).slice(0,100)));
await sleep(6000);
const loginB = await loginIfNeeded();
console.log('B logged in:', loginB);
await sleep(3000);

// verify the browser now executes OLD nav.js: check served bytes + loop presence
const navB = await page.evaluate(async () => {
  const r = await fetch('/js/core/nav.js');
  const txt = await r.text();
  return { bytes: txt.length, hasNumberedLoop: /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(txt) };
}).catch(e => ({ err: String(e) }));
console.log('B nav.js served:', JSON.stringify(navB));
report.servedAfterInject = navB;

const panelB = await openPanelAndInspect();
console.log('B panel (OLD code via SW cache):', JSON.stringify(panelB, null, 1));
await page.screenshot({ path: path.join(outDir, 'B_stale_cache.png') });
report.stale = panelB;

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log('\nDONE');
