var Machine = (function() {
  var state = { data: [], filtered: [], page: 1, search: '', editingId: null, sections: [], departments: [] };
  var PAGE_SIZE = 10;

  function container() { return document.getElementById('pageContent'); }

  function buildPage() {
    return '<div class="page"><div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">Machine Master</div>' +
        '<div class="card-actions">' +
          '<div class="search-box">' + Icons.search +
            '<input type="text" class="search-input" id="machineSearch" placeholder="Search machines..." oninput="Machine.onSearch(this.value)">' +
          '</div>' +
          '<button class="btn btn-primary" onclick="Machine.openAdd()">' + Icons.plus + ' Add Machine</button>' +
        '</div>' +
      '</div>' +
      '<div id="machineTable"></div>' +
    '</div></div>' + buildModal();
  }

  function buildModal() {
    return '<div class="modal-overlay" id="machineFormModal">' +
      '<div class="modal modal-wide" style="max-width:900px">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="machineFormTitle">Add Machine</div>' +
          '<button class="modal-close" onclick="Machine.closeModal()">&times;</button>' +
        '</div>' +
        '<form id="machineForm" onsubmit="return false">' +
          '<div class="modal-body">' +
            '<input type="hidden" name="MachineID" id="editMachineId">' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Machine Code *</label><input type="text" name="MachineCode" class="form-control" id="mcCode" oninput="var el=document.getElementById(\'mcNumber\');if(el)el.value=this.value" required></div>' +
              '<div class="form-group"><label>Machine Name *</label><input type="text" name="MachineName" class="form-control" id="mcName" required></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Machine Number</label><input type="text" name="MachineNumber" class="form-control" id="mcNumber" readonly placeholder="Auto from Code"></div>' +
              '<div class="form-group"><label>Department *</label><select name="DeptID" class="form-control" id="mcDept" onchange="Machine.onDeptChange()"><option value="">Select Department</option></select></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Section</label><select name="SectionID" class="form-control" id="mcSection"><option value="">Auto from Department</option></select></div>' +
              '<div class="form-group"><label>Location</label><input type="text" name="Location" class="form-control" id="mcLocation"></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Machine Type</label><select name="MachineType" class="form-control" id="mcType"></select></div>' +
              '<div class="form-group"><label>Manufacturer</label><input type="text" name="Manufacturer" class="form-control" id="mcManufacturer"></div>' +
              '<div class="form-group"><label>Model</label><input type="text" name="Model" class="form-control" id="mcModel"></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Serial No</label><input type="text" name="SerialNo" class="form-control" id="mcSerialNo"></div>' +
              '<div class="form-group"><label>Capacity</label><input type="text" name="Capacity" class="form-control" id="mcCapacity" placeholder="e.g. 500 kg"></div>' +
              '<div class="form-group"><label>Power Rating</label><input type="text" name="PowerRating" class="form-control" id="mcPower" placeholder="e.g. 50 kW"></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Install Date</label><input type="date" name="InstallDate" class="form-control" id="mcInstallDate"></div>' +
              '<div class="form-group"><label>Warranty Expiry</label><input type="date" name="WarrantyExpiry" class="form-control" id="mcWarranty"></div>' +
              '<div class="form-group"><label>Criticality</label><select name="Criticality" class="form-control" id="mcCriticality"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>QR Code</label><input type="text" name="QRCode" class="form-control" id="mcQRCode" placeholder="Scan or enter QR code"></div>' +
              '<div class="form-group"><label>Status</label><select name="Status" class="form-control" id="mcStatus"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Under Maintenance">Under Maintenance</option><option value="Retired">Retired</option></select></div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="Machine.closeModal()">Cancel</button>' +
            '<button type="submit" class="btn btn-primary" id="machineSaveBtn" onclick="Machine.save()">Save</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';
  }

  function applyFilter() {
    var q = state.search.toLowerCase().trim();
    if (!q) { state.filtered = state.data.slice(); }
    else {
      state.filtered = state.data.filter(function(m) {
        return (m.MachineName || '').toLowerCase().indexOf(q) > -1 ||
               (m.MachineCode || '').toLowerCase().indexOf(q) > -1 ||
               (m.MachineType || '').toLowerCase().indexOf(q) > -1 ||
               (m.Model || '').toLowerCase().indexOf(q) > -1 ||
               (m.Manufacturer || '').toLowerCase().indexOf(q) > -1;
      });
    }
    state.page = 1;
    renderTable();
  }

  function renderTable() {
    Table.render('machineTable', {
      data: state.filtered,
      columns: [
        { key: 'MachineID', label: 'ID' },
        { key: 'MachineCode', label: 'Code' },
        { key: 'MachineName', label: 'Machine Name' },
        { key: 'Department', label: 'Dept' },
        { key: 'Section', label: 'Section' },
        { key: 'Location', label: 'Location' },
        { key: 'MachineType', label: 'Type' },
        { key: 'Manufacturer', label: 'Mfr' },
        { key: 'Model', label: 'Model' },
        { key: 'Capacity', label: 'Capacity' },
        { key: 'PowerRating', label: 'Power' },
        { key: 'Criticality', label: 'Criticality', badge: true, badgeMap: { 'Critical': 'danger', 'High': 'warning', 'Medium': 'primary', 'Low': 'success' } },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'secondary', 'Under Maintenance': 'warning', 'Retired': 'danger' } }
      ],
      actions: [
        { icon: 'edit', label: 'Edit', color: 'primary', onclick: "Machine.openEdit('{id}')", idField: 'MachineID' },
        { icon: 'trash', label: 'Delete', color: 'danger', onclick: "Machine.confirmDelete('{id}')", idField: 'MachineID' }
      ],
      page: state.page,
      pageSize: PAGE_SIZE,
      emptyMsg: 'No machines found',
      onPageClick: 'Machine.goToPage({page})',
      onPrev: 'Machine.prevPage()',
      onNext: 'Machine.nextPage()'
    });
  }

  function loadDeptCache(cb) {
    API.post('getDepartmentList', {}).then(function(depts) {
      state.departments = Array.isArray(depts) ? depts : [];
      cb();
    }).catch(function() { state.departments = []; cb(); });
  }

  function populateDeptDropdown(selectedDeptId) {
    var sel = document.getElementById('mcDept');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Department</option>';
    state.departments.forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d.DepartmentID;
      opt.textContent = d.Department || '';
      if (selectedDeptId && opt.value === selectedDeptId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function onDeptChange() {
    var deptId = document.getElementById('mcDept').value;
    var sectionSel = document.getElementById('mcSection');
    if (sectionSel) sectionSel.innerHTML = '<option value="">Select Section</option>';
    if (deptId && state.departments) {
      var dept = state.departments.find(function(d) { return d.DepartmentID === deptId; });
      if (dept && dept.SectionID) {
        var opt = document.createElement('option');
        opt.value = dept.SectionID;
        opt.textContent = dept.Section || '';
        opt.selected = true;
        sectionSel.appendChild(opt);
      }
    }
  }

  function populateTypeSelect() {
    var sel = document.getElementById('mcType');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Type</option>';
    (Constants.MACHINE_TYPES || []).forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      sel.appendChild(opt);
    });
  }

  function loadData() {
    console.log('[MACHINES] loadData called');
    Loader.show();
    API.post('getMachines', {}).then(function(result) {
      Loader.hide();
      state.data = Array.isArray(result) ? result : [];
      console.log('[MACHINES] Rows received: ' + state.data.length + ', sample:', state.data.length > 0 ? state.data[0] : 'empty');
      applyFilter();
    }).catch(function(err) {
      Loader.hide();
      console.error('[MACHINES] loadData FAILED:', err.message);
      Notify.error('Failed to load machines');
      state.data = [];
      state.filtered = [];
      renderTable();
    });
  }

  var pendingDeleteId = null;

  return {
    init: function() {
      state.data = []; state.filtered = []; state.page = 1; state.search = '';
      state.editingId = null; state.sections = []; state.departments = [];
    },

    show: function() {
      var el = container();
      if (!el) return;
      state.data = []; state.filtered = []; state.page = 1; state.search = '';
      state.editingId = null;
      el.innerHTML = buildPage();
      loadDeptCache(function() { loadData(); });
    },

    onSearch: function(val) { state.search = val || ''; applyFilter(); },
    goToPage: function(p) { state.page = p; renderTable(); },
    prevPage: function() { if (state.page > 1) { state.page--; renderTable(); } },
    nextPage: function() { if (state.page < Math.ceil(state.filtered.length / PAGE_SIZE)) { state.page++; renderTable(); } },

    onDeptChange: function() { onDeptChange(); },

    openAdd: function() {
      state.editingId = null;
      var title = document.getElementById('machineFormTitle');
      if (title) title.textContent = 'Add Machine';
      Forms.reset('machineForm');
      populateDeptDropdown('');
      populateTypeSelect();
      var el;
      el = document.getElementById('mcCriticality'); if (el) el.value = 'Low';
      el = document.getElementById('mcStatus'); if (el) el.value = 'Active';
      var btn = document.getElementById('machineSaveBtn');
      if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
      Modal.show('machineFormModal');
    },

    openEdit: function(id) {
      var machine = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].MachineID) === String(id)) { machine = state.data[i]; break; }
      }
      if (!machine) { Notify.error('Machine not found'); return; }
      state.editingId = id;
      var title = document.getElementById('machineFormTitle');
      if (title) title.textContent = 'Edit Machine - ' + id;
      populateDeptDropdown(machine.DeptID || '');
      populateTypeSelect();
      Forms.set('machineForm', {
        MachineID: machine.MachineID || '',
        MachineCode: machine.MachineCode || '',
        MachineName: machine.MachineName || '',
        MachineNumber: machine.MachineNumber || '',
        DeptID: machine.DeptID || '',
        SectionID: machine.SectionID || '',
        Location: machine.Location || '',
        MachineType: machine.MachineType || '',
        Manufacturer: machine.Manufacturer || '',
        Model: machine.Model || '',
        SerialNo: machine.SerialNo || '',
        Capacity: machine.Capacity || '',
        PowerRating: machine.PowerRating || '',
        InstallDate: machine.InstallDate || '',
        WarrantyExpiry: machine.WarrantyExpiry || '',
        Criticality: machine.Criticality || 'Low',
        QRCode: machine.QRCode || '',
        Status: machine.Status || 'Active'
      });
      onDeptChange();
      var btn = document.getElementById('machineSaveBtn');
      if (btn) { btn.textContent = 'Update'; btn.disabled = false; }
      Modal.show('machineFormModal');
    },

    closeModal: function() { Modal.hide('machineFormModal'); },

    save: function() {
      var data = Forms.get('machineForm');
      if (!data.MachineCode || !data.MachineCode.trim()) { Notify.error('Machine Code is required'); return; }
      if (!data.MachineName || !data.MachineName.trim()) { Notify.error('Machine Name is required'); return; }
      data.MachineNumber = data.MachineNumber || data.MachineCode;
      var deptSel = document.getElementById('mcDept');
      if (deptSel && deptSel.selectedIndex > 0) {
        data.Department = deptSel.options[deptSel.selectedIndex].textContent;
      }
      var secSel = document.getElementById('mcSection');
      if (secSel && secSel.selectedIndex > 0) {
        data.Section = secSel.options[secSel.selectedIndex].textContent;
      }

      var btn = document.getElementById('machineSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = state.editingId ? 'Updating...' : 'Saving...'; }

      var isEdit = !!state.editingId;
      if (isEdit) data.id = state.editingId;
      var action = isEdit ? 'updateMachine' : 'addMachine';

      API.post(action, data).then(function() {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Machine.closeModal();
        Notify.success(state.editingId ? 'Machine updated successfully' : 'Machine added successfully');
        loadData();
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Notify.error(err.message || 'Failed to save machine');
      });
    },

    confirmDelete: function(id) {
      var machine = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].MachineID) === String(id)) { machine = state.data[i]; break; }
      }
      if (!machine) { Notify.error('Machine not found'); return; }
      pendingDeleteId = id;
      Modal.confirm('Delete Machine', 'Are you sure you want to delete this machine?', function() {
        var btn = document.getElementById('machineSaveBtn');
        API.post('deleteMachine', { id: pendingDeleteId }).then(function() {
          pendingDeleteId = null;
          Notify.success('Machine deleted successfully');
          loadData();
        }).catch(function(err) {
          Notify.error(err.message || 'Failed to delete machine');
        });
      });
    }
  };
})();
