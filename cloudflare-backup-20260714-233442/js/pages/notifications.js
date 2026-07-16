/* ============================================================
   notifications.js — Notifications Center Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _notifications = [];
  var _total = 0;
  var _unread = 0;
  var _page = 1;
  var _pageSize = 25;
  var _filter = { module: '', status: '', search: '' };

  App.registerPage('notifications', render, load);

  function render() {
    document.getElementById('page-notifications').innerHTML = '' +
      '<div class="page-header"><h2>Notifications</h2>' +
        '<button class="btn btn-secondary" onclick="NotifMarkAllRead()">Mark All Read</button></div>' +
      '<div id="notif-stats" class="qr-stats-row" style="margin-bottom:16px"></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">' +
        '<select class="form-select" id="notif-module" onchange="NotifFilter()" style="max-width:160px"><option value="">All Modules</option>' +
          ['Job Cards','Machines','Assets','Spare Parts','Inventory','PM','Checklists','Settings','Users','System'].map(function(m){return '<option value="'+m+'">'+m+'</option>';}).join('') +
        '</select>' +
        '<select class="form-select" id="notif-status" onchange="NotifFilter()" style="max-width:140px"><option value="">All Status</option><option value="unread">Unread</option><option value="read">Read</option></select>' +
        '<input type="text" class="form-input" placeholder="Search..." id="notif-search" oninput="NotifFilter()" style="flex:1;min-width:150px">' +
      '</div>' +
      '<div class="card"><div id="notif-list"></div><div id="notif-pagination" class="pagination"></div></div>';
  }

  function load() { loadNotifications(); }

  function loadNotifications() {
    var el = document.getElementById('notif-list');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto"></div></div>';
    var params = { page: _page, pageSize: _pageSize };
    if (_filter.module) params.module = _filter.module;
    if (_filter.status === 'unread') params.unreadOnly = true;

    API.call('getNotifications', params)
      .then(function(data) {
        _notifications = data.records || [];
        _total = data.total || 0;
        _unread = data.unreadCount || 0;
        renderStats();
        renderList();
        renderPagination(data);
      })
      .catch(function(e) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load: '+App.escHtml(e.message)+'</div></div>';
      });
  }

  function renderStats() {
    var el = document.getElementById('notif-stats');
    if (!el) return;
    el.innerHTML =
      '<div class="qr-stat-card"><div class="stat-icon">&#128276;</div><div class="stat-num">'+_total+'</div><div class="stat-lbl">Total</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#128680;</div><div class="stat-num" style="color:var(--warning)">'+_unread+'</div><div class="stat-lbl">Unread</div></div>' +
      '<div class="qr-stat-card"><div class="stat-icon">&#9989;</div><div class="stat-num" style="color:var(--success)">'+(_total-_unread)+'</div><div class="stat-lbl">Read</div></div>';
  }

  function renderList() {
    var el = document.getElementById('notif-list');
    if (!el) return;
    var filtered = _notifications;
    if (_filter.search) {
      var q = _filter.search.toLowerCase();
      filtered = filtered.filter(function(n){ return (n.Title||'').toLowerCase().indexOf(q)>-1||(n.Message||'').toLowerCase().indexOf(q)>-1||(n.Module||'').toLowerCase().indexOf(q)>-1; });
    }
    if (!filtered.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#128276;</div><div class="empty-state-text">No notifications</div></div>'; return; }
    var h = '<div style="display:flex;flex-direction:column;gap:4px">';
    filtered.forEach(function(n) {
      var isRead = (n.ReadStatus||'').toLowerCase() === 'read';
      var priColors = { Critical:'badge-danger', High:'badge-warning', Medium:'badge-info', Low:'badge-secondary' };
      var pri = priColors[n.Priority]||'badge-secondary';
      h += '<div class="qr-history-card" style="opacity:'+(isRead?'0.7':'1')+';border-left:3px solid '+(isRead?'var(--border)':'var(--primary)')+'">' +
        '<div class="qr-history-card-info" style="flex:1">' +
          '<div class="qr-history-card-title">'+App.escHtml(n.Title||n.NotificationType||'Notification')+'</div>' +
          '<div class="qr-history-card-meta">' +
            '<span class="badge badge-primary" style="font-size:10px">'+App.escHtml(n.Module||'')+'</span>' +
            '<span class="badge '+pri+'" style="font-size:10px">'+App.escHtml(n.Priority||'')+'</span>' +
            '<span>'+App.escHtml(n.CreatedDateTime||'')+'</span>' +
          '</div>' +
          (n.Message?'<div style="font-size:12px;color:var(--text-muted);margin-top:4px">'+App.escHtml(n.Message).substring(0,120)+'</div>':'') +
        '</div>' +
        '<div style="display:flex;gap:4px;flex-shrink:0">' +
          (!isRead?'<button class="btn btn-sm btn-secondary" onclick="NotifMarkRead(\''+App.escHtml(n.NotificationID||n.id||'')+'\')" title="Mark Read">&#9713;</button>':'') +
          '<button class="btn btn-sm btn-danger" onclick="NotifDelete(\''+App.escHtml(n.NotificationID||n.id||'')+'\')" title="Delete">&#128465;</button>' +
        '</div>' +
      '</div>';
    });
    el.innerHTML = h + '</div>';
  }

  function renderPagination(data) {
    var el = document.getElementById('notif-pagination');
    if (!el) return;
    var tp = Math.ceil(_total / _pageSize);
    if (tp <= 1) { el.innerHTML=''; return; }
    var h = '';
    h += '<button '+(_page<=1?'disabled':'')+' onclick="NotifPage('+(_page-1)+')">Prev</button>';
    for (var i=Math.max(1,_page-2);i<=Math.min(tp,_page+2);i++) {
      h += '<button class="'+(i===_page?'active':'')+'" onclick="NotifPage('+i+')">'+i+'</button>';
    }
    h += '<button '+(_page>=tp?'disabled':'')+' onclick="NotifPage('+(_page+1)+')">Next</button>';
    h += '<span style="font-size:12px;color:var(--text-muted);margin-left:8px">Page '+_page+'/'+tp+'</span>';
    el.innerHTML = h;
  }

  window.NotifFilter = function() {
    var m = document.getElementById('notif-module');
    var s = document.getElementById('notif-status');
    var q = document.getElementById('notif-search');
    _filter.module = m ? m.value : '';
    _filter.status = s ? s.value : '';
    _filter.search = q ? q.value : '';
    _page = 1;
    loadNotifications();
  };
  window.NotifPage = function(p){ _page=p; loadNotifications(); };
  window.NotifMarkRead = function(id) {
    API.call('markNotificationRead',{id:id}).then(function(){ loadNotifications(); }).catch(function(){});
  };
  window.NotifMarkAllRead = function() {
    API.call('markAllNotificationsRead',{}).then(function(){ App.showToast('All marked read','success'); loadNotifications(); }).catch(function(e){App.showToast('Error: '+e.message,'error');});
  };
  window.NotifDelete = function(id) {
    API.call('deleteNotification',{id:id}).then(function(){ loadNotifications(); }).catch(function(e){App.showToast('Error: '+e.message,'error');});
  };
})();
