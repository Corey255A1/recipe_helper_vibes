const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');

router.get('/', async (req, res, next) => {
  try {
    const data = await fs.readFile(config.dataPaths.context, 'utf-8');
    const parsed = JSON.parse(data);
    const responseData = { ...parsed };
    if (responseData.geminiApiKey) {
      responseData.hasApiKey = true;
      responseData.geminiApiKey = '••••••••';
    } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      responseData.hasApiKey = true;
      responseData.isEnvApiKey = true;
    }
    res.json(responseData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const envKeySet = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
      res.json({
        rule: "",
        servings: 2,
        mealsPerWeek: 7,
        leftoversEnabled: false,
        hasApiKey: envKeySet,
        isEnvApiKey: envKeySet
      });
    } else {
      next(error);
    }
  }
});

router.put('/', async (req, res, next) => {
  try {
    let existing = {};
    try {
      const data = await fs.readFile(config.dataPaths.context, 'utf-8');
      existing = JSON.parse(data);
    } catch(e) {}

    const newKey = req.body.geminiApiKey;
    let geminiApiKey = existing.geminiApiKey;

    if (newKey && newKey !== '••••••••' && newKey !== 'your_gemini_api_key_here') {
      geminiApiKey = newKey.trim();
    }

    const context = {
      ...req.body,
      geminiApiKey: geminiApiKey || undefined,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(config.dataPaths.context, JSON.stringify(context, null, 2));

    const responseData = { ...context };
    if (responseData.geminiApiKey) {
      responseData.hasApiKey = true;
      responseData.geminiApiKey = '••••••••';
    } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      responseData.hasApiKey = true;
      responseData.isEnvApiKey = true;
    }
    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
