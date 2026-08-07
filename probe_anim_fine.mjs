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
const matched = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const res = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules = [];
    try { rules = Array.from(sheet.cssRules || []); } catch (e) { continue; }
    for (const r of rules) {
      if (!r.selectorText) continue;
      if (r.style && typeof el.matches === 'function' && el.matches(r.selectorText)) {
        res.push({ sel: r.selectorText, opacity: r.style.opacity, display: r.style.display, animation: r.style.animation, animName: r.style.animationName, transition: r.style.transition });
      }
    }
  }
  return res;
}).catch(() => null);
console.log('MATCHED RULES for #auditPage: ' + JSON.stringify(matched, null, 1));
// fine-grained animation sampling
await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const item = document.querySelector('.sidebar-item[data-page="audit"]');
  window.__sample = [];
  window.__tick = setInterval(() => {
    const anims = el.getAnimations();
    const a = anims[0];
    window.__sample.push({
      ms: Math.round(Date.now() - window.__tickStart),
      op: getComputedStyle(el).opacity,
      tf: getComputedStyle(el).transform,
      nAnim: anims.length,
      playState: a ? a.playState : null,
      cur: a ? a.currentTime : null,
      progress: a && a.effect ? a.effect.getComputedTiming().progress : null,
      iter: a && a.effect ? a.effect.getComputedTiming().currentIteration : null
    });
  }, 100);
  window.__tickStart = Date.now();
  item.click();
  setTimeout(() => { clearInterval(window.__tick); }, 2000);
});
await sleep(2600);
const samples = await app.evaluate(() => window.__sample).catch(() => null);
console.log('ANIM TIMELINE (2s): ' + JSON.stringify(samples, null, 1));
// Now also dump the SAME info for a page that appears to work (users) by direct nav
await app.evaluate(() => {
  const item = document.querySelector('.sidebar-item[data-page="users"]');
  const el = document.getElementById('usersPage');
  window.__sample2 = [];
  window.__tick = setInterval(() => {
    const anims = el.getAnimations();
    const a = anims[0];
    window.__sample2.push({
      ms: Math.round(Date.now() - window.__tickStart),
      op: getComputedStyle(el).opacity,
      nAnim: anims.length,
      playState: a ? a.playState : null,
      cur: a ? a.currentTime : null,
      progress: a && a.effect ? a.effect.getComputedTiming().progress : null
    });
  }, 100);
  window.__tickStart = Date.now();
  item.click();
  setTimeout(() => { clearInterval(window.__tick); }, 2000);
});
await sleep(2600);
const samples2 = await app.evaluate(() => window.__sample2).catch(() => null);
console.log('USERS TIMELINE (2s): ' + JSON.stringify(samples2, null, 1));
await browser.close();
