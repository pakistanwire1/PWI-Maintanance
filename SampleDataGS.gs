function initializeSectionMaster() {
  var sheetName = CONFIG.SHEET_NAMES.SECTIONS;
  var fields = CONFIG.SECTION_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { SectionID: 'SEC001', Section: 'Admin', SectionCode: 'ADM', Description: 'Administration & Management', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC002', Section: 'Spoke', SectionCode: 'SPK', Description: 'Spoke Production Unit', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '2', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC003', Section: 'Auto Plating Line', SectionCode: 'APL', Description: 'Automatic Plating Line', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC004', Section: 'Nipple', SectionCode: 'NPL', Description: 'Nipple Production Section', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC005', Section: 'Spoke Packing', SectionCode: 'SPP', Description: 'Spoke Packing & Dispatch', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC006', Section: 'Spiral', SectionCode: 'SPR', Description: 'Spiral Production Line', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC007', Section: 'PVC', SectionCode: 'PVC', Description: 'PVC Production Line', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC008', Section: 'Maintenance', SectionCode: 'MNT', Description: 'Facility Maintenance Department', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC009', Section: 'Quality Control', SectionCode: 'QC', Description: 'Quality Control & Inspection', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC010', Section: 'Warehouse', SectionCode: 'WRH', Description: 'Raw Material & Finished Goods Warehouse', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC011', Section: 'Safety & Environment', SectionCode: 'S&E', Description: 'Safety and Environmental Compliance', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '0', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { SectionID: 'SEC012', Section: 'Stores', SectionCode: 'STR', Description: 'Spare Parts & Consumables Store', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeDepartmentMaster() {
  var sheetName = CONFIG.SHEET_NAMES.DEPARTMENTS;
  var fields = CONFIG.DEPARTMENT_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { DepartmentID: 'DEPT001', Department: 'Admin', DepartmentCode: 'ADM', SectionID: 'SEC001', Section: 'Admin', DepartmentHead: 'Admin Head', Description: 'Administration Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT002', Department: 'Spoke Production', DepartmentCode: 'SPR', SectionID: 'SEC002', Section: 'Spoke', DepartmentHead: 'Spoke Manager', Description: 'Spoke Production Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT003', Department: 'Plating Line', DepartmentCode: 'PLT', SectionID: 'SEC003', Section: 'Auto Plating Line', DepartmentHead: 'Plating Supervisor', Description: 'Auto Plating Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT004', Department: 'Nipple Production', DepartmentCode: 'NPL', SectionID: 'SEC004', Section: 'Nipple', DepartmentHead: 'Nipple Manager', Description: 'Nipple Production Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT005', Department: 'Packing', DepartmentCode: 'PCK', SectionID: 'SEC005', Section: 'Spoke Packing', DepartmentHead: 'Packing Supervisor', Description: 'Packing Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT006', Department: 'Spiral Production', DepartmentCode: 'SPL', SectionID: 'SEC006', Section: 'Spiral', DepartmentHead: 'Spiral Manager', Description: 'Spiral Production Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT007', Department: 'PVC Production', DepartmentCode: 'PVC', SectionID: 'SEC007', Section: 'PVC', DepartmentHead: 'PVC Manager', Description: 'PVC Production Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT008', Department: 'Facility Maintenance', DepartmentCode: 'MNT', SectionID: 'SEC008', Section: 'Maintenance', DepartmentHead: 'Maintenance Head', Description: 'Facility Maintenance Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT009', Department: 'Quality Control', DepartmentCode: 'QC', SectionID: 'SEC009', Section: 'Quality Control', DepartmentHead: 'Quality Manager', Description: 'Quality Control Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT010', Department: 'Warehouse', DepartmentCode: 'WRH', SectionID: 'SEC010', Section: 'Warehouse', DepartmentHead: 'Warehouse Supervisor', Description: 'Warehouse Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT011', Department: 'Stores', DepartmentCode: 'STR', SectionID: 'SEC012', Section: 'Stores', DepartmentHead: 'Store Keeper', Description: 'Spare Parts Store Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { DepartmentID: 'DEPT012', Department: 'Safety', DepartmentCode: 'S&E', SectionID: 'SEC011', Section: 'Safety & Environment', DepartmentHead: 'Safety Officer', Description: 'Safety and Environment Department', SundayOff: 'Sunday', HoursPerDay: '8', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeMachineMaster() {
  var sheetName = CONFIG.SHEET_NAMES.MACHINES;
  var fields = CONFIG.MACHINE_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { MachineID: 'MCH001', MachineCode: 'CNC-001', MachineName: 'CNC Milling Machine', MachineNumber: 'CNC-001', DeptID: 'DEPT002', Department: 'Spoke Production', SectionID: 'SEC002', Section: 'Spoke', Location: 'Area A-1', MachineType: 'CNC', Manufacturer: 'HAAS Automation', Model: 'VF-2SS', SerialNo: 'HAAS-1001', Capacity: '500 kg', PowerRating: '50 kW', InstallDate: '2023-01-15', WarrantyExpiry: '2026-01-15', Criticality: 'Critical', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH002', MachineCode: 'CNC-002', MachineName: 'CNC Turning Center', MachineNumber: 'CNC-002', DeptID: 'DEPT002', Department: 'Spoke Production', SectionID: 'SEC002', Section: 'Spoke', Location: 'Area A-2', MachineType: 'CNC', Manufacturer: 'HAAS Automation', Model: 'ST-20', SerialNo: 'HAAS-1002', Capacity: '400 kg', PowerRating: '45 kW', InstallDate: '2023-03-20', WarrantyExpiry: '2026-03-20', Criticality: 'Critical', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH003', MachineCode: 'HP-001', MachineName: 'Hydraulic Press 100T', MachineNumber: 'HP-001', DeptID: 'DEPT002', Department: 'Spoke Production', SectionID: 'SEC002', Section: 'Spoke', Location: 'Area B-1', MachineType: 'Hydraulic', Manufacturer: 'Enerpac', Model: 'EP-100', SerialNo: 'EP-2001', Capacity: '100 T', PowerRating: '75 kW', InstallDate: '2022-06-10', WarrantyExpiry: '2025-06-10', Criticality: 'High', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH004', MachineCode: 'HP-002', MachineName: 'Hydraulic Press 50T', MachineNumber: 'HP-002', DeptID: 'DEPT004', Department: 'Nipple Production', SectionID: 'SEC004', Section: 'Nipple', Location: 'Area B-2', MachineType: 'Hydraulic', Manufacturer: 'Enerpac', Model: 'EP-50', SerialNo: 'EP-2002', Capacity: '50 T', PowerRating: '40 kW', InstallDate: '2022-08-15', WarrantyExpiry: '2025-08-15', Criticality: 'High', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH005', MachineCode: 'AC-001', MachineName: 'Screw Air Compressor', MachineNumber: 'AC-001', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Utility Room', MachineType: 'Compressor', Manufacturer: 'Atlas Copco', Model: 'GA-30VSD', SerialNo: 'AC-3001', Capacity: '200 CFM', PowerRating: '150 kW', InstallDate: '2023-05-01', WarrantyExpiry: '2026-05-01', Criticality: 'Critical', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH006', MachineCode: 'AC-002', MachineName: 'Piston Air Compressor', MachineNumber: 'AC-002', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Utility Room', MachineType: 'Compressor', Manufacturer: 'Ingersoll Rand', Model: 'SSR-50', SerialNo: 'IR-5001', Capacity: '100 CFM', PowerRating: '75 kW', InstallDate: '2023-07-20', WarrantyExpiry: '2026-07-20', Criticality: 'Medium', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH007', MachineCode: 'CB-001', MachineName: 'Main Conveyor Belt', MachineNumber: 'CB-001', DeptID: 'DEPT005', Department: 'Packing', SectionID: 'SEC005', Section: 'Spoke Packing', Location: 'Packing Area', MachineType: 'Conveyor', Manufacturer: 'Fenner Dunlop', Model: 'FD-500', SerialNo: 'FD-7001', Capacity: '100 m', PowerRating: '5 kW', InstallDate: '2021-11-01', WarrantyExpiry: '2024-11-01', Criticality: 'Medium', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH008', MachineCode: 'CB-002', MachineName: 'Packing Conveyor Belt', MachineNumber: 'CB-002', DeptID: 'DEPT005', Department: 'Packing', SectionID: 'SEC005', Section: 'Spoke Packing', Location: 'Packing Area', MachineType: 'Conveyor', Manufacturer: 'Fenner Dunlop', Model: 'FD-300', SerialNo: 'FD-7002', Capacity: '50 m', PowerRating: '3 kW', InstallDate: '2022-02-15', WarrantyExpiry: '2025-02-15', Criticality: 'Low', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH009', MachineCode: 'GEN-001', MachineName: 'Diesel Generator 500kVA', MachineNumber: 'GEN-001', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Generator Room', MachineType: 'Generator', Manufacturer: 'Cummins India', Model: 'C20D5', SerialNo: 'CUM-9001', Capacity: '500 kVA', PowerRating: '400 kW', InstallDate: '2023-01-01', WarrantyExpiry: '2026-01-01', Criticality: 'Critical', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH010', MachineCode: 'PUMP-001', MachineName: 'Coolant Pump Station', MachineNumber: 'PUMP-001', DeptID: 'DEPT003', Department: 'Plating Line', SectionID: 'SEC003', Section: 'Auto Plating Line', Location: 'Plating Area', MachineType: 'Pump', Manufacturer: 'Kirloskar Brothers', Model: 'KOS-150', SerialNo: 'KBL-5001', Capacity: '150 LPM', PowerRating: '25 kW', InstallDate: '2022-09-10', WarrantyExpiry: '2025-09-10', Criticality: 'High', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH011', MachineCode: 'PLT-001', MachineName: 'Auto Plating Line', MachineNumber: 'PLT-001', DeptID: 'DEPT003', Department: 'Plating Line', SectionID: 'SEC003', Section: 'Auto Plating Line', Location: 'Plating Area', MachineType: 'Robotic', Manufacturer: 'Grauer & Weil', Model: 'GW-2000', SerialNo: 'GW-3001', Capacity: '2000 kg/hr', PowerRating: '250 kW', InstallDate: '2023-04-01', WarrantyExpiry: '2028-04-01', Criticality: 'Critical', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH012', MachineCode: 'BOIL-001', MachineName: 'Steam Boiler', MachineNumber: 'BOIL-001', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Boiler Room', MachineType: 'Other', Manufacturer: 'Thermax', Model: 'TB-2000', SerialNo: 'THX-6001', Capacity: '2000 kg/hr', PowerRating: '150 kW', InstallDate: '2022-12-01', WarrantyExpiry: '2025-12-01', Criticality: 'High', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH013', MachineCode: 'SPL-001', MachineName: 'Spiral Winding Machine', MachineNumber: 'SPL-001', DeptID: 'DEPT006', Department: 'Spiral Production', SectionID: 'SEC006', Section: 'Spiral', Location: 'Spiral Area', MachineType: 'Mechanical', Manufacturer: 'Mitsubishi', Model: 'SW-500', SerialNo: 'MIT-8001', Capacity: '500 units/hr', PowerRating: '100 kW', InstallDate: '2023-06-15', WarrantyExpiry: '2026-06-15', Criticality: 'High', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH014', MachineCode: 'PVC-001', MachineName: 'PVC Extrusion Machine', MachineNumber: 'PVC-001', DeptID: 'DEPT007', Department: 'PVC Production', SectionID: 'SEC007', Section: 'PVC', Location: 'PVC Area', MachineType: 'Mechanical', Manufacturer: 'Battenfeld', Model: 'BE-100', SerialNo: 'BTF-4001', Capacity: '200 kg/hr', PowerRating: '80 kW', InstallDate: '2023-02-20', WarrantyExpiry: '2026-02-20', Criticality: 'High', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { MachineID: 'MCH015', MachineCode: 'DRY-001', MachineName: 'Air Dryer Unit', MachineNumber: 'DRY-001', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Utility Room', MachineType: 'Pneumatic', Manufacturer: 'Atlas Copco', Model: 'CD-90', SerialNo: 'AC-9001', Capacity: '200 CFM', PowerRating: '5 kW', InstallDate: '2023-05-01', WarrantyExpiry: '2026-05-01', Criticality: 'Medium', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeAssetMaster() {
  var sheetName = CONFIG.SHEET_NAMES.ASSETS;
  var fields = CONFIG.ASSET_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { AssetID: 'AST001', AssetCode: 'AST-001', AssetName: 'CNC Tool Holder Set', AssetType: 'Tooling', Category: 'Production', MachineID: 'MCH001', MachineName: 'CNC Milling Machine', DeptID: 'DEPT002', Department: 'Spoke Production', SectionID: 'SEC002', Section: 'Spoke', Location: 'Tool Room', Manufacturer: 'HAAS', Model: 'TH-20', SerialNo: 'TH-001', Specification: 'Standard tool holder set 20 pcs', PurchaseDate: '2023-01-15', InstallDate: '2023-01-20', WarrantyExpiry: '2024-01-20', Criticality: 'Low', Supplier: 'HAAS India', Cost: '5000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST002', AssetCode: 'AST-002', AssetName: 'Hydraulic Pump Unit', AssetType: 'Equipment', Category: 'Production', MachineID: 'MCH003', MachineName: 'Hydraulic Press 100T', DeptID: 'DEPT002', Department: 'Spoke Production', SectionID: 'SEC002', Section: 'Spoke', Location: 'Area B-1', Manufacturer: 'Enerpac', Model: 'EP-PUMP', SerialNo: 'EP-P001', Specification: 'High pressure hydraulic pump 200 bar', PurchaseDate: '2022-06-10', InstallDate: '2022-06-15', WarrantyExpiry: '2025-06-15', Criticality: 'High', Supplier: 'Enerpac India', Cost: '15000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST003', AssetCode: 'AST-003', AssetName: 'Air Dryer Refrigeration Unit', AssetType: 'Equipment', Category: 'Utility', MachineID: 'MCH015', MachineName: 'Air Dryer Unit', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Utility Room', Manufacturer: 'Atlas Copco', Model: 'CD-90', SerialNo: 'AC-9001', Specification: 'Refrigeration type air dryer 200 CFM', PurchaseDate: '2023-05-01', InstallDate: '2023-05-05', WarrantyExpiry: '2026-05-05', Criticality: 'Medium', Supplier: 'Atlas Copco India', Cost: '25000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST004', AssetCode: 'AST-004', AssetName: 'CNC Collet Set', AssetType: 'Tooling', Category: 'Production', MachineID: 'MCH002', MachineName: 'CNC Turning Center', DeptID: 'DEPT002', Department: 'Spoke Production', SectionID: 'SEC002', Section: 'Spoke', Location: 'Tool Room', Manufacturer: 'HAAS', Model: 'CS-20', SerialNo: 'CS-001', Specification: 'Collet set 20 pcs various sizes', PurchaseDate: '2023-03-20', InstallDate: '2023-03-22', WarrantyExpiry: '2024-03-22', Criticality: 'Low', Supplier: 'HAAS India', Cost: '3500', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST005', AssetCode: 'AST-005', AssetName: 'PLC Control Panel', AssetType: 'Equipment', Category: 'Production', MachineID: 'MCH011', MachineName: 'Auto Plating Line', DeptID: 'DEPT003', Department: 'Plating Line', SectionID: 'SEC003', Section: 'Auto Plating Line', Location: 'Control Room', Manufacturer: 'Siemens', Model: 'S7-1500', SerialNo: 'SI-5001', Specification: 'Siemens S7-1500 PLC with HMI', PurchaseDate: '2023-04-01', InstallDate: '2023-04-05', WarrantyExpiry: '2028-04-05', Criticality: 'Critical', Supplier: 'Siemens India', Cost: '85000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST006', AssetCode: 'AST-006', AssetName: 'Overhead Crane 5T', AssetType: 'Equipment', Category: 'Production', MachineID: '', MachineName: '', DeptID: 'DEPT006', Department: 'Spiral Production', SectionID: 'SEC006', Section: 'Spiral', Location: 'Spiral Area', Manufacturer: 'Konecranes', Model: 'CXT-5', SerialNo: 'KC-2001', Specification: '5 Ton overhead EOT crane', PurchaseDate: '2021-12-01', InstallDate: '2022-01-15', WarrantyExpiry: '2025-01-15', Criticality: 'High', Supplier: 'Konecranes India', Cost: '120000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST007', AssetCode: 'AST-007', AssetName: 'Cooling Tower 100T', AssetType: 'Equipment', Category: 'Utility', MachineID: '', MachineName: '', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Cooling Tower Area', Manufacturer: 'Paharpur', Model: 'FGR-100', SerialNo: 'PP-3001', Specification: '100 Ton induced draft cooling tower', PurchaseDate: '2022-08-01', InstallDate: '2022-09-01', WarrantyExpiry: '2025-09-01', Criticality: 'High', Supplier: 'Paharpur Cooling Towers', Cost: '95000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST008', AssetCode: 'AST-008', AssetName: 'Digital Multimeter Fluke', AssetType: 'Instrument', Category: 'Quality', MachineID: '', MachineName: '', DeptID: 'DEPT009', Department: 'Quality Control', SectionID: 'SEC009', Section: 'Quality Control', Location: 'QC Lab', Manufacturer: 'Fluke', Model: '87V', SerialNo: 'Fl-5001', Specification: 'True RMS digital multimeter', PurchaseDate: '2023-06-01', InstallDate: '2023-06-02', WarrantyExpiry: '2026-06-02', Criticality: 'Low', Supplier: 'Fluke India', Cost: '8500', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST009', AssetCode: 'AST-009', AssetName: 'Vibration Analyzer', AssetType: 'Instrument', Category: 'Utility', MachineID: '', MachineName: '', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Maintenance Workshop', Manufacturer: 'SKF', Model: 'CMXA-75', SerialNo: 'SK-7001', Specification: 'Portable vibration analyzer with FFT', PurchaseDate: '2023-09-01', InstallDate: '2023-09-05', WarrantyExpiry: '2026-09-05', Criticality: 'Medium', Supplier: 'SKF India', Cost: '45000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST010', AssetCode: 'AST-010', AssetName: 'Forklift 2.5T', AssetType: 'Vehicle', Category: 'Production', MachineID: '', MachineName: '', DeptID: 'DEPT010', Department: 'Warehouse', SectionID: 'SEC010', Section: 'Warehouse', Location: 'Warehouse', Manufacturer: 'Toyota', Model: '7FDU25', SerialNo: 'TY-6001', Specification: '2.5 Ton diesel forklift', PurchaseDate: '2021-10-01', InstallDate: '2021-10-15', WarrantyExpiry: '2024-10-15', Criticality: 'Medium', Supplier: 'Toyota Material Handling', Cost: '180000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST011', AssetCode: 'AST-011', AssetName: 'Fire Alarm System', AssetType: 'Equipment', Category: 'Safety', MachineID: '', MachineName: '', DeptID: 'DEPT012', Department: 'Safety', SectionID: 'SEC011', Section: 'Safety & Environment', Location: 'Plant Wide', Manufacturer: 'Honeywell', Model: 'ES-200', SerialNo: 'HW-8001', Specification: 'Addressable fire alarm control panel', PurchaseDate: '2023-03-01', InstallDate: '2023-03-15', WarrantyExpiry: '2028-03-15', Criticality: 'Critical', Supplier: 'Honeywell India', Cost: '75000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { AssetID: 'AST012', AssetCode: 'AST-012', AssetName: 'Welding Machine Set', AssetType: 'Equipment', Category: 'Production', MachineID: '', MachineName: '', DeptID: 'DEPT008', Department: 'Facility Maintenance', SectionID: 'SEC008', Section: 'Maintenance', Location: 'Maintenance Workshop', Manufacturer: 'ESAB', Model: 'Rebel EMP 215', SerialNo: 'ES-4001', Specification: 'Multi-process welding machine 215A', PurchaseDate: '2023-07-15', InstallDate: '2023-07-20', WarrantyExpiry: '2026-07-20', Criticality: 'Low', Supplier: 'ESAB India', Cost: '32000', Status: 'Active', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeTechnicianMaster() {
  var sheetName = CONFIG.SHEET_NAMES.TECHNICIANS;
  var fields = CONFIG.TECHNICIAN_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var techNames = ['Rajesh Kumar', 'Suresh Patel', 'Amit Singh', 'Vikram Sharma', 'Deepak Verma', 'Ravi Gupta', 'Manish Joshi', 'Prakash Rao', 'Sunil Yadav', 'Anil Kumar', 'Vijay Nair', 'Rohit Deshmukh'];
  var skills = ['Mechanical', 'Electrical', 'PLC', 'Hydraulic', 'Mechanical', 'Pneumatic', 'Electrical', 'Hydraulic', 'Mechanical', 'Instrumentation', 'PLC', 'Pneumatic'];
  var shifts = ['General', 'General', 'A', 'B', 'General', 'General', 'A', 'B', 'General', 'General', 'A', 'B'];
  var sampleData = [];
  for (var i = 0; i < techNames.length; i++) {
    sampleData.push({
      EmployeeID: 'EMP' + String(i + 1).padStart(3, '0'),
      TechnicianName: techNames[i],
      Skill: skills[i],
      Shift: shifts[i],
      Status: 'Active'
    });
  }
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeUsers() {
  var sheetName = CONFIG.SHEET_NAMES.USERS;
  var fields = CONFIG.USER_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { UserID: 'USR001', EmployeeID: 'EMP-ADM', Name: 'Administrator', Email: 'admin@cmms.com', Password: 'admin123', Mobile: '9876543200', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'System Administrator', Role: 'Admin', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'TRUE', CanReviewPendingJobCard: 'TRUE', CanViewAllJobCards: 'TRUE', CanManageMachines: 'TRUE', CanManageAssets: 'TRUE', CanManageSpareParts: 'TRUE', CanManagePM: 'TRUE', CanManageTechnicians: 'TRUE', CanManageDepartments: 'TRUE', CanManageSections: 'TRUE', CanManageUsers: 'TRUE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'TRUE', IsAdmin: 'TRUE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR002', EmployeeID: 'EMP-MGR', Name: 'Maintenance Manager', Email: 'manager@cmms.com', Password: 'mgr123', Mobile: '9876543201', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Department Manager', Role: 'Department Manager', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'TRUE', CanManageMachines: 'TRUE', CanManageAssets: 'TRUE', CanManageSpareParts: 'TRUE', CanManagePM: 'TRUE', CanManageTechnicians: 'TRUE', CanManageDepartments: 'TRUE', CanManageSections: 'TRUE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'TRUE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR003', EmployeeID: 'EMP-SUP', Name: 'Supervisor User', Email: 'supervisor@cmms.com', Password: 'super123', Mobile: '9876543202', Department: 'Spoke Production', Section: 'Spoke', Designation: 'Maintenance Supervisor', Role: 'Supervisor', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'TRUE', CanManageMachines: 'TRUE', CanManageAssets: 'TRUE', CanManageSpareParts: 'FALSE', CanManagePM: 'TRUE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR004', EmployeeID: 'EMP-TEC', Name: 'Technician User', Email: 'tech@cmms.com', Password: 'tech123', Mobile: '9876543203', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Maintenance Technician', Role: 'Technician', Status: 'Active', CanOpenJobCard: 'FALSE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'FALSE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR005', EmployeeID: 'EMP-OPR', Name: 'Operator User', Email: 'operator@cmms.com', Password: 'oper123', Mobile: '9876543204', Department: 'Spoke Production', Section: 'Spoke', Designation: 'Production Operator', Role: 'Operator', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'FALSE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR006', EmployeeID: 'EMP-VWR', Name: 'Viewer User', Email: 'viewer@cmms.com', Password: 'view123', Mobile: '9876543205', Department: 'Admin', Section: 'Admin', Designation: 'Viewer', Role: 'Viewer', Status: 'Active', CanOpenJobCard: 'FALSE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR007', EmployeeID: 'EMP-QCM', Name: 'Quality Manager', Email: 'quality@cmms.com', Password: 'qual123', Mobile: '9876543206', Department: 'Quality Control', Section: 'Quality Control', Designation: 'Quality Manager', Role: 'Department Manager', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR008', EmployeeID: 'EMP-STK', Name: 'Store Keeper', Email: 'store@cmms.com', Password: 'store123', Mobile: '9876543207', Department: 'Stores', Section: 'Stores', Designation: 'Store Keeper', Role: 'Store', Status: 'Active', CanOpenJobCard: 'FALSE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'TRUE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'FALSE', CanManageInventory: 'TRUE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR009', EmployeeID: 'EMP-PROD', Name: 'Production Manager', Email: 'production@cmms.com', Password: 'prod123', Mobile: '9876543208', Department: 'Spoke Production', Section: 'Spoke', Designation: 'Production Manager', Role: 'Department Manager', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR010', EmployeeID: 'EMP-SAFE', Name: 'Safety Officer', Email: 'safety@cmms.com', Password: 'safe123', Mobile: '9876543209', Department: 'Safety', Section: 'Safety & Environment', Designation: 'Safety Officer', Role: 'Supervisor', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR011', EmployeeID: 'EMP-PLAT', Name: 'Plating Supervisor', Email: 'plating@cmms.com', Password: 'plat123', Mobile: '9876543210', Department: 'Plating Line', Section: 'Auto Plating Line', Designation: 'Plating Supervisor', Role: 'Supervisor', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'TRUE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'FALSE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { UserID: 'USR012', EmployeeID: 'EMP-WRH', Name: 'Warehouse Manager', Email: 'warehouse@cmms.com', Password: 'ware123', Mobile: '9876543211', Department: 'Warehouse', Section: 'Warehouse', Designation: 'Warehouse Supervisor', Role: 'Supervisor', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', CanManageInventory: 'TRUE', IsAdmin: 'FALSE', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeSpareParts() {
  var sheetName = CONFIG.SHEET_NAMES.SPARE_PARTS;
  var fields = CONFIG.SPARE_PART_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { PartCode: 'SP001', PartName: 'Spindle Bearing SKF 6205', Category: 'Bearings', Manufacturer: 'SKF', MachineCompatibility: 'CNC Milling Machine|CNC Turning Center', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '5', MaximumStock: '20', CurrentStock: '10', ReorderLevel: '8', StoreLocation: 'Store A', BinNumber: 'A-01', UnitCost: '150', Supplier: 'SKF India Pvt Ltd', Barcode: '', Status: 'Active', Remarks: 'Standard deep groove ball bearing', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP002', PartName: 'Hydraulic Seal Kit HP-100', Category: 'Seals', Manufacturer: 'Parker Hannifin', MachineCompatibility: 'Hydraulic Press 100T', AssetCompatibility: '', Unit: 'Set', MinimumStock: '3', MaximumStock: '15', CurrentStock: '5', ReorderLevel: '5', StoreLocation: 'Store A', BinNumber: 'A-02', UnitCost: '850', Supplier: 'Parker Hannifin India', Barcode: '', Status: 'Active', Remarks: 'Complete seal kit for Enerpac HP-100 press', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP003', PartName: 'Air Filter Element GA-30', Category: 'Filters', Manufacturer: 'Atlas Copco', MachineCompatibility: 'Screw Air Compressor', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '10', MaximumStock: '50', CurrentStock: '25', ReorderLevel: '15', StoreLocation: 'Store B', BinNumber: 'B-01', UnitCost: '250', Supplier: 'Atlas Copco India', Barcode: '', Status: 'Active', Remarks: 'Air intake filter for GA-30 compressor', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP004', PartName: 'Hydraulic Oil ISO 68', Category: 'Lubricants', Manufacturer: 'Shell', MachineCompatibility: 'Hydraulic Press 100T|Hydraulic Press 50T', AssetCompatibility: '', Unit: 'Liter', MinimumStock: '50', MaximumStock: '200', CurrentStock: '120', ReorderLevel: '60', StoreLocation: 'Store C', BinNumber: 'C-01', UnitCost: '180', Supplier: 'Shell India', Barcode: '', Status: 'Active', Remarks: 'Premium grade hydraulic oil 68 viscosity', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP005', PartName: 'V-Belt B-1600', Category: 'Belts', Manufacturer: 'Gates', MachineCompatibility: 'Screw Air Compressor|Diesel Generator', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '5', MaximumStock: '20', CurrentStock: '8', ReorderLevel: '6', StoreLocation: 'Store B', BinNumber: 'B-02', UnitCost: '450', Supplier: 'Gates India', Barcode: '', Status: 'Active', Remarks: 'V-belt section B 1600mm length', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP006', PartName: 'Coolant Pump Impeller', Category: 'Pump Parts', Manufacturer: 'Kirloskar', MachineCompatibility: 'Coolant Pump Station', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '2', MaximumStock: '10', CurrentStock: '4', ReorderLevel: '3', StoreLocation: 'Store A', BinNumber: 'A-03', UnitCost: '1200', Supplier: 'Kirloskar Brothers', Barcode: '', Status: 'Active', Remarks: 'Stainless steel impeller for coolant pump', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP007', PartName: 'Proximity Sensor M12', Category: 'Electrical', Manufacturer: 'Omron', MachineCompatibility: 'CNC Milling Machine|Auto Plating Line', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '10', MaximumStock: '30', CurrentStock: '15', ReorderLevel: '12', StoreLocation: 'Store A', BinNumber: 'A-04', UnitCost: '350', Supplier: 'Omron India', Barcode: '', Status: 'Active', Remarks: 'Inductive proximity sensor M12 x 50mm', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP008', PartName: 'Emergency Stop Push Button', Category: 'Electrical', Manufacturer: 'Schneider', MachineCompatibility: '', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '10', MaximumStock: '40', CurrentStock: '20', ReorderLevel: '15', StoreLocation: 'Store B', BinNumber: 'B-03', UnitCost: '180', Supplier: 'Schneider Electric India', Barcode: '', Status: 'Active', Remarks: 'Red mushroom head e-stop switch', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP009', PartName: 'Oil Filter Element', Category: 'Filters', Manufacturer: 'Donaldson', MachineCompatibility: 'Hydraulic Press 100T|Hydraulic Press 50T', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '5', MaximumStock: '25', CurrentStock: '12', ReorderLevel: '8', StoreLocation: 'Store B', BinNumber: 'B-04', UnitCost: '320', Supplier: 'Donaldson India', Barcode: '', Status: 'Active', Remarks: 'Hydraulic oil filter element 10 micron', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP010', PartName: 'Grease SKF LGHP 2/1', Category: 'Lubricants', Manufacturer: 'SKF', MachineCompatibility: '', AssetCompatibility: '', Unit: 'Kg', MinimumStock: '5', MaximumStock: '25', CurrentStock: '10', ReorderLevel: '8', StoreLocation: 'Store C', BinNumber: 'C-02', UnitCost: '650', Supplier: 'SKF India', Barcode: '', Status: 'Active', Remarks: 'High performance bearing grease 1kg pack', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP011', PartName: 'Motor Bearing 6205ZZ', Category: 'Bearings', Manufacturer: 'SKF', MachineCompatibility: '', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '10', MaximumStock: '40', CurrentStock: '18', ReorderLevel: '12', StoreLocation: 'Store A', BinNumber: 'A-05', UnitCost: '120', Supplier: 'SKF India', Barcode: '', Status: 'Active', Remarks: 'Shielded deep groove ball bearing 25x52x15mm', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP012', PartName: 'Coolant Fluid 5L', Category: 'Lubricants', Manufacturer: 'Castrol', MachineCompatibility: 'CNC Milling Machine|CNC Turning Center', AssetCompatibility: '', Unit: 'Liter', MinimumStock: '20', MaximumStock: '100', CurrentStock: '45', ReorderLevel: '25', StoreLocation: 'Store C', BinNumber: 'C-03', UnitCost: '95', Supplier: 'Castrol India', Barcode: '', Status: 'Active', Remarks: 'Synthetic coolant concentrate 5L can', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP013', PartName: 'Fuse 32A Cartridge', Category: 'Electrical', Manufacturer: 'Siemens', MachineCompatibility: '', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '20', MaximumStock: '100', CurrentStock: '50', ReorderLevel: '30', StoreLocation: 'Store B', BinNumber: 'B-05', UnitCost: '25', Supplier: 'Siemens India', Barcode: '', Status: 'Active', Remarks: '32A HRC fuse cartridge 500V', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP014', PartName: 'Pneumatic Cylinder 100mm', Category: 'Pneumatic', Manufacturer: 'Festo', MachineCompatibility: 'Auto Plating Line|Main Conveyor Belt', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '3', MaximumStock: '15', CurrentStock: '6', ReorderLevel: '5', StoreLocation: 'Store A', BinNumber: 'A-06', UnitCost: '2800', Supplier: 'Festo India', Barcode: '', Status: 'Active', Remarks: 'Double acting pneumatic cylinder bore 100mm stroke 200mm', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP015', PartName: 'Solenoid Valve 5/2', Category: 'Pneumatic', Manufacturer: 'SMC', MachineCompatibility: 'Auto Plating Line', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '5', MaximumStock: '20', CurrentStock: '8', ReorderLevel: '6', StoreLocation: 'Store A', BinNumber: 'A-07', UnitCost: '1500', Supplier: 'SMC India', Barcode: '', Status: 'Active', Remarks: '5/2 way solenoid valve 24VDC', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP016', PartName: 'Generator Battery 12V 200Ah', Category: 'Electrical', Manufacturer: 'Exide', MachineCompatibility: 'Diesel Generator 500kVA', AssetCompatibility: '', Unit: 'Pcs', MinimumStock: '1', MaximumStock: '4', CurrentStock: '2', ReorderLevel: '2', StoreLocation: 'Store A', BinNumber: 'A-08', UnitCost: '4500', Supplier: 'Exide India', Barcode: '', Status: 'Active', Remarks: 'Lead acid battery 12V 200Ah for generator starting', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP017', PartName: 'Conveyor Belt 500mm', Category: 'Belts', Manufacturer: 'Fenner', MachineCompatibility: 'Main Conveyor Belt|Packing Conveyor Belt', AssetCompatibility: '', Unit: 'Meter', MinimumStock: '10', MaximumStock: '50', CurrentStock: '20', ReorderLevel: '15', StoreLocation: 'Store B', BinNumber: 'B-06', UnitCost: '750', Supplier: 'Fenner India', Barcode: '', Status: 'Active', Remarks: 'PVC conveyor belt width 500mm', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP018', PartName: 'PLC Module Input 16DI', Category: 'Electrical', Manufacturer: 'Siemens', MachineCompatibility: 'Auto Plating Line', AssetCompatibility: 'PLC Control Panel', Unit: 'Pcs', MinimumStock: '1', MaximumStock: '5', CurrentStock: '2', ReorderLevel: '2', StoreLocation: 'Store A', BinNumber: 'A-09', UnitCost: '8500', Supplier: 'Siemens India', Barcode: '', Status: 'Active', Remarks: 'Siemens S7-1500 digital input module 16DI', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP019', PartName: 'Welding Electrode E6013 3.15mm', Category: 'Consumables', Manufacturer: 'ESAB', MachineCompatibility: '', AssetCompatibility: 'Welding Machine Set', Unit: 'Kg', MinimumStock: '5', MaximumStock: '50', CurrentStock: '15', ReorderLevel: '10', StoreLocation: 'Store B', BinNumber: 'B-07', UnitCost: '120', Supplier: 'ESAB India', Barcode: '', Status: 'Active', Remarks: 'General purpose welding electrode 3.15mm x 350mm', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { PartCode: 'SP020', PartName: 'Cooling Tower Fan Blade', Category: 'Fabricated', Manufacturer: 'Paharpur', MachineCompatibility: '', AssetCompatibility: 'Cooling Tower 100T', Unit: 'Set', MinimumStock: '1', MaximumStock: '5', CurrentStock: '2', ReorderLevel: '2', StoreLocation: 'Store A', BinNumber: 'A-10', UnitCost: '3500', Supplier: 'Paharpur Cooling Towers', Barcode: '', Status: 'Active', Remarks: 'FRP fan blade set with hub for cooling tower', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializePMTemplates() {
  var sheetName = CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES;
  var fields = CONFIG.CHECKLIST_TEMPLATE_FIELDS || ['TemplateID', 'TemplateName', 'Category', 'Items', 'Description', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'];
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var sampleData = [
    { TemplateID: 'CT001', TemplateName: 'Daily Mechanical Inspection', Category: 'Daily', Items: '1. Check oil level in gearbox\n2. Inspect belts for wear & tension\n3. Listen for unusual noise\n4. Check vibration levels\n5. Verify cooling fan operation\n6. Inspect coupling alignment\n7. Check fasteners for tightness\n8. Record operating parameters', Description: 'Daily routine inspection for mechanical equipment. To be performed at start of shift.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT002', TemplateName: 'Electrical Safety Check', Category: 'Safety', Items: '1. Check wiring condition\n2. Verify grounding continuity\n3. Test emergency stop function\n4. Inspect panel board\n5. Check insulation resistance\n6. Verify overload relay settings\n7. Inspect cable glands\n8. Check earth leakage protection', Description: 'Comprehensive electrical safety inspection checklist.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT003', TemplateName: 'Weekly Hydraulic System Check', Category: 'Weekly', Items: '1. Check hydraulic fluid level\n2. Inspect hoses for leaks or abrasion\n3. Test system pressure\n4. Check filter indicators\n5. Clean strainers\n6. Inspect cylinder rods for scoring\n7. Check pump operating temperature\n8. Verify pressure relief valve setting', Description: 'Weekly preventive maintenance for hydraulic systems.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT004', TemplateName: 'Compressor Weekly Maintenance', Category: 'Weekly', Items: '1. Drain condensate from receiver\n2. Check air filter condition\n3. Inspect belt tension\n4. Verify operating pressure\n5. Check safety valve\n6. Inspect cooler fins\n7. Record running hours\n8. Check oil level in compressor', Description: 'Weekly maintenance checklist for air compressors.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT005', TemplateName: 'Monthly CNC Precision Check', Category: 'Monthly', Items: '1. Check spindle runout\n2. Verify axis backlash\n3. Inspect tool holder taper\n4. Coolant concentration test\n5. Check way wipers\n6. Lubricate ball screws\n7. Verify limit switch operation\n8. Inspect chip conveyor', Description: 'Monthly precision maintenance for CNC machines.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT006', TemplateName: 'Generator Monthly Test', Category: 'Monthly', Items: '1. Start generator and run for 30 min\n2. Check battery voltage\n3. Inspect coolant level\n4. Check fuel level\n5. Verify ATS operation\n6. Inspect exhaust system\n7. Check alternator output voltage\n8. Record load bank test results', Description: 'Monthly test run inspection for diesel generators.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT007', TemplateName: 'Quarterly Lubrication Schedule', Category: 'Mechanical', Items: '1. Grease all bearing points\n2. Change gearbox oil\n3. Lubricate chain drives\n4. Check oil samples\n5. Inspect grease lines\n6. Verify automatic lubrication system\n7. Record lubrication dates\n8. Update lubrication chart', Description: 'Quarterly lubrication schedule for all rotating equipment.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT008', TemplateName: 'Pump Station Inspection', Category: 'Mechanical', Items: '1. Check pump alignment\n2. Inspect mechanical seal\n3. Verify discharge pressure\n4. Check suction strainer\n5. Inspect motor bearings\n6. Check coupling condition\n7. Verify non-return valve\n8. Record flow rate', Description: 'Standard inspection checklist for pump stations.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT009', TemplateName: 'Safety Shower & Eye Wash Check', Category: 'Safety', Items: '1. Flush eye wash station\n2. Check water flow rate\n3. Verify water temperature\n4. Inspect drain line\n5. Check signage visibility\n6. Test activation mechanism\n7. Record inspection tag\n8. Check plumbed connections', Description: 'Weekly inspection for safety shower and eye wash stations.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT010', TemplateName: 'Conveyor System Monthly Check', Category: 'Monthly', Items: '1. Inspect belt tracking\n2. Check roller bearings\n3. Verify tensioner operation\n4. Inspect belt surface\n5. Check motor coupling\n6. Verify emergency stops\n7. Lubricate chain drives\n8. Inspect support structure', Description: 'Monthly preventive maintenance for conveyor systems.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT011', TemplateName: 'Boiler Daily Log', Category: 'Daily', Items: '1. Record steam pressure\n2. Check feed water level\n3. Inspect burner flame\n4. Verify safety valves\n5. Check blowdown valve\n6. Record fuel consumption\n7. Check flue gas temperature\n8. Inspect water treatment system', Description: 'Daily log sheet for boiler operation and monitoring.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT012', TemplateName: 'Plating Line Chemical Check', Category: 'Quality', Items: '1. Check bath temperature\n2. Verify pH level\n3. Test chemical concentration\n4. Inspect anodes condition\n5. Check filtration system\n6. Verify rectifier output\n7. Inspect exhaust system\n8. Record process parameters', Description: 'Daily chemical and process check for auto plating line.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT013', TemplateName: 'Fire Extinguisher Monthly Check', Category: 'Safety', Items: '1. Verify pressure gauge in green zone\n2. Inspect for physical damage\n3. Check safety pin intact\n4. Verify accessibility\n5. Inspect hose condition\n6. Check inspection tag date\n7. Verify mounting bracket\n8. Record location and status', Description: 'Monthly fire extinguisher inspection checklist.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT014', TemplateName: 'Air Conditioning PM Check', Category: 'Monthly', Items: '1. Clean air filters\n2. Check refrigerant pressure\n3. Inspect condenser coils\n4. Verify drain line\n5. Check compressor current\n6. Inspect fan belt\n7. Verify temperature setpoint\n8. Record operating parameters', Description: 'Monthly preventive maintenance for air conditioning units.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now },
    { TemplateID: 'CT015', TemplateName: 'Overhead Crane Inspection', Category: 'Safety', Items: '1. Inspect wire rope for fraying\n2. Check hook condition\n3. Verify limit switches\n4. Test emergency stop\n5. Inspect brake system\n6. Check pendant control\n7. Verify load test certificate\n8. Inspect runway rails', Description: 'Monthly safety inspection for overhead cranes.', CreatedBy: 'admin@cmms.com', CreatedAt: now, UpdatedBy: 'admin@cmms.com', UpdatedAt: now }
  ];
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeAllSampleData() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Initialize Sample Data',
    'This will insert sample data into ALL master tables. Existing data will not be overwritten.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;
  var results = [];
  var fns = [
    { name: 'Sections', fn: initializeSectionMaster },
    { name: 'Departments', fn: initializeDepartmentMaster },
    { name: 'Machines', fn: initializeMachineMaster },
    { name: 'Assets', fn: initializeAssetMaster },
    { name: 'Technicians', fn: initializeTechnicianMaster },
    { name: 'Users', fn: initializeUsers },
    { name: 'Spare Parts', fn: initializeSpareParts },
    { name: 'PM Templates', fn: initializePMTemplates }
  ];
  fns.forEach(function(item) {
    try {
      var result = item.fn();
      results.push({ table: item.name, status: result.status, message: result.message, records: result.records || 0 });
      Logger.log(item.name + ': ' + result.message);
    } catch (e) {
      results.push({ table: item.name, status: 'error', message: e.message, records: 0 });
      Logger.log(item.name + ' ERROR: ' + e.message);
    }
  });
  var msg = 'Sample data initialization complete:\n';
  var inserted = 0;
  results.forEach(function(r) {
    msg += '\n' + r.table + ': ' + r.message;
    if (r.status === 'success') inserted += r.records;
  });
  msg += '\n\nTotal records inserted: ' + inserted;
  ui.alert('Sample Data Init Complete', msg, ui.ButtonSet.OK);
  notifyFrontendRefresh();
  return results;
}

function ensureSheet(sheetName, fields) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, fields.length).setValues([fields]);
    SpreadsheetApp.flush();
    Logger.log('Created sheet: ' + sheetName);
  } else {
    var range = sheet.getDataRange();
    var data = range.getValues();
    if (data.length === 0 || (data.length === 1 && data[0].join('').length === 0)) {
      sheet.getRange(1, 1, 1, fields.length).setValues([fields]);
      SpreadsheetApp.flush();
      Logger.log('Headers added to: ' + sheetName);
    } else {
      var existingHeaders = data[0];
      var missingHeaders = [];
      fields.forEach(function(h) {
        if (existingHeaders.indexOf(h) === -1) missingHeaders.push(h);
      });
      if (missingHeaders.length > 0) {
        var startCol = existingHeaders.length + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        SpreadsheetApp.flush();
        Logger.log('Missing headers added to: ' + sheetName + ': ' + missingHeaders.join(', '));
      }
    }
  }
  return sheet;
}

function hasDataRows(sheet) {
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    var rowHasData = false;
    for (var c = 0; c < data[i].length; c++) {
      if (data[i][c] !== '' && data[i][c] !== null && data[i][c] !== undefined) {
        rowHasData = true;
        break;
      }
    }
    if (rowHasData) count++;
    if (count > 0) return true;
  }
  return false;
}

function insertRows(sheet, fields, rows) {
  if (!rows || rows.length === 0) return;
  var values = [];
  rows.forEach(function(row) {
    var rowValues = [];
    fields.forEach(function(field) {
      rowValues.push(row[field] !== undefined ? row[field] : '');
    });
    values.push(rowValues);
  });
  sheet.getRange(2, 1, values.length, fields.length).setValues(values);
  SpreadsheetApp.flush();
  Logger.log('Inserted ' + values.length + ' rows into ' + sheet.getName());
}

function formatSheet(sheet, fields) {
  if (!sheet || !fields) return;
  var colCount = fields.length;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  headerRange.setFontSize(11);
  sheet.setFrozenRows(1);
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, colCount);
    dataRange.setVerticalAlignment('middle');
    dataRange.setFontSize(10);
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, colCount).setBackground(bg);
      sheet.setRowHeight(ri, 24);
    }
  }
  var fullRange = sheet.getRange(1, 1, lastRow, colCount);
  fullRange.setBorder(true, true, true, true, true, true);
  fullRange.setBorder(true, true, true, true, true, true, '#D0D0D0', SpreadsheetApp.BorderStyle.SOLID);
  for (var ci = 0; ci < colCount; ci++) {
    sheet.autoResizeColumn(ci + 1);
    var colWidth = sheet.getColumnWidth(ci + 1);
    if (colWidth > 300) sheet.setColumnWidth(ci + 1, 300);
    if (colWidth < 80) sheet.setColumnWidth(ci + 1, 80);
  }
  var idCol = fields.indexOf('SectionID') + 1;
  if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
  var statusCol = fields.indexOf('Status') + 1;
  if (statusCol > 0) sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
  var createdAtCol = fields.indexOf('CreatedAt') + 1;
  if (createdAtCol > 0) sheet.getRange(2, createdAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  var updatedAtCol = fields.indexOf('UpdatedAt') + 1;
  if (updatedAtCol > 0) sheet.getRange(2, updatedAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  if (sheet.getFilter()) {
    var existingFilter = sheet.getFilter();
    existingFilter.remove();
  }
  var filterRange = sheet.getRange(1, 1, lastRow, colCount);
  filterRange.createFilter();
  SpreadsheetApp.flush();
  Logger.log('Sheet formatted: ' + sheet.getName());
}

function notifyFrontendRefresh() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOGS || 'Logs');
    if (!sheet) return;
    var ts = new Date().toISOString();
    sheet.appendRow(['DATA_REFRESH', ts, 'Sample data initialized - refresh frontend', 'System', ts]);
  } catch (e) {
    Logger.log('notifyFrontendRefresh error: ' + e.message);
  }
}

function initializePMHistory() {
  var sheetName = CONFIG.SHEET_NAMES.PM_HISTORY;
  var fields = CONFIG.PM_HISTORY_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var machines = [
    { name: 'CNC Milling Machine', dept: 'Spoke Production', sec: 'Spoke' },
    { name: 'CNC Turning Center', dept: 'Spoke Production', sec: 'Spoke' },
    { name: 'Hydraulic Press 100T', dept: 'Spoke Production', sec: 'Spoke' },
    { name: 'Screw Air Compressor', dept: 'Facility Maintenance', sec: 'Maintenance' },
    { name: 'Diesel Generator 500kVA', dept: 'Facility Maintenance', sec: 'Maintenance' },
    { name: 'Auto Plating Line', dept: 'Plating Line', sec: 'Auto Plating Line' },
    { name: 'Main Conveyor Belt', dept: 'Packing', sec: 'Spoke Packing' },
    { name: 'Steam Boiler', dept: 'Facility Maintenance', sec: 'Maintenance' },
    { name: 'Spiral Winding Machine', dept: 'Spiral Production', sec: 'Spiral' },
    { name: 'PVC Extrusion Machine', dept: 'PVC Production', sec: 'PVC' }
  ];
  var techs = ['Rajesh Kumar', 'Suresh Patel', 'Amit Singh', 'Vikram Sharma', 'Deepak Verma', 'Ravi Gupta'];
  var pmTypes = ['Daily Inspection', 'Weekly Maintenance', 'Monthly Overhaul', 'Quarterly Service', 'Annual Shutdown'];
  var statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed'];
  var sampleData = [];
  for (var i = 1; i <= 24; i++) {
    var mi = (i - 1) % machines.length;
    var ti = (i - 1) % techs.length;
    var pmi = (i - 1) % pmTypes.length;
    var pmNum = 'PM-H-' + String(i).padStart(3, '0');
    var title = pmTypes[pmi] + ' - ' + machines[mi].name;
    var compDate = new Date();
    compDate.setDate(compDate.getDate() - (30 - i * 1));
    var dueDate = new Date(compDate);
    dueDate.setDate(dueDate.getDate() - 1);
    var nextDue = new Date(compDate);
    if (pmi === 0) nextDue.setDate(nextDue.getDate() + 1);
    else if (pmi === 1) nextDue.setDate(nextDue.getDate() + 7);
    else if (pmi === 2) nextDue.setDate(nextDue.getDate() + 30);
    else if (pmi === 3) nextDue.setDate(nextDue.getDate() + 90);
    else nextDue.setDate(nextDue.getDate() + 365);
    var status = statuses[i - 1] || 'Completed';
    var remarks = ['Routine maintenance completed successfully.', 'All parameters within normal range.', 'Replaced worn components as per checklist.', 'Lubrication and filter change done.', 'Calibration completed, all readings OK.', 'Belt tension adjusted, alignment verified.'][ti];
    sampleData.push({
      PMNumber: pmNum,
      Title: title,
      MachineName: machines[mi].name,
      CompletionDate: formatDateISO(compDate),
      NextDueDate: formatDateISO(nextDue),
      TechnicianName: techs[ti],
      Status: status,
      Remarks: remarks,
      CreatedBy: 'tech@cmms.com',
      CreatedAt: formatDateTimeISO(compDate)
    });
  }
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeStockHistory() {
  var sheetName = CONFIG.SHEET_NAMES.STOCK_HISTORY;
  var fields = CONFIG.STOCK_HISTORY_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var parts = [
    { code: 'SP001', name: 'Spindle Bearing SKF 6205' },
    { code: 'SP002', name: 'Hydraulic Seal Kit HP-100' },
    { code: 'SP003', name: 'Air Filter Element GA-30' },
    { code: 'SP004', name: 'Hydraulic Oil ISO 68' },
    { code: 'SP005', name: 'V-Belt B-1600' },
    { code: 'SP006', name: 'Coolant Pump Impeller' },
    { code: 'SP007', name: 'Proximity Sensor M12' },
    { code: 'SP008', name: 'Emergency Stop Push Button' },
    { code: 'SP009', name: 'Oil Filter Element' },
    { code: 'SP010', name: 'Grease SKF LGHP 2/1' },
    { code: 'SP011', name: 'Motor Bearing 6205ZZ' },
    { code: 'SP012', name: 'Coolant Fluid 5L' },
    { code: 'SP013', name: 'Fuse 32A Cartridge' },
    { code: 'SP014', name: 'Pneumatic Cylinder 100mm' },
    { code: 'SP015', name: 'Solenoid Valve 5/2' },
    { code: 'SP016', name: 'Generator Battery 12V 200Ah' },
    { code: 'SP017', name: 'Conveyor Belt 500mm' },
    { code: 'SP018', name: 'PLC Module Input 16DI' },
    { code: 'SP019', name: 'Welding Electrode E6013' },
    { code: 'SP020', name: 'Cooling Tower Fan Blade' }
  ];
  var currentStock = {};
  parts.forEach(function(p) { currentStock[p.code] = 0; });
  var sampleData = [];
  var txnDates = [];
  for (var d = 0; d < 30; d++) {
    var dt = new Date();
    dt.setDate(dt.getDate() - (30 - d));
    txnDates.push(dt);
  }
  var movements = [
    { partIdx: 0, qty: 10, type: 'Goods Receipt', ref: 'GRN-000001', remark: 'Initial stock purchase', idx: 0 },
    { partIdx: 1, qty: 5, type: 'Goods Receipt', ref: 'GRN-000001', remark: 'Initial stock purchase', idx: 1 },
    { partIdx: 2, qty: 25, type: 'Goods Receipt', ref: 'GRN-000002', remark: 'Filter stock replenishment', idx: 2 },
    { partIdx: 3, qty: 120, type: 'Goods Receipt', ref: 'GRN-000002', remark: 'Bulk oil purchase', idx: 3 },
    { partIdx: 4, qty: 8, type: 'Goods Receipt', ref: 'GRN-000003', remark: 'Belt stock order', idx: 4 },
    { partIdx: 5, qty: 4, type: 'Goods Receipt', ref: 'GRN-000003', remark: 'Impeller purchase', idx: 5 },
    { partIdx: 6, qty: 15, type: 'Goods Receipt', ref: 'GRN-000004', remark: 'Sensor order', idx: 6 },
    { partIdx: 7, qty: 20, type: 'Goods Receipt', ref: 'GRN-000004', remark: 'E-stop button stock', idx: 7 },
    { partIdx: 0, qty: -2, type: 'Issue', ref: 'ISS-000001', remark: 'CNC spindle bearing replacement', idx: 8 },
    { partIdx: 8, qty: 12, type: 'Goods Receipt', ref: 'GRN-000005', remark: 'Oil filter replenishment', idx: 9 },
    { partIdx: 1, qty: -1, type: 'Issue', ref: 'ISS-000002', remark: 'Hydraulic press seal replacement', idx: 10 },
    { partIdx: 9, qty: 10, type: 'Goods Receipt', ref: 'GRN-000006', remark: 'Grease stock', idx: 11 },
    { partIdx: 10, qty: 18, type: 'Goods Receipt', ref: 'GRN-000006', remark: 'Bearing stock', idx: 12 },
    { partIdx: 3, qty: -20, type: 'Issue', ref: 'ISS-000003', remark: 'Hydraulic press oil change', idx: 13 },
    { partIdx: 2, qty: -3, type: 'Issue', ref: 'ISS-000004', remark: 'Compressor filter replacement', idx: 14 },
    { partIdx: 11, qty: 45, type: 'Goods Receipt', ref: 'GRN-000007', remark: 'Coolant fluid bulk order', idx: 15 },
    { partIdx: 4, qty: -1, type: 'Issue', ref: 'ISS-000005', remark: 'Compressor belt replacement', idx: 16 },
    { partIdx: 12, qty: 50, type: 'Goods Receipt', ref: 'GRN-000008', remark: 'Fuse stock', idx: 17 },
    { partIdx: 13, qty: 6, type: 'Goods Receipt', ref: 'GRN-000008', remark: 'Pneumatic cylinder order', idx: 18 },
    { partIdx: 5, qty: -1, type: 'Issue', ref: 'ISS-000006', remark: 'Coolant pump repair', idx: 19 },
    { partIdx: 6, qty: -3, type: 'Issue', ref: 'ISS-000007', remark: 'Sensor replacement on CNC', idx: 20 },
    { partIdx: 14, qty: 8, type: 'Goods Receipt', ref: 'GRN-000009', remark: 'Solenoid valve stock', idx: 21 },
    { partIdx: 7, qty: -5, type: 'Issue', ref: 'ISS-000008', remark: 'E-stop replacement on conveyor', idx: 22 },
    { partIdx: 15, qty: 2, type: 'Goods Receipt', ref: 'GRN-000010', remark: 'Generator battery order', idx: 23 },
    { partIdx: 8, qty: -2, type: 'Issue', ref: 'ISS-000009', remark: 'Oil filter change on press', idx: 24 },
    { partIdx: 16, qty: 20, type: 'Goods Receipt', ref: 'GRN-000010', remark: 'Conveyor belt stock', idx: 25 },
    { partIdx: 0, qty: -1, type: 'Issue', ref: 'ISS-000010', remark: 'Additional bearing replacement', idx: 26 },
    { partIdx: 9, qty: -3, type: 'Issue', ref: 'ISS-000011', remark: 'Bearing greasing', idx: 27 },
    { partIdx: 17, qty: 2, type: 'Goods Receipt', ref: 'GRN-000011', remark: 'PLC module order', idx: 28 },
    { partIdx: 3, qty: -30, type: 'Issue', ref: 'ISS-000012', remark: 'Plating line hydraulic oil refill', idx: 29 },
    { partIdx: 11, qty: -10, type: 'Issue', ref: 'ISS-000013', remark: 'CNC machine coolant top-up', idx: 30 },
    { partIdx: 18, qty: 15, type: 'Goods Receipt', ref: 'GRN-000011', remark: 'Welding electrode stock', idx: 31 },
    { partIdx: 10, qty: -3, type: 'Issue', ref: 'ISS-000014', remark: 'Motor bearing replacement', idx: 32 },
    { partIdx: 19, qty: 2, type: 'Goods Receipt', ref: 'GRN-000012', remark: 'Fan blade set order', idx: 33 },
    { partIdx: 12, qty: -5, type: 'Issue', ref: 'ISS-000015', remark: 'Control panel fuse replacement', idx: 34 }
  ];
  movements.forEach(function(m) {
    var p = parts[m.partIdx];
    var before = currentStock[p.code] || 0;
    var after = before + m.qty;
    if (after < 0) return;
    currentStock[p.code] = after;
    sampleData.push({
      PartCode: p.code,
      PartName: p.name,
      TransactionType: m.type,
      Quantity: m.qty,
      BalanceBefore: before,
      BalanceAfter: after,
      ReferenceNo: m.ref,
      Remarks: m.remark,
      CreatedBy: 'store@cmms.com',
      CreatedAt: formatDateTimeISO(txnDates[m.idx >= txnDates.length ? (m.idx % txnDates.length) : m.idx])
    });
  });
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeInventoryTransactions() {
  var sheetName = CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS;
  var fields = CONFIG.INVENTORY_TRANSACTION_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var parts = [
    { code: 'SP001', name: 'Spindle Bearing SKF 6205', cost: 150 },
    { code: 'SP002', name: 'Hydraulic Seal Kit HP-100', cost: 850 },
    { code: 'SP003', name: 'Air Filter Element GA-30', cost: 250 },
    { code: 'SP004', name: 'Hydraulic Oil ISO 68', cost: 180 },
    { code: 'SP005', name: 'V-Belt B-1600', cost: 450 },
    { code: 'SP006', name: 'Coolant Pump Impeller', cost: 1200 },
    { code: 'SP007', name: 'Proximity Sensor M12', cost: 350 },
    { code: 'SP008', name: 'Emergency Stop Push Button', cost: 180 },
    { code: 'SP009', name: 'Oil Filter Element', cost: 320 },
    { code: 'SP010', name: 'Grease SKF LGHP 2/1', cost: 650 },
    { code: 'SP011', name: 'Motor Bearing 6205ZZ', cost: 120 },
    { code: 'SP012', name: 'Coolant Fluid 5L', cost: 95 },
    { code: 'SP013', name: 'Fuse 32A Cartridge', cost: 25 },
    { code: 'SP014', name: 'Pneumatic Cylinder 100mm', cost: 2800 },
    { code: 'SP015', name: 'Solenoid Valve 5/2', cost: 1500 },
    { code: 'SP016', name: 'Generator Battery 12V 200Ah', cost: 4500 },
    { code: 'SP017', name: 'Conveyor Belt 500mm', cost: 750 },
    { code: 'SP018', name: 'PLC Module Input 16DI', cost: 8500 },
    { code: 'SP019', name: 'Welding Electrode E6013', cost: 120 },
    { code: 'SP020', name: 'Cooling Tower Fan Blade', cost: 3500 }
  ];
  var txnDates = [];
  for (var d = 0; d < 30; d++) {
    var dt = new Date();
    dt.setDate(dt.getDate() - (30 - d));
    txnDates.push(dt);
  }
  var types = ['Goods Receipt', 'Issue', 'Return', 'Transfer', 'Adjustment'];
  var transData = [
    { type: 'Goods Receipt', pIdx: 0, qty: 10, ref: 'GRN-000001', refType: 'GRN', from: '', to: 'Store A', remark: 'Initial stock purchase - Bearings' },
    { type: 'Goods Receipt', pIdx: 1, qty: 5, ref: 'GRN-000001', refType: 'GRN', from: '', to: 'Store A', remark: 'Initial stock purchase - Seal kits' },
    { type: 'Goods Receipt', pIdx: 2, qty: 25, ref: 'GRN-000002', refType: 'GRN', from: '', to: 'Store B', remark: 'Air filter replenishment' },
    { type: 'Goods Receipt', pIdx: 3, qty: 120, ref: 'GRN-000002', refType: 'GRN', from: '', to: 'Store C', remark: 'Hydraulic oil bulk purchase' },
    { type: 'Goods Receipt', pIdx: 4, qty: 8, ref: 'GRN-000003', refType: 'GRN', from: '', to: 'Store B', remark: 'V-belt stock order' },
    { type: 'Issue', pIdx: 0, qty: -2, ref: 'JC-2025-001', refType: 'Job Card', from: 'Store A', to: '', remark: 'CNC spindle bearing replacement' },
    { type: 'Issue', pIdx: 1, qty: -1, ref: 'JC-2025-002', refType: 'Job Card', from: 'Store A', to: '', remark: 'Hydraulic press seal replacement' },
    { type: 'Issue', pIdx: 3, qty: -20, ref: 'JC-2025-002', refType: 'Job Card', from: 'Store C', to: '', remark: 'Hydraulic oil change - press' },
    { type: 'Issue', pIdx: 5, qty: -2, ref: 'JC-2025-003', refType: 'Job Card', from: 'Store A', to: '', remark: 'Coolant pump impeller replacement' },
    { type: 'Goods Receipt', pIdx: 5, qty: 4, ref: 'GRN-000003', refType: 'GRN', from: '', to: 'Store A', remark: 'Impeller spare stock' },
    { type: 'Return', pIdx: 5, qty: 1, ref: 'RTN-000001', refType: 'Return', from: 'Workshop', to: 'Store A', remark: 'Unused impeller returned' },
    { type: 'Transfer', pIdx: 3, qty: 20, ref: 'TRF-000001', refType: 'Transfer', from: 'Store C', to: 'Store A', remark: 'Oil transferred for daily use' },
    { type: 'Adjustment', pIdx: 0, qty: 1, ref: 'ADJ-000001', refType: 'Adjustment', from: '', to: '', remark: 'Stock count adjustment - found extra' },
    { type: 'Issue', pIdx: 6, qty: -3, ref: 'JC-2025-004', refType: 'Job Card', from: 'Store A', to: '', remark: 'Sensor replacement on CNC' },
    { type: 'Issue', pIdx: 7, qty: -5, ref: 'PM-2025-001', refType: 'PM', from: 'Store B', to: '', remark: 'E-stop replacement conveyor' },
    { type: 'Goods Receipt', pIdx: 6, qty: 15, ref: 'GRN-000004', refType: 'GRN', from: '', to: 'Store A', remark: 'Sensor stock replenishment' },
    { type: 'Goods Receipt', pIdx: 7, qty: 20, ref: 'GRN-000004', refType: 'GRN', from: '', to: 'Store B', remark: 'E-stop button stock' },
    { type: 'Transfer', pIdx: 7, qty: 10, ref: 'TRF-000002', refType: 'Transfer', from: 'Store B', to: 'Workshop', remark: 'Stock transfer to workshop' },
    { type: 'Issue', pIdx: 11, qty: -10, ref: 'JC-2025-005', refType: 'Job Card', from: 'Store C', to: '', remark: 'CNC coolant top-up' },
    { type: 'Adjustment', pIdx: 12, qty: -5, ref: 'ADJ-000002', refType: 'Adjustment', from: '', to: '', remark: 'Damaged fuses written off' },
    { type: 'Goods Receipt', pIdx: 12, qty: 50, ref: 'GRN-000008', refType: 'GRN', from: '', to: 'Store B', remark: 'Fuse stock replenishment' },
    { type: 'Issue', pIdx: 10, qty: -3, ref: 'JC-2025-006', refType: 'Job Card', from: 'Store A', to: '', remark: 'Motor bearing replacement' },
    { type: 'Return', pIdx: 10, qty: 1, ref: 'RTN-000002', refType: 'Return', from: 'Workshop', to: 'Store A', remark: 'Wrong size bearing returned' },
    { type: 'Transfer', pIdx: 10, qty: 5, ref: 'TRF-000003', refType: 'Transfer', from: 'Store A', to: 'Store B', remark: 'Stock redistribution' },
    { type: 'Adjustment', pIdx: 16, qty: -2, ref: 'ADJ-000003', refType: 'Adjustment', from: '', to: '', remark: 'Damaged belt section removed' }
  ];
  var sampleData = [];
  transData.forEach(function(t, idx) {
    var p = parts[t.pIdx];
    var qty = t.qty;
    var cost = p.cost;
    var total = Math.abs(qty) * cost;
    var tid = t.type === 'Goods Receipt' ? '' : 'TXN-' + String(idx + 1).padStart(6, '0');
    if (t.type === 'Goods Receipt') {
      tid = t.ref;
    }
    sampleData.push({
      TransactionID: tid,
      TransactionType: t.type,
      PartCode: p.code,
      PartName: p.name,
      Quantity: qty,
      ReferenceNo: t.ref,
      ReferenceType: t.refType,
      FromLocation: t.from,
      ToLocation: t.to,
      UnitCost: cost,
      TotalCost: total,
      Remarks: t.remark,
      ProcessedBy: 'store@cmms.com',
      ProcessedAt: formatDateTimeISO(txnDates[idx >= txnDates.length ? (idx % txnDates.length) : idx]),
      CreatedBy: 'store@cmms.com',
      CreatedAt: formatDateTimeISO(txnDates[idx >= txnDates.length ? (idx % txnDates.length) : idx])
    });
  });
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeGoodsReceipt() {
  var sheetName = CONFIG.SHEET_NAMES.GOODS_RECEIPT;
  var fields = CONFIG.GOODS_RECEIPT_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = getCurrentTimestamp();
  var grnDates = [];
  for (var d = 0; d < 15; d++) {
    var dt = new Date();
    dt.setDate(dt.getDate() - (15 - d));
    grnDates.push(dt);
  }
  var grns = [
    { grn: 'GRN-000001', supplier: 'SKF India Pvt Ltd', invoice: 'INV-SKF-001', po: 'PO-2025-001', pCode: 'SP001', pName: 'Spindle Bearing SKF 6205', qty: 10, rate: 150 },
    { grn: 'GRN-000001', supplier: 'SKF India Pvt Ltd', invoice: 'INV-SKF-001', po: 'PO-2025-001', pCode: 'SP011', pName: 'Motor Bearing 6205ZZ', qty: 18, rate: 120 },
    { grn: 'GRN-000002', supplier: 'Atlas Copco India', invoice: 'INV-AC-001', po: 'PO-2025-002', pCode: 'SP003', pName: 'Air Filter Element GA-30', qty: 25, rate: 250 },
    { grn: 'GRN-000002', supplier: 'Atlas Copco India', invoice: 'INV-AC-001', po: 'PO-2025-002', pCode: 'SP005', pName: 'V-Belt B-1600', qty: 8, rate: 450 },
    { grn: 'GRN-000003', supplier: 'Shell India', invoice: 'INV-SHL-001', po: 'PO-2025-003', pCode: 'SP004', pName: 'Hydraulic Oil ISO 68', qty: 120, rate: 180 },
    { grn: 'GRN-000003', supplier: 'Shell India', invoice: 'INV-SHL-001', po: 'PO-2025-003', pCode: 'SP010', pName: 'Grease SKF LGHP 2/1', qty: 10, rate: 650 },
    { grn: 'GRN-000004', supplier: 'Parker Hannifin India', invoice: 'INV-PH-001', po: 'PO-2025-004', pCode: 'SP002', pName: 'Hydraulic Seal Kit HP-100', qty: 5, rate: 850 },
    { grn: 'GRN-000005', supplier: 'Donaldson India', invoice: 'INV-DON-001', po: 'PO-2025-005', pCode: 'SP009', pName: 'Oil Filter Element', qty: 12, rate: 320 },
    { grn: 'GRN-000006', supplier: 'Gates India', invoice: 'INV-GAT-001', po: 'PO-2025-006', pCode: 'SP017', pName: 'Conveyor Belt 500mm', qty: 20, rate: 750 },
    { grn: 'GRN-000007', supplier: 'Omron India', invoice: 'INV-OMR-001', po: 'PO-2025-007', pCode: 'SP007', pName: 'Proximity Sensor M12', qty: 15, rate: 350 },
    { grn: 'GRN-000007', supplier: 'Omron India', invoice: 'INV-OMR-001', po: 'PO-2025-007', pCode: 'SP008', pName: 'Emergency Stop Push Button', qty: 20, rate: 180 },
    { grn: 'GRN-000008', supplier: 'Siemens India', invoice: 'INV-SIE-001', po: 'PO-2025-008', pCode: 'SP013', pName: 'Fuse 32A Cartridge', qty: 50, rate: 25 },
    { grn: 'GRN-000008', supplier: 'Siemens India', invoice: 'INV-SIE-001', po: 'PO-2025-008', pCode: 'SP018', pName: 'PLC Module Input 16DI', qty: 2, rate: 8500 },
    { grn: 'GRN-000009', supplier: 'Festo India', invoice: 'INV-FES-001', po: 'PO-2025-009', pCode: 'SP014', pName: 'Pneumatic Cylinder 100mm', qty: 6, rate: 2800 },
    { grn: 'GRN-000009', supplier: 'Festo India', invoice: 'INV-FES-001', po: 'PO-2025-009', pCode: 'SP015', pName: 'Solenoid Valve 5/2', qty: 8, rate: 1500 },
    { grn: 'GRN-000010', supplier: 'Exide India', invoice: 'INV-EXI-001', po: 'PO-2025-010', pCode: 'SP016', pName: 'Generator Battery 12V 200Ah', qty: 2, rate: 4500 },
    { grn: 'GRN-000011', supplier: 'Castrol India', invoice: 'INV-CAS-001', po: 'PO-2025-011', pCode: 'SP012', pName: 'Coolant Fluid 5L', qty: 45, rate: 95 },
    { grn: 'GRN-000012', supplier: 'ESAB India', invoice: 'INV-ESAB-001', po: 'PO-2025-012', pCode: 'SP019', pName: 'Welding Electrode E6013', qty: 15, rate: 120 },
    { grn: 'GRN-000013', supplier: 'Paharpur Cooling Towers', invoice: 'INV-PAH-001', po: 'PO-2025-013', pCode: 'SP020', pName: 'Cooling Tower Fan Blade', qty: 2, rate: 3500 },
    { grn: 'GRN-000014', supplier: 'Kirloskar Brothers', invoice: 'INV-KIR-001', po: 'PO-2025-014', pCode: 'SP006', pName: 'Coolant Pump Impeller', qty: 4, rate: 1200 }
  ];
  var sampleData = [];
  var receivedBy = ['store@cmms.com', 'admin@cmms.com', 'manager@cmms.com'];
  grns.forEach(function(g, idx) {
    var dt = grnDates[idx % grnDates.length];
    var amount = g.qty * g.rate;
    sampleData.push({
      GRNNo: g.grn,
      PartCode: g.pCode,
      PartName: g.pName,
      Quantity: g.qty,
      UnitCost: g.rate,
      TotalCost: amount,
      Supplier: g.supplier,
      InvoiceNo: g.invoice,
      PONo: g.po,
      ReceivedBy: receivedBy[idx % receivedBy.length],
      ReceivedDate: formatDateISO(dt),
      Remarks: 'Goods received in good condition.',
      Status: 'Received',
      CreatedBy: receivedBy[idx % receivedBy.length],
      CreatedAt: formatDateTimeISO(dt),
      UpdatedBy: receivedBy[idx % receivedBy.length],
      UpdatedAt: formatDateTimeISO(dt)
    });
  });
  insertRows(sheet, fields, sampleData);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleData.length + ' records.', records: sampleData.length };
}

function initializeNotifications() {
  var sheetName = CONFIG.SHEET_NAMES.NOTIFICATIONS;
  var fields = CONFIG.NOTIFICATION_FIELDS;
  var sheet = ensureSheet(sheetName, fields);
  if (!sheet) return { status: 'error', message: 'Could not access sheet: ' + sheetName };
  if (hasDataRows(sheet)) return { status: 'skipped', message: 'Sample data already exists.' };
  var now = new Date();
  var pad = function(n) { return String(n).padStart(2, '0'); };
  var ts = function(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  var sampleData = [
    { notif: 'NOTIF-000001', type: 'PMDue', title: 'PM Due: CNC Milling Machine', message: 'Daily Inspection - CNC Milling Machine is due for maintenance. Schedule the technician.', refType: 'PM', refNo: 'PM-H-005', priority: 'High', status: 'Active', email: 'manager@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000002', type: 'PMOverdue', title: 'PM Overdue: Screw Air Compressor', message: 'Weekly Maintenance - Screw Air Compressor is overdue by 2 days. Immediate attention required.', refType: 'PM', refNo: 'PM-H-008', priority: 'Critical', status: 'Active', email: 'manager@cmms.com', read: 'Unread', days: 2 },
    { notif: 'NOTIF-000003', type: 'LowStock', title: 'Low Stock Alert: V-Belt B-1600', message: 'Current stock of V-Belt B-1600 (SP005) is 2 units, below reorder level of 6. Please place order.', refType: 'SparePart', refNo: 'SP005', priority: 'High', status: 'Active', email: 'store@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000004', type: 'Breakdown', title: 'Breakdown: Hydraulic Press 100T', message: 'Hydraulic Press 100T reported breakdown - pressure loss. Job card JC-2025-002 created.', refType: 'JobCard', refNo: 'JC-2025-002', priority: 'Critical', status: 'Active', email: 'admin@cmms.com', read: 'Unread', days: 1 },
    { notif: 'NOTIF-000005', type: 'PendingJobCard', title: 'Pending Job Card: CNC Coolant Issue', message: 'Job card JC-2025-005 for CNC coolant pump issue is pending assignment.', refType: 'JobCard', refNo: 'JC-2025-005', priority: 'Medium', status: 'Active', email: 'supervisor@cmms.com', read: 'Read', days: 3 },
    { notif: 'NOTIF-000006', type: 'WaitingApproval', title: 'Job Card Awaiting Approval', message: 'Job card JC-2025-001 (CNC bearing replacement) is awaiting approval.', refType: 'JobCard', refNo: 'JC-2025-001', priority: 'Medium', status: 'Active', email: 'admin@cmms.com', read: 'Unread', days: 1 },
    { notif: 'NOTIF-000007', type: 'LowStock', title: 'Stock Reorder: Hydraulic Seal Kit', message: 'Hydraulic Seal Kit HP-100 (SP002) stock is 3. Reorder level is 5. Initiate purchase.', refType: 'SparePart', refNo: 'SP002', priority: 'High', status: 'Active', email: 'store@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000008', type: 'PMDue', title: 'PM Due: Diesel Generator', message: 'Monthly Test - Diesel Generator 500kVA scheduled for maintenance tomorrow.', refType: 'PM', refNo: 'PM-H-012', priority: 'Medium', status: 'Active', email: 'tech@cmms.com', read: 'Read', days: 1 },
    { notif: 'NOTIF-000009', type: 'InventoryUpdated', title: 'Stock Updated: GRN-000003', message: 'Goods receipt GRN-000003 processed. 120L Hydraulic Oil ISO 68 added to Store C.', refType: 'GRN', refNo: 'GRN-000003', priority: 'Low', status: 'Active', email: 'store@cmms.com', read: 'Read', days: 5 },
    { notif: 'NOTIF-000010', type: 'PendingJobCard', title: 'Job Started: Hydraulic Press Repair', message: 'Job card JC-2025-002 has been started by Rajesh Kumar.', refType: 'JobCard', refNo: 'JC-2025-002', priority: 'Low', status: 'Active', email: 'supervisor@cmms.com', read: 'Read', days: 1 },
    { notif: 'NOTIF-000011', type: 'LowStock', title: 'Low Stock Alert: Oil Filter Element', message: 'Oil Filter Element (SP009) stock at 2 units. Reorder level is 8. Place urgent order.', refType: 'SparePart', refNo: 'SP009', priority: 'High', status: 'Active', email: 'store@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000012', type: 'PMOverdue', title: 'PM Overdue: Auto Plating Line', message: 'Monthly Overhaul - Auto Plating Line is 3 days overdue. Schedule immediately.', refType: 'PM', refNo: 'PM-H-015', priority: 'Critical', status: 'Active', email: 'manager@cmms.com', read: 'Unread', days: 3 },
    { notif: 'NOTIF-000013', type: 'Breakdown', title: 'Machine Breakdown: Main Conveyor Belt', message: 'Main Conveyor Belt stopped - emergency stop activated. Investigating root cause.', refType: 'JobCard', refNo: 'JC-2025-007', priority: 'Critical', status: 'Active', email: 'admin@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000014', type: 'InventoryUpdated', title: 'Stock Transfer Completed', message: '10 units of Emergency Stop Button transferred from Store B to Workshop.', refType: 'Transfer', refNo: 'TRF-000002', priority: 'Low', status: 'Active', email: 'store@cmms.com', read: 'Read', days: 4 },
    { notif: 'NOTIF-000015', type: 'WaitingApproval', title: 'Job Card Completed: Gen Test', message: 'Job card JC-2025-008 (Generator test run) completed and awaiting approval.', refType: 'JobCard', refNo: 'JC-2025-008', priority: 'Low', status: 'Active', email: 'admin@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000016', type: 'PMDue', title: 'PM Due: Spiral Winding Machine', message: 'Quarterly Service - Spiral Winding Machine due in 7 days.', refType: 'PM', refNo: 'PM-H-020', priority: 'Medium', status: 'Active', email: 'tech@cmms.com', read: 'Unread', days: 7 },
    { notif: 'NOTIF-000017', type: 'LowStock', title: 'Stock Alert: Conveyor Belt 500mm', message: 'Conveyor Belt 500mm (SP017) stock is 18, approaching reorder level of 15.', refType: 'SparePart', refNo: 'SP017', priority: 'Low', status: 'Active', email: 'store@cmms.com', read: 'Read', days: 2 },
    { notif: 'NOTIF-000018', type: 'PendingJobCard', title: 'New Job Card Created', message: 'Job card JC-2025-009 opened for Steam Boiler pressure gauge replacement.', refType: 'JobCard', refNo: 'JC-2025-009', priority: 'High', status: 'Active', email: 'supervisor@cmms.com', read: 'Unread', days: 0 },
    { notif: 'NOTIF-000019', type: 'InventoryUpdated', title: 'Stock Adjustment: Fuse 32A', message: 'Stock adjustment ADJ-000002: 5 units of Fuse 32A Cartridge written off as damaged.', refType: 'Adjustment', refNo: 'ADJ-000002', priority: 'Low', status: 'Active', email: 'store@cmms.com', read: 'Read', days: 6 },
    { notif: 'NOTIF-000020', type: 'PMDue', title: 'PM Due: PVC Extrusion Machine', message: 'Monthly Overhaul - PVC Extrusion Machine due for maintenance.', refType: 'PM', refNo: 'PM-H-022', priority: 'Medium', status: 'Active', email: 'tech@cmms.com', read: 'Unread', days: 5 }
  ];
  var sampleRows = [];
  sampleData.forEach(function(n) {
    var d = new Date();
    d.setDate(d.getDate() - n.days);
    sampleRows.push({
      NotificationID: n.notif,
      Type: n.type,
      Title: n.title,
      Message: n.message,
      ReferenceType: n.refType,
      ReferenceNo: n.refNo,
      Priority: n.priority,
      Status: n.status,
      RecipientEmail: n.email,
      ReadStatus: n.read,
      CreatedAt: ts(d)
    });
  });
  insertRows(sheet, fields, sampleRows);
  formatSheet(sheet, fields);
  return { status: 'success', message: sheetName + ' initialized with ' + sampleRows.length + ' records.', records: sampleRows.length };
}

function initializeAllTransactionSampleData() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Initialize Transaction Sample Data',
    'This will insert sample data into ALL transaction tables. Existing data will not be overwritten.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;
  var results = [];
  var fns = [
    { name: 'PM History', fn: initializePMHistory },
    { name: 'Stock History', fn: initializeStockHistory },
    { name: 'Inventory Transactions', fn: initializeInventoryTransactions },
    { name: 'Goods Receipt', fn: initializeGoodsReceipt },
    { name: 'Notifications', fn: initializeNotifications }
  ];
  fns.forEach(function(item) {
    try {
      var result = item.fn();
      results.push({ table: item.name, status: result.status, message: result.message, records: result.records || 0 });
      Logger.log(item.name + ': ' + result.message);
    } catch (e) {
      results.push({ table: item.name, status: 'error', message: e.message, records: 0 });
      Logger.log(item.name + ' ERROR: ' + e.message);
    }
  });
  var msg = 'Transaction sample data initialization complete:\n';
  var inserted = 0;
  results.forEach(function(r) {
    msg += '\n' + r.table + ': ' + r.message;
    if (r.status === 'success') inserted += r.records;
  });
  msg += '\n\nTotal records inserted: ' + inserted;
  ui.alert('Transaction Data Init Complete', msg, ui.ButtonSet.OK);
  notifyFrontendRefresh();
  return results;
}

function formatDateISO(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
