/* ============================================================
   audit.js — Audit Trail Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _logs = [];
  var _total = 0;
  var _page = 1;
  var _pageSize = 25;

  App.registerPage('audit', render, load);

  function render() {
    document.getElementById('page-audit').innerHTML = '' +
      '<div class="page-header"><h2>Audit Trail</h2></div>' +
      '<div id="audit-stats" class="qr-stats-row" style="margin-bottom:16px"></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">' +
        '<input type="text" class="form-input" placeholder="Search..." id="audit-search" oninput="AuditFilter()" style="flex:1;min-width:150px">' +
        '<select class="form-select" id="audit-module" onchange="AuditFilter()" style="max-width:160px"><option value="">All Modules</option>' +
          ['Auth','JobCards','Machines','Assets','SpareParts','Inventory','PM','Checklists','Users','Settings','QR','Email','WhatsApp','Backup','Dashboard','Departments','Sections','Technicians'].map(function(m){return '<option value="'+m+'">'+m+'</option>';}).join('') +
        '</select>' +
        '<select class="form-select" id="audit-status" onchange="AuditFilter()" style="max-width:140px"><option value="">All Status</option><option value="Success">Success</option><option value="Failure">Failure</option><option value="Warning">Warning</option></select>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="audit-table"></div><div id="audit-pagination" class="pagination"></div></div>';
  }

  function load() { loadLogs(); }

  function loadLogs() {
    var el = document.getElementById('audit-table');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto"></div></div>';

    API.call('getAuditLogs')
      .then(function(data) {
        _logs = data || [];
        _total = _logs.length;
        renderStats();
        applyFilters();
      })
      .catch(function(e) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load: '+App.escHtml(e.message)+'</div></div>';
      });
  }

  function renderStats() {
    var el = document.getElementById('audit-stats');
    if (!el) return;
    var today = new Date().toISOString().substring(0,10);
    var todayCount = _logs.filter(function(l){return (l.DateTime||'').indexOf(today)===0;}).length;
    var modules = {};
    _logs.forEach(function(l){var m=l.Module||'Other';modules[m]=(modules[m]||0)+1;});
    el.innerHTML =
      '<div class="qr-stat-card"><div class="stat-icon">&#128220;</div><div class="stat-num">'+_total+'</div><div class="stat-lbl">Total Logs</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#128197;</div><div class="stat-num">'+todayCount+'</div><div class="stat-lbl">Today</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#128193;</div><div class="stat-num">'+Object.keys(modules).length+'</div><div class="stat-lbl">Modules</div></div>';
  }

  function applyFilters() {
    var q = (document.getElementById('audit-search')||{}).value || '';
    var mod = (document.getElementById('audit-module')||{}).value || '';
    var st = (document.getElementById('audit-status')||{}).value || '';
    var filtered = _logs;
    if (q) { q=q.toLowerCase(); filtered=filtered.filter(function(l){return (l.UserName||'').toLowerCase().indexOf(q)>-1||(l.UserEmail||'').toLowerCase().indexOf(q)>-1||(l.Action||'').toLowerCase().indexOf(q)>-1||(l.RecordID||'').toLowerCase().indexOf(q)>-1||(l.RecordName||'').toLowerCase().indexOf(q)>-1;}); }
    if (mod) filtered=filtered.filter(function(l){return (l.Module||'')===mod;});
    if (st) filtered=filtered.filter(function(l){return (l.Status||'')===st;});
    renderTable(filtered);
  }

  function renderTable(data) {
    var el = document.getElementById('audit-table');
    if (!el) return;
    if (!data.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#128220;</div><div class="empty-state-text">No audit logs found</div></div>'; return; }
    var start = (_page-1)*_pageSize;
    var paged = data.slice(start, start+_pageSize);
    var h = '<table><thead><tr><th>Date</th><th>User</th><th>Module</th><th>Action</th><th>Record</th><th>Status</th></tr></thead><tbody>';
    paged.forEach(function(l) {
      var sc = (l.Status||'').toLowerCase()==='success'?'badge-success':(l.Status||'').toLowerCase()==='failure'?'badge-danger':'badge-warning';
      h += '<tr><td>'+App.escHtml(l.DateTime||'')+'</td><td>'+App.escHtml(l.UserName||l.UserEmail||'')+'</td><td><span class="badge badge-primary">'+App.escHtml(l.Module||'')+'</span></td><td>'+App.escHtml(l.Action||'')+'</td><td>'+App.escHtml(l.RecordName||l.RecordID||'')+'</td><td><span class="badge '+sc+'">'+App.escHtml(l.Status||'')+'</span></td></tr>';
    });
    el.innerHTML = h + '</tbody></table>';
    renderPagination(data.length);
  }

  function renderPagination(total) {
    var el = document.getElementById('audit-pagination');
    if (!el) return;
    var tp = Math.ceil(total/_pageSize);
    if (tp<=1){el.innerHTML='';return;}
    var h='<button '+(_page<=1?'disabled':'')+' onclick="AuditPage('+(_page-1)+')">Prev</button>';
    for(var i=Math.max(1,_page-2);i<=Math.min(tp,_page+2);i++){h+='<button class="'+(i===_page?'active':'')+'" onclick="AuditPage('+i+')">'+i+'</button>';}
    h+='<button '+(_page>=tp?'disabled':'')+' onclick="AuditPage('+(_page+1)+')">Next</button>';
    h+='<span style="font-size:12px;color:var(--text-muted);margin-left:8px">Page '+_page+'/'+tp+' ('+total+')</span>';
    el.innerHTML=h;
  }

  window.AuditFilter = function(){ _page=1; applyFilters(); };
  window.AuditPage = function(p){ _page=p; applyFilters(); };
})();
