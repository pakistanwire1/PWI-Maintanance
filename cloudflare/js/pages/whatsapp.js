/* ============================================================
   whatsapp.js — WhatsApp Settings Page Module
   GAS-identical: WhatsAppPage.html
   Single-page card layout: Settings, Test, Templates, Logs.
   Loads all data via whatsappGetSettingsData() in one call.
   ============================================================ */
(function() {
  var _data = {};

  App.registerPage('whatsapp', render, load);

  function render() {
    var el = document.getElementById('page-whatsapp');
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;vertical-align:middle;margin-right:8px"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>' +
            'WhatsApp Notification Settings' +
          '</div>' +
          '<div class="card-actions">' +
            '<label class="toggle-switch" style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:12px;color:var(--text-muted)">Enable WhatsApp</span>' +
              '<input type="checkbox" id="whatsappEnabled" onchange="toggleWhatsApp()">' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="whatsapp-grid">' +
            '<div class="form-group"><label>Company Name</label><input type="text" id="whatsappCompanyName" class="form-input" placeholder="PWI CMMS"></div>' +
            '<div class="form-group"><label>Default Country Code</label><input type="text" id="whatsappCountryCode" class="form-input" placeholder="91" maxlength="5"></div>' +
            '<div class="form-group"><label>Provider</label><select id="whatsappProvider" class="form-input" onchange="onWhatsAppProviderChange()"><option value="meta">Meta WhatsApp Cloud API</option><option value="twilio">Twilio WhatsApp</option></select></div>' +
            '<div class="form-group" style="grid-column:1/-1"><label>API Endpoint</label><input type="text" id="whatsappApiEndpoint" class="form-input" placeholder="https://graph.facebook.com/v18.0"></div>' +
            '<div class="form-group" style="grid-column:1/-1"><label>API Token</label><input type="password" id="whatsappApiToken" class="form-input" placeholder="Enter API token"><button class="btn btn-xs btn-secondary" onclick="toggleFieldVisibility(\'whatsappApiToken\')" style="margin-top:4px">Show / Hide</button></div>' +
            '<div class="form-group"><label>Phone Number ID</label><input type="text" id="whatsappPhoneNumberId" class="form-input" placeholder="Phone number ID"></div>' +
            '<div class="form-group"><label>Business Account ID</label><input type="text" id="whatsappBusinessAccountId" class="form-input" placeholder="Business account ID"></div>' +
          '</div>' +
          '<div style="margin-top:12px"><button class="btn btn-primary" onclick="saveWhatsAppSettings()">Save Settings</button></div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            'Test Message' +
          '</div>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="form-row" style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">' +
            '<div class="form-group" style="flex:1;min-width:200px"><label>Test Phone Number</label><input type="text" id="whatsappTestPhone" class="form-input" placeholder="9876543210"></div>' +
            '<div class="form-group" style="flex:2;min-width:300px"><label>Test Message</label><input type="text" id="whatsappTestMessage" class="form-input" placeholder="Test message from CMMS"></div>' +
            '<button class="btn btn-primary" onclick="whatsappSendTest()" id="whatsappTestBtn" style="height:36px">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:4px"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> Send Test' +
            '</button>' +
          '</div>' +
          '<div id="whatsappTestResult" style="margin-top:8px;font-size:12px"></div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            'Message Templates' +
          '</div>' +
          '<div class="card-actions"><span style="font-size:11px;color:var(--text-muted)">Edit template content below</span></div>' +
        '</div>' +
        '<div class="card-body" id="whatsappTemplatesContainer">' +
          '<div class="wa-templates-loading" style="text-align:center;padding:20px;color:var(--text-muted)">Loading templates...</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>' +
            'Message Logs' +
          '</div>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="wa-legend" style="display:flex;gap:16px;margin-bottom:12px">' +
            '<span style="font-size:12px"><span class="status-dot" style="background:var(--success)"></span> Sent Today: <strong id="waStatSent">0</strong></span>' +
            '<span style="font-size:12px"><span class="status-dot" style="background:var(--danger)"></span> Failed Today: <strong id="waStatFailed">0</strong></span>' +
            '<span style="font-size:12px"><span class="status-dot" style="background:var(--warning)"></span> Pending: <strong id="waStatPending">0</strong></span>' +
          '</div>' +
          '<div class="table-responsive">' +
            '<table class="table" id="waLogsTable"><thead><tr>' +
              '<th>DateTime</th><th>Recipient</th><th>Phone</th><th>Module</th><th>Reference</th><th>Template</th><th>Status</th><th>Error</th>' +
            '</tr></thead><tbody id="waLogsBody"><tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<style>' +
        '#page-whatsapp .whatsapp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
        '#page-whatsapp .form-group{display:flex;flex-direction:column;gap:4px}' +
        '#page-whatsapp .form-group label{font-size:12px;font-weight:500;color:var(--text-muted)}' +
        '#page-whatsapp .form-input{padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary);color:var(--text);font-size:13px;outline:none;transition:var(--transition)}' +
        '#page-whatsapp .form-input:focus{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-light)}' +
        '#page-whatsapp .toggle-switch{cursor:pointer}' +
        '#page-whatsapp .toggle-switch input{display:none}' +
        '#page-whatsapp .toggle-slider{width:36px;height:20px;background:var(--border);border-radius:10px;position:relative;transition:var(--transition)}' +
        '#page-whatsapp .toggle-slider::after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;transition:var(--transition)}' +
        '#page-whatsapp .toggle-switch input:checked+.toggle-slider{background:var(--primary)}' +
        '#page-whatsapp .toggle-switch input:checked+.toggle-slider::after{left:18px}' +
        '#page-whatsapp .template-item{border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;overflow:hidden}' +
        '#page-whatsapp .template-header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-tertiary);cursor:pointer;font-size:13px;font-weight:500}' +
        '#page-whatsapp .template-body textarea{width:100%;min-height:80px;border:none;border-top:1px solid var(--border);padding:10px;font-family:monospace;font-size:12px;resize:vertical;background:var(--bg-secondary);color:var(--text);outline:none}' +
        '#page-whatsapp .template-footer{display:flex;justify-content:flex-end;gap:8px;padding:6px 10px;background:var(--bg-tertiary);border-top:1px solid var(--border)}' +
        '#page-whatsapp .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}' +
        '#page-whatsapp .table{width:100%;border-collapse:collapse;font-size:12px}' +
        '#page-whatsapp .table th{text-align:left;padding:8px 10px;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-muted);white-space:nowrap}' +
        '#page-whatsapp .table td{padding:6px 10px;border-bottom:1px solid var(--border)}' +
        '#page-whatsapp .table tr:hover td{background:var(--bg-tertiary)}' +
        '#page-whatsapp .wa-badge{display:inline-flex;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}' +
        '#page-whatsapp .wa-badge.sent{background:rgba(34,197,94,0.15);color:var(--success)}' +
        '#page-whatsapp .wa-badge.failed{background:rgba(239,68,68,0.15);color:var(--danger)}' +
        '#page-whatsapp .wa-badge.pending{background:rgba(245,158,11,0.15);color:var(--warning)}' +
        '@media(max-width:768px){#page-whatsapp .whatsapp-grid{grid-template-columns:1fr}}' +
      '</style>';
  }

  function load() {
    App.showLoading(true);
    API.call('whatsappGetSettingsData')
      .then(function(data) {
        _data = data || {};
        App.showLoading(false);
        renderWhatsAppSettings(_data);
        renderWhatsAppTemplates(_data.templates);
        renderWhatsAppLogs(_data.logs, _data.stats);
      })
      .catch(function(e) {
        App.showLoading(false);
        App.showToast('Failed to load WhatsApp data: ' + e.message, 'error');
      });
  }

  function renderWhatsAppSettings(data) {
    var s = data.settings || {};
    var el;
    el = document.getElementById('whatsappEnabled'); if (el) el.checked = !!s.enabled;
    el = document.getElementById('whatsappCompanyName'); if (el) el.value = s.companyName || '';
    el = document.getElementById('whatsappCountryCode'); if (el) el.value = s.defaultCountryCode || '';
    el = document.getElementById('whatsappProvider'); if (el) el.value = s.provider || 'meta';
    el = document.getElementById('whatsappApiEndpoint'); if (el) el.value = s.apiEndpoint || '';
    el = document.getElementById('whatsappApiToken'); if (el) el.value = s.apiToken || '';
    el = document.getElementById('whatsappPhoneNumberId'); if (el) el.value = s.phoneNumberId || '';
    el = document.getElementById('whatsappBusinessAccountId'); if (el) el.value = s.businessAccountId || '';
    el = document.getElementById('whatsappTestPhone'); if (el) el.value = s.testPhone || '';
    el = document.getElementById('whatsappTestMessage'); if (el) el.value = s.testMessage || '';
    el = document.getElementById('whatsappTestResult'); if (el) el.textContent = '';
  }

  function renderWhatsAppTemplates(templates) {
    var container = document.getElementById('whatsappTemplatesContainer');
    if (!container) return;
    if (!templates || templates.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No templates found.</div>';
      return;
    }
    var html = '';
    templates.forEach(function(t, idx) {
      var tid = 'tpl_' + idx;
      html +=
        '<div class="template-item">' +
          '<div class="template-header" onclick="var b=document.getElementById(\'' + tid + '_body\');if(b)b.style.display=b.style.display===\'none\'?\'block\':\'none\'">' +
            '<span>' + escapeHtml(t.TemplateName || '') + ' <span style="font-size:11px;color:var(--text-muted)">(' + escapeHtml(t.EventType || '') + ')</span></span>' +
            '<span style="font-size:10px;color:var(--text-muted)">Variables: ' + escapeHtml(t.Variables || '') + '</span>' +
          '</div>' +
          '<div id="' + tid + '_body" class="template-body" style="display:' + (idx === 0 ? 'block' : 'none') + '">' +
            '<textarea id="' + tid + '_textarea" onchange="waMarkTemplateDirty(\'' + t.TemplateID + '\',\'' + tid + '\')">' + escapeHtml(t.TemplateBody || '') + '</textarea>' +
            '<div class="template-footer">' +
              '<button class="btn btn-xs btn-primary" id="' + tid + '_savebtn" onclick="waSaveTemplate(\'' + escapeHtml(t.TemplateID || '') + '\',\'' + tid + '\')" disabled>Save</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function renderWhatsAppLogs(logs, stats) {
    var el;
    if (stats) {
      el = document.getElementById('waStatSent'); if (el) el.textContent = stats.sentToday || '0';
      el = document.getElementById('waStatFailed'); if (el) el.textContent = stats.failedToday || '0';
      el = document.getElementById('waStatPending'); if (el) el.textContent = stats.pendingToday || '0';
    }
    var tbody = document.getElementById('waLogsBody');
    if (!tbody) return;
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No logs yet.</td></tr>';
      return;
    }
    var html = '';
    logs.forEach(function(log) {
      var statusClass = 'pending';
      if (log.Status === 'Sent') statusClass = 'sent';
      else if (log.Status === 'Failed') statusClass = 'failed';
      html +=
        '<tr>' +
          '<td style="white-space:nowrap">' + escapeHtml(String(log.DateTime || '').substring(0, 16)) + '</td>' +
          '<td>' + escapeHtml(log.Recipient || '') + '</td>' +
          '<td>' + escapeHtml(log.PhoneNumber || '') + '</td>' +
          '<td>' + escapeHtml(log.Module || '') + '</td>' +
          '<td>' + escapeHtml(log.ReferenceID || '') + '</td>' +
          '<td>' + escapeHtml(log.Template || '') + '</td>' +
          '<td><span class="wa-badge ' + statusClass + '">' + escapeHtml(log.Status || '') + '</span></td>' +
          '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(log.ErrorMessage || '') + '">' + escapeHtml((log.ErrorMessage || '').substring(0, 40)) + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function collectWhatsAppSettings() {
    var data = {};
    data.email = currentUser && currentUser.email || '';
    data.enabled = document.getElementById('whatsappEnabled').checked;
    data.companyName = document.getElementById('whatsappCompanyName').value;
    data.defaultCountryCode = document.getElementById('whatsappCountryCode').value;
    data.provider = document.getElementById('whatsappProvider').value;
    data.apiEndpoint = document.getElementById('whatsappApiEndpoint').value;
    data.apiToken = document.getElementById('whatsappApiToken').value;
    data.phoneNumberId = document.getElementById('whatsappPhoneNumberId').value;
    data.businessAccountId = document.getElementById('whatsappBusinessAccountId').value;
    data.testPhone = document.getElementById('whatsappTestPhone').value;
    data.testMessage = document.getElementById('whatsappTestMessage').value;
    return data;
  }

  window.toggleWhatsApp = function() {
    var data = collectWhatsAppSettings();
    API.call('whatsappSaveSettings', data)
      .then(function(res) {
        if (res && !res.success) { App.showToast(res.message || 'Failed to save', 'error'); return; }
        App.showToast('WhatsApp ' + (data.enabled ? 'enabled' : 'disabled'), 'success');
      })
      .catch(function() { App.showToast('Failed to save settings', 'error'); });
  };

  window.saveWhatsAppSettings = function() {
    var data = collectWhatsAppSettings();
    API.call('whatsappSaveSettings', data)
      .then(function(res) {
        if (res && !res.success) { App.showToast(res.message || 'Failed to save', 'error'); return; }
        App.showToast('WhatsApp settings saved', 'success');
      })
      .catch(function() { App.showToast('Failed to save settings', 'error'); });
  };

  window.whatsappSendTest = function() {
    var phone = document.getElementById('whatsappTestPhone').value.trim();
    var resultEl = document.getElementById('whatsappTestResult');
    var btn = document.getElementById('whatsappTestBtn');
    if (!resultEl || !btn) return;
    if (!phone) {
      resultEl.innerHTML = '<span style="color:var(--danger)">&#10007; Please enter a test phone number.</span>';
      return;
    }
    if (phone.replace(/[^0-9]/g, '').length < 10 && !phone.startsWith('+')) {
      resultEl.innerHTML = '<span style="color:var(--danger)">&#10007; Please enter a valid phone number (at least 10 digits). Include country code if using international format.</span>';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Saving settings...';
    resultEl.textContent = '';
    var data = collectWhatsAppSettings();
    API.call('whatsappSaveSettings', data)
      .then(function(res) {
        if (res && !res.success) {
          btn.disabled = false;
          btn.textContent = 'Send Test';
          resultEl.innerHTML = '<span style="color:var(--danger)">&#10007; Failed to save settings: ' + escapeHtml(res.message || 'Unknown error') + '</span>';
          return;
        }
        btn.textContent = 'Sending...';
        API.call('whatsappTestSend')
          .then(function(sendRes) {
            btn.disabled = false;
            btn.textContent = 'Send Test';
            if (sendRes && sendRes.success) {
              resultEl.innerHTML = '<span style="color:var(--success)">&#10003; Test message sent successfully!</span>';
            } else {
              resultEl.innerHTML = '<span style="color:var(--danger)">&#10007; Failed: ' + escapeHtml((sendRes && sendRes.message) || 'Unknown error') + '</span>';
            }
          })
          .catch(function(err) {
            btn.disabled = false;
            btn.textContent = 'Send Test';
            resultEl.innerHTML = '<span style="color:var(--danger)">&#10007; Error: ' + escapeHtml(err.message) + '</span>';
          });
      })
      .catch(function(err) {
        btn.disabled = false;
        btn.textContent = 'Send Test';
        resultEl.innerHTML = '<span style="color:var(--danger)">&#10007; Error: ' + escapeHtml(err.message) + '</span>';
      });
  };

  window.onWhatsAppProviderChange = function() {
    var prov = document.getElementById('whatsappProvider').value;
    var endpoint = document.getElementById('whatsappApiEndpoint');
    if (!endpoint) return;
    if (prov === 'meta' && !endpoint.value) endpoint.value = 'https://graph.facebook.com/v18.0';
    else if (prov === 'twilio' && !endpoint.value) endpoint.value = 'https://api.twilio.com/2010-04-01';
  };

  window.toggleFieldVisibility = function(id) {
    var el = document.getElementById(id);
    if (el) el.type = el.type === 'password' ? 'text' : 'password';
  };

  var waDirtyTemplates = {};
  window.waMarkTemplateDirty = function(tplId, tid) {
    waDirtyTemplates[tplId] = tid;
    var btn = document.getElementById(tid + '_savebtn');
    if (btn) btn.disabled = false;
  };

  window.waSaveTemplate = function(tplId, tid) {
    var textarea = document.getElementById(tid + '_textarea');
    if (!textarea) return;
    var btn = document.getElementById(tid + '_savebtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    API.call('whatsappSaveTemplate', { TemplateID: tplId, TemplateBody: textarea.value })
      .then(function(res) {
        btn.textContent = 'Saved';
        setTimeout(function() { btn.textContent = 'Save'; }, 2000);
        delete waDirtyTemplates[tplId];
        if (res && res.templates) renderWhatsAppTemplates(res.templates);
      })
      .catch(function() { btn.textContent = 'Error'; btn.disabled = false; });
  };
})();
