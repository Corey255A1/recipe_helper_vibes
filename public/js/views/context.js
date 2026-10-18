const ContextView = {
  systemState: null,
  isUpdating: false,

  currentModel: 'gemini-3.8-flash',

  async render() {
    return `
      <div class="view" id="context-view">
        <h2 style="margin-bottom: 0.5rem; font-size: 1.65rem;">⚙️ Settings & Household Rules</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Manage your meal planning preferences, Gemini API credentials, and app updates.</p>
        
        <form id="context-form" onsubmit="ContextView.save(event)">
          <!-- Gemini API Key & Model Card -->
          <div class="form-group" style="background: var(--surface); padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border); margin-bottom: 1.5rem;">
            <label for="geminiApiKey" style="font-weight: 600; font-size: 0.95rem;">🔑 Google Gemini API Key</label>
            <input type="password" id="geminiApiKey" placeholder="AIzaSy... (Paste key here)" style="margin-bottom: 0.5rem;">
            <p id="api-key-status" style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;"></p>

            <!-- Gemini Model Selection -->
            <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">
                <label for="geminiModel" style="font-weight: 600; font-size: 0.95rem; margin: 0;">🤖 Gemini Model</label>
                <button type="button" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.775rem;" onclick="ContextView.fetchModels(true)" id="btn-fetch-models">
                  🔄 Fetch Available Models
                </button>
              </div>
              <select id="geminiModel" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 0.6rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); color: var(--text); font-family: inherit; font-size: 0.9rem; margin-bottom: 0.4rem;">
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Default)</option>
              </select>
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <p id="model-status-note" style="font-size: 0.775rem; color: var(--text-muted); margin: 0;">
                  Default: <strong>Gemini 3.8 Flash</strong>. Queried dynamically from your Google Gemini account.
                </p>
                <span id="model-source-badge" style="font-size: 0.725rem; padding: 0.15rem 0.5rem; border-radius: 1rem; background: rgba(0, 240, 255, 0.1); color: var(--accent-cyan);"></span>
              </div>
            </div>
          </div>

          <!-- Household Preferences Card -->
          <div style="background: var(--surface); padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border); margin-bottom: 1.5rem;">
            <h3 style="font-size: 1.05rem; margin-bottom: 1rem; color: #f8fafc;">🥗 Household Meal Preferences</h3>
            
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
            
            <div class="form-group" style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
              <input type="checkbox" id="leftoversEnabled" style="width: auto;">
              <label for="leftoversEnabled" style="margin: 0; cursor: pointer;">Include multi-day meals / leftovers</label>
            </div>
          </div>
          
          <button type="submit" class="btn" style="margin-bottom: 2rem;">Save Settings & Household Preferences</button>
        </form>

        <!-- System & Zero-Rebuild Updates Card -->
        <div class="system-update-card" style="background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 0.4rem;">
                🔄 App Updates & Version
              </h3>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0 0;">
                Pull updates directly from GitHub without rebuilding Docker containers.
              </p>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-check-updates" onclick="ContextView.checkUpdates()">
              🔍 Check for Updates
            </button>
          </div>

          <div id="system-status-info" style="margin-bottom: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); background: rgba(255,255,255,0.03); padding: 0.85rem 1rem; border-radius: 0.65rem; border: 1px solid var(--border);">
            Loading version details...
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <button id="btn-run-update" class="btn" style="background: var(--primary); padding: 0.65rem 1.25rem; font-size: 0.9rem;" onclick="ContextView.runUpdate()">
              🚀 Pull Latest Updates & Restart
            </button>
            <button class="btn btn-outline btn-sm" style="color: var(--text-muted); font-size: 0.8rem;" onclick="ContextView.runForceSync()" title="Force overwrite any local changes and sync to GitHub main">
              ⚡ Force Sync (Hard Reset)
            </button>
          </div>

          <div id="system-update-logs" style="display: none; margin-top: 1rem; font-family: monospace; font-size: 0.8rem; background: #000; padding: 0.85rem; border-radius: 0.5rem; color: #a5b4fc; max-height: 180px; overflow-y: auto; white-space: pre-wrap;"></div>
        </div>
      </div>
    `;
  },
  
  async init() {
    const data = await api.context.get();
    if (data) {
      document.getElementById('rule').value = data.rule || '';
      document.getElementById('servings').value = data.servings || 2;
      document.getElementById('mealsPerWeek').value = data.mealsPerWeek || 7;
      document.getElementById('leftoversEnabled').checked = Boolean(data.leftoversEnabled);
      this.currentModel = data.geminiModel || 'gemini-3.8-flash';
      
      const statusEl = document.getElementById('api-key-status');
      if (data.isEnvApiKey) {
        statusEl.innerHTML = `✅ Configured via environment variable (<code style="color: var(--accent-cyan);">GEMINI_API_KEY</code>).`;
        document.getElementById('geminiApiKey').placeholder = "Configured via environment variable";
      } else if (data.hasApiKey) {
        statusEl.innerHTML = `✅ Key is set and saved in your settings.`;
        document.getElementById('geminiApiKey').value = "••••••••";
      } else {
        statusEl.innerHTML = `⚠️ No API Key set. Enter your key above or set <code style="color: var(--accent-cyan);">GEMINI_API_KEY</code> in Docker.`;
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
      btn.textContent = '⏳ Loading...';
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
          badgeEl.textContent = `🟢 ${models.length} live models loaded`;
          badgeEl.style.color = '#34d399';
          badgeEl.style.background = 'rgba(16, 185, 129, 0.12)';
        } else {
          badgeEl.textContent = `⚪ Default models`;
          badgeEl.style.color = 'var(--text-muted)';
          badgeEl.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      }

      if (showToast) {
        Toast.show(res.source === 'api' ? `Loaded ${models.length} models from Gemini API!` : 'Loaded model list.', 'success');
      }
    } catch (e) {
      if (showToast) Toast.show('Could not fetch models: ' + e.message, 'warning');
    } finally {
      if (btn) {
        btn.textContent = '🔄 Fetch Available Models';
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
        badgeHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.15rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">⚡ ${status.behindCount} new update(s) available</span>`;
      } else if (status.remoteStatus === 'up_to_date') {
        badgeHtml = `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.15rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">✅ App is up to date</span>`;
      }

      infoEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
          <div>
            <strong>Current Version:</strong> <code style="color: var(--accent-cyan); font-weight: 700;">${status.commit}</code> (${status.branch})
          </div>
          <div>${badgeHtml}</div>
        </div>
        ${status.lastCommitMessage ? `<div style="color: var(--text); font-size: 0.85rem; margin-bottom: 0.25rem;">📝 <em>${status.lastCommitMessage}</em></div>` : ''}
        ${status.lastCommitDate ? `<div style="font-size: 0.775rem; color: var(--text-muted);">Committed: ${status.lastCommitDate}</div>` : ''}
        ${status.remoteError ? `<div style="color: #f87171; font-size: 0.75rem; margin-top: 0.35rem;">⚠️ Git remote notice: ${status.remoteError}</div>` : ''}
      `;
    } catch (e) {
      infoEl.innerHTML = `<p style="color: var(--text-muted); margin: 0;">Could not load Git system status.</p>`;
    }
  },

  async checkUpdates() {
    const btn = document.getElementById('btn-check-updates');
    const orig = btn.innerText;
    btn.innerText = 'Checking...';
    btn.disabled = true;
    try {
      await this.loadSystemStatus(true);
      Toast.show('Checked remote repository for updates.', 'info');
    } finally {
      btn.innerText = orig;
      btn.disabled = false;
    }
  },

  async runUpdate(force = false) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const btn = document.getElementById('btn-run-update');
    const logsEl = document.getElementById('system-update-logs');
    const origText = btn.textContent;
    btn.textContent = '⏳ Pulling updates...';
    btn.disabled = true;

    if (logsEl) {
      logsEl.style.display = 'block';
      logsEl.innerText = 'Connecting to git remote and fetching latest commits...\n';
    }

    try {
      const res = await api.system.update(force);
      if (logsEl) {
        logsEl.innerText += (res.logs || '') + '\n\n✅ Updates successfully pulled!\nRestarting server process... Waiting for reconnection...';
      }

      Toast.show(res.updated ? 'App updated! Server restarting...' : 'Already latest version. Restarting server...', 'success');

      // Poll until server restarts and comes back online
      await this.pollUntilServerRestarted();
    } catch (err) {
      if (logsEl) {
        logsEl.innerText += `\n❌ Update error: ${err.message}`;
      }
      Toast.show('Update failed: ' + err.message, 'danger');
      btn.textContent = origText;
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
    if (btn) btn.textContent = '🔄 Reconnecting...';

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
