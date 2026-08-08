import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const outDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_final';
fs.mkdirSync(outDir, { recursive: true });
const OLD_NAV = fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/nav_old_utf8.js', 'utf8');
const report = {};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/final_profile2',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});
let page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

async function loadHome() {
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto', String(e).slice(0,100)));
  await sleep(5000);
  const onWelcome = await page.evaluate(() => {
    const w = document.getElementById('welcomePage');
    return w && getComputedStyle(w).display !== 'none';
  }).catch(() => false);
  if (onWelcome) {
    await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto2', String(e).slice(0,100)));
    await sleep(5000);
  }
}

async function loginIfNeeded() {
  for (let i = 0; i < 30; i++) {
    try {
      const state = await page.evaluate(() => {
        const loginPage = document.getElementById('loginPage');
        const app = document.getElementById('appContainer');
        const loginVisible = loginPage && getComputedStyle(loginPage).display !== 'none';
        const appVisible = app && getComputedStyle(app).display !== 'none';
        return { loginVisible, appVisible };
      });
      if (state.appVisible) return true;
      if (state.loginVisible) {
        await page.evaluate((em, pw) => {
          const email = document.getElementById('loginEmail');
          const pass = document.getElementById('loginPassword');
          email.value = em;
          pass.value = pw;
          email.dispatchEvent(new Event('input', { bubbles: true }));
          pass.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = document.getElementById('loginBtn');
          if (btn) { btn.click(); }
        }, creds.Email, creds.Password);
        await sleep(4000);
      }
    } catch (e) {}
    await sleep(2000);
  }
  return false;
}

async function openPanelAndInspect() {
  try { await page.evaluate(() => { if (window.Nav && Nav.toggleNotificationPanel) Nav.toggleNotificationPanel(); }); } catch (e) {}
  await sleep(5000);
  return await page.evaluate(() => {
    const panel = document.getElementById('notificationPanel');
    const footer = document.getElementById('notifPaginationFooter');
    const list = document.getElementById('notificationList');
    const countEl = document.getElementById('notifPanelCount');
    if (!footer) return { noFooter: true };
    const r = footer.getBoundingClientRect();
    return {
      panelOpen: panel ? panel.classList.contains('open') : null,
      listItemCount: list ? list.querySelectorAll('.notification-item').length : null,
      countText: countEl ? countEl.textContent : null,
      footerRect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      footerText: (footer.textContent || '').trim(),
      buttons: Array.from(footer.querySelectorAll('button')).map(b => b.textContent.trim()),
      numbered: Array.from(footer.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim())).map(b => b.textContent.trim()),
      footerHtml: footer.innerHTML.slice(0, 600)
    };
  }).catch(e => ({ err: String(e) }));
}

async function swState() {
  return await page.evaluate(async () => ({
    regs: await navigator.serviceWorker.getRegistrations().then(rs => rs.map(r => ({ state: r.active ? r.active.state : null, script: r.active ? r.active.scriptURL : null }))),
    caches: await caches.keys(),
    cachedNavHasLoop: await caches.match('/js/core/nav.js').then(r => r ? r.text().then(t => /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(t)) : null),
    servedNavHasLoop: await fetch('/js/core/nav.js').then(r => r.text()).then(t => /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(t))
  })).catch(e => ({ err: String(e) }));
}

// ===== PRE: load, login, count notifications =====
console.log('== PRE: login and check notification count ==');
await loadHome();
const login0 = await loginIfNeeded();
console.log('PRE logged in:', login0);
await sleep(3000);
const pre = await openPanelAndInspect();
console.log('PRE panel:', JSON.stringify(pre, null, 1));
// close panel
await page.evaluate(() => { if (window.Nav && Nav.toggleNotificationPanel) Nav.toggleNotificationPanel(); }).catch(() => {});

// ===== PHASE 1: inject OLD nav.js into ACTIVE cache, reload, capture strip =====
console.log('\n== PHASE 1: inject OLD nav.js into active cache ==');
const inject = await page.evaluate((oldNav) => {
  return caches.keys().then(keys => {
    const active = keys.includes('cmms-v48') ? 'cmms-v48' : keys[0];
    return caches.open(active).then(c => c.put('/js/core/nav.js', new Response(oldNav, { headers: { 'Content-Type': 'text/javascript' } })))
      .then(() => ({ cache: active, all: keys }));
  }).catch(e => ({ err: e.message }));
}, OLD_NAV);
console.log('P1 inject result:', JSON.stringify(inject));

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto3', String(e).slice(0,100)));
await sleep(8000);
const login1 = await loginIfNeeded();
console.log('P1 logged in:', login1);
await sleep(3000);
report.phase1 = await swState();
console.log('P1 sw state:', JSON.stringify(report.phase1, null, 1));

const p1 = await openPanelAndInspect();
report.phase1_panel = p1;
console.log('P1 panel (stale):', JSON.stringify(p1, null, 1));
await page.screenshot({ path: path.join(outDir, '1_stale_before.png') });
console.log('P1 footer has numbered strip:', p1.numbered.length >= 2);

// ===== PHASE 2: replace cache nav.js with LIVE fixed version, reload =====
console.log('\n== PHASE 2: purge stale nav entry, reload (browser re-fetches fixed nav.js) ==');
await page.evaluate(async () => {
  const keys = await caches.keys();
  for (const k of keys) {
    const c = await caches.open(k);
    await c.delete('/js/core/nav.js');
  }
  return 'purged';
}).catch(e => console.log('purge err', e.message));

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto4', String(e).slice(0,100)));
await sleep(8000);
const login2 = await loginIfNeeded();
console.log('P2 logged in:', login2);
await sleep(3000);
report.phase2 = await swState();
console.log('P2 sw state after purge:', JSON.stringify(report.phase2, null, 1));

const p2 = await openPanelAndInspect();
report.phase2_panel = p2;
console.log('P2 panel (fixed):', JSON.stringify(p2, null, 1));
await page.screenshot({ path: path.join(outDir, '2_after_update.png') });
console.log('P2 footer has numbered strip:', p2.numbered.length >= 2);

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log('\nDONE');
