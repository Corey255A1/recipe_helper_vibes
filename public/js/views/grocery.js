const GroceryView = {
  async render() {
    return `
      <div class="view" id="grocery-view">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h2>Grocery List</h2>
          <div>
            <button class="btn btn-outline" onclick="GroceryView.refresh()">Generate / Refresh</button>
            <button class="btn" style="margin-left: 0.5rem;" onclick="GroceryView.copy()">Copy to Clipboard</button>
          </div>
        </div>
        
        <div id="grocery-plan-summary" style="margin-bottom: 2rem;"></div>

        <div id="grocery-content">
          <p style="color: var(--text-muted);">Click Generate to build your grocery list from the current plan.</p>
        </div>
      </div>
    `;
  },

  async init() {
    await this.renderPlanSummary();
  },

  async renderPlanSummary() {
    const summaryEl = document.getElementById('grocery-plan-summary');
    try {
      const plan = await api.plan.current();
      if (!plan.meals || plan.meals.length === 0) {
        summaryEl.innerHTML = `<p style="color: var(--text-muted);">Your current plan is empty.</p>`;
        return;
      }
      
      let html = `<div style="background: var(--surface); padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--border);">`;
      html += `<h3 style="font-size: 1rem; margin-bottom: 0.75rem;">Current Plan Summary</h3>`;
      html += `<ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem;">`;
      
      plan.meals.forEach(meal => {
        html += `<li style="background: rgba(255, 255, 255, 0.05); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem;">
          <strong>${meal.recipeId.replace(/-/g, ' ')}</strong> (${meal.servings} servings)
        </li>`;
      });
      
      html += `</ul></div>`;
      summaryEl.innerHTML = html;
    } catch (e) {
      summaryEl.innerHTML = `<p style="color: var(--danger);">Failed to load plan summary.</p>`;
    }
  },

  async refresh() {
    const content = document.getElementById('grocery-content');
    content.innerHTML = Loader.render('Consolidating groceries...');
    
    try {
      this.list = await api.grocery.get();
      
      if (!this.list.categories || this.list.categories.length === 0) {
        content.innerHTML = `<p>No groceries needed or plan is empty.</p>`;
        return;
      }

      let html = `<div class="grocery-categories">`;
      this.list.categories.forEach(cat => {
        html += `
          <div style="background: var(--surface); padding: 1.5rem; border-radius: 1rem; margin-bottom: 1rem;">
            <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">${cat.name}</h3>
            <ul style="list-style: none;">
              ${cat.items.map(item => `
                <li style="margin-bottom: 0.5rem; display: flex; align-items: center;">
                  <input type="checkbox" style="width: auto; margin-right: 0.75rem;">
                  <span><strong>${item.quantity}</strong> ${item.ingredient}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      });
      html += `</div>`;
      content.innerHTML = html;
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to generate grocery list.</p>`;
    }
  },

  copy() {
    if (!this.list || !this.list.copyText) {
      Toast.show('No list to copy. Generate it first.', 'warning');
      return;
    }
    navigator.clipboard.writeText(this.list.copyText).then(() => {
      Toast.show('Copied to clipboard!', 'success');
    }).catch(() => {
      Toast.show('Failed to copy', 'danger');
    });
  }
};
