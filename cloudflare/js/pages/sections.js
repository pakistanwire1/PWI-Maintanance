var Section = (function() {
  var state = { data: [], page: 1, search: '', editingId: null };
  var PAGE_SIZE = 10;

  function getFilteredData() {
    var q = state.search.toLowerCase();
    if (!q) return state.data;
    return state.data.filter(function(s) {
      return (s.Section || '').toLowerCase().indexOf(q) >= 0 ||
             (s.SectionCode || '').toLowerCase().indexOf(q) >= 0 ||
             (s.SectionID || '').toLowerCase().indexOf(q) >= 0 ||
             (s.Description || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderTable() {
    var filtered = getFilteredData();
    Table.render('sectionsTableContainer', {
      data: filtered,
      columns: [
        { key: 'SectionID', label: 'ID' },
        { key: 'Section', label: 'Section Name' },
        { key: 'Description', label: 'Description' },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'danger' } },
        { key: 'SundayOff', label: 'Sun Off', badge: true, badgeMap: { 'No': 'success', 'Sunday': 'warning', 'Monday': 'warning', 'Tuesday': 'warning', 'Wednesday': 'warning', 'Thursday': 'warning', 'Friday': 'warning', 'Saturday': 'warning' } },
        { key: 'HoursPerDay', label: 'Hrs/Day' },
        { key: 'SectionCode', label: 'Code' },
        { key: 'DepartmentCount', label: 'Depts' }
      ],
      actions: [
        { icon: 'edit', label: 'Edit', color: 'primary', onclick: "Section.openEdit('{id}')", idField: 'SectionID' },
        { icon: 'trash', label: 'Delete', color: 'danger', onclick: "Section.confirmDelete('{id}')", idField: 'SectionID' }
      ],
      page: state.page,
      pageSize: PAGE_SIZE,
      emptyMsg: 'No sections found',
      onPageClick: 'Section.goToPage({page})',
      onPrev: 'Section.prevPage()',
      onNext: 'Section.nextPage()'
    });
  }

  function loadData() {
    console.log('[SECTIONS] loadData called');
    Loader.show();
    API.post('getSectionList', {})
      .then(function(result) {
        Loader.hide();
        state.data = Array.isArray(result) ? result : (result.data || []);
        console.log('[SECTIONS] Rows received: ' + state.data.length + ', sample:', state.data.length > 0 ? state.data[0] : 'empty');
        renderTable();
      })
      .catch(function(err) {
        Loader.hide();
        console.error('[SECTIONS] loadData FAILED:', err.message);
        Notify.error('Failed to load sections');
        state.data = [];
        renderTable();
      });
  }

  function renderPage(el) {
    el.innerHTML =
      '<div class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Section Master</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              Icons.search +
              '<input type="text" class="search-input" id="sectionSearchInput" placeholder="Search sections..." oninput="Section.onSearch(this.value)">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Section.openAdd()">' + Icons.plus + ' Add Section</button>' +
          '</div>' +
        '</div>' +
        '<div id="sectionsTableContainer"></div>' +
      '</div></div>' +

      '<div class="modal-overlay" id="sectionFormModal">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="sectionFormTitle">Add Section</div>' +
            '<button class="modal-close" onclick="Section.closeModal()">&times;</button>' +
          '</div>' +
          '<form id="sectionForm" onsubmit="return false">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="SectionID" id="editSectionId">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Section Name *</label>' +
                  '<input type="text" name="Section" class="form-control" id="sectionName" placeholder="Enter section name" required>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Section Code *</label>' +
                  '<input type="text" name="SectionCode" class="form-control" id="sectionCode" placeholder="e.g. ADM" required>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Description</label>' +
                '<textarea name="Description" class="form-control" id="sectionDescription" rows="2" placeholder="Enter description"></textarea>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Status</label>' +
                  '<select name="Status" class="form-control" id="sectionStatus">' +
                    '<option value="Active">Active</option>' +
                    '<option value="Inactive">Inactive</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Sunday Off</label>' +
                  '<select name="SundayOff" class="form-control" id="sectionSundayOff">' +
                    '<option value="Sunday">Sunday</option>' +
                    '<option value="Monday">Monday</option>' +
                    '<option value="Tuesday">Tuesday</option>' +
                    '<option value="Wednesday">Wednesday</option>' +
                    '<option value="Thursday">Thursday</option>' +
                    '<option value="Friday">Friday</option>' +
                    '<option value="Saturday">Saturday</option>' +
                    '<option value="No">No</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Hours Per Day</label>' +
                  '<input type="number" name="HoursPerDay" class="form-control" id="sectionHoursPerDay" placeholder="8" min="1" max="24" step="0.5">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Department Count</label>' +
                  '<input type="number" name="DepartmentCount" class="form-control" id="sectionDeptCount" placeholder="0" min="0" readonly>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Section.closeModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary" id="sectionSaveBtn" onclick="Section.save()">Save</button>' +
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

    openAdd: function() {
      state.editingId = null;
      document.getElementById('sectionFormTitle').textContent = 'Add Section';
      var el;
      el = document.getElementById('editSectionId'); if (el) el.value = '';
      Forms.reset('sectionForm');
      el = document.getElementById('sectionSundayOff'); if (el) el.value = 'Sunday';
      el = document.getElementById('sectionHoursPerDay'); if (el) el.value = '8';
      el = document.getElementById('sectionDeptCount'); if (el) el.value = '0';
      el = document.getElementById('sectionStatus'); if (el) el.value = 'Active';
      var overlay = document.getElementById('sectionFormModal');
      if (overlay) overlay.classList.add('show');
    },

    openEdit: function(id) {
      var item = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].SectionID) === String(id)) {
          item = state.data[i];
          break;
        }
      }
      if (!item) { Notify.error('Section not found'); return; }
      state.editingId = id;
      document.getElementById('sectionFormTitle').textContent = 'Edit Section - ' + id;
      Forms.set('sectionForm', {
        SectionID: item.SectionID || '',
        Section: item.Section || '',
        SectionCode: item.SectionCode || '',
        Description: item.Description || '',
        Status: item.Status || 'Active',
        SundayOff: item.SundayOff || 'Sunday',
        HoursPerDay: item.HoursPerDay || '8',
        DepartmentCount: item.DepartmentCount || '0'
      });
      var overlay = document.getElementById('sectionFormModal');
      if (overlay) overlay.classList.add('show');
    },

    closeModal: function() {
      var overlay = document.getElementById('sectionFormModal');
      if (overlay) overlay.classList.remove('show');
      state.editingId = null;
    },

    save: function() {
      var data = Forms.get('sectionForm');
      if (!data.Section || !data.Section.trim()) {
        Notify.error('Section name is required');
        return;
      }
      if (!data.SectionCode || !data.SectionCode.trim()) {
        Notify.error('Section code is required');
        return;
      }
      if (!data.HoursPerDay || parseFloat(data.HoursPerDay) <= 0) {
        Notify.error('Hours Per Day must be a positive number');
        return;
      }

      var payload = {
        Section: (data.Section || '').trim(),
        SectionCode: (data.SectionCode || '').trim(),
        Description: (data.Description || '').trim(),
        Status: data.Status || 'Active',
        SundayOff: data.SundayOff || 'Sunday',
        HoursPerDay: data.HoursPerDay || '8',
        DepartmentCount: data.DepartmentCount || '0'
      };

      var isEdit = !!state.editingId;
      var saveBtn = document.getElementById('sectionSaveBtn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = isEdit ? 'Updating...' : 'Saving...'; }

      if (isEdit) payload.id = state.editingId;
      var fn = isEdit ? 'modifySection' : 'createSection';

      API.post(fn, payload)
        .then(function() {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
          Section.closeModal();
          Notify.success('Section ' + (isEdit ? 'updated' : 'created') + ' successfully');
          loadData();
        })
        .catch(function(err) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
          Notify.error(err.message || 'Failed to save section');
        });
    },

    confirmDelete: function(id) {
      var item = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].SectionID) === String(id)) {
          item = state.data[i];
          break;
        }
      }
      if (!item) { Notify.error('Section not found'); return; }
      Modal.confirm(
        'Delete Section',
        'Are you sure you want to delete this section?',
        function() {
          Loader.show();
          API.post('removeSection', { id: id })
            .then(function() {
              Loader.hide();
              Notify.success('Section deleted successfully');
              if (state.page > 1) {
                var filtered = getFilteredData();
                var totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
                if (state.page > totalPages) state.page = totalPages;
              }
              loadData();
            })
            .catch(function(err) {
              Loader.hide();
              Notify.error(err.message || 'Failed to delete section');
            });
        }
      );
    }
  };
})();
