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
    var session = Session.getActiveUser();
    var email = session.getEmail();
    var user = getUserByEmail(email);
    var auditId = generateId(CONFIG.SHEET_NAMES.AUDIT_TRAIL, 'AUD-');
    var now = formatDateTimeISO(new Date());
    var data = {
      AuditID: auditId,
      DateTime: now,
      UserEmail: email || '',
      UserName: (user ? user.Name : '') || '',
      Role: (user ? user.Role : '') || '',
      Department: (user ? user.Department : '') || '',
      Module: module || '',
      Action: action || '',
      RecordID: recordID || '',
      RecordName: recordName || '',
      OldValue: oldValue || '',
      NewValue: newValue || '',
      IPAddress: '',
      Device: '',
      Browser: '',
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
    if (!email) return getAuditLogs();
    var user = getUserByEmail(email);
    if (!user) return [];
    var role = (user.Role || '').trim();
    if (role === 'Admin') return getAuditLogs();
    var roles = ['Department Manager', 'Maintenance Manager'];
    if (roles.indexOf(role) > -1) {
      var all = getAuditLogs();
      var dept = (user.Department || '').toLowerCase();
      return all.filter(function(r) {
        return (r.Department || '').toLowerCase() === dept;
      });
    }
    return [];
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
