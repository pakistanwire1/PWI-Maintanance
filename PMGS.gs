function normalizePM(pm) {
  if (!pm) return pm;
  pm.PMNumber = pm.PMNumber || '';
  pm.Title = pm.Title || '';
  pm.MachineID = pm.MachineID || '';
  pm.MachineName = pm.MachineName || '';
  pm.Department = pm.Department || '';
  pm.Section = pm.Section || '';
  pm.Frequency = pm.Frequency || '';
  pm.FrequencyType = pm.FrequencyType || '';
  pm.AssignedTechnician = pm.AssignedTechnician || '';
  pm.AssignedTechnicianName = pm.AssignedTechnicianName || '';
  pm.ChecklistTemplate = pm.ChecklistTemplate || '';
  pm.Priority = pm.Priority || CONFIG.PRIORITY.MEDIUM;
  pm.Status = pm.Status || CONFIG.PM_STATUSES.SCHEDULED;
  pm.StartDate = pm.StartDate || '';
  pm.DueDate = pm.DueDate || '';
  pm.NextDueDate = pm.NextDueDate || '';
  pm.CompletionDate = pm.CompletionDate || '';
  pm.ComplianceStatus = pm.ComplianceStatus || '';
  pm.Remarks = pm.Remarks || '';
  pm.CreatedBy = pm.CreatedBy || '';
  pm.CreatedAt = pm.CreatedAt || '';
  pm.UpdatedBy = pm.UpdatedBy || '';
  pm.UpdatedAt = pm.UpdatedAt || '';
  return pm;
}

function initPMSheet() {
  Logger.log('initPMSheet() called');
  console.log('initPMSheet() called');
  try {
    var pmSheet = getSheet(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE);
    ensureHeaders(pmSheet, CONFIG.PM_FIELDS);
    var historySheet = getSheet(CONFIG.SHEET_NAMES.PM_HISTORY);
    ensureHeaders(historySheet, CONFIG.PM_HISTORY_FIELDS);
    Logger.log('initPMSheet() completed');
    console.log('initPMSheet() completed');
  } catch (e) {
    Logger.log('initPMSheet() ERROR: ' + e.message);
    console.log('initPMSheet() ERROR: ' + e.message);
  }
}

function getPMRecords() {
  Logger.log('getPMRecords() called');
  console.log('getPMRecords() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var result = data.map(function(pm) { return normalizePM(pm); });
    Logger.log('getPMRecords() returning ' + result.length + ' records');
    console.log('getPMRecords() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getPMRecords() ERROR: ' + e.message);
    console.log('getPMRecords() ERROR: ' + e.message);
    return [];
  }
}

function getPMRecord(id) {
  Logger.log('getPMRecord() called: id=' + id);
  console.log('getPMRecord() called: id=' + id);
  try {
    var record = getRecordById(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id);
    var result = normalizePM(record);
    Logger.log('getPMRecord() returning: ' + (result ? result.PMNumber : 'null'));
    console.log('getPMRecord() returning: ' + (result ? 'found' : 'null'));
    return result;
  } catch (e) {
    Logger.log('getPMRecord() ERROR: ' + e.message);
    console.log('getPMRecord() ERROR: ' + e.message);
    return null;
  }
}

function addPMRecord(data) {
  Logger.log('addPMRecord() called');
  console.log('addPMRecord() called');
  try {
    var errors = validatePMData(data);
    if (errors.length > 0) throw new Error(errors.join('\n'));
    data.PMNumber = generateId(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, CONFIG.ID_PREFIXES.PM);
    data.CreatedBy = Session.getActiveUser().getEmail();
    data.CreatedAt = getCurrentTimestamp();
    if (!data.Status) data.Status = CONFIG.PM_STATUSES.SCHEDULED;
    if (data.Frequency && data.FrequencyType) {
      data.NextDueDate = autoGenerateNextPM(data);
    }
    var result = addRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, data);
    logActivity('Add PM Record', data.PMNumber + ' - ' + (data.Title || ''));
    Logger.log('addPMRecord() SUCCESS: ' + data.PMNumber);
    console.log('addPMRecord() SUCCESS: ' + data.PMNumber);
    try { createNotification('PM Created: ' + (data.Title || data.PMNumber), 'Preventive maintenance ' + (data.Title || data.PMNumber) + ' for ' + (data.MachineName || '') + ' has been scheduled.', CONFIG.NOTIFICATION_MODULES.PM, data.Priority || CONFIG.PRIORITY.MEDIUM, data.CreatedBy, data.AssignedTechnicianName || '', "navigateTo('pm')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.PM, CONFIG.AUDIT_ACTIONS.CREATE, data.PMNumber, data.Title || '', '', 'Machine: ' + (data.MachineName || '') + ', Frequency: ' + (data.Frequency || '') + ' ' + (data.FrequencyType || ''), 'Success', 'PM schedule created'); } catch(e) {}
    return result.map(function(pm) { return normalizePM(pm); });
  } catch (e) {
    Logger.log('addPMRecord() ERROR: ' + e.message);
    console.log('addPMRecord() ERROR: ' + e.message);
    throw e;
  }
}

function updatePMRecord(id, data) {
  Logger.log('updatePMRecord() called: id=' + id);
  console.log('updatePMRecord() called: id=' + id);
  try {
    var current = getPMRecord(id);
    if (!current) throw new Error('PM record not found: ' + id);
    var freqChanged = data.Frequency || data.FrequencyType;
    if (freqChanged) {
      var mergedFreq = data.Frequency || current.Frequency;
      var mergedFreqType = data.FrequencyType || current.FrequencyType;
      if (mergedFreq && mergedFreqType) {
        var baseDate = data.StartDate || current.StartDate || data.DueDate || current.DueDate || formatDate(new Date());
        data.NextDueDate = autoGenerateNextPM({ Frequency: mergedFreq, FrequencyType: mergedFreqType, DueDate: baseDate });
      }
    }
    data.UpdatedBy = Session.getActiveUser().getEmail();
    data.UpdatedAt = getCurrentTimestamp();
    var result = updateRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id, data);
    logActivity('Update PM Record', id);
    try {
      var pmAction = (data.Status && data.Status === CONFIG.PM_STATUSES.SKIPPED) ? CONFIG.AUDIT_ACTIONS.CANCEL : CONFIG.AUDIT_ACTIONS.UPDATE;
      createAuditLog(CONFIG.AUDIT_MODULES.PM, pmAction, id, current.Title || '', '', data.Status ? 'Status: ' + data.Status : JSON.stringify(data).substring(0, 150), 'Success', pmAction === CONFIG.AUDIT_ACTIONS.CANCEL ? 'PM schedule cancelled' : 'PM schedule updated');
    } catch(e) {}
    Logger.log('updatePMRecord() SUCCESS: ' + id);
    console.log('updatePMRecord() SUCCESS: ' + id);
    return result.map(function(pm) { return normalizePM(pm); });
  } catch (e) {
    Logger.log('updatePMRecord() ERROR: ' + e.message);
    console.log('updatePMRecord() ERROR: ' + e.message);
    throw e;
  }
}

function deletePMRecord(id) {
  Logger.log('deletePMRecord() called: id=' + id);
  console.log('deletePMRecord() called: id=' + id);
  try {
    var current = getPMRecord(id);
    var result = deleteRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id);
    logActivity('Delete PM Record', id);
    try { createAuditLog(CONFIG.AUDIT_MODULES.PM, CONFIG.AUDIT_ACTIONS.DELETE, id, current ? current.Title : '', '', 'PM record deleted', 'Success', 'PM schedule deleted'); } catch(e) {}
    Logger.log('deletePMRecord() SUCCESS: ' + id);
    console.log('deletePMRecord() SUCCESS: ' + id);
    return result.map(function(pm) { return normalizePM(pm); });
  } catch (e) {
    Logger.log('deletePMRecord() ERROR: ' + e.message);
    console.log('deletePMRecord() ERROR: ' + e.message);
    throw e;
  }
}

function searchPMRecords(query) {
  Logger.log('searchPMRecords() called: query=' + query);
  console.log('searchPMRecords() called: query=' + query);
  try {
    var result = searchData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, query);
    Logger.log('searchPMRecords() returning ' + result.length + ' records');
    console.log('searchPMRecords() returning ' + result.length + ' records');
    return result.map(function(pm) { return normalizePM(pm); });
  } catch (e) {
    Logger.log('searchPMRecords() ERROR: ' + e.message);
    console.log('searchPMRecords() ERROR: ' + e.message);
    return [];
  }
}

function completePM(id, completionData) {
  Logger.log('completePM() called: id=' + id);
  console.log('completePM() called: id=' + id);
  try {
    var current = getPMRecord(id);
    if (!current) throw new Error('PM record not found: ' + id);
    var now = new Date();
    var data = {
      Status: CONFIG.PM_STATUSES.COMPLETED,
      CompletionDate: formatDateTimeISO(now),
      ComplianceStatus: 'On Time',
      UpdatedBy: Session.getActiveUser().getEmail(),
      UpdatedAt: getCurrentTimestamp()
    };
    if (completionData) {
      if (completionData.Remarks) data.Remarks = completionData.Remarks;
      if (completionData.ComplianceStatus) data.ComplianceStatus = completionData.ComplianceStatus;
    }
    if (current.Frequency && current.FrequencyType) {
      data.NextDueDate = autoGenerateNextPM(current);
    }
    var result = updateRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, 'PMNumber', id, data);
    var historyRecord = {
      PMNumber: current.PMNumber,
      Title: current.Title || '',
      MachineName: current.MachineName || '',
      CompletionDate: formatDate(now),
      NextDueDate: data.NextDueDate || '',
      TechnicianName: current.AssignedTechnicianName || '',
      Status: CONFIG.PM_STATUSES.COMPLETED,
      Remarks: data.Remarks || '',
      CreatedBy: Session.getActiveUser().getEmail(),
      CreatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.PM_HISTORY, historyRecord);
    logActivity('Complete PM', id);
    try { createAuditLog(CONFIG.AUDIT_MODULES.PM, CONFIG.AUDIT_ACTIONS.COMPLETE, id, current.Title || '', '', 'Compliance: ' + (data.ComplianceStatus || '') + ', Machine: ' + (current.MachineName || ''), 'Success', 'PM completed'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.PM_DUE, { pmNumber: id, title: current.Title || '', machine: current.MachineName || '', assignedTech: current.AssignedTechnicianName || '', dueDate: current.DueDate || '', frequency: (current.Frequency || '') + ' ' + (current.FrequencyType || ''), techEmail: current.AssignedTechnician || '' }); } catch(e) {}
    Logger.log('completePM() SUCCESS: ' + id);
    console.log('completePM() SUCCESS: ' + id);
    return result.map(function(pm) { return normalizePM(pm); });
  } catch (e) {
    Logger.log('completePM() ERROR: ' + e.message);
    console.log('completePM() ERROR: ' + e.message);
    throw e;
  }
}

function getDuePMs() {
  Logger.log('getDuePMs() called');
  console.log('getDuePMs() called');
  try {
    var all = getPMRecords();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var result = all.filter(function(pm) {
      if (pm.Status !== CONFIG.PM_STATUSES.SCHEDULED && pm.Status !== CONFIG.PM_STATUSES.IN_PROGRESS) return false;
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) return false;
      var d = new Date(due);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d <= today;
    });
    Logger.log('getDuePMs() returning ' + result.length + ' records');
    console.log('getDuePMs() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getDuePMs() ERROR: ' + e.message);
    console.log('getDuePMs() ERROR: ' + e.message);
    return [];
  }
}

function getOverduePMs() {
  Logger.log('getOverduePMs() called');
  console.log('getOverduePMs() called');
  try {
    var all = getPMRecords();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var result = all.filter(function(pm) {
      if (pm.Status === CONFIG.PM_STATUSES.COMPLETED) return false;
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) return false;
      var d = new Date(due);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
    Logger.log('getOverduePMs() returning ' + result.length + ' records');
    console.log('getOverduePMs() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getOverduePMs() ERROR: ' + e.message);
    console.log('getOverduePMs() ERROR: ' + e.message);
    return [];
  }
}

function getUpcomingPMs(days) {
  if (days === undefined || days === null) days = 30;
  Logger.log('getUpcomingPMs() called: days=' + days);
  console.log('getUpcomingPMs() called: days=' + days);
  try {
    var all = getPMRecords();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var future = new Date(today);
    future.setDate(future.getDate() + days);
    var result = all.filter(function(pm) {
      if (pm.Status === CONFIG.PM_STATUSES.COMPLETED) return false;
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) return false;
      var d = new Date(due);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= future;
    });
    Logger.log('getUpcomingPMs() returning ' + result.length + ' records');
    console.log('getUpcomingPMs() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getUpcomingPMs() ERROR: ' + e.message);
    console.log('getUpcomingPMs() ERROR: ' + e.message);
    return [];
  }
}

function getMissedPMs() {
  Logger.log('getMissedPMs() called');
  console.log('getMissedPMs() called');
  try {
    var all = getPMRecords();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var result = all.filter(function(pm) {
      if (pm.Status !== CONFIG.PM_STATUSES.SCHEDULED) return false;
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) return false;
      var d = new Date(due);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
    Logger.log('getMissedPMs() returning ' + result.length + ' records');
    console.log('getMissedPMs() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getMissedPMs() ERROR: ' + e.message);
    console.log('getMissedPMs() ERROR: ' + e.message);
    return [];
  }
}

function getPMCompliance() {
  Logger.log('getPMCompliance() called');
  console.log('getPMCompliance() called');
  try {
    var all = getPMRecords();
    var total = all.length;
    var completed = 0;
    var overdue = 0;
    for (var i = 0; i < all.length; i++) {
      if (all[i].Status === CONFIG.PM_STATUSES.COMPLETED) completed++;
      if (all[i].Status === CONFIG.PM_STATUSES.OVERDUE) overdue++;
    }
    var complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    var result = {
      total: total,
      completed: completed,
      overdue: overdue,
      complianceRate: complianceRate
    };
    Logger.log('getPMCompliance() returning: ' + JSON.stringify(result));
    console.log('getPMCompliance() returning: ' + JSON.stringify(result));
    return result;
  } catch (e) {
    Logger.log('getPMCompliance() ERROR: ' + e.message);
    console.log('getPMCompliance() ERROR: ' + e.message);
    return { total: 0, completed: 0, overdue: 0, complianceRate: 0 };
  }
}

function getPMByMachine(machineId) {
  Logger.log('getPMByMachine() called: machineId=' + machineId);
  console.log('getPMByMachine() called: machineId=' + machineId);
  try {
    var all = getPMRecords();
    var result = all.filter(function(pm) {
      return String(pm.MachineID) === String(machineId);
    });
    Logger.log('getPMByMachine() returning ' + result.length + ' records');
    console.log('getPMByMachine() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getPMByMachine() ERROR: ' + e.message);
    console.log('getPMByMachine() ERROR: ' + e.message);
    return [];
  }
}

function getPMByTechnician(techId) {
  Logger.log('getPMByTechnician() called: techId=' + techId);
  console.log('getPMByTechnician() called: techId=' + techId);
  try {
    var all = getPMRecords();
    var result = all.filter(function(pm) {
      return String(pm.AssignedTechnician) === String(techId);
    });
    Logger.log('getPMByTechnician() returning ' + result.length + ' records');
    console.log('getPMByTechnician() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getPMByTechnician() ERROR: ' + e.message);
    console.log('getPMByTechnician() ERROR: ' + e.message);
    return [];
  }
}

function getPMByDateRange(startDate, endDate) {
  Logger.log('getPMByDateRange() called: start=' + startDate + ', end=' + endDate);
  console.log('getPMByDateRange() called: start=' + startDate + ', end=' + endDate);
  try {
    var all = getPMRecords();
    var start = new Date(startDate);
    var end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Logger.log('getPMByDateRange() invalid dates');
      console.log('getPMByDateRange() invalid dates');
      return [];
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    var result = all.filter(function(pm) {
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) return false;
      var d = new Date(due);
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
    Logger.log('getPMByDateRange() returning ' + result.length + ' records');
    console.log('getPMByDateRange() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getPMByDateRange() ERROR: ' + e.message);
    console.log('getPMByDateRange() ERROR: ' + e.message);
    return [];
  }
}

function getPMSummary() {
  Logger.log('getPMSummary() called');
  console.log('getPMSummary() called');
  try {
    var all = getPMRecords();
    var scheduled = 0;
    var inProgress = 0;
    var completed = 0;
    var overdue = 0;
    var missed = 0;
    for (var i = 0; i < all.length; i++) {
      var s = all[i].Status;
      if (s === CONFIG.PM_STATUSES.SCHEDULED) scheduled++;
      else if (s === CONFIG.PM_STATUSES.IN_PROGRESS) inProgress++;
      else if (s === CONFIG.PM_STATUSES.COMPLETED) completed++;
      else if (s === CONFIG.PM_STATUSES.OVERDUE) overdue++;
      else if (s === CONFIG.PM_STATUSES.MISSED) missed++;
    }
    var total = all.length;
    var complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    var result = {
      scheduled: scheduled,
      inProgress: inProgress,
      completed: completed,
      overdue: overdue,
      missed: missed,
      complianceRate: complianceRate
    };
    Logger.log('getPMSummary() returning: ' + JSON.stringify(result));
    console.log('getPMSummary() returning: ' + JSON.stringify(result));
    return result;
  } catch (e) {
    Logger.log('getPMSummary() ERROR: ' + e.message);
    console.log('getPMSummary() ERROR: ' + e.message);
    return { scheduled: 0, inProgress: 0, completed: 0, overdue: 0, missed: 0, complianceRate: 0 };
  }
}

function getPMCalendarData(year, month) {
  Logger.log('getPMCalendarData() called: year=' + year + ', month=' + month);
  console.log('getPMCalendarData() called: year=' + year + ', month=' + month);
  try {
    var all = getPMRecords();
    var result = [];
    for (var i = 0; i < all.length; i++) {
      var pm = all[i];
      var dueDate = pm.DueDate || pm.NextDueDate;
      if (!dueDate) continue;
      var d = new Date(dueDate);
      if (isNaN(d.getTime())) continue;
      if (d.getFullYear() === year && d.getMonth() === month - 1) {
        result.push({
          date: formatDate(d),
          pmNumber: pm.PMNumber,
          title: pm.Title || '',
          machine: pm.MachineName || '',
          status: pm.Status || ''
        });
      }
    }
    Logger.log('getPMCalendarData() returning ' + result.length + ' entries');
    console.log('getPMCalendarData() returning ' + result.length + ' entries');
    return result;
  } catch (e) {
    Logger.log('getPMCalendarData() ERROR: ' + e.message);
    console.log('getPMCalendarData() ERROR: ' + e.message);
    return [];
  }
}

function getPMHistory() {
  Logger.log('getPMHistory() called');
  console.log('getPMHistory() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.PM_HISTORY) || [];
    Logger.log('getPMHistory() returning ' + data.length + ' records');
    console.log('getPMHistory() returning ' + data.length + ' records');
    return data;
  } catch (e) {
    Logger.log('getPMHistory() ERROR: ' + e.message);
    console.log('getPMHistory() ERROR: ' + e.message);
    return [];
  }
}

function autoGenerateNextPM(data) {
  Logger.log('autoGenerateNextPM() called');
  console.log('autoGenerateNextPM() called');
  try {
    if (!data.Frequency || !data.FrequencyType) {
      Logger.log('autoGenerateNextPM() missing Frequency or FrequencyType');
      console.log('autoGenerateNextPM() missing Frequency or FrequencyType');
      return '';
    }
    var baseDate = data.DueDate || data.StartDate || formatDate(new Date());
    var d = new Date(baseDate);
    if (isNaN(d.getTime())) {
      d = new Date();
    }
    var freq = parseInt(data.Frequency, 10);
    if (isNaN(freq) || freq < 1) freq = 1;
    switch (data.FrequencyType) {
      case CONFIG.FREQUENCY_TYPES[0]:
        d.setDate(d.getDate() + freq);
        break;
      case CONFIG.FREQUENCY_TYPES[1]:
        d.setDate(d.getDate() + (7 * freq));
        break;
      case CONFIG.FREQUENCY_TYPES[2]:
        d.setMonth(d.getMonth() + freq);
        break;
      case CONFIG.FREQUENCY_TYPES[3]:
        d.setMonth(d.getMonth() + (3 * freq));
        break;
      case CONFIG.FREQUENCY_TYPES[4]:
        d.setMonth(d.getMonth() + (6 * freq));
        break;
      case CONFIG.FREQUENCY_TYPES[5]:
        d.setFullYear(d.getFullYear() + freq);
        break;
      default:
        Logger.log('autoGenerateNextPM() unknown FrequencyType: ' + data.FrequencyType);
        console.log('autoGenerateNextPM() unknown FrequencyType: ' + data.FrequencyType);
        return '';
    }
    var result = formatDate(d);
    Logger.log('autoGenerateNextPM() result: ' + result);
    console.log('autoGenerateNextPM() result: ' + result);
    return result;
  } catch (e) {
    Logger.log('autoGenerateNextPM() ERROR: ' + e.message);
    console.log('autoGenerateNextPM() ERROR: ' + e.message);
    return '';
  }
}

function bulkGeneratePMs(templateData) {
  Logger.log('bulkGeneratePMs() called');
  console.log('bulkGeneratePMs() called');
  try {
    if (!templateData || !templateData.machines || !Array.isArray(templateData.machines) || templateData.machines.length === 0) {
      throw new Error('templateData.machines array is required');
    }
    var template = templateData.template || {};
    var machines = templateData.machines;
    var created = [];
    for (var i = 0; i < machines.length; i++) {
      var machine = machines[i];
      var pmData = {
        Title: template.Title || 'PM - ' + (machine.MachineName || ''),
        MachineID: machine.MachineID || '',
        MachineName: machine.MachineName || '',
        Department: machine.Department || template.Department || '',
        Section: machine.Section || template.Section || '',
        Frequency: template.Frequency || '1',
        FrequencyType: template.FrequencyType || CONFIG.FREQUENCY_TYPES[2],
        AssignedTechnician: template.AssignedTechnician || '',
        AssignedTechnicianName: template.AssignedTechnicianName || '',
        ChecklistTemplate: template.ChecklistTemplate || '',
        Priority: template.Priority || CONFIG.PRIORITY.MEDIUM,
        Status: CONFIG.PM_STATUSES.SCHEDULED,
        StartDate: template.StartDate || formatDate(new Date()),
        Remarks: template.Remarks || '',
        CreatedBy: Session.getActiveUser().getEmail(),
        CreatedAt: getCurrentTimestamp()
      };
      pmData.PMNumber = generateId(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, CONFIG.ID_PREFIXES.PM);
      if (pmData.Frequency && pmData.FrequencyType) {
        pmData.DueDate = pmData.StartDate;
        pmData.NextDueDate = autoGenerateNextPM(pmData);
      }
      addRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, pmData);
      created.push(pmData.PMNumber);
    }
    logActivity('Bulk Generate PMs', created.length + ' records: ' + created.join(', '));
    Logger.log('bulkGeneratePMs() SUCCESS: created ' + created.length + ' records');
    console.log('bulkGeneratePMs() SUCCESS: created ' + created.length + ' records');
    return getPMRecords();
  } catch (e) {
    Logger.log('bulkGeneratePMs() ERROR: ' + e.message);
    console.log('bulkGeneratePMs() ERROR: ' + e.message);
    throw e;
  }
}
