import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const outDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_repro';
fs.mkdirSync(outDir, { recursive: true });

const OLD_NAV = fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/nav_old_utf8.js', 'utf8');
const report = {};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/repro_profile2',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});

let page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Track what nav.js actually executes in the page
await page.evaluateOnNewDocument((oldNav) => {
  window.__navLoaded = null;
}, OLD_NAV);

async function getNavSource() {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      if (window.__navCheckDone) return resolve(window.__navCheck);
      const obs = new MutationObserver(() => {
        if (window.__navCheckDone) { obs.disconnect(); resolve(window.__navCheck); }
      });
      setTimeout(() => { obs.disconnect(); resolve(window.__navCheck || null); }, 8000);
    });
  }).catch(() => null);
}

// We detect which nav.js is loaded by hooking: after page load, fetch current nav.js from the SW/cache path
async function fetchNavAsBrowser() {
  return await page.evaluate(async () => {
    const r = await fetch('/js/core/nav.js');
    const txt = await r.text();
    return { served: r.status, bytes: txt.length, hasNumberedLoop: /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(txt) };
  }).catch(e => ({ err: String(e) }));
}

async function loginIfNeeded() {
  for (let i = 0; i < 20; i++) {
    try {
      const hasLogin = await page.evaluate(() => !!document.getElementById('loginForm') && getComputedStyle(document.getElementById('loginPage')).display !== 'none');
      if (!hasLogin) {
        const app = await page.evaluate(() => !!document.getElementById('appContainer'));
        if (app) return true;
      } else {
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
  return await page.evaluate(() => !!document.getElementById('appContainer')).catch(() => false);
}

async function openPanelAndInspect() {
  try { await page.evaluate(() => { if (window.Nav && Nav.toggleNotificationPanel) Nav.toggleNotificationPanel(); }); } catch (e) {}
  await sleep(4000);
  const d = await page.evaluate(() => {
    const panel = document.getElementById('notificationPanel');
    const footer = document.getElementById('notifPaginationFooter');
    if (!footer) return { noFooter: true };
    const r = footer.getBoundingClientRect();
    const cs = getComputedStyle(footer);
    const chain = [];
    let n = footer; while (n && chain.length < 6) { chain.push('#' + n.id || n.className || n.tagName); n = n.parentElement; }
    return {
      panelOpen: panel ? panel.classList.contains('open') : null,
      panelRect: panel ? [Math.round(panel.getBoundingClientRect().x), Math.round(panel.getBoundingClientRect().y), Math.round(panel.getBoundingClientRect().width), Math.round(panel.getBoundingClientRect().height)] : null,
      footerRect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      footerText: (footer.textContent || '').trim(),
      buttons: Array.from(footer.querySelectorAll('button')).map(b => b.textContent.trim()),
      numbered: Array.from(footer.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim())).map(b => b.textContent.trim()),
      footerHtml: footer.innerHTML.slice(0, 400),
      position: cs.position, zIndex: cs.zIndex, parentChain: chain.join(' > ')
    };
  }).catch(e => ({ err: String(e) }));
  return d;
}

// ==================== PHASE 1: FIRST VISIT (simulating ORIGINAL deployment, OLD nav.js) ====================
console.log('=== PHASE 1: first visit, serve OLD nav.js (as user originally saw) ===');
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.url().includes('/js/core/nav.js')) {
    req.respond({ status: 200, contentType: 'text/javascript', body: OLD_NAV });
  } else { req.continue(); }
});
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', String(e).slice(0, 120)));
await sleep(6000);
report.phase1_sw = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  const cache = await caches.keys();
  const nav = await caches.match('/js/core/nav.js').then(r => r ? r.text() : null);
  return {
    regs: regs.map(r => ({ scope: r.scope, state: r.active ? r.active.state : null })),
    caches: cache,
    cachedNavHasLoop: nav ? /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(nav) : null,
    cachedNavBytes: nav ? nav.length : null
  };
}).catch(e => ({ err: String(e) }));
console.log('PHASE1 SW/cache:', JSON.stringify(report.phase1_sw, null, 1));

const login1 = await loginIfNeeded();
console.log('PHASE1 logged in:', login1);
report.phase1_panel = await openPanelAndInspect();
console.log('PHASE1 panel (OLD nav active):', JSON.stringify(report.phase1_panel, null, 1));
await page.screenshot({ path: path.join(outDir, 'A_user_original_state.png') });

// ==================== PHASE 2: RELOAD WITH LIVE SERVER (no interception) ====================
console.log('\n=== PHASE 2: reload normally — server now serves FIXED nav.js, but SW cache holds OLD ===');
await page.setRequestInterception(false);
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', String(e).slice(0, 120)));
await sleep(6000);
report.phase2_fetch = await fetchNavAsBrowser();
console.log('PHASE2 nav.js as browser sees it:', JSON.stringify(report.phase2_fetch));

// What does the cache actually hold?
report.phase2_cache = await page.evaluate(async () => {
  const nav = await caches.match('/js/core/nav.js').then(r => r ? r.text() : null);
  return { cachedHasLoop: nav ? /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(nav) : null, bytes: nav ? nav.length : null };
}).catch(e => ({ err: String(e) }));
console.log('PHASE2 cache content:', JSON.stringify(report.phase2_cache));

const login2 = await loginIfNeeded();
console.log('PHASE2 logged in:', login2);
report.phase2_panel = await openPanelAndInspect();
console.log('PHASE2 panel (SW cache served):', JSON.stringify(report.phase2_panel, null, 1));
await page.screenshot({ path: path.join(outDir, 'B_after_reload_stale_cache.png') });

// ==================== PHASE 3: CONTROL — truly clean profile, cache bypass, fresh SW ====================
console.log('\n=== PHASE 3: CONTROL — brand-new profile, SW unregistered, live server only ===');
await page.setRequestInterception(true);
page.removeAllListeners('request');
page.on('request', (req) => req.continue());
await page.setCacheEnabled(false);
try { await page.evaluate(() => { if ('serviceWorker' in navigator) return navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))); }); } catch (e) {}
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', String(e).slice(0, 120)));
await sleep(3000);
// hard reload to drop SW from memory
await page.reload({ waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(3000);
// verify no SW active and cache empty
report.phase3_sw = await page.evaluate(async () => ({
  regs: await navigator.serviceWorker.getRegistrations().then(rs => rs.map(r => r.active ? r.active.state : null)),
  caches: await caches.keys()
})).catch(e => ({ err: String(e) }));
console.log('PHASE3 SW/cache:', JSON.stringify(report.phase3_sw));

// ensure no SW ever registers for control
await page.evaluateOnNewDocument(() => {
  if ('serviceWorker' in navigator) {
    const origRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = (u, o) => { console.log('SW REGISTER BLOCKED', u); return Promise.reject(new Error('blocked')); };
  }
});

const login3 = await loginIfNeeded();
console.log('PHASE3 logged in:', login3);
report.phase3_fetch = await fetchNavAsBrowser();
console.log('PHASE3 nav.js from server:', JSON.stringify(report.phase3_fetch));
report.phase3_panel = await openPanelAndInspect();
console.log('PHASE3 panel (clean, no SW):', JSON.stringify(report.phase3_panel, null, 1));
await page.screenshot({ path: path.join(outDir, 'C_control_clean.png') });

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log('\nDONE');
