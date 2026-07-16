/* ============================================================
   pendingjc.js — Pending Review Job Cards
   GAS-identical: PendingJobCardPage.html
   Features: Table with search/filters, Read-only View modal,
   Review modal (approve/return decision with remarks), repair images.
   ============================================================ */

(function() {
  var _allJobs = [];
  var _jobs = [];
  var _currentPage = 1;
  var PAGE_SIZE = 15;

  App.registerPage('pendingjc', render, load);

  function render() {
    var el = document.getElementById('page-pendingjc');
    el.innerHTML =
      '<div class="page-header">' +
        '<div class="page-title-row" style="display:flex;align-items:center;justify-content:space-between">' +
          '<div><h2>Pending Job Cards</h2><p style="color:var(--text-muted);font-size:13px;margin-top:4px">Review and approve completed job cards</p></div>' +
          '<button class="btn btn-secondary" id="pendingJcRefreshBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Refresh</button>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">Pending Review</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="pendingJcSearch" placeholder="Search pending jobs...">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group"><select class="form-control" id="pendingJcDeptFilter"><option value="">All Departments</option></select></div>' +
          '<div class="form-group"><select class="form-control" id="pendingJcTechnicianFilter"><option value="">All Technicians</option></select></div>' +
        '</div>' +
        '<div id="pendingJcTableContainer"></div>' +
      '</div>' +
      '<div class="modal-overlay" id="pendingJcModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--warning);box-shadow:0 0 8px rgba(234,179,8,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Review Job Card \u2014 <span id="pendingJcRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="PendingJC.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="pendingJcForm" onsubmit="return false">' +
            '<input type="hidden" name="JobCardNo" id="pendingJcJobNo">' +
            '<div class="modal-body">' +
              '<div class="view-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
                '<div class="view-section"><h4>Job Card Details</h4>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Machine</span><strong id="pjMachine" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Asset</span><strong id="pjAsset" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Department</span><strong id="pjDepartment" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Section</span><strong id="pjSection" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Priority</span><strong id="pjPriority" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Complaint</span><strong id="pjComplaint" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Assigned Technician(s)</span><strong id="pjTechnician" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Maintenance Team</span><strong id="pjTeam" style="font-size:13px">\u2014</strong></div>' +
                '</div>' +
                '<div class="view-section"><h4>Time Summary</h4>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Started</span><strong id="pjStarted" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Working Time</span><strong id="pjWorkingTime" style="font-size:13px">00:00</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Total Downtime</span><strong id="pjDowntime" style="font-size:13px">00:00</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Waiting Time</span><strong id="pjWaitingTime" style="font-size:13px">00:00</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Closed On</span><strong id="pjClosedOn" style="font-size:13px">\u2014</strong></div>' +
                  '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Pending Since</span><strong id="pjPendingSince" style="font-size:13px">\u2014</strong></div>' +
                '</div>' +
              '</div>' +
              '<div class="view-section" style="margin-top:16px"><h4>Work Details</h4>' +
                '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Root Cause</span><strong id="pjRootCause" style="font-size:13px">\u2014</strong></div>' +
                '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Corrective Action</span><strong id="pjCorrectiveAction" style="font-size:13px">\u2014</strong></div>' +
                '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Spare Parts</span><strong id="pjSpareParts" style="font-size:13px">\u2014</strong></div>' +
                '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Technician Remarks</span><strong id="pjRemarks" style="font-size:13px">\u2014</strong></div>' +
              '</div>' +
              '<div class="form-group" style="margin-top:16px"><label>Repair Images</label><div id="pjRepairImages" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div></div>' +
              '<div class="view-section" style="margin-top:16px"><h4>Supervisor Review</h4>' +
                '<div class="form-group"><label>Supervisor Remarks</label><textarea name="ApprovalRemarks" class="form-control" rows="3" placeholder="Enter your review remarks..."></textarea></div>' +
                '<div class="form-group" style="margin-top:12px"><label>Decision *</label>' +
                  '<div style="display:flex;gap:24px;margin-top:8px">' +
                    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="pjDecision" value="approve" checked><span style="font-size:14px;font-weight:500">Approve</span></label>' +
                    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="pjDecision" value="return"><span style="font-size:14px;font-weight:500">Return to Technician</span></label>' +
                  '</div>' +
                '</div>' +
                '<div class="form-group" id="pjReturnReasonGroup" style="display:none"><label>Return Reason *</label><textarea name="ReturnReason" class="form-control" rows="2" placeholder="Why is the job card being returned?"></textarea></div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="PendingJC.hideModal()">Cancel</button>' +
              '<button type="button" class="btn btn-warning" id="pjReturnBtn" onclick="PendingJC.submitDecision(\'return\')" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> Return to Technician</button>' +
              '<button type="submit" class="btn btn-success" id="pjApproveBtn" onclick="PendingJC.submitDecision(\'approve\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Approve Job Card</button>' +
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
        applyDepartmentScope();
        _jobs = _allJobs.slice();
        App.showLoading(false);
        populateFilters();
        renderTable();
        bindEvents();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load: ' + err.message, 'error');
      });
  }

  function applyDepartmentScope() {
    var user = Auth.getUser();
    if (!user || Auth.isAdmin()) return;
    var userDept = user.department || '';
    if (userDept) {
      _allJobs = _allJobs.filter(function(jc) { return jc.Department === userDept; });
    }
  }

  function bindEvents() {
    var refreshBtn = document.getElementById('pendingJcRefreshBtn');
    if (refreshBtn) refreshBtn.onclick = function() { load(); };
    var searchEl = document.getElementById('pendingJcSearch');
    if (searchEl) searchEl.onkeyup = function() { filterJobs(); };
    var deptFilter = document.getElementById('pendingJcDeptFilter');
    if (deptFilter) deptFilter.onchange = function() { filterJobs(); };
    var techFilter = document.getElementById('pendingJcTechnicianFilter');
    if (techFilter) techFilter.onchange = function() { filterJobs(); };
    document.querySelectorAll('input[name="pjDecision"]').forEach(function(r) {
      r.addEventListener('change', toggleDecision);
    });
  }

  function populateFilters() {
    var depts = [], techs = [];
    _allJobs.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
      if (jc.AssignedTechnician && techs.indexOf(jc.AssignedTechnician) === -1) techs.push(jc.AssignedTechnician);
    });
    var deptSel = document.getElementById('pendingJcDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = '<option value="">All Departments</option>';
      depts.sort().forEach(function(d) { var opt = document.createElement('option'); opt.value = d; opt.textContent = d; deptSel.appendChild(opt); });
    }
    var techSel = document.getElementById('pendingJcTechnicianFilter');
    if (techSel) {
      techSel.innerHTML = '<option value="">All Technicians</option>';
      techs.sort().forEach(function(t) { var opt = document.createElement('option'); opt.value = t; opt.textContent = t; techSel.appendChild(opt); });
    }
  }

  function filterJobs() {
    var q = (document.getElementById('pendingJcSearch') || {}).value || '';
    var dept = (document.getElementById('pendingJcDeptFilter') || {}).value || '';
    var tech = (document.getElementById('pendingJcTechnicianFilter') || {}).value || '';
    q = q.toLowerCase();
    _jobs = _allJobs.filter(function(jc) {
      if (dept && jc.Department !== dept) return false;
      if (tech && jc.AssignedTechnician !== tech) return false;
      if (q) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(q) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(q) !== -1) ||
               (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(q) !== -1) ||
               (jc.Department && jc.Department.toLowerCase().indexOf(q) !== -1);
      }
      return true;
    });
    _currentPage = 1;
    renderTable();
  }

  function renderTable() {
    var container = document.getElementById('pendingJcTableContainer');
    if (!container) return;
    if (_jobs.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">&#9989;</div><div style="font-size:14px;font-weight:500">No pending job cards</div></div>';
      return;
    }
    var totalPages = Math.ceil(_jobs.length / PAGE_SIZE);
    if (_currentPage > totalPages) _currentPage = totalPages;
    var start = (_currentPage - 1) * PAGE_SIZE;
    var pageJobs = _jobs.slice(start, start + PAGE_SIZE);
    var canReview = Auth.isAdmin() || Auth.canReviewPendingJobCard();

    var html = '<div style="overflow-x:auto"><table><thead><tr>' +
      '<th>Job Card No</th><th>Date</th><th>Dept</th><th>Section</th><th>Machine</th><th>Asset</th><th>Complaint</th><th>Priority</th><th>Technician(s)</th><th>Working</th><th>Downtime</th><th>Pending Since</th><th>Supervisor</th>' +
      (canReview ? '<th>Actions</th>' : '') +
      '</tr></thead><tbody>';
    pageJobs.forEach(function(jc) {
      var priClass = 'badge-secondary';
      var p = (jc.Priority || '').toLowerCase();
      if (p === 'critical' || p === 'high') priClass = 'badge-danger';
      else if (p === 'medium') priClass = 'badge-warning';
      else if (p === 'low') priClass = 'badge-success';

      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + fmtDt(jc.DateTime || jc.OpenDateTime || '') + '</td>' +
        '<td>' + App.escHtml(jc.Department || '') + '</td>' +
        '<td>' + App.escHtml(jc.Section || '') + '</td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td>' + App.escHtml(jc.Asset || jc.AssetID || '') + '</td>' +
        '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escHtml(jc.ComplaintDescription || '') + '</td>' +
        '<td><span class="badge ' + priClass + '">' + App.escHtml(jc.Priority || '') + '</span></td>' +
        '<td>' + App.escHtml(jc.AssignedTechnician || '-') + '</td>' +
        '<td>' + fmtDur(jc.WorkingTime) + '</td>' +
        '<td>' + fmtDur(jc.Downtime) + '</td>' +
        '<td>' + fmtDt(jc.PendingDateTime || '') + '</td>' +
        '<td>' + App.escHtml(jc.PendingBy || jc.AssignedTechnician || '-') + '</td>';
      if (canReview) {
        html += '<td style="white-space:nowrap">' +
          '<button class="btn btn-sm btn-secondary" onclick="PendingJC.viewModal(\'' + App.escHtml(jc.JobCardNo || '') + '\')">View</button> ' +
          '<button class="btn btn-sm btn-success" onclick="PendingJC.openReview(\'' + App.escHtml(jc.JobCardNo || '') + '\')">Review</button>' +
          '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (totalPages > 1) {
      html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:12px">' +
        '<button class="btn btn-sm btn-secondary" onclick="PendingJC.prevPage()" ' + (_currentPage <= 1 ? 'disabled' : '') + '>&laquo; Prev</button>' +
        '<span style="font-size:12px;color:var(--text-muted)">Page ' + _currentPage + ' of ' + totalPages + '</span>' +
        '<button class="btn btn-sm btn-secondary" onclick="PendingJC.nextPage()" ' + (_currentPage >= totalPages ? 'disabled' : '') + '>Next &raquo;</button></div>';
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

  function displayDuration(val) {
    if (!val && val !== 0) return '0h 0m';
    var totalMin = Math.floor(Number(val) / 60000);
    if (isNaN(totalMin)) return val || '0h 0m';
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return h + 'h ' + m + 'm';
  }

  /* Read-only View modal — matches GAS viewPendingJc() */
  function viewModal(id) {
    var item = _allJobs.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-overlay';
    backdrop.style.display = 'flex';

    var statusBadge = 'warning';
    var priBadge = 'badge-secondary';
    var p = (item.Priority || '').toLowerCase();
    if (p === 'critical' || p === 'high') priBadge = 'badge-danger';
    else if (p === 'medium') priBadge = 'badge-warning';
    else if (p === 'low') priBadge = 'badge-success';

    var imgsHtml = '';
    if (item.RepairImage) {
      var urls = item.RepairImage.split(',').map(function(u) { return u.trim(); }).filter(Boolean);
      urls.forEach(function(url) {
        var src = url.indexOf('http') === 0 ? url : 'https://drive.google.com/thumbnail?id=' + url;
        imgsHtml += '<img src="' + App.escHtml(src) + '" style="max-width:200px;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="showImagePreview(this.src)" onerror="this.style.display=\'none\'">';
      });
    }
    if (!imgsHtml) imgsHtml = '<span style="color:var(--text-muted)">No images</span>';

    var html =
      '<div class="modal modal-wide">' +
        '<div class="modal-header">' +
          '<div class="modal-title">Pending Job Card \u2014 ' + App.escHtml(id) + '</div>' +
          '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="view-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
            '<div class="view-section"><h4>Job Card Details</h4>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Job Card No</span><strong style="font-size:13px">' + App.escHtml(item.JobCardNo || '') + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Opened</span><strong style="font-size:13px">' + fmtDt(item.DateTime || item.OpenTime || item.OpenDateTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Machine</span><strong style="font-size:13px">' + App.escHtml(item.Machine || '-') + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Asset</span><strong style="font-size:13px">' + App.escHtml(item.Asset || item.AssetID || '-') + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Department</span><strong style="font-size:13px">' + App.escHtml(item.Department || '-') + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Section</span><strong style="font-size:13px">' + App.escHtml(item.Section || '-') + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Priority</span><strong style="font-size:13px"><span class="badge ' + priBadge + '">' + App.escHtml(item.Priority || '-') + '</span></strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Complaint</span><strong style="font-size:13px">' + App.escHtml(item.ComplaintDescription || '-') + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Technician(s)</span><strong style="font-size:13px">' + App.escHtml(item.AssignedTechnician || '-') + '</strong></div>' +
            '</div>' +
            '<div class="view-section"><h4>Time Summary</h4>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Started</span><strong style="font-size:13px">' + fmtDt(item.StartTime || item.StartDateTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Closed</span><strong style="font-size:13px">' + fmtDt(item.CloseTime || item.CloseDateTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Waiting Time</span><strong style="font-size:13px">' + displayDuration(item.WaitingTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Working Time</span><strong style="font-size:13px">' + displayDuration(item.WorkingTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Total Downtime</span><strong style="font-size:13px">' + displayDuration(item.Downtime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Pending Since</span><strong style="font-size:13px">' + fmtDt(item.PendingDateTime) + '</strong></div>' +
            '</div>' +
          '</div>' +
          '<div class="view-section" style="margin-top:16px"><h4>Work Details</h4>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Root Cause</span><strong style="font-size:13px">' + App.escHtml(item.RootCause || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Corrective Action</span><strong style="font-size:13px">' + App.escHtml(item.CorrectiveAction || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Spare Parts</span><strong style="font-size:13px">' + App.escHtml(item.SpareParts || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Technician Remarks</span><strong style="font-size:13px">' + App.escHtml(item.FinalRemarks || item.Remarks || '-') + '</strong></div>' +
          '</div>' +
          '<div class="view-section" style="margin-top:16px"><h4>Repair Images</h4>' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">' + imgsHtml + '</div>' +
          '</div>' +
          '<div style="margin-top:16px"><span class="badge badge-' + statusBadge + '" style="font-size:13px;padding:5px 14px">Status: PENDING</span></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
        '</div>' +
      '</div>';

    backdrop.innerHTML = html;
    backdrop.onclick = function(e) { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
  }

  function openReview(id) {
    if (!Auth.canReviewPendingJobCard() && !Auth.isAdmin()) {
      App.showToast('You do not have permission to review job cards', 'warning');
      return;
    }
    var item = _allJobs.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;
    var form = document.getElementById('pendingJcForm');
    if (form) form.reset();
    document.querySelectorAll('input[name="pjDecision"]').forEach(function(r) { if (r.value === 'approve') r.checked = true; });
    toggleDecision();
    var el = document.getElementById('pendingJcJobNo'); if (el) el.value = id;
    el = document.getElementById('pendingJcRef'); if (el) el.textContent = id;
    el = document.getElementById('pjMachine'); if (el) el.textContent = item.Machine || '\u2014';
    el = document.getElementById('pjAsset'); if (el) el.textContent = item.Asset || item.AssetID || '\u2014';
    el = document.getElementById('pjDepartment'); if (el) el.textContent = item.Department || '\u2014';
    el = document.getElementById('pjSection'); if (el) el.textContent = item.Section || '\u2014';
    el = document.getElementById('pjPriority'); if (el) el.textContent = item.Priority || '\u2014';
    el = document.getElementById('pjComplaint'); if (el) el.textContent = item.ComplaintDescription || '\u2014';
    el = document.getElementById('pjTechnician'); if (el) el.textContent = item.AssignedTechnician || '\u2014';
    el = document.getElementById('pjTeam'); if (el) el.textContent = item.MaintenanceTeam || '\u2014';
    el = document.getElementById('pjStarted'); if (el) el.textContent = fmtDt(item.StartTime || item.StartDateTime);
    el = document.getElementById('pjWorkingTime'); if (el) el.textContent = displayDuration(item.WorkingTime);
    el = document.getElementById('pjDowntime'); if (el) el.textContent = displayDuration(item.Downtime);
    el = document.getElementById('pjWaitingTime'); if (el) el.textContent = displayDuration(item.WaitingTime);
    el = document.getElementById('pjClosedOn'); if (el) el.textContent = fmtDt(item.CloseTime || item.CloseDateTime);
    el = document.getElementById('pjPendingSince'); if (el) el.textContent = fmtDt(item.PendingDateTime);
    el = document.getElementById('pjRootCause'); if (el) el.textContent = item.RootCause || '\u2014';
    el = document.getElementById('pjCorrectiveAction'); if (el) el.textContent = item.CorrectiveAction || '\u2014';
    el = document.getElementById('pjSpareParts'); if (el) el.textContent = item.SpareParts || '\u2014';
    el = document.getElementById('pjRemarks'); if (el) el.textContent = item.FinalRemarks || item.Remarks || '\u2014';

    var imgContainer = document.getElementById('pjRepairImages');
    if (imgContainer) {
      imgContainer.innerHTML = '';
      if (item.RepairImage) {
        var urls = item.RepairImage.split(',').map(function(u) { return u.trim(); }).filter(Boolean);
        urls.forEach(function(url) {
          var img = document.createElement('img');
          img.src = url.indexOf('http') === 0 ? url : 'https://drive.google.com/thumbnail?id=' + url;
          img.alt = 'Repair Image';
          img.style.cssText = 'max-width:160px;max-height:120px;border-radius:6px;border:1px solid var(--border);cursor:pointer';
          img.onclick = function() { showImagePreview(img.src); };
          img.onerror = function() { this.style.display = 'none'; };
          imgContainer.appendChild(img);
        });
      }
      if (!imgContainer.children.length) {
        imgContainer.innerHTML = '<span style="color:var(--text-muted)">No images</span>';
      }
    }
    var modal = document.getElementById('pendingJcModal');
    if (modal) modal.style.display = 'flex';
  }

  function toggleDecision() {
    var decision = document.querySelector('input[name="pjDecision"]:checked');
    var isReturn = decision && decision.value === 'return';
    var el = document.getElementById('pjReturnReasonGroup'); if (el) el.style.display = isReturn ? 'block' : 'none';
    el = document.getElementById('pjReturnBtn'); if (el) el.style.display = isReturn ? '' : 'none';
    el = document.getElementById('pjApproveBtn'); if (el) el.style.display = isReturn ? 'none' : '';
  }

  function hideModal() {
    var modal = document.getElementById('pendingJcModal');
    if (modal) modal.style.display = 'none';
  }

  function submitDecision(decision) {
    var id = document.getElementById('pendingJcJobNo').value;
    if (!id) return;
    var remarks = (document.querySelector('#pendingJcForm textarea[name="ApprovalRemarks"]') || {}).value || '';

    if (decision === 'return') {
      var reason = (document.querySelector('#pendingJcForm textarea[name="ReturnReason"]') || {}).value || '';
      if (!reason) { App.showToast('Please enter the return reason', 'error'); return; }
      App.showLoading(true);
      API.call('returnJobCard', { id: id, ReturnReason: reason, ApprovalRemarks: remarks })
        .then(function() {
          App.showLoading(false);
          hideModal();
          App.showToast('Job card returned to Running', 'success');
          load();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to return job card', 'error');
        });
    } else {
      App.showLoading(true);
      API.call('approveJobCard', { id: id, ApprovalRemarks: remarks })
        .then(function() {
          App.showLoading(false);
          hideModal();
          App.showToast('Job card approved successfully', 'success');
          load();
          if (typeof refreshDashboardCounters === 'function') refreshDashboardCounters();
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast(err.message || 'Failed to approve job card', 'error');
        });
    }
  }

  window.PendingJC = {
    openReview: openReview,
    viewModal: viewModal,
    hideModal: hideModal,
    submitDecision: submitDecision,
    prevPage: function() { if (_currentPage > 1) { _currentPage--; renderTable(); } },
    nextPage: function() { var tp = Math.ceil(_jobs.length / PAGE_SIZE); if (_currentPage < tp) { _currentPage++; renderTable(); } }
  };
})();
