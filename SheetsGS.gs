function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    Logger.log('getSheet(): sheet "' + name + '" NOT FOUND - creating new one');
    console.log('getSheet(): sheet "' + name + '" NOT FOUND - creating new one');
    try {
      sheet = ss.insertSheet(name);
      Logger.log('getSheet(): created new sheet "' + name + '"');
      console.log('getSheet(): created new sheet "' + name + '"');
    } catch (e) {
      Logger.log('getSheet(): insertSheet error: ' + e.message);
      console.log('getSheet(): insertSheet error: ' + e.message);
      sheet = ss.getSheetByName(name);
      if (!sheet) throw new Error('Cannot create sheet: ' + name);
    }
  } else {
    Logger.log('getSheet(): found existing sheet "' + name + '"');
    console.log('getSheet(): found existing sheet "' + name + '"');
  }
  return sheet;
}

function ensureHeaders(sheet, headers) {
  var range = sheet.getDataRange();
  var existing = range.getValues();
  Logger.log('ensureHeaders(): sheet="' + sheet.getName() + '", dataRange=' + range.getA1Notation() + ', rows=' + existing.length + ', cols=' + (existing.length > 0 ? existing[0].length : 0));
  console.log('ensureHeaders(): sheet="' + sheet.getName() + '", rows=' + existing.length);
  var isCompletelyEmpty = function(row) {
    for (var ci = 0; ci < row.length; ci++) {
      if (row[ci] !== '' && row[ci] !== null && row[ci] !== undefined) return false;
    }
    return true;
  };
  if (existing.length === 0 || (existing.length === 1 && isCompletelyEmpty(existing[0]))) {
    // Empty sheet — append headers
    sheet.appendRow(headers);
    SpreadsheetApp.flush();
    Logger.log('ensureHeaders(): EMPTY sheet, appended headers: ' + headers.join(','));
    console.log('ensureHeaders(): EMPTY sheet, appended headers');
    return;
  }
  // Find first non-empty row
  var firstRowIndex = -1;
  for (var r = 0; r < existing.length; r++) {
    for (var c = 0; c < existing[r].length; c++) {
      if (existing[r][c] !== '' && existing[r][c] !== null && existing[r][c] !== undefined) {
        firstRowIndex = r;
        break;
      }
    }
    if (firstRowIndex >= 0) break;
  }
  if (firstRowIndex < 0) {
    // All rows blank — write headers to row 1
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    SpreadsheetApp.flush();
    Logger.log('ensureHeaders(): all rows blank, set headers row 1');
    console.log('ensureHeaders(): all rows blank, set headers');
    return;
  }
  if (firstRowIndex > 0) {
    // Leading blank rows exist — write headers to the first row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    SpreadsheetApp.flush();
    Logger.log('ensureHeaders(): LEADING BLANK ROWS, wrote headers to row 1 (first data row was ' + (firstRowIndex + 1) + ')');
    console.log('ensureHeaders(): leading blank rows, headers written to row 1');
    return;
  }
  // firstRowIndex === 0: First row has content — log it and assume headers
  Logger.log('ensureHeaders(): first row HAS CONTENT (first cell="' + String(existing[0][0]).substring(0, 30) + '"), assuming headers exist, skipping');
  console.log('ensureHeaders(): first row has content "' + String(existing[0][0]).substring(0, 30) + '...", assuming headers OK');
}

function ensureSheetColumns(sheet, requiredHeaders) {
  Logger.log('ensureSheetColumns() called: sheet="' + sheet.getName() + '", requiredHeaders=' + JSON.stringify(requiredHeaders));
  console.log('ensureSheetColumns() called: sheet="' + sheet.getName() + '", requiredHeaders=' + JSON.stringify(requiredHeaders));
  try {
    var range = sheet.getDataRange();
    var data = range.getValues();
    if (data.length === 0) {
      Logger.log('ensureSheetColumns(): sheet is empty, appending headers');
      console.log('ensureSheetColumns(): sheet is empty, appending headers');
      sheet.appendRow(requiredHeaders);
      SpreadsheetApp.flush();
      return;
    }
    var currentHeaders = data[0] || [];
    Logger.log('ensureSheetColumns(): currentHeaders=' + JSON.stringify(currentHeaders));
    console.log('ensureSheetColumns(): currentHeaders=' + JSON.stringify(currentHeaders));
    var missingHeaders = [];
    requiredHeaders.forEach(function(h) {
      if (currentHeaders.indexOf(h) === -1) {
        missingHeaders.push(h);
      }
    });
    if (missingHeaders.length === 0) {
      Logger.log('ensureSheetColumns(): No missing headers, all required columns exist');
      console.log('ensureSheetColumns(): No missing headers');
      return;
    }
    Logger.log('ensureSheetColumns(): MISSING headers=' + JSON.stringify(missingHeaders));
    console.log('ensureSheetColumns(): MISSING headers=' + JSON.stringify(missingHeaders));
    var startCol = currentHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    SpreadsheetApp.flush();
    Logger.log('ensureSheetColumns(): Added ' + missingHeaders.length + ' columns starting at col ' + startCol);
    console.log('ensureSheetColumns(): Added ' + missingHeaders.length + ' columns');
  } catch (e) {
    Logger.log('ensureSheetColumns(): ERROR=' + e.message + ' stack=' + e.stack);
    console.log('ensureSheetColumns(): ERROR=' + e.message);
  }
}

function getAllData(sheetName) {
  try {
    SpreadsheetApp.flush();
    var sheet = getSheet(sheetName);
    var range = sheet.getDataRange();
    var data = range.getValues();
    Logger.log('getAllData("' + sheetName + '"): sheet="' + sheet.getName() + '", totalRows=' + data.length + ', typeof=' + typeof data + ', isArray=' + Array.isArray(data));
    console.log('getAllData("' + sheetName + '"): totalRows=' + data.length);
    if (!data || data.length === 0) {
      Logger.log('getAllData("' + sheetName + '"): returning [] - no data at all');
      console.log('getAllData("' + sheetName + '"): returning [] - no data');
      return [];
    }
    var headerRowIndex = -1;
    for (var r = 0; r < data.length; r++) {
      for (var c = 0; c < data[r].length; c++) {
        if (data[r][c] !== '' && data[r][c] !== null && data[r][c] !== undefined) {
          headerRowIndex = r;
          break;
        }
      }
      if (headerRowIndex >= 0) break;
    }
    if (headerRowIndex < 0) {
      Logger.log('getAllData("' + sheetName + '"): returning [] - no non-empty rows found');
      console.log('getAllData("' + sheetName + '"): returning [] - all rows empty');
      return [];
    }
    var headers = data[headerRowIndex];
    Logger.log('getAllData("' + sheetName + '"): headerRow=' + headerRowIndex + ', headerCount=' + headers.length + ', headers=' + JSON.stringify(headers));
    console.log('getAllData("' + sheetName + '"): headers=' + JSON.stringify(headers));
    var rows = [];
    for (var i = headerRowIndex + 1; i < data.length; i++) {
      var isEmptyRow = true;
      for (var c = 0; c < data[i].length; c++) {
        if (data[i][c] !== '' && data[i][c] !== null && data[i][c] !== undefined) {
          isEmptyRow = false;
          break;
        }
      }
      if (isEmptyRow) {
        Logger.log('getAllData("' + sheetName + '"): skipping empty row ' + i);
        continue;
      }
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j];
        if (h !== '' && h !== null && h !== undefined) {
          var val = data[i][j];
          if (val instanceof Date) {
            val = val.toISOString();
          }
          row[h] = val;
        }
      }
      rows.push(row);
    }
    Logger.log('getAllData("' + sheetName + '"): RETURNING ' + rows.length + ' records');
    console.log('getAllData("' + sheetName + '"): RETURNING ' + rows.length + ' records');
    if (rows.length > 0) {
      Logger.log('getAllData("' + sheetName + '"): first record keys=' + Object.keys(rows[0]).join(','));
      console.log('getAllData("' + sheetName + '"): first record=' + JSON.stringify(rows[0]));
    }
    return rows;
  } catch (e) {
    Logger.log('getAllData("' + sheetName + '"): ERROR=' + e.message + ' stack=' + e.stack);
    console.log('getAllData("' + sheetName + '"): ERROR=' + e.message);
    return [];
  }
}

function getRowCount(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  return data.length > 1 ? data.length - 1 : 0;
}

function addRow(sheetName, data) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getDataRange().getValues()[0];
  Logger.log('addRow(' + sheetName + '): headers=' + JSON.stringify(headers) + ', data keys=' + Object.keys(data).join(','));
  console.log('addRow(' + sheetName + '): headers=' + JSON.stringify(headers) + ', data keys=' + Object.keys(data).join(','));
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(data[headers[i]] || '');
  }
  Logger.log('addRow(' + sheetName + '): appending row=' + JSON.stringify(row));
  console.log('addRow(' + sheetName + '): appending row=' + JSON.stringify(row));
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  Logger.log('addRow(' + sheetName + '): after flush, reading back...');
  console.log('addRow(' + sheetName + '): after flush, reading back...');
  var result = getAllData(sheetName);
  Logger.log('addRow(' + sheetName + '): after write, getAllData returns ' + result.length + ' records');
  console.log('addRow(' + sheetName + '): after write, getAllData returns ' + result.length + ' records');
  return result;
}

function updateRow(sheetName, idField, idValue, data) {
  var sheet = getSheet(sheetName);
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) return getAllData(sheetName);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(idValue)) {
      for (var j = 0; j < headers.length; j++) {
        if (data.hasOwnProperty(headers[j])) {
          sheet.getRange(i + 1, j + 1).setValue(data[headers[j]]);
        }
      }
      break;
    }
  }
  return getAllData(sheetName);
}

function updateRowByIndex(sheetName, rowIndex, data) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getDataRange().getValues()[0];
  for (var j = 0; j < headers.length; j++) {
    if (data.hasOwnProperty(headers[j])) {
      sheet.getRange(rowIndex + 1, j + 1).setValue(data[headers[j]]);
    }
  }
  return getAllData(sheetName);
}

function deleteRow(sheetName, idField, idValue) {
  var sheet = getSheet(sheetName);
  var range = sheet.getDataRange();
  var values = range.getValues();
  var idCol = values[0].indexOf(idField);
  if (idCol === -1) return getAllData(sheetName);
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idCol]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getAllData(sheetName);
}

function searchData(sheetName, query) {
  var data = getAllData(sheetName);
  if (!query || query.trim() === '') return data;
  var q = query.toLowerCase();
  return data.filter(function(row) {
    var keys = Object.keys(row);
    for (var i = 0; i < keys.length; i++) {
      if (String(row[keys[i]]).toLowerCase().indexOf(q) !== -1) {
        return true;
      }
    }
    return false;
  });
}

function getFirstRow(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var row = {};
  for (var j = 0; j < headers.length; j++) {
    if (headers[j]) {
      var val = data[1][j];
      if (val instanceof Date) val = val.toISOString();
      row[headers[j]] = val;
    }
  }
  return row;
}

function getRecordById(sheetName, idField, idValue) {
  var data = getAllData(sheetName);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][idField]) === String(idValue)) {
      return data[i];
    }
  }
  return null;
}

function clearSheet(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) {
    sheet.deleteRows(2, data.length - 1);
  }
}

function sanitizeValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function testPipeline(sheetName) {
  Logger.log('=== PIPELINE TEST === Testing sheet: "' + sheetName + '"');
  console.log('=== PIPELINE TEST === Testing sheet: "' + sheetName + '"');
  var steps = [];
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var actualSheetNames = ss.getSheets().map(function(s) { return s.getName(); });
    steps.push({ step: 'Check sheet exists', detail: 'Looking for "' + sheetName + '" in [' + actualSheetNames.join(',') + ']' });
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      steps.push({ step: 'getSheetByName', detail: 'NOT FOUND - creating', error: true });
      sheet = ss.insertSheet(sheetName);
    } else {
      steps.push({ step: 'getSheetByName', detail: 'FOUND' });
    }
    SpreadsheetApp.flush();
    var range = sheet.getDataRange();
    steps.push({ step: 'getDataRange', detail: range.getA1Notation() });
    var data = range.getValues();
    var rows = data.length;
    var cols = rows > 0 ? data[0].length : 0;
    steps.push({ step: 'getValues', detail: rows + ' rows x ' + cols + ' cols' });
    if (rows > 0) {
      var row0 = [];
      for (var ci = 0; ci < data[0].length; ci++) {
        row0.push(String(data[0][ci]).substring(0, 20));
      }
      steps.push({ step: 'Row 0 values', detail: '[' + row0.join(',') + ']' });
      if (rows > 1) {
        var row1 = [];
        for (var ci = 0; ci < data[1].length; ci++) {
          var v = data[1][ci];
          row1.push(String(v).substring(0, 20) + (v instanceof Date ? '(Date)' : '(' + typeof v + ')'));
        }
        steps.push({ step: 'Row 1 values (with types)', detail: '[' + row1.join(',') + ']' });
      }
    }
    var result = getAllData(sheetName);
    steps.push({ step: 'getAllData() result', detail: 'Array=' + Array.isArray(result) + ', length=' + result.length });
    if (result && result.length > 0) {
      steps.push({ step: 'First record keys', detail: Object.keys(result[0]).join(',') });
      steps.push({ step: 'First record JSON', detail: JSON.stringify(result[0]).substring(0, 500) });
    }
  } catch (e) {
    steps.push({ step: 'ERROR', detail: e.message, error: true });
  }
  steps.push({ step: 'END', detail: '=== PIPELINE TEST END ===' });
  Logger.log(JSON.stringify(steps));
  console.log('=== PIPELINE TEST COMPLETE === ' + sheetName);
  return steps;
}

function testAllPipelines() {
  var names = [CONFIG.SHEET_NAMES.USERS, CONFIG.SHEET_NAMES.MACHINES, CONFIG.SHEET_NAMES.ASSETS,
               CONFIG.SHEET_NAMES.DEPARTMENTS, CONFIG.SHEET_NAMES.TECHNICIANS, CONFIG.SHEET_NAMES.JOBCARDS,
               CONFIG.SHEET_NAMES.CHECKLISTS, CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES,
               CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, CONFIG.SHEET_NAMES.SPARE_PARTS,
               CONFIG.SHEET_NAMES.SETTINGS];
  var allResults = {};
  for (var i = 0; i < names.length; i++) {
    allResults[names[i]] = testPipeline(names[i]);
  }
  return allResults;
}

function appendRows(sheetName, rows) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getDataRange().getValues()[0];
  for (var i = 0; i < rows.length; i++) {
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      row.push(rows[i][headers[j]] || '');
    }
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    Logger.log('appendRows(' + sheetName + '): after flush, reading back...');
    console.log('appendRows(' + sheetName + '): after flush, reading back...');
  }
  return getAllData(sheetName);
}
