function initAuditTrailSheet() {
  try {
    var sheet = getSheet(CONFIG.SHEET_NAMES.AUDIT_TRAIL);
    ensureHeaders(sheet, CONFIG.AUDIT_TRAIL_FIELDS);
    ensureSheetColumns(sheet, CONFIG.AUDIT_TRAIL_FIELDS);
  } catch (e) {
    console.error('initAuditTrailSheet() ERROR: ' + e.message);
  }
}

function createAuditLog(module, action, recordID, recordName, oldValue, newValue, status, remarks) {
  try {
    initAuditTrailSheet();
    var username = '';
    var userRole = '';
    var userDept = '';
    var userEmail = '';

    // Try Google session email first, then fallback to scanning Users by name match
    try {
      var session = Session.getActiveUser();
      if (session) {
        userEmail = session.getEmail() || '';
        var u = getUserByEmail(userEmail);
        if (u) {
          username = u.Name || '';
          userRole = u.Role || '';
          userDept = u.Department || '';
        }
      }
    } catch (e) {
      console.error('createAuditLog() session lookup: ' + e.message);
    }

    // If user not resolved via session email, try matching by recordName (many callers pass user.Name)
    if (!username && recordName) {
      try {
        var allUsers = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
        var nq = recordName.toLowerCase().trim();
        for (var ui = 0; ui < allUsers.length; ui++) {
          if ((allUsers[ui].Name || '').toLowerCase().trim() === nq) {
            username = allUsers[ui].Name || '';
            userRole = allUsers[ui].Role || '';
            userDept = allUsers[ui].Department || '';
            if (allUsers[ui].Email) userEmail = allUsers[ui].Email;
            break;
          }
        }
      } catch (e) {
        console.error('createAuditLog() name fallback: ' + e.message);
      }
    }

    var auditId = generateId(CONFIG.SHEET_NAMES.AUDIT_TRAIL, 'AUD-');
    var now = formatDateTimeISO(new Date());
    var data = {
      AuditID: auditId,
      DateTime: now,
      UserEmail: userEmail,
      UserName: username,
      Role: userRole,
      Department: userDept,
      Module: module || '',
      Action: action || '',
      RecordID: recordID || '',
      RecordName: recordName || '',
      OldValue: oldValue || '',
      NewValue: newValue || '',
      Status: status || 'Success',
      Remarks: remarks || ''
    };
    addRow(CONFIG.SHEET_NAMES.AUDIT_TRAIL, data);
    return true;
  } catch (e) {
    console.error('createAuditLog() ERROR: ' + e.message);
    return false;
  }
}

function getAuditLogs() {
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.AUDIT_TRAIL) || [];
    data.sort(function(a, b) {
      var da = a.DateTime || '';
      var db = b.DateTime || '';
      return da > db ? -1 : da < db ? 1 : 0;
    });
    return data;
  } catch (e) {
    console.error('getAuditLogs() ERROR: ' + e.message);
    return [];
  }
}

function getUserAuditLogs(email) {
  try {
    var all = getAuditLogs();
    if (!email) return all;

    var user = getUserByEmail(email);
    if (!user) return all;

    var role = (user.Role || '').trim();
    var roleLower = role.toLowerCase();
    var isAdmin = roleLower === 'admin' || roleLower === 'administrator' || (user.IsAdmin || '').toLowerCase() === 'true';

    // Admin/Administrator/has IsAdmin permission — return all records
    if (isAdmin) return all;

    // Department Manager / Maintenance Manager — filter by their department
    if (roleLower === 'department manager' || roleLower === 'maintenance manager') {
      var dept = (user.Department || '').toLowerCase();
      if (!dept) return all;
      return all.filter(function(r) {
        return (r.Department || '').toLowerCase() === dept;
      });
    }

    // Any other authenticated user — return all records (sidebar already controls page visibility)
    return all;
  } catch (e) {
    console.error('getUserAuditLogs() ERROR: ' + e.message);
    return [];
  }
}

function filterAuditLogs(filters) {
  try {
    var data = getUserAuditLogs(Session.getActiveUser().getEmail());
    if (!filters) return data;
    if (filters.search) {
      var q = filters.search.toLowerCase();
      data = data.filter(function(r) {
        for (var k in r) {
          if (String(r[k]).toLowerCase().indexOf(q) > -1) return true;
        }
        return false;
      });
    }
    if (filters.dateFrom) {
      var from = new Date(filters.dateFrom);
      if (!isNaN(from.getTime())) {
        data = data.filter(function(r) {
          var d = new Date(r.DateTime);
          return !isNaN(d.getTime()) && d >= from;
        });
      }
    }
    if (filters.dateTo) {
      var to = new Date(filters.dateTo);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        data = data.filter(function(r) {
          var d = new Date(r.DateTime);
          return !isNaN(d.getTime()) && d <= to;
        });
      }
    }
    if (filters.user) {
      var uq = filters.user.toLowerCase();
      data = data.filter(function(r) {
        return (r.UserEmail || '').toLowerCase().indexOf(uq) > -1 || (r.UserName || '').toLowerCase().indexOf(uq) > -1;
      });
    }
    if (filters.department) {
      var dq = filters.department.toLowerCase();
      data = data.filter(function(r) { return (r.Department || '').toLowerCase() === dq; });
    }
    if (filters.module) {
      var mq = filters.module.toLowerCase();
      data = data.filter(function(r) { return (r.Module || '').toLowerCase() === mq; });
    }
    if (filters.action) {
      var aq = filters.action.toLowerCase();
      data = data.filter(function(r) { return (r.Action || '').toLowerCase() === aq; });
    }
    if (filters.status) {
      var sq = filters.status.toLowerCase();
      data = data.filter(function(r) { return (r.Status || '').toLowerCase() === sq; });
    }
    if (filters.role) {
      var rq = filters.role.toLowerCase();
      data = data.filter(function(r) { return (r.Role || '').toLowerCase() === rq; });
    }
    return data;
  } catch (e) {
    console.error('filterAuditLogs() ERROR: ' + e.message);
    return [];
  }
}

function exportAuditLogs(filters) {
  try {
    var data = filterAuditLogs(filters || {});
    return data;
  } catch (e) {
    console.error('exportAuditLogs() ERROR: ' + e.message);
    return [];
  }
}

function getRecentAuditLogs(count) {
  try {
    count = count || 10;
    var data = getUserAuditLogs(Session.getActiveUser().getEmail());
    return data.slice(0, count);
  } catch (e) {
    console.error('getRecentAuditLogs() ERROR: ' + e.message);
    return [];
  }
}

function testAuditPipeline(email) {
  var steps = [];
  try {
    steps.push({ step: '1. Input email', detail: email || '(not provided)' });
    var sheet = getSheet(CONFIG.SHEET_NAMES.AUDIT_TRAIL);
    var range = sheet.getDataRange();
    var raw = range.getValues();
    steps.push({ step: '2. Sheet.getDataRange()', detail: range.getA1Notation() + ', rows=' + raw.length + ', cols=' + (raw.length > 0 ? raw[0].length : 0) });
    if (raw.length > 0) {
      steps.push({ step: '3. Raw row 0 (headers)', detail: '[' + raw[0].map(function(v) { return String(v).substring(0, 25); }).join(' | ') + ']' });
    }
    if (raw.length > 1) {
      steps.push({ step: '4. Raw row 1 (first data)', detail: '[' + raw[1].map(function(v) { return String(v).substring(0, 25); }).join(' | ') + ']' });
    }
    if (raw.length > 2) {
      var last = raw[raw.length - 1];
      steps.push({ step: '5. Raw last row', detail: '[' + last.map(function(v) { return String(v).substring(0, 25); }).join(' | ') + ']' });
    }
    var allData = getAllData(CONFIG.SHEET_NAMES.AUDIT_TRAIL);
    steps.push({ step: '6. getAllData() result', detail: 'Array=' + Array.isArray(allData) + ', length=' + allData.length });
    if (allData && allData.length > 0) {
      steps.push({ step: '7. First record keys', detail: Object.keys(allData[0]).join(', ') });
      steps.push({ step: '8. First record JSON', detail: JSON.stringify(allData[0]).substring(0, 600) });
    }
    var auditLogs = getAuditLogs();
    steps.push({ step: '9. getAuditLogs() result', detail: 'length=' + auditLogs.length });
    var user = email ? getUserByEmail(email) : null;
    steps.push({ step: '10. getUserByEmail(email)', detail: user ? 'FOUND: ' + user.Name + ', Role=' + user.Role + ', Dept=' + user.Department + ', IsAdmin=' + (user.IsAdmin || 'N/A') : 'NOT FOUND (will fallback to all data)' });
    var userLogs = getUserAuditLogs(email || '');
    steps.push({ step: '11. getUserAuditLogs() result', detail: 'length=' + userLogs.length + (userLogs.length > 0 ? ', first AuditID=' + (userLogs[0].AuditID || 'N/A') : '') });
    steps.push({ step: '12. DIAGNOSIS', detail: (userLogs.length > 0) ? 'DATA FLOW OK — records will display' : 'NO DATA returned at step 11 — check steps 2-6 for sheet issues' });
  } catch (e) {
    steps.push({ step: 'ERROR', detail: e.message + ' | ' + e.stack });
  }
  return steps;
}

function getAuditLogStats(email) {
  try {
    var data = email ? getUserAuditLogs(email) : getAuditLogs();
    var moduleCounts = {};
    var actionCounts = {};
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayCount = 0;
    for (var i = 0; i < data.length; i++) {
      var mod = data[i].Module || 'Unknown';
      if (!moduleCounts[mod]) moduleCounts[mod] = 0;
      moduleCounts[mod]++;
      var act = data[i].Action || 'Unknown';
      if (!actionCounts[act]) actionCounts[act] = 0;
      actionCounts[act]++;
      var dt = new Date(data[i].DateTime);
      if (!isNaN(dt.getTime()) && dt >= today) todayCount++;
    }
    return {
      total: data.length,
      today: todayCount,
      byModule: moduleCounts,
      byAction: actionCounts
    };
  } catch (e) {
    return { total: 0, today: 0, byModule: {}, byAction: {} };
  }
}
