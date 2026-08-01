import puppeteer from 'puppeteer-core';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const gas = await browser.newPage();
await gas.setViewport({ width: 1440, height: 900 });
await gas.goto(GAS, { waitUntil: 'networkidle2', timeout: 240000 });
async function findFrame() {
  for (const f of gas.frames()) {
    if (f === gas.mainFrame()) continue;
    if (await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false)) return f;
  }
  return null;
}
let gf = null;
{ const t0 = Date.now(); while (Date.now() - t0 < 300000) { gf = await findFrame(); if (gf && await gf.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) break; await sleep(4000); } }
if (!gf) throw new Error('no frame found');
await gf.type('#loginEmail', EMAIL); await gf.type('#loginPassword', PASSWORD);
await gf.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gf.waitForFunction(() => { const ac = document.getElementById('appContainer'); return ac && ac.style.display !== 'none'; }, { timeout: 240000 });
await sleep(2000);

const call = (div, sec, dept) => new Promise(resolve => {
  gf.evaluate((d, s, p) => {
    window.__probeResult = null;
    google.script.run.withSuccessHandler(function (c) { window.__probeResult = c; }).withFailureHandler(function (e) { window.__probeResult = { error: e.message }; }).getMachineCascade(d, s, p);
  }, div, sec, dept);
  const t0 = Date.now();
  const iv = setInterval(async () => {
    const v = await gf.evaluate(() => window.__probeResult);
    if (v !== null) { clearInterval(iv); resolve(v); }
    if (Date.now() - t0 > 60000) { clearInterval(iv); resolve({ error: 'timeout' }); }
  }, 500);
});

const c1 = await call('DIV001', '', '');
console.log('=== getMachineCascade(DIV001,"","") ===');
console.log('sections:', (c1.sections || []).map(s => s.id || s.ID));
console.log('depts:', (c1.departments || []).map(d => (d.id || d.ID) + ':' + (d.name || d.Name)));
console.log('machines:', (c1.machines || []).length, (c1.machines || []).slice(0, 2));

const c2 = await call('DIV001', 'SEC002', '');
console.log('=== getMachineCascade(DIV001,SEC002,"") ===');
console.log('depts:', (c2.departments || []).map(d => (d.id || d.ID) + ':' + (d.name || d.Name)));
console.log('machines:', (c2.machines || []).length);

await browser.close();
