var Theme = {
  KEY: 'cmms_theme',
  PREFS_KEY: 'cmms_theme_settings',

  get: function() {
    try { return localStorage.getItem(Theme.KEY) || 'dark'; } catch(e) { return 'dark'; }
  },

  getPrefs: function() {
    try { return JSON.parse(localStorage.getItem(Theme.PREFS_KEY) || '{}'); } catch(e) { return {}; }
  },

  set: function(theme) {
    try { localStorage.setItem(Theme.KEY, theme); } catch(e) {}
    Theme.apply(theme);
  },

  apply: function(theme) {
    document.documentElement.setAttribute('data-theme', theme || Theme.get());
    Theme.applyAccent();
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
      btn.innerHTML = theme === 'light'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    }
  },

  applyAccent: function(color) {
    var prefs = Theme.getPrefs();
    var accent = color || prefs.accentColor || '#6366f1';
    document.documentElement.style.setProperty('--primary', accent);
    var r = parseInt(accent.slice(1,3), 16);
    var g = parseInt(accent.slice(3,5), 16);
    var b = parseInt(accent.slice(5,7), 16);
    document.documentElement.style.setProperty('--primary-dark', 'rgb(' + Math.max(0,r-20) + ',' + Math.max(0,g-20) + ',' + Math.max(0,b-20) + ')');
    document.documentElement.style.setProperty('--primary-light', 'rgba(' + r + ',' + g + ',' + b + ',0.14)');
    document.documentElement.style.setProperty('--primary-glow', 'rgba(' + r + ',' + g + ',' + b + ',0.25)');
  },

  toggle: function() {
    var current = Theme.get();
    Theme.set(current === 'dark' ? 'light' : 'dark');
  }
};

function toggleTheme() { Theme.toggle(); }
