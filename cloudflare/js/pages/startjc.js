/* ============================================================
   startjc.js — Start Job Card (Assign & Begin Work)
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _jobs = [];

  App.registerPage('startjc', render, load);

  function render() {
    var el = document.getElementById('page-startjc');
    if (!Auth.canStartJobCard()) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:12px">' +
        '<div style="font-size:48px">&#128274;</div>' +
        '<h2>Access Denied</h2>' +
        '<p style="color:var(--text-muted)">You do not have permission to start job cards.</p></div>';
      return;
    }
    el.innerHTML = '' +
      '<div class="page-header"><h2>Start Job Card</h2>' +
        '<p style="color:var(--text-muted);font-size:13px;margin-top:4px">Select an Open job card to assign a technician and start work</p></div>' +
      '<div class="card"><div class="table-container" id="sjc-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCards', { status: 'Open' })
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
    var el = document.getElementById('sjc-table');
    if (!el) return;
    if (_jobs.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#127919;</div><div class="empty-state-text">No Open job cards to start</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Job Card #</th><th>Machine</th><th>Complaint</th><th>Priority</th><th>Created</th><th>Action</th></tr></thead><tbody>';
    _jobs.forEach(function(jc) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escHtml(jc.ComplaintDescription || '') + '</td>' +
        '<td><span class="badge ' + priorityBadge(jc.Priority) + '">' + App.escHtml(jc.Priority || '-') + '</span></td>' +
        '<td>' + App.timeAgo(jc.CreatedAt || jc.OpenDateTime) + '</td>' +
        '<td><button class="btn btn-sm btn-primary" onclick="StartJCBegin(\'' + (jc.JobCardNo || '') + '\')">Start</button></td>' +
        '</tr>';
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

  window.StartJCBegin = function(jobCardNo) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" style="max-width:600px">' +
      '<div class="modal-header"><h3>Start: ' + App.escHtml(jobCardNo) + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">Assigned Technician *</label>' +
          '<input class="form-input" id="sjc-tech" placeholder="Technician name(s)"></div>' +
        '<div class="form-group"><label class="form-label">Maintenance Team</label>' +
          '<input class="form-input" id="sjc-team" placeholder="Team name"></div>' +
        '<div class="form-group"><label class="form-label">Start Date/Time</label>' +
          '<input type="datetime-local" class="form-input" id="sjc-starttime"></div>' +
        '<div class="form-group"><label class="form-label">Initial Remarks</label>' +
          '<textarea class="form-input" id="sjc-remarks" rows="3" placeholder="Initial observations..."></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="sjc-confirm">Start Work</button>' +
      '</div></div>';
    document.body.appendChild(overlay);

    var now = new Date();
    var local = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var timeInput = overlay.querySelector('#sjc-starttime');
    if (timeInput) timeInput.value = local;

    overlay.querySelector('#sjc-confirm').onclick = function() {
      var tech = overlay.querySelector('#sjc-tech').value;
      if (!tech) { App.showToast('Assign at least one technician', 'error'); return; }

      var btn = overlay.querySelector('#sjc-confirm');
      btn.textContent = 'Starting...';
      btn.disabled = true;

      API.call('startJobCard', {
        id: jobCardNo,
        technician: tech,
        team: overlay.querySelector('#sjc-team').value,
        startDateTime: timeInput ? timeInput.value : '',
        remarks: overlay.querySelector('#sjc-remarks').value
      }).then(function() {
        overlay.remove();
        App.showToast('Job card started successfully', 'success');
        load();
      }).catch(function(err) {
        btn.textContent = 'Start Work';
        btn.disabled = false;
        App.showToast('Error: ' + err.message, 'error');
      });
    };

    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  };
})();
