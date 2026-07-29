function updateMachineDocument(machineId, fieldKey, url) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.MACHINES);
    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) return { error: 'No data' };
    var headers = data[0];
    var colIdx = headers.indexOf(fieldKey);
    if (colIdx === -1) return { error: 'Field not found: ' + fieldKey };
    for (var r = 1; r < data.length; r++) {
      var id = String(data[r][0] || '');
      if (id === machineId) {
        sheet.getRange(r + 1, colIdx + 1).setValue(url);
        return { success: true };
      }
    }
    return { error: 'Machine not found' };
  } catch(e) { return { error: e.message }; }
}

function saveMachinePhoto(machineId, dataUrl) {
  return updateMachineDocument(machineId, 'MachinePhoto', dataUrl);
}

function getMachinePassport(machineId) {
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var machine = null;
  for (var mi = 0; mi < machines.length; mi++) {
    if (machines[mi].MachineID === machineId || machines[mi].MachineCode === machineId || machines[mi].MachineNumber === machineId) {
      machine = machines[mi];
      break;
    }
  }
  if (!machine) return { error: 'Machine not found: ' + machineId };

  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var deptMap = {};
  depts.forEach(function(d) { deptMap[d.Department || ''] = d; });
  var dept = deptMap[machine.Department || ''] || {};

  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var machineJobs = jcs.filter(function(j) { return j.Machine === machine.MachineName; });
  machineJobs.sort(function(a, b) {
    var da = new Date(a.OpenDateTime || a.DateCreated || a.Date || 0);
    var db = new Date(b.OpenDateTime || b.DateCreated || b.Date || 0);
    return db - da;
  });

  var sparePartsAll = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var pmRecords = [];
  try {
    pmRecords = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
  } catch(e) {}
  var machinePMs = pmRecords.filter(function(p) { return p.MachineID === machine.MachineID || p.MachineName === machine.MachineName; });

  var totalJobs = machineJobs.length;
  var openJobs = 0, closedJobs = 0, pendingApproval = 0;
  var breakdownJobs = 0, preventiveJobs = 0, electricalJobs = 0, mechanicalJobs = 0;
  var totalWaiting = 0, totalWorking = 0, totalDowntime = 0, totalRepair = 0;
  var closedBreakdownCount = 0, closedPMCount = 0;
  var lastBreakdownDate = null, lastPMDate = null;

  var monthlyBreakdown = {};
  var monthlyDowntime = {};
  var failureCategory = {};
  var monthlyMttr = {};
  var monthlyMtbf = {};
  var monthlySparesCost = {};
  var breakdownCountByPeriod = {};
  var timelineEvents = [];

  var totalClosedJobs = 0;

  machineJobs.forEach(function(j) {
    var s = (j.CurrentStatus || j.Status || '').toLowerCase();
    var isClosed = s === 'closed' || s === 'completed';
    if (s === 'open') openJobs++;
    else if (isClosed) { closedJobs++; totalClosedJobs++; }
    var as = (j.ApprovalStatus || '').toLowerCase();
    if (as === 'pending' || s === 'pending') pendingApproval++;

    var wm = normalizeDuration(j.WaitingTime || 0) || 0;
    var wkm = normalizeDuration(j.WorkingTime || 0) || 0;
    var dm = normalizeDuration(j.Downtime || 0) || 0;
    var rm = normalizeDuration(j.TotalDuration || 0) || 0;
    totalWaiting += wm;
    totalWorking += wkm;
    totalDowntime += dm;
    totalRepair += rm;

    var mt = (j.BreakdownType || j.MaintenanceType || '').toLowerCase();
    var isBreakdown = mt === 'breakdown' || mt === 'electrical' || mt === 'mechanical' || mt === 'emergency' || mt === 'corrective';
    var isPreventive = mt === 'preventive' || mt === 'routine';
    if (isBreakdown) breakdownJobs++;
    if (isPreventive) preventiveJobs++;
    if (mt === 'electrical') electricalJobs++;
    if (mt === 'mechanical') mechanicalJobs++;

    var jd = j.OpenDateTime || j.DateCreated || j.Date || '';
    var cd = j.CloseDateTime || '';
    if (jd) {
      var d = new Date(jd);
      if (!isNaN(d.getTime())) {
        var mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (isBreakdown) {
          monthlyBreakdown[mk] = (monthlyBreakdown[mk] || 0) + 1;
          monthlyDowntime[mk] = (monthlyDowntime[mk] || 0) + dm;
          breakdownCountByPeriod[mk] = (breakdownCountByPeriod[mk] || 0) + 1;
          if (isClosed) {
            closedBreakdownCount++;
            if (!monthlyMttr[mk]) monthlyMttr[mk] = { repair: 0, count: 0 };
            monthlyMttr[mk].repair += rm;
            monthlyMttr[mk].count++;
          }
          if (!lastBreakdownDate || d > new Date(lastBreakdownDate)) lastBreakdownDate = jd;
        }
        if (isPreventive) {
          if (isClosed) closedPMCount++;
          if (!lastPMDate || d > new Date(lastPMDate)) lastPMDate = jd;
        }
        if (isClosed) {
          if (!monthlyMtbf[mk]) monthlyMtbf[mk] = { count: 0, jobsWithBreakdown: 0 };
          monthlyMtbf[mk].count++;
          if (isBreakdown) monthlyMtbf[mk].jobsWithBreakdown++;
        }
      }
    }

    var cat = j.ComplaintCategory || 'Uncategorized';
    if (isBreakdown) failureCategory[cat] = (failureCategory[cat] || 0) + 1;

    timelineEvents.push({
      date: jd,
      type: isBreakdown ? 'Breakdown' : isPreventive ? 'Preventive Maintenance' : mt === 'overhaul' ? 'Overhaul' : 'Job Card',
      title: (j.ComplaintDescription || j.BreakdownType || 'Job') + ' - ' + (j.JobCardNo || ''),
      status: j.CurrentStatus || j.Status || '',
      jobCardNo: j.JobCardNo || '',
      subType: j.BreakdownType || j.MaintenanceType || ''
    });

    if (isBreakdown) {
      timelineEvents.push({
        date: jd,
        type: 'Repair Started',
        title: 'Repair started for ' + (j.JobCardNo || ''),
        status: '',
        jobCardNo: j.JobCardNo || '',
        subType: ''
      });
    }
    if (cd) {
      timelineEvents.push({
        date: cd,
        type: isBreakdown ? 'Repair Completed' : 'Job Completed',
        title: (isBreakdown ? 'Repair' : 'Job') + ' completed - ' + (j.JobCardNo || ''),
        status: 'completed',
        jobCardNo: j.JobCardNo || '',
        subType: ''
      });
    }

    var sp = j.SpareParts || '';
    if (sp) {
      timelineEvents.push({
        date: cd || jd,
        type: 'Spare Parts Changed',
        title: 'Spare parts: ' + sp + ' - ' + (j.JobCardNo || ''),
        status: '',
        jobCardNo: j.JobCardNo || '',
        subType: ''
      });
    }
  });

  var sparePartsUsed = [];
  machineJobs.forEach(function(j) {
    var sp = j.SpareParts || '';
    if (sp) {
      var parts = sp.split(',').map(function(p) { return p.trim(); }).filter(function(p) { return p; });
      parts.forEach(function(pn) {
        var matched = null;
        for (var si = 0; si < sparePartsAll.length; si++) {
          if (sparePartsAll[si].PartName === pn || sparePartsAll[si].PartCode === pn) {
            matched = sparePartsAll[si];
            break;
          }
        }
        var spDate = j.CloseDateTime || j.OpenDateTime || j.DateCreated || '';
        var spCost = matched ? (parseFloat(matched.UnitCost || matched.Cost) || 0) : 0;
        sparePartsUsed.push({
          date: spDate,
          jobCardNo: j.JobCardNo || '',
          partName: pn,
          quantity: 1,
          cost: spCost,
          technician: j.AssignedTechnician || ''
        });
        if (spDate) {
          var spd = new Date(spDate);
          if (!isNaN(spd.getTime())) {
            var spmk = spd.getFullYear() + '-' + String(spd.getMonth() + 1).padStart(2, '0');
            monthlySparesCost[spmk] = (monthlySparesCost[spmk] || 0) + spCost;
          }
        }
      });
    }
  });

  var machineRuntimeHours = 0;
  var mph = parseFloat(machine.OperatingHoursPerDay) || 0;
  var mpw = parseFloat(machine.OperatingDaysPerWeek) || 0;
  if (mph > 0 && mpw > 0) {
    var installDate = machine.InstallDate ? new Date(machine.InstallDate) : null;
    var daysSinceInstall = installDate && !isNaN(installDate.getTime()) ? Math.max(1, Math.round((new Date() - installDate) / 86400000)) : 365;
    machineRuntimeHours = mph * mpw / 7 * daysSinceInstall;
  }

  var mttr = closedBreakdownCount > 0 ? Math.round((totalRepair / closedBreakdownCount / 60) * 100) / 100 : null;
  var mtbf = breakdownJobs > 0 ? Math.round((machineRuntimeHours / breakdownJobs) * 100) / 100 : null;
  var availability = machineRuntimeHours > 0 ? Math.round(((machineRuntimeHours - (totalDowntime / 60)) / machineRuntimeHours) * 10000) / 100 : null;

  var nextPMDue = null;
  machinePMs.sort(function(a, b) {
    var da = a.NextDueDate ? new Date(a.NextDueDate) : new Date(864e14);
    var db = b.NextDueDate ? new Date(b.NextDueDate) : new Date(864e14);
    return da - db;
  });
  if (machinePMs.length > 0) {
    var nearest = machinePMs[0];
    if (nearest.NextDueDate) nextPMDue = nearest.NextDueDate;
  }

  var totalOperatingHours = Math.round(machineRuntimeHours * 100) / 100;
  var runningHours = Math.round((totalWorking / 60) * 100) / 100;
  var totalDowntimeHours = Math.round((totalDowntime / 60) * 100) / 100;

  var sortedMonths = Object.keys(monthlyBreakdown).sort();
  var allMonths = sortedMonths.slice();
  Object.keys(monthlySparesCost).forEach(function(m) { if (allMonths.indexOf(m) === -1) allMonths.push(m); });
  allMonths.sort();
  var breakdownTrendData = sortedMonths.map(function(m) { return { label: m, value: monthlyBreakdown[m] || 0 }; });
  var downtimeTrendData = sortedMonths.map(function(m) { return { label: m, value: Math.round(((monthlyDowntime[m] || 0) / 60) * 100) / 100 }; });
  var failureCatData = Object.keys(failureCategory).map(function(k) { return { label: k, value: failureCategory[k] }; });
  var mttrTrendData = sortedMonths.map(function(m) {
    var d = monthlyMttr[m];
    var val = d && d.count > 0 ? Math.round((d.repair / d.count / 60) * 100) / 100 : null;
    return { label: m, value: val };
  });
  var mtbfTrendData = allMonths.map(function(m) {
    var d = monthlyMtbf[m];
    var val = d && d.count > 0 && d.jobsWithBreakdown > 0 ? Math.round((machineRuntimeHours / d.jobsWithBreakdown / allMonths.length) * 100) / 100 : null;
    return { label: m, value: val };
  });
  var sparesCostTrendData = allMonths.map(function(m) { return { label: m, value: Math.round((monthlySparesCost[m] || 0) * 100) / 100 }; });
  var pmComplianceData = [
    { label: 'Completed', value: closedPMCount },
    { label: 'Open / Overdue', value: Math.max(0, machinePMs.length - closedPMCount) }
  ];

  var pmHistory = [];
  machinePMs.forEach(function(p) {
    pmHistory.push({
      pmID: p.PMID || p.PMID || '',
      title: p.Title || p.PMName || 'PM Schedule',
      frequency: p.Frequency || '',
      status: p.Status || '',
      assignedTo: p.AssignedTo || p.AssignedTechnician || '',
      lastDone: p.LastDoneDate || p.CompletionDate || '',
      nextDue: p.NextDueDate || '',
      machineName: p.MachineName || ''
    });
  });

  var totalPartsCost = 0;
  sparePartsUsed.forEach(function(sp) { totalPartsCost += (sp.cost * sp.quantity) || 0; });

  var timeline = [
    { date: machine.InstallDate || '', type: 'Installation', title: 'Machine Installed - ' + (machine.MachineName || ''), icon: 'install' }
  ];
  timeline = timeline.concat(timelineEvents);
  timeline.sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

  var searchOptions = [];
  machineJobs.forEach(function(j) {
    searchOptions.push({ value: j.JobCardNo || '', label: 'Job Card: ' + (j.JobCardNo || '') });
    searchOptions.push({ value: j.ComplaintDescription || '', label: 'Complaint: ' + (j.ComplaintDescription || '') });
    searchOptions.push({ value: j.AssignedTechnician || '', label: 'Technician: ' + (j.AssignedTechnician || '') });
    searchOptions.push({ value: j.BreakdownType || j.MaintenanceType || '', label: 'Type: ' + (j.BreakdownType || j.MaintenanceType || '') });
  });
  var uniqueSearch = {};
  searchOptions = searchOptions.filter(function(s) {
    if (!s.value || uniqueSearch[s.value]) return false;
    uniqueSearch[s.value] = true;
    return true;
  });

  return {
    machine: {
      MachineID: machine.MachineID || '',
      MachineName: machine.MachineName || '',
      MachineCode: machine.MachineCode || '',
      MachineNumber: machine.MachineNumber || '',
      Department: machine.Department || '',
      Section: machine.Section || '',
      Division: dept.Division || '',
      Location: machine.Location || '',
      MachineType: machine.MachineType || '',
      Manufacturer: machine.Manufacturer || '',
      Model: machine.Model || '',
      SerialNo: machine.SerialNo || '',
      Capacity: machine.Capacity || '',
      PowerRating: machine.PowerRating || '',
      InstallDate: machine.InstallDate || '',
      WarrantyExpiry: machine.WarrantyExpiry || '',
      Criticality: machine.Criticality || '',
      Status: machine.Status || '',
      MachinePhoto: machine.MachinePhoto || '',
      MachineManual: machine.MachineManual || '',
      ElectricalDrawing: machine.ElectricalDrawing || '',
      MechanicalDrawing: machine.MechanicalDrawing || '',
      SOP: machine.SOP || '',
      SafetyInstructions: machine.SafetyInstructions || '',
      WarrantyDocuments: machine.WarrantyDocuments || '',
      OperatingHoursPerDay: machine.OperatingHoursPerDay || '',
      OperatingDaysPerWeek: machine.OperatingDaysPerWeek || ''
    },
    kpi: {
      totalJobs: totalJobs,
      openJobs: openJobs,
      closedJobs: closedJobs,
      pendingApproval: pendingApproval,
      breakdownJobs: breakdownJobs,
      preventiveJobs: preventiveJobs,
      electricalJobs: electricalJobs,
      mechanicalJobs: mechanicalJobs,
      totalWaiting: totalWaiting,
      totalWorking: totalWorking,
      totalDowntime: totalDowntime,
      mttr: mttr,
      mtbf: mtbf,
      availability: availability,
      machineRuntimeHours: Math.round(machineRuntimeHours * 100) / 100,
      lastBreakdownDate: lastBreakdownDate,
      lastPMDate: lastPMDate
    },
    jobCards: machineJobs.map(function(j) {
      return {
        JobCardNo: j.JobCardNo || '',
        OpenDate: j.OpenDateTime || j.DateCreated || j.Date || '',
        CloseDate: j.CloseDateTime || '',
        Complaint: j.ComplaintDescription || '',
        ComplaintCategory: j.ComplaintCategory || '',
        BreakdownType: j.BreakdownType || j.MaintenanceType || '',
        Priority: j.Priority || '',
        Technician: j.AssignedTechnician || '',
        WaitingTime: normalizeDuration(j.WaitingTime || 0) || 0,
        WorkingTime: normalizeDuration(j.WorkingTime || 0) || 0,
        Downtime: normalizeDuration(j.Downtime || 0) || 0,
        RootCause: j.RootCause || '',
        CorrectiveAction: j.CorrectiveAction || '',
        ApprovalStatus: j.ApprovalStatus || '',
        CurrentStatus: j.CurrentStatus || j.Status || ''
      };
    }),
    spareParts: sparePartsUsed,
    totalPartsCost: Math.round(totalPartsCost * 100) / 100,
    pmHistory: pmHistory,
    charts: {
      breakdownTrend: breakdownTrendData,
      downtimeTrend: downtimeTrendData,
      failureCategory: failureCatData,
      mttrTrend: mttrTrendData,
      mtbfTrend: mtbfTrendData,
      sparesCostTrend: sparesCostTrendData,
      pmCompliance: pmComplianceData
    },
    nextPMDue: nextPMDue,
    totalOperatingHours: totalOperatingHours,
    runningHours: runningHours,
    totalDowntimeHours: totalDowntimeHours,
    closedBreakdownCount: closedBreakdownCount,
    pmTotalScheduled: machinePMs.length,
    timeline: timeline,
    searchOptions: uniqueSearch
  };
}
