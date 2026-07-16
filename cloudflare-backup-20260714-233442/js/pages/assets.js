/* ============================================================
   assets.js — Assets Page Module (CRUD)
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _assets = [];
  var _filtered = [];
  var _search = '';

  App.registerPage('assets', render, load);

  function render() {
    var el = document.getElementById('page-assets');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Assets</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search assets..." id="asset-search" oninput="AssetSearch(this.value)" style="width:240px">' +
          (Auth.canManageAssets() ? '<button class="btn btn-primary" onclick="AssetCreate()">+ Add Asset</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="assets-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getAssets')
      .then(function(data) {
        _assets = data || [];
        _filtered = _assets;
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load assets: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('assets-table');
    if (!el) return;
    if (_filtered.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128230;</div><div class="empty-state-text">No assets found</div></div>';
      return;
    }
    var html = '<table><thead><tr>' +
      '<th>Asset ID</th><th>Name</th><th>Code</th><th>Machine</th><th>Department</th><th>Status</th>' +
      (Auth.canManageAssets() ? '<th>Actions</th>' : '') +
      '</tr></thead><tbody>';
    _filtered.forEach(function(a) {
      var sc = (a.Status || '').toLowerCase() === 'active' ? 'badge-success' : 'badge-secondary';
      html += '<tr>' +
        '<td><strong>' + App.escHtml(a.AssetID || '') + '</strong></td>' +
        '<td>' + App.escHtml(a.AssetName || '') + '</td>' +
        '<td>' + App.escHtml(a.AssetCode || '') + '</td>' +
        '<td>' + App.escHtml(a.Machine || '') + '</td>' +
        '<td>' + App.escHtml(a.Department || '') + '</td>' +
        '<td><span class="badge ' + sc + '">' + App.escHtml(a.Status || 'Active') + '</span></td>';
      if (Auth.canManageAssets()) {
        html += '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="AssetEdit(\'' + (a.AssetID || '') + '\')">Edit</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="AssetDelete(\'' + (a.AssetID || '') + '\')">Delete</button>' +
          '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function showForm(title, asset) {
    var isEdit = !!asset;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Asset Name *</label><input class="form-input" id="a-name" value="' + App.escHtml(asset ? asset.AssetName : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Asset Code</label><input class="form-input" id="a-code" value="' + App.escHtml(asset ? asset.AssetCode : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Machine</label><input class="form-input" id="a-machine" value="' + App.escHtml(asset ? asset.Machine : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Department</label><input class="form-input" id="a-dept" value="' + App.escHtml(asset ? asset.Department : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Location</label><input class="form-input" id="a-location" value="' + App.escHtml(asset ? asset.Location : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Category</label><input class="form-input" id="a-category" value="' + App.escHtml(asset ? asset.Category : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Purchase Date</label><input type="date" class="form-input" id="a-purchasedate" value="' + App.escHtml(asset ? asset.PurchaseDate : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="a-status">' +
            '<option value="Active"' + (asset && asset.Status === 'Active' ? ' selected' : '') + '>Active</option>' +
            '<option value="Inactive"' + (asset && asset.Status === 'Inactive' ? ' selected' : '') + '>Inactive</option>' +
            '<option value="Disposed"' + (asset && asset.Status === 'Disposed' ? ' selected' : '') + '>Disposed</option>' +
          '</select></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="a-desc" rows="2">' + App.escHtml(asset ? asset.Description : '') + '</textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="a-save">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#a-save').onclick = function() {
      var data = {
        AssetName: document.getElementById('a-name').value,
        AssetCode: document.getElementById('a-code').value,
        Machine: document.getElementById('a-machine').value,
        Department: document.getElementById('a-dept').value,
        Location: document.getElementById('a-location').value,
        Category: document.getElementById('a-category').value,
        PurchaseDate: document.getElementById('a-purchasedate').value,
        Status: document.getElementById('a-status').value,
        Description: document.getElementById('a-desc').value
      };
      if (!data.AssetName) { App.showToast('Asset name is required', 'error'); return; }
      var action = isEdit ? 'updateAsset' : 'addAsset';
      if (isEdit) data.id = asset.AssetID;
      var btn = overlay.querySelector('#a-save');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call(action, data)
        .then(function() {
          overlay.remove();
          App.showToast('Asset ' + (isEdit ? 'updated' : 'created') + ' successfully', 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = isEdit ? 'Update' : 'Create'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
  }

  window.AssetSearch = function(q) {
    _search = q.toLowerCase();
    _filtered = _assets.filter(function(a) {
      return (a.AssetName || '').toLowerCase().indexOf(_search) > -1 ||
             (a.AssetID || '').toLowerCase().indexOf(_search) > -1 ||
             (a.AssetCode || '').toLowerCase().indexOf(_search) > -1 ||
             (a.Department || '').toLowerCase().indexOf(_search) > -1;
    });
    renderTable();
  };

  window.AssetCreate = function() { showForm('Add Asset', null); };

  window.AssetEdit = function(id) {
    var a = _assets.find(function(x) { return x.AssetID === id; });
    if (a) showForm('Edit Asset', a);
  };

  window.AssetDelete = function(id) {
    var a = _assets.find(function(x) { return x.AssetID === id; });
    App.showConfirm('Delete Asset', 'Delete ' + (a ? a.AssetName : id) + '?', function() {
      API.call('deleteAsset', { id: id })
        .then(function() { App.showToast('Asset deleted', 'success'); load(); })
        .catch(function(err) { App.showToast('Error: ' + err.message, 'error'); });
    });
  };
})();
