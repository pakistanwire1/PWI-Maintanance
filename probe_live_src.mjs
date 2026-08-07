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
const raw = await app.evaluate(() => document.documentElement.outerHTML).catch(() => null);
if (raw) fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/live414_dom.html', raw, 'utf8');
console.log('saved live DOM, len', raw ? raw.length : 0);
// Balance check on the AssetsPage region of the LIVE served DOM
if (raw) {
  const i = raw.indexOf('<div id="assetsPage"');
  const j = raw.indexOf('id="machinesPage"');
  console.log('assetsStart', i, 'machinesStart', j);
  const chunk = raw.slice(i, j);
  const opens = (chunk.match(/<div[^>]*>/g) || []).length;
  const closes = (chunk.match(/<\/div>/g) || []).length;
  console.log('LIVE AssetsPage chunk balance: <div>', opens, '</div>', closes, 'net', opens - closes);
  fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/live_assets_chunk.txt', chunk, 'utf8');
}
await browser.close();
