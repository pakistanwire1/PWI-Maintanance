var StartedJobCard = (function() {
  var state = { data: [], page: 1, timer: null, techMulti: null, techList: [] };

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>';
  var ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>';

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
      '<div id="startjobcardPage" class="page"><div class="card">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--warning);box-shadow:0 0 8px rgba(245,158,11,0.4);vertical-align:middle;margin-right:8px"></span>' +
            'Start Job Card \u2014 Open Jobs' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="search-box">' +
              ICON_SEARCH +
              '<input type="text" class="form-control" id="startJcSearch" placeholder="Search open jobs..." onkeyup="StartedJobCard.search()">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="form-group">' +
            '<select class="form-control" id="startJcDeptFilter" onchange="StartedJobCard.filter()">' +
              '<option value="">All Departments</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<select class="form-control" id="startJcPriorityFilter" onchange="StartedJobCard.filter()">' +
              '<option value="">All Priority</option>' +
              '<option value="Low">Low</option>' +
              '<option value="Medium">Medium</option>' +
              '<option value="High">High</option>' +
              '<option value="Critical">Critical</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="startJcTableContainer"></div>' +
      '</div></div>' +

      '<div class="modal-overlay" id="startJcModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span class="status-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--warning);box-shadow:0 0 8px rgba(245,158,11,0.4);vertical-align:middle;margin-right:8px"></span>' +
              'Start Job \u2014 <span id="startJcRef"></span>' +
            '</div>' +
            '<button class="modal-close" onclick="StartedJobCard.hideModal()">&times;</button>' +
          '</div>' +
          '<form id="startJcForm" onsubmit="return StartedJobCard.save(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="JobCardNo" id="startJcJobNo">' +
              '<input type="hidden" name="CurrentStatus" value="RUNNING">' +
              '<div class="time-summary-compact" style="margin-bottom:16px">' +
                '<div class="ts-row"><span class="ts-label">Waiting Time</span><span class="ts-value" id="startJcWaitingDisplay">0h 0m</span></div>' +
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
                  '<button type="button" class="btn btn-sm btn-secondary" onclick="StartedJobCard.addVoiceButton(\'startJcInitialRemarks\')" style="font-size:11px;padding:3px 8px">' +
                    ICON_MIC + ' Voice Input' +
                  '</button>' +
                '</div>' +
              '</div>' +
              '<div style="margin-bottom:0">' +
                '<small style="color:var(--text-muted);font-size:11px">' +
                  'Start Date & Time will be captured automatically. ' +
                  'Waiting Time will be calculated automatically. ' +
                  'Status will change from <strong>Waiting</strong> to <strong>Running</strong>.' +
                '</small>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="StartedJobCard.hideModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-warning" style="color:#fff">' +
                ICON_PLAY + ' Start Job' +
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
        return s === 'open' || s === 'waiting';
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
    API.post('getTechnicians', {}).then(function(techs) {
      state.techList = (techs || []).filter(function(t) {
        return (t.Status || '').toLowerCase() === 'active';
      });
      state.techList.sort(function(a, b) {
        return (a.TechnicianName || '').localeCompare(b.TechnicianName || '');
      });
      var opts = state.techList.map(function(t) {
        return { value: t.EmployeeID, label: t.TechnicianName };
      });
      state.techMulti = initMultiSelect('startJcTechnicianWrapper', opts);
    }).catch(function() {});

    var deptFilter = document.getElementById('startJcDeptFilter');
    if (deptFilter) deptFilter.innerHTML = '<option value="">All Departments</option>';
    var depts = [];
    state.data.forEach(function(jc) {
      if (jc.Department && depts.indexOf(jc.Department) === -1) depts.push(jc.Department);
    });
    depts.sort().forEach(function(d) {
      if (deptFilter) deptFilter.innerHTML += '<option value="' + d + '">' + d + '</option>';
    });
  }

  function getFilteredData() {
    var dept = document.getElementById('startJcDeptFilter') ? document.getElementById('startJcDeptFilter').value : '';
    var priority = document.getElementById('startJcPriorityFilter') ? document.getElementById('startJcPriorityFilter').value : '';
    var query = document.getElementById('startJcSearch') ? document.getElementById('startJcSearch').value.toLowerCase() : '';
    var list = state.data;
    var userDept = getUserDept();
    var isAdminUser = Session.getUser() && (Session.getUser().role === 'Admin' || Session.getUser().isSystemAdmin);
    if (!isAdminUser && userDept) list = list.filter(function(jc) { return jc.Department === userDept; });
    if (dept) list = list.filter(function(jc) { return jc.Department === dept; });
    if (priority) list = list.filter(function(jc) { return jc.Priority === priority; });
    if (query) {
      list = list.filter(function(jc) {
        return (jc.JobCardNo && jc.JobCardNo.toLowerCase().indexOf(query) !== -1) ||
               (jc.Machine && jc.Machine.toLowerCase().indexOf(query) !== -1) ||
               (jc.ComplaintDescription && jc.ComplaintDescription.toLowerCase().indexOf(query) !== -1);
      });
    }
    return list;
  }

  function renderTable() {
    var list = getFilteredData();
    var canStart = Session.getUser() && (Session.getUser().role === 'Admin' || Session.getUser().isSystemAdmin || hasPermission('startJobCard'));

    var p = state.page;
    var totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
    p = Math.max(1, Math.min(p, totalPages));
    state.page = p;
    var start = (p - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, list.length);
    var pageData = list.slice(start, end);

    var container = document.getElementById('startJcTableContainer');
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
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Low': 'success', 'Medium': 'warning', 'High': 'danger', 'Critical': 'danger' } },
      { key: '_waiting', label: 'Waiting', format: function(val, row) {
        var dt = row.DateTime || row.OpenTime || row.OpenDateTime;
        return '<span class="live-timer" data-start="' + (dt || '') + '">' + formatDurationFromDates(dt) + '</span>';
      }},
      { key: 'ComplaintDescription', label: 'Description' }
    ];

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col.key) + '</th>';
    });
    if (canStart) html += '<th style="width:120px">Actions</th>';
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

      if (canStart) {
        html += '<td><div class="actions-cell">';
        html += '<button class="icon-btn icon-btn-warning" onclick="StartedJobCard.open(\'' + row.JobCardNo + '\')" title="Start">' + ICON_PLAY + '</button>';
        html += '</div></td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + list.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="StartedJobCard.goPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var i = 1; i <= totalPages; i++) {
        html += '<button class="' + (i === p ? 'active' : '') + '" onclick="StartedJobCard.goPage(' + i + ')">' + i + '</button>';
      }
      html += '<button onclick="StartedJobCard.goPage(' + (p + 1) + ')" ' + (p >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }

    container.innerHTML = html;
    startLiveTimers();
  }

  function startLiveTimers() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function() {
      document.querySelectorAll('#startJcTableContainer .live-timer').forEach(function(el) {
        var start = el.getAttribute('data-start');
        if (start) el.textContent = formatDurationFromDates(start);
      });
    }, 60000);
  }

  function initMultiSelect(wrapperId, options) {
    var wrapper = document.getElementById(wrapperId);
    if (!wrapper) return null;
    var tagsEl = wrapper.querySelector('.multi-select-tags');
    var searchEl = wrapper.querySelector('.multi-select-search');
    var hiddenEl = wrapper.querySelector('input[type="hidden"][name="AssignedTechnicianIDs"]');
    var dropdownEl = wrapper.querySelector('.multi-select-dropdown');
    if (!tagsEl || !searchEl || !hiddenEl || !dropdownEl) return null;
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
      if (idx === -1) selected.push(val);
      else selected.splice(idx, 1);
      renderTags();
      renderDropdown();
    }

    function renderDropdown() {
      var q = searchEl.value.toLowerCase();
      var visible = allOptions.filter(function(o) {
        return o.label.toLowerCase().indexOf(q) !== -1;
      });
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

    function openDropdown() {
      isOpen = true;
      dropdownEl.style.display = 'block';
      renderDropdown();
    }

    function closeDropdown() {
      isOpen = false;
      dropdownEl.style.display = 'none';
    }

    searchEl.addEventListener('focus', function() { openDropdown(); });
    searchEl.addEventListener('input', function() { if (isOpen) renderDropdown(); });
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) closeDropdown();
    });
    tagsEl.addEventListener('click', function() { searchEl.focus(); });

    renderTags();

    return {
      getValue: function() { return selected.slice(); },
      setValue: function(vals) { selected = vals.slice(); renderTags(); renderDropdown(); },
      clear: function() { selected = []; renderTags(); renderDropdown(); },
      close: closeDropdown
    };
  }

  function onMultiSelectChange(selected, allOptions) {
    var names = [];
    var skills = [];
    selected.forEach(function(empId) {
      var tech = state.techList.find(function(t) { return t.EmployeeID === empId; });
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

  function openStartJc(id) {
    if (!hasPermission('startJobCard') && !(Session.getUser() && Session.getUser().role === 'Admin')) {
      Notify.warning('You do not have permission to start job cards');
      return;
    }
    var item = null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].JobCardNo === id) { item = state.data[i]; break; }
    }
    if (!item) return;
    var form = document.getElementById('startJcForm');
    if (form) form.reset();
    if (state.techMulti) state.techMulti.clear();
    var el = document.getElementById('startJcSkillDisplay'); if (el) el.value = '';
    el = document.getElementById('startJcJobNo'); if (el) el.value = id;
    el = document.getElementById('startJcRef'); if (el) el.textContent = id;
    el = document.getElementById('startJcOpenedDisplay'); if (el) el.textContent = Utils.formatDateTime(item.DateTime || item.OpenTime || item.OpenDateTime);
    updateWaiting();
    document.getElementById('startJcModal').style.display = 'flex';
    setTimeout(function() { StartedJobCard.addVoiceButton('startJcInitialRemarks'); }, 100);
  }

  function updateWaiting() {
    var jobNo = document.getElementById('startJcJobNo') ? document.getElementById('startJcJobNo').value : '';
    var item = null;
    for (var i = 0; i < state.data.length; i++) {
      if (state.data[i].JobCardNo === jobNo) { item = state.data[i]; break; }
    }
    if (!item) return;
    var dt = item.DateTime || item.OpenTime || item.OpenDateTime;
    if (!dt) return;
    var diff = Date.now() - new Date(dt).getTime();
    var el = document.getElementById('startJcWaitingDisplay');
    if (el) el.textContent = formatDuration(diff);
  }

  function saveStartJc(e) {
    e.preventDefault();
    var form = document.getElementById('startJcForm');
    if (!form) return false;
    var data = Forms.get('startJcForm');
    var id = data.JobCardNo;
    if (!data.AssignedTechnician) {
      Notify.error('Please select at least one technician');
      return false;
    }

    Loader.show();
    API.post('startJobCard', { id: id, technician: data.AssignedTechnician, technicianIds: data.AssignedTechnicianIDs, team: data.MaintenanceTeam, remarks: data.InitialRemarks }).then(function() {
      Loader.hide();
      document.getElementById('startJcModal').style.display = 'none';
      Notify.success('Job started \u2014 Status: Running');
      loadData();
    }).catch(function(err) {
      Loader.hide();
      Notify.error(err.message || 'Failed to start job');
    });
    return false;
  }

  return {
    show: function() {
      if (state.timer) clearInterval(state.timer);
      state = { data: [], page: 1, timer: null, techMulti: null, techList: [] };
      renderPage();
      loadData();
    },
    search: function() { state.page = 1; renderTable(); },
    filter: function() { state.page = 1; renderTable(); },
    open: function(id) { openStartJc(id); },
    save: function(e) { return saveStartJc(e); },
    hideModal: function() { document.getElementById('startJcModal').style.display = 'none'; },
    goPage: function(p) { state.page = p; renderTable(); },
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
