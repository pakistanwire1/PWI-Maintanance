var API = {
  baseUrl: '/api/exec',

  request: function(action, data, token) {
    return fetch(API.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, token: token || Session.getToken(), data: data || {} })
    })
    .then(function(resp) {
      return resp.json();
    })
    .then(function(json) {
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
  },

  get: function(action, data) {
    return API.request(action, data);
  },

  post: function(action, data) {
    return API.request(action, data);
  }
};
