import puppeteer from 'puppeteer-core';
const CF = 'https://pwi-maintanance.pages.dev/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const RESTRICTED = { email: 'supervisor@cmms.com', password: 'super123' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', m => console.log('CONSOLE[' + m.type() + ']', m.text().slice(0, 300)));
page.on('pageerror', e => console.log('PAGEERROR', String(e.message || e).slice(0, 300)));
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('cmms_welcomed', 'true'); } catch (e) {} });
await page.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', RESTRICTED.email);
await page.type('#loginPassword', RESTRICTED.password);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token') && !!JSON.parse(localStorage.getItem('cmms_user')).email; } catch (e) { return false; } }, { timeout: 120000 }).catch(() => {});
await page.waitForSelector('#pageContent', { timeout: 60000 }).catch(() => {});
await sleep(3000);
await page.evaluate(() => Router.navigate('settings'));
await sleep(3000);
const state1 = await page.evaluate(() => ({
  route: Router.current,
  consoleEl: !!document.querySelector('.settings-console'),
  navCount: document.querySelectorAll('.settings-nav-item').length,
  navLabels: Array.from(document.querySelectorAll('.settings-nav-label')).map(e => e.textContent.trim()),
  pageContentLen: (document.getElementById('pageContent') || { innerHTML: '' }).innerHTML.length,
  title: (document.getElementById('settingsSectionTitle') || {}).textContent
}));
console.log('AFTER DIRECT LOGIN STATE:', JSON.stringify(state1, null, 2));

// Now the clear + reload path
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
await page.waitForSelector('#loginForm', { timeout: 60000 }).catch(() => {});
await page.type('#loginEmail', RESTRICTED.email);
await page.type('#loginPassword', RESTRICTED.password);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token') && !!JSON.parse(localStorage.getItem('cmms_user')).email; } catch (e) { return false; } }, { timeout: 120000 }).catch(() => {});
await page.waitForSelector('#pageContent', { timeout: 60000 }).catch(() => {});
await sleep(3000);
await page.evaluate(() => Router.navigate('settings')).catch(e => console.log('NAV ERROR', String(e)));
await sleep(3000);
const state2 = await page.evaluate(() => ({
  route: Router.current,
  consoleEl: !!document.querySelector('.settings-console'),
  navCount: document.querySelectorAll('.settings-nav-item').length,
  navLabels: Array.from(document.querySelectorAll('.settings-nav-label')).map(e => e.textContent.trim()),
  pageContentLen: (document.getElementById('pageContent') || { innerHTML: '' }).innerHTML.length,
  title: (document.getElementById('settingsSectionTitle') || {}).textContent
}));
console.log('AFTER RELOAD LOGIN STATE:', JSON.stringify(state2, null, 2));
await browser.close();
