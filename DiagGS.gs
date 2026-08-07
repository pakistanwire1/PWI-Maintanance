function __diagLoad() {
  try {
    var raw = CacheService.getScriptCache().get('cmms_diag');
    if (!raw) return { t0: Date.now(), marks: [], includes: [] };
    return JSON.parse(raw);
  } catch (e) { return { t0: Date.now(), marks: [], includes: [] }; }
}

function __diagSave(d) {
  try { CacheService.getScriptCache().put('cmms_diag', JSON.stringify(d), 300); } catch (e) {}
}

function __diagReset() {
  __diagSave({ t0: Date.now(), marks: [], includes: [] });
}

function __diagMark(label) {
  var d = __diagLoad();
  d.marks.push({ label: label, t: Date.now() - d.t0 });
  __diagSave(d);
}

function __diagInclude(filename, elapsedMs) {
  var d = __diagLoad();
  d.includes.push({ file: filename, ms: Math.round(elapsedMs) });
  __diagSave(d);
}

function getDiagTimings() {
  return __diagLoad();
}

function diagSheetDims() {
  var out = [];
  Object.keys(CONFIG.SHEET_NAMES).forEach(function(k) {
    try {
      var s = getSheet(CONFIG.SHEET_NAMES[k]);
      out.push({ key: k, name: CONFIG.SHEET_NAMES[k], lastRow: s.getLastRow(), lastCol: s.getLastColumn(), gridRow: s.getMaxRows(), gridCol: s.getMaxColumns() });
    } catch (e) { out.push({ key: k, name: CONFIG.SHEET_NAMES[k], err: e.message }); }
  });
  return out;
}
