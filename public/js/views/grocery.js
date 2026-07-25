const GroceryView = {
  state: {
    plans: [],
    selectedWeeks: []
  },

  async render() {
    return `
      <div class="view" id="grocery-view">
        <div style="margin-bottom: 1.5rem;">
          <h2>Grocery List</h2>
        </div>
        
        <div id="grocery-plan-summary" style="margin-bottom: 1.5rem;"></div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; align-items: center; justify-content: flex-start; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 1.5rem;">
          <button class="btn btn-outline" onclick="GroceryView.refresh()">Generate / Refresh</button>
          <button class="btn" onclick="GroceryView.copy()">Copy to Clipboard</button>
        </div>

        <div id="grocery-content">
          <p style="color: var(--text-muted);">Click Generate to build your grocery list from the selected plans.</p>
        </div>
      </div>
    `;
  },

  async init() {
    this.state = { plans: [], selectedWeeks: [] };
    try {
      this.state.plans = await api.plan.plans();
      if (this.state.plans && this.state.plans.length > 0) {
        this.state.selectedWeeks = [this.state.plans[0].weekOf];
      }
    } catch (e) {
      console.error(e);
    }
    await this.renderPlanSummary();
  },

  toggleWeek(weekOf) {
    if (this.state.selectedWeeks.includes(weekOf)) {
      this.state.selectedWeeks = this.state.selectedWeeks.filter(w => w !== weekOf);
    } else {
      this.state.selectedWeeks.push(weekOf);
    }
    this.renderPlanSummary();
  },

  async renderPlanSummary() {
    const summaryEl = document.getElementById('grocery-plan-summary');
    if (!this.state.plans || this.state.plans.length === 0) {
      summaryEl.innerHTML = `<p style="color: var(--text-secondary);">Your current plan is empty.</p>`;
      return;
    }

    let html = '';
    
    if (this.state.plans.length > 1) {
      html += `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 0.75rem;">Select weeks to include:</h4>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${this.state.plans.map(p => `
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);">
                <input type="checkbox" value="${p.weekOf}" onchange="GroceryView.toggleWeek('${p.weekOf}')" ${this.state.selectedWeeks.includes(p.weekOf) ? 'checked' : ''}>
                <span>Week of ${window.PlanView && PlanView.formatWeekRange ? PlanView.formatWeekRange(p.weekOf) : p.weekOf}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    const selectedPlans = this.state.plans.filter(p => this.state.selectedWeeks.includes(p.weekOf));
    
    if (selectedPlans.length === 0) {
      html += `<p style="color: var(--text-secondary);">No weeks selected.</p>`;
    } else {
      selectedPlans.forEach(plan => {
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

        html += `<div style="background: var(--surface); padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border); margin-bottom: 1.5rem;">`;
        html += `<h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-weight: 600;">📅 Schedule: Week of ${window.PlanView && PlanView.formatWeekRange ? PlanView.formatWeekRange(plan.weekOf) : plan.weekOf}</h3>`;
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">`;

        daysOfWeek.forEach((day, dayIndex) => {
          const meals = dailyMeals[day];
          const dayShort = day.substring(0, 3).toUpperCase();
          const dateStr = Utils.getDayDate(plan.weekOf, dayIndex);
          html += `
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.75rem; border-radius: 0.65rem;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.8rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px;">${dayShort}</span>
                <span style="font-size: 0.725rem; color: var(--text-secondary); font-weight: 600;">${dateStr}</span>
              </div>
              ${meals.length > 0 ? meals.map(m => {
                const cleanTitle = m.title || m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
                const cleanTitle = m.title || m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return `<div style="font-size: 0.8rem; color: #f8fafc; font-weight: 500; margin-bottom: 0.25rem;">🍳 ${cleanTitle}</div>`;
              }).join('')}
            </div>
          `;
        }

        html += `</div></div>`;
      });
    }

    summaryEl.innerHTML = html;
  },

  async refresh() {
    if (this.state.selectedWeeks.length === 0) {
      Toast.show('Please select at least one week.', 'warning');
      return;
    }

    const content = document.getElementById('grocery-content');
    content.innerHTML = Loader.render('Consolidating groceries...');
    
    try {
      this.list = await api.grocery.get(this.state.selectedWeeks);
      
      if (!this.list.categories || this.list.categories.length === 0) {
        content.innerHTML = `<p>No groceries needed or plans are empty.</p>`;
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
