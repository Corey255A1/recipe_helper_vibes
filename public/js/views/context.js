const ContextView = {
  async render() {
    return `
      <div class="view" id="context-view">
        <h2>Meal Planning Context & Settings</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Describe your household, meal preferences, and configure your Gemini API Key.</p>
        
        <form id="context-form" onsubmit="ContextView.save(event)">
          <div class="form-group" style="background: var(--surface); padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border); margin-bottom: 1.5rem;">
            <label for="geminiApiKey" style="font-weight: 600;">🔑 Google Gemini API Key</label>
            <input type="password" id="geminiApiKey" placeholder="AIzaSy... (Paste key here)" style="margin-bottom: 0.5rem;">
            <p id="api-key-status" style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;"></p>
          </div>

          <div class="form-group">
            <label for="rule">Your Household Rules & Preferences</label>
            <textarea id="rule" rows="4" placeholder="e.g., We are a family of 4. We love Mediterranean recipes..."></textarea>
          </div>
          
          <div class="form-group">
            <label for="servings">Default Servings</label>
            <input type="number" id="servings" min="1" value="2">
          </div>
          
          <div class="form-group">
            <label for="mealsPerWeek">Meals per Week</label>
            <input type="number" id="mealsPerWeek" min="1" max="21" value="7">
          </div>
          
          <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" id="leftoversEnabled" style="width: auto;">
            <label for="leftoversEnabled" style="margin: 0;">Include multi-day meals / leftovers</label>
          </div>
          
          <button type="submit" class="btn" style="margin-top: 1rem;">Save Preferences</button>
        </form>
      </div>
    `;
  },
  
  async init() {
    const data = await api.context.get();
    if (data) {
      document.getElementById('rule').value = data.rule || '';
      document.getElementById('servings').value = data.servings || 2;
      document.getElementById('mealsPerWeek').value = data.mealsPerWeek || 7;
      document.getElementById('leftoversEnabled').checked = data.leftoversEnabled || false;
      
      const statusEl = document.getElementById('api-key-status');
      if (data.isEnvApiKey) {
        statusEl.innerHTML = `✅ Configured via environment variable (<code style="color: var(--accent-cyan);">GEMINI_API_KEY</code>).`;
        document.getElementById('geminiApiKey').placeholder = "Configured via environment variable";
      } else if (data.hasApiKey) {
        statusEl.innerHTML = `✅ Key is set and saved in your settings.`;
        document.getElementById('geminiApiKey').value = "••••••••";
      } else {
        statusEl.innerHTML = `⚠️ No API Key set. Enter your key above or set <code style="color: var(--accent-cyan);">GEMINI_API_KEY</code> in Synology Container Manager.`;
      }
    }
  },
  
  async save(e) {
    e.preventDefault();
    const apiKeyInput = document.getElementById('geminiApiKey').value.trim();
    
    const data = {
      rule: document.getElementById('rule').value,
      servings: parseInt(document.getElementById('servings').value, 10),
      mealsPerWeek: parseInt(document.getElementById('mealsPerWeek').value, 10),
      leftoversEnabled: document.getElementById('leftoversEnabled').checked,
      geminiApiKey: apiKeyInput
    };
    
    await api.context.update(data);
    Toast.show('Preferences & API settings saved!', 'success');
    await this.init();
  }
};
