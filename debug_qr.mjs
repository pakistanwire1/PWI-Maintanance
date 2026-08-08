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
await sleep(10000);
const overviewInfo = await page.evaluate(() => {
  const body = document.getElementById('qrOvBody');
  const count = document.getElementById('qrOvCount');
  return {
    bodyRows: body ? body.rows.length : -1,
    bodyHtml: body ? body.innerHTML.slice(0, 120) : '',
    countText: count ? count.textContent : ''
  };
});
log('QR Overview: rows=' + overviewInfo.bodyRows + ' count="' + overviewInfo.countText + '"');

await page.evaluate(() => navigateTo('qrmachines'));
await sleep(3000);
const machInfo = await page.evaluate(() => {
  const body = document.getElementById('qrMcBody');
  return {
    bodyRows: body ? body.rows.length : -1,
    count: document.getElementById('qrMcCount') ? document.getElementById('qrMcCount').textContent : ''
  };
});
log('QR Machines: rows=' + machInfo.bodyRows + ' count="' + machInfo.countText + '"');

const qrApi = await page.evaluate(async () => {
  const out = {};
  const post = (action, data) => {
    const token = localStorage.getItem('cmms_token');
    return fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token, data: data || {} }) })
      .then(r => r.text().then(t => { try { return { status: r.status, json: JSON.parse(t) }; } catch (e) { return { status: r.status, raw: t.slice(0, 200) }; } }))
      .catch(e => ({ fetchErr: e.message }));
  };
  const g = await post('getQRModuleRecords', { module: 'Machine' });
  const machines = (g.json && g.json.data) || [];
  out.machineCount = machines.length;
  const noQr = machines.find(m => !m.qrCode) || machines[0];
  out.testMachine = noQr ? { id: noQr.id, name: noQr.name, hasQr: !!noQr.qrCode, barcode: noQr.barcode } : null;
  const gen = await post('generateQRCode', { module: 'Machine', recordId: out.testMachine ? out.testMachine.id : '' });
  out.generateQR = gen.json ? (gen.json.error || gen.json.data || gen.json) : gen;
  const qrContent = gen.json && gen.json.data ? gen.json.data.qrContent : '';
  const scan = await post('scanQRCode', { qrContent });
  out.scanQR = scan.json ? scan.json : scan;
  const barcodeGen = await post('generateBarcode', { module: 'Machine', recordId: out.testMachine ? out.testMachine.id : '' });
  out.generateBarcode = barcodeGen.json ? (barcodeGen.json.error || barcodeGen.json.data || barcodeGen.json) : barcodeGen;
  return out;
});
log('QR API probe: ' + JSON.stringify(qrApi, null, 2));

log('CONSOLE ERRORS: ' + JSON.stringify(consoleErrors, null, 2));
await browser.close();
