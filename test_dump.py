import urllib.request, urllib.error, json, time, ssl

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'
ctx = ssl.create_default_context()

# Login first
payload = {'action': 'login', 'token': '', 'data': {'email': 'supervisor@cmms.com', 'password': 'super123'}}
data = json.dumps(payload).encode()
r = urllib.request.Request(GAS_URL, data=data, method='POST', headers={
    'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
})
resp = urllib.request.urlopen(r, timeout=60, context=ctx)
body = json.loads(resp.read().decode())
token = body.get('data', {}).get('token', '')
print(f'Login token: {token[:30]}...')
print(f'Full login response: {json.dumps(body, indent=2)[:500]}')
print()

# Now make one API call and dump the raw response
payload2 = {'action': 'getDashboard', 'token': token, 'data': {}}
data2 = json.dumps(payload2).encode()
r2 = urllib.request.Request(GAS_URL, data=data2, method='POST', headers={
    'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
})
start = time.time()
resp2 = urllib.request.urlopen(r2, timeout=60, context=ctx)
elapsed = time.time() - start
raw = resp2.read().decode('utf-8', errors='replace')
print(f'getDashboard response ({elapsed:.3f}s):')
print(raw[:2000])
print()

# Try getSections
payload3 = {'action': 'getSections', 'token': token, 'data': {}}
data3 = json.dumps(payload3).encode()
r3 = urllib.request.Request(GAS_URL, data=data3, method='POST', headers={
    'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
})
start = time.time()
resp3 = urllib.request.urlopen(r3, timeout=60, context=ctx)
elapsed = time.time() - start
raw3 = resp3.read().decode('utf-8', errors='replace')
print(f'getSections response ({elapsed:.3f}s):')
print(raw3[:2000])
