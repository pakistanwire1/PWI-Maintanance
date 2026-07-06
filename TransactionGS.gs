function getStockHistory() {
  Logger.log('getStockHistory() called');
  console.log('getStockHistory() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.STOCK_HISTORY) || [];
    Logger.log('getStockHistory() returning ' + data.length + ' records');
    console.log('getStockHistory() returning ' + data.length + ' records');
    return data;
  } catch (e) {
    Logger.log('getStockHistory() ERROR: ' + e.message);
    console.log('getStockHistory() ERROR: ' + e.message);
    return [];
  }
}

function getStockHistoryByPart(partCode) {
  Logger.log('getStockHistoryByPart() called: ' + partCode);
  console.log('getStockHistoryByPart() called: ' + partCode);
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.STOCK_HISTORY) || [];
    var result = data.filter(function(r) {
      return String(r.PartCode) === String(partCode);
    });
    Logger.log('getStockHistoryByPart() returning ' + result.length + ' records');
    console.log('getStockHistoryByPart() returning ' + result.length + ' records');
    return result;
  } catch (e) {
    Logger.log('getStockHistoryByPart() ERROR: ' + e.message);
    console.log('getStockHistoryByPart() ERROR: ' + e.message);
    return [];
  }
}

function getInventoryTransactions() {
  Logger.log('getInventoryTransactions() called');
  console.log('getInventoryTransactions() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.INVENTORY_TRANSACTIONS) || [];
    Logger.log('getInventoryTransactions() returning ' + data.length + ' records');
    console.log('getInventoryTransactions() returning ' + data.length + ' records');
    return data;
  } catch (e) {
    Logger.log('getInventoryTransactions() ERROR: ' + e.message);
    console.log('getInventoryTransactions() ERROR: ' + e.message);
    return [];
  }
}

function getGoodsReceipt() {
  Logger.log('getGoodsReceipt() called');
  console.log('getGoodsReceipt() called');
  try {
    var data = getAllData(CONFIG.SHEET_NAMES.GOODS_RECEIPT) || [];
    Logger.log('getGoodsReceipt() returning ' + data.length + ' records');
    console.log('getGoodsReceipt() returning ' + data.length + ' records');
    return data;
  } catch (e) {
    Logger.log('getGoodsReceipt() ERROR: ' + e.message);
    console.log('getGoodsReceipt() ERROR: ' + e.message);
    return [];
  }
}
