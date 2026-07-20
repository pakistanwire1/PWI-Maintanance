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
  var diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 60000);
}

function durationToDisplay(minutes) {
  if (!minutes && minutes !== 0) return '00:00';
  var m = typeof minutes === 'number' ? Math.floor(minutes) : Math.floor(parseFloat(minutes) || 0);
  if (isNaN(m) || m < 0) return '00:00';
  var d = Math.floor(m / 1440);
  var h = Math.floor((m % 1440) / 60);
  var mn = m % 60;
  if (d > 0) return d + ' Day' + (d > 1 ? 's ' : ' ') + pad(h) + ':' + pad(mn);
  return pad(h) + ':' + pad(mn);
}

function parseDurationToHours(val) {
  if (!val && val !== 0 && val !== '0') return 0;
  if (val instanceof Date) return Math.round(val.getTime() / 60000 / 60 * 100) / 100;
  if (typeof val === 'number') return Math.round(val / 60 * 100) / 100;
  if (typeof val === 'string') {
    if (val.indexOf(':') === -1 && val.indexOf('Day') === -1) {
      var num = parseFloat(val);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    }
    var daysMatch = val.match(/(\d+)\s*Days?\s*/);
    var timeMatch = val.match(/(\d+):(\d+)/);
    var totalMinutes = 0;
    if (daysMatch) totalMinutes += parseInt(daysMatch[1]) * 1440;
    if (timeMatch) {
      totalMinutes += parseInt(timeMatch[1]) * 60;
      totalMinutes += parseInt(timeMatch[2]);
    }
    return Math.round(totalMinutes / 60 * 100) / 100;
  }
  return 0;
}

function formatDurationHours(hours) {
  if (!hours && hours !== 0) return '00:00';
  var h = parseFloat(hours);
  if (isNaN(h)) return '00:00';
  return durationToDisplay(Math.round(h * 60));
}

function normalizeDuration(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'boolean') return 0;

  if (typeof value === 'number') {
    if (value <= 0) return 0;
    return Math.floor(value);
  }

  if (value instanceof Date) {
    value = value.toISOString();
  }

  var s = String(value).trim();
  if (s === '' || s === '0' || s === '00:00' || s === '00:00:00') return 0;

  var daysTimeMatch = s.match(/(\d+)\s+Days?\s+(\d{1,2}):(\d{2})/i);
  if (daysTimeMatch) {
    return parseInt(daysTimeMatch[1]) * 1440 + parseInt(daysTimeMatch[2]) * 60 + parseInt(daysTimeMatch[3]);
  }

  if (s.indexOf('T') !== -1 && s.match(/^\d{4}-\d{2}-\d{2}T/)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      var sheetDateMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      var epochMs = Date.UTC(1899, 11, 30);
      var totalDays = Math.round((sheetDateMs - epochMs) / 86400000);
      if (totalDays < 0) totalDays = 0;
      return totalDays * 1440 + d.getUTCHours() * 60 + d.getUTCMinutes() + Math.round(d.getUTCSeconds() / 60);
    }
    return 0;
  }

  var dMatch = s.match(/(\d+)\s*d\b/i);
  var hMatch = s.match(/(\d+)\s*h\b/i);
  var mMatch = s.match(/(\d+)\s*m\b/i);
  if (dMatch || hMatch || mMatch) {
    return (Number(dMatch ? dMatch[1] : 0) * 1440) +
           (Number(hMatch ? hMatch[1] : 0) * 60) +
           Number(mMatch ? mMatch[1] : 0);
  }

  if (s.indexOf(':') !== -1) {
    var parts = s.split(':');
    if (parts.length === 3) {
      return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0) + Math.round((parseInt(parts[2]) || 0) / 60);
    }
    if (parts.length === 2) {
      return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    }
  }

  var num = parseFloat(s);
  if (!isNaN(num) && num > 0) return Math.round(num);

  return 0;
}

function legacyToMinutes(raw) {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') {
    if (raw <= 0) return 0;
    if (raw < 1) return Math.round(raw * 24 * 60);
    if (raw === Math.floor(raw)) return raw;
    return Math.round(raw * 24 * 60);
  }
  if (raw instanceof Date) {
    var epochMs = Date.UTC(1899, 11, 30);
    var diffMs = raw.getTime() - epochMs;
    if (diffMs >= 0) return Math.round(diffMs / 60000);
    return raw.getHours() * 60 + raw.getMinutes();
  }
  return normalizeDuration(raw);
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
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

function getTodayDateString() {
  return formatDate(new Date());
}

function getTodayTimeString() {
  var now = new Date();
  return pad(now.getHours()) + ':' + pad(now.getMinutes());
}

function getDateNDaysFromNow(n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

function getCurrentTimestamp() {
  var now = new Date();
  var y = now.getFullYear();
  var m = ('0' + (now.getMonth() + 1)).slice(-2);
  var d = ('0' + now.getDate()).slice(-2);
  var h = ('0' + now.getHours()).slice(-2);
  var mi = ('0' + now.getMinutes()).slice(-2);
  var s = ('0' + now.getSeconds()).slice(-2);
  return y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;
}

function formatDate(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

function formatDateTime(date) {
  var now = date || new Date();
  return formatDate(now) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

function generateId(sheetName, prefix) {
  try {
    var data = getAllData(sheetName);
    var maxNum = 0;
    for (var i = 0; i < data.length; i++) {
      var id = data[i][Object.keys(data[i])[0]] || '';
      if (id && id.toString().startsWith(prefix)) {
        var num = parseInt(id.toString().replace(prefix + '-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    var nextNum = maxNum + 1;
    var padded = ('00' + nextNum).slice(-3);
    return prefix + '-' + padded;
  } catch(e) {
    return prefix + '-001';
  }
}

function generateJobCardNo() {
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.JOBCARDS);
    var currentYear = new Date().getFullYear();
    var prefix = 'JC-' + currentYear + '-';
    var maxNum = 0;
    for (var i = 0; i < data.length; i++) {
      var keys = Object.keys(data[i]);
      var id = keys.length > 0 ? data[i][keys[0]] : '';
      if (id && id.toString().indexOf(prefix) === 0) {
        var numPart = id.toString().replace(prefix, '');
        var num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    var nextNum = maxNum + 1;
    var padded = ('000000' + nextNum).slice(-6);
    return prefix + padded;
  } catch(e) {
    var fallbackYear = new Date().getFullYear();
    return 'JC-' + fallbackYear + '-000001';
  }
}
