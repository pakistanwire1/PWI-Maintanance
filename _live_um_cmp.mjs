const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CF = 'https://pwi-maintanance.pages.dev/api/exec';
const EMAIL = 'pakistanwire1@gmail.com';
const PASSWORD = 'admin123';

async function gasCall(action, token, data) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: token || '', data: data || {} }),
    signal: AbortSignal.timeout(120000)
  });
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch (e) { return { raw: t.slice(0, 300) }; }
  return j;
}

async function cfCall(action, token, data) {
  const res = await fetch(CF, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: token || '', data: data || {} }),
    signal: AbortSignal.timeout(60000)
  });
  return res.json();
}

async function main() {
  console.log('=== LOGIN VIA GAS DIRECT ===');
  const login = await gasCall('login', '', { email: EMAIL, password: PASSWORD });
  const token = (login.data && login.data.token) || login.token;
  console.log('login ok:', !!token, 'err:', login.error || login.data && login.data.error || '');
  if (!token) { console.log('raw:', JSON.stringify(login).slice(0, 400)); return; }

  console.log('\n=== getDashboardData VIA GAS DIRECT ===');
  const gasDash = await gasCall('getDashboardData', token, { filter: 'all' });
  console.log(JSON.stringify(gasDash).slice(0, 600));

  console.log('\n=== getDashboardData VIA CF PROXY ===');
  const cfDash = await cfCall('getDashboardData', token, { filter: 'all' });
  console.log(JSON.stringify(cfDash).slice(0, 600));

  function summarize(name, d) {
    if (!d || d.success === false) { console.log(name + ': ERROR ' + JSON.stringify(d).slice(0, 200)); return null; }
    const x = d.data || d;
    const umIds = x.underMaintenanceMachineIds || [];
    console.log(name + ': totalMachines=' + x.totalMachines +
      ' runningMachines=' + x.runningMachines +
      ' breakdownMachines=' + x.breakdownMachines +
      ' idleMachines=' + x.idleMachines +
      ' umIdsCount=' + umIds.length +
      ' umNumbersCount=' + ((x.underMaintenanceMachineNumbers || []).length) +
      ' unmatched=' + ((x.underMaintenanceUnmatched || []).length));
    return x;
  }
  console.log('\n=== SUMMARY ===');
  const g = summarize('GAS  ', gasDash);
  const c = summarize('CF   ', cfDash);
  if (g && c) {
    const same = g.totalMachines === c.totalMachines && g.runningMachines === c.runningMachines && g.breakdownMachines === c.breakdownMachines;
    console.log('\nPAYLOAD PARITY: ' + (same ? 'MATCH' : 'MISMATCH'));
  }
  if (g) console.log('GAS  breakdownMachines = ' + g.breakdownMachines + ' (expected 14)');
  if (c) console.log('CF   breakdownMachines = ' + c.breakdownMachines + ' (expected 14)');
}
main().catch(e => { console.error(e); process.exit(1); });
