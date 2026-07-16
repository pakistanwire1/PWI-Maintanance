/* ============================================================
   settings.js — Settings Page Module
   GAS-identical: SettingsPage.html
   ============================================================ */

(function() {
  var usersData = [];
  var usersPage = 1;

  var PERM_FIELDS = [
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
    'CanManageMachines','CanManageAssets','CanManageSpareParts','CanManagePM',
    'CanManageTechnicians','CanManageDepartments','CanManageSections','CanManageUsers',
    'CanViewDashboard','CanViewReports','IsAdmin'
  ];

  App.registerPage('settings', render, load);

  function render() {
    var el = document.getElementById('page-settings');
    var plusSvg = ICONS.plus;
    var saveSvg = ICONS.save;
    el.innerHTML =
      '<div id="settingsPage">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Settings</div>' +
          '</div>' +
          '<div class="settings-grid">' +
            '<div>' +
              '<h3 style="margin-bottom:16px;font-size:15px">Departments</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newDept" placeholder="New department name">' +
                '<button class="btn btn-primary" onclick="settingsAddDepartment()">'+plusSvg+' Add</button>' +
              '</div>' +
              '<div id="deptList"></div>' +

              '<h3 style="margin:24px 0 16px;font-size:15px">Areas</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newArea" placeholder="New area">' +
                '<button class="btn btn-primary" onclick="settingsSaveSimpleSetting(\'areas\',\'newArea\')">'+plusSvg+' Add</button>' +
              '</div>' +
              '<div id="areasList"></div>' +

              '<h3 style="margin:24px 0 16px;font-size:15px">Lines</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newLine" placeholder="New line">' +
                '<button class="btn btn-primary" onclick="settingsSaveSimpleSetting(\'lines\',\'newLine\')">'+plusSvg+' Add</button>' +
              '</div>' +
              '<div id="linesList"></div>' +
            '</div>' +
            '<div>' +
              '<h3 style="margin-bottom:16px;font-size:15px">Job Types</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newJobType" placeholder="New job type">' +
                '<button class="btn btn-primary" onclick="settingsSaveSimpleSetting(\'jobTypes\',\'newJobType\')">'+plusSvg+' Add</button>' +
              '</div>' +
              '<div id="jobTypesList"></div>' +

              '<h3 style="margin:24px 0 16px;font-size:15px">Priorities</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newPriority" placeholder="New priority">' +
                '<button class="btn btn-primary" onclick="settingsSaveSimpleSetting(\'priorities\',\'newPriority\')">'+plusSvg+' Add</button>' +
              '</div>' +
              '<div id="prioritiesList"></div>' +

              '<h3 style="margin:24px 0 16px;font-size:15px">Machine Types</h3>' +
              '<div class="inline-flex mb-12">' +
                '<input type="text" class="form-control" id="newMachineType" placeholder="New machine type">' +
                '<button class="btn btn-primary" onclick="settingsSaveSimpleSetting(\'machineTypes\',\'newMachineType\')">'+plusSvg+' Add</button>' +
              '</div>' +
              '<div id="machineTypesList"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card" id="themeSettingsCard">' +
          '<div class="card-header">' +
            '<div class="card-title">Theme &amp; Display</div>' +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Theme Mode</label>' +
            '<div class="theme-options" id="themeModeOptions">' +
              '<button class="theme-option" data-value="dark" onclick="settingsSetThemePref(\'mode\',\'dark\')">Dark</button>' +
              '<button class="theme-option" data-value="light" onclick="settingsSetThemePref(\'mode\',\'light\')">Light</button>' +
              '<button class="theme-option" data-value="auto" onclick="settingsSetThemePref(\'mode\',\'auto\')">Auto</button>' +
            '</div>' +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Accent Color</label>' +
            '<div class="theme-options" id="accentColorOptions">' +
              '<button class="color-swatch" data-value="#6366f1" style="background:#6366f1" onclick="settingsSetThemePref(\'accentColor\',\'#6366f1\')" title="Indigo"></button>' +
              '<button class="color-swatch" data-value="#3b82f6" style="background:#3b82f6" onclick="settingsSetThemePref(\'accentColor\',\'#3b82f6\')" title="Blue"></button>' +
              '<button class="color-swatch" data-value="#06b6d4" style="background:#06b6d4" onclick="settingsSetThemePref(\'accentColor\',\'#06b6d4\')" title="Cyan"></button>' +
              '<button class="color-swatch" data-value="#22c55e" style="background:#22c55e" onclick="settingsSetThemePref(\'accentColor\',\'#22c55e\')" title="Green"></button>' +
              '<button class="color-swatch" data-value="#f59e0b" style="background:#f59e0b" onclick="settingsSetThemePref(\'accentColor\',\'#f59e0b\')" title="Amber"></button>' +
              '<button class="color-swatch" data-value="#ef4444" style="background:#ef4444" onclick="settingsSetThemePref(\'accentColor\',\'#ef4444\')" title="Red"></button>' +
              '<button class="color-swatch" data-value="#a855f7" style="background:#a855f7" onclick="settingsSetThemePref(\'accentColor\',\'#a855f7\')" title="Purple"></button>' +
              '<button class="color-swatch" data-value="#f97316" style="background:#f97316" onclick="settingsSetThemePref(\'accentColor\',\'#f97316\')" title="Orange"></button>' +
            '</div>' +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Card Style</label>' +
            '<div class="theme-options" id="cardStyleOptions">' +
              '<button class="theme-option" data-value="glass" onclick="settingsSetThemePref(\'cardStyle\',\'glass\')">Glass</button>' +
              '<button class="theme-option" data-value="solid" onclick="settingsSetThemePref(\'cardStyle\',\'solid\')">Solid</button>' +
            '</div>' +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Sidebar Style</label>' +
            '<div class="theme-options" id="sidebarStyleOptions">' +
              '<button class="theme-option" data-value="default" onclick="settingsSetThemePref(\'sidebarStyle\',\'default\')">Default</button>' +
              '<button class="theme-option" data-value="borderless" onclick="settingsSetThemePref(\'sidebarStyle\',\'borderless\')">Borderless</button>' +
              '<button class="theme-option" data-value="elevated" onclick="settingsSetThemePref(\'sidebarStyle\',\'elevated\')">Elevated</button>' +
            '</div>' +
          '</div>' +
          '<div class="theme-section">' +
            '<label>Font Size</label>' +
            '<div class="theme-options" id="fontSizeOptions">' +
              '<button class="theme-option" data-value="small" onclick="settingsSetThemePref(\'fontSize\',\'small\')">Small</button>' +
              '<button class="theme-option" data-value="medium" onclick="settingsSetThemePref(\'fontSize\',\'medium\')">Medium</button>' +
              '<button class="theme-option" data-value="large" onclick="settingsSetThemePref(\'fontSize\',\'large\')">Large</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">User Management</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-primary" onclick="settingsOpenUserForm()">'+plusSvg+' Add User</button>' +
            '</div>' +
          '</div>' +
          '<div id="usersTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="userFormModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="userFormTitle">Add User</div>' +
            '<button class="modal-close" onclick="hideModal(\'userFormModal\')">&times;</button>' +
          '</div>' +
          '<form id="userForm" onsubmit="return settingsSaveUser(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="originalEmail" id="editUserEmail">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Employee ID</label>' +
                  '<input type="text" name="EmployeeID" class="form-control" placeholder="e.g. EMP-001">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Email *</label>' +
                  '<input type="email" name="Email" class="form-control" required id="userEmail">' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Name *</label>' +
                '<input type="text" name="Name" class="form-control" required>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Password *</label>' +
                  '<input type="password" name="Password" class="form-control" id="userPassword">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Mobile</label>' +
                  '<input type="text" name="Mobile" class="form-control" placeholder="e.g. 9876543210">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Department</label>' +
                  '<select name="Department" class="form-control" id="userDepartmentSelect" onchange="settingsOnUserDeptChange()">' +
                    '<option value="">Select Department</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Section</label>' +
                  '<select name="Section" class="form-control" id="userSectionSelect">' +
                    '<option value="">Select Section</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Designation</label>' +
                  '<input type="text" name="Designation" class="form-control" placeholder="Job title / designation">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Role</label>' +
                  '<select name="Role" class="form-control">' +
                    '<option value="Admin">Admin</option>' +
                    '<option value="Department Manager">Department Manager</option>' +
                    '<option value="Maintenance Manager">Maintenance Manager</option>' +
                    '<option value="Supervisor">Supervisor</option>' +
                    '<option value="Technician">Technician</option>' +
                    '<option value="Operator">Operator</option>' +
                    '<option value="Viewer">Viewer</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Status</label>' +
                  '<select name="Status" class="form-control">' +
                    '<option value="Active">Active</option>' +
                    '<option value="Inactive">Inactive</option>' +
                    '<option value="Blocked">Blocked</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">Job Card Permissions</label>' +
                '<div class="perm-checkbox-grid">' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanOpenJobCard"> Open Job Card</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanStartJobCard"> Start Job Card</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanCloseJobCard"> Close Job Card</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanApproveJobCard"> Approve Job Card</label>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">Management Permissions</label>' +
                '<div class="perm-checkbox-grid">' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageMachines"> Manage Machines</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageAssets"> Manage Assets</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageSpareParts"> Manage Spare Parts</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManagePM"> Manage PM</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageTechnicians"> Manage Technicians</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageDepartments"> Manage Departments</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageSections"> Manage Sections</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanManageUsers"> Manage Users</label>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">General Permissions</label>' +
                '<div class="perm-checkbox-grid">' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanViewDashboard"> View Dashboard</label>' +
                  '<label class="perm-checkbox"><input type="checkbox" name="CanViewReports"> View Reports</label>' +
                  '<label class="perm-checkbox perm-checkbox-admin"><input type="checkbox" name="IsAdmin"> System Administrator</label>' +
                '</div>' +
                '<small style="color:var(--text-muted);font-size:11px">System Administrator overrides all individual permissions</small>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="hideModal(\'userFormModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">'+saveSvg+' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    settingsLoadDepartments();
    settingsLoadSimpleSettings();
    settingsLoadUsers();
    settingsInitThemeUI();
    setTimeout(function() { App.showLoading(false); }, 5000);
  }

  /* ==================== THEME ==================== */

  function settingsInitThemeUI() {
    var prefs = loadTheme();
    document.querySelectorAll('#themeModeOptions .theme-option').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.value === prefs.mode);
    });
    document.querySelectorAll('#accentColorOptions .color-swatch').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.value === prefs.accentColor);
    });
    document.querySelectorAll('#cardStyleOptions .theme-option').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.value === prefs.cardStyle);
    });
    document.querySelectorAll('#sidebarStyleOptions .theme-option').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.value === prefs.sidebarStyle);
    });
    document.querySelectorAll('#fontSizeOptions .theme-option').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.value === prefs.fontSize);
    });
  }

  window.settingsSetThemePref = function(key, value) {
    var prefs = loadTheme();
    prefs[key] = value;
    saveThemePrefs(prefs);
    applyTheme(prefs);
    settingsInitThemeUI();
    App.showToast(key === 'accentColor' ? 'Accent color updated' : 'Theme preference saved', 'success');
  };

  /* ==================== DEPARTMENTS ==================== */

  function settingsLoadDepartments() {
    API.call('getDepartmentList')
      .then(function(data) {
        var html = '';
        var deptSelect = document.getElementById('userDepartmentSelect');
        if (deptSelect) {
          deptSelect.innerHTML = '<option value="">Select Department</option>';
          (data || []).forEach(function(d) {
            if (d.Status === 'Active') {
              deptSelect.innerHTML += '<option value="' + App.escHtml(d.Department) + '">' + App.escHtml(d.Department) + '</option>';
            }
          });
        }
        (data || []).forEach(function(d) {
          if (d.Status === 'Active') {
            html += '<div class="list-item"><span>' + App.escHtml(d.Department) + '</span>' +
              '<button class="btn btn-sm btn-danger" onclick="settingsDeleteDept(\'' + (d.DepartmentID || '').replace(/'/g, "\\'") + '\')">Remove</button></div>';
          }
        });
        var el = document.getElementById('deptList');
        if (el) el.innerHTML = html || '<div style="color:var(--text-light);padding:6px 0">No departments</div>';
      })
      .catch(function() {});
  }

  window.settingsAddDepartment = function() {
    var input = document.getElementById('newDept');
    var name = input ? input.value.trim() : '';
    if (!name) { App.showToast('Enter department name', 'warning'); return; }
    App.showLoading(true);
    API.call('createDepartment', { name: name })
      .then(function() {
        App.showLoading(false);
        if (input) input.value = '';
        App.showToast('Department added');
        settingsLoadDepartments();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast(err.message || 'Failed to add department', 'error');
      });
  };

  window.settingsDeleteDept = function(id) {
    App.showConfirm('Remove Department', 'Are you sure?', function() {
      App.showLoading(true);
      API.call('removeDepartment', { id: id })
        .then(function() {
          App.showLoading(false);
          settingsLoadDepartments();
          App.showToast('Department removed');
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to delete department', 'error');
        });
    });
  };

  /* ==================== SIMPLE SETTINGS ==================== */

  function settingsLoadSimpleSettings() {
    API.call('getSettings')
      .then(function(data) {
        var settings = data.settings || [];
        settingsRenderList('areasList', settings, 'areas');
        settingsRenderList('linesList', settings, 'lines');
        settingsRenderList('jobTypesList', settings, 'jobTypes');
        settingsRenderList('prioritiesList', settings, 'priorities');
        settingsRenderList('machineTypesList', settings, 'machineTypes');
      })
      .catch(function() {});
  }

  function settingsRenderList(containerId, settings, key) {
    var container = document.getElementById(containerId);
    var values = [];
    settings.forEach(function(s) {
      if (s.Setting === key) values = (s.Value || '').split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; });
    });
    var html = values.map(function(v) {
      return '<div class="list-item"><span>' + App.escHtml(v) + '</span>' +
        '<button class="btn btn-sm btn-danger" onclick="settingsRemoveSimpleValue(\'' + key + '\',\'' + v.replace(/'/g, "\\'") + '\')">Remove</button></div>';
    }).join('');
    if (container) container.innerHTML = html || '<div style="color:var(--text-light);padding:6px 0">No items</div>';
  }

  window.settingsSaveSimpleSetting = function(key, inputId) {
    var input = document.getElementById(inputId);
    var value = input ? input.value.trim() : '';
    if (!value) { App.showToast('Enter a value', 'warning'); return; }
    App.showLoading(true);
    API.call('getSettings')
      .then(function(data) {
        var existing = '';
        (data.settings || []).forEach(function(s) { if (s.Setting === key) existing = s.Value || ''; });
        var values = existing ? existing.split(',').map(function(v) { return v.trim(); }) : [];
        if (values.indexOf(value) === -1) values.push(value);
        API.call('saveSetting', { key: key, value: values.join(',') })
          .then(function() {
            App.showLoading(false);
            if (input) input.value = '';
            App.showToast('Saved');
            settingsLoadSimpleSettings();
          })
          .catch(function(err) {
            App.showLoading(false);
            App.showToast(err.message || 'Failed to save setting', 'error');
          });
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast(err.message || 'Failed to load settings', 'error');
      });
  };

  window.settingsRemoveSimpleValue = function(key, value) {
    App.showLoading(true);
    API.call('getSettings')
      .then(function(data) {
        var existing = '';
        (data.settings || []).forEach(function(s) { if (s.Setting === key) existing = s.Value || ''; });
        var values = existing.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v !== value; });
        API.call('saveSetting', { key: key, value: values.join(',') })
          .then(function() {
            App.showLoading(false);
            settingsLoadSimpleSettings();
            App.showToast('Removed');
          })
          .catch(function(err) {
            App.showLoading(false);
            App.showToast(err.message || 'Failed to remove value', 'error');
          });
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast(err.message || 'Failed to load settings', 'error');
      });
  };

  /* ==================== USERS ==================== */

  function settingsLoadUsers() {
    App.showLoading(true);
    API.call('getUsers')
      .then(function(data) {
        usersData = data || [];
        App.showLoading(false);
        settingsRenderUsersTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load users', 'error');
      });
  }

  function settingsRenderUsersTable() {
    var container = document.getElementById('usersTableContainer');
    var list = usersData;
    var page = usersPage;
    var pageSize = PAGE_SIZE;
    var totalPages = Math.ceil(list.length / pageSize) || 1;
    var start = (page - 1) * pageSize;
    var paged = list.slice(start, start + pageSize);

    var html = '<div class="table-wrap"><table class="table user-perms-table"><thead><tr>' +
      '<th>EmpID</th><th>Name</th><th>Email</th><th>Dept</th><th>Section</th><th>Role</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>';
    paged.forEach(function(u) {
      var roleBadge = { 'Admin':'danger', 'Department Manager':'primary', 'Maintenance Manager':'warning', 'Supervisor':'info', 'Technician':'info', 'Operator':'secondary', 'Viewer':'secondary' };
      var rb = roleBadge[u.Role] || 'secondary';
      var statusClass = u.Status === 'Active' ? 'success' : (u.Status === 'Blocked' ? 'danger' : 'secondary');
      html += '<tr>' +
        '<td>' + App.escHtml(u.EmployeeID || '-') + '</td>' +
        '<td>' + App.escHtml(u.Name || '') + '</td>' +
        '<td>' + App.escHtml(u.Email || '') + '</td>' +
        '<td>' + App.escHtml(u.Department || '') + '</td>' +
        '<td>' + App.escHtml(u.Section || '-') + '</td>' +
        '<td><span class="badge badge-' + rb + '">' + App.escHtml(u.Role) + '</span></td>' +
        '<td><span class="badge badge-' + statusClass + '">' + App.escHtml(u.Status) + '</span></td>' +
        '<td class="actions-cell">' + settingsStatusToggle(u) + ' ' +
          iconBtn('edit', "settingsEditUser('" + u.Email.replace(/'/g, "\\'") + "')", 'Edit') + ' ' +
          iconBtn('trash', "settingsDeleteUser('" + u.Email.replace(/'/g, "\\'") + "')", 'Delete', 'icon-btn-danger') +
        '</td></tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="btn btn-sm ' + (p === page ? 'btn-primary' : 'btn-secondary') + '" onclick="settingsGoPage(' + p + ')">' + p + '</button>';
      }
      html += '</div>';
    }

    if (container) container.innerHTML = html;
  }

  window.settingsGoPage = function(p) {
    usersPage = p;
    settingsRenderUsersTable();
  };

  function settingsStatusToggle(u) {
    if (u.Status === 'Active') {
      return '<span class="status-toggle-btn status-active" onclick="settingsToggleUserStatus(\'' + u.Email.replace(/'/g, "\\'") + '\',\'Inactive\')" title="Click to deactivate">Active</span>';
    } else if (u.Status === 'Blocked') {
      return '<span class="status-toggle-btn status-blocked" onclick="settingsToggleUserStatus(\'' + u.Email.replace(/'/g, "\\'") + '\',\'Active\')" title="Click to unblock" style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px">Blocked</span>';
    } else {
      return '<span class="status-toggle-btn status-inactive" onclick="settingsToggleUserStatus(\'' + u.Email.replace(/'/g, "\\'") + '\',\'Active\')" title="Click to activate">Inactive</span>';
    }
  }

  window.settingsToggleUserStatus = function(email, newStatus) {
    App.showLoading(true);
    API.call('updateUser', { email: email, data: { Status: newStatus } })
      .then(function(result) {
        usersData = result || [];
        App.showLoading(false);
        settingsRenderUsersTable();
        App.showToast('Status updated to ' + newStatus, 'success');
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast(err.message || 'Failed to update status', 'error');
      });
  };

  window.settingsToggleUserPerm = function(email, field, newVal) {
    var data = {};
    data[field] = newVal ? 'TRUE' : 'FALSE';
    App.showLoading(true);
    API.call('updateUser', { email: email, data: data })
      .then(function(result) {
        usersData = result || [];
        App.showLoading(false);
        settingsRenderUsersTable();
        App.showToast('Permission updated', 'success');
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast(err.message || 'Failed to update permission', 'error');
      });
  };

  /* ==================== USER FORM ==================== */

  window.settingsOpenUserForm = function() {
    var el = document.getElementById('editUserEmail'); if (el) el.value = '';
    var el2 = document.getElementById('userEmail'); if (el2) { el2.disabled = false; el2.required = true; }
    var el3 = document.getElementById('userPassword'); if (el3) el3.required = true;
    resetForm('userForm');
    var el4 = document.getElementById('userSectionSelect'); if (el4) el4.innerHTML = '<option value="">Select Section</option>';
    PERM_FIELDS.forEach(function(f) {
      var el = document.querySelector('input[name="' + f + '"]');
      if (el) el.checked = false;
    });
    openModalForm('userForm', 'Add User');
  };

  window.settingsEditUser = function(email) {
    var item = usersData.find(function(r) { return r.Email === email; });
    if (!item) return;
    setFormData('userForm', item);
    var el = document.getElementById('editUserEmail'); if (el) el.value = email;
    var el2 = document.getElementById('userEmail'); if (el2) el2.disabled = true;
    var el3 = document.getElementById('userPassword'); if (el3) el3.required = false;
    PERM_FIELDS.forEach(function(f) {
      var el = document.querySelector('input[name="' + f + '"]');
      if (el) {
        var val = item[f];
        el.checked = val === true || val === 'Yes' || val === 'true' || val === 'TRUE';
      }
    });
    if (item.Department) {
      settingsOnUserDeptChange();
      setTimeout(function() {
        if (item.Section) {
          var secSel = document.getElementById('userSectionSelect'); if (secSel) secSel.value = item.Section;
        }
      }, 300);
    }
    openModalForm('userForm', 'Edit User - ' + email);
  };

  window.settingsSaveUser = function(e) {
    e.preventDefault();
    var data = getFormData('userForm');
    PERM_FIELDS.forEach(function(f) {
      var el = document.querySelector('input[name="' + f + '"]');
      data[f] = el && el.checked ? 'TRUE' : 'FALSE';
    });
    var origEmail = document.getElementById('editUserEmail').value;
    App.showLoading(true);
    if (origEmail) {
      if (!data.Password) delete data.Password;
      API.call('updateUser', { email: origEmail, data: data })
        .then(function(result) {
          usersData = result || [];
          App.showLoading(false);
          hideModal('userFormModal');
          App.showToast('User updated');
          settingsRenderUsersTable();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to update user', 'error');
        });
    } else {
      API.call('addUser', data)
        .then(function(result) {
          usersData = result || [];
          App.showLoading(false);
          hideModal('userFormModal');
          App.showToast('User added');
          settingsRenderUsersTable();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to add user', 'error');
        });
    }
  };

  window.settingsDeleteUser = function(email) {
    var user = Auth.getUser();
    if (email === (user && user.email)) { App.showToast('Cannot delete yourself', 'error'); return; }
    App.showConfirm('Delete User', 'Are you sure?', function() {
      App.showLoading(true);
      API.call('deleteUser', { email: email })
        .then(function(result) {
          usersData = result || [];
          App.showLoading(false);
          App.showToast('User deleted');
          settingsRenderUsersTable();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to delete user', 'error');
        });
    });
  };

  window.settingsOnUserDeptChange = function() {
    var dept = document.getElementById('userDepartmentSelect').value;
    var secSel = document.getElementById('userSectionSelect');
    if (secSel) secSel.innerHTML = '<option value="">Select Section</option>';
    if (!dept) return;
    API.call('getSectionList')
      .then(function(sections) {
        (sections || []).forEach(function(s) {
          if (secSel) secSel.innerHTML += '<option value="' + App.escHtml(s.Section) + '">' + App.escHtml(s.Section) + '</option>';
        });
      })
      .catch(function() { console.error('Failed to load sections'); });
  };

})();
