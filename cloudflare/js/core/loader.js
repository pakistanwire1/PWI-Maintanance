var Loader = {
  show: function(msg) {
    var el = document.getElementById('loadingOverlay');
    if (el) {
      el.classList.add('show');
      if (msg) {
        var div = el.querySelector('div:last-child');
        if (div) div.textContent = msg;
      }
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
