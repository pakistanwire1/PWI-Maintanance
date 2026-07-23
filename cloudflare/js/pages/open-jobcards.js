var OpenJobCard = (function() {
  var state = { sections: [], departments: [], machines: [], assets: [] };

  var COMPLAINT_CATEGORIES = [
    'Mechanical Failure', 'Electrical Failure', 'Hydraulic Failure',
    'Pneumatic Failure', 'Software Issue', 'Safety Issue',
    'Routine Maintenance', 'Other'
  ];

  var ICON_LABEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px">';
  var ICON_USER = ICON_LABEL + '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var ICON_BRIEFCASE = ICON_LABEL + '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>';
  var ICON_GRID = ICON_LABEL + '<rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M12 18V6"/><path d="M6 12h12"/></svg>';
  var ICON_INFO = ICON_LABEL + '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
  var ICON_STAR = ICON_LABEL + '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  var ICON_CHAT = ICON_LABEL + '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  var ICON_CLOCK = ICON_LABEL + '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var ICON_IMAGE = ICON_LABEL + '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

  var ICON_BTN_SAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
  var ICON_BTN_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>';
  var ICON_BTN_CANCEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ICON_CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  var ICON_UPLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  var ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>';

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="openjobcardPage" class="page"><div class="card" style="max-width:860px;margin:0 auto">' +
        '<div class="card-header">' +
          '<div class="card-title">' +
            '<span class="status-dot status-open" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px var(--primary-glow);vertical-align:middle;margin-right:8px"></span>' +
            'Open New Job Card' +
          '</div>' +
        '</div>' +
        '<form id="createJobCardForm" onsubmit="return OpenJobCard.save(event)">' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label>' + ICON_USER + ' Section *</label>' +
              '<select name="Section" class="form-control" id="jcSection" required onchange="OpenJobCard.onSectionChange()">' +
                '<option value="">Select Section</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>' + ICON_BRIEFCASE + ' Department *</label>' +
              '<select name="Department" class="form-control" id="jcDepartment" required onchange="OpenJobCard.onDeptChange()">' +
                '<option value="">Select Department</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label>' + ICON_GRID + ' Machine *</label>' +
              '<select name="Machine" class="form-control" id="jcMachine" required onchange="OpenJobCard.onMachineChange()">' +
                '<option value="">Select Machine</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>' + ICON_USER + ' Asset *</label>' +
              '<select name="AssetID" class="form-control" id="jcAsset" required onchange="OpenJobCard.onAssetChange()">' +
                '<option value="">Select Asset</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label>' + ICON_INFO + ' Complaint Category *</label>' +
              '<select name="ComplaintCategory" class="form-control" id="jcComplaintCategory" required>' +
                '<option value="">Select Category</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>' + ICON_STAR + ' Priority *</label>' +
              '<select name="Priority" class="form-control" required>' +
                '<option value="">Select Priority</option>' +
                '<option value="Low">Low</option>' +
                '<option value="Medium">Medium</option>' +
                '<option value="High">High</option>' +
                '<option value="Critical">Critical</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>' + ICON_CHAT + ' Complaint Description *</label>' +
            '<textarea name="ComplaintDescription" id="jcComplaintDesc" class="form-control" rows="4" placeholder="Describe the issue in detail..." required></textarea>' +
            '<div style="display:flex;gap:6px;margin-top:4px">' +
              '<button type="button" class="btn btn-sm btn-secondary" onclick="OpenJobCard.addVoiceButton(\'jcComplaintDesc\')" title="Add voice input button" style="font-size:11px;padding:3px 8px">' +
                ICON_MIC + ' Voice Input' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label>' + ICON_CLOCK + ' Open Date &amp; Time (Auto)</label>' +
              '<input type="text" class="form-control" id="jcDateTime" readonly tabindex="-1">' +
            '</div>' +
            '<div class="form-group">' +
              '<label>' + ICON_USER + ' Complaint By</label>' +
              '<input type="text" name="ComplaintBy" class="form-control" id="jcComplaintBy" readonly tabindex="-1">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>' + ICON_IMAGE + ' Fault Image</label>' +
            '<div class="fault-image-row">' +
              '<div class="image-upload-area" id="jcFaultImageArea">' +
                '<input type="file" accept="image/*" id="jcFaultImageInput" style="display:none" onchange="OpenJobCard.handleFaultImageSelect(event)">' +
                '<input type="file" accept="image/*" capture="environment" id="jcCameraInput" style="display:none" onchange="OpenJobCard.handleFaultImageSelect(event)">' +
                '<input type="hidden" name="FaultImage" id="jcFaultImageData">' +
                '<div class="upload-placeholder" onclick="showCameraMenu(\'jcFaultImageInput\',{title:\'Fault Photo\',capture:\'environment\'})" style="flex-direction:column;gap:8px">' +
                  ICON_UPLOAD +
                  '<span>Tap to Upload or Take Photo</span>' +
                  '<small>JPG, PNG, WEBP (max 5MB)</small>' +
                '</div>' +
                '<div class="image-preview" id="jcFaultImagePreview" style="display:none">' +
                  '<img id="jcFaultImagePreviewImg" alt="Fault Image Preview">' +
                  '<button type="button" class="image-remove-btn" onclick="OpenJobCard.removeFaultImage()">&times;</button>' +
                '</div>' +
              '</div>' +
              '<button type="button" class="btn btn-secondary btn-camera" onclick="var el=document.getElementById(\'jcCameraInput\');el&&el.click()" title="Capture from Camera">' +
                ICON_CAMERA + ' Camera' +
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
              ICON_BTN_SAVE + ' Save Job Card' +
            '</button>' +
            '<button type="button" class="btn btn-secondary" onclick="OpenJobCard.resetForm()">' +
              ICON_BTN_RESET + ' Reset' +
            '</button>' +
            '<button type="button" class="btn btn-secondary" onclick="OpenJobCard.cancel()">' +
              ICON_BTN_CANCEL + ' Cancel' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div></div>';
  }

  function loadData() {
    Loader.show();
    var loaded = { sections: false, departments: false, machines: false, assets: false };

    function checkDone() {
      if (loaded.sections && loaded.departments && loaded.machines && loaded.assets) {
        Loader.hide();
        populateForm();
      }
    }

    API.post('getSectionList', {}).then(function(data) {
      state.sections = Array.isArray(data) ? data : [];
      loaded.sections = true;
      checkDone();
    }).catch(function() {
      loaded.sections = true;
      checkDone();
      Notify.error('Failed to load sections');
    });

    API.post('getDepartmentList', {}).then(function(data) {
      state.departments = Array.isArray(data) ? data : [];
      loaded.departments = true;
      checkDone();
    }).catch(function() {
      loaded.departments = true;
      checkDone();
      Notify.error('Failed to load departments');
    });

    API.post('getMachines', {}).then(function(data) {
      state.machines = Array.isArray(data) ? data : [];
      loaded.machines = true;
      checkDone();
    }).catch(function() {
      loaded.machines = true;
      checkDone();
      Notify.error('Failed to load machines');
    });

    API.post('getAssets', {}).then(function(data) {
      state.assets = Array.isArray(data) ? data : [];
      loaded.assets = true;
      checkDone();
    }).catch(function() {
      loaded.assets = true;
      checkDone();
      Notify.error('Failed to load assets');
    });
  }

  function populateForm() {
    var secSel = document.getElementById('jcSection');
    if (secSel) {
      secSel.innerHTML = '<option value="">Select Section</option>';
      state.sections.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.Section || '';
        opt.textContent = s.Section || '';
        secSel.appendChild(opt);
      });
    }

    var user = Session.getUser();
    var el = document.getElementById('jcComplaintBy');
    if (el) el.value = user ? (user.name || user.Name || '') : '';

    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    el = document.getElementById('jcDateTime');
    if (el) el.value =
      now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' +
      pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

    var catSel = document.getElementById('jcComplaintCategory');
    if (catSel) {
      catSel.innerHTML = '<option value="">Select Category</option>';
      COMPLAINT_CATEGORIES.forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSel.appendChild(opt);
      });
    }
  }

  function onSectionChange() {
    var sectionName = document.getElementById('jcSection').value;
    var deptSel = document.getElementById('jcDepartment');
    var machineSel = document.getElementById('jcMachine');
    var assetSel = document.getElementById('jcAsset');

    if (deptSel) deptSel.innerHTML = '<option value="">Select Department</option>';
    if (machineSel) machineSel.innerHTML = '<option value="">Select Machine</option>';
    if (assetSel) assetSel.innerHTML = '<option value="">Select Asset</option>';

    if (!sectionName) return;

    var filtered = state.departments.filter(function(d) {
      return d.Section === sectionName || d.SectionID === sectionName;
    });

    filtered.forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d.Department || '';
      opt.textContent = d.Department || '';
      deptSel.appendChild(opt);
    });
  }

  function onDeptChange() {
    var deptName = document.getElementById('jcDepartment').value;
    var machineSel = document.getElementById('jcMachine');
    var assetSel = document.getElementById('jcAsset');

    if (machineSel) machineSel.innerHTML = '<option value="">Select Machine</option>';
    if (assetSel) assetSel.innerHTML = '<option value="">Select Asset</option>';

    if (!deptName) return;

    var filtered = state.machines.filter(function(m) {
      return m.Department === deptName;
    });

    filtered.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m.MachineName || '';
      opt.textContent = (m.MachineName || '') + (m.MachineCode ? ' (' + m.MachineCode + ')' : '');
      machineSel.appendChild(opt);
    });
  }

  function onMachineChange() {
    var machineName = document.getElementById('jcMachine').value;
    var assetSel = document.getElementById('jcAsset');
    if (assetSel) assetSel.innerHTML = '<option value="">Select Asset</option>';

    if (!machineName) return;

    var filtered = state.assets.filter(function(a) {
      return a.MachineName === machineName;
    });

    filtered.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value = a.AssetID || '';
      opt.textContent = (a.AssetID || '') + (a.AssetName ? ' - ' + a.AssetName : '');
      assetSel.appendChild(opt);
    });
  }

  function onAssetChange() {
    var assetId = document.getElementById('jcAsset').value;
    if (!assetId) return;

    var asset = null;
    for (var i = 0; i < state.assets.length; i++) {
      if (state.assets[i].AssetID === assetId) {
        asset = state.assets[i];
        break;
      }
    }

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

  function handleFaultImageSelect(evt) {
    var file = evt.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Notify.error('Image must be less than 5MB');
      evt.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var el = document.getElementById('jcFaultImageData');
      if (el) el.value = e.target.result;
      var preview = document.getElementById('jcFaultImagePreview');
      var placeholder = document.querySelector('#jcFaultImageArea .upload-placeholder');
      if (preview) preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      el = document.getElementById('jcFaultImagePreviewImg');
      if (el) el.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeFaultImage() {
    var el = document.getElementById('jcFaultImageData'); if (el) el.value = '';
    el = document.getElementById('jcFaultImageInput'); if (el) el.value = '';
    el = document.getElementById('jcCameraInput'); if (el) el.value = '';
    el = document.getElementById('jcFaultImagePreview'); if (el) el.style.display = 'none';
    var ph = document.querySelector('#jcFaultImageArea .upload-placeholder');
    if (ph) ph.style.display = 'flex';
  }

  function save(e) {
    if (e) e.preventDefault();
    var data = Forms.get('createJobCardForm');
    var _u = Session.getUser();
    if (_u && _u.email) { data.UpdatedBy = _u.email; }

    if (!data.Section) { Notify.error('Please select a Section'); return false; }
    if (!data.Department) { Notify.error('Please select a Department'); return false; }
    if (!data.Machine) { Notify.error('Please select a Machine'); return false; }
    if (!data.AssetID) { Notify.error('Please select an Asset'); return false; }
    if (!data.ComplaintCategory) { Notify.error('Please select a Complaint Category'); return false; }
    if (!data.ComplaintDescription) { Notify.error('Please enter a Complaint Description'); return false; }
    if (!data.Priority) { Notify.error('Please select a Priority'); return false; }

    var btn = document.getElementById('jcSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    Loader.show();

    API.post('addJobCard', data).then(function() {
      Loader.hide();
      if (btn) { btn.disabled = false; btn.innerHTML = ICON_BTN_SAVE + ' Save Job Card'; }
      Notify.success('Job Card Saved Successfully');
      navigateTo('jobcards');
    }).catch(function(err) {
      Loader.hide();
      if (btn) { btn.disabled = false; btn.innerHTML = ICON_BTN_SAVE + ' Save Job Card'; }
      Notify.error(err.message || 'Failed to open job card');
    });
    return false;
  }

  function resetForm() {
    var form = document.getElementById('createJobCardForm');
    if (form) form.reset();
    removeFaultImage();
    var el = document.getElementById('jcDepartment'); if (el) el.innerHTML = '<option value="">Select Department</option>';
    el = document.getElementById('jcMachine'); if (el) el.innerHTML = '<option value="">Select Machine</option>';
    el = document.getElementById('jcAsset'); if (el) el.innerHTML = '<option value="">Select Asset</option>';
    populateForm();
  }

  return {
    show: function() {
      state = { sections: [], departments: [], machines: [], assets: [] };
      renderPage();
      loadData();
    },

    onSectionChange: function() { onSectionChange(); },
    onDeptChange: function() { onDeptChange(); },
    onMachineChange: function() { onMachineChange(); },
    onAssetChange: function() { onAssetChange(); },
    handleFaultImageSelect: function(evt) { handleFaultImageSelect(evt); },
    removeFaultImage: function() { removeFaultImage(); },
    save: function(e) { return save(e); },
    resetForm: function() { resetForm(); },
    cancel: function() { resetForm(); },
    addVoiceButton: function(textareaId) {
      var ta = document.getElementById(textareaId);
      if (!ta) return;
      var parent = ta.parentNode;
      if (parent.querySelector('.voice-input-added')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-secondary voice-input-added';
      btn.style.cssText = 'font-size:11px;padding:3px 8px;margin-top:4px';
      btn.title = 'Add voice input button';
      btn.innerHTML = ICON_MIC + ' Voice Input';
      btn.onclick = function() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          var recognition = new SpeechRecognition();
          recognition.lang = 'en-US';
          recognition.onresult = function(event) {
            ta.value += (ta.value ? ' ' : '') + event.results[0][0].transcript;
          };
          recognition.start();
        } else {
          Notify.info('Speech recognition not supported in this browser');
        }
      };
      parent.appendChild(btn);
    }
  };
})();
