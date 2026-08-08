import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') console.log(`[console:${t}]`, m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 400)));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));
for (let i = 0; i < 30 && Date.now() - t0 < 120000; i++) {
  const frames = page.frames();
  let found = null;
  for (const f of frames) {
    if (f === page.mainFrame()) continue;
    const info = await f.evaluate(() => {
      const hasLogin = !!document.getElementById('loginForm');
      const hasApp = !!document.getElementById('appContainer');
      const title = document.title;
      const pre = document.querySelector('pre') ? document.querySelector('pre').textContent.slice(0, 200) : null;
      return { hasLogin, hasApp, title, pre, url: location.href.slice(0, 160) };
    }).catch(e => ({ err: String(e) }));
    console.log(`[t+${Math.round((Date.now()-t0)/1000)}s] frame[${f.url().slice(0,90)}]:`, JSON.stringify(info));
    if (info.hasLogin || info.hasApp) { found = f; }
  }
  if (found) break;
  await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await sleep(2000);
}
console.log('MAIN title:', await page.title());
const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : '(no body)').catch(e => String(e));
console.log('MAIN body head:', bodyText.replace(/\n+/g, ' | '));
await browser.close();
