(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _state={page:1,perPage:25,search:'',editId:null};

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>Technician Master</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="techSearch" placeholder="Search technicians..." />',
          '</div>',
          '<button class="btn btn-primary" id="btnAddTech">'+u.icons.plus+' Add Technician</button>',
        '</div>',
      '</div>',
      '<div id="techTable" class="table-container"></div>',
      '<div id="techModal" class="modal-overlay" style="display:none;">',
        '<div class="modal">',
          '<div class="modal-header">',
            '<h3 id="techModalTitle">Add Technician</h3>',
            '<button class="modal-close" id="btnCloseTechModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="techForm" autocomplete="off">',
              '<input type="hidden" id="tTechId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Employee ID <span class="req">*</span></label>',
                  '<input type="text" id="tEmployeeId" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Technician Name <span class="req">*</span></label>',
                  '<input type="text" id="tName" required />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Skill <span class="req">*</span></label>',
                  '<select id="tSkill" required>',
                    '<option value="">Select</option>',
                    '<option value="Mechanical">Mechanical</option>',
                    '<option value="Electrical">Electrical</option>',
                    '<option value="PLC">PLC</option>',
                    '<option value="Hydraulic">Hydraulic</option>',
                    '<option value="Pneumatic">Pneumatic</option>',
                    '<option value="Utility">Utility</option>',
                    '<option value="Instrumentation">Instrumentation</option>',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Shift <span class="req">*</span></label>',
                  '<select id="tShift" required>',
                    '<option value="">Select</option>',
                    '<option value="General">General</option>',
                    '<option value="A">A</option>',
                    '<option value="B">B</option>',
                    '<option value="C">C</option>',
                  '</select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Status <span class="req">*</span></label>',
                  '<select id="tStatus" required>',
                    '<option value="Active">Active</option>',
                    '<option value="Inactive">Inactive</option>',
                  '</select>',
                '</div>',
                '<div class="form-group"></div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelTech">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveTech">Save</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    bindEvents();
  }

  function bindEvents(){
    u.$('#btnAddTech').addEventListener('click',function(){
      _state.editId=null;
      u.resetForm(u.$('#techForm'));
      u.$('#techModalTitle').textContent='Add Technician';
      u.$('#techModal').style.display='flex';
    });
    u.$('#btnCloseTechModal').addEventListener('click',function(){
      u.$('#techModal').style.display='none';
    });
    u.$('#btnCancelTech').addEventListener('click',function(){
      u.$('#techModal').style.display='none';
    });
    u.$('#btnSaveTech').addEventListener('click',function(){
      saveTech();
    });
    var searchInput=u.$('#techSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      load();
    },400));
    u.$('#techTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editTech(id);
      else if(btn.dataset.action==='delete')deleteTech(id);
    });
  }

  function load(){
    u.showLoading(true);
    var params={};
    if(_state.search)params.Search=_state.search;
    C.api.call('getTechnicians',params).then(function(data){
      _data=data||[];
      render();
    }).catch(function(){
      _data=[];
      render();
    }).finally(function(){u.showLoading(false);});
  }

  function render(){
    var rows=[];
    for(var i=0;i<_data.length;i++){
      var t=_data[i];
      rows.push(
        '<tr data-id="'+(t.TechnicianID||t.EmployeeID)+'">',
          '<td>'+u.escHtml(t.EmployeeID)+'</td>',
          '<td>'+u.escHtml(t.TechnicianName||t.Name||'')+'</td>',
          '<td>'+u.badge(t.Skill||'','info')+'</td>',
          '<td>'+u.escHtml(t.Shift||'')+'</td>',
          '<td>'+u.statusBadge(t.Status)+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#techTable'),{
      headers:['Employee ID','Name','Skill','Shift','Status','Actions'],
      rows:rows,
      emptyMsg:'No technicians found'
    });
  }

  function getFormData(){
    return{
      EmployeeID:u.getVal('#tEmployeeId'),
      TechnicianName:u.getVal('#tName'),
      Skill:u.getVal('#tSkill'),
      Shift:u.getVal('#tShift'),
      Status:u.getVal('#tStatus')
    };
  }

  function saveTech(){
    var d=getFormData();
    if(!d.EmployeeID||!d.TechnicianName||!d.Skill||!d.Shift||!d.Status){
      u.showToast('Please fill all required fields','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'updateTechnician':'addTechnician';
    if(_state.editId)d.TechnicianID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('Technician saved successfully','success');
      u.$('#techModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving technician: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editTech(id){
    var t=null;
    for(var i=0;i<_data.length;i++){
      var tid=_data[i].TechnicianID||_data[i].EmployeeID;
      if(tid===id){t=_data[i];break;}
    }
    if(!t)return;
    _state.editId=id;
    u.$('#techModalTitle').textContent='Edit Technician';
    u.$('#tTechId').value=t.TechnicianID||'';
    u.$('#tEmployeeId').value=t.EmployeeID||'';
    u.$('#tName').value=t.TechnicianName||t.Name||'';
    u.$('#tSkill').value=t.Skill||'';
    u.$('#tShift').value=t.Shift||'';
    u.$('#tStatus').value=t.Status||'Active';
    u.$('#techModal').style.display='flex';
  }

  function deleteTech(id){
    u.showConfirm('Are you sure you want to delete this technician?',function(){
      u.showLoading(true);
      C.api.call('deleteTechnician',{TechnicianID:id}).then(function(){
        u.showToast('Technician deleted','success');
        load();
      }).catch(function(e){
        u.showToast('Error deleting: '+(e.message||e),'error');
        u.showLoading(false);
      });
    });
  }

  function destroy(){
    _data=[];
    _state={page:1,perPage:25,search:'',editId:null};
  }

  C.router.registerPage('technicians',{
    title:'Technician Master',
    init:init,
    load:load,
    destroy:destroy
  });
})();
