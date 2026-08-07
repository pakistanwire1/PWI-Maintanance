import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'machines.js');
const LOCAL_CONSTANTS = path.join(__dirname, 'cloudflare', 'js', 'core', 'constants.js');
const OUT = path.join(__dirname, 'machines_screens');
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
const localConstants = fs.readFileSync(LOCAL_CONSTANTS, 'utf8');

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
      const url = req.url();
      if (url.includes('/js/pages/machines.js')) {
        req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: localJs });
      } else if (url.includes('/js/core/constants.js')) {
        req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: localConstants });
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
  await page.evaluate(() => navigateTo('machines'));
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#machinesTableContainer table tbody tr, #machineTable tbody tr').length;
    const c = document.getElementById('machinesTableContainer') || document.getElementById('machineTable');
    return !!c && (rows > 0 || c.innerHTML.indexOf('No Data Found') !== -1 || c.innerHTML.indexOf('No records match your search criteria.') !== -1);
  }, { timeout: 120000 });
  await sleep(1500);
  return page;
}

async function firstMachineId(page) {
  return page.evaluate(() => {
    const row = document.querySelector('#machinesTableContainer table tbody tr, #machineTable tbody tr');
    if (!row) return null;
    const m = row.innerHTML.match(/Machine\.openEdit\('([^']+)'\)/) || row.innerHTML.match(/Machine\.openEdit\("([^"]+)"\)/) ||
      row.innerHTML.match(/Machine\.confirmDelete\('([^']+)'\)/) || row.innerHTML.match(/openEdit\('([^']+)'\)/) ||
      row.innerHTML.match(/openEdit\("([^"]+)"\)/);
    return m ? m[1] : null;
  });
}

async function capture(browser, opts) {
  const { name, viewport, interceptLocal, action } = opts;
  const page = await openPage(browser, viewport, interceptLocal);
  const modalInfo = {};

  if (action) {
    if (action === 'add') {
      await page.evaluate(() => Machine.openAdd());
      await page.waitForFunction(() => document.getElementById('machineFormModal').classList.contains('show'), { timeout: 10000 });
    } else if (action === 'empty') {
      await page.evaluate(() => {
        const el = document.getElementById('machineSearch');
        el.value = 'zzzz_nomatch_zzzz';
        el.dispatchEvent(new Event('keyup'));
      });
      await page.waitForFunction(() => document.getElementById('machinesTableContainer').innerHTML.indexOf('No Data Found') !== -1, { timeout: 10000 });
    } else {
      const id = await firstMachineId(page);
      console.log('CAPTURE [' + name + '] action=' + action + ' foundId=' + id);
      if (!id) throw new Error('no machine id found for action ' + action);
      if (action === 'edit') {
        await page.evaluate((i) => Machine.openEdit(i), id);
        await page.waitForFunction(() => document.getElementById('machineFormModal').classList.contains('show'), { timeout: 10000 });
      } else if (action === 'delete') {
        await page.evaluate((i) => Machine.confirmDelete(i), id);
        await page.waitForFunction(() => {
          const m = document.getElementById('confirmModal');
          return !!m && m.classList.contains('show');
        }, { timeout: 10000 }).catch(async e => {
          const st = await page.evaluate(() => {
            const m = document.getElementById('confirmModal');
            return m ? JSON.stringify({ exists: true, cls: m.className }) : JSON.stringify({ exists: false });
          });
          throw new Error('confirm modal never shown; state=' + st);
        });
      }
    }
    await sleep(800);
  }

  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });

  modalInfo.rows = await page.evaluate(() => document.querySelectorAll('#machinesTableContainer table tbody tr, #machineTable tbody tr').length);
  modalInfo.addFormOpen = await page.evaluate(() => { const e = document.getElementById('machineFormModal'); return !!e && e.classList.contains('show'); });
  modalInfo.deleteOpen = await page.evaluate(() => { const e = document.getElementById('confirmModal'); return !!e && e.classList.contains('show'); });
  modalInfo.empty = await page.evaluate(() => {
    const c = document.getElementById('machinesTableContainer') || document.getElementById('machineTable');
    return c ? (c.innerHTML.indexOf('No Data Found') !== -1 || c.innerHTML.indexOf('No records match your search criteria.') !== -1) : false;
  });
  await page.close();
  return modalInfo;
}

let browser;
try {
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  const beforeDesktop = await capture(browser, { name: 'machines_before_desktop', viewport: { width: 1440, height: 900 }, interceptLocal: false });
  const afterDesktop = await capture(browser, { name: 'machines_after_desktop', viewport: { width: 1440, height: 900 }, interceptLocal: true });
  const afterAdd = await capture(browser, { name: 'machines_after_add_form', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'add' });
  const afterEdit = await capture(browser, { name: 'machines_after_edit_form', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'edit' });
  const afterDelete = await capture(browser, { name: 'machines_after_delete_dialog', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'delete' });
  const afterEmpty = await capture(browser, { name: 'machines_after_empty_state', viewport: { width: 1440, height: 900 }, interceptLocal: true, action: 'empty' });
  const afterMobile = await capture(browser, { name: 'machines_after_mobile', viewport: { width: 390, height: 844 }, interceptLocal: true });

  console.log('BEFORE desktop:   ' + JSON.stringify(beforeDesktop));
  console.log('AFTER  desktop:   ' + JSON.stringify(afterDesktop));
  console.log('AFTER  add-form:  ' + JSON.stringify(afterAdd));
  console.log('AFTER  edit-form: ' + JSON.stringify(afterEdit));
  console.log('AFTER  delete:    ' + JSON.stringify(afterDelete));
  console.log('AFTER  empty:     ' + JSON.stringify(afterEmpty));
  console.log('AFTER  mobile:    ' + JSON.stringify(afterMobile));
  console.log('Screenshots written to ' + OUT + ': ' + fs.readdirSync(OUT).join(', '));
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
