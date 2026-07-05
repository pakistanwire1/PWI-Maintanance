function validateRequired(value, fieldName) {
  if (isEmpty(value)) {
    return fieldName + ' is required.';
  }
  return null;
}

function validateEmail(email) {
  if (isEmpty(email)) return 'Email is required.';
  var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) return 'Invalid email format.';
  return null;
}

function validateMinLength(value, minLen, fieldName) {
  if (value && value.length < minLen) {
    return fieldName + ' must be at least ' + minLen + ' characters.';
  }
  return null;
}

function validateNumeric(value, fieldName) {
  if (!isEmpty(value) && isNaN(parseFloat(value))) {
    return fieldName + ' must be a number.';
  }
  return null;
}

function validatePositiveNumber(value, fieldName) {
  var err = validateNumeric(value, fieldName);
  if (err) return err;
  if (!isEmpty(value) && parseFloat(value) < 0) {
    return fieldName + ' must be a positive number.';
  }
  return null;
}

function validateFormFields(data, fieldRules) {
  var errors = [];
  for (var i = 0; i < fieldRules.length; i++) {
    var rule = fieldRules[i];
    var value = data[rule.field];
    if (rule.required) {
      var err = validateRequired(value, rule.label);
      if (err) { errors.push(err); continue; }
    }
    if (rule.email) {
      var err = validateEmail(value);
      if (err) { errors.push(err); continue; }
    }
    if (rule.numeric) {
      var err = validateNumeric(value, rule.label);
      if (err) { errors.push(err); continue; }
    }
    if (rule.positive) {
      var err = validatePositiveNumber(value, rule.label);
      if (err) { errors.push(err); continue; }
    }
    if (rule.minLen) {
      var err = validateMinLength(value, rule.minLen, rule.label);
      if (err) { errors.push(err); continue; }
    }
  }
  return errors;
}

function checkDuplicateField(sheetName, field, value, excludeValue) {
  var data = getAllData(sheetName);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][field]).toLowerCase() === String(value).toLowerCase()) {
      if (excludeValue && String(data[i][field]) === String(excludeValue)) continue;
      return true;
    }
  }
  return false;
}

function validateDuplicate(sheetName, field, value, label, excludeValue) {
  if (checkDuplicateField(sheetName, field, value, excludeValue)) {
    return label + ' "' + value + '" already exists.';
  }
  return null;
}

function validateAssetData(data) {
  var rules = [
    { field: 'AssetCode', label: 'Asset Code', required: true },
    { field: 'AssetName', label: 'Asset Name', required: true }
  ];
  var errors = validateFormFields(data, rules);
  if (data.Cost && isNaN(parseFloat(data.Cost))) {
    errors.push('Cost must be a number.');
  }
  if (data.InstallDate && !isValidDate(data.InstallDate)) {
    errors.push('Install Date format is invalid.');
  }
  if (data.WarrantyExpiry && !isValidDate(data.WarrantyExpiry)) {
    errors.push('Warranty Expiry format is invalid.');
  }
  if (data.PurchaseDate && !isValidDate(data.PurchaseDate)) {
    errors.push('Purchase Date format is invalid.');
  }
  return errors;
}

function validateMachineData(data) {
  var rules = [
    { field: 'MachineCode', label: 'Machine Code', required: true },
    { field: 'MachineName', label: 'Machine Name', required: true }
  ];
  var errors = validateFormFields(data, rules);
  if (data.Capacity && isNaN(parseFloat(data.Capacity))) {
    errors.push('Capacity must be a number.');
  }
  if (data.PowerRating && isNaN(parseFloat(data.PowerRating))) {
    errors.push('Power Rating must be a number.');
  }
  if (data.InstallDate && !isValidDate(data.InstallDate)) {
    errors.push('Install Date format is invalid.');
  }
  if (data.WarrantyExpiry && !isValidDate(data.WarrantyExpiry)) {
    errors.push('Warranty Expiry format is invalid.');
  }
  return errors;
}

function isValidDate(val) {
  if (!val) return true;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'string') {
    var d = new Date(val);
    return !isNaN(d.getTime());
  }
  return true;
}

function validateTechnicianData(data) {
  var rules = [
    { field: 'EmployeeID', label: 'Employee ID', required: true },
    { field: 'TechnicianName', label: 'Technician Name', required: true }
  ];
  return validateFormFields(data, rules);
}

function validateJobCardData(data) {
  var rules = [
    { field: 'Machine', label: 'Machine', required: true },
    { field: 'ComplaintDescription', label: 'Complaint Description', required: true },
    { field: 'Priority', label: 'Priority', required: true }
  ];
  return validateFormFields(data, rules);
}

function validateUserData(data) {
  var rules = [
    { field: 'Email', label: 'Email', required: true, email: true },
    { field: 'Name', label: 'Name', required: true },
    { field: 'Password', label: 'Password', required: true, minLen: 4 }
  ];
  return validateFormFields(data, rules);
}

function validateSparePartData(data) {
  var rules = [
    { field: 'PartName', label: 'Part Name', required: true },
    { field: 'Stock', label: 'Stock', required: true, numeric: true, positive: true }
  ];
  return validateFormFields(data, rules);
}

function validatePMData(data) {
  var rules = [
    { field: 'Machine', label: 'Machine', required: true },
    { field: 'Frequency', label: 'Frequency', required: true, numeric: true, positive: true }
  ];
  return validateFormFields(data, rules);
}

function validateChecklistTemplateData(data) {
  var rules = [
    { field: 'TemplateName', label: 'Template Name', required: true }
  ];
  return validateFormFields(data, rules);
}

function validateSettingData(data) {
  var errors = [];
  if (!data.Setting || data.Setting.trim() === '') {
    errors.push('Setting name is required.');
  }
  return errors;
}

function validateSectionData(data) {
  var rules = [
    { field: 'Section', label: 'Section Name', required: true },
    { field: 'SectionCode', label: 'Section Code', required: true }
  ];
  return validateFormFields(data, rules);
}

function validateDepartmentData(data) {
  var rules = [
    { field: 'Department', label: 'Department Name', required: true }
  ];
  var errors = validateFormFields(data, rules);
  if (data.HoursPerDay) {
    var numErr = validateNumeric(data.HoursPerDay, 'Hours Per Day');
    if (numErr) errors.push(numErr);
    else {
      var posErr = validatePositiveNumber(data.HoursPerDay, 'Hours Per Day');
      if (posErr) errors.push(posErr);
    }
  }
  return errors;
}
