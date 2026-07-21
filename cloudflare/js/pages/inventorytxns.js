(function () {
  const $ = CMMS.utils.$;
  const qs = CMMS.utils.qs;
  const qsa = CMMS.utils.qsa;
  const escHtml = CMMS.utils.escHtml;
  const setHtml = CMMS.utils.setHtml;
  const formatDate = CMMS.utils.formatDate;
  const badge = CMMS.utils.badge;
  const debounce = CMMS.utils.debounce;
  const showToast = CMMS.utils.showToast;
  const showLoading = CMMS.utils.showLoading;
  const api = CMMS.api;

  let state = {
    transactions: [],
    filtered: [],
    dateFrom: '',
    dateTo: '',
    filterType: '',
    searchQuery: '',
    currentPage: 1,
    perPage: 25
  };

  function getContainer() {
    return CMMS.loader.getContainer();
  }

  function formatCurrency(val) {
    return '$' + (parseFloat(val) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  async function loadData() {
    showLoading(true);
    try {
      state.transactions = await api.call('getAllTransactions') || [];
      state.filtered = [...state.transactions];
    } catch (e) {
      showToast('Error loading transactions: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function render() {
    const c = getContainer();
    c.innerHTML = `
      <div class="page-header">
        <h2>Inventory Transactions</h2>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btnExportTxn"><span class="icon-download"></span> Export CSV</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="text" class="form-control" id="txnSearch" placeholder="Search transactions..." value="${escHtml(state.searchQuery)}">
        <select class="form-control" id="txnTypeFilter">
          <option value="">All Types</option>
          <option value="GRN" ${state.filterType === 'GRN' ? 'selected' : ''}>GRN</option>
          <option value="Issue" ${state.filterType === 'Issue' ? 'selected' : ''}>Issue</option>
          <option value="Return" ${state.filterType === 'Return' ? 'selected' : ''}>Return</option>
          <option value="Transfer" ${state.filterType === 'Transfer' ? 'selected' : ''}>Transfer</option>
          <option value="Adjustment" ${state.filterType === 'Adjustment' ? 'selected' : ''}>Adjustment</option>
        </select>
        <input type="date" class="form-control" id="txnDateFrom" value="${state.dateFrom}">
        <input type="date" class="form-control" id="txnDateTo" value="${state.dateTo}">
        <button class="btn btn-secondary" id="txnClearFilters">Clear</button>
      </div>
      <div class="table-container" id="txnTableContainer"></div>
      <div class="pagination" id="txnPagination"></div>
    `;
    renderTableData();
    bindEvents();
  }

  function bindEvents() {
    qs('#txnSearch').addEventListener('input', debounce(() => {
      state.searchQuery = qs('#txnSearch').value;
      filterRecords();
    }, 300));
    qs('#txnTypeFilter').addEventListener('change', () => {
      state.filterType = qs('#txnTypeFilter').value;
      filterRecords();
    });
    qs('#txnDateFrom').addEventListener('change', () => {
      state.dateFrom = qs('#txnDateFrom').value;
      filterRecords();
    });
    qs('#txnDateTo').addEventListener('change', () => {
      state.dateTo = qs('#txnDateTo').value;
      filterRecords();
    });
    qs('#txnClearFilters').addEventListener('click', () => {
      state.searchQuery = '';
      state.filterType = '';
      state.dateFrom = '';
      state.dateTo = '';
      state.filtered = [...state.transactions];
      render();
    });
    qs('#btnExportTxn').addEventListener('click', exportCSV);
  }

  function filterRecords() {
    const q = (state.searchQuery || '').toLowerCase();
    const from = state.dateFrom ? new Date(state.dateFrom) : null;
    const to = state.dateTo ? new Date(state.dateTo) : null;

    state.filtered = state.transactions.filter(t => {
      const matchQ = !q ||
        (t.TransactionID || '').toString().includes(q) ||
        (t.PartCode || '').toLowerCase().includes(q) ||
        (t.PartName || '').toLowerCase().includes(q) ||
        (t.ReferenceNo || '').toLowerCase().includes(q) ||
        (t.ProcessedBy || '').toLowerCase().includes(q);
      const matchType = !state.filterType || (t.TransactionType || '').toLowerCase() === state.filterType.toLowerCase();
      const matchFrom = !from || new Date(t.CreatedAt) >= from;
      const matchTo = !to || new Date(t.CreatedAt) <= new Date(to.getTime() + 86400000);
      return matchQ && matchType && matchFrom && matchTo;
    });
    state.currentPage = 1;
    renderTableData();
  }

  function renderTableData() {
    const start = (state.currentPage - 1) * state.perPage;
    const paged = state.filtered.slice(start, start + state.perPage);
    const totalPages = Math.ceil(state.filtered.length / state.perPage);

    const rows = paged.map(t => `
      <tr>
        <td>${t.TransactionID || ''}</td>
        <td>${badge(t.TransactionType)}</td>
        <td>${escHtml(t.PartCode || '')}</td>
        <td>${escHtml(t.PartName || '')}</td>
        <td>${t.Quantity || 0}</td>
        <td>${formatCurrency(t.UnitCost)}</td>
        <td>${formatCurrency(t.TotalCost)}</td>
        <td>${escHtml(t.ReferenceNo || '')}</td>
        <td>${escHtml(t.ProcessedBy || '')}</td>
        <td>${formatDate(t.CreatedAt)}</td>
      </tr>
    `).join('');

    setHtml('#txnTableContainer', `
      <table class="data-table">
        <thead>
          <tr>
            <th>Transaction ID</th><th>Type</th><th>Part Code</th><th>Part Name</th>
            <th>Quantity</th><th>Unit Cost</th><th>Total Cost</th>
            <th>Reference No</th><th>Processed By</th><th>Date</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="10" class="text-center">No transactions found</td></tr>'}</tbody>
      </table>
    `);

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const pag = qs('#txnPagination');
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

  function exportCSV() {
    const headers = ['TransactionID', 'TransactionType', 'PartCode', 'PartName', 'Quantity', 'UnitCost', 'TotalCost', 'ReferenceNo', 'ProcessedBy', 'CreatedAt'];
    const csvRows = [headers.join(',')];
    state.filtered.forEach(t => {
      csvRows.push(headers.map(h => `"${(t[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
  }

  CMMS.router.registerPage('inventorytxns', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { transactions: [], filtered: [], dateFrom: '', dateTo: '', filterType: '', searchQuery: '', currentPage: 1, perPage: 25 };
    }
  });
})();
