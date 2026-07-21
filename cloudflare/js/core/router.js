(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var pages={};
  var currentPage=null;
  var currentConfig=null;
  var contentEl=null;

  function getContentEl(){
    if(!contentEl)contentEl=document.getElementById('mainContent')||document.querySelector('.main-content');
    return contentEl;
  }

  function registerPage(name,config){
    pages[name]=config;
  }

  function getCurrentPage(){
    return currentPage;
  }

  function parseHash(){
    var hash=window.location.hash.replace(/^#/,'');
    if(hash.indexOf('page-')===0)return hash.substring(5);
    return null;
  }

  function destroyPage(){
    if(currentConfig&&currentConfig.destroy){
      try{currentConfig.destroy();}catch(e){}
    }
    var el=getContentEl();
    if(el)el.innerHTML='';
    currentPage=null;
    currentConfig=null;
  }

  function loadPage(name){
    var config=pages[name];
    if(!config){
      navigateTo('dashboard');
      return;
    }
    if(config.requiresAuth&&!C.session.isLoggedIn()){
      navigateTo('login');
      return;
    }
    destroyPage();
    currentPage=name;
    currentConfig=config;
    document.title=config.title?(config.title+' - CMMS'):'CMMS';
    var el=getContentEl();
    if(el){
      el.innerHTML='';
      if(config.init){
        try{config.init(el);}catch(e){console.error('Page init error:',e);}
      }
      if(config.load){
        try{config.load(el);}catch(e){console.error('Page load error:',e);}
      }
    }
  }

  function navigateTo(page){
    var target='#page-'+page;
    if(window.location.hash===target){
      loadPage(page);
    }else{
      window.location.hash=target;
    }
  }

  function handleHashChange(){
    var page=parseHash();
    if(!page||!pages[page]){
      page=C.session.isLoggedIn()?'dashboard':'login';
      window.location.hash='#page-'+page;
      return;
    }
    loadPage(page);
  }

  function init(){
    window.addEventListener('hashchange',handleHashChange);
    handleHashChange();
  }

  function hasPage(name){
    return !!pages[name];
  }

  function getPageConfig(name){
    return pages[name]||null;
  }

  C.router={
    registerPage:registerPage,
    navigateTo:navigateTo,
    getCurrentPage:getCurrentPage,
    hasPage:hasPage,
    getPageConfig:getPageConfig,
    handleHashChange:handleHashChange,
    init:init
  };
})();
