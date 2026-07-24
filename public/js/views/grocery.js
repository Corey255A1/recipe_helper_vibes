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

  getDayDate(weekOfStr, dayIndex) {
    if (!weekOfStr) return '';
    try {
      const startDate = new Date(weekOfStr + 'T00:00:00');
      const dayDate = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
      return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch(e) {
      return '';
    }
  },

  async renderPlanSummary() {
    const summaryEl = document.getElementById('grocery-plan-summary');
    try {
      const plan = await api.plan.current();
      if (!plan.meals || plan.meals.length === 0) {
        summaryEl.innerHTML = `<p style="color: var(--text-secondary);">Your current plan is empty.</p>`;
        return;
      }

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dailyMeals = {};
      daysOfWeek.forEach(d => dailyMeals[d] = []);

      let unassigned = [];

      plan.meals.forEach(meal => {
        if (meal.assignedDays && meal.assignedDays.length > 0) {
          meal.assignedDays.forEach(day => {
            if (dailyMeals[day]) dailyMeals[day].push(meal);
          });
        } else {
          unassigned.push(meal);
        }
      });

      let html = `<div style="background: var(--surface); padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border);">`;
      html += `<h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-weight: 600;">📅 Current Weekly Schedule</h3>`;
      html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">`;

      daysOfWeek.forEach((day, dayIndex) => {
        const meals = dailyMeals[day];
        const dayShort = day.substring(0, 3).toUpperCase();
        const dateStr = this.getDayDate(plan.weekOf, dayIndex);
        html += `
          <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.75rem; border-radius: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.4rem;">
              <span style="font-weight: 700; font-size: 0.8rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px;">${dayShort}</span>
              <span style="font-size: 0.725rem; color: var(--text-secondary); font-weight: 600;">${dateStr}</span>
            </div>
            ${meals.length > 0 ? meals.map(m => {
              const cleanTitle = m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return `
                <div style="font-size: 0.8rem; color: #f8fafc; font-weight: 500; margin-bottom: 0.25rem; line-height: 1.3;">
                  🍳 ${cleanTitle}
                </div>
              `;
            }).join('') : `<div style="font-size: 0.75rem; color: var(--text-secondary); font-style: italic;">No meal</div>`}
          </div>
        `;
      });

      if (unassigned.length > 0) {
        html += `
          <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.75rem; border-radius: 0.65rem;">
            <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem; text-transform: uppercase;">Unassigned</div>
            ${unassigned.map(m => {
              const cleanTitle = m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return `<div style="font-size: 0.8rem; color: #f8fafc; font-weight: 500; margin-bottom: 0.25rem;">🍳 ${cleanTitle}</div>`;
            }).join('')}
          </div>
        `;
      }

      html += `</div></div>`;
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
