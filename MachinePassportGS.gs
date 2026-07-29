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

  var totalJobs = machineJobs.length;
  var openJobs = 0, closedJobs = 0, pendingApproval = 0;
  var breakdownJobs = 0, preventiveJobs = 0, electricalJobs = 0, mechanicalJobs = 0;
  var totalWaiting = 0, totalWorking = 0, totalDowntime = 0, totalRepair = 0;
  var closedBreakdownCount = 0;
  var lastBreakdownDate = null, lastPMDate = null;

  var monthlyBreakdown = {};
  var monthlyDowntime = {};
  var failureCategory = {};
  var monthlyMttr = {};
  var monthlyMtbf = {};
  var breakdownCountByPeriod = {};
  var timelineEvents = [];

  machineJobs.forEach(function(j) {
    var s = (j.CurrentStatus || j.Status || '').toLowerCase();
    if (s === 'open') openJobs++;
    else if (s === 'closed' || s === 'completed') closedJobs++;
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
    if (jd) {
      var d = new Date(jd);
      if (!isNaN(d.getTime())) {
        var mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (isBreakdown) {
          monthlyBreakdown[mk] = (monthlyBreakdown[mk] || 0) + 1;
          monthlyDowntime[mk] = (monthlyDowntime[mk] || 0) + dm;
          breakdownCountByPeriod[mk] = (breakdownCountByPeriod[mk] || 0) + 1;
          if (s === 'closed' || s === 'completed') {
            if (!monthlyMttr[mk]) monthlyMttr[mk] = { repair: 0, count: 0 };
            monthlyMttr[mk].repair += rm;
            monthlyMttr[mk].count++;
          }
          if (!lastBreakdownDate || d > new Date(lastBreakdownDate)) lastBreakdownDate = jd;
        }
        if (isPreventive) {
          if (!lastPMDate || d > new Date(lastPMDate)) lastPMDate = jd;
        }
        if (s === 'closed' || s === 'completed') {
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
      type: mt === 'breakdown' || mt === 'electrical' || mt === 'mechanical' || mt === 'emergency' || mt === 'corrective' ? 'Breakdown' :
            mt === 'preventive' || mt === 'routine' ? 'Preventive Maintenance' :
            mt === 'overhaul' ? 'Overhaul' : 'Job Card',
      title: (j.ComplaintDescription || j.BreakdownType || 'Job') + ' - ' + (j.JobCardNo || ''),
      status: j.CurrentStatus || j.Status || '',
      jobCardNo: j.JobCardNo || ''
    });
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
        sparePartsUsed.push({
          date: j.CloseDateTime || j.OpenDateTime || j.DateCreated || '',
          jobCardNo: j.JobCardNo || '',
          partName: pn,
          quantity: 1,
          cost: matched ? (parseFloat(matched.UnitCost || matched.Cost) || 0) : 0,
          technician: j.AssignedTechnician || ''
        });
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
  var availability = (totalWorking + totalDowntime) > 0 ? Math.round((totalWorking / (totalWorking + totalDowntime)) * 10000) / 100 : null;

  var sortedMonths = Object.keys(monthlyBreakdown).sort();
  var breakdownTrendData = sortedMonths.map(function(m) { return { label: m, value: monthlyBreakdown[m] || 0 }; });
  var downtimeTrendData = sortedMonths.map(function(m) { return { label: m, value: Math.round(((monthlyDowntime[m] || 0) / 60) * 100) / 100 }; });
  var failureCatData = Object.keys(failureCategory).map(function(k) { return { label: k, value: failureCategory[k] }; });
  var mttrTrendData = sortedMonths.map(function(m) {
    var d = monthlyMttr[m];
    var val = d && d.count > 0 ? Math.round((d.repair / d.count / 60) * 100) / 100 : null;
    return { label: m, value: val };
  });
  var mtbfTrendData = sortedMonths.map(function(m) {
    var d = monthlyMtbf[m];
    var val = d && d.jobsWithBreakdown > 0 ? Math.round((machineRuntimeHours / d.jobsWithBreakdown / sortedMonths.length) * 100) / 100 : null;
    return { label: m, value: val };
  });

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
    charts: {
      breakdownTrend: breakdownTrendData,
      downtimeTrend: downtimeTrendData,
      failureCategory: failureCatData,
      mttrTrend: mttrTrendData,
      mtbfTrend: mtbfTrendData
    },
    timeline: timeline,
    searchOptions: uniqueSearch
  };
}
