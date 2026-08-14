var WHATSAPP = {
  SHEET: 'WhatsAppLogs',
  TEMPLATES_SHEET: 'WhatsAppTemplates',
  FIELDS: ['MessageID','DateTime','Recipient','PhoneNumber','Module','ReferenceID','Template','Status','Provider','ErrorMessage','SentBy'],
  SETTINGS: {
    ENABLED: 'whatsapp_enabled',
    COMPANY_NAME: 'whatsapp_company_name',
    DEFAULT_COUNTRY_CODE: 'whatsapp_default_country_code',
    PROVIDER: 'whatsapp_provider',
    API_ENDPOINT: 'whatsapp_api_endpoint',
    API_TOKEN: 'whatsapp_api_token',
    PHONE_NUMBER_ID: 'whatsapp_phone_number_id',
    BUSINESS_ACCOUNT_ID: 'whatsapp_business_account_id',
    TEST_PHONE: 'whatsapp_test_phone',
    TEST_MESSAGE: 'whatsapp_test_message'
  },
  DEFAULTS: {
    COMPANY_NAME: 'PWI CMMS',
    DEFAULT_COUNTRY_CODE: '91',
    PROVIDER: 'meta',
    API_ENDPOINT: 'https://graph.facebook.com/v18.0',
    TEST_MESSAGE: 'Test message from PWI CMMS'
  },
  TEMPLATES: {
    JC_OPENED: 'JobOpened',
    JC_ASSIGNED: 'JobAssigned',
    JC_STARTED: 'JobStarted',
    JC_CLOSED: 'JobClosed',
    JC_APPROVED: 'JobApproved',
    PM_DUE: 'PMDue',
    PM_OVERDUE: 'PMOverdue',
    LOW_STOCK: 'LowStock',
    OUT_OF_STOCK: 'OutOfStock',
    PURCHASE_REQUEST: 'PurchaseRequest',
    GOODS_RECEIPT: 'GoodsReceipt',
    USER_CREATED: 'UserCreated',
    PASSWORD_RESET: 'PasswordReset'
  },
  TEMPLATE_FIELDS: ['TemplateID','TemplateName','EventType','TemplateBody','Variables','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'],
  STATUS: { PENDING: 'Pending', SENT: 'Sent', FAILED: 'Failed' }
};

function whatsappInitLogsSheet() {
  var sheet = getSheet(WHATSAPP.SHEET);
  ensureHeaders(sheet, WHATSAPP.FIELDS);
}

function whatsappInitTemplatesSheet() {
  var sheet = getSheet(WHATSAPP.TEMPLATES_SHEET);
  ensureHeaders(sheet, WHATSAPP.TEMPLATE_FIELDS);
  var existing = getAllData(WHATSAPP.TEMPLATES_SHEET);
  if (!existing || existing.length === 0) {
    var now = getCurrentTimestamp();
    var defaults = [
      { TemplateID: 'TMP001', TemplateName: 'Job Opened', EventType: WHATSAPP.TEMPLATES.JC_OPENED, TemplateBody: '*Job Card Opened*\n\nJob: {{jobCardNo}}\nMachine: {{machine}}\nPriority: {{priority}}\nComplaint: {{complaint}}\nReported By: {{reportedBy}}\nDate: {{dateTime}}', Variables: 'jobCardNo,machine,priority,complaint,reportedBy,dateTime', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP002', TemplateName: 'Job Assigned', EventType: WHATSAPP.TEMPLATES.JC_ASSIGNED, TemplateBody: '*Job Assigned*\n\nJob: {{jobCardNo}}\nMachine: {{machine}}\nAssigned To: {{assignedTech}}\nPriority: {{priority}}\nComplaint: {{complaint}}', Variables: 'jobCardNo,machine,assignedTech,priority,complaint', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP003', TemplateName: 'Job Started', EventType: WHATSAPP.TEMPLATES.JC_STARTED, TemplateBody: '*Job Started*\n\nJob: {{jobCardNo}}\nMachine: {{machine}}\nStarted By: {{startedBy}}\nStart Time: {{startTime}}\nPriority: {{priority}}', Variables: 'jobCardNo,machine,startedBy,startTime,priority', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP004', TemplateName: 'Job Closed', EventType: WHATSAPP.TEMPLATES.JC_CLOSED, TemplateBody: '*Job Closed*\n\nJob: {{jobCardNo}}\nMachine: {{machine}}\nClosed By: {{closedBy}}\nWorking Time: {{workingTime}}\nTotal Duration: {{totalDuration}}', Variables: 'jobCardNo,machine,closedBy,workingTime,totalDuration', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP005', TemplateName: 'Job Approved', EventType: WHATSAPP.TEMPLATES.JC_APPROVED, TemplateBody: '*Job Approved*\n\nJob: {{jobCardNo}}\nMachine: {{machine}}\nApproved By: {{approvedBy}}\nStatus: {{approvalStatus}}\nRemarks: {{approvalRemarks}}', Variables: 'jobCardNo,machine,approvedBy,approvalStatus,approvalRemarks', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP006', TemplateName: 'PM Due Reminder', EventType: WHATSAPP.TEMPLATES.PM_DUE, TemplateBody: '*PM Due Reminder*\n\nPM: {{title}}\nMachine: {{machine}}\nAssigned To: {{assignedTech}}\nDue Date: {{dueDate}}\nFrequency: {{frequency}}', Variables: 'title,machine,assignedTech,dueDate,frequency', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP007', TemplateName: 'PM Overdue', EventType: WHATSAPP.TEMPLATES.PM_OVERDUE, TemplateBody: '*PM Overdue Alert*\n\nPM: {{title}}\nMachine: {{machine}}\nOverdue Since: {{dueDate}}\nFrequency: {{frequency}}', Variables: 'title,machine,dueDate,frequency', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP008', TemplateName: 'Low Stock Alert', EventType: WHATSAPP.TEMPLATES.LOW_STOCK, TemplateBody: '*Low Stock Alert*\n\nPart: {{partName}} ({{partCode}})\nCurrent Stock: {{currentStock}} {{unit}}\nMinimum Stock: {{minStock}} {{unit}}\nReorder Level: {{reorderLevel}} {{unit}}\nLocation: {{storeLocation}}', Variables: 'partCode,partName,currentStock,minStock,reorderLevel,unit,storeLocation', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP009', TemplateName: 'Out of Stock Alert', EventType: WHATSAPP.TEMPLATES.OUT_OF_STOCK, TemplateBody: '*Out of Stock Alert*\n\nPart: {{partName}} ({{partCode}})\nStock: 0 {{unit}}\nAction Required Immediately!', Variables: 'partCode,partName,unit', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP010', TemplateName: 'Purchase Request', EventType: WHATSAPP.TEMPLATES.PURCHASE_REQUEST, TemplateBody: '*Purchase Request*\n\nPart: {{partName}} ({{partCode}})\nQuantity: {{quantity}} {{unit}}\nRequested By: {{requestedBy}}\nRemarks: {{remarks}}', Variables: 'partCode,partName,quantity,unit,requestedBy,remarks', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP011', TemplateName: 'Goods Received', EventType: WHATSAPP.TEMPLATES.GOODS_RECEIPT, TemplateBody: '*Goods Received*\n\nGRN: {{grnNo}}\nPart: {{partName}} ({{partCode}})\nQuantity: {{quantity}}\nSupplier: {{supplier}}\nInvoice: {{invoiceNo}}\nReceived By: {{receivedBy}}', Variables: 'grnNo,partCode,partName,quantity,supplier,invoiceNo,receivedBy', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP012', TemplateName: 'User Created', EventType: WHATSAPP.TEMPLATES.USER_CREATED, TemplateBody: '*User Account Created*\n\nName: {{name}}\nEmail: {{email}}\nRole: {{role}}\nDepartment: {{department}}\nDesignation: {{designation}}\nTemporary Password: {{tempPassword}}', Variables: 'name,email,role,department,designation,tempPassword', CreatedBy: 'system', CreatedAt: now },
      { TemplateID: 'TMP013', TemplateName: 'Password Reset', EventType: WHATSAPP.TEMPLATES.PASSWORD_RESET, TemplateBody: '*Password Reset*\n\nUser: {{name}} ({{email}})\nNew Temporary Password: {{tempPassword}}\nPlease change on next login.', Variables: 'name,email,tempPassword', CreatedBy: 'system', CreatedAt: now }
    ];
    defaults.forEach(function(t) { addRow(WHATSAPP.TEMPLATES_SHEET, t); });
  }
}

function whatsappEnsureDefaults() {
  if (getSetting(WHATSAPP.SETTINGS.ENABLED) === null) saveSetting(WHATSAPP.SETTINGS.ENABLED, 'false');
  if (getSetting(WHATSAPP.SETTINGS.COMPANY_NAME) === null) saveSetting(WHATSAPP.SETTINGS.COMPANY_NAME, WHATSAPP.DEFAULTS.COMPANY_NAME);
  if (getSetting(WHATSAPP.SETTINGS.DEFAULT_COUNTRY_CODE) === null) saveSetting(WHATSAPP.SETTINGS.DEFAULT_COUNTRY_CODE, WHATSAPP.DEFAULTS.DEFAULT_COUNTRY_CODE);
  if (getSetting(WHATSAPP.SETTINGS.PROVIDER) === null) saveSetting(WHATSAPP.SETTINGS.PROVIDER, WHATSAPP.DEFAULTS.PROVIDER);
  if (getSetting(WHATSAPP.SETTINGS.API_ENDPOINT) === null) saveSetting(WHATSAPP.SETTINGS.API_ENDPOINT, WHATSAPP.DEFAULTS.API_ENDPOINT);
  if (getSetting(WHATSAPP.SETTINGS.API_TOKEN) === null) saveSetting(WHATSAPP.SETTINGS.API_TOKEN, '');
  if (getSetting(WHATSAPP.SETTINGS.PHONE_NUMBER_ID) === null) saveSetting(WHATSAPP.SETTINGS.PHONE_NUMBER_ID, '');
  if (getSetting(WHATSAPP.SETTINGS.BUSINESS_ACCOUNT_ID) === null) saveSetting(WHATSAPP.SETTINGS.BUSINESS_ACCOUNT_ID, '');
  if (getSetting(WHATSAPP.SETTINGS.TEST_PHONE) === null) saveSetting(WHATSAPP.SETTINGS.TEST_PHONE, '');
  if (getSetting(WHATSAPP.SETTINGS.TEST_MESSAGE) === null) saveSetting(WHATSAPP.SETTINGS.TEST_MESSAGE, WHATSAPP.DEFAULTS.TEST_MESSAGE);
}

function whatsappGetSettings() {
  try {
    whatsappEnsureDefaults();
    return {
      enabled: getSetting(WHATSAPP.SETTINGS.ENABLED) === true || getSetting(WHATSAPP.SETTINGS.ENABLED) === 'true',
      companyName: getSetting(WHATSAPP.SETTINGS.COMPANY_NAME) || WHATSAPP.DEFAULTS.COMPANY_NAME,
      defaultCountryCode: getSetting(WHATSAPP.SETTINGS.DEFAULT_COUNTRY_CODE) || WHATSAPP.DEFAULTS.DEFAULT_COUNTRY_CODE,
      provider: getSetting(WHATSAPP.SETTINGS.PROVIDER) || WHATSAPP.DEFAULTS.PROVIDER,
      apiEndpoint: getSetting(WHATSAPP.SETTINGS.API_ENDPOINT) || WHATSAPP.DEFAULTS.API_ENDPOINT,
      apiToken: getSetting(WHATSAPP.SETTINGS.API_TOKEN) || '',
      phoneNumberId: getSetting(WHATSAPP.SETTINGS.PHONE_NUMBER_ID) || '',
      businessAccountId: getSetting(WHATSAPP.SETTINGS.BUSINESS_ACCOUNT_ID) || '',
      testPhone: getSetting(WHATSAPP.SETTINGS.TEST_PHONE) || '',
      testMessage: getSetting(WHATSAPP.SETTINGS.TEST_MESSAGE) || WHATSAPP.DEFAULTS.TEST_MESSAGE
    };
  } catch (e) {
    return { enabled: false, provider: WHATSAPP.DEFAULTS.PROVIDER, companyName: WHATSAPP.DEFAULTS.COMPANY_NAME, defaultCountryCode: WHATSAPP.DEFAULTS.DEFAULT_COUNTRY_CODE };
  }
}

function whatsappSaveSettings(data) {
  try {
    requireUserPermission('CanManageWhatsApp', data);
    whatsappEnsureDefaults();
    if (data.hasOwnProperty('enabled')) saveSetting(WHATSAPP.SETTINGS.ENABLED, data.enabled ? 'true' : 'false');
    if (data.hasOwnProperty('companyName')) saveSetting(WHATSAPP.SETTINGS.COMPANY_NAME, String(data.companyName));
    if (data.hasOwnProperty('defaultCountryCode')) saveSetting(WHATSAPP.SETTINGS.DEFAULT_COUNTRY_CODE, String(data.defaultCountryCode));
    if (data.hasOwnProperty('provider')) saveSetting(WHATSAPP.SETTINGS.PROVIDER, String(data.provider));
    if (data.hasOwnProperty('apiEndpoint')) saveSetting(WHATSAPP.SETTINGS.API_ENDPOINT, String(data.apiEndpoint));
    if (data.hasOwnProperty('apiToken')) saveSetting(WHATSAPP.SETTINGS.API_TOKEN, String(data.apiToken));
    if (data.hasOwnProperty('phoneNumberId')) saveSetting(WHATSAPP.SETTINGS.PHONE_NUMBER_ID, String(data.phoneNumberId));
    if (data.hasOwnProperty('businessAccountId')) saveSetting(WHATSAPP.SETTINGS.BUSINESS_ACCOUNT_ID, String(data.businessAccountId));
    if (data.hasOwnProperty('testPhone')) saveSetting(WHATSAPP.SETTINGS.TEST_PHONE, String(data.testPhone));
    if (data.hasOwnProperty('testMessage')) saveSetting(WHATSAPP.SETTINGS.TEST_MESSAGE, String(data.testMessage));
    var safeData = JSON.parse(JSON.stringify(data));
    if (safeData && safeData.apiToken) safeData.apiToken = '***';
    logActivity('WhatsApp Settings Updated', JSON.stringify(safeData));
    try { createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, CONFIG.AUDIT_ACTIONS.UPDATE, 'WhatsAppSettings', 'WhatsApp settings changed', '', JSON.stringify(safeData).substring(0, 200), 'Success', 'WhatsApp settings updated'); } catch(e) {}
    return { success: true, settings: whatsappGetSettings() };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function whatsappGetTemplates() {
  try {
    var all = getAllData(WHATSAPP.TEMPLATES_SHEET) || [];
    all.sort(function(a, b) { return String(a.TemplateName || '').localeCompare(String(b.TemplateName || '')); });
    return all;
  } catch (e) { return []; }
}

function whatsappSaveTemplate(data) {
  try {
    var user = requireUserPermission('CanManageWhatsApp', data);
    var currentUser = (data && data._userEmail) || (user && user.Email) || '';
    if (data.TemplateID) {
      data.UpdatedBy = currentUser;
      data.UpdatedAt = getCurrentTimestamp();
      updateRow(WHATSAPP.TEMPLATES_SHEET, 'TemplateID', data.TemplateID, data);
    } else {
      data.TemplateID = 'TMP' + String(Date.now()).slice(-6);
      data.CreatedBy = currentUser;
      data.CreatedAt = getCurrentTimestamp();
      addRow(WHATSAPP.TEMPLATES_SHEET, data);
    }
    return { success: true, templates: whatsappGetTemplates() };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function whatsappFormatMessage(templateBody, variables) {
  var msg = templateBody || '';
  for (var key in variables) {
    var regex = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
    msg = msg.replace(regex, String(variables[key] || ''));
  }
  msg = msg.replace(/\{\{\w+\}\}/g, '');
  return msg;
}

function whatsappLog(messageId, recipient, phoneNumber, module, refId, template, status, provider, errorMsg, sentBy) {
  try {
    whatsappInitLogsSheet();
    var maxNum = 0;
    var existing = getAllData(WHATSAPP.SHEET) || [];
    existing.forEach(function(r) {
      var mid = String(r.MessageID || '');
      var num = parseInt(mid.replace('WA', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    var waId = 'WA' + String(maxNum + 1).padStart(5, '0');
    var row = {};
    WHATSAPP.FIELDS.forEach(function(f, idx) {
      if (idx === 0) row[f] = waId;
      else if (f === 'DateTime') row[f] = getCurrentTimestamp();
      else if (f === 'Recipient') row[f] = recipient || '';
      else if (f === 'PhoneNumber') row[f] = phoneNumber || '';
      else if (f === 'Module') row[f] = module || '';
      else if (f === 'ReferenceID') row[f] = refId || '';
      else if (f === 'Template') row[f] = template || '';
      else if (f === 'Status') row[f] = status || WHATSAPP.STATUS.PENDING;
      else if (f === 'Provider') row[f] = provider || '';
      else if (f === 'ErrorMessage') row[f] = errorMsg || '';
      else if (f === 'SentBy') row[f] = sentBy || '';
      else row[f] = '';
    });
    addRow(WHATSAPP.SHEET, row);
    return waId;
  } catch (e) { return ''; }
}

function whatsappGetLogs(filters) {
  try {
    var allLogs = getAllData(WHATSAPP.SHEET) || [];
    var limit = (filters && filters.limit) ? parseInt(filters.limit, 10) : 0;
    allLogs.sort(function(a, b) { return String(b.DateTime || '').localeCompare(String(a.DateTime || '')); });
    if (filters && (filters.module || filters.status || filters.recipient)) {
      allLogs = allLogs.filter(function(log) {
        if (filters.module && log.Module !== filters.module) return false;
        if (filters.status && log.Status !== filters.status) return false;
        if (filters.recipient && log.Recipient !== filters.recipient) return false;
        return true;
      });
    }
    if (limit > 0 && allLogs.length > limit) allLogs = allLogs.slice(0, limit);
    return allLogs;
  } catch (e) { return []; }
}

function whatsappGetDashboardStats() {
  try {
    var logs = getAllData(WHATSAPP.SHEET) || [];
    var today = new Date();
    var todayStr = today.toISOString().substring(0, 10);
    var sentToday = 0, failedToday = 0, pendingToday = 0;
    logs.forEach(function(log) {
      var logDate = String(log.DateTime || '').substring(0, 10);
      if (logDate === todayStr) {
        if (log.Status === WHATSAPP.STATUS.SENT) sentToday++;
        else if (log.Status === WHATSAPP.STATUS.FAILED) failedToday++;
        else if (log.Status === WHATSAPP.STATUS.PENDING) pendingToday++;
      }
    });
    return { sentToday: sentToday, failedToday: failedToday, pendingToday: pendingToday };
  } catch (e) { return { sentToday: 0, failedToday: 0, pendingToday: 0 }; }
}

function whatsappGetPanelData() {
  try {
    var stats = whatsappGetDashboardStats();
    var recent = whatsappGetLogs({ limit: 10 });
    return { stats: stats, recentLogs: recent };
  } catch (e) { return { stats: { sentToday: 0, failedToday: 0, pendingToday: 0 }, recentLogs: [] }; }
}

function whatsappProviderSend(settings, phoneNumber, messageBody) {
  var provider = settings.provider || WHATSAPP.DEFAULTS.PROVIDER;
  if (provider === 'meta') return whatsappMetaSend(settings, phoneNumber, messageBody);
  if (provider === 'twilio') return whatsappTwilioSend(settings, phoneNumber, messageBody);
  return { success: false, message: 'Unknown provider: ' + provider };
}

function whatsappMetaSend(settings, phoneNumber, messageBody) {
  try {
    var token = settings.apiToken;
    var phoneNumberId = settings.phoneNumberId;
    var apiEndpoint = settings.apiEndpoint || WHATSAPP.DEFAULTS.API_ENDPOINT;
    if (!token || !phoneNumberId) return { success: false, message: 'Meta API credentials not configured' };
    var url = apiEndpoint.replace(/\/+$/, '') + '/' + phoneNumberId + '/messages';
    var payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: messageBody }
    };
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = JSON.parse(response.getContentText());
    if (code >= 200 && code < 300) {
      var msgId = body.messages && body.messages[0] ? body.messages[0].id : '';
      return { success: true, messageId: msgId, message: 'Sent via Meta API' };
    }
    return { success: false, message: 'Meta API error (' + code + '): ' + (body.error ? body.error.message : JSON.stringify(body)) };
  } catch (e) {
    return { success: false, message: 'Meta API exception: ' + e.message };
  }
}

function whatsappTwilioSend(settings, phoneNumber, messageBody) {
  try {
    var token = settings.apiToken;
    var apiEndpoint = settings.apiEndpoint || 'https://api.twilio.com/2010-04-01';
    if (!token || !apiEndpoint) return { success: false, message: 'Twilio credentials not configured' };
    var accountSid = settings.businessAccountId;
    if (!accountSid) return { success: false, message: 'Twilio Account SID not configured' };
    var url = apiEndpoint.replace(/\/+$/, '') + '/Accounts/' + accountSid + '/Messages.json';
    var fromNumber = settings.phoneNumberId;
    var payload = {
      To: 'whatsapp:' + phoneNumber,
      From: fromNumber ? 'whatsapp:' + fromNumber : '',
      Body: messageBody
    };
    var auth = Utilities.base64Encode(accountSid + ':' + token);
    var options = {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      headers: { Authorization: 'Basic ' + auth },
      payload: payload,
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = JSON.parse(response.getContentText());
    if (code >= 200 && code < 300) {
      return { success: true, messageId: body.sid || '', message: 'Sent via Twilio' };
    }
    return { success: false, message: 'Twilio API error (' + code + '): ' + (body.message || JSON.stringify(body)) };
  } catch (e) {
    return { success: false, message: 'Twilio API exception: ' + e.message };
  }
}

function whatsappSendMessage(phoneNumber, messageBody, module, refId, templateName, recipientName, sentBy) {
  try {
    var settings = whatsappGetSettings();
    if (!settings.enabled) return { success: false, status: WHATSAPP.STATUS.PENDING, message: 'WhatsApp disabled' };
    if (!phoneNumber) return { success: false, status: WHATSAPP.STATUS.FAILED, message: 'No phone number' };
    var fullNumber = phoneNumber;
    if (!fullNumber.startsWith('+') && !fullNumber.startsWith('00')) {
      var cc = settings.defaultCountryCode || WHATSAPP.DEFAULTS.DEFAULT_COUNTRY_CODE;
      fullNumber = '+' + cc + fullNumber.replace(/^0+/, '');
    }
    var result = whatsappProviderSend(settings, fullNumber, messageBody);
    var status = result.success ? WHATSAPP.STATUS.SENT : WHATSAPP.STATUS.FAILED;
    var waId = whatsappLog(result.messageId || '', recipientName || '', fullNumber, module || '', refId || '', templateName || '', status, settings.provider, result.success ? '' : result.message, sentBy || Session.getActiveUser().getEmail());
    return { success: result.success, status: status, messageId: result.messageId, logId: waId, message: result.message };
  } catch (e) {
    whatsappLog('', recipientName || '', phoneNumber || '', module || '', refId || '', templateName || '', WHATSAPP.STATUS.FAILED, '', e.message, sentBy || Session.getActiveUser().getEmail());
    return { success: false, status: WHATSAPP.STATUS.FAILED, message: e.message };
  }
}

function whatsappGetTemplateByEvent(eventType) {
  var templates = getAllData(WHATSAPP.TEMPLATES_SHEET) || [];
  for (var i = 0; i < templates.length; i++) {
    if (templates[i].EventType === eventType) return templates[i];
  }
  return null;
}

function whatsappSendNotification(eventType, data) {
  try {
    var settings = whatsappGetSettings();
    if (!settings.enabled) return { success: false, status: WHATSAPP.STATUS.PENDING, message: 'WhatsApp disabled' };
    whatsappInitTemplatesSheet();
    var template = whatsappGetTemplateByEvent(eventType);
    if (!template) {
      return { success: false, status: WHATSAPP.STATUS.FAILED, message: 'No template for event: ' + eventType };
    }
    var messageBody = whatsappFormatMessage(template.TemplateBody, data);
    var phoneField = data.phone || data.mobile || '';
    var phones = [];
    if (phoneField) {
      phones = [phoneField];
    } else if (data.phoneNumbers) {
      phones = Array.isArray(data.phoneNumbers) ? data.phoneNumbers : [data.phoneNumbers];
    }
    if (phones.length === 0) {
      return { success: false, status: WHATSAPP.STATUS.PENDING, message: 'No phone numbers provided' };
    }
    var refId = data.jobCardNo || data.pmNumber || data.partCode || data.grnNo || data.userId || data.id || '';
    var module = data.module || '';
    var results = [];
    phones.forEach(function(phone) {
      var result = whatsappSendMessage(phone, messageBody, module, refId, eventType, data.recipientName || data.name || '');
      results.push(result);
    });
    return { success: results.length > 0, results: results };
  } catch (e) {
    return { success: false, status: WHATSAPP.STATUS.FAILED, message: e.message };
  }
}

function whatsappGetUserPhone(email) {
  if (!email) return '';
  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  for (var i = 0; i < users.length; i++) {
    if (users[i].Email === email) return users[i].Mobile || '';
  }
  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];
  for (var j = 0; j < techs.length; j++) {
    if (techs[j].Email === email) return techs[j].Mobile || '';
  }
  return '';
}

function whatsappGetAdminPhones() {
  var phones = [];
  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  users.forEach(function(u) {
    if ((u.IsAdmin === 'TRUE' || u.IsAdmin === true || u.Role === 'Admin') && u.Mobile) {
      phones.push(u.Mobile);
    }
  });
  return phones;
}

function whatsappGetStorePhones() {
  var phones = [];
  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  users.forEach(function(u) {
    if ((u.Role === 'Store' || u.CanManageInventory === 'TRUE') && u.Mobile) {
      phones.push(u.Mobile);
    }
  });
  return phones;
}

function whatsappGetTechPhone(email) {
  if (!email) return '';
  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];
  for (var i = 0; i < techs.length; i++) {
    if (techs[i].Email === email) return techs[i].Mobile || '';
  }
  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  for (var j = 0; j < users.length; j++) {
    if (users[j].Email === email) return users[j].Mobile || '';
  }
  return '';
}

function whatsappTestSend(data) {
  try {
    var user = requireUserPermission('CanManageWhatsApp', data);
    var settings = whatsappGetSettings();
    if (!settings.enabled) return { success: false, message: 'WhatsApp is disabled. Enable it in settings first.' };
    var configIssue = whatsappConfigIssue(settings);
    if (configIssue) return { success: false, message: configIssue };
    var phone = String((data && (data.testPhone || data.phone)) || settings.testPhone || '').replace(/[^0-9+]/g, '');
    if (!phone || phone.length < 10) {
      return { success: false, message: 'Invalid test phone number. Must be at least 10 digits.' };
    }
    var msg = String((data && (data.testMessage || data.message)) || settings.testMessage || '').trim();
    if (!msg) return { success: false, message: 'Test message cannot be empty.' };
    var company = settings.companyName || WHATSAPP.DEFAULTS.COMPANY_NAME;
    var fullMsg = '*Test Message from ' + company + '*\n\n' + msg + '\n\nSent: ' + getCurrentTimestamp();
    var sentBy = (user && user.Email) || (data && data._userEmail) || '';
    var recipientName = (data && (data._userName || data.recipientName)) || sentBy || '';
    var result = whatsappSendMessage(phone, fullMsg, 'System', '', 'TestMessage', recipientName, sentBy);
    return result;
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function whatsappConfigIssue(settings) {
  if (settings.provider === 'meta') {
    if (!settings.apiToken) return 'Meta API token is not configured.';
    if (!settings.phoneNumberId) return 'Meta Phone Number ID is not configured.';
  } else if (settings.provider === 'twilio') {
    if (!settings.apiToken) return 'Twilio API token is not configured.';
    if (!settings.businessAccountId) return 'Twilio Account SID is not configured.';
    if (!settings.phoneNumberId) return 'Twilio sender number is not configured.';
  } else {
    return 'Unknown WhatsApp provider: ' + settings.provider;
  }
  return '';
}

function whatsappGetSettingsData(data) {
  try {
    requireUserPermission('CanManageWhatsApp', data);
  } catch (e) {
    return { success: false, message: e.message };
  }
  return {
    success: true,
    settings: whatsappGetSettings(),
    templates: whatsappGetTemplates(),
    stats: whatsappGetDashboardStats(),
    logs: whatsappGetLogs({ limit: 50 })
  };
}

function whatsappSendJobStatusNotification(eventType, jobData) {
  try {
    if (!jobData) return { success: false, status: WHATSAPP.STATUS.FAILED, message: 'Missing job card data' };
    var phones = [];
    if (jobData.phoneNumbers) {
      var pn = Array.isArray(jobData.phoneNumbers) ? jobData.phoneNumbers : [jobData.phoneNumbers];
      pn.forEach(function(p) { if (p && phones.indexOf(p) === -1) phones.push(p); });
    }
    ['assignedTechEmail', 'complaintByEmail', 'approverEmail', 'reportedByEmail', 'customerEmail'].forEach(function(k) {
      if (jobData[k]) {
        var ph = whatsappGetUserPhone(jobData[k]);
        if (ph && phones.indexOf(ph) === -1) phones.push(ph);
      }
    });
    if (jobData.customerPhone && phones.indexOf(jobData.customerPhone) === -1) phones.push(jobData.customerPhone);
    var payload = {
      jobCardNo: jobData.jobCardNo || jobData.id || '',
      machine: jobData.machine || '',
      priority: jobData.priority || '',
      complaint: jobData.complaint || '',
      reportedBy: jobData.reportedBy || '',
      dateTime: jobData.dateTime || jobData.startTime || getCurrentTimestamp(),
      assignedTech: jobData.assignedTech || jobData.assignedTechEmail || '',
      startedBy: jobData.startedBy || '',
      startTime: jobData.startTime || '',
      closedBy: jobData.closedBy || '',
      workingTime: jobData.workingTime || '',
      totalDuration: jobData.totalDuration || jobData.downtime || '',
      approvedBy: jobData.approvedBy || '',
      approvalStatus: jobData.approvalStatus || '',
      approvalRemarks: jobData.approvalRemarks || jobData.remarks || '',
      phoneNumbers: phones,
      module: 'Jobs'
    };
    return whatsappSendNotification(eventType, payload);
  } catch (e) {
    return { success: false, status: WHATSAPP.STATUS.FAILED, message: e.message };
  }
}

function whatsappSendStockAlertNotification(eventType, partData) {
  try {
    if (!partData) return { success: false, status: WHATSAPP.STATUS.FAILED, message: 'Missing part data' };
    var payload = {
      partCode: partData.partCode || partData.code || '',
      partName: partData.partName || partData.name || '',
      currentStock: partData.currentStock || partData.stock || partData.quantity || 0,
      minStock: partData.minStock || partData.minimumStock || 0,
      reorderLevel: partData.reorderLevel || partData.minimumQty || 0,
      unit: partData.unit || '',
      storeLocation: partData.storeLocation || partData.location || '',
      phoneNumbers: whatsappGetStorePhones(),
      module: 'Inventory'
    };
    return whatsappSendNotification(eventType, payload);
  } catch (e) {
    return { success: false, status: WHATSAPP.STATUS.FAILED, message: e.message };
  }
}
