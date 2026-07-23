var GAS_URL = 'https://script.google.com/macros/s/AKfycbwsQMV5XIUd2Cb2hlKrbIXPiCP7woGGGEijHdNlwHWo6hhsfok8ojfZj4st5AFJmHcp/exec';

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
  var ts = new Date().toISOString();
  try {
    var request = context.request;
    var url = new URL(request.url);

    console.log('[' + ts + '] API function invoked: ' + request.method + ' ' + url.pathname + url.search);

    if (url.searchParams.get('health') === '1') {
      console.log('[' + ts + '] Health check requested');
      return jsonResponse({ status: 'ok', gas_url: GAS_URL ? 'set' : 'MISSING', ts: ts }, 200);
    }

    if (url.searchParams.get('diag') === '1') {
      console.log('[' + ts + '] Diagnostic requested, testing GAS reachability...');
      var gasTestOk = false;
      var gasTestErr = '';
      try {
        var controller = new AbortController();
        var tid = setTimeout(function() { controller.abort(); }, 10000);
        var testResp = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getServerTimestamp', token: '', data: {} }), signal: controller.signal });
        clearTimeout(tid);
        var testBody = await testResp.text();
        gasTestOk = true;
        console.log('[' + ts + '] GAS reachability test: OK, status=' + testResp.status + ', body=' + testBody.slice(0, 200));
        return jsonResponse({ status: 'ok', gas_reachable: true, gas_status: testResp.status, gas_body: testBody.slice(0, 300), ts: ts }, 200);
      } catch(e) {
        gasTestErr = e.message || String(e);
        console.error('[' + ts + '] GAS reachability test FAILED: ' + gasTestErr);
        return jsonResponse({ status: 'error', gas_reachable: false, gas_error: gasTestErr, ts: ts }, 200);
      }
    }

    var gasUrl = GAS_URL + url.search;

    var fetchOpts = {
      method: request.method,
      redirect: 'follow',
      headers: {}
    };

    if (request.method === 'POST') {
      var body = await request.text();
      console.log('[' + ts + '] Forwarding POST to GAS, body length=' + (body ? body.length : 0));
      fetchOpts.headers['Content-Type'] = 'text/plain;charset=utf-8';
      fetchOpts.body = body;
    }

    var gasResponse;
    try {
      var controller = new AbortController();
      var tid = setTimeout(function() { controller.abort(); }, GAS_TIMEOUT_MS);
      gasResponse = await fetch(gasUrl, fetchOpts);
      clearTimeout(tid);
      console.log('[' + ts + '] GAS responded: status=' + gasResponse.status);
    } catch (fetchErr) {
      var errMsg = fetchErr.name === 'AbortError'
        ? 'GAS backend timed out after ' + (GAS_TIMEOUT_MS / 1000) + 's'
        : 'GAS backend unreachable: ' + fetchErr.message;
      console.error('[' + ts + '] ' + errMsg);
      return jsonResponse({ success: false, error: errMsg, ts: ts }, 502);
    }

    var responseBody;
    try {
      responseBody = await gasResponse.text();
      console.log('[' + ts + '] GAS response body length=' + (responseBody ? responseBody.length : 0) + ', first 200=' + (responseBody ? responseBody.slice(0, 200) : 'null'));
    } catch (textErr) {
      console.error('[' + ts + '] Failed to read GAS response: ' + textErr.message);
      return jsonResponse({ success: false, error: 'Failed to read GAS response: ' + textErr.message, ts: ts }, 502);
    }

    var ct = gasResponse.headers.get('content-type') || '';
    var isJson = ct.indexOf('application/json') > -1 || (responseBody && responseBody.charAt(0) === '{');

    var respHeaders = Object.assign({}, CORS_HEADERS, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : ct || 'text/html; charset=utf-8'
    });

    return new Response(responseBody, {
      status: gasResponse.status,
      headers: respHeaders
    });
  } catch (err) {
    console.error('[' + ts + '] Proxy error: ' + err.message);
    return jsonResponse({ success: false, error: 'Proxy error: ' + err.message, ts: new Date().toISOString() }, 500);
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
