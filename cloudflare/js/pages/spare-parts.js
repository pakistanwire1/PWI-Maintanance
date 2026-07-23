var SpareParts = (function() {
  var spData = [];
  var spPage = 1;
  var spFilter = { category: '', status: '', manufacturer: '', supplier: '' };
  var spLowStockOnly = false;
  var spSearchDebounce = null;
  var PAGE_SIZE = 10;
  var __pageStates = {};

  var UNITS = ['Pcs', 'Kg', 'Liter', 'Meter', 'Set', 'Box'];

  var ICONS = {
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/><path d="M8 8v6"/><path d="M12 8v6"/></svg>',
    view: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="10" cy="10" r="3"/><path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z"/></svg>',
    download: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2L2 18h16L10 2z"/><line x1="10" y1="8" x2="10" y2="12"/><line x1="10" y1="14" x2="10.01" y2="14"/></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>'
  };

  var ICON_SAVE_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>';

  function showModalLocal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; el.classList.add('show'); }
  }

  function hideModalLocal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('show'); }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function populateSelectLocal(id, data, valueField, labelField, defaultText) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (defaultText) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultText;
      sel.appendChild(opt);
    }
    (data || []).forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item[valueField];
      opt.textContent = item[labelField] || item[valueField];
      sel.appendChild(opt);
    });
  }

  function populateSelectFromListLocal(id, list, defaultText) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (defaultText) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultText;
      sel.appendChild(opt);
    }
    (list || []).forEach(function(val) {
      if (val) {
        var opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        sel.appendChild(opt);
      }
    });
  }

  function getUniqueValues(data, field) {
    var seen = {};
    var result = [];
    (data || []).forEach(function(item) {
      var val = item[field];
      if (val && !seen[val]) {
        seen[val] = true;
        result.push(val);
      }
    });
    return result.sort();
  }

  function setFormDataLocal(formId, data) {
    var form = document.getElementById(formId);
    if (!form || !data) return;
    form.querySelectorAll('[name]').forEach(function(el) {
      if (data[el.name] !== undefined) {
        el.value = data[el.name];
      }
    });
  }

  function getFormDataLocal(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var data = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.name) {
        if (el.type === 'checkbox') { data[el.name] = el.checked; }
        else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else { data[el.name] = el.value; }
      }
    }
    return data;
  }

  function resetFormLocal(formId) {
    var form = document.getElementById(formId);
    if (form) form.reset();
  }

  function openModalFormLocal(formId, title) {
    setText(formId + 'Title', title);
    showModalLocal(formId + 'Modal');
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  function formatDateTimeLocal(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return day + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function formatCurrency(val) {
    return parseFloat(val || 0).toFixed(2);
  }

  function renderTableLocal(data, columns, actions, page, pageSize, containerId) {
    containerId = containerId || 'spTableContainer';
    var container = document.getElementById(containerId);
    if (!container) return;
    page = page || 1;
    pageSize = pageSize || PAGE_SIZE;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
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
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col) + '</th>';
    });
    if (actions) html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var key = col.key || col;
        var val = row[key] !== undefined && row[key] !== null ? row[key] : '';

        if (col.badge) {
          var badgeClass = 'badge badge-primary';
          if (col.badgeMap) {
            var mapKey = val;
            if (!(mapKey in col.badgeMap)) {
              mapKey = Object.keys(col.badgeMap).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
            }
            badgeClass = 'badge badge-' + (col.badgeMap[mapKey] || 'primary');
          }
          val = '<span class="' + badgeClass + '">' + val + '</span>';
        }

        if (col.format) val = col.format(val, row);

        if (col.date) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateTimeLocal(val);
        }

        if (col.datetime) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateTimeLocal(val);
        }

        html += '<td>' + val + '</td>';
      });

      if (actions) {
        html += '<td><div class="actions-cell">';
        actions.forEach(function(action) {
          if (action.condition && !action.condition(row)) return;
          var idField = action.idField || Object.keys(row)[0];
          var onclick = action.onclick ? action.onclick.replace(/\{id\}/g, row[idField]) : '';
          if (action.icon && ICONS[action.icon]) {
            var svg = ICONS[action.icon];
            var cls = 'icon-btn icon-btn-' + (action.color || 'primary');
            html += '<button class="' + cls + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + svg + '</button>';
          } else {
            html += '<button class="btn btn-sm ' + (action.class || 'btn-primary') + '" onclick="' + onclick + '">' + action.label + '</button>';
          }
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
        '<button onclick="SpareParts.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="SpareParts.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="SpareParts.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
  }

  function renderSPTable() {
    renderTableLocal(spData, [
      { key: 'PartCode', label: 'Part Code' },
      { key: 'PartName', label: 'Part Name' },
      { key: 'Category', label: 'Category' },
      { key: 'Unit', label: 'Unit' },
      { key: 'CurrentStock', label: 'Stock' },
      { key: 'MinimumStock', label: 'Min Stock' },
      { key: 'UnitCost', label: 'Unit Cost', format: function(v) { return formatCurrency(v); } },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Active': 'success', 'Inactive': 'danger' } }
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "SpareParts.editSP('{id}')", idField: 'PartCode' },
      { label: 'History', icon: 'view', color: 'primary', onclick: "SpareParts.showStockHistory('{id}')", idField: 'PartCode' },
      { label: 'Del', icon: 'trash', color: 'danger', onclick: "SpareParts.deleteSP('{id}')", idField: 'PartCode' }
    ], spPage, PAGE_SIZE, 'spTableContainer');
    registerPageState('spTableContainer', function(p) { spPage = p; renderSPTable(); });
  }

  function populateFilterCategory() {
    var cats = getUniqueValues(spData, 'Category');
    var sel = document.getElementById('spFilterCategory');
    if (sel) sel.innerHTML = '<option value="">All Categories</option>';
    cats.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function checkLowStockAlert() {
    API.post('getLowStockParts', {})
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

  function loadSparePartsData() {
    Loader.show();
    API.post('getSpareParts', {})
      .then(function(data) {
        spData = data || [];
        Loader.hide();
        renderSPTable();
        populateFilterCategory();
        checkLowStockAlert();
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error('Failed to load spare parts');
      });
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="sparepartsPage" class="page">' +
        '<div id="lowStockAlertBar" style="display:none;margin-bottom:12px">' +
          '<div class="card" style="border-left:4px solid var(--warning);margin-bottom:0">' +
            '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px">' +
              '<span class="badge badge-warning" id="lowStockCountBadge">0</span>' +
              '<span style="color:var(--text-primary);font-weight:500">Low Stock Parts Alert</span>' +
              '<button class="btn btn-sm btn-warning" onclick="SpareParts.toggleLowStockView()">View Low Stock</button>' +
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
            '<button class="btn btn-primary btn-sm" onclick="SpareParts.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="SpareParts.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Spare Parts Inventory</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="form-control" id="spSearch" placeholder="Search parts..." onkeyup="SpareParts.searchSPTable()">' +
              '</div>' +
              '<button class="btn btn-primary" onclick="SpareParts.openSPForm()">' + ICONS.plus + ' Add Part</button>' +
              '<button class="btn btn-secondary" onclick="SpareParts.exportCSV()">' + ICONS.download + ' Export CSV</button>' +
              '<button class="btn btn-warning" id="lowStockToggle" onclick="SpareParts.toggleLowStockView()">' + ICONS.warning + ' Low Stock</button>' +
            '</div>' +
          '</div>' +
          '<div id="spTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="spFormModal" style="display:none">' +
        '<div class="modal modal-wide" style="max-width:900px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="spFormTitle">Add Spare Part</div>' +
            '<button class="modal-close" onclick="SpareParts.hideFormModal()">&times;</button>' +
          '</div>' +
          '<form id="spForm" onsubmit="return SpareParts.saveSP(event)">' +
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
              '<button type="button" class="btn btn-secondary" onclick="SpareParts.hideFormModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICON_SAVE_SVG + ' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="spHistoryModal" style="display:none">' +
        '<div class="modal modal-wide" style="max-width:800px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Stock History - <span id="spHistoryPartCode"></span></div>' +
            '<button class="modal-close" onclick="SpareParts.hideHistoryModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div id="spHistoryContainer"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="SpareParts.hideHistoryModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadSparePartsData();
  }

  function openSPForm() {
    var el = document.getElementById('editSpId'); if (el) el.value = '';
    resetFormLocal('spForm');
    var el = document.getElementById('spPartCode'); if (el) el.readOnly = false;
    populateSelectFromListLocal('spFormUnit', UNITS, 'Select Unit');
    openModalFormLocal('spForm', 'Add Spare Part');
  }

  function editSP(id) {
    var item = spData.find(function(r) { return r.PartCode === id; });
    if (!item) return;
    populateSelectFromListLocal('spFormUnit', UNITS, 'Select Unit');
    setFormDataLocal('spForm', item);
    var el = document.getElementById('editSpId'); if (el) el.value = id;
    var el = document.getElementById('spPartCode'); if (el) el.readOnly = true;
    openModalFormLocal('spForm', 'Edit Part - ' + id);
  }

  function saveSP(e) {
    e.preventDefault();
    var data = getFormDataLocal('spForm');
    var id = document.getElementById('editSpId').value;
    Loader.show();
    if (id) {
      API.post('updateSparePart', { id: id, data: data })
        .then(function(result) {
          spData = result;
          Loader.hide();
          hideModalLocal('spFormModal');
          Notify.success('Part updated successfully');
          renderSPTable();
        })
        .catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to update part');
        });
    } else {
      API.post('addSparePart', data)
        .then(function(result) {
          spData = result;
          Loader.hide();
          hideModalLocal('spFormModal');
          Notify.success('Part added successfully');
          renderSPTable();
        })
        .catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to add part');
        });
    }
    return false;
  }

  function deleteSP(id) {
    Modal.confirm('Delete Part', 'Are you sure you want to delete this spare part?', function() {
      Loader.show();
      API.post('deleteSparePart', { id: id })
        .then(function(result) {
          spData = result;
          Loader.hide();
          Notify.success('Part deleted successfully');
          renderSPTable();
        })
        .catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete part');
        });
    });
  }

  function searchSPTable() {
    var query = document.getElementById('spSearch').value;
    if (!query) { renderSPTable(); return; }
    if (spSearchDebounce) clearTimeout(spSearchDebounce);
    spSearchDebounce = setTimeout(function() {
      Loader.show();
      API.post('searchSpareParts', { query: query })
        .then(function(result) {
          spData = result;
          Loader.hide();
          spPage = 1;
          renderSPTable();
        })
        .catch(function(err) {
          Loader.hide();
          Notify.error('Search failed');
        });
    }, 300);
  }

  function applyFilter() {
    spFilter.category = document.getElementById('spFilterCategory').value;
    spFilter.status = document.getElementById('spFilterStatus').value;
    spFilter.manufacturer = document.getElementById('spFilterManufacturer').value;
    spFilter.supplier = document.getElementById('spFilterSupplier').value;
    Loader.show();
    API.post('filterSpareParts', spFilter)
      .then(function(data) {
        spData = data || [];
        Loader.hide();
        spPage = 1;
        renderSPTable();
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error('Filter failed');
      });
  }

  function clearFilter() {
    var el = document.getElementById('spFilterCategory'); if (el) el.value = '';
    var el = document.getElementById('spFilterStatus'); if (el) el.value = '';
    var el = document.getElementById('spFilterManufacturer'); if (el) el.value = '';
    var el = document.getElementById('spFilterSupplier'); if (el) el.value = '';
    spFilter = { category: '', status: '', manufacturer: '', supplier: '' };
    loadSparePartsData();
  }

  function showStockHistory(partCode) {
    setText('spHistoryPartCode', partCode);
    setHTML('spHistoryContainer',
      '<div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
        '<h3>Loading...</h3>' +
      '</div>');
    showModalLocal('spHistoryModal');
    API.post('getStockHistory', { partCode: partCode })
      .then(function(data) {
        if (!data || data.length === 0) {
          setHTML('spHistoryContainer',
            '<div class="empty-state">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
              '<h3>No History Found</h3>' +
              '<p>No stock movements recorded for this part.</p>' +
            '</div>');
        } else {
          renderTableLocal(data, [
            { key: 'CreatedAt', label: 'Date', datetime: true },
            { key: 'TransactionType', label: 'Type' },
            { key: 'Quantity', label: 'Qty' },
            { key: 'BalanceBefore', label: 'Before' },
            { key: 'BalanceAfter', label: 'After' },
            { key: 'ReferenceNo', label: 'Reference' }
          ], null, 1, 10, 'spHistoryContainer');
        }
      })
      .catch(function(err) {
        Notify.error('Failed to load stock history');
      });
  }

  function exportCSV() {
    Loader.show();
    API.post('exportSparePartsCSV', {})
      .then(function(csvData) {
        Loader.hide();
        if (!csvData) { Notify.warning('No data to export'); return; }
        var blob = new Blob([csvData], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'SpareParts_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        Notify.success('Export completed');
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error('Export failed');
      });
  }

  function toggleLowStockView() {
    spLowStockOnly = !spLowStockOnly;
    var btn = document.getElementById('lowStockToggle');
    if (spLowStockOnly) {
      if (btn) btn.classList.add('active');
      Loader.show();
      API.post('getLowStockParts', {})
        .then(function(data) {
          spData = data || [];
          Loader.hide();
          spPage = 1;
          renderSPTable();
        })
        .catch(function(err) {
          Loader.hide();
          Notify.error('Failed to load low stock parts');
        });
    } else {
      if (btn) btn.classList.remove('active');
      loadSparePartsData();
    }
  }

  function hideFormModal() { hideModalLocal('spFormModal'); }
  function hideHistoryModal() { hideModalLocal('spHistoryModal'); }

  return {
    show: renderPage,
    openSPForm: openSPForm,
    editSP: editSP,
    saveSP: saveSP,
    deleteSP: deleteSP,
    searchSPTable: searchSPTable,
    applyFilter: applyFilter,
    clearFilter: clearFilter,
    showStockHistory: showStockHistory,
    exportCSV: exportCSV,
    toggleLowStockView: toggleLowStockView,
    hideFormModal: hideFormModal,
    hideHistoryModal: hideHistoryModal,
    changePage: changePage
  };
})();
