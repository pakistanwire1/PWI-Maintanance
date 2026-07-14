/* ============================================================
   api.js — API Client for Cloudflare Pages → GAS Backend
   Standard-021: Phase-2 — Connect Frontend to Backend

   Single configuration file for all API communication.
   Replaces ALL google.script.run calls with fetch().

   Features:
   - Single API_BASE_URL configuration
   - Token-based authentication
   - Configurable timeout (default 30s)
   - Automatic retry with exponential backoff
   - Proper error classification
   - Request/response logging
   - AbortController support
   ============================================================ */

var API = (function() {

  /* ==========================================================
     CONFIGURATION — Change this URL to your GAS deployment
     ========================================================== */
  var API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzxtbxQ1fMqxhO0HhqbkfrFgQeAiAe8nVQbUPA_Fi9cGSVCIRA1rk9gM-oPEMPDgHC4/exec';

  /* ==========================================================
     INTERNAL STATE
     ========================================================== */
  var _token = localStorage.getItem('cmms_token') || null;
  var _listeners = {};
  var _requestCount = 0;
  var DEFAULT_TIMEOUT = 30000;
  var MAX_RETRIES = 2;
  var RETRY_DELAY_MS = 1500;

  /* ==========================================================
     TOKEN MANAGEMENT
     ========================================================== */
  function getToken() { return _token; }

  function setToken(token) {
    _token = token;
    if (token) {
      localStorage.setItem('cmms_token', token);
    } else {
      localStorage.removeItem('cmms_token');
    }
  }

  /* ==========================================================
     EVENT SYSTEM
     ========================================================== */
  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }

  function emit(event, data) {
    var fns = _listeners[event] || [];
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](data); } catch(e) { console.error('Event handler error:', e); }
    }
  }

  /* ==========================================================
     ERROR CLASSIFICATION
     ========================================================== */
  function classifyError(err) {
    var msg = err.message || '';
    if (msg === 'NetworkError' || msg.indexOf('Failed to fetch') > -1 || msg.indexOf('NetworkError') > -1) {
      return { type: 'network', message: 'Network error. Please check your internet connection.', retryable: true };
    }
    if (msg.indexOf('timeout') > -1 || msg.indexOf('AbortError') > -1) {
      return { type: 'timeout', message: 'Request timed out. The server may be slow.', retryable: true };
    }
    if (msg.indexOf('401') > -1 || msg.indexOf('Unauthorized') > -1 || msg.indexOf('Session expired') > -1) {
      return { type: 'auth', message: 'Session expired. Please login again.', retryable: false };
    }
    if (msg.indexOf('403') > -1 || msg.indexOf('Forbidden') > -1) {
      return { type: 'forbidden', message: 'Access denied. You do not have permission.', retryable: false };
    }
    if (msg.indexOf('500') > -1 || msg.indexOf('Internal') > -1) {
      return { type: 'server', message: 'Server error. Please try again.', retryable: true };
    }
    return { type: 'unknown', message: msg || 'An unknown error occurred.', retryable: false };
  }

  /* ==========================================================
     CORE API CALL
     ========================================================== */
  function call(action, data, opts) {
    data = data || {};
    opts = opts || {};

    var requestId = ++_requestCount;
    var timeout = opts.timeout || DEFAULT_TIMEOUT;
    var maxRetries = opts.retry === false ? 0 : (opts.retries || MAX_RETRIES);
    var attempt = opts._attempt || 0;

    var payload = {
      action: action,
      token: _token || '',
      data: data
    };

    if (typeof console !== 'undefined' && console.log) {
      console.log('[API:' + requestId + '] → ' + action + ' (attempt ' + (attempt + 1) + ')');
    }

    return new Promise(function(resolve, reject) {
      var controller = null;
      var timeoutId = null;

      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeoutId = setTimeout(function() { controller.abort(); }, timeout);
      }

      var fetchOpts = {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: JSON.stringify(payload)
      };

      if (controller) fetchOpts.signal = controller.signal;

      fetch(API_BASE_URL, fetchOpts)
        .then(function(resp) {
          if (timeoutId) clearTimeout(timeoutId);

          if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) {
              setToken(null);
              emit('auth:expired');
              reject(new Error('Unauthorized'));
              return;
            }
            throw new Error('HTTP ' + resp.status);
          }

          return resp.json();
        })
        .then(function(result) {
          if (typeof console !== 'undefined' && console.log) {
            console.log('[API:' + requestId + '] ← ' + action + ' OK');
          }

          if (!result || typeof result.success === 'undefined') {
            reject(new Error('Invalid response format'));
            return;
          }

          if (result.success === false) {
            var classified = classifyError({ message: result.error || 'Request failed' });
            if (classified.type === 'auth') {
              setToken(null);
              emit('auth:expired');
            }
            reject(new Error(result.error || 'Request failed'));
            return;
          }

          resolve(result.data);
        })
        .catch(function(err) {
          if (timeoutId) clearTimeout(timeoutId);

          var classified = classifyError(err);

          if (typeof console !== 'undefined' && console.log) {
            console.log('[API:' + requestId + '] ✗ ' + action + ': ' + classified.type + ' - ' + classified.message);
          }

          if (classified.type === 'auth') {
            setToken(null);
            emit('auth:expired');
          }

          if (classified.retryable && attempt < maxRetries) {
            var delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            if (typeof console !== 'undefined' && console.log) {
              console.log('[API:' + requestId + '] Retry ' + (attempt + 1) + '/' + maxRetries + ' in ' + delay + 'ms');
            }
            setTimeout(function() {
              call(action, data, {
                timeout: timeout,
                retry: true,
                retries: maxRetries,
                _attempt: attempt + 1
              }).then(resolve).catch(reject);
            }, delay);
            return;
          }

          reject(new Error(classified.message));
        });
    });
  }

  /* ==========================================================
     UPLOAD (Base64 file to Google Drive via GAS)
     ========================================================== */
  function upload(base64Data, fileName, folderName) {
    return call('uploadFile', {
      base64: base64Data,
      fileName: fileName,
      folder: folderName
    }, { timeout: 60000 });
  }

  /* ==========================================================
     BATCH CALLS (Multiple API calls in sequence)
     ========================================================== */
  function batch(calls) {
    var results = [];
    var chain = Promise.resolve();
    calls.forEach(function(c) {
      chain = chain.then(function() {
        return call(c.action, c.data, c.opts).then(function(data) {
          results.push({ action: c.action, data: data });
        }).catch(function(err) {
          results.push({ action: c.action, error: err.message });
        });
      });
    });
    return chain.then(function() { return results; });
  }

  /* ==========================================================
     PUBLIC API
     ========================================================== */
  return {
    setGasUrl: function(url) { API_BASE_URL = url; },
    getGasUrl: function() { return API_BASE_URL; },
    getToken: getToken,
    setToken: setToken,
    call: call,
    upload: upload,
    batch: batch,
    on: on,
    emit: emit
  };
})();
