var ASSET_COLS = ['AssetID','AssetCode','AssetName','AssetType','Category','MachineID','MachineName','DeptID','Department','SectionID','Section','Location','Manufacturer','Model','SerialNo','Specification','PurchaseDate','InstallDate','WarrantyExpiry','Criticality','Supplier','Cost','Status','QRCode','Barcode','QRGeneratedDate','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'];

function initAssetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Assets';
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
    sheet.getRange(1, 1, 1, ASSET_COLS.length).setValues([ASSET_COLS]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + ASSET_COLS.join(', '));
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    ASSET_COLS.forEach(function(h) {
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
    return { status: 'ok', message: sheetName + ' already has ' + existingRows + ' records. No duplicates inserted.', sheet: sheetName, columns: ASSET_COLS.length, records: existingRows };
  }
  var now = new Date();
  var pad = function(n) { return ('0' + n).slice(-2); };
  var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  var sampleData = [
    ['AST001','AST-001','CNC Tool Holder Set','Tooling','Production','MCH001','CNC Milling Machine','DEPT002','Spoke Production','SEC002','Spoke','Area A','HAAS','VF-2-TH','SN-A001','Standard 20-tool holder','2025-01-01 00:00','2025-01-01 00:00','2027-01-01 00:00','Low','HAAS','5000','Active','','Admin',ts,'Admin',ts],
    ['AST002','AST-002','Hydraulic Pump Unit','Equipment','Production','MCH002','Hydraulic Press','DEPT002','Spoke Production','SEC002','Spoke','Area B','Enerpac','EP-P100','SN-A002','High pressure 200 bar pump','2025-02-01 00:00','2025-02-01 00:00','2027-02-01 00:00','High','Enerpac','15000','Active','','Admin',ts,'Admin',ts],
    ['AST003','AST-003','Air Dryer','Equipment','Utility','MCH003','Air Compressor','DEPT008','Facility Maintenance','SEC008','Maintenance','Utility Room','Atlas Copco','AD-30','SN-A003','Refrigeration type 30 CFM','2024-06-01 00:00','2024-06-01 00:00','2027-06-01 00:00','Medium','Atlas Copco','25000','Active','','Admin',ts,'Admin',ts],
    ['AST004','AST-004','Emergency Generator','Equipment','Utility','MCH005','Generator Set','DEPT008','Facility Maintenance','SEC008','Maintenance','Power Room','Cummins','C20-GEN','SN-A004','500 kVA standby generator','2024-01-01 00:00','2024-01-01 00:00','2029-01-01 00:00','Critical','Cummins','450000','Active','','Admin',ts,'Admin',ts]
  ];
  sheet.getRange(2, 1, sampleData.length, ASSET_COLS.length).setValues(sampleData);
  SpreadsheetApp.flush();
  Logger.log('Sample data written to sheet.');

  var headerRange = sheet.getRange(1, 1, 1, ASSET_COLS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  var lastRow = sheet.getLastRow();
  var fullRange = sheet.getRange(1, 1, lastRow, ASSET_COLS.length);
  fullRange.setBorder(true, true, true, true, true, true);

  if (lastRow > 1) {
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, ASSET_COLS.length).setBackground(bg);
    }
    var idCol = ASSET_COLS.indexOf('AssetID') + 1;
    if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var statusCol = ASSET_COLS.indexOf('Status') + 1;
    if (statusCol > 0) sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var qrCol = ASSET_COLS.indexOf('QRCode') + 1;
    if (qrCol > 0) sheet.getRange(2, qrCol, lastRow - 1, 1).setHorizontalAlignment('center');
  }

  for (var ci = 0; ci < ASSET_COLS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  Logger.log('Asset Sheet Updated');
  Logger.log('Headers Updated');
  Logger.log('Formatting Applied');
  Logger.log('Sample Data Inserted');
  return { status: 'ok', message: sheetName + ' initialized with ' + sampleData.length + ' sample records.', sheet: sheetName, columns: ASSET_COLS.length, records: sampleData.length };
}

function initAssetsSheet() {
  initAssetSheet();
}

function normalizeAsset(a) {
  if (!a) return a;
  var out = {};
  ASSET_COLS.forEach(function(c) { out[c] = a[c] || ''; });
  out.AssetID = out.AssetID || '';
  out.AssetCode = out.AssetCode || '';
  out.AssetName = out.AssetName || '';
  out.AssetType = out.AssetType || '';
  out.Category = out.Category || '';
  out.MachineID = out.MachineID || '';
  out.MachineName = out.MachineName || '';
  out.DeptID = out.DeptID || '';
  out.Department = out.Department || '';
  out.SectionID = out.SectionID || '';
  out.Section = out.Section || '';
  out.Location = out.Location || '';
  out.Manufacturer = out.Manufacturer || '';
  out.Model = out.Model || '';
  out.SerialNo = out.SerialNo || '';
  out.Specification = out.Specification || '';
  out.PurchaseDate = out.PurchaseDate || '';
  out.InstallDate = out.InstallDate || '';
  out.WarrantyExpiry = out.WarrantyExpiry || '';
  out.Criticality = out.Criticality || 'Low';
  out.Supplier = out.Supplier || '';
  out.Cost = out.Cost || '0';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.QRCode = out.QRCode || '';
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  return out;
}

function getAssets() {
  var data = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
  return data.map(normalizeAsset);
}

function getAssetList() {
  return getAssets();
}

function getAsset(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.ASSETS, 'AssetID', id);
  return normalizeAsset(record);
}

function getAssetDetails(id) {
  var a = getAsset(id);
  if (!a || !a.AssetID) return null;
  return {
    AssetID: a.AssetID,
    AssetName: a.AssetName,
    AssetCode: a.AssetCode,
    MachineID: a.MachineID,
    MachineName: a.MachineName,
    DeptID: a.DeptID,
    Department: a.Department,
    SectionID: a.SectionID,
    Section: a.Section
  };
}

function addAsset(data) {
  var errors = validateAssetData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var ac = data.AssetCode || '';
  var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.ASSETS, 'AssetCode', ac, 'Asset Code');
  if (dupErr) throw new Error(dupErr);
  data.AssetID = generateId(CONFIG.SHEET_NAMES.ASSETS, CONFIG.ID_PREFIXES.ASSET);
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  if (!data.Status) data.Status = CONFIG.STATUS.ACTIVE;
  var result = addRow(CONFIG.SHEET_NAMES.ASSETS, data);
  logActivity('Add Asset', data.AssetID + ' - ' + data.AssetName);
  try { createNotification('Asset Added: ' + (data.AssetName || ''), 'New asset ' + (data.AssetName || '') + ' (' + (data.AssetCode || '') + ') has been added to the system.', CONFIG.NOTIFICATION_MODULES.ASSET, CONFIG.PRIORITY.LOW, data.CreatedBy, '', "navigateTo('assets')"); } catch(e) {}
  try { createAuditLog(CONFIG.AUDIT_MODULES.ASSET, CONFIG.AUDIT_ACTIONS.CREATE, data.AssetID, data.AssetName || '', '', 'Code: ' + (data.AssetCode || '') + ', Type: ' + (data.AssetType || '') + ', Dept: ' + (data.Department || ''), 'Success', 'Asset created'); } catch(e) {}
  try { generateQRBarcodeForNewRecord('Asset', data.AssetID, data); } catch(e) { console.error('QR gen error: ' + e.message); }
  return result.map(normalizeAsset);
}

function updateAsset(id, data) {
  var current = getAsset(id);
  if (!current) throw new Error('Asset not found: ' + id);
  if (data.AssetCode) {
    var dupErr = validateDuplicate(CONFIG.SHEET_NAMES.ASSETS, 'AssetCode', data.AssetCode, 'Asset Code', current.AssetCode);
    if (dupErr) throw new Error(dupErr);
  }
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.ASSETS, 'AssetID', id, data);
  logActivity('Update Asset', id);
  try { createAuditLog(CONFIG.AUDIT_MODULES.ASSET, CONFIG.AUDIT_ACTIONS.UPDATE, id, current.AssetName || '', '', JSON.stringify(data).substring(0, 150), 'Success', 'Asset updated'); } catch(e) {}
  return result.map(normalizeAsset);
}

function deleteAsset(id) {
  var current = getAsset(id);
  var result = deleteRow(CONFIG.SHEET_NAMES.ASSETS, 'AssetID', id);
  logActivity('Delete Asset', id);
  try { createAuditLog(CONFIG.AUDIT_MODULES.ASSET, CONFIG.AUDIT_ACTIONS.DELETE, id, current ? current.AssetName : '', '', 'Asset deleted', 'Success', 'Asset deleted'); } catch(e) {}
  return result.map(normalizeAsset);
}

function searchAssets(query) {
  var result = searchData(CONFIG.SHEET_NAMES.ASSETS, query);
  return result.map(normalizeAsset);
}
