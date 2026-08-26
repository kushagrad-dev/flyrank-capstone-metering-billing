const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db');

router.post('/checkout', async (req, res) => {
  try {
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing required field: tenantId' });
    }

    const tenantResult = await pool.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rowCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pro Plan',
              description: '10,000 API calls and 1M tokens per month',
            },
            unit_amount: 2999,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenant_id: String(tenantId),
      },
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('POST /checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
