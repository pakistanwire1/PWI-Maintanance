var USER_COLS = [
  'UserID','EmployeeID','Name','Email','Password','Mobile',
  'Department','Section','Designation','Role','Status','JoiningDate',
  'PhotoDriveID','PhotoURL',
  'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
  'CanReviewPendingJobCard','CanViewAllJobCards',
  'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
  'CanManagePM','CanManageBreakdown','CanManageInventory',
  'CanViewDashboard','CanViewReports','CanExportReports',
  'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig',
  'IsAdmin',
  'ForcePasswordChange',
  'LastLogin','LastLoginDate','LastLoginTime','LastLoginIP',
  'CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'
];

function ensureUserCols() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.USERS);
  if (!sheet) return;
  var headers = sheet.getDataRange().getValues()[0] || [];
  var missing = [];
  USER_COLS.forEach(function(h) {
    if (headers.indexOf(h) === -1) missing.push(h);
  });
  if (missing.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
  SpreadsheetApp.flush();
}

function initUserSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = CONFIG.SHEET_NAMES.USERS;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasHeaders = data.length > 0 && data[0].join('').length > 0;
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, USER_COLS.length).setValues([USER_COLS]);
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    USER_COLS.forEach(function(h) {
      if (existingHeaders.indexOf(h) === -1) missingHeaders.push(h);
    });
    if (missingHeaders.length > 0) {
      var startCol = existingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }
  var headerRange = sheet.getRange(1, 1, 1, USER_COLS.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, USER_COLS.length);
  return { status: 'ok', message: sheetName + ' initialized', sheet: sheetName };
}

function normalizeUser(u) {
  if (!u) return u;
  var out = {};
  USER_COLS.forEach(function(c) { out[c] = u[c] || ''; });
  out.UserID = out.UserID || '';
  out.EmployeeID = out.EmployeeID || '';
  out.Name = out.Name || '';
  out.Email = out.Email || '';
  out.Password = out.Password || '';
  out.Mobile = out.Mobile || '';
  out.Department = out.Department || '';
  out.Section = out.Section || '';
  out.Designation = out.Designation || '';
  out.Role = out.Role || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.JoiningDate = out.JoiningDate || '';
  out.PhotoDriveID = out.PhotoDriveID || '';
  out.PhotoURL = out.PhotoURL || '';
  var m = String(out.PhotoURL).match(/\/file\/d\/([^/]+)/);
  if (m) out.PhotoURL = 'https://drive.google.com/uc?export=view&id=' + m[1];
  ['CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
   'CanReviewPendingJobCard','CanViewAllJobCards',
   'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
   'CanManagePM','CanManageBreakdown','CanManageInventory',
   'CanViewDashboard','CanViewReports','CanExportReports',
   'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig',
   'IsAdmin'].forEach(function(p) {
    out[p] = out[p] || 'FALSE';
  });
  out.ForcePasswordChange = out.ForcePasswordChange || 'FALSE';
  out.LastLogin = out.LastLogin || '';
  out.LastLoginDate = out.LastLoginDate || '';
  out.LastLoginTime = out.LastLoginTime || '';
  out.LastLoginIP = out.LastLoginIP || '';
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  return out;
}

function getUsers() {
  var data = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  return data.map(normalizeUser);
}

function getUser(id) {
  var record = getRecordById(CONFIG.SHEET_NAMES.USERS, 'UserID', id);
  return normalizeUser(record);
}

function addUser(data) {
  var errors = [];
  if (!data.EmployeeID) errors.push('Employee ID is required');
  if (!data.Name) errors.push('Name is required');
  if (!data.Email) errors.push('Email is required');
  if (!data.Department) errors.push('Department is required');
  if (!data.Password) errors.push('Password is required');
  if (data.Password && data.ConfirmPassword && data.Password !== data.ConfirmPassword) {
    errors.push('Passwords do not match');
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));
  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  for (var i = 0; i < users.length; i++) {
    if (users[i].Email === data.Email) throw new Error('Email "' + data.Email + '" already exists');
    if (users[i].EmployeeID === data.EmployeeID) throw new Error('Employee ID "' + data.EmployeeID + '" already exists');
  }
  data.UserID = generateUserId();
  data.Status = data.Status || CONFIG.STATUS.ACTIVE;
  data.Role = data.Role || 'Viewer';
  var now = getCurrentTimestamp();
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = now;
  data.UpdatedBy = data.CreatedBy;
  data.UpdatedAt = now;
  ['CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
   'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
   'CanManagePM','CanManageBreakdown','CanManageInventory',
   'CanViewDashboard','CanViewReports','CanExportReports',
   'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig',
   'IsAdmin'].forEach(function(p) {
    if (data[p] === undefined || data[p] === null) data[p] = 'FALSE';
  });
  if (data.ForcePasswordChange === undefined) data.ForcePasswordChange = 'FALSE';
  delete data.ConfirmPassword;
  ensureUserCols();
  var result = addRow(CONFIG.SHEET_NAMES.USERS, data);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.CREATE, data.UserID, data.Name, '',
      'Role: ' + data.Role + ', Dept: ' + data.Department, 'Success', 'User created');
  } catch(e) {}
  return result.map(normalizeUser);
}

function updateUser(id, data) {
  var current = getUser(id);
  if (!current || !current.UserID) throw new Error('User not found: ' + id);
  if (data.Password && data.Password.trim() === '') delete data.Password;
  if (data.ConfirmPassword) delete data.ConfirmPassword;
  if (data.Email && data.Email !== current.Email) {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    for (var i = 0; i < users.length; i++) {
      if (users[i].Email === data.Email && users[i].UserID !== id) {
        throw new Error('Email "' + data.Email + '" already exists');
      }
    }
  }
  if (data.EmployeeID && data.EmployeeID !== current.EmployeeID) {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    for (var i = 0; i < users.length; i++) {
      if (users[i].EmployeeID === data.EmployeeID && users[i].UserID !== id) {
        throw new Error('Employee ID "' + data.EmployeeID + '" already exists');
      }
    }
  }
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  var permissionChanged = false;
  ['CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
   'CanReviewPendingJobCard','CanViewAllJobCards',
   'CanManageSections','CanManageDepartments','CanManageMachines','CanManageAssets','CanManageTechnicians','CanManageSpareParts',
   'CanManagePM','CanManageBreakdown','CanManageInventory',
   'CanViewDashboard','CanViewReports','CanExportReports',
   'CanManageUsers','CanManageSettings','CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp','CanBackupRestore','CanSystemConfig'].forEach(function(p) {
    if (data[p] !== undefined && data[p] !== current[p]) permissionChanged = true;
  });
  ensureUserCols();
  var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'UserID', id, data);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.UPDATE, id, data.Name || current.Name, '',
      JSON.stringify(data).substring(0, 200), 'Success', 'User updated');
  } catch(e) {}
  if (permissionChanged) {
    try {
      createAuditLog(CONFIG.AUDIT_MODULES.PERMISSION, CONFIG.AUDIT_ACTIONS.PERMISSION_CHANGE, id, data.Name || current.Name, '',
        'Permissions updated', 'Success', 'User permissions changed');
    } catch(e) {}
  }
  return result.map(normalizeUser);
}

function deleteUser(id, email) {
  var resolvedId = id;
  if (!resolvedId && email) {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    for (var i = 0; i < users.length; i++) {
      if (String(users[i]['Email']).toLowerCase() === String(email).toLowerCase()) {
        resolvedId = users[i]['UserID'];
        break;
      }
    }
  }
  if (!resolvedId) {
    Logger.log('deleteUser: no resolvedId (id=' + id + ', email=' + email + ')');
    throw new Error('Please select a user first.');
  }
  var current = getUser(resolvedId);
  if (!current || !current.UserID) {
    Logger.log('deleteUser: user not found after resolve (resolvedId=' + resolvedId + ')');
    throw new Error('User not found.');
  }
  if (current.IsAdmin === 'TRUE') throw new Error('Cannot delete an administrator account');
  var now = getCurrentTimestamp();
  var data = { Status: 'Inactive', UpdatedBy: Session.getActiveUser().getEmail(), UpdatedAt: now };
  ensureUserCols();
  var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'UserID', resolvedId, data);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.DELETE, resolvedId, current.Name, 'Status changed to Inactive', 'Soft delete by ' + data.UpdatedBy, 'Success', 'User deactivated');
  } catch(e) {}
  return result.map(normalizeUser);
}

function permanentlyDeleteUser(id, email) {
  var resolvedId = id;
  if (!resolvedId && email) {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    for (var i = 0; i < users.length; i++) {
      if (String(users[i]['Email']).toLowerCase() === String(email).toLowerCase()) {
        resolvedId = users[i]['UserID'];
        break;
      }
    }
  }
  if (!resolvedId) throw new Error('Please select a user first.');
  var current = getUser(resolvedId);
  if (!current || !current.UserID) throw new Error('User not found.');
  if (current.IsAdmin === 'TRUE') throw new Error('Cannot delete an administrator account');
  ensureUserCols();
  var result = deleteRow(CONFIG.SHEET_NAMES.USERS, 'UserID', resolvedId);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.DELETE, resolvedId, current.Name, '', 'Permanent delete by ' + Session.getActiveUser().getEmail(), 'Success', 'User permanently deleted');
  } catch(e) {}
  return result.map(normalizeUser);
}

function searchUsers(query) {
  var result = searchData(CONFIG.SHEET_NAMES.USERS, query);
  return result.map(normalizeUser);
}

function resetUserPassword(id, tempPassword, forceChange) {
  var current = getUser(id);
  if (!current || !current.UserID) throw new Error('User not found: ' + id);
  if (!tempPassword || tempPassword.length < 6) throw new Error('Password must be at least 6 characters');
  var now = getCurrentTimestamp();
  var data = {
    Password: tempPassword,
    ForcePasswordChange: forceChange ? 'TRUE' : 'FALSE',
    UpdatedBy: Session.getActiveUser().getEmail(),
    UpdatedAt: now
  };
  ensureUserCols();
  var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'UserID', id, data);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.UPDATE, id, current.Name, '',
      'Password reset by ' + data.UpdatedBy, 'Success', 'Password reset');
  } catch(e) {}
  return result.map(normalizeUser);
}

function updateUserLastLogin(userId, ip) {
  try {
    var now = new Date();
    var tz = Session.getScriptTimeZone();
    var dateStr = Utilities.formatDate(now, tz, 'dd MMM yyyy');
    var timeStr = Utilities.formatDate(now, tz, 'hh:mm a');
    var ts = dateStr + ' ' + timeStr;
    var data = {
      LastLogin: ts,
      LastLoginDate: dateStr,
      LastLoginTime: timeStr,
      LastLoginIP: ip || ''
    };
    ensureUserCols();
    updateRow(CONFIG.SHEET_NAMES.USERS, 'UserID', userId, data);
  } catch(e) {
    Logger.log('updateUserLastLogin ERROR for user ' + userId + ': ' + e.message);
    console.error('updateUserLastLogin ERROR:', e);
  }
}

function getUserDepartments() {
  try {
    var depts = getDepartmentList() || [];
    if (depts.length === 0) {
      try { initDepartmentSheet(); } catch(initErr) {}
      depts = getDepartmentList() || [];
    }
    var seen = {};
    var result = [];
    depts.forEach(function(d) {
      var name = d.Department || '';
      if (name && !seen[name]) {
        seen[name] = true;
        result.push({ name: name, id: d.DepartmentID || d.DeptID || name });
      }
    });
    return result;
  } catch(e) {
    Logger.log('getUserDepartments ERROR: ' + e.message);
    console.error('getUserDepartments ERROR: ' + e.message);
    return [];
  }
}

function getUserSections(department) {
  try {
    var sections = getSectionList() || [];
    if (sections.length === 0) {
      try { initSectionSheet(); } catch(initErr) {}
      sections = getSectionList() || [];
    }
    if (department) {
      var depts = getDepartmentList() || [];
      for (var i = 0; i < depts.length; i++) {
        if (depts[i].Department === department && depts[i].SectionID) {
          var targetSectionId = depts[i].SectionID;
          sections = sections.filter(function(s) {
            return s.SectionID === targetSectionId;
          });
          break;
        }
      }
    }
    var seen = {};
    var result = [];
    sections.forEach(function(s) {
      var name = s.Section || '';
      if (name && !seen[name]) {
        seen[name] = true;
        result.push({ name: name, id: s.SectionID || name });
      }
    });
    return result;
  } catch(e) {
    Logger.log('getUserSections ERROR: ' + e.message);
    console.error('getUserSections ERROR: ' + e.message);
    return [];
  }
}

function uploadUserPhoto(base64Data, employeeId) {
  if (!base64Data) return '';
  var folderName = 'CMMS';
  var subFolderName = 'UserPhotos';
  var parentFolders = DriveApp.getFoldersByName(folderName);
  var parentFolder;
  if (parentFolders.hasNext()) {
    parentFolder = parentFolders.next();
  } else {
    parentFolder = DriveApp.createFolder(folderName);
  }
  var subFolders = parentFolder.getFoldersByName(subFolderName);
  var folder;
  if (subFolders.hasNext()) {
    folder = subFolders.next();
  } else {
    folder = parentFolder.createFolder(subFolderName);
  }
  var mimeType = 'image/jpeg';
  var parts = base64Data.split(',');
  if (parts.length > 1) {
    var match = parts[0].match(/:(.*?);/);
    if (match) mimeType = match[1];
  } else {
    parts = ['', base64Data];
  }
  var extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  var ext = extMap[mimeType] || 'jpg';
  var fileName = employeeId + '.' + ext;
  var existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    var existingFile = existingFiles.next();
    existingFile.setTrashed(true);
  }
  var data = Utilities.base64Decode(parts[1]);
  var blob = Utilities.newBlob(data, mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileId = file.getId();
  var directUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
  return JSON.stringify({ driveId: fileId, url: directUrl });
}

function exportUsersToExcel() {
  var data = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  var ss = SpreadsheetApp.create('Users_Export_' + getTodayDateString());
  var sheet = ss.getActiveSheet();
  var headers = USER_COLS;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (data.length > 0) {
    var rows = [];
    data.forEach(function(u) {
      var row = [];
      headers.forEach(function(h) { row.push(u[h] || ''); });
      rows.push(row);
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.autoResizeColumns(1, headers.length);
  return ss.getUrl();
}
