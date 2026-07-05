function initChecklistSheets() {
  var templates = getSheet(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES);
  ensureHeaders(templates, ['TemplateID', 'TemplateName', 'Category', 'Items', 'CreatedAt']);
  var checklists = getSheet(CONFIG.SHEET_NAMES.CHECKLISTS);
  ensureHeaders(checklists, ['ChecklistID', 'TemplateID', 'TemplateName', 'Machine', 'Date', 'AssignedTo', 'Status', 'Results', 'Remarks', 'CreatedAt']);
}

function getChecklistTemplates() {
  return getAllData(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES);
}

function addChecklistTemplate(data) {
  var errors = validateChecklistTemplateData(data);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  data.TemplateID = generateId(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES, CONFIG.ID_PREFIXES.CHECKLIST_TEMPLATE);
  data.CreatedAt = getCurrentTimestamp();
  var result = addRow(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES, data);
  logActivity('Add Checklist Template', data.TemplateID + ' - ' + data.TemplateName);
  return result;
}

function updateChecklistTemplate(id, data) {
  var result = updateRow(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES, 'TemplateID', id, data);
  logActivity('Update Checklist Template', id);
  return result;
}

function deleteChecklistTemplate(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.CHECKLIST_TEMPLATES, 'TemplateID', id);
  logActivity('Delete Checklist Template', id);
  return result;
}

function getChecklists() {
  return getAllData(CONFIG.SHEET_NAMES.CHECKLISTS);
}

function addChecklist(data) {
  data.ChecklistID = generateId(CONFIG.SHEET_NAMES.CHECKLISTS, CONFIG.ID_PREFIXES.CHECKLIST);
  data.CreatedAt = getCurrentTimestamp();
  data.Status = data.Status || CONFIG.STATUS.PENDING;
  var result = addRow(CONFIG.SHEET_NAMES.CHECKLISTS, data);
  logActivity('Add Checklist', data.ChecklistID);
  return result;
}

function updateChecklist(id, data) {
  var result = updateRow(CONFIG.SHEET_NAMES.CHECKLISTS, 'ChecklistID', id, data);
  logActivity('Update Checklist', id);
  return result;
}

function deleteChecklist(id) {
  var result = deleteRow(CONFIG.SHEET_NAMES.CHECKLISTS, 'ChecklistID', id);
  logActivity('Delete Checklist', id);
  return result;
}

function searchChecklists(query) {
  return searchData(CONFIG.SHEET_NAMES.CHECKLISTS, query);
}
