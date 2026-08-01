var API = {
  baseUrl: '/api/exec',

  _masterCache: {},
  _masterCacheVersion: 0,

  _CACHEABLE_ACTIONS: {
    getReportFilterOptions: 1,
    getMachineCascade: 1,
    getSectionList: 1,
    getDepartmentList: 1,
    getMachines: 1,
    getDivisions: 1,
    getSections: 1,
    getDepartments: 1,
    getMachineOptions: 1,
    getTechnicians: 1
  },

  _MUTATION_PREFIXES: ['add', 'save', 'update', 'edit', 'delete', 'remove', 'reset', 'submit', 'approve', 'reject', 'close', 'complete', 'return', 'create', 'mark', 'send', 'copy', 'restore', 'import', 'start', 'bulk', 'clear', 'process', 'generate', 'reassign', 'archive', 'cancel'],

  _NO_CLEAR_HINTS: ['notification', 'email', 'whatsapp'],

  clearMasterCache: function() {
    API._masterCache = {};
    API._masterCacheVersion++;
  },

  masterCacheVersion: function() {
    return API._masterCacheVersion;
  },

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

  _clone: function(v) {
    if (v === undefined || v === null) return v;
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  },

  _cacheKey: function(action, data) {
    var d = data || {};
    var clean = {};
    Object.keys(d).forEach(function(k) {
      if (k !== '_userEmail') clean[k] = d[k];
    });
    return action + '|' + JSON.stringify(clean);
  },

  request: function(action, data, token) {
    var payload = { action: action, token: token || Session.getToken(), data: data || {} };
    var _u = Session.getUser();
    if (_u && _u.email) { payload.data._userEmail = _u.email; }

    var isCacheable = !!API._CACHEABLE_ACTIONS[action];
    var cacheKey = API._cacheKey(action, payload.data);
    if (isCacheable && API._masterCache[cacheKey] !== undefined) {
      return Promise.resolve(API._clone(API._masterCache[cacheKey]));
    }

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
            API.clearMasterCache();
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
    })
    .then(function(data) {
      if (isCacheable) API._masterCache[cacheKey] = API._clone(data);
      if (action === 'login' || action === 'logout' || API._isMutation(action)) {
        API.clearMasterCache();
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
