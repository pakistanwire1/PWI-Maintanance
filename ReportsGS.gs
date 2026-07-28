function getReportFilterOptions() {
  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var sections = getAllData(CONFIG.SHEET_NAMES.SECTIONS) || [];
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];
  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];

  var divisions = [];
  var seenDiv = {};
  depts.forEach(function(d) {
    var dv = d.Division || '';
    if (dv && !seenDiv[dv]) { seenDiv[dv] = true; divisions.push(dv); }
  });
  divisions.sort();

  var sectionList = sections.map(function(s) { return s.Section || ''; }).filter(function(s) { return s; }).sort();
  var deptList = depts.map(function(d) { return d.Department || ''; }).filter(function(d) { return d; }).sort();
  var machineList = machines.map(function(m) { return m.MachineName || ''; }).filter(function(m) { return m; }).sort();
  var machineNumberList = machines.map(function(m) { return m.MachineNumber || m.MachineCode || ''; }).filter(function(n) { return n; }).sort();
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

  return {
    divisions: divisions,
    sections: sectionList,
    departments: deptList,
    machines: machineList,
    machineNumbers: machineNumberList,
    technicians: techList,
    maintenanceTypes: ['All','Breakdown','Preventive','Electrical','Mechanical','Corrective','Emergency','Routine'],
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
  var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
  var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var pms = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];

  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];

  var deptMap = {};
  depts.forEach(function(d) { deptMap[d.Department || ''] = d; });

  var machineMap = {};
  machines.forEach(function(m) {
    var mn = m.MachineName || '';
    machineMap[mn] = m;
  });

  var assetMap = {};
  assets.forEach(function(a) { assetMap[a.AssetID || ''] = a; });

  var fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
  var toDate = filters.toDate ? new Date(filters.toDate) : null;

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

    if (filters.division && dept.Division !== filters.division) return false;
    if (filters.section && sectionName !== filters.section) return false;
    if (filters.department && deptName !== filters.department) return false;
    if (filters.machine && machineName !== filters.machine) return false;
    if (filters.machineNumber && m.MachineNumber !== filters.machineNumber && m.MachineCode !== filters.machineNumber) return false;
    if (filters.technician && jc.AssignedTechnician !== filters.technician) return false;
    if (filters.maintenanceType && filters.maintenanceType !== 'All') {
      var mt = (jc.BreakdownType || jc.MaintenanceType || '').toLowerCase();
      var ft = filters.maintenanceType.toLowerCase();
      if (ft === 'breakdown' && mt !== 'breakdown') return false;
      else if (ft === 'preventive' && mt !== 'preventive') return false;
      else if (ft === 'electrical' && mt !== 'electrical') return false;
      else if (ft === 'mechanical' && mt !== 'mechanical') return false;
      else if (ft === 'corrective' && mt !== 'corrective') return false;
      else if (ft === 'emergency' && mt !== 'emergency') return false;
      else if (ft === 'routine' && mt !== 'routine') return false;
    }
    if (filters.priority && jc.Priority !== filters.priority) return false;
    if (filters.status) {
      var st = jc.CurrentStatus || jc.Status || '';
      if (st.toLowerCase() !== filters.status.toLowerCase()) return false;
    }
    return true;
  });

  var rows = filtered.map(function(jc) {
    var m = machineMap[jc.Machine || ''] || {};
    var dept = deptMap[jc.Department || m.Department || ''] || {};
    var dMins = normalizeDuration(jc.Downtime || 0) || 0;
    var wMins = normalizeDuration(jc.WorkingTime || 0) || 0;
    var wtMins = normalizeDuration(jc.WaitingTime || 0) || 0;
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
      RepairTime: normalizeDuration(jc.TotalDuration || 0) || 0,
      BreakdownType: mType
    };
  });

  var reportType = filters.reportType || 'machine_history';
  var columns = getReportColumns(reportType);
  var tableRows = getTableRows(rows, reportType);
  var kpi = computeKPI(rows, filtered);
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
  if (type === 'breakdown_history') return rows.filter(function(r) { var mt = r.BreakdownType.toLowerCase(); return mt === 'breakdown' || mt === 'electrical' || mt === 'mechanical' || mt === 'emergency' || mt === 'corrective'; });
  if (type === 'preventive_maintenance') return rows.filter(function(r) { var mt = r.BreakdownType.toLowerCase(); return mt === 'preventive' || mt === 'routine'; });
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

function computeKPI(rows, filtered) {
  var totalJobs = filtered.length;
  var breakdownJobs = 0;
  var preventiveJobs = 0;
  var totalDowntime = 0;
  var totalWaiting = 0;
  var totalWorking = 0;
  var totalRepair = 0;
  var closedBreakdown = 0;
  var closedCount = 0;

  rows.forEach(function(r) {
    totalDowntime += r.Downtime || 0;
    totalWaiting += r.WaitingTime || 0;
    totalWorking += r.WorkingTime || 0;
    totalRepair += r.RepairTime || 0;
    var mt = (r.BreakdownType || r.MaintenanceType || '').toLowerCase();
    if (mt === 'breakdown' || mt === 'electrical' || mt === 'mechanical' || mt === 'emergency' || mt === 'corrective') {
      breakdownJobs++;
      var cs = r.CurrentStatus.toLowerCase();
      if (cs === 'closed' || cs === 'completed') closedBreakdown++;
    }
    if (mt === 'preventive' || mt === 'routine') preventiveJobs++;
    var cs = r.CurrentStatus.toLowerCase();
    if (cs === 'closed' || cs === 'completed') closedCount++;
  });

  var mttr = closedBreakdown > 0 ? Math.round((totalRepair / closedBreakdown / 60) * 100) / 100 : null;
  var mtbfVal = null;
  var availabilityVal = null;
  if (totalWorking + totalDowntime > 0) {
    availabilityVal = Math.round((totalWorking / (totalWorking + totalDowntime)) * 10000) / 100;
  }

  return {
    totalJobs: totalJobs,
    breakdownJobs: breakdownJobs,
    preventiveJobs: preventiveJobs,
    totalDowntime: totalDowntime,
    totalWaiting: totalWaiting,
    totalWorking: totalWorking,
    mttr: mttr,
    mtbf: mtbfVal,
    availability: availabilityVal
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

    var mt = (jc.BreakdownType || jc.MaintenanceType || '').toLowerCase();
    var isBd = mt === 'breakdown' || mt === 'electrical' || mt === 'mechanical' || mt === 'emergency' || mt === 'corrective';
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

function getFilteredByDivision(division) {
  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var filteredDepts = depts.filter(function(d) { return d.Division === division; });
  var deptNames = {};
  filteredDepts.forEach(function(d) { deptNames[d.Department] = true; });
  var sections = {};
  filteredDepts.forEach(function(d) { if (d.Section) sections[d.Section] = true; });
  var filteredMachines = machines.filter(function(m) { return deptNames[m.Department]; });
  return {
    sections: Object.keys(sections).sort(),
    departments: filteredDepts.map(function(d) { return d.Department || ''; }).filter(function(n) { return n; }).sort(),
    machines: filteredMachines.map(function(m) { return m.MachineName || ''; }).filter(function(n) { return n; }).sort(),
    machineNumbers: filteredMachines.map(function(m) { return m.MachineNumber || m.MachineCode || ''; }).filter(function(n) { return n; }).sort()
  };
}

function getFilteredBySection(section, division) {
  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var filteredDepts = depts.filter(function(d) {
    if (division && d.Division !== division) return false;
    if (section && d.Section !== section) return false;
    return true;
  });
  var deptNames = {};
  filteredDepts.forEach(function(d) { deptNames[d.Department] = true; });
  var filteredMachines = machines.filter(function(m) { return deptNames[m.Department]; });
  return {
    departments: filteredDepts.map(function(d) { return d.Department || ''; }).filter(function(n) { return n; }).sort(),
    machines: filteredMachines.map(function(m) { return m.MachineName || ''; }).filter(function(n) { return n; }).sort(),
    machineNumbers: filteredMachines.map(function(m) { return m.MachineNumber || m.MachineCode || ''; }).filter(function(n) { return n; }).sort()
  };
}

function getFilteredByDepartment(department) {
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var filtered = machines.filter(function(m) { return m.Department === department; });
  return {
    machines: filtered.map(function(m) { return m.MachineName || ''; }).filter(function(n) { return n; }).sort(),
    machineNumbers: filtered.map(function(m) { return m.MachineNumber || m.MachineCode || ''; }).filter(function(n) { return n; }).sort()
  };
}

function getMachineNumbersForMachine(machine) {
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var filtered = machines.filter(function(m) { return m.MachineName === machine; });
  return {
    machineNumbers: filtered.map(function(m) { return m.MachineNumber || m.MachineCode || ''; }).filter(function(n) { return n; }).sort()
  };
}
