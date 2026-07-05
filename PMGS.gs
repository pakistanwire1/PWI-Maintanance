function initPMSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE);
  ensureHeaders(sheet, ['PMNumber', 'Machine', 'Frequency', 'NextDueDate', 'Technician', 'Status', 'LastDone', 'Remarks', 'CreatedAt']);
}

function getPMRecords() {
  return getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE);
}

function addPMRecord(data) {
  var errors = validatePMData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  data.PMNumber = generateId(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, CONFIG.ID_PREFIXES.PM);
  data.CreatedAt = getCurrentTimestamp();
  data.Status = data.Status || CONFIG.STATUS.SCHEDULED;
  var result = addRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, data);
  logActivity('Add PM Record', data.PMNumber);
  return result;
}

function updatePMRecord(id, data) {
  var result = updateRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id, data);
  logActivity('Update PM Record', id);
  return result;
}

function deletePMRecord(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id);
  logActivity('Delete PM Record', id);
  return result;
}

function searchPMRecords(query) {
  return searchData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, query);
}

function completePM(id) {
  var data = {
    Status: CONFIG.STATUS.COMPLETED,
    LastDone: formatDateTimeISO(new Date())
  };
  var record = getRecordById(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id);
  if (record && record.Frequency) {
    var nextDate = new Date();
    var freq = parseInt(record.Frequency, 10);
    if (!isNaN(freq)) {
      nextDate.setDate(nextDate.getDate() + freq);
      data.NextDueDate = formatDate(nextDate);
    }
  }
  var result = updateRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id, data);
  logActivity('Complete PM', id);
  return result;
}

function getOverduePM() {
  var all = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
  var today = new Date();
  return all.filter(function(pm) {
    if (pm.Status === CONFIG.STATUS.COMPLETED) return false;
    if (!pm.NextDueDate) return false;
    var due = new Date(pm.NextDueDate);
    return due < today;
  });
}
