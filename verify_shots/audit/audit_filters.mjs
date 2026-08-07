import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser, openGas, openCf, sleep, sha256, deepDiff } from '../../audit_lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname);
fs.mkdirSync(path.join(OUT, 'filters_gas'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'filters_cf'), { recursive: true });

const browser = await launchBrowser();
const G = await openGas(browser);
const C = await openCf(browser);
console.log('GAS + CF reports pages open');

async function resetFilters(ctl) {
  await ctl.setVal('rptType', 'machine_history');
  await ctl.setVal('rptDivision', '');
  await ctl.waitCascadeAfterDiv();
  await ctl.setVal('rptSection', '');
  await ctl.waitCascadeAfterSec();
  await ctl.setVal('rptDepartment', '');
  await ctl.waitCascadeAfterDept();
  await ctl.setVal('rptMachineNumber', '');
  await ctl.setVal('rptTechnician', '');
  await ctl.setVal('rptMaintType', '');
  await ctl.setVal('rptPriority', '');
  await ctl.setVal('rptStatus', '');
  await ctl.setVal('rptFromDate', '');
  await ctl.setVal('rptToDate', '');
}

async function applyFilters(ctl, f) {
  if (f.division !== undefined) { await ctl.setVal('rptDivision', f.division); await ctl.waitCascadeAfterDiv(); }
  if (f.section !== undefined) { await ctl.setVal('rptSection', f.section); await ctl.waitCascadeAfterSec(); }
  if (f.department !== undefined) { await ctl.setVal('rptDepartment', f.department); await ctl.waitCascadeAfterDept(); }
  if (f.machine !== undefined) await ctl.setVal('rptMachineNumber', f.machine);
  if (f.technician !== undefined) await ctl.setVal('rptTechnician', f.technician);
  if (f.maintType !== undefined) await ctl.setVal('rptMaintType', f.maintType);
  if (f.priority !== undefined) await ctl.setVal('rptPriority', f.priority);
  if (f.status !== undefined) await ctl.setVal('rptStatus', f.status);
  if (f.from !== undefined) await ctl.setVal('rptFromDate', f.from);
  if (f.to !== undefined) await ctl.setVal('rptToDate', f.to);
}

const scenarios = [
  { name: 'division_SPOKE', f: { division: 'DIV001' } },
  { name: 'division_CCD', f: { division: 'DIV002' } },
  { name: 'section_SPOKE', f: { section: 'SEC002' } },
  { name: 'section_MAINT', f: { section: 'SEC009' } },
  { name: 'dept_SWAGGING', f: { department: 'DEPT003' } },
  { name: 'dept_FACILITY', f: { department: 'DEPT014' } },
  { name: 'machine_SW06', f: { machine: 'SW # 06' } },
  { name: 'machine_SP05', f: { machine: 'SP # 05' } },
  { name: 'tech_ARIF', f: { technician: 'ARIF' } },
  { name: 'tech_ARSALAN', f: { technician: 'ARSALAN' } },
  { name: 'maint_ALL', f: { maintType: 'All' } },
  { name: 'maint_ELEC', f: { maintType: 'Breakdown Electrical' } },
  { name: 'maint_BREAKDOWN', f: { maintType: 'Breakdown Maintenance' } },
  { name: 'maint_PREVENTIVE', f: { maintType: 'Preventive Maintenance' } },
  { name: 'priority_HIGH', f: { priority: 'High' } },
  { name: 'priority_MEDIUM', f: { priority: 'Medium' } },
  { name: 'status_RUNNING', f: { status: 'RUNNING' } },
  { name: 'status_PENDING', f: { status: 'PENDING' } },
  { name: 'status_APPROVED', f: { status: 'APPROVED' } },
  { name: 'status_OPEN', f: { status: 'OPEN' } },
  { name: 'date_JUL2026', f: { from: '2026-07-01', to: '2026-07-31' } },
  { name: 'date_SAMEDAY_0806', f: { from: '2026-08-06', to: '2026-08-06' } },
  { name: 'date_FULL2026', f: { from: '2026-01-01', to: '2026-12-31' } },
  { name: 'date_ZERO2020', f: { from: '2020-01-01', to: '2020-12-31' } },
  { name: 'combo_DIV_SEC_DEPT', f: { division: 'DIV001', section: 'SEC002', department: 'DEPT003' } },
  { name: 'combo_DEPT_ARIF', f: { department: 'DEPT003', technician: 'ARIF' } },
  { name: 'combo_SW06_HIGH_OPEN', f: { machine: 'SW # 06', priority: 'High', status: 'OPEN' } },
  { name: 'combo_SP05_ARSALAN', f: { machine: 'SP # 05', technician: 'ARSALAN' } },
  { name: 'combo_DIV_JUL', f: { division: 'DIV001', from: '2026-07-01', to: '2026-07-31' } },
  { name: 'combo_PM_SP05', f: { maintType: 'Preventive Maintenance', machine: 'SP # 05' } },
  { name: 'combo_SAMEDAY_RUNNING', f: { from: '2026-08-06', to: '2026-08-06', status: 'RUNNING' } },
  { name: 'edge_EMPTY_ALL', f: {} },
];

const results = [];
for (const s of scenarios) {
  const entry = { name: s.name, f: s.f };
  const gErr = G.errs.consoleErrors.length, cErr = C.errs.consoleErrors.length;
  await resetFilters(G.ctl);
  await G.ctl.ensureIdle();
  await applyFilters(G.ctl, s.f);
  await G.ctl.ensureIdle();
  await G.ctl.clickGenerate();
  const gw = await G.ctl.waitOverlayCycle();
  let gs = await G.ctl.readState();
  let gd = await G.ctl.readRptData();
  if (/error generating/i.test(gs.toast)) {
    await G.ctl.ensureIdle();
    await G.ctl.clickGenerate();
    await G.ctl.waitOverlayCycle();
    gs = await G.ctl.readState();
    gd = await G.ctl.readRptData();
  }
  await G.page.screenshot({ path: path.join(OUT, 'filters_gas', s.name + '.png') }).catch(() => {});

  await resetFilters(C.ctl);
  await C.ctl.ensureIdle();
  delete C.network['getReportData'];
  await applyFilters(C.ctl, s.f);
  await C.ctl.ensureIdle();
  await C.ctl.clickGenerate();
  const cw = await C.ctl.waitOverlayCycle();
  let cs = await C.ctl.readState();
  let cr = C.network['getReportData'] ? C.network['getReportData'].body : null;
  if (/error generating/i.test(cs.toast) || !cr) {
    await C.ctl.ensureIdle();
    delete C.network['getReportData'];
    await C.ctl.clickGenerate();
    await C.ctl.waitOverlayCycle();
    cs = await C.ctl.readState();
    cr = C.network['getReportData'] ? C.network['getReportData'].body : null;
  }
  const cd = cr && typeof cr === 'object' && 'data' in cr ? cr.data : cr;
  await C.page.screenshot({ path: path.join(OUT, 'filters_cf', s.name + '.png') }).catch(() => {});

  const gNo = gs.tableVisible === 'none' || gs.kpiVisible === 'none';
  const cNo = cs.tableVisible === 'none' || cs.kpiVisible === 'none';
  entry.noData = { gas: gNo, cf: cNo };
  entry.visEqual = gs.kpiVisible === cs.kpiVisible && gs.tableVisible === cs.tableVisible && gs.chartsVisible === cs.chartsVisible;
  entry.toastEqual = gNo === cNo ? gs.toast === cs.toast : false;
  entry.toast = { gas: gs.toast, cf: cs.toast };
  entry.rowsEqual = gNo === cNo ? true : gs.rows === cs.rows;
  entry.rows = { gas: gNo ? 0 : gs.rows, cf: cNo ? 0 : cs.rows };
  entry.recordCountEqual = (gNo && cNo) || (!gNo && !cNo) ? gs.recordCount === cs.recordCount : false;
  entry.titleEqual = (gNo && cNo) || (!gNo && !cNo) ? gs.title === cs.title : false;
  entry.title = { gas: gs.title, cf: cs.title };
  entry.kpiEqual = (gNo && cNo) ? true : (gNo !== cNo ? false : JSON.stringify(gs.kpi) === JSON.stringify(cs.kpi));
  entry.tableEqual = (gNo && cNo) ? true : (gNo !== cNo ? false : JSON.stringify(gs.tableRows) === JSON.stringify(cs.tableRows));
  entry.chartsEqual = (gNo && cNo) ? true : (gNo !== cNo ? false : JSON.stringify(gs.chartTitles) === JSON.stringify(cs.chartTitles) && gs.chartCards === cs.chartCards && gs.chartFilled === cs.chartFilled);
  entry.chartCards = { gas: gs.chartCards, cf: cs.chartCards };
  entry.dataEqual = gd && cd ? deepDiff(gd, cd).length === 0 : (gd === cd);
  if (gd && cd && !entry.dataEqual) entry.dataDiff = deepDiff(gd, cd).slice(0, 10);
  entry.kpi = { gas: gs.kpi, cf: cs.kpi };
  entry.gasLoading = gw.loadingShown;
  entry.cfLoading = cw.loadingShown;
  entry.cfFetchFailed = !cr;
  entry.consoleErrors = { gas: G.errs.consoleErrors.slice(gErr), cf: C.errs.consoleErrors.slice(cErr) };
  entry.pageErrors = { gas: G.errs.pageErrors.length ? G.errs.pageErrors.map(e => e.text) : [], cf: C.errs.pageErrors.length ? C.errs.pageErrors.map(e => e.text) : [] };
  results.push(entry);
  const ok = entry.visEqual && entry.rowsEqual && entry.recordCountEqual && entry.titleEqual && entry.kpiEqual && entry.tableEqual && entry.chartsEqual && entry.dataEqual;
  console.log((ok ? 'OK ' : 'DIFF') + ' [' + s.name + '] rows=' + entry.rows.gas + '/' + entry.rows.cf + ' kpiEq=' + entry.kpiEqual + ' tableEq=' + entry.tableEqual + ' dataEq=' + entry.dataEqual + ' chartsEq=' + entry.chartsEqual + ' (GASerrs=' + entry.consoleErrors.gas.length + ' CFerrs=' + entry.consoleErrors.cf.length + ' CFfetch=' + entry.cfFetchFailed + ')');
}

fs.writeFileSync(path.join(OUT, 'audit_filters.json'), JSON.stringify(results, null, 2));
console.log('\nWROTE verify_shots/audit/audit_filters.json');
await browser.close();
