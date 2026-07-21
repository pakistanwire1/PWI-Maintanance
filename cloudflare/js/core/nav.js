var Nav = {
  currentPage: 'dashboard',

  init: function() {
    Nav.setupClock();
    Nav.updateUserInfo();
  },

  toggleSidebar: function() {
    var sidebar = document.getElementById('mainSidebar');
    if (!sidebar) return;
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
      try { localStorage.setItem('cmms_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0'); } catch(e) {}
    }
  },

  restoreSidebar: function() {
    try {
      var collapsed = localStorage.getItem('cmms_sidebar_collapsed');
      if (collapsed === '1' && window.innerWidth > 768) {
        var sidebar = document.getElementById('mainSidebar');
        if (sidebar) sidebar.classList.add('collapsed');
      }
    } catch(e) {}
  },

  toggleGroup: function(header) {
    var group = header.closest('.sidebar-group');
    if (group) group.classList.toggle('open');
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
    var fields = [
      ['userName', user.name], ['userRole', user.role],
      ['topbarName', user.name], ['topbarRole', user.role]
    ];
    fields.forEach(function(f) {
      var el = document.getElementById(f[0]);
      if (el) el.textContent = f[1] || '';
    });
    var initials = Utils.getInitials(user.name);
    var avatarFields = ['userAvatar', 'topbarAvatar'];
    avatarFields.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = initials;
    });
    var photo = user.photoURL;
    if (photo) {
      var topbarImg = document.getElementById('topbarLogoImg');
      if (topbarImg && !topbarImg.getAttribute('src')) {
        // sidebar/topbar logo uses logo.svg, not user photo
      }
    }
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
