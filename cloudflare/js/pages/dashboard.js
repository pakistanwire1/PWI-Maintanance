/* ============================================================
   dashboard.js — Dashboard Page Module
   GAS-identical: DashboardPage.html
   The dashboard HTML is already in index.html (19 stat cards,
   charts, notifications, activities). The inline script
   defines loadDashboardData(), setDashboardFilter(),
   loadDashboardNotifications(), loadDashboardRecentActivities(),
   drawDashboardCharts(). This module just registers the page
   so App.loadPage works correctly.
   ============================================================ */

(function() {
  App.registerPage('dashboard', null, function() {
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  });
})();
