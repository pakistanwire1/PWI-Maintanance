import hashlib, subprocess, urllib.request

BASE = 'https://pwi-maintanance.pages.dev'

files = [
    'index.html', 'sw.js', 'manifest.json',
    'js/core/router.js', 'js/core/api.js', 'js/core/loader.js',
    'js/core/session.js', 'js/core/nav.js', 'js/core/notify.js',
    'js/core/forms.js', 'js/core/modal.js', 'js/core/table.js',
    'js/core/badge.js', 'js/core/icons.js', 'js/core/constants.js',
    'js/core/duration.js', 'js/core/theme.js', 'js/core/utils.js',
    'js/app.js',
    'js/pages/dashboard.js', 'js/pages/sections.js',
    'js/pages/departments.js', 'js/pages/machines.js', 'js/pages/assets.js',
    'js/pages/technicians.js', 'js/pages/users.js',
    'js/pages/all-jobcards.js', 'js/pages/approved-jobcards.js',
    'js/pages/audit-trail.js', 'js/pages/backuprestore.js',
    'js/pages/breakdown-history.js', 'js/pages/checklists.js',
    'js/pages/closed-jobcards.js', 'js/pages/email.js',
    'js/pages/goodsreceipt.js', 'js/pages/inventory.js',
    'js/pages/inventorytransactions.js', 'js/pages/login.js',
    'js/pages/notifications.js', 'js/pages/open-jobcards.js',
    'js/pages/pending-jobcards.js', 'js/pages/pm-history.js',
    'js/pages/pm-schedule.js', 'js/pages/qrcodes.js',
    'js/pages/reports.js', 'js/pages/settings.js',
    'js/pages/spare-parts.js', 'js/pages/started-jobcards.js',
    'js/pages/stockhistory.js', 'js/pages/welcome.js',
    'js/pages/whatsapp.js',
    'css/styles.css', 'css/dashboard.css', 'css/login.css', 'css/welcome.css',
    'assets/icons/icon-192.svg', 'assets/icons/icon-512.svg',
]

results = []
for f in files:
    try:
        req = urllib.request.Request(BASE + '/' + f, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=15)
        dep = resp.read()
        dep_hash = hashlib.sha256(dep).hexdigest()
    except Exception as e:
        results.append({'file': f, 'status': 'DEPLOY_ERROR', 'detail': str(e)})
        continue

    try:
        result = subprocess.run(['git', 'show', 'HEAD:cloudflare/' + f],
                              capture_output=True, text=True, cwd=r'D:\CLASP\CMMS\PWI-Maintanance')
        if result.returncode != 0:
            results.append({'file': f, 'status': 'GIT_MISSING'})
            continue
        git_content = result.stdout.encode('utf-8')
        git_hash = hashlib.sha256(git_content).hexdigest()
    except:
        results.append({'file': f, 'status': 'GIT_ERROR'})
        continue

    if dep_hash == git_hash:
        results.append({'file': f, 'status': 'MATCH', 'git_size': len(git_content), 'dep_size': len(dep)})
    else:
        results.append({'file': f, 'status': 'DIFFER', 'git_size': len(git_content), 'dep_size': len(dep),
                        'git_sha256': git_hash, 'dep_sha256': dep_hash})

print(f'Total: {len(results)}, Matches: {sum(1 for r in results if r["status"]=="MATCH")}, Diffs: {sum(1 for r in results if r["status"]=="DIFFER")}')
print()
diffs = [r for r in results if r['status'] == 'DIFFER']
for d in diffs:
    print(f'DIFF: {d["file"]}  git={d["git_size"]}b  dep={d["dep_size"]}b')
    print(f'  GIT sha256: {d["git_sha256"]}')
    print(f'  DEP sha256: {d["dep_sha256"]}')
