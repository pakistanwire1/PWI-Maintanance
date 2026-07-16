/* ============================================================
   spareparts.js — Spare Parts Page Module (CRUD + Stock)
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _parts = [];
  var _filtered = [];
  var _search = '';
  var _stockView = false;

  App.registerPage('spareparts', render, load);

  function render() {
    var el = document.getElementById('page-spareparts');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Spare Parts</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search parts..." id="sp-search" oninput="SPSearch(this.value)" style="width:240px">' +
          '<button class="btn btn-secondary" onclick="SPToggleView()">&#128202; Stock View</button>' +
          '<button class="btn btn-primary" onclick="SPCreate()">+ Add Part</button>' +
        '</div>' +
      '</div>' +
      '<div id="sp-stock-summary" class="grid grid-3" style="margin-bottom:16px;display:none">' +
        '<div class="card stat-card"><div class="stat-label">Total Parts</div><div class="stat-value" id="sp-total">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Low Stock</div><div class="stat-value" style="color:var(--warning)" id="sp-low">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Out of Stock</div><div class="stat-value" style="color:var(--danger)" id="sp-out">-</div></div>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="sp-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getSpareParts')
      .then(function(data) {
        _parts = data || [];
        _filtered = _parts;
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load spare parts: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('sp-table');
    if (!el) return;
    if (_filtered.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128296;</div><div class="empty-state-text">No spare parts found</div></div>';
      return;
    }
    var html = '<table><thead><tr>' +
      '<th>Part Code</th><th>Name</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Min Stock</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>';
    _filtered.forEach(function(p) {
      var qty = parseInt(p.Quantity || p.Stock || 0);
      var min = parseInt(p.MinStock || p.ReorderLevel || 0);
      var status = 'badge-success';
      var statusText = 'OK';
      if (qty === 0) { status = 'badge-danger'; statusText = 'Out of Stock'; }
      else if (qty <= min) { status = 'badge-warning'; statusText = 'Low Stock'; }
      html += '<tr>' +
        '<td><strong>' + App.escHtml(p.PartCode || '') + '</strong></td>' +
        '<td>' + App.escHtml(p.PartName || p.Name || '') + '</td>' +
        '<td>' + App.escHtml(p.Category || '') + '</td>' +
        '<td>' + qty + '</td>' +
        '<td>' + App.escHtml(p.UnitPrice || '-') + '</td>' +
        '<td>' + min + '</td>' +
        '<td><span class="badge ' + status + '">' + statusText + '</span></td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="SPEdit(\'' + (p.PartCode || p.id || '') + '\')">Edit</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="SPDelete(\'' + (p.PartCode || p.id || '') + '\')">Del</button>' +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function showForm(title, part) {
    var isEdit = !!part;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Part Code *</label><input class="form-input" id="sp-code" value="' + App.escHtml(part ? part.PartCode : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Part Name *</label><input class="form-input" id="sp-name" value="' + App.escHtml(part ? (part.PartName || part.Name) : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Category</label><input class="form-input" id="sp-cat" value="' + App.escHtml(part ? part.Category : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="sp-qty" value="' + (part ? (part.Quantity || part.Stock || 0) : 0) + '"></div>' +
          '<div class="form-group"><label class="form-label">Unit Price</label><input type="number" step="0.01" class="form-input" id="sp-price" value="' + (part ? part.UnitPrice || '' : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Min Stock / Reorder</label><input type="number" class="form-input" id="sp-min" value="' + (part ? (part.MinStock || part.ReorderLevel || 0) : 0) + '"></div>' +
          '<div class="form-group"><label class="form-label">Location</label><input class="form-input" id="sp-location" value="' + App.escHtml(part ? part.Location : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Unit</label><input class="form-input" id="sp-unit" value="' + App.escHtml(part ? part.Unit : '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="sp-desc" rows="2">' + App.escHtml(part ? part.Description : '') + '</textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="sp-save">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#sp-save').onclick = function() {
      var data = {
        PartCode: document.getElementById('sp-code').value,
        PartName: document.getElementById('sp-name').value,
        Category: document.getElementById('sp-cat').value,
        Quantity: document.getElementById('sp-qty').value,
        UnitPrice: document.getElementById('sp-price').value,
        MinStock: document.getElementById('sp-min').value,
        Location: document.getElementById('sp-location').value,
        Unit: document.getElementById('sp-unit').value,
        Description: document.getElementById('sp-desc').value
      };
      if (!data.PartCode) { App.showToast('Part code is required', 'error'); return; }
      if (!data.PartName) { App.showToast('Part name is required', 'error'); return; }
      var action = isEdit ? 'updateSparePart' : 'addSparePart';
      if (isEdit) data.id = part.PartCode || part.id;
      var btn = overlay.querySelector('#sp-save');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call(action, data)
        .then(function() {
          overlay.remove();
          App.showToast('Spare part ' + (isEdit ? 'updated' : 'created'), 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = isEdit ? 'Update' : 'Create'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
  }

  window.SPSearch = function(q) {
    _search = q.toLowerCase();
    _filtered = _parts.filter(function(p) {
      return (p.PartCode || '').toLowerCase().indexOf(_search) > -1 ||
             (p.PartName || p.Name || '').toLowerCase().indexOf(_search) > -1 ||
             (p.Category || '').toLowerCase().indexOf(_search) > -1;
    });
    renderTable();
  };

  window.SPToggleView = function() {
    _stockView = !_stockView;
    var el = document.getElementById('sp-stock-summary');
    if (el) el.style.display = _stockView ? '' : 'none';
    if (_stockView) {
      var total = _parts.length;
      var low = _parts.filter(function(p) { return parseInt(p.Quantity || p.Stock || 0) > 0 && parseInt(p.Quantity || p.Stock || 0) <= parseInt(p.MinStock || p.ReorderLevel || 0); }).length;
      var out = _parts.filter(function(p) { return parseInt(p.Quantity || p.Stock || 0) === 0; }).length;
      App.setText('sp-total', total);
      App.setText('sp-low', low);
      App.setText('sp-out', out);
    }
  };

  window.SPCreate = function() { showForm('Add Spare Part', null); };

  window.SPEdit = function(id) {
    var p = _parts.find(function(x) { return (x.PartCode || x.id) === id; });
    if (p) showForm('Edit Spare Part', p);
  };

  window.SPDelete = function(id) {
    App.showConfirm('Delete Part', 'Delete this spare part?', function() {
      API.call('deleteSparePart', { id: id })
        .then(function() { App.showToast('Spare part deleted', 'success'); load(); })
        .catch(function(err) { App.showToast('Error: ' + err.message, 'error'); });
    });
  };
})();
