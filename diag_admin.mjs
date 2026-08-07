import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const t0 = Date.now();
await page.goto(GAS, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
async function pickAppFrame() {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let app = await pickAppFrame();
while (!app && Date.now() - t0 < 90000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(0); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 180000) await sleep(2000);
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's login form ready');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  const form = document.getElementById('loginForm');
  email.value = em; pass.value = pw;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, 'supervisor@cmms.com', 'super123');
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 120000) await sleep(1500);
console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's app ready. Fetching users...');
await app.evaluate(() => {
  try { google.script.run.withSuccessHandler(r => { window.__users = r; }).getUsers(); } catch (e) { window.__users = { err: e.message }; }
});
let users = null;
for (let i = 0; i < 60 && !users; i++) { await sleep(1000); users = await app.evaluate(() => window.__users || null).catch(() => null); }
if (!users) { console.log('NO USERS RESULT'); await browser.close(); process.exit(0); }
const admin = (users || []).find(u => String(u.Role).toLowerCase().indexOf('admin') >= 0);
const all = (users || []).map(u => ({ Name: u.Name, Email: u.Email, Role: u.Role, Status: u.Status }));
console.log('ALL USERS:');
for (const u of all) console.log('  ' + JSON.stringify(u));
if (admin) {
  fs.writeFileSync(process.env.TEMP_ADMIN_FILE || 'C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', JSON.stringify({ Email: admin.Email, Password: admin.Password, Name: admin.Name, Role: admin.Role }));
  console.log('ADMIN CREDENTIALS SAVED to temp/admin_creds.json (Name=' + admin.Name + ' Role=' + admin.Role + ' Email=' + admin.Email + ')');
} else {
  console.log('NO ADMIN-ROLE USER FOUND');
}
await browser.close();
