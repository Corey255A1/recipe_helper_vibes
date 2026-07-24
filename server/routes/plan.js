const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');
const gemini = require('../services/gemini');
const recipeCache = require('../services/recipeCache');
const historyService = require('../services/history');

async function getCurrentWeek() {
  try {
    const data = await fs.readFile(config.dataPaths.currentWeek, 'utf-8');
    let currentWeek = JSON.parse(data);

    // Auto-rollover if 7 days have passed
    const weekOfDate = new Date(currentWeek.weekOf);
    const now = new Date();
    const diffDays = Math.floor((now - weekOfDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 7) {
      if (currentWeek.meals.length > 0) {
        await historyService.addWeek({
          weekOf: currentWeek.weekOf,
          meals: currentWeek.meals
        });
      }
      currentWeek = {
        weekOf: now.toISOString().split('T')[0],
        status: 'in_progress',
        meals: [],
        pendingSuggestions: [],
        groceryListGenerated: false
      };
      await fs.writeFile(config.dataPaths.currentWeek, JSON.stringify(currentWeek, null, 2));
    }

    return currentWeek;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        weekOf: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        meals: [],
        pendingSuggestions: [],
        groceryListGenerated: false
      };
    }
    throw error;
  }
}

async function saveCurrentWeek(data) {
  await fs.writeFile(config.dataPaths.currentWeek, JSON.stringify(data, null, 2));
}

router.get('/current', async (req, res, next) => {
  try {
    res.json(await getCurrentWeek());
  } catch (error) {
    next(error);
  }
});

router.post('/suggest', async (req, res, next) => {
  try {
    let context;
    try {
      const contextData = await fs.readFile(config.dataPaths.context, 'utf-8');
      context = JSON.parse(contextData);
    } catch(e) {
      return res.status(400).json({ error: "Context not set. Please set context first." });
    }

    const currentWeek = await getCurrentWeek();
    const neededMeals = context.mealsPerWeek - currentWeek.meals.length;

    if (neededMeals <= 0) {
      return res.status(400).json({ error: "Week is already fully planned." });
    }

    const history = await historyService.getHistory();
    const cacheSummaries = await recipeCache.list();

    const suggestions = await gemini.generateSuggestions(context, history, cacheSummaries, neededMeals);
    
    currentWeek.pendingSuggestions = suggestions;
    await saveCurrentWeek(currentWeek);

    res.json(suggestions);
  } catch (error) {
    next(error);
  }
});

router.post('/decide', async (req, res, next) => {
  try {
    const { decisions } = req.body;
    const currentWeek = await getCurrentWeek();
    
    for (const d of decisions) {
      let suggestion = currentWeek.pendingSuggestions.find(s => s.id === d.recipeId);
      let isCached = false;
      if (!suggestion) {
        suggestion = await recipeCache.get(d.recipeId);
        isCached = true;
      }
      if (!suggestion) continue;

      if (!isCached && (d.decision === 'yes' || d.decision === 'not_this_time')) {
        await recipeCache.save(suggestion);
      }

      const existingMeal = currentWeek.meals.find(m => m.recipeId === (suggestion ? suggestion.id : d.recipeId));
      if (existingMeal) {
        existingMeal.assignedDays = d.assignedDays || [];
      } else if (d.decision === 'yes' && suggestion) {
        currentWeek.meals.push({
          recipeId: suggestion.id,
          assignedDays: d.assignedDays || [],
          servings: suggestion.servings
        });
      }
    }

    // Remove the processed suggestions from pending
    const decidedIds = decisions.map(d => d.recipeId);
    currentWeek.pendingSuggestions = currentWeek.pendingSuggestions.filter(s => !decidedIds.includes(s.id));
    
    await saveCurrentWeek(currentWeek);
    res.json(currentWeek);
  } catch (error) {
    next(error);
  }
});

router.put('/meals/:recipeId/days', async (req, res, next) => {
  try {
    const { assignedDays } = req.body;
    const currentWeek = await getCurrentWeek();
    const meal = currentWeek.meals.find(m => m.recipeId === req.params.recipeId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found in current plan' });
    }
    meal.assignedDays = assignedDays || [];
    await saveCurrentWeek(currentWeek);
    res.json(currentWeek);
  } catch (error) {
    next(error);
  }
});

router.delete('/meals/:recipeId', async (req, res, next) => {
  try {
    const currentWeek = await getCurrentWeek();
    currentWeek.meals = currentWeek.meals.filter(m => m.recipeId !== req.params.recipeId);
    await saveCurrentWeek(currentWeek);
    res.json(currentWeek);
  } catch (error) {
    next(error);
  }
});

router.post('/rollover', async (req, res, next) => {
  try {
    const currentWeek = await getCurrentWeek();
    
    if (currentWeek.meals.length > 0) {
      await historyService.addWeek({
        weekOf: currentWeek.weekOf,
        meals: currentWeek.meals
      });
    }

    const newWeek = {
      weekOf: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      meals: [],
      pendingSuggestions: [],
      groceryListGenerated: false
    };
    await saveCurrentWeek(newWeek);
    
    res.json({ success: true, week: newWeek });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const history = await historyService.getHistory();
    res.json(history);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
