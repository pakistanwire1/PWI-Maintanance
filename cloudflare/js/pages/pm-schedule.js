var PMSchedule = (function() {
  var pmData = [];
  var pmPage = 1;
  var pmActiveTab = 'schedule';
  var pmFilter = { search: '', machine: '', technician: '', status: '', priority: '' };
  var pmSearchDebounce = null;
  var pmHistoryPage = 1;
  var pmCalYear = new Date().getFullYear();
  var pmCalMonth = new Date().getMonth();
  var pmMachinesCache = [];
  var pmTechsCache = [];
  var PAGE_SIZE = 10;
  var __pageStates = {};

  var ICONS = {
    complete: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="10" cy="10" r="9"/><path d="M7 10l2 2 4-4"/></svg>',
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/><path d="M8 8v6"/><path d="M12 8v6"/></svg>'
  };

  var ICON_PLUS_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>';
  var ICON_BULK_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M17 3H3v14h14V3z"/><path d="M7 10h6"/><path d="M10 7v6"/></svg>';
  var ICON_EXPORT_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M10 2v11"/><path d="M6 9l4 4 4-4"/><path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>';
  var ICON_SAVE_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>';
  var ICON_CHECK_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="10" cy="10" r="9"/><path d="M7 10l2 2 4-4"/></svg>';
  var ICON_PREV_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 5l-5 5 5 5"/></svg>';
  var ICON_NEXT_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M8 5l5 5-5 5"/></svg>';

  function showModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; el.classList.add('show'); }
  }

  function hideModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('show'); }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function populateSelectLocal(id, data, valueField, labelField, defaultText) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (defaultText) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultText;
      sel.appendChild(opt);
    }
    (data || []).forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item[valueField];
      opt.textContent = item[labelField] || item[valueField];
      sel.appendChild(opt);
    });
  }

  function setFormDataLocal(formId, data) {
    var form = document.getElementById(formId);
    if (!form || !data) return;
    form.querySelectorAll('[name]').forEach(function(el) {
      if (data[el.name] !== undefined) {
        el.value = data[el.name];
      }
    });
  }

  function getFormDataLocal(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var data = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.name) {
        if (el.type === 'checkbox') { data[el.name] = el.checked; }
        else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else { data[el.name] = el.value; }
      }
    }
    return data;
  }

  function resetFormLocal(formId) {
    var form = document.getElementById(formId);
    if (form) form.reset();
  }

  function openModalFormLocal(formId, title) {
    setText(formId + 'Title', title);
    showModal(formId + 'Modal');
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  function formatDateTimeLocal(date) {
    if (!date) return '';
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var month = months[d.getMonth()];
    var year = d.getFullYear();
    var hours = d.getHours();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    var mins = String(d.getMinutes()).padStart(2, '0');
    return day + ' ' + month + ' ' + year + ' | ' + String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm;
  }

  function formatDateOnly(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return day + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function renderTableLocal(data, columns, actions, page, pageSize, containerId) {
    containerId = containerId || 'tableContainer';
    var container = document.getElementById(containerId);
    if (!container) return;
    page = page || 1;
    pageSize = pageSize || PAGE_SIZE;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
          '<h3>No Data Found</h3>' +
          '<p>No records available in this module.</p>' +
        '</div>';
      return;
    }

    var totalPages = Math.ceil(data.length / pageSize);
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, data.length);
    var pageData = data.slice(start, end);

    var html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col) + '</th>';
    });
    if (actions) html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var key = col.key || col;
        var val = row[key] !== undefined && row[key] !== null ? row[key] : '';

        if (col.badge) {
          var badgeClass = 'badge badge-primary';
          if (col.badgeMap) {
            var mapKey = val;
            if (!(mapKey in col.badgeMap)) {
              mapKey = Object.keys(col.badgeMap).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
            }
            badgeClass = 'badge badge-' + (col.badgeMap[mapKey] || 'primary');
          }
          val = '<span class="' + badgeClass + '">' + val + '</span>';
        }

        if (col.format) val = col.format(val, row);

        if (col.date) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateOnly(val);
        }

        if (col.datetime) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateTimeLocal(d);
        }

        html += '<td>' + val + '</td>';
      });

      if (actions) {
        html += '<td><div class="actions-cell">';
        actions.forEach(function(action) {
          if (action.condition && !action.condition(row)) return;
          var idField = action.idField || Object.keys(row)[0];
          var onclick = action.onclick ? action.onclick.replace(/\{id\}/g, row[idField]) : '';
          if (action.icon && ICONS[action.icon]) {
            var svg = ICONS[action.icon];
            var cls = 'icon-btn icon-btn-' + (action.color || 'primary');
            html += '<button class="' + cls + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + svg + '</button>';
          } else {
            html += '<button class="btn btn-sm ' + (action.class || 'btn-primary') + '" onclick="' + onclick + '">' + action.label + '</button>';
          }
        });
        html += '</div></td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">' +
        '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
        '<div class="pagination-btns">' +
        '<button onclick="PMSchedule.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="PMSchedule.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="PMSchedule.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="pmPage" class="page">' +
        '<div class="dashboard-grid" id="pmSummaryCards" style="margin-bottom:16px">' +
          '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="pmTotalCount">0</h3><p>Total PMs</p></div></div></div>' +
          '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="pmCompletedCount">0</h3><p>Completed</p></div></div></div>' +
          '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="pmScheduledCount">0</h3><p>Scheduled</p></div></div></div>' +
          '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-info"><h3 id="pmOverdueCount">0</h3><p>Overdue</p></div></div></div>' +
          '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div><div class="stat-info"><h3 id="pmDueThisMonth">0</h3><p>Due This Month</p></div></div></div>' +
          '<div class="stat-card" id="pmComplianceStat"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12A10 10 0 1112 2a10 10 0 0110 10z"/><path d="M12 6v6l4 2"/></svg></div><div class="stat-info"><h3 id="pmComplianceRate">0%</h3><p>Compliance</p></div></div></div>' +
        '</div>' +

        '<div class="workflow-tabs">' +
          '<button class="workflow-tab active" data-tab="schedule" onclick="PMSchedule.switchTab(\'schedule\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>' +
            '<span class="tab-label">Schedule</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="calendar" onclick="PMSchedule.switchTab(\'calendar\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg></span>' +
            '<span class="tab-label">Calendar</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="history" onclick="PMSchedule.switchTab(\'history\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>' +
            '<span class="tab-label">History</span>' +
          '</button>' +
          '<button class="workflow-tab" data-tab="compliance" onclick="PMSchedule.switchTab(\'compliance\', this)">' +
            '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12A10 10 0 1112 2a10 10 0 0110 10z"/><path d="M16 8l-6 6-3-3"/></svg></span>' +
            '<span class="tab-label">Compliance</span>' +
          '</button>' +
        '</div>' +

        '<div id="pmScheduleView">' +
          '<div class="filter-bar" id="pmFilterBar">' +
            '<div class="form-group">' +
              '<label>Search</label>' +
              '<div class="search-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="form-control" id="pmSearch" placeholder="Search PM..." onkeyup="PMSchedule.searchTable()">' +
              '</div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Machine</label>' +
              '<select class="form-control" id="pmFilterMachine">' +
                '<option value="">All Machines</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Technician</label>' +
              '<select class="form-control" id="pmFilterTechnician">' +
                '<option value="">All Technicians</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Status</label>' +
              '<select class="form-control" id="pmFilterStatus">' +
                '<option value="">All Status</option>' +
                '<option value="Scheduled">Scheduled</option>' +
                '<option value="In Progress">In Progress</option>' +
                '<option value="Completed">Completed</option>' +
                '<option value="Overdue">Overdue</option>' +
                '<option value="Missed">Missed</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Priority</label>' +
              '<select class="form-control" id="pmFilterPriority">' +
                '<option value="">All Priority</option>' +
                '<option value="Low">Low</option>' +
                '<option value="Medium">Medium</option>' +
                '<option value="High">High</option>' +
                '<option value="Critical">Critical</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group" style="align-self:flex-end">' +
              '<button class="btn btn-primary btn-sm" onclick="PMSchedule.applyFilter()">Apply</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="PMSchedule.clearFilter()">Clear</button>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-header">' +
              '<div class="card-title">Preventive Maintenance Schedule</div>' +
              '<div class="card-actions">' +
                '<button class="btn btn-primary" onclick="PMSchedule.openForm()">' + ICON_PLUS_SVG + ' Add PM</button>' +
                '<button class="btn btn-secondary" onclick="PMSchedule.openBulkForm()">' + ICON_BULK_SVG + ' Bulk Generate</button>' +
                '<button class="btn btn-secondary" onclick="PMSchedule.exportCSV()">' + ICON_EXPORT_SVG + ' Export</button>' +
              '</div>' +
            '</div>' +
            '<div id="pmTableContainer"></div>' +
          '</div>' +
        '</div>' +

        '<div id="pmCalendarView" style="display:none">' +
          '<div class="card">' +
            '<div class="card-header">' +
              '<div class="card-title">' +
                '<button class="btn btn-sm btn-secondary" onclick="PMSchedule.prevMonth()" style="margin-right:8px">' + ICON_PREV_SVG + '</button>' +
                '<span id="pmCalTitle" style="font-size:18px;font-weight:600">Month Year</span>' +
                '<button class="btn btn-sm btn-secondary" onclick="PMSchedule.nextMonth()" style="margin-left:8px">' + ICON_NEXT_SVG + '</button>' +
              '</div>' +
              '<div class="card-actions">' +
                '<button class="btn btn-sm btn-primary" onclick="PMSchedule.goToToday()">Today</button>' +
              '</div>' +
            '</div>' +
            '<div id="pmCalendarGrid"></div>' +
            '<div id="pmCalendarDayDetail" style="padding:16px;border-top:1px solid var(--border)"></div>' +
          '</div>' +
        '</div>' +

        '<div id="pmHistoryView" style="display:none">' +
          '<div class="card">' +
            '<div class="card-header">' +
              '<div class="card-title">PM History</div>' +
              '<div class="card-actions">' +
                '<div class="search-box">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                  '<input type="text" class="form-control" id="pmHistorySearch" placeholder="Search history..." onkeyup="PMSchedule.searchHistory()">' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div id="pmHistoryContainer"></div>' +
          '</div>' +
        '</div>' +

        '<div id="pmComplianceView" style="display:none">' +
          '<div class="dashboard-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">' +
            '<div class="card" style="margin-bottom:0">' +
              '<div class="card-header"><div class="card-title">Compliance Rate</div></div>' +
              '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px">' +
                '<div id="pmComplianceLarge" style="font-size:72px;font-weight:800;line-height:1">0%</div>' +
                '<div style="font-size:14px;color:var(--text-muted);margin-top:8px">Overall PM Compliance</div>' +
              '</div>' +
            '</div>' +
            '<div class="card" style="margin-bottom:0">' +
              '<div class="card-header"><div class="card-title">Breakdown</div></div>' +
              '<div style="padding:16px;display:flex;flex-direction:column;gap:12px" id="pmComplianceBreakdown"></div>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-header"><div class="card-title">Machine-wise Compliance</div></div>' +
            '<div id="pmMachineComplianceContainer"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="pmFormModal" style="display:none">' +
        '<div class="modal modal-wide" style="max-width:700px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="pmFormTitle">Add PM Record</div>' +
            '<button class="modal-close" onclick="PMSchedule.hideFormModal()">&times;</button>' +
          '</div>' +
          '<form id="pmForm" onsubmit="return PMSchedule.savePM(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="id" id="editPmId">' +
              '<div class="form-row">' +
                '<div class="form-group"><label>PM Number</label><input type="text" name="PMNumber" class="form-control" id="pmFormNumber" readonly placeholder="Auto-generated"></div>' +
                '<div class="form-group"><label>Title *</label><input type="text" name="Title" class="form-control" required placeholder="PM title"></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Machine *</label><select name="MachineID" class="form-control" id="pmFormMachine" required onchange="PMSchedule.onMachineChange()"><option value="">Select Machine</option></select></div>' +
                '<div class="form-group"><label>Machine Name</label><input type="text" name="MachineName" class="form-control" id="pmFormMachineName" readonly></div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group"><label>Department</label><input type="text" name="Department" class="form-control" id="pmFormDepartment" readonly></div>' +
                '<div class="form-group"><label>Section</label><input type="text" name="Section" class="form-control" id="pmFormSection" readonly></div>' +
                '<div class="form-group"><label>Frequency *</label><input type="number" name="Frequency" class="form-control" required min="1"></div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group"><label>Frequency Type</label><select name="FrequencyType" class="form-control"><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly" selected>Monthly</option><option value="Quarterly">Quarterly</option><option value="Half Yearly">Half Yearly</option><option value="Yearly">Yearly</option></select></div>' +
                '<div class="form-group"><label>Assigned Technician</label><select name="AssignedTechnician" class="form-control" id="pmFormTechnician" onchange="PMSchedule.onTechChange()"><option value="">Select Technician</option></select></div>' +
                '<div class="form-group"><label>Tech Name</label><input type="text" name="AssignedTechnicianName" class="form-control" id="pmFormTechName" readonly></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Checklist Template</label><input type="text" name="ChecklistTemplate" class="form-control" placeholder="Optional template name"></div>' +
                '<div class="form-group"><label>Priority</label><select name="Priority" class="form-control"><option value="Medium">Medium</option><option value="Low">Low</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></div>' +
                '<div class="form-group"><label>Start Date</label><input type="date" name="StartDate" class="form-control"></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Due Date</label><input type="date" name="DueDate" class="form-control" id="pmFormDueDate"></div>' +
                '<div class="form-group"><label>Next Due Date</label><input type="date" name="NextDueDate" class="form-control" id="pmFormNextDueDate"></div>' +
              '</div>' +
              '<div class="form-group"><label>Remarks</label><textarea name="Remarks" class="form-control" rows="3"></textarea></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="PMSchedule.hideFormModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICON_SAVE_SVG + ' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="pmCompleteModal" style="display:none">' +
        '<div class="modal" style="max-width:550px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Complete PM</div>' +
            '<button class="modal-close" onclick="PMSchedule.hideCompleteModal()">&times;</button>' +
          '</div>' +
          '<form id="pmCompleteForm" onsubmit="return PMSchedule.saveComplete(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="id" id="completePmId">' +
              '<div class="form-row">' +
                '<div class="form-group"><label>PM Number</label><input type="text" class="form-control" id="completePmNumber" readonly></div>' +
                '<div class="form-group"><label>Title</label><input type="text" class="form-control" id="completePmTitle" readonly></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Machine</label><input type="text" class="form-control" id="completePmMachine" readonly></div>' +
                '<div class="form-group"><label>Status</label><input type="text" class="form-control" id="completePmStatus" readonly value="Completed"></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Completion Date *</label><input type="date" name="CompletionDate" class="form-control" id="completePmDate" required></div>' +
                '<div class="form-group"><label>Next Due Date *</label><input type="date" name="NextDueDate" class="form-control" id="completePmNextDue" required></div>' +
              '</div>' +
              '<div class="form-group"><label>Remarks</label><textarea name="Remarks" class="form-control" id="completePmRemarks" rows="3"></textarea></div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="PMSchedule.hideCompleteModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-success">' + ICON_CHECK_SVG + ' Complete PM</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="pmBulkModal" style="display:none">' +
        '<div class="modal" style="max-width:600px">' +
          '<div class="modal-header">' +
            '<div class="modal-title">Bulk Generate PMs</div>' +
            '<button class="modal-close" onclick="PMSchedule.hideBulkModal()">&times;</button>' +
          '</div>' +
          '<form id="pmBulkForm" onsubmit="return PMSchedule.saveBulk(event)">' +
            '<div class="modal-body">' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Machine *</label><select name="MachineID" class="form-control" id="pmBulkMachine" required><option value="">Select Machine</option></select></div>' +
                '<div class="form-group"><label>Frequency *</label><input type="number" name="Frequency" class="form-control" required min="1"></div>' +
              '</div>' +
              '<div class="form-row-3">' +
                '<div class="form-group"><label>Frequency Type</label><select name="FrequencyType" class="form-control"><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly" selected>Monthly</option><option value="Quarterly">Quarterly</option><option value="Half Yearly">Half Yearly</option><option value="Yearly">Yearly</option></select></div>' +
                '<div class="form-group"><label>Number of Cycles</label><input type="number" name="Cycles" class="form-control" value="12" min="1" max="52"></div>' +
                '<div class="form-group"><label>Start Date</label><input type="date" name="StartDate" class="form-control"></div>' +
              '</div>' +
              '<div class="form-group"><label>Title Prefix</label><input type="text" name="TitlePrefix" class="form-control" placeholder="e.g., Monthly Inspection - "></div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Technician</label><select name="AssignedTechnician" class="form-control" id="pmBulkTechnician"><option value="">Select Technician</option></select></div>' +
                '<div class="form-group"><label>Priority</label><select name="Priority" class="form-control"><option value="Medium">Medium</option><option value="Low">Low</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="PMSchedule.hideBulkModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICON_BULK_SVG + ' Generate</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getPMRecords', {})
      .then(function(data) {
        pmData = data || [];
        Loader.hide();
        updateSummary();
        renderPMTable();
        loadFilterSelects();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load PM records');
      });
  }

  function loadFilterSelects() {
    API.post('getMachines', {})
      .then(function(m) {
        pmMachinesCache = m || [];
        var sel = document.getElementById('pmFilterMachine');
        if (sel) sel.innerHTML = '<option value="">All Machines</option>';
        if (sel) m.forEach(function(item) { sel.innerHTML += '<option value="' + (item.MachineID || item.id) + '">' + (item.MachineName || item.name) + '</option>'; });
      })
      .catch(function() {});
    API.post('getTechnicians', {})
      .then(function(t) {
        pmTechsCache = t || [];
        var sel = document.getElementById('pmFilterTechnician');
        if (sel) sel.innerHTML = '<option value="">All Technicians</option>';
        if (sel) t.forEach(function(item) { sel.innerHTML += '<option value="' + (item.EmployeeID || item.id) + '">' + (item.TechnicianName || item.name) + '</option>'; });
      })
      .catch(function() {});
  }

  function updateSummary() {
    var total = pmData.length;
    var completed = pmData.filter(function(r) { return r.Status === 'Completed'; }).length;
    var scheduled = pmData.filter(function(r) { return r.Status === 'Scheduled'; }).length;
    var overdue = pmData.filter(function(r) { return r.Status === 'Overdue'; }).length;
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    var dueThisMonth = pmData.filter(function(r) {
      if (r.Status === 'Completed') return false;
      var d = r.DueDate ? new Date(r.DueDate) : null;
      return d && d >= monthStart && d <= monthEnd;
    }).length;
    var complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    setText('pmTotalCount', total);
    setText('pmCompletedCount', completed);
    setText('pmScheduledCount', scheduled);
    setText('pmOverdueCount', overdue);
    setText('pmDueThisMonth', dueThisMonth);
    setText('pmComplianceRate', complianceRate + '%');
    var complianceStat = document.getElementById('pmComplianceStat');
    if (complianceStat) complianceStat.className = 'stat-card';
    if (complianceStat && complianceRate > 80) complianceStat.classList.add('stat-success');
    else if (complianceStat && complianceRate >= 50) complianceStat.classList.add('stat-warning');
    else if (complianceStat) complianceStat.classList.add('stat-danger');
  }

  function renderPMTable() {
    renderTableLocal(pmData, [
      { key: 'PMNumber', label: 'PM No' },
      { key: 'Title', label: 'Title' },
      { key: 'MachineName', label: 'Machine' },
      { key: 'Frequency', label: 'Freq' },
      { key: 'FrequencyType', label: 'Type' },
      { key: 'DueDate', label: 'Due Date', date: true },
      { key: 'AssignedTechnicianName', label: 'Technician' },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Scheduled': 'primary', 'Overdue': 'danger', 'In Progress': 'info', 'Missed': 'danger' } },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Critical': 'danger', 'High': 'warning', 'Medium': 'info', 'Low': 'success' } }
    ], [
      { label: 'Complete', icon: 'complete', color: 'success', onclick: "PMSchedule.openCompleteForm('{id}')", idField: 'PMNumber', condition: function(r) { return r.Status !== 'Completed'; } },
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "PMSchedule.editPM('{id}')", idField: 'PMNumber' },
      { label: 'Del', icon: 'trash', color: 'danger', onclick: "PMSchedule.deletePM('{id}')", idField: 'PMNumber' }
    ], pmPage, PAGE_SIZE, 'pmTableContainer');
    registerPageState('pmTableContainer', function(p) { pmPage = p; renderPMTable(); });
  }

  function switchTab(tab, btn) {
    pmActiveTab = tab;
    document.querySelectorAll('#pmPage .workflow-tab').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var el;
    el = document.getElementById('pmScheduleView'); if (el) el.style.display = tab === 'schedule' ? '' : 'none';
    el = document.getElementById('pmCalendarView'); if (el) el.style.display = tab === 'calendar' ? '' : 'none';
    el = document.getElementById('pmHistoryView'); if (el) el.style.display = tab === 'history' ? '' : 'none';
    el = document.getElementById('pmComplianceView'); if (el) el.style.display = tab === 'compliance' ? '' : 'none';
    if (tab === 'calendar') renderCalendar(pmCalYear, pmCalMonth);
    else if (tab === 'history') loadPMHistory();
    else if (tab === 'compliance') loadPMCompliance();
  }

  function openForm() {
    var el;
    el = document.getElementById('editPmId'); if (el) el.value = '';
    el = document.getElementById('pmFormNumber'); if (el) el.value = '';
    resetFormLocal('pmForm');
    loadMachinesForSelect('pmFormMachine');
    loadTechniciansForSelect('pmFormTechnician');
    var today = new Date().toISOString().split('T')[0];
    el = document.getElementById('pmFormDueDate'); if (el) el.value = today;
    var nextDue = new Date(); nextDue.setDate(nextDue.getDate() + 30);
    el = document.getElementById('pmFormNextDueDate'); if (el) el.value = nextDue.toISOString().split('T')[0];
    openModalFormLocal('pmForm', 'Add PM Record');
  }

  function editPM(id) {
    var item = pmData.find(function(r) { return r.PMNumber === id; });
    if (!item) return;
    loadMachinesForSelect('pmFormMachine');
    loadTechniciansForSelect('pmFormTechnician');
    var el;
    el = document.getElementById('editPmId'); if (el) el.value = id;
    el = document.getElementById('pmFormNumber'); if (el) el.value = item.PMNumber || '';
    el = document.getElementById('pmFormNumber'); if (el) el.readOnly = true;
    setFormDataLocal('pmForm', item);
    openModalFormLocal('pmForm', 'Edit PM - ' + id);
  }

  function loadMachinesForSelect(id) {
    API.post('getMachines', {})
      .then(function(m) {
        pmMachinesCache = m || [];
        populateSelectLocal(id, pmMachinesCache, 'MachineID', 'MachineName', 'Select Machine');
      })
      .catch(function() {});
  }

  function loadTechniciansForSelect(id) {
    API.post('getTechnicians', {})
      .then(function(t) {
        pmTechsCache = t || [];
        populateSelectLocal(id, pmTechsCache, 'EmployeeID', 'TechnicianName', 'Select Technician');
      })
      .catch(function() {});
  }

  function onMachineChange() {
    var mid = document.getElementById('pmFormMachine').value;
    var machine = pmMachinesCache.find(function(m) { return (m.MachineID || m.id) === mid; });
    var el1, el2, el3;
    el1 = document.getElementById('pmFormMachineName');
    el2 = document.getElementById('pmFormDepartment');
    el3 = document.getElementById('pmFormSection');
    if (machine) {
      if (el1) el1.value = machine.MachineName || machine.name || '';
      if (el2) el2.value = machine.Department || '';
      if (el3) el3.value = machine.Section || '';
    } else {
      if (el1) el1.value = '';
      if (el2) el2.value = '';
      if (el3) el3.value = '';
    }
  }

  function onTechChange() {
    var tid = document.getElementById('pmFormTechnician').value;
    var tech = pmTechsCache.find(function(t) { return (t.EmployeeID || t.id) === tid; });
    var el = document.getElementById('pmFormTechName');
    if (el) el.value = tech ? (tech.TechnicianName || tech.name || '') : '';
  }

  function savePM(e) {
    e.preventDefault();
    var data = getFormDataLocal('pmForm');
    var id = document.getElementById('editPmId').value;
    Loader.show();
    if (id) {
      API.post('updatePMRecord', { id: id, data: data })
        .then(function(result) {
          pmData = result; Loader.hide(); hideModal('pmFormModal');
          Notify.success('PM updated successfully');
          updateSummary(); renderPMTable();
        })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to update PM'); });
    } else {
      API.post('addPMRecord', data)
        .then(function(result) {
          pmData = result; Loader.hide(); hideModal('pmFormModal');
          Notify.success('PM record added successfully');
          updateSummary(); renderPMTable();
        })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to add PM'); });
    }
  }

  function deletePM(id) {
    Modal.confirm('Delete PM Record', 'Are you sure you want to delete this PM record?', function() {
      Loader.show();
      API.post('deletePMRecord', { id: id })
        .then(function(result) {
          pmData = result; Loader.hide();
          Notify.success('PM record deleted');
          updateSummary(); renderPMTable();
        })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to delete PM'); });
    });
  }

  function openCompleteForm(id) {
    var item = pmData.find(function(r) { return r.PMNumber === id; });
    if (!item) return;
    var el;
    el = document.getElementById('completePmId'); if (el) el.value = id;
    el = document.getElementById('completePmNumber'); if (el) el.value = item.PMNumber || '';
    el = document.getElementById('completePmTitle'); if (el) el.value = item.Title || '';
    el = document.getElementById('completePmMachine'); if (el) el.value = item.MachineName || '';
    el = document.getElementById('completePmStatus'); if (el) el.value = 'Completed';
    var today = new Date().toISOString().split('T')[0];
    el = document.getElementById('completePmDate'); if (el) el.value = today;
    var freq = parseInt(item.Frequency) || 30;
    var nextDue = new Date(); nextDue.setDate(nextDue.getDate() + freq);
    el = document.getElementById('completePmNextDue'); if (el) el.value = nextDue.toISOString().split('T')[0];
    el = document.getElementById('completePmRemarks'); if (el) el.value = '';
    resetFormLocal('pmCompleteForm');
    el = document.getElementById('completePmId'); if (el) el.value = id;
    el = document.getElementById('completePmDate'); if (el) el.value = today;
    el = document.getElementById('completePmNextDue'); if (el) el.value = nextDue.toISOString().split('T')[0];
    showModal('pmCompleteModal');
  }

  function saveComplete(e) {
    e.preventDefault();
    var id = document.getElementById('completePmId').value;
    var data = getFormDataLocal('pmCompleteForm');
    data.Status = 'Completed';
    Loader.show();
    API.post('completePM', { id: id, data: data })
      .then(function(result) {
        pmData = result; Loader.hide(); hideModal('pmCompleteModal');
        Notify.success('PM completed successfully');
        updateSummary(); renderPMTable();
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to complete PM'); });
  }

  function searchTable() {
    var query = document.getElementById('pmSearch').value;
    pmFilter.search = query;
    if (pmSearchDebounce) clearTimeout(pmSearchDebounce);
    pmSearchDebounce = setTimeout(function() {
      if (!query && !pmFilter.machine && !pmFilter.technician && !pmFilter.status && !pmFilter.priority) {
        loadData();
        return;
      }
      Loader.show();
      API.post('searchPMRecords', { query: query })
        .then(function(result) {
          pmData = result; Loader.hide(); pmPage = 1; renderPMTable();
        })
        .catch(function() { Loader.hide(); Notify.error('Search failed'); });
    }, 300);
  }

  function applyFilter() {
    pmFilter.machine = document.getElementById('pmFilterMachine').value;
    pmFilter.technician = document.getElementById('pmFilterTechnician').value;
    pmFilter.status = document.getElementById('pmFilterStatus').value;
    pmFilter.priority = document.getElementById('pmFilterPriority').value;
    Loader.show();
    var filtered = pmData;
    if (pmFilter.machine) filtered = filtered.filter(function(r) { return r.MachineID === pmFilter.machine || r.MachineName === pmFilter.machine; });
    if (pmFilter.technician) filtered = filtered.filter(function(r) { return r.AssignedTechnician === pmFilter.technician || r.AssignedTechnicianName === pmFilter.technician; });
    if (pmFilter.status) filtered = filtered.filter(function(r) { return r.Status === pmFilter.status; });
    if (pmFilter.priority) filtered = filtered.filter(function(r) { return r.Priority === pmFilter.priority; });
    pmData = filtered;
    Loader.hide();
    pmPage = 1;
    renderPMTable();
  }

  function clearFilter() {
    var el;
    el = document.getElementById('pmFilterMachine'); if (el) el.value = '';
    el = document.getElementById('pmFilterTechnician'); if (el) el.value = '';
    el = document.getElementById('pmFilterStatus'); if (el) el.value = '';
    el = document.getElementById('pmFilterPriority'); if (el) el.value = '';
    el = document.getElementById('pmSearch'); if (el) el.value = '';
    pmFilter = { search: '', machine: '', technician: '', status: '', priority: '' };
    loadData();
  }

  function openBulkForm() {
    resetFormLocal('pmBulkForm');
    loadMachinesForSelect('pmBulkMachine');
    loadTechniciansForSelect('pmBulkTechnician');
    var today = new Date().toISOString().split('T')[0];
    var bulkForm = document.getElementById('pmBulkForm');
    var sd = bulkForm ? bulkForm.querySelector('[name="StartDate"]') : null;
    if (sd) sd.value = today;
    showModal('pmBulkModal');
  }

  function saveBulk(e) {
    e.preventDefault();
    var data = getFormDataLocal('pmBulkForm');
    data.Cycles = parseInt(data.Cycles) || 12;
    Loader.show();
    API.post('bulkGeneratePMs', data)
      .then(function(result) {
        pmData = result; Loader.hide(); hideModal('pmBulkModal');
        Notify.success('PMs generated successfully');
        updateSummary(); renderPMTable();
      })
      .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to generate PMs'); });
  }

  function exportCSV() {
    if (!pmData || pmData.length === 0) { Notify.warning('No data to export'); return; }
    var headers = ['PMNumber','Title','MachineName','Department','Section','Frequency','FrequencyType','AssignedTechnicianName','Priority','Status','StartDate','DueDate','NextDueDate','CompletionDate','ComplianceStatus','Remarks'];
    var csv = headers.join(',') + '\n';
    pmData.forEach(function(r) {
      var row = headers.map(function(h) {
        var val = r[h] !== undefined && r[h] !== null ? r[h] : '';
        val = String(val).replace(/"/g, '""');
        if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) val = '"' + val + '"';
        return val;
      });
      csv += row.join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'PM_Schedule_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Notify.success('Export completed');
  }

  function renderCalendar(year, month) {
    pmCalYear = year;
    pmCalMonth = month;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    setText('pmCalTitle', months[month] + ' ' + year);
    Loader.show();
    API.post('getPMCalendarData', { year: year, month: month + 1 })
      .then(function(data) {
        Loader.hide();
        var calData = data || [];
        buildCalendarGrid(year, month, calData);
      })
      .catch(function() { Loader.hide(); Notify.error('Failed to load calendar data'); });
  }

  function buildCalendarGrid(year, month, calData) {
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var html = '<table class="calendar-table" style="width:100%;border-collapse:collapse"><thead><tr>';
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dayNames.forEach(function(d) { html += '<th style="padding:8px;text-align:center;font-weight:600;font-size:12px;color:var(--text-muted);border-bottom:2px solid var(--border)">' + d + '</th>'; });
    html += '</tr></thead><tbody>';
    var day = 1;
    for (var row = 0; row < 6; row++) {
      if (day > daysInMonth) break;
      html += '<tr>';
      for (var col = 0; col < 7; col++) {
        if (row === 0 && col < firstDay) {
          html += '<td style="padding:4px;border:1px solid var(--border);background:var(--bg-secondary)"></td>';
        } else if (day > daysInMonth) {
          html += '<td style="padding:4px;border:1px solid var(--border);background:var(--bg-secondary)"></td>';
        } else {
          var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          var isToday = dateStr === todayStr;
          var dayPMs = calData.filter(function(p) {
            var d = p.DueDate || p.NextDueDate || p.CompletionDate;
            return d && d.slice(0, 10) === dateStr;
          });
          var colors = [];
          dayPMs.forEach(function(p) {
            if (p.Status === 'Completed') colors.push('success');
            else if (p.Status === 'Overdue') colors.push('danger');
            else if (p.Status === 'In Progress') colors.push('info');
            else colors.push('warning');
          });
          var dotHtml = '';
          if (dayPMs.length > 0) {
            var uniqueColors = colors.filter(function(c, i) { return colors.indexOf(c) === i; });
            dotHtml = '<div style="display:flex;gap:3px;justify-content:center;margin-top:2px;flex-wrap:wrap">';
            uniqueColors.forEach(function(c) {
              dotHtml += '<span style="width:6px;height:6px;border-radius:50%;background:var(--' + c + ')"></span>';
            });
            dotHtml += '</div>';
          }
          var dayStyle = 'padding:6px 4px;border:1px solid var(--border);text-align:center;vertical-align:top;cursor:pointer;font-size:13px;min-height:60px';
          if (isToday) dayStyle += ';background:var(--primary);color:#fff;font-weight:700';
          html += '<td style="' + dayStyle + '" onclick="PMSchedule.showDayDetail(\'' + dateStr + '\')">';
          html += '<div style="font-weight:' + (isToday ? '700' : '500') + '">' + day + '</div>';
          html += dotHtml;
          if (dayPMs.length > 0) {
            html += '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' + dayPMs.length + ' PMs</div>';
          }
          html += '</td>';
          day++;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    var el = document.getElementById('pmCalendarGrid'); if (el) el.innerHTML = html;
    var el2 = document.getElementById('pmCalendarDayDetail'); if (el2) el2.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:8px">Click on a day to view PM details</div>';
  }

  function showDayDetail(dateStr) {
    Loader.show();
    API.post('getPMByDateRange', { startDate: dateStr, endDate: dateStr })
      .then(function(data) {
        Loader.hide();
        var pmList = data || [];
        if (pmList.length === 0) {
          var el = document.getElementById('pmCalendarDayDetail'); if (el) el.innerHTML = '<div class="empty-state" style="padding:16px"><h3>No PMs for ' + dateStr + '</h3></div>';
          return;
        }
        renderTableLocal(pmList, [
          { key: 'PMNumber', label: 'PM No' },
          { key: 'Title', label: 'Title' },
          { key: 'MachineName', label: 'Machine' },
          { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Scheduled': 'primary', 'Overdue': 'danger', 'In Progress': 'info', 'Missed': 'danger' } }
        ], null, 1, 5, 'pmCalendarDayDetail');
      })
      .catch(function() { Loader.hide(); Notify.error('Failed to load day details'); });
  }

  function prevMonth() {
    pmCalMonth--;
    if (pmCalMonth < 0) { pmCalMonth = 11; pmCalYear--; }
    renderCalendar(pmCalYear, pmCalMonth);
  }

  function nextMonth() {
    pmCalMonth++;
    if (pmCalMonth > 11) { pmCalMonth = 0; pmCalYear++; }
    renderCalendar(pmCalYear, pmCalMonth);
  }

  function goToToday() {
    var now = new Date();
    pmCalYear = now.getFullYear();
    pmCalMonth = now.getMonth();
    renderCalendar(pmCalYear, pmCalMonth);
  }

  function loadPMHistory() {
    Loader.show();
    API.post('getPMHistory', {})
      .then(function(data) {
        Loader.hide();
        renderHistoryTable(data || []);
      })
      .catch(function() { Loader.hide(); Notify.error('Failed to load PM history'); });
  }

  function renderHistoryTable(data) {
    renderTableLocal(data, [
      { key: 'PMNumber', label: 'PM No' },
      { key: 'Title', label: 'Title' },
      { key: 'MachineName', label: 'Machine' },
      { key: 'CompletionDate', label: 'Completed', date: true },
      { key: 'AssignedTechnicianName', label: 'Technician' },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Scheduled': 'primary', 'Overdue': 'danger', 'In Progress': 'info', 'Missed': 'danger' } }
    ], null, pmHistoryPage, PAGE_SIZE, 'pmHistoryContainer');
    registerPageState('pmHistoryContainer', function(p) { pmHistoryPage = p; loadPMHistory(); });
  }

  function searchHistory() {
    var query = document.getElementById('pmHistorySearch').value;
    Loader.show();
    API.post('getPMHistory', {})
      .then(function(data) {
        Loader.hide();
        var filtered = (data || []).filter(function(r) {
          if (!query) return true;
          var q = query.toLowerCase();
          return (r.PMNumber && r.PMNumber.toLowerCase().indexOf(q) > -1) ||
                 (r.Title && r.Title.toLowerCase().indexOf(q) > -1) ||
                 (r.MachineName && r.MachineName.toLowerCase().indexOf(q) > -1);
        });
        renderHistoryTable(filtered);
      })
      .catch(function() { Loader.hide(); Notify.error('Search failed'); });
  }

  function loadPMCompliance() {
    Loader.show();
    API.post('getPMCompliance', {})
      .then(function(data) {
        Loader.hide();
        renderComplianceView(data || { total: 0, completed: 0, overdue: 0, complianceRate: 0 });
      })
      .catch(function() { Loader.hide(); Notify.error('Failed to load compliance data'); });
  }

  function renderComplianceView(compliance) {
    var rate = compliance.complianceRate || 0;
    var total = compliance.total || 0;
    var completed = compliance.completed || 0;
    var overdue = compliance.overdue || 0;
    var missed = compliance.missed || 0;
    var scheduled = total - completed - overdue - missed;
    if (scheduled < 0) scheduled = 0;
    var pcl = document.getElementById('pmComplianceLarge');
    if (pcl) pcl.textContent = rate + '%';
    if (pcl) pcl.style.color = rate > 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)';
    var breakdownHtml = '';
    var items = [
      { label: 'Completed', count: completed, color: 'var(--success)', pct: total > 0 ? Math.round((completed / total) * 100) : 0 },
      { label: 'Overdue', count: overdue, color: 'var(--danger)', pct: total > 0 ? Math.round((overdue / total) * 100) : 0 },
      { label: 'Missed', count: missed, color: 'var(--danger)', pct: total > 0 ? Math.round((missed / total) * 100) : 0 },
      { label: 'Scheduled', count: scheduled, color: 'var(--info)', pct: total > 0 ? Math.round((scheduled / total) * 100) : 0 }
    ];
    items.forEach(function(item) {
      breakdownHtml +=
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<div style="width:12px;height:12px;border-radius:3px;background:' + item.color + ';flex-shrink:0"></div>' +
          '<div style="flex:1;font-size:13px">' + item.label + '</div>' +
          '<div style="font-weight:600;font-size:14px;min-width:40px;text-align:right">' + item.count + '</div>' +
          '<div style="font-size:12px;color:var(--text-muted);min-width:40px;text-align:right">' + item.pct + '%</div>' +
          '<div style="width:100px;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden">' +
            '<div style="width:' + item.pct + '%;height:100%;background:' + item.color + ';border-radius:3px"></div>' +
          '</div>' +
        '</div>';
    });
    var el = document.getElementById('pmComplianceBreakdown'); if (el) el.innerHTML = breakdownHtml;
    loadMachineCompliance();
  }

  function loadMachineCompliance() {
    var machines = {};
    pmData.forEach(function(r) {
      var key = r.MachineName || 'Unknown';
      if (!machines[key]) machines[key] = { total: 0, completed: 0 };
      machines[key].total++;
      if (r.Status === 'Completed') machines[key].completed++;
    });
    var tableData = Object.keys(machines).map(function(k) {
      var m = machines[k];
      var rate = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
      return { Machine: k, Total: m.total, Completed: m.completed, Rate: rate + '%' };
    });
    renderTableLocal(tableData, [
      { key: 'Machine', label: 'Machine' },
      { key: 'Total', label: 'Total PMs' },
      { key: 'Completed', label: 'Completed' },
      { key: 'Rate', label: 'Compliance %' }
    ], null, 1, PAGE_SIZE, 'pmMachineComplianceContainer');
  }

  function hideFormModal() { hideModal('pmFormModal'); }
  function hideCompleteModal() { hideModal('pmCompleteModal'); }
  function hideBulkModal() { hideModal('pmBulkModal'); }

  return {
    show: renderPage,
    switchTab: switchTab,
    openForm: openForm,
    editPM: editPM,
    savePM: savePM,
    deletePM: deletePM,
    openCompleteForm: openCompleteForm,
    saveComplete: saveComplete,
    searchTable: searchTable,
    applyFilter: applyFilter,
    clearFilter: clearFilter,
    openBulkForm: openBulkForm,
    saveBulk: saveBulk,
    exportCSV: exportCSV,
    prevMonth: prevMonth,
    nextMonth: nextMonth,
    goToToday: goToToday,
    showDayDetail: showDayDetail,
    searchHistory: searchHistory,
    onMachineChange: onMachineChange,
    onTechChange: onTechChange,
    hideFormModal: hideFormModal,
    hideCompleteModal: hideCompleteModal,
    hideBulkModal: hideBulkModal,
    changePage: changePage
  };
})();
