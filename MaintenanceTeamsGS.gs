function initMaintenanceTeamsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS);
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS);
  }
  ensureHeaders(sheet, CONFIG.MAINTENANCE_TEAM_FIELDS);
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasData = data.length > 1;
  if (!hasData) {
    var sampleData = [
      ['MT001', 'Mechanical', 'Active'],
      ['MT002', 'Electrical', 'Active'],
      ['MT003', 'Instrumentation', 'Active'],
      ['MT004', 'Utility', 'Active'],
      ['MT005', 'Civil', 'Active'],
      ['MT006', 'Automation', 'Active'],
      ['MT007', 'Production Support', 'Active'],
      ['MT008', 'HVAC', 'Active'],
      ['MT009', 'Hydraulic', 'Active'],
      ['MT010', 'Pneumatic', 'Active'],
      ['MT011', 'Workshop', 'Active'],
      ['MT012', 'Machine Shop', 'Active'],
      ['MT013', 'Utilities', 'Active']
    ];
    sheet.getRange(2, 1, sampleData.length, CONFIG.MAINTENANCE_TEAM_FIELDS.length).setValues(sampleData);
  }
  var headerRange = sheet.getRange(1, 1, 1, CONFIG.MAINTENANCE_TEAM_FIELDS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  for (var ci = 0; ci < CONFIG.MAINTENANCE_TEAM_FIELDS.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  return { status: 'ok', message: CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS + ' initialized', sheet: CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS };
}

function normalizeMaintenanceTeam(t) {
  if (!t) return t;
  var out = {};
  CONFIG.MAINTENANCE_TEAM_FIELDS.forEach(function(c) { out[c] = t[c] || ''; });
  out.TeamID = out.TeamID || '';
  out.TeamName = out.TeamName || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  return out;
}

function getMaintenanceTeams() {
  var data = getAllData(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS) || [];
  return data.map(normalizeMaintenanceTeam);
}

function getActiveMaintenanceTeams() {
  var all = getMaintenanceTeams();
  return all.filter(function(t) { return t.Status === CONFIG.STATUS.ACTIVE; });
}

function getMaintenanceTeamList() {
  return getMaintenanceTeams();
}

function getMaintenanceTeam(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS, 'TeamID', id);
  return normalizeMaintenanceTeam(record);
}

function generateMaintenanceTeamId() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS);
  var data = sheet.getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var num = parseInt(String(data[i][0]).replace('MT', ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return 'MT' + String(max + 1).padStart(3, '0');
}

function addMaintenanceTeam(data) {
  if (!data.TeamName) throw new Error('Team name is required');
  var check = checkDuplicateField(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS, 'TeamName', data.TeamName);
  if (check) throw new Error('Team "' + data.TeamName + '" already exists');
  data.TeamID = generateMaintenanceTeamId();
  data.Status = data.Status || CONFIG.STATUS.ACTIVE;
  var result = addRow(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS, data);
  return result.map(normalizeMaintenanceTeam);
}

function updateMaintenanceTeam(id, data) {
  var current = getMaintenanceTeam(id);
  if (!current) throw new Error('Maintenance team not found: ' + id);
  data.Status = data.Status || current.Status;
  var result = updateRow(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS, 'TeamID', id, data);
  return result.map(normalizeMaintenanceTeam);
}

function deleteMaintenanceTeam(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS, 'TeamID', id);
  return result.map(normalizeMaintenanceTeam);
}
