(function() {
  function initApp() {
    Theme.apply();
    Nav.initSidebar();
    Nav.init();

    Router.register('dashboard', function(el) {
      Dashboard.init(el);
    });

    Router.register('sections', function(el) {
      Section.init(el);
    });

    Router.register('machines', function(el) {
      Machine.show();
    });

    Router.register('departments', function(el) {
      Department.show();
    });

    Router.register('assets', function(el) {
      Asset.show();
    });

    Router.register('technicians', function(el) {
      Technician.show();
    });

    Router.register('users', function(el) {
      User.show();
    });

    Router.register('openjobcard', function(el) {
      OpenJobCard.show();
    });

    Router.register('startjobcard', function(el) {
      StartedJobCard.show();
    });

    Router.register('closejobcard', function(el) {
      ClosedJobCard.show();
    });

    Router.register('pendingjobcard', function(el) {
      PendingJobCards.show();
    });

    Router.register('approvejobcard', function(el) {
      ApproveJobCards.show();
    });

    Router.register('pm', function(el) {
      PMSchedule.show();
    });

    Router.register('checklists', function(el) {
      Checklists.show();
    });

    Router.register('spareparts', function(el) {
      SpareParts.show();
    });

    Router.register('inventory', function(el) {
      Inventory.show();
    });

    Router.register('jobcards', function(el) {
      AllJobCards.show();
    });

    Router.register('pmhistory', function(el) {
      PMHistory.show();
    });

    Router.register('breakdown', function(el) {
      BreakdownHistory.show();
    });

    Router.register('audit', function(el) {
      AuditTrail.show();
    });

    var pageNames = [
      'inventorytransactions',
      'stockhistory','goodsreceipt','reports',
      'notifications','email','whatsapp',
      'qr','qrmachines','qrassets','qrspareparts','qrjobcards','qrprint','qrhistory',
      'settings','backuprestore'
    ];
    pageNames.forEach(function(name) {
      Router.register(name, function(el) {
        el.innerHTML = '<div class="card"><div class="card-header"><span class="card-title">' + Utils.capitalize(name) + '</span></div><div class="empty-state"><p>This page will be built in a later phase.</p></div></div>';
      });
    });

    Loader.hide();

    var welcomeEl = document.getElementById('welcomePage');
    var loginEl = document.getElementById('loginPage');
    var appEl = document.getElementById('appContainer');

    var wasWelcomed = false;
    try { wasWelcomed = !!localStorage.getItem('cmms_welcomed'); } catch(e) {}

    if (wasWelcomed) {
      if (welcomeEl) welcomeEl.style.display = 'none';
      if (!Session.isLoggedIn()) {
        loginEl.style.display = 'block';
        appEl.style.display = 'none';
        Router.init();
      } else {
        loginEl.style.display = 'none';
        appEl.style.display = 'flex';
        Nav.updateUserInfo();
        Router.init();
      }
    } else if (welcomeEl && welcomeEl.style.display !== 'none') {
      loginEl.style.display = 'none';
      appEl.style.display = 'none';
    } else {
      if (!Session.isLoggedIn()) {
        loginEl.style.display = 'block';
        appEl.style.display = 'none';
        Router.init();
      } else {
        loginEl.style.display = 'none';
        appEl.style.display = 'flex';
        Nav.updateUserInfo();
        Router.init();
      }
    }
  }

  window.startApp = function() {
    var loginEl = document.getElementById('loginPage');
    var appEl = document.getElementById('appContainer');
    loginEl.style.display = 'none';
    appEl.style.display = 'flex';
    Nav.updateUserInfo();
    Router.init();
  };

  window.handleSessionExpired = function() {
    var welcomeEl = document.getElementById('welcomePage');
    var loginEl = document.getElementById('loginPage');
    var appEl = document.getElementById('appContainer');
    if (welcomeEl) welcomeEl.style.display = 'none';
    if (loginEl) loginEl.style.display = 'block';
    if (appEl) appEl.style.display = 'none';
  };

  window.handleLogout = function() {
    var token = Session.getToken();
    Session.clear();
    try { localStorage.removeItem('cmms_welcomed'); } catch(e) {}
    if (token) {
      API.post('logout', {}).catch(function() {});
    }
    window.location.reload();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(reg) {
      console.log('SW registered:', reg.scope);
    }).catch(function(err) {
      console.log('SW registration failed:', err);
    });
  }

  window.addEventListener('online', function() {
    var b = document.getElementById('offlineBanner');
    if (b) b.style.display = 'none';
  });
  window.addEventListener('offline', function() {
    var b = document.getElementById('offlineBanner');
    if (b) b.style.display = 'flex';
  });
})();
