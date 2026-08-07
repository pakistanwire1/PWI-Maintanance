import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.THEME_E2E_BASE || 'http://127.0.0.1:8788';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT_DIR = path.join(__dirname, 'verify_shots');

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

const KNOWN_BENIGN = [
  'negative value is not valid',
  'gstatic.com',
  'chart',
  'Failed to load resource'
];
function newErrors() {
  return consoleErrors.filter(e => !KNOWN_BENIGN.some(k => e.toLowerCase().includes(k.toLowerCase())));
}

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => {
  try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {}
  try { localStorage.removeItem('cmms_theme_settings'); } catch (e) {}
});
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });

await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1200);

await page.evaluate(() => navigateTo('settings'));
await page.waitForSelector('#themeSettingsCard', { timeout: 60000 });
await sleep(1000);

const cssVar = (name) => page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
function normColor(v) {
  v = String(v).trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{6})$/);
  if (m) return m[0];
  m = v.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) {
    const to2 = n => n.toString(16).padStart(2, '0');
    return '#' + to2(+m[1]) + to2(+m[2]) + to2(+m[3]);
  }
  return v;
}
const cssVarNorm = async (name) => normColor(await cssVar(name));
const dataTheme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
const countPaletteCards = () => page.evaluate(() => document.querySelectorAll('#paletteOptions .palette-card').length);
const hasColorField = (id) => page.evaluate(i => !!document.getElementById(i), id);
const bannerDisplay = () => page.evaluate(() => { const b = document.getElementById('themeDirtyBanner'); return b ? b.style.display : 'none'; });
const hexValue = (id) => page.evaluate(i => { const el = document.getElementById(i); return el ? el.value : ''; }, id);
const storedPrefs = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('cmms_theme_settings') || '{}'); } catch (e) { return {}; } });

check('card-renders', await countPaletteCards() === 8, 'palette cards rendered: ' + await countPaletteCards());
check('color-fields-render', await hasColorField('themeColorSidebar') && await hasColorField('themeColorPrimary') && await hasColorField('themeColorCard') && await hasColorField('themeColorButton'), '4 custom color fields rendered');
check('action-buttons-render', await page.evaluate(() => {
  const html = document.getElementById('themeSettingsCard').innerHTML;
  return html.includes('Settings.themeApply()') && html.includes('Settings.themeSave()') && html.includes('Settings.themeReset()');
}), 'Apply / Save / Reset buttons present');
check('dirty-banner-hidden-initial', (await bannerDisplay()) === 'none', 'dirty banner hidden initially: ' + await bannerDisplay());
check('default-theme-dark', (await dataTheme()) === 'dark', 'default data-theme=dark');
check('default-primary', (await cssVarNorm('--primary')) === '#6366f1', 'default --primary is indigo: ' + await cssVarNorm('--primary'));

await page.evaluate(() => Settings.themeSelectPalette('blue'));
await sleep(200);
check('palette-blue-applies', (await cssVarNorm('--primary')) === '#3b82f6', 'blue palette -> --primary ' + await cssVarNorm('--primary'));
check('palette-blue-hex-sync', (await hexValue('themeHexPrimary')) === '#3b82f6', 'primary hex input synced: ' + await hexValue('themeHexPrimary'));
check('dirty-banner-shown', (await bannerDisplay()) !== 'none', 'dirty banner visible after palette change');

await page.evaluate(() => Settings.themeSetColor('sidebarColor', '#112233'));
await sleep(200);
check('custom-sidebar-applies', (await cssVarNorm('--bg-sidebar')) === '#112233', 'custom sidebar -> --bg-sidebar ' + await cssVarNorm('--bg-sidebar'));
check('sidebar-reset-enabled', await page.evaluate(() => !document.getElementById('themeResetSidebar').disabled), 'sidebar Default button enabled');

await page.evaluate(() => Settings.themeSetMode('mode', 'light'));
await sleep(200);
check('mode-light-applies', (await dataTheme()) === 'light', 'mode light -> data-theme=light');
check('light-keeps-custom', (await cssVarNorm('--bg-sidebar')) === '#112233', 'light mode keeps custom sidebar color');
await page.evaluate(() => Settings.themeSetMode('mode', 'dark'));
await sleep(200);
check('mode-dark-restored', (await dataTheme()) === 'dark', 'mode dark restored');

await page.evaluate(() => Settings.themeApply());
await sleep(200);
const saved = await storedPrefs();
check('apply-persists', saved.palette === 'blue' && saved.sidebarColor === '#112233' && saved.accentColor === '', 'Apply persisted palette+sidebar: ' + JSON.stringify(saved));
check('apply-clears-banner', (await bannerDisplay()) === 'none', 'banner hidden after Apply');

await page.evaluate(() => navigateTo('dashboard'));
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(800);
check('theme-persists-dashboard', (await cssVarNorm('--primary')) === '#3b82f6' && (await cssVarNorm('--bg-sidebar')) === '#112233', 'theme applied on dashboard page: --primary ' + await cssVarNorm('--primary') + ' / --bg-sidebar ' + await cssVarNorm('--bg-sidebar'));

const hasTopbarToggle = await page.evaluate(() => !!document.getElementById('themeToggle'));
check('topbar-toggle-present', hasTopbarToggle, 'topbar theme toggle present');
if (hasTopbarToggle) {
  await page.evaluate(() => document.getElementById('themeToggle').click());
  await sleep(200);
  const toggledPrefs = await storedPrefs();
  check('topbar-toggle-syncs-prefs', toggledPrefs.mode === 'light', 'toggle set prefs.mode=light: ' + toggledPrefs.mode);
  await page.evaluate(() => document.getElementById('themeToggle').click());
  await sleep(200);
  check('topbar-toggle-back-dark', (await dataTheme()) === 'dark', 'toggle back to dark');
}

await page.evaluate(() => navigateTo('settings'));
await page.waitForSelector('#themeSettingsCard', { timeout: 60000 });
await sleep(500);

await page.evaluate(() => Settings.themeReset());
await page.waitForFunction(() => { const m = document.getElementById('confirmModal'); return m && m.classList.contains('show'); }, { timeout: 10000 });
await sleep(200);
await page.evaluate(() => { const b = document.querySelector('#confirmModal .btn-danger'); if (b) b.click(); });
await sleep(300);
const resetPrefs = await storedPrefs();
check('reset-restores-defaults', resetPrefs.palette === 'indigo' && (resetPrefs.sidebarColor || '') === '', 'Reset restored defaults: ' + JSON.stringify(resetPrefs));
check('reset-primary-indigo', (await cssVarNorm('--primary')) === '#6366f1', 'Reset -> --primary back to indigo: ' + await cssVarNorm('--primary'));
check('reset-sidebar-default', (await cssVarNorm('--bg-sidebar')) === '#07080f', 'Reset -> --bg-sidebar back to default: ' + await cssVarNorm('--bg-sidebar'));
check('reset-banner-hidden', (await bannerDisplay()) === 'none', 'banner hidden after Reset');

await page.screenshot({ path: path.join(SHOT_DIR, 'theme_system.png') });

const ne = newErrors();
check('no-console-errors', ne.length === 0, ne.length === 0 ? 'no new console errors' : 'console errors: ' + JSON.stringify(ne.slice(0, 5)));
check('no-page-errors', pageErrors.length === 0, pageErrors.length === 0 ? 'no page errors' : 'page errors: ' + JSON.stringify(pageErrors.slice(0, 5)));

await browser.close();

const pass = results.filter(r => r.ok).length;
console.log('\n==== THEME SYSTEM: ' + pass + '/' + results.length + ' PASS ====');
if (failures.length) {
  console.log('FAILED: ' + failures.join(', '));
  process.exit(1);
}
console.log('RESULT: COMPLETE');
process.exit(0);
