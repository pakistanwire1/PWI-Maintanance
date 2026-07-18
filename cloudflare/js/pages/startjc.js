/* ============================================================
   startjc.js — Start Job Card (Assign & Begin Work)
   GAS-identical: StartJobCardPage.html
   Features: Table with search/filters (dept, priority),
   Modal with multi-select technicians, auto skills,
   Waiting Time live timer, Voice Input for remarks.
   ============================================================ */

(function() {
  var _allJobs = [];
  var _jobs = [];
  var _currentPage = 1;
  var _timer = null;
  var _techList = [];
  var _techMulti = null;
  var PAGE_SIZE = 15;

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
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--warning);box-shadow:0 0 8px rgba(245,158,11,0.4);vertical-align:middle;margin-right:8px"></span>' +
            'Start Job Card \u2014 Open Jobs' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="form-control" id="startJcSearch" placeholder="Search open jobs...">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group"><select class="form-control" id="startJcDeptFilter"><option value="">All Departments</option></select></div>' +
          '<div class="form-group"><select class="form-control" id="startJcPriorityFilter"><option value="">All Priority</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
        '</div>' +
        '<div id="startJcTableContainer"></div>' +
      '</div>' +
      '<div class="modal-overlay" id="startJcModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--warning);box-shadow:0 0 8px rgba(245,158,11,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Start Job \u2014 <span id="startJcRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="StartJC.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="startJcForm" onsubmit="return false">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="JobCardNo" id="startJcJobNo">' +
              '<input type="hidden" name="CurrentStatus" value="RUNNING">' +
              '<div style="margin-bottom:16px;padding:12px;background:var(--bg-input);border-radius:var(--radius-sm)">' +
                '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:500;color:var(--text)">Waiting Time</span><span style="font-size:15px;font-weight:700;color:var(--warning)" id="startJcWaitingDisplay">0m</span></div>' +
                '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Opened: <span id="startJcOpenedDisplay"></span></div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Assigned Technician *</label>' +
                '<div class="multi-select-wrapper" id="startJcTechnicianWrapper">' +
                  '<div class="multi-select-tags">' +
                    '<input type="text" class="multi-select-search" placeholder="Search technicians...">' +
                    '<input type="hidden" name="AssignedTechnicianIDs" id="startJcTechnicianIDs">' +
                  '</div>' +
                  '<div class="multi-select-dropdown"></div>' +
                '</div>' +
                '<input type="hidden" name="AssignedTechnician" id="startJcTechnician">' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Maintenance Team / Skills</label>' +
                '<input type="text" name="MaintenanceTeam" class="form-control" id="startJcSkillDisplay" readonly>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Initial Remarks</label>' +
                '<textarea name="InitialRemarks" id="startJcInitialRemarks" class="form-control" rows="3" placeholder="Initial assessment and observations..."></textarea>' +
                '<div style="display:flex;gap:6px;margin-top:4px">' +
                  '<button type="button" class="btn btn-sm btn-secondary" id="startjc-voice-btn" style="font-size:11px;padding:3px 8px">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<div style="margin-bottom:0"><small style="color:var(--text-muted);font-size:11px">Start Date &amp; Time will be captured automatically. Waiting Time will be calculated automatically. Status will change from <strong>Waiting</strong> to <strong>Running</strong>.</small></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="StartJC.hideModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-warning" id="startJcSubmitBtn" style="color:#fff">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Start Job' +
              '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getJobCards')
      .then(function(data) {
        var all = data.records || data || [];
        _allJobs = all.filter(function(jc) {
          var s = (jc.CurrentStatus || jc.Status || '').toLowerCase();
          return s === 'open' || s === 'waiting';
        });
        _jobs = _allJobs.slice();
        App.showLoading(false);
        populateFilters();
        loadTechnicians();
        renderTable();
        bindEvents();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load: ' + err.message, 'error');
      });
  }

  function loadTechnicians() {
    API.call('getTechnicians').then(function(techs) {
      _techList = (techs || []).filter(function(t) { return (t.Status || '').toLowerCase() === 'active'; });
      _techList.sort(function(a, b) { return (a.TechnicianName || '').localeCompare(b.TechnicianName || ''); });
      var opts = _techList.map(function(t) { return { value: t.EmployeeID, label: t.TechnicianName }; });
      _techMulti = initMultiSelect('startJcTechnicianWrapper', opts);
    }).catch(function() {});
  }

  function bindEvents() {
    var searchEl = document.getElementById('startJcSearch');
    if (searchEl) searchEl.onkeyup = function() { filterJobs(); };
    var deptFilter = document.getElementById('startJcDeptFilter');
    if (deptFilter) deptFilter.onchange = function() { filterJobs(); };
    var priorityFilter = document.getElementById('startJcPriorityFilter');
    if (priorityFilter) priorityFilter.onchange = function() { filterJobs(); };
    var submitBtn = document.getElementById('startJcSubmitBtn');
    if (submitBtn) submitBtn.onclick = saveStartJc;
    var voiceBtn = document.getElementById('startjc-voice-btn');
    if (voiceBtn) voiceBtn.onclick = function() { startVoiceInput('startJcInitialRemarks'); };
  }

  function populateFilters() {
    var depts = [];
    _allJobs.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
    });
    var deptSel = document.getElementById('startJcDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = '<option value="">All Departments</option>';
      depts.sort().forEach(function(d) { var opt = document.createElement('option'); opt.value = d; opt.textContent = d; deptSel.appendChild(opt); });
    }
  }

  function filterJobs() {
    var q = (document.getElementById('startJcSearch') || {}).value || '';
    var dept = (document.getElementById('startJcDeptFilter') || {}).value || '';
    var priority = (document.getElementById('startJcPriorityFilter') || {}).value || '';
    q = q.toLowerCase();
    _jobs = _allJobs.filter(function(jc) {
      if (dept && jc.Department !== dept) return false;
      if (priority && jc.Priority !== priority) return false;
      if (q) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(q) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(q) !== -1) ||
               (jc.ComplaintDescription && jc.ComplaintDescription.toLowerCase().indexOf(q) !== -1);
      }
      return true;
    });
    _currentPage = 1;
    renderTable();
  }

  function renderTable() {
    var container = document.getElementById('startJcTableContainer');
    if (!container) return;
    if (_jobs.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">&#127919;</div><div style="font-size:14px;font-weight:500">No Open job cards to start</div></div>';
      return;
    }
    var totalPages = Math.ceil(_jobs.length / PAGE_SIZE);
    if (_currentPage > totalPages) _currentPage = totalPages;
    var start = (_currentPage - 1) * PAGE_SIZE;
    var pageJobs = _jobs.slice(start, start + PAGE_SIZE);
    var canStart = Auth.isAdmin() || Auth.canStartJobCard();

    var html = '<div style="overflow-x:auto"><table><thead><tr>' +
      '<th>Job Card No</th><th>Opened</th><th>Machine</th><th>Dept</th><th>Priority</th><th>Waiting</th><th>Description</th>' +
      (canStart ? '<th>Action</th>' : '') +
      '</tr></thead><tbody>';
    pageJobs.forEach(function(jc) {
      var priClass = 'badge-secondary';
      var p = (jc.Priority || '').toLowerCase();
      if (p === 'critical' || p === 'high') priClass = 'badge-danger';
      else if (p === 'medium') priClass = 'badge-warning';
      else if (p === 'low') priClass = 'badge-success';
      var dt = jc.DateTime || jc.OpenTime || jc.OpenDateTime || '';

      html += '<tr>' +
        '<td><strong>' + App.escHtml(jc.JobCardNo || '') + '</strong></td>' +
        '<td>' + fmtDt(dt) + '</td>' +
        '<td>' + App.escHtml(jc.Machine || '') + '</td>' +
        '<td>' + App.escHtml(jc.Department || '') + '</td>' +
        '<td><span class="badge ' + priClass + '">' + App.escHtml(jc.Priority || '') + '</span></td>' +
        '<td>' + durationToggle(0, dt) + '</td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escHtml(jc.ComplaintDescription || '') + '</td>';
      if (canStart) {
        html += '<td><button class="btn btn-sm btn-warning" onclick="StartJC.openModal(\'' + App.escHtml(jc.JobCardNo || '') + '\')">Start</button></td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (totalPages > 1) {
      html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:12px">' +
        '<button class="btn btn-sm btn-secondary" onclick="StartJC.prevPage()" ' + (_currentPage <= 1 ? 'disabled' : '') + '>&laquo; Prev</button>' +
        '<span style="font-size:12px;color:var(--text-muted)">Page ' + _currentPage + ' of ' + totalPages + '</span>' +
        '<button class="btn btn-sm btn-secondary" onclick="StartJC.nextPage()" ' + (_currentPage >= totalPages ? 'disabled' : '') + '>Next &raquo;</button></div>';
    }
    container.innerHTML = html;
    startLiveTimers();
  }

  function fmtDt(s) {
    if (!s) return '\u2014';
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function startLiveTimers() {
    if (_timer) clearInterval(_timer);
  }

  function openModal(jobCardNo) {
    if (!Auth.canStartJobCard() && !Auth.isAdmin()) {
      App.showToast('You do not have permission to start job cards', 'warning');
      return;
    }
    var item = _allJobs.find(function(r) { return r.JobCardNo === jobCardNo; });
    if (!item) return;
    var form = document.getElementById('startJcForm');
    if (form) form.reset();
    if (_techMulti) _techMulti.clear();
    var el = document.getElementById('startJcSkillDisplay'); if (el) el.value = '';
    el = document.getElementById('startJcJobNo'); if (el) el.value = jobCardNo;
    el = document.getElementById('startJcRef'); if (el) el.textContent = jobCardNo;
    var dt = item.DateTime || item.OpenTime || item.OpenDateTime || '';
    el = document.getElementById('startJcOpenedDisplay'); if (el) el.textContent = fmtDt(dt);
    updateWaitingTime(dt);
    if (_timer) clearInterval(_timer);
    _timer = setInterval(function() {
      var jobNo = (document.getElementById('startJcJobNo') || {}).value;
      if (!jobNo) return;
      var job = _allJobs.find(function(j) { return j.JobCardNo === jobNo; });
      if (job) {
        var d = job.DateTime || job.OpenTime || job.OpenDateTime || '';
        updateWaitingTime(d);
      }
    }, 10000);
    var modal = document.getElementById('startJcModal');
    if (modal) modal.style.display = 'flex';
  }

  function updateWaitingTime(dtStr) {
    if (!dtStr) return;
    var diff = Date.now() - new Date(dtStr).getTime();
    if (diff < 0) diff = 0;
    var el = document.getElementById('startJcWaitingDisplay');
    if (el) el.innerHTML = durationToggle(Math.floor(diff / 60000));
  }

  function hideModal() {
    var modal = document.getElementById('startJcModal');
    if (modal) modal.style.display = 'none';
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function onMultiSelectChange(selected, allOptions) {
    var names = [];
    var skills = [];
    selected.forEach(function(empId) {
      var tech = _techList.find(function(t) { return t.EmployeeID === empId; });
      if (tech) {
        if (tech.TechnicianName) names.push(tech.TechnicianName);
        if (tech.Skill) {
          var s = tech.Skill.split(/[,;\/]/).map(function(sk) { return sk.trim(); });
          s.forEach(function(sk) { if (sk && skills.indexOf(sk) === -1) skills.push(sk); });
        }
      }
    });
    var el = document.getElementById('startJcTechnician'); if (el) el.value = names.join(', ');
    skills.sort();
    el = document.getElementById('startJcSkillDisplay'); if (el) el.value = skills.join(', ');
  }

  function saveStartJc() {
    var data = getFormData('startJcForm');
    var id = data.JobCardNo;
    if (!data.AssignedTechnician) {
      App.showToast('Please select at least one technician', 'error');
      return;
    }

    var btn = document.getElementById('startJcSubmitBtn');
    if (btn) { btn.textContent = 'Starting...'; btn.disabled = true; }

    var payload = {
      id: id,
      technician: data.AssignedTechnician,
      technicianIds: data.AssignedTechnicianIDs || '',
      team: data.MaintenanceTeam || '',
      startDateTime: new Date().toISOString(),
      remarks: data.InitialRemarks || ''
    };

    API.call('startJobCard', payload)
      .then(function(result) {
        if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Start Job'; btn.disabled = false; }
        hideModal();
        App.showToast('Job started \u2014 Status: Running', 'success');
        load();
      })
      .catch(function(err) {
        if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Start Job'; btn.disabled = false; }
        App.showToast(err.message || 'Failed to start job', 'error');
      });
  }

  function initMultiSelect(wrapperId, options) {
    var wrapper = document.getElementById(wrapperId);
    if (!wrapper) return { clear: function() {} };
    var tagsEl = wrapper.querySelector('.multi-select-tags');
    var searchEl = wrapper.querySelector('.multi-select-search');
    var hiddenEl = wrapper.querySelector('input[type="hidden"]');
    var dropdownEl = wrapper.querySelector('.multi-select-dropdown');
    if (!tagsEl || !searchEl || !hiddenEl || !dropdownEl) return { clear: function() {} };
    var selected = [];
    var allOptions = options || [];
    var isOpen = false;

    function renderTags() {
      var existing = tagsEl.querySelectorAll('.multi-select-tag');
      existing.forEach(function(el) { el.remove(); });
      selected.forEach(function(val) {
        var opt = allOptions.find(function(o) { return o.value === val; });
        var label = opt ? opt.label : val;
        var tag = document.createElement('span');
        tag.className = 'multi-select-tag';
        tag.innerHTML = label + '<span class="multi-select-tag-remove" data-value="' + val + '">&times;</span>';
        tag.querySelector('.multi-select-tag-remove').addEventListener('click', function(e) {
          e.stopPropagation();
          removeValue(val);
        });
        tagsEl.insertBefore(tag, searchEl);
      });
      hiddenEl.value = selected.join(',');
      onMultiSelectChange(selected, allOptions);
    }

    function removeValue(val) {
      selected = selected.filter(function(v) { return v !== val; });
      renderTags();
      renderDropdown();
    }

    function toggleValue(val) {
      var idx = selected.indexOf(val);
      if (idx === -1) selected.push(val); else selected.splice(idx, 1);
      renderTags();
      renderDropdown();
    }

    function renderDropdown() {
      var q = searchEl.value.toLowerCase();
      var visible = allOptions.filter(function(o) { return o.label.toLowerCase().indexOf(q) !== -1; });
      dropdownEl.innerHTML = '';
      visible.forEach(function(o) {
        var isSel = selected.indexOf(o.value) !== -1;
        var div = document.createElement('div');
        div.className = 'multi-select-option' + (isSel ? ' selected' : '');
        div.innerHTML = '<input type="checkbox" ' + (isSel ? 'checked' : '') + '> <span>' + o.label + '</span>';
        div.addEventListener('click', function() { toggleValue(o.value); });
        dropdownEl.appendChild(div);
      });
      if (visible.length === 0) {
        dropdownEl.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--text-muted)">No results</div>';
      }
    }

    searchEl.addEventListener('focus', function() { isOpen = true; dropdownEl.style.display = 'block'; renderDropdown(); });
    searchEl.addEventListener('input', function() { if (isOpen) renderDropdown(); });
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) { isOpen = false; dropdownEl.style.display = 'none'; }
    });

    return {
      clear: function() { selected = []; renderTags(); renderDropdown(); },
      getSelected: function() { return selected.slice(); }
    };
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

  window.StartJC = {
    openModal: openModal,
    hideModal: hideModal,
    prevPage: function() { if (_currentPage > 1) { _currentPage--; renderTable(); } },
    nextPage: function() { var tp = Math.ceil(_jobs.length / PAGE_SIZE); if (_currentPage < tp) { _currentPage++; renderTable(); } }
  };
})();
