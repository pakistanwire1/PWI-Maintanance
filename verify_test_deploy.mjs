import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAS = 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const OUT = 'verify_shots/test_deploy';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
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
while (!app && Date.now() - t0 < 120000) { await sleep(2000); app = await pickAppFrame(); }
if (!app) { console.log('NO FRAME'); await browser.close(); process.exit(1); }
while (!(await app.evaluate(() => !!document.getElementById('loginForm')).catch(() => false)) && Date.now() - t0 < 240000) await sleep(2000);
console.log('login form ready at ' + Math.round((Date.now() - t0) / 1000) + 's');
await app.evaluate((em, pw) => {
  const email = document.getElementById('loginEmail') || document.getElementById('email');
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  email.value = em; pass.value = pw;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}, creds.Email, creds.Password);
while (!(await app.evaluate(() => !!document.getElementById('appContainer') && document.getElementById('appContainer').style.display !== 'none').catch(() => false)) && Date.now() - t0 < 180000) await sleep(1500);
console.log('app ready at ' + Math.round((Date.now() - t0) / 1000) + 's');
await sleep(1500);
const pages = [
  ['audit', 'auditPage', '#auditTable'],
  ['sections', 'sectionsPage', '#sectionsTable'],
  ['departments', 'departmentsPage', '#departmentsTable'],
  ['machines', 'machinesPage', '#machinesTable'],
  ['technicians', 'techniciansPage', '#techniciansTable'],
  ['users', 'usersPage', '#usersTable'],
  ['openjobcard', 'openjobcardPage', '#openJobCardsTable'],
  ['startjobcard', 'startjobcardPage', '#startJobCardsTable'],
  ['closejobcard', 'closejobcardPage', '#closeJobCardsTable'],
  ['pendingjobcard', 'pendingjobcardPage', '#pendingJobCardsTable'],
  ['approvejobcard', 'approvejobcardPage', '#approveJobCardsTable'],
  ['jobcards', 'jobcardsPage', '#jobCardsTable'],
  ['pm', 'pmPage', '#pmTable'],
  ['checklists', 'checklistsPage', '#checklistsTable'],
  ['spareparts', 'sparepartsPage', '#sparePartsTable'],
  ['inventory', 'inventoryPage', '#inventoryTable'],
  ['notifications', 'notificationsPage', '#notificationsTable'],
  ['qr', 'qrPage', '#qrOverviewContainer']
];
const results = [];
for (const [nav, id, sel] of pages) {
  await app.evaluate(n => { const i = document.querySelector('.sidebar-item[data-page="' + n + '"]'); if (i) i.click(); }, nav).catch(() => {});
  await sleep(4500);
  const m = await app.evaluate(([pid, psel]) => {
    const el = document.getElementById(pid);
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const parent = el.parentElement ? (el.parentElement.id || el.parentElement.className || 'BODY') : '?';
    const tbl = psel ? document.querySelector(psel) : null;
    let rows = 0;
    if (tbl) { const tb = tbl.querySelector('tbody'); rows = tb ? tb.children.length : 0; }
    const cards = document.querySelectorAll(pid ? '#' + pid + ' .stat-card, #' + pid + ' .card' : '').length;
    return { nav: pid.replace('Page', ''), parent, op: cs.opacity, anim: cs.animationName, rect: Math.round(r.width) + 'x' + Math.round(r.height), rows, cards, active: el.classList.contains('active') };
  }, [id, sel]).catch(e => ({ nav: id, err: String(e) }));
  await page.screenshot({ path: OUT + '/' + id + '.png' }).catch(() => {});
  const ok = m.rect !== '0x0' && m.op === '1';
  results.push({ ...m, ok });
  console.log(JSON.stringify({ nav, ok, ...m }));
}
console.log('PASS COUNT: ' + results.filter(r => r.ok).length + '/' + results.length);
fs.writeFileSync(OUT + '/results.json', JSON.stringify(results, null, 2));
await browser.close();
