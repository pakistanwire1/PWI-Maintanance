(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};
var U=C.utils;

var _mainContent=null;
var _currentPage=null;
var _destroyed={};

function init(){
  _mainContent=U.$('mainContent')||document.querySelector('.page-content');
}

function getContainer(){
  return _mainContent;
}

function showSkeleton(){
  var el=getContainer();
  if(!el)return;
  el.innerHTML='<div class="page-skeleton"><div class="skeleton-header"><div class="skeleton-title"></div><div class="skeleton-subtitle"></div></div>'
    +'<div class="skeleton-cards"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>'
    +'<div class="skeleton-table"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div></div>';
}

function showError(msg){
  var el=getContainer();
  if(!el)return;
  el.innerHTML='<div class="empty-state" style="padding:60px 20px;text-align:center">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin:0 auto 16px;color:var(--danger);opacity:0.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    +'<h3 style="color:var(--text);font-size:16px;margin-bottom:8px">Something went wrong</h3>'
    +'<p style="color:var(--text-muted);font-size:13px">'+U.escHtml(msg||'Failed to load page')+'</p>'
    +'<button class="btn btn-primary" style="margin-top:16px" onclick="CMMS.loader.loadPage(CMMS.router.getCurrentPage())">Try Again</button>'
    +'</div>';
}

function showEmpty(msg){
  var el=getContainer();
  if(!el)return;
  el.innerHTML='<div class="empty-state" style="padding:60px 20px;text-align:center">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin:0 auto 16px;color:var(--text-muted);opacity:0.4"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'
    +'<p style="color:var(--text-muted);font-size:13px">'+U.escHtml(msg||'No content available')+'</p>'
    +'</div>';
}

function loadPage(pageName){
  if(!pageName)return;
  var router=C.router;
  if(!router)return;

  if(_currentPage&&_currentPage!==pageName){
    var oldConfig=router.getPageConfig?router.getPageConfig(_currentPage):null;
    if(oldConfig&&typeof oldConfig.destroy==='function'){
      try{oldConfig.destroy();}catch(e){console.warn('Page destroy error:',e);}
    }
  }
  _currentPage=pageName;

  var pageConfig=router.getPageConfig?pageConfig=router.getPageConfig(pageName):null;

  var el=getContainer();
  if(!el)return;

  el.innerHTML='';
  el.scrollTop=0;

  var mc=el.closest('.main-content');
  if(mc)mc.scrollTop=0;

  if(pageConfig&&typeof pageConfig.init==='function'){
    try{pageConfig.init(el,pageName);}catch(e){console.error('Page init error:',e);showError(e.message);return;}
  }

  if(pageConfig&&typeof pageConfig.load==='function'){
    try{pageConfig.load(pageName);}catch(e){console.error('Page load error:',e);showError(e.message);return;}
  }

  if(C.nav)C.nav.updateActive(pageName);

  try{localStorage.setItem('cmms_last_page',pageName);}catch(e){}

  window.scrollTo(0,0);
}

C.loader={
  init:init,
  loadPage:loadPage,
  showSkeleton:showSkeleton,
  showError:showError,
  showEmpty:showEmpty,
  getContainer:getContainer
};

})();
