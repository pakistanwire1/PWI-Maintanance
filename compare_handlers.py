import re

with open('D:\\CLASP\\CMMS\\PWI-Maintanance\\MenuPage.html', 'r', encoding='utf-8') as f:
    gas = f.read()
with open('D:\\CLASP\\CMMS\\PWI-Maintanance\\cloudflare\\index.html', 'r', encoding='utf-8') as f:
    cf = f.read()

gas_approve = re.search(r'data-page="approvejobcard"[^>]*onclick="([^"]*)"', gas)
cf_approve = re.search(r'data-page="approvejobcard"[^>]*onclick="([^"]*)"', cf)
print(f'GAS approve onclick: {gas_approve.group(1) if gas_approve else "NOT FOUND"}')
print(f'CF approve onclick: {cf_approve.group(1) if cf_approve else "NOT FOUND"}')

gas_onclicks = re.findall(r'data-page="([^"]*)"[^>]*onclick="([^"]*)"', gas)
cf_onclicks = re.findall(r'data-page="([^"]*)"[^>]*onclick="([^"]*)"', cf)
gas_map = dict(gas_onclicks)
cf_map = dict(cf_onclicks)
diffs = []
for page in gas_map:
    if page in cf_map and gas_map[page] != cf_map[page]:
        diffs.append(f'{page}: GAS="{gas_map[page]}" CF="{cf_map[page]}"')
if diffs:
    print(f'\nonclick differences ({len(diffs)}):')
    for d in diffs:
        print(f'  {d}')
else:
    print('\nAll onclick handlers match')
