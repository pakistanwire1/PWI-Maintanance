import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--incognito'] });
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
const loggedIn = await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false);
if (!loggedIn) { console.log('NOT LOGGED IN'); await browser.close(); process.exit(1); }
await sleep(3000);

const out = await page.evaluate(async () => {
  const res = {};

  const jc = await API.post('getJobCards', { page: 1, pageSize: 5000 });
  const rows = jc.records || [];
  res.jcTotal = jc.total;
  res.jcFetched = rows.length;
  res.sampleKeys = rows.length ? Object.keys(rows[0]) : [];
  res.sampleFirst = rows.slice(0, 2).map(r => {
    const o = {};
    ['JobCardNo','CurrentStatus','Status','Machine','AssetID','MachineID','MachineNumber','MachineCode','MachineName','Department','Section'].forEach(k => o[k] = r[k]);
    return o;
  });
  const machines = await API.post('getMachines', {});
  res.machineTotal = (machines || []).length;
  res.machineSample = (machines || []).slice(0, 6).map(m => {
    const o = {};
    ['MachineID','MachineCode','MachineNumber','MachineName','Department','Section'].forEach(k => o[k] = m[k]);
    return o;
  });
  res.machineKeys = machines && machines.length ? Object.keys(machines[0]) : [];

  const jcMachines = {};
  rows.forEach(r => {
    const key = String(r.Machine || '(empty)');
    jcMachines[key] = (jcMachines[key] || 0) + 1;
  });
  res.jcMachineDistribution = jcMachines;

  const sc = await API.post('getSidebarCounts', { _userEmail: Session.getUser().email });
  res.sidebarCounts = sc && sc.data ? sc.data : sc;

  const dd = await API.post('getDashboardData', { filter: 'all', department: '', email: Session.getUser().email });
  res.dashboard = dd && dd.data ? dd.data : dd;
  return res;
});
fs.writeFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/probe_live_full_out.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
