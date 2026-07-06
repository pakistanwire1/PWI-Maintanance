function initNotificationsSheet() {
  try {
    var sheet = getSheet(CONFIG.SHEET_NAMES.NOTIFICATIONS);
    ensureHeaders(sheet, CONFIG.NOTIFICATION_FIELDS);
    ensureSheetColumns(sheet, CONFIG.NOTIFICATION_FIELDS);
  } catch (e) {
    console.error('initNotificationsSheet() ERROR: ' + e.message);
  }
}

function getNotifications() {
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
    data.sort(function(a, b) {
      var da = a.CreatedDateTime || '';
      var db = b.CreatedDateTime || '';
      return da > db ? -1 : da < db ? 1 : 0;
    });
    return data;
  } catch (e) {
    console.error('getNotifications() ERROR: ' + e.message);
    return [];
  }
}

function getUserNotifications(email) {
  try {
    if (!email) return getNotifications();
    var user = getUserByEmail(email);
    if (!user) return [];
    var role = (user.Role || '').trim();
    if (role === 'Admin') return getNotifications();
    var all = getNotifications();
    var roleConfig = CONFIG.ROLE_NOTIFICATION_MAP[role];
    if (!roleConfig) return [];
    if (roleConfig.moduleFilter && roleConfig.moduleFilter.length === 0) return [];
    return all.filter(function(n) {
      if (roleConfig.viewAll) return true;
      if (roleConfig.viewApproval && (n.Module === 'Job Card' || n.Module === 'Preventive Maintenance') && (n.NotificationType === 'Approval' || (n.Title && n.Title.toLowerCase().indexOf('approval') > -1))) return true;
      if (roleConfig.viewCritical && n.Priority === 'Critical') return true;
      if (roleConfig.viewCritical && (n.Title && n.Title.toLowerCase().indexOf('breakdown') > -1)) return true;
      if (roleConfig.moduleFilter && roleConfig.moduleFilter.length > 0) {
        if (roleConfig.moduleFilter.indexOf(n.Module) === -1) return false;
      }
      if (roleConfig.fieldCheck) {
        var userEmail = email.toLowerCase();
        var userName = (user.Name || '').toLowerCase();
        var nCreatedBy = (n.CreatedBy || '').toLowerCase();
        var nAssignedTo = (n.AssignedTo || '').toLowerCase();
        var matchEmail = nAssignedTo.indexOf(userEmail) > -1 || nCreatedBy.indexOf(userEmail) > -1;
        var matchName = nAssignedTo.indexOf(userName) > -1 || nCreatedBy.indexOf(userName) > -1;
        if (!matchEmail && !matchName) return false;
      }
      return true;
    });
  } catch (e) {
    console.error('getUserNotifications() ERROR: ' + e.message);
    return [];
  }
}

function getUnreadNotifications(email) {
  try {
    var data = email ? getUserNotifications(email) : getNotifications();
    var unread = data.filter(function(n) {
      return (n.ReadStatus || '').toLowerCase() !== 'read';
    });
    return unread;
  } catch (e) {
    console.error('getUnreadNotifications() ERROR: ' + e.message);
    return [];
  }
}

function getUnreadCount(email) {
  try {
    var data = email ? getUserNotifications(email) : getNotifications();
    var count = 0;
    for (var i = 0; i < data.length; i++) {
      if ((data[i].ReadStatus || '').toLowerCase() !== 'read') count++;
    }
    return count;
  } catch (e) {
    return 0;
  }
}

function getNotificationStats(email) {
  try {
    var data = email ? getUserNotifications(email) : getNotifications();
    var moduleCounts = {};
    var unreadCount = 0;
    var criticalCount = 0;
    var approvalCount = 0;
    for (var i = 0; i < data.length; i++) {
      var mod = data[i].Module || 'Unknown';
      if (!moduleCounts[mod]) moduleCounts[mod] = 0;
      moduleCounts[mod]++;
      if ((data[i].ReadStatus || '').toLowerCase() !== 'read') unreadCount++;
      if (data[i].Priority === 'Critical') criticalCount++;
      if (data[i].NotificationType === 'Approval' || (data[i].Title && data[i].Title.toLowerCase().indexOf('approval') > -1)) approvalCount++;
    }
    return {
      total: data.length,
      unread: unreadCount,
      critical: criticalCount,
      pendingApproval: approvalCount,
      byModule: moduleCounts
    };
  } catch (e) {
    return { total: 0, unread: 0, critical: 0, pendingApproval: 0, byModule: {} };
  }
}

function getLatestNotifications(count, email) {
  try {
    count = count || 10;
    var data = email ? getUserNotifications(email) : getNotifications();
    return data.slice(0, count);
  } catch (e) {
    return [];
  }
}

function getDashboardNotifications(count, email) {
  try {
    count = count || 10;
    var data = email ? getUserNotifications(email) : getNotifications();
    var stats = getNotificationStats(email);
    return {
      data: data.slice(0, count),
      stats: stats
    };
  } catch (e) {
    return { data: [], stats: { total: 0, unread: 0, critical: 0, pendingApproval: 0, byModule: {} } };
  }
}

function createNotification(title, message, module, priority, createdBy, assignedTo, actionURL, notificationType) {
  try {
    var notificationId = generateId(CONFIG.SHEET_NAMES.NOTIFICATIONS, 'NOTIF-');
    var now = new Date();
    if (!notificationType) notificationType = resolveNotificationType(title, module, priority);
    if (!priority) priority = CONFIG.PRIORITY.MEDIUM;
    var data = {
      NotificationID: notificationId,
      Title: title || '',
      Message: message || '',
      Module: module || '',
      NotificationType: notificationType,
      Priority: priority,
      CreatedBy: createdBy || Session.getActiveUser().getEmail(),
      AssignedTo: assignedTo || '',
      CreatedDateTime: formatDateTimeISO(now),
      ReadStatus: 'Unread',
      ActionURL: actionURL || ''
    };
    var result = addRow(CONFIG.SHEET_NAMES.NOTIFICATIONS, data);
    return result;
  } catch (e) {
    console.error('createNotification() ERROR: ' + e.message);
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  }
}

function resolveNotificationType(title, module, priority) {
  title = (title || '').toLowerCase();
  module = module || '';
  priority = priority || '';
  if (priority === 'Critical' || title.indexOf('critical') > -1 || title.indexOf('breakdown') > -1) return 'Critical';
  if (title.indexOf('approval') > -1 || title.indexOf('approve') > -1 || title.indexOf('waiting approval') > -1) return 'Approval';
  if (title.indexOf('overdue') > -1 || title.indexOf('due') > -1 || title.indexOf('reminder') > -1) return 'Reminder';
  if (title.indexOf('low stock') > -1 || title.indexOf('warning') > -1 || title.indexOf('exhausted') > -1 || title.indexOf('pending') > -1 || title.indexOf('escalat') > -1) return 'Warning';
  if (title.indexOf('started') > -1 || title.indexOf('closed') > -1 || title.indexOf('approved') > -1 || title.indexOf('completed') > -1 || title.indexOf('received') > -1 || title.indexOf('accepted') > -1) return 'Success';
  if (title.indexOf('added') > -1 || title.indexOf('created') > -1 || title.indexOf('opened') > -1 || title.indexOf('issued') > -1) return 'Information';
  if (title.indexOf('error') > -1 || title.indexOf('failed') > -1) return 'System';
  if (module === 'System') return 'System';
  if (module === 'Breakdown') return 'Critical';
  if (module === 'Inventory' || module === 'Spare Part') return 'Warning';
  if (module === 'Goods Receipt') return 'Success';
  if (module === 'Preventive Maintenance') return 'Reminder';
  return 'Information';
}

function markNotificationRead(id) {
  try {
    var result = updateRow(CONFIG.SHEET_NAMES.NOTIFICATIONS, 'NotificationID', id, { ReadStatus: 'Read' });
    return result;
  } catch (e) {
    console.error('markNotificationRead() ERROR: ' + e.message);
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  }
}

function markAllNotificationsRead(email) {
  try {
    var sheet = getSheet(CONFIG.SHEET_NAMES.NOTIFICATIONS);
    var range = sheet.getDataRange();
    var values = range.getValues();
    var headers = values[0];
    var statusCol = headers.indexOf('ReadStatus');
    var createdByCol = headers.indexOf('CreatedBy');
    var assignedToCol = headers.indexOf('AssignedTo');
    if (statusCol < 0) {
      return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
    }
    var user = email ? getUserByEmail(email) : null;
    var role = user ? (user.Role || '').trim() : 'Admin';
    for (var i = 1; i < values.length; i++) {
      var shouldMark = false;
      if (role === 'Admin') {
        shouldMark = true;
      } else {
        var rowCreatedBy = (values[i][createdByCol] || '').toString().toLowerCase();
        var rowAssignedTo = (values[i][assignedToCol] || '').toString().toLowerCase();
        var userEmail = (email || '').toLowerCase();
        var userName = (user ? (user.Name || '') : '').toLowerCase();
        if (roleConfigHasFieldCheck(role)) {
          if (rowCreatedBy.indexOf(userEmail) > -1 || rowAssignedTo.indexOf(userEmail) > -1 || rowAssignedTo.indexOf(userName) > -1) {
            shouldMark = true;
          }
        }
      }
      if (shouldMark && (values[i][statusCol] || '').toLowerCase() !== 'read') {
        sheet.getRange(i + 1, statusCol + 1).setValue('Read');
      }
    }
    SpreadsheetApp.flush();
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  } catch (e) {
    console.error('markAllNotificationsRead() ERROR: ' + e.message);
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  }
}

function roleConfigHasFieldCheck(role) {
  var cfg = CONFIG.ROLE_NOTIFICATION_MAP[role];
  return cfg && cfg.fieldCheck ? true : false;
}

function deleteNotification(id) {
  try {
    var result = deleteRow(CONFIG.SHEET_NAMES.NOTIFICATIONS, 'NotificationID', id);
    return result;
  } catch (e) {
    console.error('deleteNotification() ERROR: ' + e.message);
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  }
}

function clearAllNotifications(email) {
  try {
    var sheet = getSheet(CONFIG.SHEET_NAMES.NOTIFICATIONS);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) { return []; }
    var headers = data[0];
    var createdByCol = headers.indexOf('CreatedBy');
    var assignedToCol = headers.indexOf('AssignedTo');
    var user = email ? getUserByEmail(email) : null;
    var role = user ? (user.Role || '').trim() : 'Admin';
    if (role === 'Admin') {
      sheet.deleteRows(2, data.length - 1);
    } else {
      var userEmail = (email || '').toLowerCase();
      var userName = (user ? (user.Name || '') : '').toLowerCase();
      var rowsToDelete = [];
      for (var i = data.length - 1; i >= 1; i--) {
        var rowCreatedBy = (data[i][createdByCol] || '').toString().toLowerCase();
        var rowAssignedTo = (data[i][assignedToCol] || '').toString().toLowerCase();
        var match = rowCreatedBy.indexOf(userEmail) > -1 || rowAssignedTo.indexOf(userEmail) > -1 || rowAssignedTo.indexOf(userName) > -1;
        if (match) {
          sheet.deleteRow(i + 1);
        }
      }
    }
    SpreadsheetApp.flush();
    return [];
  } catch (e) {
    console.error('clearAllNotifications() ERROR: ' + e.message);
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  }
}

function clearOldNotifications(days) {
  try {
    if (!days || days < 1) days = 30;
    var sheet = getSheet(CONFIG.SHEET_NAMES.NOTIFICATIONS);
    var range = sheet.getDataRange();
    var values = range.getValues();
    if (values.length < 2) {
      return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
    }
    var headers = values[0];
    var createdAtCol = headers.indexOf('CreatedDateTime');
    if (createdAtCol < 0) {
      return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
    }
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var deletedCount = 0;
    for (var i = values.length - 1; i >= 1; i--) {
      var created = values[i][createdAtCol];
      if (created) {
        var d = new Date(created);
        if (!isNaN(d.getTime()) && d < cutoff) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
    }
    SpreadsheetApp.flush();
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  } catch (e) {
    console.error('clearOldNotifications() ERROR: ' + e.message);
    return getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  }
}

function formatDateTimeISO(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  var h = ('0' + date.getHours()).slice(-2);
  var mi = ('0' + date.getMinutes()).slice(-2);
  var s = ('0' + date.getSeconds()).slice(-2);
  return y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;
}

function sendEmailNotification(recipient, subject, body) {
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body,
      noReply: true
    });
    return true;
  } catch (e) {
    console.error('Failed to send email: ' + e.message);
    return false;
  }
}

function getUserByEmail(email) {
  try {
    if (!email) return null;
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    for (var i = 0; i < users.length; i++) {
      if ((users[i].Email || '').toLowerCase() === email.toLowerCase()) {
        return users[i];
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getNotificationTypeStats(email) {
  try {
    var data = email ? getUserNotifications(email) : getNotifications();
    var stats = {};
    CONFIG.NOTIFICATION_DISPLAY_TYPES.forEach(function(t) { stats[t] = 0; });
    data.forEach(function(n) {
      var nt = n.NotificationType || 'Information';
      if (stats[nt] !== undefined) stats[nt]++;
    });
    return stats;
  } catch (e) {
    return {};
  }
}

function checkAndNotifyLowStock() {
  try {
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
    var createdCount = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var stock = parseFloat(p.CurrentStock) || 0;
      var min = parseFloat(p.MinimumStock) || 0;
      if (min > 0 && stock <= min) {
        var title = 'Low Stock: ' + (p.PartName || p.PartCode);
        var message = 'Stock level for ' + (p.PartName || p.PartCode) + ' is ' + stock + ', below minimum of ' + min + '.';
        createNotification(title, message, CONFIG.NOTIFICATION_MODULES.SPARE_PART, CONFIG.PRIORITY.HIGH, 'System', '', 'navigateTo(\'spareparts\')', 'Warning');
        var storeUsers = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
        for (var u = 0; u < storeUsers.length; u++) {
          if (storeUsers[u].Role === 'Store' && storeUsers[u].Status === CONFIG.STATUS.ACTIVE && storeUsers[u].Email) {
            sendEmailNotification(storeUsers[u].Email, title, message);
          }
        }
        createdCount++;
      }
    }
    return createdCount;
  } catch (e) {
    return 0;
  }
}

function checkAndNotifyPMDue() {
  try {
    var allPMs = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var future = new Date(today);
    future.setDate(future.getDate() + 7);
    var createdCount = 0;
    for (var i = 0; i < allPMs.length; i++) {
      var pm = allPMs[i];
      if (pm.Status === CONFIG.PM_STATUSES.COMPLETED || pm.Status === CONFIG.STATUS.CLOSED) continue;
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) continue;
      var d = new Date(due);
      if (isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      if (d >= today && d <= future) {
        var title = 'PM Due: ' + (pm.Title || pm.PMNumber);
        var message = 'Preventive maintenance ' + (pm.Title || pm.PMNumber) + ' for ' + (pm.MachineName || '') + ' is due on ' + formatDate(d) + '.';
        createNotification(title, message, CONFIG.NOTIFICATION_MODULES.PM, pm.Priority || CONFIG.PRIORITY.MEDIUM, 'System', pm.AssignedTechnicianName || '', 'navigateTo(\'pm\')', 'Reminder');
        createdCount++;
      }
    }
    return createdCount;
  } catch (e) {
    return 0;
  }
}

function checkAndNotifyPMOverdue() {
  try {
    var allPMs = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var createdCount = 0;
    for (var i = 0; i < allPMs.length; i++) {
      var pm = allPMs[i];
      if (pm.Status === CONFIG.PM_STATUSES.COMPLETED || pm.Status === CONFIG.STATUS.CLOSED) continue;
      var due = pm.DueDate || pm.NextDueDate;
      if (!due) continue;
      var d = new Date(due);
      if (isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      if (d < today) {
        var title = 'PM Overdue: ' + (pm.Title || pm.PMNumber);
        var message = 'Preventive maintenance ' + (pm.Title || pm.PMNumber) + ' for ' + (pm.MachineName || '') + ' was due on ' + formatDate(d) + ' and is now overdue.';
        createNotification(title, message, CONFIG.NOTIFICATION_MODULES.PM, CONFIG.PRIORITY.HIGH, 'System', pm.AssignedTechnicianName || '', 'navigateTo(\'pm\')', 'Reminder');
        createdCount++;
      }
    }
    return createdCount;
  } catch (e) {
    return 0;
  }
}

function checkAndNotifyPendingJobCards() {
  try {
    var allJCs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var now = new Date();
    var createdCount = 0;
    for (var i = 0; i < allJCs.length; i++) {
      var jc = allJCs[i];
      if ((jc.Status || '').toUpperCase() !== 'OPEN') continue;
      var openDt = jc.DateTime || jc.OpenDateTime || jc.CreatedAt;
      if (!openDt) continue;
      var opened = new Date(openDt);
      if (isNaN(opened.getTime())) continue;
      var hoursDiff = (now - opened) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        var title = 'Pending Job Card: ' + (jc.JobCardNo || '');
        var message = 'Job card ' + (jc.JobCardNo || '') + ' for ' + (jc.Machine || '') + ' has been OPEN for more than 24 hours.';
        createNotification(title, message, CONFIG.NOTIFICATION_MODULES.JOBCARD, jc.Priority || CONFIG.PRIORITY.MEDIUM, 'System', jc.AssignedTechnician || '', 'navigateTo(\'jobcards\')', 'Warning');
        createdCount++;
      }
    }
    return createdCount;
  } catch (e) {
    return 0;
  }
}

function checkAndNotifyWaitingApproval() {
  try {
    var allJCs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var createdCount = 0;
    for (var i = 0; i < allJCs.length; i++) {
      var jc = allJCs[i];
      var s = (jc.Status || '').toLowerCase();
      if (s !== 'closed' && s !== 'completed') continue;
      if (jc.ApprovalStatus && (jc.ApprovalStatus.toLowerCase() === 'approved' || jc.ApprovalStatus.toLowerCase() === 'rejected')) continue;
      var title = 'Approval Required: ' + (jc.JobCardNo || '');
      var message = 'Job card ' + (jc.JobCardNo || '') + ' for ' + (jc.Machine || '') + ' is CLOSED and waiting for approval.';
        createNotification(title, message, CONFIG.NOTIFICATION_MODULES.JOBCARD, jc.Priority || CONFIG.PRIORITY.MEDIUM, 'System', '', 'navigateTo(\'jobcards\')', 'Approval');
      createdCount++;
    }
    return createdCount;
  } catch (e) {
    return 0;
  }
}

function checkAndNotifyMachineBreakdown() {
  try {
    var allJCs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var createdCount = 0;
    for (var i = 0; i < allJCs.length; i++) {
      var jc = allJCs[i];
      if ((jc.Status || '').toUpperCase() !== 'RUNNING') continue;
      var priority = (jc.Priority || '').toLowerCase();
      if (priority !== 'critical' && priority !== 'high') continue;
      var title = 'Machine Breakdown: ' + (jc.Machine || '');
      var message = 'Breakdown alert for ' + (jc.Machine || '') + ' - Job card ' + (jc.JobCardNo || '') + ' is RUNNING with ' + jc.Priority + ' priority.';
        createNotification(title, message, CONFIG.NOTIFICATION_MODULES.BREAKDOWN, CONFIG.PRIORITY.CRITICAL, 'System', '', 'navigateTo(\'jobcards\')', 'Critical');
      var admins = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
      for (var a = 0; a < admins.length; a++) {
        if (admins[a].Role === CONFIG.ROLES.ADMIN && admins[a].Status === CONFIG.STATUS.ACTIVE && admins[a].Email) {
          sendEmailNotification(admins[a].Email, title, message);
        }
      }
      createdCount++;
    }
    return createdCount;
  } catch (e) {
    return 0;
  }
}

function runAllChecks() {
  try {
    var lowStock = checkAndNotifyLowStock();
    var pmDue = checkAndNotifyPMDue();
    var pmOverdue = checkAndNotifyPMOverdue();
    var pendingJC = checkAndNotifyPendingJobCards();
    var waitingApproval = checkAndNotifyWaitingApproval();
    var breakdown = checkAndNotifyMachineBreakdown();
    return {
      lowStock: lowStock,
      pmDue: pmDue,
      pmOverdue: pmOverdue,
      pendingJobCards: pendingJC,
      waitingApproval: waitingApproval,
      machineBreakdown: breakdown,
      total: lowStock + pmDue + pmOverdue + pendingJC + waitingApproval + breakdown
    };
  } catch (e) {
    return { lowStock: 0, pmDue: 0, pmOverdue: 0, pendingJobCards: 0, waitingApproval: 0, machineBreakdown: 0, total: 0 };
  }
}
