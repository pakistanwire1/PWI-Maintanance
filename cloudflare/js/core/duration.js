var Duration = {
  _state: 0,
  _timer: null,

  parseToMinutes: function(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'boolean') return 0;
    if (typeof val === 'number') {
      if (val <= 0) return 0;
      if (val < 1) return Math.round(val * 24 * 60);
      if (val === Math.floor(val)) return val;
      return Math.round(val * 24 * 60);
    }
    if (val instanceof Date) {
      return Math.round(val.getTime() / 60000);
    }
    var s = String(val).trim();
    if (s === '' || s === '0' || s === '00:00' || s === '00:00:00') return 0;
    if (s.indexOf('h ') > -1 || (s.indexOf('d ') > -1 && s.indexOf(':') === -1)) return 0;
    var daysTimeMatch = s.match(/(\d+)\s+Days?\s+(\d{1,2}):(\d{2})/i);
    if (daysTimeMatch) {
      return parseInt(daysTimeMatch[1]) * 1440 + parseInt(daysTimeMatch[2]) * 60 + parseInt(daysTimeMatch[3]);
    }
    if (s.indexOf('T') !== -1 && s.match(/^\d{4}-\d{2}-\d{2}T/)) {
      var d = new Date(s);
      if (!isNaN(d.getTime())) {
        var sheetDateMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        var epochMs = Date.UTC(1899, 11, 30);
        var totalDays = Math.round((sheetDateMs - epochMs) / 86400000);
        if (totalDays < 0) totalDays = 0;
        return totalDays * 1440 + d.getUTCHours() * 60 + d.getUTCMinutes() + Math.round(d.getUTCSeconds() / 60);
      }
      return 0;
    }
    var dMatch = s.match(/(\d+)\s*d\b/i);
    var hMatch = s.match(/(\d+)\s*h\b/i);
    var mMatch = s.match(/(\d+)\s*m\b/i);
    if (dMatch || hMatch || mMatch) {
      return (Number(dMatch ? dMatch[1] : 0) * 1440) +
             (Number(hMatch ? hMatch[1] : 0) * 60) +
             Number(mMatch ? mMatch[1] : 0);
    }
    if (s.indexOf(':') !== -1) {
      var parts = s.split(':');
      if (parts.length === 3) {
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0) + Math.round((parseInt(parts[2]) || 0) / 60);
      }
      if (parts.length === 2) {
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      }
    }
    var num = parseFloat(s);
    if (!isNaN(num) && num > 0) return Math.round(num);
    return 0;
  },

  format: function(minutes) {
    var m = this.parseToMinutes(minutes);
    if (m <= 0) return '0m';
    var d = Math.floor(m / 1440);
    var h = Math.floor((m % 1440) / 60);
    var rm = m % 60;
    var parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0 || d > 0) parts.push(h + 'h');
    if (rm > 0 || parts.length === 0) parts.push(rm + 'm');
    return parts.join(' ');
  },

  formatHours: function(minutes) {
    var m = this.parseToMinutes(minutes);
    if (m <= 0) return '0m';
    var h = Math.floor(m / 60);
    var rm = m % 60;
    return h + 'h ' + rm + 'm';
  },

  formatDays: function(minutes) {
    var m = this.parseToMinutes(minutes);
    if (m <= 0) return '0m';
    var d = Math.floor(m / 1440);
    var h = Math.floor((m % 1440) / 60);
    var rm = m % 60;
    if (d > 0) return d + 'd ' + String(h).padStart(2, '0') + ':' + String(rm).padStart(2, '0');
    return h + 'h ' + rm + 'm';
  },

  fromMs: function(ms) {
    if (!ms || ms < 0) ms = 0;
    var totalMinutes = Math.floor(ms / 60000);
    return this.format(totalMinutes);
  },

  fromDates: function(startStr, endStr) {
    if (!startStr) return '\u2014';
    var start = new Date(startStr);
    var end = endStr ? new Date(endStr) : new Date();
    return this.fromMs(end.getTime() - start.getTime());
  },

  fromDatesMinutes: function(startStr, endStr) {
    if (!startStr) return 0;
    var start = new Date(startStr);
    var end = endStr ? new Date(endStr) : new Date();
    var ms = end.getTime() - start.getTime();
    return ms > 0 ? Math.floor(ms / 60000) : 0;
  },

  cell: function(minutes) {
    var m = this.parseToMinutes(minutes);
    return '<span class="duration-rotate" data-duration="' + m + '">' + this.formatHours(m) + '</span>';
  },

  cellFromMs: function(ms) {
    var m = Math.floor((ms || 0) / 60000);
    return '<span class="duration-rotate" data-duration="' + m + '">' + this.formatHours(m) + '</span>';
  },

  cellFromDates: function(startStr, endStr) {
    if (!startStr) return '\u2014';
    var m = this.fromDatesMinutes(startStr, endStr);
    return '<span class="duration-rotate live-timer" data-start="' + startStr + '" data-duration="' + m + '">' + this.formatHours(m) + '</span>';
  },

  setElement: function(el, minutes) {
    if (!el) return;
    var m = this.parseToMinutes(minutes);
    el.setAttribute('data-duration', m);
    el.classList.add('duration-rotate');
    el.textContent = Duration._state === 0 ? Duration.formatHours(m) : Duration.formatDays(m);
  },

  startRotation: function(intervalMs) {
    if (Duration._timer) clearInterval(Duration._timer);
    Duration._state = 0;
    Duration._timer = setInterval(function() {
      Duration._state = Duration._state === 0 ? 1 : 0;
      var elements = document.querySelectorAll('.duration-rotate');
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var startAttr = el.getAttribute('data-start');
        if (startAttr) {
          var ms = Date.now() - new Date(startAttr).getTime();
          var mins = ms > 0 ? Math.floor(ms / 60000) : 0;
          el.setAttribute('data-duration', mins);
        }
        var mins = parseInt(el.getAttribute('data-duration'));
        if (isNaN(mins)) continue;
        el.classList.add('kpi-fade-out');
        (function(el, mins) {
          setTimeout(function() {
            el.textContent = Duration._state === 0 ? Duration.formatHours(mins) : Duration.formatDays(mins);
            el.classList.remove('kpi-fade-out');
            el.classList.add('kpi-fade-in');
            setTimeout(function() { el.classList.remove('kpi-fade-in'); }, 360);
          }, 350);
        })(el, mins);
      }
    }, intervalMs || 3000);
  }
};
