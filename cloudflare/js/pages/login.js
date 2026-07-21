(function() {
  function initLoginPage() {
    Theme.apply();
    loadRememberedEmail();
    LoginPage.initLoginSlideshow();
  }

  var LoginPage = {
    slideshowInterval: null,

    initLoginSlideshow: function() {
      var slides = document.querySelectorAll('.login-slide');
      if (slides.length < 2) return;
      LoginPage.slideshowInterval = setInterval(function() {
        var current = 0;
        for (var i = 0; i < slides.length; i++) {
          if (slides[i].classList.contains('active')) { current = i; break; }
        }
        slides[current].classList.remove('active');
        var next = (current + 1) % slides.length;
        slides[next].classList.add('active');
      }, 4500);
    }
  };

  window.loginToggleTheme = function() {
    Theme.toggle();
    loginUpdateThemeIcon();
  };

  window.loginUpdateThemeIcon = function() {
    var icon = document.getElementById('loginThemeIcon');
    if (!icon) return;
    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    icon.innerHTML = isLight
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  };

  window.togglePasswordVisibility = function() {
    var passInput = document.getElementById('loginPassword');
    var openIcon = document.getElementById('eyeIconOpen');
    var closedIcon = document.getElementById('eyeIconClosed');
    if (!passInput) return;
    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (openIcon) openIcon.style.display = 'none';
      if (closedIcon) closedIcon.style.display = 'block';
    } else {
      passInput.type = 'password';
      if (openIcon) openIcon.style.display = 'block';
      if (closedIcon) closedIcon.style.display = 'none';
    }
  };

  window.toggleResetPasswordVisibility = function() {
    var passInput = document.getElementById('resetNewPassword');
    var openIcon = document.getElementById('resetEyeOpen');
    var closedIcon = document.getElementById('resetEyeClosed');
    if (!passInput) return;
    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (openIcon) openIcon.style.display = 'none';
      if (closedIcon) closedIcon.style.display = 'block';
    } else {
      passInput.type = 'password';
      if (openIcon) openIcon.style.display = 'block';
      if (closedIcon) closedIcon.style.display = 'none';
    }
  };

  window.showForgotPassword = function() {
    var modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'flex';
    var emailInput = document.getElementById('forgotEmail');
    if (emailInput) {
      var loginEmail = document.getElementById('loginEmail');
      emailInput.value = loginEmail ? loginEmail.value.trim() : '';
    }
    var result = document.getElementById('forgotResult');
    if (result) { result.style.display = 'none'; result.textContent = ''; }
    var step1 = document.getElementById('forgotStep1');
    var step2 = document.getElementById('forgotStep2');
    var submitBtn = document.getElementById('forgotSubmitBtn');
    var resetBtn = document.getElementById('resetPasswordBtn');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'inline-block';
    if (resetBtn) resetBtn.style.display = 'none';
  };

  window.closeForgotPassword = function() {
    var modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
  };

  window.submitForgotPassword = function() {
    var emailInput = document.getElementById('forgotEmail');
    var resultDiv = document.getElementById('forgotResult');
    var submitBtn = document.getElementById('forgotSubmitBtn');
    var email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
      if (resultDiv) {
        resultDiv.textContent = 'Please enter your email address.';
        resultDiv.className = 'login-forgot-result error';
        resultDiv.style.display = 'block';
      }
      if (emailInput) emailInput.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (resultDiv) {
        resultDiv.textContent = 'Please enter a valid email address.';
        resultDiv.className = 'login-forgot-result error';
        resultDiv.style.display = 'block';
      }
      if (emailInput) emailInput.focus();
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

    API.post('resetPassword', { email: email })
      .then(function(result) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Token'; }
        if (result && result.success) {
          if (resultDiv) {
            resultDiv.textContent = result.message;
            resultDiv.className = 'login-forgot-result success';
            resultDiv.style.display = 'block';
          }
          var step1 = document.getElementById('forgotStep1');
          var step2 = document.getElementById('forgotStep2');
          var submitBtnEl = document.getElementById('forgotSubmitBtn');
          var resetBtn = document.getElementById('resetPasswordBtn');
          if (step1) step1.style.display = 'none';
          if (step2) step2.style.display = 'block';
          if (submitBtnEl) submitBtnEl.style.display = 'none';
          if (resetBtn) resetBtn.style.display = 'inline-block';
        } else {
          if (resultDiv) {
            resultDiv.textContent = result && result.message ? result.message : 'Email not registered.';
            resultDiv.className = 'login-forgot-result error';
            resultDiv.style.display = 'block';
          }
        }
      })
      .catch(function(err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Token'; }
        if (resultDiv) {
          resultDiv.textContent = 'An error occurred. Please try again.';
          resultDiv.className = 'login-forgot-result error';
          resultDiv.style.display = 'block';
        }
      });
  };

  window.submitResetPassword = function() {
    var emailInput = document.getElementById('forgotEmail');
    var tokenInput = document.getElementById('resetToken');
    var passInput = document.getElementById('resetNewPassword');
    var resultDiv = document.getElementById('forgotResult');
    var resetBtn = document.getElementById('resetPasswordBtn');
    var email = emailInput ? emailInput.value.trim() : '';
    var token = tokenInput ? tokenInput.value.trim() : '';
    var newPass = passInput ? passInput.value : '';

    if (!token) {
      if (resultDiv) {
        resultDiv.textContent = 'Please enter the reset token from your email.';
        resultDiv.className = 'login-forgot-result error';
        resultDiv.style.display = 'block';
      }
      if (tokenInput) tokenInput.focus();
      return;
    }

    if (!newPass || newPass.length < 4) {
      if (resultDiv) {
        resultDiv.textContent = 'Please enter a new password (minimum 4 characters).';
        resultDiv.className = 'login-forgot-result error';
        resultDiv.style.display = 'block';
      }
      if (passInput) passInput.focus();
      return;
    }

    if (resetBtn) { resetBtn.disabled = true; resetBtn.textContent = 'Resetting...'; }

    API.post('resetPasswordConfirm', { email: email, token: token, newPassword: newPass })
      .then(function(result) {
        if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Reset Password'; }
        if (result && result.success) {
          if (resultDiv) {
            resultDiv.textContent = 'Password reset successfully! You can now login with your new password.';
            resultDiv.className = 'login-forgot-result success';
            resultDiv.style.display = 'block';
          }
          var step2 = document.getElementById('forgotStep2');
          var resetBtnEl = document.getElementById('resetPasswordBtn');
          if (step2) step2.style.display = 'none';
          if (resetBtnEl) resetBtnEl.style.display = 'none';
          setTimeout(function() { closeForgotPassword(); }, 1500);
        } else {
          if (resultDiv) {
            resultDiv.textContent = result && result.message ? result.message : 'Invalid or expired token.';
            resultDiv.className = 'login-forgot-result error';
            resultDiv.style.display = 'block';
          }
        }
      })
      .catch(function(err) {
        if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Reset Password'; }
        if (resultDiv) {
          resultDiv.textContent = 'An error occurred. Please try again.';
          resultDiv.className = 'login-forgot-result error';
          resultDiv.style.display = 'block';
        }
      });
  };

  window.handleLogin = function(e) {
    e.preventDefault();
    var emailEl = document.getElementById('loginEmail');
    var passEl = document.getElementById('loginPassword');
    var email = emailEl ? emailEl.value.trim() : '';
    var password = passEl ? passEl.value : '';
    var btn = document.getElementById('loginBtn');
    var errorDiv = document.getElementById('loginError');
    var rememberEl = document.getElementById('loginRemember');
    var remember = rememberEl ? rememberEl.checked : false;

    if (errorDiv) errorDiv.style.display = 'none';

    if (!email) {
      showLoginError('Please enter your email.');
      if (emailEl) emailEl.focus();
      return false;
    }

    if (!password) {
      showLoginError('Please enter your password.');
      if (passEl) passEl.focus();
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showLoginError('Please enter a valid email address.');
      if (emailEl) emailEl.focus();
      return false;
    }

    setLoginLoading(true);

    if (remember) {
      try { localStorage.setItem('cmms_remember_email', email); } catch(e) {}
    } else {
      try { localStorage.removeItem('cmms_remember_email'); } catch(e) {}
    }

    API.post('login', { email: email, password: password })
      .then(function(result) {
        setLoginLoading(false);
        if (result && result.success) {
          Session.setToken(result.token);
          Session.setUser(result.user);
          startApp();
        } else {
          showLoginError(result && result.message ? result.message : 'Invalid Email or Password.');
        }
      })
      .catch(function(err) {
        setLoginLoading(false);
        showLoginError('Invalid Email or Password.');
      });

    return false;
  };

  function showLoginError(msg) {
    var errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    }
  }

  function setLoginLoading(loading) {
    var btn = document.getElementById('loginBtn');
    if (!btn) return;
    btn.disabled = loading;
    var btnText = btn.querySelector('.login-btn-text');
    var spnr = btn.querySelector('.spinner');
    if (btnText) btnText.textContent = loading ? 'Signing in...' : 'Sign In';
    if (spnr) spnr.style.display = loading ? 'inline-block' : 'none';
  }

  function loadRememberedEmail() {
    try {
      var saved = localStorage.getItem('cmms_remember_email');
      if (saved) {
        var emailInput = document.getElementById('loginEmail');
        var rememberEl = document.getElementById('loginRemember');
        if (emailInput) emailInput.value = saved;
        if (rememberEl) rememberEl.checked = true;
      }
    } catch(e) {}
  }

  window.onLoginKeyDown = function(e) {
    if (e.key === 'Enter') {
      var form = document.getElementById('loginForm');
      if (form) form.dispatchEvent(new Event('submit'));
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
  } else {
    initLoginPage();
  }
})();
