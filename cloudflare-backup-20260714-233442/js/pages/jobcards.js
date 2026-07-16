/* ============================================================
   jobcards.js — Job Cards Page Module
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _jobs = [];
  var _total = 0;
  var _page = 1;
  var _pageSize = 25;
  var _statusFilter = '';
  var _search = '';

  App.registerPage('jobcards', render, load);

  function render() {
    var el = document.getElementById('page-jobcards');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Job Cards</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search job cards..." id="jc-search" oninput="JCSearch(this.value)" style="width:240px">' +
          (Auth.canOpenJobCard() ? '<button class="btn btn-primary" onclick="App.navigateTo(\'openjc\')">+ Open Job Card</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="JCFilterTab(this,\'\')">All</button>' +
        '<button class="tab" onclick="JCFilterTab(this,\'Open\')">Open</button>' +
        '<button class="tab" onclick="JCFilterTab(this,\'Running\')">Running</button>' +
        '<button class="tab" onclick="JCFilterTab(this,\'Closed\')">Closed</button>' +
        '<button class="tab" onclick="JCFilterTab(this,\'Pending\')">Pending</button>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="jc-table"></div><div id="jc-pagination" class="pagination"></div></div>';
  }

  function load() { fetchJobs(); }

  function fetchJobs() {
    App.showLoading(true);
    API.call('getJobCards', { status: _statusFilter, search: _search, page: _page, pageSize: _pageSize })
      .then(function(data) {
        _jobs = data.records || [];
        _total = data.total || 0;
        App.showLoading(false);
        renderTable();
        renderPagination(data.totalPages || 1);
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load job cards: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('jc-table');
    if (!el) return;
    if (_jobs.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128196;</div><div class="empty-state-text">No job cards found</div><p style="margin-top:8px;font-size:12px;color:var(--text-muted)">Total: ' + _total + ' records</p></div>';
      return;
    }
    var html = '<table><thead><tr><th>#</th><th>Job Card No</th><th>Machine</th><th>Complaint</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
    _jobs.forEach(function(jc, idx) {
      var sc = statusBadge(jc.CurrentStatus);
      var pc = priorityBadge(jc.Priority);
      html += '<tr>' +
        '<td style="color:var(--text-muted)">' + ((_page - 1) * _pageSize + idx + 1) + '</td>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escHtml(jc.ComplaintDescription || '') + '</td>' +
        '<td><span class="badge ' + pc + '">' + App.escHtml(jc.Priority || '-') + '</span></td>' +
        '<td><span class="badge ' + sc + '">' + App.escHtml(jc.CurrentStatus || '-') + '</span></td>' +
        '<td>' + App.timeAgo(jc.CreatedAt || jc.OpenDateTime) + '</td>' +
        '<td><button class="btn btn-sm btn-secondary" onclick="JCDetail(\'' + (jc.JobCardNo || '') + '\')">View</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function renderPagination(totalPages) {
    var el = document.getElementById('jc-pagination');
    if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }
    var html = '<button ' + (_page <= 1 ? 'disabled' : '') + ' onclick="JCPage(' + (_page - 1) + ')">Prev</button>';
    for (var i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - _page) > 1) {
        if (i === 4 || i === totalPages - 3) html += '<button disabled>...</button>';
        continue;
      }
      html += '<button class="' + (i === _page ? 'active' : '') + '" onclick="JCPage(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (_page >= totalPages ? 'disabled' : '') + ' onclick="JCPage(' + (_page + 1) + ')">Next</button>';
    el.innerHTML = html;
  }

  function statusBadge(status) {
    var s = (status || '').toLowerCase();
    if (s === 'open') return 'badge-info';
    if (s === 'running') return 'badge-warning';
    if (s === 'closed') return 'badge-success';
    if (s === 'pending') return 'badge-danger';
    return 'badge-secondary';
  }

  function priorityBadge(priority) {
    var p = (priority || '').toLowerCase();
    if (p === 'critical') return 'badge-danger';
    if (p === 'high') return 'badge-warning';
    if (p === 'medium') return 'badge-info';
    if (p === 'low') return 'badge-success';
    return 'badge-secondary';
  }

  window.JCSearch = function(q) { _search = q; _page = 1; fetchJobs(); };

  window.JCFilterTab = function(btn, status) {
    document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    _statusFilter = status;
    _page = 1;
    fetchJobs();
  };

  window.JCPage = function(p) { _page = p; fetchJobs(); };

  window.JCDetail = function(jobCardNo) {
    App.showLoading(true);
    API.call('getJobCard', { id: jobCardNo })
      .then(function(jc) {
        App.showLoading(false);
        showDetailModal(jc);
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load job card: ' + err.message, 'error');
      });
  };

  function showDetailModal(jc) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    var html = '<div class="modal" style="max-width:700px"><div class="modal-header"><h3>Job Card: ' + App.escHtml(jc.JobCardNo || '') + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div><div class="modal-body">';
    var fields = [
      ['Status', jc.CurrentStatus], ['Priority', jc.Priority], ['Machine', jc.Machine],
      ['Department', jc.Department], ['Section', jc.Section], ['Complaint By', jc.ComplaintBy],
      ['Description', jc.ComplaintDescription], ['Created', jc.CreatedAt],
      ['Technician', jc.AssignedTechnician], ['Maintenance Team', jc.MaintenanceTeam],
      ['Root Cause', jc.RootCause], ['Corrective Action', jc.CorrectiveAction],
      ['Breakdown Type', jc.BreakdownType], ['Closed', jc.CloseDateTime]
    ];
    html += '<div class="grid grid-2">';
    fields.forEach(function(f) {
      if (f[1]) {
        html += '<div><div class="form-label">' + f[0] + '</div><div style="font-size:14px">' + App.escHtml(f[1]) + '</div></div>';
      }
    });
    html += '</div></div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }
})();
