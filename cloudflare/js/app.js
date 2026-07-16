/* ============================================================
   app.js — Main SPA Framework for Cloudflare Pages
   Standard-021: Enterprise Architecture Migration
   ============================================================ */

var App = (function() {
  var _currentPage = '';
  var _pages = {};
  var _clockTimer = null;

  function registerPage(name, renderFn, loadFn) {
    _pages[name] = { render: renderFn, load: loadFn };
  }

  function init() {
    Auth.init();
    loadTheme();
    startClock();
    window.addEventListener('hashchange', function() {
      var page = (location.hash || '#dashboard').replace('#', '');
      navigateTo(page);
    });
    var currentHash = location.hash ? location.hash.replace('#', '') : '';
    if (!Auth.isLoggedIn()) {
      _currentPage = '';
      navigate('login');
    } else {
      _currentPage = '';
      var target = currentHash || 'dashboard';
      navigateTo(target);
      if (!currentHash) location.hash = '#dashboard';
    }
  }

  function navigate(page) {
    location.hash = '#' + page;
  }

  var _builtinPages = { login: true };

  function navigateTo(page) {
    if (page && page.indexOf('(') > -1) page = page.replace(/['"]/g, '').replace('navigateTo(', '').replace(')', '');
    if (!page) page = 'dashboard';
    if (page === _currentPage) return;
    if (page === 'login') {
      _currentPage = page;
      document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
      var loginEl = document.getElementById('page-login');
      if (loginEl) loginEl.classList.add('active');
      document.getElementById('app-container').style.display = 'none';
      return;
    }
    if (!Auth.isLoggedIn()) { navigate('login'); return; }
    document.getElementById('app-container').style.display = '';
    _currentPage = page;
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.page-content').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('.sidebar-item').forEach(function(i) { i.classList.remove('active'); });
    var pageEl = document.getElementById('page-' + page);
    if (pageEl) { pageEl.style.display = ''; pageEl.classList.add('active'); }
    var sidebarItem = document.querySelector('.sidebar-item[data-page="' + page + '"]');
    if (sidebarItem) sidebarItem.classList.add('active');
    document.getElementById('main-content').scrollTop = 0;
    document.getElementById('page-title').textContent = page.charAt(0).toUpperCase() + page.slice(1);
    updateUserInfo();
    loadPage(page);
    closeSidebar();
  }

  var _scriptMap = {
  };

  function loadPage(page) {
    showLoading(true);
    var safetyTimer = setTimeout(function() { showLoading(false); }, 15000);
    var entry = _pages[page];
    if (entry) {
      try { if (entry.render) entry.render(); } catch(e) { console.error('Render error:', page, e); showLoading(false); clearTimeout(safetyTimer); return; }
      try { if (entry.load) entry.load(); } catch(e) { console.error('Load error:', page, e); showLoading(false); clearTimeout(safetyTimer); return; }
      return;
    }
    var scriptName = _scriptMap[page] || page;
    loadScript('js/pages/' + scriptName + '.js').then(function() {
      var entry2 = _pages[page];
      if (!entry2) entry2 = _pages[scriptName];
      if (entry2) {
        try { if (entry2.render) entry2.render(); } catch(e) { console.error('Render error:', page, e); showLoading(false); clearTimeout(safetyTimer); return; }
        try { if (entry2.load) entry2.load(); } catch(e) { console.error('Load error:', page, e); showLoading(false); clearTimeout(safetyTimer); return; }
      } else {
        showPagePlaceholder(page);
        showLoading(false);
        clearTimeout(safetyTimer);
      }
    }).catch(function(e) {
      console.error('Script load error:', page, e);
      showPagePlaceholder(page);
      showLoading(false);
      clearTimeout(safetyTimer);
    });
  }

  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function showPagePlaceholder(page) {
    var el = document.getElementById('page-' + page);
    if (el) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:12px">' +
        '<div style="font-size:48px">🚧</div>' +
        '<h2 style="color:var(--text)">' + page.charAt(0).toUpperCase() + page.slice(1) + '</h2>' +
        '<p style="color:var(--text-muted)">This module is being loaded...</p></div>';
    }
  }

  function updateUserInfo() {
    var user = Auth.getUser();
    if (!user) return;
    var initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    var photoUrl = user.photoURL || user.PhotoURL || '';
    function setAv(elId, size) {
      var el = document.getElementById(elId);
      if (!el) return;
      if (photoUrl) { el.innerHTML = '<img src="' + photoUrl.replace(/"/g, '&quot;') + '" style="width:' + size + ';height:' + size + ';border-radius:50%;object-fit:cover">'; }
      else { el.textContent = initial; }
    }
    setAv('userAvatar', '34px');
    setAv('topbarAvatar', '28px');
    setText('userName', user.name || '');
    setText('userRole', user.role + (user.department ? ' - ' + user.department : ''));
    setText('topbarName', user.name || '');
    setText('topbarRole', user.role + (user.department ? ' - ' + user.department : ''));
    var isAdminUser = user.role === 'Admin' || user.isSystemAdmin === true || user.IsAdmin === true;
    document.querySelectorAll('.sidebar-item[data-page]').forEach(function(el) {
      var page = el.dataset.page;
      var show = true;
      if (page === 'machines') { show = isAdminUser || (user.canManageMachines === true); }
      else if (page === 'assets') { show = isAdminUser || (user.canManageAssets === true); }
      else if (page === 'users') { show = isAdminUser || (user.canManageUsers === true); }
      else if (page === 'openjc') { show = isAdminUser || (user.canOpenJobCard === true); }
      else if (page === 'startjc') { show = isAdminUser || (user.canStartJobCard === true); }
      else if (page === 'closejc') { show = isAdminUser || (user.canCloseJobCard === true); }
      else if (page === 'reports') { show = isAdminUser || (user.canViewReports === true); }
      else if (page === 'email' || page === 'backup' || page === 'settings') { show = isAdminUser || (user.canManageUsers === true); }
      el.style.display = show ? '' : 'none';
    });
  }

  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function setHtml(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function getVal(id) { var el = document.getElementById(id); return el ? el.value : null; }
  function setVal(id, val) { var el = document.getElementById(id); if (el) el.value = val; }
  function showEl(id, dt) { var el = document.getElementById(id); if (el) el.style.display = dt || 'block'; }
  function hideEl(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
  function showLoading(show) { var el = document.getElementById('loadingOverlay'); if (!el) { el = document.createElement('div'); el.className = 'loading-overlay'; el.id = 'loadingOverlay'; el.innerHTML = '<div class="spinner spinner-dark"></div><div style="color:#5f6368">Loading...</div>'; document.body.appendChild(el); } el.classList.toggle('show', show); }
  function showToast(message, type) { type = type || 'success'; var c = document.getElementById('toastContainer'); if (!c) { c = document.createElement('div'); c.className = 'toast-container'; c.id = 'toastContainer'; document.body.appendChild(c); } var icons = { success: '\u2713', error: '\u2715', warning: '\u26A0', info: '\u2139' }; var t = document.createElement('div'); t.className = 'toast toast-' + type; t.innerHTML = '<span>' + (icons[type] || '\u2139') + '</span><span>' + message + '</span>'; c.appendChild(t); setTimeout(function() { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s ease'; setTimeout(function() { t.remove(); }, 300); }, 3000); }
  function showConfirm(title, message, onConfirm) { var o = document.getElementById('confirmOverlay'); if (!o) return; setText('confirmTitle', title); setText('confirmMessage', message); var bg = document.getElementById('confirmButtons'); if (!bg) return; bg.innerHTML = '<button class="btn btn-secondary" onclick="closeConfirm()">Cancel</button><button class="btn btn-danger" id="confirmActionBtn">Confirm</button>'; o.style.display = 'flex'; o.classList.add('show'); var cb = document.getElementById('confirmActionBtn'); if (cb) cb.onclick = function() { closeConfirm(); if (onConfirm) onConfirm(); }; }
  function escHtml(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function closeSidebar() { var sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open'); }
  function toggleSidebar() { var sb = document.getElementById('sidebar'); if (!sb) return; if (window.innerWidth <= 768) { sb.classList.toggle('open'); } else { sb.classList.toggle('collapsed'); } }
  function startClock() { function u() { var now = new Date(); var el = document.getElementById('topbarClock'); if (el) el.textContent = formatDateTime(now); } u(); setInterval(u, 30000); }
  function loadTheme() { var p = localStorage.getItem('cmms_themePrefs'); if (p) { try { return JSON.parse(p); } catch(e) {} } return { mode: 'dark', accentColor: '#6366f1', cardStyle: 'glass', sidebarStyle: 'default', fontSize: 'medium' }; }
  function toggleTheme() { var p = loadTheme(); var cur = document.documentElement.getAttribute('data-theme') || 'dark'; p.mode = cur === 'dark' ? 'light' : 'dark'; localStorage.setItem('cmms_themePrefs', JSON.stringify(p)); applyTheme(p); }
  function formatDate(date) { if (!date) return ''; var d = date instanceof Date ? date : new Date(date); if (isNaN(d.getTime())) return ''; var y = d.getFullYear(); var m = ('0' + (d.getMonth() + 1)).slice(-2); var day = ('0' + d.getDate()).slice(-2); return y + '-' + m + '-' + day; }
  function formatDateTime(date) { if (!date) return ''; var d = date instanceof Date ? date : new Date(date); if (isNaN(d.getTime())) return ''; var day = String(d.getDate()).padStart(2, '0'); var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; var month = months[d.getMonth()]; var year = d.getFullYear(); var hours = d.getHours(); var ampm = hours >= 12 ? 'PM' : 'AM'; hours = hours % 12 || 12; var mins = String(d.getMinutes()).padStart(2, '0'); return day + ' ' + month + ' ' + year + ' | ' + String(hours).padStart(2, '0') + ':' + mins + ' ' + ampm; }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var now = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  function badgeColor(count) {
    if (count === 0) return 'var(--text-muted)';
    if (count < 5) return 'var(--success)';
    if (count < 15) return 'var(--warning)';
    return 'var(--danger)';
  }

  return {
    init: init,
    navigate: navigate,
    navigateTo: navigateTo,
    registerPage: registerPage,
    currentPage: function() { return _currentPage; },
    setText: setText,
    setHtml: setHtml,
    getVal: getVal,
    setVal: setVal,
    showEl: showEl,
    hideEl: hideEl,
    showLoading: showLoading,
    showToast: showToast,
    showConfirm: showConfirm,
    escHtml: escHtml,
    toggleSidebar: toggleSidebar,
    toggleTheme: toggleTheme,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    timeAgo: timeAgo,
    loadPage: loadPage,
    badgeColor: badgeColor
  };
})();

/* ============================================================
   Shared Utilities (Global) — matching GAS ScriptsPage.html
   ============================================================ */

function getFormData(formId) {
  var form = document.getElementById(formId);
  if (!form) return {};
  var data = {};
  var elements = form.elements;
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var name = el.name || el.id;
    if (!name) continue;
    if (el.type === 'checkbox') { data[name] = el.checked; }
    else if (el.type === 'radio') { if (el.checked) data[name] = el.value; }
    else { data[name] = el.value; }
  }
  return data;
}

function setFormData(formId, data) {
  var form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('[name]').forEach(function(el) {
    if (data[el.name] !== undefined) el.value = data[el.name];
  });
}

function resetForm(formId) {
  var form = document.getElementById(formId);
  if (form) form.reset();
}

function openModalForm(formId, title) {
  setText(formId + 'Title', title);
  showModal(formId + 'Modal');
}

function closeModalForm(formId) {
  hideModal(formId + 'Modal');
  resetForm(formId);
}

function renderTable(data, columns, actions, page, pageSize, containerId) {
  containerId = containerId || 'tableContainer';
  var container = document.getElementById(containerId);
  if (!container) return;
  page = page || 1;
  pageSize = pageSize || PAGE_SIZE;

  if (!data || data.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
        '<h3>No Data Found</h3>' +
        '<p>No records available in this module.</p>' +
      '</div>';
    return;
  }

  var totalPages = Math.ceil(data.length / pageSize);
  var start = (page - 1) * pageSize;
  var end = Math.min(start + pageSize, data.length);
  var pageData = data.slice(start, end);

  var html = '<div class="table-container"><table><thead><tr>';
  columns.forEach(function(col) { html += '<th>' + (col.label || col) + '</th>'; });
  if (actions) html += '<th style="width:120px">Actions</th>';
  html += '</tr></thead><tbody>';

  pageData.forEach(function(row) {
    html += '<tr>';
    columns.forEach(function(col) {
      var key = col.key || col;
      var val = row[key] !== undefined && row[key] !== null ? row[key] : '';
      if (col.badge && col.badgeMap) {
        var mapKey = val;
        if (!(mapKey in col.badgeMap)) {
          mapKey = Object.keys(col.badgeMap).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
        }
        val = '<span class="badge badge-' + (col.badgeMap[mapKey] || 'primary') + '">' + val + '</span>';
      }
      if (col.format) val = col.format(val, row);
      if (col.date) { var d = new Date(val); if (!isNaN(d.getTime())) val = formatDateTime(d).split(' | ')[0]; }
      if (col.datetime) { var d = new Date(val); if (!isNaN(d.getTime())) val = formatDateTime(d); }
      html += '<td>' + val + '</td>';
    });
    if (actions) {
      html += '<td><div class="actions-cell">';
      actions.forEach(function(action) {
        if (action.condition && !action.condition(row)) return;
        var idField = action.idField || Object.keys(row)[0];
        var onclick = action.onclick ? action.onclick.replace(/\{id\}/g, row[idField]) : '';
        if (action.icon && ICONS[action.icon]) {
          html += '<button class="icon-btn icon-btn-' + (action.color || 'primary') + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + ICONS[action.icon] + '</button>';
        } else {
          html += '<button class="btn btn-sm ' + (action.class || 'btn-primary') + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + action.label + '</button>';
        }
      });
      html += '</div></td>';
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  if (totalPages > 1) {
    html += '<div class="pagination">' +
      '<div class="pagination-info">Showing ' + (start + 1) + ' to ' + end + ' of ' + data.length + ' entries</div>' +
      '<div class="pagination-btns">' +
      '<button onclick="changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
    for (var p = 1; p <= totalPages; p++) {
      html += '<button class="' + (p === page ? 'active' : '') + '" onclick="changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
    }
    html += '<button onclick="changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
      '</div></div>';
  }
  container.innerHTML = html;
}

function changePage(containerId, page) {
  var state = window.__pageStates || {};
  if (state[containerId]) state[containerId](page);
}

function registerPageState(containerId, renderFn) {
  if (!window.__pageStates) window.__pageStates = {};
  window.__pageStates[containerId] = renderFn;
}

function populateSelectFromList(id, list, defaultText) {
  list = list || [];
  var select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '';
  if (defaultText) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = defaultText;
    select.appendChild(opt);
  }
  list.forEach(function(val) {
    if (val) {
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    }
  });
}
