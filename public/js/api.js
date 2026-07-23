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
    current: () => api.request('/plan/current'),
    history: () => api.request('/plan/history'),
    suggest: () => api.request('/plan/suggest', { method: 'POST' }),
    decide: (decisions) => api.request('/plan/decide', { method: 'POST', body: { decisions } }),
    rollover: () => api.request('/plan/rollover', { method: 'POST' }),
    removeMeal: (recipeId) => api.request(`/plan/meals/${recipeId}`, { method: 'DELETE' })
  },

  grocery: {
    get: () => api.request('/grocery')
  },

  recipes: {
    list: () => api.request('/recipes'),
    get: (id) => api.request(`/recipes/${id}`),
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
    })
  }
};
