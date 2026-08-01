import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
const log = [];
page.on('console', m => { if (m.type() === 'error') log.push('[console] ' + m.text()); });
page.on('pageerror', e => log.push('[pageerror] ' + e.message));

await page.goto(GAS, { waitUntil: 'networkidle2', timeout: 120000 }).catch(e => console.log('goto err', e.message));

async function findAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => {
      return !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer'));
    }).catch(() => false);
    if (has) return f;
  }
  return null;
}

let app = await findAppFrame();
if (app) console.log('found app frame initially');
else console.log('no app frame found initially; polling...');

const start = Date.now();
while (Date.now() - start < 120000) {
  app = await findAppFrame();
  if (app) {
    const state = await app.evaluate(() => ({
      hasWs: !!document.getElementById('wsBtn'),
      hasForm: !!document.getElementById('loginForm'),
      hasApp: !!document.getElementById('appContainer'),
      title: document.title
    })).catch(() => null);
    if (state) {
      console.log('T+' + Math.round((Date.now() - start) / 1000) + 's', JSON.stringify(state));
      if (state.hasForm || state.hasApp) break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
}

if (app) {
  const state = await app.evaluate(() => ({
    hasForm: !!document.getElementById('loginForm'),
    hasApp: !!document.getElementById('appContainer'),
    bodyText: document.body ? document.body.innerText.slice(0, 300) : '',
    errText: (document.getElementById('wsErrorText') || {}).textContent || null,
    wsErrVisible: (document.getElementById('wsError') || {}).style ? document.getElementById('wsError').style.display : null
  })).catch(e => ({ err: e.message }));
  console.log('FINAL:', JSON.stringify(state));
  console.log('errors:', log.slice(0, 5));
}
await browser.close();
