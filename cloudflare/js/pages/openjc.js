/* ============================================================
   openjc.js — Open Job Card Form
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _machines = [];
  var _departments = [];
  var _sections = [];

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
    el.innerHTML = '' +
      '<div class="page-header"><h2>Open Job Card</h2></div>' +
      '<div class="card" style="padding:24px;max-width:800px">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Machine *</label>' +
            '<select class="form-select" id="ojc-machine"><option value="">Select Machine</option></select></div>' +
          '<div class="form-group"><label class="form-label">Priority *</label>' +
            '<select class="form-select" id="ojc-priority">' +
              '<option value="Critical">Critical</option>' +
              '<option value="High">High</option>' +
              '<option value="Medium" selected>Medium</option>' +
              '<option value="Low">Low</option>' +
            '</select></div>' +
          '<div class="form-group"><label class="form-label">Department</label>' +
            '<select class="form-select" id="ojc-dept"><option value="">Select Department</option></select></div>' +
          '<div class="form-group"><label class="form-label">Section</label>' +
            '<select class="form-select" id="ojc-section"><option value="">Select Section</option></select></div>' +
          '<div class="form-group"><label class="form-label">Complaint By</label>' +
            '<input class="form-input" id="ojc-complaintby" value="' + App.escHtml(Auth.getName()) + '"></div>' +
          '<div class="form-group"><label class="form-label">Breakdown Type</label>' +
            '<select class="form-select" id="ojc-breakdown">' +
              '<option value="">Select Type</option>' +
              '<option value="Mechanical">Mechanical</option>' +
              '<option value="Electrical">Electrical</option>' +
              '<option value="Instrument">Instrument</option>' +
              '<option value="Utility">Utility</option>' +
              '<option value="Other">Other</option>' +
            '</select></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Complaint Description *</label>' +
          '<textarea class="form-input" id="ojc-desc" rows="4" placeholder="Describe the issue..."></textarea></div>' +
        '<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">' +
          '<button class="btn btn-secondary" onclick="App.navigateTo(\'jobcards\')">Cancel</button>' +
          '<button class="btn btn-primary" id="ojc-submit">Open Job Card</button>' +
        '</div>' +
      '</div>';
  }

  function load() {
    API.call('getMachineList').then(function(list) {
      _machines = list || [];
      var sel = document.getElementById('ojc-machine');
      if (sel) {
        _machines.forEach(function(m) {
          var opt = document.createElement('option');
          opt.value = m.MachineID || m.MachineName || '';
          opt.textContent = (m.MachineName || '') + (m.MachineCode ? ' (' + m.MachineCode + ')' : '');
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});

    API.call('getDepartmentList').then(function(list) {
      _departments = list || [];
      var sel = document.getElementById('ojc-dept');
      if (sel) {
        _departments.forEach(function(d) {
          var opt = document.createElement('option');
          opt.value = d.DepartmentName || d.Name || '';
          opt.textContent = d.DepartmentName || d.Name || '';
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});

    API.call('getSectionList').then(function(list) {
      _sections = list || [];
      var sel = document.getElementById('ojc-section');
      if (sel) {
        _sections.forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s.SectionName || s.Name || '';
          opt.textContent = s.SectionName || s.Name || '';
          sel.appendChild(opt);
        });
      }
    }).catch(function() {});

    var submitBtn = document.getElementById('ojc-submit');
    if (submitBtn) submitBtn.onclick = handleSubmit;
  }

  function handleSubmit() {
    var machine = document.getElementById('ojc-machine').value;
    var desc = document.getElementById('ojc-desc').value;
    var priority = document.getElementById('ojc-priority').value;

    if (!machine) { App.showToast('Please select a machine', 'error'); return; }
    if (!desc) { App.showToast('Please describe the complaint', 'error'); return; }

    var btn = document.getElementById('ojc-submit');
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    var data = {
      Machine: machine,
      Priority: priority,
      Department: document.getElementById('ojc-dept').value,
      Section: document.getElementById('ojc-section').value,
      ComplaintBy: document.getElementById('ojc-complaintby').value,
      ComplaintDescription: desc,
      BreakdownType: document.getElementById('ojc-breakdown').value
    };

    API.call('addJobCard', data)
      .then(function(result) {
        App.showToast('Job Card opened: ' + (result.JobCardNo || ''), 'success');
        App.navigateTo('jobcards');
      })
      .catch(function(err) {
        btn.textContent = 'Open Job Card';
        btn.disabled = false;
        App.showToast('Error: ' + err.message, 'error');
      });
  }
})();
