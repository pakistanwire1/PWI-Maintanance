/* ============================================================
   reports.js — Reports Page Module
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _reportData = null;

  App.registerPage('reports', render, load);

  function render() {
    var el = document.getElementById('page-reports');
    if (!Auth.canViewReports() && !Auth.isAdmin()) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:12px">' +
        '<div style="font-size:48px">&#128274;</div>' +
        '<h2>Access Denied</h2>' +
        '<p style="color:var(--text-muted)">You do not have permission to view reports.</p></div>';
      return;
    }
    el.innerHTML = '' +
      '<div class="page-header"><h2>Reports</h2></div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="ReportTab(this,\'jobcards\')">Job Cards</button>' +
        '<button class="tab" onclick="ReportTab(this,\'downtime\')">Downtime</button>' +
        '<button class="tab" onclick="ReportTab(this,\'maintenance\')">Maintenance</button>' +
        '<button class="tab" onclick="ReportTab(this,\'inventory\')">Inventory</button>' +
        '<button class="tab" onclick="ReportTab(this,\'technician\')">Technician Performance</button>' +
      '</div>' +
      '<div class="card" style="padding:24px">' +
        '<div class="grid grid-3" style="margin-bottom:16px">' +
          '<div class="form-group"><label class="form-label">From Date</label><input type="date" class="form-input" id="rpt-from"></div>' +
          '<div class="form-group"><label class="form-label">To Date</label><input type="date" class="form-input" id="rpt-to"></div>' +
          '<div class="form-group"><label class="form-label">Department</label>' +
            '<select class="form-select" id="rpt-dept"><option value="">All Departments</option></select></div>' +
        '</div>' +
        '<button class="btn btn-primary" id="rpt-generate">Generate Report</button>' +
      '</div>' +
      '<div id="rpt-result" style="margin-top:16px"></div>';
  }

  function load() {
    App.showLoading(true);
    var now = new Date();
    var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var fromInput = document.getElementById('rpt-from');
    var toInput = document.getElementById('rpt-to');
    if (fromInput) fromInput.value = firstOfMonth.getFullYear() + '-' + String(firstOfMonth.getMonth() + 1).padStart(2, '0') + '-' + String(firstOfMonth.getDate()).padStart(2, '0');
    if (toInput) toInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    API.call('getDepartmentList').then(function(list) {
      var sel = document.getElementById('rpt-dept');
      if (sel && list) {
        list.forEach(function(d) {
          var opt = document.createElement('option');
          opt.value = d.DepartmentName || d.Name || '';
          opt.textContent = d.DepartmentName || d.Name || '';
          sel.appendChild(opt);
        });
      }
      App.showLoading(false);
    }).catch(function() { App.showLoading(false); });

    var genBtn = document.getElementById('rpt-generate');
    if (genBtn) genBtn.onclick = function() { generateReport('jobcards'); };
  }

  var _currentTab = 'jobcards';

  window.ReportTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    _currentTab = tab;
    generateReport(tab);
  };

  function generateReport(type) {
    var resultEl = document.getElementById('rpt-result');
    if (!resultEl) return;
    resultEl.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

    API.call('getReportData', {
      reportType: type,
      filters: {
        fromDate: document.getElementById('rpt-from').value,
        toDate: document.getElementById('rpt-to').value,
        department: document.getElementById('rpt-dept').value
      }
    }).then(function(data) {
      _reportData = data;
      renderReport(type, data, resultEl);
    }).catch(function(err) {
      resultEl.innerHTML = '<div class="card" style="padding:24px;color:var(--danger)">Failed to generate report: ' + App.escHtml(err.message) + '</div>';
    });
  }

  function renderReport(type, data, el) {
    if (!data) {
      el.innerHTML = '<div class="card" style="padding:24px"><div class="empty-state"><div class="empty-state-text">No data for this report</div></div></div>';
      return;
    }

    var html = '<div class="card" style="padding:24px">';

    if (type === 'jobcards') {
      var summary = data.summary || {};
      html += '<h3 style="margin-bottom:16px">Job Cards Summary</h3>';
      html += '<div class="grid grid-4" style="margin-bottom:16px">';
      html += '<div class="card stat-card"><div class="stat-label">Total</div><div class="stat-value">' + (summary.total || 0) + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Open</div><div class="stat-value" style="color:var(--info)">' + (summary.open || 0) + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Closed</div><div class="stat-value" style="color:var(--success)">' + (summary.closed || 0) + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--warning)">' + (summary.pending || 0) + '</div></div>';
      html += '</div>';
      var records = data.records || [];
      if (records.length > 0) {
        html += '<div class="table-container"><table><thead><tr><th>#</th><th>Job Card</th><th>Machine</th><th>Status</th><th>Priority</th><th>Created</th></tr></thead><tbody>';
        records.slice(0, 50).forEach(function(r, i) {
          html += '<tr><td>' + (i + 1) + '</td><td><strong>' + App.escHtml(r.JobCardNo || '') + '</strong></td><td>' + App.escHtml(r.Machine || '') + '</td><td>' + App.escHtml(r.CurrentStatus || '') + '</td><td>' + App.escHtml(r.Priority || '') + '</td><td>' + App.formatDate(r.CreatedAt) + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
    } else if (type === 'downtime') {
      html += '<h3 style="margin-bottom:16px">Downtime Report</h3>';
      var dtRecords = data.records || data.downtime || [];
      if (dtRecords.length > 0) {
        html += '<div class="table-container"><table><thead><tr><th>Job Card</th><th>Machine</th><th>Downtime</th><th>Breakdown Type</th></tr></thead><tbody>';
        dtRecords.forEach(function(r) {
          html += '<tr><td>' + App.escHtml(r.JobCardNo || '') + '</td><td>' + App.escHtml(r.Machine || '') + '</td><td>' + App.escHtml(r.Downtime || '-') + '</td><td>' + App.escHtml(r.BreakdownType || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty-state"><div class="empty-state-text">No downtime data for selected period</div></div>';
      }
    } else if (type === 'maintenance') {
      html += '<h3 style="margin-bottom:16px">Maintenance Report</h3>';
      var pmSummary = data.summary || data.compliance || {};
      html += '<div class="grid grid-3" style="margin-bottom:16px">';
      html += '<div class="card stat-card"><div class="stat-label">Total PMs</div><div class="stat-value">' + (pmSummary.total || 0) + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Completed</div><div class="stat-value" style="color:var(--success)">' + (pmSummary.completed || 0) + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Overdue</div><div class="stat-value" style="color:var(--danger)">' + (pmSummary.overdue || 0) + '</div></div>';
      html += '</div>';
    } else if (type === 'inventory') {
      html += '<h3 style="margin-bottom:16px">Inventory Report</h3>';
      html += '<div class="grid grid-3" style="margin-bottom:16px">';
      html += '<div class="card stat-card"><div class="stat-label">Total Value</div><div class="stat-value">' + App.escHtml(data.totalValue || 'Rs. 0') + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Low Stock</div><div class="stat-value" style="color:var(--warning)">' + (data.lowStockCount || 0) + '</div></div>';
      html += '<div class="card stat-card"><div class="stat-label">Out of Stock</div><div class="stat-value" style="color:var(--danger)">' + (data.outOfStockCount || 0) + '</div></div>';
      html += '</div>';
    } else if (type === 'technician') {
      html += '<h3 style="margin-bottom:16px">Technician Performance</h3>';
      var techData = data.records || data.technicians || [];
      if (techData.length > 0) {
        html += '<div class="table-container"><table><thead><tr><th>Technician</th><th>Assigned</th><th>Completed</th><th>Avg Time</th></tr></thead><tbody>';
        techData.forEach(function(t) {
          html += '<tr><td>' + App.escHtml(t.Name || t.Technician || '') + '</td><td>' + (t.Assigned || 0) + '</td><td>' + (t.Completed || 0) + '</td><td>' + App.escHtml(t.AvgTime || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty-state"><div class="empty-state-text">No technician performance data</div></div>';
      }
    }

    html += '</div>';
    el.innerHTML = html;
  }
})();
