import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser, openGas, openCf, sleep, sha256, deepDiff } from './audit_lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'verify_shots', 'audit');
fs.mkdirSync(path.join(OUT, 'gas'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'cf'), { recursive: true });

const browser = await launchBrowser();
const G = await openGas(browser);
const gas = { ctl: G.ctl, page: G.page, errs: G.errs };
const C = await openCf(browser);
const cf = { ctl: C.ctl, page: C.page, errs: C.errs, network: C.network };
console.log('GAS + CF reports pages open');

const gasTypes = await gas.ctl.readOptions('rptType');
const cfTypes = await cf.ctl.readOptions('rptType');
const typesEqualText = JSON.stringify(gasTypes.map(o => ({ value: o.value, text: o.text }))) === JSON.stringify(cfTypes.map(o => ({ value: o.value, text: o.text })));

const types = gasTypes.filter(t => t.value !== '').map(t => t.value);
console.log('report types from GAS dropdown: ' + types.length);
console.log('type dropdowns identical (GAS vs CF, by text): ' + typesEqualText);
if (!typesEqualText) {
  console.log('GAS types: ' + JSON.stringify(gasTypes.map(o => ({ v: o.value, t: o.text }))));
  console.log('CF types : ' + JSON.stringify(cfTypes.map(o => ({ v: o.value, t: o.text }))));
}

const results = [];
for (const t of types) {
  const entry = { type: t };
  const gErrStart = G.errs.consoleErrors.length, cErrStart = C.errs.consoleErrors.length;
  const gPErrStart = G.errs.pageErrors.length, cPErrStart = C.errs.pageErrors.length;
  // ---- GAS ----
  await gas.ctl.ensureIdle();
  await gas.ctl.setVal('rptType', t);
  await gas.ctl.ensureIdle();
  await gas.ctl.clickGenerate();
  const gWait = await gas.ctl.waitOverlayCycle();
  let gState = await gas.ctl.readState();
  let gData = await gas.ctl.readRptData();
  if (/error generating/i.test(gState.toast) && !(gState.kpiVisible !== 'none')) {
    await gas.ctl.ensureIdle();
    await gas.ctl.clickGenerate();
    await gas.ctl.waitOverlayCycle();
    gState = await gas.ctl.readState();
    gData = await gas.ctl.readRptData();
  }
  entry.gas = { state: gState, loadingShown: gWait.loadingShown, dataHash: gData ? sha256(gData) : null, dataLen: gData ? JSON.stringify(gData).length : 0 };
  await gas.page.screenshot({ path: path.join(OUT, 'gas', 'type_' + t + '.png') }).catch(() => {});
  // ---- CF ----
  await cf.ctl.ensureIdle();
  await cf.ctl.setVal('rptType', t);
  await cf.ctl.ensureIdle();
  delete cf.network['getReportData'];
  await cf.ctl.clickGenerate();
  const cWait = await cf.ctl.waitOverlayCycle();
  let cState = await cf.ctl.readState();
  let cResp = cf.network['getReportData'] ? cf.network['getReportData'].body : null;
  if (/error generating/i.test(cState.toast) || !cResp) {
    await cf.ctl.ensureIdle();
    delete cf.network['getReportData'];
    await cf.ctl.clickGenerate();
    await cf.ctl.waitOverlayCycle();
    cState = await cf.ctl.readState();
    cResp = cf.network['getReportData'] ? cf.network['getReportData'].body : null;
  }
  const cData = cResp && typeof cResp === 'object' && 'data' in cResp ? cResp.data : cResp;
  entry.cf = { state: cState, loadingShown: cWait.loadingShown, success: cResp ? cResp.success : null, dataHash: cData ? sha256(cData) : null, dataLen: cData ? JSON.stringify(cData).length : 0 };
  entry.cfFetchFailed = !cResp;
  await cf.page.screenshot({ path: path.join(OUT, 'cf', 'type_' + t + '.png') }).catch(() => {});
  // ---- per-type error capture ----
  entry.consoleErrors = {
    gas: G.errs.consoleErrors.slice(gErrStart).map(e => e.text),
    cf: C.errs.consoleErrors.slice(cErrStart).map(e => e.text)
  };
  entry.pageErrors = {
    gas: G.errs.pageErrors.slice(gPErrStart).map(e => e.text),
    cf: C.errs.pageErrors.slice(cPErrStart).map(e => e.text)
  };
  const gNo = gState.tableVisible === 'none' || gState.kpiVisible === 'none';
  const cNo = cState.tableVisible === 'none' || cState.kpiVisible === 'none';
  entry.noData = { gas: gNo, cf: cNo };
  entry.visEqual = gState.kpiVisible === cState.kpiVisible && gState.tableVisible === cState.tableVisible && gState.chartsVisible === cState.chartsVisible;
  entry.visibility = { gas: { kpi: gState.kpiVisible, tbl: gState.tableVisible, ch: gState.chartsVisible }, cf: { kpi: cState.kpiVisible, tbl: cState.tableVisible, ch: cState.chartsVisible } };
  entry.toastEqual = gNo === cNo ? gState.toast === cState.toast : false;
  entry.toast = { gas: gState.toast, cf: cState.toast };
  if (gNo || cNo) {
    entry.rows = { gas: 0, cf: 0 };
    entry.rowsEqual = gNo === cNo;
    entry.recordCountEqual = gNo === cNo;
    entry.titleEqual = gNo === cNo;
    entry.kpiEqual = gNo === cNo;
    entry.tableEqual = gNo === cNo;
    entry.chartsEqual = gNo === cNo;
    entry.chartCards = { gas: gState.chartCards, cf: cState.chartCards };
    entry.dataEqual = gNo === cNo;
  } else {
    entry.rows = { gas: gState.rows, cf: cState.rows };
    entry.rowsEqual = gState.rows === cState.rows;
    entry.recordCountEqual = gState.recordCount === cState.recordCount;
    entry.recordCount = { gas: gState.recordCount, cf: cState.recordCount };
    entry.titleEqual = gState.title === cState.title;
    entry.title = { gas: gState.title, cf: cState.title };
    entry.kpiEqual = JSON.stringify(gState.kpi) === JSON.stringify(cState.kpi);
    entry.kpi = { gas: gState.kpi, cf: cState.kpi };
    entry.tableEqual = JSON.stringify(gState.tableRows) === JSON.stringify(cState.tableRows);
    entry.chartsEqual = JSON.stringify(gState.chartTitles) === JSON.stringify(cState.chartTitles) && gState.chartCards === cState.chartCards && gState.chartFilled === cState.chartFilled;
    entry.chartCards = { gas: gState.chartCards, cf: cState.chartCards };
    entry.chartTitles = { gas: gState.chartTitles, cf: cState.chartTitles };
    entry.chartFilled = { gas: gState.chartFilled, cf: cState.chartFilled };
    entry.dataEqual = gData && cData ? deepDiff(gData, cData).length === 0 : (gData === cData);
    if (gData && cData && !entry.dataEqual) entry.dataDiff = deepDiff(gData, cData).slice(0, 20);
  }
  results.push(entry);
  const ok = entry.visEqual && entry.rowsEqual && entry.recordCountEqual && entry.titleEqual && entry.kpiEqual && entry.tableEqual && entry.dataEqual && entry.chartsEqual;
  const tag = (gNo || cNo) ? 'NO_DATA' : '';
  console.log((ok ? 'OK ' : 'DIFF') + (tag ? ' ' + tag : '') + ' [' + t + '] rows=' + entry.rows.gas + '/' + entry.rows.cf + ' kpiEq=' + entry.kpiEqual + ' tableEq=' + entry.tableEqual + ' dataEq=' + entry.dataEqual + ' chartsEq=' + entry.chartsEqual + ' (GAS errs=' + entry.consoleErrors.gas.length + ' CF errs=' + entry.consoleErrors.cf.length + ' CF fetchFailed=' + entry.cfFetchFailed + ')');
}

fs.writeFileSync(path.join(OUT, 'audit_types.json'), JSON.stringify({ typesEqual: typesEqualText, types, results }, null, 2));
console.log('\nWROTE verify_shots/audit/audit_types.json');
await browser.close();
