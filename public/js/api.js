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
      Toast.show(err.message);
      throw err;
    }
  },
  
  context: {
    get: () => api.request('/context'),
    update: (data) => api.request('/context', { method: 'PUT', body: data })
  },
  
  plan: {
    current: (weekOf) => api.request(`/plan/current${weekOf ? `?weekOf=${weekOf}` : ''}`),
    plans: () => api.request('/plan/plans'),
    addWeek: () => api.request('/plan/plans', { method: 'POST' }),
    deleteWeek: (weekOf) => api.request(`/plan/plans/${weekOf}`, { method: 'DELETE' }),
    history: () => api.request('/plan/history'),
    suggest: (weekOf, mealType) => api.request(`/plan/suggest${weekOf ? `?weekOf=${weekOf}` : ''}`, { method: 'POST', body: { mealType } }),
    decide: (decisions, weekOf) => api.request('/plan/decide', { method: 'POST', body: { decisions, weekOf } }),
    updateMealDays: (recipeId, assignedDays, mealType, weekOf) => api.request(`/plan/meals/${recipeId}/days`, { method: 'PUT', body: { assignedDays, mealType, weekOf } }),
    rollover: () => api.request('/plan/rollover', { method: 'POST' }),
    removeMeal: (recipeId, weekOf) => api.request(`/plan/meals/${recipeId}${weekOf ? `?weekOf=${weekOf}` : ''}`, { method: 'DELETE' })
  },

  grocery: {
    get: () => api.request('/grocery')
  },

  recipes: {
    list: () => api.request('/recipes'),
    get: (id) => api.request(`/recipes/${id}`),
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
      Toast.show(err.message);
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
      Toast.show(err.message);
      throw err;
    }),
    batchImportFolder: (folderPath) => api.request('/recipes/batch-import-folder', { method: 'POST', body: { folderPath } })
  }
};
