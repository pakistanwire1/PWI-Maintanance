/* ============================================================
   notifications.js — Notifications Center Page Module
   Cloudflare Pages Frontend (GAS-identical: NotificationsPage.html)
   ============================================================ */

(function() {
  var notifData = [];
  var notifPage = 1;
  var notifFilter = { search: '', type: '', notifType: '', status: '', priority: '' };
  var notifSearchDebounce = null;

  App.registerPage('notifications', render, load);

  function render() {
    var el = document.getElementById('page-notifications');
    if (!el) return;
    el.innerHTML =
      '<div id="notificationsPage" class="page">' +
        '<div class="dashboard-grid" id="notifSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary" style="cursor:pointer" onclick="Notif.filterByType(\'\')">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>' +
              '<div class="stat-info"><h3 id="notifTotal">0</h3><p>Total Notifications</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-danger" style="cursor:pointer" onclick="Notif.filterByRead(\'Unread\')">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
              '<div class="stat-info"><h3 id="notifUnread">0</h3><p>Unread</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-success" style="cursor:pointer" onclick="Notif.filterByRead(\'Read\')">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>' +
              '<div class="stat-info"><h3 id="notifRead">0</h3><p>Read</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-info">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
              '<div class="stat-info"><h3 id="notifTypes">0</h3><p>Modules</p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar" id="notifFilterBar">' +
          '<div class="form-group">' +
            '<label>Search</label>' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="notifSearch" placeholder="Search notifications..." onkeyup="Notif.searchTable()">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Module</label>' +
            '<select class="form-control" id="notifFilterType">' +
              '<option value="">All Modules</option>' +
              '<option value="Job Card">Job Card</option>' +
              '<option value="Preventive Maintenance">Preventive Maintenance</option>' +
              '<option value="Spare Part">Spare Part</option>' +
              '<option value="Inventory">Inventory</option>' +
              '<option value="Goods Receipt">Goods Receipt</option>' +
              '<option value="User">User</option>' +
              '<option value="Machine">Machine</option>' +
              '<option value="Asset">Asset</option>' +
              '<option value="Breakdown">Breakdown</option>' +
              '<option value="System">System</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Type</label>' +
            '<select class="form-control" id="notifFilterNotifType">' +
              '<option value="">All Types</option>' +
              '<option value="Information">Information</option>' +
              '<option value="Success">Success</option>' +
              '<option value="Warning">Warning</option>' +
              '<option value="Critical">Critical</option>' +
              '<option value="Approval">Approval</option>' +
              '<option value="Reminder">Reminder</option>' +
              '<option value="System">System</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Status</label>' +
            '<select class="form-control" id="notifFilterStatus">' +
              '<option value="">All</option>' +
              '<option value="Unread">Unread</option>' +
              '<option value="Read">Read</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Priority</label>' +
            '<select class="form-control" id="notifFilterPriority">' +
              '<option value="">All Priority</option>' +
              '<option value="Critical">Critical</option>' +
              '<option value="High">High</option>' +
              '<option value="Medium">Medium</option>' +
              '<option value="Low">Low</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary btn-sm" onclick="Notif.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="Notif.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Notifications</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-success" onclick="Notif.markAllRead()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M7 10l2 2 4-4"/></svg> Mark All Read</button>' +
              '<button class="btn btn-danger" onclick="Notif.deleteAll()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/></svg> Clear All</button>' +
              '<button class="btn btn-secondary" onclick="Notif.exportCSV()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg> Export CSV</button>' +
              '<button class="btn btn-secondary" onclick="Notif.exportPDF()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M6 14H4a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M6 12h8v5H6v-5z"/><path d="M6 5V3a1 1 0 011-1h6a1 1 0 011 1v2"/></svg> PDF</button>' +
              '<button class="btn btn-secondary" onclick="Notif.printView()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M6 14H4a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M6 12h8v5H6v-5z"/><path d="M6 5V3a1 1 0 011-1h6a1 1 0 011 1v2"/></svg> Print</button>' +
              '<button class="btn btn-secondary" onclick="Notif.refresh()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg> Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="notifTableContainer"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-overlay" id="notifViewModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="notifViewTitle">Notification Details</div>' +
            '<button class="modal-close" onclick="hideModal(\'notifViewModal\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="view-grid">' +
              '<div class="view-section">' +
                '<h4>Notification Info</h4>' +
                '<div class="view-row"><span>Notification ID</span><strong id="notifViewId">-</strong></div>' +
                '<div class="view-row"><span>Module</span><strong id="notifViewType">-</strong></div>' +
                '<div class="view-row"><span>Notification Type</span><strong id="notifViewNotifType">-</strong></div>' +
                '<div class="view-row"><span>Title</span><strong id="notifViewTitleText">-</strong></div>' +
                '<div class="view-row"><span>Priority</span><strong id="notifViewPriority">-</strong></div>' +
                '<div class="view-row"><span>Created By</span><strong id="notifViewCreatedBy">-</strong></div>' +
                '<div class="view-row"><span>Assigned To</span><strong id="notifViewAssignedTo">-</strong></div>' +
              '</div>' +
              '<div class="view-section">' +
                '<h4>Status</h4>' +
                '<div class="view-row"><span>Read Status</span><strong id="notifViewReadStatus">-</strong></div>' +
                '<div class="view-row"><span>Created Date/Time</span><strong id="notifViewCreatedAt">-</strong></div>' +
                '<div class="view-row"><span>Action URL</span><strong id="notifViewActionUrl">-</strong></div>' +
              '</div>' +
            '</div>' +
            '<div class="view-grid" style="margin-top:16px">' +
              '<div class="view-section" style="grid-column:1/-1">' +
                '<h4>Message</h4>' +
                '<p id="notifViewMessage" style="color:var(--text);font-size:13px;line-height:1.5;white-space:pre-wrap">-</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="hideModal(\'notifViewModal\')">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getNotifications', {})
      .then(function(result) {
        notifData = (result && result.records) ? result.records : (result || []);
        App.showLoading(false);
        updateSummary();
        renderNotifTable();
        updateNotifBadge();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load notifications', 'error');
      });
  }

  function updateSummary() {
    var total = notifData.length;
    var unread = notifData.filter(function(r) { return (r.ReadStatus || '').toLowerCase() !== 'read'; }).length;
    var read = total - unread;
    var modules = {};
    notifData.forEach(function(r) { if (r.Module) modules[r.Module] = true; });
    var el;
    el = document.getElementById('notifTotal'); if (el) el.textContent = total;
    el = document.getElementById('notifUnread'); if (el) el.textContent = unread;
    el = document.getElementById('notifRead'); if (el) el.textContent = read;
    el = document.getElementById('notifTypes'); if (el) el.textContent = Object.keys(modules).length;
  }

  function renderNotifTable() {
    var data = applyClientFilters(notifData);
    var columns = [
      { key: 'NotificationID', label: 'ID' },
      { key: 'CreatedDateTime', label: 'Date', datetime: true },
      { key: 'Module', label: 'Module', badge: true, badgeMap: {
        'Job Card': 'primary', 'Preventive Maintenance': 'info', 'Spare Part': 'warning',
        'Inventory': 'info', 'Goods Receipt': 'success', 'User': 'primary',
        'Machine': 'info', 'Asset': 'success', 'Breakdown': 'danger', 'System': 'secondary'
      } },
      { key: 'NotificationType', label: 'Type', badge: true, badgeMap: {
        'Information': 'info', 'Success': 'success', 'Warning': 'warning',
        'Critical': 'danger', 'Approval': 'purple', 'Reminder': 'orange', 'System': 'secondary'
      } },
      { key: 'Title', label: 'Title' },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Critical': 'danger', 'High': 'warning', 'Medium': 'info', 'Low': 'success' } },
      { key: 'ReadStatus', label: 'Read', badge: true, badgeMap: { 'Unread': 'danger', 'Read': 'success' } }
    ];
    var actions = [
      { label: 'View', icon: 'view', color: 'primary', onclick: "Notif.view('{id}')", idField: 'NotificationID' },
      { label: 'Open', icon: 'start', color: 'info', onclick: "Notif.openAction('{id}')", idField: 'NotificationID', condition: function(r) { return !!(r.ActionURL); } },
      { label: 'Delete', icon: 'trash', color: 'danger', onclick: "Notif.deleteNotif('{id}')", idField: 'NotificationID' }
    ];
    actions.push({
      label: 'Mark Read', icon: 'check', color: 'success', onclick: "Notif.markRead('{id}')", idField: 'NotificationID',
      condition: function(r) { return (r.ReadStatus || '').toLowerCase() !== 'read'; }
    });
    renderTable(data, columns, actions, notifPage, PAGE_SIZE, 'notifTableContainer');
    registerPageState('notifTableContainer', function(p) { notifPage = p; renderNotifTable(); });
  }

  function renderTableForExport(data) { return renderNotifTable(); }

  function viewNotif(id) {
    var item = notifData.find(function(r) { return r.NotificationID === id; });
    if (!item) { App.showToast('Record not found', 'error'); return; }
    var el;
    el = document.getElementById('notifViewId'); if (el) el.textContent = item.NotificationID || '-';
    el = document.getElementById('notifViewType'); if (el) el.textContent = item.Module || '-';
    el = document.getElementById('notifViewNotifType'); if (el) el.textContent = item.NotificationType || '-';
    el = document.getElementById('notifViewTitleText'); if (el) el.textContent = item.Title || '-';
    el = document.getElementById('notifViewPriority'); if (el) el.textContent = item.Priority || '-';
    el = document.getElementById('notifViewCreatedBy'); if (el) el.textContent = item.CreatedBy || '-';
    el = document.getElementById('notifViewAssignedTo'); if (el) el.textContent = item.AssignedTo || '-';
    el = document.getElementById('notifViewReadStatus'); if (el) el.textContent = item.ReadStatus || '-';
    el = document.getElementById('notifViewCreatedAt'); if (el) el.textContent = item.CreatedDateTime || '-';
    el = document.getElementById('notifViewActionUrl'); if (el) el.textContent = item.ActionURL || '-';
    el = document.getElementById('notifViewMessage'); if (el) el.textContent = item.Message || '-';
    showModal('notifViewModal');
  }

  function markNotifRead(id) {
    App.showLoading(true);
    API.call('markNotificationRead', { id: id })
      .then(function(result) {
        var data = (result && result.records) ? result.records : (result || []);
        notifData = Array.isArray(data) ? data : notifData;
        App.showLoading(false);
        updateSummary();
        renderNotifTable();
        updateNotifBadge();
        App.showToast('Notification marked as read', 'success');
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to mark as read', 'error');
      });
  }

  function markAllNotifRead() {
    showConfirm('Mark All Read', 'Are you sure you want to mark all notifications as read?', function() {
      App.showLoading(true);
      API.call('markAllNotificationsRead', {})
        .then(function(result) {
          var data = (result && result.records) ? result.records : (result || []);
          notifData = Array.isArray(data) ? data : [];
          App.showLoading(false);
          updateSummary();
          renderNotifTable();
          updateNotifBadge();
          App.showToast('All notifications marked as read', 'success');
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Failed to mark all as read', 'error');
        });
    });
  }

  function deleteNotif(id) {
    showConfirm('Delete Notification', 'Are you sure you want to delete this notification?', function() {
      App.showLoading(true);
      API.call('deleteNotification', { id: id })
        .then(function(result) {
          var data = (result && result.records) ? result.records : (result || []);
          notifData = Array.isArray(data) ? data : notifData.filter(function(n) { return n.NotificationID !== id; });
          App.showLoading(false);
          updateSummary();
          renderNotifTable();
          updateNotifBadge();
          App.showToast('Notification deleted', 'success');
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Failed to delete notification', 'error');
        });
    });
  }

  function deleteAllNotif() {
    showConfirm('Clear All Notifications', 'Are you sure you want to delete ALL notifications? This cannot be undone.', function() {
      App.showLoading(true);
      API.call('clearAllNotifications', {})
        .then(function() {
          notifData = [];
          App.showLoading(false);
          updateSummary();
          renderNotifTable();
          updateNotifBadge();
          App.showToast('All notifications cleared', 'success');
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Failed to clear notifications', 'error');
        });
    });
  }

  function openNotifAction(id) {
    var item = notifData.find(function(r) { return r.NotificationID === id; });
    if (!item) return;
    if ((item.ReadStatus || '').toLowerCase() !== 'read') {
      markNotifRead(id);
    }
    if (item.ActionURL) {
      try { eval(item.ActionURL); } catch(e) {}
    }
  }

  function updateNotifBadge() {
    var badge = document.getElementById('notificationBadge');
    if (!badge) return;
    var unread = notifData.filter(function(r) { return (r.ReadStatus || '').toLowerCase() !== 'read'; }).length;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function searchNotifTable() {
    var el = document.getElementById('notifSearch');
    if (!el) return;
    var query = el.value;
    notifFilter.search = query;
    if (notifSearchDebounce) clearTimeout(notifSearchDebounce);
    notifSearchDebounce = setTimeout(function() {
      notifPage = 1;
      renderNotifTable();
    }, 300);
  }

  function applyNotifFilter() {
    var el;
    el = document.getElementById('notifFilterType'); if (el) notifFilter.type = el.value;
    el = document.getElementById('notifFilterNotifType'); if (el) notifFilter.notifType = el.value;
    el = document.getElementById('notifFilterStatus'); if (el) notifFilter.status = el.value;
    el = document.getElementById('notifFilterPriority'); if (el) notifFilter.priority = el.value;
    notifPage = 1;
    renderNotifTable();
  }

  function clearNotifFilter() {
    var el;
    el = document.getElementById('notifFilterType'); if (el) el.value = '';
    el = document.getElementById('notifFilterNotifType'); if (el) el.value = '';
    el = document.getElementById('notifFilterStatus'); if (el) el.value = '';
    el = document.getElementById('notifFilterPriority'); if (el) el.value = '';
    el = document.getElementById('notifSearch'); if (el) el.value = '';
    notifFilter = { search: '', type: '', notifType: '', status: '', priority: '' };
    notifPage = 1;
    renderNotifTable();
  }

  function filterNotifByType(type) {
    var el = document.getElementById('notifFilterType');
    if (el) el.value = type;
    notifFilter.type = type;
    notifPage = 1;
    renderNotifTable();
  }

  function filterNotifByRead(status) {
    var el = document.getElementById('notifFilterStatus');
    if (el) el.value = status;
    notifFilter.status = status;
    notifPage = 1;
    renderNotifTable();
  }

  function applyClientFilters(data) {
    if (notifFilter.search) {
      var q = notifFilter.search.toLowerCase();
      data = data.filter(function(r) {
        return (r.NotificationID && r.NotificationID.toLowerCase().indexOf(q) > -1) ||
               (r.Title && r.Title.toLowerCase().indexOf(q) > -1) ||
               (r.Message && r.Message.toLowerCase().indexOf(q) > -1) ||
               (r.Module && r.Module.toLowerCase().indexOf(q) > -1);
      });
    }
    if (notifFilter.type) data = data.filter(function(r) { return r.Module === notifFilter.type; });
    if (notifFilter.notifType) data = data.filter(function(r) { return (r.NotificationType || 'Information') === notifFilter.notifType; });
    if (notifFilter.status) data = data.filter(function(r) { return (r.ReadStatus || '').toLowerCase() === notifFilter.status.toLowerCase(); });
    if (notifFilter.priority) data = data.filter(function(r) { return r.Priority === notifFilter.priority; });
    return data;
  }

  function exportNotifCSV() {
    var data = applyClientFilters(notifData);
    if (!data || data.length === 0) { App.showToast('No data to export', 'warning'); return; }
    var headers = ['NotificationID','Title','Message','Module','NotificationType','Priority','CreatedBy','AssignedTo','CreatedDateTime','ReadStatus','ActionURL'];
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
    a.download = 'Notifications_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Export completed', 'success');
  }

  function exportNotifPDF() {
    var data = applyClientFilters(notifData);
    if (!data || data.length === 0) { App.showToast('No data to export', 'warning'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1F4E78;color:#fff}</style></head><body>';
    html += '<h2 style="text-align:center">Notifications Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>ID</th><th>Module</th><th>Title</th><th>Priority</th><th>Read Status</th><th>Date</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + escapeHtml(r.NotificationID || '') + '</td><td>' + escapeHtml(r.Module || '') + '</td><td>' + escapeHtml(r.Title || '') + '</td><td>' + escapeHtml(r.Priority || '') + '</td><td>' + escapeHtml(r.ReadStatus || '') + '</td><td>' + escapeHtml(r.CreatedDateTime || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Notifications_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('PDF export completed', 'success');
  }

  function printNotif() {
    var data = applyClientFilters(notifData);
    if (!data || data.length === 0) { App.showToast('No data to print', 'warning'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px}th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#1F4E78;color:#fff}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h2 style="text-align:center">Notifications Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>ID</th><th>Module</th><th>Title</th><th>Priority</th><th>Read Status</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + escapeHtml(r.NotificationID || '') + '</td><td>' + escapeHtml(r.Module || '') + '</td><td>' + escapeHtml(r.Title || '') + '</td><td>' + escapeHtml(r.Priority || '') + '</td><td>' + escapeHtml(r.ReadStatus || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var w = window.open('', '', 'width=800,height=600');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  window.Notif = {
    refresh: function() { load(); },
    view: viewNotif,
    markRead: markNotifRead,
    markAllRead: markAllNotifRead,
    deleteNotif: deleteNotif,
    deleteAll: deleteAllNotif,
    openAction: openNotifAction,
    searchTable: searchNotifTable,
    applyFilter: applyNotifFilter,
    clearFilter: clearNotifFilter,
    filterByType: filterNotifByType,
    filterByRead: filterNotifByRead,
    exportCSV: exportNotifCSV,
    exportPDF: exportNotifPDF,
    printView: printNotif,
    getData: function() { return notifData; },
    getUnreadCount: function() { return notifData.filter(function(r) { return (r.ReadStatus || '').toLowerCase() !== 'read'; }).length; }
  };
})();
