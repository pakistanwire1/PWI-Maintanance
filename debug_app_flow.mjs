import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:8788';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();

const msgs = [];
page.on('console', m => msgs.push(m.type() + ': ' + m.text().slice(0, 200)));
page.on('pageerror', e => msgs.push('PAGEERROR: ' + e.message));
const apiResps = {};
page.on('response', async res => {
  if (res.url().includes('/api/exec')) {
    let a = ''; try { a = JSON.parse(res.request().postData()).action; } catch (e) {}
    apiResps[a] = (apiResps[a] || 0) + 1;
  }
});

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1000);

await page.evaluate(() => navigateTo('reports'));
await page.waitForFunction(() => { const el = document.getElementById('rptType'); return el && Array.from(el.options).some(o => o.value !== ''); }, { timeout: 60000 });
await sleep(1000);

// select first type + trigger generate
await page.evaluate(() => {
  const el = document.getElementById('rptType');
  el.value = Array.from(el.options).find(o => o.value).value;
  el.dispatchEvent(new Event('change'));
});
await sleep(5000);
let st = await page.evaluate(() => ({ rc: document.getElementById('rptRecordCount').textContent, rows: document.querySelectorAll('#rptTableBody tr').length, kpi: document.getElementById('rptKpiCards').style.display, toast: (window.__toasts || []).slice(-2) }));
console.log('after type+5s:', JSON.stringify(st));
await sleep(10000);
st = await page.evaluate(() => ({ rc: document.getElementById('rptRecordCount').textContent, rows: document.querySelectorAll('#rptTableBody tr').length, kpi: document.getElementById('rptKpiCards').style.display, toast: (window.__toasts || []).slice(-2) }));
console.log('after type+15s:', JSON.stringify(st));

// click Generate directly
await page.evaluate(() => Reports.generateReport());
await sleep(8000);
st = await page.evaluate(() => ({ rc: document.getElementById('rptRecordCount').textContent, rows: document.querySelectorAll('#rptTableBody tr').length, kpi: document.getElementById('rptKpiCards').style.display, toast: (window.__toasts || []).slice(-2) }));
console.log('after manual generate+8s:', JSON.stringify(st));

console.log('api resp counts:', JSON.stringify(apiResps));
console.log('console msgs:', JSON.stringify(msgs.slice(-12)));
await browser.close();
