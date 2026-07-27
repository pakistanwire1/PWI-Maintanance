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

function resolveMinutes(jc, field) {
  var raw = jc[field];
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return raw > 0 ? raw : 0;
  return normalizeDuration(raw);
}

function resolveRepairMinutes(jc) {
  if (jc.CloseDateTime && jc.StartDateTime) {
    var m = calculateDuration(jc.StartDateTime, jc.CloseDateTime);
    if (m > 0) return m;
  }
  return resolveMinutes(jc, 'WorkingTime');
}

function resolveDowntimeMinutes(jc) {
  var m = resolveMinutes(jc, 'TotalDuration');
  if (m > 0) return m;
  m = resolveMinutes(jc, 'Downtime');
  if (m > 0) return m;
  if (jc.CloseDateTime && jc.OpenDateTime) {
    m = calculateDuration(jc.OpenDateTime, jc.CloseDateTime);
    if (m > 0) return m;
  }
  return 0;
}

function inspectJobCards() {
  try {
    invalidateCache(CONFIG.SHEET_NAMES.JOBCARDS);
    var raw = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var count = raw.length;

    console.log('');
    console.log('========================================');
    console.log('  JOBCARD SHEET DIAGNOSTIC');
    console.log('  Total rows: ' + count);
    console.log('========================================');

    if (count === 0) {
      console.log('[RESULT] Sheet is EMPTY. No job cards found.');
      return { total: 0, headers: [], first10: [], counts: {} };
    }

    var headers = Object.keys(raw[0]);
    console.log('[HEADERS] ' + headers.join(', '));
    console.log('');

    var first10 = [];
    var showCount = Math.min(count, 10);
    console.log('--- FIRST ' + showCount + ' ROWS ---');
    for (var i = 0; i < showCount; i++) {
      var r = raw[i];
      var rec = {
        JobCardNo: r.JobCardNo || 'N/A',
        OpenDateTime: r.OpenDateTime || 'EMPTY',
        CloseDateTime: r.CloseDateTime || 'EMPTY',
        WaitingTime: r.WaitingTime === undefined ? 'UNDEFINED' : r.WaitingTime,
        WorkingTime: r.WorkingTime === undefined ? 'UNDEFINED' : r.WorkingTime,
        Downtime: r.Downtime === undefined ? 'UNDEFINED' : r.Downtime,
        TotalDuration: r.TotalDuration === undefined ? 'UNDEFINED' : r.TotalDuration,
        CurrentStatus: r.CurrentStatus || r.Status || 'MISSING'
      };
      first10.push(rec);

      console.log('[ROW ' + i + '] ' + rec.JobCardNo +
        ' | Status=' + rec.CurrentStatus +
        ' | Open=' + JSON.stringify(rec.OpenDateTime) + '(' + typeof r.OpenDateTime + ')' +
        ' | Close=' + JSON.stringify(rec.CloseDateTime) + '(' + typeof r.CloseDateTime + ')');
      console.log('  WaitingTime=' + JSON.stringify(rec.WaitingTime) + '(' + typeof r.WaitingTime + ') -> mins=' + normalizeDuration(r.WaitingTime));
      console.log('  WorkingTime=' + JSON.stringify(rec.WorkingTime) + '(' + typeof r.WorkingTime + ') -> mins=' + normalizeDuration(r.WorkingTime));
      console.log('  Downtime=' + JSON.stringify(rec.Downtime) + '(' + typeof r.Downtime + ') -> mins=' + normalizeDuration(r.Downtime));
      console.log('  TotalDuration=' + JSON.stringify(rec.TotalDuration) + '(' + typeof r.TotalDuration + ') -> mins=' + normalizeDuration(r.TotalDuration));
    }
    console.log('');

    var cntWaiting = 0, cntWorking = 0, cntDowntime = 0, cntTotalDur = 0;
    var sumWaiting = 0, sumWorking = 0, sumDowntime = 0, sumTotalDur = 0;
    for (var i = 0; i < count; i++) {
      var r = raw[i];
      var wtMins = normalizeDuration(r.WaitingTime);
      var wkMins = normalizeDuration(r.WorkingTime);
      var dtMins = normalizeDuration(r.Downtime);
      var tdMins = normalizeDuration(r.TotalDuration);
      if (wtMins > 0) cntWaiting++;
      if (wkMins > 0) cntWorking++;
      if (dtMins > 0) cntDowntime++;
      if (tdMins > 0) cntTotalDur++;
      sumWaiting += wtMins;
      sumWorking += wkMins;
      sumDowntime += dtMins;
      sumTotalDur += tdMins;
    }

    console.log('--- FIELD COUNTS (rows with value > 0) ---');
    console.log('WaitingTime  > 0: ' + cntWaiting + ' / ' + count + ' rows | SUM = ' + sumWaiting + ' mins (' + durationToDisplay(sumWaiting) + ')');
    console.log('WorkingTime  > 0: ' + cntWorking + ' / ' + count + ' rows | SUM = ' + sumWorking + ' mins (' + durationToDisplay(sumWorking) + ')');
    console.log('Downtime     > 0: ' + cntDowntime + ' / ' + count + ' rows | SUM = ' + sumDowntime + ' mins (' + durationToDisplay(sumDowntime) + ')');
    console.log('TotalDuration> 0: ' + cntTotalDur + ' / ' + count + ' rows | SUM = ' + sumTotalDur + ' mins (' + durationToDisplay(sumTotalDur) + ')');
    console.log('');

    var cntZero = count - cntWaiting;
    var cntEmpty = 0;
    for (var i = 0; i < count; i++) {
      var wt = raw[i].WaitingTime;
      if (wt === '' || wt === null || wt === undefined || wt === 0) cntEmpty++;
    }
    console.log('WaitingTime is empty/zero/null: ' + cntEmpty + ' / ' + count + ' rows');
    console.log('');
    console.log('========================================');
    console.log('  END DIAGNOSTIC');
    console.log('========================================');
    console.log('');

    return {
      total: count,
      headers: headers,
      first10: first10,
      counts: {
        WaitingTime_gt0: cntWaiting,
        WorkingTime_gt0: cntWorking,
        Downtime_gt0: cntDowntime,
        TotalDuration_gt0: cntTotalDur,
        WaitingTime_sum: sumWaiting,
        WorkingTime_sum: sumWorking,
        Downtime_sum: sumDowntime,
        TotalDuration_sum: sumTotalDur
      }
    };
  } catch (e) {
    console.log('[ERROR] inspectJobCards: ' + e.message);
    return { error: e.message };
  }
}

function getDashboardData(filter, userDepartment, userEmail) {
  try {
    var range = getDateRange(filter || 'all');
    var isAll = filter === 'all' || !filter;
    var today = new Date();

    invalidateCache(CONFIG.SHEET_NAMES.JOBCARDS);
    var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
    var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
    var rawJobCards = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
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

    var totalWaitingMinutes = 0, totalWorkingMinutes = 0, totalRepairMinutes = 0, totalDowntimeMinutes = 0;

    var earliestDate = null;
    var normalized = [];
    for (var i = 0; i < rawJobCards.length; i++) {
      var jc = rawJobCards[i];

      var jd = jcDate(jc);
      if (jd) {
        var dt = new Date(jd);
        if (!isNaN(dt.getTime())) {
          if (!earliestDate || dt < earliestDate) earliestDate = dt;
        }
      }

      jc = normalizeJobCard(jc);

      var status = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var isClosed = (status === 'closed' || status === 'approved');
      var isOpen = (status === 'open');
      var isReturned = (status === 'returned' || status === 'return');
      var isRunning = (status === 'running');
      var isPending = (status === 'pending');
      var approvalStatus = (jc.ApprovalStatus || '').toLowerCase();
      var isApproved = (approvalStatus === 'approved');
      var isPendingApproval = (approvalStatus === 'pending');
      var hasBreakdownType = jc.BreakdownType && jc.BreakdownType !== '';
      var waitingMins = resolveMinutes(jc, 'WaitingTime');
      var workingMins = resolveMinutes(jc, 'WorkingTime');
      var repairMins = resolveRepairMinutes(jc);
      var downtimeMins = resolveDowntimeMinutes(jc);

      if (i < 3) {
        console.log('[DASH #' + i + '] ' + (jc.JobCardNo || 'N/A') + ' status=' + status +
          ' WaitingTime_raw=' + JSON.stringify(rawJobCards[i].WaitingTime) +
          ' afterNormalize=' + jc.WaitingTime +
          ' resolved=' + waitingMins +
          ' | WorkingTime_raw=' + JSON.stringify(rawJobCards[i].WorkingTime) +
          ' afterNormalize=' + jc.WorkingTime +
          ' resolved=' + workingMins +
          ' | Downtime_raw=' + JSON.stringify(rawJobCards[i].Downtime) +
          ' afterNormalize=' + jc.Downtime +
          ' resolved=' + downtimeMins);
      }

      normalized.push({
        raw: jc,
        jd: jd || jc.OpenDateTime || '',
        status: status,
        isClosed: isClosed,
        isOpen: isOpen,
        isReturned: isReturned,
        isRunning: isRunning,
        isPending: isPending,
        isApproved: isApproved,
        isPendingApproval: isPendingApproval,
        isWaiting: isOpen,
        hasBreakdownType: hasBreakdownType,
        priority: (jc.Priority || '').toLowerCase(),
        dept: jc.Department || 'Unknown',
        waitingMins: waitingMins,
        workingMins: workingMins,
        repairMins: repairMins,
        downtimeMins: downtimeMins,
        closeDate: jc.CloseDateTime || ''
      });
    }

    var filtered = [];
    for (var i = 0; i < normalized.length; i++) {
      var n = normalized[i];
      if (isAll || inRange(n.jd, range)) {
        filtered.push(n);
      }
    }

    var filteredJobCount = filtered.length;
    var openJobs = 0, runningJobs = 0, closedJobs = 0;
    var waitingJobs = 0, approvedJobs = 0, pendingApprovalJobs = 0;
    var criticalJobs = 0, highJobs = 0, mediumJobs = 0, lowJobs = 0;
    var deptJobCounts = {};

    var breakdownJobCount = 0;
    var breakdownClosedCount = 0;
    var breakdownClosedRepairMinutes = 0;
    var breakdownTypeDowntimeMinutes = 0;
    var breakdownMaintenanceCount = 0;
    var preventiveMaintenanceCount = 0;

    for (var i = 0; i < filtered.length; i++) {
      var n = filtered[i];

      totalWaitingMinutes += n.waitingMins;
      totalWorkingMinutes += n.workingMins;
      totalRepairMinutes += n.repairMins;
      totalDowntimeMinutes += n.downtimeMins;

      if (n.isApproved) { approvedJobs++; }
      else if (n.isPending) { pendingApprovalJobs++; }
      else if (n.isOpen) { openJobs++; waitingJobs++; }
      else if (n.isRunning) { runningJobs++; }
      else if (n.isClosed) { closedJobs++; }

      if (n.priority === 'critical') criticalJobs++;
      else if (n.priority === 'high') highJobs++;
      else if (n.priority === 'medium') mediumJobs++;
      else if (n.priority === 'low') lowJobs++;

      deptJobCounts[n.dept] = (deptJobCounts[n.dept] || 0) + 1;

      var bdType = (n.raw.BreakdownType || '').toLowerCase();
      if (bdType === 'breakdown maintenance') {
        breakdownMaintenanceCount++;
        if (n.isClosed) {
          breakdownJobCount++;
          breakdownClosedCount++;
          breakdownClosedRepairMinutes += n.repairMins;
          breakdownTypeDowntimeMinutes += n.downtimeMins;
        }
      }
      else if (bdType === 'preventive maintenance') preventiveMaintenanceCount++;
    }

    var effectiveMachines = totalMachines > 0 ? totalMachines : 1;
    var rangeHours;
    if (isAll) {
      rangeHours = earliestDate ? Math.max(1, Math.round((new Date() - earliestDate) / 3600000)) : 8760;
    } else {
      rangeHours = Math.max(1, Math.round((range.end - range.start) / 3600000));
    }

    var totalRepairHours = totalRepairMinutes / 60;
    var totalDowntimeHours = totalDowntimeMinutes / 60;
    var totalWorkingHours = totalWorkingMinutes / 60;
    var totalWaitingHours = totalWaitingMinutes / 60;

    var mttr = breakdownClosedCount > 0 ? Math.round((breakdownClosedRepairMinutes / breakdownClosedCount / 60) * 100) / 100 : null;

    var totalRunningHours = Math.max(0, rangeHours - (breakdownTypeDowntimeMinutes / 60));
    var mtbf = breakdownJobCount > 0 ? Math.round((totalRunningHours / breakdownJobCount) * 100) / 100 : null;

    console.log('');
    console.log('===== P11.32 MTBF DEBUG =====');
    console.log('breakdownMaintenanceCount=' + breakdownMaintenanceCount);
    console.log('breakdownClosedCount=' + breakdownClosedCount);
    console.log('breakdownJobCount=' + breakdownJobCount);
    console.log('breakdownClosedRepairMinutes=' + breakdownClosedRepairMinutes);
    console.log('breakdownTypeDowntimeMinutes=' + breakdownTypeDowntimeMinutes);
    console.log('totalWorkingMinutes=' + totalWorkingMinutes);
    console.log('totalDowntimeMinutes=' + totalDowntimeMinutes);
    console.log('rangeHours=' + rangeHours);
    console.log('totalRunningHours=' + totalRunningHours);
    console.log('mtbf=' + mtbf);
    console.log('mttr=' + mttr);
    var bdDebugJobs = [];
    for (var di = 0; di < filtered.length; di++) {
      var dn = filtered[di];
      var dBdType = (dn.raw.BreakdownType || '').toLowerCase();
      if (dBdType === 'breakdown maintenance') {
        bdDebugJobs.push({
          JobCardNo: dn.raw.JobCardNo,
          CurrentStatus: dn.raw.CurrentStatus || dn.raw.Status,
          ApprovalStatus: dn.raw.ApprovalStatus,
          isClosed: dn.isClosed,
          isPending: dn.isPending,
          isApproved: dn.isApproved,
          isPendingApproval: dn.isPendingApproval,
          downtimeMins: dn.downtimeMins,
          repairMins: dn.repairMins,
          workingMins: dn.workingMins
        });
      }
    }
    console.log('BD_JOBS=' + JSON.stringify(bdDebugJobs));

    var availability = (totalWorkingMinutes + totalDowntimeMinutes) > 0 ? Math.round((totalWorkingMinutes / (totalWorkingMinutes + totalDowntimeMinutes)) * 10000) / 100 : 0;

    var pmDue = 0, pmOverdue = 0, pmCompleted = 0, pmScheduled = 0, pmInProgress = 0, pmMissed = 0, pmSkipped = 0;
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

    var qrGenerated = 0;
    try {
      var qrRecords = getAllData(CONFIG.SHEET_NAMES.QR_HISTORY) || [];
      qrGenerated = qrRecords.length;
    } catch(e) {}

    var numPeriods = 6;
    var chartRangeStart, chartRangeEnd;
    if (isAll) {
      chartRangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      chartRangeStart = new Date(today.getFullYear(), today.getMonth() - (numPeriods - 1), 1);
    } else {
      chartRangeStart = new Date(range.start.getTime());
      chartRangeEnd = new Date(range.end.getTime());
    }
    var periodMs = (chartRangeEnd.getTime() - chartRangeStart.getTime()) / numPeriods;
    var tz = Session.getScriptTimeZone();
    var useShortLabels = periodMs < 7 * 86400000;

    var chartMonths = [];
    var chartOpen = [], chartRunning = [], chartClosed = [], chartPending = [], chartApproved = [];
    var chartBreakdowns = [], chartMttr = [], chartMtbf = [];
    var chartWaitingTime = [], chartDowntime = [], chartWorkingTime = [];
    var chartMonthlyMaint = [];
    var chartBreakdownMaint = [], chartPreventiveMaint = [];

    for (var p = 0; p < numPeriods; p++) {
      var pStart = new Date(chartRangeStart.getTime() + p * periodMs);
      var pEnd = new Date(chartRangeStart.getTime() + (p + 1) * periodMs);
      if (useShortLabels) {
        chartMonths.push(Utilities.formatDate(pStart, tz, 'MMM dd'));
      } else {
        chartMonths.push(Utilities.formatDate(pStart, tz, 'MMM'));
      }

      var co = 0, cr = 0, cc = 0, cp = 0, ca = 0;
      var periodWaitMins = 0, periodDownMins = 0, periodWorkMins = 0;
      var periodBreakdownCount = 0;
      var periodBreakdownClosedCount = 0;
      var periodBreakdownRepairMins = 0;
      var periodBreakdownTypeDownMins = 0;
      var periodBreakdownMaintCount = 0;
      var periodPreventiveMaintCount = 0;

      for (var j = 0; j < filtered.length; j++) {
        var n = filtered[j];
        var inPeriod = n.jd && (function() {
          var jdt = new Date(n.jd);
          return !isNaN(jdt.getTime()) && jdt >= pStart && jdt < pEnd;
        })();

        if (inPeriod) {
          if (n.isOpen) co++;
          else if (n.isRunning) cr++;
          else if (n.isClosed) cc++;
          else if (n.isPending) cp++;
          else if (n.isApproved) ca++;

          periodWaitMins += n.waitingMins;
          periodWorkMins += n.workingMins;
          periodDownMins += n.downtimeMins;

          var bdType = (n.raw.BreakdownType || '').toLowerCase();
          if (bdType === 'breakdown maintenance') {
            periodBreakdownMaintCount++;
            if (n.isClosed) {
              periodBreakdownCount++;
              periodBreakdownClosedCount++;
              periodBreakdownRepairMins += n.repairMins;
              periodBreakdownTypeDownMins += n.downtimeMins;
            }
          }
          else if (bdType === 'preventive maintenance') periodPreventiveMaintCount++;
        }
      }

      chartOpen.push(co);
      chartRunning.push(cr);
      chartClosed.push(cc);
      chartPending.push(cp);
      chartApproved.push(ca);

      chartBreakdowns.push(periodBreakdownCount);
      chartWaitingTime.push(Math.round(periodWaitMins / 60 * 100) / 100);
      chartDowntime.push(Math.round(periodDownMins / 60 * 100) / 100);
      chartWorkingTime.push(Math.round(periodWorkMins / 60 * 100) / 100);

      var monthMttrVal = periodBreakdownClosedCount > 0 ? Math.round((periodBreakdownRepairMins / periodBreakdownClosedCount / 60) * 100) / 100 : null;

      var periodUptimeHours = Math.max(0, (periodMs / 3600000) - (periodBreakdownTypeDownMins / 60));
      var monthMtbfVal = periodBreakdownCount > 0 ? Math.round((periodUptimeHours / periodBreakdownCount) * 100) / 100 : null;

      chartMttr.push(monthMttrVal);
      chartMtbf.push(monthMtbfVal);
      chartMonthlyMaint.push(co + cr + cc + cp + ca);
      chartBreakdownMaint.push(periodBreakdownMaintCount);
      chartPreventiveMaint.push(periodPreventiveMaintCount);
    }

    var mttrValues = chartMttr.filter(function(v) { return v !== null && v > 0; });
    var mttrStats = {
      avg: mttrValues.length > 0 ? Math.round((mttrValues.reduce(function(a, b) { return a + b; }, 0) / mttrValues.length) * 100) / 100 : 0,
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

    var totalStatusJobs = openJobs + runningJobs + closedJobs + pendingApprovalJobs + approvedJobs;
    var totalPriorityJobs = criticalJobs + highJobs + mediumJobs + lowJobs;

    console.log('');
    console.log('===== DASHBOARD RAW TOTALS =====');
    console.log('Total JobCards in sheet: ' + rawJobCards.length);
    console.log('Filtered JobCards (' + (filter || 'all') + '): ' + filteredJobCount);
    console.log('Status: Open=' + openJobs + ' Running=' + runningJobs + ' Closed=' + closedJobs + ' PendingApproval=' + pendingApprovalJobs + ' Approved=' + approvedJobs + ' Waiting=' + waitingJobs);
    console.log('BreakdownJobCount=' + breakdownJobCount + ' BreakdownClosedCount=' + breakdownClosedCount);
    console.log('BreakdownMaintenanceCount=' + breakdownMaintenanceCount + ' PreventiveMaintenanceCount=' + preventiveMaintenanceCount);
    console.log('BreakdownClosedRepairMinutes=' + breakdownClosedRepairMinutes + ' min  (' + durationToDisplay(breakdownClosedRepairMinutes) + ')');
    console.log('SUM WaitingTime  = ' + totalWaitingMinutes + ' min  (' + durationToDisplay(totalWaitingMinutes) + ')');
    console.log('SUM WorkingTime  = ' + totalWorkingMinutes + ' min  (' + durationToDisplay(totalWorkingMinutes) + ')');
    console.log('SUM RepairTime   = ' + totalRepairMinutes + ' min  (' + durationToDisplay(totalRepairMinutes) + ')');
    console.log('SUM Downtime     = ' + totalDowntimeMinutes + ' min  (' + durationToDisplay(totalDowntimeMinutes) + ')');
    console.log('MTTR = ' + (mttr !== null ? mttr + ' hrs' : 'N/A') + ' (breakdownClosedCount=' + breakdownClosedCount + ', repairMins=' + breakdownClosedRepairMinutes + ')');
    console.log('MTBF = ' + (mtbf !== null ? mtbf + ' hrs' : 'N/A') + ' (breakdownJobCount=' + breakdownJobCount + ', runningHours=' + totalRunningHours + ', bdDowntimeMins=' + breakdownTypeDowntimeMinutes + ')');
    console.log('Availability = ' + availability + '%');
    if (totalWaitingMinutes === 0 && filteredJobCount > 0) {
      console.log('[DASHBOARD WARNING] WaitingTime SUM is 0 but there are ' + filteredJobCount + ' filtered records.');
      console.log('  Possible reasons: WaitingTime column empty, wrong type, or normalizeDuration() returning 0');
      for (var di = 0; di < filtered.length && di < 5; di++) {
        var fd = filtered[di];
        console.log('  Record ' + di + ': ' + (fd.raw.JobCardNo || 'N/A') + ' status=' + fd.status +
          ' WaitingTime_resolved=' + fd.waitingMins +
          ' normalized=' + fd.raw.WaitingTime);
      }
    }
    if (totalWorkingMinutes === 0 && filteredJobCount > 0) {
      console.log('[DASHBOARD WARNING] WorkingTime SUM is 0 but there are ' + filteredJobCount + ' filtered records.');
      console.log('  Possible reasons: WorkingTime column empty, wrong type, or normalizeDuration() returning 0');
      for (var di = 0; di < filtered.length && di < 5; di++) {
        var fd = filtered[di];
        console.log('  Record ' + di + ': ' + (fd.raw.JobCardNo || 'N/A') + ' status=' + fd.status +
          ' WorkingTime_resolved=' + fd.workingMins +
          ' normalized=' + fd.raw.WorkingTime);
      }
    }
    if (totalDowntimeMinutes === 0 && filteredJobCount > 0) {
      console.log('[DASHBOARD WARNING] Downtime SUM is 0 but there are ' + filteredJobCount + ' filtered records.');
      console.log('  Possible reasons: Downtime column empty, wrong type, or normalizeDuration() returning 0');
      for (var di = 0; di < filtered.length && di < 5; di++) {
        var fd = filtered[di];
        console.log('  Record ' + di + ': ' + (fd.raw.JobCardNo || 'N/A') + ' status=' + fd.status +
          ' Downtime_resolved=' + fd.downtimeMins +
          ' normalized=' + fd.raw.Downtime);
      }
    }
    if (breakdownJobCount === 0 && filteredJobCount > 0) {
      console.log('[DASHBOARD INFO] No breakdown job cards found. MTTR=N/A, MTBF=N/A.');
    }
    if (mttr === 0 && breakdownClosedCount > 0) {
      console.log('[DASHBOARD WARNING] MTTR=0 but ' + breakdownClosedCount + ' closed breakdown cards exist.');
      console.log('  breakdownClosedRepairMinutes=' + breakdownClosedRepairMinutes + '. All closed breakdown cards have repairMins=0.');
    }
    console.log('=================================');
    console.log('');

    console.log('===== RETURN VALUES =====');
    console.log('totalWaitingTimeMinutes=' + totalWaitingMinutes + ' totalWorkingTimeMinutes=' + totalWorkingMinutes + ' totalRepairTimeMinutes=' + totalRepairMinutes + ' totalDowntimeMinutes=' + totalDowntimeMinutes);

    console.log('');
    console.log('===== P11.32 PENDING APPROVAL DEBUG =====');
    console.log('pendingApprovalJobs=' + pendingApprovalJobs);
    console.log('approvedJobs=' + approvedJobs);
    console.log('closedJobs=' + closedJobs);
    console.log('openJobs=' + openJobs);
    console.log('runningJobs=' + runningJobs);
    var allStatuses = [];
    for (var si = 0; si < filtered.length; si++) {
      allStatuses.push({
        JobCardNo: filtered[si].raw.JobCardNo,
        CurrentStatus: filtered[si].raw.CurrentStatus || filtered[si].raw.Status,
        ApprovalStatus: filtered[si].raw.ApprovalStatus,
        isClosed: filtered[si].isClosed,
        isPending: filtered[si].isPending,
        isApproved: filtered[si].isApproved,
        isPendingApproval: filtered[si].isPendingApproval
      });
    }
    console.log('ALL_JOB_STATUSES=' + JSON.stringify(allStatuses));

    return {
      totalMachines: totalMachines,
      runningMachines: runningMachines,
      breakdownMachines: breakdownMachines,
      idleMachines: Math.max(0, idleMachines),
      totalAssets: totalAssets,
      totalJobCards: filteredJobCount,
      openJobs: openJobs,
      runningJobs: runningJobs,
      waitingJobs: waitingJobs,
      closedJobs: closedJobs,
      pendingJobs: pendingApprovalJobs,
      approvedJobs: approvedJobs,
      criticalPriority: criticalJobs,
      highPriority: highJobs,
      mediumPriority: mediumJobs,
      lowPriority: lowJobs,
      hasPriorityData: (criticalJobs + highJobs + mediumJobs + lowJobs) > 0,
      totalWaitingTimeMinutes: totalWaitingMinutes,
      totalWorkingTimeMinutes: totalWorkingMinutes,
      totalRepairTimeMinutes: totalRepairMinutes,
      totalDowntimeMinutes: totalDowntimeMinutes,
      breakdownHours: Math.round(totalDowntimeHours * 100) / 100,
      breakdownJobCount: breakdownJobCount,
      breakdownClosedCount: breakdownClosedCount,
      breakdownMaintenanceCount: breakdownMaintenanceCount,
      preventiveMaintenanceCount: preventiveMaintenanceCount,
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
      qrPending: Math.max(0, filteredJobCount + totalMachines + parts.length - qrGenerated),
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
        waitingTime: chartWaitingTime,
        downtime: chartDowntime,
        workingTime: chartWorkingTime,
        monthlyMaintenance: chartMonthlyMaint,
        departmentJobs: deptJobCounts,
        breakdownMaint: chartBreakdownMaint,
        preventiveMaint: chartPreventiveMaint
      },
      _debug: {
        sheetLoaded: rawJobCards.length > 0,
        totalJobCardsInSheet: rawJobCards.length,
        filteredJobCards: filteredJobCount,
        filter: filter || 'all',
        sheetHeaders: rawJobCards.length > 0 ? Object.keys(rawJobCards[0]) : [],
        SUM: {
          WaitingTime_minutes: totalWaitingMinutes,
          WorkingTime_minutes: totalWorkingMinutes,
          RepairTime_minutes: totalRepairMinutes,
          Downtime_minutes: totalDowntimeMinutes
        }
      }
    };
  } catch (e) {
    return handleError('getDashboardData', e);
  }
}
