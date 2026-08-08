import puppeteer from 'puppeteer-core';
import fs from 'fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const OUT = 'C:/Users/afsar/AppData/Local/Temp/opencode/jobcard_verify';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: 'C:/Users/afsar/AppData/Local/Temp/opencode/jcverify_chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log('goto', String(e).slice(0,100)));
await sleep(4000);
const onWelcome = await page.evaluate(() => { const w = document.getElementById('welcomePage'); return w && getComputedStyle(w).display !== 'none'; }).catch(() => false);
if (onWelcome) {
  await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => {});
  await sleep(4000);
}
for (let i = 0; i < 30; i++) {
  const st = await page.evaluate(() => {
    const lp = document.getElementById('loginPage');
    const app = document.getElementById('appContainer');
    return { lv: lp && getComputedStyle(lp).display !== 'none', av: app && getComputedStyle(app).display !== 'none' };
  }).catch(() => ({}));
  if (st.av) break;
  if (st.lv) {
    await page.evaluate((em, pw) => {
      document.getElementById('loginEmail').value = em;
      document.getElementById('loginPassword').value = pw;
      document.getElementById('loginBtn').click();
    }, creds.Email, creds.Password);
    await sleep(5000);
  }
  await sleep(1500);
}
const loggedIn = await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false);
console.log('loggedIn=', loggedIn);
await sleep(3000);

// Badge state right after login (Badge.refresh called in startApp)
let badgeAfterLogin = {};
try {
  badgeAfterLogin = await page.evaluate(() => {
    const g = id => { const el = document.getElementById(id); return el ? { text: (el.textContent||'').trim(), disp: getComputedStyle(el).display, html: el.innerHTML.slice(0,80) } : null; };
    return { email: g('emailBadge'), notif: g('notificationBadge'), wa: g('waBadge') };
  });
} catch (e) { badgeAfterLogin.err = String(e); }

// Navigate to Open Job Card page
await page.evaluate(() => navigateTo('openjobcard'));
await sleep(6000);

const formState = await page.evaluate(() => {
  const sels = ['jcDivision', 'jcSection', 'jcDepartment', 'jcMachine', 'jcAsset', 'jcComplaintCategory', 'jcBreakdownType'];
  const out = {};
  sels.forEach(id => {
    const el = document.getElementById(id);
    if (!el) { out[id] = null; return; }
    out[id] = { count: el.options.length, opts: Array.from(el.options).slice(0, 12).map(o => o.value + '|' + o.textContent), sel: el.value };
  });
  const ta = document.getElementById('jcComplaintDesc');
  out.jcVoiceBtn = (function() { const b = document.getElementById('jcVoiceBtn'); return b ? { html: b.innerHTML.slice(0,60), listening: b.classList.contains('listening') } : null; })();
  out.speechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  out.taValue = ta ? ta.value : null;
  return out;
});
console.log('FORM_STATE=' + JSON.stringify(formState, null, 1));
await page.screenshot({ path: OUT + '/1_form_loaded.png', fullPage: true });

// Drive the cascade: Division -> Section -> Department -> Machine -> Asset
const cascade = await page.evaluate(async () => {
  const out = { steps: [] };
  const getOpts = id => Array.from(document.getElementById(id).options).map(o => o.value).filter(v => v);
  const divSel = document.getElementById('jcDivision');
  const divOpts = getOpts('jcDivision');
  out.divCount = divOpts.length;
  out.divOptions = Array.from(divSel.options).map(o => o.textContent).slice(0, 10);
  if (!divOpts.length) return out;

  // pick first division
  divSel.value = divOpts[0];
  divSel.dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 300));
  const secOpts = getOpts('jcSection');
  out.afterDivision = { selectedDivision: divOpts[0], sectionCount: secOpts.length, sectionOptions: Array.from(document.getElementById('jcSection').options).map(o => o.textContent).slice(0, 10) };
  out.steps.push('division->sections:' + secOpts.length);
  if (!secOpts.length) return out;

  document.getElementById('jcSection').value = secOpts[0];
  document.getElementById('jcSection').dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 300));
  const deptOpts = getOpts('jcDepartment');
  out.afterSection = { selectedSection: secOpts[0], deptCount: deptOpts.length, deptOptions: Array.from(document.getElementById('jcDepartment').options).map(o => o.textContent).slice(0, 10) };
  out.steps.push('section->departments:' + deptOpts.length);
  if (!deptOpts.length) return out;

  document.getElementById('jcDepartment').value = deptOpts[0];
  document.getElementById('jcDepartment').dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 300));
  const machOpts = getOpts('jcMachine');
  out.afterDept = { selectedDept: deptOpts[0], machineCount: machOpts.length, machineOptions: Array.from(document.getElementById('jcMachine').options).map(o => o.textContent).slice(0, 10) };
  out.steps.push('dept->machines:' + machOpts.length);
  if (!machOpts.length) return out;

  document.getElementById('jcMachine').value = machOpts[0];
  document.getElementById('jcMachine').dispatchEvent(new Event('change'));
  await new Promise(r => setTimeout(r, 300));
  const assetOpts = getOpts('jcAsset');
  out.afterMachine = { selectedMachine: machOpts[0], assetCount: assetOpts.length, assetOptions: Array.from(document.getElementById('jcAsset').options).map(o => o.textContent).slice(0, 10) };
  out.steps.push('machine->assets:' + assetOpts.length);

  out.selectedFull = {
    division: document.getElementById('jcDivision').value,
    section: document.getElementById('jcSection').value,
    department: document.getElementById('jcDepartment').value,
    machine: document.getElementById('jcMachine').value,
    asset: document.getElementById('jcAsset').value
  };
  return out;
});
console.log('CASCADE=' + JSON.stringify(cascade, null, 1));
await page.screenshot({ path: OUT + '/2_cascade_selected.png', fullPage: true });

// Voice button behavior (can't grant mic in headless; verify button wiring + click doesn't crash + fallback)
const voiceTest = await page.evaluate(() => {
  const out = {};
  const btn = document.getElementById('jcVoiceBtn');
  out.btnExists = !!btn;
  out.onclick = btn ? btn.getAttribute('onclick') : null;
  out.speechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  // Simulate a result handler to prove transcript would be appended
  if (btn && typeof OpenJobCard !== 'undefined' && OpenJobCard.startVoice) {
    try {
      // stub recognition to verify onresult wiring appends to textarea
      const origSR = window.webkitSpeechRecognition || window.SpeechRecognition;
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        window.__fakeRec = null;
        const Fake = function() {
          const self = this;
          window.__fakeRec = this;
          this.lang = '';
          this.interimResults = false;
          this.continuous = false;
          this.onresult = null; this.onerror = null; this.onend = null;
          this.start = function() { out.startCalled = true; };
          this.stop = function() { out.stopCalled = true; };
        };
        window.SpeechRecognition = Fake;
        window.webkitSpeechRecognition = Fake;
        OpenJobCard.startVoice(btn);
        out.listeningAfterStart = btn.classList.contains('listening');
        out.btnText = btn.innerHTML.slice(0, 60);
        if (window.__fakeRec) {
          const fake = window.__fakeRec;
          fake.onresult({ resultIndex: 0, results: [ { isFinal: true, 0: { transcript: 'motor overheating test phrase' } } ] });
          const ta = document.getElementById('jcComplaintDesc');
          out.taAfterResult = ta.value;
          fake.onend();
          out.listeningAfterEnd = btn.classList.contains('listening');
        }
        window.SpeechRecognition = origSR;
        window.webkitSpeechRecognition = origSR;
      } else {
        out.skipStub = true;
      }
    } catch (e) { out.stubErr = String(e); }
  }
  return out;
});
console.log('VOICE=' + JSON.stringify(voiceTest, null, 1));
await page.screenshot({ path: OUT + '/3_voice.png', fullPage: true });

// After saving flow reset works: resetForm restores Division options
const resetTest = await page.evaluate(() => {
  OpenJobCard.resetForm();
  const out = {};
  ['jcDivision', 'jcSection', 'jcDepartment', 'jcMachine', 'jcAsset'].forEach(id => {
    const el = document.getElementById(id);
    out[id] = el ? { count: el.options.length, sel: el.value } : null;
  });
  return out;
});
console.log('RESET=' + JSON.stringify(resetTest));
await page.screenshot({ path: OUT + '/4_after_reset.png', fullPage: true });

await sleep(1500);
const badgeAfterNav = await page.evaluate(() => {
  const g = id => { const el = document.getElementById(id); return el ? { text: (el.textContent||'').trim(), disp: getComputedStyle(el).display } : null; };
  return { email: g('emailBadge'), notif: g('notificationBadge'), wa: g('waBadge') };
});

console.log('BADGE_AFTER_LOGIN=' + JSON.stringify(badgeAfterLogin));
console.log('BADGE_AFTER_NAV=' + JSON.stringify(badgeAfterNav));
console.log('CONSOLE_ERRORS=' + JSON.stringify(consoleErrors));

fs.writeFileSync(OUT + '/results.json', JSON.stringify({ loggedIn, formState, cascade, voiceTest, resetTest, badgeAfterLogin, badgeAfterNav, consoleErrors }, null, 2));
await browser.close();
console.log('DONE');
