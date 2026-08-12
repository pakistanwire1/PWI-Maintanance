import fs from 'fs';

const BASE = 'https://pwi-maintanance.pages.dev/api/exec';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));

async function post(action, data, token) {
  const resp = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, data: data || {} })
  });
  const raw = await resp.text();
  let json;
  try { json = JSON.parse(raw); } catch (e) { json = { parseError: e.message, raw: raw.slice(0, 300) }; }
  return { status: resp.status, json };
}

const login = await post('login', { email: creds.Email, password: creds.Password });
console.log('login:', login.status, JSON.stringify(login.json).slice(0, 200));
const token = login.json && login.json.data && login.json.data.token;

if (!token) { console.log('NO TOKEN'); process.exit(1); }

const probes = [
  ['validateSession', {}],
  ['getSpareParts', {}],
  ['getAllTransactions', {}],
  ['getInventoryTransactions', {}],
  ['getInventoryDashboardData', {}],
  ['getTransactionsByType', { type: 'Goods Receipt' }]
];

for (const [action, data] of probes) {
  const r = await post(action, data, token);
  let summary;
  if (Array.isArray(r.json.data)) summary = 'array len=' + r.json.data.length;
  else if (r.json.data && typeof r.json.data === 'object') summary = JSON.stringify(r.json.data).slice(0, 160);
  else summary = JSON.stringify(r.json).slice(0, 200);
  console.log(action + ': status=' + r.status + ' ' + summary);
}

const gr = await post('processGoodsReceipt', { PartCode: '__NONEXISTENT__', Quantity: 1 }, token);
console.log('processGoodsReceipt(nonexistent part):', gr.status, JSON.stringify(gr.json).slice(0, 200));
