(function () {
  const $ = CMMS.utils.$;
  const qs = CMMS.utils.qs;
  const qsa = CMMS.utils.qsa;
  const escHtml = CMMS.utils.escHtml;
  const setText = CMMS.utils.setText;
  const setHtml = CMMS.utils.setHtml;
  const getVal = CMMS.utils.getVal;
  const setVal = CMMS.utils.setVal;
  const showEl = CMMS.utils.showEl;
  const hideEl = CMMS.utils.hideEl;
  const formatDate = CMMS.utils.formatDate;
  const formatDateTime = CMMS.utils.formatDateTime;
  const nowISO = CMMS.utils.nowISO;
  const getFormData = CMMS.utils.getFormData;
  const setFormData = CMMS.utils.setFormData;
  const resetForm = CMMS.utils.resetForm;
  const populateSelect = CMMS.utils.populateSelect;
  const renderTable = CMMS.utils.renderTable;
  const badge = CMMS.utils.badge;
  const statusBadge = CMMS.utils.statusBadge;
  const priorityBadge = CMMS.utils.priorityBadge;
  const debounce = CMMS.utils.debounce;
  const showToast = CMMS.utils.showToast;
  const showConfirm = CMMS.utils.showConfirm;
  const showModal = CMMS.utils.showModal;
  const hideModal = CMMS.utils.hideModal;
  const showLoading = CMMS.utils.showLoading;
  const capitalize = CMMS.utils.capitalize;
  const api = CMMS.api;
  const icons = CMMS.icons;

  let state = {
    activeTab: 'schedule',
    records: [],
    filtered: [],
    machines: [],
    technicians: [],
    calendarDate: new Date(),
    calendarData: [],
    compliance: [],
    summary: {},
    searchQuery: '',
    formMode: 'add',
    editingId: null
  };

  function getContainer() {
    return CMMS.loader.getContainer();
  }

  async function loadData() {
    showLoading(true);
    try {
      const [records, machines, technicians, summary] = await Promise.all([
        api.call('getPMRecords'),
        api.call('getMachines'),
        api.call('getTechnicians'),
        api.call('getPMSummary')
      ]);
      state.records = records || [];
      state.filtered = [...state.records];
      state.machines = machines || [];
      state.technicians = technicians || [];
      state.summary = summary || {};
    } catch (e) {
      showToast('Error loading PM data: ' + e.message, 'error');
    }
    showLoading(false);
  }

  async function loadCalendarData() {
    try {
      const year = state.calendarDate.getFullYear();
      const month = state.calendarDate.getMonth() + 1;
      state.calendarData = await api.call('getPMCalendarData', { year, month }) || [];
    } catch (e) {
      showToast('Error loading calendar: ' + e.message, 'error');
    }
  }

  async function loadCompliance() {
    try {
      state.compliance = await api.call('getPMCompliance') || [];
    } catch (e) {
      showToast('Error loading compliance: ' + e.message, 'error');
    }
  }

  function render() {
    const c = getContainer();
    c.innerHTML = `
      <div class="page-header">
        <h2>${icons.pm || ''} Preventive Maintenance</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnAddPM"><span class="icon-plus"></span> Add PM Record</button>
          <button class="btn btn-secondary" id="btnBulkGenerate"><span class="icon-bulk"></span> Bulk Generate</button>
        </div>
      </div>
      <div class="tabs" id="pmTabs">
        <button class="tab active" data-tab="schedule">Schedule</button>
        <button class="tab" data-tab="calendar">Calendar</button>
        <button class="tab" data-tab="compliance">Compliance</button>
      </div>
      <div class="tab-content" id="pmTabContent"></div>
    `;
    bindTabs();
    qs('#btnAddPM').addEventListener('click', () => openAddForm());
    qs('#btnBulkGenerate').addEventListener('click', () => openBulkGenerateForm());
    renderTab(state.activeTab);
  }

  function bindTabs() {
    qsa('#pmTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        qsa('#pmTabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;
        renderTab(state.activeTab);
      });
    });
  }

  function renderTab(tab) {
    switch (tab) {
      case 'schedule': renderScheduleTab(); break;
      case 'calendar': renderCalendarTab(); break;
      case 'compliance': renderComplianceTab(); break;
    }
  }

  function renderSummaryCards() {
    const s = state.summary;
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">${icons.list || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.totalPMs || state.records.length}</span>
            <span class="card-label">Total PMs</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon text-success">${icons.check || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.completed || 0}</span>
            <span class="card-label">Completed</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon text-warning">${icons.clock || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.scheduled || 0}</span>
            <span class="card-label">Scheduled</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon text-danger">${icons.alert || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.overdue || 0}</span>
            <span class="card-label">Overdue</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon text-info">${icons.calendar || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.dueThisMonth || 0}</span>
            <span class="card-label">Due This Month</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">${icons.chart || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.complianceRate || 0}%</span>
            <span class="card-label">Compliance Rate</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderScheduleTab() {
    const content = qs('#pmTabContent');
    let html = renderSummaryCards();
    html += `
      <div class="filter-bar">
        <input type="text" class="form-control" id="pmSearch" placeholder="Search PM records..." value="${escHtml(state.searchQuery)}">
        <select class="form-control" id="pmStatusFilter">
          <option value="">All Status</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Overdue">Overdue</option>
          <option value="Skipped">Skipped</option>
        </select>
        <select class="form-control" id="pmPriorityFilter">
          <option value="">All Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <div class="table-container" id="pmTableContainer"></div>
    `;
    content.innerHTML = html;
    renderPMTable();
    qs('#pmSearch').addEventListener('input', debounce(filterRecords, 300));
    qs('#pmStatusFilter').addEventListener('change', filterRecords);
    qs('#pmPriorityFilter').addEventListener('change', filterRecords);
  }

  function filterRecords() {
    const query = (qs('#pmSearch').value || '').toLowerCase();
    const statusFilter = qs('#pmStatusFilter').value;
    const priorityFilter = qs('#pmPriorityFilter').value;
    state.searchQuery = query;

    state.filtered = state.records.filter(r => {
      const matchSearch = !query ||
        (r.PMNumber || '').toLowerCase().includes(query) ||
        (r.Title || '').toLowerCase().includes(query) ||
        (r.MachineName || '').toLowerCase().includes(query) ||
        (r.AssignedTechnicianName || '').toLowerCase().includes(query);
      const matchStatus = !statusFilter || r.Status === statusFilter;
      const matchPriority = !priorityFilter || r.Priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
    renderPMTable();
  }

  function renderPMTable() {
    const rows = state.filtered.map(r => `
      <tr>
        <td>${escHtml(r.PMNumber || '')}</td>
        <td>${escHtml(r.Title || '')}</td>
        <td>${escHtml(r.MachineName || '')}</td>
        <td>${escHtml(r.Frequency || '')} ${escHtml(r.FrequencyType || '')}</td>
        <td>${formatDate(r.DueDate)}</td>
        <td>${escHtml(r.AssignedTechnicianName || '')}</td>
        <td>${statusBadge(r.Status)}</td>
        <td>${priorityBadge(r.Priority)}</td>
        <td class="actions-cell">
          ${r.Status !== 'Completed' ? `<button class="btn btn-sm btn-success btn-complete-pm" data-id="${r.PMID || r.ID}" title="Complete"><span class="icon-check"></span></button>` : ''}
          <button class="btn btn-sm btn-primary btn-edit-pm" data-id="${r.PMID || r.ID}" title="Edit"><span class="icon-edit"></span></button>
          <button class="btn btn-sm btn-danger btn-delete-pm" data-id="${r.PMID || r.ID}" title="Delete"><span class="icon-trash"></span></button>
        </td>
      </tr>
    `).join('');

    const tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>PM Number</th><th>Title</th><th>Machine</th><th>Frequency</th>
            <th>Due Date</th><th>Technician</th><th>Status</th><th>Priority</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="9" class="text-center">No PM records found</td></tr>'}</tbody>
      </table>
    `;
    setHtml('#pmTableContainer', tableHtml);

    qsa('.btn-complete-pm').forEach(btn => btn.addEventListener('click', () => openCompleteForm(btn.dataset.id)));
    qsa('.btn-edit-pm').forEach(btn => btn.addEventListener('click', () => openEditForm(btn.dataset.id)));
    qsa('.btn-delete-pm').forEach(btn => btn.addEventListener('click', () => deletePM(btn.dataset.id)));
  }

  function openAddForm() {
    state.formMode = 'add';
    state.editingId = null;
    showPMForm();
  }

  function openEditForm(id) {
    const record = state.records.find(r => (r.PMID || r.ID) == id);
    if (!record) return;
    state.formMode = 'edit';
    state.editingId = id;
    showPMForm(record);
  }

  function showPMForm(record) {
    const r = record || {};
    const isEdit = state.formMode === 'edit';

    const machineOptions = state.machines.map(m =>
      `<option value="${m.MachineID || m.ID}" ${r.MachineID == (m.MachineID || m.ID) ? 'selected' : ''}>${escHtml(m.MachineName || m.Name || '')}</option>`
    ).join('');

    const techOptions = state.technicians.map(t =>
      `<option value="${t.TechnicianID || t.UserID || t.ID}" ${r.AssignedTechnician == (t.TechnicianID || t.UserID || t.ID) ? 'selected' : ''}>${escHtml(t.TechnicianName || t.Name || t.FullName || '')}</option>`
    ).join('');

    showModal(isEdit ? 'Edit PM Record' : 'Add PM Record', `
      <form id="pmForm" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Title *</label>
            <input type="text" class="form-control" name="Title" value="${escHtml(r.Title || '')}" required>
          </div>
          <div class="form-group">
            <label>Machine *</label>
            <select class="form-control" name="MachineID" id="pmMachineSelect" required>
              <option value="">Select Machine</option>
              ${machineOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Machine Name</label>
            <input type="text" class="form-control" name="MachineName" id="pmMachineName" value="${escHtml(r.MachineName || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Department</label>
            <input type="text" class="form-control" name="Department" id="pmDepartment" value="${escHtml(r.Department || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Section</label>
            <input type="text" class="form-control" name="Section" id="pmSection" value="${escHtml(r.Section || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Frequency *</label>
            <input type="number" class="form-control" name="Frequency" value="${r.Frequency || ''}" min="1" required>
          </div>
          <div class="form-group">
            <label>Frequency Type *</label>
            <select class="form-control" name="FrequencyType" required>
              <option value="">Select</option>
              <option value="Daily" ${r.FrequencyType === 'Daily' ? 'selected' : ''}>Daily</option>
              <option value="Weekly" ${r.FrequencyType === 'Weekly' ? 'selected' : ''}>Weekly</option>
              <option value="Monthly" ${r.FrequencyType === 'Monthly' ? 'selected' : ''}>Monthly</option>
              <option value="Quarterly" ${r.FrequencyType === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
              <option value="Half Yearly" ${r.FrequencyType === 'Half Yearly' ? 'selected' : ''}>Half Yearly</option>
              <option value="Yearly" ${r.FrequencyType === 'Yearly' ? 'selected' : ''}>Yearly</option>
            </select>
          </div>
          <div class="form-group">
            <label>Assigned Technician</label>
            <select class="form-control" name="AssignedTechnician" id="pmTechSelect">
              <option value="">Select Technician</option>
              ${techOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Technician Name</label>
            <input type="text" class="form-control" name="AssignedTechnicianName" id="pmTechName" value="${escHtml(r.AssignedTechnicianName || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select class="form-control" name="Priority">
              <option value="Low" ${r.Priority === 'Low' ? 'selected' : ''}>Low</option>
              <option value="Medium" ${(!r.Priority || r.Priority === 'Medium') ? 'selected' : ''}>Medium</option>
              <option value="High" ${r.Priority === 'High' ? 'selected' : ''}>High</option>
              <option value="Critical" ${r.Priority === 'Critical' ? 'selected' : ''}>Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="Status">
              <option value="Scheduled" ${(!r.Status || r.Status === 'Scheduled') ? 'selected' : ''}>Scheduled</option>
              <option value="In Progress" ${r.Status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Completed" ${r.Status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Skipped" ${r.Status === 'Skipped' ? 'selected' : ''}>Skipped</option>
            </select>
          </div>
          <div class="form-group">
            <label>Start Date *</label>
            <input type="date" class="form-control" name="StartDate" value="${(r.StartDate || '').substring(0, 10)}" required>
          </div>
          <div class="form-group">
            <label>Due Date *</label>
            <input type="date" class="form-control" name="DueDate" value="${(r.DueDate || '').substring(0, 10)}" required>
          </div>
          <div class="form-group">
            <label>Next Due Date</label>
            <input type="date" class="form-control" name="NextDueDate" id="pmNextDueDate" value="${(r.NextDueDate || '').substring(0, 10)}" readonly>
          </div>
          <div class="form-group full-width">
            <label>Remarks</label>
            <textarea class="form-control" name="Remarks" rows="2">${escHtml(r.Remarks || '')}</textarea>
          </div>
        </div>
      </form>
    `, [
      { text: isEdit ? 'Update' : 'Save', class: 'btn-primary', action: () => savePM() },
      { text: 'Cancel', class: 'btn-secondary', action: () => hideModal() }
    ]);

    qs('#pmMachineSelect').addEventListener('change', function () {
      const m = state.machines.find(x => (x.MachineID || x.ID) == this.value);
      if (m) {
        setVal('#pmMachineName', m.MachineName || m.Name || '');
        setVal('#pmDepartment', m.Department || '');
        setVal('#pmSection', m.Section || '');
      } else {
        setVal('#pmMachineName', '');
        setVal('#pmDepartment', '');
        setVal('#pmSection', '');
      }
    });

    qs('#pmTechSelect').addEventListener('change', function () {
      const t = state.technicians.find(x => (x.TechnicianID || x.UserID || x.ID) == this.value);
      setVal('#pmTechName', t ? (t.TechnicianName || t.Name || t.FullName || '') : '');
    });

    const dueDateInput = qs('input[name="DueDate"]');
    const startDateInput = qs('input[name="StartDate"]');
    const freqInput = qs('input[name="Frequency"]');
    const freqTypeSelect = qs('select[name="FrequencyType"]');

    function calcNextDue() {
      const start = startDateInput.value;
      const freq = parseInt(freqInput.value);
      const fType = freqTypeSelect.value;
      if (!start || !freq || !fType) return;
      const d = new Date(start);
      switch (fType) {
        case 'Daily': d.setDate(d.getDate() + freq); break;
        case 'Weekly': d.setDate(d.getDate() + freq * 7); break;
        case 'Monthly': d.setMonth(d.getMonth() + freq); break;
        case 'Quarterly': d.setMonth(d.getMonth() + freq * 3); break;
        case 'Half Yearly': d.setMonth(d.getMonth() + freq * 6); break;
        case 'Yearly': d.setFullYear(d.getFullYear() + freq); break;
      }
      setVal('#pmNextDueDate', d.toISOString().substring(0, 10));
    }

    if (startDateInput) startDateInput.addEventListener('change', calcNextDue);
    if (freqInput) freqInput.addEventListener('change', calcNextDue);
    if (freqTypeSelect) freqTypeSelect.addEventListener('change', calcNextDue);
  }

  async function savePM() {
    const data = getFormData('#pmForm');
    if (!data.Title || !data.MachineID || !data.Frequency || !data.FrequencyType || !data.StartDate || !data.DueDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    showLoading(true);
    try {
      if (state.formMode === 'edit') {
        await api.mutate('updatePMRecord', { PMID: state.editingId, ...data });
        showToast('PM record updated successfully', 'success');
      } else {
        await api.mutate('addPMRecord', data);
        showToast('PM record added successfully', 'success');
      }
      hideModal();
      await refreshAll();
    } catch (e) {
      showToast('Error saving PM record: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function openCompleteForm(id) {
    const record = state.records.find(r => (r.PMID || r.ID) == id);
    if (!record) return;

    showModal('Complete PM Record', `
      <form id="pmCompleteForm" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>PM Number</label>
            <input type="text" class="form-control" value="${escHtml(record.PMNumber || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Title</label>
            <input type="text" class="form-control" value="${escHtml(record.Title || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Machine</label>
            <input type="text" class="form-control" value="${escHtml(record.MachineName || '')}" readonly>
          </div>
          <div class="form-group">
            <label>Completion Date *</label>
            <input type="date" class="form-control" name="CompletionDate" value="${nowISO().substring(0, 10)}" required>
          </div>
          <div class="form-group">
            <label>Next Due Date</label>
            <input type="date" class="form-control" name="NextDueDate" id="pmCompleteNextDue" value="">
          </div>
          <div class="form-group full-width">
            <label>Remarks</label>
            <textarea class="form-control" name="Remarks" rows="3"></textarea>
          </div>
        </div>
      </form>
    `, [
      { text: 'Complete', class: 'btn-success', action: () => submitComplete(id) },
      { text: 'Cancel', class: 'btn-secondary', action: () => hideModal() }
    ]);

    qs('input[name="CompletionDate"]').addEventListener('change', function () {
      const compDate = new Date(this.value);
      const freq = parseInt(record.Frequency) || 1;
      const fType = record.FrequencyType || 'Monthly';
      switch (fType) {
        case 'Daily': compDate.setDate(compDate.getDate() + freq); break;
        case 'Weekly': compDate.setDate(compDate.getDate() + freq * 7); break;
        case 'Monthly': compDate.setMonth(compDate.getMonth() + freq); break;
        case 'Quarterly': compDate.setMonth(compDate.getMonth() + freq * 3); break;
        case 'Half Yearly': compDate.setMonth(compDate.getMonth() + freq * 6); break;
        case 'Yearly': compDate.setFullYear(compDate.getFullYear() + freq); break;
      }
      setVal('#pmCompleteNextDue', compDate.toISOString().substring(0, 10));
    });

    qs('input[name="CompletionDate"]').dispatchEvent(new Event('change'));
  }

  async function submitComplete(id) {
    const data = getFormData('#pmCompleteForm');
    if (!data.CompletionDate) {
      showToast('Completion date is required', 'error');
      return;
    }
    showLoading(true);
    try {
      await api.mutate('completePM', { PMID: id, ...data });
      showToast('PM completed successfully', 'success');
      hideModal();
      await refreshAll();
    } catch (e) {
      showToast('Error completing PM: ' + e.message, 'error');
    }
    showLoading(false);
  }

  async function deletePM(id) {
    const confirmed = await showConfirm('Are you sure you want to delete this PM record?');
    if (!confirmed) return;
    showLoading(true);
    try {
      await api.mutate('deletePMRecord', { PMID: id });
      showToast('PM record deleted', 'success');
      await refreshAll();
    } catch (e) {
      showToast('Error deleting PM: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function openBulkGenerateForm() {
    const machineOptions = state.machines.map(m =>
      `<option value="${m.MachineID || m.ID}">${escHtml(m.MachineName || m.Name || '')}</option>`
    ).join('');

    const techOptions = state.technicians.map(t =>
      `<option value="${t.TechnicianID || t.UserID || t.ID}">${escHtml(t.TechnicianName || t.Name || t.FullName || '')}</option>`
    ).join('');

    showModal('Bulk Generate PMs', `
      <form id="bulkPMForm" class="modal-form">
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Machines *</label>
            <select class="form-control" name="MachineIDs" id="bulkMachineSelect" multiple size="6" required>
              ${machineOptions}
            </select>
            <small>Hold Ctrl/Cmd to select multiple machines</small>
          </div>
          <div class="form-group">
            <label>Title Prefix *</label>
            <input type="text" class="form-control" name="TitlePrefix" placeholder="e.g. Scheduled PM for" required>
          </div>
          <div class="form-group">
            <label>Frequency *</label>
            <input type="number" class="form-control" name="Frequency" min="1" required>
          </div>
          <div class="form-group">
            <label>Frequency Type *</label>
            <select class="form-control" name="FrequencyType" required>
              <option value="">Select</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          <div class="form-group">
            <label>Cycles *</label>
            <input type="number" class="form-control" name="Cycles" min="1" value="12" required>
          </div>
          <div class="form-group">
            <label>Start Date *</label>
            <input type="date" class="form-control" name="StartDate" value="${nowISO().substring(0, 10)}" required>
          </div>
          <div class="form-group">
            <label>Assigned Technician</label>
            <select class="form-control" name="AssignedTechnician">
              <option value="">Select Technician</option>
              ${techOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select class="form-control" name="Priority">
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </form>
    `, [
      { text: 'Generate', class: 'btn-primary', action: () => submitBulkGenerate() },
      { text: 'Cancel', class: 'btn-secondary', action: () => hideModal() }
    ]);
  }

  async function submitBulkGenerate() {
    const form = qs('#bulkMachineSelect');
    const machineIDs = Array.from(form.selectedOptions).map(o => o.value);
    if (machineIDs.length === 0) {
      showToast('Please select at least one machine', 'error');
      return;
    }
    const data = getFormData('#bulkPMForm');
    data.MachineIDs = machineIDs;
    if (!data.Frequency || !data.FrequencyType || !data.Cycles || !data.StartDate || !data.TitlePrefix) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    showLoading(true);
    try {
      await api.mutate('bulkGeneratePMs', data);
      showToast(`Generated PMs for ${machineIDs.length} machine(s)`, 'success');
      hideModal();
      await refreshAll();
    } catch (e) {
      showToast('Error generating PMs: ' + e.message, 'error');
    }
    showLoading(false);
  }

  async function renderCalendarTab() {
    const content = qs('#pmTabContent');
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    const monthName = state.calendarDate.toLocaleString('default', { month: 'long' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    await loadCalendarData();

    const dayMap = {};
    (state.calendarData || []).forEach(pm => {
      const day = new Date(pm.DueDate).getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(pm);
    });

    let calHtml = `
      <div class="calendar-header">
        <button class="btn btn-sm btn-secondary" id="calPrev">&laquo; Prev</button>
        <h3>${monthName} ${year}</h3>
        <button class="btn btn-sm btn-secondary" id="calNext">Next &raquo;</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-day-header">Sun</div>
        <div class="calendar-day-header">Mon</div>
        <div class="calendar-day-header">Tue</div>
        <div class="calendar-day-header">Wed</div>
        <div class="calendar-day-header">Thu</div>
        <div class="calendar-day-header">Fri</div>
        <div class="calendar-day-header">Sat</div>
    `;

    for (let i = 0; i < firstDay; i++) {
      calHtml += '<div class="calendar-cell empty"></div>';
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const pms = dayMap[d] || [];
      calHtml += `<div class="calendar-cell${isToday ? ' today' : ''}">
        <div class="calendar-date">${d}</div>
        <div class="calendar-events">
          ${pms.map(pm => `<div class="calendar-event ${statusBadge(pm.Status)}" title="${escHtml(pm.Title)} - ${escHtml(pm.MachineName || '')}">${escHtml(pm.MachineName || '').substring(0, 10)}</div>`).join('')}
        </div>
      </div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      calHtml += '<div class="calendar-cell empty"></div>';
    }

    calHtml += '</div>';
    content.innerHTML = calHtml;

    qs('#calPrev').addEventListener('click', async () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      await renderCalendarTab();
    });
    qs('#calNext').addEventListener('click', async () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      await renderCalendarTab();
    });
  }

  async function renderComplianceTab() {
    const content = qs('#pmTabContent');
    showLoading(true);
    await loadCompliance();
    showLoading(false);

    const compliance = state.compliance || [];
    const total = compliance.reduce((s, c) => s + (c.Total || 0), 0);
    const completed = compliance.reduce((s, c) => s + (c.Completed || 0), 0);
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let html = `
      <div class="compliance-overview">
        <h3>Overall Compliance</h3>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width:${rate}%">
            <span class="progress-text">${rate}%</span>
          </div>
        </div>
        <p>${completed} of ${total} PM tasks completed</p>
      </div>
      <h3>Machine-wise Breakdown</h3>
      <table class="data-table">
        <thead>
          <tr><th>Machine</th><th>Total PMs</th><th>Completed</th><th>Scheduled</th><th>Overdue</th><th>Compliance %</th></tr>
        </thead>
        <tbody>
          ${compliance.map(c => {
            const machineRate = (c.Total || 0) > 0 ? Math.round(((c.Completed || 0) / c.Total) * 100) : 0;
            return `<tr>
              <td>${escHtml(c.MachineName || '')}</td>
              <td>${c.Total || 0}</td>
              <td>${c.Completed || 0}</td>
              <td>${c.Scheduled || 0}</td>
              <td>${c.Overdue || 0}</td>
              <td>
                <div class="progress-bar-inline">
                  <div class="progress-bar" style="width:${machineRate}%"></div>
                  <span>${machineRate}%</span>
                </div>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" class="text-center">No compliance data</td></tr>'}
        </tbody>
      </table>
    `;
    content.innerHTML = html;
  }

  async function refreshAll() {
    await loadData();
    renderTab(state.activeTab);
  }

  CMMS.router.registerPage('pm', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { activeTab: 'schedule', records: [], filtered: [], machines: [], technicians: [], calendarDate: new Date(), calendarData: [], compliance: [], summary: {}, searchQuery: '', formMode: 'add', editingId: null };
    }
  });
})();
