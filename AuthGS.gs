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
          return {
            success: true,
            user: {
              email: user.Email,
              name: user.Name,
              role: user.Role,
              department: user.Department || '',
              designation: user.Designation || '',
              canOpenJobCard: getPermValue(user.CanOpenJobCard),
              canStartJobCard: getPermValue(user.CanStartJobCard),
              canCloseJobCard: getPermValue(user.CanCloseJobCard),
              canApproveJobCard: getPermValue(user.CanApproveJobCard),
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
    data.UpdatedBy = Session.getActiveUser().getEmail();
    data.UpdatedAt = getCurrentTimestamp();
    var result = updateRow(CONFIG.SHEET_NAMES.USERS, 'Email', email, data);
    logActivity('Update User', email);
    Logger.log('updateUser() SUCCESS: email=' + email + ', result length=' + result.length);
    console.log('updateUser() SUCCESS: email=' + email);
    return result;
  } catch (e) {
    Logger.log('updateUser() ERROR: email=' + email + ', message=' + e.message + ' stack=' + e.stack);
    console.log('updateUser() ERROR: email=' + email + ', message=' + e.message);
    throw e;
  }
}

function deleteUser(email) {
  var result = deleteRow(CONFIG.SHEET_NAMES.USERS, 'Email', email);
  logActivity('Delete User', email);
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
