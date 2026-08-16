var __sheetCache = {};
var __sheetCacheDirty = {};

function getSheet(name) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
  }
  return sheet;
}

function ensureHeaders(sheet, headers) {
  var range = sheet.getDataRange();
  var existing = range.getValues();
  var isCompletelyEmpty = function(row) {
    for (var ci = 0; ci < row.length; ci++) {
      if (row[ci] !== '' && row[ci] !== null && row[ci] !== undefined) return false;
    }
    return true;
  };
  if (existing.length === 0 || (existing.length === 1 && isCompletelyEmpty(existing[0]))) {
    sheet.appendRow(headers);
    SpreadsheetApp.flush();
    return;
  }
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
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    SpreadsheetApp.flush();
    return;
  }
  if (firstRowIndex > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    SpreadsheetApp.flush();
    return;
  }
}

function ensureSheetColumns(sheet, requiredHeaders) {
  try {
    var range = sheet.getDataRange();
    var data = range.getValues();
    if (data.length === 0) {
      sheet.appendRow(requiredHeaders);
      SpreadsheetApp.flush();
      return;
    }
    var currentHeaders = data[0] || [];
    var missingHeaders = [];
    requiredHeaders.forEach(function(h) {
      if (currentHeaders.indexOf(h) === -1) {
        missingHeaders.push(h);
      }
    });
    if (missingHeaders.length === 0) return;
    var startCol = currentHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    SpreadsheetApp.flush();
  } catch (e) {
    console.error('ensureSheetColumns(): ERROR=' + e.message);
  }
}

function invalidateCache(sheetName) {
  if (sheetName) {
    __sheetCache[sheetName] = null;
    __sheetCacheDirty[sheetName] = true;
  } else {
    __sheetCache = {};
    __sheetCacheDirty = {};
  }
}

function getAllData(sheetName) {
  try {
    if (!__sheetCacheDirty[sheetName] && __sheetCache[sheetName]) {
      return __sheetCache[sheetName];
    }
    var sheet = getSheet(sheetName);
    var range = sheet.getDataRange();
    var data = range.getValues();
    if (!data || data.length === 0) {
      __sheetCache[sheetName] = [];
      __sheetCacheDirty[sheetName] = false;
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
      __sheetCache[sheetName] = [];
      __sheetCacheDirty[sheetName] = false;
      return [];
    }
    var headers = data[headerRowIndex];
    var rows = [];
    for (var i = headerRowIndex + 1; i < data.length; i++) {
      var isEmptyRow = true;
      for (var c = 0; c < data[i].length; c++) {
        if (data[i][c] !== '' && data[i][c] !== null && data[i][c] !== undefined) {
          isEmptyRow = false;
          break;
        }
      }
      if (isEmptyRow) continue;
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
    __sheetCache[sheetName] = rows;
    __sheetCacheDirty[sheetName] = false;
    return rows;
  } catch (e) {
    console.error('getAllData("' + sheetName + '"): ERROR=' + e.message);
    return [];
  }
}

function getRowCount(sheetName) {
  var data = getAllData(sheetName);
  return data.length;
}

function sanitizeSheetValue(key, val) {
  return val;
}

function addRow(sheetName, data) {
  var sheet = getSheet(sheetName);
  var cached = getAllData(sheetName);
  var headers = (cached.length > 0) ? Object.keys(cached[0]) : sheet.getDataRange().getValues()[0];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var val = data[headers[i]];
    row.push(sanitizeSheetValue(headers[i], val) || '');
  }
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  invalidateCache(sheetName);
  var result = getAllData(sheetName);
  return result;
}

function updateRow(sheetName, idField, idValue, data) {
  var sheet = getSheet(sheetName);
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) return getAllData(sheetName);
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(idValue)) {
      var updates = [];
      for (var j = 0; j < headers.length; j++) {
        if (data.hasOwnProperty(headers[j])) {
          var val = data[headers[j]];
          updates.push({ row: r + 1, col: j + 1, val: val });
        }
      }
      if (updates.length === 1) {
        sheet.getRange(updates[0].row, updates[0].col).setValue(updates[0].val);
      } else if (updates.length > 1) {
        var rangeParts = updates.map(function(u) { return sheet.getRange(u.row, u.col); });
        var batch = sheet.getRange(updates[0].row, 1, 1, headers.length);
        var rowVals = values[r].slice();
        for (var u = 0; u < updates.length; u++) {
          rowVals[updates[u].col - 1] = updates[u].val;
        }
        batch.setValues([rowVals]);
      }
      break;
    }
  }
  invalidateCache(sheetName);
  return getAllData(sheetName);
}

function updateRowByIndex(sheetName, rowIndex, data) {
  var sheet = getSheet(sheetName);
  var cached = getAllData(sheetName);
  var headers = (cached.length > 0) ? Object.keys(cached[0]) : sheet.getDataRange().getValues()[0];
  var rawHeaders = sheet.getDataRange().getValues()[0];
  var rowVals = sheet.getRange(rowIndex + 1, 1, 1, rawHeaders.length).getValues()[0];
  for (var j = 0; j < rawHeaders.length; j++) {
    if (data.hasOwnProperty(rawHeaders[j])) {
      rowVals[j] = sanitizeSheetValue(rawHeaders[j], data[rawHeaders[j]]);
    }
  }
  sheet.getRange(rowIndex + 1, 1, 1, rawHeaders.length).setValues([rowVals]);
  invalidateCache(sheetName);
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
  invalidateCache(sheetName);
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
  var data = getAllData(sheetName);
  if (data.length === 0) return null;
  return data[0];
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
  invalidateCache(sheetName);
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
  var steps = [];
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
    invalidateCache(sheetName);
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
  var cached = getAllData(sheetName);
  var headers = (cached.length > 0) ? Object.keys(cached[0]) : sheet.getDataRange().getValues()[0];
  var rawHeaders = sheet.getDataRange().getValues()[0];
  var allRows = [];
  for (var i = 0; i < rows.length; i++) {
    var row = [];
    for (var j = 0; j < rawHeaders.length; j++) {
      row.push(sanitizeSheetValue(rawHeaders[j], rows[i][rawHeaders[j]]) || '');
    }
    allRows.push(row);
  }
  if (allRows.length > 0) {
    var lastRow = sheet.getLastRow();
    var startRow = lastRow + 1;
    sheet.getRange(startRow, 1, allRows.length, rawHeaders.length).setValues(allRows);
    SpreadsheetApp.flush();
  }
  invalidateCache(sheetName);
  return getAllData(sheetName);
}

function copyColumnFormat(sheet, sourceColIndex, targetColIndex) {
  if (!sheet || sourceColIndex < 1 || targetColIndex < 1 || sourceColIndex === targetColIndex) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;
  var sourceRange = sheet.getRange(1, sourceColIndex, lastRow, 1);
  var targetRange = sheet.getRange(1, targetColIndex, lastRow, 1);
  sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_VALIDATION, false);
  try {
    var srcDataValidation = sourceRange.getCell(1, 1).getDataValidation();
    if (srcDataValidation) targetRange.getCell(1, 1).setDataValidation(srcDataValidation);
  } catch(e) {}
  try {
    var srcNumFormat = sourceRange.getCell(1, 1).getNumberFormat();
    if (srcNumFormat) targetRange.setNumberFormat(srcNumFormat);
  } catch(e) {}
  try {
    var srcCondFormats = sheet.getConditionalFormatRules();
    if (srcCondFormats && srcCondFormats.length > 0) {
      var newRules = [];
      for (var ri = 0; ri < srcCondFormats.length; ri++) {
        var rule = srcCondFormats[ri];
        var ranges = rule.getRanges();
        var newRanges = [];
        for (var rri = 0; rri < ranges.length; rri++) {
          var rng = ranges[rri];
          if (rng.getColumn() === sourceColIndex) {
            newRanges.push(sheet.getRange(rng.getRow(), targetColIndex, rng.getNumRows(), 1));
            break;
          }
        }
        if (newRanges.length > 0) {
          try {
            var copiedRule = rule.copy().setRanges(newRanges).build();
            newRules.push(copiedRule);
          } catch(e) {}
        }
      }
      if (newRules.length > 0) {
        sheet.setConditionalFormatRules(sheet.getConditionalFormatRules().concat(newRules));
      }
    }
  } catch(e) {}
  for (var r = 1; r <= lastRow; r++) {
    try {
      sheet.setRowHeight(r, sheet.getRowHeight(r));
    } catch(e) {}
  }
  SpreadsheetApp.flush();
}

function applySheetFormatting(targetSheet, sourceSheetName) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sourceSheet = ss.getSheetByName(sourceSheetName);
  if (!sourceSheet || !targetSheet) return;
  var sourceLastRow = sourceSheet.getLastRow();
  var sourceLastCol = sourceSheet.getLastColumn();
  var targetLastRow = targetSheet.getLastRow();
  var targetLastCol = targetSheet.getLastColumn();
  if (targetLastCol < 1) return;
  var copyCols = Math.min(sourceLastCol, targetLastCol);
  if (sourceLastRow > 0 && copyCols > 0) {
    var srcHeader = sourceSheet.getRange(1, 1, 1, copyCols);
    var tgtHeader = targetSheet.getRange(1, 1, 1, copyCols);
    srcHeader.copyTo(tgtHeader, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    if (sourceLastRow >= 2 && targetLastRow >= 2) {
      var copyDataRows = Math.min(sourceLastRow - 1, targetLastRow - 1, 2);
      if (copyDataRows > 0) {
        var srcData = sourceSheet.getRange(2, 1, copyDataRows, copyCols);
        var tgtData = targetSheet.getRange(2, 1, Math.min(copyDataRows * 10, targetLastRow - 1), copyCols);
        srcData.copyTo(tgtData, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      }
    }
  }
  targetSheet.setFrozenRows(sourceSheet.getFrozenRows());
  targetSheet.setFrozenColumns(0);
  if (targetLastCol > 0) {
    for (var c = 1; c <= targetLastCol; c++) {
      var srcCol = Math.min(c, sourceLastCol);
      targetSheet.setColumnWidth(c, sourceSheet.getColumnWidth(srcCol));
    }
  }
  if (targetLastRow > 0) {
    for (var r = 1; r <= targetLastRow; r++) {
      var srcRow = Math.min(r, sourceLastRow);
      targetSheet.setRowHeight(r, sourceSheet.getRowHeight(srcRow));
    }
  }
  try {
    var srcFilter = sourceSheet.getFilter();
    if (!targetSheet.getFilter() && srcFilter) {
      targetSheet.getRange(1, 1, targetLastRow, targetLastCol).createFilter();
    }
  } catch(e) {}
  try {
    var srcCondFormats = sourceSheet.getConditionalFormatRules();
    if (srcCondFormats && srcCondFormats.length > 0) {
      targetSheet.setConditionalFormatRules(srcCondFormats);
    }
  } catch(e) {}
  try {
    var srcProtections = sourceSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    for (var p = 0; p < srcProtections.length; p++) {
      try {
        var srcRange = srcProtections[p].getRange();
        var tgtProt = targetSheet.getRange(srcRange.getRow(), 1, srcRange.getNumRows(), targetLastCol).protect();
        tgtProt.setDescription(srcProtections[p].getDescription());
        var editors = srcProtections[p].getEditors();
        if (editors && editors.length > 0) {
          tgtProt.addEditors(editors);
          tgtProt.removeEditors(tgtProt.getEditors());
          tgtProt.addEditors(editors);
        }
      } catch(e) {}
    }
  } catch(e) {}
  SpreadsheetApp.flush();
}
