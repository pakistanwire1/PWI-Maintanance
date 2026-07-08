function getBreakdownHistory() {
  var jobCards = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
  Logger.log('getBreakdownHistory(): jobCards=' + jobCards.length);
  console.log('getBreakdownHistory(): jobCards=' + jobCards.length);
  var result = jobCards.filter(function(jc) {
    var status = (jc.CurrentStatus || jc.Status || '').toLowerCase();
    return status === 'closed' || status === 'completed';
  });
  Logger.log('getBreakdownHistory(): returning ' + result.length + ' breakdown records');
  console.log('getBreakdownHistory(): returning ' + result.length + ' breakdown records');
  return result.map(normalizeJobCard);
}

function getBreakdownHistoryFiltered(filters) {
  var data = getBreakdownHistory();
  return data.filter(function(row) {
    if (filters.machine && row.Machine !== filters.machine) return false;
    if (filters.department && row.Department !== filters.department) return false;
    var dateStr = row.DateCreated || row.Date || row.OpenDateTime;
    if (filters.fromDate && dateStr) {
      var d = new Date(dateStr);
      var f = new Date(filters.fromDate);
      if (d < f) return false;
    }
    if (filters.toDate && dateStr) {
      var d = new Date(dateStr);
      var t = new Date(filters.toDate);
      if (d > t) return false;
    }
    if (filters.priority && row.Priority !== filters.priority) return false;
    if (filters.technician && row.AssignedTechnician !== filters.technician) return false;
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
    if (b.Machine) {
      if (!machineMap[b.Machine]) machineMap[b.Machine] = { count: 0, downtime: 0 };
      machineMap[b.Machine].count++;
      machineMap[b.Machine].downtime += dt;
    }
  }
  var topMachines = Object.keys(machineMap).map(function(m) {
    return { machine: m, count: machineMap[m].count, downtime: Math.round(machineMap[m].downtime) };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);
  return {
    totalBreakdowns: breakdowns.length,
    totalDowntime: Math.round(totalDowntime),
    topMachines: topMachines
  };
}
