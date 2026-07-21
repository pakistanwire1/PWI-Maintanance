CMMS.router.registerPage("email", {
  title: "Email Notification Settings",
  icon: CMMS.icons.mail,

  state: {
    activeTab: "settings",
    settings: {},
    logs: [],
    panel: {},
    sendForm: { recipient: "", subject: "", body: "", senderName: "", replyTo: "" }
  },

  async render() {
    const container = CMMS.loader.getContainer();
    container.innerHTML = `
      <div class="page-header"><h2>Email Notification Settings</h2></div>
      <div class="summary-cards" id="emailPanelCards"></div>
      <div class="tab-nav" id="emailTabs">
        <button class="tab-btn active" data-tab="settings">Settings</button>
        <button class="tab-btn" data-tab="send">Send Email</button>
        <button class="tab-btn" data-tab="logs">Logs</button>
      </div>
      <div id="emailTabContent"></div>
    `;
    CMMS.utils.$("#emailTabs").addEventListener("click", (e) => {
      if (!e.target.classList.contains("tab-btn")) return;
      this.state.activeTab = e.target.dataset.tab;
      document.querySelectorAll("#emailTabs .tab-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      this.renderTab();
    });
    await this.loadData();
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const [settings, logs, panel] = await Promise.all([
        CMMS.api.call("emailGetSettings").catch(() => ({})),
        CMMS.api.call("emailGetLogs").catch(() => []),
        CMMS.api.call("emailGetPanelData").catch(() => ({}))
      ]);
      this.state.settings = settings?.result || settings || {};
      this.state.logs = Array.isArray(logs) ? logs : (logs?.result || []);
      this.state.panel = panel?.result || panel || {};
      this.renderPanel();
      this.renderTab();
    } catch (err) {
      CMMS.utils.showToast("Failed to load email data: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  renderPanel() {
    const p = this.state.panel;
    CMMS.utils.$("#emailPanelCards").innerHTML = `
      <div class="summary-card success"><div class="summary-icon">${CMMS.icons.mail}</div><div class="summary-info"><span class="summary-value">${p.sentToday || 0}</span><span class="summary-label">Sent Today</span></div></div>
      <div class="summary-card danger"><div class="summary-icon">${CMMS.icons.alertTriangle}</div><div class="summary-info"><span class="summary-value">${p.failedToday || 0}</span><span class="summary-label">Failed Today</span></div></div>
      <div class="summary-card warning"><div class="summary-icon">${CMMS.icons.clock}</div><div class="summary-info"><span class="summary-value">${p.pendingToday || 0}</span><span class="summary-label">Pending Today</span></div></div>
    `;
  },

  renderTab() {
    switch (this.state.activeTab) {
      case "settings": this.renderSettings(); break;
      case "send": this.renderSend(); break;
      case "logs": this.renderLogs(); break;
    }
  },

  renderSettings() {
    const s = this.state.settings;
    const el = CMMS.utils.$("#emailTabContent");
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Email Settings</h3></div>
        <div class="card-body">
          <form id="emailSettingsForm">
            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" id="emailEnabled" class="form-check-input" ${s.Enabled === "Yes" || s.Enabled === true ? "checked" : ""}>
                Enable Email Notifications
              </label>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Sender Name</label><input type="text" id="emailSenderName" class="form-control" value="${CMMS.utils.escHtml(s.SenderName || "")}"></div>
              <div class="form-group"><label>Reply-To Email</label><input type="email" id="emailReplyTo" class="form-control" value="${CMMS.utils.escHtml(s.ReplyTo || "")}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Daily Summary Time</label><input type="time" id="emailDailyTime" class="form-control" value="${CMMS.utils.escHtml(s.DailySummaryTime || "08:00")}"></div>
              <div class="form-group"><label>Weekly Summary Day</label>
                <select id="emailWeeklyDay" class="form-control">
                  ${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => `<option value="${d}" ${s.WeeklySummaryDay === d ? "selected" : ""}>${d}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">${CMMS.icons.save} Save Settings</button>
              <button type="button" class="btn btn-outline ml-2" id="retryFailedBtn">${CMMS.icons.refresh} Retry Failed</button>
              <button type="button" class="btn btn-outline ml-2" id="sendDailySummaryBtn">${CMMS.icons.mail} Send Daily Summary</button>
            </div>
          </form>
        </div>
      </div>
    `;
    CMMS.utils.$("#emailSettingsForm").addEventListener("submit", (e) => { e.preventDefault(); this.saveSettings(); });
    CMMS.utils.$("#retryFailedBtn").addEventListener("click", () => this.retryFailed());
    CMMS.utils.$("#sendDailySummaryBtn").addEventListener("click", () => this.sendDailySummary());
  },

  renderSend() {
    const f = this.state.sendForm;
    const el = CMMS.utils.$("#emailTabContent");
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Send Email</h3></div>
        <div class="card-body">
          <form id="emailSendForm">
            <div class="form-row">
              <div class="form-group" style="flex:2"><label>Recipient Email</label><input type="email" id="sendRecipient" class="form-control" value="${CMMS.utils.escHtml(f.recipient)}" required></div>
              <div class="form-group"><label>Sender Name</label><input type="text" id="sendSenderName" class="form-control" value="${CMMS.utils.escHtml(f.senderName || this.state.settings.SenderName || "")}"></div>
              <div class="form-group"><label>Reply-To</label><input type="email" id="sendReplyTo" class="form-control" value="${CMMS.utils.escHtml(f.replyTo || this.state.settings.ReplyTo || "")}"></div>
            </div>
            <div class="form-group"><label>Subject</label><input type="text" id="sendSubject" class="form-control" value="${CMMS.utils.escHtml(f.subject)}" required></div>
            <div class="form-group"><label>Body</label><textarea id="sendBody" class="form-control" rows="8" required>${CMMS.utils.escHtml(f.body)}</textarea></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">${CMMS.icons.send} Send Email</button>
            </div>
          </form>
        </div>
      </div>
    `;
    CMMS.utils.$("#emailSendForm").addEventListener("submit", (e) => { e.preventDefault(); this.sendEmail(); });
  },

  renderLogs() {
    const el = CMMS.utils.$("#emailTabContent");
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Email Logs</h3>
          <button class="btn btn-outline btn-sm" id="refreshEmailLogs">${CMMS.icons.refresh} Refresh</button>
        </div>
        <div class="card-body">
          <div class="table-responsive"><table class="table table-hover">
            <thead><tr><th>ID</th><th>DateTime</th><th>Recipient</th><th>Subject</th><th>Module</th><th>Status</th><th>Error</th></tr></thead>
            <tbody>
              ${this.state.logs.length === 0 ? '<tr><td colspan="7" class="text-center text-muted">No email logs</td></tr>' :
                this.state.logs.map(l => `<tr>
                  <td>${CMMS.utils.escHtml(l.EmailID || l.id || "")}</td>
                  <td>${CMMS.utils.formatDateTime(l.DateTime || l.SentAt || "")}</td>
                  <td>${CMMS.utils.escHtml(l.Recipient || "")}</td>
                  <td>${CMMS.utils.escHtml(l.Subject || "")}</td>
                  <td>${CMMS.utils.badge(l.Module || "", "info")}</td>
                  <td>${CMMS.utils.statusBadge(l.Status || "Pending")}</td>
                  <td class="text-danger">${CMMS.utils.escHtml(l.ErrorMessage || "")}</td>
                </tr>`).join("")
              }
            </tbody>
          </table></div>
        </div>
      </div>
    `;
    CMMS.utils.$("#refreshEmailLogs")?.addEventListener("click", async () => {
      try {
        const logs = await CMMS.api.call("emailGetLogs");
        this.state.logs = Array.isArray(logs) ? logs : (logs?.result || []);
        this.renderLogs();
      } catch (err) {
        CMMS.utils.showToast("Failed to refresh logs", "error");
      }
    });
  },

  async saveSettings() {
    const settings = {
      Enabled: CMMS.utils.$("#emailEnabled").checked ? "Yes" : "No",
      SenderName: CMMS.utils.$("#emailSenderName").value.trim(),
      ReplyTo: CMMS.utils.$("#emailReplyTo").value.trim(),
      DailySummaryTime: CMMS.utils.$("#emailDailyTime").value,
      WeeklySummaryDay: CMMS.utils.$("#emailWeeklyDay").value
    };
    try {
      await CMMS.api.call("emailSaveSettings", settings);
      this.state.settings = { ...this.state.settings, ...settings };
      CMMS.utils.showToast("Settings saved", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed to save: " + err.message, "error");
    }
  },

  async sendEmail() {
    const data = {
      recipient: CMMS.utils.$("#sendRecipient").value.trim(),
      subject: CMMS.utils.$("#sendSubject").value.trim(),
      body: CMMS.utils.$("#sendBody").value,
      senderName: CMMS.utils.$("#sendSenderName").value.trim(),
      replyTo: CMMS.utils.$("#sendReplyTo").value.trim()
    };
    if (!data.recipient || !data.subject || !data.body) {
      CMMS.utils.showToast("Fill all required fields", "warning");
      return;
    }
    try {
      await CMMS.api.call("emailSendRaw", data);
      CMMS.utils.showToast("Email sent successfully", "success");
      CMMS.utils.$("#sendRecipient").value = "";
      CMMS.utils.$("#sendSubject").value = "";
      CMMS.utils.$("#sendBody").value = "";
    } catch (err) {
      CMMS.utils.showToast("Failed to send: " + err.message, "error");
    }
  },

  async retryFailed() {
    const confirmed = await CMMS.utils.showConfirm("Retry all failed emails?");
    if (!confirmed) return;
    try {
      await CMMS.api.call("emailRetryFailed");
      CMMS.utils.showToast("Retry initiated", "success");
      await this.loadData();
    } catch (err) {
      CMMS.utils.showToast("Retry failed: " + err.message, "error");
    }
  },

  async sendDailySummary() {
    const confirmed = await CMMS.utils.showConfirm("Send daily summary email now?");
    if (!confirmed) return;
    try {
      await CMMS.api.call("emailSendDailySummary");
      CMMS.utils.showToast("Daily summary sent", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  }
});
