var InventoryTransactions = (function() {
  var itData = [];
  var itPage = 1;
  var itFilter = { search: '', type: '', part: '', fromDate: '', toDate: '' };
  var itSearchDebounce = null;
  var PAGE_SIZE = 10;
  var __pageStates = {};

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var ICON_EXPORT = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>';
  var ICON_PDF = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M6 14H4a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M6 12h8v5H6v-5z"/><path d="M6 5V3a1 1 0 011-1h6a1 1 0 011 1v2"/></svg>';
  var ICON_PRINT = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M6 14H4a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M6 12h8v5H6v-5z"/><path d="M6 5V3a1 1 0 011-1h6a1 1 0 011 1v2"/></svg>';
  var ICON_REFRESH = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>';
  var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  function showModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; el.classList.add('show'); }
  }

  function hideModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('show'); }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatDateTimeLocal(date) {
    if (!date) return '';
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var month = months[d.getMonth()];
    var year = d.getFullYear();
    var hours = d.getHours();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    var mins = String(d.getMinutes()).padStart(2, '0');
    return day + ' ' + month + ' ' + year + ' | ' + String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm;
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="itPage" class="page">' +
        '<div class="dashboard-grid" id="itSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="itTotalTxns">0</h3><p>Total Transactions</p></div></div></div>' +
          '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="itGoodsReceipt">0</h3><p>Goods Receipt</p></div></div></div>' +
          '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div><div class="stat-info"><h3 id="itIssues">0</h3><p>Issues</p></div></div></div>' +
          '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></div><div class="stat-info"><h3 id="itReturns">0</h3><p>Returns</p></div></div></div>' +
          '<div class="stat-card stat-purple"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg></div><div class="stat-info"><h3 id="itTransfers">0</h3><p>Transfers</p></div></div></div>' +
          '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></div><div class="stat-info"><h3 id="itAdjustments">0</h3><p>Adjustments</p></div></div></div>' +
        '</div>' +

        '<div class="filter-bar" id="itFilterBar">' +
          '<div class="form-group">' +
            '<label>Search</label>' +
            '<div class="search-box">' + ICON_SEARCH +
              '<input type="text" class="form-control" id="itSearch" placeholder="Search transactions..." onkeyup="InventoryTransactions.searchTable()">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Type</label>' +
            '<select class="form-control" id="itFilterType">' +
              '<option value="">All Types</option>' +
              '<option value="Goods Receipt">Goods Receipt</option>' +
              '<option value="Issue">Issue</option>' +
              '<option value="Return">Return</option>' +
              '<option value="Transfer">Transfer</option>' +
              '<option value="Adjustment">Adjustment</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Part</label>' +
            '<select class="form-control" id="itFilterPart"><option value="">All Parts</option></select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>From</label>' +
            '<input type="date" class="form-control" id="itFilterFromDate">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>To</label>' +
            '<input type="date" class="form-control" id="itFilterToDate">' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="InventoryTransactions.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="InventoryTransactions.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Inventory Transactions</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-secondary" onclick="InventoryTransactions.exportCSV()">' + ICON_EXPORT + ' Export Excel</button>' +
              '<button class="btn btn-secondary" onclick="InventoryTransactions.exportPDF()">' + ICON_PDF + ' PDF</button>' +
              '<button class="btn btn-secondary" onclick="InventoryTransactions.print()">' + ICON_PRINT + ' Print</button>' +
              '<button class="btn btn-secondary" onclick="InventoryTransactions.refresh()">' + ICON_REFRESH + ' Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="itTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="itViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="itViewModalTitle">Transaction Details</div>' +
            '<button class="modal-close" onclick="InventoryTransactions.hideViewModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="view-grid">' +
              '<div class="view-section">' +
                '<h4>Transaction Info</h4>' +
                '<div class="view-row"><span>Transaction ID</span><strong id="itViewTxnId">-</strong></div>' +
                '<div class="view-row"><span>Type</span><strong id="itViewType">-</strong></div>' +
                '<div class="view-row"><span>Part Code</span><strong id="itViewPartCode">-</strong></div>' +
                '<div class="view-row"><span>Part Name</span><strong id="itViewPartName">-</strong></div>' +
                '<div class="view-row"><span>Quantity</span><strong id="itViewQty">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Financial</h4>' +
                '<div class="view-row"><span>Unit Cost</span><strong id="itViewUnitCost">-</strong></div>' +
                '<div class="view-row"><span>Total Cost</span><strong id="itViewTotalCost">-</strong></div>' +
                '<div class="view-row"><span>Reference No</span><strong id="itViewRefNo">-</strong></div>' +
                '<div class="view-row"><span>Reference Type</span><strong id="itViewRefType">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section">' +
                '<h4>Location</h4>' +
                '<div class="view-row"><span>From Location</span><strong id="itViewFromLoc">-</strong></div>' +
                '<div class="view-row"><span>To Location</span><strong id="itViewToLoc">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Audit</h4>' +
                '<div class="view-row"><span>Processed By</span><strong id="itViewProcessedBy">-</strong></div>' +
                '<div class="view-row"><span>Processed At</span><strong id="itViewProcessedAt">-</strong></div>' +
                '<div class="view-row"><span>Created At</span><strong id="itViewCreatedAt">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section" style="grid-column:1/-1">' +
                '<h4>Remarks</h4>' +
                '<p id="itViewRemarks" class="view-text">-</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="InventoryTransactions.hideViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getInventoryTransactions', {})
      .then(function(data) {
        itData = data || [];
        Loader.hide();
        updateSummary();
        renderTable();
        loadFilterParts();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load inventory transactions');
      });
  }

  function loadFilterParts() {
    API.post('getSpareParts', {})
      .then(function(data) {
        var parts = data || [];
        var sel = document.getElementById('itFilterPart');
        if (sel) sel.innerHTML = '<option value="">All Parts</option>';
        if (sel) parts.forEach(function(item) { sel.innerHTML += '<option value="' + Utils.escapeHtml(item.PartCode || '') + '">' + Utils.escapeHtml(item.PartName || item.PartCode || '') + '</option>'; });
      })
      .catch(function() {});
  }

  function updateSummary() {
    var total = itData.length;
    var gr = itData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'goods receipt'; }).length;
    var issue = itData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'issue'; }).length;
    var ret = itData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'return'; }).length;
    var transfer = itData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'transfer'; }).length;
    var adj = itData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'adjustment'; }).length;
    setText('itTotalTxns', total);
    setText('itGoodsReceipt', gr);
    setText('itIssues', issue);
    setText('itReturns', ret);
    setText('itTransfers', transfer);
    setText('itAdjustments', adj);
  }

  function renderTable() {
    var data = applyClientFilters(itData);
    renderTableLocal(data, [
      { key: 'TransactionID', label: 'Txn ID' },
      { key: 'CreatedAt', label: 'Date', datetime: true },
      { key: 'TransactionType', label: 'Type', badge: true, badgeMap: { 'Goods Receipt': 'success', 'Issue': 'warning', 'Return': 'info', 'Transfer': 'primary', 'Adjustment': 'danger' } },
      { key: 'PartCode', label: 'Part Code' },
      { key: 'PartName', label: 'Part Name' },
      { key: 'Quantity', label: 'Qty' },
      { key: 'UnitCost', label: 'Unit Cost', format: function(v) { return parseFloat(v || 0).toFixed(2); } },
      { key: 'TotalCost', label: 'Total Cost', format: function(v) { return parseFloat(v || 0).toFixed(2); } },
      { key: 'ReferenceNo', label: 'Reference' }
    ], [
      { label: 'View', icon: 'view', class: 'btn-primary', onclick: "InventoryTransactions.view('{id}')", idField: 'TransactionID' }
    ], itPage, PAGE_SIZE, 'itTableContainer');
    registerPageState('itTableContainer', function(p) { itPage = p; renderTable(); });
  }

  function view(id) {
    var item = itData.find(function(r) { return r.TransactionID === id; });
    if (!item) { Notify.error('Record not found'); return; }
    setText('itViewTxnId', item.TransactionID || '-');
    setText('itViewType', item.TransactionType || '-');
    setText('itViewPartCode', item.PartCode || '-');
    setText('itViewPartName', item.PartName || '-');
    setText('itViewQty', item.Quantity || '0');
    setText('itViewUnitCost', item.UnitCost ? parseFloat(item.UnitCost).toFixed(2) : '0.00');
    setText('itViewTotalCost', item.TotalCost ? parseFloat(item.TotalCost).toFixed(2) : '0.00');
    setText('itViewRefNo', item.ReferenceNo || '-');
    setText('itViewRefType', item.ReferenceType || '-');
    setText('itViewFromLoc', item.FromLocation || '-');
    setText('itViewToLoc', item.ToLocation || '-');
    setText('itViewProcessedBy', item.ProcessedBy || '-');
    setText('itViewProcessedAt', item.ProcessedAt || '-');
    setText('itViewCreatedAt', item.CreatedAt || '-');
    setText('itViewRemarks', item.Remarks || '-');
    var titleEl = document.getElementById('itViewModalTitle');
    if (titleEl) titleEl.textContent = 'Transaction - ' + id;
    showModal('itViewModal');
  }

  function searchTable() {
    var query = document.getElementById('itSearch').value;
    itFilter.search = query;
    if (itSearchDebounce) clearTimeout(itSearchDebounce);
    itSearchDebounce = setTimeout(function() {
      itPage = 1;
      renderTable();
    }, 300);
  }

  function applyFilter() {
    itFilter.type = document.getElementById('itFilterType').value;
    itFilter.part = document.getElementById('itFilterPart').value;
    itFilter.fromDate = document.getElementById('itFilterFromDate').value;
    itFilter.toDate = document.getElementById('itFilterToDate').value;
    itPage = 1;
    renderTable();
  }

  function clearFilter() {
    var el;
    el = document.getElementById('itFilterType'); if (el) el.value = '';
    el = document.getElementById('itFilterPart'); if (el) el.value = '';
    el = document.getElementById('itFilterFromDate'); if (el) el.value = '';
    el = document.getElementById('itFilterToDate'); if (el) el.value = '';
    el = document.getElementById('itSearch'); if (el) el.value = '';
    itFilter = { search: '', type: '', part: '', fromDate: '', toDate: '' };
    itPage = 1;
    renderTable();
  }

  function applyClientFilters(data) {
    if (itFilter.search) {
      var q = itFilter.search.toLowerCase();
      data = data.filter(function(r) {
        return (r.TransactionID && r.TransactionID.toLowerCase().indexOf(q) > -1) ||
               (r.PartCode && r.PartCode.toLowerCase().indexOf(q) > -1) ||
               (r.PartName && r.PartName.toLowerCase().indexOf(q) > -1) ||
               (r.ReferenceNo && r.ReferenceNo.toLowerCase().indexOf(q) > -1);
      });
    }
    if (itFilter.type) data = data.filter(function(r) { return (r.TransactionType || '').toLowerCase() === itFilter.type.toLowerCase(); });
    if (itFilter.part) data = data.filter(function(r) { return r.PartCode === itFilter.part; });
    if (itFilter.fromDate) {
      var from = new Date(itFilter.fromDate);
      data = data.filter(function(r) {
        var d = r.CreatedAt ? new Date(r.CreatedAt) : null;
        return d && d >= from;
      });
    }
    if (itFilter.toDate) {
      var to = new Date(itFilter.toDate);
      to.setHours(23, 59, 59, 999);
      data = data.filter(function(r) {
        var d = r.CreatedAt ? new Date(r.CreatedAt) : null;
        return d && d <= to;
      });
    }
    return data;
  }

  function exportCSV() {
    var data = applyClientFilters(itData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var headers = ['TransactionID','TransactionType','PartCode','PartName','Quantity','UnitCost','TotalCost','ReferenceNo','ReferenceType','FromLocation','ToLocation','Remarks','ProcessedBy','ProcessedAt','CreatedAt'];
    var csv = headers.join(',') + '\n';
    data.forEach(function(r) {
      var row = headers.map(function(h) {
        var val = r[h] !== undefined && r[h] !== null ? r[h] : '';
        val = String(val).replace(/"/g, '""');
        if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) val = '"' + val + '"';
        return val;
      });
      csv += row.join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'InventoryTransactions_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('Export completed');
  }

  function exportPDF() {
    var data = applyClientFilters(itData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1F4E78;color:#fff}</style></head><body>';
    html += '<h2 style="text-align:center">Inventory Transactions Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>Txn ID</th><th>Type</th><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Reference</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.TransactionID || '') + '</td><td>' + Utils.escapeHtml(r.TransactionType || '') + '</td><td>' + Utils.escapeHtml(r.PartCode || '') + '</td><td>' + Utils.escapeHtml(r.PartName || '') + '</td><td>' + Utils.escapeHtml(String(r.Quantity || '')) + '</td><td>' + (r.UnitCost ? parseFloat(r.UnitCost).toFixed(2) : '0.00') + '</td><td>' + (r.TotalCost ? parseFloat(r.TotalCost).toFixed(2) : '0.00') + '</td><td>' + Utils.escapeHtml(r.ReferenceNo || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'InventoryTransactions_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('PDF export completed');
  }

  function printPage() {
    var data = applyClientFilters(itData);
    if (!data || data.length === 0) { Notify.error('No data to print'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px}th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#1F4E78;color:#fff}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h2 style="text-align:center">Inventory Transactions Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>Txn ID</th><th>Type</th><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.TransactionID || '') + '</td><td>' + Utils.escapeHtml(r.TransactionType || '') + '</td><td>' + Utils.escapeHtml(r.PartCode || '') + '</td><td>' + Utils.escapeHtml(r.PartName || '') + '</td><td>' + Utils.escapeHtml(String(r.Quantity || '')) + '</td><td>' + (r.UnitCost ? parseFloat(r.UnitCost).toFixed(2) : '0.00') + '</td><td>' + (r.TotalCost ? parseFloat(r.TotalCost).toFixed(2) : '0.00') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var w = window.open('', '', 'width=800,height=600');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  function renderTableLocal(data, columns, actions, page, pageSize, containerId) {
    containerId = containerId || 'tableContainer';
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
          val = '<span class="' + badgeClass + '">' + Utils.escapeHtml(String(val)) + '</span>';
        }

        if (col.format) val = col.format(val, row);

        if (col.datetime) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateTimeLocal(d);
        }

        html += '<td>' + val + '</td>';
      });

      if (actions) {
        html += '<td><div class="actions-cell">';
        actions.forEach(function(action) {
          if (action.condition && !action.condition(row)) return;
          var idField = action.idField || Object.keys(row)[0];
          var onclick = action.onclick ? action.onclick.replace(/\{id\}/g, row[idField]) : '';
          if (action.icon === 'view') {
            html += '<button class="btn btn-sm ' + (action.class || 'btn-primary') + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + ICON_VIEW + ' ' + action.label + '</button>';
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
        '<button onclick="InventoryTransactions.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="InventoryTransactions.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="InventoryTransactions.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  function hideViewModal() { hideModal('itViewModal'); }

  return {
    show: renderPage,
    refresh: loadData,
    searchTable: searchTable,
    applyFilter: applyFilter,
    clearFilter: clearFilter,
    view: view,
    exportCSV: exportCSV,
    exportPDF: exportPDF,
    print: printPage,
    changePage: changePage,
    hideViewModal: hideViewModal
  };
})();
