import urllib.request, urllib.error, json, time, ssl

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'
ctx = ssl.create_default_context()

def req(label, payload, timeout=60):
    print(f'=== {label} ===')
    data = json.dumps(payload).encode()
    start = time.time()
    try:
        r = urllib.request.Request(GAS_URL, data=data, method='POST', headers={
            'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
        })
        resp = urllib.request.urlopen(r, timeout=timeout, context=ctx)
        elapsed = time.time() - start
        body = json.loads(resp.read().decode())
        print(f'URL: {GAS_URL}')
        print(f'Method: POST')
        print(f'Status: {resp.status}')
        print(f'Response Time: {elapsed:.3f}s')
        print(f'Response: {json.dumps(body, indent=2)[:2000]}')
        return body, elapsed
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        body = json.loads(e.read().decode())
        print(f'Status: {e.code}')
        print(f'Response Time: {elapsed:.3f}s')
        print(f'Response: {json.dumps(body, indent=2)[:2000]}')
        return body, elapsed
    except Exception as e:
        elapsed = time.time() - start
        print(f'ERROR after {elapsed:.3f}s: {type(e).__name__}: {e}')
        return None, elapsed

# Test 1: data wrapper
body, t = req('LOGIN data wrapper', {
    'action': 'login',
    'data': {'email': 'admin@cmms.com', 'password': 'admin123'}
})

# Test 2: flat structure
body, t = req('LOGIN flat', {
    'action': 'login',
    'email': 'admin@cmms.com',
    'password': 'admin123'
})

# Try different email formats
body, t = req('LOGIN email-only field', {
    'action': 'login',
    'data': {'email': 'admin@cmms.com', 'password': 'admin123'}
})

# Test: what does the API.post JS method send?
# Let's check the frontend API module
