/* ============================================================
   api.js — API Client for Cloudflare Pages → GAS Backend
   ============================================================ */

var API = (function() {

  /* ==========================================================
     CONFIGURATION
     ========================================================== */
  var API_BASE_URL = '/api/exec';

  /* ==========================================================
     INTERNAL STATE
     ========================================================== */
  var _token = localStorage.getItem('cmms_token') || null;
  var _listeners = {};
  var _requestCount = 0;
  var _lastDiagnostics = null;
  var DEFAULT_TIMEOUT = 30000;
  var MAX_RETRIES = 2;
  var RETRY_DELAY_MS = 1500;

  /* ==========================================================
     LOGGING
     ========================================================== */
  function log(tag, msg, data) {
    var ts = new Date().toISOString().slice(11, 23);
    var p = '[' + ts + '][API:' + tag + ']';
    if (data !== undefined) console.log(p, msg, data);
    else console.log(p, msg);
  }

  function logWarn(tag, msg, data) {
    var ts = new Date().toISOString().slice(11, 23);
    var p = '[' + ts + '][API:' + tag + ']';
    if (data !== undefined) console.warn(p, msg, data);
    else console.warn(p, msg);
  }

  function logError(tag, msg, data) {
    var ts = new Date().toISOString().slice(11, 23);
    var p = '[' + ts + '][API:' + tag + ']';
    if (data !== undefined) console.error(p, msg, data);
    else console.error(p, msg);
  }

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
     DIAGNOSTICS
     ========================================================== */
  function setDiagnostics(info) {
    _lastDiagnostics = info;
    log('DIAG', info.step + ': ' + info.status, info.detail || '');
  }

  function getDiagnostics() { return _lastDiagnostics; }

  /* ==========================================================
     HTML ERROR EXTRACTION
     ========================================================== */
  function extractHtmlError(html) {
    if (!html) return '';
    var m = html.match(/>([^<]*Error[^<]*)</i) ||
            html.match(/>([^<]*not found[^<]*)</i) ||
            html.match(/>([^<]*function[^<]*not[^<]*found[^<]*)/i);
    if (m && m[1]) return m[1].trim();
    var m2 = html.match(/<div[^>]*>([^<]{10,200})<\/div>/);
    if (m2 && m2[1]) return m2[1].trim();
    return 'Server returned an HTML error page instead of JSON.';
  }

  /* ==========================================================
     ERROR CLASSIFICATION
     ========================================================== */
  function classifyError(err, tag) {
    var msg = err.message || '';

    if (msg.indexOf('Failed to fetch') > -1 || msg.indexOf('NetworkError') > -1 || msg === 'NetworkError') {
      logWarn(tag, 'fetch() failed — likely CORS or server unreachable. URL: ' + API_BASE_URL);
      return {
        type: 'network',
        message: 'Cannot reach the API server. Redeploy the GAS web app with doPost() enabled.',
        detail: 'fetch() failed. GAS may not have doPost() deployed. Open browser console (F12) for details.',
        retryable: false
      };
    }

    if (msg.indexOf('timeout') > -1 || msg.indexOf('AbortError') > -1) {
      return { type: 'timeout', message: 'Request timed out. Server may be overloaded.', retryable: true };
    }

    if (msg.indexOf('401') > -1 || msg.indexOf('Unauthorized') > -1 || msg.indexOf('Session expired') > -1) {
      return { type: 'auth', message: 'Session expired. Please login again.', retryable: false };
    }

    if (msg.indexOf('500') > -1 || msg.indexOf('Internal') > -1) {
      return { type: 'server', message: 'Server error. Please try again.', retryable: true };
    }

    if (msg.indexOf('Script function not found') > -1 || msg.indexOf('HTML instead of JSON') > -1 || msg.indexOf('error page') > -1) {
      return { type: 'deploy', message: msg, detail: 'Redeploy GAS web app with doPost().', retryable: false };
    }

    return { type: 'unknown', message: msg || 'An unknown error occurred.', retryable: false };
  }

  /* ==========================================================
     CORE API CALL (POST)
     ========================================================== */
  function call(action, data, opts) {
    data = data || {};
    opts = opts || {};

    var requestId = ++_requestCount;
    var tag = 'R' + requestId;
    var timeout = opts.timeout || DEFAULT_TIMEOUT;
    var maxRetries = opts.retry === false ? 0 : (opts.retries || MAX_RETRIES);
    var attempt = opts._attempt || 0;

    var payload = {
      action: action,
      token: _token || '',
      data: data
    };
    var bodyStr = JSON.stringify(payload);

    log(tag, 'POST ' + action + ' (attempt ' + (attempt + 1) + '/' + (maxRetries + 1) + ')');

    setDiagnostics({ step: 'request', status: 'sending ' + action, detail: API_BASE_URL });

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
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: bodyStr
      };

      if (controller) fetchOpts.signal = controller.signal;

      var fetchStart = Date.now();

      fetch(API_BASE_URL, fetchOpts)
        .then(function(resp) {
          var elapsed = Date.now() - fetchStart;
          if (timeoutId) clearTimeout(timeoutId);

          var ct = resp.headers.get('content-type') || '';
          var cors = resp.headers.get('access-control-allow-origin') || '(none)';

          log(tag, 'HTTP ' + resp.status + ' (' + elapsed + 'ms) CT:' + ct + ' CORS:' + cors);

          setDiagnostics({
            step: 'response',
            status: 'HTTP ' + resp.status,
            detail: 'CT: ' + ct + ' | CORS: ' + cors
          });

          if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) {
              setToken(null);
              emit('auth:expired');
              reject(new Error('Unauthorized'));
              return;
            }
            return resp.text().then(function(body) {
              var isHtml = body && (body.indexOf('<!DOCTYPE') > -1 || body.indexOf('<html') > -1);
              if (isHtml) {
                var errMsg = extractHtmlError(body);
                logError(tag, 'HTML error response: ' + errMsg);
                reject(new Error(errMsg || 'Server returned an error page (HTTP ' + resp.status + ')'));
              } else {
                reject(new Error('HTTP ' + resp.status + ': ' + (body || resp.statusText)));
              }
            });
          }

          return resp.text();
        })
        .then(function(text) {
          if (typeof text !== 'string') return;

          var elapsed = Date.now() - fetchStart;
          log(tag, 'Body (' + text.length + ' chars, ' + elapsed + 'ms total): ' + text.slice(0, 300));

          var result;
          try {
            result = JSON.parse(text);
          } catch(parseErr) {
            var isHtml = text && (text.indexOf('<!DOCTYPE') > -1 || text.indexOf('<html') > -1);
            if (isHtml) {
              var errMsg = extractHtmlError(text);
              logError(tag, 'Server returned HTML: ' + errMsg);
              setDiagnostics({ step: 'parse', status: 'HTML response', detail: errMsg });
              reject(new Error(errMsg || 'Server returned HTML instead of JSON. Redeploy GAS web app.'));
            } else {
              logError(tag, 'JSON parse failed. Raw: ' + text.slice(0, 500));
              reject(new Error('Invalid JSON response from server.'));
            }
            return;
          }

          if (!result || typeof result.success === 'undefined') {
            logError(tag, 'Response missing success field:', result);
            reject(new Error('Invalid response format'));
            return;
          }

          if (result.success === false) {
            logWarn(tag, 'API error: ' + (result.error || 'unknown'));
            setDiagnostics({ step: 'api', status: 'error', detail: result.error });
            reject(new Error(result.error || 'Request failed'));
            return;
          }

          log(tag, 'SUCCESS: ' + action);
          setDiagnostics({ step: 'done', status: 'success' });
          resolve(result.data);
        })
        .catch(function(err) {
          if (timeoutId) clearTimeout(timeoutId);

          var elapsed = Date.now() - fetchStart;
          logError(tag, 'FAILED: ' + action + ' — ' + (err.message || 'unknown') + ' (' + elapsed + 'ms)');

          var classified = classifyError(err, tag);
          setDiagnostics({ step: 'error', status: classified.type, detail: classified.detail || classified.message });

          if (classified.type === 'auth') {
            setToken(null);
            emit('auth:expired');
          }

          if (classified.retryable && attempt < maxRetries) {
            var delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            log(tag, 'Retrying in ' + delay + 'ms');
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
     CONNECTION TEST
     ========================================================== */
  function ping() {
    log('PING', 'POST to ' + API_BASE_URL);
    return call('getServerTimestamp', {}, { retry: false, timeout: 15000 })
      .catch(function(postErr) {
        logWarn('PING', 'POST failed: ' + postErr.message + '. Trying GET...');
        return pingGet();
      });
  }

  function pingGet() {
    var tag = 'PING-GET';
    log(tag, 'GET ' + API_BASE_URL);
    setDiagnostics({ step: 'ping-get', status: 'sending', detail: API_BASE_URL });

    return new Promise(function(resolve, reject) {
      var controller = null;
      var timeoutId = null;

      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeoutId = setTimeout(function() { controller.abort(); }, 15000);
      }

      var fetchStart = Date.now();

      fetch(API_BASE_URL + '?ping=1&t=' + Date.now(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow'
      })
        .then(function(resp) {
          var elapsed = Date.now() - fetchStart;
          if (timeoutId) clearTimeout(timeoutId);

          log(tag, 'HTTP ' + resp.status + ' (' + elapsed + 'ms)');
          setDiagnostics({
            step: 'ping-get',
            status: 'HTTP ' + resp.status,
            detail: 'CT: ' + resp.headers.get('content-type') + ' | CORS: ' + (resp.headers.get('access-control-allow-origin') || 'MISSING')
          });

          return resp.text();
        })
        .then(function(text) {
          var isHtml = text && (text.indexOf('<!DOCTYPE') > -1 || text.indexOf('<html') > -1);
          if (isHtml) {
            var errMsg = extractHtmlError(text);
            log(tag, 'HTML response: ' + (errMsg || text.slice(0, 200)));
            resolve({ reachable: true, html: true, error: errMsg || 'GAS returns HTML (doPost not deployed)' });
          } else {
            log(tag, 'Non-HTML response: ' + text.slice(0, 200));
            resolve({ reachable: true, html: false, body: text.slice(0, 200) });
          }
        })
        .catch(function(err) {
          var elapsed = Date.now() - fetchStart;
          if (timeoutId) clearTimeout(timeoutId);
          logError(tag, 'GET failed: ' + err.message + ' (' + elapsed + 'ms)');
          setDiagnostics({ step: 'ping-get', status: 'failed', detail: err.message });
          reject(err);
        });
    });
  }

  /* ==========================================================
     UPLOAD
     ========================================================== */
  function upload(base64Data, fileName, folderName) {
    return call('uploadFile', { base64: base64Data, fileName: fileName, folder: folderName }, { timeout: 60000 });
  }

  /* ==========================================================
     BATCH CALLS
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
    emit: emit,
    ping: ping,
    getDiagnostics: getDiagnostics
  };
})();
