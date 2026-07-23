var StockHistory = (function() {
  var shData = [];
  var shPage = 1;
  var shFilter = { search: '', part: '', type: '', fromDate: '', toDate: '' };
  var shSearchDebounce = null;
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
      '<div id="shPage" class="page">' +
        '<div class="dashboard-grid" id="shSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="shTotalMovements">0</h3><p>Total Movements</p></div></div></div>' +
          '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="shGoodsReceipt">0</h3><p>Goods Receipt</p></div></div></div>' +
          '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div><div class="stat-info"><h3 id="shIssues">0</h3><p>Issues</p></div></div></div>' +
          '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="stat-info"><h3 id="shUniqueParts">0</h3><p>Unique Parts</p></div></div></div>' +
        '</div>' +

        '<div class="filter-bar" id="shFilterBar">' +
          '<div class="form-group">' +
            '<label>Search</label>' +
            '<div class="search-box">' + ICON_SEARCH +
              '<input type="text" class="form-control" id="shSearch" placeholder="Search stock history..." onkeyup="StockHistory.searchTable()">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Part</label>' +
            '<select class="form-control" id="shFilterPart"><option value="">All Parts</option></select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Type</label>' +
            '<select class="form-control" id="shFilterType">' +
              '<option value="">All Types</option>' +
              '<option value="Goods Receipt">Goods Receipt</option>' +
              '<option value="Issue">Issue</option>' +
              '<option value="Return">Return</option>' +
              '<option value="Adjustment">Adjustment</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>From</label>' +
            '<input type="date" class="form-control" id="shFilterFromDate">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>To</label>' +
            '<input type="date" class="form-control" id="shFilterToDate">' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="StockHistory.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="StockHistory.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Stock Movement History</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-secondary" onclick="StockHistory.exportCSV()">' + ICON_EXPORT + ' Export Excel</button>' +
              '<button class="btn btn-secondary" onclick="StockHistory.exportPDF()">' + ICON_PDF + ' PDF</button>' +
              '<button class="btn btn-secondary" onclick="StockHistory.print()">' + ICON_PRINT + ' Print</button>' +
              '<button class="btn btn-secondary" onclick="StockHistory.refresh()">' + ICON_REFRESH + ' Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="shTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="shViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="shViewModalTitle">Stock Movement Details</div>' +
            '<button class="modal-close" onclick="StockHistory.hideViewModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="view-grid">' +
              '<div class="view-section">' +
                '<h4>Part Info</h4>' +
                '<div class="view-row"><span>Part Code</span><strong id="shViewPartCode">-</strong></div>' +
                '<div class="view-row"><span>Part Name</span><strong id="shViewPartName">-</strong></div>' +
                '<div class="view-row"><span>Transaction Type</span><strong id="shViewType">-</strong></div>' +
                '<div class="view-row"><span>Quantity</span><strong id="shViewQty">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Balance</h4>' +
                '<div class="view-row"><span>Balance Before</span><strong id="shViewBalanceBefore">-</strong></div>' +
                '<div class="view-row"><span>Balance After</span><strong id="shViewBalanceAfter">-</strong></div>' +
                '<div class="view-row"><span>Reference No</span><strong id="shViewRefNo">-</strong></div>' +
                '<div class="view-row"><span>Created At</span><strong id="shViewCreatedAt">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section" style="grid-column:1/-1">' +
                '<h4>Remarks</h4>' +
                '<p id="shViewRemarks" style="color:var(--text);font-size:13px;line-height:1.5">-</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="StockHistory.hideViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getStockHistory', {})
      .then(function(data) {
        shData = data || [];
        Loader.hide();
        updateSummary();
        renderTable();
        loadFilterParts();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load stock history');
      });
  }

  function loadFilterParts() {
    API.post('getSpareParts', {})
      .then(function(data) {
        var parts = data || [];
        var sel = document.getElementById('shFilterPart');
        if (sel) sel.innerHTML = '<option value="">All Parts</option>';
        if (sel) parts.forEach(function(item) { sel.innerHTML += '<option value="' + Utils.escapeHtml(item.PartCode || '') + '">' + Utils.escapeHtml(item.PartName || item.PartCode || '') + '</option>'; });
      })
      .catch(function() {});
  }

  function updateSummary() {
    var total = shData.length;
    var gr = shData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'goods receipt'; }).length;
    var issue = shData.filter(function(r) { return (r.TransactionType || '').toLowerCase() === 'issue'; }).length;
    var uniqueParts = {};
    shData.forEach(function(r) { if (r.PartCode) uniqueParts[r.PartCode] = true; });
    setText('shTotalMovements', total);
    setText('shGoodsReceipt', gr);
    setText('shIssues', issue);
    setText('shUniqueParts', Object.keys(uniqueParts).length);
  }

  function renderTable() {
    var data = applyClientFilters(shData);
    renderTableLocal(data, [
      { key: 'PartCode', label: 'Part Code' },
      { key: 'PartName', label: 'Part Name' },
      { key: 'TransactionType', label: 'Type', badge: true, badgeMap: { 'Goods Receipt': 'success', 'Issue': 'warning', 'Return': 'info', 'Adjustment': 'danger' } },
      { key: 'Quantity', label: 'Qty' },
      { key: 'BalanceBefore', label: 'Before' },
      { key: 'BalanceAfter', label: 'After' },
      { key: 'ReferenceNo', label: 'Reference' },
      { key: 'CreatedAt', label: 'Date', datetime: true }
    ], [
      { label: 'View', icon: 'view', class: 'btn-primary', onclick: "StockHistory.view('{id}')", idField: 'PartCode' }
    ], shPage, PAGE_SIZE, 'shTableContainer');
    registerPageState('shTableContainer', function(p) { shPage = p; renderTable(); });
  }

  function view(id) {
    var item = shData.find(function(r) { return r.PartCode === id; });
    if (!item) { Notify.error('Record not found'); return; }
    setText('shViewPartCode', item.PartCode || '-');
    setText('shViewPartName', item.PartName || '-');
    setText('shViewType', item.TransactionType || '-');
    setText('shViewQty', item.Quantity || '0');
    setText('shViewBalanceBefore', item.BalanceBefore || '0');
    setText('shViewBalanceAfter', item.BalanceAfter || '0');
    setText('shViewRefNo', item.ReferenceNo || '-');
    setText('shViewCreatedAt', item.CreatedAt || '-');
    setText('shViewRemarks', item.Remarks || '-');
    var titleEl = document.getElementById('shViewModalTitle');
    if (titleEl) titleEl.textContent = 'Stock Movement - ' + id;
    showModal('shViewModal');
  }

  function searchTable() {
    var query = document.getElementById('shSearch').value;
    shFilter.search = query;
    if (shSearchDebounce) clearTimeout(shSearchDebounce);
    shSearchDebounce = setTimeout(function() {
      shPage = 1;
      renderTable();
    }, 300);
  }

  function applyFilter() {
    shFilter.part = document.getElementById('shFilterPart').value;
    shFilter.type = document.getElementById('shFilterType').value;
    shFilter.fromDate = document.getElementById('shFilterFromDate').value;
    shFilter.toDate = document.getElementById('shFilterToDate').value;
    shPage = 1;
    renderTable();
  }

  function clearFilter() {
    var el;
    el = document.getElementById('shFilterPart'); if (el) el.value = '';
    el = document.getElementById('shFilterType'); if (el) el.value = '';
    el = document.getElementById('shFilterFromDate'); if (el) el.value = '';
    el = document.getElementById('shFilterToDate'); if (el) el.value = '';
    el = document.getElementById('shSearch'); if (el) el.value = '';
    shFilter = { search: '', part: '', type: '', fromDate: '', toDate: '' };
    shPage = 1;
    renderTable();
  }

  function applyClientFilters(data) {
    if (shFilter.search) {
      var q = shFilter.search.toLowerCase();
      data = data.filter(function(r) {
        return (r.PartCode && r.PartCode.toLowerCase().indexOf(q) > -1) ||
               (r.PartName && r.PartName.toLowerCase().indexOf(q) > -1) ||
               (r.ReferenceNo && r.ReferenceNo.toLowerCase().indexOf(q) > -1);
      });
    }
    if (shFilter.part) data = data.filter(function(r) { return r.PartCode === shFilter.part; });
    if (shFilter.type) data = data.filter(function(r) { return (r.TransactionType || '').toLowerCase() === shFilter.type.toLowerCase(); });
    if (shFilter.fromDate) {
      var from = new Date(shFilter.fromDate);
      data = data.filter(function(r) {
        var d = r.CreatedAt ? new Date(r.CreatedAt) : null;
        return d && d >= from;
      });
    }
    if (shFilter.toDate) {
      var to = new Date(shFilter.toDate);
      to.setHours(23, 59, 59, 999);
      data = data.filter(function(r) {
        var d = r.CreatedAt ? new Date(r.CreatedAt) : null;
        return d && d <= to;
      });
    }
    return data;
  }

  function exportCSV() {
    var data = applyClientFilters(shData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var headers = ['PartCode','PartName','TransactionType','Quantity','BalanceBefore','BalanceAfter','ReferenceNo','Remarks','CreatedBy','CreatedAt'];
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
    a.download = 'StockHistory_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('Export completed');
  }

  function exportPDF() {
    var data = applyClientFilters(shData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1F4E78;color:#fff}</style></head><body>';
    html += '<h2 style="text-align:center">Stock History Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>Part Code</th><th>Part Name</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reference</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.PartCode || '') + '</td><td>' + Utils.escapeHtml(r.PartName || '') + '</td><td>' + Utils.escapeHtml(r.TransactionType || '') + '</td><td>' + Utils.escapeHtml(String(r.Quantity || '')) + '</td><td>' + Utils.escapeHtml(String(r.BalanceBefore || '')) + '</td><td>' + Utils.escapeHtml(String(r.BalanceAfter || '')) + '</td><td>' + Utils.escapeHtml(r.ReferenceNo || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'StockHistory_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('PDF export completed');
  }

  function printPage() {
    var data = applyClientFilters(shData);
    if (!data || data.length === 0) { Notify.error('No data to print'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px}th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#1F4E78;color:#fff}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h2 style="text-align:center">Stock History Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>Part Code</th><th>Part Name</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reference</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.PartCode || '') + '</td><td>' + Utils.escapeHtml(r.PartName || '') + '</td><td>' + Utils.escapeHtml(r.TransactionType || '') + '</td><td>' + Utils.escapeHtml(String(r.Quantity || '')) + '</td><td>' + Utils.escapeHtml(String(r.BalanceBefore || '')) + '</td><td>' + Utils.escapeHtml(String(r.BalanceAfter || '')) + '</td><td>' + Utils.escapeHtml(r.ReferenceNo || '') + '</td></tr>';
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
        '<button onclick="StockHistory.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="StockHistory.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="StockHistory.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
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

  function hideViewModal() { hideModal('shViewModal'); }

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
