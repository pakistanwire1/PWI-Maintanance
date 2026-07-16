/* ============================================================
   checklists.js — Checklist Templates Page Module
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _templates = [];

  App.registerPage('checklists', render, load);

  function render() {
    var el = document.getElementById('page-checklists');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Checklists</h2>' +
        '<button class="btn btn-primary" onclick="ChecklistCreate()">+ Add Template</button>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="cl-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getChecklistTemplates')
      .then(function(data) {
        _templates = data || [];
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load checklists: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('cl-table');
    if (!el) return;
    if (_templates.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#9745;</div><div class="empty-state-text">No checklist templates found</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Name</th><th>Category</th><th>Items</th><th>Actions</th></tr></thead><tbody>';
    _templates.forEach(function(t) {
      var items = 0;
      try {
        var parsed = typeof t.Items === 'string' ? JSON.parse(t.Items) : t.Items;
        items = Array.isArray(parsed) ? parsed.length : 0;
      } catch(e) { items = 0; }
      html += '<tr>' +
        '<td><strong>' + App.escHtml(t.Name || t.TemplateName || '') + '</strong></td>' +
        '<td>' + App.escHtml(t.Category || '') + '</td>' +
        '<td>' + items + ' items</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="ChecklistEdit(\'' + (t.ID || t.TemplateID || '') + '\')">Edit</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="ChecklistDelete(\'' + (t.ID || t.TemplateID || '') + '\')">Del</button>' +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function showForm(title, template) {
    var isEdit = !!template;
    var existingItems = '';
    if (template && template.Items) {
      try {
        var parsed = typeof template.Items === 'string' ? JSON.parse(template.Items) : template.Items;
        if (Array.isArray(parsed)) existingItems = parsed.join('\n');
      } catch(e) { existingItems = ''; }
    }

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" style="max-width:600px">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Template Name *</label><input class="form-input" id="cl-name" value="' + App.escHtml(template ? (template.Name || template.TemplateName) : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Category</label><input class="form-input" id="cl-cat" value="' + App.escHtml(template ? template.Category : '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Checklist Items (one per line) *</label>' +
          '<textarea class="form-input" id="cl-items" rows="8" placeholder="Item 1\nItem 2\nItem 3">' + App.escHtml(existingItems) + '</textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="cl-save">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#cl-save').onclick = function() {
      var itemsText = document.getElementById('cl-items').value;
      var items = itemsText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
      var data = {
        Name: document.getElementById('cl-name').value,
        Category: document.getElementById('cl-cat').value,
        Items: JSON.stringify(items)
      };
      if (!data.Name) { App.showToast('Template name is required', 'error'); return; }
      if (items.length === 0) { App.showToast('Add at least one checklist item', 'error'); return; }
      var action = isEdit ? 'updateChecklistTemplate' : 'addChecklistTemplate';
      if (isEdit) data.id = template.ID || template.TemplateID;
      var btn = overlay.querySelector('#cl-save');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call(action, data)
        .then(function() {
          overlay.remove();
          App.showToast('Checklist template ' + (isEdit ? 'updated' : 'created'), 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = isEdit ? 'Update' : 'Create'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
  }

  window.ChecklistCreate = function() { showForm('Add Checklist Template', null); };

  window.ChecklistEdit = function(id) {
    var t = _templates.find(function(x) { return (x.ID || x.TemplateID) === id; });
    if (t) showForm('Edit Checklist Template', t);
  };

  window.ChecklistDelete = function(id) {
    var t = _templates.find(function(x) { return (x.ID || x.TemplateID) === id; });
    App.showConfirm('Delete Template', 'Delete "' + (t ? (t.Name || t.TemplateName) : '') + '"?', function() {
      API.call('deleteChecklistTemplate', { id: id })
        .then(function() { App.showToast('Template deleted', 'success'); load(); })
        .catch(function(err) { App.showToast('Error: ' + err.message, 'error'); });
    });
  };
})();
