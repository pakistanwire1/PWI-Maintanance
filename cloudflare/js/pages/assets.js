(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _state={page:1,perPage:25,search:'',editId:null};
  var _depts=[];
  var _machines=[];

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>Asset Master</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="assetSearch" placeholder="Search assets..." />',
          '</div>',
          '<button class="btn btn-primary" id="btnAddAsset">'+u.icons.plus+' Add Asset</button>',
        '</div>',
      '</div>',
      '<div id="assetTable" class="table-container"></div>',
      '<div id="assetModal" class="modal-overlay" style="display:none;">',
        '<div class="modal modal-lg">',
          '<div class="modal-header">',
            '<h3 id="assetModalTitle">Add Asset</h3>',
            '<button class="modal-close" id="btnCloseAssetModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="assetForm" autocomplete="off">',
              '<input type="hidden" id="aAssetId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Asset Code <span class="req">*</span></label>',
                  '<input type="text" id="aAssetCode" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Asset Name <span class="req">*</span></label>',
                  '<input type="text" id="aAssetName" required />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Asset Type <span class="req">*</span></label>',
                  '<select id="aAssetType" required>',
                    '<option value="">Select</option>',
                    '<option value="Equipment">Equipment</option>',
                    '<option value="Tooling">Tooling</option>',
                    '<option value="Instrument">Instrument</option>',
                    '<option value="Fixture">Fixture</option>',
                    '<option value="Vehicle">Vehicle</option>',
                    '<option value="Building">Building</option>',
                    '<option value="Infrastructure">Infrastructure</option>',
                    '<option value="Other">Other</option>',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Category <span class="req">*</span></label>',
                  '<select id="aCategory" required>',
                    '<option value="">Select</option>',
                    '<option value="Production">Production</option>',
                    '<option value="Utility">Utility</option>',
                    '<option value="Safety">Safety</option>',
                    '<option value="Quality">Quality</option>',
                    '<option value="IT">IT</option>',
                    '<option value="Facility">Facility</option>',
                  '</select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Machine</label>',
                  '<select id="aMachineId"><option value="">None</option></select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Department <span class="req">*</span></label>',
                  '<select id="aDeptId"><option value="">Select</option></select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Section</label>',
                  '<select id="aSectionId"><option value="">Select</option></select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Location</label>',
                  '<input type="text" id="aLocation" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Manufacturer</label>',
                  '<input type="text" id="aManufacturer" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Model</label>',
                  '<input type="text" id="aModel" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Serial No</label>',
                  '<input type="text" id="aSerialNo" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Specification</label>',
                  '<input type="text" id="aSpecification" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Purchase Date</label>',
                  '<input type="date" id="aPurchaseDate" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Install Date</label>',
                  '<input type="date" id="aInstallDate" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Warranty Expiry</label>',
                  '<input type="date" id="aWarrantyExpiry" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Supplier</label>',
                  '<input type="text" id="aSupplier" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Cost</label>',
                  '<input type="number" id="aCost" step="0.01" min="0" />',
                '</div>',
                '<div class="form-group">',
                  '<label>Criticality <span class="req">*</span></label>',
                  '<select id="aCriticality" required>',
                    '<option value="">Select</option>',
                    '<option value="Critical">Critical</option>',
                    '<option value="High">High</option>',
                    '<option value="Medium">Medium</option>',
                    '<option value="Low">Low</option>',
                  '</select>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Status <span class="req">*</span></label>',
                  '<select id="aStatus" required>',
                    '<option value="Active">Active</option>',
                    '<option value="Inactive">Inactive</option>',
                    '<option value="Retired">Retired</option>',
                    '<option value="Under Maintenance">Under Maintenance</option>',
                  '</select>',
                '</div>',
                '<div class="form-group"></div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelAsset">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveAsset">Save</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    bindEvents();
  }

  function bindEvents(){
    u.$('#btnAddAsset').addEventListener('click',function(){
      _state.editId=null;
      u.resetForm(u.$('#assetForm'));
      u.$('#assetModalTitle').textContent='Add Asset';
      u.$('#assetModal').style.display='flex';
    });
    u.$('#btnCloseAssetModal').addEventListener('click',function(){
      u.$('#assetModal').style.display='none';
    });
    u.$('#btnCancelAsset').addEventListener('click',function(){
      u.$('#assetModal').style.display='none';
    });
    u.$('#aDeptId').addEventListener('change',function(){
      loadSections(this.value);
    });
    u.$('#aMachineId').addEventListener('change',function(){
      var mid=parseInt(this.value);
      if(!mid)return;
      for(var i=0;i<_machines.length;i++){
        if(_machines[i].MachineID===mid){
          var m=_machines[i];
          if(m.DeptID){u.$('#aDeptId').value=m.DeptID;loadSections(m.DeptID);}
          if(m.Location)u.$('#aLocation').value=m.Location;
          break;
        }
      }
    });
    u.$('#btnSaveAsset').addEventListener('click',function(){
      saveAsset();
    });
    var searchInput=u.$('#assetSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      load();
    },400));
    u.$('#assetTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editAsset(id);
      else if(btn.dataset.action==='delete')deleteAsset(id);
    });
  }

  function loadMeta(){
    return Promise.all([
      C.api.call('getDepartmentList').catch(function(){return[];}),
      C.api.call('getMachineList').catch(function(){return[];})
    ]).then(function(res){
      _depts=res[0]||[];
      _machines=res[1]||[];
      u.populateSelect(u.$('#aDeptId'),_depts,'DeptID','Department');
      u.populateSelect(u.$('#aMachineId'),_machines,'MachineID','MachineName');
    });
  }

  function loadSections(deptId){
    var sel=u.$('#aSectionId');
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
    C.api.call('getAssets',params).then(function(data){
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
      var a=_data[i];
      rows.push(
        '<tr data-id="'+a.AssetID+'">',
          '<td>'+u.escHtml(a.AssetID)+'</td>',
          '<td>'+u.escHtml(a.AssetCode)+'</td>',
          '<td>'+u.escHtml(a.AssetName)+'</td>',
          '<td>'+u.escHtml(a.AssetType||'')+'</td>',
          '<td>'+u.escHtml(a.Category||'')+'</td>',
          '<td>'+u.escHtml(a.MachineName||'-')+'</td>',
          '<td>'+u.escHtml(a.Department||'')+'</td>',
          '<td>'+u.priorityBadge(a.Criticality||'Low')+'</td>',
          '<td>'+u.statusBadge(a.Status)+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#assetTable'),{
      headers:['ID','Code','Name','Type','Category','Machine','Department','Criticality','Status','Actions'],
      rows:rows,
      emptyMsg:'No assets found'
    });
  }

  function getFormData(){
    return{
      AssetCode:u.getVal('#aAssetCode'),
      AssetName:u.getVal('#aAssetName'),
      AssetType:u.getVal('#aAssetType'),
      Category:u.getVal('#aCategory'),
      MachineID:u.getVal('#aMachineId')||null,
      DeptID:u.getVal('#aDeptId'),
      SectionID:u.getVal('#aSectionId'),
      Location:u.getVal('#aLocation'),
      Manufacturer:u.getVal('#aManufacturer'),
      Model:u.getVal('#aModel'),
      SerialNo:u.getVal('#aSerialNo'),
      Specification:u.getVal('#aSpecification'),
      PurchaseDate:u.getVal('#aPurchaseDate'),
      InstallDate:u.getVal('#aInstallDate'),
      WarrantyExpiry:u.getVal('#aWarrantyExpiry'),
      Supplier:u.getVal('#aSupplier'),
      Cost:u.getVal('#aCost'),
      Criticality:u.getVal('#aCriticality'),
      Status:u.getVal('#aStatus')
    };
  }

  function saveAsset(){
    var d=getFormData();
    if(!d.AssetCode||!d.AssetName||!d.AssetType||!d.Category||!d.Criticality||!d.Status){
      u.showToast('Please fill all required fields','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'updateAsset':'addAsset';
    if(_state.editId)d.AssetID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('Asset saved successfully','success');
      u.$('#assetModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving asset: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editAsset(id){
    var a=null;
    for(var i=0;i<_data.length;i++){
      if(_data[i].AssetID===id){a=_data[i];break;}
    }
    if(!a)return;
    _state.editId=id;
    u.$('#assetModalTitle').textContent='Edit Asset';
    u.$('#aAssetId').value=a.AssetID;
    u.$('#aAssetCode').value=a.AssetCode||'';
    u.$('#aAssetName').value=a.AssetName||'';
    u.$('#aAssetType').value=a.AssetType||'';
    u.$('#aCategory').value=a.Category||'';
    u.$('#aLocation').value=a.Location||'';
    u.$('#aManufacturer').value=a.Manufacturer||'';
    u.$('#aModel').value=a.Model||'';
    u.$('#aSerialNo').value=a.SerialNo||'';
    u.$('#aSpecification').value=a.Specification||'';
    u.$('#aPurchaseDate').value=a.PurchaseDate||'';
    u.$('#aInstallDate').value=a.InstallDate||'';
    u.$('#aWarrantyExpiry').value=a.WarrantyExpiry||'';
    u.$('#aSupplier').value=a.Supplier||'';
    u.$('#aCost').value=a.Cost||'';
    u.$('#aCriticality').value=a.Criticality||'';
    u.$('#aStatus').value=a.Status||'Active';
    u.$('#aDeptId').value=a.DeptID||'';
    u.$('#aMachineId').value=a.MachineID||'';
    if(a.DeptID){
      loadSections(a.DeptID);
      setTimeout(function(){
        u.$('#aSectionId').value=a.SectionID||'';
      },300);
    }
    u.$('#assetModal').style.display='flex';
  }

  function deleteAsset(id){
    u.showConfirm('Are you sure you want to delete this asset?',function(){
      u.showLoading(true);
      C.api.call('deleteAsset',{AssetID:id}).then(function(){
        u.showToast('Asset deleted','success');
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
    _depts=[];
    _machines=[];
  }

  C.router.registerPage('assets',{
    title:'Asset Master',
    init:init,
    load:function(){
      loadMeta().then(function(){load();});
    },
    destroy:destroy
  });
})();
