(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _sections=[];
  var _state={page:1,perPage:25,search:'',editId:null};

  var _days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>Department Master</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="deptSearch" placeholder="Search departments..." />',
          '</div>',
          '<button class="btn btn-primary" id="btnAddDept">'+u.icons.plus+' Add Department</button>',
        '</div>',
      '</div>',
      '<div id="deptTable" class="table-container"></div>',
      '<div id="deptModal" class="modal-overlay" style="display:none;">',
        '<div class="modal">',
          '<div class="modal-header">',
            '<h3 id="deptModalTitle">Add Department</h3>',
            '<button class="modal-close" id="btnCloseDeptModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="deptForm" autocomplete="off">',
              '<input type="hidden" id="dDeptId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Department Name <span class="req">*</span></label>',
                  '<input type="text" id="dDepartment" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Department Code <span class="req">*</span></label>',
                  '<input type="text" id="dDeptCode" required />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Section</label>',
                  '<select id="dSectionId"><option value="">Select</option></select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Department Head</label>',
                  '<input type="text" id="dDeptHead" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group full-width">',
                  '<label>Description</label>',
                  '<textarea id="dDescription" rows="3"></textarea>',
                '</div>',
              </div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Sunday Off</label>',
                  '<select id="dSundayOff">',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Hours Per Day</label>',
                  '<input type="number" id="dHoursPerDay" value="8" min="1" max="24" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Status <span class="req">*</span></label>',
                  '<select id="dStatus" required>',
                    '<option value="Active">Active</option>',
                    '<option value="Inactive">Inactive</option>',
                  '</select>',
                '</div>',
                '<div class="form-group"></div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelDept">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveDept">Save</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    populateDays();
    bindEvents();
  }

  function populateDays(){
    var sel=u.$('#dSundayOff');
    var html='';
    for(var i=0;i<_days.length;i++){
      html+='<option value="'+_days[i]+'"'+(_days[i]==='Sunday'?' selected':'')+'>'+_days[i]+'</option>';
    }
    sel.innerHTML=html;
  }

  function bindEvents(){
    u.$('#btnAddDept').addEventListener('click',function(){
      _state.editId=null;
      u.resetForm(u.$('#deptForm'));
      u.$('#dHoursPerDay').value='8';
      u.$('#dSundayOff').value='Sunday';
      u.$('#deptModalTitle').textContent='Add Department';
      u.$('#deptModal').style.display='flex';
    });
    u.$('#btnCloseDeptModal').addEventListener('click',function(){
      u.$('#deptModal').style.display='none';
    });
    u.$('#btnCancelDept').addEventListener('click',function(){
      u.$('#deptModal').style.display='none';
    });
    u.$('#btnSaveDept').addEventListener('click',function(){
      saveDept();
    });
    var searchInput=u.$('#deptSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      load();
    },400));
    u.$('#deptTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editDept(id);
      else if(btn.dataset.action==='delete')deleteDept(id);
    });
  }

  function loadSections(){
    return C.api.call('getSectionList').then(function(d){
      _sections=d||[];
      u.populateSelect(u.$('#dSectionId'),_sections,'SectionID','Section');
    }).catch(function(){_sections=[];});
  }

  function load(){
    u.showLoading(true);
    var params={};
    if(_state.search)params.Search=_state.search;
    C.api.call('getDepartmentList',params).then(function(data){
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
      var d=_data[i];
      rows.push(
        '<tr data-id="'+d.DeptID+'">',
          '<td>'+u.escHtml(d.DeptID)+'</td>',
          '<td>'+u.escHtml(d.Department)+'</td>',
          '<td>'+u.escHtml(d.DepartmentCode||d.DeptCode||'')+'</td>',
          '<td>'+u.escHtml(d.Section||d.SectionName||'-')+'</td>',
          '<td>'+u.escHtml(d.DepartmentHead||d.DeptHead||'-')+'</td>',
          '<td>'+u.escHtml(d.HoursPerDay||8)+'</td>',
          '<td>'+u.statusBadge(d.Status)+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#deptTable'),{
      headers:['ID','Department','Code','Section','Head','Hrs/Day','Status','Actions'],
      rows:rows,
      emptyMsg:'No departments found'
    });
  }

  function getFormData(){
    return{
      Department:u.getVal('#dDepartment'),
      DepartmentCode:u.getVal('#dDeptCode'),
      SectionID:u.getVal('#dSectionId'),
      DepartmentHead:u.getVal('#dDeptHead'),
      Description:u.getVal('#dDescription'),
      SundayOff:u.getVal('#dSundayOff'),
      HoursPerDay:parseInt(u.getVal('#dHoursPerDay'))||8,
      Status:u.getVal('#dStatus')
    };
  }

  function saveDept(){
    var d=getFormData();
    if(!d.Department||!d.DepartmentCode||!d.Status){
      u.showToast('Please fill all required fields','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'modifyDepartment':'createDepartment';
    if(_state.editId)d.DeptID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('Department saved successfully','success');
      u.$('#deptModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving department: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editDept(id){
    var d=null;
    for(var i=0;i<_data.length;i++){
      if(_data[i].DeptID===id){d=_data[i];break;}
    }
    if(!d)return;
    _state.editId=id;
    u.$('#deptModalTitle').textContent='Edit Department';
    u.$('#dDeptId').value=d.DeptID;
    u.$('#dDepartment').value=d.Department||'';
    u.$('#dDeptCode').value=d.DepartmentCode||d.DeptCode||'';
    u.$('#dDeptHead').value=d.DepartmentHead||d.DeptHead||'';
    u.$('#dDescription').value=d.Description||'';
    u.$('#dSundayOff').value=d.SundayOff||'Sunday';
    u.$('#dHoursPerDay').value=d.HoursPerDay||8;
    u.$('#dStatus').value=d.Status||'Active';
    u.$('#dSectionId').value=d.SectionID||'';
    u.$('#deptModal').style.display='flex';
  }

  function deleteDept(id){
    u.showConfirm('Are you sure you want to delete this department?',function(){
      u.showLoading(true);
      C.api.call('removeDepartment',{DeptID:id}).then(function(){
        u.showToast('Department deleted','success');
        load();
      }).catch(function(e){
        u.showToast('Error deleting: '+(e.message||e),'error');
        u.showLoading(false);
      });
    });
  }

  function destroy(){
    _data=[];
    _sections=[];
    _state={page:1,perPage:25,search:'',editId:null};
  }

  C.router.registerPage('departments',{
    title:'Department Master',
    init:init,
    load:function(){loadSections().then(function(){load();});},
    destroy:destroy
  });
})();
