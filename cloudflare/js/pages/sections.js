/* ============================================================
   sections.js — Sections Management Page Module
   Cloudflare Pages Frontend
   ============================================================ */
(function() {
  var _sections = [];
  var _filtered = [];

  App.registerPage('sections', render, load);

  function render() {
    document.getElementById('page-sections').innerHTML = '' +
      '<div class="page-header"><h2>Sections</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" class="form-input" placeholder="Search..." id="sec-search" oninput="SecSearch(this.value)" style="width:240px">' +
          (Auth.isAdmin()?'<button class="btn btn-primary" onclick="SecCreate()">+ Add Section</button>':'') +
        '</div></div>' +
      '<div class="card"><div class="table-container" id="sec-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getSectionList')
      .then(function(d){ _sections=d||[]; _filtered=_sections; App.showLoading(false); renderTable(); })
      .catch(function(e){ App.showLoading(false); App.showToast('Error: '+e.message,'error'); });
  }

  function renderTable() {
    var el = document.getElementById('sec-table');
    if (!el) return;
    if (!_filtered.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">&#128193;</div><div class="empty-state-text">No sections found</div></div>'; return; }
    var h = '<table><thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Sunday Off</th><th>Hours/Day</th><th>Status</th>'+(Auth.isAdmin()?'<th>Actions</th>':'')+'</tr></thead><tbody>';
    _filtered.forEach(function(s){
      var sc=(s.Status||'').toLowerCase()==='active'?'badge-success':'badge-secondary';
      h+='<tr><td>'+App.escHtml(s.SectionID||'')+'</td><td>'+App.escHtml(s.Section||s.SectionName||'')+'</td><td>'+App.escHtml(s.SectionCode||'')+'</td><td>'+App.escHtml(s.SundayOff||'')+'</td><td>'+App.escHtml(s.HoursPerDay||'')+'</td><td><span class="badge '+sc+'">'+App.escHtml(s.Status||'')+'</span></td>';
      if(Auth.isAdmin()) h+='<td><button class="btn btn-sm btn-secondary" onclick="SecEdit(\''+App.escHtml(s.SectionID||'')+'\')">Edit</button> <button class="btn btn-sm btn-danger" onclick="SecDelete(\''+App.escHtml(s.SectionID||'')+'\')">Del</button></td>';
      h+='</tr>';
    });
    el.innerHTML = h + '</tbody></table>';
  }

  function showForm(title, sec) {
    var isEdit = !!sec;
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = '<div class="modal"><div class="modal-header"><h3>'+title+'</h3><button class="btn-icon" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div><div class="modal-body">' +
      '<div class="grid grid-2">' +
        fg('Section Name *','s-name',sec?sec.Section||sec.SectionName:'') +
        fg('Code','s-code',sec?sec.SectionCode||'':'') +
        fg('Description','s-desc',sec?sec.Description||'':'') +
        fg('Sunday Off','s-sunday',sec?sec.SundayOff||'Sunday':'') +
        fg('Hours/Day','s-hours',sec?sec.HoursPerDay||'8':'',{type:'number'}) +
        fsel('Status','s-status',['Active','Inactive'],sec?sec.Status:'Active') +
      '</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" id="s-save">'+(isEdit?'Update':'Create')+'</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    ov.querySelector('#s-save').onclick = function() {
      var d = { Section: ov.querySelector('#s-name').value, SectionCode: ov.querySelector('#s-code').value, Description: ov.querySelector('#s-desc').value, SundayOff: ov.querySelector('#s-sunday').value, HoursPerDay: ov.querySelector('#s-hours').value, Status: ov.querySelector('#s-status').value };
      if (!d.Section) { App.showToast('Name required','error'); return; }
      var btn=ov.querySelector('#s-save'); btn.textContent='Saving...'; btn.disabled=true;
      API.call(isEdit?'modifySection':'createSection', isEdit?{id:sec.SectionID,...d}:d)
        .then(function(){ov.remove();App.showToast('Section '+(isEdit?'updated':'created'),'success');load();})
        .catch(function(e){btn.textContent=isEdit?'Update':'Create';btn.disabled=false;App.showToast('Error: '+e.message,'error');});
    };
  }

  function fg(l,id,v,ro,ex){return '<div class="form-group"><label class="form-label">'+l+'</label><input class="form-input" id="'+id+'" value="'+App.escHtml(v||'')+'" '+(ro?ro:'')+(ex&&ex.type?' type="'+ex.type+'"':'')+'></div>';}
  function fsel(l,id,o,v){var h='<div class="form-group"><label class="form-label">'+l+'</label><select class="form-select" id="'+id+'"><option value="">Select</option>';o.forEach(function(x){h+='<option value="'+x+'"'+(v===x?' selected':'')+'>'+x+'</option>';});return h+'</select>';}

  window.SecSearch = function(q){ q=q.toLowerCase(); _filtered=_sections.filter(function(s){return(s.Section||s.SectionName||'').toLowerCase().indexOf(q)>-1;}); renderTable(); };
  window.SecCreate = function(){showForm('Add Section',null);};
  window.SecEdit = function(id){var s=_sections.find(function(x){return x.SectionID===id;});if(s)showForm('Edit Section',s);};
  window.SecDelete = function(id){App.showConfirm('Delete','Delete section?',function(){API.call('removeSection',{id:id}).then(function(){App.showToast('Deleted','success');load();}).catch(function(e){App.showToast('Error: '+e.message,'error');});});};
})();
