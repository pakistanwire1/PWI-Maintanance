/* ============================================================
   backup.js — Backup & Restore Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _backups = [];

  App.registerPage('backup', render, load);

  function render() {
    document.getElementById('page-backup').innerHTML = '' +
      '<div class="page-header"><h2>Backup & Restore</h2>' +
        '<button class="btn btn-primary" onclick="BackupCreate()">+ Create Backup</button></div>' +
      '<div id="backup-stats" class="qr-stats-row" style="margin-bottom:16px"></div>' +
      '<div class="card"><div class="table-container" id="backup-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getBackupHistory')
      .then(function(data) { _backups = data || []; App.showLoading(false); renderStats(); renderTable(); })
      .catch(function(e) { App.showLoading(false); App.showToast('Error: '+e.message,'error'); });
  }

  function renderStats() {
    var el = document.getElementById('backup-stats');
    if (!el) return;
    var total = _backups.length;
    var lastBackup = _backups.length > 0 ? _backups[0].DateTime || _backups[0].CreatedAt || '' : '-';
    var completed = _backups.filter(function(b){return (b.Status||'').toLowerCase()==='completed'||(b.Status||'').toLowerCase()==='active';}).length;
    el.innerHTML =
      '<div class="qr-stat-card"><div class="stat-icon">&#128190;</div><div class="stat-num">'+total+'</div><div class="stat-lbl">Total Backups</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#9989;</div><div class="stat-num" style="color:var(--success)">'+completed+'</div><div class="stat-lbl">Completed</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#128197;</div><div class="stat-num" style="font-size:14px;color:var(--text-muted)">'+App.escHtml(App.formatDateTime(lastBackup))+'</div><div class="stat-lbl">Last Backup</div></div>';
  }

  function renderTable() {
    var el = document.getElementById('backup-table');
    if (!el) return;
    if (!_backups.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#128190;</div><div class="empty-state-text">No backups found</div></div>'; return; }
    var h = '<table><thead><tr><th>Backup ID</th><th>Date</th><th>Created By</th><th>Type</th><th>Status</th><th>Label</th><th>Actions</th></tr></thead><tbody>';
    _backups.forEach(function(b) {
      var sc = (b.Status||'').toLowerCase()==='completed'||(b.Status||'').toLowerCase()==='active' ? 'badge-success' : (b.Status||'').toLowerCase()==='failed'?'badge-danger':'badge-warning';
      h += '<tr><td>'+App.escHtml(b.BackupID||b.id||'')+'</td><td>'+App.escHtml(b.DateTime||b.CreatedAt||'')+'</td><td>'+App.escHtml(b.CreatedBy||'')+'</td><td>'+App.escHtml(b.BackupType||'Full')+'</td><td><span class="badge '+sc+'">'+App.escHtml(b.Status||'')+'</span></td><td>'+App.escHtml(b.Label||'')+'</td><td>' +
        '<button class="btn btn-sm btn-danger" onclick="BackupDelete(\''+App.escHtml(b.BackupID||b.id||'')+'\')">Delete</button> ' +
      '</td></tr>';
    });
    el.innerHTML = h + '</tbody></table>';
  }

  window.BackupCreate = function() {
    App.showConfirm('Create Backup','Create a full system backup now?',function(){
      App.showLoading(true);
      API.call('createBackup',{label:'Manual backup - '+new Date().toLocaleDateString()})
        .then(function(){App.showLoading(false);App.showToast('Backup created','success');load();})
        .catch(function(e){App.showLoading(false);App.showToast('Error: '+e.message,'error');});
    });
  };
  window.BackupDelete = function(id) {
    App.showConfirm('Delete Backup','Delete this backup permanently?',function(){
      API.call('deleteBackup',{backupId:id}).then(function(){App.showToast('Deleted','success');load();}).catch(function(e){App.showToast('Error: '+e.message,'error');});
    });
  };
})();
