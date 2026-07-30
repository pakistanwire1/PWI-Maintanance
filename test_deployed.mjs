import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
});

const page = await browser.newPage();
const traces = [];
const errors = [];

page.on('console', msg => {
  const t = msg.text();
  if (t.startsWith('[TRACE]')) traces.push(t);
  if (msg.type() === 'error') errors.push(t);
  // Also log all console output for debugging
  if (t.includes('Router') || t.includes('init') || t.includes('error') || t.includes('Error') || t.includes('undefined')) {
    // keep for debugging
  }
});

page.on('pageerror', err => errors.push(err.message));

page.on('response', resp => {
  const url = resp.url();
  const status = resp.status();
  if (status >= 400 || url.includes('api/exec') || url.includes('.js') || url.includes('.css')) {
    // Log all relevant resources
  }
});

// Load deployed site
await page.goto('https://pwi-maintanance.pages.dev/', {
  waitUntil: 'networkidle0',
  timeout: 30000
});

// Set login state
await page.evaluate(() => {
  localStorage.setItem('cmms_welcomed', 'true');
  localStorage.setItem('cmms_token', 'mock-token');
  localStorage.setItem('cmms_user', JSON.stringify({
    id: 1, email: 'admin@pwi.com', name: 'Admin',
    role: 'Administrator', department: 'IT', isSystemAdmin: true
  }));
});

// Reload to trigger app init with login
await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

const state = await page.evaluate(() => {
  const content = document.getElementById('pageContent');
  const app = document.getElementById('appContainer');
  return {
    contentLength: content ? content.innerHTML.length : 0,
    contentHTML: content ? content.innerHTML.substring(0, 300) : 'no content',
    appDisplay: app ? app.style.display : 'unknown',
    scriptsLoaded: typeof Router !== 'undefined' && typeof Router.navigate !== 'undefined',
  };
});

console.log('=== DEPLOYED SITE WITH LOGIN ===');
console.log('App display:', state.appDisplay);
console.log('Content length:', state.contentLength);
console.log('Router loaded:', state.scriptsLoaded);
console.log('Content:', state.contentHTML);
console.log('Console errors:', errors.length);
for (const e of errors) console.log('  ERROR:', e.substring(0, 200));

// Try navigating to dashboard
console.log('\n--- Attempting navigateTo dashboard ---');
const navResult = await page.evaluate(() => {
  if (typeof Router !== 'undefined' && Router.navigate) {
    Router.navigate('dashboard');
    const el = document.getElementById('pageContent');
    return { success: true, length: el ? el.innerHTML.length : 0, html: el ? el.innerHTML.substring(0, 200) : '' };
  }
  return { success: false };
});
console.log('Navigate result:', navResult);

await browser.close();
