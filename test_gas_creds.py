import urllib.request, urllib.error, json, time, ssl

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'
ctx = ssl.create_default_context()

def try_login(email, password, label=None):
    label = label or f'{email} / {password}'
    payload = {'action': 'login', 'token': '', 'data': {'email': email, 'password': password}}
    data = json.dumps(payload).encode()
    start = time.time()
    try:
        r = urllib.request.Request(GAS_URL, data=data, method='POST', headers={
            'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
        })
        resp = urllib.request.urlopen(r, timeout=60, context=ctx)
        elapsed = time.time() - start
        body = json.loads(resp.read().decode())
        inner = body.get('data', {})
        msg = inner.get('message', inner.get('error', ''))
        ok = inner.get('success', False)
        token = inner.get('token', '')
        status = 'OK' if ok else 'FAIL'
        print(f'  [{status}] {label:45s} -> {elapsed:6.3f}s  {msg[:60]}' + (f' TOKEN={token[:20]}...' if token else ''))
        if ok and token:
            return token
    except Exception as e:
        elapsed = time.time() - start
        print(f'  [ERR] {label:45s} -> {elapsed:6.3f}s  {type(e).__name__}: {str(e)[:60]}')
    return None

print('=== LOGIN ATTEMPTS ===')
print()

# Try all default credentials
creds = [
    ('admin@cmms.com', 'admin123'),
    ('manager@cmms.com', 'mgr123'),
    ('supervisor@cmms.com', 'super123'),
    ('engineer@cmms.com', 'eng123'),
    ('tech@cmms.com', 'tech123'),
    ('operator@cmms.com', 'oper123'),
    ('viewer@cmms.com', 'view123'),
    ('admin', 'admin'),
    ('admin', 'admin123'),
    ('admin@cmms.com', 'admin'),
    ('admin@pwimetals.com', 'admin123'),
    ('admin@pwi.com', 'admin123'),
]

for email, pw in creds:
    try_login(email, pw)

print()
print('=== CHECK EMAIL EXISTENCE ===')
for email in ['admin@cmms.com', 'admin', 'test@test.com']:
    payload = {'action': 'checkEmailExists', 'token': '', 'data': {'email': email}}
    data = json.dumps(payload).encode()
    start = time.time()
    try:
        r = urllib.request.Request(GAS_URL, data=data, method='POST', headers={
            'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
        })
        resp = urllib.request.urlopen(r, timeout=60, context=ctx)
        elapsed = time.time() - start
        body = json.loads(resp.read().decode())
        print(f'  checkEmailExists({email}) -> {elapsed:.3f}s  {json.dumps(body)[:200]}')
    except Exception as e:
        elapsed = time.time() - start
        print(f'  checkEmailExists({email}) -> {elapsed:.3f}s  {type(e).__name__}: {str(e)[:60]}')
