function sendEmailNotification(recipient, subject, body) {
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body,
      noReply: true
    });
    logActivity('Email Sent', 'To: ' + recipient + ', Subject: ' + subject);
    return true;
  } catch (e) {
    console.error('Failed to send email: ' + e.message);
    return false;
  }
}

function notifyJobCardAssignment(jobCardNo, machine, technicianEmail, technicianName) {
  var subject = 'Job Card Assigned: ' + jobCardNo;
  var body = 'Dear ' + technicianName + ',\n\n' +
    'A new job card has been assigned to you.\n\n' +
    'Job Card No: ' + jobCardNo + '\n' +
    'Machine: ' + machine + '\n\n' +
    'Please check the system for details.\n\n' +
    'Regards,\n' + CONFIG.APP_NAME;
  return sendEmailNotification(technicianEmail, subject, body);
}

function notifyJobCardStatusChange(jobCardNo, newStatus, requesterEmail) {
  var subject = 'Job Card Status Update: ' + jobCardNo;
  var body = 'Job Card ' + jobCardNo + ' has been updated to "' + newStatus + '".\n\n' +
    'Please check the system for details.\n\n' +
    'Regards,\n' + CONFIG.APP_NAME;
  return sendEmailNotification(requesterEmail, subject, body);
}

function notifyPMOverdue(pmNumber, machine, technicianEmail) {
  var subject = 'PM Overdue Alert: ' + pmNumber;
  var body = 'Preventive Maintenance task ' + pmNumber + ' for ' + machine + ' is overdue.\n\n' +
    'Please take immediate action.\n\n' +
    'Regards,\n' + CONFIG.APP_NAME;
  return sendEmailNotification(technicianEmail, subject, body);
}

function notifyLowStock(partCode, partName, stock, minimumStock) {
  var subject = 'Low Stock Alert: ' + partName;
  var body = 'Spare part ' + partName + ' (' + partCode + ') is below minimum stock level.\n\n' +
    'Current Stock: ' + stock + '\n' +
    'Minimum Stock: ' + minimumStock + '\n\n' +
    'Please initiate purchase request.\n\n' +
    'Regards,\n' + CONFIG.APP_NAME;
  var adminEmail = Session.getActiveUser().getEmail();
  return sendEmailNotification(adminEmail, subject, body);
}

function sendSystemAlert(message) {
  var subject = 'CMMS System Alert';
  var body = message + '\n\nTimestamp: ' + formatDateTime(new Date()) + '\n\nRegards,\n' + CONFIG.APP_NAME;
  var admins = getAllData(CONFIG.SHEET_NAMES.USERS);
  for (var i = 0; i < admins.length; i++) {
    if (admins[i].Role === CONFIG.ROLES.ADMIN && admins[i].Status === CONFIG.STATUS.ACTIVE) {
      sendEmailNotification(admins[i].Email, subject, body);
    }
  }
}
