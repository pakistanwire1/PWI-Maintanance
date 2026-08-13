var Settings = (function() {
  var state = {
    departments: [],
    settings: [],
    users: [],
    usersPage: 1,
    editingEmail: '',
    themeDraft: null,
    themeSaved: null,
    activeSection: 'general',
    notifChannels: { email: false, whatsapp: false }
  };
  var PAGE_SIZE = 25;
  var PERM_FIELDS = [
    'CanOpenJobCard','CanStartJobCard','CanCloseJobCard','CanApproveJobCard',
    'CanReviewPendingJobCard','CanViewAllJobCards',
    'CanManageMachines','CanManageAssets','CanManageSpareParts','CanManagePM',
    'CanManageTechnicians','CanManageDepartments','CanManageSections','CanManageUsers',
    'CanManageGoodsReceipt','CanManageBreakdown','CanExportReports',
    'CanViewDashboard','CanViewReports','CanManageInventory',
    'CanBackupRestore','CanManageSettings','CanViewAudit','CanManageQR',
    'CanManageEmail','CanManageWhatsApp','CanSystemConfig','IsAdmin'
  ];
  var PERM_GROUPS = [
    { title: 'Job Card Permissions', fields: [
      { name: 'CanOpenJobCard', label: 'Open Job Card' },
      { name: 'CanStartJobCard', label: 'Start Job Card' },
      { name: 'CanCloseJobCard', label: 'Close Job Card' },
      { name: 'CanApproveJobCard', label: 'Approve Job Card' },
      { name: 'CanReviewPendingJobCard', label: 'Review Pending Job Cards' },
      { name: 'CanViewAllJobCards', label: 'View All Job Cards' }
    ]},
    { title: 'Management Permissions', fields: [
      { name: 'CanManageMachines', label: 'Manage Machines' },
      { name: 'CanManageAssets', label: 'Manage Assets' },
      { name: 'CanManageSpareParts', label: 'Manage Spare Parts' },
      { name: 'CanManagePM', label: 'Manage PM' },
      { name: 'CanManageTechnicians', label: 'Manage Technicians' },
      { name: 'CanManageDepartments', label: 'Manage Departments' },
      { name: 'CanManageSections', label: 'Manage Sections' },
      { name: 'CanManageUsers', label: 'Manage Users' },
      { name: 'CanManageGoodsReceipt', label: 'Manage Goods Receipt' },
      { name: 'CanManageBreakdown', label: 'Manage Breakdown' },
      { name: 'CanExportReports', label: 'Export Reports' }
    ]},
    { title: 'General & System Permissions', fields: [
      { name: 'CanViewDashboard', label: 'View Dashboard' },
      { name: 'CanViewReports', label: 'View Reports' },
      { name: 'CanManageInventory', label: 'Manage Inventory' },
      { name: 'CanBackupRestore', label: 'Backup & Restore' },
      { name: 'CanManageSettings', label: 'Manage Settings' },
      { name: 'CanViewAudit', label: 'View Audit Trail' },
      { name: 'CanManageQR', label: 'Manage QR Codes' },
      { name: 'CanManageEmail', label: 'Manage Email' },
      { name: 'CanManageWhatsApp', label: 'Manage WhatsApp' },
      { name: 'CanSystemConfig', label: 'System Configuration' },
      { name: 'IsAdmin', label: 'System Administrator' }
    ]}
  ];
  var ROLE_BADGES = {
    'Admin': 'danger',
    'Department Manager': 'primary',
    'Maintenance Manager': 'warning',
    'Supervisor': 'info',
    'Technician': 'info',
    'Operator': 'secondary',
    'Viewer': 'secondary'
  };
  var THEME_COLORS = [
    { color: '#6366f1', name: 'Indigo' },
    { color: '#3b82f6', name: 'Blue' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#22c55e', name: 'Green' },
    { color: '#f59e0b', name: 'Amber' },
    { color: '#ef4444', name: 'Red' },
    { color: '#a855f7', name: 'Purple' },
    { color: '#f97316', name: 'Orange' }
  ];
  var PLUS_CIRCLE_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="10" cy="10" r="9"/><path d="M10 6v8"/><path d="M6 10h8"/></svg>';
  var EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';

  var SECTIONS = [
    { id: 'general', label: 'General', icon: 'sliders', perm: null },
    { id: 'appearance', label: 'Appearance', icon: 'palette', perm: null },
    { id: 'notifications', label: 'Notifications', icon: 'bell', perm: null },
    { id: 'permissions', label: 'Permissions & Security', icon: 'shield', perm: 'manageUsers' },
    { id: 'inventory', label: 'Inventory', icon: 'box', perm: 'manageInventory' },
    { id: 'jobcards', label: 'Job Cards / Maintenance', icon: 'clipboard', perm: null },
    { id: 'qr', label: 'QR Scanner', icon: 'qrcode', perm: null },
    { id: 'emailwhatsapp', label: 'Email / WhatsApp', icon: 'mail', perm: ['manageEmail', 'manageWhatsApp'] },
    { id: 'backup', label: 'Backup & Restore', icon: 'archive', perm: 'backupRestore' },
    { id: 'system', label: 'System Configuration', icon: 'cpu', perm: 'manageSettings' },
    { id: 'audit', label: 'Audit / Logs', icon: 'list', perm: 'viewAudit' }
  ];
  var SECTION_ICONS = {
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 1 10-10c0 1.7-1.3 3-3 3h-2a2 2 0 0 0-2 2c0 .6.2 1.1.5 1.5.3.4.5.9.5 1.5a2 2 0 0 1-2 2z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="16" cy="9.5" r="1"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>',
    qrcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 20h.01"/><path d="M14 20h.01"/><path d="M20 14h.01"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
    cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
  };

  function esc(s) {
    return Utils.escapeHtml(String(s || ''));
  }

  function themeDefaultPrefs() {
    if (typeof Theme !== 'undefined' && Theme.DEFAULT_PREFS) return JSON.parse(JSON.stringify(Theme.DEFAULT_PREFS));
    return { mode: 'dark', palette: 'indigo', accentColor: '#6366f1', sidebarColor: '', cardColor: '', buttonColor: '', cardStyle: 'glass', sidebarStyle: 'default', fontSize: 'medium' };
  }

  function initThemeState() {
    if (typeof Theme !== 'undefined' && Theme.getPrefs) {
      state.themeSaved = Theme.getPrefs();
    } else {
      state.themeSaved = themeDefaultPrefs();
    }
    state.themeDraft = JSON.parse(JSON.stringify(state.themeSaved));
  }

  function themeIsDirty() {
    return JSON.stringify(state.themeDraft) !== JSON.stringify(state.themeSaved);
  }

  function themePreviewCurrent() {
    if (typeof Theme !== 'undefined' && Theme.preview) Theme.preview(state.themeDraft);
    renderThemePrefsUI();
  }

  function themePersistCurrent() {
    if (typeof Theme !== 'undefined' && Theme.savePrefs) Theme.savePrefs(JSON.parse(JSON.stringify(state.themeDraft)));
    state.themeSaved = JSON.parse(JSON.stringify(state.themeDraft));
    renderThemePrefsUI();
  }

  function setActiveOption(containerId, value) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var btns = el.querySelectorAll('.theme-option');
    btns.forEach(function(btn) {
      if (btn.getAttribute('data-value') === value) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function getSettingValue(key) {
    for (var i = 0; i < state.settings.length; i++) {
      if (state.settings[i].Setting === key) return state.settings[i].Value || '';
    }
    return '';
  }

  function parseListValues(val) {
    if (!val) return [];
    return val.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; });
  }

  function iconBtn(type, onclick, title, extraClass) {
    var svg = type === 'edit' ? EDIT_SVG : TRASH_SVG;
    var cls = 'settings-icon-btn' + (extraClass ? ' ' + extraClass : '');
    return '<button class="' + cls + '" onclick="' + onclick + '" title="' + esc(title) + '">' + svg + '</button>';
  }

  function renderList(containerId, values, settingKey) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (values.length === 0) {
      el.innerHTML = '<div class="settings-list-empty">No items</div>';
      return;
    }
    var html = '';
    values.forEach(function(v) {
      html += '<div class="list-item"><span>' + esc(v) + '</span>' +
        '<button class="settings-remove-btn" onclick="Settings.removeSimpleValue(\'' + settingKey + '\',\'' + v.replace(/'/g, "\\'") + '\')">Remove</button></div>';
    });
    el.innerHTML = html;
  }

  function renderAllSimpleLists() {
    var keys = ['areas','lines','jobTypes','priorities','machineTypes'];
    var containers = ['areasList','linesList','jobTypesList','prioritiesList','machineTypesList'];
    keys.forEach(function(key, idx) {
      renderList(containers[idx], parseListValues(getSettingValue(key)), key);
    });
  }

  function renderDepartmentList() {
    var el = document.getElementById('deptList');
    if (!el) return;
    var active = state.departments.filter(function(d) { return d.Status === 'Active'; });
    if (active.length === 0) {
      el.innerHTML = '<div class="settings-list-empty">No departments</div>';
      return;
    }
    var html = '';
    active.forEach(function(d) {
      html += '<div class="list-item"><span>' + esc(d.Name) + '</span>' +
        '<button class="settings-remove-btn" onclick="Settings.deleteDept(\'' + (d.ID || '').replace(/'/g, "\\'") + '\')">Remove</button></div>';
    });
    el.innerHTML = html;
  }

  function renderThemePrefsUI() {
    var draft = state.themeDraft;
    if (!draft) return;

    setActiveOption('themeModeOptions', draft.mode || 'dark');
    setActiveOption('cardStyleOptions', draft.cardStyle || 'glass');
    setActiveOption('sidebarStyleOptions', draft.sidebarStyle || 'default');
    setActiveOption('fontSizeOptions', draft.fontSize || 'medium');

    var palContainer = document.getElementById('paletteOptions');
    if (palContainer) {
      palContainer.querySelectorAll('.palette-card').forEach(function(c) {
        if (c.getAttribute('data-palette') === (draft.palette || '')) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    }

    var accentContainer = document.getElementById('accentColorOptions');
    if (accentContainer) {
      accentContainer.querySelectorAll('.color-swatch').forEach(function(s) {
        if (s.getAttribute('data-value') === (draft.accentColor || '')) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    }

    var eff = (typeof Theme !== 'undefined' && Theme.effectiveColors) ? Theme.effectiveColors(draft) : null;
    var fields = [
      { key: 'sidebarColor', inputId: 'themeColorSidebar', hexId: 'themeHexSidebar', resetId: 'themeResetSidebar', effKey: 'sidebar' },
      { key: 'accentColor', inputId: 'themeColorPrimary', hexId: 'themeHexPrimary', resetId: 'themeResetPrimary', effKey: 'primary' },
      { key: 'cardColor', inputId: 'themeColorCard', hexId: 'themeHexCard', resetId: 'themeResetCard', effKey: 'card' },
      { key: 'buttonColor', inputId: 'themeColorButton', hexId: 'themeHexButton', resetId: 'themeResetButton', effKey: 'button' }
    ];
    fields.forEach(function(f) {
      var effColor = eff ? eff[f.effKey] : '#6366f1';
      var colorIn = document.getElementById(f.inputId);
      if (colorIn) colorIn.value = effColor;
      var hexIn = document.getElementById(f.hexId);
      if (hexIn) hexIn.value = effColor;
      var resetBtn = document.getElementById(f.resetId);
      if (resetBtn) resetBtn.disabled = !draft[f.key];
    });

    var banner = document.getElementById('themeDirtyBanner');
    if (banner) banner.style.display = themeIsDirty() ? 'inline-flex' : 'none';
  }

  function renderUsersTable() {
    var container = document.getElementById('usersTableContainer');
    if (!container) return;
    var list = state.users;
    var result = Table.paginate(list, state.usersPage, PAGE_SIZE);
    var html = '<div class="table-responsive"><table class="data-table user-perms-table"><thead><tr>' +
      '<th>EmpID</th><th>Name</th><th>Email</th><th>Dept</th><th>Section</th><th>Role</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>';

    if (result.items.length === 0) {
      html += '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No users found.</td></tr>';
    } else {
      result.items.forEach(function(u) {
        var rb = ROLE_BADGES[u.Role] || 'secondary';
        var statusClass = u.Status === 'Active' ? 'success' : (u.Status === 'Blocked' ? 'danger' : 'secondary');
        var emailEsc = esc(u.Email).replace(/'/g, "\\'");
        html += '<tr>' +
          '<td>' + esc(u.EmployeeID || '-') + '</td>' +
          '<td>' + esc(u.Name || '') + '</td>' +
          '<td>' + esc(u.Email || '') + '</td>' +
          '<td>' + esc(u.Department || '') + '</td>' +
          '<td>' + esc(u.Section || '-') + '</td>' +
          '<td><span class="badge badge-' + rb + '">' + esc(u.Role) + '</span></td>' +
          '<td>' + statusToggleHtml(u) + '</td>' +
          '<td class="actions-cell">' +
            '<button class="settings-icon-btn" onclick="Settings.openEditUser(\'' + emailEsc + '\')" title="Edit">' + EDIT_SVG + '</button>' +
            '<button class="settings-icon-btn settings-icon-btn-danger" onclick="Settings.deleteUser(\'' + emailEsc + '\')" title="Delete">' + TRASH_SVG + '</button>' +
          '</td></tr>';
      });
    }
    html += '</tbody></table></div>';

    if (result.totalPages > 1) {
      html += '<div class="pagination">';
      html += '<button class="btn-sm" ' + (result.page <= 1 ? 'disabled' : '') + ' onclick="Settings.usersPrevPage()">&#8249;</button>';
      html += '<span style="margin:0 8px;font-size:13px;color:var(--text-secondary)">Page ' + result.page + ' of ' + result.totalPages + '</span>';
      html += '<button class="btn-sm" ' + (result.page >= result.totalPages ? 'disabled' : '') + ' onclick="Settings.usersNextPage()">&#8250;</button>';
      html += '</div>';
      html += '<div class="table-info">Showing ' + (list.length > 0 ? ((result.page - 1) * PAGE_SIZE + 1) : 0) + '-' + Math.min(result.page * PAGE_SIZE, result.total) + ' of ' + result.total + ' records</div>';
    }

    container.innerHTML = html;
  }

  function statusToggleHtml(u) {
    if (u.Status === 'Active') {
      return '<span class="status-toggle-btn status-active" onclick="Settings.toggleStatus(\'' + esc(u.Email).replace(/'/g, "\\'") + '\',\'Inactive\')" title="Click to deactivate">Active</span>';
    } else if (u.Status === 'Blocked') {
      return '<span class="status-toggle-btn status-blocked" onclick="Settings.toggleStatus(\'' + esc(u.Email).replace(/'/g, "\\'") + '\',\'Active\')" title="Click to unblock">Blocked</span>';
    } else {
      return '<span class="status-toggle-btn status-inactive" onclick="Settings.toggleStatus(\'' + esc(u.Email).replace(/'/g, "\\'") + '\',\'Active\')" title="Click to activate">Inactive</span>';
    }
  }

  function injectStyles() {
    if (document.getElementById('settingsPageStyles')) return;
    var style = document.createElement('style');
    style.id = 'settingsPageStyles';
    style.textContent =
      '.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}' +
      '.list-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-input,rgba(255,255,255,0.05));border-radius:var(--radius-sm,6px);margin-bottom:6px;font-size:13px}' +
      '.list-item span{color:var(--text)}' +
      '.settings-remove-btn{background:transparent;border:1px solid var(--danger,#ef4444);color:var(--danger,#ef4444);padding:3px 10px;border-radius:var(--radius-sm,4px);cursor:pointer;font-size:11px;transition:var(--transition,all 0.2s)}' +
      '.settings-remove-btn:hover{background:var(--danger,#ef4444);color:#fff}' +
      '.settings-list-empty{color:var(--text-muted,#888);padding:8px 0;font-size:13px}' +
      '.inline-flex{display:inline-flex;gap:8px;align-items:center}' +
      '.mb-12{margin-bottom:12px}' +
      '.theme-section{margin-bottom:20px}' +
      '.theme-section label{display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px}' +
      '.theme-options{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
      '.theme-option{padding:6px 16px;border-radius:var(--radius-sm,6px);border:1px solid var(--border);background:var(--bg-input,rgba(255,255,255,0.05));color:var(--text-secondary,#aaa);cursor:pointer;font-size:13px;transition:var(--transition,all 0.2s)}' +
      '.theme-option:hover{border-color:var(--primary);color:var(--primary)}' +
      '.theme-option.active{background:var(--primary);color:#fff;border-color:var(--primary)}' +
      '.color-swatch{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:var(--transition,all 0.2s);padding:0}' +
      '.color-swatch:hover{transform:scale(1.15)}' +
      '.color-swatch.active{border-color:var(--text);box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--text)}' +
      '.perm-checkbox-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px}' +
      '.perm-checkbox{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text);cursor:pointer}' +
      '.perm-checkbox input[type="checkbox"]{width:15px;height:15px;accent-color:var(--primary)}' +
      '.user-perms-table .actions-cell{display:flex;gap:4px;align-items:center}' +
      '.status-toggle-btn{padding:2px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;display:inline-block}' +
      '.status-active{background:rgba(34,197,94,0.15);color:#22c55e}' +
      '.status-active:hover{background:rgba(34,197,94,0.25)}' +
      '.status-inactive{background:rgba(156,163,175,0.15);color:#9ca3af}' +
      '.status-inactive:hover{background:rgba(156,163,175,0.25)}' +
      '.status-blocked{background:rgba(239,68,68,0.15);color:#ef4444}' +
      '.status-blocked:hover{background:rgba(239,68,68,0.25)}' +
      '.settings-icon-btn{background:transparent;border:none;color:var(--primary);cursor:pointer;padding:4px;border-radius:var(--radius-sm,4px);display:inline-flex;align-items:center;transition:var(--transition,all 0.2s)}' +
      '.settings-icon-btn:hover{background:rgba(99,102,241,0.1)}' +
      '.settings-icon-btn svg{width:16px;height:16px}' +
      '.settings-icon-btn-danger{color:var(--danger,#ef4444)}' +
      '.settings-icon-btn-danger:hover{background:rgba(239,68,68,0.1)}' +
      '.theme-dirty-banner{background:var(--warning-bg,rgba(245,158,11,0.11));color:var(--warning,#f59e0b);padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;align-items:center}' +
      '.palette-grid{gap:10px}' +
      '.palette-card{display:inline-flex;flex-direction:column;align-items:center;gap:6px;padding:10px 12px;border:1px solid var(--border);background:var(--bg-input,rgba(255,255,255,0.05));border-radius:var(--radius-sm,6px);cursor:pointer;transition:var(--transition,all 0.2s);min-width:76px}' +
      '.palette-card:hover{border-color:var(--primary);transform:translateY(-1px)}' +
      '.palette-card.active{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}' +
      '.palette-dots{display:inline-flex;gap:3px}' +
      '.palette-dots i{width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,0.25)}' +
      '.palette-name{font-size:11px;color:var(--text-secondary);font-weight:600}' +
      '.palette-card.active .palette-name{color:var(--primary)}' +
      '.theme-color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}' +
      '.theme-color-field{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm,6px);background:var(--bg-input,rgba(255,255,255,0.05))}' +
      '.theme-color-label{flex-shrink:0;font-size:12px;font-weight:600;color:var(--text-secondary);min-width:54px}' +
      '.theme-color-field input[type="color"]{width:36px;height:28px;padding:0;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;flex-shrink:0}' +
      '.theme-hex-input{flex:1;min-width:0;padding:4px 8px !important;font-size:12px !important;height:auto !important}' +
      '.theme-color-reset{flex-shrink:0}' +
      '.theme-color-reset:disabled{opacity:0.4;cursor:default}' +
      '.theme-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px;padding-top:14px;border-top:1px solid var(--border)}' +
      '.settings-console{display:grid;grid-template-columns:230px 1fr;gap:0;min-height:calc(100vh - 120px);background:var(--bg-secondary,rgba(255,255,255,0.02))}' +
      '.settings-console-nav{border-right:1px solid var(--border);padding:14px 10px;display:flex;flex-direction:column;gap:10px;position:sticky;top:64px;align-self:start;max-height:calc(100vh - 80px);overflow-y:auto}' +
      '.settings-console-brand{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--text);padding:6px 10px 12px;border-bottom:1px solid var(--border);margin-bottom:6px}' +
      '.settings-console-brand svg{color:var(--primary)}' +
      '.settings-nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border:none;border-radius:var(--radius-sm,8px);background:transparent;color:var(--text-secondary,#aaa);cursor:pointer;font-size:13px;font-weight:500;text-align:left;transition:var(--transition,all 0.2s)}' +
      '.settings-nav-item:hover{background:var(--bg-input,rgba(255,255,255,0.05));color:var(--text)}' +
      '.settings-nav-item.active{background:rgba(99,102,241,0.12);color:var(--primary,#6366f1)}' +
      '.settings-nav-item.active .settings-nav-icon{color:var(--primary,#6366f1)}' +
      '.settings-nav-icon{display:inline-flex;align-items:center;color:var(--text-muted,#888);flex-shrink:0}' +
      '.settings-nav-icon svg{width:16px;height:16px}' +
      '.settings-console-main{padding:20px 26px;min-width:0}' +
      '.settings-console-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}' +
      '.settings-console-title{margin:0;font-size:20px;font-weight:700;color:var(--text)}' +
      '.settings-console-subtitle{margin:4px 0 0;font-size:12px;color:var(--text-muted,#888)}' +
      '.settings-console-actions{display:flex;gap:8px}' +
      '.settings-section-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}' +
      '.settings-section-single{max-width:900px}' +
      '.settings-card{background:var(--bg-card,rgba(255,255,255,0.03));border:1px solid var(--border);border-radius:var(--radius-md,10px);overflow:hidden}' +
      '.settings-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-input,rgba(255,255,255,0.02))}' +
      '.settings-card-head h3{margin:0;font-size:14px;font-weight:600;color:var(--text)}' +
      '.settings-card-body{padding:14px 16px}' +
      '.perm-group{margin-bottom:12px}' +
      '.perm-group:last-child{margin-bottom:0}' +
      '.perm-group-title{font-size:12px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}' +
      '.perm-chip-list{display:flex;flex-wrap:wrap;gap:6px}' +
      '.perm-chip{padding:3px 10px;border:1px solid var(--border);border-radius:20px;font-size:11px;color:var(--text-secondary,#aaa);background:var(--bg-input,rgba(255,255,255,0.03))}' +
      '.settings-tabs{display:flex;gap:8px;margin-bottom:14px}' +
      '.settings-tab{padding:7px 18px;border:1px solid var(--border);border-radius:var(--radius-sm,8px);background:transparent;color:var(--text-secondary,#aaa);cursor:pointer;font-size:13px;font-weight:600;transition:var(--transition,all 0.2s)}' +
      '.settings-tab.active{background:var(--primary,#6366f1);color:#fff;border-color:var(--primary)}' +
      '.settings-quicklinks{display:flex;flex-wrap:wrap;gap:8px}' +
      '.settings-quicklink{padding:8px 16px;border:1px solid var(--border);border-radius:var(--radius-sm,8px);background:var(--bg-input,rgba(255,255,255,0.03));color:var(--text);cursor:pointer;font-size:13px;font-weight:500;transition:var(--transition,all 0.2s)}' +
      '.settings-quicklink:hover{border-color:var(--primary);color:var(--primary)}' +
      '.settings-info-list{display:flex;flex-direction:column}' +
      '.settings-info-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px}' +
      '.settings-info-row:last-child{border-bottom:none}' +
      '.settings-info-row span{color:var(--text-muted,#888)}' +
      '.settings-info-row strong{color:var(--text)}' +
      '.settings-embed-empty{padding:30px;text-align:center;color:var(--text-muted);font-size:13px}' +
      '@media(max-width:900px){.settings-console{grid-template-columns:1fr}.settings-console-nav{flex-direction:row;overflow-x:auto;position:static;max-height:none;flex-wrap:wrap}.settings-console-brand{display:none}.settings-section-grid{grid-template-columns:1fr}}' +
      '@media(max-width:640px){.settings-console-main{padding:14px}}' +
      '.toggle-switch{display:inline-flex;align-items:center;cursor:pointer;position:relative}' +
      '.toggle-switch input{display:none}' +
      '.toggle-slider{width:38px;height:20px;background:var(--border,#444);border-radius:12px;position:relative;transition:var(--transition,all 0.2s);display:inline-block}' +
      '.toggle-slider::after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;left:2px;transition:var(--transition,all 0.2s)}' +
      '.toggle-switch input:checked + .toggle-slider{background:var(--primary,#6366f1)}' +
      '.toggle-switch input:checked + .toggle-slider::after{left:20px}' +
      '.settings-channel-row{display:flex;align-items:center;justify-content:space-between;gap:12px}';
    document.head.appendChild(style);
  }

  function buildPageHtml() {
    var navItems = '';
    SECTIONS.forEach(function(sec) {
      if (!canAccessSection(sec)) return;
      navItems += '<button class="settings-nav-item" data-section="' + sec.id + '" onclick="Settings.gotoSection(\'' + sec.id + '\')">' +
        '<span class="settings-nav-icon">' + (SECTION_ICONS[sec.icon] || '') + '</span>' +
        '<span class="settings-nav-label">' + sec.label + '</span>' +
      '</button>';
    });

    return '' +
      '<div class="settings-console">' +
        '<div class="settings-console-nav">' +
          '<div class="settings-console-brand">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
            '<span>Settings</span>' +
          '</div>' +
          '<div class="settings-nav-list">' + navItems + '</div>' +
        '</div>' +
        '<div class="settings-console-main">' +
          '<div class="settings-console-header">' +
            '<div>' +
              '<h2 class="settings-console-title" id="settingsSectionTitle">General</h2>' +
              '<p class="settings-console-subtitle">Manage application preferences, users and system configuration</p>' +
            '</div>' +
            '<div class="settings-console-actions">' +
              '<button class="btn btn-secondary" onclick="Settings.themeApply()">Apply Theme</button>' +
            '</div>' +
          '</div>' +
          '<div id="settingsSectionContent" class="settings-console-content"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="settingsUserFormModal">' +
        '<div class="modal" style="max-width:760px">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="settingsUserFormTitle">Add User</div>' +
            '<button class="modal-close" onclick="Settings.closeUserModal()">&times;</button>' +
          '</div>' +
          '<form id="settingsUserForm" onsubmit="return false">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="originalEmail" id="settingsEditUserEmail">' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Employee ID</label><input type="text" name="EmployeeID" class="form-control" id="settingsEmpId" placeholder="e.g. EMP-001"></div>' +
                '<div class="form-group"><label>Email *</label><input type="email" name="Email" class="form-control" id="settingsUserEmail" required></div>' +
              '</div>' +
              '<div class="form-group"><label>Name *</label><input type="text" name="Name" class="form-control" id="settingsUserName" required></div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Password *</label><input type="password" name="Password" class="form-control" id="settingsUserPassword"></div>' +
                '<div class="form-group"><label>Mobile</label><input type="text" name="Mobile" class="form-control" id="settingsUserMobile" placeholder="e.g. 9876543210"></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Department</label><select name="Department" class="form-control" id="settingsUserDeptSelect" onchange="Settings.onDeptChange()"><option value="">Select Department</option></select></div>' +
                '<div class="form-group"><label>Section</label><select name="Section" class="form-control" id="settingsUserSectionSelect"><option value="">Select Section</option></select></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Designation</label><input type="text" name="Designation" class="form-control" placeholder="Job title / designation"></div>' +
                '<div class="form-group"><label>Role</label><select name="Role" class="form-control">' + roleOptsHtml() + '</select></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Status</label><select name="Status" class="form-control"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Blocked">Blocked</option></select></div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label style="display:block;margin-bottom:8px">Permissions</label>' +
                permGroupsHtml() +
                '<small style="color:var(--text-muted);font-size:11px;display:block;margin-top:6px">System Administrator overrides all individual permissions.</small>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Settings.closeUserModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary" id="settingsUserSaveBtn" onclick="Settings.saveUser()">' + PLUS_CIRCLE_SVG + ' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function roleOptsHtml() {
    return '<option value="Admin">Admin</option>' +
      '<option value="Department Manager">Department Manager</option>' +
      '<option value="Maintenance Manager">Maintenance Manager</option>' +
      '<option value="Supervisor">Supervisor</option>' +
      '<option value="Technician">Technician</option>' +
      '<option value="Operator">Operator</option>' +
      '<option value="Viewer">Viewer</option>';
  }

  function permGroupsHtml() {
    var html = '';
    PERM_GROUPS.forEach(function(group) {
      html += '<div class="perm-group">' +
        '<div class="perm-group-title">' + esc(group.title) + '</div>' +
        '<div class="perm-checkbox-grid">';
      group.fields.forEach(function(f) {
        html += '<label class="perm-checkbox"><input type="checkbox" name="' + f.name + '"> ' + f.label + '</label>';
      });
      html += '</div></div>';
    });
    return html;
  }

  function canAccessSection(sec) {
    if (typeof Session === 'undefined' || !Session.isLoggedIn()) return true;
    if (Session.isAdmin()) return true;
    if (!sec || sec.perm === undefined || sec.perm === null) return true;
    var perms = Array.isArray(sec.perm) ? sec.perm : [sec.perm];
    for (var i = 0; i < perms.length; i++) {
      if (Session.getPermission(perms[i])) return true;
    }
    return false;
  }

  function sectionById(id) {
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === id) return SECTIONS[i];
    }
    return SECTIONS[0];
  }

  function renderSection(id) {
    if (!canAccessSection(sectionById(id))) id = 'general';
    state.activeSection = id;

    var navItems = document.querySelectorAll('.settings-nav-item');
    navItems.forEach(function(item) {
      if (item.getAttribute('data-section') === id) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    var sec = sectionById(id);
    var titleEl = document.getElementById('settingsSectionTitle');
    if (titleEl) titleEl.textContent = sec.label;

    var content = document.getElementById('settingsSectionContent');
    if (!content) return;

    var renderers = {
      general: renderGeneralSection,
      appearance: renderAppearanceSection,
      notifications: renderNotificationsSection,
      permissions: renderPermissionsSection,
      inventory: renderInventorySection,
      jobcards: renderJobCardsSection,
      qr: renderQRSection,
      emailwhatsapp: renderEmailWhatsAppSection,
      backup: renderBackupSection,
      system: renderSystemSection,
      audit: renderAuditSection
    };
    var fn = renderers[id] || renderGeneralSection;
    fn(content);
  }

  function simpleListSectionHtml(label, settingKey, inputId, placeholder) {
    return '<div class="settings-card">' +
      '<div class="settings-card-head">' +
        '<h3>' + esc(label) + '</h3>' +
      '</div>' +
      '<div class="settings-card-body">' +
        '<div class="inline-flex mb-12">' +
          '<input type="text" class="form-control" id="' + inputId + '" placeholder="' + esc(placeholder) + '">' +
          '<button class="btn btn-primary" onclick="Settings.addSimpleValue(\'' + settingKey + '\',\'' + inputId + '\')">' + PLUS_CIRCLE_SVG + ' Add</button>' +
        '</div>' +
        '<div id="' + settingKey + 'List"></div>' +
      '</div>' +
    '</div>';
  }

  function renderGeneralSection(content) {
    content.innerHTML =
      '<div class="settings-section-grid">' +
        '<div class="settings-card">' +
          '<div class="settings-card-head"><h3>Departments</h3></div>' +
          '<div class="settings-card-body">' +
            '<div class="inline-flex mb-12">' +
              '<input type="text" class="form-control" id="newDept" placeholder="New department name">' +
              '<button class="btn btn-primary" onclick="Settings.addDept()">' + PLUS_CIRCLE_SVG + ' Add</button>' +
            '</div>' +
            '<div id="deptList"></div>' +
          '</div>' +
        '</div>' +
        simpleListSectionHtml('Areas', 'areas', 'newArea', 'New area') +
        simpleListSectionHtml('Lines', 'lines', 'newLine', 'New line') +
        simpleListSectionHtml('Job Types', 'jobTypes', 'newJobType', 'New job type') +
        simpleListSectionHtml('Priorities', 'priorities', 'newPriority', 'New priority') +
        simpleListSectionHtml('Machine Types', 'machineTypes', 'newMachineType', 'New machine type') +
      '</div>';
    renderDepartmentList();
    renderAllSimpleLists();
  }

  function themeBtnsHtml(arr, containerId, key, handler) {
    var html = '<div class="theme-options" id="' + containerId + '">';
    arr.forEach(function(b) {
      html += '<button class="theme-option" data-value="' + b.value + '" onclick="Settings.' + handler + '(\'' + key + '\',\'' + b.value + '\')">' + b.label + '</button>';
    });
    html += '</div>';
    return html;
  }

  function paletteCardsHtml() {
    var palettes = (typeof Theme !== 'undefined' && Theme.PALETTES) ? Theme.PALETTES : THEME_COLORS.map(function(c) {
      return { id: c.name.toLowerCase(), name: c.name, primary: c.color, button: c.color, sidebar: '#07080f', card: '#151829' };
    });
    var html = '<div class="theme-options palette-grid" id="paletteOptions">';
    palettes.forEach(function(p) {
      html += '<button class="palette-card" data-palette="' + p.id + '" onclick="Settings.themeSelectPalette(\'' + p.id + '\')" title="' + p.name + ' palette">' +
        '<span class="palette-dots">' +
          '<i style="background:' + p.primary + '"></i>' +
          '<i style="background:' + p.sidebar + '"></i>' +
          '<i style="background:' + p.card + '"></i>' +
          '<i style="background:' + p.button + '"></i>' +
        '</span>' +
        '<span class="palette-name">' + p.name + '</span>' +
      '</button>';
    });
    html += '</div>';
    return html;
  }

  function colorSwatchesHtml() {
    var html = '<div class="theme-options" id="accentColorOptions">';
    THEME_COLORS.forEach(function(c) {
      html += '<button class="color-swatch" data-value="' + c.color + '" style="background:' + c.color + '" onclick="Settings.themeSetAccent(\'' + c.color + '\')" title="' + c.name + '"></button>';
    });
    html += '</div>';
    return html;
  }

  function colorFieldHtml(label, field, inputId, hexId, resetId) {
    return '<div class="theme-color-field">' +
      '<span class="theme-color-label">' + label + '</span>' +
      '<input type="color" id="' + inputId + '" value="#6366f1" oninput="Settings.themeSetColor(\'' + field + '\', this.value)" title="Pick ' + label.toLowerCase() + ' color">' +
      '<input type="text" class="form-control theme-hex-input" id="' + hexId + '" value="#6366f1" onchange="Settings.themeSetColorHex(\'' + field + '\', this.value)" spellcheck="false">' +
      '<button class="btn-sm theme-color-reset" id="' + resetId + '" onclick="Settings.themeResetColor(\'' + field + '\')">Default</button>' +
    '</div>';
  }

  function renderAppearanceSection(content) {
    var themeModeBtns = [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'auto', label: 'Auto' }
    ];
    var cardStyleBtns = [
      { value: 'glass', label: 'Glass' },
      { value: 'solid', label: 'Solid' }
    ];
    var sidebarStyleBtns = [
      { value: 'default', label: 'Default' },
      { value: 'borderless', label: 'Borderless' },
      { value: 'elevated', label: 'Elevated' }
    ];
    var fontSizeBtns = [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' }
    ];

    content.innerHTML =
      '<div class="settings-section-single">' +
        '<div class="settings-card">' +
          '<div class="settings-card-head">' +
            '<h3>Theme &amp; Display</h3>' +
            '<span class="theme-dirty-banner" id="themeDirtyBanner" style="display:none">Unsaved changes</span>' +
          '</div>' +
          '<div class="settings-card-body">' +
            '<div class="theme-section"><label>Theme Mode</label>' + themeBtnsHtml(themeModeBtns, 'themeModeOptions', 'mode', 'themeSetMode') + '</div>' +
            '<div class="theme-section"><label>Color Palettes</label>' + paletteCardsHtml() + '</div>' +
            '<div class="theme-section"><label>Accent Color</label>' + colorSwatchesHtml() + '</div>' +
            '<div class="theme-section">' +
              '<label>Custom Colors</label>' +
              '<div class="theme-color-grid">' +
                colorFieldHtml('Sidebar', 'sidebarColor', 'themeColorSidebar', 'themeHexSidebar', 'themeResetSidebar') +
                colorFieldHtml('Primary', 'accentColor', 'themeColorPrimary', 'themeHexPrimary', 'themeResetPrimary') +
                colorFieldHtml('Card', 'cardColor', 'themeColorCard', 'themeHexCard', 'themeResetCard') +
                colorFieldHtml('Button', 'buttonColor', 'themeColorButton', 'themeHexButton', 'themeResetButton') +
              '</div>' +
              '<small style="color:var(--text-muted);font-size:11px;display:block;margin-top:6px">Custom colors override the selected palette. Leave a field on Default to use the palette.</small>' +
            '</div>' +
            '<div class="theme-section"><label>Card Style</label>' + themeBtnsHtml(cardStyleBtns, 'cardStyleOptions', 'cardStyle', 'themeSetStyle') + '</div>' +
            '<div class="theme-section"><label>Sidebar Style</label>' + themeBtnsHtml(sidebarStyleBtns, 'sidebarStyleOptions', 'sidebarStyle', 'themeSetStyle') + '</div>' +
            '<div class="theme-section"><label>Font Size</label>' + themeBtnsHtml(fontSizeBtns, 'fontSizeOptions', 'fontSize', 'themeSetStyle') + '</div>' +
            '<div class="theme-actions">' +
              '<button class="btn btn-secondary" onclick="Settings.themeReset()">Reset</button>' +
              '<button class="btn btn-secondary" onclick="Settings.themeSave()">Save</button>' +
              '<button class="btn btn-primary" onclick="Settings.themeApply()">Apply</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    renderThemePrefsUI();
  }

  function renderPermissionsSection(content) {
    content.innerHTML =
      '<div class="settings-section-single">' +
        '<div class="settings-card">' +
          '<div class="settings-card-head">' +
            '<h3>User Management</h3>' +
            '<button class="btn btn-primary" onclick="Settings.openAddUser()">' + PLUS_CIRCLE_SVG + ' Add User</button>' +
          '</div>' +
          '<div id="usersTableContainer"></div>' +
        '</div>' +
        '<div class="settings-card">' +
          '<div class="settings-card-head"><h3>Role-based Access</h3></div>' +
          '<div class="settings-card-body">' +
            '<p style="margin:0 0 8px;font-size:12px;color:var(--text-muted)">Each user is assigned a role and granular permissions. Permissions are enforced per-module across the application.</p>' +
            '<div class="role-perm-summary">' +
              PERM_GROUPS.map(function(group) {
                return '<div class="perm-group">' +
                  '<div class="perm-group-title">' + esc(group.title) + '</div>' +
                  '<div class="perm-chip-list">' + group.fields.map(function(f) {
                    return '<span class="perm-chip">' + f.label + '</span>';
                  }).join('') + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    renderUsersTable();
  }

  function renderNotificationsSection(content) {
    if (typeof Notifications !== 'undefined' && Notifications.show) {
      Notifications.show(content);
    } else {
      content.innerHTML = '<div class="settings-card"><div class="settings-card-body">Notifications module is not available.</div></div>';
    }
  }

  function renderInventorySection(content) {
    if (typeof Inventory !== 'undefined' && Inventory.show) {
      Inventory.show(content);
    } else {
      content.innerHTML = '<div class="settings-card"><div class="settings-card-body">Inventory module is not available.</div></div>';
    }
  }

  function renderQRSection(content) {
    if (typeof QRCodes !== 'undefined' && QRCodes.show) {
      QRCodes.show(content);
    } else {
      content.innerHTML = '<div class="settings-card"><div class="settings-card-body">QR module is not available.</div></div>';
    }
  }

  function renderEmailWhatsAppSection(content) {
    content.innerHTML =
      '<div class="settings-section-single">' +
        '<div class="settings-tabs">' +
          '<button class="settings-tab active" id="tab-email" onclick="Settings.showEWTab(\'email\')">Email</button>' +
          '<button class="settings-tab" id="tab-whatsapp" onclick="Settings.showEWTab(\'whatsapp\')">WhatsApp</button>' +
        '</div>' +
        '<div id="ewContent"></div>' +
      '</div>';
    showEWTab('email');
  }

  function showEWTab(which) {
    var tabEmail = document.getElementById('tab-email');
    var tabWhats = document.getElementById('tab-whatsapp');
    if (tabEmail) tabEmail.classList.toggle('active', which === 'email');
    if (tabWhats) tabWhats.classList.toggle('active', which === 'whatsapp');
    var content = document.getElementById('ewContent');
    if (!content) return;
    if (which === 'whatsapp') {
      if (typeof WhatsApp !== 'undefined' && WhatsApp.show) WhatsApp.show(content);
      else content.innerHTML = '<div class="settings-card"><div class="settings-card-body">WhatsApp module is not available.</div></div>';
    } else {
      if (typeof Email !== 'undefined' && Email.show) Email.show(content);
      else content.innerHTML = '<div class="settings-card"><div class="settings-card-body">Email module is not available.</div></div>';
    }
  }

  function renderBackupSection(content) {
    if (typeof BackupRestore !== 'undefined' && BackupRestore.show) {
      BackupRestore.show(content);
    } else {
      content.innerHTML = '<div class="settings-card"><div class="settings-card-body">Backup &amp; Restore module is not available.</div></div>';
    }
  }

  function renderAuditSection(content) {
    if (typeof AuditTrail !== 'undefined' && AuditTrail.show) {
      AuditTrail.show(content);
    } else {
      content.innerHTML = '<div class="settings-card"><div class="settings-card-body">Audit module is not available.</div></div>';
    }
  }

  function renderJobCardsSection(content) {
    content.innerHTML =
      '<div class="settings-section-grid">' +
        '<div class="settings-card">' +
          '<div class="settings-card-head"><h3>Job Cards</h3></div>' +
          '<div class="settings-card-body settings-quicklinks">' +
            '<button class="settings-quicklink" onclick="navigateTo(\'openjobcard\')">Open</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'startjobcard\')">Started</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'pendingjobcard\')">Pending</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'approvejobcard\')">Approval</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'closejobcard\')">Closed</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'jobcards\')">All</button>' +
          '</div>' +
        '</div>' +
        '<div class="settings-card">' +
          '<div class="settings-card-head"><h3>Preventive Maintenance</h3></div>' +
          '<div class="settings-card-body settings-quicklinks">' +
            '<button class="settings-quicklink" onclick="navigateTo(\'pm\')">PM Schedule</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'pmhistory\')">PM History</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'breakdown\')">Breakdown History</button>' +
            '<button class="settings-quicklink" onclick="navigateTo(\'checklists\')">Checklists</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderSystemSection(content) {
    var appName = (typeof APP_NAME !== 'undefined' ? APP_NAME : 'CMMS');
    var version = (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0.0');
    var user = (typeof Session !== 'undefined' && Session.getUser) ? Session.getUser() : null;
    var role = user ? (user.role || 'User') : 'Guest';

    content.innerHTML =
      '<div class="settings-section-grid">' +
        '<div class="settings-card">' +
          '<div class="settings-card-head"><h3>Application</h3></div>' +
          '<div class="settings-card-body settings-info-list">' +
            '<div class="settings-info-row"><span>Application</span><strong>' + esc(appName) + '</strong></div>' +
            '<div class="settings-info-row"><span>Version</span><strong>' + esc(version) + '</strong></div>' +
            '<div class="settings-info-row"><span>Logged in as</span><strong>' + esc(Session.getUserName()) + ' (' + esc(role) + ')</strong></div>' +
            '<div class="settings-info-row"><span>Environment</span><strong>Cloudflare Workers</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="settings-card">' +
          '<div class="settings-card-head"><h3>Data &amp; Maintenance</h3></div>' +
          '<div class="settings-card-body settings-info-list">' +
            '<div class="settings-info-row"><span>Departments</span><strong>' + state.departments.length + '</strong></div>' +
            '<div class="settings-info-row"><span>Users</span><strong>' + state.users.length + '</strong></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function getFormData() {
    var form = document.getElementById('settingsUserForm');
    if (!form) return {};
    var data = {};
    var inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function(el) {
      if (el.name) {
        if (el.type === 'checkbox') {
          data[el.name] = el.checked;
        } else {
          data[el.name] = el.value;
        }
      }
    });
    return data;
  }

  function setFormData(item) {
    var form = document.getElementById('settingsUserForm');
    if (!form) return;
    var el;
    el = document.getElementById('settingsEditUserEmail'); if (el) el.value = item.Email || '';
    el = document.getElementById('settingsEmpId'); if (el) el.value = item.EmployeeID || '';
    el = document.getElementById('settingsUserEmail'); if (el) el.value = item.Email || '';
    el = document.getElementById('settingsUserName'); if (el) el.value = item.Name || '';
    el = document.getElementById('settingsUserMobile'); if (el) el.value = item.Mobile || '';
    var nameInput = form.querySelector('[name="Name"]');
    if (nameInput) nameInput.value = item.Name || '';
    var designationInput = form.querySelector('[name="Designation"]');
    if (designationInput) designationInput.value = item.Designation || '';
    var roleSel = form.querySelector('[name="Role"]');
    if (roleSel) roleSel.value = item.Role || 'Technician';
    var statusSel = form.querySelector('[name="Status"]');
    if (statusSel) statusSel.value = item.Status || 'Active';
    PERM_FIELDS.forEach(function(f) {
      var cb = form.querySelector('[name="' + f + '"]');
      if (cb) {
        var val = item[f];
        cb.checked = val === true || val === 'Yes' || val === 'true' || val === 'TRUE';
      }
    });
  }

  function clearFormData() {
    var form = document.getElementById('settingsUserForm');
    if (form) form.reset();
    var el;
    el = document.getElementById('settingsEditUserEmail'); if (el) el.value = '';
    el = document.getElementById('settingsEmpId'); if (el) el.value = '';
    el = document.getElementById('settingsUserEmail'); if (el) { el.disabled = false; el.value = ''; }
    el = document.getElementById('settingsUserName'); if (el) el.value = '';
    el = document.getElementById('settingsUserPassword'); if (el) { el.required = true; el.value = ''; }
    el = document.getElementById('settingsUserMobile'); if (el) el.value = '';
    el = document.getElementById('settingsUserSectionSelect'); if (el) el.innerHTML = '<option value="">Select Section</option>';
    PERM_FIELDS.forEach(function(f) {
      var cb = form.querySelector('[name="' + f + '"]');
      if (cb) cb.checked = false;
    });
  }

  function populateDeptDropdown(selectedVal) {
    var sel = document.getElementById('settingsUserDeptSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Department</option>';
    state.departments.forEach(function(d) {
      if (d.Status !== 'Active') return;
      var opt = document.createElement('option');
      opt.value = d.Name || '';
      opt.textContent = d.Name || '';
      if (selectedVal && d.Name === selectedVal) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function populateSectionDropdown(selectedVal) {
    var sel = document.getElementById('settingsUserSectionSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Section</option>';
    API.post('getSectionList', {}).then(function(sections) {
      (sections || []).forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.Section || '';
        opt.textContent = s.Section || '';
        if (selectedVal && s.Section === selectedVal) opt.selected = true;
        sel.appendChild(opt);
      });
    }).catch(function() {});
  }

  function loadAllData() {
    Loader.show();
    Promise.all([
      API.post('getSettingsData', {}),
      API.post('getUsers', {})
    ]).then(function(results) {
      Loader.hide();
      var settingsData = results[0] || {};
      state.departments = settingsData.departments || [];
      state.settings = settingsData.settings || [];
      state.users = Array.isArray(results[1]) ? results[1] : ((results[1] && results[1].data) ? results[1].data : []);
      renderDepartmentList();
      renderAllSimpleLists();
      renderUsersTable();
      renderThemePrefsUI();
    }).catch(function(err) {
      Loader.hide();
      Notify.error(err.message || 'Failed to load settings data');
    });
  }

  function loadSettingsOnly() {
    API.post('getSettingsData', {}).then(function(data) {
      var sd = data || {};
      state.departments = sd.departments || [];
      state.settings = sd.settings || [];
      renderDepartmentList();
      renderAllSimpleLists();
    }).catch(function() {});
  }

  function loadUsersOnly() {
    API.post('getUsers', {}).then(function(res) {
      state.users = Array.isArray(res) ? res : ((res && res.data) ? res.data : []);
      state.usersPage = 1;
      renderUsersTable();
    }).catch(function() {});
  }

  return {
    show: function(el) {
      if (!el) el = document.getElementById('pageContent');
      if (!el) return;
      injectStyles();
      initThemeState();
      el.innerHTML = buildPageHtml();
      renderSection(state.activeSection || 'general');
      loadAllData();
    },

    gotoSection: function(id) {
      renderSection(id);
      if (id === 'permissions') renderUsersTable();
    },

    showEWTab: function(which) {
      showEWTab(which);
    },

    themeSetMode: function(key, value) {
      if (!state.themeDraft) initThemeState();
      state.themeDraft.mode = value;
      themePreviewCurrent();
    },

    themeSelectPalette: function(id) {
      if (!state.themeDraft) initThemeState();
      state.themeDraft.palette = id;
      state.themeDraft.accentColor = '';
      state.themeDraft.sidebarColor = '';
      state.themeDraft.cardColor = '';
      state.themeDraft.buttonColor = '';
      themePreviewCurrent();
    },

    themeSetAccent: function(value) {
      if (!state.themeDraft) initThemeState();
      state.themeDraft.accentColor = value;
      state.themeDraft.palette = '';
      themePreviewCurrent();
    },

    themeSetStyle: function(key, value) {
      if (!state.themeDraft) initThemeState();
      state.themeDraft[key] = value;
      themePreviewCurrent();
    },

    themeSetColor: function(field, value) {
      if (!/^#[0-9a-fA-F]{6}$/.test(String(value || ''))) return;
      if (!state.themeDraft) initThemeState();
      state.themeDraft[field] = value;
      if (field === 'accentColor') state.themeDraft.palette = '';
      themePreviewCurrent();
    },

    themeSetColorHex: function(field, value) {
      value = String(value || '').trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
        Notify.warning('Enter a valid hex color like #6366f1');
        themePreviewCurrent();
        return;
      }
      if (!state.themeDraft) initThemeState();
      state.themeDraft[field] = value;
      if (field === 'accentColor') state.themeDraft.palette = '';
      themePreviewCurrent();
    },

    themeResetColor: function(field) {
      if (!state.themeDraft) initThemeState();
      state.themeDraft[field] = '';
      if (field === 'accentColor') state.themeDraft.palette = '';
      themePreviewCurrent();
    },

    themeApply: function() {
      themePersistCurrent();
      Notify.success('Theme applied');
    },

    themeSave: function() {
      themePersistCurrent();
      Notify.success('Theme saved');
    },

    themeReset: function() {
      Modal.confirm('Reset Theme', 'Restore the default theme? Your custom colors will be cleared.', function() {
        state.themeDraft = themeDefaultPrefs();
        if (typeof Theme !== 'undefined' && Theme.reset) Theme.reset();
        state.themeSaved = JSON.parse(JSON.stringify(state.themeDraft));
        renderThemePrefsUI();
        Notify.success('Theme reset to defaults');
      });
    },

    addDept: function() {
      var input = document.getElementById('newDept');
      var name = input ? input.value.trim() : '';
      if (!name) { Notify.warning('Enter department name'); return; }
      Loader.show();
      API.post('addDepartment', { name: name }).then(function(data) {
        Loader.hide();
        if (input) input.value = '';
        state.departments = Array.isArray(data) ? data : (data && data.departments ? data.departments : state.departments);
        renderDepartmentList();
        Notify.success('Department added');
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to add department');
      });
    },

    deleteDept: function(id) {
      Modal.confirm('Remove Department', 'Are you sure?', function() {
        Loader.show();
        API.post('deleteDepartment', { id: id }).then(function(data) {
          Loader.hide();
          state.departments = Array.isArray(data) ? data : (data && data.departments ? data.departments : state.departments);
          renderDepartmentList();
          Notify.success('Department removed');
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete department');
        });
      });
    },

    addSimpleValue: function(key, inputId) {
      var input = document.getElementById(inputId);
      var value = input ? input.value.trim() : '';
      if (!value) { Notify.warning('Enter a value'); return; }
      var existing = getSettingValue(key);
      var values = parseListValues(existing);
      if (values.indexOf(value) !== -1) { Notify.warning('Value already exists'); return; }
      values.push(value);
      Loader.show();
      API.post('saveSettingValue', { key: key, value: values.join(',') }).then(function(data) {
        Loader.hide();
        if (data && data.settings) state.settings = data.settings;
        if (input) input.value = '';
        renderAllSimpleLists();
        Notify.success('Saved');
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to save');
      });
    },

    removeSimpleValue: function(key, value) {
      var existing = getSettingValue(key);
      var values = parseListValues(existing);
      values = values.filter(function(v) { return v !== value; });
      Loader.show();
      API.post('saveSettingValue', { key: key, value: values.join(',') }).then(function(data) {
        Loader.hide();
        if (data && data.settings) state.settings = data.settings;
        renderAllSimpleLists();
        Notify.success('Removed');
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to remove value');
      });
    },

    usersGoToPage: function(p) { state.usersPage = p; renderUsersTable(); },
    usersPrevPage: function() { if (state.usersPage > 1) { state.usersPage--; renderUsersTable(); } },
    usersNextPage: function() {
      var totalPages = Math.ceil(state.users.length / PAGE_SIZE) || 1;
      if (state.usersPage < totalPages) { state.usersPage++; renderUsersTable(); }
    },

    openAddUser: function() {
      state.editingEmail = '';
      clearFormData();
      var el;
      el = document.getElementById('settingsUserFormTitle'); if (el) el.textContent = 'Add User';
      el = document.getElementById('settingsUserPassword'); if (el) el.required = true;
      var btn = document.getElementById('settingsUserSaveBtn'); if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
      populateDeptDropdown('');
      Modal.show('settingsUserFormModal');
    },

    openEditUser: function(email) {
      var user = null;
      for (var i = 0; i < state.users.length; i++) {
        if (state.users[i].Email === email) { user = state.users[i]; break; }
      }
      if (!user) { Notify.error('User not found'); return; }
      state.editingEmail = email;
      setFormData(user);
      var el;
      el = document.getElementById('settingsUserFormTitle'); if (el) el.textContent = 'Edit User - ' + email;
      el = document.getElementById('settingsUserEmail'); if (el) el.disabled = true;
      el = document.getElementById('settingsUserPassword'); if (el) el.required = false;
      populateDeptDropdown(user.Department || '');
      if (user.Department) {
        setTimeout(function() { populateSectionDropdown(user.Section || ''); }, 200);
      } else {
        populateSectionDropdown('');
      }
      var btn = document.getElementById('settingsUserSaveBtn'); if (btn) { btn.textContent = 'Update'; btn.disabled = false; }
      Modal.show('settingsUserFormModal');
    },

    closeUserModal: function() {
      Modal.hide('settingsUserFormModal');
      state.editingEmail = '';
      var el = document.getElementById('settingsUserEmail');
      if (el) el.disabled = false;
    },

    onDeptChange: function() {
      populateSectionDropdown('');
    },

    saveUser: function() {
      var data = getFormData();
      if (!data.Name || !data.Name.trim()) { Notify.error('Name is required'); return; }
      if (!data.Email || !data.Email.trim()) { Notify.error('Email is required'); return; }

      var isEdit = !!state.editingEmail;
      if (!isEdit && (!data.Password || !data.Password.trim())) {
        Notify.error('Password is required for new users'); return;
      }

      var payload = {
        EmployeeID: (data.EmployeeID || '').trim(),
        Name: (data.Name || '').trim(),
        Email: (data.Email || '').trim(),
        Mobile: (data.Mobile || '').trim(),
        Department: data.Department || '',
        Section: data.Section || '',
        Designation: (data.Designation || '').trim(),
        Role: data.Role || 'Technician',
        Status: data.Status || 'Active'
      };
      if (data.Password && data.Password.trim()) {
        payload.Password = data.Password.trim();
      }
      PERM_FIELDS.forEach(function(f) {
        payload[f] = data[f] ? 'TRUE' : 'FALSE';
      });

      var btn = document.getElementById('settingsUserSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = isEdit ? 'Updating...' : 'Saving...'; }

      var action = isEdit ? 'updateUser' : 'addUser';
      if (isEdit) payload.email = state.editingEmail;

      API.post(action, payload).then(function(result) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Settings.closeUserModal();
        Notify.success(isEdit ? 'User updated' : 'User added');
        loadUsersOnly();
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Save'; }
        Notify.error(err.message || 'Failed to save user');
      });
    },

    toggleStatus: function(email, newStatus) {
      Loader.show();
      API.post('updateUser', { email: email, Status: newStatus }).then(function() {
        Loader.hide();
        Notify.success('Status updated to ' + newStatus);
        loadUsersOnly();
      }).catch(function(err) {
        Loader.hide();
        Notify.error(err.message || 'Failed to update status');
      });
    },

    deleteUser: function(email) {
      Modal.confirm('Delete User', 'Are you sure you want to delete this user?', function() {
        Loader.show();
        API.post('deleteUser', { email: email }).then(function() {
          Loader.hide();
          Notify.success('User deleted');
          loadUsersOnly();
        }).catch(function(err) {
          Loader.hide();
          Notify.error(err.message || 'Failed to delete user');
        });
      });
    }
  };
})();
