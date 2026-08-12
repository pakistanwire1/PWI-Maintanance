function getBreakdownHistory() {
  var jobCards = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  Logger.log('getBreakdownHistory(): jobCards=' + jobCards.length);
  console.log('getBreakdownHistory(): jobCards=' + jobCards.length);

  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var depts = getAllData(CONFIG.SHEET_NAMES.DEPARTMENTS) || [];
  var sections = getAllData(CONFIG.SHEET_NAMES.SECTIONS) || [];

  var deptMap = {};
  depts.forEach(function(d) { deptMap[d.Department || ''] = d; });
  var sectionIdByName = {};
  sections.forEach(function(s) { if (s.Section) sectionIdByName[s.Section] = s.SectionID || ''; });
  var machineMap = {};
  machines.forEach(function(m) { if (m.MachineName) machineMap[m.MachineName] = m; });

  var rows = jobCards.filter(function(jc) {
    return isBreakdownMaint(jc.BreakdownType || jc.MaintenanceType);
  }).map(function(jc) {
    jc = normalizeJobCard(jc);
    var m = machineMap[jc.Machine || ''] || {};
    var deptName = jc.Department || m.Department || '';
    var dept = deptMap[deptName] || {};
    var sectionName = jc.Section || m.Section || dept.Section || '';
    jc.DivisionID = dept.DivisionID || m.DivisionID || '';
    jc.Division = dept.Division || '';
    jc.SectionID = sectionIdByName[sectionName] || dept.SectionID || m.SectionID || '';
    jc.DepartmentID = dept.DepartmentID || m.DeptID || '';
    jc.MachineNumber = jc.MachineNumber || m.MachineNumber || m.MachineCode || '';
    jc.MachineCode = jc.MachineCode || m.MachineCode || '';
    jc.MachineID = jc.MachineID || m.MachineID || '';
    return jc;
  });

  rows.sort(function(a, b) {
    var da = new Date(a.OpenDateTime || a.DateCreated || a.Date || '');
    var db = new Date(b.OpenDateTime || b.DateCreated || b.Date || '');
    if (isNaN(da.getTime())) return 1;
    if (isNaN(db.getTime())) return -1;
    return db.getTime() - da.getTime();
  });

  Logger.log('getBreakdownHistory(): returning ' + rows.length + ' breakdown records');
  console.log('getBreakdownHistory(): returning ' + rows.length + ' breakdown records');
  return rows;
}

function getBreakdownHistoryFiltered(filters) {
  var data = getBreakdownHistory();
  filters = filters || {};
  var fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
  var toDate = filters.toDate ? new Date(filters.toDate) : null;
  return data.filter(function(row) {
    if (filters.division) {
      var div = String(filters.division);
      if (row.DivisionID !== div && row.Division !== div) return false;
    }
    if (filters.section) {
      var sec = String(filters.section);
      if (row.SectionID !== sec && row.Section !== sec) return false;
    }
    if (filters.department) {
      var dep = String(filters.department);
      if (row.DepartmentID !== dep && row.Department !== dep) return false;
    }
    if (filters.machineNumber) {
      var mn = String(filters.machineNumber);
      if (row.MachineNumber !== mn && row.MachineCode !== mn && row.MachineID !== mn && row.Machine !== mn) return false;
    }
    if (filters.priority && row.Priority !== filters.priority) return false;
    if (filters.technician) {
      var techVal = String(filters.technician).trim().toLowerCase();
      var assigned = String(row.AssignedTechnician || '').toLowerCase();
      if (assigned !== techVal && assigned.indexOf(techVal) === -1) return false;
    }
    var dateStr = row.OpenDateTime || row.DateCreated || row.Date;
    if (dateStr) {
      var d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
      }
    }
    return true;
  });
}

function getBreakdownStats() {
  var breakdowns = getBreakdownHistory();
  var totalDowntime = 0;
  var machineMap = {};
  for (var i = 0; i < breakdowns.length; i++) {
    var b = breakdowns[i];
    var dt = Math.round(parseDurationToHours(b.TotalDuration || b.Downtime || 0) * 60);
    totalDowntime += dt;
    var mKey = b.MachineNumber || b.MachineCode || b.Machine || '';
    if (mKey) {
      if (!machineMap[mKey]) machineMap[mKey] = { machine: mKey, count: 0, downtime: 0 };
      machineMap[mKey].count++;
      machineMap[mKey].downtime += dt;
    }
  }
  var topMachines = Object.keys(machineMap).map(function(k) {
    return machineMap[k];
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);
  return {
    totalBreakdowns: breakdowns.length,
    totalDowntime: Math.round(totalDowntime),
    topMachines: topMachines
  };
}
