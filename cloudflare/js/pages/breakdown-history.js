var BreakdownHistory = (function() {
  var state = { data: [], page: 1 };

  var PAGE_SIZE = 10;

  var ICON_BAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>';

  function displayDuration(val) {
    if (!val || val === 0) return '0h 0m';
    if (typeof val === 'number') {
      var hours = Math.floor(val / 60);
      var mins = val % 60;
      return hours + 'h ' + mins + 'm';
    }
    return String(val);
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="breakdownHistoryPage" class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px var(--primary-glow);vertical-align:middle;margin-right:8px"></span>' +
            'Breakdown History' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<select class="form-control" id="bdHistMachineFilter" onchange="BreakdownHistory.filterBreakdowns()">' +
              '<option value="">All Machines</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="bdHistDeptFilter" onchange="BreakdownHistory.filterBreakdowns()">' +
              '<option value="">All Departments</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<input type="date" class="form-control" id="bdHistFromDate" onchange="BreakdownHistory.filterBreakdowns()">' +
          '</div>' +
          '<div class="form-group">' +
            '<input type="date" class="form-control" id="bdHistToDate" onchange="BreakdownHistory.filterBreakdowns()">' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="bdHistPriorityFilter" onchange="BreakdownHistory.filterBreakdowns()">' +
              '<option value="">All Priorities</option>' +
              '<option value="Low">Low</option>' +
              '<option value="Medium">Medium</option>' +
              '<option value="High">High</option>' +
              '<option value="Critical">Critical</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="dashboard-grid" style="grid-template-columns:1fr 1fr;margin-bottom:0">' +
          '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon">' + ICON_BAR + '</div><div class="stat-info"><h3 id="bdHistTotalBreakdowns">0</h3><p>Total Breakdowns</p></div></div></div>' +
          '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon">' + ICON_BAR + '</div><div class="stat-info"><h3 id="bdHistTotalDowntime">0h 0m</h3><p>Total Downtime</p></div></div></div>' +
        '</div>' +
        '<div id="bdHistTableContainer"></div>' +
      '</div></div>';
  }

  function loadBreakdownData() {
    Loader.show();
    API.post('getBreakdownHistory', {}).then(function(result) {
      state.data = result.records || result || [];
      Loader.hide();
      populateBreakdownFilters();
      renderBreakdownTable();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load breakdown history');
    });
  }

  function populateBreakdownFilters() {
    var machineFilter = document.getElementById('bdHistMachineFilter');
    var deptFilter = document.getElementById('bdHistDeptFilter');

    if (machineFilter) {
      machineFilter.innerHTML = '<option value="">All Machines</option>';
      var machines = [];
      state.data.forEach(function(item) {
        if (item.Machine && machines.indexOf(item.Machine) === -1) machines.push(item.Machine);
      });
      machines.sort().forEach(function(m) {
        machineFilter.innerHTML += '<option value="' + Utils.escapeHtml(m) + '">' + Utils.escapeHtml(m) + '</option>';
      });
    }

    if (deptFilter) {
      deptFilter.innerHTML = '<option value="">All Departments</option>';
      var depts = [];
      state.data.forEach(function(item) {
        if (item.Department && depts.indexOf(item.Department) === -1) depts.push(item.Department);
      });
      depts.sort().forEach(function(d) {
        deptFilter.innerHTML += '<option value="' + Utils.escapeHtml(d) + '">' + Utils.escapeHtml(d) + '</option>';
      });
    }
  }

  function getFilteredBreakdownData() {
    var machine = document.getElementById('bdHistMachineFilter') ? document.getElementById('bdHistMachineFilter').value : '';
    var dept = document.getElementById('bdHistDeptFilter') ? document.getElementById('bdHistDeptFilter').value : '';
    var fromDate = document.getElementById('bdHistFromDate') ? document.getElementById('bdHistFromDate').value : '';
    var toDate = document.getElementById('bdHistToDate') ? document.getElementById('bdHistToDate').value : '';
    var priority = document.getElementById('bdHistPriorityFilter') ? document.getElementById('bdHistPriorityFilter').value : '';

    var list = state.data.slice();

    if (machine) list = list.filter(function(item) { return item.Machine === machine; });
    if (dept) list = list.filter(function(item) { return item.Department === dept; });
    if (priority) list = list.filter(function(item) { return item.Priority === priority; });
    if (fromDate) list = list.filter(function(item) {
      var d = item.Date || item.DateTime || '';
      return d && d.substring(0, 10) >= fromDate;
    });
    if (toDate) list = list.filter(function(item) {
      var d = item.Date || item.DateTime || '';
      return d && d.substring(0, 10) <= toDate;
    });

    return list;
  }

  function updateBreakdownStats(filtered) {
    var totalCount = filtered.length;
    var totalDowntime = 0;
    filtered.forEach(function(item) {
      var val = item.Duration || item.BreakdownTime || 0;
      if (typeof val === 'number') totalDowntime += val;
    });

    var el1 = document.getElementById('bdHistTotalBreakdowns');
    if (el1) el1.textContent = totalCount;
    var el2 = document.getElementById('bdHistTotalDowntime');
    if (el2) el2.textContent = displayDuration(totalDowntime);
  }

  function renderBreakdownTable() {
    var list = getFilteredBreakdownData();
    updateBreakdownStats(list);

    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('bdHistTableContainer');
    if (!container) return;

    if (pageData.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Data Found</h3>' +
          '<p>No breakdown records match your filters.</p>' +
        '</div>';
      return;
    }

    var columns = [
      { key: 'JobCardNo', label: 'Job Card' },
      { key: 'Date', label: 'Date', datetime: true },
      { key: 'Machine', label: 'Machine' },
      { key: 'Department', label: 'Department' },
      { key: 'Description', label: 'Description' },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Low': 'success', 'Medium': 'warning', 'High': 'danger', 'Critical': 'danger' } },
      { key: 'Technician', label: 'Technician' },
      { key: 'Duration', label: 'Duration', format: function(val) { return displayDuration(val); } },
      { key: 'Remarks', label: 'Remarks' }
    ];

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        if (col.format) {
          val = col.format(val, row);
        } else if (col.badge && val) {
          var badgeMap = col.badgeMap || {};
          var badgeClass = badgeMap[val] || 'primary';
          val = '<span class="badge badge-' + badgeClass + '">' + Utils.escapeHtml(String(val)) + '</span>';
        } else if (col.datetime && val) {
          val = Utils.formatDateTime(val);
        } else if (typeof val === 'string') {
          val = Utils.escapeHtml(val);
        }
        html += '<td>' + val + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + list.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="BreakdownHistory.goPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var i = 1; i <= totalPages; i++) {
        html += '<button class="' + (i === p ? 'active' : '') + '" onclick="BreakdownHistory.goPage(' + i + ')">' + i + '</button>';
      }
      html += '<button onclick="BreakdownHistory.goPage(' + (p + 1) + ')" ' + (p >= totalPages ? 'disabled' : '') + '>Next</button>';
      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  return {
    show: function() {
      state = { data: [], page: 1 };
      renderPage();
      loadBreakdownData();
    },
    filterBreakdowns: function() {
      state.page = 1;
      renderBreakdownTable();
    },
    goPage: function(p) {
      state.page = p;
      renderBreakdownTable();
    }
  };
})();
