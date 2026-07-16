/* ============================================================
   pm.js — Preventive Maintenance Page Module (GAS-identical)
   ============================================================ */

(function() {
  var _data = [];
  var _page = 1;
  var _activeTab = 'schedule';
  var _filter = { search: '', machine: '', technician: '', status: '', priority: '' };
  var _machinesCache = [];
  var _techsCache = [];
  var _calYear = new Date().getFullYear();
  var _calMonth = new Date().getMonth();
  var _historyPage = 1;
  var _searchTimer = null;

  App.registerPage('pm', render, load);

  function render() {
    var el = document.getElementById('page-pm');
    if (!el) return;
    el.innerHTML =
      '<div class="dashboard-grid" id="pmSummaryCards" style="margin-bottom:16px">' +
        '<div class="stat-card stat-primary"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div><div class="stat-info"><h3 id="pmTotalCount">0</h3><p>Total PMs</p></div></div></div>' +
        '<div class="stat-card stat-success"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 id="pmCompletedCount">0</h3><p>Completed</p></div></div></div>' +
        '<div class="stat-card stat-info"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 id="pmScheduledCount">0</h3><p>Scheduled</p></div></div></div>' +
        '<div class="stat-card stat-danger"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-info"><h3 id="pmOverdueCount">0</h3><p>Overdue</p></div></div></div>' +
        '<div class="stat-card stat-warning"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div><div class="stat-info"><h3 id="pmDueThisMonth">0</h3><p>Due This Month</p></div></div></div>' +
        '<div class="stat-card" id="pmComplianceStat"><div class="stat-inner"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12A10 10 0 1112 2a10 10 0 0110 10z"/><path d="M12 6v6l4 2"/></svg></div><div class="stat-info"><h3 id="pmComplianceRate">0%</h3><p>Compliance</p></div></div></div>' +
      '</div>' +
      '<div class="workflow-tabs">' +
        '<button class="workflow-tab active" data-tab="schedule" onclick="PM.switchTab(\'schedule\')"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span><span class="tab-label">Schedule</span></button>' +
        '<button class="workflow-tab" data-tab="calendar" onclick="PM.switchTab(\'calendar\')"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg></span><span class="tab-label">Calendar</span></button>' +
        '<button class="workflow-tab" data-tab="history" onclick="PM.switchTab(\'history\')"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span class="tab-label">History</span></button>' +
        '<button class="workflow-tab" data-tab="compliance" onclick="PM.switchTab(\'compliance\')"><span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12A10 10 0 1112 2a10 10 0 0110 10z"/><path d="M16 8l-6 6-3-3"/></svg></span><span class="tab-label">Compliance</span></button>' +
      '</div>' +
      '<div id="pmScheduleView">' +
        '<div class="filter-bar" id="pmFilterBar">' +
          '<div class="form-group"><label>Search</label><div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" class="form-control" id="pmSearch" placeholder="Search PM..." oninput="PM.search(this.value)"></div></div>' +
          '<div class="form-group"><label>Machine</label><select class="form-control" id="pmFilterMachine" onchange="PM.applyFilter()"><option value="">All Machines</option></select></div>' +
          '<div class="form-group"><label>Technician</label><select class="form-control" id="pmFilterTechnician" onchange="PM.applyFilter()"><option value="">All Technicians</option></select></div>' +
          '<div class="form-group"><label>Status</label><select class="form-control" id="pmFilterStatus" onchange="PM.applyFilter()"><option value="">All Status</option><option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Overdue">Overdue</option><option value="Missed">Missed</option></select></div>' +
          '<div class="form-group"><label>Priority</label><select class="form-control" id="pmFilterPriority" onchange="PM.applyFilter()"><option value="">All Priority</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>' +
          '<div class="form-group" style="align-self:flex-end"><button class="btn btn-secondary btn-sm" onclick="PM.clearFilter()">Clear</button></div>' +
        '</div>' +
        '<div class="card"><div class="card-header"><div class="card-title">Preventive Maintenance Schedule</div><div class="card-actions">' +
          '<button class="btn btn-primary" onclick="PM.openForm()">+ Add PM</button>' +
          '<button class="btn btn-secondary" onclick="PM.bulkGenerate()">Bulk Generate</button>' +
          '<button class="btn btn-secondary" onclick="PM.exportCSV()">Export</button>' +
        '</div></div><div id="pmTableContainer"></div></div>' +
      '</div>' +
      '<div id="pmCalendarView" style="display:none">' +
        '<div class="card"><div class="card-header"><div class="card-title"><button class="btn btn-sm btn-secondary" onclick="PM.prevMonth()" style="margin-right:8px">&lsaquo;</button><span id="pmCalTitle" style="font-size:18px;font-weight:600"></span><button class="btn btn-sm btn-secondary" onclick="PM.nextMonth()" style="margin-left:8px">&rsaquo;</button></div><div class="card-actions"><button class="btn btn-sm btn-primary" onclick="PM.goToday()">Today</button></div></div><div id="pmCalendarGrid"></div><div id="pmCalendarDayDetail" style="padding:16px;border-top:1px solid var(--border)"></div></div>' +
      '</div>' +
      '<div id="pmHistoryView" style="display:none">' +
        '<div class="card"><div class="card-header"><div class="card-title">PM History</div><div class="card-actions"><div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" class="form-control" id="pmHistorySearch" placeholder="Search history..." oninput="PM.searchHistory(this.value)"></div></div></div><div id="pmHistoryContainer"></div></div>' +
      '</div>' +
      '<div id="pmComplianceView" style="display:none">' +
        '<div class="dashboard-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px"><div class="card" style="margin-bottom:0"><div class="card-header"><div class="card-title">Compliance Rate</div></div><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px"><div id="pmComplianceLarge" style="font-size:72px;font-weight:800;line-height:1">0%</div><div style="font-size:14px;color:var(--text-muted);margin-top:8px">Overall PM Compliance</div></div></div><div class="card" style="margin-bottom:0"><div class="card-header"><div class="card-title">Breakdown</div></div><div style="padding:16px;display:flex;flex-direction:column;gap:12px" id="pmComplianceBreakdown"></div></div></div>' +
        '<div class="card"><div class="card-header"><div class="card-title">Machine-wise Compliance</div></div><div id="pmMachineComplianceContainer"></div></div>' +
      '</div>' +
      PMFormModalHTML() +
      PMCompleteModalHTML() +
      PMBulkModalHTML();
  }

  function PMFormModalHTML() {
    return '<div class="modal-overlay" id="pmFormModal" style="display:none"><div class="modal modal-wide" style="max-width:700px"><div class="modal-header"><div class="modal-title" id="pmFormTitle">Add PM Record</div><button class="modal-close" onclick="PM.hideModal(\'pmFormModal\')">&times;</button></div>' +
      '<form id="pmForm" onsubmit="return PM.save(event)"><div class="modal-body">' +
        '<input type="hidden" name="id" id="editPmId">' +
        '<div class="form-row"><div class="form-group"><label>PM Number</label><input type="text" name="PMNumber" class="form-control" id="pmFormNumber" readonly placeholder="Auto-generated"></div><div class="form-group"><label>Title *</label><input type="text" name="Title" class="form-control" required placeholder="PM title"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Machine *</label><select name="MachineID" class="form-control" id="pmFormMachine" required onchange="PM.onMachineChange()"><option value="">Select Machine</option></select></div><div class="form-group"><label>Machine Name</label><input type="text" name="MachineName" class="form-control" id="pmFormMachineName" readonly></div></div>' +
        '<div class="form-row-3"><div class="form-group"><label>Department</label><input type="text" name="Department" class="form-control" id="pmFormDepartment" readonly></div><div class="form-group"><label>Section</label><input type="text" name="Section" class="form-control" id="pmFormSection" readonly></div><div class="form-group"><label>Frequency *</label><input type="number" name="Frequency" class="form-control" required min="1"></div></div>' +
        '<div class="form-row-3"><div class="form-group"><label>Frequency Type</label><select name="FrequencyType" class="form-control"><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly" selected>Monthly</option><option value="Quarterly">Quarterly</option><option value="Half Yearly">Half Yearly</option><option value="Yearly">Yearly</option></select></div><div class="form-group"><label>Assigned Technician</label><select name="AssignedTechnician" class="form-control" id="pmFormTechnician" onchange="PM.onTechChange()"><option value="">Select Technician</option></select></div><div class="form-group"><label>Tech Name</label><input type="text" name="AssignedTechnicianName" class="form-control" id="pmFormTechName" readonly></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Checklist Template</label><input type="text" name="ChecklistTemplate" class="form-control" placeholder="Optional template name"></div><div class="form-group"><label>Priority</label><select name="Priority" class="form-control"><option value="Medium">Medium</option><option value="Low">Low</option><option value="High">High</option><option value="Critical">Critical</option></select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></div><div class="form-group"><label>Start Date</label><input type="date" name="StartDate" class="form-control"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Due Date</label><input type="date" name="DueDate" class="form-control" id="pmFormDueDate"></div><div class="form-group"><label>Next Due Date</label><input type="date" name="NextDueDate" class="form-control" id="pmFormNextDueDate"></div></div>' +
        '<div class="form-group"><label>Remarks</label><textarea name="Remarks" class="form-control" rows="3"></textarea></div>' +
      '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="PM.hideModal(\'pmFormModal\')">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div></div>';
  }

  function PMCompleteModalHTML() {
    return '<div class="modal-overlay" id="pmCompleteModal" style="display:none"><div class="modal" style="max-width:550px"><div class="modal-header"><div class="modal-title">Complete PM</div><button class="modal-close" onclick="PM.hideModal(\'pmCompleteModal\')">&times;</button></div>' +
      '<form id="pmCompleteForm" onsubmit="return PM.saveComplete(event)"><div class="modal-body">' +
        '<input type="hidden" name="id" id="completePmId">' +
        '<div class="form-row"><div class="form-group"><label>PM Number</label><input type="text" class="form-control" id="completePmNumber" readonly></div><div class="form-group"><label>Title</label><input type="text" class="form-control" id="completePmTitle" readonly></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Machine</label><input type="text" class="form-control" id="completePmMachine" readonly></div><div class="form-group"><label>Status</label><input type="text" class="form-control" id="completePmStatus" readonly value="Completed"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Completion Date *</label><input type="date" name="CompletionDate" class="form-control" id="completePmDate" required></div><div class="form-group"><label>Next Due Date *</label><input type="date" name="NextDueDate" class="form-control" id="completePmNextDue" required></div></div>' +
        '<div class="form-group"><label>Remarks</label><textarea name="Remarks" class="form-control" id="completePmRemarks" rows="3"></textarea></div>' +
      '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="PM.hideModal(\'pmCompleteModal\')">Cancel</button><button type="submit" class="btn btn-success">Complete PM</button></div></form></div></div>';
  }

  function PMBulkModalHTML() {
    return '<div class="modal-overlay" id="pmBulkModal" style="display:none"><div class="modal" style="max-width:600px"><div class="modal-header"><div class="modal-title">Bulk Generate PMs</div><button class="modal-close" onclick="PM.hideModal(\'pmBulkModal\')">&times;</button></div>' +
      '<form id="pmBulkForm" onsubmit="return PM.saveBulk(event)"><div class="modal-body">' +
        '<div class="form-row"><div class="form-group"><label>Machine *</label><select name="MachineID" class="form-control" id="pmBulkMachine" required><option value="">Select Machine</option></select></div><div class="form-group"><label>Frequency *</label><input type="number" name="Frequency" class="form-control" required min="1"></div></div>' +
        '<div class="form-row-3"><div class="form-group"><label>Frequency Type</label><select name="FrequencyType" class="form-control"><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly" selected>Monthly</option><option value="Quarterly">Quarterly</option><option value="Half Yearly">Half Yearly</option><option value="Yearly">Yearly</option></select></div><div class="form-group"><label>Number of Cycles</label><input type="number" name="Cycles" class="form-control" value="12" min="1" max="52"></div><div class="form-group"><label>Start Date</label><input type="date" name="StartDate" class="form-control"></div></div>' +
        '<div class="form-group"><label>Title Prefix</label><input type="text" name="TitlePrefix" class="form-control" placeholder="e.g., Monthly Inspection - "></div>' +
        '<div class="form-row"><div class="form-group"><label>Technician</label><select name="AssignedTechnician" class="form-control" id="pmBulkTechnician"><option value="">Select Technician</option></select></div><div class="form-group"><label>Priority</label><select name="Priority" class="form-control"><option value="Medium">Medium</option><option value="Low">Low</option><option value="High">High</option><option value="Critical">Critical</option></select></div></div>' +
      '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="PM.hideModal(\'pmBulkModal\')">Cancel</button><button type="submit" class="btn btn-primary">Generate</button></div></form></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getPMRecords')
      .then(function(data) {
        _data = data || [];
        App.showLoading(false);
        updateSummary();
        renderTable();
        loadFilterSelects();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load PM records: ' + err.message, 'error');
      });
  }

  function loadFilterSelects() {
    API.call('getMachines').then(function(m) {
      _machinesCache = m || [];
      var sel = document.getElementById('pmFilterMachine');
      if (sel) { sel.innerHTML = '<option value="">All Machines</option>'; _machinesCache.forEach(function(item) { sel.innerHTML += '<option value="' + escapeHtml(item.MachineID || item.id || '') + '">' + escapeHtml(item.MachineName || item.name || '') + '</option>'; }); }
      var sel2 = document.getElementById('pmFormMachine');
      if (sel2) { sel2.innerHTML = '<option value="">Select Machine</option>'; _machinesCache.forEach(function(item) { sel2.innerHTML += '<option value="' + escapeHtml(item.MachineID || item.id || '') + '">' + escapeHtml(item.MachineName || item.name || '') + '</option>'; }); }
      var sel3 = document.getElementById('pmBulkMachine');
      if (sel3) { sel3.innerHTML = '<option value="">Select Machine</option>'; _machinesCache.forEach(function(item) { sel3.innerHTML += '<option value="' + escapeHtml(item.MachineID || item.id || '') + '">' + escapeHtml(item.MachineName || item.name || '') + '</option>'; }); }
    }).catch(function(){});
    API.call('getTechnicians').then(function(t) {
      _techsCache = t || [];
      var sel = document.getElementById('pmFilterTechnician');
      if (sel) { sel.innerHTML = '<option value="">All Technicians</option>'; _techsCache.forEach(function(item) { sel.innerHTML += '<option value="' + escapeHtml(item.EmployeeID || item.id || '') + '">' + escapeHtml(item.TechnicianName || item.name || '') + '</option>'; }); }
      var sel2 = document.getElementById('pmFormTechnician');
      if (sel2) { sel2.innerHTML = '<option value="">Select Technician</option>'; _techsCache.forEach(function(item) { sel2.innerHTML += '<option value="' + escapeHtml(item.EmployeeID || item.id || '') + '">' + escapeHtml(item.TechnicianName || item.name || '') + '</option>'; }); }
      var sel3 = document.getElementById('pmBulkTechnician');
      if (sel3) { sel3.innerHTML = '<option value="">Select Technician</option>'; _techsCache.forEach(function(item) { sel3.innerHTML += '<option value="' + escapeHtml(item.EmployeeID || item.id || '') + '">' + escapeHtml(item.TechnicianName || item.name || '') + '</option>'; }); }
    }).catch(function(){});
  }

  function updateSummary() {
    var total = _data.length;
    var completed = _data.filter(function(r) { return r.Status === 'Completed'; }).length;
    var scheduled = _data.filter(function(r) { return r.Status === 'Scheduled'; }).length;
    var overdue = _data.filter(function(r) { return r.Status === 'Overdue'; }).length;
    var now = new Date();
    var ms = new Date(now.getFullYear(), now.getMonth(), 1);
    var me = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    var dueMonth = _data.filter(function(r) {
      if (r.Status === 'Completed') return false;
      var d = r.DueDate ? new Date(r.DueDate) : null;
      return d && d >= ms && d <= me;
    }).length;
    var rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    setText('pmTotalCount', total);
    setText('pmCompletedCount', completed);
    setText('pmScheduledCount', scheduled);
    setText('pmOverdueCount', overdue);
    setText('pmDueThisMonth', dueMonth);
    setText('pmComplianceRate', rate + '%');
    var cs = document.getElementById('pmComplianceStat');
    if (cs) { cs.className = 'stat-card'; if (rate > 80) cs.classList.add('stat-success'); else if (rate >= 50) cs.classList.add('stat-warning'); else cs.classList.add('stat-danger'); }
  }

  function renderTable() {
    var filtered = applyFilters(_data);
    var columns = [
      { key: 'PMNumber', label: 'PM No' },
      { key: 'Title', label: 'Title' },
      { key: 'MachineName', label: 'Machine' },
      { key: 'Frequency', label: 'Freq' },
      { key: 'FrequencyType', label: 'Type' },
      { key: 'DueDate', label: 'Due Date', date: true },
      { key: 'AssignedTechnicianName', label: 'Technician' },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Scheduled': 'primary', 'Overdue': 'danger', 'In Progress': 'info', 'Missed': 'danger' } },
      { key: 'Priority', label: 'Priority', badge: true, badgeMap: { 'Critical': 'danger', 'High': 'warning', 'Medium': 'info', 'Low': 'success' } }
    ];
    var actions = [
      { label: 'Complete', color: 'success', onclick: "PM.openComplete('{id}')", idField: 'PMNumber', condition: function(r) { return r.Status !== 'Completed'; } },
      { label: 'Edit', color: 'primary', onclick: "PM.edit('{id}')", idField: 'PMNumber' },
      { label: 'Del', color: 'danger', onclick: "PM.delete('{id}')", idField: 'PMNumber' }
    ];
    renderTableData(filtered, columns, actions, _page, 25, 'pmTableContainer');
  }

  function renderTableData(list, columns, actions, pg, ps, containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!list || list.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128197;</div><div class="empty-state-text">No records found</div></div>';
      return;
    }
    var tp = Math.ceil(list.length / ps) || 1;
    if (pg > tp) pg = tp;
    var html = '<table><thead><tr><th>#</th>';
    columns.forEach(function(c) { html += '<th>' + c.label + '</th>'; });
    if (actions) html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    var start = (pg - 1) * ps;
    for (var i = start; i < Math.min(start + ps, list.length); i++) {
      var r = list[i];
      html += '<tr><td style="color:var(--text-muted)">' + (i + 1) + '</td>';
      columns.forEach(function(c) {
        var val = r[c.key];
        if (c.format) { html += '<td>' + c.format(val, r) + '</td>'; }
        else if (c.badge && val) { var bc = c.badgeMap && c.badgeMap[val] ? c.badgeMap[val] : 'secondary'; html += '<td><span class="badge badge-' + bc + '">' + escapeHtml(val) + '</span></td>'; }
        else if (c.date && val) { html += '<td>' + formatDate(val) + '</td>'; }
        else { html += '<td>' + escapeHtml(val || '-') + '</td>'; }
      });
      if (actions) {
        html += '<td style="white-space:nowrap">';
        actions.forEach(function(a) {
          if (a.condition && !a.condition(r)) return;
          var id = r[a.idField] || '';
          html += '<button class="btn btn-sm btn-' + a.color + '" onclick="' + a.onclick.replace('{id}', escapeHtml(id)) + '">' + a.label + '</button> ';
        });
        html += '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    if (tp > 1) {
      html += '<div class="pagination"><button ' + (pg <= 1 ? 'disabled' : '') + ' onclick="PM.page(' + (pg - 1) + ')">Prev</button>';
      for (var p = 1; p <= tp; p++) { if (tp > 7 && p > 3 && p < tp - 2 && Math.abs(p - pg) > 1) { if (p === 4 || p === tp - 3) html += '<button disabled>...</button>'; continue; } html += '<button class="' + (p === pg ? 'active' : '') + '" onclick="PM.page(' + p + ')">' + p + '</button>'; }
      html += '<button ' + (pg >= tp ? 'disabled' : '') + ' onclick="PM.page(' + (pg + 1) + ')">Next</button></div>';
    }
    el.innerHTML = html;
  }

  function applyFilters(data) {
    var list = data;
    var sf = _filter.search ? _filter.search.toLowerCase() : '';
    if (sf) list = list.filter(function(r) { return (r.PMNumber || '').toLowerCase().indexOf(sf) > -1 || (r.Title || '').toLowerCase().indexOf(sf) > -1 || (r.MachineName || '').toLowerCase().indexOf(sf) > -1; });
    if (_filter.machine) list = list.filter(function(r) { return r.MachineID === _filter.machine || r.MachineName === _filter.machine; });
    if (_filter.technician) list = list.filter(function(r) { return r.AssignedTechnician === _filter.technician || r.AssignedTechnicianName === _filter.technician; });
    if (_filter.status) list = list.filter(function(r) { return r.Status === _filter.status; });
    if (_filter.priority) list = list.filter(function(r) { return r.Priority === _filter.priority; });
    return list;
  }

  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  window.PM = {
    switchTab: function(tab) {
      _activeTab = tab;
      document.querySelectorAll('.workflow-tab').forEach(function(b) { if (b) b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
      ['pmScheduleView','pmCalendarView','pmHistoryView','pmComplianceView'].forEach(function(id) { var e = document.getElementById(id); if (e) e.style.display = 'none'; });
      var viewMap = { schedule: 'pmScheduleView', calendar: 'pmCalendarView', history: 'pmHistoryView', compliance: 'pmComplianceView' };
      var v = document.getElementById(viewMap[tab]); if (v) v.style.display = '';
      if (tab === 'calendar') PM.renderCalendar(_calYear, _calMonth);
      else if (tab === 'history') PM.loadHistory();
      else if (tab === 'compliance') PM.loadCompliance();
    },
    search: function(q) {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function() { _filter.search = q; _page = 1; renderTable(); }, 300);
    },
    applyFilter: function() {
      _filter.machine = (document.getElementById('pmFilterMachine') || {}).value || '';
      _filter.technician = (document.getElementById('pmFilterTechnician') || {}).value || '';
      _filter.status = (document.getElementById('pmFilterStatus') || {}).value || '';
      _filter.priority = (document.getElementById('pmFilterPriority') || {}).value || '';
      _page = 1; renderTable();
    },
    clearFilter: function() {
      _filter = { search: '', machine: '', technician: '', status: '', priority: '' };
      ['pmFilterMachine','pmFilterTechnician','pmFilterStatus','pmFilterPriority','pmSearch'].forEach(function(id) { var e = document.getElementById(id); if (e) e.value = ''; });
      _page = 1; renderTable();
    },
    page: function(p) { _page = p; renderTable(); },
    openForm: function() {
      document.getElementById('editPmId').value = '';
      document.getElementById('pmFormNumber').value = '';
      document.getElementById('pmForm').reset();
      var today = new Date().toISOString().split('T')[0];
      document.getElementById('pmFormDueDate').value = today;
      var nd = new Date(); nd.setDate(nd.getDate() + 30);
      document.getElementById('pmFormNextDueDate').value = nd.toISOString().split('T')[0];
      document.getElementById('pmFormTitle').textContent = 'Add PM Record';
      PM.showModal('pmFormModal');
    },
    edit: function(id) {
      var item = _data.find(function(r) { return r.PMNumber === id; });
      if (!item) return;
      document.getElementById('editPmId').value = id;
      document.getElementById('pmFormNumber').value = item.PMNumber || '';
      var form = document.getElementById('pmForm');
      ['Title','MachineID','MachineName','Department','Section','Frequency','FrequencyType','AssignedTechnician','AssignedTechnicianName','ChecklistTemplate','Priority','Status','StartDate','DueDate','NextDueDate','Remarks'].forEach(function(f) {
        var el = form.querySelector('[name="' + f + '"]');
        if (el && item[f] !== undefined) el.value = item[f] || '';
      });
      document.getElementById('pmFormTitle').textContent = 'Edit PM - ' + id;
      PM.showModal('pmFormModal');
    },
    save: function(e) {
      e.preventDefault();
      var form = document.getElementById('pmForm');
      var data = {};
      ['Title','MachineID','MachineName','Department','Section','Frequency','FrequencyType','AssignedTechnician','AssignedTechnicianName','ChecklistTemplate','Priority','Status','StartDate','DueDate','NextDueDate','Remarks','PMNumber'].forEach(function(f) {
        var el = form.querySelector('[name="' + f + '"]');
        if (el) data[f] = el.value;
      });
      if (!data.Title) { App.showToast('Title is required', 'error'); return false; }
      if (!data.MachineID) { App.showToast('Machine is required', 'error'); return false; }
      var id = document.getElementById('editPmId').value;
      var action = id ? 'updatePMRecord' : 'addPMRecord';
      if (id) data.id = id;
      App.showLoading(true);
      API.call(action, data).then(function(result) {
        _data = result || _data;
        App.showLoading(false); PM.hideModal('pmFormModal');
        App.showToast('PM record ' + (id ? 'updated' : 'created'), 'success');
        updateSummary(); renderTable();
      }).catch(function(err) { App.showLoading(false); App.showToast('Error: ' + err.message, 'error'); });
      return false;
    },
    delete: function(id) {
      showConfirm('Delete PM Record', 'Are you sure you want to delete this PM record?', function() {
        App.showLoading(true);
        API.call('deletePMRecord', { id: id }).then(function(result) {
          _data = result || _data.filter(function(r) { return r.PMNumber !== id; });
          App.showLoading(false); App.showToast('PM record deleted', 'success');
          updateSummary(); renderTable();
        }).catch(function(err) { App.showLoading(false); App.showToast('Error: ' + err.message, 'error'); });
      });
    },
    openComplete: function(id) {
      var item = _data.find(function(r) { return r.PMNumber === id; });
      if (!item) return;
      document.getElementById('completePmId').value = id;
      document.getElementById('completePmNumber').value = item.PMNumber || '';
      document.getElementById('completePmTitle').value = item.Title || '';
      document.getElementById('completePmMachine').value = item.MachineName || '';
      document.getElementById('completePmStatus').value = 'Completed';
      var today = new Date().toISOString().split('T')[0];
      document.getElementById('completePmDate').value = today;
      var freq = parseInt(item.Frequency) || 30;
      var nd = new Date(); nd.setDate(nd.getDate() + freq);
      document.getElementById('completePmNextDue').value = nd.toISOString().split('T')[0];
      document.getElementById('completePmRemarks').value = '';
      PM.showModal('pmCompleteModal');
    },
    saveComplete: function(e) {
      e.preventDefault();
      var id = document.getElementById('completePmId').value;
      var data = { CompletionDate: document.getElementById('completePmDate').value, NextDueDate: document.getElementById('completePmNextDue').value, Remarks: document.getElementById('completePmRemarks').value, Status: 'Completed' };
      App.showLoading(true);
      API.call('completePM', { id: id, completionDate: data.CompletionDate, nextDueDate: data.NextDueDate, remarks: data.Remarks }).then(function(result) {
        _data = result || _data;
        App.showLoading(false); PM.hideModal('pmCompleteModal');
        App.showToast('PM completed successfully', 'success');
        updateSummary(); renderTable();
      }).catch(function(err) { App.showLoading(false); App.showToast('Error: ' + err.message, 'error'); });
      return false;
    },
    onMachineChange: function() {
      var mid = document.getElementById('pmFormMachine').value;
      var m = _machinesCache.find(function(x) { return (x.MachineID || x.id) === mid; });
      document.getElementById('pmFormMachineName').value = m ? (m.MachineName || m.name || '') : '';
      document.getElementById('pmFormDepartment').value = m ? (m.Department || '') : '';
      document.getElementById('pmFormSection').value = m ? (m.Section || '') : '';
    },
    onTechChange: function() {
      var tid = document.getElementById('pmFormTechnician').value;
      var t = _techsCache.find(function(x) { return (x.EmployeeID || x.id) === tid; });
      document.getElementById('pmFormTechName').value = t ? (t.TechnicianName || t.name || '') : '';
    },
    bulkGenerate: function() {
      document.getElementById('pmBulkForm').reset();
      var today = new Date().toISOString().split('T')[0];
      var sd = document.getElementById('pmBulkForm').querySelector('[name="StartDate"]');
      if (sd) sd.value = today;
      PM.showModal('pmBulkModal');
    },
    saveBulk: function(e) {
      e.preventDefault();
      var data = {};
      ['MachineID','Frequency','FrequencyType','Cycles','StartDate','TitlePrefix','AssignedTechnician','Priority'].forEach(function(f) {
        var el = document.querySelector('#pmBulkForm [name="' + f + '"]');
        if (el) data[f] = el.value;
      });
      data.Cycles = parseInt(data.Cycles) || 12;
      App.showLoading(true);
      API.call('bulkGeneratePMs', data).then(function(result) {
        _data = result || _data;
        App.showLoading(false); PM.hideModal('pmBulkModal');
        App.showToast('PMs generated successfully', 'success');
        updateSummary(); renderTable();
      }).catch(function(err) { App.showLoading(false); App.showToast('Error: ' + err.message, 'error'); });
      return false;
    },
    exportCSV: function() {
      if (!_data || _data.length === 0) { App.showToast('No data to export', 'warning'); return; }
      var headers = ['PMNumber','Title','MachineName','Department','Section','Frequency','FrequencyType','AssignedTechnicianName','Priority','Status','StartDate','DueDate','NextDueDate','CompletionDate','ComplianceStatus','Remarks'];
      var csv = headers.join(',') + '\n';
      _data.forEach(function(r) {
        var row = headers.map(function(h) { var val = r[h] !== undefined && r[h] !== null ? String(r[h]) : ''; val = val.replace(/"/g, '""'); if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) val = '"' + val + '"'; return val; });
        csv += row.join(',') + '\n';
      });
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'PM_Schedule_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(url);
      App.showToast('Export completed', 'success');
    },
    renderCalendar: function(year, month) {
      _calYear = year; _calMonth = month;
      var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      setText('pmCalTitle', months[month] + ' ' + year);
      var firstDay = new Date(year, month, 1).getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var today = new Date(); var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var html = '<table style="width:100%;border-collapse:collapse"><thead><tr>';
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(d) { html += '<th style="padding:8px;text-align:center;font-weight:600;font-size:12px;color:var(--text-muted);border-bottom:2px solid var(--border)">' + d + '</th>'; });
      html += '</tr></thead><tbody>';
      var day = 1;
      for (var row = 0; row < 6; row++) {
        if (day > daysInMonth) break;
        html += '<tr>';
        for (var col = 0; col < 7; col++) {
          if (row === 0 && col < firstDay || day > daysInMonth) { html += '<td style="padding:4px;border:1px solid var(--border);background:var(--bg-secondary)"></td>'; }
          else {
            var ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            var isToday = ds === todayStr;
            var dayPMs = _data.filter(function(p) { var d = p.DueDate || p.NextDueDate || p.CompletionDate; return d && d.slice(0, 10) === ds; });
            var dots = '';
            if (dayPMs.length > 0) {
              var colors = []; dayPMs.forEach(function(p) { var c = p.Status === 'Completed' ? 'success' : p.Status === 'Overdue' ? 'danger' : 'warning'; if (colors.indexOf(c) === -1) colors.push(c); });
              dots = '<div style="display:flex;gap:3px;justify-content:center;margin-top:2px">'; colors.forEach(function(c) { dots += '<span style="width:6px;height:6px;border-radius:50%;background:var(--' + c + ')"></span>'; }); dots += '</div>';
            }
            var sty = 'padding:6px 4px;border:1px solid var(--border);text-align:center;vertical-align:top;cursor:pointer;font-size:13px;min-height:60px';
            if (isToday) sty += ';background:var(--primary);color:#fff;font-weight:700';
            html += '<td style="' + sty + '" onclick="PM.dayDetail(\'' + ds + '\')"><div style="font-weight:' + (isToday ? '700' : '500') + '">' + day + '</div>' + dots;
            if (dayPMs.length > 0) html += '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' + dayPMs.length + ' PMs</div>';
            html += '</td>'; day++;
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      setText2('pmCalendarGrid', html);
      setText2('pmCalendarDayDetail', '<div style="text-align:center;color:var(--text-muted);padding:8px">Click on a day to view PM details</div>');
    },
    dayDetail: function(dateStr) {
      var pmList = _data.filter(function(p) { var d = p.DueDate || p.NextDueDate; return d && d.slice(0, 10) === dateStr; });
      if (pmList.length === 0) { setText2('pmCalendarDayDetail', '<div style="padding:16px;text-align:center;color:var(--text-muted)">No PMs for ' + dateStr + '</div>'); return; }
      renderTableData(pmList, [{ key: 'PMNumber', label: 'PM No' }, { key: 'Title', label: 'Title' }, { key: 'MachineName', label: 'Machine' }, { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success', 'Scheduled': 'primary', 'Overdue': 'danger', 'In Progress': 'info' } }], null, 1, 5, 'pmCalendarDayDetail');
    },
    prevMonth: function() { _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } PM.renderCalendar(_calYear, _calMonth); },
    nextMonth: function() { _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } PM.renderCalendar(_calYear, _calMonth); },
    goToday: function() { var n = new Date(); _calYear = n.getFullYear(); _calMonth = n.getMonth(); PM.renderCalendar(_calYear, _calMonth); },
    loadHistory: function() {
      var completed = _data.filter(function(r) { return r.Status === 'Completed'; });
      renderTableData(completed, [
        { key: 'PMNumber', label: 'PM No' }, { key: 'Title', label: 'Title' }, { key: 'MachineName', label: 'Machine' },
        { key: 'CompletionDate', label: 'Completed', date: true }, { key: 'AssignedTechnicianName', label: 'Technician' },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success' } }
      ], null, _historyPage, 25, 'pmHistoryContainer');
    },
    searchHistory: function(q) {
      var list = _data.filter(function(r) { return r.Status === 'Completed'; });
      if (q) { var lq = q.toLowerCase(); list = list.filter(function(r) { return (r.PMNumber || '').toLowerCase().indexOf(lq) > -1 || (r.Title || '').toLowerCase().indexOf(lq) > -1 || (r.MachineName || '').toLowerCase().indexOf(lq) > -1; }); }
      renderTableData(list, [
        { key: 'PMNumber', label: 'PM No' }, { key: 'Title', label: 'Title' }, { key: 'MachineName', label: 'Machine' },
        { key: 'CompletionDate', label: 'Completed', date: true }, { key: 'AssignedTechnicianName', label: 'Technician' },
        { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Completed': 'success' } }
      ], null, 1, 25, 'pmHistoryContainer');
    },
    loadCompliance: function() {
      var total = _data.length;
      var completed = _data.filter(function(r) { return r.Status === 'Completed'; }).length;
      var overdue = _data.filter(function(r) { return r.Status === 'Overdue'; }).length;
      var missed = _data.filter(function(r) { return r.Status === 'Missed'; }).length;
      var rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      var scheduled = total - completed - overdue - missed; if (scheduled < 0) scheduled = 0;
      var pcl = document.getElementById('pmComplianceLarge'); if (pcl) { pcl.textContent = rate + '%'; pcl.style.color = rate > 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)'; }
      var items = [
        { label: 'Completed', count: completed, color: 'var(--success)', pct: total > 0 ? Math.round((completed / total) * 100) : 0 },
        { label: 'Overdue', count: overdue, color: 'var(--danger)', pct: total > 0 ? Math.round((overdue / total) * 100) : 0 },
        { label: 'Missed', count: missed, color: 'var(--danger)', pct: total > 0 ? Math.round((missed / total) * 100) : 0 },
        { label: 'Scheduled', count: scheduled, color: 'var(--info)', pct: total > 0 ? Math.round((scheduled / total) * 100) : 0 }
      ];
      var bh = '';
      items.forEach(function(it) {
        bh += '<div style="display:flex;align-items:center;gap:12px"><div style="width:12px;height:12px;border-radius:3px;background:' + it.color + ';flex-shrink:0"></div><div style="flex:1;font-size:13px">' + it.label + '</div><div style="font-weight:600;font-size:14px;min-width:40px;text-align:right">' + it.count + '</div><div style="font-size:12px;color:var(--text-muted);min-width:40px;text-align:right">' + it.pct + '%</div><div style="width:100px;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden"><div style="width:' + it.pct + '%;height:100%;background:' + it.color + ';border-radius:3px"></div></div></div>';
      });
      setText2('pmComplianceBreakdown', bh);
      var machines = {};
      _data.forEach(function(r) { var k = r.MachineName || 'Unknown'; if (!machines[k]) machines[k] = { total: 0, completed: 0 }; machines[k].total++; if (r.Status === 'Completed') machines[k].completed++; });
      var td = Object.keys(machines).map(function(k) { var m = machines[k]; return { Machine: k, Total: m.total, Completed: m.completed, Rate: (m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0) + '%' }; });
      renderTableData(td, [{ key: 'Machine', label: 'Machine' }, { key: 'Total', label: 'Total PMs' }, { key: 'Completed', label: 'Completed' }, { key: 'Rate', label: 'Compliance %' }], null, 1, 25, 'pmMachineComplianceContainer');
    },
    showModal: function(id) { var el = document.getElementById(id); if (el) el.style.display = 'flex'; },
    hideModal: function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
  };

  function setText2(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
})();
