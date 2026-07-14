/* ============================================================
   api.js — API Client for Cloudflare Pages → GAS Backend
   Standard-021: Enterprise Architecture Migration
   
   Replaces all google.script.run calls with fetch() to the
   GAS doPost() REST API.
   ============================================================ */

var API = (function() {
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
  var _token = localStorage.getItem('cmms_token') || null;
  var _listeners = {};

  function setGasUrl(url) { GAS_URL = url; }
  function getToken() { return _token; }

  function setToken(token) {
    _token = token;
    if (token) {
      localStorage.setItem('cmms_token', token);
    } else {
      localStorage.removeItem('cmms_token');
    }
  }

  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }

  function emit(event, data) {
    (_listeners[event] || []).forEach(function(fn) { fn(data); });
  }

  function call(action, data, opts) {
    data = data || {};
    opts = opts || {};
    var payload = {
      action: action,
      token: _token || '',
      data: data
    };
    return new Promise(function(resolve, reject) {
      fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: JSON.stringify(payload)
      })
      .then(function(resp) {
        if (!resp.ok) {
          if (resp.status === 401) {
            setToken(null);
            emit('auth:expired');
            reject(new Error('Session expired. Please login again.'));
            return;
          }
          throw new Error('HTTP ' + resp.status);
        }
        return resp.json();
      })
      .then(function(result) {
        if (result.success === false) {
          if (result.code === 401) {
            setToken(null);
            emit('auth:expired');
          }
          reject(new Error(result.error || 'Request failed'));
          return;
        }
        resolve(result.data);
      })
      .catch(function(err) {
        if (opts.retry !== false && err.message.indexOf('Failed to fetch') > -1) {
          setTimeout(function() {
            call(action, data, { retry: false }).then(resolve).catch(reject);
          }, 1000);
          return;
        }
        reject(err);
      });
    });
  }

  function upload(base64Data, fileName, folderName) {
    return new Promise(function(resolve, reject) {
      fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadFile',
          token: _token || '',
          data: { base64: base64Data, fileName: fileName, folder: folderName }
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(r) { r.success ? resolve(r.data) : reject(new Error(r.error)); })
      .catch(reject);
    });
  }

  return {
    setGasUrl: setGasUrl,
    getToken: getToken,
    setToken: setToken,
    call: call,
    upload: upload,
    on: on,
    emit: emit
  };
})();
