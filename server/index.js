const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

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

app.listen(config.port, () => {
  console.log(`Recipe Helper server running on port ${config.port} in ${config.env} mode`);
});
