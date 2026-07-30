import urllib.request, urllib.error, json, time, ssl

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'
ctx = ssl.create_default_context()

token = None

def req(label, payload, timeout=90):
    global token
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
        success = body.get('success', False)
        api_data = body.get('data', {}) if success else None
        api_success = api_data.get('success', False) if isinstance(api_data, dict) else False
        api_error = api_data.get('message', api_data.get('error', '')) if isinstance(api_data, dict) else ''
        print(f'URL: {GAS_URL}')
        print(f'Method: POST')
        print(f'Payload: action={payload.get("action")}')
        print(f'Status: {resp.status}')
        print(f'Response Time: {elapsed:.3f}s')
        print(f'Response: {json.dumps(body, indent=2)[:2000]}')
        if success and isinstance(api_data, dict) and api_data.get('success'):
            t = api_data.get('token', '')
            if t:
                token = t
                print(f'TOKEN SAVED: {t[:40]}...')
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
    print()

# === FRONTEND-MATCHING FORMAT ===
# Frontend API.js sends: { action: "login", token: "", data: { email, password } }
body, t = req('1. LOGIN (frontend format)', {
    'action': 'login',
    'token': '',
    'data': {'email': 'admin@cmms.com', 'password': 'admin123'}
})

if token:
    # === AUTHENTICATED REQUESTS ===
    for action, data in [
        ('getDashboard', {}),
        ('getUsers', {}),
        ('getMachines', {}),
        ('getSections', {}),
        ('getDepartments', {}),
        ('getAssets', {}),
        ('getTechnicians', {}),
        ('getJobCards', {}),
        ('getSpareParts', {}),
        ('getInventory', {}),
        ('getChecklists', {}),
        ('getNotifications', {}),
        ('getPMSchedules', {}),
        ('getSettings', {}),
        ('getAuditTrail', {}),
        ('getReports', {}),
    ]:
        body, t = req(f'2. {action}', {
            'action': action,
            'token': token,
            'data': data
        })
        print()
else:
    print('NO TOKEN - cannot proceed with authenticated requests')
    print()

# === TIMEOUT TEST - multiple rapid requests to measure cold start ===
print('=== COLD START TIME TEST ===')
for i in range(3):
    body, t = req(f'Cold start run {i+1}', {
        'action': 'login',
        'token': '',
        'data': {'email': 'admin@cmms.com', 'password': 'admin123'}
    }, timeout=120)
    print()
