function generateInventoryId(sheetName, prefix) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
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

function initInventorySheet() {
  Logger.log('initInventorySheet() called');
  console.log('initInventorySheet() called');
  try {
    var invSheet = getSheet(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS);
    ensureHeaders(invSheet, CONFIG.INVENTORY_TRANSACTION_FIELDS);
    ensureSheetColumns(invSheet, CONFIG.INVENTORY_TRANSACTION_FIELDS);
    var grSheet = getSheet(CONFIG.SHEET_NAMES.GOODS_RECEIPT);
    ensureHeaders(grSheet, CONFIG.GOODS_RECEIPT_FIELDS);
    ensureSheetColumns(grSheet, CONFIG.GOODS_RECEIPT_FIELDS);
    Logger.log('initInventorySheet() SUCCESS');
    console.log('initInventorySheet() SUCCESS');
    return true;
  } catch (e) {
    Logger.log('initInventorySheet() ERROR: ' + e.message);
    console.log('initInventorySheet() ERROR: ' + e.message);
    return false;
  }
}

function getAllTransactions() {
  Logger.log('getAllTransactions() called');
  console.log('getAllTransactions() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    Logger.log('getAllTransactions() count=' + data.length);
    console.log('getAllTransactions() count=' + data.length);
    return data;
  } catch (e) {
    Logger.log('getAllTransactions() ERROR: ' + e.message);
    console.log('getAllTransactions() ERROR: ' + e.message);
    return [];
  }
}

function getTransaction(id) {
  Logger.log('getTransaction() called: ' + id);
  console.log('getTransaction() called: ' + id);
  try {
    var record = getRecordById(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, 'TransactionID', id);
    Logger.log('getTransaction() result=' + (record ? 'found' : 'not found'));
    console.log('getTransaction() result=' + (record ? 'found' : 'not found'));
    return record;
  } catch (e) {
    Logger.log('getTransaction() ERROR: ' + e.message);
    console.log('getTransaction() ERROR: ' + e.message);
    return null;
  }
}

function getTransactionsByPart(partCode) {
  Logger.log('getTransactionsByPart() called: ' + partCode);
  console.log('getTransactionsByPart() called: ' + partCode);
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    var result = data.filter(function(r) {
      return String(r.PartCode) === String(partCode);
    });
    Logger.log('getTransactionsByPart() count=' + result.length);
    console.log('getTransactionsByPart() count=' + result.length);
    return result;
  } catch (e) {
    Logger.log('getTransactionsByPart() ERROR: ' + e.message);
    console.log('getTransactionsByPart() ERROR: ' + e.message);
    return [];
  }
}

function getTransactionsByType(type) {
  Logger.log('getTransactionsByType() called: ' + type);
  console.log('getTransactionsByType() called: ' + type);
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    var result = data.filter(function(r) {
      return (r.TransactionType || '').toLowerCase() === type.toLowerCase();
    });
    Logger.log('getTransactionsByType() count=' + result.length);
    console.log('getTransactionsByType() count=' + result.length);
    return result;
  } catch (e) {
    Logger.log('getTransactionsByType() ERROR: ' + e.message);
    console.log('getTransactionsByType() ERROR: ' + e.message);
    return [];
  }
}

function getTransactionsByDateRange(startDate, endDate) {
  Logger.log('getTransactionsByDateRange() called: ' + startDate + ' to ' + endDate);
  console.log('getTransactionsByDateRange() called: ' + startDate + ' to ' + endDate);
  try {
    var start = new Date(startDate);
    var end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    var data = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    var result = data.filter(function(r) {
      var ts = r.CreatedAt ? new Date(r.CreatedAt) : null;
      if (!ts || isNaN(ts.getTime())) return false;
      return ts >= start && ts <= end;
    });
    Logger.log('getTransactionsByDateRange() count=' + result.length);
    console.log('getTransactionsByDateRange() count=' + result.length);
    return result;
  } catch (e) {
    Logger.log('getTransactionsByDateRange() ERROR: ' + e.message);
    console.log('getTransactionsByDateRange() ERROR: ' + e.message);
    return [];
  }
}

function processGoodsReceipt(data) {
  Logger.log('processGoodsReceipt() called');
  console.log('processGoodsReceipt() called');
  try {
    var grnNo = generateInventoryId(CONFIG.SHEET_NAMES.GOODS_RECEIPT, 'GRN-');
    var part = getRecordById(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', data.PartCode);
    if (!part) throw new Error('Spare part not found: ' + data.PartCode);
    var qty = parseFloat(data.Quantity) || 0;
    var unitCost = parseFloat(data.UnitCost) || (parseFloat(part.UnitCost) || 0);
    var totalCost = qty * unitCost;
    var currentUser = Session.getActiveUser().getEmail();
    var now = new Date();
    var grData = {
      GRNNo: grnNo,
      PartCode: data.PartCode,
      PartName: part.PartName || data.PartName || '',
      Quantity: qty,
      UnitCost: unitCost,
      TotalCost: totalCost,
      Supplier: data.Supplier || part.Supplier || '',
      InvoiceNo: data.InvoiceNo || '',
      PONo: data.PONo || '',
      ReceivedBy: data.ReceivedBy || currentUser,
      ReceivedDate: formatDateTimeISO(now),
      Remarks: data.Remarks || '',
      Status: 'Received',
      CreatedBy: currentUser,
      CreatedAt: getCurrentTimestamp(),
      UpdatedBy: currentUser,
      UpdatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.GOODS_RECEIPT, grData);
    var txnData = {
      TransactionID: generateInventoryId(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, 'TXN-'),
      TransactionType: CONFIG.TRANSACTION_TYPES.GOODS_RECEIPT,
      PartCode: data.PartCode,
      PartName: part.PartName || data.PartName || '',
      Quantity: qty,
      ReferenceNo: grnNo,
      ReferenceType: 'GRN',
      FromLocation: data.FromLocation || '',
      ToLocation: part.StoreLocation || '',
      UnitCost: unitCost,
      TotalCost: totalCost,
      Remarks: data.Remarks || '',
      ProcessedBy: currentUser,
      ProcessedAt: formatDateTimeISO(now),
      CreatedBy: currentUser,
      CreatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, txnData);
    var result = addStockMovement(data.PartCode, CONFIG.TRANSACTION_TYPES.GOODS_RECEIPT, qty, grnNo, data.Remarks || '');
    logActivity('Goods Receipt', 'GRN: ' + grnNo + ', Part: ' + data.PartCode + ', Qty: ' + qty);
    Logger.log('processGoodsReceipt() SUCCESS: ' + grnNo);
    console.log('processGoodsReceipt() SUCCESS: ' + grnNo);
    try { createNotification('Goods Receipt: ' + grnNo, 'Goods receipt ' + grnNo + ' received for ' + (part.PartName || data.PartCode) + ' - Qty: ' + qty, CONFIG.NOTIFICATION_MODULES.GOODS_RECEIPT, CONFIG.PRIORITY.LOW, currentUser, '', "navigateTo('goodsreceipt')"); } catch(e) {}
    return { success: true, grnNo: grnNo };
  } catch (e) {
    Logger.log('processGoodsReceipt() ERROR: ' + e.message);
    console.log('processGoodsReceipt() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function processIssue(data) {
  Logger.log('processIssue() called');
  console.log('processIssue() called');
  try {
    var part = getRecordById(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', data.PartCode);
    if (!part) throw new Error('Spare part not found: ' + data.PartCode);
    var qty = parseFloat(data.Quantity) || 0;
    if (qty <= 0) throw new Error('Invalid quantity: ' + qty);
    var currentStock = parseFloat(part.CurrentStock) || 0;
    if (currentStock < qty) throw new Error('Insufficient stock. Current: ' + currentStock + ', Required: ' + qty);
    var currentUser = Session.getActiveUser().getEmail();
    var now = new Date();
    var unitCost = parseFloat(data.UnitCost) || (parseFloat(part.UnitCost) || 0);
    var totalCost = qty * unitCost;
    var txnId = generateInventoryId(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, 'TXN-');
    var txnData = {
      TransactionID: txnId,
      TransactionType: CONFIG.TRANSACTION_TYPES.ISSUE,
      PartCode: data.PartCode,
      PartName: part.PartName || data.PartName || '',
      Quantity: qty,
      ReferenceNo: data.ReferenceNo || '',
      ReferenceType: data.ReferenceType || '',
      FromLocation: part.StoreLocation || '',
      ToLocation: data.ToLocation || '',
      UnitCost: unitCost,
      TotalCost: totalCost,
      Remarks: data.Remarks || '',
      ProcessedBy: currentUser,
      ProcessedAt: formatDateTimeISO(now),
      CreatedBy: currentUser,
      CreatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, txnData);
    var result = addStockMovement(data.PartCode, CONFIG.TRANSACTION_TYPES.ISSUE, -qty, txnId, data.Remarks || '');
    logActivity('Stock Issue', 'TXN: ' + txnId + ', Part: ' + data.PartCode + ', Qty: ' + qty);
    Logger.log('processIssue() SUCCESS: ' + txnId);
    console.log('processIssue() SUCCESS: ' + txnId);
    try { createNotification('Spare Parts Issued: ' + data.PartCode, 'Spare parts issued - ' + (part.PartName || data.PartCode) + ' x ' + qty + ' for ' + (data.ReferenceNo || data.ReferenceType || '') + '. New stock: ' + (parseFloat(part.CurrentStock) - qty), CONFIG.NOTIFICATION_MODULES.INVENTORY, CONFIG.PRIORITY.MEDIUM, currentUser, data.ReceivedBy || '', "navigateTo('inventory')"); } catch(e) {}
    return { success: true, transactionId: txnId };
  } catch (e) {
    Logger.log('processIssue() ERROR: ' + e.message);
    console.log('processIssue() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function processReturn(data) {
  Logger.log('processReturn() called');
  console.log('processReturn() called');
  try {
    var part = getRecordById(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', data.PartCode);
    if (!part) throw new Error('Spare part not found: ' + data.PartCode);
    var qty = parseFloat(data.Quantity) || 0;
    if (qty <= 0) throw new Error('Invalid quantity: ' + qty);
    var currentUser = Session.getActiveUser().getEmail();
    var now = new Date();
    var unitCost = parseFloat(data.UnitCost) || (parseFloat(part.UnitCost) || 0);
    var totalCost = qty * unitCost;
    var txnId = generateInventoryId(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, 'TXN-');
    var txnData = {
      TransactionID: txnId,
      TransactionType: CONFIG.TRANSACTION_TYPES.RETURN,
      PartCode: data.PartCode,
      PartName: part.PartName || data.PartName || '',
      Quantity: qty,
      ReferenceNo: data.ReferenceNo || '',
      ReferenceType: data.ReferenceType || '',
      FromLocation: data.FromLocation || '',
      ToLocation: part.StoreLocation || '',
      UnitCost: unitCost,
      TotalCost: totalCost,
      Remarks: data.Remarks || '',
      ProcessedBy: currentUser,
      ProcessedAt: formatDateTimeISO(now),
      CreatedBy: currentUser,
      CreatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, txnData);
    var result = addStockMovement(data.PartCode, CONFIG.TRANSACTION_TYPES.RETURN, qty, txnId, data.Remarks || '');
    logActivity('Stock Return', 'TXN: ' + txnId + ', Part: ' + data.PartCode + ', Qty: ' + qty);
    Logger.log('processReturn() SUCCESS: ' + txnId);
    console.log('processReturn() SUCCESS: ' + txnId);
    return { success: true, transactionId: txnId };
  } catch (e) {
    Logger.log('processReturn() ERROR: ' + e.message);
    console.log('processReturn() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function processTransfer(data) {
  Logger.log('processTransfer() called');
  console.log('processTransfer() called');
  try {
    var part = getRecordById(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', data.PartCode);
    if (!part) throw new Error('Spare part not found: ' + data.PartCode);
    var qty = parseFloat(data.Quantity) || 0;
    if (qty <= 0) throw new Error('Invalid quantity: ' + qty);
    var fromLocation = data.FromLocation || part.StoreLocation || '';
    var toLocation = data.ToLocation || '';
    if (!toLocation) throw new Error('Destination location is required');
    var currentUser = Session.getActiveUser().getEmail();
    var now = new Date();
    var txnId = generateInventoryId(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, 'TXN-');
    var txnData = {
      TransactionID: txnId,
      TransactionType: CONFIG.TRANSACTION_TYPES.TRANSFER,
      PartCode: data.PartCode,
      PartName: part.PartName || data.PartName || '',
      Quantity: qty,
      ReferenceNo: data.ReferenceNo || '',
      ReferenceType: data.ReferenceType || '',
      FromLocation: fromLocation,
      ToLocation: toLocation,
      UnitCost: parseFloat(part.UnitCost) || 0,
      TotalCost: qty * (parseFloat(part.UnitCost) || 0),
      Remarks: data.Remarks || '',
      ProcessedBy: currentUser,
      ProcessedAt: formatDateTimeISO(now),
      CreatedBy: currentUser,
      CreatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, txnData);
    var updateData = {
      StoreLocation: toLocation,
      UpdatedBy: currentUser,
      UpdatedAt: getCurrentTimestamp()
    };
    updateRow(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', data.PartCode, updateData);
    logActivity('Stock Transfer', 'TXN: ' + txnId + ', Part: ' + data.PartCode + ', From: ' + fromLocation + ', To: ' + toLocation);
    Logger.log('processTransfer() SUCCESS: ' + txnId);
    console.log('processTransfer() SUCCESS: ' + txnId);
    return { success: true, transactionId: txnId };
  } catch (e) {
    Logger.log('processTransfer() ERROR: ' + e.message);
    console.log('processTransfer() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function processAdjustment(data) {
  Logger.log('processAdjustment() called');
  console.log('processAdjustment() called');
  try {
    var part = getRecordById(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', data.PartCode);
    if (!part) throw new Error('Spare part not found: ' + data.PartCode);
    if (!data.Remarks) throw new Error('Reason/Remarks required for stock adjustment');
    var qty = parseFloat(data.Quantity) || 0;
    if (qty === 0) throw new Error('Adjustment quantity cannot be zero');
    var currentUser = Session.getActiveUser().getEmail();
    var now = new Date();
    var unitCost = parseFloat(data.UnitCost) || (parseFloat(part.UnitCost) || 0);
    var totalCost = Math.abs(qty) * unitCost;
    var txnId = generateInventoryId(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, 'TXN-');
    var txnData = {
      TransactionID: txnId,
      TransactionType: CONFIG.TRANSACTION_TYPES.ADJUSTMENT,
      PartCode: data.PartCode,
      PartName: part.PartName || data.PartName || '',
      Quantity: qty,
      ReferenceNo: data.ReferenceNo || '',
      ReferenceType: data.ReferenceType || '',
      FromLocation: part.StoreLocation || '',
      ToLocation: data.ToLocation || '',
      UnitCost: unitCost,
      TotalCost: totalCost,
      Remarks: data.Remarks || '',
      ProcessedBy: currentUser,
      ProcessedAt: formatDateTimeISO(now),
      CreatedBy: currentUser,
      CreatedAt: getCurrentTimestamp()
    };
    addRow(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, txnData);
    var result = addStockMovement(data.PartCode, CONFIG.TRANSACTION_TYPES.ADJUSTMENT, qty, txnId, data.Remarks || '');
    logActivity('Stock Adjustment', 'TXN: ' + txnId + ', Part: ' + data.PartCode + ', Qty: ' + qty);
    Logger.log('processAdjustment() SUCCESS: ' + txnId);
    console.log('processAdjustment() SUCCESS: ' + txnId);
    return { success: true, transactionId: txnId };
  } catch (e) {
    Logger.log('processAdjustment() ERROR: ' + e.message);
    console.log('processAdjustment() ERROR: ' + e.message);
    return { success: false, message: e.message };
  }
}

function getCurrentStockSummary() {
  Logger.log('getCurrentStockSummary() called');
  console.log('getCurrentStockSummary() called');
  try {
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
    var totalParts = 0;
    var totalValue = 0;
    var lowStockCount = 0;
    var outOfStockCount = 0;
    parts.forEach(function(p) {
      var stock = parseFloat(p.CurrentStock) || 0;
      var cost = parseFloat(p.UnitCost) || 0;
      var min = parseFloat(p.MinimumStock) || 0;
      if (stock > 0) totalParts++;
      totalValue += stock * cost;
      if (min > 0 && stock <= min) lowStockCount++;
      if (stock <= 0) outOfStockCount++;
    });
    var result = {
      totalParts: totalParts,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockCount: lowStockCount,
      outOfStockCount: outOfStockCount
    };
    Logger.log('getCurrentStockSummary() result=' + JSON.stringify(result));
    console.log('getCurrentStockSummary() result=' + JSON.stringify(result));
    return result;
  } catch (e) {
    Logger.log('getCurrentStockSummary() ERROR: ' + e.message);
    console.log('getCurrentStockSummary() ERROR: ' + e.message);
    return { totalParts: 0, totalValue: 0, lowStockCount: 0, outOfStockCount: 0 };
  }
}

function getLowStockAlerts() {
  Logger.log('getLowStockAlerts() called');
  console.log('getLowStockAlerts() called');
  try {
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
    var result = parts.filter(function(p) {
      var stock = parseFloat(p.CurrentStock) || 0;
      var min = parseFloat(p.MinimumStock) || 0;
      return min > 0 && stock <= min;
    });
    Logger.log('getLowStockAlerts() count=' + result.length);
    console.log('getLowStockAlerts() count=' + result.length);
    return result;
  } catch (e) {
    Logger.log('getLowStockAlerts() ERROR: ' + e.message);
    console.log('getLowStockAlerts() ERROR: ' + e.message);
    return [];
  }
}

function getOutOfStockAlerts() {
  Logger.log('getOutOfStockAlerts() called');
  console.log('getOutOfStockAlerts() called');
  try {
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
    var result = parts.filter(function(p) {
      return (parseFloat(p.CurrentStock) || 0) <= 0;
    });
    Logger.log('getOutOfStockAlerts() count=' + result.length);
    console.log('getOutOfStockAlerts() count=' + result.length);
    return result;
  } catch (e) {
    Logger.log('getOutOfStockAlerts() ERROR: ' + e.message);
    console.log('getOutOfStockAlerts() ERROR: ' + e.message);
    return [];
  }
}

function getInventoryDashboardData() {
  Logger.log('getInventoryDashboardData() called');
  console.log('getInventoryDashboardData() called');
  try {
    var parts = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
    var transactions = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    var totalStockValue = 0;
    var lowStockCount = 0;
    var outOfStockCount = 0;
    parts.forEach(function(p) {
      var stock = parseFloat(p.CurrentStock) || 0;
      var cost = parseFloat(p.UnitCost) || 0;
      var min = parseFloat(p.MinimumStock) || 0;
      totalStockValue += stock * cost;
      if (min > 0 && stock <= min) lowStockCount++;
      if (stock <= 0) outOfStockCount++;
    });
    totalStockValue = Math.round(totalStockValue * 100) / 100;
    var sortedTxns = transactions.slice().sort(function(a, b) {
      var da = a.CreatedAt ? new Date(a.CreatedAt) : new Date(0);
      var db = b.CreatedAt ? new Date(b.CreatedAt) : new Date(0);
      return db - da;
    });
    var recentTransactions = sortedTxns.slice(0, 20);
    var issueMap = {};
    transactions.forEach(function(t) {
      if (t.TransactionType === CONFIG.TRANSACTION_TYPES.ISSUE) {
        var code = t.PartCode || '';
        var qty = Math.abs(parseFloat(t.Quantity) || 0);
        if (code) {
          if (!issueMap[code]) issueMap[code] = { PartCode: code, PartName: t.PartName || '', TotalIssued: 0 };
          issueMap[code].TotalIssued += qty;
        }
      }
    });
    var issueArr = [];
    for (var key in issueMap) {
      if (issueMap.hasOwnProperty(key)) issueArr.push(issueMap[key]);
    }
    issueArr.sort(function(a, b) { return b.TotalIssued - a.TotalIssued; });
    var topConsumed = issueArr.slice(0, 10);
    var result = {
      totalStockValue: totalStockValue,
      lowStockCount: lowStockCount,
      outOfStockCount: outOfStockCount,
      recentTransactions: recentTransactions,
      topConsumed: topConsumed
    };
    Logger.log('getInventoryDashboardData() result=' + JSON.stringify(result));
    console.log('getInventoryDashboardData() result=' + JSON.stringify(result));
    return result;
  } catch (e) {
    Logger.log('getInventoryDashboardData() ERROR: ' + e.message);
    console.log('getInventoryDashboardData() ERROR: ' + e.message);
    return { totalStockValue: 0, lowStockCount: 0, outOfStockCount: 0, recentTransactions: [], topConsumed: [] };
  }
}

function searchTransactions(query) {
  Logger.log('searchTransactions() called: ' + query);
  console.log('searchTransactions() called: ' + query);
  try {
    var result = searchData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS, query);
    Logger.log('searchTransactions() count=' + result.length);
    console.log('searchTransactions() count=' + result.length);
    return result;
  } catch (e) {
    Logger.log('searchTransactions() ERROR: ' + e.message);
    console.log('searchTransactions() ERROR: ' + e.message);
    return [];
  }
}

function exportTransactionsCSV() {
  Logger.log('exportTransactionsCSV() called');
  console.log('exportTransactionsCSV() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    var headers = CONFIG.INVENTORY_TRANSACTION_FIELDS;
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
    Logger.log('exportTransactionsCSV() rows=' + data.length);
    console.log('exportTransactionsCSV() rows=' + data.length);
    return csv;
  } catch (e) {
    Logger.log('exportTransactionsCSV() ERROR: ' + e.message);
    console.log('exportTransactionsCSV() ERROR: ' + e.message);
    return '';
  }
}
