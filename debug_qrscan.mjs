import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(m);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 400)); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 400)));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', 'supervisor@cmms.com');
await page.type('#loginPassword', 'super123');
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1500);

await page.goto(BASE + '/#qr', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => log('goto err: ' + e.message));
await sleep(3000);

// Open Scan overlay via button
const opened = await page.evaluate(() => {
  try {
    QRCodes.openScan();
    return true;
  } catch (e) { return 'ERR: ' + e.message; }
});
log('openScan: ' + opened);
await sleep(800);

const scanUI = await page.evaluate(() => {
  const inp = document.getElementById('qrScanInput');
  const result = document.getElementById('qrScanResult');
  const overlay = document.getElementById('qrScanOverlay');
  return {
    overlayExists: !!overlay,
    inputExists: !!inp,
    resultExists: !!result,
    resultHtml: result ? result.innerHTML.slice(0, 150) : ''
  };
});
log('Scan UI: ' + JSON.stringify(scanUI));

// Type a barcode and click Look Up
if (scanUI.inputExists) {
  await page.evaluate(() => { document.getElementById('qrScanInput').value = 'ST01-6155'; });
  const val = await page.evaluate(() => document.getElementById('qrScanInput').value);
  log('input value now: ' + JSON.stringify(val));
  const lookupRan = await page.evaluate(() => {
    try { window.doScanLookup(); return true; } catch (e) { return 'ERR: ' + e.message; }
  });
  log('doScanLookup ran: ' + lookupRan);
  await sleep(15000);
  const scanResult = await page.evaluate(() => {
    const result = document.getElementById('qrScanResult');
    return { html: result ? result.innerHTML.slice(0, 300) : 'no-result' };
  });
  log('Scan lookup result: ' + scanResult.html);
}

log('CONSOLE ERRORS: ' + JSON.stringify(consoleErrors, null, 2));
await browser.close();
