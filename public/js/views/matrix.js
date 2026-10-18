const MatrixView = {
  state: {
    activeSheet: 'schedule', // 'schedule', 'recipes', 'pantry', 'grocery'
    density: 'compact',      // 'compact', 'comfortable'
    filterText: '',
    selectedDayStr: '',
    selectedMealType: 'Dinner',
    plans: [],
    currentPlan: null,
    recipes: [],
    pantryItems: [],
    groceryList: { categories: [] },
    sort: { col: 'title', asc: true }
  },

  async render() {
    return `
      <div class="view" id="matrix-view">
        <!-- Top Command Bar -->
        <div class="matrix-top-bar">
          <div class="matrix-bar-left">
            <div class="matrix-brand">
              <span class="matrix-brand-icon">📊</span>
              <div>
                <h2 class="matrix-title">Kitchen Matrix</h2>
                <span class="matrix-subtitle">High-Density Desktop Workspace</span>
              </div>
            </div>

            <!-- Workbook Sheet Tabs -->
            <div class="matrix-sheet-tabs" role="tablist">
              <button type="button" class="matrix-tab ${this.state.activeSheet === 'schedule' ? 'active' : ''}" onclick="MatrixView.switchSheet('schedule')">
                <span>📅</span> Schedule Matrix
              </button>
              <button type="button" class="matrix-tab ${this.state.activeSheet === 'recipes' ? 'active' : ''}" onclick="MatrixView.switchSheet('recipes')">
                <span>📖</span> Master Recipes
              </button>
              <button type="button" class="matrix-tab ${this.state.activeSheet === 'pantry' ? 'active' : ''}" onclick="MatrixView.switchSheet('pantry')">
                <span>🥫</span> Master Pantry
              </button>
              <button type="button" class="matrix-tab ${this.state.activeSheet === 'grocery' ? 'active' : ''}" onclick="MatrixView.switchSheet('grocery')">
                <span>🛒</span> Master Grocery
              </button>
            </div>
          </div>

          <div class="matrix-bar-right">
            <!-- Universal Filter Input -->
            <div class="matrix-search-box">
              <input type="text" id="matrix-filter-input" placeholder="🔍 Filter sheet..." value="${this.state.filterText}" oninput="MatrixView.onFilterInput(this.value)">
              ${this.state.filterText ? `<button class="matrix-filter-clear" onclick="MatrixView.clearFilter()">✕</button>` : ''}
            </div>

            <!-- Target Plan Dropdown (When on Schedule sheet) -->
            <div id="matrix-plan-select-wrapper" style="${this.state.activeSheet === 'schedule' ? 'display: flex;' : 'display: none;'} align-items: center; gap: 0.35rem;">
              <select id="matrix-plan-select" onchange="MatrixView.onPlanSelect(this.value)" class="matrix-compact-select">
              </select>
            </div>

            <!-- Density Toggle -->
            <button type="button" class="matrix-tool-btn" onclick="MatrixView.toggleDensity()" title="Toggle compact spreadsheet density">
              ${this.state.density === 'compact' ? '🗜️ Compact' : '📐 Normal'}
            </button>

            <!-- Export Tools -->
            <div class="matrix-export-group">
              <button type="button" class="matrix-tool-btn" onclick="MatrixView.copyActiveSheetTsv()" title="Copy active table as tab-delimited text for Excel / Sheets">
                📋 Copy TSV
              </button>
              <button type="button" class="matrix-tool-btn" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399;" onclick="MatrixView.exportActiveSheetCsv()" title="Download as .csv file">
                📥 Export CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Notice Warning (only visible on small mobile devices) -->
        <div class="matrix-mobile-notice">
          <span>💡 <strong>Desktop Power View:</strong> For the best multi-paned spreadsheet experience, use a desktop or tablet in landscape.</span>
        </div>

        <!-- Sheet Body Workspace -->
        <div id="matrix-sheet-content" class="matrix-sheet-content ${this.state.density === 'compact' ? 'density-compact' : 'density-comfortable'}">
          ${Loader.render('Loading Kitchen Matrix workspace...')}
        </div>
      </div>
    `;
  },

  async init() {
    await this.loadAllData();
    this.renderCurrentSheet();
  },

  async loadAllData() {
    try {
      const [plans, recipes, pantry, grocery] = await Promise.all([
        api.plan.plans().catch(() => []),
        api.recipes.list().catch(() => []),
        api.pantry.list().catch(() => ({ items: [] })),
        api.grocery.getSaved().catch(() => ({ categories: [] }))
      ]);

      this.state.plans = plans || [];
      this.state.recipes = recipes || [];
      this.state.pantryItems = pantry.items || [];
      this.state.groceryList = grocery || { categories: [] };

      if (this.state.plans.length > 0 && !this.state.currentPlan) {
        this.state.currentPlan = this.state.plans[0];
      }

      this.updatePlanSelectOptions();
    } catch (err) {
      console.error('[MATRIX LOAD ERROR]', err);
    }
  },

  updatePlanSelectOptions() {
    const sel = document.getElementById('matrix-plan-select');
    if (!sel) return;
    sel.innerHTML = (this.state.plans || []).map(p => `
      <option value="${p.weekOf}" ${this.state.currentPlan && this.state.currentPlan.weekOf === p.weekOf ? 'selected' : ''}>
        📅 ${Utils.formatPlanRange ? Utils.formatPlanRange(p) : (p.startDate || p.weekOf)}
      </option>
    `).join('');
  },

  switchSheet(sheetName) {
    this.state.activeSheet = sheetName;
    document.querySelectorAll('.matrix-sheet-tabs .matrix-tab').forEach(tab => {
      if (tab.innerText.toLowerCase().includes(sheetName)) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const planWrapper = document.getElementById('matrix-plan-select-wrapper');
    if (planWrapper) {
      planWrapper.style.display = sheetName === 'schedule' ? 'flex' : 'none';
    }

    this.renderCurrentSheet();
  },

  toggleDensity() {
    this.state.density = this.state.density === 'compact' ? 'comfortable' : 'compact';
    const content = document.getElementById('matrix-sheet-content');
    if (content) {
      if (this.state.density === 'compact') {
        content.classList.add('density-compact');
        content.classList.remove('density-comfortable');
      } else {
        content.classList.remove('density-compact');
        content.classList.add('density-comfortable');
      }
    }
    // Update button text
    const btn = document.querySelector('button[onclick="MatrixView.toggleDensity()"]');
    if (btn) {
      btn.innerText = this.state.density === 'compact' ? '🗜️ Compact' : '📐 Normal';
    }
  },

  onFilterInput(text) {
    this.state.filterText = (text || '').trim().toLowerCase();
    this.renderCurrentSheet();
  },

  clearFilter() {
    this.state.filterText = '';
    const input = document.getElementById('matrix-filter-input');
    if (input) input.value = '';
    this.renderCurrentSheet();
  },

  onPlanSelect(weekOf) {
    const target = (this.state.plans || []).find(p => p.weekOf === weekOf);
    if (target) {
      this.state.currentPlan = target;
      this.renderCurrentSheet();
    }
  },

  renderCurrentSheet() {
    const container = document.getElementById('matrix-sheet-content');
    if (!container) return;

    if (this.state.activeSheet === 'schedule') {
      this.renderScheduleSheet(container);
    } else if (this.state.activeSheet === 'recipes') {
      this.renderRecipesSheet(container);
    } else if (this.state.activeSheet === 'pantry') {
      this.renderPantrySheet(container);
    } else if (this.state.activeSheet === 'grocery') {
      this.renderGrocerySheet(container);
    }
  },

  // =========================================================================
  // SHEET 1: 3-PANE MULTI-SPLIT SCHEDULE MATRIX
  // =========================================================================
  renderScheduleSheet(container) {
    const plan = this.state.currentPlan;
    if (!plan) {
      container.innerHTML = `
        <div style="background: var(--surface); padding: 3rem; text-align: center; border-radius: 1rem; border: 1px solid var(--border);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h3>No Meal Plan Schedule</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">Create a meal plan in the Plan view first to open the Schedule Matrix.</p>
          <button class="btn btn-sm" onclick="App.navigate('plan')">Go to Meal Plan</button>
        </div>
      `;
      return;
    }

    const days = Utils.getPlanDays ? Utils.getPlanDays(plan) : [];
    if (!this.state.selectedDayStr && days.length > 0) {
      this.state.selectedDayStr = days[0].dateStr;
    }

    // Filter recipes for left catalog
    let catalogRecipes = this.state.recipes || [];
    if (this.state.filterText) {
      catalogRecipes = catalogRecipes.filter(r =>
        (r.title || '').toLowerCase().includes(this.state.filterText) ||
        (r.tags || []).some(t => t.toLowerCase().includes(this.state.filterText))
      );
    }

    // Build live ingredient roll-up for right pane
    const planIngredients = this.calculatePlanIngredients(plan);
    const pantryMatches = Utils.matchGroceryWithPantry ? Utils.matchGroceryWithPantry([{ name: 'All', items: planIngredients }], this.state.pantryItems) : [];
    const matchedIngMap = new Map();
    pantryMatches.forEach(m => matchedIngMap.set(m.groceryItem.id, m.pantryItem));

    const html = `
      <div class="matrix-split-container">
        <!-- PANE 1 (LEFT): Recipe Catalog Sidebar -->
        <aside class="matrix-pane matrix-pane-left">
          <div class="matrix-pane-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="matrix-pane-title">📖 Recipe Catalog</span>
              <span class="matrix-badge">${catalogRecipes.length}</span>
            </div>
            <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 0.2rem;">
              Target Day: <strong style="color: var(--accent-cyan);">${this.getSelectedDayLabel(days)}</strong>
            </div>
          </div>

          <div class="matrix-pane-body">
            <table class="matrix-table matrix-table-dense">
              <thead>
                <tr>
                  <th style="width: 28px;"></th>
                  <th>Title</th>
                  <th style="width: 50px; text-align: right;">Time</th>
                  <th style="width: 44px; text-align: center;">+ Plan</th>
                </tr>
              </thead>
              <tbody>
                ${catalogRecipes.map(r => `
                  <tr class="matrix-recipe-row" ondblclick="MatrixView.quickAssignRecipe('${r.id}')" title="Double click to assign to ${this.getSelectedDayLabel(days)}">
                    <td style="text-align: center; font-size: 0.85rem;">${r.favorite ? '⭐' : '📄'}</td>
                    <td class="matrix-cell-truncate" style="max-width: 140px; font-weight: 500;">
                      <a href="javascript:void(0)" onclick="RecipeCard.openModal('${r.id}')" style="color: inherit; text-decoration: none;">${r.title}</a>
                    </td>
                    <td style="text-align: right; font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">
                      ${(r.totalTime || ((r.prepTime || 0) + (r.cookTime || 0)) || 25)}m
                    </td>
                    <td style="text-align: center;">
                      <button type="button" class="matrix-btn-cell" onclick="MatrixView.quickAssignRecipe('${r.id}')" title="Assign to ${this.getSelectedDayLabel(days)}">+</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </aside>

        <!-- PANE 2 (CENTER): Main Schedule Matrix Grid -->
        <main class="matrix-pane matrix-pane-center">
          <div class="matrix-pane-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="matrix-pane-title">📅 Meal Planning Matrix</span>
              <span class="matrix-badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc;">${days.length} Days</span>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button type="button" class="matrix-tool-btn" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;" onclick="PlanView.openDatesModal('edit', '${plan.weekOf}')">
                🗓️ Adjust Schedule Range
              </button>
            </div>
          </div>

          <div class="matrix-pane-body" style="padding: 0;">
            <table class="matrix-table matrix-grid-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Day / Date</th>
                  <th>🥞 Breakfast</th>
                  <th>🥗 Lunch</th>
                  <th style="min-width: 180px;">🍽️ Dinner</th>
                  <th>🥨 Snack / Dessert</th>
                  <th style="width: 60px; text-align: center;">Clear</th>
                </tr>
              </thead>
              <tbody>
                ${days.map(d => {
                  const isSelected = d.dateStr === this.state.selectedDayStr;
                  const dayMeals = (plan.meals || []).filter(m => Utils.isMealOnDay(m, d));

                  return `
                    <tr class="matrix-day-row ${isSelected ? 'selected-day-row' : ''}" onclick="MatrixView.selectActiveDay('${d.dateStr}')">
                      <!-- Day Column -->
                      <td class="matrix-day-cell">
                        <div style="font-weight: 700; color: #f8fafc; font-size: 0.9rem;">${d.dayShort}</div>
                        <div style="font-size: 0.75rem; color: var(--accent-cyan); font-family: monospace;">${d.monthShort} ${d.dayNum}</div>
                        ${isSelected ? `<span class="matrix-active-indicator">Target</span>` : ''}
                      </td>

                      <!-- Breakfast -->
                      <td class="matrix-meal-slot">
                        ${this.renderMealSlot(dayMeals, 'Breakfast', d)}
                      </td>

                      <!-- Lunch -->
                      <td class="matrix-meal-slot">
                        ${this.renderMealSlot(dayMeals, 'Lunch', d)}
                      </td>

                      <!-- Dinner -->
                      <td class="matrix-meal-slot">
                        ${this.renderMealSlot(dayMeals, 'Dinner', d)}
                      </td>

                      <!-- Snack / Dessert -->
                      <td class="matrix-meal-slot">
                        ${this.renderMealSlot(dayMeals, 'Snack', d)}
                      </td>

                      <!-- Clear Day -->
                      <td style="text-align: center;">
                        ${dayMeals.length > 0 ? `
                          <button type="button" class="matrix-btn-danger-cell" onclick="event.stopPropagation(); MatrixView.clearDayMeals('${d.dateStr}')" title="Clear all meals on ${d.dayName}">✕</button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </main>

        <!-- PANE 3 (RIGHT): Live Grocery & Pantry Sync -->
        <aside class="matrix-pane matrix-pane-right">
          <div class="matrix-pane-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="matrix-pane-title">🛒 Live Grocery & Pantry Sync</span>
              <span class="matrix-badge">${planIngredients.length} Needed</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
              <span style="font-size: 0.75rem; color: #34d399; font-weight: 600;">
                ✓ ${pantryMatches.length} in Pantry
              </span>
              <button type="button" class="matrix-tool-btn" style="padding: 0.15rem 0.45rem; font-size: 0.7rem;" onclick="MatrixView.checkAllPantryMatches()">
                ✓ Check Pantry
              </button>
            </div>
          </div>

          <div class="matrix-pane-body">
            <table class="matrix-table matrix-table-dense">
              <thead>
                <tr>
                  <th style="width: 24px;">[✓]</th>
                  <th>Ingredient Need</th>
                  <th style="width: 75px; text-align: center;">Pantry Stock</th>
                </tr>
              </thead>
              <tbody>
                ${planIngredients.length === 0 ? `
                  <tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Add meals to the matrix to calculate groceries.</td></tr>
                ` : planIngredients.map(ing => {
                  const match = matchedIngMap.get(ing.id);
                  return `
                    <tr class="${ing.checked ? 'matrix-row-checked' : ''}">
                      <td style="text-align: center;">
                        <input type="checkbox" ${ing.checked ? 'checked' : ''} onchange="MatrixView.toggleSyncIngredientCheck('${ing.id}')" style="accent-color: var(--primary); cursor: pointer;">
                      </td>
                      <td>
                        <div style="font-weight: 500; font-size: 0.825rem; color: #f8fafc;">
                          ${ing.quantity ? `<span style="color: var(--accent-cyan); font-family: monospace;">${ing.quantity}</span> ` : ''}${ing.ingredient}
                        </div>
                        ${ing.fromRecipe ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${ing.fromRecipe}</div>` : ''}
                      </td>
                      <td style="text-align: center;">
                        ${match ? `
                          <span class="matrix-status-badge in-stock" title="In Pantry: ${match.name} (${match.quantity || 'In Stock'})">✓ Have</span>
                        ` : `
                          <span class="matrix-status-badge need-buy">🛒 Need</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    `;

    container.innerHTML = html;
  },

  getSelectedDayLabel(days) {
    const d = days.find(day => day.dateStr === this.state.selectedDayStr);
    return d ? `${d.dayShort} ${d.monthShort} ${d.dayNum}` : 'Select a Day';
  },

  selectActiveDay(dateStr) {
    this.state.selectedDayStr = dateStr;
    document.querySelectorAll('.matrix-day-row').forEach(row => {
      if (row.innerHTML.includes(dateStr)) {
        row.classList.add('selected-day-row');
      } else {
        row.classList.remove('selected-day-row');
      }
    });
    // Update left pane label
    const plan = this.state.currentPlan;
    if (plan) {
      const days = Utils.getPlanDays ? Utils.getPlanDays(plan) : [];
      const labelEl = document.querySelector('.matrix-pane-left strong');
      if (labelEl) labelEl.innerText = this.getSelectedDayLabel(days);
    }
  },

  renderMealSlot(dayMeals, mealType, dayObj) {
    const matches = dayMeals.filter(m => (m.mealType || 'Dinner').toLowerCase() === mealType.toLowerCase());

    if (matches.length === 0) {
      return `
        <button type="button" class="matrix-cell-empty-btn" onclick="event.stopPropagation(); MatrixView.openMealPicker('${dayObj.dateStr}', '${mealType}')" title="Assign ${mealType} to ${dayObj.dayName}">
          + Add
        </button>
      `;
    }

    return `
      <div class="matrix-cell-chip-stack">
        ${matches.map(m => {
          const recipe = (this.state.recipes || []).find(r => r.id === m.recipeId) || { title: m.recipeId };
          const mult = m.multiplier || 1;

          return `
            <div class="matrix-meal-chip" onclick="event.stopPropagation(); RecipeCard.openModal('${m.recipeId}', ${mult})">
              <span class="matrix-meal-chip-title">${recipe.title}</span>
              <span class="matrix-meal-multiplier-badge" onclick="event.stopPropagation(); MatrixView.cycleMultiplier('${m.recipeId}', '${dayObj.dateStr}', ${mult})" title="Click to cycle portion: 0.5x, 1x, 1.5x, 2x">
                ${mult}x
              </span>
              <button type="button" class="matrix-meal-chip-del" onclick="event.stopPropagation(); MatrixView.removeMealFromDay('${m.recipeId}', '${dayObj.dateStr}')" title="Remove meal">✕</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  async quickAssignRecipe(recipeId) {
    if (!this.state.selectedDayStr) {
      Toast.show('Click a day in the center matrix first.', 'warning');
      return;
    }
    const plan = this.state.currentPlan;
    if (!plan) return;

    try {
      // Find if recipe is already in plan
      let existingMeal = (plan.meals || []).find(m => m.recipeId === recipeId);
      let assignedDays = existingMeal && Array.isArray(existingMeal.assignedDays) ? [...existingMeal.assignedDays] : [];

      if (!assignedDays.includes(this.state.selectedDayStr)) {
        assignedDays.push(this.state.selectedDayStr);
      }

      await api.plan.updateMealDays(recipeId, assignedDays, this.state.selectedMealType || 'Dinner', plan.weekOf);
      await this.loadAllData();
      this.renderCurrentSheet();
      Toast.show(`Assigned to ${this.state.selectedDayStr} ✓`, 'success');
    } catch (err) {
      Toast.show(`Failed to assign: ${err.message}`, 'danger');
    }
  },

  openMealPicker(dateStr, mealType) {
    this.state.selectedDayStr = dateStr;
    this.state.selectedMealType = mealType;
    if (window.PlanView && PlanView.openDayModal) {
      PlanView.openDayModal([dateStr], mealType, this.state.currentPlan?.weekOf);
    }
  },

  async cycleMultiplier(recipeId, dateStr, currentMult) {
    const mults = [0.5, 1, 1.5, 2, 3, 4];
    const nextIdx = (mults.indexOf(currentMult) + 1) % mults.length;
    const nextMult = mults[nextIdx];

    const plan = this.state.currentPlan;
    if (!plan) return;

    const meal = (plan.meals || []).find(m => m.recipeId === recipeId);
    if (!meal) return;

    try {
      await api.plan.updateMealDays(recipeId, meal.assignedDays || [dateStr], meal.mealType || 'Dinner', plan.weekOf, nextMult);
      await this.loadAllData();
      this.renderCurrentSheet();
      Toast.show(`Portion updated to ${nextMult}x`, 'info');
    } catch (err) {
      Toast.show(`Update failed: ${err.message}`, 'danger');
    }
  },

  async removeMealFromDay(recipeId, dateStr) {
    const plan = this.state.currentPlan;
    if (!plan) return;

    const meal = (plan.meals || []).find(m => m.recipeId === recipeId);
    if (!meal) return;

    const nextDays = (meal.assignedDays || []).filter(d => d !== dateStr);

    try {
      if (nextDays.length === 0) {
        await api.plan.removeMeal(recipeId, plan.weekOf);
      } else {
        await api.plan.updateMealDays(recipeId, nextDays, meal.mealType || 'Dinner', plan.weekOf, meal.multiplier || 1);
      }
      await this.loadAllData();
      this.renderCurrentSheet();
      Toast.show('Removed meal from day', 'info');
    } catch (err) {
      Toast.show(`Delete failed: ${err.message}`, 'danger');
    }
  },

  async clearDayMeals(dateStr) {
    const plan = this.state.currentPlan;
    if (!plan) return;

    const dayMeals = (plan.meals || []).filter(m => (m.assignedDays || []).includes(dateStr));
    if (dayMeals.length === 0) return;

    try {
      for (const m of dayMeals) {
        const nextDays = (m.assignedDays || []).filter(d => d !== dateStr);
        if (nextDays.length === 0) {
          await api.plan.removeMeal(m.recipeId, plan.weekOf);
        } else {
          await api.plan.updateMealDays(m.recipeId, nextDays, m.mealType || 'Dinner', plan.weekOf, m.multiplier || 1);
        }
      }
      await this.loadAllData();
      this.renderCurrentSheet();
      Toast.show(`Cleared all meals for ${dateStr}`, 'info');
    } catch (err) {
      Toast.show(`Clear failed: ${err.message}`, 'danger');
    }
  },

  calculatePlanIngredients(plan) {
    const items = [];
    let counter = 1;

    for (const meal of (plan.meals || [])) {
      const recipe = (this.state.recipes || []).find(r => r.id === meal.recipeId);
      if (!recipe) continue;

      const mult = meal.multiplier || 1;
      const ingList = (recipe.ingredients || []).map(ing => Utils.scaleIngredient ? Utils.scaleIngredient(ing, mult) : ing);

      for (const ingStr of ingList) {
        items.push({
          id: `plan_ing_${counter++}`,
          ingredient: ingStr,
          quantity: '',
          fromRecipe: recipe.title,
          checked: false
        });
      }
    }

    return items;
  },

  toggleSyncIngredientCheck(id) {
    const row = document.querySelector(`input[onchange*="${id}"]`)?.closest('tr');
    if (row) {
      row.classList.toggle('matrix-row-checked');
    }
  },

  async checkAllPantryMatches() {
    document.querySelectorAll('.matrix-pane-right .matrix-status-badge.in-stock').forEach(badge => {
      const row = badge.closest('tr');
      if (row) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = true;
        row.classList.add('matrix-row-checked');
      }
    });
    Toast.show('Checked all items verified in your pantry!', 'success');
  },

  // =========================================================================
  // SHEET 2: MASTER RECIPE SPREADSHEET
  // =========================================================================
  renderRecipesSheet(container) {
    let list = [...(this.state.recipes || [])];

    if (this.state.filterText) {
      list = list.filter(r =>
        (r.title || '').toLowerCase().includes(this.state.filterText) ||
        (r.tags || []).some(t => t.toLowerCase().includes(this.state.filterText)) ||
        (r.source || '').toLowerCase().includes(this.state.filterText)
      );
    }

    // Sort
    const col = this.state.sort.col;
    const asc = this.state.sort.asc;
    list.sort((a, b) => {
      let va = a[col] || '';
      let vb = b[col] || '';
      if (col === 'totalTime') {
        va = a.totalTime || (a.prepTime || 0) + (a.cookTime || 0) || 0;
        vb = b.totalTime || (b.prepTime || 0) + (b.cookTime || 0) || 0;
      }
      if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return asc ? va - vb : vb - va;
    });

    container.innerHTML = `
      <div class="matrix-full-sheet-card">
        <div class="matrix-sheet-header-row">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: #f8fafc;">📖 Recipe Master Database</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${list.length} Total Recipes</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm" onclick="RecipesView.openCreateModal()">➕ Add Recipe</button>
            <button class="btn btn-outline btn-sm" onclick="RecipesView.openImportModal()">📥 Import</button>
          </div>
        </div>

        <div class="matrix-table-scroll-container">
          <table class="matrix-table matrix-table-dense matrix-sheet-full-table">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">Fav</th>
                <th class="matrix-sortable-th" onclick="MatrixView.toggleSort('title')">Recipe Title ↕</th>
                <th class="matrix-sortable-th" style="width: 70px; text-align: right;" onclick="MatrixView.toggleSort('prepTime')">Prep ↕</th>
                <th class="matrix-sortable-th" style="width: 70px; text-align: right;" onclick="MatrixView.toggleSort('cookTime')">Cook ↕</th>
                <th class="matrix-sortable-th" style="width: 70px; text-align: right;" onclick="MatrixView.toggleSort('totalTime')">Total ↕</th>
                <th class="matrix-sortable-th" style="width: 75px; text-align: right;" onclick="MatrixView.toggleSort('servings')">Servings ↕</th>
                <th>Tags</th>
                <th style="width: 85px; text-align: right;">Ingredients</th>
                <th>Source URL</th>
                <th style="width: 85px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(r => `
                <tr ondblclick="RecipeCard.openModal('${r.id}')" title="Double click to open recipe details">
                  <td style="text-align: center; cursor: pointer;" onclick="RecipesView.toggleFavorite('${r.id}')">
                    ${r.favorite ? '⭐' : '☆'}
                  </td>
                  <td style="font-weight: 600; color: #f8fafc;">
                    <a href="javascript:void(0)" onclick="RecipeCard.openModal('${r.id}')" style="color: inherit; text-decoration: none;">
                      ${r.title}
                    </a>
                  </td>
                  <td style="text-align: right; font-family: monospace;">${r.prepTime || 0}m</td>
                  <td style="text-align: right; font-family: monospace;">${r.cookTime || 0}m</td>
                  <td style="text-align: right; font-family: monospace; color: var(--accent-cyan); font-weight: 700;">
                    ${r.totalTime || (r.prepTime || 0) + (r.cookTime || 0) || 0}m
                  </td>
                  <td style="text-align: right; font-family: monospace;">${r.servings || 4}</td>
                  <td>
                    <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                      ${(r.tags || []).slice(0, 3).map(t => `<span class="matrix-mini-tag">${t}</span>`).join('')}
                    </div>
                  </td>
                  <td style="text-align: right; font-family: monospace;">${(r.ingredients || []).length} items</td>
                  <td class="matrix-cell-truncate" style="max-width: 140px;">
                    ${r.source ? `<a href="${r.source}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">${r.source.replace(/^https?:\/\//, '')}</a>` : '—'}
                  </td>
                  <td style="text-align: center;">
                    <div style="display: flex; gap: 0.25rem; justify-content: center;">
                      <button class="matrix-btn-cell" onclick="RecipesView.openEditModal('${r.id}')" title="Edit">✏️</button>
                      <button class="matrix-btn-cell" onclick="PlanView.openDayModal([], 'Dinner', null, 1, '${r.id}')" title="Plan">📅</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  toggleSort(col) {
    if (this.state.sort.col === col) {
      this.state.sort.asc = !this.state.sort.asc;
    } else {
      this.state.sort.col = col;
      this.state.sort.asc = true;
    }
    this.renderCurrentSheet();
  },

  // =========================================================================
  // SHEET 3: MASTER PANTRY SPREADSHEET
  // =========================================================================
  renderPantrySheet(container) {
    let list = [...(this.state.pantryItems || [])];

    if (this.state.filterText) {
      list = list.filter(i =>
        (i.name || '').toLowerCase().includes(this.state.filterText) ||
        (i.category || '').toLowerCase().includes(this.state.filterText) ||
        (i.quantity || '').toLowerCase().includes(this.state.filterText)
      );
    }

    container.innerHTML = `
      <div class="matrix-full-sheet-card">
        <div class="matrix-sheet-header-row">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: #f8fafc;">🥫 Kitchen Pantry Inventory Sheet</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${list.length} On-Hand Records</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm" onclick="PantryView.triggerPhotoScan()">📷 AI Photo Scan</button>
          </div>
        </div>

        <div class="matrix-table-scroll-container">
          <table class="matrix-table matrix-table-dense matrix-sheet-full-table">
            <thead>
              <tr>
                <th style="width: 130px;">Category</th>
                <th>Item Name (Click to Edit)</th>
                <th style="width: 180px;">Quantity / Stock (Click to Edit)</th>
                <th style="width: 140px;">Added Timestamp</th>
                <th style="width: 60px; text-align: center;">Delete</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(i => `
                <tr>
                  <td>
                    <span class="matrix-category-badge">${i.category || 'Pantry'}</span>
                  </td>
                  <td style="font-weight: 600; color: #f8fafc; cursor: pointer;" onclick="MatrixView.editPantryField('${i.id}', 'name', '${i.name.replace(/'/g, "\\'")}')" title="Click to edit item name">
                    ${i.name} ✏️
                  </td>
                  <td style="color: var(--accent-cyan); font-family: monospace; cursor: pointer;" onclick="MatrixView.editPantryField('${i.id}', 'quantity', '${(i.quantity || '').replace(/'/g, "\\'")}')" title="Click to edit quantity">
                    ${i.quantity || '+ add quantity'} ✏️
                  </td>
                  <td style="color: var(--text-muted); font-size: 0.775rem;">
                    ${i.addedAt ? new Date(i.addedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style="text-align: center;">
                    <button class="matrix-btn-danger-cell" onclick="MatrixView.deletePantryItem('${i.id}', '${i.name.replace(/'/g, "\\'")}')" title="Delete">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async editPantryField(id, field, currentVal) {
    const newVal = prompt(`Edit ${field}:`, currentVal);
    if (newVal === null) return;

    try {
      const updateData = {};
      updateData[field] = newVal.trim();
      const res = await api.pantry.update(id, updateData);
      this.state.pantryItems = res.items || [];
      this.renderCurrentSheet();
      Toast.show('Pantry record updated', 'success');
    } catch (e) {
      Toast.show(`Update failed: ${e.message}`, 'danger');
    }
  },

  async deletePantryItem(id, name) {
    try {
      const res = await api.pantry.remove(id);
      this.state.pantryItems = res.items || [];
      this.renderCurrentSheet();
      Toast.show(`Deleted "${name}"`, 'info');
    } catch (e) {
      Toast.show(`Delete failed: ${e.message}`, 'danger');
    }
  },

  // =========================================================================
  // SHEET 4: MASTER GROCERY SPREADSHEET
  // =========================================================================
  renderGrocerySheet(container) {
    let allItems = [];
    (this.state.groceryList?.categories || []).forEach(cat => {
      (cat.items || []).forEach(item => {
        allItems.push({ ...item, category: cat.name });
      });
    });

    if (this.state.filterText) {
      allItems = allItems.filter(i =>
        (i.ingredient || '').toLowerCase().includes(this.state.filterText) ||
        (i.category || '').toLowerCase().includes(this.state.filterText) ||
        (i.quantity || '').toLowerCase().includes(this.state.filterText)
      );
    }

    container.innerHTML = `
      <div class="matrix-full-sheet-card">
        <div class="matrix-sheet-header-row">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: #f8fafc;">🛒 Grocery Master Checklist Sheet</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${allItems.length} Items</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline btn-sm" onclick="GroceryView.clearCheckedItems()">🧹 Clear Completed</button>
            <button class="btn btn-sm" onclick="GroceryView.regenerate()">🔄 Rebuild from Plan</button>
          </div>
        </div>

        <div class="matrix-table-scroll-container">
          <table class="matrix-table matrix-table-dense matrix-sheet-full-table">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">[✓]</th>
                <th style="width: 140px;">Category</th>
                <th>Ingredient Item</th>
                <th style="width: 120px;">Quantity</th>
                <th>Recipe Origin</th>
                <th style="width: 60px; text-align: center;">Delete</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.map(i => `
                <tr class="${i.checked ? 'matrix-row-checked' : ''}">
                  <td style="text-align: center;">
                    <input type="checkbox" ${i.checked ? 'checked' : ''} onchange="MatrixView.toggleMasterGroceryCheck('${i.id}')" style="accent-color: var(--primary); cursor: pointer;">
                  </td>
                  <td>
                    <span class="matrix-category-badge">${i.category}</span>
                  </td>
                  <td style="font-weight: 500; color: #f8fafc;">
                    ${i.ingredient}
                  </td>
                  <td style="font-family: monospace; color: var(--accent-cyan);">
                    ${i.quantity || '—'}
                  </td>
                  <td style="font-size: 0.8rem; color: var(--text-muted);">
                    ${(i.fromRecipes || []).join(', ') || (i.isCustom ? 'Custom' : '—')}
                  </td>
                  <td style="text-align: center;">
                    <button class="matrix-btn-danger-cell" onclick="MatrixView.deleteMasterGroceryItem('${i.id}')" title="Delete">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async toggleMasterGroceryCheck(id) {
    for (const cat of (this.state.groceryList?.categories || [])) {
      const item = (cat.items || []).find(i => i.id === id);
      if (item) {
        item.checked = !item.checked;
        break;
      }
    }
    this.renderCurrentSheet();
    await api.grocery.save(this.state.groceryList).catch(() => {});
  },

  async deleteMasterGroceryItem(id) {
    for (const cat of (this.state.groceryList?.categories || [])) {
      const idx = (cat.items || []).findIndex(i => i.id === id);
      if (idx !== -1) {
        cat.items.splice(idx, 1);
        break;
      }
    }
    this.renderCurrentSheet();
    await api.grocery.save(this.state.groceryList).catch(() => {});
  },

  // =========================================================================
  // EXPORT TOOLS (CSV & TSV)
  // =========================================================================
  getActiveTableData() {
    let headers = [];
    let rows = [];
    const sheet = this.state.activeSheet;

    if (sheet === 'schedule') {
      headers = ['Day', 'Date', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];
      const plan = this.state.currentPlan;
      if (plan) {
        const days = Utils.getPlanDays ? Utils.getPlanDays(plan) : [];
        rows = days.map(d => {
          const meals = (plan.meals || []).filter(m => Utils.isMealOnDay(m, d));
          const getM = (type) => meals.filter(m => (m.mealType || 'Dinner').toLowerCase() === type.toLowerCase()).map(m => `${m.recipeId} (${m.multiplier || 1}x)`).join('; ');
          return [d.dayName, d.dateStr, getM('Breakfast'), getM('Lunch'), getM('Dinner'), getM('Snack')];
        });
      }
    } else if (sheet === 'recipes') {
      headers = ['Title', 'Prep Time (m)', 'Cook Time (m)', 'Total Time (m)', 'Servings', 'Tags', 'Ingredients Count', 'Source URL'];
      rows = (this.state.recipes || []).map(r => [
        r.title,
        r.prepTime || 0,
        r.cookTime || 0,
        r.totalTime || (r.prepTime || 0) + (r.cookTime || 0) || 0,
        r.servings || 4,
        (r.tags || []).join('; '),
        (r.ingredients || []).length,
        r.source || ''
      ]);
    } else if (sheet === 'pantry') {
      headers = ['Category', 'Item Name', 'Quantity', 'Added Date'];
      rows = (this.state.pantryItems || []).map(i => [
        i.category || 'Pantry',
        i.name,
        i.quantity || '',
        i.addedAt || ''
      ]);
    } else if (sheet === 'grocery') {
      headers = ['Category', 'Ingredient', 'Quantity', 'For Recipes', 'Checked'];
      (this.state.groceryList?.categories || []).forEach(cat => {
        (cat.items || []).forEach(i => {
          rows.push([
            cat.name,
            i.ingredient,
            i.quantity || '',
            (i.fromRecipes || []).join('; '),
            i.checked ? 'YES' : 'NO'
          ]);
        });
      });
    }

    return { headers, rows, filename: `recipe_helper_${sheet}` };
  },

  async copyActiveSheetTsv() {
    const { headers, rows, filename } = this.getActiveTableData();
    const ok = await Utils.copyTableAsTsv(headers, rows);
    if (ok) {
      Toast.show(`Copied ${filename} TSV to clipboard! Ready to paste into Excel/Sheets. 📋`, 'success');
    } else {
      Toast.show('Clipboard copy failed.', 'danger');
    }
  },

  exportActiveSheetCsv() {
    const { headers, rows, filename } = this.getActiveTableData();
    Utils.exportToCsv(filename, headers, rows);
    Toast.show(`Exported ${filename}.csv 📥`, 'success');
  }
};

window.MatrixView = MatrixView;
