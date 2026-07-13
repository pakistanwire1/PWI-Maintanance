function doGet(e) {
  Logger.log('doGet() called');

  if (e && e.parameter && e.parameter.voice === '1') {
    var voiceHtml = HtmlService.createHtmlOutputFromFile('VoiceInput')
      .setTitle('Voice Input')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return voiceHtml;
  }

  if (e && e.parameter && e.parameter.img === 'logo') {
    return serveLogo();
  }

  if (e && e.parameter && e.parameter.manifest === '1') {
    return serveManifest();
  }

  if (e && e.parameter && e.parameter.sw === '1') {
    return serveServiceWorker();
  }

  var template = HtmlService.createTemplateFromFile('WelcomePage');
  var html = template.evaluate()
    .setTitle('Pakistan Wire Industries')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  Logger.log('doGet() completed, HTML length: ' + html.getContent().length);
  return html;
}

function serveManifest() {
  var manifest = {
    name: 'Pakistan Wires CMMS',
    short_name: 'CMMS',
    description: 'Pakistan Wire Industries - Maintenance Management System',
    start_url: ScriptApp.getService().getUrl(),
    display: 'standalone',
    background_color: '#0b0d14',
    theme_color: '#6366f1',
    orientation: 'any',
    scope: '/',
    icons: [
      { src: ScriptApp.getService().getUrl() + '?img=logo&size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: ScriptApp.getService().getUrl() + '?img=logo&size=512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    categories: ['business', 'utilities'],
    lang: 'en',
    dir: 'ltr'
  };
  return ContentService.createTextOutput(JSON.stringify(manifest))
    .setMimeType(ContentService.MimeType.JSON);
}

function serveServiceWorker() {
  var swCode = 'const CACHE_NAME="cmms-v1";const OFFLINE_URL="/?offline=1";self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(["/"]);}).then(function(){return self.skipWaiting();}));});self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(names){return Promise.all(names.filter(function(n){return n!==CACHE_NAME;}).map(function(n){return caches.delete(n);}));}).then(function(){return self.clients.claim();}));});self.addEventListener("fetch",function(e){if(e.request.method!=="GET")return;if(e.request.url.includes("google.script.run")||e.request.url.includes("scriptexec")){e.respondWith(fetch(e.request).catch(function(){return caches.match(e.request);}));return;}e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request).then(function(resp){return caches.open(CACHE_NAME).then(function(c){c.put(e.request,resp.clone());return resp;});});}).catch(function(){return caches.match("/");}));});';
  return ContentService.createTextOutput(swCode)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getAppHtml() {
  Logger.log('getAppHtml() called');
  initializeSystem();
  var template = HtmlService.createTemplateFromFile('Index');
  var html = template.evaluate()
    .setTitle(CONFIG.APP_NAME)
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
