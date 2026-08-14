var GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

var GAS_TIMEOUT_MS = 55000;

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({}, CORS_HEADERS, { 'Content-Type': 'application/json; charset=utf-8' })
  });
}

function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function handleRequest(context) {
  try {
    var request = context.request;
    var url = new URL(request.url);

    if (url.searchParams.get('health') === '1') {
      return jsonResponse({ status: 'ok', gas_url: GAS_URL ? 'set' : 'MISSING' }, 200);
    }

    var gasUrl = GAS_URL + url.search;

    var fetchOpts = {
      method: request.method,
      redirect: 'follow',
      headers: {}
    };

    if (request.method === 'POST') {
      var body = await request.text();
      fetchOpts.headers['Content-Type'] = 'text/plain;charset=utf-8';
      fetchOpts.body = body;
    }

    // GAS web apps intermittently answer with a Google HTML interstitial page
    // (consent / re-authorization) instead of the application JSON. Retry a
    // couple of times before surfacing an error to the client.
    var attempts = 3;
    var delayMs = 500;
    var gasResponse = null;
    var responseBody = null;
    var ct = '';
    var isJson = false;
    var lastStatus = 0;

    for (var attempt = 1; attempt <= attempts; attempt++) {
      var controller = new AbortController();
      var tid = setTimeout(function() { controller.abort(); }, GAS_TIMEOUT_MS);
      try {
        gasResponse = await fetch(gasUrl, Object.assign({ signal: controller.signal }, fetchOpts));
      } catch (fetchErr) {
        clearTimeout(tid);
        if (attempt < attempts) { await new Promise(function(res) { setTimeout(res, delayMs); }); continue; }
        var errMsg = fetchErr.name === 'AbortError'
          ? 'GAS backend timed out after ' + (GAS_TIMEOUT_MS / 1000) + 's'
          : 'GAS backend unreachable: ' + fetchErr.message;
        return jsonResponse({ success: false, error: errMsg }, 502);
      }
      clearTimeout(tid);

      try {
        responseBody = await gasResponse.text();
      } catch (textErr) {
        return jsonResponse({ success: false, error: 'Failed to read GAS response: ' + textErr.message }, 502);
      }

      ct = gasResponse.headers.get('content-type') || '';
      isJson = ct.indexOf('application/json') > -1 || (responseBody && responseBody.charAt(0) === '{');
      lastStatus = gasResponse.status;
      if (isJson) break;

      if (attempt < attempts) {
        await new Promise(function(res) { setTimeout(res, delayMs * attempt); });
        continue;
      }
      return jsonResponse({
        success: false,
        error: 'GAS backend returned a non-JSON response (status ' + lastStatus + '). Please try again.'
      }, 502);
    }

    var respHeaders = Object.assign({}, CORS_HEADERS, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });

    return new Response(responseBody, {
      status: lastStatus,
      headers: respHeaders
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Proxy error: ' + err.message }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return handleOptions();
  return handleRequest(context);
}

export async function onRequestOptions(context) {
  return handleOptions();
}

export async function onRequestPost(context) {
  return handleRequest(context);
}

export async function onRequestGet(context) {
  return handleRequest(context);
}
