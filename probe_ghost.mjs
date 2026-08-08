import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CF = 'https://pwi-maintanance.pages.dev';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let creds = { Email: 'supervisor@cmms.com', Password: 'super123' };
try { creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8')); } catch (e) {}

const PAGES = ['dashboard','sections','departments','machines','assets','technicians','users','openjobcard','startjobcard','closejobcard','pendingjobcard','approvejobcard','checklists','pm','spareparts','inventory','inventorytransactions','stockhistory','goodsreceipt','pmhistory','notifications','audit','qr','email','whatsapp','breakdown','reports','machinepassport','backuprestore','settings'];

async function probeVisiblePagination(target, label) {
  return target.evaluate((label) => {
    const out = [];
    const nodes = document.querySelectorAll('*');
    for (const el of nodes) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'SVG') continue;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/Previous|Next|Prev|Page \d|Showing \d/.test(txt)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right < 0 || r.left > window.innerWidth) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const chain = [];
      let p = el;
      for (let i = 0; i < 8 && p; i++) {
        chain.push((p.id ? '#' + p.id : '') + (p.className ? '.' + String(p.className).split(' ').slice(0,2).join('.') : '') + '[' + p.tagName + ']');
        p = p.parentElement;
      }
      const size = el.children.length === 0 ? 'LEAF' : 'PARENT(' + el.children.length + ')';
      out.push({ page: label, tag: el.tagName, size, txt: txt.slice(0, 70), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], pos: cs.position, chain: chain.join(' > ') });
    }
    return out;
  }, label);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

const which = process.argv[2] || 'cf';

if (which === 'gas') {
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
  while (!app && Date.now() - t0 < 120000) { await sleep(2000); app = await pickAppFrame(); }
  if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(1); }
  while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
  await app.evaluate((em, pw) => {
    const email = document.getElementById('loginEmail') || document.getElementById('email');
    const pass = document.getElementById('loginPassword') || document.getElementById('password');
    email.value = em; pass.value = pw;
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, creds.Email, creds.Password);
  while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
  await sleep(1200);
  const results = [];
  for (const p of PAGES) {
    await app.evaluate((p) => { const i = document.querySelector('.sidebar-item[data-page="' + p + '"]'); if (i) i.click(); }, p).catch(() => {});
    await sleep(2200);
    const hits = await probeVisiblePagination(app, 'GAS:' + p);
    results.push(...hits);
  }
  await browser.close();
  const interesting = results.filter(h => /Page \d/.test(h.txt) || h.pos === 'fixed' || h.pos === 'sticky');
  console.log('=== GAS interesting (' + interesting.length + ') ===');
  console.log(JSON.stringify(interesting, null, 1));
  console.log('total:', results.length);
} else {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#loginForm', { timeout: 60000 });
  await page.type('#loginEmail', creds.Email);
  await page.type('#loginPassword', creds.Password);
  await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
  await page.waitForFunction(() => { try { return typeof window.navigateTo === 'function'; } catch (e) { return false; } }, { timeout: 60000 });
  await sleep(1200);
  const results = [];
  for (const p of PAGES) {
    await page.evaluate((p) => { try { navigateTo(p); } catch (e) {} }, p).catch(() => {});
    await sleep(2200);
    const hits = await probeVisiblePagination(page, 'CF:' + p);
    results.push(...hits);
  }
  await browser.close();
  const interesting = results.filter(h => /Page \d/.test(h.txt) || h.pos === 'fixed' || h.pos === 'sticky');
  console.log('=== CF interesting (' + interesting.length + ') ===');
  console.log(JSON.stringify(interesting, null, 1));
  console.log('total:', results.length);
}
