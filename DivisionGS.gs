var DIVISION_COLS = ['DivisionID','DivisionCode','DivisionName','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'];

function initDivisionSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Divisions';
  var sheet = ss.getSheetByName(sheetName);
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    isNew = true;
    Logger.log(sheetName + ' sheet created.');
  } else {
    Logger.log(sheetName + ' sheet already exists \u2014 not recreated.');
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasHeaders = data.length > 0 && data[0].join('').length > 0;
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, DIVISION_COLS.length).setValues([DIVISION_COLS]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + DIVISION_COLS.join(', '));
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    DIVISION_COLS.forEach(function(h) {
      if (existingHeaders.indexOf(h) === -1) {
        missingHeaders.push(h);
      }
    });
    if (missingHeaders.length > 0) {
      var startCol = existingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
      SpreadsheetApp.flush();
      Logger.log('Missing headers added: ' + missingHeaders.join(', '));
    } else {
      Logger.log('Headers already exist \u2014 none missing.');
    }
  }
  range = sheet.getDataRange();
  data = range.getValues();
  var existingRows = 0;
  for (var i = 1; i < data.length; i++) {
    var rowHasData = false;
    for (var c = 0; c < data[i].length; c++) {
      if (data[i][c] !== '' && data[i][c] !== null && data[i][c] !== undefined) {
        rowHasData = true;
        break;
      }
    }
    if (rowHasData) existingRows++;
  }
  if (existingRows > 0) {
    Logger.log('Sample data already exists (' + existingRows + ' records). Skipping insert.');
  } else {
    var now = new Date();
    var pad = function(n) { return ('0' + n).slice(-2); };
    var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    var sampleData = [
      ['DIV001', 'SPD', 'Spoke Division', 'Admin', ts, 'Admin', ts],
      ['DIV002', 'CCD', 'Control Cable Division', 'Admin', ts, 'Admin', ts]
    ];
    sheet.getRange(2, 1, sampleData.length, DIVISION_COLS.length).setValues(sampleData);
    SpreadsheetApp.flush();
    Logger.log('Sample Data Inserted');
  }

  if (isNew || existingRows === 0) {
    var sourceSheetName = 'Sections';
    var ss2 = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss2.getSheetByName(sourceSheetName)) {
      sourceSheetName = 'Departments';
    }
    if (ss2.getSheetByName(sourceSheetName)) {
      applySheetFormatting(sheet, sourceSheetName);
      Logger.log('Division sheet formatting cloned from ' + sourceSheetName);
    }
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var idCol = DIVISION_COLS.indexOf('DivisionID') + 1;
    if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var codeCol = DIVISION_COLS.indexOf('DivisionCode') + 1;
    if (codeCol > 0) sheet.getRange(2, codeCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var createdAtCol = DIVISION_COLS.indexOf('CreatedAt') + 1;
    if (createdAtCol > 0) sheet.getRange(2, createdAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
    var updatedAtCol = DIVISION_COLS.indexOf('UpdatedAt') + 1;
    if (updatedAtCol > 0) sheet.getRange(2, updatedAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  }

  SpreadsheetApp.flush();
  Logger.log('Division Sheet Updated');
  Logger.log('Division Master Completed');
  return { status: 'ok', message: sheetName + ' initialized with ' + (existingRows || 2) + ' records.', sheet: sheetName, columns: DIVISION_COLS.length, records: existingRows || 2 };
}

function initDivisionsSheet() {
  initDivisionSheet();
}

function normalizeDivision(d) {
  if (!d) return d;
  var out = {};
  DIVISION_COLS.forEach(function(c) { out[c] = d[c] || ''; });
  out.DivisionID = out.DivisionID || '';
  out.DivisionCode = out.DivisionCode || '';
  out.DivisionName = out.DivisionName || '';
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  return out;
}

function getDivisionList() {
  var data = getAllData(CONFIG.SHEET_NAMES.DIVISIONS) || [];
  return data.map(normalizeDivision);
}

function getDivision(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionID', id);
  return normalizeDivision(record);
}

function createDivision(data) {
  var errors = [];
  if (!data.DivisionName || data.DivisionName.toString().trim() === '') {
    errors.push('Division Name is required.');
  }
  if (!data.DivisionCode || data.DivisionCode.toString().trim() === '') {
    errors.push('Division Code is required.');
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var divName = data.DivisionName || '';
  var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionName', divName, 'Division Name');
  if (dupErr) throw new Error(dupErr);
  if (data.DivisionCode) {
    var codeErr = validateDuplicate(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionCode', data.DivisionCode, 'Division Code');
    if (codeErr) throw new Error(codeErr);
  }
  data.DivisionID = generateDivisionId();
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  data.UpdatedBy = data.CreatedBy;
  data.UpdatedAt = data.CreatedAt;
  var result = addRow(CONFIG.SHEET_NAMES.DIVISIONS, data);
  logActivity('Add Division', data.DivisionName);
  try { createAuditLog('Division', 'Create', data.DivisionID, data.DivisionName || '', '', 'Code: ' + (data.DivisionCode || ''), 'Success', 'Division created'); } catch(e) {}
  return result.map(normalizeDivision);
}

function modifyDivision(id, data) {
  var current = getDivision(id);
  if (!current) throw new Error('Division not found: ' + id);
  if (data.DivisionName) {
    var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionName', data.DivisionName, 'Division Name', current.DivisionName);
    if (dupErr) throw new Error(dupErr);
  }
  if (data.DivisionCode) {
    var codeErr = validateDuplicate(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionCode', data.DivisionCode, 'Division Code', current.DivisionCode);
    if (codeErr) throw new Error(codeErr);
  }
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionID', id, data);
  logActivity('Update Division', id);
  try { createAuditLog('Division', 'Update', id, current.DivisionName || '', '', JSON.stringify(data).substring(0, 150), 'Success', 'Division updated'); } catch(e) {}
  return result.map(normalizeDivision);
}

function removeDivision(id) {
  var current = getDivision(id);
  var result = deleteRow(CONFIG.SHEET_NAMES.DIVISIONS, 'DivisionID', id);
  logActivity('Delete Division', id);
  try { createAuditLog('Division', 'Delete', id, current ? current.DivisionName : '', '', 'Division deleted', 'Success', 'Division deleted'); } catch(e) {}
  return result.map(normalizeDivision);
}

function searchDivisions(query) {
  var result = searchData(CONFIG.SHEET_NAMES.DIVISIONS, query);
  return result.map(normalizeDivision);
}

function generateDivisionId() {
  var data = getAllData(CONFIG.SHEET_NAMES.DIVISIONS);
  var max = 0;
  for (var i = 0; i < data.length; i++) {
    var keys = Object.keys(data[i]);
    var id = keys.length > 0 ? data[i][keys[0]] : '';
    if (id) {
      var num = parseInt(String(id).replace('DIV', ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return 'DIV' + String(max + 1).padStart(3, '0');
}
