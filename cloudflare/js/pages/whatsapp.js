var WhatsApp = (function() {
  var waSettings = {};
  var waTemplates = [];
  var waLogs = [];
  var waStats = {};
  var waDirtyTemplates = {};
  var waActiveProvider = null;
  var waProviderValues = { meta: null, twilio: null, ultramsg: null };
  var waAuthBlocked = false;

  var ICON = {
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:6px"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:6px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="width:16px;height:16px"><path d="M20 6L9 17l-5-5"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>'
  };

  var TEST_BTN_HTML = ICON.wa + ' Send Test';

  var COUNTRY_LIST = [
    { dial: '1', iso: 'US', flag: '\uD83C\uDDFA\uD83C\uDDF8', name: 'United States' },
    { dial: '1', iso: 'CA', flag: '\uD83C\uDDE8\uD83C\uDDE6', name: 'Canada' },
    { dial: '44', iso: 'GB', flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'United Kingdom' },
    { dial: '353', iso: 'IE', flag: '\uD83C\uDDEE\uD83C\uDDEA', name: 'Ireland' },
    { dial: '33', iso: 'FR', flag: '\uD83C\uDDEB\uD83C\uDDF7', name: 'France' },
    { dial: '49', iso: 'DE', flag: '\uD83C\uDDE9\uD83C\uDDEA', name: 'Germany' },
    { dial: '39', iso: 'IT', flag: '\uD83C\uDDEE\uD83C\uDDF9', name: 'Italy' },
    { dial: '34', iso: 'ES', flag: '\uD83C\uDDEA\uD83C\uDDF8', name: 'Spain' },
    { dial: '351', iso: 'PT', flag: '\uD83C\uDDF5\uD83C\uDDF9', name: 'Portugal' },
    { dial: '31', iso: 'NL', flag: '\uD83C\uDDF3\uD83C\uDDF1', name: 'Netherlands' },
    { dial: '32', iso: 'BE', flag: '\uD83C\uDDE7\uD83C\uDDEA', name: 'Belgium' },
    { dial: '41', iso: 'CH', flag: '\uD83C\uDDE8\uD83C\uDDED', name: 'Switzerland' },
    { dial: '43', iso: 'AT', flag: '\uD83C\uDDE6\uD83C\uDDF9', name: 'Austria' },
    { dial: '46', iso: 'SE', flag: '\uD83C\uDDF8\uD83C\uDDEA', name: 'Sweden' },
    { dial: '47', iso: 'NO', flag: '\uD83C\uDDF3\uD83C\uDDF4', name: 'Norway' },
    { dial: '45', iso: 'DK', flag: '\uD83C\uDDE9\uD83C\uDDF0', name: 'Denmark' },
    { dial: '358', iso: 'FI', flag: '\uD83C\uDDEB\uD83C\uDDEE', name: 'Finland' },
    { dial: '48', iso: 'PL', flag: '\uD83C\uDDF5\uD83C\uDDF1', name: 'Poland' },
    { dial: '420', iso: 'CZ', flag: '\uD83C\uDDE8\uD83C\uDDFF', name: 'Czech Republic' },
    { dial: '36', iso: 'HU', flag: '\uD83C\uDDED\uD83C\uDDFA', name: 'Hungary' },
    { dial: '40', iso: 'RO', flag: '\uD83C\uDDF7\uD83C\uDDF4', name: 'Romania' },
    { dial: '30', iso: 'GR', flag: '\uD83C\uDDEC\uD83C\uDDF7', name: 'Greece' },
    { dial: '7', iso: 'RU', flag: '\uD83C\uDDF7\uD83C\uDDFA', name: 'Russia' },
    { dial: '380', iso: 'UA', flag: '\uD83C\uDDFA\uD83C\uDDE6', name: 'Ukraine' },
    { dial: '90', iso: 'TR', flag: '\uD83C\uDDF9\uD83C\uDDF7', name: 'Turkey' },
    { dial: '972', iso: 'IL', flag: '\uD83C\uDDEE\uD83C\uDDF1', name: 'Israel' },
    { dial: '20', iso: 'EG', flag: '\uD83C\uDDEA\uD83C\uDDEC', name: 'Egypt' },
    { dial: '234', iso: 'NG', flag: '\uD83C\uDDF3\uD83C\uDDEC', name: 'Nigeria' },
    { dial: '254', iso: 'KE', flag: '\uD83C\uDDF0\uD83C\uDDEA', name: 'Kenya' },
    { dial: '27', iso: 'ZA', flag: '\uD83C\uDDFF\uD83C\uDDE6', name: 'South Africa' },
    { dial: '91', iso: 'IN', flag: '\uD83C\uDDEE\uD83C\uDDF3', name: 'India' },
    { dial: '92', iso: 'PK', flag: '\uD83C\uDDF5\uD83C\uDDF0', name: 'Pakistan' },
    { dial: '93', iso: 'AF', flag: '\uD83C\uDDE6\uD83C\uDDEB', name: 'Afghanistan' },
    { dial: '94', iso: 'LK', flag: '\uD83C\uDDF1\uD83C\uDDF0', name: 'Sri Lanka' },
    { dial: '880', iso: 'BD', flag: '\uD83C\uDDE7\uD83C\uDDE9', name: 'Bangladesh' },
    { dial: '977', iso: 'NP', flag: '\uD83C\uDDF3\uD83C\uDDF5', name: 'Nepal' },
    { dial: '98', iso: 'IR', flag: '\uD83C\uDDEE\uD83C\uDDF7', name: 'Iran' },
    { dial: '964', iso: 'IQ', flag: '\uD83C\uDDEE\uD83C\uDDF6', name: 'Iraq' },
    { dial: '966', iso: 'SA', flag: '\uD83C\uDDF8\uD83C\uDDE6', name: 'Saudi Arabia' },
    { dial: '971', iso: 'AE', flag: '\uD83C\uDDE6\uD83C\uDDEA', name: 'United Arab Emirates' },
    { dial: '974', iso: 'QA', flag: '\uD83C\uDDF6\uD83C\uDDE6', name: 'Qatar' },
    { dial: '965', iso: 'KW', flag: '\uD83C\uDDF0\uD83C\uDDFC', name: 'Kuwait' },
    { dial: '968', iso: 'OM', flag: '\uD83C\uDDF4\uD83C\uDDF2', name: 'Oman' },
    { dial: '973', iso: 'BH', flag: '\uD83C\uDDE7\uD83C\uDDED', name: 'Bahrain' },
    { dial: '962', iso: 'JO', flag: '\uD83C\uDDEF\uD83C\uDDF4', name: 'Jordan' },
    { dial: '961', iso: 'LB', flag: '\uD83C\uDDF1\uD83C\uDDE7', name: 'Lebanon' },
    { dial: '86', iso: 'CN', flag: '\uD83C\uDDE8\uD83C\uDDF3', name: 'China' },
    { dial: '852', iso: 'HK', flag: '\uD83C\uDDED\uD83C\uDDF0', name: 'Hong Kong' },
    { dial: '853', iso: 'MO', flag: '\uD83C\uDDF2\uD83C\uDDF4', name: 'Macau' },
    { dial: '886', iso: 'TW', flag: '\uD83C\uDDF9\uD83C\uDDFC', name: 'Taiwan' },
    { dial: '81', iso: 'JP', flag: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Japan' },
    { dial: '82', iso: 'KR', flag: '\uD83C\uDDF0\uD83C\uDDF7', name: 'South Korea' },
    { dial: '65', iso: 'SG', flag: '\uD83C\uDDF8\uD83C\uDDEC', name: 'Singapore' },
    { dial: '60', iso: 'MY', flag: '\uD83C\uDDF2\uD83C\uDDFE', name: 'Malaysia' },
    { dial: '62', iso: 'ID', flag: '\uD83C\uDDEE\uD83C\uDDE9', name: 'Indonesia' },
    { dial: '63', iso: 'PH', flag: '\uD83C\uDDF5\uD83C\uDDED', name: 'Philippines' },
    { dial: '66', iso: 'TH', flag: '\uD83C\uDDF9\uD83C\uDDED', name: 'Thailand' },
    { dial: '84', iso: 'VN', flag: '\uD83C\uDDFB\uD83C\uDDF3', name: 'Vietnam' },
    { dial: '61', iso: 'AU', flag: '\uD83C\uDDE6\uD83C\uDDFA', name: 'Australia' },
    { dial: '64', iso: 'NZ', flag: '\uD83C\uDDF3\uD83C\uDDFF', name: 'New Zealand' },
    { dial: '55', iso: 'BR', flag: '\uD83C\uDDE7\uD83C\uDDF7', name: 'Brazil' },
    { dial: '52', iso: 'MX', flag: '\uD83C\uDDF2\uD83C\uDDFD', name: 'Mexico' },
    { dial: '54', iso: 'AR', flag: '\uD83C\uDDE6\uD83C\uDDF7', name: 'Argentina' },
    { dial: '56', iso: 'CL', flag: '\uD83C\uDDE8\uD83C\uDDF1', name: 'Chile' },
    { dial: '57', iso: 'CO', flag: '\uD83C\uDDE8\uD83C\uDDF4', name: 'Colombia' },
    { dial: '51', iso: 'PE', flag: '\uD83C\uDDF5\uD83C\uDDEA', name: 'Peru' }
  ];

  function getEl(id) { return document.getElementById(id); }

  function esc(v) { return Utils.escapeHtml(String(v === undefined || v === null ? '' : v)); }

  function countryOptions(selected) {
    var s = String(selected || '');
    var found = false;
    var html = '';
    COUNTRY_LIST.forEach(function(c) {
      var sel = (String(c.dial) === s) ? ' selected' : '';
      if (String(c.dial) === s) found = true;
      html += '<option value="' + c.dial + '"' + sel + '>' + c.flag + ' ' + c.name + ' (+' + c.dial + ')</option>';
    });
    if (s && !found) html += '<option value="' + esc(s) + '" selected>' + esc(s) + '</option>';
    return html;
  }

  function renderPage(el) {
    var el = el || document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML = pageHTML() + '<style>' + pageCSS() + '</style>';
    loadData();
  }

  function pageHTML() {
    return '' +
      '<div id="whatsappPage" class="page">' +

        '<div class="wa-page-header">' +
          '<div>' +
            '<h1>' + ICON.wa + 'WhatsApp Business API Settings</h1>' +
            '<p>Configure your WhatsApp Business API for notifications and alerts</p>' +
          '</div>' +
          '<button class="btn btn-secondary" onclick="WhatsApp.openDocs()">' + ICON.help + 'Help &amp; Docs</button>' +
        '</div>' +

        '<div class="card wa-integration">' +
          '<div id="whatsappIntegrationStatus" class="wa-status wa-status-warn">' +
            '<span class="wa-status-icon">' + ICON.power + '</span>' +
            '<div class="wa-status-text">' +
              '<div class="wa-status-title">Integration Status: <strong>Loading</strong></div>' +
              '<div class="wa-status-sub">Loading WhatsApp configuration...</div>' +
            '</div>' +
          '</div>' +
          '<div class="wa-status-toggle">' +
            '<label class="toggle-switch" style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:12px;color:var(--text-muted)">Enable WhatsApp</span>' +
              '<input type="checkbox" id="whatsappEnabled" onchange="WhatsApp.toggleEnabled()">' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
          '</div>' +
        '</div>' +

        '<div id="whatsappDisabledBanner" style="display:none" class="wa-disabled-banner">' +
          '<span class="wa-disabled-icon">' + ICON.power + '</span>' +
          '<span>WhatsApp is currently disabled. Enable it to activate automatic message delivery.</span>' +
        '</div>' +

        '<div class="card wa-section">' +
          '<div class="card-header">' +
            '<div class="card-title">Business Information</div>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="wa-grid-2">' +
              '<div class="wa-field">' +
                '<label for="whatsappCompanyName">Company / Business Name</label>' +
                '<input type="text" id="whatsappCompanyName" class="wa-input" placeholder="PWI CMMS">' +
                '<span class="wa-helper">Your business or company name</span>' +
              '</div>' +
              '<div class="wa-field">' +
                '<label for="whatsappCountryCode">Default Country Code</label>' +
                '<select id="whatsappCountryCode" class="wa-select" onchange="WhatsApp.syncCountry(\'whatsappCountryCode\')"></select>' +
                '<span class="wa-helper">Country dialing code for outbound numbers</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card wa-section">' +
          '<div class="card-header">' +
            '<div class="card-title">API Configuration</div>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="wa-grid-2">' +
              '<div class="wa-field">' +
                '<label for="whatsappProvider">Provider</label>' +
                '<select id="whatsappProvider" class="wa-select" onchange="WhatsApp.onProviderChange()">' +
                  '<option value="meta">Meta WhatsApp Cloud API</option>' +
                  '<option value="twilio">Twilio WhatsApp</option>' +
                  '<option value="ultramsg">UltraMsg WhatsApp</option>' +
                '</select>' +
                '<span class="wa-helper">Select your WhatsApp Business API provider</span>' +
              '</div>' +
              '<div class="wa-field">' +
                '<label for="whatsappApiEndpoint" id="whatsappApiEndpointLabel">API Endpoint (Graph API)</label>' +
                '<input type="text" id="whatsappApiEndpoint" class="wa-input" placeholder="https://graph.facebook.com/v18.0" spellcheck="false" oninput="WhatsApp.updateTestBtnState()">' +
                '<span class="wa-helper" id="whatsappApiEndpointHelper">Meta Graph API endpoint URL</span>' +
              '</div>' +
              '<div class="wa-field full">' +
                '<label for="whatsappApiToken">API Token</label>' +
                '<div class="wa-input-group">' +
                  '<input type="password" id="whatsappApiToken" class="wa-input" placeholder="Enter API token" autocomplete="off" spellcheck="false" oninput="WhatsApp.updateTestBtnState()">' +
                  '<button type="button" class="wa-eye" onclick="WhatsApp.toggleTokenVisibility()" title="Show / hide token" aria-label="Show or hide token">' + ICON.eye + '</button>' +
                '</div>' +
                '<span class="wa-helper" id="whatsappApiTokenHelper">Your Meta Access Token is stored securely.</span>' +
              '</div>' +
              '<div class="wa-field" id="waInstanceField" style="display:none">' +
                '<label for="whatsappInstanceId">Instance ID</label>' +
                '<input type="text" id="whatsappInstanceId" class="wa-input" placeholder="instance1234" spellcheck="false" autocomplete="off" oninput="WhatsApp.updateTestBtnState()">' +
                '<span class="wa-helper" id="whatsappInstanceIdHelper">UltraMsg Instance ID (from your UltraMsg dashboard)</span>' +
              '</div>' +
              '<div class="wa-field" id="waPhoneField">' +
                '<label for="whatsappPhoneNumberId">Phone Number ID</label>' +
                '<input type="text" id="whatsappPhoneNumberId" class="wa-input" placeholder="WhatsApp Business phone number ID" spellcheck="false" oninput="WhatsApp.updateTestBtnState()">' +
                '<span class="wa-helper" id="whatsappPhoneNumberIdHelper">WhatsApp Business Phone Number ID</span>' +
              '</div>' +
              '<div class="wa-field" id="waBizField">' +
                '<label id="whatsappBusinessAccountLabel" for="whatsappBusinessAccountId">Business Account ID (Meta)</label>' +
                '<input type="text" id="whatsappBusinessAccountId" class="wa-input" placeholder="Business account ID" spellcheck="false" oninput="WhatsApp.updateTestBtnState()">' +
                '<span class="wa-helper" id="whatsappBusinessAccountIdHelper">WhatsApp Business Account ID</span>' +
              '</div>' +
            '</div>' +
            '<div class="wa-action-bar">' +
              '<div class="wa-action-left">' +
                '<button class="btn btn-primary" onclick="WhatsApp.saveSettings()">Save Settings</button>' +
                '<button class="btn btn-secondary" onclick="WhatsApp.resetForm()">Reset</button>' +
              '</div>' +
              '<div class="wa-action-right">' +
                '<button class="btn btn-success" id="whatsappTestConnBtn" onclick="WhatsApp.testConnection()">Test Connection</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card wa-section">' +
          '<div class="card-header">' +
            '<div class="card-title">' + ICON.check + ' Test Connection</div>' +
          '</div>' +
          '<div class="card-body">' +
            '<p class="wa-section-sub">Send a test message to verify your WhatsApp Business API configuration.</p>' +
            '<div class="wa-test-row">' +
              '<div class="wa-field wa-test-country">' +
                '<label for="whatsappTestCountry">Country</label>' +
                '<select id="whatsappTestCountry" class="wa-select" onchange="WhatsApp.syncCountry(\'whatsappTestCountry\')"></select>' +
              '</div>' +
              '<div class="wa-field wa-test-phone">' +
                '<label for="whatsappTestPhone">Test Phone Number</label>' +
                '<input type="text" id="whatsappTestPhone" class="wa-input" placeholder="3333655467" spellcheck="false" autocomplete="off" inputmode="tel">' +
              '</div>' +
              '<div class="wa-field wa-test-msg">' +
                '<label for="whatsappTestMessage">Test Message</label>' +
                '<input type="text" id="whatsappTestMessage" class="wa-input" placeholder="Test message from PWI CMMS" autocomplete="off">' +
              '</div>' +
              '<button class="btn btn-primary wa-test-btn" onclick="WhatsApp.sendTest()" id="whatsappTestBtn">' + TEST_BTN_HTML + '</button>' +
            '</div>' +
            '<div class="wa-test-hint" id="whatsappTestHint">' + ICON.help + 'Local numbers are normalized with the selected country code (e.g. +92 for Pakistan).</div>' +
            '<div id="whatsappTestResult" class="wa-alert"></div>' +
          '</div>' +
        '</div>' +

        '<div class="card wa-section">' +
          '<div class="card-header">' +
            '<div class="card-title">' + ICON.list + ' Message Templates</div>' +
            '<div class="card-actions"><span style="font-size:11px;color:var(--text-muted)">Edit template content below</span></div>' +
          '</div>' +
          '<div class="card-body" id="whatsappTemplatesContainer">' +
            '<div class="wa-placeholder">Loading templates...</div>' +
          '</div>' +
        '</div>' +

        '<div class="card wa-section">' +
          '<div class="card-header">' +
            '<div class="card-title">' + ICON.list + ' Message Logs</div>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="wa-legend">' +
              '<span><span class="status-dot" style="background:var(--success)"></span> Sent Today: <strong id="waStatSent">0</strong></span>' +
              '<span><span class="status-dot" style="background:var(--danger)"></span> Failed Today: <strong id="waStatFailed">0</strong></span>' +
              '<span><span class="status-dot" style="background:var(--warning)"></span> Pending: <strong id="waStatPending">0</strong></span>' +
            '</div>' +
            '<div class="wa-table-wrap">' +
              '<table class="wa-table">' +
                '<thead>' +
                  '<tr>' +
                    '<th>DateTime</th><th>Recipient</th><th>Phone</th><th>Module</th>' +
                    '<th>Reference</th><th>Template</th><th>Status</th><th>Error</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody id="waLogsBody">' +
                  '<tr><td colspan="8" class="wa-placeholder">Loading...</td></tr>' +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card wa-section wa-help-card">' +
          '<div class="card-header">' +
            '<div class="card-title">Need Help?</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-info" id="waDocsBtn" onclick="WhatsApp.openDocs()">' + ICON.doc + 'Meta API Documentation</button>' +
            '</div>' +
          '</div>' +
          '<div class="card-body">' +
            '<ul class="wa-help-list" id="waHelpList">' +
              '<li>' + ICON.check + 'Your Access Token must be valid and have the correct permissions</li>' +
              '<li>' + ICON.check + 'Phone Number ID must be correct</li>' +
              '<li>' + ICON.check + 'Business Account ID must be correct</li>' +
              '<li>' + ICON.check + 'Test number must be a valid WhatsApp Business recipient</li>' +
              '<li>' + ICON.check + 'WhatsApp notifications must be enabled</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="wa-security-note">' + ICON.shield + 'Your WhatsApp settings are stored securely. Only authorized users can access or modify them.</div>' +
      '</div>';
  }

  function pageCSS() {
    return '' +
      '#whatsappPage .wa-page-header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:20px; }' +
      '#whatsappPage .wa-page-header h1 { margin:0; font-size:22px; font-weight:700; color:var(--text); letter-spacing:-0.3px; display:flex; align-items:center; }' +
      '#whatsappPage .wa-page-header h1 svg { color:var(--success); margin-right:10px; }' +
      '#whatsappPage .wa-page-header p { margin:6px 0 0; font-size:13px; color:var(--text-muted); }' +
      '#whatsappPage .wa-section { margin-bottom:20px; }' +
      '#whatsappPage .wa-section-sub { margin:0 0 14px; font-size:12px; color:var(--text-muted); }' +
      '#whatsappPage .wa-integration { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 18px; flex-wrap:wrap; }' +
      '#whatsappPage .wa-status { display:flex; align-items:center; gap:12px; min-width:0; }' +
      '#whatsappPage .wa-status-icon { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }' +
      '#whatsappPage .wa-status-text { min-width:0; }' +
      '#whatsappPage .wa-status-title { font-size:14px; font-weight:600; color:var(--text); }' +
      '#whatsappPage .wa-status-title strong { font-weight:700; }' +
      '#whatsappPage .wa-status-sub { font-size:12px; color:var(--text-muted); margin-top:2px; line-height:1.45; }' +
      '#whatsappPage .wa-status-ok .wa-status-icon { background:var(--success-bg); color:var(--success); }' +
      '#whatsappPage .wa-status-ok .wa-status-title strong { color:var(--success); }' +
      '#whatsappPage .wa-status-warn .wa-status-icon { background:var(--warning-bg); color:var(--warning); }' +
      '#whatsappPage .wa-status-warn .wa-status-title strong { color:var(--warning); }' +
      '#whatsappPage .wa-status-error .wa-status-icon { background:var(--danger-bg); color:var(--danger); }' +
      '#whatsappPage .wa-status-error .wa-status-title strong { color:var(--danger); }' +
      '#whatsappPage .wa-status-toggle .toggle-switch { cursor:pointer; }' +
      '#whatsappPage .wa-status-toggle .toggle-switch input { display:none; }' +
      '#whatsappPage .wa-status-toggle .toggle-slider { width:38px; height:22px; background:var(--border); border-radius:12px; position:relative; transition:var(--transition); }' +
      '#whatsappPage .wa-status-toggle .toggle-slider::after { content:\'\'; position:absolute; width:18px; height:18px; border-radius:50%; background:#fff; top:2px; left:2px; transition:var(--transition); }' +
      '#whatsappPage .wa-status-toggle .toggle-switch input:checked + .toggle-slider { background:var(--success); }' +
      '#whatsappPage .wa-status-toggle .toggle-switch input:checked + .toggle-slider::after { left:18px; }' +
      '#whatsappPage .wa-disabled-banner { display:flex; align-items:center; gap:8px; padding:10px 14px; border:1px solid rgba(245,158,11,0.35); background:var(--warning-bg); color:var(--warning); border-radius:var(--radius-sm); font-size:12px; margin-bottom:20px; }' +
      '#whatsappPage .wa-disabled-icon { display:flex; flex-shrink:0; }' +
      '#whatsappPage .wa-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:18px 22px; }' +
      '#whatsappPage .wa-field { display:flex; flex-direction:column; gap:6px; min-width:0; }' +
      '#whatsappPage .wa-field.full { grid-column:1/-1; }' +
      '#whatsappPage .wa-field > label { font-size:12px; font-weight:600; color:var(--text-secondary); letter-spacing:0.2px; }' +
      '#whatsappPage .wa-field .wa-helper { font-size:11px; color:var(--text-muted); line-height:1.4; }' +
      '#whatsappPage .wa-input, #whatsappPage .wa-select { width:100%; padding:9px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-input); color:var(--text); font-size:13px; outline:none; transition:var(--transition); box-sizing:border-box; }' +
      '#whatsappPage .wa-input:focus, #whatsappPage .wa-select:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-light); }' +
      '#whatsappPage .wa-input::placeholder { color:var(--text-muted); }' +
      '#whatsappPage .wa-select { appearance:none; background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%235c6085\' stroke-width=\'2\'><polyline points=\'6 9 12 15 18 9\'/></svg>"); background-repeat:no-repeat; background-position:right 12px center; padding-right:34px; }' +
      '#whatsappPage .wa-input-group { position:relative; }' +
      '#whatsappPage .wa-input-group .wa-input { padding-right:42px; }' +
      '#whatsappPage .wa-eye { position:absolute; right:5px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:7px; border-radius:6px; display:flex; align-items:center; justify-content:center; }' +
      '#whatsappPage .wa-eye:hover { color:var(--text); background:var(--bg-card-hover); }' +
      '#whatsappPage .wa-action-bar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-top:22px; padding-top:18px; border-top:1px solid var(--border); }' +
      '#whatsappPage .wa-action-left, #whatsappPage .wa-action-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }' +
      '#whatsappPage .wa-test-row { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; }' +
      '#whatsappPage .wa-test-country { flex:0 0 150px; }' +
      '#whatsappPage .wa-test-phone { flex:1 1 170px; min-width:150px; }' +
      '#whatsappPage .wa-test-msg { flex:1.6 1 240px; min-width:200px; }' +
      '#whatsappPage .wa-test-btn { height:36px; flex-shrink:0; white-space:nowrap; }' +
      '#whatsappPage .wa-alert { display:none; margin-top:14px; padding:12px 14px; border-radius:var(--radius-sm); font-size:13px; line-height:1.5; align-items:flex-start; gap:10px; }' +
      '#whatsappPage .wa-alert-success { display:flex; border:1px solid rgba(34,197,94,0.4); background:var(--success-bg); color:var(--success); }' +
      '#whatsappPage .wa-alert-error { display:flex; border:1px solid rgba(239,68,68,0.45); background:var(--danger-bg); color:var(--danger); }' +
      '#whatsappPage .wa-alert-meta { display:block; margin-top:4px; font-size:12px; opacity:0.9; }' +
      '#whatsappPage .wa-alert-icon { display:flex; flex-shrink:0; margin-top:1px; }' +
      '#whatsappPage .wa-alert-content { flex:1 1 auto; min-width:0; }' +
      '#whatsappPage .wa-alert-title { font-weight:600; font-size:13px; margin-bottom:2px; }' +
      '#whatsappPage .wa-alert-msg { margin-top:2px; }' +
      '#whatsappPage .wa-alert-sub { margin-top:6px; font-size:12px; opacity:0.9; }' +
      '#whatsappPage .wa-alert-auth { display:flex; border:1px solid rgba(245,158,11,0.45); background:var(--warning-bg); color:var(--warning); }' +
      '#whatsappPage .wa-authorize-btn { margin-top:12px; display:inline-flex; align-items:center; gap:6px; }' +
      '#whatsappPage .wa-alert-actions { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }' +
      '#whatsappPage .wa-alert-details { margin-top:10px; font-size:11px; opacity:0.9; }' +
      '#whatsappPage .wa-alert-details summary { cursor:pointer; display:inline-flex; align-items:center; gap:4px; }' +
      '#whatsappPage .wa-alert-details pre { margin:8px 0 0; padding:8px 10px; background:rgba(0,0,0,0.35); border-radius:6px; white-space:pre-wrap; word-break:break-all; color:var(--text-secondary); max-height:140px; overflow:auto; }' +
      '#whatsappPage .wa-test-hint { margin-top:10px; font-size:11px; color:var(--text-muted); line-height:1.5; display:flex; align-items:center; gap:6px; }' +
      '#whatsappPage .wa-placeholder { text-align:center; padding:20px; color:var(--text-muted); }' +
      '#whatsappPage .wa-legend { display:flex; gap:18px; flex-wrap:wrap; margin-bottom:12px; font-size:12px; color:var(--text-secondary); }' +
      '#whatsappPage .wa-legend strong { color:var(--text); }' +
      '#whatsappPage .status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; vertical-align:middle; }' +
      '#whatsappPage .wa-table-wrap { overflow-x:auto; }' +
      '#whatsappPage .wa-table { width:100%; border-collapse:collapse; font-size:12px; }' +
      '#whatsappPage .wa-table th { text-align:left; padding:8px 10px; border-bottom:2px solid var(--border); font-weight:600; color:var(--text-muted); white-space:nowrap; }' +
      '#whatsappPage .wa-table td { padding:7px 10px; border-bottom:1px solid var(--border); color:var(--text-secondary); }' +
      '#whatsappPage .wa-table tbody tr:hover td { background:var(--bg-card-hover); }' +
      '#whatsappPage .wa-badge { display:inline-flex; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; }' +
      '#whatsappPage .wa-badge.sent { background:var(--success-bg); color:var(--success); }' +
      '#whatsappPage .wa-badge.failed { background:var(--danger-bg); color:var(--danger); }' +
      '#whatsappPage .wa-badge.pending { background:var(--warning-bg); color:var(--warning); }' +
      '#whatsappPage .wa-help-list { list-style:none; margin:0; padding:0; display:grid; gap:9px; }' +
      '#whatsappPage .wa-help-list li { display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--text-secondary); line-height:1.45; }' +
      '#whatsappPage .wa-help-list li svg { color:var(--success); flex-shrink:0; margin-top:1px; }' +
      '#whatsappPage .wa-security-note { display:flex; align-items:center; gap:9px; margin-top:18px; padding:12px 14px; border:1px dashed var(--border-light); border-radius:var(--radius-sm); color:var(--text-muted); font-size:12px; background:var(--bg-secondary); }' +
      '#whatsappPage .wa-security-note svg { color:var(--success); flex-shrink:0; }' +
      '@media(max-width:768px) { #whatsappPage .wa-grid-2 { grid-template-columns:1fr; } #whatsappPage .wa-test-country { flex:1 1 140px; } #whatsappPage .wa-action-bar { flex-direction:column; align-items:stretch; } #whatsappPage .wa-action-left, #whatsappPage .wa-action-right { justify-content:space-between; } #whatsappPage .wa-integration { flex-direction:column; align-items:flex-start; } }';
  }

  function loadData() {
    var settingsDone = false, templatesDone = false, logsDone = false, statsDone = false;

    function checkAllDone() {
      if (settingsDone && templatesDone && logsDone && statsDone) Loader.hide();
    }

    Loader.show();
    API.post('whatsappGetSettings', {})
      .then(function(data) {
        waSettings = data || {};
        renderSettings(waSettings);
        settingsDone = true;
        checkAllDone();
      })
      .catch(function() {
        settingsDone = true;
        checkAllDone();
      });

    API.post('whatsappGetTemplates', {})
      .then(function(data) {
        waTemplates = data || [];
        renderTemplates(waTemplates);
        templatesDone = true;
        checkAllDone();
      })
      .catch(function() {
        waTemplates = [];
        renderTemplates([]);
        templatesDone = true;
        checkAllDone();
      });

    API.post('whatsappGetLogs', {})
      .then(function(data) {
        waLogs = data || [];
        renderLogs(waLogs);
        logsDone = true;
        checkAllDone();
      })
      .catch(function() {
        waLogs = [];
        renderLogs([]);
        logsDone = true;
        checkAllDone();
      });

    API.post('whatsappGetPanelData', {})
      .then(function(data) {
        var stats = (data && data.stats) || data || {};
        waStats = stats;
        renderStats(stats);
        statsDone = true;
        checkAllDone();
      })
      .catch(function() {
        renderStats({ sentToday: 0, failedToday: 0, pendingToday: 0 });
        statsDone = true;
        checkAllDone();
      });
  }

  function renderSettings(s) {
    var el;
    s = s || {};
    waSettings = s;
    el = getEl('whatsappEnabled'); if (el) el.checked = !!s.enabled;
    el = getEl('whatsappCompanyName'); if (el) el.value = s.companyName || '';
    el = getEl('whatsappCountryCode'); if (el) { el.innerHTML = countryOptions(s.defaultCountryCode); el.value = s.defaultCountryCode || ''; }
    el = getEl('whatsappProvider'); if (el) el.value = s.provider || 'meta';
    waProviderValues.meta = {
      apiEndpoint: (s.meta && s.meta.apiEndpoint) || s.apiEndpoint || '',
      apiToken: (s.meta && s.meta.apiToken) || s.apiToken || '',
      phoneNumberId: (s.meta && s.meta.phoneNumberId) || s.phoneNumberId || '',
      businessAccountId: (s.meta && s.meta.businessAccountId) || s.businessAccountId || ''
    };
    waProviderValues.twilio = {
      apiEndpoint: (s.twilio && s.twilio.apiEndpoint) || '',
      apiToken: (s.twilio && s.twilio.apiToken) || '',
      phoneNumberId: (s.twilio && s.twilio.phoneNumberId) || '',
      businessAccountId: (s.twilio && s.twilio.businessAccountId) || ''
    };
    waProviderValues.ultramsg = {
      apiUrl: (s.ultramsg && s.ultramsg.apiUrl) || '',
      token: (s.ultramsg && s.ultramsg.token) || '',
      instanceId: (s.ultramsg && s.ultramsg.instanceId) || ''
    };
    waActiveProvider = s.provider || 'meta';
    applyProviderFields(waActiveProvider, waProviderValues[waActiveProvider] || providerDefaults(waActiveProvider));
    el = getEl('whatsappTestPhone'); if (el) el.value = s.testPhone || '';
    el = getEl('whatsappTestMessage'); if (el) el.value = s.testMessage || '';
    el = getEl('whatsappTestCountry'); if (el) { el.innerHTML = countryOptions(s.defaultCountryCode); el.value = s.defaultCountryCode || ''; }
    el = getEl('whatsappTestResult'); if (el) { el.className = 'wa-alert'; el.innerHTML = ''; }
    waAuthBlocked = false;
    el = getEl('whatsappTestBtn'); if (el) el.disabled = false;
    onProviderChange();
    setDisabledBanner();
    renderIntegrationStatus();
    updateTestBtnState();
  }

  function resetForm() {
    renderSettings(waSettings);
    Notify.info('Settings reset to saved values');
  }

  function readProviderFields() {
    return {
      apiEndpoint: getEl('whatsappApiEndpoint') ? getEl('whatsappApiEndpoint').value : '',
      apiToken: getEl('whatsappApiToken') ? getEl('whatsappApiToken').value : '',
      instanceId: getEl('whatsappInstanceId') ? getEl('whatsappInstanceId').value : '',
      phoneNumberId: getEl('whatsappPhoneNumberId') ? getEl('whatsappPhoneNumberId').value : '',
      businessAccountId: getEl('whatsappBusinessAccountId') ? getEl('whatsappBusinessAccountId').value : ''
    };
  }

  function applyProviderFields(prov, v) {
    v = v || {};
    var d = providerDefaults(prov);
    var isUltra = prov === 'ultramsg';
    var el = getEl('whatsappApiEndpoint'); if (el) el.value = isUltra ? (v.apiUrl || d.apiUrl) : (v.apiEndpoint || d.apiEndpoint);
    el = getEl('whatsappApiToken'); if (el) el.value = isUltra ? (v.token || '') : (v.apiToken || '');
    el = getEl('whatsappInstanceId'); if (el) el.value = isUltra ? (v.instanceId || '') : '';
    el = getEl('whatsappPhoneNumberId'); if (el) el.value = isUltra ? '' : (v.phoneNumberId || '');
    el = getEl('whatsappBusinessAccountId'); if (el) el.value = isUltra ? '' : (v.businessAccountId || '');
  }

  function providerDefaults(prov) {
    if (prov === 'twilio') {
      return { apiEndpoint: 'https://api.twilio.com/2010-04-01', apiToken: '', phoneNumberId: '', businessAccountId: '' };
    }
    if (prov === 'ultramsg') {
      return { apiUrl: 'https://api.ultramsg.com', token: '', instanceId: '' };
    }
    return { apiEndpoint: 'https://graph.facebook.com/v18.0', apiToken: '', phoneNumberId: '', businessAccountId: '' };
  }

  function currentProvider() {
    var el = getEl('whatsappProvider');
    return el ? el.value : 'meta';
  }

  function waMetaIdValid(v) {
    v = String(v || '').trim();
    return /^\d+$/.test(v) && v.length >= 14 && v.length <= 20;
  }

  function waTwilioSidValid(v) {
    v = String(v || '').trim();
    return /^AC[0-9a-fA-F]{32}$/.test(v);
  }

  function waTwilioSenderValid(v) {
    v = String(v || '').trim();
    return /^\+[1-9][0-9]{6,14}$/.test(v);
  }

  function waEndpointValid(prov, v) {
    v = String(v || '').trim();
    if (prov === 'twilio') return v.indexOf('api.twilio.com') !== -1 && v.indexOf('graph.facebook.com') === -1 && v.indexOf('api.ultramsg.com') === -1;
    if (prov === 'meta') return v.indexOf('graph.facebook.com') !== -1 && v.indexOf('api.twilio.com') === -1 && v.indexOf('api.ultramsg.com') === -1;
    if (prov === 'ultramsg') return v.indexOf('api.ultramsg.com') !== -1 && v.indexOf('graph.facebook.com') === -1 && v.indexOf('api.twilio.com') === -1;
    return true;
  }

  function configIssue() {
    var p = currentProvider();
    var endpoint = getEl('whatsappApiEndpoint') ? getEl('whatsappApiEndpoint').value : '';
    var token = getEl('whatsappApiToken') ? getEl('whatsappApiToken').value : '';
    var phoneId = getEl('whatsappPhoneNumberId') ? getEl('whatsappPhoneNumberId').value : '';
    var bizId = getEl('whatsappBusinessAccountId') ? getEl('whatsappBusinessAccountId').value : '';
    if (p === 'meta') {
      if (endpoint && !waEndpointValid(p, endpoint)) return 'Meta API Endpoint must be the Meta Graph API endpoint (graph.facebook.com), not a Twilio endpoint.';
      if (!token) return 'Meta API token is not configured.';
      if (!phoneId) return 'Meta Phone Number ID is not configured.';
      if (!waMetaIdValid(phoneId)) return 'Meta Phone Number ID looks invalid. It must be the numeric ID from Meta (e.g. 106540352242922), not the phone number.';
      if (!bizId) return 'Meta Business Account ID is not configured.';
      if (!waMetaIdValid(bizId)) return 'Meta Business Account ID looks invalid. It must be the numeric WhatsApp Business Account ID (e.g. 375420581369195).';
    } else if (p === 'twilio') {
      if (endpoint && !waEndpointValid(p, endpoint)) return 'Twilio API Endpoint must point to api.twilio.com, not the Meta Graph API endpoint (graph.facebook.com).';
      if (!token) return 'Twilio Auth Token is not configured.';
      if (!bizId) return 'Twilio Account SID is not configured.';
      if (!waTwilioSidValid(bizId)) return 'Twilio Account SID looks invalid. It must start with "AC" followed by 32 hex characters (e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx), not a Meta Business Account ID.';
      if (!phoneId) return 'Twilio WhatsApp sender (From) is not configured.';
      if (!waTwilioSenderValid(phoneId)) return 'Twilio WhatsApp sender (From) looks invalid. It must be an E.164 phone number with a leading + (e.g. +14155238886), not a Meta Phone Number ID.';
    } else if (p === 'ultramsg') {
      if (endpoint && !waEndpointValid(p, endpoint)) return 'UltraMsg API URL must point to api.ultramsg.com, not a Meta or Twilio endpoint.';
      var inst = getEl('whatsappInstanceId') ? getEl('whatsappInstanceId').value : '';
      if (!inst) return 'UltraMsg Instance ID is not configured.';
      if (!token) return 'UltraMsg Token is not configured.';
    } else {
      return 'Unknown WhatsApp provider: ' + p;
    }
    return '';
  }

  function updateTestBtnState() {
    var btn = getEl('whatsappTestBtn');
    var connBtn = getEl('whatsappTestConnBtn');
    var blocked = !!configIssue();
    if (btn) btn.disabled = blocked;
    if (connBtn) connBtn.disabled = blocked;
  }

  function renderIntegrationStatus() {
    var enabled = getEl('whatsappEnabled') ? getEl('whatsappEnabled').checked : false;
    var card = getEl('whatsappIntegrationStatus');
    if (!card) return;
    var cls, icon, title, sub;
    if (!enabled) {
      cls = 'wa-status-warn';
      icon = ICON.power;
      title = 'Disabled';
      sub = 'WhatsApp notifications are currently disabled.';
    } else {
      var issue = configIssue();
      if (issue) {
        cls = 'wa-status-error';
        icon = ICON.alert;
        title = 'Configuration Required';
        sub = issue;
      } else {
        cls = 'wa-status-ok';
        icon = ICON.checkCircle;
        title = 'Connected';
        sub = 'WhatsApp notifications are enabled and ready to send.';
      }
    }
    card.className = 'wa-status ' + cls;
    card.innerHTML =
      '<span class="wa-status-icon">' + icon + '</span>' +
      '<div class="wa-status-text">' +
        '<div class="wa-status-title">Integration Status: <strong>' + title + '</strong></div>' +
        '<div class="wa-status-sub">' + esc(sub) + '</div>' +
      '</div>';
  }

  function setDisabledBanner() {
    var banner = getEl('whatsappDisabledBanner');
    if (!banner) return;
    var enabled = getEl('whatsappEnabled');
    banner.style.display = (enabled && enabled.checked) ? 'none' : 'block';
  }

  function waErrorKind(msg) {
    var st = waErrorState(msg);
    if (st === 'AUTHORIZATION_REQUIRED') return 'auth';
    if (st === 'WHATSAPP_DISABLED') return 'disabled';
    return 'provider';
  }

  function waErrorState(msg) {
    msg = String(msg || '');
    if (/script\.external_request|permission to call|not allowed to call|authorization is required to perform that action/i.test(msg)) {
      return 'AUTHORIZATION_REQUIRED';
    }
    if (/business account id looks invalid/i.test(msg)) return 'BUSINESS_ACCOUNT_ID_INVALID';
    if (/phone number id looks invalid/i.test(msg)) return 'PHONE_NUMBER_ID_INVALID';
    if (/not configured/i.test(msg)) return 'CONFIGURATION_REQUIRED';
    if (/token/i.test(msg)) return 'TOKEN_MISSING';
    if (/phone|number/i.test(msg)) return 'PHONE_INVALID';
    if (/disabled/i.test(msg)) return 'WHATSAPP_DISABLED';
    if (/success/i.test(msg)) return 'SUCCESS';
    return 'PROVIDER_ERROR';
  }

  function waScrubSecrets(msg) {
    msg = String(msg || '');
    return msg
      .replace(/EAAG[A-Za-z0-9]+/g, '[REDACTED]')
      .replace(/AC[0-9a-fA-F]{24,}/g, '[REDACTED]')
      .replace(/SK[0-9a-fA-F]{16,}/g, '[REDACTED]')
      .replace(/AKfyc[a-zA-Z0-9_-]{20,}/g, '[REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
      .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED]');
  }

  function waFriendlyError(msg) {
    var st = waErrorState(msg);
    if (/twilio/i.test(msg)) {
      return String(msg || '').trim() || 'The Twilio API could not be reached. Please try again later.';
    }
    if (st === 'AUTHORIZATION_REQUIRED') {
      return 'Apps Script does not have permission to make external API requests. Open the Apps Script editor and run any function to complete the authorization prompt, then use "Re-check Authorization".';
    }
    if (st === 'PHONE_NUMBER_ID_INVALID') {
      return 'The Phone Number ID is not a valid Meta ID. It must be the numeric Phone Number ID from your Meta Business app (e.g. 106540352242922), not the phone number itself.';
    }
    if (st === 'BUSINESS_ACCOUNT_ID_INVALID') {
      return 'The Business Account ID is not a valid Meta ID. It must be the numeric WhatsApp Business Account ID (e.g. 375420581369195).';
    }
    if (st === 'TOKEN_MISSING') {
      return 'The API token is missing. Add your API token in the API Configuration section and save before sending.';
    }
    if (st === 'CONFIGURATION_REQUIRED') {
      return msg || 'The WhatsApp provider configuration is incomplete.';
    }
    if (st === 'PHONE_INVALID') {
      return 'The test phone number is invalid. Enter a valid number with at least 10 digits, e.g. 3333655467 for Pakistan.';
    }
    if (st === 'WHATSAPP_DISABLED') {
      return 'WhatsApp is disabled. Enable it in the integration status before sending a test message.';
    }
    return String(msg || '').trim() || 'The WhatsApp API could not be reached. Please try again later.';
  }

  var WA_SCRIPT_ID = '11sM4FFLZXVR5-P_tsK61yf8xbX81wTwbfdzTUK_OKfTrTmqnuOrTfyTo';

  function waAuthUrl() {
    return 'https://script.google.com/home/projects/' + WA_SCRIPT_ID + '/edit';
  }

  function waRenderAuthBlocked(raw) {
    waShowTestAlert('auth', {
      title: 'Connection authorization required',
      message: 'WhatsApp API is configured, but Apps Script does not have permission to make external API requests yet.',
      sub: 'Open the Apps Script editor, run any function to complete the authorization prompt (granting the script.external_request permission), then re-check authorization. The first production test will not be sent until authorization is confirmed.',
      raw: raw
    });
  }

  function authorizeConnection() {
    waAuthBlocked = true;
    waRenderAuthBlocked('');
  }

  function recheckAuth() {
    var authBtn = getEl('waRecheckAuthBtn');
    if (authBtn) { authBtn.disabled = true; authBtn.innerHTML = ICON.refresh + ' Checking...'; }
    API.post('whatsappAuthProbe', {})
      .then(function(res) {
        if (authBtn) { authBtn.disabled = false; authBtn.innerHTML = ICON.refresh + ' Re-check Authorization'; }
        if (res && res.success) {
          waAuthBlocked = false;
          updateTestBtnState();
          waShowTestAlert('success', { title: 'Authorization confirmed', message: 'Apps Script has permission to make external API requests. You can now send a test message.' });
        } else {
          waAuthBlocked = true;
          waRenderAuthBlocked(waScrubSecrets(res && res.message));
        }
      })
      .catch(function(err) {
        if (authBtn) { authBtn.disabled = false; authBtn.innerHTML = ICON.refresh + ' Re-check Authorization'; }
        waAuthBlocked = true;
        waRenderAuthBlocked(waScrubSecrets((err && err.message) || 'Unknown error'));
      });
  }

  function openAuthPage() {
    var url = waAuthUrl();
    var w = window.open(url, '_blank', 'noopener');
    if (w) w.opener = null;
  }

  function waShowTestAlert(kind, opts) {
    var el = getEl('whatsappTestResult');
    if (!el) return;
    var o = (opts && typeof opts === 'object') ? opts : { message: String(opts || '') };
    var html;
    if (kind === 'success') {
      html =
        '<span class="wa-alert-icon">' + ICON.checkCircle + '</span>' +
        '<div class="wa-alert-content">' +
          (o.title ? '<div class="wa-alert-title">' + esc(o.title) + '</div>' : '') +
          (o.message ? '<div class="wa-alert-msg">' + esc(o.message) + '</div>' : '') +
          (o.meta ? '<div class="wa-alert-meta">' + o.meta + '</div>' : '') +
        '</div>';
    } else if (kind === 'auth') {
      html =
        '<span class="wa-alert-icon">' + ICON.lock + '</span>' +
        '<div class="wa-alert-content">' +
          (o.title ? '<div class="wa-alert-title">' + esc(o.title) + '</div>' : '') +
          (o.message ? '<div class="wa-alert-msg">' + esc(o.message) + '</div>' : '') +
          (o.sub ? '<div class="wa-alert-sub">' + esc(o.sub) + '</div>' : '') +
          '<div class="wa-alert-actions">' +
            '<button type="button" class="btn btn-warning wa-authorize-btn" onclick="WhatsApp.openAuthPage()">' + ICON.doc + ' Open Apps Script Editor</button>' +
            '<button type="button" class="btn btn-secondary wa-authorize-btn" id="waRecheckAuthBtn" onclick="WhatsApp.recheckAuth()">' + ICON.refresh + ' Re-check Authorization</button>' +
          '</div>' +
          (o.raw ? '<details class="wa-alert-details"><summary>Technical details</summary><pre>' + esc(o.raw) + '</pre></details>' : '') +
        '</div>';
    } else {
      html =
        '<span class="wa-alert-icon">' + ICON.alert + '</span>' +
        '<div class="wa-alert-content">' +
          (o.title ? '<div class="wa-alert-title">' + esc(o.title) + '</div>' : '') +
          (o.message ? '<div class="wa-alert-msg">' + esc(o.message) + '</div>' : '') +
          (o.raw ? '<details class="wa-alert-details"><summary>Technical details</summary><pre>' + esc(o.raw) + '</pre></details>' : '') +
        '</div>';
    }
    el.className = 'wa-alert wa-alert-' + kind;
    el.innerHTML = html;
  }

  function renderTemplates(templates) {
    var container = getEl('whatsappTemplatesContainer');
    if (!container) return;
    if (!templates || templates.length === 0) {
      container.innerHTML = '<div class="wa-placeholder">No templates found.</div>';
      return;
    }
    var html = '';
    templates.forEach(function(t, idx) {
      var tid = 'tpl_' + idx;
      html +=
        '<div class="template-item">' +
          '<div class="template-header" onclick="WhatsApp.toggleTemplate(\'' + tid + '\')">' +
            '<span>' + esc(t.TemplateName || '') + ' <span style="font-size:11px;color:var(--text-muted)">(' + esc(t.EventType || '') + ')</span></span>' +
            '<span style="font-size:10px;color:var(--text-muted)">Variables: ' + esc(t.Variables || '') + '</span>' +
          '</div>' +
          '<div id="' + tid + '_body" class="template-body" style="display:' + (idx === 0 ? 'block' : 'none') + '">' +
            '<textarea id="' + tid + '_textarea" onchange="WhatsApp.markDirty(\'' + esc(t.TemplateID) + '\',\'' + tid + '\')">' + esc(t.TemplateBody || '') + '</textarea>' +
            '<div class="template-footer">' +
              '<button class="btn btn-xs btn-primary" id="' + tid + '_savebtn" onclick="WhatsApp.saveTemplate(\'' + esc(t.TemplateID || '') + '\',\'' + tid + '\')" disabled>Save</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function renderStats(stats) {
    stats = stats || {};
    var el = getEl('waStatSent'); if (el) el.textContent = stats.sentToday || 0;
    el = getEl('waStatFailed'); if (el) el.textContent = stats.failedToday || 0;
    el = getEl('waStatPending'); if (el) el.textContent = stats.pendingToday || 0;
  }

  function renderLogs(logs) {
    var tbody = getEl('waLogsBody');
    if (!tbody) return;
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="wa-placeholder">No logs yet.</td></tr>';
      return;
    }
    var html = '';
    logs.forEach(function(log) {
      var statusClass = 'pending';
      if (log.Status === 'Sent') statusClass = 'sent';
      else if (log.Status === 'Failed') statusClass = 'failed';
      html +=
        '<tr>' +
          '<td style="white-space:nowrap">' + esc(String(log.DateTime || '').substring(0, 16)) + '</td>' +
          '<td>' + esc(log.Recipient || '') + '</td>' +
          '<td>' + esc(log.PhoneNumber || '') + '</td>' +
          '<td>' + esc(log.Module || '') + '</td>' +
          '<td>' + esc(log.ReferenceID || '') + '</td>' +
          '<td>' + esc(log.Template || '') + '</td>' +
          '<td><span class="wa-badge ' + statusClass + '">' + esc(log.Status || '') + '</span></td>' +
          '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(log.ErrorMessage || '') + '">' + esc((log.ErrorMessage || '').substring(0, 40)) + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function toggleEnabled() {
    var enabled = getEl('whatsappEnabled').checked;
    API.post('whatsappSaveSettings', { enabled: enabled })
      .then(function(res) {
        if (res && !res.success) Notify.error(res.message || 'Failed to save');
        else {
          if (res && res.settings) waSettings = res.settings;
          Notify.success('WhatsApp ' + (enabled ? 'enabled' : 'disabled'));
          setDisabledBanner();
          renderIntegrationStatus();
        }
      })
      .catch(function() { Notify.error('Failed to save settings'); });
  }

  function waConfigHardErrors() {
    var p = currentProvider();
    var endpoint = getEl('whatsappApiEndpoint') ? getEl('whatsappApiEndpoint').value.trim() : '';
    var phoneId = getEl('whatsappPhoneNumberId') ? getEl('whatsappPhoneNumberId').value.trim() : '';
    var bizId = getEl('whatsappBusinessAccountId') ? getEl('whatsappBusinessAccountId').value.trim() : '';
    if (p === 'meta') {
      if (endpoint && !waEndpointValid(p, endpoint)) return 'API Endpoint must be the Meta Graph API endpoint (graph.facebook.com), not a Twilio endpoint.';
      if (phoneId && !waMetaIdValid(phoneId)) return 'Phone Number ID looks invalid: it must be the numeric Meta ID (e.g. 106540352242922), not the phone number.';
      if (bizId && !waMetaIdValid(bizId)) return 'Business Account ID looks invalid: it must be the numeric WhatsApp Business Account ID (e.g. 375420581369195).';
    } else if (p === 'twilio') {
      if (endpoint && !waEndpointValid(p, endpoint)) return 'API Endpoint must point to api.twilio.com, not the Meta Graph API endpoint (graph.facebook.com).';
      if (bizId && !waTwilioSidValid(bizId)) return 'Account SID looks invalid: it must start with "AC" followed by 32 hex characters, not a Meta Business Account ID.';
      if (phoneId && !waTwilioSenderValid(phoneId)) return 'WhatsApp sender (From) looks invalid: it must be an E.164 number with a leading + (e.g. +14155238886), not a Meta Phone Number ID.';
    } else if (p === 'ultramsg') {
      if (endpoint && !waEndpointValid(p, endpoint)) return 'API URL must point to api.ultramsg.com, not a Meta or Twilio endpoint.';
      var inst = getEl('whatsappInstanceId') ? getEl('whatsappInstanceId').value.trim() : '';
      if (inst && !/^[A-Za-z0-9_-]{1,64}$/.test(inst)) return 'Instance ID looks invalid: it must be the UltraMsg Instance ID (e.g. instance1234), not a phone number or token.';
    }
    return '';
  }

  function saveSettings() {
    var hard = waConfigHardErrors();
    if (hard) {
      Notify.error(hard);
      waShowTestAlert('error', { title: 'Invalid configuration', message: hard });
      return;
    }
    collectSettings(function(data) {
      data.enabled = getEl('whatsappEnabled').checked;
      API.post('whatsappSaveSettings', data)
        .then(function(res) {
          if (res && !res.success) { Notify.error(res.message || 'Failed to save'); return; }
          if (res && res.settings) waSettings = res.settings;
          Notify.success('WhatsApp settings saved'); setDisabledBanner();
        })
        .catch(function() { Notify.error('Failed to save settings'); });
    });
  }

  function collectSettings(callback) {
    var data = {};
    data.companyName = getEl('whatsappCompanyName').value;
    data.defaultCountryCode = getEl('whatsappCountryCode').value;
    data.provider = getEl('whatsappProvider').value;
    data.apiEndpoint = getEl('whatsappApiEndpoint').value;
    data.apiToken = getEl('whatsappApiToken').value;
    data.phoneNumberId = getEl('whatsappPhoneNumberId').value;
    data.businessAccountId = getEl('whatsappBusinessAccountId').value;
    data.testPhone = getEl('whatsappTestPhone').value;
    data.testMessage = getEl('whatsappTestMessage').value;
    var prov = data.provider || 'meta';
    var active = readProviderFields();
    data.meta = prov === 'meta' ? active : (waProviderValues.meta || { apiEndpoint: '', apiToken: '', phoneNumberId: '', businessAccountId: '' });
    data.twilio = prov === 'twilio' ? active : (waProviderValues.twilio || { apiEndpoint: '', apiToken: '', phoneNumberId: '', businessAccountId: '' });
    data.ultramsg = prov === 'ultramsg' ? { apiUrl: active.apiEndpoint, token: active.apiToken, instanceId: active.instanceId } : (waProviderValues.ultramsg || { apiUrl: '', token: '', instanceId: '' });
    callback(data);
  }

  function sendTest() {
    var phone = getEl('whatsappTestPhone');
    var message = getEl('whatsappTestMessage');
    var resultEl = getEl('whatsappTestResult');
    var btn = getEl('whatsappTestBtn');
    if (!phone || !message || !resultEl || !btn) return;

    if (waAuthBlocked) {
      waRenderAuthBlocked();
      return;
    }

    var pv = phone.value.trim();
    var mv = message.value.trim();

    if (!pv) {
      waShowTestAlert('error', { title: 'Phone number required', message: 'Please enter a test phone number.' });
      return;
    }
    if (pv.replace(/[^0-9+]/g, '').length < 10) {
      waShowTestAlert('error', { title: 'Invalid phone number', message: 'Enter a valid number with at least 10 digits, e.g. 3333655467 for Pakistan.' });
      return;
    }
    if (!mv) {
      waShowTestAlert('error', { title: 'Test message required', message: 'Please enter a test message.' });
      return;
    }
    var enabledEl = getEl('whatsappEnabled');
    if (enabledEl && !enabledEl.checked) {
      waShowTestAlert('error', { title: 'WhatsApp is disabled', message: 'Enable WhatsApp in the integration status before sending a test message.' });
      return;
    }
    var issue = configIssue();
    if (issue) {
      waShowTestAlert('error', { title: 'Configuration required', message: waFriendlyError(issue) });
      return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Checking authorization...';
    resultEl.className = 'wa-alert';
    resultEl.innerHTML = '';

    API.post('whatsappAuthProbe', {})
      .then(function(probeRes) {
        if (!probeRes || !probeRes.success) {
          btn.innerHTML = TEST_BTN_HTML;
          btn.disabled = false;
          waAuthBlocked = true;
          waRenderAuthBlocked(waScrubSecrets(probeRes && probeRes.message));
          return;
        }
        waAuthBlocked = false;
        btn.innerHTML = 'Sending...';

        API.post('whatsappTestSend', { testPhone: pv, testMessage: mv })
          .then(function(sendRes) {
            btn.innerHTML = TEST_BTN_HTML;
            if (sendRes && sendRes.success) {
              waAuthBlocked = false;
              btn.disabled = false;
              var meta = (sendRes.logId ? 'Log ID: ' + esc(sendRes.logId) : '');
              if (sendRes.status) meta += (meta ? ' &middot; ' : '') + 'Status: ' + esc(sendRes.status);
              waShowTestAlert('success', { title: 'Test message sent successfully', meta: meta });
            } else {
              var errMsg = waScrubSecrets(sendRes && sendRes.message);
              if (waErrorKind(errMsg) === 'auth') {
                waAuthBlocked = true;
                btn.disabled = true;
                waRenderAuthBlocked(errMsg);
              } else {
                btn.disabled = false;
                waShowTestAlert('error', { title: 'Connection failed', message: waFriendlyError(errMsg), raw: errMsg });
              }
            }
          })
          .catch(function(err) {
            btn.innerHTML = TEST_BTN_HTML;
            var errMsg = waScrubSecrets((err && err.message) || 'Unknown error');
            if (waErrorKind(errMsg) === 'auth') {
              waAuthBlocked = true;
              btn.disabled = true;
              waRenderAuthBlocked(errMsg);
            } else {
              btn.disabled = false;
              waShowTestAlert('error', { title: 'Connection failed', message: waFriendlyError(errMsg), raw: errMsg });
            }
          });
      })
      .catch(function(err) {
        btn.innerHTML = TEST_BTN_HTML;
        btn.disabled = false;
        waAuthBlocked = true;
        waRenderAuthBlocked(waScrubSecrets((err && err.message) || 'Unknown error'));
      });
  }

  function toggleTemplate(tid) {
    var b = getEl(tid + '_body');
    if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
  }

  function markDirty(tplId, tid) {
    waDirtyTemplates[tplId] = tid;
    var btn = getEl(tid + '_savebtn');
    if (btn) btn.disabled = false;
  }

  function saveTemplate(tplId, tid) {
    var textarea = getEl(tid + '_textarea');
    if (!textarea) return;
    var btn = getEl(tid + '_savebtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    API.post('whatsappSaveTemplate', { TemplateID: tplId, TemplateBody: textarea.value })
      .then(function(res) {
        btn.textContent = 'Saved';
        setTimeout(function() { btn.textContent = 'Save'; }, 2000);
        delete waDirtyTemplates[tplId];
        if (res && res.templates) renderTemplates(res.templates);
      })
      .catch(function() {
        btn.textContent = 'Error';
        btn.disabled = false;
      });
  }

  function onProviderChange() {
    var provEl = getEl('whatsappProvider');
    var prov = provEl ? provEl.value : 'meta';
    var from = waActiveProvider;
    if (from && from !== prov && waProviderValues[from]) {
      waProviderValues[from] = readProviderFields();
    }
    waActiveProvider = prov;
    applyProviderFields(prov, waProviderValues[prov] || providerDefaults(prov));

    var isTwilio = prov === 'twilio';
    var isUltra = prov === 'ultramsg';
    var isMeta = !isTwilio && !isUltra;

    var bizLabel = getEl('whatsappBusinessAccountLabel');
    if (bizLabel) bizLabel.textContent = isTwilio ? 'Twilio Account SID' : 'Business Account ID (Meta)';
    var endpointLabel = getEl('whatsappApiEndpointLabel');
    if (endpointLabel) endpointLabel.textContent = isTwilio ? 'API Endpoint (Twilio)' : (isUltra ? 'API URL (UltraMsg)' : 'API Endpoint (Graph API)');
    var helpers = {
      endpoint: getEl('whatsappApiEndpointHelper'),
      token: getEl('whatsappApiTokenHelper'),
      instance: getEl('whatsappInstanceIdHelper'),
      phone: getEl('whatsappPhoneNumberIdHelper'),
      biz: getEl('whatsappBusinessAccountIdHelper')
    };
    var placeholders = {
      endpoint: getEl('whatsappApiEndpoint'),
      token: getEl('whatsappApiToken'),
      instance: getEl('whatsappInstanceId'),
      phone: getEl('whatsappPhoneNumberId'),
      biz: getEl('whatsappBusinessAccountId')
    };
    var fieldEls = {
      instance: getEl('waInstanceField'),
      phone: getEl('waPhoneField'),
      biz: getEl('waBizField')
    };
    if (fieldEls.instance) fieldEls.instance.style.display = isUltra ? 'block' : 'none';
    if (fieldEls.phone) fieldEls.phone.style.display = isUltra ? 'none' : 'block';
    if (fieldEls.biz) fieldEls.biz.style.display = isUltra ? 'none' : 'block';
    if (isUltra) {
      if (helpers.endpoint) helpers.endpoint.textContent = 'UltraMsg API URL (api.ultramsg.com)';
      if (helpers.token) helpers.token.textContent = 'Your UltraMsg Token is stored securely.';
      if (helpers.instance) helpers.instance.textContent = 'UltraMsg Instance ID (from your UltraMsg dashboard)';
      if (placeholders.endpoint) placeholders.endpoint.placeholder = 'https://api.ultramsg.com';
      if (placeholders.token) placeholders.token.placeholder = 'Enter UltraMsg Token';
      if (placeholders.instance) placeholders.instance.placeholder = 'e.g. instance1234';
    } else if (isTwilio) {
      if (helpers.endpoint) helpers.endpoint.textContent = 'Twilio API endpoint URL (api.twilio.com)';
      if (helpers.token) helpers.token.textContent = 'Your Twilio Auth Token is stored securely.';
      if (helpers.phone) helpers.phone.textContent = 'Twilio WhatsApp sender number (From), E.164 format with +';
      if (helpers.biz) helpers.biz.textContent = 'Your Twilio Account SID (AC followed by 32 hex chars)';
      if (placeholders.endpoint) placeholders.endpoint.placeholder = 'https://api.twilio.com/2010-04-01';
      if (placeholders.token) placeholders.token.placeholder = 'Enter Twilio Auth Token';
      if (placeholders.phone) placeholders.phone.placeholder = 'e.g. +14155238886';
      if (placeholders.biz) placeholders.biz.placeholder = 'e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    } else {
      if (helpers.endpoint) helpers.endpoint.textContent = 'Meta Graph API endpoint URL';
      if (helpers.token) helpers.token.textContent = 'Your Meta Access Token is stored securely.';
      if (helpers.phone) helpers.phone.textContent = 'WhatsApp Business Phone Number ID (numeric, e.g. 106540352242922)';
      if (helpers.biz) helpers.biz.textContent = 'WhatsApp Business Account ID (numeric, e.g. 375420581369195)';
      if (placeholders.endpoint) placeholders.endpoint.placeholder = 'https://graph.facebook.com/v18.0';
      if (placeholders.token) placeholders.token.placeholder = 'Enter Meta Access Token';
      if (placeholders.phone) placeholders.phone.placeholder = 'Numeric Phone Number ID';
      if (placeholders.biz) placeholders.biz.placeholder = 'Numeric Business Account ID';
    }
    var docsBtn = getEl('waDocsBtn');
    if (docsBtn) {
      docsBtn.innerHTML = ICON.doc + (isTwilio ? 'Twilio API Documentation' : (isUltra ? 'UltraMsg API Documentation' : 'Meta API Documentation'));
    }
    var hint = getEl('whatsappTestHint');
    if (hint) {
      hint.innerHTML = ICON.help + (isTwilio
        ? 'Local numbers are normalized with the selected country code (e.g. +92 for Pakistan). Twilio numbers must be E.164 (e.g. +14155238886).'
        : 'Local numbers are normalized with the selected country code (e.g. +92 for Pakistan).');
    }
    var helpList = getEl('waHelpList');
    if (helpList) {
      var items = isTwilio
        ? [
            'Your Twilio Account SID and Auth Token must come from your Twilio Console',
            'The From sender must be a WhatsApp-enabled Twilio number in E.164 format (e.g. +14155238886)',
            'The API Endpoint must point to api.twilio.com (2010-04-01)',
            'The test number must be a valid WhatsApp recipient',
            'WhatsApp notifications must be enabled'
          ]
        : (isUltra
          ? [
              'Your UltraMsg Instance ID and Token come from your UltraMsg dashboard',
              'The API URL must point to api.ultramsg.com',
              'The test number must be a valid WhatsApp recipient',
              'WhatsApp notifications must be enabled'
            ]
          : [
              'Your Access Token must be valid and have the correct permissions',
              'Phone Number ID must be correct',
              'Business Account ID must be correct',
              'Test number must be a valid WhatsApp Business recipient',
              'WhatsApp notifications must be enabled'
            ]);
      helpList.innerHTML = items.map(function(t) { return '<li>' + ICON.check + esc(t) + '</li>'; }).join('');
    }
    renderIntegrationStatus();
    updateTestBtnState();
  }

  function toggleTokenVisibility() {
    var el = getEl('whatsappApiToken');
    if (!el) return;
    var show = el.type === 'password';
    el.type = show ? 'text' : 'password';
    var btn = getEl('whatsappTokenEye');
    if (btn) btn.innerHTML = show ? ICON.eyeOff : ICON.eye;
  }

  function docsUrl() {
    var p = currentProvider();
    if (p === 'twilio') return 'https://www.twilio.com/docs/whatsapp';
    if (p === 'ultramsg') return 'https://docs.ultramsg.com';
    return 'https://developers.facebook.com/docs/whatsapp/cloud-api';
  }

  function openDocs() {
    var w = window.open(docsUrl(), '_blank', 'noopener');
    if (w) w.opener = null;
  }

  function testConnection() {
    if (currentProvider() !== 'ultramsg') { sendTest(); return; }
    var btn = getEl('whatsappTestConnBtn');
    var resultEl = getEl('whatsappTestResult');
    if (!resultEl) return;
    var issue = configIssue();
    if (issue) {
      waShowTestAlert('error', { title: 'Configuration required', message: waFriendlyError(issue) });
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Testing...'; }
    resultEl.className = 'wa-alert';
    resultEl.innerHTML = '';
    API.post('whatsappConnectionTest', {})
      .then(function(res) {
        if (btn) { btn.disabled = false; btn.textContent = 'Test Connection'; }
        if (res && res.success && res.status === 'CONNECTED') {
          waShowTestAlert('success', { title: 'Connection OK', message: res.message || 'UltraMsg connection verified.', meta: 'Status: CONNECTED' });
        } else {
          waShowTestAlert('error', { title: 'Connection failed', message: (res && res.message) || 'UltraMsg connection could not be verified.', meta: res && res.status ? 'Status: ' + res.status : '', raw: res && res.message });
        }
      })
      .catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Test Connection'; }
        waShowTestAlert('error', { title: 'Connection failed', message: waScrubSecrets((err && err.message) || 'Unknown error') });
      });
  }

  function syncCountry(from) {
    var src = getEl(from);
    if (!src) return;
    var other = getEl(from === 'whatsappCountryCode' ? 'whatsappTestCountry' : 'whatsappCountryCode');
    if (other) other.value = src.value;
  }

  return {
    show: function(el) { renderPage(el); },
    toggleEnabled: toggleEnabled,
    saveSettings: saveSettings,
    sendTest: sendTest,
    authorizeConnection: authorizeConnection,
    recheckAuth: recheckAuth,
    openAuthPage: openAuthPage,
    toggleTemplate: toggleTemplate,
    markDirty: markDirty,
    saveTemplate: saveTemplate,
    onProviderChange: onProviderChange,
    toggleTokenVisibility: toggleTokenVisibility,
    resetForm: resetForm,
    openDocs: openDocs,
    syncCountry: syncCountry,
    updateTestBtnState: updateTestBtnState,
    testConnection: testConnection
  };
})();
