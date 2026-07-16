/* ============================================================
   openjc.js — Open Job Card Form
   GAS-identical: OpenJobCardPage.html
   Features: cascading Section→Dept→Machine→Asset dropdowns,
   ComplaintCategory, Priority, ComplaintDescription with
   Voice Input, DateTime auto-fill, ComplaintBy auto-fill,
   Fault Image upload (camera/gallery), Submit stays on page.
   ============================================================ */

(function() {
  var _sections = [];
  var _departments = [];
  var _machines = [];
  var _assets = [];

  App.registerPage('openjc', render, load);

  function render() {
    var el = document.getElementById('page-openjc');
    if (!Auth.canOpenJobCard()) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:12px">' +
        '<div style="font-size:48px">&#128274;</div>' +
        '<h2>Access Denied</h2>' +
        '<p style="color:var(--text-muted)">You do not have permission to open job cards.</p></div>';
      return;
    }
    el.innerHTML =
      '<div class="card" style="max-width:860px;margin:0 auto">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot status-open" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px var(--primary-glow);vertical-align:middle;margin-right:8px"></span>' +
            'Open New Job Card' +
          '</div>' +
        '</div>' +
        '<form id="createJobCardForm" onsubmit="return false">' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Section *</label>' +
              '<select name="Section" class="form-control" id="jcSection" required><option value="">Select Section</option></select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>Department *</label>' +
              '<select name="Department" class="form-control" id="jcDepartment" required><option value="">Select Department</option></select>' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M12 18V6"/><path d="M6 12h12"/></svg>Machine *</label>' +
              '<select name="Machine" class="form-control" id="jcMachine" required><option value="">Select Machine</option></select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Asset *</label>' +
              '<select name="AssetID" class="form-control" id="jcAsset" required><option value="">Select Asset</option></select>' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>Complaint Category *</label>' +
              '<select name="ComplaintCategory" class="form-control" id="jcComplaintCategory" required><option value="">Select Category</option></select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Priority *</label>' +
              '<select name="Priority" class="form-control" required><option value="">Select Priority</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select>' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Complaint Description *</label>' +
            '<textarea name="ComplaintDescription" id="jcComplaintDesc" class="form-control" rows="4" placeholder="Describe the issue in detail..." required></textarea>' +
            '<div style="display:flex;gap:6px;margin-top:4px">' +
              '<button type="button" class="btn btn-sm btn-secondary" id="ojc-voice-btn" style="font-size:11px;padding:3px 8px">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>' +
                ' Voice Input' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Open Date &amp; Time (Auto)</label>' +
              '<input type="text" class="form-control" id="jcDateTime" readonly tabindex="-1">' +
            '</div>' +
            '<div class="form-group">' +
              '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Complaint By</label>' +
              '<input type="text" name="ComplaintBy" class="form-control" id="jcComplaintBy" readonly tabindex="-1">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Fault Image</label>' +
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<div class="image-upload-area" id="jcFaultImageArea" style="flex:1;min-height:120px">' +
                '<input type="file" accept="image/*" id="jcFaultImageInput" style="display:none">' +
                '<input type="file" accept="image/*" capture="environment" id="jcCameraInput" style="display:none">' +
                '<input type="hidden" name="FaultImage" id="jcFaultImageData">' +
                '<div class="upload-placeholder" id="jcFaultImagePlaceholder" style="flex-direction:column;gap:8px;cursor:pointer">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                  '<span>Tap to Upload or Take Photo</span>' +
                  '<small>JPG, PNG, WEBP (max 5MB)</small>' +
                '</div>' +
                '<div class="image-preview" id="jcFaultImagePreview" style="display:none">' +
                  '<img id="jcFaultImagePreviewImg" alt="Fault Image Preview">' +
                  '<button type="button" class="image-remove-btn" id="ojc-remove-image">&times;</button>' +
                '</div>' +
              '</div>' +
              '<button type="button" class="btn btn-secondary" id="ojc-camera-btn" style="display:flex;align-items:center;gap:6px;padding:10px 16px;white-space:nowrap;margin-top:0">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
                ' Camera' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:0">' +
            '<small style="color:var(--text-muted);font-size:11px">' +
              'Job Card No will be auto-generated (e.g. JC-2026-000001). ' +
              'Status will be set to <strong>OPEN</strong>. ' +
              'Waiting Time will be <strong>00:00</strong>.' +
            '</small>' +
          '</div>' +
          '<div class="card-actions" style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border);justify-content:flex-end">' +
            '<button type="submit" class="btn btn-primary" id="jcSubmitBtn">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>' +
              ' Save Job Card' +
            '</button>' +
            '<button type="button" class="btn btn-secondary" id="ojc-reset-btn">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>' +
              ' Reset' +
            '</button>' +
            '<button type="button" class="btn btn-secondary" id="ojc-cancel-btn">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
              ' Cancel' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div>';
  }

  function load() {
    App.showLoading(true);
    var loaded = { sections: false, departments: false, machines: false, assets: false };
    function checkDone() {
      if (loaded.sections && loaded.departments && loaded.machines && loaded.assets) {
        App.showLoading(false);
        populateSectionDropdown();
        populateOpenFormFields();
      }
    }

    API.call('getSectionList').then(function(data) {
      _sections = data || [];
      loaded.sections = true;
      checkDone();
    }).catch(function() {
      loaded.sections = true;
      checkDone();
      App.showToast('Failed to load sections', 'error');
    });

    API.call('getDepartmentList').then(function(data) {
      _departments = data || [];
      loaded.departments = true;
      checkDone();
    }).catch(function() {
      loaded.departments = true;
      checkDone();
      App.showToast('Failed to load departments', 'error');
    });

    API.call('getMachineList').then(function(data) {
      _machines = data || [];
      loaded.machines = true;
      checkDone();
    }).catch(function() {
      loaded.machines = true;
      checkDone();
      App.showToast('Failed to load machines', 'error');
    });

    API.call('getAssets').then(function(data) {
      _assets = data || [];
      loaded.assets = true;
      checkDone();
    }).catch(function() {
      loaded.assets = true;
      checkDone();
      App.showToast('Failed to load assets', 'error');
    });

    var secEl = document.getElementById('jcSection');
    if (secEl) secEl.onchange = onJcSectionChange;
    var deptEl = document.getElementById('jcDepartment');
    if (deptEl) deptEl.onchange = onJcDeptChange;
    var machineEl = document.getElementById('jcMachine');
    if (machineEl) machineEl.onchange = onJcMachineChange;
    var assetEl = document.getElementById('jcAsset');
    if (assetEl) assetEl.onchange = onJcAssetChange;

    var submitBtn = document.getElementById('jcSubmitBtn');
    if (submitBtn) submitBtn.onclick = saveJobCard;
    var resetBtn = document.getElementById('ojc-reset-btn');
    if (resetBtn) resetBtn.onclick = resetOpenForm;
    var cancelBtn = document.getElementById('ojc-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = cancelOpenForm;

    var placeholder = document.getElementById('jcFaultImagePlaceholder');
    if (placeholder) placeholder.onclick = function() { showCameraMenu('jcFaultImageInput', { title: 'Fault Photo', capture: 'environment' }); };
    var cameraBtn = document.getElementById('ojc-camera-btn');
    if (cameraBtn) cameraBtn.onclick = function() { var el = document.getElementById('jcCameraInput'); if (el) el.click(); };
    var removeBtn = document.getElementById('ojc-remove-image');
    if (removeBtn) removeBtn.onclick = removeFaultImage;

    var galleryInput = document.getElementById('jcFaultImageInput');
    if (galleryInput) galleryInput.onchange = handleFaultImageSelect;
    var cameraInput = document.getElementById('jcCameraInput');
    if (cameraInput) cameraInput.onchange = handleFaultImageSelect;

    var voiceBtn = document.getElementById('ojc-voice-btn');
    if (voiceBtn) voiceBtn.onclick = function() { startVoiceInput('jcComplaintDesc'); };
  }

  function populateSectionDropdown() {
    var sel = document.getElementById('jcSection');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Section</option>';
    _sections.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s.Section || '';
      opt.textContent = s.Section || '';
      sel.appendChild(opt);
    });
  }

  function populateOpenFormFields() {
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var el = document.getElementById('jcDateTime');
    if (el) el.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

    el = document.getElementById('jcComplaintBy');
    if (el) el.value = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';

    var cats = ['Mechanical Failure', 'Electrical Failure', 'Hydraulic Failure', 'Pneumatic Failure', 'Software Issue', 'Safety Issue', 'Routine Maintenance', 'Other'];
    populateSelectFromList('jcComplaintCategory', cats, 'Select Category');
  }

  function onJcSectionChange() {
    var sectionName = document.getElementById('jcSection').value;
    var deptSel = document.getElementById('jcDepartment');
    var machineSel = document.getElementById('jcMachine');
    var assetSel = document.getElementById('jcAsset');
    if (deptSel) deptSel.innerHTML = '<option value="">Select Department</option>';
    if (machineSel) machineSel.innerHTML = '<option value="">Select Machine</option>';
    if (assetSel) assetSel.innerHTML = '<option value="">Select Asset</option>';
    if (!sectionName) return;
    _departments.forEach(function(d) {
      if (d.Section === sectionName || d.SectionID === sectionName) {
        var opt = document.createElement('option');
        opt.value = d.Department || '';
        opt.textContent = d.Department || '';
        deptSel.appendChild(opt);
      }
    });
  }

  function onJcDeptChange() {
    var deptName = document.getElementById('jcDepartment').value;
    var machineSel = document.getElementById('jcMachine');
    var assetSel = document.getElementById('jcAsset');
    if (machineSel) machineSel.innerHTML = '<option value="">Select Machine</option>';
    if (assetSel) assetSel.innerHTML = '<option value="">Select Asset</option>';
    if (!deptName) return;
    _machines.forEach(function(m) {
      if (m.Department === deptName) {
        var opt = document.createElement('option');
        opt.value = m.MachineName || '';
        opt.textContent = (m.MachineName || '') + (m.MachineCode ? ' (' + m.MachineCode + ')' : '');
        machineSel.appendChild(opt);
      }
    });
  }

  function onJcMachineChange() {
    var machineName = document.getElementById('jcMachine').value;
    var assetSel = document.getElementById('jcAsset');
    if (assetSel) assetSel.innerHTML = '<option value="">Select Asset</option>';
    if (!machineName) return;
    _assets.forEach(function(a) {
      if (a.MachineName === machineName) {
        var opt = document.createElement('option');
        opt.value = a.AssetID || '';
        opt.textContent = (a.AssetID || '') + (a.AssetName ? ' - ' + a.AssetName : '');
        assetSel.appendChild(opt);
      }
    });
  }

  function onJcAssetChange() {
    var assetId = document.getElementById('jcAsset').value;
    if (!assetId) return;
    var asset = _assets.find(function(a) { return a.AssetID === assetId; });
    if (asset && asset.MachineName) {
      var machineSel = document.getElementById('jcMachine');
      for (var i = 0; i < machineSel.options.length; i++) {
        if (machineSel.options[i].value === asset.MachineName) {
          machineSel.value = asset.MachineName;
          break;
        }
      }
    }
  }

  function populateSelectFromList(id, list, defaultText) {
    var select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '';
    if (defaultText) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultText;
      select.appendChild(opt);
    }
    (list || []).forEach(function(val) {
      if (val) {
        var opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }
    });
  }

  function handleFaultImageSelect(evt) {
    var file = evt.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      App.showToast('Image must be less than 5MB', 'error');
      evt.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var el = document.getElementById('jcFaultImageData');
      if (el) el.value = e.target.result;
      var preview = document.getElementById('jcFaultImagePreview');
      var placeholder = document.getElementById('jcFaultImagePlaceholder');
      if (preview) preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      el = document.getElementById('jcFaultImagePreviewImg');
      if (el) el.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeFaultImage() {
    var el = document.getElementById('jcFaultImageData');
    if (el) el.value = '';
    el = document.getElementById('jcFaultImageInput');
    if (el) el.value = '';
    el = document.getElementById('jcCameraInput');
    if (el) el.value = '';
    el = document.getElementById('jcFaultImagePreview');
    if (el) el.style.display = 'none';
    var ph = document.getElementById('jcFaultImagePlaceholder');
    if (ph) ph.style.display = 'flex';
  }

  function showCameraMenu(targetId, opts) {
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.style.zIndex = '2000';
    overlay.innerHTML =
      '<div class="modal" style="max-width:340px;margin:auto">' +
        '<div class="modal-header"><div class="modal-title">' + (opts.title || 'Capture Photo') + '</div>' +
        '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button></div>' +
        '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">' +
          '<button class="btn btn-primary btn-block cam-btn" style="min-height:52px;font-size:15px;justify-content:center" data-target="' + targetId + '" data-mode="camera">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
            ' Take Photo' +
          '</button>' +
          '<button class="btn btn-secondary btn-block cam-btn" style="min-height:52px;font-size:15px;justify-content:center" data-target="' + targetId + '" data-mode="gallery">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
            ' Choose from Gallery' +
          '</button>' +
        '</div>' +
      '</div>';
    overlay.querySelectorAll('.cam-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        overlay.remove();
        var mode = btn.getAttribute('data-mode');
        if (mode === 'gallery') {
          var galleryEl = document.getElementById(targetId);
          if (galleryEl) galleryEl.click();
        } else {
          var cameraMap = { 'jcFaultImageInput': 'jcCameraInput' };
          var cameraInputId = cameraMap[targetId];
          var cameraEl = cameraInputId ? document.getElementById(cameraInputId) : null;
          if (cameraEl) {
            cameraEl.click();
          } else {
            App.showToast('Camera not available', 'warning');
          }
        }
      });
    });
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  function startVoiceInput(textareaId) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      App.showToast('Voice input is not supported in this browser', 'error');
      return;
    }
    var textarea = document.getElementById(textareaId);
    if (!textarea) return;
    var recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    var voiceBtn = document.getElementById('ojc-voice-btn');
    if (voiceBtn) voiceBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/></svg> Listening...';
    recognition.onresult = function(event) {
      var transcript = event.results[0][0].transcript;
      textarea.value = (textarea.value ? textarea.value + ' ' : '') + transcript;
      if (voiceBtn) voiceBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input';
    };
    recognition.onerror = function() {
      if (voiceBtn) voiceBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input';
      App.showToast('Voice input failed. Please try again.', 'error');
    };
    recognition.onend = function() {
      if (voiceBtn) voiceBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg> Voice Input';
    };
    recognition.start();
  }

  function resetOpenForm() {
    var form = document.getElementById('createJobCardForm');
    if (form) form.reset();
    removeFaultImage();
    var el = document.getElementById('jcDepartment');
    if (el) el.innerHTML = '<option value="">Select Department</option>';
    el = document.getElementById('jcMachine');
    if (el) el.innerHTML = '<option value="">Select Machine</option>';
    el = document.getElementById('jcAsset');
    if (el) el.innerHTML = '<option value="">Select Asset</option>';
    el = document.getElementById('jcComplaintBy');
    if (el) el.value = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    el = document.getElementById('jcDateTime');
    if (el) el.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }

  function cancelOpenForm() {
    var form = document.getElementById('createJobCardForm');
    if (form) form.reset();
  }

  function saveJobCard(e) {
    if (e) e.preventDefault();
    if (!Auth.canOpenJobCard() && !Auth.isAdmin()) {
      App.showToast('You do not have permission to open job cards', 'warning');
      return;
    }
    var data = getFormData('createJobCardForm');
    if (!data.Section) { App.showToast('Please select a Section', 'error'); return; }
    if (!data.Department) { App.showToast('Please select a Department', 'error'); return; }
    if (!data.Machine) { App.showToast('Please select a Machine', 'error'); return; }
    if (!data.AssetID) { App.showToast('Please select an Asset', 'error'); return; }
    if (!data.ComplaintCategory) { App.showToast('Please select a Complaint Category', 'error'); return; }
    if (!data.ComplaintDescription) { App.showToast('Please enter a Complaint Description', 'error'); return; }
    if (!data.Priority) { App.showToast('Please select a Priority', 'error'); return; }

    var btn = document.getElementById('jcSubmitBtn');
    if (btn) { btn.textContent = 'Submitting...'; btn.disabled = true; }

    API.call('addJobCard', data)
      .then(function(result) {
        if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Save Job Card'; btn.disabled = false; }
        App.showToast('Job Card Saved Successfully', 'success');
        resetOpenForm();
        load();
      })
      .catch(function(err) {
        if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Save Job Card'; btn.disabled = false; }
        App.showToast(err.message || 'Failed to open job card', 'error');
      });
  }

})();
