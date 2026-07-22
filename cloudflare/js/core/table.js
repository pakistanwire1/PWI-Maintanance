var Table = {
  paginate: function(data, page, pageSize) {
    var total = data.length;
    var totalPages = Math.ceil(total / pageSize) || 1;
    page = Math.max(1, Math.min(page, totalPages));
    var start = (page - 1) * pageSize;
    var items = data.slice(start, start + pageSize);
    return { items: items, totalPages: totalPages, total: total, page: page };
  },

  render: function(containerId, options) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = options.data || [];
    var columns = options.columns || [];
    var actions = options.actions || [];
    var page = options.page || 1;
    var pageSize = options.pageSize || 10;
    var emptyMsg = options.emptyMsg || 'No records found';
    var searchValue = options.searchValue || '';

    var result = Table.paginate(data, page, pageSize);

    var html = '';

    if (result.items.length === 0) {
      html += '<div class="empty-state">';
      html += '<div class="empty-state-icon">' + (Icons.document || '') + '</div>';
      html += '<h3>' + emptyMsg + '</h3>';
      html += '<p>No records match your search criteria.</p>';
      html += '</div>';
    } else {
      html += '<div class="table-responsive">';
      html += '<table class="data-table">';

      html += '<thead><tr>';
      columns.forEach(function(col) {
        html += '<th>' + (col.label || col.key) + '</th>';
      });
      if (actions.length > 0) {
        html += '<th style="width:120px">Actions</th>';
      }
      html += '</tr></thead>';

      html += '<tbody>';
      result.items.forEach(function(row) {
        html += '<tr>';
        columns.forEach(function(col) {
          var value = row[col.key];
          if (col.date) {
            value = Utils.formatDate(value);
          } else if (col.datetime) {
            value = Utils.formatDateTime(value);
          } else if (col.format) {
            value = col.format(value, row);
          }
          if (col.badge && value) {
            var badgeClass = col.badgeMap && col.badgeMap[value] ? col.badgeMap[value] : 'default';
            value = '<span class="badge badge-' + badgeClass + '">' + Utils.escapeHtml(String(value)) + '</span>';
          } else if (value === null || value === undefined || value === '') {
            value = '<span class="text-muted">-</span>';
          } else if (typeof value === 'string') {
            value = Utils.escapeHtml(value);
          }
          html += '<td>' + value + '</td>';
        });

        if (actions.length > 0) {
          html += '<td class="actions">';
          actions.forEach(function(action) {
            var idField = action.idField || 'id';
            var onclick = action.onclick.replace('{id}', row[idField]);
            var color = action.color || 'primary';
            var title = action.label || '';
            html += '<button class="btn-icon btn-' + color + '" onclick="' + onclick + '" title="' + title + '">';
            html += Icons[action.icon] || '';
            html += '</button>';
          });
          html += '</td>';
        }

        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div>';

      if (result.totalPages > 1) {
        html += '<div class="pagination" id="' + containerId + '-pagination">';
        html += '<button class="btn-sm" ' + (result.page <= 1 ? 'disabled' : '') + ' onclick="' + (options.onPrev || '') + '">‹</button>';

        for (var i = 1; i <= result.totalPages; i++) {
          if (result.totalPages <= 7 || Math.abs(i - result.page) <= 2 || i === 1 || i === result.totalPages) {
            html += '<button class="btn-sm ' + (i === result.page ? 'active' : '') + '" onclick="' + (options.onPageClick || '').replace('{page}', i) + '">' + i + '</button>';
          } else if (Math.abs(i - result.page) === 3) {
            html += '<span class="pagination-ellipsis">…</span>';
          }
        }

        html += '<button class="btn-sm" ' + (result.page >= result.totalPages ? 'disabled' : '') + ' onclick="' + (options.onNext || '') + '">›</button>';
        html += '</div>';
      }

      html += '<div class="table-info">Showing ' + (((result.page - 1) * pageSize) + 1) + '-' + Math.min(result.page * pageSize, result.total) + ' of ' + result.total + ' records</div>';
    }

    container.innerHTML = html;
  }
};
