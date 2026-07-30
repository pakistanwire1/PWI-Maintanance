import subprocess, urllib.request

# Get nav.js from git HEAD
result = subprocess.run(['git', 'show', 'HEAD:cloudflare/js/core/nav.js'],
                      capture_output=True, text=True,
                      cwd=r'D:\CLASP\CMMS\PWI-Maintanance')
git_content = result.stdout.encode('utf-8')

# Get deployed nav.js
req = urllib.request.Request('https://pwi-maintanance.pages.dev/js/core/nav.js',
                            headers={'User-Agent': 'Mozilla/5.0'})
dep_content = urllib.request.urlopen(req, timeout=15).read()

print(f'Git size: {len(git_content)}, Deployed size: {len(dep_content)}')
print(f'Git ends with: {repr(git_content[-30:])}')
print(f'Dep ends with: {repr(dep_content[-30:])}')

for i in range(min(len(git_content), len(dep_content))):
    if git_content[i] != dep_content[i]:
        print(f'First diff at offset {i}:')
        print(f'  Git[{i}]: {git_content[i]:02x}')
        print(f'  Dep[{i}]: {dep_content[i]:02x}')
        ctx = 30
        print(f'  Git context: {repr(git_content[max(0,i-ctx):i+ctx])}')
        print(f'  Dep context: {repr(dep_content[max(0,i-ctx):i+ctx])}')
        break
