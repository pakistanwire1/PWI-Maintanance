var User = (function() {
  var state = { data: [], page: 1, search: '', editingId: null };
  var PAGE_SIZE = 10;
  var USER_PERM_FIELDS = [
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanReviewPendingJobCard','CanViewAllJobCards','CanApproveJobCard',
    'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
    'CanManagePM','CanManageBreakdown','CanManageInventory',
    'CanViewDashboard','CanViewReports','CanExportReports',
    'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig',
    'IsAdmin'
  ];

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

  function renderTable() {
    var rows = filteredData();
    var totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PAGE_SIZE;
    var pageData = rows.slice(start, start + PAGE_SIZE);

    var html = '<div class="table-responsive"><table class="data-table"><thead><tr>' +
      '<th>Employee ID</th><th>Name</th><th>Email</th><th>Department</th><th>Designation</th>' +
      '<th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th style="width:100px">Actions</th>' +
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

        html += '<tr>' +
          '<td>' + photoHtml + Utils.escapeHtml(row.EmployeeID || '') + '</td>' +
          '<td><strong>' + Utils.escapeHtml(row.Name || '') + '</strong></td>' +
          '<td>' + Utils.escapeHtml(row.Email || '') + '</td>' +
          '<td>' + Utils.escapeHtml(row.Department || '') + '</td>' +
          '<td>' + Utils.escapeHtml(row.Designation || '') + '</td>' +
          '<td><span class="badge badge-' + roleBadge + '">' + Utils.escapeHtml(row.Role || '') + '</span></td>' +
          '<td><span class="badge badge-' + statusBadge + '">' + Utils.escapeHtml(row.Status || '') + '</span></td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + Utils.escapeHtml(lastLogin) + '</td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + Utils.escapeHtml(createdDate) + '</td>' +
          '<td>' +
            '<button class="btn-icon btn-primary" onclick="User.openEdit(\'' + row.UserID + '\')" title="Edit">' + Icons.edit + '</button>' +
            '<button class="btn-icon btn-danger" onclick="User.confirmDelete(\'' + row.UserID + '\')" title="Delete">' + Icons.trash + '</button>' +
          '</td></tr>';
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
      '<div class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Users Management</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' + Icons.search +
              '<input type="text" class="search-input" id="userSearch" placeholder="Search users..." oninput="User.onSearch(this.value)">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="User.openAdd()">' + Icons.plus + ' Add User</button>' +
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

    openAdd: function() {
      state.editingId = null;
      document.getElementById('userFormTitle').textContent = 'Add User';
      var pwLabel = document.getElementById('userPasswordLabel');
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
          getData();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete user.');
        });
      });
    }
  };
})();
