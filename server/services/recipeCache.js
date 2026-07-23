const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { recipeToMarkdown, markdownToRecipe } = require('../utils/markdown');
const slugify = require('../utils/slugify');
const matter = require('gray-matter');

class RecipeCache {
  async list() {
    try {
      const files = await fs.readdir(config.dataPaths.recipesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      const summaries = await Promise.all(mdFiles.map(async (file) => {
        const content = await fs.readFile(path.join(config.dataPaths.recipesDir, file), 'utf-8');
        return markdownToRecipe(content);
      }));
      return summaries;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async get(id) {
    try {
      const filePath = path.join(config.dataPaths.recipesDir, `${id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      return markdownToRecipe(content);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async save(recipe) {
    if (!recipe.id) {
      recipe.id = slugify(recipe.title);
    }
    
    // Ensure directory exists
    await fs.mkdir(config.dataPaths.recipesDir, { recursive: true });
    
    const mdContent = recipeToMarkdown(recipe);
    const filePath = path.join(config.dataPaths.recipesDir, `${recipe.id}.md`);
    await fs.writeFile(filePath, mdContent, 'utf-8');
    
    return recipe;
  }

  async remove(id) {
    try {
      const filePath = path.join(config.dataPaths.recipesDir, `${id}.md`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }
}

module.exports = new RecipeCache();
