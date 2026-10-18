const express = require('express');
const router = express.Router();
const recipeCache = require('../services/recipeCache');
const gemini = require('../services/gemini');
const slugify = require('../utils/slugify');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function processAndSavePdfRecipe(buffer, originalname) {
  const recipe = await gemini.extractRecipeFromPdf(buffer, originalname);
  recipe.id = slugify(recipe.title);
  recipe.pdfPath = `/api/recipes/${recipe.id}/pdf`;

  const pdfDest = path.join(config.dataPaths.recipesDir, `${recipe.id}.pdf`);
  await fs.mkdir(config.dataPaths.recipesDir, { recursive: true });
  await fs.writeFile(pdfDest, buffer);

  return await recipeCache.save(recipe);
}

router.get('/', async (req, res, next) => {
  try {
    const summaries = await recipeCache.list();
    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

// Create a new recipe manually
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: 'Recipe title is required' });
    }
    const id = body.id || slugify(body.title);
    const prepTime = Number(body.prepTime) || 0;
    const cookTime = Number(body.cookTime) || 0;
    const recipe = {
      id,
      title: body.title.trim(),
      prepTime,
      cookTime,
      totalTime: Number(body.totalTime) || (prepTime + cookTime) || 20,
      servings: Number(body.servings) || 4,
      tags: Array.isArray(body.tags) ? body.tags : [],
      source: body.source || 'manual',
      favorite: Boolean(body.favorite),
      rating: body.rating || null,
      ingredients: Array.isArray(body.ingredients) ? body.ingredients.filter(Boolean) : [],
      instructions: Array.isArray(body.instructions) ? body.instructions.filter(Boolean) : [],
      notes: body.notes || '',
      addedAt: new Date().toISOString()
    };
    const saved = await recipeCache.save(recipe);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

// Serve PDF endpoint
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const pdfPath = path.join(config.dataPaths.recipesDir, `${req.params.id}.pdf`);
    await fs.access(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(pdfPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'PDF not found' });
    } else {
      next(error);
    }
  }
});

router.post('/import-link', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeHelper/1.0)'
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch page: ${response.statusText}`);
    const html = await response.text();

    // Clean html to extract text
    const cleanText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const recipe = await gemini.extractRecipeFromText(cleanText, url);
    const saved = await recipeCache.save(recipe);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.post('/import-pdf', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    const saved = await processAndSavePdfRecipe(req.file.buffer, req.file.originalname);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.post('/import-image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    const recipe = await gemini.extractRecipeFromImage(
      req.file.buffer,
      req.file.mimetype || 'image/jpeg',
      req.file.originalname || 'photo'
    );
    recipe.id = slugify(recipe.title);
    const saved = await recipeCache.save(recipe);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

router.post('/batch-import-pdf', upload.array('pdfs', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No PDF files provided' });
    }

    const processed = [];
    const errors = [];

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      if (i > 0) {
        await delay(4000);
      }
      try {
        console.log(`[BATCH UPLOAD] Processing PDF ${i + 1}/${req.files.length}: ${file.originalname}`);
        const saved = await processAndSavePdfRecipe(file.buffer, file.originalname);
        processed.push(saved);
      } catch (err) {
        console.error(`[BATCH UPLOAD ERROR] ${file.originalname}:`, err.message);
        errors.push({ file: file.originalname, error: err.message });
      }
    }

    res.json({ processed, errors });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-import-folder', async (req, res, next) => {
  try {
    const { folderPath } = req.body;
    const targetDir = folderPath || path.join(config.dataPaths.dataDir, 'unparsed');
    
    try {
      await fs.access(targetDir);
    } catch (e) {
      return res.status(404).json({ error: `Folder not found: ${targetDir}` });
    }

    const files = await fs.readdir(targetDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      return res.json({ message: 'No PDF files found in specified directory.', processed: [], errors: [] });
    }

    const processed = [];
    const errors = [];

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < pdfFiles.length; i++) {
      const fileName = pdfFiles[i];
      if (i > 0) {
        await delay(4000);
      }
      try {
        console.log(`[BATCH FOLDER] Processing PDF ${i + 1}/${pdfFiles.length}: ${fileName}`);
        const filePath = path.join(targetDir, fileName);
        const buffer = await fs.readFile(filePath);
        
        const saved = await processAndSavePdfRecipe(buffer, fileName);
        processed.push(saved);
      } catch (err) {
        console.error(`[BATCH FOLDER ERROR] ${fileName}:`, err.message);
        errors.push({ file: fileName, error: err.message });
      }
    }

    res.json({ processed, errors });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const recipe = await recipeCache.get(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await recipeCache.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const body = req.body || {};
    const prepTime = body.prepTime !== undefined ? Number(body.prepTime) : existing.prepTime;
    const cookTime = body.cookTime !== undefined ? Number(body.cookTime) : existing.cookTime;

    const updated = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() : existing.title,
      prepTime,
      cookTime,
      totalTime: body.totalTime !== undefined ? Number(body.totalTime) : ((prepTime + cookTime) || existing.totalTime),
      servings: body.servings !== undefined ? Number(body.servings) : existing.servings,
      tags: body.tags !== undefined ? body.tags : existing.tags,
      source: body.source !== undefined ? body.source : existing.source,
      favorite: body.favorite !== undefined ? Boolean(body.favorite) : Boolean(existing.favorite),
      rating: body.rating !== undefined ? body.rating : existing.rating,
      ingredients: body.ingredients !== undefined ? body.ingredients : existing.ingredients,
      instructions: body.instructions !== undefined ? body.instructions : existing.instructions,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      id: existing.id
    };

    const saved = await recipeCache.save(updated);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// Standalone view endpoint for opening in its own window or popout
router.get('/:id/view', async (req, res, next) => {
  try {
    const recipe = await recipeCache.get(req.params.id);
    if (!recipe) return res.status(404).send('<h1>Recipe Not Found</h1>');

    const serializedRecipe = JSON.stringify(recipe).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#090d16">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>${recipe.title} - Recipe Helper</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="popout-body">
  <div class="popout-container">
    <div id="popout-recipe-container"></div>
  </div>

  <!-- Floating Cook Timer Bar -->
  <div id="cook-timer-bar" class="cook-timer-bar" style="display: none;">
    <div class="cook-timer-info">
      <span class="cook-timer-icon">⏱️</span>
      <div>
        <div id="cook-timer-label" class="cook-timer-label">Cooking Timer</div>
        <div id="cook-timer-display" class="cook-timer-display">00:00</div>
      </div>
    </div>
    <div class="cook-timer-actions">
      <button class="btn btn-outline btn-sm" id="cook-timer-pause-btn" onclick="RecipeCard.togglePauseTimer()">Pause</button>
      <button class="btn btn-outline btn-sm" onclick="RecipeCard.addTimerMinute()">+1m</button>
      <button class="btn btn-sm" style="background: var(--danger);" onclick="RecipeCard.stopTimer()">✕</button>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toast-container" class="toast-container"></div>

  <!-- Shared Scripts -->
  <script src="/js/utils.js"></script>
  <script src="/js/components/toast.js"></script>
  <script src="/js/components/recipeCard.js"></script>
  <script>
    const RECIPE_DATA = ${serializedRecipe};
    document.addEventListener('DOMContentLoaded', () => {
      RecipeCard.initStandalone(RECIPE_DATA);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    // Also remove PDF if it exists
    try {
      const pdfPath = path.join(config.dataPaths.recipesDir, `${req.params.id}.pdf`);
      await fs.unlink(pdfPath);
    } catch (e) {
      // PDF might not exist, ignore
    }

    const success = await recipeCache.remove(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
