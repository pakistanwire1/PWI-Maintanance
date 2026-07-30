import urllib.request, urllib.error, json, time, ssl, sys

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'
ctx = ssl.create_default_context()

def call_api(action, data, token):
    payload = {'action': action, 'token': token or '', 'data': data or {}}
    body_bytes = json.dumps(payload).encode()
    start = time.time()
    try:
        r = urllib.request.Request(GAS_URL, data=body_bytes, method='POST', headers={
            'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
        })
        resp = urllib.request.urlopen(r, timeout=120, context=ctx)
        elapsed = time.time() - start
        raw = resp.read().decode('utf-8', errors='replace')
        try:
            body = json.loads(raw)
        except:
            body = {'parse_error': raw[:500]}
        outer_ok = body.get('success', False)
        inner = body.get('data', {}) if outer_ok else {}
        api_ok = inner.get('success', False) if isinstance(inner, dict) else False
        api_msg = inner.get('message', inner.get('error', '')) if isinstance(inner, dict) else ''
        api_code = inner.get('code', '') if isinstance(inner, dict) else ''
        record = {
            'API Name': action,
            'URL': GAS_URL,
            'Method': 'POST',
            'Status': resp.status,
            'Response Time': f'{elapsed:.3f}s',
            'success': api_ok,
            'error': api_msg or api_code,
            'body_size': len(raw),
        }
        return record, body
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        raw = e.read().decode('utf-8', errors='replace')
        record = {
            'API Name': action,
            'URL': GAS_URL,
            'Method': 'POST',
            'Status': e.code,
            'Response Time': f'{elapsed:.3f}s',
            'success': False,
            'error': f'HTTP {e.code}',
            'body_size': len(raw),
        }
        return record, raw[:500]
    except Exception as e:
        elapsed = time.time() - start
        record = {
            'API Name': action,
            'URL': GAS_URL,
            'Method': 'POST',
            'Status': 'TIMEOUT/ERROR',
            'Response Time': f'{elapsed:.3f}s',
            'success': False,
            'error': f'{type(e).__name__}: {str(e)[:100]}',
            'body_size': 0,
        }
        return record, None

# Login first
print('=== STEP 1: LOGIN ===')
payload = {'action': 'login', 'token': '', 'data': {'email': 'supervisor@cmms.com', 'password': 'super123'}}
data = json.dumps(payload).encode()
start = time.time()
r = urllib.request.Request(GAS_URL, data=data, method='POST', headers={
    'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
})
resp = urllib.request.urlopen(r, timeout=60, context=ctx)
body = json.loads(resp.read().decode())
token = body.get('data', {}).get('token', '')
login_data = body.get('data', {})
print(f'Login: success={login_data.get("success", False)} | message={login_data.get("message", "N/A")} | Token: {token[:30] if token else "NONE"}...')
print()

if not token:
    print('NO TOKEN - aborting')
    sys.exit(1)

# === ALL API CALLS ===
api_calls = [
    ('getDashboard', {}),
    ('getUsers', {'token': token}),
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
    ('getBreakdownTypes', {}),
    ('getReports', {}),
    ('getMaintenanceTeams', {}),
    ('getMachinePassport', {'machineId': ''}),
]

print(f'{"API Name":25s} {"Status":8s} {"Time":8s} {"Result":10s} {"Error/Message"}')
print('-' * 100)

all_results = []
for action, data in api_calls:
    record, raw_body = call_api(action, data, token)
    all_results.append(record)
    status = str(record['Status'])
    t = record['Response Time']
    ok = 'PASS' if record['success'] else 'FAIL'
    err = (record['error'] or '-')[:50]
    print(f'{action:25s} {status:8s} {t:8s} {ok:10s} {err}')

print()
print('=' * 100)
print('SUMMARY')
print('=' * 100)
passed = sum(1 for r in all_results if r['success'])
failed = sum(1 for r in all_results if not r['success'])
print(f'Passed: {passed}/{len(all_results)}')
print(f'Failed: {failed}/{len(all_results)}')
print()

if failed > 0:
    print('FAILED CALLS:')
    for r in all_results:
        if not r['success']:
            print(f'  {r["API Name"]:25s} Status={r["Status"]} Time={r["Response Time"]} Error={r["error"][:80]}')

print()
print('RESPONSE TIMES:')
times = [float(r['Response Time'].rstrip('s')) for r in all_results]
print(f'  Min: {min(times):.3f}s')
print(f'  Max: {max(times):.3f}s')
print(f'  Avg: {sum(times)/len(times):.3f}s')
print(f'  Total: {sum(times):.3f}s (sequential)')
