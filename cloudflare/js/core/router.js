var Router = {
  pages: {},
  current: null,

  register: function(name, handler) {
    Router.pages[name] = handler;
  },

  navigate: function(page) {
    if (!page) page = 'dashboard';
    var handler = Router.pages[page];
    if (!handler) {
      page = 'dashboard';
      handler = Router.pages['dashboard'];
    }
    if (!handler) return;

    Nav.setActivePage(page);
    Router.current = page;

    var content = document.getElementById('pageContent');
    if (!content) return;

    try { history.pushState({ page: page }, '', '#' + page); } catch(e) {}

    content.innerHTML = '<div class="empty-state"><div class="spinner" style="width:36px;height:36px;margin:0 auto 14px"></div><p>Loading...</p></div>';

    try {
      handler(content, page);
    } catch(e) {
      console.error('Router error:', e);
      content.innerHTML = '<div class="empty-state"><h3>Error loading page</h3><p>' + Utils.escapeHtml(e.message) + '</p></div>';
    }
  },

  handleHash: function() {
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    Router.navigate(hash);
  },

  init: function() {
    window.addEventListener('popstate', function(e) {
      if (e.state && e.state.page) {
        Router.navigate(e.state.page);
      } else {
        Router.handleHash();
      }
    });
    Router.handleHash();
  }
};

function navigateTo(page) { Router.navigate(page); }
function refreshCurrentPage() { Router.navigate(Router.current || 'dashboard'); }
function onGlobalSearch(val) { /* placeholder for global search */ }
function onNotifSearchInput() { /* placeholder */ }
function setNotifListFilter(f) { /* placeholder */ }
function applyNotifListFilters() { /* placeholder */ }
function markAllNotifRead() { /* placeholder */ }
function deleteAllNotifications() { /* placeholder */ }
function emailRetryFailed() { /* placeholder */ }
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
