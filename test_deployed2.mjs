import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
});

const page = await browser.newPage();
const allLogs = [];
const errors = [];
const networkReqs = [];

page.on('console', msg => {
  allLogs.push({ type: msg.type(), text: msg.text() });
  if (msg.type() === 'error') errors.push(msg.text());
});

page.on('pageerror', err => errors.push(err.message));

page.on('request', req => networkReqs.push({ url: req.url(), method: req.method(), type: req.resourceType() }));
page.on('response', resp => {
  if (resp.status() >= 400) {
    errors.push(`HTTP ${resp.status()} ${resp.statusText()} for ${resp.url()}`);
  }
});

// Load deployed site
await page.goto('https://pwi-maintanance.pages.dev/', {
  waitUntil: 'networkidle0',
  timeout: 30000
});

console.log('=== INITIAL LOAD ===');
const initState = await page.evaluate(() => {
  const content = document.getElementById('pageContent');
  const welcome = document.getElementById('welcomePage');
  const login = document.getElementById('loginPage');
  const app = document.getElementById('appContainer');
  return {
    contentLength: content ? content.innerHTML.length : 0,
    welcomeDisplay: welcome ? welcome.style.display : 'unknown',
    loginDisplay: login ? login.style.display : 'unknown',
    appDisplay: app ? app.style.display : 'unknown',
  };
});
console.log(JSON.stringify(initState, null, 2));
console.log('Console messages:', allLogs.length);
for (const l of allLogs.slice(-20)) console.log(`  [${l.type}] ${l.text.substring(0, 200)}`);

// Set login and reload
allLogs.length = 0;
await page.evaluate(() => {
  localStorage.setItem('cmms_welcomed', 'true');
  localStorage.setItem('cmms_token', 'mock-token');
  localStorage.setItem('cmms_user', JSON.stringify({
    id: 1, email: 'admin@pwi.com', name: 'Admin',
    role: 'Administrator', department: 'IT', isSystemAdmin: true
  }));
});

await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 10000));

console.log('\n=== AFTER RELOAD WITH SESSION ===');
const state2 = await page.evaluate(() => {
  const content = document.getElementById('pageContent');
  const welcome = document.getElementById('welcomePage');
  const login = document.getElementById('loginPage');
  const app = document.getElementById('appContainer');
  const hash = window.location.hash;
  const url = window.location.href;
  return {
    contentLength: content ? content.innerHTML.length : 0,
    contentHTML: content ? content.innerHTML.substring(0, 100) : 'no content',
    welcomeDisplay: welcome ? getComputedStyle(welcome).display : 'unknown',
    loginDisplay: login ? getComputedStyle(login).display : 'unknown',
    appDisplay: app ? getComputedStyle(app).display : 'unknown',
    hash: hash,
    url: url,
  };
});
console.log(JSON.stringify(state2, null, 2));

console.log('\nAll console messages:');
for (const l of allLogs) {
  console.log(`  [${l.type}] ${l.text.substring(0, 300)}`);
}

await browser.close();
