function getQRModuleSheet(module) {
  var map = {
    Machine: { sheet: CONFIG.SHEET_NAMES.MACHINES, idField: 'MachineID', nameField: 'MachineName', codeField: 'MachineCode' },
    Asset: { sheet: CONFIG.SHEET_NAMES.ASSETS, idField: 'AssetID', nameField: 'AssetName', codeField: 'AssetCode' },
    'Spare Part': { sheet: CONFIG.SHEET_NAMES.SPARE_PARTS, idField: 'PartCode', nameField: 'PartName', codeField: 'PartCode' },
    'Job Card': { sheet: CONFIG.SHEET_NAMES.JOBCARDS, idField: 'JobCardNo', nameField: 'Machine', codeField: 'JobCardNo' }
  };
  return map[module] || null;
}

function generateQRCodeForRecord(module, recordId) {
  var cfg = getQRModuleSheet(module);
  if (!cfg) return null;
  var record = getRecordById(cfg.sheet, cfg.idField, recordId);
  if (!record) return null;
  var qrContent = 'https://cmms.app/' + module.toLowerCase().replace(/\s+/g, '') + '/' + encodeURIComponent(recordId);
  var now = getCurrentTimestamp();
  var updateData = { QRCode: qrContent, QRGeneratedDate: now, UpdatedBy: Session.getActiveUser().getEmail(), UpdatedAt: now };
  updateRow(cfg.sheet, cfg.idField, recordId, updateData);
  try { createAuditLog(CONFIG.AUDIT_MODULES.QR_BARCODE, CONFIG.AUDIT_ACTIONS.QR_GENERATED, recordId, record[cfg.nameField] || '', '', qrContent, 'Success', 'QR code generated for ' + module); } catch(e) {}
  return { recordId: recordId, module: module, name: record[cfg.nameField] || '', qrContent: qrContent, generatedAt: now };
}

function generateBarcodeForRecord(module, recordId) {
  var cfg = getQRModuleSheet(module);
  if (!cfg) return null;
  var record = getRecordById(cfg.sheet, cfg.idField, recordId);
  if (!record) return null;
  var code = record[cfg.codeField] || recordId;
  var barcode = String(code).replace(/[^A-Za-z0-9]/g, '') + '-' + String(Math.floor(Math.random() * 9000) + 1000);
  var now = getCurrentTimestamp();
  var updateData = { Barcode: barcode, UpdatedBy: Session.getActiveUser().getEmail(), UpdatedAt: now };
  updateRow(cfg.sheet, cfg.idField, recordId, updateData);
  try { createAuditLog(CONFIG.AUDIT_MODULES.QR_BARCODE, CONFIG.AUDIT_ACTIONS.BARCODE_GENERATED, recordId, record[cfg.nameField] || '', '', barcode, 'Success', 'Barcode generated for ' + module); } catch(e) {}
  return { recordId: recordId, module: module, name: record[cfg.nameField] || '', barcode: barcode, generatedAt: now };
}

function generateQRBarcodeForNewRecord(module, recordId, record) {
  try {
    var cfg = getQRModuleSheet(module);
    if (!cfg) return;
    var code = record[cfg.codeField] || recordId;
    var qrContent = 'https://cmms.app/' + module.toLowerCase().replace(/\s+/g, '') + '/' + encodeURIComponent(recordId);
    var barcode = String(code).replace(/[^A-Za-z0-9]/g, '') + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    var now = getCurrentTimestamp();
    var updateData = { QRCode: qrContent, Barcode: barcode, QRGeneratedDate: now, UpdatedBy: Session.getActiveUser().getEmail(), UpdatedAt: now };
    updateRow(cfg.sheet, cfg.idField, recordId, updateData);
  } catch(e) {
    console.error('generateQRBarcodeForNewRecord ERROR: ' + e.message);
  }
}

function bulkGenerateQRCode(module) {
  var cfg = getQRModuleSheet(module);
  if (!cfg) return [];
  var records = getAllData(cfg.sheet) || [];
  var results = [];
  records.forEach(function(r) {
    var id = r[cfg.idField];
    if (id && !r.QRCode) {
      var res = generateQRCodeForRecord(module, id);
      if (res) results.push(res);
    }
  });
  return results;
}

function bulkGenerateBarcode(module) {
  var cfg = getQRModuleSheet(module);
  if (!cfg) return [];
  var records = getAllData(cfg.sheet) || [];
  var results = [];
  records.forEach(function(r) {
    var id = r[cfg.idField];
    if (id && !r.Barcode) {
      var res = generateBarcodeForRecord(module, id);
      if (res) results.push(res);
    }
  });
  return results;
}

function getQRModuleRecords(module) {
  var cfg = getQRModuleSheet(module);
  if (!cfg) return [];
  var records = getAllData(cfg.sheet) || [];
  return records.map(function(r) {
    return {
      id: r[cfg.idField] || '',
      name: r[cfg.nameField] || '',
      code: r[cfg.codeField] || '',
      qrCode: r.QRCode || '',
      barcode: r.Barcode || '',
      qrGeneratedDate: r.QRGeneratedDate || '',
      status: r.Status || ''
    };
  });
}

function getQRStatistics() {
  var stats = { generated: 0, pending: 0, printed: 0, byModule: {} };
  CONFIG.QR_MODULES.forEach(function(mod) {
    var cfg = getQRModuleSheet(mod);
    if (!cfg) return;
    var records = getAllData(cfg.sheet) || [];
    var genCount = 0;
    var pendCount = 0;
    records.forEach(function(r) {
      if (r.QRCode && r.Barcode) {
        genCount++;
      } else {
        pendCount++;
      }
    });
    stats.byModule[mod] = { total: records.length, generated: genCount, pending: pendCount };
    stats.generated += genCount;
    stats.pending += pendCount;
  });
  return stats;
}

function getPrintLabelData(module, recordId, labelSize) {
  var cfg = getQRModuleSheet(module);
  if (!cfg) return null;
  var record = getRecordById(cfg.sheet, cfg.idField, recordId);
  if (!record) return null;
  var qrContent = record.QRCode || '';
  if (!qrContent) {
    var gen = generateQRCodeForRecord(module, recordId);
    qrContent = gen ? gen.qrContent : '';
  }
  try { createAuditLog(CONFIG.AUDIT_MODULES.QR_BARCODE, CONFIG.AUDIT_ACTIONS.LABEL_PRINTED, recordId, record[cfg.nameField] || '', labelSize, qrContent, 'Success', 'Label printed for ' + module + ' - Size: ' + labelSize); } catch(e) {}
  return {
    module: module,
    recordId: recordId,
    name: record[cfg.nameField] || '',
    code: record[cfg.codeField] || '',
    department: record.Department || '',
    qrContent: qrContent,
    barcode: record.Barcode || '',
    labelSize: labelSize || CONFIG.QR_LABEL_SIZES.MEDIUM
  };
}

function scanQRCode(qrContent) {
  if (!qrContent) return null;
  for (var mi = 0; mi < CONFIG.QR_MODULES.length; mi++) {
    var mod = CONFIG.QR_MODULES[mi];
    var cfg = getQRModuleSheet(mod);
    if (!cfg) continue;
    var records = getAllData(cfg.sheet) || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].QRCode === qrContent) {
        var r = records[i];
        return {
          module: mod,
          recordId: r[cfg.idField] || '',
          name: r[cfg.nameField] || '',
          code: r[cfg.codeField] || '',
          department: r.Department || '',
          qrContent: qrContent,
          barcode: r.Barcode || '',
          status: r.Status || ''
        };
      }
    }
  }
  return null;
}

function scanBarcode(barcode) {
  if (!barcode) return null;
  for (var mi = 0; mi < CONFIG.QR_MODULES.length; mi++) {
    var mod = CONFIG.QR_MODULES[mi];
    var cfg = getQRModuleSheet(mod);
    if (!cfg) continue;
    var records = getAllData(cfg.sheet) || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].Barcode === barcode) {
        var r = records[i];
        return {
          module: mod,
          recordId: r[cfg.idField] || '',
          name: r[cfg.nameField] || '',
          code: r[cfg.codeField] || '',
          department: r.Department || '',
          qrContent: r.QRCode || '',
          barcode: barcode,
          status: r.Status || ''
        };
      }
    }
  }
  return null;
}

function getLabelPrintHTML(module, recordId, labelSize) {
  var data = getPrintLabelData(module, recordId, labelSize);
  if (!data) return '<p>Record not found</p>';
  var sizeStyles = {
    '50x25mm': 'width:200px;height:100px;font-size:8px;',
    '75x50mm': 'width:300px;height:200px;font-size:10px;',
    '100x50mm': 'width:400px;height:200px;font-size:12px;',
    'A4 Multiple': 'width:100%;max-width:800px;font-size:10px;'
  };
  var style = sizeStyles[labelSize] || sizeStyles['75x50mm'];
  var multiClass = (labelSize === 'A4 Multiple') ? 'label-a4-multi' : '';
  var html = '<div class="qr-label ' + multiClass + '" style="border:1px solid #333;padding:8px;font-family:Arial,sans-serif;' + style + 'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">';
  html += '<div style="font-weight:bold;font-size:1.3em;margin-bottom:2px;">' + data.name + '</div>';
  html += '<div style="color:#666;margin-bottom:2px;">' + data.code + '</div>';
  html += '<div style="color:#888;font-size:0.85em;margin-bottom:4px;">' + (data.department || '') + '</div>';
  html += '<div style="font-size:0.8em;color:#999;margin-bottom:4px;">' + module + ' #' + data.recordId + '</div>';
  html += '<div id="qrLabelImage" style="margin:4px 0;"></div>';
  html += '<div style="font-family:monospace;font-size:0.9em;letter-spacing:1px;margin-top:2px;">' + (data.barcode || '') + '</div>';
  html += '</div>';
  return html;
}

function getQRDetail(qrContent) {
  if (!qrContent) return { error: 'No QR content provided' };
  var basic = scanQRCode(qrContent);
  if (!basic) return { error: 'QR code not recognized' };

  var detail = {
    module: basic.module,
    id: basic.recordId,
    name: basic.name,
    code: basic.code,
    department: basic.department,
    status: basic.status,
    qrContent: basic.qrContent,
    barcode: basic.barcode
  };

  if (basic.module === 'Machine') {
    var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
    var m = machines.find(function(r) { return r.MachineID === basic.recordId; });
    if (m) {
      detail.location = m.Location || '';
      detail.section = m.Section || '';
      detail.type = m.MachineType || '';
      detail.manufacturer = m.Manufacturer || '';
      detail.model = m.Model || '';
      detail.criticality = m.Criticality || '';
      detail.lastBreakdown = '';
      detail.lastPM = '';
      detail.openJobCards = 0;
      detail.history = [];
      var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
      var machineJobs = jcs.filter(function(j) { return (j.Machine || '') === m.MachineName; });
      machineJobs.sort(function(a, b) { return (b.OpenDateTime || '').localeCompare(a.OpenDateTime || ''); });
      detail.openJobCards = machineJobs.filter(function(j) {
        var s = (j.CurrentStatus || j.Status || '').toUpperCase();
        return s === 'OPEN' || s === 'RUNNING';
      }).length;
      detail.history = machineJobs.slice(0, 5).map(function(j) {
        return { jobCardNo: j.JobCardNo, status: j.CurrentStatus || j.Status || '', date: j.OpenDateTime || '', description: j.ComplaintDescription || '' };
      });
      try {
        var pms = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
        var recentPM = pms.filter(function(p) { return (p.MachineID || '') === m.MachineID; })
          .sort(function(a, b) { return (b.NextDueDate || '').localeCompare(a.NextDueDate || ''); });
        if (recentPM.length > 0) detail.lastPM = recentPM[0].NextDueDate || '';
      } catch(e) {}
      try {
        var bds = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
        var recentBD = bds.filter(function(j) {
          return (j.Machine || '') === m.MachineName && (j.CurrentStatus || '').toUpperCase() === 'CLOSED';
        }).sort(function(a, b) { return (b.CloseDateTime || '').localeCompare(a.CloseDateTime || ''); });
        if (recentBD.length > 0) detail.lastBreakdown = recentBD[0].CloseDateTime || '';
      } catch(e) {}
    }
  } else if (basic.module === 'Asset') {
    var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
    var a = assets.find(function(r) { return r.AssetID === basic.recordId; });
    if (a) {
      detail.location = a.Location || '';
      detail.section = a.Section || '';
      detail.type = a.AssetType || '';
      detail.category = a.Category || '';
      detail.manufacturer = a.Manufacturer || '';
      detail.model = a.Model || '';
      detail.criticality = a.Criticality || '';
      detail.machineName = a.MachineName || '';
      detail.cost = a.Cost || '0';
    }
  } else if (basic.module === 'Job Card') {
    var jcs2 = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var jc = jcs2.find(function(r) { return r.JobCardNo === basic.recordId; });
    if (jc) {
      var njc = normalizeJobCard(jc);
      detail.section = njc.Section || '';
      detail.department = njc.Department || '';
      detail.priority = njc.Priority || '';
      detail.complaintDescription = njc.ComplaintDescription || '';
      detail.rootCause = njc.RootCause || '';
      detail.correctiveAction = njc.CorrectiveAction || '';
      detail.technician = njc.AssignedTechnician || '';
      detail.openDate = njc.OpenDateTime || '';
      detail.closeDate = njc.CloseDateTime || '';
      detail.downtime = njc.Downtime || '';
      detail.spareParts = njc.SpareParts || '';
    }
  }

  return detail;
}

function checkQRScanPermission() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return { allowed: false, reason: 'Not authenticated' };
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    var user = users.find(function(u) { return u.Email === email; });
    if (!user) return { allowed: false, reason: 'User not found' };
    var role = user.Role || '';
    var isAdmin = role === 'Administrator' || user.IsAdmin === 'TRUE' || user.IsAdmin === true;
    if (isAdmin) return { allowed: true, role: role, name: user.Name || '' };
    var canView = user.CanViewDashboard === 'TRUE' || user.CanManageMachines === 'TRUE' ||
                  user.CanManageAssets === 'TRUE' || user.CanOpenJobCard === 'TRUE' ||
                  user.CanViewReports === 'TRUE';
    if (canView) return { allowed: true, role: role, name: user.Name || '' };
    return { allowed: false, reason: 'Insufficient permissions' };
  } catch(e) {
    return { allowed: false, reason: 'Error checking permissions' };
  }
}
