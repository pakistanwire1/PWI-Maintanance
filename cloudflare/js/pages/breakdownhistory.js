(function () {
  const $ = CMMS.utils.$;
  const qs = CMMS.utils.qs;
  const qsa = CMMS.utils.qsa;
  const escHtml = CMMS.utils.escHtml;
  const setHtml = CMMS.utils.setHtml;
  const setText = CMMS.utils.setText;
  const formatDate = CMMS.utils.formatDate;
  const formatDateTime = CMMS.utils.formatDateTime;
  const durationDisplay = CMMS.utils.durationDisplay;
  const badge = CMMS.utils.badge;
  const priorityBadge = CMMS.utils.priorityBadge;
  const debounce = CMMS.utils.debounce;
  const showToast = CMMS.utils.showToast;
  const showModal = CMMS.utils.showModal;
  const hideModal = CMMS.utils.hideModal;
  const showLoading = CMMS.utils.showLoading;
  const api = CMMS.api;
  const icons = CMMS.icons;

  let state = {
    records: [],
    filtered: [],
    machines: [],
    departments: [],
    technicians: [],
    searchQuery: '',
    filterMachine: '',
    filterDepartment: '',
    filterPriority: '',
    filterTechnician: '',
    dateFrom: '',
    dateTo: '',
    currentPage: 1,
    perPage: 20,
    stats: {}
  };

  function getContainer() {
    return CMMS.loader.getContainer();
  }

  async function loadData() {
    showLoading(true);
    try {
      const [records, machines, technicians] = await Promise.all([
        api.call('getBreakdownHistory'),
        api.call('getMachines'),
        api.call('getTechnicians')
      ]);
      state.records = records || [];
      state.filtered = [...state.records];
      state.machines = machines || [];
      state.technicians = technicians || [];
      state.departments = [...new Set(state.records.map(r => r.Department).filter(Boolean))];
      calcStats();
    } catch (e) {
      showToast('Error loading breakdown history: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function calcStats() {
    const records = state.filtered;
    const total = records.length;
    let totalDowntime = 0;
    records.forEach(r => {
      totalDowntime += parseInt(r.DowntimeMinutes || r.Downtime || 0) || 0;
    });

    const machineCounts = {};
    records.forEach(r => {
      const name = r.MachineName || r.Machine || 'Unknown';
      machineCounts[name] = (machineCounts[name] || 0) + 1;
    });
    const topMachines = Object.entries(machineCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    state.stats = {
      total,
      totalDowntime,
      topMachines
    };
  }

  function render() {
    const c = getContainer();
    const s = state.stats;

    const machineOpts = state.machines.map(m =>
      `<option value="${escHtml(m.MachineName || m.Name || '')}" ${state.filterMachine === (m.MachineName || m.Name) ? 'selected' : ''}>${escHtml(m.MachineName || m.Name || '')}</option>`
    ).join('');

    const deptOpts = state.departments.map(d =>
      `<option value="${escHtml(d)}" ${state.filterDepartment === d ? 'selected' : ''}>${escHtml(d)}</option>`
    ).join('');

    const techOpts = state.technicians.map(t =>
      `<option value="${escHtml(t.TechnicianName || t.Name || t.FullName || '')}" ${state.filterTechnician === (t.TechnicianName || t.Name || t.FullName) ? 'selected' : ''}>${escHtml(t.TechnicianName || t.Name || t.FullName || '')}</option>`
    ).join('');

    c.innerHTML = `
      <div class="page-header">
        <h2>Breakdown History</h2>
      </div>
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon text-danger">${icons.alert || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.total || 0}</span>
            <span class="card-label">Total Breakdowns</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon text-warning">${icons.clock || ''}</div>
          <div class="card-body">
            <span class="card-value">${formatDowntime(s.totalDowntime || 0)}</span>
            <span class="card-label">Total Downtime</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">${icons.machine || ''}</div>
          <div class="card-body">
            <span class="card-value">${s.topMachines && s.topMachines[0] ? s.topMachines[0][0] : 'N/A'}</span>
            <span class="card-label">Top Breakdown Machine</span>
          </div>
        </div>
      </div>
      ${s.topMachines && s.topMachines.length > 0 ? `
        <div class="top-machines-bar">
          <h4>Top Machines by Breakdown Count</h4>
          <div class="bar-chart">
            ${s.topMachines.map(([name, count]) => `
              <div class="bar-item">
                <span class="bar-label">${escHtml(name)}</span>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.round((count / (s.topMachines[0][1] || 1)) * 100)}%"></div>
                </div>
                <span class="bar-value">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="filter-bar">
        <input type="text" class="form-control" id="bhSearch" placeholder="Search..." value="${escHtml(state.searchQuery)}">
        <select class="form-control" id="bhMachineFilter">
          <option value="">All Machines</option>
          ${machineOpts}
        </select>
        <select class="form-control" id="bhDeptFilter">
          <option value="">All Departments</option>
          ${deptOpts}
        </select>
        <select class="form-control" id="bhPriorityFilter">
          <option value="">All Priority</option>
          <option value="Low" ${state.filterPriority === 'Low' ? 'selected' : ''}>Low</option>
          <option value="Medium" ${state.filterPriority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="High" ${state.filterPriority === 'High' ? 'selected' : ''}>High</option>
          <option value="Critical" ${state.filterPriority === 'Critical' ? 'selected' : ''}>Critical</option>
        </select>
        <select class="form-control" id="bhTechFilter">
          <option value="">All Technicians</option>
          ${techOpts}
        </select>
        <input type="date" class="form-control" id="bhDateFrom" value="${state.dateFrom}">
        <input type="date" class="form-control" id="bhDateTo" value="${state.dateTo}">
        <button class="btn btn-secondary" id="bhClearFilters">Clear</button>
      </div>
      <div class="table-container" id="bhTableContainer"></div>
      <div class="pagination" id="bhPagination"></div>
    `;
    renderTableData();
    bindEvents();
  }

  function formatDowntime(minutes) {
    if (typeof durationDisplay === 'function') {
      return durationDisplay(minutes);
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function bindEvents() {
    qs('#bhSearch').addEventListener('input', debounce(() => {
      state.searchQuery = qs('#bhSearch').value;
      filterRecords();
    }, 300));
    qs('#bhMachineFilter').addEventListener('change', () => {
      state.filterMachine = qs('#bhMachineFilter').value;
      filterRecords();
    });
    qs('#bhDeptFilter').addEventListener('change', () => {
      state.filterDepartment = qs('#bhDeptFilter').value;
      filterRecords();
    });
    qs('#bhPriorityFilter').addEventListener('change', () => {
      state.filterPriority = qs('#bhPriorityFilter').value;
      filterRecords();
    });
    qs('#bhTechFilter').addEventListener('change', () => {
      state.filterTechnician = qs('#bhTechFilter').value;
      filterRecords();
    });
    qs('#bhDateFrom').addEventListener('change', () => {
      state.dateFrom = qs('#bhDateFrom').value;
      filterRecords();
    });
    qs('#bhDateTo').addEventListener('change', () => {
      state.dateTo = qs('#bhDateTo').value;
      filterRecords();
    });
    qs('#bhClearFilters').addEventListener('click', () => {
      state.searchQuery = '';
      state.filterMachine = '';
      state.filterDepartment = '';
      state.filterPriority = '';
      state.filterTechnician = '';
      state.dateFrom = '';
      state.dateTo = '';
      state.filtered = [...state.records];
      calcStats();
      render();
    });
  }

  function filterRecords() {
    const q = (state.searchQuery || '').toLowerCase();
    const from = state.dateFrom ? new Date(state.dateFrom) : null;
    const to = state.dateTo ? new Date(state.dateTo) : null;

    state.filtered = state.records.filter(r => {
      const matchQ = !q ||
        (r.JobCardNo || '').toLowerCase().includes(q) ||
        (r.MachineName || r.Machine || '').toLowerCase().includes(q) ||
        (r.Department || '').toLowerCase().includes(q) ||
        (r.AssignedTechnicianName || r.TechnicianName || '').toLowerCase().includes(q) ||
        (r.RootCause || '').toLowerCase().includes(q) ||
        (r.CorrectiveAction || '').toLowerCase().includes(q);
      const matchMachine = !state.filterMachine || (r.MachineName || r.Machine) === state.filterMachine;
      const matchDept = !state.filterDepartment || r.Department === state.filterDepartment;
      const matchPriority = !state.filterPriority || r.Priority === state.filterPriority;
      const matchTech = !state.filterTechnician || (r.AssignedTechnicianName || r.TechnicianName) === state.filterTechnician;
      const matchFrom = !from || new Date(r.DateTime || r.CreatedAt) >= from;
      const matchTo = !to || new Date(r.DateTime || r.CreatedAt) <= new Date(to.getTime() + 86400000);
      return matchQ && matchMachine && matchDept && matchPriority && matchTech && matchFrom && matchTo;
    });
    state.currentPage = 1;
    calcStats();
    renderTableData();
  }

  function renderTableData() {
    const start = (state.currentPage - 1) * state.perPage;
    const paged = state.filtered.slice(start, start + state.perPage);
    const totalPages = Math.ceil(state.filtered.length / state.perPage);

    const rows = paged.map(r => `
      <tr>
        <td>${escHtml(r.JobCardNo || '')}</td>
        <td>${formatDateTime(r.DateTime || r.CreatedAt)}</td>
        <td>${escHtml(r.MachineName || r.Machine || '')}</td>
        <td>${escHtml(r.Department || '')}</td>
        <td>${escHtml(r.AssignedTechnicianName || r.TechnicianName || '')}</td>
        <td>${escHtml(r.RootCause || '')}</td>
        <td>${escHtml(r.CorrectiveAction || '')}</td>
        <td>${r.WorkingTime ? formatDowntime(r.WorkingTime) : '-'}</td>
        <td>${r.DowntimeMinutes || r.Downtime ? formatDowntime(r.DowntimeMinutes || r.Downtime) : '-'}</td>
        <td>${priorityBadge(r.Priority)}</td>
        <td>${badge(r.BreakdownType || '')}</td>
      </tr>
    `).join('');

    setHtml('#bhTableContainer', `
      <table class="data-table">
        <thead>
          <tr>
            <th>Job Card No</th><th>Date/Time</th><th>Machine</th><th>Department</th>
            <th>Technician</th><th>Root Cause</th><th>Corrective Action</th>
            <th>Working Time</th><th>Downtime</th><th>Priority</th><th>Breakdown Type</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="11" class="text-center">No breakdown records found</td></tr>'}</tbody>
      </table>
    `);
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const pag = qs('#bhPagination');
    if (!pag || totalPages <= 1) { if (pag) pag.innerHTML = ''; return; }
    let html = `<span class="page-info">Page ${state.currentPage} of ${totalPages} (${state.filtered.length} records)</span><div class="page-buttons">`;
    if (state.currentPage > 1) html += `<button class="btn btn-sm btn-page" data-page="${state.currentPage - 1}">&laquo; Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - state.currentPage) <= 2) {
        html += `<button class="btn btn-sm btn-page ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - state.currentPage) === 3) {
        html += '<span class="page-ellipsis">...</span>';
      }
    }
    if (state.currentPage < totalPages) html += `<button class="btn btn-sm btn-page" data-page="${state.currentPage + 1}">Next &raquo;</button>`;
    html += '</div>';
    pag.innerHTML = html;
    qsa('.btn-page', pag).forEach(btn => btn.addEventListener('click', () => {
      state.currentPage = parseInt(btn.dataset.page);
      renderTableData();
    }));
  }

  CMMS.router.registerPage('breakdown', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { records: [], filtered: [], machines: [], departments: [], technicians: [], searchQuery: '', filterMachine: '', filterDepartment: '', filterPriority: '', filterTechnician: '', dateFrom: '', dateTo: '', currentPage: 1, perPage: 20, stats: {} };
    }
  });
})();
