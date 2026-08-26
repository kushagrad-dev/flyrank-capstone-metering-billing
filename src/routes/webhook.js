const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db');

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // DB-backed deduplication — survives restarts
  try {
    await pool.query(
      'INSERT INTO processed_webhook_events (event_id) VALUES ($1)',
      [event.id]
    );
  } catch (err) {
    if (err.code === '23505') {
      console.log(`Duplicate event ignored: ${event.id}`);
      return res.status(200).json({ received: true, duplicate: true });
    }
    throw err;
  }

  console.log(`Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        if (!tenantId) { console.error('No tenant_id in metadata'); break; }

        const planResult = await pool.query("SELECT id FROM plans WHERE name = 'pro'");
        const proPlanId = planResult.rows[0].id;

        await pool.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [proPlanId, tenantId]);
        await pool.query(
          `INSERT INTO subscriptions (tenant_id, stripe_customer_id, stripe_subscription_id, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT (tenant_id)
           DO UPDATE SET stripe_customer_id = $2, stripe_subscription_id = $3, status = 'active'`,
          [tenantId, session.customer, session.subscription]
        );
        console.log(`Tenant ${tenantId} upgraded to Pro`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subResult = await pool.query(
          'SELECT tenant_id FROM subscriptions WHERE stripe_subscription_id = $1',
          [subscription.id]
        );
        if (subResult.rowCount === 0) break;
        const tenantId = subResult.rows[0].tenant_id;
        await pool.query('UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2', [subscription.status, subscription.id]);
        if (subscription.status !== 'active') {
          const freePlan = await pool.query("SELECT id FROM plans WHERE name = 'free'");
          await pool.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [freePlan.rows[0].id, tenantId]);
          console.log(`Tenant ${tenantId} downgraded to Free`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subResult = await pool.query(
          'SELECT tenant_id FROM subscriptions WHERE stripe_subscription_id = $1',
          [subscription.id]
        );
        if (subResult.rowCount === 0) break;
        const tenantId = subResult.rows[0].tenant_id;
        const freePlan = await pool.query("SELECT id FROM plans WHERE name = 'free'");
        await pool.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [freePlan.rows[0].id, tenantId]);
        await pool.query('UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2', ['canceled', subscription.id]);
        console.log(`Tenant ${tenantId} canceled, downgraded to Free`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
