(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var currentUser=null;

  function storeUser(user){
    localStorage.setItem('cmms_user',JSON.stringify(user));
  }
  function getStoredUser(){
    try{return JSON.parse(localStorage.getItem('cmms_user'));}
    catch(e){return null;}
  }
  function clearSession(){
    localStorage.removeItem('cmms_token');
    localStorage.removeItem('cmms_user');
    localStorage.removeItem('cmms_session');
    currentUser=null;
  }

  function login(email,password){
    return C.api.mutate('login',{email:email,password:password}).then(function(data){
      var user=data.user||data;
      if(data.token)C.api.set(data.token);
      storeUser(user);
      currentUser=user;
      return user;
    });
  }

  function logout(silent){
    if(!silent){
      C.api.mutate('logout').catch(function(){});
    }
    clearSession();
    window.location.hash='#page-login';
  }

  function restore(){
    var stored=getStoredUser();
    if(!stored)return Promise.resolve(null);
    return C.api.call('validateSession').then(function(data){
      var user=data.user||data;
      storeUser(user);
      currentUser=user;
      return user;
    }).catch(function(){
      logout(true);
      return null;
    });
  }

  function isLoggedIn(){
    var token=C.api.get();
    return!!token&&!!currentUser;
  }

  function getUser(){
    return currentUser;
  }

  function hasPermission(perm){
    if(!currentUser)return false;
    if(currentUser.isSystemAdmin||currentUser.role==='Admin'||currentUser.role==='Administrator')return true;
    if(currentUser.permissions&&currentUser.permissions[perm]!==undefined)return!!currentUser.permissions[perm];
    return!!currentUser[perm];
  }

  function isAdmin(){
    if(!currentUser)return false;
    return currentUser.isSystemAdmin||currentUser.role==='Admin'||currentUser.role==='Administrator';
  }

  function getToken(){
    return C.api.get();
  }

  C.session={
    login:login,
    logout:logout,
    restore:restore,
    isLoggedIn:isLoggedIn,
    getUser:getUser,
    hasPermission:hasPermission,
    isAdmin:isAdmin,
    getToken:getToken
  };
})();
