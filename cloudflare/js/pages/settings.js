/* ============================================================
   settings.js — Settings Page Module
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  App.registerPage('settings', render, load);

  function render() {
    var el = document.getElementById('page-settings');
    var isAdmin = Auth.isAdmin();
    el.innerHTML = '' +
      '<div class="page-header"><h2>Settings</h2></div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="SettingsTab(this,\'general\')">General</button>' +
        (isAdmin ? '<button class="tab" onclick="SettingsTab(this,\'users\')">Users</button>' : '') +
        '<button class="tab" onclick="SettingsTab(this,\'profile\')">My Profile</button>' +
        (isAdmin ? '<button class="tab" onclick="SettingsTab(this,\'departments\')">Departments</button>' : '') +
        (isAdmin ? '<button class="tab" onclick="SettingsTab(this,\'sections\')">Sections</button>' : '') +
      '</div>' +
      '<div id="settings-content"></div>';
  }

  function load() { loadGeneral(); }

  function loadGeneral() {
    var el = document.getElementById('settings-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('getSettings')
      .then(function(data) {
        var settings = data || [];
        var html = '<div class="card" style="padding:24px">';
        html += '<h3 style="margin-bottom:20px">Application Settings</h3>';
        settings.forEach(function(s) {
          html += '<div class="form-group"><label class="form-label">' + App.escHtml(s.Key || s.Setting || '') + '</label>' +
            '<input class="form-input" value="' + App.escHtml(s.Value || '') + '" ' +
            (Auth.isAdmin() ? 'onchange="SettingSave(\'' + App.escHtml(s.Key || s.Setting || '') + '\',this.value)"' : 'readonly') + '></div>';
        });
        if (settings.length === 0) html += '<div class="empty-state"><div class="empty-state-text">No settings configured</div></div>';
        html += '</div>';
        el.innerHTML = html;
      })
      .catch(function(err) {
        el.innerHTML = '<div class="card" style="padding:24px"><p style="color:var(--danger)">Failed to load settings: ' + App.escHtml(err.message) + '</p></div>';
      });
  }

  function loadUsers() {
    var el = document.getElementById('settings-content');
    if (!el) return;
    el.innerHTML = '<div class="card" style="padding:24px"><div class="spinner" style="margin:40px auto"></div></div>';
    API.call('getUsers')
      .then(function(users) {
        var html = '<div class="card"><div class="table-container"><table><thead><tr><th>User ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        (users || []).forEach(function(u) {
          var sc = (u.Status || '').toLowerCase() === 'active' ? 'badge-success' : 'badge-secondary';
          html += '<tr><td>' + App.escHtml(u.UserID || '') + '</td><td>' + App.escHtml(u.Name || '') + '</td><td>' + App.escHtml(u.Email || '') + '</td><td><span class="badge badge-primary">' + App.escHtml(u.Role || '') + '</span></td><td>' + App.escHtml(u.Department || '') + '</td><td><span class="badge ' + sc + '">' + App.escHtml(u.Status || '') + '</span></td><td>-</td></tr>';
        });
        html += '</tbody></table></div></div>';
        el.innerHTML = html;
      })
      .catch(function(err) {
        el.innerHTML = '<div class="card" style="padding:24px"><p style="color:var(--danger)">' + App.escHtml(err.message) + '</p></div>';
      });
  }

  function loadProfile() {
    var user = Auth.getUser();
    if (!user) return;
    var el = document.getElementById('settings-content');
    el.innerHTML = '<div class="card" style="padding:24px;max-width:600px">' +
      '<h3 style="margin-bottom:20px">My Profile</h3>' +
      '<div class="grid grid-2">' +
        '<div><div class="form-label">Name</div><div style="font-size:14px">' + App.escHtml(user.name) + '</div></div>' +
        '<div><div class="form-label">Email</div><div style="font-size:14px">' + App.escHtml(user.email) + '</div></div>' +
        '<div><div class="form-label">Role</div><div style="font-size:14px">' + App.escHtml(user.role) + '</div></div>' +
        '<div><div class="form-label">Department</div><div style="font-size:14px">' + App.escHtml(user.department || '-') + '</div></div>' +
      '</div></div>';
  }

  window.SettingsTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    if (tab === 'general') loadGeneral();
    else if (tab === 'users') loadUsers();
    else if (tab === 'profile') loadProfile();
  };

  window.SettingSave = function(key, value) {
    API.call('saveSetting', { key: key, value: value })
      .then(function() { App.showToast('Setting saved', 'success'); })
      .catch(function(err) { App.showToast('Error: ' + err.message, 'error'); });
  };
})();
