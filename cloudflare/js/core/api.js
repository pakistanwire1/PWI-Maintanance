var API = {
  baseUrl: '/api/exec',

  request: function(action, data, token) {
    var payload = { action: action, token: token || Session.getToken(), data: data || {} };
    var _u = Session.getUser();
    if (_u && _u.email) { payload.data._userEmail = _u.email; }
    console.log('[API] >> ' + action, JSON.stringify(payload).slice(0, 200));
    console.log('[P10.18-API] >> ' + action + ' _userEmail=' + (payload.data._userEmail || 'MISSING') + ' UpdatedBy=' + (payload.data.UpdatedBy || 'MISSING') + ' fullPayload=' + JSON.stringify(payload).slice(0, 500));
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
        console.log('[API] << ' + action, 'success=' + json.success, 'data_type=' + typeof json.data, 'is_array=' + Array.isArray(json.data), 'data_length=' + (json.data ? (json.data.length || Object.keys(json.data).length) : 0));
        if (json.success === false) {
          console.error('[API] << ' + action + ' ERROR:', json.error, 'code=' + json.code);
          if (json.code === 401) {
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
    return fetch(API.baseUrl + '?diag=1')
      .then(function(resp) { return resp.json(); });
  }
};
