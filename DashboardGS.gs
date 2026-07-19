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

function jcDate(jc) {
  return jc.DateCreated || jc.OpenDateTime || jc.DateTime || jc.Date || '';
}

function getDashboardData(filter, userDepartment, userEmail) {
  try {
    var range = getDateRange(filter || 'all');
    var isAll = filter === 'all' || !filter;

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
    var idleMachines = totalMachines - runningMachines - breakdownMachines;
    var filteredJobCount = 0;
    var openJobs = 0, runningJobs = 0, waitingJobs = 0, closedJobs = 0;
    var pendingJobs = 0, approvedJobs = 0, pendingApprovalJobs = 0;
    var criticalJobs = 0, highJobs = 0, mediumJobs = 0, lowJobs = 0;
    var totalBreakdownHours = 0, totalWorkingHours = 0, breakdownCount = 0;
    var totalBreakdownMinutes = 0, totalWorkingMinutes = 0;
    var deptJobCounts = {};

    var earliestDate = null;
    var allTimeBreakdownHours = 0, allTimeWorkingHours = 0, allTimeBreakdownCount = 0;

    allJobCards.forEach(function(jc) {
      var jd = jcDate(jc);
      if (jd) {
        var dt = new Date(jd);
        if (!isNaN(dt.getTime()) && (!earliestDate || dt < earliestDate)) earliestDate = dt;
      }
      var allStatus = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var allAs = (jc.ApprovalStatus || '').toLowerCase();
      var allDone = (allStatus === 'pending' || allStatus === 'approved' || allStatus === 'closed' || allStatus === 'completed');
      if (allDone) {
        var allDur = parseDurationToHours(jc.TotalDuration || jc.Downtime || 0);
        var allWt = parseDurationToHours(jc.ActualWorkingTime || jc.WorkingTime || 0);
        if (allDur === 0 && jc.CloseDateTime && jc.OpenDateTime) {
          allDur = calculateDuration(jc.OpenDateTime, jc.CloseDateTime) / 60;
        }
        if (allWt === 0 && jc.CloseDateTime && jc.StartDateTime) {
          allWt = calculateDuration(jc.StartDateTime, jc.CloseDateTime) / 60;
        }
        allTimeBreakdownHours += allDur;
        allTimeWorkingHours += allWt;
        allTimeBreakdownCount++;
      }
    });

    allJobCards.forEach(function(jc) {
      if (!isAll && !inRange(jcDate(jc), range)) return;
      filteredJobCount++;
      var status = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      var priority = (jc.Priority || '').toLowerCase();

      if (as === 'approved') { approvedJobs++; }
      else if (status === 'open') { openJobs++; }
      else if ((status === 'running' || status === 'in progress') && as !== 'returned') { runningJobs++; }
      else if ((status === 'running' || status === 'in progress') && as === 'returned') { runningJobs++; }
      else if (status === 'pending') { pendingJobs++; }
      else if (status === 'closed' || status === 'completed') { closedJobs++; }

      if (status === 'pending' || ((status === 'closed' || status === 'completed') && as !== 'approved')) {
        pendingApprovalJobs++;
      }

      if (priority === 'critical') criticalJobs++;
      else if (priority === 'high') highJobs++;
      else if (priority === 'medium') mediumJobs++;
      else if (priority === 'low') lowJobs++;

      var dept = jc.Department || 'Unknown';
      deptJobCounts[dept] = (deptJobCounts[dept] || 0) + 1;

      var isDone = (status === 'pending' || status === 'approved' || status === 'closed' || status === 'completed');
      if (isDone) {
        var dur = parseDurationToHours(jc.TotalDuration || jc.Downtime || 0);
        var wt = parseDurationToHours(jc.ActualWorkingTime || jc.WorkingTime || 0);
        if (dur === 0 && jc.CloseDateTime && jc.OpenDateTime) {
          dur = calculateDuration(jc.OpenDateTime, jc.CloseDateTime) / 60;
        }
        if (wt === 0 && jc.CloseDateTime && jc.StartDateTime) {
          wt = calculateDuration(jc.StartDateTime, jc.CloseDateTime) / 60;
        }
        totalBreakdownHours += dur;
        totalWorkingHours += wt;
        totalBreakdownMinutes += Math.round(dur * 60);
        totalWorkingMinutes += Math.round(wt * 60);
        breakdownCount++;
      }
    });

    waitingJobs = openJobs;
    var totalJobCards = filteredJobCount;

    var effectiveMachines = totalMachines > 0 ? totalMachines : 1;
    var rangeHours;
    if (isAll) {
      rangeHours = earliestDate ? Math.max(1, Math.round((new Date() - earliestDate) / 3600000)) : 8760;
    } else {
      rangeHours = Math.max(1, Math.round((range.end - range.start) / 3600000));
    }

    var allTimeRangeHours = earliestDate ? Math.max(1, Math.round((new Date() - earliestDate) / 3600000)) : 8760;
    var allTimeMachineRunningHours = Math.max(0, (allTimeRangeHours * effectiveMachines) - allTimeBreakdownHours);

    var mttr = allTimeBreakdownCount > 0 ? Math.round((allTimeWorkingHours / allTimeBreakdownCount) * 100) / 100 : null;
    var mtbf = allTimeBreakdownCount > 0 ? Math.round((allTimeMachineRunningHours / allTimeBreakdownCount) * 100) / 100 : null;
    var totalMachineRunningHours = Math.max(0, (rangeHours * effectiveMachines) - totalBreakdownHours);
    var availability = (rangeHours * effectiveMachines) > 0 ? Math.round((totalMachineRunningHours / (rangeHours * effectiveMachines)) * 10000) / 100 : 0;

    var pmDue = 0, pmOverdue = 0, pmCompleted = 0, pmScheduled = 0, pmInProgress = 0, pmMissed = 0, pmSkipped = 0;
    var today = new Date();
    pms.forEach(function(pm) {
      var ps = (pm.Status || '').toLowerCase();
      if (ps === 'completed') { pmCompleted++; return; }
      if (ps === 'missed') { pmMissed++; return; }
      if (ps === 'skipped') { pmSkipped++; return; }
      if (ps === 'in progress') pmInProgress++;
      else if (ps === 'scheduled') pmScheduled++;
      var due = pm.NextDueDate ? new Date(pm.NextDueDate) : null;
      if (due) {
        if (due < today) pmOverdue++;
        else if (isAll || inRange(pm.NextDueDate, range)) pmDue++;
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

    var pmTotalDue = pmCompleted + pmOverdue + pmMissed + pmSkipped;
    var pmCompliance = pmTotalDue > 0 ? Math.round((pmCompleted / pmTotalDue) * 100) : 100;

    var qrGenerated = 0, qrPending = 0;
    try {
      var qrRecords = getAllData(CONFIG.SHEET_NAMES.QR_HISTORY) || [];
      qrGenerated = qrRecords.length;
      qrPending = totalJobCards + totalMachines + parts.length - qrGenerated;
    } catch(e) {}

    var chartMonths = [];
    var chartOpen = [], chartRunning = [], chartClosed = [], chartPending = [], chartApproved = [], chartBreakdowns = [];
    var chartMttr = [], chartMtbf = [];

    var monthCount = 6;
    var cumulativeWorkHours = 0, cumulativeBreakdownCount = 0, cumulativeBreakdownHours = 0;
    for (var m = monthCount - 1; m >= 0; m--) {
      var cm = new Date(today.getFullYear(), today.getMonth() - m, 1);
      var cme = new Date(today.getFullYear(), today.getMonth() - m + 1, 1);
      chartMonths.push(Utilities.formatDate(cm, Session.getScriptTimeZone(), 'MMM'));
      var co = 0, cr = 0, cc = 0, cp = 0, ca = 0, cb = 0;
      var monthWorkHours = 0, monthDurationHours = 0, monthBreakdownCount = 0;
      allJobCards.forEach(function(jc) {
        var jd = jcDate(jc);
        if (!jd) return;
        var jdt = new Date(jd);
        if (jdt >= cm && jdt < cme) {
          var js = (jc.CurrentStatus || jc.Status || '').toLowerCase();
          var jas = (jc.ApprovalStatus || '').toLowerCase();
          if (js === 'open') co++;
          else if ((js === 'running' || js === 'in progress') && jas !== 'returned') cr++;
          else if ((js === 'running' || js === 'in progress') && jas === 'returned') cb++;
          else if (js === 'closed' || js === 'completed') cc++;
          else if (js === 'pending') cp++;
          else if (jas === 'approved') ca++;
          var dur = parseDurationToHours(jc.TotalDuration || jc.Downtime || 0);
          var wh = parseDurationToHours(jc.ActualWorkingTime || jc.WorkingTime || 0);
          var isDone = (js === 'pending' || js === 'approved' || js === 'closed' || js === 'completed');
          if (isDone) {
            if (dur === 0 && jc.CloseDateTime && jc.OpenDateTime) {
              dur = calculateDuration(jc.OpenDateTime, jc.CloseDateTime) / 60;
            }
            if (wh === 0 && jc.CloseDateTime && jc.StartDateTime) {
              wh = calculateDuration(jc.StartDateTime, jc.CloseDateTime) / 60;
            }
            monthDurationHours += dur;
            monthWorkHours += wh;
            monthBreakdownCount++;
          }
        }
      });
      chartOpen.push(co);
      chartRunning.push(cr);
      chartClosed.push(cc);
      chartPending.push(cp);
      chartApproved.push(ca);
      chartBreakdowns.push(cb);
      cumulativeWorkHours += monthWorkHours;
      cumulativeBreakdownCount += monthBreakdownCount;
      cumulativeBreakdownHours += monthDurationHours;
      var chartMttrVal = cumulativeBreakdownCount > 0 ? Math.round((cumulativeWorkHours / cumulativeBreakdownCount) * 100) / 100 : null;
      var cumMachineRunning = Math.max(0, (allTimeRangeHours * effectiveMachines) - cumulativeBreakdownHours);
      var chartMtbfVal = cumulativeBreakdownCount > 0 ? Math.round((cumMachineRunning / cumulativeBreakdownCount) * 100) / 100 : null;
      chartMttr.push(chartMttrVal);
      chartMtbf.push(chartMtbfVal);
    }

    var mttrValues = chartMttr.filter(function(v) { return v !== null && v > 0; });
    var mttrStats = {
      avg: mttr !== null ? mttr : 0,
      max: mttrValues.length > 0 ? Math.max.apply(null, mttrValues) : 0,
      min: mttrValues.length > 0 ? Math.min.apply(null, mttrValues) : 0,
      count: mttrValues.length
    };

    var notifStats = { unread: 0, critical: 0, pendingApproval: 0 };
    try {
      var ns = getNotificationStats(userEmail || '');
      notifStats.unread = ns.unread || 0;
      notifStats.critical = ns.critical || 0;
      notifStats.pendingApproval = ns.pendingApproval || 0;
    } catch(e) {}

    var totalStatusJobs = openJobs + runningJobs + closedJobs + pendingJobs + approvedJobs;
    var totalPriorityJobs = criticalJobs + highJobs + mediumJobs + lowJobs;

    return {
      totalMachines: totalMachines,
      runningMachines: runningMachines,
      breakdownMachines: breakdownMachines,
      idleMachines: Math.max(0, idleMachines),
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
      totalDowntimeMinutes: totalBreakdownMinutes,
      totalWorkingMinutes: totalWorkingMinutes,
      mttr: mttr,
      mtbf: mtbf,
      availability: availability,
      pmDue: pmDue,
      pmOverdue: pmOverdue,
      lowStockParts: lowStockParts,
      outOfStockParts: outOfStockParts,
      totalStockValue: Math.round(totalStockValue),
      pmCompleted: pmCompleted,
      pmScheduled: pmScheduled,
      pmInProgress: pmInProgress,
      pmCompliance: pmCompliance,
      qrGenerated: qrGenerated,
      qrPending: Math.max(0, qrPending),
      mttrStats: mttrStats,
      totalStatusJobs: totalStatusJobs,
      totalPriorityJobs: totalPriorityJobs,
      notifUnread: notifStats.unread,
      notifCritical: notifStats.critical,
      pendingApprovalJobs: pendingApprovalJobs,
      notifPendingApproval: notifStats.pendingApproval,
      charts: {
        months: chartMonths,
        openJobs: chartOpen,
        runningJobs: chartRunning,
        closedJobs: chartClosed,
        pendingJobs: chartPending,
        approvedJobs: chartApproved,
        breakdowns: chartBreakdowns,
        mttr: chartMttr,
        mtbf: chartMtbf,
        departmentJobs: deptJobCounts
      }
    };
  } catch (e) {
    return handleError('getDashboardData', e);
  }
}
