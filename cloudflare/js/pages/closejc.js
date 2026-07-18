/* ============================================================
   closejc.js — Close Job Card
   GAS-identical: CloseJobCardPage.html
   Features: Table with search/filters, Time Summary panel,
   Breakdown Type (dynamic), Root Cause (text+voice),
   Corrective Action (textarea+voice), Final Remarks (textarea+voice),
   Spare Parts, Repair Image (camera/gallery), live timer.
   ============================================================ */

(function() {
  var _allJobs = [];
  var _jobs = [];
  var _currentPage = 1;
  var _timer = null;
  var PAGE_SIZE = 15;

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
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px var(--primary-glow);vertical-align:middle;margin-right:8px"></span>' +
            'Close Job Card \u2014 Running Jobs' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="closeJcSearch" placeholder="Search running jobs...">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<select class="form-control" id="closeJcDeptFilter"><option value="">All Departments</option></select>' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="closeJcTechnicianFilter"><option value="">All Technicians</option></select>' +
          '</div>' +
        '</div>' +
        '<div id="closeJcTableContainer"></div>' +
      '</div>' +
      '<div class="modal-overlay" id="closeJcModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);box-shadow:0 0 8px rgba(34,197,94,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Close Job \u2014 <span id="closeJcRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="CloseJC.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="closeJcForm" onsubmit="return false">' +
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
                  '<div class="ts-stat"><span class="ts-stat-label">Waiting Time</span><span class="ts-stat-value ts-stat-waiting" id="closeJcWaitingDisplay">0m</span><span class="ts-stat-desc">Opened \u2192 Started</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Working Time</span><span class="ts-stat-value ts-stat-working" id="closeJcWorkingDisplay">0m</span><span class="ts-stat-desc">Started \u2192 Closed</span></div>' +
                  '<div class="ts-stat"><span class="ts-stat-label">Total Downtime</span><span class="ts-stat-value ts-stat-breakdown" id="closeJcBreakdownDisplay">0m</span><span class="ts-stat-desc">Opened \u2192 Closed</span></div>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Breakdown Type *</label>' +
                  '<select name="BreakdownType" class="form-control" id="closeJcBreakdownType" required><option value="">Select Breakdown Type</option></select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Root Cause *</label>' +
                  '<input type="text" name="RootCause" id="closeJcRootCause" class="form-control" placeholder="Root cause of failure" required>' +
                  '<div style="display:flex;gap:6px;margin-top:4px">' +
                    '<button type="button" class="btn btn-sm btn-secondary closejc-voice-btn" data-target="closeJcRootCause" style="font-size:11px;padding:3px 8px">' +
                      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input' +
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
                  '<button type="button" class="btn btn-sm btn-secondary closejc-voice-btn" data-target="closeJcCorrectiveAction" style="font-size:11px;padding:3px 8px">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Final Remarks</label>' +
                '<textarea name="FinalRemarks" id="closeJcFinalRemarks" class="form-control" rows="2" placeholder="Additional notes..."></textarea>' +
                '<div style="display:flex;gap:6px;margin-top:4px">' +
                  '<button type="button" class="btn btn-sm btn-secondary closejc-voice-btn" data-target="closeJcFinalRemarks" style="font-size:11px;padding:3px 8px">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Repair Image</label>' +
                '<div class="image-upload-area" id="closeRepairImageArea">' +
                  '<input type="file" accept="image/*" id="closeRepairImageInput" style="display:none">' +
                  '<input type="file" accept="image/*" capture="environment" id="closeRepairCameraInput" style="display:none">' +
                  '<input type="hidden" name="RepairImage" id="closeRepairImageData">' +
                  '<div class="upload-placeholder" id="closeRepairImagePlaceholder" style="flex-direction:column;gap:8px;cursor:pointer">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                    '<span>Tap to Upload or Take Photo</span>' +
                    '<small>Supports: JPG, PNG, WEBP (max 5MB)</small>' +
                  '</div>' +
                  '<div class="image-preview" id="closeRepairImagePreview" style="display:none">' +
                    '<img id="closeRepairImagePreviewImg" alt="Repair Image Preview">' +
                    '<button type="button" class="image-remove-btn" id="closejc-remove-image">&times;</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div style="margin-bottom:0"><small style="color:var(--text-muted);font-size:11px">Close Date &amp; Time will be captured automatically. All durations calculated automatically. Status will change from <strong>Running</strong> to <strong>Pending (Review)</strong>.</small></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="CloseJC.hideModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-success" id="closeJcSubmitBtn">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Complete &amp; Close' +
              '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCardsByStatus', { status: 'Running' })
      .then(function(data) {
        _allJobs = data.records || data || [];
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

    API.call('getBreakdownTypes').then(function(types) {
      var active = (types || []).filter(function(t) { return t.Status === 'Active'; });
      var sel = document.getElementById('closeJcBreakdownType');
      if (sel) {
        sel.innerHTML = '<option value="">Select Breakdown Type</option>';
        active.forEach(function(t) {
          var opt = document.createElement('option');
          opt.value = t.TypeName || '';
          opt.textContent = t.TypeName || '';
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});
  }

  function bindEvents() {
    var searchEl = document.getElementById('closeJcSearch');
    if (searchEl) searchEl.onkeyup = function() { filterJobs(); };
    var deptFilter = document.getElementById('closeJcDeptFilter');
    if (deptFilter) deptFilter.onchange = function() { filterJobs(); };
    var techFilter = document.getElementById('closeJcTechnicianFilter');
    if (techFilter) techFilter.onchange = function() { filterJobs(); };
    var submitBtn = document.getElementById('closeJcSubmitBtn');
    if (submitBtn) submitBtn.onclick = saveCloseJc;
    var galleryInput = document.getElementById('closeRepairImageInput');
    if (galleryInput) galleryInput.onchange = handleRepairImageSelect;
    var cameraInput = document.getElementById('closeRepairCameraInput');
    if (cameraInput) cameraInput.onchange = handleRepairImageSelect;
    var placeholder = document.getElementById('closeRepairImagePlaceholder');
    if (placeholder) placeholder.onclick = function() { showCameraMenu('closeRepairImageInput', { title: 'Repair Photo', capture: 'environment' }); };
    var removeBtn = document.getElementById('closejc-remove-image');
    if (removeBtn) removeBtn.onclick = removeRepairImage;
    document.querySelectorAll('.closejc-voice-btn').forEach(function(btn) {
      btn.onclick = function() { startVoiceInput(btn.getAttribute('data-target')); };
    });
  }

  function populateFilters() {
    var depts = [], techs = [];
    _allJobs.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
      if (jc.AssignedTechnician && techs.indexOf(jc.AssignedTechnician) === -1) techs.push(jc.AssignedTechnician);
    });
    var deptSel = document.getElementById('closeJcDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = '<option value="">All Departments</option>';
      depts.sort().forEach(function(d) {
        var opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        deptSel.appendChild(opt);
      });
    }
    var techSel = document.getElementById('closeJcTechnicianFilter');
    if (techSel) {
      techSel.innerHTML = '<option value="">All Technicians</option>';
      techs.sort().forEach(function(t) {
        var opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        techSel.appendChild(opt);
      });
    }
  }

  function filterJobs() {
    var q = (document.getElementById('closeJcSearch') || {}).value || '';
    var dept = (document.getElementById('closeJcDeptFilter') || {}).value || '';
    var tech = (document.getElementById('closeJcTechnicianFilter') || {}).value || '';
    q = q.toLowerCase();
    _jobs = _allJobs.filter(function(jc) {
      if (dept && jc.Department !== dept) return false;
      if (tech && jc.AssignedTechnician !== tech) return false;
      if (q) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(q) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(q) !== -1) ||
               (jc.AssignedTechnician && jc.AssignedTechnician.toLowerCase().indexOf(q) !== -1);
      }
      return true;
    });
    _currentPage = 1;
    renderTable();
  }

  function renderTable() {
    var container = document.getElementById('closeJcTableContainer');
    if (!container) return;
    if (_jobs.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">&#127919;</div><div style="font-size:14px;font-weight:500">No Running job cards to close</div></div>';
      return;
    }
    var totalPages = Math.ceil(_jobs.length / PAGE_SIZE);
    if (_currentPage > totalPages) _currentPage = totalPages;
    var start = (_currentPage - 1) * PAGE_SIZE;
    var pageJobs = _jobs.slice(start, start + PAGE_SIZE);

    var canClose = Auth.isAdmin() || Auth.canCloseJobCard();
    var html = '<div style="overflow-x:auto"><table><thead><tr>' +
      '<th>Job Card No</th><th>Opened</th><th>Machine</th><th>Dept</th><th>Technician</th><th>Waiting</th><th>Working</th>' +
      (canClose ? '<th>Action</th>' : '') +
      '</tr></thead><tbody>';
    pageJobs.forEach(function(jc) {
      var startStr = jc.StartTime || jc.StartDateTime;
      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + formatDateTime(jc.DateTime || jc.OpenDateTime || '') + '</td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td>' + App.escHtml(jc.Department || '') + '</td>' +
        '<td>' + App.escHtml(jc.AssignedTechnician || '-') + '</td>' +
        '<td>' + durationToggle(jc.WaitingTime) + '</td>' +
        '<td>' + durationToggle(0, startStr) + '</td>';
      if (canClose) {
        html += '<td><button class="btn btn-sm btn-success" onclick="CloseJC.openModal(\'' + App.escHtml(jc.JobCardNo || '') + '\')">Close</button></td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (totalPages > 1) {
      html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:12px">' +
        '<button class="btn btn-sm btn-secondary" onclick="CloseJC.prevPage()" ' + (_currentPage <= 1 ? 'disabled' : '') + '>&laquo; Prev</button>' +
        '<span style="font-size:12px;color:var(--text-muted)">Page ' + _currentPage + ' of ' + totalPages + '</span>' +
        '<button class="btn btn-sm btn-secondary" onclick="CloseJC.nextPage()" ' + (_currentPage >= totalPages ? 'disabled' : '') + '>Next &raquo;</button>' +
        '</div>';
    }
    container.innerHTML = html;
    startLiveTimers();
  }

  function formatDateTime(dtStr) {
    if (!dtStr) return '\u2014';
    var d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function startLiveTimers() {
    if (_timer) clearInterval(_timer);
  }

  function openModal(jobCardNo) {
    if (!Auth.canCloseJobCard() && !Auth.isAdmin()) {
      App.showToast('You do not have permission to close job cards', 'warning');
      return;
    }
    var item = _allJobs.find(function(r) { return r.JobCardNo === jobCardNo; });
    if (!item) return;
    var form = document.getElementById('closeJcForm');
    if (form) form.reset();
    removeRepairImage();
    var el = document.getElementById('closeJcJobNo'); if (el) el.value = jobCardNo;
    el = document.getElementById('closeJcRef'); if (el) el.textContent = jobCardNo;
    updateTimeSummary(item);
    var modal = document.getElementById('closeJcModal');
    if (modal) modal.style.display = 'flex';
  }

  function hideModal() {
    var modal = document.getElementById('closeJcModal');
    if (modal) modal.style.display = 'none';
  }

  function updateTimeSummary(item) {
    var openedStr = item.DateTime || item.OpenTime || item.OpenDateTime;
    var startStr = item.StartTime || item.StartDateTime;
    var now = new Date();
    if (openedStr) {
      var el = document.getElementById('closeJcOpenedDisplay'); if (el) el.textContent = formatDateTime(openedStr);
      var waitingMs = (startStr ? new Date(startStr) : now).getTime() - new Date(openedStr).getTime();
      el = document.getElementById('closeJcWaitingDisplay'); if (el) el.innerHTML = durationToggle(waitingMs > 0 ? Math.floor(waitingMs / 60000) : 0);
    }
    if (startStr) {
      var el = document.getElementById('closeJcStartedDisplay'); if (el) el.textContent = formatDateTime(startStr);
      el = document.getElementById('closeJcWorkingDisplay'); if (el) el.innerHTML = durationToggle(0, startStr);
    }
    var el = document.getElementById('closeJcClosedDisplay'); if (el) el.textContent = formatDateTime(now);
    if (openedStr) {
      el = document.getElementById('closeJcBreakdownDisplay'); if (el) el.innerHTML = durationToggle(0, openedStr);
    }
  }

  function saveCloseJc() {
    var data = getFormData('closeJcForm');
    if (!data.BreakdownType) { App.showToast('Please select Breakdown Type', 'error'); return; }
    if (!data.RootCause) { App.showToast('Please enter Root Cause', 'error'); return; }
    if (!data.CorrectiveAction) { App.showToast('Please enter Corrective Action', 'error'); return; }

    var btn = document.getElementById('closeJcSubmitBtn');
    if (btn) { btn.textContent = 'Closing...'; btn.disabled = true; }

    var payload = {
      id: data.JobCardNo,
      rootCause: data.RootCause,
      correctiveAction: data.CorrectiveAction,
      spareParts: data.SpareParts || '',
      finalRemarks: data.FinalRemarks || '',
      breakdownType: data.BreakdownType,
      closeDateTime: new Date().toISOString()
    };

    API.call('closeJobCard', payload)
      .then(function(result) {
        if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Complete &amp; Close'; btn.disabled = false; }
        hideModal();
        App.showToast('Job card closed successfully', 'success');
        load();
      })
      .catch(function(err) {
        if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Complete &amp; Close'; btn.disabled = false; }
        App.showToast(err.message || 'Failed to close job card', 'error');
      });
  }

  function handleRepairImageSelect(evt) {
    var file = evt.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      App.showToast('Image must be less than 5MB', 'error');
      evt.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var el = document.getElementById('closeRepairImageData'); if (el) el.value = e.target.result;
      var preview = document.getElementById('closeRepairImagePreview');
      var placeholder = document.getElementById('closeRepairImagePlaceholder');
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
    var ph = document.getElementById('closeRepairImagePlaceholder'); if (ph) ph.style.display = 'flex';
  }

  function showCameraMenu(targetId, opts) {
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.style.zIndex = '2000';
    overlay.innerHTML =
      '<div class="modal" style="max-width:340px;margin:auto">' +
        '<div class="modal-header"><div class="modal-title">' + (opts.title || 'Capture Photo') + '</div>' +
        '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button></div>' +
        '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">' +
          '<button class="btn btn-primary btn-block cam-btn" style="min-height:52px;font-size:15px;justify-content:center" data-mode="camera">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> Take Photo</button>' +
          '<button class="btn btn-secondary btn-block cam-btn" style="min-height:52px;font-size:15px;justify-content:center" data-mode="gallery">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Choose from Gallery</button>' +
        '</div></div>';
    overlay.querySelectorAll('.cam-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        overlay.remove();
        var mode = btn.getAttribute('data-mode');
        var cameraMap = { 'closeRepairImageInput': 'closeRepairCameraInput' };
        if (mode === 'gallery') {
          var el = document.getElementById(targetId); if (el) el.click();
        } else {
          var camId = cameraMap[targetId];
          var camEl = camId ? document.getElementById(camId) : null;
          if (camEl) camEl.click(); else App.showToast('Camera not available', 'warning');
        }
      });
    });
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  function startVoiceInput(textareaId) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { App.showToast('Voice input is not supported in this browser', 'error'); return; }
    var textarea = document.getElementById(textareaId);
    if (!textarea) return;
    var recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = function(event) {
      var transcript = event.results[0][0].transcript;
      textarea.value = (textarea.value ? textarea.value + ' ' : '') + transcript;
    };
    recognition.onerror = function() { App.showToast('Voice input failed. Please try again.', 'error'); };
    recognition.start();
  }

  window.CloseJC = {
    openModal: openModal,
    hideModal: hideModal,
    prevPage: function() { if (_currentPage > 1) { _currentPage--; renderTable(); } },
    nextPage: function() { var tp = Math.ceil(_jobs.length / PAGE_SIZE); if (_currentPage < tp) { _currentPage++; renderTable(); } }
  };
})();
