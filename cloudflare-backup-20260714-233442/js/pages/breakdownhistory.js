/* ============================================================
   breakdownhistory.js — Breakdown History Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _records = [];
  var _filtered = [];

  App.registerPage('breakdownhistory', render, load);

  function render() {
    document.getElementById('page-breakdownhistory').innerHTML = '' +
      '<div class="page-header"><h2>Breakdown History</h2></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">' +
        '<input type="text" class="form-input" placeholder="Search..." id="bh-search" oninput="BhFilter()" style="flex:1;min-width:150px">' +
        '<select class="form-select" id="bh-priority" onchange="BhFilter()" style="max-width:140px"><option value="">All Priority</option>' +
          ['Critical','High','Medium','Low'].map(function(p){return '<option value="'+p+'">'+p+'</option>';}).join('') +
        '</select>' +
      '</div>' +
      '<div id="bh-stats" class="qr-stats-row" style="margin-bottom:16px"></div>' +
      '<div class="card"><div class="table-container" id="bh-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getBreakdownHistory')
      .then(function(data) { _records = data || []; _filtered = _records; App.showLoading(false); renderStats(); renderTable(); })
      .catch(function(e) { App.showLoading(false); App.showToast('Error: '+e.message,'error'); });
  }

  function renderStats() {
    var el = document.getElementById('bh-stats');
    if (!el) return;
    var total = _records.length;
    var totalDowntime = 0;
    _records.forEach(function(r) {
      var dt = r.Downtime || r.TotalDuration || 0;
      if (typeof dt === 'number') totalDowntime += dt;
      else if (typeof dt === 'string' && dt.indexOf(':') !== -1) {
        var parts = dt.split(':');
        totalDowntime += (parseInt(parts[0]||0)*60) + parseInt(parts[1]||0);
      }
    });
    var hours = Math.round(totalDowntime/60*10)/10;
    el.innerHTML =
      '<div class="qr-stat-card"><div class="stat-icon">&#9888;</div><div class="stat-num" style="color:var(--danger)">'+total+'</div><div class="stat-lbl">Total Breakdowns</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#9201;</div><div class="stat-num" style="color:var(--warning)">'+hours+'</div><div class="stat-lbl">Total Downtime (hrs)</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#128200;</div><div class="stat-num">'+(total>0?Math.round(hours/total*10)/10:0)+'</div><div class="stat-lbl">Avg Downtime (hrs)</div></div>';
  }

  function renderTable() {
    var el = document.getElementById('bh-table');
    if (!el) return;
    if (!_filtered.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#9888;</div><div class="empty-state-text">No breakdown records found</div></div>'; return; }
    var h = '<table><thead><tr><th>Job Card</th><th>Date</th><th>Machine</th><th>Department</th><th>Complaint</th><th>Technician</th><th>Priority</th><th>Downtime</th></tr></thead><tbody>';
    _filtered.forEach(function(r) {
      var pri = (r.Priority||'').toLowerCase();
      var pc = pri==='critical'||pri==='high'?'badge-danger':pri==='medium'?'badge-warning':'badge-secondary';
      h += '<tr><td><strong>'+App.escHtml(r.JobCardNo||'')+'</strong></td><td>'+App.escHtml(r.OpenDateTime||'')+'</td><td>'+App.escHtml(r.Machine||'')+'</td><td>'+App.escHtml(r.Department||'')+'</td><td>'+App.escHtml((r.ComplaintDescription||'').substring(0,60))+'</td><td>'+App.escHtml(r.AssignedTechnician||'')+'</td><td><span class="badge '+pc+'">'+App.escHtml(r.Priority||'')+'</span></td><td>'+App.escHtml(r.Downtime||r.TotalDuration||'-')+'</td></tr>';
    });
    el.innerHTML = h + '</tbody></table>';
  }

  window.BhFilter = function() {
    var q = (document.getElementById('bh-search')||{}).value.toLowerCase();
    var pri = (document.getElementById('bh-priority')||{}).value;
    _filtered = _records.filter(function(r) {
      var matchQ = !q || (r.Machine||'').toLowerCase().indexOf(q)>-1 || (r.JobCardNo||'').toLowerCase().indexOf(q)>-1 || (r.Department||'').toLowerCase().indexOf(q)>-1 || (r.AssignedTechnician||'').toLowerCase().indexOf(q)>-1;
      var matchP = !pri || (r.Priority||'')===pri;
      return matchQ && matchP;
    });
    renderTable();
  };
})();
