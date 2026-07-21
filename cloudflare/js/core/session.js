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

  getPermission: function(perm) {
    var user = Session.getUser();
    if (!user) return false;
    if (user.isSystemAdmin) return true;
    return !!user[perm];
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
