import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pwi-maintanance.pages.dev';
const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT = path.join(__dirname, 'verify_shots');
fs.mkdirSync(SHOT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {};
const DROPDOWNS = ['rptType','rptDivision','rptSection','rptDepartment','rptMachineNumber','rptTechnician','rptMaintType','rptPriority','rptStatus'];

async function measure(ctx, isFrame) {
  const snapshot = await ctx.evaluate(() => {
    const DROPDOWN_IDS = ['rptType','rptDivision','rptSection','rptDepartment','rptMachineNumber','rptTechnician','rptMaintType','rptPriority','rptStatus'];
    const ids = DROPDOWN_IDS.concat(['rptFromDate','rptToDate']);
    const els = {};
    ids.forEach(id => { const el = document.getElementById(id); if (el) els[id] = el; });

    // layout: group geometry per row
    const groups = Array.from(document.querySelectorAll('#reportsPage .rpt-filter-row .rpt-filter-group')).map(g => {
      const r = g.getBoundingClientRect();
      const lab = g.querySelector('label');
      const ctl = g.querySelector('select,input');
      const lr = lab ? lab.getBoundingClientRect() : null;
      const cr = ctl ? ctl.getBoundingClientRect() : null;
      return {
        label: lab ? lab.textContent.trim() : '',
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        ctrlW: cr ? Math.round(cr.width) : null, ctrlH: cr ? Math.round(cr.height) : null
      };
    });
    const rowsByTop = {};
    groups.forEach(g => { (rowsByTop[g.y] = rowsByTop[g.y] || []).push(g.label); });
    const rows = Object.keys(rowsByTop).sort((a,b)=>a-b).map(y => ({ y: +y, labels: rowsByTop[y] }));

    // dropdown contents
    const dropdowns = {};
    ids.forEach(id => {
      const el = els[id];
      if (!el || el.tagName !== 'SELECT') return;
      dropdowns[id] = Array.from(el.options).map(o => ({ value: o.value, text: o.textContent }));
    });

    // computed styles of a label + a select + an input
    const styleOf = el => {
      const s = getComputedStyle(el);
      return { font: s.fontFamily.split(',')[0].replace(/["']/g,'').trim(), size: s.fontSize, weight: s.fontWeight, color: s.color, bg: s.backgroundColor, height: s.height };
    };
    const styles = {
      label: styleOf(document.querySelector('#rptType').closest('.rpt-filter-group').querySelector('label')),
      select: styleOf(document.getElementById('rptType')),
      dateInput: styleOf(document.getElementById('rptFromDate'))
    };

    // any Loading residue?
    const loading = Array.from(document.querySelectorAll('#reportsPage select option')).filter(o => /loading/i.test(o.textContent)).map(o => o.textContent.trim());

    return { rows, groups, dropdowns, styles, loading, title: document.title };
  });
  return snapshot;
}

function dropdownSummary(d) {
  const out = {};
  Object.keys(d).forEach(id => {
    const opts = d[id] || [];
    out[id] = {
      total: opts.length,
      nonEmpty: opts.filter(o => o.value !== '').length,
      values: opts.filter(o => o.value !== '').map(o => o.value).slice(0, 60),
      labels: opts.filter(o => o.value !== '').map(o => o.text).slice(0, 60)
    };
  });
  return out;
}

async function cascadeTest(ctx, base = {}) {
  const result = { ...base };
  const divs = await ctx.evaluate(() => Array.from(document.getElementById('rptDivision').options).map(o => o.value).filter(v => v !== ''));
  result.divisionCount = divs.length;
  const firstDiv = divs[0];

  // --- select first division ---
  const t0 = Date.now();
  await ctx.evaluate(dv => { const s = document.getElementById('rptDivision'); s.value = dv; s.dispatchEvent(new Event('change')); }, firstDiv);
  await sleep(120);
  result.after120ms = await ctx.evaluate(() => ({
    division: document.getElementById('rptDivision').value,
    sectionOpts: Array.from(document.getElementById('rptSection').options).map(o => o.text).slice(0, 12),
    deptOpts: Array.from(document.getElementById('rptDepartment').options).map(o => o.text).slice(0, 12),
    machOpts: Array.from(document.getElementById('rptMachineNumber').options).map(o => o.text).slice(0, 6)
  }));

  // wait until no Loading and options stable
  const start = Date.now();
  let last = null, stable = 0, seenLoading = false;
  while (Date.now() - start < 90000) {
    const s = await ctx.evaluate(() => {
      const sec = Array.from(document.getElementById('rptSection').options).map(o => o.text);
      const dep = Array.from(document.getElementById('rptDepartment').options).map(o => o.text);
      const mach = Array.from(document.getElementById('rptMachineNumber').options).map(o => o.text);
      return { sec, dep, mach, division: document.getElementById('rptDivision').value };
    });
    const key = JSON.stringify(s);
    if (s.sec.some(t => /loading/i.test(t)) || s.dep.some(t => /loading/i.test(t)) || s.mach.some(t => /loading/i.test(t))) { seenLoading = true; stable = 0; last = key; continue; }
    if (key === last) { stable++; } else { stable = 0; last = key; }
    if (stable >= 3) break;
    await sleep(1000);
  }
  result.settleMs = Date.now() - start;
  result.seenLoading = seenLoading;
  result.settled = await ctx.evaluate(() => {
    const sec = Array.from(document.getElementById('rptSection').options);
    const dep = Array.from(document.getElementById('rptDepartment').options);
    const mach = Array.from(document.getElementById('rptMachineNumber').options);
    const hasLoading = Array.from(document.querySelectorAll('#rptSection option,#rptDepartment option,#rptMachineNumber option')).some(o => /loading/i.test(o.textContent));
    return {
      division: document.getElementById('rptDivision').value,
      sectionCount: sec.length - 1,
      sectionValues: sec.map(o => o.value).filter(v => v !== ''),
      deptCount: dep.length - 1,
      deptLabels: dep.map(o => o.text).filter(v => v !== ''),
      machCount: mach.length - 1,
      hasLoading
    };
  });

  // --- select a section within the division (2nd value) ---
  const secValues = result.settled.sectionValues;
  if (secValues.length >= 2) {
    await ctx.evaluate(v => { const s = document.getElementById('rptSection'); s.value = v; s.dispatchEvent(new Event('change')); }, secValues[1]);
    await sleep(300);
    result.afterSection300ms = await ctx.evaluate(() => ({
      section: document.getElementById('rptSection').value,
      deptOpts: Array.from(document.getElementById('rptDepartment').options).map(o => o.text).slice(0, 12),
      machOpts: Array.from(document.getElementById('rptMachineNumber').options).map(o => o.text).slice(0, 6)
    }));
    const s2 = Date.now();
    let last2 = null, st2 = 0;
    while (Date.now() - s2 < 90000) {
      const st = await ctx.evaluate(() => Array.from(document.getElementById('rptDepartment').options).map(o => o.text).join('|'));
      if (/loading/i.test(st)) { st2 = 0; last2 = st; await sleep(1000); continue; }
      if (st === last2) { st2++; } else { st2 = 0; last2 = st; }
      if (st2 >= 3) break;
      await sleep(1000);
    }
    result.sectionSettleMs = Date.now() - s2;
    result.sectionSettled = await ctx.evaluate(() => ({
      section: document.getElementById('rptSection').value,
      division: document.getElementById('rptDivision').value,
      deptCount: Array.from(document.getElementById('rptDepartment').options).length - 1,
      deptLabels: Array.from(document.getElementById('rptDepartment').options).map(o => o.text).filter(v => v !== ''),
      machCount: Array.from(document.getElementById('rptMachineNumber').options).length - 1,
      machLabels: Array.from(document.getElementById('rptMachineNumber').options).map(o => o.text).filter(v => v !== '').slice(0, 8)
    }));
  }
  return result;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });

// ===================== CF =====================
const cfPage = await browser.newPage();
await cfPage.setViewport({ width: 1440, height: 900 });
const cfApi = {};
const cfConsoleErrors = [];
const cfPageErrors = [];
cfPage.on('response', async res => {
  if (res.url().includes('/api/exec') && res.request().method() === 'POST') {
    try {
      const a = JSON.parse(res.request().postData()).action;
      cfApi[a] = (cfApi[a] || 0) + 1;
      if (a === 'getReportFilterOptions' || a === 'getMachineCascade' || a === 'getSectionList' || a === 'getDepartmentList' || a === 'getMachines') R.cfMasterApi = (R.cfMasterApi || 0) + 1;
    } catch (e) {}
  }
});
cfPage.on('console', m => { const t = m.text(); if (m.type() === 'error' || t.includes('[API]')) cfConsoleErrors.push(t); });
cfPage.on('pageerror', e => cfPageErrors.push(e.message));

await cfPage.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
await cfPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
await cfPage.waitForSelector('#loginForm', { timeout: 60000 });
await cfPage.type('#loginEmail', EMAIL);
await cfPage.type('#loginPassword', PASSWORD);
await cfPage.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await cfPage.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
await cfPage.waitForSelector('#pageContent', { timeout: 60000 });

await cfPage.evaluate(() => navigateTo('reports'));
await cfPage.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1, { timeout: 60000 });
await sleep(2500);

R.cf = await measure(cfPage);
R.cf.shots = {};
const cfReportsEl = await cfPage.$('#reportsPage');
R.cf.shots.filterPanel = path.join(SHOT, 'side_by_side_CF_reports.png');
await cfReportsEl.screenshot({ path: R.cf.shots.filterPanel });

// CF cascade
R.cf.cascade = await cascadeTest(cfPage);

// CF no-reload on nav
R.cf.masterCallsBeforeNav = R.cfMasterApi || 0;
for (const p of ['dashboard', 'inventory', 'assets', 'reports', 'reports']) {
  await cfPage.evaluate(pp => navigateTo(pp), p);
  await sleep(2500);
}
R.cf.masterCallsAfterNav = R.cfMasterApi || 0;
R.cf.navDelta = R.cf.masterCallsAfterNav - R.cf.masterCallsBeforeNav;

// CF console/API errors (exclude benign gstatic for pageerrors)
R.cf.consoleErrors = cfConsoleErrors.slice(0, 10);
R.cf.pageErrors = cfPageErrors.filter(e => !e.includes('gstatic')).slice(0, 10);
R.cf.apiCalls = cfApi;

// ===================== GAS =====================
const gasPage = await browser.newPage();
await gasPage.setViewport({ width: 1440, height: 900 });
const gasConsoleErrors = [];
const gasPageErrors = [];
gasPage.on('console', m => { if (m.type() === 'error') gasConsoleErrors.push(m.text()); });
gasPage.on('pageerror', e => gasPageErrors.push(e.message));
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
{
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    gasFrame = await findGasFrame();
    if (gasFrame) {
      const hasForm = await gasFrame.evaluate(() => !!document.getElementById('loginForm')).catch(() => false);
      if (hasForm) break;
    }
    await sleep(3000);
  }
}
if (!gasFrame) { console.log('FATAL: GAS app frame not found'); process.exit(2); }
await gasFrame.type('#loginEmail', EMAIL);
await gasFrame.type('#loginPassword', PASSWORD);
await gasFrame.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
await gasFrame.waitForFunction(() => {
  const ac = document.getElementById('appContainer');
  return ac && ac.style.display !== 'none';
}, { timeout: 240000 });
await sleep(3000);
await gasFrame.evaluate(() => navigateTo('reports'));
await gasFrame.waitForFunction(() => document.getElementById('rptType') && document.getElementById('rptDivision').options.length > 1, { timeout: 240000 });
await sleep(2500);

R.gas = await measure(gasFrame);
R.gas.shots = {};
const gasReportsEl = await gasFrame.$('#reportsPage');
R.gas.shots.filterPanel = path.join(SHOT, 'side_by_side_GAS_reports.png');
await gasReportsEl.screenshot({ path: R.gas.shots.filterPanel });

// GAS cascade
R.gas.cascade = await cascadeTest(gasFrame);

R.gas.consoleErrors = gasConsoleErrors.slice(0, 10);
R.gas.pageErrors = gasPageErrors.filter(e => !e.includes('gstatic')).slice(0, 10);

// ===================== compare =====================
const C = {};
const cfRows = R.cf.rows, gasRows = R.gas.rows;
C.rows = {
  cf: cfRows.map(r => r.labels.join(', ')),
  gas: gasRows.map(r => r.labels.join(', '))
};
C.rowCountMatch = cfRows.length === gasRows.length;
C.sameRowGroups = [];
cfRows.forEach((cr, i) => {
  const gr = gasRows[i];
  const ok = !!gr && cr.labels.join('|') === gr.labels.join('|');
  C.sameRowGroups.push({ row: i + 1, labels: cr.labels, cfY: cr.y, gasY: gr ? gr.y : null, ok });
});
C.ctrlGeom = (() => {
  const g = id => ({
    cf: R.cf.groups.find(x => x.label === id),
    gas: R.gas.groups.find(x => x.label === id)
  });
  const out = {};
  ['Report Type','Division','Section','Department','Machine Number','Technician','Maintenance Type','Priority','Status','From Date','To Date'].forEach(lbl => {
    const c = g(lbl);
    if (c.cf && c.gas) out[lbl] = { cf: { x: c.cf.x, w: c.cf.w, ctrlW: c.cf.ctrlW, ctrlH: c.cf.ctrlH }, gas: { x: c.gas.x, w: c.gas.w, ctrlW: c.gas.ctrlW, ctrlH: c.gas.ctrlH } };
  });
  return out;
})();
C.styles = { cf: R.cf.styles, gas: R.gas.styles };

// dropdown comparison
const cfSum = dropdownSummary(R.cf.dropdowns);
const gasSum = dropdownSummary(R.gas.dropdowns);
C.dropdowns = {};
DROPDOWNS.forEach(id => {
  const c = cfSum[id], g = gasSum[id];
  const valuesMatch = c && g && JSON.stringify(c.values) === JSON.stringify(g.values);
  const labelsMatch = c && g && JSON.stringify(c.labels) === JSON.stringify(g.labels);
  C.dropdowns[id] = {
    cf: { total: c && c.total, nonEmpty: c && c.nonEmpty, sample: c && c.labels.slice(0, 4) },
    gas: { total: g && g.total, nonEmpty: g && g.nonEmpty, sample: g && g.labels.slice(0, 4) },
    valuesMatch, labelsMatch
  };
});

// cascade comparison
C.cascade = {
  cf: { div: R.cf.cascade.settled.division, sec: R.cf.cascade.settled.sectionCount, dept: R.cf.cascade.settled.deptCount, mach: R.cf.cascade.settled.machCount, settleMs: R.cf.cascade.settleMs, seenLoading: R.cf.cascade.seenLoading, deptLabels: R.cf.cascade.settled.deptLabels },
  gas: { div: R.gas.cascade.settled.division, sec: R.gas.cascade.settled.sectionCount, dept: R.gas.cascade.settled.deptCount, mach: R.gas.cascade.settled.machCount, settleMs: R.gas.cascade.settleMs, seenLoading: R.gas.cascade.seenLoading, deptLabels: R.gas.cascade.settled.deptLabels }
};

R.cf.summary = dropdownSummary(R.cf.dropdowns);
R.gas.summary = dropdownSummary(R.gas.dropdowns);

fs.writeFileSync(path.join(SHOT, 'side_by_side_results.json'), JSON.stringify(R, null, 2));

// ===================== report =====================
console.log('================ SIDE-BY-SIDE LIVE RESULTS ================');
console.log('\n[1] Layout rows');
console.log('  CF : ' + C.rows.cf.map(r => '[' + r + ']').join('  '));
console.log('  GAS: ' + C.rows.gas.map(r => '[' + r + ']').join('  '));
console.log('  row count match: ' + C.rowCountMatch);
C.sameRowGroups.forEach(g => console.log(`  row ${g.row} "${g.labels.join(', ')}" -> CF y=${g.cfY} GAS y=${g.gasY} sameGroups=${g.ok}`));

console.log('\n[2] Group geometry (x / width / control w / control h)');
for (const lbl of Object.keys(C.ctrlGeom)) {
  const c = C.ctrlGeom[lbl];
  const m = (o) => `x=${o.x} w=${o.w} ctrl=${o.ctrlW}x${o.ctrlH}`;
  console.log(`  ${lbl.padEnd(18)} CF: ${m(c.cf)}   GAS: ${m(c.gas)}`);
}

console.log('\n[3] Computed styles (label / select / date-input)');
const st = C.styles;
for (const k of ['label', 'select', 'dateInput']) {
  console.log(`  ${k}: CF font=${st.cf[k].font} size=${st.cf[k].size} weight=${st.cf[k].weight} color=${st.cf[k].color} bg=${st.cf[k].bg}`);
  console.log(`       GAS font=${st.gas[k].font} size=${st.gas[k].size} weight=${st.gas[k].weight} color=${st.gas[k].color} bg=${st.gas[k].bg}`);
}

console.log('\n[4] Dropdown contents (values match / labels match)');
for (const id of DROPDOWNS) {
  const d = C.dropdowns[id];
  console.log(`  ${id.padEnd(18)} CF ${d.cf.nonEmpty}/${d.cf.total} GAS ${d.gas.nonEmpty}/${d.gas.total} valuesMatch=${d.valuesMatch} labelsMatch=${d.labelsMatch} | CF ${JSON.stringify(d.cf.sample)} | GAS ${JSON.stringify(d.gas.sample)}`);
}

console.log('\n[5] Cascade (DIV001)');
console.log('  CF : settle=' + C.cascade.cf.settleMs + 'ms seenLoading=' + C.cascade.cf.seenLoading + ' division="' + C.cascade.cf.div + '" sections=' + C.cascade.cf.sec + ' depts=' + C.cascade.cf.dept + ' machines=' + C.cascade.cf.mach + ' deptLabels=' + JSON.stringify(C.cascade.cf.deptLabels.slice(0, 3)));
console.log('  GAS: settle=' + C.cascade.gas.settleMs + 'ms seenLoading=' + C.cascade.gas.seenLoading + ' division="' + C.cascade.gas.div + '" sections=' + C.cascade.gas.sec + ' depts=' + C.cascade.gas.dept + ' machines=' + C.cascade.gas.mach + ' deptLabels=' + JSON.stringify(C.cascade.gas.deptLabels.slice(0, 3)));

console.log('\n[6] Errors');
console.log('  CF  console errors=' + R.cf.consoleErrors.length + ' page errors=' + R.cf.pageErrors.length + ' -> ' + JSON.stringify(R.cf.consoleErrors.concat(R.cf.pageErrors).slice(0, 5)));
console.log('  GAS console errors=' + R.gas.consoleErrors.length + ' page errors=' + R.gas.pageErrors.length + ' -> ' + JSON.stringify(R.gas.consoleErrors.concat(R.gas.pageErrors).slice(0, 5)));

console.log('\n[7] CF master-list reload on nav (delta)');
console.log('  master API calls: before nav=' + R.cf.masterCallsBeforeNav + ' after nav cycle=' + R.cf.masterCallsAfterNav + ' delta=' + R.cf.navDelta);

console.log('\n[8] Loading residue');
console.log('  CF  loading options: ' + JSON.stringify(R.cf.loading));
console.log('  GAS loading options: ' + JSON.stringify(R.gas.loading));

console.log('\nscreenshots:');
console.log('  ' + R.cf.shots.filterPanel);
console.log('  ' + R.gas.shots.filterPanel);
console.log('  results json: ' + path.join(SHOT, 'side_by_side_results.json'));

await browser.close();
console.log('\nDONE');
