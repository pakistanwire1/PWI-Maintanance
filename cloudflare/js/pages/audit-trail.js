var AuditTrail = (function() {
  var state = { data: [], filtered: [], page: 1 };

  var PAGE_SIZE = 20;

  var actionIcons = {
    'Login': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M9 3H5a2 2 0 00-2 2v10a2 2 0 002 2h4"/><polyline points="13 7 17 11 13 15"/><line x1="9" y1="11" x2="17" y2="11"/></svg>',
    'Logout': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M11 3H7a2 2 0 00-2 2v10a2 2 0 002 2h4"/><polyline points="17 7 13 11 17 15"/><line x1="13" y1="11" x2="5" y2="11"/></svg>',
    'Create': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>',
    'Update': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    'Delete': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/></svg>',
    'Approve': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    'Reject': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><circle cx="10" cy="10" r="9"/><path d="M7 7l6 6"/><path d="M13 7l-6 6"/></svg>',
    'Open': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
    'Start': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><circle cx="10" cy="10" r="9"/><path d="M8 6l6 4-6 4V6z"/></svg>',
    'Close': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'Complete': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><circle cx="10" cy="10" r="9"/><path d="M7 10l2 2 4-4"/></svg>',
    'Cancel': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle;margin-right:3px"><circle cx="10" cy="10" r="9"/><line x1="15" y1="5" x2="5" y2="15"/></svg>'
  };

  var moduleColors = {
    'Login': '--info', 'Logout': '--info',
    'Job Card': '--primary', 'Machine': '--success',
    'Asset': '--purple', 'Department': '--orange',
    'Section': '--warning', 'Technician': '--danger',
    'User': '--info', 'Spare Part': '--success',
    'Inventory': '--warning', 'Goods Receipt': '--success',
    'Preventive Maintenance': '--orange', 'Settings': '--primary',
    'Permission': '--danger'
  };

  var statusBadges = {
    'Success': 'badge-success',
    'Failure': 'badge-danger',
    'Warning': 'badge-warning'
  };

  var filterOptions = {
    module: ['Login', 'Logout', 'Job Card', 'Machine', 'Asset', 'Department', 'Section', 'Technician', 'User', 'Spare Part', 'Inventory', 'Goods Receipt', 'Preventive Maintenance', 'Settings', 'Permission'],
    action: ['Login', 'Logout', 'Create', 'Update', 'Delete', 'Approve', 'Reject', 'Open', 'Start', 'Close', 'Complete', 'Cancel', 'Stock In', 'Stock Out', 'Goods Receipt', 'Permission Changed', 'Settings Changed'],
    status: ['Success', 'Failure', 'Warning'],
    role: ['Admin', 'Department Manager', 'Maintenance Manager', 'Supervisor', 'Technician', 'Operator', 'Store', 'Viewer']
  };

  var STAT_TOTAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 18l3 3 3-3"/><path d="M4 12h2l3-9 3 9h2"/></svg>';
  var STAT_TODAY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var STAT_MODULES_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var STAT_USERS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  var EXPORT_CSV_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var EXPORT_PDF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var PRINT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
  var DIAGNOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  var REFRESH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>';
  var SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  function buildPageHtml() {
    var moduleOpts = '<option value="">All Modules</option>';
    filterOptions.module.forEach(function(m) { moduleOpts += '<option value="' + m + '">' + m + '</option>'; });

    var actionOpts = '<option value="">All Actions</option>';
    filterOptions.action.forEach(function(a) { actionOpts += '<option value="' + a + '">' + a + '</option>'; });

    var statusOpts = '<option value="">All Status</option>';
    filterOptions.status.forEach(function(s) { statusOpts += '<option value="' + s + '">' + s + '</option>'; });

    var roleOpts = '<option value="">All Roles</option>';
    filterOptions.role.forEach(function(r) { roleOpts += '<option value="' + r + '">' + r + '</option>'; });

    return '<div class="page">' +

      '<div class="dashboard-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">' +
        '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon">' + STAT_TOTAL_SVG + '</div><div class="stat-info"><h3 id="auditTotalActivities">0</h3><p>Total Activities</p></div></div></div>' +
        '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon">' + STAT_TODAY_SVG + '</div><div class="stat-info"><h3 id="auditTodayCount">0</h3><p>Today</p></div></div></div>' +
        '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon">' + STAT_MODULES_SVG + '</div><div class="stat-info"><h3 id="auditModulesCount">0</h3><p>Modules</p></div></div></div>' +
        '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon">' + STAT_USERS_SVG + '</div><div class="stat-info"><h3 id="auditUsersActive">0</h3><p>Users Active</p></div></div></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Audit Trail Log</div>' +
          '<div class="card-actions">' +
            '<button class="btn btn-sm btn-secondary" onclick="AuditTrail.exportCSV()">' + EXPORT_CSV_SVG + 'Export CSV</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="AuditTrail.exportPDF()">' + EXPORT_PDF_SVG + 'Export PDF</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="AuditTrail.printTable()">' + PRINT_SVG + 'Print</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="AuditTrail.runDiagnostic()">' + DIAGNOSE_SVG + 'Diagnose</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="AuditTrail.refresh()">' + REFRESH_SVG + 'Refresh</button>' +
          '</div>' +
        '</div>' +

        '<div class="filter-bar" style="flex-wrap:wrap">' +
          '<div class="form-group" style="position:relative;flex:1;min-width:200px">' +
            SEARCH_SVG +
            '<input type="text" class="form-control" id="auditSearchInput" placeholder="Search audit logs..." oninput="AuditTrail.applyFilter()" style="padding-left:36px">' +
          '</div>' +
          '<div class="form-group"><input type="date" class="form-control" id="auditFromDate" onchange="AuditTrail.applyFilter()"></div>' +
          '<div class="form-group"><input type="date" class="form-control" id="auditToDate" onchange="AuditTrail.applyFilter()"></div>' +
          '<div class="form-group"><select class="form-control" id="auditUserFilter" onchange="AuditTrail.applyFilter()"><option value="">All Users</option></select></div>' +
          '<div class="form-group"><select class="form-control" id="auditDeptFilter" onchange="AuditTrail.applyFilter()"><option value="">All Departments</option></select></div>' +
          '<div class="form-group"><select class="form-control" id="auditModuleFilter" onchange="AuditTrail.applyFilter()">' + moduleOpts + '</select></div>' +
          '<div class="form-group"><select class="form-control" id="auditActionFilter" onchange="AuditTrail.applyFilter()">' + actionOpts + '</select></div>' +
          '<div class="form-group"><select class="form-control" id="auditStatusFilter" onchange="AuditTrail.applyFilter()">' + statusOpts + '</select></div>' +
          '<div class="form-group"><select class="form-control" id="auditRoleFilter" onchange="AuditTrail.applyFilter()">' + roleOpts + '</select></div>' +
          '<div class="form-group"><button class="btn btn-sm btn-secondary" onclick="AuditTrail.clearFilters()">Clear</button></div>' +
        '</div>' +

        '<div id="auditTableContainer"></div>' +
      '</div>' +

      '<div class="modal-overlay" id="auditViewModal">' +
        '<div class="modal" style="max-width:700px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Audit Log Details</div>' +
            '<button class="modal-close" onclick="AuditTrail.closeViewModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body" id="auditViewContent"></div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="AuditTrail.closeViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  function loadAuditLogsData() {
    Loader.show();
    API.post('getAuditLogs', {}).then(function(result) {
      Loader.hide();
      state.data = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      populateFilterDropdowns();
      applyFilterFn();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load audit logs');
    });
  }

  function populateFilterDropdowns() {
    var users = [];
    var depts = [];
    state.data.forEach(function(item) {
      if (item.User && users.indexOf(item.User) === -1) users.push(item.User);
      if (item.UserName && users.indexOf(item.UserName) === -1) users.push(item.UserName);
      if (item.Department && depts.indexOf(item.Department) === -1) depts.push(item.Department);
    });
    users.sort();
    depts.sort();

    var userEl = document.getElementById('auditUserFilter');
    if (userEl) {
      userEl.innerHTML = '<option value="">All Users</option>';
      users.forEach(function(u) {
        userEl.innerHTML += '<option value="' + Utils.escapeHtml(u) + '">' + Utils.escapeHtml(u) + '</option>';
      });
    }

    var deptEl = document.getElementById('auditDeptFilter');
    if (deptEl) {
      deptEl.innerHTML = '<option value="">All Departments</option>';
      depts.forEach(function(d) {
        deptEl.innerHTML += '<option value="' + Utils.escapeHtml(d) + '">' + Utils.escapeHtml(d) + '</option>';
      });
    }
  }

  function applyFilterFn() {
    var search = (document.getElementById('auditSearchInput') ? document.getElementById('auditSearchInput').value : '').toLowerCase();
    var fromDate = document.getElementById('auditFromDate') ? document.getElementById('auditFromDate').value : '';
    var toDate = document.getElementById('auditToDate') ? document.getElementById('auditToDate').value : '';
    var user = document.getElementById('auditUserFilter') ? document.getElementById('auditUserFilter').value : '';
    var dept = document.getElementById('auditDeptFilter') ? document.getElementById('auditDeptFilter').value : '';
    var module = document.getElementById('auditModuleFilter') ? document.getElementById('auditModuleFilter').value : '';
    var action = document.getElementById('auditActionFilter') ? document.getElementById('auditActionFilter').value : '';
    var status = document.getElementById('auditStatusFilter') ? document.getElementById('auditStatusFilter').value : '';
    var role = document.getElementById('auditRoleFilter') ? document.getElementById('auditRoleFilter').value : '';

    var list = state.data.slice();

    if (search) {
      list = list.filter(function(item) {
        var txt = ((item.AuditID || '') + ' ' + (item.User || '') + ' ' + (item.UserName || '') + ' ' + (item.Module || '') + ' ' + (item.Action || '') + ' ' + (item.RecordID || '') + ' ' + (item.RecordName || '') + ' ' + (item.Remarks || '') + ' ' + (item.Role || '') + ' ' + (item.Department || '') + ' ' + (item.Status || '')).toLowerCase();
        return txt.indexOf(search) > -1;
      });
    }
    if (fromDate) list = list.filter(function(item) { var d = (item.DateTime || item.Date || '').substring(0, 10); return d >= fromDate; });
    if (toDate) list = list.filter(function(item) { var d = (item.DateTime || item.Date || '').substring(0, 10); return d <= toDate; });
    if (user) list = list.filter(function(item) { return (item.User || item.UserName || '') === user; });
    if (dept) list = list.filter(function(item) { return (item.Department || '') === dept; });
    if (module) list = list.filter(function(item) { return (item.Module || '') === module; });
    if (action) list = list.filter(function(item) { return (item.Action || '') === action; });
    if (status) list = list.filter(function(item) { return (item.Status || '') === status; });
    if (role) list = list.filter(function(item) { return (item.Role || '') === role; });

    state.filtered = list;
    state.page = 1;
    updateSummaryCards();
    renderTable();
  }

  function updateSummaryCards() {
    var total = state.data.length;

    var today = new Date();
    var todayStr = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    var todayCount = 0;
    state.data.forEach(function(item) {
      var d = (item.DateTime || item.Date || '').substring(0, 10);
      if (d === todayStr) todayCount++;
    });

    var modules = [];
    state.data.forEach(function(item) {
      if (item.Module && modules.indexOf(item.Module) === -1) modules.push(item.Module);
    });

    var activeUsers = [];
    state.data.forEach(function(item) {
      var u = item.User || item.UserName || '';
      if (u && activeUsers.indexOf(u) === -1) activeUsers.push(u);
    });

    var el;
    el = document.getElementById('auditTotalActivities'); if (el) el.textContent = total;
    el = document.getElementById('auditTodayCount'); if (el) el.textContent = todayCount;
    el = document.getElementById('auditModulesCount'); if (el) el.textContent = modules.length;
    el = document.getElementById('auditUsersActive'); if (el) el.textContent = activeUsers.length;
  }

  function renderTable() {
    var list = state.filtered;
    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('auditTableContainer');
    if (!container) return;

    if (pageData.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Data Found</h3>' +
          '<p>No audit trail records match your filters.</p>' +
        '</div>';
      return;
    }

    var html = '<div class="table-container"><table class="table"><thead><tr>' +
      '<th>Audit ID</th>' +
      '<th>Date & Time</th>' +
      '<th>User</th>' +
      '<th>Role</th>' +
      '<th>Department</th>' +
      '<th>Module</th>' +
      '<th>Action</th>' +
      '<th>Record ID</th>' +
      '<th>Record Name</th>' +
      '<th>Status</th>' +
      '<th>Remarks</th>' +
    '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr onclick="AuditTrail.viewLog(\'' + Utils.escapeHtml(String(row.AuditID || '')) + '\')" style="cursor:pointer">';

      var auditId = row.AuditID !== undefined && row.AuditID !== null ? row.AuditID : '-';
      html += '<td><span class="badge badge-secondary badge-xs">' + Utils.escapeHtml(String(auditId)) + '</span></td>';

      var dt = row.DateTime || row.Date || '';
      html += '<td class="audit-dt-cell">' + Utils.escapeHtml(Utils.formatDateTime(dt)) + '</td>';

      var userName = row.UserName || row.User || '';
      var userEmail = row.Email || '';
      html += '<td><strong>' + Utils.escapeHtml(userName) + '</strong>';
      if (userEmail) html += '<br><small class="audit-email">' + Utils.escapeHtml(userEmail) + '</small>';
      html += '</td>';

      var roleVal = row.Role || '-';
      html += '<td><span class="badge badge-secondary badge-xs">' + Utils.escapeHtml(roleVal) + '</span></td>';

      html += '<td>' + Utils.escapeHtml(row.Department || '-') + '</td>';

      var mod = row.Module || '';
      var modColor = moduleColors[mod] || '--primary';
      html += '<td><span class="badge" style="background:color-mix(in srgb, var(' + modColor + ') 15%, transparent);color:var(' + modColor + ');border:1px solid color-mix(in srgb, var(' + modColor + ') 30%, transparent);font-size:9px">' + Utils.escapeHtml(mod) + '</span></td>';

      var act = row.Action || '';
      var actIcon = actionIcons[act] || '';
      html += '<td>' + actIcon + '<span class="badge badge-secondary">' + Utils.escapeHtml(act) + '</span></td>';

      html += '<td class="audit-rec-id">' + Utils.escapeHtml(String(row.RecordID || '-')) + '</td>';

      var recName = row.RecordName || '-';
      html += '<td class="audit-rec-name" title="' + Utils.escapeHtml(String(recName)) + '">' + Utils.escapeHtml(recName) + '</td>';

      var stat = row.Status || 'Success';
      var statClass = statusBadges[stat] || 'badge-secondary';
      html += '<td><span class="badge ' + statClass + '">' + Utils.escapeHtml(stat) + '</span></td>';

      var remarks = row.Remarks || '';
      if (!remarks && row.OldValue && row.NewValue) {
        remarks = 'Changed from "' + row.OldValue + '" to "' + row.NewValue + '"';
      }
      html += '<td class="audit-remarks" title="' + Utils.escapeHtml(remarks) + '">' + Utils.escapeHtml(remarks || '-') + '</td>';

      html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="table-footer">';
    html += '<div class="pagination-info">Showing ' + (start + 1) + '-' + end + ' of ' + list.length + '</div>';
    html += '<div class="pagination-controls">';
    html += '<button class="btn btn-sm btn-secondary" ' + (p <= 1 ? 'disabled' : '') + ' onclick="AuditTrail.goPage(1)">&laquo;</button>';
    html += '<button class="btn btn-sm btn-secondary" ' + (p <= 1 ? 'disabled' : '') + ' onclick="AuditTrail.goPage(' + (p - 1) + ')">&lsaquo;</button>';
    html += '<span class="audit-pg-text">Page ' + p + ' of ' + totalPages + '</span>';
    html += '<button class="btn btn-sm btn-secondary" ' + (p >= totalPages ? 'disabled' : '') + ' onclick="AuditTrail.goPage(' + (p + 1) + ')">&rsaquo;</button>';
    html += '<button class="btn btn-sm btn-secondary" ' + (p >= totalPages ? 'disabled' : '') + ' onclick="AuditTrail.goPage(' + totalPages + ')">&raquo;</button>';
    html += '</div></div>';

    container.innerHTML = html;
  }

  function findLogById(id) {
    for (var i = 0; i < state.data.length; i++) {
      if (String(state.data[i].AuditID) === String(id)) return state.data[i];
    }
    return null;
  }

  function showDetailModal(item) {
    if (!item) return;
    var fields = [
      { label: 'Audit ID', value: item.AuditID || '-' },
      { label: 'Date & Time', value: Utils.formatDateTime(item.DateTime || item.Date || '') },
      { label: 'User', value: item.UserName || item.User || '-' },
      { label: 'Email', value: item.Email || '-' },
      { label: 'Role', value: item.Role || '-' },
      { label: 'Department', value: item.Department || '-' },
      { label: 'Module', value: item.Module || '-' },
      { label: 'Action', value: item.Action || '-' },
      { label: 'Record ID', value: item.RecordID || '-' },
      { label: 'Record Name', value: item.RecordName || '-' },
      { label: 'Status', value: item.Status || '-' },
      { label: 'Remarks', value: item.Remarks || '-' },
      { label: 'Old Value', value: item.OldValue || '-' },
      { label: 'New Value', value: item.NewValue || '-' },
      { label: 'IP Address', value: item.IPAddress || item.IP || '-' },
      { label: 'User Agent', value: item.UserAgent || '-' }
    ];

    var html = '<div class="audit-detail-grid">';
    fields.forEach(function(f) {
      if (f.value && f.value !== '-') {
        html += '<div class="audit-detail-card">' +
          '<div class="audit-detail-label">' + Utils.escapeHtml(f.label) + '</div>' +
          '<div class="audit-detail-value">' + Utils.escapeHtml(String(f.value)) + '</div>' +
        '</div>';
      }
    });
    html += '</div>';

    var el = document.getElementById('auditViewContent');
    if (el) el.innerHTML = html;
    var overlay = document.getElementById('auditViewModal');
    if (overlay) overlay.classList.add('show');
  }

  return {
    show: function() {
      state = { data: [], filtered: [], page: 1 };
      var el = document.getElementById('pageContent');
      if (!el) return;
      el.innerHTML = buildPageHtml();
      loadAuditLogsData();
    },

    applyFilter: function() {
      applyFilterFn();
    },

    clearFilters: function() {
      var ids = ['auditSearchInput', 'auditFromDate', 'auditToDate', 'auditUserFilter', 'auditDeptFilter', 'auditModuleFilter', 'auditActionFilter', 'auditStatusFilter', 'auditRoleFilter'];
      ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      applyFilterFn();
    },

    goPage: function(p) {
      state.page = p;
      renderTable();
    },

    viewLog: function(id) {
      var item = findLogById(id);
      if (!item) { Notify.error('Audit log not found.'); return; }
      showDetailModal(item);
    },

    closeViewModal: function() {
      var overlay = document.getElementById('auditViewModal');
      if (overlay) overlay.classList.remove('show');
    },

    refresh: function() {
      loadAuditLogsData();
    },

    exportCSV: function() {
      if (state.filtered.length === 0) { Notify.error('No data to export.'); return; }
      var headers = ['Audit ID', 'Date & Time', 'User', 'Email', 'Role', 'Department', 'Module', 'Action', 'Record ID', 'Record Name', 'Status', 'Remarks', 'Old Value', 'New Value'];
      var rows = state.filtered.map(function(row) {
        return [
          row.AuditID || '',
          row.DateTime || row.Date || '',
          row.UserName || row.User || '',
          row.Email || '',
          row.Role || '',
          row.Department || '',
          row.Module || '',
          row.Action || '',
          row.RecordID || '',
          row.RecordName || '',
          row.Status || '',
          row.Remarks || '',
          row.OldValue || '',
          row.NewValue || ''
        ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
      });
      var csv = headers.join(',') + '\n' + rows.join('\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'audit-trail-' + new Date().toISOString().substring(0, 10) + '.csv';
      link.click();
      Notify.success('CSV exported successfully.');
    },

    exportPDF: function() {
      if (state.filtered.length === 0) { Notify.error('No data to export.'); return; }
      var win = window.open('', '_blank');
      if (!win) { Notify.error('Pop-up blocked. Please allow pop-ups.'); return; }
      var tableHtml = '<html><head><title>Audit Trail</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}.badge{padding:2px 6px;border-radius:4px;font-size:10px}</style></head><body>' +
        '<h2>Audit Trail Report</h2><p>Generated: ' + new Date().toLocaleString() + '</p><table><thead><tr>';
      tableHtml += '<th>Audit ID</th><th>Date & Time</th><th>User</th><th>Role</th><th>Department</th><th>Module</th><th>Action</th><th>Record ID</th><th>Record Name</th><th>Status</th><th>Remarks</th></tr></thead><tbody>';
      state.filtered.forEach(function(row) {
        tableHtml += '<tr><td>' + (row.AuditID || '') + '</td><td>' + (row.DateTime || row.Date || '') + '</td><td>' + (row.UserName || row.User || '') + '</td><td>' + (row.Role || '') + '</td><td>' + (row.Department || '') + '</td><td>' + (row.Module || '') + '</td><td>' + (row.Action || '') + '</td><td>' + (row.RecordID || '') + '</td><td>' + (row.RecordName || '') + '</td><td>' + (row.Status || '') + '</td><td>' + (row.Remarks || '') + '</td></tr>';
      });
      tableHtml += '</tbody></table></body></html>';
      win.document.write(tableHtml);
      win.document.close();
      setTimeout(function() { win.print(); }, 500);
      Notify.success('PDF print window opened.');
    },

    printTable: function() {
      if (state.filtered.length === 0) { Notify.error('No data to print.'); return; }
      var tableHtml = '<html><head><title>Audit Trail</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}</style></head><body>' +
        '<h2>Audit Trail Log</h2><p>Printed: ' + new Date().toLocaleString() + '</p><table><thead><tr>';
      tableHtml += '<th>Audit ID</th><th>Date & Time</th><th>User</th><th>Role</th><th>Department</th><th>Module</th><th>Action</th><th>Record ID</th><th>Record Name</th><th>Status</th><th>Remarks</th></tr></thead><tbody>';
      state.filtered.forEach(function(row) {
        tableHtml += '<tr><td>' + (row.AuditID || '') + '</td><td>' + (row.DateTime || row.Date || '') + '</td><td>' + (row.UserName || row.User || '') + '</td><td>' + (row.Role || '') + '</td><td>' + (row.Department || '') + '</td><td>' + (row.Module || '') + '</td><td>' + (row.Action || '') + '</td><td>' + (row.RecordID || '') + '</td><td>' + (row.RecordName || '') + '</td><td>' + (row.Status || '') + '</td><td>' + (row.Remarks || '') + '</td></tr>';
      });
      tableHtml += '</tbody></table></body></html>';
      var win = window.open('', '_blank');
      if (!win) { Notify.error('Pop-up blocked. Please allow pop-ups.'); return; }
      win.document.write(tableHtml);
      win.document.close();
      setTimeout(function() { win.print(); }, 500);
      Notify.success('Print window opened.');
    },

    runDiagnostic: function() {
      Loader.show();
      var diagData = {
        totalRecords: state.data.length,
        filteredRecords: state.filtered.length,
        dateRange: { from: '', to: '' },
        modules: [],
        actions: [],
        statuses: {},
        users: []
      };
      state.data.forEach(function(item) {
        var mod = item.Module || '';
        if (mod && diagData.modules.indexOf(mod) === -1) diagData.modules.push(mod);
        var act = item.Action || '';
        if (act && diagData.actions.indexOf(act) === -1) diagData.actions.push(act);
        var stat = item.Status || 'Unknown';
        diagData.statuses[stat] = (diagData.statuses[stat] || 0) + 1;
        var u = item.User || item.UserName || '';
        if (u && diagData.users.indexOf(u) === -1) diagData.users.push(u);
      });

      API.post('getAuditLogs', { diagnostic: true, clientData: diagData }).then(function() {
        Loader.hide();
        Notify.success('Diagnostic completed. Check console for details.');
        console.log('[AUDIT DIAGNOSTIC]', diagData);
      }).catch(function() {
        Loader.hide();
        console.log('[AUDIT DIAGNOSTIC] (local only)', diagData);
        Notify.success('Diagnostic completed (local). Check console.');
      });
    }
  };
})();