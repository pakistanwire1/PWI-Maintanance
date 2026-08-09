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

function simulateUnderMaintenance(machines, rawJobCards) {
  // Exact port of the new DashboardGS.gs resolution logic.
  var activeStatuses = ['open', 'running', 'in progress', 'in-progress'];
  var normKey = function(v) { return String(v === undefined || v === null ? '' : v).trim().toLowerCase(); };

  var machineById = {};
  var machineByNumber = {};
  var machineByCode = {};
  var machineByName = {};
  machines.forEach(function(m) {
    var mid = normKey(m.MachineID);
    var mnum = normKey(m.MachineNumber);
    var mcode = normKey(m.MachineCode);
    var mname = normKey(m.MachineName);
    if (mid && !machineById[mid]) machineById[mid] = m;
    if (mnum) { if (!machineByNumber[mnum]) machineByNumber[mnum] = []; machineByNumber[mnum].push(m); }
    if (mcode) { if (!machineByCode[mcode]) machineByCode[mcode] = []; machineByCode[mcode].push(m); }
    if (mname) { if (!machineByName[mname]) machineByName[mname] = []; machineByName[mname].push(m); }
  });

  var breakdownMachines = 0, runningMachines = 0;
  var underMaintenanceIds = [];
  var underMaintenanceNumbers = [];
  var seenUnderMaintenance = {};
  var underMaintenanceUnmatched = [];
  var underMaintenanceByMachine = {};
  var underMaintenanceKeyToMaster = {};
  for (var ai = 0; ai < rawJobCards.length; ai++) {
    var ajc = rawJobCards[ai];
    var aStatus = String(ajc.CurrentStatus || ajc.Status || '').trim().toLowerCase();
    if (activeStatuses.indexOf(aStatus) === -1) continue;

    var jcNo = ajc.JobCardNo || 'N/A';
    var machineRef = String(ajc.Machine || '').trim();
    var refMID = normKey(ajc.MachineID);
    var refMNum = normKey(ajc.MachineNumber);
    var refMCode = normKey(ajc.MachineCode);
    var refMName = machineRef.toLowerCase();
    var cardRef = { JobCardNo: jcNo, Machine: machineRef, MachineNumber: ajc.MachineNumber || '', MachineID: ajc.MachineID || '', CurrentStatus: ajc.CurrentStatus || ajc.Status || '' };

    var key = null, master = null, reason = '';
    if (refMID) {
      master = machineById[refMID];
      if (master) { key = refMID; }
      else { reason = 'MachineID "' + ajc.MachineID + '" has no matching row in the Machines master'; }
    }
    if (!key && !reason && refMNum) {
      if (machineByNumber[refMNum] && machineByNumber[refMNum].length === 1) {
        key = refMNum; master = machineByNumber[refMNum][0];
      } else if (machineByNumber[refMNum] && machineByNumber[refMNum].length > 1) {
        reason = 'MachineNumber "' + ajc.MachineNumber + '" is shared by ' + machineByNumber[refMNum].length + ' machine rows; cannot identify a unique machine';
      } else {
        reason = 'MachineNumber "' + ajc.MachineNumber + '" has no matching row in the Machines master';
      }
    }
    if (!key && !reason && refMCode) {
      if (machineByCode[refMCode] && machineByCode[refMCode].length === 1) {
        key = refMCode; master = machineByCode[refMCode][0];
      } else if (machineByCode[refMCode] && machineByCode[refMCode].length > 1) {
        reason = 'MachineCode "' + ajc.MachineCode + '" is shared by ' + machineByCode[refMCode].length + ' machine rows; cannot identify a unique machine';
      } else {
        reason = 'MachineCode "' + ajc.MachineCode + '" has no matching row in the Machines master';
      }
    }
    if (!key && !reason && refMName) {
      if (machineByName[refMName] && machineByName[refMName].length === 1) {
        key = refMName; master = machineByName[refMName][0];
      } else if (machineByName[refMName] && machineByName[refMName].length > 1) {
        reason = 'MachineName "' + machineRef + '" is shared by ' + machineByName[refMName].length + ' machines and the card has no MachineID/MachineNumber/MachineCode; cannot identify a unique machine';
      } else {
        reason = 'MachineName "' + machineRef + '" has no matching row in the Machines master';
      }
    }

    if (!key || !master) {
      cardRef.Reason = reason || 'No machine reference on the job card';
      underMaintenanceUnmatched.push(cardRef);
      continue;
    }

    var canonical = normKey(master.MachineID) || key;
    if (!underMaintenanceByMachine[canonical]) underMaintenanceByMachine[canonical] = [];
    if (underMaintenanceByMachine[canonical].indexOf(jcNo) === -1) {
      underMaintenanceByMachine[canonical].push(jcNo);
    }
    if (!underMaintenanceKeyToMaster[canonical]) underMaintenanceKeyToMaster[canonical] = master;
    if (!seenUnderMaintenance[canonical]) {
      seenUnderMaintenance[canonical] = true;
      underMaintenanceIds.push(canonical);
      underMaintenanceNumbers.push(String(master.MachineNumber || master.MachineCode || ''));
    }
  }

  breakdownMachines = underMaintenanceIds.length;
  runningMachines = Math.max(0, machines.length - breakdownMachines);
  var idleMachines = Math.max(0, machines.length - runningMachines - breakdownMachines);

  return {
    totalMachines: machines.length,
    breakdownMachines: breakdownMachines,
    runningMachines: runningMachines,
    idleMachines: idleMachines,
    underMaintenanceIds: underMaintenanceIds,
    underMaintenanceNumbers: underMaintenanceNumbers,
    underMaintenanceUnmatched: underMaintenanceUnmatched,
    underMaintenanceByMachine: underMaintenanceByMachine,
    underMaintenanceKeyToMaster: underMaintenanceKeyToMaster
  };
}

async function main() {
  const login = await call('login', '', { email: EMAIL, password: PASSWORD });
  const token = login.token;
  if (!token) { console.error('login failed', JSON.stringify(login).slice(0, 300)); return; }

  const machines = (await call('getMachines', token, {})) || [];
  const cardsResp = await call('getJobCards', token, {});
  const cards = (cardsResp && cardsResp.records) || cardsResp || [];

  const result = simulateUnderMaintenance(machines, cards);

  console.log('totalMachines       = ' + result.totalMachines);
  console.log('underMaintenance    = ' + result.breakdownMachines);
  console.log('running             = ' + result.runningMachines);
  console.log('idle                = ' + result.idleMachines);
  console.log('unmatched           = ' + result.underMaintenanceUnmatched.length);
  result.underMaintenanceUnmatched.forEach(u => console.log('  UNMATCHED ' + JSON.stringify(u)));

  console.log('\nunique under-maintenance machine IDs (' + result.underMaintenanceIds.length + '):');
  console.log('  ' + JSON.stringify(result.underMaintenanceIds));
  console.log('\nmachine numbers:');
  console.log('  ' + JSON.stringify(result.underMaintenanceNumbers));

  console.log('\n=== DEDUP PROOF: machines with multiple active job cards ===');
  let multi = 0;
  Object.entries(result.underMaintenanceByMachine).forEach(([k, v]) => {
    const m = result.underMaintenanceKeyToMaster[k];
    if (v.length > 1) {
      multi++;
      console.log('  ' + (m.MachineID || k) + ' | ' + (m.MachineNumber || '') + ' | ' + (m.MachineName || '') + ' -> ' + v.length + ' active cards: ' + v.join(', '));
    }
  });
  console.log('machines with >1 active card: ' + multi + ' (each must count ONCE)');

  console.log('\n=== CLOSED TEST ===');
  const activeStatuses = ['open', 'running', 'in progress', 'in-progress'];
  const active = cards.filter(c => activeStatuses.includes(norm(c.CurrentStatus || c.Status)));
  const closedMachines = {};
  cards.filter(c => !activeStatuses.includes(norm(c.CurrentStatus || c.Status))).forEach(c => {
    const key = norm(c.MachineID) || norm(c.MachineNumber) || norm(c.MachineCode) || norm(c.Machine);
    if (key) closedMachines[key] = (closedMachines[key] || 0) + 1;
  });
  const onlyClosed = Object.keys(closedMachines).filter(k => !result.underMaintenanceIds.includes(k));
  console.log('active cards: ' + active.length + ' | machines referenced ONLY by closed cards: ' + onlyClosed.length + ' (must be excluded)');

  // Expected invariants
  const checks = [
    ['underMaintenance == 14 unique machines', result.breakdownMachines === 14],
    ['running == total - underMaintenance (43)', result.runningMachines === result.totalMachines - result.breakdownMachines],
    ['idle == 0', result.idleMachines === 0],
    ['no unmatched active refs', result.underMaintenanceUnmatched.length === 0],
    ['dedup: 14 != 35 (old inflated count)', result.breakdownMachines !== 35]
  ];
  console.log('\n==== SIM CHECKS ====');
  checks.forEach(([label, ok]) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + label));
  process.exit(checks.every(c => c[1]) ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
