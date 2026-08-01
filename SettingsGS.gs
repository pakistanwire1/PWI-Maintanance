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
  var data = getAllData(CONFIG.SHEET_NAMES.SETTINGS);
  var found = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i].Setting === key) {
      found = true;
      break;
    }
  }
  if (found) {
    var sheet = getSheet(CONFIG.SHEET_NAMES.SETTINGS);
    var raw = sheet.getDataRange().getValues();
    for (var r = 1; r < raw.length; r++) {
      if (raw[r][0] === key) {
        sheet.getRange(r + 1, 2).setValue(value);
        sheet.getRange(r + 1, 3).setValue(getCurrentTimestamp());
        break;
      }
    }
  } else {
    var sheet = getSheet(CONFIG.SHEET_NAMES.SETTINGS);
    sheet.appendRow([key, value, getCurrentTimestamp()]);
  }
  invalidateCache(CONFIG.SHEET_NAMES.SETTINGS);
}

function getDepartments(divisionId, sectionId) {
  var data = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS);
  if (data.length === 0) {
    initializeDepartmentMaster();
    invalidateCache(CONFIG.SHEET_NAMES.DEPARTMENTS);
    data = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS);
  }
  if (divisionId) data = data.filter(function(d) { return d.DivisionID === divisionId; });
  if (sectionId) data = data.filter(function(d) { return d.SectionID === sectionId; });
  var result = [];
  for (var i = 0; i < data.length; i++) {
    result.push({
      ID: data[i].DepartmentID || '',
      Name: data[i].Department || '',
      Status: data[i].Status || ''
    });
  }
  return result;
}

function addDepartment(name) {
  var id = generateId(CONFIG.SHEET_NAMES.DEPARTMENTS, CONFIG.ID_PREFIXES.DEPARTMENT);
  var data = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS);
  var headers = data.length > 0 ? Object.keys(data[0]) : getSheet(CONFIG.SHEET_NAMES.DEPARTMENTS).getDataRange().getValues()[0];
  var row = {};
  for (var c = 0; c < headers.length; c++) {
    if (headers[c] === 'DepartmentID') row[headers[c]] = id;
    else if (headers[c] === 'Department') row[headers[c]] = name;
    else if (headers[c] === 'Status') row[headers[c]] = CONFIG.STATUS.ACTIVE;
    else if (headers[c] === 'CreatedAt') row[headers[c]] = getCurrentTimestamp();
    else if (headers[c] === 'SundayOff') row[headers[c]] = 'No';
    else if (headers[c] === 'HoursPerDay') row[headers[c]] = '8';
    else row[headers[c]] = '';
  }
  addRow(CONFIG.SHEET_NAMES.DEPARTMENTS, row);
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
  var oldValue = getSetting(key);
  saveSetting(key, value);
  logActivity('Update Setting', key + ' = ' + value);
  try { createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, CONFIG.AUDIT_ACTIONS.UPDATE, key, '', String(oldValue), String(value), 'Success', 'Setting changed: ' + key); } catch(e) {}
  return getSettingsData();
}
