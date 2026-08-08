import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const outDir = process.argv[2] || 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_repro';
fs.mkdirSync(outDir, { recursive: true });

// read OLD nav.js (pre-fix, with numbered loop) from git checkout saved earlier
const OLD_NAV = fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/nav_old_utf8.js', 'utf8');

const profile = 'C:/Users/afsar/AppData/Local/Temp/opencode/repro_profile_' + Date.now();
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: false, userDataDir: profile,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 200)));

async function evalRetry(fn, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try { return await page.evaluate(fn); }
    catch (e) {
      if (/detached Frame|Session closed|Target closed/i.test(String(e))) { await sleep(2500); continue; }
      throw e;
    }
  }
  throw new Error('evalRetry exhausted');
}

// 1. FIRST VISIT (normal, WITH SW enabled) — lets cmms-v47 cache assets
console.log('== first visit (SW enabled) ==');
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(4000);
const sw1 = await evalRetry(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return { regs: regs.map(r => ({ scope: r.scope, state: r.active ? r.active.state : null, script: r.active ? r.active.scriptURL : null })), caches: await caches.keys() };
}).catch(e => ({ err: String(e) }));
console.log('after first visit:', JSON.stringify(sw1));

// let the SW claim reloads settle
await sleep(6000);
try { await page.waitForSelector('body', { timeout: 30000 }); } catch (e) {}

// login
if (await evalRetry(() => !!document.getElementById('loginForm')).catch(() => false)) {
  await evalRetry((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    if (email) email.value = em;
    if (pass) pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  const t0 = Date.now();
  while (!(await evalRetry(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 90000) await sleep(2000);
}
console.log('logged in');

// check the nav.js the CURRENT session is running (SW-cached vs live)
const navInfo = await evalRetry(async () => {
  const r = await fetch('/js/core/nav.js', { cache: 'reload' });
  const txt = await r.text();
  return { servedBytes: txt.length, hasNumberedLoop: /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(txt), fromCache: r.status };
});
console.log('nav.js fetch (cache:reload) hasNumberedLoop:', navInfo.hasNumberedLoop);

// open notification panel and inspect footer (CLEAN state)
async function inspectPanel() {
  await evalRetry(() => {
    if (window.Nav && Nav.toggleNotificationPanel) Nav.toggleNotificationPanel();
  }).catch(() => {});
  await sleep(3500);
  const d = await evalRetry(() => {
    const panel = document.getElementById('notificationPanel');
    const footer = document.getElementById('notifPaginationFooter');
    const r = footer ? footer.getBoundingClientRect() : null;
    const numbered = footer ? Array.from(footer.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim())).map(b => b.textContent.trim()) : [];
    const allBtns = footer ? Array.from(footer.querySelectorAll('button')).map(b => b.textContent.trim()) : [];
    return {
      panelOpen: panel ? panel.classList.contains('open') : null,
      panelRect: panel ? [Math.round(panel.getBoundingClientRect().x), Math.round(panel.getBoundingClientRect().y), Math.round(panel.getBoundingClientRect().width), Math.round(panel.getBoundingClientRect().height)] : null,
      footerRect: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
      footerText: footer ? (footer.textContent || '').trim() : null,
      footerButtons: allBtns,
      numberedButtons: numbered,
      footerHtml: footer ? footer.innerHTML.slice(0, 300) : null
    };
  }).catch(e => ({ err: String(e) }));
  return d;
}

console.log('\n== CLEAN STATE: open panel ==');
const cleanState = await inspectPanel();
console.log('CLEAN:', JSON.stringify(cleanState, null, 1));
await page.screenshot({ path: path.join(outDir, 'A_clean_panel.png') });

// 2. NOW simulate the stale browser: overwrite the SW cache entry for /js/core/nav.js with OLD nav.js
console.log('\n== injecting OLD nav.js into cmms-v47 SW cache ==');
const inject = await evalRetry((oldNav) => {
  return caches.open('cmms-v47').then(c => c.put('/js/core/nav.js', new Response(oldNav, { headers: { 'Content-Type': 'text/javascript' } })))
    .then(() => 'injected')
    .catch(e => 'ERR: ' + e.message);
}, OLD_NAV);
console.log('inject result:', inject);

// reload — SW will now serve the OLD nav.js from cache (cache-first)
console.log('== reload (SW serves old nav.js from cache) ==');
await page.reload({ waitUntil: 'load', timeout: 120000 }).catch(() => {});
await sleep(6000);
const nav2 = await evalRetry(async () => {
  const r = await fetch('/js/core/nav.js');
  const txt = await r.text();
  return { bytes: txt.length, hasNumberedLoop: /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(txt) };
}).catch(e => ({ err: String(e) }));
console.log('after reload, nav.js served by SW:', JSON.stringify(nav2));

// re-login if needed
if (await evalRetry(() => !!document.getElementById('loginForm')).catch(() => false)) {
  await evalRetry((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    if (email) email.value = em;
    if (pass) pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  const t0 = Date.now();
  while (!(await evalRetry(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 90000) await sleep(2000);
}
console.log('relogged in');

console.log('\n== STALE STATE: open panel (OLD nav.js active) ==');
const staleState = await inspectPanel();
console.log('STALE:', JSON.stringify(staleState, null, 1));
await page.screenshot({ path: path.join(outDir, 'B_stale_panel.png') });

// bottom-right pixel evidence for the stale screenshot
const br = await evalRetry(() => {
  const footer = document.getElementById('notifPaginationFooter');
  if (!footer) return null;
  const r = footer.getBoundingClientRect();
  const cs = getComputedStyle(footer);
  const chain = [];
  let n = footer; while (n && chain.length < 6) { chain.push(n.id || n.className || n.tagName); n = n.parentElement; }
  return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], position: cs.position, zIndex: cs.zIndex, parentChain: chain.join(' > ') };
});
console.log('footer DOM (stale):', JSON.stringify(br, null, 1));

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ cleanState, staleState, nav2, sw1, footerDOM: br }, null, 1));
await browser.close();
console.log('DONE');
