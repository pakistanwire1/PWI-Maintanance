var Session = {
  TOKEN_KEY: 'cmms_token',
  USER_KEY: 'cmms_user',

  getToken: function() {
    try { return localStorage.getItem(Session.TOKEN_KEY) || ''; } catch(e) { return ''; }
  },

  setToken: function(token) {
    try { localStorage.setItem(Session.TOKEN_KEY, token); } catch(e) {}
  },

  getUser: function() {
    try {
      var raw = localStorage.getItem(Session.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  setUser: function(user) {
    try { localStorage.setItem(Session.USER_KEY, JSON.stringify(user)); } catch(e) {}
  },

  isLoggedIn: function() {
    return !!Session.getToken() && !!Session.getUser();
  },

  clear: function() {
    try {
      localStorage.removeItem(Session.TOKEN_KEY);
      localStorage.removeItem(Session.USER_KEY);
    } catch(e) {}
  },

  isAdmin: function() {
    var user = Session.getUser();
    if (!user) return false;
    if (user.isSystemAdmin) return true;
    var role = String(user.role || '').toLowerCase();
    return role === 'admin' || role === 'administrator';
  },

  getPermission: function(perm) {
    var user = Session.getUser();
    if (!user) return false;
    if (Session.isAdmin()) return true;
    if (!perm) return true;
    var key = (perm.charAt(0) === 'c' && perm.charAt(1) === 'a' && perm.charAt(2) === 'n')
      ? perm
      : 'can' + perm.charAt(0).toUpperCase() + perm.slice(1);
    return !!user[key];
  },

  PageAccess: {
    dashboard: null,
    sections: 'manageMachines',
    departments: 'manageMachines',
    machines: 'manageMachines',
    technicians: 'manageMachines',
    assets: 'manageAssets',
    users: 'manageUsers',
    openjobcard: 'openJobCard',
    startjobcard: 'startJobCard',
    closejobcard: 'closeJobCard',
    pendingjobcard: 'reviewPendingJobCard',
    approvejobcard: 'approveJobCard',
    jobcards: 'viewAllJobCards',
    pm: 'managePM',
    pmhistory: 'managePM',
    checklists: null,
    spareparts: 'manageSpareParts',
    inventory: 'manageInventory',
    inventorytransactions: 'manageInventory',
    stockhistory: 'manageInventory',
    goodsreceipt: 'manageGoodsReceipt',
    breakdown: 'viewReports',
    reports: 'viewReports',
    notifications: null,
    email: 'manageEmail',
    whatsapp: 'manageWhatsApp',
    qr: null,
    qrmachines: null,
    qrassets: null,
    qrspareparts: null,
    qrjobcards: null,
    qrprint: null,
    qrhistory: null,
    settings: ['manageSettings', 'manageUsers'],
    audit: 'viewAudit',
    backuprestore: 'backupRestore'
  },

  canAccessPage: function(page) {
    var user = Session.getUser();
    if (!user) return false;
    if (Session.isAdmin()) return true;
    var required = Session.PageAccess[page];
    if (required === undefined || required === null) return true;
    var perms = Array.isArray(required) ? required : [required];
    for (var i = 0; i < perms.length; i++) {
      if (Session.getPermission(perms[i])) return true;
    }
    return false;
  },

  getUserName: function() {
    var user = Session.getUser();
    return user ? (user.name || user.email || 'User') : 'User';
  },

  getUserRole: function() {
    var user = Session.getUser();
    return user ? (user.role || '') : '';
  },

  getUserEmail: function() {
    var user = Session.getUser();
    return user ? (user.email || '') : '';
  },

  getUserInitials: function() {
    return Utils.getInitials(Session.getUserName());
  }
};
