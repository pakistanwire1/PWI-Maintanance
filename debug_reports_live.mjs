import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });

// ============ CF ============
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1440, height: 900 });
const cfApiCalls = {};
cfPage.on('response', async res => {
  if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
    try { const a = JSON.parse(res.request().postData()).action; cfApiCalls[a] = (cfApiCalls[a] || 0) + 1; } catch(e) {}
  }
});
await cfPage.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1500);

await cfPage.evaluate(() => navigateTo('reports'));
await cfPage.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1, { timeout: 60000 });
await sleep(2500);

const cfLayout = await cfPage.evaluate(() => {
  const groups = Array.from(document.querySelectorAll('#reportsPage .rpt-filter-row .rpt-filter-group')).map(g => {
    const r = g.getBoundingClientRect();
    return { label: g.querySelector('label').textContent.trim(), top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width) };
  });
  const pc = document.getElementById('pageContent').getBoundingClientRect();
  const rows = {};
  groups.forEach(g => { (rows[g.top] = rows[g.top] || []).push(g.label); });
  return { groups, pageContentW: Math.round(pc.width), distinctTops: Object.values(rows) };
});

console.log('=== CF LAYOUT ===');
console.log('pageContent width:', cfLayout.pageContentW);
console.log('distinct rows (by top):', JSON.stringify(cfLayout.distinctTops, null, 0));
console.log('groups:', JSON.stringify(cfLayout.groups, null, 0));

// Cascade test on CF
const cfCascade = await (async () => {
  const out = {};
  const divs = await cfPage.evaluate(() => Array.from(document.getElementById('rptDivision').options).map(o => o.value).filter(v => v !== ''));
  out.divisionCount = divs.length;
  out.divisionToSelect = divs[0];
  await cfPage.evaluate((dv) => {
    const sel = document.getElementById('rptDivision');
    sel.value = dv; sel.dispatchEvent(new Event('change'));
  }, divs[0]);
  await sleep(120);
  out.instant = await cfPage.evaluate(() => ({
    section: document.getElementById('rptSection').value,
    sectionOpts: Array.from(document.getElementById('rptSection').options).map(o => o.text),
    dept: document.getElementById('rptDepartment').value,
    mach: document.getElementById('rptMachineNumber').value,
    division: document.getElementById('rptDivision').value
  }));
  await sleep(2500);
  out.settled = await cfPage.evaluate(() => ({
    division: document.getElementById('rptDivision').value,
    section: document.getElementById('rptSection').value,
    sectionCount: document.getElementById('rptSection').options.length,
    deptCount: document.getElementById('rptDepartment').options.length,
    machCount: document.getElementById('rptMachineNumber').options.length,
    hasLoading: Array.from(document.querySelectorAll('#rptSection option,#rptDepartment option,#rptMachineNumber option')).some(o => o.text.includes('Loading'))
  }));
  return out;
})();
console.log('=== CF CASCADE ===', JSON.stringify(cfCascade, null, 0));

// master-list reload on navigation (CF)
const cfNav = {};
for (const p of ['dashboard', 'inventory', 'assets', 'reports', 'reports']) {
  const before = JSON.stringify(cfApiCalls);
  await cfPage.evaluate((p) => navigateTo(p), p);
  await sleep(3000);
  cfNav[p] = JSON.stringify(cfApiCalls) !== before ? Object.assign({}, cfApiCalls) : '(no new calls)';
}
console.log('=== CF API CALLS after nav ===', JSON.stringify(cfApiCalls, null, 0));
console.log('=== CF per-nav delta ===', JSON.stringify(cfNav, null, 0));

// ============ GAS ============
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1440, height: 900 });
await gasPage.goto(GAS, { waitUntil: 'networkidle2', timeout: 120000 });

async function findGasFrame() {
  for (const f of gasPage.frames()) {
    if (f === gasPage.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null;
{
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    gasFrame = await findGasFrame();
    if (gasFrame) {
      const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
      if (hasForm) break;
    }
    await sleep(3000);
  }
}
await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 120000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('reports'));
await gasFrame.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1, { timeout: 60000 });
await sleep(2500);

const gasLayout = await gasFrame.evaluate(() => {
  const groups = Array.from(document.querySelectorAll('#reportsPage .rpt-filter-row .rpt-filter-group')).map(g => {
    const r = g.getBoundingClientRect();
    return { label: g.querySelector('label').textContent.trim(), top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width) };
  });
  const app = document.getElementById('appContainer').getBoundingClientRect();
  const rows = {};
  groups.forEach(g => { (rows[g.top] = rows[g.top] || []).push(g.label); });
  return { groups, appW: Math.round(app.width), distinctTops: Object.values(rows) };
});
console.log('=== GAS LAYOUT ===');
console.log('appContainer width:', gasLayout.appW);
console.log('distinct rows (by top):', JSON.stringify(gasLayout.distinctTops, null, 0));
console.log('groups:', JSON.stringify(gasLayout.groups, null, 0));

const gasCascade = await (async () => {
  const out = {};
  const divs = await gasFrame.evaluate(() => Array.from(document.getElementById('rptDivision').options).map(o => o.value).filter(v => v !== ''));
  out.divisionCount = divs.length;
  out.divisionToSelect = divs[0];
  await gasFrame.evaluate((dv) => {
    const sel = document.getElementById('rptDivision');
    sel.value = dv; sel.dispatchEvent(new Event('change'));
  }, divs[0]);
  await sleep(120);
  out.instant = await gasFrame.evaluate(() => ({
    section: document.getElementById('rptSection').value,
    sectionOpts: Array.from(document.getElementById('rptSection').options).map(o => o.text),
    dept: document.getElementById('rptDepartment').value,
    mach: document.getElementById('rptMachineNumber').value,
    division: document.getElementById('rptDivision').value
  }));
  await sleep(2500);
  out.settled = await gasFrame.evaluate(() => ({
    division: document.getElementById('rptDivision').value,
    section: document.getElementById('rptSection').value,
    sectionCount: document.getElementById('rptSection').options.length,
    deptCount: document.getElementById('rptDepartment').options.length,
    machCount: document.getElementById('rptMachineNumber').options.length,
    hasLoading: Array.from(document.querySelectorAll('#rptSection option,#rptDepartment option,#rptMachineNumber option')).some(o => o.text.includes('Loading'))
  }));
  return out;
})();
console.log('=== GAS CASCADE ===', JSON.stringify(gasCascade, null, 0));

await browser.close();
console.log('DONE');
