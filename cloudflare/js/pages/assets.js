/* ============================================================
   assets.js — Assets Page Module
   GAS-identical: AssetsPage.html
   ============================================================ */

(function() {
  var assetsData = [];
  var assetsPage = 1;
  var assetMachineCache = null;
  var assetDeptCache = null;

  App.registerPage('assets', render, load);

  function render() {
    var el = document.getElementById('page-assets');
    el.innerHTML =
      '<div id="assetsPage">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Asset Master</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="form-control" id="assetSearch" placeholder="Search assets..." onkeyup="searchAssetsTable()">' +
              '</div>' +
              '<button class="btn btn-primary" onclick="openAssetForm()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg> Add Asset</button>' +
            '</div>' +
          '</div>' +
          '<div id="assetsTableContainer"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="assetFormModal">' +
        '<div class="modal modal-wide" style="max-width:900px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="assetFormTitle">Add Asset</div>' +
            '<button class="modal-close" onclick="hideModal(\'assetFormModal\')">&times;</button>' +
          '</div>' +
          '<form id="assetForm" onsubmit="return saveAsset(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="AssetID" id="editAssetId">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Asset Code *</label>' +
                  '<input type="text" name="AssetCode" class="form-control" id="asCode" required>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Asset Name *</label>' +
                  '<input type="text" name="AssetName" class="form-control" id="asName" required>' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Asset Type</label>' +
                  '<select name="AssetType" class="form-control" id="asType"></select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Category</label>' +
                  '<select name="Category" class="form-control" id="asCategory"></select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Filter Dept</label>' +
                  '<select class="form-control" id="asFilterDept" onchange="onAsFilterDeptChange()">' +
                    '<option value="">All Departments</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Filter Section</label>' +
                  '<select class="form-control" id="asFilterSection" onchange="onAsFilterSectionChange()">' +
                    '<option value="">All Sections</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Linked Machine</label>' +
                  '<select name="MachineID" class="form-control" id="asMachine" onchange="onAssetMachineChange()">' +
                    '<option value="">None</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Machine Name</label>' +
                  '<input type="text" name="MachineName" class="form-control" id="asMachineName" readonly>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Department</label>' +
                  '<input type="text" name="Department" class="form-control" id="asDepartmentText" readonly>' +
                  '<input type="hidden" name="DeptID" id="asDept">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Section</label>' +
                  '<input type="text" name="Section" class="form-control" id="asSectionText" readonly>' +
                  '<input type="hidden" name="SectionID" id="asSection">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Location</label>' +
                  '<input type="text" name="Location" class="form-control" id="asLocation">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Manufacturer</label>' +
                  '<input type="text" name="Manufacturer" class="form-control" id="asManufacturer">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Model</label>' +
                  '<input type="text" name="Model" class="form-control" id="asModel">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Serial No</label>' +
                  '<input type="text" name="SerialNo" class="form-control" id="asSerialNo">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Specification</label>' +
                  '<input type="text" name="Specification" class="form-control" id="asSpecification">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Purchase Date</label>' +
                  '<input type="date" name="PurchaseDate" class="form-control" id="asPurchaseDate">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Install Date</label>' +
                  '<input type="date" name="InstallDate" class="form-control" id="asInstallDate">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Warranty Expiry</label>' +
                  '<input type="date" name="WarrantyExpiry" class="form-control" id="asWarranty">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Criticality</label>' +
                  '<select name="Criticality" class="form-control" id="asCriticality">' +
                    '<option value="Low">Low</option>' +
                    '<option value="Medium">Medium</option>' +
                    '<option value="High">High</option>' +
                    '<option value="Critical">Critical</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Supplier</label>' +
                  '<input type="text" name="Supplier" class="form-control" id="asSupplier">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Cost</label>' +
                  '<input type="number" name="Cost" class="form-control" id="asCost" step="0.01" min="0">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>QR Code</label>' +
                  '<input type="text" name="QRCode" class="form-control" id="asQRCode" placeholder="Scan or enter QR code">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Status</label>' +
                  '<select name="Status" class="form-control">' +
                    '<option value="Active">Active</option>' +
                    '<option value="Inactive">Inactive</option>' +
                    '<option value="Retired">Retired</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="hideModal(\'assetFormModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg> Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getAssets')
      .then(function(data) {
        assetsData = data || [];
        App.showLoading(false);
        renderAssetsTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load assets', 'error');
      });
  }

  function renderAssetsTable() {
    renderTable(assetsData, [
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
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "editAsset('{id}')", idField: 'AssetID' },
      { label: 'Del', icon: 'trash', color: 'danger', onclick: "deleteAsset('{id}')", idField: 'AssetID' }
    ], assetsPage, PAGE_SIZE, 'assetsTableContainer');
    registerPageState('assetsTableContainer', function(p) { assetsPage = p; renderAssetsTable(); });
  }

  function loadAssetDeptCache(callback) {
    if (assetDeptCache) { if (callback) callback(assetDeptCache); return; }
    API.call('getDepartmentList')
      .then(function(depts) {
        assetDeptCache = depts || [];
        if (callback) callback(assetDeptCache);
      })
      .catch(function() { assetDeptCache = []; if (callback) callback([]); });
  }

  function loadAssetMachineCache(callback) {
    if (assetMachineCache) { if (callback) callback(assetMachineCache); return; }
    API.call('getMachineList')
      .then(function(machines) {
        assetMachineCache = machines || [];
        if (callback) callback(assetMachineCache);
      })
      .catch(function() { assetMachineCache = []; if (callback) callback([]); });
  }

  function populateAssetFilterDropdowns(selectedDeptId, selectedSectionId) {
    loadAssetDeptCache(function(depts) {
      var deptSel = document.getElementById('asFilterDept');
      if (!deptSel) return;
      deptSel.innerHTML = '<option value="">All Departments</option>';
      var seen = {};
      depts.forEach(function(d) {
        if (seen[d.DeptID]) return;
        seen[d.DeptID] = true;
        var opt = document.createElement('option');
        opt.value = d.DeptID;
        opt.textContent = d.Department || '';
        if (selectedDeptId && opt.value === selectedDeptId) opt.selected = true;
        deptSel.appendChild(opt);
      });
      onAsFilterDeptChange(selectedSectionId);
    });
  }

  window.onAsFilterDeptChange = function(preselectSectionId) {
    var deptSel = document.getElementById('asFilterDept');
    var deptId = deptSel ? deptSel.value : '';
    var secSel = document.getElementById('asFilterSection');
    if (!secSel) return;
    secSel.innerHTML = '<option value="">All Sections</option>';
    if (deptId && assetDeptCache) {
      var dept = assetDeptCache.find(function(d) { return d.DeptID === deptId; });
      if (dept && dept.SectionID) {
        var opt = document.createElement('option');
        opt.value = dept.SectionID;
        opt.textContent = dept.Section || '';
        if (preselectSectionId && opt.value === preselectSectionId) opt.selected = true;
        secSel.appendChild(opt);
      }
    }
    onAsFilterSectionChange();
  };

  window.onAsFilterSectionChange = function() {
    var deptSel = document.getElementById('asFilterDept');
    var secSel = document.getElementById('asFilterSection');
    var deptId = deptSel ? deptSel.value : '';
    var sectionId = secSel ? secSel.value : '';
    var machineSel = document.getElementById('asMachine');
    if (!machineSel) return;
    var currentMachineId = machineSel.dataset.selectedId || '';
    machineSel.innerHTML = '<option value="">None</option>';
    if (assetMachineCache) {
      assetMachineCache.forEach(function(m) {
        if (deptId && m.DeptID !== deptId) return;
        if (sectionId && m.SectionID !== sectionId) return;
        var opt = document.createElement('option');
        opt.value = m.MachineID;
        opt.textContent = m.MachineName + ' (' + (m.MachineCode || '') + ')';
        if (currentMachineId && opt.value === currentMachineId) opt.selected = true;
        machineSel.appendChild(opt);
      });
    }
  };

  function populateAssetMachineDropdown(selectedMachineId) {
    var sel = document.getElementById('asMachine');
    if (!sel) return;
    loadAssetMachineCache(function(machines) {
      sel.innerHTML = '<option value="">None</option>';
      machines.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.MachineID;
        opt.textContent = m.MachineName + ' (' + (m.MachineCode || '') + ')';
        if (selectedMachineId && (opt.value === selectedMachineId)) opt.selected = true;
        sel.appendChild(opt);
      });
      if (selectedMachineId) onAssetMachineChange();
    });
  }

  window.onAssetMachineChange = function() {
    var machineSel = document.getElementById('asMachine');
    var machineId = machineSel ? machineSel.value : '';
    if (machineSel) machineSel.dataset.selectedId = machineId || '';
    var machineNameEl = document.getElementById('asMachineName');
    var deptEl = document.getElementById('asDepartmentText');
    var deptIdEl = document.getElementById('asDept');
    var secEl = document.getElementById('asSectionText');
    var secIdEl = document.getElementById('asSection');
    if (!machineId) {
      if (machineNameEl) machineNameEl.value = '';
      if (deptEl) deptEl.value = '';
      if (deptIdEl) deptIdEl.value = '';
      if (secEl) secEl.value = '';
      if (secIdEl) secIdEl.value = '';
      return;
    }
    var machine = assetMachineCache ? assetMachineCache.find(function(m) { return m.MachineID === machineId; }) : null;
    if (machine) {
      if (machineNameEl) machineNameEl.value = machine.MachineName || '';
      if (deptEl) deptEl.value = machine.Department || '';
      if (deptIdEl) deptIdEl.value = machine.DeptID || '';
      if (secEl) secEl.value = machine.Section || '';
      if (secIdEl) secIdEl.value = machine.SectionID || '';
    } else {
      API.call('getMachineDetails', { id: machineId })
        .then(function(m) {
          if (m) {
            if (machineNameEl) machineNameEl.value = m.MachineName || '';
            if (deptEl) deptEl.value = m.Department || '';
            if (deptIdEl) deptIdEl.value = m.DeptID || '';
            if (secEl) secEl.value = m.Section || '';
            if (secIdEl) secIdEl.value = m.SectionID || '';
          }
        })
        .catch(function() {});
    }
  };

  window.openAssetForm = function() {
    var eai = document.getElementById('editAssetId'); if (eai) eai.value = '';
    resetForm('assetForm');
    var asc = document.getElementById('asCriticality'); if (asc) asc.value = 'Low';
    populateSelectFromList('asType', CONSTANTS.ASSET_TYPES || [], 'Select Type');
    populateSelectFromList('asCategory', CONSTANTS.ASSET_CATEGORIES || [], 'Select Category');
    loadAssetMachineCache(function() {
      populateAssetFilterDropdowns('', '');
    });
    openModalForm('assetForm', 'Add Asset');
  };

  window.editAsset = function(id) {
    var item = assetsData.find(function(r) { return r.AssetID === id; });
    if (!item) return;
    populateSelectFromList('asType', CONSTANTS.ASSET_TYPES || [], 'Select Type');
    populateSelectFromList('asCategory', CONSTANTS.ASSET_CATEGORIES || [], 'Select Category');
    setFormData('assetForm', item);
    var eai = document.getElementById('editAssetId'); if (eai) eai.value = id;
    loadAssetMachineCache(function() {
      populateAssetFilterDropdowns(item.DeptID || '', item.SectionID || '');
      populateAssetMachineDropdown(item.MachineID || '');
    });
    openModalForm('assetForm', 'Edit Asset - ' + id);
  };

  window.saveAsset = function(e) {
    e.preventDefault();
    var data = getFormData('assetForm');
    var id = document.getElementById('editAssetId').value;
    if (!data.AssetCode) { App.showToast('Asset Code is required', 'warning'); return false; }
    if (!data.AssetName) { App.showToast('Asset Name is required', 'warning'); return false; }
    data.MachineName = document.getElementById('asMachineName').value;
    data.Department = document.getElementById('asDepartmentText').value;
    data.Section = document.getElementById('asSectionText').value;
    App.showLoading(true);
    if (id) {
      data.id = id;
      API.call('updateAsset', data)
        .then(function(result) {
          assetsData = result || assetsData;
          App.showLoading(false);
          hideModal('assetFormModal');
          App.showToast('Asset updated successfully');
          renderAssetsTable();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
          if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to update asset', 'error');
        });
    } else {
      API.call('addAsset', data)
        .then(function(result) {
          assetsData = result || assetsData;
          App.showLoading(false);
          hideModal('assetFormModal');
          App.showToast('Asset added successfully');
          renderAssetsTable();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
          if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to add asset', 'error');
        });
    }
    return false;
  };

  window.deleteAsset = function(id) {
    showConfirm('Delete Asset', 'Are you sure you want to delete this asset?', function() {
      App.showLoading(true);
      API.call('deleteAsset', { id: id })
        .then(function(result) {
          assetsData = result || assetsData;
          App.showLoading(false);
          App.showToast('Asset deleted successfully');
          renderAssetsTable();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
          if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Failed to delete asset', 'error');
        });
    });
  };

  window.searchAssetsTable = function() {
    var query = document.getElementById('assetSearch').value;
    if (!query) { renderAssetsTable(); return; }
    App.showLoading(true);
    API.call('searchAssets', { query: query })
      .then(function(result) {
        assetsData = result;
        App.showLoading(false);
        assetsPage = 1;
        renderAssetsTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Search failed', 'error');
      });
  };
})();
