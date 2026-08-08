import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'https://pwi-maintanance.pages.dev';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => { if (m.type() === 'error') console.log('[console:error]', m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 }).catch(e => console.log('goto err', e.message));
await sleep(3000);
const d = await page.evaluate(() => ({
  title: document.title,
  bodyId: document.body.id,
  hasApp: !!document.getElementById('app'),
  hasRoot: !!document.getElementById('root'),
  hasAppContainer: !!document.getElementById('appContainer'),
  hasLogin: !!document.getElementById('loginForm'),
  mainText: document.body ? document.body.innerText.slice(0, 400).replace(/\n+/g, ' | ') : '(no body)',
  scripts: Array.from(document.scripts).map(s => (s.src || '(inline)').slice(0, 120)).slice(0, 20)
}));
console.log(JSON.stringify(d, null, 1));
await browser.close();
