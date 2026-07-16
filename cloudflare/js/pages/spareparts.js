/* ============================================================
   spareparts.js — Spare Parts Page Module
   GAS-identical: SparePartsPage.html
   ============================================================ */

(function() {
  var spData = [];
  var spPage = 1;
  var spFilter = { category: '', status: '', manufacturer: '', supplier: '' };
  var spLowStockOnly = false;
  var spSearchDebounce = null;

  App.registerPage('spareparts', render, load);

  function render() {
    var el = document.getElementById('page-spareparts');
    el.innerHTML =
      '<div id="sparepartsPage">' +
        '<div id="lowStockAlertBar" style="display:none;margin-bottom:12px">' +
          '<div class="card" style="border-left:4px solid var(--warning);margin-bottom:0">' +
            '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px">' +
              '<span class="badge badge-warning" id="lowStockCountBadge">0</span>' +
              '<span style="color:var(--text-primary);font-weight:500">Low Stock Parts Alert</span>' +
              '<button class="btn btn-sm btn-warning" onclick="toggleLowStockView()">View Low Stock</button>' +
              '<button class="btn btn-sm btn-secondary" onclick="var el=document.getElementById(\'lowStockAlertBar\');el&&(el.style.display=\'none\')">Dismiss</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar" id="spFilterBar">' +
          '<div class="form-group">' +
            '<label>Category</label>' +
            '<select class="form-control" id="spFilterCategory">' +
              '<option value="">All Categories</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Status</label>' +
            '<select class="form-control" id="spFilterStatus">' +
              '<option value="">All Status</option>' +
              '<option value="Active">Active</option>' +
              '<option value="Inactive">Inactive</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Manufacturer</label>' +
            '<input type="text" class="form-control" id="spFilterManufacturer" placeholder="Manufacturer">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Supplier</label>' +
            '<input type="text" class="form-control" id="spFilterSupplier" placeholder="Supplier">' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Spare Parts Inventory</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="form-control" id="spSearch" placeholder="Search parts..." onkeyup="searchSPTable()">' +
              '</div>' +
              '<button class="btn btn-primary" onclick="openSPForm()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg> Add Part</button>' +
              '<button class="btn btn-secondary" onclick="exportCSV()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg> Export CSV</button>' +
              '<button class="btn btn-warning" id="lowStockToggle" onclick="toggleLowStockView()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2L2 18h16L10 2z"/><line x1="10" y1="8" x2="10" y2="12"/><line x1="10" y1="14" x2="10.01" y2="14"/></svg> Low Stock</button>' +
            '</div>' +
          '</div>' +
          '<div id="spTableContainer"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="spFormModal" style="display:none">' +
        '<div class="modal modal-wide" style="max-width:900px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="spFormTitle">Add Spare Part</div>' +
            '<button class="modal-close" onclick="hideModal(\'spFormModal\')">&times;</button>' +
          '</div>' +
          '<form id="spForm" onsubmit="return saveSP(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="PartCode" id="editSpId">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Part Code</label>' +
                  '<input type="text" name="PartCode" class="form-control" id="spPartCode" placeholder="Auto-generated">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Part Name *</label>' +
                  '<input type="text" name="PartName" class="form-control" required>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Category</label>' +
                  '<input type="text" name="Category" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Manufacturer</label>' +
                  '<input type="text" name="Manufacturer" class="form-control">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Machine Compatibility</label>' +
                  '<input type="text" name="MachineCompatibility" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Asset Compatibility</label>' +
                  '<input type="text" name="AssetCompatibility" class="form-control">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Unit</label>' +
                  '<select name="Unit" class="form-control" id="spFormUnit"></select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Store Location</label>' +
                  '<input type="text" name="StoreLocation" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Bin Number</label>' +
                  '<input type="text" name="BinNumber" class="form-control">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-4">' +
                '<div class="form-group">' +
                  '<label>Current Stock</label>' +
                  '<input type="number" name="CurrentStock" class="form-control" min="0" step="0.01">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Minimum Stock</label>' +
                  '<input type="number" name="MinimumStock" class="form-control" min="0" step="0.01">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Maximum Stock</label>' +
                  '<input type="number" name="MaximumStock" class="form-control" min="0" step="0.01">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Reorder Level</label>' +
                  '<input type="number" name="ReorderLevel" class="form-control" min="0" step="0.01">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Supplier</label>' +
                  '<input type="text" name="Supplier" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Unit Cost</label>' +
                  '<input type="number" name="UnitCost" class="form-control" min="0" step="0.01">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Barcode</label>' +
                  '<input type="text" name="Barcode" class="form-control">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group" style="flex:1">' +
                  '<label>Status</label>' +
                  '<select name="Status" class="form-control">' +
                    '<option value="Active">Active</option>' +
                    '<option value="Inactive">Inactive</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Remarks</label>' +
                '<textarea name="Remarks" class="form-control" rows="3"></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="hideModal(\'spFormModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg> Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="spHistoryModal" style="display:none">' +
        '<div class="modal modal-wide" style="max-width:800px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Stock History - <span id="spHistoryPartCode"></span></div>' +
            '<button class="modal-close" onclick="hideModal(\'spHistoryModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div id="spHistoryContainer"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="hideModal(\'spHistoryModal\')">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getSpareParts')
      .then(function(data) {
        spData = data || [];
        App.showLoading(false);
        renderSPTable();
        populateFilterCategory();
        checkLowStockAlert();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load spare parts', 'error');
      });
  }

  function checkLowStockAlert() {
    API.call('getLowStockParts')
      .then(function(data) {
        var count = data ? data.length : 0;
        var bar = document.getElementById('lowStockAlertBar');
        var badge = document.getElementById('lowStockCountBadge');
        if (count > 0) {
          if (bar) bar.style.display = 'block';
          if (badge) badge.textContent = count + ' part' + (count > 1 ? 's' : '') + ' below reorder level';
        } else {
          if (bar) bar.style.display = 'none';
        }
      })
      .catch(function() {});
  }

  function populateFilterCategory() {
    var cats = getUniqueValues(spData, 'Category');
    var sel = document.getElementById('spFilterCategory');
    if (sel) sel.innerHTML = '<option value="">All Categories</option>';
    cats.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (sel) sel.appendChild(opt);
    });
  }

  function getUniqueValues(data, field) {
    var map = {};
    data.forEach(function(row) {
      if (row[field]) map[row[field]] = true;
    });
    return Object.keys(map).sort();
  }

  function renderSPTable() {
    renderTable(spData, [
      { key: 'PartCode', label: 'Part Code' },
      { key: 'PartName', label: 'Part Name' },
      { key: 'Category', label: 'Category' },
      { key: 'Unit', label: 'Unit' },
      { key: 'CurrentStock', label: 'Stock' },
      { key: 'MinimumStock', label: 'Min Stock' },
      { key: 'UnitCost', label: 'Unit Cost', format: function(v) { return parseFloat(v || 0).toFixed(2); } },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'danger' } }
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "editSP('{id}')", idField: 'PartCode' },
      { label: 'History', icon: 'view', color: 'primary', onclick: "showStockHistory('{id}')", idField: 'PartCode' },
      { label: 'Del', icon: 'trash', color: 'danger', onclick: "deleteSP('{id}')", idField: 'PartCode' }
    ], spPage, PAGE_SIZE, 'spTableContainer');
    registerPageState('spTableContainer', function(p) { spPage = p; renderSPTable(); });
  }

  window.openSPForm = function() {
    var el = document.getElementById('editSpId'); if (el) el.value = '';
    resetForm('spForm');
    var el2 = document.getElementById('spPartCode'); if (el2) el2.readOnly = false;
    populateSelectFromList('spFormUnit', CONSTANTS.UNITS, 'Select Unit');
    openModalForm('spForm', 'Add Spare Part');
  };

  window.editSP = function(id) {
    var item = spData.find(function(r) { return r.PartCode === id; });
    if (!item) return;
    populateSelectFromList('spFormUnit', CONSTANTS.UNITS, 'Select Unit');
    setFormData('spForm', item);
    var el = document.getElementById('editSpId'); if (el) el.value = id;
    var el2 = document.getElementById('spPartCode'); if (el2) el2.readOnly = true;
    openModalForm('spForm', 'Edit Part - ' + id);
  };

  window.saveSP = function(e) {
    e.preventDefault();
    var data = getFormData('spForm');
    var id = document.getElementById('editSpId').value;
    App.showLoading(true);
    if (id) {
      API.call('updateSparePart', { id: id, data: data })
        .then(function(result) {
          spData = result || spData;
          App.showLoading(false);
          hideModal('spFormModal');
          App.showToast('Part updated successfully', 'success');
          renderSPTable();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
          if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to update part', 'error');
        });
    } else {
      API.call('addSparePart', data)
        .then(function(result) {
          spData = result || spData;
          App.showLoading(false);
          hideModal('spFormModal');
          App.showToast('Part added successfully', 'success');
          renderSPTable();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
          if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to add part', 'error');
        });
    }
  };

  window.deleteSP = function(id) {
    showConfirm('Delete Part', 'Are you sure you want to delete this spare part?', function() {
      App.showLoading(true);
      API.call('deleteSparePart', { id: id })
        .then(function(result) {
          spData = result || spData;
          App.showLoading(false);
          App.showToast('Part deleted successfully', 'success');
          renderSPTable();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
          if (typeof notifyQRDataChanged === 'function') notifyQRDataChanged();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to delete part', 'error');
        });
    });
  };

  window.searchSPTable = function() {
    var query = document.getElementById('spSearch').value;
    if (!query) { renderSPTable(); return; }
    if (spSearchDebounce) clearTimeout(spSearchDebounce);
    spSearchDebounce = setTimeout(function() {
      App.showLoading(true);
      API.call('searchSpareParts', { query: query })
        .then(function(result) {
          spData = result;
          App.showLoading(false);
          spPage = 1;
          renderSPTable();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Search failed', 'error');
        });
    }, 300);
  };

  window.applyFilter = function() {
    spFilter.category = document.getElementById('spFilterCategory').value;
    spFilter.status = document.getElementById('spFilterStatus').value;
    spFilter.manufacturer = document.getElementById('spFilterManufacturer').value;
    spFilter.supplier = document.getElementById('spFilterSupplier').value;
    App.showLoading(true);
    API.call('filterSpareParts', spFilter)
      .then(function(data) {
        spData = data || [];
        App.showLoading(false);
        spPage = 1;
        renderSPTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Filter failed', 'error');
      });
  };

  window.clearFilter = function() {
    var el = document.getElementById('spFilterCategory'); if (el) el.value = '';
    var el2 = document.getElementById('spFilterStatus'); if (el2) el2.value = '';
    var el3 = document.getElementById('spFilterManufacturer'); if (el3) el3.value = '';
    var el4 = document.getElementById('spFilterSupplier'); if (el4) el4.value = '';
    spFilter = { category: '', status: '', manufacturer: '', supplier: '' };
    load();
  };

  window.showStockHistory = function(partCode) {
    var el = document.getElementById('spHistoryPartCode'); if (el) el.textContent = partCode;
    var el2 = document.getElementById('spHistoryContainer'); if (el2) el2.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg><h3>Loading...</h3></div>';
    showModal('spHistoryModal');
    API.call('getStockHistory', { partCode: partCode })
      .then(function(data) {
        if (!data || data.length === 0) {
          var spc = document.getElementById('spHistoryContainer'); if (spc) spc.innerHTML =
            '<div class="empty-state">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
              '<h3>No History Found</h3>' +
              '<p>No stock movements recorded for this part.</p>' +
            '</div>';
        } else {
          renderTable(data, [
            { key: 'Date', label: 'Date', datetime: true },
            { key: 'TransactionType', label: 'Type' },
            { key: 'Quantity', label: 'Qty' },
            { key: 'BalanceBefore', label: 'Before' },
            { key: 'BalanceAfter', label: 'After' },
            { key: 'ReferenceNo', label: 'Reference' }
          ], null, 1, 10, 'spHistoryContainer');
        }
      })
      .catch(function(err) {
        App.showToast('Failed to load stock history', 'error');
      });
  };

  window.exportCSV = function() {
    App.showLoading(true);
    API.call('exportSparePartsCSV')
      .then(function(csvData) {
        App.showLoading(false);
        if (!csvData) { App.showToast('No data to export', 'warning'); return; }
        var blob = new Blob([csvData], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'SpareParts_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        App.showToast('Export completed', 'success');
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Export failed', 'error');
      });
  };

  window.toggleLowStockView = function() {
    spLowStockOnly = !spLowStockOnly;
    var btn = document.getElementById('lowStockToggle');
    if (spLowStockOnly) {
      if (btn) btn.classList.add('active');
      App.showLoading(true);
      API.call('getLowStockParts')
        .then(function(data) {
          spData = data || [];
          App.showLoading(false);
          spPage = 1;
          renderSPTable();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Failed to load low stock parts', 'error');
        });
    } else {
      if (btn) btn.classList.remove('active');
      load();
    }
  };
})();
