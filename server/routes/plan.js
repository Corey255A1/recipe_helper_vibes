const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');
const gemini = require('../services/gemini');
const recipeCache = require('../services/recipeCache');
const historyService = require('../services/history');

async function getPlans() {
  try {
    const data = await fs.readFile(config.dataPaths.plans, 'utf-8');
    let plans = JSON.parse(data);
    if (!Array.isArray(plans)) plans = [plans];

    // Auto-rollover if 7 days have passed from the END of the week
    let changed = false;
    const now = new Date();
    now.setHours(0,0,0,0);
    
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const weekOfDate = new Date(p.weekOf);
      const diffDays = Math.floor((now - weekOfDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 7) {
        if (p.meals.length > 0) {
          await historyService.addWeek({
            weekOf: p.weekOf,
            meals: p.meals
          });
        }
        plans.splice(i, 1);
        i--;
        changed = true;
      }
    }

    if (plans.length === 0) {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      plans.push({
        weekOf: monday.toISOString().split('T')[0],
        status: 'in_progress',
        meals: [],
        pendingSuggestions: [],
        groceryListGenerated: false
      });
      changed = true;
    }

    if (changed) {
      await savePlans(plans);
    }
    
    // Sort plans chronologically
    plans.sort((a, b) => new Date(a.weekOf) - new Date(b.weekOf));

    return plans;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const plans = [{
        weekOf: monday.toISOString().split('T')[0],
        status: 'in_progress',
        meals: [],
        pendingSuggestions: [],
        groceryListGenerated: false
      }];
      await savePlans(plans);
      return plans;
    }
    throw error;
  }
}

async function savePlans(plans) {
  plans.sort((a, b) => new Date(a.weekOf) - new Date(b.weekOf));
  await fs.mkdir(config.dataPaths.dataDir, { recursive: true });
  await fs.writeFile(config.dataPaths.plans, JSON.stringify(plans, null, 2));
}

// Ensure backward compatibility: return earliest active week if no weekOf provided
async function getTargetWeek(weekOf) {
  const plans = await getPlans();
  if (weekOf) {
    return plans.find(p => p.weekOf === weekOf) || plans[0];
  }
  return plans[0];
}

async function getPlansAndTargetWeek(weekOf) {
  const plans = await getPlans();
  const targetWeek = weekOf ? plans.find(p => p.weekOf === weekOf) : plans[0];
  return { plans, targetWeek };
}

router.get('/plans', async (req, res, next) => {
  try {
    res.json(await getPlans());
  } catch (error) {
    next(error);
  }
});

router.post('/plans', async (req, res, next) => {
  try {
    const plans = await getPlans();
    // Get the last week in the plans array
    const lastPlan = plans[plans.length - 1];
    const lastDate = new Date(lastPlan.weekOf);
    // Add 7 days
    const nextWeekDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const newWeek = {
      weekOf: nextWeekDate.toISOString().split('T')[0],
      status: 'in_progress',
      meals: [],
      pendingSuggestions: [],
      groceryListGenerated: false
    };
    
    plans.push(newWeek);
    await savePlans(plans);
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

router.delete('/plans/:weekOf', async (req, res, next) => {
  try {
    let plans = await getPlans();
    if (plans.length <= 1) {
      return res.status(400).json({ error: "Cannot delete the only active week plan." });
    }
    const index = plans.findIndex(p => p.weekOf === req.params.weekOf);
    if (index === -1) {
      return res.status(404).json({ error: "Week plan not found." });
    }
    plans.splice(index, 1);
    await savePlans(plans);
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

router.get('/current', async (req, res, next) => {
  try {
    const week = await getTargetWeek(req.query.weekOf);
    res.json(week);
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

    const { plans, targetWeek } = await getPlansAndTargetWeek(req.query.weekOf);
    if (!targetWeek) return res.status(404).json({ error: "Week not found." });

    const neededMeals = context.mealsPerWeek - targetWeek.meals.length;
    if (neededMeals <= 0) {
      return res.status(400).json({ error: "Week is already fully planned." });
    }

    const history = await historyService.getHistory();
    const cacheSummaries = await recipeCache.list();
    
    // Add category/mealType context to suggestion if provided
    const mealType = req.body.mealType || '';

    const suggestions = await gemini.generateSuggestions(context, history, cacheSummaries, neededMeals, mealType);
    
    targetWeek.pendingSuggestions = suggestions;
    await savePlans(plans);

    res.json(suggestions);
  } catch (error) {
    next(error);
  }
});

router.post('/decide', async (req, res, next) => {
  try {
    const { decisions, weekOf } = req.body;
    const { plans, targetWeek } = await getPlansAndTargetWeek(weekOf);
    if (!targetWeek) return res.status(404).json({ error: "Week not found." });
    
    for (const d of decisions) {
      let suggestion = targetWeek.pendingSuggestions.find(s => s.id === d.recipeId);
      let isCached = false;
      if (!suggestion) {
        suggestion = await recipeCache.get(d.recipeId);
        isCached = true;
      }
      if (!suggestion) continue;

      if (!isCached && (d.decision === 'yes' || d.decision === 'not_this_time')) {
        await recipeCache.save(suggestion);
      }

      const existingMeal = targetWeek.meals.find(m => m.recipeId === (suggestion ? suggestion.id : d.recipeId));
      if (existingMeal) {
        existingMeal.assignedDays = d.assignedDays || [];
        if (d.mealType) existingMeal.mealType = d.mealType;
      } else if (d.decision === 'yes' && suggestion) {
        targetWeek.meals.push({
          recipeId: suggestion.id,
          assignedDays: d.assignedDays || [],
          servings: suggestion.servings,
          mealType: d.mealType || 'Dinner'
        });
      }
    }

    const decidedIds = decisions.map(d => d.recipeId);
    targetWeek.pendingSuggestions = targetWeek.pendingSuggestions.filter(s => !decidedIds.includes(s.id));
    
    await savePlans(plans);
    res.json(targetWeek);
  } catch (error) {
    next(error);
  }
});

router.put('/meals/:recipeId/days', async (req, res, next) => {
  try {
    const { assignedDays, mealType, weekOf } = req.body;
    const { plans, targetWeek } = await getPlansAndTargetWeek(weekOf);
    if (!targetWeek) return res.status(404).json({ error: "Week not found." });

    const meal = targetWeek.meals.find(m => m.recipeId === req.params.recipeId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found in specified week' });
    }
    
    if (assignedDays) meal.assignedDays = assignedDays;
    if (mealType) meal.mealType = mealType;
    
    await savePlans(plans);
    res.json(targetWeek);
  } catch (error) {
    next(error);
  }
});

router.delete('/meals/:recipeId', async (req, res, next) => {
  try {
    const weekOf = req.query.weekOf;
    const dayToRemove = req.query.day;
    const { plans, targetWeek } = await getPlansAndTargetWeek(weekOf);
    if (!targetWeek) return res.status(404).json({ error: "Week not found." });

    const mealIndex = targetWeek.meals.findIndex(m => m.recipeId === req.params.recipeId);
    if (mealIndex !== -1) {
      const meal = targetWeek.meals[mealIndex];
      if (dayToRemove && meal.assignedDays && meal.assignedDays.length > 1) {
        meal.assignedDays = meal.assignedDays.filter(d => d !== dayToRemove);
      } else {
        targetWeek.meals.splice(mealIndex, 1);
      }
    }
    
    await savePlans(plans);
    res.json(targetWeek);
  } catch (error) {
    next(error);
  }
});

router.post('/rollover', async (req, res, next) => {
  try {
    // Rollover can just be handled by getPlans auto-archiving. 
    // We'll keep this endpoint for manual testing or explicit manual rollover.
    const plans = await getPlans();
    const oldWeek = plans.shift();
    
    if (oldWeek && oldWeek.meals.length > 0) {
      await historyService.addWeek({
        weekOf: oldWeek.weekOf,
        meals: oldWeek.meals
      });
    }

    await savePlans(plans);
    res.json({ success: true, plans: await getPlans() });
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
