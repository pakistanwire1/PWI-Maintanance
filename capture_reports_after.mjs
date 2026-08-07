import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CF = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'verify_shots', 'reports_after');
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,1000'] });

// ---------- 1) login CF + fetch live raw data ----------
const dataPage = await browser.newPage();
await dataPage.setViewport({ width: 1500, height: 1000 });
await dataPage.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 });
await dataPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await dataPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await dataPage.waitForSelector('#loginForm', { timeout: 60000 });
await dataPage.type('#loginEmail', EMAIL);
await dataPage.type('#loginPassword', PASSWORD);
await dataPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await dataPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await dataPage.waitForSelector('#pageContent', { timeout: 60000 });
const token = await dataPage.evaluate(() => localStorage.getItem('cmms_token'));
const api = async (action, data) => {
  const res = await fetch(CF + '/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token, data }) });
  const j = await res.json();
  if (j && j.error) return { error: j.error };
  return j.data || j;
};
console.log('Fetching live raw data...');
const sheets = {};
sheets.JobCards = await api('getJobCards', {});
sheets.JobCards = Array.isArray(sheets.JobCards) ? sheets.JobCards : (sheets.JobCards.records || []);
sheets.Machines = await api('getMachines', {});
sheets.Departments = await api('getDepartmentList', {});
sheets.Sections = await api('getSectionList', {});
sheets.Divisions = await api('getDivisionList', {});
sheets.Technicians = await api('getTechnicians', {});
sheets.Assets = []; sheets.SpareParts = []; sheets.PreventiveMaintenance = [];
console.log('jobcards=' + sheets.JobCards.length + ' machines=' + sheets.Machines.length + ' depts=' + sheets.Departments.length +
  ' sections=' + sheets.Sections.length + ' divisions=' + sheets.Divisions.length + ' techs=' + sheets.Technicians.length);
const gsSource = fs.readFileSync(path.join(__dirname, 'ReportsGS.gs'), 'utf8');
const payload = { gsSource, sheets };

// ---------- shared UI helpers ----------
const GAS_INJECT = (payload) => {
  const sheets = payload.sheets;
  window.__getAllData = (name) => sheets[name] || [];
  window.__CONFIG = { SHEET_NAMES: { JOBCARDS: 'JobCards', MACHINES: 'Machines', DEPARTMENTS: 'Departments', SECTIONS: 'Sections', ASSETS: 'Assets', SPARE_PARTS: 'SpareParts', PREVENTIVE_MAINTENANCE: 'PreventiveMaintenance', TECHNICIANS: 'Technicians' } };
  window.__normalizeDuration = (x) => x;
  const Fixed = new Function('getAllData', 'CONFIG', 'normalizeDuration',
    payload.gsSource + '\n;return { getReportData: getReportData, getReportFilterOptions: getReportFilterOptions };'
  )(window.__getAllData, window.__CONFIG, window.__normalizeDuration);
  window.__fixed = Fixed;
  const deptsOf = (divId, secId) => {
    let d = sheets.Departments || [];
    if (divId) d = d.filter(x => x.DivisionID === divId);
    if (secId) d = d.filter(x => x.SectionID === secId);
    return d.map(x => ({ ID: x.DepartmentID || '', Name: x.Department || '', Status: x.Status || '' }));
  };
  const secsOf = (divId) => {
    let s = sheets.Sections || [];
    if (divId) s = s.filter(x => x.DivisionID === divId);
    return s.map(x => ({ id: x.SectionID || '', name: x.Section || '', code: x.SectionCode || '' })).filter(x => x.id);
  };
  const machsOf = (divId, secId, deptId) => {
    let m = sheets.Machines || [];
    if (divId) m = m.filter(x => x.DivisionID === divId);
    if (secId) m = m.filter(x => x.SectionID === secId);
    if (deptId) m = m.filter(x => x.DeptID === deptId);
    return m.map(x => {
      const n = x.MachineNumber || x.MachineCode || x.MachineName || '';
      let label = n;
      if (x.MachineName && x.MachineName !== label) label += ' \u2014 ' + x.MachineName;
      return { id: x.MachineID || '', number: n, name: x.MachineName || '', code: x.MachineCode || '', label };
    }).filter(x => x.id).sort((a, b) => a.number.localeCompare(b.number));
  };
  window.__cascade = {
    getMachineCascade(divId, secId, deptId) {
      return {
        divisions: (sheets.Divisions || []).map(x => ({ id: x.DivisionID || '', code: x.DivisionCode || '', name: x.DivisionName || '' })).filter(x => x.id),
        sections: secsOf(divId),
        departments: deptsOf(divId, secId),
        machines: machsOf(divId, secId, deptId)
      };
    }
  };
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  let ok = null, err = null;
  window.google.script.run = {
    withSuccessHandler(fn) { ok = fn; return this; },
    withFailureHandler(fn) { err = fn; return this; },
    getReportFilterOptions() { const r = window.__fixed.getReportFilterOptions(); if (ok) ok(r); },
    getMachineCascade(a, b, c) { const r = window.__cascade.getMachineCascade(a, b, c); if (ok) ok(r); },
    getReportData(filters) { const r = window.__fixed.getReportData(filters); if (ok) ok(r); }
  };
  return true;
};

const CF_INJECT = (payload) => {
  const sheets = payload.sheets;
  window.__getAllData = (name) => sheets[name] || [];
  window.__CONFIG = { SHEET_NAMES: { JOBCARDS: 'JobCards', MACHINES: 'Machines', DEPARTMENTS: 'Departments', SECTIONS: 'Sections', ASSETS: 'Assets', SPARE_PARTS: 'SpareParts', PREVENTIVE_MAINTENANCE: 'PreventiveMaintenance', TECHNICIANS: 'Technicians' } };
  window.__normalizeDuration = (x) => x;
  const Fixed = new Function('getAllData', 'CONFIG', 'normalizeDuration',
    payload.gsSource + '\n;return { getReportData: getReportData, getReportFilterOptions: getReportFilterOptions };'
  )(window.__getAllData, window.__CONFIG, window.__normalizeDuration);
  window.__fixed = Fixed;
  const deptsOf = (divId, secId) => {
    let d = sheets.Departments || [];
    if (divId) d = d.filter(x => x.DivisionID === divId);
    if (secId) d = d.filter(x => x.SectionID === secId);
    return d.map(x => ({ DepartmentID: x.DepartmentID || '', Department: x.Department || '', DivisionID: x.DivisionID || '', SectionID: x.SectionID || '', Status: x.Status || '' }));
  };
  const secsOf = (divId) => {
    let s = sheets.Sections || [];
    if (divId) s = s.filter(x => x.DivisionID === divId);
    return s.map(x => ({ SectionID: x.SectionID || '', Section: x.Section || '', DivisionID: x.DivisionID || '', SectionCode: x.SectionCode || '' }));
  };
  const machsOf = (divId, secId, deptId) => {
    let m = sheets.Machines || [];
    if (divId) m = m.filter(x => x.DivisionID === divId);
    if (secId) m = m.filter(x => x.SectionID === secId);
    if (deptId) m = m.filter(x => x.DeptID === deptId);
    return m.map(x => x).filter(x => x.MachineID);
  };
  const realPost = window.API.post.bind(window.API);
  window.API.post = (action, data) => {
    const d = data || {};
    if (action === 'getReportFilterOptions') return Promise.resolve(window.__fixed.getReportFilterOptions());
    if (action === 'getMachineCascade') {
      return Promise.resolve({
        divisions: (sheets.Divisions || []).map(x => ({ id: x.DivisionID || '', code: x.DivisionCode || '', name: x.DivisionName || '' })).filter(x => x.id),
        sections: secsOf(d.divisionId),
        departments: deptsOf(d.divisionId, d.sectionId),
        machines: machsOf(d.divisionId, d.sectionId, d.deptId)
      });
    }
    if (action === 'getSectionList') return Promise.resolve(sheets.Sections || []);
    if (action === 'getDepartmentList') return Promise.resolve(sheets.Departments || []);
    if (action === 'getMachines') return Promise.resolve(sheets.Machines || []);
    if (action === 'getReportData') return Promise.resolve(window.__fixed.getReportData(d));
    return realPost(action, data);
  };
  return true;
};

const paginationCheck = () => {
  const pageEl = document.getElementById('reportsPage') || document.body;
  const html = pageEl.innerHTML;
  const tbl = document.getElementById('rptTableCard');
  return {
    rows: document.querySelectorAll('#rptTableBody tr').length,
    recordCount: (document.getElementById('rptRecordCount') || {}).textContent || '',
    hasPagination: !!pageEl.querySelector('.pagination'),
    paginationText: pageEl.querySelector('.pagination') ? pageEl.querySelector('.pagination').textContent.trim().slice(0, 120) : '',
    hasPrevText: /Previous|Prev\b/i.test(html),
    numberedButtons: (html.match(/<button[^>]*>\s*\d+\s*<\/button>/g) || []).length,
    changePageCalls: (html.match(/changePage\(/g) || []).length
  };
};

const shot = async (page, frame, name) => {
  const f = frame || page;
  await f.evaluate(() => { const el = document.getElementById('reportsPage') || document.body; el.scrollIntoView({ block: 'start' }); }).catch(() => {});
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log('screenshot: ' + name);
};

// ---------- 2) GAS after ----------
console.log('\n===== GAS (live app + fixed logic injected) =====');
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1500, height: 1000 });
const gasConsole = [];
const gasPageErr = [];
gasPage.on('console', m => { if (m.type() === 'error') gasConsole.push(m.text().slice(0, 300)); });
gasPage.on('pageerror', e => gasPageErr.push(e.message.slice(0, 300)));
await gasPage.goto(GAS, { waitUntil: 'networkidle2', timeout: 240000 });

async function findGasFrame() {
  for (const f of gasPage.frames()) {
    if (f === gasPage.mainFrame()) continue;
    const has = await f.evaluate(() => !!(document.getElementById('wsBtn') || document.getElementById('loginForm') || document.getElementById('appContainer') || document.getElementById('reportsPage'))).catch(() => false);
    if (has) return f;
  }
  return null;
}
let gasFrame = null;
let t0 = Date.now();
while (Date.now() - t0 < 180000) {
  gasFrame = await findGasFrame();
  if (gasFrame) {
    const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
    if (hasForm) break;
  }
  await sleep(3000);
}
if (!gasFrame) { console.log('FATAL: no GAS frame'); process.exit(2); }
await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => { const ac = document.getElementById('appContainer'); return ac && ac.style.display !== 'none'; }, { timeout: 240000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('reports'));
await gasFrame.waitForFunction(() => document.getElementById('rptType') && Array.from(document.getElementById('rptType').options).some(o => o.value !== ''), { timeout: 240000 });
await sleep(1000);

await gasFrame.evaluate(GAS_INJECT, payload);
await gasFrame.evaluate(() => { if (typeof loadReportsData === 'function') loadReportsData(); });
await gasFrame.waitForFunction(() => {
  const mt = document.getElementById('rptMaintType');
  return mt && Array.from(mt.options).some(o => o.value === 'Breakdown Maintenance') &&
    Array.from(document.getElementById('rptDivision').options).some(o => o.value === 'DIV001');
}, { timeout: 30000 });
console.log('fixed options loaded in GAS frame');
const gasOpts = await gasFrame.evaluate(() => ({
  maintTypes: Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v),
  divisions: Array.from(document.getElementById('rptDivision').options).map(o => o.value).filter(v => v),
  machines: Array.from(document.getElementById('rptMachineNumber').options).map(o => o.value).filter(v => v).slice(0, 10)
}));
console.log('GAS fixed maintTypes: ' + JSON.stringify(gasOpts.maintTypes));
console.log('GAS fixed divisions: ' + JSON.stringify(gasOpts.divisions));
console.log('GAS machines incl nameless: ' + JSON.stringify(gasOpts.machines));

const gasGen = async (setFn, waitMs) => {
  await gasFrame.evaluate(setFn);
  await sleep(150);
  await gasFrame.evaluate(() => generateReport());
  await sleep(waitMs || 2500);
  return await gasFrame.evaluate(paginationCheck);
};

let r = await gasGen(() => {
  document.getElementById('rptType').value = 'machine_history';
  document.getElementById('rptDivision').value = '';
  document.getElementById('rptSection').innerHTML = '<option value="">All Sections</option>';
  document.getElementById('rptDepartment').innerHTML = '<option value="">All Departments</option>';
  document.getElementById('rptMachineNumber').innerHTML = '<option value="">All Machines</option>';
  document.getElementById('rptMaintType').value = '';
  document.getElementById('rptTechnician').value = '';
  document.getElementById('rptPriority').value = '';
  document.getElementById('rptStatus').value = '';
}, 3000);
console.log('GAS baseline (machine_history, no filters): ' + JSON.stringify(r));
await shot(gasPage, gasFrame, 'gas_after_baseline.png');

r = await gasGen(() => { document.getElementById('rptDivision').value = 'DIV001'; }, 3000);
console.log('GAS division=DIV001: ' + JSON.stringify(r));
await shot(gasPage, gasFrame, 'gas_after_division.png');

r = await gasGen(() => { document.getElementById('rptMaintType').value = 'Breakdown Maintenance'; }, 3000);
console.log('GAS maintType=Breakdown Maintenance: ' + JSON.stringify(r));
await shot(gasPage, gasFrame, 'gas_after_mainttype.png');

r = await gasGen(() => {
  document.getElementById('rptDivision').value = '';
  document.getElementById('rptMaintType').value = '';
  document.getElementById('rptType').value = 'breakdown_history';
}, 3000);
console.log('GAS breakdown_history report: ' + JSON.stringify(r));
await shot(gasPage, gasFrame, 'gas_after_breakdown_history.png');

console.log('GAS console errors: ' + JSON.stringify(gasConsole.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource')).slice(0, 6)));
console.log('GAS page errors: ' + JSON.stringify(gasPageErr.filter(e => !e.includes('gstatic')).slice(0, 6)));

// ---------- 3) CF after ----------
console.log('\n===== CF (live app + fixed logic injected) =====');
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1500, height: 1000 });
const cfConsole = [];
const cfPageErr = [];
cfPage.on('console', m => { if (m.type() === 'error') cfConsole.push(m.text().slice(0, 300)); });
cfPage.on('pageerror', e => cfPageErr.push(e.message.slice(0, 300)));
await cfPage.goto(CF, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cfPage.waitForFunction(() => { try { return typeof window.API !== 'undefined' && typeof window.navigateTo === 'function'; } catch (e) { return false; } }, { timeout: 60000 });

await cfPage.evaluate(CF_INJECT, payload);
console.log('API.post override installed on CF');
await cfPage.evaluate(() => navigateTo('reports'));
await cfPage.waitForFunction(() => {
  const mt = document.getElementById('rptMaintType');
  return mt && Array.from(mt.options).some(o => o.value === 'Breakdown Maintenance') &&
    Array.from(document.getElementById('rptDivision').options).some(o => o.value === 'DIV001');
}, { timeout: 30000 });
console.log('fixed options loaded on CF');
const cfOpts = await cfPage.evaluate(() => ({
  maintTypes: Array.from(document.getElementById('rptMaintType').options).map(o => o.value).filter(v => v),
  machines: Array.from(document.getElementById('rptMachineNumber').options).map(o => o.value).filter(v => v).slice(0, 10)
}));
console.log('CF fixed maintTypes: ' + JSON.stringify(cfOpts.maintTypes));
console.log('CF machines incl nameless: ' + JSON.stringify(cfOpts.machines));

const cfGen = async (setFn, waitMs) => {
  await cfPage.evaluate(setFn);
  await sleep(150);
  await cfPage.evaluate(() => { if (window.Reports) Reports.generateReport(); });
  await sleep(waitMs || 2500);
  return await cfPage.evaluate(paginationCheck);
};

r = await cfGen(() => {
  document.getElementById('rptType').value = 'machine_history';
  document.getElementById('rptDivision').value = '';
  document.getElementById('rptSection').innerHTML = '<option value="">All Sections</option>';
  document.getElementById('rptDepartment').innerHTML = '<option value="">All Departments</option>';
  document.getElementById('rptMachineNumber').innerHTML = '<option value="">All Machines</option>';
  document.getElementById('rptMaintType').value = '';
  document.getElementById('rptTechnician').value = '';
  document.getElementById('rptPriority').value = '';
  document.getElementById('rptStatus').value = '';
}, 3000);
console.log('CF baseline (machine_history, no filters): ' + JSON.stringify(r));
await shot(cfPage, null, 'cf_after_baseline.png');

r = await cfGen(() => { document.getElementById('rptDivision').value = 'DIV001'; }, 3000);
console.log('CF division=DIV001: ' + JSON.stringify(r));
await shot(cfPage, null, 'cf_after_division.png');

r = await cfGen(() => { document.getElementById('rptMaintType').value = 'Breakdown Maintenance'; }, 3000);
console.log('CF maintType=Breakdown Maintenance: ' + JSON.stringify(r));
await shot(cfPage, null, 'cf_after_mainttype.png');

r = await cfGen(() => {
  document.getElementById('rptDivision').value = '';
  document.getElementById('rptMaintType').value = '';
  document.getElementById('rptType').value = 'breakdown_history';
}, 3000);
console.log('CF breakdown_history report: ' + JSON.stringify(r));
await shot(cfPage, null, 'cf_after_breakdown_history.png');

console.log('CF console errors: ' + JSON.stringify(cfConsole.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource')).slice(0, 6)));
console.log('CF page errors: ' + JSON.stringify(cfPageErr.filter(e => !e.includes('gstatic')).slice(0, 6)));

fs.writeFileSync(path.join(OUT, 'after_evidence.json'), JSON.stringify({
  gasOpts, cfOpts,
  gasErrors: gasConsole.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource')).slice(0, 10),
  gasPageErrors: gasPageErr.filter(e => !e.includes('gstatic')).slice(0, 10),
  cfErrors: cfConsole.filter(e => !e.includes('gstatic') && !e.includes('Failed to load resource')).slice(0, 10),
  cfPageErrors: cfPageErr.filter(e => !e.includes('gstatic')).slice(0, 10)
}, null, 2));

await browser.close();
console.log('DONE');
