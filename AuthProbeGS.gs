function authorizeExternalRequest() {
  try {
    var r = UrlFetchApp.fetch('https://www.googleapis.com/robots.txt', {
      muteHttpExceptions: true
    });
    return {
      success: r.getResponseCode() === 200,
      code: r.getResponseCode()
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}