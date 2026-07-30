import urllib.request, re, hashlib, os

BASE = 'https://pwi-maintanance.pages.dev'
LOCAL_DIR = r'D:\CLASP\CMMS\PWI-Maintanance\cloudflare'

# Get deployed HTML
req = urllib.request.Request(BASE + '/', headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, timeout=15)
deployed_html = resp.read().decode('utf-8')

# Get local HTML
with open(os.path.join(LOCAL_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    local_html = f.read()

# Extract script srcs
def extract_scripts(html, base_url=''):
    scripts = re.findall(r'<script[^>]*src=\"([^\"]+)\"[^>]*>', html)
    return [s for s in scripts if not s.startswith('http') and not s.startswith('//')]

deployed_scripts = extract_scripts(deployed_html)
local_scripts = extract_scripts(local_html)

print("=== DEPLOYED SCRIPT INCLUDES ===")
for s in sorted(deployed_scripts):
    print(f"  {s}")

print("\n=== LOCAL SCRIPT INCLUDES ===")
for s in sorted(local_scripts):
    print(f"  {s}")

print("\n=== IN DEPLOYED BUT NOT LOCAL ===")
ds = set(deployed_scripts)
ls = set(local_scripts)
for s in sorted(ds - ls):
    print(f"  {s}")

print("\n=== IN LOCAL BUT NOT DEPLOYED ===")
for s in sorted(ls - ds):
    print(f"  {s}")
