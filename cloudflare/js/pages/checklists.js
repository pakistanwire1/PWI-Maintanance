var Checklists = (function() {
  var templateData = [];
  var checklistData = [];
  var templatePage = 1;
  var checklistPage = 1;
  var PAGE_SIZE = 10;
  var __pageStates = {};

  var CHECKLIST_CATEGORIES = [
    'Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic',
    'Safety', 'Quality', 'Daily', 'Weekly', 'Monthly'
  ];

  var ICONS = {
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.5 2.5a1.5 1.5 0 012 2L7 14l-3 1 1-3 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 5h14"/><path d="M7 5V3a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M16 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5"/><path d="M8 8v6"/><path d="M12 8v6"/></svg>'
  };

  var ICON_SAVE_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M15 17v-5H5v5"/><path d="M5 3v4h7"/><path d="M4 3h10l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>';

  function showModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; el.classList.add('show'); }
  }

  function hideModal(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('show'); }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function populateSelectLocal(id, data, valueField, labelField, defaultText) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (defaultText) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultText;
      sel.appendChild(opt);
    }
    (data || []).forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item[valueField];
      opt.textContent = item[labelField] || item[valueField];
      sel.appendChild(opt);
    });
  }

  function populateSelectFromListLocal(id, list, defaultText) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (defaultText) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultText;
      sel.appendChild(opt);
    }
    (list || []).forEach(function(val) {
      if (val) {
        var opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        sel.appendChild(opt);
      }
    });
  }

  function setFormDataLocal(formId, data) {
    var form = document.getElementById(formId);
    if (!form || !data) return;
    form.querySelectorAll('[name]').forEach(function(el) {
      if (data[el.name] !== undefined) {
        el.value = data[el.name];
      }
    });
  }

  function getFormDataLocal(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var data = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.name) {
        if (el.type === 'checkbox') { data[el.name] = el.checked; }
        else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else { data[el.name] = el.value; }
      }
    }
    return data;
  }

  function resetFormLocal(formId) {
    var form = document.getElementById(formId);
    if (form) form.reset();
  }

  function openModalFormLocal(formId, title) {
    setText(formId + 'Title', title);
    showModal(formId + 'Modal');
  }

  function registerPageState(containerId, renderFn) {
    __pageStates[containerId] = renderFn;
  }

  function changePage(containerId, page) {
    if (__pageStates[containerId]) {
      __pageStates[containerId](page);
    }
  }

  function formatDateOnly(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return '';
    var day = String(d.getDate()).padStart(2, '0');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return day + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function renderTableLocal(data, columns, actions, page, pageSize, containerId) {
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
    columns.forEach(function(col) {
      html += '<th>' + (col.label || col) + '</th>';
    });
    if (actions) html += '<th style="width:120px">Actions</th>';
    html += '</tr></thead><tbody>';

    pageData.forEach(function(row) {
      html += '<tr>';
      columns.forEach(function(col) {
        var key = col.key || col;
        var val = row[key] !== undefined && row[key] !== null ? row[key] : '';

        if (col.badge) {
          var badgeClass = 'badge badge-primary';
          if (col.badgeMap) {
            var mapKey = val;
            if (!(mapKey in col.badgeMap)) {
              mapKey = Object.keys(col.badgeMap).find(function(k) { return k.toLowerCase() === String(val).toLowerCase(); }) || mapKey;
            }
            badgeClass = 'badge badge-' + (col.badgeMap[mapKey] || 'primary');
          }
          val = '<span class="' + badgeClass + '">' + val + '</span>';
        }

        if (col.format) val = col.format(val, row);

        if (col.date) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateOnly(val);
        }

        if (col.datetime) {
          var d = new Date(val);
          if (!isNaN(d.getTime())) val = formatDateOnly(val);
        }

        html += '<td>' + val + '</td>';
      });

      if (actions) {
        html += '<td><div class="actions-cell">';
        actions.forEach(function(action) {
          if (action.condition && !action.condition(row)) return;
          var idField = action.idField || Object.keys(row)[0];
          var onclick = action.onclick ? action.onclick.replace(/\{id\}/g, row[idField]) : '';
          if (action.icon && ICONS[action.icon]) {
            var svg = ICONS[action.icon];
            var cls = 'icon-btn icon-btn-' + (action.color || 'primary');
            html += '<button class="' + cls + '" onclick="' + onclick + '" title="' + (action.label || '') + '">' + svg + '</button>';
          } else {
            html += '<button class="btn btn-sm ' + (action.class || 'btn-primary') + '" onclick="' + onclick + '">' + action.label + '</button>';
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
        '<button onclick="Checklists.changePage(\'' + containerId + '\',' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="' + (p === page ? 'active' : '') + '" onclick="Checklists.changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
      }
      html += '<button onclick="Checklists.changePage(\'' + containerId + '\',' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>Next</button>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function renderPage() {
    var el = document.getElementById('pageContent');
    if (!el) return;

    el.innerHTML =
      '<div id="checklistsPage" class="page">' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Checklist Templates</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-primary" onclick="Checklists.openTemplateForm()">+ New Template</button>' +
            '</div>' +
          '</div>' +
          '<div id="templateTableContainer"></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div class="card-title">Checklists</div>' +
            '<div class="card-actions">' +
              '<button class="btn btn-success" onclick="Checklists.openChecklistForm()">+ New Checklist</button>' +
            '</div>' +
          '</div>' +
          '<div class="filter-bar">' +
            '<div class="form-group">' +
              '<select class="form-control" id="clStatusFilter" onchange="Checklists.renderChecklistsTable()">' +
                '<option value="">All Status</option>' +
                '<option value="Pending">Pending</option>' +
                '<option value="Completed">Completed</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div id="checklistsTableContainer"></div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="templateFormModal" style="display:none">' +
        '<div class="modal">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="templateFormTitle">Checklist Template</div>' +
            '<button class="modal-close" onclick="Checklists.hideTemplateModal()">&times;</button>' +
          '</div>' +
          '<form id="templateForm" onsubmit="return Checklists.saveTemplate(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="TemplateID" id="editTemplateId">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Template Name *</label>' +
                  '<input type="text" name="TemplateName" class="form-control" required>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Category</label>' +
                  '<select name="Category" class="form-control" id="templateCategory"></select>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Checklist Items (one per line)</label>' +
                '<textarea name="Items" class="form-control" rows="6" placeholder="Item 1&#10;Item 2&#10;Item 3"></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Checklists.hideTemplateModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICON_SAVE_SVG + ' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="modal-overlay" id="checklistFormModal" style="display:none">' +
        '<div class="modal modal-wide">' +
          '<div class="modal-header">' +
            '<div class="modal-title" id="checklistFormTitle">New Checklist</div>' +
            '<button class="modal-close" onclick="Checklists.hideChecklistModal()">&times;</button>' +
          '</div>' +
          '<form id="checklistForm" onsubmit="return Checklists.saveChecklist(event)">' +
            '<div class="modal-body">' +
              '<input type="hidden" name="ChecklistID" id="editChecklistId">' +
              '<input type="hidden" name="TemplateName" id="clTemplateName">' +
              '<input type="hidden" name="Results" id="clResults">' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Template *</label>' +
                  '<select name="TemplateID" class="form-control" id="clTemplate" required onchange="Checklists.onTemplateChange()"></select>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Machine *</label>' +
                  '<select name="Machine" class="form-control" id="clMachine" required></select>' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  '<label>Date</label>' +
                  '<input type="date" name="Date" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label>Assigned To</label>' +
                  '<select name="AssignedTo" class="form-control" id="clTechnician"></select>' +
                '</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Status</label>' +
                '<select name="Status" class="form-control">' +
                  '<option value="Pending">Pending</option>' +
                  '<option value="Completed">Completed</option>' +
                '</select>' +
              '</div>' +
              '<div id="checklistItemsContainer" class="card" style="display:none;margin-top:16px">' +
                '<div class="card-title mb-12">Checklist Items</div>' +
                '<div id="checklistItems"></div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label>Remarks</label>' +
                '<textarea name="Remarks" class="form-control"></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" onclick="Checklists.hideChecklistModal()">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + ICON_SAVE_SVG + ' Save</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

    loadData();
  }

  function loadData() {
    Loader.show();
    API.post('getChecklistTemplates', {})
      .then(function(data) {
        templateData = data || [];
        Loader.hide();
        renderTemplatesTable();
        loadChecklistsSub();
      })
      .catch(function() {
        Loader.hide();
        Notify.error('Failed to load data');
      });
  }

  function loadChecklistsSub() {
    API.post('getChecklists', {})
      .then(function(data) {
        checklistData = data || [];
        renderChecklistsTable();
      })
      .catch(function() {
        Notify.error('Failed to load checklists');
      });
  }

  function renderTemplatesTable() {
    renderTableLocal(templateData, [
      { key: 'TemplateID', label: 'ID' },
      { key: 'TemplateName', label: 'Template Name' },
      { key: 'Category', label: 'Category' },
      { key: 'Items', label: 'Items', format: function(v) { return v ? v.split('\n').length + ' items' : '0'; } }
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "Checklists.editTemplate('{id}')", idField: 'TemplateID' },
      { label: 'Del', icon: 'trash', color: 'danger', onclick: "Checklists.deleteTemplate('{id}')", idField: 'TemplateID' }
    ], templatePage, PAGE_SIZE, 'templateTableContainer');
    registerPageState('templateTableContainer', function(p) { templatePage = p; renderTemplatesTable(); });
  }

  function renderChecklistsTable() {
    var statusFilter = document.getElementById('clStatusFilter').value;
    var filtered = statusFilter ? checklistData.filter(function(c) { return c.Status === statusFilter; }) : checklistData;
    renderTableLocal(filtered, [
      { key: 'ChecklistID', label: 'ID' },
      { key: 'TemplateName', label: 'Template' },
      { key: 'Machine', label: 'Machine' },
      { key: 'Date', label: 'Date', date: true },
      { key: 'AssignedTo', label: 'Assigned To' },
      { key: 'Status', label: 'Status', badge: true, badgeMap: { 'Pending': 'warning', 'Completed': 'success' } }
    ], [
      { label: 'Edit', icon: 'edit', color: 'primary', onclick: "Checklists.editChecklist('{id}')", idField: 'ChecklistID' },
      { label: 'Del', icon: 'trash', color: 'danger', onclick: "Checklists.deleteChecklist('{id}')", idField: 'ChecklistID' }
    ], checklistPage, PAGE_SIZE, 'checklistsTableContainer');
    registerPageState('checklistsTableContainer', function(p) { checklistPage = p; renderChecklistsTable(); });
  }

  function openTemplateForm() {
    var el = document.getElementById('editTemplateId'); if (el) el.value = '';
    resetFormLocal('templateForm');
    populateSelectFromListLocal('templateCategory', CHECKLIST_CATEGORIES, 'Select Category');
    openModalFormLocal('templateForm', 'New Checklist Template');
  }

  function editTemplate(id) {
    var item = templateData.find(function(r) { return r.TemplateID === id; });
    if (!item) return;
    populateSelectFromListLocal('templateCategory', CHECKLIST_CATEGORIES, 'Select Category');
    setFormDataLocal('templateForm', item);
    var el = document.getElementById('editTemplateId'); if (el) el.value = id;
    openModalFormLocal('templateForm', 'Edit Template - ' + id);
  }

  function saveTemplate(e) {
    e.preventDefault();
    var data = getFormDataLocal('templateForm');
    var idEl = document.getElementById('editTemplateId'); var id = idEl ? idEl.value : '';
    Loader.show();
    if (id) {
      API.post('updateChecklistTemplate', { id: id, data: data })
        .then(function(result) { templateData = result; Loader.hide(); hideModal('templateFormModal'); Notify.success('Template updated'); renderTemplatesTable(); })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to update template'); });
    } else {
      API.post('addChecklistTemplate', data)
        .then(function(result) { templateData = result; Loader.hide(); hideModal('templateFormModal'); Notify.success('Template added'); renderTemplatesTable(); })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to add template'); });
    }
  }

  function deleteTemplate(id) {
    Modal.confirm('Delete Template', 'Are you sure?', function() {
      Loader.show();
      API.post('deleteChecklistTemplate', { id: id })
        .then(function(result) { templateData = result; Loader.hide(); Notify.success('Template deleted'); renderTemplatesTable(); })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to delete template'); });
    });
  }

  function openChecklistForm() {
    var el;
    el = document.getElementById('editChecklistId'); if (el) el.value = '';
    resetFormLocal('checklistForm');
    el = document.getElementById('checklistItemsContainer'); if (el) el.style.display = 'none';
    var clForm = document.getElementById('checklistForm');
    var dateInput = clForm ? clForm.querySelector('input[name="Date"]') : null;
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    populateSelectLocal('clTemplate', templateData, 'TemplateID', 'TemplateName', 'Select Template');
    API.post('getMachines', {})
      .then(function(m) { populateSelectLocal('clMachine', m, 'MachineID', 'MachineName', 'Select Machine'); })
      .catch(function() {});
    API.post('getTechnicians', {})
      .then(function(t) { populateSelectLocal('clTechnician', t, 'EmployeeID', 'TechnicianName', 'Select'); })
      .catch(function() {});
    openModalFormLocal('checklistForm', 'New Checklist');
  }

  function onTemplateChange() {
    var templateIdEl = document.getElementById('clTemplate');
    if (!templateIdEl) return;
    var templateId = templateIdEl.value;
    var template = templateData.find(function(t) { return t.TemplateID === templateId; });
    var container = document.getElementById('checklistItemsContainer');
    if (!template || !template.Items) { if (container) container.style.display = 'none'; return; }
    if (!container) return;
    container.style.display = 'block';
    var nameEl = document.getElementById('clTemplateName'); if (nameEl) nameEl.value = template.TemplateName;
    var items = template.Items.split('\n').filter(function(i) { return i.trim(); });
    var html = '';
    items.forEach(function(item, idx) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
        '<input type="checkbox" name="cl_item_' + idx + '" value="Pass" onchange="Checklists.updateResults()">' +
        '<span>' + item + '</span></div>';
    });
    var checklistItems = document.getElementById('checklistItems'); if (checklistItems) checklistItems.innerHTML = html;
  }

  function updateResults() {
    var results = [];
    document.querySelectorAll('#checklistItems input[type="checkbox"]').forEach(function(cb) {
      results.push({ item: cb.nextElementSibling.textContent, status: cb.checked ? 'Pass' : 'Fail' });
    });
    var resultsEl = document.getElementById('clResults'); if (resultsEl) resultsEl.value = JSON.stringify(results);
  }

  function editChecklist(id) {
    var item = checklistData.find(function(r) { return r.ChecklistID === id; });
    if (!item) return;
    populateSelectLocal('clTemplate', templateData, 'TemplateID', 'TemplateName', 'Select Template');
    API.post('getMachines', {})
      .then(function(m) { populateSelectLocal('clMachine', m, 'MachineID', 'MachineName', 'Select Machine'); })
      .catch(function() {});
    API.post('getTechnicians', {})
      .then(function(t) { populateSelectLocal('clTechnician', t, 'EmployeeID', 'TechnicianName', 'Select'); })
      .catch(function() {});
    setFormDataLocal('checklistForm', item);
    var editIdEl = document.getElementById('editChecklistId'); if (editIdEl) editIdEl.value = id;
    populateSelectLocal('clTemplate', templateData, 'TemplateID', 'TemplateName', 'Select Template');
    if (item.Results) {
      try {
        var results = JSON.parse(item.Results);
        var containerEl = document.getElementById('checklistItemsContainer'); if (containerEl) containerEl.style.display = 'block';
        var html = '';
        results.forEach(function(r, idx) {
          html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
            '<input type="checkbox" name="cl_item_' + idx + '" value="Pass" ' + (r.status === 'Pass' ? 'checked' : '') + ' onchange="Checklists.updateResults()">' +
            '<span>' + r.item + '</span></div>';
        });
        var checklistItems = document.getElementById('checklistItems'); if (checklistItems) checklistItems.innerHTML = html;
      } catch(e) {}
    }
    openModalFormLocal('checklistForm', 'Edit Checklist - ' + id);
  }

  function saveChecklist(e) {
    e.preventDefault();
    updateResults();
    var data = getFormDataLocal('checklistForm');
    var idEl = document.getElementById('editChecklistId'); var id = idEl ? idEl.value : '';
    Loader.show();
    if (id) {
      API.post('updateChecklist', { id: id, data: data })
        .then(function(result) { checklistData = result; Loader.hide(); hideModal('checklistFormModal'); Notify.success('Checklist updated'); renderChecklistsTable(); })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to update checklist'); });
    } else {
      API.post('addChecklist', data)
        .then(function(result) { checklistData = result; Loader.hide(); hideModal('checklistFormModal'); Notify.success('Checklist created'); renderChecklistsTable(); })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to create checklist'); });
    }
  }

  function deleteChecklist(id) {
    Modal.confirm('Delete Checklist', 'Are you sure?', function() {
      Loader.show();
      API.post('deleteChecklist', { id: id })
        .then(function(result) { checklistData = result; Loader.hide(); Notify.success('Checklist deleted'); renderChecklistsTable(); })
        .catch(function(err) { Loader.hide(); Notify.error(err.message || 'Failed to delete checklist'); });
    });
  }

  function hideTemplateModal() { hideModal('templateFormModal'); }
  function hideChecklistModal() { hideModal('checklistFormModal'); }

  return {
    show: renderPage,
    renderChecklistsTable: renderChecklistsTable,
    openTemplateForm: openTemplateForm,
    editTemplate: editTemplate,
    saveTemplate: saveTemplate,
    deleteTemplate: deleteTemplate,
    openChecklistForm: openChecklistForm,
    onTemplateChange: onTemplateChange,
    updateResults: updateResults,
    editChecklist: editChecklist,
    saveChecklist: saveChecklist,
    deleteChecklist: deleteChecklist,
    hideTemplateModal: hideTemplateModal,
    hideChecklistModal: hideChecklistModal,
    changePage: changePage
  };
})();
