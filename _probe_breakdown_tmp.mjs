const GAS = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const CREDS = { email: 'pakistanwire1@gmail.com', password: 'admin123' };

async function gasCall(action, token, data) {
  const res = await fetch(GAS, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: token || '', data: data || {} }) });
  return await res.json();
}

const login = await gasCall('login', '', CREDS);
const token = (login.data && login.data.token) || login.token;
console.log('login ok:', !!token);

const jcs = await gasCall('getJobCards', token, {});
const records = (jcs.data && jcs.data.records) || [];
console.log('getJobCards total:', records.length);

const statusCount = {};
records.forEach(j => {
  const s = String(j.CurrentStatus || j.Status || '(none)');
  statusCount[s] = (statusCount[s] || 0) + 1;
});
console.log('statuses:', JSON.stringify(statusCount, null, 1));

const bd = await gasCall('getBreakdownHistory', token, {});
const bdList = bd.data || [];
console.log('getBreakdownHistory count:', bdList.length);
if (bdList[0]) {
  console.log('sample breakdown:', JSON.stringify({
    JobCardNo: bdList[0].JobCardNo, CurrentStatus: bdList[0].CurrentStatus, Machine: bdList[0].Machine,
    MachineNumber: bdList[0].MachineNumber, MachineID: bdList[0].MachineID, Department: bdList[0].Department,
    Section: bdList[0].Section, Priority: bdList[0].Priority, OpenDateTime: bdList[0].OpenDateTime,
    Downtime: bdList[0].Downtime, TotalDuration: bdList[0].TotalDuration, BreakdownType: bdList[0].BreakdownType
  }, null, 1));
}

const casc = await gasCall('getMachineCascade', token, { divisionId: '', sectionId: '', deptId: '' });
const cd = casc.data || {};
console.log('cascade (all): divisions=' + (cd.divisions || []).length + ' sections=' + (cd.sections || []).length + ' depts=' + (cd.departments || []).length + ' machines=' + (cd.machines || []).length);
console.log('divisions:', JSON.stringify((cd.divisions || []).slice(0, 10)));
console.log('sections:', JSON.stringify((cd.sections || []).slice(0, 10)));
console.log('departments:', JSON.stringify((cd.departments || []).slice(0, 10)));
console.log('machines sample:', JSON.stringify((cd.machines || []).slice(0, 5)));

const rfo = await gasCall('getReportFilterOptions', token, {});
console.log('report filter priorities:', JSON.stringify(rfo.data && rfo.data.priorities));

const rd = await gasCall('getReportData', token, {
  reportType: 'breakdown_history', division: '', section: '', department: '', machineNumber: '',
  technician: '', maintenanceType: '', priority: '', status: '',
  fromDate: '', toDate: ''
});
const rdRows = (rd.data && rd.data.rows) || [];
console.log('getReportData breakdown_history rows:', rdRows.length);
console.log('breakdown_history sample:', JSON.stringify(rdRows[0] || null, null, 1));
