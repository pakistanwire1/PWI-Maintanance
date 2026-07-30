import urllib.request, hashlib, sys

BASE = 'https://pwi-maintanance.pages.dev'
LOCAL_DIR = r'D:\CLASP\CMMS\PWI-Maintanance\cloudflare'

files = [
    'index.html',
    'sw.js',
    'manifest.json',
    '_headers',
    '_routes.json',
    'css/styles.css',
    'css/dashboard.css',
    'css/login.css',
    'css/welcome.css',
    'js/core/router.js',
    'js/core/api.js',
    'js/core/loader.js',
    'js/core/session.js',
    'js/core/nav.js',
    'js/core/notify.js',
    'js/core/forms.js',
    'js/core/modal.js',
    'js/core/table.js',
    'js/core/badge.js',
    'js/core/icons.js',
    'js/app.js',
    'js/pages/dashboard.js',
    'js/pages/sections.js',
    'js/pages/departments.js',
    'js/pages/machines.js',
    'js/pages/assets.js',
    'js/pages/technicians.js',
    'js/pages/users.js',
    'js/pages/openjobcard.js',
    'js/pages/startjobcard.js',
    'js/pages/closejobcard.js',
    'js/pages/pendingjobcard.js',
    'js/pages/approvejobcard.js',
    'js/pages/jobcards.js',
    'js/pages/pm.js',
    'js/pages/checklists.js',
    'js/pages/spareparts.js',
    'js/pages/inventory.js',
    'js/pages/breakdown.js',
    'js/pages/pmhistory.js',
    'js/pages/audit.js',
    'js/pages/reports.js',
    'js/pages/notifications.js',
    'js/pages/email.js',
    'js/pages/whatsapp.js',
    'js/pages/qr.js',
    'js/pages/settings.js',
    'js/pages/backuprestore.js',
    'assets/icons/icon-192.svg',
    'assets/icons/icon-512.svg',
]

import os, json

results = []

for f in files:
    deployed_url = BASE + '/' + f.replace('\\', '/')
    local_path = os.path.join(LOCAL_DIR, f)
    
    # Fetch deployed
    try:
        req = urllib.request.Request(deployed_url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=15)
        deployed_data = resp.read()
        deployed_hash = hashlib.sha256(deployed_data).hexdigest()
        deployed_size = len(deployed_data)
        deployed_status = resp.getcode()
    except Exception as e:
        results.append({'file': f, 'status': 'FETCH_ERROR', 'detail': str(e)})
        continue
    
    # Read local
    if not os.path.exists(local_path):
        results.append({'file': f, 'status': 'LOCAL_MISSING', 'detail': f'Local file not found at {local_path}',
                        'deployed_size': deployed_size, 'deployed_sha256': deployed_hash})
        continue
    
    with open(local_path, 'rb') as lf:
        local_data = lf.read()
    local_hash = hashlib.sha256(local_data).hexdigest()
    local_size = len(local_data)
    
    if local_hash == deployed_hash:
        results.append({'file': f, 'status': 'MATCH', 'size': local_size, 'sha256': local_hash})
    else:
        results.append({'file': f, 'status': 'DIFFER', 'local_size': local_size, 'deployed_size': deployed_size,
                        'local_sha256': local_hash, 'deployed_sha256': deployed_hash})

print('=' * 100)
print(f'{"FILE":60} {"STATUS":15} {"SIZE":10} {"SHA256":70}')
print('=' * 100)
any_diff = False
for r in results:
    status = r['status']
    if status == 'MATCH':
        s = f"{r['file']:60} {status:15} {r['size']:<10} {r['sha256']:70}"
    elif status == 'DIFFER':
        any_diff = True
        s = f"{r['file']:60} {status:15} L:{r['local_size']}<10 D:{r['deployed_size']:<10} L:{r['local_sha256'][:16]}... D:{r['deployed_sha256'][:16]}..."
    elif status == 'FETCH_ERROR':
        any_diff = True
        s = f"{r['file']:60} {status:15} {'N/A':<10} {r['detail']:70}"
    elif status == 'LOCAL_MISSING':
        any_diff = True
        s = f"{r['file']:60} {status:15} {'N/A':<10} {r['detail']:70}"
    else:
        s = f"{r['file']:60} {status:15} {'N/A':<10}"
    print(s)
print('=' * 100)
print(f'\nTotal files: {len(results)}')
print(f'Matches: {sum(1 for r in results if r["status"] == "MATCH")}')
print(f'Differences: {sum(1 for r in results if r["status"] != "MATCH")}')

if not any_diff:
    print('\n*** ALL FILES MATCH - REPOSITORY = DEPLOYMENT ***')
else:
    print('\n*** SOME FILES DIFFER ***')
    for r in results:
        if r['status'] == 'DIFFER':
            print(f'\n-- {r["file"]} --')
            print(f'  Local({r["local_size"]}):    {r["local_sha256"]}')
            print(f'  Deployed({r["deployed_size"]}): {r["deployed_sha256"]}')
