var SECTION_COLS = ['SectionID','Section','Description','Status','CreatedBy','CreatedAt','SundayOff','HoursPerDay','SectionCode','DepartmentCount','UpdatedBy','UpdatedAt'];

function initSectionSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Sections';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(sheetName + ' sheet created.');
  } else {
    Logger.log(sheetName + ' sheet already exists \u2014 not recreated.');
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasHeaders = data.length > 0 && data[0].join('').length > 0;
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, SECTION_COLS.length).setValues([SECTION_COLS]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + SECTION_COLS.join(', '));
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    SECTION_COLS.forEach(function(h) {
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
      ['SEC001', 'Admin', 'Administration', 'Active', 'Admin', ts, 'Sunday', '8', 'ADM', '1', 'Admin', ts],
      ['SEC002', 'Spoke', 'Spoke Production', 'Active', 'Admin', ts, 'Sunday', '8', 'SPK', '1', 'Admin', ts],
      ['SEC003', 'Auto Plating Line', 'Auto Plating', 'Active', 'Admin', ts, 'Sunday', '8', 'APL', '1', 'Admin', ts],
      ['SEC004', 'Nipple', 'Nipple Production', 'Active', 'Admin', ts, 'Sunday', '8', 'NPL', '1', 'Admin', ts],
      ['SEC005', 'Spoke Packing', 'Packing', 'Active', 'Admin', ts, 'Sunday', '8', 'SPP', '1', 'Admin', ts],
      ['SEC006', 'Spiral', 'Spiral Line', 'Active', 'Admin', ts, 'Sunday', '8', 'SPR', '1', 'Admin', ts],
      ['SEC007', 'PVC', 'PVC Line', 'Active', 'Admin', ts, 'Sunday', '8', 'PVC', '1', 'Admin', ts],
      ['SEC008', 'Maintenance', 'Maintenance Department', 'Active', 'Admin', ts, 'Sunday', '8', 'MNT', '1', 'Admin', ts]
    ];
    sheet.getRange(2, 1, sampleData.length, SECTION_COLS.length).setValues(sampleData);
    SpreadsheetApp.flush();
    Logger.log('Sample Data Inserted');
  }
  Logger.log('Headers Updated');

  var headerRange = sheet.getRange(1, 1, 1, SECTION_COLS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  range = sheet.getDataRange();
  var lastRow = sheet.getLastRow();
  var fullRange = sheet.getRange(1, 1, lastRow, SECTION_COLS.length);
  fullRange.setBorder(true, true, true, true, true, true);

  if (lastRow > 1) {
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, SECTION_COLS.length).setBackground(bg);
      sheet.setRowHeight(ri, 24);
    }
    var idCol = SECTION_COLS.indexOf('SectionID') + 1;
    if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var statusCol = SECTION_COLS.indexOf('Status') + 1;
    if (statusCol > 0) sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var sunCol = SECTION_COLS.indexOf('SundayOff') + 1;
    if (sunCol > 0) sheet.getRange(2, sunCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var hrsCol = SECTION_COLS.indexOf('HoursPerDay') + 1;
    if (hrsCol > 0) sheet.getRange(2, hrsCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var createdAtCol = SECTION_COLS.indexOf('CreatedAt') + 1;
    if (createdAtCol > 0) sheet.getRange(2, createdAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
    var updatedAtCol = SECTION_COLS.indexOf('UpdatedAt') + 1;
    if (updatedAtCol > 0) sheet.getRange(2, updatedAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  }

  for (var ci = 0; ci < SECTION_COLS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  Logger.log('Formatting Applied');
  Logger.log('Section Sheet Updated');
  Logger.log('Section Master Completed');
  return { status: 'ok', message: sheetName + ' initialized with ' + (existingRows || 8) + ' records.', sheet: sheetName, columns: SECTION_COLS.length, records: existingRows || 8 };
}

function initSectionsSheet() {
  initSectionSheet();
}

function normalizeSection(s) {
  if (!s) return s;
  var out = {};
  SECTION_COLS.forEach(function(c) { out[c] = s[c] || ''; });
  out.SectionID = out.SectionID || '';
  out.Section = out.Section || '';
  out.Description = out.Description || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.SundayOff = out.SundayOff || 'Sunday';
  out.HoursPerDay = out.HoursPerDay || '8';
  out.SectionCode = out.SectionCode || '';
  out.DepartmentCount = out.DepartmentCount || '0';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  return out;
}

function getSectionList() {
  var data = getAllData(CONFIG.SHEET_NAMES.SECTIONS) || [];
  return data.map(normalizeSection);
}

function getSection(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.SECTIONS, 'SectionID', id);
  return normalizeSection(record);
}

function createSection(data) {
  var errors = validateSectionData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var secName = data.Section || '';
  var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.SECTIONS, 'Section', secName, 'Section Name');
  if (dupErr) throw new Error(dupErr);
  if (data.SectionCode) {
    var codeErr = validateDuplicate(CONFIG.SHEET_NAMES.SECTIONS, 'SectionCode', data.SectionCode, 'Section Code');
    if (codeErr) throw new Error(codeErr);
  }
  data.SectionID = generateSectionId();
  data.Status = data.Status || CONFIG.STATUS.ACTIVE;
  data.SundayOff = data.SundayOff || 'Sunday';
  data.HoursPerDay = data.HoursPerDay || '8';
  data.DepartmentCount = data.DepartmentCount || '0';
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  data.UpdatedBy = data.CreatedBy;
  data.UpdatedAt = data.CreatedAt;
  var result = addRow(CONFIG.SHEET_NAMES.SECTIONS, data);
  logActivity('Add Section', data.Section);
  return result.map(normalizeSection);
}

function modifySection(id, data) {
  var current = getSection(id);
  if (!current) throw new Error('Section not found: ' + id);
  if (data.Section) {
    var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.SECTIONS, 'Section', data.Section, 'Section Name', current.Section);
    if (dupErr) throw new Error(dupErr);
  }
  if (data.SectionCode) {
    var codeErr = validateDuplicate(CONFIG.SHEET_NAMES.SECTIONS, 'SectionCode', data.SectionCode, 'Section Code', current.SectionCode);
    if (codeErr) throw new Error(codeErr);
  }
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.SECTIONS, 'SectionID', id, data);
  logActivity('Update Section', id);
  return result.map(normalizeSection);
}

function removeSection(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.SECTIONS, 'SectionID', id);
  logActivity('Delete Section', id);
  return result.map(normalizeSection);
}

function searchSections(query) {
  var result = searchData(CONFIG.SHEET_NAMES.SECTIONS, query);
  return result.map(normalizeSection);
}

function generateSectionId() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.SECTIONS);
  var data = sheet.getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var num = parseInt(String(data[i][0]).replace('SEC', ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return 'SEC' + String(max + 1).padStart(3, '0');
}
