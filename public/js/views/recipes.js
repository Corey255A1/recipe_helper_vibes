const RecipesView = {
  state: {
    recipes: [],
    viewMode: window.innerWidth <= 768 ? 'list' : 'grid',
    searchQuery: '',
    selectedTags: [],
    maxTime: null,
    onlyFavorites: false,
    draftTags: [],
    draftMaxTime: null,
    draftOnlyFavorites: false,
    sortMode: 'recent'
  },

  async render() {
    const isGrid = this.state.viewMode === 'grid';
    return `
      <div class="view" id="recipes-view">
        <!-- Library Header -->
        <div class="page-header">
          <div class="page-title-group">
            <h2>${Icons.render('book', 22)} Recipe Library</h2>
            <span id="recipe-library-count-badge" class="pill-badge pill-badge-accent">
              0 recipes
            </span>
          </div>

          <div class="page-actions">
            <button class="btn btn-sm" onclick="RecipesView.openCreateModal()">${Icons.render('plus', 15)} New Recipe</button>
            <button class="btn btn-secondary btn-sm" onclick="RecipesView.openImportModal()">${Icons.render('download', 15)} Import</button>
          </div>
        </div>

        <!-- Control Panel -->
        <div class="library-control-panel">
          <!-- Row 1: Full-width Search Bar -->
          <div class="search-input-wrap">
            <span class="search-icon">${Icons.render('search', 16)}</span>
            <input type="text" id="recipe-library-search" placeholder="Search recipes, tags, ingredients..." oninput="RecipesView.handleSearch(this.value)">
            <button id="recipe-search-clear-btn" class="search-clear-btn" onclick="RecipesView.clearSearch()" style="display: none;" title="Clear Search">${Icons.render('close', 14)}</button>
          </div>

          <!-- Row 2: Compact Filter & Sort Toolbar -->
          <div class="library-toolbar-row">
            <div class="library-filter-controls">
              <!-- Quick Favorites Filter Button -->
              <button id="btn-quick-fav-filter" class="btn btn-outline btn-sm" onclick="RecipesView.toggleOnlyFavorites()" title="Filter Favorites">
                ${Icons.render('heart', 14)} Favs
              </button>

              <!-- Filters Modal Trigger Button -->
              <button id="recipe-filter-modal-trigger" class="btn btn-outline btn-sm" onclick="RecipesView.openFilterModal()" title="Open Filters">
                ${Icons.render('filter', 14)} Filters
                <span id="recipe-active-filter-badge" style="display: none; background: var(--primary); color: #fff; border-radius: 1rem; padding: 0.05rem 0.4rem; font-size: 0.7rem; font-weight: 700;">0</span>
              </button>

              <!-- Sort Dropdown -->
              <select id="recipe-library-sort" class="compact-select" onchange="RecipesView.handleSort(this.value)">
                <option value="recent" selected>Newest</option>
                <option value="favorites">Favorites First</option>
                <option value="quickest">Quickest Cook</option>
                <option value="title">A - Z</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <!-- View Switcher -->
            <div class="segmented-group">
              <button id="recipes-view-mode-grid" class="btn ${isGrid ? '' : 'btn-outline'}" onclick="RecipesView.setViewMode('grid')" title="Grid View">${Icons.render('layoutGrid', 14)}</button>
              <button id="recipes-view-mode-list" class="btn ${!isGrid ? '' : 'btn-outline'}" onclick="RecipesView.setViewMode('list')" title="List View">${Icons.render('list', 14)}</button>
            </div>
          </div>
        </div>

        <!-- Filter Status Bar -->
        <div id="recipe-filter-status-bar" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;"></div>

        <!-- Recipe Content Grid -->
        <div id="recipes-library-content" style="flex: 1; padding-bottom: 2rem;">
          ${Loader.render('Loading recipe library...')}
        </div>

        <!-- Filters Popup Modal -->
        <div id="recipe-filter-modal" class="modal-overlay" onclick="if(event.target===this) RecipesView.closeFilterModal()">
          <div class="modal-card modal-card-md">
            <div class="modal-drag-pill"></div>
            <div class="modal-header modal-header-bordered">
              <h3>${Icons.render('filter', 18)} Filter Recipes</h3>
              <button class="icon-btn" onclick="RecipesView.closeFilterModal()" title="Close">${Icons.render('close', 16)}</button>
            </div>

            <div style="max-height: 60vh; overflow-y: auto; padding-right: 0.25rem;">
              <div style="margin-bottom: 1.25rem;">
                <h4 class="field-kicker">Special</h4>
                <div class="chip-row">
                  <button type="button" id="modal-fav-toggle-btn" class="btn btn-sm btn-outline" onclick="RecipesView.toggleModalFavorites()" style="border-radius: 1rem;">
                    ${Icons.render('heart', 14)} Only Favorites
                  </button>
                </div>
              </div>

              <div style="margin-bottom: 1.25rem;">
                <h4 class="field-kicker">Cooking Time</h4>
                <div class="chip-row" id="filter-modal-time-chips"></div>
              </div>

              <div style="margin-bottom: 0.5rem;">
                <h4 class="field-kicker">Tags & Categories</h4>
                <div id="filter-modal-tags-container" class="chip-row"></div>
              </div>
            </div>

            <div class="modal-footer" style="justify-content: space-between;">
              <button class="btn btn-outline btn-sm" onclick="RecipesView.resetModalFilters()">Reset All</button>
              <button id="filter-modal-apply-btn" class="btn btn-sm" onclick="RecipesView.applyFilterModal()">
                Show Recipes
              </button>
            </div>
          </div>
        </div>

        <!-- Unified Import Modal with Mobile Segmented Tabs -->
        <div id="import-modal" class="modal-overlay" onclick="if(event.target===this) RecipesView.closeImportModal()">
          <div class="modal-card modal-card-md modal-scroll">
            <div class="modal-drag-pill"></div>
            <div class="modal-header modal-header-bordered">
              <h3>${Icons.render('download', 18)} Import Recipe</h3>
              <button class="icon-btn" onclick="RecipesView.closeImportModal()" title="Close">${Icons.render('close', 16)}</button>
            </div>

            <!-- Segmented Tab Navigation for Mobile & Desktop -->
            <div class="import-tabs-nav" style="display: flex; gap: 0.3rem; margin-bottom: 1rem; background: var(--surface-elevated); padding: 0.3rem; border-radius: 0.75rem; border: 1px solid var(--border);">
              <button type="button" class="btn btn-sm import-tab-btn" id="tab-btn-import-url" onclick="RecipesView.switchImportTab('url')" style="flex: 1; font-size: 0.78rem; padding: 0.45rem 0.3rem;">${Icons.render('link', 14)} Link</button>
              <button type="button" class="btn btn-sm btn-outline import-tab-btn" id="tab-btn-import-image" onclick="RecipesView.switchImportTab('image')" style="flex: 1; font-size: 0.78rem; padding: 0.45rem 0.3rem;">${Icons.render('camera', 14)} Photo</button>
              <button type="button" class="btn btn-sm btn-outline import-tab-btn" id="tab-btn-import-pdf" onclick="RecipesView.switchImportTab('pdf')" style="flex: 1; font-size: 0.78rem; padding: 0.45rem 0.3rem;">${Icons.render('fileText', 14)} PDF</button>
              <button type="button" class="btn btn-sm btn-outline import-tab-btn" id="tab-btn-import-batch" onclick="RecipesView.switchImportTab('batch')" style="flex: 1; font-size: 0.78rem; padding: 0.45rem 0.3rem;">${Icons.render('folder', 14)} Batch</button>
            </div>

            <!-- Tab 1: Web URL -->
            <div id="import-panel-url" class="import-tab-panel">
              <form onsubmit="RecipesView.importLink(event)" style="background: var(--surface-subtle); border: 1px solid var(--border); padding: 1.15rem; border-radius: 0.75rem;">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">${Icons.render('link', 15)} Import from Web URL</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Paste any recipe link. AI extracts the title, timing, ingredients, and instructions.</p>
                <div class="form-group" style="position: relative; margin-bottom: 0.85rem;">
                  <input type="url" id="import-url" placeholder="https://example.com/recipe" required style="width: 100%; padding-right: 4.8rem; font-size: 0.9rem;">
                  <button type="button" class="btn btn-outline btn-xs" onclick="RecipesView.pasteToUrlInput()" style="position: absolute; right: 0.4rem; top: 50%; transform: translateY(-50%);" title="Paste from clipboard">${Icons.render('copy', 12)} Paste</button>
                </div>
                <button type="submit" class="btn" style="width: 100%;">${Icons.render('sparkles', 15)} Import Recipe</button>
              </form>
            </div>

            <!-- Tab 2: Mobile Photo / Camera -->
            <div id="import-panel-image" class="import-tab-panel" style="display: none;">
              <form onsubmit="RecipesView.importImage(event)" style="background: var(--surface-subtle); border: 1px solid var(--border); padding: 1.15rem; border-radius: 0.75rem;">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">${Icons.render('camera', 15)} Snap Photo / Cookbook Page</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Take a photo with your mobile camera or upload a screenshot or handwritten recipe card.</p>

                <label for="import-image-file" class="mobile-photo-dropzone" style="display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed var(--primary-border); background: var(--primary-soft); border-radius: 0.75rem; padding: 1.5rem 1rem; cursor: pointer; text-align: center; margin-bottom: 0.85rem; transition: all 0.2s;">
                  <span style="color: var(--primary); margin-bottom: 0.45rem;">${Icons.render('camera', 30)}</span>
                  <span style="font-weight: 600; font-size: 0.95rem; color: var(--text);">Tap to Take Photo or Choose Image</span>
                  <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">Camera, screenshots, or gallery</span>
                  <input type="file" id="import-image-file" accept="image/*" capture="environment" style="display: none;" onchange="RecipesView.onPhotoSelected(this)">
                </label>

                <!-- Selected Photo Preview Box -->
                <div id="import-photo-preview" style="display: none; align-items: center; gap: 0.75rem; background: var(--surface-elevated); border: 1px solid var(--border); padding: 0.5rem 0.75rem; border-radius: 0.5rem; margin-bottom: 0.85rem;">
                  <img id="import-photo-thumb" style="width: 48px; height: 48px; object-fit: cover; border-radius: 0.35rem; border: 1px solid var(--border);" alt="Preview">
                  <div style="flex: 1; min-width: 0;">
                    <div id="import-photo-filename" style="font-size: 0.825rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
                    <div id="import-photo-filesize" style="font-size: 0.75rem; color: var(--text-muted);"></div>
                  </div>
                  <button type="button" class="icon-btn danger" onclick="RecipesView.clearSelectedPhoto()" title="Remove photo">${Icons.render('close', 14)}</button>
                </div>

                <button type="submit" class="btn" style="width: 100%;">${Icons.render('sparkles', 15)} Scan & Parse with Gemini Vision</button>
              </form>
            </div>

            <!-- Tab 3: PDF Document -->
            <div id="import-panel-pdf" class="import-tab-panel" style="display: none;">
              <form onsubmit="RecipesView.importPdf(event)" style="background: var(--surface-subtle); border: 1px solid var(--border); padding: 1.15rem; border-radius: 0.75rem;">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">${Icons.render('fileText', 15)} Upload PDF Recipe</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Upload a single PDF document to parse ingredients and steps.</p>
                <div class="form-group" style="margin-bottom: 0.85rem;">
                  <input type="file" id="import-pdf-file" accept="application/pdf" style="padding: 0.65rem;">
                </div>
                <button type="submit" class="btn" style="width: 100%;">${Icons.render('sparkles', 15)} Upload & Parse PDF</button>
              </form>
            </div>

            <!-- Tab 4: Batch PDF & Folder Scan -->
            <div id="import-panel-batch" class="import-tab-panel" style="display: none;">
              <form onsubmit="RecipesView.handleBatchUpload(event)" style="background: var(--surface-subtle); border: 1px solid var(--border); padding: 1.15rem; border-radius: 0.75rem; margin-bottom: 0.85rem;">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">${Icons.render('folder', 15)} Upload Multiple PDFs</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">Select multiple recipe PDFs at once.</p>
                <div class="form-group" style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0;">
                  <input type="file" id="batch-pdf-files" accept="application/pdf" multiple style="margin-bottom: 0; flex: 1;">
                  <button type="submit" class="btn btn-sm">Upload Batch</button>
                </div>
              </form>

              <form onsubmit="RecipesView.handleBatchFolder(event)" style="background: var(--surface-subtle); border: 1px solid var(--border); padding: 1.15rem; border-radius: 0.75rem;">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">${Icons.render('folder', 15)} Server Folder Scan</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">Process PDFs already inside a directory on the host/container.</p>
                <div class="form-group" style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0;">
                  <input type="text" id="batch-folder-path" placeholder="/data/unparsed" style="margin-bottom: 0; flex: 1;">
                  <button type="submit" class="btn btn-outline btn-sm">Scan & Process</button>
                </div>
              </form>

              <div id="batch-import-status" style="margin-top: 0.75rem;"></div>
            </div>

            <div id="single-import-status" style="margin-top: 0.85rem;"></div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.loadRecipes();
  },

  async loadRecipes() {
    const content = document.getElementById('recipes-library-content');
    try {
      this.state.recipes = await api.recipes.list();
      this.updateRecipeCountBadge();
      this.filterAndRender();
    } catch (e) {
      if (content) content.innerHTML = `<p style="color: var(--danger);">Failed to load recipe library.</p>`;
    }
  },

  updateRecipeCountBadge() {
    const countBadge = document.getElementById('recipe-library-count-badge');
    const totalCount = (this.state.recipes || []).length;
    if (countBadge) countBadge.innerText = `${totalCount} ${totalCount === 1 ? 'recipe' : 'recipes'}`;
  },

  // FIX: addToPlan implementation
  addToPlan(recipeId) {
    if (window.PlanView) {
      PlanView.activeRecipeId = recipeId;
      PlanView.openDayModal([], 'Dinner', PlanView.getActiveWeekOf());
    }
  },

  // FIX: deleteRecipe implementation
  deleteRecipe(id, title = 'this recipe') {
    ConfirmModal.show({
      title: 'Delete Recipe',
      message: `Are you sure you want to permanently delete "${title}"? This will delete the recipe markdown file and any associated PDF.`,
      confirmText: 'Delete Recipe',
      danger: true,
      onConfirm: async () => {
        try {
          await api.recipes.delete(id);
          RecipeCard.closeModal();
          Toast.show('Recipe deleted.', 'success');
          if (document.getElementById('recipes-container') || document.getElementById('recipe-content')) {
            await this.loadRecipes();
          }
          if (window.PlanView && PlanView.state && PlanView.state.plans) {
            PlanView.refresh();
          }
        } catch (err) {
          Toast.show('Failed to delete recipe: ' + err.message, 'danger');
        }
      }
    });
  },

  async toggleFavorite(id) {
    try {
      const recipe = (this.state.recipes || []).find(r => r.id === id) || (RecipeCard.currentRecipe && RecipeCard.currentRecipe.id === id ? RecipeCard.currentRecipe : null);
      const newFavState = !(recipe && recipe.favorite);

      await api.recipes.update(id, { favorite: newFavState });
      if (recipe) recipe.favorite = newFavState;
      if (RecipeCard.currentRecipe && RecipeCard.currentRecipe.id === id) {
        RecipeCard.currentRecipe.favorite = newFavState;
        RecipeCard.renderModalContent();
      }

      Toast.show(newFavState ? 'Added to favorites' : 'Removed from favorites', 'info');
      this.filterAndRender();
    } catch (e) {
      Toast.show('Could not update favorite: ' + e.message, 'danger');
    }
  },

  toggleOnlyFavorites() {
    this.state.onlyFavorites = !this.state.onlyFavorites;
    const btn = document.getElementById('btn-quick-fav-filter');
    if (btn) {
      if (this.state.onlyFavorites) {
        btn.className = 'btn btn-sm';
        btn.style.background = 'var(--danger-soft)';
        btn.style.borderColor = 'var(--danger-border)';
        btn.style.color = 'var(--danger)';
      } else {
        btn.className = 'btn btn-outline btn-sm';
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }
    }
    this.filterAndRender();
  },

  openCreateModal() {
    this.openEditModal({
      id: '',
      title: '',
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      tags: [],
      ingredients: [],
      instructions: [],
      notes: '',
      source: ''
    }, true);
  },

  openEditModal(recipe, isNew = false) {
    const modal = document.getElementById('recipe-edit-modal');
    const titleEl = document.getElementById('recipe-edit-modal-title');
    const saveBtn = document.getElementById('edit-recipe-save-btn');
    if (!modal) return;

    titleEl.innerText = isNew ? 'Create New Recipe' : 'Edit Recipe';
    saveBtn.innerText = isNew ? 'Create Recipe' : 'Save Changes';

    document.getElementById('edit-recipe-id').value = isNew ? '' : (recipe.id || '');
    document.getElementById('edit-recipe-title').value = recipe.title || '';
    document.getElementById('edit-recipe-prep').value = recipe.prepTime || 10;
    document.getElementById('edit-recipe-cook').value = recipe.cookTime || 20;
    document.getElementById('edit-recipe-servings').value = recipe.servings || 4;
    document.getElementById('edit-recipe-tags').value = (recipe.tags || []).join(', ');
    document.getElementById('edit-recipe-ingredients').value = (recipe.ingredients || []).join('\n');
    document.getElementById('edit-recipe-instructions').value = (recipe.instructions || []).join('\n');
    document.getElementById('edit-recipe-notes').value = recipe.notes || '';
    document.getElementById('edit-recipe-source').value = recipe.source || '';

    modal.classList.add('open');
  },

  closeEditModal() {
    const modal = document.getElementById('recipe-edit-modal');
    if (modal) modal.classList.remove('open');
  },

  async saveEditedRecipe(e) {
    e.preventDefault();
    const id = document.getElementById('edit-recipe-id').value;
    const title = document.getElementById('edit-recipe-title').value.trim();
    const prepTime = parseInt(document.getElementById('edit-recipe-prep').value, 10) || 0;
    const cookTime = parseInt(document.getElementById('edit-recipe-cook').value, 10) || 0;
    const servings = parseInt(document.getElementById('edit-recipe-servings').value, 10) || 4;
    const tags = document.getElementById('edit-recipe-tags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const ingredients = document.getElementById('edit-recipe-ingredients').value.split('\n').map(i => i.trim()).filter(Boolean);
    const instructions = document.getElementById('edit-recipe-instructions').value.split('\n').map(i => i.trim()).filter(Boolean);
    const notes = document.getElementById('edit-recipe-notes').value.trim();
    const source = document.getElementById('edit-recipe-source').value.trim();

    const payload = {
      title,
      prepTime,
      cookTime,
      totalTime: prepTime + cookTime,
      servings,
      tags,
      ingredients,
      instructions,
      notes,
      source
    };

    const saveBtn = document.getElementById('edit-recipe-save-btn');
    const origText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      if (id) {
        await api.recipes.update(id, payload);
        Toast.show(`Updated recipe: ${title}`, 'success');
      } else {
        await api.recipes.create(payload);
        Toast.show(`Created recipe: ${title}!`, 'success');
      }
      this.closeEditModal();
      await this.loadRecipes();
    } catch (err) {
      Toast.show('Failed to save recipe: ' + err.message, 'danger');
    } finally {
      saveBtn.textContent = origText;
      saveBtn.disabled = false;
    }
  },

  openFilterModal() {
    this.state.draftTags = [...this.state.selectedTags];
    this.state.draftMaxTime = this.state.maxTime;
    this.state.draftOnlyFavorites = this.state.onlyFavorites;

    const modal = document.getElementById('recipe-filter-modal');
    if (!modal) return;

    this.renderModalFilterOptions();
    modal.classList.add('open');
  },

  closeFilterModal() {
    const modal = document.getElementById('recipe-filter-modal');
    if (modal) modal.classList.remove('open');
  },

  renderModalFilterOptions() {
    const tagsContainer = document.getElementById('filter-modal-tags-container');
    const timeContainer = document.getElementById('filter-modal-time-chips');
    const favBtn = document.getElementById('modal-fav-toggle-btn');

    if (favBtn) {
      favBtn.className = `btn btn-sm ${this.state.draftOnlyFavorites ? '' : 'btn-outline'}`;
      if (this.state.draftOnlyFavorites) {
        favBtn.style.background = 'var(--danger-soft)';
        favBtn.style.borderColor = 'var(--danger-border)';
        favBtn.style.color = 'var(--danger)';
      } else {
        favBtn.style.background = '';
        favBtn.style.borderColor = '';
        favBtn.style.color = '';
      }
    }

    const tagCounts = {};
    (this.state.recipes || []).forEach(r => {
      (r.tags || []).forEach(t => {
        const cleanTag = t.trim().toLowerCase();
        if (cleanTag) tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

    if (timeContainer) {
      const times = [
        { label: 'Under 20m', val: 20, icon: 'clock' },
        { label: 'Under 30m', val: 30, icon: 'clock' },
        { label: 'Under 45m', val: 45, icon: 'flame' },
        { label: 'Any Time', val: null, icon: null }
      ];

      timeContainer.innerHTML = times.map(t => {
        const isSelected = this.state.draftMaxTime === t.val;
        const iconHtml = t.icon ? `${Icons.render(t.icon, 13)} ` : '';
        return `
          <button type="button" class="btn btn-sm ${isSelected ? '' : 'btn-outline'}" 
                  style="border-radius: 1rem;"
                  onclick="RecipesView.setModalMaxTime(${t.val})">
            ${iconHtml}${t.label}
          </button>
        `;
      }).join('');
    }

    if (tagsContainer) {
      tagsContainer.innerHTML = sortedTags.map(tag => {
        const isSelected = this.state.draftTags.includes(tag);
        const capitalized = tag.charAt(0).toUpperCase() + tag.slice(1);
        return `
          <button type="button" class="btn btn-sm ${isSelected ? '' : 'btn-outline'}" 
                  style="border-radius: 1rem;"
                  onclick="RecipesView.toggleModalTag('${tag}')">
            ${capitalized} (${tagCounts[tag]})
          </button>
        `;
      }).join('');
    }

    this.updateModalApplyButton();
  },

  toggleModalFavorites() {
    this.state.draftOnlyFavorites = !this.state.draftOnlyFavorites;
    this.renderModalFilterOptions();
  },

  toggleModalTag(tag) {
    const idx = this.state.draftTags.indexOf(tag);
    if (idx > -1) {
      this.state.draftTags.splice(idx, 1);
    } else {
      this.state.draftTags.push(tag);
    }
    this.renderModalFilterOptions();
  },

  setModalMaxTime(time) {
    this.state.draftMaxTime = time;
    this.renderModalFilterOptions();
  },

  resetModalFilters() {
    this.state.draftTags = [];
    this.state.draftMaxTime = null;
    this.state.draftOnlyFavorites = false;
    this.renderModalFilterOptions();
  },

  updateModalApplyButton() {
    const applyBtn = document.getElementById('filter-modal-apply-btn');
    if (!applyBtn) return;

    const query = this.state.searchQuery;
    const tags = this.state.draftTags;
    const maxTime = this.state.draftMaxTime;
    const onlyFav = this.state.draftOnlyFavorites;

    const count = (this.state.recipes || []).filter(r => {
      const matchesQuery = !query || 
        r.title.toLowerCase().includes(query) ||
        (r.tags || []).some(t => t.toLowerCase().includes(query)) ||
        (r.ingredients || []).some(i => i.toLowerCase().includes(query));

      const matchesTags = tags.length === 0 || tags.every(t => (r.tags || []).some(rt => rt.toLowerCase() === t));
      const totalTime = r.totalTime || ((r.prepTime || 0) + (r.cookTime || 0)) || 20;
      const matchesTime = !maxTime || totalTime <= maxTime;
      const matchesFav = !onlyFav || Boolean(r.favorite);

      return matchesQuery && matchesTags && matchesTime && matchesFav;
    }).length;

    applyBtn.innerText = `Show ${count} ${count === 1 ? 'Recipe' : 'Recipes'}`;
  },

  applyFilterModal() {
    this.state.selectedTags = [...this.state.draftTags];
    this.state.maxTime = this.state.draftMaxTime;
    this.state.onlyFavorites = this.state.draftOnlyFavorites;
    this.closeFilterModal();
    this.filterAndRender();
  },

  removeTagFilter(tag) {
    const idx = this.state.selectedTags.indexOf(tag);
    if (idx > -1) {
      this.state.selectedTags.splice(idx, 1);
    }
    this.filterAndRender();
  },

  clearTimeFilter() {
    this.state.maxTime = null;
    this.filterAndRender();
  },

  handleSearch(query) {
    this.state.searchQuery = query.toLowerCase();
    this.filterAndRender();
  },

  clearSearch() {
    this.state.searchQuery = '';
    const input = document.getElementById('recipe-library-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('recipe-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    this.filterAndRender();
  },

  clearAllFilters() {
    this.state.searchQuery = '';
    this.state.selectedTags = [];
    this.state.maxTime = null;
    this.state.onlyFavorites = false;
    this.state.draftTags = [];
    this.state.draftMaxTime = null;
    this.state.draftOnlyFavorites = false;
    const input = document.getElementById('recipe-library-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('recipe-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    const favBtn = document.getElementById('btn-quick-fav-filter');
    if (favBtn) {
      favBtn.className = 'btn btn-outline btn-sm';
      favBtn.style.background = '';
      favBtn.style.borderColor = '';
      favBtn.style.color = '';
    }
    this.filterAndRender();
  },

  handleSort(mode) {
    this.state.sortMode = mode;
    this.filterAndRender();
  },

  setViewMode(mode) {
    this.state.viewMode = mode;
    Utils.updateViewModeButtons(mode, 'recipes-view-mode-grid', 'recipes-view-mode-list');
    this.filterAndRender();
  },

  filterAndRender() {
    const content = document.getElementById('recipes-library-content');
    const statusBar = document.getElementById('recipe-filter-status-bar');
    const clearBtn = document.getElementById('recipe-search-clear-btn');
    const filterBadge = document.getElementById('recipe-active-filter-badge');

    if (!content || !this.state.recipes) return;

    const query = this.state.searchQuery;
    const tags = this.state.selectedTags;
    const maxTime = this.state.maxTime;
    const onlyFav = this.state.onlyFavorites;
    const sort = this.state.sortMode;

    if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

    const activeFilterCount = tags.length + (maxTime ? 1 : 0) + (onlyFav ? 1 : 0);
    if (filterBadge) {
      if (activeFilterCount > 0) {
        filterBadge.innerText = activeFilterCount;
        filterBadge.style.display = 'inline-block';
      } else {
        filterBadge.style.display = 'none';
      }
    }

    let filtered = this.state.recipes.filter(r => {
      const matchesQuery = !query || 
        r.title.toLowerCase().includes(query) ||
        (r.tags || []).some(t => t.toLowerCase().includes(query)) ||
        (r.ingredients || []).some(i => i.toLowerCase().includes(query));

      const matchesTags = tags.length === 0 || tags.every(t => (r.tags || []).some(rt => rt.toLowerCase() === t));
      const totalTime = r.totalTime || ((r.prepTime || 0) + (r.cookTime || 0)) || 20;
      const matchesTime = !maxTime || totalTime <= maxTime;
      const matchesFav = !onlyFav || Boolean(r.favorite);

      return matchesQuery && matchesTags && matchesTime && matchesFav;
    });

    Utils.sortRecipes(filtered, sort);

    if (statusBar) {
      if (query || tags.length > 0 || maxTime || onlyFav) {
        let pillsHtml = '';
        if (query) {
          pillsHtml += `<span class="pill-badge">${Icons.render('search', 12)} "${query}" <button onclick="RecipesView.clearSearch()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; display:inline-flex; padding:0;" title="Clear">${Icons.render('close', 12)}</button></span>`;
        }
        if (onlyFav) {
          pillsHtml += `<span class="pill-badge" style="background: var(--danger-soft); color: var(--danger); border-color: var(--danger-border);">${Icons.render('heart', 12, '', true)} Favorites <button onclick="RecipesView.toggleOnlyFavorites()" style="background:none; border:none; color:inherit; cursor:pointer; display:inline-flex; padding:0;" title="Remove">${Icons.render('close', 12)}</button></span>`;
        }
        if (maxTime) {
          pillsHtml += `<span class="pill-badge pill-badge-accent">${Icons.render('clock', 12)} Under ${maxTime}m <button onclick="RecipesView.clearTimeFilter()" style="background:none; border:none; color:inherit; cursor:pointer; display:inline-flex; padding:0;" title="Remove">${Icons.render('close', 12)}</button></span>`;
        }
        tags.forEach(t => {
          const cap = t.charAt(0).toUpperCase() + t.slice(1);
          pillsHtml += `<span class="pill-badge pill-badge-accent">${cap} <button onclick="RecipesView.removeTagFilter('${t}')" style="background:none; border:none; color:inherit; cursor:pointer; display:inline-flex; padding:0;" title="Remove">${Icons.render('close', 12)}</button></span>`;
        });

        statusBar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="color: var(--text-secondary); font-size: 0.875rem;">Showing <strong>${filtered.length}</strong> of ${this.state.recipes.length} recipes:</span>
            ${pillsHtml}
          </div>
          <button class="btn btn-danger-outline btn-xs" onclick="RecipesView.clearAllFilters()">Clear All ${Icons.render('close', 12)}</button>
        `;
      } else {
        statusBar.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">Showing all ${filtered.length} saved recipes</span>`;
      }
    }

    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="surface-card" style="padding: 3rem 1.5rem; text-align: center; margin-top: 1rem;">
          <div style="color: var(--text-muted); margin-bottom: 0.75rem;">${Icons.render('filter', 36)}</div>
          <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text);">No recipes match your filters</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">Try resetting your filters or creating a new recipe.</p>
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="RecipesView.clearAllFilters()">Reset Filters</button>
            <button class="btn btn-sm" onclick="RecipesView.openCreateModal()">${Icons.render('plus', 14)} New Recipe</button>
          </div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;

    filtered.forEach(recipe => {
      const actions = `
        <div class="actions">
          <button class="btn btn-sm btn-primary-action" onclick="RecipesView.addToPlan('${recipe.id}')">${Icons.render('plus', 14)} Add to Plan</button>
          <button class="btn btn-secondary btn-sm" onclick="RecipeCard.openModal('${recipe.id}')">${Icons.render('chefHat', 14)} Cook</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions, false);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  openImportModal(initialTab = 'url') {
    const modal = document.getElementById('import-modal');
    const statusEl = document.getElementById('single-import-status');
    if (statusEl) statusEl.innerHTML = '';
    this.switchImportTab(initialTab);
    if (modal) modal.classList.add('open');
  },

  closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) modal.classList.remove('open');
  },

  switchImportTab(tab) {
    if (tab === 'photo') tab = 'image';
    const tabs = ['url', 'image', 'pdf', 'batch'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-import-${t}`);
      const panel = document.getElementById(`import-panel-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'btn btn-sm import-tab-btn active';
          btn.style.background = 'var(--primary)';
          btn.style.color = '#fff';
        } else {
          btn.className = 'btn btn-sm btn-outline import-tab-btn';
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-secondary)';
        }
      }
      if (panel) {
        panel.style.display = (t === tab) ? 'block' : 'none';
      }
    });
    const statusEl = document.getElementById('single-import-status');
    if (statusEl) statusEl.innerHTML = '';
  },

  async pasteToUrlInput() {
    try {
      const text = await navigator.clipboard.readText();
      const input = document.getElementById('import-url');
      if (input && text) {
        input.value = text.trim();
        Toast.show('Pasted link from clipboard! 📋', 'info');
      }
    } catch (e) {
      Toast.show('Clipboard access denied. Please paste manually.', 'warning');
    }
  },

  onPhotoSelected(input) {
    const file = input.files && input.files[0];
    const previewBox = document.getElementById('import-photo-preview');
    const thumb = document.getElementById('import-photo-thumb');
    const nameEl = document.getElementById('import-photo-filename');
    const sizeEl = document.getElementById('import-photo-filesize');
    
    if (file) {
      if (nameEl) nameEl.innerText = file.name;
      if (sizeEl) sizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB`;
      if (thumb) {
        const reader = new FileReader();
        reader.onload = (e) => { thumb.src = e.target.result; };
        reader.readAsDataURL(file);
      }
      if (previewBox) previewBox.style.display = 'flex';
    } else {
      if (previewBox) previewBox.style.display = 'none';
    }
  },

  clearSelectedPhoto() {
    const input = document.getElementById('import-image-file');
    const previewBox = document.getElementById('import-photo-preview');
    if (input) input.value = '';
    if (previewBox) previewBox.style.display = 'none';
  },

  openBatchModal() {
    this.openImportModal('batch');
  },

  closeBatchModal() {
    this.closeImportModal();
  },

  async importLink(e) {
    e.preventDefault();
    const urlInput = document.getElementById('import-url');
    const url = urlInput.value.trim();
    const statusEl = document.getElementById('single-import-status');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Importing...';
    submitBtn.disabled = true;

    if (statusEl) statusEl.innerHTML = `<p style="color: var(--accent); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">${Icons.render('refresh', 14)} Fetching page and parsing with Gemini...</p>`;

    try {
      const recipe = await api.recipes.importLink(url);
      Toast.show(`Imported: ${recipe.title}`, 'success');
      urlInput.value = '';
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--success); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">${Icons.render('check', 14)} Imported: <strong>${recipe.title}</strong></p>`;
      setTimeout(() => {
        this.closeImportModal();
        if (statusEl) statusEl.innerHTML = '';
      }, 1500);
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem;"><strong>Import Failed:</strong> ${err.message}</p>`;
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  async importImage(e) {
    e.preventDefault();
    const fileInput = document.getElementById('import-image-file');
    const file = fileInput.files[0];
    const statusEl = document.getElementById('single-import-status');
    if (!file) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Scanning...';
    submitBtn.disabled = true;

    if (statusEl) statusEl.innerHTML = `<p style="color: var(--accent); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">${Icons.render('refresh', 14)} Uploading image and parsing recipe with Gemini Vision...</p>`;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const recipe = await api.recipes.importImage(formData);
      Toast.show(`Scanned: ${recipe.title}!`, 'success');
      fileInput.value = '';
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--success); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">${Icons.render('check', 14)} Scanned: <strong>${recipe.title}</strong></p>`;
      setTimeout(() => {
        this.closeImportModal();
        if (statusEl) statusEl.innerHTML = '';
      }, 1500);
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem;"><strong>Scan Failed:</strong> ${err.message}</p>`;
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  async importPdf(e) {
    e.preventDefault();
    const fileInput = document.getElementById('import-pdf-file');
    const file = fileInput.files[0];
    const statusEl = document.getElementById('single-import-status');
    if (!file) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    if (statusEl) statusEl.innerHTML = `<p style="color: var(--accent); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">${Icons.render('refresh', 14)} Uploading PDF and parsing text with Gemini...</p>`;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const recipe = await api.recipes.importPdf(formData);
      Toast.show(`Uploaded & Parsed: ${recipe.title}`, 'success');
      fileInput.value = '';
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--success); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">${Icons.render('check', 14)} Parsed: <strong>${recipe.title}</strong></p>`;
      setTimeout(() => {
        this.closeImportModal();
        if (statusEl) statusEl.innerHTML = '';
      }, 1500);
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem;"><strong>Upload Failed:</strong> ${err.message}</p>`;
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  openBatchModal() {
    const modal = document.getElementById('batch-pdf-modal');
    const statusEl = document.getElementById('batch-import-status');
    if (statusEl) statusEl.innerHTML = '';
    if (modal) modal.classList.add('open');
  },

  closeBatchModal() {
    const modal = document.getElementById('batch-pdf-modal');
    if (modal) modal.classList.remove('open');
  },

  renderBatchResults(res, statusEl) {
    if (!statusEl) return;
    const processed = res.processed || [];
    const errors = res.errors || [];

    let html = `<div style="background: var(--surface); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem; margin-top: 1rem;">`;
    html += `<h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600;">Import Summary</h4>`;

    if (processed.length > 0) {
      html += `<div style="margin-bottom: 0.75rem;"><strong style="color: var(--success);">Successfully Imported (${processed.length}):</strong><ul style="margin: 0.35rem 0 0 1.2rem; font-size: 0.85rem; color: var(--text);">`;
      processed.forEach(p => {
        html += `<li>${p.title}</li>`;
      });
      html += `</ul></div>`;
    }

    if (errors.length > 0) {
      html += `<div><strong style="color: var(--danger);">Errors (${errors.length}):</strong><ul style="margin: 0.35rem 0 0 1.2rem; font-size: 0.85rem; color: var(--danger);">`;
      errors.forEach(e => {
        html += `<li><strong>${e.file}</strong>: ${e.error}</li>`;
      });
      html += `</ul></div>`;
    }

    html += `</div>`;
    statusEl.innerHTML = html;
  },

  async handleBatchUpload(e) {
    e.preventDefault();
    const input = document.getElementById('batch-pdf-files');
    const statusEl = document.getElementById('batch-import-status');
    if (!input.files || input.files.length === 0) return;

    const fileCount = input.files.length;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background: var(--primary-soft); border: 1px solid var(--primary-border); padding: 1rem; border-radius: 0.75rem; color: var(--text);">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; margin-bottom: 0.35rem;">
            ${Icons.render('refresh', 15)} <span>Processing ${fileCount} PDF file(s)...</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Pacing 4s apart to respect API limits.</p>
        </div>
      `;
    }

    const formData = new FormData();
    for (const f of input.files) {
      formData.append('pdfs', f);
    }

    try {
      const res = await api.recipes.batchImportPdf(formData);
      this.renderBatchResults(res, statusEl);
      input.value = '';
      if (res.processed && res.processed.length > 0) {
        Toast.show(`Imported ${res.processed.length} PDF recipe(s)!`, 'success');
      }
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<div style="color: var(--danger); padding: 1rem;">Error: ${err.message}</div>`;
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  async handleBatchFolder(e) {
    e.preventDefault();
    const input = document.getElementById('batch-folder-path');
    const folderPath = input.value.trim();
    const statusEl = document.getElementById('batch-import-status');

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Scanning...';
    submitBtn.disabled = true;

    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background: var(--primary-soft); border: 1px solid var(--primary-border); padding: 1rem; border-radius: 0.75rem; color: var(--text); display: flex; align-items: center; gap: 0.5rem;">
          ${Icons.render('refresh', 15)} <span>Scanning folder and parsing PDFs...</span>
        </div>
      `;
    }

    try {
      const res = await api.recipes.batchImportFolder(folderPath);
      this.renderBatchResults(res, statusEl);
      input.value = '';
      if (res.processed && res.processed.length > 0) {
        Toast.show(`Converted ${res.processed.length} PDF(s)!`, 'success');
      }
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<div style="color: var(--danger); padding: 1rem;">Error: ${err.message}</div>`;
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  }
};

window.RecipesView = RecipesView;
