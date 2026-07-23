require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
  dataPaths: {
    context: path.join(__dirname, '..', 'data', 'context.json'),
    history: path.join(__dirname, '..', 'data', 'history.json'),
    completeHistory: path.join(__dirname, '..', 'data', 'complete_history.json'),
    currentWeek: path.join(__dirname, '..', 'data', 'current_week.json'),
    recipesDir: path.join(__dirname, '..', 'data', 'recipes')
  }
};
