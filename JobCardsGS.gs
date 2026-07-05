function initJobCardsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  var allHeaders = CONFIG.JOBCARD_FIELDS.concat([
    'DateCreated', 'BreakdownType', 'MaintenanceTeam',
    'StartedBy', 'InitialRemarks', 'ClosedBy',
    'PartsUsed', 'FinalRemarks', 'TotalDuration', 'ActualWorkingTime',
    'OpenDateTime', 'StartDateTime', 'CloseDateTime', 'Downtime', 'Asset',
    'RootCause', 'CorrectiveAction', 'SpareParts'
  ]);
  ensureHeaders(sheet, allHeaders);
  ensureApprovalColumns();
  migrateJobCardsColumns();
}

function ensureApprovalColumns() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  var approvalCols = ['ApprovedBy', 'ApprovedDateTime', 'ApprovalStatus', 'ApprovalRemarks'];
  ensureSheetColumns(sheet, CONFIG.JOBCARD_FIELDS);
}

function migrateJobCardsColumns() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  var range = sheet.getDataRange();
  var data = range.getValues();
  if (data.length < 2) return;
  var headers = data[0];
  var dateIdx = headers.indexOf('Date');
  var timeIdx = headers.indexOf('Time');
  var dateCreatedIdx = headers.indexOf('DateCreated');
  var openDtIdx = headers.indexOf('OpenDateTime');
  var dateTimeIdx = headers.indexOf('DateTime');
  var totalDurIdx = headers.indexOf('TotalDuration');
  var downtimeIdx = headers.indexOf('Downtime');
  var breakdownIdx = headers.indexOf('BreakdownTime');
  var actualWtIdx = headers.indexOf('ActualWorkingTime');
  var workingTimeIdx = headers.indexOf('WorkingTime');

  if (dateIdx >= 0 && timeIdx >= 0 && dateTimeIdx >= 0) {
    for (var i = 1; i < data.length; i++) {
      var dateVal = data[i][dateIdx];
      var timeVal = data[i][timeIdx];
      var existingDt = data[i][dateTimeIdx];
      if (dateVal && !existingDt) {
        try {
          var d = new Date(dateVal);
          if (timeVal) {
            var t = String(timeVal);
            var parts = t.match(/(\d+):(\d+)(?::(\d+))?(?:\s*(AM|PM))?/i);
            if (parts) {
              var h = parseInt(parts[1]);
              var m = parseInt(parts[2]);
              var s = parts[3] ? parseInt(parts[3]) : 0;
              if (parts[4] && parts[4].toUpperCase() === 'PM' && h < 12) h += 12;
              if (parts[4] && parts[4].toUpperCase() === 'AM' && h === 12) h = 0;
              d.setHours(h, m, s);
            }
          }
          if (!isNaN(d.getTime())) {
            sheet.getRange(i + 1, dateTimeIdx + 1).setValue(d.toISOString());
          }
        } catch (e) {
          console.log('migrateJobCardsColumns: Date/Time merge failed row ' + (i + 1) + ': ' + e.message);
        }
      }
    }
  }

  if (dateCreatedIdx >= 0 && dateTimeIdx >= 0) {
    for (var i = 1; i < data.length; i++) {
      var dcVal = data[i][dateCreatedIdx];
      var dtVal = data[i][dateTimeIdx];
      if (dcVal && !dtVal) {
        try {
          var d = new Date(dcVal);
          if (!isNaN(d.getTime())) {
            sheet.getRange(i + 1, dateTimeIdx + 1).setValue(d.toISOString());
          }
        } catch (e) {
          console.log('migrateJobCardsColumns: DateCreated→DateTime failed row ' + (i + 1) + ': ' + e.message);
        }
      }
    }
  }

  if (openDtIdx >= 0 && dateTimeIdx >= 0) {
    for (var i = 1; i < data.length; i++) {
      var odtVal = data[i][openDtIdx];
      var dtVal = data[i][dateTimeIdx];
      if (odtVal && !dtVal) {
        sheet.getRange(i + 1, dateTimeIdx + 1).setValue(odtVal);
      }
    }
  }

  if (totalDurIdx >= 0 && breakdownIdx >= 0) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][totalDurIdx] && !data[i][breakdownIdx]) {
        sheet.getRange(i + 1, breakdownIdx + 1).setValue(data[i][totalDurIdx]);
      }
    }
  }
  if (downtimeIdx >= 0 && breakdownIdx >= 0) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][downtimeIdx] && !data[i][breakdownIdx]) {
        sheet.getRange(i + 1, breakdownIdx + 1).setValue(data[i][downtimeIdx]);
      }
    }
  }

  if (actualWtIdx >= 0 && workingTimeIdx >= 0) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][actualWtIdx] && !data[i][workingTimeIdx]) {
        sheet.getRange(i + 1, workingTimeIdx + 1).setValue(data[i][actualWtIdx]);
      }
    }
  }

  SpreadsheetApp.flush();
  console.log('migrateJobCardsColumns: migration complete');
}

function normalizeJobCard(jc) {
  if (!jc) return jc;
  jc.DateTime = jc.DateTime || jc.OpenDateTime || jc.DateCreated || '';
  jc.OpenTime = jc.OpenTime || jc.OpenDateTime || '';
  jc.StartTime = jc.StartTime || jc.StartDateTime || '';
  jc.CloseTime = jc.CloseTime || jc.CloseDateTime || '';
  jc.BreakdownTime = jc.BreakdownTime || jc.Downtime || jc.TotalDuration || '0';
  jc.AssetID = jc.AssetID || jc.Asset || '';
  jc.WorkingTime = jc.WorkingTime || jc.ActualWorkingTime || '0';
  jc.WaitingTime = jc.WaitingTime || '0';
  jc.Section = jc.Section || '';
  jc.Department = jc.Department || '';
  jc.Machine = jc.Machine || '';
  jc.ComplaintCategory = jc.ComplaintCategory || '';
  jc.ComplaintBy = jc.ComplaintBy || '';
  jc.ComplaintDescription = jc.ComplaintDescription || '';
  jc.Priority = jc.Priority || '';
  jc.FaultImage = jc.FaultImage || '';
  jc.RepairImage = jc.RepairImage || '';
  jc.Remarks = jc.Remarks || jc.FinalRemarks || '';
  jc.AssignedTechnician = jc.AssignedTechnician || '';
  jc.Status = jc.Status || '';
  jc.RootCause = jc.RootCause || '';
  jc.CorrectiveAction = jc.CorrectiveAction || '';
  jc.SpareParts = jc.SpareParts || jc.PartsUsed || '';
  jc.ApprovedBy = jc.ApprovedBy || '';
  jc.ApprovedDateTime = jc.ApprovedDateTime || '';
  jc.ApprovalStatus = jc.ApprovalStatus || '';
  jc.ApprovalRemarks = jc.ApprovalRemarks || '';
  jc.CreatedBy = jc.CreatedBy || '';
  jc.CreatedAt = jc.CreatedAt || '';
  jc.UpdatedBy = jc.UpdatedBy || '';
  jc.UpdatedAt = jc.UpdatedAt || '';
  return jc;
}

function approveJobCard(id, approvalData) {
  Logger.log('approveJobCard() called: ' + id);
  console.log('approveJobCard() called: ' + id);
  try {
    var current = getJobCard(id);
    if (!current) throw new Error('Job card not found: ' + id);
    if (current.Status !== 'CLOSED' && current.Status !== 'Completed') {
      throw new Error('Job card must be in CLOSED/COMPLETED status before approval.');
    }
    var isApproved = approvalData.ApprovalStatus === 'Approved';
    var data = {
      ApprovalStatus: approvalData.ApprovalStatus || 'Approved',
      ApprovalRemarks: approvalData.ApprovalRemarks || '',
      ApprovedBy: Session.getActiveUser().getEmail(),
      ApprovedDateTime: formatDateTimeISO(new Date()),
      Status: isApproved ? 'Approved' : 'In Progress',
      UpdatedBy: Session.getActiveUser().getEmail(),
      UpdatedAt: getCurrentTimestamp()
    };
    if (isApproved) {
      data.CloseTime = data.CloseTime || current.CloseTime || formatDateTimeISO(new Date());
    }
    var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
    logActivity('Approve Job Card', id + ' -> ' + approvalData.ApprovalStatus);
    Logger.log('approveJobCard() SUCCESS: ' + id + ' status=' + data.Status);
    console.log('approveJobCard() SUCCESS: ' + id + ' status=' + data.Status);
    return result.map(function(jc) { return normalizeJobCard(jc); });
  } catch (e) {
    Logger.log('approveJobCard() ERROR: ' + e.message);
    console.log('approveJobCard() ERROR: ' + e.message);
    throw e;
  }
}

function unlockJobCard(id) {
  Logger.log('unlockJobCard() called: ' + id);
  console.log('unlockJobCard() called: ' + id);
  try {
    var current = getJobCard(id);
    if (!current) throw new Error('Job card not found: ' + id);
    var currentUser = Session.getActiveUser().getEmail();
    var users = getAllData(CONFIG.SHEET_NAMES.USERS);
    var user = users.find(function(u) { return u.Email === currentUser; });
    if (!user || (user.Role !== 'Admin' && user.IsAdmin !== 'TRUE')) {
      throw new Error('Only Admin can unlock an approved job card.');
    }
    var data = {
      Status: 'CLOSED',
      ApprovedBy: '',
      ApprovedDateTime: '',
      ApprovalStatus: '',
      ApprovalRemarks: '',
      UpdatedBy: currentUser,
      UpdatedAt: getCurrentTimestamp()
    };
    var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
    logActivity('Unlock Job Card', id);
    Logger.log('unlockJobCard() SUCCESS: ' + id);
    console.log('unlockJobCard() SUCCESS: ' + id);
    return result.map(function(jc) { return normalizeJobCard(jc); });
  } catch (e) {
    Logger.log('unlockJobCard() ERROR: ' + e.message);
    console.log('unlockJobCard() ERROR: ' + e.message);
    throw e;
  }
}

function canApproveJobCard() {
  var userEmail = Session.getActiveUser().getEmail();
  var users = getAllData(CONFIG.SHEET_NAMES.USERS);
  var user = users.find(function(u) { return u.Email === userEmail; });
  if (!user) return false;
  if (user.Role === 'Admin' || user.IsAdmin === 'TRUE') return true;
  return getPermValue(user.CanApproveJobCard);
}

function getJobCards() {
  var data = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  return data.map(function(jc) { return normalizeJobCard(jc); });
}

function getJobCard(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id);
  return normalizeJobCard(record);
}

function getJobCardsByStatus(status) {
  var data = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  return data.filter(function(jc) {
    return (jc.Status || '').toLowerCase() === status.toLowerCase();
  }).map(function(jc) { return normalizeJobCard(jc); });
}

function addJobCard(data) {
  var errors = validateJobCardData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  data.JobCardNo = generateJobCardNo();
  var now = formatDateTimeISO(new Date());
  data.DateTime = now;
  data.OpenTime = now;
  data.DateCreated = now;
  data.Status = 'OPEN';
  data.WaitingTime = '00:00';
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();

  if (data.FaultImage && data.FaultImage.indexOf('base64') !== -1) {
    try {
      data.FaultImage = saveImageToDrive(data.FaultImage, 'CMMS_JobCard_Images', data.JobCardNo + '_fault.png');
    } catch (e) {
      console.error('Fault image upload failed: ' + e.message);
      data.FaultImage = '';
    }
  }

  var result = addRow(CONFIG.SHEET_NAMES.JOBCARDS, data);
  logActivity('Add Job Card', data.JobCardNo);
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function updateJobCard(id, data) {
  var current = getJobCard(id);
  if (!current) throw new Error('Job card not found: ' + id);

  if (data.Status === CONFIG.STATUS.RUNNING) {
    data.StartTime = formatDateTimeISO(new Date());
    data.WaitingTime = calculateDuration(current.OpenTime || current.DateTime, data.StartTime);
  }

  if (data.Status === CONFIG.STATUS.CLOSED) {
    data.CloseTime = formatDateTimeISO(new Date());
    var startDt = current.StartTime || data.StartTime;
    var openDt = current.OpenTime || current.DateTime;
    if (startDt && openDt) {
      data.WaitingTime = data.WaitingTime || current.WaitingTime || calculateDuration(openDt, startDt);
      data.WorkingTime = calculateDuration(startDt, data.CloseTime);
      data.BreakdownTime = (parseFloat(data.WaitingTime) || 0) + (parseFloat(data.WorkingTime) || 0);
    }
  }

  if (data.RepairImage && data.RepairImage.indexOf('base64') !== -1) {
    try {
      data.RepairImage = saveImageToDrive(data.RepairImage, 'CMMS_JobCard_Images', id + '_repair.png');
    } catch (e) {
      console.error('Repair image upload failed: ' + e.message);
      data.RepairImage = '';
    }
  }

  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
  logActivity('Update Job Card', id);
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function updateJobCardStatus(id, status) {
  var data = { Status: status };
  var current = getJobCard(id);
  if (!current) throw new Error('Job card not found: ' + id);

  if (status === CONFIG.STATUS.RUNNING) {
    data.StartTime = formatDateTimeISO(new Date());
    data.WaitingTime = calculateDuration(current.OpenTime || current.DateTime, data.StartTime);
  }

  if (status === CONFIG.STATUS.CLOSED) {
    data.CloseTime = formatDateTimeISO(new Date());
    var startDt = current.StartTime || data.StartTime;
    var openDt = current.OpenTime || current.DateTime;
    if (startDt && openDt) {
      data.WaitingTime = data.WaitingTime || current.WaitingTime || calculateDuration(openDt, startDt);
      data.WorkingTime = calculateDuration(startDt, data.CloseTime);
      data.BreakdownTime = (parseFloat(data.WaitingTime) || 0) + (parseFloat(data.WorkingTime) || 0);
    }
  }

  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
  logActivity('Update Job Card Status', id + ' -> ' + status);
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function deleteJobCard(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id);
  logActivity('Delete Job Card', id);
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function searchJobCards(query) {
  var result = searchData(CONFIG.SHEET_NAMES.JOBCARDS, query);
  return result.map(function(jc) { return normalizeJobCard(jc); });
}
