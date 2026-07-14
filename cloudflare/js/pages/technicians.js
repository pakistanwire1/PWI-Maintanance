/* ============================================================
   technicians.js — Technicians Page Module (CRUD)
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _techs = [];
  var _filtered = [];
  var _search = '';

  App.registerPage('technicians', render, load);

  function render() {
    var el = document.getElementById('page-technicians');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Technicians</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search technicians..." id="tech-search" oninput="TechSearch(this.value)" style="width:240px">' +
          '<button class="btn btn-primary" onclick="TechCreate()">+ Add Technician</button>' +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="tech-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getTechnicians')
      .then(function(data) {
        _techs = data || [];
        _filtered = _techs;
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load technicians: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('tech-table');
    if (!el) return;
    if (_filtered.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128119;</div><div class="empty-state-text">No technicians found</div></div>';
      return;
    }
    var html = '<table><thead><tr>' +
      '<th>ID</th><th>Name</th><th>Specialization</th><th>Department</th><th>Phone</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>';
    _filtered.forEach(function(t) {
      var sc = (t.Status || '').toLowerCase() === 'active' ? 'badge-success' : 'badge-secondary';
      html += '<tr>' +
        '<td><strong>' + App.escHtml(t.TechnicianID || t.ID || '') + '</strong></td>' +
        '<td>' + App.escHtml(t.Name || '') + '</td>' +
        '<td>' + App.escHtml(t.Specialization || t.Skill || '') + '</td>' +
        '<td>' + App.escHtml(t.Department || '') + '</td>' +
        '<td>' + App.escHtml(t.Phone || t.Contact || '') + '</td>' +
        '<td><span class="badge ' + sc + '">' + App.escHtml(t.Status || 'Active') + '</span></td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="TechEdit(\'' + (t.TechnicianID || t.ID || '') + '\')">Edit</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="TechDelete(\'' + (t.TechnicianID || t.ID || '') + '\')">Del</button>' +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function showForm(title, tech) {
    var isEdit = !!tech;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="t-name" value="' + App.escHtml(tech ? tech.Name : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Employee ID</label><input class="form-input" id="t-empid" value="' + App.escHtml(tech ? tech.EmployeeID : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Specialization</label><input class="form-input" id="t-spec" value="' + App.escHtml(tech ? (tech.Specialization || tech.Skill) : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Department</label><input class="form-input" id="t-dept" value="' + App.escHtml(tech ? tech.Department : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="t-phone" value="' + App.escHtml(tech ? (tech.Phone || tech.Contact) : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="t-email" value="' + App.escHtml(tech ? tech.Email : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Shift</label><input class="form-input" id="t-shift" value="' + App.escHtml(tech ? tech.Shift : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="t-status">' +
            '<option value="Active"' + (tech && tech.Status === 'Active' ? ' selected' : '') + '>Active</option>' +
            '<option value="Inactive"' + (tech && tech.Status === 'Inactive' ? ' selected' : '') + '>Inactive</option>' +
            '<option value="On Leave"' + (tech && tech.Status === 'On Leave' ? ' selected' : '') + '>On Leave</option>' +
          '</select></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="t-save">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#t-save').onclick = function() {
      var data = {
        Name: document.getElementById('t-name').value,
        EmployeeID: document.getElementById('t-empid').value,
        Specialization: document.getElementById('t-spec').value,
        Department: document.getElementById('t-dept').value,
        Phone: document.getElementById('t-phone').value,
        Email: document.getElementById('t-email').value,
        Shift: document.getElementById('t-shift').value,
        Status: document.getElementById('t-status').value
      };
      if (!data.Name) { App.showToast('Name is required', 'error'); return; }
      var action = isEdit ? 'updateTechnician' : 'addTechnician';
      if (isEdit) data.id = tech.TechnicianID || tech.ID;
      var btn = overlay.querySelector('#t-save');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call(action, data)
        .then(function() {
          overlay.remove();
          App.showToast('Technician ' + (isEdit ? 'updated' : 'created'), 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = isEdit ? 'Update' : 'Create'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
  }

  window.TechSearch = function(q) {
    _search = q.toLowerCase();
    _filtered = _techs.filter(function(t) {
      return (t.Name || '').toLowerCase().indexOf(_search) > -1 ||
             (t.TechnicianID || t.ID || '').toLowerCase().indexOf(_search) > -1 ||
             (t.Specialization || t.Skill || '').toLowerCase().indexOf(_search) > -1 ||
             (t.Department || '').toLowerCase().indexOf(_search) > -1;
    });
    renderTable();
  };

  window.TechCreate = function() { showForm('Add Technician', null); };

  window.TechEdit = function(id) {
    var t = _techs.find(function(x) { return (x.TechnicianID || x.ID) === id; });
    if (t) showForm('Edit Technician', t);
  };

  window.TechDelete = function(id) {
    var t = _techs.find(function(x) { return (x.TechnicianID || x.ID) === id; });
    App.showConfirm('Delete Technician', 'Delete ' + (t ? t.Name : id) + '?', function() {
      API.call('deleteTechnician', { id: id })
        .then(function() { App.showToast('Technician deleted', 'success'); load(); })
        .catch(function(err) { App.showToast('Error: ' + err.message, 'error'); });
    });
  };
})();
