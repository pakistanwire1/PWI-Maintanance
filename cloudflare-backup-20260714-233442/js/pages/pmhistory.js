/* ============================================================
   pmhistory.js — PM History Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _records = [];
  var _filtered = [];
  var _machines = [];

  App.registerPage('pmhistory', render, load);

  function render() {
    document.getElementById('page-pmhistory').innerHTML = '' +
      '<div class="page-header"><h2>PM History</h2></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">' +
        '<input type="text" class="form-input" placeholder="Search..." id="pmh-search" oninput="PMHFilter()" style="flex:1;min-width:150px">' +
        '<select class="form-select" id="pmh-machine" onchange="PMHFilter()" style="max-width:200px"><option value="">All Machines</option></select>' +
        '<select class="form-select" id="pmh-status" onchange="PMHFilter()" style="max-width:140px"><option value="">All Status</option>' +
          ['Completed','Overdue','Scheduled','In Progress','Missed','Skipped'].map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join('') +
        '</select>' +
      '</div>' +
      '<div id="pmh-stats" class="qr-stats-row" style="margin-bottom:16px"></div>' +
      '<div class="card"><div class="table-container" id="pmh-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getPMHistory')
      .then(function(data) { _records = data || []; _filtered = _records; App.showLoading(false); renderStats(); renderTable(); loadMachineFilter(); })
      .catch(function(e) { App.showLoading(false); App.showToast('Error: '+e.message,'error'); });
  }

  function loadMachineFilter() {
    API.call('getMachineList')
      .then(function(machines) {
        _machines = machines || [];
        var sel = document.getElementById('pmh-machine');
        if (!sel) return;
        var h = '<option value="">All Machines</option>';
        _machines.forEach(function(m){ h+='<option value="'+App.escHtml(m.MachineName||m.MachineID||'')+'">'+App.escHtml(m.MachineName||m.MachineID||'')+'</option>'; });
        sel.innerHTML = h;
      })
      .catch(function(){});
  }

  function renderStats() {
    var el = document.getElementById('pmh-stats');
    if (!el) return;
    var total = _records.length;
    var completed = _records.filter(function(r){return (r.Status||'').toLowerCase()==='completed';}).length;
    var overdue = _records.filter(function(r){return (r.Status||'').toLowerCase()==='overdue';}).length;
    var now = new Date().toISOString().substring(0,7);
    var thisMonth = _records.filter(function(r){return (r.CompletionDate||r.CreatedAt||'').indexOf(now)===0;}).length;
    el.innerHTML =
      '<div class="qr-stat-card"><div class="stat-icon">&#128197;</div><div class="stat-num">'+total+'</div><div class="stat-lbl">Total</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#9989;</div><div class="stat-num" style="color:var(--success)">'+completed+'</div><div class="stat-lbl">Completed</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#9888;</div><div class="stat-num" style="color:var(--danger)">'+overdue+'</div><div class="stat-lbl">Overdue</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#128197;</div><div class="stat-num" style="color:var(--info)">'+thisMonth+'</div><div class="stat-lbl">This Month</div></div>';
  }

  function renderTable() {
    var el = document.getElementById('pmh-table');
    if (!el) return;
    if (!_filtered.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#128197;</div><div class="empty-state-text">No PM history found</div></div>'; return; }
    var h = '<table><thead><tr><th>PM Number</th><th>Title</th><th>Machine</th><th>Completion Date</th><th>Next Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    _filtered.forEach(function(r) {
      var sc = (r.Status||'').toLowerCase()==='completed'?'badge-success':(r.Status||'').toLowerCase()==='overdue'?'badge-danger':(r.Status||'').toLowerCase()==='in progress'?'badge-info':'badge-secondary';
      h += '<tr><td>'+App.escHtml(r.PMNumber||'')+'</td><td>'+App.escHtml(r.Title||'')+'</td><td>'+App.escHtml(r.MachineName||r.Machine||'')+'</td><td>'+App.escHtml(r.CompletionDate||'-')+'</td><td>'+App.escHtml(r.NextDueDate||'-')+'</td><td><span class="badge '+sc+'">'+App.escHtml(r.Status||'')+'</span></td><td><button class="btn btn-sm btn-secondary" onclick="PMHView(\''+App.escHtml(r.PMNumber||r.id||'')+'\')">View</button></td></tr>';
    });
    el.innerHTML = h + '</tbody></table>';
  }

  function applyFilters() {
    var q = (document.getElementById('pmh-search')||{}).value.toLowerCase();
    var machine = (document.getElementById('pmh-machine')||{}).value;
    var status = (document.getElementById('pmh-status')||{}).value;
    _filtered = _records.filter(function(r) {
      var mq = !q || (r.Title||'').toLowerCase().indexOf(q)>-1 || (r.PMNumber||'').toLowerCase().indexOf(q)>-1 || (r.MachineName||'').toLowerCase().indexOf(q)>-1;
      var mm = !machine || (r.MachineName||r.Machine||'')===machine;
      var ms = !status || (r.Status||'')===status;
      return mq && mm && ms;
    });
    renderTable();
  }

  window.PMHFilter = function() { applyFilters(); };
  window.PMHView = function(id) {
    var r = _records.find(function(x){return (x.PMNumber||x.id)===id;});
    if (!r) return;
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = '<div class="modal"><div class="modal-header"><h3>PM Detail</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div><div class="modal-body">' +
      '<div class="qr-detail-grid">' +
        ff('PM Number',r.PMNumber) + ff('Title',r.Title) + ff('Machine',r.MachineName||r.Machine) +
        ff('Status',r.Status) + ff('Completion Date',r.CompletionDate) + ff('Next Due Date',r.NextDueDate) +
        ff('Technician',r.TechnicianName||r.AssignedTechnician) + ff('Remarks',r.Remarks) +
        ff('Created',r.CreatedAt) + ff('Created By',r.CreatedBy) +
      '</div></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  };

  function ff(l,v){return '<div class="qr-detail-field"><div class="qr-detail-field-label">'+App.escHtml(l)+'</div><div class="qr-detail-field-value">'+App.escHtml(v||'-')+'</div></div>';}
})();
