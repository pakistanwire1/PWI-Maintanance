import urllib.request, urllib.error, json, time, ssl

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'

ctx = ssl.create_default_context()

def try_request(label, method, body=None):
    print(f'=== {label} ===')
    data = json.dumps(body).encode() if body else None
    start = time.time()
    try:
        req = urllib.request.Request(GAS_URL, data=data, method=method, headers={
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json'
        })
        resp = urllib.request.urlopen(req, timeout=30, context=ctx)
        elapsed = time.time() - start
        body_bytes = resp.read()
        print(f'URL: {GAS_URL}')
        print(f'Method: {method}')
        print(f'Status: {resp.status}')
        print(f'Response Time: {elapsed:.3f}s')
        print(f'Body ({len(body_bytes)} bytes):')
        print(body_bytes.decode('utf-8', errors='replace')[:2000])
        return resp.status, elapsed, body_bytes
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        body_bytes = e.read()
        print(f'URL: {GAS_URL}')
        print(f'Method: {method}')
        print(f'Status: {e.code}')
        print(f'Response Time: {elapsed:.3f}s')
        print(f'Body ({len(body_bytes)} bytes):')
        print(body_bytes.decode('utf-8', errors='replace')[:2000])
        return e.code, elapsed, body_bytes
    except Exception as e:
        elapsed = time.time() - start
        print(f'ERROR after {elapsed:.3f}s: {type(e).__name__}: {e}')
        return None, elapsed, None
    print()

# 1. GET
try_request('REQUEST 1: GET to GAS endpoint', 'GET')

# 2. POST empty
try_request('REQUEST 2: POST empty payload', 'POST', {})

# 3. POST login with test creds
try_request('REQUEST 3: POST login test', 'POST', {'action': 'login', 'username': 'admin', 'password': 'admin'})

# 4. POST login likely creds
try_request('REQUEST 4: POST login admin/1234', 'POST', {'action': 'login', 'username': 'admin', 'password': '1234'})
