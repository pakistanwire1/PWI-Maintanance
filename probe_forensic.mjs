import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}

const URLS = {
  primary: 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec',
  head: 'https://script.google.com/macros/s/AKfycby8VLo8el23tY3viaOmBRK58hHKuEbVYWvgzBzGbOQ/exec',
  test: 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec',
  gas426: 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec'
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
  while (!app && Date.now() - t0 < 90000) { await sleep(1500); app = await pickAppFrame(); }
  if (!app) { out.push({ label, error: 'NO FRAME' }); await browser.close(); return; }
  await sleep(2500);
  const hasLogin = await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
  if (hasLogin) {
    await app.evaluate((em, pw) => {
      const email = document.getElementById('loginEmail') || document.getElementById('email');
      const pass = document.getElementById('loginPassword') || document.getElementById('password');
      if (email) email.value = em;
      if (pass) pass.value = pw;
      document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, creds.Email, creds.Password);
    while (!(await app.evaluate(() => !!document.getElementById('appContainer')).catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
  }
  await sleep(2000);

  const pageNames = ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications', 'settings'];
  const pageRes = [];
  for (const p of pageNames) {
    try { await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p); } catch (e) {}
    await sleep(2500);
    const d = await app.evaluate(() => {
      const results = [];
      function walk(root, depth) {
        if (depth > 18) return;
        const kids = Array.from(root.children || []);
        for (const el of kids) {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
          const btns = Array.from(el.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim()));
          if (btns.length >= 2) {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            results.push({
              tag: el.tagName, id: el.id, cls: el.className,
              pos: cs.position,
              rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
              visible: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
              nums: btns.slice(0, 20).map(b => b.textContent.trim()).join(','),
              chain: (function(){ const c=[]; let n=el; while(n && c.length<6){ c.unshift(n.id || n.className || n.tagName); n=n.parentElement; } return c.join('>'); })()
            });
          }
          walk(el, depth + 1);
        }
      }
      walk(document.body, 0);
      const footer = document.getElementById('notifPaginationFooter');
      if (footer) {
        const r = footer.getBoundingClientRect();
        results.push({ special: 'notifPaginationFooter', html: footer.innerHTML.substring(0, 200), btns: footer.querySelectorAll('button').length, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
      }
      const panel = document.getElementById('notificationPanel');
      if (panel) {
        const r = panel.getBoundingClientRect();
        const cs = getComputedStyle(panel);
        results.push({ special: 'notificationPanel', cls: panel.className, pos: cs.position, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
      }
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
  fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/forensic_all_deploys.json', JSON.stringify(out, null, 1));
}
console.log('DONE');
