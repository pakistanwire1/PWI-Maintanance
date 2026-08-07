import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:8788';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();

const log = [];
page.on('response', async res => {
  if (res.url().includes('/api/exec')) {
    let action = '';
    try { action = JSON.parse(res.request().postData()).action; } catch (e) {}
    let body = '';
    try { body = (await res.text()).slice(0, 200); } catch (e) {}
    log.push(action + ' status=' + res.status() + ' body=' + body);
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

const token = await page.evaluate(() => localStorage.getItem('cmms_token'));
console.log('token len:', token ? token.length : 0, 'prefix:', token ? token.slice(0, 12) : 'none');

// call getReportData from within the page (same-origin)
const res = await page.evaluate(async (tok) => {
  const r = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getReportData', token: tok, data: { reportType: 'machine_history', division: '', section: '', department: '', machineNumber: '', technician: '', maintenanceType: '', priority: '', status: '', fromDate: '2026-01-01T00:00:00', toDate: '2026-12-31T23:59:59' } })
  });
  const t = await r.text();
  return { status: r.status, body: t.slice(0, 400) };
}, token);
console.log('getReportData via page fetch:', JSON.stringify(res));

console.log('\n--- api/exec responses ---');
for (const l of log.slice(-12)) console.log(l);

await browser.close();
