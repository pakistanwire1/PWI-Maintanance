(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _templates=[];
  var _checklists=[];
  var _state={tab:'templates',search:'',editId:null};

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>Checklists</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="clSearch" placeholder="Search..." />',
          '</div>',
        '</div>',
      '</div>',
      '<div class="tab-bar" id="clTabs">',
        '<button class="tab active" data-tab="templates">'+u.icons.view+' Templates</button>',
        '<button class="tab" data-tab="checklists">'+u.icons.view+' Checklists</button>',
      '</div>',
      '<div id="clToolbar" class="tab-toolbar"></div>',
      '<div id="clTable" class="table-container"></div>',
      '<div id="clModal" class="modal-overlay" style="display:none;">',
        '<div class="modal modal-lg">',
          '<div class="modal-header">',
            '<h3 id="clModalTitle">Add Template</h3>',
            '<button class="modal-close" id="btnCloseClModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="clForm" autocomplete="off">',
              '<input type="hidden" id="clTemplateId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Template Name <span class="req">*</span></label>',
                  '<input type="text" id="clName" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Category <span class="req">*</span></label>',
                  '<select id="clCategory" required>',
                    '<option value="">Select</option>',
                    '<option value="Mechanical">Mechanical</option>',
                    '<option value="Electrical">Electrical</option>',
                    '<option value="Hydraulic">Hydraulic</option>',
                    '<option value="Pneumatic">Pneumatic</option>',
                    '<option value="Safety">Safety</option>',
                    '<option value="Quality">Quality</option>',
                    '<option value="Daily">Daily</option>',
                    '<option value="Weekly">Weekly</option>',
                    '<option value="Monthly">Monthly</option>',
                  '</select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group full-width">',
                  '<label>Description</label>',
                  '<textarea id="clDescription" rows="2"></textarea>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group full-width">',
                  '<label>Items <span class="req">*</span> <small>(one item per line)</small></label>',
                  '<textarea id="clItems" rows="10" required placeholder="Enter checklist items, one per line...&#10;Example:&#10;Check lubrication levels&#10;Inspect belt tension&#10;Verify alignment&#10;Test emergency stop"></textarea>',
                '</div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelCl">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveCl">Save</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    bindEvents();
  }

  function bindEvents(){
    u.$('#clTabs').addEventListener('click',function(e){
      var tab=e.target.closest('[data-tab]');
      if(!tab)return;
      var t=tab.dataset.tab;
      _state.tab=t;
      var tabs=u.$$('#clTabs .tab');
      for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].dataset.tab===t);
      updateToolbar();
      render();
    });
    u.$('#btnCloseClModal').addEventListener('click',function(){
      u.$('#clModal').style.display='none';
    });
    u.$('#btnCancelCl').addEventListener('click',function(){
      u.$('#clModal').style.display='none';
    });
    u.$('#btnSaveCl').addEventListener('click',function(){
      saveTemplate();
    });
    var searchInput=u.$('#clSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      render();
    },400));
    u.$('#clTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editTemplate(id);
      else if(btn.dataset.action==='delete')deleteTemplate(id);
    });
  }

  function updateToolbar(){
    var tb=u.$('#clToolbar');
    if(_state.tab==='templates'){
      tb.innerHTML='<button class="btn btn-primary" id="btnAddCl">'+u.icons.plus+' Add Template</button>';
      u.$('#btnAddCl').addEventListener('click',function(){
        _state.editId=null;
        u.resetForm(u.$('#clForm'));
        u.$('#clModalTitle').textContent='Add Template';
        u.$('#clModal').style.display='flex';
      });
    }else{
      tb.innerHTML='';
    }
  }

  function load(){
    u.showLoading(true);
    Promise.all([
      C.api.call('getChecklistTemplates').catch(function(){return[];}),
      C.api.call('getChecklists').catch(function(){return[];})
    ]).then(function(res){
      _templates=res[0]||[];
      _checklists=res[1]||[];
      updateToolbar();
      render();
    }).catch(function(){
      _templates=[];
      _checklists=[];
      updateToolbar();
      render();
    }).finally(function(){u.showLoading(false);});
  }

  function render(){
    if(_state.tab==='templates')renderTemplates();
    else renderChecklists();
  }

  function renderTemplates(){
    var data=_templates;
    if(_state.search){
      var q=_state.search.toLowerCase();
      data=data.filter(function(t){
        return (t.TemplateName||'').toLowerCase().indexOf(q)!==-1||
               (t.Category||'').toLowerCase().indexOf(q)!==-1;
      });
    }
    var rows=[];
    for(var i=0;i<data.length;i++){
      var t=data[i];
      var items=t.Items||'';
      var itemLines=items.split('\n');
      var itemCount=itemLines.filter(function(l){return l.trim();}).length;
      var itemsPreview=items.substring(0,80)+(items.length>80?'...':'');
      rows.push(
        '<tr data-id="'+t.TemplateID+'">',
          '<td>'+u.escHtml(t.TemplateID)+'</td>',
          '<td>'+u.escHtml(t.TemplateName)+'</td>',
          '<td>'+u.badge(t.Category||'','info')+'</td>',
          '<td><span class="items-preview" title="'+u.escHtml(items)+'">'+itemCount+' items</span></td>',
          '<td>'+u.escHtml(t.CreatedAt||t.Created||'-')+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#clTable'),{
      headers:['ID','Template Name','Category','Items','Created','Actions'],
      rows:rows,
      emptyMsg:'No templates found'
    });
  }

  function renderChecklists(){
    var data=_checklists;
    if(_state.search){
      var q=_state.search.toLowerCase();
      data=data.filter(function(c){
        return (c.TemplateName||c.Name||'').toLowerCase().indexOf(q)!==-1||
               (c.MachineName||'').toLowerCase().indexOf(q)!==-1||
               (c.Status||'').toLowerCase().indexOf(q)!==-1;
      });
    }
    var rows=[];
    for(var i=0;i<data.length;i++){
      var c=data[i];
      rows.push(
        '<tr data-id="'+c.ChecklistID+'">',
          '<td>'+u.escHtml(c.ChecklistID)+'</td>',
          '<td>'+u.escHtml(c.TemplateName||c.Name||'')+'</td>',
          '<td>'+u.escHtml(c.MachineName||c.Machine||'-')+'</td>',
          '<td>'+u.escHtml(c.AssignedTo||c.Technician||'-')+'</td>',
          '<td>'+u.escHtml(c.ScheduleDate||c.Date||'-')+'</td>',
          '<td>'+u.statusBadge(c.Status||'Pending')+'</td>',
          '<td>'+u.escHtml(c.CompletionPct!=null?(c.CompletionPct+'%'):'-')+'</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#clTable'),{
      headers:['ID','Template','Machine','Assigned To','Date','Status','Progress'],
      rows:rows,
      emptyMsg:'No checklists found'
    });
  }

  function getFormData(){
    return{
      TemplateName:u.getVal('#clName'),
      Category:u.getVal('#clCategory'),
      Description:u.getVal('#clDescription'),
      Items:u.getVal('#clItems')
    };
  }

  function saveTemplate(){
    var d=getFormData();
    if(!d.TemplateName||!d.Category||!d.Items){
      u.showToast('Please fill all required fields','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'updateChecklistTemplate':'addChecklistTemplate';
    if(_state.editId)d.TemplateID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('Template saved successfully','success');
      u.$('#clModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving template: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editTemplate(id){
    var t=null;
    for(var i=0;i<_templates.length;i++){
      if(_templates[i].TemplateID===id){t=_templates[i];break;}
    }
    if(!t)return;
    _state.editId=id;
    u.$('#clModalTitle').textContent='Edit Template';
    u.$('#clTemplateId').value=t.TemplateID;
    u.$('#clName').value=t.TemplateName||'';
    u.$('#clCategory').value=t.Category||'';
    u.$('#clDescription').value=t.Description||'';
    u.$('#clItems').value=t.Items||'';
    u.$('#clModal').style.display='flex';
  }

  function deleteTemplate(id){
    u.showConfirm('Delete this checklist template?',function(){
      u.showLoading(true);
      C.api.call('deleteChecklistTemplate',{TemplateID:id}).then(function(){
        u.showToast('Template deleted','success');
        load();
      }).catch(function(e){
        u.showToast('Error deleting: '+(e.message||e),'error');
        u.showLoading(false);
      });
    });
  }

  function destroy(){
    _templates=[];
    _checklists=[];
    _state={tab:'templates',search:'',editId:null};
  }

  C.router.registerPage('checklists',{
    title:'Checklists',
    init:init,
    load:load,
    destroy:destroy
  });
})();
