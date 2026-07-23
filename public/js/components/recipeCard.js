const RecipeCard = {
  render(recipe, actionsHtml = '') {
    const tags = (recipe.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    
    return `
      <div class="recipe-card" data-id="${recipe.id}">
        <div class="card-main-info">
          <h3>${recipe.title}</h3>
          <div class="recipe-meta">
            <span>⏱️ ${recipe.totalTime}m</span>
            <span>🍽️ ${recipe.servings} servings</span>
            ${recipe.pdfPath 
              ? `<span><a href="${recipe.pdfPath}" target="_blank" style="color: var(--primary); text-decoration: underline;">📄 View PDF</a></span>` 
              : (recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))
                ? `<span><a href="${recipe.source}" target="_blank" style="color: var(--primary); text-decoration: underline;">🌐 Source Link</a></span>`
                : `<span>Source: ${recipe.source || 'Unknown'}</span>`
              )
            }
          </div>
          <div class="tags" style="margin-bottom: 0.75rem;">${tags}</div>
        </div>
        
        <div class="card-actions-wrapper">
          <button class="btn btn-outline btn-details" onclick="RecipeCard.openModal('${recipe.id}')">
            View Details
          </button>
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
        <h2 style="margin-bottom: 0.5rem;">${recipe.title}</h2>
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
