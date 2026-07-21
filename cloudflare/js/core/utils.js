var Utils = {
  formatDate: function(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    } catch(e) { return dateStr; }
  },

  formatDateTime: function(dateStr) {
    if (!dateStr) return '-';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var h = d.getHours(), m = d.getMinutes(), ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' + ('0'+h).slice(-2) + ':' + ('0'+m).slice(-2) + ' ' + ampm;
    } catch(e) { return dateStr; }
  },

  timeAgo: function(dateStr) {
    if (!dateStr) return '';
    var now = new Date(), d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
    return Utils.formatDate(dateStr);
  },

  escapeHtml: function(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  debounce: function(fn, delay) {
    var timer;
    return function() {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
    };
  },

  getInitials: function(name) {
    if (!name) return '?';
    return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0,2);
  },

  getBadgeClass: function(status) {
    if (!status) return 'badge-secondary';
    var s = status.toLowerCase();
    if (s === 'open') return 'badge-open';
    if (s === 'running' || s === 'in progress') return 'badge-running';
    if (s === 'closed' || s === 'completed') return 'badge-closed';
    if (s === 'pending') return 'badge-pending';
    if (s === 'approved') return 'badge-approved';
    if (s === 'overdue') return 'badge-danger';
    if (s === 'active') return 'badge-success';
    if (s === 'inactive' || s === 'retired') return 'badge-secondary';
    return 'badge-secondary';
  },

  capitalize: function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  truncate: function(str, len) {
    if (!str) return '';
    str = String(str);
    return str.length > len ? str.slice(0, len) + '...' : str;
  },

  generateId: function(prefix) {
    return (prefix || 'ID') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }
};
