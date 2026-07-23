const ContextView = {
  async render() {
    return `
      <div class="view" id="context-view">
        <h2>Meal Planning Context</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Describe your household and meal preferences in plain English.</p>
        
        <form id="context-form" onsubmit="ContextView.save(event)">
          <div class="form-group">
            <label for="rule">Your Rule/Context</label>
            <textarea id="rule" rows="5" placeholder="e.g., We are a family of 4. We like Mediterranean..."></textarea>
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
    }
  },
  
  async save(e) {
    e.preventDefault();
    const data = {
      rule: document.getElementById('rule').value,
      servings: parseInt(document.getElementById('servings').value, 10),
      mealsPerWeek: parseInt(document.getElementById('mealsPerWeek').value, 10),
      leftoversEnabled: document.getElementById('leftoversEnabled').checked
    };
    
    await api.context.update(data);
    Toast.show('Preferences saved!', 'success');
  }
};
