var PMHistory = (function() {
  var pmhData = [];
  var pmhPage = 1;
  var pmhFilter = { search: '', machine: '', technician: '', status: '' };
  var pmhSearchDebounce = null;
  var pmhMachinesCache = [];
  var pmhTechsCache = [];
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
          val = '<span class="' + badgeClass + '">' + val + '</span>';
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
        '<button onclick="PMHistory.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="PMHistory.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="PMHistory.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="pmhPage" class="page">' +
        '<div class="dashboard-grid" id="pmhSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="pmhTotalCount">0</h3><p>Total Records</p></div></div></div>' +
          '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="pmhCompletedCount">0</h3><p>Completed</p></div></div></div>' +
          '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-info"><h3 id="pmhOverdueCount">0</h3><p>Overdue / Missed</p></div></div></div>' +
          '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="pmhThisMonth">0</h3><p>This Month</p></div></div></div>' +
        '</div>' +

        '<div class="filter-bar" id="pmhFilterBar">' +
          '<div class="form-group">' +
            '<label>Search</label>' +
            '<div class="search-box">' +
              ICON_SEARCH +
              '<input type="text" class="form-control" id="pmhSearch" placeholder="Search PM history..." onkeyup="PMHistory.searchTable()">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Machine</label>' +
            '<select class="form-control" id="pmhFilterMachine">' +
              '<option value="">All Machines</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Technician</label>' +
            '<select class="form-control" id="pmhFilterTechnician">' +
              '<option value="">All Technicians</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Status</label>' +
            '<select class="form-control" id="pmhFilterStatus">' +
              '<option value="">All Status</option>' +
              '<option value="Completed">Completed</option>' +
              '<option value="Overdue">Overdue</option>' +
              '<option value="Missed">Missed</option>' +
              '<option value="Scheduled">Scheduled</option>' +
              '<option value="In Progress">In Progress</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="PMHistory.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="PMHistory.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">PM History Records</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-secondary" onclick="PMHistory.exportCSV()">' + ICON_EXPORT + ' Export Excel</button>' +
              '<button class="btn btn-secondary" onclick="PMHistory.exportPDF()">' + ICON_PDF + ' PDF</button>' +
              '<button class="btn btn-secondary" onclick="PMHistory.print()">' + ICON_PRINT + ' Print</button>' +
              '<button class="btn btn-secondary" onclick="PMHistory.refresh()">' + ICON_REFRESH + ' Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="pmhTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="pmhViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="pmhViewModalTitle">PM History Details</div>' +
            '<button class="modal-close" onclick="PMHistory.hideViewModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="view-grid">' +
              '<div class="view-section">' +
                '<h4>Schedule Info</h4>' +
                '<div class="view-row"><span>PM Number</span><strong id="pmhViewPMNumber">-</strong></div>' +
                '<div class="view-row"><span>Title</span><strong id="pmhViewTitle">-</strong></div>' +
                '<div class="view-row"><span>Machine Name</span><strong id="pmhViewMachine">-</strong></div>' +
                '<div class="view-row"><span>Technician</span><strong id="pmhViewTechnician">-</strong></div>' +
                '<div class="view-row"><span>Status</span><strong id="pmhViewStatus">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Dates</h4>' +
                '<div class="view-row"><span>Completion Date</span><strong id="pmhViewCompletionDate">-</strong></div>' +
                '<div class="view-row"><span>Next Due Date</span><strong id="pmhViewNextDue">-</strong></div>' +
                '<div class="view-row"><span>Created At</span><strong id="pmhViewCreatedAt">-</strong></div>' +
                '<div class="view-row"><span>Created By</span><strong id="pmhViewCreatedBy">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section" style="grid-column:1/-1">' +
                '<h4>Remarks</h4>' +
                '<p id="pmhViewRemarks" style="color:var(--text);font-size:13px;line-height:1.5">-</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="PMHistory.hideViewModal()">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getPMHistory', {})
      .then(function(data) {
        pmhData = data || [];
        Loader.hide();
        updateSummary();
        renderTable();
        loadFilterSelects();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load PM history');
      });
  }

  function loadFilterSelects() {
    API.post('getMachines', {})
      .then(function(m) {
        pmhMachinesCache = m || [];
        var sel = document.getElementById('pmhFilterMachine');
        if (sel) sel.innerHTML = '<option value="">All Machines</option>';
        if (sel) m.forEach(function(item) { sel.innerHTML += '<option value="' + (item.MachineID || item.id) + '">' + (item.MachineName || item.name) + '</option>'; });
      })
      .catch(function() {});
    API.post('getTechnicians', {})
      .then(function(t) {
        pmhTechsCache = t || [];
        var sel = document.getElementById('pmhFilterTechnician');
        if (sel) sel.innerHTML = '<option value="">All Technicians</option>';
        if (sel) t.forEach(function(item) { sel.innerHTML += '<option value="' + (item.EmployeeID || item.id) + '">' + (item.TechnicianName || item.name) + '</option>'; });
      })
      .catch(function() {});
  }

  function updateSummary() {
    var total = pmhData.length;
    var completed = pmhData.filter(function(r) { return r.Status === 'Completed'; }).length;
    var overdue = pmhData.filter(function(r) { return r.Status === 'Overdue' || r.Status === 'Missed'; }).length;
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    var thisMonth = pmhData.filter(function(r) {
      var d = r.CompletionDate ? new Date(r.CompletionDate) : null;
      return d && d >= monthStart && d <= monthEnd;
    }).length;
    setText('pmhTotalCount', total);
    setText('pmhCompletedCount', completed);
    setText('pmhOverdueCount', overdue);
    setText('pmhThisMonth', thisMonth);
  }

  function renderTable() {
    var data = applyClientFilters(pmhData);
    renderTableLocal(data, [
      { key: 'PMNumber', label: 'PM No' },
      { key: 'Title', label: 'Title' },
      { key: 'MachineName', label: 'Machine' },
      { key: 'CompletionDate', label: 'Completed', date: true },
      { key: 'NextDueDate', label: 'Next Due', date: true },
      { key: 'TechnicianName', label: 'Technician' },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Scheduled': 'primary', 'Overdue': 'danger', 'In Progress': 'info', 'Missed': 'danger' } },
      { key: 'Remarks', label: 'Remarks' }
    ], [
      { label: 'View', icon: 'view', class: 'btn-primary', onclick: "PMHistory.view('{id}')", idField: 'PMNumber' }
    ], pmhPage, PAGE_SIZE, 'pmhTableContainer');
    registerPageState('pmhTableContainer', function(p) { pmhPage = p; renderTable(); });
  }

  function view(id) {
    var item = pmhData.find(function(r) { return r.PMNumber === id; });
    if (!item) { Notify.error('Record not found'); return; }
    setText('pmhViewPMNumber', item.PMNumber || '-');
    setText('pmhViewTitle', item.Title || '-');
    setText('pmhViewMachine', item.MachineName || '-');
    setText('pmhViewTechnician', item.TechnicianName || item.AssignedTechnicianName || '-');
    setText('pmhViewStatus', item.Status || '-');
    setText('pmhViewCompletionDate', item.CompletionDate || '-');
    setText('pmhViewNextDue', item.NextDueDate || '-');
    setText('pmhViewCreatedAt', item.CreatedAt || '-');
    setText('pmhViewCreatedBy', item.CreatedBy || '-');
    setText('pmhViewRemarks', item.Remarks || '-');
    var titleEl = document.getElementById('pmhViewModalTitle');
    if (titleEl) titleEl.textContent = 'PM History - ' + id;
    showModal('pmhViewModal');
  }

  function searchTable() {
    var query = document.getElementById('pmhSearch').value;
    pmhFilter.search = query;
    if (pmhSearchDebounce) clearTimeout(pmhSearchDebounce);
    pmhSearchDebounce = setTimeout(function() {
      pmhPage = 1;
      renderTable();
    }, 300);
  }

  function applyFilter() {
    pmhFilter.machine = document.getElementById('pmhFilterMachine').value;
    pmhFilter.technician = document.getElementById('pmhFilterTechnician').value;
    pmhFilter.status = document.getElementById('pmhFilterStatus').value;
    pmhPage = 1;
    renderTable();
  }

  function clearFilter() {
    var el;
    el = document.getElementById('pmhFilterMachine'); if (el) el.value = '';
    el = document.getElementById('pmhFilterTechnician'); if (el) el.value = '';
    el = document.getElementById('pmhFilterStatus'); if (el) el.value = '';
    el = document.getElementById('pmhSearch'); if (el) el.value = '';
    pmhFilter = { search: '', machine: '', technician: '', status: '' };
    pmhPage = 1;
    renderTable();
  }

  function applyClientFilters(data) {
    if (pmhFilter.search) {
      var q = pmhFilter.search.toLowerCase();
      data = data.filter(function(r) {
        return (r.PMNumber && r.PMNumber.toLowerCase().indexOf(q) > -1) ||
               (r.Title && r.Title.toLowerCase().indexOf(q) > -1) ||
               (r.MachineName && r.MachineName.toLowerCase().indexOf(q) > -1) ||
               (r.TechnicianName && r.TechnicianName.toLowerCase().indexOf(q) > -1);
      });
    }
    if (pmhFilter.machine) {
      data = data.filter(function(r) { return r.MachineName === pmhFilter.machine || r.MachineID === pmhFilter.machine; });
    }
    if (pmhFilter.technician) {
      data = data.filter(function(r) { return r.TechnicianName === pmhFilter.technician || r.AssignedTechnician === pmhFilter.technician; });
    }
    if (pmhFilter.status) {
      data = data.filter(function(r) { return r.Status === pmhFilter.status; });
    }
    return data;
  }

  function exportCSV() {
    var data = applyClientFilters(pmhData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var headers = ['PMNumber','Title','MachineName','CompletionDate','NextDueDate','TechnicianName','Status','Remarks','CreatedBy','CreatedAt'];
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
    a.download = 'PMHistory_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('Export completed');
  }

  function exportPDF() {
    var data = applyClientFilters(pmhData);
    if (!data || data.length === 0) { Notify.error('No data to export'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1F4E78;color:#fff}</style></head><body>';
    html += '<h2 style="text-align:center">PM History Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>PM No</th><th>Title</th><th>Machine</th><th>Completed</th><th>Technician</th><th>Status</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.PMNumber || '') + '</td><td>' + Utils.escapeHtml(r.Title || '') + '</td><td>' + Utils.escapeHtml(r.MachineName || '') + '</td><td>' + Utils.escapeHtml(r.CompletionDate || '') + '</td><td>' + Utils.escapeHtml(r.TechnicianName || '') + '</td><td>' + Utils.escapeHtml(r.Status || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'PMHistory_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('PDF export completed');
  }

  function printPage() {
    var data = applyClientFilters(pmhData);
    if (!data || data.length === 0) { Notify.error('No data to print'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px}th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#1F4E78;color:#fff}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h2 style="text-align:center">PM History Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>PM No</th><th>Title</th><th>Machine</th><th>Completed</th><th>Technician</th><th>Status</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.PMNumber || '') + '</td><td>' + Utils.escapeHtml(r.Title || '') + '</td><td>' + Utils.escapeHtml(r.MachineName || '') + '</td><td>' + Utils.escapeHtml(r.CompletionDate || '') + '</td><td>' + Utils.escapeHtml(r.TechnicianName || '') + '</td><td>' + Utils.escapeHtml(r.Status || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var w = window.open('', '', 'width=800,height=600');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  function hideViewModal() { hideModal('pmhViewModal'); }

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
