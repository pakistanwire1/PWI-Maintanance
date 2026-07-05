function doGet() {
  Logger.log('doGet() called');

  var template = HtmlService.createTemplateFromFile('WelcomePage');
  var html = template.evaluate()
    .setTitle('CMMS - Welcome')
    .setFaviconUrl('https://img.icons8.com/fluency/48/maintenance.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  Logger.log('doGet() completed, HTML length: ' + html.getContent().length);
  return html;
}

function getAppHtml() {
  Logger.log('getAppHtml() called');
  initializeSystem();
  var template = HtmlService.createTemplateFromFile('Index');
  var html = template.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setFaviconUrl('https://img.icons8.com/fluency/48/maintenance.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  Logger.log('getAppHtml() completed, HTML length: ' + html.getContent().length);
  return html.getContent();
}

function include(filename) {
  Logger.log('include() called: ' + filename);
  var content = HtmlService.createHtmlOutputFromFile(filename).getContent();
  Logger.log('include() completed: ' + filename + ', length: ' + content.length);
  return content;
}

function testPing() { return "pong"; }

function getCurrentUser() {
  var session = Session.getActiveUser();
  return {
    email: session.getEmail(),
    name: session.getUserLoginId()
  };
}

function logActivity(action, details) {
  try {
    var logSheet = getSheet(CONFIG.SHEET_NAMES.LOGS);
    ensureHeaders(logSheet, ['Timestamp', 'User', 'Action', 'Details']);
    logSheet.appendRow([
      formatDateTime(new Date()),
      Session.getActiveUser().getEmail(),
      action,
      details || ''
    ]);
  } catch (e) {
    console.error('Log error: ' + e.message);
  }
}

function getServerTimestamp() {
  return {
    date: getTodayDateString(),
    time: getTodayTimeString(),
    datetime: formatDateTimeISO(new Date())
  };
}
