var Inventory = (function() {
  var invData = [];
  var invPage = 1;
  var invActiveTab = 'all';
  var invPartsCache = [];
  var invSearchDebounce = null;
  var PAGE_SIZE = 10;
  var __pageStates = {};

  var ICONS = {
    download: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>'
  };

  var ICON_SAVE_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>';

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
    containerId = containerId || 'invTableContainer';
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
        '<button onclick="Inventory.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="Inventory.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="Inventory.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
  }

  function renderInventoryTable() {
    var data = invData || [];
    var columns, actions;
    if (invActiveTab === 'all') {
      columns = [
        { key: 'TransactionID', label: 'Transaction ID' },
        { key: 'CreatedAt', label: 'Date', datetime: true },
        { key: 'TransactionType', label: 'Type', badge: true, badgeMap: { 'Goods Receipt': 'success', 'Issue': 'warning', 'Return': 'info', 'Transfer': 'primary', 'Adjustment': 'danger' } },
        { key: 'PartCode', label: 'Part Code' },
        { key: 'PartName', label: 'Part Name' },
        { key: 'Quantity', label: 'Qty' },
        { key: 'UnitCost', label: 'Unit Cost', format: function(v) { return formatCurrency(v); } },
        { key: 'TotalCost', label: 'Total Cost', format: function(v) { return formatCurrency(v); } },
        { key: 'ReferenceNo', label: 'Reference No' },
        { key: 'Remarks', label: 'Remarks' }
      ];
      actions = null;
    } else if (invActiveTab === 'grn') {
      columns = [
        { key: 'ReferenceNo', label: 'GRN No' },
        { key: 'PartCode', label: 'Part Code' },
        { key: 'PartName', label: 'Part Name' },
        { key: 'Quantity', label: 'Qty' },
        { key: 'UnitCost', label: 'Unit Cost', format: function(v) { return formatCurrency(v); } },
        { key: 'TotalCost', label: 'Total Cost', format: function(v) { return formatCurrency(v); } },
        { key: 'Supplier', label: 'Supplier' },
        { key: 'InvoiceNo', label: 'Invoice No' },
        { key: 'CreatedAt', label: 'Received Date', datetime: true },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Received': 'success', 'Pending': 'warning', 'Cancelled': 'danger' } }
      ];
      actions = null;
    } else if (invActiveTab === 'issue') {
      columns = [
        { key: 'TransactionID', label: 'Transaction ID' },
        { key: 'PartCode', label: 'Part Code' },
        { key: 'PartName', label: 'Part Name' },
        { key: 'Quantity', label: 'Qty' },
        { key: 'ReferenceNo', label: 'Reference No' },
        { key: 'ProcessedBy', label: 'Processed By' },
        { key: 'CreatedAt', label: 'Date', datetime: true }
      ];
      actions = null;
    } else if (invActiveTab === 'return') {
      columns = [
        { key: 'TransactionID', label: 'Transaction ID' },
        { key: 'PartCode', label: 'Part Code' },
        { key: 'PartName', label: 'Part Name' },
        { key: 'Quantity', label: 'Qty' },
        { key: 'Remarks', label: 'Remarks' },
        { key: 'CreatedAt', label: 'Date', datetime: true }
      ];
      actions = null;
    } else if (invActiveTab === 'transfer') {
      columns = [
        { key: 'TransactionID', label: 'Transaction ID' },
        { key: 'PartCode', label: 'Part Code' },
        { key: 'PartName', label: 'Part Name' },
        { key: 'Quantity', label: 'Qty' },
        { key: 'FromLocation', label: 'From Location' },
        { key: 'ToLocation', label: 'To Location' },
        { key: 'CreatedAt', label: 'Date', datetime: true }
      ];
      actions = null;
    } else if (invActiveTab === 'adjustment') {
      columns = [
        { key: 'TransactionID', label: 'Transaction ID' },
        { key: 'PartCode', label: 'Part Code' },
        { key: 'PartName', label: 'Part Name' },
        { key: 'Quantity', label: 'Qty' },
        { key: 'Remarks', label: 'Reason' },
        { key: 'CreatedAt', label: 'Date', datetime: true }
      ];
      actions = null;
    }
    renderTableLocal(data, columns, actions, invPage, PAGE_SIZE, 'invTableContainer');
    registerPageState('invTableContainer', function(p) { invPage = p; renderInventoryTable(); });
  }

  function switchInvTab(tab, btn) {
    invActiveTab = tab;
    invPage = 1;
    document.querySelectorAll('#inventoryPage .workflow-tab').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var titleMap = { all: 'All Transactions', grn: 'Goods Receipt (GRN)', issue: 'Issue', return: 'Return', transfer: 'Transfer', adjustment: 'Adjustment' };
    setText('invCardTitle', titleMap[tab] || 'Transactions');
    var actionsEl = document.getElementById('invCardActions');
    if (!actionsEl) return;
    if (tab === 'all') {
      actionsEl.innerHTML = '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>';
    } else if (tab === 'grn') {
      actionsEl.innerHTML = '<button class="btn btn-success" onclick="Inventory.openGRNForm()">' + ICONS.plus + ' New GRN</button>' + '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>';
    } else if (tab === 'issue') {
      actionsEl.innerHTML = '<button class="btn btn-warning" onclick="Inventory.openIssueForm()">' + ICONS.plus + ' New Issue</button>' + '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>';
    } else if (tab === 'return') {
      actionsEl.innerHTML = '<button class="btn btn-primary" onclick="Inventory.openReturnForm()">' + ICONS.plus + ' New Return</button>' + '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>';
    } else if (tab === 'transfer') {
      actionsEl.innerHTML = '<button class="btn btn-primary" onclick="Inventory.openTransferForm()">' + ICONS.plus + ' New Transfer</button>' + '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>';
    } else if (tab === 'adjustment') {
      actionsEl.innerHTML = '<button class="btn btn-warning" onclick="Inventory.openAdjustmentForm()">' + ICONS.plus + ' New Adjustment</button>' + '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>';
    }
    Loader.show();
    var apiAction = tab === 'all' ? 'getAllTransactions' : 'getTransactionsByType';
    var apiData = tab === 'all' ? {} : { type: tab === 'grn' ? 'Goods Receipt' : tab.charAt(0).toUpperCase() + tab.slice(1) };
    API.post(apiAction, apiData)
      .then(function(data) { invData = data || []; Loader.hide(); renderInventoryTable(); })
      .catch(function(err) { Loader.hide(); Notify.error('Failed to load transactions'); });
  }

  function loadPartsForSelect(selectId) {
    API.post('getSpareParts', {})
      .then(function(data) {
        invPartsCache = data || [];
        populateSelectLocal(selectId, invPartsCache, 'PartCode', 'PartName', 'Select Part');
      })
      .catch(function() {});
  }

  function onInvPartChange(prefix) {
    var partCode = document.getElementById(prefix + 'PartCode').value;
    var part = invPartsCache.find(function(p) { return p.PartCode === partCode; });
    if (part) {
      var partNameEl = document.getElementById(prefix + 'PartName'); if (partNameEl) partNameEl.value = part.PartName || '';
      var stockEl = document.getElementById(prefix + 'CurrentStock');
      if (stockEl) stockEl.value = part.CurrentStock || 0;
      var costEl = document.getElementById(prefix + 'UnitCost');
      if (costEl && !costEl.value) costEl.value = part.UnitCost || 0;
      var fromLocEl = document.getElementById(prefix + 'FromLocation');
      if (fromLocEl) fromLocEl.value = part.StoreLocation || '';
      calcInvTotal(prefix);
    } else {
      var partNameEl = document.getElementById(prefix + 'PartName'); if (partNameEl) partNameEl.value = '';
      var stockEl = document.getElementById(prefix + 'CurrentStock');
      if (stockEl) stockEl.value = '0';
      var fromLocEl = document.getElementById(prefix + 'FromLocation');
      if (fromLocEl) fromLocEl.value = '';
    }
  }

  function calcInvTotal(prefix) {
    var qty = parseFloat(document.getElementById(prefix + 'Quantity').value) || 0;
    var cost = parseFloat(document.getElementById(prefix + 'UnitCost').value) || 0;
    var totalCostEl = document.getElementById(prefix + 'TotalCost'); if (totalCostEl) totalCostEl.value = (qty * cost).toFixed(2);
  }

  function openGRNForm() {
    resetFormLocal('grnForm');
    var grnNoEl = document.getElementById('grnNo'); if (grnNoEl) grnNoEl.value = 'Auto-generated';
    if (invPartsCache.length === 0) { loadPartsForSelect('grnPartCode'); } else { populateSelectLocal('grnPartCode', invPartsCache, 'PartCode', 'PartName', 'Select Part'); }
    var now = new Date();
    var isoStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var rdEl = document.getElementById('grnReceivedDate'); if (rdEl) rdEl.value = isoStr;
    openModalFormLocal('grnForm', 'New Goods Receipt (GRN)');
  }

  function openIssueForm() {
    resetFormLocal('issueForm');
    if (invPartsCache.length === 0) { loadPartsForSelect('issuePartCode'); } else { populateSelectLocal('issuePartCode', invPartsCache, 'PartCode', 'PartName', 'Select Part'); }
    openModalFormLocal('issueForm', 'New Issue');
  }

  function openReturnForm() {
    resetFormLocal('returnForm');
    if (invPartsCache.length === 0) { loadPartsForSelect('returnPartCode'); } else { populateSelectLocal('returnPartCode', invPartsCache, 'PartCode', 'PartName', 'Select Part'); }
    openModalFormLocal('returnForm', 'New Return');
  }

  function openTransferForm() {
    resetFormLocal('transferForm');
    if (invPartsCache.length === 0) { loadPartsForSelect('transferPartCode'); } else { populateSelectLocal('transferPartCode', invPartsCache, 'PartCode', 'PartName', 'Select Part'); }
    openModalFormLocal('transferForm', 'New Transfer');
  }

  function openAdjustmentForm() {
    resetFormLocal('adjustmentForm');
    if (invPartsCache.length === 0) { loadPartsForSelect('adjustmentPartCode'); } else { populateSelectLocal('adjustmentPartCode', invPartsCache, 'PartCode', 'PartName', 'Select Part'); }
    openModalFormLocal('adjustmentForm', 'New Stock Adjustment');
  }

  function saveGRN(e) {
    e.preventDefault();
    var data = getFormDataLocal('grnForm');
    Loader.show();
    API.post('processGoodsReceipt', data)
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModalLocal('grnModal');
          Notify.success('GRN ' + result.grnNo + ' saved successfully');
          switchInvTab('grn', document.querySelector('#inventoryPage .workflow-tab[data-tab="grn"]'));
        } else {
          Notify.error(result.message || 'Failed to save GRN');
        }
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to save GRN'); });
    return false;
  }

  function saveIssue(e) {
    e.preventDefault();
    var data = getFormDataLocal('issueForm');
    Loader.show();
    API.post('processIssue', data)
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModalLocal('issueModal');
          Notify.success('Issue ' + result.transactionId + ' saved successfully');
          switchInvTab('issue', document.querySelector('#inventoryPage .workflow-tab[data-tab="issue"]'));
        } else {
          Notify.error(result.message || 'Failed to process issue');
        }
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to process issue'); });
    return false;
  }

  function saveReturn(e) {
    e.preventDefault();
    var data = getFormDataLocal('returnForm');
    Loader.show();
    API.post('processReturn', data)
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModalLocal('returnModal');
          Notify.success('Return ' + result.transactionId + ' saved successfully');
          switchInvTab('return', document.querySelector('#inventoryPage .workflow-tab[data-tab="return"]'));
        } else {
          Notify.error(result.message || 'Failed to process return');
        }
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to process return'); });
    return false;
  }

  function saveTransfer(e) {
    e.preventDefault();
    var data = getFormDataLocal('transferForm');
    Loader.show();
    API.post('processTransfer', data)
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModalLocal('transferModal');
          Notify.success('Transfer ' + result.transactionId + ' saved successfully');
          switchInvTab('transfer', document.querySelector('#inventoryPage .workflow-tab[data-tab="transfer"]'));
        } else {
          Notify.error(result.message || 'Failed to process transfer');
        }
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to process transfer'); });
    return false;
  }

  function saveAdjustment(e) {
    e.preventDefault();
    var data = getFormDataLocal('adjustmentForm');
    data.Remarks = document.getElementById('adjustmentReason').value + (data.Remarks ? ' - ' + data.Remarks : '');
    Loader.show();
    API.post('processAdjustment', data)
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModalLocal('adjustmentModal');
          Notify.success('Adjustment ' + result.transactionId + ' saved successfully');
          switchInvTab('adjustment', document.querySelector('#inventoryPage .workflow-tab[data-tab="adjustment"]'));
        } else {
          Notify.error(result.message || 'Failed to process adjustment');
        }
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to process adjustment'); });
    return false;
  }

  function searchInvTable() {
    var query = document.getElementById('invSearch').value;
    if (!query) { renderInventoryTable(); return; }
    if (invSearchDebounce) clearTimeout(invSearchDebounce);
    invSearchDebounce = setTimeout(function() {
      Loader.show();
      API.post('searchTransactions', { query: query })
        .then(function(result) { invData = result; Loader.hide(); invPage = 1; renderInventoryTable(); })
        .catch(function(err) { Loader.hide(); Notify.error('Search failed'); });
    }, 300);
  }

  function applyInvFilter() {
    var fromDate = document.getElementById('invFilterFromDate').value;
    var toDate = document.getElementById('invFilterToDate').value;
    var partCode = document.getElementById('invFilterPart').value;
    var type = document.getElementById('invFilterType').value;
    Loader.show();
    if (fromDate && toDate) {
      API.post('getTransactionsByDateRange', { startDate: fromDate, endDate: toDate })
        .then(function(data) { invData = data; Loader.hide(); invPage = 1; renderInventoryTable(); })
        .catch(function(err) { Loader.hide(); Notify.error('Filter failed'); });
    } else if (partCode) {
      API.post('getTransactionsByPart', { partCode: partCode })
        .then(function(data) { invData = data; Loader.hide(); invPage = 1; renderInventoryTable(); })
        .catch(function(err) { Loader.hide(); Notify.error('Filter failed'); });
    } else if (type) {
      API.post('getTransactionsByType', { type: type })
        .then(function(data) { invData = data; Loader.hide(); invPage = 1; renderInventoryTable(); })
        .catch(function(err) { Loader.hide(); Notify.error('Filter failed'); });
    } else {
      Loader.hide();
      renderInventoryTable();
    }
  }

  function clearInvFilter() {
    var el;
    el = document.getElementById('invFilterFromDate'); if (el) el.value = '';
    el = document.getElementById('invFilterToDate'); if (el) el.value = '';
    el = document.getElementById('invFilterPart'); if (el) el.value = '';
    el = document.getElementById('invFilterType'); if (el) el.value = '';
    el = document.getElementById('invSearch'); if (el) el.value = '';
    Loader.show();
    API.post('getAllTransactions', {})
      .then(function(data) { invData = data || []; Loader.hide(); invPage = 1; renderInventoryTable(); })
      .catch(function(err) { Loader.hide(); Notify.error('Failed to reload data'); });
  }

  function exportInvCSV() {
    Loader.show();
    API.post('exportTransactionsCSV', {})
      .then(function(csvData) {
        Loader.hide();
        if (!csvData) { Notify.warning('No data to export'); return; }
        var blob = new Blob([csvData], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'InventoryTransactions_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        Notify.success('Export completed');
      })
      .catch(function(err) { Loader.hide(); Notify.error('Export failed'); });
  }

  function loadInvFilterParts() {
    API.post('getSpareParts', {})
      .then(function(data) {
        var parts = data || [];
        populateSelectLocal('invFilterPart', parts, 'PartCode', 'PartName', 'All Parts');
      })
      .catch(function() {});
  }

  function updateInvDashboard(data) {
    if (!data) return;
    var el;
    el = document.getElementById('invTotalStockValue'); if (el) el.textContent = parseFloat(data.totalStockValue || 0).toFixed(2);
    el = document.getElementById('invLowStockCount'); if (el) el.textContent = data.lowStockCount || 0;
    el = document.getElementById('invOutOfStockCount'); if (el) el.textContent = data.outOfStockCount || 0;
    el = document.getElementById('invTotalTransactions'); if (el) el.textContent = (invData && invData.length) || 0;
  }

  function loadInventoryData() {
    Loader.show();
    API.post('getInventoryDashboardData', {})
      .then(function(result) {
        invData = result.recentTransactions || result || [];
        Loader.hide();
        updateInvDashboard(result);
        renderInventoryTable();
      })
      .catch(function(err) { Loader.hide(); Notify.error('Failed to load inventory data'); });
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="inventoryPage" class="page">' +
        '<div class="dashboard-grid" id="invDashboardCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary" onclick="Inventory.switchInvTab(\'all\', document.querySelector(\'#inventoryPage .workflow-tab[data-tab=all]\'))" style="cursor:pointer">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div>' +
              '<div class="stat-info"><h3 id="invTotalStockValue">0.00</h3><p>Total Stock Value</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-warning" style="cursor:pointer">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2L2 18h16L10 2z"/><line x1="10" y1="8" x2="10" y2="12"/><line x1="10" y1="14" x2="10.01" y2="14"/></svg></div>' +
              '<div class="stat-info"><h3 id="invLowStockCount">0</h3><p>Low Stock Items</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-danger" style="cursor:pointer">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
              '<div class="stat-info"><h3 id="invOutOfStockCount">0</h3><p>Out of Stock Items</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-info">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
              '<div class="stat-info"><h3 id="invTotalTransactions">0</h3><p>Total Transactions</p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="workflow-tabs">' +
          '<button class="workflow-tab active" data-tab="all" onclick="Inventory.switchInvTab(\'all\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>' +
            '<span class="tab-label">All Transactions</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="grn" onclick="Inventory.switchInvTab(\'grn\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '<span class="tab-label">Goods Receipt</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="issue" onclick="Inventory.switchInvTab(\'issue\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></span>' +
            '<span class="tab-label">Issue</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="return" onclick="Inventory.switchInvTab(\'return\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span>' +
            '<span class="tab-label">Return</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="transfer" onclick="Inventory.switchInvTab(\'transfer\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg></span>' +
            '<span class="tab-label">Transfer</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="adjustment" onclick="Inventory.switchInvTab(\'adjustment\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span>' +
            '<span class="tab-label">Adjustment</span>' +
          '</button>' +
        '</div>' +

        '<div class="filter-bar" id="invFilterBar">' +
          '<div class="form-group">' +
            '<label>Search</label>' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="invSearch" placeholder="Search transactions..." onkeyup="Inventory.searchInvTable()">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>From Date</label>' +
            '<input type="date" class="form-control" id="invFilterFromDate">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>To Date</label>' +
            '<input type="date" class="form-control" id="invFilterToDate">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Part</label>' +
            '<select class="form-control" id="invFilterPart">' +
              '<option value="">All Parts</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Type</label>' +
            '<select class="form-control" id="invFilterType">' +
              '<option value="">All Types</option>' +
              '<option value="Goods Receipt">Goods Receipt</option>' +
              '<option value="Issue">Issue</option>' +
              '<option value="Return">Return</option>' +
              '<option value="Transfer">Transfer</option>' +
              '<option value="Adjustment">Adjustment</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="Inventory.applyInvFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="Inventory.clearInvFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title" id="invCardTitle">All Transactions</div>' +
            '<div class="card-actions" id="invCardActions">' +
              '<button class="btn btn-secondary" onclick="Inventory.exportInvCSV()">' + ICONS.download + ' Export CSV</button>' +
            '</div>' +
          '</div>' +
          '<div id="invTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="grnModal" style="display:none">' +
        '<div class="modal modal-wide" style="max-width:700px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="grnFormTitle">New Goods Receipt (GRN)</div>' +
            '<button class="modal-close" onclick="Inventory.hideModal(\'grnModal\')">&times;</button>' +
          '</div>' +
          '<form id="grnForm" onsubmit="return Inventory.saveGRN(event)">' +
            '<div class="modal-body">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>GRN No</label>' +
                  '<input type="text" name="GRNNo" class="form-control" id="grnNo" readonly placeholder="Auto-generated">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Part Code *</label>' +
                  '<select name="PartCode" class="form-control" id="grnPartCode" required onchange="Inventory.onInvPartChange(\'grn\')">' +
                    '<option value="">Select Part</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Part Name</label>' +
                  '<input type="text" name="PartName" class="form-control" id="grnPartName" readonly>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Current Stock</label>' +
                  '<input type="text" class="form-control" id="grnCurrentStock" readonly value="0">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Quantity *</label>' +
                  '<input type="number" name="Quantity" class="form-control" id="grnQuantity" required min="0" step="0.01" oninput="Inventory.calcInvTotal(\'grn\')">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Unit Cost</label>' +
                  '<input type="number" name="UnitCost" class="form-control" id="grnUnitCost" min="0" step="0.01" oninput="Inventory.calcInvTotal(\'grn\')">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Total Cost</label>' +
                  '<input type="text" class="form-control" id="grnTotalCost" readonly value="0.00">' +
                '</div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group">' +
                  '<label>Supplier</label>' +
                  '<input type="text" name="Supplier" class="form-control" id="grnSupplier">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Invoice No</label>' +
                  '<input type="text" name="InvoiceNo" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>PO No</label>' +
                  '<input type="text" name="PONo" class="form-control">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Received Date</label>' +
                  '<input type="datetime-local" name="ReceivedDate" class="form-control" id="grnReceivedDate">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Remarks</label>' +
                  '<textarea name="Remarks" class="form-control" rows="2"></textarea>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Inventory.hideModal(\'grnModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICON_SAVE_SVG + ' Save GRN</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="issueModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="issueFormTitle">New Issue</div>' +
            '<button class="modal-close" onclick="Inventory.hideModal(\'issueModal\')">&times;</button>' +
          '</div>' +
          '<form id="issueForm" onsubmit="return Inventory.saveIssue(event)">' +
            '<div class="modal-body">' +
              '<div class="form-group">' +
                '<label>Part Code *</label>' +
                '<select name="PartCode" class="form-control" id="issuePartCode" required onchange="Inventory.onInvPartChange(\'issue\')">' +
                  '<option value="">Select Part</option>' +
                '</select>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Part Name</label>' +
                  '<input type="text" name="PartName" class="form-control" id="issuePartName" readonly>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Available Stock</label>' +
                  '<input type="text" class="form-control" id="issueCurrentStock" readonly value="0">' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Quantity *</label>' +
                '<input type="number" name="Quantity" class="form-control" required min="0.01" step="0.01">' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Reference No</label>' +
                  '<input type="text" name="ReferenceNo" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Remarks</label>' +
                  '<textarea name="Remarks" class="form-control" rows="2"></textarea>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Inventory.hideModal(\'issueModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-warning"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg> Issue</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="returnModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="returnFormTitle">New Return</div>' +
            '<button class="modal-close" onclick="Inventory.hideModal(\'returnModal\')">&times;</button>' +
          '</div>' +
          '<form id="returnForm" onsubmit="return Inventory.saveReturn(event)">' +
            '<div class="modal-body">' +
              '<div class="form-group">' +
                '<label>Part Code *</label>' +
                '<select name="PartCode" class="form-control" id="returnPartCode" required onchange="Inventory.onInvPartChange(\'return\')">' +
                  '<option value="">Select Part</option>' +
                '</select>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Part Name</label>' +
                  '<input type="text" name="PartName" class="form-control" id="returnPartName" readonly>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Current Stock</label>' +
                  '<input type="text" class="form-control" id="returnCurrentStock" readonly value="0">' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Quantity *</label>' +
                '<input type="number" name="Quantity" class="form-control" required min="0.01" step="0.01">' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Reference No</label>' +
                  '<input type="text" name="ReferenceNo" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Remarks</label>' +
                  '<textarea name="Remarks" class="form-control" rows="2"></textarea>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Inventory.hideModal(\'returnModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Return</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="transferModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="transferFormTitle">New Transfer</div>' +
            '<button class="modal-close" onclick="Inventory.hideModal(\'transferModal\')">&times;</button>' +
          '</div>' +
          '<form id="transferForm" onsubmit="return Inventory.saveTransfer(event)">' +
            '<div class="modal-body">' +
              '<div class="form-group">' +
                '<label>Part Code *</label>' +
                '<select name="PartCode" class="form-control" id="transferPartCode" required onchange="Inventory.onInvPartChange(\'transfer\')">' +
                  '<option value="">Select Part</option>' +
                '</select>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Part Name</label>' +
                  '<input type="text" name="PartName" class="form-control" id="transferPartName" readonly>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Current Stock</label>' +
                  '<input type="text" class="form-control" id="transferCurrentStock" readonly value="0">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Quantity *</label>' +
                  '<input type="number" name="Quantity" class="form-control" required min="0.01" step="0.01">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>From Location</label>' +
                  '<input type="text" name="FromLocation" class="form-control" id="transferFromLocation" readonly>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>To Location *</label>' +
                '<input type="text" name="ToLocation" class="form-control" required>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Remarks</label>' +
                '<textarea name="Remarks" class="form-control" rows="2"></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Inventory.hideModal(\'transferModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-primary"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> Transfer</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="adjustmentModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="adjustmentFormTitle">New Stock Adjustment</div>' +
            '<button class="modal-close" onclick="Inventory.hideModal(\'adjustmentModal\')">&times;</button>' +
          '</div>' +
          '<form id="adjustmentForm" onsubmit="return Inventory.saveAdjustment(event)">' +
            '<div class="modal-body">' +
              '<div class="form-group">' +
                '<label>Part Code *</label>' +
                '<select name="PartCode" class="form-control" id="adjustmentPartCode" required onchange="Inventory.onInvPartChange(\'adjustment\')">' +
                  '<option value="">Select Part</option>' +
                '</select>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Part Name</label>' +
                  '<input type="text" name="PartName" class="form-control" id="adjustmentPartName" readonly>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Current Stock</label>' +
                  '<input type="text" class="form-control" id="adjustmentCurrentStock" readonly value="0">' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Quantity * (+ for increase, - for decrease)</label>' +
                '<input type="number" name="Quantity" class="form-control" required step="0.01" placeholder="e.g. 10 or -5">' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Reason *</label>' +
                '<input type="text" name="Reason" class="form-control" id="adjustmentReason" required placeholder="Reason for adjustment">' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Remarks</label>' +
                '<textarea name="Remarks" class="form-control" rows="2"></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Inventory.hideModal(\'adjustmentModal\')">Cancel</button>' +
              '<button type="submit" class="btn btn-warning"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> Adjust</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

    loadInventoryData();
    loadInvFilterParts();
  }

  return {
    show: renderPage,
    switchInvTab: switchInvTab,
    openGRNForm: openGRNForm,
    openIssueForm: openIssueForm,
    openReturnForm: openReturnForm,
    openTransferForm: openTransferForm,
    openAdjustmentForm: openAdjustmentForm,
    saveGRN: saveGRN,
    saveIssue: saveIssue,
    saveReturn: saveReturn,
    saveTransfer: saveTransfer,
    saveAdjustment: saveAdjustment,
    searchInvTable: searchInvTable,
    applyInvFilter: applyInvFilter,
    clearInvFilter: clearInvFilter,
    exportInvCSV: exportInvCSV,
    onInvPartChange: onInvPartChange,
    calcInvTotal: calcInvTotal,
    hideModal: hideModalLocal,
    changePage: changePage
  };
})();