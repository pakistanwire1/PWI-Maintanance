(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};
var U=C.utils;

var STORAGE_KEY='cmms_theme';
var PREFS_KEY='cmms_themePrefs';
var _prefs=null;

function loadPrefs(){
  if(_prefs)return _prefs;
  try{
    var stored=localStorage.getItem(PREFS_KEY);
    if(stored){_prefs=JSON.parse(stored);return _prefs;}
  }catch(e){}
  try{
    var mode=localStorage.getItem(STORAGE_KEY);
    if(mode){_prefs={mode:mode,accent:'#6366f1'};return _prefs;}
  }catch(e){}
  _prefs={mode:'dark',accent:'#6366f1'};
  return _prefs;
}

function savePrefs(){
  if(!_prefs)return;
  try{
    localStorage.setItem(PREFS_KEY,JSON.stringify(_prefs));
    localStorage.setItem(STORAGE_KEY,_prefs.mode);
  }catch(e){}
}

function apply(prefs){
  prefs=prefs||loadPrefs();
  var mode=prefs.mode||'dark';
  if(mode==='auto'){
    mode=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  }
  document.documentElement.setAttribute('data-theme',mode);
  var accent=prefs.accent||'#6366f1';
  document.documentElement.style.setProperty('--primary',accent);
  var r=parseInt(accent.slice(1,3),16);
  var g=parseInt(accent.slice(3,5),16);
  var b=parseInt(accent.slice(5,7),16);
  document.documentElement.style.setProperty('--primary-dark','rgb('+Math.max(0,r-20)+','+Math.max(0,g-20)+','+Math.max(0,b-20)+')');
  document.documentElement.style.setProperty('--primary-light','rgba('+r+','+g+','+b+',0.14)');
  document.documentElement.style.setProperty('--primary-glow','rgba('+r+','+g+','+b+',0.25)');
  if(C.nav)C.nav.updateClockIcon(mode);
}

function toggle(){
  var prefs=loadPrefs();
  var currentMode=document.documentElement.getAttribute('data-theme')||'dark';
  prefs.mode=currentMode==='dark'?'light':'dark';
  _prefs=prefs;
  savePrefs();
  apply(prefs);
  U.showToast('Switched to '+prefs.mode+' mode','info');
}

function init(){
  var prefs=loadPrefs();
  _prefs=prefs;
  apply(prefs);
}

function getPrefs(){
  return loadPrefs();
}

C.theme={
  init:init,
  toggle:toggle,
  apply:apply,
  getPrefs:getPrefs
};

})();
