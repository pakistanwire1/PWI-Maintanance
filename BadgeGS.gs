function getSidebarCounts(email) {
  var jcData = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var notifData = getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
  var emailData = getAllData(CONFIG.SHEET_NAMES.EMAIL_LOGS) || [];
  var pmData = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
  var spData = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var grData = getAllData(CONFIG.SHEET_NAMES.GOODS_RECEIPT) || [];

  var openJobs = 0, startedJobs = 0, pendingJobs = 0, closedJobs = 0, approvedJobs = 0;
  for (var i = 0; i < jcData.length; i++) {
    var jc = jcData[i];
    var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
    if (s === 'open') openJobs++;
    else if (s === 'running' || s === 'in progress') startedJobs++;
    else if (s === 'pending') pendingJobs++;
    else if (s === 'closed' || s === 'completed') {
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (as === 'approved') approvedJobs++;
      else closedJobs++;
    }
    else if (s === 'approved') approvedJobs++;
  }

  var unreadNotifications = 0;
  for (var ni = 0; ni < notifData.length; ni++) {
    var n = notifData[ni];
    var rs = (n.ReadStatus || '').toLowerCase();
    if (rs === 'unread') {
      var assigned = n.AssignedTo || '';
      if (!assigned || assigned === email) unreadNotifications++;
    }
  }

  var pendingEmails = 0;
  for (var ei = 0; ei < emailData.length; ei++) {
    var es = (emailData[ei].Status || '').toLowerCase();
    if (es === 'pending' || es === 'failed') pendingEmails++;
  }

  var today = new Date();
  var sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  var overduePM = 0, upcomingPM = 0;
  for (var pi = 0; pi < pmData.length; pi++) {
    var pm = pmData[pi];
    if ((pm.Status || '').toLowerCase() === 'completed') continue;
    var dueStr = pm.NextDueDate || pm.DueDate || '';
    if (!dueStr) continue;
    var dueDate = new Date(dueStr);
    if (dueDate < today) overduePM++;
    else if (dueDate <= sevenDaysLater) upcomingPM++;
  }

  var lowStock = 0, outOfStock = 0;
  for (var si = 0; si < spData.length; si++) {
    var part = spData[si];
    var stock = parseFloat(part.CurrentStock || part.Stock || part.QuantityOnHand || part.Quantity || 0);
    var reorder = parseFloat(part.ReorderLevel || part.MinimumStock || part.MinStock || 0);
    if (stock <= 0) outOfStock++;
    else if (reorder > 0 && stock <= reorder) lowStock++;
  }

  var pendingGR = 0;
  for (var gi = 0; gi < grData.length; gi++) {
    if ((grData[gi].Status || '').toLowerCase() !== 'received') pendingGR++;
  }

  var pendingWhatsApp = 0;
  try {
    var waLogs = getAllData(WHATSAPP.SHEET) || [];
    var todayStr = today.toISOString().substring(0, 10);
    for (var wi = 0; wi < waLogs.length; wi++) {
      var w = waLogs[wi];
      var ws = (w.Status || '').toLowerCase();
      if (ws === 'pending' && String(w.DateTime || '').substring(0, 10) === todayStr) pendingWhatsApp++;
    }
  } catch(e) {}

  return {
    openJobCards: openJobs,
    startedJobCards: startedJobs,
    pendingJobCards: pendingJobs,
    closedJobCards: closedJobs,
    approvedJobCards: approvedJobs,
    pendingPM: overduePM + upcomingPM,
    inventoryAlerts: lowStock + outOfStock,
    pendingGR: pendingGR,
    unreadNotifications: unreadNotifications,
    pendingEmails: pendingEmails,
    pendingWhatsApp: pendingWhatsApp
  };
}

function diagnoseBadgeCounts(email) {
  var result = {};
  try {
    result.email = email;
    var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function(s) { return s.getName(); });
    result.existingSheets = sheets;

    var sheetNames = [
      CONFIG.SHEET_NAMES.JOBCARDS,
      CONFIG.SHEET_NAMES.NOTIFICATIONS,
      CONFIG.SHEET_NAMES.EMAIL_LOGS,
      CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE,
      CONFIG.SHEET_NAMES.SPARE_PARTS,
      CONFIG.SHEET_NAMES.GOODS_RECEIPT
    ];
    if (typeof WHATSAPP !== 'undefined' && WHATSAPP.SHEET) {
      sheetNames.push(WHATSAPP.SHEET);
    }

    result.sheetInfo = {};
    for (var si = 0; si < sheetNames.length; si++) {
      var sname = sheetNames[si];
      var info = { exists: sheets.indexOf(sname) >= 0 };
      try {
        var rawData = getAllData(sname) || [];
        info.rowCount = rawData.length;
        info.headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];
        if (rawData.length > 0) {
          info.sample = {};
          var keys = Object.keys(rawData[0]);
          for (var ki = 0; ki < Math.min(keys.length, 10); ki++) {
            info.sample[keys[ki]] = String(rawData[0][keys[ki]]).substring(0, 40);
          }
        }
      } catch(e2) {
        info.error = e2.message;
      }
      result.sheetInfo[sname] = info;
    }

    result.finalCounts = getSidebarCounts(email);
    result.success = true;
  } catch (e) {
    result.success = false;
    result.error = e.message;
    result.stack = e.stack;
  }
  return result;
}

function getBadgeCounts() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var email = Session.getActiveUser().getEmail();
    var today = new Date();
    var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    var jcData = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var notifData = getAllData(CONFIG.SHEET_NAMES.NOTIFICATIONS) || [];
    var emailData = getAllData(CONFIG.SHEET_NAMES.EMAIL_LOGS) || [];
    var pmData = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var spData = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];

    var openJobs = 0, runningJobs = 0, waitingJobs = 0;
    var pendingApproval = 0, completedToday = 0;

    for (var i = 0; i < jcData.length; i++) {
      var jc = jcData[i];
      var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (s === 'open') openJobs++;
      else if ((s === 'running' || s === 'in progress') && as !== 'returned') runningJobs++;
      else if ((s === 'running' || s === 'in progress') && as === 'returned') waitingJobs++;

      if (s === 'pending' || ((s === 'closed' || s === 'completed') && as !== 'approved')) {
        pendingApproval++;
        var dt = jc.CloseDateTime || jc.CloseTime || '';
        if (dt.indexOf(todayStr) === 0) completedToday++;
      }
    }

    var unreadNotifications = 0;
    for (var ni = 0; ni < notifData.length; ni++) {
      var n = notifData[ni];
      if ((n.ReadStatus || n.Status || '') === 'Unread') {
        var assigned = n.AssignedTo || '';
        if (!assigned || assigned === email) unreadNotifications++;
      }
    }

    var pendingEmails = 0;
    for (var ei = 0; ei < emailData.length; ei++) {
      var e = emailData[ei];
      if ((e.Status || '') === 'Pending') pendingEmails++;
    }

    var overduePM = 0, upcomingPM = 0;
    for (var pi = 0; pi < pmData.length; pi++) {
      var pm = pmData[pi];
      var ps = (pm.Status || '').toLowerCase();
      if (ps === 'completed') continue;
      var dueStr = pm.NextDueDate || pm.DueDate || '';
      if (!dueStr) continue;
      var dueDate = new Date(dueStr);
      if (dueDate < today) { overduePM++; }
      else if (dueDate <= sevenDaysLater) { upcomingPM++; }
    }

    var lowStock = 0, outOfStock = 0;
    for (var si = 0; si < spData.length; si++) {
      var part = spData[si];
      var stock = parseFloat(part.CurrentStock || part.Stock || part.QuantityOnHand || 0);
      var reorder = parseFloat(part.ReorderLevel || part.MinimumStock || 0);
      if (stock <= 0) outOfStock++;
      else if (reorder > 0 && stock <= reorder) lowStock++;
    }

    return {
      openJobs: openJobs,
      runningJobs: runningJobs,
      waitingJobs: waitingJobs,
      pendingApproval: pendingApproval,
      completedToday: completedToday,
      totalOpenJobs: openJobs + runningJobs + waitingJobs,
      unreadNotifications: unreadNotifications,
      pendingEmails: pendingEmails,
    pendingWhatsApp: whatsappGetDashboardStats ? (whatsappGetDashboardStats().pendingToday || 0) : 0,
      upcomingPM: upcomingPM,
      overduePM: overduePM,
      totalPM: upcomingPM + overduePM,
      lowStock: lowStock,
      outOfStock: outOfStock,
      totalInventory: lowStock + outOfStock
    };
  } catch (e) {
    return handleError('getBadgeCounts', e);
  }
}
