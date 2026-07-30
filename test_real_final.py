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
        outer_err = body.get('error', '') if not outer_ok else ''
        data_len = len(raw)
        return {
            'action': action,
            'status': resp.status,
            'time': elapsed,
            'result': 'PASS' if outer_ok else 'FAIL',
            'message': outer_err[:80] if outer_err else f'{data_len}b data',
            'data_len': data_len,
            'raw': raw[:500],
            'body': body,
        }
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        raw = e.read().decode('utf-8', errors='replace')
        return {
            'action': action,
            'status': e.code,
            'time': elapsed,
            'result': 'FAIL',
            'message': f'HTTP {e.code}',
            'data_len': len(raw),
            'raw': raw[:500],
            'body': raw,
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            'action': action,
            'status': 'ERROR',
            'time': elapsed,
            'result': 'FAIL',
            'message': f'{type(e).__name__}: {str(e)[:80]}',
            'data_len': 0,
            'raw': '',
            'body': None,
        }

# LOGIN
print('LOGIN')
r = call('login', {'email': 'supervisor@cmms.com', 'password': 'super123'}, '')
if r['result'] == 'PASS' and r['body'].get('data', {}).get('token'):
    token = r['body']['data']['token']
    print(f'  TOKEN: {token[:30]}...')
else:
    print(f'  FAILED: {r["message"]}')
    exit(1)

print(f'\n{"API Name":30s} {"Status":6s} {"Time":9s} {"Result":6s} {"Info"}')
print('=' * 100)

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

pass_count = 0
fail_count = 0
results = []

for action, data in actions:
    r = call(action, data, token)
    results.append(r)
    if r['result'] == 'PASS':
        pass_count += 1
    else:
        fail_count += 1
    print(f'{action:30s} {str(r["status"]):6s} {r["time"]:7.3f}s {r["result"]:6s} {r["message"][:50]}')

print('=' * 100)
print(f'TOTAL: {pass_count} PASS, {fail_count} FAIL')
print()

if fail_count > 0:
    print('FAILURES:')
    for r in results:
        if r['result'] == 'FAIL':
            print(f'  API: {r["action"]}')
            print(f'  Status: {r["status"]}')
            print(f'  Time: {r["time"]:.3f}s')
            print(f'  Response: {r["raw"][:300]}')
            print()

print('RESPONSE TIME ANALYSIS:')
times = [r['time'] for r in results]
times_sorted = sorted(times)
print(f'  Cold start (first request): {times[0]:.3f}s')
print(f'  Fastest: {times_sorted[0]:.3f}s')
print(f'  Slowest: {times_sorted[-1]:.3f}s')
print(f'  Median: {times_sorted[len(times_sorted)//2]:.3f}s')
print(f'  Average: {sum(times)/len(times):.3f}s')
print(f'  Total (sequential): {sum(times):.3f}s')
print()
print('DATA VOLUME:')
total_bytes = sum(r['data_len'] for r in results)
for r in sorted(results, key=lambda x: x['data_len'], reverse=True)[:5]:
    print(f'  {r["action"]:30s} {r["data_len"]:>8,} bytes  ({r["time"]:.3f}s)')
print(f'  Total: {total_bytes:,} bytes across {len(results)} requests')
