const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');
const gemini = require('../services/gemini');
const recipeCache = require('../services/recipeCache');

router.get('/', async (req, res, next) => {
  try {
    const currentWeekData = await fs.readFile(config.dataPaths.currentWeek, 'utf-8');
    const currentWeek = JSON.parse(currentWeekData);

    const recipes = [];
    for (const meal of currentWeek.meals) {
      const recipe = await recipeCache.get(meal.recipeId);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    let context;
    try {
      const contextData = await fs.readFile(config.dataPaths.context, 'utf-8');
      context = JSON.parse(contextData);
    } catch(e) {
      context = { servings: 2 };
    }

    const groceryList = await gemini.generateGroceryList(recipes, context);
    
    // Generate copy text
    let copyText = '';
    groceryList.categories.forEach(cat => {
      copyText += `${cat.name.toUpperCase()}\n`;
      cat.items.forEach(item => {
        copyText += `- ${item.quantity} ${item.ingredient}\n`;
      });
      copyText += '\n';
    });

    groceryList.weekOf = currentWeek.weekOf;
    groceryList.copyText = copyText;

    res.json(groceryList);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
