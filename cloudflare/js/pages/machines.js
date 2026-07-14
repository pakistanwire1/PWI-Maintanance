/* ============================================================
   machines.js — Machines Page Module (CRUD Pattern)
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _machines = [];
  var _filtered = [];
  var _search = '';

  App.registerPage('machines', render, load);

  function render() {
    var el = document.getElementById('page-machines');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Machines</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search machines..." id="machine-search" oninput="MachineSearch(this.value)" style="width:240px">' +
          (Auth.canManageMachines() ? '<button class="btn btn-primary" onclick="MachineCreate()">+ Add Machine</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="machines-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getMachines')
      .then(function(data) {
        _machines = data || [];
        _filtered = _machines;
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load machines: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('machines-table');
    if (!el) return;
    if (_filtered.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#9881;</div><div class="empty-state-text">No machines found</div></div>';
      return;
    }
    var html = '<table><thead><tr>' +
      '<th>Machine ID</th><th>Name</th><th>Code</th><th>Department</th>' +
      '<th>Type</th><th>Status</th>' +
      (Auth.canManageMachines() ? '<th>Actions</th>' : '') +
      '</tr></thead><tbody>';
    _filtered.forEach(function(m) {
      var statusClass = (m.Status || '').toLowerCase() === 'active' ? 'badge-success' : 'badge-secondary';
      html += '<tr>' +
        '<td><strong>' + App.escHtml(m.MachineID || '') + '</strong></td>' +
        '<td>' + App.escHtml(m.MachineName || '') + '</td>' +
        '<td>' + App.escHtml(m.MachineCode || '') + '</td>' +
        '<td>' + App.escHtml(m.Department || '') + '</td>' +
        '<td>' + App.escHtml(m.MachineType || '') + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + App.escHtml(m.Status || 'Active') + '</span></td>';
      if (Auth.canManageMachines()) {
        html += '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="MachineEdit(\'' + m.MachineID + '\')">Edit</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="MachineDelete(\'' + m.MachineID + '\')">Delete</button>' +
          '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function showForm(title, machine) {
    var isEdit = !!machine;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Machine Name *</label><input class="form-input" id="m-name" value="' + App.escHtml(machine ? machine.MachineName : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Machine Code</label><input class="form-input" id="m-code" value="' + App.escHtml(machine ? machine.MachineCode : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Machine Number</label><input class="form-input" id="m-number" value="' + App.escHtml(machine ? machine.MachineNumber : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Department</label><input class="form-input" id="m-dept" value="' + App.escHtml(machine ? machine.Department : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Section</label><input class="form-input" id="m-section" value="' + App.escHtml(machine ? machine.Section : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Location</label><input class="form-input" id="m-location" value="' + App.escHtml(machine ? machine.Location : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="m-type">' +
            '<option value="">Select Type</option>' +
            ['CNC','Hydraulic','Pneumatic','Electrical','Mechanical','Robotic','Conveyor','Pump','Compressor','Generator','Other'].map(function(t) {
              return '<option value="' + t + '"' + (machine && machine.MachineType === t ? ' selected' : '') + '>' + t + '</option>';
            }).join('') +
          '</select></div>' +
          '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="m-status">' +
            '<option value="Active"' + (machine && machine.Status === 'Active' ? ' selected' : '') + '>Active</option>' +
            '<option value="Inactive"' + (machine && machine.Status === 'Inactive' ? ' selected' : '') + '>Inactive</option>' +
            '<option value="Under Maintenance"' + (machine && machine.Status === 'Under Maintenance' ? ' selected' : '') + '>Under Maintenance</option>' +
          '</select></div>' +
          '<div class="form-group"><label class="form-label">Manufacturer</label><input class="form-input" id="m-manufacturer" value="' + App.escHtml(machine ? machine.Manufacturer : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Model</label><input class="form-input" id="m-model" value="' + App.escHtml(machine ? machine.Model : '') + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="m-save-btn">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#m-save-btn').onclick = function() {
      var data = {
        MachineName: document.getElementById('m-name').value,
        MachineCode: document.getElementById('m-code').value,
        MachineNumber: document.getElementById('m-number').value,
        Department: document.getElementById('m-dept').value,
        Section: document.getElementById('m-section').value,
        Location: document.getElementById('m-location').value,
        MachineType: document.getElementById('m-type').value,
        Status: document.getElementById('m-status').value,
        Manufacturer: document.getElementById('m-manufacturer').value,
        Model: document.getElementById('m-model').value
      };
      if (!data.MachineName) { App.showToast('Machine name is required', 'error'); return; }
      var action = isEdit ? 'updateMachine' : 'addMachine';
      if (isEdit) data.id = machine.MachineID;
      var btn = overlay.querySelector('#m-save-btn');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call(action, data)
        .then(function() {
          overlay.remove();
          App.showToast('Machine ' + (isEdit ? 'updated' : 'created') + ' successfully', 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = isEdit ? 'Update' : 'Create'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
  }

  window.MachineSearch = function(q) {
    _search = q.toLowerCase();
    _filtered = _machines.filter(function(m) {
      return (m.MachineName || '').toLowerCase().indexOf(_search) > -1 ||
             (m.MachineID || '').toLowerCase().indexOf(_search) > -1 ||
             (m.MachineCode || '').toLowerCase().indexOf(_search) > -1 ||
             (m.Department || '').toLowerCase().indexOf(_search) > -1;
    });
    renderTable();
  };

  window.MachineCreate = function() { showForm('Add Machine', null); };

  window.MachineEdit = function(id) {
    var m = _machines.find(function(x) { return x.MachineID === id; });
    if (m) showForm('Edit Machine', m);
  };

  window.MachineDelete = function(id) {
    var m = _machines.find(function(x) { return x.MachineID === id; });
    App.showConfirm('Delete Machine', 'Are you sure you want to delete ' + (m ? m.MachineName : id) + '?', function() {
      API.call('deleteMachine', { id: id })
        .then(function() { App.showToast('Machine deleted', 'success'); load(); })
        .catch(function(err) { App.showToast('Error: ' + err.message, 'error'); });
    });
  };
})();
