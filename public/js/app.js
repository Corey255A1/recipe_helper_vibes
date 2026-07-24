const App = {
  views: {
    context: ContextView,
    plan: PlanView,
    grocery: GroceryView,
    recipes: RecipesView
  },
  
  async init() {
    // Render all views into DOM (hidden by default)
    const root = document.getElementById('app-root');
    for (const [name, view] of Object.entries(this.views)) {
      const html = await view.render();
      root.insertAdjacentHTML('beforeend', html);
    }
    
    // Set up navigation
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        const route = e.target.dataset.route;
        if (route) {
          e.preventDefault();
          this.navigate(route);
          history.pushState({ route }, '', route === 'context' ? '/' : `#${route}`);
        }
      });
    });
    
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.route) {
        this.navigate(e.state.route);
      }
    });

    // Determine initial route
    const hash = window.location.hash.replace('#', '');
    this.navigate(this.views[hash] ? hash : 'context');
  },
  
  async navigate(route) {
    // Update active nav link
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`nav a[data-route="${route}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    // Show correct view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${route}-view`).classList.add('active');
    
    // Initialize view data
    if (this.views[route] && this.views[route].init) {
      await this.views[route].init();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
