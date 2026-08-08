import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') console.log(`[console:${t}]`, m.text().slice(0, 500)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 500)));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));
let app = null;
for (let i = 0; i < 20 && Date.now() - t0 < 90000; i++) {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const info = await f.evaluate(() => ({
      hasLogin: !!document.getElementById('loginForm'),
      hasApp: !!document.getElementById('appContainer'),
      hasNotif: !!document.getElementById('notificationPanel'),
      scripts: Array.from(document.scripts).map(s => (s.src || '(inline)').slice(0, 80)),
      bodySnippet: document.body ? document.body.innerHTML.slice(0, 600) : '(no body)'
    })).catch(e => ({ err: String(e) }));
    if (info.hasLogin || info.hasApp) { app = f; break; }
    if (info.bodySnippet && info.bodySnippet !== '(no body)') {
      console.log(`[t+${Math.round((Date.now()-t0)/1000)}s] frame body snippet:`, info.bodySnippet.slice(0, 300));
    }
  }
  if (app) break;
  await sleep(2500);
}
if (app) {
  console.log('APP FOUND. Dumping scripts + presence:');
  const d = await app.evaluate(() => ({
    hasLogin: !!document.getElementById('loginForm'),
    hasApp: !!document.getElementById('appContainer'),
    scripts: Array.from(document.scripts).map(s => (s.src || '(inline)').slice(0, 100)),
    bodyHead: document.body.innerHTML.slice(0, 1500)
  }));
  console.log(JSON.stringify(d, null, 1));
}
await browser.close();
