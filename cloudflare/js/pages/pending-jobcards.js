var PendingJobCards = (function() {
  var state = { data: [], page: 1 };

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_RETURN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  var ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>';

  var PAGE_SIZE = 10;

  function formatDuration(ms) {
    if (!ms || ms < 0) ms = 0;
    var totalMinutes = Math.floor(ms / 60000);
    var days = Math.floor(totalMinutes / 1440);
    var hours = Math.floor((totalMinutes % 1440) / 60);
    var minutes = totalMinutes % 60;
    var totalHours = Math.floor(totalMinutes / 60);
    var hRemainder = totalMinutes % 60;
    var primary = '';
    if (days > 0) primary = days + ' Days ' + hours + 'h ' + minutes + 'm';
    else if (hours > 0) primary = hours + 'h ' + minutes + 'm';
    else primary = minutes + 'm';
    var secondary = totalHours + 'h ' + hRemainder + 'm';
    if (primary === secondary) return primary;
    return primary + '<br>' + secondary;
  }

  function formatDateTime(dt) {
    return Utils.formatDateTime(dt);
  }

  function hasPermission(perm) {
    var user = Session.getUser();
    if (!user) return false;
    if (user.role === 'Admin' || user.isSystemAdmin) return true;
    return !!user['can' + perm.charAt(0).toUpperCase() + perm.slice(1)];
  }

  function getUserDept() {
    var user = Session.getUser();
    return user ? (user.department || '') : '';
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="pendingjobcardPage" class="page">' +
        '<div class="page-header">' +
          '<div class="page-title-row">' +
            '<h1 class="page-title">Pending Job Cards</h1>' +
            '<button class="btn btn-outline" onclick="PendingJobCards.refresh()">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>' +
              ' Refresh' +
            '</button>' +
          '</div>' +
          '<p class="page-subtitle">Review and approve completed job cards</p>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Pending Review</div>' +
            '<div class="card-actions">' +
              '<div class="search-box">' +
                ICON_SEARCH +
                '<input type="text" class="form-control" id="pendingJcSearch" placeholder="Search pending jobs..." onkeyup="PendingJobCards.search()">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="filter-bar">' +
            '<div class="form-group">' +
              '<select class="form-control" id="pendingJcDeptFilter" onchange="PendingJobCards.filter()">' +
                '<option value="">All Departments</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<select class="form-control" id="pendingJcTechnicianFilter" onchange="PendingJobCards.filter()">' +
                '<option value="">All Technicians</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div id="pendingJcTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="pendingJcModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--warning);box-shadow:0 0 8px rgba(234,179,8,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Review Job Card \u2014 <span id="pendingJcRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="PendingJobCards.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="pendingJcForm" onsubmit="return false;">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="JobCardNo" id="pendingJcJobNo">' +

              '<div class="view-grid">' +
                '<div class="view-section">' +
                  '<h4>Job Card Details</h4>' +
                  '<div class="view-row"><span>Machine</span><strong id="pjMachine">\u2014</strong></div>' +
                  '<div class="view-row"><span>Asset</span><strong id="pjAsset">\u2014</strong></div>' +
                  '<div class="view-row"><span>Department</span><strong id="pjDepartment">\u2014</strong></div>' +
                  '<div class="view-row"><span>Section</span><strong id="pjSection">\u2014</strong></div>' +
                  '<div class="view-row"><span>Priority</span><strong id="pjPriority">\u2014</strong></div>' +
                  '<div class="view-row"><span>Complaint</span><strong id="pjComplaint">\u2014</strong></div>' +
                  '<div class="view-row"><span>Assigned Technician(s)</span><strong id="pjTechnician">\u2014</strong></div>' +
                  '<div class="view-row"><span>Maintenance Team</span><strong id="pjTeam">\u2014</strong></div>' +
                '</div>' +
                '<div class="view-section">' +
                  '<h4>Time Summary</h4>' +
                  '<div class="view-row"><span>Working Time</span><strong id="pjWorkingTime">00:00</strong></div>' +
                  '<div class="view-row"><span>Total Downtime</span><strong id="pjDowntime">00:00</strong></div>' +
                  '<div class="view-row"><span>Waiting Time</span><strong id="pjWaitingTime">00:00</strong></div>' +
                  '<div class="view-row"><span>Closed On</span><strong id="pjClosedOn">\u2014</strong></div>' +
                  '<div class="view-row"><span>Pending Since</span><strong id="pjPendingSince">\u2014</strong></div>' +
                '</div>' +
              '</div>' +

              '<div class="view-section" style="margin-top:16px">' +
                '<h4>Work Details</h4>' +
                '<div class="view-row"><span>Root Cause</span><strong id="pjRootCause">\u2014</strong></div>' +
                '<div class="view-row"><span>Corrective Action</span><strong id="pjCorrectiveAction">\u2014</strong></div>' +
                '<div class="view-row"><span>Spare Parts</span><strong id="pjSpareParts">\u2014</strong></div>' +
                '<div class="view-row"><span>Technician Remarks</span><strong id="pjRemarks">\u2014</strong></div>' +
              '</div>' +

              '<div class="form-group" style="margin-top:16px">' +
                '<label>Repair Images</label>' +
                '<div class="image-gallery" id="pjRepairImages"></div>' +
              '</div>' +

              '<div class="view-section" style="margin-top:16px">' +
                '<h4>Supervisor Review</h4>' +
                '<div class="form-group">' +
                  '<label>Supervisor Remarks</label>' +
                  '<textarea name="ApprovalRemarks" class="form-control" rows="3" placeholder="Enter your review remarks..."></textarea>' +
                '</div>' +
                '<div class="form-group" style="margin-top:12px">' +
                  '<label>Decision *</label>' +
                  '<div class="radio-group">' +
                    '<label class="radio-inline">' +
                      '<input type="radio" name="pjDecision" value="approve" checked>' +
                      '<span class="radio-label">Approve</span>' +
                    '</label>' +
                    '<label class="radio-inline">' +
                      '<input type="radio" name="pjDecision" value="return">' +
                      '<span class="radio-label">Return to Technician</span>' +
                    '</label>' +
                  '</div>' +
                '</div>' +
                '<div class="form-group" id="pjReturnReasonGroup" style="display:none">' +
                  '<label>Return Reason *</label>' +
                  '<textarea name="ReturnReason" class="form-control" rows="2" placeholder="Why is the job card being returned?"></textarea>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="PendingJobCards.hideModal()">Cancel</button>' +
              '<button type="button" class="btn btn-warning" id="pjReturnBtn" onclick="PendingJobCards.submitReview(\'return\')" style="display:none">' +
                ICON_RETURN + ' Return to Technician' +
              '</button>' +
              '<button type="submit" class="btn btn-success" id="pjApproveBtn" onclick="PendingJobCards.submitReview(\'approve\')">' +
                ICON_CHECK + ' Approve Job Card' +
              '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<style>' +
        '#pendingjobcardPage .image-gallery{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
        '#pendingjobcardPage .radio-group{display:flex;gap:24px;margin-top:8px}' +
        '#pendingjobcardPage .radio-inline{display:flex;align-items:center;gap:6px;cursor:pointer}' +
        '#pendingjobcardPage .radio-label{font-size:14px;font-weight:500}' +
        '#pendingjobcardPage .review-image:hover{opacity:0.85}' +
      '</style>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getJobCards', { status: 'Pending', pageSize: 100000 })
      .then(function(res) {
        var records = (res && res.records) ? res.records : (Array.isArray(res) ? res : []);
        state.data = records.filter(function(jc) {
          var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
          return s === 'pending';
        });
        Loader.hide();
        populateFilters();
        renderTable();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load pending job cards');
      });
  }

  function populateFilters() {
    var deptEl = document.getElementById('pendingJcDeptFilter');
    var techEl = document.getElementById('pendingJcTechnicianFilter');
    if (deptEl) deptEl.innerHTML = '<option value="">All Departments</option>';
    if (techEl) techEl.innerHTML = '<option value="">All Technicians</option>';
    var depts = [], techs = [];
    state.data.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
      if (jc.AssignedTechnician && techs.indexOf(jc.AssignedTechnician) === -1) techs.push(jc.AssignedTechnician);
    });
    depts.sort().forEach(function(d) { if (deptEl) deptEl.innerHTML += '<option value="' + d + '">' + d + '</option>'; });
    techs.sort().forEach(function(t) { if (techEl) techEl.innerHTML += '<option value="' + t + '">' + t + '</option>'; });
  }

  function renderTable() {
    var dept = document.getElementById('pendingJcDeptFilter') ? document.getElementById('pendingJcDeptFilter').value : '';
    var tech = document.getElementById('pendingJcTechnicianFilter') ? document.getElementById('pendingJcTechnicianFilter').value : '';
    var list = state.data;
    var userDept = getUserDept();
    var isAdminUser = Session.getUser() && (Session.getUser().role === 'Admin' || Session.getUser().isSystemAdmin);
    if (!isAdminUser && userDept) list = list.filter(function(jc) { return jc.Department === userDept; });
    if (dept) list = list.filter(function(jc) { return jc.Department === dept; });
    if (tech) list = list.filter(function(jc) { return jc.AssignedTechnician === tech; });
    var canReview = isAdminUser || hasPermission('reviewPendingJobCard');

    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('pendingJcTableContainer');
    if (!container) return;

    if (pageData.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Data Found</h3>' +
          '<p>No records available in this module.</p>' +
        '</div>';
      return;
    }

    var columns = [
      { key: 'JobCardNo', label: 'Job Card No' },
      { key: 'DateTime', label: 'Date', datetime: true },
      { key: 'Department', label: 'Dept' },
      { key: 'Section', label: 'Section' },
      { key: 'Machine', label: 'Machine' },
      { key: 'Asset', label: 'Asset' },
      { key: 'ComplaintDescription', label: 'Complaint' },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Low': 'success', 'Medium': 'warning', 'High': 'danger', 'Critical': 'danger' } },
      { key: 'AssignedTechnician', label: 'Technician(s)' },
      { key: 'WorkingTime', label: 'Working', format: function(val) { return formatDuration(val); } },
      { key: 'Downtime', label: 'Downtime', format: function(val) { return formatDuration(val); } },
      { key: 'PendingDateTime', label: 'Pending Since', datetime: true },
      { key: 'PendingBy', label: 'Supervisor' }
    ];

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        if (col.format) {
          val = col.format(val, row);
        } else if (col.badge && val) {
          var badgeMap = col.badgeMap || {};
          var mapKey = val;
          if (!(mapKey in badgeMap)) {
            mapKey = Object.keys(badgeMap).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
          }
          var badgeClass = badgeMap[mapKey] || 'primary';
          val = '<span class="badge badge-' + badgeClass + '">' + Utils.escapeHtml(String(val)) + '</span>';
        } else if (col.datetime && val) {
          val = Utils.formatDateTime(val);
        } else if (typeof val === 'string') {
          val = Utils.escapeHtml(val);
        }
        html += '<td>' + val + '</td>';
      });

      html += '<td><div class="actions-cell">';
      html += '<button class="icon-btn icon-btn-primary" onclick="PendingJobCards.viewJobCard(\'' + row.JobCardNo + '\')" title="View">' + ICON_VIEW + '</button>';
      if (canReview) {
        html += '<button class="icon-btn icon-btn-success" onclick="PendingJobCards.reviewJobCard(\'' + row.JobCardNo + '\')" title="Review">' + ICON_CHECK + '</button>';
      }
      html += '</div></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + list.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="PendingJobCards.goPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var i = 1; i <= totalPages; i++) {
        html += '<button class="' + (i === p ? 'active' : '') + '" onclick="PendingJobCards.goPage(' + i + ')">' + i + '</button>';
      }
      html += '<button onclick="PendingJobCards.goPage(' + (p + 1) + ')" ' + (p >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
  }

  function filter() { state.page = 1; renderTable(); }
  function refresh() { loadData(); }

  function search() {
    var q = document.getElementById('pendingJcSearch').value.toLowerCase();
    if (!q) { state.page = 1; loadData(); return; }
    var original = state.data;
    var filtered = original.filter(function(jc) {
      return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(q) !== -1) ||
             (jc.Machine && jc.Machine.toLowerCase().indexOf(q) !== -1) ||
             (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(q) !== -1) ||
             (jc.Department && jc.Department.toLowerCase().indexOf(q) !== -1);
    });
    state.data = filtered;
    state.page = 1;
    renderTable();
    state.data = original;
  }

  function viewJobCard(id) {
    var item = state.data.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;

    var html =
      '<div class="view-grid">' +
        '<div class="view-section">' +
          '<h4>Job Card Details</h4>' +
          '<div class="view-row"><span>Job Card No</span><strong>' + Utils.escapeHtml(item.JobCardNo) + '</strong></div>' +
          '<div class="view-row"><span>Opened</span><strong>' + formatDateTime(item.DateTime || item.OpenTime || item.OpenDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Machine</span><strong>' + Utils.escapeHtml(item.Machine || '-') + '</strong></div>' +
          '<div class="view-row"><span>Asset</span><strong>' + Utils.escapeHtml(item.Asset || item.AssetID || '-') + '</strong></div>' +
          '<div class="view-row"><span>Department</span><strong>' + Utils.escapeHtml(item.Department || '-') + '</strong></div>' +
          '<div class="view-row"><span>Section</span><strong>' + Utils.escapeHtml(item.Section || '-') + '</strong></div>' +
          '<div class="view-row"><span>Priority</span><strong><span class="badge badge-warning">' + Utils.escapeHtml(item.Priority) + '</span></strong></div>' +
          '<div class="view-row"><span>Complaint</span><strong>' + Utils.escapeHtml(item.ComplaintDescription || '-') + '</strong></div>' +
          '<div class="view-row"><span>Technician(s)</span><strong>' + Utils.escapeHtml(item.AssignedTechnician || '-') + '</strong></div>' +
          '<div class="view-row"><span>Created By</span><strong>' + Utils.escapeHtml(item.CreatedBy || '-') + '</strong></div>' +
          '<div class="view-row"><span>Updated By</span><strong>' + Utils.escapeHtml(item.UpdatedBy || '-') + '</strong></div>' +
          '<div class="view-row"><span>Last Updated</span><strong>' + formatDateTime(item.UpdatedAt) + '</strong></div>' +
        '</div>' +
        '<div class="view-section">' +
          '<h4>Time Summary</h4>' +
          '<div class="view-row"><span>Started</span><strong>' + formatDateTime(item.StartTime || item.StartDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Closed</span><strong>' + formatDateTime(item.CloseTime || item.CloseDateTime) + '</strong></div>' +
          '<div class="view-row"><span>Waiting Time</span><strong>' + formatDuration(item.WaitingTime) + '</strong></div>' +
          '<div class="view-row"><span>Working Time</span><strong>' + formatDuration(item.WorkingTime) + '</strong></div>' +
          '<div class="view-row"><span>Total Downtime</span><strong>' + formatDuration(item.Downtime) + '</strong></div>' +
          '<div class="view-row"><span>Pending Since</span><strong>' + formatDateTime(item.PendingDateTime) + '</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="view-section" style="margin-top:16px">' +
        '<h4>Work Details</h4>' +
        '<div class="view-row"><span>Root Cause</span><strong>' + Utils.escapeHtml(item.RootCause || '-') + '</strong></div>' +
        '<div class="view-row"><span>Corrective Action</span><strong>' + Utils.escapeHtml(item.CorrectiveAction || '-') + '</strong></div>' +
        '<div class="view-row"><span>Spare Parts</span><strong>' + Utils.escapeHtml(item.SpareParts || '-') + '</strong></div>' +
        '<div class="view-row"><span>Technician Remarks</span><strong>' + Utils.escapeHtml(item.FinalRemarks || item.Remarks || '-') + '</strong></div>' +
      '</div>' +
      '<div class="view-section" style="margin-top:16px">' +
        '<h4>Repair Images</h4>' +
        '<div id="pjViewImages">' + (item.RepairImage ? '<img src="' + item.RepairImage + '" style="max-width:200px;border-radius:8px;border:1px solid var(--border)">' : '<span class="text-muted">No images</span>') + '</div>' +
      '</div>' +
      '<div class="view-status-bar"><span class="badge badge-warning" style="font-size:13px;padding:5px 14px">Status: PENDING</span></div>';

    var viewModal = document.createElement('div');
    viewModal.className = 'modal-overlay';
    viewModal.style.display = 'flex';
    viewModal.innerHTML =
      '<div class="modal modal-wide">' +
        '<div class="modal-header">' +
          '<div class="modal-title">Pending Job Card \u2014 ' + Utils.escapeHtml(id) + '</div>' +
          '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' + html + '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
        '</div>' +
      '</div>';
    viewModal.onclick = function(e) { if (e.target === viewModal) viewModal.remove(); };
    document.body.appendChild(viewModal);
  }

  function reviewJobCard(id) {
    if (!hasPermission('reviewPendingJobCard') && !(Session.getUser() && Session.getUser().role === 'Admin')) {
      Notify.warning('You do not have permission to review job cards');
      return;
    }
    var item = state.data.find(function(r) { return r.JobCardNo === id; });
    if (!item) return;

    document.getElementById('pendingJcForm').reset();
    document.getElementById('pendingJcJobNo').value = id;
    document.getElementById('pendingJcRef').textContent = id;
    document.getElementById('pjMachine').textContent = item.Machine || '-';
    document.getElementById('pjAsset').textContent = item.Asset || item.AssetID || '-';
    document.getElementById('pjDepartment').textContent = item.Department || '-';
    document.getElementById('pjSection').textContent = item.Section || '-';
    document.getElementById('pjPriority').textContent = item.Priority || '-';
    document.getElementById('pjComplaint').textContent = item.ComplaintDescription || '-';
    document.getElementById('pjTechnician').textContent = item.AssignedTechnician || '-';
    document.getElementById('pjTeam').textContent = item.MaintenanceTeam || '-';
    document.getElementById('pjWorkingTime').textContent = formatDuration(item.WorkingTime);
    document.getElementById('pjDowntime').textContent = formatDuration(item.Downtime);
    document.getElementById('pjWaitingTime').textContent = formatDuration(item.WaitingTime);
    document.getElementById('pjClosedOn').textContent = formatDateTime(item.CloseTime || item.CloseDateTime);
    document.getElementById('pjPendingSince').textContent = formatDateTime(item.PendingDateTime);
    document.getElementById('pjRootCause').textContent = item.RootCause || '-';
    document.getElementById('pjCorrectiveAction').textContent = item.CorrectiveAction || '-';
    document.getElementById('pjSpareParts').textContent = item.SpareParts || '-';
    document.getElementById('pjRemarks').textContent = item.FinalRemarks || item.Remarks || '-';

    var imgContainer = document.getElementById('pjRepairImages');
    imgContainer.innerHTML = '';
    if (item.RepairImage) {
      var urls = item.RepairImage.split(',').map(function(u) { return u.trim(); }).filter(Boolean);
      urls.forEach(function(url) {
        var wrapper = document.createElement('div');
        wrapper.className = 'image-item';
        var img = document.createElement('img');
        img.src = url.indexOf('http') === 0 ? url : 'https://drive.google.com/thumbnail?id=' + url;
        img.alt = 'Repair Image';
        img.className = 'review-image';
        img.style.maxWidth = '160px';
        img.style.maxHeight = '120px';
        img.style.borderRadius = '6px';
        img.style.border = '1px solid var(--border)';
        img.style.cursor = 'pointer';
        img.onclick = function() { window.open(img.src, '_blank'); };
        wrapper.appendChild(img);
        imgContainer.appendChild(wrapper);
      });
    }
    if (!imgContainer.children.length) {
      imgContainer.innerHTML = '<span class="text-muted">No images</span>';
    }

    var radios = document.querySelectorAll('input[name="pjDecision"]');
    radios.forEach(function(r) {
      r.checked = r.value === 'approve';
      r.addEventListener('change', toggleDecision);
    });
    toggleDecision();

    document.getElementById('pendingJcModal').style.display = 'flex';
  }

  function toggleDecision() {
    var decision = document.querySelector('input[name="pjDecision"]:checked');
    var isReturn = decision && decision.value === 'return';
    var el;
    el = document.getElementById('pjReturnReasonGroup'); if (el) el.style.display = isReturn ? 'block' : 'none';
    el = document.getElementById('pjReturnBtn'); if (el) el.style.display = isReturn ? '' : 'none';
    el = document.getElementById('pjApproveBtn'); if (el) el.style.display = isReturn ? 'none' : '';
  }

  function hideModal() {
    document.getElementById('pendingJcModal').style.display = 'none';
  }

  function submitReview(decision) {
    var id = document.getElementById('pendingJcJobNo').value;
    if (!id) return;

    var remarks = document.querySelector('#pendingJcForm textarea[name="ApprovalRemarks"]').value.trim();

    if (decision === 'return') {
      var reason = document.querySelector('#pendingJcForm textarea[name="ReturnReason"]').value.trim();
      if (!reason) {
        Notify.error('Please enter the return reason');
        return;
      }
      Loader.show();
      API.post('returnJobCard', { id: id, ReturnReason: reason, ApprovalRemarks: remarks })
        .then(function() {
          Loader.hide();
          hideModal();
          Notify.success('Job card returned to Running');
          loadData();
        })
        .catch(function() {
          Loader.hide();
          Notify.error('Failed to return job card');
        });
    } else {
      Loader.show();
      API.post('approveJobCard', { id: id, ApprovalRemarks: remarks })
        .then(function() {
          Loader.hide();
          hideModal();
          Notify.success('Job card approved successfully');
          loadData();
        })
        .catch(function() {
          Loader.hide();
          Notify.error('Failed to approve job card');
        });
    }
  }

  return {
    show: renderPage,
    filter: filter,
    refresh: refresh,
    search: search,
    viewJobCard: viewJobCard,
    reviewJobCard: reviewJobCard,
    submitReview: submitReview,
    hideModal: hideModal,
    goPage: function(p) { state.page = p; renderTable(); }
  };
})();
