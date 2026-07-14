/* ============================================================
   pendingjc.js — Pending Review Job Cards
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _jobs = [];

  App.registerPage('pendingjc', render, load);

  function render() {
    var el = document.getElementById('page-pendingjc');
    el.innerHTML = '' +
      '<div class="page-header"><h2>Pending Review</h2>' +
        '<p style="color:var(--text-muted);font-size:13px;margin-top:4px">Job cards awaiting approval or return</p></div>' +
      '<div class="card"><div class="table-container" id="pjc-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCards', { status: 'Pending' })
      .then(function(data) {
        _jobs = data.records || [];
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('pjc-table');
    if (!el) return;
    if (_jobs.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#9989;</div><div class="empty-state-text">No pending job cards</div></div>';
      return;
    }
    var canApprove = Auth.canApproveJobCard();
    var html = '<table><thead><tr><th>Job Card #</th><th>Machine</th><th>Complaint</th><th>Priority</th><th>Pending Reason</th><th>Pending Date</th>';
    if (canApprove) html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    _jobs.forEach(function(jc) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escHtml(jc.ComplaintDescription || '') + '</td>' +
        '<td><span class="badge ' + priorityBadge(jc.Priority) + '">' + App.escHtml(jc.Priority || '-') + '</span></td>' +
        '<td>' + App.escHtml(jc.PendingRemarks || '-') + '</td>' +
        '<td>' + App.formatDateTime(jc.PendingDateTime) + '</td>';
      if (canApprove) {
        html += '<td style="white-space:nowrap">' +
          '<button class="btn btn-sm btn-success" onclick="PendingJCApprove(\'' + (jc.JobCardNo || '') + '\')">Approve</button> ' +
          '<button class="btn btn-sm btn-warning" onclick="PendingJCReturn(\'' + (jc.JobCardNo || '') + '\')">Return</button>' +
          '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function priorityBadge(p) {
    var v = (p || '').toLowerCase();
    if (v === 'critical') return 'badge-danger';
    if (v === 'high') return 'badge-warning';
    if (v === 'medium') return 'badge-info';
    if (v === 'low') return 'badge-success';
    return 'badge-secondary';
  }

  window.PendingJCApprove = function(jobCardNo) {
    App.showConfirm('Approve Job Card', 'Approve ' + jobCardNo + ' and close it?', function() {
      App.showLoading(true);
      API.call('approveJobCard', { id: jobCardNo })
        .then(function() {
          App.showLoading(false);
          App.showToast('Job card approved', 'success');
          load();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Error: ' + err.message, 'error');
        });
    });
  };

  window.PendingJCReturn = function(jobCardNo) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" style="max-width:500px">' +
      '<div class="modal-header"><h3>Return: ' + App.escHtml(jobCardNo) + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">Reason for Return *</label>' +
          '<textarea class="form-input" id="pjc-return-reason" rows="3" placeholder="Why is this being returned?"></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-warning" id="pjc-return-btn">Return</button>' +
      '</div></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#pjc-return-btn').onclick = function() {
      var reason = overlay.querySelector('#pjc-return-reason').value;
      if (!reason) { App.showToast('Reason is required', 'error'); return; }

      var btn = overlay.querySelector('#pjc-return-btn');
      btn.textContent = 'Returning...';
      btn.disabled = true;

      API.call('returnJobCard', { id: jobCardNo, reason: reason })
        .then(function() {
          overlay.remove();
          App.showToast('Job card returned', 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = 'Return';
          btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };

    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  };
})();
