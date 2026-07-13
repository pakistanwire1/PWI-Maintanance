function getPermValue(val) {
  return val === true || val === 'Yes' || val === 'true' || val === 'TRUE' || val === 'yes';
}

function initializeUserMaster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Users';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(sheetName + ' sheet created.');
  } else {
    Logger.log(sheetName + ' sheet already exists - not recreated.');
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var hasHeaders = data.length > 0 && data[0].join('').length > 0;
  var userCols = CONFIG.USER_FIELDS;
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, userCols.length).setValues([userCols]);
    SpreadsheetApp.flush();
    Logger.log('Headers created: ' + userCols.join(', '));
  } else {
    var existingHeaders = data[0];
    var missingHeaders = [];
    userCols.forEach(function(h) {
      if (existingHeaders.indexOf(h) === -1) {
        missingHeaders.push(h);
      }
    });
    if (missingHeaders.length > 0) {
      var startCol = existingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
      SpreadsheetApp.flush();
      Logger.log('Missing headers added: ' + missingHeaders.join(', '));
    } else {
      Logger.log('Headers already exist - none missing.');
    }
  }
  range = sheet.getDataRange();
  data = range.getValues();
  var existingRows = 0;
  for (var i = 1; i < data.length; i++) {
    var rowHasData = false;
    for (var c = 0; c < data[i].length; c++) {
      if (data[i][c] !== '' && data[i][c] !== null && data[i][c] !== undefined) {
        rowHasData = true;
        break;
      }
    }
    if (rowHasData) existingRows++;
  }
  if (existingRows > 0) {
    Logger.log('Sample data already exists (' + existingRows + ' records). Skipping insert.');
  } else {
    var now = new Date();
    var pad = function(n) { return ('0' + n).slice(-2); };
    var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    var sampleRows = [];
    CONFIG.DEFAULT_USERS.forEach(function(u) {
      var row = [];
      userCols.forEach(function(c) {
        if (c === 'CreatedAt' || c === 'UpdatedAt') {
          row.push(ts);
        } else if (c === 'CreatedBy' || c === 'UpdatedBy') {
          row.push('Admin');
        } else {
          row.push(u[c] || '');
        }
      });
      sampleRows.push(row);
    });
    sheet.getRange(2, 1, sampleRows.length, userCols.length).setValues(sampleRows);
    SpreadsheetApp.flush();
    Logger.log('Sample Data Inserted');
  }
  Logger.log('Headers Updated');

  var headerRange = sheet.getRange(1, 1, 1, userCols.length);
  headerRange.setBackground('#1F4E78');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  range = sheet.getDataRange();
  var lastRow = sheet.getLastRow();
  var fullRange = sheet.getRange(1, 1, lastRow, userCols.length);
  fullRange.setBorder(true, true, true, true, true, true);

  if (lastRow > 1) {
    for (var ri = 2; ri <= lastRow; ri++) {
      var bg = (ri % 2 === 0) ? '#F2F2F2' : '#FFFFFF';
      sheet.getRange(ri, 1, 1, userCols.length).setBackground(bg);
      sheet.setRowHeight(ri, 24);
    }
    var idCol = userCols.indexOf('UserID') + 1;
    if (idCol > 0) sheet.getRange(2, idCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var empCol = userCols.indexOf('EmployeeID') + 1;
    if (empCol > 0) sheet.getRange(2, empCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var statusCol = userCols.indexOf('Status') + 1;
    if (statusCol > 0) sheet.getRange(2, statusCol, lastRow - 1, 1).setHorizontalAlignment('center');
    var createdAtCol = userCols.indexOf('CreatedAt') + 1;
    if (createdAtCol > 0) sheet.getRange(2, createdAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
    var updatedAtCol = userCols.indexOf('UpdatedAt') + 1;
    if (updatedAtCol > 0) sheet.getRange(2, updatedAtCol, lastRow - 1, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  }

  for (var ci = 0; ci < userCols.length; ci++) {
    sheet.autoResizeColumn(ci + 1);
  }
  SpreadsheetApp.flush();
  Logger.log('Formatting Applied');
  Logger.log('Users Sheet Updated');
  Logger.log('User Master Completed');
  return { status: 'ok', message: sheetName + ' initialized with ' + (existingRows || CONFIG.DEFAULT_USERS.length) + ' records.', sheet: sheetName, columns: userCols.length, records: existingRows || CONFIG.DEFAULT_USERS.length };
}

function initUsersSheet() {
  initializeUserMaster();
}

function normalizeUser(u) {
  if (!u) return u;
  var out = {};
  CONFIG.USER_FIELDS.forEach(function(c) { out[c] = u[c] || ''; });
  out.UserID = out.UserID || '';
  out.EmployeeID = out.EmployeeID || '';
  out.Name = out.Name || '';
  out.Email = out.Email || '';
  out.Mobile = out.Mobile || '';
  out.Department = out.Department || '';
  out.Section = out.Section || '';
  out.Designation = out.Designation || '';
  out.Role = out.Role || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.LastLogin = out.LastLogin || '';
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  CONFIG.PERMISSION_FIELDS.forEach(function(p) {
    out[p] = out[p] || 'FALSE';
  });
  return out;
}

function loginUser(email, password) {
  Logger.log('loginUser() called: ' + email);
  console.log('loginUser() called: ' + email);
  try {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS);
    Logger.log('loginUser() found ' + users.length + ' users');
    console.log('loginUser() found ' + users.length + ' users');
    for (var i = 0; i < users.length; i++) {
      if (users[i].Email === email && users[i].Password === password) {
        if (users[i].Status === CONFIG.STATUS.ACTIVE) {
          var user = users[i];
          Logger.log('loginUser(): raw user keys=' + Object.keys(user).join(','));
          console.log('loginUser(): raw user keys=' + Object.keys(user).join(','));
          try { createAuditLog(CONFIG.AUDIT_MODULES.LOGIN, CONFIG.AUDIT_ACTIONS.LOGIN, '', user.Name || email, '', 'Role: ' + (user.Role || ''), 'Success', 'User logged in'); } catch(e) {}
          return {
            success: true,
            user: {
              email: user.Email,
              name: user.Name,
              role: user.Role,
              department: user.Department || '',
              designation: user.Designation || '',
              photoURL: user.PhotoURL || '',
              canOpenJobCard: getPermValue(user.CanOpenJobCard),
              canStartJobCard: getPermValue(user.CanStartJobCard),
              canCloseJobCard: getPermValue(user.CanCloseJobCard),
              canApproveJobCard: getPermValue(user.CanApproveJobCard),
              canReviewPendingJobCard: getPermValue(user.CanReviewPendingJobCard),
              canViewAllJobCards: getPermValue(user.CanViewAllJobCards),
              canManageMachines: getPermValue(user.CanManageMachines),
              canManageAssets: getPermValue(user.CanManageAssets),
              canManageSpareParts: getPermValue(user.CanManageSpareParts),
              canManagePM: getPermValue(user.CanManagePM),
              canViewReports: getPermValue(user.CanViewReports),
              canManageUsers: getPermValue(user.CanManageUsers),
              isSystemAdmin: getPermValue(user.IsAdmin)
            }
          };
        } else {
          return { success: false, message: 'Account is ' + users[i].Status.toLowerCase() + '. Contact administrator.' };
        }
      }
    }
    return { success: false, message: 'Invalid email or password.' };
  } catch (e) {
    return handleError('loginUser', e);
  }
}

function checkEmailExists(email) {
  try {
    var users = getAllData(CONFIG.SHEET_NAMES.USERS);
    for (var i = 0; i < users.length; i++) {
      if (users[i].Email === email) {
        return { exists: true };
      }
    }
    return { exists: false };
  } catch (e) {
    return { exists: false };
  }
}

function generateResetToken(email) {
  Logger.log('generateResetToken() called: ' + email);
  console.log('generateResetToken() called: ' + email);
  try {
    if (!email) return { success: false, message: 'Email is required.' };
    var users = getAllData(CONFIG.SHEET_NAMES.USERS);
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].Email === email) {
        user = users[i];
        break;
      }
    }
    if (!user) return { success: false, message: 'Email not registered.' };
    var token = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var j = 0; j < 20; j++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    var expiry = new Date(Date.now() + 30 * 60 * 1000);
    var props = PropertiesService.getScriptProperties();
    props.setProperty('reset_token_' + email, token);
    props.setProperty('reset_token_expiry_' + email, expiry.toISOString());
    props.setProperty('reset_token_used_' + email, 'false');
    Logger.log('generateResetToken() token generated for: ' + email);
    console.log('generateResetToken() token generated for: ' + email);
    try {
      emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.PASSWORD_RESET, {
        userId: user.UserID || '',
        name: user.Name || '',
        email: email,
        tempPassword: token
      }, email);
      Logger.log('generateResetToken() email sent to: ' + email);
      console.log('generateResetToken() email sent to: ' + email);
    } catch (emailErr) {
      Logger.log('generateResetToken() email send failed (storing token anyway): ' + emailErr.message);
      console.log('generateResetToken() email send failed: ' + emailErr.message);
    }
    return { success: true, message: 'A reset token has been sent to your email.' };
  } catch (e) {
    Logger.log('generateResetToken() ERROR: ' + e.message + ' stack=' + e.stack);
    console.log('generateResetToken() ERROR: ' + e.message);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

function resetPasswordWithToken(email, token, newPassword) {
  Logger.log('resetPasswordWithToken() called: ' + email);
  console.log('resetPasswordWithToken() called: ' + email);
  try {
    if (!email || !token || !newPassword) {
      return { success: false, message: 'Email, token, and new password are required.' };
    }
    if (newPassword.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }
    var props = PropertiesService.getScriptProperties();
    var storedToken = props.getProperty('reset_token_' + email);
    var expiryStr = props.getProperty('reset_token_expiry_' + email);
    var used = props.getProperty('reset_token_used_' + email);
    if (!storedToken || storedToken !== token) {
      return { success: false, message: 'Invalid reset token.' };
    }
    if (used === 'true') {
      return { success: false, message: 'Token has already been used.' };
    }
    if (expiryStr) {
      var expiry = new Date(expiryStr);
      if (Date.now() > expiry.getTime()) {
        props.deleteProperty('reset_token_' + email);
        props.deleteProperty('reset_token_expiry_' + email);
        props.deleteProperty('reset_token_used_' + email);
        return { success: false, message: 'Reset token has expired. Please request a new one.' };
      }
    }
    var users = getAllData(CONFIG.SHEET_NAMES.USERS);
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].Email === email) {
        user = users[i];
        break;
      }
    }
    if (!user) return { success: false, message: 'User not found.' };
    updateRow(CONFIG.SHEET_NAMES.USERS, 'Email', email, {
      Password: newPassword,
      UpdatedBy: email,
      UpdatedAt: getCurrentTimestamp()
    });
    props.setProperty('reset_token_used_' + email, 'true');
    try {
      createAuditLog(CONFIG.AUDIT_MODULES.LOGIN, 'Password Reset', '', user.Name || email, '', '', 'Success', 'Password reset via email token');
    } catch(e) {}
    Logger.log('resetPasswordWithToken() SUCCESS for: ' + email);
    console.log('resetPasswordWithToken() SUCCESS for: ' + email);
    return { success: true, message: 'Password reset successfully.' };
  } catch (e) {
    Logger.log('resetPasswordWithToken() ERROR: ' + e.message + ' stack=' + e.stack);
    console.log('resetPasswordWithToken() ERROR: ' + e.message);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

function checkSession() {
  Logger.log('checkSession() called');
  console.log('checkSession() called');
  var email = Session.getActiveUser().getEmail();
  Logger.log('checkSession() email: "' + email + '"');
  console.log('checkSession() email: "' + email + '"');
  if (email) {
    Logger.log('checkSession() returning loggedIn: true');
    console.log('checkSession() returning loggedIn: true');
    return { loggedIn: true, email: email };
  }
  Logger.log('checkSession() returning loggedIn: false');
  console.log('checkSession() returning loggedIn: false');
  return { loggedIn: false };
}

function validateAppSession(sessionEmail) {
  Logger.log('validateAppSession() called: ' + sessionEmail);
  console.log('validateAppSession() called: ' + sessionEmail);
  try {
    var googleEmail = Session.getActiveUser().getEmail();
    if (!googleEmail) {
      return { valid: false, message: 'Google session expired' };
    }
    if (sessionEmail && sessionEmail !== googleEmail) {
      return { valid: false, message: 'Session email mismatch' };
    }
    var users = getAllData(CONFIG.SHEET_NAMES.USERS);
    for (var i = 0; i < users.length; i++) {
      if (users[i].Email === googleEmail && users[i].Status === CONFIG.STATUS.ACTIVE) {
        return { valid: true, message: 'Session valid' };
      }
    }
    return { valid: false, message: 'User not found or inactive' };
  } catch (e) {
    Logger.log('validateAppSession() ERROR: ' + e.message);
    return { valid: false, message: 'Session validation error' };
  }
}

function getUsers() {
  var data = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  return data;
}

function addUser(data) {
  Logger.log('addUser() called: email=' + data.Email + ', data keys=' + Object.keys(data).join(','));
  console.log('addUser() called: email=' + data.Email + ', data keys=' + Object.keys(data).join(','));
  try {
    var errors = validateUserData(data);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
    var dupCheck = checkDuplicateField(CONFIG.SHEET_NAMES.USERS, 'Email', data.Email);
    if (dupCheck) {
      throw new Error('Email "' + data.Email + '" already exists.');
    }
    if (data.EmployeeID) {
      var empCheck = checkDuplicateField(CONFIG.SHEET_NAMES.USERS, 'EmployeeID', data.EmployeeID);
      if (empCheck) {
        throw new Error('Employee ID "' + data.EmployeeID + '" already exists.');
      }
    }
    data.UserID = generateUserId();
    data.Status = data.Status || CONFIG.STATUS.ACTIVE;
    data.CreatedBy = Session.getActiveUser().getEmail();
    data.CreatedAt = getCurrentTimestamp();
    data.UpdatedBy = data.CreatedBy;
    data.UpdatedAt = data.CreatedAt;
    CONFIG.PERMISSION_FIELDS.forEach(function(p) {
      if (data[p] === undefined || data[p] === null) data[p] = 'FALSE';
    });
    var result = addRow(CONFIG.SHEET_NAMES.USERS, data);
    logActivity('Add User', data.Email);
    Logger.log('addUser() SUCCESS: email=' + data.Email + ', result length=' + result.length);
    console.log('addUser() SUCCESS: email=' + data.Email);
    try { createNotification('New User Created: ' + (data.Name || data.Email), 'User ' + (data.Name || data.Email) + ' has been created with role ' + (data.Role || '') + '.', CONFIG.NOTIFICATION_MODULES.USER, CONFIG.PRIORITY.LOW, data.CreatedBy, data.Email, "navigateTo('settings')"); } catch(e) {}
    try { createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.CREATE, data.UserID, data.Name || data.Email, '', 'Role: ' + (data.Role || '') + ', Dept: ' + (data.Department || ''), 'Success', 'User created'); } catch(e) {}
    try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.USER_CREATED, { userId: data.UserID || '', name: data.Name || '', email: data.Email || '', role: data.Role || '', department: data.Department || '', designation: data.Designation || '', tempPassword: data.Password || '' }); } catch(e) {}
    return result;
  } catch (e) {
    Logger.log('addUser() ERROR: email=' + data.Email + ', message=' + e.message + ' stack=' + e.stack);
    console.log('addUser() ERROR: email=' + data.Email + ', message=' + e.message);
    throw e;
  }
}

function updateUser(email, data) {
  Logger.log('updateUser() called: email=' + email + ', data keys=' + Object.keys(data).join(',') + ', data=' + JSON.stringify(data));
  console.log('updateUser() called: email=' + email + ', data keys=' + Object.keys(data).join(','));
  try {
    if (data.Password && data.Password.trim() === '') {
      delete data.Password;
    }
    var oldUser = getRecordById(CONFIG.SHEET_NAMES.USERS, 'Email', email);
    data.UpdatedBy = Session.getActiveUser().getEmail();
    data.UpdatedAt = getCurrentTimestamp();
    var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'Email', email, data);
    logActivity('Update User', email);
    Logger.log('updateUser() SUCCESS: email=' + email + ', result length=' + result.length);
    console.log('updateUser() SUCCESS: email=' + email);
    try { createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.UPDATE, email, data.Name || (oldUser ? oldUser.Name : ''), '', JSON.stringify(data).substring(0, 200), 'Success', 'User updated'); } catch(e) {}
    if (data.Password && oldUser) {
      try { emailSendNotification(CONFIG.EMAIL_TEMPLATE_TYPES.PASSWORD_RESET, { userId: oldUser.UserID || '', name: data.Name || oldUser.Name || '', email: email, tempPassword: data.Password }); } catch(e) {}
    }
    if (oldUser && data.Role && data.Role !== oldUser.Role) {
      try { createAuditLog(CONFIG.AUDIT_MODULES.PERMISSION, CONFIG.AUDIT_ACTIONS.PERMISSION_CHANGE, email, oldUser.Name || email, 'Role: ' + (oldUser.Role || ''), 'Role: ' + (data.Role || ''), 'Success', 'User role changed from ' + (oldUser.Role || 'None') + ' to ' + (data.Role || 'None')); } catch(e) {}
    }
    return result;
  } catch (e) {
    Logger.log('updateUser() ERROR: email=' + email + ', message=' + e.message + ' stack=' + e.stack);
    console.log('updateUser() ERROR: email=' + email + ', message=' + e.message);
    throw e;
  }
}

function logUserLogout(email) {
  try {
    createAuditLog(CONFIG.AUDIT_MODULES.LOGOUT, CONFIG.AUDIT_ACTIONS.LOGOUT, '', email || '', '', '', 'Success', 'User logged out');
    return true;
  } catch (e) {
    return false;
  }
}

function deleteUser(email) {
  var result = deleteRow(CONFIG.SHEET_NAMES.USERS, 'Email', email);
  logActivity('Delete User', email);
  try { createAuditLog(CONFIG.AUDIT_MODULES.USER, CONFIG.AUDIT_ACTIONS.DELETE, email, '', '', '', 'Success', 'User deleted'); } catch(e) {}
  return result;
}

function generateUserId() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.USERS);
  var data = sheet.getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var num = parseInt(String(data[i][0]).replace('USR', ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return 'USR' + String(max + 1).padStart(3, '0');
}
