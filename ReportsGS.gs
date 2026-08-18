function getReportFilterOptions() {
  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];
  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];

  var techList = techs.map(function(t) { return t.TechnicianName || t.Name || ''; }).filter(function(t) { return t; }).sort();
  var priorityList = [];
  var seenPri = {};
  jcs.forEach(function(j) {
    var p = j.Priority || '';
    if (p && !seenPri[p]) { seenPri[p] = true; priorityList.push(p); }
  });

  var statusList = [];
  var seenSt = {};
  jcs.forEach(function(j) {
    var s = j.CurrentStatus || j.Status || '';
    if (s && !seenSt[s]) { seenSt[s] = true; statusList.push(s); }
  });

  var mtList = [];
  var seenMt = {};
  jcs.forEach(function(j) {
    var mt = j.BreakdownType || j.MaintenanceType || '';
    if (mt && !seenMt[mt]) { seenMt[mt] = true; mtList.push(mt); }
  });
  mtList.sort();

  return {
    technicians: techList,
    maintenanceTypes: ['All'].concat(mtList),
    priorities: priorityList,
    statuses: statusList,
    reportTypes: [
      { value: 'machine_history', label: 'Machine History' },
      { value: 'breakdown_history', label: 'Breakdown History' },
      { value: 'preventive_maintenance', label: 'Preventive Maintenance' },
      { value: 'technician_performance', label: 'Technician Performance' },
      { value: 'department_performance', label: 'Department Performance' },
      { value: 'machine_performance', label: 'Machine Performance' },
      { value: 'machine_utilization', label: 'Machine Utilization' },
      { value: 'mttr', label: 'MTTR Report' },
      { value: 'mtbf', label: 'MTBF Report' },
      { value: 'availability', label: 'Availability Report' },
      { value: 'pending_jobs', label: 'Pending Jobs' },
      { value: 'closed_jobs', label: 'Closed Jobs' },
      { value: 'approval_history', label: 'Approval History' },
      { value: 'downtime_analysis', label: 'Downtime Analysis' },
      { value: 'complaint_analysis', label: 'Complaint Analysis' },
      { value: 'root_cause_analysis', label: 'Root Cause Analysis' },
      { value: 'spare_parts_consumption', label: 'Spare Parts Consumption' },
      { value: 'maintenance_cost', label: 'Maintenance Cost' },
      { value: 'asset_history', label: 'Asset History' }
    ]
  };
}

function getReportData(filters) {
  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var sections = getAllData(CONFIG.SHEET_NAMES.SECTIONS) || [];
  var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
  var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var pms = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];

  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];

  var deptMap = {};
  depts.forEach(function(d) { deptMap[d.Department || ''] = d; });

  var sectionIdByName = {};
  sections.forEach(function(s) { if (s.Section) sectionIdByName[s.Section] = s.SectionID || ''; });

  var machineMap = {};
  machines.forEach(function(m) {
    var mn = m.MachineName || '';
    machineMap[mn] = m;
  });

  var assetMap = {};
  assets.forEach(function(a) { assetMap[a.AssetID || ''] = a; });

  var fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
  var toDate = filters.toDate ? new Date(filters.toDate) : null;
  if (toDate && !isNaN(toDate.getTime())) {
    toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
  }

  var filtered = jcs.filter(function(jc) {
    var jd = jc.OpenDateTime || jc.DateCreated || jc.Date || '';
    if (!jd) return false;
    var jDate = new Date(jd);
    if (isNaN(jDate.getTime())) return false;
    if (fromDate && jDate < fromDate) return false;
    if (toDate && jDate > toDate) return false;

    var machineName = jc.Machine || '';
    var m = machineMap[machineName] || {};
    var deptName = jc.Department || m.Department || '';
    var dept = deptMap[deptName] || {};
    var sectionName = jc.Section || m.Section || dept.Section || '';

    if (filters.division) {
      var divVal = String(filters.division);
      if (dept.DivisionID !== divVal && dept.Division !== divVal) return false;
    }
    if (filters.section) {
      var secVal = String(filters.section);
      var secId = sectionIdByName[sectionName] || dept.SectionID || m.SectionID || '';
      if (secId !== secVal && sectionName !== secVal) return false;
    }
    if (filters.department) {
      var depVal = String(filters.department);
      var depId = dept.DepartmentID || m.DeptID || '';
      if (depId !== depVal && deptName !== depVal) return false;
    }
    if (filters.machine && machineName !== filters.machine) return false;
    if (filters.machineNumber && m.MachineNumber !== filters.machineNumber && m.MachineCode !== filters.machineNumber && m.MachineName !== filters.machineNumber && machineName !== filters.machineNumber) return false;
    if (filters.technician) {
      var techVal = String(filters.technician).trim().toLowerCase();
      var assigned = String(jc.AssignedTechnician || '');
      var techOk = assigned.toLowerCase() === techVal;
      if (!techOk) {
        var techParts = assigned.split(',');
        for (var ti = 0; ti < techParts.length; ti++) {
          if (String(techParts[ti]).trim().toLowerCase() === techVal) { techOk = true; break; }
        }
      }
      if (!techOk) return false;
    }
    if (filters.maintenanceType && filters.maintenanceType !== 'All' && filters.maintenanceType !== 'All Types') {
      var bt = String(jc.BreakdownType || '').toLowerCase();
      var mtCol = String(jc.MaintenanceType || '').toLowerCase();
      var ft = String(filters.maintenanceType).toLowerCase();
      if (bt !== ft && mtCol !== ft) return false;
    }
    if (filters.priority && jc.Priority !== filters.priority) return false;
    if (filters.status) {
      var st = jc.CurrentStatus || jc.Status || '';
      if (String(st).toLowerCase() !== String(filters.status).toLowerCase()) return false;
    }
    return true;
  });

  var rows = filtered.map(function(jc) {
    var m = machineMap[jc.Machine || ''] || {};
    var dept = deptMap[jc.Department || m.Department || ''] || {};
    var wtMins = resolveMinutes(jc, 'WaitingTime');
    var wMins = resolveMinutes(jc, 'WorkingTime');
    var dMins = resolveDowntimeMinutes(jc);
    var repairMins = resolveRepairMinutes(jc);
    var rd = jc.RootCause || '';
    var cc = jc.ComplaintCategory || '';
    var mType = jc.BreakdownType || jc.MaintenanceType || '';
    return {
      Division: dept.Division || '',
      Section: jc.Section || m.Section || dept.Section || '',
      Department: jc.Department || m.Department || '',
      Machine: jc.Machine || '',
      MachineNumber: m.MachineNumber || m.MachineCode || '',
      Asset: jc.AssetID || '',
      JobCardNo: jc.JobCardNo || '',
      Complaint: jc.ComplaintDescription || '',
      ComplaintCategory: cc,
      Priority: jc.Priority || '',
      Technician: jc.AssignedTechnician || '',
      MaintenanceType: mType,
      WaitingTime: wtMins,
      WorkingTime: wMins,
      Downtime: dMins,
      OpenDate: jc.OpenDateTime || jc.DateCreated || jc.Date || '',
      CloseDate: jc.CloseDateTime || '',
      ApprovalStatus: jc.ApprovalStatus || '',
      CurrentStatus: jc.CurrentStatus || jc.Status || '',
      RootCause: rd,
      CorrectiveAction: jc.CorrectiveAction || '',
      SpareParts: jc.SpareParts || '',
      RepairTime: repairMins,
      BreakdownType: mType
    };
  });

  var filteredMachines = machines;
  if (filters.division) {
    var divVal = String(filters.division);
    var divIdFromName = null;
    for (var di = 0; di < depts.length; di++) {
      if (String(depts[di].Division || '') === divVal) { divIdFromName = depts[di].DivisionID || ''; break; }
    }
    filteredMachines = filteredMachines.filter(function(m) {
      return m.DivisionID === divVal || (divIdFromName && m.DivisionID === divIdFromName);
    });
  }
  if (filters.section) {
    var secVal = String(filters.section);
    filteredMachines = filteredMachines.filter(function(m) {
      return m.SectionID === secVal || m.Section === secVal;
    });
  }
  if (filters.department) {
    var depVal = String(filters.department);
    filteredMachines = filteredMachines.filter(function(m) {
      return m.DeptID === depVal || m.Department === depVal;
    });
  }
  if (filters.machineNumber) {
    var mnVal = String(filters.machineNumber);
    filteredMachines = filteredMachines.filter(function(m) {
      return m.MachineNumber === mnVal || m.MachineCode === mnVal || m.MachineName === mnVal;
    });
  }

  var reportType = filters.reportType || 'machine_history';
  var columns = getReportColumns(reportType);
  var tableRows = getTableRows(rows, reportType);
  var kpi = computeKPI(filtered, filteredMachines, filters);
  var charts = computeChartData(rows, filtered, jcs);

  return { columns: columns, rows: tableRows, kpi: kpi, charts: charts };
}

function getReportColumns(type) {
  var allCols = [
    { key: 'Division', label: 'Division' },
    { key: 'Section', label: 'Section' },
    { key: 'Department', label: 'Department' },
    { key: 'Machine', label: 'Machine' },
    { key: 'MachineNumber', label: 'Machine Number' },
    { key: 'Asset', label: 'Asset' },
    { key: 'JobCardNo', label: 'Job Card No' },
    { key: 'Complaint', label: 'Complaint' },
    { key: 'ComplaintCategory', label: 'Complaint Category' },
    { key: 'Priority', label: 'Priority' },
    { key: 'Technician', label: 'Technician' },
    { key: 'MaintenanceType', label: 'Maintenance Type' },
    { key: 'WaitingTime', label: 'Waiting Time', type: 'duration' },
    { key: 'WorkingTime', label: 'Working Time', type: 'duration' },
    { key: 'Downtime', label: 'Downtime', type: 'duration' },
    { key: 'MTTR', label: 'MTTR (hrs)', type: 'number' },
    { key: 'MTBF', label: 'MTBF (hrs)', type: 'number' },
    { key: 'Availability', label: 'Availability %', type: 'percent' },
    { key: 'ApprovalStatus', label: 'Approval Status' },
    { key: 'CurrentStatus', label: 'Current Status' },
    { key: 'OpenDate', label: 'Open Date', type: 'datetime' },
    { key: 'CloseDate', label: 'Close Date', type: 'datetime' },
    { key: 'RootCause', label: 'Root Cause' },
    { key: 'CorrectiveAction', label: 'Corrective Action' },
    { key: 'RepairTime', label: 'Repair Time', type: 'duration' }
  ];

  var detailColKeys = ['Division','Section','Department','Machine','MachineNumber','Asset','JobCardNo','Complaint','ComplaintCategory','Priority','Technician','MaintenanceType','WaitingTime','WorkingTime','Downtime','ApprovalStatus','CurrentStatus','OpenDate','CloseDate'];

  var typeColMap = {
    machine_history: detailColKeys,
    breakdown_history: detailColKeys,
    preventive_maintenance: detailColKeys,
    technician_performance: ['Technician','JobCardNo','Division','Section','Department','Machine','MachineNumber','MaintenanceType','WorkingTime','Downtime','CurrentStatus','OpenDate','CloseDate'],
    department_performance: ['Department','Division','Section','JobCardNo','Machine','MachineNumber','MaintenanceType','WorkingTime','Downtime','CurrentStatus'],
    machine_performance: ['Machine','MachineNumber','Division','Section','Department','JobCardNo','MaintenanceType','WorkingTime','Downtime','CurrentStatus'],
    machine_utilization: ['Machine','MachineNumber','Division','Section','Department','WorkingTime','Downtime','OpenDate','CloseDate'],
    mttr: detailColKeys,
    mtbf: detailColKeys,
    availability: detailColKeys,
    pending_jobs: detailColKeys,
    closed_jobs: detailColKeys,
    approval_history: detailColKeys,
    downtime_analysis: detailColKeys,
    complaint_analysis: ['ComplaintCategory','JobCardNo','Division','Section','Department','Machine','MachineNumber','Priority','Technician','Downtime','CurrentStatus'],
    root_cause_analysis: ['RootCause','CorrectiveAction','JobCardNo','Division','Section','Department','Machine','MachineNumber','Technician','Downtime','CurrentStatus'],
    spare_parts_consumption: ['SpareParts','JobCardNo','Division','Section','Department','Machine','MachineNumber','Technician','MaintenanceType','WorkingTime','CurrentStatus'],
    maintenance_cost: ['JobCardNo','Division','Section','Department','Machine','MachineNumber','Technician','WorkingTime','Downtime','CurrentStatus'],
    asset_history: ['Asset','JobCardNo','Division','Section','Department','Machine','MachineNumber','Technician','WorkingTime','Downtime','CurrentStatus']
  };

  var keys = typeColMap[type] || detailColKeys;
  var colIndex = {};
  allCols.forEach(function(c, i) { colIndex[c.key] = i; });
  return keys.filter(function(k) { return colIndex[k] !== undefined; }).map(function(k) { return allCols[colIndex[k]]; });
}

function isBreakdownMaint(mt) {
  var s = String(mt || '').trim().toLowerCase();
  if (!s) return false;
  if (s.indexOf('preventive') > -1 || s.indexOf('routine') > -1) return false;
  return s === 'breakdown' || s === 'electrical' || s === 'mechanical' || s === 'emergency' || s === 'corrective'
    || s.indexOf('breakdown') > -1 || s.indexOf('electrical') > -1 || s.indexOf('mechanical') > -1
    || s.indexOf('emergency') > -1 || s.indexOf('corrective') > -1;
}

function isPreventiveMaint(mt) {
  var s = String(mt || '').trim().toLowerCase();
  if (!s) return false;
  return s.indexOf('preventive') > -1 || s === 'routine' || s.indexOf('routine') > -1;
}

function getTableRows(rows, type) {
  if (type === 'technician_performance') return aggregateBy(rows, 'Technician', ['JobCardNo','WorkingTime','Downtime']);
  if (type === 'department_performance') return aggregateBy(rows, 'Department', ['JobCardNo','WorkingTime','Downtime']);
  if (type === 'machine_performance') return aggregateBy(rows, 'Machine', ['JobCardNo','WorkingTime','Downtime']);
  if (type === 'machine_utilization') return rows;
  if (type === 'downtime_analysis') return rows;
  if (type === 'complaint_analysis') return rows;
  if (type === 'root_cause_analysis') return rows.filter(function(r) { return r.RootCause; });
  if (type === 'spare_parts_consumption') return rows.filter(function(r) { return r.SpareParts; });
  if (type === 'maintenance_cost') return rows;
  if (type === 'pending_jobs') return rows.filter(function(r) { var s = r.CurrentStatus.toLowerCase(); return s === 'pending' || s === 'pending approval'; });
  if (type === 'closed_jobs') return rows.filter(function(r) { var s = r.CurrentStatus.toLowerCase(); return s === 'closed' || s === 'completed'; });
  if (type === 'breakdown_history') return rows.filter(function(r) { return isBreakdownMaint(r.BreakdownType); });
  if (type === 'preventive_maintenance') return rows.filter(function(r) { return isPreventiveMaint(r.BreakdownType); });
  return rows;
}

function aggregateBy(rows, groupKey, metrics) {
  var map = {};
  rows.forEach(function(r) {
    var g = r[groupKey] || 'Unspecified';
    if (!map[g]) {
      map[g] = { _group: g, _count: 0, _workingTime: 0, _downtime: 0 };
      map[g][groupKey] = g;
    }
    map[g]._count++;
    map[g]._workingTime += r.WorkingTime || 0;
    map[g]._downtime += r.Downtime || 0;
  });
  return Object.keys(map).map(function(k) {
    var o = map[k];
    o.TotalJobs = o._count;
    o.TotalWorkingTime = o._workingTime;
    o.TotalDowntime = o._downtime;
    delete o._group; delete o._count; delete o._workingTime; delete o._downtime;
    return o;
  });
}

function classifyReportMaintenance(record) {
  var bt = String(record.BreakdownType || '').trim().toLowerCase();
  var isBreakdown = bt.indexOf('breakdown') !== -1;
  var isPreventive = bt === 'preventive maintenance';
  return { isBreakdown: isBreakdown, isPreventive: isPreventive };
}

function computeKPI(filtered, machines, filters) {
  var totalJobs = filtered.length;
  var totalWaitingMinutes = 0;
  var totalWorkingMinutes = 0;
  var totalDowntimeMinutes = 0;

  var breakdownMaintenanceCount = 0;
  var preventiveMaintenanceCount = 0;
  var approvedBreakdownJobCount = 0;
  var breakdownClosedCount = 0;
  var breakdownClosedRepairMinutes = 0;

  var fromDate = filters && filters.fromDate ? new Date(filters.fromDate) : null;
  var toDate = filters && filters.toDate ? new Date(filters.toDate) : null;
  if (toDate && !isNaN(toDate.getTime())) {
    toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
  }

  var machineSchedule = {};
  if (machines && machines.length > 0) {
    for (var mi = 0; mi < machines.length; mi++) {
      var mn = machines[mi].MachineName || '';
      if (mn) {
        machineSchedule[mn] = {
          mph: parseFloat(machines[mi].OperatingHoursPerDay) || 0,
          mpw: parseFloat(machines[mi].OperatingDaysPerWeek) || 0
        };
      }
    }
  }

  for (var i = 0; i < filtered.length; i++) {
    var jc = filtered[i];
    var waitingMins = resolveMinutes(jc, 'WaitingTime');
    var workingMins = resolveMinutes(jc, 'WorkingTime');
    var repairMins = resolveRepairMinutes(jc);
    var downtimeMins = resolveDowntimeMinutes(jc);

    var jobOpenStr = jc.OpenDateTime || jc.DateCreated || jc.Date || '';
    var jobCloseStr = jc.CloseDateTime || '';
    if (fromDate && toDate && jobOpenStr && jobCloseStr) {
      var jOpen = new Date(jobOpenStr);
      var jClose = new Date(jobCloseStr);
      if (!isNaN(jOpen.getTime()) && !isNaN(jClose.getTime())) {
        if (jClose < fromDate || jOpen > toDate) {
          waitingMins = 0;
          workingMins = 0;
          downtimeMins = 0;
          repairMins = 0;
        } else {
          var effOpen = jOpen < fromDate ? fromDate : jOpen;
          var effClose = jClose > toDate ? toDate : jClose;
          var effectiveDays = (effClose - effOpen) / 86400000;
          var sched = machineSchedule[jc.Machine || ''];
          if (sched && sched.mph > 0 && sched.mpw > 0) {
            var operatingMinutes = Math.round(sched.mph * sched.mpw / 7 * effectiveDays * 60);
            var rawSum = waitingMins + workingMins + downtimeMins;
            if (rawSum > operatingMinutes && rawSum > 0) {
              var factor = operatingMinutes / rawSum;
              waitingMins = Math.round(waitingMins * factor);
              workingMins = Math.round(workingMins * factor);
              downtimeMins = Math.round(downtimeMins * factor);
            }
            repairMins = Math.min(repairMins, operatingMinutes);
          }
        }
      }
    }

    totalWaitingMinutes += waitingMins;
    totalWorkingMinutes += workingMins;
    totalDowntimeMinutes += downtimeMins;

    var classification = classifyReportMaintenance(jc);
    if (classification.isBreakdown) {
      breakdownMaintenanceCount++;
      var approvalStatus = (jc.ApprovalStatus || '').toLowerCase();
      var status = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var isApproved = (approvalStatus === 'approved');
      var isClosed = (status === 'closed' || status === 'approved');
      if (isApproved) approvedBreakdownJobCount++;
      if (isClosed) {
        breakdownClosedCount++;
        breakdownClosedRepairMinutes += repairMins;
      }
    }
    else if (classification.isPreventive) preventiveMaintenanceCount++;
  }

  var reportDays;
  if (fromDate && toDate) {
    var startDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    var endDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    reportDays = Math.max(1, Math.round((endDay - startDay) / 86400000) + 1);
  } else if (fromDate) {
    reportDays = Math.max(1, Math.round((new Date() - fromDate) / 86400000));
  } else {
    reportDays = 365;
  }

  var totalMachineRuntimeHours = 0;
  if (machines && machines.length > 0) {
    for (var mi = 0; mi < machines.length; mi++) {
      var mph = parseFloat(machines[mi].OperatingHoursPerDay) || 0;
      var mpw = parseFloat(machines[mi].OperatingDaysPerWeek) || 0;
      if (mph > 0 && mpw > 0) {
        totalMachineRuntimeHours += mph * mpw / 7 * reportDays;
      }
    }
  }

  var mttr = breakdownClosedCount > 0 ? Math.round((breakdownClosedRepairMinutes / breakdownClosedCount / 60) * 100) / 100 : null;

  var mtbf = approvedBreakdownJobCount > 0 ? Math.round((totalMachineRuntimeHours / approvedBreakdownJobCount) * 100) / 100 : null;

  var availability = (totalWorkingMinutes + totalDowntimeMinutes) > 0 ? Math.round((totalWorkingMinutes / (totalWorkingMinutes + totalDowntimeMinutes)) * 10000) / 100 : 0;

  var totalOperatingMinutes = Math.round(totalMachineRuntimeHours * 60);

  return {
    totalJobs: totalJobs,
    breakdownJobs: breakdownMaintenanceCount,
    preventiveJobs: preventiveMaintenanceCount,
    totalDowntime: totalDowntimeMinutes,
    totalWaiting: totalWaitingMinutes,
    totalWorking: totalWorkingMinutes,
    totalOperating: totalOperatingMinutes,
    mttr: mttr,
    mtbf: mtbf,
    availability: availability
  };
}

function computeChartData(rows, filtered, allJcs) {
  var today = new Date();
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var months = {};
  var breakdownTrend = {};
  var downtimeTrend = {};
  var breakdownCategory = {};
  var deptPerf = {};
  var machinePerf = {};
  var techPerf = {};
  var availabilityTrend = {};

  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var machineMap = {};
  machines.forEach(function(m) { machineMap[m.MachineName || ''] = m; });

  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var deptMap = {};
  depts.forEach(function(d) { deptMap[d.Department || ''] = d; });

  filtered.forEach(function(jc) {
    var jd = jc.OpenDateTime || jc.DateCreated || jc.Date || '';
    if (!jd) return;
    var d = new Date(jd);
    if (isNaN(d.getTime())) return;
    var mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var mLabel = monthNames[d.getMonth()] + ' ' + d.getFullYear();

    if (!months[mk]) months[mk] = mLabel;
    if (!breakdownTrend[mk]) breakdownTrend[mk] = 0;
    if (!downtimeTrend[mk]) downtimeTrend[mk] = 0;
    if (!availabilityTrend[mk]) availabilityTrend[mk] = { working: 0, downtime: 0 };

    var isBd = isBreakdownMaint(jc.BreakdownType || jc.MaintenanceType);
    if (isBd) breakdownTrend[mk]++;

    var dMins = normalizeDuration(jc.Downtime || 0) || 0;
    var wMins = normalizeDuration(jc.WorkingTime || 0) || 0;
    downtimeTrend[mk] += dMins;
    availabilityTrend[mk].working += wMins;
    availabilityTrend[mk].downtime += dMins;

    var cat = jc.ComplaintCategory || 'Uncategorized';
    if (!breakdownCategory[cat]) breakdownCategory[cat] = 0;
    breakdownCategory[cat]++;

    var machineName = jc.Machine || 'Unknown';
    if (!machinePerf[machineName]) machinePerf[machineName] = 0;
    machinePerf[machineName]++;

    var tech = jc.AssignedTechnician || 'Unassigned';
    if (!techPerf[tech]) techPerf[tech] = 0;
    techPerf[tech]++;

    var deptName = jc.Department || machineMap[machineName]?.Department || 'Unknown';
    if (!deptPerf[deptName]) deptPerf[deptName] = 0;
    deptPerf[deptName]++;
  });

  var sortedKeys = Object.keys(months).sort();
  var bdTrendData = sortedKeys.map(function(k) { return { label: months[k], value: Math.round((breakdownTrend[k] || 0) * 100) / 100 }; });
  var dtTrendData = sortedKeys.map(function(k) { return { label: months[k], value: Math.round((downtimeTrend[k] || 0) / 60 * 100) / 100 }; });
  var availTrendData = sortedKeys.map(function(k) {
    var a = availabilityTrend[k] || { working: 0, downtime: 0 };
    var pct = (a.working + a.downtime) > 0 ? Math.round((a.working / (a.working + a.downtime)) * 10000) / 100 : 100;
    return { label: months[k], value: pct };
  });
  var catData = Object.keys(breakdownCategory).sort().map(function(k) { return { label: k, value: breakdownCategory[k] }; });
  var deptData = Object.keys(deptPerf).sort(function(a, b) { return deptPerf[b] - deptPerf[a]; }).map(function(k) { return { label: k, value: deptPerf[k] }; });
  var machData = Object.keys(machinePerf).sort(function(a, b) { return machinePerf[b] - machinePerf[a]; }).map(function(k) { return { label: k, value: machinePerf[k] }; });
  var techData = Object.keys(techPerf).sort(function(a, b) { return techPerf[b] - techPerf[a]; }).map(function(k) { return { label: k, value: techPerf[k] }; });

  var monthlyData = sortedKeys.map(function(k) {
    var total = 0;
    filtered.forEach(function(jc) {
      var jd = jc.OpenDateTime || jc.DateCreated || jc.Date || '';
      if (!jd) return;
      var d = new Date(jd);
      if (isNaN(d.getTime())) return;
      var mk2 = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (mk2 === k) total++;
    });
    return { label: months[k], value: total };
  });

  return {
    breakdownTrend: bdTrendData,
    downtimeTrend: dtTrendData,
    breakdownCategory: catData,
    departmentPerformance: deptData,
    machinePerformance: machData,
    technicianPerformance: techData,
    monthlyMaintenance: monthlyData,
    availabilityTrend: availTrendData
  };
}

function getMachineNumberForJobCard(jc, machineMap) {
  var m = machineMap[jc.Machine || ''] || {};
  return m.MachineNumber || m.MachineCode || '';
}


