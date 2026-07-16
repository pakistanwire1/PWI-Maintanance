/* ============================================================
   backup.js — Backup & Restore Page Module
   Cloudflare Pages Frontend — matches GAS BackupRestorePage.html
   ============================================================ */
(function() {
  var _data = [];
  var _page = 1;
  var _importData = null;

  App.registerPage('backup', render, load);

  function render() {
    var el = document.getElementById('page-backup');
    el.innerHTML =
      '<div id="backupPage">' +
        '<div class="page-header">' +
          '<div class="page-title-row">' +
            '<h1 class="page-title">Backup & Restore</h1>' +
            '<div class="page-actions">' +
              '<button class="btn btn-outline" onclick="brRefresh()">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>' +
                ' Refresh' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<p class="page-subtitle">Backup, restore, and manage your CMMS data</p>' +
        '</div>' +
        '<div class="br-status-grid">' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-primary">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>' +
            '</div>' +
            '<div class="br-stat-info"><h3 id="brTotalBackups">0</h3><p>Total Backups</p></div>' +
          '</div>' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-success">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</div>' +
            '<div class="br-stat-info"><h3 id="brLastBackup">Never</h3><p>Last Backup</p></div>' +
          '</div>' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-warning">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
            '</div>' +
            '<div class="br-stat-info"><h3 id="brSheetsProtected">0</h3><p>Sheets Protected</p></div>' +
          '</div>' +
          '<div class="br-stat-card">' +
            '<div class="br-stat-icon br-stat-icon-info">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
            '</div>' +
            '<div class="br-stat-info"><h3 id="brSchedule">Disabled</h3><p>Auto Backup</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="br-actions-row">' +
          '<button class="btn btn-success" onclick="brCreateBackup()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>' +
            ' Create Backup' +
          '</button>' +
          '<button class="btn btn-primary" onclick="brExportBackup()" id="brExportBtn" disabled>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            ' Export Backup' +
          '</button>' +
          '<button class="btn btn-warning" onclick="brImportBackup()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
            ' Import Backup' +
          '</button>' +
          '<button class="btn btn-danger" onclick="brRestoreBackup()" id="brRestoreBtn" disabled>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>' +
            ' Restore Backup' +
          '</button>' +
        '</div>' +
        '<div class="card" style="margin-top:20px">' +
          '<div class="card-header">' +
            '<div class="card-title">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
              ' Backup History' +
            '</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="form-control" id="brSearch" placeholder="Search backups..." onkeyup="brSearchHistory()">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="brTableContainer"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="brCreateModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Create Backup</div>' +
            '<button class="modal-close" onclick="hideModal(\'brCreateModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="form-group">' +
              '<label>Backup Label (optional)</label>' +
              '<input type="text" class="form-control" id="brBackupLabel" placeholder="e.g. Before monthly maintenance" maxlength="100">' +
            '</div>' +
            '<p style="color:var(--text-muted);font-size:12px;margin-top:8px">' +
              'A full backup will be created of all CMMS modules including Users, Job Cards, PM, Inventory, Assets, and all system data.' +
              '<br><br>' +
              '<strong>Sheets to be backed up:</strong>' +
            '</p>' +
            '<div id="brSheetsList" style="font-size:12px;color:var(--text-muted);max-height:200px;overflow-y:auto;background:var(--bg);border-radius:6px;padding:8px;margin-top:4px"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="hideModal(\'brCreateModal\')">Cancel</button>' +
            '<button type="button" class="btn btn-success" id="brConfirmCreateBtn" onclick="brConfirmCreate()">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>' +
              ' Create Backup' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="brRestoreModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Restore Backup</div>' +
            '<button class="modal-close" onclick="hideModal(\'brRestoreModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<p style="color:var(--danger);font-size:13px;font-weight:600">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="vertical-align:middle;margin-right:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
              ' Warning: This will overwrite all current data in the restored sheets.' +
            '</p>' +
            '<p style="color:var(--text-muted);font-size:12px;margin-top:8px">' +
              'Select a backup to restore. Only Administrators can perform this action.' +
            '</p>' +
            '<div class="form-group" style="margin-top:12px">' +
              '<label>Select Backup</label>' +
              '<select class="form-control" id="brRestoreSelect"></select>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="hideModal(\'brRestoreModal\')">Cancel</button>' +
            '<button type="button" class="btn btn-danger" id="brConfirmRestoreBtn" onclick="brConfirmRestore()">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>' +
              ' Restore' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="brImportModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Import Backup</div>' +
            '<button class="modal-close" onclick="hideModal(\'brImportModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<p style="color:var(--danger);font-size:13px;font-weight:600">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="vertical-align:middle;margin-right:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
              ' Warning: This will overwrite all current data in the imported sheets.' +
            '</p>' +
            '<p style="color:var(--text-muted);font-size:12px;margin-top:8px">' +
              'Upload a previously exported backup JSON file.' +
            '</p>' +
            '<div class="form-group" style="margin-top:12px">' +
              '<label>Backup File (.json)</label>' +
              '<input type="file" accept=".json" class="form-control" id="brImportFile" onchange="brHandleImportFile(event)">' +
            '</div>' +
            '<div id="brImportPreview" style="display:none;margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px"></div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" onclick="hideModal(\'brImportModal\')">Cancel</button>' +
            '<button type="button" class="btn btn-warning" id="brConfirmImportBtn" onclick="brConfirmImport()" disabled>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
              ' Import' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<style>' +
        '.br-status-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px}' +
        '.br-stat-card{display:flex;align-items:center;gap:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px}' +
        '.br-stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
        '.br-stat-icon-primary{background:rgba(59,130,246,0.12);color:var(--primary)}' +
        '.br-stat-icon-success{background:rgba(34,197,94,0.12);color:var(--success)}' +
        '.br-stat-icon-warning{background:rgba(234,179,8,0.12);color:var(--warning)}' +
        '.br-stat-icon-info{background:rgba(99,102,241,0.12);color:#6366f1}' +
        '.br-stat-info h3{font-size:24px;font-weight:700;margin:0;color:var(--text)}' +
        '.br-stat-info p{font-size:12px;color:var(--text-muted);margin:2px 0 0 0;text-transform:uppercase;letter-spacing:0.3px}' +
        '.br-actions-row{display:flex;gap:12px;flex-wrap:wrap}' +
        '.br-actions-row .btn{display:flex;align-items:center;gap:8px;padding:10px 20px;font-weight:600}' +
      '</style>';
  }

  function load() {
    App.showLoading(true);
    API.call('getBackupHistory')
      .then(function(history) {
        _data = history || [];
        App.showLoading(false);
        API.call('getBackupHistory')
          .then(function(status) {
            updateBrStatus(status);
          })
          .catch(function() {});
        renderBrTable();
      })
      .catch(function(e) {
        App.showLoading(false);
        App.showToast('Failed to load backup data', 'error');
      });
  }

  function updateBrStatus(status) {
    if (!status) return;
    var el;
    el = document.getElementById('brTotalBackups'); if (el) el.textContent = status.totalBackups || 0;
    el = document.getElementById('brLastBackup'); if (el) el.textContent = status.lastBackup ? App.formatDateTime(status.lastBackup.DateTime) : 'Never';
    el = document.getElementById('brSheetsProtected'); if (el) el.textContent = status.protectedSheets || 0;
    el = document.getElementById('brSchedule'); if (el) el.textContent = status.schedule || 'Disabled';
  }

  function renderBrTable() {
    var searchEl = document.getElementById('brSearch');
    var q = searchEl ? searchEl.value.toLowerCase() : '';
    var list = _data;
    if (q) {
      list = list.filter(function(r) {
        return (r.BackupID && r.BackupID.toLowerCase().indexOf(q) !== -1) ||
               (r.CreatedBy && r.CreatedBy.toLowerCase().indexOf(q) !== -1) ||
               (r.Label && r.Label.toLowerCase().indexOf(q) !== -1);
      });
    }
    var hasSelection = list.length > 0;

    var exportBtn = document.getElementById('brExportBtn'); if (exportBtn) exportBtn.disabled = !hasSelection;
    var restoreBtn = document.getElementById('brRestoreBtn'); if (restoreBtn) restoreBtn.disabled = !hasSelection;

    renderTable(list, [
      { key: 'BackupID', label: 'Backup ID' },
      { key: 'DateTime', label: 'Date', datetime: true },
      { key: 'CreatedBy', label: 'Created By' },
      { key: 'BackupType', label: 'Type' },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Active': 'info', 'Failed': 'danger' } },
      { key: 'Size', label: 'Size' }
    ], [
      { label: 'Download', icon: 'download', color: 'primary', onclick: "brDownloadBackup('{id}')", idField: 'BackupID' },
      { label: 'Restore', icon: 'view', color: 'warning', onclick: "brSelectRestore('{id}')", idField: 'BackupID' },
      { label: 'Delete', icon: 'trash', color: 'danger', onclick: "brDeleteBackup('{id}')", idField: 'BackupID' }
    ], _page, PAGE_SIZE, 'brTableContainer');
    registerPageState('brTableContainer', function(p) { _page = p; renderBrTable(); });
  }

  window.brRefresh = function() {
    App.showLoading(true);
    API.call('getBackupHistory')
      .then(function(history) {
        _data = history || [];
        API.call('getBackupHistory')
          .then(function(status) {
            App.showLoading(false);
            updateBrStatus(status);
            renderBrTable();
          })
          .catch(function() {
            App.showLoading(false);
            renderBrTable();
          });
      })
      .catch(function(e) {
        App.showLoading(false);
        App.showToast('Failed to refresh', 'error');
      });
  };

  window.brSearchHistory = function() {
    _page = 1;
    renderBrTable();
  };

  window.brCreateBackup = function() {
    App.showLoading(true);
    API.call('getBackupSheetsList')
      .then(function(sheets) {
        App.showLoading(false);
        var el;
        el = document.getElementById('brSheetsList');
        if (el) el.innerHTML = (sheets || []).map(function(s) { return '<div style="padding:2px 0">\u2022 ' + App.escHtml(s) + '</div>'; }).join('');
        el = document.getElementById('brBackupLabel'); if (el) el.value = '';
        showModal('brCreateModal');
      })
      .catch(function(e) {
        App.showLoading(false);
        App.showToast(e.message || 'Failed to load sheets list', 'error');
      });
  };

  window.brConfirmCreate = function() {
    var labelEl = document.getElementById('brBackupLabel');
    var label = labelEl ? labelEl.value.trim() : '';
    var confirmBtn = document.getElementById('brConfirmCreateBtn'); if (confirmBtn) confirmBtn.disabled = true;
    App.showLoading(true);
    API.call('createBackup', { label: label })
      .then(function(result) {
        App.showLoading(false);
        var btn = document.getElementById('brConfirmCreateBtn'); if (btn) btn.disabled = false;
        hideModal('brCreateModal');
        App.showToast(result.message || 'Backup created successfully', 'success');
        brRefresh();
      })
      .catch(function(e) {
        App.showLoading(false);
        var btn = document.getElementById('brConfirmCreateBtn'); if (btn) btn.disabled = false;
        App.showToast(e.message || 'Failed to create backup', 'error');
      });
  };

  window.brExportBackup = function() {
    var backupId = promptBackupSelection('Export');
    if (!backupId) return;
    App.showLoading(true);
    API.call('exportBackup', { backupId: backupId })
      .then(function(jsonStr) {
        App.showLoading(false);
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = backupId + '.json';
        a.click();
        URL.revokeObjectURL(url);
        App.showToast('Backup exported successfully', 'success');
      })
      .catch(function(e) {
        App.showLoading(false);
        App.showToast(e.message || 'Failed to export backup', 'error');
      });
  };

  window.brImportBackup = function() {
    _importData = null;
    var el;
    el = document.getElementById('brImportFile'); if (el) el.value = '';
    el = document.getElementById('brImportPreview');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    el = document.getElementById('brConfirmImportBtn'); if (el) el.disabled = true;
    showModal('brImportModal');
  };

  window.brHandleImportFile = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parsed = JSON.parse(e.target.result);
        var data = parsed.data || parsed;
        var sheetNames = Object.keys(data);
        var totalRecords = 0;
        sheetNames.forEach(function(n) { if (Array.isArray(data[n])) totalRecords += data[n].length; });
        var previewEl = document.getElementById('brImportPreview');
        if (previewEl) {
          previewEl.style.display = 'block';
          previewEl.innerHTML =
            '<div style="margin-bottom:8px"><strong>Backup Summary</strong></div>' +
            '<div>Sheets: ' + sheetNames.length + '</div>' +
            '<div>Records: ' + totalRecords + '</div>' +
            '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);max-height:150px;overflow-y:auto">' +
            sheetNames.map(function(n) { return '<div>\u2022 ' + App.escHtml(n) + ' (' + (Array.isArray(data[n]) ? data[n].length : 0) + ' records)</div>'; }).join('') +
            '</div>';
        }
        _importData = e.target.result;
        var confirmBtn = document.getElementById('brConfirmImportBtn'); if (confirmBtn) confirmBtn.disabled = false;
      } catch(err) {
        App.showToast('Invalid backup file: ' + err.message, 'error');
        var confirmBtn = document.getElementById('brConfirmImportBtn'); if (confirmBtn) confirmBtn.disabled = true;
      }
    };
    reader.readAsText(file);
  };

  window.brConfirmImport = function() {
    if (!_importData) return;
    App.showConfirm('Import Backup', 'Are you sure you want to import this backup? All current data in the affected sheets will be overwritten.', function() {
      var confirmBtn = document.getElementById('brConfirmImportBtn'); if (confirmBtn) confirmBtn.disabled = true;
      App.showLoading(true);
      API.call('importBackup', { data: _importData })
        .then(function(result) {
          App.showLoading(false);
          var btn = document.getElementById('brConfirmImportBtn'); if (btn) btn.disabled = false;
          hideModal('brImportModal');
          App.showToast(result.message || 'Backup imported successfully', 'success');
          brRefresh();
        })
        .catch(function(e) {
          App.showLoading(false);
          var btn = document.getElementById('brConfirmImportBtn'); if (btn) btn.disabled = false;
          App.showToast(e.message || 'Failed to import backup', 'error');
        });
    });
  };

  window.brRestoreBackup = function() {
    if (_data.length === 0) { App.showToast('No backups available to restore', 'warning'); return; }
    var sel = document.getElementById('brRestoreSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select a backup...</option>';
    _data.forEach(function(r) {
      sel.innerHTML += '<option value="' + App.escHtml(r.BackupID) + '">' + App.escHtml(r.BackupID) + ' \u2014 ' + App.escHtml(App.formatDateTime(r.DateTime)) + ' (' + App.escHtml(r.Size || '') + ')</option>';
    });
    showModal('brRestoreModal');
  };

  window.brSelectRestore = function(backupId) {
    App.showConfirm('Restore Backup', 'Are you sure you want to restore backup ' + backupId + '? This will overwrite all current data.', function() {
      var restoreBtn = document.getElementById('brRestoreBtn'); if (restoreBtn) restoreBtn.disabled = true;
      App.showLoading(true);
      API.call('restoreBackup', { backupId: backupId })
        .then(function(result) {
          App.showLoading(false);
          var btn = document.getElementById('brRestoreBtn'); if (btn) btn.disabled = false;
          App.showToast(result.message || 'Backup restored successfully', 'success');
          brRefresh();
        })
        .catch(function(e) {
          App.showLoading(false);
          var btn = document.getElementById('brRestoreBtn'); if (btn) btn.disabled = false;
          App.showToast(e.message || 'Failed to restore backup', 'error');
        });
    });
  };

  window.brConfirmRestore = function() {
    var sel = document.getElementById('brRestoreSelect');
    var backupId = sel ? sel.value : '';
    if (!backupId) { App.showToast('Please select a backup', 'warning'); return; }
    App.showConfirm('Restore Backup', 'Are you sure you want to restore backup ' + backupId + '? This will overwrite all current data in the restored sheets.', function() {
      var confirmBtn = document.getElementById('brConfirmRestoreBtn'); if (confirmBtn) confirmBtn.disabled = true;
      App.showLoading(true);
      API.call('restoreBackup', { backupId: backupId })
        .then(function(result) {
          App.showLoading(false);
          var btn = document.getElementById('brConfirmRestoreBtn'); if (btn) btn.disabled = false;
          hideModal('brRestoreModal');
          App.showToast(result.message || 'Backup restored successfully', 'success');
          brRefresh();
        })
        .catch(function(e) {
          App.showLoading(false);
          var btn = document.getElementById('brConfirmRestoreBtn'); if (btn) btn.disabled = false;
          App.showToast(e.message || 'Failed to restore backup', 'error');
        });
    });
  };

  window.brDownloadBackup = function(backupId) {
    App.showLoading(true);
    API.call('exportBackup', { backupId: backupId })
      .then(function(jsonStr) {
        App.showLoading(false);
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = backupId + '.json';
        a.click();
        URL.revokeObjectURL(url);
        App.showToast('Backup downloaded', 'success');
      })
      .catch(function(e) {
        App.showLoading(false);
        App.showToast(e.message || 'Failed to download backup', 'error');
      });
  };

  window.brDeleteBackup = function(backupId) {
    App.showConfirm('Delete Backup', 'Delete backup ' + backupId + '? This cannot be undone.', function() {
      App.showLoading(true);
      API.call('deleteBackup', { backupId: backupId })
        .then(function(result) {
          App.showLoading(false);
          App.showToast(result.message || 'Backup deleted', 'success');
          brRefresh();
        })
        .catch(function(e) {
          App.showLoading(false);
          App.showToast(e.message || 'Failed to delete backup', 'error');
        });
    });
  };

  function promptBackupSelection(action) {
    if (_data.length === 0) { App.showToast('No backups available', 'warning'); return null; }
    return _data[0].BackupID;
  }

})();
