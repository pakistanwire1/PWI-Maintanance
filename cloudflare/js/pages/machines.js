(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _state={page:1,perPage:25,search:'',editId:null};
  var _depts=[];

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>Machine Master</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="machineSearch" placeholder="Search machines..." />',
          '</div>',
          '<button class="btn btn-primary" id="btnAddMachine">'+u.icons.plus+' Add Machine</button>',
        '</div>',
      '</div>',
      '<div id="machineTable" class="table-container"></div>',
      '<div id="machineModal" class="modal-overlay" style="display:none;">',
        '<div class="modal">',
          '<div class="modal-header">',
            '<h3 id="machineModalTitle">Add Machine</h3>',
            '<button class="modal-close" id="btnCloseMachineModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="machineForm" autocomplete="off">',
              '<input type="hidden" id="mMachineId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Machine Code <span class="req">*</span></label>',
                  '<input type="text" id="mMachineCode" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Machine Name <span class="req">*</span></label>',
                  '<input type="text" id="mMachineName" required />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Machine Number</label>',
                  '<input type="text" id="mMachineNumber" readonly />',
                '</div>',
                '<div class="form-group">',
                  '<label>Department <span class="req">*</span></label>',
                  '<select id="mDeptId"><option value="">Select</option></select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Section</label>',
                  '<select id="mSectionId"><option value="">Select</option></select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Location</label>',
                  '<input type="text" id="mLocation" />',
                '</div>',
              </div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Machine Type <span class="req">*</span></label>',
                  '<select id="mMachineType" required>',
                    '<option value="">Select</option>',
                    '<option value="CNC">CNC</option>',
                    '<option value="Hydraulic">Hydraulic</option>',
                    '<option value="Pneumatic">Pneumatic</option>',
                    '<option value="Electrical">Electrical</option>',
                    '<option value="Mechanical">Mechanical</option>',
                    '<option value="Robotic">Robotic</option>',
                    '<option value="Conveyor">Conveyor</option>',
                    '<option value="Pump">Pump</option>',
                    '<option value="Compressor">Compressor</option>',
                    '<option value="Generator">Generator</option>',
                    '<option value="Other">Other</option>',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Manufacturer</label>',
                  '<input type="text" id="mManufacturer" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Model</label>',
                  '<input type="text" id="mModel" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Serial No</label>',
                  '<input type="text" id="mSerialNo" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Capacity</label>',
                  '<input type="text" id="mCapacity" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Power Rating</label>',
                  '<input type="text" id="mPowerRating" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Install Date</label>',
                  '<input type="date" id="mInstallDate" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Warranty Expiry</label>',
                  '<input type="date" id="mWarrantyExpiry" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Criticality <span class="req">*</span></label>',
                  '<select id="mCriticality" required>',
                    '<option value="">Select</option>',
                    '<option value="Critical">Critical</option>',
                    '<option value="High">High</option>',
                    '<option value="Medium">Medium</option>',
                    '<option value="Low">Low</option>',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Status <span class="req">*</span></label>',
                  '<select id="mStatus" required>',
                    '<option value="Active">Active</option>',
                    '<option value="Inactive">Inactive</option>',
                    '<option value="Retired">Retired</option>',
                    '<option value="Under Maintenance">Under Maintenance</option>',
                  '</select>',
                '</div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelMachine">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveMachine">Save</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    bindEvents();
  }

  function bindEvents(){
    u.$('#btnAddMachine').addEventListener('click',function(){
      _state.editId=null;
      u.resetForm(u.$('#machineForm'));
      u.$('#mMachineNumber').value='';
      u.$('#machineModalTitle').textContent='Add Machine';
      u.$('#machineModal').style.display='flex';
    });
    u.$('#btnCloseMachineModal').addEventListener('click',function(){
      u.$('#machineModal').style.display='none';
    });
    u.$('#btnCancelMachine').addEventListener('click',function(){
      u.$('#machineModal').style.display='none';
    });
    u.$('#mMachineCode').addEventListener('input',function(){
      if(!_state.editId){
        u.$('#mMachineNumber').value=u.$('#mMachineCode').value;
      }
    });
    u.$('#mDeptId').addEventListener('change',function(){
      loadSections(this.value);
    });
    u.$('#btnSaveMachine').addEventListener('click',function(){
      saveMachine();
    });
    var searchInput=u.$('#machineSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      load();
    },400));
    u.$('#machineTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editMachine(id);
      else if(btn.dataset.action==='delete')deleteMachine(id);
    });
  }

  function loadDepts(){
    return C.api.call('getDepartmentList').then(function(d){
      _depts=d||[];
      u.populateSelect(u.$('#mDeptId'),_depts,'DeptID','Department');
      return _depts;
    }).catch(function(){_depts=[];return[];});
  }

  function loadSections(deptId){
    var sel=u.$('#mSectionId');
    sel.innerHTML='<option value="">Select</option>';
    if(!deptId)return;
    C.api.call('getDepartmentList',{DeptID:deptId}).then(function(d){
      if(d&&d.length){
        var sections=d[0].Sections||d[0].sections||[];
        u.populateSelect(sel,sections,'SectionID','Section');
      }
    }).catch(function(){});
  }

  function load(){
    u.showLoading(true);
    var params={};
    if(_state.search)params.Search=_state.search;
    C.api.call('getMachines',params).then(function(data){
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
      var m=_data[i];
      rows.push(
        '<tr data-id="'+m.MachineID+'">',
          '<td>'+u.escHtml(m.MachineID)+'</td>',
          '<td>'+u.escHtml(m.MachineCode)+'</td>',
          '<td>'+u.escHtml(m.MachineName)+'</td>',
          '<td>'+u.escHtml(m.Department||'')+'</td>',
          '<td>'+u.escHtml(m.Section||'')+'</td>',
          '<td>'+u.escHtml(m.Location||'')+'</td>',
          '<td>'+u.escHtml(m.MachineType||'')+'</td>',
          '<td>'+u.priorityBadge(m.Criticality||'Low')+'</td>',
          '<td>'+u.statusBadge(m.Status)+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#machineTable'),{
      headers:['ID','Code','Name','Department','Section','Location','Type','Criticality','Status','Actions'],
      rows:rows,
      emptyMsg:'No machines found'
    });
  }

  function getFormData(){
    return{
      MachineCode:u.getVal('#mMachineCode'),
      MachineName:u.getVal('#mMachineName'),
      MachineNumber:u.getVal('#mMachineNumber'),
      DeptID:u.getVal('#mDeptId'),
      SectionID:u.getVal('#mSectionId'),
      Location:u.getVal('#mLocation'),
      MachineType:u.getVal('#mMachineType'),
      Manufacturer:u.getVal('#mManufacturer'),
      Model:u.getVal('#mModel'),
      SerialNo:u.getVal('#mSerialNo'),
      Capacity:u.getVal('#mCapacity'),
      PowerRating:u.getVal('#mPowerRating'),
      InstallDate:u.getVal('#mInstallDate'),
      WarrantyExpiry:u.getVal('#mWarrantyExpiry'),
      Criticality:u.getVal('#mCriticality'),
      Status:u.getVal('#mStatus')
    };
  }

  function saveMachine(){
    var d=getFormData();
    if(!d.MachineCode||!d.MachineName||!d.MachineType||!d.Criticality||!d.Status){
      u.showToast('Please fill all required fields','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'updateMachine':'addMachine';
    if(_state.editId)d.MachineID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('Machine saved successfully','success');
      u.$('#machineModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving machine: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editMachine(id){
    var m=null;
    for(var i=0;i<_data.length;i++){
      if(_data[i].MachineID===id){m=_data[i];break;}
    }
    if(!m)return;
    _state.editId=id;
    u.$('#machineModalTitle').textContent='Edit Machine';
    u.$('#mMachineId').value=m.MachineID;
    u.$('#mMachineCode').value=m.MachineCode||'';
    u.$('#mMachineName').value=m.MachineName||'';
    u.$('#mMachineNumber').value=m.MachineNumber||m.MachineCode||'';
    u.$('#mLocation').value=m.Location||'';
    u.$('#mMachineType').value=m.MachineType||'';
    u.$('#mManufacturer').value=m.Manufacturer||'';
    u.$('#mModel').value=m.Model||'';
    u.$('#mSerialNo').value=m.SerialNo||'';
    u.$('#mCapacity').value=m.Capacity||'';
    u.$('#mPowerRating').value=m.PowerRating||'';
    u.$('#mInstallDate').value=m.InstallDate||'';
    u.$('#mWarrantyExpiry').value=m.WarrantyExpiry||'';
    u.$('#mCriticality').value=m.Criticality||'';
    u.$('#mStatus').value=m.Status||'Active';
    u.$('#mDeptId').value=m.DeptID||'';
    if(m.DeptID){
      loadSections(m.DeptId||m.DeptID);
      setTimeout(function(){
        u.$('#mSectionId').value=m.SectionID||'';
      },300);
    }
    u.$('#machineModal').style.display='flex';
  }

  function deleteMachine(id){
    u.showConfirm('Are you sure you want to delete this machine?',function(){
      u.showLoading(true);
      C.api.call('deleteMachine',{MachineID:id}).then(function(){
        u.showToast('Machine deleted','success');
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

  C.router.registerPage('machines',{
    title:'Machine Master',
    init:init,
    load:function(){
      loadDepts().then(function(){load();});
    },
    destroy:destroy
  });
})();
