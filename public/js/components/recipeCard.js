const RecipeCard = {
  activeTimer: null,
  timerInterval: null,
  wakeLock: null,
  currentRecipe: null,
  servingMultiplier: 1,
  checkedIngredients: new Set(),
  completedSteps: new Set(),

  render(recipe, actionsHtml = '', isSuggestion = false) {
    const rawTags = recipe.tags || [];
    let tagsHtml = '';
    if (rawTags.length > 0) {
      const visibleTags = rawTags.slice(0, 2);
      const remainingCount = rawTags.length - 2;
      tagsHtml = visibleTags.map(t => `<span class="tag">${t}</span>`).join('');
      if (remainingCount > 0) {
        const remainingList = rawTags.slice(2).join(', ');
        tagsHtml += `<span class="tag tag-more" title="${remainingList}">+${remainingCount} more</span>`;
      }
    }

    let extLinkHtml = '';
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent((recipe.title || 'recipe') + ' recipe')}`;

    if (recipe.pdfPath) {
      extLinkHtml = `<a href="${recipe.pdfPath}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="recipe-link-btn" title="Open PDF">📄 PDF ↗</a>`;
    } else if (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) {
      const isSearch = /google\.[a-z.]+\/search|bing\.com|duckduckgo/i.test(recipe.source);
      let domain = 'Web';
      try {
        domain = isSearch ? 'Search' : new URL(recipe.source).hostname.replace('www.', '');
      } catch (e) {}
      extLinkHtml = `<a href="${recipe.source}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="recipe-link-btn" title="Open recipe (${recipe.source})">${isSearch ? '🔍 Recipe ↗' : `🌐 ${domain} ↗`}</a>`;
    } else if (recipe.source === 'web' || isSuggestion) {
      extLinkHtml = `<a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="recipe-link-btn" title="Find recipe on Google">🔍 Recipe ↗</a>`;
    }

    const isFav = Boolean(recipe.favorite);
    const favBtnHtml = !isSuggestion ? `
      <button onclick="event.stopPropagation(); RecipesView.toggleFavorite('${recipe.id}')" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" class="btn-fav ${isFav ? 'active' : ''}">
        ${isFav ? '❤️' : '🤍'}
      </button>
    ` : '';

    const neverBtnHtml = isSuggestion ? `
      <button onclick="PlanView.decide('${recipe.id}', 'never')" title="Never recommend this recipe again" class="btn-never-tertiary">
        ✕ Don't show
      </button>
    ` : '';

    return `
      <div class="recipe-card" data-id="${recipe.id}" onclick="RecipeCard.openModal('${recipe.id}')" style="cursor: pointer;">
        <div class="card-left" style="flex: 1; min-width: 0;">
          <!-- Row 1: Title & Actions -->
          <div class="card-title-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; width: 100%;">
            <h3 style="font-size: 1.15rem; font-weight: 600; margin-bottom: 0; color: #f8fafc; flex: 1; text-align: left; line-height: 1.3;">${recipe.title}</h3>
            <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;" onclick="event.stopPropagation()">
              ${favBtnHtml}
              ${extLinkHtml}
              ${neverBtnHtml}
            </div>
          </div>
          
          <!-- Row 2: Meta Pills -->
          <div class="card-meta-row" style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; margin-bottom: 0.55rem; align-items: center; width: 100%;">
            <span style="background: rgba(255, 255, 255, 0.05); padding: 0.15rem 0.45rem; border-radius: 0.35rem; font-size: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-secondary); white-space: nowrap;">⏱️ ${recipe.totalTime || ((recipe.prepTime || 0) + (recipe.cookTime || 0)) || 20}m</span>
            <span style="background: rgba(255, 255, 255, 0.05); padding: 0.15rem 0.45rem; border-radius: 0.35rem; font-size: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-secondary); white-space: nowrap;">🍽️ ${recipe.servings || 4} servings</span>
            ${tagsHtml}
          </div>
        </div>
        
        <!-- Row 3: Actions -->
        <div class="card-actions-wrapper" style="margin-top: auto; width: 100%;" onclick="event.stopPropagation()">
          ${actionsHtml}
        </div>
      </div>
    `;
  },
  
  async openModal(id, initialMultiplier = 1) {
    try {
      let recipe = null;
      if (window.PlanView && PlanView.state && PlanView.state.suggestions) {
        recipe = PlanView.state.suggestions.find(s => s.id === id);
      }
      if (!recipe) {
        try {
          recipe = await api.recipes.get(id);
        } catch (e) {}
      }
      if (!recipe) {
        Toast.show('Recipe details not found.', 'danger');
        return;
      }

      this.currentRecipe = recipe;
      this.isStandalone = false;
      this.servingMultiplier = Number(initialMultiplier) || 1;
      this.checkedIngredients.clear();
      this.completedSteps.clear();

      this.renderContent();

      const modal = document.getElementById('recipe-modal');
      if (modal) modal.classList.add('open');
    } catch (e) {
      Toast.show('Failed to load recipe details.', 'danger');
    }
  },

  initStandalone(recipe) {
    this.isStandalone = true;
    this.currentRecipe = recipe;
    this.servingMultiplier = 1;
    this.checkedIngredients.clear();
    this.completedSteps.clear();
    this.renderContent();
  },

  renderModalContent() {
    this.renderContent();
  },

  renderContent() {
    const container = this.isStandalone
      ? document.getElementById('popout-recipe-container')
      : document.getElementById('recipe-modal-content');
    const recipe = this.currentRecipe;
    if (!container || !recipe) return;

    const baseServings = recipe.servings || 4;
    const scaledServings = Math.round(baseServings * this.servingMultiplier * 10) / 10;
    const isWakeLocked = Boolean(this.wakeLock);
    const hasWakeLock = this.isWakeLockSupported();
    const isFav = Boolean(recipe.favorite);

    const wakeLockBtnHtml = hasWakeLock ? `
      <button class="btn btn-sm ${isWakeLocked ? 'btn-wake-active' : 'btn-outline'}" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" onclick="RecipeCard.toggleWakeLock()" title="Keep screen awake while cooking">
        ${isWakeLocked ? '🔆 Awake: ON' : '💡 Screen Awake'}
      </button>
    ` : '';

    const tags = (recipe.tags || []).map(t => `<span class="tag" style="font-size: 0.75rem; padding: 0.15rem 0.5rem;">${t}</span>`).join('');
    
    let sourceLinkHtml = '';
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent((recipe.title || 'recipe') + ' recipe')}`;

    if (recipe.pdfPath) {
      sourceLinkHtml = `<a href="${recipe.pdfPath}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">📄 Open PDF</a>`;
    } else if (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) {
      const isSearch = /google\.[a-z.]+\/search|bing\.com|duckduckgo/i.test(recipe.source);
      let domain = isSearch ? 'Web Search' : 'Website';
      try {
        if (!isSearch) domain = new URL(recipe.source).hostname.replace('www.', '');
      } catch (e) {}
      sourceLinkHtml = `
        <a href="${recipe.source}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; color: var(--accent-cyan); border-color: var(--accent-cyan);">
          ${isSearch ? '🔍 Recipe on Web ↗' : `🌐 ${domain} ↗`}
        </a>
        ${!isSearch ? `<a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">🔍 Google ↗</a>` : ''}
      `;
    } else if (recipe.title) {
      sourceLinkHtml = `<a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; color: var(--accent-cyan); border-color: var(--accent-cyan);">🔍 Google Recipe ↗</a>`;
    }

    const scaledIngredients = (recipe.ingredients || []).map((ing, idx) => {
      const scaledText = Utils.scaleIngredient(ing, this.servingMultiplier);
      const isChecked = this.checkedIngredients.has(idx);
      return `
        <li class="cook-mode-item ${isChecked ? 'completed' : ''}" onclick="RecipeCard.toggleIngredient(${idx})">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); RecipeCard.toggleIngredient(${idx})">
          <span>${scaledText}</span>
        </li>
      `;
    }).join('');

    const formattedInstructions = (recipe.instructions || []).map((step, idx) => {
      const isCompleted = this.completedSteps.has(idx);
      const htmlStep = Utils.injectInstructionTimers(step, idx);
      return `
        <li class="cook-mode-step ${isCompleted ? 'completed' : ''}" onclick="RecipeCard.toggleStep(${idx})">
          <div class="step-num-badge">${idx + 1}</div>
          <div class="step-text">${htmlStep}</div>
        </li>
      `;
    }).join('');

    const closeHandler = this.isStandalone ? 'RecipeCard.closeStandalone()' : 'RecipeCard.closeModal()';

    container.innerHTML = `
      ${!this.isStandalone ? '<div class="modal-drag-pill"></div>' : ''}
      
      <!-- Top Navigation & Controls Bar (Optimized Margins) -->
      <div class="top-nav-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; padding-bottom: 0.45rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 0.4rem;">
        <button class="btn btn-outline btn-sm no-print" style="padding: 0.35rem 0.75rem; font-size: 0.825rem;" onclick="${closeHandler}">
          ← Back
        </button>

        <div style="display: flex; align-items: center; gap: 0.4rem;" class="no-print">
          ${wakeLockBtnHtml}
          <button class="btn btn-outline btn-sm" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" onclick="RecipeCard.toggleFavorite('${recipe.id}')" title="Favorite">
            ${isFav ? '❤️ Saved' : '🤍 Favorite'}
          </button>
          <button class="btn btn-outline btn-sm" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" onclick="window.print()" title="Print Recipe">
            🖨️ Print
          </button>
          <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.55rem; font-size: 0.9rem; line-height: 1;" onclick="${closeHandler}" title="Close">✕</button>
        </div>
      </div>

      <h2 style="margin-top: 0; margin-bottom: 0.35rem; font-size: 1.35rem; color: #f8fafc; line-height: 1.25;">${recipe.title}</h2>

      <div class="recipe-meta" style="margin-bottom: 0.45rem; display: flex; gap: 0.35rem; flex-wrap: wrap; font-size: 0.825rem;">
        <span>⏱️ Prep: ${recipe.prepTime || 0}m</span>
        <span>🔥 Cook: ${recipe.cookTime || 0}m</span>
        <span>⌛ Total: ${recipe.totalTime || ((recipe.prepTime || 0) + (recipe.cookTime || 0)) || 20}m</span>
        <span>🍽️ ${scaledServings} servings</span>
      </div>

      ${tags ? `<div class="tags" style="margin-bottom: 0.55rem;">${tags}</div>` : ''}

      <!-- Quick Action Toolbar (Optimized Margins) -->
      <div class="quick-actions-bar no-print" style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.65rem; align-items: center;">
        <button class="btn btn-sm" style="background: var(--success); padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="RecipeCard.quickAddToPlan('${recipe.id}')">➕ Add to Plan</button>
        <button class="btn btn-outline btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="RecipeCard.editCurrentRecipe()">✏️ Edit</button>
        ${!this.isStandalone ? `<button class="btn btn-outline btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="RecipeCard.openStandalone('${recipe.id}')">↗️ Popout</button>` : ''}
        ${sourceLinkHtml}
      </div>

      <!-- Cook Mode Controls & Serving Scaler -->
      <div class="cook-scaler-panel no-print">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
          <div>
            <span style="font-weight: 700; font-size: 0.8rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px;">Portion Scaler</span>
            <div style="font-size: 0.825rem; color: var(--text-secondary);">Currently: <strong>${scaledServings} servings</strong> (${this.servingMultiplier}x)</div>
          </div>
          <div class="serving-multiplier-buttons">
            <button class="btn btn-sm ${this.servingMultiplier === 0.5 ? '' : 'btn-outline'}" onclick="RecipeCard.setServingMultiplier(0.5)">½x</button>
            <button class="btn btn-sm ${this.servingMultiplier === 1 ? '' : 'btn-outline'}" onclick="RecipeCard.setServingMultiplier(1)">1x</button>
            <button class="btn btn-sm ${this.servingMultiplier === 1.5 ? '' : 'btn-outline'}" onclick="RecipeCard.setServingMultiplier(1.5)">1.5x</button>
            <button class="btn btn-sm ${this.servingMultiplier === 2 ? '' : 'btn-outline'}" onclick="RecipeCard.setServingMultiplier(2)">2x</button>
            <button class="btn btn-sm ${this.servingMultiplier === 3 ? '' : 'btn-outline'}" onclick="RecipeCard.setServingMultiplier(3)">3x</button>
            <button class="btn btn-sm ${this.servingMultiplier === 4 ? '' : 'btn-outline'}" onclick="RecipeCard.setServingMultiplier(4)">4x</button>
          </div>
        </div>
      </div>

      <!-- Ingredients Section with Interactive Checklist -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">
        <h3 style="font-size: 1.05rem; margin: 0; color: var(--accent-cyan);">Ingredients</h3>
        <span class="no-print" style="font-size: 0.725rem; color: var(--text-muted);">Tap item to strike off</span>
      </div>
      <ul class="cook-mode-list" style="margin-bottom: 0.75rem; list-style: none; padding-left: 0;">
        ${scaledIngredients}
      </ul>

      <!-- Instructions Section with Inline Timers -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">
        <h3 style="font-size: 1.05rem; margin: 0; color: var(--accent-cyan);">Instructions</h3>
        <span class="no-print" style="font-size: 0.725rem; color: var(--text-muted);">Tap step to mark complete</span>
      </div>
      <ol class="cook-mode-steps" style="margin-bottom: 0.75rem; list-style: none; padding-left: 0;">
        ${formattedInstructions}
      </ol>

      ${recipe.notes ? `
        <div style="margin-top: 0.85rem; margin-bottom: 0.65rem;">
          <h3 style="font-size: 1.05rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; color: var(--accent-cyan);">Notes & Tips</h3>
          <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; margin: 0;">${recipe.notes}</p>
        </div>
      ` : ''}

      <!-- Bottom Actions Footer (Optimized Margins) -->
      <div class="bottom-actions-bar no-print" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.65rem; border-top: 1px solid var(--border); gap: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-outline" style="padding: 0.45rem 1rem; font-size: 0.85rem;" onclick="${closeHandler}">
          ← Done / Close
        </button>

        <button class="btn btn-outline" style="padding: 0.45rem 1rem; font-size: 0.85rem;" onclick="window.print()">
          🖨️ Print
        </button>
        
        <button class="btn btn-outline" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4); font-size: 0.825rem; padding: 0.45rem 0.85rem;" onclick="RecipeCard.confirmDeleteCurrent()">
          🗑️ Delete Recipe
        </button>
      </div>
    `;
  },

  confirmDeleteCurrent() {
    if (!this.currentRecipe) return;
    if (this.isStandalone) {
      if (confirm(`Are you sure you want to delete "${this.currentRecipe.title}"? This cannot be undone.`)) {
        fetch(`/api/recipes/${this.currentRecipe.id}`, { method: 'DELETE' })
          .then(res => {
            if (res.ok) {
              Toast.show('Recipe deleted.', 'success');
              setTimeout(() => {
                if (window.opener) {
                  try { window.opener.location.reload(); } catch (e) {}
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }, 400);
            } else {
              Toast.show('Failed to delete recipe.', 'danger');
            }
          })
          .catch(err => Toast.show('Error: ' + err.message, 'danger'));
      }
      return;
    }
    if (window.RecipesView && RecipesView.deleteRecipe) {
      RecipesView.deleteRecipe(this.currentRecipe.id, this.currentRecipe.title);
    }
  },

  async toggleFavorite(id) {
    if (this.isStandalone) {
      const newFavState = !(this.currentRecipe && this.currentRecipe.favorite);
      try {
        const res = await fetch(`/api/recipes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorite: newFavState })
        });
        if (res.ok) {
          if (this.currentRecipe) this.currentRecipe.favorite = newFavState;
          this.renderContent();
          Toast.show(newFavState ? 'Added to favorites ❤️' : 'Removed from favorites', 'info');
          if (window.opener && window.opener.RecipesView) {
            try { window.opener.RecipesView.load(); } catch (e) {}
          }
        } else {
          Toast.show('Failed to update favorite', 'danger');
        }
      } catch (e) {
        Toast.show('Could not update favorite: ' + e.message, 'danger');
      }
      return;
    }
    if (window.RecipesView && RecipesView.toggleFavorite) {
      RecipesView.toggleFavorite(id);
    }
  },

  closeStandalone() {
    if (window.opener) {
      window.close();
    } else if (history.length > 1) {
      history.back();
    } else {
      window.location.href = '/';
    }
  },

  setServingMultiplier(m) {
    this.servingMultiplier = m;
    this.renderContent();
  },

  toggleIngredient(idx) {
    if (this.checkedIngredients.has(idx)) {
      this.checkedIngredients.delete(idx);
    } else {
      this.checkedIngredients.add(idx);
    }
    this.renderModalContent();
  },

  toggleStep(idx) {
    if (this.completedSteps.has(idx)) {
      this.completedSteps.delete(idx);
    } else {
      this.completedSteps.add(idx);
    }
    this.renderModalContent();
  },

  isWakeLockSupported() {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  },

  async toggleWakeLock() {
    if (this.isWakeLockSupported()) {
      if (this.wakeLock) {
        await this.wakeLock.release().catch(() => {});
        this.wakeLock = null;
        Toast.show('Screen wake lock released.', 'info');
      } else {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
            if (this.currentRecipe) this.renderModalContent();
          });
          Toast.show('Screen will stay awake while cooking! 🔆', 'success');
        } catch (err) {
          Toast.show('Could not keep screen awake: ' + err.message, 'warning');
        }
      }
      this.renderModalContent();
    } else {
      Toast.show('Screen Wake Lock is not supported on this browser.', 'warning');
    }
  },

  startTimer(seconds, label = 'Cooking Timer') {
    clearInterval(this.timerInterval);
    this.activeTimer = {
      label,
      totalSeconds: seconds,
      remaining: seconds,
      paused: false
    };

    const bar = document.getElementById('cook-timer-bar');
    const labelEl = document.getElementById('cook-timer-label');
    if (bar && labelEl) {
      labelEl.innerText = label;
      bar.style.display = 'flex';
    }

    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      if (!this.activeTimer || this.activeTimer.paused) return;
      this.activeTimer.remaining--;
      this.updateTimerDisplay();
      if (this.activeTimer.remaining <= 0) {
        clearInterval(this.timerInterval);
        this.onTimerFinished();
      }
    }, 1000);

    Toast.show(`Started timer: ${label}`, 'info');
  },

  updateTimerDisplay() {
    const displayEl = document.getElementById('cook-timer-display');
    if (!displayEl || !this.activeTimer) return;
    const r = Math.max(0, this.activeTimer.remaining);
    const m = Math.floor(r / 60);
    const s = r % 60;
    displayEl.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  togglePauseTimer() {
    if (!this.activeTimer) return;
    this.activeTimer.paused = !this.activeTimer.paused;
    const btn = document.getElementById('cook-timer-pause-btn');
    if (btn) btn.innerText = this.activeTimer.paused ? 'Resume' : 'Pause';
  },

  addTimerMinute() {
    if (!this.activeTimer) return;
    this.activeTimer.remaining += 60;
    this.updateTimerDisplay();
    Toast.show('+1 Minute added to timer', 'info');
  },

  stopTimer() {
    clearInterval(this.timerInterval);
    this.activeTimer = null;
    const bar = document.getElementById('cook-timer-bar');
    if (bar) bar.style.display = 'none';
  },

  onTimerFinished() {
    const label = this.activeTimer ? this.activeTimer.label : 'Cooking Timer';
    this.stopTimer();

    // Play audible notification chime via Web Audio API
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {}

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 500]);
    }

    Toast.show(`⏰ TIMER FINISHED: ${label}!`, 'success');
  },

  quickAddToPlan(id) {
    const mult = this.servingMultiplier || 1;
    if (this.isStandalone) {
      if (window.opener && window.opener.PlanView) {
        window.opener.PlanView.activeRecipeId = id;
        window.opener.PlanView.openDayModal([], 'Dinner', window.opener.PlanView.getActiveWeekOf(), mult);
        window.opener.focus();
        Toast.show('Opened Day Selector in main window! 📅', 'success');
      } else {
        window.location.href = `/#plan`;
      }
      return;
    }
    this.closeModal();
    if (window.PlanView) {
      PlanView.activeRecipeId = id;
      PlanView.openDayModal([], 'Dinner', PlanView.getActiveWeekOf(), mult);
    }
  },

  editCurrentRecipe() {
    const recipe = this.currentRecipe;
    if (this.isStandalone) {
      if (window.opener && window.opener.RecipesView) {
        window.opener.RecipesView.openEditModal(recipe);
        window.opener.focus();
        Toast.show('Opened recipe editor in main window! ✏️', 'info');
      } else {
        window.location.href = `/#recipes`;
      }
      return;
    }
    this.closeModal();
    if (window.RecipesView) {
      RecipesView.openEditModal(recipe);
    }
  },

  openStandalone(id) {
    window.open(`/api/recipes/${id}/view`, '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
  },

  closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) modal.classList.remove('open');
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }
};

window.RecipeCard = RecipeCard;
