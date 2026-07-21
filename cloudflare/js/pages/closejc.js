(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _runningJobs=[];
  var _breakdownTypes=[];
  var _timers=[];
  var _selectedJC=null;

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML='<div class="closejc-page">'+
      '<div class="page-header"><h2>Close Job Card</h2></div>'+
      '<div id="cjc-table-wrap" class="table-wrap"></div>'+
    '</div>'+
    '<div id="cjc-modal" class="modal" style="display:none;">'+
      '<div class="modal-content" style="max-width:700px;">'+
        '<div class="modal-header"><h3 id="cjc-modal-title">Close Job Card</h3><button class="modal-close" id="cjc-modal-close">&times;</button></div>'+
        '<div class="modal-body" id="cjc-modal-body"></div>'+
        '<div class="modal-footer" id="cjc-modal-footer"></div>'+
      '</div>'+
    '</div>';
    bindEvents();
  }

  function bindEvents(){
    document.getElementById('cjc-modal-close').addEventListener('click',closeModal);
    document.getElementById('cjc-modal').addEventListener('click',function(e){if(e.target===this)closeModal();});
  }

  function openCloseModal(jc){
    _selectedJC=jc;
    document.getElementById('cjc-modal-title').textContent='Close Job Card: '+u.escHtml(jc.JobCardNo);

    var openTime=jc.OpenDateTime||'';
    var startTime=jc.StartedDateTime||'';
    var now=u.nowISO();
    var waitTime=openTime&&startTime?calcDiff(openTime,startTime):'-';
    var workTime=startTime?calcDiff(startTime,now):'-';
    var downTime=openTime?calcDiff(openTime,now):'-';

    var timeHtml='<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:16px;">'+
      '<h4 style="margin:0 0 12px 0;">Time Summary</h4>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
        '<div><strong>Opened:</strong> '+u.formatDateTime(openTime)+'</div>'+
        '<div><strong>Started:</strong> '+(startTime?u.formatDateTime(startTime):'-')+'</div>'+
        '<div><strong>Waiting Time:</strong> '+u.escHtml(waitTime)+'</div>'+
        '<div><strong>Working Time:</strong> <span class="cjc-live-work" data-start="'+u.escHtml(startTime)+'">'+u.escHtml(workTime)+'</span></div>'+
        '<div><strong>Downtime:</strong> <span class="cjc-live-down" data-start="'+u.escHtml(openTime)+'">'+u.escHtml(downTime)+'</span></div>'+
        '<div><strong>Machine:</strong> '+u.escHtml(jc.Machine||jc.MachineName||'-')+'</div>'+
      '</div>'+
    '</div>';

    var btOpts='<option value="">Select Breakdown Type</option>';
    _breakdownTypes.forEach(function(bt){
      var v=bt.BreakdownType||bt.Name||bt.Type||bt;
      if(typeof v==='string')btOpts+='<option value="'+u.escHtml(v)+'">'+u.escHtml(v)+'</option>';
    });

    var formHtml=timeHtml+
      '<div class="form-group" style="margin-bottom:12px;"><label>Breakdown Type</label>'+
        '<select id="cjc-bd-type" class="form-control">'+btOpts+'</select></div>'+
      '<div class="form-group" style="margin-bottom:12px;"><label>Root Cause <span class="req">*</span></label>'+
        '<input type="text" id="cjc-rootcause" class="form-control" required></div>'+
      '<div class="form-group" style="margin-bottom:12px;"><label>Corrective Action <span class="req">*</span></label>'+
        '<textarea id="cjc-corrective" class="form-control" rows="3" required></textarea></div>'+
      '<div class="form-group" style="margin-bottom:12px;"><label>Spare Parts</label>'+
        '<input type="text" id="cjc-spare" class="form-control" placeholder="Comma-separated list"></div>'+
      '<div class="form-group" style="margin-bottom:12px;"><label>Final Remarks</label>'+
        '<textarea id="cjc-remarks" class="form-control" rows="2"></textarea></div>'+
      '<div class="form-group" style="margin-bottom:12px;"><label>Repair Image</label>'+
        '<input type="file" id="cjc-image" class="form-control" accept="image/*"></div>'+
      '<input type="hidden" id="cjc-status" value="PENDING">';

    document.getElementById('cjc-modal-body').innerHTML=formHtml;
    document.getElementById('cjc-modal-footer').innerHTML=
      '<button class="btn btn-secondary" id="cjc-cancel">Cancel</button>'+
      '<button class="btn btn-primary" id="cjc-close-btn">Close Job Card</button>';

    document.getElementById('cjc-cancel').addEventListener('click',closeModal);
    document.getElementById('cjc-close-btn').addEventListener('click',function(){submitClose(jc);});
    document.getElementById('cjc-modal').style.display='flex';
  }

  function calcDiff(a,b){
    try{
      var d1=new Date(a),d2=new Date(b);
      if(isNaN(d1)||isNaN(d2))return'-';
      var diff=Math.abs(d2-d1);
      var h=Math.floor(diff/3600000);
      var m=Math.floor((diff%3600000)/60000);
      if(h>0)return h+'h '+m+'m';
      return m+'m';
    }catch(e){return'-';}
  }

  function closeModal(){
    document.getElementById('cjc-modal').style.display='none';
    _selectedJC=null;
  }

  function submitClose(jc){
    var rootCause=u.getVal('cjc-rootcause');
    var corrective=u.getVal('cjc-corrective');
    if(!rootCause||!corrective){u.showToast('Root Cause and Corrective Action are required','error');return;}

    var fileInput=document.getElementById('cjc-image');
    var doSubmit=function(imgData){
      var openTime=jc.OpenDateTime||'';
      var startTime=jc.StartedDateTime||'';
      var now=u.nowISO();
      var payload={
        id:jc.JobCardNo,JobCardNo:jc.JobCardNo,
        CurrentStatus:'PENDING',
        BreakdownType:u.getVal('cjc-bd-type')||'',
        RootCause:rootCause,
        CorrectiveAction:corrective,
        SpareParts:u.getVal('cjc-spare')||'',
        FinalRemarks:u.getVal('cjc-remarks')||'',
        PendingBy:(C.session.getUser()||{}).name||(C.session.getUser()||{}).Name||'',
        WaitingTime:openTime&&startTime?calcDiff(openTime,startTime):'',
        WorkingTime:startTime?calcDiff(startTime,now):'',
        Downtime:openTime?calcDiff(openTime,now):''
      };
      if(imgData)payload.RepairImage=imgData;

      var btn=document.getElementById('cjc-close-btn');
      if(btn)btn.disabled=true;
      C.api.mutate('updateJobCard',payload).then(function(){
        u.showToast('Job card closed and sent for review','success');
        closeModal();load();
      }).catch(function(err){
        u.showToast('Failed: '+(err.message||err),'error');
      }).finally(function(){
        if(btn)btn.disabled=false;
      });
    };

    if(fileInput&&fileInput.files&&fileInput.files[0]){
      var reader=new FileReader();
      reader.onload=function(ev){doSubmit(ev.target.result);};
      reader.readAsDataURL(fileInput.files[0]);
    }else{
      doSubmit(null);
    }
  }

  function render(){
    var wrap=document.getElementById('cjc-table-wrap');
    if(!wrap)return;
    if(_runningJobs.length===0){wrap.innerHTML='<div style="padding:40px;text-align:center;color:#888;">No running job cards to close.</div>';return;}

    var h='<table class="data-table"><thead><tr><th>JobCardNo</th><th>Open Date</th><th>Machine</th><th>Department</th><th>Priority</th><th>Technician</th><th>Working Time</th><th>Action</th></tr></thead><tbody>';
    _runningJobs.forEach(function(r){
      var workStart=r.StartedDateTime||r.OpenDateTime;
      h+='<tr>'+
        '<td>'+u.escHtml(r.JobCardNo)+'</td>'+
        '<td>'+u.formatDateTime(r.OpenDateTime)+'</td>'+
        '<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>'+
        '<td>'+u.escHtml(r.Department||'-')+'</td>'+
        '<td>'+u.priorityBadge(r.Priority)+'</td>'+
        '<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>'+
        '<td class="live-time" data-start="'+u.escHtml(workStart)+'">'+u.timeAgo(workStart)+'</td>'+
        '<td><button class="btn btn-sm btn-warning btn-close-jc" data-jc="'+u.escHtml(r.JobCardNo)+'">Close</button></td>'+
      '</tr>';
    });
    h+='</tbody></table>';
    wrap.innerHTML=h;

    wrap.querySelectorAll('.btn-close-jc').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-jc');
        var jc=_runningJobs.find(function(r){return r.JobCardNo===id;});
        if(jc)openCloseModal(jc);
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

    if(document.querySelector('.cjc-live-work')){
      var tid2=setInterval(function(){
        var el=document.querySelector('.cjc-live-work[data-start]');
        if(el){var s=el.getAttribute('data-start');if(s)el.textContent=u.timeAgo(s);}
        var el2=document.querySelector('.cjc-live-down[data-start]');
        if(el2){var s2=el2.getAttribute('data-start');if(s2)el2.textContent=u.timeAgo(s2);}
      },60000);
      _timers.push(tid2);
    }
    u.showLoading(false);
  }

  function load(){
    u.showLoading(true);
    Promise.all([
      C.api.call('getJobCards'),
      C.api.call('getBreakdownTypes').catch(function(){return[];})
    ]).then(function(res){
      _runningJobs=(res[0]||[]).filter(function(r){return r.CurrentStatus==='RUNNING';});
      _breakdownTypes=res[1]||[];
      render();
    }).catch(function(){u.showLoading(false);u.showToast('Failed to load data','error');});
  }

  function destroy(){
    _runningJobs=[];_breakdownTypes=[];_selectedJC=null;
    _timers.forEach(clearInterval);_timers=[];
    closeModal();
  }

  C.router.registerPage('closejc',{title:'Close Job Card',init:init,load:load,destroy:destroy});
})();
