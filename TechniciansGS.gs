var TECH_COLS = ['EmployeeID','EmployeeCode','TechnicianName','Designation','Department','Section','Skill','Shift','Mobile','Email','JoiningDate','Status','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'];

function initTechnicianSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Technicians';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(sheetName + ' sheet created.');
  } else {
    Logger.log(sheetName + ' sheet already exists - not recreated.');
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasHeaders = data.length > 0 && data[0].join('').length > 0;
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, TECH_COLS.length).setValues([TECH_COLS]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + TECH_COLS.join(', '));
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
      Logger.log('Missing headers added: ' + missingHeaders.join(', '));
    } else {
      Logger.log('Headers already exist - none missing.');
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
      ['EMP001','TECH-001','Rajesh Kumar','Senior Technician','Facility Maintenance','Maintenance','Mechanical','General','9876543210','rajesh@cmms.com','2024-01-15','Active','Admin',ts,'Admin',ts],
      ['EMP002','TECH-002','Suresh Patel','Technician','Facility Maintenance','Maintenance','Electrical','General','9876543211','suresh@cmms.com','2024-02-01','Active','Admin',ts,'Admin',ts],
      ['EMP003','TECH-003','Amit Singh','Junior Technician','Facility Maintenance','Maintenance','PLC','A','9876543212','amit@cmms.com','2024-03-10','Active','Admin',ts,'Admin',ts],
      ['EMP004','TECH-004','Vikram Joshi','Technician','Facility Maintenance','Maintenance','Hydraulic','B','9876543213','vikram@cmms.com','2024-04-20','Active','Admin',ts,'Admin',ts],
      ['EMP005','TECH-005','Ravi Verma','Senior Technician','Facility Maintenance','Maintenance','Pneumatic','C','9876543214','ravi@cmms.com','2024-05-05','Active','Admin',ts,'Admin',ts],
      ['EMP006','TECH-006','Deepak Yadav','Technician','Facility Maintenance','Maintenance','Utility','General','9876543215','deepak@cmms.com','2024-06-15','Active','Admin',ts,'Admin',ts],
      ['EMP007','TECH-007','Anil Kumar','Instrument Technician','Facility Maintenance','Maintenance','Instrumentation','General','9876543216','anil@cmms.com','2024-07-01','Active','Admin',ts,'Admin',ts],
      ['EMP008','TECH-008','Manoj Singh','Trainee','Facility Maintenance','Maintenance','Mechanical','A','9876543217','manoj@cmms.com','2024-08-10','Active','Admin',ts,'Admin',ts]
    ];
    sheet.getRange(2, 1, sampleData.length, TECH_COLS.length).setValues(sampleData);
    SpreadsheetApp.flush();
    Logger.log('Sample Data Inserted');
  }
  Logger.log('Headers Updated');

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
    var createdAtCol = TECH_COLS.indexOf('CreatedAt') + 1;
    if (createdAtCol > 0) sheet.getRange(2, createdAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
    var updatedAtCol = TECH_COLS.indexOf('UpdatedAt') + 1;
    if (updatedAtCol > 0) sheet.getRange(2, updatedAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  }

  for (var ci = 0; ci < TECH_COLS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  Logger.log('Formatting Applied');
  Logger.log('Technician Sheet Updated');
  Logger.log('Technician Master Completed');
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
  out.EmployeeCode = out.EmployeeCode || '';
  out.TechnicianName = out.TechnicianName || '';
  out.Designation = out.Designation || '';
  out.Department = out.Department || '';
  out.Section = out.Section || '';
  out.Skill = out.Skill || '';
  out.Shift = out.Shift || 'General';
  out.Mobile = out.Mobile || '';
  out.Email = out.Email || '';
  out.JoiningDate = out.JoiningDate || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  out.Name = out.TechnicianName;
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

  if (data.EmployeeCode) {
    var codeCheck = checkDuplicateField(CONFIG.SHEET_NAMES.TECHNICIANS, 'EmployeeCode', data.EmployeeCode);
    if (codeCheck) throw new Error('Employee Code "' + data.EmployeeCode + '" already exists.');
  }

  data.Status = data.Status || CONFIG.STATUS.ACTIVE;
  data.Shift = data.Shift || 'General';
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  data.UpdatedBy = data.CreatedBy;
  data.UpdatedAt = data.CreatedAt;
  var result = addRow(CONFIG.SHEET_NAMES.TECHNICIANS, data);
  logActivity('Add Technician', data.EmployeeID + ' - ' + data.TechnicianName);
  try { createAuditLog(CONFIG.AUDIT_MODULES.TECHNICIAN, CONFIG.AUDIT_ACTIONS.CREATE, data.EmployeeID, data.TechnicianName || '', '', 'Skill: ' + (data.Skill || '') + ', Dept: ' + (data.Department || ''), 'Success', 'Technician created'); } catch(e) {}
  return result.map(normalizeTechnician);
}

function addTechnician(data) {
  return createTechnician(data);
}

function modifyTechnician(id, data) {
  var current = getTechnician(id);
  if (!current) throw new Error('Technician not found: ' + id);

  if (data.EmployeeCode) {
    var codeCheck = checkDuplicateField(CONFIG.SHEET_NAMES.TECHNICIANS, 'EmployeeCode', data.EmployeeCode, current.EmployeeCode);
    if (codeCheck) throw new Error('Employee Code "' + data.EmployeeCode + '" already exists.');
  }

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
