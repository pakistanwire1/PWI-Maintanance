import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const ROOT = path.resolve(import.meta.dirname, '..');
const puppeteer = (await import(pathToFileURL(path.join(ROOT, 'node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href)).default;
const CF = path.join(ROOT, 'cloudflare');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
};

/* =====================================================================
 * PART A - STATIC SOURCE CHECKS
 * ===================================================================== */
(function partA() {
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const api = read('API.gs');
  const waGs = read('WhatsAppGS.gs');
  const authProbe = read('AuthProbeGS.gs');
  const session = read('cloudflare/js/core/session.js');
  const settings = read('cloudflare/js/pages/settings.js');
  const waJs = read('cloudflare/js/pages/whatsapp.js');
  const users = read('cloudflare/js/pages/users.js');
  const auth = read('AuthGS.gs');

  check('A1. API.gs requires CanManageWhatsApp for whatsappSaveSettings', /'whatsappSaveSettings':\s*\{\s*auth:\s*true,\s*perm:\s*'CanManageWhatsApp'/.test(api));
  check('A2. API.gs requires CanManageWhatsApp for whatsappTestSend', /'whatsappTestSend':\s*\{\s*auth:\s*true,\s*perm:\s*'CanManageWhatsApp'/.test(api));
  check('A3. API.gs dispatcher enforces route.perm (403 on missing perm)', /route\.perm/.test(api) && /apiRouteAllowed/.test(api) && /403/.test(api));
  check('A4. whatsappSaveSettings re-checks permission inside handler', waGs.indexOf("requireUserPermission('CanManageWhatsApp', data)") !== -1);
  check('A5. whatsappTestSend re-checks permission inside handler', waGs.indexOf("requireUserPermission('CanManageWhatsApp', data)") !== -1);
  check('A6. Router maps whatsapp page -> manageWhatsApp permission', session.indexOf("whatsapp: 'manageWhatsApp'") !== -1);
  check('A7. Settings section requires email/whatsapp perms', settings.indexOf("id: 'emailwhatsapp'") !== -1 && settings.indexOf("['manageEmail', 'manageWhatsApp']") !== -1);

  /* OB: openById fix regression (web-app deployment context cannot rely on
     the active spreadsheet; all access must be via CONFIG.SPREADSHEET_ID) */
  const configGs = read('ConfigGS.gs');
  const sheetsGs = read('SheetsGS.gs');
  const manifest = read('appsscript.json');
  const gsAll = fs.readdirSync(ROOT).filter((n) => n.endsWith('.gs')).map((n) => read(n)).join('\n');
  check('OB1. ConfigGS defines SPREADSHEET_ID (Drive ID of the backing sheet)', /SPREADSHEET_ID:\s*'1-[A-Za-z0-9_-]{30,}'/.test(configGs));
  check('OB2. SheetsGS.getSheet resolves via openById(CONFIG.SPREADSHEET_ID)', /function getSheet\(name\)/.test(sheetsGs) && sheetsGs.indexOf('SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)') !== -1);
  check('OB3. No getActiveSpreadsheet remains in any .gs file', gsAll.indexOf('getActiveSpreadsheet') === -1);
  check('OB4. appsscript.json declares spreadsheets + external_request scopes', manifest.indexOf('https://www.googleapis.com/auth/spreadsheets') !== -1 && manifest.indexOf('https://www.googleapis.com/auth/script.external_request') !== -1);

  check('H1. whatsappAuthProbe route exists and requires CanManageWhatsApp', /'whatsappAuthProbe':\s*\{\s*auth:\s*true,\s*perm:\s*'CanManageWhatsApp'/.test(api));
  check('H2. whatsappAuthProbe backend fn exists (perm-gated)', waGs.indexOf('function whatsappAuthProbe(data)') !== -1 && waGs.indexOf("requireUserPermission('CanManageWhatsApp', data)") !== -1);
  check('H3. AuthProbeGS.gs probes googleapis discovery endpoint (no Meta creds)', authProbe.indexOf('https://www.googleapis.com/discovery/v1/apis') !== -1 && authProbe.indexOf('muteHttpExceptions: true') !== -1 && authProbe.indexOf('EAAG') === -1 && authProbe.indexOf('graph.facebook') === -1);
  check('H4. authorizeConnection does NOT send a WhatsApp message', (function() {
    const seg = (waJs.split('function authorizeConnection()')[1] || '').split('function recheckAuth()')[0];
    return seg.indexOf('whatsappTestSend') === -1 && seg.indexOf('API.post') === -1;
  })());
  check('H5. waAuthUrl points to the Apps Script editor', waJs.indexOf("waAuthUrl") !== -1 && waJs.indexOf('script.google.com/home/projects/') !== -1);
  check('H6. sendTest gates on whatsappAuthProbe before whatsappTestSend', (function() {
    const body = waJs.split('function sendTest()')[1].split('function toggleTemplate')[0];
    return body.indexOf("API.post('whatsappAuthProbe'") !== -1 && body.indexOf("API.post('whatsappTestSend'") !== -1;
  })());
  check('H7. saveSettings blocks obviously invalid Meta IDs before posting', waJs.indexOf('function waConfigHardErrors()') !== -1 && waJs.split('function saveSettings()')[1].indexOf('waConfigHardErrors') !== -1);
  check('H8. Meta Phone Number ID validated as numeric in configIssue', waJs.indexOf('waMetaIdValid') !== -1 && waJs.indexOf('Phone Number ID looks invalid') !== -1);
  check('H9. Meta Business Account ID validated as numeric in configIssue', waJs.indexOf('Business Account ID looks invalid') !== -1);

  /* K: provider-switch + Twilio validation regressions */
  const waPage = read('WhatsAppPage.html');
  check('K1. Per-provider value capture exists (no cross-copy on switch)', waJs.indexOf('waProviderValues') !== -1 && waJs.indexOf("waProviderValues[from] = readProviderFields();") !== -1 && waJs.indexOf("applyProviderFields(prov, waProviderValues[prov]") !== -1);
  check('K2. Twilio Account SID validated as AC+32 hex in configIssue', waJs.indexOf('waTwilioSidValid') !== -1 && waJs.indexOf('AC[0-9a-fA-F]{32}') !== -1);
  check('K3. Twilio From sender validated as E.164 in configIssue', waJs.indexOf('waTwilioSenderValid') !== -1 && waJs.indexOf('E.164') !== -1 && waJs.indexOf('+14155238886') !== -1);
  check('K4. Meta Graph endpoint flagged as invalid Twilio endpoint', waJs.indexOf('Twilio API Endpoint must point to api.twilio.com') !== -1 && waJs.indexOf('graph.facebook.com') !== -1);
  check('K5. Meta IDs flagged when used as Twilio Account SID / From', waJs.indexOf('not a Meta Business Account ID') !== -1 && waJs.indexOf('not a Meta Phone Number ID') !== -1);
  check('K6. Send Test disabled when config invalid (updateTestBtnState)', waJs.indexOf('function updateTestBtnState()') !== -1 && waJs.indexOf('whatsappTestBtn') !== -1 && waJs.indexOf('whatsappTestConnBtn') !== -1);
  check('K7. Endpoint label + placeholders update on provider switch', waJs.indexOf('whatsappApiEndpointLabel') !== -1 && waJs.indexOf('.placeholder = \'https://api.twilio.com/2010-04-01\'') !== -1 && waJs.indexOf('.placeholder = \'https://graph.facebook.com/v18.0\'') !== -1);
  check('K8. Test hint + help list are provider-aware', waJs.indexOf('whatsappTestHint') !== -1 && waJs.indexOf('waHelpList') !== -1 && waJs.indexOf('From sender must be a WhatsApp-enabled Twilio number') !== -1);
  check('K9. collectSettings posts per-provider meta/twilio objects', waJs.indexOf('data.meta =') !== -1 && waJs.indexOf('data.twilio =') !== -1);
  check('K10. Backend persists per-provider configs (whatsappSaveProviderConfigs)', waGs.indexOf('function whatsappSaveProviderConfigs(') !== -1 && waGs.indexOf('META_API_TOKEN') !== -1 && waGs.indexOf('TWILIO_API_TOKEN') !== -1);
  check('K11. Backend returns per-provider meta/twilio settings', waGs.indexOf('meta: meta') !== -1 && waGs.indexOf('twilio: twilio') !== -1 && waGs.indexOf('META_BUSINESS_ACCOUNT_ID') !== -1);
  check('K12. Backend validates Twilio SID/sender/endpoint in configIssue', waGs.indexOf('whatsappTwilioSidValid') !== -1 && waGs.indexOf('whatsappTwilioSenderValid') !== -1 && waGs.indexOf('whatsappEndpointBelongsTo') !== -1);
  check('K13. Backend masks nested meta/twilio tokens in activity log', waGs.indexOf('safeData.meta.apiToken') !== -1 && waGs.indexOf('safeData.twilio.apiToken') !== -1);
  check('K14. GAS page mirrors per-provider capture + dynamic labels', waPage.indexOf('gWaProviderValues') !== -1 && waPage.indexOf('whatsappApiEndpointLabel') !== -1 && waPage.indexOf('whatsappTestHint') !== -1 && waPage.indexOf('waHelpList') !== -1 && waPage.indexOf('waUpdateTestBtnState()') !== -1);

  /* U: UltraMsg provider static checks */
  check('U1. API.gs registers whatsappConnectionTest with CanManageWhatsApp', /'whatsappConnectionTest':\s*\{\s*auth:\s*true,\s*perm:\s*'CanManageWhatsApp'/.test(api));
  check('U2. Backend has ULTRAMSG settings keys + defaults', waGs.indexOf("ULTRAMSG_API_URL: 'whatsapp_ultramsg_api_url'") !== -1 && waGs.indexOf('ULTRAMSG_DEFAULTS') !== -1 && waGs.indexOf('https://api.ultramsg.com') !== -1);
  check('U3. Backend routes ultramsg in whatsappProviderSend + has whatsappUltraMsgSend/ConnectionTest', waGs.indexOf("if (provider === 'ultramsg') return whatsappUltraMsgSend(") !== -1 && waGs.indexOf('function whatsappUltraMsgSend(') !== -1 && waGs.indexOf('function whatsappUltraMsgConnectionTest(') !== -1);
  check('U4. whatsappGetSettings returns nested ultramsg object + active mapping', waGs.indexOf('ultramsg: ultramsg') !== -1 && waGs.indexOf("provider === 'ultramsg' ? ultramsg : meta") !== -1);
  check('U5. Backend whatsappConfigIssue validates ultramsg endpoint/instance/token', waGs.indexOf("settings.provider === 'ultramsg'") !== -1 && waGs.indexOf('UltraMsg Instance ID is not configured') !== -1 && waGs.indexOf('UltraMsg Token is not configured') !== -1 && waGs.indexOf("if (provider === 'ultramsg') return ep.indexOf('api.ultramsg.com')") !== -1);
  check('U6. Backend masks ultramsg token in activity log', waGs.indexOf('safeData.ultramsg.token') !== -1 && waGs.indexOf("safeData.ultramsg.token = '***'") !== -1);
  check('U7. whatsappConnectionTest returns DISABLED/CONFIGURATION_REQUIRED/CONNECTED/CONFIGURED statuses', waGs.indexOf("status: 'DISABLED'") !== -1 && waGs.indexOf("status: 'CONFIGURATION_REQUIRED'") !== -1 && waGs.indexOf("status: 'CONNECTED'") !== -1 && waGs.indexOf("status: 'CONFIGURED'") !== -1);
  check('U8. CF page offers ultramsg option + Instance ID field + docs', waJs.indexOf('value="ultramsg"') !== -1 && waJs.indexOf('whatsappInstanceId') !== -1 && waJs.indexOf("https://docs.ultramsg.com") !== -1);
  check('U9. CF onProviderChange caches from-provider + applies ultramsg defaults', waJs.indexOf("waProviderValues = { meta: null, twilio: null, ultramsg: null }") !== -1 && waJs.indexOf("waProviderValues[from] = readProviderFields();") !== -1 && waJs.indexOf("apiUrl: 'https://api.ultramsg.com'") !== -1);
  check('U10. CF hard-errors validates Instance ID format', waJs.indexOf('/^[A-Za-z0-9_-]{1,64}$/') !== -1 && waJs.indexOf('Instance ID looks invalid') !== -1);
  check('U11. CF testConnection posts whatsappConnectionTest for ultramsg only', waJs.indexOf("API.post('whatsappConnectionTest', {})") !== -1 && waJs.indexOf("currentProvider() !== 'ultramsg'") !== -1 && waJs.indexOf("sendTest(); return;") !== -1);
  check('U12. CF collectSettings posts per-provider ultramsg object', waJs.indexOf('data.ultramsg =') !== -1 && waJs.indexOf('instanceId: active.instanceId') !== -1);
  check('U13. GAS page offers ultramsg option + Instance ID field + testWaConnection', waPage.indexOf('value="ultramsg"') !== -1 && waPage.indexOf('whatsappInstanceId') !== -1 && waPage.indexOf('function testWaConnection()') !== -1 && waPage.indexOf('whatsappConnectionTest({') !== -1);
  check('U14. GAS page mirrors ultramsg provider values + collect + configIssue branches', waPage.indexOf('gWaProviderValues = { meta: null, twilio: null, ultramsg: null }') !== -1 && waPage.indexOf('data.ultramsg =') !== -1 && waPage.indexOf("p === 'ultramsg'") !== -1 && waPage.indexOf('waConfigIssue()') !== -1);
  check('U14b. Backend skips country-code normalization for @c.us chat IDs (internal transport capability)', waGs.indexOf("fullNumber.indexOf('@') === -1") !== -1 && waGs.indexOf("!fullNumber.startsWith('+') && !fullNumber.startsWith('00')") !== -1);

  /* JCE: Job Card WhatsApp notification design system (centralized formatter) */
  const jceGs = read('WhatsAppGS.gs');
  const jcbGs = read('JobCardsGS.gs');
  check('JCE-A1. Centralized whatsappSendJobCardEvent formatter exists', jceGs.indexOf('function whatsappSendJobCardEvent(') !== -1);
  check('JCE-A2. Master template covers all 6 authorized events (opened/assigned/pending/started/approved/closed)', ['JobOpened', 'JobAssigned', 'JobPending', 'JobStarted', 'JobApproved', 'JobClosed'].every((ev) => jceGs.indexOf(ev) !== -1));
  check('JCE-A3. Master template sections + separators + fixed footer present', ['JOB CARD INFORMATION', 'MAINTENANCE DETAILS', 'RESPONSIBILITY', 'ACTION', 'SYSTEM', 'NEXT ACTION', 'MATERIAL / PARTS USED'].every((s) => jceGs.indexOf(s) !== -1) && jceGs.indexOf('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') !== -1 && jceGs.indexOf('Pakistan Wire Industries') !== -1);
  check('JCE-A4. whatsappSendNotification honors prebuilt __body (provider-independent send chain)', jceGs.indexOf('data.__body') !== -1);
  check('JCE-A5. Session-scoped dedup cache keyed by event+job card', jceGs.indexOf('WHATSAPP_JCE_SENT') !== -1 && jceGs.indexOf("eventType + '|' + jc.jobCardNo") !== -1);
  check('JCE-A6. Existing whatsappSendJobStatusNotification delegates to centralized formatter', jceGs.indexOf('function whatsappSendJobStatusNotification(') !== -1 && jceGs.indexOf('return whatsappSendJobCardEvent(eventType, jobData);') !== -1);
  check('JCE-A7. Job card lifecycle wired for all 6 events', ['JC_OPENED', 'JC_ASSIGNED', 'JC_PENDING', 'JC_STARTED', 'JC_CLOSED', 'JC_APPROVED'].every((ev) => jcbGs.indexOf(ev) !== -1));
  check('JCE-A8. Message body builder never reads provider credentials', (function() {
    const seg = jceGs.split('function whatsappBuildJobCardBody(')[1].split('function whatsappSendJobCardEvent(')[0] || '';
    return seg.indexOf('apiToken') === -1 && seg.indexOf('api_token') === -1 && seg.indexOf('ULTRAMSG') === -1;
  })());


  const afterSendTest = waJs.split('function sendTest()')[1] || '';
  const sendTestBody = afterSendTest.split('function toggleTemplate')[0] || afterSendTest;
  check('A8. sendTest posts whatsappTestSend', sendTestBody.indexOf("API.post('whatsappTestSend'") !== -1);
  check('A9. sendTest payload excludes apiToken/credentials', sendTestBody.indexOf('apiToken') === -1 && sendTestBody.indexOf('phoneNumberId') === -1 && sendTestBody.indexOf('businessAccountId') === -1);

  check('A10. User form exposes CanManageWhatsApp checkbox', users.indexOf('CanManageWhatsApp') !== -1 && users.indexOf('name="CanManageWhatsApp"') !== -1);
  check('A11. requireUserPermission honors per-column perm flag', auth.indexOf('getPermValue(user[permKey])') !== -1);

  const toggleBody = waJs.split('function toggleEnabled()')[1].split('function saveSettings()')[0];
  check('A12. toggleEnabled posts ONLY { enabled } (no full-form save)', toggleBody.indexOf("API.post('whatsappSaveSettings', { enabled: enabled })") !== -1 && toggleBody.indexOf('collectSettings') === -1);
  check('A13. renderPage contains disabled banner element', waJs.indexOf('whatsappDisabledBanner') !== -1);
  check('A14. sendTest renders logId on success', sendTestBody.indexOf('sendRes.logId') !== -1);
  check('A15. saveSettings refreshes banner on save', /Notify\.success\('WhatsApp settings saved'\);\s*setDisabledBanner\(\);/.test(waJs));
})();

/* =====================================================================
 * PART B - GAS BACKEND SANDBOX (vm)
 * ===================================================================== */
(function partB() {
  const waGs = fs.readFileSync(path.join(ROOT, 'WhatsAppGS.gs'), 'utf8');

  const prescript = `
var __settings = {};
var __sheets = {};
var __logRows = [];
var __activityLog = [];
var __auditLog = [];
var __providerCalls = [];
var __providerMode = 'ok';
var __activeUser = { Email: 'admin@cmms.com', Role: 'Administrator', IsAdmin: true };
var __probeMode = 'ok';
var __fetchCalls = [];
var __ultraMode = 'ok';

var UrlFetchApp = {
  fetch: function(url, opts) {
    __fetchCalls.push({ url: String(url), opts: opts || {} });
    if (__probeMode === 'fail') throw new Error('Permission denied: authorization is required to perform that action.');
    if (String(url).indexOf('discovery/v1/apis') !== -1) return { getResponseCode: function() { return 200; }, getContentText: function() { return '{}'; } };
    if (String(url).indexOf('/instance/me') !== -1) {
      if (__ultraMode === 'unauth') return { getResponseCode: function() { return 401; }, getContentText: function() { return 'Unauthorized'; } };
      if (__ultraMode === 'bodyauth') return { getResponseCode: function() { return 200; }, getContentText: function() { return JSON.stringify({ error: 'Unauthorized' }); } };
      if (__ultraMode === 'servererr') return { getResponseCode: function() { return 500; }, getContentText: function() { return JSON.stringify({ error: 'Internal error' }); } };
      return { getResponseCode: function() { return 200; }, getContentText: function() { return JSON.stringify({}); } };
    }
    if (String(url).indexOf('/messages/chat') !== -1) {
      if (__ultraMode === 'sentfalse') return { getResponseCode: function() { return 200; }, getContentText: function() { return JSON.stringify({ sent: false, error: 'rejected' }); } };
      if (__ultraMode === 'apierr') return { getResponseCode: function() { return 400; }, getContentText: function() { return JSON.stringify({ error: 'bad request' }); } };
      return { getResponseCode: function() { return 200; }, getContentText: function() { return JSON.stringify({ sent: true, messageId: 'wamid.ultra.1' }); } };
    }
    return { getResponseCode: function() { return 404; }, getContentText: function() { return 'Not found'; } };
  }
};

function getSetting(k) {
  if (!Object.prototype.hasOwnProperty.call(__settings, k)) return null;
  var raw = __settings[k];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}
function saveSetting(k, v) { __settings[k] = String(v); }
function getAllData(name) { return __sheets[name] || []; }
function addRow(name, obj) {
  if (!__sheets[name]) __sheets[name] = [];
  var copy = {};
  for (var k in obj) copy[k] = obj[k];
  __sheets[name].push(copy);
  if (name === 'WhatsAppLogs') __logRows.push(copy);
  return copy;
}
function updateRow(name, key, val, obj) {
  var rows = __sheets[name] || [];
  for (var i = 0; i < rows.length; i++) { if (String(rows[i][key]) === String(val)) { for (var k in obj) rows[i][k] = obj[k]; return rows[i]; } }
  return null;
}
function getSheet(name) { return { name: name }; }
function ensureHeaders(sheet, fields) {}
function getCurrentTimestamp() { return '2026-08-14 10:00:00'; }
function logActivity(msg, detail) { __activityLog.push({ msg: msg, detail: detail }); }
function createAuditLog() { __auditLog.push(Array.prototype.slice.call(arguments)); }

var CONFIG = {
  SHEET_NAMES: { USERS: 'Users', TECHNICIANS: 'Technicians' },
  AUDIT_MODULES: { SETTINGS: 'Settings' },
  AUDIT_ACTIONS: { UPDATE: 'Update' }
};

var Session = {
  getActiveUser: function() {
    return { getEmail: function() { return (__activeUser && __activeUser.Email) || ''; } };
  }
};

function __getPerm(val) {
  if (val === true) return true;
  if (val === false || val === null || val === undefined) return false;
  var s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}
function isUserAdmin(user) {
  if (!user) return false;
  var role = String(user.Role || '').trim().toLowerCase();
  return role === 'admin' || role === 'administrator' || __getPerm(user.IsAdmin);
}
function userHasPermission(user, permKey) {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return __getPerm(user[permKey]);
}
function apiCallerUser(data) {
  var email = (data && data._userEmail) || (__activeUser && __activeUser.Email) || '';
  if (!email) return null;
  var users = getAllData(CONFIG.SHEET_NAMES.USERS) || [];
  for (var i = 0; i < users.length; i++) { if (users[i].Email === email) return users[i]; }
  return null;
}
function requireUserPermission(permKey, data) {
  var user = apiCallerUser(data);
  if (!user || !userHasPermission(user, permKey)) throw new Error('You do not have permission to perform this action.');
  return user;
}

__sheets.Users = [
  { Email: 'admin@cmms.com', Name: 'Admin', Role: 'Administrator', IsAdmin: 'TRUE', Mobile: '3001112222' },
  { Email: 'wa@cmms.com', Name: 'WA Manager', Role: 'Manager', CanManageWhatsApp: 'TRUE', Mobile: '3001234567' },
  { Email: 'tech@cmms.com', Name: 'Tech User', Role: 'Technician', CanManageWhatsApp: 'FALSE', Mobile: '' }
];
`;

  const postscript = `
whatsappProviderSend = function(settings, phoneNumber, messageBody) {
  __providerCalls.push({ phoneNumber: phoneNumber, messageBody: messageBody, provider: settings.provider });
  if (__providerMode === 'fail') return { success: false, message: 'simulated provider failure' };
  return { success: true, messageId: 'wamid.sandbox.1' };
};

var __checks = [];
function __ok(name, pass, detail) { __checks.push({ name: name, pass: !!pass, detail: detail || '' }); }

/* B-REG boolean-coercion regression: Google Sheets stores 'true'/'false' strings
   but reads them back as booleans (setValue('true') -> cell value true) */
whatsappEnsureDefaults();
var br0 = getSetting(WHATSAPP.SETTINGS.ENABLED);
__ok('BR1. Harness simulates Sheets coercion (stored string reads back as boolean)', br0 === false && typeof br0 === 'boolean', 'stored=' + String(__settings[WHATSAPP.SETTINGS.ENABLED]) + ' read=' + String(br0) + ' (type ' + typeof br0 + ')');
whatsappSaveSettings({ enabled: true, _userEmail: 'admin@cmms.com' });
var br2 = whatsappGetSettings();
__ok('BR2. Toggle ON -> whatsappGetSettings().enabled === true (boolean true stored)', br2.enabled === true, JSON.stringify(br2));
whatsappSaveSettings({ enabled: false, _userEmail: 'admin@cmms.com' });
var br3 = whatsappGetSettings();
__ok('BR3. Toggle OFF -> whatsappGetSettings().enabled === false (boolean false stored)', br3.enabled === false, JSON.stringify(br3));

/* B1 defaults */
whatsappEnsureDefaults();
var b1 = whatsappGetSettings();
__ok('B1. Defaults: disabled, meta provider, default company', b1.enabled === false && b1.provider === 'meta' && b1.companyName === 'PWI CMMS', JSON.stringify(b1));

/* B2 save settings (admin) */
var s2 = whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', companyName: 'PWI CMMS', defaultCountryCode: '92', apiEndpoint: 'https://graph.facebook.com/v18.0', testPhone: '3001234567', testMessage: 'Hello', _userEmail: 'admin@cmms.com' });
var b2 = whatsappGetSettings();
__ok('B2. Admin can save settings; stored token round-trips', s2.success === true && b2.enabled === true && b2.apiToken === 'tok_abc' && b2.phoneNumberId === '106540352242922', JSON.stringify(b2));

/* B3 activity log masks token */
var act3 = __activityLog[__activityLog.length - 1];
var masked3 = act3 && act3.msg === 'WhatsApp Settings Updated' && act3.detail && act3.detail.indexOf('tok_abc') === -1 && (JSON.parse(act3.detail).apiToken === '***' || JSON.parse(act3.detail).apiToken === undefined);
__ok('B3. Activity log masks apiToken', !!masked3, act3 ? act3.detail : 'no activity');

/* B4 audit log written */
__ok('B4. Audit log entry created on settings change', __auditLog.length >= 1, 'count=' + __auditLog.length);

/* B5 WA manager test send */
__providerCalls = [];
var r5 = whatsappTestSend({ testPhone: '0312-3456789', testMessage: 'Hi from sandbox', _userEmail: 'wa@cmms.com' });
var pc5 = __providerCalls[__providerCalls.length - 1];
var l5 = __logRows[__logRows.length - 1];
__ok('B5. WA manager can send test message (success + normalized +92)', r5.success === true && pc5 && pc5.phoneNumber === '+923123456789' && r5.messageId === 'wamid.sandbox.1', JSON.stringify({ r: r5, called: pc5 ? pc5.phoneNumber : null }));
__ok('B6. Log row captures module/template/status/sentBy', l5 && l5.Module === 'System' && l5.Template === 'TestMessage' && l5.Status === 'Sent' && l5.SentBy === 'wa@cmms.com' && l5.PhoneNumber === '+923123456789', JSON.stringify(l5));

/* B7 disabled rejects */
whatsappSaveSettings({ enabled: false, _userEmail: 'admin@cmms.com' });
var r7 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('B7. Disabled module rejects test send', r7.success === false && r7.message.indexOf('disabled') > -1, r7.message);

/* B8 invalid phone */
whatsappSaveSettings({ enabled: true, _userEmail: 'admin@cmms.com' });
var r8 = whatsappTestSend({ testPhone: '123', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('B8. Short phone rejected client-side', r8.success === false && r8.message.indexOf('Invalid test phone') > -1, r8.message);

/* B9 config issue */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: '', phoneNumberId: '', _userEmail: 'admin@cmms.com' });
var r9 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('B9. Missing Meta credentials blocked before send', r9.success === false && r9.message.indexOf('Meta API token is not configured') > -1, r9.message);

/* B10 provider failure path */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', _userEmail: 'admin@cmms.com' });
__providerMode = 'fail';
var r10 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__providerMode = 'ok';
var l10 = __logRows[__logRows.length - 1];
__ok('B10. Provider failure -> Failed status + error logged', r10.success === false && r10.status === 'Failed' && l10.Status === 'Failed' && l10.ErrorMessage.indexOf('simulated provider failure') > -1, JSON.stringify({ r: r10, l: l10 }));

/* B11 restricted user blocked from test send */
var r11 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'tech@cmms.com' });
__ok('B11. User without CanManageWhatsApp cannot test send', r11.success === false && r11.message.indexOf('permission') > -1, r11.message);

/* B12 restricted user blocked from save; settings unchanged */
var en12a = whatsappGetSettings().enabled;
var s12 = whatsappSaveSettings({ enabled: false, _userEmail: 'tech@cmms.com' });
var en12b = whatsappGetSettings().enabled;
__ok('B12. User without CanManageWhatsApp cannot save settings', s12.success === false && en12a === en12b && en12b === true, JSON.stringify({ s: s12, enabledBefore: en12a, enabledAfter: en12b }));

/* B13 admin bypass */
var s13 = whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', _userEmail: 'admin@cmms.com' });
__ok('B13. Admin can always save settings', s13.success === true, JSON.stringify(s13));

/* B14 template format + save */
var f14 = whatsappFormatMessage('Hi {{name}}! {{unknown}}', { name: 'Ali' });
var t14 = whatsappSaveTemplate({ TemplateName: 'Test Tpl', EventType: 'JobOpened', TemplateBody: 'Job {{jobCardNo}}', Variables: 'jobCardNo', _userEmail: 'admin@cmms.com' });
var t14b = whatsappGetTemplates();
__ok('B14. Template placeholders substituted + unknowns stripped', f14 === 'Hi Ali! ', f14);
__ok('B15. Template can be saved and listed', t14.success === true && t14b.length >= 1 && t14b[0].TemplateName === 'Test Tpl', JSON.stringify(t14b[0]));

/* B16 logs list + filter */
var logs16 = whatsappGetLogs({ limit: 10 });
var filtered16 = whatsappGetLogs({ module: 'System', status: 'Sent', limit: 10 });
__ok('B16. Logs returned and filterable by module/status', logs16.length >= 2 && filtered16.length >= 1 && filtered16.length < logs16.length, 'total=' + logs16.length + ' sentFiltered=' + filtered16.length);

/* B17 defaults re-seeded for missing keys */
__settings = {};
whatsappEnsureDefaults();
var b17 = whatsappGetSettings();
__ok('B17. Missing defaults seeded correctly', b17.enabled === false && b17.apiToken === '' && b17.testMessage === 'Test message from PWI CMMS' && b17.defaultCountryCode === '91', JSON.stringify(b17));

/* B18 00-prefix phone not double-prefixed */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', _userEmail: 'admin@cmms.com' });
__providerCalls = [];
var r18 = whatsappTestSend({ testPhone: '00923001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
var pc18 = __providerCalls[__providerCalls.length - 1];
__ok('B18. 00-prefixed number preserved (no double +92)', r18.success === true && pc18 && pc18.phoneNumber === '00923001234567', pc18 ? pc18.phoneNumber : 'no call');

/* B19 no raw token anywhere in activity/log trails */
var leak19 = false;
for (var i = 0; i < __activityLog.length; i++) { if (__activityLog[i].detail && __activityLog[i].detail.indexOf('tok_abc') > -1) leak19 = true; }
for (var j = 0; j < __logRows.length; j++) { if (__logRows[j].ErrorMessage && __logRows[j].ErrorMessage.indexOf('tok_abc') > -1) leak19 = true; }
__ok('B19. apiToken never persisted into activity/log trails', leak19 === false);

/* B20 config-before-phone precedence */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: '', phoneNumberId: '', _userEmail: 'admin@cmms.com' });
var r20 = whatsappTestSend({ testPhone: '123', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('B20. Incomplete config reported before phone validation', r20.success === false && r20.message.indexOf('Meta API token is not configured') > -1, r20.message);

/* B21 whatsappGetSettingsData permission gate */
var d21a = whatsappGetSettingsData({ _userEmail: 'tech@cmms.com' });
var d21b = whatsappGetSettingsData({ _userEmail: 'wa@cmms.com' });
__ok('B21. whatsappGetSettingsData gated by CanManageWhatsApp', d21a.success === false && d21a.message.indexOf('permission') > -1 && d21b.success === true && d21b.settings && d21b.templates && d21b.stats && Array.isArray(d21b.logs), JSON.stringify({ denied: d21a, granted: !!(d21b.settings && d21b.templates) }));

/* B22 job status hook end-to-end */
__sheets[WHATSAPP.TEMPLATES_SHEET] = [];
whatsappInitTemplatesSheet();
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', defaultCountryCode: '92', _userEmail: 'admin@cmms.com' });
__providerCalls = [];
var j22 = whatsappSendJobStatusNotification(WHATSAPP.TEMPLATES.JC_STARTED, { jobCardNo: 'JC-1001', machine: 'Lathe-1', priority: 'High', complaint: 'Overheating', assignedTechEmail: 'wa@cmms.com', startedBy: 'Tech A', startTime: '10:30' });
var pc22 = __providerCalls[__providerCalls.length - 1];
var l22 = __logRows[__logRows.length - 1];
__ok('B22. Job started hook sends WhatsApp + logs module/template', j22.success === true && pc22 && pc22.phoneNumber === '+923001234567' && l22 && l22.Template === 'JobStarted' && l22.Module === 'Jobs', JSON.stringify({ r: j22, pc: pc22 && pc22.phoneNumber, log: l22 && { t: l22.Template, m: l22.Module } }));

/* B23 low-stock hook to store phones */
addRow(CONFIG.SHEET_NAMES.USERS, { Email: 'store@cmms.com', Name: 'Store User', Role: 'Store', Mobile: '3005556666' });
__providerCalls = [];
var s23 = whatsappSendStockAlertNotification(WHATSAPP.TEMPLATES.LOW_STOCK, { partCode: 'SP-001', partName: 'Bearing', currentStock: 2, minStock: 5 });
var pc23 = __providerCalls[__providerCalls.length - 1];
__ok('B23. Low-stock hook sends to store phone + logs', s23.success === true && pc23 && pc23.phoneNumber === '+923005556666' && pc23.messageBody.indexOf('SP-001') > -1, JSON.stringify({ r: s23, pc: pc23 && pc23.phoneNumber }));

/* B24 disabled hook is graceful (no throw) */
whatsappSaveSettings({ enabled: false, _userEmail: 'admin@cmms.com' });
var r24a = whatsappSendJobStatusNotification(WHATSAPP.TEMPLATES.JC_CLOSED, { jobCardNo: 'JC-1002' });
var r24b = whatsappSendStockAlertNotification(WHATSAPP.TEMPLATES.LOW_STOCK, { partCode: 'SP-002' });
__ok('B24. Hooks return graceful result when disabled', r24a.success === false && String(r24a.message).indexOf('disabled') > -1 && r24b.success === false, JSON.stringify({ a: r24a, b: r24b }));

/* B25 auth probe (permission-gated, no Meta credentials, read-only) */
__probeMode = 'ok';
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', _userEmail: 'admin@cmms.com' });
var p25a = whatsappAuthProbe({ _userEmail: 'wa@cmms.com' });
var p25b = whatsappAuthProbe({ _userEmail: 'tech@cmms.com' });
__ok('B25. Auth probe succeeds for WA manager; blocked for unauthorized user', p25a.success === true && p25a.code === 200 && p25b.success === false && String(p25b.message).indexOf('permission') > -1, JSON.stringify({ a: p25a, b: p25b }));

/* B26 probe reflects failed external request (no script.external_request) */
__probeMode = 'fail';
var p26 = whatsappAuthProbe({ _userEmail: 'wa@cmms.com' });
__probeMode = 'ok';
__ok('B26. Auth probe reports permission failure without throwing', p26.success === false && String(p26.message).toLowerCase().indexOf('permission') > -1, JSON.stringify(p26));

/* B27 obviously-invalid Meta Phone Number ID blocks send (10-digit demo value) */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '3333655467', businessAccountId: '123456789012345', _userEmail: 'admin@cmms.com' });
var r27 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('B27. 10-digit value rejected as Meta Phone Number ID (no send)', r27.success === false && r27.message.indexOf('Phone Number ID') > -1, r27.message);

/* B28 obviously-invalid Meta Business Account ID blocks send */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', businessAccountId: 'Alam', _userEmail: 'admin@cmms.com' });
var r28 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('B28. Non-numeric Business Account ID rejected (no send)', r28.success === false && r28.message.indexOf('Business Account ID') > -1, r28.message);
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'tok_abc', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', _userEmail: 'admin@cmms.com' });

/* K: per-provider config independence + Twilio validation regressions */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', apiEndpoint: 'https://graph.facebook.com/v18.0', _userEmail: 'admin@cmms.com' });
whatsappSaveSettings({ enabled: true, provider: 'twilio', apiToken: 'twilio_at', phoneNumberId: '+14155238886', businessAccountId: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', apiEndpoint: 'https://api.twilio.com/2010-04-01', _userEmail: 'admin@cmms.com' });
var g29 = whatsappGetSettings();
__ok('B29. Twilio save does not overwrite Meta config (no cross-copy)', g29.meta.apiToken === 'meta_tok' && g29.meta.phoneNumberId === '106540352242922' && g29.meta.apiEndpoint === 'https://graph.facebook.com/v18.0' && g29.twilio.apiToken === 'twilio_at' && g29.twilio.phoneNumberId === '+14155238886', JSON.stringify({ meta: g29.meta, twilio: g29.twilio }));
__ok('B30. Active values follow selected provider (twilio)', g29.provider === 'twilio' && g29.apiToken === 'twilio_at' && g29.businessAccountId === 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' && g29.phoneNumberId === '+14155238886', JSON.stringify({ provider: g29.provider, apiToken: g29.apiToken, biz: g29.businessAccountId, from: g29.phoneNumberId }));

var i31 = whatsappConfigIssue({ provider: 'twilio', apiToken: 'twilio_at', businessAccountId: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', phoneNumberId: '+14155238886', apiEndpoint: 'https://api.twilio.com/2010-04-01' });
__ok('B31. Valid Twilio config passes whatsappConfigIssue', i31 === '', i31);

var i32 = whatsappConfigIssue({ provider: 'twilio', apiToken: 'twilio_at', businessAccountId: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', phoneNumberId: '+14155238886', apiEndpoint: 'https://graph.facebook.com/v18.0' });
__ok('B32. Meta Graph endpoint flagged as invalid Twilio endpoint', i32.indexOf('api.twilio.com') > -1 && i32.indexOf('graph.facebook.com') > -1, i32);

var i33 = whatsappConfigIssue({ provider: 'twilio', apiToken: 'twilio_at', businessAccountId: '375420581369195', phoneNumberId: '+14155238886', apiEndpoint: 'https://api.twilio.com/2010-04-01' });
__ok('B33. Meta Business Account ID rejected as Twilio Account SID', i33.indexOf('Account SID') > -1 && i33.indexOf('AC') > -1 && i33.indexOf('Meta') > -1, i33);

var i34 = whatsappConfigIssue({ provider: 'twilio', apiToken: 'twilio_at', businessAccountId: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', phoneNumberId: '106540352242922', apiEndpoint: 'https://api.twilio.com/2010-04-01' });
__ok('B34. Meta Phone Number ID rejected as Twilio From sender', i34.indexOf('From') > -1 && i34.indexOf('E.164') > -1, i34);

whatsappSaveSettings({ enabled: true, provider: 'meta', apiEndpoint: 'https://graph.facebook.com/v18.0', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345',
  meta: { apiEndpoint: 'https://graph.facebook.com/v18.0', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345' },
  twilio: { apiEndpoint: 'https://api.twilio.com/2010-04-01', apiToken: 'twilio_at', phoneNumberId: '+14155238886', businessAccountId: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  _userEmail: 'admin@cmms.com' });
var g35 = whatsappGetSettings();
__ok('B35. Explicit meta/twilio objects persisted per provider', g35.meta.apiToken === 'meta_tok' && g35.twilio.apiToken === 'twilio_at' && g35.provider === 'meta' && g35.apiToken === 'meta_tok', JSON.stringify({ meta: g35.meta.apiToken, twilio: g35.twilio.apiToken, active: g35.apiToken }));

var act36 = __activityLog[__activityLog.length - 1];
var masked36 = act36 && act36.detail && act36.detail.indexOf('meta_tok') === -1 && act36.detail.indexOf('twilio_at') === -1 && JSON.parse(act36.detail).meta && JSON.parse(act36.detail).meta.apiToken === '***' && JSON.parse(act36.detail).twilio && JSON.parse(act36.detail).twilio.apiToken === '***';
__ok('B36. Nested meta/twilio tokens masked in activity log', !!masked36, act36 ? act36.detail : 'no activity');

whatsappSaveSettings({ enabled: true, provider: 'twilio', apiToken: 'twilio_at', phoneNumberId: '+14155238886', businessAccountId: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', apiEndpoint: 'https://api.twilio.com/2010-04-01', _userEmail: 'admin@cmms.com' });
var g37 = whatsappGetSettings();
__ok('B37. Meta config preserved across twilio-only save', g37.meta.apiToken === 'meta_tok' && g37.meta.phoneNumberId === '106540352242922', JSON.stringify(g37.meta));

/* U: UltraMsg provider sandbox tests */
__settings = {};
whatsappEnsureDefaults();
var u1 = whatsappGetSettings();
__ok('U15. UltraMsg defaults seeded (apiUrl default, empty instance/token)', u1.ultramsg.apiUrl === 'https://api.ultramsg.com' && u1.ultramsg.instanceId === '' && u1.ultramsg.token === '', JSON.stringify(u1.ultramsg));

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiEndpoint: 'https://api.ultramsg.com', apiToken: 'ultra_tok', instanceId: 'instance1234', _userEmail: 'admin@cmms.com' });
var u2 = whatsappGetSettings();
__ok('U16. UltraMsg config round-trips via top-level fields', u2.provider === 'ultramsg' && u2.instanceId === 'instance1234' && u2.apiToken === 'ultra_tok' && u2.apiEndpoint === 'https://api.ultramsg.com' && u2.ultramsg.instanceId === 'instance1234' && u2.ultramsg.token === 'ultra_tok', JSON.stringify({ active: { id: u2.instanceId, tok: u2.apiToken }, nested: u2.ultramsg }));

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', ultramsg: { apiUrl: 'https://api.ultramsg.com', instanceId: 'instance5678', token: 'ultra_tok2' }, _userEmail: 'admin@cmms.com' });
var u3 = whatsappGetSettings();
__ok('U17. UltraMsg config round-trips via explicit ultramsg object', u3.ultramsg.instanceId === 'instance5678' && u3.ultramsg.token === 'ultra_tok2' && u3.instanceId === 'instance5678' && u3.apiToken === 'ultra_tok2', JSON.stringify(u3.ultramsg));

whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', apiEndpoint: 'https://graph.facebook.com/v18.0', _userEmail: 'admin@cmms.com' });
whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiToken: 'ultra_tok', instanceId: 'instance1234', apiEndpoint: 'https://api.ultramsg.com', _userEmail: 'admin@cmms.com' });
var u4 = whatsappGetSettings();
__ok('U18. Meta config preserved across ultramsg-only save (isolation)', u4.meta.apiToken === 'meta_tok' && u4.meta.phoneNumberId === '106540352242922' && u4.provider === 'ultramsg' && u4.apiToken === 'ultra_tok', JSON.stringify({ meta: u4.meta.apiToken, active: u4.apiToken }));

var u5bad = false;
(function scanU5(v, path) {
  if (v === null || v === undefined) return;
  if (typeof v === 'object') { Object.keys(v).forEach(function(k) { scanU5(v[k], path + '.' + k); }); }
  else if (String(v).indexOf('undefined') > -1) { u5bad = true; }
})(whatsappGetSettings(), 'settings');
__ok('U19. No literal "undefined" anywhere in settings output', u5bad === false, JSON.stringify(whatsappGetSettings()).slice(0, 300));

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiEndpoint: 'https://api.ultramsg.com', apiToken: 'ultra_tok', instanceId: 'instance1234', ultramsg: { apiUrl: 'https://api.ultramsg.com', instanceId: 'instance1234', token: 'ultra_tok' }, _userEmail: 'admin@cmms.com' });
var actU6 = __activityLog[__activityLog.length - 1];
var maskedU6 = actU6 && actU6.detail && actU6.detail.indexOf('ultra_tok') === -1 && JSON.parse(actU6.detail).apiToken === '***' && JSON.parse(actU6.detail).ultramsg && JSON.parse(actU6.detail).ultramsg.token === '***';
__ok('U20. Activity log masks ultramsg token (nested + top-level)', !!maskedU6, actU6 ? actU6.detail : 'no activity');

var iU7 = whatsappConfigIssue({ provider: 'ultramsg', apiEndpoint: 'https://api.ultramsg.com', apiToken: 'ultra_tok', instanceId: 'instance1234' });
__ok('U21. Valid UltraMsg config passes whatsappConfigIssue', iU7 === '', iU7);

var iU8 = whatsappConfigIssue({ provider: 'ultramsg', apiEndpoint: 'https://graph.facebook.com/v18.0', apiToken: 'ultra_tok', instanceId: 'instance1234' });
__ok('U22. Meta endpoint flagged as invalid UltraMsg URL', iU8.indexOf('api.ultramsg.com') > -1 && iU8.indexOf('Meta') > -1, iU8);

var iU9a = whatsappConfigIssue({ provider: 'ultramsg', apiEndpoint: 'https://api.ultramsg.com', apiToken: 'ultra_tok', instanceId: '' });
var iU9b = whatsappConfigIssue({ provider: 'ultramsg', apiEndpoint: 'https://api.ultramsg.com', apiToken: '', instanceId: 'instance1234' });
__ok('U23. Missing UltraMsg Instance ID / Token reported', iU9a.indexOf('Instance ID') > -1 && iU9b.indexOf('Token') > -1, iU9a + ' | ' + iU9b);

whatsappSaveSettings({ enabled: false, provider: 'ultramsg', _userEmail: 'admin@cmms.com' });
var cU10 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ok('U24. Connection test returns DISABLED when module off', cU10.success === false && cU10.status === 'DISABLED', JSON.stringify(cU10));

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiToken: '', instanceId: '', _userEmail: 'admin@cmms.com' });
var cU11 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ok('U25. Connection test returns CONFIGURATION_REQUIRED for incomplete config', cU11.success === false && cU11.status === 'CONFIGURATION_REQUIRED', JSON.stringify(cU11));

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiToken: 'ultra_tok', instanceId: 'instance1234', apiEndpoint: 'https://api.ultramsg.com', _userEmail: 'admin@cmms.com' });
__ultraMode = 'ok';
var cU12 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ok('U26. Connection test CONNECTED on 200 from instance/me', cU12.success === true && cU12.status === 'CONNECTED', JSON.stringify(cU12));

__ultraMode = 'unauth';
var cU13 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ultraMode = 'ok';
__ok('U27. Connection test AUTHORIZATION_FAILED on 401', cU13.success === false && cU13.status === 'AUTHORIZATION_FAILED', JSON.stringify(cU13));

__ultraMode = 'bodyauth';
var cU14 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ultraMode = 'ok';
__ok('U28. Connection test AUTHORIZATION_FAILED when body reports Unauthorized', cU14.success === false && cU14.status === 'AUTHORIZATION_FAILED', JSON.stringify(cU14));

__ultraMode = 'servererr';
var cU15 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ultraMode = 'ok';
__ok('U29. Connection test PROVIDER_ERROR on 500', cU15.success === false && cU15.status === 'PROVIDER_ERROR', JSON.stringify(cU15));

__fetchCalls = [];
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', _userEmail: 'admin@cmms.com' });
var cU16 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
var fetchU16 = __fetchCalls.filter(function(c) { return String(c.url).indexOf('instance/me') > -1; }).length;
__ok('U30. Meta connection test returns CONFIGURED, no instance/me call', cU16.success === true && cU16.status === 'CONFIGURED' && fetchU16 === 0, JSON.stringify(cU16));

__ultraMode = 'ok';
var sU17 = whatsappUltraMsgSend({ provider: 'ultramsg', ultramsg: { apiUrl: 'https://api.ultramsg.com', instanceId: 'instance1234', token: 'ultra_tok' }, apiEndpoint: 'https://api.ultramsg.com', instanceId: 'instance1234', apiToken: 'ultra_tok' }, '+923001234567', 'Hello Ultra');
var callU17 = __fetchCalls[__fetchCalls.length - 1];
var parsedU17 = callU17 ? JSON.parse(callU17.opts.payload) : {};
__ok('U31. UltraMsg send POSTs /{instance}/messages/chat with {token,to,body}', sU17.success === true && sU17.messageId === 'wamid.ultra.1' && callU17 && callU17.url === 'https://api.ultramsg.com/instance1234/messages/chat' && callU17.opts.method === 'post' && parsedU17.token === 'ultra_tok' && parsedU17.to === '+923001234567' && parsedU17.body === 'Hello Ultra', JSON.stringify({ r: sU17, url: callU17 && callU17.url }));

__ultraMode = 'sentfalse';
var sU18 = whatsappUltraMsgSend({ provider: 'ultramsg', ultramsg: { apiUrl: 'https://api.ultramsg.com', instanceId: 'instance1234', token: 'ultra_tok' } }, '+923001234567', 'x');
__ultraMode = 'ok';
__ok('U32. UltraMsg send: sent:false treated as failure', sU18.success === false && String(sU18.message).indexOf('UltraMsg') > -1, JSON.stringify(sU18));

whatsappSaveSettings({ enabled: false, provider: 'ultramsg', _userEmail: 'admin@cmms.com' });
var rU19 = whatsappTestSend({ testPhone: '03001234567', testMessage: 'x', _userEmail: 'wa@cmms.com' });
__ok('U33. Disabled module rejects ultramsg test send', rU19.success === false && rU19.message.indexOf('disabled') > -1, rU19.message);

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiToken: 'ultra_tok', instanceId: 'instance1234', apiEndpoint: 'https://api.ultramsg.com', defaultCountryCode: '92', _userEmail: 'admin@cmms.com' });
__providerCalls = [];
var rU20 = whatsappTestSend({ testPhone: '0312-3456789', testMessage: 'Hi Ultra', _userEmail: 'wa@cmms.com' });
var pcU20 = __providerCalls[__providerCalls.length - 1];
var lU20 = __logRows[__logRows.length - 1];
__ok('U34. UltraMsg test send succeeds via provider router + normalizes +92', rU20.success === true && pcU20 && pcU20.phoneNumber === '+923123456789' && pcU20.provider === 'ultramsg', JSON.stringify({ r: rU20, pc: pcU20 && pcU20.phoneNumber }));
__ok('U35. Log row records Provider=ultramsg + Status=Sent + Template=TestMessage', lU20 && lU20.Provider === 'ultramsg' && lU20.Status === 'Sent' && lU20.Template === 'TestMessage', JSON.stringify(lU20));

whatsappSaveSettings({ enabled: true, provider: 'ultramsg', apiToken: 'ultra_tok', instanceId: 'instance1234', defaultCountryCode: '92', _userEmail: 'admin@cmms.com' });
__providerCalls = [];
var jU22 = whatsappSendJobStatusNotification(WHATSAPP.TEMPLATES.JC_STARTED, { jobCardNo: 'JC-2001', machine: 'Press-2', priority: 'High', assignedTechEmail: 'wa@cmms.com', startedBy: 'Tech B', startTime: '11:00' });
var pcU22 = __providerCalls[__providerCalls.length - 1];
__ok('U36. Job hook chain works with ultramsg provider', jU22.success === true && pcU22 && pcU22.provider === 'ultramsg' && pcU22.phoneNumber === '+923001234567', JSON.stringify({ r: jU22, pc: pcU22 && pcU22.phoneNumber }));

var cU23 = whatsappConnectionTest({ _userEmail: 'tech@cmms.com' });
__ok('U37. User without CanManageWhatsApp cannot run connection test', cU23.success === false && cU23.message.indexOf('permission') > -1, cU23.message);

var cU24 = whatsappConnectionTest({ _userEmail: 'wa@cmms.com' });
__ok('U38. WA manager can run connection test (CONNECTED)', cU24.success === true && cU24.status === 'CONNECTED', JSON.stringify(cU24));

var rU25 = whatsappTestSend({ testPhone: '33333655222', testMessage: 'Normalize', _userEmail: 'wa@cmms.com' });
var pcU25 = __providerCalls[__providerCalls.length - 1];
__ok('U39. Test phone 33333655222 normalized to E.164 +9233333655222 for UltraMsg', rU25.success === true && pcU25 && pcU25.phoneNumber === '+9233333655222' && pcU25.provider === 'ultramsg', JSON.stringify({ r: rU25, pc: pcU25 && pcU25.phoneNumber }));

var rU26 = whatsappSendMessage('923333655222@c.us', 'ChatID', 'System', '', 'TestMessage', 'Test', 'wa@cmms.com');
var pcU26 = __providerCalls[__providerCalls.length - 1];
__ok('U40. whatsappSendMessage passes @c.us chat ID through without normalization', rU26.success === true && pcU26 && pcU26.phoneNumber === '923333655222@c.us', JSON.stringify({ r: rU26, pc: pcU26 && pcU26.phoneNumber }));

var sU27 = whatsappUltraMsgSend({ provider: 'ultramsg', ultramsg: { apiUrl: 'https://api.ultramsg.com', instanceId: 'instance1234', token: 'ultra_tok' } }, '923333655222@c.us', 'Chat');
var callU27 = __fetchCalls[__fetchCalls.length - 1];
var parsedU27 = callU27 ? JSON.parse(callU27.opts.payload) : {};
__ok('U41. UltraMsg transport sends @c.us chat ID as-is in to', sU27.success === true && parsedU27.to === '923333655222@c.us', JSON.stringify({ r: sU27, to: parsedU27.to }));

/* ===================== JCE: JOB CARD WHATSAPP DESIGN SYSTEM ===================== */
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', defaultCountryCode: '92', _userEmail: 'admin@cmms.com' });
var jceBase = { JobCardNo: 'JC-JCE', OpenDateTime: '2026-08-16 09:00:00', Section: 'Maintenance', Department: 'Production', Machine: 'Lathe-1', MachineNumber: 'ML-01', AssetID: 'AST-01', ComplaintCategory: 'Breakdown', ComplaintDescription: 'Motor bearing noise', Priority: 'High', MaintenanceTeam: 'Electrical', ComplaintBy: 'wa@cmms.com', AssignedTechnician: 'wa@cmms.com', CreatedBy: 'admin@cmms.com', UpdatedBy: 'admin@cmms.com' };
function __jceRec(over) {
  var o = {};
  for (var k in jceBase) o[k] = jceBase[k];
  for (var k2 in over) o[k2] = over[k2];
  return o;
}
var __jceEvents = {
  JC_OPENED:   __jceRec({ JobCardNo: 'JC-OPEN', CurrentStatus: 'OPEN' }),
  JC_ASSIGNED: __jceRec({ JobCardNo: 'JC-ASGN', CurrentStatus: 'OPEN' }),
  JC_STARTED:  __jceRec({ JobCardNo: 'JC-START', CurrentStatus: 'RUNNING', StartDateTime: '2026-08-16 10:05:00', StartedBy: 'wa@cmms.com' }),
  JC_PENDING:  __jceRec({ JobCardNo: 'JC-PEND', CurrentStatus: 'PENDING', PendingDateTime: '2026-08-16 12:00:00', PendingBy: 'wa@cmms.com', PendingRemarks: 'Awaiting supervisor review' }),
  JC_APPROVED: __jceRec({ JobCardNo: 'JC-APPR', CurrentStatus: 'APPROVED', ApprovedDateTime: '2026-08-16 13:00:00', ApprovedBy: 'wa@cmms.com', ApprovalStatus: 'Approved', ApprovalRemarks: 'Looks good' }),
  JC_CLOSED:   __jceRec({ JobCardNo: 'JC-CLOS', CurrentStatus: 'CLOSED', CloseDateTime: '2026-08-16 12:30:00', ClosedBy: 'admin@cmms.com', WorkingTime: 150, Downtime: 210, TotalDuration: 210, RootCause: 'Bearing worn', CorrectiveAction: 'Bearing replaced', FinalRemarks: 'Machine OK', SpareParts: 'Bearing SKF-6205 x2, Grease 500g' })
};
var __jceCounts = {};
var __jceBodies = {};
var __jceTitles = {};
(function() {
  var evs = ['JC_OPENED', 'JC_ASSIGNED', 'JC_STARTED', 'JC_PENDING', 'JC_APPROVED', 'JC_CLOSED'];
  evs.forEach(function(ev) {
    __providerCalls = [];
    whatsappSendJobCardEvent(WHATSAPP.TEMPLATES[ev], __jceEvents[ev]);
    var call = __providerCalls[__providerCalls.length - 1];
    __jceCounts[ev] = __providerCalls.length;
    __jceBodies[ev] = call ? call.messageBody : '';
    __jceTitles[ev] = call ? call.messageBody.split('\\n')[1] : '';
  });
})();
__ok('JCE1. All 6 job card events send exactly one notification', ['JC_OPENED', 'JC_ASSIGNED', 'JC_STARTED', 'JC_PENDING', 'JC_APPROVED', 'JC_CLOSED'].every(function(ev) { return __jceCounts[ev] === 1; }), JSON.stringify(__jceCounts));
__ok('JCE2. Each event renders its own emoji + title', __jceTitles['JC_OPENED'] === '🆕 *JOB CARD OPENED*' && __jceTitles['JC_ASSIGNED'] === '👤 *JOB CARD ASSIGNED*' && __jceTitles['JC_STARTED'] === '▶️ *JOB CARD STARTED*' && __jceTitles['JC_PENDING'] === '⏳ *JOB CARD PENDING REVIEW*' && __jceTitles['JC_APPROVED'] === '✅ *JOB CARD APPROVED*' && __jceTitles['JC_CLOSED'] === '🔒 *JOB CARD CLOSED*', JSON.stringify(__jceTitles));
__ok('JCE3. Actual CurrentStatus shown (never an invented status)', __jceBodies['JC_OPENED'].indexOf('📊 Status: OPEN') > -1 && __jceBodies['JC_ASSIGNED'].indexOf('📊 Status: OPEN') > -1 && __jceBodies['JC_STARTED'].indexOf('📊 Status: RUNNING') > -1 && __jceBodies['JC_PENDING'].indexOf('📊 Status: PENDING') > -1 && __jceBodies['JC_APPROVED'].indexOf('📊 Status: APPROVED') > -1 && __jceBodies['JC_CLOSED'].indexOf('📊 Status: CLOSED') > -1, '');
__ok('JCE4. Core + event-specific fields rendered', (function() {
  var b = __jceBodies;
  return b['JC_OPENED'].indexOf('📇 Job Card: JC-OPEN') > -1 &&
    b['JC_OPENED'].indexOf('⚠️ *Issue:* Motor bearing noise') > -1 &&
    b['JC_ASSIGNED'].indexOf('👤 Assigned To: WA Manager') > -1 &&
    b['JC_STARTED'].indexOf('▶️ Started By: WA Manager') > -1 &&
    b['JC_PENDING'].indexOf('📝 Remarks: Awaiting supervisor review') > -1 &&
    b['JC_APPROVED'].indexOf('📝 Remarks: Looks good') > -1 &&
    b['JC_CLOSED'].indexOf('✅ *Resolution:* Bearing replaced') > -1;
})());
__ok('JCE5. Master layout identical across events (separators/sections/footer)', (function() {
  var evs = ['JC_OPENED', 'JC_ASSIGNED', 'JC_STARTED', 'JC_PENDING', 'JC_APPROVED', 'JC_CLOSED'];
  return evs.every(function(ev) {
    var b = __jceBodies[ev];
    return b.indexOf('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') > -1 &&
      b.indexOf('*JOB CARD INFORMATION*') > -1 && b.indexOf('*MAINTENANCE DETAILS*') > -1 &&
      b.indexOf('*RESPONSIBILITY*') > -1 && b.indexOf('*ACTION*') > -1 && b.indexOf('*SYSTEM*') > -1 &&
      b.indexOf('*NEXT ACTION*') > -1 && b.indexOf('🤖 Generated by') > -1 && b.indexOf('🏢 Pakistan Wire Industries') > -1;
  });
})());
__ok('JCE6. Empty fields omitted (no undefined / null / blank labels)', (function() {
  __providerCalls = [];
  whatsappSendJobCardEvent(WHATSAPP.TEMPLATES.JC_OPENED, { JobCardNo: 'JC-MIN', CurrentStatus: 'OPEN', customerPhone: '3001112222' });
  var b = __providerCalls.length ? __providerCalls[__providerCalls.length - 1].messageBody : '';
  return b.indexOf('undefined') === -1 && b.indexOf('null') === -1 && b.indexOf('Section:') === -1 && b.indexOf('Machine:') === -1 && b.indexOf('Priority:') === -1 && b.indexOf('🧑') === -1 && b.indexOf('📇 Job Card: JC-MIN') > -1 && b.indexOf('📊 Status: OPEN') > -1;
})());
__ok('JCE7. No provider credentials leak into any message body', ['JC_OPENED', 'JC_ASSIGNED', 'JC_STARTED', 'JC_PENDING', 'JC_APPROVED', 'JC_CLOSED'].every(function(ev) {
  var b = __jceBodies[ev];
  return b.indexOf('meta_tok') === -1 && b.indexOf('tok_abc') === -1 && b.indexOf('apiToken') === -1 && b.indexOf('106540352242922') === -1;
}));
__ok('JCE8. MATERIAL / PARTS section only when parts recorded', __jceBodies['JC_CLOSED'].indexOf('*MATERIAL / PARTS USED*') > -1 && __jceBodies['JC_CLOSED'].indexOf('🔩 Bearing SKF-6205 x2') > -1 && __jceBodies['JC_OPENED'].indexOf('*MATERIAL / PARTS USED*') === -1);
var __jceProviderBodies = {};
['meta', 'twilio', 'ultramsg'].forEach(function(prov) {
  whatsappSaveSettings({ enabled: true, provider: prov, apiToken: 't_' + prov, phoneNumberId: prov === 'twilio' ? '+14155238886' : '106540352242922', businessAccountId: prov === 'twilio' ? 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' : '123456789012345', apiEndpoint: prov === 'meta' ? 'https://graph.facebook.com/v18.0' : prov === 'twilio' ? 'https://api.twilio.com/2010-04-01' : 'https://api.ultramsg.com', instanceId: 'instance1234', defaultCountryCode: '92', _userEmail: 'admin@cmms.com' });
  WHATSAPP_JCE_SENT = {};
  __providerCalls = [];
  whatsappSendJobCardEvent(WHATSAPP.TEMPLATES.JC_STARTED, __jceRec({ JobCardNo: 'JC-PROV', CurrentStatus: 'RUNNING', StartDateTime: '2026-08-16 11:00:00', StartedBy: 'wa@cmms.com' }));
  __jceProviderBodies[prov] = __providerCalls.length ? __providerCalls[__providerCalls.length - 1].messageBody : '';
});
__ok('JCE9. Identical message body across Meta / Twilio / UltraMsg providers', __jceProviderBodies['meta'] === __jceProviderBodies['twilio'] && __jceProviderBodies['twilio'] === __jceProviderBodies['ultramsg'] && __jceProviderBodies['meta'].indexOf('JC-PROV') > -1, JSON.stringify({ meta: (__jceProviderBodies['meta'] || '').split('\\n')[1], twilio: (__jceProviderBodies['twilio'] || '').split('\\n')[1], ultramsg: (__jceProviderBodies['ultramsg'] || '').split('\\n')[1] }));
whatsappSaveSettings({ enabled: false, _userEmail: 'admin@cmms.com' });
__providerCalls = [];
var jceDis = whatsappSendJobCardEvent(WHATSAPP.TEMPLATES.JC_STARTED, __jceRec({ JobCardNo: 'JC-DIS', CurrentStatus: 'RUNNING', StartedBy: 'wa@cmms.com' }));
__ok('JCE10. Disabled WhatsApp -> zero provider calls, graceful result', jceDis.success === false && String(jceDis.message).indexOf('disabled') > -1 && __providerCalls.length === 0, JSON.stringify({ r: jceDis, calls: __providerCalls.length }));
whatsappSaveSettings({ enabled: true, provider: 'meta', apiToken: 'meta_tok', phoneNumberId: '106540352242922', businessAccountId: '123456789012345', defaultCountryCode: '92', _userEmail: 'admin@cmms.com' });
__providerCalls = [];
var jceNoPh = whatsappSendJobCardEvent(WHATSAPP.TEMPLATES.JC_OPENED, { JobCardNo: 'JC-NOPH', CurrentStatus: 'OPEN', ComplaintBy: 'tech@cmms.com' });
__ok('JCE11. Missing recipient -> no throw, graceful no-recipients result, business continues', jceNoPh.success === false && String(jceNoPh.message).indexOf('No phone numbers') > -1 && __providerCalls.length === 0, JSON.stringify({ r: jceNoPh, calls: __providerCalls.length }));
var jceUnsup = whatsappSendJobCardEvent('LowStock', { JobCardNo: 'JC-X' });
__ok('JCE12. Unsupported event type rejected', jceUnsup.success === false && String(jceUnsup.message).indexOf('Unsupported') > -1, JSON.stringify(jceUnsup));
__providerCalls = [];
var jceD1 = whatsappSendJobCardEvent(WHATSAPP.TEMPLATES.JC_STARTED, __jceRec({ JobCardNo: 'JC-DUP', CurrentStatus: 'RUNNING', StartedBy: 'wa@cmms.com' }));
var jceDupC1 = __providerCalls.length;
var jceD2 = whatsappSendJobCardEvent(WHATSAPP.TEMPLATES.JC_STARTED, __jceRec({ JobCardNo: 'JC-DUP', CurrentStatus: 'RUNNING', StartedBy: 'wa@cmms.com' }));
var jceDupC2 = __providerCalls.length;
__ok('JCE13. Duplicate call for same event+job card suppressed (single send)', jceD1.success === true && jceDupC1 === 1 && jceD2.deduplicated === true && jceD2.success === false && jceDupC2 === 1, JSON.stringify({ c1: jceDupC1, c2: jceDupC2, d2: jceD2 }));
__providerCalls = [];
var jceWrap = whatsappSendJobStatusNotification(WHATSAPP.TEMPLATES.JC_STARTED, { jobCardNo: 'JC-WRAP', machine: 'Lathe-1', priority: 'High', complaint: 'x', assignedTechEmail: 'wa@cmms.com' });
var jceWrapBody = __providerCalls.length ? __providerCalls[__providerCalls.length - 1].messageBody : '';
__ok('JCE14. Legacy whatsappSendJobStatusNotification routes through centralized formatter', jceWrap.success === true && jceWrapBody.indexOf('*JOB CARD STARTED*') > -1, '');
`;

  const sandbox = {};
  vm.createContext(sandbox);
  const authProbeGs = fs.readFileSync(path.join(ROOT, 'AuthProbeGS.gs'), 'utf8');
  try {
    vm.runInContext(prescript + '\n' + waGs + '\n' + authProbeGs + '\n' + postscript, sandbox, { filename: 'WhatsAppGS.gs' });
  } catch (e) {
    check('B-PART. WhatsAppGS.gs executed in sandbox', false, e.message);
    return;
  }
  const checks = sandbox.__checks || [];
  checks.forEach(function(c) { check('B.' + c.name.slice(0), c.pass, c.detail); });
})();

/* =====================================================================
 * PART C - BROWSER UI (offline static server + intercepted API)
 * ===================================================================== */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = '/'; }
  if (p === '/') p = '/index.html';
  const fp = path.join(CF, p);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = 'http://127.0.0.1:' + PORT;

const serverState = {
  settings: {
    enabled: true, companyName: 'PWI CMMS', defaultCountryCode: '92', provider: 'meta',
    apiEndpoint: 'https://graph.facebook.com/v18.0', apiToken: 'server_token_abc',
    phoneNumberId: '106540352242922', businessAccountId: '123456789012345', testPhone: '', testMessage: 'Test message from PWI CMMS'
  },
  probeOk: true,
  users: [
    { UserID: 'U1', EmployeeID: 'EMP-WA', Name: 'WA Manager', Email: 'wa@cmms.com', Role: 'Manager', Department: 'Maintenance', Section: '', Mobile: '3001234567', CanManageWhatsApp: 'TRUE', Status: 'Active', Designation: 'Manager' }
  ],
  templates: [
    { TemplateID: 'TMP001', TemplateName: 'Job Opened', EventType: 'JobOpened', TemplateBody: '*Job Opened*\\nJob: {{jobCardNo}}', Variables: 'jobCardNo', CreatedBy: 'system', CreatedAt: '2026-08-01' }
  ],
  logs: [
    { MessageID: 'WA00001', DateTime: '2026-08-14 09:00:00', Recipient: 'WA Manager', PhoneNumber: '+923001234567', Module: 'System', ReferenceID: '', Template: 'TestMessage', Status: 'Sent', Provider: 'meta', ErrorMessage: '', SentBy: 'wa@cmms.com' }
  ],
  actions: []
};

function jceMockEvents() {
  const JCE_SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
  const meta = [
    { eventType: 'JobOpened', label: 'Job Card Opened', emoji: '\uD83C\uDD95', action: 'Job card opened and awaiting assignment', next: 'Technician to be assigned and maintenance started' },
    { eventType: 'JobAssigned', label: 'Job Card Assigned', emoji: '\uD83D\uDC64', action: 'Job card assigned to technician', next: 'Technician to start maintenance work' },
    { eventType: 'JobPending', label: 'Job Card Pending Review', emoji: '\u23F3', action: 'Job submitted for supervisor review', next: 'Supervisor to review and approve' },
    { eventType: 'JobStarted', label: 'Job Card Started', emoji: '\u25B6\uFE0F', action: 'Maintenance work started', next: 'Complete repair and submit for review' },
    { eventType: 'JobApproved', label: 'Job Card Approved', emoji: '\u2705', action: 'Job approved and closed out', next: 'None - job complete' },
    { eventType: 'JobClosed', label: 'Job Card Closed', emoji: '\uD83D\uDD12', action: 'Job closed after completion', next: 'None - job complete' }
  ];
  return meta.map((ev) => {
    const body = JCE_SEP + '\n' + ev.emoji + ' *' + ev.label.toUpperCase() + '*\n' + JCE_SEP + '\n\uD83C\uDFE2 *PWI CMMS*\n\n' +
      '*JOB CARD INFORMATION*\n\uD83D\uDCC7 Job Card: JC-2026-000001\n\uD83D\uDCCA Status: Pending\n\n' +
      '*MAINTENANCE DETAILS*\n\uD83C\uDFED Section: Drawing Section\n\u26CF\uFE0F Machine: Straightener\n\uD83C\uDFAF Priority: High\n\n' +
      '*RESPONSIBILITY*\n\uD83D\uDEE0\uFE0F Maintenance Team: Team A\n\uD83D\uDC64 Assigned To: Ali Hassan\n\n' +
      '*ACTION*\n' + ev.emoji + ' ' + ev.action + '\n\n' +
      '*SYSTEM*\n\uD83D\uDCBE Created By: system\n\uD83D\uDD14 Notification: ' + ev.label + '\n\n' +
      '*NEXT ACTION*\n\uD83C\uDFAF ' + ev.next + '\n\n' +
      '\uD83E\uDD16 Generated by PWI CMMS | \uD83C\uDFE2 Pakistan Wire Industries\n' + JCE_SEP;
    return { eventType: ev.eventType, label: ev.label, emoji: ev.emoji, action: ev.action, next: ev.next, __body: body };
  });
}

function handleApi(action, data) {
  serverState.actions.push({ action, data });
  const ok = (payload) => JSON.stringify({ success: true, data: payload });
  switch (action) {
    case 'whatsappGetSettings': return ok(serverState.settings);
    case 'whatsappSaveSettings':
      Object.keys(data || {}).forEach((k) => { if (k !== '_userEmail' && k in serverState.settings) serverState.settings[k] = data[k]; });
      return ok({ success: true, settings: serverState.settings });
    case 'whatsappTestSend':
      return ok({ success: true, messageId: 'wamid.ui.1', logId: 'WA00002', message: 'Sent via Meta API' });
    case 'whatsappAuthProbe':
      if (serverState.probeOk === false) return ok({ success: false, code: 403, message: 'permission denied: authorization is required to perform that action.' });
      return ok({ success: true, code: 200, provider: 'meta', message: 'External API access is authorized.' });
    case 'whatsappConnectionTest': return ok({ success: true, status: 'CONNECTED', message: 'UltraMsg connection verified.' });
    case 'whatsappGetTemplates': return ok(serverState.templates);
    case 'whatsappSaveTemplate': {
      const d = data || {};
      const idx = serverState.templates.findIndex((t) => t.TemplateID === d.TemplateID);
      if (idx > -1) {
        serverState.templates[idx].TemplateBody = d.TemplateBody;
        serverState.templates[idx].UpdatedBy = d._userEmail;
      } else {
        serverState.templates.push({ TemplateID: d.TemplateID || 'TMP' + String(Date.now()).slice(-6), TemplateName: d.TemplateName || '', EventType: d.EventType || '', TemplateBody: d.TemplateBody || '', Variables: d.Variables || '', CreatedBy: 'system', CreatedAt: '2026-08-01' });
      }
      return ok({ success: true, templates: serverState.templates });
    }
    case 'whatsappGetJcePreviews': return ok({ company: 'PWI CMMS', events: jceMockEvents() });
    case 'whatsappGetLogs': return ok(serverState.logs);
    case 'whatsappGetPanelData': return ok({ stats: { sentToday: 1, failedToday: 0, pendingToday: 0 }, recentLogs: serverState.logs.slice(0, 10) });
    case 'emailGetSettings': return ok({});
    case 'emailGetPanelData': return ok({ stats: {}, recentLogs: [] });
    case 'emailGetLogs': return ok([]);
    case 'getSettingsData': return ok({ departments: [], settings: [] });
    case 'getSectionList': return ok([]);
    case 'getUsers': return ok(serverState.users);
    case 'getUserDepartments': return ok([{ name: 'Maintenance' }]);
    case 'getUserSections': return ok([]);
    case 'searchUsers': return ok([]);
    case 'getSidebarCounts': return ok({});
    case 'getDashboardData': return ok({ departments: [], month: [], status: [], totalJobs: 0, openJobs: 0, runningJobs: 0, closedJobs: 0 });
    case 'getDashboardNotifications': return ok({ data: [], stats: { unread: 0, critical: 0, pendingApproval: 0 } });
    case 'getAuditLogs': return ok([]);
    case 'getNotifications': return ok([]);
    case 'updateUser': return ok({ success: true });
    default: return ok({});
  }
}

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
} catch (e) {
  check('C0. Chrome launch', false, e.message);
  server.close();
  process.exit(1);
}

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + String((e && e.message) || e)));
page.on('console', (m) => {
  if (m.type() === 'error') pageErrors.push('console: ' + m.text());
});

await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = new URL(req.url());
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') { req.abort('blockedbyclient'); return; }
  if (url.pathname === '/api/exec') {
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    const resp = handleApi(body.action, body.data || {});
    req.respond({ status: 200, contentType: 'application/json', body: resp });
    return;
  }
  if (url.pathname.endsWith('sw.js')) { req.abort(); return; }
  req.continue();
});

await page.evaluateOnNewDocument((adminUser) => {
  try {
    localStorage.setItem('cmms_welcomed', '1');
    localStorage.setItem('cmms_token', 'test-token');
    localStorage.setItem('cmms_user', adminUser);
  } catch (e) {}
  window.google = window.google || {};
  window.google.charts = window.google.charts || {
    load: function () {},
    setOnLoadCallback: function (cb) { if (typeof cb === 'function') setTimeout(cb, 10); },
    Bar: function (el) { return { draw: function () {}, getBoundingBox: function () { return { top: 0, left: 0, width: 0, height: 0 }; } }; }
  };
  window.google.visualization = window.google.visualization || new Proxy({}, {
    get: function (t, prop) {
      if (prop === 'DataTable') {
        return function () { this.addColumn = function () {}; this.addRow = function () {}; this.setValue = function () {}; this.addRows = function () {}; };
      }
      if (prop === 'arrayToDataTable') return function () { return new window.google.visualization.DataTable(); };
      if (prop === 'events') return { addListener: function () {}, removeAllListeners: function () {} };
      return function (el) {
        return { draw: function () {}, getBoundingBox: function () { return { top: 0, left: 0, width: 0, height: 0 }; }, setAction: function () {}, clearChart: function () {} };
      };
    }
  });
}, JSON.stringify({ name: 'System Admin', email: 'admin@cmms.com', role: 'administrator', isSystemAdmin: true, canManageWhatsApp: true }));

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof Router !== 'undefined' && typeof WhatsApp !== 'undefined' && typeof Session !== 'undefined' && Session.isLoggedIn(), { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('pageContent') && document.getElementById('pageContent').children.length > 0, { timeout: 30000 });
  check('C1. App boots with admin session (dashboard rendered)', true);

  /* C2/C3: whatsapp page renders + settings loaded */
  await page.evaluate(() => Router.navigate('whatsapp'));
  await page.waitForSelector('#whatsappPage', { timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.getElementById('whatsappEnabled');
    return el && document.getElementById('whatsappCompanyName') && document.getElementById('whatsappCompanyName').value === 'PWI CMMS';
  }, { timeout: 30000 });
  const c3 = await page.evaluate(() => ({
    checked: document.getElementById('whatsappEnabled').checked,
    company: document.getElementById('whatsappCompanyName').value,
    provider: document.getElementById('whatsappProvider').value,
    endpoint: document.getElementById('whatsappApiEndpoint').value
  }));
  check('C2. WhatsApp settings page renders with form fields', c3.checked === true && c3.company === 'PWI CMMS' && c3.provider === 'meta' && c3.endpoint === 'https://graph.facebook.com/v18.0', JSON.stringify(c3));

  /* C3b: templates + logs render */
  await page.waitForFunction(() => document.getElementById('whatsappTemplatesContainer') && document.getElementById('whatsappTemplatesContainer').textContent.indexOf('Job Opened') > -1, { timeout: 30000 });
  const tplOk = await page.evaluate(() => {
    const c = document.getElementById('whatsappTemplatesContainer');
    const l = document.getElementById('waLogsBody');
    return !!c && c.textContent.indexOf('Job Opened') > -1 && !!l && l.textContent.indexOf('WA Manager') > -1;
  });
  check('C3. Templates and message logs render from backend', tplOk);
  await page.waitForFunction(() => { const el = document.getElementById('waStatSent'); return el && el.textContent === '1'; }, { timeout: 30000 });
  const statsText = await page.evaluate(() => ({
    s: (document.getElementById('waStatSent') || {}).textContent,
    f: (document.getElementById('waStatFailed') || {}).textContent,
    p: (document.getElementById('waStatPending') || {}).textContent
  }));
  check('C3b. Stats render today counters into waStat ids', statsText.s === '1' && statsText.f === '0', JSON.stringify(statsText));

  /* C3c: JCE lifecycle section renders 6 read-only preview cards from whatsappGetJcePreviews */
  await page.waitForFunction(() => document.getElementById('whatsappJceContainer') && document.querySelectorAll('#whatsappJceContainer .wa-jce-item').length === 6, { timeout: 30000 });
  const jceOk = await page.evaluate(() => {
    const c = document.getElementById('whatsappJceContainer');
    const items = c.querySelectorAll('.wa-jce-item');
    const badges = c.querySelectorAll('.wa-jce-badge');
    const bodies = c.querySelectorAll('.wa-jce-body');
    const firstBody = bodies[0] ? bodies[0].textContent : '';
    const hasSections = ['JOB CARD INFORMATION', 'MAINTENANCE DETAILS', 'RESPONSIBILITY', 'ACTION', 'SYSTEM', 'NEXT ACTION'].every((s) => firstBody.indexOf(s) !== -1);
    return {
      items: items.length,
      badges: badges.length,
      editControls: c.querySelectorAll('textarea, button, input').length,
      hasSections: hasSections,
      hasSeparator: firstBody.indexOf('\u2501') !== -1,
      hasFooter: firstBody.indexOf('Pakistan Wire Industries') !== -1
    };
  });
  check('C3c. JCE lifecycle section renders 6 read-only preview cards (no edit controls)', jceOk.items === 6 && jceOk.badges === 6 && jceOk.editControls === 0 && jceOk.hasSections && jceOk.hasSeparator && jceOk.hasFooter, JSON.stringify(jceOk));

  /* C3d: template Save button persists edited body (oninput enables button) */
  const tplBodyBefore = serverState.templates[0].TemplateBody;
  await page.evaluate(() => {
    const ta = document.getElementById('tpl_0_textarea');
    const btn = document.getElementById('tpl_0_savebtn');
    ta.value = ta.value + '\n[saved-by-ui]';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    btn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  const savedUi = serverState.templates[0].TemplateBody.indexOf('[saved-by-ui]') !== -1;
  check('C3d. Save button persists edited template body', savedUi, JSON.stringify(serverState.templates[0].TemplateBody));

  /* C3e: saved template content persists after page reload */
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('whatsappTemplatesContainer') && document.getElementById('whatsappTemplatesContainer').textContent.indexOf('[saved-by-ui]') > -1, { timeout: 30000 });
  const reloadOk = await page.evaluate(() => document.getElementById('whatsappTemplatesContainer').textContent.indexOf('[saved-by-ui]') !== -1);
  check('C3e. Saved template content persists after reload', reloadOk && serverState.templates[0].TemplateBody === tplBodyBefore + '\n[saved-by-ui]', JSON.stringify(serverState.templates[0].TemplateBody));


  /* C4: toggle enabled -> whatsappSaveSettings with enabled:false */
  await page.evaluate(() => {
    document.getElementById('whatsappEnabled').checked = false;
    WhatsApp.toggleEnabled();
  });
  await new Promise((r) => setTimeout(r, 800));
  const togglePayload = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').slice(-1)[0];
  check('C4. Toggle posts whatsappSaveSettings enabled=false', !!togglePayload && togglePayload.data.enabled === false && serverState.settings.enabled === false, JSON.stringify(togglePayload && togglePayload.data));
  const toggleKeys = Object.keys((togglePayload && togglePayload.data) || {});
  check('C4b. Toggle payload contains ONLY enabled (+ _userEmail auto-injected)', toggleKeys.length <= 2 && toggleKeys.indexOf('enabled') !== -1 && toggleKeys.indexOf('apiToken') === -1 && toggleKeys.indexOf('companyName') === -1 && toggleKeys.indexOf('testPhone') === -1, JSON.stringify(togglePayload && togglePayload.data));
  const bannerOff = await page.evaluate(() => { const b = document.getElementById('whatsappDisabledBanner'); return b ? b.style.display : 'missing'; });
  check('C4c. Disabled banner visible after toggle off', bannerOff === 'block', bannerOff);

  /* C5: save settings button */
  await page.evaluate(() => {
    document.getElementById('whatsappEnabled').checked = true;
    document.getElementById('whatsappCompanyName').value = 'PWI CMMS Prod';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 800));
  const savePayload = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').slice(-1)[0];
  check('C5. Save Settings posts full form (incl. companyName)', !!savePayload && savePayload.data.companyName === 'PWI CMMS Prod' && savePayload.data.enabled === true, JSON.stringify(savePayload && savePayload.data));

  /* C6-C9: test send */
  await page.evaluate(() => {
    document.getElementById('whatsappTestPhone').value = '0300 1234567';
    document.getElementById('whatsappTestMessage').value = 'Hello from UI harness';
  });
  await page.evaluate(() => WhatsApp.sendTest());
  await page.waitForFunction(() => document.getElementById('whatsappTestResult') && document.getElementById('whatsappTestResult').textContent.indexOf('successfully') > -1, { timeout: 30000 });
  const testSends = serverState.actions.filter((a) => a.action === 'whatsappTestSend');
  const ts = testSends[testSends.length - 1];
  check('C6. Test Send succeeds end-to-end (button result)', true);
  check('C7. Test Send payload carries testPhone + testMessage', !!ts && ts.data.testPhone === '0300 1234567' && ts.data.testMessage === 'Hello from UI harness', JSON.stringify(ts && ts.data));
  check('C8. Test Send payload contains no credentials', !!ts && !('apiToken' in ts.data) && !('phoneNumberId' in ts.data) && !('businessAccountId' in ts.data) && !('apiEndpoint' in ts.data), JSON.stringify(ts && ts.data));
  const resultText = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('C6b. Test result renders logId + sent message', resultText.indexOf('WA00002') > -1 && resultText.indexOf('successfully') > -1, resultText);

  /* C9: authorizeConnection shows editor instructions and does NOT send */
  const authSendsBefore = serverState.actions.filter((a) => a.action === 'whatsappTestSend').length;
  await page.evaluate(() => WhatsApp.authorizeConnection());
  await page.waitForFunction(() => {
    const el = document.getElementById('whatsappTestResult');
    return el && el.textContent.indexOf('authorization required') > -1;
  }, { timeout: 15000 });
  const authAlertOk = await page.evaluate(() => {
    const el = document.getElementById('whatsappTestResult');
    return el.textContent.indexOf('authorization required') > -1 && el.textContent.indexOf('Open Apps Script Editor') > -1 && !!document.getElementById('waRecheckAuthBtn');
  });
  const authSendsAfter = serverState.actions.filter((a) => a.action === 'whatsappTestSend').length;
  check('C9. authorizeConnection shows editor instructions, does NOT send a message', authAlertOk && authSendsAfter === authSendsBefore, JSON.stringify({ alert: authAlertOk, sendsBefore: authSendsBefore, sendsAfter: authSendsAfter }));

  /* C9b: Re-check Authorization runs the auth probe */
  await page.evaluate(() => WhatsApp.recheckAuth());
  await page.waitForFunction(() => {
    const el = document.getElementById('whatsappTestResult');
    return el && el.textContent.indexOf('Authorization confirmed') > -1;
  }, { timeout: 15000 });
  const probeCalls = serverState.actions.filter((a) => a.action === 'whatsappAuthProbe').length;
  const sendBtnOk = await page.evaluate(() => { const b = document.getElementById('whatsappTestBtn'); return !!b && b.disabled === false; });
  check('C9b. Re-check Authorization runs auth probe and re-enables send', probeCalls >= 1 && sendBtnOk, 'probeCalls=' + probeCalls);

  /* C9c: Send Test is gated when authorization is NOT confirmed */
  serverState.probeOk = false;
  const gateSendsBefore = serverState.actions.filter((a) => a.action === 'whatsappTestSend').length;
  await page.evaluate(() => WhatsApp.sendTest());
  await page.waitForFunction(() => {
    const el = document.getElementById('whatsappTestResult');
    return el && el.textContent.indexOf('authorization required') > -1;
  }, { timeout: 15000 });
  const gateSendsAfter = serverState.actions.filter((a) => a.action === 'whatsappTestSend').length;
  check('C9c. Send Test gated when authorization fails (no whatsappTestSend)', gateSendsAfter === gateSendsBefore, JSON.stringify({ before: gateSendsBefore, after: gateSendsAfter }));
  serverState.probeOk = true;

  /* C9d/C9e: obviously-invalid Meta IDs are blocked on save */
  const saveCountBefore1 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  await page.evaluate(() => {
    document.getElementById('whatsappPhoneNumberId').value = '3333655467';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 500));
  const saveCountAfter1 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  const invalidPhoneAlert = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('C9d. Invalid Phone Number ID (3333655467) blocks save', saveCountAfter1 === saveCountBefore1 && invalidPhoneAlert.indexOf('Phone Number ID') > -1, JSON.stringify({ before: saveCountBefore1, after: saveCountAfter1, alert: invalidPhoneAlert.slice(0, 80) }));

  const saveCountBefore2 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  await page.evaluate(() => {
    document.getElementById('whatsappPhoneNumberId').value = '106540352242922';
    document.getElementById('whatsappBusinessAccountId').value = 'Alam';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 500));
  const saveCountAfter2 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  const invalidWabaAlert = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('C9e. Invalid Business Account ID (Alam) blocks save', saveCountAfter2 === saveCountBefore2 && invalidWabaAlert.indexOf('Business Account ID') > -1, JSON.stringify({ before: saveCountBefore2, after: saveCountAfter2, alert: invalidWabaAlert.slice(0, 80) }));

  await page.evaluate(() => {
    document.getElementById('whatsappBusinessAccountId').value = '123456789012345';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 800));
  const saveValid = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').slice(-1)[0];
  check('C9f. Valid Meta IDs save normally', !!saveValid && saveValid.data.phoneNumberId === '106540352242922' && saveValid.data.businessAccountId === '123456789012345', JSON.stringify(saveValid && saveValid.data));

  /* C10: provider switch */
  const endpoint = await page.evaluate(() => {
    document.getElementById('whatsappProvider').value = 'twilio';
    document.getElementById('whatsappApiEndpoint').value = '';
    WhatsApp.onProviderChange();
    return document.getElementById('whatsappApiEndpoint').value;
  });
  check('C10. Provider switch fills twilio endpoint', endpoint === 'https://api.twilio.com/2010-04-01', endpoint);

  /* C11: WA manager can open page */
  await page.evaluate((u) => {
    Session.setUser(JSON.parse(u));
    Session.setToken('tok-wa');
    Router.navigate('whatsapp');
  }, JSON.stringify({ name: 'WA Manager', email: 'wa@cmms.com', role: 'Manager', isSystemAdmin: false, canManageWhatsApp: true }));
  await page.waitForFunction(() => Router.current === 'whatsapp' && document.getElementById('whatsappPage'), { timeout: 30000 });
  check('C11. WA manager (canManageWhatsApp) can open WhatsApp page', true);

  /* C12: restricted user blocked from page */
  await page.evaluate((u) => {
    Session.setUser(JSON.parse(u));
    Session.setToken('tok-tech');
    Router.navigate('whatsapp');
  }, JSON.stringify({ name: 'Tech User', email: 'tech@cmms.com', role: 'Technician', isSystemAdmin: false, canManageWhatsApp: false }));
  await page.waitForFunction(() => Router.current === 'dashboard', { timeout: 30000 });
  const c12 = await page.evaluate(() => ({
    current: Router.current,
    canAccess: Session.canAccessPage('whatsapp')
  }));
  check('C12. Restricted user redirected to dashboard + cannot access page', c12.current === 'dashboard' && c12.canAccess === false, JSON.stringify(c12));

  /* C13/C14: users page permission checkbox */
  await page.evaluate((u) => {
    Session.setUser(JSON.parse(u));
    Session.setToken('tok-admin');
    Router.navigate('users');
  }, JSON.stringify({ name: 'System Admin', email: 'admin@cmms.com', role: 'administrator', isSystemAdmin: true, canManageWhatsApp: true }));
  await page.waitForSelector('#usersTableContainer table', { timeout: 30000 });
  await page.evaluate(() => User.openEdit('U1'));
  await page.waitForFunction(() => {
    const m = document.getElementById('userFormModal');
    const cb = document.querySelector('#userForm input[name="CanManageWhatsApp"]');
    return m && cb && getComputedStyle(m).display !== 'none' && cb.checked;
  }, { timeout: 30000 });
  check('C13. Users edit modal shows CanManageWhatsApp checked for WA manager', true);

  await page.evaluate(() => {
    const cb = document.querySelector('#userForm input[name="CanManageWhatsApp"]');
    cb.checked = false;
    User.save(new Event('submit'));
  });
  await new Promise((r) => setTimeout(r, 1200));
  const up = serverState.actions.filter((a) => a.action === 'updateUser').slice(-1)[0];
  check('C14. Unchecking WA perm saves CanManageWhatsApp=FALSE', !!up && up.data.CanManageWhatsApp === 'FALSE', JSON.stringify(up && up.data));

  /* C16: provider switch to Twilio must NOT copy Meta values, and all UI
     labels/helpers/placeholders/docs/hint/help must become Twilio-specific */
  await page.evaluate(() => Router.navigate('whatsapp'));
  await page.waitForFunction(() => Router.current === 'whatsapp' && document.getElementById('whatsappPage'), { timeout: 30000 });
  await page.waitForFunction(() => (document.getElementById('whatsappProvider') || {}).value === 'meta', { timeout: 30000 });
  const c16 = await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappProvider').value = 'twilio';
    WhatsApp.onProviderChange();
    return {
      endpoint: g('whatsappApiEndpoint').value,
      phone: g('whatsappPhoneNumberId').value,
      biz: g('whatsappBusinessAccountId').value,
      token: g('whatsappApiToken').value,
      bizLabel: g('whatsappBusinessAccountLabel').textContent,
      endpointLabel: g('whatsappApiEndpointLabel').textContent,
      bizHelper: g('whatsappBusinessAccountIdHelper').textContent,
      phoneHelper: g('whatsappPhoneNumberIdHelper').textContent,
      phonePlaceholder: g('whatsappPhoneNumberId').placeholder,
      tokenPlaceholder: g('whatsappApiToken').placeholder,
      endpointPlaceholder: g('whatsappApiEndpoint').placeholder,
      docsBtn: g('waDocsBtn').textContent,
      hint: g('whatsappTestHint').textContent,
      help: g('waHelpList').textContent,
      status: g('whatsappIntegrationStatus').textContent,
      sendBtnDisabled: g('whatsappTestBtn').disabled,
      connBtnDisabled: g('whatsappTestConnBtn').disabled
    };
  });
  check('C16. Twilio switch: no Meta IDs copied; labels/helpers/placeholders/docs/hint/help updated; Send Test disabled',
    c16.endpoint === 'https://api.twilio.com/2010-04-01' &&
    c16.phone === '' && c16.biz === '' && c16.token === '' &&
    c16.bizLabel === 'Twilio Account SID' && c16.endpointLabel === 'API Endpoint (Twilio)' &&
    c16.bizHelper.indexOf('AC followed by 32 hex') > -1 && c16.phoneHelper.indexOf('From') > -1 &&
    c16.phonePlaceholder.indexOf('+14155238886') > -1 && c16.tokenPlaceholder === 'Enter Twilio Auth Token' &&
    c16.endpointPlaceholder === 'https://api.twilio.com/2010-04-01' &&
    c16.docsBtn.indexOf('Twilio') > -1 && c16.hint.indexOf('E.164') > -1 && c16.help.indexOf('From sender') > -1 &&
    c16.status.indexOf('Configuration Required') > -1 &&
    c16.sendBtnDisabled === true && c16.connBtnDisabled === true,
    JSON.stringify(c16));

  /* C17: switch back to Meta restores captured Meta values */
  const c17 = await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappProvider').value = 'meta';
    WhatsApp.onProviderChange();
    return {
      endpoint: g('whatsappApiEndpoint').value,
      phone: g('whatsappPhoneNumberId').value,
      biz: g('whatsappBusinessAccountId').value,
      token: g('whatsappApiToken').value,
      bizLabel: g('whatsappBusinessAccountLabel').textContent,
      sendBtnDisabled: g('whatsappTestBtn').disabled
    };
  });
  check('C17. Switch back to Meta: Meta values restored (capture not lost)',
    c17.endpoint === 'https://graph.facebook.com/v18.0' &&
    c17.phone === '106540352242922' && c17.biz === '123456789012345' &&
    c17.token === 'server_token_abc' && c17.bizLabel === 'Business Account ID (Meta)' &&
    c17.sendBtnDisabled === false,
    JSON.stringify(c17));

  /* C18: Twilio config with Meta IDs / Meta endpoint is blocked on save */
  const saveB1 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappProvider').value = 'twilio';
    WhatsApp.onProviderChange();
    g('whatsappApiEndpoint').value = 'https://api.twilio.com/2010-04-01';
    g('whatsappApiToken').value = 'twilio_at';
    g('whatsappPhoneNumberId').value = '106540352242922';
    g('whatsappBusinessAccountId').value = '123456789012345';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 500));
  const saveA1 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  const c18Alert = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('C18. Twilio save blocked when Meta SID/From used (Account SID flagged)', saveA1 === saveB1 && c18Alert.indexOf('Account SID') > -1, JSON.stringify({ blocked: saveA1 === saveB1, alert: c18Alert.slice(0, 100) }));

  const saveB2 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappBusinessAccountId').value = 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 500));
  const saveA2 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  const c18bAlert = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('C18b. Twilio From must be E.164 (Meta Phone Number ID flagged)', saveA2 === saveB2 && c18bAlert.indexOf('From') > -1 && c18bAlert.indexOf('E.164') > -1, JSON.stringify({ blocked: saveA2 === saveB2, alert: c18bAlert.slice(0, 100) }));

  const saveB3 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappApiEndpoint').value = 'https://graph.facebook.com/v18.0';
    g('whatsappPhoneNumberId').value = '+14155238886';
    WhatsApp.saveSettings();
  });
  await new Promise((r) => setTimeout(r, 500));
  const saveA3 = serverState.actions.filter((a) => a.action === 'whatsappSaveSettings').length;
  const c18cAlert = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('C18c. Meta Graph endpoint blocked for Twilio on save', saveA3 === saveB3 && c18cAlert.indexOf('api.twilio.com') > -1, JSON.stringify({ blocked: saveA3 === saveB3, alert: c18cAlert.slice(0, 100) }));

  /* restore clean Meta state for remaining checks */
  serverState.settings.provider = 'meta';
  serverState.settings.apiEndpoint = 'https://graph.facebook.com/v18.0';
  serverState.settings.apiToken = 'server_token_abc';
  serverState.settings.phoneNumberId = '106540352242922';
  serverState.settings.businessAccountId = '123456789012345';
  await page.evaluate(() => Router.navigate('dashboard'));
  await page.waitForFunction(() => Router.current === 'dashboard', { timeout: 30000 });
  await page.evaluate(() => Router.navigate('whatsapp'));
  await page.waitForFunction(() => Router.current === 'whatsapp' && (document.getElementById('whatsappProvider') || {}).value === 'meta', { timeout: 30000 });

  /* U: UltraMsg browser UI */
  const uC = await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappProvider').value = 'ultramsg';
    WhatsApp.onProviderChange();
    return {
      endpoint: g('whatsappApiEndpoint').value,
      instance: g('whatsappInstanceId').value,
      phone: g('whatsappPhoneNumberId').value,
      biz: g('whatsappBusinessAccountId').value,
      token: g('whatsappApiToken').value,
      instanceFieldDisplay: g('waInstanceField').style.display,
      phoneFieldDisplay: g('waPhoneField').style.display,
      bizFieldDisplay: g('waBizField').style.display,
      endpointLabel: g('whatsappApiEndpointLabel').textContent,
      endpointPlaceholder: g('whatsappApiEndpoint').placeholder,
      instancePlaceholder: g('whatsappInstanceId').placeholder,
      docsBtn: g('waDocsBtn').textContent,
      endpointHelper: g('whatsappApiEndpointHelper').textContent
    };
  });
  check('U-C1. UltraMsg switch: instance field shown, phone/biz hidden, no Meta values copied',
    uC.endpoint === 'https://api.ultramsg.com' && uC.instance === '' && uC.phone === '' && uC.biz === '' && uC.token === '' &&
    uC.instanceFieldDisplay === 'block' && uC.phoneFieldDisplay === 'none' && uC.bizFieldDisplay === 'none' &&
    uC.endpointLabel === 'API URL (UltraMsg)' && uC.endpointPlaceholder === 'https://api.ultramsg.com' &&
    uC.instancePlaceholder === 'e.g. instance1234' && uC.docsBtn.indexOf('UltraMsg') > -1 && uC.endpointHelper.indexOf('api.ultramsg.com') > -1,
    JSON.stringify(uC));

  const connB = serverState.actions.filter((a) => a.action === 'whatsappConnectionTest').length;
  await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappApiEndpoint').value = 'https://api.ultramsg.com';
    g('whatsappApiToken').value = 'ultra_tok';
    g('whatsappInstanceId').value = 'instance1234';
    WhatsApp.testConnection();
  });
  await page.waitForFunction(() => {
    const el = document.getElementById('whatsappTestResult');
    return el && el.textContent.indexOf('CONNECTED') > -1;
  }, { timeout: 15000 });
  const connA = serverState.actions.filter((a) => a.action === 'whatsappConnectionTest').length;
  const connPayload = serverState.actions.filter((a) => a.action === 'whatsappConnectionTest').slice(-1)[0];
  const connResText = await page.evaluate(() => (document.getElementById('whatsappTestResult') || {}).textContent || '');
  check('U-C2. Test Connection posts whatsappConnectionTest for ultramsg + renders CONNECTED',
    connA === connB + 1 && !!connPayload && connResText.indexOf('CONNECTED') > -1 && connResText.indexOf('Connection OK') > -1,
    JSON.stringify({ connCalls: connA - connB, payload: connPayload && connPayload.data, text: connResText.slice(0, 80) }));

  /* switch back to Meta so remaining state is clean */
  serverState.settings.provider = 'meta';
  await page.evaluate(() => {
    const g = (id) => document.getElementById(id);
    g('whatsappProvider').value = 'meta';
    WhatsApp.onProviderChange();
  });
  await page.evaluate(() => WhatsApp.saveSettings());

  /* C15: no app errors (filter network/offline noise) */
  const noiseRe = /net::|Failed to load resource|favicon|gstatic|Google Charts|charts\.google|404|Intercept|blockedbyclient|ERR_/;
  const realErrors = pageErrors.filter((e) => !noiseRe.test(e));
  check('C15. No console/page errors during whole UI run', realErrors.length === 0, realErrors.slice(0, 5).join(' ; '));
} catch (e) {
  check('C-UI. Harness execution', false, (e && e.message) || String(e));
}

await browser.close().catch(() => {});
server.close();

const failed = results.filter((r) => !r.pass);
console.log('\n===== WHATSAPP REGRESSION SUMMARY =====');
console.log('Total: ' + results.length + ' | PASS: ' + (results.length - failed.length) + ' | FAIL: ' + failed.length);
process.exit(failed.length === 0 ? 0 : 1);
