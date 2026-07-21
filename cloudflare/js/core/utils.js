(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};

var $=function(id){return document.getElementById(id);};
var qs=function(sel,ctx){return(ctx||document).querySelector(sel);};
var qsa=function(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel));};

function escHtml(s){if(!s)return'';var d=document.createElement('div');d.textContent=String(s);return d.innerHTML;}
function setText(id,v){var el=$(id);if(el)el.textContent=v!=null?v:'';}
function setHtml(id,v){var el=$(id);if(el)el.innerHTML=v!=null?v:'';}
function getVal(id){var el=$(id);return el?el.value:'';}
function setVal(id,v){var el=$(id);if(el)el.value=v!=null?v:'';}
function showEl(id,d){var el=$(id);if(el)el.style.display=d||'block';}
function hideEl(id){var el=$(id);if(el)el.style.display='none';}
function addClass(id,c){var el=$(id);if(el)el.classList.add(c);}
function removeClass(id,c){var el=$(id);if(el)el.classList.remove(c);}
function toggleClass(id,c){var el=$(id);if(el)el.classList.toggle(c);}

function formatDate(d){
  if(!d)return'';
  if(typeof d==='string')d=new Date(d);
  if(isNaN(d))return'';
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function formatDateTime(d){
  if(!d)return'';
  if(typeof d==='string')d=new Date(d);
  if(isNaN(d))return'';
  var h=d.getHours(),m=d.getMinutes(),ap=h>=12?'PM':'AM';
  h=h%12||12;
  return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear()+' | '+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+' '+ap;
}
function formatTime(d){
  if(!d)return'';
  if(typeof d==='string')d=new Date(d);
  if(isNaN(d))return'';
  var h=d.getHours(),m=d.getMinutes(),ap=h>=12?'PM':'AM';
  h=h%12||12;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+' '+ap;
}
function nowISO(){
  var d=new Date();
  var off=d.getTimezoneOffset();
  var local=new Date(d.getTime()-off*60000);
  return local.toISOString().slice(0,19).replace('T',' ');
}
function timeAgo(dt){
  if(!dt)return'';
  var now=new Date(),then=new Date(dt);
  var sec=Math.floor((now-then)/1000);
  if(sec<60)return'Just now';
  if(sec<3600)return Math.floor(sec/60)+'m ago';
  if(sec<86400)return Math.floor(sec/3600)+'h ago';
  return Math.floor(sec/86400)+'d ago';
}
function pad(n){return String(n).padStart(2,'0');}

function calcDuration(start,end){
  if(!start||!end)return 0;
  var a=new Date(start),b=new Date(end);
  return Math.max(0,Math.floor((b-a)/60000));
}
function durationDisplay(minutes){
  if(!minutes||minutes<=0)return'0h 0m';
  var d=Math.floor(minutes/1440);
  var h=Math.floor((minutes%1440)/60);
  var m=minutes%60;
  if(d>0)return d+'d '+pad(h)+':'+pad(m);
  return h+'h '+pad(m)+'m';
}
function durationFromDates(s,e){return durationDisplay(calcDuration(s,e));}

function getFormData(formId){
  var form=$(formId);if(!form)return{};
  var data={};
  qsa('input,textarea,select',form).forEach(function(el){
    if(!el.name&&!el.id)return;
    var key=el.name||el.id;
    if(el.type==='checkbox')data[key]=el.checked;
    else if(el.type==='radio'){if(el.checked)data[key]=el.value;}
    else data[key]=el.value;
  });
  return data;
}
function setFormData(formId,data){
  var form=$(formId);if(!form||!data)return;
  Object.keys(data).forEach(function(key){
    var el=form.querySelector('[name="'+key+'"],#'+key);
    if(!el)return;
    if(el.type==='checkbox')el.checked=!!data[key];
    else if(el.type==='radio'){el.checked=(el.value===String(data[key]));}
    else el.value=data[key]!=null?data[key]:'';
  });
}
function resetForm(formId){
  var form=$(formId);if(form)form.reset();
  qsa('.form-error',form).forEach(function(e){e.textContent='';e.style.display='none';});
}

function populateSelect(id,list,valueField,labelField,placeholder){
  var el=$(id);if(!el)return;
  el.innerHTML='';
  if(placeholder){
    var o=document.createElement('option');o.value='';o.textContent=placeholder;el.appendChild(o);
  }
  (list||[]).forEach(function(item){
    var o=document.createElement('option');
    o.value=typeof item==='object'?item[valueField]:item;
    o.textContent=typeof item==='object'?item[labelField]:item;
    el.appendChild(o);
  });
}
function populateSelectFromList(id,list,placeholder){
  var el=$(id);if(!el)return;
  el.innerHTML='';
  if(placeholder){
    var o=document.createElement('option');o.value='';o.textContent=placeholder;el.appendChild(o);
  }
  (list||[]).forEach(function(item){
    var o=document.createElement('option');o.value=item;o.textContent=item;el.appendChild(o);
  });
}

function renderTable(data,columns,actions,containerId,opts){
  opts=opts||{};
  var pageSize=opts.pageSize||10;
  var page=opts.page||1;
  var container=$(containerId);if(!container)return;
  if(!data||!data.length){
    container.innerHTML='<div class="empty-state"><p>No records found</p></div>';
    return;
  }
  var total=data.length;
  var totalPages=Math.ceil(total/pageSize);
  if(page>totalPages)page=totalPages;
  var start=(page-1)*pageSize;
  var slice=data.slice(start,start+pageSize);

  var html='<div class="table-responsive"><table class="data-table"><thead><tr>';
  columns.forEach(function(col){html+='<th'+(col.width?' style="width:'+col.width+'"':'')+'>'+escHtml(col.label)+'</th>';});
  if(actions)html+='<th style="width:120px">Actions</th>';
  html+='</tr></thead><tbody>';
  slice.forEach(function(row,idx){
    html+='<tr data-idx="'+(start+idx)+'">';
    columns.forEach(function(col){
      var val=row[col.field];
      if(col.render)html+='<td>'+col.render(val,row)+'</td>';
      else if(col.type==='badge')html+='<td>'+badge(val,col.colors)+'</td>';
      else if(col.type==='date')html+='<td>'+formatDateTime(val)+'</td>';
      else html+='<td>'+(val!=null?escHtml(val):'')+'</td>';
    });
    if(actions)html+='<td class="actions-cell">'+actions(row)+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  if(totalPages>1){
    html+='<div class="table-footer"><span class="table-info">Showing '+(start+1)+'-'+Math.min(start+pageSize,total)+' of '+total+'</span><div class="pagination">';
    html+='<button class="btn-page" data-page="1"'+(page===1?' disabled':'')+'>&laquo;</button>';
    html+='<button class="btn-page" data-page="'+(page-1)+'"'+(page===1?' disabled':'')+'>&lsaquo;</button>';
    for(var i=Math.max(1,page-2);i<=Math.min(totalPages,page+2);i++){
      html+='<button class="btn-page'+(i===page?' active':'')+'" data-page="'+i+'">'+i+'</button>';
    }
    html+='<button class="btn-page" data-page="'+(page+1)+'"'+(page===totalPages?' disabled':'')+'>&rsaquo;</button>';
    html+='<button class="btn-page" data-page="'+totalPages+'"'+(page===totalPages?' disabled':'')+'>&raquo;</button>';
    html+='</div></div>';
  }
  container.innerHTML=html;
  if(opts.onPageClick){
    qsa('.btn-page',container).forEach(function(btn){
      btn.addEventListener('click',function(){if(!this.disabled)opts.onPageClick(parseInt(this.dataset.page));});
    });
  }
}

function badge(text,colors){
  colors=colors||{};
  var cls=colors[String(text).toLowerCase()]||'badge-default';
  return '<span class="badge '+cls+'">'+escHtml(text)+'</span>';
}

function statusBadge(s){
  var map={open:'badge-info',running:'badge-warning',closed:'badge-success',pending:'badge-warning',approved:'badge-success',active:'badge-success',inactive:'badge-danger',overdue:'badge-danger',scheduled:'badge-info','in progress':'badge-warning',completed:'badge-success',returned:'badge-warning',waitingapproval:'badge-warning',retired:'badge-danger',draft:'badge-secondary'};
  return '<span class="badge '+(map[String(s).toLowerCase()]||'badge-secondary')+'">'+escHtml(s||'')+'</span>';
}
function priorityBadge(p){
  var map={critical:'badge-danger',high:'badge-warning',medium:'badge-info',low:'badge-secondary'};
  return '<span class="badge '+(map[String(p).toLowerCase()]||'badge-secondary')+'">'+escHtml(p||'')+'</span>';
}

function debounce(fn,ms){
  var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},ms);};
}

function showToast(msg,type){
  type=type||'info';
  var c=document.querySelector('.toast-container');
  if(!c){c=document.createElement('div');c.className='toast-container';document.body.appendChild(c);}
  var t=document.createElement('div');
  t.className='toast toast-'+type;
  t.innerHTML='<span>'+escHtml(msg)+'</span><button class="toast-close">&times;</button>';
  c.appendChild(t);
  t.querySelector('.toast-close').addEventListener('click',function(){t.remove();});
  setTimeout(function(){t.classList.add('toast-show');},10);
  setTimeout(function(){t.classList.remove('toast-show');setTimeout(function(){t.remove();},300);},3000);
}

function showConfirm(title,msg,onConfirm){
  var overlay=document.getElementById('confirmOverlay');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='confirmOverlay';overlay.className='modal-overlay';
    overlay.innerHTML='<div class="modal"><div class="modal-header"><h3 id="confirmTitle"></h3></div><div class="modal-body"><p id="confirmMessage"></p></div><div class="modal-footer" id="confirmButtons"></div></div>';
    document.body.appendChild(overlay);
  }
  setText('confirmTitle',title);
  setText('confirmMessage',msg);
  var btns=$('confirmButtons');
  btns.innerHTML='<button class="btn btn-secondary" id="confirmCancel">Cancel</button><button class="btn btn-primary" id="confirmOk">Confirm</button>';
  overlay.style.display='flex';
  $('confirmCancel').addEventListener('click',function(){overlay.style.display='none';});
  $('confirmOk').addEventListener('click',function(){overlay.style.display='none';if(onConfirm)onConfirm();});
}

function showModal(id){var el=$(id);if(el)el.style.display='flex';}
function hideModal(id){var el=$(id);if(el)el.style.display='none';}

function showLoading(show){
  var el=$('loadingOverlay');
  if(!el)return;
  el.style.display=show===false?'none':'flex';
}

function memoize(fn){
  var cache={};
  return function(){
    var key=JSON.stringify(arguments);
    if(cache[key]!==undefined)return cache[key];
    cache[key]=fn.apply(this,arguments);
    return cache[key];
  };
}

function uid(){return'_'+Math.random().toString(36).substr(2,9);}

function capitalize(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}

function unique(arr,field){
  var seen={};return(arr||[]).filter(function(item){
    var v=field?item[field]:item;
    if(seen[v])return false;seen[v]=true;return true;
  });
}

function sortBy(arr,field,desc){
  return(arr||[]).slice().sort(function(a,b){
    var va=a[field]||'',vb=b[field]||'';
    if(va<vb)return desc?1:-1;if(va>vb)return desc?-1:1;return 0;
  });
}

C.utils={
  $:$,qs:qs,qsa:qsa,
  escHtml:escHtml,setText:setText,setHtml:setHtml,
  getVal:getVal,setVal:setVal,
  showEl:showEl,hideEl:hideEl,
  addClass:addClass,removeClass:removeClass,toggleClass:toggleClass,
  formatDate:formatDate,formatDateTime:formatDateTime,formatTime:formatTime,
  nowISO:nowISO,timeAgo:timeAgo,pad:pad,
  calcDuration:calcDuration,durationDisplay:durationDisplay,durationFromDates:durationFromDates,
  getFormData:getFormData,setFormData:setFormData,resetForm:resetForm,
  populateSelect:populateSelect,populateSelectFromList:populateSelectFromList,
  renderTable:renderTable,badge:badge,statusBadge:statusBadge,priorityBadge:priorityBadge,
  debounce:debounce,showToast:showToast,showConfirm:showConfirm,
  showModal:showModal,hideModal:hideModal,showLoading:showLoading,
  memoize:memoize,uid:uid,capitalize:capitalize,unique:unique,sortBy:sortBy
};

})();
