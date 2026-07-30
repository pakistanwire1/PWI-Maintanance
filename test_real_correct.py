import urllib.request, urllib.error, json, time, ssl

GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec'
ctx = ssl.create_default_context()

def call(action, payload_data, token, timeout=120):
    payload = {'action': action, 'token': token, 'data': payload_data}
    data = json.dumps(payload).encode()
    start = time.time()
    try:
        r = urllib.request.Request(GAS_URL, data=data, method='POST', headers={
            'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'
        })
        resp = urllib.request.urlopen(r, timeout=timeout, context=ctx)
        elapsed = time.time() - start
        raw = resp.read().decode('utf-8', errors='replace')
        try:
            body = json.loads(raw)
        except:
            body = {'parse_error': raw[:300]}
        outer_ok = body.get('success', False)
        inner = body.get('data', {}) if outer_ok else body
        api_ok = inner.get('success', False) if isinstance(inner, dict) else bool(inner)
        api_msg = inner.get('message', inner.get('error', '')) if isinstance(inner, dict) else ''
        summary = f'OK' if api_ok else f'FAIL'
        data_len = len(raw)
        sample = raw[:120].replace('\n', ' ').replace('\r', '')
        return {
            'action': action,
            'status': resp.status,
            'time': f'{elapsed:.3f}s',
            'result': summary,
            'message': api_msg[:80],
            'outer_ok': outer_ok,
            'api_ok': api_ok,
            'data_len': data_len,
            'sample': sample,
            'body': body,
        }
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        raw = e.read().decode('utf-8', errors='replace')
        return {
            'action': action,
            'status': e.code,
            'time': f'{elapsed:.3f}s',
            'result': 'FAIL',
            'message': f'HTTP {e.code}',
            'outer_ok': False,
            'api_ok': False,
            'data_len': len(raw),
            'sample': raw[:120],
            'body': raw,
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            'action': action,
            'status': 'ERROR',
            'time': f'{elapsed:.3f}s',
            'result': 'FAIL',
            'message': f'{type(e).__name__}: {str(e)[:80]}',
            'outer_ok': False,
            'api_ok': False,
            'data_len': 0,
            'sample': '',
            'body': None,
        }

print('STEP 1: LOGIN')
r = call('login', {'email': 'supervisor@cmms.com', 'password': 'super123'}, '')
if r['api_ok']:
    token = r['body']['data']['token']
    print(f'  OK Token: {token[:30]}...')
else:
    print(f'  FAIL: {r["message"]}')
    exit(1)

print()
print(f'{"API Name":30s} {"Status":8s} {"Time":8s} {"Result":8s} {"Message"}')
print('-' * 90)

# Test ALL routes with correct names
actions = [
    ('validateSession', {}),
    ('getDashboardData', {}),
    ('getUsers', {}),
    ('getMachines', {}),
    ('getSectionList', {}),
    ('getDepartmentList', {}),
    ('getDivisionList', {}),
    ('getAssets', {}),
    ('getTechnicians', {}),
    ('getMaintenanceTeams', {}),
    ('getJobCards', {}),
    ('getSpareParts', {}),
    ('getInventoryTransactions', {}),
    ('getAllTransactions', {}),
    ('getGoodsReceipt', {}),
    ('getChecklistTemplates', {}),
    ('getChecklists', {}),
    ('getNotifications', {}),
    ('getUnreadCount', {}),
    ('getPMRecords', {}),
    ('getPMHistory', {}),
    ('getBreakdownTypes', {}),
    ('getBreakdownHistory', {}),
    ('getAuditLogs', {}),
    ('getSettings', {}),
    ('getReportData', {'reportType': 'default', 'filters': {}}),
    ('getBackupHistory', {}),
    ('getServerTimestamp', {}),
    ('getSidebarCounts', {}),
]

results = []
for action, data in actions:
    r = call(action, data, token)
    results.append(r)
    msg = r['message'] if r['message'] else (f'{r["data_len"]}b' if r['data_len'] > 0 else '')
    print(f'{action:30s} {str(r["status"]):8s} {r["time"]:8s} {r["result"]:8s} {msg[:60]}')

print()
print('=' * 90)
print('SUMMARY')
print('=' * 90)
passed = sum(1 for r in results if r['api_ok'])
failed = sum(1 for r in results if not r['api_ok'])
total_requests = len(results)
print(f'Passed: {passed}/{total_requests}')
print(f'Failed: {failed}/{total_requests}')
print()

if failed > 0:
    print('DETAILED FAILURES:')
    for r in results:
        if not r['api_ok']:
            print(f'  {r["action"]:30s} Status={r["status"]} Time={r["time"]} Error={r["message"][:80]}')
            if r['sample']:
                print(f'    Response: {r["sample"][:200]}')
            print()

times = [float(r['time'].rstrip('s')) for r in results if r['time'].rstrip('s').replace('.','').isdigit()]
if times:
    print(f'Response Time Stats (first request = cold start):')
    print(f'  First (cold start): {times[0]:.3f}s' if len(times) > 0 else '')
    for i, t in enumerate(times):
        prefix = ''
        if i == 0:
            prefix = '   COLD'
        elif i < 5:
            prefix = '  WARM'
        print(f'  {prefix}: {action_names[i] if i < len(action_names) else "?"}: {t:.3f}s')
    print(f'  Min: {min(times):.3f}s Max: {max(times):.3f}s Avg: {sum(times)/len(times):.3f}s')
    print(f'  Total (sequential): {sum(times):.3f}s')
