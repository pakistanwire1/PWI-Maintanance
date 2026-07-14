/* ============================================================
   API.gs — REST API Router for Cloudflare Pages Frontend
   Standard-021: Enterprise Architecture Migration
   
   doPost() handles all API requests from Cloudflare Pages.
   doOptions() handles CORS preflight requests.
   Existing doGet() and HTML app remain untouched.
   ============================================================ */

var CORS_ORIGINS = [
  'https://pwi-maintenance-2026.pakistanwire1.workers.dev',
  'https://pwi-cmms.pages.dev'
];

function getCorsOrigin(e) {
  try {
    var origin = e ? (e.headers && e.headers.origin) || '' : '';
    if (origin && CORS_ORIGINS.indexOf(origin) > -1) return origin;
  } catch(ex) {}
  return CORS_ORIGINS[0];
}

/* ---- CORS & Response Helpers ---- */

function apiSetCors(resp, origin) {
  return resp
    .setHeader('Access-Control-Allow-Origin', origin)
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Allow-Credentials', 'true')
    .setHeader('Access-Control-Max-Age', '86400');
}

function apiJson(data, e) {
  var origin = getCorsOrigin(e);
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return apiSetCors(output, origin);
}

function apiSuccess(data, e) {
  return apiJson({ success: true, data: data, ts: new Date().toISOString() }, e);
}

function apiError(message, code, e) {
  return apiJson({ success: false, error: message, code: code || 400 }, e);
}

/* ---- Preflight ---- */

function doOptions(e) {
  var origin = getCorsOrigin(e);
  var output = ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
  return apiSetCors(output, origin);
}

/* ---- Main Router ---- */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';
    var token = body.token || '';
    var data = body.data || {};

    if (!action) return apiError('Missing action', 400, e);

    var route = API_ROUTES[action];
    if (!route) return apiError('Unknown action: ' + action, 404, e);

    if (route.auth) {
      var user = validateApiToken(token);
      if (!user) return apiError('Unauthorized. Please login again.', 401, e);
      data._userEmail = user.email;
      data._userRole = user.role;
      data._userName = user.name;
    }

    var result = route.handler(data);
    return apiSuccess(result, e);

  } catch(err) {
    Logger.log('API Error: ' + err.message + ' | Stack: ' + err.stack);
    return apiError(err.message || 'Internal server error', 500, e);
  }
}

/* ============================================================
   API Route Table
   ============================================================ */

var API_ROUTES = {

  /* ---- Auth ---- */
  'login':                 { auth: false, handler: function(d) { return apiLogin(d.email, d.password); } },
  'logout':                { auth: true,  handler: function(d) { return apiLogout(d._token); } },
  'validateSession':       { auth: true,  handler: function(d) { return { valid: true, email: d._userEmail, role: d._userRole }; } },
  'resetPassword':         { auth: false, handler: function(d) { return generateResetToken(d.email); } },
  'resetPasswordConfirm':  { auth: false, handler: function(d) { return resetPasswordWithToken(d.email, d.token, d.newPassword); } },
  'checkEmailExists':      { auth: false, handler: function(d) { return checkEmailExists(d.email); } },

  /* ---- Users ---- */
  'getUsers':              { auth: true,  handler: function(d) { return apiGetUsers(d); } },
  'addUser':               { auth: true,  handler: function(d) { return addUser(d); } },
  'updateUser':            { auth: true,  handler: function(d) { return updateUser(d.email, d); } },
  'deleteUser':            { auth: true,  handler: function(d) { return deleteUser(d.email); } },
  'searchUsers':           { auth: true,  handler: function(d) { return searchUsers(d.query); } },
  'resetUserPassword':     { auth: true,  handler: function(d) { return resetUserPassword(d.id, d.tempPassword, d.forceChange); } },
  'uploadUserPhoto':       { auth: true,  handler: function(d) { return uploadUserPhoto(d.base64Data, d.employeeId); } },

  /* ---- Job Cards ---- */
  'getJobCards':           { auth: true,  handler: function(d) { return apiGetJobCards(d); } },
  'getJobCardsByStatus':   { auth: true,  handler: function(d) { return apiGetJobCards(d); } },
  'getJobCard':            { auth: true,  handler: function(d) { return getJobCard(d.id); } },
  'addJobCard':            { auth: true,  handler: function(d) { return addJobCard(d); } },
  'updateJobCard':         { auth: true,  handler: function(d) { return updateJobCard(d.id, d); } },
  'deleteJobCard':         { auth: true,  handler: function(d) { return deleteJobCard(d.id); } },
  'startJobCard':          { auth: true,  handler: function(d) { return apiStartJobCard(d); } },
  'closeJobCard':          { auth: true,  handler: function(d) { return apiCloseJobCard(d); } },
  'approveJobCard':        { auth: true,  handler: function(d) { return approveJobCard(d.id, d); } },
  'returnJobCard':         { auth: true,  handler: function(d) { return returnJobCard(d.id, d); } },
  'pendingJobCard':        { auth: true,  handler: function(d) { return apiPendingJobCard(d); } },
  'unlockJobCard':         { auth: true,  handler: function(d) { return unlockJobCard(d.id); } },
  'searchJobCards':        { auth: true,  handler: function(d) { return searchJobCards(d.query); } },
  'canApproveJobCard':     { auth: true,  handler: function(d) { return canApproveJobCard(); } },

  /* ---- Machines ---- */
  'getMachines':           { auth: true,  handler: function(d) { return getMachines(); } },
  'getMachineList':        { auth: true,  handler: function(d) { return getMachineList(); } },
  'getMachine':            { auth: true,  handler: function(d) { return getMachine(d.id); } },
  'getMachineDetails':     { auth: true,  handler: function(d) { return getMachineDetails(d.id); } },
  'addMachine':            { auth: true,  handler: function(d) { return addMachine(d); } },
  'updateMachine':         { auth: true,  handler: function(d) { return updateMachine(d.id, d); } },
  'deleteMachine':         { auth: true,  handler: function(d) { return deleteMachine(d.id); } },
  'searchMachines':        { auth: true,  handler: function(d) { return searchMachines(d.query); } },

  /* ---- Assets ---- */
  'getAssets':             { auth: true,  handler: function(d) { return getAssets(); } },
  'getAssetList':          { auth: true,  handler: function(d) { return getAssetList(); } },
  'getAsset':              { auth: true,  handler: function(d) { return getAsset(d.id); } },
  'getAssetDetails':       { auth: true,  handler: function(d) { return getAssetDetails(d.id); } },
  'addAsset':              { auth: true,  handler: function(d) { return addAsset(d); } },
  'updateAsset':           { auth: true,  handler: function(d) { return updateAsset(d.id, d); } },
  'deleteAsset':           { auth: true,  handler: function(d) { return deleteAsset(d.id); } },
  'searchAssets':          { auth: true,  handler: function(d) { return searchAssets(d.query); } },

  /* ---- Spare Parts ---- */
  'getSpareParts':         { auth: true,  handler: function(d) { return getSpareParts(); } },
  'getSparePart':          { auth: true,  handler: function(d) { return getSparePart(d.id); } },
  'addSparePart':          { auth: true,  handler: function(d) { return addSparePart(d); } },
  'updateSparePart':       { auth: true,  handler: function(d) { return updateSparePart(d.id, d); } },
  'deleteSparePart':       { auth: true,  handler: function(d) { return deleteSparePart(d.id); } },
  'searchSpareParts':      { auth: true,  handler: function(d) { return searchSpareParts(d.query); } },
  'filterSpareParts':      { auth: true,  handler: function(d) { return filterSpareParts(d); } },
  'getStockHistory':       { auth: true,  handler: function(d) { return getStockHistory(d.partCode); } },
  'getLowStockParts':      { auth: true,  handler: function(d) { return getLowStockParts(); } },
  'getOutOfStockParts':    { auth: true,  handler: function(d) { return getOutOfStockParts(); } },
  'getStockValue':         { auth: true,  handler: function(d) { return getStockValue(); } },
  'exportSparePartsCSV':   { auth: true,  handler: function(d) { return exportSparePartsCSV(); } },

  /* ---- Inventory ---- */
  'getAllTransactions':     { auth: true,  handler: function(d) { return getAllTransactions(); } },
  'processGoodsReceipt':   { auth: true,  handler: function(d) { return processGoodsReceipt(d); } },
  'processIssue':          { auth: true,  handler: function(d) { return processIssue(d); } },
  'processReturn':         { auth: true,  handler: function(d) { return processReturn(d); } },
  'processTransfer':       { auth: true,  handler: function(d) { return processTransfer(d); } },
  'processAdjustment':     { auth: true,  handler: function(d) { return processAdjustment(d); } },
  'getCurrentStockSummary':{ auth: true,  handler: function(d) { return getCurrentStockSummary(); } },
  'getInventoryDashboardData': { auth: true, handler: function(d) { return getInventoryDashboardData(); } },
  'searchTransactions':    { auth: true,  handler: function(d) { return searchTransactions(d.query); } },

  /* ---- Departments ---- */
  'getDepartmentList':     { auth: true,  handler: function(d) { return getDepartmentList(); } },
  'getDepartment':         { auth: true,  handler: function(d) { return getDepartment(d.id); } },
  'createDepartment':      { auth: true,  handler: function(d) { return createDepartment(d); } },
  'modifyDepartment':      { auth: true,  handler: function(d) { return modifyDepartment(d.id, d); } },
  'removeDepartment':      { auth: true,  handler: function(d) { return removeDepartment(d.id); } },
  'searchDepartments':     { auth: true,  handler: function(d) { return searchDepartments(d.query); } },

  /* ---- Sections ---- */
  'getSectionList':        { auth: true,  handler: function(d) { return getSectionList(); } },
  'getSection':            { auth: true,  handler: function(d) { return getSection(d.id); } },
  'createSection':         { auth: true,  handler: function(d) { return createSection(d); } },
  'modifySection':         { auth: true,  handler: function(d) { return modifySection(d.id, d); } },
  'removeSection':         { auth: true,  handler: function(d) { return removeSection(d.id); } },
  'searchSections':        { auth: true,  handler: function(d) { return searchSections(d.query); } },

  /* ---- Technicians ---- */
  'getTechnicians':        { auth: true,  handler: function(d) { return getTechnicians(); } },
  'getTechnician':         { auth: true,  handler: function(d) { return getTechnician(d.id); } },
  'addTechnician':         { auth: true,  handler: function(d) { return addTechnician(d); } },
  'updateTechnician':      { auth: true,  handler: function(d) { return updateTechnician(d.id, d); } },
  'deleteTechnician':      { auth: true,  handler: function(d) { return deleteTechnician(d.id); } },
  'searchTechnicians':     { auth: true,  handler: function(d) { return searchTechnicians(d.query); } },

  /* ---- Maintenance Teams ---- */
  'getMaintenanceTeams':   { auth: true,  handler: function(d) { return getMaintenanceTeams(); } },
  'addMaintenanceTeam':    { auth: true,  handler: function(d) { return addMaintenanceTeam(d); } },
  'updateMaintenanceTeam': { auth: true,  handler: function(d) { return updateMaintenanceTeam(d.id, d); } },
  'deleteMaintenanceTeam': { auth: true,  handler: function(d) { return deleteMaintenanceTeam(d.id); } },

  /* ---- Preventive Maintenance ---- */
  'getPMRecords':          { auth: true,  handler: function(d) { return getPMRecords(); } },
  'getPMRecord':           { auth: true,  handler: function(d) { return getPMRecord(d.id); } },
  'addPMRecord':           { auth: true,  handler: function(d) { return addPMRecord(d); } },
  'updatePMRecord':        { auth: true,  handler: function(d) { return updatePMRecord(d.id, d); } },
  'deletePMRecord':        { auth: true,  handler: function(d) { return deletePMRecord(d.id); } },
  'completePM':            { auth: true,  handler: function(d) { return completePM(d.id, d); } },
  'searchPMRecords':       { auth: true,  handler: function(d) { return searchPMRecords(d.query); } },
  'getPMCalendarData':     { auth: true,  handler: function(d) { return getPMCalendarData(d.year, d.month); } },
  'getPMCompliance':       { auth: true,  handler: function(d) { return getPMCompliance(); } },
  'getPMSummary':          { auth: true,  handler: function(d) { return getPMSummary(); } },
  'getDuePMs':             { auth: true,  handler: function(d) { return getDuePMs(); } },
  'getOverduePMs':         { auth: true,  handler: function(d) { return getOverduePMs(); } },
  'getPMByMachine':        { auth: true,  handler: function(d) { return getPMByMachine(d.machineId); } },

  /* ---- PM History ---- */
  'getPMHistory':          { auth: true,  handler: function(d) { return getPMHistory(); } },

  /* ---- Dashboard ---- */
  'getDashboardData':      { auth: true,  handler: function(d) { return getDashboardData(d.filter, d.department); } },

  /* ---- Notifications ---- */
  'getNotifications':      { auth: true,  handler: function(d) { return apiGetNotifications(d); } },
  'getUnreadCount':        { auth: true,  handler: function(d) { return getUnreadCount(d._userEmail); } },
  'markNotificationRead':  { auth: true,  handler: function(d) { return markNotificationRead(d.id); } },
  'markAllNotificationsRead': { auth: true, handler: function(d) { return markAllNotificationsRead(d._userEmail); } },
  'deleteNotification':    { auth: true,  handler: function(d) { return deleteNotification(d.id); } },
  'clearAllNotifications': { auth: true,  handler: function(d) { return clearAllNotifications(d._userEmail); } },

  /* ---- Reports ---- */
  'getReportData':         { auth: true,  handler: function(d) { return getReportData(d.reportType, d.filters); } },

  /* ---- Settings ---- */
  'getSettings':           { auth: true,  handler: function(d) { return getSettings(); } },
  'saveSetting':           { auth: true,  handler: function(d) { return saveSetting(d.key, d.value); } },

  /* ---- Checklists ---- */
  'getChecklistTemplates': { auth: true,  handler: function(d) { return getChecklistTemplates(); } },
  'addChecklistTemplate':  { auth: true,  handler: function(d) { return addChecklistTemplate(d); } },
  'updateChecklistTemplate': { auth: true, handler: function(d) { return updateChecklistTemplate(d.id, d); } },
  'deleteChecklistTemplate': { auth: true, handler: function(d) { return deleteChecklistTemplate(d.id); } },
  'getChecklists':         { auth: true,  handler: function(d) { return getChecklists(); } },

  /* ---- Breakdown Types ---- */
  'getBreakdownTypes':     { auth: true,  handler: function(d) { return getBreakdownTypes(); } },
  'getBreakdownHistory':   { auth: true,  handler: function(d) { return getBreakdownHistory(); } },

  /* ---- Audit Trail ---- */
  'getAuditLogs':          { auth: true,  handler: function(d) { return getAuditLogs(); } },
  'getAuditLogStats':      { auth: true,  handler: function(d) { return getAuditLogStats(d._userEmail); } },

  /* ---- QR & Barcode ---- */
  'generateQRCode':        { auth: true,  handler: function(d) { return generateQRCodeForRecord(d.module, d.recordId); } },
  'generateBarcode':       { auth: true,  handler: function(d) { return generateBarcodeForRecord(d.module, d.recordId); } },
  'scanQRCode':            { auth: true,  handler: function(d) { return scanQRCode(d.qrContent); } },
  'scanBarcode':           { auth: true,  handler: function(d) { return scanBarcode(d.barcode); } },
  'getQRDetail':           { auth: true,  handler: function(d) { return getQRDetail(d.qrContent); } },
  'getQRStatistics':       { auth: true,  handler: function(d) { return getQRStatistics(); } },

  /* ---- Email ---- */
  'emailGetSettings':      { auth: true,  handler: function(d) { return emailGetSettings(); } },
  'emailSaveSettings':     { auth: true,  handler: function(d) { return emailSaveSettings(d); } },
  'emailGetLogs':          { auth: true,  handler: function(d) { return emailGetLogs(d.filters); } },
  'emailGetPanelData':     { auth: true,  handler: function(d) { return emailGetPanelData(); } },

  /* ---- WhatsApp ---- */
  'whatsappGetSettings':   { auth: true,  handler: function(d) { return whatsappGetSettings(); } },
  'whatsappSaveSettings':  { auth: true,  handler: function(d) { return whatsappSaveSettings(d); } },
  'whatsappGetTemplates':  { auth: true,  handler: function(d) { return whatsappGetTemplates(); } },
  'whatsappGetLogs':       { auth: true,  handler: function(d) { return whatsappGetLogs(d.filters); } },
  'whatsappGetPanelData':  { auth: true,  handler: function(d) { return whatsappGetPanelData(); } },

  /* ---- Backup ---- */
  'getBackupHistory':      { auth: true,  handler: function(d) { return getBackupHistory(); } },
  'createBackup':          { auth: true,  handler: function(d) { return createBackup(d.label); } },
  'restoreBackup':         { auth: true,  handler: function(d) { return restoreBackup(d.backupId); } },
  'deleteBackup':          { auth: true,  handler: function(d) { return deleteBackup(d.backupId); } },

  /* ---- Badges ---- */
  'getSidebarCounts':      { auth: true,  handler: function(d) { return getSidebarCounts(d._userEmail); } },

  /* ---- Server Info ---- */
  'getServerTimestamp':    { auth: false, handler: function(d) { return getServerTimestamp(); } }
};

/* ============================================================
   API Handler Wrappers
   Functions that need email parameter injection or data transform
   ============================================================ */

function apiGetUsers(d) {
  var users = getUsers();
  return users.map(function(u) {
    var normalized = normalizeUser(u);
    delete normalized.Password;
    return normalized;
  });
}

function apiGetJobCards(d) {
  var jobCards = getJobCards();
  if (d.status) {
    jobCards = jobCards.filter(function(jc) {
      return (jc.CurrentStatus || '').toLowerCase() === d.status.toLowerCase();
    });
  }
  if (d.search) {
    var q = d.search.toLowerCase();
    jobCards = jobCards.filter(function(jc) {
      return (jc.JobCardNo || '').toLowerCase().indexOf(q) > -1 ||
             (jc.ComplaintDescription || '').toLowerCase().indexOf(q) > -1 ||
             (jc.Machine || '').toLowerCase().indexOf(q) > -1;
    });
  }
  var page = parseInt(d.page) || 1;
  var pageSize = parseInt(d.pageSize) || 50;
  var start = (page - 1) * pageSize;
  return {
    records: jobCards.slice(start, start + pageSize),
    total: jobCards.length,
    page: page,
    pageSize: pageSize,
    totalPages: Math.ceil(jobCards.length / pageSize)
  };
}

function apiStartJobCard(d) {
  var data = {
    AssignedTechnician: d.technician || '',
    AssignedTechnicianIDs: d.technicianIds || '',
    MaintenanceTeam: d.team || '',
    StartDateTime: d.startDateTime || getCurrentTimestamp(),
    InitialRemarks: d.remarks || '',
    StartedBy: d._userEmail
  };
  return updateJobCard(d.id, data);
}

function apiCloseJobCard(d) {
  var data = {
    RootCause: d.rootCause || '',
    CorrectiveAction: d.correctiveAction || '',
    SpareParts: d.spareParts || '',
    FinalRemarks: d.finalRemarks || '',
    WorkingTime: d.workingTime || '',
    Downtime: d.downtime || '',
    TotalDuration: d.totalDuration || '',
    BreakdownType: d.breakdownType || '',
    CloseDateTime: d.closeDateTime || getCurrentTimestamp(),
    ClosedBy: d._userEmail,
    CurrentStatus: 'Closed'
  };
  return updateJobCard(d.id, data);
}

function apiPendingJobCard(d) {
  var data = {
    PendingDateTime: d.pendingDateTime || getCurrentTimestamp(),
    PendingBy: d._userEmail,
    PendingRemarks: d.remarks || '',
    CurrentStatus: 'Pending'
  };
  return updateJobCard(d.id, data);
}

function apiGetNotifications(d) {
  var email = d._userEmail;
  var role = d._userRole;
  var roleConfig = CONFIG.ROLE_NOTIFICATION_MAP[role] || {};
  var all = getUserNotifications(email);
  if (!roleConfig.viewAll && roleConfig.moduleFilter) {
    all = all.filter(function(n) {
      return roleConfig.moduleFilter.indexOf(n.Module) > -1;
    });
  }
  if (d.unreadOnly) {
    all = all.filter(function(n) { return (n.ReadStatus || '').toLowerCase() !== 'read'; });
  }
  var page = parseInt(d.page) || 1;
  var pageSize = parseInt(d.pageSize) || 50;
  var start = (page - 1) * pageSize;
  return {
    records: all.slice(start, start + pageSize),
    total: all.length,
    unreadCount: all.filter(function(n) { return (n.ReadStatus || '').toLowerCase() !== 'read'; }).length
  };
}
