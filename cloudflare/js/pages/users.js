/* ============================================================
   users.js — Users Management Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _users = [];
  var _filtered = [];
  var _roles = ['Administrator','Manager','Supervisor','Engineer','Technician','Operator','Viewer'];
  var _statuses = ['Active','Inactive'];

  App.registerPage('users', render, load);

  function render() {
    var el = document.getElementById('page-users');
    el.innerHTML = '' +
      '<div class="page-header"><h2>Users</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search users..." id="user-search" oninput="UsersSearch(this.value)" style="width:240px">' +
          '<button class="btn btn-primary" onclick="UsersCreate()">+ Add User</button>' +
        '</div></div>' +
      '<div class="card"><div class="table-container" id="users-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getUsers')
      .then(function(data) { _users = data || []; _filtered = _users; App.showLoading(false); renderTable(); })
      .catch(function(e) { App.showLoading(false); App.showToast('Failed to load users: ' + e.message, 'error'); });
  }

  function renderTable() {
    var el = document.getElementById('users-table');
    if (!el) return;
    if (!_filtered.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128100;</div><div class="empty-state-text">No users found</div></div>'; return; }
    var h = '<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    _filtered.forEach(function(u) {
      var sc = (u.Status||'').toLowerCase()==='active' ? 'badge-success' : 'badge-secondary';
      h += '<tr><td>'+App.escHtml(u.UserID||u.EmployeeID||'')+'</td><td>'+App.escHtml(u.Name||'')+'</td><td>'+App.escHtml(u.Email||'')+'</td><td><span class="badge badge-primary">'+App.escHtml(u.Role||'')+'</span></td><td>'+App.escHtml(u.Department||'')+'</td><td><span class="badge '+sc+'">'+App.escHtml(u.Status||'')+'</span></td><td><button class="btn btn-sm btn-secondary" onclick="UsersEdit(\''+App.escHtml(u.Email||'')+'\')">Edit</button> <button class="btn btn-sm btn-danger" onclick="UsersDelete(\''+App.escHtml(u.Email||'')+'\')">Del</button></td></tr>';
    });
    el.innerHTML = h + '</tbody></table>';
  }

  function showForm(title, user) {
    var isEdit = !!user;
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = '<div class="modal"><div class="modal-header"><h3>'+title+'</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div><div class="modal-body">' +
      '<div class="grid grid-2">' +
        fGroup('Name *','u-name',user?user.Name:'') +
        fGroup('Email','u-email',user?user.Email:'',isEdit?'readonly':'') +
        fGroup('Employee ID','u-empid',user?user.EmployeeID||user.UserID||'':'') +
        fGroup('Mobile','u-mobile',user?user.Mobile||'':'') +
        (!isEdit?fGroup('Password *','u-pass',''):fGroup('New Password (blank=no change)','u-pass','')) +
        fSelect('Role','u-role',_roles,user?user.Role:'') +
        fGroup('Department','u-dept',user?user.Department||'':'') +
        fGroup('Section','u-section',user?user.Section||'':'') +
        fGroup('Designation','u-desig',user?user.Designation||'':'') +
        fSelect('Status','u-status',_statuses,user?user.Status:'Active') +
        fGroup('Joining Date','u-joining',user?user.JoiningDate||'':'','',{type:'date'}) +
      '</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="u-save">'+(isEdit?'Update':'Create')+'</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    ov.querySelector('#u-save').onclick = function() {
      var d = {
        Name: ov.querySelector('#u-name').value,
        Email: ov.querySelector('#u-email').value,
        EmployeeID: ov.querySelector('#u-empid').value,
        Mobile: ov.querySelector('#u-mobile').value,
        Role: ov.querySelector('#u-role').value,
        Department: ov.querySelector('#u-dept').value,
        Section: ov.querySelector('#u-section').value,
        Designation: ov.querySelector('#u-desig').value,
        Status: ov.querySelector('#u-status').value,
        JoiningDate: ov.querySelector('#u-joining').value
      };
      var pw = ov.querySelector('#u-pass').value;
      if (pw) d.Password = pw;
      if (!d.Name || !d.Email) { App.showToast('Name and Email required','error'); return; }
      var btn = ov.querySelector('#u-save'); btn.textContent='Saving...'; btn.disabled=true;
      API.call(isEdit?'updateUser':'addUser', d)
        .then(function(){ ov.remove(); App.showToast('User '+(isEdit?'updated':'created'),'success'); load(); })
        .catch(function(e){ btn.textContent=isEdit?'Update':'Create'; btn.disabled=false; App.showToast('Error: '+e.message,'error'); });
    };
  }

  function fGroup(label,id,val,readonly,extra) {
    return '<div class="form-group"><label class="form-label">'+label+'</label><input class="form-input" id="'+id+'" value="'+App.escHtml(val||'')+'" '+(readonly?readonly:'')+' '+(extra&&extra.type?'type="'+extra.type+'"':'')+'></div>';
  }
  function fSelect(label,id,opts,val) {
    var h = '<div class="form-group"><label class="form-label">'+label+'</label><select class="form-select" id="'+id+'"><option value="">Select</option>';
    opts.forEach(function(o){ h+='<option value="'+o+'"'+(val===o?' selected':'')+'>'+o+'</option>'; });
    return h + '</select></div>';
  }

  window.UsersSearch = function(q) {
    q = q.toLowerCase();
    _filtered = _users.filter(function(u){ return (u.Name||'').toLowerCase().indexOf(q)>-1||(u.Email||'').toLowerCase().indexOf(q)>-1||(u.UserID||u.EmployeeID||'').toLowerCase().indexOf(q)>-1||(u.Role||'').toLowerCase().indexOf(q)>-1; });
    renderTable();
  };
  window.UsersCreate = function(){ showForm('Add User',null); };
  window.UsersEdit = function(email){
    var u = _users.find(function(x){return x.Email===email;});
    if(u) showForm('Edit User',u);
  };
  window.UsersDelete = function(email){
    App.showConfirm('Delete User','Delete user '+email+'?',function(){
      API.call('deleteUser',{email:email}).then(function(){App.showToast('User deleted','success');load();}).catch(function(e){App.showToast('Error: '+e.message,'error');});
    });
  };
})();
