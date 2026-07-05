function diagnoseAllData() {
  Logger.log('=== DIAGNOSE ALL DATA ===');
  console.log('=== DIAGNOSE ALL DATA ===');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets();
  Logger.log('diagnoseAllData(): Spreadsheet has ' + allSheets.length + ' sheets');
  console.log('diagnoseAllData(): Spreadsheet has ' + allSheets.length + ' sheets');
  allSheets.forEach(function(s) {
    Logger.log('diagnoseAllData():   Actual sheet: "' + s.getName() + '"');
    console.log('diagnoseAllData():   Actual sheet: "' + s.getName() + '"');
  });
  var result = {};
  var names = [CONFIG.SHEET_NAMES.USERS, CONFIG.SHEET_NAMES.MACHINES, CONFIG.SHEET_NAMES.ASSETS,
               CONFIG.SHEET_NAMES.DEPARTMENTS, CONFIG.SHEET_NAMES.TECHNICIANS, CONFIG.SHEET_NAMES.JOBCARDS,
               CONFIG.SHEET_NAMES.CHECKLISTS, CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES,
               CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, CONFIG.SHEET_NAMES.SPARE_PARTS,
               CONFIG.SHEET_NAMES.REPORTS, CONFIG.SHEET_NAMES.SETTINGS, CONFIG.SHEET_NAMES.LOGS, CONFIG.SHEET_NAMES.DASHBOARD];
  names.forEach(function(name) {
    var found = ss.getSheetByName(name) !== null;
    Logger.log('diagnoseAllData():   Expected "' + name + '" -> found=' + found);
    console.log('diagnoseAllData():   Expected "' + name + '" -> found=' + found);
    try {
      var data = getAllData(name);
      result[name] = { count: data.length, found: found };
      Logger.log('diagnoseAllData(): "' + name + '" = ' + data.length + ' records');
      console.log('diagnoseAllData(): "' + name + '" = ' + data.length + ' records');
    } catch (e) {
      result[name] = { count: -1, found: found, error: e.message };
      Logger.log('diagnoseAllData(): "' + name + '" ERROR: ' + e.message);
      console.log('diagnoseAllData(): "' + name + '" ERROR: ' + e.message);
    }
  });
  Logger.log('=== END DIAGNOSE ALL DATA ===');
  console.log('=== END DIAGNOSE ALL DATA ===');
  return result;
}

function getDashboardData(filter, userDepartment) {
  Logger.log('getDashboardData() called, filter=' + filter + ', userDepartment=' + userDepartment);
  console.log('getDashboardData() called, filter=' + filter + ', userDepartment=' + userDepartment);
  try {
    var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
    var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
    var allJobCards = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var jobCards = allJobCards;
    if (userDepartment) {
      jobCards = allJobCards.filter(function(jc) { return jc.Department === userDepartment; });
    }
    var pms = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
    var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];

    var totalMachines = machines.length;
    var runningMachines = 0;
    var breakdownMachines = 0;
    for (var mi = 0; mi < machines.length; mi++) {
      var ms = (machines[mi].Status || '').toLowerCase();
      if (ms === 'running' || ms === 'active') runningMachines++;
      if (ms === 'under maintenance') breakdownMachines++;
    }

    var totalAssets = assets.length;
    var totalJobCards = jobCards.length;
    var openJobs = 0, runningJobs = 0, waitingJobs = 0, closedJobs = 0, criticalJobs = 0, approvedJobs = 0, pendingApprovalJobs = 0;
    var criticalPriority = 0, highPriority = 0, mediumPriority = 0, lowPriority = 0;
    var totalBreakdownHours = 0, totalWorkingHours = 0, totalWaitingHours = 0, breakdownCount = 0;

    var today = new Date();
    var todayJobs = 0, weekJobs = 0, monthJobs = 0;
    var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    var completedJcs = [];

    for (var i = 0; i < jobCards.length; i++) {
      var jc = jobCards[i];
      var status = (jc.Status || '').toLowerCase();
      if (status === 'open') { openJobs++; }
      else if (status === 'running' || status === 'in progress') { runningJobs++; }
      else if (status === 'waiting' || status === 'waiting for parts') { waitingJobs++; }
      else if (status === 'closed' || status === 'completed') {
        closedJobs++;
        var as = (jc.ApprovalStatus || '').toLowerCase();
        if (as === 'approved') { approvedJobs++; }
        else if (!as) { pendingApprovalJobs++; }
      }
      else if (status === 'approved') { approvedJobs++; }

      var priority = (jc.Priority || '').toLowerCase();
      if (priority === 'critical') { criticalPriority++; }
      else if (priority === 'high') { highPriority++; }
      else if (priority === 'medium') { mediumPriority++; }
      else if (priority === 'low') { lowPriority++; }

      if (priority === 'critical' && status !== 'closed' && status !== 'completed') {
        criticalJobs++;
      }

      var totalDuration = parseFloat(jc.TotalDuration || jc.Downtime) || 0;
      var waitingTime = parseFloat(jc.WaitingTime) || 0;
      var workingTime = parseFloat(jc.ActualWorkingTime || jc.WorkingTime) || 0;

      totalBreakdownHours += totalDuration;
      totalWaitingHours += waitingTime;
      totalWorkingHours += workingTime;
      if (totalDuration > 0) breakdownCount++;

      if (status === 'closed' || status === 'completed') {
        completedJcs.push(jc);
      }

      var jcDateStr = jc.DateCreated || jc.Date || jc.OpenDateTime;
      if (jcDateStr) {
        var jcDate = new Date(jcDateStr);
        if (jcDate.toDateString() === today.toDateString()) todayJobs++;
        var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        if (jcDate >= weekAgo) weekJobs++;
        if (jcDate >= monthStart) monthJobs++;
      }
    }

    var mttr = breakdownCount > 0 ? Math.round((totalWorkingHours / breakdownCount) * 100) / 100 : 0;
    var mtbf = breakdownCount > 0 ? Math.round((totalJobCards / breakdownCount) * 100) / 100 : 0;
    var availability = totalMachines > 0 ? Math.round(((totalMachines - breakdownMachines) / totalMachines) * 100) : 0;

    var avgWaitingTime = 0, avgWorkingTime = 0, avgBreakdownTime = 0;
    var maxBreakdownTime = 0, minBreakdownTime = 0;
    if (completedJcs.length > 0) {
      var wtSum = 0, wktSum = 0, bdtSum = 0;
      var bdtMax = 0, bdtMin = Infinity;
      completedJcs.forEach(function(jc) {
        var wt = parseFloat(jc.WaitingTime) || 0;
        var wkt = parseFloat(jc.ActualWorkingTime || jc.WorkingTime) || 0;
        var bdt = parseFloat(jc.TotalDuration || jc.Downtime) || 0;
        wtSum += wt;
        wktSum += wkt;
        bdtSum += bdt;
        if (bdt > bdtMax) bdtMax = bdt;
        if (bdt > 0 && bdt < bdtMin) bdtMin = bdt;
      });
      avgWaitingTime = Math.round((wtSum / completedJcs.length) * 100) / 100;
      avgWorkingTime = Math.round((wktSum / completedJcs.length) * 100) / 100;
      avgBreakdownTime = Math.round((bdtSum / completedJcs.length) * 100) / 100;
      maxBreakdownTime = Math.round(bdtMax * 100) / 100;
      minBreakdownTime = bdtMin === Infinity ? 0 : Math.round(bdtMin * 100) / 100;
    }

    var pmDue = 0, pmOverdue = 0;
    for (var pi = 0; pi < pms.length; pi++) {
      if (pms[pi].Status === 'Completed') continue;
      var due = pms[pi].NextDueDate ? new Date(pms[pi].NextDueDate) : null;
      if (due) {
        if (due < today) pmOverdue++;
        else pmDue++;
      }
    }

    var lowStockParts = 0;
    for (var si = 0; si < parts.length; si++) {
      var stock = parseFloat(parts[si].Stock) || 0;
      var min = parseFloat(parts[si].MinimumStock) || 0;
      if (min > 0 && stock <= min) lowStockParts++;
    }

    var activeTechs = 0;
    for (var ti = 0; ti < techs.length; ti++) {
      if ((techs[ti].Status || '').toLowerCase() === 'active') activeTechs++;
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
      criticalJobs: criticalJobs,
      approvedJobs: approvedJobs,
      pendingApprovalJobs: pendingApprovalJobs,
      criticalPriority: criticalPriority,
      highPriority: highPriority,
      mediumPriority: mediumPriority,
      lowPriority: lowPriority,
      breakdownHours: Math.round(totalBreakdownHours * 100) / 100,
      mttr: mttr,
      mtbf: mtbf,
      availability: availability,
      pmDue: pmDue,
      pmOverdue: pmOverdue,
      lowStockParts: lowStockParts,
      activeTechnicians: activeTechs,
      todayJobs: todayJobs,
      weekJobs: weekJobs,
      monthJobs: monthJobs,
      avgWaitingTime: avgWaitingTime,
      avgWorkingTime: avgWorkingTime,
      avgBreakdownTime: avgBreakdownTime,
      maxBreakdownTime: maxBreakdownTime,
      minBreakdownTime: minBreakdownTime
    };
  } catch (e) {
    return handleError('getDashboardData', e);
  }
}
