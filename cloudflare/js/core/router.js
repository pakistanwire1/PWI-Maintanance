var Router = {
  pages: {},
  current: null,
  _prevPage: null,

  register: function(name, handler) {
    Router.pages[name] = handler;
  },

  navigate: function(page) {
    console.log('[TRACE] Router.navigate entered, page=' + page);
    if (!page) page = 'dashboard';

    if (typeof Session !== 'undefined' && !Session.isLoggedIn()) {
      console.log('[TRACE] Router.navigate: not logged in, redirecting to login');
      var loginEl = document.getElementById('loginPage');
      var appEl = document.getElementById('appContainer');
      if (loginEl) loginEl.style.display = 'block';
      if (appEl) appEl.style.display = 'none';
      try { window.location.hash = ''; } catch(e) {}
      return;
    }

    var handler = Router.pages[page];
    if (!handler) {
      console.log('[TRACE] Router.navigate: page not found, falling back to dashboard');
      page = 'dashboard';
      handler = Router.pages['dashboard'];
    }

    if (typeof Session !== 'undefined' && typeof Session.canAccessPage === 'function' && !Session.canAccessPage(page)) {
      console.log('[TRACE] Router.navigate: page blocked by permissions, redirecting to dashboard');
      page = 'dashboard';
      handler = Router.pages['dashboard'];
    }
    if (!handler) {
      console.log('[TRACE] Router.navigate: no handler for dashboard either, aborting');
      return;
    }

    if (typeof QRCodes !== 'undefined' && typeof QRCodes.stopCameraScanner === 'function') {
      QRCodes.stopCameraScanner();
    }

    Nav.setActivePage(page);
    Router.current = page;

    var notifPanel = document.getElementById('notificationPanel');
    if (notifPanel) notifPanel.classList.remove('open');
    var notifOverlay = document.getElementById('notificationOverlay');
    if (notifOverlay) notifOverlay.classList.remove('show');
    var emailPanel = document.getElementById('emailPanel');
    if (emailPanel) emailPanel.classList.remove('open');

    var content = document.getElementById('pageContent');
    if (!content) return;

    try {
      var prevHandler = Router.pages[Router._prevPage];
      if (prevHandler && typeof prevHandler.destroy === 'function') prevHandler.destroy();
    } catch(e) {}
    Router._prevPage = page;

    try { history.pushState({ page: page }, '', '#' + page); } catch(e) {}
    try { localStorage.setItem('cmms_last_page', page); } catch(e) {}

    console.log('[TRACE] Router.navigate: setting loading HTML');
    content.innerHTML = '<div class="empty-state"><div class="spinner" style="width:36px;height:36px;margin:0 auto 14px"></div><p>Loading...</p></div>';
    console.log('[TRACE] Router.navigate: about to call handler');

    try {
      console.log('[TRACE] Router.navigate: handler call enter');
      handler(content, page);
      console.log('[TRACE] Router.navigate: handler returned successfully');
    } catch(e) {
      console.log('[TRACE] Router.navigate: EXCEPTION caught! message=' + e.message + ', stack=' + (e.stack || 'no stack'));
    }
    console.log('[TRACE] Router.navigate: function end');
  },

  handleHash: function() {
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    Router.navigate(hash);
  },

  init: function() {
    console.log('[TRACE] Router.init entered');
    window.addEventListener('popstate', function(e) {
      console.log('[TRACE] popstate fired, hash=' + window.location.hash);
      if (e.state && e.state.page) {
        Router.navigate(e.state.page);
      } else {
        Router.handleHash();
      }
    });
    console.log('[TRACE] Router.init: calling handleHash');
    Router.handleHash();
    console.log('[TRACE] Router.init: finished');
  }
};

function navigateTo(page) { Router.navigate(page); }
function refreshCurrentPage() { Router.navigate(Router.current || 'dashboard'); }
function onGlobalSearch(val) { /* placeholder for global search */ }
function onNotifSearchInput() {
  Nav._notifPage = 1;
  var val = (document.getElementById('notifSearchInput') || {}).value || '';
  var items = Nav._notifData || [];
  if (val) {
    var q = val.toLowerCase();
    items = items.filter(function(n) {
      return (n.Title && n.Title.toLowerCase().indexOf(q) > -1) ||
             (n.Message && n.Message.toLowerCase().indexOf(q) > -1) ||
             (n.Module && n.Module.toLowerCase().indexOf(q) > -1);
    });
  }
  Nav._renderNotificationList(items);
}
function setNotifListFilter(f) {
  Nav._notifFilter = f;
  Nav._notifPage = 1;
  var tabs = document.querySelectorAll('.notif-filter-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].getAttribute('data-filter') === f);
  }
  Nav._renderNotificationList(Nav._notifData || []);
}
function applyNotifListFilters() {
  Nav._notifPage = 1;
  var items = Nav._notifData || [];
  var pri = (document.getElementById('notifFilterPriority') || {}).value || '';
  var mod = (document.getElementById('notifFilterModule') || {}).value || '';
  var typ = (document.getElementById('notifFilterType') || {}).value || '';
  if (pri) items = items.filter(function(n) { return n.Priority === pri; });
  if (mod) items = items.filter(function(n) { return n.Module === mod; });
  if (typ) items = items.filter(function(n) { return n.NotificationType === typ; });
  Nav._renderNotificationList(items);
}
function markAllNotifRead() {
  Nav._notifPage = 1;
  API.post('markAllNotificationsRead', {})
    .then(function() {
      (Nav._notifData || []).forEach(function(n) { n.ReadStatus = 'Read'; });
      Nav._renderNotificationList(Nav._notifData);
      Badge.refresh();
      if (typeof Dashboard !== 'undefined' && Dashboard.loadNotifications) Dashboard.loadNotifications();
      Notify.success('All notifications marked as read');
    })
    .catch(function() { Notify.error('Failed to mark all as read'); });
}
function deleteAllNotifications() {
  if (!confirm('Clear all notifications? This cannot be undone.')) return;
  Nav._notifPage = 1;
  API.post('clearAllNotifications', {})
    .then(function() {
      Nav._notifData = [];
      Nav._renderNotificationList([]);
      Badge.refresh();
      if (typeof Dashboard !== 'undefined' && Dashboard.loadNotifications) Dashboard.loadNotifications();
      Notify.success('All notifications cleared');
    })
    .catch(function() { Notify.error('Failed to clear notifications'); });
}
function emailRetryFailed() {
  API.post('emailRetryFailed', {})
    .then(function(result) {
      var msg = result ? (result.succeeded || 0) + ' retried, ' + (result.failed || 0) + ' failed' : 'Retry completed';
      Notify.success(msg);
      Nav.loadEmailPanelData();
      Badge.refresh();
    })
    .catch(function() { Notify.error('Failed to retry emails'); });
}
function openApproveJobCard() { navigateTo('approvejobcard'); }
function installPWA() {
  var banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
  if (window._deferredPrompt) {
    window._deferredPrompt.prompt();
    window._deferredPrompt = null;
  }
}
function dismissInstall() {
  var banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
  try { localStorage.setItem('cmms_install_dismissed', '1'); } catch(e) {}
}
