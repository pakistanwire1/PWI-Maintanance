(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _state={page:1,perPage:25,search:'',editId:null};

  var _perms=[
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
    'CanReviewPendingJobCard','CanViewAllJobCards','CanBackupRestore',
    'CanManageMachines','CanManageAssets','CanManageSpareParts','CanManagePM',
    'CanManageTechnicians','CanManageDepartments','CanManageSections',
    'CanManageUsers','CanViewDashboard','CanViewReports','CanManageInventory',
    'IsAdmin','CanManageBreakdown','CanExportReports','CanManageSettings',
    'CanViewAudit','CanManageQR','CanManageEmail','CanManageWhatsApp',
    'CanSystemConfig'
  ];

  var _permLabels={
    CanOpenJobCard:'Open Job Card',CanStartJobCard:'Start Job Card',CanCloseJobCard:'Close Job Card',
    CanApproveJobCard:'Approve Job Card',CanReviewPendingJobCard:'Review Pending Job Cards',
    CanViewAllJobCards:'View All Job Cards',CanBackupRestore:'Backup/Restore',
    CanManageMachines:'Manage Machines',CanManageAssets:'Manage Assets',
    CanManageSpareParts:'Manage Spare Parts',CanManagePM:'Manage PM',
    CanManageTechnicians:'Manage Technicians',CanManageDepartments:'Manage Departments',
    CanManageSections:'Manage Sections',CanManageUsers:'Manage Users',
    CanViewDashboard:'View Dashboard',CanViewReports:'View Reports',
    CanManageInventory:'Manage Inventory',IsAdmin:'Administrator',
    CanManageBreakdown:'Manage Breakdown',CanExportReports:'Export Reports',
    CanManageSettings:'Manage Settings',CanViewAudit:'View Audit',
    CanManageQR:'Manage QR',CanManageEmail:'Manage Email',
    CanManageWhatsApp:'Manage WhatsApp',CanSystemConfig:'System Config'
  };

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>User Management</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="userSearch" placeholder="Search users..." />',
          '</div>',
          '<button class="btn btn-secondary" id="btnExportUsers">'+u.icons.plus+' Export</button>',
          '<button class="btn btn-primary" id="btnAddUser">'+u.icons.plus+' Add User</button>',
        '</div>',
      '</div>',
      '<div id="userTable" class="table-container"></div>',
      '<div id="userModal" class="modal-overlay" style="display:none;">',
        '<div class="modal modal-lg">',
          '<div class="modal-header">',
            '<h3 id="userModalTitle">Add User</h3>',
            '<button class="modal-close" id="btnCloseUserModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="userForm" autocomplete="off">',
              '<input type="hidden" id="uUserId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Employee ID <span class="req">*</span></label>',
                  '<input type="text" id="uEmployeeId" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Name <span class="req">*</span></label>',
                  '<input type="text" id="uName" required />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Email <span class="req">*</span></label>',
                  '<input type="email" id="uEmail" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Password</label>',
                  '<input type="password" id="uPassword" '+( (_state.editId)?'placeholder="Leave blank to keep current"':'required' )+' />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Mobile</label>',
                  '<input type="text" id="uMobile" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Designation</label>',
                  '<input type="text" id="uDesignation" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Department</label>',
                  '<select id="uDeptId"><option value="">Select</option></select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Section</label>',
                  '<select id="uSectionId"><option value="">Select</option></select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Role <span class="req">*</span></label>',
                  '<select id="uRole" required>',
                    '<option value="">Select</option>',
                    '<option value="Administrator">Administrator</option>',
                    '<option value="Manager">Manager</option>',
                    '<option value="Supervisor">Supervisor</option>',
                    '<option value="Engineer">Engineer</option>',
                    '<option value="Technician">Technician</option>',
                    '<option value="Operator">Operator</option>',
                    '<option value="Viewer">Viewer</option>',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Joining Date</label>',
                  '<input type="date" id="uJoiningDate" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Status <span class="req">*</span></label>',
                  '<select id="uStatus" required>',
                    '<option value="Active">Active</option>',
                    '<option value="Inactive">Inactive</option>',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Photo</label>',
                  '<input type="file" id="uPhoto" accept="image/*" />',
                  '<img id="uPhotoPreview" style="display:none;width:60px;height:60px;border-radius:50%;margin-top:5px;" />',
                '</div>',
              '</div>',
              '<div class="permissions-section">',
                '<h4>Permissions</h4>',
                '<div class="form-row">',
                  '<div class="form-group full-width">',
                    '<label class="checkbox-label"><input type="checkbox" id="uIsAdminPerm" /> Grant All Permissions (Admin)</label>',
                  '</div>',
                '</div>',
                '<div class="permissions-grid" id="permissionsGrid">',
                '</div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelUser">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveUser">Save</button>',
          '</div>',
        '</div>',
      '</div>',
      '<div id="resetPasswordModal" class="modal-overlay" style="display:none;">',
        '<div class="modal">',
          '<div class="modal-header">',
            '<h3>Reset Password</h3>',
            '<button class="modal-close" id="btnCloseResetModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<input type="hidden" id="rpUserId" />',
            '<div class="form-group">',
              '<label>Temporary Password</label>',
              '<input type="text" id="rpTempPassword" value="" />',
              '<button class="btn btn-sm" id="btnGenTempPw" style="margin-top:5px;">Generate</button>',
            '</div>',
            '<div class="form-group">',
              '<label class="checkbox-label"><input type="checkbox" id="rpForceChange" checked /> Force password change on login</label>',
            '</div>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelReset">Cancel</button>',
            '<button class="btn btn-primary" id="btnDoReset">Reset</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    renderPermGrid();
    bindEvents();
  }

  function renderPermGrid(){
    var grid=u.$('#permissionsGrid');
    var html='';
    for(var i=0;i<_perms.length;i++){
      html+='<div class="perm-item"><label class="checkbox-label"><input type="checkbox" class="perm-cb" data-perm="'+_perms[i]+'" /> '+u.escHtml(_permLabels[_perms[i]])+'</label></div>';
    }
    grid.innerHTML=html;
  }

  function setAllPerms(val){
    var cbs=u.$$('.perm-cb');
    for(var i=0;i<cbs.length;i++)cbs[i].checked=val;
  }

  function getPermValues(){
    var result={};
    var cbs=u.$$('.perm-cb');
    for(var i=0;i<cbs.length;i++){
      result[cbs[i].dataset.perm]=cbs[i].checked;
    }
    return result;
  }

  function setPermValues(perms){
    var cbs=u.$$('.perm-cb');
    for(var i=0;i<cbs.length;i++){
      cbs[i].checked=!!perms[cbs[i].dataset.perm];
    }
  }

  function bindEvents(){
    u.$('#btnAddUser').addEventListener('click',function(){
      _state.editId=null;
      u.resetForm(u.$('#userForm'));
      u.$('#uPassword').required=true;
      u.$('#uPassword').placeholder='';
      u.$('#userModalTitle').textContent='Add User';
      u.$('#uPhotoPreview').style.display='none';
      setAllPerms(false);
      u.$('#uIsAdminPerm').checked=false;
      u.$('#userModal').style.display='flex';
    });
    u.$('#btnCloseUserModal').addEventListener('click',function(){
      u.$('#userModal').style.display='none';
    });
    u.$('#btnCancelUser').addEventListener('click',function(){
      u.$('#userModal').style.display='none';
    });
    u.$('#uIsAdminPerm').addEventListener('change',function(){
      setAllPerms(this.checked);
    });
    u.$('#uDeptId').addEventListener('change',function(){
      loadSections(this.value);
    });
    u.$('#uPhoto').addEventListener('change',function(e){
      var file=e.target.files[0];
      if(!file)return;
      var reader=new FileReader();
      reader.onload=function(ev){
        u.$('#uPhotoPreview').src=ev.target.result;
        u.$('#uPhotoPreview').style.display='block';
      };
      reader.readAsDataURL(file);
    });
    u.$('#btnSaveUser').addEventListener('click',function(){
      saveUser();
    });
    u.$('#btnExportUsers').addEventListener('click',function(){
      C.api.call('exportUsersToExcel').then(function(r){
        if(r&&r.url){window.open(r.url,'_blank');}
        else{u.showToast('Export complete','success');}
      }).catch(function(e){u.showToast('Export failed','error');});
    });
    var searchInput=u.$('#userSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      load();
    },400));
    u.$('#userTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editUser(id);
      else if(btn.dataset.action==='delete')deleteUser(id);
      else if(btn.dataset.action==='reset')openResetModal(id);
    });
    u.$('#btnCloseResetModal').addEventListener('click',function(){
      u.$('#resetPasswordModal').style.display='none';
    });
    u.$('#btnCancelReset').addEventListener('click',function(){
      u.$('#resetPasswordModal').style.display='none';
    });
    u.$('#btnGenTempPw').addEventListener('click',function(){
      var chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      var pw='';
      for(var i=0;i<10;i++)pw+=chars.charAt(Math.floor(Math.random()*chars.length));
      u.$('#rpTempPassword').value=pw;
    });
    u.$('#btnDoReset').addEventListener('click',function(){
      doResetPassword();
    });
  }

  function loadMeta(){
    return C.api.call('getUserDepartments').then(function(d){
      u.populateSelect(u.$('#uDeptId'),d||[],'DeptID','Department');
    }).catch(function(){});
  }

  function loadSections(deptId){
    var sel=u.$('#uSectionId');
    sel.innerHTML='<option value="">Select</option>';
    if(!deptId)return;
    C.api.call('getUserSections',{DeptID:deptId}).then(function(d){
      u.populateSelect(sel,d||[],'SectionID','Section');
    }).catch(function(){});
  }

  function load(){
    u.showLoading(true);
    var params={};
    if(_state.search)params.Search=_state.search;
    C.api.call('getUsers',params).then(function(data){
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
      var u2=_data[i];
      var photoHtml=u2.Photo?'<img src="'+u2.Photo+'" class="user-avatar-sm" />':'<div class="user-avatar-placeholder">'+u.escHtml((u2.Name||'?')[0])+'</div>';
      rows.push(
        '<tr data-id="'+u2.UserID+'">',
          '<td>'+u.escHtml(u2.UserID)+'</td>',
          '<td>'+u.escHtml(u2.EmployeeID)+'</td>',
          '<td><div class="user-cell">'+photoHtml+'<span>'+u.escHtml(u2.Name)+'</span></div></td>',
          '<td>'+u.escHtml(u2.Email)+'</td>',
          '<td>'+u.escHtml(u2.Department||'')+'</td>',
          '<td>'+u.badge(u2.Role,u2.Role==='Administrator'?'danger':'info')+'</td>',
          '<td>'+u.statusBadge(u2.Status)+'</td>',
          '<td>'+(u2.LastLogin?u.timeAgo(u2.LastLogin):'-')+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon" data-action="reset" title="Reset Password">🔑</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#userTable'),{
      headers:['ID','Emp ID','Name','Email','Department','Role','Status','Last Login','Actions'],
      rows:rows,
      emptyMsg:'No users found'
    });
  }

  function getFormData(){
    var photoPreview=u.$('#uPhotoPreview');
    var photoSrc=(photoPreview.style.display!=='none')?photoPreview.src:'';
    return{
      EmployeeID:u.getVal('#uEmployeeId'),
      Name:u.getVal('#uName'),
      Email:u.getVal('#uEmail'),
      Password:u.getVal('#uPassword')||undefined,
      Mobile:u.getVal('#uMobile'),
      DeptID:u.getVal('#uDeptId'),
      SectionID:u.getVal('#uSectionId'),
      Designation:u.getVal('#uDesignation'),
      Role:u.getVal('#uRole'),
      Status:u.getVal('#uStatus'),
      JoiningDate:u.getVal('#uJoiningDate'),
      Photo:photoSrc||undefined,
      Permissions:getPermValues()
    };
  }

  function saveUser(){
    var d=getFormData();
    if(!d.EmployeeID||!d.Name||!d.Email||!d.Role||!d.Status){
      u.showToast('Please fill all required fields','error');
      return;
    }
    if(!_state.editId&&!d.Password){
      u.showToast('Password is required for new users','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'updateUser':'addUser';
    if(_state.editId)d.UserID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('User saved successfully','success');
      u.$('#userModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving user: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editUser(id){
    var user=null;
    for(var i=0;i<_data.length;i++){
      if(_data[i].UserID===id){user=_data[i];break;}
    }
    if(!user)return;
    _state.editId=id;
    u.$('#userModalTitle').textContent='Edit User';
    u.$('#uUserId').value=user.UserID;
    u.$('#uEmployeeId').value=user.EmployeeID||'';
    u.$('#uName').value=user.Name||'';
    u.$('#uEmail').value=user.Email||'';
    u.$('#uPassword').value='';
    u.$('#uPassword').required=false;
    u.$('#uPassword').placeholder='Leave blank to keep current';
    u.$('#uMobile').value=user.Mobile||'';
    u.$('#uDesignation').value=user.Designation||'';
    u.$('#uRole').value=user.Role||'';
    u.$('#uStatus').value=user.Status||'Active';
    u.$('#uJoiningDate').value=user.JoiningDate||'';
    u.$('#uDeptId').value=user.DeptID||'';
    if(user.Photo){
      u.$('#uPhotoPreview').src=user.Photo;
      u.$('#uPhotoPreview').style.display='block';
    }else{
      u.$('#uPhotoPreview').style.display='none';
    }
    if(user.DeptID){
      loadSections(user.DeptID);
      setTimeout(function(){
        u.$('#uSectionId').value=user.SectionID||'';
      },300);
    }
    var perms=user.Permissions||{};
    setPermValues(perms);
    u.$('#uIsAdminPerm').checked=!!perms.IsAdmin;
    u.$('#userModal').style.display='flex';
  }

  function deleteUser(id){
    u.showConfirm('Delete this user? This action cannot be undone.',function(){
      u.showLoading(true);
      C.api.call('deleteUser',{UserID:id}).then(function(){
        u.showToast('User deleted','success');
        load();
      }).catch(function(e){
        u.showToast('Error deleting: '+(e.message||e),'error');
        u.showLoading(false);
      });
    });
  }

  function openResetModal(id){
    u.$('#rpUserId').value=id;
    u.$('#rpTempPassword').value='';
    u.$('#rpForceChange').checked=true;
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var pw='';
    for(var i=0;i<10;i++)pw+=chars.charAt(Math.floor(Math.random()*chars.length));
    u.$('#rpTempPassword').value=pw;
    u.$('#resetPasswordModal').style.display='flex';
  }

  function doResetPassword(){
    var userId=parseInt(u.$('#rpUserId').value);
    var tempPw=u.$('#rpTempPassword').value;
    var force=u.$('#rpForceChange').checked;
    if(!tempPw){u.showToast('Enter a temporary password','error');return;}
    u.showLoading(true);
    C.api.call('resetUserPassword',{UserID:userId,TempPassword:tempPw,ForceChange:force}).then(function(){
      u.showToast('Password reset successfully','success');
      u.$('#resetPasswordModal').style.display='none';
      u.showLoading(false);
    }).catch(function(e){
      u.showToast('Error: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function destroy(){
    _data=[];
    _state={page:1,perPage:25,search:'',editId:null};
  }

  C.router.registerPage('users',{
    title:'User Management',
    init:init,
    load:function(){loadMeta().then(function(){load();});},
    destroy:destroy
  });
})();
