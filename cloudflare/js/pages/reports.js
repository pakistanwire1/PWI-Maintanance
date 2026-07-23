var Reports = (function() {
  var reportData = [];
  var PAGE_SIZE = 100;
  var __pageStates = {};

  var ICON_EXPORT = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>';
  var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

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
      '<div id="reportsPage" class="page">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Reports</div>' +
          '</div>' +
          '<div class="filter-bar">' +
            '<div class="form-group">' +
              '<label>Report Type</label>' +
              '<select class="form-control" id="rptType" onchange="Reports.onReportTypeChange()">' +
                '<option value="machine_history">Machine History</option>' +
                '<option value="technician_performance">Technician Performance</option>' +
                '<option value="department">Department Report</option>' +
                '<option value="breakdown">Breakdown Report</option>' +
                '<option value="downtime">Downtime Report</option>' +
                '<option value="monthly">Monthly Report</option>' +
                '<option value="pm_compliance">PM Compliance</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group" id="rptMachineGroup" style="display:none">' +
              '<label>Machine</label>' +
              '<select class="form-control" id="rptMachine"><option value="">All Machines</option></select>' +
            '</div>' +
            '<div class="form-group" id="rptTechnicianGroup" style="display:none">' +
              '<label>Technician</label>' +
              '<select class="form-control" id="rptTechnician"><option value="">All Technicians</option></select>' +
            '</div>' +
            '<div class="form-group" id="rptDeptGroup" style="display:none">' +
              '<label>Department</label>' +
              '<select class="form-control" id="rptDepartment"><option value="">All Departments</option></select>' +
            '</div>' +
            '<div class="form-group" id="rptYearGroup" style="display:none">' +
              '<label>Year</label>' +
              '<input type="number" class="form-control" id="rptYear" value="' + new Date().getFullYear() + '">' +
            '</div>' +
            '<div class="form-group">' +
              '<button class="btn btn-primary" onclick="Reports.generate()" style="margin-top:20px">Generate Report</button>' +
              '<button class="btn btn-secondary" onclick="Reports.exportCSV()" style="margin-top:20px">' + ICON_EXPORT + ' Export CSV</button>' +
            '</div>' +
          '</div>' +
          '<div id="reportTableContainer"></div>' +
        '</div>' +
      '</div>';

    loadFilterData();
    generateReport();
  }

  function loadFilterData() {
    API.post('getMachines', {})
      .then(function(m) {
        var sel = document.getElementById('rptMachine');
        if (sel) {
          sel.innerHTML = '<option value="">All Machines</option>';
          (m || []).forEach(function(item) {
            sel.innerHTML += '<option value="' + Utils.escapeHtml(item.MachineID || '') + '">' + Utils.escapeHtml(item.MachineName || '') + '</option>';
          });
        }
      })
      .catch(function() {});

    API.post('getTechnicians', {})
      .then(function(t) {
        var sel = document.getElementById('rptTechnician');
        if (sel) {
          sel.innerHTML = '<option value="">All Technicians</option>';
          (t || []).forEach(function(item) {
            sel.innerHTML += '<option value="' + Utils.escapeHtml(item.EmployeeID || '') + '">' + Utils.escapeHtml(item.TechnicianName || item.Name || '') + '</option>';
          });
        }
      })
      .catch(function() {});

    API.post('getDepartments', {})
      .then(function(d) {
        var list = (d || []).map(function(x) { return x.Name || x.Department; }).filter(function(n) { return n; });
        var sel = document.getElementById('rptDepartment');
        if (sel) {
          sel.innerHTML = '<option value="">All Departments</option>';
          list.forEach(function(name) {
            sel.innerHTML += '<option value="' + Utils.escapeHtml(name) + '">' + Utils.escapeHtml(name) + '</option>';
          });
        }
      })
      .catch(function() {});
  }

  function onReportTypeChange() {
    var type = document.getElementById('rptType').value;
    var mg = document.getElementById('rptMachineGroup'); if (mg) mg.style.display = (type === 'machine_history' || type === 'downtime') ? 'block' : 'none';
    var tg = document.getElementById('rptTechnicianGroup'); if (tg) tg.style.display = type === 'technician_performance' ? 'block' : 'none';
    var dg = document.getElementById('rptDeptGroup'); if (dg) dg.style.display = type === 'department' ? 'block' : 'none';
    var yg = document.getElementById('rptYearGroup'); if (yg) yg.style.display = type === 'monthly' ? 'block' : 'none';
  }

  function generateReport() {
    var type = document.getElementById('rptType').value;
    var filters = {
      machine: (document.getElementById('rptMachine') || {}).value || '',
      technician: (document.getElementById('rptTechnician') || {}).value || '',
      department: (document.getElementById('rptDeptGroup') && document.getElementById('rptDeptGroup').style.display !== 'none' ? document.getElementById('rptDepartment') : {}).value || '',
      year: (document.getElementById('rptYear') || {}).value || ''
    };
    Loader.show();
    API.post('getReportData', { reportType: type, filters: filters })
      .then(function(data) {
        reportData = data || [];
        Loader.hide();
        renderReportTable(type, reportData);
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to generate report');
      });
  }

  function renderReportTable(type, data) {
    var columnMap = {
      machine_history: [
        { key: 'JobCardNo', label: 'Job Card' }, { key: 'Date', label: 'Date', datetime: true },
        { key: 'Machine', label: 'Machine' }, { key: 'Complaint', label: 'Complaint' },
        { key: 'Technician', label: 'Technician' }, { key: 'Status', label: 'Status', badge: true,
          badgeMap: { 'Open': 'open', 'In Progress': 'running', 'Running': 'running', 'Completed': 'closed', 'Closed': 'closed' } },
        { key: 'Priority', label: 'Priority' }, { key: 'Downtime', label: 'Duration', format: function(val) { return displayDuration(val); } }
      ],
      technician_performance: [
        { key: 'technician', label: 'Technician' }, { key: 'totalJobs', label: 'Total Jobs' },
        { key: 'completed', label: 'Completed' }, { key: 'totalDowntime', label: 'Total Downtime', format: function(val) { return displayDuration(val); } }
      ],
      department: [
        { key: 'department', label: 'Department' }, { key: 'totalJobs', label: 'Total Jobs' },
        { key: 'openJobs', label: 'Open' }, { key: 'closedJobs', label: 'Closed' },
        { key: 'totalDowntime', label: 'Downtime', format: function(val) { return displayDuration(val); } }
      ],
      breakdown: [
        { key: 'JobCardNo', label: 'Job Card' }, { key: 'Date', label: 'Date', datetime: true },
        { key: 'Machine', label: 'Machine' }, { key: 'Department', label: 'Dept' },
        { key: 'ComplaintDescription', label: 'Description' }, { key: 'Priority', label: 'Priority' },
        { key: 'AssignedTechnician', label: 'Technician' }, { key: 'Downtime', label: 'Duration', format: function(val) { return displayDuration(val); } }
      ],
      downtime: [
        { key: 'JobCardNo', label: 'Job Card' }, { key: 'Date', label: 'Date', datetime: true },
        { key: 'Machine', label: 'Machine' }, { key: 'Department', label: 'Dept' },
        { key: 'Downtime', label: 'Duration', format: function(val) { return displayDuration(val); } }, { key: 'Priority', label: 'Priority' },
        { key: 'Technician', label: 'Technician' }
      ],
      monthly: [
        { key: 'month', label: 'Month' }, { key: 'total', label: 'Total Jobs' },
        { key: 'closed', label: 'Closed' }, { key: 'downtime', label: 'Downtime', format: function(val) { return displayDuration(val); } }
      ],
      pm_compliance: [
        { key: 'PMNumber', label: 'PM No' }, { key: 'Machine', label: 'Machine' },
        { key: 'Frequency', label: 'Frequency' }, { key: 'NextDueDate', label: 'Next Due' },
        { key: 'LastDone', label: 'Last Done' }, { key: 'Status', label: 'Status', badge: true },
        { key: 'Compliant', label: 'Compliant', badge: true, badgeMap: { 'Yes': 'success', 'No': 'danger' } }
      ]
    };

    var columns = columnMap[type] || [];
    renderTableLocal(data, columns, null, 1, PAGE_SIZE, 'reportTableContainer');
  }

  function exportCSV() {
    if (!reportData || reportData.length === 0) { Notify.error('No data to export'); return; }
    var headers = Object.keys(reportData[0]);
    var csv = headers.join(',') + '\n';
    reportData.forEach(function(row) {
      csv += headers.map(function(h) {
        var val = String(row[h] || '').replace(/"/g, '""');
        return '"' + val + '"';
      }).join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (document.getElementById('rptType').value || 'report') + '_report.csv';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('Export completed');
  }

  function renderTableLocal(data, columns, actions, page, pageSize, containerId) {
    containerId = containerId || 'tableContainer';
    var container = document.getElementById(containerId);
    if (!container) return;
    page = page || 1;
    pageSize = pageSize || PAGE_SIZE;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Data Found</h3>' +
          '<p>No records available for this report.</p>' +
        '</div>';
      return;
    }

    var totalPages = Math.ceil(data.length / pageSize);
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, data.length);
    var pageData = data.slice(start, end);

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col) + '</th>';
    });
    if (actions) html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var key = col.key || col;
        var val = row[key] !== undefined && row[key] !== null ? row[key] : '';

        if (col.badge) {
          var badgeClass = 'badge badge-primary';
          if (col.badgeMap) {
            var mapKey = val;
            if (!(mapKey in col.badgeMap)) {
              mapKey = Object.keys(col.badgeMap).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
            }
            badgeClass = 'badge badge-' + (col.badgeMap[mapKey] || 'primary');
          }
          val = '<span class="' + badgeClass + '">' + Utils.escapeHtml(String(val)) + '</span>';
        }

        if (col.format) val = col.format(val, row);

        if (col.datetime) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) {
            var day = String(d.getDate()).padStart(2, '0');
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var month = months[d.getMonth()];
            var year = d.getFullYear();
            var hours = d.getHours();
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            var mins = String(d.getMinutes()).padStart(2, '0');
            val = day + ' ' + month + ' ' + year + ' | ' + String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm;
          }
        }

        if (typeof val === 'string' && !col.badge && !col.format && !col.datetime) {
          val = Utils.escapeHtml(val);
        }

        html += '<td>' + val + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="Reports.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="Reports.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="Reports.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  return {
    show: renderPage,
    onReportTypeChange: onReportTypeChange,
    generate: generateReport,
    exportCSV: exportCSV,
    changePage: changePage
  };
})();
