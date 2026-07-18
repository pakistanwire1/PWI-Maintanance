/* ============================================================
   approvedjc.js — Approved Job Cards (Read-Only)
   GAS-identical: ApproveJobCardPage.html
   Features: Table with search/filter, read-only View modal.
   ============================================================ */

(function() {
  var _allJobs = [];
  var _currentPage = 1;
  var PAGE_SIZE = 15;

  App.registerPage('approvejobcard', render, load);

  function render() {
    var el = document.getElementById('page-approvejobcard');
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);box-shadow:0 0 8px rgba(34,197,94,0.4);vertical-align:middle;margin-right:8px"></span>' +
            'Approved Job Cards' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="jcaSearch" placeholder="Search approved job cards...">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group"><select class="form-control" id="jcaDeptFilter"><option value="">All Departments</option></select></div>' +
        '</div>' +
        '<div id="jcaTableContainer"></div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCardsByStatus', { status: 'APPROVED' })
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
      if (s !== 'approved' && !(s === 'closed' && as === 'approved')) return false;
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
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">&#128203;</div><div style="font-size:14px;font-weight:500">No approved job cards</div></div>';
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
        '<td><button class="btn btn-sm btn-secondary" onclick="ApproveJC.viewModal(\'' + App.escHtml(jc.JobCardNo || '') + '\')">View</button></td>' +
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
    return durationToggle(val);
  }

  function viewModal(id) {
    var item = _allJobs.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-overlay';
    backdrop.style.display = 'flex';

    var priBadge = 'badge-secondary';
    var p = (item.Priority || '').toLowerCase();
    if (p === 'critical' || p === 'high') priBadge = 'badge-danger';
    else if (p === 'medium') priBadge = 'badge-warning';
    else if (p === 'low') priBadge = 'badge-success';

    var approvalBadge = 'badge-success';
    var approvalRemarks = item.ApprovalRemarks || '\u2014';

    var html =
      '<div class="modal modal-wide">' +
        '<div class="modal-header">' +
          '<div class="modal-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);box-shadow:0 0 8px rgba(34,197,94,0.4);vertical-align:middle;margin-right:8px"></span>' +
            'Approved Job Card \u2014 ' + App.escHtml(id) +
          '</div>' +
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
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Opened</span><strong style="font-size:13px">' + fmtDt(item.DateTime || item.OpenTime || item.OpenDateTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Started</span><strong style="font-size:13px">' + fmtDt(item.StartTime || item.StartDateTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Closed</span><strong style="font-size:13px">' + fmtDt(item.CloseTime || item.CloseDateTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Waiting Time</span><strong style="font-size:13px">' + durationToggle(item.WaitingTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Working Time</span><strong style="font-size:13px">' + durationToggle(item.WorkingTime) + '</strong></div>' +
              '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Total Downtime</span><strong style="font-size:13px">' + durationToggle(item.Downtime || item.BreakdownTime) + '</strong></div>' +
            '</div>' +
          '</div>' +
          '<div class="view-section" style="margin-top:16px"><h4>Work Details</h4>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Breakdown Type</span><strong style="font-size:13px">' + App.escHtml(item.BreakdownType || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Root Cause</span><strong style="font-size:13px">' + App.escHtml(item.RootCause || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Corrective Action</span><strong style="font-size:13px">' + App.escHtml(item.CorrectiveAction || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Spare Parts</span><strong style="font-size:13px">' + App.escHtml(item.SpareParts || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Technician Remarks</span><strong style="font-size:13px">' + App.escHtml(item.FinalRemarks || item.Remarks || '-') + '</strong></div>' +
          '</div>' +
          '<div class="view-section" style="margin-top:16px"><h4>Approval</h4>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Approval Status</span><strong style="font-size:13px"><span class="badge badge-success">APPROVED</span></strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:13px">Approved By</span><strong style="font-size:13px">' + App.escHtml(item.ApprovedBy || item.ApprovalBy || '-') + '</strong></div>' +
            '<div class="view-row" style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--text-muted);font-size:13px">Approval Remarks</span><strong style="font-size:13px">' + App.escHtml(approvalRemarks) + '</strong></div>' +
          '</div>' +
          '<div class="form-group" style="margin-top:16px"><label>Repair Images</label><div id="jcaViewImages" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
        '</div>' +
      '</div>';

    backdrop.innerHTML = html;
    backdrop.onclick = function(e) { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);

    var imgContainer = document.getElementById('jcaViewImages');
    if (imgContainer) {
      if (item.RepairImage) {
        var urls = item.RepairImage.split(',').map(function(u) { return u.trim(); }).filter(Boolean);
        urls.forEach(function(url) {
          var src = url.indexOf('http') === 0 ? url : 'https://drive.google.com/thumbnail?id=' + url;
          imgContainer.innerHTML += '<img src="' + App.escHtml(src) + '" style="max-width:200px;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="showImagePreview(this.src)" onerror="this.style.display=\'none\'">';
        });
      }
      if (!imgContainer.children.length) {
        imgContainer.innerHTML = '<span style="color:var(--text-muted)">No images</span>';
      }
    }
  }

  window.ApproveJC = {
    viewModal: viewModal,
    prevPage: function() { if (_currentPage > 1) { _currentPage--; renderTable(); } },
    nextPage: function() { var tp = Math.ceil(getFilteredCards().length / PAGE_SIZE); if (_currentPage < tp) { _currentPage++; renderTable(); } }
  };
})();
