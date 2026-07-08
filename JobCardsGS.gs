function initJobCardsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  ensureHeaders(sheet, CONFIG.JOBCARD_FIELDS);
  ensureSheetColumns(sheet, CONFIG.JOBCARD_FIELDS);
  formatJobCardsSheet();
}

function normalizeJobCard(jc) {
  if (!jc) return jc;
  // SECTION 1 - JOB OPEN INFORMATION
  jc.JobCardNo = jc.JobCardNo || '';
  jc.OpenDateTime = jc.OpenDateTime || '';
  jc.Section = jc.Section || '';
  jc.Department = jc.Department || '';
  jc.Machine = jc.Machine || '';
  jc.AssetID = jc.AssetID || '';
  jc.ComplaintCategory = jc.ComplaintCategory || '';
  jc.ComplaintBy = jc.ComplaintBy || '';
  jc.ComplaintDescription = jc.ComplaintDescription || '';
  jc.Priority = jc.Priority || '';
  jc.FaultImage = jc.FaultImage || '';
  jc.CreatedBy = jc.CreatedBy || '';
  jc.CreatedAt = jc.CreatedAt || '';
  // SECTION 2 - JOB START INFORMATION
  jc.AssignedTechnician = jc.AssignedTechnician || '';
  jc.StartedBy = jc.StartedBy || '';
  jc.StartDateTime = jc.StartDateTime || '';
  jc.WaitingTime = normalizeDuration(jc.WaitingTime);
  jc.InitialRemarks = jc.InitialRemarks || '';
  jc.MaintenanceTeam = jc.MaintenanceTeam || '';
  // SECTION 3 - JOB CLOSE INFORMATION
  jc.RootCause = jc.RootCause || '';
  jc.CorrectiveAction = jc.CorrectiveAction || '';
  jc.SpareParts = jc.SpareParts || '';
  jc.RepairImage = jc.RepairImage || '';
  jc.FinalRemarks = jc.FinalRemarks || '';
  jc.ClosedBy = jc.ClosedBy || '';
  jc.CloseDateTime = jc.CloseDateTime || '';
  jc.WorkingTime = normalizeDuration(jc.WorkingTime);
  jc.Downtime = normalizeDuration(jc.Downtime);
  jc.TotalDuration = normalizeDuration(jc.TotalDuration);
  jc.BreakdownType = jc.BreakdownType || '';
  // SECTION 3b - JOB PENDING INFORMATION
  jc.PendingDateTime = jc.PendingDateTime || '';
  jc.PendingBy = jc.PendingBy || '';
  jc.PendingRemarks = jc.PendingRemarks || '';
  // SECTION 4 - JOB APPROVAL INFORMATION
  jc.ApprovalStatus = jc.ApprovalStatus || '';
  jc.ApprovedBy = jc.ApprovedBy || '';
  jc.ApprovedDateTime = jc.ApprovedDateTime || '';
  jc.ApprovalRemarks = jc.ApprovalRemarks || '';
  jc.ReturnedBy = jc.ReturnedBy || '';
  jc.ReturnedDateTime = jc.ReturnedDateTime || '';
  jc.ReturnReason = jc.ReturnReason || '';
  jc.UpdatedBy = jc.UpdatedBy || '';
  jc.UpdatedAt = jc.UpdatedAt || '';
  jc.CurrentStatus = jc.CurrentStatus || '';
  // SUPPLEMENTARY FIELDS
  jc.ComplaintByCode = jc.ComplaintByCode || '';
  jc.ComplaintByEmail = jc.ComplaintByEmail || '';
  jc.AssignedTechnicianIDs = jc.AssignedTechnicianIDs || '';

  // Backward compatibility aliases for frontend code
  jc.Status = jc.CurrentStatus;
  jc.DateTime = jc.OpenDateTime;
  jc.OpenTime = jc.OpenDateTime;
  jc.StartTime = jc.StartDateTime;
  jc.CloseTime = jc.CloseDateTime;
  jc.BreakdownTime = normalizeDuration(jc.Downtime || jc.TotalDuration || 0);
  jc.DateCreated = jc.OpenDateTime;
  jc.Remarks = jc.FinalRemarks || jc.InitialRemarks || '';
  jc.PartsUsed = jc.SpareParts;
  jc.ActualWorkingTime = jc.WorkingTime;
  jc.Asset = jc.AssetID;
  return jc;
}

function approveJobCard(id, approvalData) {
  Logger.log('approveJobCard() called: ' + id);
  console.log('approveJobCard() called: ' + id);
  try {
    var current = getJobCard(id);
    if (!current) throw new Error('Job card not found: ' + id);
    var s = (current.CurrentStatus || current.Status || '').toLowerCase();
    if (s !== 'pending') {
      throw new Error('Job card must be in PENDING status before approval.');
    }
    var data = {
      ApprovalStatus: 'Approved',
      ApprovalRemarks: approvalData.ApprovalRemarks || '',
      ApprovedBy: Session.getActiveUser().getEmail(),
      ApprovedDateTime: formatDateTimeISO(new Date()),
      CurrentStatus: 'APPROVED',
      UpdatedBy: Session.getActiveUser().getEmail(),
      UpdatedAt: getCurrentTimestamp()
    };
    var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
    logActivity('Approve Job Card', id + ' -> Approved');
    Logger.log('approveJobCard() SUCCESS: ' + id + ' status=' + data.CurrentStatus);
    console.log('approveJobCard() SUCCESS: ' + id + ' status=' + data.CurrentStatus);
    try { createNotification('Job Approved: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' has been approved.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, data.ApprovedBy, current.ComplaintBy || '', "navigateTo('jobcards')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.APPROVE, id, current.Machine || '', '', 'Approved by: ' + (data.ApprovedBy || ''), 'Success', 'Job approved'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_APPROVED, { jobCardNo: id, machine: current.Machine || '', approvedBy: data.ApprovedBy || '', approvalStatus: 'Approved', totalDuration: durationToDisplay(current.Downtime || current.TotalDuration || 0), rootCause: current.RootCause || '', approvalRemarks: approvalData.ApprovalRemarks || '', assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '' }); } catch(e) {}
    return result.map(function(jc) { return normalizeJobCard(jc); });
  } catch (e) {
    Logger.log('approveJobCard() ERROR: ' + e.message);
    console.log('approveJobCard() ERROR: ' + e.message);
    throw e;
  }
}

function returnJobCard(id, returnData) {
  Logger.log('returnJobCard() called: ' + id);
  console.log('returnJobCard() called: ' + id);
  try {
    var current = getJobCard(id);
    if (!current) throw new Error('Job card not found: ' + id);
    var s = (current.CurrentStatus || current.Status || '').toLowerCase();
    if (s !== 'pending') {
      throw new Error('Job card must be in PENDING status before returning.');
    }
    var currentUser = Session.getActiveUser().getEmail();
    var data = {
      ReturnedBy: currentUser,
      ReturnedDateTime: formatDateTimeISO(new Date()),
      ReturnReason: returnData.ReturnReason || '',
      CurrentStatus: 'RUNNING',
      ApprovalStatus: 'Returned',
      UpdatedBy: currentUser,
      UpdatedAt: getCurrentTimestamp()
    };
    var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
    logActivity('Return Job Card', id + ' returned to technician');
    Logger.log('returnJobCard() SUCCESS: ' + id + ' returned to RUNNING');
    console.log('returnJobCard() SUCCESS: ' + id + ' returned to RUNNING');
    try { createNotification('Job Returned: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' has been returned to technician.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, currentUser, current.AssignedTechnician || '', "navigateTo('startjobcard')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.REJECT, id, current.Machine || '', '', 'Returned by: ' + currentUser + ', Reason: ' + (data.ReturnReason || ''), 'Warning', 'Job returned to technician'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_RETURNED, { jobCardNo: id, machine: current.Machine || '', returnedBy: currentUser, returnReason: data.ReturnReason || '', assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '' }); } catch(e) {}
    return result.map(function(jc) { return normalizeJobCard(jc); });
  } catch (e) {
    Logger.log('returnJobCard() ERROR: ' + e.message);
    console.log('returnJobCard() ERROR: ' + e.message);
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
      CurrentStatus: 'CLOSED',
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
    return (jc.CurrentStatus || jc.Status || '').toLowerCase() === status.toLowerCase();
  }).map(function(jc) { return normalizeJobCard(jc); });
}

function addJobCard(data) {
  var errors = validateJobCardData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  data.JobCardNo = generateJobCardNo();
  var now = formatDateTimeISO(new Date());
  data.OpenDateTime = now;
  data.CurrentStatus = 'OPEN';
  data.WaitingTime = 0;
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();

  // Populate ComplaintByCode and ComplaintByEmail from session user
  var sessionEmail = Session.getActiveUser().getEmail();
  var allUsers = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  var sessionUser = allUsers.find(function(u) { return u.Email === sessionEmail; });
  if (sessionUser) {
    data.ComplaintByCode = sessionUser.EmployeeID || '';
    data.ComplaintByEmail = sessionUser.Email || '';
  }

  // Map AssetID → Machine from Assets sheet
  if (data.AssetID) {
    var allAssets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
    var selectedAsset = allAssets.find(function(a) { return a.AssetID === data.AssetID; });
    if (selectedAsset) {
      if (selectedAsset.MachineName) data.Machine = selectedAsset.MachineName;
      if (!data.Department && selectedAsset.Department) data.Department = selectedAsset.Department;
      if (!data.Section && selectedAsset.Section) data.Section = selectedAsset.Section;
    }
  }

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
  try { createNotification('Job Card Opened: ' + (data.JobCardNo || ''), 'Job card ' + (data.JobCardNo || '') + ' opened for ' + (data.Machine || '') + ' - ' + (data.ComplaintDescription || '').substring(0, 100), CONFIG.NOTIFICATION_MODULES.JOBCARD, data.Priority || CONFIG.PRIORITY.MEDIUM, data.CreatedBy, data.AssignedTechnician || '', "navigateTo('jobcards')"); } catch(e) {}
  try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.OPEN, data.JobCardNo, data.Machine || '', '', 'Priority: ' + (data.Priority || '') + ', Machine: ' + (data.Machine || ''), 'Success', 'Job card opened'); } catch(e) {}
  try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_OPENED, { jobCardNo: data.JobCardNo || '', machine: data.Machine || '', department: data.Department || '', section: data.Section || '', priority: data.Priority || '', complaint: (data.ComplaintDescription || '').substring(0, 200), reportedBy: data.ComplaintBy || '', dateTime: now, assignedTechEmail: data.AssignedTechnician || '', complaintByEmail: data.ComplaintBy || '' }); } catch(e) {}
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function updateJobCard(id, data) {
  var current = getJobCard(id);
  if (!current) throw new Error('Job card not found: ' + id);

  if (data.CurrentStatus === 'RUNNING') {
    data.StartDateTime = formatDateTimeISO(new Date());
    data.StartedBy = data.StartedBy || Session.getActiveUser().getEmail();
    data.WaitingTime = calculateDuration(current.OpenDateTime, data.StartDateTime);
  }

  if (data.CurrentStatus === 'CLOSED' || data.CurrentStatus === 'PENDING') {
    data.CloseDateTime = formatDateTimeISO(new Date());
    data.ClosedBy = data.ClosedBy || Session.getActiveUser().getEmail();
    var startDt = current.StartDateTime || data.StartDateTime;
    var openDt = current.OpenDateTime;
    if (startDt && openDt) {
      data.WaitingTime = data.WaitingTime || current.WaitingTime || calculateDuration(openDt, startDt);
      data.WorkingTime = calculateDuration(startDt, data.CloseDateTime);
      data.Downtime = calculateDuration(openDt, data.CloseDateTime);
      data.TotalDuration = data.Downtime;
    }
    if (data.CurrentStatus === 'PENDING') {
      data.PendingDateTime = data.CloseDateTime;
      data.PendingBy = data.ClosedBy;
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
  if (data.AssignedTechnician && data.AssignedTechnician !== current.AssignedTechnician && data.AssignedTechnician !== '') {
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_ASSIGNED, { jobCardNo: id, machine: current.Machine || '', assignedTech: data.AssignedTechnician, priority: current.Priority || '', complaint: (current.ComplaintDescription || '').substring(0, 200), reportedBy: current.ComplaintBy || '', assignedTechEmail: data.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '' }); } catch(e) {}
  }
  if (data.CurrentStatus === 'RUNNING') {
    try { createNotification('Job Started: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' has been started.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, data.UpdatedBy, current.AssignedTechnician || '', "navigateTo('jobcards')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.START, id, current.Machine || '', '', 'Assigned: ' + (current.AssignedTechnician || ''), 'Success', 'Job started'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_STARTED, { jobCardNo: id, machine: current.Machine || '', startedBy: data.UpdatedBy || '', startTime: data.StartDateTime || '', priority: current.Priority || '', complaint: (current.ComplaintDescription || '').substring(0, 200), assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '' }); } catch(e) {}
  }
  if (data.CurrentStatus === 'PENDING') {
    try { createNotification('Job Pending Review: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' is pending supervisor review.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, data.UpdatedBy, current.AssignedTechnician || '', "navigateTo('pendingjobcard')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.CLOSE, id, current.Machine || '', '', 'Waiting: ' + durationToDisplay(data.WaitingTime || 0) + ', Working: ' + durationToDisplay(data.WorkingTime || 0), 'Success', 'Job closed - pending review'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED, { jobCardNo: id, machine: current.Machine || '', closedBy: data.UpdatedBy || '', workingTime: durationToDisplay(data.WorkingTime || 0), totalDuration: durationToDisplay(data.Downtime || 0), rootCause: current.RootCause || '', correctiveAction: current.CorrectiveAction || '', remarks: current.FinalRemarks || current.InitialRemarks || '', assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '', approverEmail: current.ApprovedBy || '' }); } catch(e) {}
  }
  if (data.CurrentStatus === 'CLOSED') {
    try { createNotification('Job Closed: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' has been closed.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, data.UpdatedBy, current.AssignedTechnician || '', "navigateTo('jobcards')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.CLOSE, id, current.Machine || '', '', 'Waiting: ' + durationToDisplay(data.WaitingTime || 0) + ', Working: ' + durationToDisplay(data.WorkingTime || 0), 'Success', 'Job closed'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED, { jobCardNo: id, machine: current.Machine || '', closedBy: data.UpdatedBy || '', workingTime: durationToDisplay(data.WorkingTime || 0), totalDuration: durationToDisplay(data.Downtime || 0), rootCause: current.RootCause || '', correctiveAction: current.CorrectiveAction || '', remarks: current.FinalRemarks || current.InitialRemarks || '', assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '', approverEmail: current.ApprovedBy || '' }); } catch(e) {}
  }
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function updateJobCardStatus(id, status) {
  var data = { CurrentStatus: status };
  var current = getJobCard(id);
  if (!current) throw new Error('Job card not found: ' + id);

  if (status === 'RUNNING') {
    data.StartDateTime = formatDateTimeISO(new Date());
    data.StartedBy = Session.getActiveUser().getEmail();
    data.WaitingTime = calculateDuration(current.OpenDateTime, data.StartDateTime);
  }

  if (status === 'CLOSED') {
    data.CloseDateTime = formatDateTimeISO(new Date());
    data.ClosedBy = Session.getActiveUser().getEmail();
    var startDt = current.StartDateTime || data.StartDateTime;
    var openDt = current.OpenDateTime;
    if (startDt && openDt) {
      data.WaitingTime = data.WaitingTime || current.WaitingTime || calculateDuration(openDt, startDt);
      data.WorkingTime = calculateDuration(startDt, data.CloseDateTime);
      data.Downtime = calculateDuration(openDt, data.CloseDateTime);
      data.TotalDuration = data.Downtime;
    }
  }

  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var result = updateRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id, data);
  logActivity('Update Job Card Status', id + ' -> ' + status);
  if (status === 'RUNNING') {
    try { createNotification('Job Started: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' has been started.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, data.UpdatedBy, current.AssignedTechnician || '', "navigateTo('jobcards')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.START, id, current.Machine || '', '', 'Status changed to Running', 'Success', 'Job started'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_STARTED, { jobCardNo: id, machine: current.Machine || '', startedBy: data.UpdatedBy || '', startTime: data.StartDateTime || '', priority: current.Priority || '', complaint: (current.ComplaintDescription || '').substring(0, 200), assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '' }); } catch(e) {}
  }
  if (status === 'CLOSED') {
    try { createNotification('Job Closed: ' + id, 'Job card ' + id + ' for ' + (current.Machine || '') + ' has been closed.', CONFIG.NOTIFICATION_MODULES.JOBCARD, current.Priority || CONFIG.PRIORITY.MEDIUM, data.UpdatedBy, current.AssignedTechnician || '', "navigateTo('jobcards')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.CLOSE, id, current.Machine || '', '', 'Status changed to Closed', 'Success', 'Job closed'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED, { jobCardNo: id, machine: current.Machine || '', closedBy: data.UpdatedBy || '', workingTime: durationToDisplay(data.WorkingTime || 0), totalDuration: durationToDisplay(data.Downtime || 0), rootCause: current.RootCause || '', correctiveAction: current.CorrectiveAction || '', remarks: current.Remarks || '', assignedTechEmail: current.AssignedTechnician || '', complaintByEmail: current.ComplaintBy || '', approverEmail: current.ApprovedBy || '' }); } catch(e) {}
  }
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function deleteJobCard(id) {
  var current = getJobCard(id);
  var result = deleteRow(CONFIG.SHEET_NAMES.JOBCARDS, 'JobCardNo', id);
  logActivity('Delete Job Card', id);
  try { createAuditLog(CONFIG.AUDIT_MODULES.JOBCARD, CONFIG.AUDIT_ACTIONS.DELETE, id, current ? current.Machine : '', '', 'Job card deleted', 'Success', 'Job card deleted'); } catch(e) {}
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function searchJobCards(query) {
  var result = searchData(CONFIG.SHEET_NAMES.JOBCARDS, query);
  return result.map(function(jc) { return normalizeJobCard(jc); });
}

function restructureJobCardsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  var range = sheet.getDataRange();
  var data = range.getValues();
  if (data.length < 2) {
    ensureHeaders(sheet, CONFIG.JOBCARD_FIELDS);
    return { migrated: 0, message: 'Sheet was empty — initialized with new headers.' };
  }

  var headers = data[0];
  var oldFieldMap = {};
  for (var c = 0; c < headers.length; c++) {
    oldFieldMap[headers[c]] = c;
  }

  function val(rowIdx, field) {
    var idx = oldFieldMap[field];
    return (idx >= 0 && idx < data[rowIdx].length) ? data[rowIdx][idx] : '';
  }

  var newHeaders = CONFIG.JOBCARD_FIELDS;
  var newData = [newHeaders];

  for (var r = 1; r < data.length; r++) {
    var jcNo = val(r, 'JobCardNo');
    if (!jcNo) continue;

    var openDt = val(r, 'OpenDateTime') || val(r, 'OpenTime') || val(r, 'DateTime') || val(r, 'DateCreated') || '';
    var startDt = val(r, 'StartDateTime') || val(r, 'StartTime') || '';
    var closeDt = val(r, 'CloseDateTime') || val(r, 'CloseTime') || '';
    var waitingStr = durationToDisplay(normalizeDuration(val(r, 'WaitingTime')));
    var workingStr = durationToDisplay(normalizeDuration(val(r, 'WorkingTime')));
    var downtimeStr = durationToDisplay(normalizeDuration(val(r, 'Downtime') || val(r, 'BreakdownTime') || val(r, 'TotalDuration')));
    var statusRaw = val(r, 'Status') || val(r, 'CurrentStatus') || 'OPEN';
    var status = statusRaw.toUpperCase();
    if (['OPEN', 'RUNNING', 'CLOSED', 'APPROVED'].indexOf(status) < 0) status = 'OPEN';

    var remarksVal = val(r, 'Remarks') || '';
    var initialRemarksVal = val(r, 'InitialRemarks') || remarksVal;
    var finalRemarksVal = val(r, 'FinalRemarks') || remarksVal;

    var row = [];
    for (var c = 0; c < newHeaders.length; c++) {
      var h = newHeaders[c];
      switch (h) {
        // SECTION 1 - JOB OPEN INFORMATION
        case 'JobCardNo': row.push(jcNo); break;
        case 'OpenDateTime': row.push(openDt); break;
        case 'Section': row.push(val(r, 'Section')); break;
        case 'Department': row.push(val(r, 'Department')); break;
        case 'Machine': row.push(val(r, 'Machine')); break;
        case 'AssetID': row.push(val(r, 'AssetID') || val(r, 'Asset')); break;
        case 'ComplaintCategory': row.push(val(r, 'ComplaintCategory')); break;
        case 'ComplaintBy': row.push(val(r, 'ComplaintBy')); break;
        case 'ComplaintDescription': row.push(val(r, 'ComplaintDescription')); break;
        case 'Priority': row.push(val(r, 'Priority')); break;
        case 'FaultImage': row.push(val(r, 'FaultImage')); break;
        case 'CreatedBy': row.push(val(r, 'CreatedBy')); break;
        case 'CreatedAt': row.push(val(r, 'CreatedAt')); break;
        // SECTION 2 - JOB START INFORMATION
        case 'AssignedTechnician': row.push(val(r, 'AssignedTechnician')); break;
        case 'StartedBy': row.push(val(r, 'StartedBy')); break;
        case 'StartDateTime': row.push(startDt); break;
        case 'WaitingTime': row.push(waitingStr); break;
        case 'InitialRemarks': row.push(initialRemarksVal); break;
        case 'MaintenanceTeam': row.push(val(r, 'MaintenanceTeam')); break;
        // SECTION 3 - JOB CLOSE INFORMATION
        case 'RootCause': row.push(val(r, 'RootCause')); break;
        case 'CorrectiveAction': row.push(val(r, 'CorrectiveAction')); break;
        case 'SpareParts': row.push(val(r, 'SpareParts') || val(r, 'PartsUsed')); break;
        case 'RepairImage': row.push(val(r, 'RepairImage')); break;
        case 'FinalRemarks': row.push(finalRemarksVal); break;
        case 'ClosedBy': row.push(val(r, 'ClosedBy')); break;
        case 'CloseDateTime': row.push(closeDt); break;
        case 'WorkingTime': row.push(workingStr); break;
        case 'Downtime': row.push(downtimeStr); break;
        case 'TotalDuration': row.push(downtimeStr); break;
        case 'BreakdownType': row.push(val(r, 'BreakdownType')); break;
        // SECTION 3b - JOB PENDING INFORMATION
        case 'PendingDateTime': row.push(val(r, 'PendingDateTime')); break;
        case 'PendingBy': row.push(val(r, 'PendingBy')); break;
        case 'PendingRemarks': row.push(val(r, 'PendingRemarks')); break;
        // SECTION 4 - JOB APPROVAL INFORMATION
        case 'ApprovalStatus': row.push(val(r, 'ApprovalStatus')); break;
        case 'ApprovedBy': row.push(val(r, 'ApprovedBy')); break;
        case 'ApprovedDateTime': row.push(val(r, 'ApprovedDateTime')); break;
        case 'ApprovalRemarks': row.push(val(r, 'ApprovalRemarks')); break;
        case 'ReturnedBy': row.push(val(r, 'ReturnedBy')); break;
        case 'ReturnedDateTime': row.push(val(r, 'ReturnedDateTime')); break;
        case 'ReturnReason': row.push(val(r, 'ReturnReason')); break;
        case 'UpdatedBy': row.push(val(r, 'UpdatedBy')); break;
        case 'UpdatedAt': row.push(val(r, 'UpdatedAt')); break;
        case 'CurrentStatus': row.push(status); break;
        case 'ComplaintByCode': row.push(val(r, 'ComplaintByCode') || val(r, 'EmployeeID') || val(r, 'ComplaintByEmployeeID') || ''); break;
        case 'ComplaintByEmail': row.push(val(r, 'ComplaintByEmail') || val(r, 'ComplaintByMail') || ''); break;
        case 'AssignedTechnicianIDs': row.push(val(r, 'AssignedTechnicianIDs') || val(r, 'AssignedTechIDs') || ''); break;
        default: row.push(''); break;
      }
    }
    newData.push(row);
  }

  sheet.clear();
  var newRange = sheet.getRange(1, 1, newData.length, newHeaders.length);
  newRange.setValues(newData);
  SpreadsheetApp.flush();

  formatJobCardsSheet();

  return { migrated: newData.length - 1, columns: newHeaders.length, message: 'Restructured ' + (newData.length - 1) + ' job cards into ' + newHeaders.length + ' columns.' };
}

function applyDropdownValidation(sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = CONFIG.JOBCARD_FIELDS;

  function getCol(field) { return headers.indexOf(field) + 1; }

  function setDropdown(colIndex, sourceSheetName, sourceCol) {
    var col = colIndex;
    if (col < 1) return;
    var srcSheet = ss.getSheetByName(sourceSheetName);
    if (!srcSheet) return;
    var lastRow = srcSheet.getLastRow();
    if (lastRow < 2) return;
    var range = srcSheet.getRange(sourceCol + '2:' + sourceCol);
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(range, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, col, Math.max(sheet.getLastRow() - 1, 1), 1).setDataValidation(rule);
  }

  function setStaticDropdown(colIndex, values) {
    var col = colIndex;
    if (col < 1) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .build();
    var numRows = Math.max(sheet.getLastRow() - 1, 1);
    sheet.getRange(2, col, numRows, 1).setDataValidation(rule);
  }

  // Master-table sourced dropdowns (column B = name field in each master sheet)
  setDropdown(getCol('Section'),           CONFIG.SHEET_NAMES.SECTIONS,          'B');
  setDropdown(getCol('Department'),         CONFIG.SHEET_NAMES.DEPARTMENTS,       'B');
  setDropdown(getCol('BreakdownType'),      CONFIG.SHEET_NAMES.BREAKDOWN_TYPES,   'B');
  setDropdown(getCol('AssignedTechnician'), CONFIG.SHEET_NAMES.TECHNICIANS,       'B');
  setDropdown(getCol('MaintenanceTeam'),    CONFIG.SHEET_NAMES.MAINTENANCE_TEAMS, 'B');

  // Static-list sourced dropdowns
  setStaticDropdown(getCol('Priority'),        CONFIG.CRITICALITY_LEVELS);
  setStaticDropdown(getCol('CurrentStatus'),   [CONFIG.STATUS.OPEN, CONFIG.STATUS.RUNNING, CONFIG.STATUS.CLOSED, CONFIG.STATUS.PENDING, 'Approved']);
  setStaticDropdown(getCol('ApprovalStatus'),  ['Approved', 'Returned', 'Pending', 'WaitingApproval']);

  SpreadsheetApp.flush();
}

function refreshDropdownValidation() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  if (!sheet) return;
  applyDropdownValidation(sheet);
}

function formatJobCardsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1) return;

  // Freeze header row
  sheet.setFrozenRows(1);

  // ============================================================
  // SECTION GROUP HEADER STYLES
  // ============================================================
  // Each group: [startCol (1-based), endCol (1-based), bgColor, fontColor]
  var groups = [
    { start: 1,  end: 13, bg: '#1a237e', font: '#ffffff' },  // GROUP 1 - JOB OPEN (Dark Blue)
    { start: 14, end: 19, bg: '#e65100', font: '#000000' },  // GROUP 2 - JOB START (Orange)
    { start: 20, end: 30, bg: '#1b5e20', font: '#ffffff' },  // GROUP 3 - JOB CLOSE (Green)
    { start: 31, end: 33, bg: '#f9a825', font: '#000000' },  // GROUP 4 - JOB PENDING (Amber)
    { start: 34, end: 43, bg: '#4a148c', font: '#ffffff' },  // GROUP 5 - JOB APPROVAL (Purple)
    { start: 44, end: 46, bg: '#37474f', font: '#ffffff' }   // SUPPLEMENTARY (Dark Grey)
  ];

  for (var g = 0; g < groups.length; g++) {
    var grp = groups[g];
    var hdrRange = sheet.getRange(1, grp.start, 1, grp.end - grp.start + 1);
    hdrRange.setBackground(grp.bg);
    hdrRange.setFontColor(grp.font);
    hdrRange.setFontWeight('bold');
    hdrRange.setHorizontalAlignment('center');
    hdrRange.setVerticalAlignment('middle');
    hdrRange.setFontSize(10);
  }

  if (lastRow > 1) {
    // ============================================================
    // DATA AREA BASE FORMATTING
    // ============================================================
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    dataRange.setVerticalAlignment('middle');
    dataRange.setHorizontalAlignment('left');
    dataRange.setWrap(true);
    dataRange.setFontSize(9);

    // Thin borders on all cells
    dataRange.setBorder(true, true, true, true, true, true, '#d0d0d0', SpreadsheetApp.BorderStyle.SOLID);

    // ============================================================
    // ALTERNATE ROW COLORS
    // ============================================================
    for (var r = 2; r <= lastRow; r++) {
      var rowRange = sheet.getRange(r, 1, 1, lastCol);
      rowRange.setBackground((r - 2) % 2 === 0 ? '#f8f9fa' : '#ffffff');
    }

    // ============================================================
    // STATUS BADGE ON CurrentStatus COLUMN (col 37)
    // ============================================================
    var statusCol = CONFIG.JOBCARD_FIELDS.indexOf('CurrentStatus') + 1;
    if (statusCol > 0) {
      var statusStyles = {
        'OPEN':     { bg: '#22c55e', font: '#ffffff' },
        'RUNNING':  { bg: '#6366f1', font: '#ffffff' },
        'CLOSED':   { bg: '#f97316', font: '#ffffff' },
        'PENDING':  { bg: '#a855f7', font: '#ffffff' },
        'APPROVED': { bg: '#10b981', font: '#ffffff' }
      };
      for (var r = 2; r <= lastRow; r++) {
        var status = (sheet.getRange(r, statusCol).getValue() || '').toString().toUpperCase();
        var style = statusStyles[status] || { bg: '#ffffff', font: '#000000' };
        var cell = sheet.getRange(r, statusCol);
        cell.setBackground(style.bg);
        cell.setFontColor(style.font);
        cell.setFontWeight('bold');
        cell.setHorizontalAlignment('center');
      }
    }

    // ============================================================
    // DATE & TIME COLUMN FORMATTING
    // ============================================================
    var dateFieldNames = ['OpenDateTime', 'StartDateTime', 'CloseDateTime',
                          'PendingDateTime', 'ApprovedDateTime', 'ReturnedDateTime',
                          'CreatedAt', 'UpdatedAt'];
    for (var d = 0; d < dateFieldNames.length; d++) {
      var colIdx = CONFIG.JOBCARD_FIELDS.indexOf(dateFieldNames[d]) + 1;
      if (colIdx > 0) {
        try {
          sheet.getRange(2, colIdx, lastRow - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        } catch(e) {}
      }
    }
  }

  // ============================================================
  // COLUMN WIDTHS
  // ============================================================
  sheet.autoResizeColumns(1, lastCol);

  var minWidths = {
    1: 130, 2: 165, 3: 100, 4: 130, 5: 130, 6: 110,
    7: 130, 8: 130, 9: 280, 10: 85, 11: 100, 12: 130,
    13: 165, 14: 140, 15: 130, 16: 165, 17: 90, 18: 220,
    19: 130, 20: 180, 21: 240, 22: 180, 23: 100, 24: 220,
    25: 130, 26: 165, 27: 95, 28: 95, 29: 95, 30: 130,
    31: 165, 32: 130, 33: 220,
    34: 110, 35: 130, 36: 165, 37: 220,
    38: 130, 39: 165, 40: 220,
    41: 130, 42: 165, 43: 110,
    44: 120, 45: 200, 46: 160
  };
  for (var c = 1; c <= lastCol; c++) {
    if (minWidths[c]) {
      try {
        if (sheet.getColumnWidth(c) < minWidths[c]) {
          sheet.setColumnWidth(c, minWidths[c]);
        }
      } catch(e) {}
    }
  }

  applyDropdownValidation(sheet);

  SpreadsheetApp.flush();
}
