(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _openJobs=[];
  var _technicians=[];
  var _timers=[];
  var _selectedJC=null;

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML='<div class="startjc-page">'+
      '<div class="page-header"><h2>Start Job Card - Assign Technician</h2></div>'+
      '<div id="sjc-table-wrap" class="table-wrap"></div>'+
    '</div>'+
    '<div id="sjc-modal" class="modal" style="display:none;">'+
      '<div class="modal-content" style="max-width:600px;">'+
        '<div class="modal-header"><h3 id="sjc-modal-title">Start Job Card</h3><button class="modal-close" id="sjc-modal-close">&times;</button></div>'+
        '<div class="modal-body" id="sjc-modal-body"></div>'+
        '<div class="modal-footer" id="sjc-modal-footer"></div>'+
      '</div>'+
    '</div>';
    bindEvents();
  }

  function bindEvents(){
    document.getElementById('sjc-modal-close').addEventListener('click',closeModal);
    document.getElementById('sjc-modal').addEventListener('click',function(e){if(e.target===this)closeModal();});
  }

  function openStartModal(jc){
    _selectedJC=jc;
    document.getElementById('sjc-modal-title').textContent='Start Job Card: '+u.escHtml(jc.JobCardNo);

    var timeHtml='<div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
        '<div><strong>Opened:</strong> '+u.formatDateTime(jc.OpenDateTime)+'</div>'+
        '<div><strong>Waiting:</strong> '+u.timeAgo(jc.OpenDateTime)+'</div>'+
        '<div><strong>Machine:</strong> '+u.escHtml(jc.Machine||jc.MachineName||'-')+'</div>'+
        '<div><strong>Priority:</strong> '+u.priorityBadge(jc.Priority)+'</div>'+
      '</div>'+
    '</div>';

    var techHtml='<div style="margin-bottom:12px;"><label><strong>Assign Technician(s) <span class="req">*</span></strong></label><div style="max-height:200px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:8px;">';
    _technicians.forEach(function(t){
      var tid=t.EmployeeID||t.ID||t.id||'';
      var tname=t.Name||t.EmployeeName||t.name||'';
      var skills=t.Skills||t.Skill||t.Specialization||'';
      techHtml+='<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">'+
        '<input type="checkbox" class="sjc-tech-check" value="'+u.escHtml(tid)+'" data-name="'+u.escHtml(tname)+'" data-skills="'+u.escHtml(skills)+'">'+
        '<span>'+u.escHtml(tname)+' ('+u.escHtml(tid)+')</span>'+
        (skills?'<span style="color:#888;font-size:0.85em;"> - '+u.escHtml(skills)+'</span>':'')+
      '</label>';
    });
    techHtml+='</div></div>';

    var formHtml=timeHtml+techHtml+
      '<div class="form-group" style="margin-bottom:12px;"><label>Maintenance Team (auto from skills)</label>'+
        '<input type="text" id="sjc-team" class="form-control" readonly placeholder="Auto-detected from technician skills"></div>'+
      '<div class="form-group" style="margin-bottom:12px;"><label>Initial Remarks</label>'+
        '<textarea id="sjc-remarks" class="form-control" rows="3"></textarea></div>'+
      '<input type="hidden" id="sjc-status" value="RUNNING">';

    document.getElementById('sjc-modal-body').innerHTML=formHtml;

    document.getElementById('sjc-modal-footer').innerHTML=
      '<button class="btn btn-secondary" id="sjc-cancel">Cancel</button>'+
      '<button class="btn btn-primary" id="sjc-start-btn">'+CMMS.icons.play+' Start Job Card</button>';

    document.getElementById('sjc-cancel').addEventListener('click',closeModal);
    document.getElementById('sjc-start-btn').addEventListener('click',function(){submitStart(jc);});

    document.querySelectorAll('.sjc-tech-check').forEach(function(cb){
      cb.addEventListener('change',function(){updateTeam();});
    });

    document.getElementById('sjc-modal').style.display='flex';
  }

  function updateTeam(){
    var teams=[];
    document.querySelectorAll('.sjc-tech-check:checked').forEach(function(cb){
      var skills=cb.getAttribute('data-skills');
      if(skills){
        skills.split(',').forEach(function(s){s=s.trim();if(s&&teams.indexOf(s)===-1)teams.push(s);});
      }
    });
    u.setVal('sjc-team',teams.join(', ')||'General Maintenance');
  }

  function closeModal(){
    document.getElementById('sjc-modal').style.display='none';
    _selectedJC=null;
  }

  function submitStart(jc){
    var techs=[];
    var names=[];
    document.querySelectorAll('.sjc-tech-check:checked').forEach(function(cb){
      techs.push(cb.value);
      names.push(cb.getAttribute('data-name'));
    });
    if(techs.length===0){u.showToast('Please select at least one technician','error');return;}

    var payload={
      id:jc.JobCardNo,
      JobCardNo:jc.JobCardNo,
      CurrentStatus:'RUNNING',
      AssignedTechnician:names.join(', '),
      AssignedTechnicianIDs:techs.join(','),
      MaintenanceTeam:u.getVal('sjc-team')||'General Maintenance',
      InitialRemarks:u.getVal('sjc-remarks')||'',
      StartedBy:(C.session.getUser()||{}).name||(C.session.getUser()||{}).Name||''
    };

    var btn=document.getElementById('sjc-start-btn');
    if(btn)btn.disabled=true;

    C.api.mutate('updateJobCard',payload).then(function(){
      u.showToast('Job card started successfully','success');
      closeModal();
      load();
    }).catch(function(err){
      u.showToast('Failed: '+(err.message||err),'error');
    }).finally(function(){
      if(btn)btn.disabled=false;
    });
  }

  function render(){
    var wrap=document.getElementById('sjc-table-wrap');
    if(!wrap)return;
    if(_openJobs.length===0){wrap.innerHTML='<div style="padding:40px;text-align:center;color:#888;">No open job cards to start.</div>';return;}

    var h='<table class="data-table"><thead><tr><th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Complaint</th><th>Waiting</th><th>Action</th></tr></thead><tbody>';
    _openJobs.forEach(function(r){
      h+='<tr>'+
        '<td>'+u.escHtml(r.JobCardNo)+'</td>'+
        '<td>'+u.formatDateTime(r.OpenDateTime)+'</td>'+
        '<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>'+
        '<td>'+u.escHtml(r.Department||'-')+'</td>'+
        '<td>'+u.priorityBadge(r.Priority)+'</td>'+
        '<td>'+u.escHtml((r.ComplaintDescription||'').substring(0,60))+'</td>'+
        '<td class="live-time" data-start="'+u.escHtml(r.OpenDateTime)+'">'+u.timeAgo(r.OpenDateTime)+'</td>'+
        '<td><button class="btn btn-sm btn-primary btn-start" data-jc="'+u.escHtml(r.JobCardNo)+'">'+CMMS.icons.play+' Start</button></td>'+
      '</tr>';
    });
    h+='</tbody></table>';
    wrap.innerHTML=h;

    wrap.querySelectorAll('.btn-start').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-jc');
        var jc=_openJobs.find(function(r){return r.JobCardNo===id;});
        if(jc)openStartModal(jc);
      });
    });

    _timers.forEach(clearInterval);_timers=[];
    var tid=setInterval(function(){
      document.querySelectorAll('.live-time[data-start]').forEach(function(el){
        var s=el.getAttribute('data-start');
        if(s)el.textContent=u.timeAgo(s);
      });
    },60000);
    _timers.push(tid);
    u.showLoading(false);
  }

  function load(){
    u.showLoading(true);
    Promise.all([
      C.api.call('getJobCards'),
      C.api.call('getTechnicians')
    ]).then(function(res){
      _openJobs=(res[0]||[]).filter(function(r){return r.CurrentStatus==='OPEN';});
      _technicians=res[1]||[];
      render();
    }).catch(function(){u.showLoading(false);u.showToast('Failed to load data','error');});
  }

  function destroy(){
    _openJobs=[];_technicians=[];_selectedJC=null;
    _timers.forEach(clearInterval);_timers=[];
    closeModal();
  }

  C.router.registerPage('startjc',{title:'Start Job Card',init:init,load:load,destroy:destroy});
})();
