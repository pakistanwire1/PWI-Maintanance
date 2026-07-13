function getDateRange(filter) {
  var now = new Date();
  switch (filter) {
    case 'today':
      var s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: s, end: new Date(s.getTime() + 86400000) };
    case 'week':
      var day = now.getDay();
      var s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: s, end: new Date(s.getTime() + 7 * 86400000) };
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    case 'lastmonth':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
    default:
      return { start: new Date(0), end: new Date(8640000000000000) };
  }
}

function inRange(dt, range) {
  if (!dt) return false;
  var d = new Date(dt);
  return d >= range.start && d < range.end;
}

function getDashboardData(filter, userDepartment) {
  try {
    var range = getDateRange(filter || 'all');

    var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
    var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
    var allJobCards = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var pms = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];

    var totalMachines = machines.length;
    var runningMachines = 0, breakdownMachines = 0;
    machines.forEach(function(m) {
      var s = (m.Status || '').toLowerCase();
      if (s === 'running' || s === 'active') runningMachines++;
      if (s === 'maintenance' || s === 'under maintenance' || s === 'breakdown') breakdownMachines++;
    });

    var totalAssets = assets.length;
    var openJobs = 0, runningJobs = 0, waitingJobs = 0, closedJobs = 0;
    var pendingJobs = 0, approvedJobs = 0;
    var criticalJobs = 0, highJobs = 0, mediumJobs = 0, lowJobs = 0;
    var totalBreakdownHours = 0, totalWorkingHours = 0, breakdownCount = 0;
    var totalJobCards = allJobCards.length;

    allJobCards.forEach(function(jc) {
      var status = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      var priority = (jc.Priority || '').toLowerCase();

      if (as === 'approved') { approvedJobs++; }
      else if (status === 'open') { openJobs++; }
      else if (status === 'running' || status === 'in progress') { runningJobs++; }
      else if (status === 'waiting' || status === 'waiting for parts') { waitingJobs++; }
      else if (status === 'pending') { pendingJobs++; }
      else if (status === 'closed' || status === 'completed') { closedJobs++; }

      if (priority === 'critical') criticalJobs++;
      else if (priority === 'high') highJobs++;
      else if (priority === 'medium') mediumJobs++;
      else if (priority === 'low') lowJobs++;

      if (status === 'closed' || status === 'completed') {
        var dur = parseDurationToHours(jc.TotalDuration || jc.Downtime || 0);
        var wt = parseDurationToHours(jc.ActualWorkingTime || jc.WorkingTime || 0);
        totalBreakdownHours += dur;
        totalWorkingHours += wt;
        if (dur > 0) breakdownCount++;
      }
    });

    var mttr = breakdownCount > 0 ? Math.round((totalWorkingHours / breakdownCount) * 100) / 100 : null;
    var mtbf = breakdownCount > 0 ? Math.round((totalJobCards / breakdownCount) * 100) / 100 : null;
    var availability = totalMachines > 0 ? Math.round(((totalMachines - breakdownMachines) / totalMachines) * 100) : 0;

    var pmDue = 0, pmOverdue = 0, pmCompleted = 0, pmScheduled = 0, pmInProgress = 0;
    var today = new Date();
    pms.forEach(function(pm) {
      var ps = (pm.Status || '').toLowerCase();
      if (ps === 'completed') { pmCompleted++; return; }
      if (ps === 'in progress') pmInProgress++;
      else if (ps === 'scheduled') pmScheduled++;
      var due = pm.NextDueDate ? new Date(pm.NextDueDate) : null;
      if (due) {
        if (due < today) pmOverdue++;
        else if (filter === 'all' || inRange(pm.NextDueDate, range)) pmDue++;
      }
    });

    var lowStockParts = 0, outOfStockParts = 0;
    var totalStockValue = 0;
    parts.forEach(function(p) {
      var stock = parseFloat(p.CurrentStock || p.Stock) || 0;
      var min = parseFloat(p.MinimumStock) || 0;
      var cost = parseFloat(p.UnitCost || p.Cost) || 0;
      if (min > 0 && stock <= min) lowStockParts++;
      if (stock <= 0) outOfStockParts++;
      totalStockValue += stock * cost;
    });

    var pmCompliance = pms.length > 0 ? Math.round((pmCompleted / pms.length) * 100) : 0;

    var qrGenerated = 0, qrPending = 0;
    try {
      var qrRecords = getAllData(CONFIG.SHEET_NAMES.QR_HISTORY) || [];
      qrGenerated = qrRecords.length;
      qrPending = totalJobCards + totalMachines + parts.length - qrGenerated;
    } catch(e) {}

    var chartMonths = [];
    var chartOpen = [], chartRunning = [], chartClosed = [], chartPending = [], chartApproved = [], chartBreakdowns = [];
    var chartMttr = [], chartMtbf = [];
    for (var m = 5; m >= 0; m--) {
      var cm = new Date(today.getFullYear(), today.getMonth() - m, 1);
      var cme = new Date(today.getFullYear(), today.getMonth() - m + 1, 1);
      chartMonths.push(Utilities.formatDate(cm, Session.getScriptTimeZone(), 'MMM'));
      var co = 0, cr = 0, cc = 0, cp = 0, ca = 0, cb = 0;
      var monthWorkHours = 0, monthDurationHours = 0, monthBreakdownCount = 0;
      allJobCards.forEach(function(jc) {
        var jd = jc.OpenDateTime || jc.DateCreated || jc.Date;
        if (!jd) return;
        var jdt = new Date(jd);
        if (jdt >= cm && jdt < cme) {
          var js = (jc.CurrentStatus || jc.Status || '').toLowerCase();
          if (js === 'open') co++;
          else if (js === 'running' || js === 'in progress') cr++;
          else if (js === 'closed' || js === 'completed') cc++;
          else if (js === 'pending') cp++;
          else if ((jc.ApprovalStatus || '').toLowerCase() === 'approved') ca++;
          var dur = parseDurationToHours(jc.TotalDuration || jc.Downtime || 0);
          var wh = parseDurationToHours(jc.ActualWorkingTime || jc.WorkingTime || 0);
          if (dur > 0 || js === 'closed' || js === 'completed') {
            monthDurationHours += dur;
            monthWorkHours += wh;
            if (dur > 0) { cb++; monthBreakdownCount++; }
          }
        }
      });
      chartOpen.push(co);
      chartRunning.push(cr);
      chartClosed.push(cc);
      chartPending.push(cp);
      chartApproved.push(ca);
      chartBreakdowns.push(cb);
      chartMttr.push(monthBreakdownCount > 0 ? Math.round((monthWorkHours / monthBreakdownCount) * 100) / 100 : null);
      var prevMonthStart = new Date(cm.getTime() - 30 * 86400000);
      var prevMonthEnd = new Date(cm.getTime());
      var prevBdCount = 0;
      if (m < 5) {
        var pmIdx = 5 - m - 1;
        prevBdCount = chartBreakdowns[pmIdx] || 0;
      }
      chartMtbf.push(prevBdCount > 0 ? Math.round((30 / prevBdCount) * 100) / 100 : null);
    }

    return {
      totalMachines: totalMachines,
      runningMachines: runningMachines,
      breakdownMachines: breakdownMachines,
      totalAssets: totalAssets,
      totalJobCards: totalJobCards,
      openJobs: openJobs,
      runningJobs: runningJobs,
      waitingJobs: waitingJobs,
      closedJobs: closedJobs,
      pendingJobs: pendingJobs,
      approvedJobs: approvedJobs,
      criticalPriority: criticalJobs,
      highPriority: highJobs,
      mediumPriority: mediumJobs,
      lowPriority: lowJobs,
      hasPriorityData: (criticalJobs + highJobs + mediumJobs + lowJobs) > 0,
      breakdownHours: Math.round(totalBreakdownHours * 100) / 100,
      mttr: mttr,
      mtbf: mtbf,
      availability: availability,
      pmDue: pmDue,
      pmOverdue: pmOverdue,
      lowStockParts: lowStockParts,
      outOfStockParts: outOfStockParts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      pmCompleted: pmCompleted,
      pmScheduled: pmScheduled,
      pmInProgress: pmInProgress,
      pmCompliance: pmCompliance,
      qrGenerated: qrGenerated,
      qrPending: Math.max(0, qrPending),
      charts: {
        months: chartMonths,
        openJobs: chartOpen,
        runningJobs: chartRunning,
        closedJobs: chartClosed,
        pendingJobs: chartPending,
        approvedJobs: chartApproved,
        breakdowns: chartBreakdowns,
        mttr: chartMttr,
        mtbf: chartMtbf
      }
    };
  } catch (e) {
    return handleError('getDashboardData', e);
  }
}
