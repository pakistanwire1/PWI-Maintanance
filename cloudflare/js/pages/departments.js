var Department = (function() {
  var state = { data: [], page: 1, search: '', editingId: null, sections: [] };
  var PAGE_SIZE = 10;

  function getFilteredData() {
    var q = state.search.toLowerCase();
    if (!q) return state.data;
    return state.data.filter(function(d) {
      return (d.Department || '').toLowerCase().indexOf(q) >= 0 ||
             (d.DepartmentID || '').toLowerCase().indexOf(q) >= 0 ||
             (d.DepartmentCode || '').toLowerCase().indexOf(q) >= 0 ||
             (d.Section || '').toLowerCase().indexOf(q) >= 0 ||
             (d.DepartmentHead || '').toLowerCase().indexOf(q) >= 0 ||
             (d.Description || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderTable() {
    var filtered = getFilteredData();
    Table.render('departmentsTableContainer', {
      data: filtered,
      columns: [
        { key: 'DepartmentID', label: 'ID' },
        { key: 'Department', label: 'Department' },
        { key: 'Section', label: 'Section' },
        { key: 'SectionID', label: 'SecID' },
        { key: 'DepartmentCode', label: 'Code' },
        { key: 'DepartmentHead', label: 'Head' },
        { key: 'Description', label: 'Description' },
        { key: 'SundayOff', label: 'Sun Off', badge: true, badgeMap: { 'Yes': 'warning', 'No': 'success' } },
        { key: 'HoursPerDay', label: 'Hrs/Day' },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'danger' } }
      ],
      actions: [
        { icon: 'edit', label: 'Edit', color: 'primary', onclick: "Department.openEdit('{id}')", idField: 'DepartmentID' },
        { icon: 'trash', label: 'Delete', color: 'danger', onclick: "Department.confirmDelete('{id}')", idField: 'DepartmentID' }
      ],
      page: state.page,
      pageSize: PAGE_SIZE,
      emptyMsg: 'No departments found',
      onPageClick: 'Department.goToPage({page})',
      onPrev: 'Department.prevPage()',
      onNext: 'Department.nextPage()'
    });
  }

  function loadData() {
    console.log('[DEPARTMENTS] loadData called');
    Loader.show();
    Promise.all([
      API.post('getDepartmentList', {}),
      API.post('getSectionList', {})
    ]).then(function(results) {
      Loader.hide();
      state.data = Array.isArray(results[0]) ? results[0] : [];
      state.sections = Array.isArray(results[1]) ? results[1] : [];
      console.log('[DEPARTMENTS] Depts received: ' + state.data.length + ', Sections: ' + state.sections.length + ', sample:', state.data.length > 0 ? state.data[0] : 'empty');
      renderTable();
    }).catch(function(err) {
      Loader.hide();
      console.error('[DEPARTMENTS] loadData FAILED:', err.message);
      Notify.error('Failed to load departments');
      state.data = [];
      renderTable();
    });
  }

  function populateSectionDropdown(selectedVal) {
    var sel = document.getElementById('deptSection');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Section</option>';
    state.sections.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s.SectionID;
      opt.textContent = s.Section || '';
      if (selectedVal && (opt.value === selectedVal || opt.textContent === selectedVal)) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    });
  }

  function onDeptSectionChange() {
    var sel = document.getElementById('deptSection');
    if (!sel) return;
    var sectionId = sel.value;
    if (sectionId && state.sections) {
      var section = state.sections.find(function(s) { return s.SectionID === sectionId; });
      if (section) {
        var el;
        el = document.getElementById('deptSundayOff'); if (el) el.value = section.SundayOff || 'No';
        el = document.getElementById('deptHoursPerDay'); if (el) el.value = section.HoursPerDay || '8';
        return;
      }
    }
  }

  function renderPage(el) {
    el.innerHTML =
      '<div class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Department Master</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              Icons.search +
              '<input type="text" class="search-input" id="deptSearchInput" placeholder="Search departments..." oninput="Department.onSearch(this.value)">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Department.openAdd()">' + Icons.plus + ' Add Department</button>' +
          '</div>' +
        '</div>' +
        '<div id="departmentsTableContainer"></div>' +
      '</div></div>' +

      '<div class="modal-overlay" id="deptFormModal">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="deptFormTitle">Add Department</div>' +
            '<button class="modal-close" onclick="Department.closeModal()">&times;</button>' +
          '</div>' +
          '<form id="deptForm" onsubmit="return false">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="DepartmentID" id="editDeptId">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Department Name *</label>' +
                  '<input type="text" name="Department" class="form-control" id="deptName" placeholder="Enter department name" required>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Section</label>' +
                  '<select name="SectionID" class="form-control" id="deptSection" onchange="Department.onSectionChange()">' +
                    '<option value="">Select Section</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Sunday Off (from Section)</label>' +
                  '<select name="SundayOff" class="form-control" id="deptSundayOff">' +
                    '<option value="No">No</option>' +
                    '<option value="Yes">Yes</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Hours Per Day (from Section) *</label>' +
                  '<input type="number" name="HoursPerDay" class="form-control" id="deptHoursPerDay" placeholder="8" min="1" max="24" step="0.5">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Department Code</label>' +
                  '<input type="text" name="DepartmentCode" class="form-control" id="deptCode" placeholder="e.g. PROD, MAINT">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Department Head</label>' +
                  '<input type="text" name="DepartmentHead" class="form-control" id="deptHead" placeholder="Head of department">' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Description</label>' +
                '<textarea name="Description" class="form-control" id="deptDescription" rows="2" placeholder="Enter description"></textarea>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Status</label>' +
                  '<select name="Status" class="form-control" id="deptStatus">' +
                    '<option value="Active">Active</option>' +
                    '<option value="Inactive">Inactive</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Department.closeModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary" id="deptSaveBtn" onclick="Department.save()">Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  return {
    init: function(el) {
      renderPage(el);
      loadData();
    },

    show: function() {
      var el = document.getElementById('pageContent');
      if (!el) return;
      renderPage(el);
      loadData();
    },

    onSearch: function(value) {
      state.search = value;
      state.page = 1;
      renderTable();
    },

    goToPage: function(page) { state.page = page; renderTable(); },
    prevPage: function() { if (state.page > 1) { state.page--; renderTable(); } },
    nextPage: function() {
      var totalPages = Math.ceil(getFilteredData().length / PAGE_SIZE) || 1;
      if (state.page < totalPages) { state.page++; renderTable(); }
    },

    onSectionChange: function() { onDeptSectionChange(); },

    openAdd: function() {
      state.editingId = null;
      document.getElementById('deptFormTitle').textContent = 'Add Department';
      var el;
      el = document.getElementById('editDeptId'); if (el) el.value = '';
      Forms.reset('deptForm');
      el = document.getElementById('deptSundayOff'); if (el) el.value = 'No';
      el = document.getElementById('deptHoursPerDay'); if (el) el.value = '8';
      el = document.getElementById('deptStatus'); if (el) el.value = 'Active';
      populateSectionDropdown('');
      var overlay = document.getElementById('deptFormModal');
      if (overlay) overlay.classList.add('show');
    },

    openEdit: function(id) {
      var item = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].DepartmentID) === String(id)) {
          item = state.data[i];
          break;
        }
      }
      if (!item) { Notify.error('Department not found'); return; }
      state.editingId = id;
      document.getElementById('deptFormTitle').textContent = 'Edit Department - ' + id;
      populateSectionDropdown(item.SectionID || item.Section || '');
      Forms.set('deptForm', {
        DepartmentID: item.DepartmentID || '',
        Department: item.Department || '',
        SectionID: item.SectionID || '',
        SundayOff: item.SundayOff || 'No',
        HoursPerDay: item.HoursPerDay || '8',
        DepartmentCode: item.DepartmentCode || '',
        DepartmentHead: item.DepartmentHead || '',
        Description: item.Description || '',
        Status: item.Status || 'Active'
      });
      var overlay = document.getElementById('deptFormModal');
      if (overlay) overlay.classList.add('show');
    },

    closeModal: function() {
      var overlay = document.getElementById('deptFormModal');
      if (overlay) overlay.classList.remove('show');
      state.editingId = null;
    },

    save: function() {
      var data = Forms.get('deptForm');
      if (!data.Department || !data.Department.trim()) {
        Notify.error('Department name is required');
        return;
      }
      if (!data.HoursPerDay || parseFloat(data.HoursPerDay) <= 0) {
        Notify.error('Hours Per Day must be a positive number');
        return;
      }

      var sectionSel = document.getElementById('deptSection');
      var sectionText = '';
      if (sectionSel && sectionSel.selectedIndex > 0) {
        sectionText = sectionSel.options[sectionSel.selectedIndex].textContent;
      }
      data.Section = sectionText;

      var payload = {
        Department: (data.Department || '').trim(),
        SectionID: data.SectionID || '',
        Section: sectionText,
        SundayOff: data.SundayOff || 'No',
        HoursPerDay: data.HoursPerDay || '8',
        DepartmentCode: (data.DepartmentCode || '').trim(),
        DepartmentHead: (data.DepartmentHead || '').trim(),
        Description: (data.Description || '').trim(),
        Status: data.Status || 'Active'
      };

      var isEdit = !!state.editingId;
      var saveBtn = document.getElementById('deptSaveBtn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = isEdit ? 'Updating...' : 'Saving...'; }

      if (isEdit) payload.id = state.editingId;
      var fn = isEdit ? 'modifyDepartment' : 'createDepartment';

      API.post(fn, payload)
        .then(function() {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
          Department.closeModal();
          Notify.success('Department ' + (isEdit ? 'updated' : 'created') + ' successfully');
          loadData();
        })
        .catch(function(err) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
          Notify.error(err.message || 'Failed to save department');
        });
    },

    confirmDelete: function(id) {
      var item = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].DepartmentID) === String(id)) {
          item = state.data[i];
          break;
        }
      }
      if (!item) { Notify.error('Department not found'); return; }
      Modal.confirm(
        'Delete Department',
        'Are you sure you want to delete this department?',
        function() {
          Loader.show();
          API.post('removeDepartment', { id: id })
            .then(function() {
              Loader.hide();
              Notify.success('Department deleted successfully');
              if (state.page > 1) {
                var filtered = getFilteredData();
                var totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
                if (state.page > totalPages) state.page = totalPages;
              }
              loadData();
            })
            .catch(function(err) {
              Loader.hide();
              Notify.error(err.message || 'Failed to delete department');
            });
        }
      );
    }
  };
})();
