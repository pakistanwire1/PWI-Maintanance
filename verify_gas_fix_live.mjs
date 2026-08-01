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
await sleep(3000);
await gf.evaluate(() => navigateTo('reports'));
await gf.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1 && document.getElementById('rptDepartment').options.length > 1 && document.getElementById('rptDepartment').options[1].value !== 'undefined', { timeout: 240000 });
await sleep(1000);

const R = {};
R.initial = await gf.evaluate(() => {
  const dept = Array.from(document.getElementById('rptDepartment').options).slice(1, 4).map(o => o.value + ':' + o.text);
  const divs = Array.from(document.getElementById('rptDivision').options).slice(1, 3).map(o => o.value + ':' + o.text);
  return { divs, dept, divVal: document.getElementById('rptDivision').value, secCount: document.getElementById('rptSection').options.length - 1, deptCount: document.getElementById('rptDepartment').options.length - 1, machCount: document.getElementById('rptMachineNumber').options.length - 1 };
});

R.divChange = await (async () => {
  await gf.select('#rptDivision', 'DIV001');
  await sleep(250);
  const at250 = await gf.evaluate(() => ({ div: document.getElementById('rptDivision').value, sec: document.getElementById('rptSection').options[0].text, dept: document.getElementById('rptDepartment').options[0].text }));
  await gf.waitForFunction(() => document.getElementById('rptDepartment').options.length > 1 && document.getElementById('rptDepartment').options[0].text !== 'Loading...', { timeout: 60000 });
  await sleep(500);
  return await gf.evaluate(() => {
    const dept = Array.from(document.getElementById('rptDepartment').options).map(o => o.value + ':' + o.text);
    return {
      div: document.getElementById('rptDivision').value,
      secCount: document.getElementById('rptSection').options.length - 1,
      secValues: Array.from(document.getElementById('rptSection').options).slice(1).map(o => o.value),
      deptCount: document.getElementById('rptDepartment').options.length - 1,
      deptLabels: Array.from(document.getElementById('rptDepartment').options).slice(1, 4).map(o => o.text),
      machCount: document.getElementById('rptMachineNumber').options.length - 1,
      stuck: document.getElementById('rptDepartment').options[0].text === 'Loading...'
    };
  });
})();

R.secChange = await (async () => {
  await gf.select('#rptSection', 'SEC002');
  await sleep(250);
  const at250 = await gf.evaluate(() => ({ div: document.getElementById('rptDivision').value, sec: document.getElementById('rptSection').value, dept: document.getElementById('rptDepartment').options[0].text }));
  await gf.waitForFunction(() => document.getElementById('rptDepartment').options.length > 1 && document.getElementById('rptDepartment').options[0].text !== 'Loading...', { timeout: 60000 });
  await sleep(500);
  return await gf.evaluate(() => {
    return {
      div: document.getElementById('rptDivision').value,
      sec: document.getElementById('rptSection').value,
      deptCount: document.getElementById('rptDepartment').options.length - 1,
      deptLabels: Array.from(document.getElementById('rptDepartment').options).slice(1).map(o => o.text),
      machCount: document.getElementById('rptMachineNumber').options.length - 1,
      machFirst: Array.from(document.getElementById('rptMachineNumber').options).slice(1, 4).map(o => o.text),
      stuck: document.getElementById('rptDepartment').options[0].text === 'Loading...'
    };
  });
})();

console.log(JSON.stringify(R, null, 1));
await browser.close();
