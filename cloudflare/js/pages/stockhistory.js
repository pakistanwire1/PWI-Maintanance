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
    parts: [],
    history: [],
    filtered: [],
    selectedPartCode: '',
    searchQuery: '',
    filterType: '',
    currentPage: 1,
    perPage: 25
  };

  function getContainer() {
    return CMMS.loader.getContainer();
  }

  async function loadData() {
    showLoading(true);
    try {
      state.parts = await api.call('getSpareParts') || [];
      if (state.selectedPartCode) {
        state.history = await api.call('getStockHistory', { PartCode: state.selectedPartCode }) || [];
      } else {
        const allHist = [];
        for (const p of state.parts.slice(0, 50)) {
          try {
            const h = await api.call('getStockHistory', { PartCode: p.PartCode || p.Code });
            if (h) allHist.push(...(Array.isArray(h) ? h : []));
          } catch (e) { /* skip failed parts */ }
        }
        state.history = allHist;
      }
      state.filtered = [...state.history];
    } catch (e) {
      showToast('Error loading stock history: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function render() {
    const c = getContainer();
    const partOptions = state.parts.map(p =>
      `<option value="${escHtml(p.PartCode || p.Code || '')}" ${state.selectedPartCode === (p.PartCode || p.Code) ? 'selected' : ''}>${escHtml(p.PartCode || '')} - ${escHtml(p.PartName || '')}</option>`
    ).join('');

    c.innerHTML = `
      <div class="page-header">
        <h2>Stock History</h2>
      </div>
      <div class="filter-bar">
        <select class="form-control" id="shPartFilter">
          <option value="">All Parts</option>
          ${partOptions}
        </select>
        <input type="text" class="form-control" id="shSearch" placeholder="Search..." value="${escHtml(state.searchQuery)}">
        <select class="form-control" id="shTypeFilter">
          <option value="">All Types</option>
          <option value="GRN" ${state.filterType === 'GRN' ? 'selected' : ''}>GRN</option>
          <option value="Issue" ${state.filterType === 'Issue' ? 'selected' : ''}>Issue</option>
          <option value="Return" ${state.filterType === 'Return' ? 'selected' : ''}>Return</option>
          <option value="Transfer" ${state.filterType === 'Transfer' ? 'selected' : ''}>Transfer</option>
          <option value="Adjustment" ${state.filterType === 'Adjustment' ? 'selected' : ''}>Adjustment</option>
        </select>
        <button class="btn btn-secondary" id="shClearFilters">Clear</button>
      </div>
      <div class="table-container" id="shTableContainer"></div>
      <div class="pagination" id="shPagination"></div>
    `;
    renderTableData();
    bindEvents();
  }

  function bindEvents() {
    qs('#shPartFilter').addEventListener('change', async () => {
      state.selectedPartCode = qs('#shPartFilter').value;
      showLoading(true);
      try {
        if (state.selectedPartCode) {
          state.history = await api.call('getStockHistory', { PartCode: state.selectedPartCode }) || [];
        } else {
          const allHist = [];
          for (const p of state.parts.slice(0, 50)) {
            try {
              const h = await api.call('getStockHistory', { PartCode: p.PartCode || p.Code });
              if (h) allHist.push(...(Array.isArray(h) ? h : []));
            } catch (e) { /* skip */ }
          }
          state.history = allHist;
        }
        state.filtered = [...state.history];
        filterRecords();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
      showLoading(false);
    });

    qs('#shSearch').addEventListener('input', debounce(() => {
      state.searchQuery = qs('#shSearch').value;
      filterRecords();
    }, 300));

    qs('#shTypeFilter').addEventListener('change', () => {
      state.filterType = qs('#shTypeFilter').value;
      filterRecords();
    });

    qs('#shClearFilters').addEventListener('click', () => {
      state.selectedPartCode = '';
      state.searchQuery = '';
      state.filterType = '';
      render();
    });
  }

  function filterRecords() {
    const q = (state.searchQuery || '').toLowerCase();
    state.filtered = state.history.filter(h => {
      const matchQ = !q ||
        (h.PartCode || '').toLowerCase().includes(q) ||
        (h.PartName || '').toLowerCase().includes(q) ||
        (h.ReferenceNo || '').toLowerCase().includes(q) ||
        (h.Remarks || '').toLowerCase().includes(q);
      const matchType = !state.filterType || (h.TransactionType || '').toLowerCase() === state.filterType.toLowerCase();
      return matchQ && matchType;
    });
    state.currentPage = 1;
    renderTableData();
  }

  function renderTableData() {
    const start = (state.currentPage - 1) * state.perPage;
    const paged = state.filtered.slice(start, start + state.perPage);
    const totalPages = Math.ceil(state.filtered.length / state.perPage);

    const rows = paged.map(h => `
      <tr>
        <td>${escHtml(h.PartCode || '')}</td>
        <td>${escHtml(h.PartName || '')}</td>
        <td>${badge(h.TransactionType)}</td>
        <td>${h.Quantity || 0}</td>
        <td>${h.BalanceBefore || 0}</td>
        <td>${h.BalanceAfter || 0}</td>
        <td>${escHtml(h.ReferenceNo || '')}</td>
        <td>${escHtml(h.Remarks || '')}</td>
        <td>${formatDate(h.CreatedAt)}</td>
      </tr>
    `).join('');

    setHtml('#shTableContainer', `
      <table class="data-table">
        <thead>
          <tr>
            <th>Part Code</th><th>Part Name</th><th>Transaction Type</th>
            <th>Quantity</th><th>Balance Before</th><th>Balance After</th>
            <th>Reference No</th><th>Remarks</th><th>Date</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="9" class="text-center">No stock history records found</td></tr>'}</tbody>
      </table>
    `);

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const pag = qs('#shPagination');
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

  CMMS.router.registerPage('stockhistory', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { parts: [], history: [], filtered: [], selectedPartCode: '', searchQuery: '', filterType: '', currentPage: 1, perPage: 25 };
    }
  });
})();
