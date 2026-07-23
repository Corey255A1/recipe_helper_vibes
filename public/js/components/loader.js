const Loader = {
  render(text = 'Loading...') {
    return `
      <div class="loader-container">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-muted);">${text}</p>
      </div>
    `;
  }
};
