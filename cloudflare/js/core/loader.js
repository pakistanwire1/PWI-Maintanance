var Loader = {
  show: function(msg) {
    var el = document.getElementById('loadingOverlay');
    if (el) {
      el.classList.add('show');
      var textEl = document.getElementById('loadingText');
      if (textEl) textEl.textContent = msg || 'Loading...';
    }
  },

  hide: function() {
    var el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('show');
  },

  page: function(show) {
    if (show) {
      Loader.show('Loading page...');
    } else {
      Loader.hide();
    }
  }
};
