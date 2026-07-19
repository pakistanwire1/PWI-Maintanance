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
  if (!out.PhotoURL && out.PhotoDriveID) {
    out.PhotoURL = drivePhotoUrl(out.PhotoDriveID);
  }
  var m = String(out.PhotoURL).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && out.PhotoURL.indexOf('lh3.googleusercontent.com') === -1) {
    out.PhotoURL = drivePhotoUrl(m[1]);
  }
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
  Logger.log('updateUser called: id=' + id);
  var incomingId = String(id || '').trim();
  var incomingEmail = String(data && data.Email || '').trim().toLowerCase();

  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  var matchedUser = null;

  if (incomingId) {
    for (var i = 0; i < users.length; i++) {
      if (String(users[i]['UserID'] || '').trim() === incomingId) {
        matchedUser = users[i];
        break;
      }
    }
  }

  if (!matchedUser && incomingEmail) {
    for (var j = 0; j < users.length; j++) {
      if (String(users[j]['Email'] || '').trim().toLowerCase() === incomingEmail) {
        matchedUser = users[j];
        break;
      }
    }
  }

  if (!matchedUser) {
    Logger.log('updateUser FAILED: no match for id="' + incomingId + '" email="' + incomingEmail + '"');
    throw new Error('User not found.');
  }

  var current = matchedUser;
  var resolvedId = current.UserID;
  if (data.Password && data.Password.trim() === '') delete data.Password;
  if (data.ConfirmPassword) delete data.ConfirmPassword;
  if (data.Email && data.Email !== current.Email) {
    for (var k = 0; k < users.length; k++) {
      if (users[k].Email === data.Email && users[k].UserID !== resolvedId) {
        throw new Error('Email "' + data.Email + '" already exists');
      }
    }
  }
  if (data.EmployeeID && data.EmployeeID !== current.EmployeeID) {
    for (var m = 0; m < users.length; m++) {
      if (users[m].EmployeeID === data.EmployeeID && users[m].UserID !== resolvedId) {
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
  var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'UserID', resolvedId, data);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.UPDATE, resolvedId, data.Name || current.Name, '',
      JSON.stringify(data).substring(0, 200), 'Success', 'User updated');
  } catch(e) {}
  if (permissionChanged) {
    try {
      createAuditLog(CONFIG.AUDIT_MODULES.PERMISSION, CONFIG.AUDIT_ACTIONS.PERMISSION_CHANGE, resolvedId, data.Name || current.Name, '',
        'Permissions updated', 'Success', 'User permissions changed');
    } catch(e) {}
  }
  return result.map(normalizeUser);
}

function deleteUser(id, email) {
  Logger.log('deleteUser called: id=' + id + ', email=' + email);
  console.log('deleteUser called:', { id: id, email: email });

  var incomingId = String(id || '').trim();
  var incomingEmail = String(email || '').trim().toLowerCase();

  Logger.log('deleteUser incomingId=' + incomingId + ', incomingEmail=' + incomingEmail);

  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  Logger.log('deleteUser total users in sheet: ' + users.length);

  var matchedUser = null;
  var matchedRow = -1;

  if (incomingId) {
    for (var i = 0; i < users.length; i++) {
      var rowId = String(users[i]['UserID'] || '').trim();
      if (rowId === incomingId) {
        matchedUser = users[i];
        matchedRow = i;
        Logger.log('deleteUser MATCH by UserID at row ' + (i + 2) + ': UserID=' + rowId + ', Name=' + users[i]['Name'] + ', Email=' + users[i]['Email']);
        break;
      }
    }
  }

  if (!matchedUser && incomingEmail) {
    Logger.log('deleteUser UserID lookup failed, trying Email fallback');
    for (var j = 0; j < users.length; j++) {
      var rowEmail = String(users[j]['Email'] || '').trim().toLowerCase();
      if (rowEmail === incomingEmail) {
        matchedUser = users[j];
        matchedRow = j;
        Logger.log('deleteUser MATCH by Email at row ' + (j + 2) + ': UserID=' + users[j]['UserID'] + ', Name=' + users[j]['Name'] + ', Email=' + rowEmail);
        break;
      }
    }
  }

  if (!matchedUser) {
    Logger.log('deleteUser FAILED: no match found. Searched id="' + incomingId + '", email="' + incomingEmail + '"');
    throw new Error('User not found.');
  }

  Logger.log('deleteUser matched: UserID=' + matchedUser.UserID + ', Name=' + matchedUser.Name + ', Email=' + matchedUser.Email + ', Status=' + matchedUser.Status);

  if (matchedUser.IsAdmin === 'TRUE') {
    Logger.log('deleteUser BLOCKED: user is admin (IsAdmin=TRUE)');
    throw new Error('Cannot delete an administrator account');
  }

  var resolvedId = matchedUser.UserID;
  ensureUserCols();
  deleteRow(CONFIG.SHEET_NAMES.USERS, 'UserID', resolvedId);
  Logger.log('deleteUser DELETED row for UserID=' + resolvedId + ', Name=' + matchedUser.Name);

  try {
    var currentEmail = Session.getActiveUser().getEmail();
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.DELETE, resolvedId, matchedUser.Name, '', 'Permanent delete by ' + currentEmail, 'Success', 'User permanently deleted');
  } catch(e) {
    Logger.log('deleteUser audit log error: ' + e.message);
  }

  var result = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  return result.map(normalizeUser);
}

function permanentlyDeleteUser(id, email) {
  Logger.log('permanentlyDeleteUser called: id=' + id + ', email=' + email);

  var incomingId = String(id || '').trim();
  var incomingEmail = String(email || '').trim().toLowerCase();

  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  var matchedUser = null;

  if (incomingId) {
    for (var i = 0; i < users.length; i++) {
      if (String(users[i]['UserID'] || '').trim() === incomingId) {
        matchedUser = users[i];
        break;
      }
    }
  }

  if (!matchedUser && incomingEmail) {
    for (var j = 0; j < users.length; j++) {
      if (String(users[j]['Email'] || '').trim().toLowerCase() === incomingEmail) {
        matchedUser = users[j];
        break;
      }
    }
  }

  if (!matchedUser) {
    Logger.log('permanentlyDeleteUser FAILED: no match for id="' + incomingId + '" email="' + incomingEmail + '"');
    throw new Error('User not found.');
  }

  if (matchedUser.IsAdmin === 'TRUE') throw new Error('Cannot delete an administrator account');

  var resolvedId = matchedUser.UserID;
  ensureUserCols();
  deleteRow(CONFIG.SHEET_NAMES.USERS, 'UserID', resolvedId);

  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.DELETE, resolvedId, matchedUser.Name, '', 'Permanent delete by ' + Session.getActiveUser().getEmail(), 'Success', 'User permanently deleted');
  } catch(e) {}

  var result = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  return result.map(normalizeUser);
}

function searchUsers(query) {
  var result = searchData(CONFIG.SHEET_NAMES.USERS, query);
  return result.map(normalizeUser);
}

function resetUserPassword(id, tempPassword, forceChange) {
  var incomingId = String(id || '').trim();
  Logger.log('resetUserPassword called: id=' + incomingId);

  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  var matchedUser = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i]['UserID'] || '').trim() === incomingId) {
      matchedUser = users[i];
      break;
    }
  }

  if (!matchedUser) {
    Logger.log('resetUserPassword FAILED: no match for id="' + incomingId + '"');
    throw new Error('User not found.');
  }

  var current = matchedUser;
  var resolvedId = current.UserID;
  if (!tempPassword || tempPassword.length < 6) throw new Error('Password must be at least 6 characters');
  var now = getCurrentTimestamp();
  var data = {
    Password: tempPassword,
    ForcePasswordChange: forceChange ? 'TRUE' : 'FALSE',
    UpdatedBy: Session.getActiveUser().getEmail(),
    UpdatedAt: now
  };
  ensureUserCols();
  var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'UserID', resolvedId, data);
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.UPDATE, resolvedId, current.Name, '',
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
  Logger.log('getUserDepartments called');
  try {
    var depts = getDepartmentList() || [];
    Logger.log('getUserDepartments raw count: ' + depts.length);

    if (depts.length === 0) {
      Logger.log('getUserDepartments sheet empty, attempting initDepartmentSheet');
      try {
        initDepartmentSheet();
      } catch(initErr) {
        Logger.log('getUserDepartments initDepartmentSheet ERROR: ' + initErr.message);
      }
      invalidateCache(CONFIG.SHEET_NAMES.DEPARTMENTS);
      depts = getDepartmentList() || [];
      Logger.log('getUserDepartments after init count: ' + depts.length);
    }

    var seen = {};
    var result = [];
    depts.forEach(function(d) {
      var name = String(d.Department || '').trim();
      if (name && !seen[name]) {
        seen[name] = true;
        result.push({ name: name, id: d.DepartmentID || d.DeptID || name });
      }
    });
    Logger.log('getUserDepartments returning ' + result.length + ' departments');
    if (result.length > 0) {
      Logger.log('getUserDepartments first 3: ' + JSON.stringify(result.slice(0, 3)));
    }
    return result;
  } catch(e) {
    Logger.log('getUserDepartments ERROR: ' + e.message);
    console.error('getUserDepartments ERROR:', e);
    return [];
  }
}

function getUserSections(department) {
  Logger.log('getUserSections called: department=' + department);
  try {
    var sections = getSectionList() || [];
    Logger.log('getUserSections raw count: ' + sections.length);

    if (sections.length === 0) {
      Logger.log('getUserSections sheet empty, attempting initSectionSheet');
      try {
        initSectionSheet();
      } catch(initErr) {
        Logger.log('getUserSections initSectionSheet ERROR: ' + initErr.message);
      }
      invalidateCache(CONFIG.SHEET_NAMES.SECTIONS);
      sections = getSectionList() || [];
      Logger.log('getUserSections after init count: ' + sections.length);
    }

    if (department) {
      Logger.log('getUserSections filtering by department: ' + department);
      var depts = getDepartmentList() || [];
      Logger.log('getUserSections depts count: ' + depts.length);
      var targetSectionIds = [];
      for (var i = 0; i < depts.length; i++) {
        var deptName = String(depts[i].Department || '').trim();
        if (deptName === String(department).trim() && depts[i].SectionID) {
          targetSectionIds.push(String(depts[i].SectionID).trim());
          Logger.log('getUserSections matched dept row ' + i + ': Department=' + deptName + ', SectionID=' + depts[i].SectionID);
        }
      }
      Logger.log('getUserSections collected ' + targetSectionIds.length + ' SectionIDs: ' + targetSectionIds.join(', '));
      if (targetSectionIds.length > 0) {
        var beforeCount = sections.length;
        sections = sections.filter(function(s) {
          return targetSectionIds.indexOf(String(s.SectionID || '').trim()) > -1;
        });
        Logger.log('getUserSections filtered from ' + beforeCount + ' to ' + sections.length + ' sections');
      } else {
        Logger.log('getUserSections WARNING: no SectionIDs found for department=' + department + ', returning all sections');
      }
    } else {
      Logger.log('getUserSections no department filter, returning all sections');
    }

    var seen = {};
    var result = [];
    sections.forEach(function(s) {
      var name = String(s.Section || '').trim();
      if (name && !seen[name]) {
        seen[name] = true;
        result.push({ name: name, id: s.SectionID || name });
      }
    });
    Logger.log('getUserSections returning ' + result.length + ' sections');
    if (result.length > 0) {
      Logger.log('getUserSections first 3: ' + JSON.stringify(result.slice(0, 3)));
    }
    return result;
  } catch(e) {
    Logger.log('getUserSections ERROR: ' + e.message);
    console.error('getUserSections ERROR:', e);
    return [];
  }
}

function drivePhotoUrl(fileId) {
  return 'https://lh3.googleusercontent.com/d/' + fileId;
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
  var directUrl = drivePhotoUrl(fileId);
  return JSON.stringify({ driveId: fileId, url: directUrl });
}

function deleteUserPhoto(driveId) {
  if (!driveId) return;
  try {
    var file = DriveApp.getFileById(driveId);
    if (file) file.setTrashed(true);
  } catch(e) {
    Logger.log('deleteUserPhoto: could not trash file ' + driveId + ': ' + e.message);
  }
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
