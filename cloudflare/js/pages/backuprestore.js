var BackupRestore = (function() {
  var brHistory = [];
  var brStatus = {};
  var brSheets = [];
  var brPage = 1;
  var brSearchDebounce = null;
  var brSearchQuery = '';
  var brImportData = null;
  var PAGE_SIZE = 25;
  var __pageStates = {};

  var ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var ICON_BOOKMARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  var ICON_ACTIVITY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  var ICON_DOWNLOAD = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>';
  var ICON_UPLOAD = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 18V6"/><path d="M6 10l4-4 4 4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>';
  var ICON_REFRESH = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>';
  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var ICON_TRASH = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M5 5h10"/><path d="M8 5V3h4v2"/><path d="M6 5v10a1 1 0 001 1h6a1 1 0 001-1V5"/></svg>';
  var ICON_RESTORE = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>';

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var style = document.createElement('style');
    style.textContent =
      '.br-status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}' +
      '.br-stat-card{display:flex;align-items:center;gap:16px;padding:20px;background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius-md)}' +
      '.br-stat-icon{width:48px;height:48px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.br-stat-icon-primary{background:rgba(var(--primary-rgb,99,102,241),0.1);color:var(--primary)}' +
      '.br-stat-icon-success{background:rgba(var(--success-rgb,34,197,94),0.1);color:var(--success)}' +
      '.br-stat-icon-warning{background:rgba(var(--warning-rgb,245,158,11),0.1);color:var(--warning)}' +
      '.br-stat-icon-info{background:rgba(99,102,241,0.1);color:#6366f1}' +
      '.br-stat-info h3{font-size:24px;font-weight:700;margin:0;color:var(--text)}' +
      '.br-stat-info p{font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0 0;color:var(--text-muted);font-weight:600}' +
      '.br-actions-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}' +
      '@media(max-width:1024px){.br-status-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:640px){.br-status-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

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

  function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function formatDateTimeLocal(date) {
    if (!date) return '-';
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
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

  function formatDateShort(date) {
    if (!date) return '-';
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return day + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  function renderPage(el) {
    injectStyles();
    var target = el || document.getElementById('pageContent');
    if (!target) return;

    target.innerHTML =
      '<div id="brPage" class="page">' +
        '<div class="page-title-row">' +
          '<div>' +
            '<h2>Backup & Restore</h2>' +
            '<p style="color:var(--text-muted);margin:4px 0 0;font-size:14px">Backup, restore, and manage your CMMS data</p>' +
          '</div>' +
          '<div class="page-actions">' +
            '<button class="btn btn-secondary" onclick="BackupRestore.refresh()">' + ICON_REFRESH + ' Refresh</button>' +
          '</div>' +
        '</div>' +

        '<div class="br-status-grid" id="brStatusGrid">' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-primary">' + ICON_BOOKMARK + '</div>' +
            '<div class="br-stat-info"><h3 id="brTotalBackups">0</h3><p>Total Backups</p></div>' +
          '</div>' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-success">' + ICON_CHECK + '</div>' +
            '<div class="br-stat-info"><h3 id="brLastBackup">-</h3><p>Last Backup</p></div>' +
          '</div>' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-warning">' + ICON_INFO + '</div>' +
            '<div class="br-stat-info"><h3 id="brSheetsProtected">0</h3><p>Sheets Protected</p></div>' +
          '</div>' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-info">' + ICON_ACTIVITY + '</div>' +
            '<div class="br-stat-info"><h3 id="brSchedule">-</h3><p>Auto Backup</p></div>' +
          '</div>' +
        '</div>' +

        '<div class="br-actions-row">' +
          '<button class="btn btn-success" onclick="BackupRestore.openCreateModal()">' + ICON_BOOKMARK + ' Create Backup</button>' +
          '<button class="btn btn-primary" id="brExportBtn" disabled onclick="BackupRestore.exportBackup()">' + ICON_DOWNLOAD + ' Export Backup</button>' +
          '<button class="btn btn-warning" onclick="BackupRestore.openImportModal()">' + ICON_UPLOAD + ' Import Backup</button>' +
          '<button class="btn btn-danger" id="brRestoreBtn" disabled onclick="BackupRestore.openRestoreModal()">' + ICON_RESTORE + ' Restore Backup</button>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">' + ICON_CLOCK + ' Backup History</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' + ICON_SEARCH +
                '<input type="text" class="form-control" id="brSearch" placeholder="Search backups..." onkeyup="BackupRestore.searchTable()" style="width:250px">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="brTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="brCreateModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Create Backup</div>' +
            '<button class="modal-close" onclick="BackupRestore.hideCreateModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="form-group">' +
              '<label>Backup Label (optional)</label>' +
              '<input type="text" class="form-control" id="brBackupLabel" placeholder="Enter a label for this backup" maxlength="100">' +
            '</div>' +
            '<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-top:12px">' +
              '<p style="color:var(--text-muted);font-size:13px;margin:0 0 8px">The following sheets will be backed up:</p>' +
              '<div id="brSheetsList" style="color:var(--text);font-size:13px;line-height:1.8"></div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="BackupRestore.hideCreateModal()">Cancel</button>' +
            '<button class="btn btn-success" id="brCreateConfirmBtn" onclick="BackupRestore.confirmCreate()">' + ICON_BOOKMARK + ' Create Backup</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="brRestoreModal" style="display:none">' +
        '<div class="modal" style="max-width:500px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Restore Backup</div>' +
            '<button class="modal-close" onclick="BackupRestore.hideRestoreModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-sm);padding:12px;margin-bottom:16px">' +
              '<p style="color:var(--danger);font-size:13px;margin:0;font-weight:500">Warning: Restoring a backup will overwrite all current data in your sheets. This action cannot be undone.</p>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Select Backup to Restore</label>' +
              '<select class="form-control" id="brRestoreSelect">' +
                '<option value="">Select a backup...</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="BackupRestore.hideRestoreModal()">Cancel</button>' +
            '<button class="btn btn-danger" id="brRestoreConfirmBtn" onclick="BackupRestore.confirmRestore()">' + ICON_RESTORE + ' Restore</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="brImportModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Import Backup</div>' +
            '<button class="modal-close" onclick="BackupRestore.hideImportModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-sm);padding:12px;margin-bottom:16px">' +
              '<p style="color:var(--danger);font-size:13px;margin:0;font-weight:500">Warning: Importing a backup may overwrite existing data. Ensure you are importing the correct backup file.</p>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Select Backup File (.json)</label>' +
              '<input type="file" class="form-control" id="brImportFile" accept=".json" onchange="BackupRestore.handleImportFile(event)">' +
            '</div>' +
            '<div id="brImportPreview" style="margin-top:12px"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="BackupRestore.hideImportModal()">Cancel</button>' +
            '<button class="btn btn-warning" id="brImportConfirmBtn" disabled onclick="BackupRestore.confirmImport()">' + ICON_UPLOAD + ' Import</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadAllData();
  }

  function loadAllData() {
    Loader.show();
    Promise.all([
      API.post('getBackupHistory', {}),
      API.post('getBackupStatus', {})
    ])
      .then(function(results) {
        brHistory = results[0] || [];
        brStatus = results[1] || {};
        Loader.hide();
        updateStatus();
        updateButtons();
        renderTable();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load backup data');
      });
  }

  function updateStatus() {
    setText('brTotalBackups', brStatus.totalBackups !== undefined ? brStatus.totalBackups : brHistory.length);
    setText('brLastBackup', brStatus.lastBackup ? formatDateShort(brStatus.lastBackup) : '-');
    setText('brSheetsProtected', brStatus.protectedSheets || '0');
    setText('brSchedule', brStatus.schedule || 'Disabled');
  }

  function updateButtons() {
    var exportBtn = document.getElementById('brExportBtn');
    var restoreBtn = document.getElementById('brRestoreBtn');
    var hasBackups = brHistory.length > 0;
    if (exportBtn) exportBtn.disabled = !hasBackups;
    if (restoreBtn) restoreBtn.disabled = !hasBackups;
  }

  function getFilteredHistory() {
    var data = brHistory;
    if (brSearchQuery) {
      var q = brSearchQuery.toLowerCase();
      data = data.filter(function(r) {
        return (r.BackupID && r.BackupID.toLowerCase().indexOf(q) > -1) ||
               (r.CreatedBy && r.CreatedBy.toLowerCase().indexOf(q) > -1) ||
               (r.BackupType && r.BackupType.toLowerCase().indexOf(q) > -1) ||
               (r.Status && r.Status.toLowerCase().indexOf(q) > -1) ||
               (r.Label && r.Label.toLowerCase().indexOf(q) > -1);
      });
    }
    return data;
  }

  function renderTable() {
    var data = getFilteredHistory();
    var container = document.getElementById('brTableContainer');
    if (!container) return;
    var page = brPage;
    var pageSize = PAGE_SIZE;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:48px;height:48px"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Backups Found</h3>' +
          '<p>No backup records available. Create your first backup to get started.</p>' +
        '</div>';
      return;
    }

    var totalPages = Math.ceil(data.length / pageSize);
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, data.length);
    var pageData = data.slice(start, end);

    var html = '<div class="table-container"><table><thead><tr>' +
      '<th>Backup ID</th>' +
      '<th>Date</th>' +
      '<th>Created By</th>' +
      '<th>Type</th>' +
      '<th>Status</th>' +
      '<th>Size</th>' +
      '<th style="width:160px">Actions</th>' +
      '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      var statusClass = 'badge badge-primary';
      var status = (row.Status || '').toLowerCase();
      if (status === 'completed') statusClass = 'badge badge-success';
      else if (status === 'active') statusClass = 'badge badge-info';
      else if (status === 'failed') statusClass = 'badge badge-danger';

      var backupId = row.BackupID || '';
      var label = row.Label ? ' (' + Utils.escapeHtml(row.Label) + ')' : '';

      html += '<tr>' +
        '<td><strong>' + Utils.escapeHtml(backupId) + '</strong>' + label + '</td>' +
        '<td>' + formatDateTimeLocal(row.DateTime) + '</td>' +
        '<td>' + Utils.escapeHtml(row.CreatedBy || '-') + '</td>' +
        '<td>' + Utils.escapeHtml(row.BackupType || '-') + '</td>' +
        '<td><span class="' + statusClass + '">' + Utils.escapeHtml(row.Status || '-') + '</span></td>' +
        '<td>' + Utils.escapeHtml(row.Size || '-') + '</td>' +
        '<td><div class="actions-cell">' +
          '<button class="btn btn-sm btn-primary" onclick="BackupRestore.downloadBackup(\'' + Utils.escapeHtml(backupId) + '\')" title="Download">' + ICON_DOWNLOAD + '</button>' +
          '<button class="btn btn-sm btn-warning" onclick="BackupRestore.restoreFromRow(\'' + Utils.escapeHtml(backupId) + '\')" title="Restore">' + ICON_RESTORE + '</button>' +
          '<button class="btn btn-sm btn-danger" onclick="BackupRestore.deleteBackup(\'' + Utils.escapeHtml(backupId) + '\')" title="Delete">' + ICON_TRASH + '</button>' +
        '</div></td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="BackupRestore.changePage(\'brTableContainer\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="BackupRestore.changePage(\'brTableContainer\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="BackupRestore.changePage(\'brTableContainer\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
    registerPageState('brTableContainer', function(p) { brPage = p; renderTable(); });
  }

  function searchTable() {
    var query = document.getElementById('brSearch');
    if (!query) return;
    brSearchQuery = query.value;
    if (brSearchDebounce) clearTimeout(brSearchDebounce);
    brSearchDebounce = setTimeout(function() {
      brPage = 1;
      renderTable();
    }, 300);
  }

  function refresh() {
    brSearchQuery = '';
    var searchEl = document.getElementById('brSearch');
    if (searchEl) searchEl.value = '';
    brPage = 1;
    loadAllData();
  }

  function openCreateModal() {
    setText('brBackupLabel', '');
    var labelEl = document.getElementById('brBackupLabel');
    if (labelEl) labelEl.value = '';
    var sheetsList = document.getElementById('brSheetsList');
    if (sheetsList) sheetsList.innerHTML = '<span style="color:var(--text-muted)">Loading sheets...</span>';
    showModal('brCreateModal');
    API.post('getBackupSheetsList', {})
      .then(function(data) {
        brSheets = data || [];
        var html = '';
        brSheets.forEach(function(name) {
          html += '<div style="padding:4px 0;display:flex;align-items:center;gap:8px">' +
            '<span style="color:var(--success)">&#10003;</span>' +
            '<span>' + Utils.escapeHtml(name) + '</span>' +
          '</div>';
        });
        if (brSheets.length === 0) html = '<span style="color:var(--text-muted)">No sheets found</span>';
        setHTML('brSheetsList', html);
      })
      .catch(function() {
        setHTML('brSheetsList', '<span style="color:var(--danger)">Failed to load sheets list</span>');
      });
  }

  function hideCreateModal() {
    hideModal('brCreateModal');
  }

  function confirmCreate() {
    var labelEl = document.getElementById('brBackupLabel');
    var label = labelEl ? labelEl.value.trim() : '';
    var confirmBtn = document.getElementById('brCreateConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    Loader.show();
    API.post('createBackup', { label: label })
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModal('brCreateModal');
          Notify.success(result.message || 'Backup created successfully');
          refresh();
        } else {
          Notify.error((result && result.message) || 'Failed to create backup');
        }
        if (confirmBtn) confirmBtn.disabled = false;
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error((err && err.message) || 'Failed to create backup');
        if (confirmBtn) confirmBtn.disabled = false;
      });
  }

  function openRestoreModal() {
    var sel = document.getElementById('brRestoreSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Select a backup...</option>';
      brHistory.forEach(function(b) {
        if ((b.Status || '').toLowerCase() === 'completed') {
          sel.innerHTML += '<option value="' + Utils.escapeHtml(b.BackupID) + '">' +
            Utils.escapeHtml(b.BackupID) +
            (b.Label ? ' (' + Utils.escapeHtml(b.Label) + ')' : '') +
            ' - ' + formatDateTimeLocal(b.DateTime) +
          '</option>';
        }
      });
    }
    showModal('brRestoreModal');
  }

  function hideRestoreModal() {
    hideModal('brRestoreModal');
  }

  function restoreFromRow(backupId) {
    var sel = document.getElementById('brRestoreSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Select a backup...</option>';
      brHistory.forEach(function(b) {
        if ((b.Status || '').toLowerCase() === 'completed') {
          var opt = '<option value="' + Utils.escapeHtml(b.BackupID) + '"';
          if (b.BackupID === backupId) opt += ' selected';
          opt += '>' + Utils.escapeHtml(b.BackupID) +
            (b.Label ? ' (' + Utils.escapeHtml(b.Label) + ')' : '') +
            ' - ' + formatDateTimeLocal(b.DateTime) +
          '</option>';
          sel.innerHTML += opt;
        }
      });
    }
    showModal('brRestoreModal');
  }

  function confirmRestore() {
    var sel = document.getElementById('brRestoreSelect');
    var backupId = sel ? sel.value : '';
    if (!backupId) {
      Notify.warning('Please select a backup to restore');
      return;
    }
    var confirmBtn = document.getElementById('brRestoreConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    Loader.show();
    API.post('restoreBackup', { backupId: backupId })
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModal('brRestoreModal');
          Notify.success(result.message || 'Backup restored successfully');
          refresh();
        } else {
          Notify.error((result && result.message) || 'Failed to restore backup');
        }
        if (confirmBtn) confirmBtn.disabled = false;
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error((err && err.message) || 'Failed to restore backup');
        if (confirmBtn) confirmBtn.disabled = false;
      });
  }

  function downloadBackup(backupId) {
    if (!backupId) { Notify.error('Invalid backup ID'); return; }
    Loader.show();
    API.post('exportBackup', { backupId: backupId })
      .then(function(data) {
        Loader.hide();
        var jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = backupId + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Notify.success('Backup exported successfully');
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error((err && err.message) || 'Failed to export backup');
      });
  }

  function exportBackup() {
    if (!brHistory || brHistory.length === 0) {
      Notify.warning('No backups available to export');
      return;
    }
    var latest = brHistory[0];
    downloadBackup(latest.BackupID);
  }

  function openImportModal() {
    brImportData = null;
    var fileEl = document.getElementById('brImportFile');
    if (fileEl) fileEl.value = '';
    setHTML('brImportPreview', '');
    var confirmBtn = document.getElementById('brImportConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    showModal('brImportModal');
  }

  function hideImportModal() {
    hideModal('brImportModal');
    brImportData = null;
  }

  function handleImportFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      Notify.warning('Please select a .json file');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parsed = JSON.parse(e.target.result);
        brImportData = e.target.result;
        var sheets = parsed.sheets || parsed.data || {};
        var sheetNames = Object.keys(sheets);
        var recordCount = 0;
        sheetNames.forEach(function(name) {
          var arr = sheets[name];
          if (Array.isArray(arr)) recordCount += arr.length;
        });
        var html = '<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">' +
          '<h4 style="margin:0 0 8px;font-size:14px;color:var(--text)">Import Preview</h4>' +
          '<div style="font-size:13px;color:var(--text-muted);line-height:1.8">' +
            '<div>Backup ID: <strong style="color:var(--text)">' + Utils.escapeHtml(parsed.backupId || parsed.BackupID || '-') + '</strong></div>' +
            '<div>Label: <strong style="color:var(--text)">' + Utils.escapeHtml(parsed.label || parsed.Label || '-') + '</strong></div>' +
            '<div>Sheets: <strong style="color:var(--text)">' + sheetNames.length + '</strong></div>' +
            '<div>Total Records: <strong style="color:var(--text)">' + recordCount + '</strong></div>' +
          '</div>' +
        '</div>';
        setHTML('brImportPreview', html);
        var confirmBtn = document.getElementById('brImportConfirmBtn');
        if (confirmBtn) confirmBtn.disabled = false;
      } catch (ex) {
        Notify.error('Invalid JSON file');
        brImportData = null;
        setHTML('brImportPreview', '<div style="color:var(--danger);font-size:13px;padding:8px">Invalid JSON format. Please check the file.</div>');
        var confirmBtn = document.getElementById('brImportConfirmBtn');
        if (confirmBtn) confirmBtn.disabled = true;
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!brImportData) {
      Notify.warning('Please select a valid backup file');
      return;
    }
    var confirmBtn = document.getElementById('brImportConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    Loader.show();
    API.post('importBackup', { data: brImportData })
      .then(function(result) {
        Loader.hide();
        if (result && result.success) {
          hideModal('brImportModal');
          Notify.success(result.message || 'Backup imported successfully');
          refresh();
        } else {
          Notify.error((result && result.message) || 'Failed to import backup');
        }
        if (confirmBtn) confirmBtn.disabled = false;
      })
      .catch(function(err) {
        Loader.hide();
        Notify.error((err && err.message) || 'Failed to import backup');
        if (confirmBtn) confirmBtn.disabled = false;
      });
  }

  function deleteBackup(backupId) {
    if (!backupId) { Notify.error('Invalid backup ID'); return; }
    Modal.confirm('Delete Backup', 'Are you sure you want to delete backup "' + backupId + '"? This action cannot be undone.', function() {
      Loader.show();
      API.post('deleteBackup', { backupId: backupId })
        .then(function(result) {
          Loader.hide();
          if (result && result.success) {
            Notify.success(result.message || 'Backup deleted successfully');
            refresh();
          } else {
            Notify.error((result && result.message) || 'Failed to delete backup');
          }
        })
        .catch(function(err) {
          Loader.hide();
          Notify.error((err && err.message) || 'Failed to delete backup');
        });
    });
  }

  return {
    show: renderPage,
    refresh: refresh,
    searchTable: searchTable,
    changePage: changePage,
    openCreateModal: openCreateModal,
    hideCreateModal: hideCreateModal,
    confirmCreate: confirmCreate,
    openRestoreModal: openRestoreModal,
    hideRestoreModal: hideRestoreModal,
    restoreFromRow: restoreFromRow,
    confirmRestore: confirmRestore,
    downloadBackup: downloadBackup,
    exportBackup: exportBackup,
    openImportModal: openImportModal,
    hideImportModal: hideImportModal,
    handleImportFile: handleImportFile,
    confirmImport: confirmImport,
    deleteBackup: deleteBackup
  };
})();
