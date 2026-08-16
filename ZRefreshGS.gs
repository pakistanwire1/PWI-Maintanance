function flushSpreadsheet() {
  SpreadsheetApp.flush();
  return true;
}

function getDataVersion() {
  SpreadsheetApp.flush();
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheets = ss.getSheets();
  var parts = [];
  sheets.forEach(function(s) {
    parts.push(s.getName() + ':' + s.getLastRow());
  });
  return parts.join('|');
}
