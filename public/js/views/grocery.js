const GroceryView = {
  state: {
    plans: [],
    selectedWeeks: [],
    list: { categories: [], weeks: [], copyText: '' },
    hideChecked: false,
    pantryItems: [],
    pantryReportCollapsed: false
  },

  async render() {
    return `
      <div class="view" id="grocery-view">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.65rem;">🛒 Grocery Checklist</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">Checked items persist automatically across your devices.</p>
          </div>
          
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="GroceryView.toggleHideChecked()" id="grocery-hide-btn">
              👁️ Hide Checked
            </button>
            <button class="btn btn-outline btn-sm" onclick="GroceryView.clearCheckedItems()">
              🧹 Clear Done
            </button>
            <button class="btn btn-sm" style="background: var(--accent-cyan); color: #090d16; font-weight: 700;" onclick="GroceryView.share()">
              📤 Share
            </button>
            <button class="btn btn-sm" onclick="GroceryView.copy()">
              📋 Copy
            </button>
          </div>
        </div>

        <!-- Weekly Plan Filter Selector -->
        <div id="grocery-plan-summary" style="margin-bottom: 1.25rem;"></div>

        <!-- Smart Pantry Reconciliation Report Banner -->
        <div id="grocery-pantry-report"></div>

        <!-- Quick Add Custom Item Toolbar -->
        <div class="grocery-quick-add-panel">
          <form onsubmit="GroceryView.addCustomItem(event)" style="display: flex; gap: 0.5rem; width: 100%; flex-wrap: wrap; align-items: center;">
            <input type="text" id="grocery-custom-item-name" placeholder="➕ Add custom item (e.g. 1 gal Whole Milk, Paper towels)..." required style="margin-bottom: 0; flex: 2; min-width: 180px; padding: 0.65rem 0.85rem; font-size: 0.875rem;">
            <select id="grocery-custom-item-category" style="margin-bottom: 0; flex: 1; min-width: 130px; padding: 0.65rem 0.85rem; font-size: 0.85rem;">
              <option value="Produce">🥦 Produce</option>
              <option value="Dairy">🧀 Dairy</option>
              <option value="Proteins">🥩 Proteins</option>
              <option value="Pantry" selected>🥫 Pantry</option>
              <option value="Bakery">🍞 Bakery</option>
              <option value="Frozen">🧊 Frozen</option>
              <option value="Household / Other">🧼 Other</option>
            </select>
            <button type="submit" class="btn btn-sm" style="padding: 0.65rem 1rem;">Add Item</button>
          </form>
        </div>

        <!-- Shopping Progress Bar -->
        <div id="grocery-progress-container" style="margin-bottom: 1.5rem; background: var(--surface); border: 1px solid var(--border); padding: 0.85rem 1.25rem; border-radius: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; font-size: 0.85rem;">
            <span style="font-weight: 600; color: #f8fafc;" id="grocery-progress-label">Shopping Progress</span>
            <span style="color: var(--accent-cyan); font-weight: 700;" id="grocery-progress-pct">0%</span>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
            <div id="grocery-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--success)); transition: width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Generate / Refresh Button Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <button class="btn btn-outline btn-sm" onclick="GroceryView.regenerate()">
            🔄 Rebuild from Meal Plan
          </button>
          <span style="font-size: 0.8rem; color: var(--text-muted);" id="grocery-updated-at"></span>
        </div>

        <!-- Grocery Categories Checklist -->
        <div id="grocery-content">
          ${Loader.render('Loading grocery checklist...')}
        </div>
      </div>
    `;
  },

  async init() {
    try {
      this.state.plans = await api.plan.plans();
      if (this.state.plans && this.state.plans.length > 0) {
        this.state.selectedWeeks = [this.state.plans[0].weekOf];
      }
    } catch (e) {
      console.error(e);
    }

    await this.loadPantryItems();
    await this.renderPlanSummary();
    await this.loadSavedGrocery();
  },

  async loadPantryItems() {
    try {
      const pantryData = await api.pantry.list();
      this.state.pantryItems = Array.isArray(pantryData.items) ? pantryData.items : [];
    } catch (e) {
      this.state.pantryItems = [];
    }
  },

  async loadSavedGrocery() {
    const content = document.getElementById('grocery-content');
    try {
      await this.loadPantryItems();
      const saved = await api.grocery.getSaved();
      if (saved && saved.categories && saved.categories.length > 0) {
        this.state.list = saved;
        this.renderGroceryList();
      } else {
        // If no saved grocery list exists yet, auto-generate from current week
        await this.regenerate();
      }
    } catch (e) {
      if (content) content.innerHTML = `<p style="color: var(--text-secondary);">Click "Rebuild from Meal Plan" to generate your grocery list.</p>`;
    }
  },

  async regenerate() {
    if (this.state.selectedWeeks.length === 0) {
      Toast.show('Please select at least one week first.', 'warning');
      return;
    }

    const content = document.getElementById('grocery-content');
    content.innerHTML = Loader.render('Consolidating groceries with AI...');

    try {
      await this.loadPantryItems();
      this.state.list = await api.grocery.get(this.state.selectedWeeks);
      this.renderGroceryList();
      Toast.show('Grocery list generated!', 'success');
    } catch (e) {
      content.innerHTML = `<p style="color: var(--danger);">Failed to generate grocery list: ${e.message}</p>`;
    }
  },

  toggleWeek(weekOf) {
    if (this.state.selectedWeeks.includes(weekOf)) {
      this.state.selectedWeeks = this.state.selectedWeeks.filter(w => w !== weekOf);
    } else {
      this.state.selectedWeeks.push(weekOf);
    }
    this.renderPlanSummary();
  },

  async renderPlanSummary() {
    const summaryEl = document.getElementById('grocery-plan-summary');
    if (!summaryEl) return;
    if (!this.state.plans || this.state.plans.length === 0) {
      summaryEl.innerHTML = `<p style="color: var(--text-secondary);">Your meal plan is empty.</p>`;
      return;
    }

    let html = '';
    if (this.state.plans.length > 1) {
      html += `
        <div style="background: var(--surface); padding: 0.85rem 1rem; border-radius: 0.75rem; border: 1px solid var(--border); margin-bottom: 1rem;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; display: block;">Include Weeks in Grocery List:</span>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${this.state.plans.map(p => `
              <label class="grocery-week-chip">
                <input type="checkbox" value="${p.weekOf}" onchange="GroceryView.toggleWeek('${p.weekOf}')" ${this.state.selectedWeeks.includes(p.weekOf) ? 'checked' : ''}>
                <span>${Utils.formatPlanRange ? Utils.formatPlanRange(p) : (p.startDate || p.weekOf)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    summaryEl.innerHTML = html;
  },

  renderGroceryList() {
    const content = document.getElementById('grocery-content');
    if (!content) return;

    // Render smart pantry reconciliation banner
    this.renderPantryReport();

    const list = this.state.list;
    if (!list || !list.categories || list.categories.length === 0) {
      const reportEl = document.getElementById('grocery-pantry-report');
      if (reportEl) reportEl.innerHTML = '';

      content.innerHTML = `
        <div style="background: var(--surface); padding: 3rem 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛒</div>
          <h3 style="margin-bottom: 0.5rem;">Your grocery list is empty</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">Add custom items above or rebuild from your planned meals.</p>
          <button class="btn btn-sm" onclick="GroceryView.regenerate()">🔄 Rebuild from Meal Plan</button>
        </div>
      `;
      this.updateProgress(0, 0);
      return;
    }

    let totalItems = 0;
    let checkedCount = 0;
    let html = `<div class="grocery-categories-grid">`;

    list.categories.forEach((cat, catIdx) => {
      const items = cat.items || [];
      if (items.length === 0) return;

      const visibleItems = this.state.hideChecked 
        ? items.filter(i => !i.checked) 
        : items;

      totalItems += items.length;
      checkedCount += items.filter(i => i.checked).length;

      if (this.state.hideChecked && visibleItems.length === 0) {
        return;
      }

      html += `
        <div class="grocery-category-card">
          <div class="grocery-category-header">
            <h3>${cat.name}</h3>
            <span class="category-badge">${visibleItems.length} items</span>
          </div>
          <ul class="grocery-item-list">
            ${visibleItems.map(item => `
              <li class="grocery-item-row ${item.checked ? 'checked' : ''}" onclick="GroceryView.toggleItemCheck('${item.id}')">
                <input type="checkbox" ${item.checked ? 'checked' : ''} onclick="event.stopPropagation(); GroceryView.toggleItemCheck('${item.id}')">
                <div class="grocery-item-info">
                  <span class="grocery-item-name">
                    ${item.quantity ? `<strong>${item.quantity}</strong> ` : ''}${item.ingredient}
                  </span>
                  ${item.fromRecipes && item.fromRecipes.length > 0 ? `
                    <small class="grocery-item-from">for ${item.fromRecipes.join(', ')}</small>
                  ` : ''}
                </div>
                <button class="btn-remove-grocery-item" onclick="event.stopPropagation(); GroceryView.deleteItem('${item.id}')" title="Delete item">✕</button>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    });

    html += `</div>`;
    content.innerHTML = html;
    this.updateProgress(checkedCount, totalItems);

    const timeEl = document.getElementById('grocery-updated-at');
    if (timeEl && list.updatedAt) {
      try {
        const d = new Date(list.updatedAt);
        timeEl.innerText = `Updated ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (e) {}
    }

    this.updateMobileBadge(totalItems - checkedCount);
  },

  updateProgress(checked, total) {
    const label = document.getElementById('grocery-progress-label');
    const pctEl = document.getElementById('grocery-progress-pct');
    const bar = document.getElementById('grocery-progress-bar');
    if (!label || !pctEl || !bar) return;

    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    label.innerText = `In Cart: ${checked} of ${total} items`;
    pctEl.innerText = `${pct}%`;
    bar.style.width = `${pct}%`;
  },

  updateMobileBadge(remaining) {
    const badge = document.getElementById('mobile-grocery-badge');
    if (!badge) return;
    if (remaining === undefined) {
      let count = 0;
      (this.state.list.categories || []).forEach(c => {
        count += (c.items || []).filter(i => !i.checked).length;
      });
      remaining = count;
    }
    if (remaining > 0) {
      badge.innerText = remaining > 99 ? '99+' : remaining;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  },

  async toggleItemCheck(itemId) {
    let targetItem = null;
    for (const cat of (this.state.list.categories || [])) {
      targetItem = (cat.items || []).find(i => i.id === itemId);
      if (targetItem) {
        targetItem.checked = !targetItem.checked;
        break;
      }
    }

    if (targetItem) {
      this.renderGroceryList();
      await api.grocery.save(this.state.list).catch(() => {});
    }
  },

  async deleteItem(itemId) {
    for (const cat of (this.state.list.categories || [])) {
      const idx = (cat.items || []).findIndex(i => i.id === itemId);
      if (idx !== -1) {
        cat.items.splice(idx, 1);
        break;
      }
    }
    this.renderGroceryList();
    await api.grocery.save(this.state.list).catch(() => {});
  },

  async addCustomItem(e) {
    e.preventDefault();
    const nameInput = document.getElementById('grocery-custom-item-name');
    const catSelect = document.getElementById('grocery-custom-item-category');
    if (!nameInput) return;

    const raw = nameInput.value.trim();
    if (!raw) return;

    const catName = catSelect ? catSelect.value : 'Pantry';
    let targetCat = (this.state.list.categories || []).find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (!targetCat) {
      targetCat = { name: catName, items: [] };
      if (!this.state.list.categories) this.state.list.categories = [];
      this.state.list.categories.push(targetCat);
    }

    targetCat.items.unshift({
      id: `custom_${Date.now()}`,
      ingredient: raw,
      quantity: '',
      fromRecipes: [],
      checked: false,
      isCustom: true
    });

    nameInput.value = '';
    this.renderGroceryList();
    Toast.show(`Added "${raw}" to ${catName}`, 'success');
    await api.grocery.save(this.state.list).catch(() => {});
  },

  toggleHideChecked() {
    this.state.hideChecked = !this.state.hideChecked;
    const btn = document.getElementById('grocery-hide-btn');
    if (btn) {
      btn.innerText = this.state.hideChecked ? '👁️ Show All' : '👁️ Hide Checked';
      if (this.state.hideChecked) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
    this.renderGroceryList();
  },

  async clearCheckedItems() {
    ConfirmModal.show({
      title: 'Clear Checked Items',
      message: 'Remove all items currently marked as completed in your grocery list?',
      confirmText: 'Clear Checked',
      danger: true,
      onConfirm: async () => {
        (this.state.list.categories || []).forEach(cat => {
          cat.items = (cat.items || []).filter(i => !i.checked);
        });
        this.renderGroceryList();
        Toast.show('Cleared completed grocery items.', 'success');
        await api.grocery.save(this.state.list).catch(() => {});
      }
    });
  },

  copy() {
    if (!this.state.list || !this.state.list.copyText) {
      Toast.show('No list to copy. Generate it first.', 'warning');
      return;
    }
    navigator.clipboard.writeText(this.state.list.copyText).then(() => {
      Toast.show('Copied checklist to clipboard!', 'success');
    }).catch(() => {
      Toast.show('Failed to copy', 'danger');
    });
  },

  async share() {
    if (!this.state.list || !this.state.list.copyText) {
      Toast.show('No list to share. Generate it first.', 'warning');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Weekly Grocery List',
          text: this.state.list.copyText
        });
        Toast.show('Grocery list shared!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.copy();
        }
      }
    } else {
      this.copy();
    }
  },

  // Smart Pantry Reconciliation Report
  renderPantryReport() {
    const reportContainer = document.getElementById('grocery-pantry-report');
    if (!reportContainer) return;

    if (!this.state.list || !this.state.list.categories || this.state.list.categories.length === 0) {
      reportContainer.innerHTML = '';
      return;
    }

    const matches = Utils.matchGroceryWithPantry(this.state.list.categories, this.state.pantryItems);

    if (matches.length === 0) {
      reportContainer.innerHTML = '';
      return;
    }

    const isCollapsed = Boolean(this.state.pantryReportCollapsed);

    let html = `
      <div class="pantry-reconciliation-card" style="margin-bottom: 1.25rem; background: linear-gradient(135deg, rgba(0, 240, 255, 0.07), rgba(16, 185, 129, 0.07)); border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 1rem; padding: 1rem 1.25rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.35rem;">💡</span>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem;">
                Pantry Check: You May Have These Already
                <span class="category-badge" style="background: rgba(0, 240, 255, 0.2); color: var(--accent-cyan); font-weight: 700;">${matches.length}</span>
              </h3>
              <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
                Cross-referenced with your kitchen pantry records.
              </p>
            </div>
          </div>

          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button type="button" class="btn btn-sm" style="background: var(--success); font-weight: 700; padding: 0.45rem 0.85rem;" onclick="GroceryView.checkOffAllPantryMatches()">
              ✓ Check Off All (${matches.length})
            </button>
            <button type="button" class="btn btn-outline btn-sm" style="padding: 0.45rem 0.65rem;" onclick="GroceryView.togglePantryReport()">
              ${isCollapsed ? '▼ Show' : '▲ Hide'}
            </button>
          </div>
        </div>
    `;

    if (!isCollapsed) {
      html += `
        <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 0.5rem;">
          ${matches.map(m => `
            <div class="pantry-reconciliation-row" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); padding: 0.65rem 0.85rem; border-radius: 0.65rem; flex-wrap: wrap; gap: 0.6rem;">
              <div style="flex: 1; min-width: 200px;">
                <div style="font-size: 0.925rem; font-weight: 600; color: #f8fafc;">
                  ${m.groceryItem.quantity ? `<span style="color: var(--accent-cyan);">${m.groceryItem.quantity}</span> ` : ''}${m.groceryItem.ingredient}
                  ${m.groceryItem.fromRecipes && m.groceryItem.fromRecipes.length > 0 ? `
                    <small style="color: var(--text-muted); font-weight: normal; font-size: 0.775rem;">(for ${m.groceryItem.fromRecipes.join(', ')})</small>
                  ` : ''}
                </div>
                <div style="font-size: 0.8rem; color: #38ef7d; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.35rem;">
                  <span>🥫 In Pantry:</span>
                  <span style="font-weight: 600; color: #f8fafc;">${m.pantryItem.name}</span>
                  ${m.pantryItem.quantity ? `<span style="color: var(--text-muted);">(${m.pantryItem.quantity})</span>` : ''}
                </div>
              </div>

              <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm" style="background: var(--success); font-weight: 600; padding: 0.4rem 0.75rem; font-size: 0.825rem;" onclick="GroceryView.confirmHaveInPantry('${m.groceryItem.id}')" title="Check off grocery item because you already have it in the pantry">
                  ✓ Have It
                </button>
                <button type="button" class="btn btn-outline btn-sm" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171; padding: 0.4rem 0.75rem; font-size: 0.825rem;" onclick="GroceryView.removeFromPantryAndKeepOnList('${m.pantryItem.id}', '${m.pantryItem.name.replace(/'/g, "\\'")}', '${m.groceryItem.id}')" title="You ran out: Remove from pantry database and keep on grocery list">
                  🗑️ Out of Stock
                </button>
                <button type="button" class="btn btn-outline btn-sm" style="padding: 0.4rem 0.55rem; font-size: 0.8rem; color: var(--text-muted);" onclick="GroceryView.dismissPantryMatch('${m.groceryItem.id}')" title="Dismiss this suggestion (keep on shopping list without changing pantry)">
                  ✕
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += `</div>`;
    reportContainer.innerHTML = html;
  },

  togglePantryReport() {
    this.state.pantryReportCollapsed = !this.state.pantryReportCollapsed;
    this.renderPantryReport();
  },

  async confirmHaveInPantry(groceryItemId) {
    let targetItem = null;
    for (const cat of (this.state.list.categories || [])) {
      targetItem = (cat.items || []).find(i => i.id === groceryItemId);
      if (targetItem) {
        targetItem.checked = true;
        break;
      }
    }

    if (targetItem) {
      this.renderGroceryList();
      Toast.show(`Checked off "${targetItem.ingredient}" (in pantry) ✓`, 'success');
      await api.grocery.save(this.state.list).catch(() => {});
    }
  },

  async removeFromPantryAndKeepOnList(pantryItemId, pantryItemName, groceryItemId) {
    try {
      const res = await api.pantry.remove(pantryItemId);
      this.state.pantryItems = res.items || [];
      this.renderGroceryList();
      Toast.show(`Removed "${pantryItemName}" from pantry records — kept on grocery list.`, 'info');
    } catch (err) {
      Toast.show(`Failed to update pantry: ${err.message}`, 'danger');
    }
  },

  async dismissPantryMatch(groceryItemId) {
    for (const cat of (this.state.list.categories || [])) {
      const item = (cat.items || []).find(i => i.id === groceryItemId);
      if (item) {
        item.pantryIgnored = true;
        break;
      }
    }
    this.renderGroceryList();
    await api.grocery.save(this.state.list).catch(() => {});
  },

  async checkOffAllPantryMatches() {
    const matches = Utils.matchGroceryWithPantry(this.state.list.categories, this.state.pantryItems);
    if (matches.length === 0) return;

    for (const m of matches) {
      m.groceryItem.checked = true;
    }

    this.renderGroceryList();
    Toast.show(`Checked off ${matches.length} items verified in your pantry! 🥫`, 'success');
    await api.grocery.save(this.state.list).catch(() => {});
  }
};

window.GroceryView = GroceryView;

