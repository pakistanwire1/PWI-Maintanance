var Notify = {
  container: null,

  init: function() {
    Notify.container = document.getElementById('toastContainer');
    if (!Notify.container) {
      Notify.container = document.createElement('div');
      Notify.container.id = 'toastContainer';
      Notify.container.className = 'toast-container';
      document.body.appendChild(Notify.container);
    }
  },

  show: function(message, type, duration) {
    if (!Notify.container) Notify.init();
    type = type || 'info';
    duration = duration || 3500;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = (icons[type] || icons.info) + '<span>' + Utils.escapeHtml(message) + '</span>';
    Notify.container.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, duration);
  },

  success: function(msg) { Notify.show(msg, 'success'); },
  error: function(msg) { Notify.show(msg, 'error', 5000); },
  warning: function(msg) { Notify.show(msg, 'warning', 4000); },
  info: function(msg) { Notify.show(msg, 'info'); }
};
