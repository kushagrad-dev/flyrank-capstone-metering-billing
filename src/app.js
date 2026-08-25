require('dotenv').config();
const express = require('express');
const pool = require('./db');
const generateRoute = require('./routes/generate');
const usageRoute = require('./routes/usage');

const app = express();
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// Routes
app.use('/generate', generateRoute);
app.use('/usage', usageRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});