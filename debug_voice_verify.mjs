import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:8788';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
});

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 300)));

await page.evaluateOnNewDocument(() => {
  window.__fakeSRTranscripts = [];
  window.SpeechRecognition = class {
    start() {
      const self = this;
      setTimeout(() => { if (typeof self.onstart === 'function') self.onstart(); }, 10);
      setTimeout(() => {
        const transcript = 'test voice input transcript ' + Math.random().toString(36).slice(2, 6);
        window.__fakeSRTranscripts.push(transcript);
        if (typeof self.onresult === 'function') {
          self.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript } }] });
        }
        if (typeof self.onend === 'function') self.onend();
      }, 120);
    }
    stop() { if (typeof this.onend === 'function') this.onend(); }
  };
  window.webkitSpeechRecognition = window.SpeechRecognition;
});

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('#loginForm', { timeout: 60000 });
await page.type('#loginEmail', EMAIL);
await page.type('#loginPassword', PASSWORD);
await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await page.waitForSelector('#pageContent', { timeout: 60000 });
await sleep(1500);

const results = [];
const errors = [];

// --- voice wiring verification ---
const voiceChecks = [
  { route: 'openjobcard', openModal: null, textareaId: 'jcComplaintDesc', waitFor: '#jcVoiceBtn', hasTable: false },
  { route: 'startjobcard', openModal: 'StartedJobCard.open', textareaId: 'startJcInitialRemarks', waitFor: '#startJcInitialRemarks', hasTable: true },
  { route: 'closejobcard', openModal: 'ClosedJobCard.open', textareaId: 'closeJcCorrectiveAction', waitFor: '#closeJcCorrectiveAction', hasTable: true }
];

for (const vc of voiceChecks) {
  try {
    await page.goto(BASE + '/#' + vc.route, { waitUntil: 'networkidle2', timeout: 60000 });
    if (vc.hasTable) {
      await page.waitForFunction(() => document.querySelectorAll('#pageContent table').length > 0, { timeout: 30000 });
    } else {
      await page.waitForSelector(vc.waitFor, { timeout: 30000 });
    }
    await sleep(500);
    if (vc.openModal) {
      const opened = await page.evaluate((fn, textareaId) => {
        const btns = Array.from(document.querySelectorAll('#pageContent button'));
        const tb = btns.find(b => (b.getAttribute('onclick') || '').indexOf(fn + '(') === 0);
        if (!tb) return 'no-action-button';
        tb.click();
        return 'clicked';
      }, vc.openModal, vc.textareaId);
      if (opened !== 'clicked') {
        const fallback = await page.evaluate((fn, textareaId) => {
          const tb = document.querySelector('#pageContent button');
          if (!tb) return 'no-buttons';
          const jc = (tb.getAttribute('onclick') || '').match(/'([^']+)'/);
          if (jc) { window[fn.split('.')[0]][fn.split('.')[1]](jc[1]); return 'direct-open:' + jc[1]; }
          return 'cannot-open';
        }, vc.openModal, vc.textareaId);
        results.push(`voice[${vc.route}]: modal-open fallback=${fallback}`);
      }
      await sleep(800);
    }
    await page.waitForSelector(vc.waitFor, { timeout: 10000 });
    const clickBtn = await page.evaluate((textareaId, route) => {
      let btn;
      if (route === 'openjobcard') {
        btn = document.getElementById('jcVoiceBtn');
      } else {
        btn = Array.from(document.querySelectorAll('button.btn-voice')).find(b => (b.getAttribute('onclick') || '').indexOf("'" + textareaId + "'") > -1);
      }
      if (!btn) return 'no-voice-btn';
      btn.click();
      return 'clicked';
    }, vc.textareaId, vc.route);
    await sleep(500);
    const val = await page.evaluate(id => document.getElementById(id).value, vc.textareaId);
    const fakeCount = await page.evaluate(() => (window.__fakeSRTranscripts || []).length);
    const ok = val.indexOf('test voice input transcript') > -1;
    results.push(`voice[${vc.route}]: click=${clickBtn} transcripts=${fakeCount} appended='${val.slice(0, 60)}' ${ok ? 'OK' : 'FAIL'}`);
    await page.evaluate(id => { const el = document.getElementById(id); if (el && el._voiceActive && el._voiceRecognition) el._voiceRecognition.stop(); }, vc.textareaId);
    if (vc.route !== 'openjobcard') {
      await page.evaluate(() => { const m = document.getElementById('startJcModal') || document.getElementById('closeJcModal'); if (m) m.style.display = 'none'; });
    }
  } catch (e) {
    errors.push(`voice[${vc.route}]: ${e.message}`);
  }
}

// --- Job Card column scan across jobcard table pages ---
const tablePages = [
  { route: 'startjobcard', label: 'Started' },
  { route: 'closejobcard', label: 'Closed' },
  { route: 'pendingjobcard', label: 'Pending' },
  { route: 'qrjobcards', label: 'QR Job Cards' }
];

for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height });
  for (const tp of tablePages) {
    try {
      await page.goto(BASE + '/#' + tp.route, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('#pageContent .empty-state') || document.querySelectorAll('#pageContent table').length > 0, { timeout: 30000 });
      await sleep(500);
      const info = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('table').forEach((t, i) => {
          const head = Array.from(t.querySelectorAll('thead th')).map(th => th.textContent.trim());
          const hasJC = head.some(h => /job\s?card/i.test(h));
          out.push({ table: i, cols: head.join('|'), hasJC, rows: t.querySelectorAll('tbody tr').length });
        });
        return out;
      });
      const summary = info.map(i => `${i.hasJC ? 'JC-OK' : 'JC-MISSING'}[${i.cols}]`).join(' ; ') || 'NO-TABLE';
      results.push(`table[${vp.name}/${tp.route}]: ${summary}`);
    } catch (e) {
      errors.push(`table[${vp.name}/${tp.route}]: ${e.message}`);
    }
  }
}

console.log('\n--- VERIFICATION RESULTS ---');
for (const r of results) console.log(r);
console.log('\n--- ERRORS ---');
for (const e of errors) console.log(e);
console.log('\n--- CONSOLE ERRORS (' + consoleErrors.length + ') ---');
for (const ce of consoleErrors.slice(0, 20)) console.log(ce);

await browser.close();
