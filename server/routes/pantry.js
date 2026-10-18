const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const config = require('../config');
const gemini = require('../services/gemini');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

function normalizeItemName(name) {
  return (name || '').trim().toLowerCase();
}

async function readPantry() {
  try {
    const raw = await fs.readFile(config.dataPaths.pantry, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) {
      data.items = [];
    }
    return data;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return { items: [], updatedAt: null };
    }
    throw e;
  }
}

async function writePantry(data) {
  data.updatedAt = new Date().toISOString();
  await fs.mkdir(config.dataPaths.dataDir, { recursive: true });
  await fs.writeFile(config.dataPaths.pantry, JSON.stringify(data, null, 2));
  return data;
}

// GET all pantry items
router.get('/', async (req, res, next) => {
  try {
    const pantry = await readPantry();
    res.json(pantry);
  } catch (error) {
    next(error);
  }
});

// POST single manual pantry item
router.post('/', async (req, res, next) => {
  try {
    const { name, quantity, category } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const pantry = await readPantry();
    const cleanName = name.trim();
    const cleanQty = (quantity || '').trim();
    const cleanCat = (category || 'Pantry').trim();

    // Check if item already exists by normalized name
    const norm = normalizeItemName(cleanName);
    const existingIdx = pantry.items.findIndex(i => normalizeItemName(i.name) === norm);

    let savedItem;
    if (existingIdx !== -1) {
      // Update existing item
      pantry.items[existingIdx].name = cleanName;
      if (cleanQty) pantry.items[existingIdx].quantity = cleanQty;
      if (cleanCat) pantry.items[existingIdx].category = cleanCat;
      pantry.items[existingIdx].updatedAt = new Date().toISOString();
      savedItem = pantry.items[existingIdx];
    } else {
      // Create new item
      savedItem = {
        id: `pantry_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: cleanName,
        quantity: cleanQty,
        category: cleanCat,
        addedAt: new Date().toISOString()
      };
      pantry.items.unshift(savedItem);
    }

    const updated = await writePantry(pantry);
    res.status(201).json({ item: savedItem, ...updated });
  } catch (error) {
    next(error);
  }
});

// POST batch pantry items (from AI detection verification modal)
router.post('/batch', async (req, res, next) => {
  try {
    const incomingItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (incomingItems.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const pantry = await readPantry();
    let addedCount = 0;
    let updatedCount = 0;

    for (const rawItem of incomingItems) {
      const cleanName = (rawItem.name || '').trim();
      if (!cleanName) continue;

      const cleanQty = (rawItem.quantity || '').trim();
      const cleanCat = (rawItem.category || 'Pantry').trim();
      const norm = normalizeItemName(cleanName);

      const existingIdx = pantry.items.findIndex(i => normalizeItemName(i.name) === norm);
      if (existingIdx !== -1) {
        if (cleanQty) pantry.items[existingIdx].quantity = cleanQty;
        if (cleanCat) pantry.items[existingIdx].category = cleanCat;
        pantry.items[existingIdx].updatedAt = new Date().toISOString();
        updatedCount++;
      } else {
        pantry.items.unshift({
          id: `pantry_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: cleanName,
          quantity: cleanQty,
          category: cleanCat,
          addedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }

    const updated = await writePantry(pantry);
    res.json({ addedCount, updatedCount, ...updated });
  } catch (error) {
    next(error);
  }
});

// PUT update existing pantry item
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, quantity, category } = req.body || {};

    const pantry = await readPantry();
    const item = pantry.items.find(i => i.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }

    if (name !== undefined && name.trim()) item.name = name.trim();
    if (quantity !== undefined) item.quantity = (quantity || '').trim();
    if (category !== undefined && category.trim()) item.category = category.trim();
    item.updatedAt = new Date().toISOString();

    const updated = await writePantry(pantry);
    res.json({ item, ...updated });
  } catch (error) {
    next(error);
  }
});

// DELETE single pantry item by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pantry = await readPantry();
    const initialLen = pantry.items.length;
    pantry.items = pantry.items.filter(i => i.id !== id);

    if (pantry.items.length === initialLen) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }

    const updated = await writePantry(pantry);
    res.json({ success: true, removedId: id, ...updated });
  } catch (error) {
    next(error);
  }
});

// DELETE clear all pantry items
router.delete('/', async (req, res, next) => {
  try {
    const pantry = { items: [], updatedAt: new Date().toISOString() };
    const updated = await writePantry(pantry);
    res.json({ success: true, ...updated });
  } catch (error) {
    next(error);
  }
});

// POST scan image for pantry items (in-memory, image discarded immediately)
router.post('/scan-image', upload.single('image'), async (req, res, next) => {
  try {
    let buffer;
    let mimeType;

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body && req.body.imageBase64) {
      const match = req.body.imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(req.body.imageBase64, 'base64');
        mimeType = req.body.mimeType || 'image/jpeg';
      }
    } else {
      return res.status(400).json({ error: 'Please upload an image file or provide imageBase64 data' });
    }

    console.log(`[PANTRY SCAN] Processing image (${buffer.length} bytes, ${mimeType}) with Gemini vision...`);
    const aiResult = await gemini.extractPantryItemsFromImage(buffer, mimeType);
    console.log(`[PANTRY SCAN] Gemini successfully extracted ${(aiResult.items || []).length} items. Discarding image buffer.`);

    res.json({
      detectedItems: aiResult.items || [],
      count: (aiResult.items || []).length
    });
  } catch (error) {
    console.error('[PANTRY SCAN ERROR]', error);
    next(error);
  }
});

module.exports = router;
