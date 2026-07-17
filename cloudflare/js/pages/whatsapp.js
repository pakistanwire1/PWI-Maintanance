/* ============================================================
   whatsapp.js — WhatsApp Settings Page Module
   Cloudflare Pages Frontend (GAS-identical: WhatsAppPage.html)
   ============================================================ */
(function() {
  var _settings = {};
  var _templates = [];
  var _logs = [];
  var _stats = {};

  App.registerPage('whatsapp', render, load);

  function render() {
    document.getElementById('page-whatsapp').innerHTML = '' +
      '<div class="page-header"><h2>WhatsApp Notification Settings</h2></div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="WATab(this,\'settings\')">Settings</button>' +
        '<button class="tab" onclick="WATab(this,\'test\')">Test Send</button>' +
        '<button class="tab" onclick="WATab(this,\'templates\')">Templates</button>' +
        '<button class="tab" onclick="WATab(this,\'logs\')">Logs</button>' +
      '</div>' +
      '<div id="wa-content"></div>';
  }

  function load() { loadSettings(); }

  function loadSettings() {
    var el = document.getElementById('wa-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('whatsappGetSettings')
      .then(function(data) {
        _settings = data || {};
        var h = '<div class="card" style="padding:24px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0">WhatsApp Configuration</h3></div>' +
          '<div class="grid grid-2" style="gap:16px">' +
            fg('Enabled', 'wa-enabled', _settings.enabled === true || _settings.enabled === 'true' ? 'true' : 'false', 'select', ['true', 'false']) +
            fg('Company Name', 'wa-company', _settings.companyName || '') +
            fg('Default Country Code', 'wa-code', _settings.defaultCountryCode || '+92') +
            fg('Provider', 'wa-provider', _settings.provider || 'meta', 'select', ['meta', 'twilio', 'other']) +
            fg('API Endpoint', 'wa-endpoint', _settings.apiEndpoint || '') +
            fg('API Token', 'wa-token', _settings.apiToken || '', 'password') +
            fg('Phone Number ID', 'wa-phoneid', _settings.phoneNumberId || '') +
            fg('Business Account ID', 'wa-bizid', _settings.businessAccountId || '') +
          '</div>' +
          '<div style="margin-top:16px"><button class="btn btn-primary" onclick="WASaveSettings()">Save Settings</button></div>' +
          '</div>';
        el.innerHTML = h;
      })
      .catch(function(e) { el.innerHTML = '<div class="card" style="padding:24px"><p style="color:var(--danger)">' + App.escHtml(e.message) + '</p></div>'; });
  }

  function loadTestSend() {
    var el = document.getElementById('wa-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px">' +
      '<h3 style="margin-bottom:20px">Test WhatsApp Message</h3>' +
      '<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Send a test message to verify your WhatsApp configuration is working correctly.</p>' +
      '<div class="grid grid-2" style="gap:16px;max-width:600px">' +
        fg('Phone Number', 'wa-test-phone', '', 'tel') +
        '<div class="form-group"><label class="form-label">Country Code</label><input class="form-input" id="wa-test-code" value="' + App.escHtml(_settings.defaultCountryCode || '+92') + '"></div>' +
      '</div>' +
      '<div class="form-group" style="max-width:600px;margin-top:12px">' +
        '<label class="form-label">Message</label>' +
        '<textarea class="form-textarea" id="wa-test-message" rows="4" placeholder="Enter test message...">Hello! This is a test message from CMMS WhatsApp Notification System.</textarea>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:8px">' +
        '<button class="btn btn-primary" onclick="WASendTest()">Send Test Message</button>' +
      '</div>' +
      '<div id="wa-test-result" style="margin-top:12px;display:none"></div>' +
      '</div>';
  }

  function loadTemplates() {
    var el = document.getElementById('wa-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('whatsappGetTemplates')
      .then(function(data) {
        _templates = data || [];
        if (!_templates.length) { el.innerHTML = '<div class="card"><div class="empty-state"><div class="empty-state-text">No templates configured. Templates are created automatically on first use.</div></div></div>'; return; }
        var h = '<div class="card" style="padding:24px"><h3 style="margin-bottom:16px">Message Templates</h3>';
        _templates.forEach(function(t) {
          var name = t.TemplateName || t.Name || '';
          var body = t.TemplateBody || t.Body || '';
          var eventType = t.EventType || t.Type || '';
          var tplId = t.TemplateID || t.id || '';
          h += '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<strong>' + App.escHtml(name) + '</strong>' +
              '<span class="badge badge-primary">' + App.escHtml(eventType) + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Available variables: ' + extractVariables(body) + '</div>' +
            '<textarea class="form-textarea" id="wa-tpl-' + App.escHtml(tplId) + '" rows="4">' + App.escHtml(body) + '</textarea>' +
            '<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="WASaveTemplate(\'' + App.escHtml(tplId) + '\')">Save Template</button>' +
          '</div>';
        });
        el.innerHTML = h + '</div>';
      })
      .catch(function(e) { el.innerHTML = '<div class="card" style="padding:24px"><p style="color:var(--danger)">' + App.escHtml(e.message) + '</p></div>'; });
  }

  function loadLogs() {
    var el = document.getElementById('wa-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';

    var loadStatsAndLogs = function() {
      API.call('whatsappGetPanelData')
        .then(function(data) { _stats = data || {}; updateWALogStats(); })
        .catch(function() {});
      API.call('whatsappGetLogs', {})
        .then(function(data) {
          _logs = data || [];
          renderWALogs();
        })
        .catch(function(e) { el.innerHTML = '<div class="card" style="padding:24px"><p style="color:var(--danger)">' + App.escHtml(e.message) + '</p></div>'; });
    };

    el.innerHTML = '<div class="card" style="padding:24px">' +
      '<h3 style="margin-bottom:16px">WhatsApp Logs</h3>' +
      '<div style="display:flex;gap:16px;margin-bottom:16px">' +
        '<div class="stat-card stat-primary" style="cursor:default;min-width:100px"><div class="stat-inner"><div class="stat-info"><h3 id="waStatSent">-</h3><p>Sent Today</p></div></div></div>' +
        '<div class="stat-card stat-danger" style="cursor:default;min-width:100px"><div class="stat-inner"><div class="stat-info"><h3 id="waStatFailed">-</h3><p>Failed Today</p></div></div></div>' +
        '<div class="stat-card stat-warning" style="cursor:default;min-width:100px"><div class="stat-inner"><div class="stat-info"><h3 id="waStatPending">-</h3><p>Pending</p></div></div></div>' +
      '</div>' +
      '<div id="waLogsTable"><div class="spinner" style="margin:20px auto"></div></div>' +
      '</div>';
    loadStatsAndLogs();
  }

  function updateWALogStats() {
    var el;
    el = document.getElementById('waStatSent'); if (el) el.textContent = _stats.sentToday || 0;
    el = document.getElementById('waStatFailed'); if (el) el.textContent = _stats.failedToday || 0;
    el = document.getElementById('waStatPending'); if (el) el.textContent = _stats.pendingToday || 0;
  }

  function renderWALogs() {
    var wrap = document.getElementById('waLogsTable');
    if (!wrap) return;
    if (!_logs.length) { wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">No WhatsApp logs found</div>'; return; }
    var h = '<div class="table-container"><table><thead><tr>' +
      '<th>ID</th><th>Date/Time</th><th>Recipient</th><th>Phone</th><th>Module</th><th>Template</th><th>Reference</th><th>Status</th><th>Error</th>' +
      '</tr></thead><tbody>';
    var count = Math.min(_logs.length, 100);
    for (var i = 0; i < count; i++) {
      var l = _logs[i];
      var sc = (l.Status || '').toLowerCase() === 'sent' ? 'badge-success' : ((l.Status || '').toLowerCase() === 'failed' ? 'badge-danger' : 'badge-warning');
      h += '<tr>' +
        '<td style="font-family:monospace;font-size:10px">' + App.escHtml(l.WhatsAppID || l.LogID || '') + '</td>' +
        '<td style="white-space:nowrap">' + App.escHtml(l.DateTime || '') + '</td>' +
        '<td>' + App.escHtml(l.Recipient || '') + '</td>' +
        '<td>' + App.escHtml(l.PhoneNumber || l.Phone || '') + '</td>' +
        '<td>' + App.escHtml(l.Module || '') + '</td>' +
        '<td>' + App.escHtml(l.Template || '') + '</td>' +
        '<td>' + App.escHtml(l.Reference || '') + '</td>' +
        '<td><span class="badge ' + sc + '">' + App.escHtml(l.Status || '') + '</span></td>' +
        '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--danger)" title="' + App.escHtml(l.ErrorMessage || '') + '">' + App.escHtml(l.ErrorMessage || '') + '</td>' +
        '</tr>';
    }
    if (_logs.length > 100) {
      h += '<tr><td colspan="9" style="padding:8px;text-align:center;color:var(--text-muted);font-size:11px">Showing 100 of ' + _logs.length + ' logs</td></tr>';
    }
    wrap.innerHTML = h + '</tbody></table></div>';
  }

  function extractVariables(body) {
    if (!body) return 'None';
    var matches = body.match(/\{\{(\w+)\}\}/g);
    if (!matches) return 'None';
    var unique = matches.filter(function(v, i, arr) { return arr.indexOf(v) === i; });
    return unique.join(', ');
  }

  function fg(label, id, value, type, opts) {
    if (type === 'select') {
      var optsArr = opts || [];
      var h = '<div class="form-group"><label class="form-label">' + label + '</label><select class="form-select" id="' + id + '">';
      optsArr.forEach(function(o) { h += '<option value="' + o + '"' + (value === o ? ' selected' : '') + '>' + o + '</option>'; });
      return h + '</select></div>';
    }
    if (type === 'password') {
      return '<div class="form-group"><label class="form-label">' + label + '</label><div style="display:flex;gap:6px"><input class="form-input" id="' + id + '" value="' + App.escHtml(value || '') + '" type="password" style="flex:1"><button class="btn btn-sm btn-secondary" onclick="WATogglePass(\'' + id + '\')" style="flex-shrink:0">Show</button></div></div>';
    }
    return '<div class="form-group"><label class="form-label">' + label + '</label><input class="form-input" id="' + id + '" value="' + App.escHtml(value || '') + '"' + (type ? ' type="' + type + '"' : '') + '></div>';
  }

  window.WATab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    if (tab === 'settings') loadSettings();
    else if (tab === 'test') loadTestSend();
    else if (tab === 'templates') loadTemplates();
    else loadLogs();
  };

  window.WASaveSettings = function() {
    var d = {
      enabled: document.getElementById('wa-enabled').value === 'true',
      companyName: document.getElementById('wa-company').value,
      defaultCountryCode: document.getElementById('wa-code').value,
      provider: document.getElementById('wa-provider').value,
      apiEndpoint: document.getElementById('wa-endpoint').value,
      apiToken: document.getElementById('wa-token').value,
      phoneNumberId: document.getElementById('wa-phoneid').value,
      businessAccountId: document.getElementById('wa-bizid').value
    };
    API.call('whatsappSaveSettings', d)
      .then(function() { App.showToast('Settings saved successfully', 'success'); })
      .catch(function(e) { App.showToast('Error: ' + e.message, 'error'); });
  };

  window.WASendTest = function() {
    var phone = (document.getElementById('wa-test-code').value || '') + (document.getElementById('wa-test-phone').value || '');
    var message = document.getElementById('wa-test-message').value;
    if (!phone || phone.length < 5) { App.showToast('Please enter a valid phone number', 'warning'); return; }
    if (!message) { App.showToast('Please enter a message', 'warning'); return; }
    var resultDiv = document.getElementById('wa-test-result');
    if (resultDiv) { resultDiv.style.display = 'block'; resultDiv.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Sending...</div>'; }
    API.call('whatsappTestSend', { phone: phone, message: message })
      .then(function(result) {
        if (resultDiv) {
          if (result && result.success) {
            resultDiv.innerHTML = '<div style="color:var(--success);font-size:13px">Message sent successfully!</div>';
          } else {
            resultDiv.innerHTML = '<div style="color:var(--danger);font-size:13px">Failed: ' + App.escHtml((result && result.message) || 'Unknown error') + '</div>';
          }
        }
      })
      .catch(function(e) {
        if (resultDiv) resultDiv.innerHTML = '<div style="color:var(--danger);font-size:13px">Error: ' + App.escHtml(e.message) + '</div>';
      });
  };

  window.WASaveTemplate = function(id) {
    var body = document.getElementById('wa-tpl-' + id);
    if (!body) return;
    API.call('whatsappSaveTemplate', { TemplateID: id, TemplateBody: body.value })
      .then(function() { App.showToast('Template saved', 'success'); })
      .catch(function(e) { App.showToast('Error: ' + e.message, 'error'); });
  };

  window.WATogglePass = function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  };
})();
