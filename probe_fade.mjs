import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickAppFrame();
while (!app && Date.now() - t0 < 90000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(0); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(2000);
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('app ready');
await sleep(2000);
await app.evaluate(() => {
  const item = document.querySelector('.sidebar-item[data-page="audit"]');
  if (item) item.click();
});
// sample opacity/animation at intervals
for (let i = 0; i < 8; i++) {
  await sleep(500);
  const s = await app.evaluate(() => {
    const el = document.getElementById('auditPage');
    const st = getComputedStyle(el);
    return {
      ms: Date.now() % 100000,
      op: st.opacity,
      animName: st.animationName,
      playState: st.animationPlayState,
      duration: st.animationDuration,
      delay: st.animationDelay,
      fillMode: st.animationFillMode,
      iter: st.animationIterationCount,
      transform: st.transform,
      docHidden: document.hidden,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      docElClass: document.documentElement.className,
      pageClass: el.className
    };
  }).catch(() => null);
  if (s) console.log('t+' + (i * 0.5) + 's ' + JSON.stringify(s));
}
// now try removing the animation
const fix = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  el.style.animation = 'none';
  const st = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { op: st.opacity, anim: st.animationName, rect: Math.round(r.width) + 'x' + Math.round(r.height), rows: document.querySelectorAll('#auditTableBody tr').length };
}).catch(() => null);
console.log('AFTER removing animation: ' + JSON.stringify(fix));
await sleep(1500);
const clip = await page.evaluate(() => {
  for (const f of document.querySelectorAll('iframe')) {
    if (f.src.indexOf('userCodeAppPanel') >= 0) {
      const r = f.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    }
  }
  return null;
}).catch(() => null);
if (clip) await page.screenshot({ path: 'D:/CLASP/CMMS/PWI-Maintanance/verify_shots/audit_nofade.png', clip }).catch(() => {});
console.log('screenshot saved (animation removed)');
await browser.close();
