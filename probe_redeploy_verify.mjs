import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}

const URLS = {
  primary: 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec',
  test: 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec'
};

const out = [];
async function inspect(label, url) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  async function pickAppFrame() {
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
      if (has) return f;
    }
    return null;
  }
  let app = await pickAppFrame();
  while (!app && Date.now() - t0 < 90000) { await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {}); await sleep(2000); app = await pickAppFrame(); }
  if (!app) { out.push({ label, error: 'NO FRAME' }); await browser.close(); return; }
  await sleep(1500);
  const hasLogin = await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
  if (hasLogin) {
    await app.evaluate((em, pw) => {
      const email = document.getElementById('loginEmail') || document.getElementById('email');
      const pass = document.getElementById('loginPassword') || document.getElementById('password');
      if (email) email.value = em;
      if (pass) pass.value = pw;
      document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, creds.Email, creds.Password);
    while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 90000) await sleep(1200);
  }
  await sleep(1000);

  const pageNames = ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications', 'settings'];
  const pageRes = [];
  for (const p of pageNames) {
    try { await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p); } catch (e) {}
    await sleep(1800);
    const d = await app.evaluate(() => {
      const results = [];
      let numFooter = { found: false, btns: 0, html: '', rect: null };
      const footer = document.getElementById('notifPaginationFooter');
      if (footer) {
        const r = footer.getBoundingClientRect();
        const btns = Array.from(footer.querySelectorAll('button'));
        numFooter = { found: true, btns: btns.length, html: footer.innerHTML.substring(0, 120), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
        if (btns.some(b => /^\d+$/.test((b.textContent || '').trim()))) numFooter.hasNumberedBtns = true;
      }
      const panel = document.getElementById('notificationPanel');
      let panelInfo = null;
      if (panel) {
        const r = panel.getBoundingClientRect();
        panelInfo = { cls: panel.className, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
      }
      results.push({ special: 'footer', ...numFooter });
      results.push({ special: 'panel', ...panelInfo });
      return results;
    }).catch(e => ({ err: String(e) }));
    pageRes.push({ page: p, hits: d });
  }
  out.push({ label, url, pages: pageRes });
  await browser.close();
}

for (const [label, url] of Object.entries(URLS)) {
  console.log('probing ' + label + ' ...');
  await inspect(label, url);
  fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/verify_redeploy.json', JSON.stringify(out, null, 1));
}
console.log('DONE');
