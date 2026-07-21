(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _tab='open';
  var _filters={priority:'',department:'',search:''};
  var _timers=[];

  var _tabs=[
    {key:'open',label:'Open',filter:function(r){return r.CurrentStatus==='OPEN';}},
    {key:'running',label:'Running',filter:function(r){return r.CurrentStatus==='RUNNING';}},
    {key:'closed',label:'Closed',filter:function(r){return r.CurrentStatus==='CLOSED';}},
    {key:'pending',label:'Pending',filter:function(r){return r.CurrentStatus==='PENDING';}},
    {key:'approved',label:'Approved',filter:function(r){return r.CurrentStatus==='APPROVED';}},
    {key:'all',label:'All',filter:function(){return true;}}
  ];

  function counts(){
    var c={open:0,running:0,closed:0,pending:0,approved:0,all:0};
    _data.forEach(function(r){
      var s=r.CurrentStatus;
      if(s==='OPEN')c.open++;else if(s==='RUNNING')c.running++;else if(s==='CLOSED')c.closed++;else if(s==='PENDING')c.pending++;else if(s==='APPROVED')c.approved++;
      c.all++;
    });
    return c;
  }

  function applyFilters(list){
    return list.filter(function(r){
      if(_filters.priority&&r.Priority!==_filters.priority)return false;
      if(_filters.department&&r.Department!==_filters.department)return false;
      if(_filters.search){
        var s=_filters.search.toLowerCase();
        var hay=(r.JobCardNo+' '+(r.Machine||'')+' '+(r.ComplaintDescription||'')+' '+(r.AssignedTechnician||'')).toLowerCase();
        if(hay.indexOf(s)===-1)return false;
      }
      return true;
    });
  }

  function timeSince(dt){
    if(!dt)return '-';
    return u.timeAgo(dt);
  }

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML='<div class="jobcards-page">'+
      '<div class="page-header"><h2>Job Cards</h2><button class="btn btn-primary" id="jc-refresh">'+CMMS.icons.refresh+' Refresh</button></div>'+
      '<div class="tab-bar" id="jc-tabs"></div>'+
      '<div class="filter-bar" style="display:flex;gap:12px;margin:12px 0;flex-wrap:wrap;">'+
        '<select id="jc-priority-filter" class="form-control" style="max-width:160px"><option value="">All Priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>'+
        '<select id="jc-dept-filter" class="form-control" style="max-width:160px"><option value="">All Departments</option></select>'+
        '<div style="position:relative;flex:1;max-width:300px">'+CMMS.icons.search+'<input type="text" id="jc-search" class="form-control" placeholder="Search job cards..." style="padding-left:32px"></div>'+
      '</div>'+
      '<div id="jc-table-wrap" class="table-wrap"></div>'+
    '</div>';
    bindEvents();
  }

  function bindEvents(){
    document.getElementById('jc-refresh').addEventListener('click',load);
    document.getElementById('jc-priority-filter').addEventListener('change',function(e){_filters.priority=e.target.value;render();});
    document.getElementById('jc-dept-filter').addEventListener('change',function(e){_filters.department=e.target.value;render();});
    document.getElementById('jc-search').addEventListener('input',u.debounce(function(e){_filters.search=e.target.value;render();},300));
  }

  function renderTabs(){
    var cnt=counts();
    var tb=document.getElementById('jc-tabs');
    if(!tb)return;
    var h='';
    _tabs.forEach(function(t){
      h+='<button class="tab-btn'+(_tab===t.key?' active':'')+'" data-tab="'+t.key+'">'+t.label+' <span class="badge-count">'+cnt[t.key]+'</span></button>';
    });
    tb.innerHTML=h;
    tb.querySelectorAll('.tab-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        _tab=btn.getAttribute('data-tab');
        render();
      });
    });
  }

  function renderDeptFilter(){
    var depts={};
    _data.forEach(function(r){if(r.Department)depts[r.Department]=1;});
    var sel=document.getElementById('jc-dept-filter');
    if(!sel)return;
    var cur=_filters.department;
    var h='<option value="">All Departments</option>';
    Object.keys(depts).sort().forEach(function(d){
      h+='<option value="'+u.escHtml(d)+'"'+(cur===d?' selected':'')+'>'+u.escHtml(d)+'</option>';
    });
    sel.innerHTML=h;
  }

  function openViewModal(jc){
    var html='<div class="modal-body">'+
      '<table class="detail-table" style="width:100%">'+
      '<tr><td><strong>Job Card No</strong></td><td>'+u.escHtml(jc.JobCardNo)+'</td></tr>'+
      '<tr><td><strong>Status</strong></td><td>'+u.statusBadge(jc.CurrentStatus)+'</td></tr>'+
      '<tr><td><strong>Open Date</strong></td><td>'+u.formatDateTime(jc.OpenDateTime)+'</td></tr>'+
      (jc.StartedDateTime?'<tr><td><strong>Started</strong></td><td>'+u.formatDateTime(jc.StartedDateTime)+'</td></tr>':'')+
      (jc.PendingDateTime?'<tr><td><strong>Pending</strong></td><td>'+u.formatDateTime(jc.PendingDateTime)+'</td></tr>':'')+
      (jc.ApprovedDateTime?'<tr><td><strong>Approved</strong></td><td>'+u.formatDateTime(jc.ApprovedDateTime)+'</td></tr>':'')+
      (jc.CloseDateTime?'<tr><td><strong>Closed</strong></td><td>'+u.formatDateTime(jc.CloseDateTime)+'</td></tr>':'')+
      '<tr><td><strong>Section</strong></td><td>'+u.escHtml(jc.Section||'-')+'</td></tr>'+
      '<tr><td><strong>Department</strong></td><td>'+u.escHtml(jc.Department||'-')+'</td></tr>'+
      '<tr><td><strong>Machine</strong></td><td>'+u.escHtml(jc.Machine||jc.MachineName||'-')+'</td></tr>'+
      '<tr><td><strong>Asset</strong></td><td>'+u.escHtml(jc.AssetID||'-')+'</td></tr>'+
      '<tr><td><strong>Priority</strong></td><td>'+u.priorityBadge(jc.Priority)+'</td></tr>'+
      '<tr><td><strong>Complaint Category</strong></td><td>'+u.escHtml(jc.ComplaintCategory||'-')+'</td></tr>'+
      '<tr><td><strong>Complaint Description</strong></td><td>'+u.escHtml(jc.ComplaintDescription||'-')+'</td></tr>'+
      '<tr><td><strong>Complaint By</strong></td><td>'+u.escHtml(jc.ComplaintBy||'-')+'</td></tr>'+
      '<tr><td><strong>Assigned Technician</strong></td><td>'+u.escHtml(jc.AssignedTechnician||'-')+'</td></tr>'+
      '<tr><td><strong>Maintenance Team</strong></td><td>'+u.escHtml(jc.MaintenanceTeam||'-')+'</td></tr>'+
      '<tr><td><strong>Initial Remarks</strong></td><td>'+u.escHtml(jc.InitialRemarks||'-')+'</td></tr>'+
      '<tr><td><strong>Breakdown Type</strong></td><td>'+u.escHtml(jc.BreakdownType||'-')+'</td></tr>'+
      '<tr><td><strong>Root Cause</strong></td><td>'+u.escHtml(jc.RootCause||'-')+'</td></tr>'+
      '<tr><td><strong>Corrective Action</strong></td><td>'+u.escHtml(jc.CorrectiveAction||'-')+'</td></tr>'+
      '<tr><td><strong>Spare Parts</strong></td><td>'+u.escHtml(jc.SpareParts||'-')+'</td></tr>'+
      '<tr><td><strong>Final Remarks</strong></td><td>'+u.escHtml(jc.FinalRemarks||'-')+'</td></tr>'+
      '<tr><td><strong>Approval Status</strong></td><td>'+(jc.ApprovalStatus?u.statusBadge(jc.ApprovalStatus):'-')+'</td></tr>'+
      '<tr><td><strong>Approval Remarks</strong></td><td>'+u.escHtml(jc.ApprovalRemarks||'-')+'</td></tr>'+
      '<tr><td><strong>Return Reason</strong></td><td>'+u.escHtml(jc.ReturnReason||'-')+'</td></tr>'+
      '<tr><td><strong>Waiting Time</strong></td><td>'+u.escHtml(jc.WaitingTime||'-')+'</td></tr>'+
      '<tr><td><strong>Working Time</strong></td><td>'+u.escHtml(jc.WorkingTime||'-')+'</td></tr>'+
      '<tr><td><strong>Downtime</strong></td><td>'+u.escHtml(jc.Downtime||'-')+'</td></tr>'+
      '<tr><td><strong>Started By</strong></td><td>'+u.escHtml(jc.StartedBy||'-')+'</td></tr>'+
      '<tr><td><strong>Closed By</strong></td><td>'+u.escHtml(jc.ClosedBy||'-')+'</td></tr>'+
      '<tr><td><strong>Pending By</strong></td><td>'+u.escHtml(jc.PendingBy||'-')+'</td></tr>'+
      '</table>'+
    '</div>';
    u.showModal('Job Card: '+u.escHtml(jc.JobCardNo),html,[{label:'Close',cls:'btn-secondary',action:function(){u.hideModal();}}]);
  }

  function render(){
    renderTabs();
    renderDeptFilter();
    var tabObj=null;
    _tabs.forEach(function(t){if(t.key===tabObj||t.key===_tab)tabObj=t;});
    var filtered=applyFilters(_data.filter(tabObj.filter));

    var wrap=document.getElementById('jc-table-wrap');
    if(!wrap)return;

    if(filtered.length===0){
      wrap.innerHTML='<div class="empty-state" style="text-align:center;padding:40px;color:#888;">No job cards found.</div>';
      return;
    }

    var h='<table class="data-table"><thead><tr>';
    if(_tab==='approved'){
      h+='<th>JobCardNo</th><th>Approved DateTime</th><th>Machine</th><th>Assigned Technician</th><th>Approval Status</th><th>Action</th>';
    }else if(_tab==='open'){
      h+='<th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Waiting Time</th><th>Complaint</th><th>Action</th>';
    }else if(_tab==='running'){
      h+='<th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Technician</th><th>Working Time</th><th>Action</th>';
    }else if(_tab==='closed'){
      h+='<th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Technician</th><th>Waiting</th><th>Working</th><th>Downtime</th><th>Action</th>';
    }else if(_tab==='pending'){
      h+='<th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Technician</th><th>Waiting</th><th>Working</th><th>Downtime</th><th>Pending Date</th><th>Action</th>';
    }else{
      h+='<th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Technician</th><th>Status</th><th>Action</th>';
    }
    h+='</tr></thead><tbody>';

    filtered.forEach(function(r){
      h+='<tr data-id="'+u.escHtml(r.JobCardNo)+'">';
      if(_tab==='approved'){
        h+='<td>'+u.escHtml(r.JobCardNo)+'</td>';
        h+='<td>'+u.formatDateTime(r.ApprovedDateTime)+'</td>';
        h+='<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>';
        h+='<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>';
        h+='<td>'+(r.ApprovalStatus?u.statusBadge(r.ApprovalStatus):'-')+'</td>';
      }else if(_tab==='open'){
        h+='<td>'+u.escHtml(r.JobCardNo)+'</td>';
        h+='<td>'+u.formatDateTime(r.OpenDateTime)+'</td>';
        h+='<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Department||'-')+'</td>';
        h+='<td>'+u.priorityBadge(r.Priority)+'</td>';
        h+='<td class="live-time" data-start="'+u.escHtml(r.OpenDateTime)+'">'+timeSince(r.OpenDateTime)+'</td>';
        h+='<td>'+u.escHtml((r.ComplaintDescription||'').substring(0,60))+'</td>';
      }else if(_tab==='running'){
        h+='<td>'+u.escHtml(r.JobCardNo)+'</td>';
        h+='<td>'+u.formatDateTime(r.OpenDateTime)+'</td>';
        h+='<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Department||'-')+'</td>';
        h+='<td>'+u.priorityBadge(r.Priority)+'</td>';
        h+='<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>';
        h+='<td class="live-time" data-start="'+u.escHtml(r.StartedDateTime||r.OpenDateTime)+'">'+timeSince(r.StartedDateTime||r.OpenDateTime)+'</td>';
      }else if(_tab==='closed'){
        h+='<td>'+u.escHtml(r.JobCardNo)+'</td>';
        h+='<td>'+u.formatDateTime(r.OpenDateTime)+'</td>';
        h+='<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Department||'-')+'</td>';
        h+='<td>'+u.priorityBadge(r.Priority)+'</td>';
        h+='<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>';
        h+='<td>'+u.escHtml(r.WaitingTime||'-')+'</td>';
        h+='<td>'+u.escHtml(r.WorkingTime||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Downtime||'-')+'</td>';
      }else if(_tab==='pending'){
        h+='<td>'+u.escHtml(r.JobCardNo)+'</td>';
        h+='<td>'+u.formatDateTime(r.OpenDateTime)+'</td>';
        h+='<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Department||'-')+'</td>';
        h+='<td>'+u.priorityBadge(r.Priority)+'</td>';
        h+='<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>';
        h+='<td>'+u.escHtml(r.WaitingTime||'-')+'</td>';
        h+='<td>'+u.escHtml(r.WorkingTime||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Downtime||'-')+'</td>';
        h+='<td>'+u.formatDateTime(r.PendingDateTime)+'</td>';
      }else{
        h+='<td>'+u.escHtml(r.JobCardNo)+'</td>';
        h+='<td>'+u.formatDateTime(r.OpenDateTime)+'</td>';
        h+='<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>';
        h+='<td>'+u.escHtml(r.Department||'-')+'</td>';
        h+='<td>'+u.priorityBadge(r.Priority)+'</td>';
        h+='<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>';
        h+='<td>'+u.statusBadge(r.CurrentStatus)+'</td>';
      }
      h+='<td><button class="btn btn-sm btn-view" data-view="'+u.escHtml(r.JobCardNo)+'">'+CMMS.icons.view+'</button></td>';
      h+='</tr>';
    });

    h+='</tbody></table>';
    wrap.innerHTML=h;

    wrap.querySelectorAll('.btn-view').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-view');
        var jc=_data.find(function(r){return r.JobCardNo===id;});
        if(jc)openViewModal(jc);
      });
    });

    _timers.forEach(clearInterval);
    _timers=[];
    var liveEls=document.querySelectorAll('.live-time[data-start]');
    if(liveEls.length>0){
      var tid=setInterval(function(){
        document.querySelectorAll('.live-time[data-start]').forEach(function(el){
          var s=el.getAttribute('data-start');
          if(s)el.textContent=timeSince(s);
        });
      },60000);
      _timers.push(tid);
    }
    u.showLoading(false);
  }

  function load(){
    u.showLoading(true);
    C.api.call('getJobCards').then(function(d){
      _data=Array.isArray(d)?d:[];render();
    }).catch(function(){u.showLoading(false);u.showToast('Failed to load job cards','error');});
  }

  function destroy(){
    _data=[];_tab='open';_filters={priority:'',department:'',search:''};
    _timers.forEach(clearInterval);_timers=[];
  }

  C.router.registerPage('jobcards',{title:'Job Cards',init:init,load:load,destroy:destroy});
})();
