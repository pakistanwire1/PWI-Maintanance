var User = (function() {
  var state = { data: [], page: 1, search: '', editingId: null, selectedUserId: '' };
  var PAGE_SIZE = 10;
  var USER_PERM_FIELDS = [
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanReviewPendingJobCard','CanViewAllJobCards','CanApproveJobCard',
    'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
    'CanManagePM','CanManageBreakdown','CanManageInventory',
    'CanViewDashboard','CanViewReports','CanExportReports',
    'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig',
    'IsAdmin'
  ];
  var KEY_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M15 7a4 4 0 11-7.5 2L3 5v3l-2-2 2-2h3l4.5 4.5A4 4 0 0115 7z"/><circle cx="14" cy="6" r="1" fill="currentColor"/></svg>';

  function filteredData() {
    var q = state.search.toLowerCase();
    if (!q) return state.data;
    return state.data.filter(function(u) {
      return (u.Name || '').toLowerCase().indexOf(q) > -1 ||
             (u.Email || '').toLowerCase().indexOf(q) > -1 ||
             (u.EmployeeID || '').toLowerCase().indexOf(q) > -1 ||
             (u.Role || '').toLowerCase().indexOf(q) > -1 ||
             (u.Department || '').toLowerCase().indexOf(q) > -1;
    });
  }

  function getSelectedUser() {
    if (!state.selectedUserId) return null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].UserID === state.selectedUserId) return state.data[i];
    }
    return null;
  }

  function renderTable() {
    var rows = filteredData();
    var totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PAGE_SIZE;
    var pageData = rows.slice(start, start + PAGE_SIZE);

    var html = '<div class="table-responsive"><table class="data-table"><thead><tr>' +
      '<th>Employee ID</th><th>Name</th><th>Email</th><th>Department</th><th>Designation</th>' +
      '<th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th style="width:180px">Actions</th>' +
      '</tr></thead><tbody>';

    if (pageData.length === 0) {
      html += '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted)">No users found.</td></tr>';
    } else {
      pageData.forEach(function(row) {
        var initial = (row.Name || '?').charAt(0).toUpperCase();
        var photoHtml = row.PhotoURL
          ? '<img src="' + Utils.escapeHtml(row.PhotoURL) + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px">'
          : '<span style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);align-items:center;justify-content:center;font-size:14px;font-weight:600;vertical-align:middle;margin-right:6px">' + initial + '</span>';

        var roleBadge = 'primary';
        if (row.Role === 'Administrator') roleBadge = 'danger';
        else if (row.Role === 'Manager') roleBadge = 'warning';
        else if (row.Role === 'Engineer') roleBadge = 'info';
        else if (row.Role === 'Technician') roleBadge = 'success';
        var statusBadge = row.Status === 'Active' ? 'success' : 'danger';
        var lastLogin = row.LastLoginDate || (row.LastLogin ? String(row.LastLogin).substring(0, 10) : '-');
        var createdDate = row.CreatedAt ? String(row.CreatedAt).substring(0, 10) : '-';

        var isSelected = state.selectedUserId === row.UserID;
        html += '<tr class="' + (isSelected ? 'row-selected' : '') + '" onclick="User.selectRow(\'' + row.UserID + '\')" style="cursor:pointer">' +
          '<td>' + photoHtml + Utils.escapeHtml(row.EmployeeID || '') + '</td>' +
          '<td><strong>' + Utils.escapeHtml(row.Name || '') + '</strong></td>' +
          '<td>' + Utils.escapeHtml(row.Email || '') + '</td>' +
          '<td>' + Utils.escapeHtml(row.Department || '') + '</td>' +
          '<td>' + Utils.escapeHtml(row.Designation || '') + '</td>' +
          '<td><span class="badge badge-' + roleBadge + '">' + Utils.escapeHtml(row.Role || '') + '</span></td>' +
          '<td><span class="badge badge-' + statusBadge + '">' + Utils.escapeHtml(row.Status || '') + '</span></td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + Utils.escapeHtml(lastLogin) + '</td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + Utils.escapeHtml(createdDate) + '</td>' +
          '<td><div class="actions-cell">' +
            '<button class="btn-icon btn-primary" onclick="event.stopPropagation();User.viewUser(\'' + row.UserID + '\')" title="View User">' + Icons.eye + '</button>' +
            '<button class="btn-icon btn-primary" onclick="event.stopPropagation();User.openEdit(\'' + row.UserID + '\')" title="Edit User">' + Icons.edit + '</button>' +
            '<button class="btn-icon btn-warning" onclick="event.stopPropagation();User.openResetPassword(\'' + row.UserID + '\')" title="Reset Password">' + KEY_SVG + '</button>' +
            '<button class="btn-icon btn-danger" onclick="event.stopPropagation();User.confirmDelete(\'' + row.UserID + '\')" title="Delete User">' + Icons.trash + '</button>' +
          '</div></td></tr>';
      });
    }
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">';
      html += '<button class="btn-sm" ' + (state.page <= 1 ? 'disabled' : '') + ' onclick="User.prevPage()">&#8249;</button>';
      for (var i = 1; i <= totalPages; i++) {
        if (totalPages <= 7 || Math.abs(i - state.page) <= 2 || i === 1 || i === totalPages) {
          html += '<button class="btn-sm ' + (i === state.page ? 'active' : '') + '" onclick="User.goToPage(' + i + ')">' + i + '</button>';
        } else if (Math.abs(i - state.page) === 3) {
          html += '<span class="pagination-ellipsis">...</span>';
        }
      }
      html += '<button class="btn-sm" ' + (state.page >= totalPages ? 'disabled' : '') + ' onclick="User.nextPage()">&#8250;</button>';
      html += '</div>';
    }
    html += '<div class="table-info">Showing ' + (rows.length > 0 ? (start + 1) : 0) + '-' + Math.min(state.page * PAGE_SIZE, rows.length) + ' of ' + rows.length + ' records</div>';

    var container = document.getElementById('userTableBody');
    if (container) container.innerHTML = html;
  }

  function buildFormHtml() {
    var roleOpts = '<option value="">Select Role</option>';
    ['Administrator','Manager','Supervisor','Engineer','Technician','Operator','Viewer'].forEach(function(r) {
      roleOpts += '<option value="' + r + '">' + r + '</option>';
    });

    function permCb(name, label) {
      return '<label class="perm-checkbox" style="display:block;margin:3px 0"><input type="checkbox" name="' + name + '" value="TRUE"> ' + label + '</label>';
    }

    return '' +
      '<form id="userForm" onsubmit="return false">' +
        '<div class="modal-body">' +
          '<input type="hidden" name="UserID" id="editUserId">' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Employee ID *</label><input type="text" name="EmployeeID" class="form-control" id="uEmpId" required placeholder="e.g. EMP-001"></div>' +
            '<div class="form-group"><label>Employee Name *</label><input type="text" name="Name" class="form-control" id="uName" required></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Email *</label><input type="email" name="Email" class="form-control" id="uEmail" required></div>' +
            '<div class="form-group"><label>Mobile</label><input type="text" name="Mobile" class="form-control" id="uMobile" placeholder="e.g. 9876543210"></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Password</label><input type="password" name="Password" class="form-control" id="uPassword" autocomplete="new-password"></div>' +
            '<div class="form-group"><label>Confirm Password</label><input type="password" name="ConfirmPassword" class="form-control" id="uConfirmPassword"></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Department *</label><select name="Department" class="form-control" id="uDept" required><option value="">Select Department</option></select></div>' +
            '<div class="form-group"><label>Section</label><select name="Section" class="form-control" id="uSection"><option value="">Select Section</option></select></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Designation</label><input type="text" name="Designation" class="form-control" id="uDesignation" placeholder="e.g. Maintenance Engineer"></div>' +
            '<div class="form-group"><label>Role *</label><select name="Role" class="form-control" id="uRole" required>' + roleOpts + '</select></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>' +
            '<div class="form-group"><label>Joining Date</label><input type="date" name="JoiningDate" class="form-control" id="uJoiningDate"></div>' +
          '</div>' +
          '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">' +
            '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Permissions</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">' +
              '<div><div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Job Cards</div>' +
                permCb('CanOpenJobCard','Open') + permCb('CanStartJobCard','Start') + permCb('CanCloseJobCard','Close') +
                permCb('CanReviewPendingJobCard','Review Pending') + permCb('CanViewAllJobCards','View All Cards') + permCb('CanApproveJobCard','Approve') +
              '</div>' +
              '<div><div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Masters</div>' +
                permCb('CanManageSections','Sections') + permCb('CanManageDepartments','Departments') + permCb('CanManageMachines','Machines') +
                permCb('CanManageAssets','Assets') + permCb('CanManageTechnicians','Technicians') + permCb('CanManageSpareParts','Spare Parts') +
              '</div>' +
              '<div><div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Maintenance</div>' +
                permCb('CanManagePM','Manage PM') + permCb('CanManageBreakdown','Breakdown Entry') + permCb('CanManageInventory','Inventory') +
              '</div>' +
              '<div><div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Dashboard</div>' +
                permCb('CanViewDashboard','View Dashboard') +
              '</div>' +
              '<div><div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Reports</div>' +
                permCb('CanViewReports','View Reports') + permCb('CanExportReports','Export Reports') +
              '</div>' +
              '<div><div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Administration</div>' +
                permCb('CanManageUsers','Manage Users') + permCb('CanManageSettings','Manage Settings') + permCb('CanViewAudit','Audit Trail') +
                permCb('CanManageQR','QR Barcode') + permCb('CanManageEmail','Email') + permCb('CanManageWhatsApp','WhatsApp') +
                permCb('CanBackupRestore','Backup & Restore') + permCb('CanSystemConfig','System Config') +
                permCb('IsAdmin','Is Administrator') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-secondary" onclick="User.closeModal()">Cancel</button>' +
          '<button type="submit" class="btn btn-primary" id="userSaveBtn" onclick="User.save()">Save</button>' +
        '</div>' +
      '</form>';
  }

  function buildPageHtml() {
    return '' +
      '<style>.row-selected{background:var(--primary-light)!important}.row-selected td:first-child{border-left:3px solid var(--primary)}</style>' +
      '<div class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Users Management</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' + Icons.search +
              '<input type="text" class="search-input" id="userSearch" placeholder="Search users..." oninput="User.onSearch(this.value)">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="User.openAdd()">' + Icons.plus + ' Add User</button>' +
            '<button class="btn btn-secondary" onclick="User.editSelected()">' + Icons.edit + ' Edit</button>' +
            '<button class="btn btn-secondary" onclick="User.deleteSelected()">' + Icons.trash + ' Delete</button>' +
            '<button class="btn btn-secondary" onclick="User.resetPwdSelected()">' + KEY_SVG + ' Reset Pwd</button>' +
            '<button class="btn btn-secondary" onclick="User.refreshTable()">' + Icons.refresh + ' Refresh</button>' +
            '<button class="btn btn-secondary" onclick="User.exportExcel()">' + Icons.export + ' Export Excel</button>' +
          '</div>' +
        '</div>' +
        '<div id="userTableBody"></div>' +
      '</div></div>' +

      '<div class="modal-overlay" id="userFormModal">' +
        '<div class="modal modal-wide" style="max-width:900px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="userFormTitle">Add User</div>' +
            '<button class="modal-close" onclick="User.closeModal()">&times;</button>' +
          '</div>' +
          buildFormHtml() +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="passwordResetModal">' +
        '<div class="modal" style="max-width:480px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Reset Password</div>' +
            '<button class="modal-close" onclick="User.closeResetModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<input type="hidden" id="resetPwUserId">' +
            '<div class="form-group">' +
              '<label>Temporary Password *</label>' +
              '<div style="display:flex;gap:6px">' +
                '<input type="text" class="form-control" id="resetTempPassword" style="font-family:monospace" required>' +
                '<button type="button" class="btn btn-secondary" onclick="User.generateTempPassword()" style="white-space:nowrap">Generate</button>' +
              '</div>' +
            '</div>' +
            '<div class="form-group" style="margin-top:8px">' +
              '<label class="perm-checkbox"><input type="checkbox" id="resetForceChange" checked> Force password change on next login</label>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="User.closeResetModal()">Cancel</button>' +
            '<button type="button" class="btn btn-primary" onclick="User.confirmResetPassword()">Reset Password</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="viewUserModal">' +
        '<div class="modal" style="max-width:620px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">User Profile</div>' +
            '<button class="modal-close" onclick="User.closeViewModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body" id="viewUserContent" style="padding:0"></div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="User.closeViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function loadDeptsSections(dept, section) {
    API.post('getDepartmentList', {}).then(function(depts) {
      var sel = document.getElementById('uDept');
      if (sel) {
        sel.innerHTML = '<option value="">Select Department</option>';
        (depts || []).forEach(function(d) {
          var opt = document.createElement('option');
          opt.value = d.Department || '';
          opt.textContent = d.Department || '';
          if (dept && d.Department === dept) opt.selected = true;
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});
    API.post('getSectionList', {}).then(function(sections) {
      var sel = document.getElementById('uSection');
      if (sel) {
        sel.innerHTML = '<option value="">Select Section</option>';
        (sections || []).forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s.Section || '';
          opt.textContent = s.Section || '';
          if (section && s.Section === section) opt.selected = true;
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});
  }

  function resetPermissions() {
    document.querySelectorAll('#userForm input[type="checkbox"]').forEach(function(cb) {
      cb.checked = false;
    });
  }

  function setPermissions(item) {
    document.querySelectorAll('#userForm input[type="checkbox"]').forEach(function(cb) {
      if (cb.name) cb.checked = item[cb.name] === 'TRUE';
    });
  }

  function processPermissions(data) {
    USER_PERM_FIELDS.forEach(function(p) { data[p] = 'FALSE'; });
    document.querySelectorAll('#userForm input[type="checkbox"]:checked').forEach(function(cb) {
      if (cb.name) data[cb.name] = 'TRUE';
    });
  }

  function getData() {
    console.log('[USERS] getData called');
    Loader.show();
    return API.post('getUsers', {}).then(function(res) {
      Loader.hide();
      state.data = Array.isArray(res) ? res : ((res && res.data) ? res.data : []);
      state.page = 1;
      console.log('[USERS] Rows received: ' + state.data.length + ', sample:', state.data.length > 0 ? state.data[0] : 'empty');
      renderTable();
    }).catch(function(err) {
      Loader.hide();
      console.error('[USERS] getData FAILED:', err.message);
      Notify.error(err.message || 'Failed to load users.');
    });
  }

  function buildProfileCardHtml(item) {
    var initial = (item.Name || '?').charAt(0).toUpperCase();
    var photoHtml = item.PhotoURL
      ? '<img src="' + Utils.escapeHtml(item.PhotoURL) + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);display:block;margin:0 auto;box-shadow:0 0 0 4px var(--primary-light)">'
      : '<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:700;margin:0 auto;box-shadow:0 0 0 4px var(--primary-light)">' + initial + '</div>';

    var roleBadge = 'primary';
    if (item.Role === 'Administrator') roleBadge = 'danger';
    else if (item.Role === 'Manager') roleBadge = 'warning';
    else if (item.Role === 'Engineer') roleBadge = 'info';
    else if (item.Role === 'Technician') roleBadge = 'success';

    var statusBadgeHtml = item.Status === 'Active'
      ? '<span class="badge badge-success">Active</span>'
      : '<span class="badge badge-danger">Inactive</span>';

    function infoRow(label, value) {
      return '<div style="display:flex;flex-direction:column;gap:1px"><div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px">' + label + '</div><div style="font-weight:500;color:var(--text);font-size:13px">' + (value || '-') + '</div></div>';
    }

    var grantedPerms = USER_PERM_FIELDS.filter(function(p) { return item[p] === 'TRUE' || item[p] === true; });
    var shortPermLabels = {
      CanOpenJobCard: 'Open Job Card', CanStartJobCard: 'Start Job Card',
      CanCloseJobCard: 'Close Job Card', CanReviewPendingJobCard: 'Review Pending', CanViewAllJobCards: 'All Cards', CanApproveJobCard: 'Approve Job Card',
      CanManageSections: 'Sections', CanManageDepartments: 'Departments',
      CanManageMachines: 'Machines', CanManageAssets: 'Assets',
      CanManageTechnicians: 'Technicians', CanManageSpareParts: 'Spare Parts',
      CanManagePM: 'PM', CanManageBreakdown: 'Breakdown',
      CanManageInventory: 'Inventory',
      CanViewDashboard: 'Dashboard', CanViewReports: 'Reports',
      CanExportReports: 'Export',
      CanManageUsers: 'Users', CanManageSettings: 'Settings',
      CanViewAudit: 'Audit', CanManageQR: 'QR/Barcode',
      CanManageEmail: 'Email', CanManageWhatsApp: 'WhatsApp',
      CanBackupRestore: 'Backup', CanSystemConfig: 'System Config',
      IsAdmin: 'Admin'
    };
    var permHtml = grantedPerms.length > 0
      ? grantedPerms.map(function(p) { return '<span class="badge badge-success" style="margin:2px 3px">' + (shortPermLabels[p] || p) + '</span>'; }).join('')
      : '<span style="color:var(--text-muted);font-size:12px">No permissions granted</span>';

    var joinedDate = item.JoiningDate ? String(item.JoiningDate).substring(0, 10) : '-';
    var lastLogin = item.LastLoginDate || (item.LastLogin ? String(item.LastLogin).substring(0, 10) : '-');
    var createdDate = item.CreatedAt ? String(item.CreatedAt).substring(0, 10) : '-';
    var forcePwdChange = item.ForcePasswordChange === 'TRUE' ? '<span class="badge badge-warning">Change Required</span>' : '<span class="badge badge-success">OK</span>';

    return '' +
      '<div style="text-align:center;padding:28px 24px 20px;border-bottom:1px solid var(--border)">' +
        photoHtml +
        '<div style="font-size:20px;font-weight:700;color:var(--text);margin-top:10px">' + Utils.escapeHtml(item.Name || '') + '</div>' +
        (item.Designation ? '<div style="font-size:13px;color:var(--text-muted);margin-top:2px">' + Utils.escapeHtml(item.Designation) + '</div>' : '') +
        '<div style="margin-top:8px;display:flex;gap:6px;justify-content:center">' +
          '<span class="badge badge-' + roleBadge + '">' + Utils.escapeHtml(item.Role || '') + '</span>' + statusBadgeHtml +
        '</div>' +
      '</div>' +
      '<div style="padding:20px 24px 12px">' +
        '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid var(--border)">Personal Information</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 28px">' +
          infoRow('Employee ID', Utils.escapeHtml(item.EmployeeID || '')) +
          infoRow('Mobile', Utils.escapeHtml(item.Mobile || '-')) +
          infoRow('Email', Utils.escapeHtml(item.Email || '')) +
          infoRow('Joining Date', joinedDate) +
        '</div>' +
      '</div>' +
      '<div style="padding:0 24px 12px">' +
        '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid var(--border)">Organization</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 28px">' +
          infoRow('Department', Utils.escapeHtml(item.Department || '-')) +
          infoRow('Section', Utils.escapeHtml(item.Section || '-')) +
          infoRow('Designation', Utils.escapeHtml(item.Designation || '-')) +
          infoRow('Role', Utils.escapeHtml(item.Role || '-')) +
        '</div>' +
      '</div>' +
      '<div style="padding:0 24px 12px">' +
        '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid var(--border)">Account Information</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 28px">' +
          infoRow('Status', statusBadgeHtml) +
          infoRow('Created', createdDate) +
          infoRow('Last Login', lastLogin) +
          infoRow('Password', forcePwdChange) +
        '</div>' +
      '</div>' +
      '<div style="padding:0 24px 20px">' +
        '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border)">Permissions</div>' +
        '<div>' + permHtml + '</div>' +
      '</div>';
  }

  return {
    init: function() {},

    show: function() {
      var el = document.getElementById('pageContent');
      if (!el) return;
      el.innerHTML = buildPageHtml();
      getData();
    },

    onSearch: function(val) { state.search = val || ''; state.page = 1; renderTable(); },
    goToPage: function(p) { state.page = p; renderTable(); },
    prevPage: function() { if (state.page > 1) { state.page--; renderTable(); } },
    nextPage: function() { if (state.page < Math.ceil(filteredData().length / PAGE_SIZE)) { state.page++; renderTable(); } },

    selectRow: function(userId) {
      state.selectedUserId = state.selectedUserId === userId ? '' : userId;
      renderTable();
    },

    editSelected: function() {
      var user = getSelectedUser();
      if (!user) { Notify.error('Please select a user from the table first'); return; }
      User.openEdit(user.UserID);
    },

    deleteSelected: function() {
      var user = getSelectedUser();
      if (!user) { Notify.error('Please select a user from the table first'); return; }
      User.confirmDelete(user.UserID);
    },

    resetPwdSelected: function() {
      var user = getSelectedUser();
      if (!user) { Notify.error('Please select a user from the table first'); return; }
      User.openResetPassword(user.UserID);
    },

    refreshTable: function() {
      getData();
    },

    exportExcel: function() {
      Loader.show();
      API.post('exportUsersToExcel', {}).then(function(url) {
        Loader.hide();
        if (url) window.open(url, '_blank');
        else Notify.error('Failed to generate export');
      }).catch(function(err) {
        Loader.hide();
        Notify.error('Export failed: ' + (err.message || ''));
      });
    },

    viewUser: function(id) {
      var user = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].UserID) === String(id)) { user = state.data[i]; break; }
      }
      if (!user) { Notify.error('User not found.'); return; }
      var vuc = document.getElementById('viewUserContent');
      if (vuc) vuc.innerHTML = buildProfileCardHtml(user);
      var overlay = document.getElementById('viewUserModal');
      if (overlay) overlay.classList.add('show');
    },

    closeViewModal: function() {
      var overlay = document.getElementById('viewUserModal');
      if (overlay) overlay.classList.remove('show');
    },

    openResetPassword: function(id) {
      var rpu = document.getElementById('resetPwUserId');
      if (rpu) rpu.value = id;
      var rtp = document.getElementById('resetTempPassword');
      if (rtp) rtp.value = '';
      var el = document.getElementById('resetForceChange');
      if (el) el.checked = true;
      var overlay = document.getElementById('passwordResetModal');
      if (overlay) overlay.classList.add('show');
    },

    closeResetModal: function() {
      var overlay = document.getElementById('passwordResetModal');
      if (overlay) overlay.classList.remove('show');
    },

    generateTempPassword: function() {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      var pw = '';
      for (var i = 0; i < 10; i++) {
        pw += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      var rtp = document.getElementById('resetTempPassword');
      if (rtp) rtp.value = pw;
    },

    confirmResetPassword: function() {
      var id = document.getElementById('resetPwUserId').value;
      var tempPassword = document.getElementById('resetTempPassword').value.trim();
      var forceChange = document.getElementById('resetForceChange').checked;

      if (!tempPassword || tempPassword.length < 6) {
        Notify.error('Password must be at least 6 characters');
        return;
      }

      Modal.confirm('Confirm Password Reset', 'Are you sure you want to reset the password for this user?', function() {
        Loader.show();
        API.post('resetUserPassword', { id: id, tempPassword: tempPassword, forceChange: forceChange }).then(function() {
          Loader.hide();
          User.closeResetModal();
          Notify.success('Password reset successfully');
          getData();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to reset password');
        });
      });
    },

    openAdd: function() {
      state.editingId = null;
      document.getElementById('userFormTitle').textContent = 'Add User';
      Forms.reset('userForm');
      resetPermissions();
      loadDeptsSections('', '');
      var el;
      el = document.getElementById('uPassword'); if (el) { el.required = true; }
      el = document.getElementById('uConfirmPassword'); if (el) el.required = true;
      var btn = document.getElementById('userSaveBtn'); if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
      Modal.show('userFormModal');
    },

    openEdit: function(id) {
      var user = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].UserID) === String(id)) { user = state.data[i]; break; }
      }
      if (!user) { Notify.error('User not found.'); return; }
      state.editingId = id;
      document.getElementById('userFormTitle').textContent = 'Edit User - ' + (user.Name || user.EmployeeID);
      resetPermissions();
      loadDeptsSections(user.Department || '', user.Section || '');
      Forms.set('userForm', {
        UserID: user.UserID || '',
        EmployeeID: user.EmployeeID || '',
        Name: user.Name || '',
        Email: user.Email || '',
        Department: user.Department || '',
        Section: user.Section || '',
        Designation: user.Designation || '',
        Role: user.Role || '',
        Status: user.Status || 'Active',
        JoiningDate: user.JoiningDate || ''
      });
      setPermissions(user);
      var el;
      el = document.getElementById('uPassword'); if (el) { el.required = false; el.value = ''; }
      el = document.getElementById('uConfirmPassword'); if (el) { el.required = false; el.value = ''; }
      var btn = document.getElementById('userSaveBtn'); if (btn) { btn.textContent = 'Update'; btn.disabled = false; }
      Modal.show('userFormModal');
    },

    closeModal: function() { Modal.hide('userFormModal'); state.editingId = null; },

    save: function() {
      var formData = Forms.get('userForm');
      if (!formData.EmployeeID || !formData.EmployeeID.trim()) { Notify.error('Employee ID is required.'); return; }
      if (!formData.Name || !formData.Name.trim()) { Notify.error('Name is required.'); return; }
      if (!formData.Email || !formData.Email.trim()) { Notify.error('Email is required.'); return; }
      if (!formData.Department) { Notify.error('Department is required.'); return; }

      var isEdit = state.editingId != null;
      if (!isEdit && (!formData.Password || !formData.Password.trim())) {
        Notify.error('Password is required for new users.'); return;
      }
      if (formData.Password && formData.Password !== formData.ConfirmPassword) {
        Notify.error('Passwords do not match'); return;
      }

      var payload = {
        EmployeeID: (formData.EmployeeID || '').trim(),
        Name: (formData.Name || '').trim(),
        Email: (formData.Email || '').trim(),
        Mobile: (formData.Mobile || '').trim(),
        Department: formData.Department || '',
        Section: formData.Section || '',
        Designation: (formData.Designation || '').trim(),
        Role: formData.Role || '',
        Status: formData.Status || 'Active',
        JoiningDate: formData.JoiningDate || ''
      };
      if (formData.Password && formData.Password.trim()) {
        payload.Password = formData.Password.trim();
      }
      processPermissions(payload);

      if (isEdit) payload.id = state.editingId;
      var action = isEdit ? 'updateUser' : 'addUser';

      var btn = document.getElementById('userSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = isEdit ? 'Updating...' : 'Saving...'; }

      API.post(action, payload).then(function() {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Modal.hide('userFormModal');
        Notify.success(isEdit ? 'User updated successfully.' : 'User added successfully.');
        getData();
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Notify.error(err.message || 'Failed to save user.');
      });
    },

    confirmDelete: function(id) {
      var user = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].UserID) === String(id)) { user = state.data[i]; break; }
      }
      if (!user) { Notify.error('User not found.'); return; }
      var name = user.Name || user.Email || 'this user';
      Modal.confirm('Delete User', 'Are you sure you want to delete "' + name + '"?', function() {
        Loader.show();
        API.post('deleteUser', { id: id }).then(function() {
          Loader.hide();
          Notify.success('User deleted successfully.');
          if (state.selectedUserId === id) state.selectedUserId = '';
          getData();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete user.');
        });
      });
    }
  };
})();
