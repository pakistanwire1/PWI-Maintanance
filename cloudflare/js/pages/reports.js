var Reports = (function() {
  var rptData = null;
  var rptChartsLoaded = false;
  var stylesInjected = false;
  var rptMaster = null;
  var rptRefreshTimer = null;
  var rptCascadeSeq = 0;
  var rptGenSeq = 0;

  var SVG_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;margin-right:8px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  var SVG_ZAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  var SVG_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>';
  var SVG_DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var SVG_XLS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>';
  var SVG_CSV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  var SVG_PRINT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
  var SVG_CHART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;margin-right:8px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var style = document.createElement('style');
    style.textContent =
      '.rpt-filter-panel { padding: 16px; }' +
      '.rpt-filter-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }' +
      '.rpt-filter-row:last-of-type { margin-bottom: 0; }' +
      '.rpt-filter-group { flex: 1; min-width: 140px; }' +
      '.rpt-filter-group label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }' +
      '.rpt-filter-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }' +
      '.rpt-kpi-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }' +
      '.rpt-kpi-row .stat-card { flex: 1; min-width: 120px; margin: 0; }' +
      '.rpt-kpi-row .stat-card .stat-inner { padding: 12px 14px; }' +
      '.rpt-kpi-row .stat-card .stat-inner h3 { font-size: 18px; }' +
      '.rpt-kpi-row .stat-card .stat-inner p { font-size: 10px; }' +
      '.rpt-kpi-icon { width: 28px; height: 28px; }' +
      '.rpt-table-wrapper { overflow-x: auto; padding: 0 4px 4px 4px; }' +
      '.rpt-table { width: 100%; border-collapse: collapse; font-size: 12px; }' +
      '.rpt-table thead th { background: var(--bg-secondary); color: var(--text-muted); padding: 10px 8px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border-bottom: 2px solid var(--border); position: sticky; top: 0; white-space: nowrap; }' +
      '.rpt-table tbody td { padding: 8px; border-bottom: 1px solid var(--border); color: var(--text-secondary); white-space: nowrap; }' +
      '.rpt-table tbody tr:hover td { background: var(--bg-card-hover); }' +
      '.rpt-table tbody tr:nth-child(even) td { background: var(--bg-primary); }' +
      '.rpt-table tbody tr:nth-child(even):hover td { background: var(--bg-card-hover); }' +
      '.rpt-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; }' +
      '.rpt-badge-success { background: var(--success-bg); color: var(--success); }' +
      '.rpt-badge-warning { background: var(--warning-bg); color: var(--warning); }' +
      '.rpt-badge-danger { background: var(--danger-bg); color: var(--danger); }' +
      '.rpt-badge-info { background: var(--info-bg); color: var(--info); }' +
      '.rpt-badge-default { background: var(--slate-bg); color: var(--slate); }' +
      '.rpt-charts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; padding: 10px; }' +
      '.rpt-chart-card { background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; }' +
      '.rpt-chart-title { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); }' +
      '.rpt-chart-canvas { padding: 6px; min-height: 220px; }' +
      '.rpt-no-data { padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px; }' +
      '.card-actions { display: flex; align-items: center; gap: 8px; }' +
      '@media print {' +
        '.sidebar, .topbar, .rpt-filter-card, .rpt-filter-actions, .card-actions, .btn { display: none !important; }' +
        '.rpt-kpi-row .stat-card { break-inside: avoid; }' +
        '.rpt-table-wrapper { overflow: visible; }' +
        '.rpt-table thead th { background: var(--bg-secondary) !important; color: var(--text) !important; }' +
        '.rpt-table tbody td { color: var(--text) !important; }' +
        '.rpt-chart-canvas { break-inside: avoid; page-break-inside: avoid; }' +
        'body { background: var(--bg-primary) !important; }' +
      '}';
    document.head.appendChild(style);
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;
    injectStyles();

    el.innerHTML =
      '<div id="reportsPage" class="page">' +
        '<div class="reports-container">' +

          '<div class="card rpt-filter-card">' +
            '<div class="card-header">' +
              '<div class="card-title">' + SVG_FILE + 'Enterprise Reports</div>' +
            '</div>' +
            '<div class="rpt-filter-panel">' +
              '<div class="rpt-filter-row">' +
                '<div class="rpt-filter-group">' +
                  '<label>Report Type</label>' +
                  '<select class="form-control" id="rptType" onchange="Reports.onRptTypeChange()"></select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Division</label>' +
                  '<select class="form-control" id="rptDivision" onchange="Reports.onRptDivChange()">' +
                    '<option value="">All Divisions</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Section</label>' +
                  '<select class="form-control" id="rptSection" onchange="Reports.onRptSecChange()">' +
                    '<option value="">All Sections</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Department</label>' +
                  '<select class="form-control" id="rptDepartment" onchange="Reports.onRptDeptChange()">' +
                    '<option value="">All Departments</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Machine Number</label>' +
                  '<select class="form-control" id="rptMachineNumber" onchange="Reports.onRptMachChange()">' +
                    '<option value="">All Machines</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="rpt-filter-row">' +
                '<div class="rpt-filter-group">' +
                  '<label>Technician</label>' +
                  '<select class="form-control" id="rptTechnician" onchange="Reports.onRptFilterChange()">' +
                    '<option value="">All Technicians</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Maintenance Type</label>' +
                  '<select class="form-control" id="rptMaintType" onchange="Reports.onRptFilterChange()">' +
                    '<option value="All">All Types</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Priority</label>' +
                  '<select class="form-control" id="rptPriority" onchange="Reports.onRptFilterChange()">' +
                    '<option value="">All Priorities</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>Status</label>' +
                  '<select class="form-control" id="rptStatus" onchange="Reports.onRptFilterChange()">' +
                    '<option value="">All Statuses</option>' +
                  '</select>' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>From Date</label>' +
                  '<input type="date" class="form-control" id="rptFromDate" onchange="Reports.onRptFilterChange()">' +
                '</div>' +
                '<div class="rpt-filter-group">' +
                  '<label>To Date</label>' +
                  '<input type="date" class="form-control" id="rptToDate" onchange="Reports.onRptFilterChange()">' +
                '</div>' +
              '</div>' +
              '<div class="rpt-filter-actions">' +
                '<button class="btn btn-primary" onclick="Reports.generateReport()">' + SVG_ZAP + 'Generate Report</button>' +
                '<button class="btn btn-secondary" onclick="Reports.resetFilters()">' + SVG_RESET + 'Reset</button>' +
                '<button class="btn btn-success" onclick="Reports.exportPDF()">' + SVG_DOWNLOAD + 'Export PDF</button>' +
                '<button class="btn btn-success" onclick="Reports.exportExcel()">' + SVG_XLS + 'Export Excel</button>' +
                '<button class="btn btn-info" onclick="Reports.exportCSV()">' + SVG_CSV + 'Export CSV</button>' +
                '<button class="btn btn-secondary" onclick="window.print()">' + SVG_PRINT + 'Print</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div id="rptKpiCards" class="rpt-kpi-row" style="display:none"></div>' +

          '<div id="rptTableCard" class="card" style="display:none;margin-top:16px">' +
            '<div class="card-header">' +
              '<div class="card-title" id="rptTableTitle">Report Data</div>' +
              '<div class="card-actions">' +
                '<span id="rptRecordCount" class="rpt-badge"></span>' +
              '</div>' +
            '</div>' +
            '<div class="rpt-table-wrapper">' +
              '<table class="rpt-table" id="rptTable">' +
                '<thead id="rptTableHead"></thead>' +
                '<tbody id="rptTableBody"></tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +

          '<div id="rptChartsCard" class="card" style="display:none;margin-top:16px">' +
            '<div class="card-header">' +
              '<div class="card-title">' + SVG_CHART + 'Analytics &amp; Charts</div>' +
            '</div>' +
            '<div class="rpt-charts-grid" id="rptChartsGrid"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadReportsData();
  }

  var masterDataPromise = null;
  var masterDataVersion = -1;

  function loadMasterData() {
    var version = API.masterCacheVersion();
    if (masterDataPromise && masterDataVersion === version) return masterDataPromise;
    masterDataVersion = version;
    masterDataPromise = Promise.all([
      API.post('getReportFilterOptions', {}),
      API.post('getMachineCascade', { divisionId: '', sectionId: '', deptId: '' }),
      API.post('getSectionList', {}),
      API.post('getDepartmentList', {}),
      API.post('getMachines', {})
    ]).then(function(results) {
      var opts = results[0] || {};
      var casc = results[1] || {};
      var sections = results[2] || [];
      var departments = results[3] || [];
      var machines = results[4] || [];
      var m = {
        reportTypes: (opts.reportTypes || []).map(function(r) { return { value: r.value, label: r.label }; }),
        technicians: (opts.technicians || []).map(function(t) { return { value: t, label: t }; }),
        maintenanceTypes: (opts.maintenanceTypes || []).map(function(mt) { return { value: mt, label: mt }; }),
        priorities: (opts.priorities || []).map(function(p) { return { value: p, label: p }; }),
        statuses: (opts.statuses || []).map(function(s) { return { value: s, label: s }; }),
        divisions: (casc.divisions || []).map(function(d) { return { value: d.id, label: d.name }; }),
        sections: sections.map(function(s) { return { value: s.SectionID, label: s.Section, divisionId: s.DivisionID }; }),
        departments: departments.map(function(d) { return { value: d.DepartmentID, label: d.Department, divisionId: d.DivisionID, sectionId: d.SectionID }; }),
        machines: machines.map(function(mc) {
          var n = mc.MachineNumber || mc.MachineCode || mc.MachineName || '';
          var label = n;
          if (mc.MachineName && mc.MachineName !== label) label += ' \u2014 ' + mc.MachineName;
          return { value: n, label: label, divisionId: mc.DivisionID, sectionId: mc.SectionID, deptId: mc.DeptID };
        }).sort(function(a, b) { return a.value.localeCompare(b.value); })
      };
      m.divisionNameById = {};
      (casc.divisions || []).forEach(function(d) { if (d.id) m.divisionNameById[d.id] = d.name || d.id; });
      m.sectionNameById = {};
      sections.forEach(function(s) { if (s.SectionID) m.sectionNameById[s.SectionID] = s.Section || s.SectionID; });
      m.deptNameById = {};
      departments.forEach(function(d) { if (d.DepartmentID) m.deptNameById[d.DepartmentID] = d.Department || d.DepartmentID; });
      rptMaster = m;
      return m;
    });
    return masterDataPromise;
  }

  function loadReportsData() {
    var d = new Date(); var y = d.getFullYear();
    var fromEl = document.getElementById('rptFromDate');
    if (fromEl) fromEl.value = y + '-01-01';
    var toEl = document.getElementById('rptToDate');
    if (toEl) toEl.value = formatDate(d);

    loadMasterData()
      .then(function(m) {
        populateRptSelect('rptType', m.reportTypes, 'Select Report Type');
        populateRptSelect('rptTechnician', m.technicians, 'All Technicians');
        populateRptSelect('rptMaintType', m.maintenanceTypes, 'All Types');
        populateRptSelect('rptPriority', m.priorities, 'All Priorities');
        populateRptSelect('rptStatus', m.statuses, 'All Statuses');
        populateRptSelect('rptDivision', m.divisions, 'All Divisions');
        populateRptSelect('rptSection', m.sections, 'All Sections');
        populateRptSelect('rptDepartment', m.departments, 'All Departments');
        populateRptSelect('rptMachineNumber', m.machines, 'All Machines');
      })
      .catch(function() { Notify.error('Failed to load filter options'); });
  }

  function populateRptSelect(id, items, placeholder) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">' + placeholder + '</option>';
    items.forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label || item.value;
      el.appendChild(opt);
    });
  }

  function repopulateRptSelect(id, items, placeholder, preserveValue) {
    var el = document.getElementById(id);
    if (!el) return;
    var prev = el.value;
    populateRptSelect(id, items, placeholder);
    if (preserveValue && prev) {
      for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === prev) { el.value = prev; break; }
      }
    }
  }

  function onRptTypeChange() {
    scheduleRptRefresh();
  }

  function onRptDivChange() {
    applyCascade().then(scheduleRptRefresh);
  }

  function onRptSecChange() {
    applyCascade().then(scheduleRptRefresh);
  }

  function onRptDeptChange() {
    applyCascade().then(scheduleRptRefresh);
  }

  function onRptMachChange() {
    scheduleRptRefresh();
  }

  function onRptFilterChange() {
    scheduleRptRefresh();
  }

  function scheduleRptRefresh() {
    if (rptRefreshTimer) clearTimeout(rptRefreshTimer);
    rptRefreshTimer = setTimeout(function() {
      rptRefreshTimer = null;
      var typeEl = document.getElementById('rptType');
      if (typeEl && typeEl.value) generateReport();
    }, 350);
  }

  function applyCascade() {
    var seq = ++rptCascadeSeq;
    return loadMasterData()
      .then(function(m) {
        if (seq !== rptCascadeSeq) return;
        var div = document.getElementById('rptDivision').value;
        var sec = document.getElementById('rptSection').value;
        var dept = document.getElementById('rptDepartment').value;

        var sections = m.sections;
        if (div) sections = sections.filter(function(s) { return s.divisionId === div; });
        repopulateRptSelect('rptSection', sections, 'All Sections', true);
        sec = document.getElementById('rptSection').value;

        var departments = m.departments;
        if (div) departments = departments.filter(function(d) { return d.divisionId === div; });
        if (sec) departments = departments.filter(function(d) { return d.sectionId === sec; });
        repopulateRptSelect('rptDepartment', departments, 'All Departments', true);
        dept = document.getElementById('rptDepartment').value;

        var machines = m.machines;
        if (div) machines = machines.filter(function(x) { return x.divisionId === div; });
        if (sec) machines = machines.filter(function(x) { return x.sectionId === sec; });
        if (dept) machines = machines.filter(function(x) { return x.deptId === dept; });
        repopulateRptSelect('rptMachineNumber', machines, 'All Machines', true);
      })
      .catch(function() { Notify.error('Failed to load machine filters'); });
  }

  function initRptCharts() {
    if (rptChartsLoaded) return;
    if (typeof google !== 'undefined' && google.charts) {
      google.charts.load('current', { packages: ['corechart', 'bar'] });
      google.charts.setOnLoadCallback(function() { rptChartsLoaded = true; });
      return;
    }
    var existingScript = document.querySelector('script[src*="gstatic.com/charts/loader.js"]');
    if (existingScript) {
      existingScript.onload = function() {
        if (typeof google !== 'undefined' && google.charts) {
          google.charts.load('current', { packages: ['corechart', 'bar'] });
          google.charts.setOnLoadCallback(function() { rptChartsLoaded = true; });
        }
      };
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.onload = function() {
      if (typeof google !== 'undefined' && google.charts) {
        google.charts.load('current', { packages: ['corechart', 'bar'] });
        google.charts.setOnLoadCallback(function() { rptChartsLoaded = true; });
      }
    };
    document.head.appendChild(script);
  }

  function getFilters() {
    var divId = document.getElementById('rptDivision').value;
    var secId = document.getElementById('rptSection').value;
    var deptId = document.getElementById('rptDepartment').value;
    var fromEl = document.getElementById('rptFromDate');
    var toEl = document.getElementById('rptToDate');
    var division = (rptMaster && rptMaster.divisionNameById[divId]) || divId || '';
    var section = (rptMaster && rptMaster.sectionNameById[secId]) || secId || '';
    var department = (rptMaster && rptMaster.deptNameById[deptId]) || deptId || '';
    return {
      reportType: document.getElementById('rptType').value,
      division: division,
      section: section,
      department: department,
      machineNumber: document.getElementById('rptMachineNumber').value,
      technician: document.getElementById('rptTechnician').value,
      maintenanceType: document.getElementById('rptMaintType').value,
      priority: document.getElementById('rptPriority').value,
      status: document.getElementById('rptStatus').value,
      fromDate: fromEl && fromEl.value ? fromEl.value + 'T00:00:00' : '',
      toDate: toEl && toEl.value ? toEl.value + 'T23:59:59' : ''
    };
  }

  function generateReport() {
    var filters = getFilters();
    if (!filters.reportType) { Notify.warning('Please select a report type'); return; }
    var seq = ++rptGenSeq;
    Loader.show('Generating report...');
    initRptCharts();
    API.post('getReportData', filters)
      .then(function(data) {
        if (seq !== rptGenSeq) return;
        rptData = data;
        Loader.hide();
        if (!data || !data.rows || data.rows.length === 0) {
          document.getElementById('rptKpiCards').style.display = 'none';
          document.getElementById('rptTableCard').style.display = 'none';
          document.getElementById('rptChartsCard').style.display = 'none';
          Notify.info('No data found for selected filters');
          return;
        }
        renderRptKpi(data.kpi);
        renderRptTable(data.columns, data.rows);
        document.getElementById('rptKpiCards').style.display = 'flex';
        document.getElementById('rptTableCard').style.display = 'block';
        document.getElementById('rptChartsCard').style.display = 'block';
        setTimeout(function() { renderRptCharts(data.charts); }, 50);
      })
      .catch(function(err) {
        if (seq !== rptGenSeq) return;
        Loader.hide();
        Notify.error('Error generating report: ' + ((err && err.message) || err));
      });
  }

  function resetFilters() {
    loadReportsData();
    document.getElementById('rptKpiCards').style.display = 'none';
    document.getElementById('rptTableCard').style.display = 'none';
    document.getElementById('rptChartsCard').style.display = 'none';
    rptData = null;
  }

  function renderRptKpi(kpi) {
    if (!kpi) return;
    var cards = [
      { label: 'Total Jobs', value: kpi.totalJobs || 0, cls: 'stat-primary', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>' },
      { label: 'Breakdown Jobs', value: kpi.breakdownJobs || 0, cls: 'stat-danger', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
      { label: 'Preventive Jobs', value: kpi.preventiveJobs || 0, cls: 'stat-success', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><polyline points="20 6 9 17 4 12"/></svg>' },
      { label: 'Total Downtime', value: Duration.format(kpi.totalDowntime || 0), cls: 'stat-warning', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
      { label: 'Total Waiting', value: Duration.format(kpi.totalWaiting || 0), cls: 'stat-pending', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
      { label: 'Total Working', value: Duration.format(kpi.totalWorking || 0), cls: 'stat-info', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
      { label: 'MTTR', value: kpi.mttr !== null && kpi.mttr !== undefined ? kpi.mttr + ' hrs' : 'N/A', cls: 'stat-approved', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
      { label: 'MTBF', value: kpi.mtbf !== null && kpi.mtbf !== undefined ? kpi.mtbf + ' hrs' : 'N/A', cls: 'stat-primary', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
      { label: 'Availability', value: kpi.availability !== null && kpi.availability !== undefined ? kpi.availability + '%' : 'N/A', cls: 'stat-success', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rpt-kpi-icon"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' }
    ];
    document.getElementById('rptKpiCards').innerHTML = cards.map(function(c) {
      return '<div class="stat-card ' + c.cls + '"><div class="stat-inner"><div class="stat-icon">' + c.icon + '</div><div class="stat-info"><h3>' + c.value + '</h3><p>' + c.label + '</p></div></div></div>';
    }).join('');
  }

  var rptSortCol = -1, rptSortDir = 1;

  function renderRptTable(columns, rows) {
    if (!columns || !rows) return;
    var typeSel = document.getElementById('rptType');
    var title = (typeSel && typeSel.options && typeSel.options[typeSel.selectedIndex]) ? typeSel.options[typeSel.selectedIndex].text : 'Report';
    document.getElementById('rptTableTitle').textContent = title;
    document.getElementById('rptRecordCount').textContent = rows.length + ' records';
    rptSortCol = -1; rptSortDir = 1;

    var thead = document.getElementById('rptTableHead');
    thead.innerHTML = '<tr>' + columns.map(function(c, i) {
      return '<th onclick="Reports.rptSortTable(' + i + ')" style="cursor:pointer;user-select:none">' + c.label + '<span class="rpt-sort-icon"></span></th>';
    }).join('') + '</tr>';

    rptRenderRows(columns, rows);
  }

  function rptSortTable(colIdx) {
    if (rptSortCol === colIdx) rptSortDir *= -1;
    else { rptSortCol = colIdx; rptSortDir = 1; }
    var columns = rptData.columns;
    var rows = rptData.rows.slice().sort(function(a, b) {
      var va = a[columns[colIdx].key], vb = b[columns[colIdx].key];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * rptSortDir;
      return String(va).localeCompare(String(vb)) * rptSortDir;
    });
    var ths = document.querySelectorAll('#rptTableHead th');
    ths.forEach(function(th, i) {
      var icon = th.querySelector('.rpt-sort-icon');
      if (icon) icon.textContent = i === rptSortCol ? (rptSortDir === 1 ? ' \u25B2' : ' \u25BC') : '';
    });
    rptRenderRows(columns, rows);
  }

  function rptRenderRows(columns, rows) {
    var tbody = document.getElementById('rptTableBody');
    tbody.innerHTML = rows.map(function(row) {
      return '<tr>' + columns.map(function(col) {
        var val = row[col.key];
        if (val === null || val === undefined) val = '';
        if (col.type === 'duration' && typeof val === 'number') val = Duration.format(val);
        else if (col.type === 'datetime' && val) {
          try { var d = new Date(val); if (!isNaN(d.getTime())) val = formatDate(d) + ' ' + formatTime(d); } catch(e) {}
        }
        else if (col.key === 'CurrentStatus' || col.key === 'ApprovalStatus') {
          var slc = String(val).toLowerCase();
          var badgeCls = 'rpt-badge-default';
          if (slc === 'closed' || slc === 'completed' || slc === 'approved') badgeCls = 'rpt-badge-success';
          else if (slc === 'open' || slc === 'pending') badgeCls = 'rpt-badge-warning';
          else if (slc === 'running' || slc === 'in progress') badgeCls = 'rpt-badge-info';
          else if (slc === 'rejected' || slc === 'cancelled') badgeCls = 'rpt-badge-danger';
          return '<td><span class="rpt-badge ' + badgeCls + '">' + val + '</span></td>';
        }
        return '<td>' + val + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  function renderRptCharts(charts) {
    if (!charts) return;
    var container = document.getElementById('rptChartsGrid');
    var chartDefs = [
      { title: 'Breakdown Trend', id: 'rptChartBreakdownTrend', type: 'line' },
      { title: 'Downtime Trend (hrs)', id: 'rptChartDowntimeTrend', type: 'line' },
      { title: 'Breakdown Category', id: 'rptChartBreakdownCategory', type: 'pie' },
      { title: 'Department Performance', id: 'rptChartDeptPerf', type: 'hbar' },
      { title: 'Machine Performance', id: 'rptChartMachinePerf', type: 'hbar' },
      { title: 'Technician Performance', id: 'rptChartTechPerf', type: 'hbar' },
      { title: 'Monthly Maintenance', id: 'rptChartMonthly', type: 'column' },
      { title: 'Availability Trend', id: 'rptChartAvailability', type: 'line' }
    ];

    container.innerHTML = chartDefs.map(function(cd) {
      return '<div class="rpt-chart-card"><div class="rpt-chart-title">' + cd.title + '</div><div class="rpt-chart-canvas" id="' + cd.id + '"></div></div>';
    }).join('');

    if (!rptChartsLoaded) {
      setTimeout(function() { renderRptCharts(charts); }, 1000);
      return;
    }

    var chartDataMap = {
      rptChartBreakdownTrend: { data: charts.breakdownTrend, type: 'line' },
      rptChartDowntimeTrend: { data: charts.downtimeTrend, type: 'line' },
      rptChartBreakdownCategory: { data: charts.breakdownCategory, type: 'pie' },
      rptChartDeptPerf: { data: charts.departmentPerformance, type: 'hbar' },
      rptChartMachinePerf: { data: charts.machinePerformance, type: 'hbar' },
      rptChartTechPerf: { data: charts.technicianPerformance, type: 'hbar' },
      rptChartMonthly: { data: charts.monthlyMaintenance, type: 'column' },
      rptChartAvailability: { data: charts.availabilityTrend, type: 'line' }
    };

    Object.keys(chartDataMap).forEach(function(id) {
      var info = chartDataMap[id];
      var el = document.getElementById(id);
      if (!el || !info.data || info.data.length === 0) return;
      drawRptChart(el, info.data, info.type, id.replace('rptChart', ''));
    });
  }

  function drawRptChart(container, data, type, title) {
    try {
      if (data.length === 0) { container.innerHTML = '<div class="rpt-no-data">No data</div>'; return; }
      var tc = getThemeColors();
      var dt = new google.visualization.DataTable();
      if (type === 'pie') {
        dt.addColumn('string', 'Category');
        dt.addColumn('number', 'Count');
        dt.addRows(data.map(function(d) { return [d.label, d.value]; }));
        var chart = new google.visualization.PieChart(container);
        chart.draw(dt, {
          width: '100%', height: 260, backgroundColor: tc.bg,
          legend: { textStyle: { color: tc.label }, position: 'right' },
          titleTextStyle: { color: tc.title },
          chartArea: { width: '70%', height: '80%' },
          colors: tc.palette
        });
      } else if (type === 'hbar') {
        dt.addColumn('string', 'Label');
        dt.addColumn('number', 'Count');
        dt.addRows(data.slice(0, 15).map(function(d) { return [d.label, d.value]; }));
        var chart = new google.visualization.BarChart(container);
        chart.draw(dt, {
          width: '100%', height: Math.max(200, data.slice(0, 15).length * 28),
          backgroundColor: tc.bg, legend: { position: 'none' },
          hAxis: { textStyle: { color: tc.label }, gridlines: { color: tc.grid } },
          vAxis: { textStyle: { color: tc.label } },
          chartArea: { width: '55%', height: '80%' },
          colors: [tc.primary]
        });
      } else if (type === 'column') {
        dt.addColumn('string', 'Period');
        dt.addColumn('number', 'Jobs');
        dt.addRows(data.map(function(d) { return [d.label, d.value]; }));
        var chart = new google.visualization.ColumnChart(container);
        chart.draw(dt, {
          width: '100%', height: 260, backgroundColor: tc.bg,
          legend: { position: 'none' },
          hAxis: { textStyle: { color: tc.label }, slantedText: true, slantedTextAngle: 45, gridlines: { color: tc.grid } },
          vAxis: { textStyle: { color: tc.label }, gridlines: { color: tc.grid } },
          chartArea: { width: '85%', height: '70%' },
          colors: [tc.primary]
        });
      } else {
        dt.addColumn('string', 'Period');
        dt.addColumn('number', 'Value');
        dt.addRows(data.map(function(d) { return [d.label, d.value]; }));
        var chart = new google.visualization.LineChart(container);
        chart.draw(dt, {
          width: '100%', height: 260, backgroundColor: tc.bg,
          legend: { position: 'none' },
          hAxis: { textStyle: { color: tc.label }, slantedText: true, slantedTextAngle: 45, gridlines: { color: tc.grid } },
          vAxis: { textStyle: { color: tc.label }, gridlines: { color: tc.grid } },
          chartArea: { width: '85%', height: '70%' },
          colors: [tc.secondary],
          pointSize: 5,
          lineWidth: 2
        });
      }
    } catch(e) {
      container.innerHTML = '<div class="rpt-no-data">Chart error: ' + e.message + '</div>';
    }
  }

  function getThemeColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--bg-card').trim() || '#151829',
      label: s.getPropertyValue('--text-secondary').trim() || '#9498b8',
      title: s.getPropertyValue('--text').trim() || '#eef0f6',
      grid: s.getPropertyValue('--border').trim() || '#1e2140',
      primary: s.getPropertyValue('--primary').trim() || '#6366f1',
      secondary: s.getPropertyValue('--orange').trim() || '#f97316',
      palette: [
        s.getPropertyValue('--primary').trim() || '#6366f1',
        s.getPropertyValue('--success').trim() || '#22c55e',
        s.getPropertyValue('--warning').trim() || '#f59e0b',
        s.getPropertyValue('--danger').trim() || '#ef4444',
        s.getPropertyValue('--info').trim() || '#06b6d4',
        s.getPropertyValue('--purple').trim() || '#a855f7',
        s.getPropertyValue('--orange').trim() || '#f97316'
      ]
    };
  }

  function exportCSV() {
    if (!rptData || !rptData.rows || rptData.rows.length === 0) { Notify.warning('No data to export'); return; }
    var cols = rptData.columns;
    var csv = '\uFEFF';
    csv += cols.map(function(c) { return '"' + String(c.label).replace(/"/g, '""') + '"'; }).join(',') + '\n';
    rptData.rows.forEach(function(row) {
      csv += cols.map(function(col) {
        var val = row[col.key];
        if (val === null || val === undefined) val = '';
        if (col.type === 'duration' && typeof val === 'number') val = Duration.format(val);
        val = String(val).replace(/"/g, '""');
        return '"' + val + '"';
      }).join(',') + '\n';
    });
    downloadBlob(csv, 'text/csv;charset=utf-8', 'report.csv');
  }

  function exportExcel() {
    if (!rptData || !rptData.rows || rptData.rows.length === 0) { Notify.warning('No data to export'); return; }
    var cols = rptData.columns;
    var html = '<table>';
    html += '<tr>' + cols.map(function(c) { return '<th>' + c.label + '</th>'; }).join('') + '</tr>';
    rptData.rows.forEach(function(row) {
      html += '<tr>' + cols.map(function(col) {
        var val = row[col.key];
        if (val === null || val === undefined) val = '';
        if (col.type === 'duration' && typeof val === 'number') val = Duration.format(val);
        return '<td>' + String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</td>';
      }).join('') + '</tr>';
    });
    html += '</table>';
    downloadBlob('<html><meta charset="utf-8"><body>' + html + '</body></html>', 'application/vnd.ms-excel', 'report.xls');
  }

  function exportPDF() {
    window.print();
  }

  function downloadBlob(content, mime, filename) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 100);
  }

  function formatDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatTime(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  return {
    show: renderPage,
    onRptTypeChange: onRptTypeChange,
    onRptDivChange: onRptDivChange,
    onRptSecChange: onRptSecChange,
    onRptDeptChange: onRptDeptChange,
    onRptMachChange: onRptMachChange,
    onRptFilterChange: onRptFilterChange,
    generateReport: generateReport,
    resetFilters: resetFilters,
    exportPDF: exportPDF,
    exportExcel: exportExcel,
    exportCSV: exportCSV,
    rptSortTable: rptSortTable
  };
})();
