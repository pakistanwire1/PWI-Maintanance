function getReportData(reportType, filters) {
  switch (reportType) {
    case 'machine_history': return getMachineHistoryReport(filters);
    case 'technician_performance': return getTechnicianPerformanceReport(filters);
    case 'department': return getDepartmentReport(filters);
    case 'breakdown': return getBreakdownReport(filters);
    case 'downtime': return getDowntimeReport(filters);
    case 'monthly': return getMonthlyReport(filters);
    case 'pm_compliance': return getPMComplianceReport(filters);
    default: return [];
  }
}

function getMachineHistoryReport(filters) {
  var all = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
  return all.filter(function(jc) {
    return !filters.machine || jc.Machine === filters.machine;
  }).map(function(jc) {
    return {
      JobCardNo: jc.JobCardNo, Date: jc.DateCreated || jc.Date || jc.OpenDateTime, Machine: jc.Machine,
      Complaint: jc.ComplaintDescription, Technician: jc.AssignedTechnician,
      Status: jc.Status, Downtime: jc.TotalDuration || jc.Downtime, Priority: jc.Priority
    };
  });
}

function getTechnicianPerformanceReport(filters) {
  var all = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
  var map = {};
  all.forEach(function(jc) {
    var tech = jc.AssignedTechnician || 'Unassigned';
    if (filters.technician && tech !== filters.technician) return;
    if (!map[tech]) map[tech] = { technician: tech, totalJobs: 0, completed: 0, totalDowntime: 0 };
    map[tech].totalJobs++;
    var s = (jc.Status || '').toLowerCase();
    if (s === 'closed' || s === 'completed') map[tech].completed++;
    map[tech].totalDowntime += parseFloat(jc.TotalDuration || jc.Downtime) || 0;
  });
  return Object.keys(map).map(function(k) { return map[k]; });
}

function getDepartmentReport(filters) {
  var all = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
  var map = {};
  all.forEach(function(jc) {
    var dept = jc.Department || 'Unspecified';
    if (filters.department && dept !== filters.department) return;
    if (!map[dept]) map[dept] = { department: dept, totalJobs: 0, openJobs: 0, closedJobs: 0, totalDowntime: 0 };
    map[dept].totalJobs++;
    var s = (jc.Status || '').toLowerCase();
    if (s === 'closed' || s === 'completed') map[dept].closedJobs++;
    else map[dept].openJobs++;
    map[dept].totalDowntime += parseFloat(jc.TotalDuration || jc.Downtime) || 0;
  });
  return Object.keys(map).map(function(k) { return map[k]; });
}

function getBreakdownReport(filters) {
  return getBreakdownHistoryFiltered(filters || {});
}

function getDowntimeReport(filters) {
  var all = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
  return all.filter(function(jc) {
    var downtime = parseFloat(jc.TotalDuration || jc.Downtime) || 0;
    if (downtime <= 0) return false;
    if (filters.machine && jc.Machine !== filters.machine) return false;
    var jcDate = jc.DateCreated || jc.Date || jc.OpenDateTime;
    if (filters.fromDate && jcDate) {
      var d = new Date(jcDate), f = new Date(filters.fromDate);
      if (d < f) return false;
    }
    if (filters.toDate && jcDate) {
      var d = new Date(jcDate), t = new Date(filters.toDate);
      if (d > t) return false;
    }
    return true;
  }).map(function(jc) {
    return {
      JobCardNo: jc.JobCardNo, Date: jc.DateCreated || jc.Date || jc.OpenDateTime, Machine: jc.Machine,
      Department: jc.Department, Downtime: jc.TotalDuration || jc.Downtime, Priority: jc.Priority,
      Technician: jc.AssignedTechnician
    };
  });
}

function getMonthlyReport(filters) {
  var all = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
  var year = filters.year || new Date().getFullYear();
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var map = {};
  all.forEach(function(jc) {
    var dateStr = jc.DateCreated || jc.Date || jc.OpenDateTime;
    if (!dateStr) return;
    var d = new Date(dateStr);
    if (d.getFullYear() !== parseInt(year)) return;
    var mk = d.getMonth() + 1;
    if (!map[mk]) map[mk] = { month: monthNames[d.getMonth()], total: 0, closed: 0, downtime: 0 };
    map[mk].total++;
    var s = (jc.Status || '').toLowerCase();
    if (s === 'closed' || s === 'completed') map[mk].closed++;
    map[mk].downtime += parseFloat(jc.TotalDuration || jc.Downtime) || 0;
  });
  return Object.keys(map).sort(function(a,b) { return a - b; }).map(function(k) { return map[k]; });
}

function getPMComplianceReport(filters) {
  return getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE).map(function(pm) {
    return {
      PMNumber: pm.PMNumber, Machine: pm.Machine, Frequency: pm.Frequency,
      NextDueDate: pm.NextDueDate, LastDone: pm.LastDone, Status: pm.Status,
      Compliant: pm.Status === CONFIG.STATUS.COMPLETED ? 'Yes' : 'No'
    };
  });
}
