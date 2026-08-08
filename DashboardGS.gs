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

function classifyMaintenance(record) {
  var bt = String(record.BreakdownType || '').trim().toLowerCase();
  var isBreakdown = bt.indexOf('breakdown') !== -1;
  var isPreventive = bt === 'preventive maintenance';
  return { isBreakdown: isBreakdown, isPreventive: isPreventive };
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

function auditComplaintCategories() {
  invalidateCache(CONFIG.SHEET_NAMES.JOBCARDS);
  var raw = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var headers = raw.length > 0 ? Object.keys(raw[0]) : [];

  var ccIdx = headers.indexOf('ComplaintCategory');
  var btIdx = headers.indexOf('BreakdownType');

  console.log('');
  console.log('========================================');
  console.log('  COMPLAINT CATEGORY AUDIT');
  console.log('  Total rows: ' + raw.length);
  console.log('  ComplaintCategory col index: ' + ccIdx);
  console.log('  BreakdownType col index: ' + btIdx);
  console.log('========================================');

  var valueCounts = {};
  for (var i = 0; i < raw.length; i++) {
    var val = String(raw[i].ComplaintCategory || '').trim();
    valueCounts[val] = (valueCounts[val] || 0) + 1;
  }

  console.log('');
  console.log('--- ComplaintCategory VALUE COUNTS ---');
  var sorted = Object.keys(valueCounts).sort(function(a, b) { return valueCounts[b] - valueCounts[a]; });
  for (var s = 0; s < sorted.length; s++) {
    var k = sorted[s];
    console.log('  ' + JSON.stringify(k) + ' = ' + valueCounts[k]);
  }

  console.log('');
  console.log('--- BreakdownType VALUE COUNTS ---');
  var btCounts = {};
  for (var i = 0; i < raw.length; i++) {
    var val = String(raw[i].BreakdownType || '').trim();
    btCounts[val] = (btCounts[val] || 0) + 1;
  }
  var btSorted = Object.keys(btCounts).sort(function(a, b) { return btCounts[b] - btCounts[a]; });
  for (var s = 0; s < btSorted.length; s++) {
    var k = btSorted[s];
    console.log('  ' + JSON.stringify(k) + ' = ' + btCounts[k]);
  }

  console.log('');
  console.log('--- FIRST 10 ROWS (ComplaintCategory + BreakdownType) ---');
  for (var i = 0; i < Math.min(10, raw.length); i++) {
    var r = raw[i];
    console.log('[ROW ' + i + '] ' + (r.JobCardNo || 'N/A') +
      ' | ComplaintCategory=' + JSON.stringify(r.ComplaintCategory) +
      ' | BreakdownType=' + JSON.stringify(r.BreakdownType) +
      ' | Status=' + JSON.stringify(r.CurrentStatus));
  }

  var bdByCC = 0, pmByCC = 0, otherByCC = 0;
  for (var i = 0; i < raw.length; i++) {
    var cc = String(raw[i].ComplaintCategory || '').toLowerCase().trim();
    if (cc === 'routine maintenance') pmByCC++;
    else if (cc === '' || cc === 'other') otherByCC++;
    else bdByCC++;
  }
  console.log('');
  console.log('--- DASHBOARD CLASSIFICATION (current logic) ---');
  console.log('  isBreakdown (any non-empty, non-routine, non-other) = ' + bdByCC);
  console.log('  isPreventive (=== "routine maintenance") = ' + pmByCC);
  console.log('  unclassified (empty or "other") = ' + otherByCC);

  return { valueCounts: valueCounts, btCounts: btCounts };
}

function auditBreakdownRootCause() {
  invalidateCache(CONFIG.SHEET_NAMES.JOBCARDS);
  var raw = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var headers = Object.keys(raw[0] || {});
  var btColIdx = headers.indexOf('BreakdownType');
  var ccColIdx = headers.indexOf('ComplaintCategory');

  console.log('');
  console.log('========================================');
  console.log('  P11.39 — ROOT CAUSE AUDIT');
  console.log('  Rows: ' + raw.length);
  console.log('  BreakdownType column index: ' + btColIdx);
  console.log('  ComplaintCategory column index: ' + ccColIdx);
  console.log('========================================');

  // STEP 1: COUNT BreakdownType VALUES
  console.log('');
  console.log('--- STEP 1 — BreakdownType VALUE COUNTS ---');
  var btCounts = {};
  for (var i = 0; i < raw.length; i++) {
    var v = String(raw[i].BreakdownType || '').trim();
    btCounts[v] = (btCounts[v] || 0) + 1;
  }
  var btSorted = Object.keys(btCounts).sort(function(a,b){return btCounts[b]-btCounts[a];});
  for (var s = 0; s < btSorted.length; s++) {
    var k = btSorted[s];
    console.log('  ' + JSON.stringify(k) + ' = ' + btCounts[k]);
  }

  // STEP 2: COUNT ComplaintCategory VALUES
  console.log('');
  console.log('--- ComplaintCategory VALUE COUNTS ---');
  var ccCounts = {};
  for (var i = 0; i < raw.length; i++) {
    var v = String(raw[i].ComplaintCategory || '').trim();
    ccCounts[v] = (ccCounts[v] || 0) + 1;
  }
  var ccSorted = Object.keys(ccCounts).sort(function(a,b){return ccCounts[b]-ccCounts[a];});
  for (var s = 0; s < ccSorted.length; s++) {
    var k = ccSorted[s];
    console.log('  ' + JSON.stringify(k) + ' = ' + ccCounts[k]);
  }

  // STEP 3: PRINT EVERY JOB CARD WITH CLASSIFICATION
  console.log('');
  console.log('--- STEP 3 — PER-JOB CARD CLASSIFICATION ---');
  var bdByBT = 0, pmByBT = 0, unkByBT = 0;
  var bdByCC = 0, pmByCC = 0;
  var mismatchCount = 0;

  for (var i = 0; i < raw.length; i++) {
    var r = raw[i];
    var jcNo = r.JobCardNo || 'N/A';
    var bt = String(r.BreakdownType || '').trim();
    var cc = String(r.ComplaintCategory || '').trim();
    var status = (r.CurrentStatus || r.Status || '').toLowerCase();
    var approval = (r.ApprovalStatus || '').toLowerCase();

    // Classification by BreakdownType
    var btLower = bt.toLowerCase();
    var fromBT_isBd = btLower.indexOf('breakdown') !== -1;
    var fromBT_isPm = btLower.indexOf('preventive') !== -1;
    var fromBT_isOther = !fromBT_isBd && !fromBT_isPm && bt !== '';

    // Classification by ComplaintCategory (current dashboard logic)
    var ccLower = cc.toLowerCase().trim();
    var fromCC_isBd = ccLower !== '' && ccLower !== 'routine maintenance' && ccLower !== 'preventive maintenance' && ccLower !== 'other';
    var fromCC_isPm = ccLower === 'routine maintenance' || ccLower === 'preventive maintenance';

    // Count by BreakdownType
    if (fromBT_isBd) bdByBT++;
    else if (fromBT_isPm) pmByBT++;
    else if (bt !== '') unkByBT++;

    // Count by ComplaintCategory
    if (fromCC_isBd) bdByCC++;
    else if (fromCC_isPm) pmByCC++;

    // Check mismatch
    var ccClass = fromCC_isBd ? 'BREAKDOWN' : (fromCC_isPm ? 'PREVENTIVE' : 'SKIP');
    var btClass = fromBT_isBd ? 'BREAKDOWN' : (fromBT_isPm ? 'PREVENTIVE' : (bt !== '' ? 'UNKNOWN' : 'EMPTY'));
    var isMismatch = false;
    if (btClass === 'PREVENTIVE' && ccClass !== 'PREVENTIVE') isMismatch = true;
    if (btClass === 'BREAKDOWN' && ccClass === 'SKIP') isMismatch = true;
    if (isMismatch) mismatchCount++;

    var isClosed = status === 'closed' || status === 'approved';
    var includedInMTBF = fromBT_isBd && isClosed;

    if (i < 20 || isMismatch) {
      console.log('[' + i + '] ' + jcNo +
        ' | BT=' + JSON.stringify(bt) +
        ' | CC=' + JSON.stringify(cc) +
        ' | Status=' + status +
        ' | Approval=' + approval +
        ' | ByBT=' + btClass +
        ' | ByCC=' + ccClass +
        ' | Closed=' + isClosed +
        ' | InMTBF=' + includedInMTBF +
        (isMismatch ? ' <<< MISMATCH' : ''));
    }
  }

  // Print counts
  console.log('');
  console.log('--- COUNTS BY BREAKDOWNTYPE ---');
  console.log('  Breakdown (contains "Breakdown"): ' + bdByBT);
  console.log('  Preventive (contains "Preventive"): ' + pmByBT);
  console.log('  Other non-empty: ' + unkByBT);

  console.log('');
  console.log('--- COUNTS BY COMPLAINTCATEGORY (DASHBOARD CURRENT) ---');
  console.log('  isBreakdown: ' + bdByCC);
  console.log('  isPreventive: ' + pmByCC);
  console.log('  MISMATCHES (BT says Preventive but CC does not, or BT says Breakdown but CC skips): ' + mismatchCount);

  return {
    btCounts: btCounts,
    ccCounts: ccCounts,
    byBT: { breakdown: bdByBT, preventive: pmByBT, unknown: unkByBT },
    byCC: { breakdown: bdByCC, preventive: pmByCC },
    mismatches: mismatchCount
  };
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

    // P11.xx — Under Maintenance = unique Machine IDs that have an active/open job card.
    // Job cards reference machines by Machine (name/code/number/id). Every machine row sharing
    // a referenced name counts, deduped by MachineID. Job cards whose machine reference matches
    // no row in the Machines sheet are excluded from the KPI and flagged for data cleanup.
    var activeStatuses = ['open', 'running', 'in progress', 'in-progress'];
    var machineKeys = {};
    machines.forEach(function(m) {
      var mid = m.MachineID || m.MachineNumber || m.MachineCode || '';
      var keys = [m.MachineID, m.MachineNumber, m.MachineCode, m.MachineName];
      for (var ki = 0; ki < keys.length; ki++) {
        var k = keys[ki];
        if (k === undefined || k === null) continue;
        var norm = String(k).trim().toLowerCase();
        if (!norm) continue;
        if (!machineKeys[norm]) machineKeys[norm] = [];
        if (machineKeys[norm].indexOf(mid) === -1) machineKeys[norm].push(mid);
      }
    });

    var breakdownMachines = 0, runningMachines = 0;
    var underMaintenanceIds = [];
    var seenUnderMaintenance = {};
    var underMaintenanceUnmatched = [];
    for (var ai = 0; ai < rawJobCards.length; ai++) {
      var ajc = rawJobCards[ai];
      var aStatus = String(ajc.CurrentStatus || ajc.Status || '').trim().toLowerCase();
      if (activeStatuses.indexOf(aStatus) === -1) continue;
      var machineRef = String(ajc.Machine || '').trim();
      if (!machineRef) continue;
      var aNorm = machineRef.toLowerCase();
      var matchedIds = machineKeys[aNorm] || [];
      if (matchedIds.length === 0) {
        underMaintenanceUnmatched.push({ JobCardNo: ajc.JobCardNo || 'N/A', Machine: machineRef, CurrentStatus: ajc.CurrentStatus || ajc.Status || '' });
        continue;
      }
      for (var ami = 0; ami < matchedIds.length; ami++) {
        var amid = matchedIds[ami];
        if (!amid) continue;
        if (!seenUnderMaintenance[amid]) {
          seenUnderMaintenance[amid] = true;
          underMaintenanceIds.push(amid);
        }
      }
    }

    breakdownMachines = underMaintenanceIds.length;
    runningMachines = Math.max(0, totalMachines - breakdownMachines);

    if (underMaintenanceUnmatched.length > 0) {
      console.warn('[DASHBOARD] ' + underMaintenanceUnmatched.length + ' active job card(s) reference machine(s) with no matching row in the Machines sheet — excluded from Under Maintenance KPI. Flagged for data cleanup: ' + JSON.stringify(underMaintenanceUnmatched));
    }

    var totalAssets = assets.length;
    var idleMachines = Math.max(0, totalMachines - runningMachines - breakdownMachines);

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
    var approvedBreakdownJobCount = 0;
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
      else if (n.isPending || (n.isClosed && !n.isApproved)) { pendingApprovalJobs++; }
      else if (n.isOpen) { openJobs++; waitingJobs++; }
      else if (n.isRunning) { runningJobs++; }
      else if (n.isClosed) { closedJobs++; }

      if (n.priority === 'critical') criticalJobs++;
      else if (n.priority === 'high') highJobs++;
      else if (n.priority === 'medium') mediumJobs++;
      else if (n.priority === 'low') lowJobs++;

      deptJobCounts[n.dept] = (deptJobCounts[n.dept] || 0) + 1;

      var classification = classifyMaintenance(n.raw);
      if (classification.isBreakdown) {
        breakdownMaintenanceCount++;
        if (n.isApproved) approvedBreakdownJobCount++;
        if (n.isClosed) {
          breakdownJobCount++;
          breakdownClosedCount++;
          breakdownClosedRepairMinutes += n.repairMins;
          breakdownTypeDowntimeMinutes += n.downtimeMins;
        }
      }
      else if (classification.isPreventive) preventiveMaintenanceCount++;
    }

    var effectiveMachines = totalMachines > 0 ? totalMachines : 1;
    var rangeHours;
    if (isAll) {
      rangeHours = earliestDate ? Math.max(1, Math.round((new Date() - earliestDate) / 3600000)) : 8760;
    } else {
      rangeHours = Math.max(1, Math.round((range.end - range.start) / 3600000));
    }

    // Report days in the filter range
    var reportDays;
    if (isAll) {
      reportDays = earliestDate ? Math.max(1, Math.round((new Date() - earliestDate) / 86400000)) : 365;
    } else {
      reportDays = Math.max(1, Math.round((range.end - range.start) / 86400000));
    }

    // Fleet runtime = Σ(OperatingHoursPerDay × OperatingDaysPerWeek ÷ 7 × reportDays)
    var totalMachineRuntimeHours = 0;
    for (var mi = 0; mi < machines.length; mi++) {
      var mph = parseFloat(machines[mi].OperatingHoursPerDay) || 0;
      var mpw = parseFloat(machines[mi].OperatingDaysPerWeek) || 0;
      if (mph > 0 && mpw > 0) {
        totalMachineRuntimeHours += mph * mpw / 7 * reportDays;
      } else {
        console.warn('[DASHBOARD] OperatingHoursPerDay / OperatingDaysPerWeek missing for Machine ' + (machines[mi].MachineID || '?') + ' (' + (machines[mi].MachineName || '?') + ') — runtime contribution = 0');
      }
    }

    var totalRepairHours = totalRepairMinutes / 60;
    var totalDowntimeHours = totalDowntimeMinutes / 60;
    var totalWorkingHours = totalWorkingMinutes / 60;
    var totalWaitingHours = totalWaitingMinutes / 60;

    var mttr = breakdownClosedCount > 0 ? Math.round((breakdownClosedRepairMinutes / breakdownClosedCount / 60) * 100) / 100 : null;

    var totalRunningHours = totalMachineRuntimeHours;
    var mtbf = approvedBreakdownJobCount > 0 ? Math.round((totalRunningHours / approvedBreakdownJobCount) * 100) / 100 : null;

    console.log('totalMachineRuntimeHours=' + totalMachineRuntimeHours + ' reportDays=' + reportDays + ' approvedBreakdownJobCount=' + approvedBreakdownJobCount + ' mtbf=' + mtbf);

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
    var periodDays = Math.max(1, Math.round(periodMs / 86400000));
    var periodMachineRuntimeHours = 0;
    for (var mi = 0; mi < machines.length; mi++) {
      var mph = parseFloat(machines[mi].OperatingHoursPerDay) || 0;
      var mpw = parseFloat(machines[mi].OperatingDaysPerWeek) || 0;
      if (mph > 0 && mpw > 0) {
        periodMachineRuntimeHours += mph * mpw / 7 * periodDays;
      }
    }
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

          var classification = classifyMaintenance(n.raw);
          if (classification.isBreakdown) {
            periodBreakdownMaintCount++;
            if (n.isClosed) {
              periodBreakdownCount++;
              periodBreakdownClosedCount++;
              periodBreakdownRepairMins += n.repairMins;
              periodBreakdownTypeDownMins += n.downtimeMins;
            }
          }
          else if (classification.isPreventive) periodPreventiveMaintCount++;
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

      var monthMtbfVal = periodBreakdownCount > 0 ? Math.round((periodMachineRuntimeHours / periodBreakdownCount) * 100) / 100 : null;

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
    console.log('UnderMaintenance (unique machine IDs w/ active job)=' + breakdownMachines + ' Running=' + runningMachines + ' Idle=' + idleMachines + ' Total=' + totalMachines);
    if (underMaintenanceUnmatched.length > 0) {
      console.log('Unmatched active job cards (not counted): ' + underMaintenanceUnmatched.length + ' -> ' + JSON.stringify(underMaintenanceUnmatched));
    }

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

    // ============================================
    // P11.39 — APPROVED JOB CARD DIAGNOSTIC
    // ============================================
    console.log('');
    console.log('===== P11.39 APPROVED JOB CARDS =====');
    console.log('breakdownMaintenanceCount=' + breakdownMaintenanceCount);
    console.log('preventiveMaintenanceCount=' + preventiveMaintenanceCount);
    console.log('breakdownJobCount=' + breakdownJobCount);
    console.log('breakdownClosedCount=' + breakdownClosedCount);
    console.log('breakdownClosedRepairMinutes=' + breakdownClosedRepairMinutes);
    console.log('breakdownTypeDowntimeMinutes=' + breakdownTypeDowntimeMinutes);
    console.log('totalRunningHours=' + totalRunningHours);
    console.log('rangeHours=' + rangeHours);
    console.log('mtbf=' + mtbf);

    var tracedBreakdown = 0, tracedPreventive = 0, tracedMTBF = 0;
    for (var ti = 0; ti < filtered.length; ti++) {
      var tn = filtered[ti];
      var traw = tn.raw;
      var isApprovedRecord = (traw.ApprovalStatus || '').toLowerCase() === 'approved'
                          || (traw.CurrentStatus || traw.Status || '').toLowerCase() === 'approved';

      var tc = classifyMaintenance(traw);
      var tInMTBF = tc.isBreakdown && tn.isClosed;

      if (tc.isBreakdown) tracedBreakdown++;
      if (tc.isPreventive) tracedPreventive++;
      if (tInMTBF) tracedMTBF++;

      if (isApprovedRecord || ti < 5) {
        console.log('[' + ti + '] ' + (traw.JobCardNo || 'N/A') +
          ' | BT=' + JSON.stringify(traw.BreakdownType) +
          ' | CC=' + JSON.stringify(traw.ComplaintCategory) +
          ' | ByBT: isBd=' + tc.isBreakdown + ' isPm=' + tc.isPreventive +
          ' | Closed=' + tn.isClosed +
          ' | InMTBF=' + tInMTBF);
      }
    }
    console.log('--- P11.40 AFTER FIX ---');
    console.log('Breakdown = ' + tracedBreakdown);
    console.log('Preventive = ' + tracedPreventive);
    console.log('Breakdown jobs used in MTBF = ' + tracedMTBF);
    console.log('MTBF = ' + mtbf);

    // ============================================
    // P11.41 — MTBF FINAL TRACE
    // ============================================
    var closedBreakdownJobs = [];
    var approvedBreakdownJobs = [];
    for (var mi = 0; mi < filtered.length; mi++) {
      var mn = filtered[mi];
      var mc = classifyMaintenance(mn.raw);
      if (!mc.isBreakdown) continue;
      if (mn.isClosed) closedBreakdownJobs.push(mn);
      if (mn.isApproved || (mn.raw.ApprovalStatus || '').toLowerCase() === 'approved') approvedBreakdownJobs.push(mn);
    }
    console.log('');
    console.log('--------------------------------');
    console.log('breakdownFailureCount = ' + breakdownJobCount);
    console.log('closedBreakdownJobs.length = ' + closedBreakdownJobs.length);
    console.log('breakdownTypeDowntimeMinutes = ' + breakdownTypeDowntimeMinutes);
    console.log('rangeHours = ' + rangeHours);
    console.log('totalRunningHours = ' + totalRunningHours);
    console.log('totalWorkingHours = ' + totalWorkingHours);
    console.log('approvedBreakdownJobs.length = ' + approvedBreakdownJobs.length);
    console.log('returned MTBF = ' + mtbf);
    console.log('');
    console.log('--- PER JOB: breakdown jobs only ---');
    for (var mi = 0; mi < filtered.length; mi++) {
      var mn = filtered[mi];
      var mc = classifyMaintenance(mn.raw);
      if (!mc.isBreakdown) continue;
      var includedInMTBF = mc.isBreakdown && mn.isClosed;
      var reasons = [];
      if (!mn.isClosed) reasons.push('not closed');
      if (!mc.isBreakdown) reasons.push('not breakdown');
      console.log(
        'JobCardNo=' + (mn.raw.JobCardNo || 'N/A') +
        ' | BT=' + JSON.stringify(mn.raw.BreakdownType) +
        ' | ApprovalStatus=' + (mn.raw.ApprovalStatus || '') +
        ' | Status=' + (mn.raw.CurrentStatus || mn.raw.Status || '') +
        ' | WorkingTime=' + (mn.raw.WorkingTime) +
        ' | Downtime=' + (mn.raw.Downtime) +
        ' | IncludedInMTBF=' + includedInMTBF +
        (reasons.length ? ' | Reason=' + reasons.join(',') : '')
      );
    }
    console.log('');
    // Identify first zero
    var firstZero = null;
    if (breakdownJobCount === 0) firstZero = 'breakdownJobCount';
    else if (totalRunningHours === 0) firstZero = 'totalRunningHours';
    else if (mtbf === 0 || mtbf === null) firstZero = 'mtbf';
    console.log('FIRST ZERO VARIABLE: ' + (firstZero || 'none (MTBF > 0)'));
    console.log('--------------------------------');

    return {
      totalMachines: totalMachines,
      runningMachines: runningMachines,
      breakdownMachines: breakdownMachines,
      idleMachines: Math.max(0, idleMachines),
      underMaintenanceUnmatched: underMaintenanceUnmatched,
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
      totalMachineRuntimeHours: Math.round(totalMachineRuntimeHours * 100) / 100,
      reportDays: reportDays,
      breakdownJobCount: breakdownJobCount,
      approvedBreakdownJobCount: approvedBreakdownJobCount,
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
        underMaintenanceMachineIds: underMaintenanceIds,
        underMaintenanceUnmatched: underMaintenanceUnmatched,
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
