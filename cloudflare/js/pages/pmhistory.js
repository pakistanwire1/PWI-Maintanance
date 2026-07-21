(function () {
  const $ = CMMS.utils.$;
  const qs = CMMS.utils.qs;
  const qsa = CMMS.utils.qsa;
  const escHtml = CMMS.utils.escHtml;
  const formatDate = CMMS.utils.formatDate;
  const formatDateTime = CMMS.utils.formatDateTime;
  const getFormData = CMMS.utils.getFormData;
  const setHtml = CMMS.utils.setHtml;
  const renderTable = CMMS.utils.renderTable;
  const statusBadge = CMMS.utils.statusBadge;
  const debounce = CMMS.utils.debounce;
  const showToast = CMMS.utils.showToast;
  const showModal = CMMS.utils.showModal;
  const hideModal = CMMS.utils.hideModal;
  const showLoading = CMMS.utils.showLoading;
  const api = CMMS.api;

  let state = {
    records: [],
    filtered: [],
    searchQuery: '',
    dateFrom: '',
    dateTo: ''
  };

  function getContainer() {
    return CMMS.loader.getContainer();
  }

  async function loadData() {
    showLoading(true);
    try {
      state.records = await api.call('getPMHistory') || [];
      state.filtered = [...state.records];
    } catch (e) {
      showToast('Error loading PM history: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function render() {
    const c = getContainer();
    c.innerHTML = `
      <div class="page-header">
        <h2>PM History</h2>
      </div>
      <div class="filter-bar">
        <input type="text" class="form-control" id="pmHistSearch" placeholder="Search PM history..." value="${escHtml(state.searchQuery)}">
        <input type="date" class="form-control" id="pmHistDateFrom" value="${state.dateFrom}" placeholder="From Date">
        <input type="date" class="form-control" id="pmHistDateTo" value="${state.dateTo}" placeholder="To Date">
        <button class="btn btn-secondary" id="pmHistClearFilters">Clear Filters</button>
      </div>
      <div class="table-container" id="pmHistTableContainer"></div>
      <div class="pagination" id="pmHistPagination"></div>
    `;
    renderTableData();

    qs('#pmHistSearch').addEventListener('input', debounce(() => {
      state.searchQuery = qs('#pmHistSearch').value;
      filterRecords();
    }, 300));
    qs('#pmHistDateFrom').addEventListener('change', () => {
      state.dateFrom = qs('#pmHistDateFrom').value;
      filterRecords();
    });
    qs('#pmHistDateTo').addEventListener('change', () => {
      state.dateTo = qs('#pmHistDateTo').value;
      filterRecords();
    });
    qs('#pmHistClearFilters').addEventListener('click', () => {
      state.searchQuery = '';
      state.dateFrom = '';
      state.dateTo = '';
      qs('#pmHistSearch').value = '';
      qs('#pmHistDateFrom').value = '';
      qs('#pmHistDateTo').value = '';
      state.filtered = [...state.records];
      renderTableData();
    });
  }

  function filterRecords() {
    const query = state.searchQuery.toLowerCase();
    const from = state.dateFrom ? new Date(state.dateFrom) : null;
    const to = state.dateTo ? new Date(state.dateTo) : null;

    state.filtered = state.records.filter(r => {
      const matchSearch = !query ||
        (r.PMNumber || '').toLowerCase().includes(query) ||
        (r.Title || '').toLowerCase().includes(query) ||
        (r.MachineName || '').toLowerCase().includes(query) ||
        (r.TechnicianName || '').toLowerCase().includes(query) ||
        (r.Remarks || '').toLowerCase().includes(query);
      const matchFrom = !from || new Date(r.CompletionDate || r.CreatedAt) >= from;
      const matchTo = !to || new Date(r.CompletionDate || r.CreatedAt) <= new Date(to.getTime() + 86400000);
      return matchSearch && matchFrom && matchTo;
    });
    renderTableData();
  }

  function renderTableData() {
    const rows = state.filtered.map(r => `
      <tr>
        <td>${escHtml(r.PMNumber || '')}</td>
        <td>${escHtml(r.Title || '')}</td>
        <td>${escHtml(r.MachineName || '')}</td>
        <td>${formatDate(r.CompletionDate)}</td>
        <td>${formatDate(r.NextDueDate)}</td>
        <td>${escHtml(r.TechnicianName || r.AssignedTechnicianName || '')}</td>
        <td>${statusBadge(r.Status)}</td>
        <td>${escHtml(r.Remarks || '')}</td>
        <td>${escHtml(r.CreatedBy || '')}</td>
        <td>${formatDateTime(r.CreatedAt)}</td>
        <td><button class="btn btn-sm btn-info btn-pmhist-detail" data-idx="${state.filtered.indexOf(r)}" title="View Detail"><span class="icon-eye"></span></button></td>
      </tr>
    `).join('');

    setHtml('#pmHistTableContainer', `
      <table class="data-table">
        <thead>
          <tr>
            <th>PM Number</th><th>Title</th><th>Machine</th><th>Completion Date</th>
            <th>Next Due Date</th><th>Technician</th><th>Status</th><th>Remarks</th>
            <th>Created By</th><th>Created At</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="11" class="text-center">No PM history records found</td></tr>'}</tbody>
      </table>
    `);

    qsa('.btn-pmhist-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        showDetailModal(state.filtered[idx]);
      });
    });
  }

  function showDetailModal(record) {
    if (!record) return;
    showModal('PM History Detail', `
      <div class="detail-grid">
        <div class="detail-row"><label>PM Number:</label><span>${escHtml(record.PMNumber || '')}</span></div>
        <div class="detail-row"><label>Title:</label><span>${escHtml(record.Title || '')}</span></div>
        <div class="detail-row"><label>Machine:</label><span>${escHtml(record.MachineName || '')}</span></div>
        <div class="detail-row"><label>Completion Date:</label><span>${formatDate(record.CompletionDate)}</span></div>
        <div class="detail-row"><label>Next Due Date:</label><span>${formatDate(record.NextDueDate)}</span></div>
        <div class="detail-row"><label>Technician:</label><span>${escHtml(record.TechnicianName || record.AssignedTechnicianName || '')}</span></div>
        <div class="detail-row"><label>Status:</label><span>${statusBadge(record.Status)}</span></div>
        <div class="detail-row"><label>Remarks:</label><span>${escHtml(record.Remarks || 'N/A')}</span></div>
        <div class="detail-row"><label>Created By:</label><span>${escHtml(record.CreatedBy || '')}</span></div>
        <div class="detail-row"><label>Created At:</label><span>${formatDateTime(record.CreatedAt)}</span></div>
      </div>
    `, [{ text: 'Close', class: 'btn-secondary', action: () => hideModal() }]);
  }

  CMMS.router.registerPage('pmhistory', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { records: [], filtered: [], searchQuery: '', dateFrom: '', dateTo: '' };
    }
  });
})();
