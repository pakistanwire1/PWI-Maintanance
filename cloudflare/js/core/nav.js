var Nav = {
  currentPage: 'dashboard',

  init: function() {
    Nav.setupClock();
    Nav.updateUserInfo();
  },

  toggleSidebar: function() {
    var sidebar = document.getElementById('mainSidebar');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  },

  initSidebar: function() {
    var sidebar = document.getElementById('mainSidebar');
    if (!sidebar) return;
    try {
      var saved = JSON.parse(localStorage.getItem('cmms_sidebarGroups') || '{}');
      var hasSaved = Object.keys(saved).length > 0;
      document.querySelectorAll('.sidebar-group').forEach(function(g) {
        var key = g.dataset.group;
        if (hasSaved) {
          if (saved[key] === true) g.classList.add('open');
        } else {
          g.classList.add('open');
        }
      });
    } catch(e) {}
    if (window.innerWidth > 768) {
      sidebar.classList.add('collapsed');
      sidebar.addEventListener('mouseenter', function() {
        if (window.innerWidth > 768) sidebar.classList.remove('collapsed');
      });
      sidebar.addEventListener('mouseleave', function() {
        if (window.innerWidth > 768) sidebar.classList.add('collapsed');
      });
    }
  },

  toggleGroup: function(header) {
    var group = header.parentElement;
    group.classList.toggle('open');
    var key = group.dataset.group;
    if (key) {
      try {
        var saved = JSON.parse(localStorage.getItem('cmms_sidebarGroups') || '{}');
        saved[key] = group.classList.contains('open');
        localStorage.setItem('cmms_sidebarGroups', JSON.stringify(saved));
      } catch(e) {}
    }
  },

  setActivePage: function(page) {
    Nav.currentPage = page;
    var items = document.querySelectorAll('.sidebar-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('active');
      if (items[i].getAttribute('data-page') === page) {
        items[i].classList.add('active');
        var group = items[i].closest('.sidebar-group');
        if (group && !group.classList.contains('open')) {
          group.classList.add('open');
        }
      }
    }
    var title = document.getElementById('pageTitle');
    if (title) {
      var labels = {
        dashboard: 'Dashboard', machines: 'Machines', assets: 'Assets', users: 'Users',
        technicians: 'Technicians', departments: 'Departments', sections: 'Sections',
        jobcards: 'Job Cards', openjobcard: 'Open Job Card', startjobcard: 'Started Job Cards',
        closejobcard: 'Closed Job Cards', pendingjobcard: 'Pending Review',
        approvejobcard: 'Approved Job Cards', pm: 'PM Schedule', pmhistory: 'PM History',
        checklists: 'Checklists', spareparts: 'Spare Parts', inventory: 'Inventory',
        inventorytransactions: 'Inventory Transactions', stockhistory: 'Stock History',
        goodsreceipt: 'Goods Receipt', breakdown: 'Breakdown History', reports: 'Reports',
        notifications: 'Notifications', email: 'Email Notifications', whatsapp: 'WhatsApp',
        qr: 'QR Overview', qrmachines: 'Machine QR', qrassets: 'Asset QR',
        qrspareparts: 'Spare Parts QR', qrjobcards: 'Job Card QR', qrprint: 'Print QR Labels',
        qrhistory: 'QR History', settings: 'Settings', audit: 'Audit Trail',
        backuprestore: 'Backup & Restore'
      };
      title.textContent = labels[page] || Utils.capitalize(page);
    }
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      var sidebar = document.getElementById('mainSidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    }
  },

  updateUserInfo: function() {
    var user = Session.getUser();
    if (!user) return;
    var displayName = user.name || user.Name || user.email || 'User';
    var displayRole = user.role || user.Role || '';
    var fields = [
      ['userName', displayName], ['userRole', displayRole],
      ['topbarName', displayName], ['topbarRole', displayRole]
    ];
    fields.forEach(function(f) {
      var el = document.getElementById(f[0]);
      if (el) el.textContent = f[1] || '';
    });
    var initials = Utils.getInitials(displayName);
    var photoUrl = user.photoURL || user.PhotoURL || '';
    function setAvatar(elId, size) {
      var el = document.getElementById(elId);
      if (!el) return;
      if (photoUrl) {
        el.innerHTML = '<img src="' + photoUrl + '" style="width:' + size + ';height:' + size + ';border-radius:50%;object-fit:cover">';
      } else {
        el.textContent = initials;
      }
    }
    setAvatar('userAvatar', '34px');
    setAvatar('topbarAvatar', '28px');
  },

  setupClock: function() {
    function updateClock() {
      var el = document.getElementById('topbarClock');
      if (!el) return;
      var now = new Date();
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var h = now.getHours(), m = now.getMinutes(), ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      el.textContent = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear() + ' | ' + ('0'+h).slice(-2) + ':' + ('0'+m).slice(-2) + ' ' + ampm;
    }
    updateClock();
    setInterval(updateClock, 30000);
  },

  toggleUserMenu: function(e) {
    e && e.stopPropagation();
    var menu = document.getElementById('userMenuDropdown');
    if (menu) menu.classList.toggle('show');
  },

  closeUserMenu: function() {
    var menu = document.getElementById('userMenuDropdown');
    if (menu) menu.classList.remove('show');
  },

  toggleNotificationPanel: function() {
    var panel = document.getElementById('notificationPanel');
    var overlay = document.getElementById('notificationOverlay');
    if (!panel) return;
    var isOpening = !panel.classList.contains('open');
    panel.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
    if (isOpening) Nav.loadNotificationPanelData();
  },

  loadNotificationPanelData: function() {
    Nav._notifPage = 1;
    API.post('getNotifications', {})
      .then(function(result) {
        var items = Array.isArray(result) ? result : (result && (result.records || result.data)) || [];
        Nav._notifData = items;
        Nav._renderNotificationList(items);
      })
      .catch(function() {
        var list = document.getElementById('notificationList');
        if (list) list.innerHTML = '<div class="notification-empty"><p>Failed to load notifications</p></div>';
      });
  },

  _notifData: [],
  _notifFilter: 'all',
  _notifPage: 1,
  _notifPageSize: 5,

  _renderNotificationList: function(items) {
    var list = document.getElementById('notificationList');
    var footer = document.getElementById('notifPaginationFooter');
    if (!list) return;
    var filtered = items;
    if (Nav._notifFilter === 'unread') {
      filtered = items.filter(function(n) { return (n.ReadStatus || '').toLowerCase() !== 'read'; });
    } else if (Nav._notifFilter === 'read') {
      filtered = items.filter(function(n) { return (n.ReadStatus || '').toLowerCase() === 'read'; });
    }
    var countEl = document.getElementById('notifPanelCount');
    var unreadCount = items.filter(function(n) { return (n.ReadStatus || '').toLowerCase() !== 'read'; }).length;
    if (countEl) countEl.textContent = unreadCount + ' unread notification' + (unreadCount !== 1 ? 's' : '');
    if (!filtered || filtered.length === 0) {
      list.innerHTML = '<div class="notification-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><p>No notifications</p></div>';
      if (footer) footer.innerHTML = '';
      return;
    }
    var totalPages = Math.ceil(filtered.length / Nav._notifPageSize);
    if (Nav._notifPage > totalPages) Nav._notifPage = totalPages;
    if (Nav._notifPage < 1) Nav._notifPage = 1;
    var start = (Nav._notifPage - 1) * Nav._notifPageSize;
    var pageItems = filtered.slice(start, start + Nav._notifPageSize);
    var typeIcons = { 'Information': 'info', 'Success': 'success', 'Warning': 'warning', 'Critical': 'danger', 'Approval': 'purple', 'Reminder': 'orange', 'System': 'secondary' };
    var priColors = { 'Critical': 'var(--danger)', 'High': 'var(--warning)', 'Medium': 'var(--primary)', 'Low': 'var(--success)' };
    var html = '';
    pageItems.forEach(function(n) {
      var isUnread = (n.ReadStatus || '').toLowerCase() !== 'read';
      var iconClass = typeIcons[n.NotificationType] || 'info';
      var priColor = priColors[n.Priority] || 'var(--text-muted)';
      var time = Nav._timeAgo(n.CreatedDateTime || '');
      var nid = Utils.escapeHtml(n.NotificationID || '');
      var actionUrl = Utils.escapeHtml(n.ActionURL || '');
      html += '<div class="notification-item' + (isUnread ? ' unread' : '') + '" style="padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;gap:10px;align-items:flex-start' + (isUnread ? ';background:var(--primary-light)' : '') + '" onclick="Nav._notifClick(\'' + nid + '\', \'' + actionUrl + '\')">' +
        '<div style="width:32px;height:32px;border-radius:50%;background:var(--' + iconClass + '-bg, var(--bg-card));display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--' + iconClass + ', var(--text-muted));font-size:12px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>' +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:' + (isUnread ? '600' : '400') + ';color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + Utils.escapeHtml(n.Title || '') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;display:flex;gap:6px;align-items:center">' +
            '<span class="badge badge-' + (iconClass) + '" style="font-size:9px;padding:0 5px">' + Utils.escapeHtml(n.Module || '') + '</span>' +
            '<span style="color:' + priColor + ';font-size:10px;font-weight:500">' + Utils.escapeHtml(n.Priority || '') + '</span>' +
            '<span>' + time + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="notification-actions" onclick="event.stopPropagation()" style="display:flex;gap:2px;flex-shrink:0">' +
          (isUnread ? '<button class="notif-action-btn" onclick="Nav._notifMarkRead(\'' + nid + '\')" title="Mark as Read">&#10003;</button>' : '') +
          '<button class="notif-action-btn danger" onclick="Nav._notifDelete(\'' + nid + '\')" title="Delete">&#10005;</button>' +
          (actionUrl ? '<button class="notif-action-btn" onclick="Nav._notifClick(\'' + nid + '\', \'' + actionUrl + '\')" title="Open">&#8599;</button>' : '') +
        '</div>' +
        (isUnread ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:4px"></div>' : '') +
      '</div>';
    });
    list.innerHTML = html;
    if (footer) {
      if (totalPages > 1) {
        var pg = '';
        pg += '<button class="btn btn-xs btn-secondary" onclick="Nav._notifGoPage(' + (Nav._notifPage - 1) + ')"' + (Nav._notifPage <= 1 ? ' disabled' : '') + '>Prev</button>';
        pg += '<span style="margin:0 8px;font-size:13px;color:var(--text-secondary)">Page ' + Nav._notifPage + ' of ' + totalPages + '</span>';
        pg += '<button class="btn btn-xs btn-secondary" onclick="Nav._notifGoPage(' + (Nav._notifPage + 1) + ')"' + (Nav._notifPage >= totalPages ? ' disabled' : '') + '>Next</button>';
        footer.innerHTML = pg;
      } else {
        footer.innerHTML = '';
      }
    }
  },

  _notifGoPage: function(p) {
    Nav._notifPage = p;
    Nav._renderNotificationList(Nav._notifData || []);
  },

  _notifClick: function(id, actionUrl) {
    if (!id) return;
    var item = null;
    for (var i = 0; i < Nav._notifData.length; i++) {
      if (Nav._notifData[i].NotificationID === id) { item = Nav._notifData[i]; break; }
    }
    if (item && (item.ReadStatus || '').toLowerCase() !== 'read') {
      item.ReadStatus = 'Read';
      Nav._renderNotificationList(Nav._notifData);
      Badge.refresh();
      if (typeof Dashboard !== 'undefined' && Dashboard.loadNotifications) Dashboard.loadNotifications();
    }
    API.post('markNotificationRead', { id: id }).catch(function() {});
    if (actionUrl) {
      try { eval(actionUrl); } catch(e) {}
    }
  },

  _notifMarkRead: function(id) {
    if (!id) return;
    for (var i = 0; i < Nav._notifData.length; i++) {
      if (Nav._notifData[i].NotificationID === id) {
        if ((Nav._notifData[i].ReadStatus || '').toLowerCase() !== 'read') {
          Nav._notifData[i].ReadStatus = 'Read';
          Nav._renderNotificationList(Nav._notifData);
          Badge.refresh();
          if (typeof Dashboard !== 'undefined' && Dashboard.loadNotifications) Dashboard.loadNotifications();
        }
        break;
      }
    }
    API.post('markNotificationRead', { id: id }).catch(function() {});
  },

  _notifDelete: function(id) {
    if (!id) return;
    if (!confirm('Delete this notification?')) return;
    Nav._notifData = Nav._notifData.filter(function(n) { return n.NotificationID !== id; });
    Nav._renderNotificationList(Nav._notifData);
    Badge.refresh();
    if (typeof Dashboard !== 'undefined' && Dashboard.loadNotifications) Dashboard.loadNotifications();
    API.post('deleteNotification', { id: id }).catch(function() {});
  },

  toggleEmailPanel: function() {
    var panel = document.getElementById('emailPanel');
    if (!panel) return;
    var isOpening = !panel.classList.contains('open');
    panel.classList.toggle('open');
    if (isOpening) Nav.loadEmailPanelData();
  },

  closeEmailPanel: function() {
    var panel = document.getElementById('emailPanel');
    if (panel) panel.classList.remove('open');
  },

  loadEmailPanelData: function() {
    API.post('emailGetPanelData', {})
      .then(function(data) {
        var stats = (data && data.stats) || {};
        var el;
        el = document.getElementById('emailDropdownSent'); if (el) el.textContent = stats.sentToday || '0';
        el = document.getElementById('emailDropdownFailed'); if (el) el.textContent = stats.failedToday || '0';
        el = document.getElementById('emailDropdownPending'); if (el) el.textContent = stats.pendingToday || '0';
        var emails = (data && data.recentEmails) || [];
        Nav._renderEmailDropdownList(emails);
      })
      .catch(function() {
        var list = document.getElementById('emailPanelList');
        if (list) list.innerHTML = '<div class="email-panel-empty">Failed to load</div>';
      });
  },

  _renderEmailDropdownList: function(emails) {
    var list = document.getElementById('emailPanelList');
    if (!list) return;
    if (!emails || emails.length === 0) {
      list.innerHTML = '<div class="email-panel-empty">No recent emails</div>';
      return;
    }
    var statusColors = { sent: 'var(--success)', failed: 'var(--danger)', pending: 'var(--warning)' };
    var html = '';
    emails.slice(0, 10).forEach(function(e) {
      var status = (e.Status || '').toLowerCase();
      var dotColor = statusColors[status] || 'var(--text-muted)';
      var time = Nav._timeAgo(e.DateTime || '');
      html += '<div class="email-panel-item">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0"></div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + Utils.escapeHtml(e.Subject || e.subject || '') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + Utils.escapeHtml(e.Recipient || e.recipient || '') + '</div>' +
        '</div>' +
        '<div style="font-size:10px;color:var(--text-muted);white-space:nowrap">' + time + '</div>' +
      '</div>';
    });
    list.innerHTML = html;
  },

  _timeAgo: function(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  },
};

function toggleSidebar() { Nav.toggleSidebar(); }
function toggleSidebarGroup(el) { Nav.toggleGroup(el); }
function toggleUserMenu(e) { Nav.toggleUserMenu(e); }
function closeUserMenu() { Nav.closeUserMenu(); }
function toggleNotificationPanel() { Nav.toggleNotificationPanel(); }
function toggleEmailPanel() { Nav.toggleEmailPanel(); }
function closeEmailPanel() { Nav.closeEmailPanel(); }
function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('show');
}

document.addEventListener('click', function(e) {
  var menu = document.getElementById('userMenuDropdown');
  if (menu && menu.classList.contains('show') && !e.target.closest('.topbar-user') && !e.target.closest('.user-menu-dropdown')) {
    Nav.closeUserMenu();
  }
  var emailPanel = document.getElementById('emailPanel');
  if (emailPanel && emailPanel.classList.contains('open') && !e.target.closest('.email-dropdown-container')) {
    Nav.closeEmailPanel();
  }
});
