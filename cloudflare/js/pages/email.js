/* ============================================================
   email.js — Email Settings Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _settings = {};
  var _logs = [];

  App.registerPage('email', render, load);

  function render() {
    document.getElementById('page-email').innerHTML = '' +
      '<div class="page-header"><h2>Email Settings</h2></div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="EmailTab(this,\''+'settings'+'\')">Settings</button>' +
        '<button class="tab" onclick="EmailTab(this,\''+'logs'+'\')">Email Logs</button>' +
      '</div>' +
      '<div id="email-content"></div>';
  }

  function load() { loadSettings(); }

  function loadSettings() {
    var el = document.getElementById('email-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('emailGetSettings')
      .then(function(data) {
        _settings = data || {};
        var h = '<div class="card" style="padding:24px"><h3 style="margin-bottom:20px">Email Configuration</h3><div class="grid grid-2">' +
          fg('Enabled','em-enabled',_settings.enabled===true||_settings.enabled==='true'?'true':'false','select',['true','false']) +
          fg('Sender Name','em-sname',_settings.senderName||'') +
          fg('Reply To','em-replyto',_settings.replyTo||'') +
          fg('Daily Summary Time','em-dailystime',_settings.dailySummaryTime||'08:00','',{type:'time'}) +
          fg('Weekly Summary Day','em-weeklyday',_settings.weeklySummaryDay||'Monday','select',['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) +
        '</div><div style="margin-top:16px"><button class="btn btn-primary" onclick="EmailSaveSettings()">Save Settings</button></div></div>';
        el.innerHTML = h;
      })
      .catch(function(e) { el.innerHTML='<div class="card" style="padding:24px"><p style="color:var(--danger)">'+App.escHtml(e.message)+'</p></div>'; });
  }

  function loadLogs() {
    var el = document.getElementById('email-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('emailGetLogs', {})
      .then(function(data) {
        _logs = data || [];
        if (!_logs.length) { el.innerHTML='<div class="card"><div class="empty-state"><div class="empty-state-icon">&#128231;</div><div class="empty-state-text">No email logs</div></div></div>'; return; }
        var h = '<div class="card"><div class="table-container"><table><thead><tr><th>Date</th><th>Recipient</th><th>Subject</th><th>Module</th><th>Status</th></tr></thead><tbody>';
        _logs.forEach(function(l) {
          var sc = (l.Status||'').toLowerCase()==='sent'?'badge-success':(l.Status||'').toLowerCase()==='failed'?'badge-danger':'badge-warning';
          h += '<tr><td>'+App.escHtml(l.DateTime||'')+'</td><td>'+App.escHtml(l.Recipient||'')+'</td><td>'+App.escHtml(l.Subject||'')+'</td><td>'+App.escHtml(l.Module||'')+'</td><td><span class="badge '+sc+'">'+App.escHtml(l.Status||'')+'</span></td></tr>';
        });
        el.innerHTML = h + '</tbody></table></div></div>';
      })
      .catch(function(e) { el.innerHTML='<div class="card" style="padding:24px"><p style="color:var(--danger)">'+App.escHtml(e.message)+'</p></div>'; });
  }

  function fg(l,id,v,type,opts) {
    if (type==='select') {
      var h='<div class="form-group"><label class="form-label">'+l+'</label><select class="form-select" id="'+id+'">';
      (opts||[]).forEach(function(o){h+='<option value="'+o+'"'+(v===o?' selected':'')+'>'+o+'</option>';});
      return h+'</select></div>';
    }
    return '<div class="form-group"><label class="form-label">'+l+'</label><input class="form-input" id="'+id+'" value="'+App.escHtml(v||'')+'"'+(type?' type="'+type+'"':'')+'></div>';
  }

  window.EmailTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    if (tab==='settings') loadSettings(); else loadLogs();
  };
  window.EmailSaveSettings = function() {
    var d = {
      enabled: document.getElementById('em-enabled').value==='true',
      senderName: document.getElementById('em-sname').value,
      replyTo: document.getElementById('em-replyto').value,
      dailySummaryTime: document.getElementById('em-dailystime').value,
      weeklySummaryDay: document.getElementById('em-weeklyday').value
    };
    API.call('emailSaveSettings',d).then(function(){App.showToast('Settings saved','success');}).catch(function(e){App.showToast('Error: '+e.message,'error');});
  };
})();
