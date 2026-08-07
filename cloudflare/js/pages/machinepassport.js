var MachinePassport = (function() {
  var PASSENGER_PAGE_SIZE = 15;
  var passportJobPage = 1, passportBDPage = 1;
  var _passFilteredJobs = null, _passFilteredBDs = null;
  var _stylesInjected = false;
  var _chartLoading = false;
  var _chartWaiters = [];
  var _chartReady = false;
  var _passportData = null;

  function esc(s) { return Utils.escapeHtml(s); }

  function container() { return document.getElementById('pageContent'); }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var style = document.createElement('style');
    style.id = 'passportStyles';
    style.textContent = [
      '.passport-skeleton{padding:4px;max-width:1400px;margin:0 auto}',
      '.passport-sk-topbar{height:48px;margin-bottom:12px}',
      '.passport-sk-header{height:160px;margin-bottom:14px}',
      '.passport-sk-grid{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}',
      '.passport-sk-stat{height:80px;flex:1;min-width:120px}',
      '.passport-sk-table{height:240px}',
      '.passport-top-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 0;margin-bottom:8px}',
      '.passport-top-title{font-size:14px;font-weight:600;color:var(--text-muted)}',
      '.passport-container{padding:4px;max-width:1400px;margin:0 auto}',
      '.passport-header-card{margin-bottom:14px}',
      '.passport-header{display:flex;gap:20px;align-items:flex-start}',
      '.passport-photo{width:130px;height:130px;flex-shrink:0;border-radius:var(--radius);overflow:hidden;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;border:2px dashed var(--border);cursor:pointer;position:relative;transition:var(--transition)}',
      '.passport-photo:hover{border-color:var(--primary);background:var(--primary-light)}',
      '.passport-photo svg{width:44px;height:44px;color:var(--text-muted)}',
      '.passport-photo-hint{position:absolute;bottom:6px;font-size:9px;color:var(--text-muted);white-space:nowrap}',
      '.passport-photo-img{width:100%;height:100%;object-fit:cover}',
      '.passport-photo-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;opacity:0;transition:var(--transition);color:#fff;font-size:11px;font-weight:500;gap:4px;flex-direction:column}',
      '.passport-photo:hover .passport-photo-overlay{opacity:1}',
      '.passport-info{flex:1;min-width:0}',
      '.passport-name{font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px}',
      '.passport-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
      '.passport-tag{background:var(--primary-light);color:var(--primary);padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500}',
      '.passport-badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600}',
      '.passport-details{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 16px}',
      '.passport-detail-item{display:flex;gap:6px;font-size:12px}',
      '.pdi-label{color:var(--text-muted);min-width:80px}',
      '.pdi-value{color:var(--text);font-weight:500}',
      '.passport-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0}',
      '.passport-actions .btn{white-space:nowrap}',
      '.passport-summary-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:14px}',
      '.passport-summary-cards .stat-card{margin:0;transition:var(--transition)}',
      '.passport-summary-cards .stat-card:hover{transform:translateY(-2px)}',
      '.passport-summary-cards .stat-card .stat-inner{padding:10px 8px;display:flex;align-items:center;gap:8px}',
      '.passport-summary-cards .stat-card .stat-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center}',
      '.passport-summary-cards .stat-card .stat-icon svg{width:20px;height:20px}',
      '.passport-summary-cards .stat-card .stat-info h3{font-size:16px;margin:0}',
      '.passport-summary-cards .stat-card .stat-info p{font-size:9px;margin:0}',
      '.passport-tabs{display:flex;gap:2px;border-bottom:2px solid var(--border);margin-bottom:12px;overflow-x:auto}',
      '.passport-tab{padding:10px 16px;background:none;border:none;color:var(--text-secondary);font-size:12px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:var(--transition);white-space:nowrap}',
      '.passport-tab:hover{color:var(--text)}',
      '.passport-tab.active{color:var(--primary);border-bottom-color:var(--primary)}',
      '.passport-overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}',
      '.passport-ov-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm)}',
      '.passport-ov-item:hover{border-color:var(--border-light);background:var(--bg-card-hover)}',
      '.passport-ov-badge{font-size:14px;font-weight:700}',
      '.passport-ov-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;text-align:center}',
      '.passport-info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 20px}',
      '.passport-info-item{display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border)}',
      '.pii-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px}',
      '.pii-value{font-size:13px;color:var(--text);font-weight:500}',
      '.passport-search-bar{position:relative;margin:0 0 10px 0}',
      '.passport-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted)}',
      '.passport-search-input{width:100%;padding:8px 12px 8px 34px;background:var(--bg-input);border:1px solid var(--border);color:var(--text);border-radius:var(--radius-sm);font-size:12px;box-sizing:border-box}',
      '.passport-search-input:focus{border-color:var(--primary);outline:none;box-shadow:0 0 0 2px var(--primary-light)}',
      '.passport-table-wrap{overflow-x:auto}',
      '.passport-table{width:100%;border-collapse:collapse;font-size:12px}',
      '.passport-table thead th{background:var(--bg-secondary);color:var(--text-muted);padding:9px 7px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border);white-space:nowrap;position:sticky;top:0;z-index:2}',
      '.passport-table tbody td{padding:7px;border-bottom:1px solid var(--border);color:var(--text-secondary);white-space:nowrap}',
      '.passport-table tbody tr:hover td{background:var(--bg-card-hover)}',
      '.passport-table tbody tr:nth-child(even) td{background:var(--bg-primary)}',
      '.passport-table tbody tr:nth-child(even):hover td{background:var(--bg-card-hover)}',
      '.passport-empty{text-align:center;padding:40px 16px;color:var(--text-muted);font-size:13px}',
      '.passport-link{color:var(--primary);text-decoration:none}',
      '.passport-link:hover{text-decoration:underline}',
      '.passport-count{font-size:12px;color:var(--text-muted);padding:2px 10px;background:var(--bg-secondary);border-radius:10px}',
      '.passport-pagination{display:flex;justify-content:center;align-items:center;gap:12px;padding:10px 0}',
      '.passport-pagination .pagination{display:flex;align-items:center;gap:8px}',
      '.passport-pagination .pagination-info{font-size:12px;color:var(--text-muted)}',
      '.passport-charts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}',
      '.passport-chart-wide{grid-column:1 / -1}',
      '.passport-chart-canvas{padding:4px;min-height:210px}',
      '.passport-timeline{padding:16px;position:relative}',
      '.passport-timeline::before{content:\'\';position:absolute;left:23px;top:0;bottom:0;width:2px;background:var(--border)}',
      '.timeline-item{position:relative;padding-left:52px;margin-bottom:16px}',
      '.timeline-dot{position:absolute;left:14px;top:2px;width:20px;height:20px;border-radius:50%;border:2px solid var(--border);background:var(--bg-card);z-index:1}',
      '.timeline-install{border-color:var(--primary);background:var(--primary-light)}',
      '.timeline-bd{border-color:var(--danger);background:var(--danger-bg)}',
      '.timeline-pm{border-color:var(--success);background:var(--success-bg)}',
      '.timeline-overhaul{border-color:var(--warning);background:var(--warning-bg)}',
      '.timeline-job{border-color:var(--info);background:var(--info-bg)}',
      '.timeline-repair-start{border-color:var(--warning);background:var(--warning-bg)}',
      '.timeline-repair-end{border-color:var(--success);background:var(--success-bg)}',
      '.timeline-job-end{border-color:var(--primary);background:var(--primary-light)}',
      '.timeline-spares{border-color:var(--purple);background:var(--purple-bg)}',
      '.timeline-content{background:var(--bg-secondary);border-radius:var(--radius-sm);padding:8px 12px;border:1px solid var(--border)}',
      '.timeline-date{font-size:11px;color:var(--text-muted);margin-bottom:2px}',
      '.timeline-title{font-size:12px;color:var(--text);font-weight:500}',
      '.timeline-meta{margin-top:3px}',
      '.passport-docs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}',
      '.passport-doc-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);text-decoration:none;transition:var(--transition)}',
      '.passport-doc-card:hover{border-color:var(--border-light);background:var(--bg-card-hover)}',
      '.passport-doc-empty{opacity:0.55}',
      '.pdc-icon svg{width:32px;height:32px;color:var(--primary)}',
      '.pdc-label{font-size:12px;font-weight:600;color:var(--text);text-align:center}',
      '.pdc-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}',
      '@media (max-width:768px){',
      '.passport-header{flex-direction:column;align-items:center;text-align:center}',
      '.passport-photo{width:100px;height:100px}',
      '.passport-details{grid-template-columns:1fr 1fr}',
      '.passport-actions{flex-direction:row;justify-content:center;margin-top:8px}',
      '.passport-summary-cards{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}',
      '.passport-tabs{gap:0}',
      '.passport-tab{padding:8px 10px;font-size:11px}',
      '.passport-overview-grid{grid-template-columns:repeat(3,1fr)}',
      '.passport-info-grid{grid-template-columns:1fr 1fr}',
      '.passport-charts-grid{grid-template-columns:1fr}',
      '}',
      '@media (max-width:480px){',
      '.passport-details{grid-template-columns:1fr}',
      '.passport-summary-cards{grid-template-columns:repeat(2,1fr)}',
      '.passport-overview-grid{grid-template-columns:repeat(2,1fr)}',
      '.passport-info-grid{grid-template-columns:1fr}',
      '.passport-top-title{display:none}',
      '}',
      '@media print{',
      '.sidebar,.topbar,.passport-tabs,.passport-search-bar,.passport-actions .btn:not(.btn-primary),.passport-skeleton,#passportPhotoInput,.passport-photo-hint,.passport-photo-overlay{display:none !important}',
      '.passport-container{display:block !important}',
      '.passport-header-card{border:1px solid var(--border);page-break-inside:avoid}',
      '.passport-chart-canvas{break-inside:avoid}',
      '.stat-card{break-inside:avoid;border:1px solid var(--border)}',
      '.passport-ov-item{break-inside:avoid}',
      'body{background:var(--bg-primary) !important;color:var(--text) !important}',
      '.passport-table tbody td{color:var(--text) !important}',
      '.passport-photo{border:1px solid var(--border-light)}',
      '.card{background:var(--bg-card) !important;border:1px solid var(--border) !important;box-shadow:none !important}',
      '.badge{border:1px solid var(--text-muted)}',
      '.timeline-content{background:var(--bg-secondary);border:1px solid var(--border)}',
      '.passport-doc-card{border:1px solid var(--border)}',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildPage() {
    return '<div class="page">' +
      '<div id="passportSkeleton" class="passport-skeleton" style="display:none">' +
        '<div class="skeleton skeleton-card passport-sk-topbar"></div>' +
        '<div class="skeleton skeleton-card passport-sk-header"></div>' +
        '<div class="passport-sk-grid"><div class="skeleton skeleton-card passport-sk-stat"></div><div class="skeleton skeleton-card passport-sk-stat"></div><div class="skeleton skeleton-card passport-sk-stat"></div><div class="skeleton skeleton-card passport-sk-stat"></div><div class="skeleton skeleton-card passport-sk-stat"></div><div class="skeleton skeleton-card passport-sk-stat"></div></div>' +
        '<div class="skeleton skeleton-table passport-sk-table"></div>' +
      '</div>' +
      '<div class="passport-container" id="passportContainer" style="display:none">' +
        '<div class="passport-top-bar">' +
          '<button class="btn btn-sm btn-secondary" onclick="MachinePassport.close()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:16px;height:16px"><path d="M12 8l-4 4"/><path d="M8 8l4 4"/><circle cx="10" cy="10" r="9"/></svg> Back</button>' +
          '<span class="passport-top-title">Machine Digital Passport</span>' +
          '<button class="btn btn-sm btn-primary" onclick="MachinePassport.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print Passport</button>' +
        '</div>' +
        '<div class="card passport-header-card">' +
          '<div class="passport-header" id="passportHeaderContent">' +
            '<div class="passport-photo" id="passportPhotoWrap" onclick="MachinePassport.photoClick()">' +
              '<div class="passport-photo-placeholder">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
                '<span class="passport-photo-hint">Click to upload</span>' +
              '</div>' +
            '</div>' +
            '<div class="passport-info" id="passportInfo"></div>' +
            '<div class="passport-actions">' +
              '<button class="btn btn-sm btn-primary" onclick="MachinePassport.editMachine()"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px;margin-right:4px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg> Edit</button>' +
              '<button class="btn btn-sm btn-info" onclick="MachinePassport.regenerateQR()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:4px"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg> QR</button>' +
              '<button class="btn btn-sm btn-success" onclick="MachinePassport.exportCSV()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:4px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> CSV</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="passport-summary-cards" id="passportSummaryCards"></div>' +
        '<div class="passport-tabs" id="passportTabs">' +
          '<button class="passport-tab active" onclick="MachinePassport.switchTab(\'overview\', this)">Overview</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'machineinfo\', this)">Machine Info</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'breakdown\', this)">Breakdown</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'pm\', this)">PM History</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'jobcards\', this)">Job Cards</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'spares\', this)">Spare Parts</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'documents\', this)">Documents</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'analytics\', this)">Analytics</button>' +
          '<button class="passport-tab" onclick="MachinePassport.switchTab(\'timeline\', this)">Timeline</button>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabOverview">' +
          '<div class="card"><div class="card-header"><div class="card-title">Maintenance Overview</div></div>' +
          '<div class="passport-overview-grid" id="passportOverviewGrid"></div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabMachineinfo" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Machine Information</div></div>' +
          '<div class="passport-info-grid" id="passportInfoGrid"></div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabBreakdown" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Breakdown History</div><div class="card-actions"><span class="passport-count" id="passportBDCount"></span></div></div>' +
          '<div class="passport-table-wrap">' +
          '<table class="passport-table" id="passportBDTable"><thead><tr><th>Date</th><th>Job Card</th><th>Complaint</th><th>Category</th><th>Type</th><th>Downtime</th><th>Technician</th><th>Status</th></tr></thead><tbody id="passportBDBody"></tbody></table>' +
          '</div>' +
          '<div class="passport-pagination" id="passportBDPagination"></div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabPm" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Preventive Maintenance History</div><div class="card-actions"><span class="passport-count" id="passportPMCount"></span></div></div>' +
          '<div class="passport-table-wrap">' +
          '<table class="passport-table" id="passportPMTable"><thead><tr><th>PM ID</th><th>Title</th><th>Frequency</th><th>Status</th><th>Last Done</th><th>Next Due</th><th>Assigned To</th></tr></thead><tbody id="passportPMBody"></tbody></table>' +
          '</div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabJobcards" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Job Card History</div><div class="card-actions"><span class="passport-count" id="passportJobCount"></span></div></div>' +
          '<div class="passport-search-bar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="passport-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" class="passport-search-input" id="passportSearch" placeholder="Search by Job Card, Complaint, Technician..." oninput="MachinePassport.filterTable()">' +
          '</div>' +
          '<div class="passport-table-wrap">' +
          '<table class="passport-table" id="passportJobTable"><thead><tr id="passportJobHead"></tr></thead><tbody id="passportJobBody"></tbody></table>' +
          '</div>' +
          '<div class="passport-pagination" id="passportJobPagination"></div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabSpares" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Spare Parts History</div><div class="card-actions"><span class="passport-count" id="passportSparesCount"></span></div></div>' +
          '<div class="passport-table-wrap">' +
          '<table class="passport-table" id="passportSparesTable"><thead><tr><th>Date</th><th>Job Card</th><th>Part Name</th><th>Qty</th><th>Cost</th><th>Technician</th></tr></thead><tbody id="passportSparesBody"></tbody></table>' +
          '</div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabDocuments" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Document Center</div></div>' +
          '<div class="passport-docs-grid" id="passportDocs"></div></div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabAnalytics" style="display:none">' +
          '<div class="passport-charts-grid">' +
          '<div class="card"><div class="card-header"><div class="card-title">Monthly Breakdown Trend</div></div><div class="passport-chart-canvas" id="passportChartBDTrend"></div></div>' +
          '<div class="card"><div class="card-header"><div class="card-title">Downtime Trend (hrs)</div></div><div class="passport-chart-canvas" id="passportChartDTrend"></div></div>' +
          '<div class="card"><div class="card-header"><div class="card-title">PM Compliance</div></div><div class="passport-chart-canvas" id="passportChartPMComp"></div></div>' +
          '<div class="card"><div class="card-header"><div class="card-title">Spare Parts Cost</div></div><div class="passport-chart-canvas" id="passportChartSpCost"></div></div>' +
          '<div class="card"><div class="card-header"><div class="card-title">MTBF Trend (hrs)</div></div><div class="passport-chart-canvas" id="passportChartMTBF"></div></div>' +
          '<div class="card"><div class="card-header"><div class="card-title">MTTR Trend (hrs)</div></div><div class="passport-chart-canvas" id="passportChartMTTR"></div></div>' +
          '<div class="card passport-chart-wide"><div class="card-header"><div class="card-title">Breakdown Category Distribution</div></div><div class="passport-chart-canvas" id="passportChartFCat"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="passport-tab-content" id="passportTabTimeline" style="display:none">' +
          '<div class="card"><div class="card-header"><div class="card-title">Machine Timeline</div></div>' +
          '<div class="passport-timeline" id="passportTimeline"></div></div>' +
        '</div>' +
        '<input type="file" id="passportPhotoInput" accept="image/*" style="display:none" onchange="MachinePassport.handlePhotoUpload(this)">' +
      '</div>' +
    '</div>';
  }

  function show(el) {
    injectStyles();
    var target = el || container();
    if (!target) return;
    passportJobPage = 1; passportBDPage = 1;
    _passFilteredJobs = null; _passFilteredBDs = null;
    _passportData = null;
    target.innerHTML = buildPage();
    showPassportSkeleton(true);

    var mid = sessionStorage.getItem('passportMachineId');
    if (!mid) { Notify.error('No machine selected'); showPassportSkeleton(false); return; }
    var prev = sessionStorage.getItem('passportPrevPage');
    if (!prev && typeof Nav !== 'undefined') { sessionStorage.setItem('passportPrevPage', Nav.currentPage || 'dashboard'); }

    loadPassportCharts();

    API.post('getMachinePassport', { machineId: mid }).then(function(data) {
      if (data && data.error) { Notify.error(data.error); showPassportSkeleton(false); return; }
      _passportData = data;
      renderPassportHeader(data.machine);
      renderPassportSummaryCards(data);
      renderPassportOverview(data);
      renderPassportInfoGrid(data.machine);
      renderPassportBDTable(data.jobCards);
      renderPassportPMTable(data.pmHistory);
      renderPassportJobTable(data.jobCards);
      renderPassportSparesTable(data.spareParts);
      renderPassportDocs(data.machine);
      drawPassportCharts(data.charts);
      renderPassportTimeline(data.timeline);
      showPassportSkeleton(false);
    }).catch(function(err) {
      Notify.error('Error loading passport: ' + (err.message || ''));
      showPassportSkeleton(false);
    });
  }

  function showPassportSkeleton(show) {
    var sk = document.getElementById('passportSkeleton');
    var ct = document.getElementById('passportContainer');
    if (sk) sk.style.display = show ? 'block' : 'none';
    if (ct) ct.style.display = show ? 'none' : 'block';
  }

  function loadPassportCharts() {
    _ensureCharts(function() { _chartReady = true; });
  }

  function _ensureCharts(cb) {
    if (typeof google !== 'undefined' && google.charts && google.visualization) {
      if (cb) cb();
      return;
    }
    _chartWaiters.push(cb);
    if (_chartLoading) return;
    _chartLoading = true;
    var existingScript = document.querySelector('script[src*="gstatic.com/charts/loader.js"]');
    function onReady() {
      _chartLoading = false;
      var ws = _chartWaiters; _chartWaiters = [];
      ws.forEach(function(f) { if (f) { try { f(); } catch(e) {} } });
    }
    function loadScript() {
      var script = document.createElement('script');
      script.src = 'https://www.gstatic.com/charts/loader.js';
      script.onload = function() {
        if (typeof google !== 'undefined' && google.charts) {
          google.charts.load('current', { packages: ['corechart'] });
          google.charts.setOnLoadCallback(onReady);
        } else { onReady(); }
      };
      script.onerror = function() { onReady(); };
      document.head.appendChild(script);
    }
    if (existingScript) {
      existingScript.addEventListener('load', function() {
        if (typeof google !== 'undefined' && google.charts) {
          google.charts.load('current', { packages: ['corechart'] });
          google.charts.setOnLoadCallback(onReady);
        } else { onReady(); }
      });
      setTimeout(function() {
        if (typeof google !== 'undefined' && google.charts) {
          google.charts.load('current', { packages: ['corechart'] });
          google.charts.setOnLoadCallback(onReady);
        } else { loadScript(); }
      }, 300);
    } else {
      loadScript();
    }
  }

  function renderPassportHeader(m) {
    var info = document.getElementById('passportInfo');
    if (!info || !m) return;
    info.innerHTML =
      '<div class="passport-name">' + esc(m.MachineName) + '</div>' +
      '<div class="passport-meta">' +
        '<span class="passport-tag">' + esc(m.MachineCode) + '</span>' +
        '<span class="passport-tag">' + esc(m.MachineNumber) + '</span>' +
        '<span class="passport-badge badge-' + (m.Status === 'Active' ? 'success' : 'warning') + '">' + esc(m.Status) + '</span>' +
        '<span class="passport-badge badge-' + (m.Criticality === 'Critical' ? 'danger' : m.Criticality === 'High' ? 'warning' : 'info') + '">' + esc(m.Criticality) + '</span>' +
      '</div>' +
      '<div class="passport-details">' +
        '<div class="passport-detail-item"><span class="pdi-label">Department</span><span class="pdi-value">' + esc(m.Department) + '</span></div>' +
        '<div class="passport-detail-item"><span class="pdi-label">Section</span><span class="pdi-value">' + esc(m.Section) + '</span></div>' +
        '<div class="passport-detail-item"><span class="pdi-label">Location</span><span class="pdi-value">' + esc(m.Location) + '</span></div>' +
        '<div class="passport-detail-item"><span class="pdi-label">Manufacturer</span><span class="pdi-value">' + esc(m.Manufacturer) + ' ' + esc(m.Model) + '</span></div>' +
        '<div class="passport-detail-item"><span class="pdi-label">Serial No</span><span class="pdi-value">' + esc(m.SerialNo) + '</span></div>' +
        '<div class="passport-detail-item"><span class="pdi-label">Type</span><span class="pdi-value">' + esc(m.MachineType) + '</span></div>' +
        '<div class="passport-detail-item"><span class="pdi-label">Install Date</span><span class="pdi-value">' + esc(m.InstallDate) + '</span></div>' +
      '</div>';
    if (m.MachinePhoto) {
      var wrap = document.getElementById('passportPhotoWrap');
      if (wrap) wrap.innerHTML = '<img src="' + esc(m.MachinePhoto) + '" class="passport-photo-img" alt="Machine Photo"><div class="passport-photo-overlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> Change</div>';
    }
  }

  function renderPassportSummaryCards(data) {
    var el = document.getElementById('passportSummaryCards');
    if (!el) return;
    var k = data.kpi || {};
    var m = data.machine || {};
    var cards = [
      { label: 'Status', value: m.Status, icon: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px"><circle cx="10" cy="10" r="5"/></svg>', cls: m.Status === 'Active' ? 'stat-success' : 'stat-warning' },
      { label: 'MTBF', value: k.mtbf !== null && k.mtbf !== undefined ? k.mtbf + 'h' : 'N/A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', cls: 'stat-primary' },
      { label: 'MTTR', value: k.mttr !== null && k.mttr !== undefined ? k.mttr + 'h' : 'N/A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 8 10"/></svg>', cls: 'stat-warning' },
      { label: 'Availability', value: k.availability !== null && k.availability !== undefined ? k.availability + '%' : 'N/A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>', cls: (k.availability || 0) >= 95 ? 'stat-success' : 'stat-danger' },
      { label: 'Operating Hrs', value: data.totalOperatingHours != null ? Number(data.totalOperatingHours).toLocaleString() : 'N/A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', cls: 'stat-info' },
      { label: 'Running Hrs', value: data.runningHours != null ? Number(data.runningHours).toLocaleString() : 'N/A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', cls: 'stat-running' },
      { label: 'Breakdowns', value: k.breakdownJobs, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', cls: 'stat-danger' },
      { label: 'PMs', value: k.preventiveJobs, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>', cls: 'stat-success' },
      { label: 'Total Downtime', value: data.totalDowntimeHours != null ? data.totalDowntimeHours + 'h' : 'N/A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', cls: 'stat-warning' },
      { label: 'Last Breakdown', value: k.lastBreakdownDate ? formatDisplayDate(k.lastBreakdownDate) : 'None', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', cls: k.lastBreakdownDate ? 'stat-warning' : 'stat-success' },
      { label: 'Next PM Due', value: data.nextPMDue ? formatDisplayDate(data.nextPMDue) : 'None', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', cls: data.nextPMDue ? 'stat-info' : 'stat-closed' }
    ];
    el.innerHTML = cards.map(function(c) {
      return '<div class="stat-card ' + c.cls + '"><div class="stat-inner"><div class="stat-icon">' + c.icon + '</div><div class="stat-info"><h3>' + c.value + '</h3><p>' + c.label + '</p></div></div></div>';
    }).join('');
  }

  function renderPassportOverview(data) {
    var el = document.getElementById('passportOverviewGrid');
    if (!el) return;
    var k = data.kpi || {};
    var totalCost = data.totalPartsCost || 0;
    var items = [
      { label: 'Total Job Cards', value: k.totalJobs, icon: '&#128203;', cls: 'badge-primary' },
      { label: 'Open Jobs', value: k.openJobs, icon: '&#128204;', cls: 'badge-warning' },
      { label: 'Closed Jobs', value: k.closedJobs, icon: '&#9989;', cls: 'badge-success' },
      { label: 'Pending Approval', value: k.pendingApproval, icon: '&#9200;', cls: 'badge-purple' },
      { label: 'Breakdowns', value: k.breakdownJobs, icon: '&#9888;', cls: 'badge-danger' },
      { label: 'PMs Completed', value: k.preventiveJobs, icon: '&#128736;', cls: 'badge-success' },
      { label: 'Electrical Issues', value: k.electricalJobs, icon: '&#9889;', cls: 'badge-info' },
      { label: 'Mechanical Issues', value: k.mechanicalJobs, icon: '&#9881;', cls: 'badge-warning' },
      { label: 'Total Downtime', value: data.totalDowntimeHours != null ? data.totalDowntimeHours + 'h' : 'N/A', icon: '&#9201;', cls: 'badge-warning' },
      { label: 'MTTR', value: k.mttr !== null && k.mttr !== undefined ? k.mttr + 'h' : 'N/A', icon: '&#128337;', cls: 'badge-info' },
      { label: 'MTBF', value: k.mtbf !== null && k.mtbf !== undefined ? k.mtbf + 'h' : 'N/A', icon: '&#9202;', cls: 'badge-primary' },
      { label: 'Availability', value: k.availability !== null && k.availability !== undefined ? k.availability + '%' : 'N/A', icon: '&#11088;', cls: (k.availability || 0) >= 95 ? 'badge-success' : 'badge-danger' },
      { label: 'Runtime Hours', value: data.totalOperatingHours != null ? Number(data.totalOperatingHours).toLocaleString() : 'N/A', icon: '&#9203;', cls: 'badge-running' },
      { label: 'Spare Parts Cost', value: totalCost > 0 ? '$' + Number(totalCost).toLocaleString() : 'N/A', icon: '&#128176;', cls: 'badge-purple' },
      { label: 'Last Breakdown', value: k.lastBreakdownDate ? formatDisplayDate(k.lastBreakdownDate) : 'None', icon: '&#128197;', cls: 'badge-warning' },
      { label: 'Last PM', value: k.lastPMDate ? formatDisplayDate(k.lastPMDate) : 'None', icon: '&#128197;', cls: 'badge-info' }
    ];
    el.innerHTML = items.map(function(i) {
      return '<div class="passport-ov-item"><span class="badge ' + i.cls + ' passport-ov-badge">' + i.value + '</span><span class="passport-ov-label">' + i.label + '</span></div>';
    }).join('');
  }

  function renderPassportInfoGrid(m) {
    var el = document.getElementById('passportInfoGrid');
    if (!el) return;
    var fields = [
      { label: 'Machine ID', value: m.MachineID },
      { label: 'Machine Name', value: m.MachineName },
      { label: 'Machine Code', value: m.MachineCode },
      { label: 'Machine Number', value: m.MachineNumber },
      { label: 'Department', value: m.Department },
      { label: 'Section', value: m.Section },
      { label: 'Division', value: m.Division },
      { label: 'Location', value: m.Location },
      { label: 'Machine Type', value: m.MachineType },
      { label: 'Manufacturer', value: m.Manufacturer },
      { label: 'Model', value: m.Model },
      { label: 'Serial No', value: m.SerialNo },
      { label: 'Capacity', value: m.Capacity },
      { label: 'Power Rating', value: m.PowerRating },
      { label: 'Criticality', value: m.Criticality },
      { label: 'Status', value: m.Status },
      { label: 'Install Date', value: m.InstallDate },
      { label: 'Warranty Expiry', value: m.WarrantyExpiry },
      { label: 'Operating Hrs/Day', value: m.OperatingHoursPerDay },
      { label: 'Operating Days/Week', value: m.OperatingDaysPerWeek }
    ];
    el.innerHTML = fields.map(function(f) {
      return '<div class="passport-info-item"><span class="pii-label">' + f.label + '</span><span class="pii-value">' + esc(f.value || '-') + '</span></div>';
    }).join('');
  }

  function renderPassportBDTable(jobs) {
    _passFilteredBDs = (jobs || []).filter(function(j) {
      var mt = (j.BreakdownType || '').toLowerCase();
      return mt === 'breakdown' || mt === 'electrical' || mt === 'mechanical' || mt === 'emergency' || mt === 'corrective';
    });
    var total = _passFilteredBDs.length;
    var countEl = document.getElementById('passportBDCount');
    if (countEl) countEl.textContent = total + ' records';
    var pages = Math.max(1, Math.ceil(total / PASSENGER_PAGE_SIZE));
    if (passportBDPage > pages) passportBDPage = pages;
    var start = (passportBDPage - 1) * PASSENGER_PAGE_SIZE;
    var end = Math.min(start + PASSENGER_PAGE_SIZE, total);
    var pageData = _passFilteredBDs.slice(start, end);
    var body = document.getElementById('passportBDBody');
    if (total === 0) {
      body.innerHTML = '<tr><td colspan="8" class="passport-empty">No breakdowns recorded</td></tr>';
      document.getElementById('passportBDPagination').innerHTML = '';
      return;
    }
    body.innerHTML = pageData.map(function(j) {
      return '<tr>' +
        '<td class="passport-date">' + formatDisplayDate(j.OpenDate) + '</td>' +
        '<td><a href="#" onclick="event.preventDefault(); MachinePassport.viewJobCard(\'' + esc(j.JobCardNo) + '\')" class="passport-link">' + esc(j.JobCardNo) + '</a></td>' +
        '<td>' + esc(j.Complaint) + '</td>' +
        '<td>' + esc(j.ComplaintCategory) + '</td>' +
        '<td><span class="badge badge-' + getBadgeClass(j.BreakdownType) + '">' + esc(j.BreakdownType) + '</span></td>' +
        '<td>' + displayDuration(j.Downtime) + '</td>' +
        '<td>' + esc(j.Technician) + '</td>' +
        '<td><span class="badge badge-' + getStatusClass(j.CurrentStatus) + '">' + esc(j.CurrentStatus) + '</span></td>' +
      '</tr>';
    }).join('');
    renderPagination('passportBDPagination', passportBDPage, pages, 'renderPassportBDTable');
  }

  function renderPassportPMTable(pms) {
    var body = document.getElementById('passportPMBody');
    if (!pms || pms.length === 0) {
      body.innerHTML = '<tr><td colspan="7" class="passport-empty">No preventive maintenance records for this machine</td></tr>';
      return;
    }
    var countEl = document.getElementById('passportPMCount');
    if (countEl) countEl.textContent = pms.length + ' records';
    body.innerHTML = pms.map(function(p) {
      var statusCls = (p.status || '').toLowerCase() === 'completed' || (p.status || '').toLowerCase() === 'done' ? 'badge-success' : 'badge-warning';
      return '<tr>' +
        '<td>' + esc(p.pmID) + '</td>' +
        '<td>' + esc(p.title) + '</td>' +
        '<td>' + esc(p.frequency) + '</td>' +
        '<td><span class="badge ' + statusCls + '">' + esc(p.status) + '</span></td>' +
        '<td class="passport-date">' + formatDisplayDate(p.lastDone) + '</td>' +
        '<td class="passport-date">' + formatDisplayDate(p.nextDue) + '</td>' +
        '<td>' + esc(p.assignedTo) + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderPassportJobTable(jobs) {
    _passFilteredJobs = jobs;
    var body = document.getElementById('passportJobBody');
    var head = document.getElementById('passportJobHead');
    var countEl = document.getElementById('passportJobCount');
    if (!jobs || jobs.length === 0) {
      body.innerHTML = '<tr><td colspan="14" class="passport-empty">No job cards found for this machine</td></tr>';
      if (head) head.innerHTML = '<th>Job Card No</th><th>Open Date</th><th>Close Date</th><th>Complaint</th>';
      document.getElementById('passportJobPagination').innerHTML = '';
      return;
    }
    if (countEl) countEl.textContent = jobs.length + ' records';
    var pages = Math.max(1, Math.ceil(jobs.length / PASSENGER_PAGE_SIZE));
    if (passportJobPage > pages) passportJobPage = pages;
    var start = (passportJobPage - 1) * PASSENGER_PAGE_SIZE;
    var end = Math.min(start + PASSENGER_PAGE_SIZE, jobs.length);
    var pageData = jobs.slice(start, end);
    var cols = ['JobCardNo','OpenDate','CloseDate','Complaint','ComplaintCategory','BreakdownType','Priority','Technician','WaitingTime','WorkingTime','Downtime','RootCause','CorrectiveAction','ApprovalStatus','CurrentStatus'];
    var labels = ['Job Card No','Open Date','Close Date','Complaint','Category','Type','Priority','Technician','Waiting','Working','Downtime','Root Cause','Action','Approval','Status'];
    if (head) head.innerHTML = '<th>' + labels.join('</th><th>') + '</th><th>Actions</th>';
    body.innerHTML = pageData.map(function(j) {
      return '<tr>' +
        '<td><a href="#" onclick="event.preventDefault(); MachinePassport.viewJobCard(\'' + esc(j.JobCardNo) + '\')" class="passport-link">' + esc(j.JobCardNo) + '</a></td>' +
        '<td class="passport-date">' + formatDisplayDate(j.OpenDate) + '</td>' +
        '<td class="passport-date">' + formatDisplayDate(j.CloseDate) + '</td>' +
        '<td>' + esc(j.Complaint) + '</td>' +
        '<td>' + esc(j.ComplaintCategory) + '</td>' +
        '<td><span class="badge badge-' + getBadgeClass(j.BreakdownType) + '">' + esc(j.BreakdownType || 'N/A') + '</span></td>' +
        '<td><span class="badge badge-' + getPriorityClass(j.Priority) + '">' + esc(j.Priority || 'N/A') + '</span></td>' +
        '<td>' + esc(j.Technician) + '</td>' +
        '<td>' + displayDuration(j.WaitingTime) + '</td>' +
        '<td>' + displayDuration(j.WorkingTime) + '</td>' +
        '<td>' + displayDuration(j.Downtime) + '</td>' +
        '<td title="' + esc(j.RootCause) + '">' + truncate(esc(j.RootCause), 30) + '</td>' +
        '<td title="' + esc(j.CorrectiveAction) + '">' + truncate(esc(j.CorrectiveAction), 30) + '</td>' +
        '<td><span class="badge badge-' + getApprovalClass(j.ApprovalStatus) + '">' + esc(j.ApprovalStatus) + '</span></td>' +
        '<td><span class="badge badge-' + getStatusClass(j.CurrentStatus) + '">' + esc(j.CurrentStatus) + '</span></td>' +
        '<td><button class="btn btn-xs btn-primary" onclick="MachinePassport.viewJobCard(\'' + esc(j.JobCardNo) + '\')">View</button></td>' +
      '</tr>';
    }).join('');
    renderPagination('passportJobPagination', passportJobPage, pages, 'renderPassportJobTable');
  }

  function pageNav(dir, fnName, totalPages) {
    var np;
    if (fnName === 'renderPassportJobTable') { np = passportJobPage + dir; if (np < 1 || np > totalPages) return; passportJobPage = np; renderPassportJobTable(_passFilteredJobs); }
    else if (fnName === 'renderPassportBDTable') { np = passportBDPage + dir; if (np < 1 || np > totalPages) return; passportBDPage = np; renderPassportBDTable(_passFilteredBDs); }
  }

  function renderPagination(containerId, current, total, fnName) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (total <= 1) { el.innerHTML = ''; return; }
    var html = '<div class="pagination">';
    html += '<button class="btn btn-xs btn-secondary" ' + (current <= 1 ? 'disabled' : '') + ' onclick="MachinePassport.pageNav(-1,\'' + fnName + '\',' + total + ')">Prev</button>';
    html += '<span class="pagination-info">' + current + ' / ' + total + '</span>';
    html += '<button class="btn btn-xs btn-secondary" ' + (current >= total ? 'disabled' : '') + ' onclick="MachinePassport.pageNav(1,\'' + fnName + '\',' + total + ')">Next</button>';
    html += '</div>';
    el.innerHTML = html;
  }

  function renderPassportSparesTable(spares) {
    var body = document.getElementById('passportSparesBody');
    var countEl = document.getElementById('passportSparesCount');
    if (!spares || spares.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="passport-empty">No spare parts used on this machine</td></tr>';
      return;
    }
    if (countEl) countEl.textContent = spares.length + ' records';
    body.innerHTML = spares.map(function(s) {
      return '<tr><td class="passport-date">' + formatDisplayDate(s.date) + '</td><td>' + esc(s.jobCardNo) + '</td><td>' + esc(s.partName) + '</td><td>' + s.quantity + '</td><td>' + (s.cost ? '$' + Number(s.cost).toFixed(2) : '-') + '</td><td>' + esc(s.technician) + '</td></tr>';
    }).join('');
  }

  function renderPassportDocs(m) {
    var el = document.getElementById('passportDocs');
    if (!el) return;
    var docFields = [
      { key: 'MachineManual', label: 'Machine Manual', icon: 'manual' },
      { key: 'ElectricalDrawing', label: 'Electrical Drawing', icon: 'electrical' },
      { key: 'MechanicalDrawing', label: 'Mechanical Drawing', icon: 'mechanical' },
      { key: 'SOP', label: 'SOP', icon: 'sop' },
      { key: 'SafetyInstructions', label: 'Safety Instructions', icon: 'safety' },
      { key: 'WarrantyDocuments', label: 'Warranty Documents', icon: 'warranty' }
    ];
    var html = '<div class="passport-docs-grid">';
    docFields.forEach(function(df) {
      var url = m[df.key] || '';
      html += '<div class="passport-doc-card' + (!url ? ' passport-doc-empty' : '') + '">';
      html += '<div class="pdc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
      html += '<div class="pdc-label">' + df.label + '</div>';
      html += '<div class="pdc-actions">';
      if (url) {
        html += '<button class="btn btn-xs btn-primary" onclick="window.open(\'' + esc(url) + '\',\'_blank\')">View</button>';
        html += '<button class="btn btn-xs btn-info" onclick="window.open(\'' + esc(url) + '\',\'_blank\')">Download</button>';
      }
      html += '<button class="btn btn-xs btn-secondary" onclick="MachinePassport.replaceDoc(\'' + df.key + '\')">' + (url ? 'Replace' : 'Upload') + '</button>';
      html += '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function replaceDoc(fieldKey) {
    var mid = sessionStorage.getItem('passportMachineId');
    if (!mid) { Notify.error('No machine selected'); return; }
    var url = prompt('Enter document URL for ' + fieldKey + ':');
    if (!url || url.trim() === '') return;
    API.post('updateMachineDocument', { machineId: mid, fieldKey: fieldKey, url: url.trim() }).then(function(res) {
      if (res && res.success !== false) { Notify.success('Document updated'); show(null); }
      else Notify.error('Failed to update document');
    }).catch(function(err) {
      Notify.error('Error: ' + (err.message || ''));
    });
  }

  function photoClick() {
    var input = document.getElementById('passportPhotoInput');
    if (input) input.click();
  }

  function handlePhotoUpload(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var mid = sessionStorage.getItem('passportMachineId');
      if (!mid) { Notify.error('No machine selected'); return; }
      API.post('updateMachineDocument', { machineId: mid, fieldKey: 'MachinePhoto', url: dataUrl }).then(function(res) {
        if (res && res.success !== false) { Notify.success('Photo updated'); show(null); }
        else Notify.error('Failed to save photo');
      }).catch(function(err) {
        Notify.error('Error: ' + (err.message || ''));
      });
    };
    reader.readAsDataURL(file);
  }

  function close() {
    var prev = sessionStorage.getItem('passportPrevPage') || 'dashboard';
    navigateTo(prev);
  }

  function editMachine() {
    var mid = sessionStorage.getItem('passportMachineId');
    if (!mid) { Notify.error('No machine selected'); return; }
    navigateTo('machines');
    setTimeout(function() {
      if (typeof Machine !== 'undefined' && Machine.openEdit) Machine.openEdit(mid);
    }, 400);
  }

  function regenerateQR() {
    var mid = sessionStorage.getItem('passportMachineId');
    if (!mid) { Notify.error('No machine selected'); return; }
    sessionStorage.setItem('qrMachineId', mid);
    navigateTo('qrprint');
  }

  function drawPassportCharts(charts) {
    if (!charts || !_chartReady) return;
    var chartMap = {
      passportChartBDTrend: { data: charts.breakdownTrend, title: 'Breakdowns per Month', type: 'line', color: cssVar('--danger') || '#ef4444' },
      passportChartDTrend: { data: charts.downtimeTrend, title: 'Downtime (hrs)', type: 'line', color: cssVar('--warning') || '#f59e0b' },
      passportChartPMComp: { data: charts.pmCompliance, title: 'PM Compliance', type: 'pie' },
      passportChartSpCost: { data: charts.sparesCostTrend, title: 'Spare Parts Cost ($)', type: 'bar', color: cssVar('--success') || '#22c55e' },
      passportChartMTBF: { data: charts.mtbfTrend, title: 'MTBF (hrs)', type: 'line', color: cssVar('--primary') || '#6366f1' },
      passportChartMTTR: { data: charts.mttrTrend, title: 'MTTR (hrs)', type: 'line', color: cssVar('--purple') || '#a855f7' },
      passportChartFCat: { data: charts.failureCategory, title: 'Breakdown Categories', type: 'pie' }
    };
    var theme = getPassportThemeColors();
    Object.keys(chartMap).forEach(function(id) {
      var info = chartMap[id];
      var el = document.getElementById(id);
      if (!el || !info.data || info.data.length === 0) return;
      try {
        var dt = new google.visualization.DataTable();
        if (info.type === 'pie') {
          dt.addColumn('string', 'Category');
          dt.addColumn('number', 'Count');
          dt.addRows(info.data.map(function(d) { return [d.label, d.value]; }));
        } else {
          dt.addColumn('string', 'X');
          dt.addColumn('number', info.title);
          if (info.type === 'bar') {
            dt.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });
            dt.addRows(info.data.map(function(d) { return [d.label, d.value, d.label + ': $' + d.value]; }));
          } else {
            dt.addRows(info.data.map(function(d) { return [d.label, d.value]; }));
          }
        }
        var ChartClass = info.type === 'pie' ? google.visualization.PieChart : info.type === 'bar' ? google.visualization.ColumnChart : google.visualization.LineChart;
        var chart = new ChartClass(el);
        var opts = {
          width: '100%', height: 240, backgroundColor: theme.bg,
          legend: info.type === 'pie' ? { textStyle: { color: theme.label }, position: 'right' } : { position: 'none' },
          hAxis: info.type === 'pie' ? null : { textStyle: { color: theme.label, fontSize: 10 }, slantedText: true, slantedTextAngle: 45, gridlines: { color: theme.grid } },
          vAxis: info.type === 'pie' ? null : { textStyle: { color: theme.label }, gridlines: { color: theme.grid }, format: info.type === 'bar' ? '$#' : '' },
          chartArea: { width: '85%', height: '72%' },
          colors: info.type === 'pie' ? theme.palette : [info.color || theme.primary],
          pointSize: 4, lineWidth: 2, isStacked: false,
          titleTextStyle: { color: theme.title },
          tooltip: { isHtml: info.type === 'bar' }
        };
        chart.draw(dt, opts);
      } catch(e) { el.innerHTML = '<div class="passport-empty">Chart error</div>'; }
    });
  }

  function renderPassportTimeline(events) {
    var el = document.getElementById('passportTimeline');
    if (!el) return;
    if (!events || events.length === 0) {
      el.innerHTML = '<div class="passport-empty">No timeline events</div>';
      return;
    }
    el.innerHTML = events.map(function(e) {
      var iconCls = e.type === 'Installation' ? 'timeline-install' :
                    e.type === 'Breakdown' ? 'timeline-bd' :
                    e.type === 'Preventive Maintenance' ? 'timeline-pm' :
                    e.type === 'Repair Started' ? 'timeline-repair-start' :
                    e.type === 'Repair Completed' ? 'timeline-repair-end' :
                    e.type === 'Job Completed' ? 'timeline-job-end' :
                    e.type === 'Spare Parts Changed' ? 'timeline-spares' :
                    e.type === 'Overhaul' ? 'timeline-overhaul' : 'timeline-job';
      var statusCls = e.status ? ((e.status).toLowerCase() === 'closed' || (e.status).toLowerCase() === 'completed' ? 'badge-success' : 'badge-warning') : '';
      return '<div class="timeline-item"><div class="timeline-dot ' + iconCls + '"></div><div class="timeline-content"><div class="timeline-date">' + formatDisplayDate(e.date) + '</div><div class="timeline-title">' + esc(e.title) + '</div><div class="timeline-meta"><span class="badge badge-sm ' + statusCls + '">' + esc(e.status || e.type) + '</span></div></div></div>';
    }).join('');
  }

  function filterTable() {
    if (!_passportData) return;
    passportJobPage = 1;
    var input = document.getElementById('passportSearch');
    var q = input ? input.value.toLowerCase() : '';
    var jobs = _passportData.jobCards || [];
    _passFilteredJobs = q ? jobs.filter(function(j) {
      return (j.JobCardNo || '').toLowerCase().indexOf(q) !== -1 ||
             (j.Complaint || '').toLowerCase().indexOf(q) !== -1 ||
             (j.Technician || '').toLowerCase().indexOf(q) !== -1 ||
             (j.BreakdownType || '').toLowerCase().indexOf(q) !== -1 ||
             (j.OpenDate || '').toLowerCase().indexOf(q) !== -1;
    }) : jobs;
    renderPassportJobTable(_passFilteredJobs);
  }

  function viewJobCard(jobNo) {
    sessionStorage.setItem('passportSearchJob', jobNo);
    navigateTo('jobcards');
  }

  function switchTab(tab, btn) {
    var tabs = document.querySelectorAll('.passport-tab');
    var contents = document.querySelectorAll('.passport-tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    for (var j = 0; j < contents.length; j++) contents[j].style.display = 'none';
    if (btn) btn.classList.add('active');
    var tabId = 'passportTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    var el = document.getElementById(tabId);
    if (el) el.style.display = 'block';
    if (tab === 'analytics' && _passportData && _passportData.charts) {
      if (_chartReady) drawPassportCharts(_passportData.charts);
      else loadPassportCharts();
    }
  }

  function exportCSV() {
    if (!_passportData || !_passportData.jobCards || _passportData.jobCards.length === 0) { Notify.warning('No data to export'); return; }
    var csv = '\uFEFF"Machine","' + esc(_passportData.machine.MachineName) + '"\n\n';
    csv += '"JobCardNo","OpenDate","CloseDate","Complaint","Category","Type","Priority","Technician","WaitingTime","WorkingTime","Downtime","RootCause","Action","ApprovalStatus","CurrentStatus"\n';
    _passportData.jobCards.forEach(function(j) {
      csv += ['"' + esc(j.JobCardNo) + '"','"' + j.OpenDate + '"','"' + j.CloseDate + '"','"' + esc(j.Complaint) + '"','"' + esc(j.ComplaintCategory) + '"','"' + esc(j.BreakdownType) + '"','"' + esc(j.Priority) + '"','"' + esc(j.Technician) + '"','"' + displayDuration(j.WaitingTime) + '"','"' + displayDuration(j.WorkingTime) + '"','"' + displayDuration(j.Downtime) + '"','"' + esc(j.RootCause) + '"','"' + esc(j.CorrectiveAction) + '"','"' + esc(j.ApprovalStatus) + '"','"' + esc(j.CurrentStatus) + '"\n'].join(',');
    });
    downloadBlob(csv, 'text/csv;charset=utf-8', 'passport_' + _passportData.machine.MachineCode + '.csv');
  }

  function downloadBlob(content, mime, filename) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function print() {
    var printContents = document.getElementById('passportContainer').cloneNode(true);
    printContents.querySelectorAll('.passport-tabs, .passport-tab-content:not(#passportTabOverview), .passport-search-bar, .passport-actions .btn').forEach(function(el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
    var printWin = window.open('', '_blank', 'width=900,height=700');
    var html = '<!DOCTYPE html><html><head><title>Machine Passport - ' + esc(_passportData.machine.MachineName) + '</title>';
    html += '<style>body{font-family:Arial,sans-serif;padding:30px;color:#000;background:#fff}';
    html += '.passport-top-bar,.passport-tabs,.passport-actions .btn{display:none!important}';
    html += '.passport-header-card{border:1px solid #ddd;padding:20px;margin-bottom:20px;border-radius:8px}';
    html += '.passport-name{font-size:24px;font-weight:700}';
    html += '.stat-card{display:inline-block;width:23%;margin:4px;padding:10px;border:1px solid #ddd;border-radius:6px;text-align:center;font-size:12px;vertical-align:top}';
    html += '.stat-card h3{font-size:18px;margin:4px 0}';
    html += '.stat-card p{font-size:10px;color:#666;margin:0}';
    html += '.stat-icon{display:none}';
    html += '.passport-overview-grid{display:flex;flex-wrap:wrap;gap:8px}';
    html += '.passport-ov-item{width:22%;padding:8px;border:1px solid #eee;border-radius:4px;font-size:11px}';
    html += '.passport-ov-badge{font-size:14px;font-weight:700}';
    html += '.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px}';
    html += '.badge-primary{background:#6366f1;color:#fff}';
    html += '.badge-success{background:#22c55e;color:#fff}';
    html += '.badge-warning{background:#f59e0b;color:#fff}';
    html += '.badge-danger{background:#ef4444;color:#fff}';
    html += '.badge-info{background:#06b6d4;color:#fff}';
    html += '.badge-purple{background:#a855f7;color:#fff}';
    html += '.card-title{font-size:16px;font-weight:600;margin-bottom:10px;border-bottom:2px solid #333;padding-bottom:6px}';
    html += '.passport-summary-cards{margin-bottom:20px}';
    html += '@media print{body{padding:20px}.stat-card{break-inside:avoid}.passport-ov-item{break-inside:avoid}}';
    html += '</style></head><body>';
    html += '<div style="text-align:center;margin-bottom:20px"><h1>Machine Passport</h1><p style="color:#666">' + esc(_passportData.machine.MachineName) + ' | ' + esc(_passportData.machine.MachineCode) + '</p></div>';
    html += printContents.innerHTML;
    html += '<div style="margin-top:30px;padding-top:10px;border-top:1px solid #ccc;font-size:11px;color:#999;text-align:center">Generated by PWI CMMS | ' + new Date().toLocaleString() + '</div>';
    html += '</body></html>';
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(function() { printWin.print(); }, 1500);
  }

  function formatDisplayDate(d) {
    if (!d) return '-';
    return Utils.formatDate(d);
  }

  function displayDuration(minutes) {
    if (minutes === null || minutes === undefined || minutes === '' || minutes === 0) return '-';
    return Duration.formatHours(minutes);
  }

  function getBadgeClass(t) {
    var m = (t || '').toLowerCase();
    if (m === 'breakdown' || m === 'emergency') return 'danger';
    if (m === 'preventive' || m === 'routine') return 'success';
    if (m === 'electrical') return 'info';
    if (m === 'mechanical' || m === 'corrective') return 'warning';
    return 'secondary';
  }

  function getPriorityClass(p) {
    var m = (p || '').toLowerCase();
    if (m === 'critical') return 'danger';
    if (m === 'high') return 'warning';
    if (m === 'medium') return 'info';
    if (m === 'low') return 'success';
    return 'secondary';
  }

  function getStatusClass(s) {
    var m = (s || '').toLowerCase();
    if (m === 'closed' || m === 'completed') return 'success';
    if (m === 'open') return 'warning';
    if (m === 'running' || m === 'in progress') return 'info';
    if (m === 'pending' || m === 'pending approval') return 'purple';
    if (m === 'approved') return 'success';
    if (m === 'rejected' || m === 'cancelled') return 'danger';
    return 'secondary';
  }

  function getApprovalClass(s) {
    var m = (s || '').toLowerCase();
    if (m === 'approved') return 'success';
    if (m === 'pending' || m === 'pending approval') return 'warning';
    if (m === 'rejected') return 'danger';
    return 'secondary';
  }

  function cssVar(name) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch(e) { return ''; }
  }

  function getPassportThemeColors() {
    var isLight = (document.documentElement.getAttribute('data-theme') || 'dark') === 'light';
    var primary = cssVar('--primary') || '#6366f1';
    return {
      bg: isLight ? '#ffffff' : '#151829',
      label: isLight ? '#52566e' : '#9498b8',
      title: isLight ? '#1a1c2e' : '#eef0f6',
      grid: isLight ? '#e8ecf1' : '#1e2140',
      primary: primary,
      palette: [cssVar('--primary') || '#6366f1', cssVar('--success') || '#22c55e', cssVar('--warning') || '#f59e0b', cssVar('--danger') || '#ef4444', cssVar('--info') || '#06b6d4', cssVar('--purple') || '#a855f7', cssVar('--orange') || '#f97316']
    };
  }

  function truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : (s || ''); }

  return {
    show: function(el) { show(el); },
    close: close,
    print: print,
    editMachine: editMachine,
    regenerateQR: regenerateQR,
    exportCSV: exportCSV,
    photoClick: photoClick,
    handlePhotoUpload: handlePhotoUpload,
    replaceDoc: replaceDoc,
    viewJobCard: viewJobCard,
    filterTable: filterTable,
    switchTab: switchTab,
    pageNav: pageNav
  };
})();
