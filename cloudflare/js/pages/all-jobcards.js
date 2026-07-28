var AllJobCards = (function() {
  var state = { data: [], page: 1, activeTab: 'open', timer: null };
  var PAGE_SIZE = 10;

  function formatDuration(ms) {
    return Duration.fromMs(ms);
  }

  function formatDurationFromDates(startStr, endStr) {
    return Duration.fromDates(startStr, endStr);
  }

  function displayDuration(val) {
    return Duration.format(val);
  }

  function getDisplayStatus(item) {
    if (item.ApprovalStatus === 'Approved') return 'Approved';
    return item.CurrentStatus || '';
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

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="allJobcardsPage" class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Job Cards</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="jcSearch" placeholder="Search job cards..." onkeyup="AllJobCards.searchJobCardsTable()">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="workflow-tabs" id="allJcTabs">' +
          '<button class="workflow-tab active" data-tab="open" onclick="AllJobCards.switchTab(\'open\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>' +
            '<span class="tab-label">Open</span>' +
            '<span class="tab-badge" id="openCount" data-status="open">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="running" onclick="AllJobCards.switchTab(\'running\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg></span>' +
            '<span class="tab-label">Running</span>' +
            '<span class="tab-badge" id="runningCount" data-status="running">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="closed" onclick="AllJobCards.switchTab(\'closed\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '<span class="tab-label">Closed</span>' +
            '<span class="tab-badge" id="closedCount" data-status="closed">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="pendingapproval" onclick="AllJobCards.switchTab(\'pendingapproval\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>' +
            '<span class="tab-label">Pending</span>' +
            '<span class="tab-badge" id="pendingApprovalCount" data-status="pending">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="approved" onclick="AllJobCards.switchTab(\'approved\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '<span class="tab-label">Approved</span>' +
            '<span class="tab-badge" id="approvedCount" data-status="approved">0</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="all" onclick="AllJobCards.switchTab(\'all\')">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>' +
            '<span class="tab-label">All</span>' +
            '<span class="tab-badge" id="allCount" data-status="all">0</span>' +
          '</button>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<select class="form-control" id="jcPriorityFilter" onchange="AllJobCards.filterJobCards()">' +
              '<option value="">All Priority</option>' +
              '<option value="Low">Low</option>' +
              '<option value="Medium">Medium</option>' +
              '<option value="High">High</option>' +
              '<option value="Critical">Critical</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="jcDeptFilter" onchange="AllJobCards.filterJobCards()">' +
              '<option value="">All Departments</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="jcTableContainer"></div>' +
      '</div></div>' +

      '<div class="modal-overlay" id="jcViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Job Card \u2014 <span id="jcViewRef"></span></div>' +
            '<button class="modal-close" onclick="AllJobCards.hideModal(\'jcViewModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body" id="jcViewBody"></div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="AllJobCards.hideModal(\'jcViewModal\')">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="jcImageModal" style="display:none">' +
        '<div class="modal" style="max-width:90vw;max-height:90vh;background:transparent;border:none;box-shadow:none;backdrop-filter:none">' +
          '<div style="text-align:right;margin-bottom:8px">' +
            '<button class="modal-close" onclick="AllJobCards.hideModal(\'jcImageModal\')" style="background:rgba(0,0,0,0.5);color:#fff;border-radius:50%;width:36px;height:36px;font-size:22px;display:inline-flex;align-items:center;justify-content:center">&times;</button>' +
          '</div>' +
          '<img id="jcFullImage" src="" alt="Full size image" style="max-width:100%;max-height:80vh;border-radius:12px;display:block;margin:0 auto;box-shadow:0 8px 40px rgba(0,0,0,0.6)">' +
        '</div>' +
      '</div>';
  }

  function loadData() {
    Loader.show();
    API.post('getJobCards', {}).then(function(data) {
      var records = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
      state.data = records;
      Loader.hide();
      populateJcSelects();
      renderJcTabs();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load job cards');
    });
  }

  function populateJcSelects() {
    var deptFilter = document.getElementById('jcDeptFilter');
    if (deptFilter) deptFilter.innerHTML = '<option value="">All Departments</option>';
    var depts = [];
    state.data.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
    });
    depts.sort().forEach(function(d) {
      if (deptFilter) deptFilter.innerHTML += '<option value="' + Utils.escapeHtml(d) + '">' + Utils.escapeHtml(d) + '</option>';
    });
  }

  function updateTabBadge(id, count) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
  }

  function renderJcTabs() {
    var open = 0, running = 0, closed = 0, pending = 0, approved = 0;
    state.data.forEach(function(jc) {
      var s = (jc.CurrentStatus || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (as === 'approved') { approved++; }
      else if (s === 'open') { open++; }
      else if (s === 'running' || s === 'in progress') { running++; }
      else if (s === 'pending') { pending++; }
      else if (s === 'closed' || s === 'completed') { closed++; }
      else if (s === 'approved') { approved++; }
    });
    updateTabBadge('openCount', open);
    updateTabBadge('runningCount', running);
    updateTabBadge('closedCount', closed);
    updateTabBadge('pendingApprovalCount', pending);
    updateTabBadge('approvedCount', approved);
    updateTabBadge('allCount', state.data.length);
    renderJcTable();
  }

  function renderJcTable() {
    var list = [];
    state.data.forEach(function(jc) {
      var s = (jc.CurrentStatus || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (state.activeTab === 'open' && s === 'open') list.push(jc);
      else if (state.activeTab === 'running' && (s === 'running' || s === 'in progress')) list.push(jc);
      else if (state.activeTab === 'closed' && (s === 'closed' || s === 'completed')) list.push(jc);
      else if (state.activeTab === 'pendingapproval' && s === 'pending') list.push(jc);
      else if (state.activeTab === 'approved' && as === 'approved') list.push(jc);
      else if (state.activeTab === 'all') list.push(jc);
    });

    var priorityFilter = document.getElementById('jcPriorityFilter') ? document.getElementById('jcPriorityFilter').value : '';
    var deptFilter = document.getElementById('jcDeptFilter') ? document.getElementById('jcDeptFilter').value : '';
    if (priorityFilter) list = list.filter(function(jc) { return jc.Priority === priorityFilter; });
    if (deptFilter) list = list.filter(function(jc) { return jc.Department === deptFilter; });

    var columns = [
      { key: 'JobCardNo', label: 'Job Card No' },
      { key: 'OpenDateTime', label: 'Opened', datetime: true },
      { key: 'Machine', label: 'Machine' },
      { key: 'Department', label: 'Dept' },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Low': 'success', 'Medium': 'warning', 'High': 'danger', 'Critical': 'danger' } }
    ];

    if (state.activeTab === 'open' || state.activeTab === 'waiting') {
      columns.push({ key: 'OpenDateTime', label: 'Waiting', format: function(val, row) {
        var dt = row.OpenDateTime;
        return Duration.cellFromDates(dt);
      }});
      columns.push({ key: 'ComplaintDescription', label: 'Description' });
    } else if (state.activeTab === 'running') {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ key: 'StartDateTime', label: 'Working', format: function(val, row) {
        var st = row.StartDateTime;
        return Duration.cellFromDates(st);
      }});
    } else if (state.activeTab === 'closed' || state.activeTab === 'pendingapproval') {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ key: 'WaitingTime', label: 'Waiting', format: function(val) { return Duration.cell(val); } });
      columns.push({ key: 'WorkingTime', label: 'Working', format: function(val) { return Duration.cell(val); } });
      columns.push({ key: 'Downtime', label: 'Breakdown', format: function(val, row) { return Duration.cell(row.Downtime || row.TotalDuration || 0); } });
    } else if (state.activeTab === 'approved') {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ key: 'ApprovedBy', label: 'Approved By' });
      columns.push({ key: 'ApprovedDateTime', label: 'Approved', datetime: true });
      columns.push({ key: 'ApprovalStatus', label: 'Status', badge: true, badgeMap: { 'Approved': 'approved' } });
    } else {
      columns.push({ key: 'AssignedTechnician', label: 'Technician' });
      columns.push({ label: 'Status', format: function(val, row) {
        var ds = getDisplayStatus(row);
        var badgeCls = getStatusBadgeClass(ds);
        return '<span class="badge badge-' + badgeCls + '">' + Utils.escapeHtml(ds) + '</span>';
      }});
    }

    columns.push({ key: 'FaultImage', label: 'Fault', format: function(val) {
      return val ? '<img src="' + val + '" class="img-thumb" onclick="AllJobCards.openFullImage(\'' + val + '\')" title="View Fault Image">' : '\u2014';
    }});

    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('jcTableContainer');
    if (!container) return;

    if (pageData.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Data Found</h3>' +
          '<p>No records available in this module.</p>' +
        '</div>';
      return;
    }

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    html += '<th style="width:80px">Actions</th>';
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
      html += '<td><div class="actions-cell">';
      html += '<button class="icon-btn icon-btn-primary" onclick="AllJobCards.viewJcDetail(\'' + row.JobCardNo + '\')" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
      html += '</div></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + list.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="AllJobCards.goPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var i = 1; i <= totalPages; i++) {
        html += '<button class="' + (i === p ? 'active' : '') + '" onclick="AllJobCards.goPage(' + i + ')">' + i + '</button>';
      }
      html += '<button onclick="AllJobCards.goPage(' + (p + 1) + ')" ' + (p >= totalPages ? 'disabled' : '') + '>Next</button>';
      html += '</div></div>';
    }

    container.innerHTML = html;
    startLiveTimers();
  }

  function startLiveTimers() {
    Duration.startRotation(3000);
  }

  function viewJcDetail(id) {
    var item = null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].JobCardNo === id) { item = state.data[i]; break; }
    }
    if (!item) return;

    var el = document.getElementById('jcViewRef');
    if (el) el.textContent = id;

    var displayStatus = getDisplayStatus(item);
    var displayBadge = getStatusBadgeClass(displayStatus);
    var priorityBadge = item.Priority === 'Critical' || item.Priority === 'High' ? 'danger' :
                        item.Priority === 'Medium' ? 'warning' : 'success';
    var waitingHrs = Duration.cell(item.WaitingTime);
    var workingHrs = Duration.cell(item.WorkingTime);
    var downtimeHrs = Duration.cell(item.Downtime || item.TotalDuration || 0);

    var faultThumb = item.FaultImage ? '<img src="' + item.FaultImage + '" class="img-thumb" onclick="AllJobCards.openFullImage(\'' + item.FaultImage + '\')" style="width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer">' : '\u2014';
    var repairThumb = item.RepairImage ? '<img src="' + item.RepairImage + '" class="img-thumb" onclick="AllJobCards.openFullImage(\'' + item.RepairImage + '\')" style="width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer">' : '\u2014';

    var html =
      '<div class="view-grid">' +
        '<div class="view-section">' +
          '<h4>Job Card Details</h4>' +
          '<div class="view-row"><span>Job Card No</span><strong>' + Utils.escapeHtml(item.JobCardNo) + '</strong></div>' +
          '<div class="view-row"><span>Opened</span><strong>' + Utils.formatDateTime(item.OpenDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Machine</span><strong>' + Utils.escapeHtml(item.Machine || '-') + '</strong></div>' +
          '<div class="view-row"><span>Asset</span><strong>' + Utils.escapeHtml(item.AssetID || '-') + '</strong></div>' +
          '<div class="view-row"><span>Department</span><strong>' + Utils.escapeHtml(item.Department || '-') + '</strong></div>' +
          '<div class="view-row"><span>Priority</span><strong><span class="badge badge-' + priorityBadge + '">' + Utils.escapeHtml(item.Priority) + '</span></strong></div>' +
          '<div class="view-row"><span>Complaint By</span><strong>' + Utils.escapeHtml(item.ComplaintBy || '-') + '</strong></div>' +
          '<div class="view-row"><span>Description</span><strong>' + Utils.escapeHtml(item.ComplaintDescription || '-') + '</strong></div>' +
          '<div class="view-row"><span>Fault Image</span><strong>' + faultThumb + '</strong></div>' +
        '</div>';

    if (item.StartDateTime) {
      html +=
        '<div class="view-section">' +
          '<h4>Work Execution</h4>' +
          '<div class="view-row"><span>Started</span><strong>' + Utils.formatDateTime(item.StartDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Assigned Technician</span><strong>' + Utils.escapeHtml(item.AssignedTechnician || '-') + '</strong></div>' +
          '<div class="view-row"><span>Waiting Time</span><strong>' + waitingHrs + '</strong></div>' +
        '</div>';
    }

    if (item.CloseDateTime) {
      html +=
        '<div class="view-section">' +
          '<h4>Completion</h4>' +
          '<div class="view-row"><span>Closed</span><strong>' + Utils.formatDateTime(item.CloseDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Working Time</span><strong>' + workingHrs + '</strong></div>' +
          '<div class="view-row"><span>Total Breakdown</span><strong>' + downtimeHrs + '</strong></div>' +
          '<div class="view-row"><span>Root Cause</span><strong>' + Utils.escapeHtml(item.RootCause || '-') + '</strong></div>' +
          '<div class="view-row"><span>Corrective Action</span><strong>' + Utils.escapeHtml(item.CorrectiveAction || '-') + '</strong></div>' +
          '<div class="view-row"><span>Spare Parts</span><strong>' + Utils.escapeHtml(item.SpareParts || '-') + '</strong></div>' +
          '<div class="view-row"><span>Repair Image</span><strong>' + repairThumb + '</strong></div>' +
        '</div>';
    }

    if (item.ApprovalStatus) {
      var appBadge = item.ApprovalStatus === 'Approved' ? 'approved' :
                     item.ApprovalStatus === 'Returned' ? 'pending' : 'open';
      var appLabel = item.ApprovalStatus === 'Approved' ? 'Approved By' :
                     item.ApprovalStatus === 'Returned' ? 'Returned By' : 'Approved By';
      var appDateField = item.ApprovalStatus === 'Returned' ? item.ReturnedDateTime : item.ApprovedDateTime;
      var appRemark = item.ApprovalStatus === 'Returned' ? (item.ReturnReason || item.ApprovalRemarks || '-') : (item.ApprovalRemarks || '-');
      html +=
        '<div class="view-section">' +
          '<h4>Approval</h4>' +
          '<div class="view-row"><span>' + appLabel + '</span><strong>' + Utils.escapeHtml(item.ApprovedBy || item.ReturnedBy || '-') + '</strong></div>' +
          '<div class="view-row"><span>Date</span><strong>' + Utils.formatDateTime(appDateField) + '</strong></div>' +
          '<div class="view-row"><span>Status</span><strong><span class="badge badge-' + appBadge + '">' + Utils.escapeHtml(item.ApprovalStatus) + '</span></strong></div>' +
          '<div class="view-row"><span>Remarks</span><strong>' + Utils.escapeHtml(appRemark) + '</strong></div>' +
        '</div>';
    }

    if (!item.StartDateTime) {
      html += '<div class="view-section"><h4>Status</h4><div class="view-row"><span>This job card is <strong>OPEN</strong> and waiting to be started.</span></div></div>';
    }

    html +=
      '</div>' +
      '<div class="view-status-bar"><span class="badge badge-' + displayBadge + '" style="font-size:13px;padding:5px 14px">Status: ' + Utils.escapeHtml(displayStatus) + '</span></div>';

    var body = document.getElementById('jcViewBody');
    if (body) body.innerHTML = html;
    document.getElementById('jcViewModal').style.display = 'flex';
  }

  function openFullImage(url) {
    if (!url) return;
    var el = document.getElementById('jcFullImage');
    if (el) el.src = url;
    document.getElementById('jcImageModal').style.display = 'flex';
  }

  return {
    show: function() {
      if (state.timer) clearInterval(state.timer);
      state = { data: [], page: 1, activeTab: 'open', timer: null };
      renderPage();
      loadData();
    },

    switchTab: function(tab) {
      state.activeTab = tab;
      state.page = 1;
      var tabs = document.querySelectorAll('#allJcTabs .workflow-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
      }
      renderJcTable();
    },

    searchJobCardsTable: function() {
      state.page = 1;
      renderJcTable();
    },

    filterJobCards: function() {
      state.page = 1;
      renderJcTable();
    },

    goPage: function(p) {
      state.page = p;
      renderJcTable();
    },

    viewJcDetail: function(id) { viewJcDetail(id); },
    openFullImage: function(url) { openFullImage(url); },
    hideModal: function(id) { document.getElementById(id).style.display = 'none'; }
  };
})();
