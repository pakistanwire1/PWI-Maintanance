var User = (function() {
  var state = {
    data: [],
    page: 1,
    sortColumn: '',
    sortDirection: 'asc',
    editingId: null,
    selectedUserId: '',
    formPhotoBase64: '',
    profileViewUserId: ''
  };
  var PAGE_SIZE = 10;
  var USER_PERM_FIELDS = [
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanReviewPendingJobCard','CanViewAllJobCards','CanApproveJobCard',
    'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
    'CanManagePM','CanManageBreakdown','CanManageInventory','CanManageGoodsReceipt',
    'CanViewDashboard','CanViewReports','CanExportReports',
    'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig',
    'IsAdmin'
  ];
  var KEY_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M15 7a4 4 0 11-7.5 2L3 5v3l-2-2 2-2h3l4.5 4.5A4 4 0 0115 7z"/><circle cx="14" cy="6" r="1" fill="currentColor"/></svg>';

  var ICONS = {
    add: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>',
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/><path d="M8 8v6"/><path d="M12 8v6"/></svg>',
    lock: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><rect x="3" y="11" width="14" height="7" rx="1"/><path d="M7 11V7a3 3 0 016 0v4"/></svg>',
    refresh: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>',
    export: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>',
    save: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>',
    view: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/><circle cx="10" cy="10" r="2.5"/></svg>',
    editAction: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    trashAction: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/><path d="M8 8v6"/><path d="M12 8v6"/></svg>',
    editSm: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    lockSm: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><rect x="3" y="11" width="14" height="7" rx="1"/><path d="M7 11V7a3 3 0 016 0v4"/></svg>'
  };

  function findUser(id) {
    for (var i = 0; i < state.data.length; i++) {
      if (String(state.data[i].UserID) === String(id)) return state.data[i];
    }
    return null;
  }

  function getSelectedUser() {
    if (!state.selectedUserId) return null;
    return findUser(state.selectedUserId);
  }

  function getData() {
    Loader.show();
    return API.post('getUsers', {}).then(function(res) {
      Loader.hide();
      state.data = Array.isArray(res) ? res : ((res && res.data) ? res.data : []);
      state.page = 1;
      state.sortColumn = '';
      state.sortDirection = 'asc';
      renderTable();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load users');
    });
  }

  function renderTable() {
    var data = state.data;

    if (state.sortColumn) {
      data = data.slice().sort(function(a, b) {
        var va = (a[state.sortColumn] || '').toString().toLowerCase();
        var vb = (b[state.sortColumn] || '').toString().toLowerCase();
        if (va < vb) return state.sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return state.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    var totalPages = Math.ceil(data.length / PAGE_SIZE);
    var start = (state.page - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, data.length);
    var pageData = data.slice(start, end);

    var sortArrow = function(col) {
      if (state.sortColumn === col) return state.sortDirection === 'asc' ? ' &#9650;' : ' &#9660;';
      return '';
    };

    var html = '<div class="table-container"><table id="usersTable"><thead><tr>' +
      '<th onclick="User.sortTable(\'EmployeeID\')" style="cursor:pointer">Employee ID' + sortArrow('EmployeeID') + '</th>' +
      '<th onclick="User.sortTable(\'Name\')" style="cursor:pointer">Employee Name' + sortArrow('Name') + '</th>' +
      '<th onclick="User.sortTable(\'Email\')" style="cursor:pointer">Email' + sortArrow('Email') + '</th>' +
      '<th onclick="User.sortTable(\'Department\')" style="cursor:pointer">Department' + sortArrow('Department') + '</th>' +
      '<th onclick="User.sortTable(\'Designation\')" style="cursor:pointer">Designation' + sortArrow('Designation') + '</th>' +
      '<th onclick="User.sortTable(\'Role\')" style="cursor:pointer">Role' + sortArrow('Role') + '</th>' +
      '<th onclick="User.sortTable(\'Status\')" style="cursor:pointer">Status' + sortArrow('Status') + '</th>' +
      '<th onclick="User.sortTable(\'LastLoginDate\')" style="cursor:pointer">Last Login' + sortArrow('LastLoginDate') + '</th>' +
      '<th onclick="User.sortTable(\'CreatedAt\')" style="cursor:pointer">Created Date' + sortArrow('CreatedAt') + '</th>' +
      '<th style="width:180px">Actions</th>' +
      '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      var initial = (row.Name || '?').charAt(0).toUpperCase();
      var isSelected = state.selectedUserId === row.UserID;
      var photoHtml = row.PhotoURL
        ? '<img src="' + Utils.escapeHtml(row.PhotoURL) + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover">'
        : '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;margin:0 auto">' + initial + '</div>';

      var roleBadge = 'primary';
      if (row.Role === 'Administrator') roleBadge = 'danger';
      else if (row.Role === 'Manager') roleBadge = 'warning';
      else if (row.Role === 'Supervisor') roleBadge = 'primary';
      else if (row.Role === 'Engineer') roleBadge = 'info';
      else if (row.Role === 'Technician') roleBadge = 'success';
      else if (row.Role === 'Operator') roleBadge = 'secondary';
      else if (row.Role === 'Viewer') roleBadge = 'secondary';

      var statusBadge = row.Status === 'Active' ? 'success' : 'danger';

      html += '<tr class="' + (isSelected ? 'row-selected' : '') + '" onclick="User.selectRow(\'' + row.UserID + '\')" data-userid="' + row.UserID + '">' +
        '<td><span style="display:inline-flex;align-items:center;gap:8px">' + photoHtml + '<span>' + Utils.escapeHtml(row.EmployeeID || '') + '</span></span></td>' +
        '<td><strong>' + Utils.escapeHtml(row.Name || '') + '</strong></td>' +
        '<td>' + Utils.escapeHtml(row.Email || '') + '</td>' +
        '<td>' + Utils.escapeHtml(row.Department || '') + '</td>' +
        '<td>' + Utils.escapeHtml(row.Designation || '') + '</td>' +
        '<td><span class="badge badge-' + roleBadge + '">' + Utils.escapeHtml(row.Role || '') + '</span></td>' +
        '<td><span class="badge badge-' + statusBadge + '">' + Utils.escapeHtml(row.Status || '') + '</span></td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + Utils.escapeHtml((row.LastLoginDate || row.LastLogin ? (row.LastLoginDate || row.LastLogin.substring(0, 10)) : '-')) + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + Utils.escapeHtml(row.CreatedAt ? formatDateShort(row.CreatedAt) : '-') + '</td>' +
        '<td><div class="actions-cell">' +
          '<button class="icon-btn icon-btn-primary" onclick="event.stopPropagation();User.viewUser(\'' + row.UserID + '\')" title="View User">' + ICONS.view + '</button>' +
          '<button class="icon-btn icon-btn-primary" onclick="event.stopPropagation();User.openEdit(\'' + row.UserID + '\')" title="Edit User">' + ICONS.editAction + '</button>' +
          '<button class="icon-btn icon-btn-warning" onclick="event.stopPropagation();User.openResetPassword(\'' + row.UserID + '\')" title="Reset Password">' + KEY_SVG + '</button>' +
          '<button class="icon-btn icon-btn-danger" onclick="event.stopPropagation();User.confirmDelete(\'' + row.UserID + '\')" title="Delete User">' + ICONS.trashAction + '</button>' +
        '</div></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="User.goPage(' + (state.page - 1) + ')" ' + (state.page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === state.page ? 'active' : '') + '" onclick="User.goPage(' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="User.goPage(' + (state.page + 1) + ')" ' + (state.page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    } else if (data.length > PAGE_SIZE && totalPages <= 1) {
      html += '<div class="pagination"><div class="pagination-info">Showing all ' + data.length + ' entries</div></div>';
    }
    var container = document.getElementById('usersTableContainer'); if (container) container.innerHTML = html;
  }

  function sortTable(col) {
    if (state.sortColumn === col) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortColumn = col;
      state.sortDirection = 'asc';
    }
    state.page = 1;
    renderTable();
  }

  function searchTable() {
    var input = document.getElementById('userSearch');
    var query = input ? input.value : '';
    if (!query) { renderTable(); return; }
    Loader.show();
    API.post('searchUsers', { query: query }).then(function(result) {
      Loader.hide();
      state.data = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      state.page = 1;
      state.selectedUserId = '';
      renderTable();
    }).catch(function() {
      Loader.hide();
      Notify.error('Search failed');
    });
  }

  function formatDateShort(dateVal) {
    if (!dateVal) return '';
    var d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).substring(0, 10);
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var month = months[d.getMonth()];
    var year = d.getFullYear();
    return day + ' ' + month + ' ' + year;
  }

  function loadDepts(selected) {
    API.post('getUserDepartments', {}).then(function(depts) {
      var sel = document.getElementById('uDept');
      if (sel) {
        sel.innerHTML = '<option value="">Select Department</option>';
        (depts || []).forEach(function(d) {
          var opt = document.createElement('option');
          opt.value = d.name;
          opt.textContent = d.name;
          if (selected && d.name === selected) opt.selected = true;
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});
  }

  function loadSections(selected) {
    API.post('getUserSections', {}).then(function(sections) {
      var sel = document.getElementById('uSection');
      if (sel) {
        sel.innerHTML = '<option value="">Select Section</option>';
        (sections || []).forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s.name;
          opt.textContent = s.name;
          if (selected && s.name === selected) opt.selected = true;
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

  function permVal(v) {
    if (v === true) return true;
    return v === 'TRUE' || v === 'true' || v === '1' || v === 'Yes' || v === 'yes';
  }

  function setPermissions(item) {
    document.querySelectorAll('#userForm input[type="checkbox"]').forEach(function(cb) {
      if (cb.name) cb.checked = permVal(item[cb.name]);
    });
    onAdminCheckChange();
  }

  function onAdminCheckChange() {
    var isAdminEl = document.getElementById('uIsAdmin');
    var isAdmin = isAdminEl && isAdminEl.checked;
    document.querySelectorAll('#userForm input[type="checkbox"]').forEach(function(cb) {
      if (isAdmin && cb.name) cb.checked = true;
    });
  }

  function processPermissions(data) {
    USER_PERM_FIELDS.forEach(function(p) { data[p] = 'FALSE'; });
    document.querySelectorAll('#userForm input[type="checkbox"]:checked').forEach(function(cb) {
      if (cb.name) data[cb.name] = 'TRUE';
    });
  }

  function setFormFields(item) {
    var form = document.getElementById('userForm');
    if (!form) return;
    form.querySelectorAll('[name]').forEach(function(el) {
      if (item[el.name] !== undefined) {
        el.value = item[el.name];
      }
    });
  }

  function onFormPhotoSelected(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { Notify.warning('Photo must be under 2MB'); e.target.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      state.formPhotoBase64 = ev.target.result;
      var fpp = document.getElementById('formPhotoPlaceholder'); if (fpp) fpp.style.display = 'none';
      var img = document.getElementById('formPhotoImg');
      if (img) {
        img.src = state.formPhotoBase64;
        img.style.display = 'block';
      }
      var rmb = document.getElementById('formRemovePhotoBtn'); if (rmb) rmb.style.display = '';
    };
    reader.readAsDataURL(file);
  }

  function removeFormPhoto() {
    state.formPhotoBase64 = '';
    var fpi = document.getElementById('formPhotoInput'); if (fpi) fpi.value = '';
    var fpp = document.getElementById('formPhotoPlaceholder'); if (fpp) fpp.style.display = '';
    var fim = document.getElementById('formPhotoImg'); if (fim) { fim.style.display = 'none'; fim.src = ''; }
    var rmb = document.getElementById('formRemovePhotoBtn'); if (rmb) rmb.style.display = 'none';
  }

  function setFormPhotoPreview(url) {
    if (url) {
      var fpp = document.getElementById('formPhotoPlaceholder'); if (fpp) fpp.style.display = 'none';
      var img = document.getElementById('formPhotoImg');
      if (img) {
        img.src = url;
        img.style.display = 'block';
      }
      var rmb = document.getElementById('formRemovePhotoBtn'); if (rmb) rmb.style.display = '';
    } else {
      removeFormPhoto();
    }
  }

  function buildPageHtml() {
    return '' +
      '<style>\n  ' +
        '#usersTable tr.row-selected { background: var(--primary-light) !important; outline: 2px solid var(--primary); outline-offset: -2px; }\n  ' +
        '#usersTable tr.row-selected td:first-child { border-left: 3px solid var(--primary); }\n  ' +
        '#usersTable tbody tr { cursor: pointer; transition: background 0.15s; }\n  ' +
        '#usersTable tbody tr:hover { background: var(--bg-hover); }\n' +
      '</style>' +
      '<div id="usersPage" class="page">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Users Management</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="form-control" id="userSearch" placeholder="Search users..." onkeyup="User.search()">' +
              '</div>' +
              '<button class="btn btn-primary" onclick="User.openAdd()">' + ICONS.add + ' Add User</button>' +
              '<button class="btn btn-secondary" onclick="User.editSelected()">' + ICONS.edit + ' Edit</button>' +
              '<button class="btn btn-secondary" onclick="User.deleteSelected()">' + ICONS.trash + ' Delete</button>' +
              '<button class="btn btn-secondary" onclick="User.resetPwdSelected()">' + ICONS.lock + ' Reset Pwd</button>' +
              '<button class="btn btn-secondary" onclick="User.refreshTable()">' + ICONS.refresh + ' Refresh</button>' +
              '<button class="btn btn-secondary" onclick="User.exportExcel()">' + ICONS.export + ' Export Excel</button>' +
            '</div>' +
          '</div>' +
          '<div id="usersTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="userFormModal">' +
        '<div class="modal modal-wide" style="max-width:900px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="userFormTitle">Add User</div>' +
            '<button class="modal-close" onclick="User.closeModal()">&times;</button>' +
          '</div>' +
          '<form id="userForm" onsubmit="return User.save(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="UserID" id="editUserId">' +
              '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">' +
                '<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid var(--border);flex-shrink:0;background:var(--bg-card);display:flex;align-items:center;justify-content:center">' +
                  '<div id="formPhotoPlaceholder" style="color:var(--text-muted);font-size:11px;text-align:center;padding:4px">No Photo</div>' +
                  '<img id="formPhotoImg" style="width:100%;height:100%;object-fit:cover;display:none">' +
                '</div>' +
                '<div>' +
                  '<input type="file" id="formPhotoInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="User.onFormPhotoSelected(event)">' +
                  '<button type="button" class="btn btn-secondary btn-sm" onclick="var el=document.getElementById(\'formPhotoInput\');el&&el.click()">Upload Photo</button>' +
                  '<button type="button" class="btn btn-secondary btn-sm" id="formRemovePhotoBtn" onclick="User.removeFormPhoto()" style="display:none;margin-left:4px">Remove</button>' +
                  '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">JPG/PNG/WEBP, max 2MB</div>' +
                '</div>' +
              '</div>' +
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
                '<div class="form-group"><label>Role *</label><select name="Role" class="form-control" id="uRole" required>' +
                  '<option value="">Select Role</option>' +
                  '<option value="Administrator">Administrator</option>' +
                  '<option value="Manager">Manager</option>' +
                  '<option value="Supervisor">Supervisor</option>' +
                  '<option value="Engineer">Engineer</option>' +
                  '<option value="Technician">Technician</option>' +
                  '<option value="Operator">Operator</option>' +
                  '<option value="Viewer">Viewer</option>' +
                '</select></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>' +
                '<div class="form-group"><label>Joining Date</label><input type="date" name="JoiningDate" class="form-control" id="uJoiningDate"></div>' +
              '</div>' +
              '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">' +
                '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Permissions</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">' +
                  '<div>' +
                    '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Job Cards</div>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanOpenJobCard" value="TRUE"> Open</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanStartJobCard" value="TRUE"> Start</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanCloseJobCard" value="TRUE"> Close</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanReviewPendingJobCard" value="TRUE"> Review Pending</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanViewAllJobCards" value="TRUE"> View All Cards</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanApproveJobCard" value="TRUE"> Approve</label>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Masters</div>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageSections" value="TRUE"> Sections</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageDepartments" value="TRUE"> Departments</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageMachines" value="TRUE"> Machines</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageAssets" value="TRUE"> Assets</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageTechnicians" value="TRUE"> Technicians</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageSpareParts" value="TRUE"> Spare Parts</label>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Maintenance</div>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManagePM" value="TRUE"> Manage PM</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageBreakdown" value="TRUE"> Breakdown Entry</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageInventory" value="TRUE"> Inventory</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageGoodsReceipt" value="TRUE"> Goods Receipt</label>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Dashboard</div>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanViewDashboard" value="TRUE"> View Dashboard</label>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Reports</div>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanViewReports" value="TRUE"> View Reports</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanExportReports" value="TRUE"> Export Reports</label>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Administration</div>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageUsers" value="TRUE"> Manage Users</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageSettings" value="TRUE"> Manage Settings</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanViewAudit" value="TRUE"> Audit Trail</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageQR" value="TRUE"> QR Barcode</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageEmail" value="TRUE"> Email Notifications</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanManageWhatsApp" value="TRUE"> WhatsApp Notifications</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanBackupRestore" value="TRUE"> Backup & Restore</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="CanSystemConfig" value="TRUE"> System Configuration</label>' +
                    '<label class="perm-checkbox"><input type="checkbox" name="IsAdmin" value="TRUE" id="uIsAdmin" onchange="User.onAdminCheckChange()"> Is Administrator</label>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="User.closeModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICONS.save + ' Save</button>' +
            '</div>' +
          '</form>' +
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
            '<div class="form-group">' +
              '<label class="perm-checkbox" style="margin-top:8px"><input type="checkbox" id="resetForceChange" checked> Force password change on next login </label>' +
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
          '<div class="modal-body" id="viewUserContent" style="padding:0">' +
            '<input type="file" id="profilePhotoInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="User.onProfilePhotoSelected(event)">' +
          '</div>' +
          '<div class="modal-footer" id="profileCardFooter">' +
            '<button type="button" class="btn btn-secondary" onclick="User.closeViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildProfileCardHtml(item) {
    var initial = (item.Name || '?').charAt(0).toUpperCase();
    var photoUrl = item.PhotoURL;
    var photoHtml = photoUrl
      ? '<img src="' + Utils.escapeHtml(photoUrl) + '" id="profileCardPhoto" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);display:block;box-shadow:0 0 0 4px var(--primary-light)">'
      : '<div id="profileCardPhoto" style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:700;box-shadow:0 0 0 4px var(--primary-light)">' + initial + '</div>';

    var roleBadge = 'primary';
    if (item.Role === 'Administrator') roleBadge = 'danger';
    else if (item.Role === 'Manager') roleBadge = 'warning';
    else if (item.Role === 'Supervisor') roleBadge = 'primary';
    else if (item.Role === 'Engineer') roleBadge = 'info';
    else if (item.Role === 'Technician') roleBadge = 'success';
    else if (item.Role === 'Operator') roleBadge = 'secondary';
    else if (item.Role === 'Viewer') roleBadge = 'secondary';

    var grantedPerms = USER_PERM_FIELDS.filter(function(p) { return item[p] === 'TRUE' || item[p] === true; });
    var shortPermLabels = {
      CanOpenJobCard: 'Open Job Card', CanStartJobCard: 'Start Job Card',
      CanCloseJobCard: 'Close Job Card', CanReviewPendingJobCard: 'Review Pending', CanViewAllJobCards: 'All Cards', CanApproveJobCard: 'Approve Job Card',
      CanManageSections: 'Sections', CanManageDepartments: 'Departments',
      CanManageMachines: 'Machines', CanManageAssets: 'Assets',
      CanManageTechnicians: 'Technicians', CanManageSpareParts: 'Spare Parts',
      CanManagePM: 'PM', CanManageBreakdown: 'Breakdown',
      CanManageInventory: 'Inventory', CanManageGoodsReceipt: 'Goods Receipt',
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

    function infoRow(label, value) {
      return '<div style="display:flex;flex-direction:column;gap:1px"><div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px">' + label + '</div><div style="font-weight:500;color:var(--text);font-size:13px">' + (value || '-') + '</div></div>';
    }

    var joinedDate = item.JoiningDate ? formatDateShort(item.JoiningDate) : '-';
    var lastLogin = item.LastLoginDate || item.LastLogin || '-';
    if (lastLogin !== '-' && lastLogin.length > 10) lastLogin = lastLogin.substring(0, 10);
    var createdDate = item.CreatedAt ? formatDateShort(item.CreatedAt) : '-';
    var forcePwdChange = item.ForcePasswordChange === 'TRUE' ? '<span class="badge badge-warning">Change Required</span>' : '<span class="badge badge-success">OK</span>';

    var hasPhoto = !!photoUrl;

    var statusBadgeHtml = item.Status === 'Active'
      ? '<span class="badge badge-success">Active</span>'
      : '<span class="badge badge-danger">Inactive</span>';

    return '' +
      '<div style="text-align:center;padding:28px 24px 20px;border-bottom:1px solid var(--border)">' +
        '<div style="position:relative;display:inline-block">' +
          photoHtml +
          '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center;font-size:11px">' +
            '<span style="color:var(--primary);cursor:pointer" onclick="var el=document.getElementById(\'profilePhotoInput\');el&&el.click()">' + (hasPhoto ? 'Change Photo' : 'Upload Photo') + '</span>' +
            (hasPhoto ? '<span style="color:var(--text-muted)">|</span><span style="color:var(--danger);cursor:pointer" onclick="User.removeProfilePhoto(\'' + item.UserID + '\')">Remove</span>' : '') +
          '</div>' +
        '</div>' +
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

  function buildProfileCardFooter(item) {
    return '' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation();User.closeViewModal();User.openEdit(\'' + item.UserID + '\')">' +
        ICONS.editSm + ' Edit User</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();User.closeViewModal();User.openResetPassword(\'' + item.UserID + '\')">' +
        ICONS.lockSm + ' Reset Password</button>' +
      '<button type="button" class="btn btn-secondary" onclick="User.closeViewModal()">Close</button>';
  }

  function showDeleteDialog(id, isSuperAdmin) {
    var overlay = document.getElementById('deleteConfirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'deleteConfirmOverlay';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.classList.add('show');
    overlay.innerHTML =
      '<div class="modal" style="max-width:400px">' +
        '<div class="modal-header"><div class="modal-title">Delete User</div></div>' +
        '<div class="modal-body">' +
          '<div style="text-align:center;padding:12px 0">' +
            '<p style="margin:12px 0 24px;font-size:14px;color:#5f6368">Are you sure you want to delete this user?</p>' +
            '<div class="btn-group" style="justify-content:center">' +
              '<button class="btn btn-secondary" onclick="User.closeDeleteDialog()">Cancel</button>' +
              '<button class="btn btn-danger" id="usrmgmtConfirmDeleteBtn">Delete</button>' +
            '</div>' +
            (isSuperAdmin
              ? '<div style="margin-top:14px;font-size:12px"><a href="#" style="color:#dc3545;text-decoration:none" onclick="event.preventDefault();User.closeDeleteDialog();User.permanentDelete(\'' + id + '\')">Permanently delete this user</a></div>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>';
    var deleteBtn = document.getElementById('usrmgmtConfirmDeleteBtn');
    if (deleteBtn) deleteBtn.onclick = function() {
      closeDeleteDialog();
      Loader.show();
      API.post('deleteUser', { id: id }).then(function() {
        Loader.hide();
        if (state.selectedUserId === id) state.selectedUserId = '';
        Notify.success('User deactivated successfully');
        getData();
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to delete user');
      });
    };
  }

  function showPermanentDeleteDialog(id) {
    var item = findUser(id);
    if (!item) return;
    var overlay = document.getElementById('deleteConfirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'deleteConfirmOverlay';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.classList.add('show');
    overlay.innerHTML =
      '<div class="modal" style="max-width:400px">' +
        '<div class="modal-header"><div class="modal-title">Permanent Delete</div></div>' +
        '<div class="modal-body">' +
          '<div style="text-align:center;padding:12px 0">' +
            '<p style="margin:12px 0 24px;font-size:14px;color:#5f6368">Permanently delete "' + Utils.escapeHtml(item.Name || item.Email) + '"? This cannot be undone.</p>' +
            '<div class="btn-group" style="justify-content:center">' +
              '<button class="btn btn-secondary" onclick="User.closeDeleteDialog()">Cancel</button>' +
              '<button class="btn btn-danger" id="usrmgmtConfirmPermDeleteBtn">Permanently Delete</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    var permDeleteBtn = document.getElementById('usrmgmtConfirmPermDeleteBtn');
    if (permDeleteBtn) permDeleteBtn.onclick = function() {
      closeDeleteDialog();
      Loader.show();
      API.post('permanentlyDeleteUser', { id: id }).then(function() {
        Loader.hide();
        if (state.selectedUserId === id) state.selectedUserId = '';
        Notify.success('User permanently deleted');
        getData();
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to permanently delete user');
      });
    };
  }

  function closeDeleteDialog() {
    var overlay = document.getElementById('deleteConfirmOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('show');
    }
  }

  return {
    init: function() {},

    show: function() {
      var el = document.getElementById('pageContent');
      if (!el) return;
      el.innerHTML = buildPageHtml();
      getData();
    },

    search: function() { searchTable(); },
    sortTable: function(col) { sortTable(col); },
    goPage: function(p) { state.page = p; renderTable(); },
    selectRow: function(userId) {
      state.selectedUserId = state.selectedUserId === userId ? '' : userId;
      renderTable();
    },

    editSelected: function() {
      var item = getSelectedUser();
      if (!item) { Notify.warning('Please select a user from the table first'); return; }
      User.openEdit(item.UserID);
    },

    deleteSelected: function() {
      var item = getSelectedUser();
      if (!item) { Notify.warning('Please select a user from the table first'); return; }
      User.confirmDelete(item.UserID);
    },

    resetPwdSelected: function() {
      var item = getSelectedUser();
      if (!item) { Notify.warning('Please select a user from the table first'); return; }
      User.openResetPassword(item.UserID);
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
      var item = findUser(id);
      if (!item) return;
      state.profileViewUserId = id;
      var vuc = document.getElementById('viewUserContent'); if (vuc) vuc.innerHTML = buildProfileCardHtml(item);
      var pcf = document.getElementById('profileCardFooter'); if (pcf) pcf.innerHTML = buildProfileCardFooter(item);
      Modal.show('viewUserModal');
    },

    closeViewModal: function() {
      Modal.hide('viewUserModal');
    },

    onProfilePhotoSelected: function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { Notify.warning('Photo must be under 2MB'); e.target.value = ''; return; }
      var userId = state.profileViewUserId;
      if (!userId) return;
      var item = findUser(userId);
      if (!item) return;
      Loader.show();
      var reader = new FileReader();
      reader.onload = function(ev) {
        var base64 = ev.target.result;
        API.post('uploadUserPhoto', { photo: base64, employeeId: item.EmployeeID }).then(function(photoResult) {
          var pr = typeof photoResult === 'string' ? JSON.parse(photoResult) : (photoResult || {});
          return API.post('updateUser', { id: userId, PhotoURL: pr.url, PhotoDriveID: pr.driveId });
        }).then(function() {
          return getData();
        }).then(function() {
          var updatedItem = findUser(userId);
          var vuc2 = document.getElementById('viewUserContent'); if (vuc2) vuc2.innerHTML = buildProfileCardHtml(updatedItem || item);
          var pcf2 = document.getElementById('profileCardFooter'); if (pcf2) pcf2.innerHTML = buildProfileCardFooter(updatedItem || item);
          if (state.selectedUserId === userId) renderTable();
          Notify.success('Photo updated successfully');
        }).catch(function(err) {
          Loader.hide();
          Notify.error('Failed to update user: ' + (err.message || ''));
        });
      };
      reader.readAsDataURL(file);
    },

    removeProfilePhoto: function(userId) {
      Modal.confirm('Remove Photo', 'Are you sure you want to remove this user\'s photo?', function() {
        Loader.show();
        API.post('updateUser', { id: userId, PhotoURL: '', PhotoDriveID: '' }).then(function() {
          return getData();
        }).then(function() {
          var updatedItem = findUser(userId);
          var vuc3 = document.getElementById('viewUserContent'); if (vuc3) vuc3.innerHTML = buildProfileCardHtml(updatedItem);
          var pcf3 = document.getElementById('profileCardFooter'); if (pcf3) pcf3.innerHTML = buildProfileCardFooter(updatedItem);
          if (state.selectedUserId === userId) renderTable();
          Notify.success('Photo removed');
        }).catch(function(err) {
          Loader.hide();
          Notify.error('Failed to remove photo: ' + (err.message || ''));
        });
      });
    },

    openResetPassword: function(id) {
      var rpu = document.getElementById('resetPwUserId'); if (rpu) rpu.value = id;
      var rtp = document.getElementById('resetTempPassword'); if (rtp) rtp.value = '';
      var el = document.getElementById('resetForceChange'); if (el) el.checked = true;
      Modal.show('passwordResetModal');
    },

    closeResetModal: function() {
      Modal.hide('passwordResetModal');
    },

    generateTempPassword: function() {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      var pw = '';
      for (var i = 0; i < 10; i++) {
        pw += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      var rtp = document.getElementById('resetTempPassword'); if (rtp) rtp.value = pw;
    },

    confirmResetPassword: function() {
      var id = document.getElementById('resetPwUserId').value;
      var tempPassword = document.getElementById('resetTempPassword').value.trim();
      var forceChange = document.getElementById('resetForceChange').checked;

      if (!tempPassword || tempPassword.length < 6) {
        Notify.warning('Password must be at least 6 characters');
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
      var eu = document.getElementById('editUserId'); if (eu) eu.value = '';
      Forms.reset('userForm');
      state.formPhotoBase64 = '';
      removeFormPhoto();
      var el;
      el = document.getElementById('uPassword'); if (el) { el.required = true; el.placeholder = 'Enter password'; }
      el = document.getElementById('uConfirmPassword'); if (el) el.required = true;
      resetPermissions();
      loadDepts('');
      loadSections('');
      document.getElementById('userFormTitle').textContent = 'Add User';
      Modal.show('userFormModal');
    },

    openEdit: function(id) {
      var item = findUser(id);
      if (!item) return;
      state.editingId = id;
      setFormFields(item);
      var eu = document.getElementById('editUserId'); if (eu) eu.value = id;
      var el;
      el = document.getElementById('uPassword'); if (el) { el.required = false; el.placeholder = 'Leave blank to keep current'; }
      el = document.getElementById('uConfirmPassword'); if (el) el.required = false;
      var up = document.getElementById('uPassword'); if (up) up.value = '';
      var ucp = document.getElementById('uConfirmPassword'); if (ucp) ucp.value = '';
      setFormPhotoPreview(item.PhotoURL || '');
      state.formPhotoBase64 = '';
      setPermissions(item);
      loadDepts(item.Department || '');
      loadSections(item.Section || '');
      document.getElementById('userFormTitle').textContent = 'Edit User - ' + (item.Name || item.EmployeeID);
      Modal.show('userFormModal');
    },

    closeModal: function() { Modal.hide('userFormModal'); state.editingId = null; },

    onAdminCheckChange: function() { onAdminCheckChange(); },
    onFormPhotoSelected: function(e) { onFormPhotoSelected(e); },
    removeFormPhoto: function() { removeFormPhoto(); },

    save: function(e) {
      if (e && e.preventDefault) e.preventDefault();
      var data = Forms.get('userForm');
      var id = document.getElementById('editUserId').value;

      if (!data.EmployeeID) { Notify.warning('Employee ID is required'); return; }
      if (!data.Name) { Notify.warning('Employee Name is required'); return; }
      if (!data.Email) { Notify.warning('Email is required'); return; }
      if (!data.Department) { Notify.warning('Department is required'); return; }

      if (!id) {
        if (!data.Password) { Notify.warning('Password is required for new users'); return; }
        if (data.Password !== data.ConfirmPassword) { Notify.warning('Passwords do not match'); return; }
      } else {
        if (data.Password && data.Password !== data.ConfirmPassword) {
          Notify.warning('Passwords do not match'); return;
        }
      }

      processPermissions(data);

      Loader.show();

      function saveUserData(photoUrl, photoDriveId) {
        if (photoUrl) data.PhotoURL = photoUrl;
        if (photoDriveId) data.PhotoDriveID = photoDriveId;
        var action = id ? 'updateUser' : 'addUser';
        if (id) data.id = id;
        return API.post(action, data).then(function() {
          Loader.hide();
          Modal.hide('userFormModal');
          state.selectedUserId = '';
          Notify.success(id ? 'User updated successfully' : 'User added successfully');
          getData();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to save user');
        });
      }

      if (state.formPhotoBase64) {
        API.post('uploadUserPhoto', { photo: state.formPhotoBase64, employeeId: data.EmployeeID }).then(function(photoResult) {
          var pr = typeof photoResult === 'string' ? JSON.parse(photoResult) : (photoResult || {});
          saveUserData(pr.url, pr.driveId);
        }).catch(function(err) {
          Loader.hide();
          Notify.warning('Photo upload failed: ' + (err.message || ''));
        });
      } else {
        saveUserData();
      }
    },

    confirmDelete: function(id) {
      var item = findUser(id);
      if (!item) { Notify.error('User not found'); return; }

      var sessionUser = Session.getUser() || {};
      if (item.Email && sessionUser.email && item.Email === sessionUser.email) {
        Notify.warning('You cannot delete your own account');
        return;
      }

      if (item.Role === 'Administrator' || item.IsAdmin === 'TRUE') {
        var otherActiveAdmins = state.data.filter(function(r) {
          return r.UserID !== id && r.Status === 'Active' && (r.Role === 'Administrator' || r.IsAdmin === 'TRUE');
        });
        if (otherActiveAdmins.length === 0) {
          Notify.warning('Cannot delete the last active Administrator account');
          return;
        }
      }

      var isSuperAdmin = sessionUser && (sessionUser.role === 'Admin' || sessionUser.role === 'Administrator' || sessionUser.isSystemAdmin === true);
      showDeleteDialog(id, isSuperAdmin);
    },

    permanentDelete: function(id) {
      showPermanentDeleteDialog(id);
    },

    closeDeleteDialog: function() { closeDeleteDialog(); }
  };
})();
