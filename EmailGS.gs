function emailInitLogsSheet() {
  Logger.log('emailInitLogsSheet() called');
  console.log('emailInitLogsSheet() called');
  var sheet = getSheet(CONFIG.SHEET_NAMES.EMAIL_LOGS);
  ensureHeaders(sheet, CONFIG.EMAIL_LOGS_FIELDS);
  Logger.log('emailInitLogsSheet() completed');
  console.log('emailInitLogsSheet() completed');
}

function emailEnsureDefaults() {
  Logger.log('emailEnsureDefaults() called');
  console.log('emailEnsureDefaults() called');
  if (getSetting(CONFIG.EMAIL_SETTINGS_KEYS.ENABLED) === null) {
    saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.ENABLED, 'true');
  }
  if (getSetting(CONFIG.EMAIL_SETTINGS_KEYS.SENDER_NAME) === null) {
    saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.SENDER_NAME, CONFIG.EMAIL_DEFAULTS.SENDER_NAME);
  }
  if (getSetting(CONFIG.EMAIL_SETTINGS_KEYS.REPLY_TO) === null) {
    saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.REPLY_TO, CONFIG.EMAIL_DEFAULTS.REPLY_TO);
  }
  if (getSetting(CONFIG.EMAIL_SETTINGS_KEYS.DAILY_SUMMARY_TIME) === null) {
    saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.DAILY_SUMMARY_TIME, CONFIG.EMAIL_DEFAULTS.DAILY_SUMMARY_TIME);
  }
  if (getSetting(CONFIG.EMAIL_SETTINGS_KEYS.WEEKLY_SUMMARY_DAY) === null) {
    saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.WEEKLY_SUMMARY_DAY, CONFIG.EMAIL_DEFAULTS.WEEKLY_SUMMARY_DAY);
  }
  Logger.log('emailEnsureDefaults() completed');
  console.log('emailEnsureDefaults() completed');
}

function emailGetSettings() {
  try {
    emailEnsureDefaults();
    return {
      enabled: getSetting(CONFIG.EMAIL_SETTINGS_KEYS.ENABLED) !== 'false',
      senderName: getSetting(CONFIG.EMAIL_SETTINGS_KEYS.SENDER_NAME) || CONFIG.EMAIL_DEFAULTS.SENDER_NAME,
      replyTo: getSetting(CONFIG.EMAIL_SETTINGS_KEYS.REPLY_TO) || CONFIG.EMAIL_DEFAULTS.REPLY_TO,
      dailySummaryTime: getSetting(CONFIG.EMAIL_SETTINGS_KEYS.DAILY_SUMMARY_TIME) || CONFIG.EMAIL_DEFAULTS.DAILY_SUMMARY_TIME,
      weeklySummaryDay: getSetting(CONFIG.EMAIL_SETTINGS_KEYS.WEEKLY_SUMMARY_DAY) || CONFIG.EMAIL_DEFAULTS.WEEKLY_SUMMARY_DAY
    };
  } catch (e) {
    Logger.log('emailGetSettings() ERROR: ' + e.message);
    console.log('emailGetSettings() ERROR: ' + e.message);
    return {
      enabled: true,
      senderName: CONFIG.EMAIL_DEFAULTS.SENDER_NAME,
      replyTo: CONFIG.EMAIL_DEFAULTS.REPLY_TO,
      dailySummaryTime: CONFIG.EMAIL_DEFAULTS.DAILY_SUMMARY_TIME,
      weeklySummaryDay: CONFIG.EMAIL_DEFAULTS.WEEKLY_SUMMARY_DAY
    };
  }
}

function emailSaveSettings(data) {
  Logger.log('emailSaveSettings() called: ' + JSON.stringify(data));
  console.log('emailSaveSettings() called');
  try {
    var currentUser = data && data.email || '';
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    var isAdmin = false;
    for (var ui = 0; ui < users.length; ui++) {
      if (users[ui].Email === currentUser && (users[ui].IsAdmin === 'TRUE' || users[ui].IsAdmin === true || users[ui].Role === 'Admin')) {
        isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      throw new Error('Only administrators can change email settings.');
    }
    emailEnsureDefaults();
    if (data.hasOwnProperty('enabled')) {
      saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.ENABLED, data.enabled === true || data.enabled === 'true' ? 'true' : 'false');
    }
    if (data.hasOwnProperty('senderName')) {
      saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.SENDER_NAME, String(data.senderName));
    }
    if (data.hasOwnProperty('replyTo')) {
      saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.REPLY_TO, String(data.replyTo));
    }
    if (data.hasOwnProperty('dailySummaryTime')) {
      saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.DAILY_SUMMARY_TIME, String(data.dailySummaryTime));
    }
    if (data.hasOwnProperty('weeklySummaryDay')) {
      saveSetting(CONFIG.EMAIL_SETTINGS_KEYS.WEEKLY_SUMMARY_DAY, String(data.weeklySummaryDay));
    }
    logActivity('Email Settings Updated', JSON.stringify(data));
    try { createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, CONFIG.AUDIT_ACTIONS.UPDATE, 'EmailSettings', 'Email settings changed', '', JSON.stringify(data).substring(0, 200), 'Success', 'Email settings updated'); } catch(e) {}
    return { success: true, settings: emailGetSettings() };
  } catch (e) {
    Logger.log('emailSaveSettings() ERROR: ' + e.message);
    console.log('emailSaveSettings() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function emailGetLogs(filters) {
  Logger.log('emailGetLogs() called');
  console.log('emailGetLogs() called');
  try {
    var allLogs = getAllData(CONFIG.SHEET_NAMES.EMAIL_LOGS) || [];
    var limit = (filters && filters.limit) ? parseInt(filters.limit, 10) : 0;
    var result;
    if (!filters || !filters.module && !filters.status && !filters.recipient) {
      allLogs.sort(function(a, b) { return String(b.DateTime || '').localeCompare(String(a.DateTime || '')); });
      result = allLogs;
    } else {
      var filtered = allLogs.filter(function(log) {
        if (filters.module && log.Module !== filters.module) return false;
        if (filters.status && log.Status !== filters.status) return false;
        if (filters.recipient && log.Recipient !== filters.recipient) return false;
        return true;
      });
      filtered.sort(function(a, b) { return String(b.DateTime || '').localeCompare(String(a.DateTime || '')); });
      result = filtered;
    }
    if (limit > 0 && result.length > limit) {
      result = result.slice(0, limit);
    }
    Logger.log('emailGetLogs() returning ' + result.length + ' records');
    console.log('emailGetLogs() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('emailGetLogs() ERROR: ' + e.message);
    console.log('emailGetLogs() ERROR: ' + e.message);
    return [];
  }
}

function emailGetPanelData() {
  Logger.log('emailGetPanelData() called');
  console.log('emailGetPanelData() called');
  try {
    var stats = emailGetDashboardStats();
    var recentEmails = emailGetLogs({ limit: 10 });
    return {
      stats: stats,
      recentEmails: recentEmails
    };
  } catch (e) {
    Logger.log('emailGetPanelData() ERROR: ' + e.message);
    console.log('emailGetPanelData() ERROR: ' + e.message);
    return { stats: { sentToday: 0, failedToday: 0, pendingToday: 0 }, recentEmails: [] };
  }
}

function emailGetDashboardStats() {
  Logger.log('emailGetDashboardStats() called');
  console.log('emailGetDashboardStats() called');
  try {
    var logs = getAllData(CONFIG.SHEET_NAMES.EMAIL_LOGS) || [];
    var today = new Date();
    var todayStr = today.toISOString().substring(0, 10);
    var sentToday = 0, failedToday = 0, pendingToday = 0;
    logs.forEach(function(log) {
      var logDate = String(log.DateTime || '').substring(0, 10);
      if (logDate === todayStr) {
        if (log.Status === CONFIG.EMAIL_STATUS.SENT) sentToday++;
        else if (log.Status === CONFIG.EMAIL_STATUS.FAILED) failedToday++;
        else if (log.Status === CONFIG.EMAIL_STATUS.PENDING) pendingToday++;
      }
    });
    return { sentToday: sentToday, failedToday: failedToday, pendingToday: pendingToday };
  } catch (e) {
    Logger.log('emailGetDashboardStats() ERROR: ' + e.message);
    console.log('emailGetDashboardStats() ERROR: ' + e.message);
    return { sentToday: 0, failedToday: 0, pendingToday: 0 };
  }
}

function emailLog(recipient, subject, module, refId, status, errorMsg, sentBy) {
  Logger.log('emailLog() called: recipient=' + recipient + ', subject=' + subject + ', module=' + module);
  console.log('emailLog() called: recipient=' + recipient + ', subject=' + subject);
  try {
    emailInitLogsSheet();
    var sheet = getSheet(CONFIG.SHEET_NAMES.EMAIL_LOGS);
    var data = sheet.getDataRange().getValues();
    var maxNum = 0;
    for (var i = 1; i < data.length; i++) {
      var eid = String(data[i][0] || '');
      var num = parseInt(eid.replace('EML', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    var emailId = 'EML' + String(maxNum + 1).padStart(5, '0');
    var row = {};
    CONFIG.EMAIL_LOGS_FIELDS.forEach(function(f, idx) {
      if (idx === 0) row[f] = emailId;
      else if (f === 'DateTime') row[f] = getCurrentTimestamp();
      else if (f === 'Recipient') row[f] = recipient || '';
      else if (f === 'Subject') row[f] = subject || '';
      else if (f === 'Module') row[f] = module || '';
      else if (f === 'ReferenceID') row[f] = refId || '';
      else if (f === 'Status') row[f] = status || CONFIG.EMAIL_STATUS.PENDING;
      else if (f === 'ErrorMessage') row[f] = errorMsg || '';
      else if (f === 'SentBy') row[f] = sentBy || '';
      else row[f] = '';
    });
    addRow(CONFIG.SHEET_NAMES.EMAIL_LOGS, row);
    Logger.log('emailLog() logged email ' + emailId + ' with status ' + status);
    console.log('emailLog() logged email ' + emailId + ' with status ' + status);
    return emailId;
  } catch (e) {
    Logger.log('emailLog() ERROR: ' + e.message);
    console.log('emailLog() ERROR: ' + e.message);
    return '';
  }
}

function emailSendRaw(recipient, subject, htmlBody, senderName, replyTo) {
  Logger.log('emailSendRaw() called: recipient=' + recipient + ', subject=' + subject);
  console.log('emailSendRaw() called: recipient=' + recipient);
  try {
    var settings = emailGetSettings();
    if (settings.enabled === false || settings.enabled === 'false') {
      Logger.log('emailSendRaw(): Email DISABLED, skipping send to ' + recipient);
      console.log('emailSendRaw(): Email DISABLED, skipping');
      return { success: false, status: CONFIG.EMAIL_STATUS.PENDING, message: 'Email disabled' };
    }
    var opts = {
      name: senderName || settings.senderName || CONFIG.EMAIL_DEFAULTS.SENDER_NAME,
      htmlBody: htmlBody,
      noReply: true
    };
    if (replyTo || settings.replyTo) opts.replyTo = replyTo || settings.replyTo;
    MailApp.sendEmail(recipient, subject, '', opts);
    Logger.log('emailSendRaw(): Email sent to ' + recipient);
    console.log('emailSendRaw(): Email sent to ' + recipient);
    return { success: true, status: CONFIG.EMAIL_STATUS.SENT };
  } catch (e) {
    Logger.log('emailSendRaw() ERROR sending to ' + recipient + ': ' + e.message);
    console.log('emailSendRaw() ERROR: ' + e.message);
    return { success: false, status: CONFIG.EMAIL_STATUS.FAILED, message: e.message };
  }
}

function emailSendBulk(recipients, type, data) {
  Logger.log('emailSendBulk() called: type=' + type + ', recipients count=' + recipients.length);
  console.log('emailSendBulk() called: type=' + type);
  var results = [];
  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    var email = typeof r === 'string' ? r : (r.Email || r.email || '');
    if (!email) continue;
    var result = emailSendNotification(type, data, email);
    results.push({ recipient: email, success: result.success, status: result.status });
  }
  Logger.log('emailSendBulk() completed: ' + results.length + ' recipients');
  console.log('emailSendBulk() completed: ' + results.length + ' recipients');
  return results;
}

function emailSendNotification(type, data, overrideRecipient) {
  Logger.log('emailSendNotification() called: type=' + type);
  console.log('emailSendNotification() called: type=' + type);
  try {
    var settings = emailGetSettings();
    if (settings.enabled === false || settings.enabled === 'false') {
      Logger.log('emailSendNotification(): Email disabled, skipping');
      console.log('emailSendNotification(): Email disabled');
      return { success: false, status: CONFIG.EMAIL_STATUS.PENDING, message: 'Email disabled' };
    }
    var templateResult = emailBuildTemplate(type, data);
    if (!templateResult) {
      Logger.log('emailSendNotification(): Unknown template type: ' + type);
      console.log('emailSendNotification(): Unknown template type: ' + type);
      return { success: false, status: CONFIG.EMAIL_STATUS.FAILED, message: 'Unknown template type: ' + type };
    }
    var recipients = [];
    if (overrideRecipient) {
      recipients = [overrideRecipient];
    } else {
      recipients = emailDetermineRecipients(type, data);
    }
    if (recipients.length === 0) {
      Logger.log('emailSendNotification(): No recipients for type=' + type);
      console.log('emailSendNotification(): No recipients');
      return { success: false, status: CONFIG.EMAIL_STATUS.PENDING, message: 'No recipients' };
    }
    var results = [];
    for (var i = 0; i < recipients.length; i++) {
      var emailAddr = typeof recipients[i] === 'string' ? recipients[i] : (recipients[i].Email || recipients[i].email || '');
      if (!emailAddr) continue;
      var sendResult = emailSendRaw(emailAddr, templateResult.subject, templateResult.html, settings.senderName, settings.replyTo);
      var logId = emailLog(emailAddr, templateResult.subject, type, data.refId || data.id || '', sendResult.status, sendResult.message || '', Session.getActiveUser().getEmail());
      results.push({ recipient: emailAddr, success: sendResult.success, status: sendResult.status, logId: logId });
    }
    return { success: results.length > 0, results: results };
  } catch (e) {
    Logger.log('emailSendNotification() ERROR: ' + e.message);
    console.log('emailSendNotification() ERROR: ' + e.message);
    return { success: false, status: CONFIG.EMAIL_STATUS.FAILED, message: e.message };
  }
}

function emailJobCardStatusChange(jobCardNo, eventType, extraData) {
  Logger.log('emailJobCardStatusChange() called: ' + jobCardNo + ', event=' + eventType);
  console.log('emailJobCardStatusChange() called: ' + jobCardNo + ', event=' + eventType);
  try {
    var jc = getJobCard(jobCardNo);
    if (!jc) {
      Logger.log('emailJobCardStatusChange(): Job card not found: ' + jobCardNo);
      return;
    }
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    var sessionEmail = Session.getActiveUser().getEmail();
    var sessionUser = users.find(function(u) { return u.Email === sessionEmail; });
    var sessionName = sessionUser ? sessionUser.Name : sessionEmail;

    // Map assigned technician field to display name(s)
    var techNames = '';
    if (jc.AssignedTechnician) {
      var techList = jc.AssignedTechnician.split(',').map(function(e) { return e.trim(); });
      techNames = techList.map(function(e) {
        var u = users.find(function(u2) { return u2.Email === e; });
        return u ? u.Name : e;
      }).filter(function(n) { return n; }).join(', ');
    }

    var now = formatDateTimeISO(new Date());

    var data = {
      // Unified required fields
      jobCardNo: jc.JobCardNo || '',
      machine: jc.Machine || '',
      section: jc.Section || '',
      department: jc.Department || '',
      complaint: jc.ComplaintDescription || '',
      currentStatus: jc.CurrentStatus || '',
      userName: sessionName,
      technicianName: techNames,
      dateTime: now,
      remarks: jc.FinalRemarks || jc.InitialRemarks || '',

      // Legacy template fields
      priority: jc.Priority || '',
      reportedBy: jc.ComplaintBy || '',
      assignedTechEmail: jc.AssignedTechnician || '',
      complaintByEmail: jc.ComplaintByEmail || '',
      approverEmail: jc.ApprovedBy || '',
      rootCause: jc.RootCause || '',
      correctiveAction: jc.CorrectiveAction || '',
      workingTime: durationToDisplay(jc.WorkingTime || 0),
      totalDuration: durationToDisplay(jc.Downtime || jc.TotalDuration || 0)
    };

    // Merge any event-specific extra data (startedBy, closedBy, approvedBy, etc.)
    if (extraData) {
      for (var key in extraData) {
        if (extraData.hasOwnProperty(key)) data[key] = extraData[key];
      }
    }

    var templateType;
    switch (eventType) {
      case 'OPEN': templateType = CONFIG.EMAIL_TEMPLATE_TYPES.JC_OPENED; break;
      case 'RUNNING': templateType = CONFIG.EMAIL_TEMPLATE_TYPES.JC_STARTED; break;
      case 'CLOSED': templateType = CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED; break;
      case 'PENDING': templateType = CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED; break;
      case 'APPROVED': templateType = CONFIG.EMAIL_TEMPLATE_TYPES.JC_APPROVED; break;
      case 'RETURNED': templateType = CONFIG.EMAIL_TEMPLATE_TYPES.JC_RETURNED; break;
      default:
        Logger.log('emailJobCardStatusChange(): Unknown event type: ' + eventType);
        return;
    }

    emailSendNotification(templateType, data);
  } catch (e) {
    Logger.log('emailJobCardStatusChange() ERROR: ' + e.message);
    console.error('emailJobCardStatusChange() error: ' + e.message);
  }
}

function emailRetryFailed() {
  Logger.log('emailRetryFailed() called');
  console.log('emailRetryFailed() called');
  try {
    var logs = getAllData(CONFIG.SHEET_NAMES.EMAIL_LOGS) || [];
    var retried = 0, succeeded = 0, failed = 0;
    for (var i = 0; i < logs.length; i++) {
      if (logs[i].Status === CONFIG.EMAIL_STATUS.FAILED || logs[i].Status === CONFIG.EMAIL_STATUS.PENDING) {
        var recipient = logs[i].Recipient || '';
        var subject = logs[i].Subject || '';
        var settings = emailGetSettings();
        if (!recipient || !subject) continue;
        var sendResult = emailSendRaw(recipient, subject, 'Retry of previously failed email. Please check the system for details.', settings.senderName, settings.replyTo);
        var newStatus = sendResult.success ? CONFIG.EMAIL_STATUS.SENT : CONFIG.EMAIL_STATUS.FAILED;
        var sheet = getSheet(CONFIG.SHEET_NAMES.EMAIL_LOGS);
        var data = sheet.getDataRange().getValues();
        for (var r = 1; r < data.length; r++) {
          if (String(data[r][0]) === String(logs[i].EmailID)) {
            if (sendResult.success) {
              sheet.getRange(r + 1, 8).setValue(newStatus);
              sheet.getRange(r + 1, 9).setValue('');
            } else {
              sheet.getRange(r + 1, 9).setValue(sendResult.message || '');
            }
            break;
          }
        }
        retried++;
        if (sendResult.success) succeeded++;
        else failed++;
      }
    }
    Logger.log('emailRetryFailed() completed: retried=' + retried + ', succeeded=' + succeeded + ', failed=' + failed);
    console.log('emailRetryFailed() completed: retried=' + retried + ', succeeded=' + succeeded);
    return { retried: retried, succeeded: succeeded, failed: failed };
  } catch (e) {
    Logger.log('emailRetryFailed() ERROR: ' + e.message);
    console.log('emailRetryFailed() ERROR: ' + e.message);
    return { retried: 0, succeeded: 0, failed: 0, error: e.message };
  }
}

function emailDetermineRecipients(type, data) {
  Logger.log('emailDetermineRecipients() called: type=' + type);
  console.log('emailDetermineRecipients() called: type=' + type);
  try {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    var admins = users.filter(function(u) { return u.IsAdmin === 'TRUE' || u.IsAdmin === true || u.Role === 'Admin'; });
    var adminEmails = admins.map(function(u) { return u.Email; }).filter(function(e) { return e && e.indexOf('@') > 0; });
    switch (type) {
      case CONFIG.EMAIL_TEMPLATE_TYPES.JC_OPENED:
      case CONFIG.EMAIL_TEMPLATE_TYPES.JC_ASSIGNED:
      case CONFIG.EMAIL_TEMPLATE_TYPES.JC_STARTED:
      case CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED:
        var recipients = [];
        if (data.assignedTechEmail && data.assignedTechEmail.indexOf('@') > 0) recipients.push(data.assignedTechEmail);
        if (data.complaintByEmail && data.complaintByEmail.indexOf('@') > 0) recipients.push(data.complaintByEmail);
        if (data.approverEmail && data.approverEmail.indexOf('@') > 0) recipients.push(data.approverEmail);
        var supervisors = users.filter(function(u) { return u.Role === 'Supervisor' || u.Role === 'Department Manager'; });
        supervisors.forEach(function(s) { if (s.Email && s.Email.indexOf('@') > 0 && recipients.indexOf(s.Email) === -1) recipients.push(s.Email); });
        adminEmails.forEach(function(e) { if (recipients.indexOf(e) === -1) recipients.push(e); });
        return recipients;

      case CONFIG.EMAIL_TEMPLATE_TYPES.JC_APPROVED:
        var approvRecipients = [];
        if (data.assignedTechEmail && data.assignedTechEmail.indexOf('@') > 0) approvRecipients.push(data.assignedTechEmail);
        if (data.complaintByEmail && data.complaintByEmail.indexOf('@') > 0) approvRecipients.push(data.complaintByEmail);
        var supv = users.filter(function(u) { return u.Role === 'Supervisor' || u.Role === 'Department Manager' || u.Role === 'Maintenance Manager'; });
        supv.forEach(function(s) { if (s.Email && s.Email.indexOf('@') > 0 && approvRecipients.indexOf(s.Email) === -1) approvRecipients.push(s.Email); });
        adminEmails.forEach(function(e) { if (approvRecipients.indexOf(e) === -1) approvRecipients.push(e); });
        return approvRecipients;

      case CONFIG.EMAIL_TEMPLATE_TYPES.PM_DUE:
      case CONFIG.EMAIL_TEMPLATE_TYPES.PM_OVERDUE:
        var pmRecipients = [];
        if (data.techEmail && data.techEmail.indexOf('@') > 0) pmRecipients.push(data.techEmail);
        var maintSup = users.filter(function(u) { return u.Role === 'Supervisor' || u.Role === 'Maintenance Manager' || u.Role === 'Department Manager'; });
        maintSup.forEach(function(s) { if (s.Email && s.Email.indexOf('@') > 0 && pmRecipients.indexOf(s.Email) === -1) pmRecipients.push(s.Email); });
        adminEmails.forEach(function(e) { if (pmRecipients.indexOf(e) === -1) pmRecipients.push(e); });
        return pmRecipients;

      case CONFIG.EMAIL_TEMPLATE_TYPES.LOW_STOCK:
      case CONFIG.EMAIL_TEMPLATE_TYPES.PURCHASE_REQUEST:
        var stockRecipients = [];
        var storeUsers = users.filter(function(u) { return u.Role === 'Store' || u.Role === 'Supervisor' || u.Role === 'Admin'; });
        storeUsers.forEach(function(u) { if (u.Email && u.Email.indexOf('@') > 0 && stockRecipients.indexOf(u.Email) === -1) stockRecipients.push(u.Email); });
        adminEmails.forEach(function(e) { if (stockRecipients.indexOf(e) === -1) stockRecipients.push(e); });
        return stockRecipients;

      case CONFIG.EMAIL_TEMPLATE_TYPES.GOODS_RECEIPT:
        var grRecipients = [];
        var grUsers = users.filter(function(u) { return u.Role === 'Store' || u.Role === 'Supervisor' || u.Role === 'Admin'; });
        grUsers.forEach(function(u) { if (u.Email && u.Email.indexOf('@') > 0 && grRecipients.indexOf(u.Email) === -1) grRecipients.push(u.Email); });
        adminEmails.forEach(function(e) { if (grRecipients.indexOf(e) === -1) grRecipients.push(e); });
        return grRecipients;

      case CONFIG.EMAIL_TEMPLATE_TYPES.USER_CREATED:
      case CONFIG.EMAIL_TEMPLATE_TYPES.PASSWORD_RESET:
        var userRecipients = [];
        if (data.email && data.email.indexOf('@') > 0) userRecipients.push(data.email);
        adminEmails.forEach(function(e) { if (userRecipients.indexOf(e) === -1) userRecipients.push(e); });
        return userRecipients;

      case CONFIG.EMAIL_TEMPLATE_TYPES.DAILY_SUMMARY:
      case CONFIG.EMAIL_TEMPLATE_TYPES.WEEKLY_SUMMARY:
      case CONFIG.EMAIL_TEMPLATE_TYPES.MONTHLY_SUMMARY:
        var summaryRecipients = [];
        var allActive = users.filter(function(u) { return u.Status === CONFIG.STATUS.ACTIVE && u.Email && u.Email.indexOf('@') > 0; });
        allActive.forEach(function(u) { if (summaryRecipients.indexOf(u.Email) === -1) summaryRecipients.push(u.Email); });
        return summaryRecipients;

      default:
        return adminEmails;
    }
  } catch (e) {
    Logger.log('emailDetermineRecipients() ERROR: ' + e.message);
    console.log('emailDetermineRecipients() ERROR: ' + e.message);
    return [];
  }
}

function emailBuildTemplate(type, data) {
  Logger.log('emailBuildTemplate() called: type=' + type);
  console.log('emailBuildTemplate() called: type=' + type);
  switch (type) {
    case CONFIG.EMAIL_TEMPLATE_TYPES.JC_OPENED: return emailTemplateJcOpened(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.JC_ASSIGNED: return emailTemplateJcAssigned(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.JC_STARTED: return emailTemplateJcStarted(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.JC_CLOSED: return emailTemplateJcClosed(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.JC_APPROVED: return emailTemplateJcApproved(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.JC_RETURNED: return emailTemplateJcReturned(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.PM_DUE: return emailTemplatePmDue(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.PM_OVERDUE: return emailTemplatePmOverdue(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.LOW_STOCK: return emailTemplateLowStock(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.PURCHASE_REQUEST: return emailTemplatePurchaseRequest(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.GOODS_RECEIPT: return emailTemplateGoodsReceipt(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.USER_CREATED: return emailTemplateUserCreated(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.PASSWORD_RESET: return emailTemplatePasswordReset(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.DAILY_SUMMARY: return emailTemplateDailySummary(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.WEEKLY_SUMMARY: return emailTemplateWeeklySummary(data);
    case CONFIG.EMAIL_TEMPLATE_TYPES.MONTHLY_SUMMARY: return emailTemplateMonthlySummary(data);
    default: return null;
  }
}

function emailWrapHtml(bodyHtml) {
  var appName = CONFIG.APP_NAME;
  var year = new Date().getFullYear();
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    'body{margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
    '.email-container{max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}' +
    '.email-header{background:linear-gradient(135deg,#1a237e,#283593);padding:24px 32px;text-align:center}' +
    '.email-header h1{margin:8px 0 0;font-size:20px;color:#ffffff;font-weight:600}' +
    '.email-header p{margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7)}' +
    '.email-body{padding:24px 32px;color:#333333;font-size:14px;line-height:1.6}' +
    '.email-body h2{margin:0 0 16px;font-size:18px;color:#1a237e;font-weight:600}' +
    '.email-body table{width:100%;border-collapse:collapse;margin:12px 0}' +
    '.email-body td{padding:8px 10px;border-bottom:1px solid #e8e8e8;font-size:13px}' +
    '.email-body td.label{font-weight:600;color:#555;width:35%;white-space:nowrap}' +
    '.email-body td.value{color:#333}' +
    '.email-alert{background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:12px 16px;margin:12px 0;font-size:13px;color:#856404}' +
    '.email-alert-critical{background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:12px 16px;margin:12px 0;font-size:13px;color:#721c24}' +
    '.email-alert-success{background:#d4edda;border:1px solid #c3e6cb;border-radius:4px;padding:12px 16px;margin:12px 0;font-size:13px;color:#155724}' +
    '.email-footer{background:#f8f9fa;padding:16px 32px;text-align:center;font-size:11px;color:#888;border-top:1px solid #e8e8e8}' +
    '.email-footer p{margin:4px 0}' +
    '.email-btn{display:inline-block;padding:10px 20px;background:#1a237e;color:#ffffff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:500;margin:8px 0}' +
    '.email-divider{border:none;border-top:1px solid #e8e8e8;margin:16px 0}' +
    '@media only screen and (max-width:480px){.email-container{margin:10px}.email-header{padding:16px 20px}.email-body{padding:16px 20px}.email-footer{padding:12px 20px}}' +
    '</style></head><body>' +
    '<div class="email-container">' +
    '<div class="email-header">' +
    '<h1>' + appName + '</h1>' +
    '<p>Factory Maintenance Management System</p>' +
    '</div>' +
    '<div class="email-body">' +
    bodyHtml +
    '</div>' +
    '<div class="email-footer">' +
    '<p>' + appName + '</p>' +
    '<p>This is an automated notification. Please do not reply to this email.</p>' +
    '<p>&copy; ' + year + ' CMMS. All rights reserved.</p>' +
    '</div>' +
    '</div></body></html>';
}

function emailTableRow(label, value) {
  return '<tr><td class="label">' + label + '</td><td class="value">' + (value || '-') + '</td></tr>';
}

function emailTemplateJcOpened(data) {
  var body = '<h2>Job Card Opened</h2>' +
    '<p>A new job card has been opened and requires attention.</p>' +
    '<table>' +
    emailTableRow('Job Card No', data.jobCardNo) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Section', data.section) +
    emailTableRow('Department', data.department) +
    emailTableRow('Complaint', data.complaint) +
    emailTableRow('Current Status', data.currentStatus) +
    emailTableRow('Reported By', data.reportedBy) +
    emailTableRow('User Name', data.userName) +
    emailTableRow('Technician', data.technicianName) +
    emailTableRow('Date/Time', data.dateTime) +
    emailTableRow('Priority', '<strong>' + (data.priority || '') + '</strong>') +
    '</table>';
  if (data.remarks) {
    body += '<div class="email-alert">Remarks: ' + data.remarks + '</div>';
  }
  if (data.priority === 'Critical' || data.priority === 'High') {
    body += '<div class="email-alert-critical">This is a ' + data.priority + ' priority job that requires immediate attention.</div>';
  }
  return { subject: '[CMMS] Job Card Opened: ' + (data.jobCardNo || ''), html: emailWrapHtml(body) };
}

function emailTemplateJcAssigned(data) {
  var body = '<h2>Job Card Assigned</h2>' +
    '<p>A job card has been assigned to a technician.</p>' +
    '<table>' +
    emailTableRow('Job Card No', data.jobCardNo) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Assigned To', data.assignedTech) +
    emailTableRow('Priority', '<strong>' + (data.priority || '') + '</strong>') +
    emailTableRow('Complaint', data.complaint) +
    emailTableRow('Reported By', data.reportedBy) +
    '</table>';
  return { subject: '[CMMS] Job Assigned: ' + (data.jobCardNo || ''), html: emailWrapHtml(body) };
}

function emailTemplateJcStarted(data) {
  var body = '<h2>Job Work Started</h2>' +
    '<p>Work has started on a job card.</p>' +
    '<table>' +
    emailTableRow('Job Card No', data.jobCardNo) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Section', data.section) +
    emailTableRow('Department', data.department) +
    emailTableRow('Complaint', data.complaint) +
    emailTableRow('Current Status', data.currentStatus) +
    emailTableRow('Started By', data.startedBy) +
    emailTableRow('User Name', data.userName) +
    emailTableRow('Technician', data.technicianName) +
    emailTableRow('Date/Time', data.dateTime) +
    emailTableRow('Start Time', data.startTime) +
    emailTableRow('Priority', '<strong>' + (data.priority || '') + '</strong>') +
    '</table>';
  if (data.remarks) {
    body += '<div class="email-alert">Remarks: ' + data.remarks + '</div>';
  }
  return { subject: '[CMMS] Job Started: ' + (data.jobCardNo || ''), html: emailWrapHtml(body) };
}

function emailTemplateJcClosed(data) {
  var body = '<h2>Job Card Closed</h2>' +
    '<p>A job card has been completed and closed.</p>' +
    '<table>' +
    emailTableRow('Job Card No', data.jobCardNo) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Section', data.section) +
    emailTableRow('Department', data.department) +
    emailTableRow('Complaint', data.complaint) +
    emailTableRow('Current Status', data.currentStatus) +
    emailTableRow('Closed By', data.closedBy) +
    emailTableRow('User Name', data.userName) +
    emailTableRow('Technician', data.technicianName) +
    emailTableRow('Date/Time', data.dateTime) +
    emailTableRow('Working Time', data.workingTime) +
    emailTableRow('Total Duration', data.totalDuration) +
    emailTableRow('Root Cause', data.rootCause) +
    emailTableRow('Corrective Action', data.correctiveAction) +
    '</table>';
  if (data.remarks) {
    body += '<div class="email-alert-success">Remarks: ' + data.remarks + '</div>';
  }
  return { subject: '[CMMS] Job Closed: ' + (data.jobCardNo || ''), html: emailWrapHtml(body) };
}

function emailTemplateJcApproved(data) {
  var body = '<h2>Job Card Approved</h2>' +
    '<p>A job card has been approved.</p>' +
    '<table>' +
    emailTableRow('Job Card No', data.jobCardNo) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Section', data.section) +
    emailTableRow('Department', data.department) +
    emailTableRow('Complaint', data.complaint) +
    emailTableRow('Current Status', data.currentStatus) +
    emailTableRow('Approved By', data.approvedBy) +
    emailTableRow('User Name', data.userName) +
    emailTableRow('Technician', data.technicianName) +
    emailTableRow('Date/Time', data.dateTime) +
    emailTableRow('Approval Status', data.approvalStatus) +
    emailTableRow('Total Duration', data.totalDuration) +
    emailTableRow('Root Cause', data.rootCause) +
    '</table>';
  if (data.remarks) {
    body += '<div class="email-alert-success">Remarks: ' + data.remarks + '</div>';
  }
  if (data.approvalRemarks) {
    body += '<div class="email-alert">Approval Remarks: ' + data.approvalRemarks + '</div>';
  }
  return { subject: '[CMMS] Job Approved: ' + (data.jobCardNo || ''), html: emailWrapHtml(body) };
}

function emailTemplateJcReturned(data) {
  var body = '<h2>Job Card Returned</h2>' +
    '<p>A job card has been returned to the technician for revision.</p>' +
    '<table>' +
    emailTableRow('Job Card No', data.jobCardNo) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Section', data.section) +
    emailTableRow('Department', data.department) +
    emailTableRow('Complaint', data.complaint) +
    emailTableRow('Current Status', data.currentStatus) +
    emailTableRow('Returned By', data.returnedBy) +
    emailTableRow('User Name', data.userName) +
    emailTableRow('Technician', data.technicianName) +
    emailTableRow('Date/Time', data.dateTime) +
    emailTableRow('Return Reason', data.returnReason) +
    '</table>';
  if (data.remarks) {
    body += '<div class="email-alert">Remarks: ' + data.remarks + '</div>';
  }
  return { subject: '[CMMS] Job Returned: ' + (data.jobCardNo || ''), html: emailWrapHtml(body) };
}

function emailTemplatePmDue(data) {
  var body = '<h2>Preventive Maintenance Due</h2>' +
    '<div class="email-alert">This PM task is due and requires scheduling.</div>' +
    '<table>' +
    emailTableRow('PM Number', data.pmNumber) +
    emailTableRow('Title', data.title) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Assigned To', data.assignedTech) +
    emailTableRow('Due Date', data.dueDate) +
    emailTableRow('Frequency', data.frequency) +
    '</table>';
  return { subject: '[CMMS] PM Due: ' + (data.title || ''), html: emailWrapHtml(body) };
}

function emailTemplatePmOverdue(data) {
  var body = '<h2>Preventive Maintenance Overdue</h2>' +
    '<div class="email-alert-critical">This PM task is OVERDUE and requires immediate action!</div>' +
    '<table>' +
    emailTableRow('PM Number', data.pmNumber) +
    emailTableRow('Title', data.title) +
    emailTableRow('Machine', data.machine) +
    emailTableRow('Assigned To', data.assignedTech) +
    emailTableRow('Due Date', data.dueDate) +
    emailTableRow('Days Overdue', '<strong style="color:#dc3545">' + (data.daysOverdue || '0') + '</strong>') +
    '</table>';
  return { subject: '[CMMS] PM OVERDUE: ' + (data.title || ''), html: emailWrapHtml(body) };
}

function emailTemplateLowStock(data) {
  var body = '<h2>Low Stock Alert</h2>' +
    '<div class="email-alert-critical">The following spare part has reached or fallen below its minimum stock level.</div>' +
    '<table>' +
    emailTableRow('Part Code', data.partCode) +
    emailTableRow('Part Name', data.partName) +
    emailTableRow('Current Stock', '<strong style="color:#dc3545">' + (data.currentStock || '0') + '</strong>') +
    emailTableRow('Minimum Stock', data.minStock || '0') +
    emailTableRow('Reorder Level', data.reorderLevel || '0') +
    emailTableRow('Unit', data.unit || '') +
    emailTableRow('Store Location', data.storeLocation || '') +
    emailTableRow('Supplier', data.supplier || '') +
    '</table>';
  if (data.actionUrl) {
    body += '<div style="text-align:center"><a href="' + data.actionUrl + '" class="email-btn">View in System</a></div>';
  }
  return { subject: '[CMMS] Low Stock Alert: ' + (data.partName || ''), html: emailWrapHtml(body) };
}

function emailTemplatePurchaseRequest(data) {
  var body = '<h2>Purchase Request</h2>' +
    '<p>A purchase request has been initiated for the following item.</p>' +
    '<table>' +
    emailTableRow('Part Code', data.partCode) +
    emailTableRow('Part Name', data.partName) +
    emailTableRow('Quantity Requested', data.quantity) +
    emailTableRow('Current Stock', data.currentStock) +
    emailTableRow('Requested By', data.requestedBy) +
    emailTableRow('Department', data.department) +
    emailTableRow('Supplier', data.supplier) +
    '</table>';
  if (data.remarks) {
    body += '<div class="email-alert">Remarks: ' + data.remarks + '</div>';
  }
  return { subject: '[CMMS] Purchase Request: ' + (data.partName || ''), html: emailWrapHtml(body) };
}

function emailTemplateGoodsReceipt(data) {
  var body = '<h2>Goods Receipt</h2>' +
    '<p>New goods have been received and recorded in inventory.</p>' +
    '<table>' +
    emailTableRow('GRN No', data.grnNo) +
    emailTableRow('Part Code', data.partCode) +
    emailTableRow('Part Name', data.partName) +
    emailTableRow('Quantity Received', data.quantity) +
    emailTableRow('Supplier', data.supplier) +
    emailTableRow('Invoice No', data.invoiceNo) +
    emailTableRow('PO No', data.poNo) +
    emailTableRow('Received By', data.receivedBy) +
    emailTableRow('Received Date', data.receivedDate) +
    emailTableRow('Total Cost', data.totalCost ? '$' + data.totalCost : '-') +
    '</table>';
  return { subject: '[CMMS] Goods Receipt: ' + (data.grnNo || ''), html: emailWrapHtml(body) };
}

function emailTemplateUserCreated(data) {
  var body = '<h2>User Account Created</h2>' +
    '<div class="email-alert-success">A new user account has been created in the system.</div>' +
    '<table>' +
    emailTableRow('User ID', data.userId) +
    emailTableRow('Name', data.name) +
    emailTableRow('Email', data.email) +
    emailTableRow('Role', data.role) +
    emailTableRow('Department', data.department) +
    emailTableRow('Designation', data.designation) +
    '</table>';
  if (data.tempPassword) {
    body += '<div class="email-alert">Temporary Password: <strong>' + data.tempPassword + '</strong><br>Please change your password after first login.</div>';
  }
  return { subject: '[CMMS] Welcome: ' + (data.name || '') + ' - Account Created', html: emailWrapHtml(body) };
}

function emailTemplatePasswordReset(data) {
  var body = '<h2>Password Reset</h2>' +
    '<p>Your password has been reset as requested.</p>' +
    '<table>' +
    emailTableRow('User ID', data.userId) +
    emailTableRow('Name', data.name) +
    emailTableRow('Email', data.email) +
    '</table>';
  if (data.tempPassword) {
    body += '<div class="email-alert">Your temporary password is: <strong>' + data.tempPassword + '</strong></div>';
  }
  body += '<p>If you did not request this password reset, please contact your system administrator immediately.</p>';
  return { subject: '[CMMS] Password Reset: ' + (data.name || ''), html: emailWrapHtml(body) };
}

function emailTemplateDailySummary(data) {
  var body = '<h2>Daily Summary Report</h2>' +
    '<p>Here is your daily summary for <strong>' + (data.date || 'Today') + '</strong>.</p>' +
    '<table>' +
    emailTableRow('Job Cards Opened', data.jobsOpened || '0') +
    emailTableRow('Job Cards Closed', data.jobsClosed || '0') +
    emailTableRow('Running Jobs', data.runningJobs || '0') +
    emailTableRow('Critical / High Priority', data.criticalJobs || '0') +
    emailTableRow('PMs Completed', data.pmCompleted || '0') +
    emailTableRow('PMs Overdue', data.pmOverdue || '0') +
    emailTableRow('Low Stock Items', data.lowStockItems || '0') +
    emailTableRow('Goods Receipts', data.goodsReceipts || '0') +
    '</table>';
  return { subject: '[CMMS] Daily Summary - ' + (data.date || ''), html: emailWrapHtml(body) };
}

function emailTemplateWeeklySummary(data) {
  var body = '<h2>Weekly Summary Report</h2>' +
    '<p>Here is your weekly summary for the week of <strong>' + (data.weekStart || '') + '</strong> to <strong>' + (data.weekEnd || '') + '</strong>.</p>' +
    '<table>' +
    emailTableRow('Total Job Cards', data.totalJobs || '0') +
    emailTableRow('Jobs Opened', data.jobsOpened || '0') +
    emailTableRow('Jobs Closed', data.jobsClosed || '0') +
    emailTableRow('Jobs Approved', data.jobsApproved || '0') +
    emailTableRow('Running Jobs', data.runningJobs || '0') +
    emailTableRow('Critical Jobs', data.criticalJobs || '0') +
    emailTableRow('PMs Completed', data.pmCompleted || '0') +
    emailTableRow('PMs Overdue', data.pmOverdue || '0') +
    emailTableRow('Breakdowns', data.breakdowns || '0') +
    emailTableRow('Total Downtime', data.totalDowntime || '00:00') +
    emailTableRow('Low Stock Items', data.lowStockItems || '0') +
    emailTableRow('Goods Receipts', data.goodsReceipts || '0') +
    '</table>';
  return { subject: '[CMMS] Weekly Summary - Week ' + (data.weekNumber || ''), html: emailWrapHtml(body) };
}

function emailTemplateMonthlySummary(data) {
  var body = '<h2>Monthly Summary Report</h2>' +
    '<p>Here is your monthly summary for <strong>' + (data.month || '') + '</strong>.</p>' +
    '<table>' +
    emailTableRow('Total Job Cards', data.totalJobs || '0') +
    emailTableRow('Jobs Opened', data.jobsOpened || '0') +
    emailTableRow('Jobs Closed', data.jobsClosed || '0') +
    emailTableRow('Jobs Approved', data.jobsApproved || '0') +
    emailTableRow('Machine Breakdowns', data.breakdowns || '0') +
    emailTableRow('Total Downtime', data.totalDowntime || '00:00') +
    emailTableRow('MTTR (hrs)', data.mttr || '0') +
    emailTableRow('MTBF', data.mtbf || '0') +
    emailTableRow('Machine Availability', (data.availability || '0') + '%') +
    emailTableRow('PMs Completed', data.pmCompleted || '0') +
    emailTableRow('PM Compliance', (data.pmCompliance || '0') + '%') +
    emailTableRow('Low Stock Items', data.lowStockItems || '0') +
    emailTableRow('Purchase Requests', data.purchaseRequests || '0') +
    emailTableRow('Goods Receipts', data.goodsReceipts || '0') +
    emailTableRow('Spare Parts Issued', data.partsIssued || '0') +
    emailTableRow('Total Stock Value', data.totalStockValue ? '$' + data.totalStockValue : '$0') +
    '</table>';
  return { subject: '[CMMS] Monthly Summary - ' + (data.month || ''), html: emailWrapHtml(body) };
}

function emailSendDailySummary() {
  Logger.log('emailSendDailySummary() called');
  console.log('emailSendDailySummary() called');
  try {
    var settings = emailGetSettings();
    if (settings.enabled === false || settings.enabled === 'false') {
      Logger.log('emailSendDailySummary(): Email disabled');
      console.log('emailSendDailySummary(): Email disabled');
      return { success: false, message: 'Email disabled' };
    }
    var dashboard = getDashboardData('today', '');
    var today = new Date();
    var dateStr = today.toISOString().substring(0, 10);
    var data = {
      date: dateStr,
      jobsOpened: dashboard.openJobs || '0',
      jobsClosed: dashboard.closedJobs || '0',
      runningJobs: dashboard.runningJobs || '0',
      criticalJobs: dashboard.criticalJobs || '0',
      pmCompleted: dashboard.pmCompleted || '0',
      pmOverdue: dashboard.pmOverdue || '0',
      lowStockItems: dashboard.lowStockParts || '0',
      goodsReceipts: '0'
    };
    var grData = getAllData(CONFIG.SHEET_NAMES.GOODS_RECEIPT) || [];
    var todayStr = today.toISOString().substring(0, 10);
    data.goodsReceipts = String(grData.filter(function(g) { return String(g.ReceivedDate || '').substring(0, 10) === todayStr; }).length);
    return emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.DAILY_SUMMARY, data);
  } catch (e) {
    Logger.log('emailSendDailySummary() ERROR: ' + e.message);
    console.log('emailSendDailySummary() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function emailSendWeeklySummary() {
  Logger.log('emailSendWeeklySummary() called');
  console.log('emailSendWeeklySummary() called');
  try {
    var settings = emailGetSettings();
    if (settings.enabled === false || settings.enabled === 'false') {
      Logger.log('emailSendWeeklySummary(): Email disabled');
      console.log('emailSendWeeklySummary(): Email disabled');
      return { success: false, message: 'Email disabled' };
    }
    var dashboard = getDashboardData('week', '');
    var today = new Date();
    var weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    var data = {
      weekStart: weekStart.toISOString().substring(0, 10),
      weekEnd: weekEnd.toISOString().substring(0, 10),
      weekNumber: String(Math.ceil((today - new Date(today.getFullYear(), 0, 1)) / 86400000 / 7)),
      totalJobs: dashboard.totalJobCards || '0',
      jobsOpened: dashboard.openJobs || '0',
      jobsClosed: dashboard.closedJobs || '0',
      jobsApproved: dashboard.approvedJobs || '0',
      runningJobs: dashboard.runningJobs || '0',
      criticalJobs: dashboard.criticalJobs || '0',
      pmCompleted: dashboard.pmCompleted || '0',
      pmOverdue: dashboard.pmOverdue || '0',
      breakdowns: '0',
      totalDowntime: formatDurationHours(dashboard.breakdownHours || 0),
      lowStockItems: dashboard.lowStockParts || '0',
      goodsReceipts: '0'
    };
    var allJcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekJcs = allJcs.filter(function(jc) {
      var d = new Date(jc.OpenDateTime || jc.DateTime || jc.DateCreated || '');
      return d >= weekAgo;
    });
    data.breakdowns = String(weekJcs.length);
    return emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.WEEKLY_SUMMARY, data);
  } catch (e) {
    Logger.log('emailSendWeeklySummary() ERROR: ' + e.message);
    console.log('emailSendWeeklySummary() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function emailSendMonthlySummary() {
  Logger.log('emailSendMonthlySummary() called');
  console.log('emailSendMonthlySummary() called');
  try {
    var settings = emailGetSettings();
    if (settings.enabled === false || settings.enabled === 'false') {
      Logger.log('emailSendMonthlySummary(): Email disabled');
      console.log('emailSendMonthlySummary(): Email disabled');
      return { success: false, message: 'Email disabled' };
    }
    var dashboard = getDashboardData('month', '');
    var today = new Date();
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var data = {
      month: monthNames[today.getMonth()] + ' ' + today.getFullYear(),
      totalJobs: dashboard.totalJobCards || '0',
      jobsOpened: dashboard.openJobs || '0',
      jobsClosed: dashboard.closedJobs || '0',
      jobsApproved: dashboard.approvedJobs || '0',
      breakdowns: '0',
      totalDowntime: formatDurationHours(dashboard.breakdownHours || 0),
      mttr: dashboard.mttr || '0',
      mtbf: dashboard.mtbf || '0',
      availability: dashboard.availability || '0',
      pmCompleted: dashboard.pmCompleted || '0',
      pmCompliance: dashboard.pmCompliance || '0',
      lowStockItems: dashboard.lowStockParts || '0',
      purchaseRequests: '0',
      goodsReceipts: '0',
      partsIssued: '0',
      totalStockValue: dashboard.totalStockValue || '0'
    };
    return emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.MONTHLY_SUMMARY, data);
  } catch (e) {
    Logger.log('emailSendMonthlySummary() ERROR: ' + e.message);
    console.log('emailSendMonthlySummary() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}
