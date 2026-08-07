function registerPageState(containerId, renderFn) {
  if (!window.__pageStates) window.__pageStates = {};
  window.__pageStates[containerId] = renderFn;
}

function changePage(containerId, page) {
  var state = window.__pageStates || {};
  if (state[containerId]) state[containerId](page);
}

var Machine = (function() {
  var state = { data: [], page: 1, editingId: null, departments: [] };
  var PAGE_SIZE = 10;
  var pendingDeleteId = null;

  var ICONS = {
    add: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>',
    save: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>',
    view: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/><circle cx="10" cy="10" r="2.5"/></svg>',
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/><path d="M8 8v6"/><path d="M12 8v6"/></svg>'
  };
  var SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var EMPTY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>';

  var COLUMNS = [
    { key: 'MachineID', label: 'ID' },
    { key: 'MachineCode', label: 'Code' },
    { key: 'MachineName', label: 'Machine Name' },
    { key: 'MachineNumber', label: 'Number' },
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
  ];

  var ACTIONS = [
    { label: 'Passport', icon: 'view', color: 'info', onclick: "Machine.openPassport('{id}')", idField: 'MachineID' },
    { label: 'Edit', icon: 'edit', color: 'primary', onclick: "Machine.openEdit('{id}')", idField: 'MachineID' },
    { label: 'Del', icon: 'trash', color: 'danger', onclick: "Machine.confirmDelete('{id}')", idField: 'MachineID' }
  ];

  function container() { return document.getElementById('pageContent'); }

  function buildPage() {
    return '<div id="machinesPage" class="page">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Machine Master</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' + SEARCH_SVG +
              '<input type="text" class="form-control" id="machineSearch" placeholder="Search machines..." onkeyup="Machine.search()">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Machine.openAdd()">' + ICONS.add + ' Add Machine</button>' +
          '</div>' +
        '</div>' +
        '<div id="machinesTableContainer"></div>' +
      '</div>' +
    '</div>' + buildModal();
  }

  function buildModal() {
    return '<div class="modal-overlay" id="machineFormModal">' +
      '<div class="modal modal-wide" style="max-width:900px">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="machineFormTitle">Add Machine</div>' +
          '<button class="modal-close" onclick="Machine.closeModal()">&times;</button>' +
        '</div>' +
        '<form id="machineForm" onsubmit="return Machine.save(event)">' +
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
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Machine Type</label><select name="MachineType" class="form-control" id="mcType"></select></div>' +
              '<div class="form-group"><label>Manufacturer</label><input type="text" name="Manufacturer" class="form-control" id="mcManufacturer"></div>' +
              '<div class="form-group"><label>Model</label><input type="text" name="Model" class="form-control" id="mcModel"></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Serial No</label><input type="text" name="SerialNo" class="form-control" id="mcSerialNo"></div>' +
              '<div class="form-group"><label>Capacity</label><input type="text" name="Capacity" class="form-control" id="mcCapacity" placeholder="e.g. 500 kg"></div>' +
              '<div class="form-group"><label>Power Rating</label><input type="text" name="PowerRating" class="form-control" id="mcPower" placeholder="e.g. 50 kW"></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Install Date</label><input type="date" name="InstallDate" class="form-control" id="mcInstallDate"></div>' +
              '<div class="form-group"><label>Warranty Expiry</label><input type="date" name="WarrantyExpiry" class="form-control" id="mcWarranty"></div>' +
              '<div class="form-group"><label>Criticality</label><select name="Criticality" class="form-control" id="mcCriticality"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>QR Code</label><input type="text" name="QRCode" class="form-control" id="mcQRCode" placeholder="Scan or enter QR code"></div>' +
              '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Under Maintenance">Under Maintenance</option><option value="Retired">Retired</option></select></div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="Machine.closeModal()">Cancel</button>' +
            '<button type="submit" class="btn btn-primary">' + ICONS.save + ' Save</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';
  }

  // ---- GAS shared renderTable equivalent (MachinesPage uses the global renderTable) ----
  function renderTable() {
    var el = document.getElementById('machinesTableContainer');
    if (!el) return;
    var data = state.data || [];
    var page = state.page || 1;
    var pageSize = PAGE_SIZE;

    if (!data || data.length === 0) {
      el.innerHTML =
        '<div class="empty-state">' +
          EMPTY_SVG +
          '<h3>No Data Found</h3>' +
          '<p>No records available in this module.</p>' +
        '</div>';
      return;
    }

    var totalPages = Math.ceil(data.length / pageSize);
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, data.length);
    var pageData = data.slice(start, end);

    var html = '<div class="table-container"><table><thead><tr>';
    COLUMNS.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    if (ACTIONS.length > 0) html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      COLUMNS.forEach(function(col) {
        var key = col.key;
        var val = row[key] !== undefined && row[key] !== null ? row[key] : '';

        if (col.badge) {
          var bm = col.badgeMap || {};
          var mapKey = val;
          if (!(mapKey in bm)) {
            mapKey = Object.keys(bm).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
          }
          var badgeClass = bm[mapKey] || 'primary';
          html += '<td><span class="badge badge-' + badgeClass + '">' + (bm[mapKey] || val) + '</span></td>';
          return;
        }
        html += '<td>' + val + '</td>';
      });

      if (ACTIONS.length > 0) {
        html += '<td><div class="actions-cell">';
        ACTIONS.forEach(function(action) {
          var idField = action.idField || Object.keys(row)[0];
          var onclick = action.onclick.replace(/\{id\}/g, row[idField]);
          html += '<button class="icon-btn icon-btn-' + (action.color || 'primary') + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + ICONS[action.icon] + '</button>';
        });
        html += '</div></td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="changePage(\'machinesTableContainer\',' + (page - 1) + ')"' + (page <= 1 ? ' disabled' : '') + '>Prev</button>' +
        '<button onclick="changePage(\'machinesTableContainer\',' + (page + 1) + ')"' + (page >= totalPages ? ' disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    el.innerHTML = html;
    registerPageState('machinesTableContainer', function(p) { state.page = p; renderTable(); });
  }

  function loadDeptCache(cb) {
    API.post('getDepartmentList', {}).then(function(depts) {
      state.departments = Array.isArray(depts) ? depts : [];
      if (cb) cb();
    }).catch(function() { state.departments = []; if (cb) cb(); });
  }

  function populateDeptDropdown(selectedDeptId) {
    var sel = document.getElementById('mcDept');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Department</option>';
    (state.departments || []).forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d.DeptID;
      opt.textContent = d.Department || '';
      if (selectedDeptId && opt.value === selectedDeptId) opt.selected = true;
      sel.appendChild(opt);
    });
    if (selectedDeptId) onDeptChange();
  }

  function onDeptChange() {
    var deptId = document.getElementById('mcDept').value;
    var sectionSel = document.getElementById('mcSection');
    if (sectionSel) sectionSel.innerHTML = '<option value="">Select Section</option>';
    if (deptId && state.departments) {
      var dept = state.departments.find(function(d) { return d.DeptID === deptId; });
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
    sel.innerHTML = '';
    (Constants.MACHINE_TYPES || []).forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      sel.appendChild(opt);
    });
  }

  function loadData() {
    Loader.show();
    API.post('getMachines', {}).then(function(result) {
      Loader.hide();
      state.data = Array.isArray(result) ? result : [];
      state.page = 1;
      renderTable();
    }).catch(function(err) {
      Loader.hide();
      Notify.error('Failed to load machines');
      state.data = [];
      renderTable();
    });
  }

  function afterMutation(result) {
    state.data = Array.isArray(result) ? result : [];
    renderTable();
    if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
    if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
  }

  return {
    init: function() {
      state.data = []; state.page = 1; state.editingId = null; state.departments = [];
    },

    show: function() {
      var el = container();
      if (!el) return;
      state.data = []; state.page = 1; state.editingId = null;
      el.innerHTML = buildPage();
      loadDeptCache(function() { loadData(); });
    },

    search: function() {
      var query = (document.getElementById('machineSearch') || {}).value || '';
      if (!query) { renderTable(); return; }
      Loader.show();
      API.post('searchMachines', { query: query }).then(function(result) {
        Loader.hide();
        state.data = Array.isArray(result) ? result : [];
        state.page = 1;
        renderTable();
      }).catch(function() {
        Loader.hide();
        Notify.error('Search failed');
      });
    },

    goToPage: function(p) { state.page = p; renderTable(); },
    prevPage: function() { if (state.page > 1) { state.page--; renderTable(); } },
    nextPage: function() { if (state.page < Math.ceil((state.data || []).length / PAGE_SIZE)) { state.page++; renderTable(); } },

    onDeptChange: function() { onDeptChange(); },

    openAdd: function() {
      state.editingId = null;
      var el = document.getElementById('editMachineId'); if (el) el.value = '';
      Forms.reset('machineForm');
      var el2 = document.getElementById('mcCriticality'); if (el2) el2.value = 'Low';
      populateTypeSelect();
      populateDeptDropdown('');
      var title = document.getElementById('machineFormTitle');
      if (title) title.textContent = 'Add Machine';
      Modal.show('machineFormModal');
    },

    openEdit: function(id) {
      var machine = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].MachineID) === String(id)) { machine = state.data[i]; break; }
      }
      if (!machine) return;
      state.editingId = id;
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
      var el = document.getElementById('editMachineId'); if (el) el.value = id;
      populateDeptDropdown(machine.DeptID || '');
      var title = document.getElementById('machineFormTitle');
      if (title) title.textContent = 'Edit Machine - ' + id;
      Modal.show('machineFormModal');
    },

    closeModal: function() { Modal.hide('machineFormModal'); },

    openPassport: function(id) {
      sessionStorage.setItem('passportMachineId', id);
      sessionStorage.setItem('passportPrevPage', (typeof Router !== 'undefined' && Router.current) || 'machines');
      navigateTo('machinepassport');
    },

    save: function(e) {
      if (e) e.preventDefault();
      var data = Forms.get('machineForm');
      var id = (document.getElementById('editMachineId') || {}).value || '';
      if (!data.MachineCode) { Notify.warning('Machine Code is required'); return; }
      if (!data.MachineName) { Notify.warning('Machine Name is required'); return; }
      data.MachineNumber = data.MachineNumber || data.MachineCode;
      var deptSel = document.getElementById('mcDept');
      if (deptSel && deptSel.selectedIndex > 0) {
        data.Department = deptSel.options[deptSel.selectedIndex].textContent;
      }
      var secSel = document.getElementById('mcSection');
      if (secSel && secSel.selectedIndex > 0) {
        data.Section = secSel.options[secSel.selectedIndex].textContent;
      }

      var isEdit = !!id;
      if (isEdit) data.id = id;
      var action = isEdit ? 'updateMachine' : 'addMachine';

      Loader.show();
      API.post(action, data).then(function(result) {
        Loader.hide();
        Modal.hide('machineFormModal');
        Notify.success(isEdit ? 'Machine updated successfully' : 'Machine added successfully');
        afterMutation(result);
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || (isEdit ? 'Failed to update machine' : 'Failed to add machine'));
      });
    },

    confirmDelete: function(id) {
      pendingDeleteId = id;
      Modal.confirm('Delete Machine', 'Are you sure you want to delete this machine?', function() {
        Loader.show();
        API.post('deleteMachine', { id: pendingDeleteId }).then(function(result) {
          Loader.hide();
          pendingDeleteId = null;
          Notify.success('Machine deleted successfully');
          afterMutation(result);
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete machine');
        });
      });
    }
  };
})();
