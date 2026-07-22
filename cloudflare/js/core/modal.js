var Modal = {
  show: function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('show');
  },

  hide: function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
  },

  confirm: function(title, message, onConfirm) {
    var modal = document.getElementById('confirmModal');
    if (!modal) return;

    var titleEl = modal.querySelector('.modal-title');
    var msgEl = modal.querySelector('.modal-body p');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    var yesBtn = modal.querySelector('.btn-danger');
    if (yesBtn) {
      yesBtn.onclick = function() {
        Modal.hide('confirmModal');
        if (onConfirm) onConfirm();
      };
    }

    var noBtn = modal.querySelector('.btn-secondary');
    if (noBtn) {
      noBtn.onclick = function() {
        Modal.hide('confirmModal');
      };
    }

    Modal.show('confirmModal');
  },

  closeAll: function() {
    var modals = document.querySelectorAll('.modal.show');
    modals.forEach(function(m) { m.classList.remove('show'); });
  }
};
