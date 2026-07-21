(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _pendingJobs=[];
  var _timers=[];
  var _selectedJC=null;
  var _reviewMode='approve';

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML='<div class="approvejc-page">'+
      '<div class="page-header"><h2>Approve Job Cards</h2></div>'+
      '<div id="ajc-table-wrap" class="table-wrap"></div>'+
    '</div>'+
    '<div id="ajc-view-modal" class="modal" style="display:none;">'+
      '<div class="modal-content" style="max-width:700px;">'+
        '<div class="modal-header"><h3 id="ajc-view-title">Job Card Details</h3><button class="modal-close" id="ajc-view-close">&times;</button></div>'+
        '<div class="modal-body" id="ajc-view-body"></div>'+
        '<div class="modal-footer"><button class="btn btn-secondary" id="ajc-view-ok">Close</button></div>'+
      '</div>'+
    '</div>'+
    '<div id="ajc-review-modal" class="modal" style="display:none;">'+
      '<div class="modal-content" style="max-width:600px;">'+
        '<div class="modal-header"><h3 id="ajc-review-title">Review Job Card</h3><button class="modal-close" id="ajc-review-close">&times;</button></div>'+
        '<div class="modal-body" id="ajc-review-body"></div>'+
        '<div class="modal-footer" id="ajc-review-footer"></div>'+
      '</div>'+
    '</div>';
    bindEvents();
  }

  function bindEvents(){
    document.getElementById('ajc-view-close').addEventListener('click',function(){document.getElementById('ajc-view-modal').style.display='none';});
    document.getElementById('ajc-view-ok').addEventListener('click',function(){document.getElementById('ajc-view-modal').style.display='none';});
    document.getElementById('ajc-view-modal').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
    document.getElementById('ajc-review-close').addEventListener('click',function(){document.getElementById('ajc-review-modal').style.display='none';_selectedJC=null;});
    document.getElementById('ajc-review-modal').addEventListener('click',function(e){if(e.target===this){this.style.display='none';_selectedJC=null;}});
  }

  function openViewModal(jc){
    _selectedJC=jc;
    document.getElementById('ajc-view-title').textContent='Job Card: '+u.escHtml(jc.JobCardNo);

    var timeHtml='<div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:12px;">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
        '<div><strong>Waiting Time:</strong> '+u.escHtml(jc.WaitingTime||'-')+'</div>'+
        '<div><strong>Working Time:</strong> '+u.escHtml(jc.WorkingTime||'-')+'</div>'+
        '<div><strong>Downtime:</strong> '+u.escHtml(jc.Downtime||'-')+'</div>'+
      '</div>'+
    '</div>';

    var html=timeHtml+'<table class="detail-table" style="width:100%">'+
      '<tr><td><strong>Job Card No</strong></td><td>'+u.escHtml(jc.JobCardNo)+'</td></tr>'+
      '<tr><td><strong>Status</strong></td><td>'+u.statusBadge(jc.CurrentStatus)+'</td></tr>'+
      '<tr><td><strong>Open Date</strong></td><td>'+u.formatDateTime(jc.OpenDateTime)+'</td></tr>'+
      '<tr><td><strong>Started</strong></td><td>'+(jc.StartedDateTime?u.formatDateTime(jc.StartedDateTime):'-')+'</td></tr>'+
      '<tr><td><strong>Closed</strong></td><td>'+(jc.CloseDateTime?u.formatDateTime(jc.CloseDateTime):'-')+'</td></tr>'+
      '<tr><td><strong>Pending Date</strong></td><td>'+(jc.PendingDateTime?u.formatDateTime(jc.PendingDateTime):'-')+'</td></tr>'+
      '<tr><td><strong>Machine</strong></td><td>'+u.escHtml(jc.Machine||jc.MachineName||'-')+'</td></tr>'+
      '<tr><td><strong>Department</strong></td><td>'+u.escHtml(jc.Department||'-')+'</td></tr>'+
      '<tr><td><strong>Section</strong></td><td>'+u.escHtml(jc.Section||'-')+'</td></tr>'+
      '<tr><td><strong>Asset</strong></td><td>'+u.escHtml(jc.AssetID||'-')+'</td></tr>'+
      '<tr><td><strong>Priority</strong></td><td>'+u.priorityBadge(jc.Priority)+'</td></tr>'+
      '<tr><td><strong>Technician</strong></td><td>'+u.escHtml(jc.AssignedTechnician||'-')+'</td></tr>'+
      '<tr><td><strong>Team</strong></td><td>'+u.escHtml(jc.MaintenanceTeam||'-')+'</td></tr>'+
      '<tr><td><strong>Complaint</strong></td><td>'+u.escHtml(jc.ComplaintDescription||'-')+'</td></tr>'+
      '<tr><td><strong>Breakdown Type</strong></td><td>'+u.escHtml(jc.BreakdownType||'-')+'</td></tr>'+
      '<tr><td><strong>Root Cause</strong></td><td>'+u.escHtml(jc.RootCause||'-')+'</td></tr>'+
      '<tr><td><strong>Corrective Action</strong></td><td>'+u.escHtml(jc.CorrectiveAction||'-')+'</td></tr>'+
      '<tr><td><strong>Spare Parts</strong></td><td>'+u.escHtml(jc.SpareParts||'-')+'</td></tr>'+
      '<tr><td><strong>Final Remarks</strong></td><td>'+u.escHtml(jc.FinalRemarks||'-')+'</td></tr>'+
      '<tr><td><strong>Pending By</strong></td><td>'+u.escHtml(jc.PendingBy||'-')+'</td></tr>'+
      '<tr><td><strong>Closed By</strong></td><td>'+u.escHtml(jc.ClosedBy||'-')+'</td></tr>'+
    '</table>';
    document.getElementById('ajc-view-body').innerHTML=html;
    document.getElementById('ajc-view-modal').style.display='flex';
  }

  function openReviewModal(jc){
    _selectedJC=jc;
    _reviewMode='approve';
    document.getElementById('ajc-review-title').textContent='Review: '+u.escHtml(jc.JobCardNo);
    renderReviewForm();
    document.getElementById('ajc-review-modal').style.display='flex';
  }

  function renderReviewForm(){
    var jc=_selectedJC;
    if(!jc)return;

    var toggleHtml='<div style="display:flex;gap:0;margin-bottom:16px;border-radius:8px;overflow:hidden;border:1px solid #ddd;">'+
      '<button class="btn ajc-toggle'+(_reviewMode==='approve'?' btn-success':' btn-secondary')+'" data-mode="approve" style="flex:1;border-radius:0;">Approve</button>'+
      '<button class="btn ajc-toggle'+(_reviewMode==='return'?' btn-danger':' btn-secondary')+'" data-mode="return" style="flex:1;border-radius:0;">Return</button>'+
    '</div>';

    var formHtml='';
    if(_reviewMode==='approve'){
      formHtml='<div class="form-group" style="margin-bottom:12px;"><label>Approval Remarks</label>'+
        '<textarea id="ajc-approve-remarks" class="form-control" rows="3" placeholder="Optional approval notes..."></textarea></div>';
    }else{
      formHtml='<div class="form-group" style="margin-bottom:12px;"><label>Return Reason <span class="req">*</span></label>'+
        '<textarea id="ajc-return-reason" class="form-control" rows="2" required></textarea></div>'+
        '<div class="form-group" style="margin-bottom:12px;"><label>Remarks</label>'+
        '<textarea id="ajc-approve-remarks" class="form-control" rows="2"></textarea></div>';
    }

    document.getElementById('ajc-review-body').innerHTML=toggleHtml+formHtml;

    document.querySelectorAll('.ajc-toggle').forEach(function(btn){
      btn.addEventListener('click',function(){
        _reviewMode=btn.getAttribute('data-mode');
        renderReviewForm();
      });
    });

    var footerHtml='';
    if(_reviewMode==='approve'){
      footerHtml='<button class="btn btn-secondary" id="ajc-review-cancel">Cancel</button>'+
        '<button class="btn btn-success" id="ajc-review-submit">Approve</button>';
    }else{
      footerHtml='<button class="btn btn-secondary" id="ajc-review-cancel">Cancel</button>'+
        '<button class="btn btn-danger" id="ajc-review-submit">Return</button>';
    }
    document.getElementById('ajc-review-footer').innerHTML=footerHtml;

    document.getElementById('ajc-review-cancel').addEventListener('click',function(){
      document.getElementById('ajc-review-modal').style.display='none';_selectedJC=null;
    });
    document.getElementById('ajc-review-submit').addEventListener('click',submitReview);
  }

  function submitReview(){
    var jc=_selectedJC;
    if(!jc)return;

    var remarks=u.getVal('ajc-approve-remarks')||'';

    if(_reviewMode==='approve'){
      var btn=document.getElementById('ajc-review-submit');
      if(btn)btn.disabled=true;
      C.api.mutate('approveJobCard',{id:jc.JobCardNo,JobCardNo:jc.JobCardNo,ApprovalRemarks:remarks}).then(function(){
        u.showToast('Job card approved successfully','success');
        document.getElementById('ajc-review-modal').style.display='none';
        _selectedJC=null;load();
      }).catch(function(err){
        u.showToast('Failed: '+(err.message||err),'error');
      }).finally(function(){if(btn)btn.disabled=false;});
    }else{
      var returnReason=u.getVal('ajc-return-reason');
      if(!returnReason){u.showToast('Return reason is required','error');return;}
      var btn2=document.getElementById('ajc-review-submit');
      if(btn2)btn2.disabled=true;
      C.api.mutate('returnJobCard',{id:jc.JobCardNo,JobCardNo:jc.JobCardNo,ReturnReason:returnReason,ApprovalRemarks:remarks}).then(function(){
        u.showToast('Job card returned for rework','success');
        document.getElementById('ajc-review-modal').style.display='none';
        _selectedJC=null;load();
      }).catch(function(err){
        u.showToast('Failed: '+(err.message||err),'error');
      }).finally(function(){if(btn2)btn2.disabled=false;});
    }
  }

  function render(){
    var wrap=document.getElementById('ajc-table-wrap');
    if(!wrap)return;
    if(_pendingJobs.length===0){wrap.innerHTML='<div style="padding:40px;text-align:center;color:#888;">No job cards pending approval.</div>';return;}

    var h='<table class="data-table"><thead><tr><th>JobCardNo</th><th>Close Date</th><th>Machine</th><th>Department</th><th>Technician</th><th>Waiting Time</th><th>Working Time</th><th>Downtime</th><th>Action</th></tr></thead><tbody>';
    _pendingJobs.forEach(function(r){
      h+='<tr>'+
        '<td>'+u.escHtml(r.JobCardNo)+'</td>'+
        '<td>'+u.formatDateTime(r.CloseDateTime)+'</td>'+
        '<td>'+u.escHtml(r.Machine||r.MachineName||'-')+'</td>'+
        '<td>'+u.escHtml(r.Department||'-')+'</td>'+
        '<td>'+u.escHtml(r.AssignedTechnician||'-')+'</td>'+
        '<td>'+u.escHtml(r.WaitingTime||'-')+'</td>'+
        '<td>'+u.escHtml(r.WorkingTime||'-')+'</td>'+
        '<td>'+u.escHtml(r.Downtime||'-')+'</td>'+
        '<td style="white-space:nowrap">'+
          '<button class="btn btn-sm btn-view" data-view="'+u.escHtml(r.JobCardNo)+'">'+CMMS.icons.view+'</button> '+
          '<button class="btn btn-sm btn-primary btn-review" data-review="'+u.escHtml(r.JobCardNo)+'">Review</button>'+
        '</td>'+
      '</tr>';
    });
    h+='</tbody></table>';
    wrap.innerHTML=h;

    wrap.querySelectorAll('.btn-view').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-view');
        var jc=_pendingJobs.find(function(r){return r.JobCardNo===id;});
        if(jc)openViewModal(jc);
      });
    });
    wrap.querySelectorAll('.btn-review').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-review');
        var jc=_pendingJobs.find(function(r){return r.JobCardNo===id;});
        if(jc)openReviewModal(jc);
      });
    });
    u.showLoading(false);
  }

  function load(){
    u.showLoading(true);
    C.api.call('getJobCards').then(function(d){
      _pendingJobs=(d||[]).filter(function(r){return r.CurrentStatus==='PENDING';});
      render();
    }).catch(function(){u.showLoading(false);u.showToast('Failed to load job cards','error');});
  }

  function destroy(){
    _pendingJobs=[];_selectedJC=null;
    _timers.forEach(clearInterval);_timers=[];
    document.getElementById('ajc-view-modal').style.display='none';
    document.getElementById('ajc-review-modal').style.display='none';
  }

  C.router.registerPage('approvejc',{title:'Approve Job Cards',init:init,load:load,destroy:destroy});
})();
