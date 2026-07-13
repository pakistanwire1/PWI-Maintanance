function getQRModuleSheet(module) {
  var map = {
    Machine: { sheet: CONFIG.SHEET_NAMES.MACHINES, idField: 'MachineID', nameField: 'MachineName', codeField: 'MachineCode' },
    Asset: { sheet: CONFIG.SHEET_NAMES.ASSETS, idField: 'AssetID', nameField: 'AssetName', codeField: 'AssetCode' },
    'Spare Part': { sheet: CONFIG.SHEET_NAMES.SPARE_PARTS, idField: 'PartCode', nameField: 'PartName', codeField: 'PartCode' },
    'Job Card': { sheet: CONFIG.SHEET_NAMES.JOBCARDS, idField: 'JobCardNo', nameField: 'Machine', codeField: 'JobCardNo' }
  };
  return map[module] || null;
}

function initQRHistorySheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.QR_HISTORY);
  ensureHeaders(sheet, CONFIG.QR_HISTORY_FIELDS);
  ensureSheetColumns(sheet, CONFIG.QR_HISTORY_FIELDS);
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
  try {
    var cfg = getQRModuleSheet(module);
    if (!cfg) { Logger.log('getQRModuleRecords(' + module + '): no config found'); return []; }
    var records = getAllData(cfg.sheet) || [];
    Logger.log('getQRModuleRecords(' + module + '): sheet=' + cfg.sheet + ', records=' + records.length);
    if (records.length === 0) return [];
    var mapped = records.map(function(r) {
      var base = {
        id: r[cfg.idField] || '',
        name: r[cfg.nameField] || '',
        code: r[cfg.codeField] || '',
        qrCode: r.QRCode || '',
        barcode: r.Barcode || '',
        qrGeneratedDate: r.QRGeneratedDate || '',
        status: r.Status || '',
        department: r.Department || '',
        section: r.Section || '',
        location: r.Location || r.StoreLocation || ''
      };
      if (module === 'Machine') {
        base.assetNo = r.MachineNumber || r.MachineID || '';
        base.machineCode = r.MachineCode || '';
        base.type = r.MachineType || '';
        base.manufacturer = r.Manufacturer || '';
        base.model = r.Model || '';
        base.criticality = r.Criticality || '';
      } else if (module === 'Asset') {
        base.assetCode = r.AssetCode || '';
        base.category = r.Category || '';
        base.machineName = r.MachineName || '';
        base.criticality = r.Criticality || '';
      } else if (module === 'Spare Part') {
        base.category = r.Category || '';
        base.currentStock = r.CurrentStock || '';
        base.minimumStock = r.MinimumStock || '';
        base.maximumStock = r.MaximumStock || '';
        base.supplier = r.Supplier || '';
        base.binNumber = r.BinNumber || '';
        base.unit = r.Unit || '';
      } else if (module === 'Job Card') {
        base.openDate = r.OpenDateTime || '';
        base.priority = r.Priority || '';
        base.complaintCategory = r.ComplaintCategory || '';
        base.complaintDescription = r.ComplaintDescription || '';
        base.assignedTechnician = r.AssignedTechnician || '';
        base.approvalStatus = r.ApprovalStatus || '';
        base.breakdownType = r.BreakdownType || '';
        base.currentStatus = r.CurrentStatus || r.Status || '';
      }
      return base;
    });
    Logger.log('getQRModuleRecords(' + module + '): returning ' + mapped.length + ' records');
    if (mapped.length > 0) Logger.log('getQRModuleRecords(' + module + '): first record=' + JSON.stringify(mapped[0]));
    return mapped;
  } catch (e) {
    Logger.log('getQRModuleRecords(' + module + ') ERROR: ' + e.message + ' stack=' + e.stack);
    return [];
  }
}

function getQRStatistics() {
  var stats = { generated: 0, pending: 0, printed: 0, scanned: 0, byModule: {} };
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
  try {
    var histSheet = getSheet(CONFIG.SHEET_NAMES.QR_HISTORY);
    stats.scanned = Math.max(0, histSheet.getLastRow() - 1);
  } catch(e) { stats.scanned = 0; }
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
  var location = record.Location || '';
  var section = record.Section || '';
  var assetId = record.AssetID || recordId;
  var serialNo = record.SerialNo || '';
  var criticality = record.Criticality || '';
  var assetName = record.AssetName || record.MachineName || record.PartName || '';
  try { createAuditLog(CONFIG.AUDIT_MODULES.QR_BARCODE, CONFIG.AUDIT_ACTIONS.LABEL_PRINTED, recordId, record[cfg.nameField] || '', labelSize, qrContent, 'Success', 'Label printed for ' + module + ' - Size: ' + labelSize); } catch(e) {}
  return {
    module: module,
    recordId: recordId,
    name: record[cfg.nameField] || '',
    code: record[cfg.codeField] || '',
    department: record.Department || '',
    location: location,
    section: section,
    assetId: assetId,
    serialNo: serialNo,
    criticality: criticality,
    assetName: assetName,
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
          status: r.Status || '',
          section: r.Section || '',
          location: r.Location || ''
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
          status: r.Status || '',
          section: r.Section || '',
          location: r.Location || ''
        };
      }
    }
  }
  return null;
}

function logQRScan(scanData) {
  try {
    initQRHistorySheet();
    var email = Session.getActiveUser().getEmail() || 'unknown';
    var userName = scanData.userName || '';
    var userDept = scanData.userDepartment || '';
    var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
    var user = users.find(function(u) { return u.Email === email; });
    if (user) {
      userName = userName || user.Name || '';
      userDept = userDept || user.Department || '';
    }
    var scanId = 'QSCAN-' + Date.now() + '-' + String(Math.floor(Math.random() * 900) + 100);
    var now = getCurrentTimestamp();
    var rowData = {
      ScanID: scanId,
      ScanDateTime: now,
      UserEmail: email,
      UserName: userName,
      UserDepartment: userDept,
      QRModule: scanData.module || '',
      RecordID: scanData.recordId || '',
      RecordName: scanData.recordName || '',
      ScanResult: scanData.scanResult || 'Success',
      DeviceType: scanData.deviceType || '',
      BrowserInfo: scanData.browserInfo || '',
      IPAddress: scanData.ipAddress || '',
      Latitude: scanData.latitude || '',
      Longitude: scanData.longitude || '',
      Action: scanData.action || 'Scan'
    };
    addRow(CONFIG.SHEET_NAMES.QR_HISTORY, rowData);
    try {
      createAuditLog(
        CONFIG.AUDIT_MODULES.QR_BARCODE,
        CONFIG.AUDIT_ACTIONS.QR_SCANNED,
        scanData.recordId || '',
        scanData.recordName || '',
        '',
        scanData.module + ' - ' + (scanData.scanResult || 'Success'),
        'Success',
        'QR scanned by ' + userName
      );
    } catch(e) {}
    return { success: true, scanId: scanId };
  } catch(e) {
    console.error('logQRScan ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

function getQRScanHistory(filters) {
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.QR_HISTORY) || [];
    if (filters) {
      if (filters.module) {
        data = data.filter(function(r) { return (r.QRModule || '') === filters.module; });
      }
      if (filters.recordId) {
        data = data.filter(function(r) { return (r.RecordID || '') === filters.recordId; });
      }
      if (filters.userEmail) {
        data = data.filter(function(r) { return (r.UserEmail || '') === filters.userEmail; });
      }
      if (filters.startDate) {
        data = data.filter(function(r) { return (r.ScanDateTime || '') >= filters.startDate; });
      }
      if (filters.endDate) {
        data = data.filter(function(r) { return (r.ScanDateTime || '') <= filters.endDate; });
      }
      if (filters.search) {
        var q = filters.search.toLowerCase();
        data = data.filter(function(r) {
          return (r.UserName || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.RecordID || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.RecordName || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.QRModule || '').toLowerCase().indexOf(q) !== -1;
        });
      }
    }
    data.sort(function(a, b) { return (b.ScanDateTime || '').localeCompare(a.ScanDateTime || ''); });
    var page = (filters && filters.page) ? filters.page : 1;
    var pageSize = (filters && filters.pageSize) ? filters.pageSize : 25;
    var start = (page - 1) * pageSize;
    var paged = data.slice(start, start + pageSize);
    return {
      records: paged,
      total: data.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(data.length / pageSize)
    };
  } catch(e) {
    return { records: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
  }
}

function getQRScanStats() {
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.QR_HISTORY) || [];
    var stats = { totalScans: 0, todayScans: 0, byModule: {}, byUser: {}, recentScans: [] };
    var today = getCurrentTimestamp().substring(0, 10);
    stats.totalScans = data.length;
    data.forEach(function(r) {
      if ((r.ScanDateTime || '').indexOf(today) === 0) stats.todayScans++;
      var mod = r.QRModule || 'Unknown';
      if (!stats.byModule[mod]) stats.byModule[mod] = 0;
      stats.byModule[mod]++;
      var user = r.UserName || r.UserEmail || 'Unknown';
      if (!stats.byUser[user]) stats.byUser[user] = 0;
      stats.byUser[user]++;
    });
    data.sort(function(a, b) { return (b.ScanDateTime || '').localeCompare(a.ScanDateTime || ''); });
    stats.recentScans = data.slice(0, 20);
    return stats;
  } catch(e) {
    return { totalScans: 0, todayScans: 0, byModule: {}, byUser: {}, recentScans: [] };
  }
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
  html += '<div style="font-weight:bold;font-size:0.75em;color:#1a237e;margin-bottom:2px;letter-spacing:0.5px">PAKISTAN WIRE INDUSTRIES (PVT.) LTD.</div>';
  html += '<div style="font-weight:bold;font-size:1.3em;margin-bottom:2px;">' + data.name + '</div>';
  html += '<div style="color:#666;margin-bottom:2px;">' + data.code + '</div>';
  if (data.department) html += '<div style="color:#888;font-size:0.85em;margin-bottom:2px;">' + data.department + '</div>';
  if (data.location) html += '<div style="color:#888;font-size:0.8em;margin-bottom:2px;">Location: ' + data.location + '</div>';
  html += '<div style="font-size:0.8em;color:#999;margin-bottom:4px;">' + module + ' #' + data.recordId + '</div>';
  html += '<div id="qrLabelImage" style="margin:4px 0;"></div>';
  html += '<div style="font-family:monospace;font-size:0.9em;letter-spacing:1px;margin-top:2px;">' + (data.barcode || '') + '</div>';
  html += '</div>';
  return html;
}

function getQRDetail(qrContent) {
  if (!qrContent) return { error: 'No QR content provided' };
  var basic = scanQRCode(qrContent);
  if (!basic) {
    var barcodeResult = scanBarcode(qrContent);
    if (barcodeResult) basic = barcodeResult;
  }
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
    detail = buildMachineDetail(detail, basic.recordId);
  } else if (basic.module === 'Asset') {
    detail = buildAssetDetail(detail, basic.recordId);
  } else if (basic.module === 'Job Card') {
    detail = buildJobCardDetail(detail, basic.recordId);
  } else if (basic.module === 'Spare Part') {
    detail = buildSparePartDetail(detail, basic.recordId);
  }

  try {
    logQRScan({
      module: basic.module,
      recordId: basic.recordId,
      recordName: basic.name,
      scanResult: 'Success',
      action: 'Detail View'
    });
  } catch(e) {}

  return detail;
}

function buildMachineDetail(detail, machineId) {
  var machines = getAllData(CONFIG.SHEET_NAMES.MACHINES) || [];
  var m = machines.find(function(r) { return r.MachineID === machineId; });
  if (!m) return detail;
  detail.location = m.Location || '';
  detail.section = m.Section || '';
  detail.type = m.MachineType || '';
  detail.manufacturer = m.Manufacturer || '';
  detail.model = m.Model || '';
  detail.serialNo = m.SerialNo || '';
  detail.criticality = m.Criticality || '';
  detail.capacity = m.Capacity || '';
  detail.powerRating = m.PowerRating || '';
  detail.installDate = m.InstallDate || '';
  detail.warrantyExpiry = m.WarrantyExpiry || '';
  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var machineJobs = jcs.filter(function(j) { return (j.Machine || '') === m.MachineName; });
  machineJobs.sort(function(a, b) { return (b.OpenDateTime || '').localeCompare(a.OpenDateTime || ''); });
  var openJobs = machineJobs.filter(function(j) {
    var s = (j.CurrentStatus || j.Status || '').toUpperCase();
    return s === 'OPEN';
  });
  var runningJobs = machineJobs.filter(function(j) {
    var s = (j.CurrentStatus || j.Status || '').toUpperCase();
    return s === 'RUNNING' || s === 'IN PROGRESS';
  });
  var closedJobs = machineJobs.filter(function(j) {
    return (j.CurrentStatus || j.Status || '').toUpperCase() === 'CLOSED';
  });
  var pendingJobs = machineJobs.filter(function(j) {
    return (j.CurrentStatus || j.Status || '').toUpperCase() === 'PENDING';
  });
  var approvedJobs = machineJobs.filter(function(j) {
    var a = (j.ApprovalStatus || '').toUpperCase();
    return a === 'APPROVED';
  });
  detail.totalJobs = machineJobs.length;
  detail.openJobCards = openJobs.length;
  detail.runningJobs = runningJobs.length;
  detail.closedJobs = closedJobs.length;
  detail.pendingJobs = pendingJobs.length;
  detail.approvedJobs = approvedJobs.length;
  detail.totalBreakdowns = closedJobs.length;
  var totalDowntimeMin = 0;
  closedJobs.forEach(function(j) {
    var dt = j.Downtime || j.TotalDuration || 0;
    if (typeof dt === 'number') totalDowntimeMin += dt;
    else if (typeof dt === 'string' && dt.indexOf(':') !== -1) {
      var parts = dt.split(':');
      totalDowntimeMin += (parseInt(parts[0] || 0) * 60) + parseInt(parts[1] || 0);
    }
  });
  detail.totalDowntimeHours = Math.round(totalDowntimeMin / 60 * 10) / 10;
  detail.avgRepairTime = closedJobs.length > 0 ? Math.round(totalDowntimeMin / closedJobs.length) : 0;
  detail.mtbf = 0;
  if (closedJobs.length > 0 && m.InstallDate) {
    var installDt = new Date(m.InstallDate);
    var nowDt = new Date();
    var daysSinceInstall = Math.max(1, Math.round((nowDt - installDt) / (1000 * 60 * 60 * 24)));
    detail.mtbf = Math.round(daysSinceInstall / closedJobs.length);
  }
  detail.mttr = detail.avgRepairTime;
  var lastClosed = closedJobs.filter(function(j) { return j.CloseDateTime; }).sort(function(a, b) {
    return (b.CloseDateTime || '').localeCompare(a.CloseDateTime || '');
  });
  detail.lastBreakdownDate = lastClosed.length > 0 ? lastClosed[0].OpenDateTime || '' : '';
  detail.lastRepairDate = lastClosed.length > 0 ? lastClosed[0].CloseDateTime || '' : '';
  var sparePartsUsed = {};
  machineJobs.forEach(function(j) {
    if (j.SpareParts) {
      var parts = String(j.SpareParts).split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
      parts.forEach(function(p) { sparePartsUsed[p] = (sparePartsUsed[p] || 0) + 1; });
    }
  });
  detail.sparePartsUsed = Object.keys(sparePartsUsed).map(function(name) {
    return { name: name, count: sparePartsUsed[name] };
  }).sort(function(a, b) { return b.count - a.count; });
  detail.history = machineJobs.slice(0, 10).map(function(j) {
    return {
      jobCardNo: j.JobCardNo || '',
      status: j.CurrentStatus || j.Status || '',
      date: j.OpenDateTime || '',
      closeDate: j.CloseDateTime || '',
      description: j.ComplaintDescription || '',
      rootCause: j.RootCause || '',
      correctiveAction: j.CorrectiveAction || '',
      downtime: j.Downtime || '',
      technician: j.AssignedTechnician || ''
    };
  });
  try {
    var pms = getAllData(CONFIG.SHEET_NAMES.PREVENTIVE_MAINTENANCE) || [];
    var recentPM = pms.filter(function(p) { return (p.MachineID || '') === m.MachineID; })
      .sort(function(a, b) { return (b.NextDueDate || '').localeCompare(a.NextDueDate || ''); });
    if (recentPM.length > 0) {
      detail.pmStatus = recentPM[0].Status || '';
      detail.lastPM = recentPM[0].CompletionDate || '';
      detail.nextPM = recentPM[0].NextDueDate || '';
    }
  } catch(e) {}
  return detail;
}

function buildAssetDetail(detail, assetId) {
  var assets = getAllData(CONFIG.SHEET_NAMES.ASSETS) || [];
  var a = assets.find(function(r) { return r.AssetID === assetId; });
  if (!a) return detail;
  detail.location = a.Location || '';
  detail.section = a.Section || '';
  detail.type = a.AssetType || '';
  detail.category = a.Category || '';
  detail.manufacturer = a.Manufacturer || '';
  detail.model = a.Model || '';
  detail.serialNo = a.SerialNo || '';
  detail.criticality = a.Criticality || '';
  detail.machineName = a.MachineName || '';
  detail.cost = a.Cost || '0';
  detail.purchaseDate = a.PurchaseDate || '';
  detail.installDate = a.InstallDate || '';
  detail.warrantyExpiry = a.WarrantyExpiry || '';
  detail.supplier = a.Supplier || '';
  detail.specification = a.Specification || '';
  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var assetJobs = jcs.filter(function(j) { return (j.AssetID || '') === a.AssetID; });
  assetJobs.sort(function(a2, b) { return (b.OpenDateTime || '').localeCompare(a2.OpenDateTime || ''); });
  detail.history = assetJobs.slice(0, 10).map(function(j) {
    return {
      jobCardNo: j.JobCardNo || '',
      status: j.CurrentStatus || j.Status || '',
      date: j.OpenDateTime || '',
      closeDate: j.CloseDateTime || '',
      description: j.ComplaintDescription || '',
      rootCause: j.RootCause || '',
      correctiveAction: j.CorrectiveAction || '',
      downtime: j.Downtime || ''
    };
  });
  detail.totalJobs = assetJobs.length;
  detail.openJobs = assetJobs.filter(function(j) {
    var s = (j.CurrentStatus || j.Status || '').toUpperCase();
    return s === 'OPEN' || s === 'RUNNING';
  }).length;
  return detail;
}

function buildJobCardDetail(detail, jobCardNo) {
  var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
  var jc = jcs.find(function(r) { return r.JobCardNo === jobCardNo; });
  if (!jc) return detail;
  var njc = normalizeJobCard(jc);
  detail.section = njc.Section || '';
  detail.department = njc.Department || '';
  detail.priority = njc.Priority || '';
  detail.complaintCategory = njc.ComplaintCategory || '';
  detail.complaintDescription = njc.ComplaintDescription || '';
  detail.complaintBy = njc.ComplaintBy || '';
  detail.openDate = njc.OpenDateTime || '';
  detail.currentStatus = njc.CurrentStatus || njc.Status || '';
  detail.assignedTechnician = njc.AssignedTechnician || '';
  detail.maintenanceTeam = njc.MaintenanceTeam || '';
  detail.startDateTime = njc.StartDateTime || '';
  detail.initialRemarks = njc.InitialRemarks || '';
  detail.rootCause = njc.RootCause || '';
  detail.correctiveAction = njc.CorrectiveAction || '';
  detail.spareParts = njc.SpareParts || '';
  detail.finalRemarks = njc.FinalRemarks || '';
  detail.closeDate = njc.CloseDateTime || '';
  detail.closedBy = njc.ClosedBy || '';
  detail.waitingTime = njc.WaitingTime || '';
  detail.workingTime = njc.WorkingTime || '';
  detail.downtime = njc.Downtime || '';
  detail.totalDuration = njc.TotalDuration || '';
  detail.breakdownType = njc.BreakdownType || '';
  detail.approvalStatus = njc.ApprovalStatus || '';
  detail.approvedBy = njc.ApprovedBy || '';
  detail.approvedDateTime = njc.ApprovedDateTime || '';
  detail.approvalRemarks = njc.ApprovalRemarks || '';
  detail.qrGeneratedDate = njc.QRGeneratedDate || '';
  detail.createdAt = njc.CreatedAt || '';
  detail.createdBy = njc.CreatedBy || '';
  detail.machine = njc.Machine || '';
  detail.assetID = njc.AssetID || '';
  detail.faultImage = njc.FaultImage || '';
  detail.repairImage = njc.RepairImage || '';
  detail.timeline = [];
  if (njc.OpenDateTime) detail.timeline.push({ event: 'Opened', date: njc.OpenDateTime, by: njc.ComplaintBy || njc.CreatedBy || '' });
  if (njc.StartDateTime) detail.timeline.push({ event: 'Started', date: njc.StartDateTime, by: njc.StartedBy || njc.AssignedTechnician || '' });
  if (njc.PendingDateTime) detail.timeline.push({ event: 'Pending', date: njc.PendingDateTime, by: njc.PendingBy || '', reason: njc.PendingRemarks || '' });
  if (njc.CloseDateTime) detail.timeline.push({ event: 'Closed', date: njc.CloseDateTime, by: njc.ClosedBy || '' });
  if (njc.ApprovedDateTime) detail.timeline.push({ event: 'Approved', date: njc.ApprovedDateTime, by: njc.ApprovedBy || '' });
  if (njc.ReturnedDateTime) detail.timeline.push({ event: 'Returned', date: njc.ReturnedDateTime, by: njc.ReturnedBy || '', reason: njc.ReturnReason || '' });
  detail.timeline.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
  return detail;
}

function buildSparePartDetail(detail, partCode) {
  var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var p = parts.find(function(r) { return r.PartCode === partCode; });
  if (!p) return detail;
  detail.location = p.StoreLocation || '';
  detail.binNumber = p.BinNumber || '';
  detail.category = p.Category || '';
  detail.manufacturer = p.Manufacturer || '';
  detail.unit = p.Unit || '';
  detail.minimumStock = p.MinimumStock || '';
  detail.maximumStock = p.MaximumStock || '';
  detail.currentStock = p.CurrentStock || '';
  detail.reorderLevel = p.ReorderLevel || '';
  detail.unitCost = p.UnitCost || '';
  detail.supplier = p.Supplier || '';
  detail.machineCompatibility = p.MachineCompatibility || '';
  detail.assetCompatibility = p.AssetCompatibility || '';
  detail.remarks = p.Remarks || '';
  detail.stockStatus = 'Normal';
  var cur = parseInt(p.CurrentStock) || 0;
  var min = parseInt(p.MinimumStock) || 0;
  var reorder = parseInt(p.ReorderLevel) || min;
  if (cur <= 0) detail.stockStatus = 'Out of Stock';
  else if (cur <= reorder) detail.stockStatus = 'Low Stock';
  else if (cur >= (parseInt(p.MaximumStock) || 999999)) detail.stockStatus = 'Overstocked';
  try {
    var jcs = getAllData(CONFIG.SHEET_NAMES.JOBCARDS) || [];
    var usedInJobs = jcs.filter(function(j) {
      return (j.SpareParts || '').indexOf(p.PartName) !== -1 || (j.SpareParts || '').indexOf(p.PartCode) !== -1;
    });
    detail.usedInJobCount = usedInJobs.length;
    usedInJobs.sort(function(a, b) { return (b.CloseDateTime || b.OpenDateTime || '').localeCompare(a.CloseDateTime || a.OpenDateTime || ''); });
    detail.lastUsedDate = usedInJobs.length > 0 ? (usedInJobs[0].CloseDateTime || usedInJobs[0].OpenDateTime || '') : '';
    detail.usedInJobs = usedInJobs.slice(0, 5).map(function(j) {
      return { jobCardNo: j.JobCardNo || '', machine: j.Machine || '', date: j.CloseDateTime || j.OpenDateTime || '', status: j.CurrentStatus || '' };
    });
  } catch(e) {}
  try {
    var gr = getAllData(CONFIG.SHEET_NAMES.GOODS_RECEIPT) || [];
    var partReceipts = gr.filter(function(r) { return (r.PartCode || '') === p.PartCode; });
    partReceipts.sort(function(a, b) { return (b.ReceivedDate || '').localeCompare(a.ReceivedDate || ''); });
    detail.purchaseHistory = partReceipts.slice(0, 5).map(function(r) {
      return { grnNo: r.GRNNo || '', quantity: r.Quantity || '', date: r.ReceivedDate || '', supplier: r.Supplier || '', cost: r.TotalCost || '' };
    });
    detail.totalPurchased = partReceipts.reduce(function(sum, r) { return sum + (parseInt(r.Quantity) || 0); }, 0);
  } catch(e) {}
  return detail;
}

function getModuleRecordDetail(module, recordId) {
  try {
    var cfg = getQRModuleSheet(module);
    if (!cfg) return { error: 'Module not found: ' + module };
    var record = getRecordById(cfg.sheet, cfg.idField, recordId);
    if (!record) return { error: 'Record not found: ' + recordId };
    var detail = {
      module: module,
      id: recordId,
      name: record[cfg.nameField] || '',
      code: record[cfg.codeField] || '',
      department: record.Department || '',
      section: record.Section || '',
      location: record.Location || '',
      status: record.Status || ''
    };
    if (module === 'Machine') {
      detail = buildMachineDetail(detail, recordId);
    } else if (module === 'Asset') {
      detail = buildAssetDetail(detail, recordId);
    } else if (module === 'Job Card') {
      detail = buildJobCardDetail(detail, recordId);
    } else if (module === 'Spare Part') {
      detail = buildSparePartDetail(detail, recordId);
    }
    return detail;
  } catch (e) {
    Logger.log('getModuleRecordDetail ERROR: ' + e.message + ' stack=' + e.stack);
    return { error: e.message };
  }
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
