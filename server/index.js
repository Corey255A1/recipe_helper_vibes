// Force synchronous logging so Docker logs never truncate output
if (process.stdout._handle && process.stdout._handle.setBlocking) {
  process.stdout._handle.setBlocking(true);
}
if (process.stderr._handle && process.stderr._handle.setBlocking) {
  process.stderr._handle.setBlocking(true);
}

console.log('[INIT 1/6] Starting Recipe Helper Server...');

process.on('uncaughtException', (err) => {
  console.error('[FATAL UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL UNHANDLED REJECTION]', reason);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('[INIT 2/6] Core modules loaded.');

let config;
try {
  config = require('./config');
  console.log(`[INIT 3/6] Config loaded. PORT=${config.port}, DATA_DIR=${config.dataPaths.dataDir}`);
} catch (err) {
  console.error('[FATAL] Failed to load config:', err);
}

const errorHandler = require('./middleware/errorHandler');

// Ensure data directories exist at runtime
try {
  fs.mkdirSync(config.dataPaths.recipesDir, { recursive: true });
  console.log(`[INIT 4/6] Data directory verified at: ${config.dataPaths.recipesDir}`);
} catch (err) {
  console.error('[WARNING] Failed to create data directories:', err);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

console.log('[INIT 5/6] Mounting API routes...');
try {
  app.use('/api/context', require('./routes/context'));
  app.use('/api/recipes', require('./routes/recipes'));
  app.use('/api/plan', require('./routes/plan'));
  app.use('/api/grocery', require('./routes/grocery'));
  console.log('[INIT 5/6] All API routes mounted.');
} catch (err) {
  console.error('[FATAL] Error mounting API routes:', err);
}

// Serve SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use(errorHandler);

console.log(`[INIT 6/6] Binding HTTP server to 0.0.0.0:${config ? config.port : 3000}...`);

const port = config ? config.port : 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Recipe Helper server successfully running on port ${port}`);
});

server.on('error', (err) => {
  console.error('[FATAL HTTP SERVER ERROR]:', err);
});
