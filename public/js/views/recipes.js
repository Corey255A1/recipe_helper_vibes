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
        <!-- Library Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="margin: 0; font-size: 1.65rem;">📖 Recipe Library</h2>
            <span id="recipe-library-count-badge" style="font-size: 0.85rem; font-weight: 600; background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 0.2rem 0.65rem; border-radius: 1rem;">
              0 recipes
            </span>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-outline" style="padding: 0.55rem 0.9rem; font-size: 0.85rem;" onclick="RecipesView.openBatchModal()">📂 Batch Import</button>
            <button class="btn" style="padding: 0.55rem 0.9rem; font-size: 0.85rem;" onclick="RecipesView.openImportModal()">🔗 Import URL/PDF</button>
          </div>
        </div>

        <!-- Static Search & Filter Control Panel -->
        <div class="library-control-panel">
          <div style="display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
            
            <!-- Search Bar -->
            <div style="position: relative; flex: 1; min-width: 250px;">
              <input type="text" id="recipe-library-search" placeholder="🔍 Search recipes by title, tag, or ingredient..." oninput="RecipesView.handleSearch(this.value)" style="width: 100%; margin-bottom: 0; padding: 0.65rem 2.2rem 0.65rem 1rem; font-size: 0.9rem;">
              <button id="recipe-search-clear-btn" onclick="RecipesView.clearSearch()" style="display: none; position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem;" title="Clear Search">✕</button>
            </div>

            <!-- Sort Dropdown -->
            <select id="recipe-library-sort" onchange="RecipesView.handleSort(this.value)" style="margin-bottom: 0; width: auto; padding: 0.65rem 0.85rem; border-radius: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 0.85rem;">
              <option value="recent" selected>Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="title">Sort: A - Z</option>
            </select>

            <!-- Tag Select Dropdown -->
            <select id="recipe-tag-cloud-select" onchange="RecipesView.selectTag(this.value)" style="margin-bottom: 0; width: auto; padding: 0.65rem 0.85rem; border-radius: 0.75rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 0.85rem;">
              <option value="">Tag: All</option>
            </select>

            <!-- View Switcher -->
            <div style="display: flex; gap: 0.2rem; background: var(--bg); padding: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border);">
              <button id="recipes-view-mode-grid" class="btn ${isGrid ? '' : 'btn-outline'}" onclick="RecipesView.setViewMode('grid')" title="Grid View" style="padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 0.35rem;">🔲</button>
              <button id="recipes-view-mode-list" class="btn ${!isGrid ? '' : 'btn-outline'}" onclick="RecipesView.setViewMode('list')" title="List View" style="padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 0.35rem;">☰</button>
            </div>

          </div>

          <!-- Quick Tag Chips Bar -->
          <div id="recipe-tag-chips-container" style="display: flex; gap: 0.4rem; overflow-x: auto; margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.06); scrollbar-width: none;">
          </div>
        </div>

        <!-- Filter Status Bar -->
        <div id="recipe-filter-status-bar" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;"></div>

        <!-- Recipe Content Grid -->
        <div id="recipes-library-content" style="flex: 1; padding-bottom: 2rem;">
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

            <div id="single-import-status"></div>

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

            <div id="batch-import-status"></div>

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
    const chipsContainer = document.getElementById('recipe-tag-chips-container');
    const countBadge = document.getElementById('recipe-library-count-badge');

    const totalCount = (this.state.recipes || []).length;
    if (countBadge) countBadge.innerText = `${totalCount} ${totalCount === 1 ? 'recipe' : 'recipes'}`;

    if (!this.state.recipes) return;

    // Collect all unique tags
    const tagCounts = {};
    this.state.recipes.forEach(r => {
      (r.tags || []).forEach(t => {
        const cleanTag = t.trim().toLowerCase();
        if (cleanTag) tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

    if (selectEl) {
      let selectHtml = `<option value="">Tag: All (${totalCount})</option>`;
      sortedTags.forEach(tag => {
        const isSelected = this.state.selectedTag === tag ? 'selected' : '';
        const capitalized = tag.charAt(0).toUpperCase() + tag.slice(1);
        selectHtml += `<option value="${tag}" ${isSelected}>${capitalized} (${tagCounts[tag]})</option>`;
      });
      selectEl.innerHTML = selectHtml;
    }

    if (chipsContainer) {
      let chipsHtml = `
        <button class="btn btn-sm ${this.state.selectedTag === '' ? '' : 'btn-outline'}" 
                style="border-radius: 1rem; padding: 0.25rem 0.75rem; font-size: 0.8rem; white-space: nowrap;"
                onclick="RecipesView.selectTag('')">
          All (${totalCount})
        </button>
      `;

      sortedTags.slice(0, 12).forEach(tag => {
        const isSelected = this.state.selectedTag === tag;
        const capitalized = tag.charAt(0).toUpperCase() + tag.slice(1);
        chipsHtml += `
          <button class="btn btn-sm ${isSelected ? '' : 'btn-outline'}" 
                  style="border-radius: 1rem; padding: 0.25rem 0.75rem; font-size: 0.8rem; white-space: nowrap;"
                  onclick="RecipesView.selectTag('${tag}')">
            ${capitalized} (${tagCounts[tag]})
          </button>
        `;
      });
      chipsContainer.innerHTML = chipsHtml;
    }
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
    this.state.selectedTag = '';
    const input = document.getElementById('recipe-library-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('recipe-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    this.renderTagCloud();
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

    if (!content || !this.state.recipes) return;

    const query = this.state.searchQuery;
    const tag = this.state.selectedTag;
    const sort = this.state.sortMode;

    if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

    let filtered = this.state.recipes.filter(r => {
      const matchesQuery = !query || 
        r.title.toLowerCase().includes(query) ||
        (r.tags || []).some(t => t.toLowerCase().includes(query)) ||
        (r.ingredients || []).some(i => i.toLowerCase().includes(query));

      const matchesTag = !tag || (r.tags || []).some(t => t.toLowerCase() === tag);

      return matchesQuery && matchesTag;
    });

    Utils.sortRecipes(filtered, sort);

    if (statusBar) {
      if (query || tag) {
        let filterLabels = [];
        if (query) filterLabels.push(`search "${query}"`);
        if (tag) filterLabels.push(`tag "${tag.charAt(0).toUpperCase() + tag.slice(1)}"`);

        statusBar.innerHTML = `
          <span style="color: var(--text-secondary); font-size: 0.875rem;">Showing <strong>${filtered.length}</strong> of ${this.state.recipes.length} recipes (filtered by ${filterLabels.join(' & ')})</span>
          <button class="btn btn-outline btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-color: rgba(239,68,68,0.4); color: #f87171;" onclick="RecipesView.clearAllFilters()">Clear Filters ✕</button>
        `;
      } else {
        statusBar.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">Showing all ${filtered.length} saved recipes</span>`;
      }
    }

    if (filtered.length === 0) {
      content.innerHTML = `
        <div style="background: var(--surface); padding: 3.5rem 2rem; border-radius: 1.25rem; border: 1px solid var(--border); text-align: center; margin-top: 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text);">No recipes found</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">No saved recipes matched your current search or tag filters.</p>
          <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="RecipesView.clearAllFilters()">Reset Filters & Show All</button>
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
    const planView = (typeof PlanView !== 'undefined') ? PlanView : window.PlanView;
    if (planView) {
      if (!planView.state || !planView.state.plans || planView.state.plans.length === 0) {
        try {
          planView.state = planView.state || { plans: [], expandedWeekOf: null };
          planView.state.plans = await api.plan.plans();
        } catch(e) {
          console.error(e);
        }
      }
      planView.activeRecipeId = recipeId;
      
      const targetWeek = planView.getActiveWeekOf ? planView.getActiveWeekOf() : (planView.state && planView.state.plans && planView.state.plans.length > 0 ? planView.state.plans[0].weekOf : null);
      await planView.openDayModal([], 'Dinner', targetWeek);
    } else {
      Toast.show('Plan view unavailable', 'danger');
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
    html += `<h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600;">📊 Import Summary</h4>`;

    if (processed.length > 0) {
      html += `<div style="margin-bottom: 0.75rem;"><strong style="color: var(--success);">✅ Successfully Imported (${processed.length}):</strong><ul style="margin: 0.35rem 0 0 1.2rem; font-size: 0.85rem; color: var(--text);">`;
      processed.forEach(p => {
        html += `<li>${p.title}</li>`;
      });
      html += `</ul></div>`;
    }

    if (errors.length > 0) {
      html += `<div><strong style="color: #f87171;">⚠️ Errors (${errors.length}):</strong><ul style="margin: 0.35rem 0 0 1.2rem; font-size: 0.85rem; color: #f87171;">`;
      errors.forEach(e => {
        html += `<li><strong>${e.file}</strong>: ${e.error}</li>`;
      });
      html += `</ul></div>`;
    }

    if (processed.length === 0 && errors.length === 0) {
      html += `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">No PDFs were found or processed.</p>`;
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
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid var(--primary); padding: 1rem; border-radius: 0.75rem; color: var(--text);">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span>⏳ Processing ${fileCount} PDF file(s)...</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Please keep this window open. Files are paced 4 seconds apart to comply with API rate limits.</p>
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
      } else {
        Toast.show('Batch upload completed with errors', 'warning');
      }
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); padding: 1rem; border-radius: 0.75rem; color: #f87171;">
            ❌ <strong>Batch Upload Failed:</strong> ${err.message || 'Network error'}
          </div>
        `;
      }
      Toast.show(err.message || 'Batch upload failed', 'danger');
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
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid var(--primary); padding: 1rem; border-radius: 0.75rem; color: var(--text);">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span>⏳ Scanning directory and parsing PDFs...</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Pacing requests 4 seconds apart to respect API rate limits.</p>
        </div>
      `;
    }

    try {
      const res = await api.recipes.batchImportFolder(folderPath);
      this.renderBatchResults(res, statusEl);
      input.value = '';
      if (res.processed && res.processed.length > 0) {
        Toast.show(`Converted ${res.processed.length} PDF(s) from folder!`, 'success');
      } else {
        Toast.show(res.message || 'No new PDFs processed.', 'info');
      }
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); padding: 1rem; border-radius: 0.75rem; color: #f87171;">
            ❌ <strong>Folder Scan Failed:</strong> ${err.message || 'Directory error'}
          </div>
        `;
      }
      Toast.show(err.message || 'Folder scan failed', 'danger');
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
    }
  },

  openImportModal() {
    const modal = document.getElementById('import-modal');
    const statusEl = document.getElementById('single-import-status');
    if (statusEl) statusEl.innerHTML = '';
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
    const statusEl = document.getElementById('single-import-status');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Importing...';
    submitBtn.disabled = true;

    if (statusEl) {
      statusEl.innerHTML = `<p style="color: var(--accent-cyan); font-size: 0.85rem; margin: 0.5rem 0 0 0;">⏳ Fetching webpage and extracting recipe with AI...</p>`;
    }

    try {
      const recipe = await api.recipes.importLink(url);
      Toast.show(`Imported: ${recipe.title}`, 'success');
      urlInput.value = '';
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--success); font-size: 0.85rem; margin: 0.5rem 0 0 0;">✅ Imported: <strong>${recipe.title}</strong></p>`;
      setTimeout(() => {
        this.closeImportModal();
        if (statusEl) statusEl.innerHTML = '';
      }, 1500);
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<p style="color: #f87171; font-size: 0.85rem; margin: 0.5rem 0 0 0;">❌ <strong>Import Failed:</strong> ${err.message || 'Check URL and try again'}</p>`;
      }
      Toast.show(err.message || 'Failed to import recipe', 'danger');
    } finally {
      submitBtn.textContent = originalText;
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
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    if (statusEl) {
      statusEl.innerHTML = `<p style="color: var(--accent-cyan); font-size: 0.85rem; margin: 0.5rem 0 0 0;">⏳ Uploading PDF and parsing text with AI...</p>`;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const recipe = await api.recipes.importPdf(formData);
      Toast.show(`Uploaded & Parsed: ${recipe.title}`, 'success');
      fileInput.value = '';
      if (statusEl) statusEl.innerHTML = `<p style="color: var(--success); font-size: 0.85rem; margin: 0.5rem 0 0 0;">✅ Parsed: <strong>${recipe.title}</strong></p>`;
      setTimeout(() => {
        this.closeImportModal();
        if (statusEl) statusEl.innerHTML = '';
      }, 1500);
      await this.loadRecipes();
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<p style="color: #f87171; font-size: 0.85rem; margin: 0.5rem 0 0 0;">❌ <strong>Upload Failed:</strong> ${err.message || 'Invalid PDF or rate limit'}</p>`;
      }
      Toast.show(err.message || 'Failed to import PDF', 'danger');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
};
