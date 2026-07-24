var QRCodes = (function() {
  var STYLE_ID = 'qr-module-styles';
  var PAGE_SIZE = 15;
  var _injected = false;

  var _ov = { data: [], stats: {}, filters: { search: '', status: '', qr: '' }, page: 1, el: null };
  var _mc = { data: [], filters: { search: '', dept: '', section: '', status: '' }, page: 1, el: null };
  var _as = { data: [], filters: { search: '', dept: '', section: '', status: '' }, page: 1, el: null };
  var _sp = { data: [], filters: { search: '', category: '', status: '' }, page: 1, el: null };
  var _jc = { data: [], filters: { search: '', status: '', priority: '' }, page: 1, el: null };
  var _pl = { data: [], filters: { module: '', search: '' }, page: 1, el: null };
  var _hs = { data: [], total: 0, totalPages: 0, page: 1, filters: { module: '', search: '' }, stats: {}, el: null };
  var _lbl = { mod: '', id: '', name: '', size: '75x50mm', data: null };

  function injectStyles() {
    if (_injected) return;
    _injected = true;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = '.qr-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem}' +
      '.qr-stat-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.25rem;text-align:center}' +
      '.qr-stat-card .stat-value{font-size:1.75rem;font-weight:700;color:var(--primary);line-height:1.2}' +
      '.qr-stat-card .stat-label{font-size:.8rem;color:var(--text-secondary);margin-top:.25rem;text-transform:uppercase;letter-spacing:.03em}' +
      '.qr-controls{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}' +
      '.qr-tabs{display:flex;gap:.25rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:.25rem;flex-wrap:wrap}' +
      '.qr-tab{padding:.5rem 1rem;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;border-radius:var(--radius-sm);font-size:.85rem;font-weight:500;transition:var(--transition)}' +
      '.qr-tab:hover{color:var(--text);background:var(--bg-card-hover)}' +
      '.qr-tab.active{background:var(--primary);color:#fff}' +
      '.qr-actions{display:flex;gap:.5rem;flex-wrap:wrap}' +
      '.qr-search-bar{display:flex;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap;align-items:center}' +
      '.qr-search-bar input,.qr-search-bar select{padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);font-size:.875rem}' +
      '.qr-search-bar input:focus,.qr-search-bar select:focus{outline:none;border-color:var(--primary)}' +
      '.qr-table-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden}' +
      '.qr-table-wrap table{width:100%;border-collapse:collapse}' +
      '.qr-table-wrap th,.qr-table-wrap td{padding:.65rem .75rem;text-align:left;border-bottom:1px solid var(--border);font-size:.85rem}' +
      '.qr-table-wrap th{background:var(--bg-sidebar);font-weight:600;color:var(--text-secondary);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}' +
      '.qr-table-wrap tr:hover td{background:var(--bg-card-hover)}' +
      '.qr-cell{text-align:center}' +
      '.qr-check{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--success-bg,#d1fae5);color:var(--success,#10b981);font-size:.85rem;font-weight:700}' +
      '.mono{font-family:"Courier New",monospace}' +
      '.mono-sm{font-family:"Courier New",monospace;font-size:.8rem}' +
      '.muted{color:var(--text-muted)}' +
      '.qr-empty{text-align:center;padding:3rem;color:var(--text-muted)}' +
      '.qr-actions-cell{white-space:nowrap}' +
      '.qr-actions-cell button{margin-right:.25rem}' +
      '.qr-page-footer{display:flex;justify-content:space-between;align-items:center;padding:.65rem .75rem;font-size:.85rem;color:var(--text-secondary);border-top:1px solid var(--border)}' +
      '.qr-pagination{display:flex;align-items:center;gap:.75rem}' +
      '.qr-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999}' +
      '.qr-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);width:90%;max-width:700px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}' +
      '.qr-modal-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-bottom:1px solid var(--border)}' +
      '.qr-modal-header h3{margin:0;font-size:1.1rem}' +
      '.qr-modal-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-secondary);padding:0;line-height:1}' +
      '.qr-modal-body{padding:1.25rem}' +
      '.qr-modal-footer{display:flex;justify-content:flex-end;gap:.5rem;padding:1rem 1.25rem;border-top:1px solid var(--border)}' +
      '.qr-scan-input{width:100%;padding:.75rem;font-size:1rem;border:2px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text);margin-bottom:1rem;box-sizing:border-box}' +
      '.qr-scan-input:focus{outline:none;border-color:var(--primary)}' +
      '.qr-scan-result{min-height:100px;padding:1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-sidebar)}' +
      '.qr-scanner-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center}' +
      '.qr-scanner-header{color:#fff;font-size:18px;font-weight:600;margin-bottom:16px;text-align:center}' +
      '.qr-scanner-viewfinder{width:280px;height:280px;position:relative;border:3px solid rgba(99,102,241,.5);border-radius:16px;overflow:hidden;background:#000}' +
      '.qr-scanner-viewfinder::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--primary);animation:qrScanLine 2s linear infinite}' +
      '@keyframes qrScanLine{0%{top:0}50%{top:calc(100% - 3px)}100%{top:0}}' +
      '.qr-scanner-close{margin-top:16px;padding:10px 24px;border-radius:8px;background:rgba(255,255,255,.15);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;transition:var(--transition)}' +
      '.qr-scanner-close:hover{background:rgba(255,255,255,.25)}' +
      '.qr-label-sizes{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}' +
      '.qr-label-size-btn{padding:.5rem 1rem;border:2px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text);cursor:pointer;font-size:.85rem;transition:var(--transition)}' +
      '.qr-label-size-btn.active,.qr-label-size-btn:hover{border-color:var(--primary);background:var(--primary-light);color:var(--primary-dark)}' +
      '.qr-label-preview{border:1px dashed var(--border);border-radius:var(--radius-sm);padding:1.5rem;text-align:center;min-height:200px;background:#fff;color:#000}' +
      '.qr-label-preview .company-name{font-weight:700;font-size:1.1rem;margin-bottom:.5rem}' +
      '.qr-label-preview .record-name{font-size:.95rem;margin-bottom:.25rem}' +
      '.qr-label-preview .record-code{font-family:"Courier New",monospace;font-size:.85rem;margin-bottom:.5rem}' +
      '.qr-label-preview .module-name{font-size:.75rem;color:#666;margin-bottom:.75rem}' +
      '.qr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}' +
      '.qr-detail-item{padding:.65rem;background:var(--bg-sidebar);border-radius:var(--radius-sm)}' +
      '.qr-detail-item .label{font-size:.7rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem}' +
      '.qr-detail-item .value{font-size:.875rem;color:var(--text)}' +
      '.qr-detail-full{grid-column:1/-1}' +
      '.btn-xs{padding:.25rem .5rem;font-size:.75rem;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;transition:var(--transition);display:inline-flex;align-items:center;gap:.25rem}' +
      '.btn-xs:hover{background:var(--bg-card-hover)}' +
      '.btn-xs.btn-primary-xs{background:var(--primary);color:#fff;border-color:var(--primary)}' +
      '.btn-xs.btn-success-xs{background:var(--success,#10b981);color:#fff;border-color:var(--success,#10b981)}' +
      '.btn-xs.btn-info-xs{background:var(--info,#06b6d4);color:#fff;border-color:var(--info,#06b6d4)}' +
      '.btn-xs.btn-warning-xs{background:var(--warning,#f59e0b);color:#fff;border-color:var(--warning,#f59e0b)}' +
      '.btn-xs.btn-danger-xs{background:var(--danger,#ef4444);color:#fff;border-color:var(--danger,#ef4444)}' +
      '.btn-xs:disabled{opacity:.5;cursor:not-allowed}' +
      '.badge{display:inline-block;padding:.2rem .5rem;border-radius:999px;font-size:.75rem;font-weight:600;line-height:1}' +
      '.badge-success{background:var(--success-bg,#d1fae5);color:var(--success,#10b981)}' +
      '.badge-danger{background:#fee2e2;color:var(--danger,#ef4444)}' +
      '.badge-warning{background:#fef3c7;color:var(--warning,#f59e0b)}' +
      '.badge-primary{background:var(--primary-light,#e0e7ff);color:var(--primary-dark,#4338ca)}' +
      '.badge-secondary{background:#f3f4f6;color:#6b7280}' +
      '.badge-info{background:#cffafe;color:#0891b2}' +
      '.qr-timeline{margin-top:1rem;border-left:2px solid var(--border);margin-left:.5rem;padding-left:1rem}' +
      '.qr-timeline-item{position:relative;padding:.5rem 0 .5rem .75rem}' +
      '.qr-timeline-item::before{content:"";position:absolute;left:-1.55rem;top:.75rem;width:10px;height:10px;border-radius:50%;background:var(--primary);border:2px solid var(--bg-card)}' +
      '.qr-timeline-item .tl-date{font-size:.75rem;color:var(--text-muted)}' +
      '.qr-timeline-item .tl-action{font-size:.85rem;font-weight:600;color:var(--text)}' +
      '.qr-timeline-item .tl-notes{font-size:.8rem;color:var(--text-secondary)}';
    document.head.appendChild(s);
  }

  function esc(s) { return Utils.escapeHtml(s || ''); }

  function ensureQRCodeLib() {
    return new Promise(function(resolve) {
      if (typeof QRCode !== 'undefined') { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });
  }

  function renderQRPreview(el, content) {
    ensureQRCodeLib().then(function() {
      if (el && typeof QRCode !== 'undefined') {
        el.innerHTML = '';
        new QRCode(el, { text: content, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
      }
    });
  }

  function qrStatusBadge(s) {
    if (!s) return '<span class="badge badge-secondary">-</span>';
    var sl = (s || '').toLowerCase();
    var cls = (sl === 'active' || sl === 'closed' || sl === 'completed') ? 'success' :
              (sl === 'inactive' || sl === 'cancelled') ? 'danger' :
              (sl === 'open' || sl === 'waiting') ? 'warning' : 'primary';
    return '<span class="badge badge-' + cls + '">' + esc(s) + '</span>';
  }

  function formatDur(start) {
    if (!start) return '';
    var diff = Date.now() - new Date(start).getTime();
    if (diff < 0) return '';
    var s = Math.floor(diff / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    var d = Math.floor(h / 24);
    var parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h % 24 > 0) parts.push((h % 24) + 'h');
    if (m % 60 > 0 || parts.length === 0) parts.push((m % 60) + 'm');
    return parts.join(' ');
  }

  function moduleTag(m) {
    var colors = { 'Machine': '#6366f1', 'Asset': '#06b6d4', 'Spare Part': '#22c55e', 'Job Card': '#f59e0b' };
    var c = colors[m] || '#6b7280';
    return '<span class="badge" style="background:' + c + ';color:#fff">' + esc(m) + '</span>';
  }

  function priorityBadge(p) {
    if (!p) return '<span class="badge badge-secondary">-</span>';
    var cls = (p || '').toLowerCase() === 'high' ? 'danger' : (p || '').toLowerCase() === 'medium' ? 'warning' : 'success';
    return '<span class="badge badge-' + cls + '">' + esc(p) + '</span>';
  }

  function moduleRoute(m) {
    var routes = { 'Machine': 'machines', 'Asset': 'assets', 'Spare Part': 'spareparts', 'Job Card': 'jobcards' };
    return routes[m] || 'qr';
  }

  function getUnique(arr, field) {
    var seen = {};
    var result = [];
    arr.forEach(function(r) {
      var v = r[field];
      if (v && !seen[v]) { seen[v] = true; result.push(v); }
    });
    return result.sort();
  }

  function filterOpts(vals, defaultText) {
    var html = '<option value="">' + (defaultText || 'All') + '</option>';
    vals.forEach(function(v) { html += '<option value="' + esc(v) + '">' + esc(v) + '</option>'; });
    return html;
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  function tabBar(activeTab, actionsHtml) {
    var tabs = [
      { key: 'qr', label: 'Overview', route: 'qr' },
      { key: 'qrmachines', label: 'Machines', route: 'qrmachines' },
      { key: 'qrassets', label: 'Assets', route: 'qrassets' },
      { key: 'qrspareparts', label: 'Spare Parts', route: 'qrspareparts' },
      { key: 'qrjobcards', label: 'Job Cards', route: 'qrjobcards' },
      { key: 'qrprint', label: 'Print Labels', route: 'qrprint' },
      { key: 'qrhistory', label: 'History', route: 'qrhistory' }
    ];
    var html = '<div class="qr-controls"><div class="qr-tabs">';
    tabs.forEach(function(t) {
      html += '<button class="qr-tab' + (t.key === activeTab ? ' active' : '') + '" onclick="navigateTo(\'' + t.route + '\')">' + t.label + '</button>';
    });
    html += '</div>';
    if (actionsHtml) html += '<div class="qr-actions">' + actionsHtml + '</div>';
    html += '</div>';
    return html;
  }

  function paginationHtml(page, total, onPageFn) {
    var tp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (tp <= 1) return '';
    return '<div class="qr-pagination">' +
      '<button class="btn btn-xs" onclick="' + onPageFn + '(' + (page - 1) + ')"' + (page <= 1 ? ' disabled' : '') + '>Previous</button>' +
      '<span>Page ' + page + ' of ' + tp + '</span>' +
      '<button class="btn btn-xs" onclick="' + onPageFn + '(' + (page + 1) + ')"' + (page >= tp ? ' disabled' : '') + '>Next</button>' +
      '</div>';
  }

  function renderDetailFields(rec, mod) {
    var html = '<div class="qr-detail-grid">';
    var fields = [];
    if (mod === 'Machine') {
      fields = [
        ['Machine Code', rec.MachineCode || rec.code], ['Machine Name', rec.MachineName || rec.name],
        ['Department', rec.Department || rec.department], ['Section', rec.Section || rec.section],
        ['Location', rec.Location || rec.location], ['Status', rec.Status || rec.status],
        ['Type', rec.MachineType || rec.type], ['Manufacturer', rec.Manufacturer || rec.manufacturer],
        ['Model', rec.Model || rec.model], ['Asset No', rec.AssetNo || rec.assetNo],
        ['Criticality', rec.Criticality || rec.criticality]
      ];
    } else if (mod === 'Asset') {
      fields = [
        ['Asset Code', rec.AssetCode || rec.assetCode || rec.code], ['Asset Name', rec.AssetName || rec.name],
        ['Department', rec.Department || rec.department], ['Section', rec.Section || rec.section],
        ['Location', rec.Location || rec.location], ['Status', rec.Status || rec.status],
        ['Category', rec.Category || rec.category], ['Machine', rec.MachineName || rec.machineName],
        ['Criticality', rec.Criticality || rec.criticality]
      ];
    } else if (mod === 'Spare Part') {
      fields = [
        ['Part Code', rec.PartCode || rec.code], ['Part Name', rec.PartName || rec.name],
        ['Category', rec.Category || rec.category], ['Status', rec.Status || rec.status],
        ['Current Stock', rec.CurrentStock != null ? rec.CurrentStock : rec.currentStock],
        ['Min Stock', rec.MinimumStock != null ? rec.MinimumStock : rec.minimumStock],
        ['Max Stock', rec.MaximumStock != null ? rec.MaximumStock : rec.maximumStock],
        ['Location', rec.Location || rec.location], ['Supplier', rec.Supplier || rec.supplier],
        ['Bin Number', rec.BinNumber || rec.binNumber], ['Unit', rec.Unit || rec.unit]
      ];
    } else if (mod === 'Job Card') {
      fields = [
        ['Job Card No', rec.JobCardNo || rec.code], ['Machine', rec.MachineName || rec.machineName || rec.name],
        ['Status', rec.CurrentStatus || rec.currentStatus || rec.Status || rec.status],
        ['Open Date', rec.OpenDate || rec.openDate], ['Priority', rec.Priority || rec.priority],
        ['Complaint Category', rec.ComplaintCategory || rec.complaintCategory],
        ['Assigned Technician', rec.AssignedTechnician || rec.assignedTechnician],
        ['Approval Status', rec.ApprovalStatus || rec.approvalStatus],
        ['Breakdown Type', rec.BreakdownType || rec.breakdownType],
        ['Description', rec.ComplaintDescription || rec.complaintDescription]
      ];
    }
    fields.forEach(function(f) {
      var val = f[1];
      if (f[0] === 'Status') val = qrStatusBadge(val);
      else if (f[0] === 'Priority') val = priorityBadge(val);
      else if (f[0] === 'Criticality') val = qrStatusBadge(val);
      else val = val ? esc(String(val)) : '<span class="muted">-</span>';
      var cls = (f[0] === 'Description' || f[0] === 'Complaint Category') ? ' qr-detail-full' : '';
      html += '<div class="qr-detail-item' + cls + '"><div class="label">' + esc(f[0]) + '</div><div class="value">' + val + '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function showDetailModal(mod, recordId) {
    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.id = 'qrDetailOverlay';
    overlay.innerHTML = '<div class="qr-modal" style="max-width:800px">' +
      '<div class="qr-modal-header"><h3>' + esc(mod) + ' Details</h3>' +
      '<button class="qr-modal-close" onclick="closeQROverlay(\'qrDetailOverlay\')">&times;</button></div>' +
      '<div class="qr-modal-body"><div class="muted">Loading...</div></div></div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    API.post('getModuleRecordDetail', { module: mod, recordId: recordId }).then(function(rec) {
      if (!rec) rec = {};
      var body = overlay.querySelector('.qr-modal-body');
      var html = renderDetailFields(rec, mod);
      if (mod === 'Job Card' && rec.Timeline && rec.Timeline.length) {
        html += '<h4 style="margin-top:1rem;margin-bottom:.5rem">Timeline</h4><div class="qr-timeline">';
        rec.Timeline.forEach(function(ev) {
          html += '<div class="qr-timeline-item"><div class="tl-date">' + esc(Utils.formatDateTime ? Utils.formatDateTime(ev.Date || ev.date) : (ev.Date || ev.date || '')) + '</div>' +
            '<div class="tl-action">' + esc(ev.Action || ev.action || '') + '</div>' +
            '<div class="tl-notes">' + esc(ev.Notes || ev.notes || ev.User || ev.user || '') + '</div></div>';
        });
        html += '</div>';
      }
      html += '<div style="margin-top:1rem;text-align:center">' +
        '<button class="btn btn-xs btn-info-xs" onclick="closeQROverlay(\'qrDetailOverlay\');navigateTo(\'' + moduleRoute(mod) + '\')">Open ' + esc(mod) + ' Record</button></div>';
      body.innerHTML = html;
    }).catch(function() {
      var body = overlay.querySelector('.qr-modal-body');
      body.innerHTML = '<div class="muted">Failed to load details</div>';
    });
  }

  function showQRPreviewModal(content, title) {
    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.id = 'qrPreviewOverlay';
    overlay.innerHTML = '<div class="qr-modal" style="max-width:400px">' +
      '<div class="qr-modal-header"><h3>' + esc(title || 'QR Code') + '</h3>' +
      '<button class="qr-modal-close" onclick="closeQROverlay(\'qrPreviewOverlay\')">&times;</button></div>' +
      '<div class="qr-modal-body" style="text-align:center">' +
      '<div id="qrPreviewTarget" style="display:inline-block;margin-bottom:1rem"></div>' +
      '<div class="mono-sm muted" style="word-break:break-all">' + esc(content) + '</div></div>' +
      '<div class="qr-modal-footer">' +
      '<button class="btn btn-primary" onclick="downloadQRImage()">Download</button>' +
      '<button class="btn btn-secondary" onclick="closeQROverlay(\'qrPreviewOverlay\')">Close</button>' +
      '</div></div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(function() {
      var target = document.getElementById('qrPreviewTarget');
      if (target) renderQRPreview(target, content);
    }, 50);
  }

  window.closeQROverlay = function(id) { closeModal(id); };

  window.downloadQRImage = function() {
    var target = document.getElementById('qrPreviewTarget');
    if (!target) return;
    var img = target.querySelector('img');
    if (!img) { var canvas = target.querySelector('canvas'); if (canvas) { var a = document.createElement('a'); a.download = 'qrcode.png'; a.href = canvas.toDataURL('image/png'); a.click(); } return; }
    var a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = img.src;
    a.click();
  };

  function showScanModal() {
    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.id = 'qrScanOverlay';
    overlay.innerHTML = '<div class="qr-modal">' +
      '<div class="qr-modal-header"><h3>Scan QR Code / Barcode</h3>' +
      '<button class="qr-modal-close" onclick="closeQROverlay(\'qrScanOverlay\')">&times;</button></div>' +
      '<div class="qr-modal-body">' +
      '<input type="text" class="qr-scan-input" id="qrScanInput" placeholder="Enter QR code URL or barcode number..." />' +
      '<div class="qr-scan-result" id="qrScanResult"><div class="muted" style="text-align:center;padding:2rem">Enter a QR code or barcode and click Look Up</div></div>' +
      '</div>' +
      '<div class="qr-modal-footer">' +
      '<button class="btn btn-info" onclick="doScanLookup()">Look Up</button>' +
      '<button class="btn btn-info" onclick="closeQROverlay(\'qrScanOverlay\');QRCodes.openCameraScanner()">Camera</button>' +
      '<button class="btn btn-secondary" onclick="closeQROverlay(\'qrScanOverlay\')">Cancel</button>' +
      '</div></div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(function() {
      var inp = document.getElementById('qrScanInput');
      if (inp) { inp.focus(); inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.doScanLookup(); }); }
    }, 50);
  }

  var _scannerActive = false;

  function openCameraScanner() {
    if (_scannerActive) return;
    _scannerActive = true;
    var overlay = document.createElement('div');
    overlay.className = 'qr-scanner-overlay';
    overlay.id = 'qrScannerOverlay';
    overlay.innerHTML =
      '<div class="qr-scanner-header">Scan Machine / Asset / Job Card QR</div>' +
      '<div class="qr-scanner-viewfinder" id="qrReader"></div>' +
      '<div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:12px;text-align:center">Position QR code within the frame</div>' +
      '<button class="qr-scanner-close" onclick="QRCodes.closeCameraScanner()">Close Scanner</button>';
    document.body.appendChild(overlay);
    if (typeof Html5Qrcode === 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload = function() { startCameraScanning(); };
      script.onerror = function() { closeCameraScanner(); Notify.error('Failed to load QR scanner library'); };
      document.head.appendChild(script);
    } else {
      startCameraScanning();
    }
  }

  function startCameraScanning() {
    try {
      var html5QrCode = new Html5Qrcode('qrReader');
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        function onScanSuccess(decodedText) {
          html5QrCode.stop().then(function() {
            closeCameraScanner();
            processCameraScanResult(decodedText);
          }).catch(function() {});
        },
        function onScanFailure() {}
      ).catch(function(err) {
        closeCameraScanner();
        if (err && err.toString().indexOf('NotAllowedError') !== -1) {
          Notify.error('Camera permission denied. Please allow camera access.');
        } else {
          Notify.error('Could not access camera: ' + (err.message || err));
        }
      });
    } catch(e) {
      closeCameraScanner();
      Notify.error('QR scanner error: ' + e.message);
    }
  }

  function closeCameraScanner() {
    _scannerActive = false;
    var el = document.getElementById('qrScannerOverlay');
    if (el) el.remove();
  }

  function processCameraScanResult(decodedText) {
    Notify.info('QR scanned: processing...');
    API.post('getQRDetail', { qrContent: decodedText }).then(function(rec) {
      if (!rec || rec.error) {
        Notify.error(rec ? rec.error : 'QR code not recognized');
        return;
      }
      showCameraScanDetail(rec);
    }).catch(function() {
      Notify.error('Failed to process QR code');
    });
  }

  function showCameraScanDetail(rec) {
    var mod = rec.module || '';
    var name = rec.name || '';
    var code = rec.code || '';
    var status = rec.status || '';
    var id = rec.id || '';
    var qrContent = rec.qrContent || '';
    var iconMap = { 'Machine': '\u2699\uFE0F', 'Asset': '\uD83D\uDCE6', 'Job Card': '\uD83D\uDCCB', 'Spare Part': '\uD83D\uDD27' };
    var routeMap = { 'Machine': 'machines', 'Asset': 'assets', 'Job Card': 'openjobcard', 'Spare Part': 'spareparts' };
    var icon = iconMap[mod] || '\uD83D\uDD0D';
    var rows = '';
    function addRow(label, val) { if (val) rows += '<div class="qr-detail-row"><span class="qr-detail-label">' + esc(label) + '</span><span class="qr-detail-value">' + esc(String(val)) + '</span></div>'; }
    addRow('Module', mod);
    addRow('Name', name);
    addRow('Code', code);
    addRow('Status', status);
    addRow('Department', rec.department);
    if (rec.module === 'Machine' || rec.module === 'Asset') {
      addRow('Location', rec.location);
      addRow('Criticality', rec.criticality);
    }
    if (rec.module === 'Job Card') {
      addRow('Priority', rec.priority);
      addRow('Complaint', rec.complaint);
    }
    if (rec.jobs !== undefined) addRow('Open Jobs', rec.jobs);
    if (rec.breakdowns !== undefined) addRow('Breakdowns', rec.breakdowns);
    if (rec.totalDowntime) addRow('Total Downtime', rec.totalDowntime);
    if (rec.mttr) addRow('MTTR', rec.mttr);
    if (rec.mtbf) addRow('MTBF', rec.mtbf);
    if (rec.totalParts !== undefined) addRow('Total Parts', rec.totalParts);

    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.id = 'qrDetailOverlay';
    overlay.innerHTML = '<div style="max-width:400px;width:90%;background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.3);border:1px solid var(--border)">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">' +
        '<div style="width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--primary-light);color:var(--primary)">' + icon + '</div>' +
        '<div><div style="font-size:18px;font-weight:700;color:var(--text)">' + esc(name) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">' + esc(code) + '</div></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' + rows + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">' +
        '<button class="btn btn-primary" style="flex:1" onclick="QRCodes.closeDetail();navigateTo(\'' + (routeMap[mod] || 'dashboard') + '\')">View ' + esc(mod) + '</button>' +
        (mod === 'Machine' ? '<button class="btn btn-success" style="flex:1" onclick="QRCodes.closeDetail();navigateTo(\'openjobcard\')">Create Job Card</button>' : '') +
        '<button class="btn btn-secondary" style="flex:1" onclick="QRCodes.closeDetail()">Close</button>' +
      '</div>' +
    '</div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    API.post('logQRScan', { module: mod, recordId: id, recordName: name, scanResult: 'Success', action: 'Camera Scan' }).catch(function() {});
  }

  window.doScanLookup = function() {
    var inp = document.getElementById('qrScanInput');
    var result = document.getElementById('qrScanResult');
    if (!inp || !result) return;
    var val = (inp.value || '').trim();
    if (!val) { Notify.warning('Please enter a QR code or barcode'); return; }
    result.innerHTML = '<div class="muted" style="text-align:center;padding:1rem">Looking up...</div>';

    API.post('scanQRCode', { qrContent: val }).then(function(rec) {
      if (rec) return rec;
      return API.post('scanBarcode', { barcode: val });
    }).then(function(rec) {
      if (!rec) {
        result.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--danger)">No record found for this code</div>';
        return;
      }
      var mod = rec.module || rec.Module || '';
      var name = rec.name || rec.Name || rec.MachineName || rec.AssetName || rec.PartName || '';
      var code = rec.code || rec.Code || rec.MachineCode || rec.AssetCode || rec.PartCode || '';
      var status = rec.status || rec.Status || rec.CurrentStatus || '';
      var recId = rec.id || rec.ID || rec.MachineID || rec.AssetID || rec.PartID || rec.JobCardID || '';
      result.innerHTML = '<div style="padding:.5rem">' +
        '<div style="font-weight:700;margin-bottom:.5rem">' + esc(name) + '</div>' +
        '<div style="margin-bottom:.25rem"><span class="muted">Code:</span> <span class="mono-sm">' + esc(code) + '</span></div>' +
        '<div style="margin-bottom:.25rem"><span class="muted">Module:</span> ' + moduleTag(mod) + '</div>' +
        '<div style="margin-bottom:.75rem"><span class="muted">Status:</span> ' + qrStatusBadge(status) + '</div>' +
        '<button class="btn btn-xs btn-info-xs" onclick="closeQROverlay(\'qrScanOverlay\');navigateTo(\'' + moduleRoute(mod) + '\')">Open ' + esc(mod) + ' Record</button>' +
        '</div>';
      API.post('logQRScan', { module: mod, recordId: recId, recordName: name, scanResult: 'Success', action: 'Scan' }).catch(function() {});
    }).catch(function() {
      result.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--danger)">Error looking up code</div>';
    });
  };

  function showLabelModal(mod, recordId, recordName) {
    _lbl.mod = mod;
    _lbl.id = recordId;
    _lbl.name = recordName || '';
    _lbl.size = '75x50mm';
    _lbl.data = null;
    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.id = 'qrLabelOverlay';
    overlay.innerHTML = '<div class="qr-modal" style="max-width:600px">' +
      '<div class="qr-modal-header"><h3>Print Label - ' + esc(recordName) + '</h3>' +
      '<button class="qr-modal-close" onclick="closeQROverlay(\'qrLabelOverlay\')">&times;</button></div>' +
      '<div class="qr-modal-body">' +
      '<div class="qr-label-sizes" id="qrLabelSizes">' +
      '<button class="qr-label-size-btn" data-size="50x25mm" onclick="selectLabelSize(\'50x25mm\')">50x25mm</button>' +
      '<button class="qr-label-size-btn active" data-size="75x50mm" onclick="selectLabelSize(\'75x50mm\')">75x50mm</button>' +
      '<button class="qr-label-size-btn" data-size="100x50mm" onclick="selectLabelSize(\'100x50mm\')">100x50mm</button>' +
      '<button class="qr-label-size-btn" data-size="A4 Multiple" onclick="selectLabelSize(\'A4 Multiple\')">A4 Multiple</button>' +
      '</div>' +
      '<div class="qr-label-preview" id="qrLabelPreview"><div class="muted">Loading preview...</div></div>' +
      '</div>' +
      '<div class="qr-modal-footer">' +
      '<button class="btn btn-primary" onclick="doPrintLabel()">Print</button>' +
      '<button class="btn btn-secondary" onclick="closeQROverlay(\'qrLabelOverlay\')">Cancel</button>' +
      '</div></div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    loadLabelPreview();
  }

  window.selectLabelSize = function(size) {
    _lbl.size = size;
    var btns = document.querySelectorAll('#qrLabelSizes .qr-label-size-btn');
    btns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-size') === size); });
    loadLabelPreview();
  };

  function loadLabelPreview() {
    var preview = document.getElementById('qrLabelPreview');
    if (!preview) return;
    preview.innerHTML = '<div class="muted">Loading preview...</div>';
    API.post('getPrintLabelData', { module: _lbl.mod, recordId: _lbl.id, labelSize: _lbl.size }).then(function(data) {
      _lbl.data = data || {};
      var company = _lbl.data.companyName || _lbl.data.company || 'PWI Maintenance';
      var name = _lbl.data.recordName || _lbl.data.name || _lbl.name;
      var code = _lbl.data.recordCode || _lbl.data.code || '';
      var qr = _lbl.data.qrCode || _lbl.data.qrContent || '';
      var bc = _lbl.data.barcode || '';
      preview.innerHTML = '<div class="company-name">' + esc(company) + '</div>' +
        '<div class="record-name">' + esc(name) + '</div>' +
        '<div class="record-code">' + esc(code) + '</div>' +
        '<div class="module-name">' + esc(_lbl.mod) + '</div>' +
        '<div id="qrLabelQRCode" style="display:inline-block;margin:.5rem auto"></div>' +
        (bc ? '<div class="mono-sm" style="margin-top:.5rem">' + esc(bc) + '</div>' : '');
      if (qr) {
        setTimeout(function() {
          var el = document.getElementById('qrLabelQRCode');
          if (el) renderQRPreview(el, qr);
        }, 50);
      }
    }).catch(function() {
      preview.innerHTML = '<div class="muted">Failed to load preview</div>';
    });
  }

  window.doPrintLabel = function() {
    if (!_lbl.data) { Notify.warning('Label data not loaded'); return; }
    var company = _lbl.data.companyName || _lbl.data.company || 'PWI Maintenance';
    var name = _lbl.data.recordName || _lbl.data.name || _lbl.name;
    var code = _lbl.data.recordCode || _lbl.data.code || '';
    var qr = _lbl.data.qrCode || _lbl.data.qrContent || '';
    var bc = _lbl.data.barcode || '';
    var labelW = '75mm', labelH = '50mm';
    if (_lbl.size === '50x25mm') { labelW = '50mm'; labelH = '25mm'; }
    else if (_lbl.size === '100x50mm') { labelW = '100mm'; labelH = '50mm'; }
    else if (_lbl.size === 'A4 Multiple') { labelW = '63mm'; labelH = '38mm'; }

    var win = window.open('', '_blank', 'width=800,height=600');
    if (!win) { Notify.error('Pop-up blocked. Please allow pop-ups.'); return; }
    var html = '<!DOCTYPE html><html><head><title>Print Label</title>' +
      '<style>@media print{body{margin:0;display:flex;justify-content:center;align-items:flex-start;padding:10mm}*' +
      '{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}' +
      'body{font-family:Arial,sans-serif}' +
      '.label{width:' + labelW + ';height:' + labelH + ';border:1px solid #ccc;padding:3mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;margin-bottom:2mm}' +
      '.label .co{font-weight:700;font-size:10pt}.label .nm{font-size:8pt;margin:1mm 0}' +
      '.label .cd{font-family:"Courier New",monospace;font-size:7pt}.label .md{font-size:6pt;color:#666}' +
      '.label .qr{display:flex;justify-content:center;margin:1mm 0}.label .bc{font-family:"Courier New",monospace;font-size:6pt;margin-top:1mm}' +
      '</style></head><body>';
    var count = _lbl.size === 'A4 Multiple' ? 8 : 1;
    for (var i = 0; i < count; i++) {
      html += '<div class="label"><div class="co">' + esc(company) + '</div>' +
        '<div class="nm">' + esc(name) + '</div>' +
        '<div class="cd">' + esc(code) + '</div>' +
        '<div class="md">' + esc(_lbl.mod) + '</div>' +
        '<div class="qr" id="printQR' + i + '"></div>' +
        (bc ? '<div class="bc">' + esc(bc) + '</div>' : '') +
        '</div>';
    }
    html += '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>' +
      '<script>window.onload=function(){var t="' + (qr || '').replace(/"/g, '\\"') + '";' +
      'if(t){for(var i=0;i<' + count + ';i++){var el=document.getElementById("printQR"+i);if(el&&typeof QRCode!=="undefined"){new QRCode(el,{text:t,width:80,height:80,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H})}}}' +
      'setTimeout(function(){window.print();window.close()},500)}<\/script></body></html>';
    win.document.write(html);
    win.document.close();
    Notify.info('Print window opened');
  };

  function getAllModuleRecords() {
    return Promise.all([
      API.post('getQRModuleRecords', { module: 'Machine' }).catch(function() { return []; }),
      API.post('getQRModuleRecords', { module: 'Asset' }).catch(function() { return []; }),
      API.post('getQRModuleRecords', { module: 'Spare Part' }).catch(function() { return []; }),
      API.post('getQRModuleRecords', { module: 'Job Card' }).catch(function() { return []; })
    ]).then(function(results) {
      var all = [];
      var modules = ['Machine', 'Asset', 'Spare Part', 'Job Card'];
      results.forEach(function(records, i) {
        (Array.isArray(records) ? records : []).forEach(function(r) {
          r._module = modules[i];
          all.push(r);
        });
      });
      return all;
    });
  }

  function filterOverview(records, filters) {
    var q = (filters.search || '').toLowerCase().trim();
    var status = filters.status || '';
    var qr = filters.qr || '';
    return records.filter(function(r) {
      if (q && (r.name || '').toLowerCase().indexOf(q) === -1 && (r.code || '').toLowerCase().indexOf(q) === -1 && (r.MachineCode || '').toLowerCase().indexOf(q) === -1 && (r.AssetCode || '').toLowerCase().indexOf(q) === -1 && (r.PartCode || '').toLowerCase().indexOf(q) === -1 && (r.JobCardNo || '').toLowerCase().indexOf(q) === -1) return false;
      if (status) { var rs = (r.status || r.Status || '').toLowerCase(); if (rs !== status.toLowerCase()) return false; }
      if (qr === 'Generated' && !r.qrCode) return false;
      if (qr === 'Pending' && r.qrCode) return false;
      return true;
    });
  }

  function overviewRow(r, idx) {
    var hasQR = !!r.qrCode;
    var hasBC = !!r.barcode;
    var code = r.code || r.MachineCode || r.AssetCode || r.PartCode || r.JobCardNo || '';
    var name = r.name || r.MachineName || r.AssetName || r.PartName || '';
    var mod = r._module || '';
    var id = r.id || r.MachineID || r.AssetID || r.PartID || r.JobCardID || '';
    return '<tr>' +
      '<td>' + idx + '</td>' +
      '<td class="mono-sm">' + esc(code) + '</td>' +
      '<td>' + esc(name) + '</td>' +
      '<td>' + moduleTag(mod) + '</td>' +
      '<td class="qr-cell">' + (hasQR ? '<span class="qr-check">&#10003;</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateQR(\'' + esc(mod) + '\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-cell">' + (hasBC ? '<span class="mono-sm">' + esc(r.barcode) + '</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateBarcode(\'' + esc(mod) + '\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="muted">' + (hasQR ? formatDur(r.qrGeneratedDate) : '') + '</td>' +
      '<td class="qr-actions-cell">' +
      (hasQR ? '<button class="btn-xs btn-info-xs" onclick="QRCodes.printLabel(\'' + esc(mod) + '\',\'' + esc(String(id)) + '\',\'' + esc(name).replace(/'/g, "\\'") + '\')">Print Label</button><button class="btn-xs btn-warning-xs" onclick="QRCodes.viewQR(\'' + esc(r.qrCode).replace(/'/g, "\\'") + '\',\'' + esc(name).replace(/'/g, "\\'") + '\')">View QR</button>' : '') +
      '</td></tr>';
  }

  function renderOverviewTable() {
    var filtered = filterOverview(_ov.data, _ov.filters);
    var total = filtered.length;
    var tp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (_ov.page > tp) _ov.page = tp;
    var start = (_ov.page - 1) * PAGE_SIZE;
    var pageData = filtered.slice(start, start + PAGE_SIZE);
    var tbody = document.getElementById('qrOvBody');
    if (!tbody) return;
    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="qr-empty">No records found</td></tr>';
    } else {
      var html = '';
      pageData.forEach(function(r, i) { html += overviewRow(r, start + i + 1); });
      tbody.innerHTML = html;
    }
    var countEl = document.getElementById('qrOvCount');
    if (countEl) countEl.textContent = total + ' record' + (total !== 1 ? 's' : '');
    var pgEl = document.getElementById('qrOvPag');
    if (pgEl) pgEl.innerHTML = paginationHtml(_ov.page, total, 'QRCodes.ovPage');
  }

  function renderModuleTable(cfg) {
    var st = cfg.state;
    var filters = st.filters;
    var q = (filters.search || '').toLowerCase().trim();
    var filtered = st.data.filter(function(r) {
      if (q) {
        var searchable = cfg.searchFields.map(function(f) { return (r[f] || '').toLowerCase(); });
        if (searchable.every(function(s) { return s.indexOf(q) === -1; })) return false;
      }
      if (filters.dept && (r.Department || r.department || '') !== filters.dept) return false;
      if (filters.section && (r.Section || r.section || '') !== filters.section) return false;
      if (filters.status && (r.Status || r.status || r.CurrentStatus || r.currentStatus || '') !== filters.status) return false;
      if (filters.category && (r.Category || r.category || '') !== filters.category) return false;
      if (filters.priority && (r.Priority || r.priority || '') !== filters.priority) return false;
      return true;
    });
    var total = filtered.length;
    var tp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (st.page > tp) st.page = tp;
    var start = (st.page - 1) * PAGE_SIZE;
    var pageData = filtered.slice(start, start + PAGE_SIZE);
    var tbody = document.getElementById(cfg.tbodyId);
    if (!tbody) return;
    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="' + cfg.colCount + '" class="qr-empty">No records found</td></tr>';
    } else {
      var html = '';
      pageData.forEach(function(r, i) { html += cfg.rowFn(r, start + i + 1); });
      tbody.innerHTML = html;
    }
    var countEl = document.getElementById(cfg.countId);
    if (countEl) countEl.textContent = total + ' record' + (total !== 1 ? 's' : '');
    var pgEl = document.getElementById(cfg.pagId);
    if (pgEl) pgEl.innerHTML = paginationHtml(st.page, total, cfg.pageFn);
  }

  function machineRow(r, idx) {
    var id = r.id || r.MachineID || '';
    var hasQR = !!r.qrCode;
    var hasBC = !!r.barcode;
    var status = r.Status || r.status || '';
    return '<tr>' +
      '<td>' + idx + '</td>' +
      '<td class="mono-sm">' + esc(r.MachineCode || r.code || '') + '</td>' +
      '<td>' + esc(r.MachineName || r.name || '') + '</td>' +
      '<td>' + esc(r.Department || r.department || '') + '</td>' +
      '<td>' + esc(r.Section || r.section || '') + '</td>' +
      '<td>' + qrStatusBadge(status) + '</td>' +
      '<td class="qr-cell">' + (hasQR ? '<span class="qr-check">&#10003;</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateQR(\'Machine\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-cell">' + (hasBC ? '<span class="mono-sm">' + esc(r.barcode) + '</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateBarcode(\'Machine\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-actions-cell">' +
      '<button class="btn-xs" onclick="QRCodes.showDetail(\'Machine\',\'' + esc(String(id)) + '\')">Details</button>' +
      (hasQR ? '<button class="btn-xs btn-info-xs" onclick="QRCodes.printLabel(\'Machine\',\'' + esc(String(id)) + '\',\'' + esc(r.MachineName || r.name || '').replace(/'/g, "\\'") + '\')">Print</button><button class="btn-xs btn-warning-xs" onclick="QRCodes.viewQR(\'' + esc(r.qrCode).replace(/'/g, "\\'") + '\',\'' + esc(r.MachineName || r.name || '').replace(/'/g, "\\'") + '\')">QR</button>' : '') +
      '</td></tr>';
  }

  function assetRow(r, idx) {
    var id = r.id || r.AssetID || '';
    var hasQR = !!r.qrCode;
    var hasBC = !!r.barcode;
    var status = r.Status || r.status || '';
    return '<tr>' +
      '<td>' + idx + '</td>' +
      '<td class="mono-sm">' + esc(r.AssetCode || r.assetCode || r.code || '') + '</td>' +
      '<td>' + esc(r.AssetName || r.name || '') + '</td>' +
      '<td>' + esc(r.Department || r.department || '') + '</td>' +
      '<td>' + esc(r.Section || r.section || '') + '</td>' +
      '<td>' + qrStatusBadge(status) + '</td>' +
      '<td class="qr-cell">' + (hasQR ? '<span class="qr-check">&#10003;</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateQR(\'Asset\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-cell">' + (hasBC ? '<span class="mono-sm">' + esc(r.barcode) + '</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateBarcode(\'Asset\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-actions-cell">' +
      '<button class="btn-xs" onclick="QRCodes.showDetail(\'Asset\',\'' + esc(String(id)) + '\')">Details</button>' +
      (hasQR ? '<button class="btn-xs btn-info-xs" onclick="QRCodes.printLabel(\'Asset\',\'' + esc(String(id)) + '\',\'' + esc(r.AssetName || r.name || '').replace(/'/g, "\\'") + '\')">Print</button><button class="btn-xs btn-warning-xs" onclick="QRCodes.viewQR(\'' + esc(r.qrCode).replace(/'/g, "\\'") + '\',\'' + esc(r.AssetName || r.name || '').replace(/'/g, "\\'") + '\')">QR</button>' : '') +
      '</td></tr>';
  }

  function sparePartRow(r, idx) {
    var id = r.id || r.PartID || '';
    var hasQR = !!r.qrCode;
    var hasBC = !!r.barcode;
    var status = r.Status || r.status || '';
    var stock = r.CurrentStock != null ? r.CurrentStock : (r.currentStock != null ? r.currentStock : '-');
    var minStock = r.MinimumStock != null ? r.MinimumStock : (r.minimumStock != null ? r.minimumStock : '-');
    return '<tr>' +
      '<td>' + idx + '</td>' +
      '<td class="mono-sm">' + esc(r.PartCode || r.code || '') + '</td>' +
      '<td>' + esc(r.PartName || r.name || '') + '</td>' +
      '<td>' + esc(r.Category || r.category || '') + '</td>' +
      '<td class="mono-sm">' + esc(String(stock)) + ' / ' + esc(String(minStock)) + '</td>' +
      '<td>' + esc(r.Location || r.location || '') + '</td>' +
      '<td class="qr-cell">' + (hasQR ? '<span class="qr-check">&#10003;</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateQR(\'Spare Part\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-cell">' + (hasBC ? '<span class="mono-sm">' + esc(r.barcode) + '</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateBarcode(\'Spare Part\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-actions-cell">' +
      '<button class="btn-xs" onclick="QRCodes.showDetail(\'Spare Part\',\'' + esc(String(id)) + '\')">Details</button>' +
      (hasQR ? '<button class="btn-xs btn-info-xs" onclick="QRCodes.printLabel(\'Spare Part\',\'' + esc(String(id)) + '\',\'' + esc(r.PartName || r.name || '').replace(/'/g, "\\'") + '\')">Print</button><button class="btn-xs btn-warning-xs" onclick="QRCodes.viewQR(\'' + esc(r.qrCode).replace(/'/g, "\\'") + '\',\'' + esc(r.PartName || r.name || '').replace(/'/g, "\\'") + '\')">QR</button>' : '') +
      '</td></tr>';
  }

  function jobCardRow(r, idx) {
    var id = r.id || r.JobCardID || '';
    var hasQR = !!r.qrCode;
    var hasBC = !!r.barcode;
    var status = r.CurrentStatus || r.currentStatus || r.Status || r.status || '';
    var priority = r.Priority || r.priority || '';
    return '<tr>' +
      '<td>' + idx + '</td>' +
      '<td class="mono-sm">' + esc(r.JobCardNo || r.code || '') + '</td>' +
      '<td>' + esc(r.MachineName || r.machineName || r.name || '') + '</td>' +
      '<td>' + qrStatusBadge(status) + '</td>' +
      '<td>' + esc(r.OpenDate || r.openDate || '') + '</td>' +
      '<td>' + priorityBadge(priority) + '</td>' +
      '<td class="qr-cell">' + (hasQR ? '<span class="qr-check">&#10003;</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateQR(\'Job Card\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-cell">' + (hasBC ? '<span class="mono-sm">' + esc(r.barcode) + '</span>' : '<button class="btn-xs btn-primary-xs" onclick="QRCodes.generateBarcode(\'Job Card\',\'' + esc(String(id)) + '\')">Generate</button>') + '</td>' +
      '<td class="qr-actions-cell">' +
      '<button class="btn-xs" onclick="QRCodes.showDetail(\'Job Card\',\'' + esc(String(id)) + '\')">Details</button>' +
      (hasQR ? '<button class="btn-xs btn-info-xs" onclick="QRCodes.printLabel(\'Job Card\',\'' + esc(String(id)) + '\',\'' + esc(r.JobCardNo || r.code || '').replace(/'/g, "\\'") + '\')">Print</button><button class="btn-xs btn-warning-xs" onclick="QRCodes.viewQR(\'' + esc(r.qrCode).replace(/'/g, "\\'") + '\',\'' + esc(r.JobCardNo || r.code || '').replace(/'/g, "\\'") + '\')">QR</button>' : '') +
      '</td></tr>';
  }

  function showOverview(el) {
    _ov.el = el;
    _ov.data = [];
    _ov.page = 1;
    _ov.filters = { search: '', status: '', qr: '' };
    el.innerHTML = '<div class="qr-summary">' +
      '<div class="qr-stat-card"><div class="stat-value" id="qrStatGenerated">-</div><div class="stat-label">QR Generated</div></div>' +
      '<div class="qr-stat-card"><div class="stat-value" id="qrStatPending">-</div><div class="stat-label">Pending</div></div>' +
      '<div class="qr-stat-card"><div class="stat-value" id="qrStatScanned">-</div><div class="stat-label">Times Scanned</div></div>' +
      '</div>' +
      tabBar('qr', '<button class="btn btn-primary" onclick="QRCodes.bulkAllQR()">Bulk Generate QR</button>' +
        '<button class="btn btn-success" onclick="QRCodes.bulkAllBarcode()">Bulk Barcode</button>' +
        '<button class="btn btn-info" onclick="QRCodes.openScan()">Scan</button>') +
      '<div class="qr-search-bar">' +
      '<input type="text" id="qrOvSearch" placeholder="Search records..." oninput="QRCodes.ovSearch(this.value)" style="flex:1;min-width:200px" />' +
      '<select id="qrOvStatus" onchange="QRCodes.ovFilterStatus(this.value)"><option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>' +
      '<select id="qrOvQR" onchange="QRCodes.ovFilterQR(this.value)"><option value="">All QR Status</option><option value="Generated">Generated</option><option value="Pending">Pending</option></select>' +
      '</div>' +
      '<div class="qr-table-wrap"><table><thead><tr>' +
      '<th>#</th><th>ID/Code</th><th>Name</th><th>Module</th><th>QR Code</th><th>Barcode</th><th>Generated</th><th>Actions</th>' +
      '</tr></thead><tbody id="qrOvBody"><tr><td colspan="8" class="qr-empty">Loading...</td></tr></tbody></table>' +
      '<div class="qr-page-footer"><span id="qrOvCount">0 records</span><div id="qrOvPag"></div></div></div>';

    Promise.all([
      API.post('getQRStatistics').catch(function() { return {}; }),
      getAllModuleRecords()
    ]).then(function(results) {
      _ov.stats = results[0] || {};
      _ov.data = results[1] || [];
      var el2 = document.getElementById('qrStatGenerated');
      if (el2) el2.textContent = _ov.stats.generated != null ? _ov.stats.generated : _ov.data.filter(function(r) { return !!r.qrCode; }).length;
      el2 = document.getElementById('qrStatPending');
      if (el2) el2.textContent = _ov.stats.pending != null ? _ov.stats.pending : _ov.data.filter(function(r) { return !r.qrCode; }).length;
      el2 = document.getElementById('qrStatScanned');
      if (el2) el2.textContent = _ov.stats.scanned != null ? _ov.stats.scanned : 0;
      renderOverviewTable();
    }).catch(function() {
      var tbody = document.getElementById('qrOvBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="qr-empty">Failed to load data</td></tr>';
    });
  }

  function showModulePage(cfg) {
    var st = cfg.state;
    st.el = cfg.el;
    st.data = [];
    st.page = 1;
    st.filters = {};
    cfg.filterFields.forEach(function(f) { st.filters[f] = ''; });

    var filterHtml = '<div class="qr-search-bar">' +
      '<input type="text" id="' + cfg.searchId + '" placeholder="Search..." oninput="QRCodes.' + cfg.searchFn + '(this.value)" style="flex:1;min-width:180px" />';
    cfg.filterSelects.forEach(function(fs) {
      filterHtml += '<select id="' + fs.id + '" onchange="QRCodes.' + fs.fn + '(this.value)">' + fs.options + '</select>';
    });
    filterHtml += '</div>';

    cfg.el.innerHTML =
      tabBar(cfg.tabKey, '<button class="btn btn-primary" onclick="QRCodes.bulkModuleQR(\'' + esc(cfg.module) + '\')">Bulk Generate QR</button>' +
        '<button class="btn btn-success" onclick="QRCodes.bulkModuleBarcode(\'' + esc(cfg.module) + '\')">Bulk Barcode</button>') +
      filterHtml +
      '<div class="qr-table-wrap"><table><thead><tr>' + cfg.headers + '</tr></thead><tbody id="' + cfg.tbodyId + '"><tr><td colspan="' + cfg.colCount + '" class="qr-empty">Loading...</td></tr></tbody></table>' +
      '<div class="qr-page-footer"><span id="' + cfg.countId + '">0 records</span><div id="' + cfg.pagId + '"></div></div></div>';

    API.post('getQRModuleRecords', { module: cfg.module }).then(function(records) {
      st.data = Array.isArray(records) ? records : [];
      cfg.populateFilters(st.data);
      cfg.renderTable();
    }).catch(function() {
      var tbody = document.getElementById(cfg.tbodyId);
      if (tbody) tbody.innerHTML = '<tr><td colspan="' + cfg.colCount + '" class="qr-empty">Failed to load data</td></tr>';
    });
  }

  function populateSelectFromData(id, data, field) {
    var vals = getUnique(data, field);
    var sel = document.getElementById(id);
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">All</option>';
    vals.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      if (v === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function mcRenderTable() {
    renderModuleTable({
      state: _mc, tbodyId: 'qrMcBody', countId: 'qrMcCount', pagId: 'qrMcPag',
      colCount: 9, searchFields: ['MachineCode', 'MachineName', 'code', 'name'],
      pageFn: 'QRCodes.mcPage', rowFn: machineRow
    });
  }

  function asRenderTable() {
    renderModuleTable({
      state: _as, tbodyId: 'qrAsBody', countId: 'qrAsCount', pagId: 'qrAsPag',
      colCount: 9, searchFields: ['AssetCode', 'AssetName', 'assetCode', 'code', 'name'],
      pageFn: 'QRCodes.asPage', rowFn: assetRow
    });
  }

  function spRenderTable() {
    renderModuleTable({
      state: _sp, tbodyId: 'qrSpBody', countId: 'qrSpCount', pagId: 'qrSpPag',
      colCount: 9, searchFields: ['PartCode', 'PartName', 'code', 'name'],
      pageFn: 'QRCodes.spPage', rowFn: sparePartRow
    });
  }

  function jcRenderTable() {
    renderModuleTable({
      state: _jc, tbodyId: 'qrJcBody', countId: 'qrJcCount', pagId: 'qrJcPag',
      colCount: 9, searchFields: ['JobCardNo', 'MachineName', 'machineName', 'code', 'name'],
      pageFn: 'QRCodes.jcPage', rowFn: jobCardRow
    });
  }

  function showMachines(el) {
    showModulePage({
      state: _mc, el: el, module: 'Machine', tabKey: 'qrmachines',
      searchId: 'qrMcSearch', searchFn: 'mcSearch', tbodyId: 'qrMcBody',
      countId: 'qrMcCount', pagId: 'qrMcPag', colCount: 9,
      filterFields: ['search', 'dept', 'section', 'status'],
      filterSelects: [
        { id: 'qrMcDept', fn: 'mcFilterDept', options: '<option value="">All Departments</option>' },
        { id: 'qrMcSection', fn: 'mcFilterSection', options: '<option value="">All Sections</option>' },
        { id: 'qrMcStatus', fn: 'mcFilterStatus', options: '<option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Under Maintenance">Under Maintenance</option><option value="Retired">Retired</option>' }
      ],
      headers: '<th>#</th><th>Machine Code</th><th>Machine Name</th><th>Department</th><th>Section</th><th>Status</th><th>QR Code</th><th>Barcode</th><th>Actions</th>',
      renderTable: mcRenderTable,
      populateFilters: function(data) {
        populateSelectFromData('qrMcDept', data, 'Department');
        populateSelectFromData('qrMcSection', data, 'Section');
      }
    });
  }

  function showAssets(el) {
    showModulePage({
      state: _as, el: el, module: 'Asset', tabKey: 'qrassets',
      searchId: 'qrAsSearch', searchFn: 'asSearch', tbodyId: 'qrAsBody',
      countId: 'qrAsCount', pagId: 'qrAsPag', colCount: 9,
      filterFields: ['search', 'dept', 'section', 'status'],
      filterSelects: [
        { id: 'qrAsDept', fn: 'asFilterDept', options: '<option value="">All Departments</option>' },
        { id: 'qrAsSection', fn: 'asFilterSection', options: '<option value="">All Sections</option>' },
        { id: 'qrAsStatus', fn: 'asFilterStatus', options: '<option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Retired">Retired</option>' }
      ],
      headers: '<th>#</th><th>Asset Code</th><th>Asset Name</th><th>Department</th><th>Section</th><th>Status</th><th>QR Code</th><th>Barcode</th><th>Actions</th>',
      renderTable: asRenderTable,
      populateFilters: function(data) {
        populateSelectFromData('qrAsDept', data, 'Department');
        populateSelectFromData('qrAsSection', data, 'Section');
      }
    });
  }

  function showSpareParts(el) {
    showModulePage({
      state: _sp, el: el, module: 'Spare Part', tabKey: 'qrspareparts',
      searchId: 'qrSpSearch', searchFn: 'spSearch', tbodyId: 'qrSpBody',
      countId: 'qrSpCount', pagId: 'qrSpPag', colCount: 9,
      filterFields: ['search', 'category', 'status'],
      filterSelects: [
        { id: 'qrSpCategory', fn: 'spFilterCategory', options: '<option value="">All Categories</option>' },
        { id: 'qrSpStatus', fn: 'spFilterStatus', options: '<option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>' }
      ],
      headers: '<th>#</th><th>Part Code</th><th>Part Name</th><th>Category</th><th>Stock (Cur/Min)</th><th>Location</th><th>QR Code</th><th>Barcode</th><th>Actions</th>',
      renderTable: spRenderTable,
      populateFilters: function(data) {
        populateSelectFromData('qrSpCategory', data, 'Category');
      }
    });
  }

  function showJobCards(el) {
    showModulePage({
      state: _jc, el: el, module: 'Job Card', tabKey: 'qrjobcards',
      searchId: 'qrJcSearch', searchFn: 'jcSearch', tbodyId: 'qrJcBody',
      countId: 'qrJcCount', pagId: 'qrJcPag', colCount: 9,
      filterFields: ['search', 'status', 'priority'],
      filterSelects: [
        { id: 'qrJcStatus', fn: 'jcFilterStatus', options: '<option value="">All Status</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Waiting">Waiting</option><option value="Closed">Closed</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>' },
        { id: 'qrJcPriority', fn: 'jcFilterPriority', options: '<option value="">All Priority</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>' }
      ],
      headers: '<th>#</th><th>Job Card No</th><th>Machine</th><th>Status</th><th>Open Date</th><th>Priority</th><th>QR Code</th><th>Barcode</th><th>Actions</th>',
      renderTable: jcRenderTable,
      populateFilters: function() {}
    });
  }

  function showPrintLabels(el) {
    _pl.el = el;
    _pl.data = [];
    _pl.page = 1;
    _pl.filters = { module: '', search: '' };
    el.innerHTML = tabBar('qrprint', '') +
      '<div class="qr-search-bar">' +
      '<select id="qrPlModule" onchange="QRCodes.plFilterModule(this.value)"><option value="">All Modules</option><option value="Machine">Machine</option><option value="Asset">Asset</option><option value="Spare Part">Spare Part</option><option value="Job Card">Job Card</option></select>' +
      '<input type="text" id="qrPlSearch" placeholder="Search records..." oninput="QRCodes.plSearch(this.value)" style="flex:1;min-width:200px" />' +
      '</div>' +
      '<div class="qr-table-wrap"><table><thead><tr>' +
      '<th>#</th><th>ID</th><th>Name</th><th>Module</th><th>QR</th><th>Barcode</th><th>Action</th>' +
      '</tr></thead><tbody id="qrPlBody"><tr><td colspan="7" class="qr-empty">Loading...</td></tr></tbody></table>' +
      '<div class="qr-page-footer"><span id="qrPlCount">0 records</span><div id="qrPlPag"></div></div></div>';

    getAllModuleRecords().then(function(records) {
      _pl.data = (records || []).filter(function(r) { return !!r.qrCode; });
      renderPrintTable();
    }).catch(function() {
      var tbody = document.getElementById('qrPlBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="qr-empty">Failed to load data</td></tr>';
    });
  }

  function renderPrintTable() {
    var q = (_pl.filters.search || '').toLowerCase().trim();
    var modFilter = _pl.filters.module || '';
    var filtered = _pl.data.filter(function(r) {
      if (modFilter && (r._module || '') !== modFilter) return false;
      if (q) {
        var name = (r.name || r.MachineName || r.AssetName || r.PartName || r.JobCardNo || '').toLowerCase();
        var code = (r.code || r.MachineCode || r.AssetCode || r.PartCode || '').toLowerCase();
        if (name.indexOf(q) === -1 && code.indexOf(q) === -1) return false;
      }
      return true;
    });
    var total = filtered.length;
    var tp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (_pl.page > tp) _pl.page = tp;
    var start = (_pl.page - 1) * PAGE_SIZE;
    var pageData = filtered.slice(start, start + PAGE_SIZE);
    var tbody = document.getElementById('qrPlBody');
    if (!tbody) return;
    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="qr-empty">No records with QR codes</td></tr>';
    } else {
      var html = '';
      pageData.forEach(function(r, i) {
        var idx = start + i + 1;
        var id = r.id || r.MachineID || r.AssetID || r.PartID || r.JobCardID || '';
        var name = r.name || r.MachineName || r.AssetName || r.PartName || r.JobCardNo || '';
        var code = r.code || r.MachineCode || r.AssetCode || r.PartCode || '';
        var mod = r._module || '';
        html += '<tr><td>' + idx + '</td>' +
          '<td class="mono-sm">' + esc(code) + '</td>' +
          '<td>' + esc(name) + '</td>' +
          '<td>' + moduleTag(mod) + '</td>' +
          '<td class="qr-cell"><span class="qr-check">&#10003;</span></td>' +
          '<td class="qr-cell">' + (r.barcode ? '<span class="mono-sm">' + esc(r.barcode) + '</span>' : '<span class="muted">-</span>') + '</td>' +
          '<td class="qr-actions-cell"><button class="btn-xs btn-info-xs" onclick="QRCodes.printLabel(\'' + esc(mod) + '\',\'' + esc(String(id)) + '\',\'' + esc(name).replace(/'/g, "\\'") + '\')">Print Label</button></td></tr>';
      });
      tbody.innerHTML = html;
    }
    var countEl = document.getElementById('qrPlCount');
    if (countEl) countEl.textContent = total + ' record' + (total !== 1 ? 's' : '');
    var pgEl = document.getElementById('qrPlPag');
    if (pgEl) pgEl.innerHTML = paginationHtml(_pl.page, total, 'QRCodes.plPage');
  }

  function showHistory(el) {
    _hs.el = el;
    _hs.data = [];
    _hs.page = 1;
    _hs.total = 0;
    _hs.totalPages = 0;
    _hs.filters = { module: '', search: '' };
    _hs.stats = {};
    el.innerHTML = '<div class="qr-summary">' +
      '<div class="qr-stat-card"><div class="stat-value" id="qrHsTotal">-</div><div class="stat-label">Total Scans</div></div>' +
      '<div class="qr-stat-card"><div class="stat-value" id="qrHsToday">-</div><div class="stat-label">Today</div></div>' +
      '<div class="qr-stat-card"><div class="stat-value" id="qrHsUsers">-</div><div class="stat-label">Unique Users</div></div>' +
      '</div>' +
      tabBar('qrhistory', '') +
      '<div class="qr-search-bar">' +
      '<select id="qrHsModule" onchange="QRCodes.hsFilterModule(this.value)"><option value="">All Modules</option><option value="Machine">Machine</option><option value="Asset">Asset</option><option value="Spare Part">Spare Part</option><option value="Job Card">Job Card</option></select>' +
      '<input type="text" id="qrHsSearch" placeholder="Search history..." oninput="QRCodes.hsSearch(this.value)" style="flex:1;min-width:200px" />' +
      '</div>' +
      '<div class="qr-table-wrap"><table><thead><tr>' +
      '<th>#</th><th>Date/Time</th><th>User</th><th>Module</th><th>Record</th><th>Action</th><th>Device</th>' +
      '</tr></thead><tbody id="qrHsBody"><tr><td colspan="7" class="qr-empty">Loading...</td></tr></tbody></table>' +
      '<div class="qr-page-footer"><span id="qrHsCount">0 records</span><div id="qrHsPag"></div></div></div>';

    loadHistoryStats();
    loadHistoryPage();
  }

  function loadHistoryStats() {
    API.post('getQRScanStats').then(function(stats) {
      _hs.stats = stats || {};
      var el = document.getElementById('qrHsTotal');
      if (el) el.textContent = _hs.stats.totalScans != null ? _hs.stats.totalScans : 0;
      el = document.getElementById('qrHsToday');
      if (el) el.textContent = _hs.stats.todayScans != null ? _hs.stats.todayScans : 0;
      el = document.getElementById('qrHsUsers');
      if (el) el.textContent = _hs.stats.uniqueUsers != null ? _hs.stats.uniqueUsers : '-';
    }).catch(function() {});
  }

  function loadHistoryPage() {
    var tbody = document.getElementById('qrHsBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="qr-empty">Loading...</td></tr>';

    API.post('getQRScanHistory', {
      module: _hs.filters.module || '',
      search: _hs.filters.search || '',
      page: _hs.page,
      pageSize: PAGE_SIZE
    }).then(function(result) {
      if (!result) result = { records: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 };
      _hs.data = result.records || [];
      _hs.total = result.total || 0;
      _hs.totalPages = result.totalPages || Math.max(1, Math.ceil(_hs.total / PAGE_SIZE));
      _hs.page = result.page || 1;

      if (!_hs.data.length) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="qr-empty">No scan history found</td></tr>';
      } else {
        var html = '';
        var start = (_hs.page - 1) * PAGE_SIZE;
        _hs.data.forEach(function(r, i) {
          html += '<tr>' +
            '<td>' + (start + i + 1) + '</td>' +
            '<td>' + esc(Utils.formatDateTime ? Utils.formatDateTime(r.DateTime || r.date || r.timestamp) : (r.DateTime || r.date || r.timestamp || '')) + '</td>' +
            '<td>' + esc(r.User || r.user || r.email || '') + '</td>' +
            '<td>' + moduleTag(r.Module || r.module || '') + '</td>' +
            '<td>' + esc(r.RecordName || r.recordName || r.Record || r.record || '') + '</td>' +
            '<td>' + esc(r.Action || r.action || '') + '</td>' +
            '<td class="mono-sm">' + esc(r.Device || r.device || '') + '</td>' +
            '</tr>';
        });
        if (tbody) tbody.innerHTML = html;
      }

      var countEl = document.getElementById('qrHsCount');
      if (countEl) countEl.textContent = _hs.total + ' record' + (_hs.total !== 1 ? 's' : '');
      var pgEl = document.getElementById('qrHsPag');
      if (pgEl) pgEl.innerHTML = paginationHtml(_hs.page, _hs.total, 'QRCodes.hsPage');

      if (_hs.total > 0 && !_hs.stats.uniqueUsers) {
        var users = {};
        _hs.data.forEach(function(r) { var u = r.User || r.user || r.email; if (u) users[u] = true; });
        var el2 = document.getElementById('qrHsUsers');
        if (el2) el2.textContent = Object.keys(users).length || '-';
      }
    }).catch(function() {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="qr-empty">Failed to load scan history</div></tr>';
    });
  }

  return {
    show: function(el) {
      injectStyles();
      if (!el) el = document.getElementById('pageContent');
      if (!el) return;
      showOverview(el);
    },

    showQR: function(el) { showOverview(el); },
    showQRMachines: function(el) { showMachines(el); },
    showQRAssets: function(el) { showAssets(el); },
    showQRSpareParts: function(el) { showSpareParts(el); },
    showQRJobCards: function(el) { showJobCards(el); },
    showQRPrint: function(el) { showPrintLabels(el); },
    showQRHistory: function(el) { showHistory(el); },

    ovSearch: function(v) { _ov.filters.search = v; _ov.page = 1; renderOverviewTable(); },
    ovFilterStatus: function(v) { _ov.filters.status = v; _ov.page = 1; renderOverviewTable(); },
    ovFilterQR: function(v) { _ov.filters.qr = v; _ov.page = 1; renderOverviewTable(); },
    ovPage: function(p) { _ov.page = p; renderOverviewTable(); },

    mcSearch: function(v) { _mc.filters.search = v; _mc.page = 1; mcRenderTable(); },
    mcFilterDept: function(v) { _mc.filters.dept = v; _mc.page = 1; mcRenderTable(); },
    mcFilterSection: function(v) { _mc.filters.section = v; _mc.page = 1; mcRenderTable(); },
    mcFilterStatus: function(v) { _mc.filters.status = v; _mc.page = 1; mcRenderTable(); },
    mcPage: function(p) { _mc.page = p; mcRenderTable(); },

    asSearch: function(v) { _as.filters.search = v; _as.page = 1; asRenderTable(); },
    asFilterDept: function(v) { _as.filters.dept = v; _as.page = 1; asRenderTable(); },
    asFilterSection: function(v) { _as.filters.section = v; _as.page = 1; asRenderTable(); },
    asFilterStatus: function(v) { _as.filters.status = v; _as.page = 1; asRenderTable(); },
    asPage: function(p) { _as.page = p; asRenderTable(); },

    spSearch: function(v) { _sp.filters.search = v; _sp.page = 1; spRenderTable(); },
    spFilterCategory: function(v) { _sp.filters.category = v; _sp.page = 1; spRenderTable(); },
    spFilterStatus: function(v) { _sp.filters.status = v; _sp.page = 1; spRenderTable(); },
    spPage: function(p) { _sp.page = p; spRenderTable(); },

    jcSearch: function(v) { _jc.filters.search = v; _jc.page = 1; jcRenderTable(); },
    jcFilterStatus: function(v) { _jc.filters.status = v; _jc.page = 1; jcRenderTable(); },
    jcFilterPriority: function(v) { _jc.filters.priority = v; _jc.page = 1; jcRenderTable(); },
    jcPage: function(p) { _jc.page = p; jcRenderTable(); },

    plSearch: function(v) { _pl.filters.search = v; _pl.page = 1; renderPrintTable(); },
    plFilterModule: function(v) { _pl.filters.module = v; _pl.page = 1; renderPrintTable(); },
    plPage: function(p) { _pl.page = p; renderPrintTable(); },

    hsSearch: function(v) { _hs.filters.search = v; _hs.page = 1; loadHistoryPage(); },
    hsFilterModule: function(v) { _hs.filters.module = v; _hs.page = 1; loadHistoryPage(); },
    hsPage: function(p) { _hs.page = p; loadHistoryPage(); },

    openScan: function() { showScanModal(); },
    openCameraScanner: function() { openCameraScanner(); },
    closeCameraScanner: function() { closeCameraScanner(); },
    closeDetail: function() { var el = document.getElementById('qrDetailOverlay'); if (el) el.remove(); },

    generateQR: function(mod, id) {
      API.post('generateQRCode', { module: mod, recordId: id }).then(function() {
        Notify.success('QR code generated');
        QRCodes._refresh();
      }).catch(function(e) { Notify.error(e.message || 'Failed to generate QR code'); });
    },

    generateBarcode: function(mod, id) {
      API.post('generateBarcode', { module: mod, recordId: id }).then(function() {
        Notify.success('Barcode generated');
        QRCodes._refresh();
      }).catch(function(e) { Notify.error(e.message || 'Failed to generate barcode'); });
    },

    bulkAllQR: function() {
      Modal.confirm('Bulk Generate QR', 'Generate QR codes for all modules? This may take a moment.', function() {
        Notify.info('Generating QR codes...');
        Promise.all([
          API.post('bulkGenerateQRCode', { module: 'Machine' }),
          API.post('bulkGenerateQRCode', { module: 'Asset' }),
          API.post('bulkGenerateQRCode', { module: 'Spare Part' }),
          API.post('bulkGenerateQRCode', { module: 'Job Card' })
        ]).then(function(results) {
          var total = results.reduce(function(sum, r) { return sum + (Array.isArray(r) ? r.length : 0); }, 0);
          Notify.success('QR codes generated for ' + total + ' records');
          QRCodes._refresh();
        }).catch(function(e) { Notify.error(e.message || 'Bulk generation failed'); });
      });
    },

    bulkAllBarcode: function() {
      Modal.confirm('Bulk Generate Barcodes', 'Generate barcodes for all modules? This may take a moment.', function() {
        Notify.info('Generating barcodes...');
        Promise.all([
          API.post('bulkGenerateBarcode', { module: 'Machine' }),
          API.post('bulkGenerateBarcode', { module: 'Asset' }),
          API.post('bulkGenerateBarcode', { module: 'Spare Part' }),
          API.post('bulkGenerateBarcode', { module: 'Job Card' })
        ]).then(function(results) {
          var total = results.reduce(function(sum, r) { return sum + (Array.isArray(r) ? r.length : 0); }, 0);
          Notify.success('Barcodes generated for ' + total + ' records');
          QRCodes._refresh();
        }).catch(function(e) { Notify.error(e.message || 'Bulk generation failed'); });
      });
    },

    bulkModuleQR: function(mod) {
      Modal.confirm('Bulk Generate QR', 'Generate QR codes for all ' + mod + ' records?', function() {
        Notify.info('Generating QR codes for ' + mod + '...');
        API.post('bulkGenerateQRCode', { module: mod }).then(function(results) {
          var count = Array.isArray(results) ? results.length : 0;
          Notify.success('QR codes generated for ' + count + ' ' + mod + ' records');
          QRCodes._refresh();
        }).catch(function(e) { Notify.error(e.message || 'Bulk generation failed'); });
      });
    },

    bulkModuleBarcode: function(mod) {
      Modal.confirm('Bulk Generate Barcodes', 'Generate barcodes for all ' + mod + ' records?', function() {
        Notify.info('Generating barcodes for ' + mod + '...');
        API.post('bulkGenerateBarcode', { module: mod }).then(function(results) {
          var count = Array.isArray(results) ? results.length : 0;
          Notify.success('Barcodes generated for ' + count + ' ' + mod + ' records');
          QRCodes._refresh();
        }).catch(function(e) { Notify.error(e.message || 'Bulk generation failed'); });
      });
    },

    viewQR: function(content, title) { showQRPreviewModal(content, title); },

    printLabel: function(mod, id, name) { showLabelModal(mod, id, name); },

    showDetail: function(mod, id) { showDetailModal(mod, id); },

    _refresh: function() {
      var pageContent = document.getElementById('pageContent');
      if (!pageContent) return;
      var activeTab = document.querySelector('.qr-tab.active');
      if (!activeTab) return;
      var text = (activeTab.textContent || '').trim();
      if (text === 'Overview') showOverview(pageContent);
      else if (text === 'Machines') showMachines(pageContent);
      else if (text === 'Assets') showAssets(pageContent);
      else if (text === 'Spare Parts') showSpareParts(pageContent);
      else if (text === 'Job Cards') showJobCards(pageContent);
      else if (text === 'Print Labels') showPrintLabels(pageContent);
      else if (text === 'History') showHistory(pageContent);
    }
  };
})();
