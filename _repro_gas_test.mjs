import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push('[' + m.type() + '] ' + m.text().slice(0, 300)); });
page.on('pageerror', e => logs.push('[pe] ' + String(e.message).slice(0, 300)));

await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));
await sleep(6000);

async function findFrame(pred, maxMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    for (const f of page.frames()) {
      const ok = await pred(f).catch(() => false);
      if (ok) return f;
    }
    await sleep(1500);
  }
  return null;
}

const wsFrame = await findFrame(f => f.evaluate(() => !!document.getElementById('wsBtn')));
console.log('wsFrame:', !!wsFrame);

// find nested user frame: the frame whose content has loginForm/appContainer OR is a child of wsFrame with userHtmlFrame
let appFrame = null;
appFrame = await findFrame(f => f.evaluate(() => !!document.getElementById('loginForm') || !!document.getElementById('appContainer')), 60000);
console.log('appFrame(login):', !!appFrame);

if (!appFrame && wsFrame) {
  const kids = wsFrame.childFrames();
  console.log('ws child frames:', kids.length);
  for (const k of kids) {
    const t = await k.evaluate(() => ({ ids: Array.from(document.querySelectorAll('[id]')).map(e => e.id).slice(0, 30) })).catch(() => null);
    console.log('  child:', t ? JSON.stringify(t.ids) : 'err');
  }
}

// if still not found, inspect ws boot: maybe need to click wsBtn
if (!appFrame && wsFrame) {
  const st = await wsFrame.evaluate(() => ({
    wsLoadingText: (document.getElementById('wsLoadingText') || {}).textContent,
    progress: (() => { const el = document.getElementById('wsProgressBar'); return el ? getComputedStyle(el).width : null; })(),
    btnText: (document.getElementById('wsBtn') || {}).textContent,
    errDisp: (() => { const el = document.getElementById('wsError'); return el ? getComputedStyle(el).display : null; })()
  })).catch(e => ({ err: String(e.message) }));
  console.log('ws state:', JSON.stringify(st));
}

if (!appFrame) { console.log('COULD NOT REACH LOGIN. logs:', logs.slice(0, 15)); await browser.close(); process.exit(1); }

// login
let loggedIn = false;
for (let i = 0; i < 30 && !loggedIn; i++) {
  const st = await appFrame.evaluate(() => ({
    form: !!document.getElementById('loginForm'),
    appV: !!document.getElementById('appContainer') && getComputedStyle(document.getElementById('appContainer')).display !== 'none'
  })).catch(() => ({}));
  if (st.appV) { loggedIn = true; break; }
  if (st.form) {
    await appFrame.evaluate((em, pw) => {
      const e = document.getElementById('loginEmail'); if (e) e.value = em;
      const p = document.getElementById('loginPassword'); if (p) p.value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
  }
  await sleep(3000);
}
console.log('loggedIn:', loggedIn);
if (!loggedIn) { console.log('LOGIN FAILED. logs:', logs.slice(0, 10)); await browser.close(); process.exit(1); }
await sleep(3000);

const snap = () => appFrame.evaluate(() => {
  const ov = document.getElementById('loadingOverlay');
  const bp = document.getElementById('breakdownPage');
  const hasBd = !!bp;
  const bdActive = hasBd && bp.classList.contains('active');
  const rows = (document.querySelectorAll('#breakdownTableContainer tbody tr, #breakdownTableContainer .table-row') || []).length;
  const title = (document.getElementById('pageTitle') || {}).textContent || '';
  const current = typeof currentPage !== 'undefined' ? currentPage : '?';
  const bdDiv = document.getElementById('bdDivision');
  return { ovShow: ov ? ov.classList.contains('show') : null, hasBd, bdActive, rows, title, current, hasDivSelect: !!bdDiv, divOpts: bdDiv ? bdDiv.options.length : -1 };
}).catch(e => ({ evalErr: String(e.message) }));

await appFrame.evaluate(() => { try { navigateTo('breakdown'); } catch (e) { console.log('nav err', e.message); } }).catch(() => {});

console.log('\ntime, ovShow, bdActive, rows, currentPage, divOpts');
for (let i = 0; i < 30; i++) {
  const s = await snap();
  console.log('T+' + (i * 4) + 's', JSON.stringify(s));
  if (s.ovShow === false && s.rows > 0) break;
  if (s.current === 'dashboard' && i > 2) { console.log('>>> NAVIGATED BACK TO DASHBOARD <<<'); break; }
  await sleep(4000);
}

console.log('\nlogs:');
logs.forEach(l => console.log(l));
await browser.close();

