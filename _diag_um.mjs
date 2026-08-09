const BASE = 'https://pwi-maintanance.pages.dev';
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';

async function call(action, token, data) {
  const res = await fetch(BASE + '/api/exec', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: token || '', data: data || {} })
  });
  const j = await res.json();
  if (!j || j.error) return { error: j && j.error ? j.error : 'no data' };
  return j.data;
}
const norm = v => String(v === undefined || v === null ? '' : v).trim().toLowerCase();

async function main() {
  const login = await call('login', '', { email: EMAIL, password: PASSWORD });
  const token = login.token;
  if (!token) { console.error('login failed', JSON.stringify(login).slice(0, 300)); return; }

  const machines = (await call('getMachines', token, {})) || [];
  const cardsResp = await call('getJobCards', token, {});
  const cards = (cardsResp && cardsResp.records) || cardsResp || [];

  console.log('=== MACHINES ===');
  console.log('total machine rows: ' + machines.length);
  const ids = new Set(), nums = new Set(), codes = new Set(), names = new Set();
  const byId = {}, byNum = {}, byName = {};
  machines.forEach(m => {
    const mid = norm(m.MachineID), mnum = norm(m.MachineNumber), mcode = norm(m.MachineCode), mname = norm(m.MachineName);
    if (mid) { ids.add(mid); byId[mid] = byId[mid] || []; byId[mid].push(m.MachineID); }
    if (mnum) { nums.add(mnum); byNum[mnum] = byNum[mnum] || []; byNum[mnum].push(m.MachineID || m.MachineNumber); }
    if (mcode) codes.add(mcode);
    if (mname) { names.add(mname); byName[mname] = byName[mname] || []; byName[mname].push(m.MachineID || m.MachineNumber || m.MachineCode); }
  });
  console.log('unique MachineIDs: ' + ids.size);
  console.log('unique MachineNumbers: ' + nums.size);
  console.log('unique MachineCodes: ' + codes.size);
  console.log('unique MachineNames: ' + names.size);

  // duplicate machine numbers?
  const dupNums = Object.entries(byNum).filter(([k, v]) => v.length > 1);
  const dupNames = Object.entries(byName).filter(([k, v]) => v.length > 1);
  console.log('machine numbers shared by multiple rows: ' + dupNums.length + (dupNums.length ? ' ' + JSON.stringify(dupNums) : ''));
  console.log('machine names shared by multiple rows: ' + dupNames.length + (dupNames.length ? ' ' + JSON.stringify(dupNames) : ''));

  console.log('\n=== ACTIVE JOB CARDS (open/running/in progress) ===');
  const activeStatuses = ['open', 'running', 'in progress', 'in-progress'];
  const active = cards.filter(c => activeStatuses.includes(norm(c.CurrentStatus || c.Status)));
  console.log('active job cards: ' + active.length);
  console.log('total job cards: ' + cards.length);

  const statusDist = {};
  cards.forEach(c => { const s = norm(c.CurrentStatus || c.Status) || '(blank)'; statusDist[s] = (statusDist[s] || 0) + 1; });
  console.log('status distribution: ' + JSON.stringify(statusDist));

  // Job card machine reference fields
  console.log('\n=== JOB CARD MACHINE REFERENCE SAMPLE ===');
  active.slice(0, 15).forEach(c => console.log(
    c.JobCardNo + ' | status=' + (c.CurrentStatus || c.Status) +
    ' | Machine="' + (c.Machine || '') + '" | MachineNumber="' + (c.MachineNumber || '') +
    '" | MachineID="' + (c.MachineID || '') + '" | AssetID="' + (c.AssetID || '') + '"'
  ));

  // How many active cards have each reference type?
  let withMID = 0, withMNum = 0, withMCode = 0, withMName = 0, withNone = 0;
  active.forEach(c => {
    if (norm(c.MachineID)) withMID++;
    else if (norm(c.MachineNumber)) withMNum++;
    else if (norm(c.MachineCode)) withMCode++;
    else if (norm(c.Machine)) withMName++;
    else withNone++;
  });
  console.log('\nactive cards reference type: MachineID=' + withMID + ' MachineNumber=' + withMNum + ' MachineCode=' + withMCode + ' MachineNameOnly=' + withMName + ' none=' + withNone);

  // NEW logic: canonical unique-machine key resolution
  // Preferred: MachineID -> MachineNumber -> MachineCode -> normalized MachineName
  const canonical = {};
  const unmatched = [];
  const activeByMachine = {};
  const seenActiveCards = {};
  const keyToCard = {};
  active.forEach(c => {
    let key = '', kind = '';
    if (norm(c.MachineID)) { key = norm(c.MachineID); kind = 'MachineID'; }
    else if (norm(c.MachineNumber)) { key = norm(c.MachineNumber); kind = 'MachineNumber'; }
    else if (norm(c.MachineCode)) { key = norm(c.MachineCode); kind = 'MachineCode'; }
    else if (norm(c.Machine)) { key = norm(c.Machine); kind = 'MachineName'; }

    const jcNo = c.JobCardNo || 'N/A';
    if (!key) { unmatched.push({ JobCardNo: jcNo, Machine: c.Machine, reason: 'no machine reference at all' }); return; }

    if (kind !== 'MachineID' && !byId[key] && !byNum[key] && !byName[key]) {
      unmatched.push({ JobCardNo: jcNo, Machine: c.Machine, MachineNumber: c.MachineNumber, MachineID: c.MachineID, reason: 'no master row matches key "' + key + '"' });
      return;
    }
    // verify the key resolves to a real master row
    let ok = false;
    if (kind === 'MachineID') ok = !!byId[key];
    else if (kind === 'MachineNumber') ok = !!byNum[key];
    else if (kind === 'MachineCode') ok = true; // codes map to same id sets loosely; accept
    else if (kind === 'MachineName') ok = !!byName[key];
    if (!ok) { unmatched.push({ JobCardNo: jcNo, Machine: c.Machine, MachineNumber: c.MachineNumber, MachineID: c.MachineID, reason: 'no master row matches key "' + key + '" (' + kind + ')' }); return; }

    if (!activeByMachine[key]) activeByMachine[key] = [];
    if (!activeByMachine[key].includes(jcNo)) activeByMachine[key].push(jcNo);
    seenActiveCards[key] = seenActiveCards[key] || { Machine: c.Machine, MachineNumber: c.MachineNumber, MachineID: c.MachineID, count: 0 };
    seenActiveCards[key].count++;
    keyToCard[key] = c;
    if (!canonical[key]) canonical[key] = { count: 0, card: c };
    canonical[key].count++;
  });

  console.log('\n=== NEW UNIQUE-MACHINE RESULT ===');
  console.log('unique machines (dedup by canonical identity): ' + Object.keys(canonical).length);
  console.log('unmatched active refs: ' + unmatched.length);
  unmatched.forEach(u => console.log('  UNMATCHED ' + JSON.stringify(u)));

  console.log('\n=== MACHINES WITH MULTIPLE ACTIVE JOB CARDS (dedup proof) ===');
  Object.entries(activeByMachine).filter(([k, v]) => v.length > 1).forEach(([k, v]) => {
    const c = keyToCard[k];
    console.log('  key="' + k + '" Machine="' + (c.Machine || '') + '" MachineNumber="' + (c.MachineNumber || '') + '" MachineID="' + (c.MachineID || '') + '" -> ' + v.length + ' job cards: ' + v.join(', '));
  });

  console.log('\n=== ALL UNIQUE MACHINES UNDER MAINTENANCE ===');
  Object.entries(canonical).forEach(([k, o]) => {
    const c = o.card;
    console.log('  "' + k + '" | Machine="' + (c.Machine || '') + '" | MachineNumber="' + (c.MachineNumber || '') + '" | MachineID="' + (c.MachineID || '') + '" | cards=' + o.count);
  });

  // CLOSED test: machines whose only cards are closed should NOT be under maintenance
  console.log('\n=== CLOSED TEST (read-only) ===');
  const closedCards = cards.filter(c => ['closed', 'approved'].includes(norm(c.CurrentStatus || c.Status)));
  const closedMachines = {};
  closedCards.forEach(c => {
    let key = norm(c.MachineID) || norm(c.MachineNumber) || norm(c.MachineCode) || norm(c.Machine);
    if (key) { closedMachines[key] = (closedMachines[key] || 0) + 1; }
  });
  const onlyClosed = Object.keys(closedMachines).filter(k => !canonical[k]);
  console.log('machines referenced ONLY by closed/approved cards (must be excluded from Under Maintenance): ' + onlyClosed.length);
  onlyClosed.slice(0, 10).forEach(k => console.log('  ' + k + ' (closed cards=' + closedMachines[k] + ')'));

  // Also get the CURRENT dashboard numbers
  console.log('\n=== CURRENT DASHBOARD (getDashboardData) ===');
  const dash = await call('getDashboardData', token, { filter: 'all' });
  console.log('totalMachines=' + dash.totalMachines + ' runningMachines=' + dash.runningMachines + ' breakdownMachines=' + dash.breakdownMachines + ' idleMachines=' + dash.idleMachines);
  console.log('_debug.underMaintenanceMachineIds count=' + (dash._debug && dash._debug.underMaintenanceMachineIds ? dash._debug.underMaintenanceMachineIds.length : 'n/a'));
  console.log('underMaintenanceUnmatched=' + (dash.underMaintenanceUnmatched ? dash.underMaintenanceUnmatched.length : 0));
  if (dash.underMaintenanceUnmatched && dash.underMaintenanceUnmatched.length) console.log('  ' + JSON.stringify(dash.underMaintenanceUnmatched));
  console.log('current dashboard ids=' + JSON.stringify(dash._debug && dash._debug.underMaintenanceMachineIds));
  console.log('\n=== SIDEBAR COUNTS (getSidebarCounts) ===');
  const sc = await call('getSidebarCounts', token, {});
  console.log(JSON.stringify(sc));
}
main().catch(e => { console.error(e); process.exit(1); });
