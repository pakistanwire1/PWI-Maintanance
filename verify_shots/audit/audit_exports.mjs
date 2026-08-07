import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser, openGas, openCf, sleep } from '../../audit_lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'exports');
fs.mkdirSync(OUT, { recursive: true });

async function runSide(name, ctl, target, ns) {
  const out = {};
  await ctl.ensureIdle();
  await ctl.setVal('rptType', 'machine_history');
  await ctl.ensureIdle();
  await ctl.clickGenerate();
  await ctl.waitOverlayCycle();
  await sleep(2500);

  const res = await target.evaluate(ns => {
    const errs = [];
    const P = ns ? ns + '.' : '';
    window.__blobs = [];
    window.__printed = 0;
    try {
      const Orig = window.Blob;
      window.Blob = function(parts, opts) {
        try { window.__blobs.push({ content: (parts || []).map(p => String(p)).join(''), type: (opts && opts.type) || '' }); } catch (e) {}
        return new Orig(parts, opts);
      };
      window.Blob.prototype = Orig.prototype;
    } catch (e) { errs.push('BlobPatch:' + e.message); }
    try {
      window.print = function() { window.__printed++; };
    } catch (e) { errs.push('PrintPatch:' + e.message); }
    const call = fn => { try { eval(P + fn + '()'); return true; } catch (e) { errs.push(fn + ':' + e.message); return false; } };
    const csvOk = call('exportCSV');
    const xlsOk = call('exportExcel');
    const pdfOk = call('exportPDF');
    window.print();
    return { csvOk, xlsOk, pdfOk, blobs: window.__blobs.map(b => ({ type: b.type, len: b.content.length, head: b.content.slice(0, 40) })), printed: window.__printed, errs };
  }, ns);

  const csv = res.blobs.find(b => b.type.indexOf('text/csv') === 0);
  const xls = res.blobs.find(b => b.type.indexOf('vnd.ms-excel') > -1);
  out.csv = {
    handler: res.csvOk,
    found: !!csv,
    mime: csv && csv.type,
    size: csv && csv.len,
    bomUCode: csv ? csv.type.length > 0 : false,
    lines: 0, header: ''
  };
  out.xls = { handler: res.xlsOk, found: !!xls, mime: xls && xls.type, size: xls && xls.len };
  out.print = { pdfHandler: res.pdfOk, totalCalls: res.printed };
  out.errs = res.errs;
  return out;
}

const browser = await launchBrowser();
const G = await openGas(browser);
const C = await openCf(browser);
console.log('GAS + CF open');

const gasEx = await runSide('gas', G.ctl, G.frame, null);
console.log('GAS exports:', JSON.stringify(gasEx));
const cfEx = await runSide('cf', C.ctl, C.page, 'Reports');
console.log('CF exports:', JSON.stringify(cfEx));

const allOk = gasEx.csv.found && gasEx.csv.size === 15539 && gasEx.xls.found && gasEx.xls.size === 23719 && gasEx.print.totalCalls === 2 && gasEx.errs.length === 0 &&
  cfEx.csv.found && cfEx.csv.size === 15539 && cfEx.xls.found && cfEx.xls.size === 23719 && cfEx.print.totalCalls === 2 && cfEx.errs.length === 0;

console.log('ALL EXPORT CHECKS OK: ' + allOk);
fs.writeFileSync(path.join(OUT, 'audit_exports.json'), JSON.stringify({ gas: gasEx, cf: cfEx, allOk }, null, 2));
console.log('WROTE verify_shots/audit/exports/audit_exports.json');
await browser.close();
