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
      var s = (jc.Status || '').toLowerCase();
      if (s === 'open') openJobs++;
      else if (s === 'running' || s === 'in progress') runningJobs++;
      else if (s === 'waiting' || s === 'waiting for parts') waitingJobs++;

      if (s === 'closed' || s === 'completed') {
        var as = (jc.ApprovalStatus || '').toLowerCase();
        if (as !== 'approved') pendingApproval++;
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
