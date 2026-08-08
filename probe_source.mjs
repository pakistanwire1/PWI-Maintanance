import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 500)));
await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto err', e.message));
const t0 = Date.now();
let nestedSrc = null;
let framesSeen = new Set();
while (Date.now() - t0 < 90000) {
  const frames = page.frames();
  for (const f of frames) {
    if (framesSeen.has(f)) continue;
    framesSeen.add(f);
    let html = null, len = 0, hasNumLoop = false, hasFixed = false, hasNotif = false, u = '';
    try {
      u = f.url();
      html = await f.content();
      len = html.length;
      hasNumLoop = html.includes('for (var p = 1; p <= totalPages; p++)');
      hasFixed = html.includes('Page \' + __notifPage + \' of');
      hasNotif = html.includes('notifPaginationFooter');
    } catch (e) {}
    if (u.includes('googleusercontent')) {
      console.log(`[t+${Math.round((Date.now()-t0)/1000)}s] frame ${u.slice(0,110)} len=${len} numLoop=${hasNumLoop} fixedSpan=${hasFixed} notif=${hasNotif}`);
    }
  }
  await sleep(2500);
}
await browser.close();
