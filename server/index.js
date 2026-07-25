const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('=== STARTING RECIPE HELPER SERVER ===');

process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason);
});

try {
  const config = require('./config');
  const errorHandler = require('./middleware/errorHandler');

  console.log(`Config loaded. DATA_DIR=${config.dataPaths.dataDir}, PORT=${config.port}`);

  // Ensure data directories exist at runtime
  try {
    fs.mkdirSync(config.dataPaths.recipesDir, { recursive: true });
    console.log(`Data directory verified at: ${config.dataPaths.recipesDir}`);
  } catch (err) {
    console.error('Failed to create data directories:', err);
  }

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API Routes
  app.use('/api/context', require('./routes/context'));
  app.use('/api/recipes', require('./routes/recipes'));
  app.use('/api/plan', require('./routes/plan'));
  app.use('/api/grocery', require('./routes/grocery'));

  // Serve SPA
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Error handling
  app.use(errorHandler);

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 Recipe Helper server successfully running on port ${config.port} in ${config.env} mode`);
  });

  server.on('error', (err) => {
    console.error('HTTP SERVER ERROR:', err);
  });
} catch (err) {
  console.error('FATAL ERROR DURING SERVER INITIALIZATION:', err);
}
