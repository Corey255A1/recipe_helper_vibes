const RecipesView = {
  state: {
    recipes: [],
    viewMode: window.innerWidth <= 768 ? 'list' : 'grid',
    searchQuery: '',
    selectedTag: '',
    sortMode: 'recent'
  },

  async render() {
    const isGrid = this.state.viewMode === 'grid';
    return `
      <div class="view" id="recipes-view">
        <!-- Control Panel -->
        <div class="library-control-panel">
          <div style="display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            
            <div style="display: flex; gap: 0.75rem; align-items: center; flex: 1; min-width: 320px; flex-wrap: wrap;">
              <input type="text" id="recipe-library-search" placeholder="🔍 Search recipes..." oninput="RecipesView.handleSearch(this.value)" style="margin-bottom: 0; flex: 1; min-width: 150px; padding: 0.65rem 1rem;">
              
              <select id="recipe-library-sort" onchange="RecipesView.handleSort(this.value)" style="margin-bottom: 0; width: auto; padding: 0.65rem 1rem; border-radius: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 0.9rem;">
                <option value="recent" selected>Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">A - Z</option>
              </select>
              
              <select id="recipe-tag-cloud-select" onchange="RecipesView.selectTag(this.value)" style="margin-bottom: 0; width: auto; padding: 0.65rem 1rem; border-radius: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 0.9rem;">
                <option value="">Tag: All</option>
              </select>
            </div>
            
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <button class="btn btn-outline" style="padding: 0.55rem 0.85rem; font-size: 0.85rem;" onclick="RecipesView.openBatchModal()">📂 Batch Import</button>
              <button class="btn" style="padding: 0.55rem 0.85rem; font-size: 0.85rem;" onclick="RecipesView.openImportModal()">🔗 Import URL/PDF</button>
              
              <div style="display: flex; gap: 0.2rem; background: var(--bg); padding: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border); margin-left: 0.25rem;">
                <button id="recipes-view-mode-grid" class="btn ${isGrid ? '' : 'btn-outline'}" onclick="RecipesView.setViewMode('grid')" title="Grid View" style="padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 0.35rem;">🔲</button>
                <button id="recipes-view-mode-list" class="btn ${!isGrid ? '' : 'btn-outline'}" onclick="RecipesView.setViewMode('list')" title="List View" style="padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 0.35rem;">☰</button>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Recipe Content Grid -->
        <div id="recipes-library-content" style="flex: 1; overflow-y: auto; padding-right: 0.5rem; padding-bottom: 2rem;">
          ${Loader.render('Loading recipe library...')}
        </div>

        <!-- Single Import Modal -->
        <div id="import-modal" class="modal-overlay">
          <div class="modal-card" style="max-width: 540px;">
            <h3 style="margin-bottom: 0.5rem;">🔗 Import Recipe</h3>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1.5rem;">
              Import a recipe from a URL or single PDF file.
            </p>

            <form onsubmit="RecipesView.importLink(event)" style="margin-bottom: 1.25rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem;">
              <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem;">Import from URL</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Paste any recipe link. The AI will extract the ingredients, steps, and details.</p>
              <div class="form-group" style="display: flex; gap: 0.5rem;">
                <input type="url" id="import-url" placeholder="https://example.com/recipe-url" required style="margin-bottom: 0; flex: 1;">
                <button type="submit" class="btn btn-sm" style="padding: 0.6rem 1rem;">Import</button>
              </div>
            </form>

            <form onsubmit="RecipesView.importPdf(event)" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem;">
              <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem;">Import from PDF</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Upload a single PDF recipe document.</p>
              <div class="form-group" style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="file" id="import-pdf-file" accept="application/pdf" required style="margin-bottom: 0; flex: 1;">
                <button type="submit" class="btn btn-sm" style="padding: 0.6rem 1rem;">Upload</button>
              </div>
            </form>

            <div class="modal-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button class="btn btn-outline" onclick="RecipesView.closeImportModal()">Close</button>
            </div>
          </div>
        </div>

        <!-- Batch PDF Import Modal -->
        <div id="batch-pdf-modal" class="modal-overlay">
          <div class="modal-card" style="max-width: 540px;">
            <h3 style="margin-bottom: 0.5rem;">📂 Batch PDF Import</h3>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1.5rem;">
              Automatically parse multiple PDF recipe files into formatted markdown with AI.
            </p>

            <!-- Option 1: File Upload -->
            <form onsubmit="RecipesView.handleBatchUpload(event)" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem; margin-bottom: 1.25rem;">
              <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem;">Option 1: Upload Multiple Files</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Select one or more PDF files from your device.</p>
              <div class="form-group" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <input type="file" id="batch-pdf-files" accept="application/pdf" multiple required style="margin-bottom: 0; flex: 1;">
                <button type="submit" class="btn btn-sm" style="padding: 0.6rem 1rem;">Upload & Parse</button>
              </div>
            </form>

            <!-- Option 2: Folder Scan -->
            <form onsubmit="RecipesView.handleBatchFolder(event)" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem;">
              <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem;">Option 2: Server Directory Scan</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">Enter a server path containing unparsed PDFs (e.g. <code>/data/unparsed</code>).</p>
              <div class="form-group" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <input type="text" id="batch-folder-path" placeholder="/data/unparsed" style="margin-bottom: 0; flex: 1;">
                <button type="submit" class="btn btn-outline btn-sm" style="padding: 0.6rem 1rem;">Scan & Process</button>
              </div>
            </form>

            <div class="modal-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button class="btn btn-outline" onclick="RecipesView.closeBatchModal()">Close</button>
            </div>
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
      this.renderTagCloud();
      this.filterAndRender();
    } catch (e) {
      if (content) content.innerHTML = `<p style="color: var(--danger);">Failed to load recipe library.</p>`;
    }
  },

  renderTagCloud() {
    const selectEl = document.getElementById('recipe-tag-cloud-select');
    if (!selectEl || !this.state.recipes) return;

    // Collect all unique tags
    const tagCounts = {};
    this.state.recipes.forEach(r => {
      (r.tags || []).forEach(t => {
        const cleanTag = t.trim().toLowerCase();
        if (cleanTag) tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

    let html = `<option value="">Filter Tag: All (${this.state.recipes.length})</option>`;

    sortedTags.forEach(tag => {
      const isSelected = this.state.selectedTag === tag ? 'selected' : '';
      const capitalized = tag.charAt(0).toUpperCase() + tag.slice(1);
      html += `<option value="${tag}" ${isSelected}>${capitalized} (${tagCounts[tag]})</option>`;
    });

    selectEl.innerHTML = html;
  },

  selectTag(tag) {
    this.state.selectedTag = tag;
    this.renderTagCloud();
    this.filterAndRender();
  },

  handleSearch(query) {
    this.state.searchQuery = query.toLowerCase();
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
    if (!content || !this.state.recipes) return;

    const query = this.state.searchQuery;
    const tag = this.state.selectedTag;
    const sort = this.state.sortMode;

    let filtered = this.state.recipes.filter(r => {
      const matchesQuery = !query || 
        r.title.toLowerCase().includes(query) ||
        (r.tags || []).some(t => t.toLowerCase().includes(query)) ||
        (r.ingredients || []).some(i => i.toLowerCase().includes(query));

      const matchesTag = !tag || (r.tags || []).some(t => t.toLowerCase() === tag);

      return matchesQuery && matchesTag;
    });

    Utils.sortRecipes(filtered, sort);

    if (filtered.length === 0) {
      content.innerHTML = `
        <div style="background: var(--surface); padding: 3rem; border-radius: 1.25rem; border: 1px solid var(--border); text-align: center;">
          <p style="color: var(--text-muted); font-size: 1rem; margin: 0;">No recipes found matching your filters.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = `recipe-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}`;

    filtered.forEach(recipe => {
      const actions = `
        <div class="actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; width: 100%; margin-top: 0;">
          <button class="btn" style="background: var(--success); flex: 1; padding: 0.55rem 0.75rem; font-size: 0.85rem;" onclick="RecipesView.addToPlan('${recipe.id}')">➕ Add to Plan</button>
        </div>
      `;
      grid.innerHTML += RecipeCard.render(recipe, actions, false);
    });

    content.innerHTML = '';
    content.appendChild(grid);
  },

  async addToPlan(recipeId) {
    if (window.PlanView) {
      if (!PlanView.state.plans || PlanView.state.plans.length === 0) {
        await PlanView.init();
      }
      PlanView.activeRecipeId = recipeId;
      
      // Navigate to plan view
      if (window.App) {
        App.navigate('plan');
        history.pushState({ route: 'plan' }, '', '#plan');
      }
      
      PlanView.openDayModal([], 'Dinner', PlanView.state.expandedWeekOf);
    } else {
      Toast.show('Recipe selected for plan', 'info');
    }
  },

  deleteRecipe(id, title) {
    ConfirmModal.show({
      title: 'Delete Recipe',
      message: `Are you sure you want to permanently delete "${title}"? This will delete the markdown file and associated PDF.`,
      confirmText: 'Delete Recipe',
      danger: true,
      onConfirm: async () => {
        try {
          await api.recipes.delete(id);
          Toast.show('Recipe deleted', 'success');
          if (window.RecipeCard) RecipeCard.closeModal();
          await this.loadRecipes();
        } catch (e) {
          Toast.show('Failed to delete recipe');
        }
      }
    });
  },

  openBatchModal() {
    const modal = document.getElementById('batch-pdf-modal');
    if (modal) modal.classList.add('open');
  },

  closeBatchModal() {
    const modal = document.getElementById('batch-pdf-modal');
    if (modal) modal.classList.remove('open');
  },

  async handleBatchUpload(e) {
    e.preventDefault();
    const input = document.getElementById('batch-pdf-files');
    if (!input.files || input.files.length === 0) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const formData = new FormData();
    for (const f of input.files) {
      formData.append('pdfs', f);
    }

    try {
      const res = await api.recipes.batchImportPdf(formData);
      Toast.show(`Successfully imported ${res.processed.length} PDF recipe(s)!`, 'success');
      this.closeBatchModal();
      input.value = '';
      await this.loadRecipes();
    } catch (err) {
      Toast.show('Batch upload failed');
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  async handleBatchFolder(e) {
    e.preventDefault();
    const input = document.getElementById('batch-folder-path');
    const folderPath = input.value.trim();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Scanning...';
    submitBtn.disabled = true;

    try {
      const res = await api.recipes.batchImportFolder(folderPath);
      if (res.processed && res.processed.length > 0) {
        Toast.show(`Successfully converted ${res.processed.length} PDF(s) from folder!`, 'success');
        this.closeBatchModal();
        input.value = '';
        await this.loadRecipes();
      } else {
        Toast.show(res.message || 'No new PDFs processed.', 'info');
      }
    } catch (err) {
      Toast.show(err.message || 'Folder scan failed');
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  openImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) modal.classList.add('open');
  },

  closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) modal.classList.remove('open');
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
      this.closeImportModal();
      await this.loadRecipes();
    } catch (err) {
      Toast.show('Failed to import recipe');
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
      this.closeImportModal();
      await this.loadRecipes();
    } catch (err) {
      Toast.show('Failed to import PDF');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
};
