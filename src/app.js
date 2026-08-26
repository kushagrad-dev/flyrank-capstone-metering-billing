require('dotenv').config();
const express = require('express');
const pool = require('./db');
const generateRoute = require('./routes/generate');
const usageRoute = require('./routes/usage');
const stripeRoute = require('./routes/stripe');
const webhookRoute = require('./routes/webhook');

const app = express();

// Webhook route FIRST — needs raw body before express.json() parses it
app.use('/webhooks/stripe', webhookRoute);

// Then JSON middleware for all other routes
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
app.use('/', stripeRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});