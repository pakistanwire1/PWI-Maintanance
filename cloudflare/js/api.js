/* ============================================================
   api.js — API Client for Cloudflare Pages → GAS Backend
   ============================================================ */

var API = (function() {

  /* ==========================================================
     CONFIGURATION
     ========================================================== */
  var API_BASE_URL = '/api/exec';

  /* ==========================================================
     ENVIRONMENT BANNER — prints on load
     ========================================================== */
  (function() {
    var resolved = (function() { try { return new URL(API_BASE_URL, window.location.origin).href; } catch(e) { return API_BASE_URL; } })();
    console.log('%c[NET] ═══ API MODULE LOADED ═══', 'color:#0af;font-weight:bold;font-size:14px');
    console.log('[NET] Origin:      ' + window.location.origin);
    console.log('[NET] Protocol:    ' + window.location.protocol);
    console.log('[NET] Host:        ' + window.location.host);
    console.log('[NET] href:        ' + window.location.href);
    console.log('[NET] API_BASE:    ' + API_BASE_URL);
    console.log('[NET] Resolved:    ' + resolved);
    console.log('[NET] Online:      ' + navigator.onLine);
    console.log('[NET] UA:          ' + navigator.userAgent);
  })();

  /* ==========================================================
     INTERNAL STATE
     ========================================================== */
  var _token = localStorage.getItem('cmms_token') || null;
  var _listeners = {};
  var _requestCount = 0;
  var _lastDiagnostics = null;
  var DEFAULT_TIMEOUT = 60000;
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

  function logNet(tag, info) {
    var ts = new Date().toISOString().slice(11, 23);
    var lines = [
      '[' + ts + '][NET:' + tag + '] ─── REQUEST ───',
      '  URL:        ' + (info.requestUrl || 'N/A'),
      '  Method:     ' + (info.method || 'N/A'),
      '  Body:       ' + (info.requestBody || '(empty)'),
      '[' + ts + '][NET:' + tag + '] ─── RESPONSE ───',
      '  Status:     ' + (info.status || 'N/A'),
      '  OK:         ' + (info.ok || 'N/A'),
      '  Headers:    ' + (info.responseHeaders || 'N/A'),
      '  Body:       ' + (info.responseBody || '(empty)'),
      '[' + ts + '][NET:' + tag + '] ─── DIAGNOSIS ───',
      '  Failure:    ' + (info.failureType || 'none'),
      '  Detail:     ' + (info.failureDetail || 'N/A'),
      '  Elapsed:    ' + (info.elapsed || 'N/A') + 'ms'
    ];
    if (info.failureType && info.failureType !== 'none') {
      console.error(lines.join('\n'));
    } else {
      console.log(lines.join('\n'));
    }
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
     URL RESOLUTION
     ========================================================== */
  function resolveUrl(path) {
    try { return new URL(path, window.location.origin).href; } catch(e) { return path; }
  }

  /* ==========================================================
     ERROR CLASSIFICATION
     ========================================================== */
  function classifyError(err, tag) {
    var msg = err.message || '';
    var name = err.name || '';

    if (msg.indexOf('Failed to fetch') > -1 || msg.indexOf('NetworkError') > -1 || name === 'TypeError') {
      logWarn(tag, 'fetch() failed — diagnosing cause...');
      var detail = 'fetch() failed. Possible causes: (1) Cloudflare Function not running, (2) GAS backend unreachable, (3) CORS blocked at network level, (4) DNS failure, (5) Connection refused.';
      return {
        type: 'network',
        message: 'Cannot reach the API server. Check browser console (F12) → Network tab for details.',
        detail: detail,
        retryable: true
      };
    }

    if (name === 'AbortError' || msg.indexOf('timeout') > -1) {
      return { type: 'timeout', message: 'Request timed out. Server may be overloaded.', retryable: true };
    }

    if (msg.indexOf('401') > -1 || msg.indexOf('Unauthorized') > -1 || msg.indexOf('Session expired') > -1) {
      return { type: 'auth', message: 'Session expired. Please login again.', retryable: false };
    }

    if (msg.indexOf('500') > -1 || msg.indexOf('Internal') > -1) {
      return { type: 'server', message: 'Server error. Please try again.', retryable: true };
    }

    if (msg.indexOf('502') > -1 || msg.indexOf('Bad Gateway') > -1) {
      return { type: 'backend', message: 'GAS backend unreachable or timed out.', detail: 'Cloudflare Function could not reach GAS. Check GAS deployment.', retryable: true };
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

    var fullUrl = resolveUrl(API_BASE_URL);

    console.log('%c[NET] ═══ FETCH REQUEST ═══', 'color:#0af;font-weight:bold');
    console.log('[NET] Action:      ' + action);
    console.log('[NET] Attempt:     ' + (attempt + 1) + '/' + (maxRetries + 1));
    console.log('[NET] API_BASE:    ' + API_BASE_URL);
    console.log('[NET] Resolved:    ' + fullUrl);
    console.log('[NET] Origin:      ' + window.location.origin);
    console.log('[NET] Protocol:    ' + window.location.protocol);
    console.log('[NET] Host:        ' + window.location.host);
    console.log('[NET] href:        ' + window.location.href);
    console.log('[NET] Method:      POST');
    console.log('[NET] Body:        ' + bodyStr.slice(0, 500));
    console.log('[NET] Online:      ' + navigator.onLine);
    console.log('[NET] SW Active:   ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : 'none'));

    setDiagnostics({ step: 'request', status: 'sending ' + action, detail: fullUrl });

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

      console.log('%c[NET] Calling fetch(' + API_BASE_URL + ')...', 'color:#ff0');

      fetch(API_BASE_URL, fetchOpts)
        .then(function(resp) {
          var elapsed = Date.now() - fetchStart;
          if (timeoutId) clearTimeout(timeoutId);

          var ct = resp.headers.get('content-type') || '';
          var cors = resp.headers.get('access-control-allow-origin') || '(none)';
          var server = resp.headers.get('server') || '';
          var cfRay = resp.headers.get('cf-ray') || '';

          console.log('%c[NET] ═══ RESPONSE ═══', 'color:#0f0;font-weight:bold');
          console.log('[NET] Status:      ' + resp.status + ' ' + resp.statusText);
          console.log('[NET] OK:          ' + resp.ok);
          console.log('[NET] Type:        ' + resp.type);
          console.log('[NET] URL:         ' + resp.url);
          console.log('[NET] Redirected:  ' + resp.redirected);
          console.log('[NET] CT:          ' + ct);
          console.log('[NET] CORS:        ' + cors);
          console.log('[NET] Server:      ' + server);
          console.log('[NET] CF-Ray:      ' + cfRay);
          console.log('[NET] Elapsed:     ' + elapsed + 'ms');

          log(tag, 'HTTP ' + resp.status + ' (' + elapsed + 'ms) CT:' + ct + ' CORS:' + cors + ' Server:' + server + ' CF-Ray:' + cfRay);

          setDiagnostics({
            step: 'response',
            status: 'HTTP ' + resp.status,
            detail: 'CT: ' + ct + ' | CORS: ' + cors + ' | Server: ' + server + ' | CF-Ray: ' + cfRay
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
                logNet(tag, {
                  requestUrl: fullUrl, method: 'POST', requestBody: bodyStr.slice(0, 300),
                  status: resp.status, ok: false, responseHeaders: 'CT:' + ct + ' CORS:' + cors,
                  responseBody: body.slice(0, 500), failureType: 'HTTP ' + resp.status, failureDetail: errMsg, elapsed: elapsed
                });
                reject(new Error(errMsg || 'Server returned an error page (HTTP ' + resp.status + ')'));
              } else {
                logNet(tag, {
                  requestUrl: fullUrl, method: 'POST', requestBody: bodyStr.slice(0, 300),
                  status: resp.status, ok: false, responseHeaders: 'CT:' + ct + ' CORS:' + cors,
                  responseBody: body.slice(0, 500), failureType: 'HTTP ' + resp.status, failureDetail: body || resp.statusText, elapsed: elapsed
                });
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
              logNet(tag, {
                requestUrl: fullUrl, method: 'POST', requestBody: bodyStr.slice(0, 300),
                status: 200, ok: true, responseHeaders: '(see above)',
                responseBody: text.slice(0, 500), failureType: 'HTML response', failureDetail: errMsg, elapsed: elapsed
              });
              setDiagnostics({ step: 'parse', status: 'HTML response', detail: errMsg });
              reject(new Error(errMsg || 'Server returned HTML instead of JSON. Redeploy GAS web app.'));
            } else {
              logError(tag, 'JSON parse failed. Raw: ' + text.slice(0, 500));
              logNet(tag, {
                requestUrl: fullUrl, method: 'POST', requestBody: bodyStr.slice(0, 300),
                status: 200, ok: true, responseHeaders: '(see above)',
                responseBody: text.slice(0, 500), failureType: 'Invalid JSON', failureDetail: text.slice(0, 200), elapsed: elapsed
              });
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
            logNet(tag, {
              requestUrl: fullUrl, method: 'POST', requestBody: bodyStr.slice(0, 300),
              status: 200, ok: true, responseHeaders: '(see above)',
              responseBody: text.slice(0, 500), failureType: 'API error', failureDetail: result.error || 'unknown', elapsed: elapsed
            });
            setDiagnostics({ step: 'api', status: 'error', detail: result.error });
            reject(new Error(result.error || 'Request failed'));
            return;
          }

          log(tag, 'SUCCESS: ' + action + ' (' + elapsed + 'ms)');
          setDiagnostics({ step: 'done', status: 'success' });
          resolve(result.data);
        })
        .catch(function(err) {
          if (timeoutId) clearTimeout(timeoutId);

          var elapsed = Date.now() - fetchStart;

          console.log('%c[NET] ═══ FETCH FAILED ═══', 'color:#f00;font-weight:bold');
          console.error('[NET] Action:      ' + action);
          console.error('[NET] Error:       ' + (err.message || 'unknown'));
          console.error('[NET] Error Name:  ' + (err.name || 'unknown'));
          console.error('[NET] URL:         ' + fullUrl);
          console.error('[NET] Method:      POST');
          console.error('[NET] Elapsed:     ' + elapsed + 'ms');
          console.error('[NET] Online:      ' + navigator.onLine);
          console.error('[NET] SW Active:   ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : 'none'));

          var classified = classifyError(err, tag);

          console.log('%c[NET] FAILURE TYPE: ' + classified.type.toUpperCase(), 'color:#f80;font-weight:bold');
          console.log('[NET] Message:     ' + classified.message);
          console.log('[NET] Detail:      ' + (classified.detail || 'N/A'));
          console.log('[NET] Retryable:   ' + classified.retryable);

          if (classified.type === 'network') {
            console.log('%c[NET] ═══ POSSIBLE CAUSES ═══', 'color:#f80;font-weight:bold');
            console.log('[NET] 1. Cloudflare Tunnel URL changed or expired');
            console.log('[NET] 2. wrangler pages dev not running on port 8788');
            console.log('[NET] 3. Tunnel not forwarding to localhost:8788');
            console.log('[NET] 4. DNS resolution failed for tunnel URL');
            console.log('[NET] 5. Browser offline (online=' + navigator.onLine + ')');
            console.log('[NET] 6. CORS preflight blocked (check DevTools → Network → preflight)');
            console.log('[NET] 7. Mixed content (HTTP page → HTTPS fetch blocked)');
            console.log('[NET] Tip: Open DevTools → Network tab, find the failed request,');
            console.log('[NET]       and check the "Headers" tab for the full Request URL.');
          }

          logNet(tag, {
            requestUrl: fullUrl, method: 'POST', requestBody: bodyStr.slice(0, 300),
            status: 'N/A (fetch failed)', ok: 'N/A', responseHeaders: 'N/A',
            responseBody: 'N/A', failureType: classified.type, failureDetail: classified.detail || classified.message, elapsed: elapsed
          });

          setDiagnostics({ step: 'error', status: classified.type, detail: classified.detail || classified.message });

          if (classified.type === 'auth') {
            setToken(null);
            emit('auth:expired');
          }

          if (classified.retryable && attempt < maxRetries) {
            var delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            log(tag, 'Retrying in ' + delay + 'ms (attempt ' + (attempt + 2) + '/' + (maxRetries + 1) + ')');
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
    var fullUrl = resolveUrl(API_BASE_URL);
    log('PING', 'POST to ' + fullUrl);
    return call('getServerTimestamp', {}, { retry: false, timeout: 15000 })
      .catch(function(postErr) {
        logWarn('PING', 'POST failed: ' + postErr.message + '. Trying GET...');
        return pingGet();
      });
  }

  function pingGet() {
    var tag = 'PING-GET';
    var fullUrl = resolveUrl(API_BASE_URL + '?ping=1&t=' + Date.now());
    log(tag, 'GET ' + fullUrl);
    setDiagnostics({ step: 'ping-get', status: 'sending', detail: fullUrl });

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

          var ct = resp.headers.get('content-type') || '';
          var cors = resp.headers.get('access-control-allow-origin') || '(none)';
          var cfRay = resp.headers.get('cf-ray') || '';

          log(tag, 'HTTP ' + resp.status + ' (' + elapsed + 'ms) CT:' + ct + ' CORS:' + cors + ' CF-Ray:' + cfRay);
          setDiagnostics({
            step: 'ping-get',
            status: 'HTTP ' + resp.status,
            detail: 'CT: ' + ct + ' | CORS: ' + cors + ' | CF-Ray: ' + cfRay
          });

          return resp.text();
        })
        .then(function(text) {
          var elapsed = Date.now() - fetchStart;
          var isHtml = text && (text.indexOf('<!DOCTYPE') > -1 || text.indexOf('<html') > -1);
          if (isHtml) {
            var errMsg = extractHtmlError(text);
            log(tag, 'HTML response: ' + (errMsg || text.slice(0, 200)));
            logNet(tag, {
              requestUrl: fullUrl, method: 'GET', requestBody: '(none)',
              status: 200, ok: true, responseHeaders: '(see above)',
              responseBody: text.slice(0, 500), failureType: 'HTML response', failureDetail: errMsg || 'GAS returns HTML (doPost not deployed)', elapsed: elapsed
            });
            resolve({ reachable: true, html: true, error: errMsg || 'GAS returns HTML (doPost not deployed)' });
          } else {
            log(tag, 'Non-HTML response: ' + text.slice(0, 200));
            logNet(tag, {
              requestUrl: fullUrl, method: 'GET', requestBody: '(none)',
              status: 200, ok: true, responseHeaders: '(see above)',
              responseBody: text.slice(0, 500), failureType: 'none', failureDetail: 'Reachable', elapsed: elapsed
            });
            resolve({ reachable: true, html: false, body: text.slice(0, 200) });
          }
        })
        .catch(function(err) {
          var elapsed = Date.now() - fetchStart;
          if (timeoutId) clearTimeout(timeoutId);
          logError(tag, 'GET failed: ' + err.message + ' (' + elapsed + 'ms)');
          logNet(tag, {
            requestUrl: fullUrl, method: 'GET', requestBody: '(none)',
            status: 'N/A (fetch failed)', ok: 'N/A', responseHeaders: 'N/A',
            responseBody: 'N/A', failureType: classifyError(err, tag).type, failureDetail: err.message, elapsed: elapsed
          });
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
     DIAGNOSTIC: Full chain test (call from browser console: API.diagnose())
     Tests each layer independently:
       1. DNS / origin reachability
       2. Cloudflare Function health
       3. Cloudflare Function → GAS proxy
       4. Full API call with auth
     ========================================================== */
  function diagnose() {
    var results = [];
    var origin = window.location.origin;
    var baseUrl = resolveUrl(API_BASE_URL);

    log('DIAG', '═══════════════════════════════════════════════════');
    log('DIAG', 'Starting full network chain diagnosis...');
    log('DIAG', 'Origin: ' + origin);
    log('DIAG', 'API URL: ' + baseUrl);
    log('DIAG', 'User Agent: ' + navigator.userAgent);
    log('DIAG', 'Online: ' + navigator.onLine);
    log('DIAG', '═══════════════════════════════════════════════════');

    function step(name, fn) {
      return fn().then(function(val) {
        results.push({ step: name, status: 'OK', detail: val });
        log('DIAG', '  ✓ ' + name + ': ' + (typeof val === 'string' ? val : 'OK'));
        return val;
      }).catch(function(err) {
        var msg = err.message || String(err);
        results.push({ step: name, status: 'FAIL', detail: msg });
        logError('DIAG', '  ✗ ' + name + ': ' + msg);
        return null;
      });
    }

    return Promise.resolve()
      .then(function() {
        return step('1. Browser online check', function() {
          if (!navigator.onLine) return Promise.reject(new Error('Browser is offline'));
          return 'Online=' + navigator.onLine;
        });
      })
      .then(function() {
        return step('2. DNS / origin reachability (' + origin + ')', function() {
          return new Promise(function(resolve, reject) {
            var ctrl = new AbortController();
            var tid = setTimeout(function() { ctrl.abort(); }, 8000);
            fetch(origin, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
              .then(function(r) { clearTimeout(tid); resolve('Status=' + r.status + ' Type=' + r.type); })
              .catch(function(e) { clearTimeout(tid); reject(e); });
          });
        });
      })
      .then(function() {
        return step('3. Health check (GET /api/exec?health=1)', function() {
          return new Promise(function(resolve, reject) {
            var ctrl = new AbortController();
            var tid = setTimeout(function() { ctrl.abort(); }, 10000);
            fetch('/api/exec?health=1', { method: 'GET', cache: 'no-store', signal: ctrl.signal })
              .then(function(r) { clearTimeout(tid); return r.text().then(function(t) { resolve('HTTP ' + r.status + ' | ' + t.slice(0, 300)); }); })
              .catch(function(e) { clearTimeout(tid); reject(e); });
          });
        });
      })
      .then(function() {
        return step('4. GAS proxy test (GET /api/exec?diag=1)', function() {
          return new Promise(function(resolve, reject) {
            var ctrl = new AbortController();
            var tid = setTimeout(function() { ctrl.abort(); }, 20000);
            fetch('/api/exec?diag=1', { method: 'GET', cache: 'no-store', signal: ctrl.signal })
              .then(function(r) { clearTimeout(tid); return r.text().then(function(t) { resolve('HTTP ' + r.status + ' | ' + t.slice(0, 500)); }); })
              .catch(function(e) { clearTimeout(tid); reject(e); });
          });
        });
      })
      .then(function() {
        return step('5. POST /api/exec (getServerTimestamp)', function() {
          return new Promise(function(resolve, reject) {
            var ctrl = new AbortController();
            var tid = setTimeout(function() { ctrl.abort(); }, 15000);
            fetch('/api/exec', {
              method: 'POST',
              mode: 'cors',
              cache: 'no-store',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              signal: ctrl.signal,
              body: JSON.stringify({ action: 'getServerTimestamp', token: '', data: {} })
            })
              .then(function(r) {
                clearTimeout(tid);
                var ct = r.headers.get('content-type') || '';
                var cors = r.headers.get('access-control-allow-origin') || 'MISSING';
                return r.text().then(function(t) {
                  resolve('HTTP ' + r.status + ' CT=' + ct + ' CORS=' + cors + ' | ' + t.slice(0, 300));
                });
              })
              .catch(function(e) { clearTimeout(tid); reject(e); });
          });
        });
      })
      .then(function() {
        log('DIAG', '═══════════════════════════════════════════════════');
        log('DIAG', 'Diagnosis complete. Results:');
        results.forEach(function(r) { log('DIAG', '  ' + r.status + ' | ' + r.step + ': ' + r.detail); });
        log('DIAG', '═══════════════════════════════════════════════════');
        return results;
      })
      .catch(function() {
        logError('DIAG', 'Diagnosis completed with failures');
        return results;
      });
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
    getDiagnostics: getDiagnostics,
    diagnose: diagnose,
    logNet: logNet,
    testFetch: function(url) {
      url = url || API_BASE_URL;
      var fullUrl = resolveUrl(url);
      var tag = 'TEST';
      log(tag, 'Testing fetch to: ' + fullUrl);
      var start = Date.now();
      return fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store' })
        .then(function(resp) {
          var elapsed = Date.now() - start;
          var headers = {};
          resp.headers.forEach(function(v, k) { headers[k] = v; });
          return resp.text().then(function(body) {
            var result = {
              url: fullUrl,
              status: resp.status,
              ok: resp.ok,
              type: resp.type,
              headers: headers,
              bodyPreview: body.slice(0, 500),
              elapsed: elapsed
            };
            log(tag, 'Result:', result);
            return result;
          });
        })
        .catch(function(err) {
          var elapsed = Date.now() - start;
          var classified = classifyError(err, tag);
          var result = {
            url: fullUrl,
            error: err.message,
            errorName: err.name,
            failureType: classified.type,
            failureDetail: classified.detail,
            elapsed: elapsed
          };
          logError(tag, 'Failed:', result);
          return result;
        });
    }
  };
})();
