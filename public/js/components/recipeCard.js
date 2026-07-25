const RecipeCard = {
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
    if (recipe.pdfPath) {
      extLinkHtml = `<a href="${recipe.pdfPath}" target="_blank" onclick="event.stopPropagation()" style="color: var(--accent-cyan); text-decoration: none; font-size: 0.85rem; padding: 0.25rem 0.45rem; border-radius: 0.4rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);" title="Open PDF">📄 ↗</a>`;
    } else if (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) {
      extLinkHtml = `<a href="${recipe.source}" target="_blank" onclick="event.stopPropagation()" style="color: var(--accent-cyan); text-decoration: none; font-size: 0.85rem; padding: 0.25rem 0.45rem; border-radius: 0.4rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);" title="Open Web Recipe">🌐 ↗</a>`;
    } else if (recipe.source === 'web' || isSuggestion) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(recipe.title + ' recipe')}`;
      extLinkHtml = `<a href="${searchUrl}" target="_blank" onclick="event.stopPropagation()" style="color: var(--accent-cyan); text-decoration: none; font-size: 0.85rem; padding: 0.25rem 0.45rem; border-radius: 0.4rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);" title="Search Recipe on Web">🌐 ↗</a>`;
    }

    const neverBtnHtml = isSuggestion ? `
      <button onclick="PlanView.decide('${recipe.id}', 'never')" title="Never recommend this recipe again" class="btn-never-tertiary">
        ✕ Don't show
      </button>
    ` : '';

    return `
      <div class="recipe-card" data-id="${recipe.id}">
        
        <!-- Row 1: Title & External Links -->
        <div class="card-title-row" onclick="RecipeCard.openModal('${recipe.id}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; width: 100%;">
          <h3 style="font-size: 1.15rem; font-weight: 600; margin-bottom: 0; color: #f8fafc; flex: 1; text-align: left; line-height: 1.3;">${recipe.title}</h3>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            ${extLinkHtml}
            ${neverBtnHtml}
          </div>
        </div>
        
        <!-- Row 2: Meta Pills (Primary Metadata Only) -->
        <div class="card-meta-row" onclick="RecipeCard.openModal('${recipe.id}')" style="cursor: pointer; display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; margin-bottom: 0.85rem; align-items: center; width: 100%;">
          <span style="background: rgba(255, 255, 255, 0.05); padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-secondary); white-space: nowrap;">⏱️ ${recipe.totalTime || (recipe.prepTime + recipe.cookTime) || 20}m</span>
          <span style="background: rgba(255, 255, 255, 0.05); padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-secondary); white-space: nowrap;">🍽️ ${recipe.servings || 4} servings</span>
          ${tagsHtml}
        </div>
        
        <!-- Row 3: Actions -->
        <div class="card-actions-wrapper" style="margin-top: auto; width: 100%;">
          ${actionsHtml}
        </div>
      </div>
    `;
  },
  
  async openModal(id) {
    try {
      let recipe = null;
      
      // 1. Check in-memory AI suggestions first
      if (window.PlanView && PlanView.state && PlanView.state.suggestions) {
        recipe = PlanView.state.suggestions.find(s => s.id === id);
      }

      // 2. Fetch from saved library cache
      if (!recipe) {
        try {
          recipe = await api.recipes.get(id);
        } catch(e) {}
      }

      if (!recipe) {
        Toast.show('Recipe details not found.', 'danger');
        return;
      }

      const modal = document.getElementById('recipe-modal');
      const content = document.getElementById('recipe-modal-content');

      const tags = (recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
      
      let sourceLinkHtml = '';
      if (recipe.pdfPath) {
        sourceLinkHtml = `<a href="${recipe.pdfPath}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;">📄 Open Original PDF</a>`;
      } else if (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) {
        let domain = 'Original Source';
        try {
          domain = new URL(recipe.source).hostname.replace('www.', '');
        } catch(e) {}
        sourceLinkHtml = `<a href="${recipe.source}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem; color: var(--accent-cyan); border-color: var(--accent-cyan);">🌐 View Recipe on ${domain} ↗</a>`;
      } else if (recipe.title) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(recipe.title + ' recipe')}`;
        sourceLinkHtml = `<a href="${searchUrl}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem; color: var(--accent-cyan); border-color: var(--accent-cyan);">🌐 Search Recipe on Web ↗</a>`;
      }

      content.innerHTML = `
        <!-- Top Back Navigation Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
          <button class="btn btn-outline" style="padding: 0.45rem 0.9rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.35rem;" onclick="RecipeCard.closeModal()">
            ← Back
          </button>
          <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-muted);">Recipe Details</span>
          <button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 1rem; line-height: 1; border-radius: 0.5rem; color: var(--text-muted);" onclick="RecipeCard.closeModal()" title="Close">✕</button>
        </div>

        <h2 style="margin-top: 0; margin-bottom: 0.75rem; font-size: 1.5rem; color: #f8fafc; line-height: 1.3;">${recipe.title}</h2>

        <div class="recipe-meta" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span style="background: rgba(255,255,255,0.05); padding: 0.3rem 0.65rem; border-radius: 0.5rem; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.08);">⏱️ Prep: ${recipe.prepTime || 0}m</span>
          <span style="background: rgba(255,255,255,0.05); padding: 0.3rem 0.65rem; border-radius: 0.5rem; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.08);">🔥 Cook: ${recipe.cookTime || 0}m</span>
          <span style="background: rgba(255,255,255,0.05); padding: 0.3rem 0.65rem; border-radius: 0.5rem; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.08);">🍽️ ${recipe.servings || 4} servings</span>
        </div>
        <div class="tags" style="margin-bottom: 1.25rem;">${tags}</div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
          <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="RecipeCard.openStandalone('${recipe.id}')">↗️ Open in New Window</button>
          ${sourceLinkHtml}
        </div>

        <h3 style="font-size: 1.15rem; margin-bottom: 0.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; color: var(--accent-cyan);">Ingredients</h3>
        <ul style="margin-bottom: 1.75rem; padding-left: 1.25rem; line-height: 1.6;">
          ${(recipe.ingredients || []).map(i => `<li style="margin-bottom: 0.4rem; font-size: 0.95rem;">${i}</li>`).join('')}
        </ul>

        <h3 style="font-size: 1.15rem; margin-bottom: 0.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; color: var(--accent-cyan);">Instructions</h3>
        <ol style="margin-bottom: 1.75rem; padding-left: 1.25rem; line-height: 1.65;">
          ${(recipe.instructions || []).map(i => `<li style="margin-bottom: 0.6rem; font-size: 0.95rem;">${i}</li>`).join('')}
        </ol>

        ${recipe.notes ? `
          <h3 style="font-size: 1.15rem; margin-bottom: 0.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; color: var(--accent-cyan);">Notes</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">${recipe.notes}</p>
        ` : ''}

        <!-- Bottom Actions Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-outline" style="padding: 0.65rem 1.25rem; font-size: 0.9rem; flex: 1; text-align: center;" onclick="RecipeCard.closeModal()">
            ← Back to Previous Page
          </button>
          
          <button class="btn btn-outline" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4); font-size: 0.85rem; padding: 0.65rem 1rem;" onclick="RecipesView.deleteRecipe('${recipe.id}', '${recipe.title.replace(/'/g, "\\'")}')">
            🗑️ Delete Recipe
          </button>
        </div>
      `;

      modal.classList.add('open');
    } catch (e) {
      Toast.show('Failed to load recipe details.', 'danger');
    }
  },

  openStandalone(id) {
    window.open(`/api/recipes/${id}/view`, '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
  },

  closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) modal.classList.remove('open');
  }
};
