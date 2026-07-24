const Utils = {
  sortRecipes(recipes, sortMode) {
    recipes.sort((a, b) => {
      if (sortMode === 'recent') {
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      } else if (sortMode === 'oldest') {
        return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
      } else if (sortMode === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  },
  updateViewModeButtons(mode, gridBtnId, listBtnId) {
    const btnGrid = document.getElementById(gridBtnId);
    const btnList = document.getElementById(listBtnId);
    if (btnGrid && btnList) {
      if (mode === 'grid') {
        btnGrid.className = 'btn';
        btnList.className = 'btn btn-outline';
      } else {
        btnGrid.className = 'btn btn-outline';
        btnList.className = 'btn';
      }
    }
  },
  getDayDate(weekOfStr, dayIndex) {
    if (!weekOfStr) return '';
    try {
      const startDate = new Date(weekOfStr + 'T00:00:00');
      const dayDate = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
      return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch(e) {
      return '';
    }
  }
};
