const App = {
  views: {
    context: ContextView,
    plan: PlanView,
    pantry: PantryView,
    grocery: GroceryView,
    recipes: RecipesView,
    matrix: MatrixView
  },
  
  async init() {
    // Render all views into DOM (hidden by default)
    const root = document.getElementById('app-root');
    for (const [name, view] of Object.entries(this.views)) {
      const html = await view.render();
      root.insertAdjacentHTML('beforeend', html);
    }
    
    // Set up navigation on both desktop top nav and mobile bottom nav
    document.querySelectorAll('nav a[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        const route = e.currentTarget.dataset.route;
        if (route) {
          e.preventDefault();
          this.navigate(route);
          history.pushState({ route }, '', route === 'recipes' ? '/' : `#${route}`);
        }
      });
    });
    
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.route) {
        this.navigate(e.state.route);
      } else {
        const hash = window.location.hash.replace('#', '');
        this.navigate(this.views[hash] ? hash : 'recipes');
      }
    });

    // Determine initial route
    const hash = window.location.hash.replace('#', '');
    await this.navigate(this.views[hash] ? hash : 'recipes');

    // Update mobile grocery badge in background
    if (window.GroceryView && GroceryView.updateMobileBadge) {
      GroceryView.updateMobileBadge();
    }
  },
  
  async navigate(route) {
    // Update active link on both desktop and mobile navs
    document.querySelectorAll('nav a[data-route]').forEach(a => {
      if (a.dataset.route === route) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
    
    // Show correct view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetViewEl = document.getElementById(`${route}-view`);
    if (targetViewEl) targetViewEl.classList.add('active');
    document.body.className = `route-${route}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Initialize view data
    if (this.views[route] && this.views[route].init) {
      await this.views[route].init();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
