function getDivisions() {
  var data = getAllData(CONFIG.SHEET_NAMES.DIVISIONS) || [];
  return data.map(function(d) { return { id: d.DivisionID || '', code: d.DivisionCode || '', name: d.DivisionName || '' }; }).filter(function(d) { return d.id; });
}

function getSections(divisionId) {
  var data = getAllData(CONFIG.SHEET_NAMES.SECTIONS) || [];
  if (divisionId) data = data.filter(function(s) { return s.DivisionID === divisionId; });
  return data.map(function(s) { return { id: s.SectionID || '', name: s.Section || '', code: s.SectionCode || '' }; }).filter(function(s) { return s.id; });
}

function getMachineOptions(divisionId, sectionId, deptId) {
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  if (divisionId) machines = machines.filter(function(m) { return m.DivisionID === divisionId; });
  if (sectionId) machines = machines.filter(function(m) { return m.SectionID === sectionId; });
  if (deptId) machines = machines.filter(function(m) { return m.DeptID === deptId; });
  return machines.map(function(m) {
    var label = m.MachineNumber || m.MachineCode || '';
    if (m.MachineName && m.MachineName !== label) label += ' \u2014 ' + m.MachineName;
    return { id: m.MachineID || '', number: m.MachineNumber || m.MachineCode || '', name: m.MachineName || '', code: m.MachineCode || '', label: label };
  }).filter(function(m) { return m.id; }).sort(function(a, b) { return a.number.localeCompare(b.number); });
}

function getMachineCascade(divisionId, sectionId, deptId) {
  return {
    divisions: getDivisions(),
    sections: getSections(divisionId),
    departments: getDepartments(divisionId, sectionId),
    machines: getMachineOptions(divisionId, sectionId, deptId)
  };
}