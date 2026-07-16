/* ============================================================
   inventory.js — Inventory Dashboard Page Module
   Standard-021: Cloudflare Pages Frontend
   ============================================================ */

(function() {
  var _transactions = [];
  var _filtered = [];
  var _search = '';
  var _tab = 'all';

  App.registerPage('inventory', render, load);

  function render() {
    var el = document.getElementById('page-inventory');
    el.innerHTML = '' +
      '<div class="page-header">' +
        '<h2>Inventory</h2>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-secondary" onclick="App.navigateTo(\'goodsreceipt\')">&#128230; Goods Receipt</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-4" style="margin-bottom:16px">' +
        '<div class="card stat-card"><div class="stat-label">Total Parts</div><div class="stat-value" id="inv-total">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Stock Value</div><div class="stat-value" id="inv-value">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Low Stock</div><div class="stat-value" style="color:var(--warning)" id="inv-low">-</div></div>' +
        '<div class="card stat-card"><div class="stat-label">Transactions</div><div class="stat-value" id="inv-txns">-</div></div>' +
      '</div>' +
      '<div class="tabs">' +
        '<button class="tab active" onclick="InvTab(this,\'all\')">All Transactions</button>' +
        '<button class="tab" onclick="InvTab(this,\'receipt\')">Receipts</button>' +
        '<button class="tab" onclick="InvTab(this,\'issue\')">Issues</button>' +
        '<button class="tab" onclick="InvTab(this,\'return\')">Returns</button>' +
      '</div>' +
      '<div class="card"><div class="table-container" id="inv-table"></div></div>';
  }

  function load() {
    App.showLoading(true);
    API.call('getInventoryDashboardData')
      .then(function(data) {
        App.showLoading(false);
        App.setText('inv-total', data.totalParts || 0);
        App.setText('inv-value', data.stockValue || 'Rs. 0');
        App.setText('inv-low', data.lowStock || 0);
        App.setText('inv-txns', data.totalTransactions || 0);
      })
      .catch(function() {
        App.showLoading(false);
      });

    App.showLoading(true);
    API.call('getAllTransactions')
      .then(function(data) {
        _transactions = data || [];
        _filtered = _transactions;
        App.showLoading(false);
        renderTable();
      })
      .catch(function(err) {
        App.showLoading(false);
        App.showToast('Failed to load transactions: ' + err.message, 'error');
      });
  }

  function renderTable() {
    var el = document.getElementById('inv-table');
    if (!el) return;
    var list = getFilteredList();
    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128218;</div><div class="empty-state-text">No transactions found</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>ID</th><th>Type</th><th>Part</th><th>Qty</th><th>From/To</th><th>Reference</th><th>Date</th></tr></thead><tbody>';
    list.forEach(function(t) {
      var typeBadge = 'badge-secondary';
      var typeText = t.Type || t.TransactionType || '';
      if (typeText.toLowerCase() === 'receipt') typeBadge = 'badge-success';
      else if (typeText.toLowerCase() === 'issue') typeBadge = 'badge-warning';
      else if (typeText.toLowerCase() === 'return') typeBadge = 'badge-info';
      html += '<tr>' +
        '<td><strong>' + App.escHtml(t.TransactionID || t.ID || '') + '</strong></td>' +
        '<td><span class="badge ' + typeBadge + '">' + App.escHtml(typeText) + '</span></td>' +
        '<td>' + App.escHtml(t.PartCode || t.PartName || '') + '</td>' +
        '<td>' + App.escHtml(t.Quantity || t.Qty || '') + '</td>' +
        '<td>' + App.escHtml(t.FromLocation || t.ToLocation || t.Location || '') + '</td>' +
        '<td>' + App.escHtml(t.Reference || t.JobCardNo || '') + '</td>' +
        '<td>' + App.timeAgo(t.Date || t.TransactionDate) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function getFilteredList() {
    var list = _transactions;
    if (_tab !== 'all') {
      list = list.filter(function(t) {
        return (t.Type || t.TransactionType || '').toLowerCase() === _tab;
      });
    }
    if (_search) {
      var q = _search.toLowerCase();
      list = list.filter(function(t) {
        return (t.PartCode || '').toLowerCase().indexOf(q) > -1 ||
               (t.PartName || '').toLowerCase().indexOf(q) > -1 ||
               (t.TransactionID || t.ID || '').toLowerCase().indexOf(q) > -1;
      });
    }
    return list;
  }

  window.InvTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    _tab = tab;
    renderTable();
  };
})();
