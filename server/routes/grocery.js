const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');
const gemini = require('../services/gemini');
const recipeCache = require('../services/recipeCache');

function buildCopyText(categories) {
  let copyText = '';
  (categories || []).forEach(cat => {
    const uncheckedItems = (cat.items || []).filter(item => !item.checked);
    if (uncheckedItems.length === 0) return;
    copyText += `${cat.name.toUpperCase()}\n`;
    uncheckedItems.forEach(item => {
      const qty = item.quantity ? `${item.quantity} ` : '';
      copyText += `- ${qty}${item.ingredient}\n`;
    });
    copyText += '\n';
  });
  return copyText.trim();
}

async function readSavedGrocery() {
  try {
    const raw = await fs.readFile(config.dataPaths.grocery, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return { categories: [], weeks: [], copyText: '', updatedAt: null };
    }
    throw e;
  }
}

async function writeSavedGrocery(data) {
  data.copyText = buildCopyText(data.categories);
  data.updatedAt = new Date().toISOString();
  await fs.mkdir(config.dataPaths.dataDir, { recursive: true });
  await fs.writeFile(config.dataPaths.grocery, JSON.stringify(data, null, 2));
  return data;
}

router.get('/saved', async (req, res, next) => {
  try {
    const saved = await readSavedGrocery();
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.put('/saved', async (req, res, next) => {
  try {
    const payload = {
      categories: Array.isArray(req.body.categories) ? req.body.categories : [],
      weeks: Array.isArray(req.body.weeks) ? req.body.weeks : []
    };
    const saved = await writeSavedGrocery(payload);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const plansData = await fs.readFile(config.dataPaths.plans, 'utf-8');
    const plans = JSON.parse(plansData);

    let selectedPlans = [];
    if (req.query.weeks) {
      const weeks = req.query.weeks.split(',');
      selectedPlans = plans.filter(p => weeks.includes(p.weekOf));
    } else if (plans.length > 0) {
      selectedPlans = [plans[0]];
    }

    if (selectedPlans.length === 0) {
      return res.json({ categories: [], copyText: '', weeks: [] });
    }

    const scaleIngredient = (text, multiplier) => {
      if (!text || multiplier === 1) return text;
      const fractionMap = {
        '¼': 0.25, '½': 0.5, '¾': 0.75,
        '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
      };
      return text.replace(/^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?\s*[¼½¾⅓⅔⅛⅜⅝⅞]|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])/, (match, space, qtyStr) => {
        let val = 0;
        const trimmed = qtyStr.trim();
        if (fractionMap[trimmed]) {
          val = fractionMap[trimmed];
        } else if (/^\d+\s*[¼½¾⅓⅔⅛⅜⅝⅞]$/.test(trimmed)) {
          const whole = parseFloat(trimmed);
          const fracChar = trimmed.slice(-1);
          val = whole + (fractionMap[fracChar] || 0);
        } else if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
          const [whole, frac] = trimmed.split(/\s+/);
          const [num, den] = frac.split('/').map(Number);
          val = Number(whole) + (den ? num / den : 0);
        } else if (/^\d+\/\d+$/.test(trimmed)) {
          const [num, den] = trimmed.split('/').map(Number);
          val = den ? num / den : 0;
        } else {
          val = parseFloat(trimmed);
        }
        if (isNaN(val) || val <= 0) return match;
        const scaled = Math.round(val * multiplier * 100) / 100;
        return `${space}${scaled}`;
      });
    };

    const recipes = [];
    for (const plan of selectedPlans) {
      for (const meal of plan.meals) {
        const recipe = await recipeCache.get(meal.recipeId);
        if (recipe) {
          const mult = Number(meal.multiplier) || 1;
          const srv = Number(meal.servings) || (recipe.servings ? Math.round(recipe.servings * mult) : 4);
          if (mult !== 1) {
            recipes.push({
              ...recipe,
              servings: srv,
              multiplier: mult,
              ingredients: (recipe.ingredients || []).map(ing => scaleIngredient(ing, mult))
            });
          } else {
            recipes.push(recipe);
          }
        }
      }
    }

    let context;
    try {
      const contextData = await fs.readFile(config.dataPaths.context, 'utf-8');
      context = JSON.parse(contextData);
    } catch (e) {
      context = { servings: 2 };
    }

    // Preserve any existing custom items if user regenerates
    const previousList = await readSavedGrocery().catch(() => ({ categories: [] }));
    const customItemsByCat = {};
    (previousList.categories || []).forEach(cat => {
      (cat.items || []).forEach(item => {
        if (item.isCustom && !item.checked) {
          if (!customItemsByCat[cat.name]) customItemsByCat[cat.name] = [];
          customItemsByCat[cat.name].push(item);
        }
      });
    });

    let groceryList = { categories: [] };
    if (recipes.length > 0) {
      groceryList = await gemini.generateGroceryList(recipes, context);
    }

    // Enrich items with unique IDs and checked state
    let itemCounter = 1;
    (groceryList.categories || []).forEach(cat => {
      cat.items = (cat.items || []).map(item => ({
        id: `item_${Date.now()}_${itemCounter++}`,
        ingredient: item.ingredient,
        quantity: item.quantity || '',
        fromRecipes: item.fromRecipes || [],
        checked: false,
        isCustom: false
      }));
    });

    // Re-attach unchecked custom items
    for (const [catName, customItems] of Object.entries(customItemsByCat)) {
      let targetCat = groceryList.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (!targetCat) {
        targetCat = { name: catName, items: [] };
        groceryList.categories.push(targetCat);
      }
      targetCat.items.push(...customItems);
    }

    groceryList.weeks = selectedPlans.map(p => p.weekOf);
    const saved = await writeSavedGrocery(groceryList);

    res.json(saved);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
