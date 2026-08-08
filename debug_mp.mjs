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
await sleep(2000);

const token = await page.evaluate(() => localStorage.getItem('cmms_token'));

const mpResp = await page.evaluate(async () => {
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getMachinePassport', token: localStorage.getItem('cmms_token'), data: { machineId: 'MCH001' } })
  });
  return resp.json();
});
log('API getMachinePassport MCH001: ' + JSON.stringify(mpResp).slice(0, 600));

const mpList = await page.evaluate(async () => {
  const resp = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getMachines', token: localStorage.getItem('cmms_token'), data: {} })
  });
  const j = await resp.json();
  const recs = (j.data && (j.data.records || j.data)) || j.records || [];
  if (!Array.isArray(recs)) return { count: 'n/a', sample: null };
  return { count: recs.length, sample: recs.slice(0, 3).map(function(m) { return { id: m.MachineID, code: m.MachineCode, name: m.MachineName }; }) };
});
log('API getMachines: ' + JSON.stringify(mpList));

await page.goto(BASE + '/#machinepassport', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => log('goto err: ' + e.message));
await page.evaluate(() => { try { sessionStorage.setItem('passportMachineId', 'MCH001'); sessionStorage.setItem('passportPrevPage', 'machines'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => log('reload err: ' + e.message));
await sleep(8000);
const mpPageState = await page.evaluate(() => {
  const body = document.getElementById('passportContainer');
  const skel = document.getElementById('passportSkeleton');
  return {
    container: body ? { text: (body.textContent || '').slice(0, 300), htmlLen: (body.innerHTML || '').length } : null,
    skeleton: skel ? getComputedStyle(skel).display : null
  };
});
log('MP PAGE STATE: ' + JSON.stringify(mpPageState));

if (mpPageState.machineSelect) {
  const vals = await page.evaluate(() => {
    const s = document.getElementById('mpMachineSelect') || document.getElementById('machineSelect');
    return Array.from(s.options).map(o => o.value).filter(v => v).slice(0, 5);
  });
  if (vals.length) {
    await page.evaluate((v) => {
      const s = document.getElementById('mpMachineSelect') || document.getElementById('machineSelect');
      s.value = v;
      s.dispatchEvent(new Event('change'));
    }, vals[0]);
    await sleep(5000);
    const afterSel = await page.evaluate(() => {
      const body = document.getElementById('mpBody') || document.getElementById('machinePassportBody');
      return { bodyText: body ? (body.textContent || '').slice(0, 300) : null, htmlLen: body ? (body.innerHTML || '').length : 0 };
    });
    log('MP AFTER SELECT: ' + JSON.stringify(afterSel));
  }
}

log('CONSOLE ERRORS: ' + JSON.stringify(consoleErrors));
await browser.close();
