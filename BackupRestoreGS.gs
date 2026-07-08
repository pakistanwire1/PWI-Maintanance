var BACKUP_SHEET = 'BackupLog';
var BACKUP_DIR = 'CMMS_Backups';

function initBackupSheet() {
  var sheet = getSheet(BACKUP_SHEET);
  ensureHeaders(sheet, ['BackupID','DateTime','CreatedBy','BackupType','Status','Size','Label','Data','Schedule']);
  ensureSheetColumns(sheet, ['BackupID','DateTime','CreatedBy','BackupType','Status','Size','Label','Data','Schedule']);
  sheet.getRange(1,1,1,9).setFontWeight('bold').setBackground('#4a148c').setFontColor('#ffffff');
  return sheet;
}

function getBackupHistory() {
  var sheet = getSheet(BACKUP_SHEET);
  var data = getAllData(BACKUP_SHEET) || [];
  return data.map(function(r) {
    return {
      BackupID: r.BackupID || '',
      DateTime: r.DateTime || '',
      CreatedBy: r.CreatedBy || '',
      BackupType: r.BackupType || '',
      Status: r.Status || '',
      Size: r.Size || '',
      Label: r.Label || '',
      Schedule: r.Schedule || ''
    };
  }).reverse();
}

function getBackupStatus() {
  var history = getBackupHistory();
  var lastBackup = history.length > 0 ? history[0] : null;
  var sheet = getSheet(BACKUP_SHEET);
  var allData = getAllData(BACKUP_SHEET) || [];
  var scheduleRow = allData.filter(function(r) { return r.Schedule; });
  var schedule = scheduleRow.length > 0 ? scheduleRow[0].Schedule : 'Disabled';
  return {
    lastBackup: lastBackup,
    totalBackups: history.length,
    schedule: schedule,
    protectedSheets: Object.keys(CONFIG.SHEET_NAMES).length
  };
}

function getBackupSheetsList() {
  return Object.keys(CONFIG.SHEET_NAMES).map(function(k) { return CONFIG.SHEET_NAMES[k]; });
}

function createBackup(label) {
  label = label || '';
  var userEmail = Session.getActiveUser().getEmail();
  initBackupSheet();
  var backupId = 'BKP_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var now = formatDateTimeISO(new Date());
  var sheetNames = getBackupSheetsList();
  var backupData = {};
  var totalSize = 0;

  sheetNames.forEach(function(name) {
    try {
      var data = getAllData(name);
      backupData[name] = data || [];
      totalSize += JSON.stringify(data).length;
    } catch(e) {
      backupData[name] = [];
      console.warn('Backup: Could not read sheet ' + name + ': ' + e.message);
    }
  });

  var sizeStr = totalSize > 1048576 ? (totalSize / 1048576).toFixed(2) + ' MB' :
                totalSize > 1024 ? (totalSize / 1024).toFixed(2) + ' KB' :
                totalSize + ' B';

  BackupDataStore_[backupId] = backupData;

  try {
    var driveDir = getOrCreateDriveFolder_(BACKUP_DIR);
    var jsonStr = JSON.stringify({ id: backupId, created: now, by: userEmail, label: label, data: backupData });
    var file = driveDir.createFile(backupId + '.json', jsonStr, 'application/json');
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  } catch(e) {
    console.warn('Backup: Could not save to Drive: ' + e.message);
  }

  var row = {};
  row.BackupID = backupId;
  row.DateTime = now;
  row.CreatedBy = userEmail;
  row.BackupType = label ? 'Manual (' + label + ')' : 'Manual';
  row.Status = 'Completed';
  row.Size = sizeStr;
  row.Label = label;
  row.Data = backupId;

  try {
    addRow(BACKUP_SHEET, row);
  } catch(e) {
    console.error('Backup: Could not log to sheet: ' + e.message);
  }

  try { logActivity('Backup Created', backupId + ' | Size: ' + sizeStr + ' | ' + sheetNames.length + ' sheets'); } catch(e) {}
  try { createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, 'BACKUP', backupId, '', '', 'Backup created: ' + sizeStr + ' (' + sheetNames.length + ' sheets)', 'Success', userEmail); } catch(e) {}

  return { success: true, backupId: backupId, size: sizeStr, sheets: sheetNames.length, message: 'Backup created successfully' };
}

var BackupDataStore_ = {};

function restoreBackup(backupId) {
  if (!backupId) throw new Error('Backup ID is required');
  if (!isAdmin()) throw new Error('Only administrators can restore backups');

  var data = loadBackupData_(backupId);
  if (!data) throw new Error('Backup data not found: ' + backupId);

  var sheetNames = Object.keys(data);
  var restored = 0;

  sheetNames.forEach(function(name) {
    try {
      var sheet = getSheet(name);
      if (!sheet) return;
      var records = data[name];
      if (!records || records.length === 0) return;
      var headers = Object.keys(records[0]);
      ensureHeaders(sheet, headers);
      ensureSheetColumns(sheet, headers);
      var range = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), sheet.getLastColumn());
      if (range.getNumRows() > 0) range.clearContent();
      if (records.length > 0) {
        var values = records.map(function(r) { return headers.map(function(h) { return r[h] !== undefined ? r[h] : ''; }); });
        sheet.getRange(2, 1, values.length, headers.length).setValues(values);
      }
      restored++;
    } catch(e) {
      console.warn('Restore: Could not restore sheet ' + name + ': ' + e.message);
    }
  });

  try { logActivity('Backup Restored', backupId + ' | ' + restored + ' sheets restored'); } catch(e) {}
  try { createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, 'RESTORE', backupId, '', '', 'Backup restored: ' + restored + ' sheets', 'Success', Session.getActiveUser().getEmail()); } catch(e) {}

  return { success: true, backupId: backupId, sheetsRestored: restored, message: restored + ' sheets restored successfully' };
}

function exportBackup(backupId) {
  if (!backupId) throw new Error('Backup ID is required');
  var data = loadBackupData_(backupId);
  if (!data) throw new Error('Backup data not found: ' + backupId);

  var history = getBackupHistory();
  var record = history.find(function(r) { return r.BackupID === backupId; });

  var exportData = {
    id: backupId,
    exported: formatDateTimeISO(new Date()),
    exportedBy: Session.getActiveUser().getEmail(),
    original: record ? { created: record.DateTime, by: record.CreatedBy, label: record.Label } : {},
    data: data
  };

  return JSON.stringify(exportData);
}

function importBackup(jsonStr) {
  if (!jsonStr) throw new Error('Backup data is required');
  if (!isAdmin()) throw new Error('Only administrators can import backups');

  var parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch(e) {
    throw new Error('Invalid backup file format');
  }

  var data = parsed.data || parsed;
  if (!data || typeof data !== 'object') throw new Error('Backup data is empty or invalid');

  var sheetNames = Object.keys(data);
  var imported = 0;

  sheetNames.forEach(function(name) {
    try {
      var sheet = getSheet(name);
      if (!sheet) return;
      var records = data[name];
      if (!records || records.length === 0) return;
      if (!Array.isArray(records)) return;
      var headers = Object.keys(records[0]);
      ensureHeaders(sheet, headers);
      ensureSheetColumns(sheet, headers);
      var range = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), sheet.getLastColumn());
      if (range.getNumRows() > 0) range.clearContent();
      var values = records.map(function(r) { return headers.map(function(h) { return r[h] !== undefined ? r[h] : ''; }); });
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
      imported++;
    } catch(e) {
      console.warn('Import: Could not import sheet ' + name + ': ' + e.message);
    }
  });

  var backupId = 'IMP_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var row = {};
  row.BackupID = backupId;
  row.DateTime = formatDateTimeISO(new Date());
  row.CreatedBy = Session.getActiveUser().getEmail();
  row.BackupType = 'Imported';
  row.Status = 'Completed';
  row.Size = (jsonStr.length > 1048576 ? (jsonStr.length / 1048576).toFixed(2) + ' MB' : jsonStr.length > 1024 ? (jsonStr.length / 1024).toFixed(2) + ' KB' : jsonStr.length + ' B');
  row.Label = 'Imported: ' + parsed.id || '';
  try { addRow(BACKUP_SHEET, row); } catch(e) {}

  try { logActivity('Backup Imported', backupId + ' | ' + imported + ' sheets'); } catch(e) {}
  try { createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, 'IMPORT', backupId, '', '', 'Backup imported: ' + imported + ' sheets', 'Success', Session.getActiveUser().getEmail()); } catch(e) {}

  return { success: true, backupId: backupId, sheetsImported: imported, message: imported + ' sheets imported successfully' };
}

function deleteBackup(backupId) {
  if (!backupId) throw new Error('Backup ID is required');
  if (!isAdmin()) throw new Error('Only administrators can delete backups');
  var allData = getAllData(BACKUP_SHEET) || [];
  var idx = -1;
  for (var i = 0; i < allData.length; i++) {
    if (allData[i].BackupID === backupId) { idx = i + 2; break; }
  }
  if (idx > 0) {
    var sheet = getSheet(BACKUP_SHEET);
    sheet.deleteRow(idx);
  }
  try {
    var dir = getOrCreateDriveFolder_(BACKUP_DIR);
    var files = dir.getFilesByName(backupId + '.json');
    while (files.hasNext()) { files.next().setTrashed(true); }
  } catch(e) {}
  if (BackupDataStore_[backupId]) delete BackupDataStore_[backupId];
  return { success: true, message: 'Backup deleted' };
}

function setAutoBackupSchedule(schedule) {
  if (!isAdmin()) throw new Error('Only administrators can change backup schedule');
  var allData = getAllData(BACKUP_SHEET) || [];
  var sheet = getSheet(BACKUP_SHEET);
  if (allData.length > 0) {
    for (var i = 0; i < allData.length; i++) {
      if (allData[i].Schedule) {
        sheet.getRange(i + 2, 9).setValue(schedule);
        return { success: true, schedule: schedule };
      }
    }
  }
  var row = {};
  row.BackupID = 'SCHED';
  row.DateTime = formatDateTimeISO(new Date());
  row.CreatedBy = Session.getActiveUser().getEmail();
  row.BackupType = 'Schedule';
  row.Status = 'Active';
  row.Size = '';
  row.Label = '';
  row.Schedule = schedule;
  try { addRow(BACKUP_SHEET, row); } catch(e) {}
  return { success: true, schedule: schedule };
}

function getBackupFileUrl(backupId) {
  try {
    var dir = getOrCreateDriveFolder_(BACKUP_DIR);
    var files = dir.getFilesByName(backupId + '.json');
    if (files.hasNext()) {
      var file = files.next();
      return file.getUrl();
    }
  } catch(e) {}
  return '';
}

function loadBackupData_(backupId) {
  if (BackupDataStore_[backupId]) return BackupDataStore_[backupId];
  try {
    var dir = getOrCreateDriveFolder_(BACKUP_DIR);
    var files = dir.getFilesByName(backupId + '.json');
    if (files.hasNext()) {
      var file = files.next();
      var content = file.getBlob().getDataAsString();
      var parsed = JSON.parse(content);
      if (parsed && parsed.data) {
        BackupDataStore_[backupId] = parsed.data;
        return parsed.data;
      }
    }
  } catch(e) {
    console.warn('Could not load backup from Drive: ' + e.message);
  }
  return null;
}

function getOrCreateDriveFolder_(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function isAdmin() {
  var userEmail = Session.getActiveUser().getEmail();
  var users = getAllData(CONFIG.SHEET_NAMES.USERS);
  var user = users.find(function(u) { return u.Email === userEmail; });
  return user && (user.Role === 'Admin' || user.IsAdmin === 'TRUE');
}

function hasBackupRestorePermission() {
  var userEmail = Session.getActiveUser().getEmail();
  var users = getAllData(CONFIG.SHEET_NAMES.USERS);
  var user = users.find(function(u) { return u.Email === userEmail; });
  if (!user) return false;
  if (user.Role === 'Admin' || user.IsAdmin === 'TRUE') return true;
  return getPermValue(user.CanBackupRestore);
}
