var GAS_URL = 'https://script.google.com/macros/s/AKfycbzvvysRrSrakAVUZ-2e1ndCiWk6M6HU-j8Xtp5NmC9i5SLhEv1FDP-2P5hsxWYyoYwj/exec';

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

    var gasResponse;
    try {
      var controller = new AbortController();
      var tid = setTimeout(function() { controller.abort(); }, GAS_TIMEOUT_MS);
      gasResponse = await fetch(gasUrl, fetchOpts);
      clearTimeout(tid);
    } catch (fetchErr) {
      var errMsg = fetchErr.name === 'AbortError'
        ? 'GAS backend timed out after ' + (GAS_TIMEOUT_MS / 1000) + 's'
        : 'GAS backend unreachable: ' + fetchErr.message;
      return jsonResponse({ success: false, error: errMsg }, 502);
    }

    var responseBody;
    try {
      responseBody = await gasResponse.text();
    } catch (textErr) {
      return jsonResponse({ success: false, error: 'Failed to read GAS response: ' + textErr.message }, 502);
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
