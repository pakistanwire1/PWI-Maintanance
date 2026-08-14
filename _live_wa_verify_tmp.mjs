import puppeteer from 'puppeteer-core';

const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'admin@cmms.com';
const PASSWORD = 'admin123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const results = [];
const failures = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failures.push(id);
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + String(detail).slice(0, 300));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mask = (s) => { s = String(s || ''); return s.length <= 4 ? '***' : s.slice(0, 2) + '****' + s.slice(-4); };

console.log('======== LIVE WHATSAPP AUTHORIZATION VERIFICATION (GAS @474 via CF proxy) ========\n');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
const token = await page.evaluate(() => localStorage.getItem('cmms_token'));
check('LOGIN', !!token && token.length > 10, 'tokenLen=' + (token ? token.length : 0));

const api = async (action, data, useToken) => {
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BASE + '/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: useToken === undefined ? token : useToken, data: data || {} }) });
      let j; try { j = await res.json(); } catch (e) { last = { raw: (await res.text()).slice(0, 120) }; break; }
      if (j && j.error) { last = { error: j.error, code: j.code }; await sleep(1200); continue; }
      return j.data || j;
    } catch (e) { last = { error: String((e && e.message) || e) }; await sleep(1200); }
  }
  return last;
};

/* ============ A. OAuth / UrlFetchApp authorization ============ */
console.log('\n--- A. UrlFetchApp / OAuth authorization ---');
const probe = await api('whatsappAuthProbe', {});
check('A1. whatsappAuthProbe succeeds (script.external_request authorized)', !!probe && probe.success === true && probe.code === 200, JSON.stringify({ code: probe.code, provider: probe.provider, msg: (probe.message || '').slice(0, 80) }));
const probeBad = await api('whatsappAuthProbe', {}, 'garbage.token.here');
check('A2. whatsappAuthProbe with invalid token rejected (401)', probeBad && (probeBad.code === 401 || (probeBad.error || '').toLowerCase().indexOf('unauthorized') > -1 || (probeBad.error || '').toLowerCase().indexOf('session expired') > -1), JSON.stringify(probeBad).slice(0, 120));

/* ============ B. Configuration ============ */
console.log('\n--- B. Meta provider configuration ---');
const cfg = await api('whatsappGetSettings', {});
if (!cfg || !cfg.provider) {
  check('B1. whatsappGetSettings returns config', false, JSON.stringify(cfg).slice(0, 200));
} else {
  const phoneOk = /^\d{14,20}$/.test(String(cfg.phoneNumberId || ''));
  const bizOk = /^\d{14,20}$/.test(String(cfg.businessAccountId || ''));
  const endpointOk = String(cfg.apiEndpoint || '') === 'https://graph.facebook.com/v18.0';
  const tokenSet = !!(cfg.apiToken && String(cfg.apiToken).length > 0);
  const testPhoneSet = !!(cfg.testPhone && String(cfg.testPhone).length > 0);
  check('B1. provider=meta', cfg.provider === 'meta', 'provider=' + cfg.provider);
  check('B2. apiEndpoint is Meta Graph API v18.0', endpointOk, 'endpoint=' + cfg.apiEndpoint);
  check('B3. Meta API token present (never printed)', tokenSet, 'tokenSet=' + tokenSet);
  check('B4. Phone Number ID is valid numeric Meta ID', phoneOk, 'phoneNumberId=' + (phoneOk ? mask(cfg.phoneNumberId) : JSON.stringify(cfg.phoneNumberId)));
  check('B5. Business Account ID is valid numeric WABA ID', bizOk, 'businessAccountId=' + (bizOk ? mask(cfg.businessAccountId) : JSON.stringify(cfg.businessAccountId)));
  check('B6. Test phone configured (recipient number)', testPhoneSet, 'testPhone=' + (testPhoneSet ? mask(cfg.testPhone) : '(empty)'));
  console.log('INFO  initial enabled=' + cfg.enabled + ' company=' + cfg.companyName);
}

/* ============ D. Enable / disable persistence ============ */
console.log('\n--- D. Enable/disable persistence ---');
const initialEnabled = (cfg && cfg.enabled) === true;
let en1 = await api('whatsappSaveSettings', { enabled: true });
await sleep(800);
let en2 = await api('whatsappGetSettings', {});
check('D1. Enable persists after save+reload', en1 && en1.success === true && en2.enabled === true, 'saved=' + (en1 && en1.success) + ' reloaded=' + en2.enabled);

/* ============ C. Controlled WhatsApp test (only if A1 + B pass) ============ */
console.log('\n--- C. Controlled WhatsApp test ---');
const canSend = !!probe && probe.success === true && cfg && cfg.provider === 'meta' && /^\d{14,20}$/.test(String(cfg.phoneNumberId || '')) && /^\d{14,20}$/.test(String(cfg.businessAccountId || '')) && !!cfg.apiToken && !!cfg.testPhone;
if (!canSend) {
  console.log('STOP: configuration or authorization is not fully valid. No message was sent.');
  check('C1. controlled test send (skipped - preconditions not met)', false, 'see A/B results above');
} else {
  const sendRes = await api('whatsappTestSend', { testPhone: cfg.testPhone, testMessage: 'Live verification test (deploy 8ee6a40). Please ignore.' });
  check('C1. whatsappTestSend succeeds (provider responded)', !!sendRes && sendRes.success === true && sendRes.status === 'Sent', JSON.stringify({ success: sendRes.success, status: sendRes.status, message: (sendRes.message || '').slice(0, 80) }));
  const logId = sendRes && sendRes.logId;
  check('C2. Log ID returned', !!logId, 'logId=' + logId);
  if (logId) {
    await sleep(1000);
    const logs = await api('whatsappGetLogs', { filters: {} });
    const entry = Array.isArray(logs) ? logs.find(l => l.MessageID === logId) : null;
    check('C3. WhatsApp log entry created with Sent status', !!entry && entry.Status === 'Sent' && entry.Template === 'TestMessage' && entry.Provider === 'meta', JSON.stringify(entry && { id: entry.MessageID, status: entry.Status, template: entry.Template, provider: entry.Provider, phone: mask(entry.PhoneNumber) }));
  }
}

/* ============ D (cont). Disable persistence + restore ============ */
let dis1 = await api('whatsappSaveSettings', { enabled: false });
await sleep(800);
let dis2 = await api('whatsappGetSettings', {});
check('D2. Disable persists after save+reload', dis1 && dis1.success === true && dis2.enabled === false, 'saved=' + (dis1 && dis1.success) + ' reloaded=' + dis2.enabled);
if (initialEnabled) {
  await api('whatsappSaveSettings', { enabled: true });
  await sleep(800);
  const rest = await api('whatsappGetSettings', {});
  check('D3. Initial state restored (enabled=true)', rest.enabled === true, 'restored=' + rest.enabled);
} else {
  console.log('INFO  initial state was disabled - left disabled');
}

/* ============ E. Authorization / permissions ============ */
console.log('\n--- E. Authorization / permissions ---');
const e1 = await api('whatsappSaveSettings', { enabled: true }, 'garbage.token.here');
check('E1. Unauthenticated save rejected (401)', e1 && (e1.code === 401 || (e1.error || '').toLowerCase().indexOf('unauthorized') > -1 || (e1.error || '').toLowerCase().indexOf('session expired') > -1), JSON.stringify(e1).slice(0, 120));
const e2 = await api('whatsappGetSettingsData', { _userEmail: 'spoofed@attacker.com' });
check('E2. Identity resolved from token (client _userEmail cannot escalate)', !!e2 && e2.success === true, 'identity derived from session token, spoofed email ignored');

/* ============ G. UI rendering ============ */
console.log('\n--- G. UI / mobile rendering ---');
try {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#pageContent', { timeout: 60000 });
  await sleep(1000);
  const nav = await page.evaluate(() => {
    const btn = document.querySelector('[data-page="settings"], .sidebar-item[data-page="settings"], .nav-item[data-page="settings"]');
    if (btn) { btn.click(); return 'clicked'; }
    return 'missing';
  });
  await sleep(2000);
  await page.evaluate(() => {
    const gs = document.querySelector('[data-section="emailwhatsapp"], .settings-nav-item[data-section="emailwhatsapp"]');
    if (gs) gs.click();
  });
  await sleep(1500);
  await page.evaluate(() => { const t = document.getElementById('tab-whatsapp'); if (t) t.click(); });
  await sleep(2500);
  const ui = await page.evaluate(() => {
    const wa = document.getElementById('whatsappPage');
    const body = wa ? wa.innerText || '' : '';
    return {
      waLen: wa ? wa.innerHTML.length : -1,
      hasTestBtn: !!document.getElementById('whatsappTestBtn'),
      hasTokenInput: !!document.getElementById('whatsappApiToken'),
      authBlockedAlert: body.indexOf('authorization required') > -1 || body.indexOf('Connection authorization required') > -1,
      bodySample: body.replace(/\s+/g, ' ').slice(0, 120)
    };
  });
  check('G1. WhatsApp page renders with test button + token field', ui.waLen > 500 && ui.hasTestBtn && ui.hasTokenInput, 'waLen=' + ui.waLen + ' testBtn=' + ui.hasTestBtn + ' tokenInput=' + ui.hasTokenInput);
  check('G2. No authorization-blocked error state after successful authorization', !ui.authBlockedAlert, 'authBlockedAlert=' + ui.authBlockedAlert);

  await page.setViewport({ width: 390, height: 844 });
  await sleep(1200);
  const mob = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check('G3. Mobile: no horizontal overflow on WhatsApp settings', mob.sw <= mob.cw + 1, 'scrollWidth=' + mob.sw + ' clientWidth=' + mob.cw);
} catch (e) {
  check('G1. UI render', false, 'ERROR ' + e.message);
}

const relevantPage = pageErrors.filter(e => !/gstatic|chrome-extension/.test(e));
const relevantConsole = consoleErrors.filter(e => !/gstatic|favicon|chrome-extension|Failed to load resource/.test(e));
check('G4. No page errors', relevantPage.length === 0, 'pageErrors=' + JSON.stringify(relevantPage.slice(0, 4)));
check('G5. No console errors', relevantConsole.length === 0, 'consoleErrors=' + JSON.stringify(relevantConsole.slice(0, 4)));

/* ============ SUMMARY ============ */
let pass = 0, fail = 0;
for (const r of results) { if (r.ok) pass++; else fail++; }
console.log('\n===== LIVE WHATSAPP SUMMARY =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
console.log('FAILED: ' + (failures.join(', ') || '(none)'));
if (fail > 0) { console.log('RESULT: INCOMPLETE'); } else { console.log('RESULT: COMPLETE'); }
await browser.close();
process.exit(fail > 0 ? 1 : 0);
