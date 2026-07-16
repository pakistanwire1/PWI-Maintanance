/* ============================================================
   whatsapp.js — WhatsApp Settings Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _settings = {};
  var _templates = [];
  var _logs = [];

  App.registerPage('whatsapp', render, load);

  function render() {
    document.getElementById('page-whatsapp').innerHTML = '' +
      '<div class="page-header"><h2>WhatsApp Settings</h2></div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="WATab(this,\''+'settings'+'\')">Settings</button>' +
        '<button class="tab" onclick="WATab(this,\''+'templates'+'\')">Templates</button>' +
        '<button class="tab" onclick="WATab(this,\''+'logs'+'\')">Logs</button>' +
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
        var h = '<div class="card" style="padding:24px"><h3 style="margin-bottom:20px">WhatsApp Configuration</h3><div class="grid grid-2">' +
          fg('Enabled','wa-enabled',_settings.enabled===true||_settings.enabled==='true'?'true':'false','select',['true','false']) +
          fg('Company Name','wa-company',_settings.companyName||'') +
          fg('Default Country Code','wa-code',_settings.defaultCountryCode||'+92') +
          fg('Provider','wa-provider',_settings.provider||'meta','select',['meta','twilio','other']) +
          fg('API Endpoint','wa-endpoint',_settings.apiEndpoint||'') +
          fg('API Token','wa-token',_settings.apiToken||'','password') +
          fg('Phone Number ID','wa-phoneid',_settings.phoneNumberId||'') +
          fg('Business Account ID','wa-bizid',_settings.businessAccountId||'') +
        '</div><div style="margin-top:16px"><button class="btn btn-primary" onclick="WASaveSettings()">Save Settings</button></div></div>';
        el.innerHTML = h;
      })
      .catch(function(e) { el.innerHTML='<div class="card" style="padding:24px"><p style="color:var(--danger)">'+App.escHtml(e.message)+'</p></div>'; });
  }

  function loadTemplates() {
    var el = document.getElementById('wa-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('whatsappGetTemplates')
      .then(function(data) {
        _templates = data || [];
        if (!_templates.length) { el.innerHTML='<div class="card"><div class="empty-state"><div class="empty-state-text">No templates configured</div></div></div>'; return; }
        var h = '<div class="card" style="padding:24px"><h3 style="margin-bottom:16px">Message Templates</h3>';
        _templates.forEach(function(t) {
          h += '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<strong>'+App.escHtml(t.TemplateName||t.Name||'')+'</strong>' +
              '<span class="badge badge-primary">'+App.escHtml(t.EventType||t.Type||'')+'</span>' +
            '</div>' +
            '<textarea class="form-textarea" id="wa-tpl-'+App.escHtml(t.TemplateID||t.id||'')+'" rows="3">'+App.escHtml(t.TemplateBody||t.Body||'')+'</textarea>' +
            '<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="WASaveTemplate(\''+App.escHtml(t.TemplateID||t.id||'')+'\')">Save Template</button>' +
          '</div>';
        });
        el.innerHTML = h + '</div>';
      })
      .catch(function(e) { el.innerHTML='<div class="card" style="padding:24px"><p style="color:var(--danger)">'+App.escHtml(e.message)+'</p></div>'; });
  }

  function loadLogs() {
    var el = document.getElementById('wa-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('whatsappGetLogs', {})
      .then(function(data) {
        _logs = data || [];
        if (!_logs.length) { el.innerHTML='<div class="card"><div class="empty-state"><div class="empty-state-icon">&#128172;</div><div class="empty-state-text">No WhatsApp logs</div></div></div>'; return; }
        var h = '<div class="card"><div class="table-container"><table><thead><tr><th>Date</th><th>Recipient</th><th>Module</th><th>Template</th><th>Status</th></tr></thead><tbody>';
        _logs.forEach(function(l) {
          var sc = (l.Status||'').toLowerCase()==='sent'?'badge-success':(l.Status||'').toLowerCase()==='failed'?'badge-danger':'badge-warning';
          h += '<tr><td>'+App.escHtml(l.DateTime||'')+'</td><td>'+App.escHtml(l.Recipient||l.PhoneNumber||'')+'</td><td>'+App.escHtml(l.Module||'')+'</td><td>'+App.escHtml(l.Template||'')+'</td><td><span class="badge '+sc+'">'+App.escHtml(l.Status||'')+'</span></td></tr>';
        });
        el.innerHTML = h + '</tbody></table></div></div>';
      })
      .catch(function(e) { el.innerHTML='<div class="card" style="padding:24px"><p style="color:var(--danger)">'+App.escHtml(e.message)+'</p></div>'; });
  }

  function fg(l,id,v,type) {
    if (type==='select') {
      var opts = type==='select'?arguments[4]:[];
      var h='<div class="form-group"><label class="form-label">'+l+'</label><select class="form-select" id="'+id+'">';
      (opts||[]).forEach(function(o){h+='<option value="'+o+'"'+(v===o?' selected':'')+'>'+o+'</option>';});
      return h+'</select></div>';
    }
    return '<div class="form-group"><label class="form-label">'+l+'</label><input class="form-input" id="'+id+'" value="'+App.escHtml(v||'')+'"'+(type?' type="'+type+'"':'')+'></div>';
  }

  window.WATab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    if (tab==='settings') loadSettings(); else if (tab==='templates') loadTemplates(); else loadLogs();
  };
  window.WASaveSettings = function() {
    var d = {
      enabled: document.getElementById('wa-enabled').value==='true',
      companyName: document.getElementById('wa-company').value,
      defaultCountryCode: document.getElementById('wa-code').value,
      provider: document.getElementById('wa-provider').value,
      apiEndpoint: document.getElementById('wa-endpoint').value,
      apiToken: document.getElementById('wa-token').value,
      phoneNumberId: document.getElementById('wa-phoneid').value,
      businessAccountId: document.getElementById('wa-bizid').value
    };
    API.call('whatsappSaveSettings',d).then(function(){App.showToast('Settings saved','success');}).catch(function(e){App.showToast('Error: '+e.message,'error');});
  };
  window.WASaveTemplate = function(id) {
    var body = document.getElementById('wa-tpl-'+id);
    if (!body) return;
    API.call('whatsappSaveTemplate',{TemplateID:id,TemplateBody:body.value}).then(function(){App.showToast('Template saved','success');}).catch(function(e){App.showToast('Error: '+e.message,'error');});
  };
})();
