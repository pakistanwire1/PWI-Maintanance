import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const runs = parseInt(process.argv[2] || '3', 10);

for (let r = 1; r <= runs; r++) {
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'cmms414-'));
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${udd}`]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const t0 = Date.now();
  const errors = [];
  page.on('pageerror', e => errors.push((e.stack || e.message).slice(0, 400)));
  await page.goto(GAS, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
  let loginSeen = false, appSeen = false, tLogin = -1, tApp = -1;
  while (Date.now() - t0 < 180000) {
    await sleep(1500);
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      if (!loginSeen) {
        const has = await f.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
        if (has) { tLogin = Date.now() - t0; loginSeen = true; }
      }
      if (loginSeen && !appSeen) {
        const has = await f.evaluate(() => {
          const ac = document.getElementById('appContainer');
          return !!ac && ac.style.display !== 'none';
        }).catch(() => false);
        if (has) { tApp = Date.now() - t0; appSeen = true; }
      }
    }
    if (loginSeen && appSeen) break;
  }
  console.log(`RUN ${r}: loginFormReady=${tLogin === -1 ? 'TIMEOUT' : (tLogin / 1000).toFixed(1) + 's'} appVisible=${tApp === -1 ? 'TIMEOUT' : (tApp / 1000).toFixed(1) + 's'}` + (errors.length ? ` ERRORS=${JSON.stringify(errors)}` : ''));
  await browser.close();
}
