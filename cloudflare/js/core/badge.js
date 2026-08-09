var Badge = {
  _timer: null,
  _STATUS_CONFIG: {
    open:     { sidebarClass: 'status-open' },
    running:  { sidebarClass: 'status-running' },
    closed:   { sidebarClass: 'status-closed' },
    pending:  { sidebarClass: 'status-pending' },
    approved: { sidebarClass: 'status-approved' },
    all:      { sidebarClass: 'status-all' }
  },

  refresh: function() {
    var user = Session.getUser();
    var email = user && user.email ? user.email : '';
    if (!email) return;
    API.post('getSidebarCounts', { _userEmail: email })
      .then(function(data) {
        if (!data || data.success === false) return;
        Badge._updateSidebar(data);
        Badge._refreshOpenPanels();
      })
      .catch(function(err) {
        console.error('Badge.refresh failed:', err);
      });
  },

  _refreshOpenPanels: function() {
    var emailPanel = document.getElementById('emailPanel');
    if (emailPanel && emailPanel.classList.contains('open')) {
      Nav.loadEmailPanelData();
    }
    var notifPanel = document.getElementById('notificationPanel');
    if (notifPanel && notifPanel.classList.contains('open')) {
      Nav.loadNotificationPanelData();
    }
  },

  _updateSidebar: function(data) {
    var map = {
      'startjobcard':    { count: data.startedJobCards || 0,  status: 'running' },
      'jobcards':        { count: data.totalJobCards || 0,    status: 'all' },
      'closejobcard':    { count: data.closedJobCards || 0,   status: 'closed' },
      'pendingjobcard':  { count: data.pendingJobCards || 0,  status: 'pending' },
      'approvejobcard':  { count: data.approvedJobCards || 0, status: 'approved' },
      'pm':              { count: data.pendingPM || 0,        status: 'all' },
      'inventory':       { count: data.inventoryAlerts || 0,  status: 'all' },
      'goodsreceipt':    { count: data.pendingGR || 0,        status: 'all' }
    };
    for (var key in map) {
      var el = document.getElementById('badge-' + key);
      if (!el) continue;
      var item = map[key];
      var count = item.count || 0;
      el.textContent = count > 99 ? '99+' : count;
      el.style.display = '';
      if (count === 0) {
        el.className = 'sidebar-badge badge-zero';
      } else {
        var dataStatus = el.getAttribute('data-status');
        var statusKey = dataStatus || item.status;
        var sc = Badge._STATUS_CONFIG[statusKey];
        el.className = 'sidebar-badge ' + (sc ? sc.sidebarClass : 'badge-low');
      }
    }

    Badge._setTopbarBadge('notificationBadge', data.unreadNotifications || 0);
    Badge._setTopbarBadge('emailBadge', data.pendingEmails || 0);
    Badge._setTopbarBadge('waBadge', data.pendingWhatsApp || 0);
  },

  _setTopbarBadge: function(id, count) {
    var badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  },

  startAutoRefresh: function() {
    if (Badge._timer) return;
    Badge.refresh();
    Badge._timer = setInterval(function() {
      Badge.refresh();
    }, 60000);
  },

  stopAutoRefresh: function() {
    if (Badge._timer) {
      clearInterval(Badge._timer);
      Badge._timer = null;
    }
  }
};
