const DEPLOYS = {
  PROD: 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec',
  TEST: 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec',
  OTHER: 'https://script.google.com/macros/s/AKfycby8VLo8el23tY3viaOmBRK58hHKuEbVYWvgzBzGbOQ/exec'
};
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';

async function gasCall(gas, action, token, data) {
  const res = await fetch(gas, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: token || '', data: data || {} })
  });
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch (e) { return { raw: t.slice(0, 200) }; }
  return j;
}

async function main() {
  for (const [name, url] of Object.entries(DEPLOYS)) {
    try {
      const login = await gasCall(url, 'login', '', { email: EMAIL, password: PASSWORD });
      const token = (login.data && login.data.token) || login.token;
      if (!token) { console.log(name + ': login FAILED ' + JSON.stringify(login).slice(0, 200)); continue; }
      const dash = await gasCall(url, 'getDashboardData', token, { filter: 'all' });
      const x = dash.data || dash;
      if (x.success === false) { console.log(name + ': dash error ' + JSON.stringify(x).slice(0, 200)); continue; }
      const umIds = x.underMaintenanceMachineIds || [];
      console.log(name + ': total=' + x.totalMachines + ' running=' + x.runningMachines + ' breakdown=' + x.breakdownMachines + ' idle=' + x.idleMachines + ' umIds=' + umIds.length + ' unmatched=' + ((x.underMaintenanceUnmatched || []).length) + ' hasUmIdsField=' + (umIds.length ? 'yes' : (x.underMaintenanceMachineIds !== undefined ? 'empty-arr' : 'MISSING')));
    } catch (e) {
      console.log(name + ': ERROR ' + e.message);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
