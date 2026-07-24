var GoodsReceipt = (function() {
  var grData = [];
  var grPage = 1;
  var grFilter = { search: '', status: '', supplier: '', fromDate: '', toDate: '' };
  var grSearchDebounce = null;
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

  function formatDateOnly(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return day + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="grPage" class="page">' +
        '<div class="dashboard-grid" id="grSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="grTotalGRNs">0</h3><p>Total GRNs</p></div></div></div>' +
          '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="grReceived">0</h3><p>Received</p></div></div></div>' +
          '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div><div class="stat-info"><h3 id="grPending">0</h3><p>Pending</p></div></div></div>' +
          '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="stat-info"><h3 id="grTotalQty">0</h3><p>Total Quantity</p></div></div></div>' +
        '</div>' +

        '<div class="filter-bar" id="grFilterBar">' +
          '<div class="form-group">' +
            '<label>Search</label>' +
            '<div class="search-box">' + ICON_SEARCH +
              '<input type="text" class="form-control" id="grSearch" placeholder="Search GRN..." onkeyup="GoodsReceipt.searchTable()">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Status</label>' +
            '<select class="form-control" id="grFilterStatus">' +
              '<option value="">All Status</option>' +
              '<option value="Received">Received</option>' +
              '<option value="Pending">Pending</option>' +
              '<option value="Cancelled">Cancelled</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Supplier</label>' +
            '<input type="text" class="form-control" id="grFilterSupplier" placeholder="Filter by supplier...">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>From</label>' +
            '<input type="date" class="form-control" id="grFilterFromDate">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>To</label>' +
            '<input type="date" class="form-control" id="grFilterToDate">' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="GoodsReceipt.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="GoodsReceipt.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Goods Receipt Notes</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-secondary" onclick="GoodsReceipt.exportCSV()">' + ICON_EXPORT + ' Export Excel</button>' +
              '<button class="btn btn-secondary" onclick="GoodsReceipt.exportPDF()">' + ICON_PDF + ' PDF</button>' +
              '<button class="btn btn-secondary" onclick="GoodsReceipt.print()">' + ICON_PRINT + ' Print</button>' +
              '<button class="btn btn-secondary" onclick="GoodsReceipt.refresh()">' + ICON_REFRESH + ' Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="grTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="grViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="grViewModalTitle">Goods Receipt Details</div>' +
            '<button class="modal-close" onclick="GoodsReceipt.hideViewModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="view-grid">' +
              '<div class="view-section">' +
                '<h4>Receipt Info</h4>' +
                '<div class="view-row"><span>GRN No</span><strong id="grViewGRNNo">-</strong></div>' +
                '<div class="view-row"><span>Part Code</span><strong id="grViewPartCode">-</strong></div>' +
                '<div class="view-row"><span>Part Name</span><strong id="grViewPartName">-</strong></div>' +
                '<div class="view-row"><span>Quantity</span><strong id="grViewQty">-</strong></div>' +
                '<div class="view-row"><span>Status</span><strong id="grViewStatus">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Financial</h4>' +
                '<div class="view-row"><span>Unit Cost</span><strong id="grViewUnitCost">-</strong></div>' +
                '<div class="view-row"><span>Total Cost</span><strong id="grViewTotalCost">-</strong></div>' +
                '<div class="view-row"><span>Supplier</span><strong id="grViewSupplier">-</strong></div>' +
                '<div class="view-row"><span>Invoice No</span><strong id="grViewInvoiceNo">-</strong></div>' +
                '<div class="view-row"><span>PO No</span><strong id="grViewPONo">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section">' +
                '<h4>Receiving</h4>' +
                '<div class="view-row"><span>Received By</span><strong id="grViewReceivedBy">-</strong></div>' +
                '<div class="view-row"><span>Received Date</span><strong id="grViewReceivedDate">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Audit</h4>' +
                '<div class="view-row"><span>Created By</span><strong id="grViewCreatedBy">-</strong></div>' +
                '<div class="view-row"><span>Created At</span><strong id="grViewCreatedAt">-</strong></div>' +
                '<div class="view-row"><span>Updated At</span><strong id="grViewUpdatedAt">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section" style="grid-column:1/-1">' +
                '<h4>Remarks</h4>' +
                '<p id="grViewRemarks" class="view-text">-</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="GoodsReceipt.hideViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getGoodsReceipt', {})
      .then(function(data) {
        grData = data || [];
        Loader.hide();
        updateSummary();
        renderTable();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load goods receipt data');
      });
  }

  function updateSummary() {
    var total = grData.length;
    var received = grData.filter(function(r) { return (r.Status || '').toLowerCase() === 'received'; }).length;
    var pending = grData.filter(function(r) { return (r.Status || '').toLowerCase() !== 'received'; }).length;
    var totalQty = 0;
    grData.forEach(function(r) { totalQty += parseFloat(r.Quantity) || 0; });
    setText('grTotalGRNs', total);
    setText('grReceived', received);
    setText('grPending', pending);
    setText('grTotalQty', totalQty.toFixed(2));
  }

  function renderTable() {
    var data = applyClientFilters(grData);
    renderTableLocal(data, [
      { key: 'GRNNo', label: 'GRN No' },
      { key: 'PartCode', label: 'Part Code' },
      { key: 'PartName', label: 'Part Name' },
      { key: 'Quantity', label: 'Qty' },
      { key: 'UnitCost', label: 'Unit Cost', format: function(v) { return parseFloat(v || 0).toFixed(2); } },
      { key: 'TotalCost', label: 'Total Cost', format: function(v) { return parseFloat(v || 0).toFixed(2); } },
      { key: 'Supplier', label: 'Supplier' },
      { key: 'InvoiceNo', label: 'Invoice' },
      { key: 'ReceivedDate', label: 'Received', date: true },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Received': 'success', 'Pending': 'warning', 'Cancelled': 'danger' } }
    ], [
      { label: 'View', icon: 'view', class: 'btn-primary', onclick: "GoodsReceipt.view('{id}')", idField: 'GRNNo' }
    ], grPage, PAGE_SIZE, 'grTableContainer');
    registerPageState('grTableContainer', function(p) { grPage = p; renderTable(); });
  }

  function view(id) {
    var item = grData.find(function(r) { return r.GRNNo === id; });
    if (!item) { Notify.error('Record not found'); return; }
    setText('grViewGRNNo', item.GRNNo || '-');
    setText('grViewPartCode', item.PartCode || '-');
    setText('grViewPartName', item.PartName || '-');
    setText('grViewQty', item.Quantity || '0');
    setText('grViewStatus', item.Status || '-');
    setText('grViewUnitCost', item.UnitCost ? parseFloat(item.UnitCost).toFixed(2) : '0.00');
    setText('grViewTotalCost', item.TotalCost ? parseFloat(item.TotalCost).toFixed(2) : '0.00');
    setText('grViewSupplier', item.Supplier || '-');
    setText('grViewInvoiceNo', item.InvoiceNo || '-');
    setText('grViewPONo', item.PONo || '-');
    setText('grViewReceivedBy', item.ReceivedBy || '-');
    setText('grViewReceivedDate', item.ReceivedDate || item.CreatedAt || '-');
    setText('grViewCreatedBy', item.CreatedBy || '-');
    setText('grViewCreatedAt', item.CreatedAt || '-');
    setText('grViewUpdatedAt', item.UpdatedAt || '-');
    setText('grViewRemarks', item.Remarks || '-');
    var titleEl = document.getElementById('grViewModalTitle');
    if (titleEl) titleEl.textContent = 'Goods Receipt - ' + id;
    showModal('grViewModal');
  }

  function searchTable() {
    var query = document.getElementById('grSearch').value;
    grFilter.search = query;
    if (grSearchDebounce) clearTimeout(grSearchDebounce);
    grSearchDebounce = setTimeout(function() {
      grPage = 1;
      renderTable();
    }, 300);
  }

  function applyFilter() {
    grFilter.status = document.getElementById('grFilterStatus').value;
    grFilter.supplier = document.getElementById('grFilterSupplier').value;
    grFilter.fromDate = document.getElementById('grFilterFromDate').value;
    grFilter.toDate = document.getElementById('grFilterToDate').value;
    grPage = 1;
    renderTable();
  }

  function clearFilter() {
    var el;
    el = document.getElementById('grFilterStatus'); if (el) el.value = '';
    el = document.getElementById('grFilterSupplier'); if (el) el.value = '';
    el = document.getElementById('grFilterFromDate'); if (el) el.value = '';
    el = document.getElementById('grFilterToDate'); if (el) el.value = '';
    el = document.getElementById('grSearch'); if (el) el.value = '';
    grFilter = { search: '', status: '', supplier: '', fromDate: '', toDate: '' };
    grPage = 1;
    renderTable();
  }

  function applyClientFilters(data) {
    if (grFilter.search) {
      var q = grFilter.search.toLowerCase();
      data = data.filter(function(r) {
        return (r.GRNNo && r.GRNNo.toLowerCase().indexOf(q) > -1) ||
               (r.PartCode && r.PartCode.toLowerCase().indexOf(q) > -1) ||
               (r.PartName && r.PartName.toLowerCase().indexOf(q) > -1) ||
               (r.Supplier && r.Supplier.toLowerCase().indexOf(q) > -1) ||
               (r.InvoiceNo && r.InvoiceNo.toLowerCase().indexOf(q) > -1);
      });
    }
    if (grFilter.status) data = data.filter(function(r) { return r.Status === grFilter.status; });
    if (grFilter.supplier) {
      var s = grFilter.supplier.toLowerCase();
      data = data.filter(function(r) { return r.Supplier && r.Supplier.toLowerCase().indexOf(s) > -1; });
    }
    if (grFilter.fromDate) {
      var from = new Date(grFilter.fromDate);
      data = data.filter(function(r) {
        var d = r.ReceivedDate ? new Date(r.ReceivedDate) : r.CreatedAt ? new Date(r.CreatedAt) : null;
        return d && d >= from;
      });
    }
    if (grFilter.toDate) {
      var to = new Date(grFilter.toDate);
      to.setHours(23, 59, 59, 999);
      data = data.filter(function(r) {
        var d = r.ReceivedDate ? new Date(r.ReceivedDate) : r.CreatedAt ? new Date(r.CreatedAt) : null;
        return d && d <= to;
      });
    }
    return data;
  }

  function exportCSV() {
    var data = applyClientFilters(grData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var headers = ['GRNNo','PartCode','PartName','Quantity','UnitCost','TotalCost','Supplier','InvoiceNo','PONo','ReceivedBy','ReceivedDate','Remarks','Status','CreatedBy','CreatedAt'];
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
    a.download = 'GoodsReceipt_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('Export completed');
  }

  function exportPDF() {
    var data = applyClientFilters(grData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1F4E78;color:#fff}</style></head><body>';
    html += '<h2 style="text-align:center">Goods Receipt Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>GRN No</th><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Supplier</th><th>Invoice</th><th>Status</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.GRNNo || '') + '</td><td>' + Utils.escapeHtml(r.PartCode || '') + '</td><td>' + Utils.escapeHtml(r.PartName || '') + '</td><td>' + Utils.escapeHtml(String(r.Quantity || '')) + '</td><td>' + (r.UnitCost ? parseFloat(r.UnitCost).toFixed(2) : '0.00') + '</td><td>' + (r.TotalCost ? parseFloat(r.TotalCost).toFixed(2) : '0.00') + '</td><td>' + Utils.escapeHtml(r.Supplier || '') + '</td><td>' + Utils.escapeHtml(r.InvoiceNo || '') + '</td><td>' + Utils.escapeHtml(r.Status || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'GoodsReceipt_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('PDF export completed');
  }

  function printPage() {
    var data = applyClientFilters(grData);
    if (!data || data.length === 0) { Notify.error('No data to print'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px}th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#1F4E78;color:#fff}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h2 style="text-align:center">Goods Receipt Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>GRN No</th><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Supplier</th><th>Status</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.GRNNo || '') + '</td><td>' + Utils.escapeHtml(r.PartCode || '') + '</td><td>' + Utils.escapeHtml(r.PartName || '') + '</td><td>' + Utils.escapeHtml(String(r.Quantity || '')) + '</td><td>' + (r.UnitCost ? parseFloat(r.UnitCost).toFixed(2) : '0.00') + '</td><td>' + (r.TotalCost ? parseFloat(r.TotalCost).toFixed(2) : '0.00') + '</td><td>' + Utils.escapeHtml(r.Supplier || '') + '</td><td>' + Utils.escapeHtml(r.Status || '') + '</td></tr>';
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

        if (col.date) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateOnly(val);
        }

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
        '<button onclick="GoodsReceipt.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="GoodsReceipt.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="GoodsReceipt.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
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

  function hideViewModal() { hideModal('grViewModal'); }

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
