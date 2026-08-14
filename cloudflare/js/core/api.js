var API = {
  baseUrl: '/api/exec',

  _masterCacheVersion: 0,

  /* Action -> { ds, ttl } for all cacheable reads.
   * Cache keys include the requesting user so cached data is never shared
   * across users/sessions (permissions stay enforced server-side; a cache
   * hit is never treated as authorization). */
  _CACHEABLE_DATASETS: {
    getReportFilterOptions: { ds: 'master', ttl: 300000 },
    getMachineCascade: { ds: 'master', ttl: 300000 },
    getSectionList: { ds: 'master', ttl: 300000 },
    getDepartmentList: { ds: 'master', ttl: 300000 },
    getMachines: { ds: 'master', ttl: 300000 },
    getDivisions: { ds: 'master', ttl: 300000 },
    getSections: { ds: 'master', ttl: 300000 },
    getDepartments: { ds: 'master', ttl: 300000 },
    getMachineOptions: { ds: 'master', ttl: 300000 },
    getTechnicians: { ds: 'master', ttl: 300000 },
    getUserDepartments: { ds: 'master', ttl: 300000 },
    getUserSections: { ds: 'master', ttl: 300000 },
    getAssets: { ds: 'assets', ttl: 300000 },
    searchAssets: { ds: 'assets', ttl: 60000 },
    getSpareParts: { ds: 'spareparts', ttl: 120000 },
    filterSpareParts: { ds: 'spareparts', ttl: 60000 },
    searchSpareParts: { ds: 'spareparts', ttl: 60000 },
    getLowStockParts: { ds: 'spareparts', ttl: 60000 },
    getUsers: { ds: 'users', ttl: 120000 },
    searchUsers: { ds: 'users', ttl: 60000 },
    getJobCards: { ds: 'jobcards', ttl: 45000 },
    getDashboardData: { ds: 'dashboard', ttl: 45000 },
    getDashboardNotifications: { ds: 'dashboard', ttl: 20000 },
    getSidebarCounts: { ds: 'dashboard', ttl: 20000 },
    getAllTransactions: { ds: 'inventory', ttl: 45000 },
    getInventoryTransactions: { ds: 'inventory', ttl: 45000 },
    getInventoryDashboardData: { ds: 'inventory', ttl: 45000 },
    getGoodsReceipt: { ds: 'inventory', ttl: 45000 },
    getStockHistory: { ds: 'inventory', ttl: 45000 },
    searchTransactions: { ds: 'inventory', ttl: 30000 },
    getTransactionsByDateRange: { ds: 'inventory', ttl: 45000 },
    getTransactionsByPart: { ds: 'inventory', ttl: 45000 },
    getTransactionsByType: { ds: 'inventory', ttl: 45000 },
    getPMRecords: { ds: 'pm', ttl: 45000 },
    getPMCalendarData: { ds: 'pm', ttl: 45000 },
    getPMCompliance: { ds: 'pm', ttl: 45000 },
    getPMByDateRange: { ds: 'pm', ttl: 45000 },
    getPMHistory: { ds: 'pm', ttl: 45000 },
    searchPMRecords: { ds: 'pm', ttl: 30000 },
    getBreakdownHistory: { ds: 'breakdown', ttl: 45000 },
    getBreakdownTypes: { ds: 'breakdown', ttl: 300000 },
    getReportData: { ds: 'reports', ttl: 60000 },
    getAuditLogs: { ds: 'audit', ttl: 30000 },
    getModuleRecordDetail: { ds: 'audit', ttl: 30000 },
    getNotifications: { ds: 'notifications', ttl: 15000 },
    emailGetLogs: { ds: 'email', ttl: 30000 },
    emailGetPanelData: { ds: 'email', ttl: 20000 },
    emailGetSettings: { ds: 'email', ttl: 30000 },
    whatsappGetLogs: { ds: 'whatsapp', ttl: 30000 },
    whatsappGetPanelData: { ds: 'whatsapp', ttl: 20000 },
    whatsappGetSettings: { ds: 'whatsapp', ttl: 30000 },
    whatsappGetTemplates: { ds: 'whatsapp', ttl: 30000 },
    getQRDetail: { ds: 'qr', ttl: 30000 },
    getQRModuleRecords: { ds: 'qr', ttl: 30000 },
    getQRScanHistory: { ds: 'qr', ttl: 30000 },
    getQRScanStats: { ds: 'qr', ttl: 30000 },
    getQRStatistics: { ds: 'qr', ttl: 30000 },
    getPrintLabelData: { ds: 'qr', ttl: 30000 },
    getSettingsData: { ds: 'settings', ttl: 30000 },
    getBackupHistory: { ds: 'backup', ttl: 30000 },
    getBackupSheetsList: { ds: 'backup', ttl: 30000 },
    getBackupStatus: { ds: 'backup', ttl: 10000 },
    getMachinePassport: { ds: 'passport', ttl: 30000 }
  },

  _MUTATION_PREFIXES: ['add', 'save', 'update', 'edit', 'delete', 'remove', 'reset', 'submit', 'approve', 'reject', 'close', 'complete', 'return', 'create', 'mark', 'send', 'copy', 'restore', 'import', 'start', 'bulk', 'clear', 'process', 'generate', 'reassign', 'archive', 'cancel'],

  /* Mutations whose prefix matches a no-clear hint (notification/email/whatsapp)
   * are still mutations for dataset-scoped invalidation purposes. */
  _MUTATION_EXTRA: ['markNotificationRead', 'markAllNotificationsRead', 'clearAllNotifications', 'deleteNotification', 'emailRetryFailed', 'emailSendRaw', 'emailSendDailySummary', 'emailSaveSettings', 'whatsappSaveSettings', 'whatsappSaveTemplate', 'whatsappTestSend', 'logQRScan'],

  _NO_CLEAR_HINTS: ['notification', 'email', 'whatsapp'],

  /* Most-specific first. First match wins. ds === '__ALL__' invalidates everything. */
  _MUTATION_RULES: [
    { re: /jobcard|job_card/i, ds: ['jobcards', 'dashboard'], evt: 'jobcard:changed' },
    { re: /checklist/i, ds: ['checklists', 'master'], evt: 'checklists:changed' },
    { re: /resetPassword|uploadUserPhoto|permission|role|user/i, ds: ['users', 'settings', 'master'], evt: 'users:changed' },
    { re: /saveSettingValue|settings|config/i, ds: ['settings', 'master', 'users'], evt: 'settings:changed' },
    { re: /machine/i, ds: ['master', 'qr'], evt: 'machine:changed' },
    { re: /department|dept/i, ds: ['master', 'departments'], evt: 'departments:changed' },
    { re: /section/i, ds: ['master', 'sections'], evt: 'sections:changed' },
    { re: /technician/i, ds: ['master', 'technicians'], evt: 'technicians:changed' },
    { re: /asset/i, ds: ['assets', 'qr'], evt: 'assets:changed' },
    { re: /sparepart|spare_part|spare/i, ds: ['spareparts', 'inventory'], evt: 'spareparts:changed' },
    { re: /goodsreceipt|goods_receipt|processIssue|processReturn|processTransfer|processAdjustment|inventory|stock|grn/i, ds: ['inventory', 'stock', 'dashboard', 'spareparts'], evt: 'inventory:changed' },
    { re: /\bpm\b|preventive/i, ds: ['pm', 'dashboard', 'jobcards'], evt: 'pm:changed' },
    { re: /qr|barcode/i, ds: ['qr', 'master'], evt: 'qr:changed' },
    { re: /notification/i, ds: ['notifications', 'dashboard'], evt: 'notifications:changed' },
    { re: /email/i, ds: ['email'], evt: 'email:changed' },
    { re: /whatsapp/i, ds: ['whatsapp'], evt: 'whatsapp:changed' },
    { re: /restoreBackup|importBackup/i, ds: '__ALL__', evt: 'data:changed' },
    { re: /backup/i, ds: ['backup'], evt: 'data:changed' },
    { re: /logout/i, ds: '__ALL__', evt: 'session:changed' }
  ],

  _isMutation: function(action) {
    var lower = String(action || '').toLowerCase();
    for (var i = 0; i < API._NO_CLEAR_HINTS.length; i++) {
      if (lower.indexOf(API._NO_CLEAR_HINTS[i]) > -1) return false;
    }
    for (var j = 0; j < API._MUTATION_PREFIXES.length; j++) {
      if (lower.indexOf(API._MUTATION_PREFIXES[j]) === 0) return true;
    }
    return false;
  },

  _shouldInvalidate: function(action) {
    if (API._isMutation(action)) return true;
    return API._MUTATION_EXTRA.indexOf(String(action || '')) > -1;
  },

  /* Invalidate the smallest affected dataset scope for a mutation and notify
   * dependent pages via the event bus. */
  _invalidateForMutation: function(action) {
    var i, rule;
    for (i = 0; i < API._MUTATION_RULES.length; i++) {
      rule = API._MUTATION_RULES[i];
      if (rule.re.test(String(action || ''))) {
        if (rule.ds === '__ALL__') {
          API.clearAllCaches();
        } else {
          if (rule.ds.indexOf('master') > -1) API.clearMasterCache();
          if (window.CMMS && CMMS.cache) CMMS.cache.invalidateMany(rule.ds);
        }
        if (rule.evt && window.CMMS && CMMS.events) CMMS.events.emit(rule.evt, { action: action });
        return;
      }
    }
    /* Unmatched mutation: conservative full invalidation (never serve stale). */
    API.clearAllCaches();
    if (window.CMMS && CMMS.events) CMMS.events.emit('data:changed', { action: action });
  },

  clearMasterCache: function() {
    API._masterCacheVersion++;
    if (window.CMMS && CMMS.cache) CMMS.cache.invalidate('master');
  },

  clearAllCaches: function() {
    API._masterCacheVersion++;
    if (window.CMMS && CMMS.cache) CMMS.cache.clear();
  },

  masterCacheVersion: function() {
    return API._masterCacheVersion;
  },

  _clone: function(v) {
    if (v === undefined || v === null) return v;
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  },

  /* Cache key includes the requesting user so cached data is never shared
   * across users/sessions. */
  _cacheKey: function(action, data) {
    var d = data || {};
    var clean = {};
    Object.keys(d).forEach(function(k) {
      if (k !== '_userEmail') clean[k] = d[k];
    });
    var _u = Session.getUser();
    return action + '|' + JSON.stringify(clean) + '|' + (_u ? _u.email : 'anon');
  },

  request: function(action, data, token) {
    var payload = { action: action, token: token || Session.getToken(), data: data || {} };
    var _u = Session.getUser();
    if (_u && _u.email) { payload.data._userEmail = _u.email; }

    var conf = API._CACHEABLE_DATASETS[action];
    var cacheKey = API._cacheKey(action, payload.data);

    var fetchFn = function() {
      return fetch(API.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(resp) {
        var ct = resp.headers.get('content-type') || '';
        return resp.text().then(function(rawBody) {
          var isJson = ct.indexOf('application/json') > -1 || (rawBody && rawBody.charAt(0) === '{');
          if (!isJson) {
            console.error('[API] Non-JSON response for action=' + action + ': status=' + resp.status + ', content-type=' + ct + ', body=' + (rawBody ? rawBody.slice(0, 300) : 'null'));
            throw new Error('Server returned non-JSON response (status ' + resp.status + ', type: ' + (ct || 'empty') + ')');
          }
          var json;
          try {
            json = JSON.parse(rawBody);
          } catch(parseErr) {
            console.error('[API] JSON parse error for action=' + action + ': ' + parseErr.message + ', body=' + (rawBody ? rawBody.slice(0, 300) : 'null'));
            throw new Error('Invalid server response');
          }
          if (json.success === false) {
            console.error('[API] << ' + action + ' ERROR:', json.error, 'code=' + json.code);
            if (json.code === 401) {
              API.clearAllCaches();
              Session.clear();
              if (typeof handleSessionExpired === 'function') {
                handleSessionExpired();
              }
              throw new Error(json.error || 'Session expired');
            }
            throw new Error(json.error || 'API error');
          }
          return json.data !== undefined ? json.data : json;
        });
      });
    };

    var p;
    if (conf && window.CMMS && CMMS.cache) {
      p = CMMS.cache.get(cacheKey, fetchFn, { dataset: conf.ds, ttl: conf.ttl });
    } else {
      p = fetchFn();
    }

    return p
      .then(function(data) {
        if (action === 'login' || action === 'logout') {
          API.clearAllCaches();
          if (action === 'login' && window.CMMS && CMMS.events) CMMS.events.emit('session:changed', { action: action });
        } else if (API._shouldInvalidate(action)) {
          API._invalidateForMutation(action);
        }
        return data;
      })
      .catch(function(err) {
        console.error('[API] FAILED: action=' + action + ', error=' + err.message);
        throw err;
      });
  },

  get: function(action, data) {
    return API.request(action, data);
  },

  post: function(action, data) {
    return API.request(action, data);
  },

  diag: function() {
    return fetch(API.baseUrl + '?health=1')
      .then(function(resp) { return resp.json(); });
  }
};
