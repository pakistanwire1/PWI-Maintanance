import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'users.js');
const OUT = path.join(__dirname, 'users_screens');
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const credsFile = 'C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json';
let EMAIL = 'pakistanwire1@gmail.com';
let PASSWORD = 'admin123';
try {
  const c = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  if (c.Email && c.Password) { EMAIL = c.Email; PASSWORD = c.Password; }
} catch (e) {}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const localJs = fs.readFileSync(LOCAL_JS, 'utf8');

async function openPage(browser, viewport, interceptLocal) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(rs => { rs.forEach(r => { try { r.unregister(); } catch (e) {} }); });
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.register) {
        Object.defineProperty(navigator.serviceWorker, 'register', {
          value: function() { return Promise.resolve({ unregister: function() { return Promise.resolve(true); } }); },
          configurable: true
        });
      }
    } catch (e) {}
  });
  if (interceptLocal) {
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().includes('/js/pages/users.js')) {
        req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: localJs });
      } else req.continue();
    });
  }
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#loginForm', { timeout: 60000 });
  await page.type('#loginEmail', EMAIL);
  await page.type('#loginPassword', PASSWORD);
  await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 90000 });
  await page.waitForSelector('#pageContent', { timeout: 60000 });
  await page.evaluate(() => navigateTo('users'));
  await page.waitForFunction(() => {
    const t = document.getElementById('usersTable') || document.getElementById('userTableBody');
    return t && t.querySelectorAll('tbody tr, tr').length > 0;
  }, { timeout: 120000 });
  await sleep(1500);
  return page;
}

async function firstUserId(page) {
  return page.evaluate(() => {
    const t = document.getElementById('usersTable') || document.getElementById('userTableBody');
    const row = t && (t.querySelector('tbody tr') || t.querySelector('tr'));
    if (!row) return null;
    const m = row.innerHTML.match(/openEdit\('([^']+)'\)/) || row.innerHTML.match(/openEdit\("([^"]+)"\)/) ||
      row.innerHTML.match(/openEdit\((\d+)\)/);
    if (m) return m[1];
    const vm = row.innerHTML.match(/viewUser\('([^']+)'\)/) || row.innerHTML.match(/viewUser\((\d+)\)/);
    return vm ? vm[1] : null;
  });
}

async function safeDeleteUserId(page) {
  return page.evaluate(() => {
    const sessionEmail = (JSON.parse(localStorage.getItem('cmms_user') || '{}').email) || '';
    const t = document.getElementById('usersTable') || document.getElementById('userTableBody');
    const body = (t && t.querySelector('tbody')) || t;
    const rows = body ? Array.from(body.querySelectorAll('tr')) : [];
    for (const row of rows) {
      const txt = row.textContent || '';
      if (sessionEmail && txt.includes(sessionEmail)) continue;
      if (/administrator/i.test(txt)) continue;
      const m = row.innerHTML.match(/openEdit\('([^']+)'\)/) || row.innerHTML.match(/openEdit\("([^"]+)"\)/) || row.innerHTML.match(/openEdit\((\d+)\)/);
      if (m) return m[1];
    }
    const r2 = rows[1];
    const m2 = r2 && (r2.innerHTML.match(/openEdit\('([^']+)'\)/) || r2.innerHTML.match(/openEdit\("([^"]+)"\)/) || r2.innerHTML.match(/openEdit\((\d+)\)/));
    return m2 ? m2[1] : null;
  });
}

async function capture(browser, opts) {
  const { name, viewport, interceptLocal, action } = opts;
  const page = await openPage(browser, viewport, interceptLocal);
  const modalInfo = {};

  if (action) {
    if (action === 'add') {
      await page.evaluate(() => User.openAdd());
      await page.waitForFunction(() => document.getElementById('userFormModal').classList.contains('show'), { timeout: 10000 });
    } else {
      const id = await firstUserId(page);
      console.log('CAPTURE [' + name + '] action=' + action + ' foundId=' + id);
      if (!id) throw new Error('no user id found for action ' + action);
      if (action === 'edit') {
        await page.evaluate((i) => User.openEdit(i), id);
        await page.waitForFunction(() => document.getElementById('userFormModal').classList.contains('show'), { timeout: 10000 });
      } else if (action === 'reset') {
        await page.evaluate((i) => User.openResetPassword(i), id);
        await page.waitForFunction(() => document.getElementById('passwordResetModal').classList.contains('show'), { timeout: 10000 });
      } else if (action === 'delete') {
        const id = await safeDeleteUserId(page);
        console.log('CAPTURE [' + name + '] safeDeleteId=' + id);
        await page.evaluate((i) => User.confirmDelete(i), id);
        await page.waitForFunction(() => {
          const ov = document.getElementById('deleteConfirmOverlay');
          return !!ov && ov.style.display !== 'none';
        }, { timeout: 10000 }).catch(async e => {
          const st = await page.evaluate(() => {
            const ov = document.getElementById('deleteConfirmOverlay');
            return ov ? JSON.stringify({ exists: true, display: ov.style.display, cls: ov.className, htmlLen: ov.innerHTML.length }) : JSON.stringify({ exists: false });
          });
          throw new Error('delete overlay never shown; state=' + st);
        });
      } else if (action === 'view') {
        await page.evaluate((i) => User.viewUser(i), id);
        await page.waitForFunction(() => document.getElementById('viewUserModal').classList.contains('show'), { timeout: 10000 });
      }
    }
    await sleep(800);
  }

  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });

  modalInfo.rows = await page.evaluate(() => {
    const t = document.getElementById('usersTable') || document.getElementById('userTableBody');
    return t ? t.querySelectorAll('tbody tr, tr').length : 0;
  });
  modalInfo.total = await page.evaluate(() => (document.getElementById('usersTotal') || {}).textContent || null);
  modalInfo.addFormOpen = await page.evaluate(() => { const e = document.getElementById('userFormModal'); return !!e && e.classList.contains('show'); });
  modalInfo.resetOpen = await page.evaluate(() => { const e = document.getElementById('passwordResetModal'); return !!e && e.classList.contains('show'); });
  modalInfo.viewOpen = await page.evaluate(() => { const e = document.getElementById('viewUserModal'); return !!e && e.classList.contains('show'); });
  modalInfo.deleteOpen = await page.evaluate(() => { const e = document.getElementById('deleteConfirmOverlay'); return !!e && e.style.display !== 'none'; });
  await page.close();
  return modalInfo;
}

let browser;
try {
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  const beforeDesktop = await capture(browser, { name: 'users_before_desktop', viewport: { width: 1440, height: 900 }, interceptLocal: false });
  const afterDesktop = await capture(browser, { name: 'users_after_desktop', viewport: { width: 1440, height: 900 }, interceptLocal: true });
  const afterAdd = await capture(browser, { name: 'users_after_add_form', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'add' });
  const afterEdit = await capture(browser, { name: 'users_after_edit_form', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'edit' });
  const afterReset = await capture(browser, { name: 'users_after_reset_dialog', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'reset' });
  const afterDelete = await capture(browser, { name: 'users_after_delete_dialog', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'delete' });
  const afterView = await capture(browser, { name: 'users_after_view_modal', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'view' });
  const afterMobile = await capture(browser, { name: 'users_after_mobile', viewport: { width: 390, height: 844 }, interceptLocal: true });

  console.log('BEFORE desktop:   ' + JSON.stringify(beforeDesktop));
  console.log('AFTER  desktop:   ' + JSON.stringify(afterDesktop));
  console.log('AFTER  add-form:  ' + JSON.stringify(afterAdd));
  console.log('AFTER  edit-form: ' + JSON.stringify(afterEdit));
  console.log('AFTER  reset:     ' + JSON.stringify(afterReset));
  console.log('AFTER  delete:    ' + JSON.stringify(afterDelete));
  console.log('AFTER  view:      ' + JSON.stringify(afterView));
  console.log('AFTER  mobile:    ' + JSON.stringify(afterMobile));
  console.log('Screenshots written to ' + OUT + ': ' + fs.readdirSync(OUT).join(', '));
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
