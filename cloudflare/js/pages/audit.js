CMMS.router.registerPage("audit", {
  title: "Audit Trail",
  icon: CMMS.icons.clipboard,

  state: {
    logs: [],
    filtered: [],
    page: 1,
    perPage: 20,
    filters: {
      startDate: "", endDate: "", user: "", department: "",
      module: "", action: "", status: "", role: "", search: ""
    },
    selectedLog: null
  },

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header">
        <h2>Audit Trail</h2>
        <div class="page-actions">
          <button class="btn btn-outline" id="exportAuditCsv">${CMMS.icons.download} Export CSV</button>
          <button class="btn btn-outline" id="printAudit">${CMMS.icons.print} Print</button>
        </div>
      </div>
      <div class="summary-cards" id="auditSummaryCards"></div>
      <div class="card">
        <div class="card-header">
          <div class="filters-row">
            <input type="date" id="auditStartDate" class="form-control form-control-sm" placeholder="Start Date">
            <input type="date" id="auditEndDate" class="form-control form-control-sm" placeholder="End Date">
            <select id="auditUser" class="form-control form-control-sm"><option value="">All Users</option></select>
            <select id="auditDept" class="form-control form-control-sm"><option value="">All Departments</option></select>
            <select id="auditModule" class="form-control form-control-sm"><option value="">All Modules</option></select>
            <select id="auditAction" class="form-control form-control-sm">
              <option value="">All Actions</option>
              <option value="Create">Create</option><option value="Update">Update</option>
              <option value="Delete">Delete</option><option value="View">View</option>
            </select>
            <select id="auditStatus" class="form-control form-control-sm">
              <option value="">All Status</option>
              <option value="Success">Success</option><option value="Failed">Failed</option>
            </select>
            <select id="auditRole" class="form-control form-control-sm"><option value="">All Roles</option></select>
            <input type="text" id="auditSearch" class="form-control form-control-sm" placeholder="Search...">
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th><th>DateTime</th><th>User</th><th>Role</th><th>Department</th>
                  <th>Module</th><th>Action</th><th>Record ID</th><th>Record Name</th>
                  <th>Status</th><th>Remarks</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="auditTableBody"></tbody>
            </table>
          </div>
          <div id="auditPagination" class="pagination-controls"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    const fields = ["startDate", "endDate", "module", "action", "status"];
    fields.forEach(f => {
      CMMS.utils.$(`#audit${f.charAt(0).toUpperCase() + f.slice(1)}`).addEventListener("change", (e) => {
        this.state.filters[f] = e.target.value;
        this.applyFilters();
      });
    });
    ["User", "Dept", "Role"].forEach(f => {
      CMMS.utils.$(`#audit${f}`).addEventListener("change", (e) => {
        const key = f === "User" ? "user" : f === "Dept" ? "department" : "role";
        this.state.filters[key] = e.target.value;
        this.applyFilters();
      });
    });
    CMMS.utils.$("#auditSearch").addEventListener("input", CMMS.utils.debounce((e) => {
      this.state.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    }, 300));
    CMMS.utils.$("#exportAuditCsv").addEventListener("click", () => this.exportCsv());
    CMMS.utils.$("#printAudit").addEventListener("click", () => window.print());
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const data = await CMMS.api.call("getAuditLogs");
      this.state.logs = Array.isArray(data) ? data : (data?.result || []);
      this.populateDropdowns();
      this.renderSummary();
      this.applyFilters();
    } catch (err) {
      CMMS.utils.showToast("Failed to load audit logs: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  populateDropdowns() {
    const users = [...new Set(this.state.logs.map(l => l.UserName || l.User).filter(Boolean))];
    const depts = [...new Set(this.state.logs.map(l => l.Department).filter(Boolean))];
    const modules = [...new Set(this.state.logs.map(l => l.Module).filter(Boolean))];
    const roles = [...new Set(this.state.logs.map(l => l.Role).filter(Boolean))];

    const populate = (elId, values) => {
      const sel = CMMS.utils.$(`#${elId}`);
      const current = sel.value;
      const firstOpt = sel.querySelector("option:first-child").outerHTML;
      sel.innerHTML = firstOpt + values.sort().map(v => `<option value="${CMMS.utils.escHtml(v)}" ${v === current ? "selected" : ""}>${CMMS.utils.escHtml(v)}</option>`).join("");
    };
    populate("auditUser", users);
    populate("auditDept", depts);
    populate("auditModule", modules);
    populate("auditRole", roles);
  },

  renderSummary() {
    const logs = this.state.logs;
    const today = CMMS.utils.nowISO().split("T")[0];
    const todayLogs = logs.filter(l => (l.DateTime || l.CreatedAt || "").startsWith(today)).length;
    const uniqueModules = new Set(logs.map(l => l.Module).filter(Boolean)).size;
    const uniqueUsers = new Set(logs.map(l => l.UserName || l.User).filter(Boolean)).size;

    CMMS.utils.$("#auditSummaryCards").innerHTML = `
      <div class="summary-card"><div class="summary-icon">${CMMS.icons.clipboard}</div><div class="summary-info"><span class="summary-value">${logs.length}</span><span class="summary-label">Total Logs</span></div></div>
      <div class="summary-card info"><div class="summary-icon">${CMMS.icons.calendar}</div><div class="summary-info"><span class="summary-value">${todayLogs}</span><span class="summary-label">Today's Logs</span></div></div>
      <div class="summary-card success"><div class="summary-icon">${CMMS.icons.tag}</div><div class="summary-info"><span class="summary-value">${uniqueModules}</span><span class="summary-label">Unique Modules</span></div></div>
      <div class="summary-card warning"><div class="summary-icon">${CMMS.icons.users}</div><div class="summary-info"><span class="summary-value">${uniqueUsers}</span><span class="summary-label">Unique Users</span></div></div>
    `;
  },

  applyFilters() {
    const f = this.state.filters;
    this.state.filtered = this.state.logs.filter(l => {
      if (f.startDate && (l.DateTime || l.CreatedAt || "") < f.startDate) return false;
      if (f.endDate && (l.DateTime || l.CreatedAt || "").substring(0, 10) > f.endDate) return false;
      if (f.user && (l.UserName || l.User || "") !== f.user) return false;
      if (f.department && (l.Department || "") !== f.department) return false;
      if (f.module && (l.Module || "") !== f.module) return false;
      if (f.action && (l.Action || "") !== f.action) return false;
      if (f.status && (l.Status || "") !== f.status) return false;
      if (f.role && (l.Role || "") !== f.role) return false;
      if (f.search) {
        const hay = [l.UserName, l.User, l.Module, l.Action, l.RecordID, l.RecordName, l.Remarks, l.Department, l.Role].join(" ").toLowerCase();
        if (!hay.includes(f.search)) return false;
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
    const tbody = CMMS.utils.$("#auditTableBody");

    tbody.innerHTML = paged.length === 0 ?
      '<tr><td colspan="12" class="text-center text-muted">No audit logs found</td></tr>' :
      paged.map(l => `
        <tr>
          <td>${CMMS.utils.escHtml(l.AuditID || l.id || "")}</td>
          <td>${CMMS.utils.formatDateTime(l.DateTime || l.CreatedAt || "")}</td>
          <td>${CMMS.utils.escHtml(l.UserName || l.User || "")}</td>
          <td>${CMMS.utils.badge(l.Role || "", "secondary")}</td>
          <td>${CMMS.utils.escHtml(l.Department || "")}</td>
          <td>${CMMS.utils.badge(l.Module || "", "info")}</td>
          <td>${CMMS.utils.badge(l.Action || "", l.Action === "Delete" ? "danger" : l.Action === "Create" ? "success" : "warning")}</td>
          <td>${CMMS.utils.escHtml(l.RecordID || "")}</td>
          <td>${CMMS.utils.escHtml(l.RecordName || "")}</td>
          <td>${CMMS.utils.statusBadge(l.Status || "Success")}</td>
          <td class="text-truncate" style="max-width:150px">${CMMS.utils.escHtml(l.Remarks || "")}</td>
          <td><button class="btn btn-sm btn-outline" data-action="viewDetail" data-id="${l.AuditID || l.id}" title="View Detail">${CMMS.icons.eye}</button></td>
        </tr>
      `).join("");

    tbody.querySelectorAll("button[data-action='viewDetail']").forEach(btn => {
      btn.addEventListener("click", () => this.viewDetail(btn.dataset.id));
    });

    this.renderPagination();
  },

  renderPagination() {
    const { filtered, page, perPage } = this.state;
    const totalPages = Math.ceil(filtered.length / perPage);
    const el = CMMS.utils.$("#auditPagination");
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

  viewDetail(id) {
    const log = this.state.logs.find(l => (l.AuditID || l.id) == id);
    if (!log) return;

    const formatValue = (val) => {
      if (!val) return '<span class="text-muted">N/A</span>';
      try {
        const obj = typeof val === "string" ? JSON.parse(val) : val;
        if (typeof obj === "object") {
          return `<pre class="code-block">${CMMS.utils.escHtml(JSON.stringify(obj, null, 2))}</pre>`;
        }
      } catch (e) { /* not json */ }
      return CMMS.utils.escHtml(String(val));
    };

    CMMS.utils.showModal(`
      <div class="modal-header"><h3>Audit Log Detail</h3><button class="modal-close" id="auditModalClose">&times;</button></div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item"><label>Audit ID</label><span>${CMMS.utils.escHtml(log.AuditID || log.id || "")}</span></div>
          <div class="detail-item"><label>DateTime</label><span>${CMMS.utils.formatDateTime(log.DateTime || log.CreatedAt || "")}</span></div>
          <div class="detail-item"><label>User</label><span>${CMMS.utils.escHtml(log.UserName || log.User || "")}</span></div>
          <div class="detail-item"><label>Role</label>${CMMS.utils.badge(log.Role || "", "secondary")}</div>
          <div class="detail-item"><label>Department</label><span>${CMMS.utils.escHtml(log.Department || "")}</span></div>
          <div class="detail-item"><label>Module</label>${CMMS.utils.badge(log.Module || "", "info")}</div>
          <div class="detail-item"><label>Action</label>${CMMS.utils.badge(log.Action || "", "warning")}</div>
          <div class="detail-item"><label>Record ID</label><span>${CMMS.utils.escHtml(log.RecordID || "")}</span></div>
          <div class="detail-item"><label>Record Name</label><span>${CMMS.utils.escHtml(log.RecordName || "")}</span></div>
          <div class="detail-item"><label>Status</label>${CMMS.utils.statusBadge(log.Status || "Success")}</div>
          <div class="detail-item"><label>Remarks</label><span>${CMMS.utils.escHtml(log.Remarks || "")}</span></div>
        </div>
        <div class="detail-section mt-3">
          <h4>Old Value</h4>
          <div class="detail-content">${formatValue(log.OldValue)}</div>
        </div>
        <div class="detail-section mt-3">
          <h4>New Value</h4>
          <div class="detail-content">${formatValue(log.NewValue)}</div>
        </div>
      </div>
    `);
    CMMS.utils.$("#auditModalClose").addEventListener("click", () => CMMS.utils.hideModal());
  },

  exportCsv() {
    const headers = ["ID", "DateTime", "User", "Role", "Department", "Module", "Action", "RecordID", "RecordName", "Status", "Remarks"];
    const rows = this.state.filtered.map(l => [
      l.AuditID || l.id || "",
      l.DateTime || l.CreatedAt || "",
      l.UserName || l.User || "",
      l.Role || "",
      l.Department || "",
      l.Module || "",
      l.Action || "",
      l.RecordID || "",
      l.RecordName || "",
      l.Status || "",
      (l.Remarks || "").replace(/,/g, ";")
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_trail.csv";
    a.click();
    URL.revokeObjectURL(url);
    CMMS.utils.showToast("CSV exported", "success");
  }
});
