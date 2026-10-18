const PantryView = {
  state: {
    items: [],
    updatedAt: null,
    searchQuery: '',
    selectedCategory: 'All',
    isScanning: false,
    stagingItems: []
  },

  categories: [
    { id: 'All', label: 'All', icon: '📦' },
    { id: 'Produce', label: 'Produce', icon: '🥦' },
    { id: 'Dairy', label: 'Dairy', icon: '🧀' },
    { id: 'Proteins', label: 'Proteins', icon: '🥩' },
    { id: 'Pantry', label: 'Pantry', icon: '🥫' },
    { id: 'Spices & Oils', label: 'Spices & Oils', icon: '🧂' },
    { id: 'Bakery', label: 'Bakery', icon: '🍞' },
    { id: 'Frozen', label: 'Frozen', icon: '🧊' },
    { id: 'Other', label: 'Other', icon: '🧼' }
  ],

  async render() {
    return `
      <div class="view" id="pantry-view">
        <!-- Header & Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <h2 style="margin: 0; font-size: 1.65rem;">🥫 Kitchen Pantry</h2>
              <span id="pantry-total-count" class="category-badge" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-weight: 700; border: 1px solid rgba(0, 240, 255, 0.3);">0 items</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.2rem 0 0 0;">Record what you have on hand to prevent duplicate groceries.</p>
          </div>
          
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <input type="file" id="pantry-camera-input" accept="image/*" capture="environment" style="display: none;" onchange="PantryView.handlePhotoUpload(event)">
            <input type="file" id="pantry-file-input" accept="image/*" style="display: none;" onchange="PantryView.handlePhotoUpload(event)">
            
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm" style="background: linear-gradient(135deg, #00f0ff, #00a8ff); color: #090d16; font-weight: 700;" onclick="PantryView.triggerPhotoScan()" id="pantry-scan-btn">
                📷 Scan Photo with AI
              </button>
              <button class="btn btn-outline btn-sm" onclick="PantryView.clearAllItems()" title="Clear all pantry items">
                🧹 Clear
              </button>
            </div>
          </div>
        </div>

        <!-- AI Scanning Progress Bar (hidden by default) -->
        <div id="pantry-scan-progress" style="display: none; margin-bottom: 1.25rem; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 0.85rem; padding: 1rem 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; font-size: 0.85rem;">
            <span id="pantry-scan-status-text" style="font-weight: 600; color: #f8fafc;">Optimizing photo resolution...</span>
            <span id="pantry-scan-spinner" class="spinner-small" style="width: 14px; height: 14px; border: 2px solid rgba(0,240,255,0.3); border-top-color: var(--accent-cyan); border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span>
          </div>
          <div id="pantry-scan-details" style="font-size: 0.775rem; color: var(--text-muted);">Client downscale reduces upload size for instant AI response.</div>
        </div>

        <!-- Quick Add Manual Item Toolbar -->
        <div class="grocery-quick-add-panel" style="margin-bottom: 1.25rem;">
          <form onsubmit="PantryView.addManualItem(event)" style="display: flex; gap: 0.5rem; width: 100%; flex-wrap: wrap; align-items: center;">
            <input type="text" id="pantry-item-name" placeholder="➕ Add item (e.g. Olive Oil, Garlic, Jasmine Rice)..." required style="margin-bottom: 0; flex: 2; min-width: 170px; padding: 0.65rem 0.85rem; font-size: 0.875rem;">
            <input type="text" id="pantry-item-qty" placeholder="Qty (e.g. 1 bottle, 2 cans)..." style="margin-bottom: 0; flex: 1; min-width: 120px; padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <select id="pantry-item-category" style="margin-bottom: 0; flex: 1; min-width: 130px; padding: 0.65rem 0.85rem; font-size: 0.85rem;">
              <option value="Produce">🥦 Produce</option>
              <option value="Dairy">🧀 Dairy</option>
              <option value="Proteins">🥩 Proteins</option>
              <option value="Pantry" selected>🥫 Pantry</option>
              <option value="Spices & Oils">🧂 Spices & Oils</option>
              <option value="Bakery">🍞 Bakery</option>
              <option value="Frozen">🧊 Frozen</option>
              <option value="Other">🧼 Other</option>
            </select>
            <button type="submit" class="btn btn-sm" style="padding: 0.65rem 1rem; font-weight: 600;">Add to Pantry</button>
          </form>
        </div>

        <!-- Search & Category Filter Pills -->
        <div style="margin-bottom: 1.25rem;">
          <div style="position: relative; margin-bottom: 0.75rem;">
            <input type="text" id="pantry-search-input" placeholder="🔍 Search pantry items..." oninput="PantryView.onSearchChange(this.value)" style="margin-bottom: 0; padding-left: 2.2rem; font-size: 0.9rem;">
            <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 0.9rem; pointer-events: none; opacity: 0.6;">🔍</span>
          </div>

          <div class="category-pills" id="pantry-category-pills" style="display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.35rem; scrollbar-width: none;">
            ${this.categories.map(cat => `
              <button type="button" class="category-pill ${cat.id === this.state.selectedCategory ? 'active' : ''}" onclick="PantryView.setCategoryFilter('${cat.id}')">
                <span>${cat.icon}</span> ${cat.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Inventory List Container -->
        <div id="pantry-inventory-container">
          ${Loader.render('Loading pantry inventory...')}
        </div>
      </div>
    `;
  },

  async init() {
    await this.loadPantry();
  },

  async loadPantry() {
    const container = document.getElementById('pantry-inventory-container');
    try {
      const data = await api.pantry.list();
      this.state.items = Array.isArray(data.items) ? data.items : [];
      this.state.updatedAt = data.updatedAt;
      this.renderInventory();
    } catch (e) {
      if (container) {
        container.innerHTML = `<p style="color: var(--danger);">Failed to load pantry: ${e.message}</p>`;
      }
    }
  },

  onSearchChange(query) {
    this.state.searchQuery = (query || '').trim().toLowerCase();
    this.renderInventory();
  },

  setCategoryFilter(catId) {
    this.state.selectedCategory = catId;
    document.querySelectorAll('#pantry-category-pills .category-pill').forEach(btn => {
      if (btn.innerText.includes(catId) || (catId === 'All' && btn.innerText.includes('All'))) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.renderInventory();
  },

  renderInventory() {
    const container = document.getElementById('pantry-inventory-container');
    const totalCountEl = document.getElementById('pantry-total-count');
    if (!container) return;

    const allItems = this.state.items || [];
    if (totalCountEl) {
      totalCountEl.innerText = `${allItems.length} ${allItems.length === 1 ? 'item' : 'items'}`;
    }

    if (allItems.length === 0) {
      container.innerHTML = `
        <div style="background: var(--surface); padding: 3rem 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 2.75rem; margin-bottom: 0.5rem;">🥫</div>
          <h3 style="margin-bottom: 0.5rem;">Your pantry is empty</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 460px; margin: 0 auto 1.5rem auto;">
            Snap a quick photo of your fridge, pantry shelves, or grocery haul to let Gemini automatically catalog what you have, or add items manually above.
          </p>
          <div style="display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-sm" style="background: linear-gradient(135deg, #00f0ff, #00a8ff); color: #090d16; font-weight: 700;" onclick="PantryView.triggerPhotoScan()">
              📷 Take / Upload Photo
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Filter items by category and search query
    let filtered = allItems;
    if (this.state.selectedCategory !== 'All') {
      filtered = filtered.filter(i => (i.category || 'Pantry').toLowerCase() === this.state.selectedCategory.toLowerCase());
    }

    if (this.state.searchQuery) {
      filtered = filtered.filter(i => {
        const nameMatch = (i.name || '').toLowerCase().includes(this.state.searchQuery);
        const qtyMatch = (i.quantity || '').toLowerCase().includes(this.state.searchQuery);
        const catMatch = (i.category || '').toLowerCase().includes(this.state.searchQuery);
        return nameMatch || qtyMatch || catMatch;
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="background: var(--surface); padding: 2rem 1.5rem; border-radius: 1rem; border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <p style="color: var(--text-secondary); margin: 0;">No items found matching your filter.</p>
        </div>
      `;
      return;
    }

    // Group filtered items by category
    const grouped = {};
    for (const item of filtered) {
      const cat = item.category || 'Pantry';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    let html = `<div class="grocery-categories-grid">`;

    for (const [catName, items] of Object.entries(grouped)) {
      html += `
        <div class="grocery-category-card">
          <div class="grocery-category-header">
            <h3>${catName}</h3>
            <span class="category-badge">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
          </div>
          <ul class="grocery-item-list">
            ${items.map(item => `
              <li class="grocery-item-row" style="cursor: default;">
                <div class="grocery-item-info" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 0.5rem;">
                  <div style="flex: 1; min-width: 0;">
                    <span class="grocery-item-name" style="font-weight: 500; font-size: 0.95rem; color: #f8fafc; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${item.name}
                    </span>
                    ${item.quantity ? `
                      <span class="pantry-item-qty-tag" onclick="PantryView.promptEditQuantity('${item.id}')" title="Click to edit quantity" style="font-size: 0.775rem; color: var(--accent-cyan); background: rgba(0, 240, 255, 0.08); padding: 0.15rem 0.45rem; border-radius: 0.35rem; cursor: pointer; display: inline-block; margin-top: 0.2rem;">
                        🏷️ ${item.quantity} ✏️
                      </span>
                    ` : `
                      <span class="pantry-item-qty-tag" onclick="PantryView.promptEditQuantity('${item.id}')" title="Click to add quantity" style="font-size: 0.75rem; color: var(--text-muted); cursor: pointer; display: inline-block; margin-top: 0.2rem;">
                        + add qty
                      </span>
                    `}
                  </div>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <button class="btn-remove-grocery-item" onclick="PantryView.deleteItem('${item.id}', '${item.name.replace(/'/g, "\\'")}')" title="Remove from pantry" style="color: var(--danger); font-size: 1rem; padding: 0.3rem 0.55rem;">
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  async addManualItem(e) {
    e.preventDefault();
    const nameInput = document.getElementById('pantry-item-name');
    const qtyInput = document.getElementById('pantry-item-qty');
    const catSelect = document.getElementById('pantry-item-category');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    if (!name) return;

    const quantity = qtyInput ? qtyInput.value.trim() : '';
    const category = catSelect ? catSelect.value : 'Pantry';

    try {
      const res = await api.pantry.add({ name, quantity, category });
      this.state.items = res.items || [];
      nameInput.value = '';
      if (qtyInput) qtyInput.value = '';
      this.renderInventory();
      Toast.show(`Added "${name}" to ${category}! 🥫`, 'success');
    } catch (err) {
      Toast.show(`Failed to add item: ${err.message}`, 'danger');
    }
  },

  async promptEditQuantity(itemId) {
    const item = (this.state.items || []).find(i => i.id === itemId);
    if (!item) return;

    const newQty = prompt(`Edit quantity or notes for "${item.name}":`, item.quantity || '');
    if (newQty === null) return; // User cancelled

    try {
      const res = await api.pantry.update(itemId, { quantity: newQty.trim() });
      this.state.items = res.items || [];
      this.renderInventory();
      Toast.show('Quantity updated', 'success');
    } catch (err) {
      Toast.show(`Update failed: ${err.message}`, 'danger');
    }
  },

  async deleteItem(itemId, itemName) {
    try {
      const res = await api.pantry.remove(itemId);
      this.state.items = res.items || [];
      this.renderInventory();
      Toast.show(`Removed "${itemName || 'item'}" from pantry`, 'info');
    } catch (err) {
      Toast.show(`Delete failed: ${err.message}`, 'danger');
    }
  },

  clearAllItems() {
    if (!this.state.items || this.state.items.length === 0) {
      Toast.show('Pantry is already empty.', 'info');
      return;
    }

    ConfirmModal.show({
      title: 'Clear Entire Pantry?',
      message: 'Are you sure you want to remove all items from your pantry inventory? This cannot be undone.',
      confirmText: 'Clear All Items',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await api.pantry.clearAll();
          this.state.items = res.items || [];
          this.renderInventory();
          Toast.show('Pantry cleared.', 'info');
        } catch (err) {
          Toast.show(`Clear failed: ${err.message}`, 'danger');
        }
      }
    });
  },

  triggerPhotoScan() {
    // If mobile or has camera support, prefer opening file input
    const input = document.getElementById('pantry-camera-input') || document.getElementById('pantry-file-input');
    if (input) {
      input.click();
    }
  },

  async handlePhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Reset input so same file can be re-selected if desired
    e.target.value = '';

    const progressEl = document.getElementById('pantry-scan-progress');
    const statusText = document.getElementById('pantry-scan-status-text');
    const detailsText = document.getElementById('pantry-scan-details');
    const scanBtn = document.getElementById('pantry-scan-btn');

    if (progressEl) progressEl.style.display = 'block';
    if (scanBtn) scanBtn.disabled = true;

    try {
      // 1. Client-Side Image Downscaling via Canvas
      if (statusText) statusText.innerText = '⚡ Downscaling photo for fast AI processing...';
      const originalMb = (file.size / (1024 * 1024)).toFixed(1);

      const downscaled = await Utils.downscaleImage(file, 1280, 0.80);
      const compressedKb = Math.round(downscaled.compressedSize / 1024);

      if (detailsText) {
        detailsText.innerText = `Original: ${originalMb} MB → Optimized: ${compressedKb} KB (${downscaled.width}×${downscaled.height}px). Sending to Gemini...`;
      }
      if (statusText) statusText.innerText = '🤖 Gemini AI analyzing photo...';

      // 2. Upload downscaled image buffer to server (processed in-memory, discarded immediately)
      const formData = new FormData();
      formData.append('image', downscaled.file);

      const scanResult = await api.pantry.scanImage(formData);
      const items = scanResult.detectedItems || [];

      if (progressEl) progressEl.style.display = 'none';
      if (scanBtn) scanBtn.disabled = false;

      if (items.length === 0) {
        Toast.show('No food items were recognized in the photo. Please try a clearer shot.', 'warning');
        return;
      }

      Toast.show(`Detected ${items.length} items! Verify and tweak below.`, 'success');
      this.openVerifyModal(items);
    } catch (err) {
      console.error('[PANTRY SCAN ERROR]', err);
      if (progressEl) progressEl.style.display = 'none';
      if (scanBtn) scanBtn.disabled = false;
      Toast.show(`AI scan failed: ${err.message}`, 'danger');
    }
  },

  openVerifyModal(detectedItems) {
    this.state.stagingItems = detectedItems.map((item, idx) => ({
      uid: `staged_${Date.now()}_${idx}`,
      checked: true,
      name: item.name || '',
      quantity: item.quantity || '',
      category: item.category || 'Pantry'
    }));

    this.renderVerifyModalRows();
    const modal = document.getElementById('pantry-verify-modal');
    if (modal) {
      modal.classList.add('open');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeVerifyModal() {
    const modal = document.getElementById('pantry-verify-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.state.stagingItems = [];
  },

  renderVerifyModalRows() {
    const listEl = document.getElementById('pantry-verify-list');
    const countBadge = document.getElementById('pantry-verify-count-badge');
    if (!listEl) return;

    const items = this.state.stagingItems || [];
    const checkedCount = items.filter(i => i.checked).length;

    if (countBadge) {
      countBadge.innerText = `${checkedCount} of ${items.length} selected`;
    }

    if (items.length === 0) {
      listEl.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No items to verify. Add an item below.</p>`;
      return;
    }

    listEl.innerHTML = items.map((item, idx) => `
      <div class="pantry-verify-row">
        <input type="checkbox" class="pantry-verify-checkbox" ${item.checked ? 'checked' : ''} onchange="PantryView.toggleStagingItemCheck('${item.uid}')">
        
        <input type="text" class="pantry-verify-name-input" value="${item.name.replace(/"/g, '&quot;')}" oninput="PantryView.updateStagingItem('${item.uid}', 'name', this.value)" placeholder="Item name">
        
        <div class="pantry-verify-row-sub">
          <input type="text" class="pantry-verify-qty-input" value="${(item.quantity || '').replace(/"/g, '&quot;')}" oninput="PantryView.updateStagingItem('${item.uid}', 'quantity', this.value)" placeholder="Qty/note">
          
          <select class="pantry-verify-cat-select" onchange="PantryView.updateStagingItem('${item.uid}', 'category', this.value)">
            <option value="Produce" ${item.category === 'Produce' ? 'selected' : ''}>🥦 Produce</option>
            <option value="Dairy" ${item.category === 'Dairy' ? 'selected' : ''}>🧀 Dairy</option>
            <option value="Proteins" ${item.category === 'Proteins' ? 'selected' : ''}>🥩 Proteins</option>
            <option value="Pantry" ${item.category === 'Pantry' ? 'selected' : ''}>🥫 Pantry</option>
            <option value="Spices & Oils" ${item.category === 'Spices & Oils' ? 'selected' : ''}>🧂 Spices</option>
            <option value="Bakery" ${item.category === 'Bakery' ? 'selected' : ''}>🍞 Bakery</option>
            <option value="Frozen" ${item.category === 'Frozen' ? 'selected' : ''}>🧊 Frozen</option>
            <option value="Other" ${item.category === 'Other' ? 'selected' : ''}>🧼 Other</option>
          </select>
        </div>

        <button type="button" class="btn-remove-grocery-item pantry-verify-del-btn" onclick="PantryView.removeStagingItem('${item.uid}')" title="Delete row">✕</button>
      </div>
    `).join('');
  },

  toggleStagingItemCheck(uid) {
    const item = (this.state.stagingItems || []).find(i => i.uid === uid);
    if (item) {
      item.checked = !item.checked;
      const countBadge = document.getElementById('pantry-verify-count-badge');
      if (countBadge) {
        const checkedCount = this.state.stagingItems.filter(i => i.checked).length;
        countBadge.innerText = `${checkedCount} of ${this.state.stagingItems.length} selected`;
      }
    }
  },

  updateStagingItem(uid, field, value) {
    const item = (this.state.stagingItems || []).find(i => i.uid === uid);
    if (item) {
      item[field] = value;
    }
  },

  removeStagingItem(uid) {
    this.state.stagingItems = (this.state.stagingItems || []).filter(i => i.uid !== uid);
    this.renderVerifyModalRows();
  },

  addStagingItem() {
    this.state.stagingItems.push({
      uid: `staged_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      checked: true,
      name: '',
      quantity: '',
      category: 'Pantry'
    });
    this.renderVerifyModalRows();
    // Focus last added input
    setTimeout(() => {
      const inputs = document.querySelectorAll('#pantry-verify-list input[type="text"]');
      if (inputs.length > 0) inputs[inputs.length - 2].focus();
    }, 50);
  },

  selectStagingAll(selectAll) {
    (this.state.stagingItems || []).forEach(i => i.checked = selectAll);
    this.renderVerifyModalRows();
  },

  async saveVerifiedItems() {
    const selected = (this.state.stagingItems || []).filter(i => i.checked && i.name.trim());
    if (selected.length === 0) {
      Toast.show('No items selected to save.', 'warning');
      return;
    }

    const payload = selected.map(i => ({
      name: i.name.trim(),
      quantity: (i.quantity || '').trim(),
      category: i.category || 'Pantry'
    }));

    try {
      const saveBtn = document.getElementById('pantry-verify-save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';
      }

      const res = await api.pantry.addBatch(payload);
      this.state.items = res.items || [];
      this.closeVerifyModal();
      this.renderInventory();
      Toast.show(`Saved ${payload.length} items to your Pantry! 🥫`, 'success');
    } catch (err) {
      Toast.show(`Failed to save items: ${err.message}`, 'danger');
    } finally {
      const saveBtn = document.getElementById('pantry-verify-save-btn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = '✓ Save Selected to Pantry';
      }
    }
  }
};

window.PantryView = PantryView;
