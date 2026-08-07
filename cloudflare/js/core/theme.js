var Theme = (function() {
  var KEY = 'cmms_theme';
  var PREFS_KEY = 'cmms_theme_settings';

  var PALETTES = [
    { id: 'indigo', name: 'Indigo', primary: '#6366f1', button: '#6366f1', sidebar: '#07080f', card: '#151829' },
    { id: 'blue', name: 'Blue', primary: '#3b82f6', button: '#3b82f6', sidebar: '#0b1220', card: '#111a2e' },
    { id: 'cyan', name: 'Cyan', primary: '#06b6d4', button: '#0891b2', sidebar: '#071319', card: '#0f1d24' },
    { id: 'green', name: 'Green', primary: '#22c55e', button: '#16a34a', sidebar: '#0a1a12', card: '#12241a' },
    { id: 'amber', name: 'Amber', primary: '#f59e0b', button: '#d97706', sidebar: '#1c1506', card: '#241b0a' },
    { id: 'red', name: 'Red', primary: '#ef4444', button: '#dc2626', sidebar: '#1e0a0c', card: '#2a1113' },
    { id: 'purple', name: 'Purple', primary: '#a855f7', button: '#9333ea', sidebar: '#14091e', card: '#1d0f2a' },
    { id: 'orange', name: 'Orange', primary: '#f97316', button: '#ea580c', sidebar: '#1c0f06', card: '#251607' }
  ];

  var DEFAULT_PREFS = {
    mode: 'dark',
    palette: 'indigo',
    accentColor: '#6366f1',
    sidebarColor: '',
    cardColor: '',
    buttonColor: '',
    cardStyle: 'glass',
    sidebarStyle: 'default',
    fontSize: 'medium'
  };

  var LIGHT_DEFAULTS = {
    sidebar: '#ffffff',
    card: '#ffffff'
  };
  var DARK_DEFAULTS = {
    sidebar: '#07080f',
    card: '#151829'
  };

  function getPrefs() {
    var out = {};
    for (var k in DEFAULT_PREFS) { if (Object.prototype.hasOwnProperty.call(DEFAULT_PREFS, k)) out[k] = DEFAULT_PREFS[k]; }
    try {
      var saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      for (var k2 in saved) { if (Object.prototype.hasOwnProperty.call(saved, k2)) out[k2] = saved[k2]; }
    } catch (e) {}
    return out;
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
    applyDraft(prefs);
  }

  function get() {
    try { return localStorage.getItem(KEY) || 'dark'; } catch (e) { return 'dark'; }
  }

  function set(theme) {
    var prefs = getPrefs();
    prefs.mode = theme === 'light' || theme === 'dark' ? theme : prefs.mode;
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    savePrefs(prefs);
  }

  function toggle() {
    var prefs = getPrefs();
    var resolved = resolveTheme(prefs);
    prefs.mode = resolved === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, prefs.mode); } catch (e) {}
    savePrefs(prefs);
  }

  function resolveTheme(prefs) {
    var mode = prefs.mode || 'dark';
    if (mode === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }

  function paletteById(id) {
    for (var i = 0; i < PALETTES.length; i++) {
      if (PALETTES[i].id === id) return PALETTES[i];
    }
    return PALETTES[0];
  }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(function(c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    var num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgba(hex, a) {
    var c = hexToRgb(hex);
    if (!c) return 'rgba(99,102,241,' + a + ')';
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function mix(hexA, hexB, t) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    if (!a || !b) return hexA;
    function to2(n) { return n.toString(16).length === 1 ? '0' + n.toString(16) : n.toString(16); }
    return '#' + to2(Math.round(a.r + (b.r - a.r) * t)) + to2(Math.round(a.g + (b.g - a.g) * t)) + to2(Math.round(a.b + (b.b - a.b) * t));
  }

  function adjust(hex, pct) {
    var c = hexToRgb(hex);
    if (!c) return hex;
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    if (l > 0.72) return mix(hex, '#000000', Math.abs(pct) * 0.6);
    return mix(hex, '#ffffff', Math.abs(pct));
  }

  function applyDraft(prefs) {
    if (!prefs) prefs = getPrefs();
    var root = document.documentElement;
    var theme = resolveTheme(prefs);
    var isLight = theme === 'light';

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-card-style', prefs.cardStyle || 'glass');
    root.setAttribute('data-sidebar-style', prefs.sidebarStyle || 'default');
    root.setAttribute('data-font-size', prefs.fontSize || 'medium');

    var pal = paletteById(prefs.palette);
    var baseDefaults = isLight ? LIGHT_DEFAULTS : DARK_DEFAULTS;
    var primary = prefs.accentColor || pal.primary;
    var button = prefs.buttonColor || pal.button || primary;
    var sidebar = prefs.sidebarColor || (isLight ? baseDefaults.sidebar : pal.sidebar);
    var card = prefs.cardColor || (isLight ? baseDefaults.card : pal.card);

    var pc = hexToRgb(primary);
    var pcR = pc ? pc.r : 99, pcG = pc ? pc.g : 102, pcB = pc ? pc.b : 241;
    var bc = hexToRgb(button);
    var bcR = bc ? bc.r : 99, bcG = bc ? bc.g : 102, bcB = bc ? bc.b : 241;

    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-dark', adjust(primary, 0.18));
    root.style.setProperty('--primary-light', 'rgba(' + pcR + ',' + pcG + ',' + pcB + ',0.14)');
    root.style.setProperty('--primary-glow', 'rgba(' + pcR + ',' + pcG + ',' + pcB + ',0.25)');

    root.style.setProperty('--btn-primary', button);
    root.style.setProperty('--btn-primary-dark', adjust(button, 0.18));
    root.style.setProperty('--btn-primary-glow', 'rgba(' + bcR + ',' + bcG + ',' + bcB + ',0.25)');

    root.style.setProperty('--bg-sidebar', sidebar);
    root.style.setProperty('--bg-sidebar-hover', 'rgba(' + pcR + ',' + pcG + ',' + pcB + ',0.07)');
    root.style.setProperty('--bg-sidebar-active', 'rgba(' + pcR + ',' + pcG + ',' + pcB + ',0.13)');

    root.style.setProperty('--bg-card', card);
    root.style.setProperty('--bg-card-hover', adjust(card, 0.08));
    root.style.setProperty('--bg-card-glass', isLight ? rgba(card, 0.92) : rgba(card, 0.88));
    root.style.setProperty('--bg-accent-soft', 'rgba(' + pcR + ',' + pcG + ',' + pcB + ',' + (isLight ? 0.04 : 0.06) + ')');

    updateToggleIcon(theme);
  }

  function updateToggleIcon(theme) {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    btn.innerHTML = theme === 'light'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
  }

  return {
    KEY: KEY,
    PREFS_KEY: PREFS_KEY,
    PALETTES: PALETTES,
    DEFAULT_PREFS: DEFAULT_PREFS,
    get: get,
    set: set,
    toggle: toggle,
    getPrefs: getPrefs,
    savePrefs: savePrefs,
    apply: function(theme) {
      var prefs = getPrefs();
      if (theme === 'light' || theme === 'dark') prefs.mode = theme;
      applyDraft(prefs);
    },
    applyDraft: applyDraft,
    preview: applyDraft,
    reset: function() {
      savePrefs(clonePrefs(DEFAULT_PREFS));
    },
    hexToRgb: hexToRgb,
    resolveTheme: resolveTheme,
    paletteById: paletteById,
    effectiveColors: function(prefs) {
      if (!prefs) prefs = getPrefs();
      var isLight = resolveTheme(prefs) === 'light';
      var pal = paletteById(prefs.palette);
      var baseDefaults = isLight ? LIGHT_DEFAULTS : DARK_DEFAULTS;
      return {
        primary: prefs.accentColor || pal.primary,
        button: prefs.buttonColor || pal.button || pal.primary,
        sidebar: prefs.sidebarColor || (isLight ? baseDefaults.sidebar : pal.sidebar),
        card: prefs.cardColor || (isLight ? baseDefaults.card : pal.card)
      };
    }
  };

  function clonePrefs(src) {
    var out = {};
    for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k]; }
    return out;
  }
})();

function toggleTheme() { Theme.toggle(); }
