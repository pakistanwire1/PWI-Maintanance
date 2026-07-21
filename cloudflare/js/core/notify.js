(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};
var U=C.utils;

var _panelEl=null;
var _isOpen=false;
var _pollTimer=null;
var _currentFilter='all';

var TYPE_COLORS={
  'Information':'#06b6d4',
  'Success':'#22c55e',
  'Warning':'#f59e0b',
  'Critical':'#ef4444',
  'Approval':'#a855f7',
  'Reminder':'#f97316',
  'System':'#9498b8'
};

function init(){
  createPanel();
  startPolling();
}

function createPanel(){
  if(_panelEl)return;
  _panelEl=document.createElement('div');
  _panelEl.id='cmmsNotifPanel';
  _panelEl.className='notif-panel';
  _panelEl.style.cssText='position:fixed;top:0;right:0;width:380px;max-width:100vw;height:100vh;background:var(--bg-card);border-left:1px solid var(--border);display:none;flex-direction:column;z-index:5000;box-shadow:-4px 0 24px rgba(0,0,0,0.2);transition:transform 0.3s ease';
  _panelEl.innerHTML=buildPanelHTML();
  document.body.appendChild(_panelEl);
  bindPanelEvents();
}

function buildPanelHTML(){
  return '<div class="notif-panel-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);flex-shrink:0">'
    +'<h3 style="margin:0;font-size:15px;font-weight:600;color:var(--text)">Notifications</h3>'
    +'<div style="display:flex;gap:8px;align-items:center">'
    +'<button class="btn btn-xs btn-secondary" id="notifMarkAllRead">Mark all read</button>'
    +'<button class="notif-panel-close" id="notifPanelClose" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:20px;line-height:1;padding:4px">&times;</button>'
    +'</div></div>'
    +'<div class="notif-panel-tabs" style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0;padding:0 12px">'
    +'<button class="notif-tab active" data-filter="all">All</button>'
    +'<button class="notif-tab" data-filter="unread">Unread</button>'
    +'<button class="notif-tab" data-filter="critical">Critical</button>'
    +'<button class="notif-tab" data-filter="approval">Approval</button>'
    +'</div>'
    +'<div class="notif-panel-list" id="notifPanelList" style="flex:1;overflow-y:auto;padding:8px">'
    +'<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">Loading notifications...</div>'
    +'</div>'
    +'<style>.notif-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 14px;font-size:12px;font-weight:500;color:var(--text-muted);cursor:pointer;transition:all 0.2s}.notif-tab:hover{color:var(--text)}.notif-tab.active{color:var(--primary);border-bottom-color:var(--primary)}.notif-item{display:flex;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:background 0.15s;border:1px solid transparent}.notif-item:hover{background:var(--bg-hover)}.notif-item.unread{background:var(--primary-light);border-color:rgba(99,102,241,0.1)}.notif-item-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:700}.notif-item-content{flex:1;min-width:0}.notif-item-title{font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}.notif-item-msg{font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.notif-item-meta{display:flex;gap:6px;align-items:center;margin-top:3px}.notif-item-time{font-size:10px;color:var(--text-muted)}.notif-empty{text-align:center;padding:32px 16px;color:var(--text-muted);font-size:13px}</style>';
}

function bindPanelEvents(){
  var closeBtn=U.$('notifPanelClose');
  if(closeBtn){
    closeBtn.addEventListener('click',function(){toggle();});
  }
  var markAllBtn=U.$('notifMarkAllRead');
  if(markAllBtn){
    markAllBtn.addEventListener('click',function(){
      if(!C.api)return;
      C.api.call('markAllNotificationsRead',{}).then(function(){
        U.showToast('All notifications marked as read','success');
        load();
        updateBadge();
        if(C.nav)C.nav.loadBadgeCounts();
      }).catch(function(){
        U.showToast('Failed to mark as read','error');
      });
    });
  }
  var tabContainer=_panelEl.querySelector('.notif-panel-tabs');
  if(tabContainer){
    tabContainer.addEventListener('click',function(e){
      var tab=e.target.closest('.notif-tab');
      if(!tab)return;
      tabContainer.querySelectorAll('.notif-tab').forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      _currentFilter=tab.dataset.filter||'all';
      load();
    });
  }
}

function toggle(){
  if(!_panelEl){createPanel();}
  _isOpen=!_isOpen;
  _panelEl.style.display=_isOpen?'flex':'none';
  if(_isOpen){
    load();
    setTimeout(function(){
      _panelEl.style.transform='translateX(0)';
    },10);
  }else{
    _panelEl.style.transform='translateX(100%)';
    setTimeout(function(){_panelEl.style.display='none';},300);
  }
}

function load(){
  if(!C.api)return;
  var params={};
  if(_currentFilter==='unread')params.unreadOnly=true;
  C.api.call('getNotifications',params).then(function(result){
    var items=(result&&result.records)?result.records:(Array.isArray(result)?result:[]);
    renderList(items);
  }).catch(function(){
    var list=U.$('notifPanelList');
    if(list)list.innerHTML='<div class="notif-empty">Failed to load notifications</div>';
  });
}

function renderList(items){
  var list=U.$('notifPanelList');
  if(!list)return;
  if(!items||items.length===0){
    list.innerHTML='<div class="notif-empty">No notifications found</div>';
    return;
  }
  var filtered=items;
  if(_currentFilter==='unread'){
    filtered=items.filter(function(n){return(n.ReadStatus||'').toLowerCase()!=='read';});
  }else if(_currentFilter==='critical'){
    filtered=items.filter(function(n){return n.Priority==='Critical';});
  }else if(_currentFilter==='approval'){
    filtered=items.filter(function(n){return n.NotificationType==='Approval';});
  }
  if(filtered.length===0){
    list.innerHTML='<div class="notif-empty">No '+_currentFilter+' notifications</div>';
    return;
  }
  var html='';
  var count=Math.min(filtered.length,50);
  for(var i=0;i<count;i++){
    var n=filtered[i];
    var type=n.NotificationType||'Information';
    var color=TYPE_COLORS[type]||'#06b6d4';
    var isUnread=(n.ReadStatus||'').toLowerCase()!=='read';
    var dt=n.CreatedDateTime?U.timeAgo(n.CreatedDateTime):'';
    var safeId=U.escHtml(n.NotificationID||'');
    var safeUrl=U.escHtml(n.ActionURL||'');
    html+='<div class="notif-item'+(isUnread?' unread':'')+'" data-id="'+safeId+'" data-url="'+safeUrl+'">'
      +'<div class="notif-item-icon" style="background:'+color+'22;color:'+color+'">'+(type.charAt(0))+'</div>'
      +'<div class="notif-item-content">'
      +'<div class="notif-item-title">'+U.escHtml(n.Title||'')+'</div>'
      +'<div class="notif-item-msg">'+U.escHtml(n.Message||'')+'</div>'
      +'<div class="notif-item-meta">'
      +'<span class="badge badge-'+(n.Priority==='Critical'?'danger':n.Priority==='High'?'warning':'secondary')+'" style="font-size:8px;padding:0 5px">'+U.escHtml(n.Priority||'')+'</span>'
      +'<span class="notif-item-time">'+U.escHtml(dt)+'</span>'
      +'</div></div></div>';
  }
  list.innerHTML=html;
  var items=querySelectorAll('.notif-item',list);
  items.forEach(function(el){
    el.addEventListener('click',function(){
      var notifId=el.dataset.id;
      var actionUrl=el.dataset.url;
      if(notifId&&C.api){
        C.api.call('markNotificationRead',{id:notifId}).catch(function(){});
      }
      toggle();
      if(actionUrl){
        try{eval(actionUrl);}catch(e){if(C.router)C.router.navigateTo('notifications');}
      }else if(C.router){
        C.router.navigateTo('notifications');
      }
      updateBadge();
      if(C.nav)C.nav.loadBadgeCounts();
    });
  });
}

function querySelectorAll(sel,ctx){
  return Array.from((ctx||document).querySelectorAll(sel));
}

function updateBadge(){
  if(!C.api)return;
  C.api.call('getNotifications',{unreadOnly:true}).then(function(result){
    var items=(result&&result.records)?result.records:(Array.isArray(result)?result:[]);
    var unread=items.filter(function(n){return(n.ReadStatus||'').toLowerCase()!=='read';}).length;
    if(C.nav)C.nav.updateNotifBadge(unread);
  }).catch(function(){});
}

function startPolling(){
  stopPolling();
  _pollTimer=setInterval(updateBadge,60000);
}

function stopPolling(){
  if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;}
}

C.notify={
  init:init,
  toggle:toggle,
  load:load,
  updateBadge:updateBadge,
  startPolling:startPolling,
  stopPolling:stopPolling
};

})();
