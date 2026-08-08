import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(m);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', 'supervisor@cmms.com');
await page.type('#loginPassword', 'super123');
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1200);

const res = await page.evaluate(async () => {
  const out = {};
  const call = async (action) => {
    const r = await fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: localStorage.getItem('cmms_token'), data: {} }) });
    const j = await r.json();
    return (j.data && (j.data.records || j.data)) || j.records || [];
  };
  const assets = await call('getAssets');
  const machines = await call('getMachines');
  out.totalAssets = assets.length;
  out.totalMachines = machines.length;
  out.assetsWithNoMachineId = assets.filter(a => !a.MachineID).length;
  const m = machines[0];
  out.sampleMachine = { id: m.MachineID, num: m.MachineNumber, code: m.MachineCode, name: m.MachineName, dept: m.Department };
  const m1Assets = assets.filter(a => a.MachineID === m.MachineID);
  out.machine1AssetCount = m1Assets.length;
  out.machine1AssetIds = m1Assets.map(a => a.AssetID);
  const byMachine = {};
  assets.forEach(a => { byMachine[a.MachineID] = (byMachine[a.MachineID] || 0) + 1; });
  out.machinesWithAssets = Object.keys(byMachine).length;
  out.assetsPerMachine = byMachine;
  const unmatchedMachines = machines.filter(mc => !assets.some(a => a.MachineID === mc.MachineID));
  out.machinesWithZeroAssets = unmatchedMachines.map(mc => mc.MachineID + ':' + (mc.MachineNumber || mc.MachineCode));
  return out;
});
log('RESULT: ' + JSON.stringify(res, null, 1));
await browser.close();
