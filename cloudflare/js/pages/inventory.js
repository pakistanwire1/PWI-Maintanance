(function () {
  const $ = CMMS.utils.$;
  const qs = CMMS.utils.qs;
  const qsa = CMMS.utils.qsa;
  const escHtml = CMMS.utils.escHtml;
  const setText = CMMS.utils.setText;
  const setHtml = CMMS.utils.setHtml;
  const setVal = CMMS.utils.setVal;
  const getVal = CMMS.utils.getVal;
  const formatDate = CMMS.utils.formatDate;
  const nowISO = CMMS.utils.nowISO;
  const getFormData = CMMS.utils.getFormData;
  const populateSelect = CMMS.utils.populateSelect;
  const badge = CMMS.utils.badge;
  const statusBadge = CMMS.utils.statusBadge;
  const debounce = CMMS.utils.debounce;
  const showToast = CMMS.utils.showToast;
  const showConfirm = CMMS.utils.showConfirm;
  const showModal = CMMS.utils.showModal;
  const hideModal = CMMS.utils.hideModal;
  const showLoading = CMMS.utils.showLoading;
  const api = CMMS.api;

  let state = {
    activeTab: 'grn',
    parts: [],
    transactions: [],
    filtered: [],
    dashboardData: {},
    dateFrom: '',
    dateTo: '',
    filterType: '',
    filterPart: '',
    searchQuery: '',
    currentPage: 1,
    perPage: 20
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
      const [dashboard, parts, transactions] = await Promise.all([
        api.call('getInventoryDashboardData'),
        api.call('getSpareParts'),
        api.call('getAllTransactions')
      ]);
      state.dashboardData = dashboard || {};
      state.parts = parts || [];
      state.transactions = transactions || [];
      state.filtered = [...state.transactions];
    } catch (e) {
      showToast('Error loading inventory: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function render() {
    const c = getContainer();
    const d = state.dashboardData;
    c.innerHTML = `
      <div class="page-header">
        <h2>Inventory Management</h2>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btnExportTxnCSV"><span class="icon-download"></span> Export CSV</button>
        </div>
      </div>
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-body">
            <span class="card-value">${formatCurrency(d.totalStockValue || 0)}</span>
            <span class="card-label">Total Stock Value</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-body">
            <span class="card-value text-warning">${d.lowStockCount || 0}</span>
            <span class="card-label">Low Stock Items</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-body">
            <span class="card-value text-danger">${d.outOfStockCount || 0}</span>
            <span class="card-label">Out of Stock</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-body">
            <span class="card-value">${d.totalTransactions || state.transactions.length}</span>
            <span class="card-label">Total Transactions</span>
          </div>
        </div>
      </div>
      <div class="tabs" id="invTabs">
        <button class="tab" data-tab="all">All</button>
        <button class="tab active" data-tab="grn">GRN</button>
        <button class="tab" data-tab="issue">Issue</button>
        <button class="tab" data-tab="return">Return</button>
        <button class="tab" data-tab="transfer">Transfer</button>
        <button class="tab" data-tab="adjustment">Adjustment</button>
      </div>
      <div class="tab-content" id="invTabContent"></div>
    `;
    bindTabs();
    qs('#btnExportTxnCSV').addEventListener('click', exportCSV);
    renderTab(state.activeTab);
  }

  function bindTabs() {
    qsa('#invTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        qsa('#invTabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;
        renderTab(state.activeTab);
      });
    });
  }

  function renderTab(tab) {
    if (tab === 'all') {
      renderAllTransactions();
    } else {
      renderTransactionForm(tab);
    }
  }

  function renderAllTransactions() {
    const content = qs('#invTabContent');
    content.innerHTML = `
      <div class="filter-bar">
        <input type="date" class="form-control" id="invDateFrom" value="${state.dateFrom}">
        <input type="date" class="form-control" id="invDateTo" value="${state.dateTo}">
        <select class="form-control" id="invFilterType">
          <option value="">All Types</option>
          <option value="GRN" ${state.filterType === 'GRN' ? 'selected' : ''}>GRN</option>
          <option value="Issue" ${state.filterType === 'Issue' ? 'selected' : ''}>Issue</option>
          <option value="Return" ${state.filterType === 'Return' ? 'selected' : ''}>Return</option>
          <option value="Transfer" ${state.filterType === 'Transfer' ? 'selected' : ''}>Transfer</option>
          <option value="Adjustment" ${state.filterType === 'Adjustment' ? 'selected' : ''}>Adjustment</option>
        </select>
        <input type="text" class="form-control" id="invSearch" placeholder="Search transactions..." value="${escHtml(state.searchQuery)}">
        <button class="btn btn-secondary" id="invClearFilters">Clear</button>
      </div>
      <div class="table-container" id="invTableContainer"></div>
      <div class="pagination" id="invPagination"></div>
    `;
    filterTransactions();
    qs('#invDateFrom').addEventListener('change', () => { state.dateFrom = qs('#invDateFrom').value; filterTransactions(); });
    qs('#invDateTo').addEventListener('change', () => { state.dateTo = qs('#invDateTo').value; filterTransactions(); });
    qs('#invFilterType').addEventListener('change', () => { state.filterType = qs('#invFilterType').value; filterTransactions(); });
    qs('#invSearch').addEventListener('input', debounce(() => { state.searchQuery = qs('#invSearch').value; filterTransactions(); }, 300));
    qs('#invClearFilters').addEventListener('click', () => {
      state.dateFrom = ''; state.dateTo = ''; state.filterType = ''; state.searchQuery = '';
      state.filtered = [...state.transactions];
      renderTab('all');
    });
  }

  function filterTransactions() {
    const q = (state.searchQuery || '').toLowerCase();
    const from = state.dateFrom ? new Date(state.dateFrom) : null;
    const to = state.dateTo ? new Date(state.dateTo) : null;

    state.filtered = state.transactions.filter(t => {
      const matchQ = !q ||
        (t.PartCode || '').toLowerCase().includes(q) ||
        (t.PartName || '').toLowerCase().includes(q) ||
        (t.ReferenceNo || '').toLowerCase().includes(q) ||
        (t.TransactionID || '').toString().includes(q);
      const matchType = !state.filterType || (t.TransactionType || '').toLowerCase() === state.filterType.toLowerCase();
      const matchFrom = !from || new Date(t.CreatedAt) >= from;
      const matchTo = !to || new Date(t.CreatedAt) <= new Date(to.getTime() + 86400000);
      return matchQ && matchType && matchFrom && matchTo;
    });
    state.currentPage = 1;
    renderAllTable();
  }

  function renderAllTable() {
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

    setHtml('#invTableContainer', `
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>Type</th><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Reference</th><th>Processed By</th><th>Date</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="10" class="text-center">No transactions found</td></tr>'}</tbody>
      </table>
    `);
    renderPagination(totalPages, '#invPagination', () => renderAllTable());
  }

  function renderPagination(totalPages, containerSelector, renderFn) {
    const pag = qs(containerSelector);
    if (!pag || totalPages <= 1) { if (pag) pag.innerHTML = ''; return; }
    let html = `<span class="page-info">Page ${state.currentPage} of ${totalPages}</span><div class="page-buttons">`;
    if (state.currentPage > 1) html += `<button class="btn btn-sm btn-page" data-page="${state.currentPage - 1}">&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - state.currentPage) <= 2) {
        html += `<button class="btn btn-sm btn-page ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - state.currentPage) === 3) {
        html += '<span>...</span>';
      }
    }
    if (state.currentPage < totalPages) html += `<button class="btn btn-sm btn-page" data-page="${state.currentPage + 1}">&raquo;</button>`;
    html += '</div>';
    pag.innerHTML = html;
    qsa('.btn-page', pag).forEach(btn => btn.addEventListener('click', () => {
      state.currentPage = parseInt(btn.dataset.page);
      renderFn();
    }));
  }

  function getPartOptions() {
    return state.parts.filter(p => p.Status !== 'Inactive').map(p =>
      `<option value="${p.PartID || p.ID}" data-name="${escHtml(p.PartName || '')}" data-stock="${p.CurrentStock || 0}">${escHtml(p.PartCode || '')} - ${escHtml(p.PartName || '')}</option>`
    ).join('');
  }

  function renderTransactionForm(type) {
    const content = qs('#invTabContent');
    const partOpts = getPartOptions();
    const titles = { grn: 'Goods Receipt Note', issue: 'Issue Parts', return: 'Return Parts', transfer: 'Transfer Parts', adjustment: 'Stock Adjustment' };

    let formFields = `
      <div class="form-grid">
        <div class="form-group">
          <label>Part Code *</label>
          <select class="form-control invPartSelect" name="PartCode" id="invPartSelect" required>
            <option value="">Select Part</option>
            ${partOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Part Name</label>
          <input type="text" class="form-control" id="invPartName" readonly>
        </div>
        <div class="form-group">
          <label>Current Stock</label>
          <input type="text" class="form-control" id="invCurrentStock" readonly>
        </div>
        <div class="form-group">
          <label>Quantity *</label>
          <input type="number" class="form-control" name="Quantity" id="invQuantity" min="1" required>
        </div>
    `;

    if (type === 'grn') {
      formFields += `
        <div class="form-group">
          <label>Unit Cost *</label>
          <input type="number" class="form-control" name="UnitCost" id="invUnitCost" min="0" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Total Cost</label>
          <input type="text" class="form-control" id="invTotalCost" readonly>
        </div>
        <div class="form-group">
          <label>Supplier</label>
          <input type="text" class="form-control" name="Supplier">
        </div>
        <div class="form-group">
          <label>Invoice No</label>
          <input type="text" class="form-control" name="InvoiceNo">
        </div>
        <div class="form-group">
          <label>PO No</label>
          <input type="text" class="form-control" name="PONo">
        </div>
        <div class="form-group">
          <label>Received Date</label>
          <input type="date" class="form-control" name="ReceivedDate" value="${nowISO().substring(0, 10)}">
        </div>
      `;
    } else if (type === 'transfer') {
      formFields += `
        <div class="form-group">
          <label>From Location</label>
          <input type="text" class="form-control" id="invFromLocation" name="FromLocation" readonly>
        </div>
        <div class="form-group">
          <label>To Location *</label>
          <input type="text" class="form-control" name="ToLocation" required>
        </div>
      `;
    } else if (type === 'adjustment') {
      formFields += `
        <div class="form-group full-width">
          <label>Reason *</label>
          <input type="text" class="form-control" name="Reason" required>
        </div>
      `;
    }

    formFields += `
        <div class="form-group">
          <label>Reference No</label>
          <input type="text" class="form-control" name="ReferenceNo">
        </div>
        <div class="form-group full-width">
          <label>Remarks</label>
          <textarea class="form-control" name="Remarks" rows="2"></textarea>
        </div>
      </div>
    `;

    content.innerHTML = `
      <h3>${titles[type] || type}</h3>
      <form id="invForm" class="transaction-form">${formFields}</form>
      <div class="table-container" id="invRecentTable"></div>
    `;

    const partSelect = qs('#invPartSelect');
    partSelect.addEventListener('change', function () {
      const opt = this.options[this.selectedIndex];
      if (opt && opt.value) {
        setVal('#invPartName', opt.dataset.name || '');
        setVal('#invCurrentStock', opt.dataset.stock || '0');
        const part = state.parts.find(p => (p.PartID || p.ID) == opt.value);
        if (part && type === 'transfer') {
          setVal('#invFromLocation', part.StoreLocation || '');
        }
      } else {
        setVal('#invPartName', '');
        setVal('#invCurrentStock', '');
      }
    });

    if (type === 'grn') {
      const qtyInput = qs('#invQuantity');
      const costInput = qs('#invUnitCost');
      function calcTotal() {
        const qty = parseFloat(qtyInput.value) || 0;
        const cost = parseFloat(costInput.value) || 0;
        setVal('#invTotalCost', formatCurrency(qty * cost));
      }
      if (qtyInput) qtyInput.addEventListener('input', calcTotal);
      if (costInput) costInput.addEventListener('input', calcTotal);
    }

    const formEl = qs('#invForm');
    const submitBtn = document.createElement('div');
    submitBtn.className = 'form-actions';
    submitBtn.innerHTML = `<button type="submit" class="btn btn-primary">Process ${titles[type]}</button>`;
    formEl.appendChild(submitBtn);

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = getFormData('#invForm');
      if (!data.PartCode || !data.Quantity) {
        showToast('Please fill all required fields', 'error');
        return;
      }
      showLoading(true);
      try {
        let action;
        switch (type) {
          case 'grn': action = 'processGoodsReceipt'; break;
          case 'issue': action = 'processIssue'; break;
          case 'return': action = 'processReturn'; break;
          case 'transfer': action = 'processTransfer'; break;
          case 'adjustment': action = 'processAdjustment'; break;
        }
        await api.mutate(action, data);
        showToast(`${titles[type]} processed successfully`, 'success');
        formEl.reset();
        await loadData();
        renderTab(state.activeTab);
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
      showLoading(false);
    });

    renderRecentTransactions(type);
  }

  function renderRecentTransactions(type) {
    const recent = state.transactions.filter(t =>
      (t.TransactionType || '').toLowerCase() === type
    ).slice(0, 10);

    if (recent.length === 0) return;

    const rows = recent.map(t => `
      <tr>
        <td>${t.TransactionID || ''}</td>
        <td>${escHtml(t.PartCode || '')}</td>
        <td>${escHtml(t.PartName || '')}</td>
        <td>${t.Quantity || 0}</td>
        <td>${formatCurrency(t.UnitCost)}</td>
        <td>${escHtml(t.ReferenceNo || '')}</td>
        <td>${formatDate(t.CreatedAt)}</td>
      </tr>
    `).join('');

    setHtml('#invRecentTable', `
      <h4 style="margin-top:1.5rem">Recent ${type.toUpperCase()} Transactions</h4>
      <table class="data-table">
        <thead><tr><th>ID</th><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Cost</th><th>Reference</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  async function exportCSV() {
    try {
      await api.call('exportTransactionsCSV');
      showToast('CSV export initiated', 'success');
    } catch (e) {
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
  }

  CMMS.router.registerPage('inventory', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { activeTab: 'grn', parts: [], transactions: [], filtered: [], dashboardData: {}, dateFrom: '', dateTo: '', filterType: '', filterPart: '', searchQuery: '', currentPage: 1, perPage: 20 };
    }
  });
})();
