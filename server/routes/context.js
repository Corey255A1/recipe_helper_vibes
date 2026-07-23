const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const config = require('../config');

router.get('/', async (req, res, next) => {
  try {
    const data = await fs.readFile(config.dataPaths.context, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({
        rule: "",
        servings: 2,
        mealsPerWeek: 7,
        leftoversEnabled: false
      });
    } else {
      next(error);
    }
  }
});

router.put('/', async (req, res, next) => {
  try {
    const context = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(config.dataPaths.context, JSON.stringify(context, null, 2));
    res.json(context);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
