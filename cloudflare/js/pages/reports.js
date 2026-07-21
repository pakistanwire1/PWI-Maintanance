CMMS.router.registerPage("reports", {
  title: "Reports",
  icon: CMMS.icons.barChart,

  state: {
    activeReport: "machineHistory",
    machines: [],
    departments: [],
    reportData: [],
    filters: {},
    loading: false
  },

  reportTypes: [
    { key: "machineHistory", label: "Machine History", icon: "cog" },
    { key: "technicianPerformance", label: "Technician Performance", icon: "user" },
    { key: "department", label: "Department", icon: "building" },
    { key: "breakdown", label: "Breakdown", icon: "alertTriangle" },
    { key: "downtime", label: "Downtime", icon: "clock" },
    { key: "monthly", label: "Monthly", icon: "calendar" },
    { key: "pmCompliance", label: "PM Compliance", icon: "checkCircle" }
  ],

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header"><h2>Reports</h2></div>
      <div class="report-type-selector" id="reportTypeSelector">
        ${this.reportTypes.map(r => `
          <button class="report-type-btn ${r.key === this.state.activeReport ? "active" : ""}" data-report="${r.key}">
            ${CMMS.utils.capitalize(r.label)}
          </button>
        `).join("")}
      </div>
      <div id="reportFilters" class="card"><div class="card-body" id="reportFiltersBody"></div></div>
      <div class="card" id="reportResultsCard" style="display:none">
        <div class="card-header"><h3 id="reportTitle"></h3>
          <div class="page-actions">
            <button class="btn btn-outline btn-sm" id="exportReportCsv">${CMMS.icons.download} Export CSV</button>
            <button class="btn btn-outline btn-sm" id="printReport">${CMMS.icons.print} Print</button>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive"><table class="table table-hover" id="reportTable">
            <thead id="reportTableHead"></thead>
            <tbody id="reportTableBody"></tbody>
          </table></div>
        </div>
      </div>
    `;
    CMMS.utils.$("#reportTypeSelector").addEventListener("click", (e) => {
      if (!e.target.classList.contains("report-type-btn")) return;
      this.state.activeReport = e.target.dataset.report;
      document.querySelectorAll(".report-type-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      this.state.reportData = [];
      this.state.filters = {};
      this.renderFilters();
      CMMS.utils.$("#reportResultsCard").style.display = "none";
    });
    CMMS.utils.$("#exportReportCsv").addEventListener("click", () => this.exportCsv());
    CMMS.utils.$("#printReport").addEventListener("click", () => window.print());
    await this.loadBaseData();
    this.renderFilters();
  },

  async loadBaseData() {
    try {
      const [machines, deptData] = await Promise.all([
        CMMS.api.call("getQRModuleRecords", { module: "Machines" }).catch(() => []),
        CMMS.api.call("getDepartmentList").catch(() => [])
      ]);
      this.state.machines = Array.isArray(machines) ? machines : (machines?.result || []);
      this.state.departments = Array.isArray(deptData) ? deptData : (deptData?.result || []);
    } catch (e) { /* ignore */ }
  },

  renderFilters() {
    const el = CMMS.utils.$("#reportFiltersBody");
    const report = this.state.activeReport;
    let html = "";

    switch (report) {
      case "machineHistory":
        html = `
          <div class="form-row">
            <div class="form-group"><label>Machine</label>
              <select id="rptMachine" class="form-control">
                <option value="">-- Select Machine --</option>
                ${this.state.machines.map(m => {
                  const id = m.MachineID || m.id || "";
                  const name = m.MachineName || m.Name || "";
                  return `<option value="${CMMS.utils.escHtml(id)}">${CMMS.utils.escHtml(name)}</option>`;
                }).join("")}
              </select>
            </div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;

      case "technicianPerformance":
        html = `
          <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="date" id="rptStartDate" class="form-control" value="${this.getDefaultDate(-30)}"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="rptEndDate" class="form-control" value="${CMMS.utils.nowISO().split('T')[0]}"></div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;

      case "department":
        html = `
          <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="date" id="rptStartDate" class="form-control" value="${this.getDefaultDate(-30)}"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="rptEndDate" class="form-control" value="${CMMS.utils.nowISO().split('T')[0]}"></div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;

      case "breakdown":
        html = `
          <div class="form-row">
            <div class="form-group"><label>Machine</label>
              <select id="rptMachine" class="form-control">
                <option value="">All Machines</option>
                ${this.state.machines.map(m => `<option value="${CMMS.utils.escHtml(m.MachineID || m.id || "")}">${CMMS.utils.escHtml(m.MachineName || m.Name || "")}</option>`).join("")}
              </select>
            </div>
            <div class="form-group"><label>Department</label>
              <select id="rptDepartment" class="form-control">
                <option value="">All Departments</option>
                ${this.state.departments.map(d => `<option value="${CMMS.utils.escHtml(d.DepartmentID || d.id || d)}">${CMMS.utils.escHtml(d.DepartmentName || d.Name || d)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="date" id="rptStartDate" class="form-control" value="${this.getDefaultDate(-30)}"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="rptEndDate" class="form-control" value="${CMMS.utils.nowISO().split('T')[0]}"></div>
            <div class="form-group"><label>Priority</label>
              <select id="rptPriority" class="form-control">
                <option value="">All</option><option value="Low">Low</option><option value="Medium">Medium</option>
                <option value="High">High</option><option value="Critical">Critical</option>
              </select>
            </div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;

      case "downtime":
        html = `
          <div class="form-row">
            <div class="form-group"><label>Machine</label>
              <select id="rptMachine" class="form-control">
                <option value="">-- Select Machine --</option>
                ${this.state.machines.map(m => `<option value="${CMMS.utils.escHtml(m.MachineID || m.id || "")}">${CMMS.utils.escHtml(m.MachineName || m.Name || "")}</option>`).join("")}
              </select>
            </div>
            <div class="form-group"><label>Start Date</label><input type="date" id="rptStartDate" class="form-control" value="${this.getDefaultDate(-30)}"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="rptEndDate" class="form-control" value="${CMMS.utils.nowISO().split('T')[0]}"></div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;

      case "monthly":
        const currentYear = new Date().getFullYear();
        html = `
          <div class="form-row">
            <div class="form-group"><label>Year</label>
              <select id="rptYear" class="form-control">
                ${[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => `<option value="${y}" ${y === currentYear ? "selected" : ""}>${y}</option>`).join("")}
              </select>
            </div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;

      case "pmCompliance":
        html = `
          <div class="form-row">
            <div class="form-group"><label>Machine</label>
              <select id="rptMachine" class="form-control">
                <option value="">-- Select Machine --</option>
                ${this.state.machines.map(m => `<option value="${CMMS.utils.escHtml(m.MachineID || m.id || "")}">${CMMS.utils.escHtml(m.MachineName || m.Name || "")}</option>`).join("")}
              </select>
            </div>
            <div class="form-group"><label>Start Date</label><input type="date" id="rptStartDate" class="form-control" value="${this.getDefaultDate(-90)}"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="rptEndDate" class="form-control" value="${CMMS.utils.nowISO().split('T')[0]}"></div>
            <div class="form-group flex-end"><button class="btn btn-primary" id="runReport">${CMMS.icons.play} Generate Report</button></div>
          </div>`;
        break;
    }

    el.innerHTML = html;
    CMMS.utils.$("#runReport")?.addEventListener("click", () => this.runReport());
  },

  getDefaultDate(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split("T")[0];
  },

  collectFilters() {
    const f = {};
    const el = (id) => { const e = CMMS.utils.$(`#${id}`); return e ? e.value.trim() : ""; };
    switch (this.state.activeReport) {
      case "machineHistory":
        f.machine = el("rptMachine"); break;
      case "technicianPerformance":
        f.startDate = el("rptStartDate"); f.endDate = el("rptEndDate"); break;
      case "department":
        f.startDate = el("rptStartDate"); f.endDate = el("rptEndDate"); break;
      case "breakdown":
        f.machine = el("rptMachine"); f.department = el("rptDepartment");
        f.startDate = el("rptStartDate"); f.endDate = el("rptEndDate"); f.priority = el("rptPriority"); break;
      case "downtime":
        f.machine = el("rptMachine"); f.startDate = el("rptStartDate"); f.endDate = el("rptEndDate"); break;
      case "monthly":
        f.year = el("rptYear"); break;
      case "pmCompliance":
        f.machine = el("rptMachine"); f.startDate = el("rptStartDate"); f.endDate = el("rptEndDate"); break;
    }
    return f;
  },

  async runReport() {
    const filters = this.collectFilters();
    this.state.filters = filters;
    CMMS.utils.showLoading(true);
    try {
      const data = await CMMS.api.call("getReportData", { reportType: this.state.activeReport, ...filters });
      this.state.reportData = Array.isArray(data) ? data : (data?.result || []);
      this.renderResults();
    } catch (err) {
      CMMS.utils.showToast("Report generation failed: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  renderResults() {
    const report = this.state.activeReport;
    const data = this.state.reportData;
    const card = CMMS.utils.$("#reportResultsCard");
    card.style.display = "block";

    const titles = {
      machineHistory: "Machine History Report",
      technicianPerformance: "Technician Performance Report",
      department: "Department Report",
      breakdown: "Breakdown Report",
      downtime: "Downtime Report",
      monthly: "Monthly Report",
      pmCompliance: "PM Compliance Report"
    };
    CMMS.utils.$("#reportTitle").textContent = titles[report] || "Report";

    let headers = [], rows = [];
    switch (report) {
      case "machineHistory":
        headers = ["Job Card No", "Date", "Title", "Type", "Status", "Priority", "Technician", "Downtime"];
        rows = data.map(r => [
          r.JobCardNo || r.id || "",
          CMMS.utils.formatDate(r.DateTime || r.CreatedAt || ""),
          r.Title || "",
          r.JobType || r.Type || "",
          r.Status || "",
          r.Priority || "",
          r.Technician || r.AssignedTo || "",
          r.Downtime || "0"
        ]);
        break;
      case "technicianPerformance":
        headers = ["Technician", "Total Jobs", "Completed", "Completion %", "Total Downtime (hrs)"];
        rows = data.map(r => {
          const total = parseInt(r.TotalJobs) || 0;
          const completed = parseInt(r.Completed) || 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return [r.Technician || r.Name || "", total, completed, pct + "%", r.TotalDowntime || "0"];
        });
        break;
      case "department":
        headers = ["Department", "Total Jobs", "Open Jobs", "Closed Jobs", "Total Downtime (hrs)"];
        rows = data.map(r => [r.Department || r.Name || "", r.TotalJobs || 0, r.OpenJobs || 0, r.ClosedJobs || 0, r.TotalDowntime || "0"]);
        break;
      case "breakdown":
        headers = ["Job Card No", "Date", "Machine", "Department", "Priority", "Status", "Technician"];
        rows = data.map(r => [
          r.JobCardNo || r.id || "", CMMS.utils.formatDate(r.DateTime || r.CreatedAt || ""),
          r.MachineName || r.Machine || "", r.Department || "",
          r.Priority || "", r.Status || "", r.Technician || r.AssignedTo || ""
        ]);
        break;
      case "downtime":
        headers = ["Job Card No", "Machine", "Date", "Downtime (hrs)", "Type", "Status"];
        rows = data.map(r => [
          r.JobCardNo || r.id || "", r.MachineName || r.Machine || "",
          CMMS.utils.formatDate(r.DateTime || r.CreatedAt || ""), r.Downtime || "0",
          r.JobType || r.Type || "", r.Status || ""
        ]);
        break;
      case "monthly":
        headers = ["Month", "Total Jobs", "Closed", "Open", "Downtime (hrs)", "Completion %"];
        rows = data.map(r => {
          const total = parseInt(r.Total) || 0;
          const closed = parseInt(r.Closed) || 0;
          const pct = total > 0 ? Math.round((closed / total) * 100) : 0;
          return [r.Month || "", total, closed, total - closed, r.Downtime || "0", pct + "%"];
        });
        break;
      case "pmCompliance":
        headers = ["PM Number", "Machine", "Scheduled Date", "Compliant", "Status"];
        rows = data.map(r => [
          r.PMNumber || r.id || "", r.MachineName || r.Machine || "",
          CMMS.utils.formatDate(r.ScheduledDate || r.DateTime || ""),
          r.Compliant === "Yes" || r.Compliant === true ? CMMS.utils.badge("Yes", "success") : CMMS.utils.badge("No", "danger"),
          r.Status || ""
        ]);
        break;
    }

    CMMS.utils.$("#reportTableHead").innerHTML = `<tr>${headers.map(h => `<th>${CMMS.utils.escHtml(h)}</th>`).join("")}</tr>`;
    CMMS.utils.$("#reportTableBody").innerHTML = rows.length === 0 ?
      `<tr><td colspan="${headers.length}" class="text-center text-muted">No data found</td></tr>` :
      rows.map(r => `<tr>${r.map(c => `<td>${typeof c === "string" && !c.includes("<") ? CMMS.utils.escHtml(String(c)) : c}</td>`).join("")}</tr>`).join("");
  },

  exportCsv() {
    const thead = CMMS.utils.$("#reportTableHead");
    const tbody = CMMS.utils.$("#reportTableBody");
    if (!thead || !tbody) return;
    const headers = Array.from(thead.querySelectorAll("th")).map(th => th.textContent);
    const rows = Array.from(tbody.querySelectorAll("tr")).map(tr =>
      Array.from(tr.querySelectorAll("td")).map(td => td.textContent.replace(/,/g, ""))
    );
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.state.activeReport}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    CMMS.utils.showToast("CSV exported", "success");
  }
});
