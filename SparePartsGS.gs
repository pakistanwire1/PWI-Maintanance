function initSparePartsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.SPARE_PARTS);
  ensureHeaders(sheet, CONFIG.SPARE_PART_FIELDS);
  ensureSheetColumns(sheet, CONFIG.SPARE_PART_FIELDS);
  var stockSheet = getSheet(CONFIG.SHEET_NAMES.STOCK_HISTORY);
  ensureHeaders(stockSheet, CONFIG.STOCK_HISTORY_FIELDS);
  ensureSheetColumns(stockSheet, CONFIG.STOCK_HISTORY_FIELDS);
  var invSheet = getSheet(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS);
  ensureHeaders(invSheet, CONFIG.INVENTORY_TRANSACTION_FIELDS);
  ensureSheetColumns(invSheet, CONFIG.INVENTORY_TRANSACTION_FIELDS);
}

function normalizeSparePart(p) {
  if (!p) return p;
  var out = {};
  CONFIG.SPARE_PART_FIELDS.forEach(function(c) { out[c] = p[c] || ''; });
  out.PartCode = out.PartCode || '';
  out.PartName = out.PartName || '';
  out.Category = out.Category || '';
  out.Manufacturer = out.Manufacturer || '';
  out.MachineCompatibility = out.MachineCompatibility || '';
  out.AssetCompatibility = out.AssetCompatibility || '';
  out.Unit = out.Unit || 'Pcs';
  out.MinimumStock = parseFloat(out.MinimumStock) || 0;
  out.MaximumStock = parseFloat(out.MaximumStock) || 0;
  out.CurrentStock = parseFloat(out.CurrentStock) || 0;
  out.ReorderLevel = parseFloat(out.ReorderLevel) || 0;
  out.StoreLocation = out.StoreLocation || '';
  out.BinNumber = out.BinNumber || '';
  out.UnitCost = parseFloat(out.UnitCost) || 0;
  out.Supplier = out.Supplier || '';
  out.Barcode = out.Barcode || '';
  out.QRCode = out.QRCode || '';
  out.QRGeneratedDate = out.QRGeneratedDate || '';
  out.Status = out.Status || CONFIG.STATUS.ACTIVE;
  out.Remarks = out.Remarks || '';
  out.CreatedBy = out.CreatedBy || '';
  out.CreatedAt = out.CreatedAt || '';
  out.UpdatedBy = out.UpdatedBy || '';
  out.UpdatedAt = out.UpdatedAt || '';
  return out;
}

function getSpareParts() {
  Logger.log('getSpareParts() called');
  console.log('getSpareParts() called');
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  return data.map(normalizeSparePart);
}

function getSparePart(id) {
  Logger.log('getSparePart() called: ' + id);
  console.log('getSparePart() called: ' + id);
  var record = getRecordById(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', id);
  return normalizeSparePart(record);
}

function addSparePart(data) {
  Logger.log('addSparePart() called');
  console.log('addSparePart() called');
  data.Stock = data.CurrentStock || data.Stock || 0;
  var errors = validateSparePartData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  delete data.Stock;
  data.PartCode = generateId(CONFIG.SHEET_NAMES.SPARE_PARTS, CONFIG.ID_PREFIXES.SPARE_PART);
  data.CurrentStock = parseFloat(data.CurrentStock) || 0;
  data.MinimumStock = parseFloat(data.MinimumStock) || 0;
  data.MaximumStock = parseFloat(data.MaximumStock) || 0;
  data.UnitCost = parseFloat(data.UnitCost) || 0;
  data.ReorderLevel = parseFloat(data.ReorderLevel) || 0;
  data.CreatedBy = Session.getActiveUser().getEmail();
  data.CreatedAt = getCurrentTimestamp();
  if (!data.Status) data.Status = CONFIG.STATUS.ACTIVE;
  Logger.log('addSparePart(): PartCode=' + data.PartCode + ', PartName=' + data.PartName);
  console.log('addSparePart(): PartCode=' + data.PartCode + ', PartName=' + data.PartName);
  var result = addRow(CONFIG.SHEET_NAMES.SPARE_PARTS, data);
  logActivity('Add Spare Part', data.PartCode + ' - ' + data.PartName);
  if (data.MinimumStock > 0 && data.CurrentStock <= data.MinimumStock) {
    try { notifyLowStock(data.PartCode, data.PartName, data.CurrentStock, data.MinimumStock); } catch(e) {}
  }
  try { createAuditLog(CONFIG.AUDIT_MODULES.SPARE_PART, CONFIG.AUDIT_ACTIONS.CREATE, data.PartCode, data.PartName || '', '', 'Stock: ' + (data.CurrentStock || '0') + ', Min: ' + (data.MinimumStock || '0') + ', Max: ' + (data.MaximumStock || '0'), 'Success', 'Spare part created'); } catch(e) {}
  try { generateQRBarcodeForNewRecord('Spare Part', data.PartCode, data); } catch(e) { console.error('QR gen error: ' + e.message); }
  Logger.log('addSparePart() SUCCESS: ' + data.PartCode);
  console.log('addSparePart() SUCCESS: ' + data.PartCode);
  return result.map(normalizeSparePart);
}

function updateSparePart(id, data) {
  Logger.log('updateSparePart() called: ' + id);
  console.log('updateSparePart() called: ' + id);
  var current = getSparePart(id);
  if (!current) throw new Error('Spare part not found: ' + id);
  data.Stock = data.CurrentStock || current.CurrentStock || 0;
  var errors = validateSparePartData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  delete data.Stock;
  data.CurrentStock = parseFloat(data.CurrentStock) || current.CurrentStock || 0;
  data.MinimumStock = parseFloat(data.MinimumStock) || current.MinimumStock || 0;
  data.MaximumStock = parseFloat(data.MaximumStock) || current.MaximumStock || 0;
  data.UnitCost = parseFloat(data.UnitCost) || current.UnitCost || 0;
  data.ReorderLevel = parseFloat(data.ReorderLevel) || current.ReorderLevel || 0;
  data.UpdatedBy = Session.getActiveUser().getEmail();
  data.UpdatedAt = getCurrentTimestamp();
  if (data.Status && data.Status === CONFIG.STATUS.INACTIVE) {
    data.Status = CONFIG.STATUS.INACTIVE;
  }
  var result = updateRow(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', id, data);
  logActivity('Update Spare Part', id);
  if (data.MinimumStock > 0 && data.CurrentStock <= data.MinimumStock) {
    try { notifyLowStock(id, current.PartName, data.CurrentStock, data.MinimumStock); } catch(e) {}
  }
  try { createAuditLog(CONFIG.AUDIT_MODULES.SPARE_PART, CONFIG.AUDIT_ACTIONS.UPDATE, id, current.PartName || '', '', JSON.stringify(data).substring(0, 150), 'Success', 'Spare part updated'); } catch(e) {}
  Logger.log('updateSparePart() SUCCESS: ' + id);
  console.log('updateSparePart() SUCCESS: ' + id);
  return result.map(normalizeSparePart);
}

function deleteSparePart(id) {
  Logger.log('deleteSparePart() called: ' + id);
  console.log('deleteSparePart() called: ' + id);
  var current = getSparePart(id);
  var result = deleteRow(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', id);
  logActivity('Delete Spare Part', id);
  try { createAuditLog(CONFIG.AUDIT_MODULES.SPARE_PART, CONFIG.AUDIT_ACTIONS.DELETE, id, current ? current.PartName : '', '', 'Spare part deleted', 'Success', 'Spare part deleted'); } catch(e) {}
  Logger.log('deleteSparePart() SUCCESS: ' + id);
  console.log('deleteSparePart() SUCCESS: ' + id);
  return result.map(normalizeSparePart);
}

function searchSpareParts(query) {
  Logger.log('searchSpareParts() called: ' + query);
  console.log('searchSpareParts() called: ' + query);
  var result = searchData(CONFIG.SHEET_NAMES.SPARE_PARTS, query);
  return result.map(normalizeSparePart);
}

function filterSpareParts(filters) {
  Logger.log('filterSpareParts() called');
  console.log('filterSpareParts() called');
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var result = data.filter(function(p) {
    var match = true;
    if (filters.category && filters.category !== '') {
      if ((p.Category || '').toLowerCase() !== filters.category.toLowerCase()) match = false;
    }
    if (filters.status && filters.status !== '') {
      if ((p.Status || '').toLowerCase() !== filters.status.toLowerCase()) match = false;
    }
    if (filters.manufacturer && filters.manufacturer !== '') {
      if ((p.Manufacturer || '').toLowerCase().indexOf(filters.manufacturer.toLowerCase()) === -1) match = false;
    }
    if (filters.supplier && filters.supplier !== '') {
      if ((p.Supplier || '').toLowerCase().indexOf(filters.supplier.toLowerCase()) === -1) match = false;
    }
    return match;
  });
  return result.map(normalizeSparePart);
}

function getLowStockParts() {
  Logger.log('getLowStockParts() called');
  console.log('getLowStockParts() called');
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  return data.filter(function(p) {
    var stock = parseFloat(p.CurrentStock) || 0;
    var min = parseFloat(p.MinimumStock) || 0;
    return min > 0 && stock <= min;
  }).map(normalizeSparePart);
}

function getOutOfStockParts() {
  Logger.log('getOutOfStockParts() called');
  console.log('getOutOfStockParts() called');
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  return data.filter(function(p) {
    return (parseFloat(p.CurrentStock) || 0) <= 0;
  }).map(normalizeSparePart);
}

function getPartsByCategory(category) {
  Logger.log('getPartsByCategory() called: ' + category);
  console.log('getPartsByCategory() called: ' + category);
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  return data.filter(function(p) {
    return (p.Category || '').toLowerCase() === category.toLowerCase();
  }).map(normalizeSparePart);
}

function getPartsBySupplier(supplier) {
  Logger.log('getPartsBySupplier() called: ' + supplier);
  console.log('getPartsBySupplier() called: ' + supplier);
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  return data.filter(function(p) {
    return (p.Supplier || '').toLowerCase() === supplier.toLowerCase();
  }).map(normalizeSparePart);
}

function getStockValue() {
  Logger.log('getStockValue() called');
  console.log('getStockValue() called');
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var total = 0;
  data.forEach(function(p) {
    total += (parseFloat(p.CurrentStock) || 0) * (parseFloat(p.UnitCost) || 0);
  });
  Logger.log('getStockValue() total=' + total);
  console.log('getStockValue() total=' + total);
  return total;
}

function getStockHistory(partCode) {
  Logger.log('getStockHistory() called: ' + partCode);
  console.log('getStockHistory() called: ' + partCode);
  var data = getAllData(CONFIG.SHEET_NAMES.STOCK_HISTORY) || [];
  return data.filter(function(r) {
    return String(r.PartCode) === String(partCode);
  });
}

function addStockMovement(partCode, transactionType, quantity, referenceNo, remarks) {
  Logger.log('addStockMovement() called: ' + partCode + ', type=' + transactionType + ', qty=' + quantity);
  console.log('addStockMovement() called: ' + partCode + ', type=' + transactionType + ', qty=' + quantity);
  var part = getSparePart(partCode);
  if (!part) throw new Error('Spare part not found: ' + partCode);
  var qty = parseFloat(quantity) || 0;
  var balanceBefore = parseFloat(part.CurrentStock) || 0;
  var balanceAfter = balanceBefore + qty;
  if (balanceAfter < 0) throw new Error('Insufficient stock. Current: ' + balanceBefore + ', Requested: ' + Math.abs(qty));
  var historyData = {
    PartCode: partCode,
    PartName: part.PartName,
    TransactionType: transactionType,
    Quantity: qty,
    BalanceBefore: balanceBefore,
    BalanceAfter: balanceAfter,
    ReferenceNo: referenceNo || '',
    Remarks: remarks || '',
    CreatedBy: Session.getActiveUser().getEmail(),
    CreatedAt: getCurrentTimestamp()
  };
  addRow(CONFIG.SHEET_NAMES.STOCK_HISTORY, historyData);
  var updateData = {
    CurrentStock: balanceAfter,
    UpdatedBy: Session.getActiveUser().getEmail(),
    UpdatedAt: getCurrentTimestamp()
  };
  var result = updateRow(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', partCode, updateData);
  logActivity('Stock Movement', partCode + ' - ' + transactionType + ' - Qty: ' + qty);
  if (balanceAfter <= (parseFloat(part.MinimumStock) || 0)) {
    try { notifyLowStock(partCode, part.PartName, balanceAfter, part.MinimumStock); } catch(e) {}
  }
  try {
    var auditAction = transactionType.toLowerCase().indexOf('in') !== -1 ? CONFIG.AUDIT_ACTIONS.STOCK_IN : (transactionType.toLowerCase().indexOf('out') !== -1 ? CONFIG.AUDIT_ACTIONS.STOCK_OUT : CONFIG.AUDIT_ACTIONS.GOODS_RECEIPT);
    var auditModule = transactionType.toLowerCase().indexOf('goods') !== -1 ? CONFIG.AUDIT_MODULES.GOODS_RECEIPT : CONFIG.AUDIT_MODULES.SPARE_PART;
    createAuditLog(auditModule, auditAction, partCode, part.PartName || '', String(balanceBefore), String(balanceAfter), balanceAfter <= (parseFloat(part.MinimumStock) || 0) ? 'Warning' : 'Success', transactionType + ': ' + qty + ' units, Ref: ' + (referenceNo || ''));
  } catch(e) {}
  Logger.log('addStockMovement() SUCCESS: ' + partCode + ' balance=' + balanceAfter);
  console.log('addStockMovement() SUCCESS: ' + partCode + ' balance=' + balanceAfter);
  return result.map(normalizeSparePart);
}

function exportSparePartsCSV() {
  Logger.log('exportSparePartsCSV() called');
  console.log('exportSparePartsCSV() called');
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  var headers = CONFIG.SPARE_PART_FIELDS;
  var csvRows = [];
  csvRows.push(headers.join(','));
  data.forEach(function(row) {
    var vals = headers.map(function(h) {
      var val = row[h] || '';
      var str = String(val).replace(/"/g, '""');
      if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
        str = '"' + str + '"';
      }
      return str;
    });
    csvRows.push(vals.join(','));
  });
  var csv = csvRows.join('\n');
  Logger.log('exportSparePartsCSV() rows=' + data.length);
  console.log('exportSparePartsCSV() rows=' + data.length);
  return csv;
}
