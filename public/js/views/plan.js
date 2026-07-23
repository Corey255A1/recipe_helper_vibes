const PlanView = {
  state: {
    suggestions: [],
    viewMode: 'grid',
    cachedRecipes: []
  },
  activeTab: 'suggestions',
  activeRecipeId: null,

  async render() {
    const isGrid = this.state.viewMode === 'grid';
    return `
      <div class="view" id="plan-view">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2>Current Week Plan</h2>
          <button class="btn btn-outline" onclick="PlanView.refresh()">Refresh</button>
        </div>
        
        <div id="plan-content" style="margin-bottom: 3rem;">
          ${Loader.render('Loading plan...')}
        </div>

        <div id="discover-section" style="border-top: 1px solid var(--border); padding-top: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
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
            <div style="margin-bottom: 1.5rem; display: flex; justify-content: flex-end;">
              <button class="btn" onclick="PlanView.suggest()">Suggest Meals</button>
            </div>
            <div id="discover-content">
              <p style="color: var(--text-muted);">Click "Suggest Meals" to get AI recommendations based on your preferences.</p>
            </div>
          </div>

          <div id="discover-cached-pane" class="tab-pane" style="display: none;">
            <div style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem;">
              <input type="text" id="cache-search" placeholder="Search saved recipes..." oninput="PlanView.searchCache(this.value)" style="margin-bottom: 0;">
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
              <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Paste any recipe link. The AI will extract the ingredients, steps, and details.</p>
              <div class="form-group" style="display: flex; gap: 0.5rem;">
                <input type="url" id="import-url" placeholder="https://example.com/recipe-url" required style="margin-bottom: 0;">
                <button type="submit" class="btn">Import</button>
              </div>
            </form>

            <form onsubmit="PlanView.importPdf(event)" style="background: var(--surface); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border);">
              <h4 style="margin-bottom: 0.5rem;">Import from PDF</h4>
              <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Upload a PDF recipe document. The PDF will be stored next to the parsed recipe for viewing.</p>
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
    const plan = await api.plan.current();
    if (plan && plan.pendingSuggestions && plan.pendingSuggestions.length > 0) {
      this.state.suggestions = plan.pendingSuggestions;
    }
    
    await this.refresh();
    await this.switchSubTab(this.activeTab);
  },

  async refresh() {
    const content = document.getElementById('plan-content');
    try {
      const plan = await api.plan.current();
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      const dailyMeals = {};
      daysOfWeek.forEach(d => dailyMeals[d] = []);
      
      if (plan.meals && plan.meals.length > 0) {
        plan.meals.forEach(meal => {
          if (meal.assignedDays && meal.assignedDays.length > 0) {
            meal.assignedDays.forEach(day => {
              if (dailyMeals[day]) {
                dailyMeals[day].push(meal);
              }
            });
          }
        });
      }

      let html = `<div style="background: var(--surface); padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border); margin-bottom: 2rem;">`;
      html += `<h3 style="font-size: 1.25rem;">Week of ${plan.weekOf}</h3>`;
      html += `</div>`;
      
      html += `<h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Weekly Calendar</h3>`;
      html += `<div class="calendar-grid">`;
      
      daysOfWeek.forEach(day => {
        const meals = dailyMeals[day];
        html += `
          <div class="calendar-day-card">
            <div>
              <div class="day-title">${day}</div>
              ${meals.length > 0 ? meals.map(m => `
                <div style="margin-bottom: 0.75rem;">
                  <a href="javascript:void(0)" onclick="PlanView.viewRecipe('${m.recipeId}')" class="day-recipe-name" style="text-decoration: underline; color: var(--primary); cursor: pointer; display: block; margin-bottom: 0.25rem;">
                    ${m.recipeId.replace(/-/g, ' ')}
                  </a>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">Servings: ${m.servings}</div>
                </div>
              `).join('') : '<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; margin-bottom: 0.5rem;">No meals planned</p>'}
            </div>
            
            ${meals.length > 0 ? `
              <div style="margin-top: auto;">
                ${meals.map(m => `
                  <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger); width: 100%; padding: 0.35rem 0.5rem; font-size: 0.75rem; margin-top: 0.25rem;" onclick="PlanView.removeMeal('${m.recipeId}')">Remove</button>
                `).join('')}
              </div>
            ` : `
              <div style="margin-top: auto;">
                <button class="btn btn-outline" style="width: 100%; padding: 0.35rem 0.5rem; font-size: 0.75rem;" onclick="document.getElementById('discover-section').scrollIntoView({behavior: 'smooth'})">+ Add Meal</button>
              </div>
            `}
          </div>
        `;
      });
      
      html += `</div>`;
      content.innerHTML = html;
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to load plan.</p>`;
    }
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
      this.renderCache(this.state.cachedRecipes);
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to load cached recipes.</p>`;
    }
  },

  searchCache(query) {
    if (!this.state.cachedRecipes) return;
    const filtered = this.state.cachedRecipes.filter(recipe => {
      const q = query.toLowerCase();
      const titleMatch = recipe.title.toLowerCase().includes(q);
      const tagMatch = (recipe.tags || []).some(t => t.toLowerCase().includes(q));
      return titleMatch || tagMatch;
    });
    this.renderCache(filtered);
  },

  setViewMode(mode) {
    this.state.viewMode = mode;
    const btnGrid = document.getElementById('view-mode-grid');
    const btnList = document.getElementById('view-mode-list');
    if (btnGrid && btnList) {
      if (mode === 'grid') {
        btnGrid.className = 'btn';
        btnList.className = 'btn btn-outline';
      } else {
        btnGrid.className = 'btn btn-outline';
        btnList.className = 'btn';
      }
    }
    
    if (this.activeTab === 'suggestions') {
      this.renderSuggestions();
    } else if (this.activeTab === 'cached' && this.state.cachedRecipes) {
      const searchVal = document.getElementById('cache-search')?.value || '';
      this.searchCache(searchVal);
    }
  },

  renderCache(recipes) {
    const content = document.getElementById('cache-content');
    if (!recipes || recipes.length === 0) {
      content.innerHTML = `<p style="color: var(--text-muted);">No saved recipes found.</p>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;

    recipes.forEach(recipe => {
      const actions = `
        <div class="actions">
          <button class="btn" style="background: var(--success); width: 100%;" onclick="PlanView.decide('${recipe.id}', 'yes')">➕ Add to Plan</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  async suggest() {
    const content = document.getElementById('discover-content');
    content.innerHTML = Loader.render('Generating customized meal suggestions...');
    
    try {
      this.state.suggestions = await api.plan.suggest();
      this.renderSuggestions();
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to generate suggestions. Please check if your context is set up.</p>`;
    }
  },

  renderSuggestions() {
    const content = document.getElementById('discover-content');
    if (!this.state.suggestions || !this.state.suggestions.length) {
      content.innerHTML = `<p style="color: var(--text-muted);">No suggestions available. Click "Suggest Meals" to get started.</p>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;
    
    this.state.suggestions.forEach(recipe => {
      const actions = `
        <div class="actions">
          <button class="btn" style="background: var(--success);" onclick="PlanView.decide('${recipe.id}', 'yes')">✅ Yes</button>
          <button class="btn btn-outline" onclick="PlanView.decide('${recipe.id}', 'not_this_time')">⏭️ Skip</button>
          <button class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="PlanView.decide('${recipe.id}', 'never')">🚫 Never</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  async decide(id, decision) {
    if (decision === 'yes') {
      this.activeRecipeId = id;
      this.openDayModal();
    } else {
      await this.submitDecision(id, decision, []);
    }
  },

  async openDayModal() {
    const modal = document.getElementById('day-modal');
    modal.classList.add('open');
    modal.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    try {
      const plan = await api.plan.current();
      const dailyMeals = {};
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      daysOfWeek.forEach(d => dailyMeals[d] = []);
      
      if (plan.meals) {
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

      modal.querySelectorAll('.day-chip').forEach(chip => {
        const cb = chip.querySelector('input');
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
  },

  async saveDaySelection() {
    const modal = document.getElementById('day-modal');
    const checked = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    
    if (checked.length === 0) {
      Toast.show('Please select at least one day.', 'warning');
      return;
    }

    const recipeId = this.activeRecipeId;
    this.closeDayModal();
    
    await this.submitDecision(recipeId, 'yes', checked);
  },

  async submitDecision(id, decision, assignedDays) {
    const isSuggestionsTab = this.activeTab === 'suggestions';
    const card = isSuggestionsTab ? document.querySelector(`.recipe-card[data-id="${id}"]`) : null;
    if (card) card.style.opacity = '0.5';
    
    try {
      await api.plan.decide([{ recipeId: id, decision, assignedDays }]);
      
      if (isSuggestionsTab) {
        if (card) card.remove();
        this.state.suggestions = this.state.suggestions.filter(s => s.id !== id);
        
        if (this.state.suggestions.length === 0) {
          Toast.show('All suggestions processed.');
          document.getElementById('discover-content').innerHTML = `<p>Ready to suggest more meals.</p>`;
        }
      } else {
        Toast.show('Recipe added to plan!', 'success');
      }
      
      await this.refresh();
    } catch (e) {
      if (card) card.style.opacity = '1';
    }
  },

  async removeMeal(recipeId) {
    try {
      await api.plan.removeMeal(recipeId);
      Toast.show('Meal removed from plan.', 'success');
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
      await this.refresh();
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
      await this.refresh();
    } catch (err) {
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
};
