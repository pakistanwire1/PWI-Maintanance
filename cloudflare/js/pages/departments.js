/* ============================================================
   departments.js — Departments Management Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _depts = [];
  var _filtered = [];

  App.registerPage('departments', render, load);

  function render() {
    document.getElementById('page-departments').innerHTML = '' +
      '<div class="page-header"><h2>Departments</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search..." id="dept-search" oninput="DeptSearch(this.value)" style="width:240px">' +
          (Auth.isAdmin()?'<button class="btn btn-primary" onclick="DeptCreate()">+ Add Department</button>':'') +
        '</div></div>' +
      '<div class="card"><div class="table-container" id="dept-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getDepartmentList')
      .then(function(d){ _depts=d||[]; _filtered=_depts; App.showLoading(false); renderTable(); })
      .catch(function(e){ App.showLoading(false); App.showToast('Error: '+e.message,'error'); });
  }

  function renderTable() {
    var el = document.getElementById('dept-table');
    if (!el) return;
    if (!_filtered.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#128193;</div><div class="empty-state-text">No departments found</div></div>'; return; }
    var h = '<table><thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Head</th><th>Sunday Off</th><th>Hours/Day</th><th>Status</th>'+(Auth.isAdmin()?'<th>Actions</th>':'')+'</tr></thead><tbody>';
    _filtered.forEach(function(d){
      var sc=(d.Status||'').toLowerCase()==='active'?'badge-success':'badge-secondary';
      h+='<tr><td>'+App.escHtml(d.DepartmentID||'')+'</td><td>'+App.escHtml(d.Department||d.DepartmentName||'')+'</td><td>'+App.escHtml(d.DepartmentCode||'')+'</td><td>'+App.escHtml(d.DepartmentHead||'')+'</td><td>'+App.escHtml(d.SundayOff||'')+'</td><td>'+App.escHtml(d.HoursPerDay||'')+'</td><td><span class="badge '+sc+'">'+App.escHtml(d.Status||'')+'</span></td>';
      if(Auth.isAdmin()) h+='<td><button class="btn btn-sm btn-secondary" onclick="DeptEdit(\''+App.escHtml(d.DepartmentID||'')+'\')">Edit</button> <button class="btn btn-sm btn-danger" onclick="DeptDelete(\''+App.escHtml(d.DepartmentID||'')+'\')">Del</button></td>';
      h+='</tr>';
    });
    el.innerHTML = h + '</tbody></table>';
  }

  function showForm(title, dept) {
    var isEdit = !!dept;
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = '<div class="modal"><div class="modal-header"><h3>'+title+'</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div><div class="modal-body">' +
      '<div class="grid grid-2">' +
        fg('Department Name *','d-name',dept?dept.Department||dept.DepartmentName:'') +
        fg('Code','d-code',dept?dept.DepartmentCode||'':'') +
        fg('Head','d-head',dept?dept.DepartmentHead||'':'') +
        fg('Description','d-desc',dept?dept.Description||'':'') +
        fg('Sunday Off','d-sunday',dept?dept.SundayOff||'Sunday':'') +
        fg('Hours/Day','d-hours',dept?dept.HoursPerDay||'8':'',{type:'number'}) +
        fsel('Status','d-status',['Active','Inactive'],dept?dept.Status:'Active') +
      '</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="d-save">'+(isEdit?'Update':'Create')+'</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    ov.querySelector('#d-save').onclick = function() {
      var d = { Department: ov.querySelector('#d-name').value, DepartmentCode: ov.querySelector('#d-code').value, DepartmentHead: ov.querySelector('#d-head').value, Description: ov.querySelector('#d-desc').value, SundayOff: ov.querySelector('#d-sunday').value, HoursPerDay: ov.querySelector('#d-hours').value, Status: ov.querySelector('#d-status').value };
      if (!d.Department) { App.showToast('Name required','error'); return; }
      var btn=ov.querySelector('#d-save'); btn.textContent='Saving...'; btn.disabled=true;
      API.call(isEdit?'modifyDepartment':'createDepartment', isEdit?{id:dept.DepartmentID,...d}:d)
        .then(function(){ov.remove();App.showToast('Department '+(isEdit?'updated':'created'),'success');load();})
        .catch(function(e){btn.textContent=isEdit?'Update':'Create';btn.disabled=false;App.showToast('Error: '+e.message,'error');});
    };
  }

  function fg(l,id,v,ro,ex){return '<div class="form-group"><label class="form-label">'+l+'</label><input class="form-input" id="'+id+'" value="'+App.escHtml(v||'')+'" '+(ro?ro:'')+(ex&&ex.type?' type="'+ex.type+'"':'')+'></div>';}
  function fsel(l,id,o,v){var h='<div class="form-group"><label class="form-label">'+l+'</label><select class="form-select" id="'+id+'"><option value="">Select</option>';o.forEach(function(x){h+='<option value="'+x+'"'+(v===x?' selected':'')+'>'+x+'</option>';});return h+'</select>';}

  window.DeptSearch = function(q){ q=q.toLowerCase(); _filtered=_depts.filter(function(d){return(d.Department||d.DepartmentName||'').toLowerCase().indexOf(q)>-1||(d.DepartmentID||'').toLowerCase().indexOf(q)>-1;}); renderTable(); };
  window.DeptCreate = function(){showForm('Add Department',null);};
  window.DeptEdit = function(id){var d=_depts.find(function(x){return x.DepartmentID===id;});if(d)showForm('Edit Department',d);};
  window.DeptDelete = function(id){App.showConfirm('Delete','Delete department?',function(){API.call('removeDepartment',{id:id}).then(function(){App.showToast('Deleted','success');load();}).catch(function(e){App.showToast('Error: '+e.message,'error');});});};
})();
