/* ============================================================
   auth.js — Authentication Module for Cloudflare Pages
   ============================================================ */

var Auth = (function() {
  var _user = null;

  var _inited = false;
  function init() {
    var stored = localStorage.getItem('cmms_user');
    if (stored) {
      try { _user = JSON.parse(stored); } catch(e) { _user = null; }
    }
    if (!_inited) {
      _inited = true;
      API.on('auth:expired', function() {
        _user = null;
        localStorage.removeItem('cmms_user');
        localStorage.removeItem('cmms_token');
        App.navigate('login');
      });
    }
  }

  function login(email, password) {
    return API.call('login', { email: email, password: password }, { retry: false })
      .then(function(result) {
        /* result = { success: true, user: {...}, token: '...', expires: '...' }
           because API.call() resolves with the inner 'data' field from the API response */

        if (!result) {
          throw new Error('Empty response from server');
        }

        if (result.success === false) {
          throw new Error(result.message || 'Login failed');
        }

        if (!result.token) {
          throw new Error('No authentication token received. Server response: ' + JSON.stringify(result).slice(0, 200));
        }

        API.setToken(result.token);

        _user = result.user || {};
        _user.email = _user.email || email;
        _user.expires = result.expires || '';

        localStorage.setItem('cmms_user', JSON.stringify(_user));
        return _user;
      });
  }

  function logout() {
    var token = API.getToken();
    if (token) {
      API.call('logout', {}, { retry: false }).catch(function() {});
    }
    _user = null;
    API.setToken(null);
    localStorage.removeItem('cmms_user');
    App.navigate('login');
  }

  function getUser() { return _user; }
  function isLoggedIn() { return !!(_user && API.getToken()); }
  function getEmail() { return _user ? _user.email : ''; }
  function getName() { return _user ? _user.name : ''; }
  function getRole() { return _user ? _user.role : ''; }
  function getDepartment() { return _user ? _user.department : ''; }

  function hasPermission(perm) {
    if (!_user) return false;
    if (_user.isSystemAdmin) return true;
    return !!_user[perm];
  }

  function canOpenJobCard() { return hasPermission('canOpenJobCard'); }
  function canStartJobCard() { return hasPermission('canStartJobCard'); }
  function canCloseJobCard() { return hasPermission('canCloseJobCard'); }
  function canApproveJobCard() { return hasPermission('canApproveJobCard'); }
  function canManageMachines() { return hasPermission('canManageMachines'); }
  function canManageAssets() { return hasPermission('canManageAssets'); }
  function canManageUsers() { return hasPermission('canManageUsers'); }
  function canViewReports() { return hasPermission('canViewReports'); }
  function isAdmin() { return _user ? !!_user.isSystemAdmin : false; }

  return {
    init: init,
    login: login,
    logout: logout,
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    getEmail: getEmail,
    getName: getName,
    getRole: getRole,
    getDepartment: getDepartment,
    hasPermission: hasPermission,
    canOpenJobCard: canOpenJobCard,
    canStartJobCard: canStartJobCard,
    canCloseJobCard: canCloseJobCard,
    canApproveJobCard: canApproveJobCard,
    canManageMachines: canManageMachines,
    canManageAssets: canManageAssets,
    canManageUsers: canManageUsers,
    canViewReports: canViewReports,
    isAdmin: isAdmin
  };
})();
