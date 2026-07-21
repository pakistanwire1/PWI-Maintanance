CMMS.router.registerPage("qr", {
  title: "QR & Barcode Center",
  icon: CMMS.icons.qrCode,

  state: {
    activeTab: "overview",
    stats: {},
    moduleRecords: {},
    scanHistory: [],
    historyPage: 1,
    historyPerPage: 20,
    historyFilter: "",
    historySearch: "",
    selectedModule: "Machines",
    printModule: "Machines",
    printRecords: [],
    printSelected: [],
    printLabelSize: "medium"
  },

  tabs: ["overview", "machines", "assets", "spareparts", "jobcards", "print", "history"],
  moduleMap: { machines: "Machines", assets: "Assets", spareparts: "Spare Parts", jobcards: "Job Cards" },

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header"><h2>QR & Barcode Center</h2></div>
      <div class="tab-nav" id="qrTabs">
        ${this.tabs.map(t => `<button class="tab-btn ${t === "overview" ? "active" : ""}" data-tab="${t}">${CMMS.utils.capitalize(t === "spareparts" ? "Spare Parts" : t === "jobcards" ? "Job Cards" : t)}</button>`).join("")}
      </div>
      <div id="qrTabContent"></div>
      <div id="qrScanDialog" class="modal-overlay" style="display:none">
        <div class="modal">
          <div class="modal-header"><h3>Scan QR / Barcode</h3><button class="modal-close" id="scanClose">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Scan or Type Code</label><input type="text" id="scanInput" class="form-control" placeholder="Scan or type code..."></div>
            <button class="btn btn-primary" id="scanLookup">${CMMS.icons.search} Lookup</button>
            <button class="btn btn-outline ml-2" id="scanCameraBtn">${CMMS.icons.camera} Camera</button>
            <div id="scanResult" class="mt-3"></div>
            <div id="scanCamera"></div>
          </div>
        </div>
      </div>
      <div id="qrPreviewDialog" class="modal-overlay" style="display:none">
        <div class="modal">
          <div class="modal-header"><h3>QR Code Preview</h3><button class="modal-close" id="previewClose">&times;</button></div>
          <div class="modal-body text-center" id="previewContent"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    const $ = CMMS.utils.$;
    $("#qrTabs").addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-btn")) {
        this.state.activeTab = e.target.dataset.tab;
        this.renderTab();
        document.querySelectorAll("#qrTabs .tab-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
      }
    });
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-qr-action]");
      if (!btn) return;
      this.handleAction(btn.dataset.qrAction, btn.dataset);
    });
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const [stats, machines, assets, spareparts, jobcards] = await Promise.all([
        CMMS.api.call("getQRStatistics").catch(() => ({})),
        CMMS.api.call("getQRModuleRecords", { module: "Machines" }).catch(() => []),
        CMMS.api.call("getQRModuleRecords", { module: "Assets" }).catch(() => []),
        CMMS.api.call("getQRModuleRecords", { module: "Spare Parts" }).catch(() => []),
        CMMS.api.call("getQRModuleRecords", { module: "Job Cards" }).catch(() => [])
      ]);
      this.state.stats = stats || {};
      this.state.moduleRecords = {
        Machines: Array.isArray(machines) ? machines : (machines?.result || []),
        Assets: Array.isArray(assets) ? assets : (assets?.result || []),
        "Spare Parts": Array.isArray(spareparts) ? spareparts : (spareparts?.result || []),
        "Job Cards": Array.isArray(jobcards) ? jobcards : (jobcards?.result || [])
      };
      this.renderTab();
    } catch (err) {
      CMMS.utils.showToast("Failed to load data: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  renderTab() {
    const el = CMMS.utils.$("#qrTabContent");
    switch (this.state.activeTab) {
      case "overview": this.renderOverview(el); break;
      case "machines": case "assets": case "spareparts": case "jobcards":
        this.state.selectedModule = this.moduleMap[this.state.activeTab];
        this.renderModuleTab(el); break;
      case "print": this.renderPrintTab(el); break;
      case "history": this.renderHistoryTab(el); break;
    }
  },

  renderOverview(el) {
    const s = this.state.stats;
    const totalGenerated = (s.qrGenerated || 0) + (s.barcodeGenerated || 0);
    const totalPending = (s.qrPending || 0) + (s.barcodePending || 0);
    const totalScanned = s.totalScanned || 0;

    let combinedRows = "";
    for (const [mod, records] of Object.entries(this.state.moduleRecords)) {
      records.forEach(r => {
        const id = r.MachineID || r.AssetID || r.SparePartID || r.JobCardNo || r.id || "";
        const name = r.MachineName || r.AssetName || r.SparePartName || r.Title || r.Name || "";
        combinedRows += `<tr>
          <td>${CMMS.utils.escHtml(id)}</td>
          <td>${CMMS.utils.badge(mod, "info")}</td>
          <td>${CMMS.utils.escHtml(name)}</td>
          <td>${CMMS.utils.statusBadge(r.QRCode ? "Success" : "Pending")}</td>
          <td>${CMMS.utils.statusBadge(r.Barcode ? "Success" : "Pending")}</td>
        </tr>`;
      });
    }

    el.innerHTML = `
      <div class="summary-cards">
        <div class="summary-card success"><div class="summary-icon">${CMMS.icons.qrCode}</div><div class="summary-info"><span class="summary-value">${totalGenerated}</span><span class="summary-label">Generated</span></div></div>
        <div class="summary-card warning"><div class="summary-icon">${CMMS.icons.clock}</div><div class="summary-info"><span class="summary-value">${totalPending}</span><span class="summary-label">Pending</span></div></div>
        <div class="summary-card info"><div class="summary-icon">${CMMS.icons.scan}</div><div class="summary-info"><span class="summary-value">${totalScanned}</span><span class="summary-label">Scanned</span></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>All Module Records</h3>
          <button class="btn btn-primary btn-sm" data-qr-action="openScan">${CMMS.icons.scan} Scan Code</button>
        </div>
        <div class="card-body"><div class="table-responsive"><table class="table table-hover">
          <thead><tr><th>ID/Code</th><th>Module</th><th>Name</th><th>QR Code</th><th>Barcode</th></tr></thead>
          <tbody>${combinedRows || '<tr><td colspan="5" class="text-center text-muted">No records found</td></tr>'}</tbody>
        </table></div></div>
      </div>
    `;
  },

  renderModuleTab(el) {
    const mod = this.state.selectedModule;
    const records = this.state.moduleRecords[mod] || [];

    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>${CMMS.utils.escHtml(mod)}</h3>
          <div>
            <button class="btn btn-outline btn-sm" data-qr-action="bulkQR" data-module="${mod}">${CMMS.icons.qrCode} Bulk QR</button>
            <button class="btn btn-outline btn-sm" data-qr-action="bulkBarcode" data-module="${mod}">${CMMS.icons.barcode} Bulk Barcode</button>
            <button class="btn btn-primary btn-sm" data-qr-action="openScan">${CMMS.icons.scan} Scan</button>
          </div>
        </div>
        <div class="card-body"><div class="table-responsive"><table class="table table-hover">
          <thead><tr><th>ID/Code</th><th>Name</th><th>Status</th><th>QR Code</th><th>Barcode</th><th>Actions</th></tr></thead>
          <tbody>
            ${records.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">No records</td></tr>' :
              records.map(r => {
                const id = r.MachineID || r.AssetID || r.SparePartID || r.JobCardNo || r.id || "";
                const name = r.MachineName || r.AssetName || r.SparePartName || r.Title || r.Name || "";
                return `<tr>
                  <td>${CMMS.utils.escHtml(id)}</td>
                  <td>${CMMS.utils.escHtml(name)}</td>
                  <td>${CMMS.utils.statusBadge(r.Status || "Active")}</td>
                  <td>${r.QRCode ? CMMS.utils.badge("Generated", "success") : CMMS.utils.badge("Pending", "warning")}</td>
                  <td>${r.Barcode ? CMMS.utils.badge("Generated", "success") : CMMS.utils.badge("Pending", "warning")}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      ${!r.QRCode ? `<button class="btn btn-sm btn-outline" data-qr-action="genQR" data-module="${mod}" data-id="${id}" title="Generate QR">${CMMS.icons.qrCode}</button>` : ""}
                      ${!r.Barcode ? `<button class="btn btn-sm btn-outline" data-qr-action="genBarcode" data-module="${mod}" data-id="${id}" title="Generate Barcode">${CMMS.icons.barcode}</button>` : ""}
                      ${(r.QRCode || r.Barcode) ? `<button class="btn btn-sm btn-outline" data-qr-action="preview" data-module="${mod}" data-id="${id}" title="Preview">${CMMS.icons.eye}</button>` : ""}
                    </div>
                  </td>
                </tr>`;
              }).join("")
            }
          </tbody>
        </table></div></div>
      </div>
    `;
  },

  renderPrintTab(el) {
    const modules = ["Machines", "Assets", "Spare Parts", "Job Cards"];
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Print Labels</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group"><label>Module</label>
              <select id="printModule" class="form-control">${modules.map(m => `<option value="${m}" ${m === this.state.printModule ? "selected" : ""}>${m}</option>`).join("")}</select>
            </div>
            <div class="form-group"><label>Label Size</label>
              <select id="printLabelSize" class="form-control">
                <option value="small">Small (50x30mm)</option>
                <option value="medium" selected>Medium (70x50mm)</option>
                <option value="large">Large (100x70mm)</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" id="loadPrintRecords">${CMMS.icons.refresh} Load Records</button>
          <div id="printRecordsList" class="mt-3"></div>
        </div>
      </div>
    `;
    CMMS.utils.$("#printModule").addEventListener("change", (e) => {
      this.state.printModule = e.target.value;
    });
    CMMS.utils.$("#printLabelSize").addEventListener("change", (e) => {
      this.state.printLabelSize = e.target.value;
    });
    CMMS.utils.$("#loadPrintRecords").addEventListener("click", () => this.loadPrintRecords());
  },

  async loadPrintRecords() {
    const mod = this.state.printModule;
    const records = this.state.moduleRecords[mod] || [];
    this.state.printRecords = records;
    this.state.printSelected = [];
    const el = CMMS.utils.$("#printRecordsList");
    if (records.length === 0) {
      el.innerHTML = '<p class="text-muted">No records found for this module.</p>';
      return;
    }
    el.innerHTML = `
      <div class="form-check mb-2"><input type="checkbox" id="selectAllPrint" class="form-check-input"><label for="selectAllPrint" class="form-check-label">Select All</label></div>
      <div class="table-responsive"><table class="table table-sm">
        <thead><tr><th>Select</th><th>ID</th><th>Name</th><th>QR</th><th>Barcode</th></tr></thead>
        <tbody>
          ${records.map((r, i) => {
            const id = r.MachineID || r.AssetID || r.SparePartID || r.JobCardNo || r.id || "";
            const name = r.MachineName || r.AssetName || r.SparePartName || r.Title || r.Name || "";
            return `<tr><td><input type="checkbox" class="print-select" data-index="${i}"></td><td>${CMMS.utils.escHtml(id)}</td><td>${CMMS.utils.escHtml(name)}</td><td>${CMMS.utils.statusBadge(r.QRCode ? "Yes" : "No")}</td><td>${CMMS.utils.statusBadge(r.Barcode ? "Yes" : "No")}</td></tr>`;
          }).join("")}
        </tbody>
      </table></div>
      <button class="btn btn-primary mt-2" id="printSelectedBtn">${CMMS.icons.print} Print Selected Labels</button>
    `;
    CMMS.utils.$("#selectAllPrint").addEventListener("change", (e) => {
      document.querySelectorAll(".print-select").forEach(cb => cb.checked = e.target.checked);
    });
    CMMS.utils.$("#printSelectedBtn").addEventListener("click", () => this.printSelectedLabels());
  },

  async printSelectedLabels() {
    const checked = document.querySelectorAll(".print-select:checked");
    if (checked.length === 0) {
      CMMS.utils.showToast("Select at least one record", "warning");
      return;
    }
    const indices = Array.from(checked).map(cb => parseInt(cb.dataset.index));
    const records = indices.map(i => this.state.printRecords[i]);

    try {
      const labelData = await CMMS.api.call("getPrintLabelData", { records, labelSize: this.state.printLabelSize });
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`<html><head><title>Print Labels</title><style>
        .label{border:1px solid #333;padding:8px;margin:4px;display:inline-block;text-align:center;page-break-inside:avoid}
        .label.small{width:50mm;height:30mm}.label.medium{width:70mm;height:50mm}.label.large{width:100mm;height:70mm}
        .label img{max-width:80%;max-height:60%}.label .name{font-size:10px;margin-top:4px}.label .id{font-size:8px;color:#666}
      </style></head><body>`);
      records.forEach(r => {
        const id = r.MachineID || r.AssetID || r.SparePartID || r.JobCardNo || r.id || "";
        const name = r.MachineName || r.AssetName || r.SparePartName || r.Title || r.Name || "";
        const imgSrc = (labelData && labelData[id]) || r.QRCode || "";
        printWindow.document.write(`<div class="label ${this.state.printLabelSize}">${imgSrc ? `<img src="${imgSrc}">` : ""}<div class="name">${CMMS.utils.escHtml(name)}</div><div class="id">${CMMS.utils.escHtml(id)}</div></div>`);
      });
      printWindow.document.write("</body></html>");
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      CMMS.utils.showToast("Failed to generate labels: " + err.message, "error");
    }
  },

  renderHistoryTab(el) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Scan History</h3>
          <div class="filters-row">
            <select id="historyModuleFilter" class="form-control form-control-sm">
              <option value="">All Modules</option>
              <option value="Machines">Machines</option><option value="Assets">Assets</option>
              <option value="Spare Parts">Spare Parts</option><option value="Job Cards">Job Cards</option>
            </select>
            <input type="text" id="historySearchFilter" class="form-control form-control-sm" placeholder="Search history...">
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive"><table class="table table-hover">
            <thead><tr><th>ID</th><th>DateTime</th><th>Code</th><th>Module</th><th>Record</th><th>Scanned By</th><th>Type</th></tr></thead>
            <tbody id="historyTableBody"></tbody>
          </table></div>
          <div id="historyPagination" class="pagination-controls"></div>
        </div>
      </div>
    `;
    CMMS.utils.$("#historyModuleFilter").addEventListener("change", (e) => { this.state.historyFilter = e.target.value; this.renderHistoryRows(); });
    CMMS.utils.$("#historySearchFilter").addEventListener("input", CMMS.utils.debounce((e) => { this.state.historySearch = e.target.value.toLowerCase(); this.state.historyPage = 1; this.renderHistoryRows(); }, 300));
    this.loadHistory();
  },

  async loadHistory() {
    try {
      const data = await CMMS.api.call("getQRScanHistory");
      this.state.scanHistory = Array.isArray(data) ? data : (data?.result || []);
      this.renderHistoryRows();
    } catch (err) {
      CMMS.utils.showToast("Failed to load scan history", "error");
    }
  },

  renderHistoryRows() {
    const { scanHistory, historyFilter, historySearch, historyPage, historyPerPage } = this.state;
    let filtered = scanHistory.filter(h => {
      if (historyFilter && h.Module !== historyFilter) return false;
      if (historySearch) {
        const hay = [h.Code, h.Module, h.RecordName, h.ScannedBy].join(" ").toLowerCase();
        if (!hay.includes(historySearch)) return false;
      }
      return true;
    });
    const totalPages = Math.ceil(filtered.length / historyPerPage);
    const start = (historyPage - 1) * historyPerPage;
    const paged = filtered.slice(start, start + historyPerPage);

    const tbody = CMMS.utils.$("#historyTableBody");
    tbody.innerHTML = paged.length === 0 ?
      '<tr><td colspan="7" class="text-center text-muted">No scan history</td></tr>' :
      paged.map(h => `<tr>
        <td>${CMMS.utils.escHtml(h.HistoryID || h.id || "")}</td>
        <td>${CMMS.utils.formatDateTime(h.DateTime || h.ScannedAt || "")}</td>
        <td>${CMMS.utils.escHtml(h.Code || "")}</td>
        <td>${CMMS.utils.badge(h.Module || "", "info")}</td>
        <td>${CMMS.utils.escHtml(h.RecordName || h.RecordID || "")}</td>
        <td>${CMMS.utils.escHtml(h.ScannedBy || "")}</td>
        <td>${CMMS.utils.badge(h.ScanType || "QR", "secondary")}</td>
      </tr>`).join("");

    const paginationEl = CMMS.utils.$("#historyPagination");
    if (totalPages <= 1) { paginationEl.innerHTML = ""; return; }
    let html = `<span class="pagination-info">Page ${historyPage} of ${totalPages}</span><div class="pagination-buttons">`;
    html += `<button class="btn btn-sm btn-outline" data-hpage="prev" ${historyPage === 1 ? "disabled" : ""}>&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="btn btn-sm ${i === historyPage ? "btn-primary" : "btn-outline"}" data-hpage="${i}">${i}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline" data-hpage="next" ${historyPage === totalPages ? "disabled" : ""}>&raquo;</button></div>`;
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll("button[data-hpage]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.hpage;
        if (v === "prev") this.state.historyPage = Math.max(1, historyPage - 1);
        else if (v === "next") this.state.historyPage = Math.min(totalPages, historyPage + 1);
        else this.state.historyPage = parseInt(v);
        this.renderHistoryRows();
      });
    });
  },

  async handleAction(action, dataset) {
    switch (action) {
      case "openScan":
        this.openScanDialog();
        break;
      case "genQR":
        await this.generateCode("generateQRCodeForRecord", dataset.module, dataset.id);
        break;
      case "genBarcode":
        await this.generateCode("generateBarcodeForRecord", dataset.module, dataset.id);
        break;
      case "preview":
        await this.previewCode(dataset.module, dataset.id);
        break;
      case "bulkQR":
        await this.bulkGenerate("bulkGenerateQRCode", dataset.module);
        break;
      case "bulkBarcode":
        await this.bulkGenerate("bulkGenerateBarcode", dataset.module);
        break;
    }
  },

  openScanDialog() {
    CMMS.utils.$("#qrScanDialog").style.display = "flex";
    CMMS.utils.$("#scanInput").value = "";
    CMMS.utils.$("#scanResult").innerHTML = "";
    CMMS.utils.$("#scanInput").focus();
    CMMS.utils.$("#scanClose").onclick = () => {
      CMMS.utils.$("#qrScanDialog").style.display = "none";
    };
    CMMS.utils.$("#scanLookup").onclick = () => this.performScan();
    CMMS.utils.$("#scanInput").onkeydown = (e) => { if (e.key === "Enter") this.performScan(); };
    CMMS.utils.$("#scanCameraBtn").onclick = () => this.startCameraScan();
  },

  async performScan() {
    const code = CMMS.utils.$("#scanInput").value.trim();
    if (!code) return;
    try {
      const isQR = code.length > 20;
      const data = isQR ?
        await CMMS.api.call("scanQRCode", { code }) :
        await CMMS.api.call("scanBarcode", { code });
      const result = data?.result || data;
      CMMS.utils.$("#scanResult").innerHTML = `
        <div class="alert alert-success">Record found!</div>
        <div class="detail-grid">
          <div class="detail-item"><label>ID</label><span>${CMMS.utils.escHtml(result.RecordID || result.id || code)}</span></div>
          <div class="detail-item"><label>Module</label>${CMMS.utils.badge(result.Module || "", "info")}</div>
          <div class="detail-item"><label>Name</label><span>${CMMS.utils.escHtml(result.Name || "")}</span></div>
          <div class="detail-item"><label>Status</label>${CMMS.utils.statusBadge(result.Status || "Active")}</div>
        </div>
      `;
    } catch (err) {
      CMMS.utils.$("#scanResult").innerHTML = `<div class="alert alert-danger">No record found for code: ${CMMS.utils.escHtml(code)}</div>`;
    }
  },

  async startCameraScan() {
    try {
      const html5QrCode = new Html5Qrcode("scanCamera");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          html5QrCode.stop();
          CMMS.utils.$("#scanCamera").innerHTML = "";
          CMMS.utils.$("#scanInput").value = decodedText;
          this.performScan();
        },
        () => {}
      );
    } catch (err) {
      CMMS.utils.showToast("Camera not available: " + err.message, "warning");
    }
  },

  async generateCode(apiAction, module, id) {
    try {
      await CMMS.api.call(apiAction, { module, id });
      const record = (this.state.moduleRecords[module] || []).find(r => {
        const rid = r.MachineID || r.AssetID || r.SparePartID || r.JobCardNo || r.id;
        return rid == id;
      });
      if (record) {
        if (apiAction.includes("QR")) record.QRCode = true;
        else record.Barcode = true;
      }
      this.renderTab();
      CMMS.utils.showToast("Code generated successfully", "success");
    } catch (err) {
      CMMS.utils.showToast("Generation failed: " + err.message, "error");
    }
  },

  async previewCode(module, id) {
    try {
      const data = await CMMS.api.call("getModuleRecordDetail", { module, id });
      const result = data?.result || data;
      CMMS.utils.$("#qrPreviewDialog").style.display = "flex";
      CMMS.utils.$("#previewContent").innerHTML = `
        <div>${result.QRCode ? `<img src="${result.QRCode}" style="max-width:300px" class="mb-3"><br>` : ""}${result.Barcode ? `<img src="${result.Barcode}" style="max-width:300px" class="mb-3"><br>` : ""}</div>
        <div class="detail-grid" style="text-align:left">
          <div class="detail-item"><label>ID</label><span>${CMMS.utils.escHtml(id)}</span></div>
          <div class="detail-item"><label>Module</label>${CMMS.utils.badge(module, "info")}</div>
          <div class="detail-item"><label>Name</label><span>${CMMS.utils.escHtml(result.Name || "")}</span></div>
        </div>
        <button class="btn btn-primary mt-3" id="downloadQR">${CMMS.icons.download} Download as PNG</button>
      `;
      CMMS.utils.$("#previewClose").onclick = () => { CMMS.utils.$("#qrPreviewDialog").style.display = "none"; };
      CMMS.utils.$("#downloadQR")?.addEventListener("click", () => {
        if (result.QRCode) {
          const a = document.createElement("a");
          a.href = result.QRCode;
          a.download = `QR_${id}.png`;
          a.click();
        }
      });
    } catch (err) {
      CMMS.utils.showToast("Failed to load preview", "error");
    }
  },

  async bulkGenerate(apiAction, module) {
    const confirmed = await CMMS.utils.showConfirm(`Generate codes for all ${module} records?`);
    if (!confirmed) return;
    try {
      await CMMS.api.call(apiAction, { module });
      await this.loadData();
      CMMS.utils.showToast("Bulk generation complete", "success");
    } catch (err) {
      CMMS.utils.showToast("Bulk generation failed: " + err.message, "error");
    }
  }
});
