var BreakdownHistory = (function() {
  var state = { data: [], page: 1 };
  var masterDataPromise = null;
  var masterDataVersion = -1;
  var bdCascadeSeq = 0;

  var PAGE_SIZE = 10;

  var ICON_BAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>';

  function displayDuration(val) {
    return Duration.format(val);
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="breakdownPage" class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Breakdown History</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<label>Division</label>' +
            '<select class="form-control" id="bdDivision" onchange="BreakdownHistory.onDivisionChange()">' +
              '<option value="">All Divisions</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Section</label>' +
            '<select class="form-control" id="bdSection" onchange="BreakdownHistory.onSectionChange()">' +
              '<option value="">All Sections</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Department</label>' +
            '<select class="form-control" id="bdDepartment" onchange="BreakdownHistory.onDepartmentChange()">' +
              '<option value="">All Departments</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Machine Number</label>' +
            '<select class="form-control" id="bdMachineNumber" onchange="BreakdownHistory.filterBreakdowns()">' +
              '<option value="">All Machines</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>From</label>' +
            '<input type="date" class="form-control" id="bdFrom" onchange="BreakdownHistory.filterBreakdowns()">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>To</label>' +
            '<input type="date" class="form-control" id="bdTo" onchange="BreakdownHistory.filterBreakdowns()">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Priority</label>' +
            '<select class="form-control" id="bdPriority" onchange="BreakdownHistory.filterBreakdowns()">' +
              '<option value="">All</option>' +
              '<option value="Low">Low</option>' +
              '<option value="Medium">Medium</option>' +
              '<option value="High">High</option>' +
              '<option value="Critical">Critical</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="dashboard-grid" id="breakdownStats" style="grid-template-columns:1fr 1fr;margin-bottom:0">' +
          '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon">' + ICON_BAR + '</div><div class="stat-info"><h3 id="bdTotalCount">0</h3><p>Total Breakdowns</p></div></div></div>' +
          '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon">' + ICON_BAR + '</div><div class="stat-info"><h3 id="bdTotalDowntime">0</h3><p>Total Downtime</p></div></div></div>' +
        '</div>' +
        '<div id="breakdownTableContainer"></div>' +
      '</div></div>';
  }

  function loadMasterData() {
    var version = API.masterCacheVersion();
    if (masterDataPromise && masterDataVersion === version) return masterDataPromise;
    masterDataVersion = version;
    masterDataPromise = Promise.all([
      API.post('getMachineCascade', { divisionId: '', sectionId: '', deptId: '' }),
      API.post('getSectionList', {}),
      API.post('getDepartmentList', {}),
      API.post('getMachines', {})
    ]).then(function(results) {
      var casc = results[0] || {};
      var sections = results[1] || [];
      var departments = results[2] || [];
      var machines = results[3] || [];
      var m = {
        divisions: (casc.divisions || []).map(function(d) { return { value: d.id, label: d.name }; }),
        sections: sections.map(function(s) { return { value: s.SectionID, label: s.Section, divisionId: s.DivisionID }; }),
        departments: departments.map(function(d) { return { value: d.DepartmentID, label: d.Department, divisionId: d.DivisionID, sectionId: d.SectionID }; }),
        machines: machines.map(function(mc) {
          var n = mc.MachineNumber || mc.MachineCode || mc.MachineName || '';
          var label = n;
          if (mc.MachineName && mc.MachineName !== label) label += ' \u2014 ' + mc.MachineName;
          return { value: n, label: label, divisionId: mc.DivisionID, sectionId: mc.SectionID, deptId: mc.DeptID };
        }).sort(function(a, b) { return a.value.localeCompare(b.value); })
      };
      return m;
    });
    return masterDataPromise;
  }

  function populateBdSelect(id, items, placeholder) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">' + placeholder + '</option>';
    items.forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label || item.value;
      el.appendChild(opt);
    });
  }

  function repopulateBdSelect(id, items, placeholder, preserveValue) {
    var el = document.getElementById(id);
    if (!el) return;
    var prev = el.value;
    populateBdSelect(id, items, placeholder);
    if (preserveValue && prev) {
      for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === prev) { el.value = prev; break; }
      }
    }
  }

  function applyCascade() {
    var seq = ++bdCascadeSeq;
    return loadMasterData()
      .then(function(m) {
        if (seq !== bdCascadeSeq) return;
        repopulateBdSelect('bdDivision', m.divisions, 'All Divisions', true);
        var div = document.getElementById('bdDivision').value;
        var sec = document.getElementById('bdSection').value;
        var dept = document.getElementById('bdDepartment').value;

        var sections = m.sections;
        if (div) sections = sections.filter(function(s) { return s.divisionId === div; });
        repopulateBdSelect('bdSection', sections, 'All Sections', true);
        sec = document.getElementById('bdSection').value;

        var departments = m.departments;
        if (div) departments = departments.filter(function(d) { return d.divisionId === div; });
        if (sec) departments = departments.filter(function(d) { return d.sectionId === sec; });
        repopulateBdSelect('bdDepartment', departments, 'All Departments', true);
        dept = document.getElementById('bdDepartment').value;

        var machines = m.machines;
        if (div) machines = machines.filter(function(x) { return x.divisionId === div; });
        if (sec) machines = machines.filter(function(x) { return x.sectionId === sec; });
        if (dept) machines = machines.filter(function(x) { return x.deptId === dept; });
        repopulateBdSelect('bdMachineNumber', machines, 'All Machines', true);

        state.page = 1;
        renderBreakdownTable();
      })
      .catch(function() { Notify.error('Failed to load machine filters'); });
  }

  function loadBreakdownData() {
    Loader.show();
    Promise.all([
      API.post('getBreakdownHistory', {}),
      loadMasterData()
    ]).then(function(results) {
      var result = results[0];
      state.data = result.records || result || [];
      Loader.hide();
      applyCascade();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load breakdown history');
    });
  }

  function getFilteredBreakdownData() {
    var division = document.getElementById('bdDivision').value;
    var section = document.getElementById('bdSection').value;
    var dept = document.getElementById('bdDepartment').value;
    var machine = document.getElementById('bdMachineNumber').value;
    var from = document.getElementById('bdFrom').value;
    var to = document.getElementById('bdTo').value;
    var priority = document.getElementById('bdPriority').value;
    return state.data.filter(function(row) {
      if (division && row.DivisionID !== division && row.Division !== division) return false;
      if (section && row.SectionID !== section && row.Section !== section) return false;
      if (dept && row.DepartmentID !== dept && row.Department !== dept) return false;
      if (machine && row.MachineNumber !== machine && row.MachineCode !== machine && row.MachineID !== machine && row.Machine !== machine) return false;
      if (priority && row.Priority !== priority) return false;
      var dateStr = row.OpenDateTime || row.DateCreated || row.Date;
      if (from && dateStr) { var d = new Date(dateStr); if (!isNaN(d.getTime()) && d < new Date(from)) return false; }
      if (to && dateStr) { var d = new Date(dateStr); if (!isNaN(d.getTime()) && d > new Date(to + 'T23:59:59')) return false; }
      return true;
    });
  }

  function updateBreakdownStats(filtered) {
    var totalCount = filtered.length;
    var totalDowntime = 0;
    filtered.forEach(function(item) {
      var val = item.TotalDuration || item.Downtime || 0;
      if (typeof val === 'string') val = parseFloat(val) || 0;
      if (typeof val === 'number') totalDowntime += val;
    });

    var el1 = document.getElementById('bdTotalCount');
    if (el1) el1.textContent = totalCount;
    var el2 = document.getElementById('bdTotalDowntime');
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

    var container = document.getElementById('breakdownTableContainer');
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
      { key: 'OpenDateTime', label: 'Date', datetime: true },
      { key: 'Division', label: 'Division' },
      { key: 'Section', label: 'Section' },
      { key: 'Department', label: 'Department' },
      { key: 'MachineNumber', label: 'Machine No' },
      { key: 'Machine', label: 'Machine' },
      { key: 'ComplaintDescription', label: 'Description' },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Low': 'success', 'Medium': 'warning', 'High': 'danger', 'Critical': 'danger' } },
      { key: 'AssignedTechnician', label: 'Technician' },
      { key: 'Downtime', label: 'Duration', format: function(val) { return displayDuration(val); } },
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
      html += '<span style="margin:0 8px;font-size:13px;color:var(--text-secondary)">Page ' + p + ' of ' + totalPages + '</span>';
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
    onDivisionChange: applyCascade,
    onSectionChange: applyCascade,
    onDepartmentChange: applyCascade,
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
