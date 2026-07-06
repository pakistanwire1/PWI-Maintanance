function onOpen() {
  var ui = SpreadsheetApp.getUi();

  var menuItems = [
    { name: 'Initialize Database', functionName: 'reinitializeDatabase' },
    { name: 'Setup Test Data', functionName: 'setupTestData' },
    null,
    { name: 'Reset System', functionName: 'resetSystem' }
  ];
  var menu = ui.createMenu('CMMS');
  menuItems.forEach(function(item) {
    if (item === null) {
      menu.addSeparator();
    } else {
      menu.addItem(item.name, item.functionName);
    }
  });
  menu.addToUi();

  var toolsMenu = ui.createMenu('CMMS Tools');
  toolsMenu.addItem('Initialize Sample Data', 'initializeAllSampleData');
  toolsMenu.addSeparator();
  toolsMenu.addItem('Initialize Section Data', 'initializeSectionMaster');
  toolsMenu.addItem('Initialize Department Data', 'initializeDepartmentMaster');
  toolsMenu.addItem('Initialize Machine Data', 'initializeMachineMaster');
  toolsMenu.addItem('Initialize Asset Data', 'initializeAssetMaster');
  toolsMenu.addItem('Initialize Technician Data', 'initializeTechnicianMaster');
  toolsMenu.addItem('Initialize User Data', 'initializeUsers');
  toolsMenu.addItem('Initialize Spare Parts Data', 'initializeSpareParts');
  toolsMenu.addItem('Initialize PM Templates', 'initializePMTemplates');
  toolsMenu.addSeparator();
  toolsMenu.addItem('Initialize All Transaction Data', 'initializeAllTransactionSampleData');
  toolsMenu.addSeparator();
  toolsMenu.addItem('Initialize PM History', 'initializePMHistory');
  toolsMenu.addItem('Initialize Stock History', 'initializeStockHistory');
  toolsMenu.addItem('Initialize Inventory Transactions', 'initializeInventoryTransactions');
  toolsMenu.addItem('Initialize Goods Receipt', 'initializeGoodsReceipt');
  toolsMenu.addItem('Initialize Notifications', 'initializeNotifications');
  toolsMenu.addItem('Initialize Audit Trail', 'initAuditTrailSheet');
  toolsMenu.addSeparator();
  toolsMenu.addItem('Initialize QR / Barcode Data', 'initQRBarcodeData');
  toolsMenu.addToUi();
}

function initializeSystem() {
  var results = [];
  results.push(initSectionSheet());
  results.push(initDepartmentSheet());
  results.push(initMachineSheet());
  results.push(initAssetSheet());
  results.push(initTechnicianSheet());
  results.push(initializeUserMaster());
  initJobCardsSheet();
  initChecklistSheets();
  initPMSheet();
  initSparePartsSheet();
  initInventorySheet();
  initNotificationsSheet();
  initSettingsSheet();
  initAuditTrailSheet();
  initQRBarcodeData();
  emailInitLogsSheet();
  logActivity('System Init', 'All sheets initialized successfully');
  createAuditLog(CONFIG.AUDIT_MODULES.SETTINGS, CONFIG.AUDIT_ACTIONS.CREATE, '', 'System Initialized', '', 'All sheets initialized', 'Success', 'System initialization completed');
  return results;
}

function reinitializeDatabase() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Initialize Database',
    'This will ensure all master sheets have the correct columns and default records. Existing data will be preserved.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;
  var results = [];
  try {
    results.push(initSectionSheet());
    results.push(initDepartmentSheet());
    results.push(initMachineSheet());
    results.push(initAssetSheet());
    results.push(initTechnicianSheet());
    initJobCardsSheet();
    initChecklistSheets();
    initPMSheet();
    initSparePartsSheet();
    initInventorySheet();
    initNotificationsSheet();
    initSettingsSheet();
    initAuditTrailSheet();
    initQRBarcodeData();
    logActivity('Database Init', 'All master tables reinitialized');
    var msg = 'Database initialized successfully.';
    results.forEach(function(r) {
      if (r && r.sheet) msg += '\n' + r.sheet + ': ' + (r.records || 0) + ' records';
    });
    ui.alert('Success', msg, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Error', 'Initialization failed: ' + e.message, ui.ButtonSet.OK);
  }
}

function resetSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = Object.values(CONFIG.SHEET_NAMES);
  names.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        sheet.deleteRows(2, data.length - 1);
      }
    }
  });
  initializeSystem();
  logActivity('System Reset', 'All data cleared and re-initialized');
  return 'System reset successfully';
}

function setupTestData() {
  initializeSystem();

  var sectionA = addRow(CONFIG.SHEET_NAMES.SECTIONS, setRowData({ SectionID: 'SEC001', Section: 'Section A', SectionCode: 'SEC-A', SundayOff: 'No', HoursPerDay: '8', Status: 'Active', Description: 'Production Section A', CreatedAt: getCurrentTimestamp() }));
  var sectionB = addRow(CONFIG.SHEET_NAMES.SECTIONS, setRowData({ SectionID: 'SEC002', Section: 'Section B', SectionCode: 'SEC-B', SundayOff: 'Yes', HoursPerDay: '6', Status: 'Active', Description: 'Production Section B', CreatedAt: getCurrentTimestamp() }));
  var sectionC = addRow(CONFIG.SHEET_NAMES.SECTIONS, setRowData({ SectionID: 'SEC003', Section: 'Section C', SectionCode: 'SEC-C', SundayOff: 'No', HoursPerDay: '8', Status: 'Active', Description: 'Utility Section C', CreatedAt: getCurrentTimestamp() }));

  var dept1 = addRow(CONFIG.SHEET_NAMES.DEPARTMENTS, setRowData({ DepartmentID: 'DEPT001', Department: 'Production', SectionID: 'SEC001', Section: 'Section A', SundayOff: 'No', HoursPerDay: '8', DepartmentCode: 'PROD', DepartmentHead: 'John Manager', Status: 'Active', CreatedAt: getCurrentTimestamp() }));
  var dept2 = addRow(CONFIG.SHEET_NAMES.DEPARTMENTS, setRowData({ DepartmentID: 'DEPT002', Department: 'Maintenance', SectionID: 'SEC001', Section: 'Section A', SundayOff: 'No', HoursPerDay: '8', DepartmentCode: 'MAINT', DepartmentHead: 'Jane Supervisor', Status: 'Active', CreatedAt: getCurrentTimestamp() }));
  var dept3 = addRow(CONFIG.SHEET_NAMES.DEPARTMENTS, setRowData({ DepartmentID: 'DEPT003', Department: 'Engineering', SectionID: 'SEC003', Section: 'Section C', SundayOff: 'No', HoursPerDay: '8', DepartmentCode: 'ENGG', DepartmentHead: 'Bob Engineer', Status: 'Active', CreatedAt: getCurrentTimestamp() }));

  var testMachines = [
    { MachineName: 'CNC Milling Machine', MachineCode: 'CNC-001', MachineNumber: 'CNC-001', MachineType: 'CNC', DeptID: 'DEPT001', Department: 'Production', SectionID: 'SEC001', Section: 'Section A', Location: 'Area A', Manufacturer: 'HAAS', Model: 'VF-2', SerialNo: 'HAAS-001', Capacity: '500 kg', PowerRating: '50 kW', Criticality: 'Critical', Status: 'Active' },
    { MachineName: 'Hydraulic Press', MachineCode: 'HP-001', MachineNumber: 'HP-001', MachineType: 'Hydraulic', DeptID: 'DEPT001', Department: 'Production', SectionID: 'SEC001', Section: 'Section A', Location: 'Area B', Manufacturer: 'Enerpac', Model: 'EP-100', SerialNo: 'EP-001', Capacity: '100 T', PowerRating: '75 kW', Criticality: 'High', Status: 'Active' },
    { MachineName: 'Air Compressor', MachineCode: 'AC-001', MachineNumber: 'AC-001', MachineType: 'Compressor', DeptID: 'DEPT003', Department: 'Engineering', SectionID: 'SEC003', Section: 'Section C', Location: 'Utility', Manufacturer: 'Atlas Copco', Model: 'GA-30', SerialNo: 'AC-001', Capacity: '200 CFM', PowerRating: '150 kW', Criticality: 'Medium', Status: 'Active' },
    { MachineName: 'Conveyor Belt', MachineCode: 'CB-001', MachineNumber: 'CB-001', MachineType: 'Conveyor', DeptID: 'DEPT001', Department: 'Production', SectionID: 'SEC001', Section: 'Section A', Location: 'Area A', Capacity: '100 m', PowerRating: '5 kW', Criticality: 'Low', Status: 'Active' },
    { MachineName: 'Generator Set', MachineCode: 'GEN-001', MachineNumber: 'GEN-001', MachineType: 'Generator', DeptID: 'DEPT003', Department: 'Engineering', SectionID: 'SEC003', Section: 'Section C', Location: 'Utility', Manufacturer: 'Cummins', Model: 'C20D5', SerialNo: 'GEN-001', Capacity: '500 kVA', PowerRating: '400 kW', Criticality: 'Critical', Status: 'Active' }
  ];
  testMachines.forEach(function(m) {
    m.MachineID = generateId(CONFIG.SHEET_NAMES.MACHINES, CONFIG.ID_PREFIXES.MACHINE);
    m.CreatedAt = getCurrentTimestamp();
    addRow(CONFIG.SHEET_NAMES.MACHINES, m);
  });

  var testAssets = [
    { AssetName: 'CNC Tool Holder Set', AssetCode: 'AST-001', AssetType: 'Tooling', Category: 'Production', MachineID: 'MCH001', MachineName: 'CNC Milling Machine', DeptID: 'DEPT001', Department: 'Production', SectionID: 'SEC001', Section: 'Section A', Specification: 'Standard tool holder', Criticality: 'Low', Status: 'Active', Cost: '5000' },
    { AssetName: 'Hydraulic Pump Unit', AssetCode: 'AST-002', AssetType: 'Equipment', Category: 'Production', MachineID: 'MCH002', MachineName: 'Hydraulic Press', DeptID: 'DEPT001', Department: 'Production', SectionID: 'SEC001', Section: 'Section A', Specification: 'High pressure pump', Criticality: 'High', Status: 'Active', Cost: '15000' },
    { AssetName: 'Air Dryer', AssetCode: 'AST-003', AssetType: 'Equipment', Category: 'Utility', MachineID: 'MCH003', MachineName: 'Air Compressor', DeptID: 'DEPT003', Department: 'Engineering', SectionID: 'SEC003', Section: 'Section C', Specification: 'Refrigeration dryer', Criticality: 'Medium', Status: 'Active', Cost: '25000' }
  ];
  testAssets.forEach(function(a) {
    a.AssetID = generateId(CONFIG.SHEET_NAMES.ASSETS, CONFIG.ID_PREFIXES.ASSET);
    a.CreatedAt = getCurrentTimestamp();
    addRow(CONFIG.SHEET_NAMES.ASSETS, a);
  });

  var testTechs = [
    { EmployeeID: 'EMP001', EmployeeCode: 'TECH-001', TechnicianName: 'Rajesh Kumar', Designation: 'Senior Technician', Department: 'Facility Maintenance', Section: 'Maintenance', Skill: 'Mechanical', Shift: 'General', Mobile: '9876543210', Email: 'rajesh@cmms.com', JoiningDate: '2024-01-15', Status: 'Active' },
    { EmployeeID: 'EMP002', EmployeeCode: 'TECH-002', TechnicianName: 'Suresh Patel', Designation: 'Technician', Department: 'Facility Maintenance', Section: 'Maintenance', Skill: 'Electrical', Shift: 'General', Mobile: '9876543211', Email: 'suresh@cmms.com', JoiningDate: '2024-02-01', Status: 'Active' },
    { EmployeeID: 'EMP003', EmployeeCode: 'TECH-003', TechnicianName: 'Amit Singh', Designation: 'Junior Technician', Department: 'Facility Maintenance', Section: 'Maintenance', Skill: 'PLC', Shift: 'A', Mobile: '9876543212', Email: 'amit@cmms.com', JoiningDate: '2024-03-10', Status: 'Active' }
  ];
  testTechs.forEach(function(t) {
    t.CreatedAt = getCurrentTimestamp();
    t.CreatedBy = 'admin@cmms.com';
    t.UpdatedBy = 'admin@cmms.com';
    t.UpdatedAt = getCurrentTimestamp();
    addRow(CONFIG.SHEET_NAMES.TECHNICIANS, t);
  });

  var jcSamples = [
    // Day 1 - 7 days ago
    { MachineIdx: 0, Dept: 'Production', Section: 'Section A', Category: 'Mechanical Failure', Desc: 'CNC spindle bearing overheating - abnormal noise during operation', Priority: 'Critical', TechIdx: 0, Status: 'CLOSED', DaysAgo: 7, OpenHour: 7, OpenMin: 30, WaitHrs: 0.5, WorkHrs: 3.5, RootCause: 'Bearing wear due to inadequate lubrication', Corrective: 'Replaced spindle bearing assembly and calibrated alignment', Parts: 'Spindle bearing SKF-6205, Grease, Seal kit' },
    { MachineIdx: 1, Dept: 'Production', Section: 'Section A', Category: 'Hydraulic Failure', Desc: 'Hydraulic press losing pressure - ram not extending fully', Priority: 'High', TechIdx: 1, Status: 'CLOSED', DaysAgo: 7, OpenHour: 9, OpenMin: 15, WaitHrs: 1.0, WorkHrs: 4.0, RootCause: 'Hydraulic cylinder seal failure', Corrective: 'Replaced cylinder seals and hydraulic fluid', Parts: 'Cylinder seal kit, Hydraulic oil ISO 68 - 20L' },
    { MachineIdx: 2, Dept: 'Engineering', Section: 'Section C', Category: 'Electrical Fault', Desc: 'Air compressor tripping main breaker intermittently', Priority: 'High', TechIdx: 2, Status: 'CLOSED', DaysAgo: 7, OpenHour: 11, OpenMin: 0, WaitHrs: 0.75, WorkHrs: 2.5, RootCause: 'Short circuit in motor winding', Corrective: 'Rewound motor stator and replaced thermal overload relay', Parts: 'Copper wire 18AWG, Thermal overload relay 25A' },

    // Day 2 - 6 days ago
    { MachineIdx: 3, Dept: 'Production', Section: 'Section A', Category: 'Mechanical Failure', Desc: 'Conveyor belt tracking off - belt rubbing against guard rail', Priority: 'Medium', TechIdx: 0, Status: 'CLOSED', DaysAgo: 6, OpenHour: 8, OpenMin: 0, WaitHrs: 0.25, WorkHrs: 1.5, RootCause: 'Worn tensioner pulley bearing', Corrective: 'Replaced tensioner pulley and realigned belt tracking', Parts: 'Tensioner pulley, Bearing 6205ZZ' },
    { MachineIdx: 4, Dept: 'Engineering', Section: 'Section C', Category: 'Software Glitch', Desc: 'Generator ATS controller showing comm error - auto transfer failing', Priority: 'Critical', TechIdx: 1, Status: 'CLOSED', DaysAgo: 6, OpenHour: 10, OpenMin: 30, WaitHrs: 0.5, WorkHrs: 3.0, RootCause: 'ATS controller firmware corrupted', Corrective: 'Re-flashed controller firmware and tested auto transfer sequence', Parts: 'Firmware update kit' },
    { MachineIdx: 0, Dept: 'Production', Section: 'Section A', Category: 'Routine Maintenance', Desc: 'Scheduled oil change and filter replacement - CNC machine', Priority: 'Low', TechIdx: 2, Status: 'CLOSED', DaysAgo: 6, OpenHour: 13, OpenMin: 0, WaitHrs: 0.0, WorkHrs: 2.0, RootCause: 'Scheduled maintenance', Corrective: 'Changed oil, replaced filters, greased all points', Parts: 'Oil 10W40 - 5L, Oil filter, Air filter' },
    { MachineIdx: 1, Dept: 'Production', Section: 'Section A', Category: 'Pneumatic Issue', Desc: 'Air blow gun at press station has weak pressure', Priority: 'Low', TechIdx: 0, Status: 'CLOSED', DaysAgo: 6, OpenHour: 15, OpenMin: 45, WaitHrs: 0.0, WorkHrs: 0.75, RootCause: 'Clogged air filter regulator', Corrective: 'Cleaned filter element and drained moisture trap', Parts: 'Filter element' },

    // Day 3 - 5 days ago
    { MachineIdx: 2, Dept: 'Engineering', Section: 'Section C', Category: 'Mechanical Failure', Desc: 'Air compressor belt snapped - unit shut down', Priority: 'High', TechIdx: 1, Status: 'CLOSED', DaysAgo: 5, OpenHour: 7, OpenMin: 45, WaitHrs: 1.0, WorkHrs: 1.5, RootCause: 'Belt fatigue due to misalignment', Corrective: 'Replaced drive belt and aligned pulleys', Parts: 'Drive belt B-section 1600mm' },
    { MachineIdx: 3, Dept: 'Production', Section: 'Section A', Category: 'Mechanical Failure', Desc: 'Conveyor motor vibrating excessively at startup', Priority: 'Medium', TechIdx: 2, Status: 'CLOSED', DaysAgo: 5, OpenHour: 9, OpenMin: 30, WaitHrs: 0.0, WorkHrs: 2.0, RootCause: 'Motor mount bolts loosened', Corrective: 'Tightened all motor mounts and applied thread locker', Parts: 'Thread locker compound' },
    { MachineIdx: 0, Dept: 'Production', Section: 'Section A', Category: 'Sensor Malfunction', Desc: 'CNC tool position sensor giving false readings', Priority: 'Medium', TechIdx: 0, Status: 'CLOSED', DaysAgo: 5, OpenHour: 11, OpenMin: 15, WaitHrs: 0.5, WorkHrs: 2.5, RootCause: 'Sensor contaminated with coolant', Corrective: 'Cleaned sensor lens and replaced sensor gasket', Parts: 'Proximity sensor, Gasket' },
    { MachineIdx: 4, Dept: 'Engineering', Section: 'Section C', Category: 'Routine Maintenance', Desc: 'Weekly generator test run and battery check', Priority: 'Low', TechIdx: 1, Status: 'CLOSED', DaysAgo: 5, OpenHour: 14, OpenMin: 0, WaitHrs: 0.0, WorkHrs: 1.0, RootCause: 'Scheduled test', Corrective: 'Test run 30 min, checked battery voltage and coolant level', Parts: '' },

    // Day 4 - 4 days ago
    { MachineIdx: 1, Dept: 'Production', Section: 'Section A', Category: 'Hydraulic Failure', Desc: 'Hydraulic press leaking oil from main ram seal', Priority: 'High', TechIdx: 0, Status: 'CLOSED', DaysAgo: 4, OpenHour: 8, OpenMin: 0, WaitHrs: 0.5, WorkHrs: 3.0, RootCause: 'Ram seal worn out', Corrective: 'Replaced main ram U-seal and wiper seal', Parts: 'Ram seal kit, Hydraulic oil ISO 46 - 10L' },
    { MachineIdx: 2, Dept: 'Engineering', Section: 'Section C', Category: 'Overheating', Desc: 'Air compressor intercooler temperature high alarm', Priority: 'High', TechIdx: 2, Status: 'CLOSED', DaysAgo: 4, OpenHour: 10, OpenMin: 30, WaitHrs: 0.25, WorkHrs: 2.0, RootCause: 'Intercooler fins clogged with dust', Corrective: 'Cleaned intercooler with compressed air and chemical wash', Parts: 'Coolant 5L' },
    { MachineIdx: 3, Dept: 'Production', Section: 'Section A', Category: 'Electrical Fault', Desc: 'Conveyor emergency stop not resetting', Priority: 'Critical', TechIdx: 1, Status: 'CLOSED', DaysAgo: 4, OpenHour: 13, OpenMin: 0, WaitHrs: 0.75, WorkHrs: 1.5, RootCause: 'E-stop contact block stuck', Corrective: 'Replaced emergency stop contact block and tested circuit', Parts: 'E-stop contact block' },

    // Day 3 - 3 days ago (Running / Still Open)
    { MachineIdx: 0, Dept: 'Production', Section: 'Section A', Category: 'Mechanical Failure', Desc: 'CNC coolant pump not delivering adequate flow', Priority: 'Medium', TechIdx: 0, Status: 'RUNNING', DaysAgo: 3, OpenHour: 7, OpenMin: 0, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 4, Dept: 'Engineering', Section: 'Section C', Category: 'Electrical Fault', Desc: 'Generator auto-start not engaging on power failure', Priority: 'High', TechIdx: 1, Status: 'RUNNING', DaysAgo: 3, OpenHour: 9, OpenMin: 30, WaitHrs: 1.5, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 1, Dept: 'Production', Section: 'Section A', Category: 'Routine Maintenance', Desc: 'Hydraulic press scheduled preventive maintenance', Priority: 'Low', TechIdx: 2, Status: 'RUNNING', DaysAgo: 3, OpenHour: 14, OpenMin: 0, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },

    // Day 2 - 2 days ago (Running)
    { MachineIdx: 2, Dept: 'Engineering', Section: 'Section C', Category: 'Sensor Malfunction', Desc: 'Pressure sensor reading erratic on compressor discharge', Priority: 'Medium', TechIdx: 0, Status: 'RUNNING', DaysAgo: 2, OpenHour: 8, OpenMin: 15, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 3, Dept: 'Production', Section: 'Section A', Category: 'Mechanical Failure', Desc: 'Conveyor roller seized - belt dragging', Priority: 'High', TechIdx: 1, Status: 'RUNNING', DaysAgo: 2, OpenHour: 10, OpenMin: 45, WaitHrs: 1.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 0, Dept: 'Production', Section: 'Section A', Category: 'Software Glitch', Desc: 'CNC program lost mid-cycle - axis out of alignment', Priority: 'Critical', TechIdx: 2, Status: 'RUNNING', DaysAgo: 2, OpenHour: 13, OpenMin: 30, WaitHrs: 2.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },

    // Day 1 - Yesterday (OPEN)
    { MachineIdx: 1, Dept: 'Production', Section: 'Section A', Category: 'Hydraulic Failure', Desc: 'Hydraulic press cycle time increasing - pressure drop', Priority: 'Medium', TechIdx: 0, Status: 'OPEN', DaysAgo: 1, OpenHour: 8, OpenMin: 0, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 4, Dept: 'Engineering', Section: 'Section C', Category: 'Mechanical Failure', Desc: 'Generator radiator fan belt squealing', Priority: 'Low', TechIdx: 1, Status: 'OPEN', DaysAgo: 1, OpenHour: 9, OpenMin: 30, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 2, Dept: 'Engineering', Section: 'Section C', Category: 'Routine Maintenance', Desc: 'Compressor oil separator maintenance overdue', Priority: 'Medium', TechIdx: 2, Status: 'OPEN', DaysAgo: 1, OpenHour: 10, OpenMin: 45, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },

    // Today (OPEN - just submitted)
    { MachineIdx: 0, Dept: 'Production', Section: 'Section A', Category: 'Electrical Fault', Desc: 'CNC control panel display flickering intermittently', Priority: 'High', TechIdx: 0, Status: 'OPEN', DaysAgo: 0, OpenHour: 7, OpenMin: 15, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 3, Dept: 'Production', Section: 'Section A', Category: 'Pneumatic Issue', Desc: 'Air line quick-connect coupling leaking at conveyor station', Priority: 'Low', TechIdx: 1, Status: 'OPEN', DaysAgo: 0, OpenHour: 8, OpenMin: 40, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' },
    { MachineIdx: 1, Dept: 'Production', Section: 'Section A', Category: 'Overheating', Desc: 'Hydraulic oil temperature running high - cooler fan not working', Priority: 'High', TechIdx: 2, Status: 'OPEN', DaysAgo: 0, OpenHour: 11, OpenMin: 0, WaitHrs: 0.0, WorkHrs: 0.0, RootCause: '', Corrective: '', Parts: '' }
  ];

  jcSamples.forEach(function(s, idx) {
    var now = new Date();
    var openDate = new Date(now.getTime() - s.DaysAgo * 86400000);
    openDate.setHours(s.OpenHour, s.OpenMin, 0, 0);
    var jc = {
      DateTime: formatDateTimeISO(openDate),
      OpenTime: formatDateTimeISO(openDate),
      Section: s.Section,
      Department: s.Dept,
      Machine: testMachines[s.MachineIdx].MachineName,
      ComplaintCategory: s.Category,
      ComplaintDescription: s.Desc,
      Priority: s.Priority,
      ComplaintBy: 'Operator ' + ((idx % 5) + 1),
      AssignedTechnician: s.Status === 'OPEN' ? '' : testTechs[s.TechIdx].TechnicianName,
      Status: s.Status,
      WaitingTime: '0',
      WorkingTime: '0',
      BreakdownTime: '0'
    };

    if (s.Status === 'RUNNING') {
      var startDate = new Date(openDate.getTime() + (s.WaitHrs || 0.5) * 3600000);
      jc.StartTime = formatDateTimeISO(startDate);
      jc.WaitingTime = String(s.WaitHrs || 0.5);
    }

    if (s.Status === 'CLOSED') {
      var startDate = new Date(openDate.getTime() + (s.WaitHrs || 0.5) * 3600000);
      var closeDate = new Date(startDate.getTime() + (s.WorkHrs || 2) * 3600000);
      jc.StartTime = formatDateTimeISO(startDate);
      jc.CloseTime = formatDateTimeISO(closeDate);
      jc.WaitingTime = String(s.WaitHrs || 0.5);
      jc.WorkingTime = String(s.WorkHrs || 2);
      jc.BreakdownTime = String((s.WaitHrs || 0.5) + (s.WorkHrs || 2));
      jc.Remarks = 'Completed successfully. ' + s.Corrective;
      if (s.RootCause) jc.RootCause = s.RootCause;
      if (s.Corrective) jc.CorrectiveAction = s.Corrective;
      if (s.Parts) jc.SpareParts = s.Parts;
    }

    jc.JobCardNo = generateJobCardNo();
    jc.CreatedAt = getCurrentTimestamp();
    jc.CreatedBy = 'admin@cmms.com';
    addRow(CONFIG.SHEET_NAMES.JOBCARDS, jc);
  });

  var templates = [
    { TemplateName: 'Daily Mechanical Inspection', Category: 'Daily', Items: 'Check oil level\nInspect belts\nListen for unusual noise\nCheck vibration levels' },
    { TemplateName: 'Electrical Safety Check', Category: 'Safety', Items: 'Check wiring condition\nVerify grounding\nTest emergency stop\nInspect panel board\nCheck insulation' },
    { TemplateName: 'Weekly Hydraulic Check', Category: 'Weekly', Items: 'Check hydraulic fluid level\nInspect hoses for leaks\nTest pressure\nCheck filters\nClean strainers' }
  ];
  templates.forEach(function(t) {
    t.TemplateID = generateId(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES, CONFIG.ID_PREFIXES.CHECKLIST_TEMPLATE);
    t.CreatedAt = getCurrentTimestamp();
    addRow(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES, t);
  });

  logActivity('Setup Test Data', 'Test data loaded successfully');

  var sampleParts = [
    { PartName: 'Spindle Bearing SKF-6205', Category: 'Bearings', Manufacturer: 'SKF', Unit: 'Pcs', CurrentStock: '10', MinimumStock: '5', MaximumStock: '20', ReorderLevel: '8', UnitCost: '150', Supplier: 'SKF India', StoreLocation: 'Store A', BinNumber: 'A-01', Status: 'Active' },
    { PartName: 'Hydraulic Seal Kit', Category: 'Seals', Manufacturer: 'Parker', Unit: 'Set', CurrentStock: '3', MinimumStock: '5', MaximumStock: '15', ReorderLevel: '5', UnitCost: '850', Supplier: 'Parker Hannifin', StoreLocation: 'Store A', BinNumber: 'A-02', Status: 'Active' },
    { PartName: 'Air Filter Element', Category: 'Filters', Manufacturer: 'Donaldson', Unit: 'Pcs', CurrentStock: '20', MinimumStock: '10', MaximumStock: '50', ReorderLevel: '15', UnitCost: '250', Supplier: 'Donaldson India', StoreLocation: 'Store B', BinNumber: 'B-01', Status: 'Active' },
    { PartName: 'Hydraulic Oil ISO 68', Category: 'Lubricants', Manufacturer: 'Shell', Unit: 'Liter', CurrentStock: '50', MinimumStock: '20', MaximumStock: '100', ReorderLevel: '30', UnitCost: '180', Supplier: 'Shell India', StoreLocation: 'Store C', BinNumber: 'C-01', Status: 'Active' },
    { PartName: 'Drive Belt B-1600', Category: 'Belts', Manufacturer: 'Gates', Unit: 'Pcs', CurrentStock: '2', MinimumStock: '5', MaximumStock: '20', ReorderLevel: '5', UnitCost: '450', Supplier: 'Gates India', StoreLocation: 'Store B', BinNumber: 'B-02', Status: 'Active' }
  ];
  sampleParts.forEach(function(p) {
    p.PartCode = generateId(CONFIG.SHEET_NAMES.SPARE_PARTS, CONFIG.ID_PREFIXES.SPARE_PART);
    p.CreatedAt = getCurrentTimestamp();
    p.CreatedBy = 'admin@cmms.com';
    addRow(CONFIG.SHEET_NAMES.SPARE_PARTS, p);
  });

  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var techs = getAllData(CONFIG.SHEET_NAMES.TECHNICIANS) || [];
  if (machines.length > 0 && techs.length > 0) {
    var samplePMs = [
      { Title: 'CNC Spindle Alignment Check', MachineID: machines[0].MachineID || '', MachineName: machines[0].MachineName || '', Frequency: '1', FrequencyType: 'Monthly', Priority: 'High', Status: 'Scheduled', StartDate: getTodayDateString(), DueDate: getDateNDaysFromNow(5), NextDueDate: getDateNDaysFromNow(35), AssignedTechnician: techs[0].EmployeeID || '', AssignedTechnicianName: techs[0].TechnicianName || '', Department: machines[0].Department || '', Section: machines[0].Section || '' },
      { Title: 'Hydraulic Press Oil Change', MachineID: machines.length > 1 ? machines[1].MachineID || '' : '', MachineName: machines.length > 1 ? machines[1].MachineName || '' : '', Frequency: '3', FrequencyType: 'Monthly', Priority: 'Medium', Status: 'Scheduled', StartDate: getTodayDateString(), DueDate: getDateNDaysFromNow(-2), NextDueDate: getDateNDaysFromNow(28), AssignedTechnician: techs.length > 1 ? techs[1].EmployeeID || '' : '', AssignedTechnicianName: techs.length > 1 ? techs[1].TechnicianName || '' : '', Department: machines.length > 1 ? machines[1].Department || '' : '', Section: machines.length > 1 ? machines[1].Section || '' : '' },
      { Title: 'Air Compressor Filter Inspection', MachineID: machines.length > 2 ? machines[2].MachineID || '' : '', MachineName: machines.length > 2 ? machines[2].MachineName || '' : '', Frequency: '1', FrequencyType: 'Weekly', Priority: 'Low', Status: 'Scheduled', StartDate: getTodayDateString(), DueDate: getDateNDaysFromNow(3), NextDueDate: getDateNDaysFromNow(10), AssignedTechnician: techs.length > 2 ? techs[2].EmployeeID || '' : '', AssignedTechnicianName: techs.length > 2 ? techs[2].TechnicianName || '' : '', Department: machines.length > 2 ? machines[2].Department || '' : '', Section: machines.length > 2 ? machines[2].Section || '' : '' }
    ];
    samplePMs.forEach(function(pm) {
      pm.PMNumber = generateId(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, CONFIG.ID_PREFIXES.PM);
      pm.CreatedAt = getCurrentTimestamp();
      pm.CreatedBy = 'admin@cmms.com';
      addRow(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE, pm);
    });
  }

  return 'Test data setup complete. All modules populated with sample data.';
}

function initQRBarcodeData() {
  try {
    var mods = [
      { sheet: CONFIG.SHEET_NAMES.MACHINES, idField: 'MachineID', nameField: 'MachineName', codeField: 'MachineCode', module: 'Machine' },
      { sheet: CONFIG.SHEET_NAMES.ASSETS, idField: 'AssetID', nameField: 'AssetName', codeField: 'AssetCode', module: 'Asset' },
      { sheet: CONFIG.SHEET_NAMES.SPARE_PARTS, idField: 'PartCode', nameField: 'PartName', codeField: 'PartCode', module: 'Spare Part' }
    ];
    mods.forEach(function(cfg) {
      var records = getAllData(cfg.sheet) || [];
      records.forEach(function(r) {
        var id = r[cfg.idField];
        if (id && (!r.QRCode || !r.Barcode)) {
          try { generateQRBarcodeForNewRecord(cfg.module, id, r); } catch(e) {}
        }
      });
    });
    Logger.log('initQRBarcodeData() completed');
    console.log('initQRBarcodeData() completed');
  } catch(e) {
    Logger.log('initQRBarcodeData() ERROR: ' + e.message);
    console.log('initQRBarcodeData() ERROR: ' + e.message);
  }
}

function setRowData(obj) {
  var result = {};
  Object.keys(obj).forEach(function(k) { result[k] = obj[k]; });
  return result;
}
