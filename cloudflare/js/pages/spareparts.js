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
  const getFormData = CMMS.utils.getFormData;
  const resetForm = CMMS.utils.resetForm;
  const renderTable = CMMS.utils.renderTable;
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
    parts: [],
    filtered: [],
    lowStock: [],
    categories: [],
    manufacturers: [],
    suppliers: [],
    searchQuery: '',
    filterCategory: '',
    filterStatus: '',
    filterManufacturer: '',
    filterSupplier: '',
    formMode: 'add',
    editingId: null,
    currentPage: 1,
    perPage: 20
  };

  function getContainer() {
    return CMMS.loader.getContainer();
  }

  async function loadData() {
    showLoading(true);
    try {
      const [parts, lowStock] = await Promise.all([
        api.call('getSpareParts'),
        api.call('getLowStockParts')
      ]);
      state.parts = parts || [];
      state.filtered = [...state.parts];
      state.lowStock = lowStock || [];
      state.categories = [...new Set(state.parts.map(p => p.Category).filter(Boolean))];
      state.manufacturers = [...new Set(state.parts.map(p => p.Manufacturer).filter(Boolean))];
      state.suppliers = [...new Set(state.parts.map(p => p.Supplier).filter(Boolean))];
    } catch (e) {
      showToast('Error loading spare parts: ' + e.message, 'error');
    }
    showLoading(false);
  }

  function formatCurrency(val) {
    return '$' + (parseFloat(val) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function render() {
    const c = getContainer();
    const lowStockAlert = state.lowStock.length > 0 ? `
      <div class="alert alert-warning">
        <span class="icon-alert"></span>
        <strong>Low Stock Alert:</strong> ${state.lowStock.length} item(s) below minimum stock level.
        <button class="btn btn-sm btn-warning" id="btnShowLowStock">View</button>
      </div>
    ` : '';

    const categoryOptions = state.categories.map(c => `<option value="${escHtml(c)}" ${state.filterCategory === c ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
    const manufacturerOptions = state.manufacturers.map(m => `<option value="${escHtml(m)}" ${state.filterManufacturer === m ? 'selected' : ''}>${escHtml(m)}</option>`).join('');
    const supplierOptions = state.suppliers.map(s => `<option value="${escHtml(s)}" ${state.filterSupplier === s ? 'selected' : ''}>${escHtml(s)}</option>`).join('');

    c.innerHTML = `
      ${lowStockAlert}
      <div class="page-header">
        <h2>Spare Parts</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="btnAddPart"><span class="icon-plus"></span> Add Part</button>
          <button class="btn btn-secondary" id="btnExportPartsCSV"><span class="icon-download"></span> Export CSV</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="text" class="form-control" id="spSearch" placeholder="Search parts..." value="${escHtml(state.searchQuery)}">
        <select class="form-control" id="spFilterCategory">
          <option value="">All Categories</option>
          ${categoryOptions}
        </select>
        <select class="form-control" id="spFilterStatus">
          <option value="">All Status</option>
          <option value="Active" ${state.filterStatus === 'Active' ? 'selected' : ''}>Active</option>
          <option value="Inactive" ${state.filterStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
        </select>
        <select class="form-control" id="spFilterManufacturer">
          <option value="">All Manufacturers</option>
          ${manufacturerOptions}
        </select>
        <select class="form-control" id="spFilterSupplier">
          <option value="">All Suppliers</option>
          ${supplierOptions}
        </select>
      </div>
      <div class="table-container" id="spTableContainer"></div>
      <div class="pagination" id="spPagination"></div>
    `;
    renderTableData();
    bindEvents();
  }

  function bindEvents() {
    qs('#btnAddPart').addEventListener('click', () => openAddForm());
    qs('#btnExportPartsCSV').addEventListener('click', exportCSV);
    qs('#spSearch').addEventListener('input', debounce(() => {
      state.searchQuery = qs('#spSearch').value;
      filterRecords();
    }, 300));
    qs('#spFilterCategory').addEventListener('change', () => {
      state.filterCategory = qs('#spFilterCategory').value;
      filterRecords();
    });
    qs('#spFilterStatus').addEventListener('change', () => {
      state.filterStatus = qs('#spFilterStatus').value;
      filterRecords();
    });
    qs('#spFilterManufacturer').addEventListener('change', () => {
      state.filterManufacturer = qs('#spFilterManufacturer').value;
      filterRecords();
    });
    qs('#spFilterSupplier').addEventListener('change', () => {
      state.filterSupplier = qs('#spFilterSupplier').value;
      filterRecords();
    });

    const lowStockBtn = qs('#btnShowLowStock');
    if (lowStockBtn) {
      lowStockBtn.addEventListener('click', () => {
        showModal('Low Stock Parts', `
          <table class="data-table">
            <thead><tr><th>Part Code</th><th>Part Name</th><th>Current Stock</th><th>Min Stock</th></tr></thead>
            <tbody>
              ${state.lowStock.map(p => `<tr>
                <td>${escHtml(p.PartCode || '')}</td>
                <td>${escHtml(p.PartName || '')}</td>
                <td>${p.CurrentStock || 0}</td>
                <td>${p.MinimumStock || 0}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        `, [{ text: 'Close', class: 'btn-secondary', action: () => hideModal() }]);
      });
    }
  }

  function filterRecords() {
    const q = (state.searchQuery || '').toLowerCase();
    state.filtered = state.parts.filter(p => {
      const matchSearch = !q ||
        (p.PartCode || '').toLowerCase().includes(q) ||
        (p.PartName || '').toLowerCase().includes(q) ||
        (p.Category || '').toLowerCase().includes(q) ||
        (p.Manufacturer || '').toLowerCase().includes(q) ||
        (p.Supplier || '').toLowerCase().includes(q) ||
        (p.Barcode || '').toLowerCase().includes(q);
      const matchCategory = !state.filterCategory || p.Category === state.filterCategory;
      const matchStatus = !state.filterStatus || p.Status === state.filterStatus;
      const matchMfr = !state.filterManufacturer || p.Manufacturer === state.filterManufacturer;
      const matchSup = !state.filterSupplier || p.Supplier === state.filterSupplier;
      return matchSearch && matchCategory && matchStatus && matchMfr && matchSup;
    });
    state.currentPage = 1;
    renderTableData();
  }

  function renderTableData() {
    const start = (state.currentPage - 1) * state.perPage;
    const paged = state.filtered.slice(start, start + state.perPage);
    const totalPages = Math.ceil(state.filtered.length / state.perPage);

    const rows = paged.map(p => `
      <tr>
        <td>${escHtml(p.PartCode || '')}</td>
        <td>${escHtml(p.PartName || '')}</td>
        <td>${escHtml(p.Category || '')}</td>
        <td>${escHtml(p.Unit || '')}</td>
        <td class="${(p.CurrentStock || 0) <= (p.MinimumStock || 0) ? 'text-danger fw-bold' : ''}">${p.CurrentStock || 0}</td>
        <td>${p.MinimumStock || 0}</td>
        <td>${formatCurrency(p.UnitCost)}</td>
        <td>${statusBadge(p.Status)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-primary btn-edit-part" data-id="${p.PartID || p.ID}" title="Edit"><span class="icon-edit"></span></button>
          <button class="btn btn-sm btn-info btn-stock-history" data-id="${p.PartID || p.ID}" data-code="${escHtml(p.PartCode || '')}" title="Stock History"><span class="icon-history"></span></button>
          <button class="btn btn-sm btn-danger btn-delete-part" data-id="${p.PartID || p.ID}" title="Delete"><span class="icon-trash"></span></button>
        </td>
      </tr>
    `).join('');

    setHtml('#spTableContainer', `
      <table class="data-table">
        <thead>
          <tr>
            <th>Part Code</th><th>Part Name</th><th>Category</th><th>Unit</th>
            <th>Current Stock</th><th>Min Stock</th><th>Unit Cost</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="9" class="text-center">No spare parts found</td></tr>'}</tbody>
      </table>
    `);

    renderPagination(totalPages);

    qsa('.btn-edit-part').forEach(btn => btn.addEventListener('click', () => openEditForm(btn.dataset.id)));
    qsa('.btn-stock-history').forEach(btn => btn.addEventListener('click', () => showStockHistory(btn.dataset.code)));
    qsa('.btn-delete-part').forEach(btn => btn.addEventListener('click', () => deletePart(btn.dataset.id)));
  }

  function renderPagination(totalPages) {
    const pag = qs('#spPagination');
    if (!pag || totalPages <= 1) { if (pag) pag.innerHTML = ''; return; }
    let html = `<span class="page-info">Page ${state.currentPage} of ${totalPages}</span><div class="page-buttons">`;
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

  function openAddForm() {
    state.formMode = 'add';
    state.editingId = null;
    showPartForm();
  }

  function openEditForm(id) {
    const part = state.parts.find(p => (p.PartID || p.ID) == id);
    if (!part) return;
    state.formMode = 'edit';
    state.editingId = id;
    showPartForm(part);
  }

  function showPartForm(part) {
    const p = part || {};
    const isEdit = state.formMode === 'edit';

    showModal(isEdit ? 'Edit Spare Part' : 'Add Spare Part', `
      <form id="spForm" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Part Name *</label>
            <input type="text" class="form-control" name="PartName" value="${escHtml(p.PartName || '')}" required>
          </div>
          <div class="form-group">
            <label>Category</label>
            <input type="text" class="form-control" name="Category" value="${escHtml(p.Category || '')}" list="categoryList">
            <datalist id="categoryList">
              ${state.categories.map(c => `<option value="${escHtml(c)}">`).join('')}
            </datalist>
          </div>
          <div class="form-group">
            <label>Manufacturer</label>
            <input type="text" class="form-control" name="Manufacturer" value="${escHtml(p.Manufacturer || '')}">
          </div>
          <div class="form-group">
            <label>Machine Compatibility</label>
            <input type="text" class="form-control" name="MachineCompatibility" value="${escHtml(p.MachineCompatibility || '')}">
          </div>
          <div class="form-group">
            <label>Asset Compatibility</label>
            <input type="text" class="form-control" name="AssetCompatibility" value="${escHtml(p.AssetCompatibility || '')}">
          </div>
          <div class="form-group">
            <label>Unit *</label>
            <select class="form-control" name="Unit" required>
              <option value="">Select</option>
              <option value="Pcs" ${p.Unit === 'Pcs' ? 'selected' : ''}>Pcs</option>
              <option value="Kg" ${p.Unit === 'Kg' ? 'selected' : ''}>Kg</option>
              <option value="Liter" ${p.Unit === 'Liter' ? 'selected' : ''}>Liter</option>
              <option value="Meter" ${p.Unit === 'Meter' ? 'selected' : ''}>Meter</option>
              <option value="Set" ${p.Unit === 'Set' ? 'selected' : ''}>Set</option>
              <option value="Box" ${p.Unit === 'Box' ? 'selected' : ''}>Box</option>
            </select>
          </div>
          <div class="form-group">
            <label>Store Location</label>
            <input type="text" class="form-control" name="StoreLocation" value="${escHtml(p.StoreLocation || '')}">
          </div>
          <div class="form-group">
            <label>Bin Number</label>
            <input type="text" class="form-control" name="BinNumber" value="${escHtml(p.BinNumber || '')}">
          </div>
          <div class="form-group">
            <label>Current Stock</label>
            <input type="number" class="form-control" name="CurrentStock" value="${p.CurrentStock || 0}" min="0" ${isEdit ? '' : ''}>
          </div>
          <div class="form-group">
            <label>Minimum Stock</label>
            <input type="number" class="form-control" name="MinimumStock" value="${p.MinimumStock || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Maximum Stock</label>
            <input type="number" class="form-control" name="MaximumStock" value="${p.MaximumStock || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Reorder Level</label>
            <input type="number" class="form-control" name="ReorderLevel" value="${p.ReorderLevel || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Supplier</label>
            <input type="text" class="form-control" name="Supplier" value="${escHtml(p.Supplier || '')}">
          </div>
          <div class="form-group">
            <label>Unit Cost</label>
            <input type="number" class="form-control" name="UnitCost" value="${p.UnitCost || ''}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Barcode</label>
            <input type="text" class="form-control" name="Barcode" value="${escHtml(p.Barcode || '')}">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="Status">
              <option value="Active" ${(!p.Status || p.Status === 'Active') ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${p.Status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Remarks</label>
            <textarea class="form-control" name="Remarks" rows="2">${escHtml(p.Remarks || '')}</textarea>
          </div>
        </div>
      </form>
    `, [
      { text: isEdit ? 'Update' : 'Save', class: 'btn-primary', action: () => savePart() },
      { text: 'Cancel', class: 'btn-secondary', action: () => hideModal() }
    ]);
  }

  async function savePart() {
    const data = getFormData('#spForm');
    if (!data.PartName || !data.Unit) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    showLoading(true);
    try {
      if (state.formMode === 'edit') {
        await api.mutate('updateSparePart', { PartID: state.editingId, ...data });
        showToast('Part updated successfully', 'success');
      } else {
        await api.mutate('addSparePart', data);
        showToast('Part added successfully', 'success');
      }
      hideModal();
      await refreshAll();
    } catch (e) {
      showToast('Error saving part: ' + e.message, 'error');
    }
    showLoading(false);
  }

  async function deletePart(id) {
    const confirmed = await showConfirm('Are you sure you want to delete this spare part?');
    if (!confirmed) return;
    showLoading(true);
    try {
      await api.mutate('deleteSparePart', { PartID: id });
      showToast('Part deleted', 'success');
      await refreshAll();
    } catch (e) {
      showToast('Error deleting part: ' + e.message, 'error');
    }
    showLoading(false);
  }

  async function showStockHistory(partCode) {
    showLoading(true);
    try {
      const history = await api.call('getStockHistory', { PartCode: partCode }) || [];
      showModal('Stock History - ' + partCode, `
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Quantity</th><th>Balance Before</th><th>Balance After</th><th>Reference</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            ${history.map(h => `<tr>
              <td>${formatDate(h.CreatedAt || h.TransactionDate)}</td>
              <td>${badge(h.TransactionType)}</td>
              <td>${h.Quantity || 0}</td>
              <td>${h.BalanceBefore || 0}</td>
              <td>${h.BalanceAfter || 0}</td>
              <td>${escHtml(h.ReferenceNo || '')}</td>
              <td>${escHtml(h.Remarks || '')}</td>
            </tr>`).join('') || '<tr><td colspan="7" class="text-center">No history</td></tr>'}
          </tbody>
        </table>
      `, [{ text: 'Close', class: 'btn-secondary', action: () => hideModal() }]);
    } catch (e) {
      showToast('Error loading stock history: ' + e.message, 'error');
    }
    showLoading(false);
  }

  async function exportCSV() {
    try {
      await api.call('exportSparePartsCSV');
      showToast('CSV export initiated', 'success');
    } catch (e) {
      const headers = ['PartCode', 'PartName', 'Category', 'Unit', 'CurrentStock', 'MinimumStock', 'UnitCost', 'Status'];
      const csvRows = [headers.join(',')];
      state.filtered.forEach(p => {
        csvRows.push(headers.map(h => `"${(p[h] || '').toString().replace(/"/g, '""')}"`).join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spare_parts.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported', 'success');
    }
  }

  async function refreshAll() {
    await loadData();
    render();
  }

  CMMS.router.registerPage('spareparts', {
    init: async function () {
      await loadData();
      render();
    },
    render: function () {
      render();
    },
    destroy: function () {
      state = { parts: [], filtered: [], lowStock: [], categories: [], manufacturers: [], suppliers: [], searchQuery: '', filterCategory: '', filterStatus: '', filterManufacturer: '', filterSupplier: '', formMode: 'add', editingId: null, currentPage: 1, perPage: 20 };
    }
  });
})();
