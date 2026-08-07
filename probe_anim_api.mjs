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
await sleep(2500);
const anims = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const anims = el.getAnimations();
  return anims.map(a => {
    const e = a.effect;
    return {
      animName: a.animationName || (a instanceof CSSAnimation ? 'css' : 'waapi'),
      playState: a.playState,
      currentTime: a.currentTime,
      startTime: a.startTime,
      effectTarget: e && e.target ? e.target.id || e.target.tagName : null,
      iteration: e ? e.iteration : null,
      fill: e ? e.fill : null,
      keyframes: e && e.getKeyframes ? e.getKeyframes().map(k => ({ op: k.opacity, tf: k.transform, offset: k.offset })) : null
    };
  });
}).catch(() => null);
console.log('ANIMATIONS ON #auditPage: ' + JSON.stringify(anims, null, 1));
// retest: force display none->block with reflow and re-add animation
const retest = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  el.style.animation = 'none';
  el.style.opacity = '1';
  const before = getComputedStyle(el).opacity;
  // now re-enable animation while visible, to see if it completes
  el.style.opacity = '';
  el.style.animation = '';
  return new Promise(resolve => {
    setTimeout(() => resolve({ opAfter500: getComputedStyle(el).opacity, anim: getComputedStyle(el).animationName }), 600);
  });
}).catch(() => null);
console.log('RETEST (re-add animation while visible): ' + JSON.stringify(retest));
await browser.close();
