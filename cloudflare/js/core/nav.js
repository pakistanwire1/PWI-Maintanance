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
    if (panel) panel.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  },

  toggleEmailPanel: function() {
    var panel = document.getElementById('emailPanel');
    if (panel) panel.classList.toggle('open');
  },

  closeEmailPanel: function() {
    var panel = document.getElementById('emailPanel');
    if (panel) panel.classList.remove('open');
  }
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
