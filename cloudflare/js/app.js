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
    setText('userName', user.name || '');
    setText('userRole', user.role || '');
    setText('topbarName', user.name || '');
    setText('topbarRole', user.role || '');
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function showEl(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  function hideEl(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function showLoading(show) {
    var el = document.getElementById('loadingOverlay');
    if (el) { if (show) { el.classList.add('show'); } else { el.classList.remove('show'); } }
  }

  function showToast(message, type) {
    type = type || 'info';
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    var icons = { success: '&#10004;', error: '&#10006;', warning: '&#9888;', info: '&#8505;' };
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;padding:14px 24px;border-radius:12px;color:#fff;font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.3);backdrop-filter:blur(20px);background:' + (colors[type] || colors.info) + ';animation:toastSlideIn 0.3s ease;max-width:400px';
    toast.innerHTML = '<span style="font-size:16px">' + (icons[type] || icons.info) + '</span><span>' + escHtml(message) + '</span>';
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; toast.style.transition = 'all 0.3s'; }, 3000);
    setTimeout(function() { toast.remove(); }, 3500);
  }

  function showConfirm(title, message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.innerHTML = '<div class="glass-card" style="max-width:420px;width:90%;padding:32px;text-align:center">' +
      '<h3 style="margin:0 0 12px;font-size:20px;color:var(--text)">' + escHtml(title) + '</h3>' +
      '<p style="margin:0 0 24px;color:var(--text-muted);font-size:14px">' + escHtml(message) + '</p>' +
      '<div style="display:flex;gap:12px;justify-content:center">' +
      '<button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>' +
      '<button class="btn btn-primary" id="confirm-ok-btn">Confirm</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-cancel-btn').onclick = function() { overlay.remove(); };
    overlay.querySelector('#confirm-ok-btn').onclick = function() { overlay.remove(); onConfirm(); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function closeSidebar() {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  }

  function toggleSidebar() {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('open');
  }

  function startClock() {
    function update() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, '0');
      var m = String(now.getMinutes()).padStart(2, '0');
      var s = String(now.getSeconds()).padStart(2, '0');
      setText('clock', h + ':' + m + ':' + s);
    }
    update();
    _clockTimer = setInterval(update, 1000);
  }

  function loadTheme() {
    var saved = localStorage.getItem('cmms_theme');
    var dark = saved ? saved === 'dark' : true;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cmms_theme', next);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var da = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + da;
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return formatDate(dateStr) + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }

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
