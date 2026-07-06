var MACHINE_COLS = ['MachineID','MachineCode','MachineName','MachineNumber','DeptID','Department','SectionID','Section','Location','MachineType','Manufacturer','Model','SerialNo','Capacity','PowerRating','InstallDate','WarrantyExpiry','Criticality','Status','QRCode','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'];

function initMachineSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Machines';
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
    sheet.getRange(1, 1, 1, MACHINE_COLS.length).setValues([MACHINE_COLS]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + MACHINE_COLS.join(', '));
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    MACHINE_COLS.forEach(function(h) {
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
    return { status: 'ok', message: sheetName + ' already has ' + existingRows + ' records. No duplicates inserted.', sheet: sheetName, columns: MACHINE_COLS.length, records: existingRows };
  }
  var now = new Date();
  var pad = function(n) { return ('0' + n).slice(-2); };
  var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  var sampleData = [
    ['MCH001','CNC-001','CNC Milling Machine','CNC-001','DEPT002','Spoke Production','SEC002','Spoke','Area A','CNC','HAAS','VF-2','SN-001','500 kg','50 kW','2025-01-01 00:00','2027-01-01 00:00','Critical','Active','','Admin',ts,'Admin',ts],
    ['MCH002','HP-001','Hydraulic Press','HP-001','DEPT002','Spoke Production','SEC002','Spoke','Area B','Hydraulic','Enerpac','EP-100','SN-002','100 T','75 kW','2025-02-01 00:00','2027-02-01 00:00','High','Active','','Admin',ts,'Admin',ts],
    ['MCH003','AC-001','Air Compressor','AC-001','DEPT008','Facility Maintenance','SEC008','Maintenance','Utility Room','Compressor','Atlas Copco','GA-30','SN-003','200 CFM','150 kW','2024-06-01 00:00','2027-06-01 00:00','Critical','Active','','Admin',ts,'Admin',ts],
    ['MCH004','CB-001','Conveyor Belt','CB-001','DEPT005','Packing','SEC005','Spoke Packing','Packing Area','Mechanical','FlexLink','X85','SN-004','100 m','5 kW','2025-03-01 00:00','2027-03-01 00:00','Medium','Active','','Admin',ts,'Admin',ts],
    ['MCH005','GEN-001','Generator Set','GEN-001','DEPT008','Facility Maintenance','SEC008','Maintenance','Power Room','Generator','Cummins','C20D5','SN-005','500 kVA','400 kW','2024-01-01 00:00','2029-01-01 00:00','Critical','Active','','Admin',ts,'Admin',ts]
  ];
  sheet.getRange(2, 1, sampleData.length, MACHINE_COLS.length).setValues(sampleData);
  SpreadsheetApp.flush();
  Logger.log('Sample data written to sheet.');

  var headerRange = sheet.getRange(1, 1, 1, MACHINE_COLS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  var lastRow = sheet.getLastRow();
  var fullRange = sheet.getRange(1, 1, lastRow, MACHINE_COLS.length);
  fullRange.setBorder(true, true, true, true, true, true);

  if (lastRow > 1) {
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, MACHINE_COLS.length).setBackground(bg);
    }
    var idCol = MACHINE_COLS.indexOf('MachineID') + 1;
    if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var statusCol = MACHINE_COLS.indexOf('Status') + 1;
    if (statusCol > 0) sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var qrCol = MACHINE_COLS.indexOf('QRCode') + 1;
    if (qrCol > 0) sheet.getRange(2, qrCol, lastRow - 1, 1).setHorizontalAlignment('center');
  }

  for (var ci = 0; ci < MACHINE_COLS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  Logger.log('Machine Sheet Updated');
  Logger.log('Headers Updated');
  Logger.log('Formatting Applied');
  Logger.log('Sample Data Inserted');
  return { status: 'ok', message: sheetName + ' initialized with ' + sampleData.length + ' sample records.', sheet: sheetName, columns: MACHINE_COLS.length, records: sampleData.length };
}

function initMachinesSheet() {
  initMachineSheet();
}

function normalizeMachine(m) {
  if (!m) return m;
  var out = {};
  MACHINE_COLS.forEach(function(c) { out[c] = m[c] || ''; });
  out.MachineID = out.MachineID || '';
  out.MachineCode = out.MachineCode || out.MachineNumber || '';
  out.MachineName = out.MachineName || '';
  out.MachineNumber = out.MachineNumber || out.MachineCode || '';
  out.DeptID = out.DeptID || '';
  out.Department = out.Department || '';
  out.SectionID = out.SectionID || '';
  out.Section = out.Section || '';
  out.Location = out.Location || '';
  out.MachineType = out.MachineType || '';
  out.Manufacturer = out.Manufacturer || '';
  out.Model = out.Model || '';
  out.SerialNo = out.SerialNo || '';
  out.Capacity = out.Capacity || '';
  out.PowerRating = out.PowerRating || '';
  out.InstallDate = out.InstallDate || '';
  out.WarrantyExpiry = out.WarrantyExpiry || '';
  out.Criticality = out.Criticality || 'Low';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.QRCode = out.QRCode || '';
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  return out;
}

function getMachines() {
  var data = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  return data.map(normalizeMachine);
}

function getMachineList() {
  return getMachines();
}

function getMachine(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.MACHINES, 'MachineID', id);
  return normalizeMachine(record);
}

function getMachineDetails(id) {
  var m = getMachine(id);
  if (!m || !m.MachineID) return null;
  return {
    MachineID: m.MachineID,
    MachineName: m.MachineName,
    MachineCode: m.MachineCode,
    DeptID: m.DeptID,
    Department: m.Department,
    SectionID: m.SectionID,
    Section: m.Section
  };
}

function addMachine(data) {
  var errors = validateMachineData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var mc = data.MachineCode || '';
  var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.MACHINES, 'MachineCode', mc, 'Machine Code');
  if (dupErr) throw new Error(dupErr);
  data.MachineID = generateId(CONFIG.SHEET_NAMES.MACHINES, CONFIG.ID_PREFIXES.MACHINE);
  data.MachineNumber = data.MachineNumber || data.MachineCode;
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  if (!data.Status) data.Status = CONFIG.STATUS.ACTIVE;
  var result = addRow(CONFIG.SHEET_NAMES.MACHINES, data);
  logActivity('Add Machine', data.MachineID + ' - ' + data.MachineName);
  try { createNotification('Machine Added: ' + (data.MachineName || ''), 'New machine ' + (data.MachineName || '') + ' (' + (data.MachineCode || '') + ') has been added to the system.', CONFIG.NOTIFICATION_MODULES.MACHINE, CONFIG.PRIORITY.LOW, data.CreatedBy, '', "navigateTo('machines')"); } catch(e) {}
  return result.map(normalizeMachine);
}

function updateMachine(id, data) {
  var current = getMachine(id);
  if (!current) throw new Error('Machine not found: ' + id);
  if (data.MachineCode) {
    var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.MACHINES, 'MachineCode', data.MachineCode, 'Machine Code', current.MachineCode);
    if (dupErr) throw new Error(dupErr);
  }
  data.MachineNumber = data.MachineNumber || data.MachineCode || current.MachineNumber;
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.MACHINES, 'MachineID', id, data);
  logActivity('Update Machine', id);
  return result.map(normalizeMachine);
}

function deleteMachine(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.MACHINES, 'MachineID', id);
  logActivity('Delete Machine', id);
  return result.map(normalizeMachine);
}

function searchMachines(query) {
  var result = searchData(CONFIG.SHEET_NAMES.MACHINES, query);
  return result.map(normalizeMachine);
}
