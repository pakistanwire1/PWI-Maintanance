var EmailSettings = (function() {
  var logsData = [];

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="emailPage" class="page">' +
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
                    '<input type="checkbox" id="emailEnabled" onchange="EmailSettings.saveSetting(\'enabled\', this.checked)">' +
                    'Enable Email Notifications' +
                  '</label>' +
                '</div>' +

                '<div class="form-group" style="margin-bottom:14px">' +
                  '<label class="form-label">Sender Name</label>' +
                  '<input type="text" class="form-control" id="emailSenderName" placeholder="CMMS Notification" onchange="EmailSettings.saveSetting(\'senderName\', this.value)">' +
                '</div>' +

                '<div class="form-group" style="margin-bottom:14px">' +
                  '<label class="form-label">Reply-To Email</label>' +
                  '<input type="email" class="form-control" id="emailReplyTo" placeholder="noreply@cmms.com" onchange="EmailSettings.saveSetting(\'replyTo\', this.value)">' +
                '</div>' +

                '<div class="form-group" style="margin-bottom:14px">' +
                  '<label class="form-label">Daily Summary Time</label>' +
                  '<input type="time" class="form-control" id="emailDailyTime" onchange="EmailSettings.saveSetting(\'dailySummaryTime\', this.value)">' +
                '</div>' +

                '<div class="form-group" style="margin-bottom:14px">' +
                  '<label class="form-label">Weekly Summary Day</label>' +
                  '<select class="form-control" id="emailWeeklyDay" onchange="EmailSettings.saveSetting(\'weeklySummaryDay\', this.value)">' +
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
                  '<button class="btn btn-primary" onclick="EmailSettings.testEmail()">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' +
                    'Send Test Email' +
                  '</button>' +
                  '<button class="btn btn-success" onclick="EmailSettings.retryFailed()">' +
                    '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:middle;margin-right:4px"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>' +
                    'Retry Failed Emails' +
                  '</button>' +
                  '<button class="btn btn-info" onclick="EmailSettings.sendDailySummary()">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" y1="12" x2="22" y2="12"/></svg>' +
                    'Send Daily Summary Now' +
                  '</button>' +
                '</div>' +
              '</div>' +

              '<div>' +
                '<h3 style="margin-bottom:16px;font-size:15px">Email Stats</h3>' +
                '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">' +
                  '<div class="stat-card stat-primary" style="cursor:default">' +
                    '<div class="stat-inner">' +
                      '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg></div>' +
                      '<div class="stat-info"><h3 id="emailStatSent">0</h3><p>Sent Today</p></div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="stat-card stat-danger" style="cursor:default">' +
                    '<div class="stat-inner">' +
                      '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
                      '<div class="stat-info"><h3 id="emailStatFailed">0</h3><p>Failed Today</p></div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="stat-card stat-warning" style="cursor:default">' +
                    '<div class="stat-inner">' +
                      '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
                      '<div class="stat-info"><h3 id="emailStatPending">0</h3><p>Pending Today</p></div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +

                '<h3 style="margin-bottom:12px;font-size:15px">Email Logs</h3>' +
                '<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">' +
                  '<select id="emailLogFilterModule" class="form-control" style="width:auto;min-width:120px" onchange="EmailSettings.refreshLogs()">' +
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
                  '<select id="emailLogFilterStatus" class="form-control" style="width:auto;min-width:100px" onchange="EmailSettings.refreshLogs()">' +
                    '<option value="">All Status</option>' +
                    '<option value="Sent">Sent</option>' +
                    '<option value="Failed">Failed</option>' +
                    '<option value="Pending">Pending</option>' +
                  '</select>' +
                  '<button class="btn btn-secondary" onclick="EmailSettings.refreshLogs()">' +
                    '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:middle;margin-right:4px"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>' +
                    ' Refresh' +
                  '</button>' +
                '</div>' +
                '<div style="border:1px solid var(--border);border-radius:var(--radius-md)">' +
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
      '</div>' +
      '<style>' +
        '#emailPage .email-logs-wrap table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '#emailPage .email-logs-wrap table td { font-size: 11px; color: var(--text); vertical-align: middle; }' +
        '#emailPage .email-logs-wrap table tr:hover td { background: var(--bg-card-hover); }' +
        '#emailPage .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 500; }' +
        '#emailPage .badge-success { background: var(--success-bg); color: var(--success); }' +
        '#emailPage .badge-danger { background: rgba(239,68,68,0.12); color: var(--danger); }' +
        '#emailPage .badge-warning { background: rgba(234,179,8,0.12); color: #ca8a04; }' +
        '#emailPage .settings-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; }' +
        '@media (max-width:768px) { #emailPage .settings-grid { grid-template-columns: 1fr; } }' +
      '</style>';

    loadSettings();
    loadStats();
    refreshLogs();
  }

  function loadSettings() {
    API.post('emailGetSettings', {})
      .then(function(settings) {
        var el;
        el = document.getElementById('emailEnabled'); if (el) el.checked = settings.enabled === true || settings.enabled === 'true';
        el = document.getElementById('emailSenderName'); if (el) el.value = settings.senderName || '';
        el = document.getElementById('emailReplyTo'); if (el) el.value = settings.replyTo || '';
        el = document.getElementById('emailDailyTime'); if (el) el.value = settings.dailySummaryTime || '08:00';
        el = document.getElementById('emailWeeklyDay'); if (el) el.value = settings.weeklySummaryDay || 'Monday';
      })
      .catch(function() {
        Notify.error('Failed to load email settings');
      });
  }

  function loadStats() {
    API.post('emailGetPanelData', {})
      .then(function(data) {
        var stats = (data && data.stats) || data || {};
        var el;
        el = document.getElementById('emailStatSent'); if (el) el.textContent = stats.sentToday || '0';
        el = document.getElementById('emailStatFailed'); if (el) el.textContent = stats.failedToday || '0';
        el = document.getElementById('emailStatPending'); if (el) el.textContent = stats.pendingToday || '0';
      })
      .catch(function() {
        var el;
        el = document.getElementById('emailStatSent'); if (el) el.textContent = '0';
        el = document.getElementById('emailStatFailed'); if (el) el.textContent = '0';
        el = document.getElementById('emailStatPending'); if (el) el.textContent = '0';
      });
  }

  function refreshLogs() {
    var moduleFilter = (document.getElementById('emailLogFilterModule') || {}).value || '';
    var statusFilter = (document.getElementById('emailLogFilterStatus') || {}).value || '';
    var tbody = document.getElementById('emailLogsBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Loading email records...</td></tr>';

    API.post('emailGetLogs', { filters: { module: moduleFilter || undefined, status: statusFilter || undefined } })
      .then(function(logs) {
        logsData = logs || [];
        renderLogs(logsData);
      })
      .catch(function() {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">Failed to load. <button class="btn btn-xs btn-secondary" onclick="EmailSettings.refreshLogs()">Retry</button></td></tr>';
      });
  }

  function renderLogs(logs) {
    var tbody = document.getElementById('emailLogsBody');
    if (!tbody) return;
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-muted)">No Email Records Found</td></tr>';
      return;
    }
    var html = '';
    var maxLogs = 100;
    var count = Math.min(logs.length, maxLogs);
    for (var i = 0; i < count; i++) {
      var l = logs[i];
      var statusClass = l.Status === 'Sent' ? 'badge badge-success' : (l.Status === 'Failed' ? 'badge badge-danger' : 'badge badge-warning');
      html += '<tr>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border);font-family:monospace;font-size:10px">' + Utils.escapeHtml(l.EmailID || '') + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border);white-space:nowrap">' + Utils.escapeHtml((l.DateTime || '').substring(0, 19)) + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border)">' + Utils.escapeHtml(l.Recipient || '') + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + Utils.escapeHtml(l.Subject || '') + '">' + Utils.escapeHtml((l.Subject || '').substring(0, 50)) + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border)">' + Utils.escapeHtml(l.Module || '') + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border)"><span class="' + statusClass + '">' + Utils.escapeHtml(l.Status || '') + '</span></td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid var(--border);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--danger)" title="' + Utils.escapeHtml(l.ErrorMessage || '') + '">' + Utils.escapeHtml((l.ErrorMessage || '').substring(0, 40)) + '</td>' +
        '</tr>';
    }
    if (logs.length > maxLogs) {
      html += '<tr><td colspan="7" style="padding:8px;text-align:center;color:var(--text-muted);font-size:11px">Showing ' + maxLogs + ' of ' + logs.length + ' logs</td></tr>';
    }
    tbody.innerHTML = html;
  }

  function saveSetting(key, value) {
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
    API.post('emailSaveSettings', data)
      .then(function(result) {
        if (result && result.success) Notify.success('Email setting saved');
        else Notify.warning('Failed to save: ' + (result && result.message ? result.message : 'Unknown error'));
      })
      .catch(function() {
        Notify.error('Error saving email setting');
      });
  }

  function testEmail() {
    var recipient = prompt('Enter recipient email for test:');
    if (!recipient || recipient.indexOf('@') === -1) {
      Notify.warning('Please enter a valid email address');
      return;
    }
    Notify.info('Sending test email...');
    API.post('emailSendRaw', { recipient: recipient, subject: '[CMMS] Test Email', body: '<h2>Test Email</h2><p>This is a test email from CMMS Notification System.</p><p>If you received this, the email configuration is working correctly.</p>', senderName: '', replyTo: '' })
      .then(function(result) {
        if (result && result.success) Notify.success('Test email sent successfully');
        else Notify.error('Test email failed: ' + (result && result.message ? result.message : 'Unknown'));
        refreshLogs();
        loadStats();
      })
      .catch(function() {
        Notify.error('Error sending test email');
      });
  }

  function retryFailed() {
    Notify.info('Retrying failed emails...');
    API.post('emailRetryFailed', {})
      .then(function(result) {
        Notify.show('Retried: ' + (result.retried || 0) + ', Succeeded: ' + (result.succeeded || 0) + ', Failed: ' + (result.failed || 0), (result.failed > 0) ? 'warning' : 'success');
        refreshLogs();
        loadStats();
      })
      .catch(function() {
        Notify.error('Error retrying failed emails');
      });
  }

  function sendDailySummary() {
    Notify.info('Sending daily summary to all active users...');
    API.post('emailSendDailySummary', {})
      .then(function() {
        Notify.success('Daily summary sent');
        refreshLogs();
        loadStats();
      })
      .catch(function() {
        Notify.error('Error sending daily summary');
      });
  }

  return {
    show: renderPage,
    saveSetting: saveSetting,
    testEmail: testEmail,
    retryFailed: retryFailed,
    sendDailySummary: sendDailySummary,
    refreshLogs: refreshLogs
  };
})();
