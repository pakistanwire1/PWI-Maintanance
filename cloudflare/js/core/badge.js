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
        if (typeof Dashboard !== 'undefined' && Router.current === 'dashboard') {
          Dashboard.load();
        }
      })
      .catch(function(err) {
        console.error('Badge.refresh failed:', err);
      });
  },

  _updateSidebar: function(data) {
    var map = {
      'openjobcard':     { count: data.openJobCards,     status: 'open' },
      'startjobcard':    { count: data.startedJobCards,  status: 'running' },
      'pendingjobcard':  { count: data.pendingJobCards,  status: 'pending' },
      'closejobcard':    { count: data.closedJobCards,   status: 'closed' },
      'approvejobcard':  { count: data.approvedJobCards, status: 'approved' },
      'pm':              { count: data.pendingPM,        status: 'all' },
      'inventory':       { count: data.inventoryAlerts,  status: 'all' },
      'goodsreceipt':    { count: data.pendingGR,        status: 'all' }
    };
    for (var key in map) {
      var el = document.getElementById('badge-' + key);
      if (!el) continue;
      var item = map[key];
      var count = item.count || 0;
      el.textContent = count > 99 ? '99+' : count;
      if (count === 0) {
        el.className = 'sidebar-badge badge-zero';
      } else {
        var dataStatus = el.getAttribute('data-status');
        var statusKey = dataStatus || item.status;
        var sc = Badge._STATUS_CONFIG[statusKey];
        el.className = 'sidebar-badge ' + (sc ? sc.sidebarClass : 'badge-low');
      }
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
