/* ============================================================
   pm.js — Preventive Maintenance Page Module
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _records = [];
  var _filtered = [];
  var _search = '';
  var _tab = 'all';

  App.registerPage('pm', render, load);

  function render() {
    var el = document.getElementById('page-pm');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Preventive Maintenance</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search PM..." id="pm-search" oninput="PMSearch(this.value)" style="width:240px">' +
          '<button class="btn btn-primary" onclick="PMCreate()">+ Add PM</button>' +
        '</div>' +
      '</div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="PMTab(this,\'all\')">All</button>' +
        '<button class="tab" onclick="PMTab(this,\'due\')">Due</button>' +
        '<button class="tab" onclick="PMTab(this,\'overdue\')">Overdue</button>' +
        '<button class="tab" onclick="PMTab(this,\'completed\')">Completed</button>' +
      '</div>' +
      '<div class="grid grid-3" style="margin-bottom:16px">' +
        '<div class="card stat-card"><div class="stat-label">Total PMs</div><div class="stat-value" id="pm-total">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Due Soon</div><div class="stat-value" style="color:var(--warning)" id="pm-due">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Overdue</div><div class="stat-value" style="color:var(--danger)" id="pm-overdue">-</div></div>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="pm-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getPMRecords')
      .then(function(data) {
        _records = data || [];
        _filtered = _records;
        App.showLoading(false);
        updateStats();
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load PM records: ' + err.message, 'error');
      });
  }

  function updateStats() {
    App.setText('pm-total', _records.length);
    var now = new Date();
    var due = _records.filter(function(r) {
      return (r.Status || '').toLowerCase() !== 'completed' && r.NextDueDate && new Date(r.NextDueDate) >= now && new Date(r.NextDueDate) <= new Date(now.getTime() + 7 * 86400000);
    }).length;
    var overdue = _records.filter(function(r) {
      return (r.Status || '').toLowerCase() !== 'completed' && r.NextDueDate && new Date(r.NextDueDate) < now;
    }).length;
    App.setText('pm-due', due);
    App.setText('pm-overdue', overdue);
  }

  function renderTable() {
    var el = document.getElementById('pm-table');
    if (!el) return;
    var list = getFilteredList();
    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128197;</div><div class="empty-state-text">No PM records found</div></div>';
      return;
    }
    var html = '<table><thead><tr>' +
      '<th>PM ID</th><th>Machine</th><th>Task</th><th>Frequency</th><th>Next Due</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>';
    list.forEach(function(r) {
      var sc = pmStatusBadge(r);
      html += '<tr>' +
        '<td><strong>' + App.escHtml(r.PMID || r.ID || '') + '</strong></td>' +
        '<td>' + App.escHtml(r.Machine || '') + '</td>' +
        '<td>' + App.escHtml(r.TaskDescription || r.Task || '') + '</td>' +
        '<td>' + App.escHtml(r.Frequency || r.Interval || '') + '</td>' +
        '<td>' + App.formatDate(r.NextDueDate) + '</td>' +
        '<td><span class="badge ' + sc.cls + '">' + sc.text + '</span></td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="PMEdit(\'' + (r.PMID || r.ID || '') + '\')">Edit</button> ' +
          '<button class="btn btn-sm btn-success" onclick="PMComplete(\'' + (r.PMID || r.ID || '') + '\')">Complete</button>' +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function getFilteredList() {
    var list = _records;
    if (_search) {
      var q = _search.toLowerCase();
      list = list.filter(function(r) {
        return (r.Machine || '').toLowerCase().indexOf(q) > -1 ||
               (r.TaskDescription || r.Task || '').toLowerCase().indexOf(q) > -1 ||
               (r.PMID || r.ID || '').toLowerCase().indexOf(q) > -1;
      });
    }
    if (_tab === 'due') {
      var now = new Date();
      var week = new Date(now.getTime() + 7 * 86400000);
      list = list.filter(function(r) {
        return (r.Status || '').toLowerCase() !== 'completed' && r.NextDueDate && new Date(r.NextDueDate) >= now && new Date(r.NextDueDate) <= week;
      });
    } else if (_tab === 'overdue') {
      var now2 = new Date();
      list = list.filter(function(r) {
        return (r.Status || '').toLowerCase() !== 'completed' && r.NextDueDate && new Date(r.NextDueDate) < now2;
      });
    } else if (_tab === 'completed') {
      list = list.filter(function(r) { return (r.Status || '').toLowerCase() === 'completed'; });
    }
    return list;
  }

  function pmStatusBadge(r) {
    if ((r.Status || '').toLowerCase() === 'completed') return { cls: 'badge-success', text: 'Completed' };
    var now = new Date();
    if (r.NextDueDate && new Date(r.NextDueDate) < now) return { cls: 'badge-danger', text: 'Overdue' };
    if (r.NextDueDate && new Date(r.NextDueDate) <= new Date(now.getTime() + 7 * 86400000)) return { cls: 'badge-warning', text: 'Due Soon' };
    return { cls: 'badge-info', text: 'Scheduled' };
  }

  function showForm(title, record) {
    var isEdit = !!record;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Machine *</label><input class="form-input" id="pm-machine" value="' + App.escHtml(record ? record.Machine : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Frequency</label><select class="form-select" id="pm-freq">' +
            '<option value="Daily"' + (record && record.Frequency === 'Daily' ? ' selected' : '') + '>Daily</option>' +
            '<option value="Weekly"' + (record && record.Frequency === 'Weekly' ? ' selected' : '') + '>Weekly</option>' +
            '<option value="Monthly"' + (!record || record.Frequency === 'Monthly' ? ' selected' : '') + '>Monthly</option>' +
            '<option value="Quarterly"' + (record && record.Frequency === 'Quarterly' ? ' selected' : '') + '>Quarterly</option>' +
            '<option value="Yearly"' + (record && record.Frequency === 'Yearly' ? ' selected' : '') + '>Yearly</option>' +
          '</select></div>' +
          '<div class="form-group"><label class="form-label">Last Completed</label><input type="date" class="form-input" id="pm-last" value="' + App.escHtml(record ? record.LastCompletedDate || record.LastCompleted : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Next Due</label><input type="date" class="form-input" id="pm-next" value="' + App.escHtml(record ? record.NextDueDate : '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Task Description *</label><textarea class="form-input" id="pm-task" rows="3">' + App.escHtml(record ? (record.TaskDescription || record.Task) : '') + '</textarea></div>' +
        '<div class="form-group"><label class="form-label">Assigned To</label><input class="form-input" id="pm-assigned" value="' + App.escHtml(record ? record.AssignedTo : '') + '"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" id="pm-save">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#pm-save').onclick = function() {
      var data = {
        Machine: document.getElementById('pm-machine').value,
        TaskDescription: document.getElementById('pm-task').value,
        Frequency: document.getElementById('pm-freq').value,
        LastCompletedDate: document.getElementById('pm-last').value,
        NextDueDate: document.getElementById('pm-next').value,
        AssignedTo: document.getElementById('pm-assigned').value
      };
      if (!data.Machine) { App.showToast('Machine is required', 'error'); return; }
      if (!data.TaskDescription) { App.showToast('Task description is required', 'error'); return; }
      var action = isEdit ? 'updatePMRecord' : 'addPMRecord';
      if (isEdit) data.id = record.PMID || record.ID;
      var btn = overlay.querySelector('#pm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call(action, data)
        .then(function() {
          overlay.remove();
          App.showToast('PM record ' + (isEdit ? 'updated' : 'created'), 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = isEdit ? 'Update' : 'Create'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
  }

  window.PMSearch = function(q) { _search = q; renderTable(); };

  window.PMTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    _tab = tab;
    renderTable();
  };

  window.PMCreate = function() { showForm('Add PM Record', null); };

  window.PMEdit = function(id) {
    var r = _records.find(function(x) { return (x.PMID || x.ID) === id; });
    if (r) showForm('Edit PM Record', r);
  };

  window.PMComplete = function(id) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" style="max-width:500px">' +
      '<div class="modal-header"><h3>Complete PM</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">Completion Date</label><input type="date" class="form-input" id="pm-complete-date"></div>' +
        '<div class="form-group"><label class="form-label">Remarks</label><textarea class="form-input" id="pm-complete-remarks" rows="2" placeholder="Work done..."></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn-success" id="pm-complete-btn">Mark Complete</button>' +
      '</div></div>';
    document.body.appendChild(overlay);

    var now = new Date();
    var dateInput = overlay.querySelector('#pm-complete-date');
    if (dateInput) dateInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    overlay.querySelector('#pm-complete-btn').onclick = function() {
      var btn = overlay.querySelector('#pm-complete-btn');
      btn.textContent = 'Saving...'; btn.disabled = true;
      API.call('completePM', { id: id, completionDate: dateInput.value, remarks: overlay.querySelector('#pm-complete-remarks').value })
        .then(function() {
          overlay.remove();
          App.showToast('PM marked as completed', 'success');
          load();
        })
        .catch(function(err) {
          btn.textContent = 'Mark Complete'; btn.disabled = false;
          App.showToast('Error: ' + err.message, 'error');
        });
    };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  };
})();
