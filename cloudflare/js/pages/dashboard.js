var Dashboard = {
  chartsLoaded: false,
  filter: 'all',
  _kpiTimer: null,
  _kpiToggleState: 0,
  _kpiCards: {},
  _notifPage: 1,
  _notifPageSize: 5,
  _notifAllItems: [],
  _activityPage: 1,
  _activityPageSize: 5,
  _activityAllItems: [],

  init: function(el) {
    el.innerHTML = Dashboard.html();
    Dashboard.bind();
    Dashboard.load();
  },

  html: function() {
    return '<div class="dashboard-filter-bar">' +
      '<button class="filter-btn' + (Dashboard.filter==='today'?' active':'') + '" onclick="Dashboard.setFilter(\'today\',this)">Today</button>' +
      '<button class="filter-btn' + (Dashboard.filter==='week'?' active':'') + '" onclick="Dashboard.setFilter(\'week\',this)">This Week</button>' +
      '<button class="filter-btn' + (Dashboard.filter==='month'?' active':'') + '" onclick="Dashboard.setFilter(\'month\',this)">This Month</button>' +
      '<button class="filter-btn' + (Dashboard.filter==='lastmonth'?' active':'') + '" onclick="Dashboard.setFilter(\'lastmonth\',this)">Last Month</button>' +
      '<button class="filter-btn' + (Dashboard.filter==='all'?' active':'') + '" onclick="Dashboard.setFilter(\'all\',this)">All Time</button>' +
      '<div style="flex:1"></div>' +
      '<button class="scan-qr-btn" onclick="navigateTo(\'qr\')" title="Scan QR Code">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>' +
        ' Scan QR' +
      '</button>' +
    '</div>' +

    '<div class="dashboard-grid" id="dashboardCards">' +
      '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="statMachines">0</h3><p>Total Machines</p></div></div></div>' +
      '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="stat-info"><h3 id="statRunningMachines">0</h3><p>Running</p></div></div></div>' +
      '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-info"><h3 id="statUnderMaintenance">0</h3><p>Under Maintenance</p></div></div></div>' +
      '<div class="stat-card stat-open"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="stat-info"><h3 id="statOpenJobs">0</h3><p>Open Jobs</p></div></div></div>' +
      '<div class="stat-card stat-running"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></div><div class="stat-info"><h3 id="statRunningJobs">0</h3><p>Running Jobs</p></div></div></div>' +
      '<div class="stat-card stat-closed"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="statClosedJobs">0</h3><p>Closed Jobs</p></div></div></div>' +
      '<div class="stat-card stat-approved"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="statApprovedJobs">0</h3><p>Approved Jobs</p></div></div></div>' +
      '<div class="stat-card stat-pending"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="stat-info"><h3 id="statPendingJobs">0</h3><p>Pending Approval</p></div></div></div>' +
      '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div class="stat-info"><h3 id="statWaitingJobs">0</h3><p>Waiting Jobs</p></div></div></div>' +
      '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="statTotalWaitingTime">0h</h3><p>Total Waiting Time</p></div></div></div>' +
      '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="statTotalWorkingTime">0h</h3><p>Total Working Time</p></div></div></div>' +
      '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="statTotalRepairTime">0h</h3><p>Total Repair Time</p></div></div></div>' +
      '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div><div class="stat-info"><h3 id="statBreakdownHours">0</h3><p>Total Downtime</p></div></div></div>' +
      '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 18l3 3 3-3"/><path d="M4 12h2l3-9 3 9h2"/></svg></div><div class="stat-info"><h3 id="statMTTR">N/A</h3><p>MTTR (hrs)</p></div></div></div>' +
      '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 18l3 3 3-3"/><path d="M20 12h-2l-3-9L9 3l-3 9H4"/></svg></div><div class="stat-info"><h3 id="statMTBF">N/A</h3><p>MTBF (hrs)</p></div></div></div>' +
      '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20L12 10"/><path d="M18 20L18 4"/><path d="M6 20L6 16"/></svg></div><div class="stat-info"><h3 id="statTotalOperatingHours">0</h3><p>Total Operating Hours</p></div></div></div>' +
      '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="statAvailability">0%</h3><p>Availability</p></div></div></div>' +
      '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div><div class="stat-info"><h3 id="statBreakdownMaint">0</h3><p>Breakdown Maint.</p></div></div></div>' +
      '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="statPreventiveMaint">0</h3><p>Preventive Maint.</p></div></div></div>' +
      '<div class="stat-card stat-purple"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="statPMDue">0</h3><p>PM Due</p></div></div></div>' +
      '<div class="stat-card stat-orange"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4M12 16h.01"/></svg></div><div class="stat-info"><h3 id="statPMOverdue">0</h3><p>PM Overdue</p></div></div></div>' +
      '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div><div class="stat-info"><h3 id="statLowStock">0</h3><p>Low Stock Parts</p></div></div></div>' +
      '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-info"><h3 id="statOutOfStock">0</h3><p>Out of Stock</p></div></div></div>' +
      '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="stat-info"><h3 id="statPMCompliance">0%</h3><p>PM Compliance</p></div></div></div>' +
      '<div class="stat-card stat-primary" onclick="navigateTo(\'qr\')" style="cursor:pointer"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg></div><div class="stat-info"><h3 id="statQRGenerated">0</h3><p>QR Codes</p></div></div></div>' +
       '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div><div class="stat-info"><h3 id="statStockValue">Rs. 0</h3><p>Inventory Value</p></div></div></div>' +
    '</div>' +

    '<div class="dashboard-grid" style="margin-bottom:16px;grid-template-columns:1fr">' +
      '<div class="card" style="padding:0">' +
        '<div class="card-header" style="padding:14px 18px">' +
          '<div class="card-title" style="font-size:14px;font-weight:600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>Recent Notifications</div>' +
          '<div class="card-actions" style="display:flex;gap:10px;align-items:center">' +
            '<span class="dash-notif-counter" id="dashNotifUnread" style="color:var(--danger)"><span class="counter-num" id="dashNotifUnreadNum">0</span> Unread</span>' +
            '<span class="dash-notif-counter" id="dashNotifCritical" style="color:var(--danger)"><span class="counter-num" id="dashNotifCriticalNum">0</span> Critical</span>' +
            '<span class="dash-notif-counter" id="dashNotifApproval" style="color:var(--purple)"><span class="counter-num" id="dashNotifApprovalNum">0</span> Pending Approval</span>' +
            '<button class="btn btn-xs btn-primary" onclick="navigateTo(\'notifications\')">View All</button>' +
          '</div>' +
        '</div>' +
        '<div id="dashboardNotifications" style="padding:0 18px 14px"><div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Loading notifications...</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="dashboard-grid" style="margin-bottom:16px;grid-template-columns:1fr">' +
      '<div class="card" style="padding:0">' +
        '<div class="card-header" style="padding:14px 18px">' +
          '<div class="card-title" style="font-size:14px;font-weight:600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>Recent Activities</div>' +
          '<div class="card-actions"><button class="btn btn-xs btn-secondary" onclick="navigateTo(\'audit\')">View All</button></div>' +
        '</div>' +
        '<div id="dashboardRecentActivities" style="padding:0 18px 14px"><div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Loading activities...</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="charts-grid">' +
      '<div class="chart-card"><div class="card-title">Job Status Overview <span class="chart-badge" id="jobStatusBadge">Current</span></div><div id="chartJobStatus" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">Priority Distribution <span class="chart-badge" id="priorityBadge">Current</span></div><div id="chartPriority" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">MTTR Trend <span class="chart-badge" id="mttrBadge">6 Months</span></div><div id="chartMTTR" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">MTBF Trend <span class="chart-badge" id="mtbfBadge">6 Months</span></div><div id="chartMTBF" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">Monthly Jobs <span class="chart-badge" id="monthlyJobsBadge">6 Months</span></div><div id="chartMonthlyJobs" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">Breakdown Trend <span class="chart-badge" id="breakdownBadge">6 Months</span></div><div id="chartBreakdown" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">Waiting Time Trend <span class="chart-badge" id="waitingTimeBadge">6 Periods</span></div><div id="chartWaitingTime" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">Downtime Trend <span class="chart-badge" id="downtimeBadge">6 Periods</span></div><div id="chartDowntime" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
      '<div class="chart-card"><div class="card-title">Monthly Maintenance Trend <span class="chart-badge" id="monthlyMaintBadge">6 Periods</span></div><div id="chartMonthlyMaintenance" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>' +
    '</div>';
  },

  bind: function() {
    document.addEventListener('visibilitychange', Dashboard._onVisChange);
  },

  setFilter: function(filter, btn) {
    Dashboard.filter = filter;
    var btns = document.querySelectorAll('.dashboard-filter-bar .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    Dashboard.load();
  },

  load: function() {
    var cards = document.querySelectorAll('#dashboardCards .stat-info');
    for (var i = 0; i < cards.length; i++) cards[i].classList.add('loading');

    var user = Session.getUser();
    var dept = user && user.department ? user.department : '';

    API.post('getDashboardData', { filter: Dashboard.filter, department: dept, email: user ? user.email : '' })
      .then(function(data) {
        console.log('===== P11.32 CF RECEIVED =====');
        console.log('pendingJobs=' + data.pendingJobs);
        console.log('approvedJobs=' + data.approvedJobs);
        console.log('mtbf=' + data.mtbf);
        console.log('breakdownJobCount=' + data.breakdownJobCount);
        console.log('breakdownMaintenanceCount=' + data.breakdownMaintenanceCount);
        console.log('_debug=', JSON.stringify(data._debug));
        for (var i = 0; i < cards.length; i++) cards[i].classList.remove('loading');
        Dashboard._renderStats(data);
        Dashboard._drawCharts(data);
        Dashboard.loadNotifications();
        Dashboard.loadActivities();
      })
      .catch(function(err) {
        for (var i = 0; i < cards.length; i++) cards[i].classList.remove('loading');
        Notify.error('Failed to load dashboard data');
      });
  },

  loadNotifications: function() {
    Dashboard._notifPage = 1;
    var user = Session.getUser();
    var email = user ? user.email : '';

    API.post('getNotifications', {})
      .then(function(result) {
        var items = Array.isArray(result) ? result : (result.data || result.records || []);
        Dashboard._notifAllItems = items;
        Dashboard._renderNotifications();
        var unread = 0, critical = 0, approval = 0;
        for (var i = 0; i < items.length; i++) {
          if ((items[i].ReadStatus || '').toLowerCase() !== 'read') unread++;
          if (items[i].Priority === 'Critical') critical++;
          if (items[i].NotificationType === 'Approval' || (items[i].Title && items[i].Title.toLowerCase().indexOf('approval') > -1)) approval++;
        }
        Dashboard._setText('dashNotifUnreadNum', unread);
        Dashboard._setText('dashNotifCriticalNum', critical);
        Dashboard._setText('dashNotifApprovalNum', approval);
      })
      .catch(function() {
        var el = document.getElementById('dashboardNotifications');
        if (el) el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Failed to load</div>';
      });
  },

  _updateNotifCounters: function() {
    var unread = 0, critical = 0, approval = 0;
    for (var i = 0; i < Dashboard._notifAllItems.length; i++) {
      var item = Dashboard._notifAllItems[i];
      if ((item.ReadStatus || '').toLowerCase() !== 'read') unread++;
      if (item.Priority === 'Critical') critical++;
      if (item.NotificationType === 'Approval' || (item.Title && item.Title.toLowerCase().indexOf('approval') > -1)) approval++;
    }
    Dashboard._setText('dashNotifUnreadNum', unread);
    Dashboard._setText('dashNotifCriticalNum', critical);
    Dashboard._setText('dashNotifApprovalNum', approval);
  },

  _renderNotifications: function() {
    var el = document.getElementById('dashboardNotifications');
    if (!el) return;
    var allUnread = [];
    for (var i = 0; i < Dashboard._notifAllItems.length; i++) {
      if ((Dashboard._notifAllItems[i].ReadStatus || '').toLowerCase() !== 'read') {
        allUnread.push(Dashboard._notifAllItems[i]);
      }
    }
    if (allUnread.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No unread notifications</div>';
      return;
    }
    var totalPages = Math.ceil(allUnread.length / Dashboard._notifPageSize);
    if (Dashboard._notifPage > totalPages) Dashboard._notifPage = totalPages;
    if (Dashboard._notifPage < 1) Dashboard._notifPage = 1;
    var start = (Dashboard._notifPage - 1) * Dashboard._notifPageSize;
    var pageItems = allUnread.slice(start, start + Dashboard._notifPageSize);
    var typeColors = {
      'Information': { color: '#06b6d4', bg: 'rgba(6,182,212,0.11)' },
      'Success': { color: '#22c55e', bg: 'rgba(34,197,94,0.11)' },
      'Warning': { color: '#f59e0b', bg: 'rgba(245,158,11,0.11)' },
      'Critical': { color: '#ef4444', bg: 'rgba(239,68,68,0.11)' },
      'Approval': { color: '#a855f7', bg: 'rgba(168,85,247,0.11)' },
      'Reminder': { color: '#f97316', bg: 'rgba(249,115,22,0.11)' },
      'System': { color: '#9498b8', bg: 'rgba(148,152,184,0.11)' }
    };
    var priorityBadge = { 'Critical': 'danger', 'High': 'warning', 'Medium': 'info', 'Low': 'success' };
    var html = '<div style="display:flex;flex-direction:column;gap:6px">';
    for (var i = 0; i < pageItems.length; i++) {
      var n = pageItems[i];
      var notifType = n.NotificationType || 'Information';
      var tc = typeColors[notifType] || typeColors['Information'];
      var priBadge = priorityBadge[n.Priority] || 'primary';
      var dt = n.CreatedDateTime || '';
      var displayDt = dt ? Utils.timeAgo(dt) : '';
      html +=
        '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);border-left:3px solid var(--primary);background:var(--primary-light)">' +
          '<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + tc.bg + ';color:' + tc.color + ';font-size:12px;font-weight:700">' + notifType.charAt(0) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + Utils.escapeHtml(n.Title) + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);display:flex;gap:6px;align-items:center">' +
              '<span class="badge badge-' + priBadge + '" style="font-size:8px;padding:0 5px">' + Utils.escapeHtml(n.Priority || '') + '</span>' +
              '<span class="badge badge-secondary" style="font-size:8px;padding:0 5px">' + Utils.escapeHtml(n.Module || '') + '</span>' +
              '<span>' + displayDt + '</span>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-xs btn-primary" onclick="Dashboard._notifView(\'' + (n.NotificationID || '') + '\')" style="flex-shrink:0;font-size:10px;padding:3px 8px">View</button>' +
        '</div>';
    }
    html += '</div>';
    if (totalPages > 1) {
      html += '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0 4px;border-top:1px solid var(--border);margin-top:6px">';
      html += '<button class="btn btn-xs btn-secondary" onclick="Dashboard._notifGoPage(' + (Dashboard._notifPage - 1) + ')"' + (Dashboard._notifPage <= 1 ? ' disabled' : '') + '>Previous</button>';
      html += '<span style="font-size:11px;color:var(--text-muted)">Page ' + Dashboard._notifPage + ' of ' + totalPages + '</span>';
      html += '<button class="btn btn-xs btn-secondary" onclick="Dashboard._notifGoPage(' + (Dashboard._notifPage + 1) + ')"' + (Dashboard._notifPage >= totalPages ? ' disabled' : '') + '>Next</button>';
      html += '</div>';
    }
    el.innerHTML = html;
  },

  _notifGoPage: function(p) {
    Dashboard._notifPage = p;
    Dashboard._renderNotifications();
  },

  _notifView: function(id) {
    var item = null;
    for (var i = 0; i < Dashboard._notifAllItems.length; i++) {
      if (Dashboard._notifAllItems[i].NotificationID === id) {
        item = Dashboard._notifAllItems[i];
        break;
      }
    }
    if (!item) return;
    var typeColors = {
      'Information': '#06b6d4', 'Success': '#22c55e', 'Warning': '#f59e0b',
      'Critical': '#ef4444', 'Approval': '#a855f7', 'Reminder': '#f97316', 'System': '#9498b8'
    };
    var notifType = item.NotificationType || 'Information';
    var color = typeColors[notifType] || '#06b6d4';
    var dt = item.CreatedDateTime || '';
    var displayDate = dt ? new Date(dt).toLocaleString() : 'N/A';
    var bodyHtml =
      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Title</div><div style="font-size:14px;font-weight:600;color:var(--text)">' + Utils.escapeHtml(item.Title || '') + '</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Message</div><div style="font-size:13px;color:var(--text);line-height:1.5">' + Utils.escapeHtml(item.Message || item.Body || '') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Date</div><div style="font-size:13px;color:var(--text)">' + displayDate + '</div></div>' +
          '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Severity</div><div><span class="badge" style="background:' + color + '20;color:' + color + ';padding:3px 8px;border-radius:4px;font-size:12px">' + Utils.escapeHtml(notifType) + '</span></div></div>' +
          '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Source</div><div style="font-size:13px;color:var(--text)">' + Utils.escapeHtml(item.Module || 'System') + '</div></div>' +
          '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Reference Number</div><div style="font-size:13px;color:var(--text)">' + Utils.escapeHtml(item.NotificationID || item.ReferenceNumber || 'N/A') + '</div></div>' +
        '</div>' +
      '</div>';
    Dashboard._showDetailModal('Notification Details', bodyHtml, function() {
      for (var j = 0; j < Dashboard._notifAllItems.length; j++) {
        if (Dashboard._notifAllItems[j].NotificationID === id) {
          Dashboard._notifAllItems[j].ReadStatus = 'Read';
          break;
        }
      }
      Dashboard._updateNotifCounters();
      Dashboard._renderNotifications();
      API.post('markNotificationRead', { id: id }).catch(function() {});
      if (typeof Badge !== 'undefined') Badge.refresh();
    });
  },

  loadActivities: function() {
    Dashboard._activityPage = 1;
    API.post('getAuditLogs', {})
      .then(function(data) {
        var items = Array.isArray(data) ? data : [];
        Dashboard._activityAllItems = items;
        Dashboard._renderActivities();
      })
      .catch(function() {
        var el = document.getElementById('dashboardRecentActivities');
        if (el) el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Failed to load</div>';
      });
  },

  _renderActivities: function() {
    var el = document.getElementById('dashboardRecentActivities');
    if (!el) return;
    if (!Dashboard._activityAllItems || Dashboard._activityAllItems.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No recent activities</div>';
      return;
    }
    var totalPages = Math.ceil(Dashboard._activityAllItems.length / Dashboard._activityPageSize);
    if (Dashboard._activityPage > totalPages) Dashboard._activityPage = totalPages;
    if (Dashboard._activityPage < 1) Dashboard._activityPage = 1;
    var start = (Dashboard._activityPage - 1) * Dashboard._activityPageSize;
    var pageItems = Dashboard._activityAllItems.slice(start, start + Dashboard._activityPageSize);
    var actionIcons = {
      'Login': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M9 3H5a2 2 0 00-2 2v10a2 2 0 002 2h4"/><polyline points="13 7 17 11 13 15"/><line x1="9" y1="11" x2="17" y2="11"/></svg>',
      'Logout': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M11 3H7a2 2 0 00-2 2v10a2 2 0 002 2h4"/><polyline points="17 7 13 11 17 15"/><line x1="13" y1="11" x2="5" y2="11"/></svg>',
      'Create': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>',
      'Update': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
      'Delete': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/></svg>',
      'Approve': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
      'Reject': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><circle cx="10" cy="10" r="9"/><path d="M7 7l6 6"/><path d="M13 7l-6 6"/></svg>',
      'Open': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
      'Start': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><circle cx="10" cy="10" r="9"/><path d="M8 6l6 4-6 4V6z"/></svg>',
      'Close': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      'Complete': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><circle cx="10" cy="10" r="9"/><path d="M7 10l2 2 4-4"/></svg>',
      'Cancel': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><circle cx="10" cy="10" r="9"/><line x1="15" y1="5" x2="5" y2="15"/></svg>'
    };
    var html = '<div style="display:flex;flex-direction:column;gap:4px">';
    for (var i = 0; i < pageItems.length; i++) {
      var r = pageItems[i];
      var icon = actionIcons[r.Action] || '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:middle"><circle cx="10" cy="10" r="9"/><path d="M9 9h2v5"/><path d="M9 12h3"/></svg>';
      var dt = r.DateTime || '';
      var displayDt = dt ? Utils.timeAgo(dt) : '';
      var globalIdx = start + i;
      html +=
        '<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:var(--radius-sm);background:var(--bg-input)">' +
          '<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-light);color:var(--primary);font-size:11px">' + icon + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
              '<span class="badge badge-secondary" style="font-size:8px;padding:0 4px;">' + Utils.escapeHtml(r.Action || '') + '</span> ' +
              Utils.escapeHtml(r.Module || '') +
            '</div>' +
            '<div style="font-size:10px;color:var(--text-muted);display:flex;gap:6px;align-items:center">' +
              Utils.escapeHtml(r.UserName || '') + ' &middot; ' + displayDt +
            '</div>' +
          '</div>' +
          '<button class="btn btn-xs btn-primary" onclick="Dashboard._activityView(' + globalIdx + ')" style="flex-shrink:0;font-size:10px;padding:3px 8px">View</button>' +
        '</div>';
    }
    html += '</div>';
    if (totalPages > 1) {
      html += '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0 4px;border-top:1px solid var(--border);margin-top:6px">';
      html += '<button class="btn btn-xs btn-secondary" onclick="Dashboard._activityGoPage(' + (Dashboard._activityPage - 1) + ')"' + (Dashboard._activityPage <= 1 ? ' disabled' : '') + '>Previous</button>';
      html += '<span style="font-size:11px;color:var(--text-muted)">Page ' + Dashboard._activityPage + ' of ' + totalPages + '</span>';
      html += '<button class="btn btn-xs btn-secondary" onclick="Dashboard._activityGoPage(' + (Dashboard._activityPage + 1) + ')"' + (Dashboard._activityPage >= totalPages ? ' disabled' : '') + '>Next</button>';
      html += '</div>';
    }
    el.innerHTML = html;
  },

  _activityGoPage: function(p) {
    Dashboard._activityPage = p;
    Dashboard._renderActivities();
  },

  _activityView: function(idx) {
    var item = Dashboard._activityAllItems[idx];
    if (!item) return;
    var actionColors = {
      'Login': '#22c55e', 'Logout': '#94a3b8', 'Create': '#06b6d4', 'Update': '#f59e0b',
      'Delete': '#ef4444', 'Approve': '#a855f7', 'Reject': '#ef4444', 'Open': '#3b82f6',
      'Start': '#22c55e', 'Close': '#f97316', 'Complete': '#22c55e', 'Cancel': '#ef4444'
    };
    var action = item.Action || 'Unknown';
    var color = actionColors[action] || '#94a3b8';
    var dt = item.DateTime || '';
    var displayDate = dt ? new Date(dt).toLocaleString() : 'N/A';
    var bodyHtml =
      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Action</div><div><span class="badge" style="background:' + color + '20;color:' + color + ';padding:3px 10px;border-radius:4px;font-size:13px;font-weight:600">' + Utils.escapeHtml(action) + '</span></div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Module</div><div style="font-size:14px;font-weight:600;color:var(--text)">' + Utils.escapeHtml(item.Module || 'N/A') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">User</div><div style="font-size:13px;color:var(--text)">' + Utils.escapeHtml(item.UserName || 'N/A') + '</div></div>' +
          '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Date & Time</div><div style="font-size:13px;color:var(--text)">' + displayDate + '</div></div>' +
        '</div>' +
        (item.Description || item.Details ? '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Details</div><div style="font-size:13px;color:var(--text);line-height:1.5">' + Utils.escapeHtml(item.Description || item.Details || '') + '</div></div>' : '') +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Reference Number</div><div style="font-size:13px;color:var(--text)">' + Utils.escapeHtml(item.AuditID || item.ReferenceNumber || 'N/A') + '</div></div>' +
      '</div>';
    Dashboard._showDetailModal('Activity Details', bodyHtml, function() {
      Dashboard._activityAllItems.splice(idx, 1);
      Dashboard._renderActivities();
    });
  },

  _setText: function(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  },

  _showDetailModal: function(title, bodyHtml, onClose) {
    var existing = document.getElementById('dashDetailModal');
    if (existing) existing.remove();
    var backdrop = document.createElement('div');
    backdrop.id = 'dashDetailModal';
    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px)';
    backdrop.innerHTML =
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;width:90%;max-width:520px;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)">' +
          '<div style="font-size:15px;font-weight:600;color:var(--text)">' + title + '</div>' +
          '<button onclick="Dashboard._closeDetailModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:20px;padding:0 4px">&times;</button>' +
        '</div>' +
        '<div style="padding:20px">' + bodyHtml + '</div>' +
        '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">' +
          '<button class="btn btn-secondary" onclick="Dashboard._closeDetailModal()">Close</button>' +
        '</div>' +
      '</div>';
    backdrop.onclick = function(e) { if (e.target === backdrop) Dashboard._closeDetailModal(); };
    document.body.appendChild(backdrop);
    backdrop._onClose = onClose || null;
  },

  _closeDetailModal: function() {
    var backdrop = document.getElementById('dashDetailModal');
    if (!backdrop) return;
    var cb = backdrop._onClose;
    backdrop.remove();
    if (typeof cb === 'function') cb();
  },

  _renderStats: function(data) {
    Dashboard._setText('statMachines', data.totalMachines);
    Dashboard._setText('statRunningMachines', data.runningMachines);
    Dashboard._setText('statUnderMaintenance', data.breakdownMachines);
    Dashboard._setText('statOpenJobs', data.openJobs);
    Dashboard._setText('statRunningJobs', data.runningJobs);
    Dashboard._setText('statClosedJobs', data.closedJobs);
    Dashboard._setText('statApprovedJobs', data.approvedJobs);
    Dashboard._setText('statPendingJobs', data.pendingJobs);
    Dashboard._setText('statWaitingJobs', data.waitingJobs);
    Dashboard._kpiSetCard('statTotalWaitingTime', Math.round(data.totalWaitingTimeMinutes || 0));
    Dashboard._kpiSetCard('statTotalWorkingTime', Math.round(data.totalWorkingTimeMinutes || 0));
    Dashboard._kpiSetCard('statTotalRepairTime', Math.round(data.totalRepairTimeMinutes || 0));
    Dashboard._kpiSetCard('statBreakdownHours', Math.round(data.totalDowntimeMinutes != null ? data.totalDowntimeMinutes : (data.breakdownHours || 0) * 60));
    Dashboard._kpiStartToggle();
    Dashboard._setText('statMTTR', data.mttr !== null && data.mttr !== undefined ? data.mttr : 'N/A');
    Dashboard._setText('statMTBF', data.mtbf !== null && data.mtbf !== undefined ? data.mtbf : 'N/A');
    Dashboard._setText('statTotalOperatingHours', data.totalMachineRuntimeHours !== null && data.totalMachineRuntimeHours !== undefined ? data.totalMachineRuntimeHours : 0);
    Dashboard._setText('statAvailability', (data.availability || 0) + '%');
    Dashboard._setText('statBreakdownMaint', data.breakdownMaintenanceCount || 0);
    Dashboard._setText('statPreventiveMaint', data.preventiveMaintenanceCount || 0);
    Dashboard._setText('statPMDue', data.pmDue);
    Dashboard._setText('statPMOverdue', data.pmOverdue);
    Dashboard._setText('statLowStock', data.lowStockParts);
    Dashboard._setText('statOutOfStock', data.outOfStockParts);
    Dashboard._setText('statPMCompliance', (data.pmCompliance || 0) + '%');
    Dashboard._setText('statQRGenerated', data.qrGenerated);
    Dashboard._setText('statStockValue', Utils.formatCurrencyPKR(data.totalStockValue));
  },

  _kpiFormatHours: function(minutes) {
    return Duration.formatHours(minutes);
  },

  _kpiFormatDays: function(minutes) {
    return Duration.formatDays(minutes);
  },

  _kpiTick: function() {
    Dashboard._kpiToggleState = Dashboard._kpiToggleState === 0 ? 1 : 0;
    var ids = ['statTotalWaitingTime', 'statTotalWorkingTime', 'statTotalRepairTime', 'statBreakdownHours'];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var card = Dashboard._kpiCards[id];
      if (!card || card.minutes == null) continue;
      var el = document.getElementById(id);
      if (!el) continue;
      el.classList.add('kpi-fade-out');
      (function(el, card) {
        setTimeout(function() {
          el.textContent = Dashboard._kpiToggleState === 0 ? Dashboard._kpiFormatDays(card.minutes) : Dashboard._kpiFormatHours(card.minutes);
          el.classList.remove('kpi-fade-out');
          el.classList.add('kpi-fade-in');
          setTimeout(function() { el.classList.remove('kpi-fade-in'); }, 360);
        }, 350);
      })(el, card);
    }
  },

  _kpiStartToggle: function() {
    if (Dashboard._kpiTimer) clearInterval(Dashboard._kpiTimer);
    Dashboard._kpiToggleState = 0;
    Dashboard._kpiTimer = setInterval(Dashboard._kpiTick, 3000);
  },

  _kpiSetCard: function(id, minutes) {
    Dashboard._kpiCards[id] = { minutes: minutes };
    var el = document.getElementById(id);
    if (el) el.textContent = Dashboard._kpiFormatDays(minutes);
  },

  _chartLoadRetries: 0,
  _chartLoadTimer: null,
  _chartLoadMaxRetries: 3,
  _chartLoadTimeoutMs: 10000,

  _drawCharts: function(data) {
    if (!Dashboard.chartsLoaded) {
      if (typeof google !== 'undefined' && google.charts) {
        Dashboard._startChartLoadWithTimeout(data);
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(function() {
          Dashboard._clearChartLoadTimer();
          Dashboard.chartsLoaded = true;
          Dashboard._chartLoadRetries = 0;
          Dashboard._doDrawCharts(data);
        });
      } else {
        Dashboard._loadGoogleCharts(function() {
          Dashboard._clearChartLoadTimer();
          Dashboard.chartsLoaded = true;
          Dashboard._chartLoadRetries = 0;
          Dashboard._doDrawCharts(data);
        });
      }
    } else {
      Dashboard._doDrawCharts(data);
    }
  },

  _startChartLoadWithTimeout: function(data) {
    Dashboard._clearChartLoadTimer();
    Dashboard._chartLoadTimer = setTimeout(function() {
      if (Dashboard.chartsLoaded) return;
      if (Dashboard._chartLoadRetries < Dashboard._chartLoadMaxRetries) {
        Dashboard._chartLoadRetries++;
        console.log('[Dashboard] Google Charts load timeout, retry ' + Dashboard._chartLoadRetries + '/' + Dashboard._chartLoadMaxRetries);
        Dashboard._loadGoogleCharts(function() {
          Dashboard._clearChartLoadTimer();
          Dashboard.chartsLoaded = true;
          Dashboard._chartLoadRetries = 0;
          Dashboard._doDrawCharts(data);
        });
      } else {
        Dashboard._clearChartLoadTimer();
        console.error('[Dashboard] Google Charts failed to load after ' + Dashboard._chartLoadMaxRetries + ' retries');
        Dashboard._showChartError();
      }
    }, Dashboard._chartLoadTimeoutMs);
  },

  _clearChartLoadTimer: function() {
    if (Dashboard._chartLoadTimer) {
      clearTimeout(Dashboard._chartLoadTimer);
      Dashboard._chartLoadTimer = null;
    }
  },

  _showChartError: function() {
    var ids = ['chartJobStatus', 'chartPriority', 'chartMTTR', 'chartMTBF', 'chartMonthlyJobs', 'chartBreakdown', 'chartWaitingTime', 'chartDowntime', 'chartMonthlyMaintenance'];
    var msg = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;margin-bottom:8px;opacity:0.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><div>Charts could not be loaded</div><div style="font-size:11px;margin-top:4px;opacity:0.6">Check your connection or try refreshing</div></div>';
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.textContent.indexOf('Loading chart') > -1) el.innerHTML = msg;
    }
  },

  _loadGoogleCharts: function(callback) {
    if (typeof google !== 'undefined' && google.charts) {
      google.charts.load('current', { packages: ['corechart'] });
      google.charts.setOnLoadCallback(callback);
      return;
    }
    var existingScript = document.querySelector('script[src*="gstatic.com/charts/loader.js"]');
    if (existingScript) {
      var checkGoogle = function(attempts) {
        if (typeof google !== 'undefined' && google.charts) {
          google.charts.load('current', { packages: ['corechart'] });
          google.charts.setOnLoadCallback(callback);
        } else if (attempts < 20) {
          setTimeout(function() { checkGoogle(attempts + 1); }, 250);
        } else {
          console.error('[Dashboard] Google Charts loader found but google.charts not available');
        }
      };
      checkGoogle(0);
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.onload = function() {
      if (typeof google !== 'undefined' && google.charts) {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(callback);
      } else {
        console.error('[Dashboard] loader.js loaded but google.charts not defined');
      }
    };
    script.onerror = function() {
      console.error('[Dashboard] Failed to load Google Charts from CDN');
    };
    document.head.appendChild(script);
  },

  _doDrawCharts: function(data) {
    try {
      if (typeof google === 'undefined' || !google.visualization) {
        console.warn('[Dashboard] google.visualization not available, will retry');
        if (Dashboard._chartLoadRetries < Dashboard._chartLoadMaxRetries) {
          Dashboard._chartLoadRetries++;
          setTimeout(function() { Dashboard._doDrawCharts(data); }, 500);
        } else {
          Dashboard._showChartError();
        }
        return;
      }
      var c = data.charts || {};
      var months = c.months || [];
      var op = c.openJobs || [];
      var rn = c.runningJobs || [];
      var cl = c.closedJobs || [];
      var pd = c.pendingJobs || [];
      var ap = c.approvedJobs || [];
      var bd = c.breakdowns || [];
      var mt = c.mttr || [];
      var mf = c.mtbf || [];
      var animCfg = { startup: true, duration: 800, easing: 'out' };
      var tooltipStyle = 'text-align:left;padding:10px 14px;font-size:13px;line-height:1.6;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:inherit;';

      Dashboard._drawJobStatus(data, animCfg, tooltipStyle);
      Dashboard._drawPriority(data, animCfg, tooltipStyle);
      Dashboard._drawMTTR(mt, months, data, animCfg, tooltipStyle);
      Dashboard._drawMTBF(mf, months, data, animCfg, tooltipStyle);
      Dashboard._drawMonthlyJobs(op, rn, cl, pd, ap, months, animCfg, tooltipStyle);
      Dashboard._drawBreakdown(bd, months, animCfg, tooltipStyle);
      Dashboard._drawWaitingTime(c.waitingTime || [], months, animCfg, tooltipStyle);
      Dashboard._drawDowntime(c.downtime || [], months, animCfg, tooltipStyle);
      Dashboard._drawMonthlyMaintenance(c.monthlyMaintenance || [], months, animCfg, tooltipStyle);
    } catch (e) {
      console.error('[Dashboard] Chart error:', e);
      Dashboard._showChartError();
    }
  },

  _drawJobStatus: function(data, animCfg, tooltipStyle) {
    var div = document.getElementById('chartJobStatus');
    if (!div) return;
    var statusCounts = [
      { name: 'Open', count: data.openJobs || 0, color: '#3B82F6' },
      { name: 'Running', count: data.runningJobs || 0, color: '#22C55E' },
      { name: 'Closed', count: data.closedJobs || 0, color: '#6B7280' },
      { name: 'Pending', count: data.pendingJobs || 0, color: '#F97316' },
      { name: 'Approved', count: data.approvedJobs || 0, color: '#A855F7' }
    ];
    var statusTotal = 0;
    for (var i = 0; i < statusCounts.length; i++) statusTotal += statusCounts[i].count;
    if (statusTotal === 0) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No job status data available</div>'; return; }
    div.innerHTML = '';
    var rows = [['Status', 'Count', { role: 'style' }, { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < statusCounts.length; i++) {
      var r = statusCounts[i];
      var pct = statusTotal > 0 ? Math.round((r.count / statusTotal) * 100) : 0;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:' + r.color + '">' + r.name + '</div><div>Jobs: <b>' + r.count + '</b></div><div>Share: <b>' + pct + '%</b> of ' + statusTotal + ' total</div></div>';
      rows.push([r.name, r.count, r.color, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.ColumnChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 20, bottom: 50, width: '90%', height: '65%' }, legend: { position: 'bottom', textStyle: { color: '#9498b8', fontSize: 11 } }, hAxis: { textStyle: { color: '#9498b8', fontSize: 11 }, gridlines: { color: 'transparent' }, slantedText: false }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, bar: { groupWidth: '60%' }, tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg, enableInteractivity: true });
    Dashboard._addDataLabels(div, statusCounts, statusTotal);
  },

  _drawPriority: function(data, animCfg, tooltipStyle) {
    var div = document.getElementById('chartPriority');
    if (!div) return;
    var priCounts = [
      { name: 'Critical', count: data.criticalPriority || 0, color: '#EF4444' },
      { name: 'High', count: data.highPriority || 0, color: '#F97316' },
      { name: 'Medium', count: data.mediumPriority || 0, color: '#3B82F6' },
      { name: 'Low', count: data.lowPriority || 0, color: '#22C55E' }
    ];
    var priTotal = 0;
    for (var i = 0; i < priCounts.length; i++) priTotal += priCounts[i].count;
    if (priTotal === 0) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No priority data available</div>'; return; }
    div.innerHTML = '';
    var rows = [['Priority', 'Count', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < priCounts.length; i++) {
      var r = priCounts[i];
      var pct = priTotal > 0 ? Math.round((r.count / priTotal) * 100) : 0;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:' + r.color + '">' + r.name + '</div><div>Jobs: <b>' + r.count + '</b></div><div>Share: <b>' + pct + '%</b> of ' + priTotal + ' total</div></div>';
      rows.push([r.name, r.count, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var colors = [];
    for (var i = 0; i < priCounts.length; i++) colors.push(priCounts[i].color);
    var chart = new google.visualization.PieChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 10, right: 10, top: 10, bottom: 40, width: '90%', height: '70%' }, legend: { position: 'bottom', textStyle: { color: '#9498b8', fontSize: 11 } }, colors: colors, pieHole: 0.45, tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, pieSliceText: 'none', animation: animCfg });
  },

  _drawMTTR: function(mt, months, data, animCfg, tooltipStyle) {
    var div = document.getElementById('chartMTTR');
    if (!div) return;
    var hasData = false;
    for (var i = 0; i < mt.length; i++) { if (mt[i] !== null && mt[i] > 0) { hasData = true; break; } }
    if (!hasData) {
      div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;margin-bottom:8px;opacity:0.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><div>Not enough maintenance history</div><div style="font-size:11px;margin-top:4px;opacity:0.6">MTTR data will appear once job cards are closed</div></div>';
      var badge = document.getElementById('mttrBadge');
      if (badge) badge.textContent = data.mttr ? data.mttr + 'h' : 'N/A';
      return;
    }
    var stats = data.mttrStats || { avg: 0, max: 0, min: 0 };
    div.innerHTML = '';
    var rows = [['Period', 'MTTR (hrs)', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var val = (mt[i] !== null && mt[i] !== undefined) ? mt[i] : null;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#3B82F6">MTTR</div><div>Period: <b>' + months[i] + '</b></div><div>MTTR: <b>' + (val !== null ? val.toFixed(1) + ' hrs' : 'N/A') + '</b></div>';
      if (stats.avg > 0) tip += '<div style="margin-top:4px;border-top:1px solid #eee;padding-top:4px;font-size:11px;color:#888">Avg: ' + stats.avg.toFixed(1) + 'h &middot; Max: ' + stats.max.toFixed(1) + 'h &middot; Min: ' + stats.min.toFixed(1) + 'h</div>';
      tip += '</div>';
      rows.push([months[i], val, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var opts = { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'none' }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#3B82F6'], curveType: 'function', lineWidth: 3, pointSize: 6, pointShape: 'circle', tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg };
    if (stats.avg > 0) {
      dt.addColumn('number', 'Average');
      dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });
      for (var i = 0; i < months.length; i++) {
        var avgTip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;color:#94A3B8">Average MTTR</div><div>' + stats.avg.toFixed(1) + ' hours</div></div>';
        dt.setCell(i, 3, stats.avg, avgTip);
      }
      opts.colors.push('#94A3B8');
      opts.lineDashStyle = [6, 4];
      opts.series = { 1: { lineDashStyle: [6, 4], lineWidth: 1, pointSize: 0, enableInteractivity: false } };
    }
    var chart = new google.visualization.LineChart(div);
    chart.draw(dt, opts);
    var badge = document.getElementById('mttrBadge');
    if (badge) {
      var last = mt[mt.length - 1];
      if (last !== null && last !== undefined) badge.textContent = last.toFixed(1) + 'h';
      else if (data.mttr) badge.textContent = data.mttr + 'h';
      else badge.textContent = 'N/A';
    }
  },

  _drawMTBF: function(mf, months, data, animCfg, tooltipStyle) {
    var div = document.getElementById('chartMTBF');
    if (!div) return;
    var hasData = false;
    for (var i = 0; i < mf.length; i++) { if (mf[i] !== null && mf[i] > 0) { hasData = true; break; } }
    if (!hasData) {
      div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;margin-bottom:8px;opacity:0.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><div>Not enough maintenance history</div><div style="font-size:11px;margin-top:4px;opacity:0.6">MTBF data will appear after multiple breakdowns are recorded</div></div>';
      var badge = document.getElementById('mtbfBadge');
      if (badge) badge.textContent = data.mtbf ? data.mtbf + 'd' : 'N/A';
      return;
    }
    div.innerHTML = '';
    var rows = [['Period', 'MTBF (days)', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var val = (mf[i] !== null && mf[i] !== undefined) ? mf[i] : null;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#22C55E">MTBF</div><div>Period: <b>' + months[i] + '</b></div><div>MTBF: <b>' + (val !== null ? val.toFixed(1) + ' days' : 'N/A') + '</b></div></div>';
      rows.push([months[i], val, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.LineChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'none' }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#22C55E'], curveType: 'function', lineWidth: 3, pointSize: 6, pointShape: 'circle', tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg });
    var badge = document.getElementById('mtbfBadge');
    if (badge) {
      var last = mf[mf.length - 1];
      if (last !== null && last !== undefined) badge.textContent = last.toFixed(1) + 'd';
      else if (data.mtbf) badge.textContent = data.mtbf + 'd';
      else badge.textContent = 'N/A';
    }
  },

  _drawMonthlyJobs: function(op, rn, cl, pd, ap, months, animCfg, tooltipStyle) {
    var div = document.getElementById('chartMonthlyJobs');
    if (!div) return;
    var has = false;
    for (var i = 0; i < months.length; i++) { if (op[i] > 0 || rn[i] > 0 || cl[i] > 0 || pd[i] > 0 || ap[i] > 0) { has = true; break; } }
    if (!has) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No monthly job data</div>'; return; }
    var rows = [['Month', 'Open', 'Running', 'Pending', 'Closed', 'Approved', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var total = op[i] + rn[i] + pd[i] + cl[i] + ap[i];
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:6px">' + months[i] + '</div><div style="display:flex;flex-direction:column;gap:2px">';
      if (op[i] > 0) tip += '<div style="color:#3B82F6">Open: <b>' + op[i] + '</b></div>';
      if (rn[i] > 0) tip += '<div style="color:#22C55E">Running: <b>' + rn[i] + '</b></div>';
      if (pd[i] > 0) tip += '<div style="color:#F97316">Pending: <b>' + pd[i] + '</b></div>';
      if (cl[i] > 0) tip += '<div style="color:#6B7280">Closed: <b>' + cl[i] + '</b></div>';
      if (ap[i] > 0) tip += '<div style="color:#A855F7">Approved: <b>' + ap[i] + '</b></div>';
      tip += '<div style="border-top:1px solid #eee;padding-top:3px;margin-top:3px;font-weight:600">Total: ' + total + '</div></div></div>';
      rows.push([months[i], op[i], rn[i], pd[i], cl[i], ap[i], tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.ColumnChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'bottom', textStyle: { color: '#9498b8', fontSize: 10 } }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#3B82F6', '#22C55E', '#F97316', '#6B7280', '#A855F7'], bar: { groupWidth: '65%' }, isStacked: true, tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg });
  },

  _drawBreakdown: function(bd, months, animCfg, tooltipStyle) {
    var div = document.getElementById('chartBreakdown');
    if (!div) return;
    var has = false;
    for (var i = 0; i < bd.length; i++) { if (bd[i] > 0) { has = true; break; } }
    if (!has) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No breakdown data</div>'; return; }
    var total = 0;
    for (var i = 0; i < bd.length; i++) total += bd[i];
    var rows = [['Month', 'Breakdowns', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var pct = total > 0 ? Math.round((bd[i] / total) * 100) : 0;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#EF4444">Breakdowns</div><div>Period: <b>' + months[i] + '</b></div><div>Count: <b>' + bd[i] + '</b></div><div>Share: <b>' + pct + '%</b> of ' + total + ' total</div></div>';
      rows.push([months[i], bd[i], tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.AreaChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'none' }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#EF4444'], lineWidth: 2, curveType: 'function', pointSize: 5, pointShape: 'circle', areaOpacity: 0.15, tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg });
  },

  _drawWaitingTime: function(wt, months, animCfg, tooltipStyle) {
    var div = document.getElementById('chartWaitingTime');
    if (!div) return;
    var has = false;
    for (var i = 0; i < wt.length; i++) { if (wt[i] > 0) { has = true; break; } }
    if (!has) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No waiting time data</div>'; return; }
    var rows = [['Period', 'Waiting Time (hrs)', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var val = wt[i] || 0;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#F59E0B">Waiting Time</div><div>Period: <b>' + months[i] + '</b></div><div>Hours: <b>' + val.toFixed(1) + '</b></div></div>';
      rows.push([months[i], val, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.AreaChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'none' }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#F59E0B'], lineWidth: 2, curveType: 'function', pointSize: 5, pointShape: 'circle', areaOpacity: 0.15, tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg });
  },

  _drawDowntime: function(dtArr, months, animCfg, tooltipStyle) {
    var div = document.getElementById('chartDowntime');
    if (!div) return;
    var has = false;
    for (var i = 0; i < dtArr.length; i++) { if (dtArr[i] > 0) { has = true; break; } }
    if (!has) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No downtime data</div>'; return; }
    var rows = [['Period', 'Downtime (hrs)', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var val = dtArr[i] || 0;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#EF4444">Downtime</div><div>Period: <b>' + months[i] + '</b></div><div>Hours: <b>' + val.toFixed(1) + '</b></div></div>';
      rows.push([months[i], val, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.AreaChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'none' }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#EF4444'], lineWidth: 2, curveType: 'function', pointSize: 5, pointShape: 'circle', areaOpacity: 0.15, tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg });
  },

  _drawMonthlyMaintenance: function(mmArr, months, animCfg, tooltipStyle) {
    var div = document.getElementById('chartMonthlyMaintenance');
    if (!div) return;
    var has = false;
    for (var i = 0; i < mmArr.length; i++) { if (mmArr[i] > 0) { has = true; break; } }
    if (!has) { div.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No maintenance data</div>'; return; }
    var rows = [['Period', 'Job Cards', { role: 'tooltip', type: 'string', p: { html: true } }]];
    for (var i = 0; i < months.length; i++) {
      var val = mmArr[i] || 0;
      var tip = '<div style="' + tooltipStyle + '"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#3B82F6">Maintenance Activity</div><div>Period: <b>' + months[i] + '</b></div><div>Total Jobs: <b>' + val + '</b></div></div>';
      rows.push([months[i], val, tip]);
    }
    var dt = google.visualization.arrayToDataTable(rows);
    var chart = new google.visualization.LineChart(div);
    chart.draw(dt, { backgroundColor: 'transparent', chartArea: { left: 40, right: 20, top: 15, bottom: 35, width: '90%', height: '65%' }, legend: { position: 'none' }, hAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'transparent' } }, vAxis: { textStyle: { color: '#9498b8', fontSize: 10 }, gridlines: { color: 'rgba(255,255,255,0.06)' }, minValue: 0 }, colors: ['#3B82F6'], lineWidth: 3, curveType: 'function', pointSize: 6, pointShape: 'circle', tooltip: { isHtml: true, textStyle: { color: '#333', fontSize: 12 } }, animation: animCfg });
  },

  _addDataLabels: function(divEl, items, total) {
    var bars = divEl.querySelectorAll('rect');
    if (!bars || bars.length === 0) return;
    var rects = [];
    for (var i = 0; i < bars.length; i++) {
      var r = bars[i];
      if (r.getAttribute('fill') && r.getAttribute('height') && parseFloat(r.getAttribute('height')) > 2) rects.push(r);
    }
    var counts = [];
    for (var i = 0; i < items.length; i++) counts.push(items[i].count);
    for (var i = 0; i < rects.length && i < counts.length; i++) {
      var count = counts[i];
      if (count <= 0) continue;
      var rect = rects[i];
      var textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      var rx = parseFloat(rect.getAttribute('x')) + parseFloat(rect.getAttribute('width')) / 2;
      var ry = parseFloat(rect.getAttribute('y')) - 6;
      textEl.setAttribute('x', rx);
      textEl.setAttribute('y', ry < 10 ? 14 : ry);
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('fill', '#ccc');
      textEl.setAttribute('font-size', '12');
      textEl.setAttribute('font-weight', '600');
      textEl.textContent = count;
      rect.parentNode.appendChild(textEl);
    }
  },

  _onVisChange: function() {
    if (!document.hidden && Router.current === 'dashboard') {
      Dashboard.load();
    }
  },

  destroy: function() {
    if (Dashboard._kpiTimer) clearInterval(Dashboard._kpiTimer);
    document.removeEventListener('visibilitychange', Dashboard._onVisChange);
  }
};
