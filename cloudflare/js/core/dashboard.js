(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};
var U=C.utils;

var _filter='all';
var _chartsLoaded=false;
var _charts={};
var _kpiTimer=null;
var _autoRefreshTimer=null;
var _notifPage=1;
var _notifPageSize=5;
var _notifTotal=0;
var _notifAllItems=[];

var STAT_IDS=[
  'statMachines','statRunningMachines','statUnderMaintenance',
  'statOpenJobs','statRunningJobs','statClosedJobs','statApprovedJobs',
  'statPendingJobs','statWaitingJobs',
  'statTotalWaitingTime','statTotalWorkingTime','statTotalRepairTime','statBreakdownHours',
  'statMTTR','statMTBF','statAvailability',
  'statPMDue','statPMOverdue','statLowStock','statOutOfStock',
  'statPMCompliance','statStockValue'
];

var CHART_IDS=[
  'chartJobStatus','chartPriority','chartMTTR','chartMTBF',
  'chartMonthlyJobs','chartBreakdown','chartWaitingTime',
  'chartDowntime','chartMonthlyMaintenance'
];

var KPI_TOGGLE_IDS=['statTotalWaitingTime','statTotalWorkingTime','statTotalRepairTime','statBreakdownHours'];
var _kpiPhase=0;
var _lastKpiValues={};

function init(container){
  var el=container||U.$('page-dashboard');
  if(!el)return;
  el.innerHTML=buildHTML();
  bindEvents();
  startKPIToggle();
}

function buildHTML(){
  var html='<div class="dashboard-filter-bar" style="display:flex;gap:6px;align-items:center;margin-bottom:16px;flex-wrap:wrap">'
    +'<button class="filter-btn" data-filter="today">Today</button>'
    +'<button class="filter-btn" data-filter="week">This Week</button>'
    +'<button class="filter-btn" data-filter="month">This Month</button>'
    +'<button class="filter-btn" data-filter="lastmonth">Last Month</button>'
    +'<button class="filter-btn active" data-filter="all">All Time</button>'
    +'<div style="flex:1"></div>'
    +'<button class="scan-qr-btn" id="dashScanQR" title="Scan QR Code" style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;font-size:12px;font-weight:500">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>'
    +'Scan QR</button></div>';

  html+='<div class="dashboard-grid" id="dashboardCards">';
  html+=statCard('statMachines','Total Machines','stat-primary','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>');
  html+=statCard('statRunningMachines','Running','stat-success','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>');
  html+=statCard('statUnderMaintenance','Under Maintenance','stat-danger','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
  html+=statCard('statOpenJobs','Open Jobs','stat-open','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>');
  html+=statCard('statRunningJobs','Running Jobs','stat-running','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>');
  html+=statCard('statClosedJobs','Closed Jobs','stat-closed','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>');
  html+=statCard('statApprovedJobs','Approved Jobs','stat-approved','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>');
  html+=statCard('statPendingJobs','Pending Approval','stat-pending','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>');
  html+=statCard('statWaitingJobs','Waiting Jobs','stat-warning','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>');
  html+=statCard('statTotalWaitingTime','Total Waiting Time','stat-warning','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',true);
  html+=statCard('statTotalWorkingTime','Total Working Time','stat-info','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',true);
  html+=statCard('statTotalRepairTime','Total Repair Time','stat-success','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',true);
  html+=statCard('statBreakdownHours','Total Downtime','stat-danger','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',true);
  html+=statCard('statMTTR','MTTR (hrs)','stat-info','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 18l3 3 3-3"/><path d="M4 12h2l3-9 3 9h2"/></svg>');
  html+=statCard('statMTBF','MTBF (hrs)','stat-success','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 18l3 3 3-3"/><path d="M20 12h-2l-3-9L9 3l-3 9H4"/></svg>');
  html+=statCard('statAvailability','Availability','stat-primary','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>');
  html+=statCard('statPMDue','PM Due','stat-purple','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>');
  html+=statCard('statPMOverdue','PM Overdue','stat-orange','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4M12 16h.01"/></svg>');
  html+=statCard('statLowStock','Low Stock Parts','stat-primary','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>');
  html+=statCard('statOutOfStock','Out of Stock','stat-danger','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
  html+=statCard('statPMCompliance','PM Compliance','stat-success','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>');
  html+=statCard('statStockValue','Inventory Value','stat-success','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>');
  html+='</div>';

  html+='<div class="card" id="dashboardFooter" style="margin-bottom:16px;padding:14px 20px"><div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">'
    +'<div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:var(--danger);flex-shrink:0"></div><span style="font-size:12px;color:var(--text-muted)">Unread Notifications</span><span style="font-size:18px;font-weight:700;color:var(--danger)" id="dashFooterUnread">0</span></div>'
    +'<div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></div><span style="font-size:12px;color:var(--text-muted)">Critical</span><span style="font-size:18px;font-weight:700;color:#ef4444" id="dashFooterCritical">0</span></div>'
    +'<div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:var(--purple);flex-shrink:0"></div><span style="font-size:12px;color:var(--text-muted)">Pending Approval</span><span style="font-size:18px;font-weight:700;color:var(--purple)" id="dashFooterApproval">0</span></div>'
    +'<div style="flex:1"></div>'
    +'<div style="display:flex;align-items:center;gap:8px;border-left:1px solid var(--border);padding-left:20px"><span style="font-size:12px;color:var(--text-muted)">Total Job Cards</span><span style="font-size:18px;font-weight:700;color:var(--primary)" id="dashFooterTotalJC">0</span></div>'
    +'</div></div>';

  html+='<div class="dashboard-grid" style="margin-bottom:16px;grid-template-columns:1fr"><div class="card" style="padding:0"><div class="card-header" style="padding:14px 18px"><div class="card-title" style="font-size:14px;font-weight:600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>Recent Notifications</div><div class="card-actions"><button class="btn btn-xs btn-primary" id="dashNotifViewAll">View All</button></div></div><div id="dashboardNotifications" style="padding:0 18px 14px"><div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Loading notifications...</div></div></div></div>';

  html+='<div class="dashboard-grid" style="margin-bottom:16px;grid-template-columns:1fr"><div class="card" style="padding:0"><div class="card-header" style="padding:14px 18px"><div class="card-title" style="font-size:14px;font-weight:600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>Recent Activities</div><div class="card-actions"><button class="btn btn-xs btn-secondary" id="dashActivityViewAll">View All</button></div></div><div id="dashboardRecentActivities" style="padding:0 18px 14px"><div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Loading activities...</div></div></div></div>';

  html+='<div class="charts-grid">';
  html+='<div class="chart-card"><div class="card-title">Job Status Overview <span class="chart-badge" id="jobStatusBadge">Current</span></div><div id="chartJobStatus" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Priority Distribution <span class="chart-badge" id="priorityBadge">Current</span></div><div id="chartPriority" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">MTTR Trend <span class="chart-badge" id="mttrBadge">6 Months</span></div><div id="chartMTTR" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">MTBF Trend <span class="chart-badge" id="mtbfBadge">6 Months</span></div><div id="chartMTBF" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Monthly Jobs <span class="chart-badge" id="monthlyJobsBadge">6 Months</span></div><div id="chartMonthlyJobs" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Breakdown Trend <span class="chart-badge" id="breakdownBadge">6 Months</span></div><div id="chartBreakdown" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Machine Status <span class="chart-badge" id="machineStatusBadge">Current</span></div><div id="chartMachineStatus" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Department Distribution <span class="chart-badge" id="deptBadge">Jobs</span></div><div id="chartDepartment" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Waiting Time Trend <span class="chart-badge" id="waitingTimeBadge">6 Periods</span></div><div id="chartWaitingTime" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Downtime Trend <span class="chart-badge" id="downtimeBadge">6 Periods</span></div><div id="chartDowntime" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='<div class="chart-card"><div class="card-title">Monthly Maintenance Trend <span class="chart-badge" id="monthlyMaintBadge">6 Periods</span></div><div id="chartMonthlyMaintenance" style="min-height:280px;height:280px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">Loading chart...</div></div>';
  html+='</div>';
  return html;
}

function statCard(id,label,cls,icon,kpi){
  return '<div class="stat-card '+cls+(kpi?' kpi-toggle':'')+'">'
    +'<div class="stat-inner"><div class="stat-icon">'+icon+'</div>'
    +'<div class="stat-info"><h3 id="'+id+'">0</h3><p>'+U.escHtml(label)+'</p></div>'
    +'</div></div>';
}

function bindEvents(){
  var filterBar=document.querySelector('.dashboard-filter-bar');
  if(filterBar){
    filterBar.addEventListener('click',function(e){
      var btn=e.target.closest('.filter-btn');
      if(!btn)return;
      var filter=btn.dataset.filter;
      if(!filter)return;
      filterBar.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      _filter=filter;
      loadData();
    });
  }
  var scanBtn=U.$('dashScanQR');
  if(scanBtn){
    scanBtn.addEventListener('click',function(){
      if(C.router)C.router.navigateTo('qr');
    });
  }
  var notifViewAll=U.$('dashNotifViewAll');
  if(notifViewAll){
    notifViewAll.addEventListener('click',function(){
      if(C.router)C.router.navigateTo('notifications');
    });
  }
  var actViewAll=U.$('dashActivityViewAll');
  if(actViewAll){
    actViewAll.addEventListener('click',function(){
      if(C.router)C.router.navigateTo('audit');
    });
  }
}

function toIntMinutes(val){
  if(val===null||val===undefined||val==='')return 0;
  if(typeof val==='number')return Math.floor(val);
  if(typeof val!=='string')return 0;
  var s=val.trim();
  if(s===''||s.toLowerCase()==='n/a')return 0;
  var daysTimeMatch=s.match(/(\d+)\s+[Dd]ays?\s+(\d{1,2}):(\d{2})/);
  if(daysTimeMatch)return parseInt(daysTimeMatch[1])*1440+parseInt(daysTimeMatch[2])*60+parseInt(daysTimeMatch[3]);
  var hmMatch=s.match(/^(\d+):(\d{2})$/);
  if(hmMatch)return parseInt(hmMatch[1])*60+parseInt(hmMatch[2]);
  var hmsMatch=s.match(/^(\d+):(\d{2}):(\d{2})$/);
  if(hmsMatch)return parseInt(hmsMatch[1])*60+parseInt(hmsMatch[2]);
  var num=parseFloat(s);
  if(!isNaN(num)){
    if(num>0&&num<100)return Math.round(num*60);
    return Math.floor(num);
  }
  return 0;
}

function fmtDuration(minutes){
  if(!minutes&&minutes!==0)return '0h 0m';
  minutes=Math.floor(minutes);
  var d=Math.floor(minutes/1440);
  var h=Math.floor((minutes%1440)/60);
  var m=minutes%60;
  if(d>0)return d+'d '+h+'h '+m+'m';
  if(h>0)return h+'h '+U.pad(m)+'m';
  return m+'m';
}

function fmtHours(minutes){
  if(!minutes&&minutes!==0)return '0h 0m';
  minutes=Math.floor(minutes);
  var h=Math.floor(minutes/60);
  var m=minutes%60;
  return h+'h '+U.pad(m)+'m';
}

function loadData(){
  if(!C.api)return;
  var user=C.session?C.session.getUser():null;
  var params={filter:_filter};
  if(user){
    if(user.department)params.department=user.department;
    if(user.email)params.email=user.email;
  }
  C.api.call('getDashboardData',params).then(function(data){
    populateStats(data);
    drawCharts(data);
  }).catch(function(err){
    console.error('[Dashboard] Load failed:',err);
    CHART_IDS.forEach(function(id){
      var el=U.$(id);
      if(el)el.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">Failed to load chart data</div>';
    });
  });
  loadNotifications();
  loadActivities();
  startAutoRefresh();
}

function populateStats(d){
  setTextSmart('statMachines',d.totalMachines);
  setTextSmart('statRunningMachines',d.runningMachines);
  setTextSmart('statUnderMaintenance',d.breakdownMachines);
  setTextSmart('statOpenJobs',d.openJobs);
  setTextSmart('statRunningJobs',d.runningJobs);
  setTextSmart('statClosedJobs',d.closedJobs);
  setTextSmart('statApprovedJobs',d.approvedJobs);
  setTextSmart('statPendingJobs',d.pendingApprovalJobs||0);
  setTextSmart('statWaitingJobs',d.waitingJobs);

  var wMin=toIntMinutes(d.totalWaitingTimeMinutes);
  var wkMin=toIntMinutes(d.totalWorkingTimeMinutes);
  var rMin=toIntMinutes(d.totalRepairTimeMinutes);
  var dMin=toIntMinutes(d.totalDowntimeMinutes!=null?d.totalDowntimeMinutes:Math.round((d.breakdownHours||0)*60));

  _lastKpiValues={waiting:wMin,working:wkMin,repair:rMin,downtime:dMin};

  setTextSmart('statTotalWaitingTime',fmtDuration(wMin));
  setTextSmart('statTotalWorkingTime',fmtDuration(wkMin));
  setTextSmart('statTotalRepairTime',fmtDuration(rMin));
  setTextSmart('statBreakdownHours',fmtDuration(dMin));

  setTextSmart('statMTTR',d.mttr!=null?parseFloat(d.mttr).toFixed(2)+' hrs':'N/A');
  setTextSmart('statMTBF',d.mtbf!=null?parseFloat(d.mtbf).toFixed(2)+' hrs':'N/A');
  setTextSmart('statAvailability',(d.availability||0).toFixed(2)+'%');
  setTextSmart('statPMDue',d.pmDue);
  setTextSmart('statPMOverdue',d.pmOverdue);
  setTextSmart('statLowStock',d.lowStockParts);
  setTextSmart('statOutOfStock',d.outOfStockParts);
  setTextSmart('statPMCompliance',(d.pmCompliance||0)+'%');
  setTextSmart('statStockValue','PKR '+Number(d.totalStockValue||0).toLocaleString('en-PK'));

  setTextSmart('dashFooterUnread',d.notifUnread||0);
  setTextSmart('dashFooterCritical',d.notifCritical||0);
  setTextSmart('dashFooterApproval',d.pendingApprovalJobs||0);
  setTextSmart('dashFooterTotalJC',d.totalJobCards||0);
}

function setTextSmart(id,val){
  var el=U.$(id);
  if(!el)return;
  el.textContent=val!=null?val:'0';
}

function startKPIToggle(){
  stopKPIToggle();
  _kpiPhase=0;
  _kpiTimer=setInterval(function(){
    _kpiPhase++;
    var isHours=_kpiPhase%2===1;
    KPI_TOGGLE_IDS.forEach(function(id){
      var el=U.$(id);
      if(!el)return;
      var key=id.replace('stat','').charAt(0).toLowerCase()+id.replace('stat','').slice(1);
      var minVal=_lastKpiValues[key]||0;
      if(id==='statTotalWaitingTime')minVal=_lastKpiValues.waiting||0;
      else if(id==='statTotalWorkingTime')minVal=_lastKpiValues.working||0;
      else if(id==='statTotalRepairTime')minVal=_lastKpiValues.repair||0;
      else if(id==='statBreakdownHours')minVal=_lastKpiValues.downtime||0;
      el.textContent=isHours?fmtHours(minVal):fmtDuration(minVal);
    });
  },3000);
}

function stopKPIToggle(){
  if(_kpiTimer){clearInterval(_kpiTimer);_kpiTimer=null;}
}

function drawCharts(data){
  if(typeof google==='undefined'||!google.charts){
    setTimeout(function(){drawCharts(data);},500);
    return;
  }
  if(!_chartsLoaded){
    google.charts.load('current',{packages:['corechart']});
    google.charts.setOnLoadCallback(function(){
      _chartsLoaded=true;
      doDrawCharts(data);
    });
  }else{
    doDrawCharts(data);
  }
}

function doDrawCharts(data){
  var c=data.charts||{};
  var months=c.months||[];
  var op=c.openJobs||[];
  var rn=c.runningJobs||[];
  var cl=c.closedJobs||[];
  var pd=c.pendingJobs||[];
  var ap=c.approvedJobs||[];
  var bd=c.breakdowns||[];
  var mt=c.mttr||[];
  var mf=c.mtbf||[];
  var anim={startup:true,duration:800,easing:'out'};
  var tipStyle='text-align:left;padding:10px 14px;font-size:13px;line-height:1.6;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:inherit;';

  drawJobStatus(data,anim,tipStyle);
  drawPriority(data,anim,tipStyle);
  drawMTTR(months,mt,data,anim,tipStyle);
  drawMTBF(months,mf,anim,tipStyle);
  drawMonthlyJobs(months,op,rn,pd,cl,ap,anim,tipStyle);
  drawBreakdown(months,bd,anim,tipStyle);
  drawMachineStatus(data,anim,tipStyle);
  drawDepartment(data,anim,tipStyle);
  drawWaitingTime(months,c.waitingTime||[],anim,tipStyle);
  drawDowntime(months,c.downtime||[],anim,tipStyle);
  drawMonthlyMaintenance(months,op,rn,cl,c.monthlyMaintenance||[],anim,tipStyle);
}

function drawJobStatus(data,anim,tipStyle){
  var div=U.$('chartJobStatus');if(!div)return;
  var items=[
    {name:'Open',count:data.openJobs||0,color:'#3B82F6'},
    {name:'Running',count:data.runningJobs||0,color:'#22C55E'},
    {name:'Closed',count:data.closedJobs||0,color:'#6B7280'},
    {name:'Pending',count:data.pendingJobs||0,color:'#F97316'},
    {name:'Approved',count:data.approvedJobs||0,color:'#A855F7'}
  ];
  var total=items.reduce(function(s,r){return s+r.count;},0);
  if(total===0){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No job status data</div>';return;}
  div.innerHTML='';
  var rows=[['Status','Count',{role:'style'},{role:'tooltip',type:'string',p:{html:true}}]];
  items.forEach(function(r){
    var pct=total>0?Math.round((r.count/total)*100):0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:'+r.color+'">'+r.name+'</div><div>Jobs: <b>'+r.count+'</b></div><div>Share: <b>'+pct+'%</b> of '+total+' total</div></div>';
    rows.push([r.name,r.count,r.color,tip]);
  });
  var dt=new google.visualization.arrayToDataTable(rows);
  var opts={backgroundColor:'transparent',chartArea:{left:40,right:20,top:20,bottom:50,width:'90%',height:'65%'},legend:{position:'bottom',textStyle:{color:'#9498b8',fontSize:11}},hAxis:{textStyle:{color:'#9498b8',fontSize:11},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},bar:{groupWidth:'60%'},tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim};
  _charts.jobStatus=new google.visualization.ColumnChart(div);
  _charts.jobStatus.draw(dt,opts);
  var badge=U.$('jobStatusBadge');if(badge)badge.textContent=total+' jobs';
}

function drawPriority(data,anim,tipStyle){
  var div=U.$('chartPriority');if(!div)return;
  var items=[
    {name:'Critical',count:data.criticalPriority||0,color:'#EF4444'},
    {name:'High',count:data.highPriority||0,color:'#F97316'},
    {name:'Medium',count:data.mediumPriority||0,color:'#3B82F6'},
    {name:'Low',count:data.lowPriority||0,color:'#22C55E'}
  ];
  var total=items.reduce(function(s,r){return s+r.count;},0);
  if(total===0){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No priority data</div>';return;}
  div.innerHTML='';
  var rows=[['Priority','Count',{role:'tooltip',type:'string',p:{html:true}}]];
  items.forEach(function(r){
    var pct=total>0?Math.round((r.count/total)*100):0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;font-size:14px;margin-bottom:4px;color:'+r.color+'">'+r.name+'</div><div>Jobs: <b>'+r.count+'</b></div><div>Share: <b>'+pct+'%</b></div></div>';
    rows.push([r.name,r.count,tip]);
  });
  var dt=new google.visualization.arrayToDataTable(rows);
  var colors=items.map(function(r){return r.color;});
  _charts.priority=new google.visualization.PieChart(div);
  _charts.priority.draw(dt,{backgroundColor:'transparent',chartArea:{left:10,right:10,top:10,bottom:40,width:'90%',height:'70%'},legend:{position:'bottom',textStyle:{color:'#9498b8',fontSize:11}},colors:colors,pieHole:0.45,tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},pieSliceText:'none',animation:anim});
}

function drawMTTR(months,mt,data,anim,tipStyle){
  var div=U.$('chartMTTR');if(!div)return;
  var hasData=mt.some(function(v){return v!==null&&v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No MTTR data available</div>';return;}
  div.innerHTML='';
  var rows=[['Period','MTTR (hrs)',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var val=(mt[i]!==null&&mt[i]>0)?parseFloat(mt[i].toFixed(2)):0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#3B82F6">MTTR</div><div>Period: <b>'+months[i]+'</b></div><div>MTTR: <b>'+(val>0?val.toFixed(2)+' hrs':'N/A')+'</b></div></div>';
    rows.push([months[i],val,tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.mttr=new google.visualization.LineChart(div);
  _charts.mttr.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#3B82F6'],curveType:'function',lineWidth:3,pointSize:6,pointShape:'circle',tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
  var badge=U.$('mttrBadge');if(badge&&data.mttr)badge.textContent=parseFloat(data.mttr).toFixed(2)+' hrs';
}

function drawMTBF(months,mf,anim,tipStyle){
  var div=U.$('chartMTBF');if(!div)return;
  var hasData=mf.some(function(v){return v!==null&&v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No MTBF data available</div>';return;}
  div.innerHTML='';
  var rows=[['Period','MTBF (hrs)',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var val=(mf[i]!==null&&mf[i]>0)?parseFloat(mf[i].toFixed(2)):0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#22C55E">MTBF</div><div>Period: <b>'+months[i]+'</b></div><div>MTBF: <b>'+(val>0?val.toFixed(2)+' hrs':'N/A')+'</b></div></div>';
    rows.push([months[i],val,tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.mtbf=new google.visualization.LineChart(div);
  _charts.mtbf.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#22C55E'],curveType:'function',lineWidth:3,pointSize:6,pointShape:'circle',tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
  var badge=U.$('mtbfBadge');if(badge&&mf.length){var last=mf[mf.length-1];if(last>0)badge.textContent=last.toFixed(2)+' hrs';}
}

function drawMonthlyJobs(months,op,rn,pd,cl,ap,anim,tipStyle){
  var div=U.$('chartMonthlyJobs');if(!div)return;
  var hasData=op.some(function(v){return v>0;})||rn.some(function(v){return v>0;})||cl.some(function(v){return v>0;})||pd.some(function(v){return v>0;})||ap.some(function(v){return v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No monthly job data</div>';return;}
  var rows=[['Month','Open','Running','Pending','Closed','Approved',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var total=op[i]+rn[i]+pd[i]+cl[i]+ap[i];
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;margin-bottom:6px">'+months[i]+'</div><div style="display:flex;flex-direction:column;gap:2px">'
      +(op[i]>0?'<div style="color:#3B82F6">Open: <b>'+op[i]+'</b></div>':'')
      +(rn[i]>0?'<div style="color:#22C55E">Running: <b>'+rn[i]+'</b></div>':'')
      +(pd[i]>0?'<div style="color:#F97316">Pending: <b>'+pd[i]+'</b></div>':'')
      +(cl[i]>0?'<div style="color:#6B7280">Closed: <b>'+cl[i]+'</b></div>':'')
      +(ap[i]>0?'<div style="color:#A855F7">Approved: <b>'+ap[i]+'</b></div>':'')
      +'<div style="border-top:1px solid #eee;padding-top:3px;margin-top:3px;font-weight:600">Total: '+total+'</div></div></div>';
    rows.push([months[i],op[i],rn[i],pd[i],cl[i],ap[i],tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.monthlyJobs=new google.visualization.ColumnChart(div);
  _charts.monthlyJobs.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'bottom',textStyle:{color:'#9498b8',fontSize:10}},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#3B82F6','#22C55E','#F97316','#6B7280','#A855F7'],bar:{groupWidth:'65%'},isStacked:true,tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
}

function drawBreakdown(months,bd,anim,tipStyle){
  var div=U.$('chartBreakdown');if(!div)return;
  var hasData=bd.some(function(v){return v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No breakdown data</div>';return;}
  div.innerHTML='';
  var total=bd.reduce(function(a,b){return a+b;},0);
  var rows=[['Month','Breakdowns',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var pct=total>0?Math.round((bd[i]/total)*100):0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#EF4444">Breakdowns</div><div>Period: <b>'+months[i]+'</b></div><div>Count: <b>'+bd[i]+'</b></div><div>Share: <b>'+pct+'%</b></div></div>';
    rows.push([months[i],bd[i],tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.breakdown=new google.visualization.AreaChart(div);
  _charts.breakdown.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#EF4444'],lineWidth:2,curveType:'function',pointSize:5,pointShape:'circle',areaOpacity:0.15,tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
}

function drawMachineStatus(data,anim,tipStyle){
  var div=U.$('chartMachineStatus');if(!div)return;
  var msRun=data.runningMachines||0;
  var msBd=data.breakdownMachines||0;
  var msIdle=data.idleMachines||0;
  var msTotal=msRun+msBd+msIdle;
  if(msTotal===0){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No machine data</div>';return;}
  var rows=[['Status','Count',{role:'style'},{role:'tooltip',type:'string',p:{html:true}}]];
  if(msRun>0)rows.push(['Running',msRun,'#22C55E','<div style="'+tipStyle+'"><div style="font-weight:700;color:#22C55E">Running</div><div>Count: <b>'+msRun+'</b></div></div>']);
  if(msBd>0)rows.push(['Breakdown',msBd,'#EF4444','<div style="'+tipStyle+'"><div style="font-weight:700;color:#EF4444">Breakdown</div><div>Count: <b>'+msBd+'</b></div></div>']);
  if(msIdle>0)rows.push(['Idle',msIdle,'#64748b','<div style="'+tipStyle+'"><div style="font-weight:700;color:#64748b">Idle</div><div>Count: <b>'+msIdle+'</b></div></div>']);
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.machineStatus=new google.visualization.PieChart(div);
  _charts.machineStatus.draw(dt,{backgroundColor:'transparent',chartArea:{left:10,right:10,top:10,bottom:40,width:'90%',height:'70%'},legend:{position:'bottom',textStyle:{color:'#9498b8',fontSize:11}},colors:['#22C55E','#EF4444','#64748b'],pieHole:0.45,tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},pieSliceText:'none',animation:anim});
  var badge=U.$('machineStatusBadge');if(badge)badge.textContent=msTotal+' machines';
}

function drawDepartment(data,anim,tipStyle){
  var div=U.$('chartDepartment');if(!div)return;
  var deptJobs=(data.charts&&data.charts.departmentJobs)||{};
  var keys=Object.keys(deptJobs).sort(function(a,b){return deptJobs[b]-deptJobs[a];});
  if(keys.length===0){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No department data</div>';return;}
  var rows=[['Department','Job Cards',{role:'tooltip',type:'string',p:{html:true}}]];
  var colors=['#3B82F6','#22C55E','#F97316','#A855F7','#EF4444','#06B6D4','#F59E0B','#64748b'];
  var total=0;keys.forEach(function(k){total+=deptJobs[k];});
  for(var i=0;i<keys.length;i++){
    var pct=total>0?Math.round((deptJobs[keys[i]]/total)*100):0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#3B82F6">'+keys[i]+'</div><div>Job Cards: <b>'+deptJobs[keys[i]]+'</b></div><div>Share: <b>'+pct+'%</b></div></div>';
    rows.push([keys[i],deptJobs[keys[i]],tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.department=new google.visualization.ColumnChart(div);
  _charts.department.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:50,width:'90%',height:'60%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'},slantedText:keys.length>5,slantedTextAngle:45},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:colors.slice(0,keys.length),bar:{groupWidth:'65%'},tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
  var badge=U.$('deptBadge');if(badge)badge.textContent=keys.length+' depts';
}

function drawWaitingTime(months,wt,anim,tipStyle){
  var div=U.$('chartWaitingTime');if(!div)return;
  var hasData=wt.some(function(v){return v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No waiting time data</div>';return;}
  var rows=[['Period','Waiting Time (hrs)',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var val=wt[i]||0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#F59E0B">Waiting Time</div><div>Period: <b>'+months[i]+'</b></div><div>Hours: <b>'+val.toFixed(1)+'</b></div></div>';
    rows.push([months[i],val,tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.waitingTime=new google.visualization.AreaChart(div);
  _charts.waitingTime.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#F59E0B'],lineWidth:2,curveType:'function',pointSize:5,pointShape:'circle',areaOpacity:0.15,tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
  var badge=U.$('waitingTimeBadge');if(badge){var totalWt=wt.reduce(function(a,b){return a+b;},0);badge.textContent=totalWt.toFixed(1)+'h total';}
}

function drawDowntime(months,dt,anim,tipStyle){
  var div=U.$('chartDowntime');if(!div)return;
  var hasData=dt.some(function(v){return v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No downtime data</div>';return;}
  var rows=[['Period','Downtime (hrs)',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var val=dt[i]||0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#EF4444">Downtime</div><div>Period: <b>'+months[i]+'</b></div><div>Hours: <b>'+val.toFixed(1)+'</b></div></div>';
    rows.push([months[i],val,tip]);
  }
  var d=new google.visualization.arrayToDataTable(rows);
  _charts.downtime=new google.visualization.AreaChart(div);
  _charts.downtime.draw(d,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#EF4444'],lineWidth:2,curveType:'function',pointSize:5,pointShape:'circle',areaOpacity:0.15,tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
  var badge=U.$('downtimeBadge');if(badge){var totalDt=dt.reduce(function(a,b){return a+b;},0);badge.textContent=totalDt.toFixed(1)+'h total';}
}

function drawMonthlyMaintenance(months,op,rn,cl,mm,anim,tipStyle){
  var div=U.$('chartMonthlyMaintenance');if(!div)return;
  var hasData=mm.some(function(v){return v>0;});
  if(!hasData){div.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px">No maintenance data</div>';return;}
  var rows=[['Period','Job Cards',{role:'tooltip',type:'string',p:{html:true}}]];
  for(var i=0;i<months.length;i++){
    var val=mm[i]||0;
    var tip='<div style="'+tipStyle+'"><div style="font-weight:700;color:#3B82F6">Maintenance Activity</div><div>Period: <b>'+months[i]+'</b></div><div>Total Jobs: <b>'+val+'</b></div></div>';
    rows.push([months[i],val,tip]);
  }
  var dt=new google.visualization.arrayToDataTable(rows);
  _charts.monthlyMaint=new google.visualization.LineChart(div);
  _charts.monthlyMaint.draw(dt,{backgroundColor:'transparent',chartArea:{left:40,right:20,top:15,bottom:35,width:'90%',height:'65%'},legend:{position:'none'},hAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'transparent'}},vAxis:{textStyle:{color:'#9498b8',fontSize:10},gridlines:{color:'rgba(255,255,255,0.06)'},minValue:0},colors:['#3B82F6'],lineWidth:3,curveType:'function',pointSize:6,pointShape:'circle',tooltip:{isHtml:true,textStyle:{color:'#333',fontSize:12}},animation:anim});
  var badge=U.$('monthlyMaintBadge');if(badge){var totalMm=mm.reduce(function(a,b){return a+b;},0);badge.textContent=totalMm+' total';}
}

function loadNotifications(){
  if(!C.api)return;
  var user=C.session?C.session.getUser():null;
  var params={unreadOnly:true,page:_notifPage,pageSize:_notifPageSize};
  if(user&&user.email)params.email=user.email;
  C.api.call('getNotifications',params).then(function(result){
    var records=(result&&result.records)?result.records:[];
    _notifTotal=(result&&result.total!==undefined)?result.total:records.length;
    _notifAllItems=records;
    renderNotifications(records);
  }).catch(function(){
    var el=U.$('dashboardNotifications');
    if(el)el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Failed to load</div>';
  });
}

function renderNotifications(items){
  var el=U.$('dashboardNotifications');
  if(!el)return;
  if(!items||items.length===0){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No unread notifications</div>';return;}
  var typeColors={
    'Information':{color:'#06b6d4',bg:'rgba(6,182,212,0.11)'},
    'Success':{color:'#22c55e',bg:'rgba(34,197,94,0.11)'},
    'Warning':{color:'#f59e0b',bg:'rgba(245,158,11,0.11)'},
    'Critical':{color:'#ef4444',bg:'rgba(239,68,68,0.11)'},
    'Approval':{color:'#a855f7',bg:'rgba(168,85,247,0.11)'},
    'Reminder':{color:'#f97316',bg:'rgba(249,115,22,0.11)'},
    'System':{color:'#9498b8',bg:'rgba(148,152,184,0.11)'}
  };
  var html='<div style="display:flex;flex-direction:column;gap:4px">';
  items.forEach(function(n){
    var type=n.NotificationType||'Information';
    var tc=typeColors[type]||typeColors['Information'];
    var dt=n.CreatedDateTime?U.timeAgo(n.CreatedDateTime):'';
    var priBadge=n.Priority==='Critical'?'danger':n.Priority==='High'?'warning':'info';
    html+='<div class="dash-notif-row" data-notif-id="'+U.escHtml(n.NotificationID)+'" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--bg-input);cursor:pointer;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'var(--bg-input)\'">'
      +'<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:'+tc.bg+';color:'+tc.color+';font-size:12px;font-weight:700">'+type.charAt(0)+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+U.escHtml(n.Title)+'</div>'
      +'<div style="font-size:10px;color:var(--text-muted);display:flex;gap:6px;align-items:center">'
      +'<span class="badge badge-'+priBadge+'" style="font-size:8px;padding:0 5px">'+U.escHtml(n.Priority||'')+'</span>'
      +'<span class="badge badge-secondary" style="font-size:8px;padding:0 5px">'+U.escHtml(n.Module||'')+'</span>'
      +'<span>'+U.escHtml(dt)+'</span></div></div></div>';
  });
  html+='</div>';
  el.innerHTML=html;
}

function loadActivities(){
  if(!C.api)return;
  C.api.call('getAuditLogs',{}).then(function(data){
    var items=Array.isArray(data)?data.slice(0,10):(data&&data.records?data.records.slice(0,10):[]);
    renderActivities(items);
  }).catch(function(){
    var el=U.$('dashboardRecentActivities');
    if(el)el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Failed to load</div>';
  });
}

function renderActivities(items){
  var el=U.$('dashboardRecentActivities');
  if(!el)return;
  if(!items||items.length===0){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No recent activities</div>';return;}
  var actionIcons={
    'Create':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><circle cx="10" cy="10" r="9"/><path d="M10 6v8M6 10h8"/></svg>',
    'Update':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    'Delete':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M3 5h14M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/></svg>',
    'Login':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M9 3H5a2 2 0 00-2 2v10a2 2 0 002 2h4"/><polyline points="13 7 17 11 13 15"/></svg>',
    'Approve':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>'
  };
  var html='<div style="display:flex;flex-direction:column;gap:4px">';
  items.forEach(function(r){
    var icon=actionIcons[r.Action]||'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><circle cx="10" cy="10" r="9"/><path d="M9 9h2v5M9 12h3"/></svg>';
    var dt=r.DateTime||'';
    var displayDt=dt?U.timeAgo(dt):'';
    html+='<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:var(--bg-input);cursor:default">'
      +'<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-light);color:var(--primary);font-size:11px">'+icon+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span class="badge badge-secondary" style="font-size:8px;padding:0 4px">'+U.escHtml(r.Action||'')+'</span> '+U.escHtml(r.Module||'')+'</div>'
      +'<div style="font-size:10px;color:var(--text-muted)">'+U.escHtml(r.UserName||'')+' &middot; '+U.escHtml(displayDt)+'</div></div></div>';
  });
  html+='</div>';
  el.innerHTML=html;
}

function startAutoRefresh(){
  stopAutoRefresh();
  _autoRefreshTimer=setInterval(function(){
    loadData();
  },60000);
}

function stopAutoRefresh(){
  if(_autoRefreshTimer){clearInterval(_autoRefreshTimer);_autoRefreshTimer=null;}
}

function setFilter(filter){
  _filter=filter;
  var filterBar=document.querySelector('.dashboard-filter-bar');
  if(filterBar){
    filterBar.querySelectorAll('.filter-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.filter===filter);
    });
  }
  loadData();
}

function destroy(){
  stopKPIToggle();
  stopAutoRefresh();
  _charts={};
  _chartsLoaded=false;
  _lastKpiValues={};
  _notifAllItems=[];
}

C.dashboard={
  init:init,
  load:loadData,
  destroy:destroy,
  setFilter:setFilter,
  loadData:loadData
};

if(C.router){
  C.router.registerPage('dashboard',{
    title:'Dashboard',
    init:init,
    load:loadData,
    destroy:destroy
  });
}

})();
