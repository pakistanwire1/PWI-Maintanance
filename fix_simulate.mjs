import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickAppFrame();
while (!app && Date.now() - t0 < 90000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(0); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(2000);
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('app ready');
await sleep(1500);
const before = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const r = el.getBoundingClientRect();
  return { parent: el.parentElement.id, op: getComputedStyle(el).opacity, rect: Math.round(r.width) + 'x' + Math.round(r.height) };
});
console.log('BEFORE fix (audit still in modal): ' + JSON.stringify(before));
// Simulate the production fix: move #auditPage out of the modal to .page-content (as a sibling of dashboard/settings)
await app.evaluate(() => {
  const pc = document.querySelector('.page-content');
  const el = document.getElementById('auditPage');
  pc.insertBefore(el, pc.firstChild);
});
await sleep(300);
// navigate to audit now that it's a direct child
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="audit"]'); i.click(); });
await sleep(4000);
const after = await app.evaluate(() => {
  const el = document.getElementById('auditPage');
  const r = el.getBoundingClientRect();
  return { parent: el.parentElement.className, op: getComputedStyle(el).opacity, rect: Math.round(r.width) + 'x' + Math.round(r.height), rows: document.querySelectorAll('#auditTable tbody tr').length, active: el.classList.contains('active') };
});
console.log('AFTER moving out of modal (fix simulation): ' + JSON.stringify(after));
await page.screenshot({ path: 'verify_shots/fix_sim_audit_painted.png' });
// also verify machines/users
await app.evaluate(() => {
  const pc = document.querySelector('.page-content');
  for (const id of ['machinesPage', 'usersPage']) {
    const el = document.getElementById(id);
    if (el && el.parentElement.id === 'assetFormModal') pc.insertBefore(el, pc.firstChild);
  }
});
await app.evaluate(() => { const i = document.querySelector('.sidebar-item[data-page="machines"]'); i.click(); });
await sleep(2500);
const machines = await app.evaluate(() => {
  const el = document.getElementById('machinesPage');
  const r = el.getBoundingClientRect();
  return { parent: el.parentElement.className, op: getComputedStyle(el).opacity, rect: Math.round(r.width) + 'x' + Math.round(r.height) };
});
console.log('MACHINES after move: ' + JSON.stringify(machines));
await page.screenshot({ path: 'verify_shots/fix_sim_machines_painted.png' });
await browser.close();
