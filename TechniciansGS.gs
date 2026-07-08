var TECH_COLS = ['EmployeeID', 'TechnicianName', 'Skill', 'Shift', 'Status'];

function initTechnicianSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Technicians';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasHeaders = data.length > 0 && data[0].join('').length > 0;
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, TECH_COLS.length).setValues([TECH_COLS]);
    SpreadsheetApp.flush();
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    TECH_COLS.forEach(function(h) {
      if (existingHeaders.indexOf(h) === -1) {
        missingHeaders.push(h);
      }
    });
    if (missingHeaders.length > 0) {
      var startCol = existingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
      SpreadsheetApp.flush();
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
  if (existingRows === 0) {
    var sampleData = [
      ['EMP001', 'Rajesh Kumar', 'Mechanical', 'General', 'Active'],
      ['EMP002', 'Suresh Patel', 'Electrical', 'General', 'Active'],
      ['EMP003', 'Amit Singh', 'PLC', 'A', 'Active'],
      ['EMP004', 'Vikram Joshi', 'Hydraulic', 'B', 'Active'],
      ['EMP005', 'Ravi Verma', 'Pneumatic', 'C', 'Active'],
      ['EMP006', 'Deepak Yadav', 'Utility', 'General', 'Active'],
      ['EMP007', 'Anil Kumar', 'Instrumentation', 'General', 'Active'],
      ['EMP008', 'Manoj Singh', 'Mechanical', 'A', 'Active']
    ];
    sheet.getRange(2, 1, sampleData.length, TECH_COLS.length).setValues(sampleData);
    SpreadsheetApp.flush();
  }
  var headerRange = sheet.getRange(1, 1, 1, TECH_COLS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  range = sheet.getDataRange();
  var lastRow = sheet.getLastRow();
  var fullRange = sheet.getRange(1, 1, lastRow, TECH_COLS.length);
  fullRange.setBorder(true, true, true, true, true, true);
  if (lastRow > 1) {
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, TECH_COLS.length).setBackground(bg);
      sheet.setRowHeight(ri, 24);
    }
    var idCol = TECH_COLS.indexOf('EmployeeID') + 1;
    if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var statusCol = TECH_COLS.indexOf('Status') + 1;
    if (statusCol > 0) sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var shiftCol = TECH_COLS.indexOf('Shift') + 1;
    if (shiftCol > 0) sheet.getRange(2, shiftCol, lastRow - 1, 1).setHorizontalAlignment('center');
  }
  for (var ci = 0; ci < TECH_COLS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  return { status: 'ok', message: sheetName + ' initialized with ' + (existingRows || 8) + ' records.', sheet: sheetName, columns: TECH_COLS.length, records: existingRows || 8 };
}

function initTechniciansSheet() {
  initTechnicianSheet();
}

function normalizeTechnician(t) {
  if (!t) return t;
  var out = {};
  TECH_COLS.forEach(function(c) { out[c] = t[c] || ''; });
  out.EmployeeID = out.EmployeeID || '';
  out.TechnicianName = out.TechnicianName || '';
  out.Skill = out.Skill || '';
  out.Shift = out.Shift || 'General';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.Name = out.TechnicianName;
  out.TechnicianID = out.EmployeeID;
  return out;
}

function getTechnicianList() {
  var data = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];
  return data.map(normalizeTechnician);
}

function getTechnicians() {
  return getTechnicianList();
}

function getTechnician(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.TECHNICIANS, 'EmployeeID', id);
  return normalizeTechnician(record);
}

function createTechnician(data) {
  var errors = validateTechnicianData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var dupCheck = checkDuplicateField(CONFIG.SHEET_NAMES.TECHNICIANS, 'EmployeeID', data.EmployeeID);
  if (dupCheck) throw new Error('Employee ID "' + data.EmployeeID + '" already exists.');
  data.Status = data.Status || CONFIG.STATUS.ACTIVE;
  data.Shift = data.Shift || 'General';
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  data.UpdatedBy = data.CreatedBy;
  data.UpdatedAt = data.CreatedAt;
  var result = addRow(CONFIG.SHEET_NAMES.TECHNICIANS, data);
  logActivity('Add Technician', data.EmployeeID + ' - ' + data.TechnicianName);
  try { createAuditLog(CONFIG.AUDIT_MODULES.TECHNICIAN, CONFIG.AUDIT_ACTIONS.CREATE, data.EmployeeID, data.TechnicianName || '', '', 'Skill: ' + (data.Skill || ''), 'Success', 'Technician created'); } catch(e) {}
  return result.map(normalizeTechnician);
}

function addTechnician(data) {
  return createTechnician(data);
}

function modifyTechnician(id, data) {
  var current = getTechnician(id);
  if (!current) throw new Error('Technician not found: ' + id);
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.TECHNICIANS, 'EmployeeID', id, data);
  logActivity('Update Technician', id);
  try { createAuditLog(CONFIG.AUDIT_MODULES.TECHNICIAN, CONFIG.AUDIT_ACTIONS.UPDATE, id, current.TechnicianName || '', '', JSON.stringify(data).substring(0, 150), 'Success', 'Technician updated'); } catch(e) {}
  return result.map(normalizeTechnician);
}

function updateTechnician(id, data) {
  return modifyTechnician(id, data);
}

function removeTechnician(id) {
  var current = getTechnician(id);
  var result = deleteRow(CONFIG.SHEET_NAMES.TECHNICIANS, 'EmployeeID', id);
  logActivity('Delete Technician', id);
  try { createAuditLog(CONFIG.AUDIT_MODULES.TECHNICIAN, CONFIG.AUDIT_ACTIONS.DELETE, id, current ? current.TechnicianName : '', '', 'Technician deleted', 'Success', 'Technician deleted'); } catch(e) {}
  return result.map(normalizeTechnician);
}

function deleteTechnician(id) {
  return removeTechnician(id);
}

function searchTechnicians(query) {
  var result = searchData(CONFIG.SHEET_NAMES.TECHNICIANS, query);
  return result.map(normalizeTechnician);
}

function generateTechnicianId() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.TECHNICIANS);
  var data = sheet.getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var num = parseInt(String(data[i][0]).replace('EMP', ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return 'EMP' + String(max + 1).padStart(3, '0');
}

function getTechnicianDetails(id) {
  var tech = getTechnician(id);
  if (!tech) return null;
  return tech;
}
