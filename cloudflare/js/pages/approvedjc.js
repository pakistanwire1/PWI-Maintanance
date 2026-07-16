/* ============================================================
   approvedjc.js — Approve Job Cards Page Module
   GAS-identical: ApproveJobCardPage.html
   Features: Table with search/filter, Time-summary modal,
   approve/return decision with remarks, button disabling.
   ============================================================ */

(function() {
  var _allJobs = [];
  var _currentPage = 1;

  App.registerPage('approvejobcard', render, load);

  function render() {
    var el = document.getElementById('page-approvejobcard');
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);box-shadow:0 0 8px rgba(34,197,94,0.4);vertical-align:middle;margin-right:8px"></span>' +
            'Approve Jobs' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="jcaSearch" placeholder="Search pending approvals...">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group"><select class="form-control" id="jcaDeptFilter"><option value="">All Departments</option></select></div>' +
        '</div>' +
        '<div id="jcaTableContainer"></div>' +
      '</div>' +
      '<div class="modal-overlay" id="jcaModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);box-shadow:0 0 8px rgba(34,197,94,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Approve Job \u2014 <span id="jcaRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="ApproveJC.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="jcaForm" onsubmit="return ApproveJC.submitFromForm(event)">' +
            '<input type="hidden" name="JobCardNo" id="jcaJobNo">' +
            '<div class="modal-body">' +
              '<div class="time-summary-panel">' +
                '<div class="ts-header">Job Summary</div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Department</span><span class="ts-stat-value" id="jcaDept">\u2014</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Machine</span><span class="ts-stat-value" id="jcaMachine">\u2014</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Technician</span><span class="ts-stat-value" id="jcaTech">\u2014</span></div>' +
                '</div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Waiting Time</span><span class="ts-stat-value" id="jcaWaiting">00:00</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Working Time</span><span class="ts-stat-value" id="jcaWorking">00:00</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Total Downtime</span><span class="ts-stat-value" id="jcaBreakdown">00:00</span></div>' +
                '</div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Description</span><span class="ts-stat-value" id="jcaDesc" style="font-weight:400;font-size:12px">\u2014</span></div>' +
                '</div>' +
              '</div>' +
              '<div class="form-group" style="margin-top:16px">' +
                '<label>Approval Remarks</label>' +
                '<textarea id="jcaRemarks" class="form-control" rows="2" placeholder="Optional remarks..."></textarea>' +
              '</div>' +
              '<div class="form-group" style="margin-top:12px">' +
                '<label>Decision *</label>' +
                '<div style="display:flex;gap:24px;margin-top:8px">' +
                  '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="approveDecision" value="approve" checked><span style="font-size:14px;font-weight:500">Approve</span></label>' +
                  '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="approveDecision" value="return"><span style="font-size:14px;font-weight:500">Return to Technician</span></label>' +
                '</div>' +
              '</div>' +
              '<div class="form-group" id="jcaReturnReasonGroup" style="display:none"><label>Return Reason *</label><textarea name="ReturnReason" id="jcaReturnReason" class="form-control" rows="2" placeholder="Why is the job card being returned?"></textarea></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="ApproveJC.hideModal()">Cancel</button>' +
              '<button type="button" class="btn btn-warning" id="jcaReturnBtn" onclick="ApproveJC.submitDecision(\'return\')" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> Return to Technician</button>' +
              '<button type="button" class="btn btn-success" id="jcaApproveBtn" onclick="ApproveJC.submitDecision(\'approve\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Approve</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCardsByStatus', { status: 'Pending' })
      .then(function(data) {
        _allJobs = data.records || data || [];
        App.showLoading(false);
        populateSelects();
        renderTable();
        bindEvents();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load: ' + err.message, 'error');
      });
  }

  function bindEvents() {
    var searchEl = document.getElementById('jcaSearch');
    if (searchEl) searchEl.onkeyup = function() { filterCards(); };
    var deptFilter = document.getElementById('jcaDeptFilter');
    if (deptFilter) deptFilter.onchange = function() { filterCards(); };
    document.querySelectorAll('input[name="approveDecision"]').forEach(function(r) {
      r.addEventListener('change', toggleDecision);
    });
  }

  function populateSelects() {
    var deptFilter = document.getElementById('jcaDeptFilter');
    if (deptFilter) deptFilter.innerHTML = '<option value="">All Departments</option>';
    var depts = [];
    _allJobs.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
    });
    depts.sort().forEach(function(d) {
      if (deptFilter) deptFilter.innerHTML += '<option value="' + d + '">' + d + '</option>';
    });
  }

  function getFilteredCards() {
    var dept = (document.getElementById('jcaDeptFilter') || {}).value || '';
    var q = ((document.getElementById('jcaSearch') || {}).value || '').toLowerCase();
    var user = Auth.getUser();
    var userDept = user ? (user.department || '') : '';
    var isAdminUser = Auth.isAdmin();
    return _allJobs.filter(function(jc) {
      var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
      var as = (jc.ApprovalStatus || '').toLowerCase();
      if (s !== 'pending' || as === 'approved') return false;
      if (!isAdminUser && userDept && jc.Department !== userDept) return false;
      if (dept && jc.Department !== dept) return false;
      if (q) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(q) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(q) !== -1) ||
               (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(q) !== -1);
      }
      return true;
    });
  }

  function filterCards() {
    _currentPage = 1;
    renderTable();
  }

  function renderTable() {
    var container = document.getElementById('jcaTableContainer');
    if (!container) return;
    var list = getFilteredCards();
    if (list.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">&#9989;</div><div style="font-size:14px;font-weight:500">No pending approvals</div></div>';
      return;
    }
    var totalPages = Math.ceil(list.length / PAGE_SIZE);
    if (_currentPage > totalPages) _currentPage = totalPages;
    var start = (_currentPage - 1) * PAGE_SIZE;
    var pageCards = list.slice(start, start + PAGE_SIZE);

    var html = '<div style="overflow-x:auto"><table><thead><tr>' +
      '<th>Job Card No</th><th>Closed</th><th>Machine</th><th>Dept</th><th>Technician</th><th>Waiting</th><th>Working</th><th>Breakdown</th><th>Actions</th>' +
      '</tr></thead><tbody>';
    pageCards.forEach(function(jc) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + fmtDt(jc.DateTime || jc.CloseDateTime || '') + '</td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td>' + App.escHtml(jc.Department || '') + '</td>' +
        '<td>' + App.escHtml(jc.AssignedTechnician || '-') + '</td>' +
        '<td>' + fmtDur(jc.WaitingTime) + '</td>' +
        '<td>' + fmtDur(jc.WorkingTime) + '</td>' +
        '<td>' + fmtDur(jc.BreakdownTime) + '</td>' +
        '<td><button class="btn btn-sm btn-success" onclick="ApproveJC.openModal(\'' + App.escHtml(jc.JobCardNo || '') + '\')">Review</button></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    if (totalPages > 1) {
      html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:12px">' +
        '<button class="btn btn-sm btn-secondary" onclick="ApproveJC.prevPage()" ' + (_currentPage <= 1 ? 'disabled' : '') + '>&laquo; Prev</button>' +
        '<span style="font-size:12px;color:var(--text-muted)">Page ' + _currentPage + ' of ' + totalPages + '</span>' +
        '<button class="btn btn-sm btn-secondary" onclick="ApproveJC.nextPage()" ' + (_currentPage >= totalPages ? 'disabled' : '') + '>Next &raquo;</button></div>';
    }
    container.innerHTML = html;
  }

  function fmtDt(s) {
    if (!s) return '\u2014';
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtDur(val) {
    if (!val && val !== 0) return '00:00';
    var totalMin = Math.floor(Number(val) / 60000);
    if (isNaN(totalMin)) return val || '00:00';
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return pad(h) + ':' + pad(m);
  }

  function openModal(id) {
    if (!Auth.isAdmin() && !Auth.canApproveJobCard()) {
      App.showToast('You do not have permission to approve job cards', 'warning');
      return;
    }
    var item = _allJobs.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;
    var form = document.getElementById('jcaForm');
    if (form) form.reset();
    document.querySelectorAll('input[name="approveDecision"]').forEach(function(r) { if (r.value === 'approve') r.checked = true; });
    toggleDecision();
    var el = document.getElementById('jcaJobNo'); if (el) el.value = id;
    el = document.getElementById('jcaRef'); if (el) el.textContent = id;
    el = document.getElementById('jcaDept'); if (el) el.textContent = item.Department || '\u2014';
    el = document.getElementById('jcaMachine'); if (el) el.textContent = item.Machine || '\u2014';
    el = document.getElementById('jcaTech'); if (el) el.textContent = item.AssignedTechnician || '\u2014';
    el = document.getElementById('jcaDesc'); if (el) el.textContent = ((item.ComplaintDescription || '').substring(0, 100) + ((item.ComplaintDescription || '').length > 100 ? '...' : '')) || '\u2014';
    el = document.getElementById('jcaWaiting'); if (el) el.textContent = fmtDur(item.WaitingTime);
    el = document.getElementById('jcaWorking'); if (el) el.textContent = fmtDur(item.WorkingTime);
    el = document.getElementById('jcaBreakdown'); if (el) el.textContent = fmtDur(item.BreakdownTime);
    el = document.getElementById('jcaRemarks'); if (el) el.value = '';
    var modal = document.getElementById('jcaModal');
    if (modal) modal.style.display = 'flex';
  }

  function toggleDecision() {
    var decision = document.querySelector('input[name="approveDecision"]:checked');
    var isReturn = decision && decision.value === 'return';
    var el = document.getElementById('jcaReturnReasonGroup'); if (el) el.style.display = isReturn ? 'block' : 'none';
    el = document.getElementById('jcaReturnBtn'); if (el) el.style.display = isReturn ? '' : 'none';
    el = document.getElementById('jcaApproveBtn'); if (el) el.style.display = isReturn ? 'none' : '';
  }

  function hideModal() {
    var modal = document.getElementById('jcaModal');
    if (modal) modal.style.display = 'none';
  }

  function submitDecision(decision) {
    var id = document.getElementById('jcaJobNo').value;
    if (!id) return;
    var remarks = (document.getElementById('jcaRemarks') || {}).value || '';

    if (decision === 'return') {
      var reason = (document.getElementById('jcaReturnReason') || {}).value || '';
      if (!reason) { App.showToast('Please enter the return reason', 'error'); return; }
      var btn = document.getElementById('jcaReturnBtn');
      var approveBtn = document.getElementById('jcaApproveBtn');
      if (btn) btn.disabled = true;
      if (approveBtn) approveBtn.disabled = true;
      App.showLoading(true);
      API.call('returnJobCard', { id: id, ReturnReason: reason, ApprovalRemarks: remarks })
        .then(function() {
          App.showLoading(false);
          if (btn) btn.disabled = false;
          if (approveBtn) approveBtn.disabled = false;
          hideModal();
          App.showToast('Job card returned to Running', 'success');
          load();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
        })
        .catch(function(err) {
          App.showLoading(false);
          if (btn) btn.disabled = false;
          if (approveBtn) approveBtn.disabled = false;
          App.showToast(err.message || 'Failed to return job card', 'error');
        });
    } else {
      var btn = document.getElementById('jcaApproveBtn');
      var returnBtn = document.getElementById('jcaReturnBtn');
      if (btn) btn.disabled = true;
      if (returnBtn) returnBtn.disabled = true;
      App.showLoading(true);
      API.call('approveJobCard', { id: id, ApprovalStatus: 'Approved', ApprovalRemarks: remarks })
        .then(function() {
          App.showLoading(false);
          if (btn) btn.disabled = false;
          if (returnBtn) returnBtn.disabled = false;
          hideModal();
          App.showToast('Job card approved successfully', 'success');
          load();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
        })
        .catch(function(err) {
          App.showLoading(false);
          if (btn) btn.disabled = false;
          if (returnBtn) returnBtn.disabled = false;
          App.showToast(err.message || 'Failed to approve job card', 'error');
        });
    }
  }

  function submitFromForm(e) {
    e.preventDefault();
    var decision = document.querySelector('input[name="approveDecision"]:checked');
    submitDecision(decision ? decision.value : 'approve');
  }

  window.ApproveJC = {
    openModal: openModal,
    hideModal: hideModal,
    submitDecision: submitDecision,
    submitFromForm: submitFromForm,
    prevPage: function() { if (_currentPage > 1) { _currentPage--; renderTable(); } },
    nextPage: function() { var tp = Math.ceil(getFilteredCards().length / PAGE_SIZE); if (_currentPage < tp) { _currentPage++; renderTable(); } }
  };
})();
