import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCAL_JS = path.join(__dirname, 'cloudflare', 'js', 'pages', 'notifications.js');
const OUT = path.join(__dirname, 'notif_screens');
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

async function capture(browser, opts) {
  const { name, viewport, interceptLocal, openModal } = opts;
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
      if (req.url().includes('/js/pages/notifications.js')) {
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
  await page.evaluate(() => navigateTo('notifications'));
  await page.waitForFunction(() => {
    const t = document.querySelector('#notifTableContainer');
    return t && (t.querySelector('tbody tr') || t.querySelector('.empty-state'));
  }, { timeout: 120000 });
  await sleep(1800);

  if (openModal) {
    await page.evaluate(() => {
      const btn = document.querySelector('#notifTableContainer .actions-cell .icon-btn');
      if (btn) btn.click();
    });
    await sleep(700);
  }

  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  const info = await page.evaluate(() => ({
    rows: document.querySelectorAll('#notifTableContainer tbody tr').length,
    total: (document.getElementById('notifTotal') || {}).textContent,
    perPage: document.querySelectorAll('#notifTableContainer tbody tr').length,
    info: (document.querySelector('#notifTableContainer .pagination-info') || {}).textContent || null,
    modalOpen: !!(document.querySelector('#notifViewModal') && document.querySelector('#notifViewModal').classList.contains('show'))
  }));
  await page.close();
  return info;
}

let browser;
try {
  browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  const beforeDesktop = await capture(browser, { name: 'notif_before_desktop', viewport: { width: 1440, height: 900 }, interceptLocal: false, openModal: false });
  const afterDesktop = await capture(browser, { name: 'notif_after_desktop', viewport: { width: 1440, height: 900 }, interceptLocal: true, openModal: false });
  const afterModal = await capture(browser, { name: 'notif_after_view_modal', viewport: { width: 1440, height: 900 }, interceptLocal: true, openModal: true });
  const afterMobile = await capture(browser, { name: 'notif_after_mobile', viewport: { width: 390, height: 844 }, interceptLocal: true, openModal: false });

  console.log('BEFORE desktop: ' + JSON.stringify(beforeDesktop));
  console.log('AFTER  desktop: ' + JSON.stringify(afterDesktop));
  console.log('AFTER  view-modal: ' + JSON.stringify(afterModal));
  console.log('AFTER  mobile:   ' + JSON.stringify(afterMobile));
  console.log('Screenshots written to ' + OUT + ': ' + fs.readdirSync(OUT).join(', '));
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
