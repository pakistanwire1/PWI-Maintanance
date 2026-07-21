CMMS.router.registerPage("backup", {
  title: "Backup & Restore",
  icon: CMMS.icons.database,

  state: {
    backups: [],
    loading: false,
    importFile: null
  },

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header">
        <h2>Backup & Restore</h2>
        <div class="page-actions">
          <button class="btn btn-primary" id="createBackupBtn">${CMMS.icons.plus} Create Backup</button>
          <button class="btn btn-outline" id="importBackupBtn">${CMMS.icons.upload} Import Backup</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Backup History</h3>
          <button class="btn btn-outline btn-sm" id="refreshBackups">${CMMS.icons.refresh} Refresh</button>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>ID</th><th>DateTime</th><th>Label</th><th>Sheets</th><th>Size</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="backupTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="createBackupDialog" class="modal-overlay" style="display:none">
        <div class="modal">
          <div class="modal-header"><h3>Create Backup</h3><button class="modal-close" id="createClose">&times;</button></div>
          <div class="modal-body">
            <div class="form-group">
              <label>Label (optional)</label>
              <input type="text" id="backupLabel" class="form-control" placeholder="e.g., Before migration, Weekly backup...">
            </div>
            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="backupIncludeAll" class="form-check-input" checked>
                Include all sheets
              </label>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" id="confirmCreateBackup">${CMMS.icons.download} Create Backup</button>
              <button class="btn btn-outline ml-2" id="cancelCreate">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <div id="importBackupDialog" class="modal-overlay" style="display:none">
        <div class="modal">
          <div class="modal-header"><h3>Import Backup</h3><button class="modal-close" id="importClose">&times;</button></div>
          <div class="modal-body">
            <div class="form-group">
              <label>Select backup file (JSON)</label>
              <input type="file" id="backupFileInput" class="form-control" accept=".json">
            </div>
            <div id="importPreview" class="mt-2"></div>
            <div class="form-actions">
              <button class="btn btn-primary" id="confirmImport" disabled>${CMMS.icons.upload} Import</button>
              <button class="btn btn-outline ml-2" id="cancelImport">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    CMMS.utils.$("#createBackupBtn").addEventListener("click", () => this.showCreateDialog());
    CMMS.utils.$("#importBackupBtn").addEventListener("click", () => this.showImportDialog());
    CMMS.utils.$("#refreshBackups").addEventListener("click", () => this.loadData());
    CMMS.utils.$("#createClose").addEventListener("click", () => { CMMS.utils.$("#createBackupDialog").style.display = "none"; });
    CMMS.utils.$("#cancelCreate").addEventListener("click", () => { CMMS.utils.$("#createBackupDialog").style.display = "none"; });
    CMMS.utils.$("#confirmCreateBackup").addEventListener("click", () => this.createBackup());
    CMMS.utils.$("#importClose").addEventListener("click", () => { CMMS.utils.$("#importBackupDialog").style.display = "none"; });
    CMMS.utils.$("#cancelImport").addEventListener("click", () => { CMMS.utils.$("#importBackupDialog").style.display = "none"; });
    CMMS.utils.$("#confirmImport").addEventListener("click", () => this.importBackup());
    CMMS.utils.$("#backupFileInput").addEventListener("change", (e) => this.previewImportFile(e));
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const data = await CMMS.api.call("getBackupHistory");
      this.state.backups = Array.isArray(data) ? data : (data?.result || []);
      this.renderTable();
    } catch (err) {
      CMMS.utils.showToast("Failed to load backups: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  renderTable() {
    const tbody = CMMS.utils.$("#backupTableBody");
    if (this.state.backups.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No backups found. Create your first backup!</td></tr>';
      return;
    }
    tbody.innerHTML = this.state.backups.map(b => {
      const size = b.Size ? (typeof b.Size === "number" ? this.formatSize(b.Size) : b.Size) : "N/A";
      return `<tr>
        <td>${CMMS.utils.escHtml(b.BackupID || b.id || "")}</td>
        <td>${CMMS.utils.formatDateTime(b.DateTime || b.CreatedAt || "")}</td>
        <td>${CMMS.utils.escHtml(b.Label || "No label")}</td>
        <td>${b.SheetsCount || b.Sheets || 0}</td>
        <td>${size}</td>
        <td>${CMMS.utils.statusBadge(b.Status || "Success")}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-sm btn-outline" data-action="restore" data-id="${b.BackupID || b.id}" title="Restore">${CMMS.icons.refresh}</button>
            <button class="btn btn-sm btn-outline" data-action="export" data-id="${b.BackupID || b.id}" title="Export">${CMMS.icons.download}</button>
            <button class="btn btn-sm btn-danger-outline" data-action="delete" data-id="${b.BackupID || b.id}" title="Delete">${CMMS.icons.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === "restore") this.restoreBackup(id);
        else if (action === "export") this.exportBackup(id);
        else if (action === "delete") this.deleteBackup(id);
      });
    });
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  },

  showCreateDialog() {
    CMMS.utils.$("#createBackupDialog").style.display = "flex";
    CMMS.utils.$("#backupLabel").value = "";
    CMMS.utils.$("#backupLabel").focus();
  },

  async createBackup() {
    const label = CMMS.utils.$("#backupLabel").value.trim();
    CMMS.utils.$("#createBackupDialog").style.display = "none";
    CMMS.utils.showLoading(true);
    try {
      await CMMS.api.call("createBackup", { label });
      CMMS.utils.showToast("Backup created successfully", "success");
      await this.loadData();
    } catch (err) {
      CMMS.utils.showToast("Backup failed: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  async restoreBackup(id) {
    const backup = this.state.backups.find(b => (b.BackupID || b.id) == id);
    const label = backup?.Label || "this backup";
    const confirmed = await CMMS.utils.showConfirm(
      `Restore from "${label}"? This will OVERWRITE current data. This action cannot be undone.`
    );
    if (!confirmed) return;
    CMMS.utils.showLoading(true);
    try {
      await CMMS.api.call("restoreBackup", { id });
      CMMS.utils.showToast("Backup restored successfully. Page will reload.", "success");
      setTimeout(() => location.reload(), 2000);
    } catch (err) {
      CMMS.utils.showToast("Restore failed: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  async exportBackup(id) {
    try {
      const data = await CMMS.api.call("exportBackup", { id });
      const jsonStr = JSON.stringify(data?.result || data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const backup = this.state.backups.find(b => (b.BackupID || b.id) == id);
      a.download = `backup_${backup?.Label || id}_${CMMS.utils.nowISO().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      CMMS.utils.showToast("Backup exported", "success");
    } catch (err) {
      CMMS.utils.showToast("Export failed: " + err.message, "error");
    }
  },

  async deleteBackup(id) {
    const confirmed = await CMMS.utils.showConfirm("Delete this backup? This cannot be undone.");
    if (!confirmed) return;
    try {
      await CMMS.api.call("deleteBackup", { id });
      this.state.backups = this.state.backups.filter(b => (b.BackupID || b.id) != id);
      this.renderTable();
      CMMS.utils.showToast("Backup deleted", "success");
    } catch (err) {
      CMMS.utils.showToast("Delete failed: " + err.message, "error");
    }
  },

  showImportDialog() {
    CMMS.utils.$("#importBackupDialog").style.display = "flex";
    CMMS.utils.$("#backupFileInput").value = "";
    CMMS.utils.$("#importPreview").innerHTML = "";
    CMMS.utils.$("#confirmImport").disabled = true;
  },

  previewImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.state.importFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const sheets = data.sheets || data.data || data;
        const sheetCount = Array.isArray(sheets) ? sheets.length : Object.keys(sheets).length;
        CMMS.utils.$("#importPreview").innerHTML = `
          <div class="alert alert-info">
            <strong>File:</strong> ${CMMS.utils.escHtml(file.name)}<br>
            <strong>Size:</strong> ${this.formatSize(file.size)}<br>
            <strong>Sheets/Data:</strong> ${sheetCount} ${Array.isArray(sheets) ? "sheets" : "sections"}<br>
            <strong>Label:</strong> ${CMMS.utils.escHtml(data.Label || "Imported")}
          </div>
        `;
        CMMS.utils.$("#confirmImport").disabled = false;
      } catch (err) {
        CMMS.utils.$("#importPreview").innerHTML = '<div class="alert alert-danger">Invalid JSON file</div>';
        CMMS.utils.$("#confirmImport").disabled = true;
      }
    };
    reader.readAsText(file);
  },

  async importBackup() {
    if (!this.state.importFile) return;
    const confirmed = await CMMS.utils.showConfirm("Import this backup? This will merge/overwrite data.");
    if (!confirmed) return;
    CMMS.utils.showLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          await CMMS.api.call("importBackup", { data });
          CMMS.utils.$("#importBackupDialog").style.display = "none";
          CMMS.utils.showToast("Backup imported successfully", "success");
          await this.loadData();
        } catch (err) {
          CMMS.utils.showToast("Import failed: " + err.message, "error");
        } finally {
          CMMS.utils.showLoading(false);
        }
      };
      reader.readAsText(this.state.importFile);
    } catch (err) {
      CMMS.utils.showToast("Import failed: " + err.message, "error");
      CMMS.utils.showLoading(false);
    }
  }
});
