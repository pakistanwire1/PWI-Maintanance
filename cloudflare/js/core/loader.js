/* Loader:
 *  - Loader.show()/hide() : LOCAL, non-blocking page-level progress (thin bar at
 *    the top of #pageContent). Ref-counted; insertion is deferred so cached or
 *    instant renders never flash a loader at all. NEVER a full-screen overlay.
 *  - Loader.global()/setStage()/setProgress()/finish() : full-screen bootstrap
 *    splash with company title + animated progress line + real stage labels.
 *    Reserved for first boot / session initialization / explicit reload. */
var Loader = {
  _count: 0,
  _timer: null,

  show: function(msg) {
    Loader._count++;
    if (Loader._count > 1) return;
    clearTimeout(Loader._timer);
    Loader._timer = setTimeout(function() {
      if (Loader._count <= 0) return;
      var pc = document.getElementById('pageContent');
      if (!pc) return;
      var existing = document.getElementById('pageProgressBar');
      if (existing) {
        existing.classList.add('active');
        if (msg) existing.setAttribute('data-msg', msg);
        return;
      }
      var bar = document.createElement('div');
      bar.id = 'pageProgressBar';
      bar.className = 'page-progress-bar active';
      if (msg) bar.setAttribute('data-msg', msg);
      pc.appendChild(bar);
    }, 40);
  },

  hide: function() {
    if (Loader._count > 0) Loader._count--;
    if (Loader._count <= 0) {
      clearTimeout(Loader._timer);
      var el = document.getElementById('pageProgressBar');
      if (el) {
        el.classList.remove('active');
        el.classList.add('done');
        setTimeout(function() {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 320);
      }
    }
  },

  /* Full-screen splash — bootstrap / genuine global initialization only. */
  global: function(msg) {
    var el = document.getElementById('loadingOverlay');
    if (!el) return;
    el.classList.remove('done');
    el.classList.add('show');
    Loader.setStage(msg || '');
    var bar = document.getElementById('loadingProgress');
    if (bar) { bar.classList.add('indeterminate'); bar.classList.remove('determinate'); }
  },

  setStage: function(msg) {
    var st = document.getElementById('loadingStage');
    if (st) st.textContent = msg || '';
    var title = document.getElementById('loadingText');
    if (title && !msg) title.textContent = '';
  },

  setProgress: function(pct) {
    var bar = document.getElementById('loadingProgress');
    if (!bar) return;
    bar.classList.remove('indeterminate');
    bar.classList.add('determinate');
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  },

  finish: function() {
    var el = document.getElementById('loadingOverlay');
    var bar = document.getElementById('loadingProgress');
    if (bar) { bar.classList.remove('indeterminate'); bar.classList.add('determinate'); bar.style.width = '100%'; }
    var st = document.getElementById('loadingStage');
    if (st) st.textContent = 'Ready';
    if (el) {
      el.classList.add('done');
      setTimeout(function() { el.classList.remove('show', 'done'); }, 450);
    }
  },

  page: function(show) {
    if (show) {
      Loader.show('Loading page...');
    } else {
      Loader.hide();
    }
  }
};
