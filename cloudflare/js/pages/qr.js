/* ============================================================
   qr.js — QR Scanner, History, Search & Print Module
   Standard-015: Mobile App + QR Scan + QR History
   ============================================================ */

(function() {
  var _tab = 'scanner';
  var _scanner = null;
  var _isScanning = false;
  var _scanResult = null;
  var _history = [];
  var _historyTotal = 0;
  var _historyPage = 1;
  var _historyPageSize = 20;
  var _searchResults = [];
  var _searchQuery = '';
  var _modules = ['Machine', 'Asset', 'Spare Part', 'Job Card'];
  var _moduleIcons = { 'Machine': '\u2699', 'Asset': '\uD83D\uDCE6', 'Spare Part': '\uD83D\uDD27', 'Job Card': '\uD83D\uDCC4' };
  var _moduleClasses = { 'Machine': 'machine', 'Asset': 'asset', 'Spare Part': 'sparepart', 'Job Card': 'jobcard' };
  var _pendingScans = [];

  App.registerPage('qr', render, load);

  function render() {
    var el = document.getElementById('page-qr');
    if (!el) return;
    var isOffline = !navigator.onLine;
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<h2>QR Scanner</h2>' +
          (isOffline ? '<span class="qr-offline-badge"><span class="dot"></span>Offline</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="tabs qr-no-print">' +
        '<button class="tab' + (_tab === 'scanner' ? ' active' : '') + '" onclick="QRModule.switchTab(\'scanner\')">Scanner</button>' +
        '<button class="tab' + (_tab === 'history' ? ' active' : '') + '" onclick="QRModule.switchTab(\'history\')">History</button>' +
        '<button class="tab' + (_tab === 'search' ? ' active' : '') + '" onclick="QRModule.switchTab(\'search\')">Search</button>' +
        '<button class="tab' + (_tab === 'print' ? ' active' : '') + '" onclick="QRModule.switchTab(\'print\')">Print QR</button>' +
      '</div>' +
      '<div id="qr-tab-content"></div>';
    renderTabContent();
  }

  function load() {
    App.showLoading(true);
    if (_tab === 'history') loadHistory();
    if (_tab === 'search') { /* no-op until user searches */ App.showLoading(false); }
    if (_tab !== 'history' && _tab !== 'search') App.showLoading(false);
  }

  function renderTabContent() {
    var el = document.getElementById('qr-tab-content');
    if (!el) return;
    switch (_tab) {
      case 'scanner': renderScannerTab(el); break;
      case 'history': renderHistoryTab(el); break;
      case 'search': renderSearchTab(el); break;
      case 'print': renderPrintTab(el); break;
    }
  }

  /* ==========================================================
     SCANNER TAB
     ========================================================== */
  function renderScannerTab(el) {
    el.innerHTML = '' +
      '<div style="max-width:500px;margin:0 auto">' +
        '<div class="qr-scanner-container" id="qr-reader">' +
          '<div class="qr-scanner-empty" id="qr-scanner-placeholder">' +
            '<div class="qr-scanner-empty-icon">&#128247;</div>' +
            '<h3>QR Scanner</h3>' +
            '<p>Tap the button below to start scanning</p>' +
          '</div>' +
        '</div>' +
        '<div class="qr-scanner-status" id="qr-scanner-status">Ready to scan</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;justify-content:center">' +
          '<button class="btn btn-primary" id="qr-scan-btn" onclick="QRModule.toggleScanner()" style="padding:12px 32px">' +
            '\u25B6 Start Scanner' +
          '</button>' +
          '<button class="btn btn-secondary" onclick="QRModule.openManualInput()" style="padding:12px 24px">' +
            'Manual Input' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div id="qr-detail-container" style="margin-top:24px"></div>' +
      '<div id="qr-manual-modal"></div>';
  }

  function toggleScanner() {
    if (_isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
  }

  function startScanner() {
    var statusEl = document.getElementById('qr-scanner-status');
    var btnEl = document.getElementById('qr-scan-btn');
    var placeholder = document.getElementById('qr-scanner-placeholder');

    if (typeof Html5Qrcode === 'undefined') {
      if (statusEl) { statusEl.textContent = 'QR library not loaded. Please check your connection.'; statusEl.className = 'qr-scanner-status error'; }
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    if (!_scanner) {
      _scanner = new Html5Qrcode('qr-reader');
    }

    _isScanning = true;
    if (btnEl) { btnEl.innerHTML = '\u23F9 Stop Scanner'; btnEl.className = 'btn btn-danger'; }
    if (statusEl) { statusEl.textContent = 'Starting camera...'; statusEl.className = 'qr-scanner-status scanning'; }

    var config = {
      fps: 10,
      qrbox: { width: 200, height: 200 },
      aspectRatio: 1,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8
      ]
    };

    _scanner.start(
      { facingMode: 'environment' },
      config,
      function onScanSuccess(decodedText) {
        handleScanSuccess(decodedText);
      },
      function onScanFailure() {}
    ).catch(function(err) {
      _isScanning = false;
      if (btnEl) { btnEl.innerHTML = '\u25B6 Start Scanner'; btnEl.className = 'btn btn-primary'; }
      if (statusEl) {
        if (String(err).indexOf('NotAllowedError') > -1 || String(err).indexOf('Permission') > -1) {
          statusEl.textContent = 'Camera permission denied. Please allow camera access.';
        } else if (String(err).indexOf('NotFound') > -1) {
          statusEl.textContent = 'No camera found on this device.';
        } else {
          statusEl.textContent = 'Camera error: ' + String(err).substring(0, 80);
        }
        statusEl.className = 'qr-scanner-status error';
      }
    });
  }

  function stopScanner() {
    var btnEl = document.getElementById('qr-scan-btn');
    var statusEl = document.getElementById('qr-scanner-status');
    if (_scanner && _isScanning) {
      _scanner.stop().then(function() {
        _isScanning = false;
        if (btnEl) { btnEl.innerHTML = '\u25B6 Start Scanner'; btnEl.className = 'btn btn-primary'; }
        if (statusEl) { statusEl.textContent = 'Scanner stopped'; statusEl.className = 'qr-scanner-status'; }
      }).catch(function() {
        _isScanning = false;
        if (btnEl) { btnEl.innerHTML = '\u25B6 Start Scanner'; btnEl.className = 'btn btn-primary'; }
      });
    }
  }

  function handleScanSuccess(decodedText) {
    if (_isScanning) {
      stopScanner();
    }

    var statusEl = document.getElementById('qr-scanner-status');
    if (statusEl) { statusEl.textContent = 'QR scanned successfully!'; statusEl.className = 'qr-scanner-status success'; }

    showScanSuccessAnimation(decodedText);
    processQRContent(decodedText);
  }

  function showScanSuccessAnimation(text) {
    var overlay = document.createElement('div');
    overlay.className = 'qr-scan-success';
    overlay.innerHTML = '<div class="qr-scan-success-content">' +
      '<div class="qr-scan-success-icon">&#10004;</div>' +
      '<div class="qr-scan-success-text">Scan Successful</div>' +
      '<div class="qr-scan-success-module">' + App.escHtml(text.substring(0, 60)) + '</div>' +
    '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.remove(); }, 1500);
  }

  function processQRContent(content) {
    if (!content) return;
    if (!navigator.onLine) {
      storeOfflineScan(content);
      App.showToast('Scan saved offline. Will sync when connected.', 'warning');
      return;
    }
    fetchQRDetail(content);
  }

  function fetchQRDetail(content) {
    var detailContainer = document.getElementById('qr-detail-container');
    if (!detailContainer) return;
    detailContainer.innerHTML = '<div style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto"></div><p style="color:var(--text-muted);margin-top:12px">Looking up QR code...</p></div>';

    API.call('getQRDetail', { qrContent: content })
      .then(function(data) {
        if (data && data.error) {
          detailContainer.innerHTML = '' +
            '<div class="qr-detail-card" style="border-color:var(--danger)">' +
              '<div class="qr-detail-body" style="text-align:center">' +
                '<div style="font-size:48px;margin-bottom:12px">&#10060;</div>' +
                '<h3 style="margin:0 0 8px">QR Code Not Recognized</h3>' +
                '<p style="color:var(--text-muted);font-size:13px;margin:0">' + App.escHtml(data.error) + '</p>' +
                '<p style="color:var(--text-muted);font-size:12px;margin-top:8px">Scanned content: ' + App.escHtml(content.substring(0, 100)) + '</p>' +
              '</div>' +
            '</div>';
          return;
        }
        _scanResult = data;
        renderDetailResult(detailContainer, data);
      })
      .catch(function(err) {
        var isNetwork = err.type === 'network';
        var msg = isNetwork
          ? 'Unable to reach the server. Please check your internet connection and try again.'
          : (err.message || 'An error occurred while looking up the QR code.');
        detailContainer.innerHTML = '' +
          '<div class="qr-detail-card" style="border-color:var(--danger)">' +
            '<div class="qr-detail-body" style="text-align:center">' +
              '<div style="font-size:48px;margin-bottom:12px">&#9888;</div>' +
              '<h3 style="margin:0 0 8px">Lookup Failed</h3>' +
              '<p style="color:var(--text-muted);font-size:13px;margin:0">' + App.escHtml(msg) + '</p>' +
              '<p style="color:var(--text-muted);font-size:12px;margin-top:8px">Scanned: ' + App.escHtml(content.substring(0, 100)) + '</p>' +
              '<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="QRModule.retryLookup(\'' + App.escHtml(content.replace(/'/g, "\\'")) + '\')">&#8635; Retry</button>' +
            '</div>' +
          '</div>';
      });
  }

  function openManualInput() {
    var modal = document.getElementById('qr-manual-modal');
    if (!modal) return;
    modal.innerHTML = '' +
      '<div class="modal-overlay" id="qr-manual-overlay">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<h3>Manual QR / Barcode Input</h3>' +
            '<button class="btn-icon" onclick="QRModule.closeManualInput()">&#10005;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="form-group">' +
              '<label class="form-label">Enter QR Code or Barcode Content</label>' +
              '<input class="form-input" id="qr-manual-text" placeholder="Type or paste QR/barcode content..." autofocus>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="QRModule.closeManualInput()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="QRModule.submitManualInput()">Lookup</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    modal.querySelector('#qr-manual-text').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') QRModule.submitManualInput();
    });
    setTimeout(function() { var inp = document.getElementById('qr-manual-text'); if (inp) inp.focus(); }, 100);
  }

  function closeManualInput() {
    var overlay = document.getElementById('qr-manual-overlay');
    if (overlay) overlay.remove();
  }

  function submitManualInput() {
    var inp = document.getElementById('qr-manual-text');
    var val = inp ? inp.value.trim() : '';
    if (!val) { App.showToast('Please enter a value', 'warning'); return; }
    closeManualInput();
    processQRContent(val);
  }

  /* ==========================================================
     DETAIL RENDERERS
     ========================================================== */
  function renderDetailResult(container, data) {
    switch (data.module) {
      case 'Machine': renderMachineDetail(container, data); break;
      case 'Asset': renderAssetDetail(container, data); break;
      case 'Job Card': renderJobCardDetail(container, data); break;
      case 'Spare Part': renderSparePartDetail(container, data); break;
      default: renderGenericDetail(container, data);
    }
  }

  function renderMachineDetail(container, data) {
    var html = '' +
      '<div class="qr-detail-card">' +
        '<div class="qr-detail-header">' +
          '<div class="qr-detail-header-icon machine">' + _moduleIcons['Machine'] + '</div>' +
          '<div class="qr-detail-header-title">' +
            '<h3>' + App.escHtml(data.name || data.id) + '</h3>' +
            '<p>' + App.escHtml(data.id) + ' &middot; ' + App.escHtml(data.code || '') + '</p>' +
          '</div>' +
          '<span class="badge ' + getStatusBadge(data.status) + '" style="margin-left:auto">' + App.escHtml(data.status || 'N/A') + '</span>' +
        '</div>' +
        '<div class="qr-detail-body">' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Machine Name', data.name) +
            fieldHTML('Asset No', data.id) +
            fieldHTML('Code', data.code) +
            fieldHTML('Department', data.department) +
            fieldHTML('Section', data.section) +
            fieldHTML('Location', data.location) +
            fieldHTML('Type', data.type) +
            fieldHTML('Manufacturer', data.manufacturer) +
            fieldHTML('Model', data.model) +
            fieldHTML('Serial No', data.serialNo) +
            fieldHTML('Criticality', data.criticality) +
            fieldHTML('Capacity', data.capacity) +
            fieldHTML('Power Rating', data.powerRating) +
            fieldHTML('Install Date', data.installDate) +
            fieldHTML('Warranty Expiry', data.warrantyExpiry) +
          '</div>' +
          '<div class="qr-detail-section-title">&#128202; Job Card Summary</div>' +
          '<div class="qr-mini-stats">' +
            miniStatHTML(data.totalJobs || 0, 'Total Jobs') +
            miniStatHTML(data.openJobCards || 0, 'Open') +
            miniStatHTML(data.runningJobs || 0, 'Running') +
          '</div>' +
          '<div class="qr-mini-stats">' +
            miniStatHTML(data.closedJobs || 0, 'Closed') +
            miniStatHTML(data.pendingJobs || 0, 'Pending') +
            miniStatHTML(data.approvedJobs || 0, 'Approved') +
          '</div>' +
          '<div class="qr-detail-section-title">&#9201; Downtime & Reliability</div>' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Total Downtime (hrs)', data.totalDowntimeHours) +
            fieldHTML('MTTR (min)', data.mttr) +
            fieldHTML('MTBF (days)', data.mtbf) +
            fieldHTML('Total Breakdowns', data.totalBreakdowns) +
            fieldHTML('Last Breakdown', data.lastBreakdownDate) +
            fieldHTML('Last Repair', data.lastRepairDate) +
          '</div>' +
          renderPMInfo(data) +
          renderSparePartsUsed(data) +
          renderMachineHistory(data) +
          renderDetailActions(data) +
        '</div>' +
      '</div>';
    container.innerHTML = html;
  }

  function renderAssetDetail(container, data) {
    var html = '' +
      '<div class="qr-detail-card">' +
        '<div class="qr-detail-header">' +
          '<div class="qr-detail-header-icon asset">' + _moduleIcons['Asset'] + '</div>' +
          '<div class="qr-detail-header-title">' +
            '<h3>' + App.escHtml(data.name || data.id) + '</h3>' +
            '<p>' + App.escHtml(data.id) + ' &middot; ' + App.escHtml(data.code || '') + '</p>' +
          '</div>' +
          '<span class="badge ' + getStatusBadge(data.status) + '" style="margin-left:auto">' + App.escHtml(data.status || 'N/A') + '</span>' +
        '</div>' +
        '<div class="qr-detail-body">' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Asset Name', data.name) +
            fieldHTML('Asset ID', data.id) +
            fieldHTML('Code', data.code) +
            fieldHTML('Department', data.department) +
            fieldHTML('Section', data.section) +
            fieldHTML('Location', data.location) +
            fieldHTML('Type', data.type) +
            fieldHTML('Category', data.category) +
            fieldHTML('Manufacturer', data.manufacturer) +
            fieldHTML('Model', data.model) +
            fieldHTML('Serial No', data.serialNo) +
            fieldHTML('Criticality', data.criticality) +
            fieldHTML('Machine', data.machineName) +
            fieldHTML('Cost', data.cost) +
            fieldHTML('Purchase Date', data.purchaseDate) +
            fieldHTML('Install Date', data.installDate) +
            fieldHTML('Warranty Expiry', data.warrantyExpiry) +
            fieldHTML('Supplier', data.supplier) +
            fieldHTML('Specification', data.specification) +
          '</div>' +
          '<div class="qr-detail-section-title">&#128202; Job Summary</div>' +
          '<div class="qr-mini-stats">' +
            miniStatHTML(data.totalJobs || 0, 'Total Jobs') +
            miniStatHTML(data.openJobs || 0, 'Open/Running') +
            miniStatHTML((data.totalJobs || 0) - (data.openJobs || 0), 'Completed') +
          '</div>' +
          renderAssetHistory(data) +
          renderDetailActions(data) +
        '</div>' +
      '</div>';
    container.innerHTML = html;
  }

  function renderJobCardDetail(container, data) {
    var priorityColors = { 'Critical': 'badge-danger', 'High': 'badge-warning', 'Medium': 'badge-info', 'Low': 'badge-secondary' };
    var priBadge = priorityColors[data.priority] || 'badge-secondary';
    var html = '' +
      '<div class="qr-detail-card">' +
        '<div class="qr-detail-header">' +
          '<div class="qr-detail-header-icon jobcard">' + _moduleIcons['Job Card'] + '</div>' +
          '<div class="qr-detail-header-title">' +
            '<h3>' + App.escHtml(data.jobCardNo || data.id || data.name) + '</h3>' +
            '<p>' + App.escHtml(data.machine || '') + ' &middot; ' + App.escHtml(data.code || '') + '</p>' +
          '</div>' +
          '<span class="badge ' + getStatusBadge(data.currentStatus || data.status) + '" style="margin-left:auto">' + App.escHtml(data.currentStatus || data.status || 'N/A') + '</span>' +
        '</div>' +
        '<div class="qr-detail-body">' +
          '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
            '<span class="badge ' + priBadge + '">' + App.escHtml(data.priority || 'N/A') + ' Priority</span>' +
            (data.approvalStatus ? '<span class="badge badge-info">' + App.escHtml(data.approvalStatus) + '</span>' : '') +
            (data.breakdownType ? '<span class="badge badge-secondary">' + App.escHtml(data.breakdownType) + '</span>' : '') +
          '</div>' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Job Card No', data.jobCardNo || data.id) +
            fieldHTML('Machine', data.machine) +
            fieldHTML('Department', data.department) +
            fieldHTML('Section', data.section) +
            fieldHTML('Complaint', data.complaintDescription) +
            fieldHTML('Complaint Category', data.complaintCategory) +
            fieldHTML('Complaint By', data.complaintBy) +
            fieldHTML('Assigned Technician', data.assignedTechnician) +
            fieldHTML('Maintenance Team', data.maintenanceTeam) +
            fieldHTML('Initial Remarks', data.initialRemarks) +
          '</div>' +
          '<div class="qr-detail-section-title">&#9201; Timeline</div>' +
          renderTimeline(data) +
          '<div class="qr-detail-section-title">&#128221; Resolution</div>' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Root Cause', data.rootCause) +
            fieldHTML('Corrective Action', data.correctiveAction) +
            fieldHTML('Spare Parts', data.spareParts) +
            fieldHTML('Final Remarks', data.finalRemarks) +
            fieldHTML('Working Time', data.workingTime) +
            fieldHTML('Downtime', data.downtime) +
            fieldHTML('Total Duration', data.totalDuration) +
            fieldHTML('Closed By', data.closedBy) +
          '</div>' +
          '<div class="qr-detail-section-title">&#128203; Approval</div>' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Approval Status', data.approvalStatus) +
            fieldHTML('Approved By', data.approvedBy) +
            fieldHTML('Approval Date', data.approvedDateTime) +
            fieldHTML('Approval Remarks', data.approvalRemarks) +
          '</div>' +
          renderDetailActions(data) +
        '</div>' +
      '</div>';
    container.innerHTML = html;
  }

  function renderSparePartDetail(container, data) {
    var stockBadge = '';
    if (data.stockStatus === 'Out of Stock') stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
    else if (data.stockStatus === 'Low Stock') stockBadge = '<span class="badge badge-warning">Low Stock</span>';
    else if (data.stockStatus === 'Overstocked') stockBadge = '<span class="badge badge-info">Overstocked</span>';
    else stockBadge = '<span class="badge badge-success">Normal</span>';

    var html = '' +
      '<div class="qr-detail-card">' +
        '<div class="qr-detail-header">' +
          '<div class="qr-detail-header-icon sparepart">' + _moduleIcons['Spare Part'] + '</div>' +
          '<div class="qr-detail-header-title">' +
            '<h3>' + App.escHtml(data.name || data.id) + '</h3>' +
            '<p>' + App.escHtml(data.id) + ' &middot; ' + App.escHtml(data.code || '') + '</p>' +
          '</div>' +
          '<span style="margin-left:auto">' + stockBadge + '</span>' +
        '</div>' +
        '<div class="qr-detail-body">' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Part Name', data.name) +
            fieldHTML('Part Number', data.id) +
            fieldHTML('Category', data.category) +
            fieldHTML('Manufacturer', data.manufacturer) +
            fieldHTML('Unit', data.unit) +
            fieldHTML('Location', data.location) +
            fieldHTML('Bin Number', data.binNumber) +
            fieldHTML('Supplier', data.supplier) +
          '</div>' +
          '<div class="qr-detail-section-title">&#128230; Stock Information</div>' +
          '<div class="qr-mini-stats">' +
            miniStatHTML(data.currentStock || 0, 'Current Stock') +
            miniStatHTML(data.minimumStock || 0, 'Min Stock') +
            miniStatHTML(data.maximumStock || 0, 'Max Stock') +
          '</div>' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Reorder Level', data.reorderLevel) +
            fieldHTML('Unit Cost', data.unitCost) +
            fieldHTML('Total Purchased', data.totalPurchased) +
          '</div>' +
          renderPurchaseHistory(data) +
          renderUsedInJobs(data) +
          renderDetailActions(data) +
        '</div>' +
      '</div>';
    container.innerHTML = html;
  }

  function renderGenericDetail(container, data) {
    var modClass = _moduleClasses[data.module] || '';
    var html = '' +
      '<div class="qr-detail-card">' +
        '<div class="qr-detail-header">' +
          '<div class="qr-detail-header-icon ' + modClass + '">' + (_moduleIcons[data.module] || '?') + '</div>' +
          '<div class="qr-detail-header-title">' +
            '<h3>' + App.escHtml(data.name || data.id) + '</h3>' +
            '<p>' + App.escHtml(data.module || '') + ' &middot; ' + App.escHtml(data.id || '') + '</p>' +
          '</div>' +
          '<span class="badge ' + getStatusBadge(data.status) + '" style="margin-left:auto">' + App.escHtml(data.status || 'N/A') + '</span>' +
        '</div>' +
        '<div class="qr-detail-body">' +
          '<div class="qr-detail-grid">' +
            fieldHTML('Name', data.name) +
            fieldHTML('ID', data.id) +
            fieldHTML('Code', data.code) +
            fieldHTML('Department', data.department) +
            fieldHTML('Section', data.section) +
            fieldHTML('Location', data.location) +
          '</div>' +
          renderDetailActions(data) +
        '</div>' +
      '</div>';
    container.innerHTML = html;
  }

  /* ==========================================================
     DETAIL SUB-RENDERERS
     ========================================================== */
  function renderTimeline(data) {
    var timeline = data.timeline || [];
    if (timeline.length === 0) return '<p style="color:var(--text-muted);font-size:13px">No timeline data available</p>';
    var html = '<div class="qr-timeline">';
    timeline.forEach(function(item) {
      var cls = item.event === 'Closed' || item.event === 'Approved' ? 'completed' : (item.event === 'Pending' || item.event === 'Returned' ? 'pending' : '');
      html += '<div class="qr-timeline-item ' + cls + '">' +
        '<div class="qr-timeline-event">' + App.escHtml(item.event) + '</div>' +
        '<div class="qr-timeline-date">' + App.escHtml(item.date) + '</div>' +
        (item.by ? '<div class="qr-timeline-by">by ' + App.escHtml(item.by) + '</div>' : '') +
        (item.reason ? '<div class="qr-timeline-reason">Reason: ' + App.escHtml(item.reason) + '</div>' : '') +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderPMInfo(data) {
    if (!data.pmStatus && !data.lastPM && !data.nextPM) return '';
    return '<div class="qr-detail-section-title">&#128197; Preventive Maintenance</div>' +
      '<div class="qr-detail-grid">' +
        fieldHTML('PM Status', data.pmStatus) +
        fieldHTML('Last PM', data.lastPM) +
        fieldHTML('Next PM', data.nextPM) +
      '</div>';
  }

  function renderSparePartsUsed(data) {
    var parts = data.sparePartsUsed || [];
    if (parts.length === 0) return '';
    var html = '<div class="qr-detail-section-title">&#128296; Spare Parts Used</div>';
    parts.forEach(function(p) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:13px">' + App.escHtml(p.name) + '</span>' +
        '<span class="badge badge-info">' + p.count + 'x</span>' +
      '</div>';
    });
    return html;
  }

  function renderMachineHistory(data) {
    var history = data.history || [];
    if (history.length === 0) return '';
    var html = '<div class="qr-detail-section-title">&#128203; Recent Job History</div>';
    html += '<div class="table-container"><table><thead><tr><th>Job Card</th><th>Status</th><th>Date</th><th>Description</th></tr></thead><tbody>';
    history.forEach(function(h) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(h.jobCardNo) + '</strong></td>' +
        '<td><span class="badge ' + getStatusBadge(h.status) + '">' + App.escHtml(h.status) + '</span></td>' +
        '<td>' + App.escHtml(h.date) + '</td>' +
        '<td>' + App.escHtml(h.description) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderAssetHistory(data) {
    var history = data.history || [];
    if (history.length === 0) return '';
    var html = '<div class="qr-detail-section-title">&#128203; Maintenance History</div>';
    html += '<div class="table-container"><table><thead><tr><th>Job Card</th><th>Status</th><th>Date</th><th>Description</th></tr></thead><tbody>';
    history.forEach(function(h) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(h.jobCardNo) + '</strong></td>' +
        '<td><span class="badge ' + getStatusBadge(h.status) + '">' + App.escHtml(h.status) + '</span></td>' +
        '<td>' + App.escHtml(h.date) + '</td>' +
        '<td>' + App.escHtml(h.description) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderPurchaseHistory(data) {
    var history = data.purchaseHistory || [];
    if (history.length === 0) return '';
    var html = '<div class="qr-detail-section-title">&#128176; Purchase History</div>';
    html += '<div class="table-container"><table><thead><tr><th>GRN No</th><th>Qty</th><th>Date</th><th>Supplier</th></tr></thead><tbody>';
    history.forEach(function(h) {
      html += '<tr>' +
        '<td>' + App.escHtml(h.grnNo) + '</td>' +
        '<td>' + App.escHtml(h.quantity) + '</td>' +
        '<td>' + App.escHtml(h.date) + '</td>' +
        '<td>' + App.escHtml(h.supplier) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderUsedInJobs(data) {
    var jobs = data.usedInJobs || [];
    if (jobs.length === 0) return '';
    var html = '<div class="qr-detail-section-title">&#128196; Used In Job Cards (' + (data.usedInJobCount || jobs.length) + ')</div>';
    html += '<div class="table-container"><table><thead><tr><th>Job Card</th><th>Machine</th><th>Date</th><th>Status</th></tr></thead><tbody>';
    jobs.forEach(function(j) {
      html += '<tr>' +
        '<td><strong>' + App.escHtml(j.jobCardNo) + '</strong></td>' +
        '<td>' + App.escHtml(j.machine) + '</td>' +
        '<td>' + App.escHtml(j.date) + '</td>' +
        '<td><span class="badge ' + getStatusBadge(j.status) + '">' + App.escHtml(j.status) + '</span></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderDetailActions(data) {
    return '<div class="qr-actions-row">' +
      '<button class="btn btn-primary btn-sm" onclick="QRModule.showPrintDialog(\'' + App.escHtml(data.module || '') + '\', \'' + App.escHtml(data.id || '') + '\')">&#128424; Print Label</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="QRModule.rescan()">&#128247; Scan Again</button>' +
    '</div>';
  }

  function fieldHTML(label, value) {
    if (!value && value !== 0) value = '-';
    return '<div class="qr-detail-field">' +
      '<div class="qr-detail-field-label">' + App.escHtml(label) + '</div>' +
      '<div class="qr-detail-field-value">' + App.escHtml(String(value)) + '</div>' +
    '</div>';
  }

  function miniStatHTML(num, label) {
    return '<div class="qr-mini-stat"><div class="num">' + (num || 0) + '</div><div class="lbl">' + App.escHtml(label) + '</div></div>';
  }

  function getStatusBadge(status) {
    var s = (status || '').toLowerCase();
    if (s === 'active' || s === 'approved' || s === 'completed' || s === 'closed') return 'badge-success';
    if (s === 'open' || s === 'running' || s === 'in progress') return 'badge-info';
    if (s === 'pending' || s === 'waiting' || s === 'review') return 'badge-warning';
    if (s === 'inactive' || s === 'cancelled' || s === 'overdue') return 'badge-danger';
    if (s === 'scheduled') return 'badge-primary';
    return 'badge-secondary';
  }

  /* ==========================================================
     HISTORY TAB
     ========================================================== */
  function renderHistoryTab(el) {
    el.innerHTML = '' +
      '<div class="qr-history-filters">' +
        '<select class="form-select" id="qr-hist-module" onchange="QRModule.filterHistory()">' +
          '<option value="">All Modules</option>' +
          _modules.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') +
        '</select>' +
        '<input type="date" class="form-input" id="qr-hist-start" onchange="QRModule.filterHistory()" placeholder="Start Date">' +
        '<input type="date" class="form-input" id="qr-hist-end" onchange="QRModule.filterHistory()" placeholder="End Date">' +
        '<input type="text" class="form-input" id="qr-hist-search" placeholder="Search..." oninput="QRModule.filterHistory()" style="flex:1;min-width:150px">' +
      '</div>' +
      '<div id="qr-history-stats" class="qr-stats-row" style="margin-bottom:16px"></div>' +
      '<div class="card">' +
        '<div id="qr-history-list"></div>' +
        '<div id="qr-history-pagination" class="pagination"></div>' +
      '</div>';
    loadHistory();
  }

  function loadHistory() {
    var filters = {};
    var moduleEl = document.getElementById('qr-hist-module');
    var startEl = document.getElementById('qr-hist-start');
    var endEl = document.getElementById('qr-hist-end');
    var searchEl = document.getElementById('qr-hist-search');
    if (moduleEl && moduleEl.value) filters.module = moduleEl.value;
    if (startEl && startEl.value) filters.startDate = startEl.value;
    if (endEl && endEl.value) filters.endDate = endEl.value + 'T23:59:59';
    if (searchEl && searchEl.value) filters.search = searchEl.value;
    filters.page = _historyPage;
    filters.pageSize = _historyPageSize;

    API.call('getQRScanHistory', filters)
      .then(function(data) {
        _history = data.records || [];
        _historyTotal = data.total || 0;
        renderHistoryList();
        renderHistoryPagination(data);
      })
      .catch(function(err) {
        var listEl = document.getElementById('qr-history-list');
        if (listEl) listEl.innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load history: ' + App.escHtml(err.message) + '</div></div>';
      });

    API.call('getQRScanStats', {})
      .then(function(stats) {
        renderHistoryStats(stats);
      })
      .catch(function() {});
  }

  function renderHistoryStats(stats) {
    var el = document.getElementById('qr-history-stats');
    if (!el) return;
    el.innerHTML = '' +
      qrStatCardHTML(stats.totalScans || 0, '&#128247;', 'Total Scans') +
      qrStatCardHTML(stats.todayScans || 0, '&#128197;', 'Today') +
      qrStatCardHTML(Object.keys(stats.byModule || {}).length, '&#128193;', 'Modules') +
      qrStatCardHTML(Object.keys(stats.byUser || {}).length, '&#128100;', 'Users');
  }

  function qrStatCardHTML(num, icon, label) {
    return '<div class="qr-stat-card"><div class="stat-icon">' + icon + '</div><div class="stat-num">' + num + '</div><div class="stat-lbl">' + label + '</div></div>';
  }

  function renderHistoryList() {
    var el = document.getElementById('qr-history-list');
    if (!el) return;
    if (_history.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128247;</div><div class="empty-state-text">No scan history found</div></div>';
      return;
    }
    var html = '<div style="display:flex;flex-direction:column;gap:6px">';
    _history.forEach(function(scan) {
      var modClass = _moduleClasses[scan.QRModule] || '';
      var time = App.formatDateTime(scan.ScanDateTime);
      html += '<div class="qr-history-card">' +
        '<div class="qr-history-card-icon ' + modClass + '" style="background:var(--surface);border:1px solid var(--border)">' +
          (_moduleIcons[scan.QRModule] || '?') +
        '</div>' +
        '<div class="qr-history-card-info">' +
          '<div class="qr-history-card-title">' + App.escHtml(scan.RecordName || scan.RecordID || 'Unknown') + '</div>' +
          '<div class="qr-history-card-meta">' +
            '<span class="qr-module-tag ' + modClass + '">' + App.escHtml(scan.QRModule || '') + '</span>' +
            '<span>' + App.escHtml(scan.RecordID || '') + '</span>' +
            '<span>' + App.escHtml(scan.UserName || scan.UserEmail || '') + '</span>' +
            (scan.DeviceType ? '<span>' + App.escHtml(scan.DeviceType) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="qr-history-card-time">' + App.escHtml(time) + '</div>' +
      '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function renderHistoryPagination(data) {
    var el = document.getElementById('qr-history-pagination');
    if (!el || !data || data.totalPages <= 1) { if (el) el.innerHTML = ''; return; }
    var html = '';
    html += '<button ' + (_historyPage <= 1 ? 'disabled' : '') + ' onclick="QRModule.historyPage(' + (_historyPage - 1) + ')">Prev</button>';
    var startP = Math.max(1, _historyPage - 2);
    var endP = Math.min(data.totalPages, _historyPage + 2);
    for (var i = startP; i <= endP; i++) {
      html += '<button class="' + (i === _historyPage ? 'active' : '') + '" onclick="QRModule.historyPage(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (_historyPage >= data.totalPages ? 'disabled' : '') + ' onclick="QRModule.historyPage(' + (_historyPage + 1) + ')">Next</button>';
    html += '<span style="font-size:12px;color:var(--text-muted);margin-left:8px">Page ' + _historyPage + ' of ' + data.totalPages + ' (' + _historyTotal + ' total)</span>';
    el.innerHTML = html;
  }

  function filterHistory() {
    _historyPage = 1;
    loadHistory();
  }

  function historyPage(p) {
    _historyPage = p;
    loadHistory();
  }

  /* ==========================================================
     SEARCH TAB
     ========================================================== */
  function renderSearchTab(el) {
    el.innerHTML = '' +
      '<div style="max-width:600px;margin:0 auto">' +
        '<div class="qr-manual-input">' +
          '<input type="text" class="form-input" id="qr-search-input" placeholder="Search by Machine Name, Asset No, Job Card, Part Number, QR ID..." onkeydown="if(event.key===\'Enter\')QRModule.doSearch()">' +
          '<button class="btn btn-primary" onclick="QRModule.doSearch()">Search</button>' +
        '</div>' +
        '<div id="qr-search-results" style="margin-top:20px">' +
          '<div class="qr-scanner-empty">' +
            '<div class="qr-scanner-empty-icon">&#128269;</div>' +
            '<h3>Search Records</h3>' +
            '<p>Search across all machines, assets, job cards, and spare parts</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function doSearch() {
    var inp = document.getElementById('qr-search-input');
    var query = inp ? inp.value.trim() : '';
    if (!query) { App.showToast('Enter a search term', 'warning'); return; }
    _searchQuery = query;
    var resultsEl = document.getElementById('qr-search-results');
    if (resultsEl) resultsEl.innerHTML = '<div style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto"></div><p style="color:var(--text-muted);margin-top:12px">Searching...</p></div>';

    API.call('searchQRRecords', { query: query })
      .then(function(results) {
        _searchResults = results || [];
        renderSearchResults(resultsEl);
      })
      .catch(function(err) {
        if (resultsEl) resultsEl.innerHTML = '<div class="empty-state"><div class="empty-state-text">Search failed: ' + App.escHtml(err.message) + '</div></div>';
      });
  }

  function renderSearchResults(container) {
    if (!container) container = document.getElementById('qr-search-results');
    if (!container) return;
    if (_searchResults.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128269;</div><div class="empty-state-text">No results found for "' + App.escHtml(_searchQuery) + '"</div></div>';
      return;
    }
    var html = '<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">' + _searchResults.length + ' result(s) found</p>';
    html += '<div class="qr-search-results">';
    _searchResults.forEach(function(r) {
      var modClass = _moduleClasses[r.module] || '';
      html += '<div class="qr-search-result-item" onclick="QRModule.viewSearchResult(\'' + App.escHtml(r.module) + '\', \'' + App.escHtml(r.id) + '\')">' +
        '<div class="qr-search-result-icon ' + modClass + '" style="background:var(--surface);border:1px solid var(--border)">' +
          (_moduleIcons[r.module] || '?') +
        '</div>' +
        '<div class="qr-search-result-info">' +
          '<div class="qr-search-result-name">' + App.escHtml(r.name || r.id) + '</div>' +
          '<div class="qr-search-result-meta">' +
            '<span class="qr-module-tag ' + modClass + '">' + App.escHtml(r.module) + '</span>' +
            '<span>' + App.escHtml(r.id) + '</span>' +
            (r.department ? '<span>' + App.escHtml(r.department) + '</span>' : '') +
            (r.status ? '<span class="badge ' + getStatusBadge(r.status) + '">' + App.escHtml(r.status) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function viewSearchResult(module, recordId) {
    API.call('getModuleRecordDetail', { module: module, recordId: recordId })
      .then(function(data) {
        if (data && data.error) {
          App.showToast(data.error, 'error');
          return;
        }
        _tab = 'scanner';
        render();
        setTimeout(function() {
          var detailContainer = document.getElementById('qr-detail-container');
          if (detailContainer) {
            _scanResult = data;
            renderDetailResult(detailContainer, data);
          }
        }, 50);
      })
      .catch(function(err) {
        App.showToast('Failed to load record: ' + err.message, 'error');
      });
  }

  /* ==========================================================
     PRINT TAB
     ========================================================== */
  function renderPrintTab(el) {
    el.innerHTML = '' +
      '<div style="max-width:800px;margin:0 auto">' +
        '<div class="card" style="margin-bottom:20px">' +
          '<div class="card-header"><div class="card-title">Generate QR Label</div></div>' +
          '<div class="grid grid-3">' +
            '<div class="form-group"><label class="form-label">Module</label>' +
              '<select class="form-select" id="qr-print-module" onchange="QRModule.loadPrintRecords()">' +
                '<option value="">Select Module</option>' +
                _modules.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Record</label>' +
              '<select class="form-select" id="qr-print-record"><option value="">Select record...</option></select>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Label Size</label>' +
              '<select class="form-select" id="qr-print-size">' +
                '<option value="50x25mm">50 x 25 mm (Small)</option>' +
                '<option value="75x50mm" selected>75 x 50 mm (Medium)</option>' +
                '<option value="100x50mm">100 x 50 mm (Large)</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-top:8px">' +
            '<button class="btn btn-primary" onclick="QRModule.generatePrintLabel()">Generate Label</button>' +
            '<button class="btn btn-secondary" onclick="QRModule.bulkGenerateQR()">Bulk Generate QR</button>' +
          '</div>' +
        '</div>' +
        '<div id="qr-print-preview"></div>' +
      '</div>';
  }

  function loadPrintRecords() {
    var moduleEl = document.getElementById('qr-print-module');
    var recordEl = document.getElementById('qr-print-record');
    if (!moduleEl || !recordEl) return;
    var module = moduleEl.value;
    recordEl.innerHTML = '<option value="">Loading...</option>';

    if (!module) { recordEl.innerHTML = '<option value="">Select record...</option>'; return; }

    API.call('getQRModuleRecords', { module: module })
      .then(function(records) {
        var html = '<option value="">Select record...</option>';
        (records || []).forEach(function(r) {
          html += '<option value="' + App.escHtml(r.id) + '">' + App.escHtml(r.name || r.id) + ' (' + App.escHtml(r.id) + ')</option>';
        });
        recordEl.innerHTML = html;
      })
      .catch(function() {
        recordEl.innerHTML = '<option value="">Failed to load</option>';
      });
  }

  function generatePrintLabel() {
    var moduleEl = document.getElementById('qr-print-module');
    var recordEl = document.getElementById('qr-print-record');
    var sizeEl = document.getElementById('qr-print-size');
    var previewEl = document.getElementById('qr-print-preview');
    if (!moduleEl || !recordEl || !previewEl) return;

    var module = moduleEl.value;
    var recordId = recordEl.value;
    var size = sizeEl ? sizeEl.value : '75x50mm';

    if (!module || !recordId) { App.showToast('Select module and record', 'warning'); return; }

    previewEl.innerHTML = '<div style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto"></div></div>';

    API.call('getPrintLabelData', { module: module, recordId: recordId, labelSize: size })
      .then(function(data) {
        if (!data) { previewEl.innerHTML = '<p style="color:var(--danger)">No data found</p>'; return; }
        var sizeClass = 'size-medium';
        if (size === '50x25mm') sizeClass = 'size-small';
        else if (size === '100x50mm') sizeClass = 'size-large';
        else if (size === 'A4 Multiple') sizeClass = 'size-a4';

        var qrUrl = data.qrContent ? 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(data.qrContent) : '';

        previewEl.innerHTML = '' +
          '<div class="card">' +
            '<div class="card-header"><div class="card-title">Label Preview</div>' +
              '<button class="btn btn-primary btn-sm" onclick="QRModule.printLabelWindow()">&#128424; Print</button>' +
            '</div>' +
            '<div style="text-align:center;padding:20px;background:#fff;border-radius:8px;margin:0 auto" id="qr-print-area">' +
              '<div class="qr-print-label ' + sizeClass + '">' +
                '<div class="company-name">PAKISTAN WIRE INDUSTRIES (PVT.) LTD.</div>' +
                '<div class="item-name">' + App.escHtml(data.name || '') + '</div>' +
                '<div class="item-code">' + App.escHtml(data.code || '') + '</div>' +
                (data.department ? '<div class="item-detail">' + App.escHtml(data.department) + '</div>' : '') +
                (data.location ? '<div class="item-detail">Location: ' + App.escHtml(data.location) + '</div>' : '') +
                '<div class="item-id">' + App.escHtml(module) + ' #' + App.escHtml(data.recordId || '') + '</div>' +
                (qrUrl ? '<div style="margin:8px auto"><img src="' + qrUrl + '" width="120" height="120" alt="QR Code" style="display:block;margin:0 auto"></div>' : '<div style="margin:8px auto;color:#999;font-size:10px">QR Code</div>') +
                (data.barcode ? '<div class="barcode-text">' + App.escHtml(data.barcode) + '</div>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
      })
      .catch(function(err) {
        previewEl.innerHTML = '<p style="color:var(--danger)">Error: ' + App.escHtml(err.message) + '</p>';
      });
  }

  function printLabelWindow() {
    var printArea = document.getElementById('qr-print-area');
    if (!printArea) return;
    var win = window.open('', '_blank', 'width=600,height=400');
    win.document.write('<!DOCTYPE html><html><head><title>Print QR Label</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Arial,sans-serif}</style></head><body>' + printArea.innerHTML + '</body></html>');
    win.document.close();
    win.onload = function() {
      win.print();
      win.close();
    };
  }

  function showPrintDialog(module, recordId) {
    _tab = 'print';
    render();
    setTimeout(function() {
      var moduleEl = document.getElementById('qr-print-module');
      var recordEl = document.getElementById('qr-print-record');
      if (moduleEl) moduleEl.value = module;
      if (module) loadPrintRecords();
      setTimeout(function() {
        if (recordEl) recordEl.value = recordId;
        generatePrintLabel();
      }, 500);
    }, 100);
  }

  function bulkGenerateQR() {
    var moduleEl = document.getElementById('qr-print-module');
    if (!moduleEl || !moduleEl.value) { App.showToast('Select a module first', 'warning'); return; }
    var module = moduleEl.value;
    App.showConfirm('Bulk Generate', 'Generate QR codes for all ' + module + ' records that don\'t have one yet?', function() {
      App.showLoading(true);
      API.call('bulkGenerateQRCode', { module: module })
        .then(function(results) {
          App.showLoading(false);
          App.showToast('Generated ' + (results ? results.length : 0) + ' QR codes', 'success');
        })
        .catch(function(err) {
          App.showLoading(false);
          App.showToast('Error: ' + err.message, 'error');
        });
    });
  }

  /* ==========================================================
     OFFLINE MODE
     ========================================================== */
  function storeOfflineScan(content) {
    try {
      var scans = JSON.parse(localStorage.getItem('cmms_offline_qr') || '[]');
      scans.push({
        content: content,
        timestamp: new Date().toISOString(),
        user: Auth.getEmail() || 'unknown',
        device: getDeviceInfo()
      });
      localStorage.setItem('cmms_offline_qr', JSON.stringify(scans));
      _pendingScans = scans;
    } catch(e) {
      console.error('Failed to store offline scan:', e);
    }
  }

  function syncOfflineScans() {
    if (!navigator.onLine) return;
    try {
      var scans = JSON.parse(localStorage.getItem('cmms_offline_qr') || '[]');
      if (scans.length === 0) return;
      var chain = Promise.resolve();
      scans.forEach(function(scan) {
        chain = chain.then(function() {
          return API.call('logQRScan', {
            module: 'Unknown',
            recordId: '',
            recordName: 'Offline Scan',
            scanResult: 'Offline',
            deviceType: scan.device,
            action: 'Offline Scan',
            browserInfo: navigator.userAgent
          }).catch(function() {});
        });
      });
      chain.then(function() {
        localStorage.removeItem('cmms_offline_qr');
        _pendingScans = [];
        App.showToast('Offline scans synced', 'success');
      });
    } catch(e) {
      console.error('Failed to sync offline scans:', e);
    }
  }

  function getDeviceInfo() {
    var ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }

  /* ==========================================================
     PUBLIC API
     ========================================================== */
  window.QRModule = {
    switchTab: function(tab) {
      _tab = tab;
      if (_isScanning) stopScanner();
      render();
      if (tab === 'history') loadHistory();
    },
    toggleScanner: toggleScanner,
    openManualInput: openManualInput,
    closeManualInput: closeManualInput,
    submitManualInput: submitManualInput,
    filterHistory: filterHistory,
    historyPage: historyPage,
    doSearch: doSearch,
    viewSearchResult: viewSearchResult,
    loadPrintRecords: loadPrintRecords,
    generatePrintLabel: generatePrintLabel,
    printLabelWindow: printLabelWindow,
    showPrintDialog: showPrintDialog,
    bulkGenerateQR: bulkGenerateQR,
    rescan: function() {
      _scanResult = null;
      var detailEl = document.getElementById('qr-detail-container');
      if (detailEl) detailEl.innerHTML = '';
      _tab = 'scanner';
      render();
    },
    retryLookup: function(content) {
      if (content) fetchQRDetail(content);
    }
  };

  /* ==========================================================
     ONLINE/OFFLINE DETECTION
     ========================================================== */
  window.addEventListener('online', function() {
    syncOfflineScans();
    var badge = document.querySelector('.qr-offline-badge');
    if (badge) { render(); }
  });
  window.addEventListener('offline', function() {
    var pageHeader = document.querySelector('#page-qr .page-header h2');
    if (pageHeader && !document.querySelector('.qr-offline-badge')) {
      var badge = document.createElement('span');
      badge.className = 'qr-offline-badge';
      badge.innerHTML = '<span class="dot"></span>Offline';
      pageHeader.parentElement.appendChild(badge);
    }
  });

})();
