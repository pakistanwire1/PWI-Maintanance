(function () {
  const $ = CMMS.utils.$;
  const qs = CMMS.utils.qs;
  const qsa = CMMS.utils.qsa;
  const escHtml = CMMS.utils.escHtml;
  const setHtml = CMMS.utils.setHtml;
  const setVal = CMMS.utils.setVal;
  const getVal = CMMS.utils.getVal;
  const formatDate = CMMS.utils.formatDate;
  const nowISO = CMMS.utils.nowISO;
  const getFormData = CMMS.utils.getFormData;
  const badge = CMMS.utils.badge;
  const debounce = CMMS.utils.debounce;
  const showToast = CMMS.utils.showToast;
  const showModal = CMMS.utils.showModal;
  const hideModal = CMMS.utils.hideModal;
  const showLoading = CMMS.utils.showLoading;
  const api = CMMS.api;

  let state = {
    parts: [],
    receipts: [],
    filtered: [],
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
      const [parts, transactions] = await Promise.all([
        api.call('getSpareParts'),
        api.call('getAllTransactions')
      ]);
      state.parts = parts || [];
      state.receipts = (transactions || []).filter(t => (t.TransactionType || '').toLowerCase() === 'grn');
      state.filtered = [...state.receipts];
    } catch (e) {
      showToast('Error loading goods receipt data: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function getPartOptions() {
    return state.parts.map(p =>
      `<option value="${p.PartID || p.ID}" data-name="${escHtml(p.PartName || '')}" data-stock="${p.CurrentStock || 0}">${escHtml(p.PartCode || '')} - ${escHtml(p.PartName || '')}</option>`
    ).join('');
  }

  function render() {
    const c = getContainer();
    const partOpts = getPartOptions();

    c.innerHTML = `
      <div class="page-header">
        <h2>Goods Receipt</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnShowGRNForm"><span class="icon-plus"></span> New GRN</button>
          <button class="btn btn-secondary" id="btnExportGRN"><span class="icon-download"></span> Export CSV</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="text" class="form-control" id="grnSearch" placeholder="Search receipts..." value="${escHtml(state.searchQuery)}">
        <button class="btn btn-secondary" id="grnClearFilters">Clear</button>
      </div>
      <div class="table-container" id="grnTableContainer"></div>
      <div class="pagination" id="grnPagination"></div>
    `;
    renderTableData();
    bindEvents();
  }

  function bindEvents() {
    qs('#btnShowGRNForm').addEventListener('click', () => showGRNModal());
    qs('#btnExportGRN').addEventListener('click', exportCSV);
    qs('#grnSearch').addEventListener('input', debounce(() => {
      state.searchQuery = qs('#grnSearch').value;
      filterRecords();
    }, 300));
    qs('#grnClearFilters').addEventListener('click', () => {
      state.searchQuery = '';
      state.filtered = [...state.receipts];
      renderTableData();
    });
  }

  function filterRecords() {
    const q = (state.searchQuery || '').toLowerCase();
    state.filtered = state.receipts.filter(r => {
      return !q ||
        (r.PartCode || '').toLowerCase().includes(q) ||
        (r.PartName || '').toLowerCase().includes(q) ||
        (r.Supplier || '').toLowerCase().includes(q) ||
        (r.InvoiceNo || '').toLowerCase().includes(q) ||
        (r.ReferenceNo || '').toLowerCase().includes(q) ||
        (r.TransactionID || '').toString().includes(q);
    });
    state.currentPage = 1;
    renderTableData();
  }

  function renderTableData() {
    const start = (state.currentPage - 1) * state.perPage;
    const paged = state.filtered.slice(start, start + state.perPage);
    const totalPages = Math.ceil(state.filtered.length / state.perPage);

    const rows = paged.map(r => `
      <tr>
        <td>${r.TransactionID || ''}</td>
        <td>${escHtml(r.PartCode || '')}</td>
        <td>${escHtml(r.PartName || '')}</td>
        <td>${r.Quantity || 0}</td>
        <td>${formatCurrency(r.UnitCost)}</td>
        <td>${formatCurrency(r.TotalCost)}</td>
        <td>${escHtml(r.Supplier || '')}</td>
        <td>${escHtml(r.InvoiceNo || '')}</td>
        <td>${formatDate(r.ReceivedDate || r.CreatedAt)}</td>
        <td>${badge(r.Status || 'Completed')}</td>
        <td>${formatDate(r.CreatedAt)}</td>
      </tr>
    `).join('');

    setHtml('#grnTableContainer', `
      <table class="data-table">
        <thead>
          <tr>
            <th>GRN No</th><th>Part Code</th><th>Part Name</th><th>Qty</th>
            <th>Unit Cost</th><th>Total Cost</th><th>Supplier</th>
            <th>Invoice No</th><th>Received Date</th><th>Status</th><th>Created At</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="11" class="text-center">No goods receipts found</td></tr>'}</tbody>
      </table>
    `);
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const pag = qs('#grnPagination');
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
      renderTableData();
    }));
  }

  function showGRNModal() {
    const partOpts = getPartOptions();
    showModal('New Goods Receipt Note', `
      <form id="grnForm" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Part Code *</label>
            <select class="form-control" name="PartCode" id="grnPartSelect" required>
              <option value="">Select Part</option>
              ${partOpts}
            </select>
          </div>
          <div class="form-group">
            <label>Part Name</label>
            <input type="text" class="form-control" id="grnPartName" readonly>
          </div>
          <div class="form-group">
            <label>Current Stock</label>
            <input type="text" class="form-control" id="grnCurrentStock" readonly>
          </div>
          <div class="form-group">
            <label>Quantity *</label>
            <input type="number" class="form-control" name="Quantity" id="grnQuantity" min="1" required>
          </div>
          <div class="form-group">
            <label>Unit Cost *</label>
            <input type="number" class="form-control" name="UnitCost" id="grnUnitCost" min="0" step="0.01" required>
          </div>
          <div class="form-group">
            <label>Total Cost</label>
            <input type="text" class="form-control" id="grnTotalCost" readonly>
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
          <div class="form-group full-width">
            <label>Remarks</label>
            <textarea class="form-control" name="Remarks" rows="2"></textarea>
          </div>
        </div>
      </form>
    `, [
      { text: 'Process GRN', class: 'btn-primary', action: () => submitGRN() },
      { text: 'Cancel', class: 'btn-secondary', action: () => hideModal() }
    ]);

    qs('#grnPartSelect').addEventListener('change', function () {
      const opt = this.options[this.selectedIndex];
      if (opt && opt.value) {
        setVal('#grnPartName', opt.dataset.name || '');
        setVal('#grnCurrentStock', opt.dataset.stock || '0');
      } else {
        setVal('#grnPartName', '');
        setVal('#grnCurrentStock', '');
      }
      calcTotal();
    });

    qs('#grnQuantity').addEventListener('input', calcTotal);
    qs('#grnUnitCost').addEventListener('input', calcTotal);

    function calcTotal() {
      const qty = parseFloat(getVal('#grnQuantity')) || 0;
      const cost = parseFloat(getVal('#grnUnitCost')) || 0;
      setVal('#grnTotalCost', formatCurrency(qty * cost));
    }
  }

  async function submitGRN() {
    const data = getFormData('#grnForm');
    if (!data.PartCode || !data.Quantity || !data.UnitCost) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    showLoading(true);
    try {
      await api.mutate('processGoodsReceipt', data);
      showToast('Goods receipt processed successfully', 'success');
      hideModal();
      await loadData();
      renderTableData();
    } catch (e) {
      showToast('Error processing GRN: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function exportCSV() {
    const headers = ['GRNNo', 'PartCode', 'PartName', 'Quantity', 'UnitCost', 'TotalCost', 'Supplier', 'InvoiceNo', 'ReceivedDate', 'Status', 'CreatedAt'];
    const csvRows = [headers.join(',')];
    state.filtered.forEach(r => {
      csvRows.push(headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goods_receipts.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
  }

  CMMS.router.registerPage('goodsreceipt', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { parts: [], receipts: [], filtered: [], searchQuery: '', currentPage: 1, perPage: 20 };
    }
  });
})();
