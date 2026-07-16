/* ============================================================
   goodsreceipt.js — Goods Receipt Form
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _items = [];

  App.registerPage('goodsreceipt', render, load);

  function render() {
    var el = document.getElementById('page-goodsreceipt');
    el.innerHTML = '' +
      '<div class="page-header"><h2>Goods Receipt</h2>' +
        '<p style="color:var(--text-muted);font-size:13px;margin-top:4px">Record incoming spare parts and materials</p></div>' +
      '<div class="card" style="padding:24px;max-width:800px">' +
        '<div class="grid grid-2">' +
          '<div class="form-group"><label class="form-label">Supplier</label>' +
            '<input class="form-input" id="gr-supplier" placeholder="Supplier name"></div>' +
          '<div class="form-group"><label class="form-label">PO Number</label>' +
            '<input class="form-input" id="gr-po" placeholder="Purchase order #"></div>' +
          '<div class="form-group"><label class="form-label">Received By</label>' +
            '<input class="form-input" id="gr-receivedby" value="' + App.escHtml(Auth.getName()) + '"></div>' +
          '<div class="form-group"><label class="form-label">Date</label>' +
            '<input type="date" class="form-input" id="gr-date"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Remarks</label>' +
          '<textarea class="form-input" id="gr-remarks" rows="2" placeholder="Additional notes..."></textarea></div>' +
      '</div>' +
      '<div class="card" style="padding:24px;max-width:800px;margin-top:16px">' +
        '<h3 style="margin-bottom:16px">Items</h3>' +
        '<div id="gr-items-list"></div>' +
        '<button class="btn btn-secondary" onclick="GRAddItem()" style="margin-top:12px">+ Add Item</button>' +
      '</div>' +
      '<div style="max-width:800px;margin-top:16px;display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn btn-secondary" onclick="App.navigateTo(\'inventory\')">Cancel</button>' +
        '<button class="btn btn-primary" id="gr-submit">Submit Receipt</button>' +
      '</div>';
  }

  function load() {
    _items = [];
    var now = new Date();
    var dateInput = document.getElementById('gr-date');
    if (dateInput) dateInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    GRAddItem();
    var submitBtn = document.getElementById('gr-submit');
    if (submitBtn) submitBtn.onclick = handleSubmit;
  }

  function renderItems() {
    var el = document.getElementById('gr-items-list');
    if (!el) return;
    var html = '<table><thead><tr><th>Part Code</th><th>Part Name</th><th>Qty</th><th>Unit Price</th><th></th></tr></thead><tbody>';
    _items.forEach(function(item, idx) {
      html += '<tr>' +
        '<td><input class="form-input" value="' + App.escHtml(item.partCode) + '" onchange="GRItemChange(' + idx + ',\'partCode\',this.value)" style="width:120px"></td>' +
        '<td><input class="form-input" value="' + App.escHtml(item.partName) + '" onchange="GRItemChange(' + idx + ',\'partName\',this.value)" style="width:180px"></td>' +
        '<td><input type="number" class="form-input" value="' + (item.qty || 1) + '" onchange="GRItemChange(' + idx + ',\'qty\',this.value)" style="width:80px"></td>' +
        '<td><input type="number" step="0.01" class="form-input" value="' + (item.unitPrice || '') + '" onchange="GRItemChange(' + idx + ',\'unitPrice\',this.value)" style="width:100px"></td>' +
        '<td><button class="btn btn-sm btn-danger" onclick="GRRemoveItem(' + idx + ')">X</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  window.GRAddItem = function() {
    _items.push({ partCode: '', partName: '', qty: 1, unitPrice: '' });
    renderItems();
  };

  window.GRRemoveItem = function(idx) {
    _items.splice(idx, 1);
    renderItems();
  };

  window.GRItemChange = function(idx, field, value) {
    if (field === 'qty' || field === 'unitPrice') {
      _items[idx][field] = value;
    } else {
      _items[idx][field] = value;
    }
  };

  function handleSubmit() {
    var validItems = _items.filter(function(i) { return i.partCode && i.qty > 0; });
    if (validItems.length === 0) {
      App.showToast('Add at least one item with a part code', 'error');
      return;
    }

    var btn = document.getElementById('gr-submit');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    API.call('processGoodsReceipt', {
      supplier: document.getElementById('gr-supplier').value,
      poNumber: document.getElementById('gr-po').value,
      receivedBy: document.getElementById('gr-receivedby').value,
      date: document.getElementById('gr-date').value,
      remarks: document.getElementById('gr-remarks').value,
      items: validItems.map(function(i) {
        return { PartCode: i.partCode, PartName: i.partName, Quantity: parseInt(i.qty), UnitPrice: parseFloat(i.unitPrice) || 0 };
      })
    }).then(function() {
      App.showToast('Goods receipt processed successfully', 'success');
      App.navigateTo('inventory');
    }).catch(function(err) {
      btn.textContent = 'Submit Receipt';
      btn.disabled = false;
      App.showToast('Error: ' + err.message, 'error');
    });
  }
})();
