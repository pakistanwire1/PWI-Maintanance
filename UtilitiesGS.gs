function getCurrentTimestamp() {
  return new Date();
}

function formatDate(date) {
  if (!date) return '';
  var d = (typeof date === 'string') ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatDateTime(date) {
  if (!date) return '';
  var d = (typeof date === 'string') ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatDateTimeISO(date) {
  if (!date) return '';
  var d = (typeof date === 'string') ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

function generateId(sheetName, prefix) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var val = String(data[i][0]);
      var num = parseInt(val.replace(prefix, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return prefix + String(max + 1).padStart(4, '0');
}

function generateJobCardNo() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.JOBCARDS);
  var data = sheet.getDataRange().getValues();
  var now = new Date();
  var year = now.getFullYear().toString();
  var prefix = 'JC-' + year + '-';
  var maxSeq = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var val = String(data[i][0]);
      if (val.indexOf(prefix) === 0) {
        var num = parseInt(val.substring(prefix.length), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }
  return prefix + String(maxSeq + 1).padStart(6, '0');
}

function handleError(context, error) {
  var message = 'Error in ' + context + ': ' + error.message;
  console.error(message);
  try {
    logActivity('Error', message);
  } catch (e) {}
  return { success: false, message: 'An error occurred. Please try again.' };
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  var start = new Date(startTime);
  var end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.round((end - start) / (1000 * 60 * 60) * 100) / 100;
}

function getTodayDateString() {
  return formatDate(new Date());
}

function getTodayTimeString() {
  var now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

function getDateNDaysFromNow(n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

function safeJsonParse(str, defaultVal) {
  if (!str) return defaultVal || null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultVal || null;
  }
}

function truncateString(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

function getObjectKeys(obj) {
  return Object.keys(obj);
}

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isEmpty(val) {
  return val === undefined || val === null || val === '';
}

function isNotEmpty(val) {
  return !isEmpty(val);
}

function saveImageToDrive(base64Data, folderName, fileName) {
  if (!base64Data || base64Data.indexOf('base64') === -1) return base64Data;
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  var mimeType = 'image/png';
  var parts = base64Data.split(',');
  if (parts.length > 1) {
    var match = parts[0].match(/:(.*?);/);
    if (match) mimeType = match[1];
  } else {
    parts = ['', base64Data];
  }
  var data = Utilities.base64Decode(parts[1]);
  var blob = Utilities.newBlob(data, mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
