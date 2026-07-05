var CONFIG = {
  SHEET_NAMES: {
    USERS: 'Users',
    MACHINES: 'Machines',
    ASSETS: 'Assets',
    DEPARTMENTS: 'Departments',
    SECTIONS: 'Sections',
    TECHNICIANS: 'Technicians',
    JOBCARDS: 'JobCards',
    CHECKLISTS: 'Checklists',
    CHECKLIST_TEMPLATES: 'ChecklistTemplates',
    PREVENTIVE_MAINTENANCE: 'PreventiveMaintenance',
    SPARE_PARTS: 'SpareParts',
    REPORTS: 'Reports',
    SETTINGS: 'Settings',
    LOGS: 'Logs',
    DASHBOARD: 'Dashboard'
  },

  STATUS: {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    OPEN: 'Open',
    RUNNING: 'Running',
    IN_PROGRESS: 'In Progress',
    WAITING: 'Waiting',
    CLOSED: 'Closed',
    COMPLETED: 'Completed',
    PENDING: 'Pending',
    SCHEDULED: 'Scheduled',
    OVERDUE: 'Overdue',
    UNDER_MAINTENANCE: 'Under Maintenance',
    ON_LEAVE: 'On Leave',
    RETIRED: 'Retired',
    DRAFT: 'Draft'
  },

  PRIORITY: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical'
  },

  ROLES: {
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    TECHNICIAN: 'Technician',
    PRODUCTION: 'Production',
    STORE: 'Store'
  },

  SHIFT: {
    GENERAL: 'General',
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    NIGHT: 'Night',
    ROTATING: 'Rotating'
  },

  CRITICALITY_LEVELS: ['Critical', 'High', 'Medium', 'Low'],

  MACHINE_TYPES: [
    'CNC', 'Hydraulic', 'Pneumatic', 'Electrical', 'Mechanical',
    'Robotic', 'Conveyor', 'Pump', 'Compressor', 'Generator', 'Other'
  ],

  ASSET_TYPES: ['Equipment', 'Tooling', 'Instrument', 'Fixture', 'Vehicle', 'Building', 'Infrastructure', 'Other'],
  ASSET_CATEGORIES: ['Production', 'Utility', 'Safety', 'Quality', 'IT', 'Facility'],
  ASSET_SUBCATEGORIES: ['Electrical', 'Mechanical', 'Hydraulic', 'Pneumatic', 'Electronic', 'Structural'],

  BREAKDOWN_TYPES: [
    'Mechanical Failure', 'Electrical Fault', 'Hydraulic Leak', 'Pneumatic Issue',
    'Software Glitch', 'Sensor Malfunction', 'Wear & Tear', 'Operator Error',
    'Overload', 'Vibration', 'Overheating', 'Other'
  ],

  MAINTENANCE_TEAMS: [
    'Mechanical Team', 'Electrical Team', 'Hydraulic Team', 'Pneumatic Team',
    'Electronics Team', 'General Maintenance'
  ],

  SKILLS: [
    'Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic',
    'Electronics', 'Multi-Skill'
  ],

  CHECKLIST_CATEGORIES: [
    'Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic',
    'Safety', 'Quality', 'Daily', 'Weekly', 'Monthly'
  ],

  UNITS: ['Pcs', 'Kg', 'Liter', 'Meter', 'Set', 'Box'],

  ID_PREFIXES: {
    ASSET: 'AST',
    MACHINE: 'MCH',
    DEPARTMENT: 'DEPT',
    JOBCARD: 'JC',
    CHECKLIST_TEMPLATE: 'CT',
    CHECKLIST: 'CL',
    PM: 'PM',
    SPARE_PART: 'SP',
    SECTION: 'SEC'
  },

  PAGE_SIZE: 10,

  APP_NAME: 'CMMS - Factory Maintenance Management System',

  PROFILE_FIELDS: ['Department', 'Designation'],

  JOBCARD_FIELDS: [
    'JobCardNo', 'DateTime', 'Section', 'Department', 'Machine', 'AssetID',
    'ComplaintCategory', 'ComplaintDescription', 'Priority', 'ComplaintBy',
    'AssignedTechnician', 'Status', 'OpenTime', 'StartTime', 'CloseTime',
    'WaitingTime', 'WorkingTime', 'BreakdownTime',
    'FaultImage', 'RepairImage', 'Remarks',
    'ApprovedBy', 'ApprovedDateTime', 'ApprovalStatus', 'ApprovalRemarks',
    'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  PERMISSION_FIELDS: [
    'CanOpenJobCard', 'CanStartJobCard', 'CanCloseJobCard', 'CanApproveJobCard',
    'CanManageMachines', 'CanManageAssets', 'CanManageSpareParts', 'CanManagePM',
    'CanManageTechnicians', 'CanManageDepartments', 'CanManageSections', 'CanManageUsers',
    'CanViewDashboard', 'CanViewReports', 'IsAdmin'
  ],

  USER_FIELDS: [
    'UserID', 'EmployeeID', 'Name', 'Email', 'Password', 'Mobile',
    'Department', 'Section', 'Designation', 'Role', 'Status',
    'CanOpenJobCard', 'CanStartJobCard', 'CanCloseJobCard', 'CanApproveJobCard',
    'CanManageMachines', 'CanManageAssets', 'CanManageSpareParts', 'CanManagePM',
    'CanManageTechnicians', 'CanManageDepartments', 'CanManageSections', 'CanManageUsers',
    'CanViewDashboard', 'CanViewReports', 'IsAdmin',
    'LastLogin', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  USER_ROLES: ['Admin', 'Department Manager', 'Maintenance Manager', 'Supervisor', 'Technician', 'Operator', 'Viewer'],

  DEFAULT_USERS: [
    { UserID: 'USR001', EmployeeID: 'EMP-ADM', Name: 'Administrator', Email: 'admin@cmms.com', Password: 'admin123', Mobile: '9876543200', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'System Administrator', Role: 'Admin', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'TRUE', CanManageMachines: 'TRUE', CanManageAssets: 'TRUE', CanManageSpareParts: 'TRUE', CanManagePM: 'TRUE', CanManageTechnicians: 'TRUE', CanManageDepartments: 'TRUE', CanManageSections: 'TRUE', CanManageUsers: 'TRUE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', IsAdmin: 'TRUE' },
    { UserID: 'USR002', EmployeeID: 'EMP-MGR', Name: 'Maintenance Manager', Email: 'manager@cmms.com', Password: 'mgr123', Mobile: '9876543201', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Department Manager', Role: 'Department Manager', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'TRUE', CanManageMachines: 'TRUE', CanManageAssets: 'TRUE', CanManageSpareParts: 'TRUE', CanManagePM: 'TRUE', CanManageTechnicians: 'TRUE', CanManageDepartments: 'TRUE', CanManageSections: 'TRUE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', IsAdmin: 'FALSE' },
    { UserID: 'USR003', EmployeeID: 'EMP-SUP', Name: 'Supervisor User', Email: 'supervisor@cmms.com', Password: 'super123', Mobile: '9876543202', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Maintenance Supervisor', Role: 'Supervisor', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'TRUE', CanManageMachines: 'TRUE', CanManageAssets: 'TRUE', CanManageSpareParts: 'FALSE', CanManagePM: 'TRUE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', IsAdmin: 'FALSE' },
    { UserID: 'USR004', EmployeeID: 'EMP-TEC', Name: 'Technician User', Email: 'tech@cmms.com', Password: 'tech123', Mobile: '9876543203', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Maintenance Technician', Role: 'Technician', Status: 'Active', CanOpenJobCard: 'FALSE', CanStartJobCard: 'TRUE', CanCloseJobCard: 'TRUE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'FALSE', IsAdmin: 'FALSE' },
    { UserID: 'USR005', EmployeeID: 'EMP-OPR', Name: 'Operator User', Email: 'operator@cmms.com', Password: 'oper123', Mobile: '9876543204', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Production Operator', Role: 'Operator', Status: 'Active', CanOpenJobCard: 'TRUE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'FALSE', IsAdmin: 'FALSE' },
    { UserID: 'USR006', EmployeeID: 'EMP-VWR', Name: 'Viewer User', Email: 'viewer@cmms.com', Password: 'view123', Mobile: '9876543205', Department: 'Facility Maintenance', Section: 'Maintenance', Designation: 'Viewer', Role: 'Viewer', Status: 'Active', CanOpenJobCard: 'FALSE', CanStartJobCard: 'FALSE', CanCloseJobCard: 'FALSE', CanApproveJobCard: 'FALSE', CanManageMachines: 'FALSE', CanManageAssets: 'FALSE', CanManageSpareParts: 'FALSE', CanManagePM: 'FALSE', CanManageTechnicians: 'FALSE', CanManageDepartments: 'FALSE', CanManageSections: 'FALSE', CanManageUsers: 'FALSE', CanViewDashboard: 'TRUE', CanViewReports: 'TRUE', IsAdmin: 'FALSE' }
  ],

  DEFAULT_DEPARTMENTS: [
    { Department: 'Admin', DepartmentCode: 'ADM', SectionID: 'SEC001', Section: 'Admin', DepartmentHead: 'Admin Head', Description: 'Administration Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'Spoke Production', DepartmentCode: 'SPR', SectionID: 'SEC002', Section: 'Spoke', DepartmentHead: 'Spoke Manager', Description: 'Spoke Production Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'Plating Line', DepartmentCode: 'PLT', SectionID: 'SEC003', Section: 'Auto Plating Line', DepartmentHead: 'Plating Supervisor', Description: 'Auto Plating Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'Nipple Production', DepartmentCode: 'NPL', SectionID: 'SEC004', Section: 'Nipple', DepartmentHead: 'Nipple Manager', Description: 'Nipple Production Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'Packing', DepartmentCode: 'PCK', SectionID: 'SEC005', Section: 'Spoke Packing', DepartmentHead: 'Packing Supervisor', Description: 'Packing Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'Spiral Production', DepartmentCode: 'SPL', SectionID: 'SEC006', Section: 'Spiral', DepartmentHead: 'Spiral Manager', Description: 'Spiral Production Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'PVC Production', DepartmentCode: 'PVC', SectionID: 'SEC007', Section: 'PVC', DepartmentHead: 'PVC Manager', Description: 'PVC Production Department', SundayOff: 'Sunday', HoursPerDay: '8' },
    { Department: 'Facility Maintenance', DepartmentCode: 'MNT', SectionID: 'SEC008', Section: 'Maintenance', DepartmentHead: 'Maintenance Head', Description: 'Facility Maintenance Department', SundayOff: 'Sunday', HoursPerDay: '8' }
  ],

  SECTION_FIELDS: [
    'SectionID', 'Section', 'Description', 'Status', 'CreatedBy', 'CreatedAt',
    'SundayOff', 'HoursPerDay', 'SectionCode', 'DepartmentCount', 'UpdatedBy', 'UpdatedAt'
  ],

  DEFAULT_SECTIONS: [
    { Section: 'Admin', SectionCode: 'ADM', Description: 'Administration', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'Spoke', SectionCode: 'SPK', Description: 'Spoke Production', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'Auto Plating Line', SectionCode: 'APL', Description: 'Auto Plating', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'Nipple', SectionCode: 'NPL', Description: 'Nipple Production', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'Spoke Packing', SectionCode: 'SPP', Description: 'Packing', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'Spiral', SectionCode: 'SPR', Description: 'Spiral Line', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'PVC', SectionCode: 'PVC', Description: 'PVC Line', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' },
    { Section: 'Maintenance', SectionCode: 'MNT', Description: 'Maintenance Department', SundayOff: 'Sunday', HoursPerDay: '8', DepartmentCount: '1' }
  ],

  DEPARTMENT_FIELDS: [
    'DepartmentID', 'Department', 'DepartmentCode', 'SectionID', 'Section',
    'DepartmentHead', 'Description', 'SundayOff', 'HoursPerDay', 'Status',
    'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  MACHINE_FIELDS: [
    'MachineID', 'MachineCode', 'MachineName', 'MachineNumber', 'DeptID', 'Department',
    'SectionID', 'Section', 'Location', 'MachineType', 'Manufacturer', 'Model', 'SerialNo',
    'Capacity', 'PowerRating', 'InstallDate', 'WarrantyExpiry', 'Criticality', 'Status',
    'QRCode', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  TECHNICIAN_FIELDS: [
    'EmployeeID', 'EmployeeCode', 'TechnicianName', 'Designation',
    'Department', 'Section', 'Skill', 'Shift', 'Mobile', 'Email',
    'JoiningDate', 'Status', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  TECHNICIAN_SKILLS: [
    'Mechanical', 'Electrical', 'PLC', 'Hydraulic',
    'Pneumatic', 'Utility', 'Instrumentation'
  ],

  TECHNICIAN_SHIFTS: ['General', 'A', 'B', 'C'],

  ASSET_FIELDS: [
    'AssetID', 'AssetCode', 'AssetName', 'AssetType', 'Category', 'MachineID', 'MachineName',
    'DeptID', 'Department', 'SectionID', 'Section', 'Location', 'Manufacturer', 'Model',
    'SerialNo', 'Specification', 'PurchaseDate', 'InstallDate', 'WarrantyExpiry', 'Criticality',
    'Supplier', 'Cost', 'Status', 'QRCode', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ]
};
