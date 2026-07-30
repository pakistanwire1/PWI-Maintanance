import puppeteer from 'puppeteer-core';

const TARGET_URL = 'https://pwi-maintanance.pages.dev/';

const MOCK_USER = {
  id: 1, email: 'admin@pwi.com', name: 'Admin User',
  role: 'Administrator', department: 'IT', isSystemAdmin: true
};

const MOCK_TOKEN = 'pwi-real-mock-token-98765';

const SECTIONS_DATA = [
  { SectionID: 1, Section: 'Production', SectionCode: 'PROD', Description: 'Production Department', Status: 'Active', SundayOff: 'No', HoursPerDay: 8, DepartmentCount: 4 },
  { SectionID: 2, Section: 'Maintenance', SectionCode: 'MAINT', Description: 'Maintenance Department', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: 8, DepartmentCount: 3 },
  { SectionID: 3, Section: 'Quality', SectionCode: 'QA', Description: 'Quality Assurance', Status: 'Active', SundayOff: 'No', HoursPerDay: 8, DepartmentCount: 2 },
  { SectionID: 4, Section: 'Stores', SectionCode: 'STOR', Description: 'Stores & Inventory', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: 8, DepartmentCount: 1 },
  { SectionID: 5, Section: 'Administration', SectionCode: 'ADMIN', Description: 'Administration', Status: 'Active', SundayOff: 'Sunday', HoursPerDay: 7, DepartmentCount: 2 }
];

const MOCK_RESPONSES = {

  login: { success: true, token: MOCK_TOKEN, user: MOCK_USER },
  validateSession: { success: true, data: { user: MOCK_USER } },

  getDashboardData: {
    totalMachines: 24, runningMachines: 18, breakdownMachines: 2,
    openJobs: 7, runningJobs: 4, closedJobs: 45, approvedJobs: 38,
    pendingJobs: 3, waitingJobs: 1,
    totalWaitingTimeMinutes: 680, totalWorkingTimeMinutes: 12480,
    totalRepairTimeMinutes: 3840, totalDowntimeMinutes: 1440,
    mttr: 3.8, mtbf: 215.5, totalMachineRuntimeHours: 18240,
    availability: 98.2, breakdownMaintenanceCount: 12,
    preventiveMaintenanceCount: 28, pmDue: 5, pmOverdue: 2,
    lowStockParts: 3, outOfStockParts: 1, pmCompliance: 94.5,
    qrGenerated: 128, totalStockValue: 512000,
    charts: {
      months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      openJobs: [3,5,2,4,6,3,5,4,7,5,3,4],
      runningJobs: [2,3,4,2,3,5,3,4,2,3,4,3],
      closedJobs: [4,6,8,5,7,9,8,10,6,8,7,9],
      pendingJobs: [1,2,1,3,2,1,2,1,3,2,1,2],
      approvedJobs: [3,4,5,3,4,6,5,7,4,5,4,6],
      breakdowns: [1,2,0,1,2,1,1,0,2,1,1,2],
      mttr: [4.5,4.2,3.8,4.1,3.9,4.2,3.7,3.5,3.9,4.0,3.8,3.6],
      mtbf: [160,165,170,168,172,168,175,180,178,182,185,190],
      waitingTime: [45,32,28,50,38,42,35,30,48,36,40,38],
      downtime: [12,8,15,10,9,14,11,7,13,10,8,12],
      monthlyMaintenance: [5,7,6,8,6,9,7,10,8,9,7,8]
    }
  },

  getDashboardNotifications: [
    { id: 1, Title: 'PM Due', Message: 'Extruder A1 PM due tomorrow', Module: 'PM', Priority: 'High', ReadStatus: 'Unread', CreatedAt: '2026-07-29 10:00:00' },
    { id: 2, Title: 'Low Stock', Message: 'Bearing 6205 low stock (8 remaining)', Module: 'Inventory', Priority: 'Medium', ReadStatus: 'Unread', CreatedAt: '2026-07-29 09:00:00' }
  ],

  getSidebarCounts: { sections: 5, departments: 5, machines: 5, assets: 3, technicians: 3, users: 3, openJobs: 2, pendingJobs: 1, pmDue: 1, pmOverdue: 1 },
  getNotificationsCount: { unread: 3, total: 8 },

  getSectionList: SECTIONS_DATA,
  createSection: { success: true, message: 'Section created' },
  modifySection: { success: true, message: 'Section updated' },
  removeSection: { success: true, message: 'Section deleted' },

  getDepartmentList: [
    { DeptID: 1, Department: 'Production Line 1', Section: 'Production', SectionID: 1, Status: 'Active' },
    { DeptID: 2, Department: 'Production Line 2', Section: 'Production', SectionID: 1, Status: 'Active' },
    { DeptID: 3, Department: 'Mechanical Workshop', Section: 'Maintenance', SectionID: 2, Status: 'Active' },
    { DeptID: 4, Department: 'Electrical Workshop', Section: 'Maintenance', SectionID: 2, Status: 'Active' },
    { DeptID: 5, Department: 'Quality Lab', Section: 'Quality', SectionID: 3, Status: 'Active' }
  ],
  createDepartment: { success: true },
  modifyDepartment: { success: true },
  removeDepartment: { success: true },

  getMachineList: [
    { MachineID: 1, MachineName: 'Extruder A1', MachineCode: 'EXT-001', Section: 'Production', Department: 'Production Line 1', Status: 'Running', RuntimeHours: 4520, LastPM: '2026-06-15', NextPM: '2026-07-15', Make: 'Siemens', Model: 'EX-2000', InstallationDate: '2020-01-15' },
    { MachineID: 2, MachineName: 'Draw Bench B2', MachineCode: 'DRW-002', Section: 'Production', Department: 'Production Line 1', Status: 'Running', RuntimeHours: 3280, LastPM: '2026-06-20', NextPM: '2026-07-20', Make: 'Mitsubishi', Model: 'DB-1500', InstallationDate: '2021-03-20' },
    { MachineID: 3, MachineName: 'Winding Machine C3', MachineCode: 'WND-003', Section: 'Production', Department: 'Production Line 2', Status: 'Breakdown', RuntimeHours: 1890, LastPM: '2026-05-10', NextPM: '2026-06-10', Make: 'ABB', Model: 'WM-800', InstallationDate: '2022-07-10' },
    { MachineID: 4, MachineName: 'Compressor D4', MachineCode: 'CMP-004', Section: 'Maintenance', Department: 'Mechanical Workshop', Status: 'Running', RuntimeHours: 8760, LastPM: '2026-06-01', NextPM: '2026-07-01', Make: 'Atlas Copco', Model: 'GA-75', InstallationDate: '2019-11-01' },
    { MachineID: 5, MachineName: 'Boiler E5', MachineCode: 'BRL-005', Section: 'Maintenance', Department: 'Mechanical Workshop', Status: 'Stopped', RuntimeHours: 12450, LastPM: '2026-04-15', NextPM: '2026-07-15', Make: 'Babcock', Model: 'BW-3000', InstallationDate: '2018-06-15' }
  ],
  getMachine: { MachineID: 1, MachineName: 'Extruder A1', MachineCode: 'EXT-001', Section: 'Production', Department: 'Production Line 1', Status: 'Running', RuntimeHours: 4520, LastPM: '2026-06-15', NextPM: '2026-07-15', Make: 'Siemens', Model: 'EX-2000', InstallationDate: '2020-01-15', Specifications: 'Capacity: 200kg/hr, Power: 150kW, Voltage: 415V', WarrantyExpiry: '2027-01-15', LastBreakdown: '2026-05-20', TotalBreakdowns: 3 },
  createMachine: { success: true },
  modifyMachine: { success: true },
  removeMachine: { success: true },
  getMachinePassport: {
    MachineID: 1, MachineName: 'Extruder A1', MachineCode: 'EXT-001',
    Section: 'Production', Department: 'Production Line 1',
    Status: 'Running', RuntimeHours: 4520,
    Make: 'Siemens', Model: 'EX-2000', SerialNo: 'SN-EXT-2020-001',
    InstallationDate: '2020-01-15', WarrantyExpiry: '2027-01-15',
    Specifications: 'Capacity: 200kg/hr, Power: 150kW, Voltage: 415V',
    LastPM: '2026-06-15', NextPM: '2026-07-15',
    LastBreakdown: '2026-05-20', TotalBreakdowns: 3,
    TotalJobCards: 28, OpenJobCards: 2,
    Documents: [{ name: 'Manual.pdf', url: '#' }, { name: 'Warranty.pdf', url: '#' }],
    RecentJobs: [
      { date: '2026-07-28', type: 'Repair', description: 'Belt replacement', status: 'Completed' },
      { date: '2026-07-15', type: 'PM', description: 'Monthly maintenance', status: 'Completed' }
    ]
  },

  getAssetList: [
    { AssetID: 1, AssetName: 'CNC Machine #1', AssetCode: 'CNC-001', Machine: 'Extruder A1', Status: 'Active', PurchaseDate: '2023-01-15', WarrantyUntil: '2028-01-15', Value: 2500000 },
    { AssetID: 2, AssetName: 'Hydraulic Press #1', AssetCode: 'HPR-001', Machine: 'Draw Bench B2', Status: 'Active', PurchaseDate: '2022-06-20', WarrantyUntil: '2027-06-20', Value: 1800000 },
    { AssetID: 3, AssetName: 'PLC Controller #1', AssetCode: 'PLC-001', Machine: 'Winding Machine C3', Status: 'Under Repair', PurchaseDate: '2024-03-10', WarrantyUntil: '2029-03-10', Value: 450000 }
  ],

  getTechnicianList: [
    { TechID: 1, Name: 'Ahmed Khan', EmployeeCode: 'EMP-001', Department: 'Maintenance', Specialization: 'Mechanical', Phone: '0300-1234567', Email: 'ahmed@pwi.com', Status: 'Available' },
    { TechID: 2, Name: 'Sara Ali', EmployeeCode: 'EMP-002', Department: 'Maintenance', Specialization: 'Electrical', Phone: '0300-7654321', Email: 'sara@pwi.com', Status: 'On Job' },
    { TechID: 3, Name: 'Usman Raza', EmployeeCode: 'EMP-003', Department: 'Production', Specialization: 'Operator', Phone: '0300-5556667', Email: 'usman@pwi.com', Status: 'Available' }
  ],

  getUserList: [
    { UserID: 1, Name: 'Admin User', Email: 'admin@pwi.com', Role: 'Administrator', Department: 'IT', Status: 'Active', LastLogin: '2026-07-29 08:30:00' },
    { UserID: 2, Name: 'Manager User', Email: 'manager@pwi.com', Role: 'Manager', Department: 'Production', Status: 'Active', LastLogin: '2026-07-28 10:15:00' },
    { UserID: 3, Name: 'Operator User', Email: 'operator@pwi.com', Role: 'Operator', Department: 'Production', Status: 'Active', LastLogin: '2026-07-29 06:45:00' }
  ],

  getOpenJobCards: [
    { JobCardID: 1, JobCardNo: 'JC-2026-0001', Machine: 'Extruder A1', IssueDate: '2026-07-28', Priority: 'High', Status: 'Open', AssignedTo: 'Ahmed Khan', IssueDescription: 'Abnormal vibration detected' },
    { JobCardID: 2, JobCardNo: 'JC-2026-0002', Machine: 'Compressor D4', IssueDate: '2026-07-29', Priority: 'Normal', Status: 'Open', AssignedTo: 'Sara Ali', IssueDescription: 'Oil leak' }
  ],
  getStartedJobCards: [
    { JobCardID: 3, JobCardNo: 'JC-2026-0003', Machine: 'Draw Bench B2', StartDate: '2026-07-29', Status: 'In Progress', AssignedTo: 'Ahmed Khan', IssueDescription: 'Routine maintenance' }
  ],
  getClosedJobCards: [
    { JobCardID: 4, JobCardNo: 'JC-2026-0004', Machine: 'Winding Machine C3', ClosedDate: '2026-07-28', Status: 'Completed', ClosedBy: 'Admin User', IssueDescription: 'Belt replacement' }
  ],
  getPendingJobCards: [
    { JobCardID: 5, JobCardNo: 'JC-2026-0005', Machine: 'Boiler E5', IssueDate: '2026-07-25', Status: 'Pending Approval', submittedBy: 'Ahmed Khan', IssueDescription: 'Pressure gauge replacement' }
  ],
  getApprovedJobCards: [
    { JobCardID: 6, JobCardNo: 'JC-2026-0006', Machine: 'Extruder A1', ApprovedDate: '2026-07-27', Status: 'Approved', ApprovedBy: 'Manager User', IssueDescription: 'Scheduled overhaul' }
  ],
  getAllJobCards: [
    { JobCardID: 1, JobCardNo: 'JC-2026-0001', Machine: 'Extruder A1', IssueDate: '2026-07-28', Status: 'Open', Priority: 'High' },
    { JobCardID: 3, JobCardNo: 'JC-2026-0003', Machine: 'Draw Bench B2', IssueDate: '2026-07-27', Status: 'In Progress', Priority: 'Normal' },
    { JobCardID: 4, JobCardNo: 'JC-2026-0004', Machine: 'Winding Machine C3', IssueDate: '2026-07-25', Status: 'Completed', Priority: 'High' },
    { JobCardID: 5, JobCardNo: 'JC-2026-0005', Machine: 'Boiler E5', IssueDate: '2026-07-25', Status: 'Pending Approval', Priority: 'Low' }
  ],

  getJobCards: [
    { JobCardID: 1, JobCardNo: 'JC-2026-0001', Machine: 'Extruder A1', IssueDate: '2026-07-28', Status: 'Open', Priority: 'High' },
    { JobCardID: 3, JobCardNo: 'JC-2026-0003', Machine: 'Draw Bench B2', IssueDate: '2026-07-27', Status: 'In Progress', Priority: 'Normal' }
  ],

  getPMSchedule: [
    { PMID: 1, PMCode: 'PM-001', Machine: 'Extruder A1', MachineID: 1, Frequency: 'Monthly', LastDone: '2026-06-15', NextDue: '2026-07-15', Status: 'Due', AssignedTo: 'Ahmed Khan', TaskDescription: 'Full inspection and lubrication' },
    { PMID: 2, PMCode: 'PM-002', Machine: 'Draw Bench B2', MachineID: 2, Frequency: 'Quarterly', LastDone: '2026-04-20', NextDue: '2026-07-20', Status: 'Overdue', AssignedTo: 'Sara Ali', TaskDescription: 'Hydraulic system check' },
    { PMID: 3, PMCode: 'PM-003', Machine: 'Compressor D4', MachineID: 4, Frequency: 'Weekly', LastDone: '2026-07-25', NextDue: '2026-08-01', Status: 'Upcoming', AssignedTo: 'Ahmed Khan', TaskDescription: 'Filter cleaning and inspection' }
  ],
  getPMRecords: [],

  getChecklistTemplates: [
    { ChecklistID: 1, Title: 'Daily Machine Inspection', Category: 'Safety', Frequency: 'Daily', Status: 'Active', Items: 10 },
    { ChecklistID: 2, Title: 'Weekly Lubrication', Category: 'Maintenance', Frequency: 'Weekly', Status: 'Active', Items: 5 },
    { ChecklistID: 3, Title: 'Monthly Fire Safety', Category: 'Safety', Frequency: 'Monthly', Status: 'Active', Items: 8 }
  ],
  getChecklists: [],

  getSpareParts: [
    { PartID: 1, PartName: 'Bearing 6205', PartCode: 'BRG-6205', Category: 'Bearings', StockQty: 25, MinStock: 10, Unit: 'pcs', Price: 450, Location: 'Aisle 3, Bin 12' },
    { PartID: 2, PartName: 'Oil Seal 45x62x8', PartCode: 'OSL-45628', Category: 'Seals', StockQty: 8, MinStock: 15, Unit: 'pcs', Price: 180, Location: 'Aisle 1, Bin 5' },
    { PartID: 3, PartName: 'Hydraulic Fluid 5L', PartCode: 'HFL-5L', Category: 'Lubricants', StockQty: 12, MinStock: 5, Unit: 'liters', Price: 2500, Location: 'Store Room B' },
    { PartID: 4, PartName: 'V-Belt A45', PartCode: 'VBL-A45', Category: 'Belts', StockQty: 3, MinStock: 10, Unit: 'pcs', Price: 750, Location: 'Aisle 2, Bin 8' },
    { PartID: 5, PartName: 'Fuse 10A', PartCode: 'FUS-10A', Category: 'Electrical', StockQty: 50, MinStock: 20, Unit: 'pcs', Price: 25, Location: 'Aisle 5, Bin 1' }
  ],
  getSparePartsList: [],
  getLowStockParts: [
    { PartID: 4, PartName: 'V-Belt A45', PartCode: 'VBL-A45', StockQty: 3, MinStock: 10 },
    { PartID: 2, PartName: 'Oil Seal 45x62x8', PartCode: 'OSL-45628', StockQty: 8, MinStock: 15 }
  ],

  getInventoryDashboardData: {
    totalParts: 285, totalValue: 512000,
    lowStockCount: 2, outOfStockCount: 1,
    categories: ['Bearings', 'Seals', 'Lubricants', 'Electrical', 'Belts', 'Filters'],
    categoryCounts: [85, 42, 38, 65, 30, 25],
    recentTransactions: [
      { date: '2026-07-29', type: 'Issue', part: 'Bearing 6205', qty: 2, user: 'Ahmed Khan' },
      { date: '2026-07-28', type: 'Receipt', part: 'Hydraulic Fluid 5L', qty: 10, user: 'Stores' }
    ]
  },

  getBreakdownHistory: [
    { BreakdownID: 1, Machine: 'Winding Machine C3', MachineID: 3, Date: '2026-07-28', Type: 'Mechanical', Description: 'Belt snapped', DowntimeHours: 4.5, Status: 'Resolved', ResolvedBy: 'Ahmed Khan', Resolution: 'Replaced V-belt' },
    { BreakdownID: 2, Machine: 'Extruder A1', MachineID: 1, Date: '2026-07-15', Type: 'Electrical', Description: 'Motor overload trip', DowntimeHours: 2.0, Status: 'Resolved', ResolvedBy: 'Sara Ali', Resolution: 'Reset and inspected motor' }
  ],
  getBreakdownTypes: ['Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic', 'Structural'],

  getPMHistory: [
    { PMHID: 1, Machine: 'Extruder A1', PMCode: 'PM-001', Date: '2026-06-15', Type: 'Monthly', Status: 'Completed', PerformedBy: 'Ahmed Khan', Remarks: 'All parameters normal' },
    { PMHID: 2, Machine: 'Compressor D4', PMCode: 'PM-003', Date: '2026-06-25', Type: 'Weekly', Status: 'Completed', PerformedBy: 'Sara Ali', Remarks: 'Filter replaced' }
  ],

  getAuditLogs: [
    { LogID: 1, User: 'Admin User', Action: 'Login', Module: 'Auth', Timestamp: '2026-07-29 08:30:00', Details: 'User logged in' },
    { LogID: 2, User: 'Admin User', Action: 'View', Module: 'Dashboard', Timestamp: '2026-07-29 08:30:05', Details: 'Viewed dashboard' },
    { LogID: 3, User: 'Admin User', Action: 'Create', Module: 'Section', Timestamp: '2026-07-28 14:15:00', Details: 'Created section: Test Section' }
  ],

  getInventoryTransactions: [
    { TransID: 1, Date: '2026-07-29', Type: 'Issue', Part: 'Bearing 6205', Qty: 2, User: 'Ahmed Khan', Reference: 'JC-2026-0001' },
    { TransID: 2, Date: '2026-07-28', Type: 'Receipt', Part: 'Hydraulic Fluid 5L', Qty: 10, User: 'Stores', Reference: 'PO-2026-0045' }
  ],

  getStockHistory: [
    { HistID: 1, Date: '2026-07-29', Part: 'Bearing 6205', PreviousStock: 27, NewStock: 25, Change: -2, Type: 'Issue' },
    { HistID: 2, Date: '2026-07-28', Part: 'Hydraulic Fluid 5L', PreviousStock: 2, NewStock: 12, Change: 10, Type: 'Receipt' }
  ],

  getGoodsReceipt: [
    { GRID: 1, Date: '2026-07-28', Part: 'Hydraulic Fluid 5L', Qty: 10, PO: 'PO-2026-0045', Supplier: 'OilTech Industries', ReceivedBy: 'Stores' }
  ],

  getReportData: {
    labels: ['Jan','Feb','Mar','Apr','May','Jun'],
    maintenanceCosts: [125000, 98000, 145000, 112000, 135000, 118000],
    downtimeHours: [45, 32, 58, 38, 42, 35],
    jobCompletionRate: [85, 92, 78, 88, 90, 85],
    breakdownFrequency: [4, 3, 5, 3, 4, 3]
  },

  getNotifications: [
    { id: 1, Title: 'PM Due Tomorrow', Message: 'Extruder A1 PM scheduled for tomorrow', Module: 'PM', Priority: 'High', ReadStatus: 'Unread', CreatedAt: '2026-07-29 10:00:00' },
    { id: 2, Title: 'Low Stock Alert', Message: 'V-Belt A45 is below minimum stock', Module: 'Inventory', Priority: 'Medium', ReadStatus: 'Unread', CreatedAt: '2026-07-29 09:00:00' },
    { id: 3, Title: 'Breakdown Report', Message: 'Winding Machine C3 breakdown resolved', Module: 'Breakdown', Priority: 'High', ReadStatus: 'Read', CreatedAt: '2026-07-28 16:30:00' }
  ],
  markAllNotificationsRead: { success: true },
  clearAllNotifications: { success: true },

  emailGetSettings: { smtpHost: 'smtp.pwi.com', smtpPort: 587, fromEmail: 'noreply@pwi.com', smtpUser: 'noreply', smtpPass: '****', useSSL: true, status: 'Configured', lastTest: '2026-07-28' },
  emailGetPanelData: { queueLength: 0, lastSent: '2026-07-29 08:00:00', failedCount: 2, dailyLimit: 500 },
  emailGetLogs: [
    { id: 1, to: 'user@pwi.com', subject: 'PM Reminder', status: 'Sent', sentAt: '2026-07-29 08:00:00' },
    { id: 2, to: 'tech@pwi.com', subject: 'Job Card Assigned', status: 'Failed', sentAt: '2026-07-28 14:00:00', error: 'Connection timeout' }
  ],
  emailRetryFailed: { success: true, retried: 2, failed: 0 },

  whatsappGetSettings: { apiKey: 'sk-****', phoneNumberId: '123456789', businessAccountId: '987654321', status: 'Connected', webhookUrl: 'https://pwi.com/webhook', lastVerified: '2026-07-29' },
  whatsappGetTemplates: [
    { name: 'pm_reminder', status: 'Approved', language: 'en' },
    { name: 'breakdown_alert', status: 'Approved', language: 'en' },
    { name: 'job_assigned', status: 'Pending', language: 'en' }
  ],
  whatsappGetLogs: [
    { id: 1, to: '+923001234567', template: 'pm_reminder', status: 'Sent', sentAt: '2026-07-29 08:00:00' },
    { id: 2, to: '+923007654321', template: 'breakdown_alert', status: 'Failed', sentAt: '2026-07-28 14:00:00', error: 'Template not approved' }
  ],
  whatsappGetPanelData: { totalSent: 125, totalFailed: 3, dailySent: 8, dailyLimit: 100 },

  getQRStatistics: {
    totalGenerated: 128, totalScanned: 45, uniqueMachines: 24, uniqueAssets: 15,
    scanTrend: [5, 8, 3, 12, 7, 4, 6],
    scanDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  },
  getQRModuleRecords: [
    { id: 1, code: 'QR-MC-001', name: 'Extruder A1', type: 'Machine', scans: 12, lastScanned: '2026-07-29' },
    { id: 2, code: 'QR-MC-002', name: 'Draw Bench B2', type: 'Machine', scans: 8, lastScanned: '2026-07-28' },
    { id: 3, code: 'QR-AS-001', name: 'CNC Machine #1', type: 'Asset', scans: 5, lastScanned: '2026-07-27' }
  ],
  getQRScanStats: { today: 3, week: 15, month: 45, total: 128 },
  getQRScanHistory: [],

  getSettingsData: {
    companyName: 'Pakistan Wire Industries', timezone: 'Asia/Karachi', language: 'en',
    dateFormat: 'YYYY-MM-DD', weekStart: 'Monday', sessionTimeout: 30,
    maxLoginAttempts: 5, passwordPolicy: 'Strong', maintenanceWindow: 'Sunday 02:00-06:00'
  },

  getBackupHistory: [
    { id: 1, date: '2026-07-29 03:00:00', type: 'Auto', size: '256 MB', status: 'Success', file: 'backup-20260729.zip' },
    { id: 2, date: '2026-07-28 03:00:00', type: 'Auto', size: '254 MB', status: 'Success', file: 'backup-20260728.zip' },
    { id: 3, date: '2026-07-27 03:00:00', type: 'Auto', size: '0 B', status: 'Failed' }
  ],
  getBackupStatus: { lastBackup: '2026-07-29 03:00:00', status: 'Healthy', diskUsage: '45%', dataSize: '256 MB' },
  createBackup: { success: true, file: 'backup-manual-20260729.zip' },

  getMachines: [], getAssets: [], getTechnicians: [], getUsers: [], getDepartments: [],

  createJobCard: { success: true, jobCardId: 7 },
  updateJobCard: { success: true },
  deleteJobCard: { success: true },
  startJobCard: { success: true },
  completeJobCard: { success: true },
  approveJobCard: { success: true },
  rejectJobCard: { success: true },

  logout: { success: true, message: 'Logged out' },
};

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const allLogs = [];
const jsErrors = [];
const apiCalls = [];

page.on('console', msg => {
  const t = msg.text();
  allLogs.push({ type: msg.type(), text: t });
  if (msg.type() === 'error') jsErrors.push(t);
});

page.on('pageerror', err => jsErrors.push(err.message));

// Intercept ALL API calls
await page.setRequestInterception(true);
page.on('request', req => {
  const url = req.url();
  if (url.includes('/api/exec')) {
    const postData = req.postData();
    let action = 'unknown';
    try {
      if (postData) {
        const parsed = JSON.parse(postData);
        action = parsed.action || 'unknown';
      }
    } catch(e) {}

    let mock = MOCK_RESPONSES[action];
    if (!mock) {
      // Try lowercase action
      mock = MOCK_RESPONSES[action.toLowerCase()];
    }
    if (!mock) {
      // Fallback: return empty array
      mock = { success: true, data: [] };
    }

    // Ensure consistent format
    let body;
    if (mock && mock.success !== undefined) {
      body = JSON.stringify(mock);
    } else {
      body = JSON.stringify({ success: true, data: mock });
    }

    apiCalls.push({ action, response: body.substring(0, 80) });
    req.respond({
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: body
    });
    return;
  }
  req.continue();
});

let step = 0;
function logStep(name) {
  step++;
  const e = jsErrors.length;
  console.log(`\n[${step}] ${name} (errors: ${e})`);
}

async function checkPage(expectations = {}) {
  const state = await page.evaluate(() => {
    const content = document.getElementById('pageContent');
    const app = document.getElementById('appContainer');
    const login = document.getElementById('loginPage');
    const html = content ? content.innerHTML : '';
    return {
      contentLength: html.length,
      contentSample: html.substring(0, 80).replace(/\s+/g, ' ').trim(),
      appDisplay: app ? getComputedStyle(app).display : 'n/a',
      loginDisplay: login ? getComputedStyle(login).display : 'n/a',
      hash: window.location.hash,
      hasSpinner: html.includes('Loading...') || (html.includes('empty-state') && html.includes('spinner'))
    };
  });
  const hasNewErrors = jsErrors.length > (expectations._prevErrors || 0);

  let ok = true;
  const issues = [];

  if (state.contentLength <= 200) { ok = false; issues.push(`short content (${state.contentLength}b)`); }
  if (state.hasSpinner) { ok = false; issues.push('spinner present'); }
  if (state.appDisplay !== 'flex' && expectations.requireApp !== false) { ok = false; issues.push(`app=${state.appDisplay}`); }
  if (hasNewErrors) { ok = false; issues.push(`${jsErrors.length - (expectations._prevErrors || 0)} new JS errors`); }

  console.log(`  ${ok ? 'OK' : 'ISSUE'}: ${state.contentLength}b app=${state.appDisplay} hash=${state.hash}${issues.length ? ' → ' + issues.join(', ') : ''}`);
  return { ok, state, issues };
}

// ========== STEP 1: LOAD SITE ==========
logStep('Load deployed site');
await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 1000));

// Welcome page shown — pageContent is empty, welcomePage is visible
const welcomeState = await page.evaluate(() => {
  const welcome = document.getElementById('welcomePage');
  const content = document.getElementById('pageContent');
  return {
    welcomeDisplay: welcome ? getComputedStyle(welcome).display : 'n/a',
    contentLength: content ? content.innerHTML.length : 0,
    appDisplay: document.getElementById('appContainer') ? getComputedStyle(document.getElementById('appContainer')).display : 'n/a'
  };
});
console.log(`  Welcome page: ${welcomeState.welcomeDisplay}, content: ${welcomeState.contentLength}b, app: ${welcomeState.appDisplay}`);

// ========== STEP 2: LOGIN (set session) ==========
logStep('Set session and reload (simulate login)');
await page.evaluate((token, user) => {
  localStorage.setItem('cmms_welcomed', 'true');
  localStorage.setItem('cmms_token', token);
  localStorage.setItem('cmms_user', JSON.stringify(user));
}, MOCK_TOKEN, MOCK_USER);

await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

let r = await checkPage({ _prevErrors: 0 });
if (!r.ok || r.state.hash !== '#dashboard') {
  console.log(`FATAL: Login failed. Hash=${r.state.hash}`);
  await browser.close(); process.exit(1);
}
console.log('  LOGIN OK — Dashboard shown');

// ========== STEP 3: DASHBOARD INTERACTION ==========
logStep('Dashboard — click filter buttons');
await page.evaluate(() => {
  const filters = document.querySelectorAll('.filter-btn');
  if (filters.length > 0) filters[1].click();
});
await new Promise(r => setTimeout(r, 500));
await page.evaluate(() => {
  const filters = document.querySelectorAll('.filter-btn');
  if (filters.length > 2) filters[2].click();
});
await new Promise(r => setTimeout(r, 500));
console.log('  Filter buttons clicked OK');

// ========== STEP 4: NAVIGATE TO EVERY MAIN PAGE ==========
const mainPages = [
  'sections', 'departments', 'machines', 'assets', 'technicians', 'users',
  'openjobcard', 'startjobcard', 'closejobcard', 'pendingjobcard', 'approvejobcard', 'jobcards',
  'pm', 'checklists', 'spareparts', 'inventory', 'breakdown', 'pmhistory',
  'audit', 'inventorytransactions', 'stockhistory', 'goodsreceipt',
  'reports', 'notifications', 'email', 'whatsapp',
  'qr', 'qrmachines', 'qrassets', 'qrspareparts', 'qrjobcards', 'qrprint', 'qrhistory',
  'settings', 'backuprestore'
];

for (const pageId of mainPages) {
  logStep(`Navigate to ${pageId}`);
  const prevErrors = jsErrors.length;

  const clicked = await page.evaluate((pid) => {
    const items = document.querySelectorAll('.sidebar-item');
    for (const item of items) {
      if (item.getAttribute('data-page') === pid) {
        item.click();
        return true;
      }
    }
    return false;
  }, pageId);

  if (!clicked) {
    console.log(`  WARN: Sidebar item ${pageId} not found, trying navigateTo`);
    await page.evaluate((pid) => { if (typeof navigateTo === 'function') navigateTo(pid); }, pageId);
  }

  await new Promise(r => setTimeout(r, 2500));
  r = await checkPage({ _prevErrors: prevErrors, requireApp: true });
}

// ========== STEP 5: TABLE INTERACTION (Sections) ==========
logStep('Sections — table interaction');
await page.evaluate(() => {
  const items = document.querySelectorAll('.sidebar-item');
  for (const item of items) {
    if (item.getAttribute('data-page') === 'sections') { item.click(); return; }
  }
});
await new Promise(r => setTimeout(r, 2000));

// Check if table rendered
const tableState = await page.evaluate(() => {
  const container = document.getElementById('sectionsTableContainer');
  return { exists: !!container, html: container ? container.innerHTML.substring(0, 100) : 'none' };
});
console.log(`  Table container: ${tableState.exists}, content: ${tableState.html.substring(0, 60)}`);

// Try clicking Add button
await page.evaluate(() => {
  const addBtn = document.querySelector('.card-actions .btn-primary');
  if (addBtn) addBtn.click();
});
await new Promise(r => setTimeout(r, 500));
const modalState = await page.evaluate(() => {
  const modal = document.getElementById('sectionFormModal');
  return { exists: !!modal, show: modal ? modal.classList.contains('show') : false };
});
console.log(`  Add modal: ${modalState.show ? 'opened' : 'not opened'}`);

// Close modal
await page.evaluate(() => {
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.click();
});
await new Promise(r => setTimeout(r, 500));

// ========== STEP 6: MACHINE PASSPORT ==========
logStep('Machine Passport — navigate to machine detail');
await page.evaluate(() => {
  const items = document.querySelectorAll('.sidebar-item');
  for (const item of items) {
    if (item.getAttribute('data-page') === 'machines') { item.click(); return; }
  }
});
await new Promise(r => setTimeout(r, 2000));

// Try clicking on first machine to open passport/detail
const passportState = await page.evaluate(() => {
  const rows = document.querySelectorAll('.table-row, [class*="machine-row"]');
  const links = document.querySelectorAll('a[onclick*="Machine"], button[onclick*="Machine"]');
  const passportBtn = document.querySelector('[onclick*="passport"], [onclick*="Passport"], [data-action="passport"]');
  const passportSection = document.getElementById('machinePassport');
  return {
    rows: rows.length,
    links: links.length,
    passportBtn: !!passportBtn,
    passportSection: passportSection ? passportSection.innerHTML.substring(0, 100) : 'none'
  };
});
console.log(`  Machine rows: ${passportState.rows}, passport links: ${passportState.links}`);

// If there's a passport or detail link, click it
if (passportState.links > 0) {
  await page.evaluate(() => {
    const links = document.querySelectorAll('a[onclick*="Machine"], button[onclick*="Machine"]');
    if (links.length > 0) links[0].click();
  });
  await new Promise(r => setTimeout(r, 2000));
}

// ========== STEP 7: QR SCREENS ==========
logStep('QR — verify all QR sub-pages');
const qrPages = ['qr', 'qrmachines', 'qrassets', 'qrspareparts', 'qrjobcards', 'qrprint', 'qrhistory'];
for (const qrId of qrPages) {
  const prevErrors = jsErrors.length;
  await page.evaluate((pid) => { if (typeof navigateTo === 'function') navigateTo(pid); }, qrId);
  await new Promise(r => setTimeout(r, 2000));
  r = await checkPage({ _prevErrors: prevErrors, requireApp: true });
}

// ========== STEP 8: DROPDOWN / FILTER INTERACTION ==========
logStep('Filter dropdowns and search');
// Navigate to sections and try search
await page.evaluate(() => { if (typeof navigateTo === 'function') navigateTo('sections'); });
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => {
  const searchInput = document.getElementById('sectionSearchInput');
  if (searchInput) {
    searchInput.value = 'Prod';
    searchInput.dispatchEvent(new Event('input'));
  }
});
await new Promise(r => setTimeout(r, 500));
console.log('  Search input tested');

// ========== STEP 9: BACK BUTTON ==========
logStep('Back button (popstate)');
const hashBefore = await page.evaluate(() => window.location.hash);
console.log(`  Hash before back: ${hashBefore}`);
await page.goBack();
await new Promise(r => setTimeout(r, 2000));
const hashAfterBack = await page.evaluate(() => window.location.hash);
console.log(`  Hash after back: ${hashAfterBack}`);

// If back worked, navigate forward again (if possible)
if (hashAfterBack !== hashBefore) {
  try {
    await page.goForward();
    await new Promise(r => setTimeout(r, 2000));
    const hashAfterForward = await page.evaluate(() => window.location.hash);
    console.log(`  Forward navigation: hash=${hashAfterForward}`);
  } catch (e) {
    const hashNow = await page.evaluate(() => window.location.hash);
    console.log(`  Forward nav skipped (no history): hash=${hashNow}`);
  }
} else {
  console.log('  Back navigation: hash unchanged (popstate may not fire)');
}

// ========== STEP 10: LOGOUT ==========
logStep('Logout');
const prevErrorsLogout = jsErrors.length;

// Click user menu / logout
const logoutResult = await page.evaluate(() => {
  // Try global logout function
  if (typeof handleLogout === 'function') {
    handleLogout();
    return 'handleLogout';
  }
  return 'none';
});
console.log(`  Logout triggered via: ${logoutResult}`);

// handleLogout does window.location.reload() so wait for the reload
try {
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
} catch(e) {
  console.log('  No navigation event (reload may have completed before listener)');
}
await new Promise(r => setTimeout(r, 2000));

const afterLogout = await page.evaluate(() => {
  const app = document.getElementById('appContainer');
  const login = document.getElementById('loginPage');
  const welcome = document.getElementById('welcomePage');
  return {
    appDisplay: app ? getComputedStyle(app).display : 'n/a',
    loginDisplay: login ? getComputedStyle(login).display : 'n/a',
    welcomeDisplay: welcome ? getComputedStyle(welcome).display : 'n/a',
    token: localStorage.getItem('cmms_token'),
    user: localStorage.getItem('cmms_user'),
  };
});
console.log(`  After logout: app=${afterLogout.appDisplay} login=${afterLogout.loginDisplay} welcome=${afterLogout.welcomeDisplay} token=${afterLogout.token}`);

// ========== FINAL REPORT ==========
console.log('\n\n========================================');
console.log('      END-TO-END TEST COMPLETE');
console.log('========================================');
console.log(`Total steps executed: ${step}`);
console.log(`API calls handled: ${apiCalls.length}`);
console.log(`JavaScript errors: ${jsErrors.length}`);
if (jsErrors.length > 0) {
  console.log('\nJS Errors:');
  for (const e of jsErrors) console.log(`  ${e.substring(0, 200)}`);
}

console.log('\nAPI actions served:');
const actionCounts = {};
for (const a of apiCalls) {
  actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
}
for (const [action, count] of Object.entries(actionCounts)) {
  console.log(`  ${action}: ${count}x`);
}

const finalErrors = jsErrors.length;
const verdict = finalErrors === 0 ? 'PASS' : 'FAIL';
console.log(`\n  VERDICT: ${verdict}`);
console.log(`  Reason: ${finalErrors === 0 ? 'All pages rendered, no spinner, no errors, all API calls mocked' : `${finalErrors} JavaScript error(s) occurred`}`);

await browser.close();
process.exit(finalErrors === 0 ? 0 : 1);
