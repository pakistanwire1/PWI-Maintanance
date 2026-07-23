var Notifications = (function() {
  var notifData = [];
  var notifPage = 1;
  var notifFilter = { search: '', type: '', notifType: '', status: '', priority: '' };
  var notifSearchDebounce = null;
  var PAGE_SIZE = 25;

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="notificationsPage" class="page">' +
        '<div class="dashboard-grid" id="notifSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary" style="cursor:pointer" onclick="Notifications.filterByType(\'\')">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>' +
              '<div class="stat-info"><h3 id="notifTotal">0</h3><p>Total Notifications</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-danger" style="cursor:pointer" onclick="Notifications.filterByRead(\'Unread\')">' +
            '<div class="stat-inner">' +
              '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
              '<div class="stat-info"><h3 id="notifUnread">0</h3><p>Unread</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="stat-card stat-success" style="cursor:pointer" onclick="Notifications.filterByRead(\'Read\')">' +
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
              '<input type="text" class="form-control" id="notifSearch" placeholder="Search notifications..." onkeyup="Notifications.searchTable()">' +
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
            '<button class="btn btn-primary btn-sm" onclick="Notifications.applyFilter()">Apply</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="Notifications.clearFilter()">Clear</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Notifications</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-success btn-sm" onclick="Notifications.markAllRead()">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M7 10l2 2 4-4"/></svg> Mark All Read</button>' +
              '<button class="btn btn-danger btn-sm" onclick="Notifications.clearAll()">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/></svg> Clear All</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="Notifications.exportCSV()">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg> Export CSV</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="Notifications.exportPDF()">PDF</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="Notifications.printPage()">Print</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="Notifications.load()">' +
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg> Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="notifTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="notifViewModal">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Notification Details</div>' +
            '<button class="modal-close" onclick="Modal.hide(\'notifViewModal\')">&times;</button>' +
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
            '<button class="btn btn-secondary" onclick="Modal.hide(\'notifViewModal\')">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    load();
  }

  function load() {
    Loader.show();
    API.post('getNotifications', {})
      .then(function(data) {
        notifData = (data && data.records) || data || [];
        if (!Array.isArray(notifData)) notifData = [];
        Loader.hide();
        updateSummary();
        renderTable();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load notifications');
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

  function renderTable() {
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

    renderTableLocal(data, columns, 'notifTableContainer');
  }

  function renderTableLocal(data, columns, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Notifications Found</h3>' +
          '<p>No records match your filter criteria.</p>' +
        '</div>';
      return;
    }

    var totalPages = Math.ceil(data.length / PAGE_SIZE);
    var start = (notifPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, data.length);
    var pageData = data.slice(start, end);

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col) + '</th>';
    });
    html += '<th style="width:120px">Actions</th>';
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
          if (!isNaN(d.getTime())) {
            var day = String(d.getDate()).padStart(2, '0');
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var month = months[d.getMonth()];
            var year = d.getFullYear();
            var hours = d.getHours();
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            var mins = String(d.getMinutes()).padStart(2, '0');
            val = day + ' ' + month + ' ' + year + ' | ' + String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm;
          }
        }

        if (typeof val === 'string' && !col.badge && !col.format && !col.datetime) {
          val = Utils.escapeHtml(val);
        }

        html += '<td>' + val + '</td>';
      });

      var id = row.NotificationID || '';
      html += '<td class="actions">';
      html += '<button class="btn-icon btn-primary" onclick="Notifications.view(\'' + Utils.escapeHtml(id) + '\')" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
      if (row.ActionURL) {
        html += '<button class="btn-icon btn-info" onclick="Notifications.openAction(\'' + Utils.escapeHtml(id) + '\')" title="Open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>';
      }
      html += '<button class="btn-icon btn-danger" onclick="Notifications.deleteItem(\'' + Utils.escapeHtml(id) + '\')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>';
      if ((row.ReadStatus || '').toLowerCase() !== 'read') {
        html += '<button class="btn-icon btn-success" onclick="Notifications.markRead(\'' + Utils.escapeHtml(id) + '\')" title="Mark Read"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></button>';
      }
      html += '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="Notifications.goPage(' + (notifPage - 1) + ')" ' + (notifPage <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === notifPage ? 'active' : '') + '" onclick="Notifications.goPage(' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="Notifications.goPage(' + (notifPage + 1) + ')" ' + (notifPage >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function goPage(p) {
    notifPage = p;
    renderTable();
  }

  function view(id) {
    var item = notifData.find(function(r) { return r.NotificationID === id; });
    if (!item) { Notify.error('Record not found'); return; }
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
    Modal.show('notifViewModal');
  }

  function markRead(id) {
    Loader.show();
    API.post('markNotificationRead', { id: id })
      .then(function() {
        return API.post('getNotifications', {});
      })
      .then(function(data) {
        notifData = (data && data.records) || data || [];
        if (!Array.isArray(notifData)) notifData = [];
        Loader.hide();
        updateSummary();
        renderTable();
        Notify.success('Notification marked as read');
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to mark as read');
      });
  }

  function markAllRead() {
    Modal.confirm('Mark All Read', 'Are you sure you want to mark all notifications as read?', function() {
      Loader.show();
      API.post('markAllNotificationsRead', {})
        .then(function() {
          return API.post('getNotifications', {});
        })
        .then(function(data) {
          notifData = (data && data.records) || data || [];
          if (!Array.isArray(notifData)) notifData = [];
          Loader.hide();
          updateSummary();
          renderTable();
          Notify.success('All notifications marked as read');
        })
        .catch(function() {
          Loader.hide();
          Notify.error('Failed to mark all as read');
        });
    });
  }

  function deleteItem(id) {
    Modal.confirm('Delete Notification', 'Are you sure you want to delete this notification?', function() {
      Loader.show();
      API.post('deleteNotification', { id: id })
        .then(function() {
          return API.post('getNotifications', {});
        })
        .then(function(data) {
          notifData = (data && data.records) || data || [];
          if (!Array.isArray(notifData)) notifData = [];
          Loader.hide();
          updateSummary();
          renderTable();
          Notify.success('Notification deleted');
        })
        .catch(function() {
          Loader.hide();
          Notify.error('Failed to delete notification');
        });
    });
  }

  function clearAll() {
    Modal.confirm('Clear All Notifications', 'Are you sure you want to delete ALL notifications? This cannot be undone.', function() {
      Loader.show();
      API.post('clearAllNotifications', {})
        .then(function() {
          notifData = [];
          Loader.hide();
          updateSummary();
          renderTable();
          Notify.success('All notifications cleared');
        })
        .catch(function() {
          Loader.hide();
          Notify.error('Failed to clear notifications');
        });
    });
  }

  function openAction(id) {
    var item = notifData.find(function(r) { return r.NotificationID === id; });
    if (!item) return;
    if ((item.ReadStatus || '').toLowerCase() !== 'read') {
      markRead(id);
    }
    if (item.ActionURL) {
      try { eval(item.ActionURL); } catch(e) {}
    }
  }

  function searchTable() {
    if (notifSearchDebounce) clearTimeout(notifSearchDebounce);
    notifSearchDebounce = setTimeout(function() {
      var el = document.getElementById('notifSearch');
      notifFilter.search = el ? el.value : '';
      notifPage = 1;
      renderTable();
    }, 300);
  }

  function applyFilter() {
    var el;
    el = document.getElementById('notifFilterType'); if (el) notifFilter.type = el.value;
    el = document.getElementById('notifFilterNotifType'); if (el) notifFilter.notifType = el.value;
    el = document.getElementById('notifFilterStatus'); if (el) notifFilter.status = el.value;
    el = document.getElementById('notifFilterPriority'); if (el) notifFilter.priority = el.value;
    notifPage = 1;
    renderTable();
  }

  function clearFilter() {
    var el;
    el = document.getElementById('notifFilterType'); if (el) el.value = '';
    el = document.getElementById('notifFilterNotifType'); if (el) el.value = '';
    el = document.getElementById('notifFilterStatus'); if (el) el.value = '';
    el = document.getElementById('notifFilterPriority'); if (el) el.value = '';
    el = document.getElementById('notifSearch'); if (el) el.value = '';
    notifFilter = { search: '', type: '', notifType: '', status: '', priority: '' };
    notifPage = 1;
    renderTable();
  }

  function filterByType(type) {
    var el = document.getElementById('notifFilterType'); if (el) el.value = type;
    notifFilter.type = type;
    notifPage = 1;
    renderTable();
  }

  function filterByRead(status) {
    var el = document.getElementById('notifFilterStatus'); if (el) el.value = status;
    notifFilter.status = status;
    notifPage = 1;
    renderTable();
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

  function exportCSV() {
    var data = applyClientFilters(notifData);
    if (!data || data.length === 0) { Notify.warning('No data to export'); return; }
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
    Notify.success('Export completed');
  }

  function exportPDF() {
    var data = applyClientFilters(notifData);
    if (!data || data.length === 0) { Notify.warning('No data to export'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#1F4E78;color:#fff}</style></head><body>';
    html += '<h2 style="text-align:center">Notifications Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>ID</th><th>Module</th><th>Title</th><th>Priority</th><th>Read Status</th><th>Date</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.NotificationID || '') + '</td><td>' + Utils.escapeHtml(r.Module || '') + '</td><td>' + Utils.escapeHtml(r.Title || '') + '</td><td>' + Utils.escapeHtml(r.Priority || '') + '</td><td>' + Utils.escapeHtml(r.ReadStatus || '') + '</td><td>' + Utils.escapeHtml(r.CreatedDateTime || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Notifications_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('PDF export completed');
  }

  function printPage() {
    var data = applyClientFilters(notifData);
    if (!data || data.length === 0) { Notify.warning('No data to print'); return; }
    var html = '<html><head><style>table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px}th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#1F4E78;color:#fff}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h2 style="text-align:center">Notifications Report</h2><p style="text-align:center">Generated: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr><th>ID</th><th>Module</th><th>Title</th><th>Priority</th><th>Read Status</th></tr></thead><tbody>';
    data.forEach(function(r) {
      html += '<tr><td>' + Utils.escapeHtml(r.NotificationID || '') + '</td><td>' + Utils.escapeHtml(r.Module || '') + '</td><td>' + Utils.escapeHtml(r.Title || '') + '</td><td>' + Utils.escapeHtml(r.Priority || '') + '</td><td>' + Utils.escapeHtml(r.ReadStatus || '') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var w = window.open('', '', 'width=800,height=600');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return {
    show: renderPage,
    load: load,
    view: view,
    markRead: markRead,
    markAllRead: markAllRead,
    deleteItem: deleteItem,
    clearAll: clearAll,
    openAction: openAction,
    searchTable: searchTable,
    applyFilter: applyFilter,
    clearFilter: clearFilter,
    filterByType: filterByType,
    filterByRead: filterByRead,
    goPage: goPage,
    exportCSV: exportCSV,
    exportPDF: exportPDF,
    printPage: printPage
  };
})();
