(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};
var U=C.utils;
var I=C.icons||{};

var _badgeTimer=null;
var _clockTimer=null;

var MENU=[
  {page:'dashboard',icon:'dashboard',label:'Dashboard'},
  {group:'masterData',title:'Master Data',items:[
    {page:'sections',label:'Sections',perm:'canManageSections'},
    {page:'departments',label:'Departments',perm:'canManageDepartments'},
    {page:'machines',label:'Machines',perm:'canManageMachines'},
    {page:'assets',label:'Assets',perm:'canManageAssets'},
    {page:'technicians',label:'Technicians',perm:'canManageMachines'},
    {page:'users',label:'Users',perm:'canManageUsers'}
  ]},
  {group:'maintenance',title:'Maintenance',items:[
    {page:'openjc',label:'Open Job Cards',perm:'canOpenJobCard',badgeId:'badge-openjc',badgeStatus:'open'},
    {page:'startjc',label:'Started Job Cards',perm:'canStartJobCard',badgeId:'badge-startjc',badgeStatus:'running'},
    {page:'closejc',label:'Closed Job Cards',perm:'canCloseJobCard',badgeId:'badge-closejc',badgeStatus:'closed'},
    {page:'pendingjc',label:'Pending Review',perm:'canReviewPendingJobCard',badgeId:'badge-pendingjc',badgeStatus:'pending'},
    {page:'approvejc',label:'Approved Job Cards',perm:'canApproveJobCard',badgeId:'badge-approvejc',badgeStatus:'approved'},
    {page:'pm',label:'PM Schedule',perm:'canManagePM',badgeId:'badge-pm',badgeStatus:'all'},
    {page:'checklists',label:'Checklists'},
    {page:'spareparts',label:'Spare Parts',perm:'canManageSpareParts'},
    {page:'inventory',label:'Inventory',perm:'canManageInventory',badgeId:'badge-inventory',badgeStatus:'all'}
  ]},
  {group:'history',title:'History',items:[
    {page:'breakdown',label:'Breakdown History',perm:'canViewReports'},
    {page:'pmhistory',label:'PM History',perm:'canManagePM'},
    {page:'stockhistory',label:'Stock History',perm:'canManageInventory'},
    {page:'inventorytxns',label:'Inventory Transactions',perm:'canManageInventory'},
    {page:'goodsreceipt',label:'Goods Receipt',perm:'canManageInventory',badgeId:'badge-goodsreceipt',badgeStatus:'all'}
  ]},
  {group:'communication',title:'Communication',items:[
    {page:'notifications',label:'Notifications'},
    {page:'email',label:'Email',adminOnly:true},
    {page:'whatsapp',label:'WhatsApp',adminOnly:true}
  ]},
  {group:'qrBarcode',title:'QR / Barcode',items:[
    {page:'qr',label:'QR Center'}
  ]},
  {group:'reports',title:'Reports',items:[
    {page:'reports',label:'Reports',perm:'canViewReports'}
  ]},
  {group:'administration',title:'Administration',items:[
    {page:'settings',label:'Settings',perm:'canManageUsers'},
    {page:'audit',label:'Audit Trail',perm:'canViewAudit'},
    {page:'backup',label:'Backup & Restore',perm:'canBackupRestore'}
  ]}
];

var ICON_SVG={
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  sections:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  departments:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  machines:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  assets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  technicians:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  openjc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  startjc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  closejc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  pendingjc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  approvejc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  pm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  checklists:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  spareparts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  inventory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  breakdown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',
  pmhistory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  stockhistory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  inventorytxns:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  goodsreceipt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  notifications:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  email:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  whatsapp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
  qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
  reports:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  audit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
  backup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  masterData:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
  maintenance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
  history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  communication:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  qrBarcode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
  reportsGroup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  administration:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
};

function getPageIcon(page){
  return ICON_SVG[page]||ICON_SVG.dashboard;
}
function getGroupIcon(key){
  return ICON_SVG[key]||ICON_SVG.dashboard;
}

function renderSidebar(){
  var sb=U.$('sidebar');
  if(!sb)return;
  var session=C.session;
  var isAdmin=session?session.isAdmin():false;
  var hasPerm=session?session.hasPermission.bind(session):function(){return false;};
  var html='<div class="sidebar-brand"><div class="sidebar-logo-wrapper">'
    +'<img class="sidebar-logo-img" alt="PWI" src="logo.svg" style="display:none" onload="this.style.display=\'block\';var el=document.getElementById(\'sidebarLogoFallback\');el&&(el.style.display=\'none\')" onerror="this.style.display=\'none\'">'
    +'<svg class="sidebar-logo-fallback" id="sidebarLogoFallback" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" width="30" height="30"><rect x="4" y="4" width="56" height="56" rx="12" stroke="currentColor" fill="none" opacity="0.3"/><path d="M20 20 L44 20 L44 28 L28 28 L28 36 L44 36 L44 44 L20 44 Z" stroke="currentColor" fill="none"/><circle cx="32" cy="32" r="6" stroke="currentColor" fill="none"/><path d="M32 18 L32 46 M18 32 L46 32" stroke="currentColor" stroke-width="1" opacity="0.3"/></svg>'
    +'</div><div class="sidebar-brand-text"><h2>CMMS</h2><small>Maintenance Management</small></div></div>';
  html+='<div class="sidebar-menu" id="sidebarMenu">';

  MENU.forEach(function(item){
    if(item.group){
      var groupItems=[];
      item.items.forEach(function(sub){
        var show=true;
        if(sub.adminOnly){show=isAdmin;}
        else if(sub.perm){show=isAdmin||hasPerm(sub.perm);}
        if(show)groupItems.push(sub);
      });
      if(groupItems.length===0)return;
      html+='<div class="sidebar-group" data-group="'+item.group+'">';
      html+='<div class="sidebar-group-header" data-group="'+item.group+'">';
      html+='<span class="sidebar-group-icon">'+getGroupIcon(item.group)+'</span>';
      html+='<span class="sidebar-group-title">'+U.escHtml(item.title)+'</span>';
      html+='<span class="sidebar-group-arrow">&#9654;</span>';
      html+='</div>';
      html+='<div class="sidebar-group-content">';
      groupItems.forEach(function(sub){
        html+='<div class="sidebar-item" data-page="'+sub.page+'" data-tooltip="'+U.escHtml(sub.label)+'">';
        html+=getPageIcon(sub.page);
        html+='<span class="sidebar-item-label">'+U.escHtml(sub.label)+'</span>';
        if(sub.badgeId){
          html+='<span class="sidebar-badge" id="'+sub.badgeId+'" data-status="'+sub.badgeStatus+'" style="display:none"></span>';
        }
        html+='</div>';
      });
      html+='</div></div>';
    }else{
      var showDashboard=true;
      if(item.perm){showDashboard=isAdmin||hasPerm(item.perm);}
      if(!showDashboard)return;
      html+='<div class="sidebar-item" data-page="'+item.page+'" data-tooltip="'+U.escHtml(item.label)+'">';
      html+=getPageIcon(item.page);
      html+='<span class="sidebar-item-label">'+U.escHtml(item.label)+'</span>';
      html+='</div>';
    }
  });

  html+='</div>';
  html+='<div class="sidebar-footer"><div class="user-info">'
    +'<div class="user-avatar" id="userAvatar">A</div>'
    +'<div class="user-details"><div class="user-name" id="userName">User</div><div class="user-role" id="userRole">Role</div></div>'
    +'</div></div>';
  sb.innerHTML=html;

  var savedGroups={};
  try{savedGroups=JSON.parse(localStorage.getItem('cmms_sidebarGroups')||'{}');}catch(e){}
  var hasSaved=Object.keys(savedGroups).length>0;
  U.qsa('.sidebar-group',sb).forEach(function(g){
    var key=g.dataset.group;
    if(hasSaved){if(savedGroups[key]===true)g.classList.add('open');}
    else{g.classList.add('open');}
  });

  delegate(sb,'click','.sidebar-group-header',function(e,hdr){
    var group=hdr.closest('.sidebar-group');
    if(!group)return;
    group.classList.toggle('open');
    var key=group.dataset.group;
    if(key){
      try{
        var sv=JSON.parse(localStorage.getItem('cmms_sidebarGroups')||'{}');
        sv[key]=group.classList.contains('open');
        localStorage.setItem('cmms_sidebarGroups',JSON.stringify(sv));
      }catch(e){}
    }
  });

  delegate(sb,'click','.sidebar-item',function(e,el){
    var page=el.dataset.page;
    if(page){
      if(C.router)C.router.navigateTo(page);
      else{var m=U.$('app');if(m)m.style.display='';}
      var sc=sb;if(sc)sc.classList.remove('open');
    }
  });
}

function delegate(container,evt,selector,fn){
  container.addEventListener(evt,function(e){
    var target=e.target.closest(selector);
    if(target&&container.contains(target))fn(e,target);
  });
}

function renderTopbar(){
  var topbar=U.$('topbar');
  if(!topbar)return;
  var html='<div class="topbar-left">'
    +'<button class="hamburger" id="hamburgerBtn" title="Toggle sidebar">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
    +'</button>'
    +'<div class="topbar-brand" id="topbarBrand" style="cursor:pointer" title="Go to Dashboard">'
    +'<div class="topbar-logo-mini">'
    +'<img class="topbar-logo-img" id="topbarLogoImg" alt="PWI" src="logo.svg" style="display:none" onload="this.style.display=\'block\';var el=document.getElementById(\'topbarLogoFallback\');el&&(el.style.display=\'none\')" onerror="var el=document.getElementById(\'topbarLogoFallback\');el&&(el.style.display=\'block\')">'
    +'<svg class="topbar-logo-fallback" id="topbarLogoFallback" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" width="24" height="24"><rect x="4" y="4" width="56" height="56" rx="12" stroke="currentColor" fill="none" opacity="0.3"/><path d="M20 20 L44 20 L44 28 L28 28 L28 36 L44 36 L44 44 L20 44 Z" stroke="currentColor" fill="none"/><circle cx="32" cy="32" r="6" stroke="currentColor" fill="none"/><path d="M32 18 L32 46 M18 32 L46 32" stroke="currentColor" stroke-width="1" opacity="0.3"/></svg>'
    +'</div><span>CMMS</span></div>'
    +'<div class="breadcrumb"><span id="page-title">Dashboard</span></div>'
    +'</div>'
    +'<div class="topbar-center">'
    +'<div class="topbar-search">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +'<input type="text" id="globalSearch" placeholder="Search machines, job cards, parts...">'
    +'</div></div>'
    +'<div class="topbar-right">'
    +'<div class="topbar-datetime">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    +'<div id="topbarClock" class="time" style="font-size:12px;color:var(--text-secondary);font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">00 Jan 0000 | 00:00 AM</div>'
    +'</div>'
    +'<button class="theme-toggle-btn" id="themeToggle" title="Switch to Light Mode">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
    +'</button>'
    +'<button class="topbar-btn notification-btn" id="notifBtn" title="Notifications">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>'
    +'<span class="notification-badge" id="notificationBadge" style="display:none">0</span>'
    +'</button>'
    +'<button class="topbar-btn" id="topbarRefreshBtn" title="Refresh Data">'
    +'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M17 10a7 7 0 01-13.5 2"/><path d="M3 10a7 7 0 0113.5-2"/><path d="M17 4v4h-4"/></svg>'
    +'</button>'
    +'<button class="topbar-btn" id="topbarSettingsBtn" title="Settings">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    +'</button>'
    +'<button class="topbar-btn topbar-logout" id="logoutBtn" title="Sign Out">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
    +'</button>'
    +'<div class="topbar-user" id="topbarUser" style="position:relative;cursor:pointer">'
    +'<div class="user-avatar-sm" id="topbarAvatar">A</div>'
    +'<div><div class="user-name-display" id="topbarName">User</div><div class="user-role-display" id="topbarRole">Role</div></div>'
    +'</div>'
    +'</div>';
  topbar.innerHTML=html;
}

function bindEvents(){
  var hamburger=U.$('hamburgerBtn');
  if(hamburger){
    hamburger.addEventListener('click',function(){
      toggleSidebar();
    });
  }
  var brand=U.$('topbarBrand');
  if(brand){
    brand.addEventListener('click',function(){
      if(C.router)C.router.navigateTo('dashboard');
    });
  }
  var logoutBtn=U.$('logoutBtn');
  if(logoutBtn){
    logoutBtn.addEventListener('click',function(){
      U.showConfirm('Sign Out','Are you sure you want to sign out?',function(){
        if(C.session)C.session.logout();
      });
    });
  }
  var themeBtn=U.$('themeToggle');
  if(themeBtn){
    themeBtn.addEventListener('click',function(){
      if(C.theme)C.theme.toggle();
    });
  }
  var notifBtn=U.$('notifBtn');
  if(notifBtn){
    notifBtn.addEventListener('click',function(){
      if(C.notify)C.notify.toggle();
    });
  }
  var searchInput=U.$('globalSearch');
  if(searchInput){
    searchInput.addEventListener('input',U.debounce(function(){
      var val=searchInput.value.trim();
      if(val.length>=2){
        var cp=C.router?C.router.getCurrentPage():'';
        var cfg=cp&&C.router.getPageConfig?C.router.getPageConfig(cp):null;
        if(cfg&&typeof cfg.search==='function'){
          try{cfg.search(val);}catch(e){console.error('Page search error:',e);}
        }else{
          U.showToast('Search available on individual pages','info');
        }
      }
    },500));
  }
  var refreshBtn=U.$('topbarRefreshBtn');
  if(refreshBtn){
    refreshBtn.addEventListener('click',function(){
      if(C.loader){var cp=C.router?C.router.getCurrentPage():'';C.loader.loadPage(cp||'dashboard');}
      loadBadgeCounts();
      U.showToast('Refreshed','success');
    });
  }
  document.addEventListener('click',function(e){
    var userMenu=U.$('topbarUser');
    var dropdown=U.$('userMenuDropdown');
    if(dropdown&&!e.target.closest('.topbar-user')){
      dropdown.classList.remove('show');
    }
  });
}

function startClock(){
  function updateClock(){
    var now=new Date();
    var clockEl=U.$('topbarClock');
    if(clockEl)clockEl.textContent=U.formatDateTime(now);
  }
  updateClock();
  if(_clockTimer)clearInterval(_clockTimer);
  _clockTimer=setInterval(updateClock,30000);
}

function updateClockIcon(mode){
  var btn=U.$('themeToggle');
  if(!btn)return;
  if(mode==='light'){
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    btn.title='Switch to Dark Mode';
  }else{
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    btn.title='Switch to Light Mode';
  }
}

function updateUserInfo(){
  var user=C.session?C.session.getUser():null;
  if(!user)return;
  var initial=user.name?user.name.charAt(0).toUpperCase():'U';
  var photoUrl=user.photoURL||user.PhotoURL||'';
  function setAvatar(elId,size){
    var el=U.$(elId);
    if(!el)return;
    el.textContent='';
    if(!photoUrl){el.textContent=initial;return;}
    var img=document.createElement('img');
    img.src=photoUrl;
    img.style.cssText='width:'+size+';height:'+size+';border-radius:50%;object-fit:cover;flex-shrink:0';
    img.onerror=function(){el.textContent=initial;};
    el.appendChild(img);
  }
  setAvatar('userAvatar','34px');
  setAvatar('topbarAvatar','28px');
  U.setText('userName',user.name||'');
  var roleLine=user.role||'';
  if(user.department)roleLine+=' - '+user.department;
  U.setText('userRole',roleLine);
  U.setText('topbarName',user.name||'');
  U.setText('topbarRole',roleLine);
  var isAdminUser=C.session?C.session.isAdmin():false;
  var settingsBtn=U.$('topbarSettingsBtn');
  if(settingsBtn)settingsBtn.style.display=(isAdminUser||(C.session&&C.session.hasPermission('manageUsers')))?'':'none';
}

function updateActive(page){
  var originalPage=page;
  var qrPages=['qrmachines','qrassets','qrspareparts','qrjobcards','qrprint','qrhistory'];
  if(qrPages.indexOf(page)>-1)page='qr';
  if(page==='inventorytransactions'||page==='stockhistory')page='inventory';
  if(page==='pmhistory')page='pmhistory';
  if(page==='breakdown')page='breakdown';

  U.qsa('.sidebar-item').forEach(function(i){i.classList.remove('active');});
  var menuItem=document.querySelector('.sidebar-item[data-page="'+originalPage+'"]');
  if(!menuItem)menuItem=document.querySelector('.sidebar-item[data-page="'+page+'"]');
  if(menuItem){
    menuItem.classList.add('active');
    var parentGroup=menuItem.closest('.sidebar-group');
    if(parentGroup)parentGroup.classList.add('open');
  }
  var titles={dashboard:'Dashboard',assets:'Asset Master',machines:'Machine Master',technicians:'Technician Master',departments:'Department Master',sections:'Section Master',jobcards:'All Job Cards',checklists:'Checklists',pm:'Preventive Maintenance',spareparts:'Spare Parts',inventory:'Inventory Management',inventorytxns:'Inventory Transactions',stockhistory:'Stock History',goodsreceipt:'Goods Receipt',pmhistory:'PM History',notifications:'Notifications',breakdown:'Breakdown History',audit:'Audit Trail',qr:'QR & Barcode Center',qrmachines:'Machine QR Management',qrassets:'Asset QR Management',qrspareparts:'Spare Parts QR Management',qrjobcards:'Job Card QR Management',qrprint:'Print QR Labels',qrhistory:'QR Scan History',email:'Email Notification Settings',reports:'Reports',backup:'Backup & Restore',settings:'Settings',openjc:'Open Job Card',users:'Users',startjc:'Start Job Card',closejc:'Close Job Card',pendingjc:'Pending Review',approvejc:'Approve Job Cards',whatsapp:'WhatsApp Notifications'};
  U.setText('page-title',titles[originalPage]||titles[page]||page);
}

function updateBadges(counts){
  if(!counts)return;
  function setBadge(id,val,forceZero){
    var el=U.$(id);
    if(!el)return;
    var n=forceZero?0:(parseInt(val)||0);
    var status=el.getAttribute('data-status');
    el.classList.remove('status-open','status-running','status-closed','status-pending','status-approved','status-all','status-email');
    if(n>0&&status)el.classList.add('status-'+status);
    if(n>0){el.textContent=n>99?'99+':n;el.style.display='';}
    else{el.textContent='';el.style.display='none';}
  }
  setBadge('badge-openjc',0,true);
  setBadge('badge-startjc',counts.openJobCards);
  setBadge('badge-closejc',counts.startedJobCards);
  setBadge('badge-pendingjc',counts.pendingJobCards);
  setBadge('badge-approvejc',counts.approvedJobCards);
  setBadge('badge-pm',counts.pendingPM);
  setBadge('badge-inventory',counts.inventoryAlerts);
  setBadge('badge-goodsreceipt',counts.pendingGR);
  var nb=U.$('notificationBadge');
  if(nb){
    var un=counts.unreadNotifications||0;
    if(un>0){nb.textContent=un>99?'99+':un;nb.style.display='';}
    else{nb.style.display='none';}
  }
}

function loadBadgeCounts(){
  if(!C.api)return;
  C.api.call('getSidebarCounts',{}).then(function(data){
    if(data)updateBadges(data);
  }).catch(function(){});
}

function startBadgePolling(){
  stopBadgePolling();
  _badgeTimer=setInterval(loadBadgeCounts,60000);
}

function stopBadgePolling(){
  if(_badgeTimer){clearInterval(_badgeTimer);_badgeTimer=null;}
}

function toggleSidebar(){
  var sidebar=U.$('sidebar');
  if(!sidebar)return;
  if(window.innerWidth<=768){
    sidebar.classList.toggle('open');
  }else{
    sidebar.classList.toggle('collapsed');
  }
}

function init(){
  renderSidebar();
  renderTopbar();
  bindEvents();
  startClock();
  updateUserInfo();
  loadBadgeCounts();
  startBadgePolling();
}

C.nav={
  init:init,
  updateActive:updateActive,
  updateBadges:updateBadges,
  updateNotifBadge:function(count){
    var nb=U.$('notificationBadge');
    if(!nb)return;
    if(count>0){nb.textContent=count>99?'99+':count;nb.style.display='';}
    else{nb.style.display='none';}
  },
  startBadgePolling:startBadgePolling,
  stopBadgePolling:stopBadgePolling,
  toggleSidebar:toggleSidebar,
  renderTopbar:renderTopbar,
  updateUserInfo:updateUserInfo,
  updateClockIcon:updateClockIcon,
  loadBadgeCounts:loadBadgeCounts
};

})();
