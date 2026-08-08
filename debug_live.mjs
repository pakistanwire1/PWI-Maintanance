import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(m);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 300)));

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
log('HASH after login: ' + (await page.evaluate(() => window.location.hash)));

await page.goto(BASE + '/#openjobcard', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => log('goto err: ' + e.message));
await sleep(2000);
const found = await page.$('#jcDivision');
log('jcDivision found: ' + !!found);

async function opts(sel, label) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { present: false };
    return { present: true, count: el.options.length, values: Array.from(el.options).map(o => o.value).filter(v => v).slice(0, 15) };
  }, sel);
  if (!info.present) { log(label + ': MISSING'); return []; }
  log(label + ': count=' + info.count + ' values=' + JSON.stringify(info.values));
  return info.values;
}

if (found) {
  await page.waitForFunction(() => document.querySelector('#jcDivision') && document.querySelector('#jcDivision').options.length > 1, { timeout: 30000 }).catch(() => {});
  await opts('#jcDivision', 'DIVISION');
  await opts('#jcSection', 'SECTION (initial)');

  await page.select('#jcDivision', 'DIV001');
  await sleep(400);
  await opts('#jcSection', 'SECTION (DIV001)');
  const secVals = await page.evaluate(() => Array.from(document.querySelector('#jcSection').options).map(o => o.value).filter(v => v));
  if (secVals.length) {
    await page.select('#jcSection', secVals[0]);
    await sleep(400);
    await opts('#jcDepartment', 'DEPT (' + secVals[0] + ')');
    const deptVals = await page.evaluate(() => Array.from(document.querySelector('#jcDepartment').options).map(o => o.value).filter(v => v));
    if (deptVals.length) {
      await page.select('#jcDepartment', deptVals[0]);
      await sleep(400);
      await opts('#jcMachine', 'MACHINE (dept)');
    }
  }

  await page.select('#jcDivision', 'DIV002');
  await sleep(400);
  await opts('#jcSection', 'SECTION (DIV002)');
}

log('CONSOLE ERRORS: ' + JSON.stringify(consoleErrors));
await browser.close();
