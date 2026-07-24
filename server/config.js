require('dotenv').config();
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
  dataPaths: {
    dataDir: dataDir,
    context: path.join(dataDir, 'context.json'),
    history: path.join(dataDir, 'history.json'),
    completeHistory: path.join(dataDir, 'complete_history.json'),
    plans: path.join(dataDir, 'plans.json'),
    recipesDir: path.join(dataDir, 'recipes')
  }
};
