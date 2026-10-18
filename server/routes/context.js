const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');

router.get('/models', async (req, res, next) => {
  try {
    let apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      try {
        const data = await fs.readFile(config.dataPaths.context, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed.geminiApiKey && parsed.geminiApiKey !== 'your_gemini_api_key_here') {
          apiKey = parsed.geminiApiKey;
        }
      } catch (e) {}
    }

    const fallbackModels = [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Default)', description: 'Fast, high quality multimodal generation' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Fast, highly capable' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast general-purpose model' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Complex reasoning & planning' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast multimodal generation' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Efficient multimodal model' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Deep reasoning and complex instructions' }
    ];

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.json({
        models: fallbackModels,
        defaultModel: 'gemini-3.8-flash',
        source: 'fallback'
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const apiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!apiResp.ok) {
        throw new Error(`API returned ${apiResp.status}`);
      }

      const data = await apiResp.json();
      if (data && Array.isArray(data.models)) {
        const available = data.models
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => {
            const cleanId = m.name.replace(/^models\//, '');
            return {
              id: cleanId,
              name: m.displayName || cleanId,
              description: m.description || '',
              inputTokenLimit: m.inputTokenLimit,
              outputTokenLimit: m.outputTokenLimit
            };
          });

        let flash38Index = available.findIndex(m => m.id === 'gemini-3.8-flash');
        if (flash38Index === -1) {
          available.unshift({
            id: 'gemini-3.8-flash',
            name: 'Gemini 3.8 Flash',
            description: 'Gemini 3.8 Flash'
          });
          flash38Index = 0;
        }

        const [flash38] = available.splice(flash38Index, 1);
        available.unshift(flash38);

        return res.json({
          models: available,
          defaultModel: 'gemini-3.8-flash',
          source: 'api'
        });
      }
    } catch (apiErr) {
      console.warn('[GEMINI MODELS] Failed to fetch live models from Google API:', apiErr.message);
    }

    res.json({
      models: fallbackModels,
      defaultModel: 'gemini-3.8-flash',
      source: 'fallback'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const data = await fs.readFile(config.dataPaths.context, 'utf-8');
    const parsed = JSON.parse(data);
    const responseData = { ...parsed };
    responseData.geminiModel = parsed.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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
        geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
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
      geminiModel: req.body.geminiModel || existing.geminiModel || 'gemini-3.8-flash',
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
