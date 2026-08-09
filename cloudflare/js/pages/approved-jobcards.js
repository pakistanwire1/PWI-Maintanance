var ApproveJobCards = (function() {
  var state = { data: [], page: 1 };

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  var PAGE_SIZE = 10;

  function formatDuration(val) {
    return Duration.format(val);
  }

  function hasPermission(perm) {
    var user = Session.getUser();
    if (!user) return false;
    if (user.role === 'Admin' || user.isSystemAdmin) return true;
    return !!user['can' + perm.charAt(0).toUpperCase() + perm.slice(1)];
  }

  function getUserDept() {
    var user = Session.getUser();
    return user ? (user.department || '') : '';
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="approvejobcardPage" class="page">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">' +
              '<span class="status-dot status-completed"></span>' +
              'Approve Jobs' +
            '</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                ICON_SEARCH +
                '<input type="text" class="form-control" id="jcaSearch" placeholder="Search pending approvals..." onkeyup="ApproveJobCards.search()">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="filter-bar">' +
            '<div class="form-group">' +
              '<select class="form-control" id="jcaDeptFilter" onchange="ApproveJobCards.filter()">' +
                '<option value="">All Departments</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div id="jcaTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="jcaModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot status-completed"></span>' +
              'Job Card Details \u2014 <span id="jcaRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="ApproveJobCards.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="jcaForm" onsubmit="return false">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="JobCardNo" id="jcaJobNo">' +
              '<div class="time-summary-panel">' +
                '<div class="ts-header">Job Summary</div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Department</span><span class="ts-stat-value" id="jcaDept">\u2014</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Machine</span><span class="ts-stat-value" id="jcaMachine">\u2014</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Technician</span><span class="ts-stat-value" id="jcaTech">\u2014</span></div>' +
                '</div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Waiting Time</span><span class="ts-stat-value" id="jcaWaiting">0m</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Working Time</span><span class="ts-stat-value" id="jcaWorking">0m</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Total Downtime</span><span class="ts-stat-value" id="jcaBreakdown">0m</span></div>' +
                '</div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Description</span><span class="ts-stat-value jc-desc-value" id="jcaDesc">\u2014</span></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="ApproveJobCards.hideModal()">Close</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getJobCards', {}).then(function(data) {
      state.data = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
      Loader.hide();
      populateFilters();
      renderTable();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load job cards');
    });
  }

  function populateFilters() {
    var deptEl = document.getElementById('jcaDeptFilter');
    if (deptEl) deptEl.innerHTML = '<option value="">All Departments</option>';
    var depts = [];
    state.data.forEach(function(jc) {
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (as === 'approved') {
        if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
      }
    });
    depts.sort().forEach(function(d) { if (deptEl) deptEl.innerHTML += '<option value="' + d + '">' + d + '</option>'; });
  }

  function getFilteredData() {
    var dept = document.getElementById('jcaDeptFilter') ? document.getElementById('jcaDeptFilter').value : '';
    var query = document.getElementById('jcaSearch') ? document.getElementById('jcaSearch').value.toLowerCase() : '';
    var userDept = getUserDept();
    var isAdminUser = Session.getUser() && (Session.getUser().role === 'Admin' || Session.getUser().isSystemAdmin);
    return state.data.filter(function(jc) {
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (as !== 'approved') return false;
      if (!isAdminUser && userDept && jc.Department !== userDept) return false;
      if (dept && jc.Department !== dept) return false;
      if (query) {
        if ((jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(query) === -1) &&
            (jc.Machine && jc.Machine.toLowerCase().indexOf(query) === -1) &&
            (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(query) === -1)) {
          return false;
        }
      }
      return true;
    });
  }

  function renderTable() {
    var list = getFilteredData();

    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('jcaTableContainer');
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

    var columns = [
      { key: 'JobCardNo', label: 'Job Card No' },
      { key: 'OpenDateTime', label: 'Closed', datetime: true },
      { key: 'Machine', label: 'Machine' },
      { key: 'MachineNumber', label: 'Machine No' },
      { key: 'Department', label: 'Dept' },
      { key: 'AssignedTechnician', label: 'Technician' },
      { key: 'WaitingTime', label: 'Waiting', format: function(val) { return Duration.cell(val); } },
      { key: 'WorkingTime', label: 'Working', format: function(val) { return Duration.cell(val); } },
      { key: '_breakdown', label: 'Breakdown', format: function(val, row) { return Duration.cell(row.Downtime || row.TotalDuration || 0); } }
    ];

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    html += '<th style="width:120px">Actions</th>';
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
      html += '<button class="icon-btn" onclick="ApproveJobCards.reviewCard(\'' + row.JobCardNo + '\')" title="View">' + ICON_VIEW + '</button>';
      html += '</div></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + list.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="ApproveJobCards.goPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>Prev</button>';
      html += '<span style="margin:0 8px;font-size:13px;color:var(--text-secondary)">Page ' + p + ' of ' + totalPages + '</span>';
      html += '<button onclick="ApproveJobCards.goPage(' + (p + 1) + ')" ' + (p >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
  }

  function reviewCard(id) {
    var item = null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].JobCardNo === id) { item = state.data[i]; break; }
    }
    if (!item) return;

    document.getElementById('jcaJobNo').value = id;
    document.getElementById('jcaRef').textContent = id;
    var el;
    el = document.getElementById('jcaDept'); if (el) el.textContent = item.Department || '-';
    el = document.getElementById('jcaMachine'); if (el) el.textContent = item.Machine || '-';
    el = document.getElementById('jcaTech'); if (el) el.textContent = item.AssignedTechnician || '-';
    var desc = (item.ComplaintDescription || '').substring(0, 100) + ((item.ComplaintDescription || '').length > 100 ? '...' : '');
    el = document.getElementById('jcaDesc'); if (el) el.textContent = desc;
    el = document.getElementById('jcaWaiting'); if (el) Duration.setElement(el, item.WaitingTime);
    el = document.getElementById('jcaWorking'); if (el) Duration.setElement(el, item.WorkingTime);
    el = document.getElementById('jcaBreakdown'); if (el) Duration.setElement(el, item.Downtime || item.TotalDuration || 0);

    document.getElementById('jcaModal').style.display = 'flex';
  }

  function toggleDecision() {
    var decision = document.querySelector('input[name="approveDecision"]:checked');
    var isReturn = decision && decision.value === 'return';
    var el;
    el = document.getElementById('jcaReturnReasonGroup'); if (el) el.style.display = isReturn ? 'block' : 'none';
    el = document.getElementById('jcaReturnBtn'); if (el) el.style.display = isReturn ? '' : 'none';
    el = document.getElementById('jcaApproveBtn'); if (el) el.style.display = isReturn ? 'none' : '';
  }

  function hideModal() {
    document.getElementById('jcaModal').style.display = 'none';
  }

  return {
    show: renderPage,
    filter: function() { state.page = 1; renderTable(); },
    search: function() { state.page = 1; renderTable(); },
    reviewCard: reviewCard,
    hideModal: hideModal,
    goPage: function(p) { state.page = p; renderTable(); }
  };
})();
