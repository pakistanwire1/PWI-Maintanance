CMMS.router.registerPage("settings", {
  title: "Settings",
  icon: CMMS.icons.settings,

  state: {
    settings: {},
    departments: [],
    lists: {
      Areas: [],
      Lines: [],
      "Job Types": [],
      Priorities: [],
      "Machine Types": []
    },
    theme: {
      mode: "dark",
      accentColor: "#4f46e5",
      cardStyle: "glass"
    }
  },

  async render() {
    const container = CMMS.loader.getContainer();
    this.loadTheme();
    container.innerHTML = `
      <div class="page-header"><h2>Settings</h2></div>
      <div class="settings-sections">
        <div class="settings-nav">
          <button class="settings-nav-btn active" data-section="departments">${CMMS.icons.users} Departments</button>
          <button class="settings-nav-btn" data-section="lists">${CMMS.icons.list} System Lists</button>
          <button class="settings-nav-btn" data-section="theme">${CMMS.icons.paintbrush} Theme</button>
        </div>
        <div class="settings-content" id="settingsContent"></div>
      </div>
    `;
    CMMS.utils.$(".settings-nav").addEventListener("click", (e) => {
      if (!e.target.classList.contains("settings-nav-btn")) return;
      document.querySelectorAll(".settings-nav-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      this.renderSection(e.target.dataset.section);
    });
    await this.loadData();
    this.renderSection("departments");
  },

  async loadData() {
    CMMS.utils.showLoading(true);
    try {
      const [settingsData, deptData] = await Promise.all([
        CMMS.api.call("getSettings").catch(() => ({})),
        CMMS.api.call("getDepartmentList").catch(() => [])
      ]);
      this.state.settings = settingsData?.result || settingsData || {};
      this.state.departments = Array.isArray(deptData) ? deptData : (deptData?.result || []);

      // Load system lists from settings or API
      const listKeys = ["Areas", "Lines", "Job Types", "Priorities", "Machine Types"];
      for (const key of listKeys) {
        if (this.state.settings[key]) {
          this.state.lists[key] = Array.isArray(this.state.settings[key]) ? this.state.settings[key] : [];
        }
      }
    } catch (err) {
      CMMS.utils.showToast("Failed to load settings: " + err.message, "error");
    } finally {
      CMMS.utils.showLoading(false);
    }
  },

  renderSection(section) {
    const el = CMMS.utils.$("#settingsContent");
    switch (section) {
      case "departments": this.renderDepartments(el); break;
      case "lists": this.renderLists(el); break;
      case "theme": this.renderTheme(el); break;
    }
  },

  renderDepartments(el) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Department Management</h3></div>
        <div class="card-body">
          <div class="list-add-row">
            <input type="text" id="newDeptName" class="form-control" placeholder="New department name...">
            <button class="btn btn-primary" id="addDeptBtn">${CMMS.icons.plus} Add Department</button>
          </div>
          <div class="list-container mt-3" id="deptList">
            ${this.state.departments.length === 0 ?
              '<p class="text-muted">No departments configured.</p>' :
              this.state.departments.map(d => {
                const id = d.DepartmentID || d.id || "";
                const name = d.DepartmentName || d.Name || d;
                return `<div class="list-item">
                  <span class="list-item-name">${CMMS.utils.escHtml(name)}</span>
                  <button class="btn btn-sm btn-danger-outline list-item-delete" data-action="deleteDept" data-id="${id}" data-name="${CMMS.utils.escHtml(name)}">${CMMS.icons.trash}</button>
                </div>`;
              }).join("")
            }
          </div>
        </div>
      </div>
    `;
    CMMS.utils.$("#addDeptBtn").addEventListener("click", () => this.addDepartment());
    CMMS.utils.$("#newDeptName").addEventListener("keydown", (e) => { if (e.key === "Enter") this.addDepartment(); });
    el.querySelectorAll("[data-action='deleteDept']").forEach(btn => {
      btn.addEventListener("click", () => this.deleteDepartment(btn.dataset.id, btn.dataset.name));
    });
  },

  async addDepartment() {
    const name = CMMS.utils.$("#newDeptName").value.trim();
    if (!name) {
      CMMS.utils.showToast("Enter a department name", "warning");
      return;
    }
    try {
      await CMMS.api.call("createDepartment", { name });
      this.state.departments.push({ DepartmentName: name, Name: name });
      CMMS.utils.$("#newDeptName").value = "";
      this.renderSection("departments");
      CMMS.utils.showToast("Department added", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  },

  async deleteDepartment(id, name) {
    const confirmed = await CMMS.utils.showConfirm(`Delete department "${name}"?`);
    if (!confirmed) return;
    try {
      await CMMS.api.call("removeDepartment", { id, name });
      this.state.departments = this.state.departments.filter(d => {
        const did = d.DepartmentID || d.id || "";
        const dname = d.DepartmentName || d.Name || d;
        return did != id && dname !== name;
      });
      this.renderSection("departments");
      CMMS.utils.showToast("Department deleted", "success");
    } catch (err) {
      CMMS.utils.showToast("Failed: " + err.message, "error");
    }
  },

  renderLists(el) {
    const listKeys = Object.keys(this.state.lists);
    el.innerHTML = `
      ${listKeys.map(key => `
        <div class="card mb-3">
          <div class="card-header"><h3>${CMMS.utils.escHtml(key)}</h3></div>
          <div class="card-body">
            <div class="list-add-row">
              <input type="text" class="form-control list-new-input" data-list="${key}" placeholder="Add new ${CMMS.utils.escHtml(key).toLowerCase()} item...">
              <button class="btn btn-primary btn-sm list-add-btn" data-list="${key}">${CMMS.icons.plus} Add</button>
            </div>
            <div class="list-container mt-2">
              ${(this.state.lists[key] || []).map((item, i) => `
                <div class="list-item">
                  <span class="list-item-name">${CMMS.utils.escHtml(typeof item === "string" ? item : item.Name || item)}</span>
                  <button class="btn btn-sm btn-danger-outline list-item-delete" data-list="${key}" data-index="${i}">${CMMS.icons.trash}</button>
                </div>
              `).join("")}
              ${(this.state.lists[key] || []).length === 0 ? '<p class="text-muted">No items.</p>' : ""}
            </div>
          </div>
        </div>
      `).join("")}
    `;

    el.querySelectorAll(".list-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.addListItem(btn.dataset.list));
    });
    el.querySelectorAll(".list-new-input").forEach(input => {
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") this.addListItem(input.dataset.list); });
    });
    el.querySelectorAll("[data-list][data-index]").forEach(btn => {
      btn.addEventListener("click", () => this.removeListItem(btn.dataset.list, parseInt(btn.dataset.index)));
    });
  },

  async addListItem(listName) {
    const input = CMMS.utils.$(`.list-new-input[data-list="${listName}"]`);
    const value = input.value.trim();
    if (!value) return;
    if (!this.state.lists[listName]) this.state.lists[listName] = [];
    this.state.lists[listName].push(value);
    input.value = "";
    await this.saveList(listName);
    this.renderSection("lists");
    CMMS.utils.showToast(`${listName} item added`, "success");
  },

  async removeListItem(listName, index) {
    const item = this.state.lists[listName][index];
    const confirmed = await CMMS.utils.showConfirm(`Remove "${typeof item === "string" ? item : item.Name}" from ${listName}?`);
    if (!confirmed) return;
    this.state.lists[listName].splice(index, 1);
    await this.saveList(listName);
    this.renderSection("lists");
    CMMS.utils.showToast("Item removed", "success");
  },

  async saveList(listName) {
    try {
      await CMMS.api.call("saveSetting", { key: listName, value: this.state.lists[listName] });
    } catch (err) {
      CMMS.utils.showToast("Failed to save list: " + err.message, "error");
    }
  },

  renderTheme(el) {
    const t = this.state.theme;
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Theme Settings</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label>Color Mode</label>
            <div class="theme-toggle-group">
              <button class="btn ${t.mode === "dark" ? "btn-primary" : "btn-outline"}" data-theme-mode="dark">Dark Mode</button>
              <button class="btn ${t.mode === "light" ? "btn-primary" : "btn-outline"}" data-theme-mode="light">Light Mode</button>
            </div>
          </div>
          <div class="form-group">
            <label>Accent Color</label>
            <div class="color-picker-row">
              <input type="color" id="accentColorPicker" class="form-control-color" value="${t.accentColor}">
              <span class="color-preview-text">${t.accentColor}</span>
              <div class="preset-colors">
                ${["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"].map(c =>
                  `<button class="color-preset ${t.accentColor === c ? "active" : ""}" data-color="${c}" style="background:${c}"></button>`
                ).join("")}
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Card Style</label>
            <div class="theme-toggle-group">
              <button class="btn ${t.cardStyle === "glass" ? "btn-primary" : "btn-outline"}" data-card-style="glass">Glass</button>
              <button class="btn ${t.cardStyle === "solid" ? "btn-primary" : "btn-outline"}" data-card-style="solid">Solid</button>
            </div>
          </div>
          <div class="form-group mt-3">
            <label>Preview</label>
            <div class="theme-preview">
              <div class="card ${t.cardStyle === "glass" ? "glass-card" : "solid-card"}" style="border-left:4px solid ${t.accentColor}">
                <div class="card-body"><h4>Sample Card</h4><p>This is how cards will look with your selected theme settings.</p></div>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-outline" id="resetThemeBtn">${CMMS.icons.refresh} Reset to Defaults</button>
          </div>
        </div>
      </div>
    `;

    // Mode toggle
    el.querySelectorAll("[data-theme-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.state.theme.mode = btn.dataset.themeMode;
        this.applyTheme();
        this.renderSection("theme");
      });
    });

    // Color picker
    CMMS.utils.$("#accentColorPicker").addEventListener("input", (e) => {
      this.state.theme.accentColor = e.target.value;
      this.applyTheme();
      el.querySelector(".color-preview-text").textContent = e.target.value;
      el.querySelector(".theme-preview .card").style.borderLeftColor = e.target.value;
    });

    // Preset colors
    el.querySelectorAll(".color-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        this.state.theme.accentColor = btn.dataset.color;
        this.applyTheme();
        this.renderSection("theme");
      });
    });

    // Card style
    el.querySelectorAll("[data-card-style]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.state.theme.cardStyle = btn.dataset.cardStyle;
        this.applyTheme();
        this.renderSection("theme");
      });
    });

    // Reset
    CMMS.utils.$("#resetThemeBtn").addEventListener("click", () => {
      this.state.theme = { mode: "dark", accentColor: "#4f46e5", cardStyle: "glass" };
      this.applyTheme();
      this.renderSection("theme");
      CMMS.utils.showToast("Theme reset to defaults", "success");
    });
  },

  loadTheme() {
    try {
      const saved = localStorage.getItem("cmms_theme");
      if (saved) this.state.theme = { ...this.state.theme, ...JSON.parse(saved) };
    } catch (e) { /* ignore */ }
    this.applyTheme();
  },

  applyTheme() {
    const t = this.state.theme;
    try {
      localStorage.setItem("cmms_theme", JSON.stringify(t));
    } catch (e) { /* ignore */ }

    document.documentElement.setAttribute("data-theme", t.mode);
    document.documentElement.style.setProperty("--accent-color", t.accentColor);

    document.documentElement.classList.remove("theme-glass", "theme-solid");
    document.documentElement.classList.add(`theme-${t.cardStyle}`);

    if (t.mode === "dark") {
      document.documentElement.classList.add("dark-mode");
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.add("light-mode");
      document.documentElement.classList.remove("dark-mode");
    }
  }
});
