function initBreakdownTypesSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.BREAKDOWN_TYPES);
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(CONFIG.SHEET_NAMES.BREAKDOWN_TYPES);
  }
  ensureHeaders(sheet, CONFIG.BREAKDOWN_TYPE_FIELDS);
  var data = sheet.getDataRange().getValues();
  var hasData = data.length > 1;
  if (!hasData) {
    var sampleData = [
      ['BT001', 'Mechanical', 'Active'],
      ['BT002', 'Electrical', 'Active'],
      ['BT003', 'Instrumentation', 'Active'],
      ['BT004', 'Hydraulic', 'Active'],
      ['BT005', 'Pneumatic', 'Active'],
      ['BT006', 'Utility', 'Active'],
      ['BT007', 'Civil', 'Active'],
      ['BT008', 'Automation', 'Active'],
      ['BT009', 'Process', 'Active'],
      ['BT010', 'Other', 'Active']
    ];
    sheet.getRange(2, 1, sampleData.length, CONFIG.BREAKDOWN_TYPE_FIELDS.length).setValues(sampleData);
  }
  var headerRange = sheet.getRange(1, 1, 1, CONFIG.BREAKDOWN_TYPE_FIELDS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  for (var ci = 0; ci < CONFIG.BREAKDOWN_TYPE_FIELDS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  return { status: 'ok', message: CONFIG.SHEET_NAMES.BREAKDOWN_TYPES + ' initialized', sheet: CONFIG.SHEET_NAMES.BREAKDOWN_TYPES };
}

function normalizeBreakdownType(t) {
  if (!t) return t;
  var out = {};
  CONFIG.BREAKDOWN_TYPE_FIELDS.forEach(function(c) { out[c] = t[c] || ''; });
  out.TypeID = out.TypeID || '';
  out.TypeName = out.TypeName || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  return out;
}

function getBreakdownTypes() {
  var data = getAllData(CONFIG.SHEET_NAMES.BREAKDOWN_TYPES) || [];
  return data.map(normalizeBreakdownType);
}

function getActiveBreakdownTypes() {
  var all = getBreakdownTypes();
  return all.filter(function(t) { return t.Status === CONFIG.STATUS.ACTIVE; });
}

function getBreakdownTypeList() {
  return getBreakdownTypes();
}
