import re

with open('D:\\CLASP\\CMMS\\PWI-Maintanance\\MenuPage.html', 'r', encoding='utf-8') as f:
    gas = f.read()

with open('D:\\CLASP\\CMMS\\PWI-Maintanance\\cloudflare\\index.html', 'r', encoding='utf-8') as f:
    cf = f.read()

# Extract sidebar-item data-page values
gas_items = re.findall(r'data-page="([^"]*)"', gas)
cf_items = re.findall(r'data-page="([^"]*)"', cf)

print('GAS menu items:')
for i in gas_items:
    print(f'  {i}')

print()
print('Cloudflare menu items:')
for i in cf_items:
    print(f'  {i}')

print()
gas_set = set(gas_items)
cf_set = set(cf_items)
if gas_set == cf_set:
    print('SAME menu items')
else:
    print(f'GAS only: {gas_set - cf_set}')
    print(f'CF only: {cf_set - gas_set}')

# Check for style=display:none differences
gas_hidden = re.findall(r'data-page="([^"]*)"[^>]*style="display:none"', gas)
cf_hidden = re.findall(r'data-page="([^"]*)"[^>]*style="display:none"', cf)

print(f'\nHidden items in GAS: {gas_hidden}')
print(f'Hidden items in Cloudflare: {cf_hidden}')

# Check for sidebar-group data-group differences
gas_groups = re.findall(r'data-group="([^"]*)"', gas)
cf_groups = re.findall(r'data-group="([^"]*)"', cf)

gas_gset = set(gas_groups)
cf_gset = set(cf_groups)
print(f'\nGAS groups: {gas_gset}')
print(f'CF groups: {cf_gset}')
if gas_gset == cf_gset:
    print('SAME groups')
else:
    print(f'GAS only groups: {gas_gset - cf_gset}')
    print(f'CF only groups: {cf_gset - gas_gset}')
