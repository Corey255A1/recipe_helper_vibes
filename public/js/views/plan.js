const PlanView = {
  state: {
    plans: [],
    expandedWeekOf: null,
    suggestions: [],
    viewMode: window.innerWidth <= 768 ? 'list' : 'grid',
    cachedRecipes: [],
    suggestCategory: '',
    customPrompt: '',
    cacheCategory: ''
  },
  activeTab: 'suggestions',
  activeRecipeId: null,
  activeModalWeekOf: null,

  formatWeekRange(weekOfStr) {
    if (!weekOfStr) return '';
    const plan = (this.state.plans || []).find(p => p.weekOf === weekOfStr || p.startDate === weekOfStr);
    if (plan) {
      return Utils.formatPlanRange(plan);
    }
    return Utils.formatPlanRange({ startDate: weekOfStr, daysCount: 7 });
  },

  async render() {
    const isGrid = this.state.viewMode === 'grid';
    return `
      <div class="view" id="plan-view">
        <div id="plan-header-title" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <h2 style="margin: 0; font-size: 1.65rem;">📅 Meal Plan</h2>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button class="btn btn-outline btn-sm" onclick="PlanView.openDatesModal('create')">+ New Plan</button>
            </div>
          </div>
        </div>
        
        <div id="plan-content" style="margin-bottom: 2.5rem;">
          ${Loader.render('Loading plans...')}
        </div>

        <div id="discover-section" style="border-top: 1px solid var(--border); padding-top: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
            <h2 style="margin: 0; font-size: 1.45rem;">✨ Discover Meals</h2>
            
            <div style="display: flex; gap: 0.25rem; background: var(--surface); padding: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border);">
              <button id="view-mode-grid" class="btn ${isGrid ? '' : 'btn-outline'}" onclick="PlanView.setViewMode('grid')" title="Grid View" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: 0.35rem;">🔲 Grid</button>
              <button id="view-mode-list" class="btn ${!isGrid ? '' : 'btn-outline'}" onclick="PlanView.setViewMode('list')" title="List View" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: 0.35rem;">☰ List</button>
            </div>
          </div>

          <div class="sub-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.85rem; flex-wrap: wrap;">
            <button id="tab-btn-suggestions" class="btn btn-sm" style="padding: 0.5rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem;" onclick="PlanView.switchSubTab('suggestions')">✨ AI Generator</button>
            <button id="tab-btn-history" class="btn btn-outline btn-sm" style="padding: 0.5rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem;" onclick="PlanView.switchSubTab('history')">📜 Past Weeks</button>
          </div>
          
          <div id="discover-suggestions-pane" class="tab-pane active">
            <!-- AI Meal Generator Toolbar with Custom Prompt / Fridge Cleanout -->
            <div class="ai-generator-panel">
              <div style="margin-bottom: 0.85rem;">
                <h4 style="margin-bottom: 0.25rem; font-size: 1rem; color: #f8fafc;">✨ AI Meal Generator</h4>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">Generate recipes tailored to your preferences, fridge ingredients, or dietary goals.</p>
              </div>
              
              <!-- Custom Prompt / Fridge Cleanout Input -->
              <div style="margin-bottom: 0.85rem;">
                <input type="text" id="ai-custom-prompt" placeholder="💡 Optional: e.g. 'Use up leftover chicken and spinach', 'Under 25 mins', 'Mexican night'..." style="width: 100%; margin-bottom: 0; padding: 0.65rem 0.85rem; font-size: 0.875rem;" value="${this.state.customPrompt}">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <div id="suggest-category-bar" style="display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
                   <button class="btn btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('')">All</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Breakfast')">🥞 Breakfast</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Lunch')">🥗 Lunch</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Dinner')">🍽️ Dinner</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Snack')">🥨 Snack</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Dessert')">🍰 Dessert</button>
                </div>
                
                <button class="btn" style="padding: 0.55rem 1.25rem; font-size: 0.875rem; border-radius: 0.6rem; white-space: nowrap;" onclick="PlanView.suggest()">✨ Generate Suggestions</button>
              </div>
            </div>

            <div id="discover-content">
              <p style="color: var(--text-secondary);">Click "Generate Suggestions" to get AI recommendations tailored to your week.</p>
            </div>
          </div>

          <div id="discover-history-pane" class="tab-pane" style="display: none;">
            <div id="history-content">
              ${Loader.render('Loading past weekly plans...')}
            </div>
          </div>

        </div>
      </div>
    `;
  },

  getActiveWeekOf() {
    return this.state.expandedWeekOf || (this.state.plans && this.state.plans.length > 0 ? this.state.plans[0].weekOf : null);
  },

  async init() {
    this.activeTab = this.activeTab || 'suggestions';
    this.state.suggestCategory = '';
    
    try {
      this.state.plans = await api.plan.plans();
      if (this.state.plans && this.state.plans.length > 0) {
        // Expand first week by default if none expanded
        if (!this.state.expandedWeekOf) {
          this.state.expandedWeekOf = this.state.plans[0].weekOf;
        }
        const activePlan = this.state.plans.find(p => p.weekOf === this.state.expandedWeekOf);
        if (activePlan && activePlan.pendingSuggestions && activePlan.pendingSuggestions.length > 0) {
          this.state.suggestions = activePlan.pendingSuggestions;
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    await this.refresh();
    await this.switchSubTab(this.activeTab);
  },

  setSuggestCategory(category) {
    this.state.suggestCategory = category;
    document.querySelectorAll('#suggest-category-bar button').forEach(btn => {
      const isTarget = (category === '' && btn.innerText === 'All') || (category !== '' && btn.innerText.includes(category));
      btn.className = isTarget ? 'btn btn-sm' : 'btn btn-outline btn-sm';
    });
  },

  openDatesModal(mode = 'create', weekOf = null) {
    this.datesModalMode = mode;
    this.datesModalWeekOf = weekOf;

    const modal = document.getElementById('plan-dates-modal');
    if (!modal) return;

    const titleEl = document.getElementById('plan-dates-modal-title');
    const submitBtn = document.getElementById('plan-dates-submit-btn');
    const startInput = document.getElementById('plan-dates-start');
    const countInput = document.getElementById('plan-dates-count');

    if (mode === 'edit' && weekOf) {
      const plan = (this.state.plans || []).find(p => p.weekOf === weekOf || p.startDate === weekOf);
      if (titleEl) titleEl.innerText = '📅 Edit Plan Schedule';
      if (submitBtn) submitBtn.innerText = 'Save Changes';
      if (startInput) startInput.value = plan ? (plan.startDate || plan.weekOf) : new Date().toISOString().split('T')[0];
      if (countInput) countInput.value = plan ? (plan.daysCount || 7) : 7;
    } else {
      if (titleEl) titleEl.innerText = '📅 Create New Plan';
      if (submitBtn) submitBtn.innerText = '+ Create Plan';
      
      let nextStart = new Date();
      if (this.state.plans && this.state.plans.length > 0) {
        const lastPlan = this.state.plans[this.state.plans.length - 1];
        const lastDays = Utils.getPlanDays(lastPlan);
        if (lastDays.length > 0) {
          const lastDateStr = lastDays[lastDays.length - 1].dateStr;
          const [y, m, d] = lastDateStr.split('-').map(Number);
          nextStart = new Date(y, m - 1, d + 1);
        }
      }
      const y = nextStart.getFullYear();
      const m = String(nextStart.getMonth() + 1).padStart(2, '0');
      const d = String(nextStart.getDate()).padStart(2, '0');
      if (startInput) startInput.value = `${y}-${m}-${d}`;
      if (countInput) countInput.value = 7;
    }

    this.updateDatesPreview();
    modal.classList.add('open');
  },

  closeDatesModal() {
    const modal = document.getElementById('plan-dates-modal');
    if (modal) modal.classList.remove('open');
  },

  setQuickStartDate(type) {
    const startInput = document.getElementById('plan-dates-start');
    if (!startInput) return;

    const now = new Date();
    let target = new Date();

    if (type === 'today') {
      target = now;
    } else if (type === 'tomorrow') {
      target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (type === 'nextMonday') {
      const day = now.getDay();
      const diff = (day === 0 ? 1 : 8 - day);
      target = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
    }

    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    startInput.value = `${y}-${m}-${d}`;
    this.updateDatesPreview();
  },

  setDaysCount(count) {
    const countInput = document.getElementById('plan-dates-count');
    if (countInput) {
      countInput.value = count;
      this.updateDatesPreview();
    }
  },

  adjustDaysCount(delta) {
    const countInput = document.getElementById('plan-dates-count');
    if (!countInput) return;
    let current = parseInt(countInput.value, 10) || 7;
    current = Math.max(1, Math.min(31, current + delta));
    countInput.value = current;
    this.updateDatesPreview();
  },

  updateDatesPreview() {
    const startInput = document.getElementById('plan-dates-start');
    const countInput = document.getElementById('plan-dates-count');
    const previewText = document.getElementById('plan-dates-preview-text');
    if (!startInput || !countInput || !previewText) return;

    const startDate = startInput.value || new Date().toISOString().split('T')[0];
    const daysCount = parseInt(countInput.value, 10) || 7;

    const mockPlan = { startDate, daysCount };
    previewText.innerText = Utils.formatPlanRange(mockPlan);

    document.querySelectorAll('#plan-duration-chips .duration-chip').forEach(btn => {
      const btnDays = parseInt(btn.innerText, 10);
      if (btnDays === daysCount) {
        btn.classList.remove('btn-outline');
      } else {
        btn.classList.add('btn-outline');
      }
    });
  },

  async savePlanDates() {
    const startInput = document.getElementById('plan-dates-start');
    const countInput = document.getElementById('plan-dates-count');
    if (!startInput || !countInput) return;

    const startDate = startInput.value;
    const daysCount = parseInt(countInput.value, 10) || 7;

    if (!startDate) {
      Toast.show('Please select a starting date.', 'warning');
      return;
    }

    try {
      if (this.datesModalMode === 'edit' && this.datesModalWeekOf) {
        const updated = await api.plan.updatePlan(this.datesModalWeekOf, { startDate, daysCount });
        this.state.expandedWeekOf = updated.weekOf || updated.startDate;
        Toast.show('Plan schedule updated!', 'success');
      } else {
        const newPlans = await api.plan.addWeek({ startDate, daysCount });
        this.state.plans = newPlans;
        this.state.expandedWeekOf = startDate;
        Toast.show('New meal plan created!', 'success');
      }
      this.closeDatesModal();
      this.state.plans = await api.plan.plans();
      await this.refresh();
      if (window.GroceryView && GroceryView.renderPlanSummary) {
        GroceryView.state.plans = this.state.plans;
        GroceryView.renderPlanSummary();
      }
    } catch (e) {
      Toast.show('Failed to save plan: ' + e.message, 'danger');
    }
  },

  async addFutureWeek() {
    this.openDatesModal('create');
  },

  async removeWeek(event, weekOf) {
    if (event) event.stopPropagation();
    const plan = (this.state.plans || []).find(p => p.weekOf === weekOf || p.startDate === weekOf);
    const rangeLabel = plan ? Utils.formatPlanRange(plan) : weekOf;
    
    ConfirmModal.show({
      title: 'Remove Plan',
      message: `Are you sure you want to remove the plan for ${rangeLabel}? Any planned meals for this period will be removed.`,
      confirmText: 'Remove Plan',
      danger: true,
      onConfirm: async () => {
        try {
          this.state.plans = await api.plan.deleteWeek(weekOf);
          if (this.state.expandedWeekOf === weekOf) {
            this.state.expandedWeekOf = this.state.plans.length > 0 ? (this.state.plans[0].weekOf || this.state.plans[0].startDate) : null;
          }
          await this.refresh();
          Toast.show('Plan removed', 'success');
        } catch (e) {
          Toast.show('Failed to remove plan');
        }
      }
    });
  },

  toggleWeek(weekOf) {
    if (this.state.expandedWeekOf === weekOf) {
      this.state.expandedWeekOf = null;
    } else {
      this.state.expandedWeekOf = weekOf;
      const activePlan = (this.state.plans || []).find(p => p.weekOf === weekOf);
      if (activePlan && activePlan.pendingSuggestions) {
        this.state.suggestions = activePlan.pendingSuggestions;
      } else {
        this.state.suggestions = [];
      }
    }
    
    this.refresh();

    if (this.activeTab === 'suggestions') {
      this.renderSuggestions();
    }
  },

  quickAddForDay(dayName, weekOf) {
    this.activeModalWeekOf = weekOf || this.getActiveWeekOf();
    this.openDayModal([dayName], 'Dinner', this.activeModalWeekOf);
  },

  async refresh() {
    const content = document.getElementById('plan-content');
    if (!content) return;
    
    if (!this.state.plans || this.state.plans.length === 0) {
      content.innerHTML = '<p>No active plans.</p>';
      return;
    }

    let html = '<div class="plan-weeks-container" style="display: flex; flex-direction: column; gap: 1rem;">';
    
    this.state.plans.forEach(plan => {
      const planKey = plan.weekOf || plan.startDate;
      const isExpanded = this.state.expandedWeekOf === planKey;
      const planDays = Utils.getPlanDays(plan);
      const dailyMeals = {};
      planDays.forEach(d => dailyMeals[d.dateStr] = []);
      
      let plannedDaysCount = 0;
      if (plan.meals && plan.meals.length > 0) {
        plan.meals.forEach(meal => {
          if (meal.assignedDays && meal.assignedDays.length > 0) {
            meal.assignedDays.forEach(day => {
              const matchedDay = planDays.find(d => d.dateStr === day || d.dayName === day);
              if (matchedDay && dailyMeals[matchedDay.dateStr]) {
                dailyMeals[matchedDay.dateStr].push(meal);
              }
            });
          }
        });
      }
      
      planDays.forEach(d => {
        if (dailyMeals[d.dateStr].length > 0) plannedDaysCount++;
      });

      const rangeLabel = Utils.formatPlanRange(plan);
      
      html += `
        <div class="week-card ${isExpanded ? 'expanded' : 'collapsed'}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; transition: all 0.3s ease;">
          <div class="week-header" onclick="PlanView.toggleWeek('${planKey}')" style="padding: 0.9rem 1.15rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: ${isExpanded ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)'}; gap: 0.75rem; flex-wrap: wrap;">
             
             <!-- Left Column: Date Range Label -->
             <div class="week-header-title" style="display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
               <h3 style="margin: 0; font-size: 1.05rem;">📅 ${rangeLabel}</h3>
             </div>
             
             <!-- Right Column: Days Planned Badge + Dots + Edit + Delete -->
             <div class="week-header-actions" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;" onclick="event.stopPropagation()">
               <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;">
                 <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 0.15rem 0.5rem; border-radius: 1rem; white-space: nowrap;">
                   ${plannedDaysCount}/${planDays.length} Days Planned
                 </span>
                 <div class="week-summary-dots" style="display: flex; gap: 0.25rem; opacity: 0.85;">
                   ${planDays.map(d => `<span title="${d.fullLabel}" style="width: 7px; height: 7px; border-radius: 50%; background: ${dailyMeals[d.dateStr].length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.15)'};"></span>`).join('')}
                 </div>
               </div>

               <button onclick="PlanView.openDatesModal('edit', '${planKey}')" title="Edit start date and duration" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.775rem; white-space: nowrap;">
                 📅 Edit
               </button>

               ${this.state.plans.length > 1 ? `
                 <button onclick="PlanView.removeWeek(event, '${planKey}')" title="Delete this plan" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 0.5rem; padding: 0.25rem 0.55rem; font-size: 0.775rem; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.25)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.12)'">🗑️</button>
               ` : ''}
               <div style="font-size: 0.85rem; color: var(--text-muted); padding: 0.25rem 0.4rem; transition: transform 0.2s; transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0)'}; cursor: pointer;" onclick="PlanView.toggleWeek('${planKey}')">
                  ▼
               </div>
             </div>
          </div>
      `;

      if (isExpanded) {
        html += `<div class="week-body" style="padding: 1.25rem; border-top: 1px solid var(--border);">`;
        html += `<div class="calendar-list-view">`;
        
        planDays.forEach((dayObj) => {
          const meals = dailyMeals[dayObj.dateStr] || [];
          
          html += `
            <div class="calendar-list-row ${meals.length === 0 ? 'empty-row' : ''}">
              <div class="day-list-info">
                <span class="day-list-name">${dayObj.dayShort.toUpperCase()}</span>
                <span class="day-list-date">${dayObj.displayDate}</span>
                ${meals.length > 0 ? `<span class="day-list-badge">${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}</span>` : ''}
              </div>
              
              <div class="day-list-meals">
                ${meals.length > 0 ? meals.map(m => {
                  const cleanTitle = m.title || m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const typeIcon = m.mealType === 'Breakfast' ? '🥞' : m.mealType === 'Lunch' ? '🥗' : m.mealType === 'Snack' ? '🥨' : m.mealType === 'Dessert' ? '🍰' : '🍽️';
                  
                  const multStr = m.multiplier && m.multiplier !== 1 ? ` (${m.multiplier === 0.5 ? '½x' : m.multiplier + 'x'})` : '';
                  return `
                    <div class="day-meal-row-card">
                      <div class="meal-row-main">
                        <span style="font-size: 1.05rem;" title="${m.mealType || 'Dinner'}">${typeIcon}</span>
                        <a href="javascript:void(0)" onclick="PlanView.viewRecipe('${m.recipeId}', ${m.multiplier || 1})" class="meal-row-title" title="Click to open cook mode (${m.servings} servings)">
                          ${cleanTitle}
                        </a>
                      </div>
                      <div class="meal-row-meta">
                        <span class="meal-row-servings">🍽️ ${m.servings} servings${multStr}</span>
                        <div class="meal-row-actions">
                          <button onclick="PlanView.editMealDays('${m.recipeId}', '${planKey}')" title="Reassign meal days & multiplier" class="action-btn action-btn-edit">✏️ Edit</button>
                          <button onclick="PlanView.removeMeal('${m.recipeId}', '${planKey}', '${dayObj.dateStr}')" title="Remove ${cleanTitle} from ${dayObj.dayShort}" class="btn-remove-meal">🗑️</button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('') : `
                  <div class="empty-list-target" onclick="PlanView.quickAddForDay('${dayObj.dateStr}', '${planKey}')">
                    <span class="empty-list-icon">➕</span>
                    <span class="empty-list-text">No meals planned for ${dayObj.fullLabel} — tap to add</span>
                  </div>
                `}
              </div>

              <div class="day-list-action">
                <button class="btn-add-meal-row" onclick="PlanView.quickAddForDay('${dayObj.dateStr}', '${planKey}')" title="Add meal to ${dayObj.dayShort}">
                  + Add
                </button>
              </div>
            </div>
          `;
        });
        
        html += `</div></div>`; // end week-body
      }
      
      html += `</div>`; // end week-card
    });
    
    html += `</div>`;
    content.innerHTML = html;
  },

  async switchSubTab(tab) {
    this.activeTab = tab;
    
    const tabs = ['suggestions', 'history'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const pane = document.getElementById(`discover-${t}-pane`);
      if (btn) btn.className = t === tab ? 'btn btn-sm' : 'btn btn-outline btn-sm';
      if (pane) pane.style.display = t === tab ? 'block' : 'none';
    });

    if (tab === 'suggestions') {
      this.renderSuggestions();
    } else if (tab === 'history') {
      await this.loadHistory();
    }
  },

  async loadHistory() {
    const content = document.getElementById('history-content');
    try {
      const historyData = await api.plan.history();
      this.renderHistory(historyData.weeks || []);
    } catch (e) {
      if (content) content.innerHTML = `<p style="color: var(--danger);">Failed to load meal history.</p>`;
    }
  },

  renderHistory(weeks) {
    const content = document.getElementById('history-content');
    if (!content) return;
    if (!weeks || weeks.length === 0) {
      content.innerHTML = `
        <div style="background: var(--surface); padding: 2rem; border-radius: 1.25rem; border: 1px solid var(--border); text-align: center;">
          <p style="color: var(--text-muted); margin-bottom: 0;">No meal history found yet.</p>
        </div>
      `;
      return;
    }

    let html = `<p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.9rem;">Showing the last ${weeks.length} week(s) of history.</p>`;
    const sortedWeeks = [...weeks].reverse();

    sortedWeeks.forEach(week => {
      html += `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
            <h3 style="font-size: 1.2rem; font-weight: 600;">📅 Week of ${week.weekOf}</h3>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            ${(week.meals || []).map(meal => {
              const assignedDaysStr = (meal.assignedDays && meal.assignedDays.length > 0) 
                ? meal.assignedDays.join(', ') 
                : 'Unassigned';
              const cleanTitle = meal.title || meal.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

              return `
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); padding: 1rem; border-radius: 0.75rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
                  <div>
                    <h4 style="font-size: 1.05rem; margin-bottom: 0.35rem; color: var(--text);">${cleanTitle}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">📅 Assigned: <strong>${assignedDaysStr}</strong></p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0;">🍽️ Servings: ${meal.servings}</p>
                  </div>
                  <button class="btn btn-outline btn-sm" style="font-size: 0.8rem; padding: 0.4rem 0.6rem; width: 100%; text-align: center;" onclick="PlanView.decide('${meal.recipeId}', 'yes')">
                    ➕ Add to Plan Again
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    content.innerHTML = html;
  },

  setViewMode(mode) {
    this.state.viewMode = mode;
    Utils.updateViewModeButtons(mode, 'view-mode-grid', 'view-mode-list');
    if (this.activeTab === 'suggestions') {
      this.renderSuggestions();
    }
  },

  async suggest() {
    const promptInput = document.getElementById('ai-custom-prompt');
    if (promptInput) {
      this.state.customPrompt = promptInput.value.trim();
    }

    const content = document.getElementById('discover-content');
    content.innerHTML = Loader.render('Generating customized meal suggestions with Gemini...');
    
    const targetWeek = this.getActiveWeekOf();
    try {
      this.state.suggestions = await api.plan.suggest(targetWeek, this.state.suggestCategory, this.state.customPrompt);
      if (targetWeek) {
        const activePlan = this.state.plans.find(p => p.weekOf === targetWeek);
        if (activePlan) activePlan.pendingSuggestions = this.state.suggestions;
      }
    } catch (e) {
      content.innerHTML = `
        <div style="background: var(--surface); padding: 2rem; border-radius: 1rem; border: 1px solid var(--border); text-align: center; margin-top: 1rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <h4 style="color: var(--danger); margin-bottom: 0.5rem;">Could not generate recommendations</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">${e.message || 'Check your Gemini API Key in Settings'}</p>
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-sm" onclick="PlanView.suggest()">🔄 Try Again</button>
            <button class="btn btn-outline btn-sm" onclick="App.navigate('context')">⚙️ Check Settings</button>
          </div>
        </div>
      `;
    }
  },

  renderSuggestions() {
    const content = document.getElementById('discover-content');
    if (!content) return;
    if (!this.state.suggestions || !this.state.suggestions.length) {
      content.innerHTML = `<p style="color: var(--text-secondary);">No suggestions available. Click "Generate Suggestions" to get started.</p>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;
    
    this.state.suggestions.forEach(recipe => {
      const actions = `
        <div class="actions" style="display: flex; gap: 0.5rem; width: 100%; align-items: center; margin-top: 0;">
          <button class="btn" style="background: var(--success); flex: 1; padding: 0.65rem 1rem; font-size: 0.9rem;" onclick="PlanView.decide('${recipe.id}', 'yes')">➕ Add to Plan</button>
          <button class="btn btn-outline" style="padding: 0.65rem 0.95rem; font-size: 0.875rem; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem;" onclick="PlanView.decide('${recipe.id}', 'not_this_time')" title="Save recipe to library">💾 Save</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions, true);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  async decide(id, decision) {
    const targetWeek = this.getActiveWeekOf();
    if (decision === 'yes') {
      this.activeRecipeId = id;
      this.openDayModal([], 'Dinner', targetWeek);
    } else {
      await this.submitDecision(id, decision, [], null, targetWeek);
    }
  },

  async editMealDays(recipeId, weekOf) {
    this.activeRecipeId = recipeId;
    try {
      const plan = this.state.plans.find(p => p.weekOf === weekOf || p.startDate === weekOf);
      const meal = (plan.meals || []).find(m => m.recipeId === recipeId);
      const assignedDays = meal ? (meal.assignedDays || []) : [];
      const mealType = meal ? (meal.mealType || 'Dinner') : 'Dinner';
      const multiplier = meal ? (meal.multiplier || 1) : 1;
      await this.openDayModal(assignedDays, mealType, weekOf, multiplier);
    } catch (e) {
      await this.openDayModal([], 'Dinner', weekOf, 1);
    }
  },

  async openDayModal(preselectedDays = [], mealType = 'Dinner', weekOf = null, multiplier = 1) {
    if (!this.state.plans || this.state.plans.length === 0) {
      try {
        this.state.plans = await api.plan.plans();
      } catch (e) {}
    }

    this.activeModalWeekOf = weekOf || (this.state.plans && this.state.plans.length > 0 ? (this.state.plans[0].weekOf || this.state.plans[0].startDate) : null);
    const modal = document.getElementById('day-modal');
    modal.classList.add('open');

    // Make sure we have recipe list for the recipe selector
    let allRecipes = (window.RecipesView && RecipesView.state && RecipesView.state.recipes) ? RecipesView.state.recipes : [];
    if (!allRecipes || allRecipes.length === 0) {
      try {
        allRecipes = await api.recipes.list();
        if (window.RecipesView && RecipesView.state) RecipesView.state.recipes = allRecipes;
      } catch (e) {}
    }

    const titleEl = document.getElementById('day-modal-recipe-name');
    const selectGroup = document.getElementById('day-modal-recipe-select-group');
    const selectEl = document.getElementById('day-modal-recipe-select');

    if (this.activeRecipeId) {
      let recipe = (this.state.suggestions || []).find(s => s.id === this.activeRecipeId);
      if (!recipe) {
        recipe = allRecipes.find(r => r.id === this.activeRecipeId);
      }
      if (titleEl) titleEl.innerText = recipe ? `🍽️ ${recipe.title}` : `🍽️ ${this.activeRecipeId}`;
      if (selectGroup) selectGroup.style.display = 'none';
    } else {
      // Opened from empty day row "+ Add": let the user pick a recipe!
      if (titleEl) titleEl.innerText = 'Select a recipe to add:';
      if (selectGroup && selectEl) {
        selectEl.innerHTML = `
          <option value="">-- Choose a Recipe (${allRecipes.length} available) --</option>
          ${allRecipes.map(r => `<option value="${r.id}">${r.title} (${r.totalTime || 20}m)</option>`).join('')}
        `;
        selectGroup.style.display = 'block';
        if (allRecipes.length > 0) {
          selectEl.value = allRecipes[0].id;
          this.activeRecipeId = allRecipes[0].id;
        }
      }
    }

    if ((!preselectedDays || preselectedDays.length === 0) && this.activeRecipeId) {
      const plan = (this.state.plans || []).find(p => p.weekOf === this.activeModalWeekOf || p.startDate === this.activeModalWeekOf);
      if (plan && plan.meals) {
        const existing = plan.meals.find(m => m.recipeId === this.activeRecipeId);
        if (existing && existing.assignedDays) {
          preselectedDays = existing.assignedDays;
        }
        if (existing && existing.multiplier && (!multiplier || multiplier === 1)) {
          multiplier = existing.multiplier;
        }
      }
    }

    const weekSelect = document.getElementById('day-modal-week-select');
    if (weekSelect && this.state.plans && this.state.plans.length > 0) {
      weekSelect.innerHTML = this.state.plans.map(p => {
        const label = Utils.formatPlanRange ? Utils.formatPlanRange(p) : (p.startDate || p.weekOf);
        const planKey = p.weekOf || p.startDate;
        return `<option value="${planKey}" ${planKey === this.activeModalWeekOf ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }
    
    this.renderDayModalChips(this.activeModalWeekOf, preselectedDays);

    const radioChecked = modal.querySelector(`input[name="mealType"][value="${mealType}"]`);
    if (radioChecked) radioChecked.checked = true;

    // Set and preview multiplier
    this.setModalMultiplier(multiplier || 1);
  },

  setModalMultiplier(multiplier) {
    this.modalMultiplier = Number(multiplier) || 1;
    const input = document.getElementById('day-modal-multiplier-input');
    if (input) input.value = this.modalMultiplier;

    const modal = document.getElementById('day-modal');
    if (modal) {
      const btns = modal.querySelectorAll('.day-multiplier-btn');
      btns.forEach(btn => {
        const val = Number(btn.dataset.multiplier);
        if (Math.abs(val - this.modalMultiplier) < 0.01) {
          btn.className = 'btn btn-sm day-multiplier-btn active';
          btn.style.background = 'var(--primary)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--primary)';
        } else {
          btn.className = 'btn btn-outline btn-sm day-multiplier-btn';
          btn.style.background = 'rgba(255, 255, 255, 0.04)';
          btn.style.color = 'var(--text-secondary)';
          btn.style.borderColor = 'var(--border)';
        }
      });
    }

    this.updateModalServingsPreview();
  },

  updateModalServingsPreview() {
    const previewEl = document.getElementById('day-modal-servings-preview');
    if (!previewEl) return;

    let baseServings = 4;
    let recipe = null;
    if (this.activeRecipeId) {
      recipe = (this.state.suggestions || []).find(s => s.id === this.activeRecipeId);
      if (!recipe && window.RecipesView && RecipesView.state) {
        recipe = (RecipesView.state.recipes || []).find(r => r.id === this.activeRecipeId);
      }
    }
    if (recipe && recipe.servings) baseServings = Number(recipe.servings);

    const mult = this.modalMultiplier || 1;
    const scaledServings = Math.round(baseServings * mult * 10) / 10;
    const multLabel = mult === 0.5 ? '½x' : `${mult}x`;
    previewEl.innerHTML = `Base: ${baseServings} → <strong>${scaledServings} servings</strong> (${multLabel})`;
  },

  onModalRecipeChange(recipeId) {
    this.activeRecipeId = recipeId;
    this.updateModalServingsPreview();
  },

  selectModalAllDays(selectAll) {
    const modal = document.getElementById('day-modal');
    if (!modal) return;
    const cbs = modal.querySelectorAll('#day-modal-checkboxes input[type="checkbox"]');
    cbs.forEach(cb => cb.checked = selectAll);
  },

  onDayModalWeekChange(newWeekOf) {
    this.activeModalWeekOf = newWeekOf;
    let daysToPrecheck = [];
    if (this.activeRecipeId) {
      const plan = (this.state.plans || []).find(p => p.weekOf === newWeekOf || p.startDate === newWeekOf);
      const existing = plan && plan.meals ? plan.meals.find(m => m.recipeId === this.activeRecipeId) : null;
      daysToPrecheck = existing && existing.assignedDays ? existing.assignedDays : [];
    }
    this.renderDayModalChips(newWeekOf, daysToPrecheck);
  },

  renderDayModalChips(weekOf, preselectedDays = []) {
    const container = document.getElementById('day-modal-checkboxes');
    if (!container) return;

    const plan = (this.state.plans || []).find(p => p.weekOf === weekOf || p.startDate === weekOf) || (this.state.plans ? this.state.plans[0] : null);
    if (!plan) return;

    const planDays = Utils.getPlanDays(plan);
    const dailyMeals = {};
    planDays.forEach(d => dailyMeals[d.dateStr] = []);

    if (plan.meals) {
      plan.meals.forEach(m => {
        if (m.assignedDays) {
          m.assignedDays.forEach(day => {
            const matchedDay = planDays.find(d => d.dateStr === day || d.dayName === day);
            if (matchedDay && dailyMeals[matchedDay.dateStr]) {
              const name = m.title || m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              dailyMeals[matchedDay.dateStr].push(name);
            }
          });
        }
      });
    }

    container.innerHTML = planDays.map(d => {
      const isChecked = preselectedDays.includes(d.dateStr) || preselectedDays.includes(d.dayName);
      const existing = dailyMeals[d.dateStr] || [];
      const subtitle = existing.length > 0
        ? `<small style="font-size: 0.7rem; color: #a5b4fc; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${existing.join(', ')}">🍽️ ${existing.join(', ')}</small>`
        : `<small style="font-size: 0.7rem; color: var(--text-muted); display: block;">+ Empty</small>`;

      return `
        <label class="day-chip">
          <input type="checkbox" value="${d.dateStr}" ${isChecked ? 'checked' : ''}>
          <span>
            <strong style="font-size: 0.85rem; display: block; margin-bottom: 2px;">${d.dayShort}, ${d.displayDate}</strong>
            ${subtitle}
          </span>
        </label>
      `;
    }).join('');
  },

  closeDayModal() {
    const modal = document.getElementById('day-modal');
    if (modal) modal.classList.remove('open');
    this.activeRecipeId = null;
    this.activeModalWeekOf = null;
  },

  async saveDaySelection() {
    const modal = document.getElementById('day-modal');
    const checked = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const mealTypeChecked = modal.querySelector('input[name="mealType"]:checked');
    const mealType = mealTypeChecked ? mealTypeChecked.value : 'Dinner';
    
    // Check if recipe was chosen from dropdown
    const selectEl = document.getElementById('day-modal-recipe-select');
    if (!this.activeRecipeId && selectEl && selectEl.value) {
      this.activeRecipeId = selectEl.value;
    }

    if (!this.activeRecipeId) {
      Toast.show('Please select a recipe to add.', 'warning');
      return;
    }

    if (checked.length === 0) {
      Toast.show('Please select at least one day.', 'warning');
      return;
    }

    const multInput = document.getElementById('day-modal-multiplier-input');
    const multiplier = multInput ? (Number(multInput.value) || 1) : (this.modalMultiplier || 1);

    // Calculate final servings
    let baseServings = 4;
    let recipe = (this.state.suggestions || []).find(s => s.id === this.activeRecipeId);
    if (!recipe && window.RecipesView && RecipesView.state) {
      recipe = (RecipesView.state.recipes || []).find(r => r.id === this.activeRecipeId);
    }
    if (recipe && recipe.servings) baseServings = Number(recipe.servings);
    const servings = Math.round(baseServings * multiplier);

    const recipeId = this.activeRecipeId;
    const weekOf = this.activeModalWeekOf;
    this.closeDayModal();
    
    await this.submitDecision(recipeId, 'yes', checked, mealType, weekOf, multiplier, servings);
  },

  async submitDecision(id, decision, assignedDays, mealType, weekOf, multiplier = 1, servings = null) {
    const isPlanRoute = document.body.classList.contains('route-plan') || (window.location.hash === '#plan' || window.location.hash === '');
    const isSuggestionsTab = isPlanRoute && this.activeTab === 'suggestions';
    const card = isSuggestionsTab ? document.querySelector(`#discover-content .recipe-card[data-id="${id}"]`) : null;
    if (card) card.style.opacity = '0.5';
    
    try {
      if (!weekOf) weekOf = this.state.expandedWeekOf;
      
      const plan = (this.state.plans || []).find(p => p.weekOf === weekOf || p.startDate === weekOf);
      const isExistingMeal = plan && plan.meals.find(m => m.recipeId === id);
      
      if (isExistingMeal) {
        await api.plan.updateMealDays(id, assignedDays, mealType, weekOf, multiplier, servings);
      } else {
        await api.plan.decide([{ recipeId: id, decision, assignedDays, mealType, multiplier, servings }], weekOf);
      }
      
      if (isSuggestionsTab && !isExistingMeal && card) {
        card.remove();
        this.state.suggestions = (this.state.suggestions || []).filter(s => s.id !== id);
        
        if (decision === 'not_this_time') {
          Toast.show('Recipe saved to library! 💾', 'success');
        } else if (decision === 'never') {
          Toast.show('Recipe will not be suggested again.', 'info');
        } else {
          const multLabel = multiplier && multiplier !== 1 ? ` (${multiplier === 0.5 ? '½x' : multiplier + 'x'})` : '';
          Toast.show(`Meal added to plan!${multLabel} 🍽️`, 'success');
        }

        if (this.state.suggestions.length === 0) {
          Toast.show('All suggestions processed.');
          const discoverContent = document.getElementById('discover-content');
          if (discoverContent) discoverContent.innerHTML = `<p>Ready to suggest more meals.</p>`;
        }
      } else {
        if (decision === 'not_this_time') {
          Toast.show('Recipe saved to library! 💾', 'success');
        } else {
          const multLabel = multiplier && multiplier !== 1 ? ` (${multiplier === 0.5 ? '½x' : multiplier + 'x'})` : '';
          Toast.show(`Meal added to plan!${multLabel} 🍽️`, 'success');
        }
      }
      
      this.state.plans = await api.plan.plans();
      await this.refresh();
    } catch (e) {
      console.error(e);
      if (card) card.style.opacity = '1';
    }
  },

  async removeMeal(recipeId, weekOf, day = null) {
    try {
      await api.plan.removeMeal(recipeId, weekOf, day);
      Toast.show(day ? `Meal removed from ${day}.` : 'Meal removed from plan.', 'success');
      this.state.plans = await api.plan.plans();
      await this.refresh();
    } catch (e) {}
  },

  async viewRecipe(id, multiplier = 1) {
    await RecipeCard.openModal(id, multiplier);
  }
};

window.PlanView = PlanView;
