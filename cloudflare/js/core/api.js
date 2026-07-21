var API = {
  baseUrl: '/api/exec',

  request: function(action, data, token) {
    return fetch(API.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, token: token || Session.getToken(), data: data || {} })
    })
    .then(function(resp) {
      var ct = resp.headers.get('content-type') || '';
      return resp.text().then(function(rawBody) {
        var isJson = ct.indexOf('application/json') > -1 || (rawBody && rawBody.charAt(0) === '{');
        if (!isJson) {
          console.error('[API] Non-JSON response for action=' + action + ': status=' + resp.status + ', content-type=' + ct + ', body=' + (rawBody ? rawBody.slice(0, 200) : 'null'));
          throw new Error('Server returned non-JSON response (status ' + resp.status + ', type: ' + (ct || 'empty') + ')');
        }
        var json;
        try {
          json = JSON.parse(rawBody);
        } catch(parseErr) {
          console.error('[API] JSON parse error for action=' + action + ': ' + parseErr.message + ', body=' + (rawBody ? rawBody.slice(0, 200) : 'null'));
          throw new Error('Invalid server response');
        }
        if (json.success === false) {
          if (json.code === 401) {
            Session.clear();
            window.location.reload();
            throw new Error(json.error || 'Session expired');
          }
          throw new Error(json.error || 'API error');
        }
        return json.data !== undefined ? json.data : json;
      });
    })
    .catch(function(err) {
      console.error('[API] Request failed: action=' + action + ', error=' + err.message);
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
