var Settings = (function() {
  var state = {
    departments: [],
    settings: [],
    users: [],
    usersPage: 1,
    editingEmail: ''
  };
  var PAGE_SIZE = 25;
  var PERM_FIELDS = [
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
    'CanManageMachines','CanManageAssets','CanManageSpareParts','CanManagePM',
    'CanManageTechnicians','CanManageDepartments','CanManageSections','CanManageUsers',
    'CanViewDashboard','CanViewReports','IsAdmin'
  ];
  var ROLE_BADGES = {
    'Admin': 'danger',
    'Department Manager': 'primary',
    'Maintenance Manager': 'warning',
    'Supervisor': 'info',
    'Technician': 'info',
    'Operator': 'secondary',
    'Viewer': 'secondary'
  };
  var THEME_COLORS = [
    { color: '#6366f1', name: 'Indigo' },
    { color: '#3b82f6', name: 'Blue' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#22c55e', name: 'Green' },
    { color: '#f59e0b', name: 'Amber' },
    { color: '#ef4444', name: 'Red' },
    { color: '#a855f7', name: 'Purple' },
    { color: '#f97316', name: 'Orange' }
  ];
  var PLUS_CIRCLE_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>';
  var EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';

  function esc(s) {
    return Utils.escapeHtml(String(s || ''));
  }

  function loadThemePrefs() {
    try { return JSON.parse(localStorage.getItem('cmms_theme_settings') || '{}'); } catch(e) { return {}; }
  }

  function saveThemePrefs(prefs) {
    localStorage.setItem('cmms_theme_settings', JSON.stringify(prefs));
    if (typeof Theme !== 'undefined' && Theme.apply) {
      var mode = prefs.mode || 'dark';
      if (mode === 'auto') {
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        Theme.apply(prefersDark ? 'dark' : 'light');
      } else {
        Theme.apply(mode);
      }
    }
  }

  function getSettingValue(key) {
    for (var i = 0; i < state.settings.length; i++) {
      if (state.settings[i].Setting === key) return state.settings[i].Value || '';
    }
    return '';
  }

  function parseListValues(val) {
    if (!val) return [];
    return val.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; });
  }

  function iconBtn(type, onclick, title, extraClass) {
    var svg = type === 'edit' ? EDIT_SVG : TRASH_SVG;
    var cls = 'settings-icon-btn' + (extraClass ? ' ' + extraClass : '');
    return '<button class="' + cls + '" onclick="' + onclick + '" title="' + esc(title) + '">' + svg + '</button>';
  }

  function renderList(containerId, values, settingKey) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (values.length === 0) {
      el.innerHTML = '<div class="settings-list-empty">No items</div>';
      return;
    }
    var html = '';
    values.forEach(function(v) {
      html += '<div class="list-item"><span>' + esc(v) + '</span>' +
        '<button class="settings-remove-btn" onclick="Settings.removeSimpleValue(\'' + settingKey + '\',\'' + v.replace(/'/g, "\\'") + '\')">Remove</button></div>';
    });
    el.innerHTML = html;
  }

  function renderAllSimpleLists() {
    var keys = ['areas','lines','jobTypes','priorities','machineTypes'];
    var containers = ['areasList','linesList','jobTypesList','prioritiesList','machineTypesList'];
    keys.forEach(function(key, idx) {
      renderList(containers[idx], parseListValues(getSettingValue(key)), key);
    });
  }

  function renderDepartmentList() {
    var el = document.getElementById('deptList');
    if (!el) return;
    var active = state.departments.filter(function(d) { return d.Status === 'Active'; });
    if (active.length === 0) {
      el.innerHTML = '<div class="settings-list-empty">No departments</div>';
      return;
    }
    var html = '';
    active.forEach(function(d) {
      html += '<div class="list-item"><span>' + esc(d.Name) + '</span>' +
        '<button class="settings-remove-btn" onclick="Settings.deleteDept(\'' + (d.ID || '').replace(/'/g, "\\'") + '\')">Remove</button></div>';
    });
    el.innerHTML = html;
  }

  function renderThemePrefsUI() {
    var prefs = loadThemePrefs();
    var sections = {
      themeModeOptions: prefs.mode || 'dark',
      cardStyleOptions: prefs.cardStyle || 'glass',
      sidebarStyleOptions: prefs.sidebarStyle || 'default',
      fontSizeOptions: prefs.fontSize || 'medium'
    };
    Object.keys(sections).forEach(function(containerId) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var btns = el.querySelectorAll('.theme-option');
      btns.forEach(function(btn) {
        if (btn.getAttribute('data-value') === sections[containerId]) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    });
    var colorContainer = document.getElementById('accentColorOptions');
    if (colorContainer) {
      var swatches = colorContainer.querySelectorAll('.color-swatch');
      swatches.forEach(function(s) {
        if (s.getAttribute('data-value') === (prefs.accentColor || '#6366f1')) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    }
  }

  function renderUsersTable() {
    var container = document.getElementById('usersTableContainer');
    if (!container) return;
    var list = state.users;
    var result = Table.paginate(list, state.usersPage, PAGE_SIZE);
    var html = '<div class="table-responsive"><table class="data-table user-perms-table"><thead><tr>' +
      '<th>EmpID</th><th>Name</th><th>Email</th><th>Dept</th><th>Section</th><th>Role</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>';

    if (result.items.length === 0) {
      html += '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No users found.</td></tr>';
    } else {
      result.items.forEach(function(u) {
        var rb = ROLE_BADGES[u.Role] || 'secondary';
        var statusClass = u.Status === 'Active' ? 'success' : (u.Status === 'Blocked' ? 'danger' : 'secondary');
        var emailEsc = esc(u.Email).replace(/'/g, "\\'");
        html += '<tr>' +
          '<td>' + esc(u.EmployeeID || '-') + '</td>' +
          '<td>' + esc(u.Name || '') + '</td>' +
          '<td>' + esc(u.Email || '') + '</td>' +
          '<td>' + esc(u.Department || '') + '</td>' +
          '<td>' + esc(u.Section || '-') + '</td>' +
          '<td><span class="badge badge-' + rb + '">' + esc(u.Role) + '</span></td>' +
          '<td>' + statusToggleHtml(u) + '</td>' +
          '<td class="actions-cell">' +
            '<button class="settings-icon-btn" onclick="Settings.openEditUser(\'' + emailEsc + '\')" title="Edit">' + EDIT_SVG + '</button>' +
            '<button class="settings-icon-btn settings-icon-btn-danger" onclick="Settings.deleteUser(\'' + emailEsc + '\')" title="Delete">' + TRASH_SVG + '</button>' +
          '</td></tr>';
      });
    }
    html += '</tbody></table></div>';

    if (result.totalPages > 1) {
      html += '<div class="pagination">';
      html += '<button class="btn-sm" ' + (result.page <= 1 ? 'disabled' : '') + ' onclick="Settings.usersPrevPage()">&#8249;</button>';
      for (var i = 1; i <= result.totalPages; i++) {
        if (result.totalPages <= 7 || Math.abs(i - result.page) <= 2 || i === 1 || i === result.totalPages) {
          html += '<button class="btn-sm ' + (i === result.page ? 'active' : '') + '" onclick="Settings.usersGoToPage(' + i + ')">' + i + '</button>';
        } else if (Math.abs(i - result.page) === 3) {
          html += '<span class="pagination-ellipsis">...</span>';
        }
      }
      html += '<button class="btn-sm" ' + (result.page >= result.totalPages ? 'disabled' : '') + ' onclick="Settings.usersNextPage()">&#8250;</button>';
      html += '</div>';
    }
    html += '<div class="table-info">Showing ' + (list.length > 0 ? ((result.page - 1) * PAGE_SIZE + 1) : 0) + '-' + Math.min(result.page * PAGE_SIZE, result.total) + ' of ' + result.total + ' records</div>';

    container.innerHTML = html;
  }

  function statusToggleHtml(u) {
    if (u.Status === 'Active') {
      return '<span class="status-toggle-btn status-active" onclick="Settings.toggleStatus(\'' + esc(u.Email).replace(/'/g, "\\'") + '\',\'Inactive\')" title="Click to deactivate">Active</span>';
    } else if (u.Status === 'Blocked') {
      return '<span class="status-toggle-btn status-blocked" onclick="Settings.toggleStatus(\'' + esc(u.Email).replace(/'/g, "\\'") + '\',\'Active\')" title="Click to unblock">Blocked</span>';
    } else {
      return '<span class="status-toggle-btn status-inactive" onclick="Settings.toggleStatus(\'' + esc(u.Email).replace(/'/g, "\\'") + '\',\'Active\')" title="Click to activate">Inactive</span>';
    }
  }

  function injectStyles() {
    if (document.getElementById('settingsPageStyles')) return;
    var style = document.createElement('style');
    style.id = 'settingsPageStyles';
    style.textContent =
      '.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}' +
      '.list-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-input,rgba(255,255,255,0.05));border-radius:var(--radius-sm,6px);margin-bottom:6px;font-size:13px}' +
      '.list-item span{color:var(--text)}' +
      '.settings-remove-btn{background:transparent;border:1px solid var(--danger,#ef4444);color:var(--danger,#ef4444);padding:3px 10px;border-radius:var(--radius-sm,4px);cursor:pointer;font-size:11px;transition:var(--transition,all 0.2s)}' +
      '.settings-remove-btn:hover{background:var(--danger,#ef4444);color:#fff}' +
      '.settings-list-empty{color:var(--text-muted,#888);padding:8px 0;font-size:13px}' +
      '.inline-flex{display:inline-flex;gap:8px;align-items:center}' +
      '.mb-12{margin-bottom:12px}' +
      '.theme-section{margin-bottom:20px}' +
      '.theme-section label{display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px}' +
      '.theme-options{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
      '.theme-option{padding:6px 16px;border-radius:var(--radius-sm,6px);border:1px solid var(--border);background:var(--bg-input,rgba(255,255,255,0.05));color:var(--text-secondary,#aaa);cursor:pointer;font-size:13px;transition:var(--transition,all 0.2s)}' +
      '.theme-option:hover{border-color:var(--primary);color:var(--primary)}' +
      '.theme-option.active{background:var(--primary);color:#fff;border-color:var(--primary)}' +
      '.color-swatch{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:var(--transition,all 0.2s);padding:0}' +
      '.color-swatch:hover{transform:scale(1.15)}' +
      '.color-swatch.active{border-color:var(--text);box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--text)}' +
      '.perm-checkbox-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px}' +
      '.perm-checkbox{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text);cursor:pointer}' +
      '.perm-checkbox input[type="checkbox"]{width:15px;height:15px;accent-color:var(--primary)}' +
      '.user-perms-table .actions-cell{display:flex;gap:4px;align-items:center}' +
      '.status-toggle-btn{padding:2px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;display:inline-block}' +
      '.status-active{background:rgba(34,197,94,0.15);color:#22c55e}' +
      '.status-active:hover{background:rgba(34,197,94,0.25)}' +
      '.status-inactive{background:rgba(156,163,175,0.15);color:#9ca3af}' +
      '.status-inactive:hover{background:rgba(156,163,175,0.25)}' +
      '.status-blocked{background:rgba(239,68,68,0.15);color:#ef4444}' +
      '.status-blocked:hover{background:rgba(239,68,68,0.25)}' +
      '.settings-icon-btn{background:transparent;border:none;color:var(--primary);cursor:pointer;padding:4px;border-radius:var(--radius-sm,4px);display:inline-flex;align-items:center;transition:var(--transition,all 0.2s)}' +
      '.settings-icon-btn:hover{background:rgba(99,102,241,0.1)}' +
      '.settings-icon-btn svg{width:16px;height:16px}' +
      '.settings-icon-btn-danger{color:var(--danger,#ef4444)}' +
      '.settings-icon-btn-danger:hover{background:rgba(239,68,68,0.1)}';
    document.head.appendChild(style);
  }

  function buildPageHtml() {
    var themeModeBtns = [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'auto', label: 'Auto' }
    ];
    var cardStyleBtns = [
      { value: 'glass', label: 'Glass' },
      { value: 'solid', label: 'Solid' }
    ];
    var sidebarStyleBtns = [
      { value: 'default', label: 'Default' },
      { value: 'borderless', label: 'Borderless' },
      { value: 'elevated', label: 'Elevated' }
    ];
    var fontSizeBtns = [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' }
    ];

    function themeBtns(arr, containerId, prefKey) {
      var html = '<div class="theme-options" id="' + containerId + '">';
      arr.forEach(function(b) {
        html += '<button class="theme-option" data-value="' + b.value + '" onclick="Settings.setThemePref(\'' + prefKey + '\',\'' + b.value + '\')">' + b.label + '</button>';
      });
      html += '</div>';
      return html;
    }

    function colorSwatches() {
      var html = '<div class="theme-options" id="accentColorOptions">';
      THEME_COLORS.forEach(function(c) {
        html += '<button class="color-swatch" data-value="' + c.color + '" style="background:' + c.color + '" onclick="Settings.setThemePref(\'accentColor\',\'' + c.color + '\')" title="' + c.name + '"></button>';
      });
      html += '</div>';
      return html;
    }

    function simpleListSection(label, settingKey, inputId, placeholder) {
      return '<h3 style="margin:24px 0 16px;font-size:15px">' + esc(label) + '</h3>' +
        '<div class="inline-flex mb-12">' +
          '<input type="text" class="form-control" id="' + inputId + '" placeholder="' + esc(placeholder) + '">' +
          '<button class="btn btn-primary" onclick="Settings.addSimpleValue(\'' + settingKey + '\',\'' + inputId + '\')">' + PLUS_CIRCLE_SVG + ' Add</button>' +
        '</div>' +
        '<div id="' + settingKey + 'List"></div>';
    }

    var roleOpts = '<option value="Admin">Admin</option>' +
      '<option value="Department Manager">Department Manager</option>' +
      '<option value="Maintenance Manager">Maintenance Manager</option>' +
      '<option value="Supervisor">Supervisor</option>' +
      '<option value="Technician">Technician</option>' +
      '<option value="Operator">Operator</option>' +
      '<option value="Viewer">Viewer</option>';

    function permCheckbox(name, label) {
      return '<label class="perm-checkbox"><input type="checkbox" name="' + name + '"> ' + label + '</label>';
    }

    return '' +
      '<div class="page">' +

        '<div class="card">' +
          '<div class="card-header"><div class="card-title">Settings</div></div>' +
          '<div class="settings-grid">' +
            '<div>' +
              '<h3 style="margin-bottom:16px;font-size:15px">Departments</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newDept" placeholder="New department name">' +
                '<button class="btn btn-primary" onclick="Settings.addDept()">' + PLUS_CIRCLE_SVG + ' Add</button>' +
              '</div>' +
              '<div id="deptList"></div>' +

              simpleListSection('Areas', 'areas', 'newArea', 'New area') +
              simpleListSection('Lines', 'lines', 'newLine', 'New line') +
            '</div>' +
            '<div>' +
              simpleListSection('Job Types', 'jobTypes', 'newJobType', 'New job type') +
              simpleListSection('Priorities', 'priorities', 'newPriority', 'New priority') +
              simpleListSection('Machine Types', 'machineTypes', 'newMachineType', 'New machine type') +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card" id="themeSettingsCard">' +
          '<div class="card-header"><div class="card-title">Theme & Display</div></div>' +
          '<div class="theme-section">' +
            '<label>Theme Mode</label>' +
            themeBtns(themeModeBtns, 'themeModeOptions', 'mode') +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Accent Color</label>' +
            colorSwatches() +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Card Style</label>' +
            themeBtns(cardStyleBtns, 'cardStyleOptions', 'cardStyle') +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Sidebar Style</label>' +
            themeBtns(sidebarStyleBtns, 'sidebarStyleOptions', 'sidebarStyle') +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Font Size</label>' +
            themeBtns(fontSizeBtns, 'fontSizeOptions', 'fontSize') +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">User Management</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-primary" onclick="Settings.openAddUser()">' + PLUS_CIRCLE_SVG + ' Add User</button>' +
            '</div>' +
          '</div>' +
          '<div id="usersTableContainer"></div>' +
        '</div>' +

      '</div>' +

      '<div class="modal-overlay" id="settingsUserFormModal">' +
        '<div class="modal" style="max-width:720px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="settingsUserFormTitle">Add User</div>' +
            '<button class="modal-close" onclick="Settings.closeUserModal()">&times;</button>' +
          '</div>' +
          '<form id="settingsUserForm" onsubmit="return false">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="originalEmail" id="settingsEditUserEmail">' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Employee ID</label><input type="text" name="EmployeeID" class="form-control" id="settingsEmpId" placeholder="e.g. EMP-001"></div>' +
                '<div class="form-group"><label>Email *</label><input type="email" name="Email" class="form-control" id="settingsUserEmail" required></div>' +
              '</div>' +
              '<div class="form-group"><label>Name *</label><input type="text" name="Name" class="form-control" id="settingsUserName" required></div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Password *</label><input type="password" name="Password" class="form-control" id="settingsUserPassword"></div>' +
                '<div class="form-group"><label>Mobile</label><input type="text" name="Mobile" class="form-control" id="settingsUserMobile" placeholder="e.g. 9876543210"></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Department</label><select name="Department" class="form-control" id="settingsUserDeptSelect" onchange="Settings.onDeptChange()"><option value="">Select Department</option></select></div>' +
                '<div class="form-group"><label>Section</label><select name="Section" class="form-control" id="settingsUserSectionSelect"><option value="">Select Section</option></select></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Designation</label><input type="text" name="Designation" class="form-control" placeholder="Job title / designation"></div>' +
                '<div class="form-group"><label>Role</label><select name="Role" class="form-control">' + roleOpts + '</select></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Blocked">Blocked</option></select></div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">Job Card Permissions</label>' +
                '<div class="perm-checkbox-grid">' +
                  permCheckbox('CanOpenJobCard', 'Open Job Card') +
                  permCheckbox('CanStartJobCard', 'Start Job Card') +
                  permCheckbox('CanCloseJobCard', 'Close Job Card') +
                  permCheckbox('CanApproveJobCard', 'Approve Job Card') +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">Management Permissions</label>' +
                '<div class="perm-checkbox-grid">' +
                  permCheckbox('CanManageMachines', 'Manage Machines') +
                  permCheckbox('CanManageAssets', 'Manage Assets') +
                  permCheckbox('CanManageSpareParts', 'Manage Spare Parts') +
                  permCheckbox('CanManagePM', 'Manage PM') +
                  permCheckbox('CanManageTechnicians', 'Manage Technicians') +
                  permCheckbox('CanManageDepartments', 'Manage Departments') +
                  permCheckbox('CanManageSections', 'Manage Sections') +
                  permCheckbox('CanManageUsers', 'Manage Users') +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">General Permissions</label>' +
                '<div class="perm-checkbox-grid">' +
                  permCheckbox('CanViewDashboard', 'View Dashboard') +
                  permCheckbox('CanViewReports', 'View Reports') +
                  permCheckbox('IsAdmin', 'System Administrator') +
                '</div>' +
                '<small style="color:var(--text-muted);font-size:11px">System Administrator overrides all individual permissions</small>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Settings.closeUserModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary" id="settingsUserSaveBtn" onclick="Settings.saveUser()">' + PLUS_CIRCLE_SVG + ' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function getFormData() {
    var form = document.getElementById('settingsUserForm');
    if (!form) return {};
    var data = {};
    var inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function(el) {
      if (el.name) {
        if (el.type === 'checkbox') {
          data[el.name] = el.checked;
        } else {
          data[el.name] = el.value;
        }
      }
    });
    return data;
  }

  function setFormData(item) {
    var form = document.getElementById('settingsUserForm');
    if (!form) return;
    var el;
    el = document.getElementById('settingsEditUserEmail'); if (el) el.value = item.Email || '';
    el = document.getElementById('settingsEmpId'); if (el) el.value = item.EmployeeID || '';
    el = document.getElementById('settingsUserEmail'); if (el) el.value = item.Email || '';
    el = document.getElementById('settingsUserName'); if (el) el.value = item.Name || '';
    el = document.getElementById('settingsUserMobile'); if (el) el.value = item.Mobile || '';
    var nameInput = form.querySelector('[name="Name"]');
    if (nameInput) nameInput.value = item.Name || '';
    var designationInput = form.querySelector('[name="Designation"]');
    if (designationInput) designationInput.value = item.Designation || '';
    var roleSel = form.querySelector('[name="Role"]');
    if (roleSel) roleSel.value = item.Role || 'Technician';
    var statusSel = form.querySelector('[name="Status"]');
    if (statusSel) statusSel.value = item.Status || 'Active';
    PERM_FIELDS.forEach(function(f) {
      var cb = form.querySelector('[name="' + f + '"]');
      if (cb) {
        var val = item[f];
        cb.checked = val === true || val === 'Yes' || val === 'true' || val === 'TRUE';
      }
    });
  }

  function clearFormData() {
    var form = document.getElementById('settingsUserForm');
    if (form) form.reset();
    var el;
    el = document.getElementById('settingsEditUserEmail'); if (el) el.value = '';
    el = document.getElementById('settingsEmpId'); if (el) el.value = '';
    el = document.getElementById('settingsUserEmail'); if (el) { el.disabled = false; el.value = ''; }
    el = document.getElementById('settingsUserName'); if (el) el.value = '';
    el = document.getElementById('settingsUserPassword'); if (el) { el.required = true; el.value = ''; }
    el = document.getElementById('settingsUserMobile'); if (el) el.value = '';
    el = document.getElementById('settingsUserSectionSelect'); if (el) el.innerHTML = '<option value="">Select Section</option>';
    PERM_FIELDS.forEach(function(f) {
      var cb = form.querySelector('[name="' + f + '"]');
      if (cb) cb.checked = false;
    });
  }

  function populateDeptDropdown(selectedVal) {
    var sel = document.getElementById('settingsUserDeptSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Department</option>';
    state.departments.forEach(function(d) {
      if (d.Status !== 'Active') return;
      var opt = document.createElement('option');
      opt.value = d.Name || '';
      opt.textContent = d.Name || '';
      if (selectedVal && d.Name === selectedVal) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function populateSectionDropdown(selectedVal) {
    var sel = document.getElementById('settingsUserSectionSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Section</option>';
    API.post('getSectionList', {}).then(function(sections) {
      (sections || []).forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.Section || '';
        opt.textContent = s.Section || '';
        if (selectedVal && s.Section === selectedVal) opt.selected = true;
        sel.appendChild(opt);
      });
    }).catch(function() {});
  }

  function loadAllData() {
    Loader.show();
    Promise.all([
      API.post('getSettingsData', {}),
      API.post('getUsers', {})
    ]).then(function(results) {
      Loader.hide();
      var settingsData = results[0] || {};
      state.departments = settingsData.departments || [];
      state.settings = settingsData.settings || [];
      state.users = Array.isArray(results[1]) ? results[1] : ((results[1] && results[1].data) ? results[1].data : []);
      renderDepartmentList();
      renderAllSimpleLists();
      renderUsersTable();
      renderThemePrefsUI();
    }).catch(function(err) {
      Loader.hide();
      Notify.error(err.message || 'Failed to load settings data');
    });
  }

  function loadSettingsOnly() {
    API.post('getSettingsData', {}).then(function(data) {
      var sd = data || {};
      state.departments = sd.departments || [];
      state.settings = sd.settings || [];
      renderDepartmentList();
      renderAllSimpleLists();
    }).catch(function() {});
  }

  function loadUsersOnly() {
    API.post('getUsers', {}).then(function(res) {
      state.users = Array.isArray(res) ? res : ((res && res.data) ? res.data : []);
      state.usersPage = 1;
      renderUsersTable();
    }).catch(function() {});
  }

  return {
    show: function(el) {
      if (!el) el = document.getElementById('pageContent');
      if (!el) return;
      injectStyles();
      el.innerHTML = buildPageHtml();
      loadAllData();
    },

    setThemePref: function(key, value) {
      var prefs = loadThemePrefs();
      prefs[key] = value;
      saveThemePrefs(prefs);
      renderThemePrefsUI();
      if (key === 'accentColor') {
        Theme.applyAccent(value);
      }
      Notify.success(key === 'accentColor' ? 'Accent color updated' : 'Theme preference saved');
    },

    addDept: function() {
      var input = document.getElementById('newDept');
      var name = input ? input.value.trim() : '';
      if (!name) { Notify.warning('Enter department name'); return; }
      Loader.show();
      API.post('addDepartment', { name: name }).then(function(data) {
        Loader.hide();
        if (input) input.value = '';
        state.departments = Array.isArray(data) ? data : (data && data.departments ? data.departments : state.departments);
        renderDepartmentList();
        Notify.success('Department added');
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to add department');
      });
    },

    deleteDept: function(id) {
      Modal.confirm('Remove Department', 'Are you sure?', function() {
        Loader.show();
        API.post('deleteDepartment', { id: id }).then(function(data) {
          Loader.hide();
          state.departments = Array.isArray(data) ? data : (data && data.departments ? data.departments : state.departments);
          renderDepartmentList();
          Notify.success('Department removed');
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete department');
        });
      });
    },

    addSimpleValue: function(key, inputId) {
      var input = document.getElementById(inputId);
      var value = input ? input.value.trim() : '';
      if (!value) { Notify.warning('Enter a value'); return; }
      var existing = getSettingValue(key);
      var values = parseListValues(existing);
      if (values.indexOf(value) !== -1) { Notify.warning('Value already exists'); return; }
      values.push(value);
      Loader.show();
      API.post('saveSettingValue', { key: key, value: values.join(',') }).then(function(data) {
        Loader.hide();
        if (data && data.settings) state.settings = data.settings;
        if (input) input.value = '';
        renderAllSimpleLists();
        Notify.success('Saved');
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to save');
      });
    },

    removeSimpleValue: function(key, value) {
      var existing = getSettingValue(key);
      var values = parseListValues(existing);
      values = values.filter(function(v) { return v !== value; });
      Loader.show();
      API.post('saveSettingValue', { key: key, value: values.join(',') }).then(function(data) {
        Loader.hide();
        if (data && data.settings) state.settings = data.settings;
        renderAllSimpleLists();
        Notify.success('Removed');
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to remove value');
      });
    },

    usersGoToPage: function(p) { state.usersPage = p; renderUsersTable(); },
    usersPrevPage: function() { if (state.usersPage > 1) { state.usersPage--; renderUsersTable(); } },
    usersNextPage: function() {
      var totalPages = Math.ceil(state.users.length / PAGE_SIZE) || 1;
      if (state.usersPage < totalPages) { state.usersPage++; renderUsersTable(); }
    },

    openAddUser: function() {
      state.editingEmail = '';
      clearFormData();
      var el;
      el = document.getElementById('settingsUserFormTitle'); if (el) el.textContent = 'Add User';
      el = document.getElementById('settingsUserPassword'); if (el) el.required = true;
      var btn = document.getElementById('settingsUserSaveBtn'); if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
      populateDeptDropdown('');
      Modal.show('settingsUserFormModal');
    },

    openEditUser: function(email) {
      var user = null;
      for (var i = 0; i < state.users.length; i++) {
        if (state.users[i].Email === email) { user = state.users[i]; break; }
      }
      if (!user) { Notify.error('User not found'); return; }
      state.editingEmail = email;
      setFormData(user);
      var el;
      el = document.getElementById('settingsUserFormTitle'); if (el) el.textContent = 'Edit User - ' + email;
      el = document.getElementById('settingsUserEmail'); if (el) el.disabled = true;
      el = document.getElementById('settingsUserPassword'); if (el) el.required = false;
      populateDeptDropdown(user.Department || '');
      if (user.Department) {
        setTimeout(function() { populateSectionDropdown(user.Section || ''); }, 200);
      } else {
        populateSectionDropdown('');
      }
      var btn = document.getElementById('settingsUserSaveBtn'); if (btn) { btn.textContent = 'Update'; btn.disabled = false; }
      Modal.show('settingsUserFormModal');
    },

    closeUserModal: function() {
      Modal.hide('settingsUserFormModal');
      state.editingEmail = '';
      var el = document.getElementById('settingsUserEmail');
      if (el) el.disabled = false;
    },

    onDeptChange: function() {
      populateSectionDropdown('');
    },

    saveUser: function() {
      var data = getFormData();
      if (!data.Name || !data.Name.trim()) { Notify.error('Name is required'); return; }
      if (!data.Email || !data.Email.trim()) { Notify.error('Email is required'); return; }

      var isEdit = !!state.editingEmail;
      if (!isEdit && (!data.Password || !data.Password.trim())) {
        Notify.error('Password is required for new users'); return;
      }

      var payload = {
        EmployeeID: (data.EmployeeID || '').trim(),
        Name: (data.Name || '').trim(),
        Email: (data.Email || '').trim(),
        Mobile: (data.Mobile || '').trim(),
        Department: data.Department || '',
        Section: data.Section || '',
        Designation: (data.Designation || '').trim(),
        Role: data.Role || 'Technician',
        Status: data.Status || 'Active'
      };
      if (data.Password && data.Password.trim()) {
        payload.Password = data.Password.trim();
      }
      PERM_FIELDS.forEach(function(f) {
        payload[f] = data[f] ? 'TRUE' : 'FALSE';
      });

      var btn = document.getElementById('settingsUserSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = isEdit ? 'Updating...' : 'Saving...'; }

      var action = isEdit ? 'updateUser' : 'addUser';
      if (isEdit) payload.email = state.editingEmail;

      API.post(action, payload).then(function(result) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Settings.closeUserModal();
        Notify.success(isEdit ? 'User updated' : 'User added');
        loadUsersOnly();
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Notify.error(err.message || 'Failed to save user');
      });
    },

    toggleStatus: function(email, newStatus) {
      Loader.show();
      API.post('updateUser', { email: email, Status: newStatus }).then(function() {
        Loader.hide();
        Notify.success('Status updated to ' + newStatus);
        loadUsersOnly();
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to update status');
      });
    },

    deleteUser: function(email) {
      Modal.confirm('Delete User', 'Are you sure you want to delete this user?', function() {
        Loader.show();
        API.post('deleteUser', { email: email }).then(function() {
          Loader.hide();
          Notify.success('User deleted');
          loadUsersOnly();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete user');
        });
      });
    }
  };
})();
