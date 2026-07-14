/* ============================================================
   dashboard.js — Dashboard Page Module
   Standard-021: Cloudflare Pages Frontend
   Demonstrates the pattern for converting GAS HTML pages
   to Cloudflare Pages modules using API.call() instead of
   google.script.run
   ============================================================ */

(function() {
  App.registerPage('dashboard', render, load);

  function render() {
    var el = document.getElementById('page-dashboard');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Dashboard</h2>' +
        '<div class="filter-bar">' +
          '<button class="filter-btn active" onclick="DashboardFilter(this,\'today\')">Today</button>' +
          '<button class="filter-btn" onclick="DashboardFilter(this,\'week\')">This Week</button>' +
          '<button class="filter-btn" onclick="DashboardFilter(this,\'month\')">This Month</button>' +
          '<button class="filter-btn" onclick="DashboardFilter(this,\'all\')">All Time</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-4" style="margin-bottom:24px">' +
        '<div class="card stat-card"><div class="stat-label">Total Jobs</div><div class="stat-value" id="stat-total">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Open</div><div class="stat-value" style="color:var(--info)" id="stat-open">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Running</div><div class="stat-value" style="color:var(--warning)" id="stat-running">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Closed</div><div class="stat-value" style="color:var(--success)" id="stat-closed">-</div></div>' +
      '</div>' +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-header"><h3 class="card-title">Job Status Overview</h3></div><div id="chart-status" style="height:300px"></div></div>' +
        '<div class="card"><div class="card-header"><h3 class="card-title">Priority Distribution</h3></div><div id="chart-priority" style="height:300px"></div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:24px"><div class="card-header"><h3 class="card-title">Recent Job Cards</h3></div><div id="recent-jobs-table" class="table-container"></div></div>';
  }

  function load() {
    loadDashboardData('today');
  }

  function loadDashboardData(filter) {
    App.showLoading(true);
    API.call('getDashboardData', { filter: filter, department: Auth.getDepartment() })
      .then(function(data) {
        App.showLoading(false);
        renderStats(data);
        renderCharts(data);
        renderRecentJobs(data.recentJobs || []);
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load dashboard: ' + err.message, 'error');
      });
  }

  function renderStats(data) {
    var stats = data.totalStatusJobs || {};
    App.setText('stat-total', (stats.Open || 0) + (stats.Running || 0) + (stats.Closed || 0) + (stats.Pending || 0));
    App.setText('stat-open', stats.Open || 0);
    App.setText('stat-running', stats.Running || 0);
    App.setText('stat-closed', stats.Closed || 0);
  }

  function renderCharts(data) {
    renderStatusChart(data.totalStatusJobs || {});
    renderPriorityChart(data.totalPriorityJobs || {});
  }

  function renderStatusChart(statusJobs) {
    var container = document.getElementById('chart-status');
    if (!container) return;
    var labels = Object.keys(statusJobs);
    var values = Object.values(statusJobs);
    var colors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#94a3b8'];
    if (labels.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128202;</div><div class="empty-state-text">No data available</div></div>';
      return;
    }
    var total = values.reduce(function(a, b) { return a + b; }, 0);
    var html = '<div style="display:flex;align-items:center;gap:32px;justify-content:center;height:100%">';
    html += '<div style="position:relative;width:200px;height:200px">';
    var cumulative = 0;
    var segments = [];
    labels.forEach(function(label, i) {
      var pct = total > 0 ? (values[i] / total) * 100 : 0;
      var start = cumulative;
      cumulative += pct;
      segments.push('<div style="position:absolute;width:100%;height:100%;border-radius:50%;border:20px solid ' + colors[i % colors.length] + ';clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,0 100%,0 0%,50% 0%);transform:rotate(' + (start * 3.6) + 'deg)"></div>');
    });
    html += '<div style="position:absolute;inset:30px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;flex-direction:column"><span style="font-size:24px;font-weight:800;color:var(--text)">' + total + '</span><span style="font-size:10px;color:var(--text-muted)">TOTAL</span></div>';
    html += '</div><div>';
    labels.forEach(function(label, i) {
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:12px;height:12px;border-radius:3px;background:' + colors[i % colors.length] + '"></div><span style="font-size:13px;color:var(--text)">' + label + '</span><span style="font-size:13px;color:var(--text-muted);margin-left:auto">' + values[i] + '</span></div>';
    });
    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderPriorityChart(priorityJobs) {
    var container = document.getElementById('chart-priority');
    if (!container) return;
    var labels = Object.keys(priorityJobs);
    var values = Object.values(priorityJobs);
    var colors = { Critical: '#ef4444', High: '#f59e0b', Medium: '#3b82f6', Low: '#22c55e' };
    if (labels.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#127919;</div><div class="empty-state-text">No data available</div></div>';
      return;
    }
    var max = Math.max.apply(null, values) || 1;
    var html = '<div style="display:flex;align-items:flex-end;justify-content:center;gap:20px;height:100%;padding:20px">';
    labels.forEach(function(label) {
      var val = priorityJobs[label] || 0;
      var h = Math.max((val / max) * 200, 4);
      var c = colors[label] || '#6366f1';
      html += '<div style="text-align:center;flex:1;max-width:80px"><div style="font-size:16px;font-weight:700;color:' + c + ';margin-bottom:8px">' + val + '</div><div style="height:' + h + 'px;background:' + c + ';border-radius:8px 8px 0 0;margin:0 auto;width:48px;transition:height 0.5s"></div><div style="font-size:11px;color:var(--text-muted);margin-top:8px">' + label + '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function renderRecentJobs(jobs) {
    var container = document.getElementById('recent-jobs-table');
    if (!container) return;
    if (jobs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128196;</div><div class="empty-state-text">No recent job cards</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Job Card #</th><th>Machine</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead><tbody>';
    jobs.slice(0, 10).forEach(function(jc) {
      var statusClass = 'badge-secondary';
      var s = (jc.CurrentStatus || '').toLowerCase();
      if (s === 'open') statusClass = 'badge-info';
      else if (s === 'running') statusClass = 'badge-warning';
      else if (s === 'closed') statusClass = 'badge-success';
      else if (s === 'pending') statusClass = 'badge-danger';
      var priorityClass = 'badge-secondary';
      var p = (jc.Priority || '').toLowerCase();
      if (p === 'critical') priorityClass = 'badge-danger';
      else if (p === 'high') priorityClass = 'badge-warning';
      else if (p === 'medium') priorityClass = 'badge-info';
      else if (p === 'low') priorityClass = 'badge-success';
      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td><span class="badge ' + priorityClass + '">' + App.escHtml(jc.Priority || '-') + '</span></td>' +
        '<td><span class="badge ' + statusClass + '">' + App.escHtml(jc.CurrentStatus || '-') + '</span></td>' +
        '<td>' + App.timeAgo(jc.CreatedAt || jc.OpenDateTime) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  window.DashboardFilter = function(btn, filter) {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    loadDashboardData(filter);
  };
})();
