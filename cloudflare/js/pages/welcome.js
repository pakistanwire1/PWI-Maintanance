(function() {
  (function() {
    var saved = localStorage.getItem('cmms_theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();

  var FADE_OUT_MS = 400;

  var wasWelcomed = false;
  try { wasWelcomed = !!localStorage.getItem('cmms_welcomed'); } catch(e) {}

  var welcomeEl = document.getElementById('welcomePage');
  if (wasWelcomed) {
    if (welcomeEl) welcomeEl.style.display = 'none';
  } else {
    if (welcomeEl) welcomeEl.style.display = '';
  }

  var wsLoaded = false;
  var slideshowComplete = false;
  var pendingTransition = false;
  var progressTimer = null;
  var loadingTexts = ['Initializing system...', 'Loading modules...', 'Preparing interface...', 'Almost ready...'];
  var textIndex = 0;

  function updateThemeIcon() {
    var icon = document.getElementById('wsThemeIcon');
    if (!icon) return;
    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    icon.innerHTML = isLight
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cmms_theme', next);
    updateThemeIcon();
  }

  function readSlideshowDuration() {
    var firstSlide = document.querySelector('#welcomePage .ws-slide');
    if (!firstSlide) return 0;
    var cs = getComputedStyle(firstSlide);
    var raw = cs.animationDuration || '30s';
    var parts = raw.split(',')[0].trim();
    if (parts.indexOf('ms') !== -1) return parseFloat(parts);
    return parseFloat(parts) * 1000;
  }

  function countSlides() {
    return document.querySelectorAll('#welcomePage .ws-slide').length;
  }

  function onSlideshowCycleComplete() {
    if (slideshowComplete) return;
    slideshowComplete = true;

    var bar = document.getElementById('wsProgressBar');
    if (bar) bar.style.width = '100%';

    if (pendingTransition || !wsLoaded) {
      doTransition();
    }
  }

  function transitionToApp() {
    var welcomeEl = document.getElementById('welcomePage');
    var loginEl = document.getElementById('loginPage');
    if (!welcomeEl) return;

    welcomeEl.classList.add('fade-out');

    setTimeout(function() {
      welcomeEl.style.display = 'none';
      if (progressTimer) { clearTimeout(progressTimer); progressTimer = null; }
      try { localStorage.setItem('cmms_welcomed', '1'); } catch(e) {}

      if (Session.isLoggedIn()) {
        startApp();
      } else {
        loginEl.style.display = 'block';
        document.getElementById('appContainer').style.display = 'none';
      }
    }, FADE_OUT_MS);
  }

  function doTransition() {
    if (wsLoaded) return;
    wsLoaded = true;

    if (window.location.search && window.location.search.indexOf('qr=') !== -1) {
      localStorage.setItem('cmms_qr_url', window.location.href);
    }

    var btn = document.getElementById('wsBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="width:18px;height:18px;border:2px solid rgba(59,130,246,0.2);border-top-color:#3b82f6;border-radius:50%;display:inline-block;animation:wsSpin 0.6s linear infinite;margin-right:8px"></span> Loading...';
    }
    var wsErr = document.getElementById('wsError'); if (wsErr) wsErr.style.display = 'none';
    var wsRetry = document.getElementById('wsRetryBtn'); if (wsRetry) wsRetry.style.display = 'none';

    transitionToApp();
  }

  function wsEnter() {
    if (wsLoaded) return;

    if (!slideshowComplete) {
      pendingTransition = true;
      var btn = document.getElementById('wsBtn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="width:18px;height:18px;border:2px solid rgba(59,130,246,0.2);border-top-color:#3b82f6;border-radius:50%;display:inline-block;animation:wsSpin 0.6s linear infinite;margin-right:8px"></span> Loading...';
      }
      var wsErr = document.getElementById('wsError'); if (wsErr) wsErr.style.display = 'none';
      var wsRetry = document.getElementById('wsRetryBtn'); if (wsRetry) wsRetry.style.display = 'none';
      return;
    }

    doTransition();
  }

  function wsEnterFail(msg) {
    console.error('Welcome: Failed to proceed -', msg);
    var btn = document.getElementById('wsBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'ENTER CMMS <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    }
    var wsErrText = document.getElementById('wsErrorText'); if (wsErrText) wsErrText.textContent = 'Could not connect to server: ' + (msg || 'Unknown error');
    var wsErr = document.getElementById('wsError'); if (wsErr) wsErr.style.display = 'block';
    var wsRetry = document.getElementById('wsRetryBtn'); if (wsRetry) wsRetry.style.display = 'inline-block';
    wsLoaded = false;
  }

  function wsStart() {
    var slideCount = countSlides();
    var totalMs = readSlideshowDuration();

    var firstSlide = slideCount > 0 ? document.querySelector('#welcomePage .ws-slide') : null;

    if (!firstSlide || totalMs <= 0) {
      onSlideshowCycleComplete();
      return;
    }

    var cs = getComputedStyle(firstSlide);
    var iterCount = parseFloat(cs.animationIterationCount) || 0;
    if (isFinite(iterCount) && iterCount >= 1) {
      onSlideshowCycleComplete();
      return;
    }

    function onIteration() {
      firstSlide.removeEventListener('animationiteration', onIteration);
      onSlideshowCycleComplete();
    }
    firstSlide.addEventListener('animationiteration', onIteration);

    var bar = document.getElementById('wsProgressBar');
    var loadingText = document.getElementById('wsLoadingText');

    if (bar) {
      var start = Date.now();
      function tick() {
        var elapsed = Date.now() - start;
        var pct = Math.min(99, (elapsed / totalMs) * 100);
        bar.style.width = pct + '%';
        var newIndex = Math.min(3, Math.floor(pct / 25));
        if (newIndex !== textIndex && loadingText) {
          textIndex = newIndex;
          loadingText.textContent = loadingTexts[textIndex];
        }
        if (pct < 99) progressTimer = setTimeout(tick, 50);
      }
      progressTimer = setTimeout(tick, 50);
    }
  }

  window.wsToggleTheme = toggleTheme;
  window.wsEnter = wsEnter;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      updateThemeIcon();
      wsStart();
    });
  } else {
    updateThemeIcon();
    wsStart();
  }
})();
