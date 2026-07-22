var Forms = {
  get: function(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var data = {};
    var inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function(el) {
      if (el.name) {
        if (el.type === 'checkbox') {
          data[el.name] = el.checked;
        } else if (el.type === 'radio') {
          if (el.checked) data[el.name] = el.value;
        } else {
          data[el.name] = el.value;
        }
      }
    });
    return data;
  },

  set: function(formId, data) {
    var form = document.getElementById(formId);
    if (!form || !data) return;
    Object.keys(data).forEach(function(key) {
      var el = form.querySelector('[name="' + key + '"]');
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = !!data[key];
        } else if (el.type === 'radio') {
          var radio = form.querySelector('[name="' + key + '"][value="' + data[key] + '"]');
          if (radio) radio.checked = true;
        } else {
          el.value = data[key] || '';
        }
      }
    });
  },

  reset: function(formId) {
    var form = document.getElementById(formId);
    if (form) form.reset();
  },

  populateSelect: function(selectId, items, selectedValue) {
    var select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Select --</option>';
    items.forEach(function(item) {
      var opt = document.createElement('option');
      if (typeof item === 'string') {
        opt.value = item;
        opt.textContent = item;
      } else {
        opt.value = item.id || item.value;
        opt.textContent = item.name || item.label || item.id;
      }
      if (selectedValue && opt.value == selectedValue) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  },

  setValidation: function(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    var inputs = form.querySelectorAll('[required]');
    inputs.forEach(function(el) {
      if (!el.value.trim()) {
        el.classList.add('error');
      } else {
        el.classList.remove('error');
      }
    });
  },

  clearErrors: function(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.error').forEach(function(el) {
      el.classList.remove('error');
    });
  }
};
