var Constants = {
  MACHINE_TYPES: [
    'Pump', 'Motor', 'Compressor', 'Conveyor', 'Gearbox', 'Fan', 'Mixer', 'Valve',
    'Heat Exchanger', 'Boiler', 'Chiller', 'Generator', 'Transformer', 'Crane',
    'Hydraulic Press', 'CNC Machine', 'Welding Machine', 'Air Handler', 'Cooling Tower'
  ],

  SKILLS: [
    'Mechanical', 'Electrical', 'Plumbing', 'HVAC', 'Instrumentation',
    'Welding', 'Carpentry', 'Painting', 'General'
  ],

  TECH_SKILLS: [
    'Mechanical', 'Electrical', 'Plumbing', 'HVAC', 'Instrumentation',
    'Welding', 'Carpentry', 'Painting', 'General'
  ],

  SHIFTS: [
    { id: '1', name: 'Shift 1', time: '06:00 - 14:00' },
    { id: '2', name: 'Shift 2', time: '14:00 - 22:00' },
    { id: '3', name: 'Shift 3', time: '22:00 - 06:00' }
  ],

  TECH_SHIFTS: [
    { id: '1', name: 'Shift 1', time: '06:00 - 14:00' },
    { id: '2', name: 'Shift 2', time: '14:00 - 22:00' },
    { id: '3', name: 'Shift 3', time: '22:00 - 06:00' }
  ],

  PRIORITY_LEVELS: [
    { id: 1, name: 'Low', color: '#6c757d' },
    { id: 2, name: 'Medium', color: '#ffc107' },
    { id: 3, name: 'High', color: '#fd7e14' },
    { id: 4, name: 'Critical', color: '#dc3545' }
  ],

  ASSET_TYPES: [
    'Fixed Asset', 'Moveable Asset', 'Consumable Asset', 'IT Asset'
  ],

  ASSET_CATEGORIES: [
    'Mechanical', 'Electrical', 'Instrumentation', 'Civil', 'IT Equipment', 'Safety Equipment'
  ],

  ASSET_STATUS: [
    { id: 'Active', name: 'Active' },
    { id: 'Inactive', name: 'Inactive' },
    { id: 'In Repair', name: 'In Repair' },
    { id: 'Disposed', name: 'Disposed' }
  ],

  USER_ROLES: [
    { id: 'Administrator', name: 'Administrator' },
    { id: 'Manager', name: 'Manager' },
    { id: 'Supervisor', name: 'Supervisor' },
    { id: 'Engineer', name: 'Engineer' },
    { id: 'Technician', name: 'Technician' },
    { id: 'Operator', name: 'Operator' },
    { id: 'Viewer', name: 'Viewer' }
  ],

  MACHINE_STATUSES: [
    { id: 'Active', name: 'Active' },
    { id: 'Inactive', name: 'Inactive' },
    { id: 'Under Maintenance', name: 'Under Maintenance' },
    { id: 'Retired', name: 'Retired' }
  ]
};
