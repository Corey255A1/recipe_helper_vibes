const PlanView = {
  state: {
    plans: [],
    expandedWeekOf: null,
    suggestions: [],
    viewMode: 'grid',
    cachedRecipes: [],
    suggestCategory: '',
    cacheCategory: ''
  },
  activeTab: 'suggestions',
  activeRecipeId: null,

  formatWeekRange(weekOfStr) {
    if (!weekOfStr) return '';
    try {
      const startDate = new Date(weekOfStr + 'T00:00:00');
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      return `${startFormatted} – ${endFormatted}`;
    } catch(e) {
      return weekOfStr;
    }
  },

  async render() {
    const isGrid = this.state.viewMode === 'grid';
    return `
      <div class="view" id="plan-view">
        <div id="plan-header-title" style="margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Meal Plans</h2>
            <button class="btn btn-outline" onclick="PlanView.addFutureWeek()">+ Add Week</button>
          </div>
        </div>
        
        <div id="plan-content" style="margin-bottom: 3rem;">
          ${Loader.render('Loading plans...')}
        </div>

        <div id="discover-section" style="border-top: 1px solid var(--border); padding-top: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <h2>Discover Meals</h2>
            
            <div style="display: flex; gap: 0.25rem; background: var(--surface); padding: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border);">
              <button id="view-mode-grid" class="btn ${isGrid ? '' : 'btn-outline'}" onclick="PlanView.setViewMode('grid')" title="Grid View" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: 0.35rem;">🔲 Grid</button>
              <button id="view-mode-list" class="btn ${!isGrid ? '' : 'btn-outline'}" onclick="PlanView.setViewMode('list')" title="List View" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: 0.35rem;">☰ List</button>
            </div>
          </div>

          <div class="sub-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; flex-wrap: wrap;">
            <button id="tab-btn-suggestions" class="btn" style="padding: 0.5rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem;" onclick="PlanView.switchSubTab('suggestions')">✨ AI Suggestions</button>
            <button id="tab-btn-cached" class="btn btn-outline" style="padding: 0.5rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem;" onclick="PlanView.switchSubTab('cached')">📁 Browse Cache</button>
            <button id="tab-btn-history" class="btn btn-outline" style="padding: 0.5rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem;" onclick="PlanView.switchSubTab('history')">📜 Past Weeks (History)</button>
            <button id="tab-btn-import" class="btn btn-outline" style="padding: 0.5rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem;" onclick="PlanView.switchSubTab('import')">🔗 Import URL/PDF</button>
          </div>
          
          <div id="discover-suggestions-pane" class="tab-pane active">
            <!-- AI Meal Generator Toolbar -->
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
              <div>
                <h4 style="margin-bottom: 0.25rem; font-size: 1rem;">✨ AI Meal Generator</h4>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">Select a meal type focus and let AI suggest options for your week.</p>
              </div>
              
              <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                <div id="suggest-category-bar" style="display: flex; gap: 0.35rem; overflow-x: auto;">
                   <button class="btn btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('')">All</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Breakfast')">🥞 Breakfast</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Lunch')">🥗 Lunch</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Dinner')">🍽️ Dinner</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Snack')">🥨 Snack</button>
                   <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setSuggestCategory('Dessert')">🍰 Dessert</button>
                </div>
                
                <button class="btn" style="padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: 0.5rem; white-space: nowrap;" onclick="PlanView.suggest()">✨ Generate Suggestions</button>
              </div>
            </div>

            <div id="discover-content">
              <p style="color: var(--text-secondary);">Click "Generate Suggestions" to get AI recommendations based on your preferences.</p>
            </div>
          </div>

          <div id="discover-cached-pane" class="tab-pane" style="display: none;">
            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <input type="text" id="cache-search" placeholder="Search saved recipes..." oninput="PlanView.filterAndSortCache()" style="margin-bottom: 0; flex: 1; min-width: 200px;">
              <select id="cache-sort" onchange="PlanView.filterAndSortCache()" style="margin-bottom: 0; padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--surface); border: 1px solid var(--border); color: var(--text); font-size: 0.875rem;">
                <option value="recent" selected>Sort by: Date Added (Newest First)</option>
                <option value="oldest">Sort by: Date Added (Oldest First)</option>
                <option value="title">Sort by: Title (A - Z)</option>
              </select>
            </div>

            <div id="cache-category-bar" style="margin-bottom: 1.5rem; display: flex; gap: 0.35rem; overflow-x: auto; padding-bottom: 0.25rem;">
               <button class="btn btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setCacheCategoryFilter('')">All Saved</button>
               <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setCacheCategoryFilter('Breakfast')">🥞 Breakfast</button>
               <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setCacheCategoryFilter('Lunch')">🥗 Lunch</button>
               <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setCacheCategoryFilter('Dinner')">🍽️ Dinner</button>
               <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setCacheCategoryFilter('Snack')">🥨 Snack</button>
               <button class="btn btn-outline btn-sm" style="border-radius: 2rem; padding: 0.3rem 0.75rem; font-size: 0.8rem;" onclick="PlanView.setCacheCategoryFilter('Dessert')">🍰 Dessert</button>
            </div>

            <div id="cache-content">
              ${Loader.render('Loading recipe library...')}
            </div>
          </div>

          <div id="discover-history-pane" class="tab-pane" style="display: none;">
            <div id="history-content">
              ${Loader.render('Loading past weekly plans...')}
            </div>
          </div>

          <div id="discover-import-pane" class="tab-pane" style="display: none;">
            <form onsubmit="PlanView.importLink(event)" style="margin-bottom: 2rem; background: var(--surface); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border);">
              <h4 style="margin-bottom: 0.5rem;">Import from URL</h4>
              <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">Paste any recipe link. The AI will extract the ingredients, steps, and details.</p>
              <div class="form-group" style="display: flex; gap: 0.5rem;">
                <input type="url" id="import-url" placeholder="https://example.com/recipe-url" required style="margin-bottom: 0;">
                <button type="submit" class="btn">Import</button>
              </div>
            </form>

            <form onsubmit="PlanView.importPdf(event)" style="background: var(--surface); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border);">
              <h4 style="margin-bottom: 0.5rem;">Import from PDF</h4>
              <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">Upload a PDF recipe document. The PDF will be stored next to the parsed recipe for viewing.</p>
              <div class="form-group" style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="file" id="import-pdf-file" accept="application/pdf" required style="margin-bottom: 0;">
                <button type="submit" class="btn">Upload & Import</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.activeTab = this.activeTab || 'suggestions';
    this.state.suggestCategory = '';
    this.state.cacheCategory = '';
    
    try {
      this.state.plans = await api.plan.plans();
      if (this.state.plans && this.state.plans.length > 0) {
        if (!this.state.expandedWeekOf) {
          this.state.expandedWeekOf = this.state.plans[0].weekOf;
        }
        const activePlan = this.state.plans.find(p => p.weekOf === this.state.expandedWeekOf);
        if (activePlan && activePlan.pendingSuggestions && activePlan.pendingSuggestions.length > 0) {
          this.state.suggestions = activePlan.pendingSuggestions;
        }
      }
    } catch(e) {
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

  setCacheCategoryFilter(category) {
    this.state.cacheCategory = category;
    document.querySelectorAll('#cache-category-bar button').forEach(btn => {
      const isTarget = (category === '' && btn.innerText.includes('All')) || (category !== '' && btn.innerText.includes(category));
      btn.className = isTarget ? 'btn btn-sm' : 'btn btn-outline btn-sm';
    });
    this.filterAndSortCache();
  },

  async addFutureWeek() {
    try {
      this.state.plans = await api.plan.addWeek();
      this.state.expandedWeekOf = this.state.plans[this.state.plans.length - 1].weekOf;
      await this.refresh();
      Toast.show('Added future week', 'success');
    } catch(e) {
      Toast.show('Failed to add week');
    }
  },

  async removeWeek(event, weekOf) {
    if (event) event.stopPropagation();
    
    ConfirmModal.show({
      title: 'Remove Week Plan',
      message: `Are you sure you want to remove the week plan for ${this.formatWeekRange(weekOf)}? Any planned meals for this week will be removed.`,
      confirmText: 'Remove Week',
      danger: true,
      onConfirm: async () => {
        try {
          this.state.plans = await api.plan.deleteWeek(weekOf);
          if (this.state.expandedWeekOf === weekOf) {
            this.state.expandedWeekOf = this.state.plans.length > 0 ? this.state.plans[0].weekOf : null;
          }
          await this.refresh();
          Toast.show('Week plan removed', 'success');
        } catch (e) {
          Toast.show('Failed to remove week plan');
        }
      }
    });
  },

  toggleWeek(weekOf) {
    if (this.state.expandedWeekOf === weekOf) {
      this.state.expandedWeekOf = null;
    } else {
      this.state.expandedWeekOf = weekOf;
      const activePlan = this.state.plans.find(p => p.weekOf === weekOf);
      if (activePlan && activePlan.pendingSuggestions) {
        this.state.suggestions = activePlan.pendingSuggestions;
      } else {
        this.state.suggestions = [];
      }
      if (this.activeTab === 'suggestions') {
        this.renderSuggestions();
      }
    }
    this.refresh();
  },

  async refresh() {
    const content = document.getElementById('plan-content');
    
    if (!this.state.plans || this.state.plans.length === 0) {
      content.innerHTML = '<p>No active plans.</p>';
      return;
    }

    let html = '<div class="plan-weeks-container" style="display: flex; flex-direction: column; gap: 1rem;">';
    
    this.state.plans.forEach(plan => {
      const isExpanded = this.state.expandedWeekOf === plan.weekOf;
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dailyMeals = {};
      daysOfWeek.forEach(d => dailyMeals[d] = []);
      
      let plannedDaysCount = 0;
      if (plan.meals && plan.meals.length > 0) {
        plan.meals.forEach(meal => {
          if (meal.assignedDays && meal.assignedDays.length > 0) {
            meal.assignedDays.forEach(day => {
              if (dailyMeals[day]) dailyMeals[day].push(meal);
            });
          }
        });
      }
      
      daysOfWeek.forEach(d => {
        if (dailyMeals[d].length > 0) plannedDaysCount++;
      });
      
      html += `
        <div class="week-card ${isExpanded ? 'expanded' : 'collapsed'}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; transition: all 0.3s ease;">
          <div class="week-header" onclick="PlanView.toggleWeek('${plan.weekOf}')" style="padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: ${isExpanded ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)'};">
             <div style="display: flex; align-items: center; gap: 1rem;">
               <h3 style="margin: 0; font-size: 1.1rem;">Week of ${this.formatWeekRange(plan.weekOf)}</h3>
               <span style="font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 1rem;">${plannedDaysCount}/7 Days Planned</span>
             </div>
             
             <div class="week-summary" style="display: ${isExpanded ? 'none' : 'flex'}; gap: 0.5rem; flex: 1; justify-content: center; opacity: 0.8;">
                 ${daysOfWeek.map(d => `<span title="${d}" style="width: 12px; height: 12px; border-radius: 50%; background: ${dailyMeals[d].length > 0 ? 'var(--primary)' : 'var(--border)'};"></span>`).join('')}
             </div>
             
             <div style="display: flex; align-items: center; gap: 0.75rem;">
               ${this.state.plans.length > 1 ? `
                 <button onclick="PlanView.removeWeek(event, '${plan.weekOf}')" title="Delete this week plan" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 0.5rem; padding: 0.3rem 0.65rem; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.25)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.12)'">🗑️ Remove Week</button>
               ` : ''}
               <div style="font-size: 0.9rem; color: var(--text-muted); transition: transform 0.2s; transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0)'};">
                  ▼
               </div>
             </div>
          </div>
      `;

      if (isExpanded) {
        html += `<div class="week-body" style="padding: 1.5rem; border-top: 1px solid var(--border);">`;
        html += `<div class="calendar-list-view">`;
        
        daysOfWeek.forEach((day, dayIndex) => {
          const meals = dailyMeals[day];
          const dateStr = Utils.getDayDate(plan.weekOf, dayIndex);
          const dayShort = day.substring(0, 3).toUpperCase();
          
          html += `
            <div class="calendar-list-row ${meals.length === 0 ? 'empty-row' : ''}">
              <div class="day-list-info">
                <span class="day-list-name">${dayShort}</span>
                <span class="day-list-date">${dateStr}</span>
                ${meals.length > 0 ? `<span class="day-list-badge">${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}</span>` : ''}
              </div>
              
              <div class="day-list-meals">
                ${meals.length > 0 ? meals.map(m => {
                  const cleanTitle = m.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const typeIcon = m.mealType === 'Breakfast' ? '🥞' : m.mealType === 'Lunch' ? '🥗' : m.mealType === 'Snack' ? '🥨' : m.mealType === 'Dessert' ? '🍰' : '🍽️';
                  
                  return `
                    <div class="day-meal-row-card">
                      <span class="drag-handle" title="Drag handle">⋮⋮</span>
                      <span style="font-size: 1.05rem;" title="${m.mealType || 'Dinner'}">${typeIcon}</span>
                      <a href="javascript:void(0)" onclick="PlanView.viewRecipe('${m.recipeId}')" class="meal-row-title" title="Click to view recipe details">
                        ${cleanTitle}
                      </a>
                      <span class="meal-row-servings">🍽️ ${m.servings} servings</span>
                      <div class="meal-row-actions">
                        <button onclick="PlanView.editMealDays('${m.recipeId}', '${plan.weekOf}')" title="Reassign meal days" class="action-btn action-btn-edit">✏️ Edit</button>
                        <button onclick="PlanView.removeMeal('${m.recipeId}', '${plan.weekOf}')" title="Remove ${cleanTitle}" class="btn-remove-meal">🗑️ Remove</button>
                      </div>
                    </div>
                  `;
                }).join('') : `
                  <div class="empty-list-target" onclick="document.getElementById('discover-section').scrollIntoView({behavior: 'smooth'})">
                    <span class="empty-list-icon">➕</span>
                    <span class="empty-list-text">No meals planned for ${day} — click to add</span>
                  </div>
                `}
              </div>

              <div class="day-list-action">
                <button class="btn-add-meal-row" onclick="document.getElementById('discover-section').scrollIntoView({behavior: 'smooth'})" title="Add meal to ${day}">
                  + Add Meal
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
    
    const tabs = ['suggestions', 'cached', 'history', 'import'];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const pane = document.getElementById(`discover-${t}-pane`);
      if (btn) {
        btn.className = t === tab ? 'btn' : 'btn btn-outline';
      }
      if (pane) {
        pane.style.display = t === tab ? 'block' : 'none';
      }
    });

    if (tab === 'suggestions') {
      this.renderSuggestions();
    } else if (tab === 'cached') {
      await this.loadCache();
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
      content.innerHTML = `<p style="color: var(--danger);">Failed to load meal history.</p>`;
    }
  },

  renderHistory(weeks) {
    const content = document.getElementById('history-content');
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
              const cleanTitle = meal.recipeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

              return `
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); padding: 1rem; border-radius: 0.75rem; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <h4 style="font-size: 1.05rem; margin-bottom: 0.35rem; color: var(--text);">${cleanTitle}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">📅 Assigned: <strong>${assignedDaysStr}</strong></p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">🍽️ Servings: ${meal.servings}</p>
                  </div>
                  <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.35rem 0.5rem; width: 100%; text-align: center;" onclick="PlanView.decide('${meal.recipeId}', 'yes')">
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

  async loadCache() {
    const content = document.getElementById('cache-content');
    try {
      this.state.cachedRecipes = await api.recipes.list();
      this.filterAndSortCache();
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to load cached recipes.</p>`;
    }
  },

  filterAndSortCache() {
    if (!this.state.cachedRecipes) return;
    
    const searchVal = (document.getElementById('cache-search')?.value || '').toLowerCase();
    const sortVal = document.getElementById('cache-sort')?.value || 'recent';
    const catVal = (this.state.cacheCategory || '').toLowerCase();

    let filtered = this.state.cachedRecipes.filter(recipe => {
      const titleMatch = recipe.title.toLowerCase().includes(searchVal);
      const tagMatch = (recipe.tags || []).some(t => t.toLowerCase().includes(searchVal));
      const matchesSearch = !searchVal || titleMatch || tagMatch;

      let matchesCat = true;
      if (catVal) {
        const inTags = (recipe.tags || []).some(t => t.toLowerCase().includes(catVal));
        const inTitle = recipe.title.toLowerCase().includes(catVal);
        const inMealType = recipe.mealType && recipe.mealType.toLowerCase() === catVal;
        matchesCat = inTags || inTitle || inMealType;
      }

      return matchesSearch && matchesCat;
    });

    Utils.sortRecipes(filtered, sortVal);

    this.renderCache(filtered);
  },

  setViewMode(mode) {
    this.state.viewMode = mode;
    Utils.updateViewModeButtons(mode, 'view-mode-grid', 'view-mode-list');
    
    if (this.activeTab === 'suggestions') {
      this.renderSuggestions();
    } else if (this.activeTab === 'cached' && this.state.cachedRecipes) {
      this.filterAndSortCache();
    }
  },

  renderCache(recipes) {
    const content = document.getElementById('cache-content');
    if (!recipes || recipes.length === 0) {
      content.innerHTML = `<p style="color: var(--text-secondary);">No saved recipes found for this filter.</p>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;

    recipes.forEach(recipe => {
      const actions = `
        <div class="actions" style="flex: 1; margin-top: 0;">
          <button class="btn" style="background: var(--success); width: 100%; padding: 0.55rem 0.75rem; font-size: 0.85rem;" onclick="PlanView.decide('${recipe.id}', 'yes')">➕ Add to Plan</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions, false);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  async suggest() {
    const content = document.getElementById('discover-content');
    content.innerHTML = Loader.render('Generating customized meal suggestions...');
    
    try {
      this.state.suggestions = await api.plan.suggest(this.state.expandedWeekOf, this.state.suggestCategory);
      if (this.state.expandedWeekOf) {
        const activePlan = this.state.plans.find(p => p.weekOf === this.state.expandedWeekOf);
        if (activePlan) activePlan.pendingSuggestions = this.state.suggestions;
      }
      this.renderSuggestions();
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to generate suggestions. Please check if your context is set up.</p>`;
    }
  },

  renderSuggestions() {
    const content = document.getElementById('discover-content');
    if (!this.state.suggestions || !this.state.suggestions.length) {
      content.innerHTML = `<p style="color: var(--text-secondary);">No suggestions available. Click "Suggest Meals" to get started.</p>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;
    
    this.state.suggestions.forEach(recipe => {
      const actions = `
        <div class="actions" style="display: flex; gap: 0.5rem; width: 100%; align-items: center; margin-top: 0;">
          <button class="btn" style="background: var(--success); flex: 1; padding: 0.65rem 1rem; font-size: 0.9rem;" onclick="PlanView.decide('${recipe.id}', 'yes')">➕ Add to Plan</button>
          <button onclick="PlanView.decide('${recipe.id}', 'not_this_time')" title="Skip for now" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.4rem 0.6rem; font-size: 0.825rem; font-weight: 500; border-radius: 0.4rem; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">Skip ⏭️</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions, true);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  async decide(id, decision) {
    if (decision === 'yes') {
      this.activeRecipeId = id;
      this.openDayModal([], 'Dinner', this.state.expandedWeekOf);
    } else {
      await this.submitDecision(id, decision, [], null, this.state.expandedWeekOf);
    }
  },

  async editMealDays(recipeId, weekOf) {
    this.activeRecipeId = recipeId;
    try {
      const plan = this.state.plans.find(p => p.weekOf === weekOf);
      const meal = (plan.meals || []).find(m => m.recipeId === recipeId);
      const assignedDays = meal ? (meal.assignedDays || []) : [];
      const mealType = meal ? (meal.mealType || 'Dinner') : 'Dinner';
      await this.openDayModal(assignedDays, mealType, weekOf);
    } catch(e) {
      await this.openDayModal([], 'Dinner', weekOf);
    }
  },

  async openDayModal(preselectedDays = [], mealType = 'Dinner', weekOf = null) {
    this.activeModalWeekOf = weekOf;
    const modal = document.getElementById('day-modal');
    modal.classList.add('open');
    
    modal.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = preselectedDays.includes(cb.value);
    });

    const radioChecked = modal.querySelector(`input[name="mealType"][value="${mealType}"]`);
    if (radioChecked) radioChecked.checked = true;

    try {
      const plan = this.state.plans.find(p => p.weekOf === weekOf) || this.state.plans[0];
      const dailyMeals = {};
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      daysOfWeek.forEach(d => dailyMeals[d] = []);
      
      if (plan && plan.meals) {
        plan.meals.forEach(m => {
          if (m.assignedDays) {
            m.assignedDays.forEach(day => {
              if (dailyMeals[day]) {
                dailyMeals[day].push(m.recipeId.replace(/-/g, ' '));
              }
            });
          }
        });
      }

      modal.querySelectorAll('.day-chip:not(.type-chip)').forEach(chip => {
        const cb = chip.querySelector('input[type="checkbox"]');
        if (!cb) return;
        const dayVal = cb.value;
        const span = chip.querySelector('span');
        const abbreviation = dayVal.substring(0, 3);
        
        const existing = dailyMeals[dayVal];
        if (existing && existing.length > 0) {
          span.innerHTML = `${abbreviation}<br><small style="font-size: 0.65rem; color: #a5b4fc; display: block; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${existing.join(', ')}">${existing.join(', ')}</small>`;
        } else {
          span.innerHTML = `${abbreviation}<br><small style="font-size: 0.65rem; color: var(--text-muted); display: block;">empty</small>`;
        }
      });
    } catch (e) {}
  },

  closeDayModal() {
    const modal = document.getElementById('day-modal');
    modal.classList.remove('open');
    this.activeRecipeId = null;
    this.activeModalWeekOf = null;
  },

  async saveDaySelection() {
    const modal = document.getElementById('day-modal');
    const checked = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const mealTypeChecked = modal.querySelector('input[name="mealType"]:checked');
    const mealType = mealTypeChecked ? mealTypeChecked.value : 'Dinner';
    
    if (checked.length === 0) {
      Toast.show('Please select at least one day.', 'warning');
      return;
    }

    const recipeId = this.activeRecipeId;
    const weekOf = this.activeModalWeekOf;
    this.closeDayModal();
    
    await this.submitDecision(recipeId, 'yes', checked, mealType, weekOf);
  },

  async submitDecision(id, decision, assignedDays, mealType, weekOf) {
    const isSuggestionsTab = this.activeTab === 'suggestions';
    const card = isSuggestionsTab ? document.querySelector(`.recipe-card[data-id="${id}"]`) : null;
    if (card) card.style.opacity = '0.5';
    
    try {
      if (!weekOf) weekOf = this.state.expandedWeekOf;
      
      const plan = this.state.plans.find(p => p.weekOf === weekOf);
      const isExistingMeal = plan && plan.meals.find(m => m.recipeId === id);
      
      if (isExistingMeal) {
        await api.plan.updateMealDays(id, assignedDays, mealType, weekOf);
      } else {
        await api.plan.decide([{ recipeId: id, decision, assignedDays, mealType }], weekOf);
      }
      
      if (isSuggestionsTab && !isExistingMeal) {
        if (card) card.remove();
        this.state.suggestions = this.state.suggestions.filter(s => s.id !== id);
        
        if (this.state.suggestions.length === 0) {
          Toast.show('All suggestions processed.');
          document.getElementById('discover-content').innerHTML = `<p>Ready to suggest more meals.</p>`;
        }
      } else {
        Toast.show('Plan updated!', 'success');
      }
      
      this.state.plans = await api.plan.plans();
      await this.refresh();
    } catch (e) {
      console.error(e);
      if (card) card.style.opacity = '1';
    }
  },

  async removeMeal(recipeId, weekOf) {
    try {
      await api.plan.removeMeal(recipeId, weekOf);
      Toast.show('Meal removed from plan.', 'success');
      this.state.plans = await api.plan.plans();
      await this.refresh();
    } catch (e) {
      // Toast already shown
    }
  },

  async viewRecipe(id) {
    await RecipeCard.openModal(id);
  },

  closeRecipeModal() {
    RecipeCard.closeModal();
  },

  async importLink(e) {
    e.preventDefault();
    const urlInput = document.getElementById('import-url');
    const url = urlInput.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Importing...';
    submitBtn.disabled = true;

    try {
      const recipe = await api.recipes.importLink(url);
      Toast.show(`Imported: ${recipe.title}`, 'success');
      urlInput.value = '';
      await this.switchSubTab('cached');
    } catch (err) {
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  },

  async importPdf(e) {
    e.preventDefault();
    const fileInput = document.getElementById('import-pdf-file');
    const file = fileInput.files[0];
    if (!file) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const recipe = await api.recipes.importPdf(formData);
      Toast.show(`Uploaded & Parsed: ${recipe.title}`, 'success');
      fileInput.value = '';
      await this.switchSubTab('cached');
    } catch (err) {
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
};
