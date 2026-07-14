/* ============================================================
   closejc.js — Close Job Card Form
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _jobs = [];

  App.registerPage('closejc', render, load);

  function render() {
    var el = document.getElementById('page-closejc');
    if (!Auth.canCloseJobCard()) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:12px">' +
        '<div style="font-size:48px">&#128274;</div>' +
        '<h2>Access Denied</h2>' +
        '<p style="color:var(--text-muted)">You do not have permission to close job cards.</p></div>';
      return;
    }
    el.innerHTML = '' +
      '<div class="page-header"><h2>Close Job Card</h2>' +
        '<p style="color:var(--text-muted);font-size:13px;margin-top:4px">Select a Running job card to close with root cause and corrective action</p></div>' +
      '<div class="card"><div class="table-container" id="cjc-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCards', { status: 'Running' })
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
    var el = document.getElementById('cjc-table');
    if (!el) return;
    if (_jobs.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#127919;</div><div class="empty-state-text">No Running job cards to close</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Job Card #</th><th>Machine</th><th>Complaint</th><th>Technician</th><th>Priority</th><th>Started</th><th>Action</th></tr></thead><tbody>';
    _jobs.forEach(function(jc) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escHtml(jc.ComplaintDescription || '') + '</td>' +
        '<td>' + App.escHtml(jc.AssignedTechnician || '-') + '</td>' +
        '<td><span class="badge ' + priorityBadge(jc.Priority) + '">' + App.escHtml(jc.Priority || '-') + '</span></td>' +
        '<td>' + App.timeAgo(jc.StartDateTime) + '</td>' +
        '<td><button class="btn btn-sm btn-primary" onclick="CloseJCForm(\'' + (jc.JobCardNo || '') + '\')">Close</button></td>' +
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

  window.CloseJCForm = function(jobCardNo) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" style="max-width:700px">' +
      '<div class="modal-header"><h3>Close: ' + App.escHtml(jobCardNo) + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Root Cause *</label>' +
            '<select class="form-select" id="cjc-rootcause">' +
              '<option value="">Select Root Cause</option>' +
              '<option value="Wear and Tear">Wear and Tear</option>' +
              '<option value="Design Defect">Design Defect</option>' +
              '<option value="Operator Error">Operator Error</option>' +
              '<option value="Lack of Maintenance">Lack of Maintenance</option>' +
              '<option value="Electrical Fault">Electrical Fault</option>' +
              '<option value="Mechanical Failure">Mechanical Failure</option>' +
              '<option value="Environmental">Environmental</option>' +
              '<option value="Other">Other</option>' +
            '</select></div>' +
          '<div class="form-group"><label class="form-label">Breakdown Type</label>' +
            '<select class="form-select" id="cjc-breakdown">' +
              '<option value="">Select Type</option>' +
              '<option value="Mechanical">Mechanical</option>' +
              '<option value="Electrical">Electrical</option>' +
              '<option value="Instrument">Instrument</option>' +
              '<option value="Utility">Utility</option>' +
              '<option value="Other">Other</option>' +
            '</select></div>' +
          '<div class="form-group"><label class="form-label">Working Time</label>' +
            '<input class="form-input" id="cjc-worktime" placeholder="e.g. 2h 30m"></div>' +
          '<div class="form-group"><label class="form-label">Downtime</label>' +
            '<input class="form-input" id="cjc-downtime" placeholder="e.g. 3h 15m"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Corrective Action *</label>' +
          '<textarea class="form-input" id="cjc-action" rows="3" placeholder="What was done to fix the issue..."></textarea></div>' +
        '<div class="form-group"><label class="form-label">Spare Parts Used</label>' +
          '<textarea class="form-input" id="cjc-spareparts" rows="2" placeholder="List parts used..."></textarea></div>' +
        '<div class="form-group"><label class="form-label">Final Remarks</label>' +
          '<textarea class="form-input" id="cjc-remarks" rows="2" placeholder="Additional notes..."></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="cjc-confirm">Close Job Card</button>' +
      '</div></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#cjc-confirm').onclick = function() {
      var rootCause = overlay.querySelector('#cjc-rootcause').value;
      var action = overlay.querySelector('#cjc-action').value;
      if (!rootCause) { App.showToast('Root cause is required', 'error'); return; }
      if (!action) { App.showToast('Corrective action is required', 'error'); return; }

      var btn = overlay.querySelector('#cjc-confirm');
      btn.textContent = 'Closing...';
      btn.disabled = true;

      API.call('closeJobCard', {
        id: jobCardNo,
        rootCause: rootCause,
        correctiveAction: action,
        spareParts: overlay.querySelector('#cjc-spareparts').value,
        finalRemarks: overlay.querySelector('#cjc-remarks').value,
        workingTime: overlay.querySelector('#cjc-worktime').value,
        downtime: overlay.querySelector('#cjc-downtime').value,
        breakdownType: overlay.querySelector('#cjc-breakdown').value
      }).then(function() {
        overlay.remove();
        App.showToast('Job card closed successfully', 'success');
        load();
      }).catch(function(err) {
        btn.textContent = 'Close Job Card';
        btn.disabled = false;
        App.showToast('Error: ' + err.message, 'error');
      });
    };

    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  };
})();
