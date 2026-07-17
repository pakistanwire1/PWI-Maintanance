/* ============================================================
   email.js — Email Settings Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _settings = {};
  var _logs = [];
  var _stats = {};

  App.registerPage('email', render, load);

  function render() {
    document.getElementById('page-email').innerHTML = '' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:8px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' +
            'Email Notification Settings' +
          '</div>' +
        '</div>' +
        '<div class="card-body" style="padding:24px">' +
          '<div class="settings-grid">' +
            '<div>' +
              '<h3 style="margin-bottom:16px;font-size:15px">General Settings</h3>' +

              '<div class="form-group" style="margin-bottom:14px">' +
                '<label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
                  '<input type="checkbox" id="emailEnabled" onchange="window.EmailSaveSetting(\'enabled\', this.checked)">' +
                  ' Enable Email Notifications' +
                '</label>' +
              '</div>' +

              '<div class="form-group" style="margin-bottom:14px">' +
                '<label class="form-label">Sender Name</label>' +
                '<input type="text" class="form-control" id="emailSenderName" placeholder="CMMS Notification" onchange="window.EmailSaveSetting(\'senderName\', this.value)">' +
              '</div>' +

              '<div class="form-group" style="margin-bottom:14px">' +
                '<label class="form-label">Reply-To Email</label>' +
                '<input type="email" class="form-control" id="emailReplyTo" placeholder="noreply@cmms.com" onchange="window.EmailSaveSetting(\'replyTo\', this.value)">' +
              '</div>' +

              '<div class="form-group" style="margin-bottom:14px">' +
                '<label class="form-label">Daily Summary Time</label>' +
                '<input type="time" class="form-control" id="emailDailyTime" onchange="window.EmailSaveSetting(\'dailySummaryTime\', this.value)">' +
              '</div>' +

              '<div class="form-group" style="margin-bottom:14px">' +
                '<label class="form-label">Weekly Summary Day</label>' +
                '<select class="form-control" id="emailWeeklyDay" onchange="window.EmailSaveSetting(\'weeklySummaryDay\', this.value)">' +
                  '<option value="Monday">Monday</option>' +
                  '<option value="Tuesday">Tuesday</option>' +
                  '<option value="Wednesday">Wednesday</option>' +
                  '<option value="Thursday">Thursday</option>' +
                  '<option value="Friday">Friday</option>' +
                  '<option value="Saturday">Saturday</option>' +
                  '<option value="Sunday">Sunday</option>' +
                '</select>' +
              '</div>' +

              '<hr style="margin:20px 0;border:none;border-top:1px solid var(--border)">' +

              '<h3 style="margin-bottom:16px;font-size:15px">Actions</h3>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
                '<button class="btn btn-primary" onclick="window.EmailTest()">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' +
                  ' Send Test Email' +
                '</button>' +
                '<button class="btn btn-success" onclick="window.EmailRetryFailed()">' +
                  '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:middle;margin-right:4px"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>' +
                  ' Retry Failed Emails' +
                '</button>' +
                '<button class="btn btn-info" onclick="window.EmailSendDailySummary()">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" y1="12" x2="22" y2="12"/></svg>' +
                  ' Send Daily Summary Now' +
                '</button>' +
              '</div>' +
            '</div>' +

            '<div>' +
              '<h3 style="margin-bottom:16px;font-size:15px">Email Stats</h3>' +
              '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">' +
                '<div class="stat-card stat-primary" style="cursor:default">' +
                  '<div class="stat-inner">' +
                    '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg></div>' +
                    '<div class="stat-info"><h3 id="emailStatSent">-</h3><p>Sent Today</p></div>' +
                  '</div>' +
                '</div>' +
                '<div class="stat-card stat-danger" style="cursor:default">' +
                  '<div class="stat-inner">' +
                    '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
                    '<div class="stat-info"><h3 id="emailStatFailed">-</h3><p>Failed Today</p></div>' +
                  '</div>' +
                '</div>' +
                '<div class="stat-card stat-warning" style="cursor:default">' +
                  '<div class="stat-inner">' +
                    '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
                    '<div class="stat-info"><h3 id="emailStatPending">-</h3><p>Pending Today</p></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<h3 style="margin-bottom:12px;font-size:15px">Email Logs</h3>' +
              '<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">' +
                '<select id="emailLogFilterModule" class="form-control" style="width:auto;min-width:120px" onchange="window.EmailRefreshLogs()">' +
                  '<option value="">All Modules</option>' +
                  '<option value="JobCardOpened">Job Opened</option>' +
                  '<option value="JobAssigned">Job Assigned</option>' +
                  '<option value="JobStarted">Job Started</option>' +
                  '<option value="JobClosed">Job Closed</option>' +
                  '<option value="JobApproved">Job Approved</option>' +
                  '<option value="PMDueReminder">PM Due</option>' +
                  '<option value="PMOverdue">PM Overdue</option>' +
                  '<option value="LowStockAlert">Low Stock</option>' +
                  '<option value="PurchaseRequest">Purchase Request</option>' +
                  '<option value="GoodsReceipt">Goods Receipt</option>' +
                  '<option value="UserCreated">User Created</option>' +
                  '<option value="PasswordReset">Password Reset</option>' +
                  '<option value="DailySummary">Daily Summary</option>' +
                  '<option value="WeeklySummary">Weekly Summary</option>' +
                  '<option value="MonthlySummary">Monthly Summary</option>' +
                '</select>' +
                '<select id="emailLogFilterStatus" class="form-control" style="width:auto;min-width:100px" onchange="window.EmailRefreshLogs()">' +
                  '<option value="">All Status</option>' +
                  '<option value="Sent">Sent</option>' +
                  '<option value="Failed">Failed</option>' +
                  '<option value="Pending">Pending</option>' +
                '</select>' +
                '<button class="btn btn-secondary" onclick="window.EmailRefreshLogs()">' +
                  '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:middle;margin-right:4px"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>' +
                  ' Refresh' +
                '</button>' +
              '</div>' +
              '<div id="emailLogsWrap" style="border:1px solid var(--border);border-radius:var(--radius-md)">' +
                '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
                  '<thead>' +
                    '<tr>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">ID</th>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">Date/Time</th>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">Recipient</th>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">Subject</th>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">Module</th>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">Status</th>' +
                      '<th style="padding:7px 8px;text-align:left;font-weight:600;color:var(--text-secondary);background:var(--bg-sidebar);border-bottom:1px solid var(--border);white-space:nowrap">Error</th>' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody id="emailLogsBody">' +
                    '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Loading...</td></tr>' +
                  '</tbody>' +
                '</table>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<style>' +
        '#page-email .email-logs-wrap table th { font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }' +
        '#page-email .email-logs-wrap table td { font-size:11px; color:var(--text); vertical-align:middle; }' +
        '#page-email .email-logs-wrap table tr:hover td { background:var(--bg-card-hover); }' +
        '#page-email .email-logs-wrap table tr:last-child td { border-bottom:none; }' +
        '#page-email .badge { display:inline-block; padding:2px 7px; border-radius:10px; font-size:10px; font-weight:500; }' +
        '#page-email .badge-success { background:var(--success-bg); color:var(--success); }' +
        '#page-email .badge-danger { background:rgba(239,68,68,0.12); color:var(--danger); }' +
        '#page-email .badge-warning { background:rgba(234,179,8,0.12); color:#ca8a04; }' +
        '#page-email .form-group { margin-bottom:14px; }' +
        '#page-email .form-label { display:block; font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:5px; }' +
        '#page-email .form-control { width:100%; padding:8px 10px; font-size:13px; background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text); font-family:inherit; box-sizing:border-box; }' +
        '#page-email .form-control:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 2px rgba(37,99,235,0.15); }' +
        '#page-email .settings-grid { display:grid; grid-template-columns:1fr 1.5fr; gap:24px; }' +
        '@media (max-width:768px) { #page-email .settings-grid { grid-template-columns:1fr; } }' +
      '</style>';
  }

  function load() {
    App.showLoading(true);
    EmailLoadSettingsData();
    setTimeout(function() { App.showLoading(false); }, 8000);
  }

  function EmailLoadSettingsData() {
    try {
      var el = document.getElementById('emailStatSent');
      if (el) el.textContent = '-';
      el = document.getElementById('emailStatFailed');
      if (el) el.textContent = '-';
      el = document.getElementById('emailStatPending');
      if (el) el.textContent = '-';
      var logsBody = document.getElementById('emailLogsBody');
      if (logsBody) logsBody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Loading email records...</td></tr>';
      EmailLoadSettings();
      EmailLoadStats();
      EmailRefreshLogs();
    } catch (e) {
      var main = document.getElementById('page-email');
      if (main) main.innerHTML = '<div class="card" style="padding:40px;text-align:center"><h3 style="color:var(--danger);margin-bottom:12px">Error Loading Page</h3><p style="color:var(--text-secondary)">' + escapeHtml(String(e.message || e)) + '</p><button class="btn btn-primary" onclick="App.navigate(\'dashboard\')" style="margin-top:16px">Go to Dashboard</button></div>';
    }
  }

  function EmailLoadSettings() {
    API.call('emailGetSettings')
      .then(function(settings) {
        _settings = settings || {};
        var el;
        el = document.getElementById('emailEnabled'); if (el) el.checked = _settings.enabled === true || _settings.enabled === 'true';
        el = document.getElementById('emailSenderName'); if (el) el.value = _settings.senderName || '';
        el = document.getElementById('emailReplyTo'); if (el) el.value = _settings.replyTo || '';
        el = document.getElementById('emailDailyTime'); if (el) el.value = _settings.dailySummaryTime || '08:00';
        el = document.getElementById('emailWeeklyDay'); if (el) el.value = _settings.weeklySummaryDay || 'Monday';
      })
      .catch(function(err) {
        App.showToast('Failed to load email settings: ' + err, 'error');
      });
  }

  function EmailLoadStats() {
    var statsTimer = setTimeout(function() {
      var el = document.getElementById('emailStatSent');
      if (el && el.textContent === '-') el.textContent = '0';
      el = document.getElementById('emailStatFailed');
      if (el && el.textContent === '-') el.textContent = '0';
      el = document.getElementById('emailStatPending');
      if (el && el.textContent === '-') el.textContent = '0';
    }, 10000);
    API.call('emailGetPanelData')
      .then(function(result) {
        clearTimeout(statsTimer);
        _stats = (result && result.stats) ? result.stats : (result || {});
        var el;
        el = document.getElementById('emailStatSent'); if (el) el.textContent = _stats.sentToday || '0';
        el = document.getElementById('emailStatFailed'); if (el) el.textContent = _stats.failedToday || '0';
        el = document.getElementById('emailStatPending'); if (el) el.textContent = _stats.pendingToday || '0';
      })
      .catch(function(err) {
        clearTimeout(statsTimer);
        console.error('emailLoadStats error: ' + err);
      });
  }

  function EmailRefreshLogs() {
    var moduleFilter = (document.getElementById('emailLogFilterModule') || {}).value || '';
    var statusFilter = (document.getElementById('emailLogFilterStatus') || {}).value || '';
    var tbody = document.getElementById('emailLogsBody');
    var loadingMsg = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Loading email records...</td></tr>';
    if (tbody) tbody.innerHTML = loadingMsg;
    var logsTimer = setTimeout(function() {
      var tb = document.getElementById('emailLogsBody');
      if (tb && tb.innerHTML === loadingMsg) {
        tb.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Request timed out. <button class="btn btn-xs btn-secondary" onclick="window.EmailRefreshLogs()">Retry</button></td></tr>';
      }
    }, 15000);
    var params = {};
    if (moduleFilter) params.module = moduleFilter;
    if (statusFilter) params.status = statusFilter;
    API.call('emailGetLogs', params)
      .then(function(logs) {
        clearTimeout(logsTimer);
        _logs = logs || [];
        var tbody = document.getElementById('emailLogsBody');
        if (!tbody) return;
        if (!_logs.length) {
          tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">No Email Records Found</td></tr>';
          return;
        }
        var html = '';
        var maxLogs = 100;
        var count = Math.min(_logs.length, maxLogs);
        for (var i = 0; i < count; i++) {
          var l = _logs[i];
          var statusClass = l.Status === 'Sent' ? 'badge badge-success' : (l.Status === 'Failed' ? 'badge badge-danger' : 'badge badge-warning');
          html += '<tr>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border);font-family:monospace;font-size:10px">' + escapeHtml(l.EmailID || '') + '</td>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border);white-space:nowrap">' + escapeHtml((l.DateTime || '').substring(0, 19)) + '</td>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border)">' + escapeHtml(l.Recipient || '') + '</td>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(l.Subject || '') + '">' + escapeHtml((l.Subject || '').substring(0, 50)) + '</td>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border)">' + escapeHtml(l.Module || '') + '</td>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border)"><span class="' + statusClass + '">' + escapeHtml(l.Status || '') + '</span></td>' +
            '<td style="padding:6px 8px;border-bottom:1px solid var(--border);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--danger)" title="' + escapeHtml(l.ErrorMessage || '') + '">' + escapeHtml(l.ErrorMessage || '') + '</td>' +
            '</tr>';
        }
        if (_logs.length > maxLogs) {
          html += '<tr><td colspan="7" style="padding:8px;text-align:center;color:var(--text-muted);font-size:11px">Showing ' + maxLogs + ' of ' + _logs.length + ' logs</td></tr>';
        }
        tbody.innerHTML = html;
      })
      .catch(function(err) {
        clearTimeout(logsTimer);
        App.showToast('Error loading email logs: ' + err, 'error');
        var tb = document.getElementById('emailLogsBody');
        if (tb) tb.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Failed to load. <button class="btn btn-xs btn-secondary" onclick="window.EmailRefreshLogs()">Retry</button></td></tr>';
      });
  }

  window.EmailSaveSetting = function(key, value) {
    var data = {};
    if (key === 'enabled') {
      data.enabled = value === true || value === 'true';
    } else if (key === 'senderName') {
      data.senderName = value;
    } else if (key === 'replyTo') {
      data.replyTo = value;
    } else if (key === 'dailySummaryTime') {
      data.dailySummaryTime = value;
    } else if (key === 'weeklySummaryDay') {
      data.weeklySummaryDay = value;
    }
    API.call('emailSaveSettings', data)
      .then(function(result) {
        if (result && result.success) App.showToast('Email setting saved', 'success');
        else App.showToast('Failed to save: ' + ((result && result.message) || 'Unknown error'), 'error');
      })
      .catch(function(err) {
        App.showToast('Error saving email setting: ' + err, 'error');
      });
  };

  window.EmailTest = function() {
    var recipient = prompt('Enter recipient email for test:');
    if (!recipient || recipient.indexOf('@') === -1) {
      App.showToast('Please enter a valid email address', 'warning');
      return;
    }
    App.showToast('Sending test email...', 'info');
    API.call('emailSendRaw', {
      recipient: recipient,
      subject: '[CMMS] Test Email',
      body: '<h2>Test Email</h2><p>This is a test email from CMMS Notification System.</p><p>If you received this, the email configuration is working correctly.</p>',
      module: '',
      reference: ''
    })
      .then(function(result) {
        if (result && result.success) App.showToast('Test email sent successfully', 'success');
        else App.showToast('Test email failed: ' + ((result && result.message) || 'Unknown'), 'error');
        EmailRefreshLogs();
        EmailLoadStats();
      })
      .catch(function(err) {
        App.showToast('Error sending test: ' + err, 'error');
      });
  };

  window.EmailRetryFailed = function() {
    App.showToast('Retrying failed emails...', 'info');
    API.call('emailRetryFailed')
      .then(function(result) {
        App.showToast('Retried: ' + (result.retried || 0) + ', Succeeded: ' + (result.succeeded || 0) + ', Failed: ' + (result.failed || 0), (result.failed || 0) > 0 ? 'warning' : 'success');
        EmailRefreshLogs();
        EmailLoadStats();
      })
      .catch(function(err) {
        App.showToast('Error retrying: ' + err, 'error');
      });
  };

  window.EmailSendDailySummary = function() {
    App.showToast('Sending daily summary to all active users...', 'info');
    API.call('emailSendDailySummary')
      .then(function(result) {
        App.showToast('Daily summary sent', 'success');
        EmailRefreshLogs();
        EmailLoadStats();
      })
      .catch(function(err) {
        App.showToast('Error: ' + err, 'error');
      });
  };

  window.EmailRefreshLogs = EmailRefreshLogs;
})();
