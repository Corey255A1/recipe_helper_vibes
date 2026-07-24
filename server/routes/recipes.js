const express = require('express');
const router = express.Router();
const recipeCache = require('../services/recipeCache');
const gemini = require('../services/gemini');
const slugify = require('../utils/slugify');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const pdfParse = require('pdf-parse');

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

    const response = await fetch(url);
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

router.post('/batch-import-pdf', upload.array('pdfs', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No PDF files provided' });
    }

    const processed = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const saved = await processAndSavePdfRecipe(file.buffer, file.originalname);
        processed.push(saved);
      } catch (err) {
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

    for (const fileName of pdfFiles) {
      try {
        const filePath = path.join(targetDir, fileName);
        const buffer = await fs.readFile(filePath);
        
        const saved = await processAndSavePdfRecipe(buffer, fileName);
        processed.push(saved);
      } catch (err) {
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

// Standalone view endpoint for opening in its own window
router.get('/:id/view', async (req, res, next) => {
  try {
    const recipe = await recipeCache.get(req.params.id);
    if (!recipe) return res.status(404).send('<h1>Recipe Not Found</h1>');

    const tags = (recipe.tags || []).map(t => `<span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 0.25rem 0.65rem; border-radius: 1rem; font-size: 0.8rem; margin-right: 0.4rem; display: inline-block;">${t}</span>`).join('');
    const ingredients = (recipe.ingredients || []).map(i => `<li style="margin-bottom: 0.5rem; line-height: 1.5;">${i}</li>`).join('');
    const instructions = (recipe.instructions || []).map(i => `<li style="margin-bottom: 0.75rem; line-height: 1.6;">${i}</li>`).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${recipe.title} - Recipe Helper</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg: #0f172a;
            --surface: #1e293b;
            --border: #334155;
            --primary: #6366f1;
            --text: #f8fafc;
            --text-muted: #94a3b8;
          }
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 2rem 1.5rem;
            margin: 0;
            line-height: 1.6;
          }
          .container {
            max-width: 720px;
            margin: 0 auto;
            background: var(--surface);
            padding: 2.5rem;
            border-radius: 1.5rem;
            border: 1px solid var(--border);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          }
          h1 { font-size: 2rem; margin-top: 0; margin-bottom: 0.75rem; color: var(--text); }
          .meta { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap; }
          .meta span { background: rgba(255, 255, 255, 0.05); padding: 0.35rem 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.08); }
          h2 { font-size: 1.3rem; margin-top: 2rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; color: var(--primary); }
          ul, ol { padding-left: 1.5rem; }
          .print-btn { background: var(--primary); color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500; font-family: inherit; margin-bottom: 1.5rem; }
          .print-btn:hover { opacity: 0.9; }
          @media print { .print-btn { display: none; } body { background: #fff; color: #000; } .container { border: none; box-shadow: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <button class="print-btn" style="margin: 0;" onclick="window.print()">🖨️ Print / Save PDF</button>
            <button class="btn btn-outline" style="padding: 0.5rem 1rem; color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); background: transparent; border-radius: 0.5rem; cursor: pointer;" onclick="if(confirm('Are you sure you want to delete this recipe? This will delete the markdown file and associated PDF.')) { fetch('/api/recipes/${recipe.id}', {method: 'DELETE'}).then(res => { if(res.ok) { alert('Recipe deleted. You can close this window.'); window.close(); } else alert('Failed to delete'); }) }">🗑️ Delete Recipe</button>
          </div>
          <h1>${recipe.title}</h1>
          <div class="meta">
            <span>⏱️ Prep: ${recipe.prepTime || 0}m</span>
            <span>🔥 Cook: ${recipe.cookTime || 0}m</span>
            <span>🍽️ ${recipe.servings || 4} servings</span>
          </div>
          <div style="margin-bottom: 1.5rem;">${tags}</div>
          
          ${recipe.pdfPath ? `<p><a href="${recipe.pdfPath}" target="_blank" style="color: var(--primary);">📄 Open Original Uploaded PDF</a></p>` : ''}
          ${(recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))) ? `<p><a href="${recipe.source}" target="_blank" style="color: var(--primary);">🌐 View Original Web Source</a></p>` : ''}

          <h2>Ingredients</h2>
          <ul>${ingredients}</ul>

          <h2>Instructions</h2>
          <ol>${instructions}</ol>

          ${recipe.notes ? `<h2>Notes</h2><p style="color: var(--text-muted);">${recipe.notes}</p>` : ''}
        </div>
      </body>
      </html>
    `;
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
