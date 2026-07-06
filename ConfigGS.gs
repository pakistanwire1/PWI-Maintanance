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
    DASHBOARD: 'Dashboard',
    STOCK_HISTORY: 'StockHistory',
    INVENTORY_TRANSACTIONS: 'InventoryTransactions',
    GOODS_RECEIPT: 'GoodsReceipt',
    PM_HISTORY: 'PMHistory',
    PM_CALENDAR: 'PMCalendar',
    NOTIFICATIONS: 'Notifications',
    AUDIT_TRAIL: 'AuditTrail',
    EMAIL_LOGS: 'EmailLogs'
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

  CHECKLIST_TEMPLATE_FIELDS: [
    'TemplateID', 'TemplateName', 'Category', 'Items', 'Description', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
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
    SECTION: 'SEC',
    QRCODE: 'QR'
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
    'CanViewDashboard', 'CanViewReports', 'CanManageInventory', 'IsAdmin'
  ],

  USER_FIELDS: [
    'UserID', 'EmployeeID', 'Name', 'Email', 'Password', 'Mobile',
    'Department', 'Section', 'Designation', 'Role', 'Status',
    'CanOpenJobCard', 'CanStartJobCard', 'CanCloseJobCard', 'CanApproveJobCard',
    'CanManageMachines', 'CanManageAssets', 'CanManageSpareParts', 'CanManagePM',
    'CanManageTechnicians', 'CanManageDepartments', 'CanManageSections', 'CanManageUsers',
    'CanViewDashboard', 'CanViewReports', 'CanManageInventory', 'IsAdmin',
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
    'QRCode', 'Barcode', 'QRGeneratedDate', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
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
    'Supplier', 'Cost', 'Status', 'QRCode', 'Barcode', 'QRGeneratedDate', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  SPARE_PART_FIELDS: [
    'PartCode', 'PartName', 'Category', 'Manufacturer', 'MachineCompatibility', 'AssetCompatibility',
    'Unit', 'MinimumStock', 'MaximumStock', 'CurrentStock', 'ReorderLevel',
    'StoreLocation', 'BinNumber', 'UnitCost', 'Supplier', 'Barcode', 'QRCode', 'QRGeneratedDate', 'Status',
    'Remarks', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  INVENTORY_TRANSACTION_FIELDS: [
    'TransactionID', 'TransactionType', 'PartCode', 'PartName', 'Quantity',
    'ReferenceNo', 'ReferenceType', 'FromLocation', 'ToLocation',
    'UnitCost', 'TotalCost', 'Remarks', 'ProcessedBy', 'ProcessedAt',
    'CreatedBy', 'CreatedAt'
  ],

  GOODS_RECEIPT_FIELDS: [
    'GRNNo', 'PartCode', 'PartName', 'Quantity', 'UnitCost', 'TotalCost',
    'Supplier', 'InvoiceNo', 'PONo', 'ReceivedBy', 'ReceivedDate',
    'Remarks', 'Status', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  STOCK_HISTORY_FIELDS: [
    'PartCode', 'PartName', 'TransactionType', 'Quantity', 'BalanceBefore', 'BalanceAfter',
    'ReferenceNo', 'Remarks', 'CreatedBy', 'CreatedAt'
  ],

  PM_FIELDS: [
    'PMNumber', 'Title', 'MachineID', 'MachineName', 'Department', 'Section',
    'Frequency', 'FrequencyType', 'AssignedTechnician', 'AssignedTechnicianName',
    'ChecklistTemplate', 'Priority', 'Status',
    'StartDate', 'DueDate', 'NextDueDate', 'CompletionDate',
    'ComplianceStatus', 'Remarks', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ],

  PM_HISTORY_FIELDS: [
    'PMNumber', 'Title', 'MachineName', 'CompletionDate', 'NextDueDate',
    'TechnicianName', 'Status', 'Remarks', 'CreatedBy', 'CreatedAt'
  ],

  NOTIFICATION_FIELDS: [
    'NotificationID', 'Title', 'Message', 'Module', 'NotificationType', 'Priority', 'CreatedBy',
    'AssignedTo', 'CreatedDateTime', 'ReadStatus', 'ActionURL'
  ],

  NOTIFICATION_MODULES: {
    JOBCARD: 'Job Card',
    PM: 'Preventive Maintenance',
    SPARE_PART: 'Spare Part',
    INVENTORY: 'Inventory',
    GOODS_RECEIPT: 'Goods Receipt',
    USER: 'User',
    MACHINE: 'Machine',
    ASSET: 'Asset',
    SYSTEM: 'System',
    BREAKDOWN: 'Breakdown'
  },

  NOTIFICATION_PRIORITY: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical'
  },

  FREQUENCY_TYPES: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly'],

  PM_STATUSES: {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    OVERDUE: 'Overdue',
    MISSED: 'Missed',
    SKIPPED: 'Skipped'
  },

  TRANSACTION_TYPES: {
    GOODS_RECEIPT: 'Goods Receipt',
    ISSUE: 'Issue',
    RETURN: 'Return',
    TRANSFER: 'Transfer',
    ADJUSTMENT: 'Adjustment'
  },

  NOTIFICATION_TYPES: {
    LOW_STOCK: 'LowStock',
    PM_DUE: 'PMDue',
    PM_OVERDUE: 'PMOverdue',
    BREAKDOWN: 'Breakdown',
    PENDING_JC: 'PendingJobCard',
    WAITING_APPROVAL: 'WaitingApproval',
    JC_OPENED: 'JobCardOpened',
    JC_STARTED: 'JobCardStarted',
    JC_CLOSED: 'JobCardClosed',
    JC_APPROVED: 'JobCardApproved',
    GOODS_RECEIPT: 'GoodsReceipt',
    SPARE_ISSUED: 'SparePartsIssued',
    USER_CREATED: 'UserCreated',
    MACHINE_ADDED: 'MachineAdded',
    ASSET_ADDED: 'AssetAdded',
    SYSTEM_ERROR: 'SystemError',
    PM_CREATED: 'PMCreated',
    PM_COMPLETED: 'PMCompleted',
    DEPT_ADDED: 'DepartmentAdded',
    TECH_ADDED: 'TechnicianAdded',
    MATERIAL_RETURN: 'MaterialReturn',
    PURCHASE_REQUEST: 'PurchaseRequest',
    JC_ACCEPTED: 'JobCardAccepted',
    JC_ESCALATED: 'JobCardEscalated',
    PM_ASSIGNMENT: 'PMAssignment',
    SPARE_AVAILABLE: 'SparePartsAvailable',
    NEW_ASSIGNMENT: 'NewAssignment',
    PRIORITY_CHANGED: 'PriorityChanged'
  },

  NOTIFICATION_DISPLAY_TYPES: [
    'Information', 'Success', 'Warning', 'Critical', 'Approval', 'Reminder', 'System'
  ],

  NOTIFICATION_ACTIONS: {
    JOBCARD: 'navigateTo(\'jobcards\')',
    PM: 'navigateTo(\'pm\')',
    SPARE_PART: 'navigateTo(\'spareparts\')',
    DASHBOARD: 'navigateTo(\'dashboard\')',
    SETTINGS: 'navigateTo(\'settings\')',
    INVENTORY: 'navigateTo(\'inventory\')',
    GOODS_RECEIPT: 'navigateTo(\'goodsreceipt\')',
    MACHINES: 'navigateTo(\'machines\')',
    ASSETS: 'navigateTo(\'assets\')'
  },

  ROLE_NOTIFICATION_MAP: {
    Admin: { viewAll: true },
    Operator: { moduleFilter: ['Job Card'], fieldCheck: 'CreatedBy' },
    Production: { moduleFilter: ['Job Card'], fieldCheck: 'CreatedBy' },
    Technician: { moduleFilter: null, fieldCheck: 'AssignedTo' },
    Supervisor: { viewApproval: true, viewCritical: true },
    'Department Manager': { viewApproval: true, viewCritical: true },
    'Maintenance Manager': { viewApproval: true, viewCritical: true },
    Store: { moduleFilter: ['Inventory', 'Spare Part', 'Goods Receipt'] },
    Viewer: { moduleFilter: [] }
  },

  AUDIT_TRAIL_FIELDS: [
    'AuditID', 'DateTime', 'UserEmail', 'UserName', 'Role', 'Department',
    'Module', 'Action', 'RecordID', 'RecordName', 'OldValue', 'NewValue',
    'IPAddress', 'Device', 'Browser', 'Status', 'Remarks'
  ],

  AUDIT_MODULES: {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    JOBCARD: 'Job Card',
    MACHINE: 'Machine',
    ASSET: 'Asset',
    DEPARTMENT: 'Department',
    SECTION: 'Section',
    TECHNICIAN: 'Technician',
    USER: 'User',
    SPARE_PART: 'Spare Part',
    INVENTORY: 'Inventory',
    GOODS_RECEIPT: 'Goods Receipt',
    PM: 'Preventive Maintenance',
    SETTINGS: 'Settings',
    PERMISSION: 'Permission',
    QR_BARCODE: 'QR & Barcode'
  },

  AUDIT_ACTIONS: {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    CREATE: 'Create',
    UPDATE: 'Update',
    DELETE: 'Delete',
    APPROVE: 'Approve',
    REJECT: 'Reject',
    OPEN: 'Open',
    START: 'Start',
    CLOSE: 'Close',
    COMPLETE: 'Complete',
    CANCEL: 'Cancel',
    STOCK_IN: 'Stock In',
    STOCK_OUT: 'Stock Out',
    GOODS_RECEIPT: 'Goods Receipt',
    PERMISSION_CHANGE: 'Permission Changed',
    SETTINGS_CHANGED: 'Settings Changed',
    QR_GENERATED: 'QR Generated',
    BARCODE_GENERATED: 'Barcode Generated',
    LABEL_PRINTED: 'Label Printed'
  },

  QR_MODULES: ['Machine', 'Asset', 'Spare Part'],

  QR_LABEL_SIZES: {
    SMALL: '50x25mm',
    MEDIUM: '75x50mm',
    LARGE: '100x50mm',
    A4_MULTI: 'A4 Multiple'
  },

  EMAIL_LOGS_FIELDS: [
    'EmailID', 'DateTime', 'Recipient', 'Subject', 'Module', 'ReferenceID',
    'Status', 'ErrorMessage', 'SentBy'
  ],

  EMAIL_SETTINGS_KEYS: {
    ENABLED: 'email_enabled',
    SENDER_NAME: 'email_sender_name',
    REPLY_TO: 'email_reply_to',
    DAILY_SUMMARY_TIME: 'email_daily_summary_time',
    WEEKLY_SUMMARY_DAY: 'email_weekly_summary_day'
  },

  EMAIL_DEFAULTS: {
    SENDER_NAME: 'CMMS Notification',
    REPLY_TO: 'noreply@cmms.com',
    DAILY_SUMMARY_TIME: '08:00',
    WEEKLY_SUMMARY_DAY: 'Monday'
  },

  EMAIL_TEMPLATE_TYPES: {
    JC_OPENED: 'JobCardOpened',
    JC_ASSIGNED: 'JobAssigned',
    JC_STARTED: 'JobStarted',
    JC_CLOSED: 'JobClosed',
    JC_APPROVED: 'JobApproved',
    PM_DUE: 'PMDueReminder',
    PM_OVERDUE: 'PMOverdue',
    LOW_STOCK: 'LowStockAlert',
    PURCHASE_REQUEST: 'PurchaseRequest',
    GOODS_RECEIPT: 'GoodsReceipt',
    USER_CREATED: 'UserCreated',
    PASSWORD_RESET: 'PasswordReset',
    DAILY_SUMMARY: 'DailySummary',
    WEEKLY_SUMMARY: 'WeeklySummary',
    MONTHLY_SUMMARY: 'MonthlySummary'
  },

  EMAIL_STATUS: {
    PENDING: 'Pending',
    SENT: 'Sent',
    FAILED: 'Failed'
  }
};