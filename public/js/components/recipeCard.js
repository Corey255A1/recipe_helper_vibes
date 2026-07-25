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

    let sourceBadgeHtml = '';
    if (recipe.pdfPath) {
      sourceBadgeHtml = `<span class="source-badge pdf"><a href="${recipe.pdfPath}" target="_blank" style="color: inherit; text-decoration: none;">📄 PDF</a></span>`;
    } else if (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) {
      sourceBadgeHtml = `<span class="source-badge web"><a href="${recipe.source}" target="_blank" style="color: inherit; text-decoration: none;">🌐 Web Recipe</a></span>`;
    } else {
      sourceBadgeHtml = `<span class="source-badge saved">💾 Saved</span>`;
    }

    const neverBtnHtml = isSuggestion ? `
      <button onclick="PlanView.decide('${recipe.id}', 'never')" title="Never recommend this recipe again" class="btn-never-tertiary">
        ✕ Don't show
      </button>
    ` : '';

    return `
      <div class="recipe-card" data-id="${recipe.id}">
        
        <!-- Row 1: Title -->
        <div class="card-title-row" onclick="RecipeCard.openModal('${recipe.id}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; width: 100%;">
          <h3 style="font-size: 1.15rem; font-weight: 600; margin-bottom: 0; color: #f8fafc; flex: 1; text-align: left; line-height: 1.3;">${recipe.title}</h3>
          ${neverBtnHtml}
        </div>
        
        <!-- Row 2: Meta Pills -->
        <div class="card-meta-row" onclick="RecipeCard.openModal('${recipe.id}')" style="cursor: pointer; display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; margin-bottom: 0.85rem; align-items: center; width: 100%;">
          ${sourceBadgeHtml}
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
      const recipe = await api.recipes.get(id);
      const modal = document.getElementById('recipe-modal');
      const content = document.getElementById('recipe-modal-content');

      const tags = (recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
      
      let sourceLinkHtml = '';
      if (recipe.pdfPath) {
        sourceLinkHtml = `<a href="${recipe.pdfPath}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;">📄 Open Original PDF</a>`;
      } else if (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) {
        sourceLinkHtml = `<a href="${recipe.source}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;">🌐 View Original Source</a>`;
      }

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;">
          <h2 style="margin: 0; font-size: 1.4rem;">${recipe.title}</h2>
          <button class="btn btn-outline" style="padding: 0.35rem 0.65rem; font-size: 1.1rem; line-height: 1; border-radius: 0.5rem; color: var(--text-muted);" onclick="RecipeCard.closeModal()" title="Close">✕</button>
        </div>
        <div class="recipe-meta" style="margin-bottom: 1rem;">
          <span>⏱️ Prep: ${recipe.prepTime || 0}m</span>
          <span>🔥 Cook: ${recipe.cookTime || 0}m</span>
          <span>🍽️ ${recipe.servings || 4} servings</span>
        </div>
        <div class="tags" style="margin-bottom: 1.25rem;">${tags}</div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
          <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="RecipeCard.openStandalone('${recipe.id}')">↗️ Open in New Window</button>
          ${sourceLinkHtml}
        </div>

        <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">Ingredients</h3>
        <ul style="margin-bottom: 1.5rem; padding-left: 1.25rem;">
          ${(recipe.ingredients || []).map(i => `<li style="margin-bottom: 0.25rem;">${i}</li>`).join('')}
        </ul>

        <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">Instructions</h3>
        <ol style="margin-bottom: 1.5rem; padding-left: 1.25rem;">
          ${(recipe.instructions || []).map(i => `<li style="margin-bottom: 0.5rem;">${i}</li>`).join('')}
        </ol>

        ${recipe.notes ? `
          <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">Notes</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">${recipe.notes}</p>
        ` : ''}

        <!-- Bottom Actions Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border);">
          <button class="btn btn-outline" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4); font-size: 0.85rem;" onclick="RecipesView.deleteRecipe('${recipe.id}', '${recipe.title.replace(/'/g, "\\'")}')">🗑️ Delete Recipe</button>
          <button class="btn btn-outline" style="font-size: 0.85rem;" onclick="RecipeCard.closeModal()">Close</button>
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
