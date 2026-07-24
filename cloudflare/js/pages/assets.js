var Asset = (function() {
  var state = { data: [], filtered: [], page: 1, search: '', editingId: null, machines: [], sections: [], departments: [] };
  var PAGE_SIZE = 10;
  var _searchDebounce = null;

  function getFiltered() {
    var s = state.search.toLowerCase();
    if (!s) return state.data;
    return state.data.filter(function(a) {
      return (a.AssetName || '').toLowerCase().indexOf(s) > -1 ||
             (a.AssetCode || '').toLowerCase().indexOf(s) > -1 ||
             (a.AssetType || '').toLowerCase().indexOf(s) > -1 ||
             (a.Category || '').toLowerCase().indexOf(s) > -1;
    });
  }

  function renderTable() {
    state.filtered = getFiltered();
    Table.render('assetsTableContainer', {
      data: state.filtered,
      columns: [
        { key: 'AssetID', label: 'ID' },
        { key: 'AssetCode', label: 'Code' },
        { key: 'AssetName', label: 'Asset Name' },
        { key: 'AssetType', label: 'Type' },
        { key: 'Category', label: 'Category' },
        { key: 'MachineName', label: 'Machine' },
        { key: 'Department', label: 'Dept' },
        { key: 'Section', label: 'Section' },
        { key: 'Location', label: 'Location' },
        { key: 'Criticality', label: 'Criticality', badge: true, badgeMap: { 'Critical': 'danger', 'High': 'warning', 'Medium': 'primary', 'Low': 'success' } },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'secondary', 'Retired': 'danger' } }
      ],
      actions: [
        { icon: 'edit', label: 'Edit', color: 'primary', onclick: "Asset.openEdit('{id}')", idField: 'AssetID' },
        { icon: 'trash', label: 'Del', color: 'danger', onclick: "Asset.confirmDelete('{id}')", idField: 'AssetID' }
      ],
      page: state.page,
      pageSize: PAGE_SIZE,
      emptyMsg: 'No assets found',
      onPageClick: 'Asset.goToPage({page})',
      onPrev: 'Asset.prevPage()',
      onNext: 'Asset.nextPage()'
    });
  }

  function load() {
    console.log('[ASSETS] loadData called');
    Loader.show();
    Promise.all([
      API.post('getAssets', {}),
      API.post('getMachines', {}),
      API.post('getDepartmentList', {}),
      API.post('getSectionList', {})
    ]).then(function(results) {
      Loader.hide();
      state.data = Array.isArray(results[0]) ? results[0] : [];
      state.machines = Array.isArray(results[1]) ? results[1] : [];
      state.departments = Array.isArray(results[2]) ? results[2] : [];
      state.sections = Array.isArray(results[3]) ? results[3] : [];
      console.log('[ASSETS] Assets: ' + state.data.length + ', Machines: ' + state.machines.length + ', Depts: ' + state.departments.length + ', Sections: ' + state.sections.length);
      renderTable();
    }).catch(function(err) {
      Loader.hide();
      console.error('[ASSETS] loadData FAILED:', err.message);
      Notify.error('Failed to load assets data');
    });
  }

  function populateDeptFilter(selectedDeptId, selectedSectionId) {
    var deptSel = document.getElementById('asFilterDept');
    if (!deptSel) return;
    deptSel.innerHTML = '<option value="">All Departments</option>';
    state.departments.forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d.DepartmentID;
      opt.textContent = d.Department || '';
      if (selectedDeptId && opt.value === selectedDeptId) opt.selected = true;
      deptSel.appendChild(opt);
    });
    onFilterDeptChange(selectedSectionId);
  }

  function onFilterDeptChange(preselectSectionId) {
    var deptId = (document.getElementById('asFilterDept') || {}).value || '';
    var secSel = document.getElementById('asFilterSection');
    if (!secSel) return;
    secSel.innerHTML = '<option value="">All Sections</option>';
    if (deptId && state.departments) {
      var dept = state.departments.find(function(d) { return d.DepartmentID === deptId; });
      if (dept && dept.SectionID) {
        var opt = document.createElement('option');
        opt.value = dept.SectionID;
        opt.textContent = dept.Section || '';
        if (preselectSectionId && opt.value === preselectSectionId) opt.selected = true;
        secSel.appendChild(opt);
      }
    }
    onFilterSectionChange();
  }

  function onFilterSectionChange() {
    var deptId = (document.getElementById('asFilterDept') || {}).value || '';
    var sectionId = (document.getElementById('asFilterSection') || {}).value || '';
    var machineSel = document.getElementById('asMachine');
    if (!machineSel) return;
    var currentMachineId = machineSel.dataset.selectedId || '';
    machineSel.innerHTML = '<option value="">None</option>';
    if (state.machines) {
      state.machines.forEach(function(m) {
        if (deptId && m.DeptID !== deptId) return;
        if (sectionId && m.SectionID !== sectionId) return;
        var opt = document.createElement('option');
        opt.value = m.MachineID;
        opt.textContent = m.MachineName + ' (' + (m.MachineCode || '') + ')';
        if (currentMachineId && opt.value === currentMachineId) opt.selected = true;
        machineSel.appendChild(opt);
      });
    }
  }

  function onAssetMachineChange() {
    var machineId = (document.getElementById('asMachine') || {}).value || '';
    var el = document.getElementById('asMachine'); if (el) el.dataset.selectedId = machineId || '';
    var machineNameEl = document.getElementById('asMachineName');
    var deptEl = document.getElementById('asDepartmentText');
    var deptIdEl = document.getElementById('asDept');
    var secEl = document.getElementById('asSectionText');
    var secIdEl = document.getElementById('asSection');
    if (!machineId) {
      [machineNameEl, deptEl, deptIdEl, secEl, secIdEl].forEach(function(e) { if (e) e.value = ''; });
      return;
    }
    var machine = state.machines ? state.machines.find(function(m) { return m.MachineID === machineId; }) : null;
    if (machine) {
      if (machineNameEl) machineNameEl.value = machine.MachineName || '';
      if (deptEl) deptEl.value = machine.Department || '';
      if (deptIdEl) deptIdEl.value = machine.DeptID || '';
      if (secEl) secEl.value = machine.Section || '';
      if (secIdEl) secIdEl.value = machine.SectionID || '';
    }
  }

  function populateTypeCategorySelects() {
    var typeSel = document.getElementById('asType');
    if (typeSel) {
      typeSel.innerHTML = '<option value="">Select Type</option>';
      (Constants.ASSET_TYPES || Constants.MACHINE_TYPES || []).forEach(function(t) {
        var opt = document.createElement('option');
        var val = typeof t === 'string' ? t : (t.id || t.name);
        opt.value = val; opt.textContent = val;
        typeSel.appendChild(opt);
      });
    }
    var catSel = document.getElementById('asCategory');
    if (catSel) {
      catSel.innerHTML = '<option value="">Select Category</option>';
      (Constants.ASSET_CATEGORIES || []).forEach(function(c) {
        var opt = document.createElement('option');
        var val = typeof c === 'string' ? c : (c.id || c.name);
        opt.value = val; opt.textContent = val;
        catSel.appendChild(opt);
      });
    }
  }

  function buildPageHtml() {
    return '<div class="page"><div class="card">' +
      '<div class="card-header">' +
        '<div class="card-title">Asset Master</div>' +
        '<div class="card-actions">' +
          '<div class="search-box">' + Icons.search +
            '<input type="text" class="search-input" id="assetSearch" placeholder="Search assets..." oninput="Asset.onSearch(this.value)">' +
          '</div>' +
          '<button class="btn btn-primary" onclick="Asset.openAdd()">' + Icons.plus + ' Add Asset</button>' +
        '</div>' +
      '</div>' +
      '<div id="assetsTableContainer"></div>' +
    '</div></div>' + buildModal();
  }

  function buildModal() {
    return '<div class="modal-overlay" id="assetFormModal">' +
      '<div class="modal modal-wide" style="max-width:900px">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="assetFormTitle">Add Asset</div>' +
          '<button class="modal-close" onclick="Asset.closeModal()">&times;</button>' +
        '</div>' +
        '<form id="assetForm" onsubmit="return false">' +
          '<div class="modal-body">' +
            '<input type="hidden" name="AssetID" id="editAssetId">' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Asset Code *</label><input type="text" name="AssetCode" class="form-control" id="asCode" required></div>' +
              '<div class="form-group"><label>Asset Name *</label><input type="text" name="AssetName" class="form-control" id="asName" required></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Asset Type</label><select name="AssetType" class="form-control" id="asType"></select></div>' +
              '<div class="form-group"><label>Category</label><select name="Category" class="form-control" id="asCategory"></select></div>' +
              '<div class="form-group"><label>Filter Dept</label><select class="form-control" id="asFilterDept" onchange="Asset.onFilterDeptChange()"><option value="">All Departments</option></select></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Filter Section</label><select class="form-control" id="asFilterSection" onchange="Asset.onFilterSectionChange()"><option value="">All Sections</option></select></div>' +
              '<div class="form-group"><label>Linked Machine</label><select name="MachineID" class="form-control" id="asMachine" onchange="Asset.onMachineChange()"><option value="">None</option></select></div>' +
              '<div class="form-group"><label>Machine Name</label><input type="text" name="MachineName" class="form-control" id="asMachineName" readonly></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Department</label><input type="text" name="Department" class="form-control" id="asDepartmentText" readonly><input type="hidden" name="DeptID" id="asDept"></div>' +
              '<div class="form-group"><label>Section</label><input type="text" name="Section" class="form-control" id="asSectionText" readonly><input type="hidden" name="SectionID" id="asSection"></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>Location</label><input type="text" name="Location" class="form-control" id="asLocation"></div>' +
              '<div class="form-group"><label>Manufacturer</label><input type="text" name="Manufacturer" class="form-control" id="asManufacturer"></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Model</label><input type="text" name="Model" class="form-control" id="asModel"></div>' +
              '<div class="form-group"><label>Serial No</label><input type="text" name="SerialNo" class="form-control" id="asSerialNo"></div>' +
              '<div class="form-group"><label>Specification</label><input type="text" name="Specification" class="form-control" id="asSpecification"></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Purchase Date</label><input type="date" name="PurchaseDate" class="form-control" id="asPurchaseDate"></div>' +
              '<div class="form-group"><label>Install Date</label><input type="date" name="InstallDate" class="form-control" id="asInstallDate"></div>' +
              '<div class="form-group"><label>Warranty Expiry</label><input type="date" name="WarrantyExpiry" class="form-control" id="asWarranty"></div>' +
            '</div>' +
            '<div class="form-row-3">' +
              '<div class="form-group"><label>Criticality</label><select name="Criticality" class="form-control" id="asCriticality"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
              '<div class="form-group"><label>Supplier</label><input type="text" name="Supplier" class="form-control" id="asSupplier"></div>' +
              '<div class="form-group"><label>Cost</label><input type="number" name="Cost" class="form-control" id="asCost" step="0.01" min="0"></div>' +
            '</div>' +
            '<div class="form-row">' +
              '<div class="form-group"><label>QR Code</label><input type="text" name="QRCode" class="form-control" id="asQRCode" placeholder="Scan or enter QR code"></div>' +
              '<div class="form-group"><label>Status</label><select name="Status" class="form-control" id="asStatus"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Retired">Retired</option></select></div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="Asset.closeModal()">Cancel</button>' +
            '<button type="submit" class="btn btn-primary" id="assetSaveBtn" onclick="Asset.save()">Save</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';
  }

  return {
    init: function() { doShow(); },
    show: function() { doShow(); },

    onSearch: function(val) {
      state.search = (val || '').trim();
      state.page = 1;
      if (!state.search) {
        load();
        return;
      }
      if (_searchDebounce) clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(function() {
        Loader.show();
        API.post('searchAssets', { query: state.search }).then(function(result) {
          Loader.hide();
          state.data = Array.isArray(result) ? result : [];
          renderTable();
        }).catch(function() {
          Loader.hide();
          Notify.error('Search failed');
        });
      }, 300);
    },
    goToPage: function(p) { state.page = parseInt(p, 10) || 1; renderTable(); },
    prevPage: function() { if (state.page > 1) { state.page--; renderTable(); } },
    nextPage: function() { if (state.page < Math.ceil(state.filtered.length / PAGE_SIZE)) { state.page++; renderTable(); } },

    onFilterDeptChange: function() { onFilterDeptChange(); },
    onFilterSectionChange: function() { onFilterSectionChange(); },
    onMachineChange: function() { onAssetMachineChange(); },

    openAdd: function() {
      state.editingId = null;
      var titleEl = document.getElementById('assetFormTitle');
      var saveBtn = document.getElementById('assetSaveBtn');
      if (titleEl) titleEl.textContent = 'Add Asset';
      if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
      Forms.reset('assetForm');
      populateTypeCategorySelects();
      populateDeptFilter('', '');
      var el;
      el = document.getElementById('asCriticality'); if (el) el.value = 'Low';
      el = document.getElementById('asStatus'); if (el) el.value = 'Active';
      Modal.show('assetFormModal');
    },

    openEdit: function(id) {
      var asset = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].AssetID) === String(id)) { asset = state.data[i]; break; }
      }
      if (!asset) { Notify.error('Asset not found'); return; }
      state.editingId = asset.AssetID;
      var titleEl = document.getElementById('assetFormTitle');
      var saveBtn = document.getElementById('assetSaveBtn');
      if (titleEl) titleEl.textContent = 'Edit Asset - ' + id;
      if (saveBtn) { saveBtn.textContent = 'Update'; saveBtn.disabled = false; }
      Forms.reset('assetForm');
      populateTypeCategorySelects();
      populateDeptFilter(asset.DeptID || '', asset.SectionID || '');
      populateAssetMachineDropdown(asset.MachineID || '');
      Forms.set('assetForm', {
        AssetID: asset.AssetID || '',
        AssetCode: asset.AssetCode || '',
        AssetName: asset.AssetName || '',
        AssetType: asset.AssetType || '',
        Category: asset.Category || '',
        MachineID: asset.MachineID || '',
        DeptID: asset.DeptID || '',
        SectionID: asset.SectionID || '',
        Department: asset.Department || '',
        Section: asset.Section || '',
        Location: asset.Location || '',
        Manufacturer: asset.Manufacturer || '',
        Model: asset.Model || '',
        SerialNo: asset.SerialNo || '',
        Specification: asset.Specification || '',
        PurchaseDate: asset.PurchaseDate || '',
        InstallDate: asset.InstallDate || '',
        WarrantyExpiry: asset.WarrantyExpiry || '',
        Criticality: asset.Criticality || 'Low',
        Supplier: asset.Supplier || '',
        Cost: asset.Cost || '',
        QRCode: asset.QRCode || '',
        Status: asset.Status || 'Active'
      });
      var machineNameEl = document.getElementById('asMachineName');
      if (machineNameEl) machineNameEl.value = asset.MachineName || '';
      var deptTextEl = document.getElementById('asDepartmentText');
      if (deptTextEl) deptTextEl.value = asset.Department || '';
      var secTextEl = document.getElementById('asSectionText');
      if (secTextEl) secTextEl.value = asset.Section || '';
      Modal.show('assetFormModal');
    },

    closeModal: function() { Modal.hide('assetFormModal'); state.editingId = null; },

    save: function() {
      var formData = Forms.get('assetForm');
      if (!formData.AssetCode || !formData.AssetCode.trim()) { Notify.error('Asset Code is required'); return; }
      if (!formData.AssetName || !formData.AssetName.trim()) { Notify.error('Asset Name is required'); return; }
      formData.MachineName = (document.getElementById('asMachineName') || {}).value || '';
      formData.Department = (document.getElementById('asDepartmentText') || {}).value || '';
      formData.Section = (document.getElementById('asSectionText') || {}).value || '';

      var btn = document.getElementById('assetSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = state.editingId ? 'Updating...' : 'Saving...'; }

      var isEdit = !!state.editingId;
      if (isEdit) formData.id = state.editingId;
      var action = isEdit ? 'updateAsset' : 'addAsset';

      API.post(action, formData).then(function() {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Asset.closeModal();
        Notify.success(isEdit ? 'Asset updated successfully' : 'Asset added successfully');
        load();
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Notify.error(err.message || 'Failed to save asset');
      });
    },

    confirmDelete: function(id) {
      var asset = null;
      for (var i = 0; i < state.data.length; i++) {
        if (String(state.data[i].AssetID) === String(id)) { asset = state.data[i]; break; }
      }
      var name = asset ? (asset.AssetName || '') : 'this asset';
      Modal.confirm('Delete Asset', 'Are you sure you want to delete "' + name + '"?', function() {
        Loader.show();
        API.post('deleteAsset', { id: id }).then(function() {
          Loader.hide();
          Notify.success('Asset deleted successfully');
          load();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete asset');
        });
      });
    }
  };

  function doShow() {
    var el = document.getElementById('pageContent');
    if (!el) return;
    el.innerHTML = buildPageHtml();
    load();
  }

  function populateAssetMachineDropdown(selectedMachineId) {
    var sel = document.getElementById('asMachine');
    if (!sel) return;
    sel.innerHTML = '<option value="">None</option>';
    state.machines.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m.MachineID;
      opt.textContent = m.MachineName + ' (' + (m.MachineCode || '') + ')';
      if (selectedMachineId && opt.value === selectedMachineId) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.dataset.selectedId = selectedMachineId || '';
    if (selectedMachineId) onAssetMachineChange();
  }
})();
