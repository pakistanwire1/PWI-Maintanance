var ClosedJobCard = (function() {
  var state = { data: [], page: 1, timer: null, breakdownTypes: [] };

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>';
  var ICON_UPLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

  var PAGE_SIZE = 10;

  function formatDuration(ms) {
    if (!ms || ms < 0) ms = 0;
    var totalMinutes = Math.floor(ms / 60000);
    var days = Math.floor(totalMinutes / 1440);
    var hours = Math.floor((totalMinutes % 1440) / 60);
    var minutes = totalMinutes % 60;
    var parts = [];
    if (days > 0) parts.push(days + 'd');
    if (hours > 0 || days > 0) parts.push(hours + 'h');
    parts.push(minutes + 'm');
    return parts.join(' ');
  }

  function formatDurationFromDates(startStr) {
    if (!startStr) return '\u2014';
    var start = new Date(startStr);
    var end = new Date();
    return formatDuration(end.getTime() - start.getTime());
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
      '<div id="closejobcardPage" class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px var(--primary-glow);vertical-align:middle;margin-right:8px"></span>' +
            'Close Job Card \u2014 Running Jobs' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              ICON_SEARCH +
              '<input type="text" class="form-control" id="closeJcSearch" placeholder="Search running jobs..." onkeyup="ClosedJobCard.search()">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<select class="form-control" id="closeJcDeptFilter" onchange="ClosedJobCard.filter()">' +
              '<option value="">All Departments</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="closeJcTechnicianFilter" onchange="ClosedJobCard.filter()">' +
              '<option value="">All Technicians</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="closeJcTableContainer"></div>' +
      '</div></div>' +

      '<div class="modal-overlay" id="closeJcModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);box-shadow:0 0 8px rgba(34,197,94,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Close Job \u2014 <span id="closeJcRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="ClosedJobCard.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="closeJcForm" onsubmit="return ClosedJobCard.save(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="JobCardNo" id="closeJcJobNo">' +
              '<input type="hidden" name="CurrentStatus" value="PENDING">' +
              '<div class="time-summary-panel">' +
                '<div class="ts-header">Time Summary</div>' +
                '<div class="ts-timeline">' +
                  '<div class="ts-node"><div class="ts-dot ts-dot-created"></div><div class="ts-body"><span class="ts-body-label">Opened</span><span class="ts-body-time" id="closeJcOpenedDisplay">\u2014</span></div></div>' +
                  '<div class="ts-line"></div>' +
                  '<div class="ts-node"><div class="ts-dot ts-dot-start"></div><div class="ts-body"><span class="ts-body-label">Started</span><span class="ts-body-time" id="closeJcStartedDisplay">\u2014</span></div></div>' +
                  '<div class="ts-line"></div>' +
                  '<div class="ts-node"><div class="ts-dot ts-dot-close"></div><div class="ts-body"><span class="ts-body-label">Closed</span><span class="ts-body-time" id="closeJcClosedDisplay">\u2014</span></div></div>' +
                '</div>' +
                '<div class="ts-divider"></div>' +
                '<div class="ts-stats">' +
                  '<div class="ts-stat"><span class="ts-stat-label">Waiting Time</span><span class="ts-stat-value ts-stat-waiting" id="closeJcWaitingDisplay">0h 0m</span><span class="ts-stat-desc">Opened \u2192 Started</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Working Time</span><span class="ts-stat-value ts-stat-working" id="closeJcWorkingDisplay">0h 0m</span><span class="ts-stat-desc">Started \u2192 Closed</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Total Downtime</span><span class="ts-stat-value ts-stat-breakdown" id="closeJcBreakdownDisplay">0h 0m</span><span class="ts-stat-desc">Opened \u2192 Closed</span></div>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Breakdown Type *</label>' +
                  '<select name="BreakdownType" class="form-control" id="closeJcBreakdownType" required>' +
                    '<option value="">Select Breakdown Type</option>' +
                  '</select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Root Cause *</label>' +
                  '<input type="text" name="RootCause" id="closeJcRootCause" class="form-control" placeholder="Root cause of failure" required>' +
                  '<div style="display:flex;gap:6px;margin-top:4px">' +
                    '<button type="button" class="btn btn-sm btn-secondary" onclick="ClosedJobCard.addVoiceButton(\'closeJcRootCause\')" style="font-size:11px;padding:3px 8px">' +
                      ICON_MIC + ' Voice Input' +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Spare Parts Used</label>' +
                  '<input type="text" name="SpareParts" class="form-control" placeholder="Parts, spares, materials used">' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Corrective Action *</label>' +
                '<textarea name="CorrectiveAction" id="closeJcCorrectiveAction" class="form-control" rows="3" placeholder="Actions performed to resolve the issue..." required></textarea>' +
                '<div style="display:flex;gap:6px;margin-top:4px">' +
                  '<button type="button" class="btn btn-sm btn-secondary" onclick="ClosedJobCard.addVoiceButton(\'closeJcCorrectiveAction\')" style="font-size:11px;padding:3px 8px">' +
                    ICON_MIC + ' Voice Input' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Final Remarks</label>' +
                '<textarea name="FinalRemarks" id="closeJcFinalRemarks" class="form-control" rows="2" placeholder="Additional notes..."></textarea>' +
                '<div style="display:flex;gap:6px;margin-top:4px">' +
                  '<button type="button" class="btn btn-sm btn-secondary" onclick="ClosedJobCard.addVoiceButton(\'closeJcFinalRemarks\')" style="font-size:11px;padding:3px 8px">' +
                    ICON_MIC + ' Voice Input' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Repair Image</label>' +
                '<div class="image-upload-area" id="closeRepairImageArea">' +
                  '<input type="file" accept="image/*" id="closeRepairImageInput" style="display:none" onchange="ClosedJobCard.handleRepairImageSelect(event)">' +
                  '<input type="file" accept="image/*" capture="environment" id="closeRepairCameraInput" style="display:none" onchange="ClosedJobCard.handleRepairImageSelect(event)">' +
                  '<input type="hidden" name="RepairImage" id="closeRepairImageData">' +
                  '<div class="upload-placeholder" onclick="showCameraMenu(\'closeRepairImageInput\',{title:\'Repair Photo\',capture:\'environment\'})" style="flex-direction:column;gap:8px">' +
                    ICON_UPLOAD +
                    '<span>Tap to Upload or Take Photo</span>' +
                    '<small>Supports: JPG, PNG, WEBP (max 5MB)</small>' +
                  '</div>' +
                  '<div class="image-preview" id="closeRepairImagePreview" style="display:none">' +
                    '<img id="closeRepairImagePreviewImg" alt="Repair Image Preview">' +
                    '<button type="button" class="image-remove-btn" onclick="ClosedJobCard.removeRepairImage()">&times;</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div style="margin-bottom:0">' +
                '<small style="color:var(--text-muted);font-size:11px">' +
                  'Close Date & Time will be captured automatically. ' +
                  'All durations calculated automatically. ' +
                  'Status will change from <strong>Running</strong> to <strong>Pending (Review)</strong>.' +
                '</small>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="ClosedJobCard.hideModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-success">' +
                ICON_CHECK + ' Complete & Close' +
              '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function loadData() {
    Loader.show();
    API.post('getJobCards', {}).then(function(data) {
      var records = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
      state.data = records.filter(function(jc) {
        var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
        return s === 'running';
      });
      Loader.hide();
      populateSelects();
      renderTable();
    }).catch(function() {
      Loader.hide();
      Notify.error('Failed to load job cards');
    });
  }

  function populateSelects() {
    var deptFilter = document.getElementById('closeJcDeptFilter');
    var techFilter = document.getElementById('closeJcTechnicianFilter');
    if (deptFilter) deptFilter.innerHTML = '<option value="">All Departments</option>';
    if (techFilter) techFilter.innerHTML = '<option value="">All Technicians</option>';
    var depts = [], techs = [];
    state.data.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
      if (jc.AssignedTechnician && techs.indexOf(jc.AssignedTechnician) === -1) techs.push(jc.AssignedTechnician);
    });
    depts.sort().forEach(function(d) { if (deptFilter) deptFilter.innerHTML += '<option value="' + d + '">' + d + '</option>'; });
    techs.sort().forEach(function(t) { if (techFilter) techFilter.innerHTML += '<option value="' + t + '">' + t + '</option>'; });

    API.post('getBreakdownTypes', {}).then(function(types) {
      state.breakdownTypes = (types || []).filter(function(t) {
        var s = (t.Status || '').toLowerCase();
        return s === 'active';
      });
      var sel = document.getElementById('closeJcBreakdownType');
      if (sel) {
        sel.innerHTML = '<option value="">Select Breakdown Type</option>';
        state.breakdownTypes.forEach(function(t) {
          var opt = document.createElement('option');
          opt.value = t.TypeName || '';
          opt.textContent = t.TypeName || '';
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});
  }

  function getFilteredData() {
    var dept = document.getElementById('closeJcDeptFilter') ? document.getElementById('closeJcDeptFilter').value : '';
    var tech = document.getElementById('closeJcTechnicianFilter') ? document.getElementById('closeJcTechnicianFilter').value : '';
    var query = document.getElementById('closeJcSearch') ? document.getElementById('closeJcSearch').value.toLowerCase() : '';
    var list = state.data;
    var userDept = getUserDept();
    var isAdminUser = Session.getUser() && (Session.getUser().role === 'Admin' || Session.getUser().isSystemAdmin);
    if (!isAdminUser && userDept) list = list.filter(function(jc) { return jc.Department === userDept; });
    if (dept) list = list.filter(function(jc) { return jc.Department === dept; });
    if (tech) list = list.filter(function(jc) { return jc.AssignedTechnician === tech; });
    if (query) {
      list = list.filter(function(jc) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(query) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(query) !== -1) ||
               (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(query) !== -1);
      });
    }
    return list;
  }

  function renderTable() {
    var list = getFilteredData();
    var canClose = Session.getUser() && (Session.getUser().role === 'Admin' || Session.getUser().isSystemAdmin || hasPermission('closeJobCard'));

    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('closeJcTableContainer');
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
      { key: 'DateTime', label: 'Opened', datetime: true },
      { key: 'Machine', label: 'Machine' },
      { key: 'Department', label: 'Dept' },
      { key: 'AssignedTechnician', label: 'Technician' },
      { key: '_working', label: 'Working', format: function(val, row) {
        var st = row.StartTime || row.StartDateTime;
        return '<span class="live-timer" data-start="' + (st || '') + '">' + formatDurationFromDates(st) + '</span>';
      }}
    ];

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    if (canClose) html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        if (col.format) {
          val = col.format(val, row);
        } else if (col.badge && val) {
          var badgeMap = col.badgeMap || {};
          var badgeClass = badgeMap[val] || 'primary';
          val = '<span class="badge badge-' + badgeClass + '">' + Utils.escapeHtml(String(val)) + '</span>';
        } else if (col.datetime && val) {
          val = Utils.formatDateTime(val);
        } else if (typeof val === 'string') {
          val = Utils.escapeHtml(val);
        }
        html += '<td>' + val + '</td>';
      });

      if (canClose) {
        html += '<td><div class="actions-cell">';
        html += '<button class="icon-btn icon-btn-success" onclick="ClosedJobCard.open(\'' + row.JobCardNo + '\')" title="Close">' + ICON_CHECK + '</button>';
        html += '</div></td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + list.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="ClosedJobCard.goPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var i = 1; i <= totalPages; i++) {
        html += '<button class="' + (i === p ? 'active' : '') + '" onclick="ClosedJobCard.goPage(' + i + ')">' + i + '</button>';
      }
      html += '<button onclick="ClosedJobCard.goPage(' + (p + 1) + ')" ' + (p >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
    startLiveTimers();
  }

  function startLiveTimers() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function() {
      document.querySelectorAll('#closeJcTableContainer .live-timer').forEach(function(el) {
        var start = el.getAttribute('data-start');
        if (start) el.textContent = formatDurationFromDates(start);
      });
    }, 60000);
  }

  function openCloseJc(id) {
    if (!hasPermission('closeJobCard') && !(Session.getUser() && Session.getUser().role === 'Admin')) {
      Notify.warning('You do not have permission to close job cards');
      return;
    }
    var item = null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].JobCardNo === id) { item = state.data[i]; break; }
    }
    if (!item) return;
    var form = document.getElementById('closeJcForm');
    if (form) form.reset();
    var el = document.getElementById('closeJcJobNo'); if (el) el.value = id;
    el = document.getElementById('closeJcRef'); if (el) el.textContent = id;
    updateTimeSummary();
    document.getElementById('closeJcModal').style.display = 'flex';
    setTimeout(function() {
      ClosedJobCard.addVoiceButton('closeJcCorrectiveAction');
      ClosedJobCard.addVoiceButton('closeJcFinalRemarks');
      ClosedJobCard.addVoiceButton('closeJcRootCause');
    }, 100);
  }

  function updateTimeSummary() {
    var jobNo = document.getElementById('closeJcJobNo') ? document.getElementById('closeJcJobNo').value : '';
    var item = null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].JobCardNo === jobNo) { item = state.data[i]; break; }
    }
    if (!item) return;
    var openedStr = item.DateTime || item.OpenTime || item.OpenDateTime;
    var startStr = item.StartTime || item.StartDateTime;
    var now = new Date();

    if (openedStr) {
      var el = document.getElementById('closeJcOpenedDisplay'); if (el) el.textContent = Utils.formatDateTime(openedStr);
      var waitingMs = (startStr ? new Date(startStr) : now).getTime() - new Date(openedStr).getTime();
      el = document.getElementById('closeJcWaitingDisplay'); if (el) el.textContent = formatDuration(waitingMs);
    }
    if (startStr) {
      var el = document.getElementById('closeJcStartedDisplay'); if (el) el.textContent = Utils.formatDateTime(startStr);
      var workingMs = now.getTime() - new Date(startStr).getTime();
      el = document.getElementById('closeJcWorkingDisplay'); if (el) el.textContent = formatDuration(workingMs);
    }
    var el = document.getElementById('closeJcClosedDisplay'); if (el) el.textContent = Utils.formatDateTime(now);
    if (openedStr) {
      var breakdownMs = now.getTime() - new Date(openedStr).getTime();
      el = document.getElementById('closeJcBreakdownDisplay'); if (el) el.textContent = formatDuration(breakdownMs);
    }
  }

  function handleRepairImageSelect(evt) {
    var file = evt.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Notify.error('Image must be less than 5MB');
      evt.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var el = document.getElementById('closeRepairImageData'); if (el) el.value = e.target.result;
      var preview = document.getElementById('closeRepairImagePreview');
      var placeholder = document.querySelector('#closeRepairImageArea .upload-placeholder');
      if (preview) preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      el = document.getElementById('closeRepairImagePreviewImg'); if (el) el.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeRepairImage() {
    var el = document.getElementById('closeRepairImageData'); if (el) el.value = '';
    el = document.getElementById('closeRepairImageInput'); if (el) el.value = '';
    el = document.getElementById('closeRepairCameraInput'); if (el) el.value = '';
    el = document.getElementById('closeRepairImagePreview'); if (el) el.style.display = 'none';
    var ph = document.querySelector('#closeRepairImageArea .upload-placeholder'); if (ph) ph.style.display = 'flex';
  }

  function saveCloseJc(e) {
    e.preventDefault();
    var form = document.getElementById('closeJcForm');
    if (!form) return false;
    var data = Forms.get('closeJcForm');
    var id = data.JobCardNo;
    if (!data.BreakdownType) {
      Notify.error('Please select Breakdown Type');
      return false;
    }
    if (!data.RootCause || !data.CorrectiveAction) {
      Notify.error('Please fill in Root Cause and Corrective Action');
      return false;
    }

    Loader.show();
    API.post('closeJobCard', { id: id, rootCause: data.RootCause, correctiveAction: data.CorrectiveAction, spareParts: data.SpareParts, finalRemarks: data.FinalRemarks, breakdownType: data.BreakdownType, repairImage: data.RepairImage }).then(function() {
      Loader.hide();
      document.getElementById('closeJcModal').style.display = 'none';
      Notify.success('Job card closed successfully');
      loadData();
    }).catch(function(err) {
      Loader.hide();
      Notify.error(err.message || 'Failed to close job card');
    });
    return false;
  }

  return {
    show: function() {
      if (state.timer) clearInterval(state.timer);
      state = { data: [], page: 1, timer: null, breakdownTypes: [] };
      renderPage();
      loadData();
    },
    search: function() { state.page = 1; renderTable(); },
    filter: function() { state.page = 1; renderTable(); },
    open: function(id) { openCloseJc(id); },
    save: function(e) { return saveCloseJc(e); },
    hideModal: function() { document.getElementById('closeJcModal').style.display = 'none'; },
    goPage: function(p) { state.page = p; renderTable(); },
    handleRepairImageSelect: function(evt) { handleRepairImageSelect(evt); },
    removeRepairImage: function() { removeRepairImage(); },
    addVoiceButton: function(textareaId) {
      var ta = document.getElementById(textareaId);
      if (!ta) return;
      var parent = ta.parentNode;
      if (parent.querySelector('.voice-input-added')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-secondary voice-input-added';
      btn.style.cssText = 'font-size:11px;padding:3px 8px;margin-top:4px';
      btn.title = 'Add voice input button';
      btn.innerHTML = ICON_MIC + ' Voice Input';
      btn.onclick = function() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          var recognition = new SpeechRecognition();
          recognition.lang = 'en-US';
          recognition.onresult = function(event) {
            ta.value += (ta.value ? ' ' : '') + event.results[0][0].transcript;
          };
          recognition.start();
        } else {
          Notify.info('Speech recognition not supported in this browser');
        }
      };
      parent.appendChild(btn);
    }
  };
})();
