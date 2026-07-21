(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _openJobs=[];
  var _sections=[];
  var _departments=[];
  var _machines=[];
  var _assets=[];
  var _timers=[];

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML='<div class="openjc-page">'+
      '<div class="page-header"><h2>Open New Job Card</h2></div>'+
      '<div class="card form-card" style="max-width:800px;margin-bottom:24px;">'+
        '<form id="openjc-form" enctype="multipart/form-data">'+
          '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'+
            '<div class="form-group"><label>Section <span class="req">*</span></label>'+
              '<select id="oj-section" class="form-control" required><option value="">Select Section</option></select></div>'+
            '<div class="form-group"><label>Department <span class="req">*</span></label>'+
              '<select id="oj-department" class="form-control" required><option value="">Select Department</option></select></div>'+
            '<div class="form-group"><label>Machine <span class="req">*</span></label>'+
              '<select id="oj-machine" class="form-control" required><option value="">Select Machine</option></select></div>'+
            '<div class="form-group"><label>Asset ID <span class="req">*</span></label>'+
              '<select id="oj-asset" class="form-control" required><option value="">Select Asset</option></select></div>'+
            '<div class="form-group"><label>Complaint Category</label>'+
              '<select id="oj-category" class="form-control">'+
                '<option value="Mechanical Failure">Mechanical Failure</option>'+
                '<option value="Electrical Failure">Electrical Failure</option>'+
                '<option value="Hydraulic Failure">Hydraulic Failure</option>'+
                '<option value="Pneumatic Failure">Pneumatic Failure</option>'+
                '<option value="Software Issue">Software Issue</option>'+
                '<option value="Safety Issue">Safety Issue</option>'+
                '<option value="Routine Maintenance">Routine Maintenance</option>'+
                '<option value="Other">Other</option>'+
              '</select></div>'+
            '<div class="form-group"><label>Priority <span class="req">*</span></label>'+
              '<select id="oj-priority" class="form-control" required>'+
                '<option value="">Select Priority</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>'+
              '</select></div>'+
            '<div class="form-group" style="grid-column:1/3"><label>Complaint Description <span class="req">*</span></label>'+
              '<textarea id="oj-description" class="form-control" rows="3" required></textarea></div>'+
            '<div class="form-group"><label>Complaint By</label>'+
              '<input type="text" id="oj-complaintby" class="form-control" readonly></div>'+
            '<div class="form-group"><label>Fault Image</label>'+
              '<input type="file" id="oj-image" class="form-control" accept="image/*"></div>'+
          '</div>'+
          '<div style="margin-top:16px;text-align:right">'+
            '<button type="submit" class="btn btn-primary" id="oj-submit">'+CMMS.icons.plus+' Open Job Card</button>'+
          '</div>'+
        '</form>'+
      '</div>'+
      '<div class="card"><h3 style="margin-bottom:12px;">Existing Open Job Cards</h3><div id="oj-table-wrap" class="table-wrap"></div></div>'+
    '</div>';
    bindEvents();
  }

  function bindEvents(){
    document.getElementById('oj-section').addEventListener('change',onSectionChange);
    document.getElementById('oj-department').addEventListener('change',onDepartmentChange);
    document.getElementById('oj-machine').addEventListener('change',onMachineChange);
    document.getElementById('oj-submit').addEventListener('click',onSubmit);
    var user=C.session.getUser();
    if(user)u.setVal('oj-complaintby',user.name||user.Name||user.UserName||'');
  }

  function onSectionChange(){
    var sec=u.getVal('oj-section');
    u.setVal('oj-department','');
    u.setVal('oj-machine','');
    u.setVal('oj-asset','');
    if(!sec){populateDeptSelect([]);populateMachineSelect([]);populateAssetSelect([]);return;}
    var depts=[];
    var seen={};
    _data_tmp_dept.forEach(function(r){
      if(r.Section===sec&&!seen[r.Department]){seen[r.Department]=1;depts.push(r);}
    });
    populateDeptSelect(depts);
    populateMachineSelect([]);
    populateAssetSelect([]);
  }

  var _data_tmp_dept=[];
  var _data_tmp_mach=[];
  var _data_tmp_asset=[];

  function populateDeptSelect(list){
    var sel=document.getElementById('oj-department');
    var h='<option value="">Select Department</option>';
    list.forEach(function(r){h+='<option value="'+u.escHtml(r.Department)+'">'+u.escHtml(r.Department)+'</option>';});
    sel.innerHTML=h;
  }

  function onDepartmentChange(){
    var sec=u.getVal('oj-section');
    var dept=u.getVal('oj-department');
    u.setVal('oj-machine','');
    u.setVal('oj-asset','');
    if(!dept){populateMachineSelect([]);populateAssetSelect([]);return;}
    var machs=[];
    var seen={};
    _data_tmp_mach.forEach(function(r){
      if((!sec||r.Section===sec)&&r.Department===dept&&!seen[r.MachineName]){seen[r.MachineName]=1;machs.push(r);}
    });
    populateMachineSelect(machs);
    populateAssetSelect([]);
  }

  function populateMachineSelect(list){
    var sel=document.getElementById('oj-machine');
    var h='<option value="">Select Machine</option>';
    list.forEach(function(r){h+='<option value="'+u.escHtml(r.MachineName)+'">'+u.escHtml(r.MachineName)+'</option>';});
    sel.innerHTML=h;
  }

  function onMachineChange(){
    var mach=u.getVal('oj-machine');
    var dept=u.getVal('oj-department');
    u.setVal('oj-asset','');
    if(!mach){populateAssetSelect([]);return;}
    var assets=[];
    var seen={};
    _data_tmp_asset.forEach(function(r){
      if(r.MachineName===mach&&(!dept||r.Department===dept)&&!seen[r.AssetID]){seen[r.AssetID]=1;assets.push(r);}
    });
    populateAssetSelect(assets);
  }

  function populateAssetSelect(list){
    var sel=document.getElementById('oj-asset');
    var h='<option value="">Select Asset</option>';
    list.forEach(function(r){h+='<option value="'+u.escHtml(r.AssetID)+'">'+u.escHtml(r.AssetID)+(r.AssetName?' - '+u.escHtml(r.AssetName):'')+'</option>';});
    sel.innerHTML=h;
  }

  function onSubmit(e){
    e.preventDefault();
    var sec=u.getVal('oj-section');
    var dept=u.getVal('oj-department');
    var mach=u.getVal('oj-machine');
    var asset=u.getVal('oj-asset');
    var cat=u.getVal('oj-category');
    var pri=u.getVal('oj-priority');
    var desc=u.getVal('oj-description');
    var by=u.getVal('oj-complaintby');

    if(!sec||!dept||!mach||!asset||!pri||!desc){
      u.showToast('Please fill all required fields','error');return;
    }

    var fileInput=document.getElementById('oj-image');
    var fileData=null;
    if(fileInput&&fileInput.files&&fileInput.files[0]){
      var reader=new FileReader();
      reader.onload=function(ev){
        fileData=ev.target.result;
        submitJob(sec,dept,mach,asset,cat,pri,desc,by,fileData);
      };
      reader.readAsDataURL(fileInput.files[0]);
    }else{
      submitJob(sec,dept,mach,asset,cat,pri,desc,by,null);
    }
  }

  function submitJob(sec,dept,mach,asset,cat,pri,desc,by,img){
    var payload={
      Section:sec,Department:dept,Machine:mach,AssetID:asset,
      ComplaintCategory:cat,Priority:pri,ComplaintDescription:desc,
      ComplaintBy:by,CurrentStatus:'OPEN'
    };
    if(img)payload.FaultImage=img;
    var btn=document.getElementById('oj-submit');
    if(btn)btn.disabled=true;
    C.api.mutate('addJobCard',payload).then(function(){
      u.showToast('Job card opened successfully','success');
      u.resetForm('openjc-form');
      var user=C.session.getUser();
      if(user)u.setVal('oj-complaintby',user.name||user.Name||user.UserName||'');
      load();
    }).catch(function(err){
      u.showToast('Failed: '+(err.message||err),'error');
    }).finally(function(){
      if(btn)btn.disabled=false;
    });
  }

  function load(){
    u.showLoading(true);
    var secSel=document.getElementById('oj-section');
    var machSel=document.getElementById('oj-machine');

    Promise.all([
      C.api.call('getSectionList'),
      C.api.call('getDepartmentList'),
      C.api.call('getMachines'),
      C.api.call('getAssets'),
      C.api.call('getJobCards')
    ]).then(function(res){
      _sections=res[0]||[];_data_tmp_dept=res[1]||[];
      _machines=res[2]||[];_data_tmp_mach=res[2]||[];
      _assets=res[3]||[];_data_tmp_asset=res[3]||[];
      _openJobs=(res[4]||[]).filter(function(r){return r.CurrentStatus==='OPEN';});

      var h='<option value="">Select Section</option>';
      var seen={};
      _sections.forEach(function(s){
        var v=s.Section||s.SectionName||s.Name||s;
        if(typeof v==='string'&&v&&!seen[v]){seen[v]=1;h+='<option value="'+u.escHtml(v)+'">'+u.escHtml(v)+'</option>';}
      });
      if(secSel)secSel.innerHTML=h;

      renderTable();
      u.showLoading(false);
    }).catch(function(){u.showLoading(false);u.showToast('Failed to load data','error');});
  }

  function renderTable(){
    var wrap=document.getElementById('oj-table-wrap');
    if(!wrap)return;
    if(_openJobs.length===0){wrap.innerHTML='<div style="padding:20px;text-align:center;color:#888;">No open job cards.</div>';return;}
    var h='<table class="data-table"><thead><tr><th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Category</th><th>Complaint</th><th>Complaint By</th></tr></thead><tbody>';
    _openJobs.forEach(function(r){
      h+='<tr>'+
        '<td>'+u.escHtml(r.JobCardNo)+'</td>'+
        '<td>'+u.formatDateTime(r.OpenDateTime)+'</td>'+
        '<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>'+
        '<td>'+u.escHtml(r.Department||'-')+'</td>'+
        '<td>'+u.priorityBadge(r.Priority)+'</td>'+
        '<td>'+u.escHtml(r.ComplaintCategory||'-')+'</td>'+
        '<td>'+u.escHtml((r.ComplaintDescription||'').substring(0,50))+'</td>'+
        '<td>'+u.escHtml(r.ComplaintBy||'-')+'</td>'+
      '</tr>';
    });
    h+='</tbody></table>';
    wrap.innerHTML=h;
  }

  function destroy(){
    _openJobs=[];_sections=[];_departments=[];_machines=[];_assets=[];
    _data_tmp_dept=[];_data_tmp_mach=[];_data_tmp_asset=[];
    _timers.forEach(clearInterval);_timers=[];
  }

  C.router.registerPage('openjc',{title:'Open Job Card',init:init,load:load,destroy:destroy});
})();
