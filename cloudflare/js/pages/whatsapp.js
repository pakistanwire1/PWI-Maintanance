CMMS.router.registerPage("whatsapp", {
  title: "WhatsApp Notifications",
  icon: CMMS.icons.messageSquare,

  state: {
    activeTab: "settings",
    settings: {},
    templates: [],
    logs: [],
    panel: {},
    editingTemplate: null,
    testPhone: ""
  },

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header"><h2>WhatsApp Notifications</h2></div>
      <div class="summary-cards" id="whatsappPanelCards"></div>
      <div class="tab-nav" id="whatsappTabs">
        <button class="tab-btn active" data-tab="settings">Settings</button>
        <button class="tab-btn" data-tab="templates">Templates</button>
        <button class="tab-btn" data-tab="logs">Logs</button>
        <button class="tab-btn" data-tab="test">Test</button>
      </div>
      <div id="whatsappTabContent"></div>
    `;
    CMMS.utils.$("#whatsappTabs").addEventListener("click", (e) => {
      if (!e.target.classList.contains("tab-btn")) return;
      this.state.activeTab = e.target.dataset.tab;
      document.querySelectorAll("#whatsappTabs .tab-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      this.renderTab();
    });
    await this.loadData();
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const [settings, templates, logs, panel] = await Promise.all([
        CMMS.api.call("whatsappGetSettings").catch(() => ({})),
        CMMS.api.call("whatsappGetTemplates").catch(() => []),
        CMMS.api.call("whatsappGetLogs").catch(() => []),
        CMMS.api.call("whatsappGetPanelData").catch(() => ({}))
      ]);
      this.state.settings = settings?.result || settings || {};
      this.state.templates = Array.isArray(templates) ? templates : (templates?.result || []);
      this.state.logs = Array.isArray(logs) ? logs : (logs?.result || []);
      this.state.panel = panel?.result || panel || {};
      this.renderPanel();
      this.renderTab();
    } catch (err) {
      CMMS.utils.showToast("Failed to load WhatsApp data: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  renderPanel() {
    const p = this.state.panel;
    CMMS.utils.$("#whatsappPanelCards").innerHTML = `
      <div class="summary-card success"><div class="summary-icon">${CMMS.icons.messageSquare}</div><div class="summary-info"><span class="summary-value">${p.sentToday || 0}</span><span class="summary-label">Sent Today</span></div></div>
      <div class="summary-card danger"><div class="summary-icon">${CMMS.icons.alertTriangle}</div><div class="summary-info"><span class="summary-value">${p.failedToday || 0}</span><span class="summary-label">Failed Today</span></div></div>
      <div class="summary-card warning"><div class="summary-icon">${CMMS.icons.clock}</div><div class="summary-info"><span class="summary-value">${p.pendingToday || 0}</span><span class="summary-label">Pending Today</span></div></div>
    `;
  },

  renderTab() {
    switch (this.state.activeTab) {
      case "settings": this.renderSettings(); break;
      case "templates": this.renderTemplates(); break;
      case "logs": this.renderLogs(); break;
      case "test": this.renderTest(); break;
    }
  },

  renderSettings() {
    const s = this.state.settings;
    CMMS.utils.$("#whatsappTabContent").innerHTML = `
      <div class="card">
        <div class="card-header"><h3>WhatsApp Settings</h3></div>
        <div class="card-body">
          <form id="waSettingsForm">
            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="waEnabled" class="form-check-input" ${s.Enabled === "Yes" || s.Enabled === true ? "checked" : ""}>
                Enable WhatsApp Notifications
              </label>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Company Name</label><input type="text" id="waCompanyName" class="form-control" value="${CMMS.utils.escHtml(s.CompanyName || "")}"></div>
              <div class="form-group"><label>Provider</label>
                <select id="waProvider" class="form-control">
                  <option value="Meta" ${s.Provider === "Meta" ? "selected" : ""}>Meta (WhatsApp Business)</option>
                  <option value="Twilio" ${s.Provider === "Twilio" ? "selected" : ""}>Twilio</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>API Endpoint</label><input type="url" id="waApiEndpoint" class="form-control" value="${CMMS.utils.escHtml(s.APIEndpoint || "")}"></div>
              <div class="form-group"><label>API Key</label><input type="password" id="waApiKey" class="form-control" value="${CMMS.utils.escHtml(s.APIKey || "")}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Phone Number ID</label><input type="text" id="waPhoneNumberId" class="form-control" value="${CMMS.utils.escHtml(s.PhoneNumberID || "")}"></div>
              <div class="form-group"><label>Access Token</label><input type="password" id="waAccessToken" class="form-control" value="${CMMS.utils.escHtml(s.AccessToken || "")}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Webhook Verify Token</label><input type="text" id="waWebhookToken" class="form-control" value="${CMMS.utils.escHtml(s.WebhookVerifyToken || "")}"></div>
              <div class="form-group"><label>Default Recipient</label><input type="text" id="waDefaultRecipient" class="form-control" value="${CMMS.utils.escHtml(s.DefaultRecipient || "")}"></div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">${CMMS.icons.save} Save Settings</button>
            </div>
          </form>
        </div>
      </div>
    `;
    CMMS.utils.$("#waSettingsForm").addEventListener("submit", (e) => { e.preventDefault(); this.saveSettings(); });
  },

  renderTemplates() {
    const el = CMMS.utils.$("#whatsappTabContent");
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Message Templates</h3></div>
        <div class="card-body">
          ${this.state.templates.length === 0 ? '<p class="text-muted">No templates configured.</p>' :
            this.state.templates.map((t, i) => `
              <div class="template-card" data-template-index="${i}">
                <div class="template-header">
                  <div>
                    <strong>${CMMS.utils.escHtml(t.Name || "")}</strong>
                    ${CMMS.utils.badge(t.EventType || "", "info")}
                  </div>
                  <button class="btn btn-sm btn-outline" data-action="editTemplate" data-index="${i}">${CMMS.icons.edit} Edit</button>
                </div>
                <div class="template-body">${CMMS.utils.escHtml(t.Body || "").replace(/\{\{(\w+)\}\}/g, '<span class="placeholder">{{$1}}</span>')}</div>
              </div>
            `).join("")
          }
        </div>
      </div>
    `;
    el.querySelectorAll("[data-action='editTemplate']").forEach(btn => {
      btn.addEventListener("click", () => this.editTemplate(parseInt(btn.dataset.index)));
    });
  },

  editTemplate(index) {
    const t = this.state.templates[index];
    if (!t) return;
    CMMS.utils.showModal(`
      <div class="modal-header"><h3>Edit Template: ${CMMS.utils.escHtml(t.Name || "")}</h3><button class="modal-close" id="tplModalClose">&times;</button></div>
      <div class="modal-body">
        <form id="tplEditForm">
          <div class="form-group"><label>Template Name</label><input type="text" id="tplName" class="form-control" value="${CMMS.utils.escHtml(t.Name || "")}"></div>
          <div class="form-group"><label>Event Type</label><input type="text" id="tplEventType" class="form-control" value="${CMMS.utils.escHtml(t.EventType || "")}"></div>
          <div class="form-group"><label>Body (use {{variable}} for placeholders)</label><textarea id="tplBody" class="form-control" rows="6">${CMMS.utils.escHtml(t.Body || "")}</textarea></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${CMMS.icons.save} Save Template</button>
          </div>
        </form>
      </div>
    `);
    CMMS.utils.$("#modalClose")?.addEventListener("click", () => CMMS.utils.hideModal());
    CMMS.utils.$("#tplModalClose")?.addEventListener("click", () => CMMS.utils.hideModal());
    CMMS.utils.$("#tplEditForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.saveTemplate(index);
    });
  },

  async saveTemplate(index) {
    const tpl = {
      Name: CMMS.utils.$("#tplName").value.trim(),
      EventType: CMMS.utils.$("#tplEventType").value.trim(),
      Body: CMMS.utils.$("#tplBody").value
    };
    try {
      await CMMS.api.call("whatsappSaveTemplate", { index, ...tpl });
      this.state.templates[index] = { ...this.state.templates[index], ...tpl };
      CMMS.utils.hideModal();
      this.renderTemplates();
      CMMS.utils.showToast("Template saved", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed to save template: " + err.message, "error");
    }
  },

  renderLogs() {
    CMMS.utils.$("#whatsappTabContent").innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Message Logs</h3>
          <button class="btn btn-outline btn-sm" id="refreshWaLogs">${CMMS.icons.refresh} Refresh</button>
        </div>
        <div class="card-body">
          <div class="table-responsive"><table class="table table-hover">
            <thead><tr><th>ID</th><th>DateTime</th><th>Recipient</th><th>Module</th><th>Status</th><th>Provider</th></tr></thead>
            <tbody>
              ${this.state.logs.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">No message logs</td></tr>' :
                this.state.logs.map(l => `<tr>
                  <td>${CMMS.utils.escHtml(l.MessageID || l.id || "")}</td>
                  <td>${CMMS.utils.formatDateTime(l.DateTime || l.SentAt || "")}</td>
                  <td>${CMMS.utils.escHtml(l.Recipient || "")}</td>
                  <td>${CMMS.utils.badge(l.Module || "", "info")}</td>
                  <td>${CMMS.utils.statusBadge(l.Status || "Pending")}</td>
                  <td>${CMMS.utils.escHtml(l.Provider || "")}</td>
                </tr>`).join("")
              }
            </tbody>
          </table></div>
        </div>
      </div>
    `;
    CMMS.utils.$("#refreshWaLogs")?.addEventListener("click", async () => {
      try {
        const logs = await CMMS.api.call("whatsappGetLogs");
        this.state.logs = Array.isArray(logs) ? logs : (logs?.result || []);
        this.renderLogs();
      } catch (err) {
        CMMS.utils.showToast("Failed to refresh logs", "error");
      }
    });
  },

  renderTest() {
    CMMS.utils.$("#whatsappTabContent").innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Send Test Message</h3></div>
        <div class="card-body">
          <div class="form-group"><label>Phone Number (with country code)</label>
            <input type="text" id="testPhone" class="form-control" placeholder="+971XXXXXXXXX" value="${CMMS.utils.escHtml(this.state.testPhone)}">
          </div>
          <div class="form-group"><label>Template</label>
            <select id="testTemplate" class="form-control">
              <option value="">-- Select Template --</option>
              ${this.state.templates.map(t => `<option value="${CMMS.utils.escHtml(t.Name || "")}">${CMMS.utils.escHtml(t.Name || "")} (${CMMS.utils.escHtml(t.EventType || "")})</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-primary" id="sendTestBtn">${CMMS.icons.send} Send Test</button>
          <div id="testResult" class="mt-3"></div>
        </div>
      </div>
    `;
    CMMS.utils.$("#sendTestBtn").addEventListener("click", () => this.sendTest());
  },

  async sendTest() {
    const phone = CMMS.utils.$("#testPhone").value.trim();
    const template = CMMS.utils.$("#testTemplate").value;
    if (!phone) {
      CMMS.utils.showToast("Enter a phone number", "warning");
      return;
    }
    try {
      await CMMS.api.call("whatsappTestSend", { phone, template });
      CMMS.utils.$("#testResult").innerHTML = '<div class="alert alert-success">Test message sent successfully!</div>';
      CMMS.utils.showToast("Test message sent", "success");
    } catch (err) {
      CMMS.utils.$("#testResult").innerHTML = `<div class="alert alert-danger">Failed: ${CMMS.utils.escHtml(err.message)}</div>`;
    }
  },

  async saveSettings() {
    const settings = {
      Enabled: CMMS.utils.$("#waEnabled").checked ? "Yes" : "No",
      CompanyName: CMMS.utils.$("#waCompanyName").value.trim(),
      Provider: CMMS.utils.$("#waProvider").value,
      APIEndpoint: CMMS.utils.$("#waApiEndpoint").value.trim(),
      APIKey: CMMS.utils.$("#waApiKey").value,
      PhoneNumberID: CMMS.utils.$("#waPhoneNumberId").value.trim(),
      AccessToken: CMMS.utils.$("#waAccessToken").value,
      WebhookVerifyToken: CMMS.utils.$("#waWebhookToken").value.trim(),
      DefaultRecipient: CMMS.utils.$("#waDefaultRecipient").value.trim()
    };
    try {
      await CMMS.api.call("whatsappSaveSettings", settings);
      this.state.settings = { ...this.state.settings, ...settings };
      CMMS.utils.showToast("Settings saved", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed to save: " + err.message, "error");
    }
  }
});
