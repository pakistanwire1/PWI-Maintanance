import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });

async function dumpSelect(frame, id) {
  return frame.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return Array.from(el.options).map(o => ({ v: o.value, t: o.textContent }));
  }, id);
}

// ---- CF ----
const cf = await browser.newPage();
await cf.setViewport({ width: 1440, height: 900 });
await cf.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await cf.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cf.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await cf.waitForSelector('#loginForm', { timeout: 60000 });
await cf.type('#loginEmail', EMAIL);
await cf.type('#loginPassword', PASSWORD);
await cf.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cf.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cf.waitForSelector('#pageContent', { timeout: 60000 });
await cf.evaluate(() => navigateTo('reports'));
await cf.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1, { timeout: 120000 });
await sleep(4000);
console.log('--- CF initial selects ---');
console.log('rptDivision:', JSON.stringify(await dumpSelect(cf, 'rptDivision')));
console.log('rptSection:', JSON.stringify(await dumpSelect(cf, 'rptSection')));
console.log('rptDepartment:', JSON.stringify(await dumpSelect(cf, 'rptDepartment')));
console.log('rptMachineNumber:', JSON.stringify((await dumpSelect(cf, 'rptMachineNumber') || []).slice(0, 3)) + ' total=' + (await dumpSelect(cf, 'rptMachineNumber') || []).length);

// select DIV001 and wait long
await cf.evaluate(() => { const s = document.getElementById('rptDivision'); s.value = 'DIV001'; s.dispatchEvent(new Event('change')); });
await sleep(1000);
console.log('--- CF after DIV001 +1s ---');
console.log('rptSection:', JSON.stringify(await dumpSelect(cf, 'rptSection')));
console.log('rptDepartment:', JSON.stringify(await dumpSelect(cf, 'rptDepartment')));
console.log('rptMachineNumber total:', (await dumpSelect(cf, 'rptMachineNumber') || []).length, 'division=', await cf.evaluate(() => document.getElementById('rptDivision').value));
await sleep(30000);
console.log('--- CF after DIV001 +31s ---');
console.log('rptSection:', JSON.stringify(await dumpSelect(cf, 'rptSection')));
console.log('rptDepartment:', JSON.stringify((await dumpSelect(cf, 'rptDepartment') || []).slice(0, 4)) + ' total=' + (await dumpSelect(cf, 'rptDepartment') || []).length);
console.log('rptMachineNumber total:', (await dumpSelect(cf, 'rptMachineNumber') || []).length, 'division=', await cf.evaluate(() => document.getElementById('rptDivision').value));

// ---- GAS ----
const gp = await browser.newPage();
await gp.setViewport({ width: 1440, height: 900 });
await gp.goto(GAS, { waitUntil: 'networkidle2', timeout: 120000 });
async function findGasFrame() {
  for (const f of gp.frames()) {
    if (f === gp.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gf = null;
{
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    gf = await findGasFrame();
    if (gf) { const hf = await gf.evaluate(() => !!document.getElementById('loginForm')).catch(() => false); if (hf) break; }
    await sleep(3000);
  }
}
await gf.type('#loginEmail', EMAIL);
await gf.type('#loginPassword', PASSWORD);
await gf.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gf.waitForFunction(() => { const ac = document.getElementById('appContainer'); return ac && ac.style.display !== 'none'; }, { timeout: 120000 });
await sleep(3000);
await gf.evaluate(() => navigateTo('reports'));
await gf.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1, { timeout: 120000 });
await sleep(4000);
console.log('--- GAS initial selects ---');
console.log('rptDivision:', JSON.stringify(await dumpSelect(gf, 'rptDivision')));
console.log('rptSection:', JSON.stringify(await dumpSelect(gf, 'rptSection')));
console.log('rptDepartment:', JSON.stringify(await dumpSelect(gf, 'rptDepartment')));
console.log('rptMachineNumber:', JSON.stringify((await dumpSelect(gf, 'rptMachineNumber') || []).slice(0, 3)) + ' total=' + (await dumpSelect(gf, 'rptMachineNumber') || []).length);

await gf.evaluate(() => { const s = document.getElementById('rptDivision'); s.value = 'DIV001'; s.dispatchEvent(new Event('change')); });
await sleep(1000);
console.log('--- GAS after DIV001 +1s ---');
console.log('rptSection:', JSON.stringify(await dumpSelect(gf, 'rptSection')));
console.log('rptDepartment:', JSON.stringify(await dumpSelect(gf, 'rptDepartment')));
console.log('rptMachineNumber total:', (await dumpSelect(gf, 'rptMachineNumber') || []).length, 'division=', await gf.evaluate(() => document.getElementById('rptDivision').value));
await sleep(30000);
console.log('--- GAS after DIV001 +31s ---');
console.log('rptSection:', JSON.stringify(await dumpSelect(gf, 'rptSection')));
console.log('rptDepartment:', JSON.stringify((await dumpSelect(gf, 'rptDepartment') || []).slice(0, 4)) + ' total=' + (await dumpSelect(gf, 'rptDepartment') || []).length);
console.log('rptMachineNumber total:', (await dumpSelect(gf, 'rptMachineNumber') || []).length, 'division=', await gf.evaluate(() => document.getElementById('rptDivision').value));

await browser.close();
console.log('DONE');
