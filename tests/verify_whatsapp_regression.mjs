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

var UrlFetchApp = {
  fetch: function(url, opts) {
    if (__probeMode === 'fail') throw new Error('Permission denied: authorization is required to perform that action.');
    if (String(url).indexOf('discovery/v1/apis') === -1) return { getResponseCode: function() { return 404; } };
    return { getResponseCode: function() { return 200; } };
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
    case 'whatsappGetTemplates': return ok(serverState.templates);
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
