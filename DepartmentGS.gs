var DEPT_COLS = ['DepartmentID','Department','DepartmentCode','SectionID','Section','DepartmentHead','Description','SundayOff','HoursPerDay','Status','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'];

function initDepartmentSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Departments';
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
    sheet.getRange(1, 1, 1, DEPT_COLS.length).setValues([DEPT_COLS]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + DEPT_COLS.join(', '));
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    DEPT_COLS.forEach(function(h) {
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
    return { status: 'ok', message: sheetName + ' already has ' + existingRows + ' records. No duplicates inserted.', sheet: sheetName, columns: DEPT_COLS.length, records: existingRows };
  }
  var now = new Date();
  var pad = function(n) { return ('0' + n).slice(-2); };
  var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  var sampleData = [
    ['DEPT001','Admin','ADM','SEC001','Admin','Admin Head','Administration Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT002','Spoke Production','SPR','SEC002','Spoke','Spoke Manager','Spoke Production Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT003','Plating Line','PLT','SEC003','Auto Plating Line','Plating Supervisor','Auto Plating Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT004','Nipple Production','NPL','SEC004','Nipple','Nipple Manager','Nipple Production Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT005','Packing','PCK','SEC005','Spoke Packing','Packing Supervisor','Packing Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT006','Spiral Production','SPL','SEC006','Spiral','Spiral Manager','Spiral Production Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT007','PVC Production','PVC','SEC007','PVC','PVC Manager','PVC Production Department','Sunday','8','Active','Admin',ts,'Admin',ts],
    ['DEPT008','Facility Maintenance','MNT','SEC008','Maintenance','Maintenance Head','Facility Maintenance Department','Sunday','8','Active','Admin',ts,'Admin',ts]
  ];
  sheet.getRange(2, 1, sampleData.length, DEPT_COLS.length).setValues(sampleData);
  SpreadsheetApp.flush();
  Logger.log('Sample data written to sheet.');

  var headerRange = sheet.getRange(1, 1, 1, DEPT_COLS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  var lastRow = sheet.getLastRow();
  var fullRange = sheet.getRange(1, 1, lastRow, DEPT_COLS.length);
  fullRange.setBorder(true, true, true, true, true, true);

  if (lastRow > 1) {
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, DEPT_COLS.length).setBackground(bg);
    }
    var idCol = DEPT_COLS.indexOf('DepartmentID') + 1;
    if (idCol > 0) {
      sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    }
    var statusCol = DEPT_COLS.indexOf('Status') + 1;
    if (statusCol > 0) {
      sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
    }
    var sundayCol = DEPT_COLS.indexOf('SundayOff') + 1;
    if (sundayCol > 0) {
      sheet.getRange(2, sundayCol, lastRow - 1, 1).setHorizontalAlignment('center');
    }
  }

  for (var ci = 0; ci < DEPT_COLS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  Logger.log('Sample data inserted: ' + sampleData.length + ' records.');
  return { status: 'ok', message: sheetName + ' initialized with ' + sampleData.length + ' sample records.', sheet: sheetName, columns: DEPT_COLS.length, records: sampleData.length };
}

function initDepartmentsSheet() {
  initDepartmentSheet();
}

function normalizeDepartment(dept) {
  if (!dept) return dept;
  var out = {};
  DEPT_COLS.forEach(function(c) { out[c] = dept[c] || ''; });
  out.DepartmentID = out.DepartmentID || '';
  out.Department = out.Department || '';
  out.DepartmentCode = out.DepartmentCode || '';
  out.SectionID = out.SectionID || '';
  out.Section = out.Section || '';
  out.DepartmentHead = out.DepartmentHead || '';
  out.Description = out.Description || '';
  out.SundayOff = out.SundayOff || 'No';
  out.HoursPerDay = out.HoursPerDay || '8';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  out.DeptID = out.DepartmentID;
  out.Name = out.Department;
  return out;
}

function getDepartmentList() {
  var data = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  return data.map(normalizeDepartment);
}

function getDepartment(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.DEPARTMENTS, 'DepartmentID', id);
  if (!record) record = getRecordById(CONFIG.SHEET_NAMES.DEPARTMENTS, 'DeptID', id);
  return normalizeDepartment(record);
}

function getDepartmentDetails(id) {
  var dept = getDepartment(id);
  if (!dept || !dept.DepartmentID) return null;
  return {
    DeptID: dept.DeptID,
    Department: dept.Department,
    SectionID: dept.SectionID,
    Section: dept.Section,
    SundayOff: dept.SundayOff,
    HoursPerDay: dept.HoursPerDay
  };
}

function createDepartment(data) {
  if (typeof data === 'string') {
    data = { Department: data, Status: CONFIG.STATUS.ACTIVE };
  }
  var errors = validateDepartmentData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var deptName = data.Department || data.Name || '';
  var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.DEPARTMENTS, 'Department', deptName, 'Department Name');
  if (dupErr) throw new Error(dupErr);
  data.DepartmentID = generateId(CONFIG.SHEET_NAMES.DEPARTMENTS, CONFIG.ID_PREFIXES.DEPARTMENT);
  data.Department = deptName;
  data.Status = data.Status || CONFIG.STATUS.ACTIVE;
  data.SundayOff = data.SundayOff || 'No';
  data.HoursPerDay = data.HoursPerDay || '8';
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  var result = addRow(CONFIG.SHEET_NAMES.DEPARTMENTS, data);
  logActivity('Add Department', data.Department);
  return result.map(normalizeDepartment);
}

function modifyDepartment(id, data) {
  var current = getDepartment(id);
  if (!current) throw new Error('Department not found: ' + id);
  if (data.Department) {
    var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.DEPARTMENTS, 'Department', data.Department, 'Department Name', current.Department);
    if (dupErr) throw new Error(dupErr);
  }
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.DEPARTMENTS, 'DepartmentID', id, data);
  logActivity('Update Department', id);
  return result.map(normalizeDepartment);
}

function removeDepartment(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.DEPARTMENTS, 'DepartmentID', id);
  logActivity('Delete Department', id);
  return result.map(normalizeDepartment);
}

function searchDepartments(query) {
  var result = searchData(CONFIG.SHEET_NAMES.DEPARTMENTS, query);
  return result.map(normalizeDepartment);
}
