import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const OUT = 'C:/Users/afsar/AppData/Local/Temp/opencode/jobcard_verify';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/jcdeep_chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => {});
await sleep(4000);
const onWelcome = await page.evaluate(() => { const w = document.getElementById('welcomePage'); return w && getComputedStyle(w).display !== 'none'; }).catch(() => false);
if (onWelcome) {
  await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => {});
  await sleep(4000);
}
for (let i = 0; i < 30; i++) {
  const st = await page.evaluate(() => {
    const lp = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    return { lv: lp && getComputedStyle(lp).display !== 'none', av: app && getComputedStyle(app).display !== 'none' };
  }).catch(() => ({}));
  if (st.av) break;
  if (st.lv) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
    await sleep(5000);
  }
  await sleep(1500);
}
console.log('loggedIn=', await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false));
await sleep(3000);

await page.evaluate(() => navigateTo('openjobcard'));
await sleep(6000);

const deep = await page.evaluate(async () => {
  const out = { chains: [], perDivision: [] };
  const getOpts = id => Array.from(document.getElementById(id).options).map(o => o.value).filter(v => v);
  const wait = ms => new Promise(r => setTimeout(r, 200));
  const divSel = document.getElementById('jcDivision');
  const divOpts = getOpts('jcDivision');
  out.divCount = divOpts.length;

  for (const dv of divOpts) {
    divSel.value = dv;
    divSel.dispatchEvent(new Event('change'));
    await wait();
    const secOpts = getOpts('jcSection');
    const divRec = { division: dv, sectionCount: secOpts.length, sections: [], maxChainDepth: 0 };
    for (const sec of secOpts) {
      document.getElementById('jcSection').value = sec;
      document.getElementById('jcSection').dispatchEvent(new Event('change'));
      await wait();
      const deptOpts = getOpts('jcDepartment');
      const secRec = { section: sec, deptCount: deptOpts.length, depts: [], maxChainDepth: 1 };
      for (const dep of deptOpts) {
        document.getElementById('jcDepartment').value = dep;
        document.getElementById('jcDepartment').dispatchEvent(new Event('change'));
        await wait();
        const machOpts = getOpts('jcMachine');
        const depRec = { dept: dep, machineCount: machOpts.length, maxChainDepth: 2 };
        if (machOpts.length) {
          document.getElementById('jcMachine').value = machOpts[0];
          document.getElementById('jcMachine').dispatchEvent(new Event('change'));
          await wait();
          const assetOpts = getOpts('jcAsset');
          depRec.assetCount = assetOpts.length;
          depRec.sampleAsset = assetOpts[0] || null;
          depRec.maxChainDepth = assetOpts.length ? 4 : 3;
          if (assetOpts.length) {
            out.chains.push({ division: dv, section: sec, dept: dep, machine: machOpts[0], asset: assetOpts[0] });
          }
        } else {
          depRec.maxChainDepth = 2;
        }
        secRec.depts.push(depRec);
        if (depRec.maxChainDepth > secRec.maxChainDepth) secRec.maxChainDepth = depRec.maxChainDepth;
      }
      divRec.sections.push(secRec);
      if (secRec.maxChainDepth > divRec.maxChainDepth) divRec.maxChainDepth = secRec.maxChainDepth;
    }
    out.perDivision.push(divRec);
  }
  return out;
});

console.log('DEEP=' + JSON.stringify(deep, null, 1));
fs.writeFileSync(OUT + '/cascade_deep.json', JSON.stringify(deep, null, 2));
await browser.close();
console.log('DONE');
