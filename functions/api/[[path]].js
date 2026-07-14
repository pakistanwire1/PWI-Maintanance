var GAS_URL = 'https://script.google.com/macros/s/AKfycbwvKDsrHzyyYRIQRJQiT0zH7yTHgSpHF1NbMSVhc9fRVJcEoV2TcFhw5rgdHDyURaEE/exec';

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function handleRequest(context) {
  var request = context.request;
  var url = new URL(request.url);
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
    gasResponse = await fetch(gasUrl, fetchOpts);
  } catch (fetchErr) {
    return new Response(JSON.stringify({ success: false, error: 'GAS backend unreachable: ' + fetchErr.message }), {
      status: 502,
      headers: Object.assign({}, CORS_HEADERS, { 'Content-Type': 'application/json' })
    });
  }

  var responseBody = await gasResponse.text();
  var ct = gasResponse.headers.get('content-type') || '';
  var isJson = ct.indexOf('application/json') > -1 || (responseBody && responseBody.charAt(0) === '{');

  var respHeaders = Object.assign({}, CORS_HEADERS, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : ct || 'text/html; charset=utf-8'
  });

  return new Response(responseBody, {
    status: gasResponse.status,
    headers: respHeaders
  });
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return handleOptions();
  return handleRequest(context);
}
