const api = {
  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`/api${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'API Error');
      return data;
    } catch (err) {
      if (!options.silent) {
        Toast.show(err.message, 'danger');
      }
      throw err;
    }
  },
  
  context: {
    get: () => api.request('/context'),
    update: (data) => api.request('/context', { method: 'PUT', body: data }),
    models: () => api.request('/context/models')
  },

  system: {
    status: (fetchRemote = false) => api.request(`/system/status${fetchRemote ? '?fetch=true' : ''}`, { silent: true }),
    update: (force = false) => api.request('/system/update', { method: 'POST', body: { force, restart: true } })
  },
  
  plan: {
    current: (weekOf) => api.request(`/plan/current${weekOf ? `?weekOf=${weekOf}` : ''}`),
    plans: () => api.request('/plan/plans'),
    addWeek: (data) => api.request('/plan/plans', { method: 'POST', body: data }),
    updatePlan: (weekOf, data) => api.request(`/plan/plans/${weekOf}`, { method: 'PUT', body: data }),
    deleteWeek: (weekOf) => api.request(`/plan/plans/${weekOf}`, { method: 'DELETE' }),
    history: () => api.request('/plan/history'),
    suggest: (weekOf, mealType, customPrompt = '') => api.request(`/plan/suggest${weekOf ? `?weekOf=${weekOf}` : ''}`, { method: 'POST', body: { mealType, customPrompt } }),
    decide: (decisions, weekOf) => api.request('/plan/decide', { method: 'POST', body: { decisions, weekOf } }),
    updateMealDays: (recipeId, assignedDays, mealType, weekOf, multiplier = 1, servings = null) => api.request(`/plan/meals/${recipeId}/days`, { method: 'PUT', body: { assignedDays, mealType, weekOf, multiplier, servings } }),
    rollover: () => api.request('/plan/rollover', { method: 'POST' }),
    removeMeal: (recipeId, weekOf, day) => {
      const params = new URLSearchParams();
      if (weekOf) params.append('weekOf', weekOf);
      if (day) params.append('day', day);
      const query = params.toString() ? `?${params.toString()}` : '';
      return api.request(`/plan/meals/${recipeId}${query}`, { method: 'DELETE' });
    }
  },

  grocery: {
    get: (weeks) => api.request(`/grocery${weeks && weeks.length > 0 ? `?weeks=${weeks.join(',')}` : ''}`),
    getSaved: () => api.request('/grocery/saved', { silent: true }),
    save: (data) => api.request('/grocery/saved', { method: 'PUT', body: data, silent: true })
  },

  pantry: {
    list: () => api.request('/pantry'),
    add: (item) => api.request('/pantry', { method: 'POST', body: item }),
    addBatch: (items) => api.request('/pantry/batch', { method: 'POST', body: { items } }),
    update: (id, data) => api.request(`/pantry/${id}`, { method: 'PUT', body: data }),
    remove: (id) => api.request(`/pantry/${id}`, { method: 'DELETE' }),
    clearAll: () => api.request('/pantry', { method: 'DELETE' }),
    scanImage: (formData) => fetch('/api/pantry/scan-image', {
      method: 'POST',
      body: formData
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || data.error || 'Pantry scan failed');
      return data;
    }).catch(err => {
      Toast.show(err.message, 'danger');
      throw err;
    })
  },

  recipes: {
    list: () => api.request('/recipes'),
    get: (id) => api.request(`/recipes/${id}`),
    create: (data) => api.request('/recipes', { method: 'POST', body: data }),
    update: (id, data) => api.request(`/recipes/${id}`, { method: 'PUT', body: data }),
    delete: (id) => api.request(`/recipes/${id}`, { method: 'DELETE' }),
    importLink: (url) => api.request('/recipes/import-link', { method: 'POST', body: { url } }),
    importPdf: (formData) => fetch('/api/recipes/import-pdf', {
      method: 'POST',
      body: formData
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || data.error || 'Upload failed');
      return data;
    }).catch(err => {
      Toast.show(err.message, 'danger');
      throw err;
    }),
    importImage: (formData) => fetch('/api/recipes/import-image', {
      method: 'POST',
      body: formData
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || data.error || 'Photo import failed');
      return data;
    }).catch(err => {
      Toast.show(err.message, 'danger');
      throw err;
    }),
    batchImportPdf: (formData) => fetch('/api/recipes/batch-import-pdf', {
      method: 'POST',
      body: formData
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || data.error || 'Batch upload failed');
      return data;
    }).catch(err => {
      Toast.show(err.message, 'danger');
      throw err;
    }),
    batchImportFolder: (folderPath) => api.request('/recipes/batch-import-folder', { method: 'POST', body: { folderPath } })
  }
};
