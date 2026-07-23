var Technician = (function() {
  var state = { data: [], page: 1, search: '', editingId: null };
  var PAGE_SIZE = 10;

  function filteredData() {
    var q = state.search.toLowerCase();
    if (!q) return state.data;
    return state.data.filter(function(t) {
      return (t.TechnicianName || '').toLowerCase().indexOf(q) > -1 ||
             (t.EmployeeID || '').toLowerCase().indexOf(q) > -1 ||
             (t.Email || '').toLowerCase().indexOf(q) > -1 ||
             (t.Skill || '').toLowerCase().indexOf(q) > -1;
    });
  }

  function renderTable() {
    var rows = filteredData();
    Table.render('techniciansTableContainer', {
      data: rows,
      columns: [
        { key: 'EmployeeID', label: 'Emp ID' },
        { key: 'EmployeeCode', label: 'Code' },
        { key: 'TechnicianName', label: 'Name' },
        { key: 'Designation', label: 'Designation' },
        { key: 'Department', label: 'Department' },
        { key: 'Section', label: 'Section' },
        { key: 'Skill', label: 'Skill' },
        { key: 'Shift', label: 'Shift' },
        { key: 'Mobile', label: 'Mobile' },
        { key: 'Email', label: 'Email' },
        { key: 'JoiningDate', label: 'Joining Date' },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'secondary' } }
      ],
      actions: [
        { icon: 'edit', label: 'Edit', color: 'primary', onclick: "Technician.openEdit('{id}')", idField: 'EmployeeID' },
        { icon: 'trash', label: 'Del', color: 'danger', onclick: "Technician.confirmDelete('{id}')", idField: 'EmployeeID' }
      ],
      page: state.page,
      pageSize: PAGE_SIZE,
      emptyMsg: 'No technicians found.',
      onPageClick: 'Technician.goToPage({page})',
      onPrev: 'Technician.prevPage()',
      onNext: 'Technician.nextPage()'
    });
  }

  function buildFormHtml() {
    var skillOpts = '<option value="">Select Skill</option>';
    (Constants.TECH_SKILLS || Constants.SKILLS || []).forEach(function(s) {
      var val = typeof s === 'string' ? s : (s.id || s.name);
      skillOpts += '<option value="' + Utils.escapeHtml(val) + '">' + Utils.escapeHtml(val) + '</option>';
    });
    var shiftOpts = '<option value="">Select Shift</option>';
    (Constants.TECH_SHIFTS || Constants.SHIFTS || []).forEach(function(s) {
      var val = typeof s === 'string' ? s.id || s : s.id;
      var label = typeof s === 'string' ? s : (s.name || s.id);
      var time = typeof s === 'object' && s.time ? ' (' + s.time + ')' : '';
      shiftOpts += '<option value="' + Utils.escapeHtml(String(val)) + '">' + Utils.escapeHtml(label) + time + '</option>';
    });
    return '' +
      '<form id="technicianForm" onsubmit="return false">' +
        '<div class="modal-body">' +
          '<input type="hidden" name="originalId" id="editTechId">' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Employee ID *</label><input type="text" name="EmployeeID" class="form-control" required id="techEmpId"></div>' +
            '<div class="form-group"><label>Employee Code</label><input type="text" name="EmployeeCode" class="form-control"></div>' +
          '</div>' +
          '<div class="form-group"><label>Technician Name *</label><input type="text" name="TechnicianName" class="form-control" required></div>' +
          '<div class="form-group"><label>Designation</label><input type="text" name="Designation" class="form-control" placeholder="e.g. Senior Technician"></div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Department</label><select name="Department" class="form-control" id="techDept" onchange="Technician.onDeptChange()"><option value="">Select Department</option></select></div>' +
            '<div class="form-group"><label>Section</label><select name="Section" class="form-control" id="techSection"><option value="">Select Section</option></select></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Skill</label><select name="Skill" class="form-control" id="techSkill">' + skillOpts + '</select></div>' +
            '<div class="form-group"><label>Shift</label><select name="Shift" class="form-control" id="techShift">' + shiftOpts + '</select></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Mobile</label><input type="text" name="Mobile" class="form-control"></div>' +
            '<div class="form-group"><label>Email</label><input type="email" name="Email" class="form-control"></div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group"><label>Joining Date</label><input type="date" name="JoiningDate" class="form-control"></div>' +
            '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-secondary" onclick="Technician.closeModal()">Cancel</button>' +
          '<button type="submit" class="btn btn-primary" id="techSaveBtn" onclick="Technician.save()">Save</button>' +
        '</div>' +
      '</form>';
  }

  function buildPageHtml() {
    return '<div class="page"><div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">Technician Master</div>' +
        '<div class="card-actions">' +
          '<div class="search-box">' + Icons.search +
            '<input type="text" class="search-input" id="technicianSearch" placeholder="Search technicians..." oninput="Technician.onSearch(this.value)">' +
          '</div>' +
          '<button class="btn btn-primary" onclick="Technician.openAdd()">' + Icons.plus + ' Add Technician</button>' +
        '</div>' +
      '</div>' +
      '<div id="techniciansTableContainer"></div>' +
    '</div></div>' +

    '<div class="modal-overlay" id="technicianFormModal">' +
      '<div class="modal">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="technicianFormTitle">Add Technician</div>' +
          '<button class="modal-close" onclick="Technician.closeModal()">&times;</button>' +
        '</div>' +
        buildFormHtml() +
      '</div>' +
    '</div>';
  }

  function loadDepts() {
    return API.post('getDepartmentList', {}).then(function(depts) {
      var sel = document.getElementById('techDept');
      if (sel) {
        sel.innerHTML = '<option value="">Select Department</option>';
        (depts || []).forEach(function(d) {
          sel.innerHTML += '<option value="' + Utils.escapeHtml(d.Department || '') + '">' + Utils.escapeHtml(d.Department || '') + '</option>';
        });
      }
    }).catch(function() {});
  }

  function onDeptChange() {
    var dept = (document.getElementById('techDept') || {}).value || '';
    var secSel = document.getElementById('techSection');
    if (secSel) secSel.innerHTML = '<option value="">Select Section</option>';
    if (!dept) return;
    API.post('getSectionList', {}).then(function(sections) {
      if (secSel) {
        (sections || []).forEach(function(s) {
          secSel.innerHTML += '<option value="' + Utils.escapeHtml(s.Section || '') + '">' + Utils.escapeHtml(s.Section || '') + '</option>';
        });
      }
    }).catch(function() {});
  }

  function getData() {
    console.log('[TECHNICIANS] getData called');
    Loader.show();
    return API.post('getTechnicians', {}).then(function(res) {
      Loader.hide();
      state.data = Array.isArray(res) ? res : ((res && res.data) ? res.data : []);
      state.page = 1;
      console.log('[TECHNICIANS] Rows received: ' + state.data.length + ', sample:', state.data.length > 0 ? state.data[0] : 'empty');
      renderTable();
    }).catch(function(err) {
      Loader.hide();
      console.error('[TECHNICIANS] getData FAILED:', err.message);
      Notify.error(err.message || 'Failed to load technicians.');
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

    onDeptChange: function() { onDeptChange(); },

    openAdd: function() {
      state.editingId = null;
      document.getElementById('technicianFormTitle').textContent = 'Add Technician';
      Forms.reset('technicianForm');
      var el = document.getElementById('editTechId'); if (el) el.value = '';
      var empId = document.getElementById('techEmpId'); if (empId) empId.disabled = false;
      loadDepts();
      var secSel = document.getElementById('techSection'); if (secSel) secSel.innerHTML = '<option value="">Select Section</option>';
      var btn = document.getElementById('techSaveBtn'); if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
      Modal.show('technicianFormModal');
    },

    openEdit: function(id) {
      var tech = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].EmployeeID) === String(id)) { tech = state.data[i]; break; }
      }
      if (!tech) { Notify.error('Technician not found.'); return; }
      state.editingId = id;
      document.getElementById('technicianFormTitle').textContent = 'Edit Technician - ' + id;
      loadDepts();
      Forms.set('technicianForm', {
        EmployeeID: tech.EmployeeID || '',
        EmployeeCode: tech.EmployeeCode || '',
        TechnicianName: tech.TechnicianName || '',
        Designation: tech.Designation || '',
        Department: tech.Department || '',
        Section: tech.Section || '',
        Skill: tech.Skill || '',
        Shift: tech.Shift || '',
        Mobile: tech.Mobile || '',
        Email: tech.Email || '',
        JoiningDate: tech.JoiningDate || '',
        Status: tech.Status || 'Active'
      });
      var empId = document.getElementById('techEmpId'); if (empId) empId.disabled = true;
      var el = document.getElementById('editTechId'); if (el) el.value = id;
      onDeptChange();
      setTimeout(function() {
        if (tech.Section) {
          var ts = document.getElementById('techSection'); if (ts) ts.value = tech.Section;
        }
      }, 300);
      var btn = document.getElementById('techSaveBtn'); if (btn) { btn.textContent = 'Update'; btn.disabled = false; }
      Modal.show('technicianFormModal');
    },

    closeModal: function() { Modal.hide('technicianFormModal'); state.editingId = null; },

    save: function() {
      var formData = Forms.get('technicianForm');
      if (!formData.TechnicianName || !formData.TechnicianName.trim()) { Notify.error('Technician name is required.'); return; }
      if (!formData.EmployeeID || !formData.EmployeeID.trim()) { Notify.error('Employee ID is required.'); return; }

      var isEdit = state.editingId != null;
      if (isEdit) formData.id = state.editingId;
      var action = isEdit ? 'updateTechnician' : 'addTechnician';

      var btn = document.getElementById('techSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = isEdit ? 'Updating...' : 'Saving...'; }

      API.post(action, formData).then(function() {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Modal.hide('technicianFormModal');
        Notify.success(isEdit ? 'Technician updated successfully.' : 'Technician added successfully.');
        getData();
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Notify.error(err.message || 'Failed to save technician.');
      });
    },

    confirmDelete: function(id) {
      var tech = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].EmployeeID) === String(id)) { tech = state.data[i]; break; }
      }
      var name = tech ? (tech.TechnicianName || '') : 'this technician';
      Modal.confirm('Delete Technician', 'Are you sure you want to delete "' + name + '"?', function() {
        Loader.show();
        API.post('deleteTechnician', { id: id }).then(function() {
          Loader.hide();
          Notify.success('Technician deleted successfully.');
          getData();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete technician.');
        });
      });
    }
  };
})();
