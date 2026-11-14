const ContextView = {
  systemState: null,
  isUpdating: false,

  currentModel: 'gemini-3.8-flash',

  async render() {
    const currentTheme = window.Theme ? Theme.get() : 'dark';
    return `
      <div class="view" id="context-view">
        <h2 class="section-heading" style="margin-bottom: 0.45rem; font-size: 1.65rem;">
          ${Icons.render('settings', 24)} Settings & Household Rules
        </h2>
        <p style="color: var(--text-muted); margin-bottom: 1.75rem;">Manage your appearance, meal planning preferences, Gemini API credentials, and app updates.</p>

        <!-- Appearance / Theme Card -->
        <div class="surface-card">
          <h3 class="section-heading" style="margin-bottom: 0.85rem;">
            ${Icons.render('sun', 18)} Appearance & Theme
          </h3>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="ctx-theme-select">Color Theme</label>
            <select id="ctx-theme-select" onchange="Theme.apply(this.value)">
              <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Warm Dark (Default)</option>
              <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Warm Parchment Light</option>
            </select>
          </div>
        </div>
        
        <form id="context-form" onsubmit="ContextView.save(event)">
          <!-- Gemini API Key & Model Card -->
          <div class="surface-card">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="geminiApiKey" class="section-heading" style="font-size: 0.95rem; margin-bottom: 0.45rem;">
                ${Icons.render('key', 16)} Google Gemini API Key
              </label>
              <input type="password" id="geminiApiKey" placeholder="AIzaSy... (Paste key here)" style="margin-bottom: 0.5rem;">
              <p id="api-key-status" style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;"></p>
            </div>

            <!-- Gemini Model Selection -->
            <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.4rem;">
                <label for="geminiModel" class="section-heading" style="font-size: 0.95rem; margin: 0;">
                  ${Icons.render('sparkles', 16)} Gemini Model
                </label>
                <button type="button" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.775rem;" onclick="ContextView.fetchModels(true)" id="btn-fetch-models">
                  ${Icons.render('refresh', 14)} Fetch Available Models
                </button>
              </div>
              <select id="geminiModel" style="margin-bottom: 0.45rem;">
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Default)</option>
              </select>
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <p id="model-status-note" style="font-size: 0.775rem; color: var(--text-muted); margin: 0;">
                  Default: <strong>Gemini 3.8 Flash</strong>. Queried dynamically from your Google Gemini account.
                </p>
                <span id="model-source-badge" class="pill-badge"></span>
              </div>
            </div>
          </div>

          <!-- Household Preferences Card -->
          <div class="surface-card">
            <h3 class="section-heading" style="margin-bottom: 1rem;">
              ${Icons.render('utensils', 18)} Household Meal Preferences
            </h3>
            
            <div class="form-group">
              <label for="rule">Planning Rules & Cuisine Preferences</label>
              <textarea id="rule" rows="4" placeholder="e.g. We are a family of 4. We love Mediterranean and Asian flavors. Toddler-friendly, no shellfish. 2-3 meal prepped dinners for leftovers."></textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <div class="form-group">
                <label for="servings">Default Servings</label>
                <input type="number" id="servings" min="1" value="2">
              </div>
              
              <div class="form-group">
                <label for="mealsPerWeek">Meals per Week</label>
                <input type="number" id="mealsPerWeek" min="1" max="21" value="7">
              </div>
            </div>
            
            <div class="form-group" style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
              <input type="checkbox" id="leftoversEnabled" style="width: auto; margin-bottom: 0;">
              <label for="leftoversEnabled" style="margin: 0; cursor: pointer;">Include multi-day meals / leftovers</label>
            </div>
          </div>
          
          <button type="submit" class="btn" style="margin-bottom: 1.75rem;">
            ${Icons.render('check', 16)} Save Settings & Household Preferences
          </button>
        </form>

        <!-- System & Zero-Rebuild Updates Card -->
        <div class="surface-card system-update-card" style="margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 class="section-heading" style="font-size: 1.1rem;">
                ${Icons.render('refresh', 18)} App Updates & Version
              </h3>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0 0;">
                Pull updates directly from GitHub without rebuilding Docker containers.
              </p>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-check-updates" onclick="ContextView.checkUpdates()">
              ${Icons.render('search', 14)} Check for Updates
            </button>
          </div>

          <div id="system-status-info" style="margin-bottom: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); background: var(--surface-elevated); padding: 0.85rem 1rem; border-radius: 0.65rem; border: 1px solid var(--border);">
            Loading version details...
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <button id="btn-run-update" class="btn" style="padding: 0.65rem 1.25rem; font-size: 0.9rem;" onclick="ContextView.runUpdate()">
              ${Icons.render('download', 15)} Pull Latest Updates & Restart
            </button>
            <button class="btn btn-outline btn-sm" style="color: var(--text-muted); font-size: 0.8rem;" onclick="ContextView.runForceSync()" title="Force overwrite any local changes and sync to GitHub main">
              ${Icons.render('refresh', 14)} Force Sync (Hard Reset)
            </button>
          </div>

          <div id="system-update-logs" style="display: none; margin-top: 1rem; font-family: monospace; font-size: 0.8rem; background: var(--surface-input); border: 1px solid var(--border); padding: 0.85rem; border-radius: 0.5rem; color: var(--text-secondary); max-height: 180px; overflow-y: auto; white-space: pre-wrap;"></div>
        </div>
      </div>
    `;
  },
  
  async init() {
    const themeSelect = document.getElementById('ctx-theme-select');
    if (themeSelect && window.Theme) {
      themeSelect.value = Theme.get();
    }

    const data = await api.context.get();
    if (data) {
      document.getElementById('rule').value = data.rule || '';
      document.getElementById('servings').value = data.servings || 2;
      document.getElementById('mealsPerWeek').value = data.mealsPerWeek || 7;
      document.getElementById('leftoversEnabled').checked = Boolean(data.leftoversEnabled);
      this.currentModel = data.geminiModel || 'gemini-3.8-flash';
      
      const statusEl = document.getElementById('api-key-status');
      if (data.isEnvApiKey) {
        statusEl.innerHTML = `<span style="color: var(--success); display: inline-flex;">${Icons.render('check', 14)}</span> Configured via environment variable (<code style="color: var(--primary);">GEMINI_API_KEY</code>).`;
        document.getElementById('geminiApiKey').placeholder = "Configured via environment variable";
      } else if (data.hasApiKey) {
        statusEl.innerHTML = `<span style="color: var(--success); display: inline-flex;">${Icons.render('check', 14)}</span> Key is set and saved in your settings.`;
        document.getElementById('geminiApiKey').value = "••••••••";
      } else {
        statusEl.innerHTML = `<span style="color: var(--accent); display: inline-flex;">${Icons.render('lightbulb', 14)}</span> No API Key set. Enter your key above or set <code style="color: var(--primary);">GEMINI_API_KEY</code> in Docker.`;
      }
    }

    await this.fetchModels(false);
    await this.loadSystemStatus(false);
  },

  async fetchModels(showToast = false) {
    const btn = document.getElementById('btn-fetch-models');
    const modelSelect = document.getElementById('geminiModel');
    const badgeEl = document.getElementById('model-source-badge');
    if (btn) {
      btn.innerHTML = `${Icons.render('refresh', 14)} Loading...`;
      btn.disabled = true;
    }

    try {
      const res = await api.context.models();
      const models = (res && res.models) ? res.models : [];
      const selectedModel = this.currentModel || (res && res.defaultModel) || 'gemini-3.8-flash';

      if (modelSelect && models.length > 0) {
        modelSelect.innerHTML = models.map(m => {
          const isSelected = m.id === selectedModel;
          const isDefault = m.id === 'gemini-3.8-flash';
          let displayName = m.name;
          if (isDefault && !displayName.includes('Default')) {
            displayName = `${displayName} (Default)`;
          }
          return `<option value="${m.id}" ${isSelected ? 'selected' : ''}>${displayName}</option>`;
        }).join('');

        if (!models.some(m => m.id === selectedModel)) {
          const opt = document.createElement('option');
          opt.value = selectedModel;
          opt.textContent = `${selectedModel} (Saved)`;
          opt.selected = true;
          modelSelect.appendChild(opt);
        }
      }

      if (badgeEl) {
        if (res.source === 'api') {
          badgeEl.className = 'pill-badge pill-badge-success';
          badgeEl.innerHTML = `${Icons.render('check', 12)} ${models.length} live models loaded`;
        } else {
          badgeEl.className = 'pill-badge';
          badgeEl.textContent = 'Default models';
        }
      }

      if (showToast) {
        Toast.show(res.source === 'api' ? `Loaded ${models.length} models from Gemini API!` : 'Loaded model list.', 'success');
      }
    } catch (e) {
      if (showToast) Toast.show('Could not fetch models: ' + e.message, 'warning');
    } finally {
      if (btn) {
        btn.innerHTML = `${Icons.render('refresh', 14)} Fetch Available Models`;
        btn.disabled = false;
      }
    }
  },
  
  async save(e) {
    e.preventDefault();
    const apiKeyInput = document.getElementById('geminiApiKey').value.trim();
    const modelSelect = document.getElementById('geminiModel');
    const selectedModel = modelSelect ? modelSelect.value : (this.currentModel || 'gemini-3.8-flash');
    
    const data = {
      rule: document.getElementById('rule').value,
      servings: parseInt(document.getElementById('servings').value, 10),
      mealsPerWeek: parseInt(document.getElementById('mealsPerWeek').value, 10),
      leftoversEnabled: document.getElementById('leftoversEnabled').checked,
      geminiApiKey: apiKeyInput,
      geminiModel: selectedModel
    };
    
    await api.context.update(data);
    this.currentModel = selectedModel;
    Toast.show('Settings saved!', 'success');
    await this.init();
  },

  async loadSystemStatus(fetchRemote = false) {
    const infoEl = document.getElementById('system-status-info');
    if (!infoEl) return;

    try {
      const status = await api.system.status(fetchRemote);
      this.systemState = status;

      let badgeHtml = '';
      if (status.behindCount > 0) {
        badgeHtml = `<span class="pill-badge pill-badge-accent">${Icons.render('sparkles', 12)} ${status.behindCount} new update(s) available</span>`;
      } else if (status.remoteStatus === 'up_to_date') {
        badgeHtml = `<span class="pill-badge pill-badge-success">${Icons.render('check', 12)} App is up to date</span>`;
      }

      infoEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
          <div>
            <strong>Current Version:</strong> <code style="color: var(--primary); font-weight: 700;">${status.commit}</code> (${status.branch})
          </div>
          <div>${badgeHtml}</div>
        </div>
        ${status.lastCommitMessage ? `<div style="color: var(--text); font-size: 0.85rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">${Icons.render('fileText', 13)} <em>${status.lastCommitMessage}</em></div>` : ''}
        ${status.lastCommitDate ? `<div style="font-size: 0.775rem; color: var(--text-muted);">Committed: ${status.lastCommitDate}</div>` : ''}
        ${status.remoteError ? `<div style="color: var(--danger); font-size: 0.75rem; margin-top: 0.35rem;">Git remote notice: ${status.remoteError}</div>` : ''}
      `;
    } catch (e) {
      infoEl.innerHTML = `<p style="color: var(--text-muted); margin: 0;">Could not load Git system status.</p>`;
    }
  },

  async checkUpdates() {
    const btn = document.getElementById('btn-check-updates');
    const orig = btn.innerHTML;
    btn.textContent = 'Checking...';
    btn.disabled = true;
    try {
      await this.loadSystemStatus(true);
      Toast.show('Checked remote repository for updates.', 'info');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  },

  async runUpdate(force = false) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const btn = document.getElementById('btn-run-update');
    const logsEl = document.getElementById('system-update-logs');
    const origHtml = btn.innerHTML;
    btn.innerHTML = `${Icons.render('refresh', 15)} Pulling updates...`;
    btn.disabled = true;

    if (logsEl) {
      logsEl.style.display = 'block';
      logsEl.innerText = 'Connecting to git remote and fetching latest commits...\n';
    }

    try {
      const res = await api.system.update(force);
      if (logsEl) {
        logsEl.innerText += (res.logs || '') + '\n\nUpdates successfully pulled!\nRestarting server process... Waiting for reconnection...';
      }

      Toast.show(res.updated ? 'App updated! Server restarting...' : 'Already latest version. Restarting server...', 'success');

      // Poll until server restarts and comes back online
      await this.pollUntilServerRestarted();
    } catch (err) {
      if (logsEl) {
        logsEl.innerText += `\nUpdate error: ${err.message}`;
      }
      Toast.show('Update failed: ' + err.message, 'danger');
      btn.innerHTML = origHtml;
      btn.disabled = false;
      this.isUpdating = false;
    }
  },

  runForceSync() {
    ConfirmModal.show({
      title: 'Force Sync to GitHub',
      message: 'This will reset any local working tree modifications and force pull the latest code from GitHub main. Your data directory is safe and will not be touched.',
      confirmText: 'Force Sync Now',
      danger: true,
      onConfirm: () => this.runUpdate(true)
    });
  },

  async pollUntilServerRestarted() {
    const btn = document.getElementById('btn-run-update');
    if (btn) btn.innerHTML = `${Icons.render('refresh', 15)} Reconnecting...`;

    const maxWaitMs = 15000;
    const startTime = Date.now();
    await new Promise(res => setTimeout(res, 1500));

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const ping = await fetch('/api/system/status', { cache: 'no-store' });
        if (ping.ok) {
          Toast.show('Server restarted with latest updates! Reloading...', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 800);
          return;
        }
      } catch (e) {}
      await new Promise(res => setTimeout(res, 1000));
    }

    // Fallback reload if poll timed out
  }
};

window.ContextView = ContextView;
