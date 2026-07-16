/* ============================================================
   departments.js — Departments Page Module
   GAS-identical: DepartmentsPage.html
   ============================================================ */

(function() {
  var deptsData = [];
  var deptsPage = 1;
  var deptSectionsCache = null;

  App.registerPage('departments', render, load);

  function render() {
    var el = document.getElementById('page-departments');
    el.innerHTML =
      '<div id="departmentsPage">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Department Master</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>' +
                '<input type="text" class="search-input" id="deptSearchInput" placeholder="Search departments..." oninput="searchDeptsTable(this.value)">' +
              '</div>' +
              '<button class="btn btn-primary" onclick="openDeptForm()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg> Add Department</button>' +
            '</div>' +
          '</div>' +
          '<div id="departmentsTableContainer"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="deptFormModal">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="deptFormTitle">Add Department</div>' +
            '<button class="modal-close" onclick="hideModal(\'deptFormModal\')">&times;</button>' +
          '</div>' +
          '<form id="deptForm" onsubmit="return saveDept(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="DepartmentID" id="editDeptId">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Department Name *</label>' +
                  '<input type="text" name="Department" class="form-control" id="deptName" placeholder="Enter department name" required>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Section</label>' +
                  '<select name="SectionID" class="form-control" id="deptSection" onchange="onDeptSectionChange()">' +
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
              '<button type="button" class="btn btn-secondary" onclick="hideModal(\'deptFormModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg> Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getDepartmentList')
      .then(function(data) {
        deptsData = data || [];
        App.showLoading(false);
        renderDeptsTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Error loading departments: ' + err.message, 'error');
      });
  }

  function renderDeptsTable() {
    renderTable(deptsData, [
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
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "editDept('{id}')", idField: 'DepartmentID' },
      { label: 'Delete', icon: 'trash', color: 'danger', onclick: "deleteDept('{id}')", idField: 'DepartmentID' }
    ], deptsPage, PAGE_SIZE, 'departmentsTableContainer');
    registerPageState('departmentsTableContainer', function(p) { deptsPage = p; renderDeptsTable(); });
  }

  function loadDeptSectionsCache(callback) {
    if (deptSectionsCache) { if (callback) callback(deptSectionsCache); return; }
    API.call('getSectionList')
      .then(function(sections) {
        deptSectionsCache = sections || [];
        if (callback) callback(deptSectionsCache);
      })
      .catch(function() { deptSectionsCache = []; if (callback) callback([]); });
  }

  function populateSectionDropdown(selectedVal) {
    var sel = document.getElementById('deptSection');
    if (!sel) return;
    loadDeptSectionsCache(function(sections) {
      sel.innerHTML = '<option value="">Select Section</option>';
      sections.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.SectionID;
        opt.textContent = s.Section || '';
        if (selectedVal && (opt.value === selectedVal || opt.textContent === selectedVal)) {
          opt.selected = true;
        }
        sel.appendChild(opt);
      });
      if (selectedVal) onDeptSectionChange();
    });
  }

  window.onDeptSectionChange = function() {
    var sel = document.getElementById('deptSection');
    if (!sel) return;
    var sectionId = sel.value;
    if (sectionId && deptSectionsCache) {
      var section = deptSectionsCache.find(function(s) { return s.SectionID === sectionId; });
      if (section) {
        var el;
        el = document.getElementById('deptSundayOff'); if (el) el.value = section.SundayOff || 'No';
        el = document.getElementById('deptHoursPerDay'); if (el) el.value = section.HoursPerDay || '8';
        return;
      }
    }
  };

  window.openDeptForm = function() {
    var el;
    el = document.getElementById('editDeptId'); if (el) el.value = '';
    resetForm('deptForm');
    el = document.getElementById('deptSundayOff'); if (el) el.value = 'No';
    el = document.getElementById('deptHoursPerDay'); if (el) el.value = '8';
    el = document.getElementById('deptStatus'); if (el) el.value = 'Active';
    populateSectionDropdown('');
    showModal('deptFormModal');
    el = document.getElementById('deptFormTitle'); if (el) el.textContent = 'Add Department';
  };

  window.editDept = function(id) {
    var item = deptsData.find(function(d) { return d.DepartmentID === id || d.DeptID === id; });
    if (!item) return;
    setFormData('deptForm', item);
    var el;
    el = document.getElementById('editDeptId'); if (el) el.value = id;
    el = document.getElementById('deptFormTitle'); if (el) el.textContent = 'Edit Department - ' + id;
    populateSectionDropdown(item.SectionID || item.Section || '');
    showModal('deptFormModal');
  };

  window.saveDept = function(event) {
    event.preventDefault();
    var idEl = document.getElementById('editDeptId'); var id = idEl ? idEl.value : '';
    var data = getFormData('deptForm');
    var sectionSel = document.getElementById('deptSection');
    var sectionText = '';
    if (sectionSel && sectionSel.selectedIndex > 0) {
      sectionText = sectionSel.options[sectionSel.selectedIndex].textContent;
    }
    data.Section = sectionText;
    if (!data.Department) { App.showToast('Department name is required', 'warning'); return false; }
    if (!data.HoursPerDay || parseFloat(data.HoursPerDay) <= 0) { App.showToast('Hours Per Day must be a positive number', 'warning'); return false; }
    App.showLoading(true);
    var fn = id ? 'modifyDepartment' : 'createDepartment';
    var payload = id ? { id: id, data: data } : data;
    API.call(fn, payload)
      .then(function() {
        App.showLoading(false);
        hideModal('deptFormModal');
        App.showToast('Department ' + (id ? 'updated' : 'created') + ' successfully', 'success');
        load();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Error: ' + err.message, 'error');
      });
    return false;
  };

  window.deleteDept = function(id) {
    showConfirm('Delete Department', 'Are you sure you want to delete this department?', function() {
      App.showLoading(true);
      API.call('removeDepartment', { id: id })
        .then(function() {
          App.showLoading(false);
          App.showToast('Department deleted successfully', 'success');
          load();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Error: ' + err.message, 'error');
        });
    });
  };

  window.searchDeptsTable = function(query) {
    if (!query) { deptsPage = 1; renderDeptsTable(); return; }
    var q = query.toLowerCase();
    var filtered = deptsData.filter(function(d) {
      return (d.Department || '').toLowerCase().indexOf(q) >= 0 ||
             (d.DepartmentID || '').toLowerCase().indexOf(q) >= 0 ||
             (d.DepartmentCode || '').toLowerCase().indexOf(q) >= 0 ||
             (d.Section || '').toLowerCase().indexOf(q) >= 0 ||
             (d.DepartmentHead || '').toLowerCase().indexOf(q) >= 0 ||
             (d.Description || '').toLowerCase().indexOf(q) >= 0;
    });
    deptsPage = 1;
    renderTable(filtered, [
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
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "editDept('{id}')", idField: 'DepartmentID' },
      { label: 'Delete', icon: 'trash', color: 'danger', onclick: "deleteDept('{id}')", idField: 'DepartmentID' }
    ], 1, PAGE_SIZE, 'departmentsTableContainer');
  };
})();
