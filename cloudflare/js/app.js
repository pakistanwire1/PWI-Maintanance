(function(){
'use strict';
var C=window.CMMS=window.CMMS||{};

C.app={
  init:function(){
    C.theme.init();
    var hasToken=!!C.api.get();
    if(hasToken){
      C.loader.init();
      C.nav.init();
      C.notify.init();
      C.router.init();
      C.session.restore().then(function(user){
        if(user){
          var page=C.router.getCurrentPage()||'dashboard';
          if(!C.router.hasPage(page))page='dashboard';
          C.router.navigateTo(page);
        }else{
          showLogin();
        }
      }).catch(function(){
        showLogin();
      });
    }else{
      C.router.init();
      showLogin();
    }
  }
};

function showLogin(){
  var mc=document.getElementById('mainContent');
  if(!mc)return;
  mc.innerHTML=buildLoginHtml();
  bindLoginEvents();
}

C.router.registerPage('login',{
  title:'Login',
  init:function(){showLogin();},
  load:function(){}
});

function buildLoginHtml(){
  return '<div class="login-container">'+
    '<div class="login-card">'+
      '<div class="login-logo"><img src="logo.svg" alt="CMMS" onerror="this.style.display=\'none\'"></div>'+
      '<h1 class="login-title">PWI CMMS</h1>'+
      '<p class="login-subtitle">Computerized Maintenance Management System</p>'+
      '<form id="loginForm" autocomplete="on">'+
        '<div class="form-group">'+
          '<label for="loginEmail">Email</label>'+
          '<input type="email" id="loginEmail" class="form-input" placeholder="Enter your email" required autocomplete="email">'+
        '</div>'+
        '<div class="form-group">'+
          '<label for="loginPassword">Password</label>'+
          '<input type="password" id="loginPassword" class="form-input" placeholder="Enter your password" required autocomplete="current-password">'+
        '</div>'+
        '<div class="form-row">'+
          '<label class="checkbox-label"><input type="checkbox" id="loginRemember" checked> Remember me</label>'+
        '</div>'+
        '<div id="loginError" class="form-error" style="display:none"></div>'+
        '<button type="submit" class="btn btn-primary btn-block" id="loginBtn">Sign In</button>'+
      '</form>'+
    '</div>'+
  '</div>';
}

function bindLoginEvents(){
  var form=document.getElementById('loginForm');
  var emailInput=document.getElementById('loginEmail');
  var remembered=localStorage.getItem('cmms_remember_email');
  if(remembered&&emailInput)emailInput.value=remembered;

  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=emailInput.value.trim();
      var password=document.getElementById('loginPassword').value;
      var errorEl=document.getElementById('loginError');
      var btn=document.getElementById('loginBtn');

      if(!email||!password){
        errorEl.textContent='Please enter email and password';
        errorEl.style.display='block';
        return;
      }
      btn.disabled=true;btn.textContent='Signing in...';
      errorEl.style.display='none';

      C.session.login(email,password).then(function(){
        if(document.getElementById('loginRemember').checked){
          localStorage.setItem('cmms_remember_email',email);
        }else{
          localStorage.removeItem('cmms_remember_email');
        }
        C.loader.init();
        C.nav.init();
        C.notify.init();
        C.router.navigateTo('dashboard');
      }).catch(function(err){
        errorEl.textContent=(err&&err.error)||'Login failed. Please try again.';
        errorEl.style.display='block';
      }).finally(function(){
        btn.disabled=false;btn.textContent='Sign In';
      });
    });
  }
}

document.addEventListener('DOMContentLoaded',function(){
  C.app.init();
});

})();
