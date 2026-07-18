/* ============================================================
   jobcards.js — Job Cards Page Module (GAS-identical)
   ============================================================ */

(function() {
  var _jobs = [];
  var _filtered = [];
  var _activeTab = 'open';
  var _page = 1;
  var _pageSize = 25;
  var _searchQuery = '';

  App.registerPage('jobcards', render, load);

  function render() {
    var el = document.getElementById('page-jobcards');
    if (!el) return;
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Job Cards</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="jcSearch" placeholder="Search job cards..." oninput="JC.searchTable(this.value)">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="workflow-tabs" id="jcWorkflowTabs">' +
          '<button class="workflow-tab active" data-tab="open" onclick="JC.switchTab(\'open\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>' +
            '<span class="tab-label">Open</span>' +
            '<span class="tab-badge" id="openCount" data-status="open">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="running" onclick="JC.switchTab(\'running\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg></span>' +
            '<span class="tab-label">Running</span>' +
            '<span class="tab-badge" id="runningCount" data-status="running">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="closed" onclick="JC.switchTab(\'closed\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '<span class="tab-label">Closed</span>' +
            '<span class="tab-badge" id="closedCount" data-status="closed">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="pendingapproval" onclick="JC.switchTab(\'pendingapproval\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>' +
            '<span class="tab-label">Pending</span>' +
            '<span class="tab-badge" id="pendingApprovalCount" data-status="pending">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="approved" onclick="JC.switchTab(\'approved\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '<span class="tab-label">Approved</span>' +
            '<span class="tab-badge" id="approvedCount" data-status="approved">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="all" onclick="JC.switchTab(\'all\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>' +
            '<span class="tab-label">All</span>' +
            '<span class="tab-badge" id="allCount" data-status="all">0</span>' +
          '</button>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<select class="form-control" id="jcPriorityFilter" onchange="JC.filter()">' +
              '<option value="">All Priority</option>' +
              '<option value="Low">Low</option>' +
              '<option value="Medium">Medium</option>' +
              '<option value="High">High</option>' +
              '<option value="Critical">Critical</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="jcDeptFilter" onchange="JC.filter()">' +
              '<option value="">All Departments</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="jcTableContainer"></div>' +
      '</div>' +
      '<div class="modal-overlay" id="jcViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Job Card — <span id="jcViewRef"></span></div>' +
            '<button class="modal-close" onclick="JC.hideModal(\'jcViewModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body" id="jcViewBody"></div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="JC.hideModal(\'jcViewModal\')">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="jcImageModal" style="display:none">' +
        '<div class="modal" style="max-width:90vw;max-height:90vh;background:transparent;border:none;box-shadow:none;backdrop-filter:none">' +
          '<div style="text-align:right;margin-bottom:8px">' +
            '<button class="modal-close" onclick="JC.hideModal(\'jcImageModal\')" style="background:rgba(0,0,0,0.5);color:#fff;border-radius:50%;width:36px;height:36px;font-size:22px;display:inline-flex;align-items:center;justify-content:center">&times;</button>' +
          '</div>' +
          '<img id="jcFullImage" src="" alt="Full size image" style="max-width:100%;max-height:80vh;border-radius:12px;display:block;margin:0 auto;box-shadow:0 8px 40px rgba(0,0,0,0.6)">' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCards', {})
      .then(function(data) {
        _jobs = data.records || data || [];
        App.showLoading(false);
        populateDeptFilter();
        renderTabs();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load job cards: ' + err.message, 'error');
      });
  }

  function populateDeptFilter() {
    var deptFilter = document.getElementById('jcDeptFilter');
    if (!deptFilter) return;
    deptFilter.innerHTML = '<option value="">All Departments</option>';
    var depts = [];
    _jobs.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
    });
    depts.sort().forEach(function(d) {
      deptFilter.innerHTML += '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>';
    });
  }

  function getDisplayStatus(item) {
    if (item.ApprovalStatus === 'Approved') return 'Approved';
    return item.CurrentStatus || item.Status || '';
  }

  function getStatusBadgeClass(status) {
    var s = (status || '').toLowerCase();
    if (s === 'open') return 'open';
    if (s === 'running' || s === 'in progress') return 'running';
    if (s === 'closed' || s === 'completed') return 'closed';
    if (s === 'pending') return 'pending';
    if (s === 'approved') return 'approved';
    return 'open';
  }

  function renderTabs() {
    var open = 0, running = 0, closed = 0, pending = 0, approved = 0;
    _jobs.forEach(function(jc) {
      var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (as === 'approved') { approved++; }
      else if (s === 'open') { open++; }
      else if (s === 'running' || s === 'in progress') { running++; }
      else if (s === 'pending') { pending++; }
      else if (s === 'closed' || s === 'completed') { closed++; }
    });
    setBadge('openCount', open);
    setBadge('runningCount', running);
    setBadge('closedCount', closed);
    setBadge('pendingApprovalCount', pending);
    setBadge('approvedCount', approved);
    setBadge('allCount', _jobs.length);
    renderTable();
  }

  function setBadge(id, count) {
    var el = document.getElementById(id);
    if (el) el.textContent = count;
  }

  function renderTable() {
    _filtered = [];
    _jobs.forEach(function(jc) {
      var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (_activeTab === 'open' && s === 'open') _filtered.push(jc);
      else if (_activeTab === 'running' && (s === 'running' || s === 'in progress')) _filtered.push(jc);
      else if (_activeTab === 'closed' && (s === 'closed' || s === 'completed')) _filtered.push(jc);
      else if (_activeTab === 'pendingapproval' && s === 'pending') _filtered.push(jc);
      else if (_activeTab === 'approved' && as === 'approved') _filtered.push(jc);
      else if (_activeTab === 'all') _filtered.push(jc);
    });

    var pf = document.getElementById('jcPriorityFilter');
    var df = document.getElementById('jcDeptFilter');
    var pVal = pf ? pf.value : '';
    var dVal = df ? df.value : '';
    if (pVal) _filtered = _filtered.filter(function(jc) { return jc.Priority === pVal; });
    if (dVal) _filtered = _filtered.filter(function(jc) { return jc.Department === dVal; });
    if (_searchQuery) {
      _filtered = _filtered.filter(function(jc) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(_searchQuery) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(_searchQuery) !== -1) ||
               (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(_searchQuery) !== -1) ||
               (jc.ComplaintDescription && jc.ComplaintDescription.toLowerCase().indexOf(_searchQuery) !== -1);
      });
    }

    var columns = [
      { key: 'JobCardNo', label: 'Job Card No' },
      { key: 'DateTime', label: 'Opened', datetime: true },
      { key: 'Machine', label: 'Machine' },
      { key: 'Department', label: 'Dept' },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Low': 'success', 'Medium': 'warning', 'High': 'danger', 'Critical': 'danger' } }
    ];

    if (_activeTab === 'open') {
      columns.push({ key: 'DateTime', label: 'Waiting', format: function(val, row) {
        var dt = row.DateTime || row.OpenTime || row.OpenDateTime;
        return '<span class="live-timer" data-start="' + dt + '">' + displayDuration(dt ? (Date.now() - new Date(dt).getTime()) / 60000 : 0) + '</span>';
      }});
      columns.push({ key: 'ComplaintDescription', label: 'Description' });
    } else if (_activeTab === 'running') {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ key: 'StartTime', label: 'Working', format: function(val, row) {
        var st = row.StartTime || row.StartDateTime;
        return '<span class="live-timer" data-start="' + st + '">' + displayDuration(st ? (Date.now() - new Date(st).getTime()) / 60000 : 0) + '</span>';
      }});
    } else if (_activeTab === 'closed' || _activeTab === 'pendingapproval') {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ key: 'WaitingTime', label: 'Waiting', format: function(val) { return displayDuration(val); } });
      columns.push({ key: 'WorkingTime', label: 'Working', format: function(val) { return displayDuration(val); } });
      columns.push({ key: 'BreakdownTime', label: 'Breakdown', format: function(val) { return displayDuration(val); } });
    } else if (_activeTab === 'approved') {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ key: 'ApprovedBy', label: 'Approved By' });
      columns.push({ key: 'ApprovedDateTime', label: 'Approved', datetime: true });
      columns.push({ key: 'ApprovalStatus', label: 'Status', badge: true, badgeMap: { 'Approved': 'success' } });
    } else {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ label: 'Status', format: function(val, row) {
        var ds = getDisplayStatus(row);
        var badgeCls = getStatusBadgeClass(ds);
        return '<span class="badge badge-' + badgeCls + '">' + escapeHtml(ds) + '</span>';
      }});
    }

    columns.push({ key: 'FaultImage', label: 'Fault', format: function(val) {
      return val ? '<img src="' + val + '" class="img-thumb" onclick="JC.openImage(\'' + escapeHtml(val) + '\')" title="View Fault Image">' : '—';
    }});

    var actions = [
      { label: 'View', icon: 'view', color: 'primary', onclick: "JC.viewDetail('{id}')", idField: 'JobCardNo' }
    ];

    var containerEl = document.getElementById('jcTableContainer');
    if (!containerEl) return;
    var totalPages = Math.ceil(_filtered.length / _pageSize) || 1;
    if (_page > totalPages) _page = totalPages;

    if (_filtered.length === 0) {
      containerEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128196;</div><div class="empty-state-text">No job cards found</div></div>';
      return;
    }

    var html = '<table><thead><tr><th>#</th>';
    columns.forEach(function(c) { html += '<th>' + c.label + '</th>'; });
    html += '<th>Actions</th></tr></thead><tbody>';

    var start = (_page - 1) * _pageSize;
    var end = Math.min(start + _pageSize, _filtered.length);
    for (var i = start; i < end; i++) {
      var jc = _filtered[i];
      html += '<tr><td style="color:var(--text-muted)">' + (i + 1) + '</td>';
      columns.forEach(function(c) {
        var val = jc[c.key];
        if (c.format) {
          html += '<td>' + c.format(val, jc) + '</td>';
        } else if (c.badge && val) {
          var bc = c.badgeMap && c.badgeMap[val] ? c.badgeMap[val] : 'secondary';
          html += '<td><span class="badge badge-' + bc + '">' + escapeHtml(val) + '</span></td>';
        } else if (c.datetime && val) {
          html += '<td>' + formatDateTime(val) + '</td>';
        } else {
          html += '<td>' + escapeHtml(val || '-') + '</td>';
        }
      });
      html += '<td><button class="btn btn-sm btn-secondary" onclick="JC.viewDetail(\'' + escapeHtml(jc.JobCardNo) + '\')">View</button></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';

    if (totalPages > 1) {
      html += '<div class="pagination">';
      html += '<button ' + (_page <= 1 ? 'disabled' : '') + ' onclick="JC.page(' + (_page - 1) + ')">Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        if (totalPages > 7 && p > 3 && p < totalPages - 2 && Math.abs(p - _page) > 1) {
          if (p === 4 || p === totalPages - 3) html += '<button disabled>...</button>';
          continue;
        }
        html += '<button class="' + (p === _page ? 'active' : '') + '" onclick="JC.page(' + p + ')">' + p + '</button>';
      }
      html += '<button ' + (_page >= totalPages ? 'disabled' : '') + ' onclick="JC.page(' + (_page + 1) + ')">Next</button>';
      html += '</div>';
    }

    containerEl.innerHTML = html;
  }

  function viewDetail(id) {
    var item = _jobs.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;
    var el = document.getElementById('jcViewRef');
    if (el) el.textContent = id;
    var displayStatus = getDisplayStatus(item);
    var displayBadge = getStatusBadgeClass(displayStatus);
    var pBadge = item.Priority === 'Critical' || item.Priority === 'High' ? 'danger' :
                 item.Priority === 'Medium' ? 'warning' : 'success';
    var waitingHrs = displayDuration(item.WaitingTime);
    var workingHrs = displayDuration(item.WorkingTime);
    var downtimeHrs = displayDuration(item.BreakdownTime);

    var faultThumb = item.FaultImage ? '<img src="' + item.FaultImage + '" class="img-thumb" onclick="JC.openImage(\'' + escapeHtml(item.FaultImage) + '\')" style="width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer">' : '—';
    var repairThumb = item.RepairImage ? '<img src="' + item.RepairImage + '" class="img-thumb" onclick="JC.openImage(\'' + escapeHtml(item.RepairImage) + '\')" style="width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer">' : '—';

    var html =
      '<div class="view-grid">' +
        '<div class="view-section">' +
          '<h4>Job Card Details</h4>' +
          '<div class="view-row"><span>Job Card No</span><strong>' + escapeHtml(item.JobCardNo) + '</strong></div>' +
          '<div class="view-row"><span>Opened</span><strong>' + formatDateTime(item.DateTime || item.OpenTime || item.OpenDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Machine</span><strong>' + escapeHtml(item.Machine || '-') + '</strong></div>' +
          '<div class="view-row"><span>Asset</span><strong>' + escapeHtml(item.Asset || item.AssetID || '-') + '</strong></div>' +
          '<div class="view-row"><span>Department</span><strong>' + escapeHtml(item.Department || '-') + '</strong></div>' +
          '<div class="view-row"><span>Priority</span><strong><span class="badge badge-' + pBadge + '">' + escapeHtml(item.Priority) + '</span></strong></div>' +
          '<div class="view-row"><span>Complaint By</span><strong>' + escapeHtml(item.ComplaintBy || '-') + '</strong></div>' +
          '<div class="view-row"><span>Description</span><strong>' + escapeHtml(item.ComplaintDescription || '-') + '</strong></div>' +
          '<div class="view-row"><span>Fault Image</span><strong>' + faultThumb + '</strong></div>' +
        '</div>';

    if (item.StartTime || item.StartDateTime) {
      html +=
        '<div class="view-section">' +
          '<h4>Work Execution</h4>' +
          '<div class="view-row"><span>Started</span><strong>' + formatDateTime(item.StartTime || item.StartDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Assigned Technician</span><strong>' + escapeHtml(item.AssignedTechnician || '-') + '</strong></div>' +
          '<div class="view-row"><span>Waiting Time</span><strong>' + waitingHrs + '</strong></div>' +
        '</div>';
    }
    if (item.CloseTime || item.CloseDateTime) {
      html +=
        '<div class="view-section">' +
          '<h4>Completion</h4>' +
          '<div class="view-row"><span>Closed</span><strong>' + formatDateTime(item.CloseTime || item.CloseDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Working Time</span><strong>' + workingHrs + '</strong></div>' +
          '<div class="view-row"><span>Total Breakdown</span><strong>' + downtimeHrs + '</strong></div>' +
          '<div class="view-row"><span>Root Cause</span><strong>' + escapeHtml(item.RootCause || '-') + '</strong></div>' +
          '<div class="view-row"><span>Corrective Action</span><strong>' + escapeHtml(item.CorrectiveAction || '-') + '</strong></div>' +
          '<div class="view-row"><span>Spare Parts</span><strong>' + escapeHtml(item.SpareParts || '-') + '</strong></div>' +
          '<div class="view-row"><span>Repair Image</span><strong>' + repairThumb + '</strong></div>' +
        '</div>';
    }
    if (item.ApprovalStatus) {
      var appBadge = item.ApprovalStatus === 'Approved' ? 'success' :
                     item.ApprovalStatus === 'Returned' ? 'warning' : 'info';
      var appLabel = item.ApprovalStatus === 'Returned' ? 'Returned By' : 'Approved By';
      var appDateField = item.ApprovalStatus === 'Returned' ? item.ReturnedDateTime : item.ApprovedDateTime;
      var appRemark = item.ApprovalStatus === 'Returned' ? (item.ReturnReason || item.ApprovalRemarks || '-') : (item.ApprovalRemarks || '-');
      html +=
        '<div class="view-section">' +
          '<h4>Approval</h4>' +
          '<div class="view-row"><span>' + appLabel + '</span><strong>' + escapeHtml(item.ApprovedBy || item.ReturnedBy || '-') + '</strong></div>' +
          '<div class="view-row"><span>Date</span><strong>' + formatDateTime(appDateField) + '</strong></div>' +
          '<div class="view-row"><span>Status</span><strong><span class="badge badge-' + appBadge + '">' + escapeHtml(item.ApprovalStatus) + '</span></strong></div>' +
          '<div class="view-row"><span>Remarks</span><strong>' + escapeHtml(appRemark) + '</strong></div>' +
        '</div>';
    }
    if (!item.StartDateTime && !item.StartTime) {
      html += '<div class="view-section"><h4>Status</h4><div class="view-row"><span>This job card is <strong>OPEN</strong> and waiting to be started.</span></div></div>';
    }
    html +=
      '</div>' +
      '<div class="view-status-bar"><span class="badge badge-' + displayBadge + '" style="font-size:13px;padding:5px 14px">Status: ' + escapeHtml(displayStatus) + '</span></div>';

    var body = document.getElementById('jcViewBody');
    if (body) body.innerHTML = html;
    showJcModal('jcViewModal');
  }

  function showJcModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; }
  }

  window.JC = {
    switchTab: function(tab) {
      _activeTab = tab;
      _page = 1;
      var tabs = document.querySelectorAll('.workflow-tab');
      tabs.forEach(function(t) {
        if (t) t.classList.toggle('active', t.getAttribute('data-tab') === tab);
      });
      renderTable();
    },
    filter: function() { _page = 1; renderTable(); },
    page: function(p) { _page = p; renderTable(); },
    searchTable: function(q) {
      _searchQuery = q ? q.toLowerCase() : '';
      _page = 1;
      renderTable();
    },
    viewDetail: viewDetail,
    openImage: function(url) {
      if (!url) return;
      var el = document.getElementById('jcFullImage');
      if (el) el.src = url;
      showJcModal('jcImageModal');
    },
    hideModal: function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
  };
})();
