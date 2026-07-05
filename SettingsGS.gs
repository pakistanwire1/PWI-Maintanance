function initSettingsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.SETTINGS);
  ensureHeaders(sheet, ['Setting', 'Value', 'UpdatedAt']);
}

function getSettings() {
  return getAllData(CONFIG.SHEET_NAMES.SETTINGS);
}

function getSetting(key) {
  var data = getAllData(CONFIG.SHEET_NAMES.SETTINGS);
  for (var i = 0; i < data.length; i++) {
    if (data[i].Setting === key) return data[i].Value;
  }
  return null;
}

function saveSetting(key, value) {
  var sheet = getSheet(CONFIG.SHEET_NAMES.SETTINGS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(getCurrentTimestamp());
      return;
    }
  }
  sheet.appendRow([key, value, getCurrentTimestamp()]);
}

function getDepartments() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.DEPARTMENTS);
  var data = sheet.getDataRange().getValues();
  Logger.log('getDepartments(): raw rows=' + data.length);
  console.log('getDepartments(): raw rows=' + data.length);
  if (data.length < 2) {
    Logger.log('getDepartments(): no data, initializing with defaults');
    console.log('getDepartments(): no data, initializing with defaults');
    initializeDepartmentMaster();
    data = sheet.getDataRange().getValues();
  }
  var headers = data[0] || [];
  var idIdx = headers.indexOf('DepartmentID');
  var nameIdx = headers.indexOf('Department');
  var statusIdx = headers.indexOf('Status');
  var result = [];
  for (var i = 1; i < data.length; i++) {
    result.push({
      ID: idIdx >= 0 ? data[i][idIdx] : '',
      Name: nameIdx >= 0 ? data[i][nameIdx] : '',
      Status: statusIdx >= 0 ? data[i][statusIdx] : ''
    });
  }
  Logger.log('getDepartments(): returning ' + result.length + ' departments');
  console.log('getDepartments(): returning ' + result.length + ' departments');
  return result;
}

function addDepartment(name) {
  var sheet = getSheet(CONFIG.SHEET_NAMES.DEPARTMENTS);
  var id = generateId(CONFIG.SHEET_NAMES.DEPARTMENTS, CONFIG.ID_PREFIXES.DEPARTMENT);
  var headers = sheet.getDataRange().getValues()[0] || [];
  var row = [];
  for (var c = 0; c < headers.length; c++) {
    if (headers[c] === 'DepartmentID') row.push(id);
    else if (headers[c] === 'Department') row.push(name);
    else if (headers[c] === 'Status') row.push(CONFIG.STATUS.ACTIVE);
    else if (headers[c] === 'CreatedAt') row.push(getCurrentTimestamp());
    else if (headers[c] === 'SundayOff') row.push('No');
    else if (headers[c] === 'HoursPerDay') row.push('8');
    else row.push('');
  }
  sheet.appendRow(row);
  logActivity('Add Department', name);
  return getDepartments();
}

function deleteDepartment(id) {
  deleteRow(CONFIG.SHEET_NAMES.DEPARTMENTS, 'DepartmentID', id);
  logActivity('Delete Department', id);
  return getDepartments();
}

function getSettingsData() {
  Logger.log('getSettingsData() called');
  console.log('getSettingsData() called');
  var result = {
    departments: getDepartments(),
    settings: getAllData(CONFIG.SHEET_NAMES.SETTINGS)
  };
  Logger.log('getSettingsData(): settings records=' + (result.settings ? result.settings.length : 0));
  console.log('getSettingsData(): settings records=' + (result.settings ? result.settings.length : 0));
  return result;
}

function saveSettingValue(key, value) {
  saveSetting(key, value);
  logActivity('Update Setting', key + ' = ' + value);
  return getSettingsData();
}
