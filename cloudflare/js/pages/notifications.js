CMMS.router.registerPage("notifications", {
  title: "Notifications",
  icon: CMMS.icons.bell,

  state: {
    notifications: [],
    filtered: [],
    filters: { module: "", readStatus: "", priority: "", search: "" },
    page: 1,
    perPage: 15,
    selectedNotification: null
  },

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header">
        <h2>Notifications</h2>
        <div class="page-actions">
          <button class="btn btn-outline" id="btnMarkAllRead">${CMMS.icons.checkCircle} Mark All Read</button>
          <button class="btn btn-danger-outline" id="btnClearAll">${CMMS.icons.trash} Clear All</button>
        </div>
      </div>
      <div class="summary-cards" id="notifSummaryCards"></div>
      <div class="card">
        <div class="card-header">
          <div class="filters-row">
            <select id="filterModule" class="form-control form-control-sm"><option value="">All Modules</option></select>
            <select id="filterReadStatus" class="form-control form-control-sm">
              <option value="">All Status</option>
              <option value="Unread">Unread</option>
              <option value="Read">Read</option>
            </select>
            <select id="filterPriority" class="form-control form-control-sm">
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <input type="text" id="filterSearch" class="form-control form-control-sm" placeholder="Search notifications...">
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>DateTime</th>
                  <th>Module</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="notifTableBody"></tbody>
            </table>
          </div>
          <div id="notifPagination" class="pagination-controls"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    const $ = CMMS.utils.$;
    $("#filterModule").addEventListener("change", (e) => {
      this.state.filters.module = e.target.value;
      this.applyFilters();
    });
    $("#filterReadStatus").addEventListener("change", (e) => {
      this.state.filters.readStatus = e.target.value;
      this.applyFilters();
    });
    $("#filterPriority").addEventListener("change", (e) => {
      this.state.filters.priority = e.target.value;
      this.applyFilters();
    });
    $("#filterSearch").addEventListener("input", CMMS.utils.debounce((e) => {
      this.state.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    }, 300));
    $("#btnMarkAllRead").addEventListener("click", () => this.markAllRead());
    $("#btnClearAll").addEventListener("click", () => this.clearAll());
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const user = CMMS.session.getUser();
      const data = await CMMS.api.call("getNotifications", { email: user.email });
      this.state.notifications = Array.isArray(data) ? data : (data?.result || []);
      this.populateModuleFilter();
      this.applyFilters();
      this.renderSummary();
    } catch (err) {
      CMMS.utils.showToast("Failed to load notifications: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  populateModuleFilter() {
    const modules = [...new Set(this.state.notifications.map(n => n.Module).filter(Boolean))];
    const select = CMMS.utils.$("#filterModule");
    const current = select.value;
    select.innerHTML = '<option value="">All Modules</option>' +
      modules.map(m => `<option value="${CMMS.utils.escHtml(m)}" ${m === current ? "selected" : ""}>${CMMS.utils.escHtml(m)}</option>`).join("");
  },

  renderSummary() {
    const total = this.state.notifications.length;
    const unread = this.state.notifications.filter(n => n.ReadStatus !== "Read").length;
    const read = total - unread;
    const byType = {};
    this.state.notifications.forEach(n => {
      const t = n.NotificationType || "General";
      byType[t] = (byType[t] || 0) + 1;
    });
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

    CMMS.utils.$("#notifSummaryCards").innerHTML = `
      <div class="summary-card"><div class="summary-icon">${CMMS.icons.bell}</div><div class="summary-info"><span class="summary-value">${total}</span><span class="summary-label">Total</span></div></div>
      <div class="summary-card warning"><div class="summary-icon">${CMMS.icons.alertTriangle}</div><div class="summary-info"><span class="summary-value">${unread}</span><span class="summary-label">Unread</span></div></div>
      <div class="summary-card success"><div class="summary-icon">${CMMS.icons.checkCircle}</div><div class="summary-info"><span class="summary-value">${read}</span><span class="summary-label">Read</span></div></div>
      <div class="summary-card info"><div class="summary-icon">${CMMS.icons.tag}</div><div class="summary-info"><span class="summary-value">${topType ? topType[0] : "N/A"}</span><span class="summary-label">Top Type (${topType ? topType[1] : 0})</span></div></div>
    `;
  },

  applyFilters() {
    const { module, readStatus, priority, search } = this.state.filters;
    this.state.filtered = this.state.notifications.filter(n => {
      if (module && n.Module !== module) return false;
      if (readStatus === "Read" && n.ReadStatus !== "Read") return false;
      if (readStatus === "Unread" && n.ReadStatus === "Read") return false;
      if (priority && n.Priority !== priority) return false;
      if (search) {
        const hay = [n.Title, n.NotificationType, n.Module, n.Remarks].join(" ").toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    this.state.page = 1;
    this.renderTable();
  },

  renderTable() {
    const { filtered, page, perPage } = this.state;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);
    const tbody = CMMS.utils.$("#notifTableBody");

    if (paged.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No notifications found</td></tr>';
    } else {
      tbody.innerHTML = paged.map(n => `
        <tr class="${n.ReadStatus !== "Read" ? "table-row-unread" : ""}">
          <td>${CMMS.utils.escHtml(n.NotificationID || n.id || "")}</td>
          <td>${CMMS.utils.formatDateTime(n.DateTime || n.CreatedAt || "")}</td>
          <td>${CMMS.utils.badge(n.Module || "", "info")}</td>
          <td>${CMMS.utils.badge(n.NotificationType || "", "secondary")}</td>
          <td>${CMMS.utils.escHtml(n.Title || "")}</td>
          <td>${CMMS.utils.priorityBadge(n.Priority || "Medium")}</td>
          <td>${CMMS.utils.statusBadge(n.ReadStatus === "Read" ? "Success" : "Pending")}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-sm btn-outline" data-action="view" data-id="${n.NotificationID || n.id}" title="View">${CMMS.icons.eye}</button>
              ${n.ReadStatus !== "Read" ? `<button class="btn btn-sm btn-outline" data-action="markRead" data-id="${n.NotificationID || n.id}" title="Mark Read">${CMMS.icons.check}</button>` : ""}
              <button class="btn btn-sm btn-danger-outline" data-action="delete" data-id="${n.NotificationID || n.id}" title="Delete">${CMMS.icons.trash}</button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    tbody.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === "view") this.viewNotification(id);
        else if (action === "markRead") this.markRead(id);
        else if (action === "delete") this.deleteNotification(id);
      });
    });

    this.renderPagination();
  },

  renderPagination() {
    const { filtered, page, perPage } = this.state;
    const totalPages = Math.ceil(filtered.length / perPage);
    const el = CMMS.utils.$("#notifPagination");
    if (totalPages <= 1) { el.innerHTML = ""; return; }

    let html = `<span class="pagination-info">Showing ${(page - 1) * perPage + 1}-${Math.min(page * perPage, filtered.length)} of ${filtered.length}</span><div class="pagination-buttons">`;
    html += `<button class="btn btn-sm btn-outline" data-page="prev" ${page === 1 ? "disabled" : ""}>&laquo; Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - page) > 1) {
        if (i === 4 || i === totalPages - 3) html += `<span class="pagination-ellipsis">...</span>`;
        continue;
      }
      html += `<button class="btn btn-sm ${i === page ? "btn-primary" : "btn-outline"}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline" data-page="next" ${page === totalPages ? "disabled" : ""}>Next &raquo;</button></div>`;
    el.innerHTML = html;

    el.querySelectorAll("button[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.page;
        if (val === "prev") this.state.page = Math.max(1, page - 1);
        else if (val === "next") this.state.page = Math.min(totalPages, page + 1);
        else this.state.page = parseInt(val);
        this.renderTable();
      });
    });
  },

  async viewNotification(id) {
    const notif = this.state.notifications.find(n => (n.NotificationID || n.id) == id);
    if (!notif) return;
    if (notif.ReadStatus !== "Read") await this.markRead(id, true);
    this.state.selectedNotification = notif;

    CMMS.utils.showModal(`
      <div class="modal-header"><h3>Notification Detail</h3><button class="modal-close" id="modalClose">&times;</button></div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item"><label>Title</label><span>${CMMS.utils.escHtml(notif.Title || "")}</span></div>
          <div class="detail-item"><label>Module</label>${CMMS.utils.badge(notif.Module || "", "info")}</div>
          <div class="detail-item"><label>Type</label>${CMMS.utils.badge(notif.NotificationType || "", "secondary")}</div>
          <div class="detail-item"><label>Priority</label>${CMMS.utils.priorityBadge(notif.Priority || "Medium")}</div>
          <div class="detail-item"><label>DateTime</label><span>${CMMS.utils.formatDateTime(notif.DateTime || notif.CreatedAt || "")}</span></div>
          <div class="detail-item"><label>Status</label>${CMMS.utils.statusBadge(notif.ReadStatus === "Read" ? "Success" : "Pending")}</div>
        </div>
        <div class="detail-section mt-3">
          <label>Details</label>
          <div class="detail-content">${CMMS.utils.escHtml(notif.Remarks || notif.Body || "No additional details.")}</div>
        </div>
      </div>
    `);
    CMMS.utils.$("#modalClose").addEventListener("click", () => CMMS.utils.hideModal());
  },

  async markRead(id, silent) {
    try {
      await CMMS.api.call("markNotificationRead", { id });
      const notif = this.state.notifications.find(n => (n.NotificationID || n.id) == id);
      if (notif) notif.ReadStatus = "Read";
      this.populateModuleFilter();
      this.renderSummary();
      this.applyFilters();
      if (!silent) CMMS.utils.showToast("Notification marked as read", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  },

  async markAllRead() {
    const confirmed = await CMMS.utils.showConfirm("Mark all notifications as read?");
    if (!confirmed) return;
    try {
      const user = CMMS.session.getUser();
      await CMMS.api.call("markAllNotificationsRead", { email: user.email });
      this.state.notifications.forEach(n => n.ReadStatus = "Read");
      this.populateModuleFilter();
      this.renderSummary();
      this.applyFilters();
      CMMS.utils.showToast("All notifications marked as read", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  },

  async deleteNotification(id) {
    const confirmed = await CMMS.utils.showConfirm("Delete this notification?");
    if (!confirmed) return;
    try {
      await CMMS.api.call("deleteNotification", { id });
      this.state.notifications = this.state.notifications.filter(n => (n.NotificationID || n.id) != id);
      this.populateModuleFilter();
      this.renderSummary();
      this.applyFilters();
      CMMS.utils.showToast("Notification deleted", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  },

  async clearAll() {
    const confirmed = await CMMS.utils.showConfirm("Clear all notifications? This cannot be undone.");
    if (!confirmed) return;
    try {
      const user = CMMS.session.getUser();
      await CMMS.api.call("clearAllNotifications", { email: user.email });
      this.state.notifications = [];
      this.state.filtered = [];
      this.populateModuleFilter();
      this.renderSummary();
      this.renderTable();
      CMMS.utils.showToast("All notifications cleared", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  }
});
