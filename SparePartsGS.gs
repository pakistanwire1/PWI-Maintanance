function initSparePartsSheet() {
  var sheet = getSheet(CONFIG.SHEET_NAMES.SPARE_PARTS);
  ensureHeaders(sheet, ['PartCode', 'PartName', 'Store', 'Stock', 'MinimumStock', 'Unit', 'Cost', 'CreatedAt']);
}

function getSpareParts() {
  return getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS);
}

function addSparePart(data) {
  var errors = validateSparePartData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  data.PartCode = data.PartCode || generateId(CONFIG.SHEET_NAMES.SPARE_PARTS, CONFIG.ID_PREFIXES.SPARE_PART);
  data.CreatedAt = getCurrentTimestamp();
  data.Stock = parseFloat(data.Stock) || 0;
  data.MinimumStock = parseFloat(data.MinimumStock) || 0;
  data.Cost = parseFloat(data.Cost) || 0;

  var result = addRow(CONFIG.SHEET_NAMES.SPARE_PARTS, data);
  logActivity('Add Spare Part', data.PartCode + ' - ' + data.PartName);

  if (data.MinimumStock > 0 && data.Stock <= data.MinimumStock) {
    try { notifyLowStock(data.PartCode, data.PartName, data.Stock, data.MinimumStock); } catch(e) {}
  }
  return result;
}

function updateSparePart(id, data) {
  data.Stock = parseFloat(data.Stock) || 0;
  data.MinimumStock = parseFloat(data.MinimumStock) || 0;
  data.Cost = parseFloat(data.Cost) || 0;
  var result = updateRow(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', id, data);
  logActivity('Update Spare Part', id);
  return result;
}

function deleteSparePart(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.SPARE_PARTS, 'PartCode', id);
  logActivity('Delete Spare Part', id);
  return result;
}

function searchSpareParts(query) {
  return searchData(CONFIG.SHEET_NAMES.SPARE_PARTS, query);
}

function getLowStockParts() {
  var data = getAllData(CONFIG.SHEET_NAMES.SPARE_PARTS) || [];
  return data.filter(function(p) {
    var stock = parseFloat(p.Stock) || 0;
    var min = parseFloat(p.MinimumStock) || 0;
    return min > 0 && stock <= min;
  });
}
