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

  var ICON_EXPORT_CSV = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>';
  var ICON_EXPORT_PDF = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M6 14H4a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M6 12h8v5H6v-5z"/><path d="M6 5V3a1 1 0 011-1h6a1 1 0 011 1v2"/></svg>';
  var ICON_PRINT = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M6 14H4a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M6 12h8v5H6v-5z"/><path d="M6 5V3a1 1 0 011-1h6a1 1 0 011 1v2"/></svg>';
  var ICON_DIAGNOSE = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v4"/><path d="M10 14h.01"/></svg>';
  var ICON_REFRESH = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>';
  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  var STAT_TOTAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 18l3 3 3-3"/><path d="M4 12h2l3-9 3 9h2"/></svg>';
  var STAT_TODAY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var STAT_MODULES_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var STAT_USERS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatAuditDateTime(date) {
    if (!date) return '';
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var month = months[d.getMonth()];
    var year = d.getFullYear();
    var hours = d.getHours();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    var mins = String(d.getMinutes()).padStart(2, '0');
    return day + ' ' + month + ' ' + year + ' | ' + String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm;
  }

  function buildPageHtml() {
    return '<div id="auditPage" class="page">' +

      '<div class="dashboard-grid" id="auditSummaryCards" style="margin-bottom:16px;grid-template-columns:repeat(4,1fr)">' +
        '<div class="stat-card stat-primary" style="cursor:pointer">' +
          '<div class="stat-inner">' +
            '<div class="stat-icon">' + STAT_TOTAL_SVG + '</div>' +
            '<div class="stat-info"><h3 id="auditTotalCount">0</h3><p>Total Activities</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="stat-card stat-success" style="cursor:pointer">' +
          '<div class="stat-inner">' +
            '<div class="stat-icon">' + STAT_TODAY_SVG + '</div>' +
            '<div class="stat-info"><h3 id="auditTodayCount">0</h3><p>Today</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="stat-card stat-info" style="cursor:pointer">' +
          '<div class="stat-inner">' +
            '<div class="stat-icon">' + STAT_MODULES_SVG + '</div>' +
            '<div class="stat-info"><h3 id="auditModuleCount">0</h3><p>Modules</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="stat-card stat-warning" style="cursor:pointer">' +
          '<div class="stat-inner">' +
            '<div class="stat-icon">' + STAT_USERS_SVG + '</div>' +
            '<div class="stat-info"><h3 id="auditUserCount">0</h3><p>Users Active</p></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="filter-bar" id="auditFilterBar">' +
        '<div class="form-group">' +
          '<label>Search</label>' +
          '<div class="search-box">' +
            ICON_SEARCH +
            '<input type="text" class="form-control" id="auditSearch" placeholder="Search audit log..." onkeyup="AuditTrail.applyFilter()">' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>From</label>' +
          '<input type="date" class="form-control" id="auditDateFrom" onchange="AuditTrail.applyFilter()">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>To</label>' +
          '<input type="date" class="form-control" id="auditDateTo" onchange="AuditTrail.applyFilter()">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>User</label>' +
          '<select class="form-control" id="auditFilterUser" onchange="AuditTrail.applyFilter()">' +
            '<option value="">All Users</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Department</label>' +
          '<select class="form-control" id="auditFilterDept" onchange="AuditTrail.applyFilter()">' +
            '<option value="">All Departments</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Module</label>' +
          '<select class="form-control" id="auditFilterModule" onchange="AuditTrail.applyFilter()">' +
            '<option value="">All Modules</option>' +
            '<option value="Login">Login</option>' +
            '<option value="Logout">Logout</option>' +
            '<option value="Job Card">Job Card</option>' +
            '<option value="Machine">Machine</option>' +
            '<option value="Asset">Asset</option>' +
            '<option value="Department">Department</option>' +
            '<option value="Section">Section</option>' +
            '<option value="Technician">Technician</option>' +
            '<option value="User">User</option>' +
            '<option value="Spare Part">Spare Part</option>' +
            '<option value="Inventory">Inventory</option>' +
            '<option value="Goods Receipt">Goods Receipt</option>' +
            '<option value="Preventive Maintenance">Preventive Maintenance</option>' +
            '<option value="Settings">Settings</option>' +
            '<option value="Permission">Permission</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Action</label>' +
          '<select class="form-control" id="auditFilterAction" onchange="AuditTrail.applyFilter()">' +
            '<option value="">All Actions</option>' +
            '<option value="Login">Login</option>' +
            '<option value="Logout">Logout</option>' +
            '<option value="Create">Create</option>' +
            '<option value="Update">Update</option>' +
            '<option value="Delete">Delete</option>' +
            '<option value="Approve">Approve</option>' +
            '<option value="Reject">Reject</option>' +
            '<option value="Open">Open</option>' +
            '<option value="Start">Start</option>' +
            '<option value="Close">Close</option>' +
            '<option value="Complete">Complete</option>' +
            '<option value="Cancel">Cancel</option>' +
            '<option value="Stock In">Stock In</option>' +
            '<option value="Stock Out">Stock Out</option>' +
            '<option value="Goods Receipt">Goods Receipt</option>' +
            '<option value="Permission Changed">Permission Changed</option>' +
            '<option value="Settings Changed">Settings Changed</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Status</label>' +
          '<select class="form-control" id="auditFilterStatus" onchange="AuditTrail.applyFilter()">' +
            '<option value="">All</option>' +
            '<option value="Success">Success</option>' +
            '<option value="Failure">Failure</option>' +
            '<option value="Warning">Warning</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Role</label>' +
          '<select class="form-control" id="auditFilterRole" onchange="AuditTrail.applyFilter()">' +
            '<option value="">All Roles</option>' +
            '<option value="Admin">Admin</option>' +
            '<option value="Department Manager">Department Manager</option>' +
            '<option value="Maintenance Manager">Maintenance Manager</option>' +
            '<option value="Supervisor">Supervisor</option>' +
            '<option value="Technician">Technician</option>' +
            '<option value="Operator">Operator</option>' +
            '<option value="Store">Store</option>' +
            '<option value="Viewer">Viewer</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group" style="align-self:flex-end">' +
          '<button class="btn btn-secondary btn-sm" onclick="AuditTrail.clearFilters()">Clear</button>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Audit Trail Log</div>' +
          '<div class="card-actions">' +
            '<button class="btn btn-secondary" onclick="AuditTrail.exportCSV()">' + ICON_EXPORT_CSV + ' Export CSV</button>' +
            '<button class="btn btn-secondary" onclick="AuditTrail.exportPDF()">' + ICON_EXPORT_PDF + ' Export PDF</button>' +
            '<button class="btn btn-secondary" onclick="AuditTrail.printTable()">' + ICON_PRINT + ' Print</button>' +
            '<button class="btn btn-secondary" onclick="AuditTrail.runDiagnostic()" title="Run audit pipeline diagnostic">' + ICON_DIAGNOSE + ' Diagnose</button>' +
            '<button class="btn btn-secondary" onclick="AuditTrail.refresh()">' + ICON_REFRESH + ' Refresh</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-container">' +
          '<table class="table" id="auditTable">' +
            '<thead>' +
              '<tr>' +
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
              '</tr>' +
            '</thead>' +
            '<tbody id="auditTableBody">' +
              '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:30px">Loading audit logs...</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="table-footer" id="auditPagination">' +
          '<div class="pagination-info" id="auditPaginationInfo">Showing 0-0 of 0</div>' +
          '<div class="pagination-controls" id="auditPaginationControls"></div>' +
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
      updateSummaryCards();
    }).catch(function(err) {
      Loader.hide();
      Notify.error('Failed to load audit logs' + (err && err.message ? ': ' + err.message : ''));
    });
  }

  function populateFilterDropdowns() {
    var userSet = {}, deptSet = {};
    state.data.forEach(function(r) {
      if (r.UserName) userSet[r.UserName] = (r.UserEmail || '');
      if (r.Department) deptSet[r.Department] = true;
    });
    var userSel = document.getElementById('auditFilterUser');
    if (userSel) {
      var currentVal = userSel.value;
      userSel.innerHTML = '<option value="">All Users</option>';
      Object.keys(userSet).sort().forEach(function(u) {
        var opt = document.createElement('option');
        opt.value = userSet[u];
        opt.textContent = u;
        if (userSet[u] === currentVal) opt.selected = true;
        userSel.appendChild(opt);
      });
    }
    var deptSel = document.getElementById('auditFilterDept');
    if (deptSel) {
      var currentDept = deptSel.value;
      deptSel.innerHTML = '<option value="">All Departments</option>';
      Object.keys(deptSet).sort().forEach(function(d) {
        var opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        if (d === currentDept) opt.selected = true;
        deptSel.appendChild(opt);
      });
    }
  }

  function applyFilterFn() {
    var search = (document.getElementById('auditSearch').value || '').trim();
    var dateFrom = document.getElementById('auditDateFrom').value;
    var dateTo = document.getElementById('auditDateTo').value;
    var user = document.getElementById('auditFilterUser').value;
    var dept = document.getElementById('auditFilterDept').value;
    var module = document.getElementById('auditFilterModule').value;
    var action = document.getElementById('auditFilterAction').value;
    var status = document.getElementById('auditFilterStatus').value;
    var role = document.getElementById('auditFilterRole').value;

    state.filtered = state.data.filter(function(r) {
      if (search) {
        var q = search.toLowerCase();
        var found = false;
        for (var k in r) { if (String(r[k]).toLowerCase().indexOf(q) > -1) { found = true; break; } }
        if (!found) return false;
      }
      if (dateFrom && r.DateTime) {
        var d = new Date(r.DateTime);
        var f = new Date(dateFrom);
        if (!isNaN(d.getTime()) && d < f) return false;
      }
      if (dateTo && r.DateTime) {
        var d = new Date(r.DateTime);
        var t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        if (!isNaN(d.getTime()) && d > t) return false;
      }
      if (user && r.UserEmail !== user) return false;
      if (dept && r.Department !== dept) return false;
      if (module && r.Module !== module) return false;
      if (action && r.Action !== action) return false;
      if (status && r.Status !== status) return false;
      if (role && r.Role !== role) return false;
      return true;
    });

    state.page = 1;
    renderTable();
    renderPagination();
  }

  function updateSummaryCards() {
    var total = state.data.length;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todayCount = 0, moduleSet = {}, userSet = {};
    state.data.forEach(function(r) {
      var dt = new Date(r.DateTime);
      if (!isNaN(dt.getTime()) && dt >= today) todayCount++;
      if (r.Module) moduleSet[r.Module] = true;
      if (r.UserEmail) userSet[r.UserEmail] = true;
    });
    var el;
    el = document.getElementById('auditTotalCount'); if (el) el.textContent = total;
    el = document.getElementById('auditTodayCount'); if (el) el.textContent = todayCount;
    el = document.getElementById('auditModuleCount'); if (el) el.textContent = Object.keys(moduleSet).length;
    el = document.getElementById('auditUserCount'); if (el) el.textContent = Object.keys(userSet).length;
  }

  function renderTable() {
    var tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    var start = (state.page - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, state.filtered.length);
    var pageData = state.filtered.slice(start, end);

    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:30px">No audit logs found.</td></tr>';
      return;
    }

    var html = '';
    pageData.forEach(function(r) {
      var actionIcon = actionIcons[r.Action] || '';
      var actionLabel = r.Action || '';
      var statusBadge = statusBadges[r.Status] || 'badge-secondary';
      var modColor = moduleColors[r.Module] || 'var(--text-muted)';
      var dt = r.DateTime || '';
      var displayDt = '';
      if (dt) {
        var d = new Date(dt);
        if (!isNaN(d.getTime())) displayDt = formatAuditDateTime(d);
      }
      html += '<tr>' +
        '<td><span class="badge badge-secondary" style="font-size:9px">' + escapeHtml(r.AuditID || '') + '</span></td>' +
        '<td style="white-space:nowrap;font-size:12px">' + escapeHtml(displayDt) + '</td>' +
        '<td><strong>' + escapeHtml(r.UserName || '') + '</strong><br><span style="font-size:10px;color:var(--text-muted)">' + escapeHtml(r.UserEmail || '') + '</span></td>' +
        '<td><span class="badge badge-secondary" style="font-size:9px">' + escapeHtml(r.Role || '') + '</span></td>' +
        '<td>' + escapeHtml(r.Department || '-') + '</td>' +
        '<td><span class="badge" style="font-size:9px;background:color-mix(in srgb, ' + modColor + ' 15%, transparent);color:' + modColor + '">' + escapeHtml(r.Module || '') + '</span></td>' +
        '<td>' + actionIcon + '<span class="badge badge-secondary" style="font-size:9px">' + escapeHtml(actionLabel) + '</span></td>' +
        '<td style="font-size:12px">' + escapeHtml(r.RecordID || '-') + '</td>' +
        '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(r.RecordName || '') + '">' + escapeHtml(r.RecordName || '-') + '</td>' +
        '<td><span class="badge ' + statusBadge + '" style="font-size:9px">' + escapeHtml(r.Status || '') + '</span></td>' +
        '<td style="max-width:200px;font-size:12px;color:var(--text-muted)">' +
          (r.Remarks ? escapeHtml(r.Remarks) : (r.OldValue || r.NewValue ? 'Old: ' + escapeHtml(String(r.OldValue || '').substring(0, 50)) + (r.NewValue ? ' → New: ' + escapeHtml(String(r.NewValue || '').substring(0, 50)) : '') : '-')) +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  }

  function renderPagination() {
    var info = document.getElementById('auditPaginationInfo');
    var controls = document.getElementById('auditPaginationControls');
    if (!info || !controls) return;
    var total = state.filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    var start = (state.page - 1) * PAGE_SIZE + 1;
    var end = Math.min(state.page * PAGE_SIZE, total);
    info.textContent = total > 0 ? 'Showing ' + start + '-' + end + ' of ' + total : 'Showing 0-0 of 0';

    var html = '';
    html += '<button class="btn btn-xs btn-secondary" onclick="AuditTrail.goPage(1)" ' + (state.page <= 1 ? 'disabled' : '') + '>&#171;</button>';
    html += '<button class="btn btn-xs btn-secondary" onclick="AuditTrail.goPage(' + (state.page - 1) + ')" ' + (state.page <= 1 ? 'disabled' : '') + '>&#8249;</button>';
    html += '<span style="margin:0 8px;font-size:12px;color:var(--text-muted)">Page ' + state.page + ' of ' + totalPages + '</span>';
    html += '<button class="btn btn-xs btn-secondary" onclick="AuditTrail.goPage(' + (state.page + 1) + ')" ' + (state.page >= totalPages ? 'disabled' : '') + '>&#8250;</button>';
    html += '<button class="btn btn-xs btn-secondary" onclick="AuditTrail.goPage(' + totalPages + ')" ' + (state.page >= totalPages ? 'disabled' : '') + '>&#187;</button>';
    controls.innerHTML = html;
  }

  function downloadCSV(csv, filename) {
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'export.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportCSV() {
    if (state.filtered.length === 0) { Notify.warning('No data to export'); return; }
    var headers = ['AuditID','DateTime','UserEmail','UserName','Role','Department','Module','Action','RecordID','RecordName','OldValue','NewValue','Status','Remarks'];
    var csv = headers.join(',') + '\n';
    state.filtered.forEach(function(r) {
      var row = headers.map(function(h) {
        var v = r[h] || '';
        return '"' + String(v).replace(/"/g, '""') + '"';
      });
      csv += row.join(',') + '\n';
    });
    downloadCSV(csv, 'audit_trail_export.csv');
  }

  function exportPDF() {
    if (state.filtered.length === 0) { Notify.warning('No data to export'); return; }
    var printContent = '<html><head><style>body{font-family:Arial;font-size:11px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid var(--border);padding:4px 6px;text-align:left;}th{background:#1F4E78;color:var(--bg-primary);}tr:nth-child(even){background:#f2f2f2;}</style></head><body>';
    printContent += '<h2>Audit Trail Report</h2><p>Generated: ' + new Date().toLocaleString() + '</p>';
    printContent += '<table><thead><tr><th>DateTime</th><th>User</th><th>Role</th><th>Department</th><th>Module</th><th>Action</th><th>RecordID</th><th>Remarks</th></tr></thead><tbody>';
    state.filtered.forEach(function(r) {
      printContent += '<tr><td>' + escapeHtml(r.DateTime || '') + '</td><td>' + escapeHtml(r.UserName || '') + '</td><td>' + escapeHtml(r.Role || '') + '</td><td>' + escapeHtml(r.Department || '') + '</td><td>' + escapeHtml(r.Module || '') + '</td><td>' + escapeHtml(r.Action || '') + '</td><td>' + escapeHtml(r.RecordID || '') + '</td><td>' + escapeHtml(r.Remarks || '') + '</td></tr>';
    });
    printContent += '</tbody></table></body></html>';
    var win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      win.print();
    }
  }

  function printTable() {
    if (state.filtered.length === 0) { Notify.warning('No data to print'); return; }
    var printContent = '<html><head><style>body{font-family:Arial;font-size:10px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid var(--border);padding:3px 5px;text-align:left;font-size:10px}th{background:#1F4E78;color:var(--bg-primary);}</style></head><body>';
    printContent += '<h3>Audit Trail</h3><p>' + new Date().toLocaleString() + '</p>';
    printContent += '<table><thead><tr><th>DateTime</th><th>User</th><th>Role</th><th>Module</th><th>Action</th><th>RecordID</th><th>Status</th><th>Remarks</th></tr></thead><tbody>';
    state.filtered.forEach(function(r) {
      printContent += '<tr><td>' + escapeHtml(r.DateTime || '') + '</td><td>' + escapeHtml(r.UserName || '') + '</td><td>' + escapeHtml(r.Role || '') + '</td><td>' + escapeHtml(r.Module || '') + '</td><td>' + escapeHtml(r.Action || '') + '</td><td>' + escapeHtml(r.RecordID || '') + '</td><td>' + escapeHtml(r.Status || '') + '</td><td>' + escapeHtml(r.Remarks || '') + '</td></tr>';
    });
    printContent += '</tbody></table></body></html>';
    var win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      win.print();
    }
  }

  function runDiagnostic() {
    var diagData = {
      totalRecords: state.data.length,
      filteredRecords: state.filtered.length,
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
    console.log('[AUDIT DIAGNOSTIC]', diagData);
    Notify.success('Diagnostic completed. Check console for details.');
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
      var el;
      el = document.getElementById('auditSearch'); if (el) el.value = '';
      el = document.getElementById('auditDateFrom'); if (el) el.value = '';
      el = document.getElementById('auditDateTo'); if (el) el.value = '';
      el = document.getElementById('auditFilterUser'); if (el) el.value = '';
      el = document.getElementById('auditFilterDept'); if (el) el.value = '';
      el = document.getElementById('auditFilterModule'); if (el) el.value = '';
      el = document.getElementById('auditFilterAction'); if (el) el.value = '';
      el = document.getElementById('auditFilterStatus'); if (el) el.value = '';
      el = document.getElementById('auditFilterRole'); if (el) el.value = '';
      applyFilterFn();
    },

    goPage: function(p) {
      var totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
      if (p < 1) p = 1;
      if (p > totalPages) p = totalPages;
      state.page = p;
      renderTable();
      renderPagination();
    },

    refresh: function() {
      loadAuditLogsData();
    },

    exportCSV: exportCSV,

    exportPDF: exportPDF,

    printTable: printTable,

    runDiagnostic: runDiagnostic
  };
})();
